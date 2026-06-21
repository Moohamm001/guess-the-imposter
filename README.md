# 🕵️ Guess the Imposter — Online Multiplayer

**▶️ Play now: https://guess-the-imposter-u50c.onrender.com/**

Everyone plays on their **own phone** from anywhere. One person creates a room and shares
the 4-letter code (or an invite link); everyone else joins. Roles are dealt privately to each
phone, there's a synced discussion timer, and everyone votes from their device.

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

## How to play
- **3–12 players.** Civilians all see the same secret word; the imposter(s) see only "IMPOSTER".
- Take turns saying one clue out loud that proves you know the word — without giving it away.
- The imposter bluffs using others' clues. If an imposter says the secret word aloud, they win.
- Host taps **Start Voting**; everyone votes on their phone.
- Civilians win if the most-voted player is an imposter; otherwise the imposter wins.

## Settings (host, in the lobby)
- Number of imposters (auto-capped to keep civilians the majority)
- Word category (or "Random Mix")
- Discussion timer length
- Optional category hint for the imposter
