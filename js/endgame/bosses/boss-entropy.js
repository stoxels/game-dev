//------------------------------------------------------------------------
//-------------------BOSS: ENTROPY (boss_entropy)--------------------------
//------------------------------------------------------------------------
// TIER 7 REWORK — "The Second Law". Everything winds down; ORDER is a
// resource you spend. Entropy attacks the arena itself: cold pools spread
// and merge (real entropy, not just more circles) while the lit ORDERED
// ZONES — the only places that keep you crisp — keep shrinking. Element:
// cold (unchanged).
//   • HEAT DEATH DRIFT (signature, all fight) — cold pools bloom outward
//     and MERGE into bigger ones when they touch; each cast also plants a
//     lit ordered zone that shrinks as the pools grow. Pools drain %HP/s;
//     standing in an ordered zone protects you and refills your ORDER —
//     outside the zones your movement turns progressively sluggish (never
//     fully locked; floors at 55%). Order is the resource: zone time in,
//     crisp movement out.
//   • RECURSIVE DECAY (60%) — cursed cells now AGE: every 4s a corrupted
//     cell spreads decay to an orthogonal neighbour (cap 9 cells). Stand
//     ON a cell to burn it out — but burning costs a cold DoT while you
//     stand there. Triage: burn the pack before it spreads across the map.
//   • MAXWELL'S DOOR (60%) — a 🔥 hot door and a ❄ cold door spawn at
//     opposite edges; entering one applies that element to you for 8s
//     (one use each). HOT: cold pools HEAL you instead of harming (but
//     heat scatters order — zones stop refilling). COLD: pool-proof (but
//     cold stiffens — order drains twice as fast). Voluntary swap, real
//     trade — entropy as choice, not sentence.
//   • ♾️ THE LAST DEGREE (≤10%, one-shot finale) — absolute zero approaches:
//     all decay pauses, the arena becomes one frozen lattice (perfect
//     order — full movement speed) with only the central SINGULARITY lit.
//     Shattered ORDER SHARDS rain in telegraphed volleys — touch a shard
//     and its spark flies to the singularity: each delivered shard is a
//     staggered 20% damage pop on the boss THROUGH the canonical damage
//     path. Collect 5 before the timer dies and the universe restarts —
//     the finale IS the kill. Fail the timer → HEAT DEATH: a full-screen
//     slow wave with only the singularity centre safe (35%). Charge bar
//     frozen (gate in _egTickPlayer via _egEntrFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Prefix discipline: everything here is _egEntr / eg-entr- (the _egEnt stem
// collides with _egEnterBossArena elsewhere — do not shorten).
//------------------------------------------------------------------------

// DEBUG: slow Entropy's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_ENTR_DEBUG_SLOW = true;
const _EG_ENTR_DEBUG_MULT = _EG_ENTR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_entropy: {
        id: 'boss_entropy', name: 'Entropy', emoji: '♾️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_entropy — "The Second Law" (rework)
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
            { name: 'heat_death_drift', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechEntrDrift' },
            { name: 'recursive_decay', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechEntrDecay', phase2Only: true },
            { name: 'maxwells_door', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechEntrDoor', phase2Only: true },
        ],
        onPhaseEnter: _egEntrOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
const EG_ENTR_POOL_DPS    = 7;     // %maxHP/s standing in a cold pool
const EG_ENTR_POOL_LIFE   = 12;    // s a pool lingers (phase 3: 10)
const EG_ENTR_ZONE_LIFE   = 9;     // s an ordered zone stays lit
const EG_ENTR_ORDER_FILL  = 14;    // order/s inside a zone
const EG_ENTR_ORDER_DRAIN = 8;     // order/s outside zones (cold door: x2)
const EG_ENTR_SPEED_MIN   = 0.55;  // movement floor at 0 order (never locks)
const EG_ENTR_BURN_DPS    = 6;     // %maxHP/s while burning out a cursed cell
const EG_ENTR_CELL_SPREAD = 4;     // s between cell spreads
const EG_ENTR_CELL_LIFE   = 14;    // s a cursed cell survives
const EG_ENTR_DOOR_STATE  = 8000;  // ms of elemental state from a door
const EG_ENTR_SHARD_DMG   = 0.20;  // boss maxHP per delivered shard
const EG_ENTR_SHARDS      = 5;     // shards to restart the universe
const EG_ENTR_FINAL_TIME  = 32;    // s before HEAT DEATH
const EG_ENTR_HEATDEATH   = 0.35;  // caught in the wave
const EG_ENTR_SINGULAR_R  = 150;   // safe radius around the singularity
const EG_ENTR_HIT_CD_MS   = 700;   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------ORDER ECONOMY (shared state)--------------------------
//------------------------------------------------------------------------
// Zones and pools live in module state so the drift cast (spawner), the
// order watcher (ticker) and the finale (cleaner) all share one truth.
let _egEntrZones = [];    // { x, y, r, el, until }
let _egEntrPools = [];    // { x, y, r, el, until, dps }
let _egEntrCells = [];    // { x, y, el, born, dead }
let _egEntrOrderRun = null;
let _egEntrOrder = 100;   // 0..100 — the personal order meter
let _egEntrHotUntil = 0;  // Maxwell hot-state deadline (perf.now ms)
let _egEntrColdUntil = 0;
let _egEntrHotAuraTimer = 0;
let _egEntrColdAuraTimer = 0;

// Movement hook (called from _avatarGetMoveSpeed in player_sprite.js,
// typeof-guarded there — same pattern as _egSnailBroomHeld). Perfect
// crystal during the finale: absolute zero is perfect order.
function _egEntrMoveMult() {
    if (_egEntrFinalActive()) return 1;
    return EG_ENTR_SPEED_MIN + (1 - EG_ENTR_SPEED_MIN) * (_egEntrOrder / 100);
}

function _egEntrHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (playerCurrentHP <= 0) return;
        const before = playerCurrentHP;
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + amount);
        if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    } catch (e) {}
}

// Player centre with a screen-centre fallback.
function _egEntrPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Touch damage helper shared by all Entropy hazards (per-touch cooldown).
let _egEntrHitCd = 0;
function _egEntrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egEntrHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egEntrHitCd = now + EG_ENTR_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'cold', level);
    _egNkAbilityHitToast(dealt, 'Entropy', label);
    return true;
}

// The order meter HUD (bottom-centre; the boss cards own the top).
let _egEntrHudEl = null;
function _egEntrHudApply() {
    if (!_egEntrHudEl) {
        _egEntrHudEl = document.createElement('div');
        _egEntrHudEl.className = 'eg-entr-order';
        _egEntrHudEl.innerHTML =
            '<div class="eg-entr-order-fill"></div>' +
            '<div class="eg-entr-order-label">ORDER</div>';
        document.body.appendChild(_egEntrHudEl);
    }
    _egEntrHudEl.style.setProperty('--entr-order', String(Math.round(_egEntrOrder)));
    _egEntrHudEl.classList.toggle('eg-entr-order-low', _egEntrOrder < 30);
}

// The passive watcher: expires zones/pools/cells, ticks pool DoT and the
// order meter. Created lazily by the first cast and re-created after the
// finale's kill-other-runs sweep, so it lives until the boss dies.
function _egEntrEnsureOrderRun(monster) {
    if (_egEntrOrderRun && _egNkRuns.has(_egEntrOrderRun.id)) return;
    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    _egEntrOrderRun = run;
    const level = (monster && monster.level) || 1;
    _egNkLoop(run, (dtS, now) => {
        // Expiry sweep (always — even during the finale, cells must age out).
        const t = now;
        _egEntrZones = _egEntrZones.filter(z => { if (t >= z.until) { try { z.el.remove(); } catch (e) {} return false; } return true; });
        _egEntrPools = _egEntrPools.filter(p => { if (t >= p.until) { try { p.el.remove(); } catch (e) {} return false; } return true; });
        _egEntrCells = _egEntrCells.filter(c => { if (c.dead || t - c.born >= EG_ENTR_CELL_LIFE * 1000 * _EG_ENTR_DEBUG_MULT) { c.dead = true; try { c.el.remove(); } catch (e) {} return false; } return true; });

        // Burn-out lives HERE (the always-alive watcher), so standing on a
        // cell burns it out during the finale's frozen rain too, not just
        // while the decay cast is running.
        const pc0 = _egEntrPC();
        for (const c of _egEntrCells) {
            if (c.dead) continue;
            if (Math.hypot(pc0.x - c.x, pc0.y - c.y) < 32) {
                _egNkDotTick(run, EG_ENTR_BURN_DPS, dtS, level, 'cold');
                c.burn += dtS;
                c.el.classList.add('eg-entr-cell-burning');
                if (c.burn >= 0.9) {
                    c.dead = true;
                    try { c.el.remove(); } catch (e) {}
                    _egNkToast('eg_mech_entr_decay_out', '♾️🔥 Cell burned out!', '#fbbf24');
                }
            } else if (c.burn > 0) {
                c.burn = 0;
                c.el.classList.remove('eg-entr-cell-burning');
            }
        }

        // The Last Degree: the lattice protects — no meter, no pool DoT.
        if (_egEntrFinalActive()) { _egEntrOrder = 100; return true; }

        const pc = _egEntrPC();
        const inZone = _egEntrZones.some(z => Math.hypot(pc.x - z.x, pc.y - z.y) < z.r);
        const inPool = _egEntrPools.find(p => Math.hypot(pc.x - p.x, pc.y - p.y) < p.r + 10);

        if (inPool) {
            const hot = now < _egEntrHotUntil;
            const cold = now < _egEntrColdUntil;
            if (hot) {
                // Maxwell's fire: pools heal instead of harm.
                _egEntrHeal(_egNkMaxHP() * 0.04 * dtS);
            } else if (!cold && !inZone) {
                _egNkDotTick(run, EG_ENTR_POOL_DPS, dtS, level, 'cold');
            }
        }

        if (inZone) {
            if (now >= _egEntrHotUntil) _egEntrOrder = Math.min(100, _egEntrOrder + EG_ENTR_ORDER_FILL * dtS);
            // Hot state scatters order: zones stop refilling while it lasts.
        } else {
            const drain = EG_ENTR_ORDER_DRAIN * (now < _egEntrColdUntil ? 2 : 1);
            _egEntrOrder = Math.max(0, _egEntrOrder - drain * dtS);
        }
        _egEntrHudApply();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: HEAT DEATH DRIFT (all fight)---------------
//------------------------------------------------------------------------
// Cold pools bloom outward and MERGE when they touch; each cast also
// plants a lit ordered zone (smaller as the pools grow). Standing in a
// zone = protection + order refill; pools drain %HP/s.
const EG_ENTR_DRIFT_BLOOMS = [0, 2, 2, 3];  // blooms per cast, by phase
const EG_ENTR_POOL_R       = 95;            // base pool radius
const EG_ENTR_BLOOM_MS     = 900;           // telegraph before eruption

function _egMechEntrDrift(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    void level;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_entr_drift', '♾️❄️ HEAT DEATH DRIFT — the cold spreads! Find the lit zones!', '#93c5fd');
    _egEntrEnsureOrderRun(monster);

    const poolLife = (p >= 3 ? EG_ENTR_POOL_LIFE - 2 : EG_ENTR_POOL_LIFE) * _EG_ENTR_DEBUG_MULT * 1000;
    const zoneLife = EG_ENTR_ZONE_LIFE * _EG_ENTR_DEBUG_MULT * 1000;

    // Blooms ride the loop clock (pause-safe — no bare setTimeout).
    const blooms = [];
    for (let i = 0; i < EG_ENTR_DRIFT_BLOOMS[p]; i++) {
        blooms.push({
            x: W * (0.14 + Math.random() * 0.72),
            y: H * (0.18 + Math.random() * 0.64),
            eruptAt: EG_ENTR_BLOOM_MS * _EG_ENTR_DEBUG_MULT + i * 260,
            warnEl: null, done: false,
        });
    }

    let t = 0;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;
        for (const b of blooms) {
            if (b.done) continue;
            pending = true;
            if (t >= b.eruptAt) {
                b.done = true;
                if (b.warnEl) { try { b.warnEl.remove(); } catch (e) {} b.warnEl = null; }
                _egEntrSpawnPool(b.x, b.y, EG_ENTR_POOL_R + p * 8, poolLife);
                _egEntrSpawnZone(W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.6), zoneLife);
            } else if (!b.warnEl) {
                b.warnEl = _egNkEl(run, 'div', 'eg-entr-bloom-warn');
                b.warnEl.style.left = Math.round(b.x - 60) + 'px';
                b.warnEl.style.top = Math.round(b.y - 60) + 'px';
            }
        }
        return pending;
    });
}

// Spawn a pool; if it overlaps an existing one, MERGE into a bigger pool
// (real entropy — the cold consolidates instead of multiplying).
function _egEntrSpawnPool(x, y, r, lifeMs) {
    const near = _egEntrPools.find(q => Math.hypot(q.x - x, q.y - y) < q.r + r - 24);
    if (near) {
        const tot = near.r + r;
        const nx = (near.x * near.r + x * r) / tot;
        const ny = (near.y * near.r + y * r) / tot;
        const nr = Math.min(170, Math.sqrt(near.r * near.r + r * r) * 1.05);
        const until = Math.max(near.until, performance.now() + lifeMs);
        try { near.el.remove(); } catch (e) {}
        _egEntrPools = _egEntrPools.filter(q => q !== near);
        _egEntrSpawnPool(nx, ny, nr, until - performance.now());
        return;
    }
    const el = document.createElement('div');
    el.className = 'eg-entr-pool';
    const d = Math.round(r * 2);
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    document.body.appendChild(el);
    _egEntrPools.push({ x, y, r, el, until: performance.now() + lifeMs, dps: EG_ENTR_POOL_DPS });
}

function _egEntrSpawnZone(x, y, lifeMs) {
    // Zones shrink as the cold consolidates: more pools → smaller refuge.
    const r = Math.max(55, 92 - _egEntrPools.length * 4);
    const el = document.createElement('div');
    el.className = 'eg-entr-zone';
    const d = Math.round(r * 2);
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    document.body.appendChild(el);
    _egEntrZones.push({ x, y, r, el, until: performance.now() + lifeMs });
}


//------------------------------------------------------------------------
//-------------------ACT II: RECURSIVE DECAY (60%)-------------------------
//------------------------------------------------------------------------
// Cursed cells AGE: every 4s each living cell spreads decay to an
// orthogonal neighbour (cap 9). Stand on a cell to burn it out — the burn
// costs a cold DoT while you stand there.
const EG_ENTR_DECAY_SEEDS = [0, 3, 3, 5];   // cells seeded per cast, by phase
const EG_ENTR_CELL_CAP    = 9;

function _egMechEntrDecay(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_entr_decay', '♾️🦠 RECURSIVE DECAY — the cells spread! Stand on them to burn them out!', '#86efac');
    _egEntrEnsureOrderRun(monster);

    for (let i = 0; i < EG_ENTR_DECAY_SEEDS[p]; i++) {
        _egEntrSpawnCell(W * (0.12 + Math.random() * 0.76), H * (0.16 + Math.random() * 0.68));
    }

    let spreadAcc = 0;
    _egNkLoop(run, (dtS) => {
        // Spread: every EG_ENTR_CELL_SPREAD seconds, living cells propagate.
        // (Burn-out lives in the order watcher so it works in every state.)
        spreadAcc += dtS;
        if (spreadAcc >= EG_ENTR_CELL_SPREAD) {
            spreadAcc = 0;
            const alive = _egEntrCells.filter(c => !c.dead);
            if (alive.length && alive.length < EG_ENTR_CELL_CAP) {
                const src = alive[Math.floor(Math.random() * alive.length)];
                const dirs = [[64, 0], [-64, 0], [0, 64], [0, -64]];
                const d = dirs[Math.floor(Math.random() * dirs.length)];
                _egEntrSpawnCell(src.x + d[0], src.y + d[1]);
            }
        }
        return _egEntrCells.some(c => !c.dead);
    });
}

function _egEntrSpawnCell(x, y) {
    if (_egEntrCells.filter(c => !c.dead).length >= EG_ENTR_CELL_CAP) return;
    const el = document.createElement('div');
    el.className = 'eg-entr-cell';
    el.style.left = Math.round(x - 23) + 'px';
    el.style.top = Math.round(y - 23) + 'px';
    document.body.appendChild(el);
    _egEntrCells.push({ x, y, el, born: performance.now(), dead: false, burn: 0 });
}


//------------------------------------------------------------------------
//-------------------ACT II: MAXWELL'S DOOR (60%)--------------------------
//------------------------------------------------------------------------
// A hot door and a cold door at opposite edges. Entering one applies the
// element for 8s (one use each): HOT = pools heal you (zones stop
// refilling), COLD = pool-proof (order drains twice as fast).
function _egMechEntrDoor(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    void phase;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_entr_door', '♾️🚪 MAXWELL\u2019S DOOR — choose your element, pay its price!', '#fdba74');

    const y = H * (0.3 + Math.random() * 0.4);
    const hot = _egNkEl(run, 'div', 'eg-entr-door eg-entr-door-hot', '🔥');
    hot.style.left = Math.round(W * 0.08 - 34) + 'px';
    hot.style.top = Math.round(y - 52) + 'px';
    const cold = _egNkEl(run, 'div', 'eg-entr-door eg-entr-door-cold', '❄️');
    cold.style.left = Math.round(W * 0.92 - 34) + 'px';
    cold.style.top = Math.round(H - y - 52) + 'px';

    let t = 0;
    const lifeMs = 9000 * _EG_ENTR_DEBUG_MULT;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pc = _egEntrPC();
        const now = performance.now();
        if (Math.hypot(pc.x - W * 0.08, pc.y - y) < 50) {
            _egEntrApplyHot();
            return false;
        }
        if (Math.hypot(pc.x - W * 0.92, pc.y - (H - y)) < 50) {
            _egEntrApplyCold();
            return false;
        }
        if (t >= lifeMs) return false;
        return true;
    });
}

function _egEntrApplyHot() {
    _egEntrHotUntil = performance.now() + EG_ENTR_DOOR_STATE * _EG_ENTR_DEBUG_MULT;
    _egNkToast('eg_mech_entr_hot', '🔥 FIRE-STATE — cold pools heal you, but heat scatters order!', '#fdba74');
    _egEntrAura('eg-entr-hot-aura', 'hot');
}

function _egEntrApplyCold() {
    _egEntrColdUntil = performance.now() + EG_ENTR_DOOR_STATE * _EG_ENTR_DEBUG_MULT;
    _egNkToast('eg_mech_entr_cold', '❄️ COLD-STATE — pool-proof, but order drains twice as fast!', '#93c5fd');
    _egEntrAura('eg-entr-cold-aura', 'cold');
}

function _egEntrAura(cls, which) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    const other = which === 'hot' ? 'eg-entr-cold-aura' : 'eg-entr-hot-aura';
    el.classList.remove(other);
    el.classList.add(cls);
    if (which === 'hot') {
        clearTimeout(_egEntrHotAuraTimer);
        _egEntrHotAuraTimer = setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, EG_ENTR_DOOR_STATE * _EG_ENTR_DEBUG_MULT);
    } else {
        clearTimeout(_egEntrColdAuraTimer);
        _egEntrColdAuraTimer = setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, EG_ENTR_DOOR_STATE * _EG_ENTR_DEBUG_MULT);
    }
}


//------------------------------------------------------------------------
//-------------------FINALE: THE LAST DEGREE (≤10%, one-shot)--------------
//------------------------------------------------------------------------
// Absolute zero approaches: the arena becomes one frozen lattice (perfect
// order — full movement speed). ORDER SHARDS rain in telegraphed volleys;
// each touched shard's spark flies to the central singularity and pops the
// boss for 20% of ITS maxHP through the canonical damage path. 5 shards =
// the universe restarts (the kill). Timer fail = HEAT DEATH wave.
const EG_ENTR_SHARD_LIFE = 7;      // s a landed shard waits
const EG_ENTR_SHARD_WARN = 750;    // ms telegraph

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate
// and by _egEntrMoveMult).
let _egEntrFinal = null;

function _egEntrFinalActive() {
    return !!_egEntrFinal && !_egEntrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egEntrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egEntrStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egEntrStartFinalWatcher(monster) {
    if (!monster || _egEntrFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egEntrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egEntrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egEntrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egEntrFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egEntrFinalStart(monster) {
    if (_egEntrFinal || !monster) return;

    // The lattice takes over: kill every other run of this boss, then
    // rebuild the order watcher so cells/pools keep aging out cleanly.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });
    _egEntrOrderRun = null;

    // Clean slate: the frozen lattice replaces the drift battlefield.
    _egEntrZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _egEntrPools.forEach(p => { try { p.el.remove(); } catch (e) {} });
    _egEntrCells.forEach(c => { try { c.el.remove(); } catch (e) {} });
    _egEntrZones = []; _egEntrPools = []; _egEntrCells = [];
    _egEntrOrder = 100;

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const g = {
        monsterId: monster.id,
        finished: false,
        delivered: 0,
        deadline: performance.now() + EG_ENTR_FINAL_TIME * _EG_ENTR_DEBUG_MULT * 1000,
        fxRun: null, overlay: null, singularity: null, timerEl: null,
    };
    _egEntrFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Frozen lattice overlay + singularity.
    const lattice = document.createElement('div');
    lattice.className = 'eg-entr-lattice';
    document.body.appendChild(lattice);
    g.fxRun.els.push(lattice);

    const sing = document.createElement('div');
    sing.className = 'eg-entr-singularity';
    sing.style.left = Math.round(cx - 64) + 'px';
    sing.style.top = Math.round(cy - 64) + 'px';
    document.body.appendChild(sing);
    g.singularity = sing;
    g.fxRun.els.push(sing);

    // Countdown overlay (title + live timer).
    const ov = document.createElement('div');
    ov.className = 'eg-entr-cd';
    ov.innerHTML =
        '<div class="eg-entr-cd-label">♾️ THE LAST DEGREE</div>' +
        '<div class="eg-entr-cd-timer">—</div>' +
        '<div class="eg-entr-cd-hint">Collect the shards — carry the sparks to the singularity!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.timerEl = ov.querySelector('.eg-entr-cd-timer');
    g.fxRun.els.push(ov);

    _egNkToast('eg_mech_entr_final_cd', '♾️💀 THE LAST DEGREE — gather the shards before absolute zero!', '#93c5fd');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card freezes over while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('eg-entr-allin');

    const level = monster.level || 1;

    // Rebuild the order watcher (post-purge) so stray cells/pools age out.
    _egEntrEnsureOrderRun(monster);

    // ── Shard spawning (one unified path: initial drop, re-drops after a
    // lost shard, and follow-ups after a delivery all come through here). ──
    const spawnShard = () => {
        if (g.finished) return;
        const sx = W * (0.12 + Math.random() * 0.76);
        const sy = H * (0.16 + Math.random() * 0.68);

        const warn = _egNkEl(g.fxRun, 'div', 'eg-entr-shard-warn');
        warn.style.left = Math.round(sx - 30) + 'px';
        warn.style.top = Math.round(sy - 30) + 'px';

        _egEntrAfter(g, EG_ENTR_SHARD_WARN * _EG_ENTR_DEBUG_MULT, () => {
            if (g.finished) return;
            try { warn.remove(); } catch (e) {}
            const shard = _egNkEl(g.fxRun, 'div', 'eg-entr-shard', '✨');
            shard.style.left = Math.round(sx - 22) + 'px';
            shard.style.top = Math.round(sy - 22) + 'px';

            let life = 0;
            _egNkLoop(g.fxRun, (dtS) => {
                if (g.finished) return false;
                life += dtS;
                const pc = _egEntrPC();
                if (Math.hypot(pc.x - sx, pc.y - sy) < 40) {
                    _egEntrDeliver(g, monster, sx, sy, level);
                    return false;
                }
                if (life >= EG_ENTR_SHARD_LIFE * _EG_ENTR_DEBUG_MULT) {
                    // Lost shard: it dissolves — another falls after a beat.
                    _egEntrAfter(g, 700 * _EG_ENTR_DEBUG_MULT, spawnShard);
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
        if (left <= 0) { _egEntrHeatDeath(g, monster, level); return; }
        _egEntrAfter(g, 250, tickTimer);
    };
    tickTimer();

    // Interference: cursed cells still rain (frozen, they just sit there —
    // standing on them still burns them out, and they never spread).
    const rainCells = () => {
        if (g.finished) return;
        _egEntrSpawnCell(W * (0.12 + Math.random() * 0.76), H * (0.16 + Math.random() * 0.68));
        _egEntrAfter(g, 6000 * _EG_ENTR_DEBUG_MULT, rainCells);
    };
    rainCells();

    spawnShard();
    // Let the delivery path re-enter the unified spawner for follow-ups.
    _egEntrSpawnShardFn = spawnShard;
}

// A shard was touched: its spark flies to the singularity, then the boss
// takes a 20% pop through the canonical damage path.
function _egEntrDeliver(g, monster, sx, sy, level) {
    if (g.finished) return;
    void level;
    const W = window.innerWidth, H = window.innerHeight;

    const spark = document.createElement('div');
    spark.className = 'eg-entr-spark';
    spark.style.left = Math.round(sx - 16) + 'px';
    spark.style.top = Math.round(sy - 16) + 'px';
    spark.style.setProperty('--fly-dx', Math.round((W / 2 - sx)) + 'px');
    spark.style.setProperty('--fly-dy', Math.round((H / 2 - sy)) + 'px');
    document.body.appendChild(spark);
    setTimeout(() => { try { spark.remove(); } catch (e) {} }, 1300 * _EG_ENTR_DEBUG_MULT);

    _egNkToast('eg_mech_entr_shard', '♾️✨ Shard ' + (g.delivered + 1) + '/' + EG_ENTR_SHARDS + ' delivered — the singularity stirs!', '#fde68a');

    _egEntrAfter(g, 1150 * _EG_ENTR_DEBUG_MULT, () => {
        if (g.finished) return;
        g.delivered++;
        // Staggered damage pop on the boss — canonical path so resistances,
        // phase checks and the death flow all apply.
        try {
            const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
            if (m && typeof _egDamageTargetById === 'function' && m.currentHP > 0) {
                _egDamageTargetById(g.monsterId, m.maxHP * EG_ENTR_SHARD_DMG, ['cold'], {});
            }
        } catch (e) {}
        // The boss card flares as each shard lands.
        const card = document.getElementById('eg-card-' + g.monsterId);
        const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
        if (wrap) {
            wrap.classList.remove('eg-entr-hit');
            void wrap.offsetWidth;
            wrap.classList.add('eg-entr-hit');
        }
        if (g.delivered >= EG_ENTR_SHARDS) {
            _egEntrRestart(g, monster);
        } else {
            _egEntrAfter(g, 600 * _EG_ENTR_DEBUG_MULT, () => {
                if (!g.finished) _egEntrDropNext(g, monster);
            });
        }
    });
}

// Follow-up shard after a delivery (the unified spawner lives in
// _egEntrFinalStart as `spawnShard`; this thin re-entry keeps the delivery
// path simple).
let _egEntrSpawnShardFn = null;
function _egEntrDropNext(g, monster) {
    if (g.finished || !_egEntrSpawnShardFn) return;
    _egEntrSpawnShardFn(g, monster);
}

// Timer failure: HEAT DEATH — a full-screen slow wave; only the singularity
// centre is safe.
function _egEntrHeatDeath(g, monster, level) {
    if (g.finished) return;
    _egNkToast('eg_mech_entr_heatdeath', '♾️💀 HEAT DEATH! The wave takes everything but the centre!', '#f87171');
    const wave = document.createElement('div');
    wave.className = 'eg-entr-heatwave';
    const W = window.innerWidth, H = window.innerHeight;
    wave.style.left = Math.round(W / 2) + 'px';
    wave.style.top = Math.round(H / 2) + 'px';
    document.body.appendChild(wave);
    g.fxRun.els.push(wave);

    _egEntrAfter(g, 2200 * _EG_ENTR_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _egEntrPC();
        if (Math.hypot(pc.x - W / 2, pc.y - H / 2) > EG_ENTR_SINGULAR_R) {
            const dealt = _egNkHit(EG_ENTR_HEATDEATH, 'cold', level);
            _egNkAbilityHitToast(dealt, 'Entropy', 'Heat Death');
        }
        // The wave lands, the universe keeps winding down — resume the fight.
        _egEntrFinalEnd(g, monster);
    });
}

// Success: the fifth shard re-ignites the universe — the boss pays its own
// remaining HP (through the canonical path, immunity already released).
function _egEntrRestart(g, monster) {
    if (g.finished) return;
    _egNkToast('eg_mech_entr_spark', '♾️💥 THE UNIVERSE RESTARTS — Entropy gave everything one last spark!', '#fde68a');
    const flash = document.createElement('div');
    flash.className = 'eg-entr-restart-flash';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1400);
    _egEntrFinalEnd(g, monster);
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _egDamageTargetById === 'function' && m.currentHP > 0) {
            _egDamageTargetById(g.monsterId, m.currentHP, ['cold'], {});
        }
    } catch (e) {}
    void monster;
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egEntrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-entr-lattice, .eg-entr-singularity, .eg-entr-cd, ' +
        '.eg-entr-shard-warn, .eg-entr-shard, .eg-entr-heatwave, .eg-entr-spark').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-entr-allin');
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
function _egEntrTeardown() {
    if (_egEntrFinal) { try { _egEntrFinalEnd(_egEntrFinal, null); } catch (e) {} _egEntrFinal = null; }
    if (_egEntrOrderRun) { try { _egNkKillRun(_egEntrOrderRun); } catch (e) {} _egEntrOrderRun = null; }
    _egEntrZones.forEach(z => { try { z.el.remove(); } catch (e) {} });
    _egEntrPools.forEach(p => { try { p.el.remove(); } catch (e) {} });
    _egEntrCells.forEach(c => { try { c.el.remove(); } catch (e) {} });
    _egEntrZones = []; _egEntrPools = []; _egEntrCells = [];
    _egEntrOrder = 100;
    _egEntrHotUntil = 0; _egEntrColdUntil = 0;
    if (_egEntrHudEl) { try { _egEntrHudEl.remove(); } catch (e) {} _egEntrHudEl = null; }
    document.querySelectorAll('.eg-entr-bloom-warn, .eg-entr-pool, .eg-entr-zone, .eg-entr-cell, ' +
        '.eg-entr-door, .eg-entr-shard-warn, .eg-entr-shard, .eg-entr-spark, .eg-entr-heatwave, ' +
        '.eg-entr-lattice, .eg-entr-singularity, .eg-entr-cd, .eg-entr-restart-flash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (avatar) avatar.classList.remove('eg-entr-hot-aura', 'eg-entr-cold-aura');
    const card = document.getElementById('eg-card-boss_entropy');
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-entr-allin', 'eg-entr-hit');
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_ENTR_DEBUG.fire('drift'|'decay'|'door'|'final') — run one now
//   _EG_ENTR_DEBUG.order(n)                             — set the meter by hand
if (typeof window !== 'undefined') {
    window._EG_ENTR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_entropy') : null;
            if (!monster) return 'no entropy alive';
            const fn = name === 'drift' ? _egMechEntrDrift
                : name === 'decay' ? _egMechEntrDecay
                : name === 'door' ? _egMechEntrDoor : null;
            if (name !== 'drift' && !fn) {
                if (name === 'final') { _egEntrFinalStart(monster); return 'THE LAST DEGREE started'; }
                return 'unknown: ' + name;
            }
            if (fn && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        order: (n) => { _egEntrOrder = Math.max(0, Math.min(100, Number(n) || 0)); _egEntrHudApply(); return 'order = ' + Math.round(_egEntrOrder); },
    };
}
