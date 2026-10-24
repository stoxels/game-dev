import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE CYCLOPS (boss_cyclops)---------------------------
//------------------------------------------------------------------------
// Bullet-eye homage: one great eye hangs over the arena.
//  - EYE BURSTS: rings of slow orbs. Thin red rays show where each ring will
//    fly 0.7 s before it leaves, so you can see the gaps. Each ring is turned
//    half a step from the last one, so the gap you stood in is now an orb lane.
//  - GAZE LOCK: the eye tracks you with a dashed lane, then LOCKS it (solid
//    red) and fires a beam down it. Walk sideways out of the lane.
//  - At 10%: BLINDING GAZE (shared finale waves).
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_cyclops: {
        id: 'boss_cyclops', name: 'The Cyclops', emoji: '👹',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_cyclops: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'eye_bursts', intervalBase: 17000, intervalVariance: 4000, handler: '_mechEyeBursts' },
            { name: 'gaze_lock', intervalBase: 15000, intervalVariance: 4000, handler: '_mechCyclopsGaze' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
        onInit: (m) => { _nkWatchFinale(m, CYC_FINALE); },
    },
});

// BLINDING GAZE (shared waves): the eye shuts - read each circle.
const CYC_FINALE = {
    name: 'The Cyclops', title: '👁 BLINDING GAZE', element: 'fire', cls: 'sx-nk-fin-cyc', color: '#fb923c',
    toastKey: 'eg_cyclops_final',
    hint: 'The eye burns white - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Blinding Gaze' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Blinding Gaze' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Blinding Gaze' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Lidless Stare' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED EYE HELPERS------------------------------------------
//------------------------------------------------------------------------
const CYC_EYE_R = 30;                 // radius of the painted eye
const CYC_RAY_LEN = 1800;             // how far a warning ray / beam reaches

// Where the eye hangs: horizontal middle, a third of the way down.
function _cycEyePos() {
    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 };
}

// Builds the painted eye (white ball, red iris, black pupil) and returns it
// with a look(angle) function that turns the pupil toward a direction.
function _cycMakeEye(run, ex, ey) {
    const eye = _nkEl(run, 'div', 'sx-cyc-eye');
    eye.style.transform = 'translate(' + Math.round(ex - CYC_EYE_R) + 'px,' + Math.round(ey - CYC_EYE_R) + 'px)';
    const pupil = document.createElement('div');
    pupil.className = 'sx-cyc-pupil';
    eye.appendChild(pupil);
    const look = (ang) => {
        pupil.style.transform = 'translate(' + Math.round(Math.cos(ang) * 9) + 'px,' + Math.round(Math.sin(ang) * 9) + 'px)';
    };
    return { eye, look };
}

// A thin straight line starting at the eye and pointing along `ang`.
// (One transform string - the separate `rotate` property orbits the screen
// corner on fixed elements in Chromium.)
function _cycPlaceLane(el, ex, ey, ang) {
    el.style.transform = 'translate(' + Math.round(ex) + 'px,' + Math.round(ey) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
}

// Bearing from the eye to the player (falls back to straight down).
function _cycAimAngle(ex, ey) {
    const pc = _nkPlayerCenter();
    return pc ? Math.atan2(pc.y - ey, pc.x - ex) : Math.PI / 2;
}


//------------------------------------------------------------------------
//-------------------EYE BURSTS---------------------------------------------------
//------------------------------------------------------------------------
const BURST_VOLLEYS = [0, 4, 4, 5];            // rings per cast, by phase
const BURST_WAYS = [0, 8, 8, 10];              // orbs per ring
const BURST_SPEED = [0, 120, 140, 165];        // orb speed (px/s)
const BURST_DMG = [0, 0.055, 0.065, 0.08];     // share of max life per orb hit
const BURST_WARN_MS = 700;                     // rays show this long before a ring leaves
const BURST_GAP_MS = 1400;                     // time from one ring to the next
const BURST_ORB_LIFE_MS = 8000;
const BURST_HIT_CD_MS = 500;                   // orbs cannot machine-gun
const BURST_TURN = 0.39;                       // ring-to-ring turn (about half an orb step)

// Faint red rays showing the flight lines of the coming ring.
function _burstMakeRays(run, ex, ey, ways) {
    const rays = [];
    for (let i = 0; i < ways; i++) {
        const el = _nkEl(run, 'div', 'sx-cyc-ray');
        el.style.display = 'none';
        rays.push(el);
    }
    return {
        show(spin) { rays.forEach((el, i) => { el.style.display = ''; _cycPlaceLane(el, ex, ey, spin + i * Math.PI * 2 / ways); }); },
        hide() { rays.forEach(el => { el.style.display = 'none'; }); },
    };
}

// Moves every live orb, removes the finished ones and bites the player on a
// touch (shared cooldown). Returns the number of orbs left.
function _burstStepOrbs(orbs, dtS, now, st) {
    const pr = _nkPlayerRect();
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.t += dtS * 1000;
        o.x += o.vx * dtS;
        o.y += o.vy * dtS;
        if (o.t > BURST_ORB_LIFE_MS || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
            o.el.remove();
            orbs.splice(i, 1);
            continue;
        }
        o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
        if (!o.hitDone && pr && now >= st.cdUntil && _nkDotHit(o.el, pr, 2)) {
            o.hitDone = true;
            st.cdUntil = now + BURST_HIT_CD_MS;
            _nkAbilityHitToast(_nkHit(st.dmg, 'fire', st.level), 'The Cyclops', 'Eye Bursts');
        }
    }
    return orbs.length;
}

// Rotating radial orb volleys from the eye. The first ring is turned so the
// gap points at you; every later ring is turned half a step, so the gap you
// stood in is now an orb lane - step sideways with each ring.
export function _mechEyeBursts(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const ways = BURST_WAYS[p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const { x: ex, y: ey } = _cycEyePos();
    const { eye, look } = _cycMakeEye(run, ex, ey);
    const rays = _burstMakeRays(run, ex, ey, ways);
    const orbs = [];
    const st = { cdUntil: 0, dmg: BURST_DMG[p], level };
    let fired = 0, clock = 0, warned = false;
    // first ring: the player's bearing sits half a step off an orb lane
    let spin = _cycAimAngle(ex, ey) + Math.PI / ways;
    _nkToast('eg_mech_cyclops', '👹 The Cyclops: Eye Bursts! Mind the gaps!');
    _nkLoop(run, (dtS, now) => {
        look(_cycAimAngle(ex, ey));
        if (fired < BURST_VOLLEYS[p]) {
            clock += dtS * 1000;
            const due = (fired === 0 ? 1100 : BURST_GAP_MS);
            if (!warned && clock >= due - BURST_WARN_MS) {
                warned = true;
                eye.classList.add('sx-cyc-eye-charge');
                rays.show(fired === 0 ? spin : spin + BURST_TURN);
            }
            if (clock >= due) {
                clock = 0;
                warned = false;
                if (fired > 0) spin += BURST_TURN;
                fired++;
                rays.hide();
                eye.classList.remove('sx-cyc-eye-charge');
                for (let i = 0; i < ways; i++) {
                    const a = spin + i * Math.PI * 2 / ways;
                    const el = _nkEl(run, 'div', 'sx-nk-dot sx-nk-orb');
                    orbs.push({ x: ex, y: ey, vx: Math.cos(a) * BURST_SPEED[p], vy: Math.sin(a) * BURST_SPEED[p], t: 0, hitDone: false, el });
                }
            }
        }
        const left = _burstStepOrbs(orbs, dtS, now, st);
        return fired < BURST_VOLLEYS[p] || left > 0;
    });
}


//------------------------------------------------------------------------
//-------------------GAZE LOCK ---------------------------------------------------
//------------------------------------------------------------------------
const GAZE_BEAMS = [0, 2, 3, 4];               // beams per cast, by phase
const GAZE_TRACK_MS = [0, 1200, 1100, 1000];   // dashed lane follows you this long
const GAZE_LOCK_MS = [0, 650, 600, 550];       // lane frozen in red before the beam fires
const GAZE_FIRE_MS = 380;                      // how long the beam burns
const GAZE_REST_MS = 450;                      // pause between two beams
const GAZE_DMG = [0, 0.12, 0.14, 0.16];        // share of max life
const GAZE_HALF_W = 34;                        // beam half width (the painted lane is twice this)
const GAZE_PLAYER_PAD = 14;                    // player body allowance on top of the half width

// One beam: stage 'track' -> 'lock' -> 'fire' -> 'rest'. Returns a step(dtS)
// function that reports true while the beam is still busy.
function _gazeMakeBeam(run, ex, ey, p, level, look) {
    const lane = _nkEl(run, 'div', 'sx-cyc-lane');
    lane.style.height = (GAZE_HALF_W * 2) + 'px';
    lane.style.marginTop = (-GAZE_HALF_W) + 'px';
    lane.style.width = CYC_RAY_LEN + 'px';
    let stage = 'track', t = 0, ang = _cycAimAngle(ex, ey), hit = false;
    _cycPlaceLane(lane, ex, ey, ang);
    return (dtS) => {
        t += dtS * 1000;
        if (stage === 'track') {
            ang = _cycAimAngle(ex, ey);
            _cycPlaceLane(lane, ex, ey, ang);
            look(ang);
            if (t >= GAZE_TRACK_MS[p]) { stage = 'lock'; t = 0; lane.classList.add('sx-cyc-lane-locked'); }
        } else if (stage === 'lock') {
            if (t >= GAZE_LOCK_MS[p]) { stage = 'fire'; t = 0; lane.classList.remove('sx-cyc-lane-locked'); lane.classList.add('sx-cyc-lane-fire'); }
        } else if (stage === 'fire') {
            const pc = _nkPlayerCenter();
            const far = { x: ex + Math.cos(ang) * CYC_RAY_LEN, y: ey + Math.sin(ang) * CYC_RAY_LEN };
            if (!hit && pc && _ptSegDist(pc.x, pc.y, ex, ey, far.x, far.y) < GAZE_HALF_W + GAZE_PLAYER_PAD) {
                hit = true;
                _nkAbilityHitToast(_nkHit(GAZE_DMG[p], 'fire', level), 'The Cyclops', 'Gaze Lock');
            }
            if (t >= GAZE_FIRE_MS) { stage = 'rest'; t = 0; lane.remove(); }
        } else if (t >= GAZE_REST_MS) {
            return false;
        }
        return true;
    };
}

// The eye marks you with a dashed lane that follows you, locks it solid red
// and burns a beam down it. After the lock the lane no longer moves, so one
// sideways walk is enough. Several beams in a row, more in later phases.
export function _mechCyclopsGaze(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const { x: ex, y: ey } = _cycEyePos();
    const { eye, look } = _cycMakeEye(run, ex, ey);
    eye.classList.add('sx-cyc-eye-charge');
    let started = 0, step = null;
    _nkToast('eg_mech_cyclops_gaze', '👁 The Cyclops: Gaze Lock! Step out of the red lane!');
    _nkLoop(run, (dtS) => {
        if (!step) {
            if (started >= GAZE_BEAMS[p]) return false;
            started++;
            step = _gazeMakeBeam(run, ex, ey, p, level, look);
        }
        if (!step(dtS)) step = null;
        return true;
    });
}
