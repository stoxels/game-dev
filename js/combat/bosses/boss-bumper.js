import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkEl, _nkFlingAvatar, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE BUMPER (boss_bumper)------------------------
//------------------------------------------------------------------------
// A pinball table. For the whole fight the table is alive: bumpers drift
// around and fling you on touch, steel balls roll in (a red arrow marks
// where) and ricochet off bumpers and the corner kickers.
// BUMPER SLAM, FLIPPER SLAP, TILT (60%), MULTIBALL (30%) and the JACKPOT
// finale (10%) live in boss-bumper-flippers.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_bumper: {
        id: 'boss_bumper', name: 'The Bumper', emoji: '🎪',
        baseHP: 950, baseDamage: 20, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_bumper: {
        phases: [
            // Basic attacks are steady pressure; the table is the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'bumper_slam', intervalBase: 14000, intervalVariance: 3500, handler: '_mechBumperSlam' },
            { name: 'flipper_slap', intervalBase: 16000, intervalVariance: 4000, handler: '_mechBumperFlip', phase2Only: true },
            { name: 'fog_bank', intervalBase: 24000, intervalVariance: 6000, handler: '_mechFogBank' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND STATE-------------------------------------------
//------------------------------------------------------------------------
const BUMPER_N = [0, 2, 3, 3];                     // bumpers on the table, by phase
const BUMPER_R = 30;
const BUMPER_SPEED = [0, 34, 46, 60];              // drift (px/s)
const BUMPER_FLING = [0, 150, 180, 210];           // fling on touch (px)
const BUMPER_DMG = [0, 0.10, 0.12, 0.14];
const BUMPER_CD_MS = 900;                          // per bumper
const BALL_EVERY_MS = [0, 4400, 3500, 2700];       // a new ball rolls in this often, by phase
const BALL_SPEED = [0, 240, 290, 340];
const BALL_DMG = [0, 0.08, 0.09, 0.10];
const BALL_R = 24;
const BALL_WARN_MS = 800;                          // the entry arrow shows this long first
const BALL_BOUNCE_BOOST = 55;                      // kick when bouncing off a bumper
const BALL_MAX_SPEED = 640;                        // kicks can never snowball past this
const SLING_LEN = 300;                             // corner kicker length
const SLING_T = 46;                                // kicker half-thickness for balls
const SLING_KICK = 340;
const HIT_CD_MS = 650;                             // shared hit cooldown

export let _bumpWatcher = null;                    // the running table (one at a time)
let _bumpHitUntil = 0;


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS---------------------------------------------
//------------------------------------------------------------------------

// The phase number clamped to 1-3.
export function _bumpPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One physical hit with the boss-ability flash and number, behind a short
// shared cooldown so two table parts touching you together never stack.
export function _bumpStrike(pct, level, label) {
    const now = performance.now();
    if (now < _bumpHitUntil) return false;
    _bumpHitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Bumper', label, true);
    return true;
}

// Flings the player away from (x, y) and hits them (skipped while the shared
// hit cooldown runs, so one touch never flings twice).
export function _bumpFlingHit(level, x, y, flingPx, pct, label) {
    if (!_bumpStrike(pct, level, label)) return;
    const c = _nkPlayerCenter();
    if (!c) return;
    const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 1;
    _nkFlingAvatar(dx / d * flingPx, dy / d * flingPx, x, y);
}

// Plays the table's thwack sound (quietly ignored when audio is off).
export function _bumpSfx() {
    try { Audio_Manager.playSFX('boss_push_fling', 'bump_thwack'); } catch (e) {}
}

// Keeps a ball's speed under the cap after a kick.
function _capSpeed(b) {
    const s = Math.hypot(b.vx, b.vy);
    if (s > BALL_MAX_SPEED) { b.vx *= BALL_MAX_SPEED / s; b.vy *= BALL_MAX_SPEED / s; }
}

// Flashes a bumper or kicker element for a moment.
function _flash(el, cls) {
    el.classList.add(cls);
    setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, 280);
}


//------------------------------------------------------------------------
//-------------------BALLS (telegraphed entry, ricochet)------------------------------
//------------------------------------------------------------------------

// Adds a ball at (x, y) moving (vx, vy). It waits warnMs first while a red
// arrow (or, with aim, a red line) shows where it will go; only then it
// rolls and can hurt.
export function _bumpAddBall(st, x, y, vx, vy, opts) {
    const o = opts || {};
    const el = _nkEl(st.run, 'div', 'sx-bump-ball' + (o.hot ? ' hot' : ''));
    el.style.transform = 'translate(' + Math.round(x - BALL_R) + 'px,' + Math.round(y - BALL_R) + 'px)';
    el.style.opacity = '0.35';
    const ang = Math.atan2(vy, vx) * 180 / Math.PI;
    const tel = _nkEl(st.run, 'div', o.aim ? 'sx-bump-aim' : 'sx-bump-entry');
    tel.style.left = Math.round(x) + 'px';
    tel.style.top = Math.round(y) + 'px';
    tel.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
    tel.style.setProperty('--bump-warn', (o.warnMs || BALL_WARN_MS) + 'ms');
    st.balls.push({ x, y, vx, vy, el, tel, wait: o.warnMs || BALL_WARN_MS, life: o.life || 11000, dmg: o.dmg || 0 });
}

// Rolls one ball a frame: bounces off bumpers, walls and kickers; hits the
// player on touch. Returns false once the ball has run out.
function _stepBall(st, b, dtS, now, p) {
    const W = window.innerWidth, H = window.innerHeight;
    if (b.wait > 0) {
        b.wait -= dtS * 1000;
        if (b.wait <= 0) { try { b.tel.remove(); } catch (e) {} b.el.style.opacity = ''; }
        return true;
    }
    b.x += b.vx * dtS;
    b.y += b.vy * dtS;
    st.bumpers.forEach(bp => {
        const dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy) || 1, min = BUMPER_R + BALL_R;
        if (d >= min) return;
        b.x = bp.x + dx / d * min; b.y = bp.y + dy / d * min;
        const dot = (b.vx * dx + b.vy * dy) / d;
        if (dot >= 0) return;
        b.vx += (-2 * dot + BALL_BOUNCE_BOOST) * dx / d;
        b.vy += (-2 * dot + BALL_BOUNCE_BOOST) * dy / d;
        _capSpeed(b); _flash(bp.el, 'sx-nk-boom'); _bumpSfx();
    });
    if (b.x < BALL_R || b.x > W - BALL_R) { b.vx = -b.vx; b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x)); }
    if (b.y < BALL_R || b.y > H - BALL_R) { b.vy = -b.vy; b.y = Math.max(BALL_R, Math.min(H - BALL_R, b.y)); }
    st.slings.forEach(sl => _slingBall(sl, b));
    b.el.style.transform = 'translate(' + Math.round(b.x - BALL_R) + 'px,' + Math.round(b.y - BALL_R) + 'px)';
    if (_nkCircleHit(b.x, b.y, BALL_R, _nkPlayerRect(), 0)) _bumpStrike(b.dmg || BALL_DMG[p], st.level, 'Pinball');
    b.life -= dtS * 1000;
    return b.life > 0;
}


//------------------------------------------------------------------------
//-------------------CORNER KICKERS (slingshots)-------------------------------------
//------------------------------------------------------------------------

// Spawns the two slanted kickers above the bottom corners (decoration that
// also punts balls back into the table).
function _spawnSlings(st) {
    const W = window.innerWidth, H = window.innerHeight;
    [{ side: 'left', x0: 26, y0: H - 60, ang: -42 }, { side: 'right', x0: W - 26, y0: H - 60, ang: 222 }].forEach(d => {
        const el = _nkEl(st.run, 'div', 'sx-bump-sling ' + d.side);
        el.style.left = d.x0 + 'px';
        el.style.top = d.y0 + 'px';
        el.style.width = SLING_LEN + 'px';
        el.style.transformOrigin = '0 50%';
        el.style.transform = 'rotate(' + d.ang + 'deg)';
        const rad = d.ang * Math.PI / 180;
        let nx = Math.sin(rad), ny = -Math.cos(rad);
        if ((d.side === 'left') !== (nx >= 0)) { nx = -nx; ny = -ny; }     // normal points into the table
        st.slings.push({ x0: d.x0, y0: d.y0, dxu: Math.cos(rad), dyu: Math.sin(rad), nx, ny, el });
    });
}

// A ball touching a kicker is reflected and punted back into the table.
function _slingBall(sl, b) {
    const t = Math.max(0, Math.min(SLING_LEN, (b.x - sl.x0) * sl.dxu + (b.y - sl.y0) * sl.dyu));
    const cx = sl.x0 + sl.dxu * t, cy = sl.y0 + sl.dyu * t;
    const min = SLING_T + BALL_R;
    if (Math.hypot(b.x - cx, b.y - cy) >= min) return;
    b.x = cx + sl.nx * min; b.y = cy + sl.ny * min;
    const dot = b.vx * sl.nx + b.vy * sl.ny;
    if (dot >= 0) return;
    b.vx += (-2 * dot + SLING_KICK) * sl.nx;
    b.vy += (-2 * dot + SLING_KICK) * sl.ny;
    _capSpeed(b); _flash(sl.el, 'fired'); _bumpSfx();
}


//------------------------------------------------------------------------
//-------------------THE TABLE (runs the whole fight)----------------------------------
//------------------------------------------------------------------------

// Drifts the bumpers (faster while TILT is on) and flings a player who
// touches one.
function _stepBumpers(st, dtS, now, p) {
    const W = window.innerWidth, H = window.innerHeight;
    while (st.bumpers.length < BUMPER_N[p]) {
        st.bumpers.push({
            x: 90 + Math.random() * Math.max(120, W - 180), y: 110 + Math.random() * Math.max(120, H - 220),
            a: Math.random() * Math.PI * 2, cd: 0, el: _nkEl(st.run, 'div', 'sx-bump-bumper'),
        });
    }
    const tilt = now < st.tiltUntil;
    const spd = BUMPER_SPEED[p] * (tilt ? 1.7 : 1);
    const pr = _nkPlayerRect();
    st.bumpers.forEach(b => {
        b.el.classList.toggle('tilt', tilt);
        if (Math.random() < dtS * 1.1) b.a += (Math.random() - 0.5) * 2.2;
        b.x += Math.cos(b.a) * spd * dtS;
        b.y += Math.sin(b.a) * spd * dtS;
        if (b.x < 70 || b.x > W - 70) b.a = Math.PI - b.a;
        if (b.y < 90 || b.y > H - 70) b.a = -b.a;
        b.x = Math.max(70, Math.min(W - 70, b.x));
        b.y = Math.max(90, Math.min(H - 70, b.y));
        b.el.style.transform = 'translate(' + Math.round(b.x - BUMPER_R) + 'px,' + Math.round(b.y - BUMPER_R) + 'px)';
        if (now < b.cd || !_nkCircleHit(b.x, b.y, BUMPER_R, pr, 0)) return;
        b.cd = now + BUMPER_CD_MS;
        _flash(b.el, 'sx-nk-boom');
        _bumpSfx();
        _bumpFlingHit(st.level, b.x, b.y, BUMPER_FLING[p] * (tilt ? 1.25 : 1), BUMPER_DMG[p] * (tilt ? 1.3 : 1), 'Bumper');
    });
}

// Rolls a new ball in from a random side edge every so often.
function _feedBalls(st, dtMs, p) {
    st.feed += dtMs;
    if (st.feed < BALL_EVERY_MS[p]) return;
    st.feed = 0;
    const W = window.innerWidth, H = window.innerHeight, left = Math.random() < 0.5;
    const spd = BALL_SPEED[p] * (0.85 + Math.random() * 0.3);
    _bumpAddBall(st, left ? BALL_R + 4 : W - BALL_R - 4, 110 + Math.random() * Math.max(120, H - 220),
        (left ? 1 : -1) * spd, (Math.random() - 0.5) * spd * 0.6);
}

// Starts the table when the fight begins: rails, kickers, bumpers and balls,
// in one passive loop that lives until the boss is gone.
export function _bumperArenaInit(monster) {
    if (_bumpWatcher || !monster) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;                            // must not block the boss's other attacks
    const st = { monsterId: monster.id, level: monster.level || 1, run, bumpers: [], balls: [], slings: [], feed: 0, tiltUntil: 0, seen: false, born: performance.now() };
    _bumpWatcher = st;
    ['left', 'right', 'top'].forEach(side => _nkEl(run, 'div', 'sx-bump-rail ' + side));
    _spawnSlings(st);
    run.onKill = () => { if (_bumpWatcher === st) _bumpWatcher = null; };
    _nkLoop(run, (dtS, now) => {
        const live = (globalThis._monsters || []).find(m => m && m.id === st.monsterId);
        if (!live) return !st.seen && now - st.born < 20000;   // the boss card may register a moment later
        st.seen = true;
        const p = _bumpPhase(live.bossPhase);
        const tilt = now < st.tiltUntil;
        document.querySelectorAll('.sx-bump-rail, .sx-bump-sling').forEach(el => el.classList.toggle('tilt', tilt));
        _stepBumpers(st, dtS, now, p);
        _feedBalls(st, dtS * 1000, p);
        st.balls = st.balls.filter(b => {
            if (_stepBall(st, b, dtS, now, p)) return true;
            try { b.el.remove(); b.tel.remove(); } catch (e) {}
            return false;
        });
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: ends the
// table and removes every element the Bumper created.
export function _bumperTeardown() {
    const st = _bumpWatcher;
    _bumpWatcher = null;
    if (st && st.run) { try { _nkKillRun(st.run); } catch (e) {} }
    document.querySelectorAll('.sx-bump-bumper, .sx-bump-ball, .sx-bump-entry, .sx-bump-aim, .sx-bump-flip, .sx-bump-slam, ' +
        '.sx-bump-rail, .sx-bump-sling, .sx-bump-target, .sx-bump-pips, .sx-nk-fin-bump').forEach(el => { try { el.remove(); } catch (e) {} });
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}
