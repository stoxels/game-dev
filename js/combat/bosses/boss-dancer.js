import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE DANCER (boss_dancer)-----------------------
//------------------------------------------------------------------------
// Mirror-ball rhythm siege - everything lands on a beat: waltzing ball,
// spotlight steps, sweeping rhythm ribbons, CURTAIN CALL drops at 60%,
// PETAL STORM at 30%, the PIROUETTE ring-dodge charge attack (all three
// rings share one opening - dance into it), and the GRAND FINALE (shared
// finale waves) at ≤10%.
//
// Shared mechanics (fated_cell) live in shared-puzzle-mechanics.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_dancer: {
        id: 'boss_dancer', name: 'The Dancer', emoji: '💃',
        baseHP: 940, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_dancer: {
        phases: [
            // The charge attack IS the Pirouette: keep its tempo readable.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility - the persistent watcher now
            // owns footsteps; the handler no-ops (same shim pattern as the
            // other reworked bosses).
            { name: 'dance_steps', intervalBase: 20000, intervalVariance: 5000, handler: '_mechDanceSteps' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_mechFatedCell' },
        ],
        onInit: (m) => { _dancerArenaInit(m); _nkWatchFinale(m, DAN_FINALE); },
    },
});

// GRAND FINALE (shared waves): the last number of the night.
const DAN_FINALE = {
    name: 'The Dancer', title: '💃 GRAND FINALE', element: 'lightning', cls: 'sx-nk-fin-dance', color: '#f9a8d4',
    toastKey: 'eg_dancer_final',
    hint: 'The last number - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Grand Finale' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Grand Finale' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Grand Finale' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Final Bow' },
    ],
};


// ── Ballroom tuning ──────────────────────────────────────────────────────
// Mirror ball
export const DAN_BALL_R = 46;                    // ball visual radius (el at r)
export const DAN_WALTZ_SPEED = [0, 26, 34, 44];  // px/s drift per phase
export const DAN_WALTZ_REPICK_MS = 7000;         // max time on one waltz target
export const DAN_TWIRL_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the ball
export const DAN_TWIRL_CD_MS = 1000;             // per-ball touch cooldown
export const DAN_TWIRL_FLING = [0, 120, 145, 170];  // px fling per twirl
// Spotlight steps (persistent dance floor)
export const DAN_STEPS_N = [0, 4, 5, 6];         // steps per sequence per phase
export const DAN_BEAT_MS = [0, 2600, 2250, 1900]; // per-step beat window
export const DAN_STEP_SEQ_GAP_MS = 2600;         // pause between sequences
export const DAN_STEP_DMG = [0, 0.08, 0.10, 0.12]; // %maxHP missing a beat
export const DAN_STEP_HEAL = 8;                  // flat HP per danced step
// Rhythm ribbons (rotating light beams)
export const DAN_RIBBON_N = [0, 2, 3, 4];        // max beams alive per phase
export const DAN_RIBBON_WARN_MS = 900;           // dashed arc before a sweep
export const DAN_RIBBON_SWEEP_MS = 1500;         // live sweep duration
export const DAN_RIBBON_GAP_MS = 2400;           // rest between spawns
export const DAN_RIBBON_DMG = [0, 0.11, 0.13, 0.16]; // %maxHP in a live ribbon
export const DAN_RIBBON_HIT_CD_MS = 700;         // per-ribbon damage cooldown
export const DAN_RIBBON_HALF_W = 26;             // beam half-width for hits
// Curtain Call (60% gate)
export const DAN_CURTAIN_N = [0, 5, 6, 8];       // curtain drops per gate
export const DAN_CURTAIN_WARN_MS = 1100;         // per-drop telegraph
export const DAN_CURTAIN_DMG = 0.12;             // %maxHP under a drop
export const DAN_CURTAIN_R = 70;                 // drop impact radius
export const DAN_CURTAIN_SLOW_MS = 4200;         // backstage patch lifetime
export const DAN_CURTAIN_DRAG = 46;              // px/s pull inside a patch
export const DAN_CURTAIN_PULL_R = 130;           // patch pull radius
// Petal Storm (30% gate)
export const DAN_PETAL_WAVES = 4;                // waves in the storm
export const DAN_PETAL_PER_WAVE = [0, 6, 7, 9];  // petals per wave
export const DAN_PETAL_WAVE_GAP_MS = 1800;       // between waves
export const DAN_PETAL_SPEED = 250;              // px/s
export const DAN_PETAL_DMG = 0.07;               // %maxHP per petal (shadow)
export const DAN_PETAL_MS = 8000;                // whole storm budget
export const DAN_PETAL_AMBIENT_MS = 3400;        // P3 ambient petal cadence
// Pirouette (charge attack)
export const DAN_PIRO_MS = 2100;                 // whole spin
export const DAN_PIRO_WARN_MS = 950;             // flash before the turns start
export const DAN_PIRO_RING_R = 420;              // max ring expansion (px)
export const DAN_PIRO_RING_TRAVEL_MS = 950;      // ring expansion time
export const DAN_PIRO_RING_GAP_MS = 500;         // between ring blooms
export const DAN_PIRO_RINGS = 3;                 // expanding rings
export const DAN_PIRO_EDGE = 30;                 // ring edge half-thickness
export const DAN_PIRO_RING_DMG = [0, 0.12, 0.14, 0.17]; // %maxHP per ring touch
export const DAN_PIRO_HIT_CD_MS = 800;           // global ring-hit cooldown
const DAN_PIRO_GAP_DEG = 80;                     // the shared opening in every ring


export let _dancerWatcher = null; // per-fight ballroom state

// Phase lookup helper - resolves the boss's current phase (default 1).
export function _danPhase(st) {
    if (typeof _monsters !== 'undefined') {
        const m = globalThis._monsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Flat heal + HUD refresh (no shared helper exists - hearts do it inline).
export function _danHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (globalThis.playerCurrentHP <= 0) return;
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(amount) : (amount)));
        if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    } catch (e) {}
}

// Removes every ballroom overlay (registered in boss-framework teardown).
export function _dancerTeardown() {
    if (_dancerWatcher) {
        const st = _dancerWatcher;
        _dancerWatcher = null;
        (st.ribbons || []).forEach(rb => { try { if (rb.el) rb.el.remove(); } catch (e) {} });
        (st.petals || []).forEach(pt => { try { if (pt.el) pt.el.remove(); } catch (e) {} });
        (st.steps || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        (st.curtains || []).forEach(cn => { try { if (cn.el) cn.el.remove(); } catch (e) {} });
        if (st.ball && st.ball.el) { try { st.ball.el.remove(); } catch (e) {} }
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes ball el too
    }
    document.querySelectorAll('.sx-dan-ball, .sx-dan-ribbon, .sx-dan-petal, .sx-dan-piro, .sx-dan-piro-gap, .sx-dan-step, .sx-dan-curtain, .sx-dan-piro-warn').forEach(el => el.remove());
}


// ── Persistent arena: mirror ball waltz + spotlight steps + ribbons ─────
export function _dancerArenaInit(monster) {
    if (_dancerWatcher) return;
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
    _dancerWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run): tier clock,
    // but passive (never blocks scheduled mechanics - same pattern as the
    // Puddle/Sprout/Bumper watchers).
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_dancerWatcher === st) _dancerWatcher = null; };
    st.run = run;

    // The mirror ball itself: rides above the floor, waltzes to new spots.
    const el = _nkEl(run, 'div', 'sx-dan-ball', '🪩');
    el.style.width = el.style.height = (DAN_BALL_R * 2) + 'px';
    st.ball = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.3,
        tx: window.innerWidth / 2, ty: window.innerHeight * 0.3,
        repickAt: DAN_WALTZ_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.ball.x - DAN_BALL_R) + 'px,' + Math.round(st.ball.y - DAN_BALL_R) + 'px)';

    if (monster) st.everLive = true;

    _nkLoop(run, (dtS, now) => {
        if (_dancerWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _dancerCurtainCall(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _dancerPetalStorm(st, now); }

        // ── The mirror ball: waltz to targets, twirl on touch ──
        const b = st.ball;
        b.repickAt -= dtS * 1000;
        const bdx = b.tx - b.x, bdy = b.ty - b.y;
        const bd = Math.hypot(bdx, bdy) || 1;
        const bstep = DAN_WALTZ_SPEED[p] * dtS;
        if (bd <= bstep || b.repickAt <= 0) {
            b.tx = 90 + Math.random() * Math.max(60, W - 180);
            b.ty = 90 + Math.random() * Math.max(60, H - 200);
            b.repickAt = DAN_WALTZ_REPICK_MS;
        } else {
            b.x += (bdx / bd) * bstep;
            b.y += (bdy / bd) * bstep;
        }
        b.el.style.transform = 'translate(' + Math.round(b.x - DAN_BALL_R) + 'px,' + Math.round(b.y - DAN_BALL_R) + 'px)';
        if (c && pr && now >= b.cdUntil && _nkCircleHit(b.x, b.y, DAN_BALL_R * 0.85, pr, 0)) {
            b.cdUntil = now + DAN_TWIRL_CD_MS;
            const dx = c.x - b.x, dy = c.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            // Animated fling (contact at the ball): glide + tumble + burst.
            _nkFlingAvatar((dx / d) * DAN_TWIRL_FLING[p], (dy / d) * DAN_TWIRL_FLING[p], b.x, b.y);
            const dealt = _nkHit(DAN_TWIRL_DMG[p], 'lightning', st.level);
            _nkAbilityHitToast(dealt, 'The Dancer', 'Twirl');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
        }

        // ── Spotlight steps: perpetual sequenced footprints ──
        st.stepAcc += dtS * 1000;
        if (!st.stepSeq && st.stepAcc >= DAN_STEP_SEQ_GAP_MS) {
            st.stepAcc = 0;
            _dancerStartSteps(st, p);
        }
        _dancerTickSteps(st, dtS, c, p);

        // ── Rhythm ribbons: rotating beams sweep on a cadence ──
        st.ribbonAcc += dtS * 1000;
        if (st.ribbons.length < DAN_RIBBON_N[p] && st.ribbonAcc >= DAN_RIBBON_GAP_MS) {
            st.ribbonAcc = 0;
            _dancerSpawnRibbon(st);
        }
        _dancerTickRibbons(st, dtS, pr, p);

        // ── Curtain Call drops + lingering backstage patches ──
        _dancerTickCurtains(st, dtS, c, pr);

        // ── Petal storm (30% gate) + P3 ambient drizzle ──
        _dancerTickStorm(st, dtS, pr, p);
        _dancerTickPetals(st, dtS, pr);

        // ── Pirouette rings (charge attack state machine) ──
        if (st.piro) {
            const pi = st.piro;
            pi.t += dtS * 1000;
            if (pi.phase === 'warn' && pi.t >= DAN_PIRO_WARN_MS) {
                pi.phase = 'spin';
                pi.t = 0;
                pi.nextRingAt = 0;
                pi.el.classList.add('spin');
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
            } else if (pi.phase === 'spin') {
                if (pi.t >= pi.nextRingAt && pi.ringsOut < DAN_PIRO_RINGS) {
                    pi.ringsOut++;
                    pi.nextRingAt += DAN_PIRO_RING_GAP_MS;
                    _dancerPiroRing(st, pi, p);
                }
                if (pi.t >= DAN_PIRO_MS) {
                    pi.el.classList.remove('spin');
                    try { pi.wedge.remove(); } catch (e) {}
                    st.piro = null;
                }
            }
        }
        if (st.piroHitCd > 0) st.piroHitCd -= dtS * 1000;

        return true;
    });
}


// ── Spotlight steps: one sequence of N sequenced footprints ─────────────
export function _dancerStartSteps(st, p) {
    const steps = DAN_STEPS_N[p];
    const radius = 55;
    const pts = [];
    // Each step lands within walking reach of the previous one (the first
    // of you): 320 px/s over the beat minus ~0.7s reaction. Steps that were
    // anywhere on screen made the "missed beat" zap unavoidable.
    const reach = Math.max(200, Math.min(520, 320 * (DAN_BEAT_MS[p] - 700) / 1000 * 0.85));
    const W = window.innerWidth, H = window.innerHeight;
    let prev = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    let guard = 0;
    while (pts.length < steps && guard++ < 200) {
        const a = Math.random() * Math.PI * 2, d = 150 + Math.random() * (reach - 150);
        const x = prev.x + Math.cos(a) * d, y = prev.y + Math.sin(a) * d;
        if (x < 100 || x > W - 100 || y < 120 || y > H - 120) continue;
        pts.push({ x, y });
        prev = { x, y };
    }
    const els = pts.map((q, i) => {
        const el = _nkEl(st.run, 'div', 'sx-dan-step', String(i + 1));
        el.style.display = 'none';
        el.style.left = Math.round(q.x - radius) + 'px';
        el.style.top = Math.round(q.y - radius) + 'px';
        el.style.width = el.style.height = (radius * 2) + 'px';
        return el;
    });
    st.stepSeq = { pts, els, idx: 0, t: 0 };
    _nkToast('eg_mech_dancer', '💃 Dance Steps! Follow the beat!');
}


// Ticks the active step sequence: light the current step, reward dancing
// on it (small heal), zap on a missed beat.
export function _dancerTickSteps(st, dtS, c, p) {
    const seq = st.stepSeq;
    if (!seq) return;
    if (seq.idx >= seq.els.length) { st.stepSeq = null; return; }
    const el = seq.els[seq.idx];
    const pt = seq.pts[seq.idx];
    if (el.style.display === 'none') {
        el.style.display = '';
        el.classList.add('on');
        seq.t = 0;
        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
    }
    seq.t += dtS * 1000;
    if (c && Math.hypot(c.x - pt.x, c.y - pt.y) <= 55) {
        // Danced the step: heal reward, then advance.
        el.classList.remove('on');
        el.classList.add('locked');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
        seq.idx++;
        seq.t = 0;
        _danHeal(DAN_STEP_HEAL);
        return;
    }
    if (seq.t >= DAN_BEAT_MS[p]) {
        // Missed the beat - zap, then move on.
        const dealt = _nkHit(DAN_STEP_DMG[p], 'lightning', st.level);
        _nkAbilityHitToast(dealt, 'The Dancer', 'Dance Steps');
        el.classList.remove('on');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
        seq.idx++;
        seq.t = 0;
    }
}


// ── Rhythm ribbons: one dashed arc → rotating live beam ─────────────────
export function _dancerSpawnRibbon(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const b = st.ball;
    const ang = Math.random() * Math.PI * 2;
    const el = _nkEl(st.run, 'div', 'sx-dan-ribbon warn');
    el.style.left = b.x + 'px';
    el.style.top = b.y + 'px';
    el.style.width = (Math.max(W, H) * 1.15) + 'px';
    el.style.transform = 'rotate(' + (ang * 180 / Math.PI).toFixed(2) + 'deg)';
    st.ribbons.push({ ang, t: 0, el, srcX: b.x, srcY: b.y, live: false, hitCd: 0 });
}


// Ticks ribbons: warn → live sweep (rotating) → fade; damage in the beam.
export function _dancerTickRibbons(st, dtS, pr, p) {
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
        if (rb.t < DAN_RIBBON_WARN_MS) continue; // dashed warn holds
        if (!rb.live) {
            rb.live = true;
            rb.el.classList.remove('warn');
            rb.el.classList.add('live');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
        }
        // Live sweep: the beam slowly rotates like a dance-floor laser.
        rb.ang += dtS * 0.55;
        rb.el.style.transform = 'rotate(' + (rb.ang * 180 / Math.PI).toFixed(2) + 'deg)';
        if (rb.hitCd > 0) {
            rb.hitCd -= dtS * 1000;
        } else if (pr && _dancerBeamHit(rb, pr)) {
            rb.hitCd = DAN_RIBBON_HIT_CD_MS;
            const dealt = _nkHit(DAN_RIBBON_DMG[p], 'lightning', st.level);
            _nkAbilityHitToast(dealt, 'The Dancer', 'Rhythm Ribbon');
        }
        if (rb.t >= DAN_RIBBON_WARN_MS + DAN_RIBBON_SWEEP_MS) {
            try { rb.el.remove(); } catch (e) {}
            st.ribbons.splice(i, 1);
        }
    }
    st.ribbonSweeping = st.ribbons.some(rb => rb.live);
}


// Point-in-beam test: player rect vs a ray from (x,y) at angle ang.
export function _dancerBeamHit(rb, pr) {
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
        return perp <= DAN_RIBBON_HALF_W; // beam half-width
    });
}


// ── 60% gate: Curtain Call ───────────────────────────────────────────────
// The stage lights cut: N curtain drops telegraph staggered across the
// floor, each leaving a lingering dim backstage patch that drags the
// player toward its center while it lingers.
export function _dancerCurtainCall(st, now) {
    if (st.curtain) return;
    const p = _danPhase(st);
    const n = DAN_CURTAIN_N[p];
    const drops = [];
    for (let i = 0; i < n; i++) {
        drops.push({
            x: 90 + Math.random() * Math.max(80, window.innerWidth - 180),
            y: 110 + Math.random() * Math.max(80, window.innerHeight - 220),
            at: 400 + i * 380,
        });
    }
    st.curtain = { drops, idx: 0, t: 0 };
    _nkToast('eg_dancer_curtain', '🎭 CURTAIN CALL! The stage lights are falling!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
}


// Ticks curtain drops: warn → red curtain falls (damage circle) → lingering
// backstage patch that gently drags the player in (slow zone).
export function _dancerTickCurtains(st, dtS, c, pr) {
    const cc = st.curtain;
    if (cc) {
        cc.t += dtS * 1000;
        while (cc.idx < cc.drops.length && cc.t >= cc.drops[cc.idx].at) {
            const d = cc.drops[cc.idx];
            const el = _nkEl(st.run, 'div', 'sx-dan-curtain warn');
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
        if (!cn.hot && cn.t >= DAN_CURTAIN_WARN_MS) {
            cn.hot = true;
            cn.el.classList.remove('warn');
            cn.el.classList.add('hot');
            if (pr && _nkCircleHit(cn.x, cn.y, DAN_CURTAIN_R, pr, 0)) {
                const dealt = _nkHit(DAN_CURTAIN_DMG, null, st.level);
                _nkAbilityHitToast(dealt, 'The Dancer', 'Curtain Call');
            }
            // Swap the telegraph into the lingering backstage patch.
            const patchEl = cn.el;
            setTimeout(() => {
                try {
                    patchEl.classList.remove('hot');
                    patchEl.classList.add('stage');
                    setTimeout(() => { try { patchEl.remove(); } catch (e) {} }, DAN_CURTAIN_SLOW_MS);
                } catch (e) {}
            }, 380);
            st.curtains.splice(i, 1);
        }
    }
    // Lingering patches pull gently toward their center (slow-zone feel).
    if (c) {
        document.querySelectorAll('.sx-dan-curtain.stage').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width) return;
            const px = r.left + r.width / 2, py = r.top + r.height / 2;
            const dx = px - c.x, dy = py - c.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < DAN_CURTAIN_PULL_R) {
                _nkNudgeAvatar((dx / d) * DAN_CURTAIN_DRAG * dtS, (dy / d) * DAN_CURTAIN_DRAG * dtS);
            }
        });
    }
}


// ── 30% gate: Petal Storm ────────────────────────────────────────────────
// The finale: v-waves of 🌸 petals cross the screen while the ball spins
// faster. Petals are small shadow hits - numerous, not heavy.
export function _dancerPetalStorm(st, now) {
    if (st.storm) return;
    st.storm = { wave: 0, t: 0 };
    _nkToast('eg_dancer_storm', '🌸 PETAL STORM! The finale begins!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
}


// Ticks the storm scheduler + phase-3 ambient drizzle.
export function _dancerTickStorm(st, dtS, pr, p) {
    const sm = st.storm;
    if (!sm) {
        if (p >= 3) {
            st.ambientAcc += dtS * 1000;
            if (st.ambientAcc >= DAN_PETAL_AMBIENT_MS) {
                st.ambientAcc = 0;
                _dancerSpawnPetal(st);
            }
        }
        return;
    }
    sm.t += dtS * 1000;
    if (sm.wave < DAN_PETAL_WAVES && sm.t >= sm.wave * DAN_PETAL_WAVE_GAP_MS) {
        const n = DAN_PETAL_PER_WAVE[Math.max(1, Math.min(3, p))];
        for (let i = 0; i < n; i++) _dancerSpawnPetal(st);
        sm.wave++;
    }
    if (sm.t >= DAN_PETAL_MS) st.storm = null;
}


// Petal bodies: advance, drift on a sine, hit the player, expire.
export function _dancerTickPetals(st, dtS, pr) {
    for (let i = st.petals.length - 1; i >= 0; i--) {
        const pt = st.petals[i];
        pt.t += dtS * 1000;
        pt.x += pt.vx * dtS;
        pt.y += pt.vy * dtS + Math.sin(pt.t / 260) * 22 * dtS;
        pt.el.style.transform = 'translate(' + Math.round(pt.x) + 'px,' + Math.round(pt.y) + 'px)';
        if (pr && !pt.hit && _nkCircleHit(pt.x, pt.y, 16, pr, 0)) {
            pt.hit = true;
            const dealt = _nkHit(DAN_PETAL_DMG, 'shadow', st.level);
            _nkAbilityHitToast(dealt, 'The Dancer', 'Petal');
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


export function _dancerSpawnPetal(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const fromLeft = Math.random() < 0.5;
    const el = _nkEl(st.run, 'div', 'sx-dan-petal', '🌸');
    const petal = {
        x: fromLeft ? -30 : W + 30,
        y: 60 + Math.random() * Math.max(60, H - 140),
        vx: (fromLeft ? 1 : -1) * DAN_PETAL_SPEED * (0.8 + Math.random() * 0.4),
        vy: (Math.random() - 0.5) * 60,
        t: 0, hit: false, el,
    };
    el.style.transform = 'translate(' + Math.round(petal.x) + 'px,' + Math.round(petal.y) + 'px)';
    st.petals.push(petal);
}


// ── Charge attack: Pirouette ─────────────────────────────────────────────
// Dispatched from _fireMonsterAttack: the ball flashes, then 3 expanding
// lightning rings bloom from it - dodge the rings, stand in the gaps.
export function _dancerPirouette(monster) {
    const st = _dancerWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen()) return;
    if (st.piro) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    // The three rings share ONE opening (clockwise from 12 o'clock, like the
    // Gale's rings). It opens 25-50° to one side of you, so a short sidestep
    // reaches it; the green wedge shows it during the warning.
    const c = _nkPlayerCenter() || { x: st.ball.x, y: st.ball.y + 200 };
    let pa = Math.atan2(c.x - st.ball.x, -(c.y - st.ball.y)) * 180 / Math.PI;
    const gapMid = pa + (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25);
    const gapStart = ((gapMid - DAN_PIRO_GAP_DEG / 2) % 360 + 360) % 360;
    const wedge = _nkEl(st.run, 'div', 'sx-dan-piro-gap');
    wedge.style.left = st.ball.x + 'px';
    wedge.style.top = st.ball.y + 'px';
    wedge.style.setProperty('--gap', gapStart + 'deg');
    wedge.style.setProperty('--gapw', DAN_PIRO_GAP_DEG + 'deg');
    st.piro = { phase: 'warn', t: 0, ringsOut: 0, nextRingAt: 0, p, el: st.ball.el, gapStart, wedge };
    st.ball.el.classList.add('piro-warn');
    setTimeout(() => { try { if (_dancerWatcher === st && st.ball) st.ball.el.classList.remove('piro-warn'); } catch (e) {} }, DAN_PIRO_WARN_MS);
    _nkToast('eg_dancer_piro', '💫 PIROUETTE! Dodge the rings - dance the gaps!');
}


// Blooms one expanding lightning ring from the live ball.
// Damage is on the ring's traveling edge, gated by a global cooldown so a
// ring can't multi-tick while it passes over the player.
export function _dancerPiroRing(st, pi, p) {
    const x = st.ball.x, y = st.ball.y;
    // Own run per ring: a run supports exactly ONE rAF loop - registering
    // the ring loop on the watcher run would overwrite its raf handle AND
    // kill the whole arena when the ring completes (_nkKillRun removes
    // every run element, ball included).
    const ringRun = _nkNewRun(st.monsterId, true);
    const el = _nkEl(ringRun, 'div', 'sx-dan-piro');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--gap', pi.gapStart + 'deg');
    el.style.setProperty('--gapw', DAN_PIRO_GAP_DEG + 'deg');
    let t = 0;
    _nkLoop(ringRun, (dtS) => {
        t += dtS * 1000;
        const k = t / DAN_PIRO_RING_TRAVEL_MS;
        if (k >= 1) { try { el.remove(); } catch (e) {} return false; }
        const r = 24 + (DAN_PIRO_RING_R - 24) * k;
        el.style.width = el.style.height = Math.round(r * 2) + 'px';
        el.style.marginLeft = el.style.marginTop = (-r) + 'px';
        const cc = _nkPlayerCenter();
        if (cc && st.piroHitCd <= 0) {
            const d = Math.hypot(cc.x - x, cc.y - y);
            let ang = Math.atan2(cc.x - x, -(cc.y - y)) * 180 / Math.PI;
            const into = ((ang - pi.gapStart) % 360 + 360) % 360;
            const inGap = into >= 6 && into <= DAN_PIRO_GAP_DEG - 6;
            if (Math.abs(d - r) < DAN_PIRO_EDGE && !inGap) {
                st.piroHitCd = DAN_PIRO_HIT_CD_MS;
                const dealt = _nkHit(DAN_PIRO_RING_DMG[p], 'lightning', st.level);
                _nkAbilityHitToast(dealt, 'The Dancer', 'Pirouette');
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent spotlight steps - keep
// the handler name alive so any stale schedule entry no-ops instead of
// erroring.
export function _mechDanceSteps(monster, phase) { void monster; void phase; }
