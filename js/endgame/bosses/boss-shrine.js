//------------------------------------------------------------------------
//-------------------BOSS: THE SHRINE MAIDEN (boss_shrine)-----------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Bound God". The danmaku homage, scaled to an arena:
// the Maiden no longer sends fans — she sends HERSELF, or rather every
// mirror-spirit she is bound to. Every ward, every knot, every talisman
// repeats: that is the whole trick of a bound god. Element: lightning.
//
//   • KNOT BARRIERS (signature, all fight) — sacred ropes (shimenawa) drop
//     anchors and draw TAUt paper barriers between them: crossing bars of
//     lightning-scribed paper that hum before they light. Safe lanes close
//     as more barriers cross. Phase 3: a vertical pair crosses the
//     horizontal one — read the quadrant that stays open.
//   • MIRROR SPIRITS (60%) — the Maiden fans out five MIRROR SPIRITS
//     (five-way spirit fans, thrown from an anchored ⛩️) while a SPIRIT
//     SIGNATURE marks your movement: after 2.5s it SHATTERS — a mirror
//     spirit copies your last 1.5s of steps and detonates your route in
//     reverse. Stop repeating yourself. Phase 3: the shard follows your
//     route FORWARD as it detonates.
//   • OFUDA WARD (60%) — the Maiden plants a golden ofuda talisman and
//     chants; the ward channel ticks shadow damage while up. Body-check
//     the ofuda 3× to tear it down (+12% maxHP heal) and cancel the chant;
//     fail and a SHINTO SEAL crosses the whole arena at your row. Phase 3:
//     the seal returns the other way.
//   • ⛩️ THOUSAND ARMS (≤10%, one-shot finale) — the bound god unleashes
//     every arm at once: eight radial TORII BEAMS sweep like a lighthouse,
//     and every few seconds a knock comes — 20 TALISMANS land in a grid
//     with one revealed safe cell; you have 3.5s to reach it before the
//     grid detonates. Survive three knocks and the Maiden descends: THE
//     THOUSANDTH ARM — the eight beams sweep one final time and everything
//     outside a descending safety circle is annulled. Charge bar frozen
//     (gate in _egTickPlayer via _egShrFinalActive).
//
// Shared soul kept: fated_cell still marks fated cells — the Shrine's
// whole schtick is fate you cannot dodge. corrupt_cells retired (its
// pressure lives in the barriers and talisman grid).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (fated_cell) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Shrine Maiden's timing 2.5x so manual playtests /
// screenshot automation can catch mid-animation states. Flip to false for
// ship.
const _EG_SHR_DEBUG_SLOW = true;
const _EG_SHR_DEBUG_MULT = _EG_SHR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_shrine: {
        id: 'boss_shrine', name: 'The Shrine Maiden', emoji: '⛩️',
        baseHP: 980, baseDamage: 22, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_shrine — "The Bound God" (rework)
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
            { name: 'knot_barriers', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechShrBarriers' },
            { name: 'fated_cell', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFatedCell' },
            { name: 'mirror_spirits', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechShrMirrors', phase2Only: true },
            { name: 'ofuda_ward', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechShrWard', phase2Only: true },
        ],
        onPhaseEnter: _egShrOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_SHR_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Shrine hazards. Lightning-element boss —
// hits go in with element 'lightning' so the toast palette stays yellow.
let _egShrHitCd = 0;
function _egShrTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egShrHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egShrHitCd = now + EG_SHR_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Shrine Maiden', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egShrPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egShrHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: KNOT BARRIERS (all fight)-------------------
//------------------------------------------------------------------------
// Sacred rope anchors drop on both edges and draw paper barrier bars
// between them (shimenawa knots → taut shide streamers). The bars hum
// (warn) then LIGHT: crossing lightning paper, tick DoT on contact. The
// "knot" honours the shimenawa: whichever endpoint the player stands
// closer to, that side's rope stays — the barrier persists around that
// anchor as a vertical wall segment for 3s before it burns away. Phase 3:
// a vertical pair crosses the horizontal one (quadrant pressure).
const EG_SHR_BARS_N    = [0, 2, 3, 3]; // horizontal barriers by phase
const EG_SHR_HUM_MS    = 1500;         // dashed hum telegraph
const EG_SHR_LIT_MS    = 6000;         // lit lifetime
const EG_SHR_BAR_DPS   = [0, 5.5, 6.5, 8.0]; // %/s touching a lit barrier
const EG_SHR_KNOT_MS   = 3000;         // post-knot wall lifetime
const EG_SHR_KNOT_DPS  = [0, 4.0, 5.0, 6.5]; // %/s touching a knot wall
const EG_SHR_KNOT_R    = 26;           // wall half-width around the rope
const EG_SHR_BURN_DMG  = [0, 0.10, 0.12, 0.14]; // %maxHP: wall burns away

function _egMechShrBarriers(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egShrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_shr_bars', '⛩️ KNOT BARRIERS — the shimenawa bind the lanes. Slip between them, then leave before the knot BURNS!', '#fde047');

    const bars = [];
    const makeBar = (y, vertical) => {
        const el = _egNkEl(run, 'div', 'eg-shr-bar eg-shr-bar-warn');
        if (vertical) {
            el.style.left = Math.round(y - 7) + 'px'; el.style.top = '0px';
            el.style.width = '14px'; el.style.height = H + 'px';
        } else {
            el.style.left = '0px'; el.style.top = Math.round(y - 7) + 'px';
            el.style.width = W + 'px'; el.style.height = '14px';
        }
        return el;
    };
    const n = EG_SHR_BARS_N[p];
    for (let i = 0; i < n; i++) {
        // Spread rows, nudged so they never stack exactly.
        const y = H * (0.18 + (i / Math.max(1, n - 1)) * 0.64 + (Math.random() * 0.08 - 0.04));
        const el = makeBar(y, false);
        bars.push({ axis: 'h', pos: y, el, tautAt: performance.now() + EG_SHR_HUM_MS * _EG_SHR_DEBUG_MULT, dieAt: 0, knotEl: null, knotSide: 0 });
    }
    // Phase 3: one vertical barrier crosses the horizontals.
    if (p >= 3) {
        const x = W * (0.25 + Math.random() * 0.5);
        const el = makeBar(x, true);
        bars.push({ axis: 'v', pos: x, el, tautAt: performance.now() + (EG_SHR_HUM_MS + 900) * _EG_SHR_DEBUG_MULT, dieAt: 0, knotEl: null, knotSide: 0 });
    }

    _egNkLoop(run, (dtS, now) => {
        const pc = _egShrPC();
        let pending = false;

        for (const b of bars) {
            if (b.dead) continue;
            pending = true;

            if (!b.dieAt) {
                // Still humming (or just turning lit).
                if (now < b.tautAt) continue;
                b.el.classList.remove('eg-shr-bar-warn');
                b.el.classList.add('eg-shr-bar-lit');
                b.dieAt = now + EG_SHR_LIT_MS * _EG_SHR_DEBUG_MULT;
            }

            // Contact DoT while lit.
            const d = b.axis === 'h' ? Math.abs(pc.y - b.pos) : Math.abs(pc.x - b.pos);
            if (d < 12) _egNkDotTick(run, EG_SHR_BAR_DPS[p], dtS, level, 'lightning');
            else run.dotAcc = 0;

            if (now < b.dieAt) continue;

            // The KNOT: the rope on the player's side holds. A vertical wall
            // segment grows from the anchor, holds 3s, then BURNS AWAY.
            b.dead = true;
            b.el.classList.add('eg-shr-bar-knotting');
            const fromTop = b.axis === 'h' ? (pc.y < b.pos) : (pc.x < b.pos);
            b.knotSide = fromTop ? -1 : 1;
            const len = b.axis === 'h'
                ? (fromTop ? b.pos : H - b.pos)
                : (fromTop ? b.pos : W - b.pos);
            const kel = _egNkEl(run, 'div', 'eg-shr-knotwall');
            if (b.axis === 'h') {
                kel.style.left = '0px';
                kel.style.top = Math.round(fromTop ? 0 : b.pos - EG_SHR_KNOT_R) + 'px';
                kel.style.width = Math.round(len) + 'px';
                kel.style.height = (EG_SHR_KNOT_R * 2) + 'px';
            } else {
                kel.style.left = Math.round(fromTop ? 0 : b.pos - EG_SHR_KNOT_R) + 'px';
                kel.style.top = '0px';
                kel.style.width = (EG_SHR_KNOT_R * 2) + 'px';
                kel.style.height = Math.round(len) + 'px';
            }
            b.knotEl = kel;
            b.knotDieAt = now + EG_SHR_KNOT_MS * _EG_SHR_DEBUG_MULT;
        }

        // Knot walls: tick, expire, burn.
        for (const b of bars) {
            if (!b.knotEl || b.burned) continue;
            const d = b.axis === 'h' ? Math.abs(pc.y - b.pos) : Math.abs(pc.x - b.pos);
            // Same-side check as the wall's growth direction (per axis).
            const sideOK = b.axis === 'h'
                ? (b.knotSide < 0 ? pc.y < b.pos : pc.y > b.pos)
                : (b.knotSide < 0 ? pc.x < b.pos : pc.x > b.pos);
            if (sideOK && d < EG_SHR_KNOT_R) _egNkDotTick(run, EG_SHR_KNOT_DPS[p], dtS, level, 'lightning');
            if (now >= b.knotDieAt) {
                b.burned = true;
                b.knotEl.classList.add('eg-shr-knotwall-burn');
                const fromTop = b.knotSide < 0;
                if (sideOK && d < EG_SHR_KNOT_R + 8) {
                    _egShrTouch(EG_SHR_BURN_DMG[p], level, 'Knot Burn');
                }
                const kel = b.knotEl;
                setTimeout(() => { try { kel.remove(); } catch (e) {} }, 600 * _EG_SHR_DEBUG_MULT);
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
// movement: after 2.5s it SHATTERS — a mirror spirit copies your last
// 1.5s of steps and detonates your route in REVERSE. Stand still to feed
// it nothing; keep your path crossing your old one and you eat both.
// Phase 3: the shard plays your route FORWARD as it detonates.
const EG_SHR_FAN_N      = [0, 0, 5, 7];  // orbs per fan, by phase
const EG_SHR_FAN_SPD    = [0, 0, 140, 165];
const EG_SHR_FAN_DMG    = [0, 0, 0.06, 0.08]; // %maxHP orb hit
const EG_SHR_REC_MS     = 2500;          // record window (visible dashes)
const EG_SHR_ROUTE_MS   = 1500;          // length of route played back
const EG_SHR_SHARD_DMG  = [0, 0, 0.13, 0.16]; // %maxHP caught by a route echo
const EG_SHR_STOP_DMG   = [0, 0, 0.16, 0.19]; // %maxHP SIGNATURE STRIKE

function _egMechShrMirrors(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egShrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_shr_mirrors', '⛩️ MIRROR SPIRITS — the fans fly, and your SIGNATURE records. Stop repeating yourself!', '#fde047');

    // ── Anchor + spirit fan (the old soul, kept). ────────────────────────
    const ax = W * 0.15, ay = H * 0.5;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-shr-anchor', '⛩️');
    anchor.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';
    const orbs = [];
    let fired = false;
    if (p >= 2) {
        const fanN = EG_SHR_FAN_N[p];
        const base = Math.atan2(_egShrPC().y - ay, _egShrPC().x - ax);
        const spread = 0.35 * 2 / Math.max(1, fanN - 1);
        for (let i = 0; i < fanN; i++) {
            const a = base + (i - (fanN - 1) / 2) * spread;
            const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb-spirit');
            orbs.push({ x: ax, y: ay, vx: Math.cos(a) * EG_SHR_FAN_SPD[p], vy: Math.sin(a) * EG_SHR_FAN_SPD[p], hitDone: false, el });
        }
        fired = true;
    }

    // ── Spirit signature: record → shatter → playback. ───────────────────
    const rec = [];
    const trailEl = _egNkEl(run, 'div', 'eg-shr-trail');
    let recUntil = performance.now() + EG_SHR_REC_MS * _EG_SHR_DEBUG_MULT;
    let shatterAt = recUntil + 400 * _EG_SHR_DEBUG_MULT;
    let shone = false;
    const shard = _egNkEl(run, 'div', 'eg-shr-shard', '🔷');
    let u = 0, route = null, echoes = [];
    let bandArmed = false, bandEl = null, bandHitAt = 0, endPt = null, strikeDone = false;
    shard.style.opacity = '0';   // hidden until the signature shatters

    _egNkLoop(run, (dtS, now) => {
        const pc = _egShrPC();
        const pr = _egNkPlayerRect();

        // Spirit fan orbs.
        for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.x += o.vx * dtS; o.y += o.vy * dtS;
            if (o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) { o.el.remove(); orbs.splice(i, 1); continue; }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && _egNkDotHit(o.el, pr, 2)) {
                o.hitDone = true;
                const dealt = _egNkHit(EG_SHR_FAN_DMG[p], 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Shrine Maiden', 'Spirit Fans');
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
                const dur = N * 60 * _EG_SHR_DEBUG_MULT;
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
                _egNkToast('eg_mech_shr_shatter', '⛩️ SIGNATURE SHATTERS — your route replays! Break the pattern!', '#f97316');
            }
        }

        // Shard chases the route head (the visible mirror spirit).
        if (route && route.length >= 2) {
            const dur = route.length * 60 * _EG_SHR_DEBUG_MULT;
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
                    const bump = _egNkEl(run, 'div', 'eg-shr-echo');
                    bump.style.left = Math.round(e.x - 22) + 'px';
                    bump.style.top = Math.round(e.y - 22) + 'px';
                    setTimeout(() => { try { bump.remove(); } catch (err) {} }, 320 * _EG_SHR_DEBUG_MULT);
                    if (!e.done && Math.hypot(pc.x - e.x, pc.y - e.y) < 34) {
                        e.done = true;
                        _egShrTouch(EG_SHR_SHARD_DMG[p], level, 'Signature Echo');
                    }
                }
            }
            // Where the shard stops = the SIGNATURE STRIKE (armed in-loop so
            // the band can never outlive the run).
            if (k >= 1 && !bandArmed) {
                bandArmed = true;
                endPt = route[p >= 3 ? route.length - 1 : 0];
                bandEl = _egNkEl(run, 'div', 'eg-nk-band eg-shr-strike-warn');
                bandEl.style.left = Math.round(endPt.x - 60) + 'px';
                bandEl.style.top = Math.round(endPt.y - 60) + 'px';
                bandEl.style.width = '120px'; bandEl.style.height = '120px';
                bandHitAt = now + 700 * _EG_SHR_DEBUG_MULT;
            }
        }

        // Strike resolution (in-loop, not a setTimeout).
        if (bandArmed && !strikeDone && now >= bandHitAt && bandEl) {
            bandEl.classList.add('eg-nk-band-hit');
            if (endPt && Math.hypot(pc.x - endPt.x, pc.y - endPt.y) < 60) {
                _egShrTouch(EG_SHR_STOP_DMG[p], level, 'Signature Strike');
            }
            strikeDone = true;
            const bEl = bandEl;
            setTimeout(() => { try { bEl.remove(); } catch (e) {} }, 300 * _EG_SHR_DEBUG_MULT);
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
const EG_SHR_WARD_MS    = [0, 0, 7000, 5500]; // chant time by phase
const EG_SHR_WARD_R     = 58;            // body-check radius
const EG_SHR_WARD_HP    = 3;             // body-checks to tear down
const EG_SHR_CHAN_DPS   = 2.6;           // %/s chant channel (shadow)
const EG_SHR_SEAL_DMG   = [0, 0, 0.24, 0.30]; // %maxHP caught by the seal
const EG_SHR_SEAL_WARN  = 1100;          // telegraph before the sweep
const EG_SHR_SEAL_SPD   = 1100;          // px/s seal travel
const EG_SHR_HEAL_CANCEL = 0.12;         // %maxHP heal for tearing the ward

function _egMechShrWard(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egShrEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_shr_ward', '⛩️ OFUDA WARD — the chant drains you. Tear the talisman down to CANCEL it!', '#fde047');

    // Plant the ward away from the player.
    const pc0 = _egShrPC();
    let sx = W * 0.5, sy = H * 0.5;
    for (let tries = 0; tries < 24; tries++) {
        sx = W * (0.18 + Math.random() * 0.64);
        sy = H * (0.22 + Math.random() * 0.56);
        if (Math.hypot(sx - pc0.x, sy - pc0.y) > 200) break;
    }
    const ward = _egNkEl(run, 'div', 'eg-shr-ward', '🧿');
    ward.style.left = Math.round(sx - EG_SHR_WARD_R) + 'px';
    ward.style.top = Math.round(sy - EG_SHR_WARD_R) + 'px';
    ward.style.width = (EG_SHR_WARD_R * 2) + 'px';
    ward.style.height = (EG_SHR_WARD_R * 2) + 'px';

    const state = { torn: false, chantDone: false, hp: EG_SHR_WARD_HP, lastHit: 0, seals: 0, sealsTotal: p >= 3 ? 2 : 1, bandX: 0, axis: 'v', dir: 1 };
    let chantT = 0;
    const chantMs = EG_SHR_WARD_MS[p] * _EG_SHR_DEBUG_MULT;

    _egNkLoop(run, (dtS, now) => {
        chantT += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egShrPC();
        let pending = true;

        // Chant channel ticks (shadow) while the ward stands. Torn ward →
        // the run ends here (otherwise the loop would never finish).
        if (state.torn) return false;
        if (!state.chantDone) {
            _egNkDotTick(run, EG_SHR_CHAN_DPS, dtS, level, 'shadow');
        }

        // Body-check the ofuda (visit cooldown → three deliberate trips).
        if (!state.torn && !state.chantDone && pr
            && Math.hypot(pc.x - sx, pc.y - sy) < EG_SHR_WARD_R
            && now >= state.lastHit) {
            state.lastHit = now + 450 * _EG_SHR_DEBUG_MULT;
            state.hp--;
            ward.classList.remove('eg-shr-ward-hit');
            void ward.offsetWidth;
            ward.classList.add('eg-shr-ward-hit');
            if (state.hp <= 0) {
                state.torn = true;
                ward.classList.add('eg-shr-ward-torn');
                _egShrHeal(_egNkMaxHP() * EG_SHR_HEAL_CANCEL);
                _egNkToast('eg_mech_shr_torn', '⛩️🧿 OFUDA TORN — the chant is cancelled! (+heal)', '#4ade80');
            }
        }

        // Chant completes → the Shinto Seal.
        if (!state.torn && !state.chantDone && chantT >= chantMs) {
            state.chantDone = true;
            ward.classList.add('eg-shr-ward-dim');
            _egNkToast('eg_mech_shr_seal', '⛩️ THE SHINTO SEAL — the ward closes on your row!', '#f97316');
            state.axis = 'v';
            state.dir = state.seals % 2 === 0 ? 1 : -1;
            state.bandX = pc.x;
            const band = _egNkEl(run, 'div', 'eg-nk-band eg-shr-seal-warn');
            band.style.left = Math.round(state.bandX - 55) + 'px'; band.style.top = '0px';
            band.style.width = '110px'; band.style.height = H + 'px';
            state.warnUntil = now + EG_SHR_SEAL_WARN * _EG_SHR_DEBUG_MULT;
            state.band = band;
        }

        // Seal sweep after its telegraph.
        if (state.chantDone && state.band && now >= state.warnUntil && !state.sweeping) {
            state.sweeping = true;
            state.band.classList.add('eg-nk-band-hit');
            _egNkSlamShatter(state.band, run);
            state.sealX = state.dir > 0 ? -80 : W + 80;
            state.sealY = state.bandX;
            const sealEl = _egNkEl(run, 'div', 'eg-nk-dot eg-shr-seal', '📜');
            state.sealEl = sealEl;
            state.sealHit = false;
        }
        if (state.sweeping && state.sealEl) {
            state.sealX += state.dir * EG_SHR_SEAL_SPD * dtS;
            state.sealEl.style.transform = 'translate(' + Math.round(state.sealX - 30) + 'px,' + Math.round(pc.y - 30) + 'px)';
            if (pr && !state.sealHit) {
                const inBand = Math.abs(pc.x - state.bandX) < 55;
                if (inBand) {
                    state.sealHit = true;
                    const dealt = _egNkHit(EG_SHR_SEAL_DMG[p], 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Shrine Maiden', 'Shinto Seal');
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
// like a lighthouse while every few seconds a KNOCK comes — 20 talismans
// land in a grid with ONE revealed safe cell; reach it in 3.5s or the grid
// detonates. Three knocks and the Maiden descends: THE THOUSANDTH ARM —
// one final beam sweep and everything outside a descending safety circle
// is annulled. Charge bar frozen (gate in _egTickPlayer via
// _egShrFinalActive).
const EG_SHR_ARMS        = 8;       // torii beams on the lighthouse
const EG_SHR_ARM_LEN_F   = 0.52;    // beam length × min(W,H)
const EG_SHR_ARM_DPS     = 8.0;     // %/s touching a beam
const EG_SHR_BEAM_SPD    = 26;      // deg/s lighthouse rotation
const EG_SHR_KNOCKS      = 3;       // talisman grids before THE THOUSANDTH ARM
const EG_SHR_KNOCK_MS    = 8500;    // between knocks
const EG_SHR_GRID_COLS   = 5;
const EG_SHR_GRID_ROWS   = 4;
const EG_SHR_GRID_WARN   = 3500;    // time to reach the safe cell
const EG_SHR_GRID_DMG    = 0.20;    // %maxHP caught by a grid detonation
const EG_SHR_THOUS_DMG   = 0.35;    // %maxHP outside the safety circle
const EG_SHR_SAFE_R      = 105;     // final safety-circle radius
const EG_SHR_FAILSAFE_MS = 32000;   // hard cap on the set-piece

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egShrFinal = null;

function _egShrFinalActive() {
    return !!_egShrFinal && !_egShrFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egShrOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egShrEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egShrEnsureFinalWatcher(monster) {
    if (!monster || _egShrFinal || _egShrWatcherRun) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egShrWatcherRun = run;
    _egNkLoop(run, () => {
        if (_egShrFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egShrFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
let _egShrWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
function _egShrAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egShrFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egShrFinalStart(monster) {
    if (_egShrFinal || !monster) return;

    // The Shrine clears the arena for the bound god: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null, armEls: [],
        cx: W / 2, cy: H / 2,
        armLen: Math.min(W, H) * EG_SHR_ARM_LEN_F,
        ang: Math.random() * Math.PI * 2,
        knock: 0,
        gridCells: [],   // active talisman grid cells
    };
    _egShrFinal = g;

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
    ov.className = 'eg-shr-cd';
    ov.innerHTML =
        '<div class="eg-shr-cd-label">⛩️ THOUSAND ARMS</div>' +
        '<div class="eg-shr-cd-hint">Eight torii beams sweep the shrine and every few seconds a KNOCK comes: 20 talismans land with ONE safe cell — reach it before the grid detonates. Survive three knocks for THE THOUSANDTH ARM: only the descending circle is safe!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_shr_final_cd', '⛩️💀 THOUSAND ARMS — every arm at once. Read the knocks!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the bound-god glow while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-shr-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Eight radial torii beams: the lighthouse. ────────────────────────
    for (let i = 0; i < EG_SHR_ARMS; i++) {
        const el = _egNkEl(g.fxRun, 'div', 'eg-shr-beam');
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
        if (g.knock > EG_SHR_KNOCKS) { runThousandthArm(); return; }
        _egNkToast('eg_mech_shr_knock', '⛩️ KNOCK ' + g.knock + '/' + EG_SHR_KNOCKS + ' — find the safe cell!', '#fde047');

        // Grid centred on the arena (with a little jitter per knock).
        const cols = EG_SHR_GRID_COLS, rows = EG_SHR_GRID_ROWS;
        const cell = Math.min(W, H) * 0.16;
        const gw = cols * cell, gh = rows * cell;
        const gx = Math.max(20, Math.min(W - gw - 20, W / 2 - gw / 2 + (Math.random() * 120 - 60)));
        const gy = Math.max(20, Math.min(H - gh - 20, H / 2 - gh / 2 + (Math.random() * 80 - 40)));
        const safeCol = Math.floor(Math.random() * cols);
        const safeRow = Math.floor(Math.random() * rows);
        g.gridCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const el = _egNkEl(g.fxRun, 'div', 'eg-shr-talisman' + (r === safeRow && c === safeCol ? ' eg-shr-talisman-safe' : ''));
                el.style.left = Math.round(gx + c * cell + 6) + 'px';
                el.style.top = Math.round(gy + r * cell + 6) + 'px';
                el.style.width = Math.round(cell - 12) + 'px';
                el.style.height = Math.round(cell - 12) + 'px';
                g.gridCells.push({ x: gx + c * cell + cell / 2, y: gy + r * cell + cell / 2, safe: r === safeRow && c === safeCol, el });
            }
        }
        const detonateAt = performance.now() + EG_SHR_GRID_WARN * _EG_SHR_DEBUG_MULT;

        _egShrAfter(g, EG_SHR_GRID_WARN * _EG_SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            const pc = _egShrPC();
            const safeCell = g.gridCells.find(c => c.safe);
            const inSafe = safeCell && Math.hypot(pc.x - safeCell.x, pc.y - safeCell.y) < cell * 0.6;
            document.querySelectorAll('.eg-shr-talisman').forEach(el => {
                if (!el.classList.contains('eg-shr-talisman-safe')) el.classList.add('eg-shr-talisman-hot');
            });
            if (safeCell) _egNkSlamShatter(safeCell.el, g.fxRun);
            if (!inSafe) {
                const dealt = _egNkHit(EG_SHR_GRID_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Shrine Maiden', 'Talisman Grid');
            }
            // Clear the grid after the flash.
            setTimeout(() => {
                if (g.finished) return;
                document.querySelectorAll('.eg-shr-talisman').forEach(el => { try { el.remove(); } catch (e) {} });
            }, 500 * _EG_SHR_DEBUG_MULT);
        });

        // Next knock.
        _egShrAfter(g, EG_SHR_KNOCK_MS * _EG_SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            document.querySelectorAll('.eg-shr-talisman').forEach(el => { try { el.remove(); } catch (e) {} });
            runKnock();
        });
    };

    // ── THE THOUSANDTH ARM: final sweep + descending safety circle. ──────
    const runThousandthArm = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_shr_thousand', '⛩️💀 THE THOUSANDTH ARM — the Maiden descends! The circle is the only safe ground!', '#f97316');
        // The safety circle: away from the edges.
        let px = W * 0.5, py = H * 0.5;
        for (let tries = 0; tries < 24; tries++) {
            px = W * (0.28 + Math.random() * 0.44);
            py = H * (0.30 + Math.random() * 0.40);
            if (px > EG_SHR_SAFE_R + 30 && px < W - EG_SHR_SAFE_R - 30
                && py > EG_SHR_SAFE_R + 30 && py < H - EG_SHR_SAFE_R - 30) break;
        }
        const circleEl = _egNkEl(g.fxRun, 'div', 'eg-shr-safe-circle');
        circleEl.style.left = Math.round(px - EG_SHR_SAFE_R) + 'px';
        circleEl.style.top = Math.round(py - EG_SHR_SAFE_R) + 'px';
        circleEl.style.width = (EG_SHR_SAFE_R * 2) + 'px';
        circleEl.style.height = (EG_SHR_SAFE_R * 2) + 'px';
        g.safeCircle = { x: px, y: py };

        _egShrAfter(g, 2400 * _EG_SHR_DEBUG_MULT, () => {
            if (g.finished) return;
            // THE THOUSANDTH ARM strikes: everything outside the circle dies.
            document.querySelectorAll('.eg-shr-beam').forEach(el => el.classList.add('eg-shr-beam-condense'));
            const pc = _egShrPC();
            const inCircle = Math.hypot(pc.x - px, pc.y - py) < EG_SHR_SAFE_R;
            if (!inCircle) {
                const dealt = _egNkHit(EG_SHR_THOUS_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Shrine Maiden', 'The Thousandth Arm');
            }
            _egShrAfter(g, 1500 * _EG_SHR_DEBUG_MULT, () => {
                _egShrFinalEnd(g, monster);
            });
        });
    };

    // ── Lighthouse rotation + beam contact ticks (the finale's own loop). ─
    const startAt = performance.now();
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _egShrPC();

        if (!g.safeCircle) {
            g.ang += EG_SHR_BEAM_SPD * Math.PI / 180 * dtS;
            g.armEls.forEach((el, i) => {
                const a = g.ang + i * (Math.PI * 2 / EG_SHR_ARMS);
                el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(2) + 'deg)';
            });
            let touching = false;
            for (let i = 0; i < EG_SHR_ARMS && !touching; i++) {
                const a = g.ang + i * (Math.PI * 2 / EG_SHR_ARMS);
                const ex = g.cx + Math.cos(a) * g.armLen;
                const ey = g.cy + Math.sin(a) * g.armLen;
                if (_egPtSegDist(pc.x, pc.y, g.cx, g.cy, ex, ey) < 13) touching = true;
            }
            if (touching) _egNkDotTick(g.fxRun, EG_SHR_ARM_DPS, dtS, level, 'lightning');
            else g.fxRun.dotAcc = 0;

            // Failsafe: never spin forever.
            if (now - startAt > EG_SHR_FAILSAFE_MS) { runThousandthArm(); return false; }
        } else {
            // THE THOUSANDTH ARM is armed — nothing extra to tick; the circle
            // is drawn and the strike is scheduled.
        }
        return true;
    });

    runKnock();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egShrFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-shr-cd, .eg-shr-beam, .eg-shr-talisman, .eg-shr-safe-circle').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-shr-allin');
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
function _egShrTeardown() {
    if (_egShrFinal) { try { _egShrFinalEnd(_egShrFinal, null); } catch (e) {} _egShrFinal = null; }
    _egShrWatcherRun = null;
    document.querySelectorAll('.eg-shr-bar, .eg-shr-knotwall, .eg-shr-anchor, .eg-shr-trail, .eg-shr-shard, ' +
        '.eg-shr-echo, .eg-shr-strike-warn, .eg-shr-ward, .eg-shr-seal-warn, .eg-shr-seal, .eg-shr-cd, ' +
        '.eg-shr-beam, .eg-shr-talisman, .eg-shr-safe-circle').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-shr-allin').forEach(el => el.classList.remove('eg-shr-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_SHR_DEBUG.fire('bars'|'mirrors'|'ward', phase) — runs one now
//   _EG_SHR_DEBUG.final()                              — THOUSAND ARMS now
if (typeof window !== 'undefined') {
    window._EG_SHR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_shrine') : null;
            if (!monster) return 'no shrine maiden alive';
            const fn = name === 'bars' ? _egMechShrBarriers
                : name === 'mirrors' ? _egMechShrMirrors
                : name === 'ward' ? _egMechShrWard : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_shrine') : null;
            if (!monster) return 'no shrine maiden alive';
            _egShrFinalStart(monster);
            return 'THOUSAND ARMS started';
        },
    };
}
