/* =========================================================
   QUADRADO MÁGICO — máquina de estados da partida
========================================================= */

var GAME = (function () {

  var state = null;
  var logId = 0;

  // lado do campo é do SLOT (A/B), não do squad — qualquer squad do pool pode ocupar qualquer slot
  var SLOT_META = {
    A: { attackDir: 1, goalCol: 0, opponentGoalCol: 12 },
    B: { attackDir: -1, goalCol: 12, opponentGoalCol: 0 }
  };

  function cloneStats(s) {
    return { velocidade: s.velocidade, chute: s.chute, tecnica: s.tecnica, defesa: s.defesa, espirito: s.espirito };
  }

  function findSquad(squadId) {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === squadId) return GAME_DATA.TEAMS[i];
    return GAME_DATA.TEAMS[0];
  }

  function findPieceById(id) {
    if (!state) return null;
    for (var i = 0; i < state.pieces.length; i++) if (state.pieces[i].id === id) return state.pieces[i];
    return null;
  }

  // no modo 2 jogadores local, os dois lados são "humanos" — ninguém chama a IA
  // e os dois lados do duelo esperam escolha manual, independente do slot
  function isHumanControlled(teamId) {
    return state.twoPlayerLocal || teamId === state.humanTeamId;
  }

  function addLog(text, cls) {
    logId++;
    state.log.push({ id: logId, text: text, cls: cls || "ev-info" });
    if (state.log.length > 60) state.log.shift();
  }

  // homeSquadId sempre ocupa o slot A (jogador humano), awaySquadId sempre o slot B (CPU).
  // Squads guardam a formação em orientação canônica "esquerda" — no slot B a coluna é espelhada.
  function buildInitialState(homeSquadId, awaySquadId, maxTurns, noTurnLimit, goldenGoalOnDraw, twoPlayerLocal) {
    var teamsMeta = {};
    var pieces = [];
    [{ slot: "A", squadId: homeSquadId }, { slot: "B", squadId: awaySquadId }].forEach(function (s) {
      var sq = findSquad(s.squadId);
      var meta = SLOT_META[s.slot];
      teamsMeta[s.slot] = {
        id: s.slot, name: sq.name, shortName: sq.shortName, badge: sq.badge, kit: sq.kit,
        colorVar: sq.colorVar, assetPrefix: sq.assetPrefix,
        attackDir: meta.attackDir, goalCol: meta.goalCol, opponentGoalCol: meta.opponentGoalCol
      };
      sq.players.forEach(function (pd) {
        var col = s.slot === "A" ? pd.start.col : (BOARD.COLS - 1 - pd.start.col);
        pieces.push({
          id: pd.id, team: s.slot, name: pd.name, number: pd.number,
          nationality: pd.nationality, flag: pd.flag, temperament: pd.temperament,
          position: pd.position, stats: cloneStats(pd.stats), power: pd.power,
          ability: pd.ability || null,
          maxMana: pd.maxMana, mana: pd.maxMana,
          row: pd.start.row, col: col, quote: pd.quote, lore: pd.lore || "",
          assetKey: pd.assetKey, assetPrefix: sq.assetPrefix,
          stunned: false, stunTurns: 0
        });
      });
    });
    return {
      phase: "playing", humanTeamId: "A",
      teams: teamsMeta, pieces: pieces,
      ball: { row: Math.floor(BOARD.ROWS / 2), col: BOARD.MID_COL, carrierId: null, gkHoldTurns: 0 },
      currentTeamId: "A", turnCount: 0, maxTurns: maxTurns || 50, noTurnLimit: !!noTurnLimit, half: 1,
      timeUpPending: null, suddenDeath: false, goldenGoalOnDraw: !!goldenGoalOnDraw, twoPlayerLocal: !!twoPlayerLocal,
      score: { A: 0, B: 0 }, scorers: { A: [], B: [] }, selectedPieceId: null,
      legalMoves: [], passTargets: [], canShoot: false, shootInfo: null,
      log: [], duelContext: null,
      aiPausada: false,          // tutorial roteirizado segura a IA (ver js/tutorial.js)
      semInterceptacao: false,   // e desliga o azar do passe enquanto ensina
      golGarantido: false        // e o chute do roteiro tem que terminar em gol
    };
  }

  function render() { UI.render(state); }

  function applyFormationOverrides(overrides) {
    if (!overrides) return;
    Object.keys(overrides).forEach(function (pieceId) {
      var piece = findPieceById(pieceId);
      if (piece) { piece.row = overrides[pieceId].row; piece.col = overrides[pieceId].col; }
    });
  }

  function applyKickoff(kickoffTeamId) {
    var centerRow = Math.floor(BOARD.ROWS / 2), centerCol = BOARD.MID_COL;
    var striker = null;
    for (var i = 0; i < state.pieces.length; i++) {
      var p = state.pieces[i];
      if (p.team === kickoffTeamId && p.number === 9) { striker = p; break; }
    }
    if (striker) {
      striker.row = centerRow; striker.col = centerCol;
      state.ball = { row: centerRow, col: centerCol, carrierId: striker.id, gkHoldTurns: 0 };
    } else {
      state.ball = { row: centerRow, col: centerCol, carrierId: null, gkHoldTurns: 0 };
    }
    state.currentTeamId = kickoffTeamId;
  }

  function resetForKickoff(kickoffTeamId) {
    state.pieces.forEach(function (p) {
      p.row = p.homeRow; p.col = p.homeCol;
      p.stunned = false; p.stunTurns = 0;
    });
    applyKickoff(kickoffTeamId);
  }

  function swapSides() {
    Object.keys(state.teams).forEach(function (tid) {
      var t = state.teams[tid];
      t.attackDir *= -1;
      var g = t.goalCol; t.goalCol = t.opponentGoalCol; t.opponentGoalCol = g;
    });
    state.pieces.forEach(function (p) { p.homeCol = BOARD.COLS - 1 - p.homeCol; });
  }

  function start(homeSquadId, awaySquadId, formationOverrides, kickoffTeamId, maxTurns, noTurnLimit, goldenGoalOnDraw, twoPlayerLocal) {
    state = buildInitialState(homeSquadId || "BRA", awaySquadId || "ALE", maxTurns, noTurnLimit, goldenGoalOnDraw, twoPlayerLocal);
    applyFormationOverrides(formationOverrides);
    state.pieces.forEach(function (p) { p.homeRow = p.row; p.homeCol = p.col; });
    applyKickoff(kickoffTeamId || "A");
    state.firstHalfKickoffTeamId = state.currentTeamId;
    var teamName = state.teams[state.humanTeamId].name;
    var kickoffName = state.teams[state.currentTeamId].name;
    addLog(state.twoPlayerLocal ? (T("Apito inicial!") + " " + T(teamName) + " x " + T(state.teams.B.name) + ".") : T("Apito inicial! Você comanda o {0}.", T(teamName)), "ev-info");
    addLog("🪙 " + T("{0} venceu o sorteio e começa com a bola!", T(kickoffName)), "ev-info");
    render();
    if (!isHumanControlled(state.currentTeamId) && !state.aiPausada) setTimeout(runAITurn, 800);
  }

  function getState() { return state; }

  function opponentGoalkeeper(teamId) {
    var foe = teamId === "A" ? "B" : "A";
    for (var i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i].team === foe && state.pieces[i].position === "GK") return state.pieces[i];
    }
    return null;
  }

  function shootInfoWithAbilities(piece, team) {
    var info = BOARD.shootDistanceInfo(piece, team, state.pieces);
    var gk = opponentGoalkeeper(piece.team);
    if (!gk) return info;
    var penalty = shotPenaltyWithAbilities(piece, gk, info);
    if (penalty === info.penalty) return info;
    return {
      colDist: info.colDist, rowOffset: info.rowOffset, totalDistance: info.totalDistance,
      blockerCount: info.blockerCount, penalty: penalty,
      difficulty: BOARD.difficultyForPenalty(penalty)
    };
  }

  function updateActionOptions(piece) {
    state.legalMoves = BOARD.getLegalMoves(piece, state.pieces, state.ball.carrierId);
    if (state.ball.carrierId === piece.id) {
      var team = state.teams[piece.team];
      state.passTargets = BOARD.getPassTargets(piece, state.pieces, team);
      state.canShoot = BOARD.canShootFrom(piece, team);
      // a prévia de dificuldade precisa refletir Canhão/Paredão, senão a UI
      // promete "Difícil" e o duelo cobra outro número
      state.shootInfo = state.canShoot ? shootInfoWithAbilities(piece, team) : null;
    } else {
      state.passTargets = []; state.canShoot = false; state.shootInfo = null;
    }
  }

  function clearActionOptions() {
    state.selectedPieceId = null; state.legalMoves = []; state.passTargets = []; state.canShoot = false; state.shootInfo = null;
  }

  function selectPiece(pieceId) {
    if (!state || state.phase !== "playing") return;
    if (!isHumanControlled(state.currentTeamId)) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.team !== state.currentTeamId || piece.stunned) return;
    if (state.selectedPieceId === pieceId) {
      clearActionOptions();
    } else {
      state.selectedPieceId = pieceId;
      updateActionOptions(piece);
    }
    render();
  }

  function clearSelection() {
    if (!state) return;
    clearActionOptions();
    render();
  }

  function attemptMove(pieceId, row, col) {
    if (!state || state.phase !== "playing") return;
    if (!isHumanControlled(state.currentTeamId)) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.id !== state.selectedPieceId) return;
    var mv = null;
    for (var i = 0; i < state.legalMoves.length; i++) {
      var m = state.legalMoves[i];
      if (m.row === row && m.col === col) { mv = m; break; }
    }
    if (!mv) return;
    performMove(piece, mv);
  }

  function attemptPass(pieceId, row, col) {
    if (!state || state.phase !== "playing") return;
    if (!isHumanControlled(state.currentTeamId)) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.id !== state.selectedPieceId || state.ball.carrierId !== piece.id) return;
    var target = null;
    for (var i = 0; i < state.passTargets.length; i++) {
      var t = state.passTargets[i];
      if (t.row === row && t.col === col) { target = t; break; }
    }
    if (!target) return;
    resolvePassExecution(piece, target.teammateId, target.blockers);
  }

  function attemptShoot(pieceId) {
    if (!state || state.phase !== "playing") return;
    if (!isHumanControlled(state.currentTeamId)) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.id !== state.selectedPieceId || state.ball.carrierId !== piece.id || !state.canShoot) return;
    beginShootSequence(piece);
  }

  function rollInterception(blockerIds) {
    // no roteiro do tutorial o passe nao e interceptado: a liçao e COMO passar,
    // e um azar de 16% deixaria o roteiro sem saida com a IA pausada
    if (state && state.semInterceptacao) return null;
    if (!blockerIds || !blockerIds.length) return null;
    for (var i = 0; i < blockerIds.length; i++) {
      if (Math.random() < BOARD.INTERCEPT_CHANCE) return findPieceById(blockerIds[i]);
    }
    return null;
  }

  function resolvePassExecution(passer, teammateId, blockers) {
    var receiver = findPieceById(teammateId);
    var interceptor = rollInterception(blockers);
    var fromRow = passer.row, fromCol = passer.col;
    if (interceptor) {
      state.ball.carrierId = interceptor.id;
      state.ball.row = interceptor.row; state.ball.col = interceptor.col;
      addLog("⚠️ " + T("{0} INTERCEPTA o passe de {1}!", interceptor.name, passer.name), "ev-" + interceptor.team.toLowerCase());
      clearActionOptions();
      render();
      // treme só quando a bola chega de fato (fim da animação de voo), não quando sai do pé
      var flightMs1 = BOARD.ballFlightMs(fromRow, fromCol, interceptor.row, interceptor.col);
      setTimeout(function () { UI.flashPiece(interceptor.id, "fx-shake-small", 450); }, flightMs1);
    } else {
      state.ball.carrierId = receiver.id;
      state.ball.row = receiver.row; state.ball.col = receiver.col;
      addLog(T("{0} lança para {1}.", passer.name, receiver.name), "ev-" + passer.team.toLowerCase());
      clearActionOptions();
      render();
      var flightMs2 = BOARD.ballFlightMs(fromRow, fromCol, receiver.row, receiver.col);
      setTimeout(function () { UI.flashPiece(receiver.id, "fx-shake-small", 450); }, flightMs2);
    }
    endTurn();
  }

  function performMove(piece, mv) {
    if (mv.capture) {
      var target = findPieceById(mv.targetId);
      beginDuel(piece, target, false, 0, mv.dribble);
    } else {
      executeSimpleMove(piece, mv.row, mv.col);
    }
  }

  function executeSimpleMove(piece, row, col) {
    piece.row = row; piece.col = col;
    if (!state.ball.carrierId && state.ball.row === row && state.ball.col === col) {
      state.ball.carrierId = piece.id;
      addLog(T("{0} dominou a bola!", piece.name), "ev-" + piece.team.toLowerCase());
    } else if (state.ball.carrierId === piece.id) {
      state.ball.row = row; state.ball.col = col;
    }
    clearActionOptions();
    render();
    endTurn();
  }

  function beginShootSequence(shooter) {
    var atkTeam = state.teams[shooter.team];
    var defTeamId = shooter.team === "A" ? "B" : "A";
    var defTeam = state.teams[defTeamId];
    var info = BOARD.shootDistanceInfo(shooter, atkTeam, state.pieces);
    var gk = null;
    for (var i = 0; i < state.pieces.length; i++) {
      var p = state.pieces[i];
      if (p.team === defTeamId && p.position === "GK") { gk = p; break; }
    }
    // o goleiro só defende plantado NA casa do gol. Antes valia a grande área
    // inteira (6 casas), então ele defendia de fora da meta — era o bug.
    var gkNoGol = gk && BOARD.isOnGoalSpot(gk.row, gk.col, defTeam);
    // gol de placa nao abre duelo, mas a bola voa igual: seria estranho justo
    // o gol mais bonito ser o unico em que ela nao sai do lugar
    if (!gkNoGol) {
      addLog(T("GOL DE PLACA! O goleiro saiu do gol e {0}", T("{0} encontra a meta vazia!", shooter.name)), "ev-goal");
      voarChute(shooter, gk || shooter, true, function () { scoreGoal(shooter.team, shooter); });
      return;
    }
    if (gk.stunned) {
      addLog(T("GOL DE PLACA!") + " " + T("{0} está atordoado e não consegue reagir ao chute de {1}.", gk.name, shooter.name), "ev-goal");
      voarChute(shooter, gk, true, function () { scoreGoal(shooter.team, shooter); });
      return;
    }
    beginDuel(shooter, gk, true, shotPenaltyWithAbilities(shooter, gk, info), false, info.blockerCount);
  }

  // Canhão (do batedor) e Paredão (do goleiro) puxam a mesma corda em
  // sentidos opostos, então moram juntos: os dois mexem na penalidade de
  // distância, não na pontuação — assim o número que a UI mostra antes do
  // chute ("Fácil / Difícil / Quase impossível") já sai com tudo embutido.
  function shotPenaltyWithAbilities(shooter, gk, info) {
    // cara a cara com o goleiro: a distância deixa de ser um problema, é só
    // o atacante contra ele. Sem isso, chegar coladinho ainda cobrava a
    // penalidade da posição, o que não fazia sentido nenhum.
    if (gk && Math.abs(shooter.row - gk.row) <= 1 && Math.abs(shooter.col - gk.col) <= 1) return 0;
    var penalty = info.penalty;
    if (abilityHas(shooter, "canhao")) penalty = Math.round(penalty * 0.7);
    // "de longe" = fora da grande área adversária, que é onde o Paredão pesa
    if (abilityHas(gk, "paredao") && !BOARD.isInOwnGoalBox(shooter.row, shooter.col, state.teams[gk.team])) penalty += 5;
    return Math.max(0, penalty);
  }

  var DUEL_INTRO_MS = 550; // tempo do "impacto" de emojis subindo antes do modal abrir

  // fase intermediária: trava o input e dispara o efeito de emojis subindo
  // no local do choque, e só depois monta o duelo de verdade e abre o modal
  function beginDuel(challenger, holder, isShoot, distancePenalty, isDribble, shootBlockerCount) {
    state.phase = "duel-intro";
    clearActionOptions();
    render();
    UI.flashDuelStart(holder.row, holder.col);

    setTimeout(function () {
      var challengerCtrl = isHumanControlled(challenger.team) ? "human" : "cpu";
      var holderCtrl = isHumanControlled(holder.team) ? "human" : "cpu";
      var ctx = {
        isShoot: isShoot, isDribble: !!isDribble, challenger: challenger, holder: holder,
        distancePenalty: distancePenalty || 0, shootBlockerCount: shootBlockerCount || 0,
        challengerChoice: null, holderChoice: null,
        challengerController: challengerCtrl, holderController: holderCtrl,
        revealed: false, result: null
      };
      state.duelContext = ctx;
      state.phase = "duel";

      if (challengerCtrl === "cpu") {
        ctx.challengerChoice = AI.chooseDuelChoice(challenger, { isShoot: isShoot, critical: isShoot });
      }
      if (holder.stunned) {
        ctx.holderChoice = "acao"; // atordoado não consegue reagir — perde automaticamente, não precisa escolher
      } else if (holderCtrl === "cpu") {
        var criticalHold = isShoot || BOARD.isInOwnGoalBox(holder.row, holder.col, state.teams[holder.team]);
        ctx.holderChoice = AI.chooseDuelChoice(holder, { isShoot: isShoot, critical: criticalHold });
      }

      render();

      if (ctx.challengerChoice && ctx.holderChoice) resolveDuelNow();
    }, DUEL_INTRO_MS);
  }

  function chooseDuelAction(side, choice) {
    var ctx = state.duelContext;
    if (!ctx || ctx.revealed) return;
    if (side === "challenger" && ctx.challengerController === "human") ctx.challengerChoice = choice;
    else if (side === "holder" && ctx.holderController === "human") ctx.holderChoice = choice;
    else return;
    render();
    if (ctx.challengerChoice && ctx.holderChoice) resolveDuelNow();
  }

  /* ---------------- contexto das habilidades ----------------
     O duel.js resolve só a conta; quem conhece o tabuleiro e o placar é
     aqui. Estas duas funções traduzem o estado da partida no pacote que
     as habilidades situacionais (Muralha, Decisivo, Zebra, Capitão,
     Intimidação) precisam pra saber se valem naquele duelo.
  --------------------------------------------------------- */

  function abilityHas(piece, key) { return !!piece && piece.ability === key; }

  // conta auras nas 8 casas ao redor do jogador
  function neighborAuras(piece) {
    var allyCaptains = 0, enemyIntimidators = 0;
    state.pieces.forEach(function (o) {
      if (o.id === piece.id || o.stunned) return;
      if (Math.abs(o.row - piece.row) > 1 || Math.abs(o.col - piece.col) > 1) return;
      if (o.team === piece.team) { if (abilityHas(o, "capitao")) allyCaptains++; }
      else if (abilityHas(o, "intimidacao")) enemyIntimidators++;
    });
    return { allyCaptains: allyCaptains, enemyIntimidators: enemyIntimidators };
  }

  function duelAbilityContext(challenger, holder) {
    var turnsLeft = state.noTurnLimit ? Infinity : (state.maxTurns - state.turnCount);
    var losing = {
      A: state.score.A < state.score.B,
      B: state.score.B < state.score.A
    };
    return {
      holderInOwnBox: BOARD.isInOwnGoalBox(holder.row, holder.col, state.teams[holder.team]),
      isEndgame: turnsLeft <= 10,
      losingByTeam: losing,
      challengerNeighbors: neighborAuras(challenger),
      holderNeighbors: neighborAuras(holder)
    };
  }

  /* No tutorial o chute PRECISA virar gol: o roteiro termina nele, e uma defesa
     deixaria a licao do poder sem desfecho. Nao da pra so trocar o vencedor —
     o modal mostra as duas pontuacoes, e um vencedor com menos pontos pareceria
     bug. Entao a rolagem e repetida ate o atacante ganhar de verdade.

     `resolveDuel` DESCONTA MANA a cada chamada, entao a mana dos dois volta ao
     valor original antes de cada nova tentativa; sem isso o goleiro terminaria
     o roteiro zerado por poderes que ninguem viu. */
  var TENTATIVAS_ATE_O_GOL = 60;

  function rolarAteSerGol(params, ctx) {
    var manaC = ctx.challenger.mana, manaH = ctx.holder.mana;
    var result = null;
    for (var i = 0; i < TENTATIVAS_ATE_O_GOL; i++) {
      if (i > 0) { ctx.challenger.mana = manaC; ctx.holder.mana = manaH; }
      result = DUEL.resolveDuel(params);
      if (result.winnerSide === "challenger") return result;
    }
    // rede de seguranca (chute muito dificil): o placar acompanha o desfecho
    result.winnerSide = "challenger";
    result.challengerScore = result.holderScore + 1;
    return result;
  }

  function resolveDuelNow() {
    var ctx = state.duelContext;
    var extra = duelAbilityContext(ctx.challenger, ctx.holder);
    var params = {
      challenger: ctx.challenger, holder: ctx.holder,
      challengerChoice: ctx.challengerChoice, holderChoice: ctx.holderChoice,
      isShoot: ctx.isShoot, isDribble: ctx.isDribble,
      distancePenalty: ctx.distancePenalty,
      shootBlockerCount: ctx.shootBlockerCount,
      holderInOwnBox: extra.holderInOwnBox,
      isEndgame: extra.isEndgame,
      losingByTeam: extra.losingByTeam,
      challengerNeighbors: extra.challengerNeighbors,
      holderNeighbors: extra.holderNeighbors
    };
    var result;
    if (state.golGarantido && ctx.isShoot) {
      // vale uma vez so: o tutorial solta as travas 900ms depois de o jogador
      // escolher no duelo, entao amarrar a garantia ao fim do roteiro deixaria
      // o gol dependendo de qual dos dois relogios chega primeiro
      state.golGarantido = false;
      result = rolarAteSerGol(params, ctx);
    } else {
      result = DUEL.resolveDuel(params);
    }
    ctx.result = result;
    ctx.revealed = true;
    narrateDuel(ctx, result);
    render();
  }

  function narrateDuel(ctx, result) {
    var c = ctx.challenger, h = ctx.holder;
    var cLabel = result.challengerUsedPower ? (" " + T("usando {0}", T(c.power.name))) : "";
    var hLabel = result.holderUsedPower ? (" " + T("usando {0}", T(h.power.name))) : "";
    // sem esse aviso o jogador vê a mana sumir e o poder não fazer efeito,
    // e parece bug em vez de habilidade do adversário
    if (result.shadowed) {
      addLog("🌑 " + T("{0} é Sombra: o {1} de {2} não teve efeito.", h.name, T(c.power.name), c.name), "ev-info");
    }
    if (ctx.isShoot) {
      if (result.winnerSide === "challenger") {
        addLog(T("{0} chuta de longe", c.name) + cLabel + T("... e é GOL!"), "ev-goal");
      } else {
        addLog(T("{0} defende o chute de {1}!", h.name + hLabel, c.name), "ev-" + h.team.toLowerCase());
      }
      return;
    }
    if (ctx.isDribble) {
      if (result.winnerSide === "challenger") {
        addLog(T("{0} dribla {1} e fica com a bola!", c.name + cLabel, h.name), "ev-" + c.team.toLowerCase());
      } else {
        addLog(T("{0} para o drible de {1}.", h.name + hLabel, c.name), "ev-" + h.team.toLowerCase());
      }
    } else {
      if (result.winnerSide === "challenger") {
        addLog(T("{0} rouba a bola de {1}!", c.name + cLabel, h.name), "ev-" + c.team.toLowerCase());
      } else {
        addLog(T("{0} protege a bola e afasta {1}.", h.name + hLabel, c.name), "ev-" + h.team.toLowerCase());
      }
    }
  }

  /* A bola viaja entre o fim do duelo e o texto do gol. Antes o lance pulava
     do modal direto pro "GOL!", e o chute nunca aparecia em campo.

     Solta a bola do pe de quem chutou (carrierId nulo, senao renderBallToken
     a gruda no jogador) e joga a posicao pro destino — a transicao de #ball-el
     no css faz o voo sozinha. A fase propria trava o clique e fecha o modal,
     que so aparece enquanto phase === "duel". */
  var PAUSA_APOS_O_VOO_MS = 260;   // respiro pra bola "chegar" antes do texto

  /* Quanto a bola avanca ALEM do centro da casa do gol, em fracao de casa: e o
     que a faz morrer NA LINHA em vez de parar em cima do goleiro.

     O teto foi MEDIDO na tela, nao calculado. Duas coisas enganam aqui: a
     perspectiva do campo estreita as linhas do fundo (na linha 4 a casa do gol
     acaba a ~95,7% da largura do #pitch, nao a 100%), e `getBoundingClientRect`
     ignora o `overflow: hidden` — a bola continua "medindo" certo depois de ja
     ter sido cortada. Passando de ~0.28 ela some atras do painel lateral. */
  var AVANCO_NA_REDE = 0.24;

  function voarChute(atacante, gk, foiGol, aoChegar) {
    var origem = { row: state.ball.row, col: state.ball.col };
    state.ball.carrierId = null;
    if (foiGol) {
      var golCol = state.teams[atacante.team].opponentGoalCol;
      // pelo MEIO do gol, por cima do goleiro, e morre na linha de fundo.
      // Mirar num canto livre parecia bola pra fora — foi a primeira tentativa.
      state.ball.row = BOARD.GOAL_ROWS[Math.floor(BOARD.GOAL_ROWS.length / 2)];
      state.ball.col = golCol;
      state.ball.avanco = golCol === 0 ? -AVANCO_NA_REDE : AVANCO_NA_REDE;
    } else {
      state.ball.row = gk.row; state.ball.col = gk.col;
      state.ball.avanco = 0;
    }
    state.phase = "chute-no-ar";
    render();
    var voo = BOARD.ballFlightMs(origem.row, origem.col, state.ball.row, state.ball.col);
    setTimeout(aoChegar, voo + PAUSA_APOS_O_VOO_MS);
  }

  function continueAfterDuel() {
    var ctx = state.duelContext;
    if (!ctx || !ctx.revealed) return;

    if (ctx.isShoot) {
      var foiGol = ctx.result.winnerSide === "challenger";
      var atacante = ctx.challenger, gk = ctx.holder;
      state.duelContext = null;
      voarChute(atacante, gk, foiGol, function () {
        if (foiGol) { scoreGoal(atacante.team, atacante); return; }
        state.ball.carrierId = gk.id;
        state.ball.row = gk.row; state.ball.col = gk.col;
        state.phase = "playing";
        render();
        endTurn();
      });
      return;
    }

    var winnerSide = ctx.result.winnerSide;
    var fxTargetId = null, fxClass = null;
    if (ctx.isDribble) {
      if (winnerSide === "challenger") {
        var cr = ctx.challenger.row, cc = ctx.challenger.col;
        ctx.challenger.row = ctx.holder.row; ctx.challenger.col = ctx.holder.col;
        ctx.holder.row = cr; ctx.holder.col = cc;
        state.ball.row = ctx.challenger.row; state.ball.col = ctx.challenger.col;
        fxTargetId = ctx.holder.id; fxClass = "fx-spin"; // driblado — gira
      } else {
        state.ball.carrierId = ctx.holder.id;
        state.ball.row = ctx.holder.row; state.ball.col = ctx.holder.col;
        fxTargetId = ctx.challenger.id; fxClass = "fx-shake-big"; // falhou no drible
      }
    } else {
      if (winnerSide === "challenger") {
        state.ball.carrierId = ctx.challenger.id;
        state.ball.row = ctx.challenger.row; state.ball.col = ctx.challenger.col;
        fxTargetId = ctx.holder.id; fxClass = "fx-shake-big"; // teve a bola roubada
      }
    }

    var loser = winnerSide === "challenger" ? ctx.holder : ctx.challenger;
    if (abilityHas(loser, "inabalavel")) {
      addLog(T("{0} perdeu a disputa, mas é Inabalável e segue de pé.", loser.name), "ev-info");
    } else {
      loser.stunned = true;
      loser.stunTurns = 1;
      addLog(T("{0} ficou atordoado e não age no próximo turno do time!", loser.name), "ev-" + loser.team.toLowerCase());
    }

    state.duelContext = null;
    state.phase = "playing";
    render();
    if (fxTargetId) UI.flashPiece(fxTargetId, fxClass, fxClass === "fx-spin" ? 850 : 800);
    endTurn();
  }

  // mesma conta usada no placar (ver renderScoreboard em ui.js) — precisa
  // bater pro minuto do artilheiro fazer sentido no relógio exibido
  function matchMinute() {
    if (state.noTurnLimit) return null;
    var base = state.half === 2 ? 45 : 0;
    var progress = Math.min(1, state.turnCount / state.maxTurns);
    return Math.min(base + 45, Math.floor(base + progress * 45));
  }

  function scoreGoal(teamId, scorerPiece) {
    state.score[teamId]++;
    state.scorers[teamId].push({ name: scorerPiece.name, minute: matchMinute() });
    addLog(T("⚽ GOL de {0}! Placar: {1}", scorerPiece.name, state.score.A + " x " + state.score.B), "ev-goal");
    state.phase = "goal-pause";
    var routed = state.noTurnLimit && state.score[teamId] >= 3;
    var suddenDeathWin = state.suddenDeath;
    if (routed) addLog("🏁 " + T("{0} fez 3 gols! A partida termina aqui.", T(state.teams[teamId].name)), "ev-goal");
    if (suddenDeathWin) addLog(T("🥇 GOL DE OURO!") + " " + T("{0} vence na prorrogação!", T(state.teams[teamId].name)), "ev-goal");
    render();
    UI.showGoalBanner(scorerPiece, teamId);
    setTimeout(function () {
      if (routed || suddenDeathWin) { finishGame(); return; }
      var concedingTeamId = teamId === "A" ? "B" : "A";
      resetForKickoff(concedingTeamId);
      addLog(T("🔄 Jogadores voltam à formação inicial.") + " " + T("{0} repõe a bola do centro.", T(state.teams[concedingTeamId].name)), "ev-info");
      advanceToTeamTurn(concedingTeamId);
    }, 2600);
  }

  function beginHalftime() {
    state.phase = "halftime";
    clearActionOptions();
    render();
    UI.showHalftimeBanner();
    setTimeout(function () {
      state.half = 2;
      state.turnCount = 0;
      swapSides();
      var kickoffTeamId = state.firstHalfKickoffTeamId === "A" ? "B" : "A";
      resetForKickoff(kickoffTeamId);
      addLog(T("🔔 Fim do 1º tempo! Os times trocam de lado — {0}", T("{0} repõe a bola.", T(state.teams[kickoffTeamId].name))), "ev-info");
      state.phase = "playing";
      render();
      if (!isHumanControlled(state.currentTeamId) && !state.aiPausada) setTimeout(runAITurn, 800);
    }, 1900);
  }

  // bola ainda no campo de ataque de quem está com ela — o tempo não fecha
  // até ela voltar pro meio-campo (ou for além, campo defensivo)
  function isBallInAttackingHalf() {
    var carrier = state.ball.carrierId ? findPieceById(state.ball.carrierId) : null;
    if (!carrier) return false;
    return BOARD.isPastMidfield(state.ball.row, state.ball.col, state.teams[carrier.team]);
  }

  function enterSuddenDeath() {
    state.suddenDeath = true;
    addLog(T("⏱️ Prorrogação! Gol de ouro — o próximo gol decide a partida."), "ev-info");
  }

  function advanceToTeamTurn(teamId) {
    state.turnCount++;
    if (!state.noTurnLimit && !state.timeUpPending && !state.suddenDeath && state.turnCount >= state.maxTurns) {
      state.timeUpPending = state.half === 1 ? "halftime" : "fulltime";
    }
    if (state.timeUpPending && !isBallInAttackingHalf()) {
      var pending = state.timeUpPending;
      state.timeUpPending = null;
      if (pending === "halftime") { beginHalftime(); return; }
      if (state.goldenGoalOnDraw && state.score.A === state.score.B) {
        enterSuddenDeath();
      } else {
        finishGame();
        return;
      }
    }
    state.currentTeamId = teamId;
    if (!state.suddenDeath) regenMana(teamId);
    processStunForTurn(teamId);
    checkGoalkeeperHoldLimit(teamId);
    clearActionOptions();
    state.phase = "playing";
    render();
    if (!isHumanControlled(state.currentTeamId) && !state.aiPausada) setTimeout(runAITurn, 800);
  }

  // o goleiro só pode segurar a bola por 2 turnos do próprio time — no 3º, ela escapa sozinha
  function checkGoalkeeperHoldLimit(teamId) {
    var carrier = state.ball.carrierId ? findPieceById(state.ball.carrierId) : null;
    if (!carrier || carrier.position !== "GK") {
      state.ball.gkHoldTurns = 0;
      return;
    }
    if (carrier.team !== teamId) return; // conta só nas voltas do turno do próprio time do goleiro
    state.ball.gkHoldTurns = (state.ball.gkHoldTurns || 0) + 1;
    if (state.ball.gkHoldTurns >= 2) {
      state.ball.carrierId = null;
      state.ball.gkHoldTurns = 0;
      addLog("⏱️ " + T("{0} segurou a bola por turnos demais e ela escapou!", carrier.name), "ev-info");
    }
  }

  function endTurn() {
    advanceToTeamTurn(state.currentTeamId === "A" ? "B" : "A");
  }

  function regenMana(teamId) {
    state.pieces.forEach(function (p) {
      if (p.team !== teamId) return;
      p.mana = Math.min(p.maxMana, p.mana + 8 + (abilityHas(p, "motor") ? 5 : 0));
    });
  }

  function processStunForTurn(teamId) {
    state.pieces.forEach(function (p) {
      if (p.team !== teamId) return;
      if (p.stunTurns > 0) {
        p.stunned = true;
        p.stunTurns--;
      } else {
        p.stunned = false;
      }
    });
  }

  function runAITurn() {
    if (!state || state.phase !== "playing") return;
    if (state.aiPausada) return;
    if (isHumanControlled(state.currentTeamId)) return;
    var team = state.teams[state.currentTeamId];
    var action = AI.chooseAction(team, state.pieces, state.ball);
    if (!action) { endTurn(); return; }
    var piece = findPieceById(action.pieceId);

    if (action.type === "pass") {
      resolvePassExecution(piece, action.teammateId, action.blockers);
      return;
    }
    if (action.type === "shoot") {
      beginShootSequence(piece);
      return;
    }

    var target = BOARD.findPieceAt(state.pieces, action.row, action.col);
    if (target && target.team !== piece.team) {
      var isDribble = state.ball.carrierId === piece.id;
      beginDuel(piece, target, false, 0, isDribble);
    } else {
      executeSimpleMove(piece, action.row, action.col);
    }
  }

  function finishGame() {
    state.phase = "gameover";
    render();
    UI.showGameOver(state);
  }

  /* Liga/desliga o turno automatico do adversario. So o tutorial usa. */
  function pausarIA(pausar) {
    if (state) state.aiPausada = !!pausar;
  }

  /* Desliga o azar da interceptaçao. So o tutorial roteirizado usa. */
  function semInterceptacao(desligar) {
    if (state) state.semInterceptacao = !!desligar;
  }

  /* Faz o chute terminar em gol. So o tutorial roteirizado usa. */
  function garantirGol(garantir) {
    if (state) state.golGarantido = !!garantir;
  }

  return {
    start: start,
    getState: getState,
    pausarIA: pausarIA,
    semInterceptacao: semInterceptacao,
    garantirGol: garantirGol,
    selectPiece: selectPiece,
    clearSelection: clearSelection,
    attemptMove: attemptMove,
    attemptPass: attemptPass,
    attemptShoot: attemptShoot,
    chooseDuelAction: chooseDuelAction,
    continueAfterDuel: continueAfterDuel,
    findPieceById: findPieceById
  };

})();
