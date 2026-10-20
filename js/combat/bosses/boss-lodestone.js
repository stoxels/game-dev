import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE LODESTONE (boss_lodestone)------------------
//------------------------------------------------------------------------
// Living-magnet siege - POLARITY moves you: drifting stone with radial pull,
// flipping N/S REPULSION PULSES, shrapnel filings, MAGNETIC VORTEX at 60%,
// RAILGUN lanes at 30%, and the MAGNETIC LEASH reel-in charge attack. One
// _nkLoop drives every state machine.
//
// Shared mechanics (probability_shift) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_lodestone: {
        id: 'boss_lodestone', name: 'The Lodestone', emoji: '🧲',
        baseHP: 1050, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_lodestone: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility - the persistent watcher now
            // owns the drag/flip cadence; the handler no-ops (same shim
            // pattern as the other reworked bosses).
            { name: 'polarity_field', intervalBase: 21000, intervalVariance: 5000, handler: '_mechPolarityField' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
        onInit: _lodestoneArenaInit,
    },
});


// ── Magnetism tuning ─────────────────────────────────────────────────────
// The Lodestone (boss body)
export const LDS_R = 46;                          // stone visual radius
export const LDS_DRIFT_SPEED = [0, 20, 30, 42];   // px/s per phase
export const LDS_DRIFT_REPICK_MS = 5600;
export const LDS_CLAMP_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the stone
export const LDS_CLAMP_CD_MS = 1000;
export const LDS_CLAMP_FLING = [0, 140, 165, 190]; // INTO the stone
// Polarity drag + flip pulse
export const LDS_ATTRACT_SPEED = [0, 40, 55, 70]; // px/s radial pull
export const LDS_FLIP_MS = [0, 7000, 6000, 5000]; // polarity cycle
export const LDS_PULSE_SPEED = [0, 260, 300, 340]; // repulsion shove (one-shot)
// Shrapnel filings
export const LDS_FILINGS_EVERY_MS = [0, 5200, 4300, 3400];
export const LDS_FILING_SPEED = 250;
export const LDS_FILING_DMG = 0.04;               // %maxHP per filing
// Magnetic Vortex (60% gate)
export const LDS_VORTEX_MS = 4500;
export const LDS_VORTEX_PULL = [0, 170, 200, 235]; // px/s hard drag
export const LDS_VORTEX_GRIND_R = 140;            // grind zone around the stone
export const LDS_VORTEX_GRIND_PCT = 4;            // %maxHP per second inside
// Railgun (30% gate)
export const LDS_RAIL_N = 3;                      // lanes per gate
export const LDS_RAIL_GAP_MS = 1400;
export const LDS_RAIL_WARN_MS = 1100;
export const LDS_RAIL_SLUG_SPEED = 700;           // px/s
export const LDS_RAIL_DMG = [0, 0.14, 0.17, 0.20];
export const LDS_RAIL_FLING = [0, 170, 195, 220];
// Magnetic Leash (charge attack)
export const LDS_LEASH_WARN_MS = 900;             // line telegraph (tracks 0.4s)
export const LDS_LEASH_CORRIDOR = 44;             // px from the chain line
export const LDS_LEASH_REEL_MS = 1600;
export const LDS_LEASH_REEL_SPEED = [0, 230, 265, 300]; // px/s reel-in
export const LDS_LEASH_CLAMP_R = 150;             // clamp radius at chain end
export const LDS_LEASH_DMG = [0, 0.17, 0.20, 0.24];
export const LDS_LEASH_FLING = [0, 180, 205, 230];


export let _lodestoneWatcher = null; // per-fight magnetic state

// Phase lookup helper - resolves the boss's current phase (default 1).
export function _ldsPhase(st) {
    if (typeof _monsters !== 'undefined') {
        const m = globalThis._monsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every magnetic overlay (registered in boss-framework teardown).
export function _lodestoneTeardown() {
    if (_lodestoneWatcher) {
        const st = _lodestoneWatcher;
        _lodestoneWatcher = null;
        (st.filings || []).forEach(f => { try { if (f.el) f.el.remove(); } catch (e) {} });
        (st.slugs || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        (st.railWarns || []).forEach(w => { try { if (w.el) w.el.remove(); } catch (e) {} });
        if (st.vortex) { try { if (st.vortex.el) st.vortex.el.remove(); } catch (e) {} }
        if (st.leash) {
            try { if (st.leash.el) st.leash.el.remove(); } catch (e) {}
            try { if (st.leash.warnEl) st.leash.warnEl.remove(); } catch (e) {}
            try { if (st.leash.chainEl) st.leash.chainEl.remove(); } catch (e) {}
        }
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes the stone
    }
    document.querySelectorAll('.sx-lds-stone, .sx-lds-filing, .sx-lds-vortex, .sx-lds-rail, .sx-lds-slug, .sx-lds-leash-line, .sx-lds-chain').forEach(el => el.remove());
}


// ── Persistent arena: the stone, the field, the filings ─────────────────
export function _lodestoneArenaInit(monster) {
    if (_lodestoneWatcher) return;
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
    _lodestoneWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_lodestoneWatcher === st) _lodestoneWatcher = null; };
    st.run = run;

    // The Lodestone: the boss's arena body.
    const el = _nkEl(run, 'div', 'sx-lds-stone', '🧲');
    el.style.width = el.style.height = (LDS_R * 2) + 'px';
    st.stone = {
        x: window.innerWidth * 0.5, y: window.innerHeight * 0.35,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.35,
        repickAt: LDS_DRIFT_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.stone.x - LDS_R) + 'px,' + Math.round(st.stone.y - LDS_R) + 'px)';
    _ldsApplyPolarity(st);

    if (monster) st.everLive = true;

    _nkLoop(run, (dtS, now) => {
        if (_lodestoneWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _ldsVortex(st); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _ldsRailgun(st, live); }

        // ── The Lodestone: drift + MAGNETIC CLAMP on touch ──
        const sn = st.stone;
        const vortexing = !!st.vortex;
        if (!vortexing) {
            sn.repickAt -= dtS * 1000;
            const sdx = sn.tx - sn.x, sdy = sn.ty - sn.y;
            const sd = Math.hypot(sdx, sdy) || 1;
            const sstep = LDS_DRIFT_SPEED[p] * dtS;
            if (sd <= sstep || sn.repickAt <= 0) {
                sn.tx = 100 + Math.random() * Math.max(60, W - 200);
                sn.ty = 100 + Math.random() * Math.max(60, H - 220);
                sn.repickAt = LDS_DRIFT_REPICK_MS;
            } else {
                sn.x += (sdx / sd) * sstep;
                sn.y += (sdy / sd) * sstep;
            }
        }
        sn.el.style.transform = 'translate(' + Math.round(sn.x - LDS_R) + 'px,' + Math.round(sn.y - LDS_R) + 'px)';
        if (c && pr && now >= sn.cdUntil && !st.leash && _nkCircleHit(sn.x, sn.y, LDS_R * 0.9, pr, 0)) {
            sn.cdUntil = now + LDS_CLAMP_CD_MS;
            const dx = sn.x - c.x, dy = sn.y - c.y; // INTO the stone: magnetism pulls.
            const d = Math.hypot(dx, dy) || 1;
            _nkFlingAvatar((dx / d) * LDS_CLAMP_FLING[p], (dy / d) * LDS_CLAMP_FLING[p], sn.x, sn.y);
            const dealt = _nkHit(LDS_CLAMP_DMG[p], 'lightning', st.level);
            _nkAbilityHitToast(dealt, 'The Lodestone', 'Magnetic Clamp');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e2) {}
        }

        // ── Polarity cycle: attraction between flips, pulse on flip ──
        st.flipAcc += dtS * 1000;
        if (!vortexing && st.flipAcc >= LDS_FLIP_MS[p]) {
            st.flipAcc = 0;
            st.polarity = st.polarity === 'N' ? 'S' : 'N';
            _ldsApplyPolarity(st);
            // REPULSION PULSE: one hard shove away from the stone.
            if (c) {
                const dx = c.x - sn.x, dy = c.y - sn.y;
                const d = Math.hypot(dx, dy) || 1;
                if (typeof _nkNudgeAvatar === 'function') {
                    _nkNudgeAvatar((dx / d) * LDS_PULSE_SPEED[p] * 0.35, (dy / d) * LDS_PULSE_SPEED[p] * 0.35);
                }
                _ldsPulseRing(st, sn.x, sn.y);
            }
            _nkToast('eg_lds_flip', st.polarity === 'N' ? '🧲 POLARITY FLIP - N! Repulsion pulse!' : '🧲 POLARITY FLIP - S! Repulsion pulse!');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
        } else if (!vortexing && !st.leash && c) {
            // Gentle attraction toward the stone between flips.
            const dx = sn.x - c.x, dy = sn.y - c.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d > LDS_R + 40) _nkNudgeAvatar((dx / d) * LDS_ATTRACT_SPEED[p] * dtS, (dy / d) * LDS_ATTRACT_SPEED[p] * dtS);
        }

        // ── Shrapnel filings: spiral out, then launch ──
        st.filingsAcc += dtS * 1000;
        if (!vortexing && st.filingsAcc >= LDS_FILINGS_EVERY_MS[p]) {
            st.filingsAcc = 0;
            _ldsSpawnFiling(st, sn.x, sn.y, Math.random() * Math.PI * 2);
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
                    f.vx = Math.cos(f.ang) * LDS_FILING_SPEED;
                    f.vy = Math.sin(f.ang) * LDS_FILING_SPEED;
                }
            } else {
                f.x += f.vx * dtS;
                f.y += f.vy * dtS;
            }
            f.el.style.transform = 'translate(' + Math.round(f.x - 11) + 'px,' + Math.round(f.y - 11) + 'px) rotate(' + Math.round(f.t / 25) + 'deg)';
            if (pr && !f.hit && _nkCircleHit(f.x, f.y, 14, pr, 0)) {
                f.hit = true;
                const dealt = _nkHit(LDS_FILING_DMG, 'lightning', st.level);
                _nkAbilityHitToast(dealt, 'The Lodestone', 'Shrapnel Filings');
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
                _nkNudgeAvatar((dx / d) * LDS_VORTEX_PULL[p] * dtS, (dy / d) * LDS_VORTEX_PULL[p] * dtS);
                if (d < LDS_VORTEX_GRIND_R + LDS_R) {
                    _ldsGrindTick(st, vx, dtS, live);
                }
            }
            if (vx.t >= LDS_VORTEX_MS) {
                try { vx.el.remove(); } catch (e) {}
                st.vortex = null;
                _nkToast('eg_lds_vortex_end', '🌀 The field settles.', '#93c5fd');
            }
        }

        // ── Railgun (30% gate): warn → slug per lane ──
        if (st.railgun) {
            st.railTimer += dtS * 1000;
            if (st.railgun.fired < LDS_RAIL_N && st.railTimer >= st.railgun.fired * LDS_RAIL_GAP_MS) {
                _ldsFireRail(st, sn, pr, W, H);
                st.railgun.fired++;
            }
            if (st.railgun.fired >= LDS_RAIL_N) st.railgun = null;
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
            const sel = _nkEl(st.run, 'div', 'sx-lds-slug', '⚡');
            st.slugs.push({ horiz: rw.horiz, pos: rw.pos, x: rw.horiz ? -30 : rw.pos, y: rw.horiz ? rw.pos : -30,
                vx: rw.horiz ? LDS_RAIL_SLUG_SPEED : 0, vy: rw.horiz ? 0 : LDS_RAIL_SLUG_SPEED, t: 0, hit: false, el: sel });
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
        }
        // Slugs travel down their lanes.
        for (let i = st.slugs.length - 1; i >= 0; i--) {
            const s = st.slugs[i];
            s.t += dtS * 1000;
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            s.el.style.transform = 'translate(' + Math.round(s.x - 16) + 'px,' + Math.round(s.y - 16) + 'px)';
            if (pr && !s.hit && _nkCircleHit(s.x, s.y, 18, pr, 0)) {
                s.hit = true;
                const dx = (c ? c.x : s.x) - (st.stone.x), dy = (c ? c.y : s.y) - (st.stone.y);
                const d = Math.hypot(dx, dy) || 1;
                _nkFlingAvatar((dx / d) * LDS_RAIL_FLING[p], (dy / d) * LDS_RAIL_FLING[p], s.x, s.y);
                const dealt = _nkHit(LDS_RAIL_DMG[p], 'lightning', st.level);
                _nkAbilityHitToast(dealt, 'The Lodestone', 'Railgun');
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
                if (ls.t < LDS_LEASH_WARN_MS * 0.45) {
                    const c6 = _nkPlayerCenter();
                    if (c6) { ls.px = c6.x; ls.py = c6.y; _ldsPlaceLine(ls.warnEl, sn.x, sn.y, ls.px, ls.py); }
                } else if (!ls.locked) {
                    ls.locked = true;
                    ls.warnEl.classList.add('locked');
                }
                if (ls.t >= LDS_LEASH_WARN_MS) {
                    // Chain fires: did the player stand in the corridor?
                    const c7 = _nkPlayerCenter();
                    let caught = false;
                    if (c7) {
                        const seg = _ldsDistToSegment(c7.x, c7.y, sn.x, sn.y, ls.px, ls.py);
                        caught = seg <= LDS_LEASH_CORRIDOR;
                    }
                    try { ls.warnEl.remove(); } catch (e) {}
                    ls.warnEl = null;
                    if (caught) {
                        ls.phase = 'reel';
                        ls.t = 0;
                        const chEl = _nkEl(st.run, 'div', 'sx-lds-chain', '🔗');
                        ls.chainEl = chEl;
                        _nkToast('eg_lds_leash', '🔗 MAGNETIC LEASH! Fight the reel-in!');
                        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
                    } else {
                        // Missed: the chain sticks harmlessly.
                        _nkToast('eg_lds_miss', '💨 The chain snaps past you.', '#93c5fd');
                        try { if (ls.chainEl) ls.chainEl.remove(); } catch (e) {}
                        st.leash = null;
                    }
                }
            } else if (ls.phase === 'reel') {
                // Reel the player toward the stone.
                const c8 = _nkPlayerCenter();
                if (c8) {
                    const dx = sn.x - c8.x, dy = sn.y - c8.y;
                    const d = Math.hypot(dx, dy) || 1;
                    _nkNudgeAvatar((dx / d) * LDS_LEASH_REEL_SPEED[p] * dtS, (dy / d) * LDS_LEASH_REEL_SPEED[p] * dtS);
                    if (ls.chainEl) _ldsPlaceLine(ls.chainEl, sn.x, sn.y, c8.x, c8.y);
                }
                if (ls.t >= LDS_LEASH_REEL_MS) {
                    // Chain end: clamp check.
                    const c9 = _nkPlayerCenter();
                    const pr9 = _nkPlayerRect();
                    let clamped = false;
                    if (c9 && pr9) {
                        const dd = Math.hypot(c9.x - sn.x, c9.y - sn.y);
                        clamped = dd <= LDS_LEASH_CLAMP_R;
                    }
                    if (clamped) {
                        const dx = sn.x - (c9 ? c9.x : sn.x), dy = sn.y - (c9 ? c9.y : sn.y);
                        const d = Math.hypot(dx, dy) || 1;
                        _nkFlingAvatar((dx / d) * LDS_LEASH_FLING[p], (dy / d) * LDS_LEASH_FLING[p], sn.x, sn.y);
                        const dealt = _nkHit(LDS_LEASH_DMG[p], 'lightning', st.level);
                        _nkAbilityHitToast(dealt, 'The Lodestone', 'Leash Clamp');
                    } else {
                        _nkToast('eg_lds_broke', '💪 You broke the leash!', '#4ade80');
                    }
                    try { if (ls.chainEl) ls.chainEl.remove(); } catch (e) {}
                    st.leash = null;
                    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
                }
            }
        }

        return true;
    });
}


// Polarity visuals: N = red face, S = blue face (classic magnet ends).
export function _ldsApplyPolarity(st) {
    if (!st.stone || !st.stone.el) return;
    st.stone.el.classList.toggle('pol-n', st.polarity === 'N');
    st.stone.el.classList.toggle('pol-s', st.polarity === 'S');
}


// Expanding repulsion-pulse ring on polarity flip.
export function _ldsPulseRing(st, x, y) {
    const el = _nkEl(st.run, 'div', 'sx-lds-pulse');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 700);
}


// Vortex grind DoT: chunked lightning ticks while pressed against the stone.
export function _ldsGrindTick(st, vx, dtS, live) {
    vx.grindAcc = (vx.grindAcc || 0) + dtS * 1000;
    if (vx.grindAcc >= 500) {
        vx.grindAcc = 0;
        const dealt = _nkHit(LDS_VORTEX_GRIND_PCT / 200, 'lightning', st.level);
        _nkAbilityHitToast(dealt, 'The Lodestone', 'Field Grind');
    }
}


// One magnetized filing on a spiral path.
export function _ldsSpawnFiling(st, x, y, ang) {
    const el = _nkEl(st.run, 'div', 'sx-lds-filing', '🔩');
    st.filings.push({ x, y, ang, rad: LDS_R, spiral: 1200, vx: 0, vy: 0, t: 0, hit: false, el });
}


// ── 60% gate: Magnetic Vortex ────────────────────────────────────────────
export function _ldsVortex(st) {
    if (st.vortex) return;
    const el = _nkEl(st.run, 'div', 'sx-lds-vortex');
    st.vortex = { t: 0, el, grindAcc: 0 };
    _nkToast('eg_lds_vortex', '🌀 MAGNETIC VORTEX! Fight the pull - the stone grinds!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
}


// ── 30% gate: Railgun ────────────────────────────────────────────────────
export function _ldsRailgun(st, live) {
    if (st.railgun) return;
    st.railgun = { fired: 0 };
    st.railTimer = 0;
    _nkToast('eg_lds_railgun', '⚡ RAILGUN! Clear the magnetic rails!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
}


// One rail lane: full-screen telegraph through the stone aimed at the player.
export function _ldsFireRail(st, sn, pr, W, H) {
    const c = _nkPlayerCenter();
    const horiz = c ? Math.abs(c.x - sn.x) >= Math.abs(c.y - sn.y) : Math.random() < 0.5;
    const pos = horiz ? (c ? c.y : H / 2) : (c ? c.x : W / 2);
    const el = _nkEl(st.run, 'div', 'sx-lds-rail' + (horiz ? ' horiz' : ' vert'));
    if (horiz) {
        el.style.left = '0px';
        el.style.top = Math.round(pos) + 'px';
    } else {
        el.style.left = Math.round(pos) + 'px';
        el.style.top = '0px';
    }
    st.railWarns.push({ horiz, pos, t: 0, warnMs: LDS_RAIL_WARN_MS, hot: false, el });
}


// ── Charge attack: Magnetic Leash ────────────────────────────────────────
export function _lodestoneLeash(monster) {
    const st = _lodestoneWatcher;
    if (!st || st.leash || st.vortex || _nkDodgeBusy() || _nkFrozen()) return;
    const c = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const warnEl = _nkEl(st.run, 'div', 'sx-lds-leash-line');
    _ldsPlaceLine(warnEl, st.stone.x, st.stone.y, c.x, c.y);
    st.leash = { phase: 'warn', t: 0, px: c.x, py: c.y, locked: false, warnEl, chainEl: null };
    _nkToast('eg_lds_leash_warn', '🔗 The Lodestone coils a chain - dodge the line!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'lds_snap'); } catch (e) {}
}


// Positions a zero-size element as a line from (x1,y1) to (x2,y2).
export function _ldsPlaceLine(el, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    el.style.left = x1 + 'px';
    el.style.top = y1 + 'px';
    el.style.width = Math.round(len) + 'px';
    el.style.transform = 'rotate(' + ang + 'rad)';
}


// Point-to-segment distance (for the leash corridor check).
export function _ldsDistToSegment(px, py, x1, y1, x2, y2) {
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
// The old scheduled mechanic is now the persistent drag/flip cadence -
// keep the handler name alive so any stale schedule entry no-ops instead
// of erroring.
export function _mechPolarityField(monster, phase) { void monster; void phase; }
