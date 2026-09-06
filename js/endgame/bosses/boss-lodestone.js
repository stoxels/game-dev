//------------------------------------------------------------------------
//-------------------BOSS: THE LODESTONE (boss_lodestone)------------------
//------------------------------------------------------------------------
// A rework of the old one-shot Polarity Field into a persistent magnetic
// siege. The Lodestone is a living magnet and the whole arena is its
// field. Fight identity: POLARITY — you are metal; it moves you.
//
//   PERSISTENT (whole fight, watcher):
//   • THE LODESTONE — the boss's arena body: a floating 🧲 that drifts
//     around the table. Touching it is a MAGNETIC CLAMP: you are flung
//     INTO the stone (magnetism pulls, it doesn't push) + lightning hit.
//   • POLARITY DRAG — the stone constantly ATTRACTS you (gentle radial
//     pull, phase-scaled). Every ~6-7s its polarity FLIPS (visible N/S
//     recolor + banner): the flip emits a REPULSION PULSE that shoves you
//     hard away from the stone. Ride the pull, respect the flips.
//   • SHRAPNEL FILINGS — the stone sheds magnetized iron filings (🔩)
//     that spiral outward and launch radially. Lightning hits.
//
//   60% GATE — MAGNETIC VORTEX: the stone plants itself at center and
//   spins up (spiral field visuals): a strong drag pulls everything toward
//   it for ~4.5s; standing too close grinds you against it (lightning
//   DoT). Fight the pull and keep your distance.
//
//   30% GATE — RAILGUN: the stone aligns magnetic rails through itself
//   (full-screen lane telegraphs aimed at you), gathers filings into the
//   lane, then fires a ⚡ slug down each one. Anyone hit is flung.
//
//   CHARGE ATTACK — MAGNETIC LEASH: the stone fires a chain 🔗 along a
//   telegraphed line. If it connects, you are REELED IN fast — end up
//   inside the clamp radius when the chain runs out and you take heavy
//   lightning damage + a clamp fling. If it misses, the chain sticks
//   harmlessly.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string. Damage flows through the shared tier curve.
// NOTE: exactly ONE _egNkLoop runs on the watcher's run — every state
// machine (flip pulse, vortex, railgun, leash) lives in that single tick.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_lodestone: {
        id: 'boss_lodestone', name: 'The Lodestone', emoji: '🧲',
        baseHP: 1050, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_lodestone: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility — the persistent watcher now
            // owns the drag/flip cadence; the handler no-ops (same shim
            // pattern as the other reworked bosses).
            { name: 'polarity_field', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechPolarityField' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
        onInit: _egLodestoneArenaInit,
    },
});


// ── Magnetism tuning ─────────────────────────────────────────────────────
// The Lodestone (boss body)
const EG_LDS_R = 46;                          // stone visual radius
const EG_LDS_DRIFT_SPEED = [0, 20, 30, 42];   // px/s per phase
const EG_LDS_DRIFT_REPICK_MS = 5600;
const EG_LDS_CLAMP_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the stone
const EG_LDS_CLAMP_CD_MS = 1000;
const EG_LDS_CLAMP_FLING = [0, 140, 165, 190]; // INTO the stone
// Polarity drag + flip pulse
const EG_LDS_ATTRACT_SPEED = [0, 40, 55, 70]; // px/s radial pull
const EG_LDS_FLIP_MS = [0, 7000, 6000, 5000]; // polarity cycle
const EG_LDS_PULSE_SPEED = [0, 260, 300, 340]; // repulsion shove (one-shot)
// Shrapnel filings
const EG_LDS_FILINGS_EVERY_MS = [0, 5200, 4300, 3400];
const EG_LDS_FILING_SPEED = 250;
const EG_LDS_FILING_DMG = 0.04;               // %maxHP per filing
// Magnetic Vortex (60% gate)
const EG_LDS_VORTEX_MS = 4500;
const EG_LDS_VORTEX_PULL = [0, 170, 200, 235]; // px/s hard drag
const EG_LDS_VORTEX_GRIND_R = 140;            // grind zone around the stone
const EG_LDS_VORTEX_GRIND_PCT = 4;            // %maxHP per second inside
// Railgun (30% gate)
const EG_LDS_RAIL_N = 3;                      // lanes per gate
const EG_LDS_RAIL_GAP_MS = 1400;
const EG_LDS_RAIL_WARN_MS = 1100;
const EG_LDS_RAIL_SLUG_SPEED = 700;           // px/s
const EG_LDS_RAIL_DMG = [0, 0.14, 0.17, 0.20];
const EG_LDS_RAIL_FLING = [0, 170, 195, 220];
// Magnetic Leash (charge attack)
const EG_LDS_LEASH_WARN_MS = 900;             // line telegraph (tracks 0.4s)
const EG_LDS_LEASH_CORRIDOR = 44;             // px from the chain line
const EG_LDS_LEASH_REEL_MS = 1600;
const EG_LDS_LEASH_REEL_SPEED = [0, 230, 265, 300]; // px/s reel-in
const EG_LDS_LEASH_CLAMP_R = 150;             // clamp radius at chain end
const EG_LDS_LEASH_DMG = [0, 0.17, 0.20, 0.24];
const EG_LDS_LEASH_FLING = [0, 180, 205, 230];


let _egLodestoneWatcher = null; // per-fight magnetic state

// Phase lookup helper — resolves the boss's current phase (default 1).
function _egLdsPhase(st) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every magnetic overlay (registered in boss-framework teardown).
function _egLodestoneTeardown() {
    if (_egLodestoneWatcher) {
        const st = _egLodestoneWatcher;
        _egLodestoneWatcher = null;
        (st.filings || []).forEach(f => { try { if (f.el) f.el.remove(); } catch (e) {} });
        (st.slugs || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        (st.railWarns || []).forEach(w => { try { if (w.el) w.el.remove(); } catch (e) {} });
        if (st.vortex) { try { if (st.vortex.el) st.vortex.el.remove(); } catch (e) {} }
        if (st.leash) {
            try { if (st.leash.el) st.leash.el.remove(); } catch (e) {}
            try { if (st.leash.warnEl) st.leash.warnEl.remove(); } catch (e) {}
            try { if (st.leash.chainEl) st.leash.chainEl.remove(); } catch (e) {}
        }
        try { if (st.run) _egNkKillRun(st.run); } catch (e) {} // removes the stone
    }
    document.querySelectorAll('.eg-lds-stone, .eg-lds-filing, .eg-lds-vortex, .eg-lds-rail, .eg-lds-slug, .eg-lds-leash-line, .eg-lds-chain').forEach(el => el.remove());
}


// ── Persistent arena: the stone, the field, the filings ─────────────────
function _egLodestoneArenaInit(monster) {
    if (_egLodestoneWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        stone: null,
        polarity: Math.random() < 0.5 ? 'N' : 'S',
        flipAcc: 0,
        filings: [], filingsAcc: 0,
        vortex: null,
        railWarns: [], slugs: [], railgun: null, railTimer: 0,
        leash: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egLodestoneWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_egLodestoneWatcher === st) _egLodestoneWatcher = null; };
    st.run = run;

    // The Lodestone: the boss's arena body.
    const el = _egNkEl(run, 'div', 'eg-lds-stone', '🧲');
    el.style.width = el.style.height = (EG_LDS_R * 2) + 'px';
    st.stone = {
        x: window.innerWidth * 0.5, y: window.innerHeight * 0.35,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.35,
        repickAt: EG_LDS_DRIFT_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.stone.x - EG_LDS_R) + 'px,' + Math.round(st.stone.y - EG_LDS_R) + 'px)';
    _egLdsApplyPolarity(st);

    if (monster) st.everLive = true;

    _egNkLoop(run, (dtS, now) => {
        if (_egLodestoneWatcher !== st) return false;
        const live = _egMonsters ? _egMonsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egLdsVortex(st); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egLdsRailgun(st, live); }

        // ── The Lodestone: drift + MAGNETIC CLAMP on touch ──
        const sn = st.stone;
        const vortexing = !!st.vortex;
        if (!vortexing) {
            sn.repickAt -= dtS * 1000;
            const sdx = sn.tx - sn.x, sdy = sn.ty - sn.y;
            const sd = Math.hypot(sdx, sdy) || 1;
            const sstep = EG_LDS_DRIFT_SPEED[p] * dtS;
            if (sd <= sstep || sn.repickAt <= 0) {
                sn.tx = 100 + Math.random() * Math.max(60, W - 200);
                sn.ty = 100 + Math.random() * Math.max(60, H - 220);
                sn.repickAt = EG_LDS_DRIFT_REPICK_MS;
            } else {
                sn.x += (sdx / sd) * sstep;
                sn.y += (sdy / sd) * sstep;
            }
        }
        sn.el.style.transform = 'translate(' + Math.round(sn.x - EG_LDS_R) + 'px,' + Math.round(sn.y - EG_LDS_R) + 'px)';
        if (c && pr && now >= sn.cdUntil && !st.leash && _egNkCircleHit(sn.x, sn.y, EG_LDS_R * 0.9, pr, 0)) {
            sn.cdUntil = now + EG_LDS_CLAMP_CD_MS;
            const dx = sn.x - c.x, dy = sn.y - c.y; // INTO the stone: magnetism pulls.
            const d = Math.hypot(dx, dy) || 1;
            _egNkFlingAvatar((dx / d) * EG_LDS_CLAMP_FLING[p], (dy / d) * EG_LDS_CLAMP_FLING[p], sn.x, sn.y);
            const dealt = _egNkHit(EG_LDS_CLAMP_DMG[p], 'lightning', st.level);
            _egNkAbilityHitToast(dealt, 'The Lodestone', 'Magnetic Clamp');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e2) {}
        }

        // ── Polarity cycle: attraction between flips, pulse on flip ──
        st.flipAcc += dtS * 1000;
        if (!vortexing && st.flipAcc >= EG_LDS_FLIP_MS[p]) {
            st.flipAcc = 0;
            st.polarity = st.polarity === 'N' ? 'S' : 'N';
            _egLdsApplyPolarity(st);
            // REPULSION PULSE: one hard shove away from the stone.
            if (c) {
                const dx = c.x - sn.x, dy = c.y - sn.y;
                const d = Math.hypot(dx, dy) || 1;
                if (typeof _egNkNudgeAvatar === 'function') {
                    _egNkNudgeAvatar((dx / d) * EG_LDS_PULSE_SPEED[p] * 0.35, (dy / d) * EG_LDS_PULSE_SPEED[p] * 0.35);
                }
                _egLdsPulseRing(st, sn.x, sn.y);
            }
            _egNkToast('eg_lds_flip', st.polarity === 'N' ? '🧲 POLARITY FLIP — N! Repulsion pulse!' : '🧲 POLARITY FLIP — S! Repulsion pulse!');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
        } else if (!vortexing && !st.leash && c) {
            // Gentle attraction toward the stone between flips.
            const dx = sn.x - c.x, dy = sn.y - c.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d > EG_LDS_R + 40) _egNkNudgeAvatar((dx / d) * EG_LDS_ATTRACT_SPEED[p] * dtS, (dy / d) * EG_LDS_ATTRACT_SPEED[p] * dtS);
        }

        // ── Shrapnel filings: spiral out, then launch ──
        st.filingsAcc += dtS * 1000;
        if (!vortexing && st.filingsAcc >= EG_LDS_FILINGS_EVERY_MS[p]) {
            st.filingsAcc = 0;
            _egLdsSpawnFiling(st, sn.x, sn.y, Math.random() * Math.PI * 2);
        }
        for (let i = st.filings.length - 1; i >= 0; i--) {
            const f = st.filings[i];
            f.t += dtS * 1000;
            if (f.spiral > 0) {
                // Spiral phase: orbit outward around the stone.
                f.spiral -= dtS * 1000;
                f.ang += 3.2 * dtS;
                f.rad += 90 * dtS;
                f.x = sn.x + Math.cos(f.ang) * f.rad;
                f.y = sn.y + Math.sin(f.ang) * f.rad;
                if (f.spiral <= 0) {
                    // Launch radially outward at the current angle.
                    f.vx = Math.cos(f.ang) * EG_LDS_FILING_SPEED;
                    f.vy = Math.sin(f.ang) * EG_LDS_FILING_SPEED;
                }
            } else {
                f.x += f.vx * dtS;
                f.y += f.vy * dtS;
            }
            f.el.style.transform = 'translate(' + Math.round(f.x - 11) + 'px,' + Math.round(f.y - 11) + 'px) rotate(' + Math.round(f.t / 25) + 'deg)';
            if (pr && !f.hit && _egNkCircleHit(f.x, f.y, 14, pr, 0)) {
                f.hit = true;
                const dealt = _egNkHit(EG_LDS_FILING_DMG, 'lightning', st.level);
                _egNkAbilityHitToast(dealt, 'The Lodestone', 'Shrapnel Filings');
                try { f.el.remove(); } catch (e) {}
                st.filings.splice(i, 1);
                continue;
            }
            if (f.t > 5200 || f.x < -40 || f.x > W + 40 || f.y < -40 || f.y > H + 40) {
                try { f.el.remove(); } catch (e) {}
                st.filings.splice(i, 1);
            }
        }

        // ── Magnetic Vortex (60% gate state machine) ──
        if (st.vortex) {
            const vx = st.vortex;
            vx.t += dtS * 1000;
            // The stone plants center and drags hard.
            sn.x += (W / 2 - sn.x) * Math.min(1, 4 * dtS);
            sn.y += (H * 0.45 - sn.y) * Math.min(1, 4 * dtS);
            if (c && !st.leash) {
                const dx = sn.x - c.x, dy = sn.y - c.y;
                const d = Math.hypot(dx, dy) || 1;
                _egNkNudgeAvatar((dx / d) * EG_LDS_VORTEX_PULL[p] * dtS, (dy / d) * EG_LDS_VORTEX_PULL[p] * dtS);
                if (d < EG_LDS_VORTEX_GRIND_R + EG_LDS_R) {
                    _egLdsGrindTick(st, vx, dtS, live);
                }
            }
            if (vx.t >= EG_LDS_VORTEX_MS) {
                try { vx.el.remove(); } catch (e) {}
                st.vortex = null;
                _egNkToast('eg_lds_vortex_end', '🌀 The field settles.', '#93c5fd');
            }
        }

        // ── Railgun (30% gate): warn → slug per lane ──
        if (st.railgun) {
            st.railTimer += dtS * 1000;
            if (st.railgun.fired < EG_LDS_RAIL_N && st.railTimer >= st.railgun.fired * EG_LDS_RAIL_GAP_MS) {
                _egLdsFireRail(st, sn, pr, W, H);
                st.railgun.fired++;
            }
            if (st.railgun.fired >= EG_LDS_RAIL_N) st.railgun = null;
        }
        // Rail warns: when their warn elapses they launch their slug.
        for (let i = st.railWarns.length - 1; i >= 0; i--) {
            const rw = st.railWarns[i];
            rw.t += dtS * 1000;
            if (rw.t < rw.warnMs) {
                // Filings gather into the lane (visual pulse via class).
                if (!rw.hot && rw.t >= rw.warnMs * 0.55) { rw.hot = true; rw.el.classList.add('hot'); }
                continue;
            }
            try { rw.el.remove(); } catch (e) {}
            st.railWarns.splice(i, 1);
            // Launch the slug down the lane.
            const sel = _egNkEl(st.run, 'div', 'eg-lds-slug', '⚡');
            st.slugs.push({ horiz: rw.horiz, pos: rw.pos, x: rw.horiz ? -30 : rw.pos, y: rw.horiz ? rw.pos : -30,
                vx: rw.horiz ? EG_LDS_RAIL_SLUG_SPEED : 0, vy: rw.horiz ? 0 : EG_LDS_RAIL_SLUG_SPEED, t: 0, hit: false, el: sel });
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
        }
        // Slugs travel down their lanes.
        for (let i = st.slugs.length - 1; i >= 0; i--) {
            const s = st.slugs[i];
            s.t += dtS * 1000;
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            s.el.style.transform = 'translate(' + Math.round(s.x - 16) + 'px,' + Math.round(s.y - 16) + 'px)';
            if (pr && !s.hit && _egNkCircleHit(s.x, s.y, 18, pr, 0)) {
                s.hit = true;
                const dx = (c ? c.x : s.x) - (st.stone.x), dy = (c ? c.y : s.y) - (st.stone.y);
                const d = Math.hypot(dx, dy) || 1;
                _egNkFlingAvatar((dx / d) * EG_LDS_RAIL_FLING[p], (dy / d) * EG_LDS_RAIL_FLING[p], s.x, s.y);
                const dealt = _egNkHit(EG_LDS_RAIL_DMG[p], 'lightning', st.level);
                _egNkAbilityHitToast(dealt, 'The Lodestone', 'Railgun');
                try { s.el.remove(); } catch (e) {}
                st.slugs.splice(i, 1);
                continue;
            }
            if (s.t > 5000 || s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > H + 60) {
                try { s.el.remove(); } catch (e) {}
                st.slugs.splice(i, 1);
            }
        }

        // ── Magnetic Leash (charge attack state machine) ──
        if (st.leash) {
            const ls = st.leash;
            ls.t += dtS * 1000;
            if (ls.phase === 'warn') {
                // The line tracks the player briefly, then locks.
                if (ls.t < EG_LDS_LEASH_WARN_MS * 0.45) {
                    const c6 = _egNkPlayerCenter();
                    if (c6) { ls.px = c6.x; ls.py = c6.y; _egLdsPlaceLine(ls.warnEl, sn.x, sn.y, ls.px, ls.py); }
                } else if (!ls.locked) {
                    ls.locked = true;
                    ls.warnEl.classList.add('locked');
                }
                if (ls.t >= EG_LDS_LEASH_WARN_MS) {
                    // Chain fires: did the player stand in the corridor?
                    const c7 = _egNkPlayerCenter();
                    let caught = false;
                    if (c7) {
                        const seg = _egLdsDistToSegment(c7.x, c7.y, sn.x, sn.y, ls.px, ls.py);
                        caught = seg <= EG_LDS_LEASH_CORRIDOR;
                    }
                    try { ls.warnEl.remove(); } catch (e) {}
                    ls.warnEl = null;
                    if (caught) {
                        ls.phase = 'reel';
                        ls.t = 0;
                        const chEl = _egNkEl(st.run, 'div', 'eg-lds-chain', '🔗');
                        ls.chainEl = chEl;
                        _egNkToast('eg_lds_leash', '🔗 MAGNETIC LEASH! Fight the reel-in!');
                        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
                    } else {
                        // Missed: the chain sticks harmlessly.
                        _egNkToast('eg_lds_miss', '💨 The chain snaps past you.', '#93c5fd');
                        try { if (ls.chainEl) ls.chainEl.remove(); } catch (e) {}
                        st.leash = null;
                    }
                }
            } else if (ls.phase === 'reel') {
                // Reel the player toward the stone.
                const c8 = _egNkPlayerCenter();
                if (c8) {
                    const dx = sn.x - c8.x, dy = sn.y - c8.y;
                    const d = Math.hypot(dx, dy) || 1;
                    _egNkNudgeAvatar((dx / d) * EG_LDS_LEASH_REEL_SPEED[p] * dtS, (dy / d) * EG_LDS_LEASH_REEL_SPEED[p] * dtS);
                    if (ls.chainEl) _egLdsPlaceLine(ls.chainEl, sn.x, sn.y, c8.x, c8.y);
                }
                if (ls.t >= EG_LDS_LEASH_REEL_MS) {
                    // Chain end: clamp check.
                    const c9 = _egNkPlayerCenter();
                    const pr9 = _egNkPlayerRect();
                    let clamped = false;
                    if (c9 && pr9) {
                        const dd = Math.hypot(c9.x - sn.x, c9.y - sn.y);
                        clamped = dd <= EG_LDS_LEASH_CLAMP_R;
                    }
                    if (clamped) {
                        const dx = sn.x - (c9 ? c9.x : sn.x), dy = sn.y - (c9 ? c9.y : sn.y);
                        const d = Math.hypot(dx, dy) || 1;
                        _egNkFlingAvatar((dx / d) * EG_LDS_LEASH_FLING[p], (dy / d) * EG_LDS_LEASH_FLING[p], sn.x, sn.y);
                        const dealt = _egNkHit(EG_LDS_LEASH_DMG[p], 'lightning', st.level);
                        _egNkAbilityHitToast(dealt, 'The Lodestone', 'Leash Clamp');
                    } else {
                        _egNkToast('eg_lds_broke', '💪 You broke the leash!', '#4ade80');
                    }
                    try { if (ls.chainEl) ls.chainEl.remove(); } catch (e) {}
                    st.leash = null;
                    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
                }
            }
        }

        return true;
    });
}


// Polarity visuals: N = red face, S = blue face (classic magnet ends).
function _egLdsApplyPolarity(st) {
    if (!st.stone || !st.stone.el) return;
    st.stone.el.classList.toggle('pol-n', st.polarity === 'N');
    st.stone.el.classList.toggle('pol-s', st.polarity === 'S');
}


// Expanding repulsion-pulse ring on polarity flip.
function _egLdsPulseRing(st, x, y) {
    const el = _egNkEl(st.run, 'div', 'eg-lds-pulse');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 700);
}


// Vortex grind DoT: chunked lightning ticks while pressed against the stone.
function _egLdsGrindTick(st, vx, dtS, live) {
    vx.grindAcc = (vx.grindAcc || 0) + dtS * 1000;
    if (vx.grindAcc >= 500) {
        vx.grindAcc = 0;
        const dealt = _egNkHit(EG_LDS_VORTEX_GRIND_PCT / 200, 'lightning', st.level);
        _egNkAbilityHitToast(dealt, 'The Lodestone', 'Field Grind');
    }
}


// One magnetized filing on a spiral path.
function _egLdsSpawnFiling(st, x, y, ang) {
    const el = _egNkEl(st.run, 'div', 'eg-lds-filing', '🔩');
    st.filings.push({ x, y, ang, rad: EG_LDS_R, spiral: 1200, vx: 0, vy: 0, t: 0, hit: false, el });
}


// ── 60% gate: Magnetic Vortex ────────────────────────────────────────────
function _egLdsVortex(st) {
    if (st.vortex) return;
    const el = _egNkEl(st.run, 'div', 'eg-lds-vortex');
    st.vortex = { t: 0, el, grindAcc: 0 };
    _egNkToast('eg_lds_vortex', '🌀 MAGNETIC VORTEX! Fight the pull — the stone grinds!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
}


// ── 30% gate: Railgun ────────────────────────────────────────────────────
function _egLdsRailgun(st, live) {
    if (st.railgun) return;
    st.railgun = { fired: 0 };
    st.railTimer = 0;
    _egNkToast('eg_lds_railgun', '⚡ RAILGUN! Clear the magnetic rails!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
}


// One rail lane: full-screen telegraph through the stone aimed at the player.
function _egLdsFireRail(st, sn, pr, W, H) {
    const c = _egNkPlayerCenter();
    const horiz = c ? Math.abs(c.x - sn.x) >= Math.abs(c.y - sn.y) : Math.random() < 0.5;
    const pos = horiz ? (c ? c.y : H / 2) : (c ? c.x : W / 2);
    const el = _egNkEl(st.run, 'div', 'eg-lds-rail' + (horiz ? ' horiz' : ' vert'));
    if (horiz) {
        el.style.left = '0px';
        el.style.top = Math.round(pos) + 'px';
    } else {
        el.style.left = Math.round(pos) + 'px';
        el.style.top = '0px';
    }
    st.railWarns.push({ horiz, pos, t: 0, warnMs: EG_LDS_RAIL_WARN_MS, hot: false, el });
}


// ── Charge attack: Magnetic Leash ────────────────────────────────────────
function _egLodestoneLeash(monster) {
    const st = _egLodestoneWatcher;
    if (!st || st.leash || st.vortex || _egNkDodgeBusy() || _egNkFrozen()) return;
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const warnEl = _egNkEl(st.run, 'div', 'eg-lds-leash-line');
    _egLdsPlaceLine(warnEl, st.stone.x, st.stone.y, c.x, c.y);
    st.leash = { phase: 'warn', t: 0, px: c.x, py: c.y, locked: false, warnEl, chainEl: null };
    _egNkToast('eg_lds_leash_warn', '🔗 The Lodestone coils a chain — dodge the line!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lds_snap'); } catch (e) {}
}


// Positions a zero-size element as a line from (x1,y1) to (x2,y2).
function _egLdsPlaceLine(el, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    el.style.left = x1 + 'px';
    el.style.top = y1 + 'px';
    el.style.width = Math.round(len) + 'px';
    el.style.transform = 'rotate(' + ang + 'rad)';
}


// Point-to-segment distance (for the leash corridor check).
function _egLdsDistToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx, cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent drag/flip cadence —
// keep the handler name alive so any stale schedule entry no-ops instead
// of erroring.
function _egMechPolarityField(monster, phase) { void monster; void phase; }
