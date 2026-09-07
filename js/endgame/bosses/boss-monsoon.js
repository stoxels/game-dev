//------------------------------------------------------------------------
//-------------------BOSS: THE MONSOON (boss_monsoon)---------------------
//------------------------------------------------------------------------
// REWORK — torrential-storm homage, rebuilt as a full flooding season. The
// sky opens: diagonal rain curtains pour, thunderbolts hammer the marks,
// hail pelts wherever you were — and the water itself rises. At the very
// end, the levee fails: THE GREAT FLOOD.
//
//   Phase 1 (100–60%) — RAIN BANDS. Diagonal rain curtains telegraph near
//                       your position, then pour for a few seconds. Stay
//                       out of the curtains!
//                       Plus THUNDERBOLTS. Golden marks flash and lightning
//                       strikes each one, staggered across the sky. Clear
//                       the circles!
//   Phase 2 ( ≤60%)   — STORM SURGE. The water rises from the bottom and
//                       holds — everything submerged takes repeated hits —
//                       then recedes. Climb!
//                       Plus HAIL BARRAGE. Hailstones drop onto marked
//                       spots, most aimed near where you were. Keep moving!
//   Phase 3 ( ≤30%)   — Higher surges, more bolts, denser hail, a third
//                       curtain. The sky is not finished with you.
//   Finale ( ≤10%)    — THE GREAT FLOOD (one-shot set-piece): the boss goes
//                       immune and shielded and CHURNS while a storm
//                       swallows the arena and the water rises in three
//                       surges (30% → 55% → 78%). On every beat a dry
//                       ISLAND hops to a fresh spot in the high ground —
//                       reach it before the next surge! Then THE BREAK: the
//                       flood swallows everything except the final island.
//                       CLIMB! Charge bar frozen for the whole set-piece
//                       (gate in _egTickPlayer via _egMnFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_MN_DEBUG_SLOW = true;
const _EG_MN_DEBUG_MULT = _EG_MN_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_monsoon: {
        id: 'boss_monsoon', name: 'The Monsoon', emoji: '🌧️',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_monsoon: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'rain_bands', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechMnRainBands' },
            { name: 'thunderbolts', intervalBase: 18000, intervalVariance: 4500, handler: '_egMechMnThunderbolts' },
            { name: 'storm_surge', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechMnStormSurge', phase2Only: true },
            { name: 'hail_barrage', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechMnHailBarrage', phase2Only: true },
        ],
        onPhaseEnter: _egMnOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_MN_BAND_DMG   = [0, 0.14, 0.17, 0.20];   // rain band contact
const EG_MN_BOLT_DMG   = [0, 0.16, 0.19, 0.22];   // thunderbolt strike
const EG_MN_SURGE_DMG  = [0, 0, 0.12, 0.15];      // submerged in surge water
const EG_MN_HAIL_DMG   = [0, 0, 0.15, 0.18];      // hailstone impact
const EG_MN_SURGE_CLIP = 0.12;                    // finale surge clip
const EG_MN_FLOOD_DMG  = 0.32;                    // THE BREAK full hit
const EG_MN_HIT_CD_MS  = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Monsoon hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egMnHitCd = 0;
function _egMnTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egMnHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egMnHitCd = now + EG_MN_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'cold', level);
    _egNkAbilityHitToast(dealt, 'The Monsoon', label);
    return true;
}

// One expanding ring (impact/splash) at (x, y) — body-level visual.
function _egMnRing(x, y, cls, lifeMs, run, timers) {
    const el = document.createElement('div');
    el.className = 'eg-mn-icyring' + (cls ? ' ' + cls : '');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    document.body.appendChild(el);
    if (run) run.els.push(el);
    const id = setTimeout(() => { try { el.remove(); } catch (e) {} }, lifeMs || 520);
    if (timers) timers.push(id);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: RAIN BANDS-----------------------------------
//------------------------------------------------------------------------
// Diagonal rain curtains telegraph near the player, then pour for a few
// seconds — standing inside a curtain stings repeatedly. Phase 1 sends
// two, later phases three, all faster.
const EG_MN_BAND_W    = 92;
const EG_MN_BAND_LIFE = 3000;

function _egMechMnRainBands(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = [0, 2, 3, 3][p];
    const warnMs = 1400 * _EG_MN_DEBUG_MULT;
    const lifeMs = EG_MN_BAND_LIFE * _EG_MN_DEBUG_MULT;
    const dmgPct = EG_MN_BAND_DMG[p];
    const len = Math.hypot(W, H) + 160;

    const c0 = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const bands = [];
    for (let i = 0; i < count; i++) {
        const ang = (i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 30) * Math.PI / 180;
        const cx = Math.max(90, Math.min(W - 90, c0.x + (Math.random() * 2 - 1) * 160));
        const cy = Math.max(90, Math.min(H - 90, c0.y + (Math.random() * 2 - 1) * 160));
        const el = _egNkEl(run, 'div', 'eg-mn-band eg-mn-band-warn');
        el.style.width = Math.round(len) + 'px';
        el.style.height = EG_MN_BAND_W + 'px';
        el.style.left = Math.round(cx - len / 2) + 'px';
        el.style.top = Math.round(cy - EG_MN_BAND_W / 2) + 'px';
        el.style.rotate = ang + 'rad';
        bands.push({ cx, cy, ang, el, live: false, faded: false });
    }

    _egNkToast('eg_mech_monsoon', '🌧️ The Monsoon: RAIN BANDS — out of the curtains!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        let alive = false;
        bands.forEach(b => {
            if (b.faded) return;
            if (!b.live) {
                if (t < warnMs) { alive = true; return; }
                b.live = true;
                b.el.classList.remove('eg-mn-band-warn');
            }
            if (t >= warnMs + lifeMs) {
                b.faded = true;
                b.el.classList.add('eg-mn-band-fade');
                const el = b.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
                return;
            }
            alive = true;
            // Contact: perpendicular distance from the player to the curtain line.
            if (pr && now >= touchCd) {
                const dx = pr.left + pr.width / 2 - b.cx, dy = pr.top + pr.height / 2 - b.cy;
                const perp = Math.abs(Math.cos(b.ang) * dy - Math.sin(b.ang) * dx);
                if (perp < EG_MN_BAND_W / 2 + 14) {
                    touchCd = now + EG_MN_HIT_CD_MS;
                    _egMnTouch(dmgPct, level, 'Rain Band');
                }
            }
        });
        return alive;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: THUNDERBOLTS---------------------------------
//------------------------------------------------------------------------
// Golden marks flash across the arena and lightning strikes each one,
// staggered across the sky. Clear the circles!
const EG_MN_BOLT_COUNT = [0, 4, 5, 6];
const EG_MN_BOLT_R     = 58;

function _egMechMnThunderbolts(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MN_BOLT_COUNT[p];
    const warnMs = [0, 1300, 1150, 1000][p] * _EG_MN_DEBUG_MULT;
    const gapMs = 380 * _EG_MN_DEBUG_MULT;
    const dmgPct = EG_MN_BOLT_DMG[p];

    const strikes = [];
    let guard = 0;
    const pc0 = _egNkPlayerCenter();
    while (strikes.length < count && guard++ < 90) {
        const x = 90 + Math.random() * Math.max(60, W - 180);
        const y = 120 + Math.random() * Math.max(60, H - 240);
        if (pc0 && Math.hypot(pc0.x - x, pc0.y - y) < 120) continue;
        if (!strikes.every(s => Math.hypot(s.x - x, s.y - y) > 150)) continue;
        const warn = _egNkEl(run, 'div', 'eg-mn-boltwarn');
        warn.style.left = Math.round(x - 58) + 'px';
        warn.style.top = Math.round(y - 58) + 'px';
        strikes.push({ x, y, warn, at: warnMs + strikes.length * gapMs, done: false });
    }

    _egNkToast('eg_mech_mn_bolts', '🌧️ The Monsoon: THUNDERBOLTS — clear of the marks!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        strikes.forEach(s => {
            if (s.done || t < s.at) return;
            s.done = true;
            try { s.warn.remove(); } catch (e) {}
            // The bolt: a golden streak from the sky down to the mark.
            const bolt = _egNkEl(run, 'div', 'eg-mn-bolt');
            bolt.style.left = Math.round(s.x - 3) + 'px';
            bolt.style.height = Math.round(s.y) + 'px';
            _egMnRing(s.x, s.y, 'eg-mn-flashring', 520, run, run.timers);
            if (pr && now >= touchCd && _egNkCircleHit(s.x, s.y, EG_MN_BOLT_R, pr, 0)) {
                touchCd = now + EG_MN_HIT_CD_MS;
                _egMnTouch(dmgPct, level, 'Thunderbolt');
            }
            const bid = setTimeout(() => { try { bolt.remove(); } catch (e) {} }, 520);
            run.timers.push(bid);
        });
        return strikes.some(s => !s.done);
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: STORM SURGE (field, passive)-----------------
//------------------------------------------------------------------------
// The water rises from the bottom of the arena and holds — everything
// submerged takes repeated hits — then recedes. The run is PASSIVE (field
// hazard — never blocks other mechanics).
const EG_MN_SURGE_PEAK = [0, 0, 0.34, 0.42];
const EG_MN_SURGE_RISE = 3500;
const EG_MN_SURGE_HOLD = 2600;
const EG_MN_SURGE_FALL = 1600;

function _egMechMnStormSurge(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    run.passive = true;
    const H = window.innerHeight;
    const peakH = EG_MN_SURGE_PEAK[p] * H;
    const riseMs = EG_MN_SURGE_RISE * _EG_MN_DEBUG_MULT;
    const holdMs = EG_MN_SURGE_HOLD * _EG_MN_DEBUG_MULT;
    const fallMs = EG_MN_SURGE_FALL * _EG_MN_DEBUG_MULT;
    const dmgPct = EG_MN_SURGE_DMG[p];

    const water = document.createElement('div');
    water.className = 'eg-mn-water';
    document.body.appendChild(water);
    run.els.push(water);

    _egNkToast('eg_mech_mn_surge', '🌧️ The Monsoon: STORM SURGE — the water is rising!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        let h = 0;
        if (t < riseMs) h = peakH * (t / riseMs);
        else if (t < riseMs + holdMs) h = peakH;
        else if (t < riseMs + holdMs + fallMs) h = peakH * (1 - (t - riseMs - holdMs) / fallMs);
        else {
            try { water.remove(); } catch (e) {}
            return false;
        }
        water.style.height = Math.round(h) + 'px';
        const pr = _egNkPlayerRect();
        if (h > 12 && pr && now >= touchCd) {
            const py = pr.top + pr.height / 2;
            if (py > H - h) {
                touchCd = now + 900;
                _egMnTouch(dmgPct, level, 'Storm Surge');
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: HAIL BARRAGE (phase 2+)----------------------
//------------------------------------------------------------------------
// Hailstones drop onto marked spots — most aimed near where the player was
// when the volley started. The stone falls during the warn, then impacts.
const EG_MN_HAIL_COUNT = [0, 0, 7, 10];
const EG_MN_HAIL_R     = 30;

function _egMechMnHailBarrage(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MN_HAIL_COUNT[p];
    const warnMs = 850 * _EG_MN_DEBUG_MULT;
    const emitMs = 2600 * _EG_MN_DEBUG_MULT;
    const dmgPct = EG_MN_HAIL_DMG[p];

    _egNkToast('eg_mech_mn_hail', '🌧️ The Monsoon: HAIL BARRAGE — mind the marks!', '#e2e8f0');

    const drops = [];
    let emitted = 0, emitAcc = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        emitAcc += dtS * 1000;
        const step = emitMs / count;
        while (emitted < count && emitAcc >= step) {
            emitAcc -= step;
            emitted++;
            let x, y;
            if (Math.random() < 0.65) {
                const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
                x = c.x + (Math.random() * 2 - 1) * 240;
                y = c.y + (Math.random() * 2 - 1) * 240;
            } else {
                x = 40 + Math.random() * Math.max(40, W - 80);
                y = 40 + Math.random() * Math.max(40, H - 80);
            }
            const warn = _egNkEl(run, 'div', 'eg-mn-hailwarn');
            warn.style.left = Math.round(x - 30) + 'px';
            warn.style.top = Math.round(y - 30) + 'px';
            const stone = _egNkEl(run, 'div', 'eg-mn-hail');
            stone.style.left = Math.round(x - 11) + 'px';
            stone.style.top = Math.round(y - 260) + 'px';
            stone.style.transition = 'top ' + (warnMs / 1000) + 's linear';
            requestAnimationFrame(() => { stone.style.top = Math.round(y - 11) + 'px'; });
            drops.push({ x, y, t: 0, struck: false, warn, stone });
        }
        const pr = _egNkPlayerRect();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dtS * 1000;
            if (!d.struck && d.t >= warnMs) {
                d.struck = true;
                try { d.warn.remove(); } catch (e) {}
                try { d.stone.remove(); } catch (e) {}
                _egMnRing(d.x, d.y, '', 520, run, run.timers);
                if (pr && now >= touchCd && _egNkCircleHit(d.x, d.y, EG_MN_HAIL_R, pr, 0)) {
                    touchCd = now + EG_MN_HIT_CD_MS;
                    _egMnTouch(dmgPct, level, 'Hail Barrage');
                }
            }
            if (d.t >= warnMs + 450) drops.splice(i, 1);
        }
        return emitted < count || drops.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------🌊… THE GREAT FLOOD (≤10% HP one-shot finale)----------
//------------------------------------------------------------------------
// The boss goes immune + shielded and CHURNS while a storm swallows the
// arena and the water rises in three surges (30% → 55% → 78% of the
// screen). On every beat a dry ISLAND hops to a fresh spot in the high
// ground — be on it when the surge lands! Then THE BREAK: the flood
// swallows everything except the final island. Charge bar frozen for the
// whole set-piece (gate in _egTickPlayer via _egMnFinalActive).
const EG_MN_FINAL_TICK_MS = 1200;
const EG_MN_FINAL_TICKS = 4;
const EG_MN_ISLAND_R = 150;
const EG_MN_ISLAND_R_FINAL = 200;
const EG_MN_SURGE_STAGES = [0.30, 0.55, 0.78, 1.08];   // of screen height

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egMnFinal = null;

function _egMnFinalActive() {
    return !!_egMnFinal && !_egMnFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egMnOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egMnStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egMnStartFinalWatcher(monster) {
    if (!monster || _egMnFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egMnFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egMnFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Hop the dry island to a fresh high-ground spot (top ~45% of the screen).
function _egMnPlaceIsland(g, r, prev) {
    if (g.islandEl) { try { g.islandEl.remove(); } catch (e) {} g.islandEl = null; }
    const W = window.innerWidth, H = window.innerHeight;
    const m = 170;
    let x = W / 2, y = H * 0.2, guard = 0;
    do {
        x = m + Math.random() * Math.max(60, W - m * 2);
        y = m * 0.6 + Math.random() * Math.max(60, H * 0.42);
        guard++;
    } while (prev && Math.hypot(x - prev.x, y - prev.y) < 320 && guard < 40);
    g.ix = x; g.iy = y; g.ir = r;
    const el = document.createElement('div');
    el.className = 'eg-mn-island';
    el.style.width = (r * 2) + 'px';
    el.style.height = (r * 2) + 'px';
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    document.body.appendChild(el);
    if (g.fxRun) g.fxRun.els.push(el);
    g.islandEl = el;
}

function _egMnFinalStart(monster) {
    if (_egMnFinal || !monster) return;

    // The sky closes: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_MN_FINAL_TICKS,
        ix: 0, iy: 0, ir: EG_MN_ISLAND_R,
        islandEl: null,
        storm: null,
        water: null,
        overlay: null,
        fxRun: null,
        cdTimer: null,
    };
    _egMnFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds water, island and cleanup timers.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Storm overlay: dark sky + driving rain streaks.
    const storm = document.createElement('div');
    storm.className = 'eg-mn-storm';
    document.body.appendChild(storm);
    g.storm = storm;
    requestAnimationFrame(() => storm.classList.add('eg-mn-storm-on'));

    // The floodwater itself (final variant stacks above the storm tint).
    const water = document.createElement('div');
    water.className = 'eg-mn-water eg-mn-water-final';
    water.style.height = '0px';
    document.body.appendChild(water);
    g.water = water;
    g.fxRun.els.push(water);

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-mn-cd';
    ov.innerHTML =
        '<div class="eg-mn-cd-label">🌊 THE GREAT FLOOD</div>' +
        '<div class="eg-mn-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-mn-cd-hint">Climb! Reach the dry island before each surge!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_mn_final_cd', '🌊💀 THE GREAT FLOOD — climb to the island!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a deluge (released at the end).
    monster.bossImmune = true;

    // The boss churns, whipping the storm into a frenzy.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-mn-churning');
        wrap.classList.add('eg-nk-shielded');
    }

    // First island right away so beat 1 already has high ground to reach.
    _egMnPlaceIsland(g, EG_MN_ISLAND_R, null);

    // Metronome: each beat the water surges to the next stage and clips
    // everyone below the new waterline (except the island). At zero: THE
    // BREAK — the flood swallows everything except the island. Pause /
    // death / inactive hold the count (debug: extra-long beats).
    const cdTick = EG_MN_FINAL_TICK_MS * (_EG_MN_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egMnFinal || _egMnFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        const stage = EG_MN_FINAL_TICKS - g.count;   // 0..3
        const frac = EG_MN_SURGE_STAGES[stage];
        const H = window.innerHeight;
        g.water.style.transition = 'height 0.8s cubic-bezier(.4,0,.6,1)';
        g.water.style.height = Math.round(H * frac) + 'px';
        const isBreak = stage === 3;
        const pr = _egNkPlayerRect();
        if (pr) {
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            const insideIsland = Math.hypot(px - g.ix, py - g.iy) <= g.ir + 12;
            if (!insideIsland && (isBreak || py > H * (1 - frac))) {
                _egMnTouch(isBreak ? EG_MN_FLOOD_DMG : EG_MN_SURGE_CLIP, monster.level,
                    isBreak ? 'THE GREAT FLOOD' : 'Flood Surge');
            }
        }
        if (isBreak) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _egNkToast('eg_mech_mn_final_bang', '🌊💀 THE FLOOD BREAKS!', '#e2e8f0');
            document.body.classList.add('eg-mn-flash');
            const fid = setTimeout(() => document.body.classList.remove('eg-mn-flash'), 700);
            g.fxRun.timers.push(fid);
            const id = setTimeout(() => _egMnFinalEnd(g), _EG_MN_DEBUG_SLOW ? 6500 : 1500);
            g.fxRun.timers.push(id);
            return;
        }
        g.count--;
        _egMnPlaceIsland(g, g.count === 1 ? EG_MN_ISLAND_R_FINAL : EG_MN_ISLAND_R, { x: g.ix, y: g.iy });
        const num = g.overlay && g.overlay.querySelector('.eg-mn-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
    }, cdTick);
}

function _egMnFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.storm) { try { g.storm.remove(); } catch (e) {} g.storm = null; }
    if (g.water) { try { g.water.remove(); } catch (e) {} g.water = null; }
    if (g.islandEl) { try { g.islandEl.remove(); } catch (e) {} g.islandEl = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-mn-flash');
    document.querySelectorAll('.eg-mn-churning').forEach(el => el.classList.remove('eg-mn-churning'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egMnFinal === g) _egMnFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egMnTeardown() {
    if (_egMnFinal) { try { _egMnFinalEnd(_egMnFinal); } catch (e) {} _egMnFinal = null; }
    document.querySelectorAll('.eg-mn-band, .eg-mn-bolt, .eg-mn-boltwarn, .eg-mn-flashring, ' +
        '.eg-mn-water, .eg-mn-hailwarn, .eg-mn-hail, .eg-mn-icyring, .eg-mn-island, ' +
        '.eg-mn-storm, .eg-mn-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-mn-flash');
    document.querySelectorAll('.eg-mn-churning').forEach(el => el.classList.remove('eg-mn-churning'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_MN_DEBUG.fire('bands'|'bolts'|'surge'|'hail') — runs one now
//   _EG_MN_DEBUG.final()                              — THE GREAT FLOOD now
if (typeof window !== 'undefined') {
    window._EG_MN_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_monsoon') : null;
            if (!monster) return 'no monsoon alive';
            const fn = name === 'bands' ? _egMechMnRainBands
                : name === 'bolts' ? _egMechMnThunderbolts
                : name === 'surge' ? _egMechMnStormSurge
                : name === 'hail' ? _egMechMnHailBarrage : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'surge' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_monsoon') : null;
            if (!monster) return 'no monsoon alive';
            _egMnFinalStart(monster);
            return 'THE GREAT FLOOD started';
        },
    };
}
