import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE COLOSSUS (boss_colossus)--------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Mountain That Walks": seismic strides that follow your
// spot (step out of each footprint's dashed shockwave circle), avalanche
// walls with a gap to slip through, boulder rain that shatters into rolling
// fragments, and granite golems that detonate unless you crumble them.
// TITAN'S FALL at ≤10%: walk into three joint seals (3 separate charges each)
// while rock chutes sweep, or face the CAVE-IN.
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow the Colossus' timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _COLO_DEBUG_SLOW = false;
export const _COLO_DEBUG_MULT = _COLO_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_colossus: {
        id: 'boss_colossus', name: 'The Colossus', emoji: '🗿',
        baseHP: 1140, baseDamage: 24, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_colossus: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Signature keeps the historic handler name (save-compat with
            // existing scheduled timers / debug docs): the old double-ring
            // slam is now the walking Stride inside it.
            { name: 'seismic_stride', intervalBase: 17000, intervalVariance: 4000, handler: '_mechSeismicSlam' },
            { name: 'corrupt_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_mechCorruptCells' },
            { name: 'avalanche', intervalBase: 21000, intervalVariance: 4500, handler: '_mechColoAvalanche' },
            { name: 'boulder_rain', intervalBase: 18000, intervalVariance: 4000, handler: '_mechColoBoulders', phase2Only: true },
            { name: 'granite_golems', intervalBase: 22000, intervalVariance: 4500, handler: '_mechColoGolems', phase2Only: true },
        ],
        onPhaseEnter: _coloOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const COLO_FOOT_DMG   = [0, 0.15, 0.17, 0.20]; // %maxHP footprint slam band
export const COLO_WAVE_DMG   = [0, 0.32, 0.36, 0.40]; // %maxHP for standing in the dashed circle at the slam
export const COLO_BOULDER_DMG = 0.16;                 // %maxHP boulder impact
export const COLO_FRAG_DMG   = 0.12;                  // %maxHP rolling fragment
export const COLO_GOLEM_DMG  = 0.06;                  // %maxHP golem shove (per ram)
export const COLO_GOLEM_BOOM_DMG = 0.30;              // %maxHP an uncrumbled golem's detonation
export const COLO_AVALANCHE_DMG = [0, 0.26, 0.30, 0.34]; // %maxHP touching an avalanche wall
export const COLO_CHUTE_DMG  = [0, 0, 0.10, 0.12];    // %maxHP rock chute (finale)
export const COLO_SEAL_HITS  = 3;                     // body-checks per joint seal
export const COLO_CHARGE_DMG = 0.22;                  // %maxHP failing a seal wave
export const COLO_CAVEIN_DMG = 0.35;                  // %maxHP the CAVE-IN
export const COLO_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Colossus hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _coloHitCd = 0;
export function _coloTouch(pct, level, label, force) {
    const now = performance.now();
    if (!force && now < _coloHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _coloHitCd = now + COLO_HIT_CD_MS;
    const dealt = _nkHit(pct, null, level);
    _nkAbilityHitToast(dealt, 'The Colossus', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _coloPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Rock chip burst at a spot (visual only).
export function _coloRubble(run, x, y, big) {
    for (let i = 0; i < (big ? 6 : 3); i++) {
        const el = _nkEl(run, 'div', 'sx-colo-chip');
        el.style.left = Math.round(x + (Math.random() * 40 - 20)) + 'px';
        el.style.top = Math.round(y + (Math.random() * 24 - 12)) + 'px';
        el.style.animationDelay = (i * 45) + 'ms';
        setTimeout(() => { try { el.remove(); } catch (e) {} }, _COLO_DEBUG_SLOW ? 2200 : 900);
    }
}

// Screen shake: quick translate jitter on the body (finale slump feedback).
export function _coloShake(intensity) {
    const body = document.body;
    const frames = 12;
    let i = 0;
    const step = () => {
        if (i >= frames) { body.style.transform = ''; return; }
        const a = intensity * (1 - i / frames);
        body.style.transform = 'translate(' + (Math.random() * 8 - 4) * a + 'px,' + (Math.random() * 8 - 4) * a + 'px)';
        i++;
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SEISMIC STRIDE (all fight)-----------------
//------------------------------------------------------------------------
// The Colossus walks THROUGH your spot. Footprints slam in sequence and
// EACH ONE re-aims at where you stand the moment it is raised, so running in
// a straight line gets you stepped on. Each footprint shows its shockwave
// reach as a dashed circle during the telegraph; the slam bites the footprint
// and a shockwave rolls out to that circle. Step out of the circle. More
// footprints (and shorter telegraphs) per stride as the fight goes on.
export const COLO_STRIDE_STEPS = [0, 2, 3, 4]; // footprints per stride, by phase
export const COLO_FOOT_WARN_MS = 1250;   // first footprint telegraph
const COLO_FOOT_WARN_STEP = 0.8;          // each later footprint's telegraph is this much shorter than the last (floor 0.55)
export const COLO_WAVE_SPEED = 520;      // px/s shockwave expansion (divided by mult)
export const COLO_WAVE_MAX_FRAC = 0.75;  // (legacy) old screen-wide reach - waves now stop at COLO_WAVE_R
const COLO_WAVE_R = 270;                  // px shockwave reach (the dashed circle)

export function _mechSeismicSlam(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    // Each footprint picks its spot only when it is raised (so it lands on
    // wherever you have moved to), with a little scatter.
    const clampX = (x) => Math.max(90, Math.min(W - 90, x));
    const clampY = (y) => Math.max(80, Math.min(H - 80, y));
    const feet = [];
    for (let i = 0; i < COLO_STRIDE_STEPS[p]; i++) {
        feet.push({
            x: 0, y: 0, state: 'wait', t: 0, warned: null, zone: null, slamEl: null, waveEl: null, r: 40,
            warnMs: COLO_FOOT_WARN_MS * Math.max(0.55, Math.pow(COLO_FOOT_WARN_STEP, i)),
        });
    }
    _nkToast('eg_mech_quake', '🗿 SEISMIC STRIDE - every footfall lands where you stand. Keep moving out of the dashed circle!', '#d6c8a8');

    // ONE loop drives all feet (each footprint's lifecycle is a state).
    _nkLoop(run, (dtS, now) => {
        const pr = _nkPlayerRect();
        const pc = _coloPC();
        let pending = false;
        feet.forEach((ft, idx) => {
            // Start the next foot only after the previous one slammed.
            if (ft.state === 'wait') {
                if (idx === 0 || feet[idx - 1].state === 'wave' || feet[idx - 1].state === 'done') {
                    ft.state = 'warn';
                    ft.t = 0;
                    ft.x = clampX(pc.x + (Math.random() * 90 - 45));
                    ft.y = clampY(pc.y + (Math.random() * 60 - 30));
                    ft.zone = _nkEl(run, 'div', 'sx-colo-quake-zone');
                    ft.zone.style.left = Math.round(ft.x - COLO_WAVE_R) + 'px';
                    ft.zone.style.top = Math.round(ft.y - COLO_WAVE_R) + 'px';
                    ft.zone.style.width = ft.zone.style.height = (COLO_WAVE_R * 2) + 'px';
                    ft.warned = _nkEl(run, 'div', 'sx-colo-foot-warn');
                    ft.warned.style.left = Math.round(ft.x - 78) + 'px';
                    ft.warned.style.top = Math.round(ft.y - 52) + 'px';
                }
                pending = true;
                return;
            }
            if (ft.state === 'warn') {
                pending = true;
                ft.t += dtS * 1000;
                if (ft.t >= ft.warnMs * _COLO_DEBUG_MULT) {
                    // SLAM.
                    try { ft.warned.remove(); } catch (e) {}
                    ft.zone.classList.add('sx-colo-quake-live');
                    ft.slamEl = _nkEl(run, 'div', 'sx-colo-foot-slam');
                    ft.slamEl.style.left = Math.round(ft.x - 78) + 'px';
                    ft.slamEl.style.top = Math.round(ft.y - 52) + 'px';
                    _coloRubble(run, ft.x, ft.y, true);
                    _coloShake(1);
                    // Anyone still inside the dashed circle at the slam is
                    // punished at once (one heavy hit, +footfall bonus when
                    // standing right under the foot). The expanding ring is
                    // then purely visual.
                    const dFoot = Math.hypot(pc.x - ft.x, pc.y - ft.y);
                    if (pr && dFoot < COLO_WAVE_R) {
                        const pct = COLO_WAVE_DMG[p] + (dFoot < 88 ? COLO_FOOT_DMG[p] : 0);
                        _coloTouch(pct, level, dFoot < 88 ? 'Footfall' : 'Shockwave', true);
                        ft.hit = true;
                    }
                    ft.waveEl = _nkEl(run, 'div', 'sx-nk-ring sx-colo-wave');
                    ft.state = 'wave';
                    ft.t = 0;
                }
                return;
            }
            if (ft.state === 'wave') {
                pending = true;
                ft.t += dtS;
                const spd = COLO_WAVE_SPEED / _COLO_DEBUG_MULT;
                ft.r = Math.min(COLO_WAVE_R, 40 + spd * ft.t);
                ft.waveEl.style.left = Math.round(ft.x - ft.r) + 'px';
                ft.waveEl.style.top = Math.round(ft.y - ft.r) + 'px';
                ft.waveEl.style.width = Math.round(ft.r * 2) + 'px';
                ft.waveEl.style.height = Math.round(ft.r * 2) + 'px';
                // Safety net for a player who stepped INTO the circle after
                // the slam: the ring front still bites once.
                if (!ft.hit && pr && Math.abs(Math.hypot(pc.x - ft.x, pc.y - ft.y) - ft.r) < 26) {
                    ft.hit = true;
                    _coloTouch(COLO_WAVE_DMG[p] * 0.6, level, 'Shockwave');
                }
                if (ft.r >= COLO_WAVE_R) {
                    try { ft.slamEl.remove(); } catch (e) {}
                    try { ft.waveEl.remove(); } catch (e) {}
                    try { ft.zone.remove(); } catch (e) {}
                    ft.state = 'done';
                }
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: BOULDER RAIN (60%)----------------------------
//------------------------------------------------------------------------
// The shoulder quarries hurl boulders. Each one casts a landing shadow
// (the impact ring) while it falls, then SHATTERS into rolling fragments
// that keep travelling outward. Every other boulder is aimed at where you
// stand right now, the rest are scattered, and several are in the air at
// once - dodge the impact rings AND the crossing fragment lanes.
export const BOULDER_COUNT   = [0, 0, 7, 9];
export const BOULDER_FALL_MS = 1300;   // telegraph (shadow) before impact
export const BOULDER_FRAGS   = 6;      // rolling fragments per boulder
const BOULDER_R = 86;                  // px impact radius (= the shadow)
const BOULDER_GAP_S = [0, 0, 0.8, 0.6]; // s between boulder launches, by phase
const FRAG_SPEED = 250;                // px/s rolling fragment speed
const FRAG_REACH = 420;                // px a fragment rolls before it vanishes

export function _mechColoBoulders(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_colo_boulder', '🗿🪨 BOULDER RAIN - boulders drop on YOUR position! Leave the shadows, then dodge the rolling rubble!', '#d6c8a8');

    // ONE loop owns every boulder and every fragment.
    const boulders = [];
    let launched = 0, launchedAt = 0;
    const launchGap = BOULDER_GAP_S[p]; // s between boulder launches

    _nkLoop(run, (dtS, now) => {
        // Launch the next boulder (even-numbered ones aim at you).
        if (launched < BOULDER_COUNT[p] && (launched === 0 || launchedAt >= launchGap)) {
            const pcA = _coloPC();
            const aimed = launched % 2 === 0;
            const tx = aimed ? Math.max(60, Math.min(W - 60, pcA.x + (Math.random() * 60 - 30))) : W * (0.1 + Math.random() * 0.8);
            const ty = aimed ? Math.max(60, Math.min(H - 60, pcA.y + (Math.random() * 60 - 30))) : H * (0.12 + Math.random() * 0.76);
            launched++; launchedAt = 0;
            const mark = _nkEl(run, 'div', 'sx-colo-boulder-mark');
            mark.style.left = Math.round(tx - BOULDER_R) + 'px';
            mark.style.top = Math.round(ty - BOULDER_R) + 'px';
            mark.style.width = mark.style.height = (BOULDER_R * 2) + 'px';
            const el = _nkEl(run, 'div', 'sx-colo-boulder');
            el.style.left = Math.round(tx - 26) + 'px';
            el.style.top = Math.round(-70) + 'px';
            boulders.push({ x: tx, y: ty, el, mark, state: 'fall', t: 0 });
        }
        launchedAt += dtS;

        const pr = _nkPlayerRect();
        const pc = _coloPC();
        let active = 0;
        for (const b of boulders) {
            if (b.state === 'fall') {
                active++;
                b.t += dtS * 1000;
                const f = Math.min(1, b.t / (BOULDER_FALL_MS * _COLO_DEBUG_MULT));
                const ease = f * f;
                b.el.style.top = Math.round(-70 + (b.y - 26 + 70) * ease) + 'px';
                b.el.style.transform = 'rotate(' + Math.round(b.t * 0.4) + 'deg)';
                b.mark.style.setProperty('--fall', f.toFixed(3));
                if (f >= 1) {
                    // IMPACT: shatter into rolling fragments.
                    try { b.el.remove(); } catch (e) {}
                    try { b.mark.remove(); } catch (e) {}
                    _coloRubble(run, b.x, b.y, true);
                    _coloShake(0.7);
                    if (pr && Math.hypot(pc.x - b.x, pc.y - b.y) < BOULDER_R) {
                        _coloTouch(COLO_BOULDER_DMG, level, 'Boulder');
                    }
                    b.frags = [];
                    for (let k = 0; k < BOULDER_FRAGS; k++) {
                        const ang = (k / BOULDER_FRAGS) * Math.PI * 2 + Math.random() * 0.5;
                        const fel = _nkEl(run, 'div', 'sx-colo-frag');
                        fel.style.left = Math.round(b.x - 9) + 'px';
                        fel.style.top = Math.round(b.y - 9) + 'px';
                        b.frags.push({ ang, dist: 0, el: fel, hit: false });
                    }
                    b.state = 'frags';
                    b.t = 0;
                }
            } else if (b.state === 'frags') {
                active++;
                b.t += dtS;
                const rollSpd = FRAG_SPEED / _COLO_DEBUG_MULT;
                let anyAlive = false;
                for (const fr of b.frags) {
                    if (fr.dist >= FRAG_REACH) { try { fr.el.remove(); } catch (e) {} continue; }
                    anyAlive = true;
                    fr.dist += rollSpd * dtS;
                    const fx = b.x + Math.cos(fr.ang) * fr.dist;
                    const fy = b.y + Math.sin(fr.ang) * fr.dist;
                    fr.el.style.left = Math.round(fx - 9) + 'px';
                    fr.el.style.top = Math.round(fy - 9) + 'px';
                    if (pr && !fr.hit && Math.hypot(pc.x - fx, pc.y - fy) < 30) {
                        fr.hit = true;
                        _coloTouch(COLO_FRAG_DMG, level, 'Rubble Roll');
                    }
                }
                if (!anyAlive) b.state = 'done';
            }
        }
        return active > 0;
    });
}


//------------------------------------------------------------------------
//-------------------AVALANCHE (all fight)---------------------------------
//------------------------------------------------------------------------
// A wall of rolling boulders thunders across the whole arena from one edge.
// A green lane shows the one GAP in the wall before it starts - get into the
// lane and let the wall roll over the gap. Later in the fight the walls come
// back to back from alternating sides (left/right, then top/bottom), so you
// have to be moving to the next gap while the last wall is still rolling.
export const AVALANCHE_WALLS = [0, 1, 2, 3];   // walls per cast, by phase
const AVAL_WARN_MS = 1600;                      // lane telegraph before a wall starts rolling
const AVAL_SPEED = 600;                         // px/s the wall rolls (divided by mult)
const AVAL_GAP_PX = [0, 200, 170, 150];         // width of the gap, by phase
const AVAL_THICK = 72;                          // px depth of the wall
const AVAL_STAGGER_S = 2.0;                     // s between one wall's telegraph and the next
const AVAL_AXES = ['x', 'y', 'x'];              // wall n travels along this axis ('x' = left/right)

// Picks where a wall's gap sits along its length, preferring a spot away from
// the player's current position so they have to move.
function _coloAvalGapCentre(len, gapPx, playerCoord) {
    let best = len / 2;
    for (let tries = 0; tries < 6; tries++) {
        const c = gapPx / 2 + 50 + Math.random() * (len - gapPx - 100);
        best = c;
        if (Math.abs(c - playerCoord) > gapPx + 40) break;
    }
    return best;
}

// Sets a box's position and size in pixels.
function _coloBox(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    el.style.width = Math.round(w) + 'px';
    el.style.height = Math.round(h) + 'px';
}

// Builds one wall: the green gap lane, the two wall pieces either side of the
// gap, and its telegraph state.
function _coloAvalMake(run, n, p, W, H, pc) {
    const horiz = AVAL_AXES[n % AVAL_AXES.length] === 'x';
    const len = horiz ? H : W;
    const gap = AVAL_GAP_PX[p];
    const gc = _coloAvalGapCentre(len, gap, horiz ? pc.y : pc.x);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = _nkEl(run, 'div', 'sx-colo-aval-lane');
    const a = _nkEl(run, 'div', 'sx-colo-aval-wall');
    const b = _nkEl(run, 'div', 'sx-colo-aval-wall');
    const span = horiz ? W : H;
    if (horiz) _coloBox(lane, 0, gc - gap / 2, W, gap);
    else _coloBox(lane, gc - gap / 2, 0, gap, H);
    return { horiz, len, span, gap, gc, dir, lane, a, b, state: 'warn', t: 0, pos: 0, hit: false };
}

// Moves a wall's two pieces to its current rolling position.
function _coloAvalPlace(w) {
    const x = w.pos - AVAL_THICK / 2;
    const gTop = w.gc - w.gap / 2, gBot = w.gc + w.gap / 2;
    if (w.horiz) {
        _coloBox(w.a, x, 0, AVAL_THICK, gTop);
        _coloBox(w.b, x, gBot, AVAL_THICK, w.len - gBot);
    } else {
        _coloBox(w.a, 0, x, gTop, AVAL_THICK);
        _coloBox(w.b, gBot, x, w.len - gBot, AVAL_THICK);
    }
}

// Removes a finished wall's elements.
function _coloAvalClear(w) {
    [w.lane, w.a, w.b].forEach(el => { try { el.remove(); } catch (e) {} });
    w.state = 'done';
}

export function _mechColoAvalanche(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_colo_avalanche', '🗿🪨 AVALANCHE - a wall of boulders is coming! Stand in the GREEN lane to slip through the gap!', '#d6c8a8');

    const walls = [];
    let clock = 0;
    _nkLoop(run, (dtS, now) => {
        clock += dtS;
        // Start the next wall's telegraph on its schedule (it reads where you stand NOW).
        if (walls.length < AVALANCHE_WALLS[p] && clock >= walls.length * AVAL_STAGGER_S) {
            walls.push(_coloAvalMake(run, walls.length, p, W, H, _coloPC()));
        }
        const pr = _nkPlayerRect();
        const pc = _coloPC();
        let busy = walls.length < AVALANCHE_WALLS[p];
        for (const w of walls) {
            if (w.state === 'done') continue;
            busy = true;
            if (w.state === 'warn') {
                w.t += dtS * 1000;
                if (w.t >= AVAL_WARN_MS * _COLO_DEBUG_MULT) {
                    w.state = 'roll';
                    w.pos = w.dir > 0 ? -AVAL_THICK : w.span + AVAL_THICK;
                    w.lane.classList.add('sx-colo-aval-lane-live');
                    _coloShake(0.8);
                } else {
                    // Telegraph: the lane plus a pulsing wall outline at the start edge.
                    w.pos = w.dir > 0 ? AVAL_THICK / 2 : w.span - AVAL_THICK / 2;
                    w.a.classList.add('sx-colo-aval-wall-warn');
                    w.b.classList.add('sx-colo-aval-wall-warn');
                    _coloAvalPlace(w);
                    continue;
                }
                w.a.classList.remove('sx-colo-aval-wall-warn');
                w.b.classList.remove('sx-colo-aval-wall-warn');
            }
            w.pos += w.dir * (AVAL_SPEED / _COLO_DEBUG_MULT) * dtS;
            _coloAvalPlace(w);
            // The wall hurts once, unless you are inside its gap as it passes.
            if (pr && !w.hit) {
                const along = w.horiz ? pc.x : pc.y;
                const across = w.horiz ? pc.y : pc.x;
                if (Math.abs(along - w.pos) < AVAL_THICK / 2 + 12 && Math.abs(across - w.gc) > w.gap / 2 - 8) {
                    w.hit = true;
                    _coloTouch(COLO_AVALANCHE_DMG[p], level, 'Avalanche', true);
                    _coloRubble(run, pc.x, pc.y, true);
                }
            }
            if ((w.dir > 0 && w.pos > w.span + AVAL_THICK) || (w.dir < 0 && w.pos < -AVAL_THICK)) _coloAvalClear(w);
        }
        return busy;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: GRANITE GOLEMS (60%)--------------------------
//------------------------------------------------------------------------
// Granite golems climb out of cracks and march toward the player. Ram one 3×
// (walk into it - every ram shoves you back and costs a small hit) to crumble
// it safely. A golem that is still standing after ~7s turns red, primes for
// 1.5s with its blast ring shown, then DETONATES for a big hit on anyone
// inside the ring. Ramming a primed golem still defuses it.
export const GOLEM_COUNT     = [0, 0, 2, 3];
export const GOLEM_SPEED     = 78;      // px/s march (divided by mult)
export const GOLEM_HITS      = 3;
export const GOLEM_LIFE_MS   = 7000;    // march time before the golem primes
const GOLEM_FUSE_MS   = 1500;           // priming time (blast ring shown) before it detonates
const GOLEM_BOOM_R    = 150;            // px detonation radius
const GOLEM_RAM_CD_MS = 1200;           // per-golem: one ram (crack + shove + hit) per this
const GOLEM_SHOVE_PX  = 70;             // shove-back on a ram
const GOLEM_RAM_DIST  = 62;             // px between centres that counts as a ram
const GOLEM_STOP_DIST = 48;             // px the golem stops short of your centre

// Builds one golem's body: head, shoulders, glowing core, two fists.
function _coloGolemBody(run) {
    const el = _nkEl(run, 'div', 'sx-colo-golem');
    el.innerHTML = '<i class="sx-colo-golem-head"><b></b></i><i class="sx-colo-golem-arm sx-colo-golem-arm-l"></i>' +
        '<i class="sx-colo-golem-arm sx-colo-golem-arm-r"></i><i class="sx-colo-golem-core"></i><i class="sx-colo-golem-ground"></i>';
    return el;
}

// Marks a golem as primed: red body plus the dashed blast ring it will fill.
function _coloGolemPrime(run, g) {
    g.primed = true;
    g.fuse = 0;
    g.el.classList.add('sx-colo-golem-primed');
    g.boom = _nkEl(run, 'div', 'sx-colo-golem-boom');
    g.boom.style.width = g.boom.style.height = (GOLEM_BOOM_R * 2) + 'px';
}

// Removes a golem for good (crumbled, or after its blast).
function _coloGolemRemove(g) {
    g.dead = true;
    try { g.el.remove(); } catch (e) {}
    if (g.boom) { try { g.boom.remove(); } catch (e) {} }
}

export function _mechColoGolems(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_colo_golem', '🗿🧱 GRANITE GOLEMS - walk into each one 3 times to crumble it, or it EXPLODES!', '#a8a29e');
    const count = GOLEM_COUNT[Math.max(2, Math.min(3, Number(phase) || 2))];
    const golems = [];
    for (let i = 0; i < count; i++) {
        const el = _coloGolemBody(run);
        const gx = i === 2 ? W * 0.5 : W * (i === 0 ? 0.14 : 0.86);
        const gy = i === 2 ? H * 0.12 : H * (0.2 + Math.random() * 0.5);
        el.style.left = Math.round(gx - 42) + 'px';
        el.style.top = Math.round(gy - 42) + 'px';
        golems.push({ x: gx, y: gy, el, hp: GOLEM_HITS, dead: false, born: 0, ramCd: 0, primed: false, fuse: 0, boom: null });
    }
    _nkLoop(run, (dtS, now) => {
        const pr = _nkPlayerRect();
        const pc = _coloPC();
        let active = false;
        for (const g of golems) {
            if (g.dead) continue;
            active = true;
            g.born += dtS * 1000;
            const dx = pc.x - g.x, dy = pc.y - g.y;
            const d = Math.hypot(dx, dy) || 1;
            // March toward the player (a primed golem plants its feet).
            if (!g.primed) {
                const spd = GOLEM_SPEED / _COLO_DEBUG_MULT;
                const step = Math.min(Math.max(0, d - GOLEM_STOP_DIST), spd * dtS);
                g.x += (dx / d) * step;
                g.y += (dy / d) * step;
                g.el.style.left = Math.round(g.x - 42) + 'px';
                g.el.style.top = Math.round(g.y - 42) + 'px';
            }
            // Contact = a ram: crack the golem, shove you back, small hit.
            if (pr && d < GOLEM_RAM_DIST && now >= g.ramCd) {
                g.ramCd = now + GOLEM_RAM_CD_MS;
                g.hp--;
                g.el.classList.remove('sx-colo-golem-crack1', 'sx-colo-golem-crack2');
                if (g.hp === 2) g.el.classList.add('sx-colo-golem-crack1');
                if (g.hp === 1) g.el.classList.add('sx-colo-golem-crack2');
                _coloRubble(run, g.x, g.y, false);
                _nkNudgeAvatar((dx / d) * GOLEM_SHOVE_PX, (dy / d) * GOLEM_SHOVE_PX);
                _coloTouch(COLO_GOLEM_DMG, level, 'Golem Shove');
                if (g.hp <= 0) {
                    _coloRubble(run, g.x, g.y, true);
                    _coloGolemRemove(g);
                    _nkToast('eg_mech_colo_golem_down', '🧱 Golem crumbled!', '#4ade80');
                    continue;
                }
            }
            if (!g.primed && g.born >= GOLEM_LIFE_MS * _COLO_DEBUG_MULT) {
                _coloGolemPrime(run, g);
                g.boom.style.left = Math.round(g.x - GOLEM_BOOM_R) + 'px';
                g.boom.style.top = Math.round(g.y - GOLEM_BOOM_R) + 'px';
            } else if (g.primed) {
                g.fuse += dtS * 1000;
                if (g.fuse >= GOLEM_FUSE_MS * _COLO_DEBUG_MULT) {
                    // DETONATION: everyone inside the ring eats it.
                    _coloRubble(run, g.x, g.y, true);
                    _coloShake(1.2);
                    if (pr && Math.hypot(pc.x - g.x, pc.y - g.y) < GOLEM_BOOM_R) {
                        _coloTouch(COLO_GOLEM_BOOM_DMG, level, 'Golem Blast', true);
                    }
                    _coloGolemRemove(g);
                }
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: TITAN'S FALL (≤10%, one-shot)-----------------
//------------------------------------------------------------------------
// The Colossus kneels. Three JOINT SEALS (shoulder, knee, chest) light up
// one at a time; walk into the lit seal 3 times - each ram counts when you walk
// in from outside, so step back out between rams - while falling-rock chutes
// (telegraphed lanes) sweep the arena. Break a seal → the titan slumps.
// All three → collapse for good. A seal that runs out of time collapses on
// you (22%); the third one brings the CAVE-IN: 3-2-1, then dust everywhere
// except the glowing ring around that seal (35% outside it).
// Charge bar frozen for the whole set-piece (gate in _tickPlayer via
// _coloFinalActive).
export const COLO_FINALE_SEAL_MS   = 20000;  // ms budget per seal (incl. chutes)
export const COLO_CHUTE_PERIOD_MS  = 1900;   // a chute lane every ~1.9s
export const COLO_CHUTE_WARN_MS    = 1100;   // lane telegraph before rocks

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _coloFinal = null;

export function _coloFinalActive() {
    return !!_coloFinal && !_coloFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _coloOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _coloStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _coloStartFinalWatcher(monster) {
    if (!monster || _coloFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_coloFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _coloFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _coloAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_coloFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _coloFinalStart(monster) {
    if (_coloFinal || !monster) return;

    // The mountain goes quiet: kill every other run of this boss (the
    // finale owns the arena).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth || document.documentElement.clientWidth || 1280;
    const H = window.innerHeight || document.documentElement.clientHeight || 720;
    const g = {
        monsterId: monster.id,
        finished: false,
        stage: 'seals',            // seals → done
        seal: 0,                   // 0..2, which seal is lit
        fxRun: null, overlay: null, sealEls: [],
    };
    _coloFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'sx-colo-cd';
    ov.innerHTML =
        '<div class="sx-colo-cd-label">🗿 TITAN\u2019S FALL</div>' +
        '<div class="sx-colo-cd-hint">WALK into the glowing seal, step back out, then walk into it again - 3 times!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_colo_final_cd', '🗿💀 TITAN\u2019S FALL - walk into the glowing seal, back away, repeat 3 times! Dodge the rock chutes!', '#d6c8a8');
    const hintEl = ov.querySelector('.sx-colo-cd-hint');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the kneeling titan while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-colo-kneeling');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;

    // Joint seal positions: shoulder / knee / chest, spread over the arena.
    const sealSpots = [
        { fx: 0.26, fy: 0.30 },   // shoulder
        { fx: 0.72, fy: 0.66 },   // knee
        { fx: 0.50, fy: 0.48 },   // chest
    ];
    g.sealEls = sealSpots.map(s => {
        const el = document.createElement('div');
        el.className = 'sx-colo-seal';
        el.innerHTML = '<span class="sx-colo-seal-n"></span><span class="sx-colo-seal-cap">WALK INTO IT</span>';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return { el, fx: s.fx, fy: s.fy, x: 0, y: 0, hp: COLO_SEAL_HITS };
    });
    // Seal spots follow the LIVE window size (a 0-width read at launch or a
    // resize mid-fight must never strand a seal off-screen).
    const placeSeals = () => {
        const w = window.innerWidth || document.documentElement.clientWidth || 1280;
        const h = window.innerHeight || document.documentElement.clientHeight || 720;
        g.sealEls.forEach(s => {
            s.x = w * s.fx; s.y = h * s.fy;
            s.el.style.left = Math.round(s.x - 46) + 'px';
            s.el.style.top = Math.round(s.y - 46) + 'px';
        });
    };
    placeSeals();

    // ONE finale loop: lights each seal in turn, runs the body-check crack
    // clock, sweeps rock chutes, and judges the seal (break or CAVE-IN).
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        if (g.caveIn) return true;   // the CAVE-IN countdown owns the arena
        const pr = _nkPlayerRect();
        const pc = _coloPC();
        placeSeals();
        const seal = g.sealEls[g.seal];
        if (!seal) return false;

        // ── Chutes: a telegraphed lane, then rocks rain along it. ──
        g.chuteAcc = (g.chuteAcc || 0) + dtS * 1000;
        if (g.chuteAcc >= COLO_CHUTE_PERIOD_MS * _COLO_DEBUG_MULT) {
            g.chuteAcc = 0;
            // Lane: random vertical or horizontal strip through the arena.
            const vertical = Math.random() < 0.5;
            const lanePos = vertical
                ? W * (0.1 + Math.random() * 0.8)
                : H * (0.1 + Math.random() * 0.8);
            const warn = _nkEl(g.fxRun, 'div', 'sx-colo-chute-warn');
            if (vertical) {
                warn.style.left = Math.round(lanePos - 44) + 'px';
                warn.style.top = '0px';
                warn.style.width = '88px';
                warn.style.height = H + 'px';
            } else {
                warn.style.left = '0px';
                warn.style.top = Math.round(lanePos - 44) + 'px';
                warn.style.width = W + 'px';
                warn.style.height = '88px';
            }
            _coloAfter(g, COLO_CHUTE_WARN_MS * _COLO_DEBUG_MULT, () => {
                if (g.finished) return;
                try { warn.remove(); } catch (e) {}
                const rocks = _nkEl(g.fxRun, 'div', 'sx-colo-chute');
                if (vertical) {
                    rocks.style.left = Math.round(lanePos - 44) + 'px';
                    rocks.style.top = '0px';
                    rocks.style.width = '88px';
                    rocks.style.height = H + 'px';
                } else {
                    rocks.style.left = '0px';
                    rocks.style.top = Math.round(lanePos - 44) + 'px';
                    rocks.style.width = W + 'px';
                    rocks.style.height = '88px';
                }
                // The lane bites while the rocks fall (with the touch cd).
                g.activeChutes = g.activeChutes || [];
                g.activeChutes.push({ vertical, lanePos, el: rocks, until: performance.now() + 1400 * _COLO_DEBUG_MULT, level });
            });
        }
        // Tick active chutes: contact damage + expiry.
        (g.activeChutes || []).forEach(ch => {
            if (performance.now() > ch.until) { try { ch.el.remove(); } catch (e) {} ch.done = true; return; }
            if (pr) {
                const inLane = ch.vertical
                    ? Math.abs(pc.x - ch.lanePos) < 52
                    : Math.abs(pc.y - ch.lanePos) < 52;
                if (inLane) _coloTouch(COLO_CHUTE_DMG[3], ch.level, 'Rock Chute');
            }
        });
        g.activeChutes = (g.activeChutes || []).filter(ch => !ch.done);

        // ── Seal ram (Frostwright monolith crack pattern): a ram counts when you
        // charge in from outside - standing on the seal does nothing.
        const dSeal = Math.hypot(pc.x - seal.x, pc.y - seal.y);
        if (dSeal > 95) g.armed = true;
        if (pr && g.armed && dSeal < 58) {
            g.armed = false;
            seal.hp--;
            seal.el.classList.remove('sx-colo-seal-crack1', 'sx-colo-seal-crack2');
            if (seal.hp === 2) seal.el.classList.add('sx-colo-seal-crack1');
            if (seal.hp === 1) seal.el.classList.add('sx-colo-seal-crack2');
            _coloRubble(g.fxRun, seal.x, seal.y, false);
            if (seal.hp <= 0) {
                seal.el.classList.add('sx-colo-seal-broken');
                _coloRubble(g.fxRun, seal.x, seal.y, true);
                _coloShake(1.4);
                g.seal++;
                if (g.seal >= g.sealEls.length) {
                    // All three seals broken: the titan collapses.
                    _coloFinalEnd(g, monster, true);
                    return false;
                }
                _nkToast('eg_mech_colo_seal_down', '🗿 SEAL BROKEN - the titan slumps! Next seal lit!', '#4ade80');
                g.sealTimer = 0;
                g.armed = false;
                return true;
            }
        }

        // ── Seal budget: fail → punish + next seal. The THIRD expired seal
        // answers with a CAVE-IN (design doc): dust wipes the arena except
        // the ring around the last seal, 35% if you're outside it - the
        // finale fails and the fight resumes.
        g.sealTimer = (g.sealTimer || 0) + dtS * 1000;
        if (g.sealTimer >= COLO_FINALE_SEAL_MS * _COLO_DEBUG_MULT) {
            g.sealTimer = 0;
            const dealt = _nkHit(COLO_CHARGE_DMG, null, level);
            _nkAbilityHitToast(dealt, 'The Colossus', 'Seal Collapse');
            g.seal++;
            g.armed = false;
            if (g.seal >= g.sealEls.length) {
                _coloCaveIn(g, seal, level, monster);
                return true;
            }
            _nkToast('eg_mech_colo_seal_fail', '🗿 The seal collapsed on its own - next seal lit!', '#f59e0b');
        }

        // Seal countdown in the banner.
        if (hintEl) {
            const left = Math.max(0, Math.ceil((COLO_FINALE_SEAL_MS * _COLO_DEBUG_MULT - g.sealTimer) / 1000));
            const step = g.armed ? 'WALK into the glowing seal' : 'step AWAY from it, then walk back in';
            hintEl.textContent = 'Seal ' + (g.seal + 1) + '/3 - ' + step + ' (' + Math.max(0, seal.hp) + ' more) - ' + left + 's left';
        }
        // Keep the lit-seal visuals honest.
        g.sealEls.forEach((s, i) => {
            s.el.classList.toggle('sx-colo-seal-lit', i === g.seal);
            const n = s.el.querySelector('.sx-colo-seal-n');
            if (n) n.textContent = i < g.seal ? '✓' : (i > g.seal ? '🔒' : (g.armed ? String(Math.max(0, s.hp)) : '↺'));
            s.el.classList.toggle('sx-colo-seal-await', i === g.seal && !g.armed);
        });
        return true;
    });
}

// CAVE-IN: the failed finale's punish - a 3-2-1 with a glowing safe ring
// around the last seal, then dust wipes the arena (35% outside the ring)
// and the fight resumes.
const COLO_CAVEIN_R = 120;
const COLO_CAVEIN_WARN_MS = 3000;
export function _coloCaveIn(g, seal, level, monster) {
    if (g.finished || g.caveIn) return;
    g.caveIn = true;
    const ring = document.createElement('div');
    ring.className = 'sx-colo-cavein-ring';
    ring.style.left = Math.round(seal.x - COLO_CAVEIN_R) + 'px';
    ring.style.top = Math.round(seal.y - COLO_CAVEIN_R) + 'px';
    ring.style.width = ring.style.height = (COLO_CAVEIN_R * 2) + 'px';
    ring.innerHTML = '<span class="sx-colo-cavein-count"></span>';
    document.body.appendChild(ring);
    (g.activeChutes || []).forEach(ch => { try { ch.el.remove(); } catch (e) {} });
    g.activeChutes = [];
    g.sealEls.forEach(s => s.el.classList.remove('sx-colo-seal-lit'));
    const hint = g.overlay && g.overlay.querySelector('.sx-colo-cd-hint');
    if (hint) hint.textContent = 'CAVE-IN - get into the glowing ring!';
    _nkToast('eg_mech_colo_cavein_warn', '🗿💀 CAVE-IN - get into the glowing ring!', '#f59e0b');
    const countEl = ring.querySelector('.sx-colo-cavein-count');
    const t0 = performance.now();
    const warnMs = COLO_CAVEIN_WARN_MS * _COLO_DEBUG_MULT;
    const tick = () => {
        if (g.finished) return;
        const left = warnMs - (performance.now() - t0);
        if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
        if (left > 0) { _coloAfter(g, 100, tick); return; }
        const dust = document.createElement('div');
        dust.className = 'sx-colo-cavein';
        dust.style.setProperty('--cx', Math.round(seal.x) + 'px');
        dust.style.setProperty('--cy', Math.round(seal.y) + 'px');
        document.body.appendChild(dust);
        setTimeout(() => { try { dust.remove(); } catch (e) {} }, _COLO_DEBUG_SLOW ? 4000 : 1600);
        _coloShake(2);
        const pc = _coloPC();
        if (Math.hypot(pc.x - seal.x, pc.y - seal.y) >= COLO_CAVEIN_R) {
            const dealt = _nkHit(COLO_CAVEIN_DMG, null, level);
            _nkAbilityHitToast(dealt, 'The Colossus', 'CAVE-IN');
        }
        _nkToast('eg_mech_colo_cavein', '🗿💀 CAVE-IN! The titan shrugs you off!', '#f59e0b');
        _coloFinalEnd(g, monster, false);
    };
    tick();
}

// Ends the finale: collapse (seals broken) - releases immunity + charge bar.
export function _coloFinalEnd(g, monster, collapsed) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    g.sealEls.forEach(s => { try { s.el.remove(); } catch (e) {} });
    document.querySelectorAll('.sx-colo-chute-warn, .sx-colo-chute, .sx-colo-cd, .sx-colo-cavein-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('sx-colo-kneeling');
        wrap.classList.remove('sx-nk-shielded');
    }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    if (collapsed) {
        _coloShake(2);
        if (typeof _nkToast === 'function') {
            _nkToast('eg_mech_colo_collapsed', '🗿💥 THE TITAN FALLS!', '#4ade80');
        }
    }
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _coloTeardown() {
    if (_coloFinal) { try { _coloFinalEnd(_coloFinal, null, false); } catch (e) {} _coloFinal = null; }
    document.querySelectorAll('.sx-colo-foot-warn, .sx-colo-foot-slam, .sx-colo-wave, .sx-colo-quake-zone, ' +
        '.sx-colo-boulder, .sx-colo-boulder-mark, .sx-colo-frag, .sx-colo-golem, .sx-colo-golem-boom, .sx-colo-chip, ' +
        '.sx-colo-aval-lane, .sx-colo-aval-wall, ' +
        '.sx-colo-seal, .sx-colo-chute-warn, .sx-colo-chute, .sx-colo-cd, .sx-colo-cavein, .sx-colo-cavein-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.sx-colo-kneeling').forEach(el => el.classList.remove('sx-colo-kneeling'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _COLO_DEBUG.fire('stride'|'boulders'|'golems'|'avalanche', phase) - runs one now
//   _COLO_DEBUG.final()                                   - TITAN'S FALL now
if (typeof window !== 'undefined') {
    window._COLO_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            const fn = name === 'stride' ? _mechSeismicSlam
                : name === 'boulders' ? _mechColoBoulders
                : name === 'golems' ? _mechColoGolems
                : name === 'avalanche' ? _mechColoAvalanche : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'stride' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            _coloFinalStart(monster);
            return 'TITAN\u2019S FALL started';
        },
    };
}
