//------------------------------------------------------------------------
//-------------------BOSS: THE INFERNO (boss_inferno)----------------------
//------------------------------------------------------------------------
// TIER 7 REWORK — 🌋 "The Living Volcano". Escalating heat you must
// actively cool: the arena heats the longer you stand still — movement is
// survival. Element: fire (unchanged).
//   • MAGMA TIDES (signature, all fight) — lava floods half the arena in
//     slow alternating tides (left/right, quartered in phase 3). Standing
//     in lava is a heavy DoT; the tide edge leaves COOLING OBSIDIAN TILES
//     that are safe to stand on and slowly crack (3 states) before
//     sinking. Every tile stood on COOLS you: heat is the meter.
//   • PYROCLASTIC SURGE (60%) — a wall of fire sweeps from one edge with
//     two readable gaps; ash cloud lingers behind it (low visibility, no
//     damage — pressure, not punish).
//   • ERUPTION VENTS (60%) — three vents telegraph, then jet upward; the
//     jets leave HEAT HAZE zones that raise your heat meter faster while
//     inside.
//   • 💀 SUPERVOLCANIC WINTER (≤10%, one-shot) — inversion twist: the
//     Inferno detonates and the arena FREEZES over (fire→ice identity
//     break). The ice sheet makes your movement DRIFT (momentum), magma
//     bombs mark landing spots, and you must lure the dying core's three
//     magma surges into the fissure vents to blow its cap. The detonation
//     of the third surge is the kill (canonical damage path). Charge bar
//     frozen (gate in _egTickPlayer via _egInfVFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Prefix discipline: everything here is _egInfV / eg-infv- (the _egInf stem
// is shared — do not shorten).
//------------------------------------------------------------------------

// DEBUG: slow Inferno's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_INFV_DEBUG_SLOW = true;
const _EG_INFV_DEBUG_MULT = _EG_INFV_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_inferno: {
        id: 'boss_inferno', name: 'The Inferno', emoji: '🌋',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_inferno — "The Living Volcano" (rework)
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
            { name: 'magma_tides', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechInfVTides' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'pyroclastic_surge', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechInfVSurge', phase2Only: true },
            { name: 'eruption_vents', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechInfVVents', phase2Only: true },
        ],
        onPhaseEnter: _egInfVOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
const EG_INFV_LAVA_DPS    = 12;    // %maxHP/s standing in lava
const EG_INFV_HEAT_MAX    = 100;   // heat meter cap
const EG_INFV_HEAT_STILL  = 10;    // heat/s while standing still
const EG_INFV_HEAT_MOVE   = 4;     // heat/s while moving
const EG_INFV_TILE_COOL   = 9;     // heat/s standing on an obsidian tile
const EG_INFV_HAZE_MULT   = 2.5;   // heat gain multiplier inside a heat haze
const EG_INFV_BURST       = 0.22;  // %maxHP heat-meter full detonation
const EG_INFV_TILE_LIFE   = 16;    // s before a tile sinks (3 crack states)
const EG_INFV_SURGE_HIT   = 0.24;  // %maxHP caught in the surge wall
const EG_INFV_SURGE_GAPS  = 2;     // readable gaps in the wall
const EG_INFV_VENTS       = 3;     // vents per eruption cast
const EG_INFV_VENT_HIT    = 0.18;  // %maxHP caught in a jet
const EG_INFV_VENT_HAZE   = 7;     // s a heat haze lingers
const EG_INFV_BOMB_HIT    = 0.20;  // %maxHP magma bomb landing
const EG_INFV_SURGE_GOAL  = 3;     // surges to lure into vents (the kill)
const EG_INFV_WINTER_TIME = 40;    // s before the core's last stand detonation
const EG_INFV_LASTSTAND   = 0.35;  // caught in the final detonation
const EG_INFV_DRIFT_DECAY = 3.2;   // ice momentum: velocity decay /s
const EG_INFV_HIT_CD_MS   = 700;   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
let _egInfVHitCd = 0;

// Touch damage helper shared by all Inferno hazards (per-touch cooldown).
function _egInfVTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egInfVHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egInfVHitCd = now + EG_INFV_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'fire', level);
    _egNkAbilityHitToast(dealt, 'The Inferno', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egInfVPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Prefixed delay for out-of-run callbacks: defers while the game is
// frozen (visual-only use — the finale uses _egInfVAfter instead).
function _egInfVDelay(ms, fn) {
    setTimeout(() => { if (!_egNkFrozen()) fn(); else setTimeout(() => { if (!_egNkFrozen()) fn(); }, 120); }, ms);
}


//------------------------------------------------------------------------
//-------------------HEAT METER (shared state)-----------------------------
//------------------------------------------------------------------------
// The arena's economy: standing still heats you, moving heats you less,
// obsidian tiles COOL you, heat haze heats you 2.5x. At full heat the
// volcano detonates under you. Lives in module state so every mechanic
// reads one truth; the passive watcher ticks it.
let _egInfVHeat = 0;      // 0..100
let _egInfVHeatRun = null;
let _egInfVHeatHudEl = null;
let _egInfVLavaZones = [];   // { x, y, w, h, el, until } (tide bodies)
let _egInfVTiles = [];       // { x, y, el, born, until }
let _egInfVHazes = [];       // { x, y, r, el, until }
let _egInfVLastX = null, _egInfVLastY = null;
let _egInfVHotAuraTimer = 0;

function _egInfVHudApply() {
    if (!_egInfVHeatHudEl) {
        _egInfVHeatHudEl = document.createElement('div');
        _egInfVHeatHudEl.className = 'eg-infv-heat';
        _egInfVHeatHudEl.innerHTML =
            '<div class="eg-infv-heat-fill"></div>' +
            '<div class="eg-infv-heat-label">HEAT</div>';
        document.body.appendChild(_egInfVHeatHudEl);
    }
    _egInfVHeatHudEl.style.setProperty('--infv-heat', String(Math.round(_egInfVHeat)));
    _egInfVHeatHudEl.classList.toggle('eg-infv-heat-critical', _egInfVHeat > 75);
}

// The heat watcher: created lazily by the first cast, re-created after the
// finale's purge, dies with the boss.
function _egInfVEnsureHeatRun(monster) {
    if (_egInfVHeatRun && _egNkRuns.has(_egInfVHeatRun.id)) return;
    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    _egInfVHeatRun = run;
    const level = (monster && monster.level) || 1;
    _egNkLoop(run, (dtS, now) => {
        // Expiry sweep: tides, tiles, hazes (3 crack states while alive).
        _egInfVLavaZones = _egInfVLavaZones.filter(z => { if (now >= z.until) { try { z.el.remove(); } catch (e) {} return false; } return true; });
        _egInfVTiles = _egInfVTiles.filter(tl => {
            if (now >= tl.until) { try { tl.el.remove(); } catch (e) {} return false; }
            const life = tl.until - tl.born;
            const age = now - tl.born;
            // Three crack states before the tile sinks.
            tl.el.dataset.crack = String(age > life * 2 / 3 ? 2 : age > life / 2 ? 1 : 0);
            return true;
        });
        _egInfVHazes = _egInfVHazes.filter(h => { if (now >= h.until) { try { h.el.remove(); } catch (e) {} return false; } return true; });

        // Supervolcanic Winter: the ice sheet takes over — heat freezes.
        if (_egInfVFinalActive()) { _egInfVHeat = 0; _egInfVHudApply(); return true; }

        const pc = _egInfVPC();
        const moving = _egInfVLastX !== null && Math.hypot(pc.x - _egInfVLastX, pc.y - _egInfVLastY) > 1.5;
        _egInfVLastX = pc.x; _egInfVLastY = pc.y;

        let inLava = false, onTile = false, inHaze = false;
        for (const z of _egInfVLavaZones) {
            if (pc.x >= z.x && pc.x <= z.x + z.w && pc.y >= z.y && pc.y <= z.y + z.h) { inLava = true; break; }
        }
        for (const tl of _egInfVTiles) {
            if (Math.hypot(pc.x - tl.x, pc.y - tl.y) < 34) { onTile = true; break; }
        }
        for (const h of _egInfVHazes) {
            if (Math.hypot(pc.x - h.x, pc.y - h.y) < h.r) { inHaze = true; break; }
        }

        if (inLava) _egNkDotTick(run, EG_INFV_LAVA_DPS, dtS, level, 'fire');

        // The heat economy (lava and tiles cancel each other out).
        let rate = moving ? EG_INFV_HEAT_MOVE : EG_INFV_HEAT_STILL;
        if (inHaze) rate *= EG_INFV_HAZE_MULT;
        if (onTile) rate = EG_INFV_TILE_COOL * -1;
        _egInfVHeat = Math.max(0, Math.min(EG_INFV_HEAT_MAX, _egInfVHeat + rate * dtS));
        if (_egInfVHeat >= EG_INFV_HEAT_MAX) {
            _egInfVHeat = 0;
            _egInfVTouch(EG_INFV_BURST, level, 'Heat Detonation');
            _egNkToast('eg_mech_infv_overheat', '🌋💥 OVERHEATED — the volcano detonates under you!', '#f87171');
        }
        _egInfVHudApply();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: MAGMA TIDES (all fight)--------------------
//------------------------------------------------------------------------
// Lava floods half the arena in slow alternating tides (left/right, then
// quartered); each flood leaves cooling obsidian tiles at its edge. Stand
// on tiles to cool down; avoid the flood; keep moving.
const EG_INFV_TIDE_MS = [0, 6200, 5600, 5000];  // per-tide duration, by phase

function _egMechInfVTides(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_infv_tides', '🌋🌊 MAGMA TIDES — the lava floods! Find obsidian tiles to cool down!', '#fb923c');
    _egInfVEnsureHeatRun(monster);

    const quartered = p >= 3;
    const tideMs = EG_INFV_TIDE_MS[p] * _EG_INFV_DEBUG_MULT;
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
        const warn = _egNkEl(run, 'div', 'eg-infv-tide-warn');
        warn.style.left = Math.round(s.x) + 'px';
        warn.style.top = Math.round(s.y) + 'px';
        warn.style.width = Math.round(s.w) + 'px';
        warn.style.height = Math.round(s.h) + 'px';
        let fired = false;
        const startAt = i * tideMs;
        _egNkLoop(run, (dtS, now) => {
            const t = now - t0ms;
            if (t >= startAt + EG_INFV_TIDE_WARN && !fired) {
                fired = true;
                try { warn.remove(); } catch (e) {}
                const lava = _egNkEl(run, 'div', 'eg-infv-lava');
                lava.style.left = Math.round(s.x) + 'px';
                lava.style.top = Math.round(s.y) + 'px';
                lava.style.width = Math.round(s.w) + 'px';
                lava.style.height = Math.round(s.h) + 'px';
                _egInfVLavaZones.push({ x: s.x, y: s.y, w: s.w, h: s.h, el: lava, until: now + tideMs * 0.62 });
                // Cooling obsidian tiles: 3 per flood, near the tide edge.
                for (let k = 0; k < 3; k++) {
                    const tx = s.x + s.w * (0.18 + Math.random() * 0.64);
                    const ty = s.y + s.h * (0.18 + Math.random() * 0.64);
                    _egInfVSpawnTile(tx, ty);
                }
            }
            return now - t0ms < total + EG_INFV_TIDE_WARN + 400;
        });
    });
}

const EG_INFV_TIDE_WARN = 1500;  // telegraph before each flood (ms)

function _egInfVSpawnTile(x, y) {
    const el = document.createElement('div');
    el.className = 'eg-infv-tile';
    el.dataset.crack = '0';
    el.style.left = Math.round(x - 34) + 'px';
    el.style.top = Math.round(y - 34) + 'px';
    document.body.appendChild(el);
    _egInfVTiles.push({ x, y, el, born: performance.now(), until: performance.now() + EG_INFV_TILE_LIFE * _EG_INFV_DEBUG_MULT * 1000 });
}


//------------------------------------------------------------------------
//-------------------ACT II: PYROCLASTIC SURGE (60%)-----------------------
//------------------------------------------------------------------------
// A wall of fire sweeps from one edge with two readable gaps; the ash
// cloud lingering behind it is pressure (low visibility), not punish.
const EG_INFV_SURGE_MS   = 4200;  // wall travel time (x debug mult)
const EG_INFV_SURGE_GH   = 150;   // gap height
const EG_INFV_WALL_H     = 90;    // wall thickness

function _egMechInfVSurge(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    void phase;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_infv_surge', '🌋🔥 PYROCLASTIC SURGE — a wall of fire! Slip through the gaps!', '#f97316');
    _egInfVEnsureHeatRun(monster);

    const vertical = Math.random() < 0.5;          // sweeps across the width or the height
    const ltr = Math.random() < 0.5;               // direction
    const span = vertical ? W : H;
    const travel = EG_INFV_SURGE_MS * _EG_INFV_DEBUG_MULT;

    // Two readable gaps at fixed fractions (learnable spacing). If the
    // constant ever drifts, slice to it rather than breaking the mechanic.
    const gapFracs = (ltr ? [0.3, 0.68] : [0.32, 0.7]).slice(0, EG_INFV_SURGE_GAPS);
    const gaps = gapFracs.map(f => span * f);

    // Ash cloud behind the wall (pressure, no damage).
    const ash = _egNkEl(run, 'div', 'eg-infv-ash');
    let ashW = 0;
    const wall = _egNkEl(run, 'div', 'eg-infv-wall');
    // Build the wall from segments around the gaps so gaps are real holes.
    const segs = [];
    let cursor = 0;
    gaps.forEach(g => {
        if (g - cursor > 20) segs.push([cursor, g - cursor]);
        cursor = g + EG_INFV_SURGE_GH;
    });
    if (span - cursor > 20) segs.push([cursor, span - cursor]);

    // Telegraph: shimmering edge.
    const warn = _egNkEl(run, 'div', 'eg-infv-surge-warn');
    if (vertical) { warn.style.left = (ltr ? '0px' : W + 'px'); warn.style.top = '0px'; warn.style.width = '8px'; warn.style.height = H + 'px'; }
    else { warn.style.top = (ltr ? '0px' : H + 'px'); warn.style.left = '0px'; warn.style.height = '8px'; warn.style.width = W + 'px'; }

    const t0 = performance.now();
    let hitDone = false;
    _egNkLoop(run, (dtS) => {
        const t = performance.now() - t0;
        const f = Math.min(1, t / travel);
        const pos = ltr ? f * span : (1 - f) * span;
        // Wall + segments.
        segs.forEach(([off, len]) => {
            if (vertical) {
                wall.style.left = Math.round(ltr ? pos : pos - EG_INFV_WALL_H) + 'px';
                wall.style.top = Math.round(off) + 'px';
                wall.style.width = EG_INFV_WALL_H + 'px';
                wall.style.height = Math.round(len) + 'px';
            } else {
                wall.style.top = Math.round(ltr ? pos : pos - EG_INFV_WALL_H) + 'px';
                wall.style.left = Math.round(off) + 'px';
                wall.style.height = EG_INFV_WALL_H + 'px';
                wall.style.width = Math.round(len) + 'px';
            }
        });
        // Wall segments as hit zones (skip the gaps).
        if (!hitDone) {
            const pc = _egInfVPC();
            for (const [off, len] of segs) {
                const along = vertical ? pc.x : pc.y;
                const across = vertical ? pc.y : pc.x;
                const wallEdge = ltr ? pos : pos - EG_INFV_WALL_H;
                if (along >= wallEdge && along <= wallEdge + EG_INFV_WALL_H && across >= off && across <= off + len) {
                    hitDone = true;
                    _egInfVTouch(EG_INFV_SURGE_HIT, level, 'Pyroclastic Surge');
                    break;

                }
            }
        }
        // Ash follows the wall front (covers what it passed).
        ashW = Math.max(0, f * span - EG_INFV_WALL_H * 2);
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
function _egMechInfVVents(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    void phase;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_infv_vents', '🌋⛰️ ERUPTION VENTS — jets incoming! The haze heats you faster!', '#f97316');
    _egInfVEnsureHeatRun(monster);

    for (let i = 0; i < EG_INFV_VENTS; i++) {
        const vx = W * (0.14 + Math.random() * 0.72);
        const vy = H * (0.16 + Math.random() * 0.68);
        const warn = _egNkEl(run, 'div', 'eg-infv-vent-warn');
        warn.style.left = Math.round(vx - 44) + 'px';
        warn.style.top = Math.round(vy - 44) + 'px';
        _egInfVDelay(EG_INFV_TIDE_WARN * _EG_INFV_DEBUG_MULT, () => {
            if (!_egNkRuns.has(run.id)) return;
            try { warn.remove(); } catch (e) {}
            // The jet erupts FROM the vent spot: a local column burst, not
            // a full-screen lane (the telegraph marked a spot, not a lane).
            const jet = _egNkEl(run, 'div', 'eg-infv-jet');
            const jetH = 200;
            jet.style.left = Math.round(vx - 34) + 'px';
            jet.style.top = Math.round(vy - jetH / 2) + 'px';
            jet.style.height = jetH + 'px';
            const pc = _egInfVPC();
            if (Math.abs(pc.x - vx) < 34 + 8 && Math.abs(pc.y - vy) < jetH / 2 + 8) {
                _egInfVTouch(EG_INFV_VENT_HIT, level, 'Eruption Jet');
            }
            const haze = document.createElement('div');
            haze.className = 'eg-infv-haze';
            const r = 80;
            haze.style.left = Math.round(vx - r) + 'px';
            haze.style.top = Math.round(vy - r) + 'px';
            haze.style.width = (r * 2) + 'px';
            haze.style.height = (r * 2) + 'px';
            document.body.appendChild(haze);
            _egInfVHazes.push({ x: vx, y: vy, r, el: haze, until: performance.now() + EG_INFV_VENT_HAZE * _EG_INFV_DEBUG_MULT * 1000 });
            _egInfVDelay(600, () => { try { jet.remove(); } catch (e) {} });
        });
    }
}


//------------------------------------------------------------------------
//-------------------FINALE: SUPERVOLCANIC WINTER (≤10%, one-shot)---------
//------------------------------------------------------------------------
// Inversion twist: the Inferno detonates and the arena FREEZES over
// (fire→ice identity break). The ice sheet makes movement DRIFT; magma
// bombs mark landing spots; lure the dying core's three magma surges into
// the fissure vents to blow its cap — the third detonation is the kill.
const EG_INFV_WINTER_SURGE_Y = [0.3, 0.5, 0.7];   // fixed surge bands (learnable)
const EG_INFV_WINTER_VENT_X  = [0.18, 0.5, 0.82]; // matching vent columns

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egInfVFinal = null;

function _egInfVFinalActive() {
    return !!_egInfVFinal && !_egInfVFinal.finished;
}

// Ice momentum: reads the player's velocity into a drift velocity. Called
// from _avatarGetMoveSpeed-era hooks — actually applied in the drift
// watcher below (a per-frame translation of the avatar while on ice).
let _egInfVDrift = { vx: 0, vy: 0 };
let _egInfVDriftRun = null;

function _egInfVOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egInfVStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egInfVStartFinalWatcher(monster) {
    if (!monster || _egInfVFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egInfVFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egInfVFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egInfVAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egInfVFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egInfVFinalStart(monster) {
    if (_egInfVFinal || !monster) return;

    // The winter takes over: kill every other run of this boss, then
    // rebuild the heat watcher so leftover tiles keep aging out.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });
    _egInfVHeatRun = null;

    // Clean slate: the ice replaces the magma battlefield.
    _egInfVLavaZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _egInfVHazes.forEach(h => { try { h.el.remove(); } catch (e) {} });
    _egInfVLavaZones = []; _egInfVHazes = [];
    _egInfVHeat = 0;
    _egInfVHudApply();

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        lured: 0,
        bombs: [],
        deadline: performance.now() + EG_INFV_WINTER_TIME * _EG_INFV_DEBUG_MULT * 1000,
        fxRun: null, overlay: null, timerEl: null,
    };
    _egInfVFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Ice sheet overlay.
    const ice = document.createElement('div');
    ice.className = 'eg-infv-ice';
    document.body.appendChild(ice);
    g.fxRun.els.push(ice);

    // Countdown overlay (title + timer).
    const ov = document.createElement('div');
    ov.className = 'eg-infv-cd';
    ov.innerHTML =
        '<div class="eg-infv-cd-label">🌋❄️ SUPERVOLCANIC WINTER</div>' +
        '<div class="eg-infv-cd-timer">—</div>' +
        '<div class="eg-infv-cd-hint">Lure the magma surges into the fissure vents — blow the cap!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.fxRun.els.push(ov);

    _egNkToast('eg_mech_infv_final_cd', '🌋❄️ SUPERVOLCANIC WINTER — the arena freezes! Lure the surges!', '#93c5fd');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card inverts to ice while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('eg-infv-allin');

    const level = monster.level || 1;

    // Ice drift: the avatar keeps sliding after inputs stop (momentum).
    let lastPX = null, lastPY = null;
    let velX = 0, velY = 0;
    _egNkLoop(g.fxRun, (dtS) => {
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
            const held = (typeof _avatarMoveState !== 'undefined' && _avatarMoveState && _avatarMoveState.held && _avatarMoveState.held.size > 0);
            if (!held && (Math.abs(velX) > 6 || Math.abs(velY) > 6)) {
                const dec = Math.exp(-EG_INFV_DRIFT_DECAY * dtS);
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
        if (left <= 0) { _egInfVLastStand(g, monster, level); return false; }
        return true;
    });

    // ── One lure cycle: surge sweeps a fixed band → vent at its column. ──
    const runSurge = () => {
        if (g.finished) return;
        const idx = g.lured % 3;
        const bandY = H * EG_INFV_WINTER_SURGE_Y[idx];
        const ventX = W * EG_INFV_WINTER_VENT_X[idx];

        // Fissure vent telegraph (the lure target).
        const vent = _egNkEl(g.fxRun, 'div', 'eg-infv-fissure');
        vent.style.left = Math.round(ventX - 44) + 'px';
        vent.style.top = Math.round(bandY - 44) + 'px';

        // The surge: a slow blob crossing the band toward the vent.
        _egInfVAfter(g, 2200 * _EG_INFV_DEBUG_MULT, () => {
            if (g.finished) return;
            try { vent.remove(); } catch (e) {}
            const blob = _egNkEl(g.fxRun, 'div', 'eg-infv-surge-blob');
            const fromLeft = Math.random() < 0.5;
            let bx = fromLeft ? -60 : W + 60;
            const speed = 130;   // px/s (loop clock)
            _egNkLoop(g.fxRun, (dtS) => {
                if (g.finished) return false;
                bx += (fromLeft ? 1 : -1) * speed * dtS;
                blob.style.left = Math.round(bx - 60) + 'px';
                blob.style.top = Math.round(bandY - 44) + 'px';
                const pc = _egInfVPC();
                // Player contact: knocks the blob toward the vent (lure).
                if (Math.hypot(pc.x - bx, pc.y - bandY) < 70) {
                    // Standing in its path pushes it forward — the lure.
                    bx += (ventX > bx ? 1 : -1) * 240 * dtS;
                }
                // Reaches the vent column: DETONATE (blows the cap a bit).
                if (Math.abs(bx - ventX) < 30) {
                    try { blob.remove(); } catch (e) {}
                    g.lured++;
                    _egNkToast('eg_mech_infv_ventblow', '🌋💥 THE VENT BLOWS — ' + g.lured + '/' + EG_INFV_SURGE_GOAL + ' surges lured!', '#fde68a');
                    const flash = _egNkEl(g.fxRun, 'div', 'eg-infv-vent-flash');
                    flash.style.left = Math.round(ventX - 120) + 'px';
                    flash.style.top = Math.round(bandY - 120) + 'px';
                    _egInfVAfter(g, 900, () => { try { flash.remove(); } catch (e) {} });
                    if (g.lured >= EG_INFV_SURGE_GOAL) {
                        _egInfVCapBlown(g, monster);
                    } else {
                        _egInfVAfter(g, 1600 * _EG_INFV_DEBUG_MULT, runSurge);
                        _egInfVFallBombs(g, level, 2);
                    }
                    return false;
                }
                // Off-screen: missed lure — it loops around (no punish).
                if (bx < -80 || bx > W + 80) {
                    try { blob.remove(); } catch (e) {}
                    _egInfVAfter(g, 1200 * _EG_INFV_DEBUG_MULT, runSurge);
                    return false;
                }
                return true;
            });
        });
    };
    runSurge();

    // Magma bombs rain on a cadence throughout the winter.
    _egInfVFallBombs(g, level, 3);
    const bombClock = () => {
        if (g.finished) return;
        _egInfVFallBombs(g, level, 1);
        _egInfVAfter(g, 2800 * _EG_INFV_DEBUG_MULT, bombClock);
    };
    bombClock();
}

// Magma bombs: telegraphed landing rings; standing in one when it lands
// takes the hit.
function _egInfVFallBombs(g, level, n) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < n; i++) {
        const bx = W * (0.12 + Math.random() * 0.76);
        const by = H * (0.16 + Math.random() * 0.68);
        const warn = _egNkEl(g.fxRun, 'div', 'eg-infv-bomb-warn');
        warn.style.left = Math.round(bx - 40) + 'px';
        warn.style.top = Math.round(by - 40) + 'px';
        _egInfVAfter(g, 1100 * _EG_INFV_DEBUG_MULT, () => {
            if (g.finished) return;
            try { warn.remove(); } catch (e) {}
            const boom = _egNkEl(g.fxRun, 'div', 'eg-infv-bomb-boom');
            boom.style.left = Math.round(bx - 70) + 'px';
            boom.style.top = Math.round(by - 70) + 'px';
            const pc = _egInfVPC();
            if (Math.hypot(pc.x - bx, pc.y - by) < 40 + 12) {
                _egInfVTouch(EG_INFV_BOMB_HIT, level, 'Magma Bomb');
            }
            _egInfVAfter(g, 700, () => { try { boom.remove(); } catch (e) {} });
        });
    }
}

// The last stand: timer died — the core detonates everything but the vents.
function _egInfVLastStand(g, monster, level) {
    if (g.finished) return;
    _egNkToast('eg_mech_infv_laststand', '🌋💀 THE CORE DETONATES — get between the vents!', '#f87171');
    const W = window.innerWidth, H = window.innerHeight;
    const flash = _egNkEl(g.fxRun, 'div', 'eg-infv-laststand');
    flash.style.left = '0px'; flash.style.top = '0px';
    flash.style.width = W + 'px'; flash.style.height = H + 'px';
    _egInfVAfter(g, 1600 * _EG_INFV_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _egInfVPC();
        // Safe columns: near the fissure vent x positions.
        const safe = EG_INFV_WINTER_VENT_X.some(fx => Math.abs(pc.x - W * fx) < 90);
        if (!safe) {
            const dealt = _egNkHit(EG_INFV_LASTSTAND, 'fire', level);
            _egNkAbilityHitToast(dealt, 'The Inferno', 'Core Detonation');
        }
        _egInfVFinalEnd(g, monster);
    });
}

// Three surges lured: the cap blows — the core pays its own HP.
function _egInfVCapBlown(g, monster) {
    if (g.finished) return;
    _egNkToast('eg_mech_infv_capblown', '🌋💥 THE CAP BLOWS — Supervolcanic Winter ends in fire AND ice!', '#fde68a');
    const flash = document.createElement('div');
    flash.className = 'eg-infv-restart-flash';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1500);
    _egInfVFinalEnd(g, monster);
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _egDamageTargetById === 'function' && m.currentHP > 0) {
            _egDamageTargetById(g.monsterId, m.currentHP, ['fire'], {});
        }
    } catch (e) {}
    void monster;
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egInfVFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-infv-ice, .eg-infv-cd, .eg-infv-fissure, .eg-infv-surge-blob, ' +
        '.eg-infv-vent-flash, .eg-infv-bomb-warn, .eg-infv-bomb-boom, .eg-infv-laststand, ' +
        '.eg-infv-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-infv-allin');
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
// removes every run element, overlay and body state this boss ever created.
function _egInfVTeardown() {
    if (_egInfVFinal) { try { _egInfVFinalEnd(_egInfVFinal, null); } catch (e) {} _egInfVFinal = null; }
    if (_egInfVHeatRun) { try { _egNkKillRun(_egInfVHeatRun); } catch (e) {} _egInfVHeatRun = null; }
    _egInfVLavaZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _egInfVTiles.forEach(tl => { try { tl.el.remove(); } catch (e) {} });
    _egInfVHazes.forEach(h => { try { h.el.remove(); } catch (e) {} });
    _egInfVLavaZones = []; _egInfVTiles = []; _egInfVHazes = [];
    _egInfVHeat = 0;
    if (_egInfVHeatHudEl) { try { _egInfVHeatHudEl.remove(); } catch (e) {} _egInfVHeatHudEl = null; }
    document.querySelectorAll('.eg-infv-tide-warn, .eg-infv-lava, .eg-infv-tile, .eg-infv-ash, ' +
        '.eg-infv-wall, .eg-infv-surge-warn, .eg-infv-vent-warn, .eg-infv-jet, .eg-infv-haze, ' +
        '.eg-infv-ice, .eg-infv-cd, .eg-infv-fissure, .eg-infv-surge-blob, .eg-infv-vent-flash, ' +
        '.eg-infv-bomb-warn, .eg-infv-bomb-boom, .eg-infv-laststand, .eg-infv-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-boss_inferno');
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-infv-allin');
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_INFV_DEBUG.fire('tides'|'surge'|'vents'|'final') — run one now
//   _EG_INFV_DEBUG.heat(n)                               — set the meter by hand
if (typeof window !== 'undefined') {
    window._EG_INFV_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_inferno') : null;
            if (!monster) return 'no inferno alive';
            if (name === 'final') { _egInfVFinalStart(monster); return 'SUPERVOLCANIC WINTER started'; }
            const fn = name === 'tides' ? _egMechInfVTides
                : name === 'surge' ? _egMechInfVSurge
                : name === 'vents' ? _egMechInfVVents : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        heat: (n) => { _egInfVHeat = Math.max(0, Math.min(EG_INFV_HEAT_MAX, Number(n) || 0)); _egInfVHudApply(); return 'heat = ' + Math.round(_egInfVHeat); },
    };
}
