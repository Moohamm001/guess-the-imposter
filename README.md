# 🎉 Party Games Hub — Online Multiplayer

**▶️ Play now: https://guess-the-imposter-u50c.onrender.com/**

Everyone plays on their **own phone** from anywhere. One person creates a room and shares
the 4-letter code (or an invite link); everyone else joins, the host picks a game, and roles/state
are dealt privately to each phone.

## Games included
- **🕵️ Guess the Imposter** (3–10 players) — everyone shares a secret word except the imposter(s),
  who must bluff. Synced discussion timer, then everyone votes.
- **⚔️ The Resistance: Avalon** (5–10 players) — hidden roles & social deduction. Good completes 3
  quests; Evil sabotages 3 quests, busts 5 team votes, or assassinates Merlin. Supports optional
  roles: Percival, Morgana, Mordred, Oberon (Merlin & Assassin always in play).

## Languages
English & **Thai** (ไทย) — tap the language button (top-left). Choice is saved per device.
UI strings live in `public/i18n.js`; the Avalon server sends structured enums (roles, knowledge,
log events, win reasons) so all displayed text is localized on the client.

## Architecture (hub)
A shared room/lobby system with **pluggable game modules** so new games are easy to add:
```
server.js            shared: rooms, join/leave, host, lobby, game registry & dispatch
games/<id>.js        server-side rules for one game (deal, per-player state, actions)
public/index.html    shell: home, lobby, game picker, settings, in-game container
public/games/<id>.js client UI for one game (renderSettings + render from server state)
```
To add a game: drop a `games/<id>.js` module + a `public/games/<id>.js` renderer and register
the module in `server.js`. The lobby auto-lists it.

## Play locally (same WiFi)
```bash
npm install
npm start
```
Open `http://localhost:3000` on the host machine, and `http://<host-LAN-IP>:3000` on phones
on the same WiFi.

## Deploy online for free (play from anywhere)

> **Already deployed** at https://guess-the-imposter-u50c.onrender.com/ via Render.
> Pushing to the `main` branch redeploys automatically. The steps below document how it was set up.

### Option A — Render (recommended, uses included `render.yaml`)
1. Put this folder on GitHub:
   ```bash
   git init
   git add .
   git commit -m "Guess the Imposter multiplayer"
   gh repo create guess-the-imposter --public --source=. --push
   # (or create the repo on github.com and `git push` manually)
   ```
2. Go to <https://render.com> → **New +** → **Blueprint** → pick your repo.
   Render reads `render.yaml` and deploys automatically.
3. Open the URL Render gives you (e.g. `https://guess-the-imposter.onrender.com`) — share it!

> Note: Render's free tier sleeps after inactivity; the first load after a nap takes ~30s.

### Option B — Railway / Fly.io / any Node host
Any host that runs a Node web service works. Just run `npm install` then `npm start`;
the app listens on `process.env.PORT`.

## How to play — Guess the Imposter
- Civilians all see the same secret word; the imposter(s) see only "IMPOSTER".
- Take turns saying one clue out loud that proves you know the word — without giving it away.
- The imposter bluffs using others' clues. If an imposter says the secret word aloud, they win.
- Host taps **Start Voting**; everyone votes on their phone.
- Civilians win if the most-voted player is an imposter; otherwise the imposter wins.
- Host settings: number of imposters, word category, discussion timer, optional category hint.

## How to play — The Resistance: Avalon
1. **Night:** each phone privately shows your role and what you know (Merlin sees Evil; Evil see each
   other; Percival sees Merlin/Morgana). Everyone taps "ready".
2. **Team building:** the Leader picks a quest team; everyone votes Approve/Reject. Majority sends
   the team; 5 rejected proposals in a round = Evil wins. Leader passes clockwise on rejection.
3. **Quest:** team members secretly play Success/Fail (Good must play Success). One Fail fails the
   quest (Quest 4 needs 2 Fails with 7+ players).
4. **Win:** Good completing 3 quests triggers the **Assassination** — the Assassin names who they
   think Merlin is. Right = Evil steals the win; wrong = Good wins. Evil also wins by failing 3 quests.
- Host settings: toggle Percival, Morgana, Mordred, Oberon (Merlin & Assassin always included).
