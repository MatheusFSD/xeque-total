/* =========================================================
   QUADRADO MÁGICO — tutorial roteirizado da primeira partida

   A CrazyGames pede que o jogador caia no jogo o quanto antes, entao na
   primeira vez o menu e pulado: a pessoa entra direto num Brasil x Alemanha
   comandando o Brasil.

   O começo e ROTEIRIZADO: a cada momento so uma açao esta liberada, tudo o
   que nao interessa fica apagado e o balao de instruçao aparece colado no
   alvo. Terminado o roteiro, a partida segue normal.

   A IA fica pausada durante o roteiro (GAME.pausarIA), senao o adversario
   jogaria entre os passos e desmontaria a cena preparada. E como o turno passa
   pro adversario depois de cada açao, o roteiro devolve a vez pro jogador —
   sem isso a partida travaria esperando uma IA que esta parada.

   VALVULA DE ESCAPE: "Pular tutorial" esta sempre disponivel e solta tudo.
   Roteiro que prende o jogador num passo que ele nao consegue cumprir e pior
   do que tutorial nenhum.

   PRA TESTAR de novo depois de ja ter jogado: `?tutorial` na URL,
   `TUTORIAL.reiniciar()` no console, ou LER_CACHE = false aqui embaixo.
========================================================= */

var TUTORIAL = (function () {
  "use strict";

  var FEITO_KEY = "xequeTotalTutorialFeito";

  /* ---------------- trava de teste ----------------
     1. LER_CACHE = false    -> roda SEMPRE, pra todo mundo. Nao suba assim.
     2. ?tutorial na URL     -> força so nesta aba (?tutorial=off pula).
     3. TUTORIAL.reiniciar() -> apaga a marca e recarrega.
  ------------------------------------------------- */
  var LER_CACHE = true;

  var els = null;
  var ativo = false;      // o painel esta em cena
  var roteiro = false;    // a trava esta valendo
  var passos = null;
  var indice = 0;
  var alvosAtuais = [];   // {tipo:"cell"|"token"|"fab"|"duelo", row, col}

  function paramDaUrl() {
    try {
      var busca = String(window.location.search || "");
      if (!/[?&]tutorial(=|&|$)/.test(busca)) return null;
      var m = busca.match(/[?&]tutorial=([^&]*)/);
      var valor = m ? decodeURIComponent(m[1]).toLowerCase() : "";
      if (valor === "off" || valor === "0" || valor === "false" || valor === "nao") return "pular";
      return "forcar";
    } catch (e) { return null; }
  }

  function jaFez() {
    var forcado = paramDaUrl();
    if (forcado === "forcar") return false;
    if (forcado === "pular") return true;
    if (!LER_CACHE) return false;
    try { return STORAGE.getItem(FEITO_KEY) === "1"; } catch (e) { return true; }
  }

  function marcarFeito() {
    try { STORAGE.setItem(FEITO_KEY, "1"); } catch (e) { /* sem storage: repete */ }
  }

  function reiniciar() {
    try { STORAGE.removeItem(FEITO_KEY); } catch (e) { /* ignora */ }
    try { localStorage.removeItem(FEITO_KEY); } catch (e) { /* ignora */ }
    window.location.reload();
  }

  /* ---------------- leitura do estado ---------------- */

  function meuTime(s) { return s.humanTeamId; }

  function porId(s, id) {
    for (var i = 0; i < s.pieces.length; i++) if (s.pieces[i].id === id) return s.pieces[i];
    return null;
  }

  function portador(s) {
    return s.ball.carrierId ? porId(s, s.ball.carrierId) : null;
  }

  function celulas(lista) {
    return (lista || []).map(function (m) { return { tipo: "cell", row: m.row, col: m.col }; });
  }

  /* ---------------- a cena inicial ----------------
     Montada UMA VEZ, antes do primeiro render: o jogador abre o jogo numa
     jogada de ataque ja em andamento, com quatro brasileiros adiantados. E
     de proposito que as peças nao estejam na formaçao inicial — o que nao
     pode acontecer e alguem se mexer sozinho DEPOIS, que era o teleporte.

     As casas foram escolhidas medindo: a partir daqui, 15 dos 17 destinos do
     portador ainda deixam um companheiro de ataque ao alcance do passe (as
     duas excecoes sao recuos). O passo do movimento libera exatamente esses,
     entao o roteiro nunca precisa consertar nada no meio. */
  var CENA = {
    portador: { id: "bra-10", row: 3, col: 6 },
    apoio: [
      { id: "bra-9", row: 3, col: 9 },
      { id: "bra-11", row: 5, col: 9 },
      { id: "bra-7", row: 1, col: 9 }
    ]
  };

  /* Penalidade ate aqui o chute ainda sai "Media" — acima disso a primeira
     finalizaçao do jogador viraria loteria. */
  var CHUTE_ACEITAVEL = 8;

  function montarCena(s) {
    var ocupada = function (r, c, livres) {
      for (var i = 0; i < s.pieces.length; i++) {
        var x = s.pieces[i];
        if (x.row === r && x.col === c && livres.indexOf(x.id) < 0) return true;
      }
      return false;
    };
    var livres = [CENA.portador.id];
    for (var i = 0; i < CENA.apoio.length; i++) livres.push(CENA.apoio[i].id);

    var lista = [CENA.portador].concat(CENA.apoio);
    for (i = 0; i < lista.length; i++) {
      var alvo = lista[i];
      var p = porId(s, alvo.id);
      // se a casa estiver ocupada por quem nao faz parte da cena, deixa a peça
      // onde esta: melhor uma cena menos ideal do que duas peças empilhadas
      if (!p || ocupada(alvo.row, alvo.col, livres)) continue;
      p.row = alvo.row; p.col = alvo.col;
    }
    var dono = porId(s, CENA.portador.id);
    if (dono) {
      s.ball.carrierId = dono.id;
      s.ball.row = dono.row;
      s.ball.col = dono.col;
    }
    s.currentTeamId = s.humanTeamId;
    s.phase = "playing";
  }

  function pecaEm(s, row, col) {
    for (var i = 0; i < s.pieces.length; i++) {
      if (s.pieces[i].row === row && s.pieces[i].col === col) return s.pieces[i];
    }
    return null;
  }

  function noAtaque(s, row, col) {
    return BOARD.isPastMidfield(row, col, s.teams[meuTime(s)]);
  }

  /* Companheiros ao alcance do passe que ja estao em campo de ataque —
     sao eles que sustentam o passo do chute logo depois. */
  function passesNoAtaque(s) {
    var out = [], alvos = GAME.getState().passTargets || [];
    for (var i = 0; i < alvos.length; i++) {
      if (noAtaque(s, alvos[i].row, alvos[i].col)) out.push(alvos[i]);
    }
    return out;
  }

  /* ---------------- o roteiro ----------------
     `montar` prepara a cena e devolve os alvos liberados.
     `pronto` diz se a açao foi cumprida. */
  function montarPassos() {
    return [
      {
        id: "tocar",
        titulo: "Toque no seu jogador",
        texto: "Você comanda o Brasil e ataca para a direita. Este jogador está com a bola — toque nele.",
        montar: function (s) {
          // a cena ja foi montada em iniciar(): aqui so se aponta pra quem
          // esta com a bola, sem mexer em ninguem
          var p = portador(s);
          if (!p || p.team !== meuTime(s)) return [];
          this.alvoId = p.id;
          return [{ tipo: "token", row: p.row, col: p.col }];
        },
        pronto: function (s) { return s.selectedPieceId === this.alvoId; }
      },
      {
        id: "mover",
        titulo: "Mova pelas casas azuis",
        texto: "As casas azuis são o alcance dele. Quem desenha esse formato é a personalidade, não a posição: Rápido anda como Bispo, Bruto como Torre, Cerebral como Dama curta e Oportunista salta como Cavalo. Toque numa casa azul.",
        montar: function (s) {
          var p = porId(s, this.alvoId);
          if (p && s.selectedPieceId !== p.id) GAME.selectPiece(p.id);
          this.origem = p ? p.row + "," + p.col : null;
          if (!p) return [];

          /* Libera so os destinos de onde ainda da pra passar pra um
             companheiro no ataque. Sem esse filtro o jogador podia recuar e o
             passo seguinte ficaria impossivel — e era exatamente ai que a
             versao antiga "consertava" teleportando alguem.
             Na cena inicial isso deixa 15 dos 17 destinos livres; as duas
             excecoes sao recuos. */
          var todos = (GAME.getState().legalMoves || []).filter(function (m) { return !m.capture; });
          var voltaR = p.row, voltaC = p.col;
          var voltaBolaR = s.ball.row, voltaBolaC = s.ball.col;
          var bons = [];
          for (var i = 0; i < todos.length; i++) {
            p.row = todos[i].row; p.col = todos[i].col;
            s.ball.row = p.row; s.ball.col = p.col;
            GAME.clearSelection(); GAME.selectPiece(p.id);
            if (passesNoAtaque(s).length) bons.push(todos[i]);
          }
          p.row = voltaR; p.col = voltaC;
          s.ball.row = voltaBolaR; s.ball.col = voltaBolaC;
          GAME.clearSelection(); GAME.selectPiece(p.id);
          return celulas(bons.length ? bons : todos);
        },
        pronto: function (s) {
          var p = porId(s, this.alvoId);
          return !!p && !!this.origem && (p.row + "," + p.col) !== this.origem;
        }
      },
      {
        id: "passe",
        titulo: "Passe para um companheiro",
        texto: "Com a bola no pé, os companheiros ao alcance acendem com uma seta. Toque num deles para passar.",
        montar: function (s) {
          var p = portador(s);
          if (!p || p.team !== meuTime(s)) return [];
          this.alvoId = p.id;
          this.donoAntes = p.id;
          GAME.clearSelection(); GAME.selectPiece(p.id);
          // prefere quem ja esta no ataque, pra o passo do chute vir em seguida.
          // Nada de arrastar companheiro pra perto: o passo do movimento so
          // liberou destinos de onde esse passe existe.
          var noFundo = passesNoAtaque(s);
          // entre os que estao no ataque, prefere quem tem chute decente: a
          // primeira finalizaçao do tutorial nao pode ser "quase impossivel"
          var bons = [];
          for (var i = 0; i < noFundo.length; i++) {
            var q = pecaEm(s, noFundo[i].row, noFundo[i].col);
            if (!q) continue;
            var inf = BOARD.shootDistanceInfo(q, s.teams[meuTime(s)], s.pieces);
            if (inf && inf.penalty <= CHUTE_ACEITAVEL) bons.push(noFundo[i]);
          }
          if (bons.length) return celulas(bons);
          return celulas(noFundo.length ? noFundo : (GAME.getState().passTargets || []));
        },
        pronto: function (s) {
          var novo = s.ball.carrierId ? porId(s, s.ball.carrierId) : null;
          return !!novo && novo.id !== this.donoAntes && novo.team === meuTime(s);
        }
      },
      {
        id: "chute",
        titulo: "Agora chute",
        texto: "Quem recebeu já está no campo do adversário — só de lá dá para finalizar. O alvo vermelho é o chute: quanto mais longe do gol e mais marcadores na frente, mais difícil. Toque no alvo.",
        montar: function (s) {
          // quem recebeu o passe ja esta no campo de ataque: so seleciona.
          // Antes daqui o portador era TELEPORTADO pra uma casa de chute, e o
          // jogador via a peça pular pelo campo
          var p = portador(s);
          if (!p || p.team !== meuTime(s)) return [];
          this.alvoId = p.id;
          GAME.clearSelection(); GAME.selectPiece(p.id);
          return [{ tipo: "fab" }];
        },
        pronto: function (s) { return !!(s.duelContext && s.duelContext.isShoot); }
      },
      {
        id: "poder",
        titulo: "Ação ou Poder",
        texto: "Todo confronto vira um duelo. A Ação Básica é de graça; o Poder custa mana e soma um bônus à disputa. Escolha uma das duas.",
        montar: function () { return [{ tipo: "duelo" }]; },
        pronto: function (s) {
          var d = s.duelContext;
          if (!d) return false;
          return !!((d.challengerController === "human" ? d.challengerChoice : null) ||
                    (d.holderController === "human" ? d.holderChoice : null));
        }
      }
    ];
  }

  /* ---------------- a trava ---------------- */

  function permite(acao, dados) {
    if (!roteiro) return true;
    var i, a;
    if (acao === "quadrado") {
      for (i = 0; i < alvosAtuais.length; i++) {
        a = alvosAtuais[i];
        if ((a.tipo === "cell" || a.tipo === "token") && a.row === dados.row && a.col === dados.col) return true;
      }
      return false;
    }
    if (acao === "chutar") {
      for (i = 0; i < alvosAtuais.length; i++) if (alvosAtuais[i].tipo === "fab") return true;
      return false;
    }
    if (acao === "duelo") {
      for (i = 0; i < alvosAtuais.length; i++) if (alvosAtuais[i].tipo === "duelo") return true;
      return false;
    }
    if (acao === "elenco") return false;   // a lista lateral sai de cena no roteiro
    return true;
  }

  /* ---------------- foco e balao ---------------- */

  function aplicarFoco() {
    var raiz = document.getElementById("game-root");
    if (!raiz) return;
    raiz.classList.toggle("tutorial-guiando", roteiro);

    var permitidas = {}, querFab = false, querDuelo = false, i;
    for (i = 0; i < alvosAtuais.length; i++) {
      var a = alvosAtuais[i];
      if (a.tipo === "cell" || a.tipo === "token") permitidas[a.row + "," + a.col] = 1;
      if (a.tipo === "fab") querFab = true;
      if (a.tipo === "duelo") querDuelo = true;
    }

    var cels = document.querySelectorAll("#board .cell");
    for (i = 0; i < cels.length; i++) {
      var c = cels[i];
      c.classList.toggle("tutorial-alvo", roteiro && !!permitidas[c.dataset.row + "," + c.dataset.col]);
    }
    // as peças ficam numa camada por cima do tabuleiro: sem destaque proprio, a
    // peça que se quer tocar apagaria junto com o resto
    var tokens = document.querySelectorAll(".pieces-layer > .piece-token");
    for (i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      t.classList.toggle("tutorial-alvo", roteiro && !!permitidas[t.dataset.row + "," + t.dataset.col]);
    }

    var fab = document.getElementById("shoot-fab");
    if (fab) fab.classList.toggle("tutorial-alvo", roteiro && querFab);
    var duelo = document.querySelector(".duel-card");
    if (duelo) duelo.classList.toggle("tutorial-alvo", roteiro && querDuelo);
  }

  /* Caixa que envolve TODOS os alvos do passo. Ancorar so no primeiro fazia o
     balao pousar em cima de outro alvo — e o clique ia parar no texto, nao na
     casa. */
  function caixaDosAlvos() {
    if (!roteiro || !alvosAtuais.length) return null;
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, achou = false;
    for (var i = 0; i < alvosAtuais.length; i++) {
      var a = alvosAtuais[i], el = null;
      if (a.tipo === "duelo") el = document.querySelector(".duel-card");
      else if (a.tipo === "fab") el = document.getElementById("shoot-fab");
      else el = document.querySelector('#board .cell[data-row="' + a.row + '"][data-col="' + a.col + '"]');
      if (!el) continue;
      var b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      achou = true;
      x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top);
      x2 = Math.max(x2, b.right); y2 = Math.max(y2, b.bottom);
    }
    if (!achou) return null;
    return { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 };
  }

  /* Encosta o balao no conjunto de alvos: acima quando cabe, senao abaixo,
     senao volta pro canto. Nunca por cima de um alvo. */
  function posicionarBalao() {
    if (!els || !els.painel || els.painel.classList.contains("hidden")) return;
    var r = caixaDosAlvos();
    if (!r) {
      els.painel.classList.add("solto");
      els.painel.style.left = ""; els.painel.style.top = "";
      return;
    }
    els.painel.classList.remove("solto");
    var p = els.painel.getBoundingClientRect();
    var margem = 16;
    var esq = Math.max(12, Math.min(r.left + r.width / 2 - p.width / 2, window.innerWidth - p.width - 12));

    var cabeAcima = (r.top - p.height - margem) >= 12;
    var cabeAbaixo = (r.bottom + margem + p.height) <= (window.innerHeight - 12);
    if (!cabeAcima && !cabeAbaixo) {
      // alvos espalhados demais pra caber em cima ou embaixo: melhor o canto
      // do que tapar uma casa que o jogador precisa tocar
      els.painel.classList.add("solto");
      els.painel.style.left = ""; els.painel.style.top = "";
      els.painel.classList.remove("aponta-baixo", "aponta-cima");
      return;
    }
    var acima = cabeAcima;
    var topo = acima ? (r.top - p.height - margem) : (r.bottom + margem);
    els.painel.style.left = Math.round(esq) + "px";
    els.painel.style.top = Math.round(topo) + "px";
    els.painel.classList.toggle("aponta-baixo", acima);
    els.painel.classList.toggle("aponta-cima", !acima);
  }

  function pintar() {
    if (!els || !els.painel) return;
    var passo = passos[indice];
    if (!passo) return;
    els.contador.textContent = T("Passo {0} de {1}", indice + 1, passos.length);
    els.titulo.textContent = T(passo.titulo);
    els.texto.textContent = T(passo.texto);
    aplicarFoco();
    setTimeout(posicionarBalao, 20);   // espera o layout assentar
  }

  /* Prepara a cena do passo atual e libera os alvos dele. */
  function armarPasso() {
    var s = GAME.getState();
    if (!s || !ativo) return;
    var passo = passos[indice];
    if (!passo) { concluir(); return; }
    if (indice > 0 && !passo.alvoId) passo.alvoId = passos[indice - 1].alvoId;
    // o turno precisa estar com o jogador: a IA esta pausada e nao devolve a vez
    s.currentTeamId = s.humanTeamId;
    if (s.phase !== "duel" && s.phase !== "duel-intro") s.phase = "playing";
    alvosAtuais = passo.montar(s) || [];
    passo.armado = true;
    UI.render(s);
    pintar();
  }

  function avancar() {
    if (els && els.painel) {
      els.painel.classList.add("acertou");
      setTimeout(function () { if (els && els.painel) els.painel.classList.remove("acertou"); }, 700);
    }
    indice++;
    if (indice >= passos.length) { setTimeout(concluir, 900); return; }
    passos[indice].armado = false;
    setTimeout(armarPasso, 700);
  }

  /* Chamado pelo UI.render a cada mudança de estado. */
  function observar(s) {
    if (!ativo || !roteiro || !s || !s.pieces) return;
    var passo = passos[indice];
    // so vale perguntar depois de armado: entre o avanço do indice e o
    // armarPasso (700ms) o passo ainda nao tem seus dados de referencia, e
    // `pronto` compararia contra undefined — o passe pulava sozinho
    if (passo && passo.armado && passo.pronto(s)) {
      alvosAtuais = [];
      aplicarFoco();
      avancar();
      return;
    }
    aplicarFoco();
    posicionarBalao();
  }

  function soltarJogo() {
    roteiro = false;
    alvosAtuais = [];
    var raiz = document.getElementById("game-root");
    if (raiz) raiz.classList.remove("tutorial-guiando");
    var marcados = document.querySelectorAll(".tutorial-alvo");
    for (var i = 0; i < marcados.length; i++) marcados[i].classList.remove("tutorial-alvo");
    if (GAME.pausarIA) GAME.pausarIA(false);
    if (GAME.semInterceptacao) GAME.semInterceptacao(false);
    if (GAME.garantirGol) GAME.garantirGol(false);
  }

  function concluir() {
    if (!ativo) return;
    soltarJogo();
    marcarFeito();
    ativo = false;
    if (!els || !els.painel) return;
    els.painel.classList.add("solto", "concluido");
    els.painel.style.left = ""; els.painel.style.top = "";
    els.contador.textContent = T("Tutorial concluído");
    els.titulo.textContent = T("É isso!");
    els.texto.textContent = T("O resto você aprende jogando. A partida continua — boa sorte.");
    setTimeout(sumir, 4200);
  }

  function pular() {
    if (!ativo) return;
    soltarJogo();
    marcarFeito();
    ativo = false;
    sumir();
  }

  function sumir() {
    if (!els || !els.painel) return;
    els.painel.classList.add("saindo");
    setTimeout(function () { if (els.painel) els.painel.classList.add("hidden"); }, 400);
  }

  function iniciar(elementos) {
    els = elementos;
    if (!els || !els.painel) return;
    passos = montarPassos();
    indice = 0;
    ativo = true;
    roteiro = true;
    if (GAME.pausarIA) GAME.pausarIA(true);
    if (GAME.semInterceptacao) GAME.semInterceptacao(true);
    // o roteiro termina no gol: uma defesa deixaria a licao do poder sem desfecho
    if (GAME.garantirGol) GAME.garantirGol(true);
    var s0 = GAME.getState();
    if (s0) { montarCena(s0); UI.render(s0); }
    els.painel.classList.remove("hidden", "saindo", "concluido", "solto");
    if (els.pular) {
      els.pular.addEventListener("click", function () {
        if (typeof SOUND !== "undefined") SOUND.playClick();
        pular();
      });
    }
    window.addEventListener("resize", posicionarBalao);
    setTimeout(armarPasso, 500);
  }

  function progresso() {
    return {
      indice: indice,
      total: passos ? passos.length : 0,
      passo: (passos && passos[indice]) ? passos[indice].id : null,
      alvos: alvosAtuais.length,
      roteiro: roteiro,
      ativo: ativo
    };
  }

  return {
    jaFez: jaFez,
    reiniciar: reiniciar,
    iniciar: iniciar,
    observar: observar,
    permite: permite,
    progresso: progresso,
    estaAtivo: function () { return ativo; },
    noRoteiro: function () { return roteiro; }
  };
})();
