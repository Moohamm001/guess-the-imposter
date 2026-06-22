/* ---------------- Guess the Imposter (hub module) ---------------- */
const WORDS = {
  "Animals": ["Elephant","Penguin","Octopus","Kangaroo","Dolphin","Giraffe","Hedgehog","Crocodile","Owl","Squirrel","Cheetah","Jellyfish","Koala","Flamingo","Wolf","Bat","Panda","Chameleon"],
  "Food & Drink": ["Pizza","Sushi","Pancake","Avocado","Spaghetti","Tacos","Ice Cream","Burrito","Coffee","Popcorn","Cheeseburger","Watermelon","Donut","Ramen","Lemonade","Chocolate","Bacon","Pickles"],
  "Movies & TV": ["Titanic","Star Wars","Friends","Harry Potter","The Office","Frozen","Batman","Jurassic Park","Spider-Man","Breaking Bad","Avatar","Shrek","Stranger Things","The Lion King","Inception","Toy Story"],
  "Places": ["Beach","Airport","Hospital","Library","Casino","Zoo","School","Stadium","Castle","Museum","Cinema","Restaurant","Gym","Bank","Park","Mall","Farm","Submarine"],
  "Jobs": ["Doctor","Teacher","Chef","Pilot","Firefighter","Detective","Astronaut","Plumber","Lawyer","Barber","Farmer","Dentist","Magician","Nurse","Mechanic","Photographer","Lifeguard","Judge"],
  "Sports": ["Soccer","Basketball","Tennis","Boxing","Golf","Surfing","Skiing","Bowling","Archery","Hockey","Cricket","Karate","Cycling","Volleyball","Swimming","Skateboarding","Fencing","Baseball"],
  "Around the House": ["Toothbrush","Refrigerator","Pillow","Umbrella","Mirror","Candle","Vacuum","Blanket","Kettle","Remote","Ladder","Doormat","Lightbulb","Scissors","Bucket","Toaster","Clock","Hammer"],
  "Fruits & Veggies": ["Strawberry","Pineapple","Broccoli","Mango","Carrot","Banana","Pumpkin","Cucumber","Cherry","Grapes","Onion","Potato","Spinach","Peach","Corn","Tomato","Mushroom","Coconut"],
  "Transport": ["Bicycle","Helicopter","Submarine","Motorcycle","Train","Rocket","Sailboat","Tractor","Ambulance","Skateboard","Hot Air Balloon","Bus","Scooter","Canoe","Jet Ski","Truck","Taxi","Ferry"],
  "Music": ["Guitar","Piano","Violin","Drums","Trumpet","Saxophone","Microphone","Flute","Harp","DJ","Concert","Headphones","Choir","Ukulele","Banjo","Karaoke","Cello","Accordion"],
  "Video Games": ["Minecraft","Mario","Fortnite","Pokemon","Zelda","Tetris","Pac-Man","Sonic","Roblox","Among Us","Call of Duty","FIFA","Candy Crush","Halo","Angry Birds","Street Fighter","Pong","Sims"],
  "Superheroes": ["Superman","Spider-Man","Batman","Iron Man","Wonder Woman","Hulk","Thor","Captain America","Flash","Black Panther","Aquaman","Deadpool","Wolverine","Spider-Gwen","Captain Marvel","Green Lantern","Doctor Strange","Ant-Man"],
  "Nature & Weather": ["Rainbow","Thunderstorm","Volcano","Waterfall","Tornado","Glacier","Desert","Earthquake","Snowflake","Lightning","Hurricane","Rainforest","Canyon","Avalanche","Sunset","Tsunami","Cave","Coral Reef"],
  "Clothing": ["Sneakers","Jacket","Scarf","Sunglasses","Pajamas","Necktie","Gloves","Hoodie","Boots","Hat","Socks","Belt","Raincoat","Swimsuit","Mittens","Sandals","Sweater","Backpack"],
  "Mythical Creatures": ["Dragon","Unicorn","Mermaid","Werewolf","Phoenix","Vampire","Zombie","Griffin","Centaur","Yeti","Fairy","Goblin","Cyclops","Kraken","Minotaur","Pegasus","Troll","Ghost"],
  "Space": ["Astronaut","Galaxy","Black Hole","Comet","Saturn","Telescope","Spaceship","Meteor","Moon","Satellite","Asteroid","Constellation","Nebula","Sun","Mars","Space Station","Eclipse","Alien"],
  "Holidays": ["Halloween","Christmas","Birthday","New Year","Easter","Thanksgiving","Valentine's Day","Fireworks","Wedding","Carnival","Picnic","Costume Party","Graduation","Camping Trip","Road Trip","Festival","Parade","Sleepover"],
  "School": ["Math","History","Science","Homework","Recess","Backpack","Chalkboard","Cafeteria","Pop Quiz","Field Trip","Detention","Locker","Report Card","Gym Class","Library","Principal","Yearbook","Spelling Bee"]
};
const CATEGORIES = ["Random Mix", ...Object.keys(WORDS)];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

export default {
  meta: { id: "imposter", name: "Guess the Imposter", emoji: "🕵️", min: 3, max: 10,
    blurb: "Everyone shares a secret word — except the imposter, who must bluff." },

  defaultSettings: () => ({ imposters: 1, category: "Random Mix", timer: 180, hint: false, categories: CATEGORIES }),

  normalizeSettings(room) {
    const s = room.settings;
    s.categories = CATEGORIES;
    if (typeof s.category !== "string" || !CATEGORIES.includes(s.category)) s.category = "Random Mix";
    if (![0,60,120,180,300].includes(s.timer)) s.timer = 180;
    s.hint = !!s.hint;
    const max = Math.max(1, Math.floor((room.players.length - 1) / 2));
    if (typeof s.imposters !== "number") s.imposters = 1;
    s.imposters = Math.min(Math.max(1, Math.round(s.imposters)), max);
  },

  start(room, io) {
    const s = room.settings;
    let pool, cat;
    if (s.category === "Random Mix") { cat = pick(Object.keys(WORDS)); pool = WORDS[cat]; }
    else { cat = s.category; pool = WORDS[cat]; }
    const word = pick(pool);
    const n = room.players.length;
    const roles = Array(n).fill("civilian");
    shuffle([...Array(n).keys()]).slice(0, s.imposters).forEach(i => roles[i] = "imposter");
    const order = shuffle(room.players.map(p => p.name));

    room.game = {
      phase: "play", word, category: cat, hint: s.hint, order,
      roles: Object.fromEntries(room.players.map((p, i) => [p.id, roles[i]])),
      votes: {}, timer: { remaining: s.timer, running: s.timer > 0, interval: null }, result: null
    };
    if (s.timer > 0) startTimer(room, io, this);
  },

  sync(room, io) {
    const g = room.game; if (!g) return;
    const votedCount = Object.keys(g.votes).length;
    const connected = room.players.filter(p => p.connected).length;
    room.players.forEach(p => {
      const role = g.roles[p.id];
      io.to(p.id).emit("gameState", {
        game: "imposter", phase: g.phase,
        you: { role, word: role === "imposter" ? null : g.word },
        category: g.category, hint: g.hint, order: g.order,
        timer: { remaining: g.timer.remaining, running: g.timer.running, enabled: room.settings.timer > 0 },
        votedCount, connected,
        players: room.players.map(x => ({ id: x.id, name: x.name, connected: x.connected, hasVoted: g.votes[x.id] != null })),
        result: g.result
      });
    });
  },

  handle(room, io, socket, type, payload) {
    const g = room.game; if (!g) return;
    const isHost = room.hostId === socket.id;
    if (type === "toggleTimer" && isHost && g.phase === "play") {
      g.timer.running = !g.timer.running; this.sync(room, io);
    } else if (type === "beginVote" && isHost && g.phase === "play") {
      clearInterval(g.timer.interval); g.timer.running = false; g.phase = "vote"; g.votes = {};
      this.sync(room, io);
    } else if (type === "castVote" && g.phase === "vote") {
      if (!room.players.find(p => p.id === payload.targetId)) return;
      g.votes[socket.id] = payload.targetId;
      const connected = room.players.filter(p => p.connected);
      if (connected.every(p => g.votes[p.id] != null)) resolve(room, io, this);
      else this.sync(room, io);
    } else if (type === "forceReveal" && isHost && g.phase === "vote") {
      resolve(room, io, this);
    }
  },

  cleanup(room) { if (room.game) clearInterval(room.game.timer.interval); }
};

function startTimer(room, io, self) {
  const g = room.game;
  clearInterval(g.timer.interval);
  g.timer.interval = setInterval(() => {
    if (!g.timer.running || g.phase !== "play") return;
    g.timer.remaining--;
    if (g.timer.remaining <= 0) { g.timer.remaining = 0; g.timer.running = false; clearInterval(g.timer.interval); }
    self.sync(room, io);
  }, 1000);
}

function resolve(room, io, self) {
  const g = room.game;
  clearInterval(g.timer.interval); g.timer.running = false;
  const tally = {};
  Object.values(g.votes).forEach(t => tally[t] = (tally[t] || 0) + 1);
  let topId = null, top = -1, tie = false;
  Object.entries(tally).forEach(([id, c]) => { if (c > top) { top = c; topId = id; tie = false; } else if (c === top) tie = true; });
  const imposterIds = Object.entries(g.roles).filter(([, r]) => r === "imposter").map(([id]) => id);
  const accused = (topId && !tie) ? topId : null;
  g.result = {
    word: g.word, category: g.category, accusedId: accused, tie,
    caught: accused && imposterIds.includes(accused),
    imposterIds,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: g.roles[p.id] }))
  };
  g.phase = "result";
  self.sync(room, io);
}
