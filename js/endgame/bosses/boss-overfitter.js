//------------------------------------------------------------------------
//-------------------BOSS: THE OVERFITTER (boss_overfitter)---------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Model That Learned Too Much". The ML soul, made
// lethal: the Overfitter does not attack you — it LEARNS you. Every
// mechanic is your own data turned back against you, and the only way to
// win is to refuse to be predictable. Element: shadow.
//
//   • GRADIENT DESCENT (signature, all fight) — the training run: bands of
//     hot gradient STAMP down in sequence, marching across the arena like
//     steps of a descending loss curve (shadow DoT inside a hot band). At
//     the end of the sweep the LOCAL MINIMUM locks onto your position and
//     detonates — the loss surface collapses where you were standing.
//     Phase 3: a second minimum chases your CURRENT position.
//   • PATTERN LOCK (60%) — the model RECORDS your movement for ~4s (the
//     dashed trail is live — you watch yourself being learned), then
//     REPLAYS it: a spike walks the exact path you walked, detonating an
//     echo at every recorded sample, and an OVERFIT STRIKE where you
//     stopped. Beat your own record — take no hit during the replay — and
//     the model marks you unlearned (+heal). Move unlike yourself.
//   • VALIDATION SET (60%) — two rings, one test. The model detonates the
//     ring you are CLOSEST to (it learned to aim); the other dissipates.
//     Break equidistance and it underfits — nothing detonates at all.
//   • 📈 THE FINAL EPOCH (≤10%, one-shot finale) — the whole fight was
//     training data. Your ACTUAL position history (recorded since spawn)
//     is rendered as a live HEAT-MAP over the arena, then re-trained in
//     three waves: hot cells detonate, cool cells are safe, and between
//     waves the map RE-RECORDS — camp anywhere and your own heat betrays
//     you. New ground is safe ground. Charge bar frozen (gate in
//     _egTickPlayer via _egOvrFinalActive).
//
// Legacy soul kept: PATTERN BREAK still strips your recent fills every
// ~16s — the puzzle pressure that made the Overfitter hateful lives on.
// Shared frozen_cells dropped (the kit is full); model_drift and the old
// overfit_bloom blast are retired — their souls live in PATTERN LOCK and
// the LOCAL MINIMUM.
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (prior_bomb lives in shared-boss-abilities.js and is
// referenced by handler-name string where needed).
//------------------------------------------------------------------------

// DEBUG: slow The Overfitter's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_OVR_DEBUG_SLOW = true;
const _EG_OVR_DEBUG_MULT = _EG_OVR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_overfitter: {
        id: 'boss_overfitter', name: 'The Overfitter', emoji: '📈',
        baseHP: 1050, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_overfitter — "The Model That Learned Too Much" (rework)
    // Phase 1 (100% → 60%): Gradient Descent + Pattern Break
    // Phase 2 ( 60% → 30%): immune window; Pattern Lock + Validation Set
    //                        join
    // Phase 3 ( 30% →  0%): double minimums, longer recordings, tighter
    //                        rings; at 10% THE FINAL EPOCH begins
    boss_overfitter: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.15 },
        ],
        immunityDuration: 2800,
        mechanics: [
            { name: 'gradient_descent', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechOvrGradient' },
            { name: 'pattern_break', intervalBase: 16000, intervalVariance: 4000, handler: '_egMechPatternBreak' },
            { name: 'pattern_lock', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechOvrPatternLock', phase2Only: true },
            { name: 'validation_set', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechOvrValidation', phase2Only: true },
        ],
        onPhaseEnter: _egOvrOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_OVR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Overfitter hazards. Shadow-element boss
// — hits go in with element 'shadow' so the toast palette stays violet.
let _egOvrHitCd = 0;
function _egOvrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egOvrHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egOvrHitCd = now + EG_OVR_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'shadow', level);
    _egNkAbilityHitToast(dealt, 'The Overfitter', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egOvrPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egOvrHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------POSITION RECORDER (feeds PATTERN LOCK + finale)-------
//------------------------------------------------------------------------
// The Overfitter's whole identity: it learns you. A passive run samples the
// player's position every 500ms from the first mechanic cast onward. The
// ring buffer feeds the finale's heat-map (older samples fall off, so the
// map always reflects your recent ~80s of movement).
let _egOvrHistory = [];
let _egOvrRecRun = null;

function _egOvrEnsureRecorder(monster) {
    if (_egOvrRecRun || !monster) return;
    const run = _egNkNewRun(monster.id, false);
    run.passive = true;
    _egOvrRecRun = run;
    let acc = 0;
    _egNkLoop(run, (dtS) => {
        acc += dtS * 1000;
        if (acc >= 500) {
            acc = 0;
            const c = _egOvrPC();
            _egOvrHistory.push({ x: c.x, y: c.y });
            if (_egOvrHistory.length > 160) _egOvrHistory.shift();
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: GRADIENT DESCENT (all fight)---------------
//------------------------------------------------------------------------
// Training steps march across the arena: bands of hot gradient stamp down
// one after another (telegraph → hot shadow-DoT band → fade), sweeping left
// to right like a descending loss curve. When the sweep ends, the LOCAL
// MINIMUM locks onto your position and detonates — the loss surface
// collapses where you were standing. Phase 3: a second minimum chases your
// CURRENT position after the first.
const EG_OVR_STEPS      = 6;        // stamped bands per sweep
const EG_OVR_BAND_W     = 130;      // band width (px)
const EG_OVR_BAND_DPS   = [0, 5.0, 6.0, 7.0];   // %/s standing in a hot band
const EG_OVR_MIN_R      = 112;      // local minimum burst radius
const EG_OVR_MIN_DMG    = [0, 0.24, 0.28, 0.32]; // %maxHP caught in the minimum
const EG_OVR_MIN_WARN_MS = 1200;    // telegraph before the minimum bursts

function _egMechOvrGradient(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egOvrEnsureRecorder(monster);
    _egOvrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_ovr_gradient', '📈 GRADIENT DESCENT — training steps march across the arena! Stay off the hot bands!', '#c084ff');

    // ── Sweep: bands stamp left → right. ─────────────────────────────────
    const cadence = 750 * _EG_OVR_DEBUG_MULT;
    const hotMs = 1300 * _EG_OVR_DEBUG_MULT;
    const teleMs = 650 * _EG_OVR_DEBUG_MULT;
    let stepIdx = 0, stepTimer = 0;
    const bands = [];

    // ── Local minimum: locks your cast-start position. ───────────────────
    const minR = p >= 3 ? EG_OVR_MIN_R + 14 : EG_OVR_MIN_R;
    let minPos = { ..._egOvrPC() };
    let minsDone = 0;
    const minsTotal = p >= 3 ? 2 : 1;
    let minEl = null, minBoomAt = 0;
    let stage = 'sweep';   // sweep → min-warn → min-boom → (next min) → done

    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egOvrPC();
        let pending = false;

        if (stage === 'sweep') {
            // Stamp the next training step.
            stepTimer += dtS * 1000;
            if (stepIdx === 0 || stepTimer >= cadence) {
                stepTimer = 0;
                const x = -60 + stepIdx * ((W + 120) / EG_OVR_STEPS) + (EG_OVR_BAND_W / 2);
                const el = _egNkEl(run, 'div', 'eg-ovr-band');
                el.style.left = Math.round(x - EG_OVR_BAND_W / 2) + 'px';
                el.style.top = '0px';
                el.style.width = EG_OVR_BAND_W + 'px';
                el.style.height = H + 'px';
                bands.push({ x, hot: false, hotAt: now + teleMs, dieAt: now + teleMs + hotMs, el });
                stepIdx++;
            }
            if (stepIdx >= EG_OVR_STEPS) {
                pending = true;
                const allCool = bands.every(b => now >= b.dieAt);
                if (allCool) { stage = 'min-warn'; minBoomAt = now + EG_OVR_MIN_WARN_MS * _EG_OVR_DEBUG_MULT; }
            }
        }

        // Bands: telegraph → hot → fade.
        for (const b of bands) {
            if (b.el) {
                if (!b.hot && now >= b.hotAt) { b.hot = true; b.el.classList.add('eg-ovr-band-hot'); }
                if (now >= b.dieAt) { try { b.el.remove(); } catch (e) {} b.el = null; }
                else pending = true;
            }
            if (b.hot && b.el && pr && pc.x > b.x - EG_OVR_BAND_W / 2 && pc.x < b.x + EG_OVR_BAND_W / 2) {
                _egNkDotTick(run, EG_OVR_BAND_DPS[p], dtS, level, 'shadow');
            } else {
                run.dotAcc = 0;
            }
        }

        // Local minimum: warn → burst.
        if (stage === 'min-warn' || stage === 'min-boom') {
            pending = true;
            if (!minEl) {
                minEl = _egNkEl(run, 'div', 'eg-ovr-min-ring');
                minEl.style.left = Math.round(minPos.x - minR) + 'px';
                minEl.style.top = Math.round(minPos.y - minR) + 'px';
                minEl.style.width = (minR * 2) + 'px';
                minEl.style.height = (minR * 2) + 'px';
            }
            if (stage === 'min-warn' && now >= minBoomAt) {
                stage = 'min-boom';
                minEl.classList.add('eg-ovr-min-boom');
                if (pr && _egNkCircleHit(minPos.x, minPos.y, minR, pr, 0)) {
                    const dealt = _egNkHit(EG_OVR_MIN_DMG[p], 'shadow', level);
                    _egNkAbilityHitToast(dealt, 'The Overfitter', 'Local Minimum');
                }
            } else if (stage === 'min-boom' && now >= minBoomAt + 550 * _EG_OVR_DEBUG_MULT) {
                try { minEl.remove(); } catch (e) {}
                minEl = null;
                minsDone++;
                if (minsDone < minsTotal) {
                    // Phase 3: the second minimum chases your CURRENT position.
                    minPos = { ...pc };
                    stage = 'min-warn';
                    minBoomAt = now + EG_OVR_MIN_WARN_MS * _EG_OVR_DEBUG_MULT;
                } else {
                    stage = 'done';
                }
            }
        }

        return pending && stage !== 'done';
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY SOUL: PATTERN BREAK (kept)---------------------
//------------------------------------------------------------------------
// (Handler lives below, unchanged — it strips your recent fills every
// ~16s and remains the Overfitter's puzzle-layer pressure.)


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: OVERFITTER PATTERN BREAK----------------
//------------------------------------------------------------------------
// Removes a small amount of recent correct progress. Unlike Prior Bomb,
// this targets a repeated row/column pattern when possible, telegraphing the
// boss's adaptive behaviour while remaining recoverable.
function _egMechPatternBreak(monster, phase) {
    if (!cur || !cur.grid || typeof userGrid === 'undefined') return;
    _egOvrEnsureRecorder(monster);
    _egOvrEnsureFinalWatcher(monster);
    const sol = cur.grid;
    const recent = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    if (recent.length === 0) return;

    const counts = new Map();
    recent.forEach(([r, c]) => {
        const key = `r${r}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        const colKey = `c${c}`;
        counts.set(colKey, (counts.get(colKey) || 0) + 1);
    });
    const strongestEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const strongest = strongestEntry ? strongestEntry[0] : null;
    const pool = strongest && strongest[0] === 'r'
        ? recent.filter(([r]) => `r${r}` === strongest)
        : strongest ? recent.filter(([, c]) => `c${c}` === strongest) : recent;
    const count = phase >= 3 ? 2 : 1;
    const targets = pool.slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_pattern_break').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egUnfillCell(r, c));
}


//------------------------------------------------------------------------
//-------------------ACT II: PATTERN LOCK (60%)-----------------------------
//------------------------------------------------------------------------
// The model RECORDS your movement (~4s, dashed trail is live) then REPLAYS
// it: a spike walks the exact path you walked, detonating an echo at every
// recorded sample and an OVERFIT STRIKE at your final position. Take no hit
// during the replay and the model marks you UNLEARNED (+heal) — the reward
// for moving unlike yourself.
const EG_OVR_LOCK_REC_MS   = [0, 3500, 3800, 4200]; // recording length by phase
const EG_OVR_LOCK_SAMPLE_MS = 250;  // sample cadence (ms)
const EG_OVR_ECHO_R        = 66;    // echo burst radius
const EG_OVR_ECHO_DMG      = 0.08;  // %maxHP per echo
const EG_OVR_STRIKE_DMG    = 0.18;  // %maxHP overfit strike
const EG_OVR_UNLEARN_HEAL  = 0.06;  // %maxHP for a clean replay

function _egMechOvrPatternLock(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egOvrEnsureRecorder(monster);
    _egOvrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_ovr_lock', '🧠 PATTERN LOCK — recording your movement… the model is learning you!', '#c084ff');

    // ── Stage RECORD: sample your position, grow the live dashed trail. ──
    const recMs = EG_OVR_LOCK_REC_MS[p] * _EG_OVR_DEBUG_MULT;
    const sampleMs = EG_OVR_LOCK_SAMPLE_MS * _EG_OVR_DEBUG_MULT;
    const path = [];           // [{x, y, el}]
    let recT = 0, nextSample = 0;

    // ── Stage REPLAY: the spike walks your path, detonating echoes. ──────
    const spd = 620 * (p >= 3 ? 1.15 : 1);   // px/s replay speed
    let stage = 'record';
    let dart = null, dist = 0;
    const prefix = [];         // cumulative distance to each sample
    let hitFlag = false;

    _egNkLoop(run, (dtS, now) => {
        const pc = _egOvrPC();
        let pending = true;

        if (stage === 'record') {
            recT += dtS * 1000;
            while (recT >= nextSample) {
                nextSample += sampleMs;
                const c = _egOvrPC();
                const el = _egNkEl(run, 'div', 'eg-ovr-trail-dot');
                el.style.left = Math.round(c.x - 7) + 'px';
                el.style.top = Math.round(c.y - 7) + 'px';
                path.push({ x: c.x, y: c.y, el });
            }
            if (recT >= recMs || path.length < 2) {
                if (path.length < 2) { return false; }   // barely moved — nothing to learn
                stage = 'replay';
                // Cumulative distances for detonation timing.
                let acc = 0;
                prefix.length = 0;
                for (let i = 0; i < path.length; i++) {
                    if (i > 0) acc += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
                    prefix.push(acc);
                }
                dart = _egNkEl(run, 'div', 'eg-nk-dot eg-ovr-dart', '📈');
                dist = 0;
                _egNkToast('eg_mech_ovr_replay', '🧠 REPLAY! It fires along the path YOU walked — move unlike yourself!', '#f97316');
            }
            return pending;
        }

        // ── REPLAY: advance the spike, echo every sample it crosses. ─────
        if (stage === 'replay') {
            dist += spd * dtS;
            // Position the dart along the recorded polyline.
            let di = 1;
            while (di < prefix.length - 1 && prefix[di] < dist) di++;
            const segStart = prefix[di - 1], segLen = Math.max(1, prefix[di] - prefix[di - 1]);
            const f = Math.max(0, Math.min(1, (dist - segStart) / segLen));
            const dx = path[di - 1].x + (path[di].x - path[di - 1].x) * f;
            const dy = path[di - 1].y + (path[di].y - path[di - 1].y) * f;
            dart.style.transform = 'translate(' + Math.round(dx - 22) + 'px,' + Math.round(dy - 22) + 'px)';

            // Detonate every sample the dart has passed.
            for (let i = 0; i < path.length; i++) {
                if (path[i].echoed || prefix[i] > dist) continue;
                path[i].echoed = true;
                try { path[i].el.remove(); } catch (e) {}
                path[i].el = null;
                const isFinal = i === path.length - 1;
                const boom = _egNkEl(run, 'div', 'eg-ovr-echo' + (isFinal ? ' eg-ovr-echo-final' : ''));
                boom.style.left = Math.round(path[i].x - (isFinal ? 46 : EG_OVR_ECHO_R)) + 'px';
                boom.style.top = Math.round(path[i].y - (isFinal ? 46 : EG_OVR_ECHO_R)) + 'px';
                boom.style.width = (isFinal ? 92 : EG_OVR_ECHO_R * 2) + 'px';
                boom.style.height = (isFinal ? 92 : EG_OVR_ECHO_R * 2) + 'px';
                setTimeout(() => { try { boom.remove(); } catch (e) {} }, 480 * _EG_OVR_DEBUG_MULT);
                const pr = _egNkPlayerRect();
                if (pr && _egNkCircleHit(path[i].x, path[i].y, isFinal ? 46 : EG_OVR_ECHO_R, pr, 0)) {
                    if (isFinal) {
                        const dealt = _egNkHit(EG_OVR_STRIKE_DMG, 'shadow', level);
                        _egNkAbilityHitToast(dealt, 'The Overfitter', 'Overfit Strike');
                        hitFlag = true;
                    } else if (_egOvrTouch(EG_OVR_ECHO_DMG, level, 'Pattern Echo')) {
                        hitFlag = true;
                    }
                }
            }

            if (dist >= prefix[prefix.length - 1] + 40) {
                // Replay finished — judge the record.
                if (!hitFlag) {
                    _egOvrHeal(_egNkMaxHP() * EG_OVR_UNLEARN_HEAL);
                    _egNkToast('eg_mech_ovr_unlearned', '✅ You beat your own record — UNLEARNED!', '#4ade80');
                }
                stage = 'done';
                pending = false;
            }
            return pending;
        }

        return false;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: VALIDATION SET (60%)---------------------------
//------------------------------------------------------------------------
// Two rings, one test. The model detonates the ring you are CLOSEST to —
// it learned to aim. The other ring dissipates. Break equidistance (or get
// near neither) and the model underfits: nothing detonates at all.
const EG_OVR_VAL_R        = 115;    // ring radius (px, phase < 3)
const EG_OVR_VAL_HOLD_MS  = 2400;   // telegraph hold
const EG_OVR_VAL_DMG      = [0, 0.26, 0.30, 0.34]; // %maxHP caught in the true ring
const EG_OVR_VAL_SPACING  = 320;    // min distance between the two rings
const EG_OVR_VAL_CLEAR    = 280;    // farther than this from both = underfit
const EG_OVR_VAL_TIE      = 44;     // |d1-d2| below this = can't decide

function _egMechOvrValidation(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egOvrEnsureRecorder(monster);
    _egOvrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_ovr_valid', '🧪 VALIDATION SET — two rings, and it strikes the one you are closest to! Get near neither!', '#c084ff');

    const r = p >= 3 ? EG_OVR_VAL_R - 20 : EG_OVR_VAL_R;
    const pc0 = _egOvrPC();
    // Two ring centres: far apart, and never spawned on top of the player.
    const pick = () => {
        for (let tries = 0; tries < 24; tries++) {
            const x = W * (0.18 + Math.random() * 0.64);
            const y = H * (0.20 + Math.random() * 0.60);
            if (Math.hypot(x - pc0.x, y - pc0.y) > 200) return { x, y };
        }
        return { x: W * 0.3, y: H * 0.3 };
    };
    let a = pick(), b = pick();
    for (let tries = 0; tries < 24 && Math.hypot(a.x - b.x, a.y - b.y) < EG_OVR_VAL_SPACING; tries++) {
        b = pick();
    }

    const ringEls = [a, b].map(c => {
        const el = _egNkEl(run, 'div', 'eg-ovr-val-ring');
        el.style.left = Math.round(c.x - r) + 'px';
        el.style.top = Math.round(c.y - r) + 'px';
        el.style.width = (r * 2) + 'px';
        el.style.height = (r * 2) + 'px';
        return el;
    });

    let valT = 0;
    _egNkLoop(run, (dtS, now) => {
        valT += dtS * 1000;
        if (valT < EG_OVR_VAL_HOLD_MS * _EG_OVR_DEBUG_MULT) return true;

        // Verdict: which ring does the model think you belong to?
        const pc = _egOvrPC();
        const d1 = Math.hypot(pc.x - a.x, pc.y - a.y);
        const d2 = Math.hypot(pc.x - b.x, pc.y - b.y);
        const pr = _egNkPlayerRect();
        if (Math.min(d1, d2) > EG_OVR_VAL_CLEAR || Math.abs(d1 - d2) < EG_OVR_VAL_TIE) {
            // Underfit — the model cannot decide. Both rings dissipate.
            ringEls.forEach(el => el.classList.add('eg-ovr-val-fizzle'));
            _egNkToast('eg_mech_ovr_underfit', '🌫️ Underfit — the model cannot decide. Nothing detonates!', '#93c5fd');
        } else {
            const nearFirst = d1 < d2;
            const hitRing = nearFirst ? a : b;
            const hitEl = nearFirst ? ringEls[0] : ringEls[1];
            const missEl = nearFirst ? ringEls[1] : ringEls[0];
            hitEl.classList.add('eg-ovr-val-boom');
            missEl.classList.add('eg-ovr-val-fizzle');
            const boomEl = _egNkEl(run, 'div', 'eg-ovr-val-burst');
            boomEl.style.left = Math.round(hitRing.x - r) + 'px';
            boomEl.style.top = Math.round(hitRing.y - r) + 'px';
            boomEl.style.width = (r * 2) + 'px';
            boomEl.style.height = (r * 2) + 'px';
            setTimeout(() => { try { boomEl.remove(); } catch (e) {} }, 550 * _EG_OVR_DEBUG_MULT);
            if (pr && _egNkCircleHit(hitRing.x, hitRing.y, r, pr, 0)) {
                const dealt = _egNkHit(EG_OVR_VAL_DMG[p], 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Overfitter', 'Validation Strike');
            }
        }
        setTimeout(() => {
            try { ringEls.forEach(el => el.remove()); } catch (e) {}
        }, 600 * _EG_OVR_DEBUG_MULT);
        return false;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THE FINAL EPOCH (≤10%, one-shot)--------------
//------------------------------------------------------------------------
// The whole fight was training data. Your ACTUAL position history renders
// as a live heat-map over the arena (hot = where you have been), then the
// model re-trains in three waves: hot cells detonate, cool cells are safe,
// and between waves the map RE-RECORDS — camp anywhere and your own heat
// betrays you. Charge bar frozen (gate in _egTickPlayer via
// _egOvrFinalActive).
const EG_OVR_HEAT_COLS  = 6;
const EG_OVR_HEAT_ROWS  = 4;
const EG_OVR_WAVES      = 3;
const EG_OVR_WAVE_DMG   = [0, 0.30, 0.32, 0.35]; // %maxHP caught by wave n
const EG_OVR_FUSE_MS    = 1900;   // detonation fuse per wave
const EG_OVR_REHEAT_MS  = 2400;   // re-record window between waves

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egOvrFinal = null;

function _egOvrFinalActive() {
    return !!_egOvrFinal && !_egOvrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egOvrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egOvrEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egOvrEnsureFinalWatcher(monster) {
    if (!monster || _egOvrFinal || _egOvrWatcherRun) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egOvrWatcherRun = run;
    _egNkLoop(run, () => {
        if (_egOvrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egOvrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
let _egOvrWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
function _egOvrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egOvrFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

// Heat bins from the live history. Returns counts + cell geometry.
function _egOvrHeatCounts(W, H) {
    const counts = new Array(EG_OVR_HEAT_COLS * EG_OVR_HEAT_ROWS).fill(0);
    const cw = W / EG_OVR_HEAT_COLS, ch = H / EG_OVR_HEAT_ROWS;
    for (const pt of _egOvrHistory) {
        const cx = Math.max(0, Math.min(EG_OVR_HEAT_COLS - 1, Math.floor(pt.x / cw)));
        const cy = Math.max(0, Math.min(EG_OVR_HEAT_ROWS - 1, Math.floor(pt.y / ch)));
        counts[cy * EG_OVR_HEAT_COLS + cx]++;
    }
    return counts;
}

function _egOvrFinalStart(monster) {
    if (_egOvrFinal || !monster) return;

    // The model clears the arena for the final epoch: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        cells: [],           // { x, y, w, h, el }
        fxRun: null, overlay: null,
    };
    _egOvrFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-ovr-cd';
    ov.innerHTML =
        '<div class="eg-ovr-cd-label">📈 THE FINAL EPOCH</div>' +
        '<div class="eg-ovr-cd-hint">The model memorized your every step — the heat-map is YOUR data. Hot cells detonate, cool cells are safe, and it RE-RECORDS between waves. New ground is safe ground!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_ovr_final_cd', '📈💀 THE FINAL EPOCH — the model memorized your every step. New ground is safe ground!', '#c084ff');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the trained-model glow while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-ovr-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;
    const cw = W / EG_OVR_HEAT_COLS, ch = H / EG_OVR_HEAT_ROWS;

    // ── Render the heat-map from live history. ───────────────────────────
    const repaint = () => {
        const counts = _egOvrHeatCounts(W, H);
        const maxC = Math.max(1, ...counts);
        counts.forEach((n, i) => {
            const cx = i % EG_OVR_HEAT_COLS, cy = Math.floor(i / EG_OVR_HEAT_COLS);
            let cell = g.cells[i];
            if (!cell) {
                const el = document.createElement('div');
                el.className = 'eg-ovr-heatcell';
                el.style.left = Math.round(cx * cw) + 'px';
                el.style.top = Math.round(cy * ch) + 'px';
                el.style.width = Math.ceil(cw) + 'px';
                el.style.height = Math.ceil(ch) + 'px';
                document.body.appendChild(el);
                g.cells[i] = cell = { x: cx * cw, y: cy * ch, w: cw, h: ch, el };
            }
            const lvl = n === 0 ? 0 : n < maxC * 0.33 ? 1 : n < maxC * 0.66 ? 2 : 3;
            cell.el.className = 'eg-ovr-heatcell eg-ovr-heat-' + lvl;
            cell.el.textContent = n > 0 ? String(n) : '';
        });
    };
    repaint();

    // ── One training wave: hot cells detonate, cool cells are safe. ──────
    const runWave = (wave) => {
        if (g.finished) return;
        repaint();   // the map re-recorded between waves — retrain on fresh data

        const counts = _egOvrHeatCounts(W, H);
        const maxC = Math.max(1, ...counts);
        let hot = [];
        if (wave === 1) {
            hot = counts.map((n, i) => n >= Math.max(4, Math.ceil(maxC * 0.66)) ? i : -1).filter(i => i >= 0);
        } else if (wave === 2) {
            hot = counts.map((n, i) => n >= Math.max(2, Math.ceil(maxC * 0.33)) ? i : -1).filter(i => i >= 0);
        } else {
            // Final wave: everything except the coldest 3 cells + all zeros.
            const order = counts.map((n, i) => ({ n, i })).sort((a, b) => a.n - b.n);
            const safe = new Set(order.slice(0, 3).map(o => o.i));
            counts.forEach((n, i) => { if (n === 0) safe.add(i); });
            hot = counts.map((n, i) => !safe.has(i) ? i : -1).filter(i => i >= 0);
        }

        if (!hot.length) {
            _egNkToast('eg_mech_ovr_underfit', '🌫️ Underfit — the model cannot decide. Nothing detonates!', '#93c5fd');
            if (wave >= EG_OVR_WAVES) {
                _egOvrAfter(g, 1400 * _EG_OVR_DEBUG_MULT, () => _egOvrFinalEnd(g, monster));
            } else {
                _egOvrAfter(g, 1400 * _EG_OVR_DEBUG_MULT, () => runWave(wave + 1));
            }
            return;
        }

        _egNkToast('eg_mech_ovr_wave', '📈 EPOCH ' + wave + '/' + EG_OVR_WAVES + ' — ' + hot.length + ' hot cells re-train! Stand on NEW ground!', '#f97316');
        hot.forEach(i => { try { g.cells[i].el.classList.add('eg-ovr-hot'); } catch (e) {} });

        _egOvrAfter(g, EG_OVR_FUSE_MS * _EG_OVR_DEBUG_MULT, () => {
            if (g.finished) return;
            const pc = _egOvrPC();
            let caught = false;
            hot.forEach(i => {
                const cell = g.cells[i];
                if (!cell) return;
                cell.el.classList.add('eg-ovr-boom');
                const el = cell.el;
                setTimeout(() => {
                    try { el.classList.remove('eg-ovr-hot', 'eg-ovr-boom'); } catch (e) {}
                }, 700);
                if (!caught && pc.x >= cell.x && pc.x <= cell.x + cell.w && pc.y >= cell.y && pc.y <= cell.y + cell.h) caught = true;
            });
            if (caught) {
                const dealt = _egNkHit(EG_OVR_WAVE_DMG[wave], 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Overfitter', 'Epoch ' + wave);
            }
            if (wave < EG_OVR_WAVES) {
                _egNkToast('eg_mech_ovr_reheat', '🔥 RE-RECORDING — your recent steps reshape the heat-map! Keep moving!', '#f97316');
                _egOvrAfter(g, EG_OVR_REHEAT_MS * _EG_OVR_DEBUG_MULT, () => runWave(wave + 1));
            } else {
                _egOvrAfter(g, 1300 * _EG_OVR_DEBUG_MULT, () => _egOvrFinalEnd(g, monster));
            }
        });
    };

    _egOvrAfter(g, 1800 * _EG_OVR_DEBUG_MULT, () => runWave(1));
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egOvrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-ovr-cd, .eg-ovr-heatcell').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-ovr-allin');
        wrap.classList.remove('eg-nk-shielded');
    }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egOvrTeardown() {
    if (_egOvrFinal) { try { _egOvrFinalEnd(_egOvrFinal, null); } catch (e) {} _egOvrFinal = null; }
    _egOvrHistory = [];
    _egOvrRecRun = null;
    _egOvrWatcherRun = null;
    document.querySelectorAll('.eg-ovr-band, .eg-ovr-min-ring, .eg-ovr-trail-dot, .eg-ovr-dart, ' +
        '.eg-ovr-echo, .eg-ovr-val-ring, .eg-ovr-val-burst, .eg-ovr-heatcell, .eg-ovr-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-ovr-allin').forEach(el => el.classList.remove('eg-ovr-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_OVR_DEBUG.fire('gradient'|'lock'|'valid', phase) — runs one now
//   _EG_OVR_DEBUG.final()                                — THE FINAL EPOCH now
if (typeof window !== 'undefined') {
    window._EG_OVR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_overfitter') : null;
            if (!monster) return 'no overfitter alive';
            const fn = name === 'gradient' ? _egMechOvrGradient
                : name === 'lock' ? _egMechOvrPatternLock
                : name === 'valid' ? _egMechOvrValidation : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'valid' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_overfitter') : null;
            if (!monster) return 'no overfitter alive';
            _egOvrFinalStart(monster);
            return 'THE FINAL EPOCH started';
        },
    };
}
