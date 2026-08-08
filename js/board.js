/* =========================================================
   XEQUE TOTAL — geometria do tabuleiro horizontal, movimento
   por personalidade, alcance de passe e alcance de chute

   Regra central: um duelo só acontece quando a bola está
   envolvida — quem se move já tem a bola (Drible) ou quem
   está parado tem a bola (Desarme). Encostar num adversário
   sem bola simplesmente bloqueia o caminho, como uma peça
   qualquer. Só o Oportunista (Cavalo) pula por cima de
   qualquer peça no meio do caminho.
========================================================= */

var BOARD = (function () {

  var COLS = 13;
  var ROWS = 9;
  var GOAL_ROWS = [3, 4, 5];
  var MID_COL = 6;
  var SHOT_PENALTY_PER_UNIT = 2.6;
  var SHOT_PENALTY_PER_BLOCKER = 6;
  var INTERCEPT_CHANCE = 0.16;

  var DIR_STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var DIR_DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var DIR_ALL = DIR_STRAIGHT.concat(DIR_DIAG);
  var KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];

  function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function findPieceAt(allPieces, row, col) {
    for (var i = 0; i < allPieces.length; i++) {
      var p = allPieces[i];
      if (p.row === row && p.col === col) return p;
    }
    return null;
  }

  function getMovementSpec(piece) {
    if (piece.position === "GK") return { shape: "king", maxDist: 1 };
    var t = GAME_DATA.TEMPERAMENTS[piece.temperament];
    return t ? { shape: t.shape, maxDist: t.maxDist } : { shape: "king", maxDist: 1 };
  }

  function dirsForShape(shape) {
    if (shape === "bishop") return DIR_DIAG;
    if (shape === "rook") return DIR_STRAIGHT;
    return DIR_ALL;
  }

  /* ---------------- movimento / duelo ---------------- */

  function getLegalMoves(piece, allPieces, ballCarrierId) {
    var spec = getMovementSpec(piece);
    var moverHasBall = piece.id === ballCarrierId;

    function classify(row, col, occ) {
      if (!occ) return { row: row, col: col, capture: false, targetId: null, dribble: false };
      if (occ.team === piece.team) return null;
      var targetHasBall = occ.id === ballCarrierId;
      if (moverHasBall || targetHasBall) {
        return { row: row, col: col, capture: true, targetId: occ.id, dribble: moverHasBall };
      }
      return null;
    }

    if (spec.shape === "king" || spec.shape === "knight") {
      var offsets = spec.shape === "king" ? DIR_ALL : KNIGHT_OFFSETS;
      var out = [];
      offsets.forEach(function (o) {
        var r = piece.row + o[0], c = piece.col + o[1];
        if (!inBounds(r, c)) return;
        var res = classify(r, c, findPieceAt(allPieces, r, c));
        if (res) out.push(res);
      });
      return out;
    }

    var dirs = dirsForShape(spec.shape);
    var moves = [];
    dirs.forEach(function (d) {
      for (var dist = 1; dist <= spec.maxDist; dist++) {
        var r = piece.row + d[0] * dist, c = piece.col + d[1] * dist;
        if (!inBounds(r, c)) break;
        var occ = findPieceAt(allPieces, r, c);
        if (!occ) { moves.push({ row: r, col: c, capture: false, targetId: null, dribble: false }); continue; }
        var res = classify(r, c, occ);
        if (res) moves.push(res);
        if (!res && occ.team !== piece.team && occ.stunned) continue; // atordoado não bloqueia — dá pra passar por cima
        break; // qualquer peça na casa bloqueia o resto da linha (menos o Cavalo, que nem passa por aqui)
      }
    });
    return moves;
  }

  /* ---------------- passe (alcance livre na linha, sobrevoa adversários) ---------------- */

  // distância de um ponto (px,py) até o segmento (x1,y1)-(x2,y2), em casas do tabuleiro
  function distToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    var t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    if (t <= 0.06 || t >= 0.94) return Infinity; // ignora perto das pontas (o próprio goleiro / o próprio receptor)
    var projX = x1 + t * dx, projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  function getPassTargets(piece, allPieces, team) {
    if (piece.position === "GK") {
      var ownHalf = function (col) { return team.attackDir === 1 ? col <= MID_COL : col >= MID_COL; };
      var opponents = allPieces.filter(function (p) { return p.team !== piece.team; });
      return allPieces
        .filter(function (p) { return p.team === piece.team && p.id !== piece.id && ownHalf(p.col); })
        .map(function (p) {
          var blockers = opponents
            .filter(function (o) { return distToSegment(o.col, o.row, piece.col, piece.row, p.col, p.row) <= 0.85; })
            .map(function (o) { return o.id; });
          return { row: p.row, col: p.col, teammateId: p.id, blockers: blockers };
        });
    }

    var spec = getMovementSpec(piece);

    if (spec.shape === "king" || spec.shape === "knight") {
      var offsets = spec.shape === "king" ? DIR_ALL : KNIGHT_OFFSETS;
      var out = [];
      offsets.forEach(function (o) {
        var r = piece.row + o[0], c = piece.col + o[1];
        if (!inBounds(r, c)) return;
        var occ = findPieceAt(allPieces, r, c);
        if (occ && occ.team === piece.team) out.push({ row: r, col: c, teammateId: occ.id, blockers: [] });
      });
      return out;
    }

    // o passe percorre a linha inteira (não é limitado pelo alcance de movimento) e sobrevoa
    // qualquer peça no caminho — inclusive companheiros, que não bloqueiam opções mais distantes.
    var dirs = dirsForShape(spec.shape);
    var maxReach = COLS + ROWS;
    var moves = [];
    dirs.forEach(function (d) {
      var blockers = [];
      for (var dist = 1; dist <= maxReach; dist++) {
        var r = piece.row + d[0] * dist, c = piece.col + d[1] * dist;
        if (!inBounds(r, c)) break;
        var occ = findPieceAt(allPieces, r, c);
        if (!occ) continue;
        if (occ.team === piece.team) {
          moves.push({ row: r, col: c, teammateId: occ.id, blockers: blockers.slice() });
          continue; // um companheiro mais próximo não impede alcançar outro mais distante na mesma linha
        }
        blockers.push(occ.id); // adversário no caminho: a bola sobrevoa, mas pode ser interceptada
      }
    });
    return moves;
  }

  /* ---------------- áreas, meio-campo e alcance de chute ---------------- */

  function isInGoalBox(row, col, end) {
    if (GOAL_ROWS.indexOf(row) === -1) return false;
    if (end === "left") return col === 0 || col === 1;
    return col === (COLS - 1) || col === (COLS - 2);
  }

  function isInOwnGoalBox(row, col, team) {
    return isInGoalBox(row, col, team.goalCol === 0 ? "left" : "right");
  }

  function isInOpponentGoalBox(row, col, team) {
    return isInGoalBox(row, col, team.opponentGoalCol === 0 ? "left" : "right");
  }

  function isPastMidfield(row, col, team) {
    return team.attackDir === 1 ? col > MID_COL : col < MID_COL;
  }

  function distanceToGoal(piece, team) {
    var colDist = Math.abs(team.opponentGoalCol - piece.col);
    var rowOffset = 0;
    if (piece.row < GOAL_ROWS[0]) rowOffset = GOAL_ROWS[0] - piece.row;
    else if (piece.row > GOAL_ROWS[GOAL_ROWS.length - 1]) rowOffset = piece.row - GOAL_ROWS[GOAL_ROWS.length - 1];
    return { colDist: colDist, rowOffset: rowOffset, totalDistance: colDist + rowOffset };
  }

  // conta quantos adversários estão "na frente", entre o chutador e o gol
  function countShotBlockers(piece, team, allPieces) {
    if (!allPieces) return 0;
    var goalRow = GOAL_ROWS[Math.floor(GOAL_ROWS.length / 2)];
    var goalCol = team.opponentGoalCol;
    var count = 0;
    allPieces.forEach(function (o) {
      if (o.team === piece.team) return;
      if (distToSegment(o.col, o.row, piece.col, piece.row, goalCol, goalRow) <= 0.85) count++;
    });
    return count;
  }

  // só o Oportunista dispensa o alcance de movimento pra chutar — os demais
  // só conseguem chutar se a distância até o gol estiver dentro do próprio raio de ação.
  function canShootFrom(piece, team) {
    if (!isPastMidfield(piece.row, piece.col, team)) return false;
    if (piece.temperament === "Oportunista") return true;
    var spec = getMovementSpec(piece);
    if (spec.maxDist == null) return true;
    return distanceToGoal(piece, team).totalDistance <= spec.maxDist;
  }

  function shootDistanceInfo(piece, team, allPieces) {
    var d = distanceToGoal(piece, team);
    var blockerCount = countShotBlockers(piece, team, allPieces);
    var penalty = Math.round(d.totalDistance * SHOT_PENALTY_PER_UNIT + blockerCount * SHOT_PENALTY_PER_BLOCKER);
    var difficulty = penalty <= 8 ? "Fácil" : penalty <= 16 ? "Média" : penalty <= 24 ? "Difícil" : "Quase impossível";
    return {
      colDist: d.colDist, rowOffset: d.rowOffset, totalDistance: d.totalDistance,
      blockerCount: blockerCount, penalty: penalty, difficulty: difficulty
    };
  }

  function chebyshev(r1, c1, r2, c2) {
    return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
  }

  return {
    COLS: COLS, ROWS: ROWS, GOAL_ROWS: GOAL_ROWS, MID_COL: MID_COL, INTERCEPT_CHANCE: INTERCEPT_CHANCE,
    inBounds: inBounds, findPieceAt: findPieceAt,
    getMovementSpec: getMovementSpec,
    getLegalMoves: getLegalMoves, getPassTargets: getPassTargets,
    isInGoalBox: isInGoalBox, isInOwnGoalBox: isInOwnGoalBox, isInOpponentGoalBox: isInOpponentGoalBox,
    isPastMidfield: isPastMidfield, canShootFrom: canShootFrom, shootDistanceInfo: shootDistanceInfo,
    chebyshev: chebyshev
  };

})();
