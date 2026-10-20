import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkSlamShatter, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE RAZOR (boss_razor)-------------------------
//------------------------------------------------------------------------
// Tier-8 rework "The Whetted Edge": boomerang blade cyclones whose return
// arcs cross, wire lattices to path between, and a whetstone to shatter
// before the giant blade casts. A THOUSAND EDGES at ≤10%: survive the
// reversing spoke clock, then the last edge with one safe pocket.
//------------------------------------------------------------------------

// DEBUG: slow The Razor's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _RZR_DEBUG_SLOW = false;
export const _RZR_DEBUG_MULT = _RZR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_razor: {
        id: 'boss_razor', name: 'The Razor', emoji: '🪃',
        baseHP: 980, baseDamage: 24, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_razor - "The Whetted Edge" (rework)
    // Phase 1 (100% → 60%): Blade Cyclone + Probability Shift
    // Phase 2 ( 60% → 30%): immune window; Razor Wire Lattice + Hone and
    //                        Cast join
    // Phase 3 ( 30% →  0%): double cyclone fans, five wires, double
    //                        scythes; at 10% A THOUSAND EDGES begins
    boss_razor: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'blade_cyclone', intervalBase: 20000, intervalVariance: 5000, handler: '_mechRzrCyclone' },
            { name: 'probability_shift', intervalBase: 22000, intervalVariance: 5000, handler: '_mechProbabilityShift' },
            { name: 'razor_wires', intervalBase: 22000, intervalVariance: 5000, handler: '_mechRzrWires', phase2Only: true },
            { name: 'hone_and_cast', intervalBase: 26000, intervalVariance: 6000, handler: '_mechRzrHone', phase2Only: true },
        ],
        onPhaseEnter: _rzrOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const RZR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Razor hazards. Lightning-element boss -
// hits go in with element 'lightning' so the toast palette stays yellow.
export let _rzrHitCd = 0;
export function _rzrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _rzrHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _rzrHitCd = now + RZR_TOUCH_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, 'The Razor', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _rzrPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
export function _rzrHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = globalThis.playerCurrentHP;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP || before, before + (globalThis._lifeGain ? globalThis._lifeGain(amount) : (amount)));
    if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: BLADE CYCLONE (all fight)------------------
//------------------------------------------------------------------------
// A fan of boomerangs flies out to the far edge, wheels around, and returns
// along curved arcs that cross each other on the way home. Phase 3: a
// second fan launches while the first is still returning.
export const RZR_FAN_N     = [0, 4, 5, 6];   // blades per fan, by phase
export const RZR_OUT_SPD   = 340;             // px/s out leg
export const RZR_BACK_SPD  = 400;             // px/s return arc speed
export const RZR_STAGGER_MS = 180;            // throw stagger
export const RZR_OUT_DMG   = [0, 0.12, 0.14, 0.16]; // %maxHP out-leg hit
export const RZR_BACK_DMG  = [0, 0.14, 0.16, 0.18]; // %maxHP return-arc hit

export function _mechRzrCyclone(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _rzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_rzr_cyclone', '🪃 BLADE CYCLONE - the fan flies out and comes back CROSSING! Read the return arcs!', '#fde047');

    const ax = W * 0.85, ay = H * 0.5;
    const anchor = _nkEl(run, 'div', 'sx-nk-dot sx-rzr-anchor', '🪃');
    anchor.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';

    const blades = [];
    let wave2 = false;

    const throwFan = () => {
        const n = RZR_FAN_N[p];
        for (let i = 0; i < n; i++) {
            const tx = 40;
            const ty = H * (0.15 + (n === 1 ? 0.5 : i / (n - 1)) * 0.7);
            const el = _nkEl(run, 'div', 'sx-nk-dot sx-rzr-blade', '🪃');
            el.style.display = 'none';
            // Curved return: control point perpendicular to the out leg,
            // alternating sides so the arcs cross each other.
            const midx = (ax + tx) / 2, midy = (ay + ty) / 2;
            const side = i % 2 === 0 ? 1 : -1;
            const cx = midx + side * W * 0.16;
            const cy = midy + side * H * 0.22;
            blades.push({
                x: ax, y: ay, tx, ty, cx, cy,
                leg: 'out', u: 0, t: -i * RZR_STAGGER_MS * _RZR_DEBUG_MULT,
                hitOut: false, hitBack: false, rot: 0, el,
            });
        }
    };
    throwFan();

    _nkLoop(run, (dtS) => {
        let pending = false;
        const pr = _nkPlayerRect();

        blades.forEach(b => {
            if (b.leg === 'done') return;
            pending = true;
            b.t += dtS * 1000;
            if (b.t < 0) return;
            b.el.style.display = '';
            b.rot += 640 * dtS;

            if (b.leg === 'out') {
                const dx = b.tx - b.x, dy = b.ty - b.y;
                const d = Math.hypot(dx, dy) || 1;
                const step = Math.min(d, RZR_OUT_SPD * dtS);
                b.x += (dx / d) * step;
                b.y += (dy / d) * step;
                if (pr && _nkDotHit(b.el, pr, 0) && !b.hitOut) {
                    b.hitOut = true;
                    const dealt = _nkHit(RZR_OUT_DMG[p], 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Razor', 'Blade Cyclone');
                }
                if (d <= 12) { b.leg = 'back'; b.hitBack = false; }
            } else {
                // Curved return along a quadratic bezier target → control → anchor.
                const approxLen = (Math.hypot(b.tx - b.cx, b.ty - b.cy) + Math.hypot(b.cx - ax, b.cy - ay)) * 0.85 || 1;
                b.u += (RZR_BACK_SPD / approxLen) * dtS;
                const v = Math.min(1, b.u), iv = 1 - v;
                b.x = iv * iv * b.tx + 2 * iv * v * b.cx + v * v * ax;
                b.y = iv * iv * b.ty + 2 * iv * v * b.cy + v * v * ay;
                if (pr && _nkDotHit(b.el, pr, 0) && !b.hitBack) {
                    b.hitBack = true;
                    const dealt = _nkHit(RZR_BACK_DMG[p], 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Razor', 'Cyclone Return');
                }
                if (v >= 1) { b.leg = 'done'; b.el.style.display = 'none'; }
            }
            b.el.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px) rotate(' + Math.round(b.rot) + 'deg)';
        });

        // Phase 3: the second fan launches while the first is returning.
        if (p >= 3 && !wave2 && blades.length && blades.every(b => b.leg === 'back' || b.leg === 'done')) {
            wave2 = true;
            throwFan();
            _nkToast('eg_mech_rzr_cyclone2', '🪃 SECOND FAN - the returns cross the new throws!', '#fde047');
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: RAZOR WIRE LATTICE (60%)----------------------
//------------------------------------------------------------------------
// Taut wires snap across the arena, hold, then SNAP - the cut ends whip
// outward and sting anyone still near the line. Phase 3: five wires, one
// arrives already taut.
export const RZR_WIRE_N     = [0, 0, 3, 5];  // wires per cast, by phase
export const RZR_WIRE_WARN  = 1400;          // dashed telegraph (ms)
export const RZR_WIRE_HOLD  = 4500;          // taut hold (ms)
export const RZR_WIRE_DPS   = [0, 0, 6.0, 7.5]; // %/s touching a taut wire
export const RZR_WIRE_WHIP  = [0, 0, 0.14, 0.16]; // %maxHP caught by the snap-whip
export const RZR_WHIP_R     = 42;            // whip punish radius (px)

export function _mechRzrWires(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _rzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_rzr_wires', '🪃 RAZOR WIRES - the arena is strung taut. Path between them, then LEAVE the line!', '#fde047');

    const n = RZR_WIRE_N[p];
    const wires = [];
    for (let i = 0; i < n; i++) {
        // Chords: endpoints on opposite-ish edges, well separated.
        const verticalFirst = Math.random() < 0.5;
        let x1, y1, x2, y2;
        if (verticalFirst) {
            x1 = W * (0.1 + Math.random() * 0.8); y1 = -20;
            x2 = W * (0.1 + Math.random() * 0.8); y2 = H + 20;
        } else {
            x1 = -20; y1 = H * (0.1 + Math.random() * 0.8);
            x2 = W + 20; y2 = H * (0.1 + Math.random() * 0.8);
        }
        const el = _nkEl(run, 'div', 'sx-rzr-wire sx-rzr-wire-warn');
        const len = Math.hypot(x2 - x1, y2 - y1);
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        el.style.left = Math.round(x1) + 'px';
        el.style.top = Math.round(y1 - 1) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.transformOrigin = '0 50%';
        el.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
        // Phase 3: the last wire arrives already taut (shorter telegraph).
        const warn = (p >= 3 && i === n - 1) ? 500 * _RZR_DEBUG_MULT : RZR_WIRE_WARN * _RZR_DEBUG_MULT;
        wires.push({ x1, y1, x2, y2, el, tautAt: performance.now() + warn, dieAt: 0, snapped: false });
    }

    let holdStarted = 0;   // (set below when the first wire turns taut)
    _nkLoop(run, (dtS, now) => {
        const pc = _rzrPC();

        for (const w of wires) {
            if (w.snapped) continue;
            if (now < w.tautAt) continue;
            if (!w.dieAt) {
                // Turn taut.
                if (!holdStarted) holdStarted = now;
                w.el.classList.remove('sx-rzr-wire-warn');
                w.el.classList.add('sx-rzr-wire-taut');
                w.dieAt = now + RZR_WIRE_HOLD * _RZR_DEBUG_MULT;
            }
            if (now < w.dieAt) {
                // Contact DoT while taut.
                if (_ptSegDist(pc.x, pc.y, w.x1, w.y1, w.x2, w.y2) < 14) {
                    _nkDotTick(run, RZR_WIRE_DPS[p], dtS, level, 'lightning');
                } else {
                    run.dotAcc = 0;
                }
            } else {
                // SNAP: one sting if you linger near the line, ends whip out.
                w.snapped = true;
                w.el.classList.add('sx-rzr-wire-snap');
                const d = _ptSegDist(pc.x, pc.y, w.x1, w.y1, w.x2, w.y2);
                if (d < RZR_WHIP_R) {
                    _rzrTouch(RZR_WIRE_WHIP[p], level, 'Wire Whip');
                }
                // The two cut ends scythe outward (visual).
                const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
                for (const dir of [-1, 1]) {
                    const seg = _nkEl(run, 'div', 'sx-rzr-whip-seg');
                    seg.style.left = Math.round((w.x1 + w.x2) / 2) + 'px';
                    seg.style.top = Math.round((w.y1 + w.y2) / 2) + 'px';
                    seg.style.transform = 'rotate(' + (ang * 180 / Math.PI).toFixed(2) + 'deg)';
                    seg.style.setProperty('--rzr-whip-dx', Math.round(Math.cos(ang) * dir * 320) + 'px');
                    seg.style.setProperty('--rzr-whip-dy', Math.round(Math.sin(ang) * dir * 320) + 'px');
                    setTimeout(() => { try { seg.remove(); } catch (e) {} }, 420 * _RZR_DEBUG_MULT);
                }
                setTimeout(() => { try { w.el.remove(); } catch (e) {} }, 450 * _RZR_DEBUG_MULT);
            }
        }

        // Done when every wire has snapped.
        return wires.some(w => !w.snapped);
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: HONE AND CAST (60%)---------------------------
//------------------------------------------------------------------------
// The Razor plants a WHETSTONE and hones a GIANT BLADE while a grind aura
// chips anything nearby. Body-check the stone 2× to shatter it (+12% heal)
// and cancel the cast; fail and the giant scythe crosses the whole arena
// at your row. Phase 3: the scythe comes back the other way.
export const RZR_HONE_MS    = [0, 0, 7000, 5500]; // hone time by phase
export const RZR_STONE_R    = 58;            // body-check radius
export const RZR_STONE_HP   = 2;             // body-checks to shatter
export const RZR_GRIND_R    = 96;            // grind aura radius
export const RZR_GRIND_DPS  = 3.0;           // %/s standing in the grind aura
export const RZR_SCYTHE_DMG = [0, 0, 0.24, 0.30]; // %maxHP caught by the scythe
export const RZR_SCYTHE_WARN = 1100;         // telegraph before the sweep
export const RZR_SCYTHE_SPD = 1100;          // px/s blade travel
export const RZR_HEAL_CANCEL = 0.12;         // %maxHP heal for shattering the stone

export function _mechRzrHone(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _rzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_rzr_hone', '🪃 HONE AND CAST - the whetstone grinds a GIANT BLADE. Smash the stone to cancel it!', '#fde047');

    // Plant the whetstone away from the player.
    const pc0 = _rzrPC();
    let sx = W * 0.5, sy = H * 0.5;
    for (let tries = 0; tries < 24; tries++) {
        sx = W * (0.18 + Math.random() * 0.64);
        sy = H * (0.22 + Math.random() * 0.56);
        if (Math.hypot(sx - pc0.x, sy - pc0.y) > 200) break;
    }
    const stone = _nkEl(run, 'div', 'sx-rzr-stone', '🪨');
    stone.style.left = Math.round(sx - RZR_STONE_R) + 'px';
    stone.style.top = Math.round(sy - RZR_STONE_R) + 'px';
    stone.style.width = (RZR_STONE_R * 2) + 'px';
    stone.style.height = (RZR_STONE_R * 2) + 'px';
    const grind = _nkEl(run, 'div', 'sx-rzr-grind');
    grind.style.left = Math.round(sx - RZR_GRIND_R) + 'px';
    grind.style.top = Math.round(sy - RZR_GRIND_R) + 'px';
    grind.style.width = (RZR_GRIND_R * 2) + 'px';
    grind.style.height = (RZR_GRIND_R * 2) + 'px';

    const state = { honed: false, shattered: false, hp: RZR_STONE_HP, lastHit: 0, scythes: 0, scythesTotal: p >= 3 ? 2 : 1, bandY: 0, axis: 'h', dir: 1 };
    let honeT = 0;   // run.born is not part of the run contract - time it here
    const honeMs = RZR_HONE_MS[p] * _RZR_DEBUG_MULT;

    _nkLoop(run, (dtS, now) => {
        honeT += dtS * 1000;
        const pr = _nkPlayerRect();
        const pc = _rzrPC();
        let pending = true;

        // Grind aura chips.
        if (!state.shattered && Math.hypot(pc.x - sx, pc.y - sy) < RZR_GRIND_R) {
            _nkDotTick(run, RZR_GRIND_DPS, dtS, level, 'lightning');
        } else {
            run.dotAcc = 0;
        }

        // Body-check the stone (visit cooldown → two deliberate trips).
        if (!state.shattered && !state.honed && pr
            && Math.hypot(pc.x - sx, pc.y - sy) < RZR_STONE_R
            && now >= state.lastHit) {
            state.lastHit = now + 450 * _RZR_DEBUG_MULT;
            state.hp--;
            stone.classList.remove('sx-rzr-stone-hit');
            void stone.offsetWidth;
            stone.classList.add('sx-rzr-stone-hit');
            if (state.hp <= 0) {
                state.shattered = true;
                stone.classList.add('sx-rzr-stone-shattered');
                _rzrHeal(_nkMaxHP() * RZR_HEAL_CANCEL);
                _nkToast('eg_mech_rzr_stone', '🪃🪨 WHETSTONE SHATTERED - the cast is cancelled! (+heal)', '#4ade80');
            }
        }

        // Hone completes → the giant scythe.
        if (!state.shattered && !state.honed && honeT >= honeMs) {
            state.honed = true;
            stone.classList.add('sx-rzr-stone-dim');
            grind.classList.add('sx-rzr-grind-done');
            _nkToast('eg_mech_rzr_scythe', '🪃 THE GIANT SCYTHE is honed - the arena is its path!', '#f97316');
            // Lock the sweep band to your current position, alternating axis.
            state.axis = state.scythes % 2 === 0 ? 'h' : 'v';
            state.dir = state.scythes % 2 === 0 ? 1 : -1;
            state.bandY = state.axis === 'h' ? pc.y : pc.x;
            const band = _nkEl(run, 'div', 'sx-nk-band sx-rzr-scythe-warn');
            if (state.axis === 'h') {
                band.style.left = '0px'; band.style.top = Math.round(state.bandY - 55) + 'px';
                band.style.width = W + 'px'; band.style.height = '110px';
            } else {
                band.style.left = Math.round(state.bandY - 55) + 'px'; band.style.top = '0px';
                band.style.width = '110px'; band.style.height = H + 'px';
            }
            state.warnUntil = now + RZR_SCYTHE_WARN * _RZR_DEBUG_MULT;
            state.band = band;
        }

        // Scythe sweep after its telegraph.
        if (state.honed && state.band && now >= state.warnUntil && !state.sweeping) {
            state.sweeping = true;
            state.band.classList.add('sx-nk-band-hit');
            _nkSlamShatter(state.band, run);
            state.bladeX = state.dir > 0 ? -80 : (state.axis === 'h' ? W : H) + 80;
            state.bladeY = state.bandY;
            const blade = _nkEl(run, 'div', 'sx-nk-dot sx-rzr-giant', '⚔️');
            state.bladeEl = blade;
            state.bladeHit = false;
        }
        if (state.sweeping && state.bladeEl) {
            state.bladeX += state.dir * RZR_SCYTHE_SPD * dtS;
            const bx = state.axis === 'h' ? state.bladeX : state.bandY;
            const by = state.axis === 'h' ? state.bandY : state.bladeX;
            state.bladeEl.style.transform = 'translate(' + Math.round(bx - 38) + 'px,' + Math.round(by - 38) + 'px)';
            if (pr && !state.bladeHit) {
                const inBand = state.axis === 'h'
                    ? Math.abs(pc.y - state.bandY) < 55
                    : Math.abs(pc.x - state.bandY) < 55;
                if (inBand) {
                    state.bladeHit = true;
                    const dealt = _nkHit(RZR_SCYTHE_DMG[p], 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Razor', 'Giant Scythe');
                }
            }
            const off = state.bladeX;
            if ((state.dir > 0 && off > (state.axis === 'h' ? W : H) + 90) || (state.dir < 0 && off < -90)) {
                try { state.bladeEl.remove(); } catch (e) {}
                state.bladeEl = null;
                state.sweeping = false;
                if (state.band) { try { state.band.remove(); } catch (e) {} }
                state.band = null;
                state.scythes++;
                if (state.scythes >= state.scythesTotal) {
                    return false;   // cast complete
                }
            }
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: A THOUSAND EDGES (≤10%, one-shot)-------------
//------------------------------------------------------------------------
// A clock of nine razor spokes rotates around the arena centre; the gaps
// are safe but the clock REVERSES every few seconds and rim fans shave
// across the middle each reversal. Survive three cycles and the blades
// condense into THE LAST EDGE - one full-screen scythe with a single safe
// pocket: the whetstone's grind aura (which chips you while you stand in
// it). Charge bar frozen (gate in _tickPlayer via _rzrFinalActive).
export const RZR_SPOKES      = 9;       // spokes on the clock
export const RZR_SPOKE_LEN_F = 0.46;    // spoke length × min(W,H)
export const RZR_SPOKE_DPS   = 8.0;     // %/s touching a spoke
export const RZR_CYCLES      = 3;       // rotation cycles before THE LAST EDGE
export const RZR_CYCLE_MS    = 6000;    // cycle length (reverse at the midpoint)
export const RZR_REV_SPD     = 22;      // deg/s spoke rotation
export const RZR_FAN_BLADES  = 2;       // rim-fan blades per reversal
export const RZR_LAST_DMG    = 0.35;    // %maxHP outside the safe pocket
export const RZR_POCKET_R    = 110;     // safe pocket radius (the grind aura)
export const RZR_POCKET_DPS  = 2.5;     // %/s chip inside the safe pocket
export const RZR_FAILSAFE_MS = 30000;   // hard cap on the set-piece

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _rzrFinal = null;

export function _rzrFinalActive() {
    return !!_rzrFinal && !_rzrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _rzrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _rzrEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _rzrEnsureFinalWatcher(monster) {
    if (!monster || _rzrFinal || _rzrWatcherRun) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _rzrWatcherRun = run;
    _nkLoop(run, () => {
        if (_rzrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _rzrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
export let _rzrWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
export function _rzrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_rzrFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _rzrFinalStart(monster) {
    if (_rzrFinal || !monster) return;

    // The Razor clears the arena for the bladestorm: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null, spokeEls: [],
        cx: W / 2, cy: H / 2,
        spokeLen: Math.min(W, H) * RZR_SPOKE_LEN_F,
        ang: Math.random() * Math.PI * 2,
        dir: 1,
        cycle: 0,
        pocket: null,   // { x, y, el } for THE LAST EDGE
    };
    _rzrFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'sx-rzr-cd';
    ov.innerHTML =
        '<div class="sx-rzr-cd-label">🪃 A THOUSAND EDGES</div>' +
        '<div class="sx-rzr-cd-hint">Walk WITH the spoke clock - it REVERSES, and every reversal shaves a fan across the middle. Survive three cycles for THE LAST EDGE: only the whetstone\u2019s grind aura is safe, and it CHIPS you to stand there!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_rzr_final_cd', '🪃💀 A THOUSAND EDGES - walk the spoke clock. It reverses!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the whetted glow while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-rzr-allin');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Spoke clock: nine rotating wires + reversal fans. ─────────────────
    for (let i = 0; i < RZR_SPOKES; i++) {
        const el = _nkEl(g.fxRun, 'div', 'sx-rzr-spoke');
        el.style.width = Math.round(g.spokeLen) + 'px';
        el.style.left = Math.round(g.cx) + 'px';
        el.style.top = Math.round(g.cy - 1) + 'px';
        el.style.transformOrigin = '0 50%';
        g.spokeEls.push(el);
    }

    // One rim fan: blades cross the arena through the centre region. Each
    // blade gets its own run (never share a run across _nkLoop calls -
    // the second registration would overwrite the first loop's raf handle).
    const rimFan = () => {
        if (g.finished) return;
        for (let i = 0; i < RZR_FAN_BLADES; i++) {
            const fromTop = Math.random() < 0.5;
            const fanRun = _nkNewRun(monster.id, true);
            const el = _nkEl(fanRun, 'div', 'sx-nk-dot sx-rzr-blade', '🪃');
            const speed = 430 + i * 60;
            let x = W * (0.25 + Math.random() * 0.5), y = fromTop ? -40 : H + 40;
            const vy = fromTop ? 1 : -1;
            _nkLoop(fanRun, (dtS) => {
                if (g.finished) return false;
                y += vy * speed * dtS;
                el.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
                const pr = _nkPlayerRect();
                if (pr && _nkDotHit(el, pr, 0)) {
                    _rzrTouch(0.15, level, 'Edge Fan');
                    return false;
                }
                return y > -80 && y < H + 80;
            });
        }
    };

    // ── One cycle: rotate for 6s, reverse at the midpoint with a fan. ────
    const runCycle = () => {
        if (g.finished) return;
        g.cycle++;
        if (g.cycle > RZR_CYCLES) { runLastEdge(); return; }
        _nkToast('eg_mech_rzr_wave', '🪃 EDGE CYCLE ' + g.cycle + '/' + RZR_CYCLES + ' - keep walking with the clock!', '#fde047');

        _rzrAfter(g, (RZR_CYCLE_MS / 2) * _RZR_DEBUG_MULT, () => {
            if (g.finished) return;
            g.dir *= -1;
            _nkToast('eg_mech_rzr_reverse', '🪃 REVERSE - the clock spins the other way!', '#f97316');
            rimFan();
            _rzrAfter(g, (RZR_CYCLE_MS / 2) * _RZR_DEBUG_MULT, () => {
                if (g.finished) return;
                g.dir *= -1;
                rimFan();
                runCycle();
            });
        });
    };

    // ── THE LAST EDGE: one scythe, one safe pocket - the grind aura. ─────
    const runLastEdge = () => {
        if (g.finished) return;
        _nkToast('eg_mech_rzr_last_edge', '🪃💀 THE LAST EDGE - every blade condenses! The whetstone\u2019s aura is the ONLY safe ground - and it chips you!', '#f97316');
        // Plant the pocket away from the edges.
        let px = W * 0.5, py = H * 0.5;
        for (let tries = 0; tries < 24; tries++) {
            px = W * (0.28 + Math.random() * 0.44);
            py = H * (0.30 + Math.random() * 0.40);
            if (px > RZR_POCKET_R + 30 && px < W - RZR_POCKET_R - 30
                && py > RZR_POCKET_R + 30 && py < H - RZR_POCKET_R - 30) break;
        }
        const pocketEl = _nkEl(g.fxRun, 'div', 'sx-rzr-grind sx-rzr-stone-safe');
        pocketEl.style.left = Math.round(px - RZR_POCKET_R) + 'px';
        pocketEl.style.top = Math.round(py - RZR_POCKET_R) + 'px';
        pocketEl.style.width = (RZR_POCKET_R * 2) + 'px';
        pocketEl.style.height = (RZR_POCKET_R * 2) + 'px';
        const stoneEl = _nkEl(g.fxRun, 'div', 'sx-rzr-stone sx-rzr-stone-safe', '🪨');
        stoneEl.style.left = Math.round(px - RZR_STONE_R) + 'px';
        stoneEl.style.top = Math.round(py - RZR_STONE_R) + 'px';
        stoneEl.style.width = (RZR_STONE_R * 2) + 'px';
        stoneEl.style.height = (RZR_STONE_R * 2) + 'px';
        g.pocket = { x: px, y: py, el: pocketEl };

        _rzrAfter(g, 2400 * _RZR_DEBUG_MULT, () => {
            if (g.finished) return;
            // The condensing scythe: everything outside the pocket is cut.
            document.querySelectorAll('.sx-rzr-spoke').forEach(el => el.classList.add('sx-rzr-spoke-condense'));
            const pc = _rzrPC();
            const inPocket = Math.hypot(pc.x - px, pc.y - py) < RZR_POCKET_R;
            if (!inPocket) {
                const dealt = _nkHit(RZR_LAST_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Razor', 'The Last Edge');
            }
            _rzrAfter(g, 1500 * _RZR_DEBUG_MULT, () => {
                _rzrFinalEnd(g, monster);
            });
        });
    };

    // ── Spoke rotation + contact ticks (the finale's own loop). ──────────
    // NOTE: rim-fan blades above run on their own short-lived runs; this main
    // loop owns g.fxRun exclusively and self-terminates via g.finished.
    const startAt = performance.now();
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _rzrPC();

        // Rotate the clock.
        if (!g.pocket) {
            g.ang += g.dir * RZR_REV_SPD * Math.PI / 180 * dtS;
            g.spokeEls.forEach((el, i) => {
                const a = g.ang + i * (Math.PI * 2 / RZR_SPOKES);
                el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(2) + 'deg)';
            });
            // Spoke contact DoT.
            let touching = false;
            for (let i = 0; i < RZR_SPOKES && !touching; i++) {
                const a = g.ang + i * (Math.PI * 2 / RZR_SPOKES);
                const ex = g.cx + Math.cos(a) * g.spokeLen;
                const ey = g.cy + Math.sin(a) * g.spokeLen;
                if (_ptSegDist(pc.x, pc.y, g.cx, g.cy, ex, ey) < 13) touching = true;
            }
            if (touching) _nkDotTick(g.fxRun, RZR_SPOKE_DPS, dtS, level, 'lightning');
            else g.fxRun.dotAcc = 0;

            // Failsafe: never spin forever.
            if (now - startAt > RZR_FAILSAFE_MS) { runLastEdge(); return false; }
        } else {
            // THE LAST EDGE is armed: the pocket chips you while you stand in it.
            if (Math.hypot(pc.x - g.pocket.x, pc.y - g.pocket.y) < RZR_POCKET_R) {
                _nkDotTick(g.fxRun, RZR_POCKET_DPS, dtS, level, 'lightning');
            } else {
                g.fxRun.dotAcc = 0;
            }
        }
        return true;
    });

    runCycle();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _rzrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-rzr-cd, .sx-rzr-spoke, .sx-rzr-stone, .sx-rzr-grind, .sx-rzr-blade, .sx-rzr-giant').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('sx-rzr-allin');
        wrap.classList.remove('sx-nk-shielded');
    }
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
// removes every run element, overlay and body class this boss ever created.
export function _rzrTeardown() {
    if (_rzrFinal) { try { _rzrFinalEnd(_rzrFinal, null); } catch (e) {} _rzrFinal = null; }
    _rzrWatcherRun = null;
    document.querySelectorAll('.sx-rzr-blade, .sx-rzr-anchor, .sx-rzr-wire, .sx-rzr-whip-seg, ' +
        '.sx-rzr-stone, .sx-rzr-grind, .sx-rzr-giant, .sx-rzr-spoke, .sx-rzr-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.sx-rzr-allin').forEach(el => el.classList.remove('sx-rzr-allin'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _RZR_DEBUG.fire('cyclone'|'wires'|'hone', phase) - runs one now
//   _RZR_DEBUG.final()                               - A THOUSAND EDGES now
if (typeof window !== 'undefined') {
    window._RZR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_razor') : null;
            if (!monster) return 'no razor alive';
            const fn = name === 'cyclone' ? _mechRzrCyclone
                : name === 'wires' ? _mechRzrWires
                : name === 'hone' ? _mechRzrHone : null;
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_razor') : null;
            if (!monster) return 'no razor alive';
            _rzrFinalStart(monster);
            return 'A THOUSAND EDGES started';
        },
    };
}
