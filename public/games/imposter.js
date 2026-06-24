/* ---------------- Guess the Imposter (client) ---------------- */
(function () {
  const t = (k, v) => window.I18N.t(k, v);
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  let revealed = false, lastPhase = null;

  function renderSettings(box, room, set) {
    const s = room.settings;
    const cats = (s.categories || ["Random Mix"]).map(c => `<option value="${c}" ${c === s.category ? "selected" : ""}>${c}</option>`).join("");
    const tOpt = [[0,"imp_noTimer"],[60,"imp_1min"],[120,"imp_2min"],[180,"imp_3min"],[300,"imp_5min"]]
      .map(([v,k])=>`<option value="${v}" ${s.timer===v?"selected":""}>${t(k)}</option>`).join("");
    box.innerHTML = `
      <label>${t("imp_imposters")}</label>
      <div class="stepper"><button id="iM">−</button><div class="val">${s.imposters || 1}</div><button id="iP">+</button></div>
      <label>${t("imp_mrwhite")}</label>
      <div class="stepper"><button id="wM">−</button><div class="val">${s.mrwhite || 0}</div><button id="wP">+</button></div>
      <label>${t("imp_category")}</label>
      <select id="catSel">${cats}</select>
      <label>${t("imp_timer")}</label>
      <select id="tSel">${tOpt}</select>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px">
        <input type="checkbox" id="hintT" style="width:auto" ${s.hint?"checked":""}> ${t("imp_hint")}
      </label>`;
    box.querySelector("#iM").onclick = () => set({ imposters: (s.imposters || 1) - 1 });
    box.querySelector("#iP").onclick = () => set({ imposters: (s.imposters || 1) + 1 });
    box.querySelector("#wM").onclick = () => set({ mrwhite: (s.mrwhite || 0) - 1 });
    box.querySelector("#wP").onclick = () => set({ mrwhite: (s.mrwhite || 0) + 1 });
    box.querySelector("#catSel").onchange = e => set({ category: e.target.value });
    box.querySelector("#tSel").onchange = e => set({ timer: +e.target.value });
    box.querySelector("#hintT").onchange = e => set({ hint: e.target.checked });
  }

  function render(root, st, hub) {
    if (st.phase !== lastPhase) { if (st.phase === "play") revealed = false; lastPhase = st.phase; }
    if (st.phase === "play") return renderPlay(root, st, hub);
    if (st.phase === "vote") return renderVote(root, st, hub);
    if (st.phase === "guess") return renderGuess(root, st, hub);
    if (st.phase === "result") return renderResult(root, st, hub);
  }

  function renderPlay(root, st, hub) {
    const hideBtn = `<button class="btn-secondary" id="hide" style="margin-top:14px">${t("imp_hide")}</button>`;
    let roleHtml;
    if (!revealed) {
      roleHtml = `<div class="muted">${t("imp_ready")}</div>
         <div class="muted small">${t("imp_noPeek")}</div>
         <button class="btn-blue" id="rev" style="margin-top:12px">${t("imp_tapReveal")}</button>`;
    } else if (st.you.role === "mrwhite") {
      roleHtml = `<div class="muted small">${t("imp_yourRole")}</div><div class="imposter-word">${t("imp_mrwhiteRole")}</div>
           <div class="muted">${t("imp_mrwhiteBlend")}</div>${hideBtn}`;
    } else if (st.you.role === "imposter") {
      roleHtml = `<div class="muted small">${t("imp_yourRole")}</div><div class="imposter-word">${t("imp_imposter")}</div>
           <div class="muted">${t("imp_blend")}</div>
           ${st.hint ? `<div class="pill" style="margin-top:10px">${t("imp_hintCat",{cat:st.category})}</div>` : ""}${hideBtn}`;
    } else {
      roleHtml = `<div class="muted small">${t("imp_secretWord")}</div><div class="reveal-word">${st.you.word}</div>
           <div class="pill">${t("imp_catIs",{cat:st.category})}</div>
           <div class="muted" style="margin-top:8px">${t("imp_prove")}</div>${hideBtn}`;
    }

    const timer = st.timer.enabled
      ? `<div class="card center"><div class="muted small">${t("imp_discTime")}</div>
          <div class="timer ${st.timer.remaining<=10?'warn':''}" id="tmr">${st.timer.remaining<=0&&!st.timer.running?t("imp_time"):fmt(st.timer.remaining)}</div>
          ${hub.isHost?`<button class="btn-secondary" id="pause" style="margin-top:8px">${st.timer.running?t("imp_pause"):t("imp_resume")}</button>`:""}</div>` : "";

    root.innerHTML = `
      <div class="card center">${roleHtml}</div>
      <div class="card"><div class="center muted small">${t("imp_clueOrder")}</div>
        <ol class="order-list">${st.order.map(n=>`<li>${n}</li>`).join("")}</ol></div>
      ${timer}
      ${hub.isHost ? `<button class="btn-primary" id="toVote">${t("imp_startVoting")}</button>`
                   : `<div class="center muted small">${t("imp_giveClue")}</div>`}`;

    const rev = root.querySelector("#rev"); if (rev) rev.onclick = () => { revealed = true; render(root, st, hub); };
    const hide = root.querySelector("#hide"); if (hide) hide.onclick = () => { revealed = false; render(root, st, hub); };
    const pause = root.querySelector("#pause"); if (pause) pause.onclick = () => hub.emitAction("toggleTimer");
    const tv = root.querySelector("#toVote"); if (tv) tv.onclick = () => hub.emitAction("beginVote");
  }

  function renderVote(root, st, hub) {
    root.innerHTML = `
      <div class="card">
        <div class="center"><strong>${t("imp_whoImp")}</strong></div>
        <div class="center muted small" style="margin:6px 0 12px">${t("imp_voted",{n:st.votedCount,total:st.connected})}</div>
        <div class="stack" id="vl"></div>
      </div>
      ${hub.isHost ? `<button class="btn-ghost" id="fr">${t("imp_revealNow")}</button>` : ""}`;
    const vl = root.querySelector("#vl");
    st.players.forEach(p => {
      const b = document.createElement("button");
      b.className = "btn-secondary"; b.style.textAlign = "left";
      b.innerHTML = `<span style="display:flex;justify-content:space-between"><span>${p.name}${p.id===hub.you?" "+t("imp_you"):""}</span>${p.hasVoted?'<span style="color:var(--good)">✓</span>':""}</span>`;
      b.onclick = () => { hub.emitAction("castVote", { targetId: p.id }); hub.toast(t("imp_votedFor",{name:p.name})); };
      vl.appendChild(b);
    });
    const fr = root.querySelector("#fr"); if (fr) fr.onclick = () => hub.emitAction("forceReveal");
  }

  function renderGuess(root, st, hub) {
    const whiteName = (st.players.find(p => p.id === st.caughtWhiteId) || {}).name || "—";
    if (hub.you === st.caughtWhiteId) {
      root.innerHTML = `
        <div class="card center">
          <div class="big" style="color:var(--accent)">${t("imp_caughtTitle")}</div>
          <div class="muted" style="margin-bottom:12px">${t("imp_caughtSub")}</div>
          <input id="wg" type="text" placeholder="${t("imp_guessPh")}" autocomplete="off">
          <button class="btn-primary" id="wgo" style="margin-top:12px">${t("imp_guessBtn")}</button>
        </div>`;
      const inp = root.querySelector("#wg"), go = root.querySelector("#wgo");
      go.onclick = () => { const v = inp.value.trim(); if (!v) return; hub.emitAction("mrWhiteGuess", { guess: v }); };
      inp.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); });
      inp.focus();
    } else {
      root.innerHTML = `
        <div class="card center">
          <div class="big" style="color:var(--accent)">${t("imp_whiteCaught")}</div>
          <div class="muted">${t("imp_whiteGuessing",{name:"<strong>"+whiteName+"</strong>"})}</div>
        </div>
        ${hub.isHost ? `<button class="btn-ghost" id="fr">${t("imp_skipGuess")}</button>` : ""}`;
      const fr = root.querySelector("#fr"); if (fr) fr.onclick = () => hub.emitAction("forceReveal");
    }
  }

  function renderResult(root, st, hub) {
    const r = st.result;
    const nameOf = id => (r.players.find(p => p.id === id) || {}).name || "—";
    const bold = id => "<strong>" + nameOf(id) + "</strong>";
    const impNames = r.imposterIds.map(nameOf);
    const whiteNames = (r.whiteIds || []).map(nameOf);
    let head, color, sub;
    if (r.outcome === "white") {
      head = t("imp_whiteWin"); color = "var(--text)";
      sub = t("imp_whiteWinSub",{name:bold(r.caughtWhiteId), word:"<strong>"+r.word+"</strong>"});
    } else if (r.outcome === "civ") {
      head = t("imp_civWin"); color = "var(--good)"; sub = t("imp_civWinSub",{name:bold(r.accusedId)});
    } else if (r.tie || !r.accusedId) {
      head = t("imp_noMajority"); color = "var(--muted)"; sub = t("imp_noMajoritySub");
    } else {
      head = t("imp_impWin"); color = "var(--accent)"; sub = t("imp_impWinSub",{name:bold(r.accusedId)});
    }
    const chipStyle = p => p.role==='imposter' ? 'background:rgba(255,93,143,.2);color:#ffb3cd'
      : p.role==='mrwhite' ? 'background:rgba(255,255,255,.15);color:#fff' : '';
    const chipTag = p => p.role==='imposter' ? ' — 🕵️' : p.role==='mrwhite' ? ' — 🤍' : '';
    const chips = r.players.map(p => `<div class="pill" style="${chipStyle(p)}">${p.name}${chipTag(p)}</div>`).join("");
    const whiteGuessLine = r.whiteGuess ? `<div class="muted small" style="margin-top:8px">${t("imp_whiteGuessed",{guess:"<strong>"+r.whiteGuess+"</strong>"})}</div>` : "";
    const whiteLine = whiteNames.length ? `<div class="muted small" style="margin-top:6px">${t("imp_whiteLabel")}: <strong>${whiteNames.join(", ")}</strong></div>` : "";
    root.innerHTML = `
      <div class="card center">
        <div class="big" style="color:${color}">${head}</div>
        <div class="muted" style="margin-bottom:10px">${sub}</div>
        ${whiteGuessLine}
        <div class="muted small">${t("imp_wordWas")}</div>
        <div class="reveal-word">${r.word}</div><div class="pill">${t("imp_catIs",{cat:r.category})}</div>
        <div class="muted small" style="margin-top:16px">${impNames.length>1?t("imp_impsLabel"):t("imp_impLabel")}: <strong>${impNames.join(", ")}</strong></div>
        ${whiteLine}
        <div class="chip-list">${chips}</div>
      </div>
      ${hub.isHost ? `<div class="row"><button class="btn-secondary" id="lobby">${t("lobby")}</button><button class="btn-primary" id="again">${t("playAgain")}</button></div>`
                   : `<div class="center muted small">${t("waitingNewRound")}</div>`}`;
    const again = root.querySelector("#again"); if (again) again.onclick = () => hub.socket.emit("playAgain");
    const lobby = root.querySelector("#lobby"); if (lobby) lobby.onclick = () => hub.socket.emit("backToLobby");
  }

  window.GAMES = window.GAMES || {};
  window.GAMES.imposter = { renderSettings, render };
})();
