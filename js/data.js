/* =========================================================
   XEQUE TOTAL — dados dos times, jogadores, temperamentos e poderes
   Tabuleiro horizontal: 13 colunas (0-12) x 9 linhas (0-8).

   GAME_DATA.TEAMS é um POOL de squads escolhíveis (não são mais
   times fixos A/B). Cada squad guarda sua formação em ORIENTAÇÃO
   CANÔNICA "esquerda" (como se sempre defendesse a coluna 0 e
   atacasse a coluna 12) — quem decide o lado real em campo (slot A
   ou B, direção de ataque, coluna do gol) é GAME.start(), na hora
   de montar a partida (ver SLOT_META em js/game.js).

   O movimento de cada jogador é definido pelo TEMPERAMENTO (exceto
   o goleiro, que sempre se move como Rei-de-xadrez/1 casa). A única
   exceção de peso: a personalidade "Rei" (exclusiva do Dadá
   Majestade) se move como uma dama sem limite de alcance.
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
    "Oportunista": { shape: "knight", maxDist: null, icon: "🎯", moveLabel: "Cavalo (salto em L)" },
    "Rei": { shape: "queen", maxDist: null, icon: "👑", moveLabel: "Dama (reta e diagonal, sem limite de alcance)" }
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
      id: "TEC", name: "Tecos", shortName: "TEC", kit: "Adidas · Branco",
      colorVar: "teco", badge: "🛡️", assetPrefix: "TECO",
      players: [
        player({ id: "tec-1", name: "Rafael Muralha", number: 1, nationality: "Brasil", flag: "🇧🇷", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 55, chute: 10, tecnica: 45, defesa: 90, espirito: 82 },
          power: { name: "Muralha Adamantina", desc: "Uma parede intransponível surge sobre a linha do gol.", manaCost: 46, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Ninguém passa. É simples assim." }),
        player({ id: "tec-2", name: "Igor Cerato", number: 2, nationality: "Brasil", flag: "🇧🇷", temperament: "Rápido", position: "DF",
          stats: { velocidade: 78, chute: 40, tecnica: 58, defesa: 72, espirito: 65 },
          power: { name: "Investida Relâmpago", desc: "Sobe a lateral numa velocidade absurda e corta o passe.", manaCost: 34, bonus: 27 },
          start: { row: 3, col: 2 }, assetKey: 2, quote: "Se eu chegar primeiro, já ganhei." }),
        player({ id: "tec-3", name: "Matteo Ferrara", number: 3, nationality: "Itália", flag: "🇮🇹", temperament: "Rápido", position: "DF",
          stats: { velocidade: 76, chute: 38, tecnica: 60, defesa: 74, espirito: 66 },
          power: { name: "Corte Preciso", desc: "Antecipa a jogada com um desarme cirúrgico.", manaCost: 34, bonus: 27 },
          start: { row: 5, col: 2 }, assetKey: 3, quote: "Elegância também se defende." }),
        player({ id: "tec-4", name: "Baptiste Roc", number: 4, nationality: "França", flag: "🇫🇷", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 50, chute: 25, tecnica: 45, defesa: 85, espirito: 70 },
          power: { name: "Muro de Concreto", desc: "Um bloqueio pesado que ninguém ultrapassa.", manaCost: 36, bonus: 29 },
          start: { row: 1, col: 2 }, assetKey: 4, quote: "Passa por cima do meu corpo. Literalmente." }),
        player({ id: "tec-5", name: "Erik Solvang", number: 5, nationality: "Noruega", flag: "🇳🇴", temperament: "Cerebral", position: "LAT",
          stats: { velocidade: 52, chute: 30, tecnica: 68, defesa: 80, espirito: 75 },
          power: { name: "Leitura Perfeita", desc: "Antecipa cada movimento antes que aconteça.", manaCost: 36, bonus: 28 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Eu já sei o que você vai fazer." }),
        player({ id: "tec-6", name: "Tomás Ordóñez", number: 6, nationality: "Argentina", flag: "🇦🇷", temperament: "Bruto", position: "MF",
          stats: { velocidade: 58, chute: 45, tecnica: 62, defesa: 70, espirito: 68 },
          power: { name: "Desarme Cirúrgico", desc: "Rouba a bola sem deixar o rival perceber.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Meio de campo é meu escritório." }),
        player({ id: "tec-7", name: "Kenji Arata", number: 7, nationality: "Japão", flag: "🇯🇵", temperament: "Rápido", position: "FW",
          stats: { velocidade: 88, chute: 78, tecnica: 70, defesa: 30, espirito: 58 },
          power: { name: "Disparada Fantasma", desc: "Um sprint tão rápido que parece desaparecer.", manaCost: 47, bonus: 35 },
          start: { row: 2, col: 5 }, assetKey: 7, quote: "Você piscou. Eu já passei." }),
        player({ id: "tec-8", name: "Youssef Amrani", number: 8, nationality: "Marrocos", flag: "🇲🇦", temperament: "Oportunista", position: "MF",
          stats: { velocidade: 70, chute: 60, tecnica: 72, defesa: 50, espirito: 60 },
          power: { name: "Roubo Silencioso", desc: "Aparece de onde ninguém espera para tomar a bola.", manaCost: 40, bonus: 30 },
          start: { row: 2, col: 4 }, assetKey: 8, quote: "Ninguém me vê chegar." }),
        player({ id: "tec-9", name: "Bruno Cetim", number: 9, nationality: "Brasil", flag: "🇧🇷", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 80, chute: 86, tecnica: 68, defesa: 28, espirito: 56 },
          power: { name: "Faro de Gol", desc: "Sempre no lugar certo, na hora certa, para o gol.", manaCost: 48, bonus: 36 },
          start: { row: 4, col: 5 }, assetKey: 9, quote: "Gol é instinto, não sorte." }),
        player({ id: "tec-10", name: "Diego Marchetti", number: 10, nationality: "Argentina", flag: "🇦🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 62, chute: 68, tecnica: 88, defesa: 48, espirito: 72 },
          power: { name: "Visão de Mestre", desc: "Enxerga o passe perfeito antes de todo mundo.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 4 }, assetKey: 10, quote: "O jogo se decide na cabeça, não nos pés." }),
        player({ id: "tec-11", name: "Lucas Fenwick", number: 11, nationality: "Inglaterra", flag: "🏴", temperament: "Cerebral", position: "FW",
          stats: { velocidade: 74, chute: 75, tecnica: 80, defesa: 32, espirito: 60 },
          power: { name: "Curva Geométrica", desc: "Calcula o ângulo perfeito e curva a bola na entrada da rede.", manaCost: 46, bonus: 34 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "Geometria pura, meu caro." })
      ]
    },
    {
      id: "RAP", name: "Raptors", shortName: "RAP", kit: "Nike · Roxo & Verde",
      colorVar: "raptor", badge: "🦖", assetPrefix: "RAPTOR",
      players: [
        player({ id: "rap-1", name: "Damon Vex", number: 1, nationality: "EUA", flag: "🇺🇸", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 58, chute: 8, tecnica: 44, defesa: 91, espirito: 80 },
          power: { name: "Instinto Predador", desc: "Sente o chute antes mesmo de ele sair do pé do rival.", manaCost: 47, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Meu gol é meu território." }),
        player({ id: "rap-2", name: "Kwame Osei", number: 2, nationality: "Gana", flag: "🇬🇭", temperament: "Rápido", position: "DF",
          stats: { velocidade: 82, chute: 42, tecnica: 55, defesa: 70, espirito: 62 },
          power: { name: "Investida Venenosa", desc: "Ataca a jogada com veneno puro na entrada.", manaCost: 34, bonus: 27 },
          start: { row: 3, col: 2 }, assetKey: 2, quote: "Rápido demais para você ver." }),
        player({ id: "rap-3", name: "Nikita Volkov", number: 3, nationality: "Rússia", flag: "🇷🇺", temperament: "Rápido", position: "DF",
          stats: { velocidade: 80, chute: 36, tecnica: 57, defesa: 73, espirito: 64 },
          power: { name: "Garra Elétrica", desc: "Uma garra elétrica arranca a bola do rival.", manaCost: 35, bonus: 28 },
          start: { row: 5, col: 2 }, assetKey: 3, quote: "Sinta minhas garras." }),
        player({ id: "rap-4", name: "Otto Brandt", number: 4, nationality: "Alemanha", flag: "🇩🇪", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 48, chute: 22, tecnica: 42, defesa: 87, espirito: 68 },
          power: { name: "Mordida de Aço", desc: "Um bote pesado que trava qualquer avanço.", manaCost: 37, bonus: 29 },
          start: { row: 1, col: 2 }, assetKey: 4, quote: "Aqui ninguém passa vivo." }),
        player({ id: "rap-5", name: "Kai Marama", number: 5, nationality: "Nova Zelândia", flag: "🇳🇿", temperament: "Cerebral", position: "LAT",
          stats: { velocidade: 54, chute: 28, tecnica: 66, defesa: 78, espirito: 74 },
          power: { name: "Emboscada", desc: "Espera o momento exato para atacar a jogada.", manaCost: 36, bonus: 28 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Eu só espero. E ataco." }),
        player({ id: "rap-6", name: "Dario Salcedo", number: 6, nationality: "México", flag: "🇲🇽", temperament: "Bruto", position: "MF",
          stats: { velocidade: 56, chute: 48, tecnica: 60, defesa: 72, espirito: 66 },
          power: { name: "Rugido Selvagem", desc: "Um grito que intimida e trava o avanço rival.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Escuta esse rugido." }),
        player({ id: "rap-7", name: "Zane Kurokawa", number: 7, nationality: "Japão", flag: "🇯🇵", temperament: "Rápido", position: "FW",
          stats: { velocidade: 90, chute: 80, tecnica: 68, defesa: 28, espirito: 56 },
          power: { name: "Bote Venenoso", desc: "Um bote certeiro que envenena a defesa adversária.", manaCost: 48, bonus: 36 },
          start: { row: 2, col: 5 }, assetKey: 7, quote: "Só vai sentir depois que eu já passei." }),
        player({ id: "rap-8", name: "Femi Adeyemi", number: 8, nationality: "Nigéria", flag: "🇳🇬", temperament: "Oportunista", position: "MF",
          stats: { velocidade: 74, chute: 62, tecnica: 70, defesa: 48, espirito: 58 },
          power: { name: "Golpe Furtivo", desc: "Ataca a bola sem dar nenhum aviso.", manaCost: 40, bonus: 30 },
          start: { row: 2, col: 4 }, assetKey: 8, quote: "Quando você percebe, já era." }),
        player({ id: "rap-9", name: "Milo Draven", number: 9, nationality: "Sérvia", flag: "🇷🇸", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 83, chute: 88, tecnica: 66, defesa: 26, espirito: 54 },
          power: { name: "Instinto Assassino", desc: "Fareja o gol como um predador fareja a presa.", manaCost: 49, bonus: 37 },
          start: { row: 4, col: 5 }, assetKey: 9, quote: "Eu não erro duas vezes." }),
        player({ id: "rap-10", name: "Andrea Lupin", number: 10, nationality: "Itália", flag: "🇮🇹", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 64, chute: 66, tecnica: 86, defesa: 46, espirito: 70 },
          power: { name: "Visão de Caçador", desc: "Enxerga a presa (a bola) antes de todos em campo.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 4 }, assetKey: 10, quote: "Eu caço o jogo inteiro, não só a bola." }),
        player({ id: "rap-11", name: "Storm Kekoa", number: 11, nationality: "Havaí (EUA)", flag: "🇺🇸", temperament: "Cerebral", position: "FW",
          stats: { velocidade: 76, chute: 77, tecnica: 78, defesa: 30, espirito: 58 },
          power: { name: "Fúria Tropical", desc: "Uma explosão de energia que abre espaço do nada.", manaCost: 46, bonus: 34 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "A tempestade sou eu." })
      ]
    },
    {
      id: "BRA", name: "Brasil", shortName: "BRA", kit: "CBF · Amarelo-Canarinho",
      colorVar: "brasil", badge: "🇧🇷", assetPrefix: "BRASIL",
      players: [
        player({ id: "bra-1", name: "Vadinho Paredão", number: 1, nationality: "Brasil", flag: "🇧🇷", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 50, chute: 10, tecnica: 48, defesa: 89, espirito: 85 },
          power: { name: "Milagre da Área", desc: "Uma defesa impossível que vira lenda instantânea.", manaCost: 46, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Bola que passa por mim paga pedágio." }),
        player({ id: "bra-2", name: "Deco Metrô", number: 2, nationality: "Brasil", flag: "🇧🇷", temperament: "Rápido", position: "LAT",
          stats: { velocidade: 90, chute: 45, tecnica: 66, defesa: 75, espirito: 78 },
          power: { name: "Sobe e Desce Infinito", desc: "Corre a lateral inteira sem perder o fôlego, ida e volta.", manaCost: 36, bonus: 29 },
          start: { row: 1, col: 2 }, assetKey: 2, quote: "Eu não tenho posição fixa, eu tenho rota." }),
        player({ id: "bra-3", name: "Lucão Trator", number: 3, nationality: "Brasil", flag: "🇧🇷", temperament: "Bruto", position: "DF",
          stats: { velocidade: 72, chute: 50, tecnica: 58, defesa: 86, espirito: 75 },
          power: { name: "Cabeçada de Aço", desc: "Sobe mais alto que todo mundo e manda embora de cabeça.", manaCost: 35, bonus: 28 },
          start: { row: 3, col: 2 }, assetKey: 3, quote: "Bola aérea é meu almoço." }),
        player({ id: "bra-4", name: "Osvaldo Taça-Alta", number: 4, nationality: "Brasil", flag: "🇧🇷", temperament: "Bruto", position: "DF",
          stats: { velocidade: 55, chute: 30, tecnica: 55, defesa: 84, espirito: 88 },
          power: { name: "Liderança Inabalável", desc: "Levanta o time e a marcação com a mesma força.", manaCost: 34, bonus: 27 },
          start: { row: 5, col: 2 }, assetKey: 4, quote: "Capitão não recua." }),
        player({ id: "bra-5", name: "Beto Trovão", number: 5, nationality: "Brasil", flag: "🇧🇷", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 87, chute: 82, tecnica: 70, defesa: 73, espirito: 72 },
          power: { name: "Chute Curva-Mundo", desc: "Um chute tão forte e curvo que desafia a física.", manaCost: 37, bonus: 29 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Se eu bater, a rede que se cuide." }),
        player({ id: "bra-6", name: "Valdomiro Folha-Seca", number: 6, nationality: "Brasil", flag: "🇧🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 58, chute: 65, tecnica: 85, defesa: 55, espirito: 80 },
          power: { name: "Folha Seca", desc: "Um chute de efeito que cai na hora certa, sem aviso.", manaCost: 40, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Vento nenhum decide onde a bola cai. Eu decido." }),
        player({ id: "bra-7", name: "Arthur Galo-de-Aço", number: 7, nationality: "Brasil", flag: "🇧🇷", temperament: "Oportunista", position: "MF",
          stats: { velocidade: 72, chute: 84, tecnica: 87, defesa: 40, espirito: 74 },
          power: { name: "Bico Certeiro", desc: "Aparece na hora exata pra cravar o gol impossível.", manaCost: 41, bonus: 31 },
          start: { row: 2, col: 4 }, assetKey: 7, quote: "Cocorocó. Foi gol." }),
        player({ id: "bra-8", name: "Renato Sabença", number: 8, nationality: "Brasil", flag: "🇧🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 60, chute: 66, tecnica: 86, defesa: 45, espirito: 85 },
          power: { name: "Diagnóstico Preciso", desc: "Lê o jogo inteiro antes de todo mundo e prescreve o passe certo.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 4 }, assetKey: 8, quote: "Chamem-me apenas de Doutor." }),
        player({ id: "bra-9", name: "Joel Zigue-Zague", number: 9, nationality: "Brasil", flag: "🇧🇷", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 85, chute: 70, tecnica: 92, defesa: 22, espirito: 68 },
          power: { name: "Requebro Impossível", desc: "Um drible tão absurdo que a marcação simplesmente desaparece.", manaCost: 48, bonus: 36 },
          start: { row: 2, col: 5 }, assetKey: 9, quote: "Marcador? Nunca vi um de perto." }),
        player({ id: "bra-10", name: "Dadá Majestade", number: 10, nationality: "Brasil", flag: "🇧🇷", temperament: "Rei", position: "FW",
          stats: { velocidade: 86, chute: 90, tecnica: 95, defesa: 35, espirito: 92 },
          power: { name: "Toque de Rei", desc: "Um chute de tal categoria que até o goleiro tira o chapéu.", manaCost: 49, bonus: 37 },
          start: { row: 4, col: 5 }, assetKey: 10, quote: "Chama o Rei." }),
        player({ id: "bra-11", name: "Nando Fenômeno", number: 11, nationality: "Brasil", flag: "🇧🇷", temperament: "Rápido", position: "FW",
          stats: { velocidade: 89, chute: 88, tecnica: 84, defesa: 26, espirito: 70 },
          power: { name: "Explosão Fenomenal", desc: "Acelera de um jeito que a defesa nem processa o que aconteceu.", manaCost: 48, bonus: 36 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "Fenômeno não se explica. Se assiste." })
      ]
    },
    {
      id: "ALE", name: "Alemanha", shortName: "ALE", kit: "DFB · Preto & Ouro",
      colorVar: "alemanha", badge: "🇩🇪", assetPrefix: "ALEMANHA",
      players: [
        player({ id: "ale-1", name: "Manfred Zagoleiro", number: 1, nationality: "Alemanha", flag: "🇩🇪", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 62, chute: 15, tecnica: 55, defesa: 90, espirito: 83 },
          power: { name: "Goleiro-Linha", desc: "Sai da área como um zagueiro extra e ainda assim defende tudo.", manaCost: 47, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Minha área é o campo inteiro." }),
        player({ id: "ale-2", name: "Phil Anão-Mágico", number: 2, nationality: "Alemanha", flag: "🇩🇪", temperament: "Cerebral", position: "LAT",
          stats: { velocidade: 68, chute: 40, tecnica: 78, defesa: 78, espirito: 84 },
          power: { name: "Leitura Tática", desc: "Antecipa a jogada inteira antes mesmo dela começar.", manaCost: 36, bonus: 28 },
          start: { row: 1, col: 2 }, assetKey: 2, quote: "Pequeno de estatura, gigante de cabeça." }),
        player({ id: "ale-3", name: "Franzl Imperador", number: 3, nationality: "Alemanha", flag: "🇩🇪", temperament: "Cerebral", position: "DF",
          stats: { velocidade: 66, chute: 48, tecnica: 88, defesa: 82, espirito: 86 },
          power: { name: "Passe Real", desc: "Um lançamento tão preciso que parece ordem de comando.", manaCost: 35, bonus: 28 },
          start: { row: 3, col: 2 }, assetKey: 3, quote: "Eu não defendo. Eu governo a zaga." }),
        player({ id: "ale-4", name: "Dieter Libero-Voador", number: 4, nationality: "Alemanha", flag: "🇩🇪", temperament: "Rápido", position: "DF",
          stats: { velocidade: 80, chute: 52, tecnica: 74, defesa: 79, espirito: 76 },
          power: { name: "Arrancada do Líbero", desc: "Sai jogando lá de trás numa corrida que ninguém acompanha.", manaCost: 35, bonus: 28 },
          start: { row: 5, col: 2 }, assetKey: 4, quote: "Defesa também pode terminar em gol." }),
        player({ id: "ale-5", name: "Andi Pênalti-de-Ouro", number: 5, nationality: "Alemanha", flag: "🇩🇪", temperament: "Oportunista", position: "LAT",
          stats: { velocidade: 62, chute: 70, tecnica: 72, defesa: 76, espirito: 80 },
          power: { name: "Cobrança Fria", desc: "Na hora mais tensa, o pé não treme.", manaCost: 36, bonus: 28 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Pênalti decisivo? Chama a mim." }),
        player({ id: "ale-6", name: "Lothar Motorzão", number: 6, nationality: "Alemanha", flag: "🇩🇪", temperament: "Bruto", position: "MF",
          stats: { velocidade: 66, chute: 62, tecnica: 70, defesa: 66, espirito: 82 },
          power: { name: "Motor Incansável", desc: "Corre o jogo inteiro sem baixar o ritmo nem por um segundo.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Eu não canso. Eu recarrego correndo." }),
        player({ id: "ale-7", name: "Toni Compasso", number: 7, nationality: "Alemanha", flag: "🇩🇪", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 58, chute: 58, tecnica: 89, defesa: 50, espirito: 78 },
          power: { name: "Passe Cirúrgico", desc: "Encontra o companheiro certo mesmo do outro lado do campo.", manaCost: 40, bonus: 30 },
          start: { row: 2, col: 4 }, assetKey: 7, quote: "Eu meço o passe em milímetros." }),
        player({ id: "ale-8", name: "Mesüt Raio-X", number: 8, nationality: "Alemanha", flag: "🇩🇪", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 64, chute: 55, tecnica: 87, defesa: 42, espirito: 75 },
          power: { name: "Visão de Raio-X", desc: "Enxerga o espaço vazio antes dele existir.", manaCost: 40, bonus: 30 },
          start: { row: 6, col: 4 }, assetKey: 8, quote: "Eu já vi esse passe na minha cabeça há três jogadas." }),
        player({ id: "ale-9", name: "Tommy Faro-Espacial", number: 9, nationality: "Alemanha", flag: "🇩🇪", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 78, chute: 80, tecnica: 72, defesa: 30, espirito: 72 },
          power: { name: "Faro de Espaço", desc: "Sempre está exatamente onde a defesa não imaginava.", manaCost: 48, bonus: 36 },
          start: { row: 2, col: 5 }, assetKey: 9, quote: "Ninguém sabe explicar como eu cheguei ali. Nem eu." }),
        player({ id: "ale-10", name: "Miro Cambalhota", number: 10, nationality: "Alemanha", flag: "🇩🇪", temperament: "Rápido", position: "FW",
          stats: { velocidade: 82, chute: 84, tecnica: 70, defesa: 28, espirito: 70 },
          power: { name: "Voleio Acrobático", desc: "Termina a jogada com uma cambalhota e a bola no fundo da rede.", manaCost: 47, bonus: 35 },
          start: { row: 4, col: 5 }, assetKey: 10, quote: "Gol eu comemoro no ar." }),
        player({ id: "ale-11", name: "Gerdão Bombardeiro", number: 11, nationality: "Alemanha", flag: "🇩🇪", temperament: "Bruto", position: "FW",
          stats: { velocidade: 74, chute: 89, tecnica: 68, defesa: 26, espirito: 66 },
          power: { name: "Bombardeio na Área", desc: "Dentro da área pequena, ninguém finaliza mais rápido.", manaCost: 48, bonus: 36 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "Área é meu território de caça." })
      ]
    },
    {
      id: "FRA", name: "França", shortName: "FRA", kit: "FFF · Azul Blues",
      colorVar: "franca", badge: "🇫🇷", assetPrefix: "FRANCA",
      players: [
        player({ id: "fra-1", name: "Fabinho Careca-da-Sorte", number: 1, nationality: "França", flag: "🇫🇷", temperament: "Cerebral", position: "GK",
          stats: { velocidade: 56, chute: 12, tecnica: 50, defesa: 90, espirito: 84 },
          power: { name: "Escanteio Blindado", desc: "Não sai bola nenhuma perto da trave enquanto ele estiver ali.", manaCost: 46, bonus: 35 },
          start: { row: 4, col: 0 }, assetKey: 1, quote: "Careca dá sorte. Pergunta pra taça." }),
        player({ id: "fra-2", name: "Lilico Zaga-Surpresa", number: 2, nationality: "França", flag: "🇫🇷", temperament: "Oportunista", position: "LAT",
          stats: { velocidade: 76, chute: 58, tecnica: 66, defesa: 78, espirito: 74 },
          power: { name: "Gol Inesperado", desc: "Sobe pra área e marca justamente quando ninguém espera.", manaCost: 37, bonus: 29 },
          start: { row: 1, col: 2 }, assetKey: 2, quote: "Defensor também pode decidir a partida." }),
        player({ id: "fra-3", name: "Marcel Rochedo", number: 3, nationality: "França", flag: "🇫🇷", temperament: "Bruto", position: "DF",
          stats: { velocidade: 64, chute: 38, tecnica: 62, defesa: 88, espirito: 80 },
          power: { name: "Muralha de Pedra", desc: "Um desarme tão sólido que parece bater numa rocha de verdade.", manaCost: 35, bonus: 28 },
          start: { row: 3, col: 2 }, assetKey: 3, quote: "Ninguém quebra essa pedra." }),
        player({ id: "fra-4", name: "Laurentino Presidente", number: 4, nationality: "França", flag: "🇫🇷", temperament: "Cerebral", position: "DF",
          stats: { velocidade: 62, chute: 42, tecnica: 80, defesa: 83, espirito: 85 },
          power: { name: "Decreto Presidencial", desc: "Organiza a zaga inteira com autoridade absoluta.", manaCost: 34, bonus: 27 },
          start: { row: 5, col: 2 }, assetKey: 4, quote: "Aqui quem manda na defesa sou eu." }),
        player({ id: "fra-5", name: "Bixente Judoca", number: 5, nationality: "França", flag: "🇫🇷", temperament: "Bruto", position: "LAT",
          stats: { velocidade: 70, chute: 40, tecnica: 64, defesa: 85, espirito: 78 },
          power: { name: "Golpe de Judô", desc: "Desarma o adversário com a precisão de uma faixa preta.", manaCost: 37, bonus: 29 },
          start: { row: 7, col: 2 }, assetKey: 5, quote: "Categoria de peso não me assusta." }),
        player({ id: "fra-6", name: "N'Golinho Pulmão-de-Aço", number: 6, nationality: "França", flag: "🇫🇷", temperament: "Rápido", position: "MF",
          stats: { velocidade: 84, chute: 55, tecnica: 76, defesa: 82, espirito: 88 },
          power: { name: "Desarme Relâmpago", desc: "Recupera a bola tão rápido que parece estar em dois lugares ao mesmo tempo.", manaCost: 39, bonus: 30 },
          start: { row: 4, col: 4 }, assetKey: 6, quote: "Tem só um de mim. Mas parecem dois." }),
        player({ id: "fra-7", name: "Michel Batuta", number: 7, nationality: "França", flag: "🇫🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 60, chute: 80, tecnica: 88, defesa: 45, espirito: 82 },
          power: { name: "Falta Magistral", desc: "Rege a cobrança de falta como uma orquestra inteira.", manaCost: 41, bonus: 31 },
          start: { row: 2, col: 4 }, assetKey: 7, quote: "Eu não chuto a falta. Eu a componho." }),
        player({ id: "fra-8", name: "Yannick Malabarista", number: 8, nationality: "França", flag: "🇫🇷", temperament: "Cerebral", position: "MF",
          stats: { velocidade: 66, chute: 78, tecnica: 92, defesa: 46, espirito: 80 },
          power: { name: "Giro de Marselha", desc: "Um giro tão elegante que engana até quem está assistindo pela TV.", manaCost: 41, bonus: 31 },
          start: { row: 6, col: 4 }, assetKey: 8, quote: "A bola obedece antes de eu tocar nela." }),
        player({ id: "fra-9", name: "Kiki Vapor", number: 9, nationality: "França", flag: "🇫🇷", temperament: "Rápido", position: "FW",
          stats: { velocidade: 92, chute: 85, tecnica: 80, defesa: 24, espirito: 68 },
          power: { name: "Rajada de Vento", desc: "Acelera tão forte que vira só um borrão pra defesa.", manaCost: 47, bonus: 35 },
          start: { row: 2, col: 5 }, assetKey: 9, quote: "Você piscou? Já era." }),
        player({ id: "fra-10", name: "Titi Estiloso", number: 10, nationality: "França", flag: "🇫🇷", temperament: "Cerebral", position: "FW",
          stats: { velocidade: 84, chute: 87, tecnica: 84, defesa: 26, espirito: 72 },
          power: { name: "Finalização Estilosa", desc: "Define com uma classe que faz o gol parecer fácil.", manaCost: 46, bonus: 34 },
          start: { row: 4, col: 5 }, assetKey: 10, quote: "Gol também pode ter estilo." }),
        player({ id: "fra-11", name: "Franckinho Requebro", number: 11, nationality: "França", flag: "🇫🇷", temperament: "Oportunista", position: "FW",
          stats: { velocidade: 80, chute: 76, tecnica: 86, defesa: 28, espirito: 74 },
          power: { name: "Requebro Desconcertante", desc: "Um drible tão inesperado que o marcador cai sozinho.", manaCost: 48, bonus: 36 },
          start: { row: 6, col: 5 }, assetKey: 11, quote: "Minha perna tem samba escondido." })
      ]
    }
  ];

  return { POSITIONS: POSITIONS, TEMPERAMENTS: TEMPERAMENTS, STATS: STATS, TEAMS: TEAMS };

})();
