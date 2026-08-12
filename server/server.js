const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3001;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I/L, pra evitar confusao ao digitar
const CODE_LENGTH = 5;
const ROOM_MAX_AGE_MS = 30 * 60 * 1000; // sala esquecida sem o 2o jogador expira em 30min
const HEARTBEAT_MS = 30 * 1000;

const rooms = new Map(); // code -> { code, slots: { A: ws|null, B: ws|null }, createdAt }

function makeRoomCode() {
  let code;
  do {
    code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function otherSlot(slot) {
  return slot === "A" ? "B" : "A";
}

function removeFromRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  const slot = ws.slot;
  if (room.slots[slot] === ws) room.slots[slot] = null;
  send(room.slots[otherSlot(slot)], { type: "opponent-left" });
  if (!room.slots.A && !room.slots.B) rooms.delete(code);
  ws.roomCode = null;
  ws.slot = null;
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (e) {
    return send(ws, { type: "error", message: "mensagem invalida" });
  }

  if (msg.type === "create-room") {
    if (ws.roomCode) return send(ws, { type: "error", message: "voce ja esta numa sala" });
    const code = makeRoomCode();
    rooms.set(code, { code, slots: { A: ws, B: null }, createdAt: Date.now() });
    ws.roomCode = code;
    ws.slot = "A";
    return send(ws, { type: "room-created", code, slot: "A" });
  }

  if (msg.type === "join-room") {
    if (ws.roomCode) return send(ws, { type: "error", message: "voce ja esta numa sala" });
    const code = String(msg.code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return send(ws, { type: "error", message: "sala nao encontrada" });
    if (room.slots.B) return send(ws, { type: "error", message: "sala cheia" });
    room.slots.B = ws;
    ws.roomCode = code;
    ws.slot = "B";
    send(ws, { type: "joined", code, slot: "B" });
    send(room.slots.A, { type: "room-ready", slot: "A" });
    send(room.slots.B, { type: "room-ready", slot: "B" });
    return;
  }

  // a partir daqui, precisa estar numa sala com os dois lados conectados
  const room = rooms.get(ws.roomCode);
  if (!room || !room.slots.A || !room.slots.B) {
    return send(ws, { type: "error", message: "sala incompleta" });
  }
  const peer = room.slots[otherSlot(ws.slot)];

  if (msg.type === "action") {
    // repassa a jogada sem interpretar - os dois clientes rodam a mesma logica do jogo
    return send(peer, { type: "action", payload: msg.payload });
  }

  if (msg.type === "random-request") {
    // o servidor decide o numero aleatorio e manda o MESMO valor pros dois lados,
    // assim duelo/cara-ou-coroa nao pode divergir entre os dois navegadores
    const value = Math.random();
    send(room.slots.A, { type: "random-result", requestId: msg.requestId, value });
    send(room.slots.B, { type: "random-result", requestId: msg.requestId, value });
    return;
  }

  if (msg.type === "leave-room") {
    return removeFromRoom(ws);
  }
}

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("xeque-total-relay ok");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.slot = null;
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", (raw) => handleMessage(ws, raw));
  ws.on("close", () => removeFromRoom(ws));
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_MS);

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.slots.B && now - room.createdAt > ROOM_MAX_AGE_MS) rooms.delete(code);
  }
}, 60 * 1000);

httpServer.listen(PORT, () => {
  console.log("relay ouvindo na porta " + PORT);
});
