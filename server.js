import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, "public")));

/* ---------------- WORD BANK ---------------- */
const WORDS = {
  "Animals": ["Elephant","Penguin","Octopus","Kangaroo","Dolphin","Giraffe","Hedgehog","Crocodile","Owl","Squirrel","Cheetah","Jellyfish","Koala","Flamingo","Wolf","Bat","Panda","Chameleon"],
  "Food & Drink": ["Pizza","Sushi","Pancake","Avocado","Spaghetti","Tacos","Ice Cream","Burrito","Coffee","Popcorn","Cheeseburger","Watermelon","Donut","Ramen","Lemonade","Chocolate","Bacon","Pickles"],
  "Movies & TV": ["Titanic","Star Wars","Friends","Harry Potter","The Office","Frozen","Batman","Jurassic Park","Spider-Man","Breaking Bad","Avatar","Shrek","Stranger Things","The Lion King","Inception","Toy Story"],
  "Places": ["Beach","Airport","Hospital","Library","Casino","Zoo","School","Stadium","Castle","Museum","Cinema","Restaurant","Gym","Bank","Park","Mall","Farm","Submarine"],
  "Jobs": ["Doctor","Teacher","Chef","Pilot","Firefighter","Detective","Astronaut","Plumber","Lawyer","Barber","Farmer","Dentist","Magician","Nurse","Mechanic","Photographer","Lifeguard","Judge"],
  "Sports": ["Soccer","Basketball","Tennis","Boxing","Golf","Surfing","Skiing","Bowling","Archery","Hockey","Cricket","Karate","Cycling","Volleyball","Swimming","Skateboarding","Fencing","Baseball"],
  "Around the House": ["Toothbrush","Refrigerator","Pillow","Umbrella","Mirror","Candle","Vacuum","Blanket","Kettle","Remote","Ladder","Doormat","Lightbulb","Scissors","Bucket","Toaster","Clock","Hammer"]
};
const CATEGORIES = ["Random Mix", ...Object.keys(WORDS)];

/* ---------------- HELPERS ---------------- */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const genCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let c;
  do { c = Array.from({ length: 4 }, () => pick(letters.split(""))).join(""); } while (rooms.has(c));
  return c;
};

/* ---------------- ROOMS ---------------- */
const rooms = new Map();

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    settings: room.settings,
    players: room.players.map(p => ({
      id: p.id, name: p.name, connected: p.connected, hasVoted: room.votes[p.id] != null
    })),
    categories: CATEGORIES
  };
}

function broadcast(room) {
  io.to(room.code).emit("room", publicRoom(room));
}

function createRoom(hostSocketId, name) {
  const code = genCode();
  const room = {
    code,
    hostId: hostSocketId,
    state: "lobby",
    settings: { imposters: 1, category: "Random Mix", timer: 180, hint: false },
    players: [{ id: hostSocketId, name, connected: true, role: null }],
    word: "",
    category: "",
    order: [],
    votes: {},
    timer: { remaining: 0, running: false, interval: null }
  };
  rooms.set(code, room);
  return room;
}

function clampImposters(room) {
  const max = Math.max(1, Math.floor((room.players.length - 1) / 2));
  if (room.settings.imposters > max) room.settings.imposters = max;
  if (room.settings.imposters < 1) room.settings.imposters = 1;
}

function dealRoles(room) {
  let cat = room.settings.category, pool;
  if (cat === "Random Mix") {
    const chosen = pick(Object.keys(WORDS));
    pool = WORDS[chosen]; room.category = chosen;
  } else { pool = WORDS[cat]; room.category = cat; }
  room.word = pick(pool);

  const n = room.players.length;
  clampImposters(room);
  const roles = Array(n).fill("civilian");
  shuffle([...Array(n).keys()]).slice(0, room.settings.imposters).forEach(i => roles[i] = "imposter");
  room.players.forEach((p, i) => { p.role = roles[i]; });

  room.order = shuffle(room.players.map(p => p.id));
  room.votes = {};
  room.state = "play";
}

function sendPrivateRoles(room) {
  const orderNames = room.order.map(id => room.players.find(p => p.id === id)?.name).filter(Boolean);
  room.players.forEach(p => {
    io.to(p.id).emit("yourRole", {
      role: p.role,
      word: p.role === "imposter" ? null : room.word,
      category: room.category,
      hint: room.settings.hint,
      order: orderNames
    });
  });
}

function startTimer(room) {
  clearInterval(room.timer.interval);
  if (room.settings.timer <= 0) { room.timer.running = false; return; }
  room.timer.remaining = room.settings.timer;
  room.timer.running = true;
  room.timer.interval = setInterval(() => {
    if (!room.timer.running) return;
    room.timer.remaining--;
    io.to(room.code).emit("timer", { remaining: room.timer.remaining, running: true });
    if (room.timer.remaining <= 0) {
      clearInterval(room.timer.interval);
      room.timer.running = false;
      io.to(room.code).emit("timer", { remaining: 0, running: false });
    }
  }, 1000);
  io.to(room.code).emit("timer", { remaining: room.timer.remaining, running: true });
}

function revealResult(room) {
  clearInterval(room.timer.interval);
  room.timer.running = false;

  // tally votes
  const tally = {};
  Object.values(room.votes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
  let topId = null, topCount = -1, tie = false;
  Object.entries(tally).forEach(([id, c]) => {
    if (c > topCount) { topCount = c; topId = id; tie = false; }
    else if (c === topCount) { tie = true; }
  });

  const imposterIds = room.players.filter(p => p.role === "imposter").map(p => p.id);
  const accused = (topId && !tie) ? topId : null;
  const caught = accused && imposterIds.includes(accused);

  room.state = "result";
  io.to(room.code).emit("result", {
    word: room.word,
    category: room.category,
    accusedId: accused,
    tie,
    caught,
    tally,
    imposterIds,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role }))
  });
  broadcast(room);
}

function removeRoom(code) {
  const room = rooms.get(code);
  if (room) clearInterval(room.timer.interval);
  rooms.delete(code);
}

/* ---------------- SOCKETS ---------------- */
io.on("connection", (socket) => {
  let joinedCode = null;

  const requireRoom = () => rooms.get(joinedCode);
  const isHost = (room) => room && room.hostId === socket.id;

  socket.on("createRoom", ({ name }, cb) => {
    name = (name || "Player").toString().trim().slice(0, 16) || "Player";
    const room = createRoom(socket.id, name);
    joinedCode = room.code;
    socket.join(room.code);
    cb && cb({ ok: true, code: room.code, youId: socket.id });
    broadcast(room);
  });

  socket.on("joinRoom", ({ code, name }, cb) => {
    code = (code || "").toString().toUpperCase().trim();
    name = (name || "Player").toString().trim().slice(0, 16) || "Player";
    const room = rooms.get(code);
    if (!room) return cb && cb({ ok: false, error: "Room not found." });
    if (room.state !== "lobby") return cb && cb({ ok: false, error: "Game already started." });
    if (room.players.length >= 12) return cb && cb({ ok: false, error: "Room is full (12 max)." });
    room.players.push({ id: socket.id, name, connected: true, role: null });
    joinedCode = code;
    socket.join(code);
    clampImposters(room);
    cb && cb({ ok: true, code, youId: socket.id });
    broadcast(room);
  });

  socket.on("updateSettings", (settings) => {
    const room = requireRoom();
    if (!isHost(room) || room.state !== "lobby") return;
    if (typeof settings.imposters === "number") room.settings.imposters = settings.imposters;
    if (typeof settings.category === "string" && CATEGORIES.includes(settings.category)) room.settings.category = settings.category;
    if (typeof settings.timer === "number") room.settings.timer = settings.timer;
    if (typeof settings.hint === "boolean") room.settings.hint = settings.hint;
    clampImposters(room);
    broadcast(room);
  });

  socket.on("startGame", () => {
    const room = requireRoom();
    if (!isHost(room) || room.state !== "lobby") return;
    if (room.players.length < 3) {
      socket.emit("errorMsg", "Need at least 3 players to start.");
      return;
    }
    dealRoles(room);
    broadcast(room);
    sendPrivateRoles(room);
    startTimer(room);
  });

  socket.on("toggleTimer", () => {
    const room = requireRoom();
    if (!isHost(room) || room.state !== "play") return;
    room.timer.running = !room.timer.running;
    io.to(room.code).emit("timer", { remaining: room.timer.remaining, running: room.timer.running });
  });

  socket.on("beginVote", () => {
    const room = requireRoom();
    if (!isHost(room) || room.state !== "play") return;
    clearInterval(room.timer.interval);
    room.timer.running = false;
    room.state = "vote";
    room.votes = {};
    broadcast(room);
  });

  socket.on("castVote", ({ targetId }) => {
    const room = requireRoom();
    if (!room || room.state !== "vote") return;
    if (!room.players.find(p => p.id === targetId)) return;
    room.votes[socket.id] = targetId;
    broadcast(room);
    // auto-reveal when all connected players have voted
    const connected = room.players.filter(p => p.connected);
    if (connected.every(p => room.votes[p.id] != null)) {
      revealResult(room);
    }
  });

  socket.on("forceReveal", () => {
    const room = requireRoom();
    if (!isHost(room) || room.state !== "vote") return;
    revealResult(room);
  });

  socket.on("playAgain", () => {
    const room = requireRoom();
    if (!isHost(room)) return;
    // drop disconnected players, reset
    room.players = room.players.filter(p => p.connected);
    room.players.forEach(p => { p.role = null; });
    room.state = "lobby";
    room.votes = {};
    room.word = ""; room.category = "";
    clampImposters(room);
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = requireRoom();
    if (!room) return;
    const p = room.players.find(x => x.id === socket.id);
    if (p) p.connected = false;

    // if game in lobby, remove the player entirely
    if (room.state === "lobby") {
      room.players = room.players.filter(x => x.id !== socket.id);
    }

    // reassign host if needed
    if (room.hostId === socket.id) {
      const next = room.players.find(x => x.connected);
      if (next) room.hostId = next.id;
    }

    // empty room cleanup
    if (room.players.length === 0 || room.players.every(x => !x.connected)) {
      removeRoom(room.code);
      return;
    }

    // if we were waiting on this player's vote, check completion
    if (room.state === "vote") {
      const connected = room.players.filter(x => x.connected);
      if (connected.length && connected.every(x => room.votes[x.id] != null)) {
        revealResult(room);
        return;
      }
    }
    broadcast(room);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Guess the Imposter running on http://localhost:${PORT}`);
});
