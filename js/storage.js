/* =========================================================
   QUADRADO MÁGICO — camada única de persistência

   Todo mundo que salva coisa no jogo passa por aqui, em vez de chamar
   `localStorage` direto. O motivo é o CrazyGames: lá o jeito recomendado de
   salvar é o módulo `data` do SDK deles, que tem exatamente a mesma API do
   localStorage (getItem/setItem/removeItem/clear) mas sincroniza o progresso
   entre os aparelhos de quem está logado. Com o adaptador no meio, trocar de
   um pro outro é uma linha, e o jogo continua rodando igual fora do portal.

   Ordem de preferência:
     1. CrazyGames SDK  — só depois de `conectarCrazyGames()` resolver
     2. localStorage    — o padrão, e o que o GitHub Pages usa
     3. memória         — aba anônima com storage bloqueado: o jogo não quebra,
                          só não sobrevive ao recarregar

   PRA PUBLICAR NO CRAZYGAMES: ver o bloco comentado no fim do index.html.
   Dois detalhes de lá que valem lembrar:
     - a gravação é adiada em ~1s (às vezes até 30s), então nunca assuma que
       o dado já está gravado logo depois do setItem;
     - o teto é de 1 MB por usuário — `tamanhoAproximado()` existe pra você
       conseguir medir isso sem chutar.
========================================================= */

var STORAGE = (function () {
  "use strict";

  var memoria = {};
  var usandoCrazy = false;
  var ouvintes = [];

  // testa de verdade: em aba anônima o objeto existe mas escrever estoura
  var temLocal = (function () {
    try {
      var t = "__qm_teste__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function dadosCrazy() {
    if (!usandoCrazy) return null;
    var sdk = window.CrazyGames && window.CrazyGames.SDK;
    return (sdk && sdk.data) ? sdk.data : null;
  }

  function getItem(chave) {
    var cg = dadosCrazy();
    if (cg) {
      try { return cg.getItem(chave); } catch (e) { /* cai pro próximo */ }
    }
    if (temLocal) {
      try { return localStorage.getItem(chave); } catch (e) { /* idem */ }
    }
    return Object.prototype.hasOwnProperty.call(memoria, chave) ? memoria[chave] : null;
  }

  function setItem(chave, valor) {
    valor = String(valor);
    memoria[chave] = valor; // espelho local, pra leitura funcionar mesmo se os dois falharem
    var cg = dadosCrazy();
    if (cg) {
      try { cg.setItem(chave, valor); return true; } catch (e) { /* cai pro próximo */ }
    }
    if (temLocal) {
      try { localStorage.setItem(chave, valor); return true; } catch (e) { /* cota estourada */ }
    }
    return false;
  }

  function removeItem(chave) {
    delete memoria[chave];
    var cg = dadosCrazy();
    if (cg) {
      try { cg.removeItem(chave); } catch (e) { /* ignora */ }
    }
    if (temLocal) {
      try { localStorage.removeItem(chave); } catch (e) { /* ignora */ }
    }
  }

  /* Quantos bytes as nossas chaves ocupam. O CrazyGames corta em 1 MB por
     usuário, e as campanhas moram todas numa chave só — então dá pra estourar
     sem perceber. Chame no console: STORAGE.tamanhoAproximado() */
  function tamanhoAproximado() {
    var chaves = ["xequeTotalCampaignSaves", "xequeTotalCopaSave",
                  "xequeTotalMuted", "xequeTotalTheme", "xequeTotalLang"];
    var total = 0, detalhe = {};
    for (var i = 0; i < chaves.length; i++) {
      var v = getItem(chaves[i]);
      var n = v ? (chaves[i].length + v.length) : 0;
      detalhe[chaves[i]] = n;
      total += n;
    }
    return { totalBytes: total, porcentoDoLimite: +(total / 1048576 * 100).toFixed(2), detalhe: detalhe };
  }

  /* Liga o módulo `data` do CrazyGames. Precisa que o SDK deles já tenha sido
     carregado por <script> na página. Devolve uma promise que resolve com
     true/false — nunca rejeita, porque falhar aqui só significa "segue no
     localStorage", e não é motivo pra derrubar o jogo. */
  function conectarCrazyGames() {
    var sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (!sdk) return Promise.resolve(false);
    return Promise.resolve()
      .then(function () { return sdk.init(); })
      .then(function () {
        if (!sdk.data) return false;
        usandoCrazy = true;
        // As preferências (tema, idioma, som) são lidas na carga dos módulos,
        // antes disso resolver. Quem se inscreveu aqui relê e reaplica.
        for (var i = 0; i < ouvintes.length; i++) {
          try { ouvintes[i](); } catch (e) { console.error(e); }
        }
        return true;
      })
      .catch(function (e) {
        console.warn("CrazyGames SDK não inicializou, seguindo no localStorage:", e);
        return false;
      });
  }

  function aoTrocarDeBackend(fn) { if (typeof fn === "function") ouvintes.push(fn); }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    tamanhoAproximado: tamanhoAproximado,
    conectarCrazyGames: conectarCrazyGames,
    aoTrocarDeBackend: aoTrocarDeBackend,
    // pra diagnóstico
    backend: function () { return usandoCrazy ? "crazygames" : (temLocal ? "localStorage" : "memoria"); }
  };
})();
