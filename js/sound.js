/* =========================================================
   QUADRADO MÁGICO — efeitos sonoros sintetizados (Web Audio API)
   Nenhum arquivo de áudio externo — cada som é gerado na hora
   com osciladores + envelope de volume, estilo retrô/8-bit.
========================================================= */

var SOUND = (function () {

  var MUTE_KEY = "xequeTotalMuted";
  var ctx = null;
  var muted = false;

  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { /* modo privado etc — ignora */ }

  // o AudioContext só pode nascer (ou sair de "suspended") dentro de um
  // gesto do usuário (clique) — por isso nunca é criado no load da página,
  // só na primeira vez que algum som tenta tocar de verdade
  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) { /* ignora */ }
  }
  function isMuted() { return muted; }

  // uma "nota": oscilador + envelope curto de ataque/decaimento exponencial
  // (decaimento exponencial soa mais natural que linear pra bips curtos)
  function tone(freq, duration, opts) {
    if (muted) return;
    var ac = ensureCtx();
    if (!ac) return;
    opts = opts || {};
    var t0 = ac.currentTime + (opts.delay || 0);
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + duration);
    var peak = opts.gain != null ? opts.gain : 0.15;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function playClick() { tone(880, 0.05, { type: "square", gain: 0.07 }); }
  function playSelect() { tone(660, 0.045, { type: "triangle", gain: 0.07 }); }
  function playError() { tone(160, 0.12, { type: "sawtooth", gain: 0.09 }); }

  function playMove() { tone(320, 0.05, { type: "sine", gain: 0.06 }); }
  function playPass() { tone(320, 0.15, { type: "triangle", gain: 0.1, sweepTo: 760 }); }
  function playKick() {
    tone(150, 0.1, { type: "sawtooth", gain: 0.17, sweepTo: 55 });
    tone(1100, 0.03, { type: "square", gain: 0.05, delay: 0.01 });
  }

  function playDuelStart() {
    tone(210, 0.12, { type: "sawtooth", gain: 0.12, sweepTo: 95 });
    tone(150, 0.18, { type: "sawtooth", gain: 0.1, sweepTo: 60, delay: 0.08 });
  }
  function playDuelImpact() {
    tone(190, 0.09, { type: "square", gain: 0.16 });
    tone(90, 0.15, { type: "sawtooth", gain: 0.13, delay: 0.02 });
  }

  function playGoal() {
    [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, i) {
      tone(freq, 0.24, { type: "square", gain: 0.13, delay: i * 0.1 });
    });
  }

  function playWhistle() {
    tone(2400, 0.4, { type: "sine", gain: 0.08 });
    tone(2600, 0.18, { type: "sine", gain: 0.06, delay: 0.42 });
  }

  function playSuddenDeath() {
    [0, 0.16, 0.32].forEach(function (d) { tone(720, 0.11, { type: "square", gain: 0.11, delay: d }); });
  }

  function playCoinSpin() { tone(1200, 0.03, { type: "square", gain: 0.045 }); }
  function playCoinLand() { tone(520, 0.14, { type: "triangle", gain: 0.12, sweepTo: 300 }); }

  return {
    setMuted: setMuted, isMuted: isMuted,
    playClick: playClick, playSelect: playSelect, playError: playError,
    playMove: playMove, playPass: playPass, playKick: playKick,
    playDuelStart: playDuelStart, playDuelImpact: playDuelImpact,
    playGoal: playGoal, playWhistle: playWhistle, playSuddenDeath: playSuddenDeath,
    playCoinSpin: playCoinSpin, playCoinLand: playCoinLand
  };

})();
