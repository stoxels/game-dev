import { Audio_Manager } from '../../audio/audio.js';
import { t } from '../../translation/translations.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkWatchFinale, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE DANCER (boss_dancer)-----------------------
//------------------------------------------------------------------------
// The mirror-ball dancer leads and YOU follow. A glowing dance floor ring
// moves with the Dancer: stay inside it and the RHYTHM meter fills (full =
// SHOWSTOPPER: the Dancer takes extra damage for a few seconds and you heal).
// Wander off and, after a short grace, the Dancer cuts in with a zap.
// Phase 2 adds the TANGO (a telegraphed dash you must follow) and CURTAIN
// CALL (the stage closes in to a spotlight around the Dancer). Phase 3 adds
// the PETAL SPIRAL. SPOTLIGHT SWEEP (rotating beams) and the PIROUETTE charge
// attack (rings with one shared opening) run all fight. At 10%: GRAND FINALE
// (shared finale waves).
//
// The Dancer stands still while it performs a set-piece, every hazard is
// telegraphed, and nothing here uses combat toasts: the floating hit numbers
// and the rhythm bar on screen carry everything.
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
            { name: 'spotlight_sweep', intervalBase: 16000, intervalVariance: 4000, handler: '_mechSpotlightSweep' },
            { name: 'curtain_call', intervalBase: 25000, intervalVariance: 5000, handler: '_mechCurtainCall' },
            { name: 'petal_spiral', intervalBase: 22000, intervalVariance: 5000, handler: '_mechPetalSpiral' },
        ],
        onInit: (m) => { _dancerArenaInit(m); _nkWatchFinale(m, DAN_FINALE); },
    },
});

// GRAND FINALE (shared waves): the last number of the night.
const DAN_FINALE = {
    name: 'The Dancer', title: '💃 GRAND FINALE', element: 'lightning', cls: 'sx-nk-fin-dance', color: '#f9a8d4',
    quiet: true, // no shield-absorbed toasts on finale hits (fight-wide rule)
    toastKey: 'eg_dancer_final',
    hint: 'The last number - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Grand Finale' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Grand Finale' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Grand Finale' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Final Bow' },
    ],
};


//------------------------------------------------------------------------
//-------------------TUNING------------------------------------------------
//------------------------------------------------------------------------
// The Dancer (index 0 of each table is unused: phases are 1-3)
const DAN_BALL_R = 46;                         // body radius
const DAN_GLIDE_SPEED = [0, 62, 82, 104];      // px/s while waltzing
const DAN_GLIDE_ACCEL = 1.6;                   // how quickly it changes direction
const DAN_TOUCH_DMG = [0, 0.05, 0.06, 0.07];   // %maxHP for bumping into the Dancer
const DAN_TOUCH_CD_MS = 1000;
const DAN_TOUCH_FLING = [0, 120, 145, 170];
// Dance floor and rhythm
const DAN_RING_R = [0, 250, 228, 206];         // dance floor radius per phase
const DAN_RHYTHM_FILL = [0, 15, 17, 19];       // rhythm per second while inside
const DAN_RHYTHM_DRAIN = 22;                   // rhythm per second lost outside
const DAN_OUT_GRACE_S = 2.2;                   // seconds outside before the Dancer cuts in
const DAN_CUTIN_DMG = [0, 0.05, 0.06, 0.07];   // %maxHP per cut-in zap
const DAN_CUTIN_GAP_MS = 1400;                 // time between zaps while still outside
const DAN_SHOW_MS = 6000;                      // SHOWSTOPPER duration
const DAN_SHOW_MULT = 1.35;                    // damage the Dancer takes during it
const DAN_SHOW_HEAL_PCT = 0.06;                // share of max life you heal
const DAN_SHOW_REST_MS = 2500;                 // pause before the rhythm can fill again
const DAN_START_GRACE_S = 4;                   // extra seconds outside before the first zap
const DAN_HINT_MS = 7000;                      // the "stay close" hint on the bar
// Tango (phase 2+): a telegraphed dash you have to follow
const DAN_TANGO_EVERY_MS = [0, 0, 14000, 9500];
const DAN_TANGO_WARN_MS = 1000;
const DAN_TANGO_SPEED = 520;
const DAN_TANGO_DIST = [0, 0, 330, 390];
// Spotlight Sweep: rotating beams from the Dancer
const DAN_SWEEP_BEAMS = [0, 2, 3, 4];
const DAN_SWEEP_WARN_MS = 1100;
const DAN_SWEEP_LIVE_MS = [0, 3000, 3200, 3400];
const DAN_SWEEP_SPIN = 0.6;                    // rad/s
const DAN_SWEEP_HALF_W = 26;
const DAN_SWEEP_PAD = 12;                      // forgiveness for the player's body
const DAN_SWEEP_DMG = [0, 0.10, 0.12, 0.14];
const DAN_SWEEP_HIT_CD_MS = 700;
const DAN_SWEEP_LEN = 1700;
// Curtain Call (phase 2+): the stage closes in to a spotlight on the Dancer
const DAN_CURTAIN_SAFE_R = [0, 0, 170, 150];
const DAN_CURTAIN_ROUNDS = [0, 0, 1, 2];
const DAN_CURTAIN_MIN_CLOSE_MS = 2600;
const DAN_CURTAIN_MAX_CLOSE_MS = 4200;
const DAN_CURTAIN_MIN_SPEED = 220;             // px/s you need at most to get into the light
const DAN_CURTAIN_HOLD_MS = 700;
const DAN_CURTAIN_OPEN_MS = 500;
const DAN_CURTAIN_DMG = [0, 0, 0.14, 0.17];
// Petal Spiral (phase 3): rotating arms of petals fly out from the Dancer
const DAN_SPIRAL_ARMS = 3;
const DAN_SPIRAL_WARN_MS = 1100;
const DAN_SPIRAL_MS = 6000;
const DAN_SPIRAL_SPIN = 1.05;                  // rad/s
const DAN_SPIRAL_EMIT_MS = 125;                // per arm
const DAN_SPIRAL_SPEED = 200;
const DAN_SPIRAL_DMG = 0.045;
const DAN_SPIRAL_HIT_CD_MS = 450;
const DAN_PETAL_R = 13;
// Pirouette (charge attack)
const DAN_PIRO_MS = 2100;
const DAN_PIRO_WARN_MS = 950;
const DAN_PIRO_RING_R = 420;
const DAN_PIRO_RING_TRAVEL_MS = 950;
const DAN_PIRO_RING_GAP_MS = 500;
const DAN_PIRO_RINGS = 3;
const DAN_PIRO_EDGE = 30;
const DAN_PIRO_RING_DMG = [0, 0.12, 0.14, 0.17];
const DAN_PIRO_HIT_CD_MS = 800;
const DAN_PIRO_GAP_DEG = 80;                   // the opening shared by every ring

let _dancerWatcher = null; // per-fight ballroom state


//------------------------------------------------------------------------
//-------------------SMALL HELPERS-----------------------------------------
//------------------------------------------------------------------------

function _danSfx() {
    try { if (Audio_Manager && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_dancer_discoball', 'dancer_beat'); } catch (e) {}
}

function _danPhaseOf(monster) {
    return Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
}

// Where the Dancer may go: clear of the edges and of the bottom HUD.
function _danBounds() {
    const W = window.innerWidth, H = window.innerHeight;
    return { x0: DAN_BALL_R + 50, x1: W - DAN_BALL_R - 50, y0: 130, y1: H - 190 };
}

// Places a straight lane element (a beam, a dash arrow): a bar of `len` px that
// starts at (x, y) and points along `ang`. One transform string - the separate
// `rotate` property orbits the screen corner on fixed elements in Chromium.
function _danPlaceLane(el, x, y, ang) {
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
}

// Flat heal + HUD refresh (hearts do it inline too).
function _danHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (globalThis.playerCurrentHP <= 0) return;
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(amount) : amount));
        if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    } catch (e) {}
}

// True while the Dancer is busy performing (it then stands still and the
// out-of-step zaps rest, so a set-piece never stacks a second punishment).
function _danBusy(st) {
    return st.hold > 0 || !!st.piro || st.ball.mode !== 'glide';
}

// Removes everything the Dancer has put on screen (registered in boss-teardown-hooks).
export function _dancerTeardown() {
    if (_dancerWatcher) {
        const st = _dancerWatcher;
        _dancerWatcher = null;
        try { if (st.run) _nkKillRun(st.run); } catch (e) {}
    }
    document.querySelectorAll('[class^="sx-dan-"], [class*=" sx-dan-"]').forEach(el => el.remove());
}

// Starts a set-piece run: the Dancer holds still until the run is over.
function _danBeginSetPiece(st, monster) {
    const run = _nkNewRun(monster && monster.id, true);
    st.hold++;
    run.onKill = () => { st.hold = Math.max(0, st.hold - 1); };
    return run;
}


//------------------------------------------------------------------------
//-------------------THE DANCER, DANCE FLOOR AND RHYTHM METER---------------
//------------------------------------------------------------------------

// Builds the mirror-ball body: facets, glow and a few twinkling sparks.
function _danBuildBall(run) {
    const el = _nkEl(run, 'div', 'sx-dan-ball');
    el.style.width = el.style.height = (DAN_BALL_R * 2) + 'px';
    el.innerHTML = '<div class="sx-dan-sphere"></div><i class="sx-dan-spark s1"></i><i class="sx-dan-spark s2"></i><i class="sx-dan-spark s3"></i><i class="sx-dan-spark s4"></i>';
    return el;
}

// The rhythm bar at the top of the arena.
function _danBuildHud(run) {
    const hud = _nkEl(run, 'div', 'sx-dan-hud');
    hud.innerHTML = '<div class="sx-dan-hud-label"></div><div class="sx-dan-hud-bar"><i></i></div>';
    return hud;
}

function _danSetHud(st, text, mode, pct) {
    const hud = st.hud;
    const label = hud.firstChild;
    if (label.textContent !== text) label.textContent = text;
    if (hud.dataset.mode !== mode) hud.dataset.mode = mode;
    hud.lastChild.firstChild.style.width = Math.max(0, Math.min(100, pct)).toFixed(1) + '%';
}

function _dancerArenaInit(monster) {
    if (_dancerWatcher) return;
    const monsterId = monster ? monster.id : null;
    const W = window.innerWidth, H = window.innerHeight;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null, hold: 0, piro: null,
        ball: null, ring: null, link: null, hud: null,
        rhythm: 0, outS: 0, cutCd: 0, showUntil: 0, showActive: false, restUntil: 0, tangoAcc: 0, born: performance.now(),
        touchCd: 0, piroHitCd: 0,
    };
    _dancerWatcher = st;
    // Persistent watcher run: passive, so it never blocks the scheduled set-pieces.
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_dancerWatcher === st) _dancerWatcher = null; };
    st.run = run;

    st.ring = _nkEl(run, 'div', 'sx-dan-ring');
    st.link = _nkEl(run, 'div', 'sx-dan-link');
    st.link.style.display = 'none';
    const el = _danBuildBall(run);
    // The Dancer opens the number close to you, toward the middle of the stage.
    const pc = _nkPlayerCenter() || { x: W / 2, y: H * 0.6 };
    const bd = _danBounds();
    const sx = Math.max(bd.x0, Math.min(bd.x1, pc.x + (W / 2 - pc.x) * 0.5));
    const sy = Math.max(bd.y0, Math.min(bd.y1, pc.y + (H * 0.45 - pc.y) * 0.5));
    st.ball = { x: sx, y: sy, vx: 0, vy: 0, tx: sx, ty: sy, repickAt: 0, mode: 'glide', el, dash: null };
    st.outS = -DAN_START_GRACE_S;
    st.hud = _danBuildHud(run);
    _danPlaceBall(st);

    _nkLoop(run, (dtS, now) => {
        if (_dancerWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const p = _danPhaseOf(live);
        const finale = !!(live._nkFinaleDone && live.bossImmune);
        _danStepBall(st, dtS, p, finale);
        _danPlaceBall(st);
        _danStepTouch(st, p, now);
        _danStepRhythm(st, live, dtS, now, p, finale);
        _danStepPirouette(st, dtS);
        return true;
    });
}

// Moves the ball element, the dance floor ring and the ring's size to the Dancer's spot.
function _danPlaceBall(st) {
    const b = st.ball;
    b.el.style.transform = 'translate(' + Math.round(b.x - DAN_BALL_R) + 'px,' + Math.round(b.y - DAN_BALL_R) + 'px)';
    const R = st.ringR || DAN_RING_R[1];
    st.ring.style.width = st.ring.style.height = (R * 2) + 'px';
    st.ring.style.transform = 'translate(' + Math.round(b.x - R) + 'px,' + Math.round(b.y - R) + 'px)';
}


//------------------------------------------------------------------------
//-------------------THE DANCER'S MOVEMENT----------------------------------
//------------------------------------------------------------------------

// Picks the next waltz target a good stretch away.
function _danPickGlideTarget(b) {
    const bd = _danBounds();
    for (let i = 0; i < 20; i++) {
        const x = bd.x0 + Math.random() * (bd.x1 - bd.x0), y = bd.y0 + Math.random() * (bd.y1 - bd.y0);
        if (Math.hypot(x - b.x, y - b.y) > 180) { b.tx = x; b.ty = y; return; }
    }
    b.tx = (bd.x0 + bd.x1) / 2; b.ty = (bd.y0 + bd.y1) / 2;
}

// Starts the telegraphed tango dash: an arrow and a landing ring show where it goes.
function _danStartTango(st, p) {
    const b = st.ball, bd = _danBounds();
    let tx = b.x, ty = b.y;
    for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2, d = DAN_TANGO_DIST[p] * (0.85 + Math.random() * 0.3);
        const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
        if (x >= bd.x0 && x <= bd.x1 && y >= bd.y0 && y <= bd.y1) { tx = x; ty = y; break; }
    }
    if (tx === b.x && ty === b.y) return;
    const ang = Math.atan2(ty - b.y, tx - b.x), len = Math.hypot(tx - b.x, ty - b.y);
    const arrow = _nkEl(st.run, 'div', 'sx-dan-tango');
    arrow.style.width = Math.round(len) + 'px';
    _danPlaceLane(arrow, b.x, b.y, ang);
    const end = _nkEl(st.run, 'div', 'sx-dan-tango-end');
    end.style.left = Math.round(tx) + 'px';
    end.style.top = Math.round(ty) + 'px';
    b.mode = 'tangoWarn';
    b.dash = { tx, ty, t: 0, arrow, end };
    b.el.classList.add('piro-warn');
    _danSfx();
}

// One frame of the Dancer's movement: waltz, or the tango warn and dash.
function _danStepBall(st, dtS, p, finale) {
    const b = st.ball;
    st.ringR = DAN_RING_R[p];
    if (finale || st.hold > 0 || st.piro) { b.vx *= 0.9; b.vy *= 0.9; return; }
    if (b.mode === 'tangoWarn') {
        b.dash.t += dtS * 1000;
        if (b.dash.t >= DAN_TANGO_WARN_MS) { b.mode = 'tangoDash'; b.dash.arrow.classList.add('go'); }
        return;
    }
    if (b.mode === 'tangoDash') {
        const dx = b.dash.tx - b.x, dy = b.dash.ty - b.y, d = Math.hypot(dx, dy) || 1;
        const step = DAN_TANGO_SPEED * dtS;
        if (d <= step) {
            b.x = b.dash.tx; b.y = b.dash.ty; b.vx = b.vy = 0;
            try { b.dash.arrow.remove(); b.dash.end.remove(); } catch (e) {}
            b.dash = null; b.mode = 'glide'; b.repickAt = 0; st.tangoAcc = 0;
            b.el.classList.remove('piro-warn');
        } else { b.x += dx / d * step; b.y += dy / d * step; }
        return;
    }
    // Waltz: ease toward the target at a gentle top speed.
    b.repickAt -= dtS * 1000;
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
    if (d < 40 || b.repickAt <= 0) { _danPickGlideTarget(b); b.repickAt = 6500; }
    const sp = DAN_GLIDE_SPEED[p], k = Math.min(1, dtS * DAN_GLIDE_ACCEL);
    b.vx += (dx / d * sp - b.vx) * k;
    b.vy += (dy / d * sp - b.vy) * k;
    b.x += b.vx * dtS;
    b.y += b.vy * dtS;
    // Stay on stage even if the window changed size since the last frame.
    const bd = _danBounds();
    b.x = Math.max(bd.x0, Math.min(bd.x1, b.x));
    b.y = Math.max(bd.y0, Math.min(bd.y1, b.y));
    st.tangoAcc += dtS * 1000;
    if (DAN_TANGO_EVERY_MS[p] && st.tangoAcc >= DAN_TANGO_EVERY_MS[p] && !_nkDodgeBusy()) { st.tangoAcc = 0; _danStartTango(st, p); }
}

// Bumping into the Dancer's body throws you back.
function _danStepTouch(st, p, now) {
    const b = st.ball;
    const pr = _nkPlayerRect(), c = _nkPlayerCenter();
    if (!c || !pr || now < st.touchCd || !_nkCircleHit(b.x, b.y, DAN_BALL_R * 0.85, pr, 0)) return;
    st.touchCd = now + DAN_TOUCH_CD_MS;
    const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
    _nkFlingAvatar((dx / d) * DAN_TOUCH_FLING[p], (dy / d) * DAN_TOUCH_FLING[p], b.x, b.y);
    _nkAbilityHitToast(_nkHit(DAN_TOUCH_DMG[p], 'lightning', st.level), 'The Dancer', 'Twirl', true);
    _danSfx();
}


//------------------------------------------------------------------------
//-------------------RHYTHM: STAY CLOSE TO YOUR PARTNER---------------------
//------------------------------------------------------------------------

// A full rhythm bar becomes the SHOWSTOPPER: the Dancer takes extra damage for
// a while and you heal a little.
function _danStartShowstopper(st, live, now) {
    st.showUntil = now + DAN_SHOW_MS;
    st.showActive = true;
    st.rhythm = 100;
    live.exposedUntil = Date.now() + DAN_SHOW_MS;
    live.exposedMult = DAN_SHOW_MULT;
    try { if (typeof playerMaxHP !== 'undefined') _danHeal(globalThis.playerMaxHP * DAN_SHOW_HEAL_PCT); } catch (e) {}
    _danSfx();
}

// One frame of the dance floor rules: inside fills the rhythm, outside drains it
// and, after the grace time, the Dancer cuts in.
function _danStepRhythm(st, live, dtS, now, p, finale) {
    const c = _nkPlayerCenter(), b = st.ball, R = st.ringR || DAN_RING_R[p];
    if (finale) {
        st.ring.dataset.state = 'off';
        st.hud.style.display = 'none';
        st.link.style.display = 'none';
        st.rhythm = 0; st.outS = 0;
        return;
    }
    st.hud.style.display = '';
    const inRing = !!c && Math.hypot(c.x - b.x, c.y - b.y) <= R;
    const show = now < st.showUntil;
    let state = inRing ? 'in' : 'out';
    if (show) {
        state = 'show';
        st.rhythm = Math.max(0, (st.showUntil - now) / DAN_SHOW_MS * 100);
        st.outS = 0;
    } else {
        if (st.showActive) { st.showActive = false; st.rhythm = 0; st.restUntil = now + DAN_SHOW_REST_MS; }
        if (inRing) {
            if (now >= st.restUntil) st.rhythm = Math.min(100, st.rhythm + DAN_RHYTHM_FILL[p] * dtS);
            st.outS = 0;
        } else {
            st.rhythm = Math.max(0, st.rhythm - DAN_RHYTHM_DRAIN * dtS);
            // Set-pieces already punish a wrong spot: the zaps wait while the Dancer performs.
            if (_danBusy(st) || _nkDodgeBusy()) st.outS = Math.max(0, st.outS - dtS);
            else st.outS += dtS;
            if (st.outS >= DAN_OUT_GRACE_S && now >= st.cutCd) {
                st.cutCd = now + DAN_CUTIN_GAP_MS;
                _nkAbilityHitToast(_nkHit(DAN_CUTIN_DMG[p], 'lightning', st.level), 'The Dancer', 'Cut-in', true);
                st.ring.classList.remove('zap'); void st.ring.offsetWidth; st.ring.classList.add('zap');
                _danSfx();
            }
        }
        if (st.rhythm >= 100 && !show) _danStartShowstopper(st, live, now);
    }
    st.ring.dataset.state = state;
    const warn = !show && !inRing && st.outS > 0.3;
    // The link line from the Dancer to you while you are drifting away.
    if (warn && c) {
        const ang = Math.atan2(c.y - b.y, c.x - b.x), len = Math.hypot(c.x - b.x, c.y - b.y);
        st.link.style.display = '';
        st.link.style.width = Math.round(len) + 'px';
        st.link.style.opacity = String(Math.min(1, 0.35 + st.outS / DAN_OUT_GRACE_S * 0.65));
        _danPlaceLane(st.link, b.x, b.y, ang);
    } else st.link.style.display = 'none';
    const hint = (now - st.born) < DAN_HINT_MS;
    let text = t('eg_dan_hud_in');
    if (show) text = t('eg_dan_hud_show');
    else if (!inRing) text = t('eg_dan_hud_out');
    else if (hint) text = t('eg_dan_hud_hint');
    _danSetHud(st, text, state, st.rhythm);
}


//------------------------------------------------------------------------
//-------------------SPOTLIGHT SWEEP (rotating beams)-----------------------
//------------------------------------------------------------------------

// Beams spin out of the Dancer. They are drawn dashed first (with the turning
// direction shown), then go live; the gaps between beams are wide.
export function _mechSpotlightSweep(monster, phase) {
    const st = _dancerWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen() || st.ball.mode !== 'glide') return;
    if (monster && monster.bossImmune) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _danBeginSetPiece(st, monster);
    const b = st.ball, n = DAN_SWEEP_BEAMS[p], dir = Math.random() < 0.5 ? 1 : -1;
    let ang0 = Math.random() * Math.PI * 2;
    const beams = [];
    for (let i = 0; i < n; i++) {
        const el = _nkEl(run, 'div', 'sx-dan-beam warn');
        el.style.width = DAN_SWEEP_LEN + 'px';
        el.style.height = (DAN_SWEEP_HALF_W * 2) + 'px';
        el.style.marginTop = (-DAN_SWEEP_HALF_W) + 'px';
        beams.push(el);
    }
    const chip = _nkEl(run, 'div', 'sx-dan-dirchip', dir > 0 ? '↻' : '↺');
    chip.style.left = Math.round(b.x) + 'px';
    chip.style.top = Math.round(b.y - DAN_BALL_R - 34) + 'px';
    let t0 = 0, live = false, hitCd = 0;
    const level = monster ? monster.level : 1;
    _danSfx();
    _nkLoop(run, (dtS, now) => {
        t0 += dtS * 1000;
        if (!live && t0 >= DAN_SWEEP_WARN_MS) {
            live = true;
            beams.forEach(el => { el.classList.remove('warn'); el.classList.add('live'); });
            chip.remove();
            _danSfx();
        }
        if (live) ang0 += dir * DAN_SWEEP_SPIN * dtS;
        else ang0 += dir * DAN_SWEEP_SPIN * 0.25 * dtS;
        const pc = _nkPlayerCenter();
        beams.forEach((el, i) => {
            const a = ang0 + i * Math.PI * 2 / n;
            _danPlaceLane(el, b.x, b.y, a);
            if (live && pc && now >= hitCd && _ptSegDist(pc.x, pc.y, b.x, b.y, b.x + Math.cos(a) * DAN_SWEEP_LEN, b.y + Math.sin(a) * DAN_SWEEP_LEN) < DAN_SWEEP_HALF_W + DAN_SWEEP_PAD) {
                hitCd = now + DAN_SWEEP_HIT_CD_MS;
                _nkAbilityHitToast(_nkHit(DAN_SWEEP_DMG[p], 'lightning', level), 'The Dancer', 'Spotlight Sweep', true);
            }
        });
        return t0 < DAN_SWEEP_WARN_MS + DAN_SWEEP_LIVE_MS[p];
    });
}


//------------------------------------------------------------------------
//-------------------CURTAIN CALL (the stage closes in)---------------------
//------------------------------------------------------------------------

// Red curtains close in from the edges until only a spotlight around the Dancer
// is left. Be inside it when the curtains meet; the closing speed is slow enough
// to always reach the light from wherever you stand.
export function _mechCurtainCall(monster, phase) {
    const st = _dancerWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen() || st.ball.mode !== 'glide') return;
    if (monster && monster.bossImmune) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    if (p < 2) return;
    const run = _danBeginSetPiece(st, monster);
    const b = st.ball, safeR = DAN_CURTAIN_SAFE_R[p], level = monster ? monster.level : 1;
    const curtain = _nkEl(run, 'div', 'sx-dan-curtains');
    const rim = _nkEl(run, 'div', 'sx-dan-curtain-rim');
    curtain.style.setProperty('--cx', Math.round(b.x) + 'px');
    curtain.style.setProperty('--cy', Math.round(b.y) + 'px');
    let rounds = DAN_CURTAIN_ROUNDS[p], stage = 'close', t0 = 0, r0 = 0, closeMs = 0;
    const startRound = () => {
        const pc = _nkPlayerCenter();
        const dist = pc ? Math.hypot(pc.x - b.x, pc.y - b.y) : 0;
        r0 = Math.max(Math.max(window.innerWidth, window.innerHeight) * 0.75, dist + 140);
        closeMs = Math.max(DAN_CURTAIN_MIN_CLOSE_MS, Math.min(DAN_CURTAIN_MAX_CLOSE_MS, (dist - safeR) / DAN_CURTAIN_MIN_SPEED * 1000 + 1500));
        stage = 'close'; t0 = 0;
        curtain.classList.remove('strike');
    };
    startRound();
    _danSfx();
    const setR = (r) => {
        curtain.style.setProperty('--cr', Math.round(r) + 'px');
        rim.style.width = rim.style.height = Math.round(r * 2) + 'px';
        rim.style.transform = 'translate(' + Math.round(b.x - r) + 'px,' + Math.round(b.y - r) + 'px)';
    };
    setR(r0);
    _nkLoop(run, (dtS) => {
        t0 += dtS * 1000;
        if (stage === 'close') {
            const k = Math.min(1, t0 / closeMs);
            setR(r0 + (safeR - r0) * k * (2 - k)); // eases out: slows into the final size
            if (k >= 1) { stage = 'hold'; t0 = 0; }
        } else if (stage === 'hold') {
            setR(safeR);
            if (t0 >= DAN_CURTAIN_HOLD_MS) {
                const pc = _nkPlayerCenter();
                if (pc && Math.hypot(pc.x - b.x, pc.y - b.y) > safeR) {
                    _nkAbilityHitToast(_nkHit(DAN_CURTAIN_DMG[p], 'lightning', level), 'The Dancer', 'Curtain Call', true);
                }
                curtain.classList.add('strike');
                _danSfx();
                stage = 'open'; t0 = 0;
            }
        } else {
            const k = Math.min(1, t0 / DAN_CURTAIN_OPEN_MS);
            setR(safeR + (r0 - safeR) * k);
            if (k >= 1) {
                rounds--;
                if (rounds <= 0) return false;
                startRound();
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------PETAL SPIRAL (phase 3)---------------------------------
//------------------------------------------------------------------------

// Spiral arms of petals fly out of the Dancer while it spins. Dance between the
// arms; the arms are wide apart and drawn as dashed spokes during the warning.
export function _mechPetalSpiral(monster, phase) {
    const st = _dancerWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen() || st.ball.mode !== 'glide') return;
    if (monster && monster.bossImmune) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    if (p < 3) return;
    const run = _danBeginSetPiece(st, monster);
    const b = st.ball, level = monster ? monster.level : 1, dir = Math.random() < 0.5 ? 1 : -1;
    const spokes = [];
    for (let i = 0; i < DAN_SPIRAL_ARMS; i++) {
        const el = _nkEl(run, 'div', 'sx-dan-spoke');
        el.style.width = '900px';
        spokes.push(el);
    }
    const chip = _nkEl(run, 'div', 'sx-dan-dirchip', dir > 0 ? '↻' : '↺');
    chip.style.left = Math.round(b.x) + 'px';
    chip.style.top = Math.round(b.y - DAN_BALL_R - 34) + 'px';
    b.el.classList.add('spin');
    const petals = [];
    let t0 = 0, ang = Math.random() * Math.PI * 2, emitAcc = 0, hitCd = 0;
    run.onKill = ((prev) => () => { prev(); try { b.el.classList.remove('spin'); } catch (e) {} petals.forEach(pt => pt.el.remove()); })(run.onKill);
    _danSfx();
    _nkLoop(run, (dtS, now) => {
        t0 += dtS * 1000;
        const emitting = t0 >= DAN_SPIRAL_WARN_MS && t0 < DAN_SPIRAL_WARN_MS + DAN_SPIRAL_MS;
        ang += dir * DAN_SPIRAL_SPIN * (emitting ? 1 : 0.25) * dtS;
        spokes.forEach((el, i) => {
            _danPlaceLane(el, b.x, b.y, ang + i * Math.PI * 2 / DAN_SPIRAL_ARMS);
            el.style.display = emitting ? 'none' : '';
        });
        if (t0 >= DAN_SPIRAL_WARN_MS && chip.isConnected) chip.remove();
        if (emitting) {
            emitAcc += dtS * 1000;
            while (emitAcc >= DAN_SPIRAL_EMIT_MS) {
                emitAcc -= DAN_SPIRAL_EMIT_MS;
                for (let i = 0; i < DAN_SPIRAL_ARMS; i++) {
                    const a = ang + i * Math.PI * 2 / DAN_SPIRAL_ARMS;
                    const el = _nkEl(run, 'div', 'sx-dan-petal');
                    petals.push({ x: b.x, y: b.y, vx: Math.cos(a) * DAN_SPIRAL_SPEED, vy: Math.sin(a) * DAN_SPIRAL_SPEED, a, el, dead: false });
                }
            }
        }
        const pr = _nkPlayerRect();
        for (let i = petals.length - 1; i >= 0; i--) {
            const pt = petals[i];
            pt.x += pt.vx * dtS; pt.y += pt.vy * dtS;
            pt.el.style.transform = 'translate(' + Math.round(pt.x) + 'px,' + Math.round(pt.y) + 'px) rotate(' + pt.a.toFixed(3) + 'rad)';
            const out = pt.x < -40 || pt.x > window.innerWidth + 40 || pt.y < -40 || pt.y > window.innerHeight + 40;
            if (!out && pr && now >= hitCd && _nkCircleHit(pt.x, pt.y, DAN_PETAL_R, pr, 0)) {
                hitCd = now + DAN_SPIRAL_HIT_CD_MS;
                _nkAbilityHitToast(_nkHit(DAN_SPIRAL_DMG, 'shadow', level), 'The Dancer', 'Petal', true);
                pt.el.remove(); petals.splice(i, 1);
            } else if (out) { pt.el.remove(); petals.splice(i, 1); }
        }
        return t0 < DAN_SPIRAL_WARN_MS + DAN_SPIRAL_MS || petals.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------PIROUETTE (charge attack)------------------------------
//------------------------------------------------------------------------

// Dispatched from _fireMonsterAttack: the Dancer flashes, then three expanding
// lightning rings bloom from it. All three share ONE opening, 25-50 degrees to
// one side of you, shown as a green wedge from the first flash on.
export function _dancerPirouette(monster) {
    const st = _dancerWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen()) return;
    if (st.piro || st.ball.mode !== 'glide') return;
    const p = _danPhaseOf(monster);
    const b = st.ball;
    const c = _nkPlayerCenter() || { x: b.x, y: b.y + 200 };
    const pa = Math.atan2(c.x - b.x, -(c.y - b.y)) * 180 / Math.PI;
    const gapMid = pa + (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25);
    const gapStart = ((gapMid - DAN_PIRO_GAP_DEG / 2) % 360 + 360) % 360;
    const wedge = _nkEl(st.run, 'div', 'sx-dan-piro-gap');
    wedge.style.left = Math.round(b.x) + 'px';
    wedge.style.top = Math.round(b.y) + 'px';
    wedge.style.setProperty('--gap', gapStart + 'deg');
    wedge.style.setProperty('--gapw', DAN_PIRO_GAP_DEG + 'deg');
    st.piro = { phase: 'warn', t: 0, ringsOut: 0, nextRingAt: 0, p, gapStart, wedge, x: b.x, y: b.y };
    b.el.classList.add('piro-warn');
    _danSfx();
}

// Runs the pirouette state machine: warn, spin out the rings, finish.
function _danStepPirouette(st, dtS) {
    if (st.piroHitCd > 0) st.piroHitCd -= dtS * 1000;
    const pi = st.piro;
    if (!pi) return;
    pi.t += dtS * 1000;
    if (pi.phase === 'warn' && pi.t >= DAN_PIRO_WARN_MS) {
        pi.phase = 'spin'; pi.t = 0; pi.nextRingAt = 0;
        st.ball.el.classList.remove('piro-warn');
        st.ball.el.classList.add('spin');
        _danSfx();
    } else if (pi.phase === 'spin') {
        if (pi.t >= pi.nextRingAt && pi.ringsOut < DAN_PIRO_RINGS) {
            pi.ringsOut++;
            pi.nextRingAt += DAN_PIRO_RING_GAP_MS;
            _danPiroRing(st, pi);
        }
        if (pi.t >= DAN_PIRO_MS) {
            st.ball.el.classList.remove('spin');
            try { pi.wedge.remove(); } catch (e) {}
            st.piro = null;
        }
    }
}

// Blooms one expanding ring. Damage is on the ring's travelling edge, outside
// the shared opening, and a global cooldown stops a ring from ticking twice.
function _danPiroRing(st, pi) {
    const x = pi.x, y = pi.y, p = pi.p;
    // Own run per ring: a run supports exactly one rAF loop, and killing the
    // watcher's run would take the whole arena with it.
    const ringRun = _nkNewRun(st.monsterId, true);
    const el = _nkEl(ringRun, 'div', 'sx-dan-piro');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--gap', pi.gapStart + 'deg');
    el.style.setProperty('--gapw', DAN_PIRO_GAP_DEG + 'deg');
    let t0 = 0;
    _nkLoop(ringRun, (dtS) => {
        t0 += dtS * 1000;
        const k = t0 / DAN_PIRO_RING_TRAVEL_MS;
        if (k >= 1) return false;
        const r = 24 + (DAN_PIRO_RING_R - 24) * k;
        el.style.width = el.style.height = Math.round(r * 2) + 'px';
        el.style.marginLeft = el.style.marginTop = (-r) + 'px';
        const cc = _nkPlayerCenter();
        if (cc && st.piroHitCd <= 0) {
            const d = Math.hypot(cc.x - x, cc.y - y);
            const ang = Math.atan2(cc.x - x, -(cc.y - y)) * 180 / Math.PI;
            const into = ((ang - pi.gapStart) % 360 + 360) % 360;
            const inGap = into >= 6 && into <= DAN_PIRO_GAP_DEG - 6;
            if (Math.abs(d - r) < DAN_PIRO_EDGE && !inGap) {
                st.piroHitCd = DAN_PIRO_HIT_CD_MS;
                _nkAbilityHitToast(_nkHit(DAN_PIRO_RING_DMG[p], 'lightning', st.level), 'The Dancer', 'Pirouette', true);
            }
        }
        return true;
    });
}
