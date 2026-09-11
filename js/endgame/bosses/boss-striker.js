//------------------------------------------------------------------------
//-------------------BOSS: THE STRIKER (boss_striker)----------------------
//------------------------------------------------------------------------
// Football-match fight: the pitch is his arena and the ball never rests.
//
//   PERSISTENT (whole fight, watcher):
//   • THE MATCH BALL — the giant football never leaves the pitch. It bounces
//     around the arena and steers toward you (loose homing with a turn cap,
//     so it is always readable). Touching it is a TACKLE: a heavy physical
//     hit plus a fling away from the impact. Faster every phase.
//     PARRY KICK: holding the parry key (R by default) when the ball reaches you boots the
//     ball away instead — no damage, no fling; the kick burst decays back
//     to the phase seek speed and homing resumes.
//   • THE GOAL — a goal frame stands at a screen edge for the whole fight.
//     Guide the ball into it (home it by baiting, or parry-kick it in) and
//     it goes OUT OF PLAY for 30s — no ball on the pitch at all — then the
//     keeper (🧤) lobs it back onto the pitch from the net.
//
//   HP GATES (watcher) — the homing match ball LEAVES the pitch and a
//   stationary ball rests on the grid for a scoring challenge:
//   • 60% — KICK-OFF CHALLENGE: score 1 goal. Run to the stationary ball,
//     stand NEXT to it to charge (bomb-defuse-style strip), step away to
//     shoot. Charge time = power; your angle around the ball = aim.
//   • 30% — HAT-TRICK: score 3 goals in 60s. Same kick rules, more
//     targets — plan each shot, the ball rolls out and can be re-kicked.
//
//   CHARGE ATTACK — FREE KICK: when the boss's attack bar fills, a cone wall
//   materializes between ball and you, a dotted arc telegraphs the curve
//   around the wall, then the ball bends around it straight at the marked
//   spot. Damage lands as the ball arrives.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_striker: {
        id: 'boss_striker', name: 'The Striker', emoji: '⚽',
        baseHP: 980, baseDamage: 21, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_striker: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'prior_bomb', intervalBase: 22000, intervalVariance: 6000, handler: '_egMechPriorBomb' },
        ],
        onInit: _egStrikerArenaInit,
    },
});


// ── Striker tuning ──────────────────────────────────────────────────────
// The match ball
const EG_STRK_BALL_SPEED = [0, 150, 185, 220]; // px/s seek speed per phase
const EG_STRK_BALL_TURN = 1.7;               // rad/s steering cap (readability)
const EG_STRK_BALL_R = 55;                   // ball radius (visual + hit)
const EG_STRK_TACKLE_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP per tackle
const EG_STRK_TACKLE_FLING = [0, 170, 200, 230];  // px fling per tackle
const EG_STRK_TACKLE_CD_MS = 900;            // per-touch cooldown
// Parry kick (hold E): boot the ball away instead of being tackled
const EG_STRK_PARRY_KICK_SPEED = 520;        // px/s kick burst speed
const EG_STRK_PARRY_KICK_MS = 900;           // burst duration before homing resumes
// The goal: guide the ball into it → out of play for 30s
const EG_STRK_GOAL_MOUTH_W = 130;            // goal-mouth depth from the edge (px)
const EG_STRK_GOAL_OUT_MS = 30000;           // ball out of play after a goal
const EG_STRK_GOAL_RESPAWN_GRACE_MS = 2500;  // fresh ball can't instantly re-score
const EG_STRK_KEEPER_THROW_SPEED = 470;      // px/s keeper throw burst
const EG_STRK_KEEPER_THROW_MS = 1100;        // lob duration before homing resumes
// Kick-Off Challenge (60% gate): score 1 goal
// Hat-Trick (30% gate): score 3 goals in 60s
const EG_STRK_KICK_BUDGET_G1 = 20000;        // ms budget for the 1-goal challenge
const EG_STRK_KICK_BUDGET_G3 = 60000;        // ms budget for the hat-trick (needs time)
const EG_STRK_KICK_RADIUS = 115;             // px from the ball to charge a kick
const EG_STRK_KICK_CHARGE_MS = 1500;         // ms standing next to the ball → full power
const EG_STRK_KICK_SPEED_MIN = 430;          // px/s kick speed at a tap
const EG_STRK_KICK_SPEED_MAX = 960;          // px/s kick speed at full charge
const EG_STRK_KICK_DECEL = 300;              // px/s² ball friction (roll-out)
const EG_STRK_KICK_BOUNCE = 0.78;            // wall bounce restitution
const EG_STRK_KICK_STOP = 26;                // snap to rest below this speed
// Goal damage: a scored goal HURTS the boss — the challenge is a scoring
// opportunity, not just relief. The kick's charge fraction scales the hit,
// so full-power shots pay best.
const EG_STRK_GOAL_DMG_MIN = 0.02;           // %maxHP at a tap kick
const EG_STRK_GOAL_DMG_MAX = 0.06;           // %maxHP at a full-charge shot
// Free kick (charge attack)
const EG_STRK_FK_WARN_MS = 1150;             // dotted-arc telegraph
const EG_STRK_FK_FLIGHT_MS = 650;            // ball bend time
const EG_STRK_FK_DMG = [0, 0.12, 0.14, 0.16]; // %maxHP by phase
const EG_STRK_FK_WALL_N = 3;                 // defender cones


let _egStrkWatcher = null;    // per-fight match state
let _egStrkFkActive = false;  // a free kick set-piece is running


// Sweep every striker overlay off the screen. Safe to call twice.
function _egStrikerSweep() {
    _egStrkFkActive = false;
    try {
        document.querySelectorAll('.eg-strk-ball, .eg-strk-corner, .eg-strk-cross, .eg-strk-goal, .eg-strk-spot, .eg-strk-shot, .eg-strk-shotring, .eg-strk-fk-wall, .eg-strk-fkball, .eg-strk-fkdot, .eg-strk-fkmark, .eg-strk-penhud, .eg-strk-penline, .eg-strk-pencore, .eg-strk-pensaved, .eg-strk-kickball, .eg-strk-kickring, .eg-strk-kickcharge, .eg-strk-scorehud, .eg-strk-goalpop, .eg-strk-kickstreak, .eg-strk-ballghost, .eg-strk-keeper, .eg-strk-kickdmg').forEach(el => el.remove());
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egStrikerTeardown() {
    const st = _egStrkWatcher;
    _egStrkWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egStrikerSweep();
}


// Spawns the persistent match ball element on the run.
// anchor (optional): spawn point for a kick-off after a goal; default centre-top.
function _egStrkSpawnBall(st, anchor) {
    const el = _egNkEl(st.run, 'div', 'eg-strk-ball kickoff', '⚽');
    const a0 = Math.random() * Math.PI * 2;
    st.ball = {
        x: (anchor && anchor.x != null) ? anchor.x : window.innerWidth / 2,
        y: (anchor && anchor.y != null) ? anchor.y : window.innerHeight * 0.3,
        a: a0, el, cdUntil: 0, kickUntil: 0, kickSpeed: 0, trailAt: 0, lobUntil: 0,
    };
}


// Spawns the persistent goal frame at a screen edge (whole fight). The
// mouth region (x0..x1, y0..y1) is the scoring zone for the match ball.
function _egStrkSpawnGoal(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const fromRight = Math.random() < 0.5;
    const el = _egNkEl(st.run, 'div', 'eg-strk-goal persistent' + (fromRight ? ' flip' : ''), '🥅');
    const gy = Math.round(H * 0.5 - 130 + (Math.random() * 160 - 80));
    el.style.top = gy + 'px';
    el.style[fromRight ? 'right' : 'left'] = '0px';
    st.goal = {
        el, fromRight,
        x0: fromRight ? W - EG_STRK_GOAL_MOUTH_W : 0,
        x1: fromRight ? W : EG_STRK_GOAL_MOUTH_W,
        y0: gy + 30, y1: gy + 230,
    };
}


// GOAL! The match ball went into the goal: remove it from play for
// EG_STRK_GOAL_OUT_MS, flash the net, arm the return timer on the goal,
// then the keeper lobs it back onto the pitch.
function _egStrkScoreGoal(st, now) {
    const b = st.ball;
    try { if (b) b.el.remove(); } catch (e) {}
    st.ball = null;
    st.ballOutUntil = now + EG_STRK_GOAL_OUT_MS;
    if (st.goal) {
        st.goal.el.classList.add('scored');
        setTimeout(() => {
            const g = _egStrkWatcher && _egStrkWatcher.goal;
            if (g) { try { g.el.classList.remove('scored'); } catch (e) {} }
        }, 700);
        // Return-timer HUD on the goal: a sweeping countdown ring + seconds.
        // (The ⚽ icon comes from the CSS ::before — no text content here.)
        const timer = _egNkEl(st.run, 'div', 'eg-strk-goal-timer');
        timer.style.left = Math.round((st.goal.x0 + st.goal.x1) / 2) + 'px';
        timer.style.top = Math.round((st.goal.y0 + st.goal.y1) / 2) + 'px';
        st.goal.timerEl = timer;
        st.goal.timerTotal = EG_STRK_GOAL_OUT_MS;
    }
    _egNkToast('eg_striker_goal', '⚽ GOOOAL! The match ball is out of play for 30s!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
}


// Advances the goal's return-timer ring while the ball is out of play.
// The ring depletes counter-clockwise and the seconds count down; the
// final 5s turn red and the ball icon pulses, then the whole HUD pops off.
function _egStrkGoalTimerTick(st, now) {
    const g = st.goal;
    if (!g || !g.timerEl) return;
    const leftMs = st.ballOutUntil - now;
    if (leftMs <= 0) {
        try { g.timerEl.remove(); } catch (e) {}
        g.timerEl = null;
        return;
    }
    const frac = Math.max(0, Math.min(1, leftMs / (g.timerTotal || EG_STRK_GOAL_OUT_MS)));
    g.timerEl.style.setProperty('--timer-frac', frac.toFixed(3));
    g.timerEl.dataset.left = String(Math.ceil(leftMs / 1000));
    g.timerEl.classList.toggle('urgent', leftMs <= 5000);
}


// Kick-off: the ball returns FROM the goal it was scored in — the keeper
// (🧤) pops out of the net and lobs it back onto the pitch toward centre.
// The lob rides the same kick-burst decay as the parry kick (so the gold
// ghost trail follows it automatically), with a shrinking scale so the
// ball reads as coming down from the air.
function _egStrkKickoff(st) {
    const W = window.innerWidth, H = window.innerHeight;
    // The return-timer HUD comes off with the kick-off.
    if (st.goal && st.goal.timerEl) {
        try { st.goal.timerEl.remove(); } catch (e) {}
        st.goal.timerEl = null;
    }
    const now = performance.now();
    let anchor, ang;
    if (st.goal) {
        const g = st.goal;
        anchor = { x: (g.x0 + g.x1) / 2, y: (g.y0 + g.y1) / 2 };
        // Lob toward the pitch centre with a little spread.
        ang = Math.atan2(H / 2 - anchor.y, W / 2 - anchor.x) + (Math.random() - 0.5) * 1.1;
        const keeper = _egNkEl(st.run, 'div', 'eg-strk-keeper', '🧤');
        keeper.style.left = Math.round(anchor.x) + 'px';
        keeper.style.top = Math.round(anchor.y) + 'px';
        setTimeout(() => { try { keeper.remove(); } catch (e) {} }, 1000);
    } else {
        // No goal frame (defensive fallback): enter from a random edge.
        const side = Math.floor(Math.random() * 4);
        anchor = side === 0 ? { x: 70, y: 90 + Math.random() * Math.max(120, H - 200) }
            : side === 1 ? { x: W - 70, y: 90 + Math.random() * Math.max(120, H - 200) }
            : side === 2 ? { x: 90 + Math.random() * Math.max(120, W - 200), y: 70 }
            : { x: 90 + Math.random() * Math.max(120, W - 200), y: H - 70 };
        ang = Math.atan2(H / 2 - anchor.y, W / 2 - anchor.x);
    }
    _egStrkSpawnBall(st, anchor);
    const b = st.ball;
    b.a = ang;
    b.kickUntil = now + EG_STRK_KEEPER_THROW_MS;
    b.kickSpeed = EG_STRK_KEEPER_THROW_SPEED;
    b.lobUntil = b.kickUntil;
    b.trailAt = 0;
    st.ballGraceUntil = now + EG_STRK_GOAL_RESPAWN_GRACE_MS;
    _egStrkKickTrail(anchor.x, anchor.y, ang);
    _egNkToast('eg_striker_kickoff', '⚽ KICK-OFF! The keeper lobs the ball back into play!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
}


// Directional kick streaks: a fan of gold dashes shot along the kick
// vector at the boot moment. Self-removing; no run tracking needed.
function _egStrkKickTrail(x, y, ang) {
    try {
        for (let i = 0; i < 5; i++) {
            const s = document.createElement('div');
            s.className = 'eg-strk-kickstreak';
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            const a = ang + (Math.random() - 0.5) * 0.5;
            s.style.setProperty('--streak-ang', a.toFixed(2) + 'rad');
            s.style.setProperty('--streak-len', Math.round(80 + Math.random() * 70) + 'px');
            s.style.animationDelay = (i * 40) + 'ms';
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 560);
        }
    } catch (e) {}
}


// One fading gold ghost of the ball along its kick flight. Self-removing.
function _egStrkBallGhost(x, y) {
    try {
        const g = document.createElement('div');
        g.className = 'eg-strk-ballghost';
        g.textContent = '⚽';
        g.style.left = Math.round(x - EG_STRK_BALL_R) + 'px';
        g.style.top = Math.round(y - EG_STRK_BALL_R) + 'px';
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 420);
    } catch (e) {}
}


// Advances the match ball: loose homing with a turn cap, wall bounces,
// tackle on touch (hit + fling away from the impact) — or a parry kick
// away from the player while the parry key is held.
function _egStrkAdvanceBall(st, dtS, now, pr, p) {
    const b = st.ball;
    const W = window.innerWidth, H = window.innerHeight;
    const c = _egNkPlayerCenter();
    if (c) {
        const dx = c.x - b.x, dy = c.y - b.y;
        const want = Math.atan2(dy, dx);
        let diff = want - b.a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.a += Math.max(-EG_STRK_BALL_TURN * dtS, Math.min(EG_STRK_BALL_TURN * dtS, diff));
    }
    const spd = (b.kickUntil && now < b.kickUntil) ? b.kickSpeed : EG_STRK_BALL_SPEED[p];
    b.x += Math.cos(b.a) * spd * dtS;
    b.y += Math.sin(b.a) * spd * dtS;
    // Bounce off the pitch walls.
    if (b.x < EG_STRK_BALL_R) { b.x = EG_STRK_BALL_R; b.a = Math.PI - b.a; }
    if (b.x > W - EG_STRK_BALL_R) { b.x = W - EG_STRK_BALL_R; b.a = Math.PI - b.a; }
    if (b.y < EG_STRK_BALL_R) { b.y = EG_STRK_BALL_R; b.a = -b.a; }
    if (b.y > H - EG_STRK_BALL_R) { b.y = H - EG_STRK_BALL_R; b.a = -b.a; }
    let tf = 'translate(' + Math.round(b.x - EG_STRK_BALL_R) + 'px,' + Math.round(b.y - EG_STRK_BALL_R) + 'px)';
    // Keeper lob: the ball hangs "in the air" (slightly oversized) and
    // settles to pitch level as the throw decays.
    if (b.lobUntil && now < b.lobUntil) {
        const k = Math.max(0, Math.min(1, (b.lobUntil - now) / EG_STRK_KEEPER_THROW_MS));
        tf += ' scale(' + (1 + 0.32 * k).toFixed(3) + ')';
    }
    b.el.style.transform = tf;
    // Parry-kick burst: leave a fading gold ghost trail along the flight.
    if (b.kickUntil && now < b.kickUntil && now >= (b.trailAt || 0)) {
        b.trailAt = now + 55;
        _egStrkBallGhost(b.x, b.y);
    }
    // Tackle check — or a PARRY KICK while the player holds E: the ball is
    // booted away from the player at kick-burst speed (decaying back to the
    // phase seek speed), no damage, no fling. Same touch cooldown as a
    // tackle so it can't be spammed at point-blank range.
    if (pr && now >= b.cdUntil && _egNkCircleHit(b.x, b.y, EG_STRK_BALL_R * 0.85, pr, 0)) {
        b.cdUntil = now + EG_STRK_TACKLE_CD_MS;
        const parrying = (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive);
        const c2 = _egNkPlayerCenter();
        if (parrying && c2) {
            const dx = b.x - c2.x, dy = b.y - c2.y; // directly away from the player
            const d = Math.hypot(dx, dy) || 1;
            const ang = Math.atan2(dy, dx);
            b.a = ang;
            b.kickUntil = now + EG_STRK_PARRY_KICK_MS;
            b.kickSpeed = EG_STRK_PARRY_KICK_SPEED;
            b.trailAt = 0;
            // Dedicated boot feedback: gold flash on the ball + a fan of
            // streaks shot along the kick vector (the white tackle flash
            // stays tackle-only).
            b.el.classList.add('parry');
            setTimeout(() => { try { b.el.classList.remove('parry'); } catch (e) {} }, 500);
            _egStrkKickTrail(b.x, b.y, ang);
            _egFlingBurst(b.x, b.y, ang);
            _egNkToast('eg_striker_parry', '🥾 PARRY KICK! You boot the ball away!');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
        } else if (c2) {
            const dx = c2.x - b.x, dy = c2.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            // Animated fling (contact at the ball): the avatar glides away
            // with a tumble + impact burst instead of teleporting.
            _egNkFlingAvatar((dx / d) * EG_STRK_TACKLE_FLING[p], (dy / d) * EG_STRK_TACKLE_FLING[p], b.x, b.y);
            b.el.classList.add('tackle');
            setTimeout(() => { try { b.el.classList.remove('tackle'); } catch (e) {} }, 260);
            const dealt = _egNkHit(EG_STRK_TACKLE_DMG[p], null, st.level);
            _egNkAbilityHitToast(dealt, 'The Striker', 'Tackle');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
        }
    }
}


function _egStrikerArenaInit(monster) {
    if (_egStrkWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        ball: null, goal: null,
        ballOutUntil: 0, ballGraceUntil: 0,
        scoring: null, pendingGates: [],
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egStrkWatcher = st;
    _egNkToast('eg_striker_intro', '⚽ The Striker: Kick-off! Respect the ball!');
    // Tier-scaled clock: every telegraph breathes with tier.
    // Passive run: lives the whole fight without hogging _egNkDodgeBusy().
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egStrkWatcher && _egStrkWatcher.run === run) _egStrkWatcher = null;
        _egStrikerSweep();
    };
    _egStrkSpawnGoal(st);
    _egStrkSpawnBall(st);

    _egNkLoop(run, (dtS, now) => {
        const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
        // Boss not registered yet → wait for it (spawn races the arena init);
        // boss vanished AFTER being live → the fight is over, tear down.
        if (!live) {
            if (!st.everLive) return (now - st.bornAt < 20000);
            return false;
        }
        st.everLive = true;

        const W = window.innerWidth, H = window.innerHeight;
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        // Goal damage (and any player damage) can shove the boss across the
        // NEXT gate while a scoring set-piece is still running — queue the
        // challenge instead of skipping it, and chain it when the current
        // one ends.
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) {
            st.gate60Done = true;
            if (st.scoring) st.pendingGates.push({ need: 1, budget: EG_STRK_KICK_BUDGET_G1 });
            else _egStrkScoringStart(st, now, 1, EG_STRK_KICK_BUDGET_G1);
        }
        if (!st.gate30Done && hpPct <= 0.30) {
            st.gate30Done = true;
            if (st.scoring) st.pendingGates.push({ need: 3, budget: EG_STRK_KICK_BUDGET_G3 });
            else _egStrkScoringStart(st, now, 3, EG_STRK_KICK_BUDGET_G3);
        }

        // ── The match ball (always) ──
        if (st.ball) {
            _egStrkAdvanceBall(st, dtS, now, pr, p);
            // Goal check: the ball's centre inside the goal mouth scores.
            if (st.goal && now >= (st.ballGraceUntil || 0)) {
                const g = st.goal;
                if (st.ball.x >= g.x0 && st.ball.x <= g.x1 && st.ball.y >= g.y0 && st.ball.y <= g.y1) {
                    _egStrkScoreGoal(st, now);
                }
            }
        } else if (st.ballOutUntil && now >= st.ballOutUntil) {
            st.ballOutUntil = 0;
            _egStrkKickoff(st);
        }

        // ── Kick-Off Challenge / Hat-Trick scoring set-piece (HP gates) ──
        if (st.scoring) _egStrkScoringTick(st, dtS, now, pr, W, H);
        // Goal return timer (while the scored ball is out of play).
        _egStrkGoalTimerTick(st, now);

        return true;
    });
}


// ── HP-gate scoring set-pieces: Kick-Off Challenge (1 goal) & Hat-Trick ──
// The persistent homing match ball LEAVES the pitch. A stationary ball rests
// on the grid: run to it, stand NEXT to it to charge (bomb-defuse-style
// strip), step away to shoot. Charge time = power, your position relative
// to the ball = kick angle. Score into the persistent goal for fanfare.

function _egStrkScoringStart(st, now, need, budgetMs) {
    if (st.scoring) return; // one set-piece at a time
    // The homing ball is gone while the challenge runs — remove it and
    // cancel any pending kick-off so it stays off until the set-piece ends.
    if (st.ball) {
        try { st.ball.el.remove(); } catch (e) {}
        st.ball = null;
    }
    st.ballOutUntil = 0;
    const W = window.innerWidth, H = window.innerHeight;
    const hudEl = _egNkEl(st.run, 'div', 'eg-strk-scorehud');
    const sc = {
        need, goals: 0, t: 0, budget: budgetMs,
        charge: 0, charging: false,
        ball: null, ringEl: null, chargeEl: null, hudEl,
    };
    st.scoring = sc;
    _egStrkScoringBallSpawn(st, sc, W, H);
    _egNkToast('eg_striker_scoring_start', '⚽ KICK-OFF CHALLENGE! Score ' + need + ' goal' + (need > 1 ? 's' : '') + ' — run to the ball, stand next to it to charge, step away to shoot!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
}


// Places (or replaces) the stationary kick ball at a fresh mid-pitch spot.
function _egStrkScoringBallSpawn(st, sc, W, H) {
    try { if (sc.ball && sc.ball.el) sc.ball.el.remove(); } catch (e) {}
    try { if (sc.ringEl) sc.ringEl.remove(); } catch (e) {}
    try { if (sc.chargeEl) sc.chargeEl.remove(); } catch (e) {}
    try { if (sc.dmgEl) sc.dmgEl.remove(); } catch (e) {}
    // Keep the ball clear of the goal mouth so shots have some distance.
    const x = W * (0.28 + Math.random() * 0.44);
    const y = H * (0.28 + Math.random() * 0.44);
    const el = _egNkEl(st.run, 'div', 'eg-strk-ball eg-strk-kickball', '⚽');
    const ringEl = _egNkEl(st.run, 'div', 'eg-strk-kickring');
    const chargeEl = _egNkEl(st.run, 'div', 'eg-strk-kickcharge');
    const dmgEl = _egNkEl(st.run, 'div', 'eg-strk-kickdmg');
    sc.ball = { x, y, vx: 0, vy: 0, moving: false, el };
    sc.ringEl = ringEl;
    sc.chargeEl = chargeEl;
    sc.dmgEl = dmgEl;
    sc.charge = 0;
    sc.charging = false;
    _egStrkScoringDrawBall(sc, W, H);
}


// Positions the kick ball + its ring/charge visuals at the ball's spot.
function _egStrkScoringDrawBall(sc, W, H) {
    const b = sc.ball;
    b.el.style.transform = 'translate(' + Math.round(b.x - EG_STRK_BALL_R) + 'px,' + Math.round(b.y - EG_STRK_BALL_R) + 'px)';
    sc.ringEl.style.left = Math.round(b.x) + 'px';
    sc.ringEl.style.top = Math.round(b.y) + 'px';
    sc.chargeEl.style.left = Math.round(b.x - 45) + 'px';
    sc.chargeEl.style.top = Math.round(b.y + 50) + 'px';
    // Potential-damage label sits just below the charge strip.
    if (sc.dmgEl) {
        sc.dmgEl.style.left = Math.round(b.x) + 'px';
        sc.dmgEl.style.top = Math.round(b.y + 70) + 'px';
    }
}


// Potential goal damage for a charge fraction — the same formula the real
// hit uses at goal time, so the preview never lies.
function _egStrkScoringPotentialDmg(st, charge) {
    const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
        ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
    if (!live || !(live.maxHP > 0)) return 0;
    const pct = EG_STRK_GOAL_DMG_MIN + (EG_STRK_GOAL_DMG_MAX - EG_STRK_GOAL_DMG_MIN) * charge;
    return Math.max(1, Math.round(live.maxHP * pct));
}


// Kicks the ball: direction = straight away from the player (so stand on
// the side opposite the goal), power = charge fraction lerped to speed.
function _egStrkScoringKick(st, sc, W, H) {
    const b = sc.ball;
    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    let dx = b.x - c.x, dy = b.y - c.y;
    let d = Math.hypot(dx, dy);
    if (d < 4) {
        // Standing dead-centre on the ball: aim at the goal as a fallback.
        const g = st.goal;
        dx = (g ? (g.x0 + g.x1) / 2 : W / 2) - b.x;
        dy = (g ? (g.y0 + g.y1) / 2 : H / 2) - b.y;
        d = Math.hypot(dx, dy) || 1;
    }
    const speed = EG_STRK_KICK_SPEED_MIN + (EG_STRK_KICK_SPEED_MAX - EG_STRK_KICK_SPEED_MIN) * sc.charge;
    b.vx = (dx / d) * speed;
    b.vy = (dy / d) * speed;
    b.moving = true;
    b.kickCharge = sc.charge; // remembered on the ball: goal damage scales with it
    sc.charge = 0;
    sc.charging = false;
    sc.chargeEl.style.setProperty('--kick-charge', '0%');
    sc.chargeEl.classList.remove('on');
    if (sc.dmgEl) sc.dmgEl.classList.remove('on');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
    try { _egFlingBurst(b.x, b.y, Math.atan2(b.vy, b.vx)); } catch (e) {}
}


// One frame of the scoring set-piece: ball physics, charge/kick, goal check.
function _egStrkScoringTick(st, dtS, now, pr, W, H) {
    const sc = st.scoring;
    sc.t += dtS * 1000;
    const b = sc.ball;
    // HUD: goals + seconds left.
    const leftS = Math.max(0, Math.ceil((sc.budget - sc.t) / 1000));
    sc.hudEl.textContent = '⚽ ' + sc.goals + '/' + sc.need + ' · ' + leftS + 's';
    sc.hudEl.classList.toggle('urgent', leftS <= 10);
    if (sc.t >= sc.budget) { _egStrkScoringEnd(st, sc, false); return; }

    // Ball movement: rolling decays with friction, bounces lose energy.
    if (b.moving) {
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) {
            const dec = Math.min(sp, EG_STRK_KICK_DECEL * dtS);
            b.vx -= (b.vx / sp) * dec;
            b.vy -= (b.vy / sp) * dec;
        }
        if (b.x < EG_STRK_BALL_R) { b.x = EG_STRK_BALL_R; b.vx = -b.vx * EG_STRK_KICK_BOUNCE; }
        if (b.x > W - EG_STRK_BALL_R) { b.x = W - EG_STRK_BALL_R; b.vx = -b.vx * EG_STRK_KICK_BOUNCE; }
        if (b.y < EG_STRK_BALL_R) { b.y = EG_STRK_BALL_R; b.vy = -b.vy * EG_STRK_KICK_BOUNCE; }
        if (b.y > H - EG_STRK_BALL_R) { b.y = H - EG_STRK_BALL_R; b.vy = -b.vy * EG_STRK_KICK_BOUNCE; }
        if (Math.hypot(b.vx, b.vy) < EG_STRK_KICK_STOP) { b.vx = 0; b.vy = 0; b.moving = false; }
        _egStrkScoringDrawBall(sc, W, H);
    } else {
        // Resting ball: charge while the player stands next to it.
        const c = _egNkPlayerCenter();
        const inRadius = c && Math.hypot(c.x - b.x, c.y - b.y) <= EG_STRK_KICK_RADIUS;
        if (inRadius) {
            if (!sc.charging) {
                sc.charging = true;
                sc.chargeEl.classList.add('on');
            }
            sc.charge = Math.min(1, sc.charge + dtS * 1000 / EG_STRK_KICK_CHARGE_MS);
            sc.chargeEl.style.setProperty('--kick-charge', (Math.round(sc.charge * 100)) + '%');
            // Live damage preview on the strip: the number grows as the
            // strip fills, tinted along the same green→gold→orange ramp.
            if (sc.dmgEl) {
                sc.dmgEl.textContent = '−' + _egStrkScoringPotentialDmg(st, sc.charge);
                sc.dmgEl.className = 'eg-strk-kickdmg on'
                    + (sc.charge >= 1 ? ' full' : (sc.charge >= 0.5 ? ' mid' : ''));
            }
            if (sc.charge >= 1) _egStrkScoringKick(st, sc, W, H); // full power auto-kick
        } else if (sc.charging) {
            // Stepped away → shoot with whatever power was charged.
            _egStrkScoringKick(st, sc, W, H);
        }
    }

    // Goal check: the ball's centre inside the goal mouth scores.
    if (st.goal) {
        const g = st.goal;
        if (b.x >= g.x0 && b.x <= g.x1 && b.y >= g.y0 && b.y <= g.y1) {
            _egStrkScoringGoal(st, sc, W, H);
        }
    }
}


// A goal! Fanfare, BONUS DAMAGE to the boss (scaled by the kick's charge),
// counter, and either respawn for the next attempt or complete the
// set-piece when the required count is reached.
function _egStrkScoringGoal(st, sc, W, H) {
    sc.goals++;
    if (st.goal) {
        st.goal.el.classList.add('scored');
        setTimeout(() => {
            const g = _egStrkWatcher && _egStrkWatcher.goal;
            if (g) { try { g.el.classList.remove('scored'); } catch (e) {} }
        }, 700);
    }
    // Bonus damage: charge-scaled % of the boss's maxHP, dealt through the
    // canonical player-damage path so resistances, damage numbers, card
    // flash and phase checks all apply.
    const charge = (sc.ball && sc.ball.kickCharge != null) ? sc.ball.kickCharge : 1;
    const dmgPct = EG_STRK_GOAL_DMG_MIN + (EG_STRK_GOAL_DMG_MAX - EG_STRK_GOAL_DMG_MIN) * charge;
    const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
        ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
    let dealt = 0;
    if (live && typeof _egDamageTargetById === 'function' && live.maxHP > 0 && !live.bossImmune) {
        dealt = Math.max(1, Math.round(live.maxHP * dmgPct));
        _egDamageTargetById(st.monsterId, dealt, null);
    }
    const gx = st.goal ? (st.goal.x0 + st.goal.x1) / 2 : W / 2;
    const gy = st.goal ? (st.goal.y0 + st.goal.y1) / 2 : H / 2;
    _egStrkGoalPop(gx, gy, dealt > 0 ? ('GOAL! −' + dealt) : 'GOAL!');
    try { _egFlingBurst(gx, gy, 0); _egFlingBurst(gx, gy, Math.PI / 2); _egFlingBurst(gx, gy, Math.PI); _egFlingBurst(gx, gy, -Math.PI / 2); } catch (e) {}
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('achievement'); } catch (e) {}
    if (sc.goals >= sc.need) {
        if (sc.need >= 3) {
            _egStrkGoalPop(W / 2, H * 0.3, 'HAT-TRICK!');
            _egNkToast('eg_striker_hattrick', '🎩 HAT-TRICK! Three goals — the pitch erupts!');
        } else {
            _egNkToast('eg_striker_scoring_done', '⚽ GOAL! Challenge complete!');
        }
        _egStrkScoringEnd(st, sc, true);
    } else {
        _egNkToast('eg_striker_scoring_goal', '⚽ GOAL! ' + sc.goals + '/' + sc.need + ' — keep going!');
        _egStrkScoringBallSpawn(st, sc, W, H);
    }
}


// Tears the scoring set-piece down. A queued gate challenge (the boss was
// damage-rushed across the next threshold mid-challenge) chains straight
// in; otherwise the homing match ball kicks off again.
function _egStrkScoringEnd(st, sc, success) {
    try { if (sc.ball && sc.ball.el) sc.ball.el.remove(); } catch (e) {}
    try { if (sc.ringEl) sc.ringEl.remove(); } catch (e) {}
    try { if (sc.chargeEl) sc.chargeEl.remove(); } catch (e) {}
    try { if (sc.dmgEl) sc.dmgEl.remove(); } catch (e) {}
    try { if (sc.hudEl) sc.hudEl.remove(); } catch (e) {}
    if (st.scoring === sc) st.scoring = null;
    if (!success) {
        _egNkToast('eg_striker_fulltime', '🟨 FULL TIME! The Striker regroups — the match ball is back!');
    }
    const pend = st.pendingGates && st.pendingGates.length ? st.pendingGates.shift() : null;
    if (pend) {
        _egStrkScoringStart(st, performance.now(), pend.need, pend.budget);
        return; // the new set-piece owns the pitch — no homing-ball kickoff
    }
    _egStrkKickoff(st); // the homing ball returns either way
}


// Charge-bar freeze gate for _egTickPlayer (endgame-encounter.js): true
// while a scoring set-piece (Kick-Off Challenge / Hat-Trick) is running —
// chasing, charging and shooting the ball IS the attack, so the auto-attack
// bar stays frozen (mirrors _egBomberFinalActive). Pending queued gates only
// exist while st.scoring is live, so st.scoring covers those too.
function _egStrkScoringActive() {
    return !!(_egStrkWatcher && _egStrkWatcher.scoring);
}


// Big gold "GOAL!" pop at a spot. Self-removing; no run tracking needed.
function _egStrkGoalPop(x, y, label) {
    try {
        const el = document.createElement('div');
        el.className = 'eg-strk-goalpop';
        el.textContent = label || 'GOAL!';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: FREE KICK------------------------------
//------------------------------------------------------------------------
// A cone wall materializes between ball and player, a dotted arc telegraphs
// the bend, then the ball curves around the wall onto the marked spot.
// Wired from _egFireMonsterAttack (endgame-encounter.js).

function _egStrkFreeKick(monster) {
    if (_egStrkFkActive || _egNkDodgeBusy() || _egNkFrozen()) return;
    const st = _egStrkWatcher;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster ? monster.id : null, true);
    _egStrkFkActive = true;
    run.onKill = () => { _egStrkFkActive = false; };
    const W = window.innerWidth, H = window.innerHeight;
    // Start from the match ball if alive, else a screen edge.
    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const sx = (st && st.ball) ? st.ball.x : (Math.random() < 0.5 ? 60 : W - 60);
    const sy = (st && st.ball) ? st.ball.y : H * 0.3;
    const dx = c.x - sx, dy = c.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    // Perpendicular offset for the curve (control point).
    const bendSide = Math.random() < 0.5 ? 1 : -1;
    const cxp = sx + dx * 0.5 - (dy / d) * 120 * bendSide;
    const cyp = sy + dy * 0.5 + (dx / d) * 120 * bendSide;
    // Defender cone wall at ~35% along the straight path.
    const wall = _egNkEl(run, 'div', 'eg-strk-fk-wall');
    for (let i = 0; i < EG_STRK_FK_WALL_N; i++) {
        const cone = document.createElement('div');
        cone.className = 'eg-strk-cone';
        cone.textContent = '🚧';
        const t = 0.35;
        const off = (i - (EG_STRK_FK_WALL_N - 1) / 2) * 34;
        cone.style.left = Math.round(sx + dx * t - (dy / d) * off) + 'px';
        cone.style.top = Math.round(sy + dy * t + (dx / d) * off) + 'px';
        wall.appendChild(cone);
    }
    // Dotted arc telegraph: sample the quadratic bezier.
    const dots = [];
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cxp + t * t * c.x;
        const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cyp + t * t * c.y;
        const dot = _egNkEl(run, 'div', 'eg-strk-fkdot');
        dot.style.left = Math.round(bx) + 'px';
        dot.style.top = Math.round(by) + 'px';
        dot.style.animationDelay = (i * 55) + 'ms';
        dots.push(dot);
    }
    const mark = _egNkEl(run, 'div', 'eg-strk-fkmark');
    mark.style.left = Math.round(c.x) + 'px';
    mark.style.top = Math.round(c.y) + 'px';
    _egNkToast('eg_striker_freekick', '⚽ FREE KICK! The ball bends around the wall!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
    let t = 0, hit = false;
    const ball = _egNkEl(run, 'div', 'eg-strk-fkball', '⚽');
    ball.style.opacity = '0';
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (t >= EG_STRK_FK_WARN_MS) {
            // Ball flight along the curve.
            const k = Math.min(1, (t - EG_STRK_FK_WARN_MS) / EG_STRK_FK_FLIGHT_MS);
            ball.style.opacity = '1';
            const bx = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cxp + k * k * c.x;
            const by = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cyp + k * k * c.y;
            ball.style.left = Math.round(bx) + 'px';
            ball.style.top = Math.round(by) + 'px';
            const pr = _egNkPlayerRect();
            if (pr && !hit && _egNkCircleHit(bx, by, 15, pr, 0)) {
                hit = true;
                const dealt = _egNkHit(EG_STRK_FK_DMG[p], null, level);
                _egNkAbilityHitToast(dealt, 'The Striker', 'Free Kick');
            }
            if (k >= 1) {
                dots.forEach(dt2 => { try { dt2.remove(); } catch (e) {} });
                try { mark.remove(); } catch (e) {}
                try { wall.remove(); } catch (e) {}
                try { ball.remove(); } catch (e) {}
                return false;
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled Striker Ball is now the persistent match ball — keep the
// handler name alive so any stale schedule entry no-ops instead of erroring.
function _egMechStrikerBall() { void 0; }
