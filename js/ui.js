/* =========================================================
   XEQUE TOTAL — renderização e interações de interface
========================================================= */

var UI = (function () {

  var els = {};
  var inspectedId = null;
  var chosenHomeSquadId = null;
  var chosenAwaySquadId = null;
  var chosenMaxTurns = 40;
  var chosenNoTurnLimit = false;
  var rosterViewAway = false; // alternador da escalação: false = seu time, true = adversário

  var tokenEls = {};
  var lastPositions = {};
  var lastBallPos = null;
  var hoverArrowEl = null;
  var PITCH_TILT_DEG = 14; // precisa bater com o rotateX de #pitch no style.css
  var PITCH_UPRIGHT = PITCH_TILT_DEG ? (" rotateX(-" + PITCH_TILT_DEG + "deg)") : ""; // "de-tilta" peças/bola pra ficarem em pé

  var lineupWorking = null;
  var lineupSelectedId = null;
  var formationOverrides = null;
  var coinWinnerTeamId = null;

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ícones do duelo — SVG em vez de emoji (consistência visual entre plataformas)
  var DUEL_ICONS = {
    sword: '<svg class="duel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="14,4 19,4 19,9"/><line x1="19" y1="19" x2="5" y2="5"/><polyline points="10,4 5,4 5,9"/></svg>',
    bolt: '<svg class="duel-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z"/></svg>',
    target: '<svg class="duel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>',
    dots: '<svg class="duel-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="20" cy="12" r="3"/></svg>',
    trophy: '<svg class="duel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/><path d="M18 6h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/><line x1="12" y1="15" x2="12" y2="19"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/></svg>',
    shieldCheck: '<svg class="duel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L20 6 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V6 Z"/><polyline points="8.5,12 11,14.5 16,9"/></svg>',
    ball: '<svg class="duel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><polygon points="12,6 16,9 14.5,14 9.5,14 8,9" fill="currentColor" stroke="none"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="16" y1="9" x2="19" y2="7"/><line x1="8" y1="9" x2="5" y2="7"/><line x1="14.5" y1="14" x2="16" y2="18"/><line x1="9.5" y1="14" x2="8" y2="18"/></svg>'
  };
  function icon(name) { return DUEL_ICONS[name] || ""; }

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    var ids = [
      "start-screen", "squad-pick-list", "squad-pick-hint", "turn-limit-input", "no-turn-limit-checkbox", "start-btn", "how-to-play-btn", "how-to-play",
      "game-root", "theme-toggle-btn", "theme-toggle-btn-start",
      "tv-scoreboard", "tv-team-a", "tv-badge-a", "tv-abbr-a", "tv-you-a", "tv-scorebox-a",
      "tv-team-b", "tv-badge-b", "tv-abbr-b", "tv-you-b", "tv-scorebox-b",
      "tv-score-a", "tv-score-b", "score-clock", "score-turn", "menu-btn",
      "roster-toggle-own", "roster-toggle-away", "roster-list", "player-detail-panel",
      "board", "pitch",
      "player-stats-modal", "player-stats-body", "player-stats-close",
      "duel-modal", "duel-title", "duel-left", "duel-left-avatar", "duel-left-name", "duel-left-role", "duel-left-mana-fill", "duel-left-score", "duel-left-actions",
      "duel-right", "duel-right-avatar", "duel-right-name", "duel-right-role", "duel-right-mana-fill", "duel-right-score", "duel-right-actions",
      "duel-result", "duel-continue-btn",
      "goal-banner", "goal-word", "goal-scorer", "goal-scorer-portrait", "halftime-banner",
      "gameover-modal", "gameover-kicker", "gameover-title", "gameover-score", "gameover-sub", "rematch-btn",
      "lineup-ask-modal", "lineup-ask-text", "lineup-ask-yes", "lineup-ask-no",
      "lineup-editor-modal", "lineup-editor-title", "lineup-grid", "lineup-detail", "lineup-reset-btn", "lineup-confirm-btn",
      "coinflip-modal", "coin", "coin-face-a", "coin-face-b", "coinflip-result", "coinflip-continue-btn"
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

  // slot "A"/"B" -> squad escolhido pro lado (funciona antes e durante a partida)
  function squadForSlot(slot) {
    var id = slot === "A" ? chosenHomeSquadId : chosenAwaySquadId;
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === id) return GAME_DATA.TEAMS[i];
    return GAME_DATA.TEAMS[0];
  }

  // escudo do squad: se for bandeira de país, renderiza como imagem (flagcdn) — no Windows
  // o emoji de bandeira regional vira só o código de 2 letras (ex.: "BR"), então não dá pra confiar no emoji puro.
  function fillSquadBadgeEl(el, sq) {
    el.innerHTML = "";
    var iso2 = flagToIso2(sq.badge);
    if (iso2) {
      var img = document.createElement("img");
      img.className = "badge-flag-img";
      img.src = "https://flagcdn.com/w80/" + iso2 + ".png";
      img.alt = sq.name;
      img.onerror = function () { el.textContent = sq.badge; };
      el.appendChild(img);
    } else {
      el.textContent = sq.badge;
    }
  }

  function applySlotColors() {
    var home = squadForSlot("A"), away = squadForSlot("B");
    var root = document.documentElement.style;
    root.setProperty("--slot-a", "var(--" + home.colorVar + ")");
    root.setProperty("--slot-a-2", "var(--" + home.colorVar + "-2)");
    root.setProperty("--slot-b", "var(--" + away.colorVar + ")");
    root.setProperty("--slot-b-2", "var(--" + away.colorVar + "-2)");
  }

  // lista única: 1º clique define seu time, 2º define o adversário (não repete time).
  // com os dois já definidos, o próximo clique reinicia o ciclo a partir do time clicado.
  function pickSquad(id) {
    if (chosenHomeSquadId !== null && chosenAwaySquadId !== null) {
      chosenHomeSquadId = id;
      chosenAwaySquadId = null;
    } else if (chosenHomeSquadId === null) {
      chosenHomeSquadId = id;
    } else if (id === chosenHomeSquadId) {
      return; // não pode escolher o mesmo time duas vezes
    } else {
      chosenAwaySquadId = id;
    }
    renderSquadPickList();
    applySlotColors();
  }

  function renderSquadPickList() {
    if (els.squadPickHint) {
      if (chosenHomeSquadId === null) els.squadPickHint.textContent = "Toque num time pra ser o seu";
      else if (chosenAwaySquadId === null) els.squadPickHint.textContent = "Agora toque no time do adversário";
      else els.squadPickHint.textContent = "Tudo pronto — toque em outro time pra trocar";
    }
    if (els.startBtn) els.startBtn.disabled = !(chosenHomeSquadId && chosenAwaySquadId);

    if (!els.squadPickList) return;
    els.squadPickList.innerHTML = "";
    GAME_DATA.TEAMS.forEach(function (sq) {
      var role = sq.id === chosenHomeSquadId ? "is-home" : (sq.id === chosenAwaySquadId ? "is-away" : "");
      var card = document.createElement("button");
      card.type = "button";
      card.className = "team-pick-card" + (role ? " " + role : "");
      if (role) {
        var tag = document.createElement("span");
        tag.className = "team-pick-role-tag";
        tag.textContent = role === "is-home" ? "SEU TIME" : "ADVERSÁRIO";
        card.appendChild(tag);
      }
      var badge = document.createElement("span");
      badge.className = "team-pick-badge " + sq.colorVar + "-badge";
      fillSquadBadgeEl(badge, sq);
      var name = document.createElement("span");
      name.className = "team-pick-name";
      name.textContent = sq.name;
      var sub = document.createElement("span");
      sub.className = "team-pick-sub";
      sub.textContent = sq.kit;
      card.appendChild(badge); card.appendChild(name); card.appendChild(sub);
      card.addEventListener("click", function () { pickSquad(sq.id); });
      els.squadPickList.appendChild(card);
    });
  }

  function teamColorVar(teamId) {
    var state = GAME.getState();
    if (state && state.teams[teamId]) return state.teams[teamId].colorVar;
    return squadForSlot(teamId).colorVar;
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
    if (lastBallPos && (lastBallPos.row !== row || lastBallPos.col !== col)) {
      var flightMs = BOARD.ballFlightMs(lastBallPos.row, lastBallPos.col, row, col);
      els.ballEl.style.transitionDuration = flightMs + "ms";
    }
    lastBallPos = { row: row, col: col };
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

  // placar estilo transmissão de TV — uma barra só, sigla+bandeira de cada
  // lado, placar central (a casa de quem tem a vez acende) e o relógio
  // encostado no canto, tudo numa linha só (não empilhado, pra não estourar
  // a altura reservada pro campo)
  function renderScoreboard(state) {
    if (els.tvAbbrA) els.tvAbbrA.textContent = state.teams.A.shortName;
    if (els.tvAbbrB) els.tvAbbrB.textContent = state.teams.B.shortName;
    if (els.tvBadgeA) fillSquadBadgeEl(els.tvBadgeA, state.teams.A);
    if (els.tvBadgeB) fillSquadBadgeEl(els.tvBadgeB, state.teams.B);
    if (els.tvScoreA) els.tvScoreA.textContent = state.score.A;
    if (els.tvScoreB) els.tvScoreB.textContent = state.score.B;
    if (els.tvYouA) els.tvYouA.classList.toggle("hidden", state.humanTeamId !== "A");
    if (els.tvYouB) els.tvYouB.classList.toggle("hidden", state.humanTeamId !== "B");
    var aTurn = state.currentTeamId === "A" && state.phase !== "gameover";
    var bTurn = state.currentTeamId === "B" && state.phase !== "gameover";
    if (els.tvTeamA) els.tvTeamA.classList.toggle("active-turn", aTurn);
    if (els.tvTeamB) els.tvTeamB.classList.toggle("active-turn", bTurn);
    if (els.tvScoreboxA) els.tvScoreboxA.classList.toggle("active-turn", aTurn);
    if (els.tvScoreboxB) els.tvScoreboxB.classList.toggle("active-turn", bTurn);

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

  // emojis subindo no local do choque, antes do modal de duelo abrir (ver
  // DUEL_INTRO_MS em js/game.js). Vai direto em #pitch (não em .trail-layer,
  // que tem z-index abaixo das peças) pra ficar por cima de tudo. Usa um
  // wrapper estático (posição + "de-tilt" da perspectiva 3D, igual peça/bola)
  // por fora e o span animado por dentro — senão a animação CSS (que também
  // mexe em transform) vence e apaga o de-tilt aplicado por JS no mesmo elemento
  var DUEL_START_EMOJIS = ["⚔️", "💥", "🔥"];
  function flashDuelStart(row, col) {
    if (!els.pitch) return;
    var center = cellCenterPct(row, col);
    DUEL_START_EMOJIS.forEach(function (emoji, i) {
      var wrap = document.createElement("div");
      wrap.className = "duel-start-fx-wrap";
      wrap.style.left = center.x + "%";
      wrap.style.top = center.y + "%";
      wrap.style.transform = "translate(-50%, -50%)" + PITCH_UPRIGHT;
      var el = document.createElement("span");
      el.className = "duel-start-fx";
      el.textContent = emoji;
      el.style.setProperty("--dx", ((i - 1) * 16) + "px");
      el.style.animationDelay = (i * 70) + "ms";
      wrap.appendChild(el);
      els.pitch.appendChild(wrap);
      setTimeout(function () { wrap.remove(); }, 950 + i * 70);
    });
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
    var viewTeamId = rosterViewAway ? (state.humanTeamId === "A" ? "B" : "A") : state.humanTeamId;
    if (els.rosterToggleOwn) els.rosterToggleOwn.classList.toggle("active", !rosterViewAway);
    if (els.rosterToggleAway) els.rosterToggleAway.classList.toggle("active", rosterViewAway);
    els.rosterList.innerHTML = "";
    state.pieces.forEach(function (p) {
      if (p.team !== viewTeamId) return;
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
    els.duelTitle.innerHTML = (ctx.isShoot ? icon("target") : icon("sword")) + (ctx.isShoot ? " CHANCE DE GOL!" : " DUELO NO CAMPO!");

    fillDuelSide("left", ctx.challenger, labels.challenger, ctx, "challenger");
    fillDuelSide("right", ctx.holder, labels.holder, ctx, "holder");

    if (ctx.revealed) {
      els.duelResult.innerHTML = buildResultText(ctx);
      els.duelContinueBtn.classList.remove("hidden");
    } else {
      els.duelResult.innerHTML = "";
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
    var manaFillEl = sideKey === "left" ? els.duelLeftManaFill : els.duelRightManaFill;
    var scoreEl = sideKey === "left" ? els.duelLeftScore : els.duelRightScore;
    var actionsEl = sideKey === "left" ? els.duelLeftActions : els.duelRightActions;
    var sideEl = sideKey === "left" ? els.duelLeft : els.duelRight;

    fillAvatarEl(avatarEl, piece, "splashs_art");
    nameEl.textContent = piece.name;
    nameEl.appendChild(buildDuelInfoIcon(piece));
    roleEl.textContent = roleLabel;
    if (manaFillEl) manaFillEl.style.width = Math.round((piece.mana / piece.maxMana) * 100) + "%";

    var controller = side === "challenger" ? ctx.challengerController : ctx.holderController;
    var choice = side === "challenger" ? ctx.challengerChoice : ctx.holderChoice;

    actionsEl.innerHTML = "";
    scoreEl.classList.remove("revealed", "winner", "loser");
    if (sideEl) sideEl.classList.remove("duel-winner", "duel-loser");

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
      if (sideEl) sideEl.classList.add(won ? "duel-winner" : "duel-loser");

      var choiceLabel = document.createElement("div");
      choiceLabel.className = "duel-choice-label" + (choice === "poder" ? " is-poder" : "");
      choiceLabel.innerHTML = choice === "poder" ? (icon("bolt") + " " + piece.power.name) : (icon("sword") + " Ação Básica");
      actionsEl.appendChild(choiceLabel);
      return;
    }

    scoreEl.textContent = "—";

    if (controller === "human" && !choice) {
      var btnAcao = document.createElement("button");
      btnAcao.className = "duel-btn btn-acao";
      btnAcao.innerHTML = icon("sword") + " Ação Básica<small>Sem custo de mana</small>";
      btnAcao.addEventListener("click", function () { GAME.chooseDuelAction(side, "acao"); });

      var btnPoder = document.createElement("button");
      var canAfford = DUEL.canUsePower(piece);
      btnPoder.className = "duel-btn btn-poder";
      btnPoder.innerHTML = icon("bolt") + " " + piece.power.name + "<small>Custo: " + piece.power.manaCost + " mana</small>";
      btnPoder.disabled = !canAfford;
      btnPoder.addEventListener("click", function () { GAME.chooseDuelAction(side, "poder"); });

      actionsEl.appendChild(btnAcao);
      actionsEl.appendChild(btnPoder);
    } else if (controller === "human" && choice) {
      var chosen = document.createElement("div");
      chosen.className = "duel-choice-label" + (choice === "poder" ? " is-poder" : "");
      chosen.innerHTML = "Escolhido: " + (choice === "poder" ? (icon("bolt") + " " + piece.power.name) : (icon("sword") + " Ação Básica"));
      actionsEl.appendChild(chosen);
    } else {
      var thinking = document.createElement("div");
      thinking.className = "duel-thinking";
      thinking.innerHTML = icon("dots") + " Pensando...";
      actionsEl.appendChild(thinking);
    }
  }

  function buildResultText(ctx) {
    var winnerPiece = ctx.result.winnerSide === "challenger" ? ctx.challenger : ctx.holder;
    if (ctx.isShoot) {
      return ctx.result.winnerSide === "challenger"
        ? icon("ball") + " GOL!!! " + winnerPiece.name + " balança a rede!"
        : icon("shieldCheck") + " DEFESA! " + winnerPiece.name + " salva o time!";
    }
    return icon("trophy") + " " + winnerPiece.name + " vence o duelo!";
  }

  /* ---------------- banner de gol / fim de jogo ---------------- */

  function buildStaggeredWord(el, word) {
    el.innerHTML = "";
    Array.prototype.forEach.call(word, function (ch, i) {
      var span = document.createElement("span");
      span.className = "goal-letter";
      span.style.setProperty("--i", i);
      span.textContent = ch === " " ? " " : ch;
      el.appendChild(span);
    });
  }

  function showGoalBanner(scorerPiece, teamId) {
    var state = GAME.getState();
    if (els.goalWord) buildStaggeredWord(els.goalWord, "GOOOOL!");
    els.goalScorer.textContent = scorerPiece.name + " — " + state.teams[teamId].name;
    if (els.goalScorerPortrait) fillAvatarEl(els.goalScorerPortrait, scorerPiece, "splashs_art");
    els.goalBanner.classList.remove("hidden");
    var inner = els.goalBanner.querySelector(".goal-banner-inner");
    inner.style.animation = "none";
    void inner.offsetWidth;
    inner.style.animation = "";
    setTimeout(function () { els.goalBanner.classList.add("hidden"); }, 2550);
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
    els.howToPlayBtn.addEventListener("click", function () {
      els.howToPlay.classList.toggle("hidden");
    });

    els.noTurnLimitCheckbox.addEventListener("change", function () {
      els.turnLimitInput.disabled = els.noTurnLimitCheckbox.checked;
    });

    els.startBtn.addEventListener("click", function () {
      if (!chosenHomeSquadId || !chosenAwaySquadId) return;
      chosenNoTurnLimit = els.noTurnLimitCheckbox.checked;
      chosenMaxTurns = Math.max(4, parseInt(els.turnLimitInput.value, 10) || 40);
      els.startScreen.classList.add("hidden");
      beginPreGameFlow();
    });

    if (els.rosterToggleOwn) els.rosterToggleOwn.addEventListener("click", function () {
      rosterViewAway = false;
      var state = GAME.getState();
      if (state) render(state);
    });
    if (els.rosterToggleAway) els.rosterToggleAway.addEventListener("click", function () {
      rosterViewAway = true;
      var state = GAME.getState();
      if (state) render(state);
    });

    if (els.themeToggleBtn) els.themeToggleBtn.addEventListener("change", toggleTheme);
    if (els.themeToggleBtnStart) els.themeToggleBtnStart.addEventListener("change", toggleTheme);

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
      lineupWorking = buildDefaultLineup(chosenHomeSquadId);
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
    var teamName = squadForSlot("A").name;
    els.lineupAskText.textContent = "Quer ajustar as posições iniciais do " + teamName + " em campo?";
    els.lineupAskModal.classList.remove("hidden");
  }

  // jogador sempre joga o squad escolhido (chosenHomeSquadId) no slot A
  function buildDefaultLineup(squadId) {
    var teamData = null;
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === squadId) teamData = GAME_DATA.TEAMS[i];
    return teamData.players.map(function (p) {
      return {
        id: p.id, number: p.number, name: p.name, position: p.position, temperament: p.temperament,
        flag: p.flag, nationality: p.nationality, stats: p.stats, power: p.power, quote: p.quote,
        assetPrefix: teamData.assetPrefix, assetKey: p.assetKey, team: "A",
        row: p.start.row, col: p.start.col
      };
    });
  }

  function lineupColRange() {
    return { min: 0, max: 5 }; // jogador sempre é o slot A agora
  }

  function openLineupEditor() {
    lineupWorking = buildDefaultLineup(chosenHomeSquadId);
    lineupSelectedId = null;
    var teamName = squadForSlot("A").name;
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
    if (els.coinFaceA) fillSquadBadgeEl(els.coinFaceA, squadForSlot("A"));
    if (els.coinFaceB) fillSquadBadgeEl(els.coinFaceB, squadForSlot("B"));
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
      var winnerData = squadForSlot(winnerId);
      els.coinflipResult.innerHTML = "<strong>" + winnerData.name + "</strong> venceu o sorteio e começa com a bola!";
      els.coinflipContinueBtn.classList.remove("hidden");
    }, 1850);
  }

  function launchMatch() {
    inspectedId = null;
    tokenEls = {};
    lastPositions = {};
    rosterViewAway = false;
    if (els.piecesLayer) els.piecesLayer.innerHTML = "";
    els.gameRoot.classList.remove("hidden");
    GAME.start(chosenHomeSquadId, chosenAwaySquadId, formationOverrides, coinWinnerTeamId, chosenMaxTurns, chosenNoTurnLimit);
  }

  /* ---------------- modo noturno ---------------- */

  var THEME_STORAGE_KEY = "xequeTotalTheme";

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (els.themeToggleBtn) els.themeToggleBtn.checked = theme === "dark";
    if (els.themeToggleBtnStart) els.themeToggleBtnStart.checked = theme === "dark";
  }

  // disparado pelo "change" de qualquer um dos dois switches (jogo / tela inicial) —
  // lê o checkbox que disparou o evento pra saber pra qual lado foi, e sincroniza o outro
  function toggleTheme(ev) {
    var source = (ev && ev.target) || els.themeToggleBtn;
    var next = source && source.checked ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (e) { /* modo privado etc — ignora */ }
  }

  function init() {
    cacheEls();
    buildBoardCells();
    renderSquadPickList();
    applySlotColors();
    wireStaticEvents();
    var savedTheme = null;
    try { savedTheme = localStorage.getItem(THEME_STORAGE_KEY); } catch (e) { /* ignora */ }
    if (savedTheme === "dark") applyTheme("dark");
  }

  return {
    init: init,
    render: render,
    showGoalBanner: showGoalBanner,
    showHalftimeBanner: showHalftimeBanner,
    showGameOver: showGameOver,
    flashPiece: flashPiece,
    flashDuelStart: flashDuelStart
  };

})();
