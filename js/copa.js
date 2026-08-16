/* =========================================================
   XEQUE TOTAL — modo Copa (fase de grupos -> quartas -> semi -> final)

   O jogador escolhe só sua seleção; um sorteio decide quais outras 15
   seleções do pool entram nesta Copa (a sua entra sempre) — o resto
   fica de fora dessa edição. As 16 participantes caem em 4 grupos de 4
   (formato "Copa do Mundo" clássico, sorteio aleatório, o squad do
   jogador cai num deles). Depois da fase de grupos, os 2 primeiros de
   cada grupo (4 grupos x 2 = 8 times) formam as quartas de final
   direto, sem precisar de curinga de terceiro colocado — o maior
   mata-mata que o pool atual permite fechar de forma "cheia". Partidas
   que NÃO envolvem o jogador são resolvidas na hora por uma simulação
   de placar (Poisson) ponderada pela força de cada squad — não existe
   conceito de "força" em nenhum outro lugar do jogo, então é calculado
   aqui a partir da soma dos stats de cada jogador. As partidas do
   jogador são sempre jogadas de verdade, reaproveitando o fluxo normal
   de partida (GAME.start).

   Este módulo guarda o estado do torneio internamente, do mesmo
   jeito que js/game.js guarda o estado da partida — sem sistema de
   eventos, só getters/mutators simples pra js/ui.js consumir.
========================================================= */

var COPA = (function () {

  var state = null; // null = nenhum torneio ativo

  var GROUP_IDS = ["A", "B", "C", "D"];
  var GROUP_SIZE = 4;
  var TOURNEY_SIZE = GROUP_IDS.length * GROUP_SIZE; // 16 — fecha em quartas de final, 1o+2o de cada grupo
  var ROUNDS_PER_GROUP = GROUP_SIZE * (GROUP_SIZE - 1) / 2; // todos-contra-todos dentro do grupo (6 jogos p/ grupo de 4)

  function findSquad(id) {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) {
      if (GAME_DATA.TEAMS[i].id === id) return GAME_DATA.TEAMS[i];
    }
    return null;
  }

  // "força" do squad — não existe em nenhum outro lugar do jogo, calculado
  // aqui como a média da soma dos 5 stats de cada jogador. Seleções reais
  // calibradas ficam todas numa faixa próxima (~318-350), o que é bom:
  // jogos simulados entre seleções historicamente fortes saem equilibrados.
  function squadStrength(squadId) {
    var sq = findSquad(squadId);
    var total = 0;
    sq.players.forEach(function (p) {
      var s = p.stats;
      total += s.velocidade + s.chute + s.tecnica + s.defesa + s.espirito;
    });
    return total / sq.players.length;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // amostrador de Poisson (algoritmo de Knuth) — sorteia um número de gols
  // condizente com o gol esperado (lambda) de cada lado, sem precisar de biblioteca
  function poissonSample(lambda) {
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }

  var BASE_LAMBDA = 1.3, DIFF_DIVISOR = 100, DIFF_WEIGHT = 1.6, LAMBDA_MIN = 0.35, LAMBDA_MAX = 3.2;

  // escolhe artilheiros "de mentirinha" pra partida simulada, priorizando quem tem mais chute
  function pickScorers(squadId, goals) {
    if (goals <= 0) return [];
    var sq = findSquad(squadId);
    var pool = sq.players.filter(function (p) { return p.position !== "GK"; });
    var weighted = [];
    pool.forEach(function (p) {
      var weight = Math.max(1, Math.round(p.stats.chute / 10));
      for (var i = 0; i < weight; i++) weighted.push(p.name);
    });
    var scorers = [];
    for (var g = 0; g < goals; g++) {
      scorers.push(weighted[Math.floor(Math.random() * weighted.length)]);
    }
    return scorers;
  }

  function simulateMatch(squadIdA, squadIdB) {
    var diff = (squadStrength(squadIdA) - squadStrength(squadIdB)) / DIFF_DIVISOR;
    var lambdaA = clamp(BASE_LAMBDA + DIFF_WEIGHT * diff, LAMBDA_MIN, LAMBDA_MAX);
    var lambdaB = clamp(BASE_LAMBDA - DIFF_WEIGHT * diff, LAMBDA_MIN, LAMBDA_MAX);
    var golsA = poissonSample(lambdaA), golsB = poissonSample(lambdaB);
    return {
      golsA: golsA, golsB: golsB,
      scorersA: pickScorers(squadIdA, golsA), scorersB: pickScorers(squadIdB, golsB)
    };
  }

  // probabilidade (0-1) do lado A vencer um mata-mata empatado — usada só
  // pra decidir quem avança quando uma partida de eliminatória termina empatada
  // (equivalente a um pênaltis simulado, mais provável favorecer o squad mais forte)
  function strengthWinProb(squadIdA, squadIdB) {
    var diff = state.strengthById[squadIdA] - state.strengthById[squadIdB];
    return 1 / (1 + Math.exp(-diff / 15));
  }

  function makeFixture(id, stage, teamA, teamB) {
    var home = teamA, away = teamB;
    if (away === state.humanSquadId) { var tmp = home; home = away; away = tmp; }
    return {
      id: id, stage: stage, groupId: null, roundIndex: null,
      homeSquadId: home, awaySquadId: away,
      isHumanFixture: home === state.humanSquadId || away === state.humanSquadId,
      status: "pending", golsA: null, golsB: null, scorersA: [], scorersB: []
    };
  }

  // todos os pares possíveis dentro do grupo (cada dupla se enfrenta 1x) — pra um
  // grupo de 4 são 6 jogos; a ordem não representa "rodadas simultâneas" de verdade,
  // é só a sequência em que cada jogo é revelado
  function roundRobinPairs(n) {
    var pairs = [];
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) pairs.push([i, j]);
    }
    return pairs;
  }

  function buildRoundRobinFixtures(groupId, teamIds) {
    var pairs = roundRobinPairs(teamIds.length);
    return pairs.map(function (pair, idx) {
      var fx = makeFixture(groupId + "-r" + idx, "groups", teamIds[pair[0]], teamIds[pair[1]]);
      fx.groupId = groupId;
      fx.roundIndex = idx;
      return fx;
    });
  }

  // resolve as partidas simuladas pendentes (opcionalmente restrito por filterFn) —
  // usado com filtro pra pautar a fase de grupos rodada por rodada, e sem filtro
  // pra resolver de uma vez as partidas simuladas de quartas/semi/final
  function resolveAutoFixtures(filterFn) {
    state.fixtures.forEach(function (fx) {
      if (fx.status === "pending" && !fx.isHumanFixture && (!filterFn || filterFn(fx))) {
        var res = simulateMatch(fx.homeSquadId, fx.awaySquadId);
        fx.golsA = res.golsA; fx.golsB = res.golsB;
        fx.scorersA = res.scorersA; fx.scorersB = res.scorersB;
        fx.status = "done";
      }
    });
  }

  // avança a fase de grupos rodada por rodada: resolve (e revela) as partidas
  // simuladas de uma rodada só depois que o jogador já tiver jogado a dele —
  // rodadas sem jogo do jogador (a rodada em que ele "descansa") são resolvidas
  // e reveladas na hora, em sequência, até achar uma que dependa dele
  function advanceGroupRoundIfReady() {
    while (state.groupRoundPtr <= ROUNDS_PER_GROUP - 1) {
      var roundIndex = state.groupRoundPtr;
      var roundFixtures = state.fixtures.filter(function (f) { return f.stage === "groups" && f.roundIndex === roundIndex; });
      var hasHumanPending = roundFixtures.some(function (f) { return f.isHumanFixture && f.status === "pending"; });
      if (hasHumanPending) return;
      resolveAutoFixtures(function (fx) { return fx.stage === "groups" && fx.roundIndex === roundIndex; });
      state.groupRoundPtr++;
    }
  }

  function getFixtureWinner(fx) {
    if (fx.golsA === fx.golsB) {
      return Math.random() < strengthWinProb(fx.homeSquadId, fx.awaySquadId) ? fx.homeSquadId : fx.awaySquadId;
    }
    return fx.golsA > fx.golsB ? fx.homeSquadId : fx.awaySquadId;
  }

  function headToHead(groupId, idA, idB) {
    var fx = state.fixtures.filter(function (f) {
      return f.groupId === groupId && f.status === "done" &&
        ((f.homeSquadId === idA && f.awaySquadId === idB) || (f.homeSquadId === idB && f.awaySquadId === idA));
    })[0];
    if (!fx) return 0;
    var golsIdA = fx.homeSquadId === idA ? fx.golsA : fx.golsB;
    var golsIdB = fx.homeSquadId === idA ? fx.golsB : fx.golsA;
    return golsIdB - golsIdA; // idA marcou mais => retorno negativo => idA vem primeiro
  }

  function isActive() { return !!state; }

  function reset() { state = null; }

  function getState() { return state; }

  // `state` é dado puro (sem função/closure lá dentro), então salvar/restaurar é só
  // repassar o objeto — usado pelo modo Campanha (js/campaign.js) pra persistir e
  // retomar um torneio em andamento entre sessões via localStorage
  function loadState(savedState) { state = savedState; }

  function getGroups() {
    if (!state) return null;
    var out = { groupIds: state.groupIds.slice(), humanGroupId: state.humanGroupId, excludedSquadIds: state.excludedSquadIds.slice() };
    state.groupIds.forEach(function (gid) { out[gid] = state.groups[gid].slice(); });
    return out;
  }

  function getStandings(groupId) {
    var teamIds = state.groups[groupId];
    var table = {};
    teamIds.forEach(function (id) {
      table[id] = { squadId: id, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 };
    });
    state.fixtures.forEach(function (fx) {
      if (fx.groupId !== groupId || fx.status !== "done") return;
      var home = table[fx.homeSquadId], away = table[fx.awaySquadId];
      home.gf += fx.golsA; home.ga += fx.golsB;
      away.gf += fx.golsB; away.ga += fx.golsA;
      if (fx.golsA > fx.golsB) { home.w++; home.pts += 3; away.l++; }
      else if (fx.golsA < fx.golsB) { away.w++; away.pts += 3; home.l++; }
      else { home.d++; away.d++; home.pts++; away.pts++; }
    });
    var list = teamIds.map(function (id) { var t = table[id]; t.gd = t.gf - t.ga; return t; });
    list.sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      var h2h = headToHead(groupId, a.squadId, b.squadId);
      if (h2h !== 0) return h2h;
      return a.squadId < b.squadId ? -1 : 1;
    });
    return list;
  }

  function seedByStrength(squadIds) {
    return squadIds.slice().sort(function (a, b) { return state.strengthById[b] - state.strengthById[a]; });
  }

  // monta as quartas: 1os e 2os colocados dos 4 grupos (4+4 = 8, encaixa
  // certinho sem precisar de curinga de terceiro colocado), semeados por
  // força (1os > 2os) e emparelhados 1x8, 2x7, 3x6, 4x5 — com uma tentativa
  // simples de evitar repetir logo de cara um confronto que já rolou na fase
  // de grupos (mesmo groupId dos dois lados)
  function buildQuartas() {
    var winners = [], runnersUp = [];
    state.groupIds.forEach(function (gid) {
      var standings = getStandings(gid);
      winners.push(standings[0].squadId);
      runnersUp.push(standings[1].squadId);
    });
    var seeds = seedByStrength(winners).concat(seedByStrength(runnersUp));
    var pairs = [[0, 7], [1, 6], [2, 5], [3, 4]];

    function hasSameGroupClash() {
      return pairs.some(function (p) { return state.groupOfSquad[seeds[p[0]]] === state.groupOfSquad[seeds[p[1]]]; });
    }
    var attempts = 0;
    while (hasSameGroupClash() && attempts < 6) {
      var tail = seeds.slice(4);
      tail.push(tail.shift());
      seeds = seeds.slice(0, 4).concat(tail);
      attempts++;
    }

    return pairs.map(function (p, idx) { return makeFixture("qf-" + idx, "quartas", seeds[p[0]], seeds[p[1]]); });
  }

  function startTournament(humanSquadId) {
    // squads marcados campaignOnly (o Corto Maltese do modo Campanha) nunca entram
    // no sorteio de adversários de uma Copa normal — só participam quando são eles
    // mesmos o squad do jogador (o próprio modo Campanha usa essa mesma função)
    var allIds = GAME_DATA.TEAMS.filter(function (t) { return !t.campaignOnly || t.id === humanSquadId; })
      .map(function (t) { return t.id; });
    var others = shuffle(allIds.filter(function (id) { return id !== humanSquadId; }));
    var drawnOthers = others.slice(0, TOURNEY_SIZE - 1); // sorteadas pra completar com o jogador
    var excludedSquadIds = others.slice(TOURNEY_SIZE - 1); // ficam de fora desta edição da Copa

    var humanGroupId = GROUP_IDS[Math.floor(Math.random() * GROUP_IDS.length)];
    var restGroupIds = GROUP_IDS.filter(function (g) { return g !== humanGroupId; });
    var pool = shuffle(drawnOthers);

    var groups = {};
    groups[humanGroupId] = shuffle([humanSquadId].concat(pool.slice(0, GROUP_SIZE - 1)));
    restGroupIds.forEach(function (gid, idx) {
      var start = (GROUP_SIZE - 1) + idx * GROUP_SIZE;
      groups[gid] = pool.slice(start, start + GROUP_SIZE);
    });

    var strengthById = {};
    allIds.forEach(function (id) { strengthById[id] = squadStrength(id); });

    var groupOfSquad = {};
    GROUP_IDS.forEach(function (gid) { groups[gid].forEach(function (id) { groupOfSquad[id] = gid; }); });

    state = {
      humanSquadId: humanSquadId,
      strengthById: strengthById,
      groupIds: GROUP_IDS.slice(),
      groups: groups,
      groupOfSquad: groupOfSquad,
      humanGroupId: humanGroupId,
      excludedSquadIds: excludedSquadIds,
      stage: "groups", // "groups" | "quartas" | "semis" | "final" | "done"
      groupRoundPtr: 0, // rodada atual da fase de grupos (0..ROUNDS_PER_GROUP-1) — pauta a revelação rodada por rodada
      fixtures: [],
      championSquadId: null,
      humanEliminatedAt: null // null | "groups" | "quartas" | "semis" | "final"
    };

    var fixtures = [];
    GROUP_IDS.forEach(function (gid) { fixtures = fixtures.concat(buildRoundRobinFixtures(gid, groups[gid])); });
    state.fixtures = fixtures;

    advanceGroupRoundIfReady();
    return getState();
  }

  function reportHumanResult(fixtureId, golsA, golsB, scorersA, scorersB) {
    var fx = state.fixtures.filter(function (f) { return f.id === fixtureId; })[0];
    if (!fx) return;
    fx.golsA = golsA; fx.golsB = golsB;
    fx.scorersA = scorersA || []; fx.scorersB = scorersB || [];
    fx.status = "done";
  }

  function getNextStep() {
    if (!state) return { type: "inactive" };
    if (state.stage === "done") {
      return { type: "tournament-over", championSquadId: state.championSquadId, humanEliminatedAt: state.humanEliminatedAt };
    }
    var currentFixtures = state.stage === "groups"
      ? state.fixtures.filter(function (f) { return f.stage === "groups" && f.roundIndex === state.groupRoundPtr; })
      : state.fixtures.filter(function (f) { return f.stage === state.stage; });
    var pendingHuman = currentFixtures.filter(function (f) { return f.isHumanFixture && f.status === "pending"; })[0];
    if (pendingHuman) {
      return {
        type: "human-fixture", fixtureId: pendingHuman.id,
        homeSquadId: pendingHuman.homeSquadId, awaySquadId: pendingHuman.awaySquadId, stage: state.stage
      };
    }
    return { type: "stage-summary", stage: state.stage };
  }

  function advance() {
    if (!state) return;
    if (state.stage === "groups") {
      // a rodada atual não tem mais jogo pendente do jogador (senão getNextStep não
      // teria voltado "stage-summary") — resolve o que sobrou dela (partidas dos
      // outros grupos) antes de avançar, senão elas nunca seriam reveladas
      resolveAutoFixtures(function (fx) { return fx.stage === "groups" && fx.roundIndex === state.groupRoundPtr; });
      state.groupRoundPtr++;
      advanceGroupRoundIfReady();
      if (state.groupRoundPtr <= ROUNDS_PER_GROUP - 1) return; // ainda tem rodada(s) de grupo pela frente

      var qfFixtures = buildQuartas();
      var qualifiedIds = [];
      qfFixtures.forEach(function (fx) { qualifiedIds.push(fx.homeSquadId, fx.awaySquadId); });
      if (qualifiedIds.indexOf(state.humanSquadId) === -1) state.humanEliminatedAt = "groups";

      state.fixtures.push.apply(state.fixtures, qfFixtures);
      state.stage = "quartas";
      resolveAutoFixtures(function (fx) { return fx.stage === "quartas"; });
    } else if (state.stage === "quartas") {
      var qfs = state.fixtures.filter(function (f) { return f.stage === "quartas"; });
      var wasInQuartas = qfs.some(function (f) { return f.homeSquadId === state.humanSquadId || f.awaySquadId === state.humanSquadId; });
      var qfWinners = qfs.map(getFixtureWinner);
      if (state.humanEliminatedAt === null && wasInQuartas && qfWinners.indexOf(state.humanSquadId) === -1) {
        state.humanEliminatedAt = "quartas";
      }
      var semi1 = makeFixture("semi-1", "semis", qfWinners[0], qfWinners[1]);
      var semi2 = makeFixture("semi-2", "semis", qfWinners[2], qfWinners[3]);
      state.fixtures.push(semi1, semi2);
      state.stage = "semis";
      resolveAutoFixtures(function (fx) { return fx.stage === "semis"; });
    } else if (state.stage === "semis") {
      var semis = state.fixtures.filter(function (f) { return f.stage === "semis"; });
      var wasInSemis = semis.some(function (f) { return f.homeSquadId === state.humanSquadId || f.awaySquadId === state.humanSquadId; });
      var winners = semis.map(getFixtureWinner);
      if (state.humanEliminatedAt === null && wasInSemis && winners.indexOf(state.humanSquadId) === -1) {
        state.humanEliminatedAt = "semis";
      }
      var finalFx = makeFixture("final-1", "final", winners[0], winners[1]);
      state.fixtures.push(finalFx);
      state.stage = "final";
      resolveAutoFixtures(function (fx) { return fx.stage === "final"; });
    } else if (state.stage === "final") {
      var fx = state.fixtures.filter(function (f) { return f.stage === "final"; })[0];
      state.championSquadId = getFixtureWinner(fx);
      if (state.humanEliminatedAt === null && state.championSquadId !== state.humanSquadId) {
        state.humanEliminatedAt = "final";
      }
      state.stage = "done";
    }
  }

  return {
    isActive: isActive,
    reset: reset,
    startTournament: startTournament,
    getState: getState,
    loadState: loadState,
    getGroups: getGroups,
    getStandings: getStandings,
    getNextStep: getNextStep,
    advance: advance,
    reportHumanResult: reportHumanResult
  };

})();
