//------------------------------------------------------------------------
//-------------------BOSS: THE NULL (boss_null)---------------------------
//------------------------------------------------------------------------
// Null-hypothesis theme: corruption, blackout, void dodge.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {

    // BOSSES — spawned only via cur.hasBoss / cur.bosses
    boss_null: {
        id: 'boss_null', name: 'The Null', emoji: '🧿',
        baseHP: 900, baseDamage: 26, chargeMax: 15,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_null — "The Null Hypothesis"
    // Phase 1 (100% → 66%): normal attacks + Corrupt Cells + Clue Blackout
    // Phase 2 ( 66% → 33%): immune window, faster charge, Corrupt Cells worsens
    // Phase 3 (  33% →  0%): enrage — very fast charge, massive damage, both mechanics
    boss_null: {
        phases: [
            { threshold: 1.00, chargeMax: 15, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.66, chargeMax: 10, damageMultiplier: 1.4 }, // Phase 2
            { threshold: 0.33, chargeMax: 6, damageMultiplier: 2.2 }, // Phase 3 — ENRAGE
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'corrupt_cells', intervalBase: 10000, intervalVariance: 3000, handler: '_egMechCorruptCells' },
            { name: 'clue_blackout', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechClueBlackout' },
            { name: 'clue_swap', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechClueSwap' },
            { name: 'void_surge', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechVoidSurge' },
        ],
    },
});


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


// ── Player-sprite overlap check ───────────────────────────────────────────
// Returns true if the player character sprite is inside the safe-zone circle.
// Design intent (especially for Entropy's Heat Bloom) is that the player moves
// their draggable avatar sprite — not the class HUD — into the circle.
// Uses the tight sprite image rect (like hazards) with closest-point check.
function _egVoidSurgeHudInZone(safePos) {
    const rect = (typeof _egBlastGetPlayerRect === 'function' && _egBlastGetPlayerRect())
        || _egVoidSurgeGetPlayerRectFallback();
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    const closestX = Math.max(rect.left, Math.min(safePos.x, rect.right));
    const closestY = Math.max(rect.top, Math.min(safePos.y, rect.bottom));
    const dx = closestX - safePos.x;
    const dy = closestY - safePos.y;
    const tolerance = 8;
    return Math.sqrt(dx * dx + dy * dy) <= EG_VOID_SURGE_SAFE_RADIUS + tolerance;
}


// Fallback rect when the shared blast helper is not yet available.
// Tries the sprite image first, then the wrapper with bar-area cropped.
function _egVoidSurgeGetPlayerRectFallback() {
    let img = document.getElementById('avatar-sprite-img');
    let r = img ? img.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) {
        img = document.getElementById('avatar-sprite-img-simple');
        r = img ? img.getBoundingClientRect() : null;
    }
    if (r && r.width && r.height) return r;
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple')
        || document.getElementById('class-hud-drag-handle')
        || document.getElementById('class-hud-panel');
    if (!el) return null;
    const wr = el.getBoundingClientRect();
    if (!wr.width && !wr.height) return null;
    return wr;
}


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
                const dealt = _egPlayerTakeDamage(damage, true);
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
