/* ---------------- The Resistance: Avalon (client) ---------------- */
(function () {
  const t = (k, v) => window.I18N.t(k, v);
  let selected = new Set();
  let lastPhase = null;

  const roleName = r => t("role." + r);
  const roleDesc = r => t("desc." + r);

  function renderSettings(box, room, set) {
    const s = room.settings;
    const opt = (key, labelK, descK) => `
      <div class="selitem ${s[key]?"on":""}">
        <div><div>${t(labelK)}</div><div class="small muted">${t(descK)}</div></div>
        <label class="selectable"><input type="checkbox" data-k="${key}" style="width:auto" ${s[key]?"checked":""}></label>
      </div>`;
    box.innerHTML = `
      <div class="small muted center" style="margin-bottom:8px">${t("av_optRoles")}</div>
      ${opt("percival","av_percival","av_percivalD")}
      ${opt("morgana","av_morgana","av_morganaD")}
      ${opt("mordred","av_mordred","av_mordredD")}
      ${opt("oberon","av_oberon","av_oberonD")}
      <div class="small muted center" style="margin-top:8px">${t("av_always")}</div>`;
    box.querySelectorAll("input[data-k]").forEach(inp => { inp.onchange = () => set({ [inp.dataset.k]: inp.checked }); });
  }

  function render(root, st, hub) {
    if (st.phase !== lastPhase) { selected = new Set(); lastPhase = st.phase; }
    if (st.phase === "night") return renderNight(root, st, hub);
    if (st.phase === "over") return renderOver(root, st, hub);
    if (st.phase === "assassinate") return renderAssassinate(root, st, hub);

    let body = header(st);
    if (st.phase === "team") body += teamPhase(st, hub);
    if (st.phase === "vote") body += votePhase(st, hub);
    if (st.phase === "quest") body += questPhase(st, hub);
    body += lastVotePanel(st) + logPanel(st);
    root.innerHTML = body;
    wire(root, st, hub);
  }

  function knowledgeText(k) {
    return k.kind ? t("kn." + k.kind) : "";
  }

  function youBadge(st) {
    const k = st.you;
    return `<div class="card center">
      <div class="muted small">${t("av_youAre")}</div>
      <div class="big" style="color:${k.isEvil?'var(--bad)':'var(--good)'}">${roleName(k.role)}</div>
      <div class="muted small">${roleDesc(k.role)}</div>
      <div class="muted small" style="margin-top:8px">${knowledgeText(k.knowledge)}</div>
      ${k.knowledge.names.length ? `<div class="chip-list">${k.knowledge.names.map(n=>`<div class="pill" style="background:var(--card2);color:var(--text)">${n}</div>`).join("")}</div>` : ""}
    </div>`;
  }

  function renderNight(root, st, hub) {
    root.innerHTML = `
      ${youBadge(st)}
      <div class="card center">
        <div class="muted small">${t("av_memorise")}</div>
        <div class="muted small" style="margin:6px 0 12px">${t("av_ready",{n:st.nightAckCount,total:st.totalPlayers})}</div>
        ${st.youAcked ? `<div class="pill">${t("av_readyWait")}</div>` : `<button class="btn-primary" id="ack">${t("av_gotIt")}</button>`}
      </div>`;
    const a = root.querySelector("#ack"); if (a) a.onclick = () => hub.emitAction("ackNight");
  }

  function header(st) {
    const nodes = st.questPlan.map(q => {
      let cls = "qnode"; if (q.result === true) cls += " pass"; else if (q.result === false) cls += " fail"; else if (q.current) cls += " cur";
      const mark = q.result === true ? "✓" : q.result === false ? "✕" : "";
      return `<div class="${cls}"><span class="sz">${mark || q.size}</span>${q.fails>1?`<span class="ff">2✕</span>`:""}</div>`;
    }).join("");
    const dots = Array.from({length:5},(_,i)=>`<i class="${i<st.voteTrack?"used":""}"></i>`).join("");
    return `<div class="card center">
      <div class="muted small">${t("av_questOf",{n:st.questNumber})}</div>
      <div class="quest-track">${nodes}</div>
      <div class="small muted">${t("av_rejected")}</div>
      <div class="track-dots">${dots}</div>
    </div>`;
  }

  function playerList(st, opts) {
    return `<ul class="plist" id="plist">` + st.players.map(p => {
      const onTeam = p.onTeam || (opts.selectable && selected.has(p.id));
      let badges = "";
      if (p.isLeader) badges += `<span class="badge b-leader">${t("bLeader")}</span>`;
      if (onTeam) badges += `<span class="badge b-team">${t("bTeam")}</span>`;
      if (p.id === window.HUB.you) badges += `<span class="badge b-you">${t("bYou")}</span>`;
      return `<li data-id="${p.id}" class="${opts.selectable?"selectable":""}" style="${onTeam&&opts.selectable?'border:1px solid var(--accent)':''}">
        <span class="dot ${p.connected?'':'off'}"></span><span>${p.name}</span>${badges}</li>`;
    }).join("") + `</ul>`;
  }

  function teamPhase(st) {
    if (st.isLeader) {
      return `<div class="card">
        <div class="center" style="margin-bottom:8px"><strong>${t("av_youLeader")}</strong></div>
        <div class="center muted small" style="margin-bottom:10px">${t("av_pickExactly",{n:st.teamSize,q:st.questNumber})}</div>
        ${playerList(st, { selectable: true })}
        <button class="btn-primary" id="propose" style="margin-top:10px">${t("av_proposeTeam")} (<span id="selc">${selected.size}</span>/${st.teamSize})</button>
      </div>`;
    }
    return `<div class="card">
      <div class="center">${t("av_choosingTeam",{leader:"<strong>"+st.leaderName+"</strong>",n:st.teamSize})}</div>
      ${playerList(st, { selectable: false })}
    </div>`;
  }

  function votePhase(st) {
    const team = st.proposedTeam.map(t => t.name).join(", ");
    return `<div class="card">
      <div class="center muted small">${t("av_proposes",{leader:st.leaderName})}</div>
      <div class="center" style="margin:6px 0"><strong>${team}</strong></div>
      <div class="center muted small" style="margin-bottom:10px">${t("av_votedCount",{n:st.votesIn,total:st.totalPlayers})}</div>
      ${st.youVoted ? `<div class="center pill">${t("av_voteLocked")}</div>`
        : `<div class="row"><button class="btn-good" id="approve">${t("av_approve")}</button><button class="btn-bad" id="reject">${t("av_reject")}</button></div>`}
    </div>`;
  }

  function questPhase(st) {
    const team = st.proposedTeam.map(t => t.name).join(", ");
    const needs2 = st.questPlan[st.round] && st.questPlan[st.round].fails > 1 ? t("av_needs2") : "";
    let action;
    if (st.onTeam) {
      action = st.youPlayedCard
        ? `<div class="center pill">${t("av_cardPlayed")}</div>`
        : st.you.isEvil
          ? `<div class="center muted small" style="margin-bottom:8px">${t("av_playSecret")}</div>
             <div class="row"><button class="btn-good" id="succ">${t("av_success")}</button><button class="btn-bad" id="fail">${t("av_fail")}</button></div>`
          : `<div class="center muted small" style="margin-bottom:8px">${t("av_mustSuccess")}</div>
             <button class="btn-good" id="succ">${t("av_playSuccess")}</button>`;
    } else {
      action = `<div class="center muted small">${t("av_teamDeciding")}</div>`;
    }
    return `<div class="card">
      <div class="center muted small">${t("av_onQuest",{n:st.proposedTeam.length})}</div>
      <div class="center" style="margin:6px 0"><strong>${team}</strong></div>
      <div class="center small muted" style="margin-bottom:10px">${t("av_cardsPlayed",{n:st.cardsIn,total:st.proposedTeam.length})}${needs2}</div>
      ${action}
    </div>`;
  }

  function lastVotePanel(st) {
    if (!st.lastVote) return "";
    const v = st.lastVote;
    const chips = v.votes.map(x => `<span class="vp ${x.approve?"app":"rej"}">${x.name} ${x.approve?"👍":"👎"}</span>`).join("");
    const label = v.approved ? `<span style="color:var(--good)">${t("av_approved")}</span>` : `<span style="color:var(--bad)">${t("av_rejectedW")}</span>`;
    return `<div class="card">
      <div class="center small muted">${t("av_lastVote")} — ${label}</div>
      <div class="vote-grid" style="margin-top:8px">${chips}</div>
    </div>`;
  }

  function logLine(e) {
    switch (e.t) {
      case "night": return t("log.night", { leader: e.leader });
      case "propose": return t("log.propose", { leader: e.leader, names: e.names });
      case "vote": return t("log.vote", { approve: e.approve, reject: e.reject, result: e.approved ? t("log.voteApproved") : t("log.voteRejected") });
      case "pass": return t("log.pass", { leader: e.leader, track: e.track });
      case "quest": return t("log.quest", { n: e.n, result: e.passed ? t("log.questSucceeded") : t("log.questFailed"), fails: e.fails, s: e.fails === 1 ? "" : "s" });
      case "good3": return t("log.good3");
      default: return "";
    }
  }

  function logPanel(st) {
    if (!st.log || !st.log.length) return "";
    return `<div class="card"><div class="small muted" style="margin-bottom:4px">${t("av_history")}</div>
      <div class="log">${st.log.slice().reverse().map(e=>`<div>${logLine(e)}</div>`).join("")}</div></div>`;
  }

  function renderAssassinate(root, st, hub) {
    if (st.youAreAssassin) {
      root.innerHTML = `
        <div class="card center">
          <div class="big" style="color:var(--bad)">${t("av_assassinTitle")}</div>
          <div class="muted small">${t("av_assassinYou")}</div>
        </div>
        <div class="card">${playerList(st, { selectable: false })}</div>`;
      root.querySelectorAll("#plist li").forEach(li => {
        li.classList.add("selectable");
        li.onclick = () => { if (confirm(t("av_accuseConfirm",{name:li.textContent.trim()}))) hub.emitAction("assassinate", { targetId: li.dataset.id }); };
      });
    } else {
      root.innerHTML = `<div class="card center">
        <div class="big">${t("av_assassinTitle")}</div>
        <div class="muted">${t("av_assassinOthers",{name:"<strong>"+st.assassinName+"</strong>"})}</div>
      </div>${logPanel(st)}`;
    }
  }

  function renderOver(root, st, hub) {
    const goodWin = st.winner === "good";
    const chips = st.reveal.map(r => {
      const evil = ["Assassin","Morgana","Mordred","Oberon","Minion of Mordred"].includes(r.role);
      return `<div class="pill" style="background:${evil?'rgba(255,93,93,.18);color:#ff9b9b':'rgba(61,220,151,.18);color:#9affd1'}">${r.name} — ${roleName(r.role)}</div>`;
    }).join("");
    const reason = st.win ? t("win." + st.win.reason, { name: "<strong>"+(st.win.name||"")+"</strong>" }) : "";
    root.innerHTML = `
      <div class="card center">
        <div class="big" style="color:${goodWin?'var(--good)':'var(--bad)'}">${goodWin?t("av_goodWins"):t("av_evilWins")}</div>
        <div class="muted" style="margin-bottom:10px">${reason}</div>
        <div class="small muted">${t("av_reveal")}</div>
        <div class="chip-list">${chips}</div>
      </div>
      ${hub.isHost ? `<div class="row"><button class="btn-secondary" id="lobby">${t("lobby")}</button><button class="btn-primary" id="again">${t("playAgain")}</button></div>`
                   : `<div class="center muted small">${t("waitingNewRound")}</div>`}`;
    const again = root.querySelector("#again"); if (again) again.onclick = () => hub.socket.emit("playAgain");
    const lobby = root.querySelector("#lobby"); if (lobby) lobby.onclick = () => hub.socket.emit("backToLobby");
  }

  function wire(root, st, hub) {
    if (st.phase === "team" && st.isLeader) {
      root.querySelectorAll("#plist li").forEach(li => {
        li.onclick = () => {
          const id = li.dataset.id;
          if (selected.has(id)) selected.delete(id);
          else { if (selected.size >= st.teamSize) { hub.toast(t("av_pickExactly",{n:st.teamSize,q:st.questNumber})); return; } selected.add(id); }
          render(root, st, hub);
        };
      });
      const prop = root.querySelector("#propose");
      if (prop) prop.onclick = () => {
        if (selected.size !== st.teamSize) return hub.toast(t("av_pickExactly",{n:st.teamSize,q:st.questNumber}));
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
