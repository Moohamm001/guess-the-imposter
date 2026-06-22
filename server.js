import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import imposter from "./games/imposter.js";
import avalon from "./games/avalon.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
app.use(express.static(join(__dirname, "public")));

/* ---------------- GAME REGISTRY ---------------- */
const GAMES = { imposter, avalon };
const gameMetas = () => Object.values(GAMES).map(g => g.meta);

/* ---------------- HELPERS ---------------- */
const pick = a => a[Math.floor(Math.random() * a.length)];
const rooms = new Map();
const genCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do { c = Array.from({ length: 4 }, () => pick(letters.split(""))).join(""); } while (rooms.has(c));
  return c;
};

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,           // 'lobby' | 'ingame'
    gameType: room.gameType,
    settings: room.settings,
    games: gameMetas(),
    players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected }))
  };
}
function broadcast(room) { io.to(room.code).emit("room", publicRoom(room)); }
const mod = room => room.gameType ? GAMES[room.gameType] : null;

/* ---------------- SOCKETS ---------------- */
io.on("connection", (socket) => {
  let joinedCode = null;
  socket.emit("games", gameMetas());   // let the landing page show what's available
  const R = () => rooms.get(joinedCode);
  const isHost = r => r && r.hostId === socket.id;

  socket.on("createRoom", ({ name }, cb) => {
    name = (name || "Player").toString().trim().slice(0, 16) || "Player";
    const code = genCode();
    const room = {
      code, hostId: socket.id, state: "lobby", gameType: null, settings: {},
      players: [{ id: socket.id, name, connected: true }], game: null
    };
    rooms.set(code, room);
    joinedCode = code; socket.join(code);
    cb && cb({ ok: true, code, youId: socket.id });
    broadcast(room);
  });

  socket.on("joinRoom", ({ code, name }, cb) => {
    code = (code || "").toString().toUpperCase().trim();
    name = (name || "Player").toString().trim().slice(0, 16) || "Player";
    const room = rooms.get(code);
    if (!room) return cb && cb({ ok: false, error: "Room not found." });
    if (room.state !== "lobby") return cb && cb({ ok: false, error: "Game already in progress." });
    if (room.players.length >= 10) return cb && cb({ ok: false, error: "Room is full (10 max)." });
    room.players.push({ id: socket.id, name, connected: true });
    joinedCode = code; socket.join(code);
    if (mod(room) && mod(room).normalizeSettings) mod(room).normalizeSettings(room);
    cb && cb({ ok: true, code, youId: socket.id });
    broadcast(room);
  });

  socket.on("selectGame", (gameId) => {
    const room = R();
    if (!isHost(room) || room.state !== "lobby") return;
    if (!GAMES[gameId]) return;
    room.gameType = gameId;
    room.settings = GAMES[gameId].defaultSettings ? GAMES[gameId].defaultSettings() : {};
    if (GAMES[gameId].normalizeSettings) GAMES[gameId].normalizeSettings(room);
    broadcast(room);
  });

  socket.on("updateSettings", (patch) => {
    const room = R();
    if (!isHost(room) || room.state !== "lobby" || !mod(room)) return;
    Object.assign(room.settings, patch || {});
    if (mod(room).normalizeSettings) mod(room).normalizeSettings(room);
    broadcast(room);
  });

  socket.on("startGame", () => {
    const room = R();
    if (!isHost(room) || room.state !== "lobby" || !mod(room)) return;
    const m = mod(room);
    const n = room.players.length;
    if (n < m.meta.min) return socket.emit("errorMsg", `Need at least ${m.meta.min} players.`);
    if (n > m.meta.max) return socket.emit("errorMsg", `Too many players (max ${m.meta.max}).`);
    room.state = "ingame";
    m.start(room, io);
    broadcast(room);
    m.sync(room, io);
  });

  socket.on("gameAction", ({ type, ...payload }) => {
    const room = R();
    if (!room || room.state !== "ingame" || !mod(room)) return;
    mod(room).handle(room, io, socket, type, payload);
  });

  socket.on("playAgain", () => {
    const room = R();
    if (!isHost(room)) return;
    if (mod(room) && mod(room).cleanup) mod(room).cleanup(room);
    room.players = room.players.filter(p => p.connected);
    room.state = "lobby"; room.game = null;
    if (mod(room) && mod(room).normalizeSettings) mod(room).normalizeSettings(room);
    broadcast(room);
  });

  socket.on("backToLobby", () => {
    const room = R();
    if (!isHost(room)) return;
    if (mod(room) && mod(room).cleanup) mod(room).cleanup(room);
    room.state = "lobby"; room.game = null; room.gameType = null; room.settings = {};
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = R();
    if (!room) return;
    const p = room.players.find(x => x.id === socket.id);
    if (p) p.connected = false;
    if (room.state === "lobby") room.players = room.players.filter(x => x.id !== socket.id);
    if (room.hostId === socket.id) {
      const next = room.players.find(x => x.connected);
      if (next) room.hostId = next.id;
    }
    if (room.players.length === 0 || room.players.every(x => !x.connected)) {
      if (mod(room) && mod(room).cleanup) mod(room).cleanup(room);
      rooms.delete(room.code);
      return;
    }
    if (room.state === "ingame" && mod(room) && mod(room).onDisconnect) {
      mod(room).onDisconnect(room, io, socket.id);
    }
    if (mod(room) && mod(room).normalizeSettings && room.state === "lobby") mod(room).normalizeSettings(room);
    broadcast(room);
    if (room.state === "ingame" && mod(room)) mod(room).sync(room, io);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Party Games Hub on http://localhost:${PORT}`));
