'use strict';

//========================================================================
//=  ENDGAME BOSS TESTING — SINGLE-BOSS ARENA SANDBOX                    =
//========================================================================
//=  Testing screen reachable from the Nexus of Worlds. Lists every      =
//=  registered boss (EG_BOSS_DEFS), grouped under the map-tier headers =
//=  of their atlas region (EG_ATLAS_REGION_BOSSES in boss-rosters.js), =
//=  so each fight can be tried without running full maps. Each boss is =
//=  fought at its tier's monster level, matching real map difficulty.  =
//=  Picking a boss:                                                     =
//=                                                                      =
//=    1. generates a small boss-arena puzzle as the seed level          =
//=    2. stamps single-boss run parameters onto it                      =
//=       (no regular monsters, no kill/puzzle/quiz objectives,          =
//=       unlimited mistakes, generous time)                             =
//=    3. starts it via startLevel() and spawns the chosen boss          =
//=       straight onto that arena — no extra arena transition.          =
//=                                                                      =
//=  Win path: slay the boss → loot explosion (normal boss loot) →       =
//=  collect at leisure → Complete Map → back to this screen.            =
//=  Defeat path: _egEndMapDefeated shows the map-lost summary whose    =
//=  return button is re-routed here (see _egShowLeaveMapTransition).    =
//=                                                                      =
//=  The seed level is flagged isBossTestSeed and restored by            =
//=  _egCleanupBossTestSeedLevel() (called from _egChainCleanup).        =
//========================================================================


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

// Generous time budget for a single test fight (1 hour, in seconds).
const EG_BOSS_TEST_TIME_LIMIT = 3600;

// Fallback monster level per map tier (T1–T16), used when
// _egMapTierMonsterLevel() (endgame-maps.js) is unavailable. Mirrors
// EG_MAP_TIER_MONSTER_LEVELS.
const EG_BOSS_TEST_TIER_LEVELS = [3, 6, 10, 14, 19, 24, 30, 36, 43, 50, 57, 64, 71, 78, 84, 90];

// Fallback test level for bosses with no atlas region assigned.
const EG_BOSS_TEST_DEFAULT_LEVEL = 50;

// Arena board caps — mirrors EG_BOSS_ARENA_MAX_ROWS/COLS in
// endgame-encounter-chain.js so fights feel like real boss arenas.
const EG_BOSS_TEST_ARENA_MAX_ROWS = 15;
const EG_BOSS_TEST_ARENA_MAX_COLS = 25;
const EG_BOSS_TEST_ARENA_MIN_CELLS = 36;


//------------------------------------------------------------------------
//-------------------SEED RESTORE-----------------------------------------
//------------------------------------------------------------------------

// Strips all stamped run fields off the boss-test seed level. Called from
// _egChainCleanup() so a story level returns to its pristine state —
// including when the seed is still `cur` (forfeiting mid-first-arena is
// the common case when testing, and there is no same-level retry flow
// that would need the fields preserved).
function _egCleanupBossTestSeedLevel() {
    // Launch guard: _egChainCleanup also fires from _egStopEncounter
    // during the launch's own startLevel() call — wiping the stamp there
    // would kill the run before the first encounter begins (same pattern
    // as _egMapDeviceLaunching in endgame-map-launch.js).
    if (window._egBossTestLaunching) return;

    const seedGi = window._egBossTestSeedGi;
    window._egBossTestSeedGi = null;
    if (seedGi == null) return;

    const level = (typeof ALL !== 'undefined') ? ALL[seedGi] : null;
    if (!level) return;

    delete level.isBossTestSeed;
    delete level.isMonsterLevel;
    delete level.isBossArena;
    ['monsterLevel', 'maxMonsters', 'totalMonsters', 'hasBoss', 'maxBosses',
     'bosses', 'requiredPuzzles', 'requiredQuestions', 'puzzlePool',
     'egTimeLimit', 'egMaxMistakes'].forEach(key => delete level[key]);
}


//------------------------------------------------------------------------
//-------------------TIER MAPPING-----------------------------------------
//------------------------------------------------------------------------

// Returns the atlas map tier (1–16) a boss belongs to, via
// EG_ATLAS_REGION_BOSSES (boss-rosters.js: region `atlas_t{tier}_{slot}`
// → boss id). Returns 0 when the boss has no assigned region.
function _egbtBossTier(bossId) {
    if (typeof EG_ATLAS_REGION_BOSSES === 'undefined') return 0;
    for (const regionId of Object.keys(EG_ATLAS_REGION_BOSSES)) {
        if (EG_ATLAS_REGION_BOSSES[regionId] !== bossId) continue;
        const m = /^atlas_t(\d+)_/.exec(regionId);
        if (m) return Math.max(1, Math.min(16, parseInt(m[1], 10)));
    }
    return 0;
}

// Monster level a boss of the given tier fights at on real maps.
function _egbtTierMonsterLevel(tier) {
    if (typeof _egMapTierMonsterLevel === 'function') {
        try { return Math.max(1, Math.round(_egMapTierMonsterLevel(tier))); } catch (e) {}
    }
    return EG_BOSS_TEST_TIER_LEVELS[Math.max(1, Math.min(16, tier)) - 1];
}

// Test level for one boss: its tier's monster level, or the default for
// bosses with no assigned region.
function _egbtLevelForBoss(bossId) {
    const tier = _egbtBossTier(bossId);
    return tier > 0 ? _egbtTierMonsterLevel(tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
}


//------------------------------------------------------------------------
//-------------------BOSS TOOLTIP & TEST HP HELPERS-----------------------
//------------------------------------------------------------------------

// Builds a tooltip HTML string for a boss, listing its phases, mechanics,
// and estimated damage at the given level. Uses showGameTooltip from tooltips-hud.js.
function _egbtBuildBossTooltipHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const mechDef = (typeof EG_BOSS_MECHANICS !== 'undefined') ? EG_BOSS_MECHANICS[def.id] : null;
    if (!mechDef) return null;

    let html = `<div style="min-width:280px;">
        <div style="font-size:13px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">
            ${def.emoji || '💀'} ${def.name || def.id}
        </div>
        <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">
            Lv ${level} · ❤️ ${preview.hp.toLocaleString()} · 🗡️ ${preview.dmg} base
        </div>`;

    // Tier line — the boss's atlas tier drives every tier-scaled mechanic
    // (Corrupt Cells caps/rates, Prior Bomb counts/fuse, Probability Shift
    // target counts). Shown for every boss so playtesting numbers are
    // transparent. Unassigned bosses fall back to the tier of their level.
    let tier = (typeof _egbtBossTier === 'function') ? _egbtBossTier(def.id) : 0;
    if (tier <= 0 && typeof _egRollMapTier === 'function') {
        try { tier = _egRollMapTier(level); } catch (e) { tier = 0; }
    }
    if (tier > 0) {
        html += `<div style="font-size:11px;margin-bottom:8px;">
            <span style="color:#f5d98a;font-weight:700;">${t('eg_boss_test_tier').replace('{n}', tier)}</span>
            <span style="opacity:0.6;"> · tier-scaled mechanics use these values</span>
        </div>`;
    }

    // Corruption caps at this tier (only for bosses using corrupt_cells).
    // Mirrors the live fight values: cap = P2 spread ceiling / P3 relentless ceiling.
    if (mechDef.mechanics && mechDef.mechanics.some(m => (m.handler || '').includes('CorruptCells'))) {
        const norm = (typeof _egBossTierNorm === 'function')
            ? (() => { try { return _egBossTierNorm({ level }); } catch (e) { return 0.5; } })()
            : 0.5;
        const cap2 = (typeof _egCorruptSpreadCap === 'function')
            ? _egCorruptSpreadCap({ p: 2, norm }) : null;
        const cap3 = (typeof _egCorruptSpreadCap === 'function')
            ? _egCorruptSpreadCap({ p: 3, norm }) : null;
        if (cap2 != null && cap3 != null) {
            html += `<div style="font-size:11px;margin-bottom:8px;">
                <span style="color:#7fb8ff;">🧫 Corruption cap:</span>
                <span style="color:#f87171;"> P2 ${cap2}</span>
                <span style="opacity:0.6;"> /</span>
                <span style="color:#f87171;">P3 ${cap3}</span>
                <span style="opacity:0.6;"> cells</span>
            </div>`;
        }
    }

    // Phases
    if (mechDef.phases && mechDef.phases.length > 0) {
        html += `<div style="margin-bottom:8px;">`;
        mechDef.phases.forEach((ph, i) => {
            const pct = Math.round(ph.threshold * 100);
            const dmgMult = ph.damageMultiplier || 1.0;
            const phaseDmg = Math.round(preview.dmg * dmgMult);
            const label = i === 0 ? t('eg_boss_test_phase_base') : t('eg_boss_test_phase').replace('{n}', i + 1);
            html += `<div style="font-size:11px;margin:3px 0;">
                <span style="color:var(--accent2,#ccc);">${label}:</span>
                <span style="color:#f87171;"> ≤${pct}% HP</span>
                <span style="color:#7fd67f;"> (×${dmgMult.toFixed(2)} dmg → ~${phaseDmg})</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Mechanics
    if (mechDef.mechanics && mechDef.mechanics.length > 0) {
        html += `<div style="border-top:1px solid rgba(200,168,75,0.3);padding-top:8px;">`;
        html += `<div style="font-size:11px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">${t('eg_boss_test_mechanics')}</div>`;
        mechDef.mechanics.forEach(m => {
            const interval = m.intervalBase ? `${(m.intervalBase / 1000).toFixed(1)}s` : '—';
            const variance = m.intervalVariance ? `±${(m.intervalVariance / 1000).toFixed(1)}s` : '';
            const phase2 = m.phase2Only ? ` <span style="color:#f5d98a;font-size:10px;">[P2+]</span>` : '';
            const handler = m.handler || '—';
            html += `<div style="font-size:10px;margin:2px 0;font-family:inherit;">
                <span style="color:#7fb8ff;">${m.name || '?'}${phase2}</span>
                <span style="opacity:0.6;"> — every ${interval} ${variance}</span>
                <span style="opacity:0.4;"> → ${handler}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Soft enrage note
    if (typeof EG_BOSS_SOFT_ENRAGE_DELAY_MS !== 'undefined') {
        const delayMin = EG_BOSS_SOFT_ENRAGE_DELAY_MS / 60000;
        const stepPct = Math.round(EG_BOSS_SOFT_ENRAGE_DMG_STEP * 100);
        html += `<div style="margin-top:8px;font-size:10px;opacity:0.6;">
            ${t('eg_boss_test_soft_enrage').replace('{delay}', delayMin).replace('{step}', stepPct)}
        </div>`;
    }

    html += `</div>`;
    return html;
}

// Test HP boost: scales boss to ~500k max HP while keeping phase thresholds
// and damage unchanged.
function _egbtCalcTestHPMultiplier(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const targetHP = 500000;
    return preview.hp > 0 ? targetHP / preview.hp : 1;
}

// Shows the boss tooltip on mouseenter.
function _egbtShowTooltip(cardEl, e) {
    const bossId = cardEl.dataset.bossId;
    const level = Number(cardEl.dataset.bossLevel);
    if (!bossId || !level) return;
    const def = (typeof EG_BOSS_DEFS !== 'undefined') ? EG_BOSS_DEFS[bossId] : null;
    if (!def) return;
    const html = _egbtBuildBossTooltipHTML(def, level);
    if (html) showGameTooltip(html, e);
}

// Toggles the 500k HP test mode checkbox. Rebinds the card and Fight
// button handlers so the launch carries the boost (or drops it again on
// uncheck). Handlers are real functions, not string attributes, so the
// rebind works identically in every environment.
function _egbtToggleTestHP(checkbox, bossId, level, hpMult) {
    const card = checkbox.closest('.egbt-boss-card');
    if (!card) return;
    const newHpMult = checkbox.checked ? hpMult : 1;
    card.onclick = (ev) => {
        if (ev.target.closest('button')) return;   // Fight button handles itself
        _egLaunchBossTest(bossId, level, newHpMult);
    };
    const btn = card.querySelector('.egbt-fight-btn');
    if (btn) {
        btn.onclick = (ev) => {
            ev.stopPropagation();
            _egLaunchBossTest(bossId, level, newHpMult);
        };
    }
    const statsEl = card.querySelector('.egbt-boss-stats');
    if (statsEl) {
        const def = (typeof EG_BOSS_DEFS !== 'undefined') ? EG_BOSS_DEFS[bossId] : null;
        if (def) {
            const p = _egbtScaledPreview(def, level);
            const hp = checkbox.checked ? Math.round(p.hp * hpMult) : p.hp;
            // Test boost only scales HP — damage stays at its normal value.
            statsEl.textContent = `Lv ${level} · ❤️ ${hp} · 🗡️ ${p.dmg}`;
        }
    }
}


//------------------------------------------------------------------------
//-------------------GODMODE DEBUG TOGGLE----------------------------------
//------------------------------------------------------------------------
// Proper UI switch for the damage-immune debug flag window._egGodMode
// (honoured at the top of _egPlayerTakeDamage). Lives in the boss-test
// settings bar, persists per browser so the state survives screen changes,
// and a fixed HUD chip shows "GODMODE ON" wherever you are — no console
// access needed. The chip also guards against accidentally leaving it on
// during a real map run.
let _egbtGodModeOn = false;


// Applies the flag, persists it, and re-syncs every godmode UI element.
function _egbtApplyGodMode(on) {
    _egbtGodModeOn = !!on;
    window._egGodMode = _egbtGodModeOn;
    try { localStorage.setItem('_egbtGodMode', _egbtGodModeOn ? '1' : '0'); } catch (e) {}
    _egbtSyncGodModeUI();
}


// Restores the persisted state (called when the boss-test screen opens and
// once at script load, so the chip is correct even outside the screen).
function _egbtInitGodMode() {
    let on = false;
    try { on = localStorage.getItem('_egbtGodMode') === '1'; } catch (e) {}
    _egbtApplyGodMode(on);
}


// Checkbox handler (inline onchange).
function _egbtToggleGodMode(checkbox) {
    _egbtApplyGodMode(checkbox && checkbox.checked);
}


// Keeps every godmode UI element in sync: the settings checkbox + state
// badge on the boss-test screen, and the always-visible in-game chip.
function _egbtSyncGodModeUI() {
    const on = _egbtGodModeOn;
    document.querySelectorAll('.egbt-godmode-checkbox').forEach(cb => { cb.checked = on; });
    const badge = document.getElementById('egbt-godmode-badge');
    if (badge) {
        badge.textContent = on ? t('eg_boss_test_godmode_on') : t('eg_boss_test_godmode_off');
        badge.classList.toggle('egbt-godmode-on', on);
    }
    let chip = document.getElementById('egbt-godmode-chip');
    if (on) {
        if (!chip) {
            chip = document.createElement('div');
            chip.id = 'egbt-godmode-chip';
            chip.textContent = '🛡️ ' + t('eg_boss_test_godmode_on');
            document.body.appendChild(chip);
        }
    } else if (chip) {
        chip.remove();
    }
}


//------------------------------------------------------------------------
//-------------------ARENA SEED PICK--------------------------------------
//------------------------------------------------------------------------

// Picks a small generated puzzle for the test arena. Falls back to a
// small story puzzle when generation is unavailable.
function _egbtPickArenaGi() {
    if (typeof _egCreateGeneratedLevel === 'function') {
        const gi = _egCreateGeneratedLevel({
            mode: 'mixed',
            tier: 1,
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            minCells: EG_BOSS_TEST_ARENA_MIN_CELLS,
        });
        if (gi !== null) return gi;
    }

    if (typeof _egBuildChainPool === 'function') {
        let pool = _egBuildChainPool({
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            avoidRecent: false,
        });
        if (typeof isGatedLevel === 'function') {
            pool = pool.filter(level => !isGatedLevel(level.gIdx));
        }
        if (pool.length > 0) {
            return pool[Math.floor(Math.random() * pool.length)].gIdx;
        }
    }

    return null;
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// Starts a single-boss test fight. Called from a boss card's onclick.
// Falls back to the boss's tier level when no explicit level is passed.
// hpMult: optional multiplier applied to boss max HP only (e.g., ~500k HP
// test mode). Damage is left at its normal scaled value.
function _egLaunchBossTest(bossId, level, hpMult) {
    if (typeof EG_BOSS_DEFS === 'undefined' || !EG_BOSS_DEFS[bossId]) return;

    const lvl = Math.max(1, Math.min(95, Math.round(level != null ? level : _egbtLevelForBoss(bossId))));
    const boost = hpMult && hpMult > 1 ? hpMult : 1;

    const gi = _egbtPickArenaGi();
    if (gi === null) {
        if (typeof showToast === 'function') showToast(t('eg_no_more_puzzles'));
        return;
    }

    const seed = ALL[gi];
    seed.isMonsterLevel = true;
    seed.isBossTestSeed = true;
    seed.isBossArena = true;
    window._egBossTestSeedGi = gi;

    seed.monsterLevel = lvl;
    seed.maxMonsters = 0;
    seed.totalMonsters = 0;
    seed.hasBoss = true;
    seed.bosses = [{ id: bossId, level: lvl, hpMult: boost }];
    seed.maxBosses = 1;
    seed.requiredPuzzles = 0;
    seed.requiredQuestions = 0;
    seed.puzzlePool = {};
    seed.egTimeLimit = EG_BOSS_TEST_TIME_LIMIT;
    delete seed.egMaxMistakes;      // unlimited mistakes while testing

    // Routes forfeit-via-levels-button back to this screen
    // (see goToLevelSelect in screens.js).
    window._egIsBossTestRun = true;

    // Lose-overlay hardening so every defeat path inside the test is
    // covered (same call the map device makes on launch).
    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') {
        try { _egEnsureLoseOverlayEndgameUI(); } catch (e) {}
    }

    window._egBossTestLaunching = true;
    try {
        startLevel(gi);
    } finally {
        window._egBossTestLaunching = false;
    }

    // Spawn the chosen boss straight onto this arena — no extra arena
    // transition. _egMapDef is already `cur` (set by _egResetEncounterState).
    // hpMult rides the queue entry so _egSpawnNextArenaBoss applies the
    // 500k test boost to the spawned boss (entry.hpMult || 1).
    _egBossPhaseQueue = [{ id: bossId, level: lvl, hpMult: boost, isBossSpawn: true }];
    _egBossTotalCount = 1;
    _egBossKilledCount = 0;
    _egBossPhaseActive = true;

    if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
    if (typeof _egSpawnNextArenaBoss === 'function') _egSpawnNextArenaBoss();
}


//------------------------------------------------------------------------
//-------------------SCALED STAT PREVIEW----------------------------------
//------------------------------------------------------------------------

// Side-effect-free preview of a boss's HP at the test level. Mirrors the
// scaling formula in _egBuildBoss (boss-framework.js) without touching
// the spawn counter.
function _egbtScaledPreview(def, level) {
    const lvl = Math.max(1, Math.round(level || 1));
    const baseHpScale = 1 + EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _egGetBossLateHpMult === 'function') ? _egGetBossLateHpMult(lvl) : 1;
    const dmgScale = 1 + EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);
    return {
        hp: Math.round(def.baseHP * baseHpScale * lateMult),
        dmg: Math.round(def.baseDamage * dmgScale),
    };
}


//------------------------------------------------------------------------
//-------------------HTML BUILDERS------------------------------------------
//------------------------------------------------------------------------

function _egbtBuildBossCardHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const safeName = String(def.name || def.id).replace(/"/g, '"');
    const hpMult = _egbtCalcTestHPMultiplier(def, level);
    return `
<div class="egbt-boss-card" data-boss-id="${def.id}" data-boss-level="${level}"
     onmouseenter="_egbtShowTooltip(this, event)"
     onmousemove="moveGameTooltip(event)"
     onmouseleave="hideGameTooltip()"
     onclick="_egLaunchBossTest('${def.id}', ${level})"
     title="${safeName}">
    <div class="egbt-boss-emoji">${def.emoji || '💀'}</div>
    <div class="egbt-boss-name">${def.name || def.id}</div>
    <div class="egbt-boss-stats">Lv ${level} · ❤️ ${preview.hp} · 🗡️ ${preview.dmg}</div>
    <div class="egbt-boss-id">${def.id}</div>
    <label class="egbt-test-hp-label"
           onmousedown="event.stopPropagation()"
           onclick="event.stopPropagation();">
        <input type="checkbox" class="egbt-test-hp-checkbox"
               onmousedown="event.stopPropagation()"
               onclick="event.stopPropagation();"
               onchange="_egbtToggleTestHP(this, '${def.id}', ${level}, ${hpMult})">
        <span>${t('eg_boss_test_500k_hp')}</span>
    </label>
    <button class="title-btn egbt-fight-btn"
            onclick="event.stopPropagation(); _egLaunchBossTest('${def.id}', ${level})">
        ${t('eg_boss_test_fight')}
    </button>
</div>`;
}

// Groups boss defs into tier sections (1–16, then unassigned as tier 0),
// honouring the search query. Empty tiers are omitted.
function _egbtBuildSections() {
    const all = (typeof EG_BOSS_DEFS !== 'undefined') ? Object.values(EG_BOSS_DEFS) : [];
    const query = String(window._egBossTestSearch || '').trim().toLowerCase();
    const matches = def => !query
        || String(def.name || '').toLowerCase().includes(query)
        || String(def.id || '').toLowerCase().includes(query);
    const byName = (a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id));

    // Resolve each boss's tier once — the roster scan is O(regions).
    const tierOf = {};
    all.forEach(def => { tierOf[def.id] = _egbtBossTier(def.id); });

    const sections = [];
    for (let tier = 1; tier <= 16; tier++) {
        const defs = all.filter(def => tierOf[def.id] === tier && matches(def)).sort(byName);
        if (defs.length > 0) sections.push({ tier, defs });
    }
    const unassigned = all.filter(def => tierOf[def.id] === 0 && matches(def)).sort(byName);
    if (unassigned.length > 0) sections.push({ tier: 0, defs: unassigned });
    return sections;
}

function _egbtBuildSectionHTML(section) {
    const level = section.tier > 0 ? _egbtTierMonsterLevel(section.tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
    const title = section.tier > 0
        ? `${t('eg_boss_test_tier').replace('{n}', section.tier)} · ${t('eg_boss_test_tier_level').replace('{lv}', level)}`
        : t('eg_boss_test_unassigned');
    return `
<div class="egbt-tier-section">
    <div class="egbt-tier-header">${title}</div>
    <div class="egbt-boss-grid">${section.defs.map(def => _egbtBuildBossCardHTML(def, level)).join('')}</div>
</div>`;
}

function _egbtRenderGrid() {
    const container = document.getElementById('egbt-boss-grid');
    if (!container) return;
    const sections = _egbtBuildSections();
    const total = sections.reduce((sum, s) => sum + s.defs.length, 0);
    container.innerHTML = total > 0
        ? sections.map(_egbtBuildSectionHTML).join('')
        : `<div class="egbt-empty">${t('eg_boss_test_no_bosses')}</div>`;
    const count = document.getElementById('egbt-count');
    if (count) count.textContent = t('eg_boss_test_count').replace('{n}', total);
}

function _egbtBuildFullScreenHTML() {
    return `
<div class="egbt-hub-layout">
    <div class="egbt-topbar">
        <button class="title-btn back-btn" onclick="showEndgameNexus()">${t('btn_back')}</button>
        <span class="egbt-topbar-title">${t('eg_boss_test_title')}</span>
        <span class="egbt-count" id="egbt-count"></span>
    </div>
    <div class="egbt-controls">
        <input class="egbt-search" id="egbt-search" type="text"
            placeholder="${t('eg_boss_test_search_placeholder')}"
            oninput="window._egBossTestSearch=this.value;_egbtRenderGrid()">
        <label class="egbt-godmode-label" title="${t('eg_boss_test_godmode_hint')}">
            <input type="checkbox" class="egbt-godmode-checkbox"
                onchange="_egbtToggleGodMode(this)">
            <span>${t('eg_boss_test_godmode')}</span>
        </label>
        <span class="egbt-godmode-badge" id="egbt-godmode-badge"></span>
    </div>
    <div class="egbt-hint">${t('eg_boss_test_hint')}</div>
    <div class="egbt-boss-sections" id="egbt-boss-grid"></div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
// Injected via JS, same pattern as _egtEnsureStyles() in
// endgame-testing-screen.js — avoids needing to touch the main CSS files.

function _egbtEnsureStyles() {
    if (document.getElementById('egbt-boss-test-style')) return;

    const style = document.createElement('style');
    style.id = 'egbt-boss-test-style';
    style.textContent = `
        .egbt-hub-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 16px; box-sizing: border-box; font-family: var(--PX, monospace);
            color: var(--accent2, #e8daef); overflow-y: auto;
        }
        .egbt-topbar {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 12px; flex-wrap: wrap;
        }
        .egbt-topbar-title { font-size: 16px; letter-spacing: 2px; color: var(--accent, #c8a84b); }
        .egbt-count { font-size: 11px; opacity: 0.7; }
        .egbt-controls {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 8px; flex-wrap: wrap;
        }
        .egbt-search {
            font-family: inherit; font-size: 12px; padding: 7px 10px;
            background: rgba(0,0,0,0.4); color: var(--accent2, #e8daef);
            border: 1px solid var(--border2, #444); border-radius: 4px;
            min-width: 220px;
        }
        .egbt-search:focus { border-color: var(--accent, #c8a84b); outline: none; }
        .egbt-hint { font-size: 10px; opacity: 0.6; margin-bottom: 12px; line-height: 1.5; }
        .egbt-boss-sections { display: flex; flex-direction: column; gap: 18px; }
        .egbt-tier-header {
            font-size: 13px; letter-spacing: 2px; color: var(--accent, #c8a84b);
            border-bottom: 1px solid var(--accent, #c8a84b);
            padding-bottom: 5px; margin-bottom: 10px;
        }
        .egbt-boss-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 12px;
        }
        .egbt-boss-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 6px; padding: 12px; cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 5px;
            text-align: center;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .egbt-boss-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 14px rgba(200, 168, 75, 0.35);
        }
        .egbt-boss-emoji { font-size: 30px; }
        .egbt-boss-name { font-size: 12px; color: var(--accent, #c8a84b); }
        .egbt-boss-stats { font-size: 10px; opacity: 0.85; }
        .egbt-boss-id { font-size: 9px; opacity: 0.45; word-break: break-all; }
        .egbt-fight-btn { margin-top: 6px; font-size: 10px; padding: 6px 12px; }
        .egbt-test-hp-label {
            display: flex; align-items: center; gap: 4px;
            margin-top: 6px; font-size: 9px; cursor: pointer;
            color: var(--accent2, #ccc); opacity: 0.8;
        }
        .egbt-test-hp-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: var(--accent, #c8a84b);
        }
        .egbt-godmode-label {
            display: flex; align-items: center; gap: 4px;
            font-size: 10px; cursor: pointer; color: var(--accent2, #ccc); opacity: 0.85;
        }
        .egbt-godmode-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: #4ade80;
        }
        .egbt-godmode-badge {
            font-size: 9px; letter-spacing: 1px; padding: 2px 8px;
            border-radius: 8px; border: 1px solid var(--border2, #444);
            color: var(--accent2, #888); opacity: 0.6;
        }
        .egbt-godmode-badge.egbt-godmode-on {
            color: #4ade80; border-color: rgba(74, 222, 128, 0.6); opacity: 1;
            box-shadow: 0 0 8px rgba(74, 222, 128, 0.35);
        }
        #egbt-godmode-chip {
            position: fixed; top: 10px; right: 12px; z-index: 20000;
            pointer-events: none; font-size: 11px; letter-spacing: 1px;
            padding: 6px 12px; border-radius: 6px;
            background: rgba(6, 40, 22, 0.88); border: 1px solid #4ade80; color: #4ade80;
            box-shadow: 0 0 14px rgba(74, 222, 128, 0.45);
            animation: egbt-godmode-chip-pulse 1.4s ease-in-out infinite alternate;
        }
        @keyframes egbt-godmode-chip-pulse {
            from { box-shadow: 0 0 8px rgba(74, 222, 128, 0.35); }
            to { box-shadow: 0 0 18px rgba(74, 222, 128, 0.7); }
        }
        .egbt-empty { font-size: 12px; opacity: 0.6; grid-column: 1 / -1; text-align: center; padding: 24px; }
        .egbt-topbar .title-btn, .egbt-fight-btn {
            font-family: var(--PX, monospace);
            font-size: 10px;
            letter-spacing: 1px;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444);
            color: var(--accent2, #ccc);
            padding: 8px 16px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.12s;
        }
        .egbt-topbar .title-btn:hover, .egbt-fight-btn:hover {
            border-color: var(--accent, #c8a84b);
            color: var(--accent, #c8a84b);
            background: linear-gradient(180deg, rgba(200,168,75,0.12), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25);
        }
        .egbt-topbar .title-btn:active, .egbt-fight-btn:active {
            transform: translateY(1px);
            box-shadow: none;
        }
     `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egbtCreateScreen() {
    _egbtEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-boss-test';
    screen.className = 'screen';
    screen.innerHTML = _egbtBuildFullScreenHTML();
    document.body.appendChild(screen);
}

function ensureEndgameBossTestScreen() {
    if (!document.getElementById('screen-endgame-boss-test')) _egbtCreateScreen();
}

// Entry point — call this to show the boss selection screen.
function showEndgameBossTest() {
    ensureEndgameBossTestScreen();
    // Rebuild the shell so stale tier content is dropped, keeping the
    // search box for a fresh pick.
    const screen = document.getElementById('screen-endgame-boss-test');
    if (screen) {
        const keepSearch = window._egBossTestSearch || '';
        screen.innerHTML = _egbtBuildFullScreenHTML();
        const searchEl = document.getElementById('egbt-search');
        if (searchEl && keepSearch) {
            searchEl.value = keepSearch;
            window._egBossTestSearch = keepSearch;
        } else {
            window._egBossTestSearch = '';
        }
    }
    switchScreen('screen-endgame-boss-test');
    _egbtRenderGrid();
    // Restore + re-apply the persisted godmode toggle (checkbox, badge, chip).
    _egbtInitGodMode();
}


// Apply the persisted godmode flag at script load so the HUD chip is correct
// even before the boss-test screen is ever opened.
_egbtInitGodMode();
