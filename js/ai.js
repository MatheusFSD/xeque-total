/* =========================================================
   XEQUE TOTAL — inteligência artificial do time adversário
   (decide entre Mover, Passar ou Chutar)
========================================================= */

var AI = (function () {

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function evaluateMoveScore(piece, mv, team, allPieces, ball) {
    var score = Math.random() * 4;
    var carrying = ball.carrierId === piece.id;

    if (carrying) {
      var curD = Math.abs(piece.col - team.opponentGoalCol);
      var newD = Math.abs(mv.col - team.opponentGoalCol);
      score += (curD - newD) * 6;
      if (mv.capture) score += 8;
    } else if (ball.carrierId) {
      var carrier = findById(allPieces, ball.carrierId);
      if (carrier && carrier.team !== team.id) {
        if (mv.capture) {
          score += 55;
        } else {
          var d0 = BOARD.chebyshev(piece.row, piece.col, carrier.row, carrier.col);
          var d1 = BOARD.chebyshev(mv.row, mv.col, carrier.row, carrier.col);
          score += (d0 - d1) * 3;
        }
      }
    } else {
      var d0b = BOARD.chebyshev(piece.row, piece.col, ball.row, ball.col);
      var d1b = BOARD.chebyshev(mv.row, mv.col, ball.row, ball.col);
      score += (d0b - d1b) * 5;
      if (mv.row === ball.row && mv.col === ball.col) score += 20;
    }

    if (piece.position === "FW" || piece.position === "MF") {
      var curD2 = Math.abs(piece.col - team.opponentGoalCol);
      var newD2 = Math.abs(mv.col - team.opponentGoalCol);
      score += (curD2 - newD2) * 1.4;
    }
    if (piece.position === "GK" && !BOARD.isInOwnGoalBox(mv.row, mv.col, team)) score -= 45;

    return score;
  }

  function evaluatePassScore(piece, target, team) {
    var score = 15 + Math.random() * 6;
    var curD = Math.abs(piece.col - team.opponentGoalCol);
    var newD = Math.abs(target.col - team.opponentGoalCol);
    score += (curD - newD) * 5;
    if (BOARD.isPastMidfield(target.row, target.col, team)) score += 8;
    score -= (target.blockers ? target.blockers.length : 0) * 10;
    return score;
  }

  function evaluateShootScore(piece, team, allPieces, defTeamMeta) {
    var info = BOARD.shootDistanceInfo(piece, team, allPieces);
    var score = 55 - info.penalty;
    var gk = null;
    for (var i = 0; i < allPieces.length; i++) {
      if (allPieces[i].team !== team.id && allPieces[i].position === "GK") { gk = allPieces[i]; break; }
    }
    if (gk && defTeamMeta && !BOARD.isInOwnGoalBox(gk.row, gk.col, defTeamMeta)) score += 70;
    return score;
  }

  function chooseAction(team, allPieces, ball) {
    var myPieces = allPieces.filter(function (p) { return p.team === team.id && !p.stunned; });
    var candidates = [];
    var defTeamMeta = { goalCol: team.opponentGoalCol };

    myPieces.forEach(function (piece) {
      var moves = BOARD.getLegalMoves(piece, allPieces, ball.carrierId);
      moves.forEach(function (mv) {
        candidates.push({ type: "move", piece: piece, move: mv, score: evaluateMoveScore(piece, mv, team, allPieces, ball) });
      });

      if (ball.carrierId === piece.id) {
        var passTargets = BOARD.getPassTargets(piece, allPieces, team);
        passTargets.forEach(function (pt) {
          candidates.push({ type: "pass", piece: piece, target: pt, score: evaluatePassScore(piece, pt, team) });
        });
        if (BOARD.canShootFrom(piece, team)) {
          candidates.push({ type: "shoot", piece: piece, score: evaluateShootScore(piece, team, allPieces, defTeamMeta) });
        }
      }
    });

    if (!candidates.length) return null;
    candidates.sort(function (a, b) { return b.score - a.score; });
    var topN = candidates.slice(0, Math.min(3, candidates.length));
    var pick = topN[Math.floor(Math.random() * topN.length)];

    if (pick.type === "move") return { type: "move", pieceId: pick.piece.id, row: pick.move.row, col: pick.move.col };
    if (pick.type === "pass") return { type: "pass", pieceId: pick.piece.id, teammateId: pick.target.teammateId, blockers: pick.target.blockers };
    return { type: "shoot", pieceId: pick.piece.id };
  }

  function chooseDuelChoice(piece, opts) {
    opts = opts || {};
    if (!DUEL.canUsePower(piece)) return "acao";
    var chance = opts.isShoot ? 0.75 : 0.45;
    if (opts.critical) chance += 0.15;
    if (piece.mana < piece.power.manaCost * 1.3) chance -= 0.15;
    chance = Math.max(0.05, Math.min(0.9, chance));
    return Math.random() < chance ? "poder" : "acao";
  }

  return { chooseAction: chooseAction, chooseDuelChoice: chooseDuelChoice };

})();
