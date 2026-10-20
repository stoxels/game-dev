import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkSlamShatter, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE SHRINE MAIDEN (boss_shrine)-----------------
//------------------------------------------------------------------------
// Tier-8 rework "The Bound God": knot barriers all fight, mirror spirits
// + ofuda ward from 60%, and the THOUSAND ARMS finale at ≤10%. Shared
// fated_cell pressure comes along (see shared-puzzle-mechanics.js); the
// finale freezes the charge bar via _shrFinalActive.
//------------------------------------------------------------------------

// DEBUG: slow The Shrine Maiden's timing 2.5x so manual playtests /
// screenshot automation can catch mid-animation states. Off for ship.
export const _SHR_DEBUG_SLOW = false;
export const _SHR_DEBUG_MULT = _SHR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_shrine: {
        id: 'boss_shrine', name: 'The Shrine Maiden', emoji: '⛩️',
        baseHP: 980, baseDamage: 22, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_shrine - "The Bound God" (rework)
    // Phase 1 (100% → 60%): Knot Barriers + Fated Cell
    // Phase 2 ( 60% → 30%): immune window; Mirror Spirits + Ofuda Ward join
    // Phase 3 ( 30% →  0%): quadrants, forward-playing mirrors, double
    //                        seals; at 10% THOUSAND ARMS begins
    boss_shrine: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'knot_barriers', intervalBase: 20000, intervalVariance: 5000, handler: '_mechShrBarriers' },
            { name: 'fated_cell', intervalBase: 22000, intervalVariance: 5000, handler: '_mechFatedCell' },
            { name: 'mirror_spirits', intervalBase: 22000, intervalVariance: 5000, handler: '_mechShrMirrors', phase2Only: true },
            { name: 'ofuda_ward', intervalBase: 26000, intervalVariance: 6000, handler: '_mechShrWard', phase2Only: true },
        ],
        onPhaseEnter: _shrOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const SHR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Shrine hazards. Lightning-element boss -
// hits go in with element 'lightning' so the toast palette stays yellow.
export let _shrHitCd = 0;
export function _shrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _shrHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _shrHitCd = now + SHR_TOUCH_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, 'The Shrine Maiden', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _shrPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
export function _shrHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = globalThis.playerCurrentHP;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP || before, before + (globalThis._lifeGain ? globalThis._lifeGain(amount) : (amount)));
    if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: KNOT BARRIERS (all fight)-------------------
//------------------------------------------------------------------------
// Sacred rope anchors drop on both edges and draw paper barrier bars
// between them (shimenawa knots → taut shide streamers). The bars hum
// (warn) then LIGHT: crossing lightning paper, tick DoT on contact. The
// "knot" honours the shimenawa: whichever endpoint the player stands
// closer to, that side's rope stays - the barrier persists around that
// anchor as a vertical wall segment for 3s before it burns away. Phase 3:
// a vertical pair crosses the horizontal one (quadrant pressure).
export const SHR_BARS_N    = [0, 2, 3, 3]; // horizontal barriers by phase
export const SHR_HUM_MS    = 1500;         // dashed hum telegraph
export const SHR_LIT_MS    = 6000;         // lit lifetime
export const SHR_BAR_DPS   = [0, 5.5, 6.5, 8.0]; // %/s touching a lit barrier
export const SHR_KNOT_MS   = 3000;         // post-knot wall lifetime
export const SHR_KNOT_DPS  = [0, 4.0, 5.0, 6.5]; // %/s touching a knot wall
export const SHR_KNOT_R    = 26;           // wall half-width around the rope
export const SHR_BURN_DMG  = [0, 0.10, 0.12, 0.14]; // %maxHP: wall burns away

export function _mechShrBarriers(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _shrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_shr_bars', '⛩️ KNOT BARRIERS - the shimenawa bind the lanes. Slip between them, then leave before the knot BURNS!', '#fde047');

    const bars = [];
    const makeBar = (y, vertical) => {
        const el = _nkEl(run, 'div', 'sx-shr-bar sx-shr-bar-warn');
        if (vertical) {
            el.style.left = Math.round(y - 7) + 'px'; el.style.top = '0px';
            el.style.width = '14px'; el.style.height = H + 'px';
        } else {
            el.style.left = '0px'; el.style.top = Math.round(y - 7) + 'px';
            el.style.width = W + 'px'; el.style.height = '14px';
        }
        return el;
    };
    const n = SHR_BARS_N[p];
    for (let i = 0; i < n; i++) {
        // Spread rows, nudged so they never stack exactly.
        const y = H * (0.18 + (i / Math.max(1, n - 1)) * 0.64 + (Math.random() * 0.08 - 0.04));
        const el = makeBar(y, false);
        bars.push({ axis: 'h', pos: y, el, tautAt: performance.now() + SHR_HUM_MS * _SHR_DEBUG_MULT, dieAt: 0, knotEl: null, knotSide: 0 });
    }
    // Phase 3: one vertical barrier crosses the horizontals.
    if (p >= 3) {
        const x = W * (0.25 + Math.random() * 0.5);
        const el = makeBar(x, true);
        bars.push({ axis: 'v', pos: x, el, tautAt: performance.now() + (SHR_HUM_MS + 900) * _SHR_DEBUG_MULT, dieAt: 0, knotEl: null, knotSide: 0 });
    }

    _nkLoop(run, (dtS, now) => {
        const pc = _shrPC();

        for (const b of bars) {
            if (b.dead) continue;

            if (!b.dieAt) {
                // Still humming (or just turning lit).
                if (now < b.tautAt) continue;
                b.el.classList.remove('sx-shr-bar-warn');
                b.el.classList.add('sx-shr-bar-lit');
                b.dieAt = now + SHR_LIT_MS * _SHR_DEBUG_MULT;
            }

            // Contact DoT while lit.
            const d = b.axis === 'h' ? Math.abs(pc.y - b.pos) : Math.abs(pc.x - b.pos);
            if (d < 12) _nkDotTick(run, SHR_BAR_DPS[p], dtS, level, 'lightning');
            else run.dotAcc = 0;

            if (now < b.dieAt) continue;

            // The KNOT: the rope on the player's side holds. A vertical wall
            // segment grows from the anchor, holds 3s, then BURNS AWAY.
            b.dead = true;
            b.el.classList.add('sx-shr-bar-knotting');
            const fromTop = b.axis === 'h' ? (pc.y < b.pos) : (pc.x < b.pos);
            b.knotSide = fromTop ? -1 : 1;
            const len = b.axis === 'h'
                ? (fromTop ? b.pos : H - b.pos)
                : (fromTop ? b.pos : W - b.pos);
            const kel = _nkEl(run, 'div', 'sx-shr-knotwall');
            if (b.axis === 'h') {
                kel.style.left = '0px';
                kel.style.top = Math.round(fromTop ? 0 : b.pos - SHR_KNOT_R) + 'px';
                kel.style.width = Math.round(len) + 'px';
                kel.style.height = (SHR_KNOT_R * 2) + 'px';
            } else {
                kel.style.left = Math.round(fromTop ? 0 : b.pos - SHR_KNOT_R) + 'px';
                kel.style.top = '0px';
                kel.style.width = (SHR_KNOT_R * 2) + 'px';
                kel.style.height = Math.round(len) + 'px';
            }
            b.knotEl = kel;
            b.knotDieAt = now + SHR_KNOT_MS * _SHR_DEBUG_MULT;
        }

        // Knot walls: tick, expire, burn.
        for (const b of bars) {
            if (!b.knotEl || b.burned) continue;
            const d = b.axis === 'h' ? Math.abs(pc.y - b.pos) : Math.abs(pc.x - b.pos);
            // Same-side check as the wall's growth direction (per axis).
            const sideOK = b.axis === 'h'
                ? (b.knotSide < 0 ? pc.y < b.pos : pc.y > b.pos)
                : (b.knotSide < 0 ? pc.x < b.pos : pc.x > b.pos);
            if (sideOK && d < SHR_KNOT_R) _nkDotTick(run, SHR_KNOT_DPS[p], dtS, level, 'lightning');
            if (now >= b.knotDieAt) {
                b.burned = true;
                b.knotEl.classList.add('sx-shr-knotwall-burn');
                if (sideOK && d < SHR_KNOT_R + 8) {
                    _shrTouch(SHR_BURN_DMG[p], level, 'Knot Burn');
                }
                const kel = b.knotEl;
                setTimeout(() => { try { kel.remove(); } catch (e) {} }, 600 * _SHR_DEBUG_MULT);
                b.knotEl = null;
            }
        }

        // Done when every barrier has knotted AND burned.
        return bars.some(b => !b.dead || (b.knotEl && !b.burned));
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: MIRROR SPIRITS (60%)--------------------------
//------------------------------------------------------------------------
// The Maiden fans out five mirror spirits from an anchored ⛩️ (the classic
// five-way spirit fan, kept) while a SPIRIT SIGNATURE records your
// movement: after 2.5s it SHATTERS - a mirror spirit copies your last
// 1.5s of steps and detonates your route in REVERSE. Stand still to feed
// it nothing; keep your path crossing your old one and you eat both.
// Phase 3: the shard plays your route FORWARD as it detonates.
export const SHR_FAN_N      = [0, 0, 5, 7];  // orbs per fan, by phase
export const SHR_FAN_SPD    = [0, 0, 140, 165];
export const SHR_FAN_DMG    = [0, 0, 0.06, 0.08]; // %maxHP orb hit
export const SHR_REC_MS     = 2500;          // record window (visible dashes)
export const SHR_ROUTE_MS   = 1500;          // length of route played back
export const SHR_SHARD_DMG  = [0, 0, 0.13, 0.16]; // %maxHP caught by a route echo
export const SHR_STOP_DMG   = [0, 0, 0.16, 0.19]; // %maxHP SIGNATURE STRIKE

export function _mechShrMirrors(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _shrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_shr_mirrors', '⛩️ MIRROR SPIRITS - the fans fly, and your SIGNATURE records. Stop repeating yourself!', '#fde047');

    // ── Anchor + spirit fan (the old soul, kept). ────────────────────────
    const ax = W * 0.15, ay = H * 0.5;
    const anchor = _nkEl(run, 'div', 'sx-nk-dot sx-shr-anchor', '⛩️');
    anchor.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';
    const orbs = [];
    if (p >= 2) {
        const fanN = SHR_FAN_N[p];
        const base = Math.atan2(_shrPC().y - ay, _shrPC().x - ax);
        const spread = 0.35 * 2 / Math.max(1, fanN - 1);
        for (let i = 0; i < fanN; i++) {
            const a = base + (i - (fanN - 1) / 2) * spread;
            const el = _nkEl(run, 'div', 'sx-nk-dot sx-nk-orb-spirit');
            orbs.push({ x: ax, y: ay, vx: Math.cos(a) * SHR_FAN_SPD[p], vy: Math.sin(a) * SHR_FAN_SPD[p], hitDone: false, el });
        }
    }

    // ── Spirit signature: record → shatter → playback. ───────────────────
    const rec = [];
    const trailEl = _nkEl(run, 'div', 'sx-shr-trail');
    let recUntil = performance.now() + SHR_REC_MS * _SHR_DEBUG_MULT;
    let shatterAt = recUntil + 400 * _SHR_DEBUG_MULT;
    let shone = false;
    const shard = _nkEl(run, 'div', 'sx-shr-shard', '🔷');
    let u = 0, route = null, echoes = [];
    let bandArmed = false, bandEl = null, bandHitAt = 0, endPt = null, strikeDone = false;
    shard.style.opacity = '0';   // hidden until the signature shatters

    _nkLoop(run, (dtS, now) => {
        const pc = _shrPC();
        const pr = _nkPlayerRect();

        // Spirit fan orbs.
        for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.x += o.vx * dtS; o.y += o.vy * dtS;
            if (o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) { o.el.remove(); orbs.splice(i, 1); continue; }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && _nkDotHit(o.el, pr, 2)) {
                o.hitDone = true;
                const dealt = _nkHit(SHR_FAN_DMG[p], 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Shrine Maiden', 'Spirit Fans');
            }
        }

        // Record (sample every 40 ms) while the window is open.
        if (now < recUntil) {
            rec._last = rec._last || 0;
            if (now - rec._last >= 40) { rec._last = now; rec.push({ x: pc.x, y: pc.y }); }
            trailEl.style.left = Math.round(pc.x - 16) + 'px';
            trailEl.style.top = Math.round(pc.y - 16) + 'px';
            trailEl.style.opacity = '0.5';
        } else if (!shone && now >= shatterAt) {
            // SHATTER: build the playback route from the last 1.5s.
            shone = true;
            trailEl.style.opacity = '0.12';
            route = rec.slice(-Math.min(rec.length, 38));
            if (route.length >= 2) {
                // Detonation follows the shard: sample ~10 evenly-spaced
                // points; each echo's fuse is the shard's arrival time there.
                const N = route.length;
                const dur = N * 60 * _SHR_DEBUG_MULT;
                const stride = Math.max(1, Math.floor(N / 10));
                for (let i = 0; i < N; i += stride) {
                    const frac = i / (N - 1);
                    const pt = route[i];
                    echoes.push({
                        x: pt.x, y: pt.y, hit: false, done: false,
                        t: (p >= 3 ? frac : 1 - frac) * dur,   // reverse: newest first
                    });
                }
                shard.style.opacity = '1';
                _nkToast('eg_mech_shr_shatter', '⛩️ SIGNATURE SHATTERS - your route replays! Break the pattern!', '#f97316');
            }
        }

        // Shard chases the route head (the visible mirror spirit).
        if (route && route.length >= 2) {
            const dur = route.length * 60 * _SHR_DEBUG_MULT;
            u += dtS * 1000;
            const k = Math.min(1, u / dur);
            const idx = p >= 3 ? Math.floor(k * (route.length - 1)) : Math.floor((1 - k) * (route.length - 1));
            const pt = route[Math.max(0, Math.min(route.length - 1, idx))];
            shard.style.transform = 'translate(' + Math.round(pt.x - 13) + 'px,' + Math.round(pt.y - 13) + 'px)';
            // Echo detonations.
            for (const e of echoes) {
                if (e.hit) continue;
                e.t -= dtS * 1000;
                if (e.t <= 0) {
                    e.hit = true;
                    const bump = _nkEl(run, 'div', 'sx-shr-echo');
                    bump.style.left = Math.round(e.x - 22) + 'px';
                    bump.style.top = Math.round(e.y - 22) + 'px';
                    setTimeout(() => { try { bump.remove(); } catch (err) {} }, 320 * _SHR_DEBUG_MULT);
                    if (!e.done && Math.hypot(pc.x - e.x, pc.y - e.y) < 34) {
                        e.done = true;
                        _shrTouch(SHR_SHARD_DMG[p], level, 'Signature Echo');
                    }
                }
            }
            // Where the shard stops = the SIGNATURE STRIKE (armed in-loop so
            // the band can never outlive the run).
            if (k >= 1 && !bandArmed) {
                bandArmed = true;
                endPt = route[p >= 3 ? route.length - 1 : 0];
                bandEl = _nkEl(run, 'div', 'sx-nk-band sx-shr-strike-warn');
                bandEl.style.left = Math.round(endPt.x - 60) + 'px';
                bandEl.style.top = Math.round(endPt.y - 60) + 'px';
                bandEl.style.width = '120px'; bandEl.style.height = '120px';
                bandHitAt = now + 700 * _SHR_DEBUG_MULT;
            }
        }

        // Strike resolution (in-loop, not a setTimeout).
        if (bandArmed && !strikeDone && now >= bandHitAt && bandEl) {
            bandEl.classList.add('sx-nk-band-hit');
            if (endPt && Math.hypot(pc.x - endPt.x, pc.y - endPt.y) < 60) {
                _shrTouch(SHR_STOP_DMG[p], level, 'Signature Strike');
            }
            strikeDone = true;
            const bEl = bandEl;
            setTimeout(() => { try { bEl.remove(); } catch (e) {} }, 300 * _SHR_DEBUG_MULT);
        }

        // Keep running while: fan orbs fly, recording is open, the route
        // plays back, or the strike band is still resolving.
        if (orbs.length > 0) return true;
        if (!shone) return true;
        if (!route || route.length < 2) return now < shatterAt + 600;
        return echoes.some(e => !e.hit) || (bandArmed && !strikeDone);
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: OFUDA WARD (60%)------------------------------
//------------------------------------------------------------------------
// The Maiden plants a golden OFUDA talisman and begins the chant; the ward
// channel ticks shadow damage while it stands. Body-check the ofuda 3× to
// tear it down (+12% heal) and cancel the chant; fail and a SHINTO SEAL
// crosses the whole arena at your row (wide vertical gate sweep, lightning
// punish). Phase 3: the seal sweeps back the other way after the first.
export const SHR_WARD_MS    = [0, 0, 7000, 5500]; // chant time by phase
export const SHR_WARD_R     = 58;            // body-check radius
export const SHR_WARD_HP    = 3;             // body-checks to tear down
export const SHR_CHAN_DPS   = 2.6;           // %/s chant channel (shadow)
export const SHR_SEAL_DMG   = [0, 0, 0.24, 0.30]; // %maxHP caught by the seal
export const SHR_SEAL_WARN  = 1100;          // telegraph before the sweep
export const SHR_SEAL_SPD   = 1100;          // px/s seal travel
export const SHR_HEAL_CANCEL = 0.12;         // %maxHP heal for tearing the ward

export function _mechShrWard(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _shrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_shr_ward', '⛩️ OFUDA WARD - the chant drains you. Tear the talisman down to CANCEL it!', '#fde047');

    // Plant the ward away from the player.
    const pc0 = _shrPC();
    let sx = W * 0.5, sy = H * 0.5;
    for (let tries = 0; tries < 24; tries++) {
        sx = W * (0.18 + Math.random() * 0.64);
        sy = H * (0.22 + Math.random() * 0.56);
        if (Math.hypot(sx - pc0.x, sy - pc0.y) > 200) break;
    }
    const ward = _nkEl(run, 'div', 'sx-shr-ward', '🧿');
    ward.style.left = Math.round(sx - SHR_WARD_R) + 'px';
    ward.style.top = Math.round(sy - SHR_WARD_R) + 'px';
    ward.style.width = (SHR_WARD_R * 2) + 'px';
    ward.style.height = (SHR_WARD_R * 2) + 'px';

    const state = { torn: false, chantDone: false, hp: SHR_WARD_HP, lastHit: 0, seals: 0, sealsTotal: p >= 3 ? 2 : 1, bandX: 0, axis: 'v', dir: 1 };
    let chantT = 0;
    const chantMs = SHR_WARD_MS[p] * _SHR_DEBUG_MULT;

    _nkLoop(run, (dtS, now) => {
        chantT += dtS * 1000;
        const pr = _nkPlayerRect();
        const pc = _shrPC();
        let pending = true;

        // Chant channel ticks (shadow) while the ward stands. Torn ward →
        // the run ends here (otherwise the loop would never finish).
        if (state.torn) return false;
        if (!state.chantDone) {
            _nkDotTick(run, SHR_CHAN_DPS, dtS, level, 'shadow');
        }

        // Body-check the ofuda (visit cooldown → three deliberate trips).
        if (!state.torn && !state.chantDone && pr
            && Math.hypot(pc.x - sx, pc.y - sy) < SHR_WARD_R
            && now >= state.lastHit) {
            state.lastHit = now + 450 * _SHR_DEBUG_MULT;
            state.hp--;
            ward.classList.remove('sx-shr-ward-hit');
            void ward.offsetWidth;
            ward.classList.add('sx-shr-ward-hit');
            if (state.hp <= 0) {
                state.torn = true;
                ward.classList.add('sx-shr-ward-torn');
                _shrHeal(_nkMaxHP() * SHR_HEAL_CANCEL);
                _nkToast('eg_mech_shr_torn', '⛩️🧿 OFUDA TORN - the chant is cancelled! (+heal)', '#4ade80');
            }
        }

        // Chant completes → the Shinto Seal.
        if (!state.torn && !state.chantDone && chantT >= chantMs) {
            state.chantDone = true;
            ward.classList.add('sx-shr-ward-dim');
            _nkToast('eg_mech_shr_seal', '⛩️ THE SHINTO SEAL - the ward closes on your row!', '#f97316');
            state.axis = 'v';
            state.dir = state.seals % 2 === 0 ? 1 : -1;
            state.bandX = pc.x;
            const band = _nkEl(run, 'div', 'sx-nk-band sx-shr-seal-warn');
            band.style.left = Math.round(state.bandX - 55) + 'px'; band.style.top = '0px';
            band.style.width = '110px'; band.style.height = H + 'px';
            state.warnUntil = now + SHR_SEAL_WARN * _SHR_DEBUG_MULT;
            state.band = band;
        }

        // Seal sweep after its telegraph.
        if (state.chantDone && state.band && now >= state.warnUntil && !state.sweeping) {
            state.sweeping = true;
            state.band.classList.add('sx-nk-band-hit');
            _nkSlamShatter(state.band, run);
            state.sealX = state.dir > 0 ? -80 : W + 80;
            state.sealY = state.bandX;
            const sealEl = _nkEl(run, 'div', 'sx-nk-dot sx-shr-seal', '📜');
            state.sealEl = sealEl;
            state.sealHit = false;
        }
        if (state.sweeping && state.sealEl) {
            state.sealX += state.dir * SHR_SEAL_SPD * dtS;
            state.sealEl.style.transform = 'translate(' + Math.round(state.sealX - 30) + 'px,' + Math.round(pc.y - 30) + 'px)';
            if (pr && !state.sealHit) {
                const inBand = Math.abs(pc.x - state.bandX) < 55;
                if (inBand) {
                    state.sealHit = true;
                    const dealt = _nkHit(SHR_SEAL_DMG[p], 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Shrine Maiden', 'Shinto Seal');
                }
            }
            const off = state.sealX;
            if ((state.dir > 0 && off > W + 90) || (state.dir < 0 && off < -90)) {
                try { state.sealEl.remove(); } catch (e) {}
                state.sealEl = null;
                state.sweeping = false;
                if (state.band) { try { state.band.remove(); } catch (e) {} }
                state.band = null;
                state.seals++;
                if (state.seals >= state.sealsTotal) {
                    return false;   // cast complete
                }
            }
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THOUSAND ARMS (≤10%, one-shot)----------------
//------------------------------------------------------------------------
// The bound god unleashes every arm at once: eight radial TORII BEAMS sweep
// like a lighthouse while every few seconds a KNOCK comes - 20 talismans
// land in a grid with ONE revealed safe cell; reach it in 3.5s or the grid
// detonates. Three knocks and the Maiden descends: THE THOUSANDTH ARM -
// one final beam sweep and everything outside a descending safety circle
// is annulled. Charge bar frozen (gate in _tickPlayer via
// _shrFinalActive).
export const SHR_ARMS        = 8;       // torii beams on the lighthouse
export const SHR_ARM_LEN_F   = 0.52;    // beam length × min(W,H)
export const SHR_ARM_DPS     = 8.0;     // %/s touching a beam
export const SHR_BEAM_SPD    = 26;      // deg/s lighthouse rotation
export const SHR_KNOCKS      = 3;       // talisman grids before THE THOUSANDTH ARM
export const SHR_KNOCK_MS    = 8500;    // between knocks
export const SHR_GRID_COLS   = 5;
export const SHR_GRID_ROWS   = 4;
export const SHR_GRID_WARN   = 3500;    // time to reach the safe cell
export const SHR_GRID_DMG    = 0.20;    // %maxHP caught by a grid detonation
export const SHR_THOUS_DMG   = 0.35;    // %maxHP outside the safety circle
export const SHR_SAFE_R      = 105;     // final safety-circle radius
export const SHR_FAILSAFE_MS = 32000;   // hard cap on the set-piece

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _shrFinal = null;

export function _shrFinalActive() {
    return !!_shrFinal && !_shrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _shrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _shrEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _shrEnsureFinalWatcher(monster) {
    if (!monster || _shrFinal || _shrWatcherRun) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _shrWatcherRun = run;
    _nkLoop(run, () => {
        if (_shrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _shrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
export let _shrWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
export function _shrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_shrFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _shrFinalStart(monster) {
    if (_shrFinal || !monster) return;

    // The Shrine clears the arena for the bound god: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null, armEls: [],
        cx: W / 2, cy: H / 2,
        armLen: Math.min(W, H) * SHR_ARM_LEN_F,
        ang: Math.random() * Math.PI * 2,
        knock: 0,
        gridCells: [],   // active talisman grid cells
    };
    _shrFinal = g;

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
    ov.className = 'sx-shr-cd';
    ov.innerHTML =
        '<div class="sx-shr-cd-label">⛩️ THOUSAND ARMS</div>' +
        '<div class="sx-shr-cd-hint">Eight torii beams sweep the shrine and every few seconds a KNOCK comes: 20 talismans land with ONE safe cell - reach it before the grid detonates. Survive three knocks for THE THOUSANDTH ARM: only the descending circle is safe!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_shr_final_cd', '⛩️💀 THOUSAND ARMS - every arm at once. Read the knocks!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the bound-god glow while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-shr-allin');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Eight radial torii beams: the lighthouse. ────────────────────────
    for (let i = 0; i < SHR_ARMS; i++) {
        const el = _nkEl(g.fxRun, 'div', 'sx-shr-beam');
        el.style.width = Math.round(g.armLen) + 'px';
        el.style.left = Math.round(g.cx) + 'px';
        el.style.top = Math.round(g.cy - 1) + 'px';
        el.style.transformOrigin = '0 50%';
        g.armEls.push(el);
    }

    // ── One knock: 20 talismans in a grid, ONE safe cell. ────────────────
    const runKnock = () => {
        if (g.finished) return;
        g.knock++;
        if (g.knock > SHR_KNOCKS) { runThousandthArm(); return; }
        _nkToast('eg_mech_shr_knock', '⛩️ KNOCK ' + g.knock + '/' + SHR_KNOCKS + ' - find the safe cell!', '#fde047');

        // Grid centred on the arena (with a little jitter per knock).
        const cols = SHR_GRID_COLS, rows = SHR_GRID_ROWS;
        const cell = Math.min(W, H) * 0.16;
        const gw = cols * cell, gh = rows * cell;
        const gx = Math.max(20, Math.min(W - gw - 20, W / 2 - gw / 2 + (Math.random() * 120 - 60)));
        const gy = Math.max(20, Math.min(H - gh - 20, H / 2 - gh / 2 + (Math.random() * 80 - 40)));
        const safeCol = Math.floor(Math.random() * cols);
        const safeRow = Math.floor(Math.random() * rows);
        g.gridCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const el = _nkEl(g.fxRun, 'div', 'sx-shr-talisman' + (r === safeRow && c === safeCol ? ' sx-shr-talisman-safe' : ''));
                el.style.left = Math.round(gx + c * cell + 6) + 'px';
                el.style.top = Math.round(gy + r * cell + 6) + 'px';
                el.style.width = Math.round(cell - 12) + 'px';
                el.style.height = Math.round(cell - 12) + 'px';
                g.gridCells.push({ x: gx + c * cell + cell / 2, y: gy + r * cell + cell / 2, safe: r === safeRow && c === safeCol, el });
            }
        }
        performance.now() + SHR_GRID_WARN * _SHR_DEBUG_MULT;

        _shrAfter(g, SHR_GRID_WARN * _SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            const pc = _shrPC();
            const safeCell = g.gridCells.find(c => c.safe);
            const inSafe = safeCell && Math.hypot(pc.x - safeCell.x, pc.y - safeCell.y) < cell * 0.6;
            document.querySelectorAll('.sx-shr-talisman').forEach(el => {
                if (!el.classList.contains('sx-shr-talisman-safe')) el.classList.add('sx-shr-talisman-hot');
            });
            if (safeCell) _nkSlamShatter(safeCell.el, g.fxRun);
            if (!inSafe) {
                const dealt = _nkHit(SHR_GRID_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Shrine Maiden', 'Talisman Grid');
            }
            // Clear the grid after the flash.
            setTimeout(() => {
                if (g.finished) return;
                document.querySelectorAll('.sx-shr-talisman').forEach(el => { try { el.remove(); } catch (e) {} });
            }, 500 * _SHR_DEBUG_MULT);
        });

        // Next knock.
        _shrAfter(g, SHR_KNOCK_MS * _SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            document.querySelectorAll('.sx-shr-talisman').forEach(el => { try { el.remove(); } catch (e) {} });
            runKnock();
        });
    };

    // ── THE THOUSANDTH ARM: final sweep + descending safety circle. ──────
    const runThousandthArm = () => {
        if (g.finished) return;
        _nkToast('eg_mech_shr_thousand', '⛩️💀 THE THOUSANDTH ARM - the Maiden descends! The circle is the only safe ground!', '#f97316');
        // The safety circle: away from the edges.
        let px = W * 0.5, py = H * 0.5;
        for (let tries = 0; tries < 24; tries++) {
            px = W * (0.28 + Math.random() * 0.44);
            py = H * (0.30 + Math.random() * 0.40);
            if (px > SHR_SAFE_R + 30 && px < W - SHR_SAFE_R - 30
                && py > SHR_SAFE_R + 30 && py < H - SHR_SAFE_R - 30) break;
        }
        const circleEl = _nkEl(g.fxRun, 'div', 'sx-shr-safe-circle');
        circleEl.style.left = Math.round(px - SHR_SAFE_R) + 'px';
        circleEl.style.top = Math.round(py - SHR_SAFE_R) + 'px';
        circleEl.style.width = (SHR_SAFE_R * 2) + 'px';
        circleEl.style.height = (SHR_SAFE_R * 2) + 'px';
        g.safeCircle = { x: px, y: py };

        _shrAfter(g, 2400 * _SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            // THE THOUSANDTH ARM strikes: everything outside the circle dies.
            document.querySelectorAll('.sx-shr-beam').forEach(el => el.classList.add('sx-shr-beam-condense'));
            const pc = _shrPC();
            const inCircle = Math.hypot(pc.x - px, pc.y - py) < SHR_SAFE_R;
            if (!inCircle) {
                const dealt = _nkHit(SHR_THOUS_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Shrine Maiden', 'The Thousandth Arm');
            }
            _shrAfter(g, 1500 * _SHR_DEBUG_MULT, () => {
                _shrFinalEnd(g, monster);
            });
        });
    };

    // ── Lighthouse rotation + beam contact ticks (the finale's own loop). ─
    const startAt = performance.now();
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _shrPC();

        if (!g.safeCircle) {
            g.ang += SHR_BEAM_SPD * Math.PI / 180 * dtS;
            g.armEls.forEach((el, i) => {
                const a = g.ang + i * (Math.PI * 2 / SHR_ARMS);
                el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(2) + 'deg)';
            });
            let touching = false;
            for (let i = 0; i < SHR_ARMS && !touching; i++) {
                const a = g.ang + i * (Math.PI * 2 / SHR_ARMS);
                const ex = g.cx + Math.cos(a) * g.armLen;
                const ey = g.cy + Math.sin(a) * g.armLen;
                if (_ptSegDist(pc.x, pc.y, g.cx, g.cy, ex, ey) < 13) touching = true;
            }
            if (touching) _nkDotTick(g.fxRun, SHR_ARM_DPS, dtS, level, 'lightning');
            else g.fxRun.dotAcc = 0;

            // Failsafe: never spin forever.
            if (now - startAt > SHR_FAILSAFE_MS) { runThousandthArm(); return false; }
        } else {
            // THE THOUSANDTH ARM is armed - nothing extra to tick; the circle
            // is drawn and the strike is scheduled.
        }
        return true;
    });

    runKnock();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _shrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-shr-cd, .sx-shr-beam, .sx-shr-talisman, .sx-shr-safe-circle').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('sx-shr-allin');
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
export function _shrTeardown() {
    if (_shrFinal) { try { _shrFinalEnd(_shrFinal, null); } catch (e) {} _shrFinal = null; }
    _shrWatcherRun = null;
    document.querySelectorAll('.sx-shr-bar, .sx-shr-knotwall, .sx-shr-anchor, .sx-shr-trail, .sx-shr-shard, ' +
        '.sx-shr-echo, .sx-shr-strike-warn, .sx-shr-ward, .sx-shr-seal-warn, .sx-shr-seal, .sx-shr-cd, ' +
        '.sx-shr-beam, .sx-shr-talisman, .sx-shr-safe-circle').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.sx-shr-allin').forEach(el => el.classList.remove('sx-shr-allin'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SHR_DEBUG.fire('bars'|'mirrors'|'ward', phase) - runs one now
//   _SHR_DEBUG.final()                              - THOUSAND ARMS now
if (typeof window !== 'undefined') {
    window._SHR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_shrine') : null;
            if (!monster) return 'no shrine maiden alive';
            const fn = name === 'bars' ? _mechShrBarriers
                : name === 'mirrors' ? _mechShrMirrors
                : name === 'ward' ? _mechShrWard : null;
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_shrine') : null;
            if (!monster) return 'no shrine maiden alive';
            _shrFinalStart(monster);
            return 'THOUSAND ARMS started';
        },
    };
}
