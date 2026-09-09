//------------------------------------------------------------------------
//-------------------BOSS: THE RAZOR (boss_razor)-------------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Whetted Edge". The Metal-Man soul, scaled to an
// arena: every blade comes back, every line is an edge, and the boss
// hones its edges on a whetstone you must break before the cast finishes.
// Element: lightning.
//
//   • BLADE CYCLONE (signature, all fight) — a fan of boomerangs flies OUT
//     to the far edge, wheels around, and returns along CURVED arcs that
//     cross each other on the way home. Dodge the throw, then read the
//     crossfire of every return path. Phase 3: a second fan launches while
//     the first is still returning.
//   • RAZOR WIRE LATTICE (60%) — taut wires snap across the arena (line
//     hazard, lightning DoT on contact), hold, then SNAP: the cut ends
//     whip outward and sting anyone still near the line. Path between the
//     wires, then leave the line before it dies. Phase 3: five wires and
//     one arrives already taut.
//   • HONE AND CAST (60%) — the Razor plants a WHETSTONE and hones a GIANT
//     BLADE while a grind aura chips anything nearby. Body-check the stone
//     2× to shatter it (+12% maxHP heal) and cancel the cast; fail and the
//     giant scythe crosses the whole arena at your row. Phase 3: the scythe
//     comes back the other way.
//   • 🪃 A THOUSAND EDGES (≤10%, one-shot finale) — a clock of nine razor
//     spokes rotates around the arena centre; the gaps between spokes are
//     safe, but the clock REVERSES every few seconds and rim fans shave
//     across the middle each time. Survive three cycles and the blades
//     condense into THE LAST EDGE — one full-screen scythe with a single
//     safe pocket: the whetstone's grind aura. The safe zone chips you for
//     standing in it. Knife-edge, literally. Charge bar frozen (gate in
//     _egTickPlayer via _egRzrFinalActive).
//
// Shared soul kept: probability_shift still turns the puzzle's clues —
// fitting for a boss about angles and deflection. clue_scramble retired
// (its pressure lives in the wires you must path around).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (probability_shift) live in shared-boss-abilities.js
// and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Razor's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_RZR_DEBUG_SLOW = true;
const _EG_RZR_DEBUG_MULT = _EG_RZR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_razor: {
        id: 'boss_razor', name: 'The Razor', emoji: '🪃',
        baseHP: 980, baseDamage: 24, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_razor — "The Whetted Edge" (rework)
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
            { name: 'blade_cyclone', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechRzrCyclone' },
            { name: 'probability_shift', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
            { name: 'razor_wires', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechRzrWires', phase2Only: true },
            { name: 'hone_and_cast', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechRzrHone', phase2Only: true },
        ],
        onPhaseEnter: _egRzrOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_RZR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Razor hazards. Lightning-element boss —
// hits go in with element 'lightning' so the toast palette stays yellow.
let _egRzrHitCd = 0;
function _egRzrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egRzrHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egRzrHitCd = now + EG_RZR_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Razor', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egRzrPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egRzrHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: BLADE CYCLONE (all fight)------------------
//------------------------------------------------------------------------
// A fan of boomerangs flies out to the far edge, wheels around, and returns
// along curved arcs that cross each other on the way home. Phase 3: a
// second fan launches while the first is still returning.
const EG_RZR_FAN_N     = [0, 4, 5, 6];   // blades per fan, by phase
const EG_RZR_OUT_SPD   = 340;             // px/s out leg
const EG_RZR_BACK_SPD  = 400;             // px/s return arc speed
const EG_RZR_STAGGER_MS = 180;            // throw stagger
const EG_RZR_OUT_DMG   = [0, 0.12, 0.14, 0.16]; // %maxHP out-leg hit
const EG_RZR_BACK_DMG  = [0, 0.14, 0.16, 0.18]; // %maxHP return-arc hit

function _egMechRzrCyclone(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egRzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_rzr_cyclone', '🪃 BLADE CYCLONE — the fan flies out and comes back CROSSING! Read the return arcs!', '#fde047');

    const ax = W * 0.85, ay = H * 0.5;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-rzr-anchor', '🪃');
    anchor.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';

    const blades = [];
    let wave2 = false;

    const throwFan = () => {
        const n = EG_RZR_FAN_N[p];
        for (let i = 0; i < n; i++) {
            const tx = 40;
            const ty = H * (0.15 + (n === 1 ? 0.5 : i / (n - 1)) * 0.7);
            const el = _egNkEl(run, 'div', 'eg-nk-dot eg-rzr-blade', '🪃');
            el.style.display = 'none';
            // Curved return: control point perpendicular to the out leg,
            // alternating sides so the arcs cross each other.
            const midx = (ax + tx) / 2, midy = (ay + ty) / 2;
            const side = i % 2 === 0 ? 1 : -1;
            const cx = midx + side * W * 0.16;
            const cy = midy + side * H * 0.22;
            blades.push({
                x: ax, y: ay, tx, ty, cx, cy,
                leg: 'out', u: 0, t: -i * EG_RZR_STAGGER_MS * _EG_RZR_DEBUG_MULT,
                hitOut: false, hitBack: false, rot: 0, el,
            });
        }
    };
    throwFan();

    _egNkLoop(run, (dtS) => {
        let pending = false;
        const pr = _egNkPlayerRect();

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
                const step = Math.min(d, EG_RZR_OUT_SPD * dtS);
                b.x += (dx / d) * step;
                b.y += (dy / d) * step;
                if (pr && _egNkDotHit(b.el, pr, 0) && !b.hitOut) {
                    b.hitOut = true;
                    const dealt = _egNkHit(EG_RZR_OUT_DMG[p], 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Razor', 'Blade Cyclone');
                }
                if (d <= 12) { b.leg = 'back'; b.hitBack = false; }
            } else {
                // Curved return along a quadratic bezier target → control → anchor.
                const approxLen = (Math.hypot(b.tx - b.cx, b.ty - b.cy) + Math.hypot(b.cx - ax, b.cy - ay)) * 0.85 || 1;
                b.u += (EG_RZR_BACK_SPD / approxLen) * dtS;
                const v = Math.min(1, b.u), iv = 1 - v;
                b.x = iv * iv * b.tx + 2 * iv * v * b.cx + v * v * ax;
                b.y = iv * iv * b.ty + 2 * iv * v * b.cy + v * v * ay;
                if (pr && _egNkDotHit(b.el, pr, 0) && !b.hitBack) {
                    b.hitBack = true;
                    const dealt = _egNkHit(EG_RZR_BACK_DMG[p], 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Razor', 'Cyclone Return');
                }
                if (v >= 1) { b.leg = 'done'; b.el.style.display = 'none'; }
            }
            b.el.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px) rotate(' + Math.round(b.rot) + 'deg)';
        });

        // Phase 3: the second fan launches while the first is returning.
        if (p >= 3 && !wave2 && blades.length && blades.every(b => b.leg === 'back' || b.leg === 'done')) {
            wave2 = true;
            throwFan();
            _egNkToast('eg_mech_rzr_cyclone2', '🪃 SECOND FAN — the returns cross the new throws!', '#fde047');
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: RAZOR WIRE LATTICE (60%)----------------------
//------------------------------------------------------------------------
// Taut wires snap across the arena, hold, then SNAP — the cut ends whip
// outward and sting anyone still near the line. Phase 3: five wires, one
// arrives already taut.
const EG_RZR_WIRE_N     = [0, 0, 3, 5];  // wires per cast, by phase
const EG_RZR_WIRE_WARN  = 1400;          // dashed telegraph (ms)
const EG_RZR_WIRE_HOLD  = 4500;          // taut hold (ms)
const EG_RZR_WIRE_DPS   = [0, 0, 6.0, 7.5]; // %/s touching a taut wire
const EG_RZR_WIRE_WHIP  = [0, 0, 0.14, 0.16]; // %maxHP caught by the snap-whip
const EG_RZR_WHIP_R     = 42;            // whip punish radius (px)

function _egMechRzrWires(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egRzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_rzr_wires', '🪃 RAZOR WIRES — the arena is strung taut. Path between them, then LEAVE the line!', '#fde047');

    const n = EG_RZR_WIRE_N[p];
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
        const el = _egNkEl(run, 'div', 'eg-rzr-wire eg-rzr-wire-warn');
        const len = Math.hypot(x2 - x1, y2 - y1);
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        el.style.left = Math.round(x1) + 'px';
        el.style.top = Math.round(y1 - 1) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.transformOrigin = '0 50%';
        el.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
        // Phase 3: the last wire arrives already taut (shorter telegraph).
        const warn = (p >= 3 && i === n - 1) ? 500 * _EG_RZR_DEBUG_MULT : EG_RZR_WIRE_WARN * _EG_RZR_DEBUG_MULT;
        wires.push({ x1, y1, x2, y2, el, tautAt: performance.now() + warn, dieAt: 0, snapped: false });
    }

    let holdStarted = 0;   // (set below when the first wire turns taut)
    _egNkLoop(run, (dtS, now) => {
        const pc = _egRzrPC();
        let pending = false;

        for (const w of wires) {
            if (w.snapped) continue;
            pending = true;
            if (now < w.tautAt) continue;
            if (!w.dieAt) {
                // Turn taut.
                if (!holdStarted) holdStarted = now;
                w.el.classList.remove('eg-rzr-wire-warn');
                w.el.classList.add('eg-rzr-wire-taut');
                w.dieAt = now + EG_RZR_WIRE_HOLD * _EG_RZR_DEBUG_MULT;
            }
            if (now < w.dieAt) {
                // Contact DoT while taut.
                if (_egPtSegDist(pc.x, pc.y, w.x1, w.y1, w.x2, w.y2) < 14) {
                    _egNkDotTick(run, EG_RZR_WIRE_DPS[p], dtS, level, 'lightning');
                } else {
                    run.dotAcc = 0;
                }
            } else {
                // SNAP: one sting if you linger near the line, ends whip out.
                w.snapped = true;
                w.el.classList.add('eg-rzr-wire-snap');
                const d = _egPtSegDist(pc.x, pc.y, w.x1, w.y1, w.x2, w.y2);
                if (d < EG_RZR_WHIP_R) {
                    _egRzrTouch(EG_RZR_WIRE_WHIP[p], level, 'Wire Whip');
                }
                // The two cut ends scythe outward (visual).
                const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
                for (const dir of [-1, 1]) {
                    const seg = _egNkEl(run, 'div', 'eg-rzr-whip-seg');
                    seg.style.left = Math.round((w.x1 + w.x2) / 2) + 'px';
                    seg.style.top = Math.round((w.y1 + w.y2) / 2) + 'px';
                    seg.style.transform = 'rotate(' + (ang * 180 / Math.PI).toFixed(2) + 'deg)';
                    seg.style.setProperty('--rzr-whip-dx', Math.round(Math.cos(ang) * dir * 320) + 'px');
                    seg.style.setProperty('--rzr-whip-dy', Math.round(Math.sin(ang) * dir * 320) + 'px');
                    setTimeout(() => { try { seg.remove(); } catch (e) {} }, 420 * _EG_RZR_DEBUG_MULT);
                }
                setTimeout(() => { try { w.el.remove(); } catch (e) {} }, 450 * _EG_RZR_DEBUG_MULT);
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
const EG_RZR_HONE_MS    = [0, 0, 7000, 5500]; // hone time by phase
const EG_RZR_STONE_R    = 58;            // body-check radius
const EG_RZR_STONE_HP   = 2;             // body-checks to shatter
const EG_RZR_GRIND_R    = 96;            // grind aura radius
const EG_RZR_GRIND_DPS  = 3.0;           // %/s standing in the grind aura
const EG_RZR_SCYTHE_DMG = [0, 0, 0.24, 0.30]; // %maxHP caught by the scythe
const EG_RZR_SCYTHE_WARN = 1100;         // telegraph before the sweep
const EG_RZR_SCYTHE_SPD = 1100;          // px/s blade travel
const EG_RZR_HEAL_CANCEL = 0.12;         // %maxHP heal for shattering the stone

function _egMechRzrHone(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egRzrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_rzr_hone', '🪃 HONE AND CAST — the whetstone grinds a GIANT BLADE. Smash the stone to cancel it!', '#fde047');

    // Plant the whetstone away from the player.
    const pc0 = _egRzrPC();
    let sx = W * 0.5, sy = H * 0.5;
    for (let tries = 0; tries < 24; tries++) {
        sx = W * (0.18 + Math.random() * 0.64);
        sy = H * (0.22 + Math.random() * 0.56);
        if (Math.hypot(sx - pc0.x, sy - pc0.y) > 200) break;
    }
    const stone = _egNkEl(run, 'div', 'eg-rzr-stone', '🪨');
    stone.style.left = Math.round(sx - EG_RZR_STONE_R) + 'px';
    stone.style.top = Math.round(sy - EG_RZR_STONE_R) + 'px';
    stone.style.width = (EG_RZR_STONE_R * 2) + 'px';
    stone.style.height = (EG_RZR_STONE_R * 2) + 'px';
    const grind = _egNkEl(run, 'div', 'eg-rzr-grind');
    grind.style.left = Math.round(sx - EG_RZR_GRIND_R) + 'px';
    grind.style.top = Math.round(sy - EG_RZR_GRIND_R) + 'px';
    grind.style.width = (EG_RZR_GRIND_R * 2) + 'px';
    grind.style.height = (EG_RZR_GRIND_R * 2) + 'px';

    const state = { honed: false, shattered: false, hp: EG_RZR_STONE_HP, lastHit: 0, scythes: 0, scythesTotal: p >= 3 ? 2 : 1, bandY: 0, axis: 'h', dir: 1 };
    let honeT = 0;   // run.born is not part of the run contract — time it here
    const honeMs = EG_RZR_HONE_MS[p] * _EG_RZR_DEBUG_MULT;

    _egNkLoop(run, (dtS, now) => {
        honeT += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egRzrPC();
        let pending = true;

        // Grind aura chips.
        if (!state.shattered && Math.hypot(pc.x - sx, pc.y - sy) < EG_RZR_GRIND_R) {
            _egNkDotTick(run, EG_RZR_GRIND_DPS, dtS, level, 'lightning');
        } else {
            run.dotAcc = 0;
        }

        // Body-check the stone (visit cooldown → two deliberate trips).
        if (!state.shattered && !state.honed && pr
            && Math.hypot(pc.x - sx, pc.y - sy) < EG_RZR_STONE_R
            && now >= state.lastHit) {
            state.lastHit = now + 450 * _EG_RZR_DEBUG_MULT;
            state.hp--;
            stone.classList.remove('eg-rzr-stone-hit');
            void stone.offsetWidth;
            stone.classList.add('eg-rzr-stone-hit');
            if (state.hp <= 0) {
                state.shattered = true;
                stone.classList.add('eg-rzr-stone-shattered');
                _egRzrHeal(_egNkMaxHP() * EG_RZR_HEAL_CANCEL);
                _egNkToast('eg_mech_rzr_stone', '🪃🪨 WHETSTONE SHATTERED — the cast is cancelled! (+heal)', '#4ade80');
            }
        }

        // Hone completes → the giant scythe.
        if (!state.shattered && !state.honed && honeT >= honeMs) {
            state.honed = true;
            stone.classList.add('eg-rzr-stone-dim');
            grind.classList.add('eg-rzr-grind-done');
            _egNkToast('eg_mech_rzr_scythe', '🪃 THE GIANT SCYTHE is honed — the arena is its path!', '#f97316');
            // Lock the sweep band to your current position, alternating axis.
            state.axis = state.scythes % 2 === 0 ? 'h' : 'v';
            state.dir = state.scythes % 2 === 0 ? 1 : -1;
            state.bandY = state.axis === 'h' ? pc.y : pc.x;
            const band = _egNkEl(run, 'div', 'eg-nk-band eg-rzr-scythe-warn');
            if (state.axis === 'h') {
                band.style.left = '0px'; band.style.top = Math.round(state.bandY - 55) + 'px';
                band.style.width = W + 'px'; band.style.height = '110px';
            } else {
                band.style.left = Math.round(state.bandY - 55) + 'px'; band.style.top = '0px';
                band.style.width = '110px'; band.style.height = H + 'px';
            }
            state.warnUntil = now + EG_RZR_SCYTHE_WARN * _EG_RZR_DEBUG_MULT;
            state.band = band;
        }

        // Scythe sweep after its telegraph.
        if (state.honed && state.band && now >= state.warnUntil && !state.sweeping) {
            state.sweeping = true;
            state.band.classList.add('eg-nk-band-hit');
            _egNkSlamShatter(state.band, run);
            state.bladeX = state.dir > 0 ? -80 : (state.axis === 'h' ? W : H) + 80;
            state.bladeY = state.bandY;
            const blade = _egNkEl(run, 'div', 'eg-nk-dot eg-rzr-giant', '⚔️');
            state.bladeEl = blade;
            state.bladeHit = false;
        }
        if (state.sweeping && state.bladeEl) {
            state.bladeX += state.dir * EG_RZR_SCYTHE_SPD * dtS;
            const bx = state.axis === 'h' ? state.bladeX : state.bandY;
            const by = state.axis === 'h' ? state.bandY : state.bladeX;
            state.bladeEl.style.transform = 'translate(' + Math.round(bx - 38) + 'px,' + Math.round(by - 38) + 'px)';
            if (pr && !state.bladeHit) {
                const inBand = state.axis === 'h'
                    ? Math.abs(pc.y - state.bandY) < 55
                    : Math.abs(pc.x - state.bandY) < 55;
                if (inBand) {
                    state.bladeHit = true;
                    const dealt = _egNkHit(EG_RZR_SCYTHE_DMG[p], 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Razor', 'Giant Scythe');
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
// condense into THE LAST EDGE — one full-screen scythe with a single safe
// pocket: the whetstone's grind aura (which chips you while you stand in
// it). Charge bar frozen (gate in _egTickPlayer via _egRzrFinalActive).
const EG_RZR_SPOKES      = 9;       // spokes on the clock
const EG_RZR_SPOKE_LEN_F = 0.46;    // spoke length × min(W,H)
const EG_RZR_SPOKE_DPS   = 8.0;     // %/s touching a spoke
const EG_RZR_CYCLES      = 3;       // rotation cycles before THE LAST EDGE
const EG_RZR_CYCLE_MS    = 6000;    // cycle length (reverse at the midpoint)
const EG_RZR_REV_SPD     = 22;      // deg/s spoke rotation
const EG_RZR_FAN_BLADES  = 2;       // rim-fan blades per reversal
const EG_RZR_LAST_DMG    = 0.35;    // %maxHP outside the safe pocket
const EG_RZR_POCKET_R    = 110;     // safe pocket radius (the grind aura)
const EG_RZR_POCKET_DPS  = 2.5;     // %/s chip inside the safe pocket
const EG_RZR_FAILSAFE_MS = 30000;   // hard cap on the set-piece

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egRzrFinal = null;

function _egRzrFinalActive() {
    return !!_egRzrFinal && !_egRzrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egRzrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egRzrEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egRzrEnsureFinalWatcher(monster) {
    if (!monster || _egRzrFinal || _egRzrWatcherRun) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egRzrWatcherRun = run;
    _egNkLoop(run, () => {
        if (_egRzrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egRzrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
let _egRzrWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
function _egRzrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egRzrFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egRzrFinalStart(monster) {
    if (_egRzrFinal || !monster) return;

    // The Razor clears the arena for the bladestorm: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null, spokeEls: [],
        cx: W / 2, cy: H / 2,
        spokeLen: Math.min(W, H) * EG_RZR_SPOKE_LEN_F,
        ang: Math.random() * Math.PI * 2,
        dir: 1,
        cycle: 0,
        pocket: null,   // { x, y, el } for THE LAST EDGE
    };
    _egRzrFinal = g;

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
    ov.className = 'eg-rzr-cd';
    ov.innerHTML =
        '<div class="eg-rzr-cd-label">🪃 A THOUSAND EDGES</div>' +
        '<div class="eg-rzr-cd-hint">Walk WITH the spoke clock — it REVERSES, and every reversal shaves a fan across the middle. Survive three cycles for THE LAST EDGE: only the whetstone\u2019s grind aura is safe, and it CHIPS you to stand there!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_rzr_final_cd', '🪃💀 A THOUSAND EDGES — walk the spoke clock. It reverses!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the whetted glow while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-rzr-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Spoke clock: nine rotating wires + reversal fans. ─────────────────
    for (let i = 0; i < EG_RZR_SPOKES; i++) {
        const el = _egNkEl(g.fxRun, 'div', 'eg-rzr-spoke');
        el.style.width = Math.round(g.spokeLen) + 'px';
        el.style.left = Math.round(g.cx) + 'px';
        el.style.top = Math.round(g.cy - 1) + 'px';
        el.style.transformOrigin = '0 50%';
        g.spokeEls.push(el);
    }

    // One rim fan: blades cross the arena through the centre region. Each
    // blade gets its own run (never share a run across _egNkLoop calls —
    // the second registration would overwrite the first loop's raf handle).
    const rimFan = () => {
        if (g.finished) return;
        for (let i = 0; i < EG_RZR_FAN_BLADES; i++) {
            const fromTop = Math.random() < 0.5;
            const fanRun = _egNkNewRun(monster.id, true);
            const el = _egNkEl(fanRun, 'div', 'eg-nk-dot eg-rzr-blade', '🪃');
            const speed = 430 + i * 60;
            let x = W * (0.25 + Math.random() * 0.5), y = fromTop ? -40 : H + 40;
            const vy = fromTop ? 1 : -1;
            _egNkLoop(fanRun, (dtS) => {
                if (g.finished) return false;
                y += vy * speed * dtS;
                el.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
                const pr = _egNkPlayerRect();
                if (pr && _egNkDotHit(el, pr, 0)) {
                    _egRzrTouch(0.15, level, 'Edge Fan');
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
        if (g.cycle > EG_RZR_CYCLES) { runLastEdge(); return; }
        _egNkToast('eg_mech_rzr_wave', '🪃 EDGE CYCLE ' + g.cycle + '/' + EG_RZR_CYCLES + ' — keep walking with the clock!', '#fde047');

        _egRzrAfter(g, (EG_RZR_CYCLE_MS / 2) * _EG_RZR_DEBUG_MULT, () => {
            if (g.finished) return;
            g.dir *= -1;
            _egNkToast('eg_mech_rzr_reverse', '🪃 REVERSE — the clock spins the other way!', '#f97316');
            rimFan();
            _egRzrAfter(g, (EG_RZR_CYCLE_MS / 2) * _EG_RZR_DEBUG_MULT, () => {
                if (g.finished) return;
                g.dir *= -1;
                rimFan();
                runCycle();
            });
        });
    };

    // ── THE LAST EDGE: one scythe, one safe pocket — the grind aura. ─────
    const runLastEdge = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_rzr_last_edge', '🪃💀 THE LAST EDGE — every blade condenses! The whetstone\u2019s aura is the ONLY safe ground — and it chips you!', '#f97316');
        // Plant the pocket away from the edges.
        let px = W * 0.5, py = H * 0.5;
        for (let tries = 0; tries < 24; tries++) {
            px = W * (0.28 + Math.random() * 0.44);
            py = H * (0.30 + Math.random() * 0.40);
            if (px > EG_RZR_POCKET_R + 30 && px < W - EG_RZR_POCKET_R - 30
                && py > EG_RZR_POCKET_R + 30 && py < H - EG_RZR_POCKET_R - 30) break;
        }
        const pocketEl = _egNkEl(g.fxRun, 'div', 'eg-rzr-grind eg-rzr-stone-safe');
        pocketEl.style.left = Math.round(px - EG_RZR_POCKET_R) + 'px';
        pocketEl.style.top = Math.round(py - EG_RZR_POCKET_R) + 'px';
        pocketEl.style.width = (EG_RZR_POCKET_R * 2) + 'px';
        pocketEl.style.height = (EG_RZR_POCKET_R * 2) + 'px';
        const stoneEl = _egNkEl(g.fxRun, 'div', 'eg-rzr-stone eg-rzr-stone-safe', '🪨');
        stoneEl.style.left = Math.round(px - EG_RZR_STONE_R) + 'px';
        stoneEl.style.top = Math.round(py - EG_RZR_STONE_R) + 'px';
        stoneEl.style.width = (EG_RZR_STONE_R * 2) + 'px';
        stoneEl.style.height = (EG_RZR_STONE_R * 2) + 'px';
        g.pocket = { x: px, y: py, el: pocketEl };

        _egRzrAfter(g, 2400 * _EG_RZR_DEBUG_MULT, () => {
            if (g.finished) return;
            // The condensing scythe: everything outside the pocket is cut.
            document.querySelectorAll('.eg-rzr-spoke').forEach(el => el.classList.add('eg-rzr-spoke-condense'));
            const pc = _egRzrPC();
            const inPocket = Math.hypot(pc.x - px, pc.y - py) < EG_RZR_POCKET_R;
            if (!inPocket) {
                const dealt = _egNkHit(EG_RZR_LAST_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Razor', 'The Last Edge');
            }
            _egRzrAfter(g, 1500 * _EG_RZR_DEBUG_MULT, () => {
                _egRzrFinalEnd(g, monster);
            });
        });
    };

    // ── Spoke rotation + contact ticks (the finale's own loop). ──────────
    // NOTE: rim-fan blades above run on their own short-lived runs; this main
    // loop owns g.fxRun exclusively and self-terminates via g.finished.
    const startAt = performance.now();
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _egRzrPC();

        // Rotate the clock.
        if (!g.pocket) {
            g.ang += g.dir * EG_RZR_REV_SPD * Math.PI / 180 * dtS;
            g.spokeEls.forEach((el, i) => {
                const a = g.ang + i * (Math.PI * 2 / EG_RZR_SPOKES);
                el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(2) + 'deg)';
            });
            // Spoke contact DoT.
            let touching = false;
            for (let i = 0; i < EG_RZR_SPOKES && !touching; i++) {
                const a = g.ang + i * (Math.PI * 2 / EG_RZR_SPOKES);
                const ex = g.cx + Math.cos(a) * g.spokeLen;
                const ey = g.cy + Math.sin(a) * g.spokeLen;
                if (_egPtSegDist(pc.x, pc.y, g.cx, g.cy, ex, ey) < 13) touching = true;
            }
            if (touching) _egNkDotTick(g.fxRun, EG_RZR_SPOKE_DPS, dtS, level, 'lightning');
            else g.fxRun.dotAcc = 0;

            // Failsafe: never spin forever.
            if (now - startAt > EG_RZR_FAILSAFE_MS) { runLastEdge(); return false; }
        } else {
            // THE LAST EDGE is armed: the pocket chips you while you stand in it.
            if (Math.hypot(pc.x - g.pocket.x, pc.y - g.pocket.y) < EG_RZR_POCKET_R) {
                _egNkDotTick(g.fxRun, EG_RZR_POCKET_DPS, dtS, level, 'lightning');
            } else {
                g.fxRun.dotAcc = 0;
            }
        }
        return true;
    });

    runCycle();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egRzrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-rzr-cd, .eg-rzr-spoke, .eg-rzr-stone, .eg-rzr-grind, .eg-rzr-blade, .eg-rzr-giant').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-rzr-allin');
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
function _egRzrTeardown() {
    if (_egRzrFinal) { try { _egRzrFinalEnd(_egRzrFinal, null); } catch (e) {} _egRzrFinal = null; }
    _egRzrWatcherRun = null;
    document.querySelectorAll('.eg-rzr-blade, .eg-rzr-anchor, .eg-rzr-wire, .eg-rzr-whip-seg, ' +
        '.eg-rzr-stone, .eg-rzr-grind, .eg-rzr-giant, .eg-rzr-spoke, .eg-rzr-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-rzr-allin').forEach(el => el.classList.remove('eg-rzr-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_RZR_DEBUG.fire('cyclone'|'wires'|'hone', phase) — runs one now
//   _EG_RZR_DEBUG.final()                               — A THOUSAND EDGES now
if (typeof window !== 'undefined') {
    window._EG_RZR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_razor') : null;
            if (!monster) return 'no razor alive';
            const fn = name === 'cyclone' ? _egMechRzrCyclone
                : name === 'wires' ? _egMechRzrWires
                : name === 'hone' ? _egMechRzrHone : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_razor') : null;
            if (!monster) return 'no razor alive';
            _egRzrFinalStart(monster);
            return 'A THOUSAND EDGES started';
        },
    };
}
