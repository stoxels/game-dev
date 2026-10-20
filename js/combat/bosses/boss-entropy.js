import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: ENTROPY (boss_entropy)--------------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Second Law": cold pools spread and merge while lit
// ORDERED ZONES shrink - zone time refills ORDER, outside it movement
// slows (never below 55%). Recursive Decay + Maxwell's Door from 60%,
// THE LAST DEGREE finale at ≤10%: deliver 5 shards or face HEAT DEATH.
//------------------------------------------------------------------------

// Prefix discipline: everything here is _entr / sx-entr- (the _ent stem
// collides with _enterBossArena elsewhere - do not shorten).

// DEBUG: slow Entropy's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _ENTR_DEBUG_SLOW = false;
export const _ENTR_DEBUG_MULT = _ENTR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_entropy: {
        id: 'boss_entropy', name: 'Entropy', emoji: '♾️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_entropy - "The Second Law" (rework)
    // Phase 1 (100% → 60%): Heat Death Drift teaches the order economy
    // Phase 2 ( 60% → 30%): immune window, Recursive Decay + Maxwell's Door
    // Phase 3 ( 30% →  0%): pools spread faster, zones shrink; at 10% the
    //                        LAST DEGREE begins
    boss_entropy: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'heat_death_drift', intervalBase: 19000, intervalVariance: 4000, handler: '_mechEntrDrift' },
            { name: 'recursive_decay', intervalBase: 21000, intervalVariance: 5000, handler: '_mechEntrDecay', phase2Only: true },
            { name: 'maxwells_door', intervalBase: 26000, intervalVariance: 6000, handler: '_mechEntrDoor', phase2Only: true },
        ],
        onPhaseEnter: _entrOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
export const ENTR_POOL_DPS    = 7;     // %maxHP/s standing in a cold pool
export const ENTR_POOL_LIFE   = 12;    // s a pool lingers (phase 3: 10)
export const ENTR_ZONE_LIFE   = 9;     // s an ordered zone stays lit
export const ENTR_ORDER_FILL  = 14;    // order/s inside a zone
export const ENTR_ORDER_DRAIN = 8;     // order/s outside zones (cold door: x2)
export const ENTR_SPEED_MIN   = 0.55;  // movement floor at 0 order (never locks)
export const ENTR_BURN_DPS    = 6;     // %maxHP/s while burning out a cursed cell
export const ENTR_CELL_SPREAD = 4;     // s between cell spreads
export const ENTR_CELL_LIFE   = 14;    // s a cursed cell survives
export const ENTR_DOOR_STATE  = 8000;  // ms of elemental state from a door
export const ENTR_SHARD_DMG   = 0.20;  // boss maxHP per delivered shard
export const ENTR_SHARDS      = 5;     // shards to restart the universe
export const ENTR_FINAL_TIME  = 32;    // s before HEAT DEATH
export const ENTR_HEATDEATH   = 0.35;  // caught in the wave
export const ENTR_SINGULAR_R  = 150;   // safe radius around the singularity
export const ENTR_HIT_CD_MS   = 700;   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------ORDER ECONOMY (shared state)--------------------------
//------------------------------------------------------------------------
// Zones and pools live in module state so the drift cast (spawner), the
// order watcher (ticker) and the finale (cleaner) all share one truth.
export let _entrZones = [];    // { x, y, r, el, until }
export let _entrPools = [];    // { x, y, r, el, until, dps }
export let _entrCells = [];    // { x, y, el, born, dead }
export let _entrOrderRun = null;
export let _entrOrder = 100;   // 0..100 - the personal order meter
export let _entrHotUntil = 0;  // Maxwell hot-state deadline (perf.now ms)
export let _entrColdUntil = 0;
export let _entrHotAuraTimer = 0;
export let _entrColdAuraTimer = 0;

// Movement hook (called from _avatarGetMoveSpeed in player_sprite.js,
// typeof-guarded there - same pattern as _snailBroomHeld). Perfect
// crystal during the finale: absolute zero is perfect order.
export function _entrMoveMult() {
    if (_entrFinalActive()) return 1;
    return ENTR_SPEED_MIN + (1 - ENTR_SPEED_MIN) * (_entrOrder / 100);
}

export function _entrHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (globalThis.playerCurrentHP <= 0) return;
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(amount) : (amount)));
        if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    } catch (e) {}
}

// Player centre with a screen-centre fallback.
export function _entrPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Touch damage helper shared by all Entropy hazards (per-touch cooldown).
export let _entrHitCd = 0;
export function _entrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _entrHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _entrHitCd = now + ENTR_HIT_CD_MS;
    const dealt = _nkHit(pct, 'cold', level);
    _nkAbilityHitToast(dealt, 'Entropy', label);
    return true;
}

// The order meter HUD (bottom-centre; the boss cards own the top).
export let _entrHudEl = null;
export function _entrHudApply() {
    if (!_entrHudEl) {
        _entrHudEl = document.createElement('div');
        _entrHudEl.className = 'sx-entr-order';
        _entrHudEl.innerHTML =
            '<div class="sx-entr-order-fill"></div>' +
            '<div class="sx-entr-order-label">ORDER</div>';
        document.body.appendChild(_entrHudEl);
    }
    _entrHudEl.style.setProperty('--entr-order', String(Math.round(_entrOrder)));
    _entrHudEl.classList.toggle('sx-entr-order-low', _entrOrder < 30);
}

// The passive watcher: expires zones/pools/cells, ticks pool DoT and the
// order meter. Created lazily by the first cast and re-created after the
// finale's kill-other-runs sweep, so it lives until the boss dies.
export function _entrEnsureOrderRun(monster) {
    if (_entrOrderRun && _nkRuns.has(_entrOrderRun.id)) return;
    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    _entrOrderRun = run;
    const level = (monster && monster.level) || 1;
    _nkLoop(run, (dtS, now) => {
        // Expiry sweep (always - even during the finale, cells must age out).
        const t = now;
        _entrZones = _entrZones.filter(z => { if (t >= z.until) { try { z.el.remove(); } catch (e) {} return false; } return true; });
        _entrPools = _entrPools.filter(p => { if (t >= p.until) { try { p.el.remove(); } catch (e) {} return false; } return true; });
        _entrCells = _entrCells.filter(c => { if (c.dead || t - c.born >= ENTR_CELL_LIFE * 1000 * _ENTR_DEBUG_MULT) { c.dead = true; try { c.el.remove(); } catch (e) {} return false; } return true; });

        // Burn-out lives HERE (the always-alive watcher), so standing on a
        // cell burns it out during the finale's frozen rain too, not just
        // while the decay cast is running.
        const pc0 = _entrPC();
        for (const c of _entrCells) {
            if (c.dead) continue;
            if (Math.hypot(pc0.x - c.x, pc0.y - c.y) < 32) {
                _nkDotTick(run, ENTR_BURN_DPS, dtS, level, 'cold');
                c.burn += dtS;
                c.el.classList.add('sx-entr-cell-burning');
                if (c.burn >= 0.9) {
                    c.dead = true;
                    try { c.el.remove(); } catch (e) {}
                    _nkToast('eg_mech_entr_decay_out', '♾️🔥 Cell burned out!', '#fbbf24');
                }
            } else if (c.burn > 0) {
                c.burn = 0;
                c.el.classList.remove('sx-entr-cell-burning');
            }
        }

        // The Last Degree: the lattice protects - no meter, no pool DoT.
        if (_entrFinalActive()) { _entrOrder = 100; return true; }

        const pc = _entrPC();
        const inZone = _entrZones.some(z => Math.hypot(pc.x - z.x, pc.y - z.y) < z.r);
        const inPool = _entrPools.find(p => Math.hypot(pc.x - p.x, pc.y - p.y) < p.r + 10);

        if (inPool) {
            const hot = now < _entrHotUntil;
            const cold = now < _entrColdUntil;
            if (hot) {
                // Maxwell's fire: pools heal instead of harm.
                _entrHeal(_nkMaxHP() * 0.04 * dtS);
            } else if (!cold && !inZone) {
                _nkDotTick(run, ENTR_POOL_DPS, dtS, level, 'cold');
            }
        }

        if (inZone) {
            if (now >= _entrHotUntil) _entrOrder = Math.min(100, _entrOrder + ENTR_ORDER_FILL * dtS);
            // Hot state scatters order: zones stop refilling while it lasts.
        } else {
            const drain = ENTR_ORDER_DRAIN * (now < _entrColdUntil ? 2 : 1);
            _entrOrder = Math.max(0, _entrOrder - drain * dtS);
        }
        _entrHudApply();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: HEAT DEATH DRIFT (all fight)---------------
//------------------------------------------------------------------------
// Cold pools bloom outward and MERGE when they touch; each cast also
// plants a lit ordered zone (smaller as the pools grow). Standing in a
// zone = protection + order refill; pools drain %HP/s.
export const ENTR_DRIFT_BLOOMS = [0, 2, 2, 3];  // blooms per cast, by phase
export const ENTR_POOL_R       = 95;            // base pool radius
export const ENTR_BLOOM_MS     = 900;           // telegraph before eruption

export function _mechEntrDrift(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    void level;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_entr_drift', '♾️❄️ HEAT DEATH DRIFT - the cold spreads! Find the lit zones!', '#93c5fd');
    _entrEnsureOrderRun(monster);

    const poolLife = (p >= 3 ? ENTR_POOL_LIFE - 2 : ENTR_POOL_LIFE) * _ENTR_DEBUG_MULT * 1000;
    const zoneLife = ENTR_ZONE_LIFE * _ENTR_DEBUG_MULT * 1000;

    // Blooms ride the loop clock (pause-safe - no bare setTimeout).
    const blooms = [];
    for (let i = 0; i < ENTR_DRIFT_BLOOMS[p]; i++) {
        blooms.push({
            x: W * (0.14 + Math.random() * 0.72),
            y: H * (0.18 + Math.random() * 0.64),
            eruptAt: ENTR_BLOOM_MS * _ENTR_DEBUG_MULT + i * 260,
            warnEl: null, done: false,
        });
    }

    let t = 0;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;
        for (const b of blooms) {
            if (b.done) continue;
            pending = true;
            if (t >= b.eruptAt) {
                b.done = true;
                if (b.warnEl) { try { b.warnEl.remove(); } catch (e) {} b.warnEl = null; }
                _entrSpawnPool(b.x, b.y, ENTR_POOL_R + p * 8, poolLife);
                _entrSpawnZone(W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.6), zoneLife);
            } else if (!b.warnEl) {
                b.warnEl = _nkEl(run, 'div', 'sx-entr-bloom-warn');
                b.warnEl.style.left = Math.round(b.x - 60) + 'px';
                b.warnEl.style.top = Math.round(b.y - 60) + 'px';
            }
        }
        return pending;
    });
}

// Spawn a pool; if it overlaps an existing one, MERGE into a bigger pool
// (real entropy - the cold consolidates instead of multiplying).
export function _entrSpawnPool(x, y, r, lifeMs) {
    const near = _entrPools.find(q => Math.hypot(q.x - x, q.y - y) < q.r + r - 24);
    if (near) {
        const tot = near.r + r;
        const nx = (near.x * near.r + x * r) / tot;
        const ny = (near.y * near.r + y * r) / tot;
        const nr = Math.min(170, Math.sqrt(near.r * near.r + r * r) * 1.05);
        const until = Math.max(near.until, performance.now() + lifeMs);
        try { near.el.remove(); } catch (e) {}
        _entrPools = _entrPools.filter(q => q !== near);
        _entrSpawnPool(nx, ny, nr, until - performance.now());
        return;
    }
    const el = document.createElement('div');
    el.className = 'sx-entr-pool';
    const d = Math.round(r * 2);
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    document.body.appendChild(el);
    _entrPools.push({ x, y, r, el, until: performance.now() + lifeMs, dps: ENTR_POOL_DPS });
}

export function _entrSpawnZone(x, y, lifeMs) {
    // Zones shrink as the cold consolidates: more pools → smaller refuge.
    const r = Math.max(55, 92 - _entrPools.length * 4);
    const el = document.createElement('div');
    el.className = 'sx-entr-zone';
    const d = Math.round(r * 2);
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    document.body.appendChild(el);
    _entrZones.push({ x, y, r, el, until: performance.now() + lifeMs });
}


//------------------------------------------------------------------------
//-------------------ACT II: RECURSIVE DECAY (60%)-------------------------
//------------------------------------------------------------------------
// Cursed cells AGE: every 4s each living cell spreads decay to an
// orthogonal neighbour (cap 9). Stand on a cell to burn it out - the burn
// costs a cold DoT while you stand there.
export const ENTR_DECAY_SEEDS = [0, 3, 3, 5];   // cells seeded per cast, by phase
export const ENTR_CELL_CAP    = 9;

export function _mechEntrDecay(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_entr_decay', '♾️🦠 RECURSIVE DECAY - the cells spread! Stand on them to burn them out!', '#86efac');
    _entrEnsureOrderRun(monster);

    for (let i = 0; i < ENTR_DECAY_SEEDS[p]; i++) {
        _entrSpawnCell(W * (0.12 + Math.random() * 0.76), H * (0.16 + Math.random() * 0.68));
    }

    let spreadAcc = 0;
    _nkLoop(run, (dtS) => {
        // Spread: every ENTR_CELL_SPREAD seconds, living cells propagate.
        // (Burn-out lives in the order watcher so it works in every state.)
        spreadAcc += dtS;
        if (spreadAcc >= ENTR_CELL_SPREAD) {
            spreadAcc = 0;
            const alive = _entrCells.filter(c => !c.dead);
            if (alive.length && alive.length < ENTR_CELL_CAP) {
                const src = alive[Math.floor(Math.random() * alive.length)];
                const dirs = [[64, 0], [-64, 0], [0, 64], [0, -64]];
                const d = dirs[Math.floor(Math.random() * dirs.length)];
                _entrSpawnCell(src.x + d[0], src.y + d[1]);
            }
        }
        return _entrCells.some(c => !c.dead);
    });
}

export function _entrSpawnCell(x, y) {
    if (_entrCells.filter(c => !c.dead).length >= ENTR_CELL_CAP) return;
    const el = document.createElement('div');
    el.className = 'sx-entr-cell';
    el.style.left = Math.round(x - 23) + 'px';
    el.style.top = Math.round(y - 23) + 'px';
    document.body.appendChild(el);
    _entrCells.push({ x, y, el, born: performance.now(), dead: false, burn: 0 });
}


//------------------------------------------------------------------------
//-------------------ACT II: MAXWELL'S DOOR (60%)--------------------------
//------------------------------------------------------------------------
// A hot door and a cold door at opposite edges. Entering one applies the
// element for 8s (one use each): HOT = pools heal you (zones stop
// refilling), COLD = pool-proof (order drains twice as fast).
export function _mechEntrDoor(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    void phase;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_entr_door', '♾️🚪 MAXWELL\u2019S DOOR - choose your element, pay its price!', '#fdba74');

    const y = H * (0.3 + Math.random() * 0.4);
    const hot = _nkEl(run, 'div', 'sx-entr-door sx-entr-door-hot', '🔥');
    hot.style.left = Math.round(W * 0.08 - 34) + 'px';
    hot.style.top = Math.round(y - 52) + 'px';
    const cold = _nkEl(run, 'div', 'sx-entr-door sx-entr-door-cold', '❄️');
    cold.style.left = Math.round(W * 0.92 - 34) + 'px';
    cold.style.top = Math.round(H - y - 52) + 'px';

    let t = 0;
    const lifeMs = 9000 * _ENTR_DEBUG_MULT;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pc = _entrPC();
        performance.now();
        if (Math.hypot(pc.x - W * 0.08, pc.y - y) < 50) {
            _entrApplyHot();
            return false;
        }
        if (Math.hypot(pc.x - W * 0.92, pc.y - (H - y)) < 50) {
            _entrApplyCold();
            return false;
        }
        if (t >= lifeMs) return false;
        return true;
    });
}

export function _entrApplyHot() {
    _entrHotUntil = performance.now() + ENTR_DOOR_STATE * _ENTR_DEBUG_MULT;
    _nkToast('eg_mech_entr_hot', '🔥 FIRE-STATE - cold pools heal you, but heat scatters order!', '#fdba74');
    _entrAura('sx-entr-hot-aura', 'hot');
}

export function _entrApplyCold() {
    _entrColdUntil = performance.now() + ENTR_DOOR_STATE * _ENTR_DEBUG_MULT;
    _nkToast('eg_mech_entr_cold', '❄️ COLD-STATE - pool-proof, but order drains twice as fast!', '#93c5fd');
    _entrAura('sx-entr-cold-aura', 'cold');
}

export function _entrAura(cls, which) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    const other = which === 'hot' ? 'sx-entr-cold-aura' : 'sx-entr-hot-aura';
    el.classList.remove(other);
    el.classList.add(cls);
    if (which === 'hot') {
        clearTimeout(_entrHotAuraTimer);
        _entrHotAuraTimer = setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, ENTR_DOOR_STATE * _ENTR_DEBUG_MULT);
    } else {
        clearTimeout(_entrColdAuraTimer);
        _entrColdAuraTimer = setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, ENTR_DOOR_STATE * _ENTR_DEBUG_MULT);
    }
}


//------------------------------------------------------------------------
//-------------------FINALE: THE LAST DEGREE (≤10%, one-shot)--------------
//------------------------------------------------------------------------
// Absolute zero approaches: the arena becomes one frozen lattice (perfect
// order - full movement speed). ORDER SHARDS rain in telegraphed volleys;
// each touched shard's spark flies to the central singularity and pops the
// boss for 20% of ITS maxHP through the canonical damage path. 5 shards =
// the universe restarts (the kill). Timer fail = HEAT DEATH wave.
export const ENTR_SHARD_LIFE = 7;      // s a landed shard waits
export const ENTR_SHARD_WARN = 750;    // ms telegraph

// Set while the finale runs (read by _tickPlayer's charge-freeze gate
// and by _entrMoveMult).
export let _entrFinal = null;

export function _entrFinalActive() {
    return !!_entrFinal && !_entrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _entrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _entrStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _entrStartFinalWatcher(monster) {
    if (!monster || _entrFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_entrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _entrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _entrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_entrFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _entrFinalStart(monster) {
    if (_entrFinal || !monster) return;

    // The lattice takes over: kill every other run of this boss, then
    // rebuild the order watcher so cells/pools keep aging out cleanly.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    _entrOrderRun = null;

    // Clean slate: the frozen lattice replaces the drift battlefield.
    _entrZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _entrPools.forEach(p => { try { p.el.remove(); } catch (e) {} });
    _entrCells.forEach(c => { try { c.el.remove(); } catch (e) {} });
    _entrZones = []; _entrPools = []; _entrCells = [];
    _entrOrder = 100;

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const g = {
        monsterId: monster.id,
        finished: false,
        delivered: 0,
        deadline: performance.now() + ENTR_FINAL_TIME * _ENTR_DEBUG_MULT * 1000,
        fxRun: null, overlay: null, singularity: null, timerEl: null,
    };
    _entrFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Frozen lattice overlay + singularity.
    const lattice = document.createElement('div');
    lattice.className = 'sx-entr-lattice';
    document.body.appendChild(lattice);
    g.fxRun.els.push(lattice);

    const sing = document.createElement('div');
    sing.className = 'sx-entr-singularity';
    sing.style.left = Math.round(cx - 64) + 'px';
    sing.style.top = Math.round(cy - 64) + 'px';
    document.body.appendChild(sing);
    g.singularity = sing;
    g.fxRun.els.push(sing);

    // Countdown overlay (title + live timer).
    const ov = document.createElement('div');
    ov.className = 'sx-entr-cd';
    ov.innerHTML =
        '<div class="sx-entr-cd-label">♾️ THE LAST DEGREE</div>' +
        '<div class="sx-entr-cd-timer">-</div>' +
        '<div class="sx-entr-cd-hint">Collect the shards - carry the sparks to the singularity!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.timerEl = ov.querySelector('.sx-entr-cd-timer');
    g.fxRun.els.push(ov);

    _nkToast('eg_mech_entr_final_cd', '♾️💀 THE LAST DEGREE - gather the shards before absolute zero!', '#93c5fd');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card freezes over while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-entr-allin');

    const level = monster.level || 1;

    // Rebuild the order watcher (post-purge) so stray cells/pools age out.
    _entrEnsureOrderRun(monster);

    // ── Shard spawning (one unified path: initial drop, re-drops after a
    // lost shard, and follow-ups after a delivery all come through here). ──
    const spawnShard = () => {
        if (g.finished) return;
        const sx = W * (0.12 + Math.random() * 0.76);
        const sy = H * (0.16 + Math.random() * 0.68);

        const warn = _nkEl(g.fxRun, 'div', 'sx-entr-shard-warn');
        warn.style.left = Math.round(sx - 30) + 'px';
        warn.style.top = Math.round(sy - 30) + 'px';

        _entrAfter(g, ENTR_SHARD_WARN * _ENTR_DEBUG_MULT, () => {
            if (g.finished) return;
            try { warn.remove(); } catch (e) {}
            const shard = _nkEl(g.fxRun, 'div', 'sx-entr-shard', '✨');
            shard.style.left = Math.round(sx - 22) + 'px';
            shard.style.top = Math.round(sy - 22) + 'px';

            let life = 0;
            _nkLoop(g.fxRun, (dtS) => {
                if (g.finished) return false;
                life += dtS;
                const pc = _entrPC();
                if (Math.hypot(pc.x - sx, pc.y - sy) < 40) {
                    _entrDeliver(g, monster, sx, sy, level);
                    return false;
                }
                if (life >= ENTR_SHARD_LIFE * _ENTR_DEBUG_MULT) {
                    // Lost shard: it dissolves - another falls after a beat.
                    _entrAfter(g, 700 * _ENTR_DEBUG_MULT, spawnShard);
                    return false;
                }
                return true;
            });
        });
    };

    // ── The HEAT DEATH clock. ────────────────────────────────────────────
    const tickTimer = () => {
        if (g.finished) return;
        const left = g.deadline - performance.now();
        if (g.timerEl) g.timerEl.textContent = Math.max(0, Math.ceil(left / 1000)) + 's';
        if (left <= 0) { _entrHeatDeath(g, monster, level); return; }
        _entrAfter(g, 250, tickTimer);
    };
    tickTimer();

    // Interference: cursed cells still rain (frozen, they just sit there -
    // standing on them still burns them out, and they never spread).
    const rainCells = () => {
        if (g.finished) return;
        _entrSpawnCell(W * (0.12 + Math.random() * 0.76), H * (0.16 + Math.random() * 0.68));
        _entrAfter(g, 6000 * _ENTR_DEBUG_MULT, rainCells);
    };
    rainCells();

    spawnShard();
    // Let the delivery path re-enter the unified spawner for follow-ups.
    _entrSpawnShardFn = spawnShard;
}

// A shard was touched: its spark flies to the singularity, then the boss
// takes a 20% pop through the canonical damage path.
export function _entrDeliver(g, monster, sx, sy, level) {
    if (g.finished) return;
    void level;
    const W = window.innerWidth, H = window.innerHeight;

    const spark = document.createElement('div');
    spark.className = 'sx-entr-spark';
    spark.style.left = Math.round(sx - 16) + 'px';
    spark.style.top = Math.round(sy - 16) + 'px';
    spark.style.setProperty('--fly-dx', Math.round((W / 2 - sx)) + 'px');
    spark.style.setProperty('--fly-dy', Math.round((H / 2 - sy)) + 'px');
    document.body.appendChild(spark);
    setTimeout(() => { try { spark.remove(); } catch (e) {} }, 1300 * _ENTR_DEBUG_MULT);

    _nkToast('eg_mech_entr_shard', '♾️✨ Shard ' + (g.delivered + 1) + '/' + ENTR_SHARDS + ' delivered - the singularity stirs!', '#fde68a');

    _entrAfter(g, 1150 * _ENTR_DEBUG_MULT, () => {
        if (g.finished) return;
        g.delivered++;
        // Staggered damage pop on the boss - canonical path so resistances,
        // phase checks and the death flow all apply.
        try {
            const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
            if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
                _damageTargetById(g.monsterId, m.maxHP * ENTR_SHARD_DMG, ['cold'], {});
            }
        } catch (e) {}
        // The boss card flares as each shard lands.
        const card = document.getElementById('sx-card-' + g.monsterId);
        const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
        if (wrap) {
            wrap.classList.remove('sx-entr-hit');
            void wrap.offsetWidth;
            wrap.classList.add('sx-entr-hit');
        }
        if (g.delivered >= ENTR_SHARDS) {
            _entrRestart(g, monster);
        } else {
            _entrAfter(g, 600 * _ENTR_DEBUG_MULT, () => {
                if (!g.finished) _entrDropNext(g, monster);
            });
        }
    });
}

// Follow-up shard after a delivery (the unified spawner lives in
// _entrFinalStart as `spawnShard`; this thin re-entry keeps the delivery
// path simple).
export let _entrSpawnShardFn = null;
export function _entrDropNext(g, monster) {
    if (g.finished || !_entrSpawnShardFn) return;
    _entrSpawnShardFn(g, monster);
}

// Timer failure: HEAT DEATH - a full-screen slow wave; only the singularity
// centre is safe.
export function _entrHeatDeath(g, monster, level) {
    if (g.finished) return;
    _nkToast('eg_mech_entr_heatdeath', '♾️💀 HEAT DEATH! The wave takes everything but the centre!', '#f87171');
    const wave = document.createElement('div');
    wave.className = 'sx-entr-heatwave';
    const W = window.innerWidth, H = window.innerHeight;
    wave.style.left = Math.round(W / 2) + 'px';
    wave.style.top = Math.round(H / 2) + 'px';
    document.body.appendChild(wave);
    g.fxRun.els.push(wave);

    _entrAfter(g, 2200 * _ENTR_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _entrPC();
        if (Math.hypot(pc.x - W / 2, pc.y - H / 2) > ENTR_SINGULAR_R) {
            const dealt = _nkHit(ENTR_HEATDEATH, 'cold', level);
            _nkAbilityHitToast(dealt, 'Entropy', 'Heat Death');
        }
        // The wave lands, the universe keeps winding down - resume the fight.
        _entrFinalEnd(g, monster);
    });
}

// Success: the fifth shard re-ignites the universe - the boss pays its own
// remaining HP (through the canonical path, immunity already released).
export function _entrRestart(g, monster) {
    if (g.finished) return;
    _nkToast('eg_mech_entr_spark', '♾️💥 THE UNIVERSE RESTARTS - Entropy gave everything one last spark!', '#fde68a');
    const flash = document.createElement('div');
    flash.className = 'sx-entr-restart-flash';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1400);
    _entrFinalEnd(g, monster);
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
            _damageTargetById(g.monsterId, m.currentHP, ['cold'], {});
        }
    } catch (e) {}
    void monster;
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _entrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-entr-lattice, .sx-entr-singularity, .sx-entr-cd, ' +
        '.sx-entr-shard-warn, .sx-entr-shard, .sx-entr-heatwave, .sx-entr-spark').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-entr-allin');
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
export function _entrTeardown() {
    if (_entrFinal) { try { _entrFinalEnd(_entrFinal, null); } catch (e) {} _entrFinal = null; }
    if (_entrOrderRun) { try { _nkKillRun(_entrOrderRun); } catch (e) {} _entrOrderRun = null; }
    _entrZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _entrPools.forEach(p => { try { p.el.remove(); } catch (e) {} });
    _entrCells.forEach(c => { try { c.el.remove(); } catch (e) {} });
    _entrZones = []; _entrPools = []; _entrCells = [];
    _entrOrder = 100;
    _entrHotUntil = 0; _entrColdUntil = 0;
    if (_entrHudEl) { try { _entrHudEl.remove(); } catch (e) {} _entrHudEl = null; }
    document.querySelectorAll('.sx-entr-bloom-warn, .sx-entr-pool, .sx-entr-zone, .sx-entr-cell, ' +
        '.sx-entr-door, .sx-entr-shard-warn, .sx-entr-shard, .sx-entr-spark, .sx-entr-heatwave, ' +
        '.sx-entr-lattice, .sx-entr-singularity, .sx-entr-cd, .sx-entr-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (avatar) avatar.classList.remove('sx-entr-hot-aura', 'sx-entr-cold-aura');
    const card = document.getElementById('sx-card-boss_entropy');
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-entr-allin', 'sx-entr-hit');
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _ENTR_DEBUG.fire('drift'|'decay'|'door'|'final') - run one now
//   _ENTR_DEBUG.order(n)                             - set the meter by hand
if (typeof window !== 'undefined') {
    window._ENTR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_entropy') : null;
            if (!monster) return 'no entropy alive';
            const fn = name === 'drift' ? _mechEntrDrift
                : name === 'decay' ? _mechEntrDecay
                : name === 'door' ? _mechEntrDoor : null;
            if (name !== 'drift' && !fn) {
                if (name === 'final') { _entrFinalStart(monster); return 'THE LAST DEGREE started'; }
                return 'unknown: ' + name;
            }
            if (fn && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        order: (n) => { _entrOrder = Math.max(0, Math.min(100, Number(n) || 0)); _entrHudApply(); return 'order = ' + Math.round(_entrOrder); },
    };
}
