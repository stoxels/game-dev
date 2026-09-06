//------------------------------------------------------------------------
//-------------------BOSS: THE GALE (boss_gale)---------------------------
//------------------------------------------------------------------------
// A rework of the old 8-second Cyclone Vault into a persistent storm
// siege. The Gale is a living weather system that never leaves the arena.
// Fight identity: the WHOLE FIGHT is about wind reading — every set-piece
// pushes, pulls or lifts, and the player wins by positioning, not DPS
// dodges alone.
//
//   PERSISTENT (whole fight, watcher):
//   • THE EYE — the boss itself: a swirling vortex that wanders the arena.
//     Touching it is an Updraft: animated fling upward-ish + cold damage.
//   • CROSSWIND — a slow global breeze that alternates direction every
//     ~7s (telegraphed by a wind-streak banner + toast): a gentle constant
//     push the player must lean against. It feeds every other mechanic.
//   • CYCLONE FUNNELS — the old Vault, now perpetual: 2–4 wandering
//     funnels roam the floor on a phase-scaled cadence, each leaving a
//     short-lived dust telegraph where it will next cut across. Inside a
//     funnel = cold DoT (the old 7/9/12% per second, tier-scaled).
//
//   60% GATE — TORNADO LADDER: three huge twisters spawn in a column and
//   climb the screen one after another through telegraphed lanes; each
//   lifts the player upward if caught (positioning fight).
//
//   30% GATE — EYE OF THE STORM: the arena collapses inward — 4 vortex
//   rings contract toward the screen center in sequence while the Eye
//   plants itself in the middle; thread the ring timings or be ground up.
//
//   CHARGE ATTACK — CYCLONE LANCE: a wind lance telegraphs as a lane,
//   then a compressed air bolt blasts across it, flinging anyone hit.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string. Damage flows through the shared tier curve.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gale: {
        id: 'boss_gale', name: 'The Gale', emoji: '🌪️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gale: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility — the persistent watcher now
            // owns the funnels; the handler no-ops (same shim pattern as
            // the other reworked bosses).
            { name: 'gale_vault', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechGaleVault' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
        onInit: _egGaleArenaInit,
    },
});


// ── Storm tuning ─────────────────────────────────────────────────────────
// The Eye (boss body)
const EG_GAL_EYE_R = 48;                     // eye visual radius
const EG_GAL_EYE_SPEED = [0, 30, 40, 52];    // px/s wander per phase
const EG_GAL_EYE_REPICK_MS = 6200;           // max time on one wander target
const EG_GAL_UPDRAFT_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the eye
const EG_GAL_UPDRAFT_CD_MS = 1100;           // per-eye touch cooldown
const EG_GAL_UPDRAFT_FLING = [0, 130, 155, 180]; // px fling (upward-biased)
// Crosswind (global breeze)
const EG_GAL_WIND_INTERVAL_MS = 7000;        // direction swap cadence
const EG_GAL_WIND_PUSH = [0, 34, 46, 60];    // px/s breeze per phase
const EG_GAL_WIND_STREAKS = 7;               // streak elements per side
// Cyclone funnels (perpetual Vault)
const EG_GAL_FUNNEL_N = [0, 2, 3, 4];        // alive per phase
const EG_GAL_FUNNEL_SPAWN_MS = [0, 5200, 4000, 3000]; // spawn cadence
const EG_GAL_FUNNEL_SPEED = [0, 95, 125, 160]; // px/s hunt
const EG_GAL_FUNNEL_DMG = [0, 7, 9, 12];     // %maxHP per second (DoT)
const EG_GAL_FUNNEL_R = 52;                  // contact radius
// Tornado Ladder (60% gate)
const EG_GAL_LADDER_N = 3;                   // twisters in the column
const EG_GAL_LADDER_WARN_MS = 1000;          // lane telegraph per twister
const EG_GAL_LADDER_RISE_MS = 1250;          // climb time per twister
const EG_GAL_LADDER_W = 190;                 // lane width
const EG_GAL_LADDER_DMG = 0.13;              // %maxHP inside a twister
const EG_GAL_LADDER_GAP_MS = 350;            // stagger between twisters
// Eye of the Storm (30% gate)
const EG_GAL_CONTRACT_RINGS = 4;             // contracting rings in sequence
const EG_GAL_CONTRACT_START_R = 520;         // px starting radius
const EG_GAL_CONTRACT_MIN_R = 56;            // fully contracted
const EG_GAL_CONTRACT_TIME_MS = 2400;        // per-ring contraction
const EG_GAL_CONTRACT_GAP_MS = 500;          // between rings
const EG_GAL_CONTRACT_DMG = 0.13;            // %maxHP caught in a ring
// Cyclone Lance (charge attack)
const EG_GAL_LANCE_WARN_MS = 1000;           // lane telegraph
const EG_GAL_LANCE_FLIGHT_MS = 520;          // bolt travel
const EG_GAL_LANCE_DMG = [0, 0.12, 0.14, 0.17]; // %maxHP by phase
const EG_GAL_LANCE_FLING = [0, 170, 200, 230];  // px fling when hit


let _egGaleWatcher = null; // per-fight storm state

// Phase lookup helper — resolves the boss's current phase (default 1).
function _egGalPhase(st) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every storm overlay (registered in boss-framework teardown).
function _egGaleTeardown() {
    if (_egGaleWatcher) {
        const st = _egGaleWatcher;
        _egGaleWatcher = null;
        (st.funnels || []).forEach(f => { try { if (f.el) f.el.remove(); } catch (e) {} if (f.dust) { try { f.dust.remove(); } catch (e) {} } });
        if (st.ladder) (st.ladder.twisters || []).forEach(t => { try { if (t.el) t.el.remove(); } catch (e) {} try { if (t.warnEl) t.warnEl.remove(); } catch (e) {} });
        if (st.rings) { try { if (st.rings.live && st.rings.live.el) st.rings.live.el.remove(); } catch (e) {} }
        (st.lances || []).forEach(l => { try { if (l.el) l.el.remove(); } catch (e) {} try { if (l.boltEl) l.boltEl.remove(); } catch (e) {} });
        (st.streaks || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        try { if (st.windBanner) st.windBanner.remove(); } catch (e) {}
        try { if (st.run) _egNkKillRun(st.run); } catch (e) {} // removes eye + ring els too
    }
    document.querySelectorAll('.eg-gal-eye, .eg-gal-funnel, .eg-gal-dust, .eg-gal-wind-banner, .eg-gal-streak, .eg-gal-lane, .eg-gal-twister, .eg-gal-ring, .eg-gal-lance, .eg-gal-lance-bolt').forEach(el => el.remove());
}


// ── Persistent arena: the eye + crosswind + perpetual funnels ───────────
function _egGaleArenaInit(monster) {
    if (_egGaleWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        eye: null,
        windDir: 0, windUntil: 0, windBanner: null, streaks: [],
        funnels: [], funnelAcc: 0,
        ladder: null, ladderLanes: [],
        rings: null,
        lances: [], lanceAcc: 0,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egGaleWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run): tier clock,
    // passive so it never blocks scheduled mechanics.
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_egGaleWatcher === st) _egGaleWatcher = null; };
    st.run = run;

    // The Eye: the boss's arena body.
    const el = _egNkEl(run, 'div', 'eg-gal-eye', '🌪️');
    el.style.width = el.style.height = (EG_GAL_EYE_R * 2) + 'px';
    st.eye = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.32,
        tx: window.innerWidth / 2, ty: window.innerHeight * 0.32,
        repickAt: EG_GAL_EYE_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.eye.x - EG_GAL_EYE_R) + 'px,' + Math.round(st.eye.y - EG_GAL_EYE_R) + 'px)';

    if (monster) st.everLive = true;

    _egNkLoop(run, (dtS, now) => {
        if (_egGaleWatcher !== st) return false;
        const live = _egMonsters ? _egMonsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egGaleLadder(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egGaleContract(st, now); }

        // ── The Eye: wander, Updraft on touch ──
        const e = st.eye;
        e.repickAt -= dtS * 1000;
        const edx = e.tx - e.x, edy = e.ty - e.y;
        const ed = Math.hypot(edx, edy) || 1;
        const estep = EG_GAL_EYE_SPEED[p] * dtS;
        if (ed <= estep || e.repickAt <= 0) {
            e.tx = 90 + Math.random() * Math.max(60, W - 180);
            e.ty = 90 + Math.random() * Math.max(60, H - 200);
            e.repickAt = EG_GAL_EYE_REPICK_MS;
        } else {
            e.x += (edx / ed) * estep;
            e.y += (edy / ed) * estep;
        }
        e.el.style.transform = 'translate(' + Math.round(e.x - EG_GAL_EYE_R) + 'px,' + Math.round(e.y - EG_GAL_EYE_R) + 'px)';
        if (c && pr && now >= e.cdUntil && _egNkCircleHit(e.x, e.y, EG_GAL_EYE_R * 0.85, pr, 0)) {
            e.cdUntil = now + EG_GAL_UPDRAFT_CD_MS;
            const dx = c.x - e.x, dy = c.y - e.y;
            const d = Math.hypot(dx, dy) || 1;
            // Updraft: fling away from the eye with an upward bias.
            const fx = (dx / d) * EG_GAL_UPDRAFT_FLING[p];
            const fy = Math.min(0, (dy / d) * EG_GAL_UPDRAFT_FLING[p]) - EG_GAL_UPDRAFT_FLING[p] * 0.35;
            // Animated fling (contact at the eye): glide + tumble + burst.
            _egNkFlingAvatar(fx, fy, e.x, e.y);
            const dealt = _egNkHit(EG_GAL_UPDRAFT_DMG[p], 'cold', st.level);
            _egNkAbilityHitToast(dealt, 'The Gale', 'Updraft');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e2) {}
        }

        // ── Crosswind: direction swap + push + streak visuals ──
        if (now >= st.windUntil) {
            st.windDir = st.windDir === 0 ? (Math.random() < 0.5 ? -1 : 1) : -st.windDir;
            st.windUntil = now + EG_GAL_WIND_INTERVAL_MS;
            _egGaleShowWindBanner(st, st.windDir);
        }
        if (c && st.windDir !== 0 && !st.ladder && !st.rings) {
            // Gentle constant push (nudge is frame-rate safe via dtS).
            _egNkNudgeAvatar(st.windDir * EG_GAL_WIND_PUSH[p] * dtS, 0);
        }
        _egGaleTickStreaks(st, dtS);

        // ── Cyclone funnels: perpetual hunt ──
        st.funnelAcc += dtS * 1000;
        if (st.funnels.length < EG_GAL_FUNNEL_N[p] && st.funnelAcc >= EG_GAL_FUNNEL_SPAWN_MS[p]) {
            st.funnelAcc = 0;
            _egGaleSpawnFunnel(st);
        }
        _egGaleTickFunnels(st, dtS, now, c, pr, p);

        // ── Tornado Ladder (60% gate) ──
        _egGaleTickLadder(st, dtS, pr);

        // ── Eye of the Storm contraction (30% gate) ──
        _egGaleTickRings(st, dtS, c);

        // ── Cyclone Lance volleys (ambient pressure between gates) ──
        st.lanceAcc += dtS * 1000;
        if (st.lanceAcc >= 6800 && st.lances.length < 2 && !st.ladder && !st.rings) {
            st.lanceAcc = 0;
            _egGaleLance(st, p);
        }
        _egGaleTickLances(st, dtS, pr, p);

        return true;
    });
}


// ── Crosswind visuals: banner + drifting wind streaks from the upwind side
function _egGaleShowWindBanner(st, dir) {
    try { if (st.windBanner) st.windBanner.remove(); } catch (e) {}
    const el = _egNkEl(st.run, 'div', 'eg-gal-wind-banner');
    el.textContent = dir < 0 ? '◀◀ CROSSWIND' : 'CROSSWIND ▶▶';
    st.windBanner = el;
    setTimeout(() => { try { if (st.windBanner === el) el.remove(); } catch (e) {} }, 1800);
    // Streaks: recycled drifting lines on the windward side.
    st.streaks.forEach(s => { try { s.el.remove(); } catch (e) {} });
    st.streaks = [];
    const fromLeft = dir > 0;
    for (let i = 0; i < EG_GAL_WIND_STREAKS; i++) {
        const sEl = _egNkEl(st.run, 'div', 'eg-gal-streak', '〰️');
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
function _egGaleTickStreaks(st, dtS) {
    const W = window.innerWidth;
    st.streaks.forEach((s, i) => {
        s.x += st.windDir * s.spd * dtS;
        if (st.windDir > 0 && s.x > W + 60) s.x = -50;
        if (st.windDir < 0 && s.x < -60) s.x = W + 50;
        s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
        if (!st.windDir) { try { s.el.remove(); } catch (e) {} st.streaks.splice(i, 1); }
    });
}


// ── Cyclone funnels: spawn with a dust telegraph, hunt the player ────────
function _egGaleSpawnFunnel(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const dust = _egNkEl(st.run, 'div', 'eg-gal-dust');
    const x = 80 + Math.random() * Math.max(60, W - 160);
    const y = 100 + Math.random() * Math.max(60, H - 200);
    dust.style.left = x + 'px';
    dust.style.top = y + 'px';
    const funnel = { x, y, el: null, dust, dustT: 0, born: false };
    st.funnels.push(funnel);
    setTimeout(() => {
        try { dust.remove(); } catch (e) {}
        if (_egGaleWatcher !== st) return;
        const el = _egNkEl(st.run, 'div', 'eg-gal-funnel', '🌪️');
        el.style.transform = 'translate(' + Math.round(funnel.x - 30) + 'px,' + Math.round(funnel.y - 30) + 'px)';
        funnel.el = el;
        funnel.born = true;
    }, 900);
}


// Ticks funnels: hunt + wrap + cold DoT inside the vortex.
function _egGaleTickFunnels(st, dtS, now, c, pr, p) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = st.funnels.length - 1; i >= 0; i--) {
        const f = st.funnels[i];
        if (!f.born) continue; // still telegraphing dust
        const dx = c ? c.x - f.x : (i % 2 ? 1 : -1);
        const dy = c ? c.y - f.y : 0;
        const d = Math.hypot(dx, dy) || 1;
        const spd = EG_GAL_FUNNEL_SPEED[p];
        f.x += (dx / d) * spd * dtS;
        f.y += (dy / d) * spd * dtS;
        if (f.x < -70) f.x = W + 60;
        if (f.x > W + 70) f.x = -60;
        if (f.y < -70) f.y = H + 60;
        if (f.y > H + 70) f.y = -60;
        f.el.style.transform = 'translate(' + Math.round(f.x - 30) + 'px,' + Math.round(f.y - 30) + 'px)';
        if (pr && c && _egNkCircleHit(f.x, f.y, EG_GAL_FUNNEL_R, pr, 0)) {
            _egNkDotTick(st.run, EG_GAL_FUNNEL_DMG[p], dtS, st.level, 'cold');
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
function _egGaleLadder(st, now) {
    if (st.ladder) return;
    const W = window.innerWidth;
    const lanes = [];
    const usedX = [];
    for (let i = 0; i < EG_GAL_LADDER_N; i++) {
        let x, guard = 0;
        do {
            x = 120 + Math.random() * Math.max(80, W - 240);
            guard++;
        } while (usedX.some(u => Math.abs(u - x) < 230) && guard < 20);
        usedX.push(x);
        lanes.push({ x, at: 300 + i * (EG_GAL_LADDER_GAP_MS + EG_GAL_LADDER_WARN_MS + EG_GAL_LADDER_RISE_MS) });
    }
    st.ladder = { lanes, idx: 0, t: 0, twisters: [] };
    _egNkToast('eg_gale_ladder', '🌪️ TORNADO LADDER! The twisters climb!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e) {}
}


// Ticks the ladder state machine: spawn lane warn → rising twister → top.
function _egGaleTickLadder(st, dtS, pr) {
    const ld = st.ladder;
    if (!ld) return;
    const H = window.innerHeight;
    ld.t += dtS * 1000;
    while (ld.idx < ld.lanes.length && ld.t >= ld.lanes[ld.idx].at) {
        const lane = ld.lanes[ld.idx];
        const warnEl = _egNkEl(st.run, 'div', 'eg-gal-lane');
        warnEl.style.left = (lane.x - EG_GAL_LADDER_W / 2) + 'px';
        warnEl.style.width = EG_GAL_LADDER_W + 'px';
        const twister = { x: lane.x, y: H + 90, warnEl, el: null, phase: 'warn', t: 0 };
        st.ladder.twisters.push(twister);
        ld.idx++;
    }
    for (let i = ld.twisters.length - 1; i >= 0; i--) {
        const tw = ld.twisters[i];
        tw.t += dtS * 1000;
        if (tw.phase === 'warn') {
            if (tw.t >= EG_GAL_LADDER_WARN_MS) {
                tw.phase = 'rise';
                tw.t = 0;
                tw.warnEl.classList.add('hot');
                tw.el = _egNkEl(st.run, 'div', 'eg-gal-twister', '🌪️');
                tw.el.style.left = (tw.x - 60) + 'px';
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e) {}
            }
        } else if (tw.phase === 'rise') {
            const k = tw.t / EG_GAL_LADDER_RISE_MS;
            tw.y = (H + 90) - (H + 180) * Math.min(1, k);
            tw.el.style.top = Math.round(tw.y) + 'px';
            if (pr && _egNkCircleHit(tw.x, tw.y, 62, pr, 0)) {
                // Lift: hit + strong upward fling (once per twister).
                if (!tw.hit) {
                    tw.hit = true;
                    const p = _egGalPhase(st);
                    const dealt = _egNkHit(EG_GAL_LADDER_DMG, 'cold', st.level);
                    _egNkAbilityHitToast(dealt, 'The Gale', 'Tornado');
                    _egNkFlingAvatar(0, -EG_GAL_LADDER_DMG * 900, tw.x, tw.y);
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
function _egGaleContract(st, now) {
    if (st.rings) return;
    const W = window.innerWidth, H = window.innerHeight;
    const eyeEl = st.eye.el;
    eyeEl.classList.add('planted');
    st.eye.tx = W / 2; st.eye.ty = H / 2; // eye parks at center
    const rings = [];
    for (let i = 0; i < EG_GAL_CONTRACT_RINGS; i++) {
        rings.push({ at: 500 + i * (EG_GAL_CONTRACT_TIME_MS + EG_GAL_CONTRACT_GAP_MS) });
    }
    st.rings = { rings, idx: 0, t: 0, live: null };
    _egNkToast('eg_gale_contract', '🌀 EYE OF THE STORM! Thread the rings!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e) {}
}


// Ticks contracting rings: spawn → shrink toward the eye → snap closed.
function _egGaleTickRings(st, dtS, c) {
    const rg = st.rings;
    if (!rg) return;
    const W = window.innerWidth, H = window.innerHeight;
    rg.t += dtS * 1000;
    const ex = st.eye.x, ey = st.eye.y;
    // Spawn the next ring on schedule.
    if (rg.idx < rg.rings.length && rg.t >= rg.rings[rg.idx].at && !rg.live) {
        const el = _egNkEl(st.run, 'div', 'eg-gal-ring');
        el.style.left = ex + 'px';
        el.style.top = ey + 'px';
        rg.live = { el, t: 0, hit: false };
        rg.idx++;
    }
    // Contract the live ring.
    if (rg.live) {
        const r = rg.live;
        r.t += dtS * 1000;
        const k = Math.min(1, r.t / EG_GAL_CONTRACT_TIME_MS);
        const rad = EG_GAL_CONTRACT_START_R + (EG_GAL_CONTRACT_MIN_R - EG_GAL_CONTRACT_START_R) * k;
        r.el.style.width = r.el.style.height = Math.round(rad * 2) + 'px';
        r.el.style.marginLeft = r.el.style.marginTop = (-rad) + 'px';
        if (!r.hit && c) {
            const d = Math.hypot(c.x - ex, c.y - ey);
            if (d <= rad) {
                r.hit = true;
                const dealt = _egNkHit(EG_GAL_CONTRACT_DMG, 'cold', st.level);
                _egNkAbilityHitToast(dealt, 'The Gale', 'Vortex Ring');
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
        st.rings = null;
    }
}


// ── Charge attack: Cyclone Lance ─────────────────────────────────────────
// Dispatched from _egFireMonsterAttack AND on an ambient cadence: a lane
// telegraph through the player's row/column, then an air bolt blasts
// across it, flinging anyone hit.
function _egGaleCycloneLance(monster) {
    const st = _egGaleWatcher;
    if (!st || _egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    _egGaleLance(st, p);
}


// Spawns one lance: horizontal lane at the player's live row.
function _egGaleLance(st, p) {
    if (st.lances.length >= 3) return;
    const W = window.innerWidth, H = window.innerHeight;
    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const horizontal = Math.random() < 0.6;
    const el = _egNkEl(st.run, 'div', 'eg-gal-lance' + (horizontal ? ' horiz' : ' vert'));
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
    const lance = { horizontal, fixed: horizontal ? c.y : c.x, fromLeft, t: 0, el, boltEl: null, hit: false, p };
    st.lances.push(lance);
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e) {}
}


// Ticks lances: warn lane → bolt crosses → despawn.
function _egGaleTickLances(st, dtS, pr, p) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = st.lances.length - 1; i >= 0; i--) {
        const l = st.lances[i];
        l.t += dtS * 1000;
        if (l.t < EG_GAL_LANCE_WARN_MS) continue;
        if (!l.boltEl) {
            l.el.classList.add('hot');
            l.boltEl = _egNkEl(st.run, 'div', 'eg-gal-lance-bolt');
            l.boltEl.style.left = '0px';
            l.boltEl.style.top = '0px';
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gale_howl'); } catch (e) {}
        }
        const k = Math.min(1, (l.t - EG_GAL_LANCE_WARN_MS) / EG_GAL_LANCE_FLIGHT_MS);
        const travel = (l.horizontal ? W : H) * (l.fromLeft ? k : 1 - k);
        if (l.horizontal) {
            l.boltEl.style.transform = 'translate(' + Math.round(travel - 30) + 'px,' + Math.round(l.fixed - 30) + 'px)';
        } else {
            l.boltEl.style.transform = 'translate(' + Math.round(l.fixed - 30) + 'px,' + Math.round(travel - 30) + 'px)';
        }
        if (!l.hit && pr) {
            const bx = l.horizontal ? travel : l.fixed;
            const by = l.horizontal ? l.fixed : travel;
            if (_egNkCircleHit(bx, by, 44, pr, 0)) {
                l.hit = true;
                const dealt = _egNkHit(EG_GAL_LANCE_DMG[l.p], 'cold', st.level);
                _egNkAbilityHitToast(dealt, 'The Gale', 'Cyclone Lance');
                // Knocked along the blast direction.
                const dir = l.horizontal ? (l.fromLeft ? 1 : -1) : 0;
                _egNkFlingAvatar(dir * EG_GAL_LANCE_FLING[l.p], (l.horizontal ? -30 : EG_GAL_LANCE_FLING[l.p]), bx, by);
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
// The old scheduled mechanic is now the perpetual funnels — keep the
// handler name alive so any stale schedule entry no-ops instead of
// erroring.
function _egMechGaleVault(monster, phase) { void monster; void phase; }
