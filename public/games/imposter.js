/* ---------------- Guess the Imposter (client) ---------------- */
(function () {
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  let revealed = false, lastPhase = null;

  function renderSettings(box, room, set) {
    const s = room.settings;
    const cats = (s.categories || ["Random Mix"]).map(c => `<option value="${c}" ${c === s.category ? "selected" : ""}>${c}</option>`).join("");
    box.innerHTML = `
      <label>Imposters</label>
      <div class="stepper">
        <button id="iM">−</button><div class="val">${s.imposters || 1}</div><button id="iP">+</button>
      </div>
      <label>Category</label>
      <select id="catSel">${cats}</select>
      <label>Discussion timer</label>
      <select id="tSel">
        ${[[0,"No timer"],[60,"1 min"],[120,"2 min"],[180,"3 min"],[300,"5 min"]]
          .map(([v,l])=>`<option value="${v}" ${s.timer===v?"selected":""}>${l}</option>`).join("")}
      </select>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px">
        <input type="checkbox" id="hintT" style="width:auto" ${s.hint?"checked":""}> Give imposter a category hint
      </label>`;
    box.querySelector("#iM").onclick = () => set({ imposters: (s.imposters || 1) - 1 });
    box.querySelector("#iP").onclick = () => set({ imposters: (s.imposters || 1) + 1 });
    box.querySelector("#catSel").onchange = e => set({ category: e.target.value });
    box.querySelector("#tSel").onchange = e => set({ timer: +e.target.value });
    box.querySelector("#hintT").onchange = e => set({ hint: e.target.checked });
  }

  function render(root, st, hub) {
    if (st.phase !== lastPhase) { if (st.phase === "play") revealed = false; lastPhase = st.phase; }

    if (st.phase === "play") return renderPlay(root, st, hub);
    if (st.phase === "vote") return renderVote(root, st, hub);
    if (st.phase === "result") return renderResult(root, st, hub);
  }

  function renderPlay(root, st, hub) {
    const roleHtml = !revealed
      ? `<div class="muted">Your secret role is ready.</div>
         <div class="muted small">Don’t let anyone see your screen 👀</div>
         <button class="btn-blue" id="rev" style="margin-top:12px">👁️ Tap to reveal my role</button>`
      : (st.you.role === "imposter"
        ? `<div class="muted small">Your role</div><div class="imposter-word">🤫 IMPOSTER</div>
           <div class="muted">Blend in. Work out the word from clues — guess it aloud to win!</div>
           ${st.hint ? `<div class="pill" style="margin-top:10px">Hint — Category: ${st.category}</div>` : ""}
           <button class="btn-secondary" id="hide" style="margin-top:14px">Hide</button>`
        : `<div class="muted small">The secret word is</div><div class="reveal-word">${st.you.word}</div>
           <div class="pill">Category: ${st.category}</div>
           <div class="muted" style="margin-top:8px">Prove you know it — but don’t make it obvious.</div>
           <button class="btn-secondary" id="hide" style="margin-top:14px">Hide</button>`);

    const timer = st.timer.enabled
      ? `<div class="card center"><div class="muted small">Discussion time</div>
          <div class="timer ${st.timer.remaining<=10?'warn':''}" id="tmr">${st.timer.remaining<=0&&!st.timer.running?"Time!":fmt(st.timer.remaining)}</div>
          ${hub.isHost?`<button class="btn-secondary" id="pause" style="margin-top:8px">${st.timer.running?"Pause":"Resume"}</button>`:""}</div>` : "";

    root.innerHTML = `
      <div class="card center">${roleHtml}</div>
      <div class="card"><div class="center muted small">Clue-giving order</div>
        <ol class="order-list">${st.order.map(n=>`<li>${n}</li>`).join("")}</ol></div>
      ${timer}
      ${hub.isHost ? `<button class="btn-primary" id="toVote">Start Voting</button>`
                   : `<div class="center muted small">Give your clue out loud. Host starts voting when ready.</div>`}`;

    const rev = root.querySelector("#rev"); if (rev) rev.onclick = () => { revealed = true; render(root, st, hub); };
    const hide = root.querySelector("#hide"); if (hide) hide.onclick = () => { revealed = false; render(root, st, hub); };
    const pause = root.querySelector("#pause"); if (pause) pause.onclick = () => hub.emitAction("toggleTimer");
    const tv = root.querySelector("#toVote"); if (tv) tv.onclick = () => hub.emitAction("beginVote");
  }

  function renderVote(root, st, hub) {
    root.innerHTML = `
      <div class="card">
        <div class="center"><strong>Who is the imposter?</strong></div>
        <div class="center muted small" style="margin:6px 0 12px">${st.votedCount}/${st.connected} voted</div>
        <div class="stack" id="vl"></div>
      </div>
      ${hub.isHost ? `<button class="btn-ghost" id="fr">Reveal now</button>` : ""}`;
    const vl = root.querySelector("#vl");
    st.players.forEach(p => {
      const b = document.createElement("button");
      b.className = "btn-secondary"; b.style.textAlign = "left";
      b.innerHTML = `<span style="display:flex;justify-content:space-between"><span>${p.name}${p.id===hub.you?" (you)":""}</span>${p.hasVoted?'<span style="color:var(--good)">✓</span>':""}</span>`;
      b.onclick = () => { hub.emitAction("castVote", { targetId: p.id }); hub.toast("Voted for " + p.name); };
      vl.appendChild(b);
    });
    const fr = root.querySelector("#fr"); if (fr) fr.onclick = () => hub.emitAction("forceReveal");
  }

  function renderResult(root, st, hub) {
    const r = st.result;
    const nameOf = id => (r.players.find(p => p.id === id) || {}).name || "—";
    const impNames = r.imposterIds.map(nameOf);
    let head, color, sub;
    if (r.tie || !r.accusedId) { head = "🤝 No majority"; color = "var(--muted)"; sub = "Tied vote — the imposter survives."; }
    else if (r.caught) { head = "✅ Civilians win!"; color = "var(--good)"; sub = `You caught <strong>${nameOf(r.accusedId)}</strong>.`; }
    else { head = "🤫 Imposter wins!"; color = "var(--accent)"; sub = `<strong>${nameOf(r.accusedId)}</strong> was innocent.`; }
    const chips = r.players.map(p => `<div class="pill" style="${p.role==='imposter'?'background:rgba(255,93,143,.2);color:#ffb3cd':''}">${p.name}${p.role==='imposter'?' — 🕵️':''}</div>`).join("");
    root.innerHTML = `
      <div class="card center">
        <div class="big" style="color:${color}">${head}</div>
        <div class="muted" style="margin-bottom:10px">${sub}</div>
        <div class="muted small">The secret word was</div>
        <div class="reveal-word">${r.word}</div><div class="pill">Category: ${r.category}</div>
        <div class="muted small" style="margin-top:16px">${impNames.length>1?'Imposters':'Imposter'}: <strong>${impNames.join(", ")}</strong></div>
        <div class="chip-list">${chips}</div>
      </div>
      ${hub.isHost ? `<div class="row"><button class="btn-secondary" id="lobby">Lobby</button><button class="btn-primary" id="again">Play Again</button></div>`
                   : `<div class="center muted small">Waiting for host to start a new round…</div>`}`;
    const again = root.querySelector("#again"); if (again) again.onclick = () => hub.socket.emit("playAgain");
    const lobby = root.querySelector("#lobby"); if (lobby) lobby.onclick = () => hub.socket.emit("backToLobby");
  }

  window.GAMES = window.GAMES || {};
  window.GAMES.imposter = { renderSettings, render };
})();
