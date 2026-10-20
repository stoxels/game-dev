import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE INFERNO (boss_inferno)----------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Living Volcano": standing still builds heat, moving
// and obsidian tiles cool you. Surge + vents join at 60%; SUPERVOLCANIC
// WINTER at ≤10% inverts the arena to ice - lure 3 magma surges into
// fissure vents for the kill.
//------------------------------------------------------------------------

// Prefix discipline: everything here is _infV / sx-infv- (the _inf stem
// is shared - do not shorten).

// DEBUG: slow Inferno's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _INFV_DEBUG_SLOW = false;
export const _INFV_DEBUG_MULT = _INFV_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_inferno: {
        id: 'boss_inferno', name: 'The Inferno', emoji: '🌋',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_inferno - "The Living Volcano" (rework)
    // Phase 1 (100% → 60%): Magma Tides teach the heat economy
    // Phase 2 ( 60% → 30%): immune window, Surge + Vents join
    // Phase 3 ( 30% →  0%): quartered tides, faster heat; at 10% the
    //                        SUPERVOLCANIC WINTER begins
    boss_inferno: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'magma_tides', intervalBase: 20000, intervalVariance: 5000, handler: '_mechInfVTides' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_mechPriorBomb' },
            { name: 'pyroclastic_surge', intervalBase: 24000, intervalVariance: 5000, handler: '_mechInfVSurge', phase2Only: true },
            { name: 'eruption_vents', intervalBase: 22000, intervalVariance: 5000, handler: '_mechInfVVents', phase2Only: true },
        ],
        onPhaseEnter: _infVOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
export const INFV_LAVA_DPS    = 12;    // %maxHP/s standing in lava
export const INFV_HEAT_MAX    = 100;   // heat meter cap
export const INFV_HEAT_STILL  = 10;    // heat/s while standing still
export const INFV_HEAT_MOVE   = 4;     // heat/s while moving
export const INFV_TILE_COOL   = 9;     // heat/s standing on an obsidian tile
export const INFV_HAZE_MULT   = 2.5;   // heat gain multiplier inside a heat haze
export const INFV_BURST       = 0.22;  // %maxHP heat-meter full detonation
export const INFV_TILE_LIFE   = 16;    // s before a tile sinks (3 crack states)
export const INFV_SURGE_HIT   = 0.24;  // %maxHP caught in the surge wall
export const INFV_SURGE_GAPS  = 2;     // readable gaps in the wall
export const INFV_VENTS       = 3;     // vents per eruption cast
export const INFV_VENT_HIT    = 0.18;  // %maxHP caught in a jet
export const INFV_VENT_HAZE   = 7;     // s a heat haze lingers
export const INFV_BOMB_HIT    = 0.20;  // %maxHP magma bomb landing
export const INFV_SURGE_GOAL  = 3;     // surges to lure into vents (the kill)
export const INFV_WINTER_TIME = 40;    // s before the core's last stand detonation
export const INFV_LASTSTAND   = 0.35;  // caught in the final detonation
export const INFV_DRIFT_DECAY = 3.2;   // ice momentum: velocity decay /s
export const INFV_HIT_CD_MS   = 700;   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
export let _infVHitCd = 0;

// Touch damage helper shared by all Inferno hazards (per-touch cooldown).
export function _infVTouch(pct, level, label) {
    const now = performance.now();
    if (now < _infVHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _infVHitCd = now + INFV_HIT_CD_MS;
    const dealt = _nkHit(pct, 'fire', level);
    _nkAbilityHitToast(dealt, 'The Inferno', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _infVPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Prefixed delay for out-of-run callbacks: defers while the game is
// frozen (visual-only use - the finale uses _infVAfter instead).
export function _infVDelay(ms, fn) {
    setTimeout(() => { if (!_nkFrozen()) fn(); else setTimeout(() => { if (!_nkFrozen()) fn(); }, 120); }, ms);
}


//------------------------------------------------------------------------
//-------------------HEAT METER (shared state)-----------------------------
//------------------------------------------------------------------------
// The arena's economy: standing still heats you, moving heats you less,
// obsidian tiles COOL you, heat haze heats you 2.5x. At full heat the
// volcano detonates under you. Lives in module state so every mechanic
// reads one truth; the passive watcher ticks it.
export let _infVHeat = 0;      // 0..100
export let _infVHeatRun = null;
export let _infVHeatHudEl = null;
export let _infVLavaZones = [];   // { x, y, w, h, el, until } (tide bodies)
export let _infVTiles = [];       // { x, y, el, born, until }
export let _infVHazes = [];       // { x, y, r, el, until }
export let _infVLastX = null, _infVLastY = null;
export let _infVHotAuraTimer = 0;

export function _infVHudApply() {
    if (!_infVHeatHudEl) {
        _infVHeatHudEl = document.createElement('div');
        _infVHeatHudEl.className = 'sx-infv-heat';
        _infVHeatHudEl.innerHTML =
            '<div class="sx-infv-heat-fill"></div>' +
            '<div class="sx-infv-heat-label">HEAT</div>';
        document.body.appendChild(_infVHeatHudEl);
    }
    _infVHeatHudEl.style.setProperty('--infv-heat', String(Math.round(_infVHeat)));
    _infVHeatHudEl.classList.toggle('sx-infv-heat-critical', _infVHeat > 75);
}

// The heat watcher: created lazily by the first cast, re-created after the
// finale's purge, dies with the boss.
export function _infVEnsureHeatRun(monster) {
    if (_infVHeatRun && _nkRuns.has(_infVHeatRun.id)) return;
    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    _infVHeatRun = run;
    const level = (monster && monster.level) || 1;
    _nkLoop(run, (dtS, now) => {
        // Expiry sweep: tides, tiles, hazes (3 crack states while alive).
        _infVLavaZones = _infVLavaZones.filter(z => { if (now >= z.until) { try { z.el.remove(); } catch (e) {} return false; } return true; });
        _infVTiles = _infVTiles.filter(tl => {
            if (now >= tl.until) { try { tl.el.remove(); } catch (e) {} return false; }
            const life = tl.until - tl.born;
            const age = now - tl.born;
            // Three crack states before the tile sinks.
            tl.el.dataset.crack = String(age > life * 2 / 3 ? 2 : age > life / 2 ? 1 : 0);
            return true;
        });
        _infVHazes = _infVHazes.filter(h => { if (now >= h.until) { try { h.el.remove(); } catch (e) {} return false; } return true; });

        // Supervolcanic Winter: the ice sheet takes over - heat freezes.
        if (_infVFinalActive()) { _infVHeat = 0; _infVHudApply(); return true; }

        const pc = _infVPC();
        const moving = _infVLastX !== null && Math.hypot(pc.x - _infVLastX, pc.y - _infVLastY) > 1.5;
        _infVLastX = pc.x; _infVLastY = pc.y;

        let inLava = false, onTile = false, inHaze = false;
        for (const z of _infVLavaZones) {
            if (pc.x >= z.x && pc.x <= z.x + z.w && pc.y >= z.y && pc.y <= z.y + z.h) { inLava = true; break; }
        }
        for (const tl of _infVTiles) {
            if (Math.hypot(pc.x - tl.x, pc.y - tl.y) < 34) { onTile = true; break; }
        }
        for (const h of _infVHazes) {
            if (Math.hypot(pc.x - h.x, pc.y - h.y) < h.r) { inHaze = true; break; }
        }

        if (inLava) _nkDotTick(run, INFV_LAVA_DPS, dtS, level, 'fire');

        // The heat economy (lava and tiles cancel each other out).
        let rate = moving ? INFV_HEAT_MOVE : INFV_HEAT_STILL;
        if (inHaze) rate *= INFV_HAZE_MULT;
        if (onTile) rate = INFV_TILE_COOL * -1;
        _infVHeat = Math.max(0, Math.min(INFV_HEAT_MAX, _infVHeat + rate * dtS));
        if (_infVHeat >= INFV_HEAT_MAX) {
            _infVHeat = 0;
            _infVTouch(INFV_BURST, level, 'Heat Detonation');
            _nkToast('eg_mech_infv_overheat', '🌋💥 OVERHEATED - the volcano detonates under you!', '#f87171');
        }
        _infVHudApply();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: MAGMA TIDES (all fight)--------------------
//------------------------------------------------------------------------
// Lava floods half the arena in slow alternating tides (left/right, then
// quartered); each flood leaves cooling obsidian tiles at its edge. Stand
// on tiles to cool down; avoid the flood; keep moving.
export const INFV_TIDE_MS = [0, 6200, 5600, 5000];  // per-tide duration, by phase

export function _mechInfVTides(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_infv_tides', '🌋🌊 MAGMA TIDES - the lava floods! Find obsidian tiles to cool down!', '#fb923c');
    _infVEnsureHeatRun(monster);

    const quartered = p >= 3;
    const tideMs = INFV_TIDE_MS[p] * _INFV_DEBUG_MULT;
    const total = (quartered ? 4 : 2) * tideMs;

    // Tide halves: left / right (phase 3 adds top / bottom quarters).
    const sides = quartered
        ? [
            { x: 0, y: 0, w: W / 2, h: H / 2 },
            { x: W / 2, y: 0, w: W / 2, h: H / 2 },
            { x: 0, y: H / 2, w: W / 2, h: H / 2 },
            { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
        ]
        : [
            { x: 0, y: 0, w: W / 2, h: H },
            { x: W / 2, y: 0, w: W / 2, h: H },
        ];

    const t0ms = performance.now();
    sides.forEach((s, i) => {
        // Telegraph, then flood.
        const warn = _nkEl(run, 'div', 'sx-infv-tide-warn');
        warn.style.left = Math.round(s.x) + 'px';
        warn.style.top = Math.round(s.y) + 'px';
        warn.style.width = Math.round(s.w) + 'px';
        warn.style.height = Math.round(s.h) + 'px';
        let fired = false;
        const startAt = i * tideMs;
        _nkLoop(run, (dtS, now) => {
            const t = now - t0ms;
            if (t >= startAt + INFV_TIDE_WARN && !fired) {
                fired = true;
                try { warn.remove(); } catch (e) {}
                const lava = _nkEl(run, 'div', 'sx-infv-lava');
                lava.style.left = Math.round(s.x) + 'px';
                lava.style.top = Math.round(s.y) + 'px';
                lava.style.width = Math.round(s.w) + 'px';
                lava.style.height = Math.round(s.h) + 'px';
                _infVLavaZones.push({ x: s.x, y: s.y, w: s.w, h: s.h, el: lava, until: now + tideMs * 0.62 });
                // Cooling obsidian tiles: 3 per flood, near the tide edge.
                for (let k = 0; k < 3; k++) {
                    const tx = s.x + s.w * (0.18 + Math.random() * 0.64);
                    const ty = s.y + s.h * (0.18 + Math.random() * 0.64);
                    _infVSpawnTile(tx, ty);
                }
            }
            return now - t0ms < total + INFV_TIDE_WARN + 400;
        });
    });
}

export const INFV_TIDE_WARN = 1500;  // telegraph before each flood (ms)

export function _infVSpawnTile(x, y) {
    const el = document.createElement('div');
    el.className = 'sx-infv-tile';
    el.dataset.crack = '0';
    el.style.left = Math.round(x - 34) + 'px';
    el.style.top = Math.round(y - 34) + 'px';
    document.body.appendChild(el);
    _infVTiles.push({ x, y, el, born: performance.now(), until: performance.now() + INFV_TILE_LIFE * _INFV_DEBUG_MULT * 1000 });
}


//------------------------------------------------------------------------
//-------------------ACT II: PYROCLASTIC SURGE (60%)-----------------------
//------------------------------------------------------------------------
// A wall of fire sweeps from one edge with two readable gaps; the ash
// cloud lingering behind it is pressure (low visibility), not punish.
export const INFV_SURGE_MS   = 4200;  // wall travel time (x debug mult)
export const INFV_SURGE_GH   = 150;   // gap height
export const INFV_WALL_H     = 90;    // wall thickness

export function _mechInfVSurge(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    void phase;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_infv_surge', '🌋🔥 PYROCLASTIC SURGE - a wall of fire! Slip through the gaps!', '#f97316');
    _infVEnsureHeatRun(monster);

    const vertical = Math.random() < 0.5;          // sweeps across the width or the height
    const ltr = Math.random() < 0.5;               // direction
    const span = vertical ? W : H;
    const travel = INFV_SURGE_MS * _INFV_DEBUG_MULT;

    // Two readable gaps at fixed fractions (learnable spacing). If the
    // constant ever drifts, slice to it rather than breaking the mechanic.
    const gapFracs = (ltr ? [0.3, 0.68] : [0.32, 0.7]).slice(0, INFV_SURGE_GAPS);
    const gaps = gapFracs.map(f => span * f);

    // Ash cloud behind the wall (pressure, no damage).
    const ash = _nkEl(run, 'div', 'sx-infv-ash');
    let ashW = 0;
    const wall = _nkEl(run, 'div', 'sx-infv-wall');
    // Build the wall from segments around the gaps so gaps are real holes.
    const segs = [];
    let cursor = 0;
    gaps.forEach(g => {
        if (g - cursor > 20) segs.push([cursor, g - cursor]);
        cursor = g + INFV_SURGE_GH;
    });
    if (span - cursor > 20) segs.push([cursor, span - cursor]);

    // Telegraph: shimmering edge.
    const warn = _nkEl(run, 'div', 'sx-infv-surge-warn');
    if (vertical) { warn.style.left = (ltr ? '0px' : W + 'px'); warn.style.top = '0px'; warn.style.width = '8px'; warn.style.height = H + 'px'; }
    else { warn.style.top = (ltr ? '0px' : H + 'px'); warn.style.left = '0px'; warn.style.height = '8px'; warn.style.width = W + 'px'; }

    const t0 = performance.now();
    let hitDone = false;
    _nkLoop(run, (dtS) => {
        const t = performance.now() - t0;
        const f = Math.min(1, t / travel);
        const pos = ltr ? f * span : (1 - f) * span;
        // Wall + segments.
        segs.forEach(([off, len]) => {
            if (vertical) {
                wall.style.left = Math.round(ltr ? pos : pos - INFV_WALL_H) + 'px';
                wall.style.top = Math.round(off) + 'px';
                wall.style.width = INFV_WALL_H + 'px';
                wall.style.height = Math.round(len) + 'px';
            } else {
                wall.style.top = Math.round(ltr ? pos : pos - INFV_WALL_H) + 'px';
                wall.style.left = Math.round(off) + 'px';
                wall.style.height = INFV_WALL_H + 'px';
                wall.style.width = Math.round(len) + 'px';
            }
        });
        // Wall segments as hit zones (skip the gaps).
        if (!hitDone) {
            const pc = _infVPC();
            for (const [off, len] of segs) {
                const along = vertical ? pc.x : pc.y;
                const across = vertical ? pc.y : pc.x;
                const wallEdge = ltr ? pos : pos - INFV_WALL_H;
                if (along >= wallEdge && along <= wallEdge + INFV_WALL_H && across >= off && across <= off + len) {
                    hitDone = true;
                    _infVTouch(INFV_SURGE_HIT, level, 'Pyroclastic Surge');
                    break;

                }
            }
        }
        // Ash follows the wall front (covers what it passed).
        ashW = Math.max(0, f * span - INFV_WALL_H * 2);
        if (vertical) {
            ash.style.left = '0px';
            ash.style.top = '0px';
            ash.style.width = Math.round(ashW) + 'px';
            ash.style.height = H + 'px';
            if (!ltr) ash.style.left = Math.round(span - ashW) + 'px';
        } else {
            ash.style.left = '0px';
            ash.style.top = '0px';
            ash.style.height = Math.round(ashW) + 'px';
            ash.style.width = W + 'px';
            if (!ltr) ash.style.top = Math.round(span - ashW) + 'px';
        }
        if (f >= 1) {
            try { wall.remove(); warn.remove(); ash.remove(); } catch (e) {}
            return false;
            
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: ERUPTION VENTS (60%)--------------------------
//------------------------------------------------------------------------
// Three vents telegraph, then jet upward; jets leave HEAT HAZE zones that
// raise the heat meter faster while inside.
export function _mechInfVVents(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    void phase;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_infv_vents', '🌋⛰️ ERUPTION VENTS - jets incoming! The haze heats you faster!', '#f97316');
    _infVEnsureHeatRun(monster);

    for (let i = 0; i < INFV_VENTS; i++) {
        const vx = W * (0.14 + Math.random() * 0.72);
        const vy = H * (0.16 + Math.random() * 0.68);
        const warn = _nkEl(run, 'div', 'sx-infv-vent-warn');
        warn.style.left = Math.round(vx - 44) + 'px';
        warn.style.top = Math.round(vy - 44) + 'px';
        _infVDelay(INFV_TIDE_WARN * _INFV_DEBUG_MULT, () => {
            if (!_nkRuns.has(run.id)) return;
            try { warn.remove(); } catch (e) {}
            // The jet erupts FROM the vent spot: a local column burst, not
            // a full-screen lane (the telegraph marked a spot, not a lane).
            const jet = _nkEl(run, 'div', 'sx-infv-jet');
            const jetH = 200;
            jet.style.left = Math.round(vx - 34) + 'px';
            jet.style.top = Math.round(vy - jetH / 2) + 'px';
            jet.style.height = jetH + 'px';
            const pc = _infVPC();
            if (Math.abs(pc.x - vx) < 34 + 8 && Math.abs(pc.y - vy) < jetH / 2 + 8) {
                _infVTouch(INFV_VENT_HIT, level, 'Eruption Jet');
            }
            const haze = document.createElement('div');
            haze.className = 'sx-infv-haze';
            const r = 80;
            haze.style.left = Math.round(vx - r) + 'px';
            haze.style.top = Math.round(vy - r) + 'px';
            haze.style.width = (r * 2) + 'px';
            haze.style.height = (r * 2) + 'px';
            document.body.appendChild(haze);
            _infVHazes.push({ x: vx, y: vy, r, el: haze, until: performance.now() + INFV_VENT_HAZE * _INFV_DEBUG_MULT * 1000 });
            _infVDelay(600, () => { try { jet.remove(); } catch (e) {} });
        });
    }
}


//------------------------------------------------------------------------
//-------------------FINALE: SUPERVOLCANIC WINTER (≤10%, one-shot)---------
//------------------------------------------------------------------------
// Inversion twist: the Inferno detonates and the arena FREEZES over
// (fire→ice identity break). The ice sheet makes movement DRIFT; magma
// bombs mark landing spots; lure the dying core's three magma surges into
// the fissure vents to blow its cap - the third detonation is the kill.
export const INFV_WINTER_SURGE_Y = [0.3, 0.5, 0.7];   // fixed surge bands (learnable)
export const INFV_WINTER_VENT_X  = [0.18, 0.5, 0.82]; // matching vent columns

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _infVFinal = null;

export function _infVFinalActive() {
    return !!_infVFinal && !_infVFinal.finished;
}

// Ice momentum: reads the player's velocity into a drift velocity. Called
// from _avatarGetMoveSpeed-era hooks - actually applied in the drift
// watcher below (a per-frame translation of the avatar while on ice).
export let _infVDrift = { vx: 0, vy: 0 };
export let _infVDriftRun = null;

export function _infVOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _infVStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _infVStartFinalWatcher(monster) {
    if (!monster || _infVFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_infVFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _infVFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _infVAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_infVFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _infVFinalStart(monster) {
    if (_infVFinal || !monster) return;

    // The winter takes over: kill every other run of this boss, then
    // rebuild the heat watcher so leftover tiles keep aging out.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    _infVHeatRun = null;

    // Clean slate: the ice replaces the magma battlefield.
    _infVLavaZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _infVHazes.forEach(h => { try { h.el.remove(); } catch (e) {} });
    _infVLavaZones = []; _infVHazes = [];
    _infVHeat = 0;
    _infVHudApply();

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        lured: 0,
        bombs: [],
        deadline: performance.now() + INFV_WINTER_TIME * _INFV_DEBUG_MULT * 1000,
        fxRun: null, overlay: null, timerEl: null,
    };
    _infVFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Ice sheet overlay.
    const ice = document.createElement('div');
    ice.className = 'sx-infv-ice';
    document.body.appendChild(ice);
    g.fxRun.els.push(ice);

    // Countdown overlay (title + timer).
    const ov = document.createElement('div');
    ov.className = 'sx-infv-cd';
    ov.innerHTML =
        '<div class="sx-infv-cd-label">🌋❄️ SUPERVOLCANIC WINTER</div>' +
        '<div class="sx-infv-cd-timer">-</div>' +
        '<div class="sx-infv-cd-hint">Lure the magma surges into the fissure vents - blow the cap!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.fxRun.els.push(ov);

    _nkToast('eg_mech_infv_final_cd', '🌋❄️ SUPERVOLCANIC WINTER - the arena freezes! Lure the surges!', '#93c5fd');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card inverts to ice while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-infv-allin');

    const level = monster.level || 1;

    // Ice drift: the avatar keeps sliding after inputs stop (momentum).
    let lastPX = null, lastPY = null;
    let velX = 0, velY = 0;
    _nkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        const el = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        if (!el) return true;
        const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
        if (!isFinite(x) || !isFinite(y)) return true;
        if (lastPX !== null) {
            const nvx = (x - lastPX) / dtS, nvy = (y - lastPY) / dtS;
            // Smooth toward the observed velocity; apply when input stops.
            velX += (nvx - velX) * Math.min(1, dtS * 6);
            velY += (nvy - velY) * Math.min(1, dtS * 6);
            const held = (typeof _avatarMoveState !== 'undefined' && globalThis._avatarMoveState && globalThis._avatarMoveState.held && globalThis._avatarMoveState.held.size > 0);
            if (!held && (Math.abs(velX) > 6 || Math.abs(velY) > 6)) {
                const dec = Math.exp(-INFV_DRIFT_DECAY * dtS);
                velX *= dec; velY *= dec;
                el.style.left = Math.round(x + velX * dtS) + 'px';
                el.style.top = Math.round(y + velY * dtS) + 'px';
            } else if (held) {
                velX = 0; velY = 0;
            }
        }
        lastPX = x; lastPY = y;
        // Timer readout.
        const left = g.deadline - performance.now();
        if (g.timerEl) g.timerEl.textContent = Math.max(0, Math.ceil(left / 1000)) + 's';
        if (left <= 0) { _infVLastStand(g, monster, level); return false; }
        return true;
    });

    // ── One lure cycle: surge sweeps a fixed band → vent at its column. ──
    const runSurge = () => {
        if (g.finished) return;
        const idx = g.lured % 3;
        const bandY = H * INFV_WINTER_SURGE_Y[idx];
        const ventX = W * INFV_WINTER_VENT_X[idx];

        // Fissure vent telegraph (the lure target).
        const vent = _nkEl(g.fxRun, 'div', 'sx-infv-fissure');
        vent.style.left = Math.round(ventX - 44) + 'px';
        vent.style.top = Math.round(bandY - 44) + 'px';

        // The surge: a slow blob crossing the band toward the vent.
        _infVAfter(g, 2200 * _INFV_DEBUG_MULT, () => {
            if (g.finished) return;
            try { vent.remove(); } catch (e) {}
            const blob = _nkEl(g.fxRun, 'div', 'sx-infv-surge-blob');
            const fromLeft = Math.random() < 0.5;
            let bx = fromLeft ? -60 : W + 60;
            const speed = 130;   // px/s (loop clock)
            _nkLoop(g.fxRun, (dtS) => {
                if (g.finished) return false;
                bx += (fromLeft ? 1 : -1) * speed * dtS;
                blob.style.left = Math.round(bx - 60) + 'px';
                blob.style.top = Math.round(bandY - 44) + 'px';
                const pc = _infVPC();
                // Player contact: knocks the blob toward the vent (lure).
                if (Math.hypot(pc.x - bx, pc.y - bandY) < 70) {
                    // Standing in its path pushes it forward - the lure.
                    bx += (ventX > bx ? 1 : -1) * 240 * dtS;
                }
                // Reaches the vent column: DETONATE (blows the cap a bit).
                if (Math.abs(bx - ventX) < 30) {
                    try { blob.remove(); } catch (e) {}
                    g.lured++;
                    _nkToast('eg_mech_infv_ventblow', '🌋💥 THE VENT BLOWS - ' + g.lured + '/' + INFV_SURGE_GOAL + ' surges lured!', '#fde68a');
                    const flash = _nkEl(g.fxRun, 'div', 'sx-infv-vent-flash');
                    flash.style.left = Math.round(ventX - 120) + 'px';
                    flash.style.top = Math.round(bandY - 120) + 'px';
                    _infVAfter(g, 900, () => { try { flash.remove(); } catch (e) {} });
                    if (g.lured >= INFV_SURGE_GOAL) {
                        _infVCapBlown(g, monster);
                    } else {
                        _infVAfter(g, 1600 * _INFV_DEBUG_MULT, runSurge);
                        _infVFallBombs(g, level, 2);
                    }
                    return false;
                }
                // Off-screen: missed lure - it loops around (no punish).
                if (bx < -80 || bx > W + 80) {
                    try { blob.remove(); } catch (e) {}
                    _infVAfter(g, 1200 * _INFV_DEBUG_MULT, runSurge);
                    return false;
                }
                return true;
            });
        });
    };
    runSurge();

    // Magma bombs rain on a cadence throughout the winter.
    _infVFallBombs(g, level, 3);
    const bombClock = () => {
        if (g.finished) return;
        _infVFallBombs(g, level, 1);
        _infVAfter(g, 2800 * _INFV_DEBUG_MULT, bombClock);
    };
    bombClock();
}

// Magma bombs: telegraphed landing rings; standing in one when it lands
// takes the hit.
export function _infVFallBombs(g, level, n) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < n; i++) {
        const bx = W * (0.12 + Math.random() * 0.76);
        const by = H * (0.16 + Math.random() * 0.68);
        const warn = _nkEl(g.fxRun, 'div', 'sx-infv-bomb-warn');
        warn.style.left = Math.round(bx - 40) + 'px';
        warn.style.top = Math.round(by - 40) + 'px';
        _infVAfter(g, 1100 * _INFV_DEBUG_MULT, () => {
            if (g.finished) return;
            try { warn.remove(); } catch (e) {}
            const boom = _nkEl(g.fxRun, 'div', 'sx-infv-bomb-boom');
            boom.style.left = Math.round(bx - 70) + 'px';
            boom.style.top = Math.round(by - 70) + 'px';
            const pc = _infVPC();
            if (Math.hypot(pc.x - bx, pc.y - by) < 40 + 12) {
                _infVTouch(INFV_BOMB_HIT, level, 'Magma Bomb');
            }
            _infVAfter(g, 700, () => { try { boom.remove(); } catch (e) {} });
        });
    }
}

// The last stand: timer died - the core detonates everything but the vents.
export function _infVLastStand(g, monster, level) {
    if (g.finished) return;
    _nkToast('eg_mech_infv_laststand', '🌋💀 THE CORE DETONATES - get between the vents!', '#f87171');
    const W = window.innerWidth, H = window.innerHeight;
    const flash = _nkEl(g.fxRun, 'div', 'sx-infv-laststand');
    flash.style.left = '0px'; flash.style.top = '0px';
    flash.style.width = W + 'px'; flash.style.height = H + 'px';
    _infVAfter(g, 1600 * _INFV_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _infVPC();
        // Safe columns: near the fissure vent x positions.
        const safe = INFV_WINTER_VENT_X.some(fx => Math.abs(pc.x - W * fx) < 90);
        if (!safe) {
            const dealt = _nkHit(INFV_LASTSTAND, 'fire', level);
            _nkAbilityHitToast(dealt, 'The Inferno', 'Core Detonation');
        }
        _infVFinalEnd(g, monster);
    });
}

// Three surges lured: the cap blows - the core pays its own HP.
export function _infVCapBlown(g, monster) {
    if (g.finished) return;
    _nkToast('eg_mech_infv_capblown', '🌋💥 THE CAP BLOWS - Supervolcanic Winter ends in fire AND ice!', '#fde68a');
    const flash = document.createElement('div');
    flash.className = 'sx-infv-restart-flash';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1500);
    _infVFinalEnd(g, monster);
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
            _damageTargetById(g.monsterId, m.currentHP, ['fire'], {});
        }
    } catch (e) {}
    void monster;
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _infVFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-infv-ice, .sx-infv-cd, .sx-infv-fissure, .sx-infv-surge-blob, ' +
        '.sx-infv-vent-flash, .sx-infv-bomb-warn, .sx-infv-bomb-boom, .sx-infv-laststand, ' +
        '.sx-infv-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-infv-allin');
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body state this boss ever created.
export function _infVTeardown() {
    if (_infVFinal) { try { _infVFinalEnd(_infVFinal, null); } catch (e) {} _infVFinal = null; }
    if (_infVHeatRun) { try { _nkKillRun(_infVHeatRun); } catch (e) {} _infVHeatRun = null; }
    _infVLavaZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _infVTiles.forEach(tl => { try { tl.el.remove(); } catch (e) {} });
    _infVHazes.forEach(h => { try { h.el.remove(); } catch (e) {} });
    _infVLavaZones = []; _infVTiles = []; _infVHazes = [];
    _infVHeat = 0;
    if (_infVHeatHudEl) { try { _infVHeatHudEl.remove(); } catch (e) {} _infVHeatHudEl = null; }
    document.querySelectorAll('.sx-infv-tide-warn, .sx-infv-lava, .sx-infv-tile, .sx-infv-ash, ' +
        '.sx-infv-wall, .sx-infv-surge-warn, .sx-infv-vent-warn, .sx-infv-jet, .sx-infv-haze, ' +
        '.sx-infv-ice, .sx-infv-cd, .sx-infv-fissure, .sx-infv-surge-blob, .sx-infv-vent-flash, ' +
        '.sx-infv-bomb-warn, .sx-infv-bomb-boom, .sx-infv-laststand, .sx-infv-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-boss_inferno');
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-infv-allin');
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _INFV_DEBUG.fire('tides'|'surge'|'vents'|'final') - run one now
//   _INFV_DEBUG.heat(n)                               - set the meter by hand
if (typeof window !== 'undefined') {
    window._INFV_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_inferno') : null;
            if (!monster) return 'no inferno alive';
            if (name === 'final') { _infVFinalStart(monster); return 'SUPERVOLCANIC WINTER started'; }
            const fn = name === 'tides' ? _mechInfVTides
                : name === 'surge' ? _mechInfVSurge
                : name === 'vents' ? _mechInfVVents : null;
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        heat: (n) => { _infVHeat = Math.max(0, Math.min(INFV_HEAT_MAX, Number(n) || 0)); _infVHudApply(); return 'heat = ' + Math.round(_infVHeat); },
    };
}
