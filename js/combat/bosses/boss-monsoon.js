import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE MONSOON (boss_monsoon)---------------------
//------------------------------------------------------------------------
// Torrential-storm flood season: diagonal rain curtains, thunderbolt marks
// and hail join a rising storm surge at 60%; at ≤10% THE GREAT FLOOD
// swallows the arena in three surges - hop between dry islands before THE
// BREAK takes everything except the final one.
//------------------------------------------------------------------------

export const _MN_DEBUG_SLOW = false;
export const _MN_DEBUG_MULT = _MN_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_monsoon: {
        id: 'boss_monsoon', name: 'The Monsoon', emoji: '🌧️',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_monsoon: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'rain_bands', intervalBase: 19000, intervalVariance: 4000, handler: '_mechMnRainBands' },
            { name: 'thunderbolts', intervalBase: 18000, intervalVariance: 4500, handler: '_mechMnThunderbolts' },
            { name: 'storm_surge', intervalBase: 21000, intervalVariance: 5000, handler: '_mechMnStormSurge', phase2Only: true },
            { name: 'hail_barrage', intervalBase: 20000, intervalVariance: 5000, handler: '_mechMnHailBarrage', phase2Only: true },
        ],
        onPhaseEnter: _mnOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const MN_BAND_DMG   = [0, 0.14, 0.17, 0.20];   // rain band contact
export const MN_BOLT_DMG   = [0, 0.16, 0.19, 0.22];   // thunderbolt strike
export const MN_SURGE_DMG  = [0, 0, 0.12, 0.15];      // submerged in surge water
export const MN_HAIL_DMG   = [0, 0, 0.15, 0.18];      // hailstone impact
export const MN_SURGE_CLIP = 0.12;                    // finale surge clip
export const MN_FLOOD_DMG  = 0.32;                    // THE BREAK full hit
export const MN_HIT_CD_MS  = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Monsoon hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _mnHitCd = 0;
export function _mnTouch(pct, level, label) {
    const now = performance.now();
    if (now < _mnHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _mnHitCd = now + MN_HIT_CD_MS;
    const dealt = _nkHit(pct, 'cold', level);
    _nkAbilityHitToast(dealt, 'The Monsoon', label);
    return true;
}

// One expanding ring (impact/splash) at (x, y) - body-level visual.
export function _mnRing(x, y, cls, lifeMs, run, timers) {
    const el = document.createElement('div');
    el.className = 'sx-mn-icyring' + (cls ? ' ' + cls : '');
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
// seconds - standing inside a curtain stings repeatedly. Phase 1 sends
// two, later phases three, all faster.
export const MN_BAND_W    = 92;
export const MN_BAND_LIFE = 3000;

export function _mechMnRainBands(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = [0, 2, 3, 3][p];
    const warnMs = 1400 * _MN_DEBUG_MULT;
    const lifeMs = MN_BAND_LIFE * _MN_DEBUG_MULT;
    const dmgPct = MN_BAND_DMG[p];
    const len = Math.hypot(W, H) + 160;

    const c0 = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const bands = [];
    for (let i = 0; i < count; i++) {
        const ang = (i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 30) * Math.PI / 180;
        const cx = Math.max(90, Math.min(W - 90, c0.x + (Math.random() * 2 - 1) * 160));
        const cy = Math.max(90, Math.min(H - 90, c0.y + (Math.random() * 2 - 1) * 160));
        const el = _nkEl(run, 'div', 'sx-mn-band sx-mn-band-warn');
        el.style.width = Math.round(len) + 'px';
        el.style.height = MN_BAND_W + 'px';
        el.style.left = Math.round(cx - len / 2) + 'px';
        el.style.top = Math.round(cy - MN_BAND_W / 2) + 'px';
        el.style.rotate = ang + 'rad';
        bands.push({ cx, cy, ang, el, live: false, faded: false });
    }

    _nkToast('eg_mech_monsoon', '🌧️ The Monsoon: RAIN BANDS - out of the curtains!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        let alive = false;
        bands.forEach(b => {
            if (b.faded) return;
            if (!b.live) {
                if (t < warnMs) { alive = true; return; }
                b.live = true;
                b.el.classList.remove('sx-mn-band-warn');
            }
            if (t >= warnMs + lifeMs) {
                b.faded = true;
                b.el.classList.add('sx-mn-band-fade');
                const el = b.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
                return;
            }
            alive = true;
            // Contact: perpendicular distance from the player to the curtain line.
            if (pr && now >= touchCd) {
                const dx = pr.left + pr.width / 2 - b.cx, dy = pr.top + pr.height / 2 - b.cy;
                const perp = Math.abs(Math.cos(b.ang) * dy - Math.sin(b.ang) * dx);
                if (perp < MN_BAND_W / 2 + 14) {
                    touchCd = now + MN_HIT_CD_MS;
                    _mnTouch(dmgPct, level, 'Rain Band');
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
export const MN_BOLT_COUNT = [0, 4, 5, 6];
export const MN_BOLT_R     = 58;

export function _mechMnThunderbolts(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = MN_BOLT_COUNT[p];
    const warnMs = [0, 1300, 1150, 1000][p] * _MN_DEBUG_MULT;
    const gapMs = 380 * _MN_DEBUG_MULT;
    const dmgPct = MN_BOLT_DMG[p];

    const strikes = [];
    let guard = 0;
    const pc0 = _nkPlayerCenter();
    while (strikes.length < count && guard++ < 90) {
        const x = 90 + Math.random() * Math.max(60, W - 180);
        const y = 120 + Math.random() * Math.max(60, H - 240);
        if (pc0 && Math.hypot(pc0.x - x, pc0.y - y) < 120) continue;
        if (!strikes.every(s => Math.hypot(s.x - x, s.y - y) > 150)) continue;
        const warn = _nkEl(run, 'div', 'sx-mn-boltwarn');
        warn.style.left = Math.round(x - 58) + 'px';
        warn.style.top = Math.round(y - 58) + 'px';
        strikes.push({ x, y, warn, at: warnMs + strikes.length * gapMs, done: false });
    }

    _nkToast('eg_mech_mn_bolts', '🌧️ The Monsoon: THUNDERBOLTS - clear of the marks!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        strikes.forEach(s => {
            if (s.done || t < s.at) return;
            s.done = true;
            try { s.warn.remove(); } catch (e) {}
            // The bolt: a golden streak from the sky down to the mark.
            const bolt = _nkEl(run, 'div', 'sx-mn-bolt');
            bolt.style.left = Math.round(s.x - 3) + 'px';
            bolt.style.height = Math.round(s.y) + 'px';
            _mnRing(s.x, s.y, 'sx-mn-flashring', 520, run, run.timers);
            if (pr && now >= touchCd && _nkCircleHit(s.x, s.y, MN_BOLT_R, pr, 0)) {
                touchCd = now + MN_HIT_CD_MS;
                _mnTouch(dmgPct, level, 'Thunderbolt');
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
// The water rises from the bottom of the arena and holds - everything
// submerged takes repeated hits - then recedes. The run is PASSIVE (field
// hazard - never blocks other mechanics).
export const MN_SURGE_PEAK = [0, 0, 0.34, 0.42];
export const MN_SURGE_RISE = 3500;
export const MN_SURGE_HOLD = 2600;
export const MN_SURGE_FALL = 1600;

export function _mechMnStormSurge(monster, phase) {
    if (_nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    run.passive = true;
    const H = window.innerHeight;
    const peakH = MN_SURGE_PEAK[p] * H;
    const riseMs = MN_SURGE_RISE * _MN_DEBUG_MULT;
    const holdMs = MN_SURGE_HOLD * _MN_DEBUG_MULT;
    const fallMs = MN_SURGE_FALL * _MN_DEBUG_MULT;
    const dmgPct = MN_SURGE_DMG[p];

    const water = document.createElement('div');
    water.className = 'sx-mn-water';
    document.body.appendChild(water);
    run.els.push(water);

    _nkToast('eg_mech_mn_surge', '🌧️ The Monsoon: STORM SURGE - the water is rising!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
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
        const pr = _nkPlayerRect();
        if (h > 12 && pr && now >= touchCd) {
            const py = pr.top + pr.height / 2;
            if (py > H - h) {
                touchCd = now + 900;
                _mnTouch(dmgPct, level, 'Storm Surge');
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: HAIL BARRAGE (phase 2+)----------------------
//------------------------------------------------------------------------
// Hailstones drop onto marked spots - most aimed near where the player was
// when the volley started. The stone falls during the warn, then impacts.
export const MN_HAIL_COUNT = [0, 0, 7, 10];
export const MN_HAIL_R     = 30;

export function _mechMnHailBarrage(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = MN_HAIL_COUNT[p];
    const warnMs = 850 * _MN_DEBUG_MULT;
    const emitMs = 2600 * _MN_DEBUG_MULT;
    const dmgPct = MN_HAIL_DMG[p];

    _nkToast('eg_mech_mn_hail', '🌧️ The Monsoon: HAIL BARRAGE - mind the marks!', '#e2e8f0');

    const drops = [];
    let emitted = 0, emitAcc = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        emitAcc += dtS * 1000;
        const step = emitMs / count;
        while (emitted < count && emitAcc >= step) {
            emitAcc -= step;
            emitted++;
            let x, y;
            if (Math.random() < 0.65) {
                const c = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
                x = c.x + (Math.random() * 2 - 1) * 240;
                y = c.y + (Math.random() * 2 - 1) * 240;
            } else {
                x = 40 + Math.random() * Math.max(40, W - 80);
                y = 40 + Math.random() * Math.max(40, H - 80);
            }
            const warn = _nkEl(run, 'div', 'sx-mn-hailwarn');
            warn.style.left = Math.round(x - 30) + 'px';
            warn.style.top = Math.round(y - 30) + 'px';
            const stone = _nkEl(run, 'div', 'sx-mn-hail');
            stone.style.left = Math.round(x - 11) + 'px';
            stone.style.top = Math.round(y - 260) + 'px';
            stone.style.transition = 'top ' + (warnMs / 1000) + 's linear';
            requestAnimationFrame(() => { stone.style.top = Math.round(y - 11) + 'px'; });
            drops.push({ x, y, t: 0, struck: false, warn, stone });
        }
        const pr = _nkPlayerRect();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dtS * 1000;
            if (!d.struck && d.t >= warnMs) {
                d.struck = true;
                try { d.warn.remove(); } catch (e) {}
                try { d.stone.remove(); } catch (e) {}
                _mnRing(d.x, d.y, '', 520, run, run.timers);
                if (pr && now >= touchCd && _nkCircleHit(d.x, d.y, MN_HAIL_R, pr, 0)) {
                    touchCd = now + MN_HIT_CD_MS;
                    _mnTouch(dmgPct, level, 'Hail Barrage');
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
// ground - be on it when the surge lands! Then THE BREAK: the flood
// swallows everything except the final island. Charge bar frozen for the
// whole set-piece (gate in _tickPlayer via _mnFinalActive).
export const MN_FINAL_TICK_MS = 1200;
export const MN_FINAL_TICKS = 4;
export const MN_ISLAND_R = 150;
export const MN_ISLAND_R_FINAL = 200;
export const MN_SURGE_STAGES = [0.30, 0.55, 0.78, 1.08];   // of screen height

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _mnFinal = null;

export function _mnFinalActive() {
    return !!_mnFinal && !_mnFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _mnOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _mnStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _mnStartFinalWatcher(monster) {
    if (!monster || _mnFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_mnFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _mnFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Hop the dry island to a fresh high-ground spot (top ~45% of the screen).
export function _mnPlaceIsland(g, r, prev) {
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
    el.className = 'sx-mn-island';
    el.style.width = (r * 2) + 'px';
    el.style.height = (r * 2) + 'px';
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    document.body.appendChild(el);
    if (g.fxRun) g.fxRun.els.push(el);
    g.islandEl = el;
}

export function _mnFinalStart(monster) {
    if (_mnFinal || !monster) return;

    // The sky closes: kill every other run of this boss.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: MN_FINAL_TICKS,
        ix: 0, iy: 0, ir: MN_ISLAND_R,
        islandEl: null,
        storm: null,
        water: null,
        overlay: null,
        fxRun: null,
        cdTimer: null,
    };
    _mnFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds water, island and cleanup timers.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Storm overlay: dark sky + driving rain streaks.
    const storm = document.createElement('div');
    storm.className = 'sx-mn-storm';
    document.body.appendChild(storm);
    g.storm = storm;
    requestAnimationFrame(() => storm.classList.add('sx-mn-storm-on'));

    // The floodwater itself (final variant stacks above the storm tint).
    const water = document.createElement('div');
    water.className = 'sx-mn-water sx-mn-water-final';
    water.style.height = '0px';
    document.body.appendChild(water);
    g.water = water;
    g.fxRun.els.push(water);

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'sx-mn-cd';
    ov.innerHTML =
        '<div class="sx-mn-cd-label">🌊 THE GREAT FLOOD</div>' +
        '<div class="sx-mn-cd-num sx-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="sx-mn-cd-hint">Climb! Reach the dry island before each surge!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_mn_final_cd', '🌊💀 THE GREAT FLOOD - climb to the island!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a deluge (released at the end).
    monster.bossImmune = true;

    // The boss churns, whipping the storm into a frenzy.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-mn-churning');
        wrap.classList.add('sx-nk-shielded');
    }

    // First island right away so beat 1 already has high ground to reach.
    _mnPlaceIsland(g, MN_ISLAND_R, null);

    // Metronome: each beat the water surges to the next stage and clips
    // everyone below the new waterline (except the island). At zero: THE
    // BREAK - the flood swallows everything except the island. Pause /
    // death / inactive hold the count (debug: extra-long beats).
    const cdTick = MN_FINAL_TICK_MS * (_MN_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_mnFinal || _mnFinal !== g || g.finished) return;
        if (_nkFrozen()) return;
        const stage = MN_FINAL_TICKS - g.count;   // 0..3
        const frac = MN_SURGE_STAGES[stage];
        const H = window.innerHeight;
        g.water.style.transition = 'height 0.8s cubic-bezier(.4,0,.6,1)';
        g.water.style.height = Math.round(H * frac) + 'px';
        const isBreak = stage === 3;
        const pr = _nkPlayerRect();
        if (pr) {
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            const insideIsland = Math.hypot(px - g.ix, py - g.iy) <= g.ir + 12;
            if (!insideIsland && (isBreak || py > H * (1 - frac))) {
                _mnTouch(isBreak ? MN_FLOOD_DMG : MN_SURGE_CLIP, monster.level,
                    isBreak ? 'THE GREAT FLOOD' : 'Flood Surge');
            }
        }
        if (isBreak) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _nkToast('eg_mech_mn_final_bang', '🌊💀 THE FLOOD BREAKS!', '#e2e8f0');
            document.body.classList.add('sx-mn-flash');
            const fid = setTimeout(() => document.body.classList.remove('sx-mn-flash'), 700);
            g.fxRun.timers.push(fid);
            const id = setTimeout(() => _mnFinalEnd(g), _MN_DEBUG_SLOW ? 6500 : 1500);
            g.fxRun.timers.push(id);
            return;
        }
        g.count--;
        _mnPlaceIsland(g, g.count === 1 ? MN_ISLAND_R_FINAL : MN_ISLAND_R, { x: g.ix, y: g.iy });
        const num = g.overlay && g.overlay.querySelector('.sx-mn-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('sx-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('sx-bmb-cd-pop');
        }
    }, cdTick);
}

export function _mnFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.storm) { try { g.storm.remove(); } catch (e) {} g.storm = null; }
    if (g.water) { try { g.water.remove(); } catch (e) {} g.water = null; }
    if (g.islandEl) { try { g.islandEl.remove(); } catch (e) {} g.islandEl = null; }
    if (g.fxRun) { try { _nkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    document.body.classList.remove('sx-mn-flash');
    document.querySelectorAll('.sx-mn-churning').forEach(el => el.classList.remove('sx-mn-churning'));

    const m = (g.monsterId && typeof _monsters !== 'undefined')
        ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _bossScheduleMechanics === 'function') {
            try { _bossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e) {} }
    }
    if (_mnFinal === g) _mnFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _mnTeardown() {
    if (_mnFinal) { try { _mnFinalEnd(_mnFinal); } catch (e) {} _mnFinal = null; }
    document.querySelectorAll('.sx-mn-band, .sx-mn-bolt, .sx-mn-boltwarn, .sx-mn-flashring, ' +
        '.sx-mn-water, .sx-mn-hailwarn, .sx-mn-hail, .sx-mn-icyring, .sx-mn-island, ' +
        '.sx-mn-storm, .sx-mn-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('sx-mn-flash');
    document.querySelectorAll('.sx-mn-churning').forEach(el => el.classList.remove('sx-mn-churning'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _MN_DEBUG.fire('bands'|'bolts'|'surge'|'hail') - runs one now
//   _MN_DEBUG.final()                              - THE GREAT FLOOD now
if (typeof window !== 'undefined') {
    window._MN_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_monsoon') : null;
            if (!monster) return 'no monsoon alive';
            const fn = name === 'bands' ? _mechMnRainBands
                : name === 'bolts' ? _mechMnThunderbolts
                : name === 'surge' ? _mechMnStormSurge
                : name === 'hail' ? _mechMnHailBarrage : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'surge' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_monsoon') : null;
            if (!monster) return 'no monsoon alive';
            _mnFinalStart(monster);
            return 'THE GREAT FLOOD started';
        },
    };
}
