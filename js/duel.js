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

  function challengerBaseStat(piece, isShoot) {
    if (isShoot) return piece.stats.chute;
    return Math.round((piece.stats.velocidade + piece.stats.tecnica) / 2);
  }

  function holderBaseStat(piece) {
    return piece.stats.defesa;
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

  // "Sangue Frio" corta o azar sem mexer no teto: 3-10 em vez de 0-10
  function luckRoll(piece) {
    if (has(piece, "sangueFrio")) return 3 + Math.floor(Math.random() * 8);
    return Math.floor(Math.random() * 11);
  }

  function rollScore(piece, base, usedPower, bonus, side, ctx) {
    var spirit = Math.floor(piece.stats.espirito / 10); // 0-9
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

    var cBase = challengerBaseStat(challenger, isShoot);
    var hBase = holderBaseStat(holder);

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

  function roleLabels(isShoot, isDribble) {
    if (isShoot) return { challenger: "Atacante", holder: "Goleiro" };
    if (isDribble) return { challenger: "Driblador", holder: "Defensor" };
    return { challenger: "Marcador", holder: "Portador da Bola" };
  }

  return {
    canUsePower: canUsePower,
    resolveDuel: resolveDuel,
    roleLabels: roleLabels
  };

})();
