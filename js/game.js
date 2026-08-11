/* =========================================================
   XEQUE TOTAL — máquina de estados da partida
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

  function addLog(text, cls) {
    logId++;
    state.log.push({ id: logId, text: text, cls: cls || "ev-info" });
    if (state.log.length > 60) state.log.shift();
  }

  // homeSquadId sempre ocupa o slot A (jogador humano), awaySquadId sempre o slot B (CPU).
  // Squads guardam a formação em orientação canônica "esquerda" — no slot B a coluna é espelhada.
  function buildInitialState(homeSquadId, awaySquadId, maxTurns, noTurnLimit) {
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
          maxMana: pd.maxMana, mana: pd.maxMana,
          row: pd.start.row, col: col, quote: pd.quote,
          assetKey: pd.assetKey, assetPrefix: sq.assetPrefix,
          stunned: false, stunTurns: 0
        });
      });
    });
    return {
      phase: "playing", humanTeamId: "A",
      teams: teamsMeta, pieces: pieces,
      ball: { row: Math.floor(BOARD.ROWS / 2), col: BOARD.MID_COL, carrierId: null, gkHoldTurns: 0 },
      currentTeamId: "A", turnCount: 0, maxTurns: maxTurns || 40, noTurnLimit: !!noTurnLimit, half: 1,
      score: { A: 0, B: 0 }, scorers: { A: [], B: [] }, selectedPieceId: null,
      legalMoves: [], passTargets: [], canShoot: false, shootInfo: null,
      log: [], duelContext: null
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

  function start(homeSquadId, awaySquadId, formationOverrides, kickoffTeamId, maxTurns, noTurnLimit) {
    state = buildInitialState(homeSquadId || "TEC", awaySquadId || "RAP", maxTurns, noTurnLimit);
    applyFormationOverrides(formationOverrides);
    state.pieces.forEach(function (p) { p.homeRow = p.row; p.homeCol = p.col; });
    applyKickoff(kickoffTeamId || "A");
    state.firstHalfKickoffTeamId = state.currentTeamId;
    var teamName = state.teams[state.humanTeamId].name;
    var kickoffName = state.teams[state.currentTeamId].name;
    addLog("Apito inicial! Você comanda o " + teamName + ".", "ev-info");
    addLog("🪙 " + kickoffName + " venceu o sorteio e começa com a bola!", "ev-info");
    render();
    if (state.currentTeamId !== state.humanTeamId) setTimeout(runAITurn, 800);
  }

  function getState() { return state; }

  function updateActionOptions(piece) {
    state.legalMoves = BOARD.getLegalMoves(piece, state.pieces, state.ball.carrierId);
    if (state.ball.carrierId === piece.id) {
      var team = state.teams[piece.team];
      state.passTargets = BOARD.getPassTargets(piece, state.pieces, team);
      state.canShoot = BOARD.canShootFrom(piece, team);
      state.shootInfo = state.canShoot ? BOARD.shootDistanceInfo(piece, team, state.pieces) : null;
    } else {
      state.passTargets = []; state.canShoot = false; state.shootInfo = null;
    }
  }

  function clearActionOptions() {
    state.selectedPieceId = null; state.legalMoves = []; state.passTargets = []; state.canShoot = false; state.shootInfo = null;
  }

  function selectPiece(pieceId) {
    if (!state || state.phase !== "playing") return;
    if (state.currentTeamId !== state.humanTeamId) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.team !== state.humanTeamId || piece.stunned) return;
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
    if (state.currentTeamId !== state.humanTeamId) return;
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
    if (state.currentTeamId !== state.humanTeamId) return;
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
    if (state.currentTeamId !== state.humanTeamId) return;
    var piece = findPieceById(pieceId);
    if (!piece || piece.id !== state.selectedPieceId || state.ball.carrierId !== piece.id || !state.canShoot) return;
    beginShootSequence(piece);
  }

  function rollInterception(blockerIds) {
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
      addLog("⚠️ " + interceptor.name + " INTERCEPTA o passe de " + passer.name + "!", "ev-" + interceptor.team.toLowerCase());
      clearActionOptions();
      render();
      // treme só quando a bola chega de fato (fim da animação de voo), não quando sai do pé
      var flightMs1 = BOARD.ballFlightMs(fromRow, fromCol, interceptor.row, interceptor.col);
      setTimeout(function () { UI.flashPiece(interceptor.id, "fx-shake-small", 450); }, flightMs1);
    } else {
      state.ball.carrierId = receiver.id;
      state.ball.row = receiver.row; state.ball.col = receiver.col;
      addLog(passer.name + " lança para " + receiver.name + "!", "ev-" + passer.team.toLowerCase());
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
      addLog(piece.name + " dominou a bola!", "ev-" + piece.team.toLowerCase());
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
    var gkInBox = gk && BOARD.isInOwnGoalBox(gk.row, gk.col, defTeam);
    if (!gkInBox) {
      addLog("GOL DE PLACA! O goleiro saiu da área e " + shooter.name + " encontra o gol vazio!", "ev-goal");
      scoreGoal(shooter.team, shooter);
      return;
    }
    if (gk.stunned) {
      addLog("GOL DE PLACA! " + gk.name + " está atordoado e não consegue reagir ao chute de " + shooter.name + "!", "ev-goal");
      scoreGoal(shooter.team, shooter);
      return;
    }
    beginDuel(shooter, gk, true, info.penalty, false, info.blockerCount);
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
      var challengerCtrl = challenger.team === state.humanTeamId ? "human" : "cpu";
      var holderCtrl = holder.team === state.humanTeamId ? "human" : "cpu";
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

  function resolveDuelNow() {
    var ctx = state.duelContext;
    var result = DUEL.resolveDuel({
      challenger: ctx.challenger, holder: ctx.holder,
      challengerChoice: ctx.challengerChoice, holderChoice: ctx.holderChoice,
      isShoot: ctx.isShoot, distancePenalty: ctx.distancePenalty
    });
    ctx.result = result;
    ctx.revealed = true;
    narrateDuel(ctx, result);
    render();
  }

  function narrateDuel(ctx, result) {
    var c = ctx.challenger, h = ctx.holder;
    var cLabel = result.challengerUsedPower ? (" usando " + c.power.name) : "";
    var hLabel = result.holderUsedPower ? (" usando " + h.power.name) : "";
    if (ctx.isShoot) {
      if (result.winnerSide === "challenger") {
        addLog(c.name + " chuta de longe" + cLabel + "... e é GOL!", "ev-goal");
      } else {
        addLog(h.name + " defende o chute de " + c.name + hLabel + "!", "ev-" + h.team.toLowerCase());
      }
      return;
    }
    if (ctx.isDribble) {
      if (result.winnerSide === "challenger") {
        addLog(c.name + " dribla " + h.name + cLabel + " e passa por cima!", "ev-" + c.team.toLowerCase());
      } else {
        addLog(h.name + " para o drible de " + c.name + hLabel + " e fica com a bola!", "ev-" + h.team.toLowerCase());
      }
    } else {
      if (result.winnerSide === "challenger") {
        addLog(c.name + " rouba a bola de " + h.name + cLabel + "!", "ev-" + c.team.toLowerCase());
      } else {
        addLog(h.name + " protege a bola e afasta " + c.name + hLabel + "!", "ev-" + h.team.toLowerCase());
      }
    }
  }

  function continueAfterDuel() {
    var ctx = state.duelContext;
    if (!ctx || !ctx.revealed) return;

    if (ctx.isShoot) {
      if (ctx.result.winnerSide === "challenger") {
        state.duelContext = null;
        scoreGoal(ctx.challenger.team, ctx.challenger);
      } else {
        state.ball.carrierId = ctx.holder.id;
        state.ball.row = ctx.holder.row; state.ball.col = ctx.holder.col;
        state.duelContext = null;
        state.phase = "playing";
        render();
        endTurn();
      }
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
    loser.stunned = true;
    loser.stunTurns = 1;
    addLog(loser.name + " ficou atordoado e não age no próximo turno do time!", "ev-" + loser.team.toLowerCase());

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
    addLog("⚽ GOL de " + scorerPiece.name + "! Placar: " + state.score.A + " x " + state.score.B, "ev-goal");
    state.phase = "goal-pause";
    var routed = state.noTurnLimit && state.score[teamId] >= 3;
    if (routed) addLog("🏁 " + state.teams[teamId].name + " fez 3 gols! A partida termina aqui.", "ev-goal");
    render();
    UI.showGoalBanner(scorerPiece, teamId);
    setTimeout(function () {
      if (routed) { finishGame(); return; }
      var concedingTeamId = teamId === "A" ? "B" : "A";
      resetForKickoff(concedingTeamId);
      addLog("🔄 Jogadores voltam à formação inicial. " + state.teams[concedingTeamId].name + " repõe a bola do centro.", "ev-info");
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
      addLog("🔔 Fim do 1º tempo! Os times trocam de lado — " + state.teams[kickoffTeamId].name + " repõe a bola.", "ev-info");
      state.phase = "playing";
      render();
      if (state.currentTeamId !== state.humanTeamId) setTimeout(runAITurn, 800);
    }, 1900);
  }

  function advanceToTeamTurn(teamId) {
    state.turnCount++;
    if (!state.noTurnLimit && state.turnCount >= state.maxTurns) {
      if (state.half === 1) { beginHalftime(); return; }
      finishGame();
      return;
    }
    state.currentTeamId = teamId;
    regenMana(teamId);
    processStunForTurn(teamId);
    checkGoalkeeperHoldLimit(teamId);
    clearActionOptions();
    state.phase = "playing";
    render();
    if (state.currentTeamId !== state.humanTeamId) setTimeout(runAITurn, 800);
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
      addLog("⏱️ " + carrier.name + " segurou a bola por turnos demais e ela escapou!", "ev-info");
    }
  }

  function endTurn() {
    advanceToTeamTurn(state.currentTeamId === "A" ? "B" : "A");
  }

  function regenMana(teamId) {
    state.pieces.forEach(function (p) {
      if (p.team === teamId) p.mana = Math.min(p.maxMana, p.mana + 8);
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
    if (state.currentTeamId === state.humanTeamId) return;
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

  return {
    start: start,
    getState: getState,
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
