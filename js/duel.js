/* =========================================================
   QUADRADO MÁGICO — resolução de duelos (Ação vs Poder)
========================================================= */

var DUEL = (function () {

  function canUsePower(piece) {
    return piece.mana >= piece.power.manaCost;
  }

  function challengerBaseStat(piece, isShoot) {
    if (isShoot) return piece.stats.chute;
    return Math.round((piece.stats.velocidade + piece.stats.tecnica) / 2);
  }

  function holderBaseStat(piece) {
    return piece.stats.defesa;
  }

  function rollScore(base, espirito, usedPower, bonus) {
    var rand = Math.floor(Math.random() * 11); // 0-10
    var spirit = Math.floor(espirito / 10); // 0-9
    return base + spirit + rand + (usedPower ? bonus : 0);
  }

  function resolveDuel(params) {
    var challenger = params.challenger;
    var holder = params.holder;
    var isShoot = !!params.isShoot;

    var challengerUsedPower = false;
    var holderUsedPower = false;

    if (params.challengerChoice === "poder" && canUsePower(challenger)) {
      challenger.mana -= challenger.power.manaCost;
      challengerUsedPower = true;
    }
    if (!holder.stunned && params.holderChoice === "poder" && canUsePower(holder)) {
      holder.mana -= holder.power.manaCost;
      holderUsedPower = true;
    }

    var cBase = challengerBaseStat(challenger, isShoot);
    var hBase = holderBaseStat(holder);

    var challengerScore = rollScore(cBase, challenger.stats.espirito, challengerUsedPower, challenger.power.bonus);
    if (isShoot && params.distancePenalty) challengerScore -= params.distancePenalty;
    var holderScore = holder.stunned ? -1 : rollScore(hBase, holder.stats.espirito, holderUsedPower, holder.power.bonus);

    // atordoado não consegue reagir — perde o duelo automaticamente, não importa a pontuação
    var winnerSide = holder.stunned ? "challenger" : (challengerScore > holderScore ? "challenger" : "holder");

    return {
      winnerSide: winnerSide,
      challengerScore: challengerScore,
      holderScore: holderScore,
      challengerUsedPower: challengerUsedPower,
      holderUsedPower: holderUsedPower,
      distancePenalty: isShoot ? (params.distancePenalty || 0) : 0
    };
  }

  function roleLabels(isShoot, isDribble) {
    if (isShoot) return { challenger: "Atacante", holder: "Goleiro" };
    if (isDribble) return { challenger: "Driblador", holder: "Defensor" };
    return { challenger: "Marcador", holder: "Portador da Bola" };
  }

  return {
    canUsePower: canUsePower,
    resolveDuel: resolveDuel,
    roleLabels: roleLabels
  };

})();
