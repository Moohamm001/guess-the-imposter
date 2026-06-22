/* ---------------- The Resistance: Avalon (client) ---------------- */
(function () {
  let selected = new Set();
  let lastPhase = null;

  function renderSettings(box, room, set) {
    const s = room.settings;
    const opt = (key, label, desc) => `
      <div class="selitem ${s[key]?"on":""}">
        <div><div>${label}</div><div class="small muted">${desc}</div></div>
        <label class="selectable"><input type="checkbox" data-k="${key}" style="width:auto" ${s[key]?"checked":""}></label>
      </div>`;
    box.innerHTML = `
      <div class="small muted center" style="margin-bottom:8px">Optional special roles</div>
      ${opt("percival","Percival (Good)","Sees Merlin — protect them")}
      ${opt("morgana","Morgana (Evil)","Appears as Merlin to Percival (auto-enables Percival)")}
      ${opt("mordred","Mordred (Evil)","Hidden from Merlin")}
      ${opt("oberon","Oberon (Evil)","Unknown to other Evil")}
      <div class="small muted center" style="margin-top:8px">Merlin & Assassin are always in play.</div>`;
    box.querySelectorAll("input[data-k]").forEach(inp => {
      inp.onchange = () => set({ [inp.dataset.k]: inp.checked });
    });
  }

  function render(root, st, hub) {
    if (st.phase !== lastPhase) { selected = new Set(); lastPhase = st.phase; }
    if (st.phase === "night") return renderNight(root, st, hub);
    if (st.phase === "over") return renderOver(root, st, hub);
    if (st.phase === "assassinate") return renderAssassinate(root, st, hub);

    // shared header for team / vote / quest
    let body = header(st);
    if (st.phase === "team") body += teamPhase(st, hub);
    if (st.phase === "vote") body += votePhase(st, hub);
    if (st.phase === "quest") body += questPhase(st, hub);
    body += lastVotePanel(st) + logPanel(st);
    root.innerHTML = body;
    wire(root, st, hub);
  }

  /* ---- pieces ---- */
  function youBadge(st) {
    const k = st.you;
    return `<div class="card center">
      <div class="muted small">You are</div>
      <div class="big" style="color:${k.isEvil?'var(--bad)':'var(--good)'}">${k.role}</div>
      <div class="muted small">${k.roleDesc}</div>
      ${k.knowledge.names.length ? `<div class="muted small" style="margin-top:8px">${k.knowledge.note}</div>
        <div class="chip-list">${k.knowledge.names.map(n=>`<div class="pill" style="background:var(--card2);color:var(--text)">${n}</div>`).join("")}</div>`
        : `<div class="muted small" style="margin-top:8px">${k.knowledge.note}</div>`}
    </div>`;
  }

  function renderNight(root, st, hub) {
    root.innerHTML = `
      ${youBadge(st)}
      <div class="card center">
        <div class="muted small">Memorise your role &amp; what you know.</div>
        <div class="muted small" style="margin:6px 0 12px">${st.nightAckCount}/${st.totalPlayers} ready</div>
        ${st.youAcked ? `<div class="pill">✓ Ready — waiting for others…</div>`
                      : `<button class="btn-primary" id="ack">Got it — I'm ready</button>`}
      </div>`;
    const a = root.querySelector("#ack"); if (a) a.onclick = () => hub.emitAction("ackNight");
  }

  function header(st) {
    const nodes = st.questPlan.map((q, i) => {
      let cls = "qnode"; if (q.result === true) cls += " pass"; else if (q.result === false) cls += " fail"; else if (q.current) cls += " cur";
      const mark = q.result === true ? "✓" : q.result === false ? "✕" : "";
      return `<div class="${cls}"><span class="sz">${mark || q.size}</span>${q.fails>1?`<span class="ff">2 fails</span>`:""}</div>`;
    }).join("");
    const dots = Array.from({length:5},(_,i)=>`<i class="${i<st.voteTrack?"used":""}"></i>`).join("");
    return `
      <div class="card center">
        <div class="muted small">Quest ${st.questNumber} of 5</div>
        <div class="quest-track">${nodes}</div>
        <div class="small muted">Rejected proposals (5 = Evil wins)</div>
        <div class="track-dots">${dots}</div>
      </div>`;
  }

  function playerList(st, opts) {
    // opts.selectable, opts.showTeam
    return `<ul class="plist" id="plist">` + st.players.map(p => {
      const onTeam = p.onTeam || (opts.selectable && selected.has(p.id));
      let badges = "";
      if (p.isLeader) badges += `<span class="badge b-leader">LEADER</span>`;
      if (onTeam) badges += `<span class="badge b-team">TEAM</span>`;
      if (p.id === window.HUB.you) badges += `<span class="badge b-you">YOU</span>`;
      return `<li data-id="${p.id}" class="${opts.selectable?"selectable":""}" style="${onTeam&&opts.selectable?'border:1px solid var(--accent)':''}">
        <span class="dot ${p.connected?'':'off'}"></span><span>${p.name}</span>${badges}</li>`;
    }).join("") + `</ul>`;
  }

  function teamPhase(st, hub) {
    if (st.isLeader) {
      return `<div class="card">
        <div class="center" style="margin-bottom:8px"><strong>You are the Leader.</strong></div>
        <div class="center muted small" style="margin-bottom:10px">Pick exactly <strong>${st.teamSize}</strong> players for Quest ${st.questNumber}.</div>
        ${playerList(st, { selectable: true })}
        <button class="btn-primary" id="propose" style="margin-top:10px">Propose Team (<span id="selc">${selected.size}</span>/${st.teamSize})</button>
      </div>`;
    }
    return `<div class="card">
      <div class="center"><strong>${st.leaderName}</strong> is choosing a team of ${st.teamSize}…</div>
      ${playerList(st, { selectable: false })}
    </div>`;
  }

  function votePhase(st, hub) {
    const team = st.proposedTeam.map(t => t.name).join(", ");
    return `<div class="card">
      <div class="center muted small">${st.leaderName} proposes</div>
      <div class="center" style="margin:6px 0"><strong>${team}</strong></div>
      <div class="center muted small" style="margin-bottom:10px">${st.votesIn}/${st.totalPlayers} voted</div>
      ${st.youVoted ? `<div class="center pill">✓ Vote locked — waiting for others…</div>`
        : `<div class="row"><button class="btn-good" id="approve">👍 Approve</button><button class="btn-bad" id="reject">👎 Reject</button></div>`}
    </div>`;
  }

  function questPhase(st, hub) {
    const team = st.proposedTeam.map(t => t.name).join(", ");
    let action;
    if (st.onTeam) {
      action = st.youPlayedCard
        ? `<div class="center pill">✓ Card played — waiting for the rest…</div>`
        : st.you.isEvil
          ? `<div class="center muted small" style="margin-bottom:8px">Play your Quest card secretly.</div>
             <div class="row"><button class="btn-good" id="succ">✅ Success</button><button class="btn-bad" id="fail">💀 Fail</button></div>`
          : `<div class="center muted small" style="margin-bottom:8px">You are Good — you must play Success.</div>
             <button class="btn-good" id="succ">✅ Play Success</button>`;
    } else {
      action = `<div class="center muted small">Quest team is deciding…</div>`;
    }
    return `<div class="card">
      <div class="center muted small">On the Quest (${st.proposedTeam.length})</div>
      <div class="center" style="margin:6px 0"><strong>${team}</strong></div>
      <div class="center small muted" style="margin-bottom:10px">${st.cardsIn}/${st.proposedTeam.length} cards played${st.questPlan[st.round]&&st.questPlan[st.round].fails>1?" · needs 2 fails":""}</div>
      ${action}
    </div>`;
  }

  function lastVotePanel(st) {
    if (!st.lastVote) return "";
    const v = st.lastVote;
    const chips = v.votes.map(x => `<span class="vp ${x.approve?"app":"rej"}">${x.name} ${x.approve?"👍":"👎"}</span>`).join("");
    return `<div class="card">
      <div class="center small muted">Last vote — ${v.approved?'<span style="color:var(--good)">APPROVED</span>':'<span style="color:var(--bad)">REJECTED</span>'}</div>
      <div class="vote-grid" style="margin-top:8px">${chips}</div>
    </div>`;
  }

  function logPanel(st) {
    if (!st.log || !st.log.length) return "";
    return `<div class="card"><div class="small muted" style="margin-bottom:4px">History</div>
      <div class="log">${st.log.slice().reverse().map(l=>`<div>${l}</div>`).join("")}</div></div>`;
  }

  function renderAssassinate(root, st, hub) {
    if (st.youAreAssassin) {
      root.innerHTML = `
        <div class="card center">
          <div class="big" style="color:var(--bad)">🗡️ Assassination</div>
          <div class="muted small">Good completed 3 quests. Name the player you believe is <strong>Merlin</strong>. Correct = Evil wins.</div>
        </div>
        <div class="card">${playerList(st, { selectable: false })}</div>`;
      root.querySelectorAll("#plist li").forEach(li => {
        li.classList.add("selectable");
        li.onclick = () => { if (confirm("Accuse " + li.textContent.trim() + " as Merlin?")) hub.emitAction("assassinate", { targetId: li.dataset.id }); };
      });
    } else {
      root.innerHTML = `<div class="card center">
        <div class="big">🗡️ Assassination</div>
        <div class="muted">Good completed 3 quests! <strong>${st.assassinName}</strong> (the Assassin) is now choosing who to assassinate as Merlin…</div>
      </div>${logPanel(st)}`;
    }
  }

  function renderOver(root, st, hub) {
    const goodWin = st.winner === "good";
    const chips = st.reveal.map(r => {
      const evil = ["Assassin","Morgana","Mordred","Oberon","Minion of Mordred"].includes(r.role);
      return `<div class="pill" style="background:${evil?'rgba(255,93,93,.18);color:#ff9b9b':'rgba(61,220,151,.18);color:#9affd1'}">${r.name} — ${r.role}</div>`;
    }).join("");
    root.innerHTML = `
      <div class="card center">
        <div class="big" style="color:${goodWin?'var(--good)':'var(--bad)'}">${goodWin?'🛡️ Good wins!':'😈 Evil wins!'}</div>
        <div class="muted" style="margin-bottom:10px">${st.winReason}</div>
        <div class="small muted">Full role reveal</div>
        <div class="chip-list">${chips}</div>
      </div>
      ${hub.isHost ? `<div class="row"><button class="btn-secondary" id="lobby">Lobby</button><button class="btn-primary" id="again">Play Again</button></div>`
                   : `<div class="center muted small">Waiting for host to start a new round…</div>`}`;
    const again = root.querySelector("#again"); if (again) again.onclick = () => hub.socket.emit("playAgain");
    const lobby = root.querySelector("#lobby"); if (lobby) lobby.onclick = () => hub.socket.emit("backToLobby");
  }

  function wire(root, st, hub) {
    // team selection
    if (st.phase === "team" && st.isLeader) {
      root.querySelectorAll("#plist li").forEach(li => {
        li.onclick = () => {
          const id = li.dataset.id;
          if (selected.has(id)) selected.delete(id);
          else { if (selected.size >= st.teamSize) { hub.toast(`Only ${st.teamSize} allowed`); return; } selected.add(id); }
          render(root, st, hub);
        };
      });
      const prop = root.querySelector("#propose");
      if (prop) prop.onclick = () => {
        if (selected.size !== st.teamSize) return hub.toast(`Pick exactly ${st.teamSize}`);
        hub.emitAction("proposeTeam", { team: [...selected] });
      };
    }
    if (st.phase === "vote") {
      const a = root.querySelector("#approve"), r = root.querySelector("#reject");
      if (a) a.onclick = () => hub.emitAction("vote", { approve: true });
      if (r) r.onclick = () => hub.emitAction("vote", { approve: false });
    }
    if (st.phase === "quest") {
      const s = root.querySelector("#succ"), f = root.querySelector("#fail");
      if (s) s.onclick = () => hub.emitAction("questCard", { card: "success" });
      if (f) f.onclick = () => hub.emitAction("questCard", { card: "fail" });
    }
  }

  window.GAMES = window.GAMES || {};
  window.GAMES.avalon = { renderSettings, render };
})();
