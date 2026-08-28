// Logiciel Draft Companion Ultra-Robuste - TheFarmerBeer 2026
document.addEventListener("DOMContentLoaded", () => {
  // Application State
  let currentPick = 1;
  let myRoster = {};
  let draftedPlayers = {}; // id (string) -> 'ME' or 'OTHER'
  let activeFilter = 'ALL';
  let searchQuery = '';
  let onlyAvailable = false;
  let draftHistory = []; // Stack for Undo functionality

  // Load from LocalStorage if available
  const savedState = localStorage.getItem("farmer_beer_draft_state");
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      currentPick = parsed.currentPick || 1;
      myRoster = parsed.myRoster || {};
      draftedPlayers = parsed.draftedPlayers || {};
      draftHistory = parsed.draftHistory || [];
    } catch (e) {
      console.error("Erreur lors de la restauration de la sauvegarde", e);
    }
  }

  // Save State
  function saveState() {
    localStorage.setItem("farmer_beer_draft_state", JSON.stringify({
      currentPick,
      myRoster,
      draftedPlayers,
      draftHistory
    }));
  }

  // DOM Elements
  const currentPickVal = document.getElementById("currentPickVal");
  const roundInfo = document.getElementById("roundInfo");
  const turnAlert = document.getElementById("turnAlert");
  const playersTableBody = document.getElementById("playersTableBody");
  const searchInput = document.getElementById("searchInput");
  const posFilterButtons = document.querySelectorAll(".pos-btn");
  const rosterSlotsContainer = document.getElementById("rosterSlotsContainer");
  const rosterFilledCount = document.getElementById("rosterFilledCount");
  const aiSuggestionsCards = document.getElementById("aiSuggestionsCards");
  const btnPrevPick = document.getElementById("btnPrevPick");
  const btnNextPick = document.getElementById("btnNextPick");
  const btnUndo = document.getElementById("btnUndo");
  const btnReset = document.getElementById("btnReset");
  const chkOnlyAvailable = document.getElementById("chkOnlyAvailable");

  // Determine current Round and Pick in Round for 14-team league
  function getPickDetails(overallPick) {
    const round = Math.max(1, Math.ceil(overallPick / 14));
    const pickInRound = ((overallPick - 1) % 14) + 1;
    const isMyPick = THE_FARMER_BEER_PICKS.some(p => p.overall === overallPick);
    return { round, pickInRound, isMyPick };
  }

  // Calculate Next FarmerBeer Picks
  function getNextMyPicks(currentOverall) {
    return THE_FARMER_BEER_PICKS.filter(p => p.overall >= currentOverall);
  }

  // Helper to find player safely by String ID
  function findPlayerById(playerId) {
    const targetId = String(playerId);
    return PLAYERS_DATA.find(p => String(p.id) === targetId);
  }

  // Update Turn Banner & Header
  function updateTurnBanner() {
    const details = getPickDetails(currentPick);
    currentPickVal.innerText = `#${currentPick}`;
    roundInfo.innerText = `Tour ${details.round} • Choix ${details.pickInRound}/14`;

    const upcoming = getNextMyPicks(currentPick);
    if (details.isMyPick) {
      turnAlert.innerHTML = `<span style="color:#10B981; font-weight:800; font-size:1.15rem; text-shadow:0 0 10px rgba(16,185,129,0.5);">⚡ C'EST À VOUS DE CHOISIR ! (Pick #${currentPick})</span>`;
    } else if (upcoming.length > 0) {
      const picksAway = upcoming[0].overall - currentPick;
      turnAlert.innerHTML = `Vos prochains choix : <strong>#${upcoming[0].overall}</strong> (dans ${picksAway} pick${picksAway > 1 ? 's' : ''}) & <strong>#${upcoming[1] ? upcoming[1].overall : ''}</strong>`;
    } else {
      turnAlert.innerHTML = `<span style="color:#F59E0B; font-weight:700;">🎉 Draft terminée ! Votre effectif TheFarmerBeer est complet.</span>`;
    }
  }

  // AI Smart Recommendation Engine
  function generateRecommendations() {
    const details = getPickDetails(currentPick);
    const available = PLAYERS_DATA.filter(p => !draftedPlayers[String(p.id)]);

    // Count positions in roster
    const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0, LB: 0, DL: 0, DB: 0, "D/ST": 0, K: 0 };
    Object.values(myRoster).forEach(p => {
      if (p && posCounts[p.pos] !== undefined) posCounts[p.pos]++;
    });

    // Identify Urgent Vacant Starters
    let vacantStarters = [];
    if (posCounts.RB === 0) vacantStarters.push("RB1");
    else if (posCounts.RB === 1) vacantStarters.push("RB2");

    if (posCounts.WR === 0) vacantStarters.push("WR1");
    else if (posCounts.WR === 1) vacantStarters.push("WR2");

    if (posCounts.QB === 0) vacantStarters.push("QB");
    if (posCounts.TE === 0) vacantStarters.push("TE");
    if (posCounts.LB < 2) vacantStarters.push(posCounts.LB === 0 ? "LB1" : "LB2");
    if (posCounts.DL === 0) vacantStarters.push("DL");
    if (posCounts.DB < 2) vacantStarters.push(posCounts.DB === 0 ? "DB1" : "DB2");
    if (posCounts["D/ST"] === 0) vacantStarters.push("D/ST");
    if (posCounts.K === 0) vacantStarters.push("K");

    const urgentNeedsText = document.getElementById("urgentNeedsText");
    if (urgentNeedsText) {
      urgentNeedsText.innerHTML = vacantStarters.length > 0 ? vacantStarters.slice(0, 4).join(", ") : "Tous les postes titulaires sont comblés (Complétez le Banc !)";
    }

    let recs = [];

    // Slot matching helper
    function getTargetSlotName(pos) {
      if (pos === 'RB') return posCounts.RB === 0 ? 'RB1 (Titulaire)' : (posCounts.RB === 1 ? 'RB2 (Titulaire)' : 'Banc');
      if (pos === 'WR') return posCounts.WR === 0 ? 'WR1 (Titulaire)' : (posCounts.WR === 1 ? 'WR2 (Titulaire)' : 'Banc');
      if (pos === 'QB') return posCounts.QB === 0 ? 'QB (Titulaire)' : 'Banc';
      if (pos === 'TE') return posCounts.TE === 0 ? 'TE (Titulaire)' : 'Banc';
      if (pos === 'LB') return posCounts.LB === 0 ? 'LB1 (Titulaire)' : (posCounts.LB === 1 ? 'LB2 (Titulaire)' : 'Banc');
      if (pos === 'DL') return posCounts.DL === 0 ? 'DL (Titulaire)' : 'Banc';
      if (pos === 'DB') return posCounts.DB === 0 ? 'DB1 (Titulaire)' : (posCounts.DB === 1 ? 'DB2 (Titulaire)' : 'Banc');
      if (pos === 'D/ST') return 'D/ST (Défense Collective)';
      if (pos === 'K') return 'K (Kicker)';
      return 'Banc';
    }

    // Rounds 1 & 2: Focus on Elite RB & WR
    if (details.round <= 2) {
      const topRBs = available.filter(p => p.pos === 'RB').slice(0, 2);
      const topWRs = available.filter(p => p.pos === 'WR').slice(0, 2);
      
      if (topRBs.length > 0) recs.push({ player: topRBs[0], targetSlot: getTargetSlotName('RB'), reason: `Pilier offensif RB d'élite pour vos choix consécutifs #14/#15.` });
      if (topWRs.length > 0) recs.push({ player: topWRs[0], targetSlot: getTargetSlotName('WR'), reason: `Machine à réceptions WR1 d'élite (0.5 PPR).` });
      if (topRBs.length > 1 && (!topWRs.length || topRBs[1].adp < topWRs[0].adp)) {
        recs.push({ player: topRBs[1], targetSlot: getTargetSlotName('RB'), reason: `Option double RB élite (Derrick Henry / Jonathan Taylor / Gibbs).` });
      } else if (topWRs.length > 1) {
        recs.push({ player: topWRs[1], targetSlot: getTargetSlotName('WR'), reason: `Option alternatif WR élite (Harrison Jr / Puka / Wilson).` });
      }
    } 
    // Rounds 3 & 4: Top QB, Top TE or RB2/WR2
    else if (details.round <= 4) {
      const topQB = available.find(p => p.pos === 'QB' && (p.tier <= 2 || p.adp < 60));
      const topTE = available.find(p => p.pos === 'TE' && (p.tier <= 2 || p.adp < 60));
      const topRB = available.find(p => p.pos === 'RB');
      const topWR = available.find(p => p.pos === 'WR');

      if (posCounts.QB === 0 && topQB) recs.push({ player: topQB, targetSlot: getTargetSlotName('QB'), reason: `Sécurise un QB1 d'élite (${topQB.name}) avant le long trou de 26 choix.` });
      if (posCounts.TE === 0 && topTE) recs.push({ player: topTE, targetSlot: getTargetSlotName('TE'), reason: `Avantage décisif au poste rare de Tight End (TE1).` });
      if (posCounts.RB < 2 && topRB) recs.push({ player: topRB, targetSlot: getTargetSlotName('RB'), reason: `Consolidation de votre duo titulaire de Running Backs.` });
      if (posCounts.WR < 2 && topWR) recs.push({ player: topWR, targetSlot: getTargetSlotName('WR'), reason: `Consolidation de votre duo titulaire de Receveurs.` });
    }
    // Rounds 5 & 6: Fill missing offensive starters (QB/TE/RB2/WR2)
    else if (details.round <= 6) {
      if (posCounts.QB === 0) {
        const qb = available.find(p => p.pos === 'QB');
        if (qb) recs.push({ player: qb, targetSlot: getTargetSlotName('QB'), reason: `Comble votre poste vacant de QB titulaire.` });
      }
      if (posCounts.TE === 0) {
        const te = available.find(p => p.pos === 'TE');
        if (te) recs.push({ player: te, targetSlot: getTargetSlotName('TE'), reason: `Comble votre poste vacant de Tight End (TE1).` });
      }
      if (posCounts.RB < 2) {
        const rb = available.find(p => p.pos === 'RB');
        if (rb) recs.push({ player: rb, targetSlot: getTargetSlotName('RB'), reason: `Comble votre poste vacant de Running Back (RB2).` });
      }
      if (posCounts.WR < 2) {
        const wr = available.find(p => p.pos === 'WR');
        if (wr) recs.push({ player: wr, targetSlot: getTargetSlotName('WR'), reason: `Comble votre poste vacant de Receveur (WR2).` });
      }
      available.filter(p => p.pos === 'RB' || p.pos === 'WR').slice(0, 3 - recs.length).forEach(p => {
        recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Meilleure valeur offensive disponible (${p.pos}).` });
      });
    }
    // Rounds 7 & 8: IDP Entry (LB1 Tackle Machine) or Sleeper
    else if (details.round <= 8) {
      const topLB = available.find(p => p.pos === 'LB');
      if (topLB && posCounts.LB < 2) recs.push({ player: topLB, targetSlot: getTargetSlotName('LB'), reason: `🛡️ Tackle Machine n°1 pour votre poste LB vacant (140+ plaquages).` });
      available.filter(p => p.pos === 'RB' || p.pos === 'WR').slice(0, 3 - recs.length).forEach(p => {
        recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Sleeper offensif à fort potentiel pour votre équipe.` });
      });
    }
    // Rounds 9 & 10: DL1 Pass Rusher & LB2
    else if (details.round <= 10) {
      const topDL = available.find(p => p.pos === 'DL');
      const topLB = available.find(p => p.pos === 'LB');
      if (topDL && posCounts.DL === 0) recs.push({ player: topDL, targetSlot: getTargetSlotName('DL'), reason: `⚔️ Chasseur de sacks d'élite pour votre poste DL vacant.` });
      if (topLB && posCounts.LB < 2) recs.push({ player: topLB, targetSlot: getTargetSlotName('LB'), reason: `Deuxième Linebacker (LB2) régulier aux plaquages.` });
      available.filter(p => p.pos === 'RB' || p.pos === 'WR').slice(0, 3 - recs.length).forEach(p => {
        recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Profondeur offensive de banc.` });
      });
    }
    // Rounds 11 & 12: DB1 & DB2 Safeties
    else if (details.round <= 12) {
      const topDBs = available.filter(p => p.pos === 'DB').slice(0, 2);
      topDBs.forEach(p => recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Safety pour combler votre poste DB vacant.` }));
      const remainingNeed = available.filter(p => p.pos === 'RB' || p.pos === 'WR').slice(0, 3 - recs.length);
      remainingNeed.forEach(p => recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Remplaçant offensif à surveiller.` }));
    }
    // Rounds 13-17: DST, Kicker (Round 17 only), Sleepers
    else {
      if (details.round >= 15 && posCounts["D/ST"] === 0) {
        const dst = available.find(p => p.pos === 'D/ST');
        if (dst) recs.push({ player: dst, targetSlot: 'D/ST (Titulaire)', reason: `Comble votre poste vacant de Défense Collective.` });
      }
      if (details.round === 17 && posCounts.K === 0) {
        const k = available.find(p => p.pos === 'K');
        if (k) recs.push({ player: k, targetSlot: 'K (Titulaire)', reason: `Comble votre poste vacant de Kicker au dernier tour.` });
      }
      available.slice(0, 3 - recs.length).forEach(p => {
        recs.push({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Meilleur joueur restant (Best Player Available).` });
      });
    }

    if (recs.length === 0) {
      recs = available.slice(0, 3).map(p => ({ player: p, targetSlot: getTargetSlotName(p.pos), reason: `Meilleur joueur disponible (ADP ${p.adp}).` }));
    }
    recs = recs.slice(0, 3);

    // Render Recommendations avec badges de priorité
    const medals = [
      { badge: "🥇 Priorité N°1 (Recommandé)", color: "#F59E0B" },
      { badge: "🥈 Option Forte N°2", color: "#94A3B8" },
      { badge: "🥉 Alternative N°3", color: "#D97706" }
    ];

    aiSuggestionsCards.innerHTML = recs.map((r, index) => {
      const medal = medals[index] || { badge: `Option N°${index + 1}`, color: "#10B981" };
      return `
        <div class="rec-card" onclick="window.draftPlayerMe('${r.player.id}')" style="${index === 0 ? 'border-color: #F59E0B; box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);' : ''}">
          <div style="font-size:0.72rem; font-weight:800; color:${medal.color}; text-transform:uppercase; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            ${medal.badge}
          </div>
          <div class="rec-header">
            <span class="pos-tag pos-${r.player.pos.toLowerCase().replace('/', '')}">${r.player.pos}</span>
            <span style="font-size:0.75rem; color:#10B981; font-weight:700; background:rgba(16,185,129,0.15); padding:2px 6px; border-radius:4px;">👉 Pour : ${r.targetSlot || r.player.pos}</span>
          </div>
          <div class="rec-name">${r.player.name} <span style="font-size:0.75rem; color:var(--text-muted);">(${r.player.team} - Bye ${r.player.bye})</span></div>
          <div class="rec-reason">${r.reason}</div>
        </div>
      `;
    }).join("");
  }

  // Render Players Table (Optimized with slice for 60FPS fluid search)
  function renderPlayersTable() {
    const q = searchQuery.trim().toLowerCase();
    
    let filtered = PLAYERS_DATA.filter(p => {
      const sId = String(p.id);
      const isDrafted = !!draftedPlayers[sId];

      if (onlyAvailable && isDrafted) return false;
      if (activeFilter !== 'ALL' && p.pos !== activeFilter) return false;
      if (q !== '') {
        return p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.pos.toLowerCase().includes(q);
      }
      return true;
    });

    const totalMatches = filtered.length;
    // Cap rendered rows to 80 for maximum DOM responsiveness
    const displayed = filtered.slice(0, 80);

    playersTableBody.innerHTML = displayed.map(p => {
      const sId = String(p.id);
      const status = draftedPlayers[sId];
      let rowClass = "";
      if (status === 'ME') rowClass = "drafted-by-me";
      if (status === 'OTHER') rowClass = "drafted-by-other";

      const posClass = `pos-${p.pos.toLowerCase().replace('/', '')}`;

      return `
        <tr class="${rowClass}">
          <td style="font-weight:700; color:var(--text-muted);">#${p.adp}</td>
          <td>
            <div class="player-name-cell">
              <span class="player-name-title">${p.name}</span>
              <span class="player-name-sub">${p.team} • Semaine Repos ${p.bye || '—'}</span>
            </div>
          </td>
          <td><span class="pos-tag ${posClass}">${p.pos}</span></td>
          <td style="font-weight:600; color:#FBBF24;">Tier ${p.tier}</td>
          <td style="font-weight:700; color:#34D399;">${p.proj} pts</td>
          <td><div class="player-notes">${p.notes}</div></td>
          <td>
            ${status ? `
              <span style="font-size:0.8rem; font-weight:700; color:${status === 'ME' ? '#34D399' : 'var(--text-muted)'};">
                ${status === 'ME' ? '✅ Dans votre équipe' : '❌ Pris par rival'}
              </span>
            ` : `
              <div class="action-btn-group">
                <button class="btn-draft-me" onclick="window.draftPlayerMe('${p.id}')">🍺 Mon Pick</button>
                <button class="btn-draft-rival" onclick="window.draftPlayerOther('${p.id}')">Pris</button>
              </div>
            `}
          </td>
        </tr>
      `;
    }).join("");

    if (totalMatches > 80) {
      playersTableBody.innerHTML += `
        <tr>
          <td colspan="7" style="text-align:center; padding:12px; color:var(--text-muted); font-size:0.8rem; background:rgba(0,0,0,0.2);">
            Affichage des 80 premiers résultats (sur ${totalMatches} joueurs). Utilisez la recherche pour affiner si besoin.
          </td>
        </tr>
      `;
    }
  }

  // Assign Player to Best Matching Roster Slot
  function assignToRoster(player) {
    // 1. Try starter slots matching position
    for (const slot of ROSTER_SLOTS) {
      if (slot.pos === player.pos && !myRoster[slot.key]) {
        myRoster[slot.key] = player;
        return slot.key;
      }
    }
    // 2. Try Bench slots
    for (const slot of ROSTER_SLOTS) {
      if (slot.pos === 'ANY' && !myRoster[slot.key]) {
        myRoster[slot.key] = player;
        return slot.key;
      }
    }
    return null;
  }

  // Remove player from roster
  window.removeRosterSlot = function(slotKey) {
    const player = myRoster[slotKey];
    if (player) {
      delete draftedPlayers[String(player.id)];
      delete myRoster[slotKey];
      saveState();
      updateAll();
    }
  };

  // Render Roster Panel
  function renderRoster() {
    let filledCount = 0;
    rosterSlotsContainer.innerHTML = ROSTER_SLOTS.map(slot => {
      const player = myRoster[slot.key];
      if (player) filledCount++;
      const posTag = player ? `<span class="pos-tag pos-${player.pos.toLowerCase().replace('/', '')}" style="margin-right:6px; font-size:0.65rem;">${player.pos}</span>` : '';
      return `
        <div class="roster-slot-row">
          <div class="slot-label">${slot.label.split(' ')[0]}</div>
          <div class="slot-player ${player ? 'filled' : ''}">
            ${player ? `
              <span>${posTag}<strong>${player.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${player.team})</span></span>
              <button class="btn-remove-slot" title="Retirer" onclick="window.removeRosterSlot('${slot.key}')">✕</button>
            ` : '— Vide —'}
          </div>
        </div>
      `;
    }).join("");

    rosterFilledCount.innerText = `${filledCount} / 19`;
  }

  // Global Actions (Ultra safe with String ID casting)
  window.draftPlayerMe = function(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    const sId = String(player.id);
    draftedPlayers[sId] = 'ME';
    const slotKey = assignToRoster(player);
    
    // Save to history for undo
    draftHistory.push({ type: 'ME', playerId: sId, slotKey, prevPick: currentPick });
    currentPick++;
    
    saveState();
    updateAll();
  };

  window.draftPlayerOther = function(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    const sId = String(player.id);
    draftedPlayers[sId] = 'OTHER';
    
    // Save to history for undo
    draftHistory.push({ type: 'OTHER', playerId: sId, prevPick: currentPick });
    currentPick++;
    
    saveState();
    updateAll();
  };

  // Undo Functionality (1-Click recovery)
  window.undoLastDraft = function() {
    if (draftHistory.length === 0) {
      alert("Aucune action à annuler.");
      return;
    }
    const lastAction = draftHistory.pop();
    delete draftedPlayers[lastAction.playerId];
    if (lastAction.type === 'ME' && lastAction.slotKey) {
      delete myRoster[lastAction.slotKey];
    }
    currentPick = Math.max(1, lastAction.prevPick);
    saveState();
    updateAll();
  };

  function updateAll() {
    updateTurnBanner();
    generateRecommendations();
    renderPlayersTable();
    renderRoster();
  }

  // Event Listeners
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderPlayersTable();
  });

  posFilterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      posFilterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-pos");
      renderPlayersTable();
    });
  });

  if (chkOnlyAvailable) {
    chkOnlyAvailable.addEventListener("change", (e) => {
      onlyAvailable = e.target.checked;
      renderPlayersTable();
    });
  }

  btnPrevPick.addEventListener("click", () => {
    if (currentPick > 1) {
      currentPick--;
      saveState();
      updateAll();
    }
  });

  btnNextPick.addEventListener("click", () => {
    currentPick++;
    saveState();
    updateAll();
  });

  if (btnUndo) {
    btnUndo.addEventListener("click", () => {
      window.undoLastDraft();
    });
  }

  // --- Position Floating Tooltip Management (Propre & Sans persistance) ---
  const tooltipBox = document.createElement("div");
  tooltipBox.className = "position-tooltip-box";
  tooltipBox.id = "positionTooltipBox";
  document.body.appendChild(tooltipBox);

  let activeTooltipPos = null;

  function showPositionTooltip(e, posKey) {
    if (!posKey || posKey === 'ALL' || posKey === 'ANY') {
      hidePositionTooltip();
      return;
    }
    const cleanPos = posKey.replace(/[0-9]/g, '').trim().toUpperCase();
    const info = POSITION_DESCRIPTIONS[cleanPos] || POSITION_DESCRIPTIONS[posKey];
    if (!info) {
      hidePositionTooltip();
      return;
    }

    activeTooltipPos = cleanPos;
    const posClass = `pos-${cleanPos.toLowerCase().replace('/', '')}`;
    tooltipBox.innerHTML = `
      <div class="tooltip-pos-header">
        <span class="tooltip-pos-badge pos-tag ${posClass}">${cleanPos}</span>
        <span class="tooltip-pos-title">${info.fullName}</span>
      </div>
      <div class="tooltip-pos-role">🎯 ${info.role}</div>
      <div class="tooltip-pos-desc">${info.desc}</div>
    `;

    positionTooltip(e);
    tooltipBox.classList.add("show");
  }

  function positionTooltip(e) {
    const x = e.clientX + 16;
    const y = e.clientY + 16;
    
    const tooltipWidth = 320;
    const tooltipHeight = 130;
    const maxX = window.innerWidth - tooltipWidth - 20;
    const maxY = window.innerHeight - tooltipHeight - 20;

    tooltipBox.style.left = `${Math.min(x, maxX)}px`;
    tooltipBox.style.top = `${Math.min(y, maxY)}px`;
  }

  function hidePositionTooltip() {
    activeTooltipPos = null;
    tooltipBox.classList.remove("show");
  }

  // Écouteur unifié et sécurisé sur le document
  document.addEventListener("mousemove", (e) => {
    const target = e.target.closest(".pos-tag, .pos-btn[data-pos]:not([data-pos='ALL']), .slot-label");
    if (!target) {
      if (activeTooltipPos !== null) {
        hidePositionTooltip();
      }
      return;
    }

    let pos = target.getAttribute("data-pos");
    if (!pos && target.classList.contains("pos-tag")) {
      pos = target.innerText.trim();
    }
    if (!pos && target.classList.contains("slot-label")) {
      pos = target.innerText.split(' ')[0].trim();
    }

    if (pos && pos !== 'ALL' && pos !== 'ANY') {
      if (activeTooltipPos !== pos) {
        showPositionTooltip(e, pos);
      } else {
        positionTooltip(e);
      }
    } else {
      hidePositionTooltip();
    }
  });

  // Masquer également si la souris quitte la fenêtre du navigateur
  document.addEventListener("mouseleave", () => {
    hidePositionTooltip();
  });

  // --- Fonctions de Sauvegarde & Restauration de Secours (Fichier JSON) ---
  const btnExport = document.getElementById("btnExport");
  const btnImport = document.getElementById("btnImport");
  const importFileInput = document.getElementById("importFileInput");

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const backupData = {
        timestamp: new Date().toISOString(),
        leagueId: "1679764330",
        team: "TheFarmerBeer",
        currentPick,
        myRoster,
        draftedPlayers,
        draftHistory
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sauvegarde_TheFarmerBeer_draft_pick${currentPick}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.currentPick && parsed.draftedPlayers) {
            currentPick = parsed.currentPick;
            myRoster = parsed.myRoster || {};
            draftedPlayers = parsed.draftedPlayers || {};
            draftHistory = parsed.draftHistory || [];
            saveState();
            updateAll();
            alert("✅ Sauvegarde de secours rechargée avec succès !");
          } else {
            alert("❌ Fichier de sauvegarde non reconnu.");
          }
        } catch (err) {
          alert("❌ Erreur lors de la lecture du fichier : " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  btnReset.addEventListener("click", () => {
    if (confirm("Voulez-vous vraiment réinitialiser toute la draft ?")) {
      currentPick = 1;
      myRoster = {};
      draftedPlayers = {};
      draftHistory = [];
      localStorage.removeItem("farmer_beer_draft_state");
      updateAll();
    }
  });

  // Initial Run
  updateAll();
});
