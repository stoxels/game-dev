//------------------------------------------------------------------------
//-------------------BOSS: THE STORMCALLER (boss_sirus)--------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Eye of the Storm". PoE Sirus homage, deepened: the
// sky no longer sends storms — the sky IS the weapon. Every mechanic
// electrifies the arena and every mechanic answers to the other: currents
// charge you, being charged draws the chains, standing in water while
// charged is suicide, and in the finale the storm turns YOUR stored charge
// into the kill. Element: lightning.
//
//   • ION CURRENT (signature, all fight) — two glowing ion fronts slide
//     across the arena on telegraphed lanes, split by a solid line: the
//     TANGENT is the only instant a lane is safe (2 hot bands + 1 cool).
//     Crossing a tangent puts CHARGE on you; while charged you tick to
//     EVERYTHING nearby. Phase 3: the fronts close from both sides at
//     once — the whole arena goes hot in a pincer.
//   • CHAIN LIGHTNING (60%) — a ⚡ hunting bolt tracks you; you cannot
//     outwalk it, only outposition it. Broken by the WATER LINE — blue
//     currents sweep and leave standing water; a bolt that reaches you
//     over water grounds itself at the shore. Cold pools (shared
//     frozen_cells) always ground the bolt — ice doesn't conduct.
//   • STORM EYE (60%, once) — the Stormcaller descends to the centre in a
//     16-cell grid: he casts 7 hot cells, then the SAFE tiles are the ones
//     connected to the eye — the dead zones are the ones he's already
//     charged. Spends phase 3 for phase 1 — never moves again. Safe cells
//     protect from EVERYTHING (a true succ zone).
//   • ⛈️ PERFECT STORM (≤10%, one-shot finale) — four ion currents enclose
//     a shrinking box; the eye tracks you while the eye of the box closes;
//     then the STORM GROWS TEETH: your CHARGE becomes bullets — every
//     charged tick fires a hunting bullet at your last position. Die by
//     your own stored charge. Charge bar frozen (gate in _egTickPlayer
//     via _egSirFinalActive).
//
// Shared soul kept: probability_shift still turns the puzzle's clues —
// fitting for a boss about charge vs. potential. frozen_cells (cold
// pools) retained as a bolt-grounding interaction. corrupt_cells retired.
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (probability_shift, frozen_cells) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Stormcaller's timing 2.5x so manual playtests /
// screenshot automation can catch mid-animation states. Flip to false for
// ship.
const _EG_SIR_DEBUG_SLOW = true;
const _EG_SIR_DEBUG_MULT = _EG_SIR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_sirus: {
        id: 'boss_sirus', name: 'The Stormcaller', emoji: '⛈️',
        baseHP: 1060, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_sirus — "The Eye of the Storm" (rework)
    // Phase 1 (100% → 60%): Ion Current + Probability Shift
    // Phase 2 ( 60% → 30%): immune window; Chain Lightning + Storm Eye join
    // Phase 3 ( 30% →  0%): pincer currents, faster chains, eye never moves
    //                        again; at 10% PERFECT STORM begins
    boss_sirus: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ion_current', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechSirIon' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
            { name: 'chain_lightning', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechSirChain', phase2Only: true },
            { name: 'storm_eye', intervalBase: 999999999, intervalVariance: 0, handler: '_egMechSirEye', phase2Only: true },
        ],
        onPhaseEnter: _egSirOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_SIR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Stormcaller hazards. Lightning-element
// boss — hits go in with element 'lightning' so the toast palette stays
// yellow.
let _egSirHitCd = 0;
function _egSirTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egSirHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egSirHitCd = now + EG_SIR_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Stormcaller', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egSirPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egSirHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: ION CURRENT (all fight)---------------------
//------------------------------------------------------------------------
// Two glowing ion fronts slide across the arena on telegraphed lanes. Each
// lane is split by a solid line: the TANGENT — the only instant a lane is
// safe, between the hot band behind the front and the cool band ahead.
// Crossing a tangent puts CHARGE on you: 5 stacks max, decaying 1/4s, and
// while charged you tick to EVERYTHING nearby (aura ticks stronger the
// more stacks). Phase 3: the fronts close from both sides at once — a
// pincer.
const EG_SIR_ION_N      = [0, 2, 2, 2]; // lanes per cast (pincer = 2×2)
const EG_SIR_ION_WARN   = 1500;         // dashed telegraph before the front moves
const EG_SIR_ION_SPD    = [0, 190, 215, 245]; // px/s front travel
const EG_SIR_ION_HOT    = [0, 6.5, 7.5, 9.0]; // %/s inside the hot band
const EG_SIR_TANGENT_MS = 900;          // tangent safe window around crossing
const EG_SIR_CHARGE_MAX = 5;            // charge stacks
const EG_SIR_CHARGE_DECAY_MS = 4000;    // stacks fall off one per this
const EG_SIR_AURA_DPS   = [0, 2.0, 2.5, 3.0]; // %/s self-aura per stack (at 1..5)

// Fight-global charge (read by Chain Lightning + Perfect Storm).
let _egSirCharge = 0, _egSirChargeUntil = 0;
let _egSirChipRun = null;   // the HUD chip's run (teardown kills it)

// The charge HUD chip: ⚡ stacks while charged (Bloom's WILT-chip pattern).
function _egSirEnsureChip() {
    if (_egSirChipRun) return;
    const chip = document.createElement('div');
    chip.className = 'eg-sir-charge-chip';
    chip.style.display = 'none';   // hidden until the first tick shows stacks
    document.body.appendChild(chip);
    const run = _egNkNewRun('boss_sirus', false);
    run.passive = true;
    run.els.push(chip);
    _egSirChipRun = run;
    _egNkLoop(run, () => {
        const stacks = _egSirChargeNow();
        chip.style.display = stacks > 0 ? '' : 'none';
        chip.textContent = '⚡ CHARGE ' + stacks + '/' + EG_SIR_CHARGE_MAX;
        chip.classList.toggle('eg-sir-charge-full', stacks >= EG_SIR_CHARGE_MAX);
        return true;
    });
}

// Shared: returns the player's current charge stacks (and applies decay).
function _egSirChargeNow() {
    const now = performance.now();
    if (now >= _egSirChargeUntil) { _egSirCharge = 0; }
    else while (_egSirCharge > 0 && now >= _egSirChargeUntil - (EG_SIR_CHARGE_MAX - _egSirCharge) * EG_SIR_CHARGE_DECAY_MS) _egSirCharge--;
    return _egSirCharge;
}

function _egMechSirIon(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egSirEnsureFinalWatcher(monster);
    _egSirEnsureChip();
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_sir_ion', '⛈️ ION CURRENT — the fronts split the lanes. Cross at the TANGENT — charge draws the storm!', '#fde047');

    // Lanes: phase 1/2 two horizontal fronts; phase 3 a pincer (a horizontal
    // pair closing inward + a vertical pair closing inward).
    const lanes = [];
    const addLane = (axis, pos, dir) => lanes.push({ axis, pos, dir, el: null, started: false, x: 0, y: 0 });
    if (p < 3) {
        addLane('h', H * (0.28 + Math.random() * 0.1), 1);
        addLane('h', H * (0.62 + Math.random() * 0.1), 1);
    } else {
        addLane('h', H * 0.22, 1);
        addLane('h', H * 0.78, -1);
        addLane('v', W * 0.22, 1);
        addLane('v', W * 0.78, -1);
    }
    for (const l of lanes) {
        const el = _egNkEl(run, 'div', 'eg-nk-band eg-sir-ion-warn');
        if (l.axis === 'h') {
            el.style.left = '0px'; el.style.top = Math.round(l.pos - 34) + 'px';
            el.style.width = W + 'px'; el.style.height = '68px';
        } else {
            el.style.left = Math.round(l.pos - 34) + 'px'; el.style.top = '0px';
            el.style.width = '68px'; el.style.height = H + 'px';
        }
        l.el = el;
    }

    const tangentAt = performance.now() + EG_SIR_ION_WARN * _EG_SIR_DEBUG_MULT;
    const hot = EG_SIR_ION_HOT[p];

    _egNkLoop(run, (dtS, now) => {
        const pc = _egSirPC();

        // Telegraph → the fronts start moving.
        if (!lanes[0].started && now >= tangentAt) {
            lanes.forEach(l => { l.started = true; l.el.classList.remove('eg-sir-ion-warn'); l.el.classList.add('eg-sir-ion-front'); });
            // Each lane gets its own tangent marker (solid line inside the band).
            lanes.forEach(l => {
                const tm = _egNkEl(run, 'div', 'eg-sir-tangent');
                if (l.axis === 'h') {
                    tm.style.left = '0px'; tm.style.top = Math.round(l.pos - 1) + 'px';
                    tm.style.width = W + 'px'; tm.style.height = '2px';
                } else {
                    tm.style.left = Math.round(l.pos - 1) + 'px'; tm.style.top = '0px';
                    tm.style.width = '2px'; tm.style.height = H + 'px';
                }
                l.tm = tm;
            });
        }

        if (lanes[0].started) {
            // Pincer fronts converge toward the far side; single fronts sweep
            // across. Front position rides its own lane's band.
            const spd = EG_SIR_ION_SPD[p];
            for (const l of lanes) {
                // Move the band (the front IS the band here).
                l.pos += l.dir * spd * dtS;
                if (l.axis === 'h') {
                    l.el.style.top = Math.round(l.pos - 34) + 'px';
                    if (l.tm) l.tm.style.top = Math.round(l.pos - 1) + 'px';
                } else {
                    l.el.style.left = Math.round(l.pos - 34) + 'px';
                    if (l.tm) l.tm.style.left = Math.round(l.pos - 1) + 'px';
                }
            }

            // Hot inside the band, EXCEPT the tangent sliver (±8px around
            // the lane centre): the one instant a lane is safe — and the
            // only place that doesn't build charge.
            let inBand = false, onTangent = false;
            for (const l of lanes) {
                const d = l.axis === 'h' ? Math.abs(pc.y - l.pos) : Math.abs(pc.x - l.pos);
                if (d < 34) inBand = true;
                if (d < 8) onTangent = true;
            }
            if (inBand && !onTangent) {
                _egNkDotTick(run, hot, dtS, level, 'lightning');
                // Charge stacks while you stand in the current.
                _egSirCharge = Math.min(EG_SIR_CHARGE_MAX, _egSirCharge + 1);
                _egSirChargeUntil = performance.now() + EG_SIR_CHARGE_MAX * EG_SIR_CHARGE_DECAY_MS;
            } else {
                run.dotAcc = 0;
            }

            // Charged aura: while charged you tick to everything nearby.
            const stacks = _egSirChargeNow();
            if (stacks > 0) {
                _egNkDotTick(run, EG_SIR_AURA_DPS[p] * stacks, dtS, level, 'lightning');
                // The charge HUD lives in the CSS (eg-sir-charge indicator).
            }

            // Fronts leave the arena → the cast ends.
            const allOut = lanes.every(l => l.pos < -60 || l.pos > (l.axis === 'h' ? H : W) + 60);
            if (allOut) return false;
        }

        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: CHAIN LIGHTNING (60%)-------------------------
//------------------------------------------------------------------------
// A ⚡ hunting bolt tracks you; you cannot outwalk it, only outposition it.
// BROKEN BY WATER: blue currents sweep and leave standing water; a bolt
// that must cross water grounds itself at the shore. Cold pools (shared
// frozen_cells) always ground the bolt — ice doesn't conduct. Phase 3:
// TWO bolts.
const EG_SIR_BOLT_SPD   = [0, 150, 165, 185]; // px/s hunting bolt
const EG_SIR_BOLT_DMG   = [0, 0, 0.16, 0.20]; // %maxHP bolt hit
const EG_SIR_BOLT_LIFE  = [0, 0, 9000, 11000]; // ms the bolt hunts
const EG_SIR_RIVER_N    = [0, 0, 2, 2];       // water lanes per cast
const EG_SIR_RIVER_SPD  = 90;                 // px/s river sweep
const EG_SIR_RIVER_W    = 64;                 // standing water width
const EG_SIR_GROUND_R   = 30;                 // distance at which the bolt grounds

function _egMechSirChain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egSirEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_sir_chain', '⛈️ CHAIN LIGHTNING — the bolt hunts. Water grounds it — lure it across a river!', '#fde047');

    // ── Water lines: rivers sweep across and LEAVE standing water. ───────
    const rivers = [];
    const nR = EG_SIR_RIVER_N[p];
    for (let i = 0; i < nR; i++) {
        const axis = i === 0 ? 'h' : 'v';
        const sweepEl = _egNkEl(run, 'div', 'eg-sir-river eg-sir-river-sweep');
        const poolEl = _egNkEl(run, 'div', 'eg-sir-river eg-sir-river-pool');
        if (axis === 'h') {
            const y = H * (0.3 + 0.4 * (i % 2));
            sweepEl.style.left = '0px'; sweepEl.style.top = Math.round(y - 3) + 'px';
            sweepEl.style.width = W + 'px'; sweepEl.style.height = '6px';
            poolEl.style.left = '0px'; poolEl.style.top = Math.round(y - EG_SIR_RIVER_W / 2) + 'px';
            poolEl.style.width = W + 'px'; poolEl.style.height = EG_SIR_RIVER_W + 'px';
            poolEl.style.display = 'none';
            rivers.push({ axis, pos: y, sweepEl, poolEl, poolAt: performance.now() + 2600 * _EG_SIR_DEBUG_MULT });
        } else {
            const x = W * (0.35 + 0.3 * (i % 2));
            sweepEl.style.left = Math.round(x - 3) + 'px'; sweepEl.style.top = '0px';
            sweepEl.style.width = '6px'; sweepEl.style.height = H + 'px';
            poolEl.style.left = Math.round(x - EG_SIR_RIVER_W / 2) + 'px'; poolEl.style.top = '0px';
            poolEl.style.width = EG_SIR_RIVER_W + 'px'; poolEl.style.height = H + 'px';
            poolEl.style.display = 'none';
            rivers.push({ axis, pos: x, sweepEl, poolEl, poolAt: performance.now() + 2600 * _EG_SIR_DEBUG_MULT });
        }
    }

    // ── The hunting bolt(s). ─────────────────────────────────────────────
    const nBolts = p >= 3 ? 2 : 1;
    const bolts = [];
    for (let i = 0; i < nBolts; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-sir-bolt', '⚡');
        bolts.push({ x: (i === 0 ? 60 : W - 60), y: 60 + Math.random() * Math.max(60, H - 120), el, life: EG_SIR_BOLT_LIFE[p] * _EG_SIR_DEBUG_MULT, grounded: false });
    }

    const t0 = performance.now();
    _egNkLoop(run, (dtS, now) => {
        const pc = _egSirPC();
        const pr = _egNkPlayerRect();

        // Rivers sweep across the arena, then leave standing water.
        for (const r of rivers) {
            if (r.poolEl.style.display !== 'none') continue;
            if (now < r.poolAt) {
                // The visible sweep line brightens as it charges.
                const k = 1 - Math.max(0, (r.poolAt - now) / (2600 * _EG_SIR_DEBUG_MULT));
                r.sweepEl.style.opacity = String(0.3 + 0.7 * Math.min(1, k));
            } else {
                r.poolEl.style.display = '';
                r.sweepEl.style.opacity = '0';
            }
        }
        // (Rivers keep their pools for the rest of the cast — terrain.)

        // Bolts hunt. Grounding: over standing water or a cold pool, the bolt
        // grounds itself at the shore (the pool edge nearest the bolt).
        const groundedBy = (bx, by) => {
            for (const r of rivers) {
                if (r.poolEl.style.display === 'none') continue;
                const d = r.axis === 'h' ? Math.abs(by - r.pos) : Math.abs(bx - r.pos);
                if (d < EG_SIR_GROUND_R) return r;
            }
            // Cold pools (frozen_cells visuals) — check for the tint class.
            const cold = document.querySelectorAll('.eg-frozen-cell, .eg-nk-frozen-cell');
            for (const c of cold) {
                const cr = c.getBoundingClientRect();
                if (bx > cr.left - 10 && bx < cr.right + 10 && by > cr.top - 10 && by < cr.bottom + 10) return c;
            }
            return null;
        };

        let pending = false;
        for (const b of bolts) {
            if (b.grounded || b.life <= 0) continue;
            pending = true;
            b.life -= dtS * 1000;
            const dx = pc.x - b.x, dy = pc.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            b.x += (dx / d) * EG_SIR_BOLT_SPD[p] * dtS;
            b.y += (dy / d) * EG_SIR_BOLT_SPD[p] * dtS;
            b.el.style.transform = 'translate(' + Math.round(b.x - 17) + 'px,' + Math.round(b.y - 17) + 'px)';
            // Bolt reaches water → grounds at the shore.
            const g = groundedBy(b.x, b.y);
            if (g) {
                b.grounded = true;
                b.el.textContent = '💥';
                const boom = _egNkEl(run, 'div', 'eg-sir-ground');
                boom.style.left = Math.round(b.x - 46) + 'px';
                boom.style.top = Math.round(b.y - 46) + 'px';
                setTimeout(() => { try { boom.remove(); } catch (e) {} }, 600 * _EG_SIR_DEBUG_MULT);
                continue;
            }
            if (pr && _egNkDotHit(b.el, pr, 0)) {
                const dealt = _egNkHit(EG_SIR_BOLT_DMG[p], 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Stormcaller', 'Chain Lightning');
                b.grounded = true; b.el.textContent = '💥';
            }
        }

        const boltsDone = bolts.every(b => b.grounded || b.life <= 0);
        return !boltsDone || pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: STORM EYE (60%, once)-------------------------
//------------------------------------------------------------------------
// The Stormcaller descends to the centre in a 4×4 grid of storm cells. He
// casts 7 hot cells; the SAFE tiles are the ones connected to the eye —
// the dead zones are the ones he's already charged. Spends phase 3 for
// phase 1: he NEVER MOVES AGAIN — the finale will have to come to him.
const EG_SIR_EYE_N      = 4;     // 4×4 grid
const EG_SIR_EYE_HOT    = 7;     // hot cells
const EG_SIR_EYE_DPS    = [0, 0, 7.5, 9.0]; // %/s in a hot cell
const EG_SIR_EYE_LIFE   = 9000;  // ms the cells live
const EG_SIR_EYE_IMMUNE = true;  // he holds the eye: immune while it stands

function _egMechSirEye(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egSirEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_sir_eye', '⛈️ STORM EYE — the eye settles. The cells CONNECTED to it are safe. Stay in the web!', '#fde047');

    // The 4×4 grid, centred.
    const cell = Math.min(W, H) * 0.15;
    const gw = EG_SIR_EYE_N * cell, gh = EG_SIR_EYE_N * cell;
    const gx = W / 2 - gw / 2, gy = H / 2 - gh / 2;
    const eyeR = Math.floor(EG_SIR_EYE_N / 2) - 1;   // (1,1) top-left-ish eye cell
    const eyeC = Math.floor(EG_SIR_EYE_N / 2) - 1;
    const cells = [];
    for (let r = 0; r < EG_SIR_EYE_N; r++) {
        for (let c = 0; c < EG_SIR_EYE_N; c++) {
            // Safe: the web CONNECTED to the eye — the eye itself, its four
            // orthogonal neighbours, and the two far arms of the cross.
            const isEye = (r === eyeR && c === eyeC);
            const isSafe = isEye || (Math.abs(r - eyeR) + Math.abs(c - eyeC) === 1) || (r === eyeR && c === eyeC + 2) || (c === eyeC && r === eyeR + 2);
            const el = _egNkEl(run, 'div', 'eg-sir-cell' + (isEye ? ' eg-sir-cell-eye' : isSafe ? ' eg-sir-cell-safe' : ''));
            el.style.left = Math.round(gx + c * cell + 4) + 'px';
            el.style.top = Math.round(gy + r * cell + 4) + 'px';
            el.style.width = Math.round(cell - 8) + 'px';
            el.style.height = Math.round(cell - 8) + 'px';
            cells.push({ r, c, hot: false, eye: isEye, safe: isSafe, el });
        }
    }
    // Exactly EG_SIR_EYE_HOT hot cells: the non-web cells CLOSEST to the
    // eye — the two farthest stay inert (even the storm's charge has
    // limits, and inert cells read as neither safe nor lethal).
    cells.filter(c => !c.safe && !c.eye)
        .map(c => ({ c, d: Math.abs(c.r - eyeR) + Math.abs(c.c - eyeC) }))
        .sort((a, b) => a.d - b.d || (a.c.r - b.c.r) || (a.c.c - b.c.c))
        .slice(0, EG_SIR_EYE_HOT)
        .forEach(({ c }) => { c.hot = true; c.el.classList.add('eg-sir-cell-hot'); });

    // Boss holds the eye: immune while the set-piece stands.
    if (monster && EG_SIR_EYE_IMMUNE) { try { monster.bossImmune = true; } catch (e) {} }

    const endAt = performance.now() + EG_SIR_EYE_LIFE * _EG_SIR_DEBUG_MULT;
    _egNkLoop(run, (dtS, now) => {
        const pc = _egSirPC();
        let inHot = false;
        for (const c of cells) {
            if (!c.hot) continue;
            if (pc.x > gx + c.c * cell && pc.x < gx + (c.c + 1) * cell
                && pc.y > gy + c.r * cell && pc.y < gy + (c.r + 1) * cell) { inHot = true; break; }
        }
        if (inHot) _egNkDotTick(run, EG_SIR_EYE_DPS[p], dtS, level, 'lightning');
        else run.dotAcc = 0;

        if (now >= endAt) {
            if (monster) { try { monster.bossImmune = false; } catch (e) {} }
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: PERFECT STORM (≤10%, one-shot)----------------
//------------------------------------------------------------------------
// Four ion currents enclose a shrinking box; the eye of the box tracks you
// while it closes; then the STORM GROWS TEETH: your CHARGE becomes
// bullets — every charged tick fires a hunting bullet at your last
// position. Die by your own stored charge. Charge bar frozen (gate in
// _egTickPlayer via _egSirFinalActive).
const EG_SIR_FIN_BOXES    = 3;      // enclosing box waves
const EG_SIR_FIN_BOX_DMG  = 0.18;   // %maxHP caught inside a closing box
const EG_SIR_FIN_BULLET_DMG = 0.14; // %maxHP per bullet hit
const EG_SIR_FIN_BULLET_SPD = 260;  // px/s hunting bullets
const EG_SIR_FIN_BULLET_DPS = 3.5;  // %/s self-aura per stack inside
const EG_SIR_FIN_FAILSAFE_MS = 34000;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egSirFinal = null;

function _egSirFinalActive() {
    return !!_egSirFinal && !_egSirFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egSirOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egSirEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egSirEnsureFinalWatcher(monster) {
    if (!monster || _egSirFinal || _egSirWatcherRun) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egSirWatcherRun = run;
    _egNkLoop(run, () => {
        if (_egSirFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egSirFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
let _egSirWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
function _egSirAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egSirFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egSirFinalStart(monster) {
    if (_egSirFinal || !monster) return;

    // The Stormcaller clears the arena for the perfect storm: kill every
    // other run of this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null,
        box: null,           // { l, t, r, b, el, closing: bool }
        bullets: [],         // { x, y, vx, vy, el }
        wave: 0,
    };
    _egSirFinal = g;

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
    ov.className = 'eg-sir-cd';
    ov.innerHTML =
        '<div class="eg-sir-cd-label">⛈️ PERFECT STORM</div>' +
        '<div class="eg-sir-cd-hint">Four ion currents enclose the arena in a shrinking box — stay OUTSIDE it as it closes. Then the storm grows TEETH: your own CHARGE becomes bullets. Empty your charge before the box closes!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_sir_final_cd', '⛈️💀 PERFECT STORM — the currents close in. Your charge is your doom!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the storm glow while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-sir-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Wave: an enclosing box shrinks inward; inside it = hit. ──────────
    const runBoxWave = () => {
        if (g.finished) return;
        g.wave++;
        if (g.wave > EG_SIR_FIN_BOXES) { runTeeth(); return; }
        _egNkToast('eg_mech_sir_wave', '⛈️ STORM WALL ' + g.wave + '/' + EG_SIR_FIN_BOXES + ' — stay outside the currents!', '#fde047');

        // The box starts at the arena edge and shrinks to a centre square.
        const box = { l: 0, t: 0, r: W, b: H, closing: true };
        const el = _egNkEl(g.fxRun, 'div', 'eg-sir-box');
        box.el = el;
        g.box = box;
        const shrinkTo = Math.min(W, H) * 0.18;
        const dur = 5000 * _EG_SIR_DEBUG_MULT;
        const t0 = performance.now();
        _egNkLoop(g.fxRun, (dtS, now) => {
            if (g.finished) return false;
            if (now - t0 < dur) {
                const k = (now - t0) / dur;
                box.l = W * 0.5 * k * (1 - shrinkTo / W);
                box.t = H * 0.5 * k * (1 - shrinkTo / H);
                box.r = W - box.l; box.b = H - box.t;
                el.style.left = Math.round(box.l) + 'px';
                el.style.top = Math.round(box.t) + 'px';
                el.style.width = Math.round(box.r - box.l) + 'px';
                el.style.height = Math.round(box.b - box.t) + 'px';
                // Inside the box = the currents' charge zone: charge builds.
                const pc = _egSirPC();
                if (pc.x > box.l && pc.x < box.r && pc.y > box.t && pc.y < box.b) {
                    _egSirCharge = Math.min(EG_SIR_CHARGE_MAX, _egSirCharge + 1);
                    _egSirChargeUntil = performance.now() + EG_SIR_CHARGE_MAX * EG_SIR_CHARGE_DECAY_MS;
                }
                return true;
            }
            // Box closed: anyone still inside takes the wall.
            const pc2 = _egSirPC();
            if (pc2.x > box.l && pc2.x < box.r && pc2.y > box.t && pc2.y < box.b) {
                const dealt = _egNkHit(EG_SIR_FIN_BOX_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Stormcaller', 'Storm Wall');
            }
            try { el.remove(); } catch (e) {}
            g.box = null;
            return false;   // this inner loop ends; runBoxWave reschedules
        });
        _egSirAfter(g, dur + 900 * _EG_SIR_DEBUG_MULT, runBoxWave);
    };

    // ── THE STORM GROWS TEETH: charge becomes bullets. ───────────────────
    const runTeeth = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_sir_teeth', '⛈️🦷 THE STORM GROWS TEETH — your CHARGE is firing at you!', '#f97316');
        g.teeth = true;
        // Teeth phase lasts the rest of the set-piece; the main loop below
        // spawns a bullet per charged tick at your last position.
        _egSirAfter(g, 6000 * _EG_SIR_DEBUG_MULT, () => {
            if (g.finished) return;
            // Final judgement: the whole arena detonates (the storm is
            // perfect — you were always part of it).
            document.querySelectorAll('.eg-sir-box').forEach(el => el.classList.add('eg-sir-box-final'));
            const dealt = _egNkHit(0.30, 'lightning', level);
            _egNkAbilityHitToast(dealt, 'The Stormcaller', 'Perfect Storm');
            _egSirAfter(g, 1500 * _EG_SIR_DEBUG_MULT, () => {
                _egSirFinalEnd(g, monster);
            });
        });
    };

    // ── Main finale loop: box waves + teeth bullets + charge aura. ───────
    const startAt = performance.now();
    let bulletCd = 0;
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _egSirPC();
        const stacks = _egSirChargeNow();

        // Teeth: every charged tick fires a hunting bullet at your position.
        if (g.teeth && stacks > 0 && now >= bulletCd) {
            bulletCd = now + 450 * _EG_SIR_DEBUG_MULT;
            const el = _egNkEl(g.fxRun, 'div', 'eg-nk-dot eg-sir-bullet', '●');
            // The charge discharges BACK at you: bullets spawn on a ring
            // around your position and hunt it.
            const ang = Math.random() * Math.PI * 2;
            const ring = Math.min(W, H) * 0.30;
            g.bullets.push({
                x: pc.x + Math.cos(ang) * ring, y: pc.y + Math.sin(ang) * ring,
                vx: -Math.cos(ang) * EG_SIR_FIN_BULLET_SPD, vy: -Math.sin(ang) * EG_SIR_FIN_BULLET_SPD,
                el, hit: false,
            });
        }
        // Bullets travel and hit.
        for (let i = g.bullets.length - 1; i >= 0; i--) {
            const b = g.bullets[i];
            b.x += b.vx * dtS; b.y += b.vy * dtS;
            b.el.style.transform = 'translate(' + Math.round(b.x - 7) + 'px,' + Math.round(b.y - 7) + 'px)';
            const pr = _egNkPlayerRect();
            const off = b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;
            if (off) { try { b.el.remove(); } catch (e) {} g.bullets.splice(i, 1); continue; }
            if (!b.hit && pr && _egNkDotHit(b.el, pr, 0)) {
                b.hit = true;
                const dealt = _egNkHit(EG_SIR_FIN_BULLET_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Stormcaller', 'Charged Bullet');
                try { b.el.remove(); } catch (e) {} g.bullets.splice(i, 1);
            }
        }

        // Failsafe: never storm forever.
        if (now - startAt > EG_SIR_FIN_FAILSAFE_MS) { _egSirFinalEnd(g, monster); return false; }
        return true;
    });

    runBoxWave();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egSirFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-sir-cd, .eg-sir-box, .eg-sir-bullet, .eg-sir-river, .eg-sir-cell, ' +
        '.eg-sir-ion-warn, .eg-sir-ion-front, .eg-sir-tangent, .eg-sir-bolt, .eg-sir-ground').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-sir-allin');
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
function _egSirTeardown() {
    if (_egSirFinal) { try { _egSirFinalEnd(_egSirFinal, null); } catch (e) {} _egSirFinal = null; }
    _egSirWatcherRun = null;
    try { if (_egSirChipRun) { _egSirChipRun.els.forEach(el => { try { el.remove(); } catch (e) {} }); _egNkKillRun(_egSirChipRun); } } catch (e) {}
    _egSirChipRun = null;
    _egSirCharge = 0; _egSirChargeUntil = 0;
    document.querySelectorAll('.eg-sir-charge-chip').forEach(el => { try { el.remove(); } catch (e) {} });
    // The Storm Eye grants immunity while it stands — release it if the
    // fight ended mid-cast (teardown kills the run before its loop ends).
    try {
        if (typeof _egMonsters !== 'undefined') {
            _egMonsters.forEach(m => { if (m && m.baseId === 'boss_sirus') m.bossImmune = false; });
        }
    } catch (e) {}
    document.querySelectorAll('.eg-sir-ion-warn, .eg-sir-ion-front, .eg-sir-tangent, .eg-sir-bolt, .eg-sir-ground, ' +
        '.eg-sir-river, .eg-sir-cell, .eg-sir-box, .eg-sir-bullet, .eg-sir-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-sir-allin').forEach(el => el.classList.remove('eg-sir-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_SIR_DEBUG.fire('ion'|'chain'|'eye', phase) — runs one now
//   _EG_SIR_DEBUG.final()                          — PERFECT STORM now
if (typeof window !== 'undefined') {
    window._EG_SIR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_sirus') : null;
            if (!monster) return 'no stormcaller alive';
            const fn = name === 'ion' ? _egMechSirIon
                : name === 'chain' ? _egMechSirChain
                : name === 'eye' ? _egMechSirEye : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_sirus') : null;
            if (!monster) return 'no stormcaller alive';
            _egSirFinalStart(monster);
            return 'PERFECT STORM started';
        },
    };
}
