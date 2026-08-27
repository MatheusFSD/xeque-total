/* =========================================================
   QUADRADO MÁGICO — renderização e interações de interface
========================================================= */

var UI = (function () {

  var els = {};
  var inspectedId = null;
  var chosenHomeSquadId = null;
  var chosenAwaySquadId = null;
  var chosenMaxTurns = 50;
  var chosenNoTurnLimit = false;
  var gameMode = "amistoso"; // "amistoso" | "copa"
  var campaignActive = false; // true = a partida/torneio "copa" em andamento é na verdade o modo Campanha (squad fixo CTM)
  var copaPendingFixtureId = null; // fixture da Copa em andamento (enquanto uma partida real está rolando)
  var copaMatchResultPending = null; // resultado já calculado, esperando o jogador clicar "Continuar" no modal padrão de fim de jogo
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
  var duelImpactSoundPlayed = false; // evita repetir o som de impacto a cada re-render do mesmo duelo já revelado

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
      "settings-gear-btn", "settings-menu",
      "mode-select-amistoso", "mode-select-copa", "mode-select-duo", "mode-select-campanha", "sound-checkbox",
      "squad-select-screen", "squad-select-back-btn", "squad-select-kicker",
      "campaign-password-modal", "campaign-password-back-btn", "campaign-password-input", "campaign-password-continue-btn",
      "campaign-shop-modal", "campaign-shop-fichas", "campaign-shop-award", "campaign-shop-roster",
      "campaign-pack-medianos", "campaign-pack-medianos-cost", "campaign-pack-elite", "campaign-pack-elite-cost", "campaign-shop-continue-btn",
      "campaign-recruit-modal", "campaign-recruit-name", "campaign-recruit-sub", "campaign-recruit-slots",
      "copa-draw-modal", "copa-draw-group-a", "copa-draw-group-b", "copa-draw-group-c", "copa-draw-group-d", "copa-draw-excluded", "copa-draw-excluded-list", "copa-draw-continue-btn",
      "copa-hub-modal", "copa-hub-stage-label", "copa-hub-standings", "copa-hub-round-results", "copa-hub-fixture-btn", "copa-hub-menu-btn",
      "copa-result-modal", "copa-result-inner", "copa-result-kicker", "copa-result-title", "copa-result-badge",
      "copa-result-detail", "copa-result-final-score", "copa-result-menu-btn",
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
      "gameover-modal", "gameover-kicker", "gameover-title", "gameover-score", "gameover-sub", "rematch-btn", "gameover-menu-btn",
      "lineup-ask-modal", "lineup-ask-text", "lineup-ask-yes", "lineup-ask-no",
      "lineup-editor-modal", "lineup-editor-title", "lineup-grid", "lineup-detail", "lineup-reset-btn", "lineup-confirm-btn",
      "coinflip-modal", "coin", "coin-face-a", "coin-face-b", "coinflip-result", "coinflip-continue-btn",
      "loading-modal", "loading-fill", "loading-count"
    ];
    ids.forEach(function (id) {
      var key = id.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
      els[key] = $(id);
    });
  }

  // no modo 2 jogadores local os dois lados são "humanos" — replica a mesma
  // lógica de js/game.js pra decidir se o clique/hover deve reagir
  function isHumanControlled(state, teamId) {
    return !!state.twoPlayerLocal || teamId === state.humanTeamId;
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
  // aplica o degradê da seleção sem depender de uma classe CSS por squad
  function applySquadBadgeStyle(el, sq) {
    el.classList.add("squad-badge");
    el.style.background = "radial-gradient(circle at 30% 30%, var(--" +
      sq.colorVar + "-2), var(--" + sq.colorVar + "))";
  }

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

  // bandeira do jogador (peça no tabuleiro): mesma lógica de fillSquadBadgeEl —
  // usa imagem de verdade porque o emoji de bandeira não renderiza no Windows.
  function fillFlagEl(el, piece) {
    el.innerHTML = "";
    var iso2 = flagToIso2(piece.flag);
    if (iso2) {
      var img = document.createElement("img");
      img.className = "piece-flag-img";
      img.src = "https://flagcdn.com/w40/" + iso2 + ".png";
      img.alt = piece.nationality;
      img.onerror = function () { el.textContent = piece.flag; };
      el.appendChild(img);
    } else {
      el.textContent = piece.flag;
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
  // no modo Copa é seleção única — só escolhe a sua seleção, o adversário vem do sorteio.
  function pickSquad(id) {
    SOUND.playSelect();
    if (gameMode === "copa") {
      chosenHomeSquadId = id;
      chosenAwaySquadId = null;
    } else if (chosenHomeSquadId !== null && chosenAwaySquadId !== null) {
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

  var MODE_KICKER_LABEL = { amistoso: "AMISTOSO", copa: "COPA", "2players": "2 JOGADORES" };

  function setGameMode(mode) {
    gameMode = mode;
    chosenHomeSquadId = null;
    chosenAwaySquadId = null;
    if (els.squadSelectKicker) els.squadSelectKicker.textContent = MODE_KICKER_LABEL[mode] || "";
    if (els.startBtn) els.startBtn.textContent = mode === "copa" ? "🏆 Ir pro Sorteio" : "⚽ Iniciar Partida";
    renderSquadPickList();
    applySlotColors();
  }

  function goToSquadSelect(mode) {
    campaignActive = false; // saindo de qualquer fluxo de Campanha ao voltar pro seletor normal
    setGameMode(mode);
    if (els.startScreen) els.startScreen.classList.add("hidden");
    if (els.squadSelectScreen) els.squadSelectScreen.classList.remove("hidden");
  }

  /* ---------------- modo Campanha ---------------- */

  function goToCampaignPassword() {
    if (els.startScreen) els.startScreen.classList.add("hidden");
    if (els.campaignPasswordInput) els.campaignPasswordInput.value = "";
    if (els.campaignPasswordContinueBtn) els.campaignPasswordContinueBtn.disabled = true;
    if (els.campaignPasswordModal) els.campaignPasswordModal.classList.remove("hidden");
    if (els.campaignPasswordInput) els.campaignPasswordInput.focus();
  }

  function startOrResumeCampaign(password) {
    campaignActive = true;
    gameMode = "copa";
    chosenHomeSquadId = "CTM";
    chosenAwaySquadId = null;
    COPA.reset();

    var result = CAMPAIGN.startOrLoad(password);
    var st = result.state;
    if (els.campaignPasswordModal) els.campaignPasswordModal.classList.add("hidden");

    if (st.stage === "finished") {
      CAMPAIGN.startNextCopa(); // mantém elenco/fichas/reforços — só sorteia uma Copa nova
    }

    if (!COPA.isActive()) {
      COPA.startTournament("CTM");
      CAMPAIGN.markCopaStarted();
      renderCopaDraw();
      return;
    }

    var step = COPA.getNextStep();
    if (step.type === "tournament-over") {
      renderCopaResult();
    } else {
      renderCopaHub();
    }
  }

  function statSumOf(p) { return p.stats.velocidade + p.stats.chute + p.stats.tecnica + p.stats.defesa + p.stats.espirito; }

  function renderCampaignShop(awardText) {
    if (!els.campaignShopModal) return;
    var fichas = CAMPAIGN.getFichas();
    els.campaignShopFichas.textContent = "🪙 " + fichas + " FICHAS";
    if (els.campaignShopAward) els.campaignShopAward.textContent = awardText || "";

    els.campaignShopRoster.innerHTML = "";
    CAMPAIGN.getRoster().forEach(function (p) {
      var row = document.createElement("div");
      row.className = "campaign-shop-player-row";

      var info = document.createElement("div");
      info.className = "campaign-shop-player-info";
      var name = document.createElement("p");
      name.className = "campaign-shop-player-name";
      name.textContent = p.number + ". " + p.name;
      var meta = document.createElement("p");
      meta.className = "campaign-shop-player-meta";
      meta.textContent = GAME_DATA.POSITIONS[p.position].short + " · " + p.temperament + " · " + statSumOf(p) + " pts";
      info.appendChild(name);
      info.appendChild(meta);

      var cost = CAMPAIGN.trainCost(p.id);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "campaign-shop-train-btn";
      btn.textContent = "Treinar (" + cost + ")";
      btn.disabled = fichas < cost;
      btn.addEventListener("click", function () {
        SOUND.playClick();
        var res = CAMPAIGN.trainPlayer(p.id);
        if (!res) return;
        renderCampaignShop(res.playerName + " subiu " + GAME_DATA.STATS[res.statKey] + " +" + res.gain + "!");
      });

      row.appendChild(info);
      row.appendChild(btn);
      els.campaignShopRoster.appendChild(row);
    });

    ["medianos", "elite"].forEach(function (tier) {
      var btnEl = tier === "medianos" ? els.campaignPackMedianos : els.campaignPackElite;
      var costEl = tier === "medianos" ? els.campaignPackMedianosCost : els.campaignPackEliteCost;
      var cost = CAMPAIGN.figurinhaCost(tier);
      var left = CAMPAIGN.availableRecruits(tier).length;
      if (costEl) costEl.textContent = left ? (cost + " fichas") : "esgotado";
      if (btnEl) btnEl.disabled = !left || fichas < cost;
    });

    els.campaignShopModal.classList.remove("hidden");
  }

  function handleBuyFigurinha(tier) {
    SOUND.playClick();
    var pack = CAMPAIGN.buyFigurinha(tier);
    if (!pack) { renderCampaignShop(); return; }
    if (pack.candidateSlots.length === 1) {
      CAMPAIGN.signRecruit(pack.recruit, pack.candidateSlots[0].index);
      renderCampaignShop(pack.recruit.name + " assinou com o Corto Maltese!");
    } else {
      showCampaignRecruitChoice(pack);
    }
  }

  function showCampaignRecruitChoice(pack) {
    els.campaignShopModal.classList.add("hidden");
    els.campaignRecruitName.textContent = pack.recruit.name;
    els.campaignRecruitSub.textContent = "Escolha quem sai do time pra abrir espaço no elenco:";
    els.campaignRecruitSlots.innerHTML = "";
    pack.candidateSlots.forEach(function (slot) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "campaign-recruit-slot-btn";
      btn.textContent = "Substituir " + slot.player.number + ". " + slot.player.name;
      btn.addEventListener("click", function () {
        SOUND.playClick();
        CAMPAIGN.signRecruit(pack.recruit, slot.index);
        els.campaignRecruitModal.classList.add("hidden");
        renderCampaignShop(pack.recruit.name + " assinou com o Corto Maltese!");
      });
      els.campaignRecruitSlots.appendChild(btn);
    });
    els.campaignRecruitModal.classList.remove("hidden");
  }

  function renderSquadPickList() {
    if (els.squadPickHint) {
      if (gameMode === "copa") {
        els.squadPickHint.textContent = chosenHomeSquadId === null ? "Escolha sua seleção pra Copa" : "Tudo pronto — toque em outra seleção pra trocar";
      } else if (gameMode === "2players") {
        els.squadPickHint.textContent = chosenHomeSquadId === null ? "Jogador 1, escolha seu time" : (chosenAwaySquadId === null ? "Jogador 2, escolha seu time" : "Tudo pronto — toque em outro time pra trocar");
      } else if (chosenHomeSquadId === null) els.squadPickHint.textContent = "Toque num time pra ser o seu";
      else if (chosenAwaySquadId === null) els.squadPickHint.textContent = "Agora toque no time do adversário";
      else els.squadPickHint.textContent = "Tudo pronto — toque em outro time pra trocar";
    }
    if (els.startBtn) els.startBtn.disabled = gameMode === "copa" ? !chosenHomeSquadId : !(chosenHomeSquadId && chosenAwaySquadId);

    if (!els.squadPickList) return;
    els.squadPickList.innerHTML = "";
    GAME_DATA.TEAMS.filter(function (sq) { return !sq.campaignOnly; }).forEach(function (sq) {
      var role = sq.id === chosenHomeSquadId ? "is-home" : (gameMode !== "copa" && sq.id === chosenAwaySquadId ? "is-away" : "");
      var card = document.createElement("button");
      card.type = "button";
      card.className = "team-pick-card" + (role ? " " + role : "");
      if (role) {
        var tag = document.createElement("span");
        tag.className = "team-pick-role-tag";
        var roleText = role === "is-home"
          ? (gameMode === "copa" ? "SUA SELEÇÃO" : (gameMode === "2players" ? "JOGADOR 1" : "SEU TIME"))
          : (gameMode === "2players" ? "JOGADOR 2" : "ADVERSÁRIO");
        tag.textContent = roleText;
        card.appendChild(tag);
      }
      var badge = document.createElement("span");
      badge.className = "team-pick-badge";
      applySquadBadgeStyle(badge, sq);
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

  var DIFF_CLS = { "Fácil": "diff-facil", "Média": "diff-media", "Difícil": "diff-dificil", "Quase impossível": "diff-impossivel" };
  function difficultyFromPenalty(p) {
    var label = BOARD.difficultyForPenalty(p);
    return { label: label, cls: DIFF_CLS[label] };
  }

  /* ---------------- imagens (splash art / ícone) com fallback ---------------- */

  // Todo retrato do jogo sai da mesma arte (splashs_art). A pasta de ícones
  // foi removida junto com as referências a jogadores reais, então não há
  // mais escolha de origem — o enquadramento do rosto é feito no CSS, pelo
  // object-position de cada contexto.
  function fillAvatarEl(el, piece) {
    el.innerHTML = "";
    var img = document.createElement("img");
    img.src = "splashs_art/" + piece.assetPrefix + "_" + piece.assetKey + ".webp";
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

  function buildAvatarBox(piece) {
    var box = document.createElement("div");
    box.className = "avatar-box";
    fillAvatarEl(box, piece);
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
    if (state.phase !== "playing" || !isHumanControlled(state, state.currentTeamId)) return;
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
      if (state && state.selectedPieceId) { SOUND.playKick(); GAME.attemptShoot(state.selectedPieceId); }
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

    if (state.phase === "playing" && isHumanControlled(state, state.currentTeamId)) {
      if (state.selectedPieceId) {
        for (var i = 0; i < state.passTargets.length; i++) {
          var t = state.passTargets[i];
          if (t.row === row && t.col === col) {
            clearHoverArrow();
            SOUND.playPass();
            GAME.attemptPass(state.selectedPieceId, row, col);
            return;
          }
        }
      }
      if (piece && piece.team === state.currentTeamId) {
        SOUND.playSelect();
        GAME.selectPiece(piece.id);
        return;
      }
      if (state.selectedPieceId) {
        for (var j = 0; j < state.legalMoves.length; j++) {
          var m = state.legalMoves[j];
          if (m.row === row && m.col === col) {
            clearHoverArrow();
            if (!m.capture) SOUND.playMove();
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
    if (state.phase === "playing" && isHumanControlled(state, state.currentTeamId) && piece && piece.team === state.currentTeamId) {
      SOUND.playSelect();
      GAME.selectPiece(pieceId);
      return;
    }
    render(state);
  }

  /* ---------------- render principal ---------------- */

  var lastSuddenDeathState = false;
  function render(state) {
    if (!state) return;
    if (state.suddenDeath && !lastSuddenDeathState) SOUND.playSuddenDeath();
    lastSuddenDeathState = !!state.suddenDeath;
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
    if (els.tvYouA) els.tvYouA.classList.toggle("hidden", state.twoPlayerLocal || state.humanTeamId !== "A");
    if (els.tvYouB) els.tvYouB.classList.toggle("hidden", state.twoPlayerLocal || state.humanTeamId !== "B");
    var aTurn = state.currentTeamId === "A" && state.phase !== "gameover";
    var bTurn = state.currentTeamId === "B" && state.phase !== "gameover";
    if (els.tvTeamA) els.tvTeamA.classList.toggle("active-turn", aTurn);
    if (els.tvTeamB) els.tvTeamB.classList.toggle("active-turn", bTurn);
    if (els.tvScoreboxA) els.tvScoreboxA.classList.toggle("active-turn", aTurn);
    if (els.tvScoreboxB) els.tvScoreboxB.classList.toggle("active-turn", bTurn);

    if (state.phase === "gameover") {
      els.scoreTurn.textContent = "Fim de jogo";
    } else if (state.twoPlayerLocal) {
      els.scoreTurn.textContent = "Vez: " + state.teams[state.currentTeamId].name;
    } else {
      els.scoreTurn.textContent = state.currentTeamId === state.humanTeamId ? "Sua vez" : "Vez do adversário";
    }

    if (state.suddenDeath) {
      els.scoreClock.textContent = "🥇 GOL DE OURO";
    } else if (state.noTurnLimit) {
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
    var show = state.phase === "playing" && isHumanControlled(state, state.currentTeamId) &&
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
    img.src = "splashs_art/" + piece.assetPrefix + "_" + piece.assetKey + ".webp";
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
    fillFlagEl(flag, piece);

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
    SOUND.playDuelStart();
    duelImpactSoundPlayed = false;
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
    // espelha a arte de quem está jogando do lado direito do campo NESTE momento —
    // times trocam de lado no intervalo (swapSides em game.js), por isso usa o
    // attackDir atual do time, não o id fixo do time
    token.classList.toggle("mirror-art", state.teams[piece.team].attackDir === -1);
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

    var avatar = buildAvatarBox(piece);

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
    if (els.rosterToggleOwn) {
      els.rosterToggleOwn.classList.toggle("active", !rosterViewAway);
      els.rosterToggleOwn.textContent = state.twoPlayerLocal ? state.teams.A.shortName : "Seu time";
    }
    if (els.rosterToggleAway) {
      els.rosterToggleAway.classList.toggle("active", rosterViewAway);
      els.rosterToggleAway.textContent = state.twoPlayerLocal ? state.teams.B.shortName : "Adversário";
    }
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
      '<div class="detail-hero" id="detail-hero-bg" style="background-image:' + grad + '"></div>' +
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
      abilityBoxHtml(piece) +
      (piece.quote ? '<p class="detail-quote">"' + piece.quote + '"</p>' : '') +
      (piece.lore ? '<p class="detail-lore">' + piece.lore + '</p>' : '') +
      '</div>';
  }

  // a habilidade fica visualmente separada do poder de propósito: o poder é
  // uma escolha que custa mana, a habilidade está sempre ligada e não se
  // decide nada sobre ela — misturar os dois num bloco só confundiria
  function abilityBoxHtml(piece) {
    var ab = piece.ability && GAME_DATA.ABILITIES[piece.ability];
    if (!ab) return "";
    return '<div class="ability-box">' +
      '<span class="ability-tag">Habilidade</span>' +
      '<strong class="ability-name">' + ab.name + '</strong>' +
      '<span class="ability-desc">' + ab.desc + '</span>' +
      '</div>';
  }

  // a splashs_art original vem em alta resolução (1254x1254), pensada pra ser vista
  // grande — espremida "crua" numa caixa pequena (cover) ela mantém todo o nível de
  // detalhe (textura da grama, torcida, bola) na mesma proporção da caixa, o que
  // deixa a imagem poluída/difícil de ler nesse tamanho. Redesenhar num canvas menor
  // faz um reamostragem real pra baixo (não é só CSS encolhendo visualmente): o
  // resultado tem MENOS detalhe fino de fato, só o essencial da silhueta/pose fica
  // nítido — leve o bastante pra ler de relance num card pequeno.
  var HERO_BG_CACHE = {};
  function loadDownscaledHeroBg(el, url, targetSize) {
    var cacheKey = url + "@" + targetSize;
    if (HERO_BG_CACHE[cacheKey]) {
      el.style.backgroundImage = "url('" + HERO_BG_CACHE[cacheKey] + "')";
      return;
    }
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      HERO_BG_CACHE[cacheKey] = dataUrl;
      el.style.backgroundImage = "url('" + dataUrl + "')";
    };
    img.src = url;
  }

  function fillPlayerStatsInto(container, piece) {
    container.innerHTML = buildPlayerStatsHtml(piece);

    var heroBgEl = container.querySelector("#detail-hero-bg");
    if (heroBgEl) {
      var url = "splashs_art/" + piece.assetPrefix + "_" + piece.assetKey + ".webp";
      loadDownscaledHeroBg(heroBgEl, url, 240);
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

    var stats = DUEL.statLabels(ctx.isShoot, ctx.isDribble);
    fillDuelSide(state, "left", ctx.challenger, labels.challenger, ctx, "challenger", stats.challenger);
    fillDuelSide(state, "right", ctx.holder, labels.holder, ctx, "holder", stats.holder);

    if (ctx.revealed) {
      if (!duelImpactSoundPlayed) { duelImpactSoundPlayed = true; SOUND.playDuelImpact(); }
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

  function fillDuelSide(state, sideKey, piece, roleLabel, ctx, side, statLabel) {
    var avatarEl = sideKey === "left" ? els.duelLeftAvatar : els.duelRightAvatar;
    var nameEl = sideKey === "left" ? els.duelLeftName : els.duelRightName;
    var roleEl = sideKey === "left" ? els.duelLeftRole : els.duelRightRole;
    var manaFillEl = sideKey === "left" ? els.duelLeftManaFill : els.duelRightManaFill;
    var scoreEl = sideKey === "left" ? els.duelLeftScore : els.duelRightScore;
    var actionsEl = sideKey === "left" ? els.duelLeftActions : els.duelRightActions;
    var sideEl = sideKey === "left" ? els.duelLeft : els.duelRight;

    fillAvatarEl(avatarEl, piece);
    avatarEl.classList.toggle("mirror-art", state.teams[piece.team].attackDir === -1);
    nameEl.textContent = piece.name;
    nameEl.appendChild(buildDuelInfoIcon(piece));
    roleEl.textContent = roleLabel;
    if (statLabel) {
      // sem isso o jogador não tem como saber por que um atacante perdeu
      // um desarme: o atributo em jogo muda conforme o tipo de disputa
      var st = document.createElement("span");
      st.className = "duel-stat-used";
      st.textContent = statLabel;
      roleEl.appendChild(st);
    }
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
    SOUND.playGoal();
    var state = GAME.getState();
    if (els.goalWord) buildStaggeredWord(els.goalWord, "GOOOOL!");
    els.goalScorer.textContent = scorerPiece.name + " — " + state.teams[teamId].name;
    if (els.goalScorerPortrait) fillAvatarEl(els.goalScorerPortrait, scorerPiece);
    els.goalBanner.classList.remove("hidden");
    var inner = els.goalBanner.querySelector(".goal-banner-inner");
    inner.style.animation = "none";
    void inner.offsetWidth;
    inner.style.animation = "";
    setTimeout(function () { els.goalBanner.classList.add("hidden"); }, 2550);
  }

  function showHalftimeBanner() {
    SOUND.playWhistle();
    els.halftimeBanner.classList.remove("hidden");
    var inner = els.halftimeBanner.querySelector(".halftime-banner-inner");
    inner.style.animation = "none";
    void inner.offsetWidth;
    inner.style.animation = "";
    setTimeout(function () { els.halftimeBanner.classList.add("hidden"); }, 1850);
  }

  // preenche o modal padrão de fim de jogo (título/placar/cor) — usado tanto no
  // Amistoso (com "Jogar Novamente") quanto no modo Copa (com "Continuar" pro hub)
  function fillGameoverModal(state) {
    if (state.twoPlayerLocal) {
      var result2p = state.score.A === state.score.B ? "draw" : "win";
      var color2p = result2p === "draw" ? "var(--gold)" : "var(--success)";
      els.gameoverKicker.textContent = "FIM DE JOGO";
      els.gameoverTitle.textContent = result2p === "draw" ? "EMPATE" : (state.teams[state.score.A > state.score.B ? "A" : "B"].name.toUpperCase() + " VENCEU!");
      els.gameoverTitle.style.background = "none";
      els.gameoverTitle.style.webkitTextFillColor = color2p;
      els.gameoverTitle.style.color = color2p;
      els.gameoverScore.textContent = state.score.A + " — " + state.score.B;
      return result2p;
    }

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
    return result;
  }

  function showGameOver(state) {
    if (gameMode === "copa" && COPA.isActive()) { showCopaGameOver(state); return; }
    SOUND.playWhistle();
    els.rematchBtn.textContent = "🔄 Jogar Novamente";
    var result = fillGameoverModal(state);
    if (state.twoPlayerLocal) {
      els.gameoverSub.textContent = result === "draw" ? "Um empate emocionante até o apito final!" : "Parabéns aos vencedores!";
    } else {
      els.gameoverSub.textContent = result === "win"
        ? "Você dominou o campo do início ao fim!"
        : (result === "lose" ? "O adversário levou a melhor desta vez. Revanche?" : "Um empate emocionante até o apito final!");
    }
    els.gameoverModal.classList.remove("hidden");
  }

  /* ---------------- eventos estáticos ---------------- */

  function wireStaticEvents() {
    els.howToPlayBtn.addEventListener("click", function () {
      els.howToPlay.classList.toggle("hidden");
    });

    if (els.settingsGearBtn) els.settingsGearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      els.settingsMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", function (e) {
      if (!els.settingsMenu || els.settingsMenu.classList.contains("hidden")) return;
      if (els.settingsMenu.contains(e.target) || e.target === els.settingsGearBtn) return;
      els.settingsMenu.classList.add("hidden");
    });

    els.noTurnLimitCheckbox.addEventListener("change", function () {
      els.turnLimitInput.disabled = els.noTurnLimitCheckbox.checked;
    });

    if (els.modeSelectAmistoso) els.modeSelectAmistoso.addEventListener("click", function () { SOUND.playClick(); goToSquadSelect("amistoso"); });
    if (els.modeSelectCopa) els.modeSelectCopa.addEventListener("click", function () { SOUND.playClick(); goToSquadSelect("copa"); });
    if (els.modeSelectDuo) els.modeSelectDuo.addEventListener("click", function () { SOUND.playClick(); goToSquadSelect("2players"); });
    if (els.modeSelectCampanha) els.modeSelectCampanha.addEventListener("click", function () { SOUND.playClick(); goToCampaignPassword(); });

    if (els.campaignPasswordBackBtn) els.campaignPasswordBackBtn.addEventListener("click", function () {
      SOUND.playClick();
      if (els.campaignPasswordModal) els.campaignPasswordModal.classList.add("hidden");
      if (els.startScreen) els.startScreen.classList.remove("hidden");
    });
    if (els.campaignPasswordInput) els.campaignPasswordInput.addEventListener("input", function () {
      if (els.campaignPasswordContinueBtn) els.campaignPasswordContinueBtn.disabled = els.campaignPasswordInput.value.trim().length === 0;
    });
    if (els.campaignPasswordContinueBtn) els.campaignPasswordContinueBtn.addEventListener("click", function () {
      var password = els.campaignPasswordInput ? els.campaignPasswordInput.value.trim() : "";
      if (!password) return;
      SOUND.playClick();
      startOrResumeCampaign(password);
    });
    if (els.campaignPasswordInput) els.campaignPasswordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && els.campaignPasswordContinueBtn && !els.campaignPasswordContinueBtn.disabled) {
        els.campaignPasswordContinueBtn.click();
      }
    });

    if (els.campaignPackMedianos) els.campaignPackMedianos.addEventListener("click", function () { handleBuyFigurinha("medianos"); });
    if (els.campaignPackElite) els.campaignPackElite.addEventListener("click", function () { handleBuyFigurinha("elite"); });

    if (els.campaignShopContinueBtn) els.campaignShopContinueBtn.addEventListener("click", function () {
      SOUND.playClick();
      els.campaignShopModal.classList.add("hidden");
      els.gameRoot.classList.add("hidden");
      var step = COPA.getNextStep();
      if (step.type === "tournament-over") {
        CAMPAIGN.finishRun(step.championSquadId);
        renderCopaResult();
      } else {
        renderCopaHub();
      }
    });

    if (els.squadSelectBackBtn) els.squadSelectBackBtn.addEventListener("click", function () {
      SOUND.playClick();
      if (els.squadSelectScreen) els.squadSelectScreen.classList.add("hidden");
      if (els.startScreen) els.startScreen.classList.remove("hidden");
    });

    if (els.soundCheckbox) {
      els.soundCheckbox.checked = !SOUND.isMuted();
      els.soundCheckbox.addEventListener("change", function () {
        SOUND.setMuted(!els.soundCheckbox.checked);
        if (els.soundCheckbox.checked) SOUND.playClick();
      });
    }

    els.startBtn.addEventListener("click", function () {
      SOUND.playClick();
      chosenNoTurnLimit = els.noTurnLimitCheckbox.checked;
      chosenMaxTurns = Math.max(4, parseInt(els.turnLimitInput.value, 10) || 50);
      if (gameMode === "copa") {
        if (!chosenHomeSquadId) return;
        COPA.startTournament(chosenHomeSquadId);
        els.squadSelectScreen.classList.add("hidden");
        renderCopaDraw();
        return;
      }
      if (!chosenHomeSquadId || !chosenAwaySquadId) return;
      els.squadSelectScreen.classList.add("hidden");
      beginPreGameFlow();
    });

    if (els.copaDrawContinueBtn) els.copaDrawContinueBtn.addEventListener("click", function () {
      SOUND.playClick();
      els.copaDrawModal.classList.add("hidden");
      renderCopaHub();
    });

    if (els.copaHubFixtureBtn) els.copaHubFixtureBtn.addEventListener("click", function () {
      SOUND.playClick();
      var step = COPA.getNextStep();
      if (step.type === "human-fixture") {
        chosenHomeSquadId = step.homeSquadId;
        chosenAwaySquadId = step.awaySquadId;
        copaPendingFixtureId = step.fixtureId;
        els.copaHubModal.classList.add("hidden");
        beginPreGameFlow();
      } else if (step.type === "stage-summary") {
        COPA.advance();
        renderCopaHub();
      }
    });

    if (els.copaHubMenuBtn) els.copaHubMenuBtn.addEventListener("click", function () {
      var exitMsg = campaignActive
        ? "Sair da Campanha? Seu progresso fica salvo — digite a mesma senha pra continuar depois."
        : "Sair da Copa? O progresso do torneio será perdido.";
      if (window.confirm(exitMsg)) {
        els.copaHubModal.classList.add("hidden");
        returnToMenuFromCopa();
      }
    });

    if (els.copaResultMenuBtn) els.copaResultMenuBtn.addEventListener("click", function () {
      els.copaResultModal.classList.add("hidden");
      returnToMenuFromCopa();
    });

    if (els.rosterToggleOwn) els.rosterToggleOwn.addEventListener("click", function () {
      SOUND.playClick();
      rosterViewAway = false;
      var state = GAME.getState();
      if (state) render(state);
    });
    if (els.rosterToggleAway) els.rosterToggleAway.addEventListener("click", function () {
      SOUND.playClick();
      rosterViewAway = true;
      var state = GAME.getState();
      if (state) render(state);
    });

    if (els.themeToggleBtn) els.themeToggleBtn.addEventListener("change", toggleTheme);
    if (els.themeToggleBtnStart) els.themeToggleBtnStart.addEventListener("change", toggleTheme);

    els.menuBtn.addEventListener("click", function () {
      var msg = campaignActive
        ? "Voltar ao menu inicial? A partida atual (ainda não concluída) será perdida, mas sua Campanha salva continua de onde parou."
        : (gameMode === "copa"
          ? "Voltar ao menu inicial? O progresso da partida e da Copa serão perdidos."
          : "Voltar ao menu inicial? O progresso da partida atual será perdido.");
      if (window.confirm(msg)) {
        els.gameRoot.classList.add("hidden");
        els.duelModal.classList.add("hidden");
        els.gameoverModal.classList.add("hidden");
        if (gameMode === "copa") {
          returnToMenuFromCopa();
        } else {
          if (els.squadSelectScreen) els.squadSelectScreen.classList.add("hidden");
          els.startScreen.classList.remove("hidden");
        }
      }
    });

    els.playerStatsClose.addEventListener("click", closePlayerStatsModal);
    els.playerStatsModal.addEventListener("click", function (e) {
      if (e.target === els.playerStatsModal) closePlayerStatsModal();
    });

    els.duelContinueBtn.addEventListener("click", function () { SOUND.playClick(); GAME.continueAfterDuel(); });

    els.rematchBtn.addEventListener("click", function () {
      SOUND.playClick();
      els.gameoverModal.classList.add("hidden");
      if (gameMode === "copa" && copaMatchResultPending) {
        var pending = copaMatchResultPending;
        copaMatchResultPending = null;
        COPA.reportHumanResult(copaPendingFixtureId, pending.state.score.A, pending.state.score.B, pending.scorersA, pending.scorersB);
        copaPendingFixtureId = null;
        els.gameRoot.classList.add("hidden");
        if (campaignActive) {
          var humanGoals = pending.state.score[pending.state.humanTeamId];
          var gained = CAMPAIGN.awardFichas(pending.result, humanGoals);
          renderCampaignShop("Você ganhou " + gained + " fichas!");
          return;
        }
        renderCopaHub();
        return;
      }
      formationOverrides = null;
      beginPreGameFlow();
    });

    if (els.gameoverMenuBtn) els.gameoverMenuBtn.addEventListener("click", function () {
      SOUND.playClick();
      if (gameMode === "copa" && COPA.isActive()) {
        var exitMsg = campaignActive
          ? "Sair da Campanha? Seu progresso fica salvo — digite a mesma senha pra continuar depois."
          : "Voltar ao menu inicial? O progresso da Copa será perdido.";
        if (!window.confirm(exitMsg)) return;
        if (campaignActive && copaMatchResultPending) {
          var pending = copaMatchResultPending;
          COPA.reportHumanResult(copaPendingFixtureId, pending.state.score.A, pending.state.score.B, pending.scorersA, pending.scorersB);
          CAMPAIGN.awardFichas(pending.result, pending.state.score[pending.state.humanTeamId]);
        }
        copaMatchResultPending = null;
        els.gameoverModal.classList.add("hidden");
        els.gameRoot.classList.add("hidden");
        returnToMenuFromCopa();
        return;
      }
      els.gameoverModal.classList.add("hidden");
      els.gameRoot.classList.add("hidden");
      if (els.squadSelectScreen) els.squadSelectScreen.classList.add("hidden");
      els.startScreen.classList.remove("hidden");
    });

    els.lineupAskYes.addEventListener("click", function () {
      SOUND.playClick();
      els.lineupAskModal.classList.add("hidden");
      openLineupEditor();
    });
    els.lineupAskNo.addEventListener("click", function () {
      SOUND.playClick();
      els.lineupAskModal.classList.add("hidden");
      formationOverrides = null;
      openCoinFlip();
    });
    els.lineupResetBtn.addEventListener("click", function () {
      SOUND.playClick();
      lineupWorking = buildDefaultLineup(chosenHomeSquadId);
      lineupSelectedId = null;
      renderLineupEditor();
    });
    els.lineupConfirmBtn.addEventListener("click", function () {
      SOUND.playClick();
      formationOverrides = {};
      lineupWorking.forEach(function (p) { formationOverrides[p.id] = { row: p.row, col: p.col }; });
      els.lineupEditorModal.classList.add("hidden");
      openCoinFlip();
    });
    els.coinflipContinueBtn.addEventListener("click", function () {
      SOUND.playClick();
      els.coinflipModal.classList.add("hidden");
      showLoadingAndLaunch();
    });
  }

  /* ---------------- modo Copa ---------------- */

  function squadById(id) {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === id) return GAME_DATA.TEAMS[i];
    return null;
  }

  function buildCopaSquadRow(squadId, extraClass) {
    var sq = squadById(squadId);
    var row = document.createElement("div");
    row.className = "copa-squad-row" + (extraClass ? " " + extraClass : "");
    var badge = document.createElement("span");
    badge.className = "copa-squad-badge";
    applySquadBadgeStyle(badge, sq);
    fillSquadBadgeEl(badge, sq);
    var name = document.createElement("span");
    name.className = "copa-squad-name";
    name.textContent = sq.name;
    row.appendChild(badge);
    row.appendChild(name);
    return row;
  }

  var drawTimers = [];

  function clearDrawTimers() {
    drawTimers.forEach(clearTimeout);
    drawTimers = [];
  }

  /* O sorteio revela uma selecao por vez, alternando entre os grupos, como
     numa cerimonia de verdade. Cada linha entra com a classe .is-drawn, que
     dispara a animacao no CSS. O botao Continuar so aparece no fim — mas
     clicar em qualquer lugar revela tudo de uma vez, pra quem ja viu. */
  function renderCopaDraw() {
    var groups = COPA.getGroups();
    if (!groups) return;
    clearDrawTimers();

    var humanId = COPA.getState().humanSquadId;
    var groupContainers = { A: els.copaDrawGroupA, B: els.copaDrawGroupB, C: els.copaDrawGroupC, D: els.copaDrawGroupD };
    groups.groupIds.forEach(function (gid) {
      if (groupContainers[gid]) groupContainers[gid].innerHTML = "";
    });
    if (els.copaDrawExcludedList) els.copaDrawExcludedList.innerHTML = "";
    if (els.copaDrawExcluded) els.copaDrawExcluded.classList.add("hidden");
    els.copaDrawContinueBtn.classList.add("hidden");

    // ordem de revelacao: primeira vaga de cada grupo, depois a segunda, etc.
    var ordem = [];
    var maior = Math.max.apply(null, groups.groupIds.map(function (g) { return groups[g].length; }));
    for (var i = 0; i < maior; i++) {
      groups.groupIds.forEach(function (gid) {
        if (groups[gid][i]) ordem.push({ gid: gid, squadId: groups[gid][i] });
      });
    }

    var PASSO = 260;
    function revelar(item) {
      var alvo = groupContainers[item.gid];
      if (!alvo) return;
      var linha = buildCopaSquadRow(item.squadId, item.squadId === humanId ? "is-human" : "");
      linha.classList.add("is-drawn");
      alvo.appendChild(linha);
      SOUND.playSelect();
    }

    function mostrarExcluidas() {
      if (!els.copaDrawExcluded || !els.copaDrawExcludedList) return;
      if (!groups.excludedSquadIds.length) return;
      els.copaDrawExcludedList.innerHTML = "";
      groups.excludedSquadIds.forEach(function (squadId) {
        els.copaDrawExcludedList.appendChild(buildCopaSquadRow(squadId));
      });
      els.copaDrawExcluded.classList.remove("hidden");
    }

    function terminar() {
      clearDrawTimers();
      els.copaDrawContinueBtn.classList.remove("hidden");
      els.copaDrawModal.classList.remove("copa-draw-running");
    }

    // pular: completa o que falta sem animacao
    function pular() {
      clearDrawTimers();
      groups.groupIds.forEach(function (gid) {
        var alvo = groupContainers[gid];
        if (!alvo) return;
        alvo.innerHTML = "";
        groups[gid].forEach(function (squadId) {
          alvo.appendChild(buildCopaSquadRow(squadId, squadId === humanId ? "is-human" : ""));
        });
      });
      mostrarExcluidas();
      terminar();
    }
    els.copaDrawModal.onclick = function (e) {
      if (e.target === els.copaDrawContinueBtn) return;
      if (els.copaDrawModal.classList.contains("copa-draw-running")) pular();
    };

    els.copaDrawModal.classList.add("copa-draw-running");
    els.copaDrawModal.classList.remove("hidden");

    ordem.forEach(function (item, i) {
      drawTimers.push(setTimeout(function () { revelar(item); }, 380 + i * PASSO));
    });
    drawTimers.push(setTimeout(function () { mostrarExcluidas(); }, 380 + ordem.length * PASSO + 200));
    drawTimers.push(setTimeout(terminar, 380 + ordem.length * PASSO + 500));
  }

  function copaStageLabel(stage) {
    if (stage === "groups") return "FASE DE GRUPOS";
    if (stage === "quartas") return "QUARTAS DE FINAL";
    if (stage === "semis") return "SEMIFINAL";
    if (stage === "final") return "FINAL";
    return "COPA";
  }

  function buildCopaStandingsTable(groupId) {
    var wrap = document.createElement("div");
    wrap.className = "copa-standings-group";
    var title = document.createElement("p");
    title.className = "copa-standings-title";
    title.textContent = "Grupo " + groupId;
    wrap.appendChild(title);

    var table = document.createElement("table");
    table.className = "copa-standings-table";
    var thead = document.createElement("thead");
    thead.innerHTML = "<tr><th></th><th>P</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>";
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    var humanId = COPA.getState().humanSquadId;
    COPA.getStandings(groupId).forEach(function (row, idx) {
      var tr = document.createElement("tr");
      var cls = idx < 2 ? "qualified" : "";
      if (row.squadId === humanId) cls += " is-human";
      if (cls) tr.className = cls;
      var sq = squadById(row.squadId);
      var nameTd = document.createElement("td");
      nameTd.className = "copa-standings-name";
      var badge = document.createElement("span");
      badge.className = "copa-standings-badge";
      applySquadBadgeStyle(badge, sq);
      fillSquadBadgeEl(badge, sq);
      nameTd.appendChild(badge);
      var nameSpan = document.createElement("span");
      nameSpan.textContent = sq.shortName;
      nameTd.appendChild(nameSpan);
      tr.appendChild(nameTd);
      [row.pts, row.w, row.d, row.l, row.gd].forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function buildCopaBracketRow(fx) {
    var row = document.createElement("div");
    row.className = "copa-bracket-row" + (fx.isHumanFixture ? " is-human" : "");
    var home = squadById(fx.homeSquadId), away = squadById(fx.awaySquadId);
    var homeSpan = document.createElement("span");
    homeSpan.className = "copa-bracket-team";
    homeSpan.textContent = home.shortName;
    var scoreSpan = document.createElement("span");
    scoreSpan.className = "copa-bracket-score";
    scoreSpan.textContent = fx.status === "done" ? (fx.golsA + " - " + fx.golsB) : "vs";
    var awaySpan = document.createElement("span");
    awaySpan.className = "copa-bracket-team";
    awaySpan.textContent = away.shortName;
    row.appendChild(homeSpan);
    row.appendChild(scoreSpan);
    row.appendChild(awaySpan);
    return row;
  }

  // se o jogador já foi eliminado, avança sozinho até sair um campeão — não faz
  // sentido pedir clique numa sequência de telas de resumo vazias pro espectador
  function buildCopaResultLine(fx) {
    var home = squadById(fx.homeSquadId), away = squadById(fx.awaySquadId);
    var line = document.createElement("p");
    line.className = "copa-round-results-line";
    line.textContent = home.shortName + " " + fx.golsA + " - " + fx.golsB + " " + away.shortName;
    return line;
  }

  function renderCopaHub() {
    var state = COPA.getState();
    if (!state) return;

    var step = COPA.getNextStep();
    while (step.type === "stage-summary" && state.humanEliminatedAt !== null) {
      COPA.advance();
      step = COPA.getNextStep();
    }
    if (step.type === "tournament-over") {
      els.copaHubModal.classList.add("hidden");
      renderCopaResult();
      return;
    }

    els.copaHubStageLabel.textContent = copaStageLabel(state.stage);

    els.copaHubStandings.innerHTML = "";
    if (state.stage === "groups") {
      state.groupIds.forEach(function (gid) { els.copaHubStandings.appendChild(buildCopaStandingsTable(gid)); });
    } else {
      state.fixtures.filter(function (f) { return f.stage === state.stage; })
        .forEach(function (fx) { els.copaHubStandings.appendChild(buildCopaBracketRow(fx)); });
    }

    els.copaHubRoundResults.innerHTML = "";
    var simulated = state.fixtures.filter(function (f) { return f.stage === state.stage && f.status === "done" && !f.isHumanFixture; });
    if (simulated.length) {
      // Na fase de grupos os jogos vao se acumulando rodada apos rodada. Sem
      // separar, a lista so cresce no rodape e nao da pra saber o que aconteceu
      // em qual rodada. Cada bloco de rodada e um <details> aberto: as antigas
      // podem ser fechadas, e a mais recente vem sempre em cima.
      if (state.stage === "groups") {
        var porRodada = {};
        simulated.forEach(function (f) {
          var k = f.roundIndex == null ? 0 : f.roundIndex;
          (porRodada[k] = porRodada[k] || []).push(f);
        });
        Object.keys(porRodada).map(Number).sort(function (a, b) { return b - a; })
          .forEach(function (idx, ordem) {
            var bloco = document.createElement("details");
            bloco.className = "copa-round-block";
            bloco.open = ordem === 0; // so a rodada mais recente vem aberta
            var titulo = document.createElement("summary");
            titulo.className = "copa-round-results-heading";
            titulo.textContent = "Rodada " + (idx + 1) + " · " + porRodada[idx].length + " jogo" +
              (porRodada[idx].length > 1 ? "s" : "");
            bloco.appendChild(titulo);
            porRodada[idx].forEach(function (fx) { bloco.appendChild(buildCopaResultLine(fx)); });
            els.copaHubRoundResults.appendChild(bloco);
          });
      } else {
        var heading = document.createElement("p");
        heading.className = "copa-round-results-heading";
        heading.textContent = "Outros jogos desta fase";
        els.copaHubRoundResults.appendChild(heading);
        simulated.forEach(function (fx) { els.copaHubRoundResults.appendChild(buildCopaResultLine(fx)); });
      }
    }

    if (step.type === "human-fixture") {
      els.copaHubFixtureBtn.textContent = "⚽ Jogar Partida";
      els.copaHubFixtureBtn.classList.remove("hidden");
    } else if (step.type === "stage-summary") {
      els.copaHubFixtureBtn.textContent = "Continuar ➜";
      els.copaHubFixtureBtn.classList.remove("hidden");
    } else {
      els.copaHubFixtureBtn.classList.add("hidden");
    }

    els.copaHubModal.classList.remove("hidden");
  }

  function renderCopaResult() {
    var step = COPA.getNextStep();
    if (step.type !== "tournament-over") return;
    var champ = squadById(step.championSquadId);
    var st = COPA.getState();
    var humanId = st.humanSquadId;
    var isChampion = step.championSquadId === humanId;

    if (els.copaResultInner) els.copaResultInner.classList.toggle("is-champion", isChampion);
    els.copaResultKicker.textContent = isChampion ? "CAMPEÃO DA COPA" : "FIM DA SUA JORNADA";
    els.copaResultTitle.textContent = isChampion ? "CAMPEÃO!" : "ELIMINADO";
    els.copaResultTitle.style.background = "none";
    els.copaResultTitle.style.webkitTextFillColor = isChampion ? "var(--gold)" : "var(--danger)";
    els.copaResultTitle.style.color = isChampion ? "var(--gold)" : "var(--danger)";

    if (els.copaResultBadge) {
      els.copaResultBadge.innerHTML = "";
      var trophy = document.createElement("div");
      trophy.className = "copa-result-champ-trophy";
      trophy.textContent = "🏆";
      var badge = document.createElement("span");
      badge.className = "copa-result-badge-img";
      applySquadBadgeStyle(badge, champ);
      fillSquadBadgeEl(badge, champ);
      var name = document.createElement("p");
      name.className = "copa-result-champ-name";
      name.textContent = champ.name;
      els.copaResultBadge.appendChild(trophy);
      els.copaResultBadge.appendChild(badge);
      els.copaResultBadge.appendChild(name);
    }

    var detail;
    if (isChampion) {
      detail = "Vitória com o " + champ.name + " — nenhuma seleção resistiu à sua caminhada na Copa!";
    } else {
      var stageLabel = step.humanEliminatedAt === "groups" ? "na fase de grupos"
        : step.humanEliminatedAt === "quartas" ? "nas quartas de final"
        : step.humanEliminatedAt === "semis" ? "na semifinal" : "na final";
      detail = "Sua jornada terminou " + stageLabel + ".";
    }
    els.copaResultDetail.textContent = detail;

    if (els.copaResultFinalScore) {
      var finalFx = st.fixtures.filter(function (f) { return f.stage === "final"; })[0];
      if (finalFx && finalFx.status === "done") {
        var home = squadById(finalFx.homeSquadId), away = squadById(finalFx.awaySquadId);
        els.copaResultFinalScore.textContent = "Final: " + home.shortName + " " + finalFx.golsA + " - " + finalFx.golsB + " " + away.shortName;
        els.copaResultFinalScore.classList.remove("hidden");
      } else {
        els.copaResultFinalScore.classList.add("hidden");
      }
    }

    els.copaResultModal.classList.remove("hidden");
  }

  // mostra o mesmo modal padrão de fim de jogo do Amistoso primeiro — só depois
  // que o jogador clicar "Continuar" é que o resultado é reportado pra Copa e o
  // hub reaparece (não pula direto pro hub sem mostrar o resultado da partida)
  function showCopaGameOver(state) {
    SOUND.playWhistle();
    var scorersA = state.scorers.A.map(function (s) { return s.name; });
    var scorersB = state.scorers.B.map(function (s) { return s.name; });

    els.rematchBtn.textContent = "Continuar ➜";
    var result = fillGameoverModal(state);
    copaMatchResultPending = { state: state, scorersA: scorersA, scorersB: scorersB, result: result };
    els.gameoverSub.textContent = result === "win"
      ? "Vitória na Copa! Vamos ver o resto da rodada."
      : (result === "lose" ? "Não foi dessa vez... mas a Copa continua." : "Empate! Fica pra classificação geral.");
    els.gameoverModal.classList.remove("hidden");
  }

  function returnToMenuFromCopa() {
    COPA.reset();
    if (campaignActive) CAMPAIGN.abandon(); // já está salvo no localStorage — só limpa a referência em memória
    campaignActive = false;
    gameMode = "amistoso";
    chosenHomeSquadId = null;
    chosenAwaySquadId = null;
    copaPendingFixtureId = null;
    if (els.copaDrawModal) els.copaDrawModal.classList.add("hidden");
    if (els.copaHubModal) els.copaHubModal.classList.add("hidden");
    if (els.copaResultModal) els.copaResultModal.classList.add("hidden");
    if (els.campaignShopModal) els.campaignShopModal.classList.add("hidden");
    if (els.campaignRecruitModal) els.campaignRecruitModal.classList.add("hidden");
    if (els.squadSelectScreen) els.squadSelectScreen.classList.add("hidden");
    if (els.startBtn) els.startBtn.textContent = "⚽ Iniciar Partida";
    renderSquadPickList();
    els.startScreen.classList.remove("hidden");
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
    var avatar = buildAvatarBox(p);
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
    if (avatarEl) fillAvatarEl(avatarEl, p);
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
    var spinTicks = 0;
    var spinInterval = setInterval(function () {
      spinTicks++;
      SOUND.playCoinSpin();
      if (spinTicks >= 9) clearInterval(spinInterval);
    }, 190);
    setTimeout(function () {
      clearInterval(spinInterval);
      SOUND.playCoinLand();
      var winnerData = squadForSlot(winnerId);
      els.coinflipResult.innerHTML = "<strong>" + winnerData.name + "</strong> venceu o sorteio e começa com a bola!";
      els.coinflipContinueBtn.classList.remove("hidden");
    }, 1850);
  }

  // ícones + splash arts dos 2 elencos escolhidos — pré-carrega antes da partida
  // pra evitar avatares "estourando" na tela (splash art aparece cedo, já no 1º duelo).
  function collectMatchImageUrls() {
    var urls = [];
    [chosenHomeSquadId, chosenAwaySquadId].forEach(function (squadId) {
      var sq = null;
      for (var i = 0; i < GAME_DATA.TEAMS.length; i++) if (GAME_DATA.TEAMS[i].id === squadId) sq = GAME_DATA.TEAMS[i];
      if (!sq) return;
      sq.players.forEach(function (p) {
        urls.push("splashs_art/" + sq.assetPrefix + "_" + p.assetKey + ".webp");
      });
    });
    return urls;
  }

  function preloadImages(urls, onProgress) {
    var total = urls.length;
    var done = 0;
    onProgress(done, total);
    if (total === 0) return Promise.resolve();
    return Promise.all(urls.map(function (url) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = img.onerror = function () {
          done++;
          onProgress(done, total);
          resolve();
        };
        img.src = url;
      });
    }));
  }

  function showLoadingAndLaunch() {
    var urls = collectMatchImageUrls();
    els.loadingModal.classList.remove("hidden");
    els.loadingFill.style.width = "0%";
    els.loadingCount.textContent = "0 / " + urls.length + " imagens";
    preloadImages(urls, function (done, total) {
      var pct = total === 0 ? 100 : Math.round((done / total) * 100);
      els.loadingFill.style.width = pct + "%";
      els.loadingCount.textContent = done + " / " + total + " imagens";
    }).then(function () {
      els.loadingModal.classList.add("hidden");
      launchMatch();
    });
  }

  // partidas de mata-mata da Copa (semifinal/final) empatadas viram gol de ouro —
  // fase de grupos e o modo Amistoso continuam podendo terminar em empate normal
  function isCopaKnockoutFixturePending() {
    if (gameMode !== "copa" || !copaPendingFixtureId) return false;
    var st = COPA.getState();
    if (!st) return false;
    var fx = st.fixtures.filter(function (f) { return f.id === copaPendingFixtureId; })[0];
    return !!fx && (fx.stage === "semis" || fx.stage === "final");
  }

  function launchMatch() {
    inspectedId = null;
    tokenEls = {};
    lastPositions = {};
    rosterViewAway = false;
    lastSuddenDeathState = false;
    if (els.piecesLayer) els.piecesLayer.innerHTML = "";
    els.gameRoot.classList.remove("hidden");
    SOUND.playWhistle();
    GAME.start(chosenHomeSquadId, chosenAwaySquadId, formationOverrides, coinWinnerTeamId, chosenMaxTurns, chosenNoTurnLimit, isCopaKnockoutFixturePending(), gameMode === "2players");
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
