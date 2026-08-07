/* =========================================================
   XEQUE TOTAL — dados dos times, jogadores, temperamentos e poderes
   Tabuleiro horizontal: 13 colunas (0-12) x 9 linhas (0-8).
   Time A (Tecos) defende a coluna 0 e ataca a coluna 12.
   Time B (Raptors) defende a coluna 12 e ataca a coluna 0.
   O movimento de cada jogador é definido pelo TEMPERAMENTO
   (exceto o goleiro, que sempre se move como Rei).
========================================================= */

var GAME_DATA = (function () {

  var POSITIONS = {
    GK: { label: "Goleiro", short: "GOL" },
    DF: { label: "Zagueiro", short: "ZAG" },
    LAT: { label: "Lateral", short: "LAT" },
    MF: { label: "Meio-campo", short: "MEI" },
    FW: { label: "Atacante", short: "ATA" }
  };

  // define o formato de movimento de cada temperamento (o goleiro ignora isso e sempre usa "king")
  var TEMPERAMENTS = {
    "Rápido": { shape: "bishop", maxDist: 4, icon: "🏃", moveLabel: "Bispo (diagonal, até 4 casas)" },
    "Bruto": { shape: "rook", maxDist: 4, icon: "💪", moveLabel: "Torre (reta, até 4 casas)" },
    "Cerebral": { shape: "queen", maxDist: 3, icon: "🧠", moveLabel: "Dama limitada (até 3 casas)" },
    "Oportunista": { shape: "knight", maxDist: null, icon: "🎯", moveLabel: "Cavalo (salto em L)" }
  };

  var STATS = {
    velocidade: "Velocidade",
    chute: "Chute",
    tecnica: "Técnica",
    defesa: "Defesa",
    espirito: "Espírito"
  };

  function player(p) {
    return {
      id: p.id, name: p.name, number: p.number,
      nationality: p.nationality, flag: p.flag,
      temperament: p.temperament, position: p.position,
      stats: p.stats,
      power: { name: p.power.name, desc: p.power.desc, manaCost: p.power.manaCost, bonus: p.power.bonus },
      start: p.start, maxMana: 100, quote: p.quote || "",
      assetKey: p.assetKey
    };
  }

  var TEAMS = [
    {
      id: "A", name: "Tecos", shortName: "TEC", kit: "Adidas · Branco",
      colorVar: "teco", badge: "🛡️", assetPrefix: "TECO",
      attackDir: 1, goalCol: 0, opponentGoalCol: 12,
      players: [
        player({ id: "a-1", name: "Rafael Muralha", number: 1, nationality: "Brasil", flag: "🇧🇷", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 55, chute: 10, tecnica: 45, defesa: 90, espirito: 82 },
          power: { name: "Muralha Adamantina", desc: "Uma parede intransponível surge sobre a linha do gol.", manaCost: 46, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Ninguém passa. É simples assim." }),
        player({ id: "a-2", name: "Igor Cerato", number: 2, nationality: "Brasil", flag: "🇧🇷", temperament: "Rápido", position: "DF",
          stats: { velocidade: 78, chute: 40, tecnica: 58, defesa: 72, espirito: 65 },
          power: { name: "Investida Relâmpago", desc: "Sobe a lateral numa velocidade absurda e corta o passe.", manaCost: 34, bonus: 27 },
          start: { row: 3, col: 2 }, assetKey: 2, quote: "Se eu chegar primeiro, já ganhei." }),
        player({ id: "a-3", name: "Matteo Ferrara", number: 3, nationality: "Itália", flag: "🇮🇹", temperament: "Rápido", position: "DF",
          stats: { velocidade: 76, chute: 38, tecnica: 60, defesa: 74, espirito: 66 },
          power: { name: "Corte Preciso", desc: "Antecipa a jogada com um desarme cirúrgico.", manaCost: 34, bonus: 27 },
          start: { row: 5, col: 2 }, assetKey: 3, quote: "Elegância também se defende." }),
        player({ id: "a-4", name: "Baptiste Roc", number: 4, nationality: "França", flag: "🇫🇷", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 50, chute: 25, tecnica: 45, defesa: 85, espirito: 70 },
          power: { name: "Muro de Concreto", desc: "Um bloqueio pesado que ninguém ultrapassa.", manaCost: 36, bonus: 29 },
          start: { row: 1, col: 2 }, assetKey: 4, quote: "Passa por cima do meu corpo. Literalmente." }),
        player({ id: "a-5", name: "Erik Solvang", number: 5, nationality: "Noruega", flag: "🇳🇴", temperament: "Cerebral", position: "LAT",
          stats: { velocidade: 52, chute: 30, tecnica: 68, defesa: 80, espirito: 75 },
          power: { name: "Leitura Perfeita", desc: "Antecipa cada movimento antes que aconteça.", manaCost: 36, bonus: 28 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Eu já sei o que você vai fazer." }),
        player({ id: "a-6", name: "Tomás Ordóñez", number: 6, nationality: "Argentina", flag: "🇦🇷", temperament: "Bruto", position: "MF",
          stats: { velocidade: 58, chute: 45, tecnica: 62, defesa: 70, espirito: 68 },
          power: { name: "Desarme Cirúrgico", desc: "Rouba a bola sem deixar o rival perceber.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Meio de campo é meu escritório." }),
        player({ id: "a-7", name: "Kenji Arata", number: 7, nationality: "Japão", flag: "🇯🇵", temperament: "Rápido", position: "FW",
          stats: { velocidade: 88, chute: 78, tecnica: 70, defesa: 30, espirito: 58 },
          power: { name: "Disparada Fantasma", desc: "Um sprint tão rápido que parece desaparecer.", manaCost: 47, bonus: 35 },
          start: { row: 2, col: 5 }, assetKey: 7, quote: "Você piscou. Eu já passei." }),
        player({ id: "a-8", name: "Youssef Amrani", number: 8, nationality: "Marrocos", flag: "🇲🇦", temperament: "Oportunista", position: "MF",
          stats: { velocidade: 70, chute: 60, tecnica: 72, defesa: 50, espirito: 60 },
          power: { name: "Roubo Silencioso", desc: "Aparece de onde ninguém espera para tomar a bola.", manaCost: 40, bonus: 30 },
          start: { row: 2, col: 4 }, assetKey: 8, quote: "Ninguém me vê chegar." }),
        player({ id: "a-9", name: "Bruno Cetim", number: 9, nationality: "Brasil", flag: "🇧🇷", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 80, chute: 86, tecnica: 68, defesa: 28, espirito: 56 },
          power: { name: "Faro de Gol", desc: "Sempre no lugar certo, na hora certa, para o gol.", manaCost: 48, bonus: 36 },
          start: { row: 4, col: 5 }, assetKey: 9, quote: "Gol é instinto, não sorte." }),
        player({ id: "a-10", name: "Diego Marchetti", number: 10, nationality: "Argentina", flag: "🇦🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 62, chute: 68, tecnica: 88, defesa: 48, espirito: 72 },
          power: { name: "Visão de Mestre", desc: "Enxerga o passe perfeito antes de todo mundo.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 4 }, assetKey: 10, quote: "O jogo se decide na cabeça, não nos pés." }),
        player({ id: "a-11", name: "Lucas Fenwick", number: 11, nationality: "Inglaterra", flag: "🏴", temperament: "Cerebral", position: "FW",
          stats: { velocidade: 74, chute: 75, tecnica: 80, defesa: 32, espirito: 60 },
          power: { name: "Curva Geométrica", desc: "Calcula o ângulo perfeito e curva a bola na entrada da rede.", manaCost: 46, bonus: 34 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "Geometria pura, meu caro." })
      ]
    },
    {
      id: "B", name: "Raptors", shortName: "RAP", kit: "Nike · Roxo & Verde",
      colorVar: "raptor", badge: "🦖", assetPrefix: "RAPTOR",
      attackDir: -1, goalCol: 12, opponentGoalCol: 0,
      players: [
        player({ id: "b-1", name: "Damon Vex", number: 1, nationality: "EUA", flag: "🇺🇸", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 58, chute: 8, tecnica: 44, defesa: 91, espirito: 80 },
          power: { name: "Instinto Predador", desc: "Sente o chute antes mesmo de ele sair do pé do rival.", manaCost: 47, bonus: 35 },
          start: { row: 4, col: 12 }, assetKey: 1, quote: "Meu gol é meu território." }),
        player({ id: "b-2", name: "Kwame Osei", number: 2, nationality: "Gana", flag: "🇬🇭", temperament: "Rápido", position: "DF",
          stats: { velocidade: 82, chute: 42, tecnica: 55, defesa: 70, espirito: 62 },
          power: { name: "Investida Venenosa", desc: "Ataca a jogada com veneno puro na entrada.", manaCost: 34, bonus: 27 },
          start: { row: 3, col: 10 }, assetKey: 2, quote: "Rápido demais para você ver." }),
        player({ id: "b-3", name: "Nikita Volkov", number: 3, nationality: "Rússia", flag: "🇷🇺", temperament: "Rápido", position: "DF",
          stats: { velocidade: 80, chute: 36, tecnica: 57, defesa: 73, espirito: 64 },
          power: { name: "Garra Elétrica", desc: "Uma garra elétrica arranca a bola do rival.", manaCost: 35, bonus: 28 },
          start: { row: 5, col: 10 }, assetKey: 3, quote: "Sinta minhas garras." }),
        player({ id: "b-4", name: "Otto Brandt", number: 4, nationality: "Alemanha", flag: "🇩🇪", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 48, chute: 22, tecnica: 42, defesa: 87, espirito: 68 },
          power: { name: "Mordida de Aço", desc: "Um bote pesado que trava qualquer avanço.", manaCost: 37, bonus: 29 },
          start: { row: 1, col: 10 }, assetKey: 4, quote: "Aqui ninguém passa vivo." }),
        player({ id: "b-5", name: "Kai Marama", number: 5, nationality: "Nova Zelândia", flag: "🇳🇿", temperament: "Cerebral", position: "LAT",
          stats: { velocidade: 54, chute: 28, tecnica: 66, defesa: 78, espirito: 74 },
          power: { name: "Emboscada", desc: "Espera o momento exato para atacar a jogada.", manaCost: 36, bonus: 28 },
          start: { row: 7, col: 10 }, assetKey: 5, quote: "Eu só espero. E ataco." }),
        player({ id: "b-6", name: "Dario Salcedo", number: 6, nationality: "México", flag: "🇲🇽", temperament: "Bruto", position: "MF",
          stats: { velocidade: 56, chute: 48, tecnica: 60, defesa: 72, espirito: 66 },
          power: { name: "Rugido Selvagem", desc: "Um grito que intimida e trava o avanço rival.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 8 }, assetKey: 6, quote: "Escuta esse rugido." }),
        player({ id: "b-7", name: "Zane Kurokawa", number: 7, nationality: "Japão", flag: "🇯🇵", temperament: "Rápido", position: "FW",
          stats: { velocidade: 90, chute: 80, tecnica: 68, defesa: 28, espirito: 56 },
          power: { name: "Bote Venenoso", desc: "Um bote certeiro que envenena a defesa adversária.", manaCost: 48, bonus: 36 },
          start: { row: 2, col: 7 }, assetKey: 7, quote: "Só vai sentir depois que eu já passei." }),
        player({ id: "b-8", name: "Femi Adeyemi", number: 8, nationality: "Nigéria", flag: "🇳🇬", temperament: "Oportunista", position: "MF",
          stats: { velocidade: 74, chute: 62, tecnica: 70, defesa: 48, espirito: 58 },
          power: { name: "Golpe Furtivo", desc: "Ataca a bola sem dar nenhum aviso.", manaCost: 40, bonus: 30 },
          start: { row: 2, col: 8 }, assetKey: 8, quote: "Quando você percebe, já era." }),
        player({ id: "b-9", name: "Milo Draven", number: 9, nationality: "Sérvia", flag: "🇷🇸", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 83, chute: 88, tecnica: 66, defesa: 26, espirito: 54 },
          power: { name: "Instinto Assassino", desc: "Fareja o gol como um predador fareja a presa.", manaCost: 49, bonus: 37 },
          start: { row: 4, col: 7 }, assetKey: 9, quote: "Eu não erro duas vezes." }),
        player({ id: "b-10", name: "Andrea Lupin", number: 10, nationality: "Itália", flag: "🇮🇹", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 64, chute: 66, tecnica: 86, defesa: 46, espirito: 70 },
          power: { name: "Visão de Caçador", desc: "Enxerga a presa (a bola) antes de todos em campo.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 8 }, assetKey: 10, quote: "Eu caço o jogo inteiro, não só a bola." }),
        player({ id: "b-11", name: "Storm Kekoa", number: 11, nationality: "Havaí (EUA)", flag: "🇺🇸", temperament: "Cerebral", position: "FW",
          stats: { velocidade: 76, chute: 77, tecnica: 78, defesa: 30, espirito: 58 },
          power: { name: "Fúria Tropical", desc: "Uma explosão de energia que abre espaço do nada.", manaCost: 46, bonus: 34 },
          start: { row: 6, col: 7 }, assetKey: 11, quote: "A tempestade sou eu." })
      ]
    }
  ];

  return { POSITIONS: POSITIONS, TEMPERAMENTS: TEMPERAMENTS, STATS: STATS, TEAMS: TEAMS };

})();
