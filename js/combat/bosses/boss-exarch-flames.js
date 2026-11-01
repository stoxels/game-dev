import { _exaClamp, _exaPhase, _exaStrike } from './boss-exarch.js';
import { _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------EXARCH: CINDER LANES + SEARING TRAIL-----------------
//------------------------------------------------------------------------
// CINDER LANES: broad strips of the arena fill with red, then erupt in fire.
//   One lane is aimed at you; the others never leave less than ~170 px of
//   clear floor between them, so there is always somewhere to step.
// SEARING TRAIL (60%+): for a few seconds every spot you stand on ignites a
//   moment later. Keep moving and the flames only chase your footsteps.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CINDER LANES---------------------------------------------
//------------------------------------------------------------------------
const LANE_W = 130;                                // painted width = hit width
const LANE_GAP = 170;                              // clear floor between two lanes
const LANE_COUNT = [0, 3, 4, 4];                   // lanes per volley, by phase
const LANE_VOLLEYS = [0, 1, 2, 2];                 // volleys per cast (the next one turns 90 degrees)
const LANE_WARN_MS = [0, 1500, 1300, 1150];        // red fill time before the eruption
const LANE_BURN_MS = 450;                          // how long the eruption stays
const LANE_STEP_MS = 650;                          // pause between the burn of one volley and the next warning
const LANE_DMG = [0, 0.16, 0.19, 0.22];            // share of max life

// Lane centres along one axis: the first covers the player, the others are
// placed at random with a clear gap between any two lanes.
function _lanePositions(count, playerPos, size) {
    const lo = LANE_W / 2 + 40, hi = size - LANE_W / 2 - 40;
    const spots = [_exaClamp(playerPos, lo, hi)];
    for (let i = 1; i < count; i++) {
        for (let tries = 0; tries < 40; tries++) {
            const s = lo + Math.random() * Math.max(1, hi - lo);
            if (spots.every(o => Math.abs(o - s) >= LANE_W + LANE_GAP)) { spots.push(s); break; }
        }
    }
    return spots;
}

// Draws the lanes of one volley (vertical or horizontal strips) and returns them.
function _laneBuild(run, vertical, pc, p) {
    const W = window.innerWidth, H = window.innerHeight;
    const positions = _lanePositions(LANE_COUNT[p], vertical ? pc.x : pc.y, vertical ? W : H);
    return positions.map(pos => {
        const el = _nkEl(run, 'div', 'sx-exa-lane');
        el.style.setProperty('--exa-warn', LANE_WARN_MS[p] + 'ms');
        if (vertical) {
            el.style.left = Math.round(pos - LANE_W / 2) + 'px'; el.style.top = '0px';
            el.style.width = LANE_W + 'px'; el.style.height = H + 'px';
        } else {
            el.style.top = Math.round(pos - LANE_W / 2) + 'px'; el.style.left = '0px';
            el.style.height = LANE_W + 'px'; el.style.width = W + 'px';
        }
        return { el, rect: { left: vertical ? pos - LANE_W / 2 : 0, right: vertical ? pos + LANE_W / 2 : W,
            top: vertical ? 0 : pos - LANE_W / 2, bottom: vertical ? H : pos + LANE_W / 2 } };
    });
}

// Strips of the arena fill with red, then erupt in fire. One lane is on you;
// step into the clear floor between the lanes. Later phases fire a second
// volley turned 90 degrees.
export function _mechCinderLanes(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _exaPhase(phase);
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let vertical = Math.random() < 0.5, launched = 0, stage = 'idle', t = 0, lanes = [];
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (stage === 'idle') {
            if (launched >= LANE_VOLLEYS[p]) return false;
            if (t < (launched ? LANE_STEP_MS : 400)) return true;
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            lanes = _laneBuild(run, vertical, pc, p);
            launched++; stage = 'warn'; t = 0;
            return true;
        }
        if (stage === 'warn') {
            if (t < LANE_WARN_MS[p]) return true;
            const pr = _nkPlayerRect();
            const hit = lanes.some(l => _nkRectsOverlap(l.rect, pr));
            lanes.forEach(l => l.el.classList.add('sx-exa-lane-burn'));
            if (hit) _exaStrike(LANE_DMG[p], level, 'Cinder Lanes');
            stage = 'burn'; t = 0;
            return true;
        }
        if (t < LANE_BURN_MS) return true;
        lanes.forEach(l => { try { l.el.remove(); } catch (e) {} });
        vertical = !vertical;
        stage = 'idle'; t = 0;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SEARING TRAIL---------------------------------------------
//------------------------------------------------------------------------
const TRAIL_MS = [0, 0, 7500, 9000];               // how long the trail is laid, by phase
const TRAIL_DROP_MS = 260;                         // a new flame spot this often
const TRAIL_R = 62;                                // painted = hit radius
const TRAIL_FUSE_MS = [0, 0, 1400, 1200];          // time from laying a spot to its eruption
const TRAIL_BURN_MS = 450;
const TRAIL_DMG = [0, 0, 0.10, 0.12];              // share of max life
const TRAIL_HIT_CD_MS = 650;                       // shared, so a crowd of spots never stacks hits

// Every spot you stand on ignites a moment later: a ring fills with fire, then
// erupts. Keep moving - and do not walk back over your own footsteps.
export function _mechSearingTrail(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _exaPhase(phase);
    if (p < 2) return;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const spots = [];
    let e = 0, sinceDrop = TRAIL_DROP_MS;
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        e += dt; sinceDrop += dt;
        if (e < TRAIL_MS[p] && sinceDrop >= TRAIL_DROP_MS) {
            sinceDrop = 0;
            const pc = _nkPlayerCenter();
            if (pc) {
                const el = _nkEl(run, 'div', 'sx-exa-spot');
                el.style.left = Math.round(pc.x - TRAIL_R) + 'px';
                el.style.top = Math.round(pc.y - TRAIL_R) + 'px';
                el.style.setProperty('--exa-warn', TRAIL_FUSE_MS[p] + 'ms');
                spots.push({ x: pc.x, y: pc.y, el, t: 0, burning: false });
            }
        }
        for (let i = spots.length - 1; i >= 0; i--) {
            const s = spots[i];
            s.t += dt;
            if (!s.burning && s.t >= TRAIL_FUSE_MS[p]) {
                s.burning = true;
                s.el.classList.add('sx-exa-spot-burn');
                if (_nkCircleHit(s.x, s.y, TRAIL_R, _nkPlayerRect(), 0)) _exaStrike(TRAIL_DMG[p], level, 'Searing Trail', TRAIL_HIT_CD_MS);
            } else if (s.burning && s.t >= TRAIL_FUSE_MS[p] + TRAIL_BURN_MS) {
                try { s.el.remove(); } catch (er) {}
                spots.splice(i, 1);
            }
        }
        return e < TRAIL_MS[p] || spots.length > 0;
    });
}
