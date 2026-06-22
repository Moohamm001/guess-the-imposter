/* ---------------- The Resistance: Avalon (hub module) ---------------- */
const EVIL_COUNT = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5]
};
const EVIL_ROLES = ["Assassin", "Morgana", "Mordred", "Oberon", "Minion of Mordred"];
const isEvilRole = r => EVIL_ROLES.includes(r);

const ROLE_DESC = {
  "Merlin": "You know who the Evil players are — but if the Assassin identifies you at the end, Evil wins. Stay hidden.",
  "Percival": "You can see Merlin (and Morgana, if present) — but not which is which. Protect the real Merlin.",
  "Loyal Servant of Arthur": "A loyal member of Good. Complete 3 quests and find the spies.",
  "Assassin": "Evil. If Good wins 3 quests, you get one shot to name Merlin and steal the win.",
  "Morgana": "Evil. You appear as Merlin to Percival, sowing confusion.",
  "Mordred": "Evil. You are hidden from Merlin — Merlin does NOT know you are Evil.",
  "Oberon": "Evil. You don't know the other Evil players, and they don't know you.",
  "Minion of Mordred": "Evil. Sabotage the quests or help assassinate Merlin."
};

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export default {
  meta: { id: "avalon", name: "The Resistance: Avalon", emoji: "⚔️", min: 5, max: 10,
    blurb: "Hidden roles & social deduction. Good completes 3 quests; Evil sabotages or assassinates Merlin." },

  defaultSettings: () => ({ percival: false, morgana: false, mordred: false, oberon: false }),

  normalizeSettings(room) {
    const s = room.settings;
    s.percival = !!s.percival; s.morgana = !!s.morgana; s.mordred = !!s.mordred; s.oberon = !!s.oberon;
    // Morgana only makes sense with Percival
    if (s.morgana && !s.percival) s.percival = true;
    const n = room.players.length;
    const evil = EVIL_COUNT[n] || 2;
    // Assassin is mandatory and takes one evil slot; cap optional evil specials to remaining slots
    let optionalEvil = ["morgana", "mordred", "oberon"].filter(k => s[k]);
    while (optionalEvil.length > evil - 1) { const drop = optionalEvil.pop(); s[drop] = false; }
  },

  start(room) {
    const n = room.players.length;
    const evil = EVIL_COUNT[n];
    const s = room.settings;

    // build role list
    const evilRoles = ["Assassin"];
    if (s.morgana) evilRoles.push("Morgana");
    if (s.mordred) evilRoles.push("Mordred");
    if (s.oberon) evilRoles.push("Oberon");
    while (evilRoles.length < evil) evilRoles.push("Minion of Mordred");

    const goodRoles = ["Merlin"];
    if (s.percival) goodRoles.push("Percival");
    while (goodRoles.length < n - evil) goodRoles.push("Loyal Servant of Arthur");

    const allRoles = shuffle([...evilRoles, ...goodRoles]);
    const order = shuffle([...room.players.map(p => p.id)]);
    const roles = {};
    order.forEach((id, i) => { roles[id] = allRoles[i]; });

    const sizes = TEAM_SIZES[n];
    const failsRequired = sizes.map((_, i) => (i === 3 && n >= 7) ? 2 : 1);

    room.game = {
      phase: "night",
      roles, order,
      leaderIndex: 0,
      round: 0,                    // 0-based quest index
      questResults: [],            // booleans, completed quests
      questSizes: sizes,
      failsRequired,
      voteTrack: 0,                // consecutive rejected proposals
      proposedTeam: [],
      votes: {},
      lastVote: null,             // { votes:{id:bool}, approved:bool, leaderName }
      questCards: {},
      lastQuest: null,            // { fails, passed, teamCount }
      nightAck: {},               // playerId -> true
      winner: null, winReason: "",
      assassinTarget: null,
      log: []
    };
  },

  sync(room, io) {
    const g = room.game; if (!g) return;
    const nameOf = id => (room.players.find(p => p.id === id) || {}).name || "?";
    const leaderId = g.order[g.leaderIndex];
    const connectedPlayers = room.players.filter(p => p.connected);

    const playersView = g.order.map(id => {
      const p = room.players.find(x => x.id === id) || { name: "?", connected: false };
      return { id, name: p.name, connected: p.connected, isLeader: id === leaderId, onTeam: g.proposedTeam.includes(id) };
    });

    const questPlan = g.questSizes.map((size, i) => ({
      size, fails: g.failsRequired[i],
      result: i < g.questResults.length ? g.questResults[i] : null,
      current: i === g.round && g.questResults.length === g.round
    }));

    room.players.forEach(p => {
      const role = g.roles[p.id];
      const view = {
        game: "avalon",
        phase: g.phase,
        you: { role, roleDesc: ROLE_DESC[role], isEvil: isEvilRole(role), knowledge: knowledgeFor(p.id, g, nameOf) },
        players: playersView,
        leaderId, leaderName: nameOf(leaderId),
        round: g.round, questNumber: g.round + 1,
        teamSize: g.questSizes[g.round],
        questPlan, voteTrack: g.voteTrack,
        proposedTeam: g.proposedTeam.map(id => ({ id, name: nameOf(id) })),
        lastVote: g.lastVote,
        lastQuest: g.lastQuest,
        log: g.log.slice(-12),
        totalPlayers: connectedPlayers.length,
        // night
        nightAckCount: Object.keys(g.nightAck).length,
        youAcked: !!g.nightAck[p.id],
        // your action flags
        isLeader: p.id === leaderId,
        youVoted: g.votes[p.id] != null,
        votesIn: Object.keys(g.votes).length,
        onTeam: g.proposedTeam.includes(p.id),
        youPlayedCard: g.questCards[p.id] != null,
        cardsIn: Object.keys(g.questCards).length,
        // assassinate
        assassinName: nameOf(Object.entries(g.roles).find(([, r]) => r === "Assassin")?.[0]),
        youAreAssassin: role === "Assassin",
        // over
        winner: g.winner, winReason: g.winReason,
        reveal: g.winner ? g.order.map(id => ({ name: nameOf(id), role: g.roles[id] })) : null
      };
      io.to(p.id).emit("gameState", view);
    });
  },

  handle(room, io, socket, type, payload) {
    const g = room.game; if (!g) return;
    const me = socket.id;
    const leaderId = g.order[g.leaderIndex];

    if (type === "ackNight" && g.phase === "night") {
      g.nightAck[me] = true;
      const allConnected = room.players.filter(p => p.connected);
      if (allConnected.every(p => g.nightAck[p.id])) {
        g.phase = "team";
        g.log.push(`Night over. ${nm(room, leaderId)} is the first Leader.`);
      }
      this.sync(room, io);

    } else if (type === "proposeTeam" && g.phase === "team" && me === leaderId) {
      const team = Array.isArray(payload.team) ? payload.team.filter(id => g.order.includes(id)) : [];
      const need = g.questSizes[g.round];
      if (new Set(team).size !== need) return;
      g.proposedTeam = [...new Set(team)];
      g.votes = {};
      g.phase = "vote";
      g.log.push(`${nm(room, leaderId)} proposes: ${g.proposedTeam.map(id => nm(room, id)).join(", ")}.`);
      this.sync(room, io);

    } else if (type === "vote" && g.phase === "vote") {
      if (payload.approve !== true && payload.approve !== false) return;
      g.votes[me] = payload.approve;
      const connected = room.players.filter(p => p.connected);
      if (connected.every(p => g.votes[p.id] != null)) resolveVote(room, io, this);
      else this.sync(room, io);

    } else if (type === "questCard" && g.phase === "quest" && g.proposedTeam.includes(me)) {
      let card = payload.card === "fail" ? "fail" : "success";
      if (!isEvilRole(g.roles[me])) card = "success"; // Good must succeed
      g.questCards[me] = card;
      if (g.proposedTeam.every(id => g.questCards[id] != null)) resolveQuest(room, io, this);
      else this.sync(room, io);

    } else if (type === "assassinate" && g.phase === "assassinate" && g.roles[me] === "Assassin") {
      const targetRole = g.roles[payload.targetId];
      if (!targetRole) return;
      g.assassinTarget = payload.targetId;
      if (targetRole === "Merlin") { g.winner = "evil"; g.winReason = `The Assassin found Merlin (${nm(room, payload.targetId)}). Evil wins!`; }
      else { g.winner = "good"; g.winReason = `The Assassin guessed ${nm(room, payload.targetId)} — wrong! Good wins!`; }
      g.phase = "over";
      this.sync(room, io);
    }
  },

  onDisconnect(room, io, id) {
    const g = room.game; if (!g) return;
    // if waiting on this player's vote/card, re-check completion
    if (g.phase === "vote") {
      const connected = room.players.filter(p => p.connected);
      if (connected.length && connected.every(p => g.votes[p.id] != null)) resolveVote(room, io, this);
    }
  },

  cleanup() {}
};

/* ---------------- helpers ---------------- */
function nm(room, id) { return (room.players.find(p => p.id === id) || {}).name || "?"; }

function knowledgeFor(pid, g, nameOf) {
  const role = g.roles[pid];
  const entries = Object.entries(g.roles);
  if (role === "Merlin") {
    const seen = entries.filter(([id, r]) => isEvilRole(r) && r !== "Mordred").map(([id]) => nameOf(id));
    return { note: "These players are Evil (Mordred is hidden):", names: seen };
  }
  if (role === "Percival") {
    const seen = entries.filter(([id, r]) => r === "Merlin" || r === "Morgana").map(([id]) => nameOf(id));
    const note = seen.length > 1 ? "One of these is Merlin (the other is Morgana):" : "This player is Merlin:";
    return { note, names: shuffle(seen) };
  }
  if (isEvilRole(role) && role !== "Oberon") {
    const seen = entries.filter(([id, r]) => isEvilRole(r) && r !== "Oberon" && id !== pid).map(([id]) => nameOf(id));
    return { note: "Your fellow Evil players (Oberon, if any, is hidden):", names: seen };
  }
  if (role === "Oberon") return { note: "You are Evil, but you don't know your teammates — and they don't know you.", names: [] };
  return { note: "You have no special knowledge. Trust carefully.", names: [] };
}

function nextLeader(g) { g.leaderIndex = (g.leaderIndex + 1) % g.order.length; }

function resolveVote(room, io, self) {
  const g = room.game;
  const values = g.order.map(id => g.votes[id]).filter(v => v != null);
  const approves = values.filter(v => v === true).length;
  const rejects = values.filter(v => v === false).length;
  const approved = approves > rejects; // tie = reject
  g.lastVote = {
    approved,
    leaderName: nm(room, g.order[g.leaderIndex]),
    votes: g.order.map(id => ({ name: nm(room, id), approve: g.votes[id] === true }))
  };
  g.log.push(`Vote: ${approves} approve / ${rejects} reject — ${approved ? "APPROVED" : "rejected"}.`);

  if (approved) {
    g.voteTrack = 0;
    g.questCards = {};
    g.phase = "quest";
  } else {
    g.voteTrack++;
    if (g.voteTrack >= 5) {
      g.winner = "evil";
      g.winReason = "Five team proposals were rejected in a row. Evil wins!";
      g.phase = "over";
    } else {
      nextLeader(g);
      g.proposedTeam = [];
      g.phase = "team";
      g.log.push(`Leader passes to ${nm(room, g.order[g.leaderIndex])} (rejected ${g.voteTrack}/5).`);
    }
  }
  self.sync(room, io);
}

function resolveQuest(room, io, self) {
  const g = room.game;
  const cards = g.proposedTeam.map(id => g.questCards[id]);
  const fails = cards.filter(c => c === "fail").length;
  const required = g.failsRequired[g.round];
  const passed = fails < required;
  g.questResults.push(passed);
  g.lastQuest = { fails, passed, teamCount: g.proposedTeam.length, required };
  g.log.push(`Quest ${g.round + 1} ${passed ? "SUCCEEDED" : "FAILED"} (${fails} fail card${fails === 1 ? "" : "s"}).`);

  const successes = g.questResults.filter(r => r).length;
  const failures = g.questResults.filter(r => !r).length;

  if (failures >= 3) {
    g.winner = "evil"; g.winReason = "Three quests failed. Evil wins!"; g.phase = "over";
  } else if (successes >= 3) {
    const hasAssassin = Object.values(g.roles).includes("Assassin");
    if (hasAssassin) { g.phase = "assassinate"; g.log.push("Good completed 3 quests! The Assassin now hunts for Merlin..."); }
    else { g.winner = "good"; g.winReason = "Good completed 3 quests. Good wins!"; g.phase = "over"; }
  } else {
    g.round++;
    g.voteTrack = 0;
    nextLeader(g);
    g.proposedTeam = [];
    g.questCards = {};
    g.phase = "team";
  }
  self.sync(room, io);
}
