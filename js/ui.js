/* =========================================================
   XEQUE TOTAL — renderização e interações de interface
========================================================= */

var UI = (function () {

  var els = {};
  var inspectedId = null;
  var chosenHumanTeam = "A";
  var chosenMaxTurns = 40;
  var chosenNoTurnLimit = false;

  var tokenEls = {};
  var lastPositions = {};
  var hoverArrowEl = null;
  var PITCH_TILT_DEG = 14; // precisa bater com o rotateX de #pitch no style.css
  var PITCH_UPRIGHT = " rotateX(-" + PITCH_TILT_DEG + "deg)"; // "de-tilta" peças/bola pra ficarem em pé

  var lineupWorking = null;
  var lineupSelectedId = null;
  var formationOverrides = null;
  var coinWinnerTeamId = null;

  var SVG_NS = "http://www.w3.org/2000/svg";

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    var ids = [
      "start-screen", "pick-a", "pick-b", "turn-limit-input", "no-turn-limit-checkbox", "start-btn", "how-to-play-btn", "how-to-play",
      "game-root", "score-team-a", "name-team-a", "tag-team-a", "score-a",
      "score-team-b", "name-team-b", "tag-team-b", "score-b", "score-clock", "score-turn", "menu-btn",
      "roster-list", "player-detail-panel",
      "board", "pitch",
      "player-stats-modal", "player-stats-body", "player-stats-close",
      "duel-modal", "duel-title", "duel-left-avatar", "duel-left-name", "duel-left-role", "duel-left-score", "duel-left-actions",
      "duel-right-avatar", "duel-right-name", "duel-right-role", "duel-right-score", "duel-right-actions",
      "duel-result", "duel-continue-btn",
      "goal-banner", "goal-scorer", "halftime-banner",
      "gameover-modal", "gameover-kicker", "gameover-title", "gameover-score", "gameover-sub", "rematch-btn",
      "lineup-ask-modal", "lineup-ask-text", "lineup-ask-yes", "lineup-ask-no",
      "lineup-editor-modal", "lineup-editor-title", "lineup-grid", "lineup-detail", "lineup-reset-btn", "lineup-confirm-btn",
      "coinflip-modal", "coin", "coinflip-result", "coinflip-continue-btn"
    ];
    ids.forEach(function (id) {
      var key = id.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
      els[key] = $(id);
    });
  }

  function pieceAtCell(state, row, col) {
    for (var i = 0; i < state.pieces.length; i++) {
      var p = state.pieces[i];
      if (p.row === row && p.col === col) return p;
    }
    return null;
  }

  function teamColorVar(teamId) {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === teamId) return GAME_DATA.TEAMS[i].colorVar;
    return "teco";
  }

  function teamGradient(teamId) {
    var v = teamColorVar(teamId);
    return "linear-gradient(135deg, var(--" + v + "-2), var(--" + v + "))";
  }

  function difficultyFromPenalty(p) {
    if (p <= 8) return { label: "Fácil", cls: "diff-facil" };
    if (p <= 16) return { label: "Média", cls: "diff-media" };
    if (p <= 24) return { label: "Difícil", cls: "diff-dificil" };
    return { label: "Quase impossível", cls: "diff-impossivel" };
  }

  /* ---------------- imagens (splash art / ícone) com fallback ---------------- */

  function fillAvatarEl(el, piece, folder) {
    el.innerHTML = "";
    var img = document.createElement("img");
    img.src = folder + "/" + piece.assetPrefix + "_" + piece.assetKey + ".png";
    img.alt = piece.name;
    img.loading = "lazy";
    var fallback = document.createElement("div");
    fallback.className = "avatar-fallback";
    fallback.style.background = teamGradient(piece.team);
    fallback.textContent = piece.number;
    fallback.style.display = "none";
    img.addEventListener("error", function () { img.style.display = "none"; fallback.style.display = "flex"; });
    el.appendChild(img);
    el.appendChild(fallback);
  }

  function buildAvatarBox(piece, folder) {
    var box = document.createElement("div");
    box.className = "avatar-box";
    fillAvatarEl(box, piece, folder);
    return box;
  }

  /* ---------------- setas de intenção (mover / passar / chutar) ---------------- */

  function cellCenterPct(row, col) {
    return { x: (col + 0.5) / BOARD.COLS * 100, y: (row + 0.5) / BOARD.ROWS * 100 };
  }

  function clearHoverArrow() {
    if (hoverArrowEl) { hoverArrowEl.remove(); hoverArrowEl = null; }
  }

  function showArrow(fromRow, fromCol, toRow, toCol, kind) {
    if (!els.fxLayer) return;
    clearHoverArrow();
    var p1 = cellCenterPct(fromRow, fromCol);
    var p2 = cellCenterPct(toRow, toCol);
    var d;
    if (kind === "move" || kind === "duel") {
      d = "M " + p1.x + " " + p1.y + " L " + p2.x + " " + p2.y;
    } else {
      var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var bulge = Math.min(len * 0.32, 16);
      var cx = mx + nx * bulge, cy = my + ny * bulge;
      d = "M " + p1.x + " " + p1.y + " Q " + cx + " " + cy + " " + p2.x + " " + p2.y;
    }
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "fx-arrow fx-arrow-" + kind);
    path.setAttribute("marker-end", "url(#fx-arrowhead-" + kind + ")");
    els.fxLayer.appendChild(path);
    hoverArrowEl = path;
  }

  function handleSquareHover(row, col) {
    var state = GAME.getState();
    if (!state || !state.selectedPieceId) return;
    if (state.phase !== "playing" || state.currentTeamId !== state.humanTeamId) return;
    var selPiece = GAME.findPieceById(state.selectedPieceId);
    if (!selPiece) return;

    for (var i = 0; i < state.passTargets.length; i++) {
      var t = state.passTargets[i];
      if (t.row === row && t.col === col) { showArrow(selPiece.row, selPiece.col, row, col, "pass"); return; }
    }
    for (var j = 0; j < state.legalMoves.length; j++) {
      var m = state.legalMoves[j];
      if (m.row === row && m.col === col) { showArrow(selPiece.row, selPiece.col, row, col, m.capture ? "duel" : "move"); return; }
    }
  }

  /* ---------------- construção do tabuleiro ---------------- */

  function buildFxLayer() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("id", "fx-layer");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    var defs = document.createElementNS(SVG_NS, "defs");
    ["move", "pass", "shoot", "duel"].forEach(function (kind) {
      var marker = document.createElementNS(SVG_NS, "marker");
      marker.setAttribute("id", "fx-arrowhead-" + kind);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "6"); marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "3.4"); marker.setAttribute("markerHeight", "3.4");
      marker.setAttribute("orient", "auto-start-reverse");
      var mpath = document.createElementNS(SVG_NS, "path");
      mpath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      mpath.setAttribute("class", "fx-arrowhead fx-arrowhead-" + kind);
      marker.appendChild(mpath);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);
    els.pitch.appendChild(svg);
    els.fxLayer = svg;
  }

  function buildBoardCells() {
    els.board.innerHTML = "";
    for (var r = 0; r < BOARD.ROWS; r++) {
      for (var c = 0; c < BOARD.COLS; c++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener("click", function () {
          handleSquareInteraction(parseInt(this.dataset.row, 10), parseInt(this.dataset.col, 10));
        });
        cell.addEventListener("mouseenter", function () {
          handleSquareHover(parseInt(this.dataset.row, 10), parseInt(this.dataset.col, 10));
        });
        cell.addEventListener("mouseleave", clearHoverArrow);
        els.board.appendChild(cell);
      }
    }

    var trailLayer = document.createElement("div");
    trailLayer.id = "trail-layer";
    trailLayer.className = "trail-layer";
    els.pitch.appendChild(trailLayer);
    els.trailLayer = trailLayer;

    var piecesLayer = document.createElement("div");
    piecesLayer.id = "pieces-layer";
    piecesLayer.className = "pieces-layer";
    els.pitch.appendChild(piecesLayer);
    els.piecesLayer = piecesLayer;

    var ballEl = document.createElement("div");
    ballEl.id = "ball-el";
    var ballSpan = document.createElement("span");
    ballSpan.textContent = "⚽";
    ballEl.appendChild(ballSpan);
    els.pitch.appendChild(ballEl);
    els.ballEl = ballEl;

    var shootFab = document.createElement("button");
    shootFab.id = "shoot-fab";
    shootFab.type = "button";
    shootFab.title = "Chutar";
    shootFab.setAttribute("aria-label", "Chutar");
    shootFab.textContent = "🎯";
    shootFab.classList.add("hidden");
    shootFab.addEventListener("click", function (e) {
      e.stopPropagation();
      var state = GAME.getState();
      if (state && state.selectedPieceId) GAME.attemptShoot(state.selectedPieceId);
    });
    shootFab.addEventListener("mouseenter", function () {
      var state = GAME.getState();
      if (!state || !state.canShoot || !state.selectedPieceId) return;
      var piece = GAME.findPieceById(state.selectedPieceId);
      if (!piece) return;
      var team = state.teams[piece.team];
      showArrow(piece.row, piece.col, BOARD.GOAL_ROWS[1], team.opponentGoalCol, "shoot");
    });
    shootFab.addEventListener("mouseleave", clearHoverArrow);
    els.pitch.appendChild(shootFab);
    els.shootFab = shootFab;

    buildFxLayer();
  }

  function renderBallToken(state) {
    if (!els.ballEl) return;
    var row = state.ball.row, col = state.ball.col;
    if (state.ball.carrierId) {
      var carrier = GAME.findPieceById(state.ball.carrierId);
      if (carrier) { row = carrier.row; col = carrier.col; }
    }
    els.ballEl.style.transform = "translate(" + (col * 100) + "%, " + (row * 100) + "%)" + PITCH_UPRIGHT;
  }

  /* ---------------- eventos de clique ---------------- */

  function handleSquareInteraction(row, col) {
    var state = GAME.getState();
    if (!state) return;
    var piece = pieceAtCell(state, row, col);
    if (piece) inspectedId = piece.id;

    if (state.phase === "playing" && state.currentTeamId === state.humanTeamId) {
      if (state.selectedPieceId) {
        for (var i = 0; i < state.passTargets.length; i++) {
          var t = state.passTargets[i];
          if (t.row === row && t.col === col) {
            clearHoverArrow();
            GAME.attemptPass(state.selectedPieceId, row, col);
            return;
          }
        }
      }
      if (piece && piece.team === state.humanTeamId) {
        GAME.selectPiece(piece.id);
        return;
      }
      if (state.selectedPieceId) {
        for (var j = 0; j < state.legalMoves.length; j++) {
          var m = state.legalMoves[j];
          if (m.row === row && m.col === col) {
            clearHoverArrow();
            GAME.attemptMove(state.selectedPieceId, row, col);
            return;
          }
        }
      }
    }
    render(state);
  }

  function onRosterClick(pieceId) {
    inspectedId = pieceId;
    var state = GAME.getState();
    if (!state) return;
    var piece = GAME.findPieceById(pieceId);
    if (state.phase === "playing" && state.currentTeamId === state.humanTeamId && piece && piece.team === state.humanTeamId) {
      GAME.selectPiece(pieceId);
      return;
    }
    render(state);
  }

  /* ---------------- render principal ---------------- */

  function render(state) {
    if (!state) return;
    clearHoverArrow();
    renderScoreboard(state);
    renderBoard(state);
    renderShootFab(state);
    renderRosters(state);
    renderPlayerDetailPanel(state);
    renderDuelModal(state);
  }

  function renderScoreboard(state) {
    els.nameTeamA.textContent = state.teams.A.name;
    els.nameTeamB.textContent = state.teams.B.name;
    els.tagTeamA.textContent = (state.humanTeamId === "A" ? "Você" : "CPU") + " · Precisão";
    els.tagTeamB.textContent = (state.humanTeamId === "B" ? "Você" : "CPU") + " · Instinto";
    els.scoreA.textContent = state.score.A;
    els.scoreB.textContent = state.score.B;
    els.scoreTeamA.classList.toggle("active-turn", state.currentTeamId === "A" && state.phase !== "gameover");
    els.scoreTeamB.classList.toggle("active-turn", state.currentTeamId === "B" && state.phase !== "gameover");
    els.scoreTurn.textContent = state.phase === "gameover" ? "Fim de jogo" : (state.currentTeamId === state.humanTeamId ? "Sua vez" : "Vez do adversário");

    if (state.noTurnLimit) {
      els.scoreClock.textContent = "⚡ 3 GOLS";
    } else {
      var base = state.half === 2 ? 45 : 0;
      var progress = Math.min(1, state.turnCount / state.maxTurns);
      var minute = state.phase === "gameover" ? 90 : Math.min(base + 45, Math.floor(base + progress * 45));
      els.scoreClock.textContent = (state.half === 2 ? "2ºT " : "1ºT ") + minute + "'";
    }
  }

  function renderShootFab(state) {
    if (!els.shootFab) return;
    var piece = state.selectedPieceId ? GAME.findPieceById(state.selectedPieceId) : null;
    var show = state.phase === "playing" && state.currentTeamId === state.humanTeamId &&
      piece && state.ball.carrierId === piece.id && state.canShoot;
    if (!show) { els.shootFab.classList.add("hidden"); return; }
    els.shootFab.classList.remove("hidden");
    var cellW = 100 / BOARD.COLS, cellH = 100 / BOARD.ROWS;
    els.shootFab.style.left = ((piece.col / BOARD.COLS * 100) + cellW * 0.82) + "%";
    els.shootFab.style.top = ((piece.row / BOARD.ROWS * 100) + cellH * 0.1) + "%";

    var title = "Chutar — dificuldade: " + (state.shootInfo ? state.shootInfo.difficulty : "—");
    if (state.shootInfo && state.shootInfo.blockerCount > 0) {
      title += " (" + state.shootInfo.blockerCount + " marcador" + (state.shootInfo.blockerCount > 1 ? "es" : "") + " na frente)";
    }
    els.shootFab.title = title;
  }

  function renderBoard(state) {
    var legalMap = {};
    state.legalMoves.forEach(function (m) { legalMap[m.row + "," + m.col] = m; });
    var passMap = {};
    state.passTargets.forEach(function (t) { passMap[t.row + "," + t.col] = t; });
    var selPiece = state.selectedPieceId ? GAME.findPieceById(state.selectedPieceId) : null;

    var cells = els.board.children;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var r = parseInt(cell.dataset.row, 10), c = parseInt(cell.dataset.col, 10);
      cell.className = "cell";
      if (BOARD.isInGoalBox(r, c, "left")) cell.classList.add("goal-zone-a");
      if (BOARD.isInGoalBox(r, c, "right")) cell.classList.add("goal-zone-b");
      if (selPiece && selPiece.row === r && selPiece.col === c) cell.classList.add("selected-cell");

      var pt = passMap[r + "," + c];
      if (pt) {
        cell.classList.add("pass-target");
      } else {
        var mv = legalMap[r + "," + c];
        if (mv) {
          cell.classList.add(mv.capture ? "legal-capture" : "legal-move");
          if (!mv.capture && selPiece) {
            // acende em sequência a partir da peça selecionada (distância de Chebyshev)
            var dist = Math.max(Math.abs(r - selPiece.row), Math.abs(c - selPiece.col));
            cell.style.setProperty("--stagger", dist);
          }
        }
      }
    }

    renderPieces(state);
  }

  /* ---------------- peças persistentes (permite animação suave) ---------------- */

  function createPieceToken(piece) {
    var outer = document.createElement("div");
    outer.className = "piece-token team-" + piece.team.toLowerCase();
    outer.title = piece.name + " — " + GAME_DATA.POSITIONS[piece.position].label;

    var visual = document.createElement("div");
    visual.className = "token-visual";

    var artWrap = document.createElement("div");
    artWrap.className = "token-art-wrap";
    var img = document.createElement("img");
    img.className = "token-art";
    img.src = "splashs_art/" + piece.assetPrefix + "_" + piece.assetKey + ".png";
    img.alt = piece.name;
    img.loading = "lazy";
    var fallback = document.createElement("div");
    fallback.className = "token-fallback";
    fallback.style.background = teamGradient(piece.team);
    fallback.textContent = piece.number;
    fallback.style.display = "none";
    img.addEventListener("error", function () { img.style.display = "none"; fallback.style.display = "flex"; });
    artWrap.appendChild(img);
    artWrap.appendChild(fallback);

    var postag = document.createElement("span");
    postag.className = "piece-pos-tag";
    postag.textContent = GAME_DATA.POSITIONS[piece.position].short;
    var num = document.createElement("span");
    num.className = "piece-number";
    num.textContent = piece.number;
    var flag = document.createElement("span");
    flag.className = "piece-flag";
    flag.textContent = piece.flag;

    visual.appendChild(artWrap);
    visual.appendChild(postag);
    visual.appendChild(num);
    visual.appendChild(flag);
    outer.appendChild(visual);

    outer.addEventListener("click", function () { handleSquareInteraction(piece.row, piece.col); });
    outer.addEventListener("dblclick", function (e) { e.stopPropagation(); openPlayerStatsModal(piece.id); });
    outer.addEventListener("mouseenter", function () { handleSquareHover(piece.row, piece.col); });
    outer.addEventListener("mouseleave", clearHoverArrow);

    return outer;
  }

  function spawnTrail(row, col, teamId) {
    if (!els.trailLayer) return;
    var el = document.createElement("div");
    el.className = "token-trail team-" + teamId.toLowerCase();
    el.style.left = (col / BOARD.COLS * 100) + "%";
    el.style.top = (row / BOARD.ROWS * 100) + "%";
    el.style.width = (100 / BOARD.COLS) + "%";
    el.style.height = (100 / BOARD.ROWS) + "%";
    els.trailLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  function updatePieceToken(token, piece, state) {
    var last = lastPositions[piece.id];
    if (last && (last.row !== piece.row || last.col !== piece.col)) {
      spawnTrail(last.row, last.col, piece.team);
    }
    lastPositions[piece.id] = { row: piece.row, col: piece.col };

    token.style.transform = "translate(" + (piece.col * 100) + "%, " + (piece.row * 100) + "%)" + PITCH_UPRIGHT;
    token.classList.toggle("selected", state.selectedPieceId === piece.id);
    token.classList.toggle("has-ball", state.ball.carrierId === piece.id);
    token.classList.toggle("low-mana", piece.mana < piece.power.manaCost);
    token.classList.toggle("stunned", !!piece.stunned);
  }

  /* dispara uma animação passageira (tremor/giro) na peça, sem mexer no
     transform de posição — aplicada no .token-visual (filho), nunca no
     .piece-token (pai), que carrega o translate/rotateX de posicionamento */
  function flashPiece(pieceId, fxClass, duration) {
    var token = tokenEls[pieceId];
    if (!token) return;
    var visual = token.querySelector(".token-visual");
    if (!visual) return;
    visual.classList.remove(fxClass);
    void visual.offsetWidth;
    visual.classList.add(fxClass);
    setTimeout(function () { visual.classList.remove(fxClass); }, duration || 700);
  }

  function renderPieces(state) {
    state.pieces.forEach(function (piece) {
      var token = tokenEls[piece.id];
      if (!token) {
        token = createPieceToken(piece);
        tokenEls[piece.id] = token;
        els.piecesLayer.appendChild(token);
      }
      updatePieceToken(token, piece, state);
    });

    renderBallToken(state);
  }

  /* ---------------- painéis laterais ---------------- */

  function buildRosterCard(piece, state) {
    var card = document.createElement("div");
    card.className = "roster-card";
    if (state.selectedPieceId === piece.id || inspectedId === piece.id) card.classList.add("selected");
    if (state.ball.carrierId === piece.id) card.classList.add("has-ball");
    if (piece.stunned) card.classList.add("stunned");
    card.addEventListener("click", function () { onRosterClick(piece.id); });
    card.addEventListener("dblclick", function (e) { e.stopPropagation(); openPlayerStatsModal(piece.id); });

    var avatar = buildAvatarBox(piece, "icones");

    var info = document.createElement("div");
    info.className = "roster-info";
    var name = document.createElement("div");
    name.className = "roster-name";
    name.textContent = piece.number + ". " + piece.name;
    var pos = document.createElement("div");
    pos.className = "roster-pos";
    pos.textContent = GAME_DATA.POSITIONS[piece.position].label + " · " + piece.temperament;
    var manaTrack = document.createElement("div");
    manaTrack.className = "mini-mana";
    var manaFill = document.createElement("div");
    manaFill.className = "mini-mana-fill";
    manaFill.style.width = Math.round((piece.mana / piece.maxMana) * 100) + "%";
    manaTrack.appendChild(manaFill);

    info.appendChild(name);
    info.appendChild(pos);
    info.appendChild(manaTrack);
    card.appendChild(avatar);
    card.appendChild(info);

    if (state.ball.carrierId === piece.id) {
      var ballIcon = document.createElement("span");
      ballIcon.className = "roster-ball-icon";
      ballIcon.textContent = "⚽";
      card.appendChild(ballIcon);
    }
    return card;
  }

  function renderRosters(state) {
    els.rosterList.innerHTML = "";
    state.pieces.forEach(function (p) {
      if (p.team !== state.humanTeamId) return;
      els.rosterList.appendChild(buildRosterCard(p, state));
    });
  }

  // flag emoji -> código ISO2, pra buscar uma imagem de bandeira de verdade
  // (o emoji de bandeira não renderiza no Windows, aparece como duas letras soltas)
  function flagToIso2(flagEmoji) {
    if (!flagEmoji) return null;
    var chars = Array.from(flagEmoji);
    if (chars.length < 2) return null;
    var a = chars[0].codePointAt(0) - 0x1F1E6, b = chars[1].codePointAt(0) - 0x1F1E6;
    if (a < 0 || a > 25 || b < 0 || b > 25) return null;
    return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
  }

  function flagHtml(piece) {
    var iso2 = flagToIso2(piece.flag);
    if (!iso2) return '<span class="detail-flag">' + piece.flag + '</span>';
    return '<img class="detail-flag-img" src="https://flagcdn.com/w40/' + iso2 + '.png" alt="' + piece.nationality +
      '" onerror="this.outerHTML=\'<span class=&quot;detail-flag&quot;>' + piece.flag + '</span>\'">';
  }

  function buildPlayerStatsHtml(piece) {
    var pos = GAME_DATA.POSITIONS[piece.position];
    var grad = teamGradient(piece.team);
    var moveLabel = piece.position === "GK"
      ? "Rei (1 casa, em qualquer direção)"
      : (GAME_DATA.TEMPERAMENTS[piece.temperament] ? GAME_DATA.TEMPERAMENTS[piece.temperament].moveLabel : "—");

    var statOrder = ["velocidade", "chute", "tecnica", "defesa", "espirito"];
    var statsHtml = statOrder.map(function (k) {
      var val = piece.stats[k];
      return '<div class="stat-row"><span class="stat-label">' + GAME_DATA.STATS[k] + '</span>' +
        '<div class="stat-track"><div class="stat-fill" style="width:' + val + '%; background:' + grad + '"></div></div>' +
        '<span class="stat-value">' + val + '</span></div>';
    }).join("");
    var manaPct = Math.round((piece.mana / piece.maxMana) * 100);

    return '<div class="detail-hero-wrap">' +
      '<div class="detail-hero" id="detail-hero-bg" style="background-image:' + grad + '">' +
      '<div class="avatar-box" id="detail-hero-avatar"></div>' +
      '</div>' +
      '<span class="detail-jersey-number">' + piece.number + '</span>' +
      '</div>' +
      '<div class="detail-main">' +
      '<div class="detail-name-row"><span class="detail-name">' + piece.name + '</span>' + flagHtml(piece) + '</div>' +
      '<div class="detail-meta">' +
      '<span class="tag tag-pos" style="background:' + grad + '">' + pos.label + '</span>' +
      '<span class="tag">' + piece.temperament + '</span>' +
      '<span class="tag">' + piece.nationality + '</span>' +
      '</div>' +
      '<div class="detail-body">' +
      '<div class="stat-list">' + statsHtml +
      '<div class="detail-move-label">Movimento: <strong>' + moveLabel + '</strong></div>' +
      '</div>' +
      '<div class="power-box">' +
      '<div class="power-name">✨ ' + piece.power.name + '</div>' +
      '<div class="power-desc">' + piece.power.desc + '</div>' +
      '<div class="power-meta"><span>Custo: ' + piece.power.manaCost + ' mana</span><span>Bônus: +' + piece.power.bonus + '</span></div>' +
      '<div class="mana-track"><div class="mana-fill" style="width:' + manaPct + '%"></div></div>' +
      '</div></div>' +
      (piece.quote ? '<p class="detail-quote">"' + piece.quote + '"</p>' : '') +
      '</div>';
  }

  function fillPlayerStatsInto(container, piece) {
    container.innerHTML = buildPlayerStatsHtml(piece);

    var heroAvatarEl = container.querySelector("#detail-hero-avatar");
    if (heroAvatarEl) fillAvatarEl(heroAvatarEl, piece, "icones");

    var heroBgEl = container.querySelector("#detail-hero-bg");
    if (heroBgEl) {
      var url = "splashs_art/" + piece.assetPrefix + "_" + piece.assetKey + ".png";
      var testImg = new Image();
      testImg.onload = function () { heroBgEl.style.backgroundImage = "url('" + url + "')"; };
      testImg.src = url;
    }
  }

  function openPlayerStatsModal(pieceId) {
    var piece = GAME.findPieceById(pieceId);
    if (!piece) return;
    inspectedId = pieceId;
    fillPlayerStatsInto(els.playerStatsBody, piece);
    els.playerStatsModal.classList.remove("hidden");
  }

  function renderPlayerDetailPanel(state) {
    var id = state.selectedPieceId || inspectedId;
    var piece = id ? GAME.findPieceById(id) : null;
    if (!piece) {
      els.playerDetailPanel.innerHTML = '<p class="detail-empty">Selecione um jogador no time ou no campo pra ver a ficha completa.</p>';
      return;
    }
    fillPlayerStatsInto(els.playerDetailPanel, piece);
  }

  function closePlayerStatsModal() {
    els.playerStatsModal.classList.add("hidden");
  }

  /* ---------------- modal de duelo ---------------- */

  function renderDuelModal(state) {
    var ctx = state.duelContext;
    if (!ctx || state.phase !== "duel") { els.duelModal.classList.add("hidden"); return; }
    els.duelModal.classList.remove("hidden");

    var labels = DUEL.roleLabels(ctx.isShoot, ctx.isDribble);
    els.duelTitle.textContent = ctx.isShoot ? "🔥 CHANCE DE GOL!" : "⚔️ DUELO NO CAMPO!";

    fillDuelSide("left", ctx.challenger, labels.challenger, ctx, "challenger");
    fillDuelSide("right", ctx.holder, labels.holder, ctx, "holder");

    if (ctx.revealed) {
      els.duelResult.textContent = buildResultText(ctx);
      els.duelContinueBtn.classList.remove("hidden");
    } else {
      els.duelResult.textContent = "";
      els.duelContinueBtn.classList.add("hidden");
    }
  }

  function buildDuelInfoIcon(piece) {
    var wrap = document.createElement("span");
    wrap.className = "duel-info-wrap";
    var icon = document.createElement("span");
    icon.className = "duel-info-icon";
    icon.textContent = "i";
    var tooltip = document.createElement("div");
    tooltip.className = "duel-info-tooltip";
    var statOrder = ["velocidade", "chute", "tecnica", "defesa", "espirito"];
    tooltip.innerHTML = statOrder.map(function (k) {
      return '<div class="duel-info-stat"><span>' + GAME_DATA.STATS[k] + '</span><strong>' + piece.stats[k] + '</strong></div>';
    }).join("");
    wrap.appendChild(icon);
    wrap.appendChild(tooltip);
    return wrap;
  }

  function fillDuelSide(sideKey, piece, roleLabel, ctx, side) {
    var avatarEl = sideKey === "left" ? els.duelLeftAvatar : els.duelRightAvatar;
    var nameEl = sideKey === "left" ? els.duelLeftName : els.duelRightName;
    var roleEl = sideKey === "left" ? els.duelLeftRole : els.duelRightRole;
    var scoreEl = sideKey === "left" ? els.duelLeftScore : els.duelRightScore;
    var actionsEl = sideKey === "left" ? els.duelLeftActions : els.duelRightActions;

    fillAvatarEl(avatarEl, piece, "splashs_art");
    nameEl.textContent = piece.name;
    nameEl.appendChild(buildDuelInfoIcon(piece));
    roleEl.textContent = roleLabel;

    var controller = side === "challenger" ? ctx.challengerController : ctx.holderController;
    var choice = side === "challenger" ? ctx.challengerChoice : ctx.holderChoice;

    actionsEl.innerHTML = "";
    scoreEl.classList.remove("revealed", "winner", "loser");

    var existingDist = roleEl.parentNode.querySelector(".duel-distance");
    if (existingDist) existingDist.remove();
    if (side === "challenger" && ctx.isShoot && ctx.distancePenalty > 0) {
      var diff = difficultyFromPenalty(ctx.distancePenalty);
      var distEl = document.createElement("div");
      distEl.className = "duel-distance";
      var distTxt = "Chute de longe — dificuldade " + diff.label + " (−" + ctx.distancePenalty + ")";
      if (ctx.shootBlockerCount > 0) distTxt += " · " + ctx.shootBlockerCount + " marcador" + (ctx.shootBlockerCount > 1 ? "es" : "") + " na frente";
      distEl.textContent = distTxt;
      roleEl.parentNode.insertBefore(distEl, roleEl.nextSibling);
    }

    if (ctx.revealed) {
      var score = side === "challenger" ? ctx.result.challengerScore : ctx.result.holderScore;
      scoreEl.textContent = score;
      scoreEl.classList.add("revealed");
      var won = ctx.result.winnerSide === side;
      scoreEl.classList.add(won ? "winner" : "loser");

      var choiceLabel = document.createElement("div");
      choiceLabel.className = "duel-choice-label" + (choice === "poder" ? " is-poder" : "");
      choiceLabel.textContent = choice === "poder" ? ("✨ " + piece.power.name) : "⚔️ Ação Básica";
      actionsEl.appendChild(choiceLabel);
      return;
    }

    scoreEl.textContent = "—";

    if (controller === "human" && !choice) {
      var btnAcao = document.createElement("button");
      btnAcao.className = "duel-btn btn-acao";
      btnAcao.innerHTML = "⚔️ Ação Básica<small>Sem custo de mana</small>";
      btnAcao.addEventListener("click", function () { GAME.chooseDuelAction(side, "acao"); });

      var btnPoder = document.createElement("button");
      var canAfford = DUEL.canUsePower(piece);
      btnPoder.className = "duel-btn btn-poder";
      btnPoder.innerHTML = "✨ " + piece.power.name + "<small>Custo: " + piece.power.manaCost + " mana</small>";
      btnPoder.disabled = !canAfford;
      btnPoder.addEventListener("click", function () { GAME.chooseDuelAction(side, "poder"); });

      actionsEl.appendChild(btnAcao);
      actionsEl.appendChild(btnPoder);
    } else if (controller === "human" && choice) {
      var chosen = document.createElement("div");
      chosen.className = "duel-choice-label" + (choice === "poder" ? " is-poder" : "");
      chosen.textContent = "Escolhido: " + (choice === "poder" ? ("✨ " + piece.power.name) : "⚔️ Ação Básica");
      actionsEl.appendChild(chosen);
    } else {
      var thinking = document.createElement("div");
      thinking.className = "duel-thinking";
      thinking.textContent = "🤔 Pensando...";
      actionsEl.appendChild(thinking);
    }
  }

  function buildResultText(ctx) {
    var winnerPiece = ctx.result.winnerSide === "challenger" ? ctx.challenger : ctx.holder;
    if (ctx.isShoot) {
      return ctx.result.winnerSide === "challenger"
        ? "⚽ GOL!!! " + winnerPiece.name + " balança a rede!"
        : "🧤 DEFESA! " + winnerPiece.name + " salva o time!";
    }
    return "🏆 " + winnerPiece.name + " vence o duelo!";
  }

  /* ---------------- banner de gol / fim de jogo ---------------- */

  function showGoalBanner(scorerPiece, teamId) {
    var state = GAME.getState();
    els.goalScorer.textContent = scorerPiece.name + " — " + state.teams[teamId].name;
    els.goalBanner.classList.remove("hidden");
    var inner = els.goalBanner.querySelector(".goal-banner-inner");
    inner.style.animation = "none";
    void inner.offsetWidth;
    inner.style.animation = "";
    setTimeout(function () { els.goalBanner.classList.add("hidden"); }, 1650);
  }

  function showHalftimeBanner() {
    els.halftimeBanner.classList.remove("hidden");
    var inner = els.halftimeBanner.querySelector(".halftime-banner-inner");
    inner.style.animation = "none";
    void inner.offsetWidth;
    inner.style.animation = "";
    setTimeout(function () { els.halftimeBanner.classList.add("hidden"); }, 1850);
  }

  function showGameOver(state) {
    els.gameoverModal.classList.remove("hidden");
    var cpuTeamId = state.humanTeamId === "A" ? "B" : "A";
    var humanScore = state.score[state.humanTeamId];
    var cpuScore = state.score[cpuTeamId];
    var result = humanScore > cpuScore ? "win" : (humanScore < cpuScore ? "lose" : "draw");
    var color = result === "win" ? "var(--success)" : (result === "lose" ? "var(--danger)" : "var(--gold)");

    els.gameoverKicker.textContent = "FIM DE JOGO";
    els.gameoverTitle.textContent = result === "win" ? "VITÓRIA" : (result === "lose" ? "DERROTA" : "EMPATE");
    els.gameoverTitle.style.background = "none";
    els.gameoverTitle.style.webkitTextFillColor = color;
    els.gameoverTitle.style.color = color;
    els.gameoverScore.textContent = state.score.A + " — " + state.score.B;
    els.gameoverSub.textContent = result === "win"
      ? "Você dominou o campo do início ao fim!"
      : (result === "lose" ? "O adversário levou a melhor desta vez. Revanche?" : "Um empate emocionante até o apito final!");
  }

  /* ---------------- eventos estáticos ---------------- */

  function wireStaticEvents() {
    els.pickA.addEventListener("click", function () {
      chosenHumanTeam = "A";
      els.pickA.classList.add("active");
      els.pickB.classList.remove("active");
    });
    els.pickB.addEventListener("click", function () {
      chosenHumanTeam = "B";
      els.pickB.classList.add("active");
      els.pickA.classList.remove("active");
    });
    els.pickA.classList.add("active");

    els.howToPlayBtn.addEventListener("click", function () {
      els.howToPlay.classList.toggle("hidden");
    });

    els.noTurnLimitCheckbox.addEventListener("change", function () {
      els.turnLimitInput.disabled = els.noTurnLimitCheckbox.checked;
    });

    els.startBtn.addEventListener("click", function () {
      chosenNoTurnLimit = els.noTurnLimitCheckbox.checked;
      chosenMaxTurns = Math.max(4, parseInt(els.turnLimitInput.value, 10) || 40);
      els.startScreen.classList.add("hidden");
      beginPreGameFlow();
    });

    els.menuBtn.addEventListener("click", function () {
      if (window.confirm("Voltar ao menu inicial? O progresso da partida atual será perdido.")) {
        els.gameRoot.classList.add("hidden");
        els.duelModal.classList.add("hidden");
        els.gameoverModal.classList.add("hidden");
        els.startScreen.classList.remove("hidden");
      }
    });

    els.playerStatsClose.addEventListener("click", closePlayerStatsModal);
    els.playerStatsModal.addEventListener("click", function (e) {
      if (e.target === els.playerStatsModal) closePlayerStatsModal();
    });

    els.duelContinueBtn.addEventListener("click", function () { GAME.continueAfterDuel(); });

    els.rematchBtn.addEventListener("click", function () {
      els.gameoverModal.classList.add("hidden");
      chosenHumanTeam = GAME.getState().humanTeamId;
      formationOverrides = null;
      beginPreGameFlow();
    });

    els.lineupAskYes.addEventListener("click", function () {
      els.lineupAskModal.classList.add("hidden");
      openLineupEditor();
    });
    els.lineupAskNo.addEventListener("click", function () {
      els.lineupAskModal.classList.add("hidden");
      formationOverrides = null;
      openCoinFlip();
    });
    els.lineupResetBtn.addEventListener("click", function () {
      lineupWorking = buildDefaultLineup(chosenHumanTeam);
      lineupSelectedId = null;
      renderLineupEditor();
    });
    els.lineupConfirmBtn.addEventListener("click", function () {
      formationOverrides = {};
      lineupWorking.forEach(function (p) { formationOverrides[p.id] = { row: p.row, col: p.col }; });
      els.lineupEditorModal.classList.add("hidden");
      openCoinFlip();
    });
    els.coinflipContinueBtn.addEventListener("click", function () {
      els.coinflipModal.classList.add("hidden");
      launchMatch();
    });
  }

  /* ---------------- pré-jogo: escalação e cara-ou-coroa ---------------- */

  function beginPreGameFlow() {
    var teamName = chosenHumanTeam === "A" ? GAME_DATA.TEAMS[0].name : GAME_DATA.TEAMS[1].name;
    els.lineupAskText.textContent = "Quer ajustar as posições iniciais do " + teamName + " em campo?";
    els.lineupAskModal.classList.remove("hidden");
  }

  function buildDefaultLineup(teamId) {
    var teamData = null;
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === teamId) teamData = GAME_DATA.TEAMS[i];
    return teamData.players.map(function (p) {
      return {
        id: p.id, number: p.number, name: p.name, position: p.position, temperament: p.temperament,
        flag: p.flag, nationality: p.nationality, stats: p.stats, power: p.power, quote: p.quote,
        assetPrefix: teamData.assetPrefix, assetKey: p.assetKey, team: teamId,
        row: p.start.row, col: p.start.col
      };
    });
  }

  function lineupColRange() {
    return chosenHumanTeam === "A" ? { min: 0, max: 5 } : { min: 7, max: 12 };
  }

  function openLineupEditor() {
    lineupWorking = buildDefaultLineup(chosenHumanTeam);
    lineupSelectedId = null;
    var teamName = chosenHumanTeam === "A" ? GAME_DATA.TEAMS[0].name : GAME_DATA.TEAMS[1].name;
    els.lineupEditorTitle.textContent = "Monte o " + teamName;
    renderLineupEditor();
    els.lineupEditorModal.classList.remove("hidden");
  }

  function onLineupCellClick(row, col) {
    var occupant = lineupWorking.find(function (p) { return p.row === row && p.col === col; });
    if (lineupSelectedId) {
      if (occupant && occupant.id === lineupSelectedId) {
        lineupSelectedId = null;
        renderLineupEditor();
        return;
      }
      var selected = lineupWorking.find(function (p) { return p.id === lineupSelectedId; });
      if (occupant) {
        var tr = selected.row, tc = selected.col;
        selected.row = occupant.row; selected.col = occupant.col;
        occupant.row = tr; occupant.col = tc;
      } else {
        selected.row = row; selected.col = col;
      }
      lineupSelectedId = null;
      renderLineupEditor();
    } else if (occupant) {
      lineupSelectedId = occupant.id;
      renderLineupEditor();
    }
  }

  function buildLineupToken(p) {
    var token = document.createElement("div");
    token.className = "lineup-token";
    token.title = p.name;
    var avatar = buildAvatarBox(p, "icones");
    token.appendChild(avatar);
    var num = document.createElement("span");
    num.className = "lineup-token-number";
    num.textContent = p.number;
    token.appendChild(num);
    return token;
  }

  function buildLineupFieldMarkings(range, cols) {
    var frag = document.createDocumentFragment();
    var isLeftGoal = range.min === 0;
    var topPct = (BOARD.GOAL_ROWS[0] / BOARD.ROWS) * 100;
    var heightPct = (BOARD.GOAL_ROWS.length / BOARD.ROWS) * 100;
    var boxWidthPct = (2 / cols) * 100;
    var sideClass = isLeftGoal ? "side-left" : "side-right";

    var goalbox = document.createElement("div");
    goalbox.className = "lineup-goalbox " + sideClass;
    goalbox.style.top = topPct + "%";
    goalbox.style.height = heightPct + "%";
    goalbox.style.width = boxWidthPct + "%";
    var goalboxLabel = document.createElement("span");
    goalboxLabel.className = "lineup-field-label";
    goalboxLabel.textContent = "ÁREA";
    goalbox.appendChild(goalboxLabel);
    frag.appendChild(goalbox);

    var goalline = document.createElement("div");
    goalline.className = "lineup-goalline " + sideClass;
    frag.appendChild(goalline);

    var midline = document.createElement("div");
    midline.className = "lineup-midline " + (isLeftGoal ? "side-right" : "side-left");
    var midlineLabel = document.createElement("span");
    midlineLabel.className = "lineup-field-label";
    midlineLabel.textContent = "MEIO-CAMPO";
    midline.appendChild(midlineLabel);
    frag.appendChild(midline);

    return frag;
  }

  function renderLineupEditor() {
    var range = lineupColRange();
    var cols = range.max - range.min + 1;
    els.lineupGrid.innerHTML = "";
    els.lineupGrid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    els.lineupGrid.style.gridTemplateRows = "repeat(" + BOARD.ROWS + ", 1fr)";
    els.lineupGrid.appendChild(buildLineupFieldMarkings(range, cols));

    for (var r = 0; r < BOARD.ROWS; r++) {
      for (var c = range.min; c <= range.max; c++) {
        (function (row, col) {
          var cell = document.createElement("div");
          cell.className = "lineup-cell";
          var occupant = lineupWorking.find(function (p) { return p.row === row && p.col === col; });
          if (occupant) {
            cell.appendChild(buildLineupToken(occupant));
            if (lineupSelectedId === occupant.id) cell.classList.add("lineup-cell-selected");
          }
          cell.addEventListener("click", function () { onLineupCellClick(row, col); });
          els.lineupGrid.appendChild(cell);
        })(r, c);
      }
    }
    renderLineupDetail();
  }

  function renderLineupDetail() {
    var p = lineupWorking ? lineupWorking.find(function (x) { return x.id === lineupSelectedId; }) : null;
    if (!p) {
      els.lineupDetail.innerHTML = '<p class="detail-empty">Toque num jogador para ver os detalhes.</p>';
      return;
    }
    var grad = teamGradient(p.team);
    var pos = GAME_DATA.POSITIONS[p.position];
    var moveLabel = p.position === "GK" ? "Rei (1 casa, em qualquer direção)" : (GAME_DATA.TEMPERAMENTS[p.temperament] ? GAME_DATA.TEMPERAMENTS[p.temperament].moveLabel : "—");
    var statOrder = ["velocidade", "chute", "tecnica", "defesa", "espirito"];
    var statsHtml = statOrder.map(function (k) {
      var val = p.stats[k];
      return '<div class="stat-row"><span class="stat-label">' + GAME_DATA.STATS[k] + '</span>' +
        '<div class="stat-track"><div class="stat-fill" style="width:' + val + '%; background:' + grad + '"></div></div>' +
        '<span class="stat-value">' + val + '</span></div>';
    }).join("");

    els.lineupDetail.innerHTML =
      '<div class="lineup-detail-head"><div class="avatar-box" id="lineup-detail-avatar"></div><div>' +
      '<div class="lineup-detail-name">' + p.number + '. ' + p.name + ' ' + p.flag + '</div>' +
      '<div class="lineup-detail-pos">' + pos.label + ' · ' + p.temperament + '</div>' +
      '</div></div>' +
      '<div class="stat-list">' + statsHtml + '<div class="detail-move-label">Movimento: <strong>' + moveLabel + '</strong></div></div>' +
      '<div class="power-box"><div class="power-name">✨ ' + p.power.name + '</div><div class="power-desc">' + p.power.desc + '</div></div>';

    var avatarEl = els.lineupDetail.querySelector("#lineup-detail-avatar");
    if (avatarEl) fillAvatarEl(avatarEl, p, "icones");
  }

  function openCoinFlip() {
    els.coinflipModal.classList.remove("hidden");
    els.coinflipResult.textContent = "Girando a moeda...";
    els.coinflipContinueBtn.classList.add("hidden");
    coinWinnerTeamId = Math.random() < 0.5 ? "A" : "B";
    playCoinFlip(coinWinnerTeamId);
  }

  function playCoinFlip(winnerId) {
    var coin = els.coin;
    coin.style.transition = "none";
    coin.style.transform = "rotateY(0deg)";
    void coin.offsetWidth;
    var finalDeg = 5 * 360 + (winnerId === "A" ? 0 : 180);
    requestAnimationFrame(function () {
      coin.style.transition = "transform 1.8s cubic-bezier(.2,.7,.2,1)";
      coin.style.transform = "rotateY(" + finalDeg + "deg)";
    });
    setTimeout(function () {
      var winnerData = winnerId === "A" ? GAME_DATA.TEAMS[0] : GAME_DATA.TEAMS[1];
      els.coinflipResult.innerHTML = "<strong>" + winnerData.name + "</strong> venceu o sorteio e começa com a bola!";
      els.coinflipContinueBtn.classList.remove("hidden");
    }, 1850);
  }

  function launchMatch() {
    inspectedId = null;
    tokenEls = {};
    lastPositions = {};
    if (els.piecesLayer) els.piecesLayer.innerHTML = "";
    els.gameRoot.classList.remove("hidden");
    GAME.start(chosenHumanTeam, formationOverrides, coinWinnerTeamId, chosenMaxTurns, chosenNoTurnLimit);
  }

  function init() {
    cacheEls();
    buildBoardCells();
    wireStaticEvents();
  }

  return {
    init: init,
    render: render,
    showGoalBanner: showGoalBanner,
    showHalftimeBanner: showHalftimeBanner,
    showGameOver: showGameOver,
    flashPiece: flashPiece
  };

})();
