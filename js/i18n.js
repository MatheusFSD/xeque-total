/* =========================================================
   QUADRADO MÁGICO — tradução (pt-BR / en)

   A CHAVE DO DICIONÁRIO É O PRÓPRIO TEXTO EM PORTUGUÊS. Isso é de
   propósito: o código-fonte continua legível (`T("Sua vez")` em vez de
   `T("hud.turn.you")`), e qualquer string sem tradução cai de volta no
   português em vez de aparecer como uma chave crua na tela.

   Interpolação: use {0}, {1}... e passe os valores em T().
       T("{0} rouba a bola de {1}", a, b)

   No HTML, marque o elemento e o texto que já está lá vira a chave:
       data-i18n            -> textContent
       data-i18n-html       -> innerHTML (quando o texto tem <strong> dentro)
       data-i18n-title      -> atributo title
       data-i18n-ph         -> atributo placeholder
       data-i18n-aria       -> atributo aria-label
   O texto original é guardado em dataset na primeira aplicação, então dá
   pra ir e voltar de idioma quantas vezes quiser sem perder a chave.
========================================================= */

var I18N = (function () {
  "use strict";

  var STORAGE_KEY = "xequeTotalLang"; // mesmo prefixo das outras chaves salvas
  var LANGS = ["pt", "en"];

  var EN = {

    /* ---------- tela de abertura ---------- */
    "Quadrado Mágico — Xadrez × Futebol": "Quadrado Mágico — Chess × Football",
    "Modo noturno": "Night mode",
    "Configurações da partida": "Match settings",
    "Turnos por tempo (1º + 2º tempo)": "Turns per half (1st + 2nd)",
    "Sem limite de turnos — a partida termina quando um time fizer 3 gols":
      "No turn limit — the match ends when a team scores 3 goals",
    "🔊 Efeitos sonoros": "🔊 Sound effects",
    "Idioma": "Language",
    "XADREZ TÁTICO DE FUTEBOL": "TACTICAL FOOTBALL CHESS",
    "Mova pela personalidade de cada jogador. Passe, chute ou dispute um Duelo — Ação ou Poder. Marque o gol.":
      "Move by each player's personality. Pass, shoot or fight a Duel — Action or Power. Score the goal.",
    "Amistoso": "Friendly",
    "Copa": "World Cup",
    "2 Jogadores": "2 Players",
    "Campanha": "Campaign",
    "Como jogar?": "How to play?",

    "<strong>Movimento:</strong> não é a posição que define o passo — é a <strong>personalidade</strong>. Rápido = Bispo, Bruto = Torre, Cerebral = Dama curta, Oportunista = Cavalo. O Goleiro é sempre Rei-de-xadrez (1 casa). O <strong>Rápido</strong> tem um truque só dele: se a diagonal bater na linha lateral, ela <strong>rebate</strong> e continua em vez de acabar.":
      "<strong>Movement:</strong> the step isn't set by the position — it's set by the <strong>personality</strong>. Quick = Bishop, Brute = Rook, Cerebral = short Queen, Opportunist = Knight. The Goalkeeper always moves like a chess King (1 square). The <strong>Quick</strong> has a trick of his own: if the diagonal hits the touchline, it <strong>bounces</strong> and carries on instead of ending.",
    "<strong>Bola:</strong> pare em cima dela para dominá-la.":
      "<strong>Ball:</strong> stop on it to take possession.",
    "<strong>Passe:</strong> com a bola, envie para um companheiro dentro do seu raio de movimento (destaque azul). O Goleiro é exceção: pode lançar em qualquer casa até a linha de meio-campo.":
      "<strong>Pass:</strong> with the ball, send it to a team-mate inside your movement range (highlighted blue). The Goalkeeper is the exception: he can throw to any square up to the halfway line.",
    "<strong>Chute:</strong> depois de cruzar o meio-campo, chute de onde estiver — quanto mais longe do gol, mais difícil.":
      "<strong>Shot:</strong> once past the halfway line, shoot from wherever you are — the farther from goal, the harder it gets.",
    "<strong>Duelo:</strong> ao mover para cima de um adversário, escolha uma Ação básica (grátis) ou um Poder especial (consome Mana, mais forte).":
      "<strong>Duel:</strong> when you move onto an opponent, pick a basic Action (free) or a special Power (costs Mana, stronger).",
    "Quem tiver mais gols quando o tempo acabar, vence!":
      "Whoever has more goals when time runs out wins!",

    /* ---------- seleção de equipe ---------- */
    "Voltar": "Back",
    "⚽ Iniciar Partida": "⚽ Start Match",
    "Toque num time pra ser o seu": "Tap a team to make it yours",
    "Agora toque no time do adversário": "Now tap the opponent's team",
    "Tudo pronto — toque em outro time pra trocar": "All set — tap another team to change",
    "Tudo pronto — toque em outra seleção pra trocar": "All set — tap another nation to change",
    "Escolha sua seleção pra Copa": "Pick your nation for the World Cup",
    "Jogador 1, escolha seu time": "Player 1, pick your team",
    "Jogador 2, escolha seu time": "Player 2, pick your team",
    "SUA SELEÇÃO": "YOUR NATION",
    "SEU TIME": "YOUR TEAM",
    "ADVERSÁRIO": "OPPONENT",
    "JOGADOR 1": "PLAYER 1",
    "JOGADOR 2": "PLAYER 2",
    "2 JOGADORES": "2 PLAYERS",
    "Escolhido:": "Picked:",

    /* ---------- HUD / painéis ---------- */
    "TORRE SEGUROS": "ROOK INSURANCE",
    "Proteção Total": "Total Protection",
    "CAVALO ENERGIA": "KNIGHT ENERGY",
    "Salta na Frente": "Leap Ahead",
    "Seu time": "Your team",
    "Adversário": "Opponent",
    "Ficha do Jogador": "Player Card",
    "Selecione um jogador no time ou no campo pra ver a ficha completa.":
      "Select a player from the squad or the pitch to see the full card.",
    "Menu": "Menu",
    "Fechar": "Close",
    "Sua vez": "Your turn",
    "Vez do adversário": "Opponent's turn",
    "Pensando...": "Thinking...",
    "Vez:": "Turn:",
    "ÁREA": "BOX",
    "Movimento:": "Movement:",
    "Habilidade": "Ability",

    /* ---------- duelo ---------- */
    "DUELO!": "DUEL!",
    "DUELO NO CAMPO!": "DUEL ON THE PITCH!",
    "CHANCE DE GOL!": "GOAL CHANCE!",
    "Continuar": "Continue",
    "Continuar ➜": "Continue ➜",
    "Ação Básica": "Basic Action",
    "Sem custo de mana": "No mana cost",
    "Portador da Bola": "Ball Carrier",
    "Bônus:": "Bonus:",
    "VENCEU!": "WINS!",
    "DEFESA!": "SAVE!",
    "GOL!!!": "GOAL!!!",
    "Chutar — dificuldade:": "Shoot — difficulty:",
    "Chute de longe — dificuldade": "Long-range shot — difficulty",

    /* ---------- dificuldade de chute ---------- */
    "Fácil": "Easy",
    "Média": "Medium",
    "Difícil": "Hard",
    "Quase impossível": "Almost impossible",

    /* ---------- gol / intervalo / fim ---------- */
    "GOOOOL!": "GOOOOAL!",
    "FIM DO 1º TEMPO": "END OF THE FIRST HALF",
    "Os times trocam de lado...": "The teams switch sides...",
    "FIM DE JOGO": "FULL TIME",
    "Fim de jogo": "Full time",
    "VITÓRIA": "VICTORY",
    "🔄 Jogar Novamente": "🔄 Play Again",
    "Jogar Novamente": "Play Again",
    "Voltar ao Menu Principal": "Back to Main Menu",
    "Voltar ao Menu": "Back to Menu",
    "Voltar ao menu inicial? O progresso da partida atual será perdido.":
      "Back to the main menu? The current match progress will be lost.",
    "Voltar ao menu inicial? O progresso da Copa será perdido.":
      "Back to the main menu? Your World Cup progress will be lost.",
    "Voltar ao menu inicial? O progresso da partida e da Copa serão perdidos.":
      "Back to the main menu? Both the match and the World Cup progress will be lost.",
    "Voltar ao menu inicial? A partida atual (ainda não concluída) será perdida, mas sua Campanha salva continua de onde parou.":
      "Back to the main menu? The current (unfinished) match will be lost, but your saved Campaign carries on where it left off.",
    "Você dominou o campo do início ao fim!": "You owned the pitch from first whistle to last!",
    "O adversário levou a melhor desta vez. Revanche?": "The opponent got the better of you this time. Rematch?",
    "Um empate emocionante até o apito final!": "A thriller of a draw, right to the final whistle!",
    "Parabéns aos vencedores!": "Congratulations to the winners!",
    "⚡ 3 GOLS": "⚡ 3 GOALS",
    "🥇 GOL DE OURO": "🥇 GOLDEN GOAL",
    "🥇 GOL DE OURO!": "🥇 GOLDEN GOAL!",

    /* ---------- escalação ---------- */
    "ANTES DE COMEÇAR": "BEFORE KICK-OFF",
    "ESCALAÇÃO": "LINE-UP",
    "Quer ajustar as posições iniciais do seu time em campo?":
      "Want to adjust your team's starting positions on the pitch?",
    "📋 Sim, editar escalação": "📋 Yes, edit the line-up",
    "Não, começar direto": "No, start right away",
    "Monte seu time": "Set up your team",
    "Toque num jogador e depois numa casa do seu campo para reposicioná-lo — ou em outro jogador para trocar de lugar.":
      "Tap a player and then a square in your half to move him — or tap another player to swap places.",
    "Toque num jogador para ver os detalhes.": "Tap a player to see the details.",
    "↺ Restaurar Padrão": "↺ Reset to Default",
    "✅ Confirmar Escalação": "✅ Confirm Line-up",

    /* ---------- sorteio / carregamento ---------- */
    "SORTEIO": "COIN TOSS",
    "CARA OU COROA": "HEADS OR TAILS",
    "Girando a moeda...": "Tossing the coin...",
    "⚽ Começar Partida": "⚽ Start Match",
    "PREPARANDO O CAMPO": "PREPARING THE PITCH",
    "CARREGANDO...": "LOADING...",
    "imagens": "images",

    /* ---------- copa ---------- */
    "SORTEIO DA COPA": "WORLD CUP DRAW",
    "GRUPOS DEFINIDOS": "GROUPS SET",
    "Grupo": "Group",
    "Grupo A": "Group A",
    "Grupo B": "Group B",
    "Grupo C": "Group C",
    "Grupo D": "Group D",
    "De fora desta Copa": "Not in this World Cup",
    "FASE DE GRUPOS": "GROUP STAGE",
    "QUARTAS DE FINAL": "QUARTER-FINALS",
    "SEMIFINAL": "SEMI-FINALS",
    "FINAL": "FINAL",
    "COPA": "WORLD CUP",
    "Copa do Mundo": "World Cup",
    "⚽ Jogar Partida": "⚽ Play Match",
    "Sair da Copa": "Leave the World Cup",
    "Sair da Copa? O progresso do torneio será perdido.":
      "Leave the World Cup? The tournament progress will be lost.",
    "FIM DA COPA": "END OF THE CUP",
    "CAMPEÃO!": "CHAMPION!",
    "CAMPEÃO DA COPA": "WORLD CUP CHAMPION",
    "🏆 Ir pro Sorteio": "🏆 Go to the Draw",
    "Rodada": "Round",
    "Outros jogos desta fase": "Other matches in this round",
    "Empate! Fica pra classificação geral.": "A draw! It comes down to the table.",
    "Vitória na Copa! Vamos ver o resto da rodada.": "A World Cup win! Let's see the rest of the round.",
    "Não foi dessa vez... mas a Copa continua.": "Not this time... but the World Cup goes on.",
    "na fase de grupos": "in the group stage",
    "nas quartas de final": "in the quarter-finals",
    "na semifinal": "in the semi-final",
    "na final": "in the final",
    "força": "strength",
    "rodadas simultâneas": "simultaneous rounds",
    "de mentirinha": "make-believe",
    "Final:": "Final:",

    /* ---------- campanha ---------- */
    "MODO CAMPANHA": "CAMPAIGN MODE",
    "Comece como a pior seleção da Copa e transforme o time treinando jogadores e comprando reforços com as fichas que ganhar jogando. Sua campanha fica salva neste navegador — escolha uma senha pra começar, e digite a mesma senha aqui pra continuar de onde parou.":
      "Start as the worst nation in the World Cup and rebuild the team by training players and buying reinforcements with the tokens you earn. Your campaign is saved in this browser — pick a password to begin, and type that same password here to pick up where you left off.",
    "Digite sua senha": "Enter your password",
    "LOJA DO CORTO MALTESE": "CORTO MALTESE SHOP",
    "Treinar elenco": "Train the squad",
    "Comprar figurinha": "Buy a sticker",
    "Pacote Mediano": "Mid Pack",
    "Pacote Elite": "Elite Pack",
    "NOVA FIGURINHA": "NEW STICKER",
    "Jogador": "Player",
    "FICHAS": "TOKENS",
    "fichas": "tokens",
    "fichas!": "tokens!",
    "Substituir": "Replace",
    "Escolha quem sai do time pra abrir espaço no elenco:":
      "Pick who leaves to make room in the squad:",
    "FIM DA SUA JORNADA": "END OF YOUR JOURNEY",
    "Sua jornada terminou": "Your journey is over",
    "Sair da Campanha? Seu progresso fica salvo — digite a mesma senha pra continuar depois.":
      "Leave the Campaign? Your progress is saved — type the same password to continue later.",

    /* ---------- rótulos acrescentados pela camada de exibição ---------- */
    "AMISTOSO": "FRIENDLY",
    "Chutar": "Shoot",
    "esgotado": "sold out",
    "1ºT": "1st",
    "2ºT": "2nd",
    "DERROTA": "DEFEAT",
    "EMPATE": "DRAW",
    "ELIMINADO": "KNOCKED OUT",
    "MEIO-CAMPO": "MIDFIELD",
    "Custo: {0} mana": "Cost: {0} mana",
    "{0} marcador na frente": "{0} man in the way",
    "{0} marcadores na frente": "{0} men in the way",
    "{0} jogo": "{0} match",
    "{0} jogos": "{0} matches",
    "Monte o {0}": "Set up {0}",
    "Quer ajustar as posições iniciais do {0} em campo?":
      "Want to adjust {0}'s starting positions on the pitch?",
    "Driblador": "Dribbler",
    "Defensor": "Defender",
    "Marcador": "Marker",

    /* ---------- posições ---------- */
    "Goleiro": "Goalkeeper",
    "Zagueiro": "Centre-back",
    "Lateral": "Full-back",
    "Meio-campo": "Midfielder",
    "Atacante": "Forward",
    "GOL": "GK",
    "ZAG": "CB",
    "LAT": "FB",
    "MEI": "MF",
    "ATA": "FW",

    /* ---------- temperamentos ---------- */
    "Rápido": "Quick",
    "Bruto": "Brute",
    "Cerebral": "Cerebral",
    "Oportunista": "Opportunist",
    "Bispo (diagonal, até 4 casas) — rebate na lateral e segue":
      "Bishop (diagonal, up to 4 squares) — bounces off the touchline and carries on",
    "Torre (reta, até 4 casas)": "Rook (straight, up to 4 squares)",
    "Dama limitada (até 3 casas)": "Limited Queen (up to 3 squares)",
    "Cavalo (salto em L)": "Knight (L-shaped jump)",
    "Rei (1 casa, em qualquer direção)": "King (1 square, any direction)",

    /* ---------- atributos ---------- */
    "Velocidade": "Pace",
    "Chute": "Shooting",
    "Técnica": "Technique",
    "Defesa": "Defending",
    "Espírito": "Spirit",
    "Velocidade + Técnica": "Pace + Technique",

    /* ---------- habilidades ---------- */
    "Inabalável": "Unshakeable",
    "Não fica atordoado ao perder um duelo.": "Never gets stunned after losing a duel.",
    "Muralha": "Wall",
    "+4 ao disputar dentro da própria área.": "+4 when duelling inside his own box.",
    "Sombra": "Shadow",
    "Quem tenta driblá-lo não recebe o bônus do poder.":
      "Anyone trying to dribble past him gets no power bonus.",
    "Intimidação": "Intimidation",
    "Adversários em casas vizinhas perdem 3 na disputa.":
      "Opponents on neighbouring squares lose 3 in duels.",
    "Paredão": "Brick Wall",
    "Goleiro: chutes de longe contra ele sofrem +5 de penalidade.":
      "Goalkeeper: long-range shots against him take a +5 penalty.",
    "Canhão": "Cannon",
    "A penalidade de distância nos chutes dele cai 30%.":
      "The distance penalty on his shots drops by 30%.",
    "Faro de Gol": "Poacher",
    "+5 no chute quando não há ninguém bloqueando.":
      "+5 on the shot when nobody is blocking.",
    "Ginga": "Ginga",
    "+6 ao driblar (não vale para roubar a bola).":
      "+6 when dribbling (does not apply to tackling).",
    "Arrancada": "Burst",
    "+1 casa de movimento.": "+1 square of movement.",
    "Motor": "Engine",
    "+5 de mana por turno.": "+5 mana per turn.",
    "Sangue Frio": "Ice in the Veins",
    "Corta o azar: os dados da sorte dele nunca vêm no fundo.":
      "Cuts out bad luck: his luck dice never come up at the bottom.",
    "Capitão": "Captain",
    "Companheiros em casas vizinhas ganham +3 na disputa.":
      "Team-mates on neighbouring squares gain +3 in duels.",
    "Decisivo": "Clutch",
    "+6 nas disputas dos 10 turnos finais.": "+6 in duels during the final 10 turns.",
    "Zebra": "Underdog",
    "+5 nas disputas quando o time está perdendo.":
      "+5 in duels while his team is behind.",

    /* ---------- narração da partida ---------- */
    "Apito inicial!": "Kick-off!",
    "Apito inicial! Você comanda o {0}.": "Kick-off! You're in charge of {0}.",
    "{0} venceu o sorteio e começa com a bola!": "{0} won the toss and starts with the ball!",
    "<strong>{0}</strong> venceu o sorteio e começa com a bola!":
      "<strong>{0}</strong> won the toss and starts with the ball!",
    "{0} dominou a bola!": "{0} takes the ball!",
    "{0} lança para {1}.": "{0} launches it to {1}.",
    "{0} rouba a bola de {1}!": "{0} steals the ball from {1}!",
    "{0} protege a bola e afasta {1}.": "{0} shields the ball and holds off {1}.",
    "{0} dribla {1} e fica com a bola!": "{0} dribbles past {1} and keeps the ball!",
    "{0} para o drible de {1}.": "{0} stops {1}'s dribble.",
    "{0} INTERCEPTA o passe de {1}!": "{0} INTERCEPTS the pass from {1}!",
    "{0} defende o chute de {1}!": "{0} saves {1}'s shot!",
    "{0} chuta de longe": "{0} shoots from distance",
    "{0} e passa por cima!": "{0} and puts it over the bar!",
    "{0} encontra a meta vazia!": "{0} finds the empty net!",
    "{0} balança a rede!": "{0} finds the back of the net!",
    "{0} salva o time!": "{0} saves the team!",
    "{0} vence o duelo!": "{0} wins the duel!",
    "... e é GOL!": "... and it's a GOAL!",
    "⚽ GOL de {0}! Placar: {1}": "⚽ GOAL by {0}! Score: {1}",
    "GOL DE PLACA!": "WHAT A GOAL!",
    "GOL DE PLACA! O goleiro saiu do gol e {0}": "WHAT A GOAL! The keeper was off his line and {0}",
    "{0} ficou atordoado e não age no próximo turno do time!":
      "{0} is stunned and won't act on the team's next turn!",
    "{0} está atordoado e não consegue reagir ao chute de {1}.":
      "{0} is stunned and can't react to {1}'s shot.",
    "{0} perdeu a disputa, mas é Inabalável e segue de pé.":
      "{0} lost the duel, but he's Unshakeable and stays on his feet.",
    "{0} é Sombra: o {1} de {2} não teve efeito.": "{0} is a Shadow: {2}'s {1} had no effect.",
    "usando {0}": "using {0}",
    "{0} segurou a bola por turnos demais e ela escapou!":
      "{0} held the ball too many turns and lost it!",
    "{0} repõe a bola.": "{0} restarts with the ball.",
    "{0} repõe a bola do centro.": "{0} restarts from the centre spot.",
    "🔄 Jogadores voltam à formação inicial.": "🔄 Players return to their starting formation.",
    "🔔 Fim do 1º tempo! Os times trocam de lado — {0}":
      "🔔 End of the first half! The teams switch sides — {0}",
    "⏱️ Prorrogação! Gol de ouro — o próximo gol decide a partida.":
      "⏱️ Extra time! Golden goal — the next goal settles the match.",
    "{0} fez 3 gols! A partida termina aqui.": "{0} scored 3 goals! The match ends here.",
    "{0} vence na prorrogação!": "{0} wins in extra time!",
    "Vitória com o {0}": "A win with {0}",
    "Você ganhou {0} fichas!": "You earned {0} tokens!",
    "{0} assinou com o Corto Maltese!": "{0} signed for Corto Maltese!",
    "{0} subiu {1} +{2}!": "{0}'s {1} went up +{2}!",
    "Treinar ({0} fichas)": "Train ({0} tokens)",
    "{0} na frente": "{0} in front",
    "{0} imagens": "{0} images",
    "{0} / {1} imagens": "{0} / {1} images",
    "— nenhuma seleção resistiu à sua caminhada na Copa!":
      "— no nation could stand in the way of your World Cup run!",

    /* ---------- seleções ---------- */
    "Brasil": "Brazil",
    "Alemanha": "Germany",
    "França": "France",
    "Argentina": "Argentina",
    "Itália": "Italy",
    "Espanha": "Spain",
    "Colômbia": "Colombia",
    "Croácia": "Croatia",
    "Holanda": "Netherlands",
    "México": "Mexico",
    "Noruega": "Norway",
    "Portugal": "Portugal",
    "Inglaterra": "England",
    "Uruguai": "Uruguay",
    "Coreia do Sul": "South Korea",
    "Bélgica": "Belgium",
    "Chile": "Chile",
    "Japão": "Japan",
    "Marrocos": "Morocco",
    "Camarões": "Cameroon",
    "Austrália": "Australia",
    "Estados Unidos": "United States",
    "Nigéria": "Nigeria",
    "Costa Rica": "Costa Rica",
    "Irã": "Iran",
    "Arábia Saudita": "Saudi Arabia",
    "Suécia": "Sweden",
    "Dinamarca": "Denmark",
    "Suíça": "Switzerland",
    "Senegal": "Senegal",
    "Gana": "Ghana",
    "Corto Maltese": "Corto Maltese",

    /* ---------- uniformes (campo `kit`: sigla da federação + apelido) ---------- */
    "CBF · Amarelo-Canarinho": "CBF · Canary Yellow",
    "DFB · Preto & Ouro": "DFB · Black & Gold",
    "FFF · Azul Blues": "FFF · Les Bleus Blue",
    "AFA · Albiceleste": "AFA · Albiceleste",
    "FIGC · Azzurri": "FIGC · Azzurri",
    "RFEF · Fúria Vermelha": "RFEF · Red Fury",
    "FCF · Amarela Cafetera": "FCF · Coffee Yellow",
    "HNS · Xadrez Vermelho": "HNS · Red Chequers",
    "KNVB · Laranja Mecânica": "KNVB · Clockwork Orange",
    "FMF · Verde Azteca": "FMF · Aztec Green",
    "NFF · Vikings do Gelo": "NFF · Vikings of the Ice",
    "FPF · Vermelho e Verde": "FPF · Red and Green",
    "FA · Três Leões": "FA · Three Lions",
    "AUF · Garra Charrúa": "AUF · Charrúa Grit",
    "KFA · Guerreiros Taeguk": "KFA · Taeguk Warriors",
    "URBSFA · Diabos Vermelhos": "URBSFA · Red Devils",
    "ANFP · La Roja": "ANFP · La Roja",
    "JFA · Samurai Blue": "JFA · Samurai Blue",
    "FRMF · Leões do Atlas": "FRMF · Atlas Lions",
    "FECAFOOT · Leões da Savana": "FECAFOOT · Savanna Lions",
    "FFA · Ouro e Verde": "FFA · Gold and Green",
    "USSF · Estrelas e Barras": "USSF · Stars and Stripes",
    "NFF · Águias Verdes": "NFF · Green Eagles",
    "FEDEFUTBOL · Vermelho e Azul": "FEDEFUTBOL · Red and Blue",
    "FFIRI · Leões da Pérsia": "FFIRI · Lions of Persia",
    "SAFF · Falcões Verdes": "SAFF · Green Falcons",
    "SvFF · Azul e Amarelo": "SvFF · Blue and Yellow",
    "DBU · Dinamite Vermelha": "DBU · Red Dynamite",
    "ASF · Vermelhos dos Alpes": "ASF · Reds of the Alps",
    "FSF · Leões do Oeste": "FSF · Lions of the West",
    "GFA · Estrelas do Golfo": "GFA · Stars of the Gulf",
    "Clube Corto Maltese · Zebra da Copa": "Corto Maltese Club · Cup Underdogs"
  };

  var DICT = { pt: {}, en: EN };

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { stored = null; }
  var lang = LANGS.indexOf(stored) >= 0 ? stored : "pt";

  var listeners = [];

  /* Traduz e interpola. A chave é o texto em português; sem tradução,
     devolve a própria chave (então nunca aparece chave crua na tela). */
  function t(key) {
    if (key === null || key === undefined) return key;
    var out = DICT[lang][key];
    if (out === undefined) out = key;
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        out = out.split("{" + (i - 1) + "}").join(String(arguments[i]));
      }
    }
    return out;
  }

  /* Lê a chave guardada no dataset; na primeira vez, o conteúdo que veio
     do HTML É a chave, então guarda antes de sobrescrever. */
  function keyOf(el, slot, current) {
    if (el.dataset[slot] === undefined) el.dataset[slot] = current;
    return el.dataset[slot];
  }

  function applyStatic(root) {
    root = root || document;
    var i, el, list;

    list = root.querySelectorAll("[data-i18n]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.textContent = t(keyOf(el, "i18nKey", el.textContent.trim()));
    }
    list = root.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.innerHTML = t(keyOf(el, "i18nKeyHtml", el.innerHTML.trim()));
    }
    list = root.querySelectorAll("[data-i18n-title]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.setAttribute("title", t(keyOf(el, "i18nKeyTitle", el.getAttribute("title") || "")));
    }
    list = root.querySelectorAll("[data-i18n-ph]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.setAttribute("placeholder", t(keyOf(el, "i18nKeyPh", el.getAttribute("placeholder") || "")));
    }
    list = root.querySelectorAll("[data-i18n-aria]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.setAttribute("aria-label", t(keyOf(el, "i18nKeyAria", el.getAttribute("aria-label") || "")));
    }

    document.documentElement.lang = (lang === "en") ? "en" : "pt-BR";
    if (document.title) {
      var titleEl = document.querySelector("title");
      if (titleEl) titleEl.textContent = t(keyOf(titleEl, "i18nKey", titleEl.textContent.trim()));
    }
  }

  function set(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* modo privado */ }
    applyStatic(document);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](lang); } catch (e) { console.error(e); }
    }
  }

  function onChange(fn) { if (typeof fn === "function") listeners.push(fn); }

  return {
    t: t,
    get: function () { return lang; },
    set: set,
    langs: LANGS,
    applyStatic: applyStatic,
    onChange: onChange
  };
})();

// atalho global — o código do jogo chama T("...") direto
var T = I18N.t;
