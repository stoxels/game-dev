//------------------------------------------------------------------------
//-------------------BOSS: THE BLOOM (boss_bloom)-------------------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Garden's Verdict". Malenia homage, deepened: the
// arena is a GARDEN that grows whether you fight or not. Scars you carve
// by dodging blooms are the only ground you truly own. Element: fire (keep
// — scarlet rot).
//
//   • SCARLET BLOOMS (signature, all fight) — flowers open where you STAND
//     (not where you were: the marker tracks you until the petal-freeze
//     instant, then it's yours). The burst is only half of it: each bloom
//     plants a ROT GARDEN whose stamen sweeps a slow rotor beam and, once
//     per garden, reaches CRITICAL MASS — it bursts into seed pods, and the
//     first two pods that settle plant NEW rot gardens. Untended, the
//     garden takes over.
//   • SEED VOLLEY (60%) — three seed pods arc across the arena and plant
//     three fresh rot gardens in a line toward you.
//   • WITHERING BLOOM (60%, once) — the Scarlet Veil, upgraded: the puzzle
//     grid is hidden behind a blooming veil. Every cell you fill wilts the
//     veil a little (visible progress: the veil thins); every mistake
//     regrows it (petals rain back in). The puzzle is the pruning.
//   • 🌸 FULMINATION (≤10%, one-shot finale) — the boss curls shut and
//     blooms from EVERY direction: petal-chains crawl along radial lanes
//     while a judgment-bloom stamps your position each beat. Each dodge
//     carves one SCAR — three scars open the ONE TRUE GAP, the only safe
//     wedge, and THE LAST BLOOM detonates everything outside it. Charge
//     bar frozen (gate in _egTickPlayer via _egBlmFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, fated_cell) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Bloom's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_BLM_DEBUG_SLOW = true;
const _EG_BLM_DEBUG_MULT = _EG_BLM_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_bloom: {
        id: 'boss_bloom', name: 'The Bloom', emoji: '🌸',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_bloom — "The Garden's Verdict" (rework)
    // Phase 1 (100% → 60%): Scarlet Blooms + Corrupt Cells
    // Phase 2 ( 60% → 30%): immune window; Seed Volley + Withering Bloom join
    // Phase 3 ( 30% →  0%): blooms chase in converging pairs; at 10%
    //                        FULMINATION begins
    boss_bloom: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'scarlet_blooms', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechBlmBlooms' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
            { name: 'seed_volley', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBlmVolley', phase2Only: true },
            // withering_bloom fires once on phase 2 activation; intervalBase is set
            // absurdly high so it never self-reschedules after that first trigger.
            { name: 'withering_bloom', intervalBase: 999999999, intervalVariance: 0, handler: '_egMechBlmVeil', phase2Only: true },
        ],
        onPhaseEnter: _egBlmOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_BLM_TOUCH_CD_MS = 700;      // shared touch cooldown
const EG_BLM_MAX_GARDENS = 6;        // hard cap on live rot gardens


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Bloom hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egBlmHitCd = 0;
function _egBlmTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egBlmHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egBlmHitCd = now + EG_BLM_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'fire', level);
    _egNkAbilityHitToast(dealt, 'The Bloom', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egBlmPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }


//------------------------------------------------------------------------
//-------------------SIGNATURE: SCARLET BLOOMS (all fight)-----------------
//------------------------------------------------------------------------
// Flowers open where you STAND — the marker tracks you until the petal-
// freeze instant, then it locks. Burst plants a ROT GARDEN: a stamen rotor
// beam sweeps a wedge; once per garden, the core swells (CRITICAL MASS) and
// bursts into seed pods — the first two pods that settle plant NEW gardens.
// Gardens cap at EG_BLM_MAX_GARDENS (oldest withers first).
//
// Phase 3: blooms spawn as CHASING PAIRS — two trackers converge on you and
// freeze the instant they MEET (not when you stop).
const EG_BLM_FREEZE_MS   = 2600;               // ms the marker tracks before freezing
const EG_BLM_PAIR_FALLBACK_MS = 7000;          // pair failsafe freeze
const EG_BLM_WARN_MS     = 700;                // burst delay after freeze
const EG_BLM_RADIUS      = 105;
const EG_BLM_BURST_DMG   = [0, 0.17, 0.20, 0.23]; // %maxHP standing in a burst
const EG_BLM_ROT_DPS     = [0, 7, 8.5, 10];       // %/s standing in a rot garden
const EG_BLM_ROTOR_DMG   = [0, 0.10, 0.12, 0.14]; // %maxHP stamen rotor hit
const EG_BLM_ROTOR_SPD   = 0.9;                   // rad/s stamen sweep
const EG_BLM_GARDEN_R    = 170;                   // garden + rotor reach
const EG_BLM_CRIT_AT     = 6500;                  // ms garden age before critical mass
const EG_BLM_WITHER_AT   = 14000;                 // ms garden lifespan
const EG_BLM_POD_DMG     = [0, 0.06, 0.07, 0.08]; // %maxHP seed pod touch
const EG_BLM_POD_SPD     = 150;                   // px/s pod drift
const EG_BLM_PODS        = 5;                     // pods per critical burst
const EG_BLM_POD_PLANTS  = 2;                     // pods that plant new gardens

// Live rot-garden registry (for the cap). Each garden owns its own PASSIVE
// dodge run (tier-scaled clock, never trips _egNkDodgeBusy — the Puddle
// persistent-watcher pattern) so gardens keep ticking after their planting
// mechanic's run has ended.
const _egBlmGardens = [];

function _egMechBlmBlooms(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const bossId = monster && monster.id;
    const run = _egNkNewRun(bossId, true);
    const pairs = p >= 3;

    _egNkToast('eg_mech_blm_blooms', '🌸 SCARLET BLOOMS — they open where you STAND! Keep moving until they freeze!', '#ff7fa5');

    const blooms = [];
    if (pairs) {
        // Chasing pair: two trackers converge on you; freeze at the meeting.
        const c = _egBlmPC();
        const d = 320;
        const a = Math.random() * Math.PI * 2;
        blooms.push({ mode: 'pair', x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, t: 0, frozen: false, frozenT: 0, struck: false });
        blooms.push({ mode: 'pair-mate', host: blooms[0], x: c.x - Math.cos(a) * d, y: c.y - Math.sin(a) * d, t: 0, frozen: false, frozenT: 0, struck: false });
        blooms[0].mate = blooms[1];
    } else {
        // Single tracker on your live position.
        blooms.push({ mode: 'track', x: 0, y: 0, t: 0, frozen: false, frozenT: 0, struck: false });
    }
    blooms.forEach(b => {
        b.mark = _egNkEl(run, 'div', 'eg-blm-bloom-mark');
        b.mark.style.width = EG_BLM_RADIUS * 2 + 'px';
        b.mark.style.height = EG_BLM_RADIUS * 2 + 'px';
        b.flower = _egNkEl(run, 'div', 'eg-nk-dot eg-blm-flower', '🌸');
    });

    _egNkLoop(run, (dtS, now) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        const pc = _egBlmPC();
        for (const b of blooms) {
            if (b.struck) continue;
            pending = true;
            b.t += dtS * 1000;

            // ── Tracking phase: the marker follows where you STAND. ──
            if (!b.frozen) {
                if (b.mode === 'track') {
                    b.x = pc.x; b.y = pc.y;
                    if (b.t >= EG_BLM_FREEZE_MS * _EG_BLM_DEBUG_MULT) b.frozen = true;
                } else if (b.mode === 'pair') {
                    const a = Math.atan2(pc.y - b.y, pc.x - b.x);
                    b.x += Math.cos(a) * 120 * dtS;
                    b.y += Math.sin(a) * 120 * dtS;
                    if (b.mate && Math.hypot(b.mate.x - b.x, b.mate.y - b.y) < 60) b.frozen = true;
                    if (b.t >= EG_BLM_PAIR_FALLBACK_MS * _EG_BLM_DEBUG_MULT) b.frozen = true;
                } else {
                    // pair-mate: chases too, freezes when its host freezes.
                    const a = Math.atan2(pc.y - b.y, pc.x - b.x);
                    b.x += Math.cos(a) * 120 * dtS;
                    b.y += Math.sin(a) * 120 * dtS;
                    if (b.host.frozen) b.frozen = true;
                    if (b.t >= EG_BLM_PAIR_FALLBACK_MS * _EG_BLM_DEBUG_MULT) b.frozen = true;
                }
            }

            if (!b.frozen) {
                b.mark.classList.add('eg-blm-bloom-track');
                b.mark.style.left = Math.round(b.x - EG_BLM_RADIUS) + 'px';
                b.mark.style.top = Math.round(b.y - EG_BLM_RADIUS) + 'px';
                b.flower.style.left = Math.round(b.x - 22) + 'px';
                b.flower.style.top = Math.round(b.y - 22) + 'px';
                continue;
            }

            // ── Frozen → burst window. ──
            b.mark.classList.remove('eg-blm-bloom-track');
            b.mark.classList.add('eg-blm-bloom-lock');
            b.frozenT += dtS * 1000;
            if (b.frozenT < EG_BLM_WARN_MS * _EG_BLM_DEBUG_MULT) continue;

            // BURST.
            b.struck = true;
            b.mark.classList.add('eg-blm-bloom-burst');
            if (pr && _egNkCircleHit(b.x, b.y, EG_BLM_RADIUS, pr, 0)) {
                const dealt = _egNkHit(EG_BLM_BURST_DMG[p], 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Bloom', 'Scarlet Bloom');
            }
            const fx = b.x, fy = b.y;
            setTimeout(() => { try { b.flower.remove(); b.mark.remove(); } catch (e) {} }, 500 * _EG_BLM_DEBUG_MULT);

            // Plant the rot garden this bloom leaves behind.
            _egBlmPlantGarden(bossId, fx, fy, p, level);
        }
        return pending;
    });
}

// Plants a rot garden at (x,y): dot floor + stamen rotor beam + critical-
// mass seed burst once (~6.5s of age), then withers (~14s). Each garden
// owns a passive dodge run so it survives its planter's run.
function _egBlmPlantGarden(bossId, x, y, p, level) {
    // Garden cap: the oldest garden withers when the registry overflows.
    while (_egBlmGardens.length >= EG_BLM_MAX_GARDENS) {
        const old = _egBlmGardens.shift();
        try { _egNkKillRun(old.run); } catch (e) {}
    }
    const gr = _egNkNewRun(bossId, true);
    gr.passive = true;
    const g = {
        x, y, age: 0, p, level, run: gr,
        el: _egNkEl(gr, 'div', 'eg-blm-rot'),
        rotorEl: _egNkEl(gr, 'div', 'eg-blm-rotor'),
        rotorA: Math.random() * Math.PI * 2,
        critDone: false,
    };
    g.el.style.width = EG_BLM_GARDEN_R * 2 + 'px';
    g.el.style.height = EG_BLM_GARDEN_R * 2 + 'px';
    g.el.style.left = Math.round(x - EG_BLM_GARDEN_R) + 'px';
    g.el.style.top = Math.round(y - EG_BLM_GARDEN_R) + 'px';
    _egBlmGardens.push(g);
    _egNkLoop(gr, (dtS) => {
        const pr = _egNkPlayerRect();
        const pc = _egBlmPC();
        g.age += dtS * 1000;
        // Rot DoT while you stand in the garden.
        if (pr && _egNkCircleHit(g.x, g.y, EG_BLM_GARDEN_R, pr, 0)) {
            _egNkDotTick(gr, EG_BLM_ROT_DPS[g.p], dtS, g.level, 'fire');
        } else {
            gr.dotAcc = 0;
        }
        // Stamen rotor sweep.
        g.rotorA += EG_BLM_ROTOR_SPD * dtS;
        g.rotorEl.style.left = Math.round(g.x - 4) + 'px';
        g.rotorEl.style.top = Math.round(g.y - 4) + 'px';
        g.rotorEl.style.transform = 'rotate(' + g.rotorA.toFixed(3) + 'rad)';
        if (pr && _egBlmRotorHit(g, pc)) _egBlmTouch(EG_BLM_ROTOR_DMG[g.p], g.level, 'Stamen Rotor');
        // Critical mass: the garden bursts once into seed pods.
        if (!g.critDone && g.age >= EG_BLM_CRIT_AT * _EG_BLM_DEBUG_MULT) {
            g.critDone = true;
            g.el.classList.add('eg-blm-rot-crit');
            _egBlmSeedBurst(g);
        }
        // The garden withers at the end of its life.
        if (g.age >= EG_BLM_WITHER_AT * _EG_BLM_DEBUG_MULT) {
            const idx = _egBlmGardens.indexOf(g);
            if (idx !== -1) _egBlmGardens.splice(idx, 1);
            return false;   // kills the run → elements removed
        }
        return true;
    });
}

// Is the player hit by garden g's stamen beam (a line from the centre out
// to EG_BLM_GARDEN_R at angle rotorA, ~14px wide)?
function _egBlmRotorHit(g, pc) {
    const ex = g.x + Math.cos(g.rotorA) * EG_BLM_GARDEN_R;
    const ey = g.y + Math.sin(g.rotorA) * EG_BLM_GARDEN_R;
    return _egPtSegDist(pc.x, pc.y, g.x, g.y, ex, ey) < 14;
}

// Critical-mass burst: pods scatter outward; the first POD_PLANTS pods that
// settle plant new rot gardens where they land.
function _egBlmSeedBurst(g) {
    const run = g.run;
    const pods = [];
    for (let i = 0; i < EG_BLM_PODS; i++) {
        const a = (i / EG_BLM_PODS) * Math.PI * 2 + Math.random() * 0.5;
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-blm-pod', '🌱');
        pods.push({ x: g.x, y: g.y, vx: Math.cos(a) * EG_BLM_POD_SPD, vy: Math.sin(a) * EG_BLM_POD_SPD, t: 0, el, hitDone: false });
    }
    let planted = 0;
    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        let active = false;
        for (let i = pods.length - 1; i >= 0; i--) {
            const o = pods[i];
            active = true;
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            const settled = o.t > 1600 * _EG_BLM_DEBUG_MULT ||
                o.x < 60 || o.x > window.innerWidth - 60 || o.y < 60 || o.y > window.innerHeight - 60;
            if (settled) {
                try { o.el.remove(); } catch (e) {}
                pods.splice(i, 1);
                // The first pods that settle take root.
                if (planted < EG_BLM_POD_PLANTS) {
                    planted++;
                    _egBlmPlantGarden(run.bossId, o.x, o.y, g.p, g.level);
                }
                continue;
            }
            o.el.style.left = Math.round(o.x - 11) + 'px';
            o.el.style.top = Math.round(o.y - 11) + 'px';
            if (!o.hitDone && pr && now >= (_egBlmHitCd || 0)) {
                if (_egNkDotHit(o.el, pr)) {
                    o.hitDone = true;
                    const dealt = _egNkHit(EG_BLM_POD_DMG[g.p], 'fire', g.level);
                    _egNkAbilityHitToast(dealt, 'The Bloom', 'Seed Pod');
                }
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: SEED VOLLEY (60%)-----------------------------
//------------------------------------------------------------------------
// Three seed pods arc across the arena and plant three fresh rot gardens
// in a line toward you — the garden is coming to YOU.
const EG_BLM_VOLLEY_N = 3;

function _egMechBlmVolley(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const bossId = monster && monster.id;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(bossId, true);
    _egNkToast('eg_mech_blm_volley', '🌸🌱 SEED VOLLEY — the garden marches toward you!', '#ff7fa5');

    const pc = _egBlmPC();
    // Line of landing spots from the far edge toward your position.
    const fromX = pc.x < W / 2 ? W * 0.9 : W * 0.1;
    const dirX = (pc.x - fromX) / EG_BLM_VOLLEY_N;
    const dirY = (pc.y - H * 0.5) / EG_BLM_VOLLEY_N;
    const spots = [];
    for (let i = 1; i <= EG_BLM_VOLLEY_N; i++) {
        spots.push({
            x: Math.max(80, Math.min(W - 80, fromX + dirX * i + (Math.random() * 120 - 60))),
            y: Math.max(80, Math.min(H - 80, H * 0.5 + dirY * i + (Math.random() * 120 - 60))),
        });
    }

    // Pods fly in sequence; each lands and plants a garden.
    const pods = spots.map((s, i) => ({
        s, t: -i * 420 * _EG_BLM_DEBUG_MULT,
        el: _egNkEl(run, 'div', 'eg-nk-dot eg-blm-pod', '🌱'),
        sx: fromX, sy: H * 0.1, landed: false,
    }));
    _egNkLoop(run, (dtS) => {
        const pr = _egNkPlayerRect();
        let active = false;
        for (const o of pods) {
            if (o.landed) continue;
            o.t += dtS * 1000;
            if (o.t < 0) { active = true; continue; }
            active = true;
            const f = Math.min(1, o.t / (900 * _EG_BLM_DEBUG_MULT));
            const x = o.sx + (o.s.x - o.sx) * f;
            const y = o.sy + (o.s.y - o.sy) * f;
            const lift = Math.sin(f * Math.PI) * 90;
            o.el.style.left = Math.round(x - 11) + 'px';
            o.el.style.top = Math.round(y - 11 - lift) + 'px';
            if (f >= 1) {
                o.landed = true;
                try { o.el.remove(); } catch (e) {}
                // Small landing burst + garden.
                if (pr && _egNkCircleHit(o.s.x, o.s.y, 70, pr, 0)) {
                    _egBlmTouch(0.09, level, 'Seed Volley');
                }
                _egBlmPlantGarden(bossId, o.s.x, o.s.y, p, level);
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: WITHERING BLOOM (60%, once)-------------------
//------------------------------------------------------------------------
// The Scarlet Veil, upgraded: the puzzle grid hides behind a blooming veil.
// Every cell you FILL wilts the veil (it thins — visible progress); every
// MISTAKE regrows it (petals rain back). The puzzle is the pruning.
function _egMechBlmVeil(monster, phase) {
    if (typeof _egVeilActive === 'undefined' || _egVeilActive) return;
    // Shared veil machinery: create the overlay element the framework's
    // typeof-guarded _egRemoveVeil call resolves to.
    _egVeilActive = true;
    const tbl = document.getElementById('ptable');
    if (tbl) {
        const parent = tbl.parentElement;
        if (parent) {
            let veil = document.getElementById('eg-grid-veil');
            if (!veil) {
                veil = document.createElement('div');
                veil.id = 'eg-grid-veil';
                veil.className = 'eg-grid-veil';
                parent.style.position = 'relative';
                parent.appendChild(veil);
            }
            veil.classList.remove('eg-hidden');
            veil.classList.add('eg-blm-veil-tinted');
        }
    }
    showToast(t('eg_mech_blm_veil'));

    // Wilting state chip: fill = wilt, mistake = regrow.
    let wilt = 0; // 0 = full veil, 100 = fully wilted
    const chip = document.createElement('div');
    chip.className = 'eg-blm-veil-chip';
    document.body.appendChild(chip);
    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    run.els.push(chip);
    _egNkLoop(run, () => {
        const v = document.getElementById('eg-grid-veil');
        if (!v) return false;   // veil removed by teardown
        chip.textContent = '🌸 WILT ' + Math.round(wilt) + '% — fill cells to prune the veil!';
        v.style.setProperty('--blm-wilt', String(Math.round(wilt)));
        v.classList.toggle('eg-blm-veil-open', wilt >= 90);
        return true;
    });

    // Fill/mistake hooks (guarded, idempotent install like the framework's).
    const hook = (fnName, delta) => {
        try {
            if (typeof window[fnName] === 'function' && !window[fnName]._egBlmHooked) {
                (function (orig) {
                    const wrapped = function () {
                        const r = orig.apply(this, arguments);
                        wilt = Math.max(0, Math.min(100, wilt + delta));
                        return r;
                    };
                    wrapped._egBlmHooked = true;
                    window[fnName] = wrapped;
                })(window[fnName]);
            }
        } catch (e) {}
    };
    hook('_egOnCorrectCell', 12);
    hook('_egOnMistake', -30);
}


// Removes the veil overlay + bloom tint. NOTE: this deliberately overrides
// Bayes's copy (boss-bayes.js loads first, boss-bloom.js last) — behaviour
// is a superset: the element goes away either way, and both bosses' tint
// classes are stripped so either boss's teardown leaves a clean grid.
// _egRemoveVeil is defined ONCE, in shared-boss-abilities.js (consolidated
// 2026-09 from this file and boss-bayes.js — this version's behaviour is
// the merged one).


//------------------------------------------------------------------------
//-------------------FINALE: FULMINATION (≤10%, one-shot)------------------
//------------------------------------------------------------------------
// The boss curls shut and blooms from EVERY direction: petal-chains crawl
// along radial lanes while a judgment-bloom stamps your position each beat.
// Each dodge carves one SCAR — three scars open the ONE TRUE GAP (a wide
// safe wedge). THE LAST BLOOM detonates everything outside it. Charge bar
// frozen (gate in _egTickPlayer via _egBlmFinalActive).
const EG_BLM_JUDGMENTS = 3;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egBlmFinal = null;

function _egBlmFinalActive() {
    return !!_egBlmFinal && !_egBlmFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egBlmOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBlmStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egBlmStartFinalWatcher(monster) {
    if (!monster || _egBlmFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egBlmFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egBlmFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout (mirrors the other finales).
function _egBlmAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egBlmFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egBlmFinalStart(monster) {
    if (_egBlmFinal || !monster) return;

    // The garden goes quiet for everything else: kill every other run of
    // this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });
    _egBlmGardens.length = 0;   // visuals already removed with their runs

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        judgments: 0,
        scars: 0,
        gapOpen: false,
        gapAngle: Math.random() * Math.PI * 2,
        curRun: null, overlay: null,
    };
    _egBlmFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-blm-cd';
    ov.innerHTML =
        '<div class="eg-blm-cd-label">🌸 FULMINATION</div>' +
        '<div class="eg-blm-cd-hint">Dodge each judgment-bloom — every dodge carves a scar. Three scars open the ONE TRUE GAP!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_blm_final_cd', '🌸💀 FULMINATION — dodge to carve scars; three open the ONE TRUE GAP!', '#ff7fa5');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the full-bloom crown while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-blm-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── One judgment: a radial petal-chain burst + a chasing bloom. ──────
    const runJudgment = () => {
        if (g.finished) return;
        g.judgments++;
        if (g.judgments > EG_BLM_JUDGMENTS + 6) { runLastBloom(); return; }   // failsafe
        _egNkToast('eg_mech_blm_judgment', '🌸 Judgment ' + g.judgments + ' — dodge to carve a scar!', '#ff7fa5');

        // Each judgment gets its own run: the loop ends at the burst, so a
        // fresh run is needed for the next cycle.
        const jRun = _egNkNewRun(monster.id, true);
        jRun.passive = true;
        g.curRun = jRun;

        // Radial petal-chains: 10 lanes telegraph outward, then fire one
        // after another, rotating slightly each judgment.
        const lanes = 10;
        const cx = W / 2, cy = H / 2;
        const laneWarns = [];
        for (let i = 0; i < lanes; i++) {
            const a = g.gapAngle + (i / lanes) * Math.PI * 2;
            const el = _egNkEl(jRun, 'div', 'eg-blm-petal-warn');
            el.style.left = cx + 'px';
            el.style.top = cy + 'px';
            el.style.width = Math.max(W, H) + 'px';
            el.style.transformOrigin = '0 0';
            el.style.transform = 'rotate(' + a.toFixed(3) + 'rad)';
            laneWarns.push({ a, el });
        }
        // Judgment bloom: a tracker on your live position (short fuse).
        const mark = _egNkEl(jRun, 'div', 'eg-blm-bloom-mark eg-blm-judgment-mark');
        mark.style.width = '130px';
        mark.style.height = '130px';
        let markX = cx, markY = cy;

        let t = 0, firedLanes = 0;
        _egNkLoop(jRun, (dtS) => {
            t += dtS * 1000;
            const pr = _egNkPlayerRect();
            const pc = _egBlmPC();
            // Tracker follows until its freeze instant.
            if (t < 1600 * _EG_BLM_DEBUG_MULT) {
                markX = pc.x; markY = pc.y;
                mark.style.left = Math.round(markX - 65) + 'px';
                mark.style.top = Math.round(markY - 65) + 'px';
            }
            // Petal lanes fire in sequence from t = 1200ms.
            while (firedLanes < lanes && t >= (1200 + firedLanes * 130) * _EG_BLM_DEBUG_MULT) {
                const lane = laneWarns[firedLanes];
                firedLanes++;
                const hit = _egPtSegDist(pc.x, pc.y, cx, cy,
                    cx + Math.cos(lane.a) * 2000, cy + Math.sin(lane.a) * 2000) < 16;
                if (hit && pr) _egBlmTouch(0.12, level, 'Petal Chain');
                try { lane.el.remove(); } catch (e) {}
            }
            // Judgment bloom bursts at t = 2600ms.
            if (t >= 2600 * _EG_BLM_DEBUG_MULT) {
                try { mark.remove(); } catch (e) {}
                const inside = pr && Math.hypot(pc.x - markX, pc.y - markY) < 70;
                if (inside) {
                    _egBlmTouch(0.20, level, 'Judgment Bloom');
                } else {
                    // A DODGE (outside at the burst) carves the scar.
                    g.scars++;
                    _egNkToast('eg_mech_blm_scar', '🌸 Scar carved (' + g.scars + '/' + EG_BLM_JUDGMENTS + ') — the gap opens!', '#ffd166');
                    if (g.scars >= EG_BLM_JUDGMENTS) g.gapOpen = true;
                }
                return false;   // this judgment's loop ends; the timer schedules the next
            }
            return true;
        });

        _egBlmAfter(g, 3400 * _EG_BLM_DEBUG_MULT, () => {
            if (g.finished) return;
            if (g.gapOpen) runLastBloom();
            else runJudgment();
        });
    };

    // ── THE LAST BLOOM: everything detonates except the ONE TRUE GAP. ────
    const runLastBloom = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_blm_last', '🌸💀 THE LAST BLOOM — reach the ONE TRUE GAP!', '#ff7fa5');
        const cx = W / 2, cy = H / 2;
        const lRun = _egNkNewRun(monster.id, true);
        lRun.passive = true;
        g.curRun = lRun;
        // The safe wedge: 70° wide, centred on gapAngle, reaching the edge.
        const gapEl = _egNkEl(lRun, 'div', 'eg-blm-gap');
        gapEl.style.left = cx + 'px';
        gapEl.style.top = cy + 'px';
        gapEl.style.width = Math.max(W, H) + 'px';
        gapEl.style.transformOrigin = '0 0';
        gapEl.style.transform = 'rotate(' + (g.gapAngle - 35 * Math.PI / 180).toFixed(3) + 'rad)';

        _egBlmAfter(g, 2400 * _EG_BLM_DEBUG_MULT, () => {
            if (g.finished) return;
            gapEl.classList.add('eg-blm-gap-bloom');
            const pc = _egBlmPC();
            // Inside the gap wedge = safe. Angle test against the wedge arc.
            const dx = pc.x - cx, dy = pc.y - cy;
            let rel = Math.atan2(dy, dx) - (g.gapAngle - 35 * Math.PI / 180);
            rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const inGap = rel <= (70 * Math.PI / 180) && Math.hypot(dx, dy) > 10;
            if (!inGap) {
                const dealt = _egNkHit(0.35, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Bloom', 'The Last Bloom');
            }
            _egBlmAfter(g, 1400 * _EG_BLM_DEBUG_MULT, () => {
                _egBlmFinalEnd(g, monster);
            });
        });
    };

    runJudgment();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egBlmFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.curRun) _egNkKillRun(g.curRun); } catch (e) {}
    document.querySelectorAll('.eg-blm-cd, .eg-blm-petal-warn, .eg-blm-judgment-mark, .eg-blm-gap').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-blm-allin');
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
function _egBlmTeardown() {
    if (_egBlmFinal) { try { _egBlmFinalEnd(_egBlmFinal, null); } catch (e) {} _egBlmFinal = null; }
    // Kill every garden's run (removes its elements with it).
    _egBlmGardens.slice().forEach(gg => { try { _egNkKillRun(gg.run); } catch (e) {} });
    _egBlmGardens.length = 0;
    document.querySelectorAll('.eg-blm-bloom-mark, .eg-blm-flower, .eg-blm-rot, .eg-blm-rotor, ' +
        '.eg-blm-pod, .eg-blm-petal-warn, .eg-blm-judgment-mark, .eg-blm-gap, .eg-blm-cd, ' +
        '.eg-blm-veil-chip').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-blm-allin').forEach(el => el.classList.remove('eg-blm-allin'));
    const veil = document.getElementById('eg-grid-veil');
    if (veil) {
        veil.classList.remove('eg-blm-veil-tinted', 'eg-blm-veil-open');
        veil.style.removeProperty('--blm-wilt');
    }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_BLM_DEBUG.fire('blooms'|'volley'|'veil', phase) — runs one now
//   _EG_BLM_DEBUG.final()                               — FULMINATION now
if (typeof window !== 'undefined') {
    window._EG_BLM_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bloom') : null;
            if (!monster) return 'no bloom alive';
            const fn = name === 'blooms' ? _egMechBlmBlooms
                : name === 'volley' ? _egMechBlmVolley
                : name === 'veil' ? _egMechBlmVeil : null;
            if (!fn) return 'unknown: ' + name;
            if (name === 'volley' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bloom') : null;
            if (!monster) return 'no bloom alive';
            _egBlmFinalStart(monster);
            return 'FULMINATION started';
        },
    };
}
