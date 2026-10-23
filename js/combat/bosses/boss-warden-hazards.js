import { _nkDodgeBusy, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkToast, _ptSegDist } from './shared-boss-abilities.js';
import { WARDEN_COLOR, _wardenAngDiff, _wardenPC, _wardenPlace, _wardenSetGap, _wardenSparks, _wardenTouch } from './boss-warden.js';

//------------------------------------------------------------------------
//-------------------THE WARDEN: SENTRY FIRE + SOLITARY-------------------------
//------------------------------------------------------------------------
// Sentry Fire: turrets pop out of the arena edge, swing round to follow you
// (they turn slowly, so cutting across their aim wins), lock, then fire a
// bolt along the locked line.
// Solitary (60%+): an electric cage snaps shut around you, shrinks, and only
// opens through a door that slides around its wall. Touching a wall bites;
// still inside when it finishes = crushed.
//------------------------------------------------------------------------

// ── Sentry tuning, indexed by boss phase (1..3) ──
const SEN_COUNT = [0, 1, 2, 3];              // turrets per cast
const SEN_VOLLEYS = [0, 3, 3, 4];            // shots each turret fires
const SEN_AIM_MS = [0, 1050, 950, 850];      // time spent tracking before the lock
const SEN_LOCK_MS = 380;                     // aim frozen, line turns solid
const SEN_FIRE_MS = 240;                     // the bolt itself
const SEN_GAP_MS = 480;                      // pause between a turret's shots
const SEN_STAGGER_MS = 520;                  // turrets start this far apart
const SEN_TURN = 3.2;                        // rad/s the barrel can swing
const SEN_DMG = [0, 0.20, 0.23, 0.26];       // %maxHP for standing in a bolt
const SEN_BOLT_HALF_W = 34;                  // px from the line that still counts as hit
const SEN_EXPOSE_MS = 10000;                 // how long a bolt-struck Warden takes extra damage
const SEN_EXPOSE_MULT = 1.25;                // damage multiplier while exposed

// ── Solitary tuning ──
const CAGE_START = 175;                      // px half-size when it closes
const CAGE_END = 52;                         // px half-size when it is fully shut
const CAGE_WARN_MS = 900;                    // dashed frame following you
const CAGE_LOCK_MS = 260;                    // frame stops, flashes
const CAGE_LIVE_MS = [0, 0, 3200, 3000];     // how long the live bars shrink
const CAGE_DOOR_SPIN = [0, 0, 1.0, 1.4];     // rad/s the door slides round the wall
const CAGE_DOOR_HALF = [0, 0, 0.40, 0.34];   // rad half-width of the door
const CAGE_WALL_DMG = [0, 0, 0.14, 0.16];    // %maxHP touching a wall
const CAGE_CRUSH_DMG = [0, 0, 0.34, 0.40];   // %maxHP still inside at the end
const CAGE_WALL_REACH = 17;                  // px from the wall that counts as touching


//------------------------------------------------------------------------
//-------------------SENTRY FIRE-------------------------------------------
//------------------------------------------------------------------------

// A spot on one of the four screen edges (a different edge per turret).
function _sentrySpot(index) {
    const W = window.innerWidth, H = window.innerHeight - 70;
    const edge = (Math.floor(Math.random() * 4) + index) % 4;
    const f = 0.18 + Math.random() * 0.64;
    if (edge === 0) return { x: 34, y: H * f };
    if (edge === 1) return { x: W - 34, y: H * f };
    if (edge === 2) return { x: W * f, y: 34 };
    return { x: W * f, y: H - 10 };
}

// Builds one turret: a dome on the wall plus its aiming line.
function _sentryBuild(run, index) {
    const spot = _sentrySpot(index);
    const dome = _nkEl(run, 'div', 'sx-ward-sentry');
    dome.innerHTML = '<i class="sx-ward-sentry-barrel"></i><i class="sx-ward-sentry-eye"></i>';
    _wardenPlace(dome, spot.x, spot.y, 24, 24);
    const beam = _nkEl(run, 'div', 'sx-ward-beam');
    beam.style.left = Math.round(spot.x) + 'px';
    beam.style.top = Math.round(spot.y) + 'px';
    return {
        x: spot.x, y: spot.y, dome, beam, angle: 0, state: 'wait', t: -index * SEN_STAGGER_MS - 500,
        shot: 0, aimed: false, hit: false,
    };
}

// Swings the barrel toward the player at a limited turn rate.
function _sentryTrack(s, pc, dtS) {
    const want = Math.atan2(pc.y - s.y, pc.x - s.x);
    if (!s.aimed) { s.angle = want; s.aimed = true; return; }
    let d = want - s.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const step = SEN_TURN * dtS;
    s.angle += Math.abs(d) <= step ? d : Math.sign(d) * step;
}

// Draws the aiming / bolt line from the turret along its current angle.
function _sentryDraw(s, cls) {
    s.beam.className = 'sx-ward-beam ' + cls;
    s.beam.style.transform = 'rotate(' + s.angle + 'rad)';
    s.dome.style.setProperty('--ang', s.angle + 'rad');
}

// Did the bolt pass through the Warden's own card? If so it is EXPOSED: it takes
// extra damage for SEN_EXPOSE_MS (read from the monster in encounter-monster-damage.js).
function _sentryExposeBoss(run, s, far, monster) {
    const card = monster && document.getElementById('sx-card-' + monster.id);
    if (!card) return;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (_ptSegDist(cx, cy, s.x, s.y, far.x, far.y) > Math.min(r.width, r.height) / 2 + 12) return;
    const fresh = !(monster.exposedUntil > Date.now());
    monster.exposedUntil = Date.now() + SEN_EXPOSE_MS;
    monster.exposedMult = SEN_EXPOSE_MULT;
    _wardenSparks(run, cx, cy, 8);
    if (fresh) _nkToast('eg_mech_warden_exposed', '🎯 The Warden is EXPOSED - it takes more damage for 10s!', '#4ade80');
}

// One turret's state machine: wait -> aim -> lock -> fire -> gap (repeat).
function _sentryStep(run, s, ctx) {
    const { p, pc, dtS, level, monster } = ctx;
    s.t += dtS * 1000;
    if (s.state === 'wait') {
        if (s.t >= 0) { s.state = 'aim'; s.t = 0; s.dome.classList.add('sx-ward-sentry-up'); }
        return true;
    }
    if (s.state === 'aim') {
        _sentryTrack(s, pc, dtS);
        _sentryDraw(s, 'sx-ward-beam-aim');
        if (s.t >= SEN_AIM_MS[p]) { s.state = 'lock'; s.t = 0; }
    } else if (s.state === 'lock') {
        _sentryDraw(s, 'sx-ward-beam-lock');
        if (s.t >= SEN_LOCK_MS) { s.state = 'fire'; s.t = 0; s.hit = false; _wardenSparks(run, s.x, s.y, 5); }
    } else if (s.state === 'fire') {
        _sentryDraw(s, 'sx-ward-beam-fire');
        const far = { x: s.x + Math.cos(s.angle) * 2600, y: s.y + Math.sin(s.angle) * 2600 };
        _sentryExposeBoss(run, s, far, monster);
        if (!s.hit && _ptSegDist(pc.x, pc.y, s.x, s.y, far.x, far.y) < SEN_BOLT_HALF_W) {
            s.hit = true;
            _wardenTouch(SEN_DMG[p], level, 'Sentry Bolt', true);
        }
        if (s.t >= SEN_FIRE_MS) {
            s.shot++;
            s.state = s.shot >= SEN_VOLLEYS[p] ? 'done' : 'gap';
            s.t = 0;
            s.beam.className = 'sx-ward-beam sx-ward-beam-off';
            if (s.state === 'done') s.dome.classList.remove('sx-ward-sentry-up');
        }
    } else if (s.state === 'gap') {
        if (s.t >= SEN_GAP_MS) { s.state = 'aim'; s.t = 0; s.aimed = true; }
    }
    return s.state !== 'done';
}

// Sentry Fire: see the header comment.
export function _mechWardenSentries(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen() || (monster && (monster._wardenLockdown || monster._wardenPylons))) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const sentries = [];
    for (let i = 0; i < SEN_COUNT[p]; i++) sentries.push(_sentryBuild(run, i));
    _nkToast('eg_mech_warden_sentries', '🗼🔫 SENTRY FIRE - turrets lock your spot! Cut across their aim and leave the line!', WARDEN_COLOR);
    _nkLoop(run, (dtS) => {
        if (monster && monster._wardenPylons) return false;   // pylons rose mid-volley: turrets stand down
        const ctx = { p, pc: _wardenPC(), dtS, level, monster };
        let alive = false;
        for (const s of sentries) if (_sentryStep(run, s, ctx)) alive = true;
        return alive;
    });
}


//------------------------------------------------------------------------
//-------------------SOLITARY CONFINEMENT (60%+)---------------------------
//------------------------------------------------------------------------

// Sizes and centres the cage frame and its door marker for the current half-size.
function _cagePlace(cage, door, cx, cy, half) {
    for (const el of [cage, door]) {
        _wardenPlace(el, cx, cy, half, half);
        el.style.width = el.style.height = Math.round(half * 2) + 'px';
    }
}

// Touch check: are we on a wall (not in the door gap)?
function _cageTouching(pc, cx, cy, half, doorAt, doorHalf) {
    const dx = pc.x - cx, dy = pc.y - cy;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    if (Math.abs(m - half) > CAGE_WALL_REACH) return false;
    return _wardenAngDiff(Math.atan2(dy, dx), doorAt) > doorHalf;
}

// Ends the cage: crush anyone still inside, flash it off.
function _cageCrush(run, cage, door, cx, cy, half, level, p) {
    const pc = _wardenPC();
    if (Math.max(Math.abs(pc.x - cx), Math.abs(pc.y - cy)) < half - 6) {
        _wardenTouch(CAGE_CRUSH_DMG[p], level, 'Solitary', true);
    }
    cage.classList.add('sx-ward-cage-snap');
    door.remove();
    _wardenSparks(run, cx, cy, 10);
}

// Solitary: see the header comment.
export function _mechWardenSolitary(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen() || (monster && monster._wardenLockdown)) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const cage = _nkEl(run, 'div', 'sx-ward-cage sx-ward-cage-warn');
    const door = _nkEl(run, 'div', 'sx-ward-cage-door');
    const doorHalf = CAGE_DOOR_HALF[p];
    let cx = _wardenPC().x, cy = _wardenPC().y;
    let doorAt = Math.random() * Math.PI * 2, t = 0, stage = 'warn';
    _cagePlace(cage, door, cx, cy, CAGE_START);
    _wardenSetGap(cage, doorAt, doorHalf * 2);
    _wardenSetGap(door, doorAt, doorHalf * 2);
    _nkToast('eg_mech_warden_solitary', '🗼🔒 SOLITARY - the cage locks on you! Find the sliding door and get OUT before it crushes!', WARDEN_COLOR);
    let half = CAGE_START;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pc = _wardenPC();
        if (stage === 'warn') {
            // The frame follows you, then locks where you stand.
            cx = pc.x; cy = pc.y;
            _cagePlace(cage, door, cx, cy, CAGE_START);
            if (t >= CAGE_WARN_MS) { stage = 'lock'; t = 0; cage.classList.add('sx-ward-cage-lock'); }
        } else if (stage === 'lock') {
            // The bars are not live yet, so nudge the frame along if you push toward its
            // edge: you can't slip out for free before the cage actually closes.
            const lim = CAGE_START - CAGE_WALL_REACH - 12;
            if (Math.abs(pc.x - cx) > lim) cx = pc.x - Math.sign(pc.x - cx) * lim;
            if (Math.abs(pc.y - cy) > lim) cy = pc.y - Math.sign(pc.y - cy) * lim;
            _cagePlace(cage, door, cx, cy, CAGE_START);
            if (t >= CAGE_LOCK_MS) {
                stage = 'live'; t = 0;
                cage.classList.remove('sx-ward-cage-warn', 'sx-ward-cage-lock');
                cage.classList.add('sx-ward-cage-live');
                door.classList.add('sx-ward-cage-door-live');
            }
        } else if (stage === 'live') {
            const f = Math.min(1, t / CAGE_LIVE_MS[p]);
            half = CAGE_START - (CAGE_START - CAGE_END) * f;
            doorAt += CAGE_DOOR_SPIN[p] * dtS;
            _cagePlace(cage, door, cx, cy, half);
            _wardenSetGap(cage, doorAt, doorHalf * 2);
            _wardenSetGap(door, doorAt, doorHalf * 2);
            if (_cageTouching(pc, cx, cy, half, doorAt, doorHalf)) _wardenTouch(CAGE_WALL_DMG[p], level, 'Cage Bars');
            if (f >= 1) {
                _cageCrush(run, cage, door, cx, cy, half, level, p);
                stage = 'snap'; t = 0;
            }
        }
        // 'snap': the shut cage flashes out before the run clears it.
        return stage !== 'snap' || t < 380;
    });
}
