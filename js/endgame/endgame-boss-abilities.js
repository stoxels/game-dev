
//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------





// ── Boss mechanic definitions ────────────────────────────────────────────────
// Each boss listed in EG_MONSTER_DEFS with isBoss:true can have an entry here.
// When a boss spawns, _egBossInit() reads its entry to set up phases and mechanics.
//
// phases[]       — ordered list of phase thresholds (HP% at which the phase begins),
//                  plus the stat changes that take effect. Phase 1 = full HP.
// immunityDuration — ms the boss is invulnerable during a phase transition.
// mechanics[]    — abilities the boss uses on recurring timers.
//   name            — identifier (for debugging)
//   intervalBase    — base ms between activations
//   intervalVariance — ± random ms variance applied to each interval
//   handler         — name of the global function to call (as a string)
//   phase2Only      — if true, only schedules once the boss reaches phase 2+
const EG_BOSS_MECHANICS = {

    // boss_null — "The Null Hypothesis"
    // Phase 1 (100% → 66%): normal attacks + Corrupt Cells + Clue Blackout
    // Phase 2 ( 66% → 33%): immune window, faster charge, Corrupt Cells worsens
    // Phase 3 (  33% →  0%): enrage — very fast charge, massive damage, both mechanics
    boss_null: {
        phases: [
            { threshold: 1.00, chargeMax: 15, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.66, chargeMax: 10, damageMultiplier: 1.4 }, // Phase 2
            { threshold: 0.33, chargeMax: 6, damageMultiplier: 2.0 }, // Phase 3 — ENRAGE
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'corrupt_cells', intervalBase: 12000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
            { name: 'clue_blackout', intervalBase: 22000, intervalVariance: 6000, handler: '_egMechClueBlackout' },
            { name: 'void_surge', intervalBase: 30000, intervalVariance: 8000, handler: '_egMechVoidSurge' },
        ],
    },

    // boss_bayes — "The Grand Prior"
    // Phase 1 (100% → 50%): normal + Probability Shift + Prior Bomb
    // Phase 2 (  50% →  0%): immune window, Grid Veil activates, all mechanics intensify
    boss_bayes: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.50, chargeMax: 8, damageMultiplier: 1.6 }, // Phase 2 — VEIL
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'probability_shift', intervalBase: 14000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
            // grid_veil fires once on phase 2 activation; intervalBase is set
            // absurdly high so it never self-reschedules after that first trigger.
            { name: 'grid_veil', intervalBase: 999999999, intervalVariance: 0, handler: '_egMechGridVeil', phase2Only: true },
        ],
    },
};

// ── Phase display names (indexed by phase number) ────────────────────────────
// Index 0 is unused. Add entries here as you add more phases to any boss.
// ── Phase display names (translation keys, indexed by phase number) ──────────
// Index 0 is unused. Add entries here as you add more phases to any boss.
const EG_BOSS_PHASE_NAMES = ['', 'eg_phase_1', 'eg_phase_2_enrage', 'eg_phase_3_fury'];

// ── Recent fill tracker capacity ─────────────────────────────────────────────
// Used by the Prior Bomb mechanic. Increase if you want it to reach further back.
const EG_RECENT_FILLS_CAPACITY = 20;

// ── Corrupt cell expiry time ─────────────────────────────────────────────────
const EG_CORRUPT_CELL_LIFETIME_MS = 15000; // ms before corruption auto-expires










//------------------------------------------------------------------------
//-------------------BOSS MECHANIC SCHEDULING-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the delay (ms) for the next trigger of a mechanic at the given phase.
// Higher phases reduce the interval by 20% per phase above 1, capped at 5s minimum.
function _egCalcMechanicInterval(mech, phase) {
    const speedFactor = 1 - (phase - 1) * 0.20;
    const rawInterval = mech.intervalBase
        + (Math.random() * mech.intervalVariance - mech.intervalVariance / 2);
    return Math.max(5000, rawInterval * speedFactor);
}

// Schedules a single mechanic for the given boss at the given phase.
// Self-reschedules after each trigger so the mechanic keeps firing until the boss dies.
function _egBossScheduleSingleMechanic(monster, mech, phase) {
    // phase2Only mechanics are skipped unless we're already in phase 2 or later
    if (mech.phase2Only && phase < 2) return;

    const scheduleNext = () => {
        // Bail out if the encounter ended or this boss is already dead
        if (!_egIsActive() || !_egMonsters.find(m => m.id === monster.id)) return;

        const interval = _egCalcMechanicInterval(mech, phase);
        const t = setTimeout(() => {
            const stillAlive = _egIsActive() && _egMonsters.find(m => m.id === monster.id);
            if (stillAlive && !monster.bossImmune) {
                const fn = window[mech.handler];
                if (typeof fn === 'function') fn(monster, phase);
            }
            scheduleNext();
        }, interval);

        if (_egBossTimers[monster.id]) _egBossTimers[monster.id].push(t);
    };

    // Stagger the very first trigger so all mechanics don't fire simultaneously on spawn
    const initialDelay = 4000 + Math.random() * 8000;
    const t0 = setTimeout(scheduleNext, initialDelay);
    if (_egBossTimers[monster.id]) _egBossTimers[monster.id].push(t0);
}

// Schedules all mechanics defined for a boss at the given phase.
// Called on boss spawn (phase 1) and again after each phase transition.
function _egBossScheduleMechanics(monster, phase) {
    const def = monster.bossDef;
    if (!def) return;
    def.mechanics.forEach(mech => _egBossScheduleSingleMechanic(monster, mech, phase));
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: CORRUPT CELLS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Selects 2 (phase 1) or 3 (phase 2+) random correct unfilled cells and
// covers them with a 🚫 corruption overlay. The player must click the cell
// once to dispel it before they can fill it. Corrupted cells auto-expire.

// Returns all grid cells that are valid targets for the Corrupt Cells mechanic.
// Only targets correct cells (sol=1) that the player hasn't already filled or revealed.
function _egBuildCorruptibleCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue; // only corrupt correct cells
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue; // already filled
            if (_egBossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            pool.push([r, c]);
        }
    }
    return pool;
}

// Places the 🚫 corruption overlay on a cell and registers its expiry timer.
function _egApplyCellCorruption(r, c) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    const overlay = document.createElement('span');
    overlay.className = 'eg-corrupt-overlay';
    overlay.id = `eg-corrupt-${r}-${c}`;
    overlay.textContent = '🚫';
    el.appendChild(overlay);

    const expireTimer = setTimeout(() => _egRemoveCellCorruption(key), EG_CORRUPT_CELL_LIFETIME_MS);
    _egBossCorrupted.set(key, { timer: expireTimer });
}

// Removes the corruption overlay from the DOM and clears its state entry.
function _egRemoveCellCorruption(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-corrupt-${r}-${c}`);
    if (span) span.remove();
    _egBossCorrupted.delete(key);
}

// Removes all currently active corrupted cells.
// Called on boss death or encounter stop to avoid leaving orphaned overlays.
function _egClearAllCorruptedCells() {
    _egBossCorrupted.forEach((data, key) => {
        clearTimeout(data.timer);
        _egRemoveCellCorruption(key);
    });
    _egBossCorrupted.clear();
}

// Returns true if the cell at (row, col) currently has an active corruption overlay.
// Called from mouse-button-handlers.js before allowing a cell fill.
function _egIsCellCorrupted(row, col) {
    return _egBossCorrupted.has(`${row}-${col}`);
}

// Dispels the corruption on a cell when the player clicks it.
// Returns true if the cell was corrupted (caller should block the normal fill action
// and require a second click to actually fill).
function _egDispelCorruption(row, col) {
    const key = `${row}-${col}`;
    if (!_egBossCorrupted.has(key)) return false;

    clearTimeout(_egBossCorrupted.get(key).timer);
    _egRemoveCellCorruption(key);
    showToast(t('eg_corruption_dispelled'));
    return true;
}

// Boss mechanic handler — called by the boss mechanic scheduler.
// Corrupts 2 (phase 1) or 3 (phase 2+) random eligible cells.
function _egMechCorruptCells(monster, phase) {
    const pool = _egBuildCorruptibleCellPool();
    if (pool.length === 0) return;

    const count = phase >= 2 ? 3 : 2;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_corrupt_cells').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egApplyCellCorruption(r, c));
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: CLUE BLACKOUT-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Hides all row and column clue numbers for 8s (phases 1–2) or 12s (phase 3).
// The puzzle remains fully playable — only the clue numbers are obscured.

// Hides all clue spans and stores their original text so it can be restored.
function _egApplyBlackout() {
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        span.dataset.origText = span.textContent;
        span.textContent = '?';
        span.classList.add('eg-blackout-clue');
    });
}

// Restores all clue spans to their original text and removes the blackout styling.
function _egRemoveBlackout() {
    if (!_egBlackoutActive) return;
    _egBlackoutActive = false;
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('eg-blackout-clue');
    });
}

// Boss mechanic handler — activates the Clue Blackout for the appropriate duration.
// Silently exits if a blackout is already in progress (prevent stacking).
function _egMechClueBlackout(monster, phase) {
    if (_egBlackoutActive) return;
    _egBlackoutActive = true;

    const duration = phase >= 3 ? 12000 : 8000;
    showToast(t('eg_mech_clue_blackout').replace('{n}', duration / 1000));
    _egApplyBlackout();
    setTimeout(() => _egRemoveBlackout(), duration);
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: PROBABILITY SHIFT---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Randomly un-marks 2 (phase 1) or 3 (phase 2+) cells the player has
// correctly marked as ✕, removing that completed work.

// Returns all cells the player has correctly marked as ✕ (userGrid=2, sol=0).
function _egBuildProbabilityShiftPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 0 && userGrid[r][c] === 2 && !wrongGrid[r][c])
                pool.push([r, c]);
    return pool;
}

// Boss mechanic handler — erases 2 or 3 player marks from the grid.
function _egMechProbabilityShift(monster, phase) {
    const pool = _egBuildProbabilityShiftPool();
    if (pool.length === 0) return;

    const count = phase >= 2 ? 3 : 2;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_probability_shift').replace('{n}', targets.length));
    targets.forEach(([r, c]) => {
        userGrid[r][c] = 0;
        renderCell(r, c);
    });
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: PRIOR BOMB----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Un-fills 1 (phase 1) or 2 (phase 2+) recently filled correct cells,
// forcing the player to re-fill them. Picks the most recently filled cells first.

// Removes a specific [row, col] entry from the recent-fills tracker.
function _egRemoveFromRecentFills(row, col) {
    const idx = _egRecentFills.findIndex(([fr, fc]) => fr === row && fc === col);
    if (idx !== -1) _egRecentFills.splice(idx, 1);
}

// Plays the burst visual on a cell unfilled by Prior Bomb.
function _egFlashPriorBombCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    el.classList.add('eg-prior-bomb-flash');
    setTimeout(() => el.classList.remove('eg-prior-bomb-flash'), 600);
}

// Unfills a single cell and removes it from the recent-fills tracker.
function _egUnfillCell(row, col) {
    userGrid[row][col] = 0;
    _egRemoveFromRecentFills(row, col);
    renderCell(row, col);
    updClues(row, col);
    _egFlashPriorBombCell(row, col);
}

// Boss mechanic handler — unfills 1 or 2 of the most recently filled cells.
function _egMechPriorBomb(monster, phase) {
    if (!cur || !cur.grid) return;
    const sol = cur.grid;

    // Build pool from most-recent fills, filtering cells already cleared
    const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    if (pool.length === 0) return;

    const count = phase >= 2 ? 2 : 1;
    const targets = pool.slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_prior_bomb').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egUnfillCell(r, c));
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: GRID VEIL-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Activates on boss_bayes phase 2. Overlays the puzzle grid with a
// translucent animated veil. The puzzle remains fully playable.

// Creates and shows the veil overlay element over the puzzle table.
function _egActivateVeil() {
    _egVeilActive = true;
    const tbl = document.getElementById('ptable');
    if (!tbl) return;
    const parent = tbl.parentElement;
    if (!parent) return;

    let veil = document.getElementById('eg-grid-veil');
    if (!veil) {
        veil = document.createElement('div');
        veil.id = 'eg-grid-veil';
        veil.className = 'eg-grid-veil';
        parent.style.position = 'relative';
        parent.appendChild(veil);
    }
    veil.classList.remove('eg-hidden');
    showToast(t('eg_mech_grid_veil'));
}

// Removes the veil overlay element entirely.
function _egRemoveVeil() {
    _egVeilActive = false;
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.remove();
}

// Boss mechanic handler — activates the Grid Veil if it isn't already active.
function _egMechGridVeil(monster, phase) {
    if (_egVeilActive) return;
    _egActivateVeil();
}



//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: VOID SURGE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// The Null blasts the entire screen with void energy. A single circular
// safe zone appears at a random position. The player must drag their
// class HUD into the safe zone within 5 seconds or take 30% max-HP damage.
//
// The mechanic has two phases of its own:
//   Warning  (1.5s) — red-tinted overlay fades in, safe zone glows, countdown starts
//   Active   (5.0s) — full blackout, player must be inside safe zone to avoid damage
//   Resolve  (0.5s) — overlay fades out, result is applied

// ── Tuning constants ──────────────────────────────────────────────────────────
const EG_VOID_SURGE_WARN_MS = 1500;  // warning fade-in before the surge hits
const EG_VOID_SURGE_ACTIVE_MS = 5000;  // window the player has to reach safe zone
const EG_VOID_SURGE_RESOLVE_MS = 500;   // brief hold after window closes
const EG_VOID_SURGE_SAFE_RADIUS = 80;    // px — radius of the safe circle
const EG_VOID_SURGE_DAMAGE_PCT = 0.30;  // 30% of max HP if player fails


// ── Safe-zone position picker ─────────────────────────────────────────────────
// Returns a {x, y} screen-centre point for the safe zone, biased away from
// screen edges so the circle is always fully visible and reachable.
function _egVoidSurgePickSafePos() {
    const margin = EG_VOID_SURGE_SAFE_RADIUS + 40;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + Math.random() * (window.innerHeight - margin * 2);
    return { x, y };
}


// ── HUD overlap check ─────────────────────────────────────────────────────────
// Returns true if the centre of the class HUD is within the safe-zone circle.
function _egVoidSurgeHudInZone(safePos) {
    const hud = document.getElementById('class-hud-drag-handle');
    if (!hud) return false;
    const rect = hud.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - safePos.x;
    const dy = cy - safePos.y;
    return Math.sqrt(dx * dx + dy * dy) <= EG_VOID_SURGE_SAFE_RADIUS;
}


// ── DOM builders ──────────────────────────────────────────────────────────────

// Creates (or returns existing) the full-screen void overlay element.
function _egVoidSurgeGetOverlay() {
    let el = document.getElementById('eg-void-surge-overlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-void-surge-overlay';
        document.body.appendChild(el);
    }
    return el;
}

// Creates (or returns existing) the safe-zone circle element and positions it.
function _egVoidSurgeGetCircle(safePos) {
    let el = document.getElementById('eg-void-surge-circle');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-void-surge-circle';
        document.body.appendChild(el);
    }
    el.style.left = safePos.x + 'px';
    el.style.top = safePos.y + 'px';
    return el;
}

// Creates (or returns existing) the countdown label inside the safe circle.
function _egVoidSurgeGetCountdownLabel(safePos) {
    let el = document.getElementById('eg-void-surge-countdown');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-void-surge-countdown';
        document.body.appendChild(el);
    }
    // Mirror the circle position so the number sits centred inside it
    if (safePos) {
        el.style.left = safePos.x + 'px';
        el.style.top = safePos.y + 'px';
    }
    return el;
}


// ── Countdown ticker ──────────────────────────────────────────────────────────
// Starts a 1Hz interval that updates the countdown label inside the circle.
// Automatically stops itself when the label is removed from the DOM.
function _egVoidSurgeStartCountdown(safePos) {
    let remaining = Math.ceil(EG_VOID_SURGE_ACTIVE_MS / 1000);
    const label = _egVoidSurgeGetCountdownLabel(safePos);
    label.textContent = remaining;

    _egVoidSurgePollInterval = setInterval(() => {
        remaining--;
        const lbl = document.getElementById('eg-void-surge-countdown');
        if (!lbl) { clearInterval(_egVoidSurgePollInterval); return; }
        if (remaining > 0) {
            lbl.textContent = remaining;
        } else {
            clearInterval(_egVoidSurgePollInterval);
            _egVoidSurgePollInterval = null;
        }

        // Visual feedback: pulse the circle green while HUD is inside
        const circle = document.getElementById('eg-void-surge-circle');
        if (circle) {
            if (_egVoidSurgeHudInZone(safePos)) {
                circle.classList.add('eg-void-surge-safe');
            } else {
                circle.classList.remove('eg-void-surge-safe');
            }
        }
    }, 1000);
}


// ── Teardown ──────────────────────────────────────────────────────────────────
// Removes all Void Surge DOM elements and clears poll interval.
function _egVoidSurgeTeardown() {
    _egVoidSurgeActive = false;

    if (_egVoidSurgePollInterval) {
        clearInterval(_egVoidSurgePollInterval);
        _egVoidSurgePollInterval = null;
    }

    ['eg-void-surge-overlay', 'eg-void-surge-circle', 'eg-void-surge-countdown']
        .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
}


// ── Main mechanic handler ─────────────────────────────────────────────────────
// Called by the boss mechanic scheduler. Orchestrates the full surge sequence.
function _egMechVoidSurge(monster, phase) {
    if (_egVoidSurgeActive) return; // don't stack surges
    _egVoidSurgeActive = true;

    const safePos = _egVoidSurgePickSafePos();

    // ── 1. Warning phase: overlay fades in, safe zone appears ────────────────
    const overlay = _egVoidSurgeGetOverlay();
    overlay.className = 'eg-void-surge-warning';

    const circle = _egVoidSurgeGetCircle(safePos);
    circle.className = 'eg-void-surge-circle';

    const label = _egVoidSurgeGetCountdownLabel(safePos);
    label.className = 'eg-void-surge-countdown-label';
    label.textContent = Math.ceil(EG_VOID_SURGE_ACTIVE_MS / 1000);

    showToast(t('eg_void_surge_start'));

    // ── 2. Active phase: full blackout, player must be in zone ───────────────
    setTimeout(() => {
        if (!_egVoidSurgeActive) return; // was cancelled (boss died during warning)
        overlay.className = 'eg-void-surge-active';
        _egVoidSurgeStartCountdown(safePos);

        // ── 3. Resolve: check position, apply damage, tear down ──────────────
        setTimeout(() => {
            if (!_egVoidSurgeActive) return;

            const survived = _egVoidSurgeHudInZone(safePos);

            // Flash the circle red or green to show outcome
            if (circle) {
                circle.classList.add(survived ? 'eg-void-surge-survived' : 'eg-void-surge-hit');
            }

            if (!survived) {
                const damage = Math.round(playerMaxHP * EG_VOID_SURGE_DAMAGE_PCT);
                const dealt = _egPlayerTakeDamage(damage);
                if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
                showToast(t('eg_void_surge_hit').replace('{n}', dealt));
            } else {
                showToast(t('eg_void_surge_survived'));
            }

            // Brief resolve pause so the player sees the outcome flash
            setTimeout(() => {
                _egVoidSurgeTeardown();
            }, EG_VOID_SURGE_RESOLVE_MS);

        }, EG_VOID_SURGE_ACTIVE_MS);

    }, EG_VOID_SURGE_WARN_MS);
}


// ── Cleanup hook ──────────────────────────────────────────────────────────────
// Called from _egBossCleanup so a surge in progress is always torn down on boss death.
// Wire this into _egBossCleanup in endgame-bosses.js by adding:
//   _egVoidSurgeTeardown();
// at the end of that function (see instructions below).