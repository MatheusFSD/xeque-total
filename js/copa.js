/* =========================================================
   XEQUE TOTAL — modo Copa (fase de grupos -> semifinal -> final)

   O jogador escolhe só sua seleção; as outras 5 se distribuem em
   2 grupos de 3 (sorteio aleatório, o squad do jogador cai num dos
   2 grupos). Partidas que NÃO envolvem o jogador são resolvidas na
   hora por uma simulação de placar (Poisson) ponderada pela força
   de cada squad — não existe conceito de "força" em outro lugar do
   jogo, então é calculado aqui a partir da soma dos stats de cada
   jogador. As partidas do jogador são sempre jogadas de verdade,
   reaproveitando o fluxo normal de partida (GAME.start).

   Este módulo guarda o estado do torneio internamente, do mesmo
   jeito que js/game.js guarda o estado da partida — sem sistema de
   eventos, só getters/mutators simples pra js/ui.js consumir.
========================================================= */

var COPA = (function () {

  var state = null; // null = nenhum torneio ativo

  function findSquad(id) {
    for (var i = 0; i < GAME_DATA.TEAMS.length; i++) {
      if (GAME_DATA.TEAMS[i].id === id) return GAME_DATA.TEAMS[i];
    }
    return null;
  }

  // "força" do squad — não existe em nenhum outro lugar do jogo, calculado
  // aqui como a média da soma dos 5 stats de cada jogador. Seleções reais
  // calibradas ficam todas numa faixa próxima (~330-350), o que é bom:
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

  function buildRoundRobinFixtures(groupId, teamIds) {
    // 3 times => 3 jogos (cada par se enfrenta 1x), sem noção de "rodada" —
    // os jogos que não envolvem o jogador já saem resolvidos na hora
    var pairs = [[0, 1], [0, 2], [1, 2]];
    return pairs.map(function (pair, idx) {
      var fx = makeFixture(groupId + "-r" + idx, "groups", teamIds[pair[0]], teamIds[pair[1]]);
      fx.groupId = groupId;
      fx.roundIndex = idx;
      return fx;
    });
  }

  // resolve as partidas simuladas pendentes (opcionalmente restrito por filterFn) —
  // usado com filtro pra pautar a fase de grupos rodada por rodada, e sem filtro
  // pra resolver de uma vez a partida simulada de semifinal/final (só existe 1 por vez)
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
    while (state.groupRoundPtr <= 2) {
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

  function getGroups() {
    if (!state) return null;
    return { A: state.groups.A.slice(), B: state.groups.B.slice(), humanGroupId: state.humanGroupId };
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

  function startTournament(humanSquadId) {
    var allIds = GAME_DATA.TEAMS.map(function (t) { return t.id; });
    var others = shuffle(allIds.filter(function (id) { return id !== humanSquadId; })); // 5 ids
    var humanGroupId = Math.random() < 0.5 ? "A" : "B";
    var otherGroupId = humanGroupId === "A" ? "B" : "A";

    var groups = {};
    groups[humanGroupId] = shuffle([humanSquadId, others[0], others[1]]);
    groups[otherGroupId] = [others[2], others[3], others[4]];

    var strengthById = {};
    allIds.forEach(function (id) { strengthById[id] = squadStrength(id); });

    state = {
      humanSquadId: humanSquadId,
      strengthById: strengthById,
      groups: groups,
      humanGroupId: humanGroupId,
      stage: "groups", // "groups" | "semis" | "final" | "done"
      groupRoundPtr: 0, // rodada atual da fase de grupos (0,1,2) — pauta a revelação rodada por rodada
      fixtures: [],
      championSquadId: null,
      humanEliminatedAt: null // null | "groups" | "semis" | "final"
    };

    var fixturesA = buildRoundRobinFixtures("A", groups.A);
    var fixturesB = buildRoundRobinFixtures("B", groups.B);
    state.fixtures = fixturesA.concat(fixturesB);

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
      // teria voltado "stage-summary") — resolve o que sobrou dela (partida do outro
      // grupo) antes de avançar, senão ela nunca seria revelada
      resolveAutoFixtures(function (fx) { return fx.stage === "groups" && fx.roundIndex === state.groupRoundPtr; });
      state.groupRoundPtr++;
      advanceGroupRoundIfReady();
      if (state.groupRoundPtr <= 2) return; // ainda tem rodada(s) de grupo pela frente

      var standingsA = getStandings("A"), standingsB = getStandings("B");
      var qualified = [standingsA[0].squadId, standingsA[1].squadId, standingsB[0].squadId, standingsB[1].squadId];
      if (qualified.indexOf(state.humanSquadId) === -1) state.humanEliminatedAt = "groups";

      var semi1 = makeFixture("semi-1", "semis", standingsA[0].squadId, standingsB[1].squadId);
      var semi2 = makeFixture("semi-2", "semis", standingsB[0].squadId, standingsA[1].squadId);
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
    getGroups: getGroups,
    getStandings: getStandings,
    getNextStep: getNextStep,
    advance: advance,
    reportHumanResult: reportHumanResult
  };

})();
