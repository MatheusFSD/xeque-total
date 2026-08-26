/* =========================================================
   QUADRADO MÁGICO — resolução de duelos (Ação vs Poder)

   As habilidades (passivas, ver GAME_DATA.ABILITIES) entram aqui como
   modificadores da pontuação. Ficam todas concentradas em
   abilityBonus() de propósito: assim dá pra ler numa tela só tudo que
   pode alterar um duelo, em vez de caçar `if` espalhado pelo arquivo.

   O `ctx` que o game.js manda carrega o que as habilidades situacionais
   precisam saber (área, turnos restantes, placar, vizinhos) — o duel.js
   não conhece o tabuleiro nem o estado da partida por conta própria.
========================================================= */

var DUEL = (function () {

  function canUsePower(piece) {
    return piece.mana >= piece.power.manaCost;
  }

  function has(piece, key) {
    return !!piece && piece.ability === key;
  }

  /* ---------------- quem usa qual atributo ----------------
     O atributo vem do PAPEL na jogada, não de quem se moveu.

     Antes, quem se movia era sempre o "desafiante" e atacava com
     (velocidade + técnica)/2. Como atacante tem os dois altos e o
     portador se defendia com `defesa`, o atacante virava o melhor
     desarmador do jogo — desarmava com ~77 contra os ~24 de defesa de
     outro atacante. Agora quem vai tomar a bola usa DEFESA, e quem está
     com ela protege com TÉCNICA.
  ------------------------------------------------------- */

  // peso pequeno da técnica na defesa: rende de +1 (técnica 38) a +4
  // (técnica 96). É um plus pro zagueiro técnico, sem tirar o
  // protagonismo da defesa nem achatar a diferença entre bons e maus
  // defensores — que é o que uma média entre os dois faria.
  var TECNICA_NA_DEFESA = 20;

  // o goleiro fica de fora do plus: a defesa dele já é o atributo mais alto do
  // jogo e não precisa de reforço
  function defesaEfetiva(piece) {
    if (piece.position === "GK") return piece.stats.defesa;
    return piece.stats.defesa + Math.floor(piece.stats.tecnica / TECNICA_NA_DEFESA);
  }

  // Proteger a bola parado usa o melhor entre técnica e defesa — um driblador
  // segura com habilidade, um zagueiro segura com corpo — mas só 3/4 dele:
  // quem chega marcando tem a iniciativa da jogada. Sem esse desconto o
  // atacante (defesa baixa) nunca teria chance nenhuma de pressionar, já que
  // a técnica média do portador passa de 75.
  var PROTECAO = 0.9;

  // quanto o marcador leva de vantagem no drible (ver baseStats)
  var VANTAGEM_DEFENSIVA = 4;

  function protecaoDaBola(piece) {
    return Math.round(Math.max(piece.stats.tecnica, piece.stats.defesa) * PROTECAO);
  }

  function baseStats(challenger, holder, isShoot, isDribble) {
    if (isShoot) {
      return { c: challenger.stats.chute, h: defesaEfetiva(holder) };
    }
    if (isDribble) {
      // o portador avança tentando passar pelo marcador. A vantagem
      // defensiva inclina o drible pro lado de quem marca: sem ela, um
      // atacante bom passava por zagueiro top com frequência demais.
      // É o botão pra girar se o jogo ficar fácil ou difícil demais.
      return {
        c: Math.round((challenger.stats.velocidade + challenger.stats.tecnica) / 2),
        h: defesaEfetiva(holder) + VANTAGEM_DEFENSIVA
      };
    }
    // o marcador avança tentando tomar a bola de quem está com ela parado
    return { c: defesaEfetiva(challenger), h: protecaoDaBola(holder) };
  }

  // soma de tudo que as habilidades acrescentam (ou tiram) da pontuação de
  // UM lado do duelo. `side` é "challenger" ou "holder".
  function abilityBonus(piece, side, ctx) {
    var b = 0;
    var isShoot = !!ctx.isShoot;
    var isDribble = !!ctx.isDribble;

    if (has(piece, "muralha") && side === "holder" && ctx.holderInOwnBox) b += 4;
    if (has(piece, "faro") && side === "challenger" && isShoot && ctx.shootBlockerCount === 0) b += 5;
    if (has(piece, "ginga") && side === "challenger" && isDribble) b += 6;
    if (has(piece, "decisivo") && ctx.isEndgame) b += 6;
    if (has(piece, "zebra") && ctx.losingByTeam && ctx.losingByTeam[piece.team]) b += 5;

    // auras dos vizinhos: quem está ao lado influencia sem participar do duelo
    var nb = (side === "challenger" ? ctx.challengerNeighbors : ctx.holderNeighbors) || {};
    b += 3 * (nb.allyCaptains || 0);
    b -= 3 * (nb.enemyIntimidators || 0);

    return b;
  }

  /* ---------------- a sorte ----------------
     TRÊS dados de 0 a 13, e não um de 0 a 10. A soma de três dados forma um
     sino: extremos raros, meio comum. Isso resolve o problema central do
     sistema antigo — com um dado só, a diferença ficava presa em ±10, e como
     as diferenças de qualidade entre jogadores passam disso, todo confronto
     desequilibrado virava 0% ou 100%.

     Agora a diferença vai de -39 a +39 em curva:
       vantagem -20 -> 2%    vantagem  +5 -> 67%
       vantagem -10 -> 15%   vantagem +10 -> 83%
       vantagem   0 -> 48%   vantagem +20 -> 98%

     O placar continua sendo soma-e-compara, então a tela segue revelando
     dois números — o mistério não se perde.
  ----------------------------------------- */
  var DADOS = 3, FACES = 13;

  function luckRoll(piece) {
    // "Sangue Frio" corta o azar sem mexer no teto: cada dado dele nunca cai
    // abaixo de 2, então a soma vai de 6 a 39 em vez de 0 a 39. Vale ~+3 na
    // média — piso 4 daria +6, forte demais pra uma passiva.
    var piso = has(piece, "sangueFrio") ? 2 : 0;
    var total = 0;
    for (var i = 0; i < DADOS; i++) {
      total += piso + Math.floor(Math.random() * (FACES + 1 - piso));
    }
    return total;
  }

  function rollScore(piece, base, usedPower, bonus, side, ctx) {
    // espírito dividido por 20 (0-4): com a sorte mais larga, o antigo /10
    // valia até +9, que sozinho levava um duelo equilibrado a 83%
    var spirit = Math.floor(piece.stats.espirito / 20);
    return base + spirit + luckRoll(piece) + (usedPower ? bonus : 0) + abilityBonus(piece, side, ctx);
  }

  function resolveDuel(params) {
    var challenger = params.challenger;
    var holder = params.holder;
    var isShoot = !!params.isShoot;
    var isDribble = !!params.isDribble;

    var ctx = {
      isShoot: isShoot,
      isDribble: isDribble,
      shootBlockerCount: params.shootBlockerCount || 0,
      holderInOwnBox: !!params.holderInOwnBox,
      isEndgame: !!params.isEndgame,
      losingByTeam: params.losingByTeam || null,
      challengerNeighbors: params.challengerNeighbors || null,
      holderNeighbors: params.holderNeighbors || null
    };

    var challengerUsedPower = false;
    var holderUsedPower = false;

    if (params.challengerChoice === "poder" && canUsePower(challenger)) {
      challenger.mana -= challenger.power.manaCost;
      challengerUsedPower = true;
    }
    if (!holder.stunned && params.holderChoice === "poder" && canUsePower(holder)) {
      holder.mana -= holder.power.manaCost;
      holderUsedPower = true;
    }

    // "Sombra": o marcado anula o poder de quem tenta driblá-lo. A mana já
    // foi gasta — o jogador perde o recurso e o efeito, que é o que dá peso
    // à habilidade (e por isso ela é anunciada no log da partida).
    var shadowed = isDribble && challengerUsedPower && has(holder, "sombra");
    var challengerBonus = shadowed ? 0 : challenger.power.bonus;

    var bases = baseStats(challenger, holder, isShoot, isDribble);
    var cBase = bases.c;
    var hBase = bases.h;

    var challengerScore = rollScore(challenger, cBase, challengerUsedPower, challengerBonus, "challenger", ctx);
    if (isShoot && params.distancePenalty) challengerScore -= params.distancePenalty;
    var holderScore = holder.stunned
      ? -1
      : rollScore(holder, hBase, holderUsedPower, holder.power.bonus, "holder", ctx);

    // atordoado não consegue reagir — perde o duelo automaticamente, não importa a pontuação
    var winnerSide = holder.stunned ? "challenger" : (challengerScore > holderScore ? "challenger" : "holder");

    return {
      winnerSide: winnerSide,
      challengerScore: challengerScore,
      holderScore: holderScore,
      challengerUsedPower: challengerUsedPower,
      holderUsedPower: holderUsedPower,
      shadowed: shadowed,
      distancePenalty: isShoot ? (params.distancePenalty || 0) : 0
    };
  }

  // qual atributo cada lado põe em jogo. A UI mostra isso no modal porque,
  // agora que o atributo depende do papel e não de quem se moveu, não dá
  // pra adivinhar olhando a tela.
  function statLabels(isShoot, isDribble) {
    if (isShoot) return { challenger: "Chute", holder: "Defesa" };
    if (isDribble) return { challenger: "Velocidade + Técnica", holder: "Defesa" };
    return { challenger: "Defesa", holder: "Técnica" };
  }

  function roleLabels(isShoot, isDribble) {
    if (isShoot) return { challenger: "Atacante", holder: "Goleiro" };
    if (isDribble) return { challenger: "Driblador", holder: "Defensor" };
    return { challenger: "Marcador", holder: "Portador da Bola" };
  }

  return {
    canUsePower: canUsePower,
    resolveDuel: resolveDuel,
    roleLabels: roleLabels,
    statLabels: statLabels
  };

})();
