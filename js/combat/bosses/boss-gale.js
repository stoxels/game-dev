import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE GALE (boss_gale)---------------------------
//------------------------------------------------------------------------
// Living-weather siege - wind reading wins it: wandering Eye, alternating
// CROSSWIND, roaming cyclone funnels, TORNADO LADDER at 60%, collapsing EYE
// OF THE STORM rings at 30%, and the CYCLONE LANCE charge attack.
//
// Shared mechanics (probability_shift) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_gale: {
        id: 'boss_gale', name: 'The Gale', emoji: '🌪️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_gale: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility - the persistent watcher now
            // owns the funnels; the handler no-ops (same shim pattern as
            // the other reworked bosses).
            { name: 'gale_vault', intervalBase: 21000, intervalVariance: 5000, handler: '_mechGaleVault' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
        onInit: _galeArenaInit,
    },
});


// ── Storm tuning ─────────────────────────────────────────────────────────
// The Eye (boss body)
export const GAL_EYE_R = 48;                     // eye visual radius
export const GAL_EYE_SPEED = [0, 24, 32, 42];    // px/s wander per phase
export const GAL_EYE_REPICK_MS = 6200;           // max time on one wander target
export const GAL_UPDRAFT_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the eye
export const GAL_UPDRAFT_CD_MS = 1100;           // per-eye touch cooldown
export const GAL_UPDRAFT_FLING = [0, 130, 155, 180]; // px fling (upward-biased)
// Crosswind (global breeze)
export const GAL_WIND_INTERVAL_MS = 9000;        // how long one gust blows
export const GAL_WIND_CALM_MS = 4500;            // calm between gusts (direction flips after it)
export const GAL_WIND_PUSH = [0, 170, 210, 250]; // px/s gust per phase (walking is 320 px/s: strong, but you can still walk against it)
export const GAL_WIND_STREAKS = 7;               // streak elements per side
// Cyclone funnels (perpetual Vault)
export const GAL_FUNNEL_N = [0, 1, 2, 2];        // alive per phase
export const GAL_FUNNEL_SPAWN_MS = [0, 6500, 5200, 4500]; // spawn cadence
export const GAL_FUNNEL_SPEED = [0, 80, 100, 125]; // px/s hunt
export const GAL_FUNNEL_DMG = [0, 7, 9, 12];     // %maxHP per second of contact (paid as one hit per GAL_FUNNEL_CD_MS)
export const GAL_FUNNEL_CD_MS = 700;             // per-funnel hit cooldown (real hit + feedback, not a silent DoT)
export const GAL_FUNNEL_R = 52;                  // contact radius
// Tornado Ladder (60% gate)
export const GAL_LADDER_N = 3;                   // twisters in the column
export const GAL_LADDER_WARN_MS = 1000;          // lane telegraph per twister
export const GAL_LADDER_RISE_MS = 1250;          // climb time per twister
export const GAL_LADDER_W = 190;                 // lane width
export const GAL_LADDER_DMG = 0.13;              // %maxHP inside a twister
export const GAL_LADDER_GAP_MS = 350;            // stagger between twisters
// Perfect Storm finale (10% gate): faster, tighter rings, then a 5-lane volley
export const GAL_FINALE_RINGS = 5;
export const GAL_FINALE_TIME_MS = 2200;
export const GAL_FINALE_GAP_MS = 450;
export const GAL_FINALE_GAP_DEG = 62;
export const GAL_FINALE_DMG = 0.16;
export const GAL_FINALE_WIND_MULT = 1.15;        // gusts stay a bit stronger afterwards (250 x 1.15 stays under walking speed)
export const GAL_FINALE_LANCE_EVERY_MS = [9000, 13000];
// Eye of the Storm (30% gate)
export const GAL_CONTRACT_RINGS = 4;             // contracting rings in sequence
export const GAL_CONTRACT_START_R = 520;         // px starting radius
export const GAL_CONTRACT_MIN_R = 56;            // fully contracted
export const GAL_CONTRACT_TIME_MS = 3000;        // per-ring contraction
export const GAL_CONTRACT_GAP_MS = 700;          // between rings
export const GAL_CONTRACT_GAP_DEG = 78;          // width of the safe opening in each ring
export const GAL_CONTRACT_BAND_PX = 20;          // half-thickness of the damaging band
export const GAL_CONTRACT_DMG = 0.13;            // %maxHP caught in a ring
// Cyclone Lance (charge attack)
export const GAL_LANCE_EVERY_MS = [13000, 20000]; // volley cadence (random in range)
export const GAL_LANCE_LINES = [2, 5];           // lanes per volley (random in range)
export const GAL_LANCE_WARN_MS = 1500;           // lane telegraph
export const GAL_LANCE_FLIGHT_MS = 520;          // bolt travel
export const GAL_LANCE_DMG = [0, 0.12, 0.14, 0.17]; // %maxHP by phase
export const GAL_LANCE_FLING = [0, 170, 200, 230];  // px fling when hit


export let _galeWatcher = null; // per-fight storm state

// Uniform random integer in [lo, hi].
function _galRand(lo, hi) {
    return Math.round(lo + Math.random() * (hi - lo));
}

// Picks where a ring's opening sits (degrees clockwise from 12 o'clock).
// Random, but only among angles whose opening is reachable ON SCREEN from the
// ring centre: with the player near an edge, an opening pointing off-screen
// could never be found in time. Falls back to facing the arena centre.
function _galPickGapStart(cx, cy, gapDeg) {
    const W = window.innerWidth, H = window.innerHeight, pad = 50;
    const onScreen = (a, r) => {
        const x = cx + Math.sin(a * Math.PI / 180) * r;
        const y = cy - Math.cos(a * Math.PI / 180) * r;
        return x >= pad && x <= W - pad && y >= pad && y <= H - pad;
    };
    const open = (start) => {
        const mid = start + gapDeg / 2;
        return onScreen(mid, 140) && onScreen(mid, 260)
            && onScreen(start + 8, 200) && onScreen(start + gapDeg - 8, 200);
    };
    for (let i = 0; i < 40; i++) {
        const start = Math.round(Math.random() * 360);
        if (open(start)) return start;
    }
    // Nothing fits (tiny window / corner): point the opening at the screen centre.
    const toCentre = Math.atan2(W / 2 - cx, -(H / 2 - cy)) * 180 / Math.PI;
    return Math.round(((toCentre - gapDeg / 2) % 360 + 360) % 360);
}


// Phase lookup helper - resolves the boss's current phase (default 1).
export function _galPhase(st) {
    if (typeof _monsters !== 'undefined') {
        const m = globalThis._monsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every storm overlay (registered in boss-framework teardown).
export function _galeTeardown() {
    if (_galeWatcher) {
        const st = _galeWatcher;
        _galeWatcher = null;
        (st.funnels || []).forEach(f => { try { if (f.el) f.el.remove(); } catch (e) {} if (f.dust) { try { f.dust.remove(); } catch (e) {} } });
        if (st.ladder) (st.ladder.twisters || []).forEach(t => { try { if (t.el) t.el.remove(); } catch (e) {} try { if (t.warnEl) t.warnEl.remove(); } catch (e) {} });
        if (st.rings) { try { if (st.rings.live && st.rings.live.el) st.rings.live.el.remove(); } catch (e) {} }
        (st.lances || []).forEach(l => { try { if (l.el) l.el.remove(); } catch (e) {} try { if (l.boltEl) l.boltEl.remove(); } catch (e) {} });
        (st.streaks || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        try { if (st.windBanner) st.windBanner.remove(); } catch (e) {}
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes eye + ring els too
    }
    document.querySelectorAll('.sx-gal-eye, .sx-gal-funnel, .sx-gal-dust, .sx-gal-wind-banner, .sx-gal-streak, .sx-gal-lane, .sx-gal-twister, .sx-gal-ring, .sx-gal-lance, .sx-gal-lance-bolt').forEach(el => el.remove());
}


// ── Persistent arena: the eye + crosswind + perpetual funnels ───────────
export function _galeArenaInit(monster) {
    if (_galeWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        eye: null,
        windDir: 0, windUntil: 0, windBanner: null, streaks: [],
        funnels: [], funnelAcc: 0,
        ladder: null, ladderLanes: [],
        rings: null,
        lances: [], lanceAcc: 0, lanceNextMs: _galRand(GAL_LANCE_EVERY_MS[0], GAL_LANCE_EVERY_MS[1]),
        windAcc: 0, lastWindDir: 0, finale: false,
        gate60Done: false, gate30Done: false, gate10Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _galeWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run): tier clock,
    // passive so it never blocks scheduled mechanics.
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_galeWatcher === st) _galeWatcher = null; };
    st.run = run;

    // The Eye: the boss's arena body.
    const el = _nkEl(run, 'div', 'sx-gal-eye');
    el.innerHTML = '<i class="sx-gal-eye-ring"></i><i class="sx-gal-eye-ring r2"></i><i class="sx-gal-eye-core"></i>';
    el.style.width = el.style.height = (GAL_EYE_R * 2) + 'px';
    st.eye = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.32,
        tx: window.innerWidth / 2, ty: window.innerHeight * 0.32,
        repickAt: GAL_EYE_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.eye.x - GAL_EYE_R) + 'px,' + Math.round(st.eye.y - GAL_EYE_R) + 'px)';

    if (monster) st.everLive = true;

    _nkLoop(run, (dtS, now) => {
        if (_galeWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _galeLadder(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _galeContract(st, now); }
        // Finale waits for an earlier set-piece to finish (a big HP dive can cross several gates).
        if (!st.gate10Done && hpPct <= 0.10 && st.gate30Done && !st.rings && !st.ladder) {
            st.gate10Done = true;
            _galeContract(st, now, true);
        }

        // ── The Eye: wander, Updraft on touch ──
        const e = st.eye;
        e.repickAt -= dtS * 1000;
        const edx = e.tx - e.x, edy = e.ty - e.y;
        const ed = Math.hypot(edx, edy) || 1;
        const estep = (st.rings ? 260 : GAL_EYE_SPEED[p]) * dtS;   // planted eye rushes to centre so rings read as centred
        if (!st.rings && (ed <= estep || e.repickAt <= 0)) {
            e.tx = 150 + Math.random() * Math.max(60, W - 300);
            e.ty = 120 + Math.random() * Math.max(60, H - 360);
            e.repickAt = GAL_EYE_REPICK_MS;
        } else if (ed > 1) {
            e.x += (edx / ed) * Math.min(estep, ed);
            e.y += (edy / ed) * Math.min(estep, ed);
        }
        e.el.style.transform = 'translate(' + Math.round(e.x - GAL_EYE_R) + 'px,' + Math.round(e.y - GAL_EYE_R) + 'px)';
        if (c && pr && now >= e.cdUntil && _nkCircleHit(e.x, e.y, GAL_EYE_R * 0.85, pr, 0)) {
            e.cdUntil = now + GAL_UPDRAFT_CD_MS;
            const dx = c.x - e.x, dy = c.y - e.y;
            const d = Math.hypot(dx, dy) || 1;
            // Updraft: fling away from the eye with an upward bias.
            const fx = (dx / d) * GAL_UPDRAFT_FLING[p];
            const fy = Math.min(0, (dy / d) * GAL_UPDRAFT_FLING[p]) - GAL_UPDRAFT_FLING[p] * 0.35;
            // Animated fling (contact at the eye): glide + tumble + burst.
            _nkFlingAvatar(fx, fy, e.x, e.y);
            const dealt = _nkHit(GAL_UPDRAFT_DMG[p], 'cold', st.level);
            _nkAbilityHitToast(dealt, 'The Gale', 'Updraft');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e2) {}
        }

        // ── Crosswind: direction swap + push + streak visuals ──
        if (now >= st.windUntil) {
            if (st.windDir !== 0) {
                // Gust over: a calm spell before the wind comes back the other way.
                st.lastWindDir = st.windDir;
                st.windDir = 0;
                st.windUntil = now + GAL_WIND_CALM_MS;
            } else {
                st.windDir = st.lastWindDir === 0 ? (Math.random() < 0.5 ? -1 : 1) : -st.lastWindDir;
                st.windUntil = now + GAL_WIND_INTERVAL_MS;
                _galeShowWindBanner(st, st.windDir);
            }
        }
        if (c && st.windDir !== 0 && !st.ladder && !st.rings) {
            // Whole pixels only: the avatar position is read back as an integer,
            // so per-frame sub-pixel pushes (e.g. 0.3px at 60fps) used to vanish.
            st.windAcc += st.windDir * GAL_WIND_PUSH[p] * (st.finale ? GAL_FINALE_WIND_MULT : 1) * dtS;
            const whole = Math.trunc(st.windAcc);
            if (whole !== 0) {
                st.windAcc -= whole;
                _nkNudgeAvatar(whole, 0);
            }
        }
        _galeTickStreaks(st, dtS);

        // ── Cyclone funnels: perpetual hunt ──
        st.funnelAcc += dtS * 1000;
        if (st.funnels.length < GAL_FUNNEL_N[p] && st.funnelAcc >= GAL_FUNNEL_SPAWN_MS[p] && !st.ladder && !st.rings) {
            st.funnelAcc = 0;
            _galeSpawnFunnel(st);
        }
        _galeTickFunnels(st, dtS, now, c, pr, p);

        // ── Tornado Ladder (60% gate) ──
        _galeTickLadder(st, dtS, pr);

        // ── Eye of the Storm contraction (30% gate) ──
        _galeTickRings(st, dtS, c);

        // ── Cyclone Lance volleys (ambient pressure between gates) ──
        st.lanceAcc += dtS * 1000;
        if (st.lanceAcc >= st.lanceNextMs && st.lances.length === 0 && !st.ladder && !st.rings) {
            st.lanceAcc = 0;
            const every = st.finale ? GAL_FINALE_LANCE_EVERY_MS : GAL_LANCE_EVERY_MS;
            st.lanceNextMs = _galRand(every[0], every[1]);
            _galeLanceVolley(st, p);
        }
        _galeTickLances(st, dtS, pr, p);

        return true;
    });
}


// ── Crosswind visuals: banner + drifting wind streaks from the upwind side
export function _galeShowWindBanner(st, dir) {
    try { if (st.windBanner) st.windBanner.remove(); } catch (e) {}
    const el = _nkEl(st.run, 'div', 'sx-gal-wind-banner');
    el.textContent = dir < 0 ? '◀◀ CROSSWIND' : 'CROSSWIND ▶▶';
    st.windBanner = el;
    setTimeout(() => { try { if (st.windBanner === el) el.remove(); } catch (e) {} }, 1800);
    // Streaks: recycled drifting lines on the windward side.
    st.streaks.forEach(s => { try { s.el.remove(); } catch (e) {} });
    st.streaks = [];
    const fromLeft = dir > 0;
    for (let i = 0; i < GAL_WIND_STREAKS; i++) {
        const sEl = _nkEl(st.run, 'div', 'sx-gal-streak');
        sEl.style.width = (70 + Math.random() * 90) + 'px';
        const s = {
            x: fromLeft ? -40 - Math.random() * 260 : window.innerWidth + 40 + Math.random() * 260,
            y: 60 + Math.random() * Math.max(60, window.innerHeight - 120),
            spd: 220 + Math.random() * 160,
            el: sEl,
        };
        sEl.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
        st.streaks.push(s);
    }
}


// Advances streak drift; streaks recycle across the screen while the wind
// is active, then fade with the banner cycle.
export function _galeTickStreaks(st, dtS) {
    const W = window.innerWidth;
    st.streaks.forEach((s, i) => {
        s.x += st.windDir * s.spd * dtS;
        if (st.windDir > 0 && s.x > W + 60) s.x = -50;
        if (st.windDir < 0 && s.x < -60) s.x = W + 50;
        s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
        if (!st.windDir) { try { s.el.remove(); } catch (e) {} st.streaks.splice(i, 1); }
    });
}


// Layered rings that read as a spinning cone (pure CSS, see bosses2.css).
function _galeSwirlHTML() {
    return '<i class="sx-gal-sw s1"></i><i class="sx-gal-sw s2"></i><i class="sx-gal-sw s3"></i><i class="sx-gal-sw s4"></i>';
}


// ── Cyclone funnels: spawn with a dust telegraph, hunt the player ────────
export function _galeSpawnFunnel(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const dust = _nkEl(st.run, 'div', 'sx-gal-dust');
    const x = 80 + Math.random() * Math.max(60, W - 160);
    const y = 100 + Math.random() * Math.max(60, H - 200);
    dust.style.left = x + 'px';
    dust.style.top = y + 'px';
    const funnel = { x, y, el: null, dust, dustT: 0, born: false };
    st.funnels.push(funnel);
    setTimeout(() => {
        try { dust.remove(); } catch (e) {}
        if (_galeWatcher !== st) return;
        const el = _nkEl(st.run, 'div', 'sx-gal-funnel');
        el.innerHTML = _galeSwirlHTML();
        el.style.transform = 'translate(' + Math.round(funnel.x - 30) + 'px,' + Math.round(funnel.y - 30) + 'px)';
        funnel.el = el;
        funnel.born = true;
    }, 900);
}


// Ticks funnels: hunt + wrap + cold DoT inside the vortex.
export function _galeTickFunnels(st, dtS, now, c, pr, p) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = st.funnels.length - 1; i >= 0; i--) {
        const f = st.funnels[i];
        if (!f.born) continue; // still telegraphing dust
        const dx = c ? c.x - f.x : (i % 2 ? 1 : -1);
        const dy = c ? c.y - f.y : 0;
        const d = Math.hypot(dx, dy) || 1;
        const spd = GAL_FUNNEL_SPEED[p];
        f.x += (dx / d) * spd * dtS;
        f.y += (dy / d) * spd * dtS;
        if (f.x < -70) f.x = W + 60;
        if (f.x > W + 70) f.x = -60;
        if (f.y < -70) f.y = H + 60;
        if (f.y > H + 70) f.y = -60;
        f.el.style.transform = 'translate(' + Math.round(f.x - 30) + 'px,' + Math.round(f.y - 30) + 'px)';
        if (pr && c && _nkCircleHit(f.x, f.y, GAL_FUNNEL_R, pr, 0)) {
            if (now >= (f.cdUntil || 0)) {
                f.cdUntil = now + GAL_FUNNEL_CD_MS;
                const dealt = _nkHit(GAL_FUNNEL_DMG[p] / 100 * (GAL_FUNNEL_CD_MS / 1000), 'cold', st.level);
                // Contact hits repeat every 0.7s while inside the funnel - the
                // hit flash and HP bar already show them, so no toast spam.
                _nkAbilityHitToast(dealt, 'The Gale', 'Cyclone', true);
            }
        }
        // Funnel life: roams 9s, then dissolves (respawn handled by cadence).
        f.life = (f.life || 9000) - dtS * 1000;
        if (f.life <= 0) {
            try { f.el.remove(); } catch (e) {}
            st.funnels.splice(i, 1);
        }
    }
}


// ── 60% gate: Tornado Ladder ─────────────────────────────────────────────
// Three huge twisters climb the screen bottom→top through telegraphed
// lanes, staggered; being inside a live twister lifts (hits + flings up).
export function _galeLadder(st, now) {
    if (st.ladder) return;
    const W = window.innerWidth;
    const lanes = [];
    const usedX = [];
    for (let i = 0; i < GAL_LADDER_N; i++) {
        let x, guard = 0;
        do {
            x = 120 + Math.random() * Math.max(80, W - 240);
            guard++;
        } while (usedX.some(u => Math.abs(u - x) < 230) && guard < 20);
        usedX.push(x);
        lanes.push({ x, at: 300 + i * (GAL_LADDER_GAP_MS + GAL_LADDER_WARN_MS + GAL_LADDER_RISE_MS) });
    }
    st.ladder = { lanes, idx: 0, t: 0, twisters: [] };
    _nkToast('eg_gale_ladder', '🌪️ TORNADO LADDER! Stay OUT of the glowing lanes!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e) {}
}


// Ticks the ladder state machine: spawn lane warn → rising twister → top.
export function _galeTickLadder(st, dtS, pr) {
    const ld = st.ladder;
    if (!ld) return;
    const H = window.innerHeight;
    ld.t += dtS * 1000;
    while (ld.idx < ld.lanes.length && ld.t >= ld.lanes[ld.idx].at) {
        const lane = ld.lanes[ld.idx];
        const warnEl = _nkEl(st.run, 'div', 'sx-gal-lane');
        warnEl.innerHTML = '<span class="sx-gal-lane-chev">▲ ▲ ▲</span>';
        warnEl.style.left = (lane.x - GAL_LADDER_W / 2) + 'px';
        warnEl.style.width = GAL_LADDER_W + 'px';
        const twister = { x: lane.x, y: H + 90, warnEl, el: null, phase: 'warn', t: 0 };
        st.ladder.twisters.push(twister);
        ld.idx++;
    }
    for (let i = ld.twisters.length - 1; i >= 0; i--) {
        const tw = ld.twisters[i];
        tw.t += dtS * 1000;
        if (tw.phase === 'warn') {
            if (tw.t >= GAL_LADDER_WARN_MS) {
                tw.phase = 'rise';
                tw.t = 0;
                tw.warnEl.classList.add('hot');
                tw.el = _nkEl(st.run, 'div', 'sx-gal-twister');
                tw.el.innerHTML = _galeSwirlHTML();
                tw.el.style.left = (tw.x - 60) + 'px';
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e) {}
            }
        } else if (tw.phase === 'rise') {
            const k = tw.t / GAL_LADDER_RISE_MS;
            tw.y = (H + 90) - (H + 180) * Math.min(1, k);
            tw.el.style.top = Math.round(tw.y) + 'px';
            if (pr && _nkCircleHit(tw.x, tw.y, 62, pr, 0)) {
                // Lift: hit + strong upward fling (once per twister).
                if (!tw.hit) {
                    tw.hit = true;
                    _galPhase(st);
                    const dealt = _nkHit(GAL_LADDER_DMG, 'cold', st.level);
                    _nkAbilityHitToast(dealt, 'The Gale', 'Tornado');
                    _nkFlingAvatar(0, -GAL_LADDER_DMG * 900, tw.x, tw.y);
                }
            }
            if (k >= 1) {
                try { tw.warnEl.remove(); } catch (e) {}
                try { tw.el.remove(); } catch (e) {}
                ld.twisters.splice(i, 1);
            }
        }
    }
    if (ld.idx >= ld.lanes.length && ld.twisters.length === 0) st.ladder = null;
}


// ── 30% gate: Eye of the Storm ───────────────────────────────────────────
// The eye plants at center; 4 vortex rings contract inward in sequence.
export function _galeContract(st, now, finale) {
    if (st.rings) return;
    const W = window.innerWidth, H = window.innerHeight;
    const eyeEl = st.eye.el;
    eyeEl.classList.add('planted');
    st.eye.tx = W / 2; st.eye.ty = H / 2; // eye parks at center
    const nRings = finale ? GAL_FINALE_RINGS : GAL_CONTRACT_RINGS;
    const timeMs = finale ? GAL_FINALE_TIME_MS : GAL_CONTRACT_TIME_MS;
    const gapMs = finale ? GAL_FINALE_GAP_MS : GAL_CONTRACT_GAP_MS;
    const rings = [];
    for (let i = 0; i < nRings; i++) {
        // First ring waits ~1.6s so the eye can reach the centre and the toast reads.
        rings.push({ at: 1600 + i * (timeMs + gapMs) });
    }
    st.rings = {
        rings, idx: 0, t: 0, live: null, finale: !!finale, timeMs,
        gapDeg: finale ? GAL_FINALE_GAP_DEG : GAL_CONTRACT_GAP_DEG,
        dmg: finale ? GAL_FINALE_DMG : GAL_CONTRACT_DMG,
    };
    if (finale) _nkToast('eg_gale_finale', '🌪️💥 PERFECT STORM! Faster rings - find every GAP, then dodge the lances!');
    else _nkToast('eg_gale_contract', '🌀 EYE OF THE STORM! Run through the GAP in each ring!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e) {}
}


// Ticks contracting rings: spawn → shrink toward the eye → snap closed.
export function _galeTickRings(st, dtS, c) {
    const rg = st.rings;
    if (!rg) return;
    rg.t += dtS * 1000;
    // Spawn the next ring on schedule. Each ring closes in on WHERE THE PLAYER
    // STANDS when it appears (the eye flies there too) - a ring centred on the
    // arena could be ignored from a far corner.
    if (rg.idx < rg.rings.length && rg.t >= rg.rings[rg.idx].at && !rg.live) {
        const W0 = window.innerWidth, H0 = window.innerHeight;
        const cx = c ? c.x : W0 / 2, cy = c ? c.y : H0 / 2;
        st.eye.tx = cx; st.eye.ty = cy;
        const el = _nkEl(st.run, 'div', 'sx-gal-ring');
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';
        // The opening: a wedge (clockwise from 12 o'clock) with no band. Each
        // ring puts it somewhere new; the player runs through it.
        const gapStart = _galPickGapStart(cx, cy, rg.gapDeg);
        el.style.setProperty('--gap', gapStart + 'deg');
        el.style.setProperty('--gapw', rg.gapDeg + 'deg');
        rg.live = { el, t: 0, hit: false, gapStart, cx, cy };
        rg.idx++;
    }
    // Contract the live ring.
    if (rg.live) {
        const r = rg.live;
        r.t += dtS * 1000;
        const k = Math.min(1, r.t / rg.timeMs);
        const rad = GAL_CONTRACT_START_R + (GAL_CONTRACT_MIN_R - GAL_CONTRACT_START_R) * k;
        r.el.style.width = r.el.style.height = Math.round(rad * 2) + 'px';
        r.el.style.marginLeft = r.el.style.marginTop = (-rad) + 'px';
        if (!r.hit && c) {
            // Hurt only while the BAND passes over you, and only outside the gap.
            const ex = r.cx, ey = r.cy;
            const d = Math.hypot(c.x - ex, c.y - ey);
            if (Math.abs(d - rad) < GAL_CONTRACT_BAND_PX) {
                let ang = Math.atan2(c.x - ex, -(c.y - ey)) * 180 / Math.PI;   // clockwise from 12 o'clock
                ang = ((ang % 360) + 360) % 360;
                const into = (((ang - r.gapStart) % 360) + 360) % 360;
                const inGap = into >= 6 && into <= rg.gapDeg - 6;
                if (!inGap) {
                    r.hit = true;
                    const dealt = _nkHit(rg.dmg, 'cold', st.level);
                    _nkAbilityHitToast(dealt, 'The Gale', 'Vortex Ring');
                }
            }
        }
        if (k >= 1) {
            try { r.el.remove(); } catch (e) {}
            rg.live = null;
        }
    }
    // Done: release the eye + clear the gate.
    if (rg.idx >= rg.rings.length && !rg.live) {
        st.eye.el.classList.remove('planted');
        const wasFinale = rg.finale;
        st.rings = null;
        if (wasFinale) {
            // Finale closer: a full 5-lane volley; gusts and lances stay fiercer to the end.
            st.finale = true;
            _galeLanceVolley(st, 3, 5);
        }
    }
}


// ── Charge attack: Cyclone Lance ─────────────────────────────────────────
// Dispatched from _fireMonsterAttack AND on an ambient cadence: a lane
// telegraph through the player's row/column, then an air bolt blasts
// across it, flinging anyone hit.
export function _galeCycloneLance(monster) {
    const st = _galeWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    _galeLanceVolley(st, p);
}


// A volley of 2-5 lanes (n overrides): the first is aimed at the player's
// live row/column, the rest land on random rows/columns, spaced so every
// volley leaves safe ground between its lanes.
export function _galeLanceVolley(st, p, n) {
    if (st.lances.length >= 6) return;
    const W = window.innerWidth, H = window.innerHeight;
    const count = n || _galRand(GAL_LANCE_LINES[0], GAL_LANCE_LINES[1]);
    const used = { h: [], v: [] };
    const spacing = 170;
    const pc = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    for (let i = 0; i < count; i++) {
        let horizontal = Math.random() < 0.55;
        let at;
        for (let tries = 0; tries < 12; tries++) {
            if (i === 0) {
                at = { x: pc.x, y: pc.y };
            } else {
                at = { x: 60 + Math.random() * Math.max(60, W - 120), y: 60 + Math.random() * Math.max(60, H - 120) };
            }
            const list = horizontal ? used.h : used.v;
            const coord = horizontal ? at.y : at.x;
            if (i === 0 || !list.some(u => Math.abs(u - coord) < spacing)) break;
            horizontal = !horizontal;   // crowded - try the other orientation
        }
        (horizontal ? used.h : used.v).push(horizontal ? at.y : at.x);
        _galeLance(st, p, at, horizontal);
    }
}


// Spawns one lance lane through `aim` (default: the player's live position).
export function _galeLance(st, p, aim, horizontalOverride) {
    const W = window.innerWidth, H = window.innerHeight;
    const c = aim || _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const horizontal = (typeof horizontalOverride === 'boolean') ? horizontalOverride : Math.random() < 0.6;
    const el = _nkEl(st.run, 'div', 'sx-gal-lance' + (horizontal ? ' horiz' : ' vert'));
    const fromLeft = Math.random() < 0.5;
    if (horizontal) {
        el.style.top = c.y + 'px';
        el.style.left = '0px';
        el.style.width = W + 'px';
    } else {
        el.style.left = c.x + 'px';
        el.style.top = '0px';
        el.style.height = H + 'px';
    }
    // Arrows on the side the bolt enters from, so the direction is readable.
    const side = horizontal ? (fromLeft ? 'l' : 'r') : (fromLeft ? 't' : 'b');
    const glyph = horizontal ? (fromLeft ? '▶ ▶ ▶' : '◀ ◀ ◀') : (fromLeft ? '▼<br>▼<br>▼' : '▲<br>▲<br>▲');
    el.innerHTML = '<span class="sx-gal-lance-arrow ' + side + '">' + glyph + '</span>';
    const lance = { horizontal, fixed: horizontal ? c.y : c.x, fromLeft, t: 0, el, boltEl: null, hit: false, p };
    st.lances.push(lance);
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e) {}
}


// Ticks lances: warn lane → bolt crosses → despawn.
export function _galeTickLances(st, dtS, pr, p) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = st.lances.length - 1; i >= 0; i--) {
        const l = st.lances[i];
        l.t += dtS * 1000;
        if (l.t < GAL_LANCE_WARN_MS) continue;
        if (!l.boltEl) {
            l.el.classList.add('hot');
            l.boltEl = _nkEl(st.run, 'div', 'sx-gal-lance-bolt');
            l.boltEl.style.left = '0px';
            l.boltEl.style.top = '0px';
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_push_fling', 'gale_howl'); } catch (e) {}
        }
        const k = Math.min(1, (l.t - GAL_LANCE_WARN_MS) / GAL_LANCE_FLIGHT_MS);
        const travel = (l.horizontal ? W : H) * (l.fromLeft ? k : 1 - k);
        if (l.horizontal) {
            l.boltEl.style.transform = 'translate(' + Math.round(travel - 44) + 'px,' + Math.round(l.fixed - 44) + 'px)';
        } else {
            l.boltEl.style.transform = 'translate(' + Math.round(l.fixed - 44) + 'px,' + Math.round(travel - 44) + 'px)';
        }
        if (!l.hit && pr) {
            const bx = l.horizontal ? travel : l.fixed;
            const by = l.horizontal ? l.fixed : travel;
            if (_nkCircleHit(bx, by, 44, pr, 0)) {
                l.hit = true;
                const dealt = _nkHit(GAL_LANCE_DMG[l.p], 'cold', st.level);
                // The damage number on the sprite already shows this hit - no toast.
                _nkAbilityHitToast(dealt, 'The Gale', 'Cyclone Lance', true);
                // Knocked along the blast direction.
                const dir = l.horizontal ? (l.fromLeft ? 1 : -1) : 0;
                _nkFlingAvatar(dir * GAL_LANCE_FLING[l.p], (l.horizontal ? -30 : GAL_LANCE_FLING[l.p]), bx, by);
            }
        }
        if (k >= 1) {
            try { l.el.remove(); } catch (e) {}
            try { l.boltEl.remove(); } catch (e) {}
            st.lances.splice(i, 1);
        }
    }
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the perpetual funnels - keep the
// handler name alive so any stale schedule entry no-ops instead of
// erroring.
export function _mechGaleVault(monster, phase) { void monster; void phase; }
