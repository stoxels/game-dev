//------------------------------------------------------------------------
//-------------------BOSS: THE DANCER (boss_dancer)-----------------------
//------------------------------------------------------------------------
// The ballroom never closes: a rework of the old one-shot Dance Steps
// mechanic into a persistent rhythm siege. The Dancer herself is a
// mirror-ball figure drifting above the floor, conducting the fight on a
// beat. Fight identity: EVERYTHING lands on a beat — telegraphs pulse to
// the tempo, damage hits on the downbeat, and dodging well IS dancing.
//
//   PERSISTENT (whole fight, watcher):
//   • THE MIRROR BALL — the boss hangs mid-arena as a spinning 🪩 figure,
//     slowly waltzing to a new spot after every bar. Touching it is a
//     Twirl: animated fling + lightning on a per-touch cooldown.
//   • SPOTLIGHT STEPS — the old Dance Steps, now perpetual: footprints
//     light up in sequence somewhere on the floor; standing on the lit
//     step "dances" it away (small heal reward), missing the beat zaps
//     you. Cadence and step count scale per phase.
//   • RHYTHM RIBBONS — rotating light beams (like a dance-floor laser
//     show) sweep from the ball, telegraphed by a dashed arc before each
//     sweep. Standing in a live ribbon is a heavy hit.
//
//   60% GATE — CURTAIN CALL: the stage lights cut and red curtain drops
//   fall at staggered telegraphed marks across the floor, each leaving a
//   lingering dim "backstage" patch that drags you toward its center.
//
//   30% GATE — PETAL STORM: the finale — v-waves of 🌸 petals cross the
//   screen over ~8s; petals are small but numerous shadow hits, and a
//   thin ambient drizzle keeps falling afterwards in phase 3.
//
//   CHARGE ATTACK — PIROUETTE: the ball flashes, then spins in place
//   unleashing 3 expanding lightning rings (like a dancer's turns) with
//   gaps you can stand in — a rhythm dodge.
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
    boss_dancer: {
        id: 'boss_dancer', name: 'The Dancer', emoji: '💃',
        baseHP: 940, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_dancer: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility — the persistent watcher now
            // owns footsteps; the handler no-ops (same shim pattern as the
            // other reworked bosses).
            { name: 'dance_steps', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechDanceSteps' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
        onInit: _egDancerArenaInit,
    },
});


// ── Ballroom tuning ──────────────────────────────────────────────────────
// Mirror ball
const EG_DAN_BALL_R = 46;                    // ball visual radius (el at r)
const EG_DAN_WALTZ_SPEED = [0, 26, 34, 44];  // px/s drift per phase
const EG_DAN_WALTZ_REPICK_MS = 7000;         // max time on one waltz target
const EG_DAN_TWIRL_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the ball
const EG_DAN_TWIRL_CD_MS = 1000;             // per-ball touch cooldown
const EG_DAN_TWIRL_FLING = [0, 120, 145, 170];  // px fling per twirl
// Spotlight steps (persistent dance floor)
const EG_DAN_STEPS_N = [0, 4, 5, 6];         // steps per sequence per phase
const EG_DAN_BEAT_MS = [0, 2600, 2250, 1900]; // per-step beat window
const EG_DAN_STEP_SEQ_GAP_MS = 2600;         // pause between sequences
const EG_DAN_STEP_DMG = [0, 0.08, 0.10, 0.12]; // %maxHP missing a beat
const EG_DAN_STEP_HEAL = 8;                  // flat HP per danced step
// Rhythm ribbons (rotating light beams)
const EG_DAN_RIBBON_N = [0, 2, 3, 4];        // max beams alive per phase
const EG_DAN_RIBBON_WARN_MS = 900;           // dashed arc before a sweep
const EG_DAN_RIBBON_SWEEP_MS = 1500;         // live sweep duration
const EG_DAN_RIBBON_GAP_MS = 2400;           // rest between spawns
const EG_DAN_RIBBON_DMG = [0, 0.11, 0.13, 0.16]; // %maxHP in a live ribbon
const EG_DAN_RIBBON_HIT_CD_MS = 700;         // per-ribbon damage cooldown
const EG_DAN_RIBBON_HALF_W = 26;             // beam half-width for hits
// Curtain Call (60% gate)
const EG_DAN_CURTAIN_N = [0, 5, 6, 8];       // curtain drops per gate
const EG_DAN_CURTAIN_WARN_MS = 1100;         // per-drop telegraph
const EG_DAN_CURTAIN_DMG = 0.12;             // %maxHP under a drop
const EG_DAN_CURTAIN_R = 70;                 // drop impact radius
const EG_DAN_CURTAIN_SLOW_MS = 4200;         // backstage patch lifetime
const EG_DAN_CURTAIN_DRAG = 46;              // px/s pull inside a patch
const EG_DAN_CURTAIN_PULL_R = 130;           // patch pull radius
// Petal Storm (30% gate)
const EG_DAN_PETAL_WAVES = 4;                // waves in the storm
const EG_DAN_PETAL_PER_WAVE = [0, 6, 7, 9];  // petals per wave
const EG_DAN_PETAL_WAVE_GAP_MS = 1800;       // between waves
const EG_DAN_PETAL_SPEED = 250;              // px/s
const EG_DAN_PETAL_DMG = 0.07;               // %maxHP per petal (shadow)
const EG_DAN_PETAL_MS = 8000;                // whole storm budget
const EG_DAN_PETAL_AMBIENT_MS = 3400;        // P3 ambient petal cadence
// Pirouette (charge attack)
const EG_DAN_PIRO_MS = 2100;                 // whole spin
const EG_DAN_PIRO_WARN_MS = 950;             // flash before the turns start
const EG_DAN_PIRO_RING_R = 420;              // max ring expansion (px)
const EG_DAN_PIRO_RING_TRAVEL_MS = 950;      // ring expansion time
const EG_DAN_PIRO_RING_GAP_MS = 500;         // between ring blooms
const EG_DAN_PIRO_RINGS = 3;                 // expanding rings
const EG_DAN_PIRO_EDGE = 30;                 // ring edge half-thickness
const EG_DAN_PIRO_RING_DMG = [0, 0.12, 0.14, 0.17]; // %maxHP per ring touch
const EG_DAN_PIRO_HIT_CD_MS = 800;           // global ring-hit cooldown


let _egDancerWatcher = null; // per-fight ballroom state

// Phase lookup helper — resolves the boss's current phase (default 1).
function _egDanPhase(st) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Flat heal + HUD refresh (no shared helper exists — hearts do it inline).
function _egDanHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (playerCurrentHP <= 0) return;
        const before = playerCurrentHP;
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + amount);
        if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    } catch (e) {}
}

// Removes every ballroom overlay (registered in boss-framework teardown).
function _egDancerTeardown() {
    if (_egDancerWatcher) {
        const st = _egDancerWatcher;
        _egDancerWatcher = null;
        (st.ribbons || []).forEach(rb => { try { if (rb.el) rb.el.remove(); } catch (e) {} });
        (st.petals || []).forEach(pt => { try { if (pt.el) pt.el.remove(); } catch (e) {} });
        (st.steps || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        (st.curtains || []).forEach(cn => { try { if (cn.el) cn.el.remove(); } catch (e) {} });
        if (st.ball && st.ball.el) { try { st.ball.el.remove(); } catch (e) {} }
        try { if (st.run) _egNkKillRun(st.run); } catch (e) {} // removes ball el too
    }
    document.querySelectorAll('.eg-dan-ball, .eg-dan-ribbon, .eg-dan-petal, .eg-dan-piro, .eg-dan-step, .eg-dan-curtain, .eg-dan-piro-warn').forEach(el => el.remove());
}


// ── Persistent arena: mirror ball waltz + spotlight steps + ribbons ─────
function _egDancerArenaInit(monster) {
    if (_egDancerWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        ball: null,
        steps: [], stepSeq: null, stepAcc: 0,
        ribbons: [], ribbonAcc: 0, ribbonSweeping: false,
        curtains: [], curtain: null,
        petals: [], storm: null, ambientAcc: 0,
        piro: null, piroHitCd: 0,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egDancerWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run): tier clock,
    // but passive (never blocks scheduled mechanics — same pattern as the
    // Puddle/Sprout/Bumper watchers).
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_egDancerWatcher === st) _egDancerWatcher = null; };
    st.run = run;

    // The mirror ball itself: rides above the floor, waltzes to new spots.
    const el = _egNkEl(run, 'div', 'eg-dan-ball', '🪩');
    el.style.width = el.style.height = (EG_DAN_BALL_R * 2) + 'px';
    st.ball = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.3,
        tx: window.innerWidth / 2, ty: window.innerHeight * 0.3,
        repickAt: EG_DAN_WALTZ_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.ball.x - EG_DAN_BALL_R) + 'px,' + Math.round(st.ball.y - EG_DAN_BALL_R) + 'px)';

    if (monster) st.everLive = true;

    _egNkLoop(run, (dtS, now) => {
        if (_egDancerWatcher !== st) return false;
        const live = _egMonsters ? _egMonsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egDancerCurtainCall(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egDancerPetalStorm(st, now); }

        // ── The mirror ball: waltz to targets, twirl on touch ──
        const b = st.ball;
        b.repickAt -= dtS * 1000;
        const bdx = b.tx - b.x, bdy = b.ty - b.y;
        const bd = Math.hypot(bdx, bdy) || 1;
        const bstep = EG_DAN_WALTZ_SPEED[p] * dtS;
        if (bd <= bstep || b.repickAt <= 0) {
            b.tx = 90 + Math.random() * Math.max(60, W - 180);
            b.ty = 90 + Math.random() * Math.max(60, H - 200);
            b.repickAt = EG_DAN_WALTZ_REPICK_MS;
        } else {
            b.x += (bdx / bd) * bstep;
            b.y += (bdy / bd) * bstep;
        }
        b.el.style.transform = 'translate(' + Math.round(b.x - EG_DAN_BALL_R) + 'px,' + Math.round(b.y - EG_DAN_BALL_R) + 'px)';
        if (c && pr && now >= b.cdUntil && _egNkCircleHit(b.x, b.y, EG_DAN_BALL_R * 0.85, pr, 0)) {
            b.cdUntil = now + EG_DAN_TWIRL_CD_MS;
            const dx = c.x - b.x, dy = c.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            // Animated fling (contact at the ball): glide + tumble + burst.
            _egNkFlingAvatar((dx / d) * EG_DAN_TWIRL_FLING[p], (dy / d) * EG_DAN_TWIRL_FLING[p], b.x, b.y);
            const dealt = _egNkHit(EG_DAN_TWIRL_DMG[p], 'lightning', st.level);
            _egNkAbilityHitToast(dealt, 'The Dancer', 'Twirl');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
        }

        // ── Spotlight steps: perpetual sequenced footprints ──
        st.stepAcc += dtS * 1000;
        if (!st.stepSeq && st.stepAcc >= EG_DAN_STEP_SEQ_GAP_MS) {
            st.stepAcc = 0;
            _egDancerStartSteps(st, p);
        }
        _egDancerTickSteps(st, dtS, c, p);

        // ── Rhythm ribbons: rotating beams sweep on a cadence ──
        st.ribbonAcc += dtS * 1000;
        if (st.ribbons.length < EG_DAN_RIBBON_N[p] && st.ribbonAcc >= EG_DAN_RIBBON_GAP_MS) {
            st.ribbonAcc = 0;
            _egDancerSpawnRibbon(st);
        }
        _egDancerTickRibbons(st, dtS, pr, p);

        // ── Curtain Call drops + lingering backstage patches ──
        _egDancerTickCurtains(st, dtS, c, pr);

        // ── Petal storm (30% gate) + P3 ambient drizzle ──
        _egDancerTickStorm(st, dtS, pr, p);
        _egDancerTickPetals(st, dtS, pr);

        // ── Pirouette rings (charge attack state machine) ──
        if (st.piro) {
            const pi = st.piro;
            pi.t += dtS * 1000;
            if (pi.phase === 'warn' && pi.t >= EG_DAN_PIRO_WARN_MS) {
                pi.phase = 'spin';
                pi.t = 0;
                pi.nextRingAt = 0;
                pi.el.classList.add('spin');
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
            } else if (pi.phase === 'spin') {
                if (pi.t >= pi.nextRingAt && pi.ringsOut < EG_DAN_PIRO_RINGS) {
                    pi.ringsOut++;
                    pi.nextRingAt += EG_DAN_PIRO_RING_GAP_MS;
                    _egDancerPiroRing(st, pi, p);
                }
                if (pi.t >= EG_DAN_PIRO_MS) {
                    pi.el.classList.remove('spin');
                    st.piro = null;
                }
            }
        }
        if (st.piroHitCd > 0) st.piroHitCd -= dtS * 1000;

        return true;
    });
}


// ── Spotlight steps: one sequence of N sequenced footprints ─────────────
function _egDancerStartSteps(st, p) {
    const steps = EG_DAN_STEPS_N[p];
    const radius = 55;
    const pts = [];
    let guard = 0;
    while (pts.length < steps && guard++ < 80) {
        const x = 100 + Math.random() * Math.max(60, window.innerWidth - 200);
        const y = 120 + Math.random() * Math.max(60, window.innerHeight - 240);
        if (pts.every(q => Math.hypot(q.x - x, q.y - y) > 200)) pts.push({ x, y });
    }
    const els = pts.map((q, i) => {
        const el = _egNkEl(st.run, 'div', 'eg-dan-step', String(i + 1));
        el.style.display = 'none';
        el.style.left = Math.round(q.x - radius) + 'px';
        el.style.top = Math.round(q.y - radius) + 'px';
        el.style.width = el.style.height = (radius * 2) + 'px';
        return el;
    });
    st.stepSeq = { pts, els, idx: 0, t: 0 };
    _egNkToast('eg_mech_dancer', '💃 Dance Steps! Follow the beat!');
}


// Ticks the active step sequence: light the current step, reward dancing
// on it (small heal), zap on a missed beat.
function _egDancerTickSteps(st, dtS, c, p) {
    const seq = st.stepSeq;
    if (!seq) return;
    if (seq.idx >= seq.els.length) { st.stepSeq = null; return; }
    const el = seq.els[seq.idx];
    const pt = seq.pts[seq.idx];
    if (el.style.display === 'none') {
        el.style.display = '';
        el.classList.add('on');
        seq.t = 0;
        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
    }
    seq.t += dtS * 1000;
    if (c && Math.hypot(c.x - pt.x, c.y - pt.y) <= 55) {
        // Danced the step: heal reward, then advance.
        el.classList.remove('on');
        el.classList.add('locked');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
        seq.idx++;
        seq.t = 0;
        _egDanHeal(EG_DAN_STEP_HEAL);
        return;
    }
    if (seq.t >= EG_DAN_BEAT_MS[p]) {
        // Missed the beat — zap, then move on.
        const dealt = _egNkHit(EG_DAN_STEP_DMG[p], 'lightning', st.level);
        _egNkAbilityHitToast(dealt, 'The Dancer', 'Dance Steps');
        el.classList.remove('on');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
        seq.idx++;
        seq.t = 0;
    }
}


// ── Rhythm ribbons: one dashed arc → rotating live beam ─────────────────
function _egDancerSpawnRibbon(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const b = st.ball;
    const ang = Math.random() * Math.PI * 2;
    const el = _egNkEl(st.run, 'div', 'eg-dan-ribbon warn');
    el.style.left = b.x + 'px';
    el.style.top = b.y + 'px';
    el.style.width = (Math.max(W, H) * 1.15) + 'px';
    el.style.transform = 'rotate(' + (ang * 180 / Math.PI).toFixed(2) + 'deg)';
    st.ribbons.push({ ang, t: 0, el, srcX: b.x, srcY: b.y, live: false, hitCd: 0 });
}


// Ticks ribbons: warn → live sweep (rotating) → fade; damage in the beam.
function _egDancerTickRibbons(st, dtS, pr, p) {
    const b = st.ball;
    for (let i = st.ribbons.length - 1; i >= 0; i--) {
        const rb = st.ribbons[i];
        rb.t += dtS * 1000;
        // The beam always emanates from the ball's current spot.
        if (rb.srcX !== b.x || rb.srcY !== b.y) {
            rb.el.style.left = b.x + 'px';
            rb.el.style.top = b.y + 'px';
            rb.srcX = b.x; rb.srcY = b.y;
        }
        if (rb.t < EG_DAN_RIBBON_WARN_MS) continue; // dashed warn holds
        if (!rb.live) {
            rb.live = true;
            rb.el.classList.remove('warn');
            rb.el.classList.add('live');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
        }
        // Live sweep: the beam slowly rotates like a dance-floor laser.
        rb.ang += dtS * 0.55;
        rb.el.style.transform = 'rotate(' + (rb.ang * 180 / Math.PI).toFixed(2) + 'deg)';
        if (rb.hitCd > 0) {
            rb.hitCd -= dtS * 1000;
        } else if (pr && _egDancerBeamHit(rb, pr)) {
            rb.hitCd = EG_DAN_RIBBON_HIT_CD_MS;
            const dealt = _egNkHit(EG_DAN_RIBBON_DMG[p], 'lightning', st.level);
            _egNkAbilityHitToast(dealt, 'The Dancer', 'Rhythm Ribbon');
        }
        if (rb.t >= EG_DAN_RIBBON_WARN_MS + EG_DAN_RIBBON_SWEEP_MS) {
            try { rb.el.remove(); } catch (e) {}
            st.ribbons.splice(i, 1);
        }
    }
    st.ribbonSweeping = st.ribbons.some(rb => rb.live);
}


// Point-in-beam test: player rect vs a ray from (x,y) at angle ang.
function _egDancerBeamHit(rb, pr) {
    const cx = rb.srcX, cy = rb.srcY;
    const ux = Math.cos(rb.ang), uy = Math.sin(rb.ang);
    const corners = [
        { x: pr.left, y: pr.top }, { x: pr.right, y: pr.top },
        { x: pr.left, y: pr.bottom }, { x: pr.right, y: pr.bottom },
    ];
    return corners.some((cn) => {
        const vx = cn.x - cx, vy = cn.y - cy;
        const along = vx * ux + vy * uy;
        if (along < 0) return false; // behind the source
        const perp = Math.abs(vx * -uy + vy * ux);
        return perp <= EG_DAN_RIBBON_HALF_W; // beam half-width
    });
}


// ── 60% gate: Curtain Call ───────────────────────────────────────────────
// The stage lights cut: N curtain drops telegraph staggered across the
// floor, each leaving a lingering dim backstage patch that drags the
// player toward its center while it lingers.
function _egDancerCurtainCall(st, now) {
    if (st.curtain) return;
    const p = _egDanPhase(st);
    const n = EG_DAN_CURTAIN_N[p];
    const drops = [];
    for (let i = 0; i < n; i++) {
        drops.push({
            x: 90 + Math.random() * Math.max(80, window.innerWidth - 180),
            y: 110 + Math.random() * Math.max(80, window.innerHeight - 220),
            at: 400 + i * 380,
        });
    }
    st.curtain = { drops, idx: 0, t: 0 };
    _egNkToast('eg_dancer_curtain', '🎭 CURTAIN CALL! The stage lights are falling!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
}


// Ticks curtain drops: warn → red curtain falls (damage circle) → lingering
// backstage patch that gently drags the player in (slow zone).
function _egDancerTickCurtains(st, dtS, c, pr) {
    const cc = st.curtain;
    if (cc) {
        cc.t += dtS * 1000;
        while (cc.idx < cc.drops.length && cc.t >= cc.drops[cc.idx].at) {
            const d = cc.drops[cc.idx];
            const el = _egNkEl(st.run, 'div', 'eg-dan-curtain warn');
            el.style.left = d.x + 'px';
            el.style.top = d.y + 'px';
            st.curtains.push({ x: d.x, y: d.y, t: 0, el, hot: false });
            cc.idx++;
        }
        if (cc.idx >= cc.drops.length) st.curtain = null;
    }
    for (let i = st.curtains.length - 1; i >= 0; i--) {
        const cn = st.curtains[i];
        cn.t += dtS * 1000;
        if (!cn.hot && cn.t >= EG_DAN_CURTAIN_WARN_MS) {
            cn.hot = true;
            cn.el.classList.remove('warn');
            cn.el.classList.add('hot');
            if (pr && _egNkCircleHit(cn.x, cn.y, EG_DAN_CURTAIN_R, pr, 0)) {
                const dealt = _egNkHit(EG_DAN_CURTAIN_DMG, null, st.level);
                _egNkAbilityHitToast(dealt, 'The Dancer', 'Curtain Call');
            }
            // Swap the telegraph into the lingering backstage patch.
            const patchEl = cn.el;
            setTimeout(() => {
                try {
                    patchEl.classList.remove('hot');
                    patchEl.classList.add('stage');
                    setTimeout(() => { try { patchEl.remove(); } catch (e) {} }, EG_DAN_CURTAIN_SLOW_MS);
                } catch (e) {}
            }, 380);
            st.curtains.splice(i, 1);
        }
    }
    // Lingering patches pull gently toward their center (slow-zone feel).
    if (c) {
        document.querySelectorAll('.eg-dan-curtain.stage').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width) return;
            const px = r.left + r.width / 2, py = r.top + r.height / 2;
            const dx = px - c.x, dy = py - c.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < EG_DAN_CURTAIN_PULL_R) {
                _egNkNudgeAvatar((dx / d) * EG_DAN_CURTAIN_DRAG * dtS, (dy / d) * EG_DAN_CURTAIN_DRAG * dtS);
            }
        });
    }
}


// ── 30% gate: Petal Storm ────────────────────────────────────────────────
// The finale: v-waves of 🌸 petals cross the screen while the ball spins
// faster. Petals are small shadow hits — numerous, not heavy.
function _egDancerPetalStorm(st, now) {
    if (st.storm) return;
    st.storm = { wave: 0, t: 0 };
    _egNkToast('eg_dancer_storm', '🌸 PETAL STORM! The finale begins!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('dancer_beat'); } catch (e) {}
}


// Ticks the storm scheduler + phase-3 ambient drizzle.
function _egDancerTickStorm(st, dtS, pr, p) {
    const sm = st.storm;
    if (!sm) {
        if (p >= 3) {
            st.ambientAcc += dtS * 1000;
            if (st.ambientAcc >= EG_DAN_PETAL_AMBIENT_MS) {
                st.ambientAcc = 0;
                _egDancerSpawnPetal(st);
            }
        }
        return;
    }
    sm.t += dtS * 1000;
    if (sm.wave < EG_DAN_PETAL_WAVES && sm.t >= sm.wave * EG_DAN_PETAL_WAVE_GAP_MS) {
        const n = EG_DAN_PETAL_PER_WAVE[Math.max(1, Math.min(3, p))];
        for (let i = 0; i < n; i++) _egDancerSpawnPetal(st);
        sm.wave++;
    }
    if (sm.t >= EG_DAN_PETAL_MS) st.storm = null;
}


// Petal bodies: advance, drift on a sine, hit the player, expire.
function _egDancerTickPetals(st, dtS, pr) {
    for (let i = st.petals.length - 1; i >= 0; i--) {
        const pt = st.petals[i];
        pt.t += dtS * 1000;
        pt.x += pt.vx * dtS;
        pt.y += pt.vy * dtS + Math.sin(pt.t / 260) * 22 * dtS;
        pt.el.style.transform = 'translate(' + Math.round(pt.x) + 'px,' + Math.round(pt.y) + 'px)';
        if (pr && !pt.hit && _egNkCircleHit(pt.x, pt.y, 16, pr, 0)) {
            pt.hit = true;
            const dealt = _egNkHit(EG_DAN_PETAL_DMG, 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Dancer', 'Petal');
            try { pt.el.remove(); } catch (e) {}
            st.petals.splice(i, 1);
            continue;
        }
        if (pt.t > 9000 || pt.x < -60 || pt.x > window.innerWidth + 60 || pt.y < -60 || pt.y > window.innerHeight + 60) {
            try { pt.el.remove(); } catch (e) {}
            st.petals.splice(i, 1);
        }
    }
}


function _egDancerSpawnPetal(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const fromLeft = Math.random() < 0.5;
    const el = _egNkEl(st.run, 'div', 'eg-dan-petal', '🌸');
    const petal = {
        x: fromLeft ? -30 : W + 30,
        y: 60 + Math.random() * Math.max(60, H - 140),
        vx: (fromLeft ? 1 : -1) * EG_DAN_PETAL_SPEED * (0.8 + Math.random() * 0.4),
        vy: (Math.random() - 0.5) * 60,
        t: 0, hit: false, el,
    };
    el.style.transform = 'translate(' + Math.round(petal.x) + 'px,' + Math.round(petal.y) + 'px)';
    st.petals.push(petal);
}


// ── Charge attack: Pirouette ─────────────────────────────────────────────
// Dispatched from _egFireMonsterAttack: the ball flashes, then 3 expanding
// lightning rings bloom from it — dodge the rings, stand in the gaps.
function _egDancerPirouette(monster) {
    const st = _egDancerWatcher;
    if (!st || _egNkDodgeBusy() || _egNkFrozen()) return;
    if (st.piro) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    st.piro = { phase: 'warn', t: 0, ringsOut: 0, nextRingAt: 0, p, el: st.ball.el };
    st.ball.el.classList.add('piro-warn');
    setTimeout(() => { try { if (_egDancerWatcher === st && st.ball) st.ball.el.classList.remove('piro-warn'); } catch (e) {} }, EG_DAN_PIRO_WARN_MS);
    _egNkToast('eg_dancer_piro', '💫 PIROUETTE! Dodge the rings — dance the gaps!');
}


// Blooms one expanding lightning ring from the live ball.
// Damage is on the ring's traveling edge, gated by a global cooldown so a
// ring can't multi-tick while it passes over the player.
function _egDancerPiroRing(st, pi, p) {
    const x = st.ball.x, y = st.ball.y;
    // Own run per ring: a run supports exactly ONE rAF loop — registering
    // the ring loop on the watcher run would overwrite its raf handle AND
    // kill the whole arena when the ring completes (_egNkKillRun removes
    // every run element, ball included).
    const ringRun = _egNkNewRun(st.monsterId, true);
    const el = _egNkEl(ringRun, 'div', 'eg-dan-piro');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    let t = 0;
    _egNkLoop(ringRun, (dtS) => {
        t += dtS * 1000;
        const k = t / EG_DAN_PIRO_RING_TRAVEL_MS;
        if (k >= 1) { try { el.remove(); } catch (e) {} return false; }
        const r = 24 + (EG_DAN_PIRO_RING_R - 24) * k;
        el.style.width = el.style.height = Math.round(r * 2) + 'px';
        el.style.marginLeft = el.style.marginTop = (-r) + 'px';
        const cc = _egNkPlayerCenter();
        if (cc && st.piroHitCd <= 0) {
            const d = Math.hypot(cc.x - x, cc.y - y);
            if (Math.abs(d - r) < EG_DAN_PIRO_EDGE) {
                st.piroHitCd = EG_DAN_PIRO_HIT_CD_MS;
                const dealt = _egNkHit(EG_DAN_PIRO_RING_DMG[p], 'lightning', st.level);
                _egNkAbilityHitToast(dealt, 'The Dancer', 'Pirouette');
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent spotlight steps — keep
// the handler name alive so any stale schedule entry no-ops instead of
// erroring.
function _egMechDanceSteps(monster, phase) { void monster; void phase; }
