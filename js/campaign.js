/* =========================================================
   QUADRADO MÁGICO — modo Campanha (roguelike)

   O jogador sempre controla o Corto Maltese (squad campaignOnly em
   js/data.js), que começa como a pior seleção do jogo. A campanha é
   uma única Copa (reaproveitando 100% o motor de js/copa.js: sorteio,
   4 grupos de 4, quartas -> semis -> final) na qual, depois de cada
   partida do jogador, ele ganha fichas e pode gastá-las na Loja pra
   treinar um jogador do elenco atual (sobe um atributo aleatório) ou
   comprar uma figurinha — um reforço sorteado do banco de recrutas
   (GAME_DATA.CAMPAIGN_RECRUITS.medianos/elite) que substitui alguém
   do elenco atual na mesma posição.

   Este módulo é o "dono" do array `players` do squad CTM dentro de
   GAME_DATA — qualquer treino ou recrutamento sobrescreve esse array
   na hora, então o resto do jogo (COPA, GAME) sempre lê o elenco
   atualizado sem precisar saber que existe um modo Campanha.

   Salva localmente (localStorage, chave única com todas as campanhas
   num só JSON, indexado pela "senha" escolhida pelo jogador) — não
   existe backend, então isso é um save local deste navegador, não
   uma conta entre dispositivos.
========================================================= */

var CAMPAIGN = (function () {

  // mantém o nome antigo do jogo de propósito: renomear a chave apagaria a
  // campanha de quem já jogou (o localStorage é indexado por ela)
  var SAVE_KEY = "xequeTotalCampaignSaves";
  var CTM_ID = "CTM";

  var UPGRADE_BASE_COST = 40, UPGRADE_COST_STEP = 15, UPGRADE_MIN_GAIN = 2, UPGRADE_MAX_GAIN = 4;
  var FIGURINHA_COST = { medianos: 60, elite: 150 };

  var current = null; // save ativo carregado em memória, ou null

  function findCtmTeam() {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) {
      if (GAME_DATA.TEAMS[i].id === CTM_ID) return GAME_DATA.TEAMS[i];
    }
    return null;
  }

  function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

  // capturado uma única vez, no carregamento do módulo — antes de qualquer campanha
  // rodar e sobrescrever GAME_DATA.TEAMS (CTM).players. Se `baseRoster()` lesse
  // direto de lá, a 2a campanha nova (senha diferente) herdaria por engano o elenco
  // já modificado da 1a, em vez do time original fraco de data.js.
  var PRISTINE_ROSTER = findCtmTeam().players.map(deepCopy);

  function baseRoster() {
    return PRISTINE_ROSTER.map(deepCopy);
  }

  function applyRosterToGameData() {
    findCtmTeam().players = current.roster;
  }

  function readAllSaves() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAllSaves(all) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(all)); } catch (e) { /* sem localStorage, segue sem persistir */ }
  }

  function save() {
    if (!current) return;
    if (COPA.isActive()) current.copaState = COPA.getState();
    var all = readAllSaves();
    all[current.password] = current;
    writeAllSaves(all);
  }

  // true = já existia save com essa senha (retomando); false = campanha nova
  function startOrLoad(password) {
    var all = readAllSaves();
    var existing = all[password];
    if (existing) {
      current = existing;
      applyRosterToGameData();
      if (current.copaState) COPA.loadState(current.copaState);
      return { isNew: false, state: current };
    }
    current = {
      password: password,
      fichas: 0,
      roster: baseRoster(),
      recruitedIds: [],
      upgradeCounts: {},
      copaState: null,
      stage: "not-started", // "not-started" | "in-copa" | "finished"
      championId: null
    };
    applyRosterToGameData();
    save();
    return { isNew: true, state: current };
  }

  // chamado quando o jogador volta a uma campanha cuja Copa anterior já
  // terminou (campeã ou eliminada) — elenco, fichas e reforços conquistados
  // NÃO são resetados, só o torneio em si: uma nova Copa é sorteada do zero
  // pra essa mesma seleção já fortalecida, como uma nova edição/temporada
  function startNextCopa() {
    if (!current) return;
    COPA.reset();
    current.copaState = null;
    current.stage = "not-started";
    current.championId = null;
    save();
  }

  function markCopaStarted() {
    if (!current) return;
    current.stage = "in-copa";
    save();
  }

  function finishRun(championId) {
    if (!current) return;
    current.stage = "finished";
    current.championId = championId;
    save();
  }

  function abandon() { current = null; }

  function isActive() { return !!current; }
  function getState() { return current; }
  function getFichas() { return current ? current.fichas : 0; }
  function getRoster() { return current ? current.roster : []; }

  // recompensa em fichas ao final de uma partida do jogador: base pelo resultado
  // + um bônus por gol marcado, pra perder ainda render alguma coisa (sem travar
  // a progressão de uma campanha ruim) mas vencer valer bem mais a pena
  function awardFichas(result, goalsScored) {
    if (!current) return 0;
    var base = result === "win" ? 40 : (result === "draw" ? 20 : 10);
    var perGoal = result === "win" ? 5 : (result === "draw" ? 3 : 2);
    var amount = base + perGoal * (goalsScored || 0);
    current.fichas += amount;
    save();
    return amount;
  }

  function trainCost(playerId) {
    if (!current) return Infinity;
    var n = current.upgradeCounts[playerId] || 0;
    return UPGRADE_BASE_COST + n * UPGRADE_COST_STEP;
  }

  // sobe UM atributo aleatório do jogador (custo escalando a cada treino dele) —
  // o jogador não escolhe qual stat sobe, dá um tempero de sorte ao upgrade
  function trainPlayer(playerId) {
    if (!current) return null;
    var cost = trainCost(playerId);
    if (current.fichas < cost) return null;
    var player = current.roster.filter(function (p) { return p.id === playerId; })[0];
    if (!player) return null;
    var statKeys = Object.keys(player.stats);
    var key = statKeys[Math.floor(Math.random() * statKeys.length)];
    var gain = UPGRADE_MIN_GAIN + Math.floor(Math.random() * (UPGRADE_MAX_GAIN - UPGRADE_MIN_GAIN + 1));
    var before = player.stats[key];
    player.stats[key] = Math.min(99, before + gain);
    current.fichas -= cost;
    current.upgradeCounts[playerId] = (current.upgradeCounts[playerId] || 0) + 1;
    applyRosterToGameData();
    save();
    return { statKey: key, gain: player.stats[key] - before, cost: cost, playerName: player.name };
  }

  function figurinhaCost(tier) { return FIGURINHA_COST[tier] || FIGURINHA_COST.medianos; }

  function availableRecruits(tier) {
    var pool = (GAME_DATA.CAMPAIGN_RECRUITS && GAME_DATA.CAMPAIGN_RECRUITS[tier]) || [];
    if (!current) return pool;
    return pool.filter(function (p) { return current.recruitedIds.indexOf(p.id) === -1; });
  }

  // sorteia um recruta não repetido do pool escolhido e já cobra o custo — devolve
  // o recruta sorteado + a lista de vagas do elenco atual que ele pode ocupar
  // (mesma posição); js/ui.js decide se aplica direto (1 vaga só) ou pergunta qual
  function buyFigurinha(tier) {
    if (!current) return null;
    var cost = figurinhaCost(tier);
    if (current.fichas < cost) return null;
    var avail = availableRecruits(tier);
    if (!avail.length) return null;
    var recruit = deepCopy(avail[Math.floor(Math.random() * avail.length)]);
    current.fichas -= cost;
    current.recruitedIds.push(recruit.id);
    save();
    var candidateSlots = [];
    current.roster.forEach(function (p, idx) {
      if (p.position === recruit.position) candidateSlots.push({ index: idx, player: p });
    });
    return { recruit: recruit, candidateSlots: candidateSlots, cost: cost };
  }

  // efetiva a troca: o recruta assume a vaga (número de camisa e posição em campo
  // da vaga substituída), mas mantém seu próprio rosto/stats/temperamento/id
  function signRecruit(recruit, slotIndex) {
    if (!current) return;
    var slot = current.roster[slotIndex];
    if (!slot) return;
    recruit.start = slot.start;
    recruit.number = slot.number;
    current.roster[slotIndex] = recruit;
    applyRosterToGameData();
    save();
  }

  return {
    startOrLoad: startOrLoad,
    startNextCopa: startNextCopa,
    markCopaStarted: markCopaStarted,
    finishRun: finishRun,
    abandon: abandon,
    isActive: isActive,
    getState: getState,
    getFichas: getFichas,
    getRoster: getRoster,
    awardFichas: awardFichas,
    trainCost: trainCost,
    trainPlayer: trainPlayer,
    figurinhaCost: figurinhaCost,
    availableRecruits: availableRecruits,
    buyFigurinha: buyFigurinha,
    signRecruit: signRecruit
  };

})();
