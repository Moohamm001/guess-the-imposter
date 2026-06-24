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
  "School": ["Math","History","Science","Homework","Recess","Backpack","Chalkboard","Cafeteria","Pop Quiz","Field Trip","Detention","Locker","Report Card","Gym Class","Library","Principal","Yearbook","Spelling Bee"],
  "Countries": ["France","Japan","Brazil","Egypt","Canada","India","Italy","Mexico","Australia","Germany","Thailand","Kenya","Norway","Greece","China","Spain","Iceland","Peru"],
  "Landmarks": ["Eiffel Tower","Great Wall","Pyramids","Colosseum","Statue of Liberty","Big Ben","Taj Mahal","Mount Rushmore","Stonehenge","Leaning Tower","Sydney Opera House","Christ the Redeemer","Golden Gate Bridge","Niagara Falls","Machu Picchu","Sphinx","Times Square","Mount Fuji"],
  "Sea Creatures": ["Shark","Octopus","Jellyfish","Seahorse","Starfish","Crab","Lobster","Stingray","Clownfish","Whale","Dolphin","Sea Turtle","Squid","Eel","Pufferfish","Coral","Seal","Swordfish"],
  "Birds": ["Eagle","Penguin","Parrot","Flamingo","Owl","Peacock","Pelican","Ostrich","Robin","Toucan","Hummingbird","Woodpecker","Swan","Pigeon","Falcon","Seagull","Crow","Sparrow"],
  "Insects & Bugs": ["Butterfly","Ant","Bee","Spider","Ladybug","Grasshopper","Mosquito","Dragonfly","Beetle","Caterpillar","Firefly","Cockroach","Moth","Cricket","Wasp","Centipede","Termite","Scorpion"],
  "Desserts": ["Cake","Brownie","Cheesecake","Cupcake","Macaron","Tiramisu","Cookie","Pudding","Waffle","Churros","Pie","Muffin","Eclair","Gelato","Mochi","Fudge","Custard","Sundae"],
  "Kitchen Items": ["Spatula","Whisk","Blender","Frying Pan","Cutting Board","Colander","Rolling Pin","Oven Mitt","Grater","Ladle","Tongs","Measuring Cup","Saucepan","Peeler","Microwave","Apron","Corkscrew","Wok"],
  "Tools": ["Hammer","Screwdriver","Wrench","Drill","Saw","Pliers","Tape Measure","Level","Chisel","Sandpaper","Crowbar","Nail","Toolbox","Clamp","File","Stud Finder","Allen Key","Mallet"],
  "Flowers & Plants": ["Rose","Tulip","Sunflower","Daisy","Cactus","Orchid","Lily","Bamboo","Fern","Dandelion","Lavender","Bonsai","Ivy","Maple Tree","Venus Flytrap","Lotus","Poppy","Moss"],
  "Body Parts": ["Elbow","Knee","Shoulder","Ankle","Wrist","Eyebrow","Knuckle","Heel","Spine","Tongue","Thumb","Jaw","Nostril","Collarbone","Eyelash","Forehead","Chin","Calf"],
  "Emotions": ["Happy","Angry","Jealous","Excited","Nervous","Bored","Proud","Embarrassed","Curious","Grumpy","Surprised","Confused","Lonely","Relaxed","Scared","Hopeful","Shy","Annoyed"],
  "Technology": ["Smartphone","Laptop","Headphones","Drone","Smartwatch","Keyboard","Webcam","Router","Joystick","Charger","Tablet","Speaker","Monitor","Microphone","Hard Drive","Printer","USB Drive","VR Headset"],
  "Cartoon Characters": ["Mickey Mouse","SpongeBob","Pikachu","Bugs Bunny","Homer Simpson","Scooby-Doo","Tom and Jerry","Shrek","Bart Simpson","Popeye","Garfield","Goku","Mario","Winnie the Pooh","Donald Duck","Patrick Star","Tweety","Road Runner"],
  "Drinks": ["Coffee","Lemonade","Smoothie","Milkshake","Hot Chocolate","Iced Tea","Soda","Orange Juice","Cappuccino","Bubble Tea","Coconut Water","Energy Drink","Mojito","Espresso","Slushie","Cola","Matcha","Ginger Ale"]
};
const CATEGORIES = ["Random Mix", ...Object.keys(WORDS)];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const norm = s => (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

export default {
  meta: { id: "imposter", name: "Guess the Imposter", emoji: "🕵️", min: 3, max: 10,
    blurb: "Everyone shares a secret word — except the imposter, who must bluff." },

  defaultSettings: () => ({ imposters: 1, mrwhite: 0, category: "Random Mix", timer: 180, hint: false, categories: CATEGORIES }),

  normalizeSettings(room) {
    const s = room.settings;
    s.categories = CATEGORIES;
    if (typeof s.category !== "string" || !CATEGORIES.includes(s.category)) s.category = "Random Mix";
    if (![0,60,120,180,300].includes(s.timer)) s.timer = 180;
    s.hint = !!s.hint;
    // imposters + Mr. Whites must stay a minority; imposters is always at least 1.
    const maxInfil = Math.max(1, Math.floor((room.players.length - 1) / 2));
    if (typeof s.imposters !== "number") s.imposters = 1;
    s.imposters = Math.min(Math.max(1, Math.round(s.imposters)), maxInfil);
    if (typeof s.mrwhite !== "number") s.mrwhite = 0;
    s.mrwhite = Math.min(Math.max(0, Math.round(s.mrwhite)), maxInfil - s.imposters);
  },

  start(room, io) {
    const s = room.settings;
    let pool, cat;
    if (s.category === "Random Mix") { cat = pick(Object.keys(WORDS)); pool = WORDS[cat]; }
    else { cat = s.category; pool = WORDS[cat]; }
    const word = pick(pool);
    const n = room.players.length;
    const roles = Array(n).fill("civilian");
    const idx = shuffle([...Array(n).keys()]);
    let k = 0;
    for (let i = 0; i < s.imposters; i++) roles[idx[k++]] = "imposter";
    for (let i = 0; i < (s.mrwhite || 0); i++) roles[idx[k++]] = "mrwhite";
    const order = shuffle(room.players.map(p => p.name));

    room.game = {
      phase: "play", word, category: cat, hint: s.hint, order,
      roles: Object.fromEntries(room.players.map((p, i) => [p.id, roles[i]])),
      votes: {}, timer: { remaining: s.timer, running: s.timer > 0, interval: null },
      result: null, caughtWhiteId: null
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
        you: { role, word: role === "civilian" ? g.word : null },
        category: g.category, hint: g.hint, order: g.order,
        timer: { remaining: g.timer.remaining, running: g.timer.running, enabled: room.settings.timer > 0 },
        votedCount, connected, caughtWhiteId: g.caughtWhiteId,
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
    } else if (type === "mrWhiteGuess" && g.phase === "guess") {
      if (socket.id !== g.caughtWhiteId) return;
      const guess = (payload.guess || "").toString().trim();
      finalize(room, io, this, { accused: g.caughtWhiteId, tie: false, whiteGuess: guess, whiteStole: norm(guess) === norm(g.word) });
    } else if (type === "forceReveal" && isHost && g.phase === "vote") {
      resolve(room, io, this);
    } else if (type === "forceReveal" && isHost && g.phase === "guess") {
      finalize(room, io, this, { accused: g.caughtWhiteId, tie: false, whiteGuess: null, whiteStole: false });
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
  const accused = (topId && !tie) ? topId : null;

  // A caught Mr. White gets one shot to guess the secret word and steal the win.
  if (accused && g.roles[accused] === "mrwhite") {
    g.caughtWhiteId = accused;
    g.phase = "guess";
    self.sync(room, io);
    return;
  }
  finalize(room, io, self, { accused, tie });
}

function finalize(room, io, self, { accused, tie, whiteGuess = null, whiteStole = false }) {
  const g = room.game;
  clearInterval(g.timer.interval); g.timer.running = false;
  const imposterIds = Object.entries(g.roles).filter(([, r]) => r === "imposter").map(([id]) => id);
  const whiteIds = Object.entries(g.roles).filter(([, r]) => r === "mrwhite").map(([id]) => id);
  const role = accused ? g.roles[accused] : null;
  // outcome: 'white' (Mr. White stole it) | 'civ' (caught an infiltrator) | 'imp' (infiltrators survived)
  let outcome;
  if (whiteStole) outcome = "white";
  else if (accused && (role === "imposter" || role === "mrwhite")) outcome = "civ";
  else outcome = "imp"; // tie, no majority, or an innocent civilian was accused
  g.result = {
    word: g.word, category: g.category, accusedId: accused, tie, outcome,
    imposterIds, whiteIds, caughtWhiteId: g.caughtWhiteId, whiteGuess,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: g.roles[p.id] }))
  };
  g.phase = "result";
  self.sync(room, io);
}
