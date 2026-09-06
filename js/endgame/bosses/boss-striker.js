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
//
//   HP GATES (watcher):
//   • 60% — CORNER KICK BARRAGE: a corner flag plants itself (telegraph),
//     then volleys of crosses fan out across the screen from that corner.
//     Two corners, three volleys each — dodge the gaps in the fan.
//   • 30% — PENALTY SHOOTOUT: a goal frame materializes at the screen edge,
//     the ball lines up on the spot and takes telegraphed shots at your
//     live position — heavy point-blank damage if you stand in the lane.
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
// Corner kick barrage (60% gate)
const EG_STRK_CORNER_FLAG_MS = 900;          // flag telegraph before volleys
const EG_STRK_CORNER_VOLLEYS = 3;            // volleys per corner
const EG_STRK_CORNER_PER_VOLLEY = 6;         // crosses per volley
const EG_STRK_CORNER_GAP_MS = 850;           // between volleys
const EG_STRK_CORNER_SPEED = 330;            // px/s cross speed
const EG_STRK_CORNER_DMG = 0.08;             // %maxHP per cross (physical)
const EG_STRK_CORNER_CORNERS = 2;            // corners used
// Penalty shootout (30% gate)
const EG_STRK_PEN_SHOTS = 3;                 // shots in the shootout
const EG_STRK_PEN_WARN_MS = 1300;            // target-ring telegraph per shot
const EG_STRK_PEN_FLIGHT_MS = 260;           // ball flight to the mark
const EG_STRK_PEN_GAP_MS = 800;              // between shots
const EG_STRK_PEN_DMG = [0, 0.13, 0.15, 0.18]; // %maxHP per shot by phase
const EG_STRK_PEN_MS = 10500;                // whole set-piece budget
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
        document.querySelectorAll('.eg-strk-ball, .eg-strk-corner, .eg-strk-cross, .eg-strk-goal, .eg-strk-spot, .eg-strk-shot, .eg-strk-shotring, .eg-strk-fk-wall, .eg-strk-fkball, .eg-strk-fkdot, .eg-strk-fkmark').forEach(el => el.remove());
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
function _egStrkSpawnBall(st) {
    const el = _egNkEl(st.run, 'div', 'eg-strk-ball', '⚽');
    const a0 = Math.random() * Math.PI * 2;
    st.ball = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.3,
        a: a0, el, cdUntil: 0,
    };
}


// Advances the match ball: loose homing with a turn cap, wall bounces,
// tackle on touch (hit + fling away from the impact).
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
    const spd = EG_STRK_BALL_SPEED[p];
    b.x += Math.cos(b.a) * spd * dtS;
    b.y += Math.sin(b.a) * spd * dtS;
    // Bounce off the pitch walls.
    if (b.x < EG_STRK_BALL_R) { b.x = EG_STRK_BALL_R; b.a = Math.PI - b.a; }
    if (b.x > W - EG_STRK_BALL_R) { b.x = W - EG_STRK_BALL_R; b.a = Math.PI - b.a; }
    if (b.y < EG_STRK_BALL_R) { b.y = EG_STRK_BALL_R; b.a = -b.a; }
    if (b.y > H - EG_STRK_BALL_R) { b.y = H - EG_STRK_BALL_R; b.a = -b.a; }
    b.el.style.transform = 'translate(' + Math.round(b.x - EG_STRK_BALL_R) + 'px,' + Math.round(b.y - EG_STRK_BALL_R) + 'px)';
    // Tackle check.
    if (pr && now >= b.cdUntil && _egNkCircleHit(b.x, b.y, EG_STRK_BALL_R * 0.85, pr, 0)) {
        b.cdUntil = now + EG_STRK_TACKLE_CD_MS;
        const c2 = _egNkPlayerCenter();
        if (c2) {
            const dx = c2.x - b.x, dy = c2.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            _egNkNudgeAvatar((dx / d) * EG_STRK_TACKLE_FLING[p], (dy / d) * EG_STRK_TACKLE_FLING[p]);
        }
        b.el.classList.add('tackle');
        setTimeout(() => { try { b.el.classList.remove('tackle'); } catch (e) {} }, 260);
        const dealt = _egNkHit(EG_STRK_TACKLE_DMG[p], null, st.level);
        _egNkAbilityHitToast(dealt, 'The Striker', 'Tackle');
        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
    }
}


function _egStrikerArenaInit(monster) {
    if (_egStrkWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        ball: null,
        corner: null, pen: null,
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

        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egStrkCornerKicks(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egStrkPenalty(st, now); }

        // ── The match ball (always) ──
        _egStrkAdvanceBall(st, dtS, now, pr, p);

        // ── Corner kick barrage state machine ──
        if (st.corner) {
            const ck = st.corner;
            ck.t += dtS * 1000;
            // Phase machine: 'volleying' fires volleys on the tier clock,
            // 'next' waits out the flag telegraph then replants a corner.
            if (ck.phase === 'volleying') {
                const volleyDue = EG_STRK_CORNER_FLAG_MS + ck.volley * EG_STRK_CORNER_GAP_MS;
                if (ck.volley < EG_STRK_CORNER_VOLLEYS && ck.t >= volleyDue) {
                    _egStrkCornerVolley(st, ck);
                    ck.volley++;
                }
            } else if (ck.phase === 'next') {
                if (ck.t >= EG_STRK_CORNER_FLAG_MS) {
                    _egStrkPlantCorner(st, ck);
                }
            }
            // Advance live crosses.
            for (let i = ck.balls.length - 1; i >= 0; i--) {
                const b = ck.balls[i];
                b.x += b.vx * dtS;
                b.y += b.vy * dtS;
                b.el.style.transform = 'translate(' + Math.round(b.x - 13) + 'px,' + Math.round(b.y - 13) + 'px)';
                if (pr && !b.hit && _egNkCircleHit(b.x, b.y, 14, pr, 0)) {
                    b.hit = true;
                    const dealt = _egNkHit(EG_STRK_CORNER_DMG, null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Striker', 'Cross');
                }
                const off = b.x < -40 || b.x > window.innerWidth + 40 || b.y < -40 || b.y > window.innerHeight + 40;
                if (off || b.hit && b.t > 400) { try { b.el.remove(); } catch (e) {} ck.balls.splice(i, 1); }
                b.t += dtS * 1000;
            }
            // Set-piece end: all volleys done, flag leaves, balls cleared.
            if (ck.phase === 'volleying' && ck.volley >= EG_STRK_CORNER_VOLLEYS && ck.balls.length === 0) {
                ck.cornersDone++;
                try { ck.flagEl.remove(); } catch (e) {}
                if (ck.cornersDone >= EG_STRK_CORNER_CORNERS) {
                    st.corner = null;
                } else {
                    // Next corner after a beat.
                    ck.phase = 'next';
                    ck.t = 0;
                    ck.volley = 0;
                }
            }
        }

        // ── Penalty shootout state machine ──
        if (st.pen) {
            const pk = st.pen;
            pk.t += dtS * 1000;
            if (pk.phase === 'setup' && pk.t >= 600) {
                pk.phase = 'aim';
                pk.t = 0;
            } else if (pk.phase === 'aim' && pk.t >= EG_STRK_PEN_WARN_MS) {
                // Fire: ball zips from the spot through the marked point.
                pk.phase = 'flight';
                pk.t = 0;
                const el = _egNkEl(st.run, 'div', 'eg-strk-shot', '⚽');
                pk.shotEl = el;
                pk.shotT = 0;
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
            } else if (pk.phase === 'flight') {
                pk.shotT += dtS * 1000;
                const k = Math.min(1, pk.shotT / EG_STRK_PEN_FLIGHT_MS);
                const x = pk.sx + (pk.tx - pk.sx) * k;
                const y = pk.sy + (pk.ty - pk.sy) * k;
                pk.shotEl.style.transform = 'translate(' + Math.round(x - 15) + 'px,' + Math.round(y - 15) + 'px)';
                if (pr && !pk.hit && _egNkCircleHit(x, y, 16, pr, 0)) {
                    pk.hit = true;
                    const dealt = _egNkHit(EG_STRK_PEN_DMG[p], null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Striker', 'Penalty');
                }
                if (k >= 1) {
                    try { pk.shotEl.remove(); } catch (e) {}
                    try { pk.ringEl.remove(); } catch (e) {}
                    pk.shot++;
                    if (pk.shot >= EG_STRK_PEN_SHOTS || pk.t >= EG_STRK_PEN_MS - EG_STRK_PEN_WARN_MS) {
                        pk.phase = 'done';
                    } else {
                        pk.phase = 'aim';
                        pk.hit = false;
                        pk.t = -EG_STRK_PEN_GAP_MS; // gap before next aim
                        _egStrkPenMark(st, pk);
                    }
                }
            } else if (pk.phase === 'done' || pk.t >= EG_STRK_PEN_MS) {
                try { if (pk.goalEl) pk.goalEl.remove(); } catch (e) {}
                try { if (pk.spotEl) pk.spotEl.remove(); } catch (e) {}
                try { if (pk.ringEl) pk.ringEl.remove(); } catch (e) {}
                try { if (pk.shotEl) pk.shotEl.remove(); } catch (e) {}
                st.pen = null;
            }
        }

        return true;
    });
}


// ── 60% gate: Corner Kick Barrage ───────────────────────────────────────
function _egStrkCornerKicks(st, now) {
    if (st.corner) return;
    const ck = {
        phase: 'first', t: 0, volley: 0,
        cornersDone: 0, balls: [], flagEl: null, cornerIdx: 0,
        corners: [[0, 0], [1, 0], [0, 1], [1, 1]].sort(() => Math.random() - 0.5),
    };
    st.corner = ck;
    _egStrkPlantCorner(st, ck);
    _egNkToast('eg_striker_corner', '🚩 CORNER KICKS! Crosses incoming from the flags!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
}


function _egStrkPlantCorner(st, ck) {
    const W = window.innerWidth, H = window.innerHeight;
    const c = ck.corners[ck.cornersDone % ck.corners.length];
    const fx = c[0] ? W - 46 : 30;
    const fy = c[1] ? H - 120 : 46;
    try { if (ck.flagEl) ck.flagEl.remove(); } catch (e) {}
    const flagEl = _egNkEl(st.run, 'div', 'eg-strk-corner', '🚩');
    flagEl.style.left = fx + 'px';
    flagEl.style.top = fy + 'px';
    ck.flagEl = flagEl;
    ck.cx = c[0] ? W : 0;
    ck.cy = c[1] ? H : 0;
    ck.phase = 'volleying';
    ck.t = 0;
    ck.volley = 0;
    ck.balls = ck.balls || [];
}


function _egStrkCornerVolley(st, ck) {
    if (!ck.flagEl) return;
    // Fan of crosses from the corner toward the opposite half.
    const W = window.innerWidth, H = window.innerHeight;
    const tx = ck.cx === 0 ? W : 0;
    const baseA = Math.atan2(H * 0.5 - ck.cy, tx - ck.cx);
    for (let i = 0; i < EG_STRK_CORNER_PER_VOLLEY; i++) {
        const a = baseA + (i / (EG_STRK_CORNER_PER_VOLLEY - 1) - 0.5) * 1.1;
        const el = _egNkEl(st.run, 'div', 'eg-strk-cross', '⚽');
        const b = {
            x: ck.cx + (ck.cx === 0 ? 8 : -8),
            y: ck.cy + (ck.cy === 0 ? 8 : -8),
            vx: Math.cos(a) * EG_STRK_CORNER_SPEED,
            vy: Math.sin(a) * EG_STRK_CORNER_SPEED,
            t: 0, hit: false, el,
        };
        ck.balls.push(b);
    }
}


// ── 30% gate: Penalty Shootout ──────────────────────────────────────────
function _egStrkPenalty(st, now) {
    if (st.pen) return;
    const W = window.innerWidth, H = window.innerHeight;
    const fromRight = Math.random() < 0.5;
    const gx = fromRight ? W - 26 : 26;
    const goalEl = _egNkEl(st.run, 'div', 'eg-strk-goal' + (fromRight ? ' flip' : ''), '🥅');
    goalEl.style.top = Math.round(H / 2 - 130) + 'px';
    goalEl.style[fromRight ? 'right' : 'left'] = '0px';
    const spotEl = _egNkEl(st.run, 'div', 'eg-strk-spot', '⚫');
    const sx = fromRight ? W - 320 : 320;
    spotEl.style.left = Math.round(sx - 14) + 'px';
    spotEl.style.top = Math.round(H / 2 - 14) + 'px';
    const pk = {
        phase: 'setup', t: 0, shot: 0, hit: false,
        sx, sy: H / 2,
        goalEl, spotEl, ringEl: null, shotEl: null,
    };
    st.pen = pk;
    _egStrkPenMark(st, pk);
    _egNkToast('eg_striker_penalty', '🥅 PENALTY SHOOTOUT! Clear the marked lanes!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('striker_kick'); } catch (e) {}
}


// Marks a fresh target ring at the player's live position for the next shot.
function _egStrkPenMark(st, pk) {
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    pk.tx = c.x;
    pk.ty = c.y;
    try { if (pk.ringEl) pk.ringEl.remove(); } catch (e) {}
    const ringEl = _egNkEl(st.run, 'div', 'eg-strk-shotring');
    ringEl.style.left = Math.round(c.x) + 'px';
    ringEl.style.top = Math.round(c.y) + 'px';
    pk.ringEl = ringEl;
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
