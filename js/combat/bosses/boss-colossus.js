import { EG_BOSS_DEFS, EG_BOSS_MECHANICS } from './boss-framework.js';
import { _egNkAbilityHitToast, _egNkDodgeBusy, _egNkEl, _egNkFrozen, _egNkHit, _egNkKillRun, _egNkLoop, _egNkNewRun, _egNkNudgeAvatar, _egNkPlayerCenter, _egNkPlayerRect, _egNkRuns, _egNkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE COLOSSUS (boss_colossus)--------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Mountain That Walks": seismic strides that walk
// through your spot (step out of each footprint's dashed shockwave circle),
// boulder rain with landing shadows that shatters into rolling fragments,
// and rammable granite golems. TITAN'S FALL at ≤10%: ram three joint seals
// (3 separate charges each) while rock chutes sweep, or face the CAVE-IN.
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow the Colossus' timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _EG_COLO_DEBUG_SLOW = false;
export const _EG_COLO_DEBUG_MULT = _EG_COLO_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_colossus: {
        id: 'boss_colossus', name: 'The Colossus', emoji: '🗿',
        baseHP: 1140, baseDamage: 24, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
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
            { name: 'seismic_stride', intervalBase: 20000, intervalVariance: 4500, handler: '_egMechSeismicSlam' },
            { name: 'corrupt_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
            { name: 'boulder_rain', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechColoBoulders', phase2Only: true },
            { name: 'granite_golems', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechColoGolems', phase2Only: true },
        ],
        onPhaseEnter: _egColoOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const EG_COLO_FOOT_DMG   = [0, 0.15, 0.17, 0.20]; // %maxHP footprint slam band
export const EG_COLO_WAVE_DMG   = [0, 0.32, 0.36, 0.40]; // %maxHP for standing in the dashed circle at the slam
export const EG_COLO_BOULDER_DMG = 0.16;                 // %maxHP boulder impact
export const EG_COLO_FRAG_DMG   = 0.12;                  // %maxHP rolling fragment
export const EG_COLO_GOLEM_DMG  = 0.06;                  // %maxHP golem shove (per ram)
export const EG_COLO_CHUTE_DMG  = [0, 0, 0.10, 0.12];    // %maxHP rock chute (finale)
export const EG_COLO_SEAL_HITS  = 3;                     // body-checks per joint seal
export const EG_COLO_CHARGE_DMG = 0.22;                  // %maxHP failing a seal wave
export const EG_COLO_CAVEIN_DMG = 0.35;                  // %maxHP the CAVE-IN
export const EG_COLO_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Colossus hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _egColoHitCd = 0;
export function _egColoTouch(pct, level, label, force) {
    const now = performance.now();
    if (!force && now < _egColoHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egColoHitCd = now + EG_COLO_HIT_CD_MS;
    const dealt = _egNkHit(pct, null, level);
    _egNkAbilityHitToast(dealt, 'The Colossus', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _egColoPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Rock chip burst at a spot (visual only).
export function _egColoRubble(run, x, y, big) {
    for (let i = 0; i < (big ? 6 : 3); i++) {
        const el = _egNkEl(run, 'div', 'eg-colo-chip');
        el.style.left = Math.round(x + (Math.random() * 40 - 20)) + 'px';
        el.style.top = Math.round(y + (Math.random() * 24 - 12)) + 'px';
        el.style.animationDelay = (i * 45) + 'ms';
        setTimeout(() => { try { el.remove(); } catch (e) {} }, _EG_COLO_DEBUG_SLOW ? 2200 : 900);
    }
}

// Screen shake: quick translate jitter on the body (finale slump feedback).
export function _egColoShake(intensity) {
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
// The Colossus walks THROUGH your spot. Two footprints slam in sequence:
// the first lands near you, the second one stride further along. Each
// footprint shows its shockwave reach as a dashed circle during the
// telegraph; the slam bites the footprint and a shockwave rolls out to that
// circle. Step out of the circle. Phase 3: the stride runs diagonally.
export const EG_COLO_STRIDE_STEPS = 2;      // footprints per stride
export const EG_COLO_FOOT_WARN_MS = 1400;   // footprint telegraph
export const EG_COLO_WAVE_SPEED = 520;      // px/s shockwave expansion (divided by mult)
export const EG_COLO_WAVE_MAX_FRAC = 0.75;  // (legacy) old screen-wide reach - waves now stop at EG_COLO_WAVE_R
const EG_COLO_WAVE_R = 270;                  // px shockwave reach (the dashed circle)
const EG_COLO_STRIDE_LEN = 330;              // px between the two footprints

export function _egMechSeismicSlam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    // Footprint 1 lands near you; footprint 2 one stride further, toward the
    // side with more room (horizontal, or diagonal in phase 3).
    const pc0 = _egColoPC();
    const clampX = (x) => Math.max(90, Math.min(W - 90, x));
    const clampY = (y) => Math.max(80, Math.min(H - 80, y));
    const f1 = { x: clampX(pc0.x + (Math.random() * 120 - 60)), y: clampY(pc0.y + (Math.random() * 80 - 40)) };
    const sx = f1.x < W / 2 ? 1 : -1, sy = f1.y < H / 2 ? 1 : -1;
    const dir = p >= 3 ? [0.8 * sx, 0.6 * sy] : [sx, 0];
    const f2 = { x: clampX(f1.x + dir[0] * EG_COLO_STRIDE_LEN), y: clampY(f1.y + dir[1] * EG_COLO_STRIDE_LEN) };
    const feet = [f1, f2].slice(0, EG_COLO_STRIDE_STEPS).map(f => ({
        x: f.x, y: f.y, state: 'wait', t: 0, warned: null, zone: null, slamEl: null, waveEl: null, r: 40,
    }));
    _egNkToast('eg_mech_quake', '🗿 SEISMIC STRIDE - get OUT of the dashed circle before each footfall!', '#d6c8a8');

    // ONE loop drives all feet (each footprint's lifecycle is a state).
    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let pending = false;
        feet.forEach((ft, idx) => {
            // Start the next foot only after the previous one slammed.
            if (ft.state === 'wait') {
                if (idx === 0 || feet[idx - 1].state === 'wave' || feet[idx - 1].state === 'done') {
                    ft.state = 'warn';
                    ft.t = 0;
                    ft.zone = _egNkEl(run, 'div', 'eg-colo-quake-zone');
                    ft.zone.style.left = Math.round(ft.x - EG_COLO_WAVE_R) + 'px';
                    ft.zone.style.top = Math.round(ft.y - EG_COLO_WAVE_R) + 'px';
                    ft.zone.style.width = ft.zone.style.height = (EG_COLO_WAVE_R * 2) + 'px';
                    ft.warned = _egNkEl(run, 'div', 'eg-colo-foot-warn');
                    ft.warned.style.left = Math.round(ft.x - 78) + 'px';
                    ft.warned.style.top = Math.round(ft.y - 52) + 'px';
                }
                pending = true;
                return;
            }
            if (ft.state === 'warn') {
                pending = true;
                ft.t += dtS * 1000;
                if (ft.t >= EG_COLO_FOOT_WARN_MS * _EG_COLO_DEBUG_MULT) {
                    // SLAM.
                    try { ft.warned.remove(); } catch (e) {}
                    ft.zone.classList.add('eg-colo-quake-live');
                    ft.slamEl = _egNkEl(run, 'div', 'eg-colo-foot-slam');
                    ft.slamEl.style.left = Math.round(ft.x - 78) + 'px';
                    ft.slamEl.style.top = Math.round(ft.y - 52) + 'px';
                    _egColoRubble(run, ft.x, ft.y, true);
                    _egColoShake(1);
                    // Anyone still inside the dashed circle at the slam is
                    // punished at once (one heavy hit, +footfall bonus when
                    // standing right under the foot). The expanding ring is
                    // then purely visual.
                    const dFoot = Math.hypot(pc.x - ft.x, pc.y - ft.y);
                    if (pr && dFoot < EG_COLO_WAVE_R) {
                        const pct = EG_COLO_WAVE_DMG[p] + (dFoot < 88 ? EG_COLO_FOOT_DMG[p] : 0);
                        _egColoTouch(pct, level, dFoot < 88 ? 'Footfall' : 'Shockwave', true);
                        ft.hit = true;
                    }
                    ft.waveEl = _egNkEl(run, 'div', 'eg-nk-ring eg-colo-wave');
                    ft.state = 'wave';
                    ft.t = 0;
                }
                return;
            }
            if (ft.state === 'wave') {
                pending = true;
                ft.t += dtS;
                const spd = EG_COLO_WAVE_SPEED / _EG_COLO_DEBUG_MULT;
                ft.r = Math.min(EG_COLO_WAVE_R, 40 + spd * ft.t);
                ft.waveEl.style.left = Math.round(ft.x - ft.r) + 'px';
                ft.waveEl.style.top = Math.round(ft.y - ft.r) + 'px';
                ft.waveEl.style.width = Math.round(ft.r * 2) + 'px';
                ft.waveEl.style.height = Math.round(ft.r * 2) + 'px';
                // Safety net for a player who stepped INTO the circle after
                // the slam: the ring front still bites once.
                if (!ft.hit && pr && Math.abs(Math.hypot(pc.x - ft.x, pc.y - ft.y) - ft.r) < 26) {
                    ft.hit = true;
                    _egColoTouch(EG_COLO_WAVE_DMG[p] * 0.6, level, 'Shockwave');
                }
                if (ft.r >= EG_COLO_WAVE_R) {
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
// that keep travelling outward. The first boulder aims at you. Dodge the
// impact ring AND the fragment lanes. Phase 3 lobs an extra boulder.
export const EG_BOULDER_COUNT   = [0, 0, 3, 4];
export const EG_BOULDER_FALL_MS = 1500;   // telegraph (shadow) before impact
export const EG_BOULDER_FRAGS   = 4;      // rolling fragments per boulder
const EG_BOULDER_R = 78;                  // px impact radius (= the shadow)

export function _egMechColoBoulders(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_colo_boulder', '🗿🪨 BOULDER RAIN - leave the shadows, then dodge the rolling rubble!', '#d6c8a8');

    // ONE loop owns every boulder and every fragment.
    const boulders = [];
    let launched = 0, launchedAt = 0;
    const launchGap = 2.2; // s between boulder launches

    _egNkLoop(run, (dtS, now) => {
        // Launch the next boulder (the first one aims at you).
        if (launched < EG_BOULDER_COUNT[p] && (launched === 0 || launchedAt >= launchGap)) {
            const pcA = _egColoPC();
            const tx = launched === 0 ? Math.max(60, Math.min(W - 60, pcA.x + (Math.random() * 80 - 40))) : W * (0.12 + Math.random() * 0.76);
            const ty = launched === 0 ? Math.max(60, Math.min(H - 60, pcA.y + (Math.random() * 80 - 40))) : H * (0.15 + Math.random() * 0.7);
            launched++; launchedAt = 0;
            const mark = _egNkEl(run, 'div', 'eg-colo-boulder-mark');
            mark.style.left = Math.round(tx - EG_BOULDER_R) + 'px';
            mark.style.top = Math.round(ty - EG_BOULDER_R) + 'px';
            mark.style.width = mark.style.height = (EG_BOULDER_R * 2) + 'px';
            const el = _egNkEl(run, 'div', 'eg-colo-boulder');
            el.style.left = Math.round(tx - 26) + 'px';
            el.style.top = Math.round(-70) + 'px';
            boulders.push({ x: tx, y: ty, el, mark, state: 'fall', t: 0 });
        }
        launchedAt += dtS;

        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let active = 0;
        for (const b of boulders) {
            if (b.state === 'fall') {
                active++;
                b.t += dtS * 1000;
                const f = Math.min(1, b.t / (EG_BOULDER_FALL_MS * _EG_COLO_DEBUG_MULT));
                const ease = f * f;
                b.el.style.top = Math.round(-70 + (b.y - 26 + 70) * ease) + 'px';
                b.el.style.transform = 'rotate(' + Math.round(b.t * 0.4) + 'deg)';
                b.mark.style.setProperty('--fall', f.toFixed(3));
                if (f >= 1) {
                    // IMPACT: shatter into rolling fragments.
                    try { b.el.remove(); } catch (e) {}
                    try { b.mark.remove(); } catch (e) {}
                    _egColoRubble(run, b.x, b.y, true);
                    _egColoShake(0.7);
                    if (pr && Math.hypot(pc.x - b.x, pc.y - b.y) < EG_BOULDER_R) {
                        _egColoTouch(EG_COLO_BOULDER_DMG, level, 'Boulder');
                    }
                    b.frags = [];
                    for (let k = 0; k < EG_BOULDER_FRAGS; k++) {
                        const ang = (k / EG_BOULDER_FRAGS) * Math.PI * 2 + Math.random() * 0.5;
                        const fel = _egNkEl(run, 'div', 'eg-colo-frag');
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
                const rollSpd = 210 / _EG_COLO_DEBUG_MULT;
                let anyAlive = false;
                for (const fr of b.frags) {
                    if (fr.dist >= 340) { try { fr.el.remove(); } catch (e) {} continue; }
                    anyAlive = true;
                    fr.dist += rollSpd * dtS;
                    const fx = b.x + Math.cos(fr.ang) * fr.dist;
                    const fy = b.y + Math.sin(fr.ang) * fr.dist;
                    fr.el.style.left = Math.round(fx - 9) + 'px';
                    fr.el.style.top = Math.round(fy - 9) + 'px';
                    if (pr && !fr.hit && Math.hypot(pc.x - fx, pc.y - fy) < 30) {
                        fr.hit = true;
                        _egColoTouch(EG_COLO_FRAG_DMG, level, 'Rubble Roll');
                    }
                }
                if (!anyAlive) b.state = 'done';
            }
        }
        return active > 0;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: GRANITE GOLEMS (60%)--------------------------
//------------------------------------------------------------------------
// Two golem statues climb out of cracks and slow-push toward the player:
// moving walls that pin you into stride telegraphs. Ram a golem 3× (crack
// stages, like the Shaper's monoliths) to crumble it early - every ram
// shoves you back and costs a small hit, so ramming is a choice, not a
// trap. They crumble on their own after ~9s.
export const EG_GOLEM_COUNT     = [0, 0, 2, 2];
export const EG_GOLEM_SPEED     = 62;      // px/s push (divided by mult)
export const EG_GOLEM_HITS      = 3;
export const EG_GOLEM_LIFE_MS   = 9000;
const EG_GOLEM_RAM_CD_MS = 1200;           // per-golem: one ram (crack + shove + hit) per this
const EG_GOLEM_SHOVE_PX  = 70;             // shove-back on a ram

export function _egMechColoGolems(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_colo_golem', '🗿🧱 GRANITE GOLEMS - moving walls! Ram one 3 times to crumble it!', '#a8a29e');
    const golems = [];
    for (let i = 0; i < EG_GOLEM_COUNT[Math.max(2, Math.min(3, Number(phase) || 2))]; i++) {
        const el = _egNkEl(run, 'div', 'eg-colo-golem');
        el.innerHTML = '<i class="eg-colo-golem-eyes"></i>';
        const gx = W * (i === 0 ? 0.16 : 0.84);
        const gy = H * (0.2 + Math.random() * 0.5);
        el.style.left = Math.round(gx - 28) + 'px';
        el.style.top = Math.round(gy - 28) + 'px';
        golems.push({ x: gx, y: gy, el, hp: EG_GOLEM_HITS, dead: false, born: 0, ramCd: 0 });
    }
    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let active = false;
        for (const g of golems) {
            if (g.dead) continue;
            active = true;
            g.born += dtS * 1000;
            // Slow-push toward the player, capped step.
            const dx = pc.x - g.x, dy = pc.y - g.y;
            const d = Math.hypot(dx, dy) || 1;
            const spd = EG_GOLEM_SPEED / _EG_COLO_DEBUG_MULT;
            g.x += (dx / d) * Math.min(Math.max(0, d - 40), spd * dtS);
            g.y += (dy / d) * Math.min(Math.max(0, d - 40), spd * dtS);
            g.el.style.left = Math.round(g.x - 28) + 'px';
            g.el.style.top = Math.round(g.y - 28) + 'px';
            // Contact = a ram: crack the golem, shove you back, small hit.
            if (pr && d < 52 && now >= g.ramCd) {
                g.ramCd = now + EG_GOLEM_RAM_CD_MS;
                g.hp--;
                g.el.classList.remove('eg-colo-golem-crack1', 'eg-colo-golem-crack2');
                if (g.hp === 2) g.el.classList.add('eg-colo-golem-crack1');
                if (g.hp === 1) g.el.classList.add('eg-colo-golem-crack2');
                _egColoRubble(run, g.x, g.y, false);
                _egNkNudgeAvatar((dx / d) * EG_GOLEM_SHOVE_PX, (dy / d) * EG_GOLEM_SHOVE_PX);
                _egColoTouch(EG_COLO_GOLEM_DMG, level, 'Golem Shove');
                if (g.hp <= 0) {
                    g.dead = true;
                    _egColoRubble(run, g.x, g.y, true);
                    try { g.el.remove(); } catch (e) {}
                    _egNkToast('eg_mech_colo_golem_down', '🧱 Golem crumbled!', '#4ade80');
                    continue;
                }
            }
            if (g.born >= EG_GOLEM_LIFE_MS * _EG_COLO_DEBUG_MULT) {
                g.dead = true;
                _egColoRubble(run, g.x, g.y, true);
                try { g.el.remove(); } catch (e) {}
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: TITAN'S FALL (≤10%, one-shot)-----------------
//------------------------------------------------------------------------
// The Colossus kneels. Three JOINT SEALS (shoulder, knee, chest) light up
// one at a time; ram the lit seal 3 times - each ram counts when you charge
// in from outside, so step back between rams - while falling-rock chutes
// (telegraphed lanes) sweep the arena. Break a seal → the titan slumps.
// All three → collapse for good. A seal that runs out of time collapses on
// you (22%); the third one brings the CAVE-IN: 3-2-1, then dust everywhere
// except the glowing ring around that seal (35% outside it).
// Charge bar frozen for the whole set-piece (gate in _egTickPlayer via
// _egColoFinalActive).
export const EG_COLO_FINALE_SEAL_MS   = 22000;  // ms budget per seal (incl. chutes)
export const EG_COLO_CHUTE_PERIOD_MS  = 2600;   // a chute lane every ~2.6s
export const EG_COLO_CHUTE_WARN_MS    = 1100;   // lane telegraph before rocks

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
export let _egColoFinal = null;

export function _egColoFinalActive() {
    return !!_egColoFinal && !_egColoFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _egColoOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egColoStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _egColoStartFinalWatcher(monster) {
    if (!monster || _egColoFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egColoFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egColoFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _egColoAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egColoFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _egColoFinalStart(monster) {
    if (_egColoFinal || !monster) return;

    // The mountain goes quiet: kill every other run of this boss (the
    // finale owns the arena).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        stage: 'seals',            // seals → done
        seal: 0,                   // 0..2, which seal is lit
        fxRun: null, overlay: null, sealEls: [],
    };
    _egColoFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-colo-cd';
    ov.innerHTML =
        '<div class="eg-colo-cd-label">🗿 TITAN\u2019S FALL</div>' +
        '<div class="eg-colo-cd-hint">Ram the lit JOINT SEAL 3 times - step back between rams!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_colo_final_cd', '🗿💀 TITAN\u2019S FALL - ram the lit seal 3 times!', '#d6c8a8');
    const hintEl = ov.querySelector('.eg-colo-cd-hint');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the kneeling titan while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-colo-kneeling');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // Joint seal positions: shoulder / knee / chest, spread over the arena.
    const sealSpots = [
        { x: W * 0.26, y: H * 0.30 },   // shoulder
        { x: W * 0.72, y: H * 0.66 },   // knee
        { x: W * 0.50, y: H * 0.48 },   // chest
    ];
    g.sealEls = sealSpots.map(s => {
        const el = document.createElement('div');
        el.className = 'eg-colo-seal';
        el.style.left = Math.round(s.x - 46) + 'px';
        el.style.top = Math.round(s.y - 46) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return { el, x: s.x, y: s.y, hp: EG_COLO_SEAL_HITS };
    });

    // ONE finale loop: lights each seal in turn, runs the body-check crack
    // clock, sweeps rock chutes, and judges the seal (break or CAVE-IN).
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        if (g.caveIn) return true;   // the CAVE-IN countdown owns the arena
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        const seal = g.sealEls[g.seal];
        if (!seal) return false;

        // ── Chutes: a telegraphed lane, then rocks rain along it. ──
        g.chuteAcc = (g.chuteAcc || 0) + dtS * 1000;
        if (g.chuteAcc >= EG_COLO_CHUTE_PERIOD_MS * _EG_COLO_DEBUG_MULT) {
            g.chuteAcc = 0;
            // Lane: random vertical or horizontal strip through the arena.
            const vertical = Math.random() < 0.5;
            const lanePos = vertical
                ? W * (0.1 + Math.random() * 0.8)
                : H * (0.1 + Math.random() * 0.8);
            const warn = _egNkEl(g.fxRun, 'div', 'eg-colo-chute-warn');
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
            _egColoAfter(g, EG_COLO_CHUTE_WARN_MS * _EG_COLO_DEBUG_MULT, () => {
                if (g.finished) return;
                try { warn.remove(); } catch (e) {}
                const rocks = _egNkEl(g.fxRun, 'div', 'eg-colo-chute');
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
                g.activeChutes.push({ vertical, lanePos, el: rocks, until: performance.now() + 1400 * _EG_COLO_DEBUG_MULT, level });
            });
        }
        // Tick active chutes: contact damage + expiry.
        (g.activeChutes || []).forEach(ch => {
            if (performance.now() > ch.until) { try { ch.el.remove(); } catch (e) {} ch.done = true; return; }
            if (pr) {
                const inLane = ch.vertical
                    ? Math.abs(pc.x - ch.lanePos) < 52
                    : Math.abs(pc.y - ch.lanePos) < 52;
                if (inLane) _egColoTouch(EG_COLO_CHUTE_DMG[3], ch.level, 'Rock Chute');
            }
        });
        g.activeChutes = (g.activeChutes || []).filter(ch => !ch.done);

        // ── Seal ram (Shaper monolith crack pattern): a ram counts when you
        // charge in from outside - standing on the seal does nothing.
        const dSeal = Math.hypot(pc.x - seal.x, pc.y - seal.y);
        if (dSeal > 95) g.armed = true;
        if (pr && g.armed && dSeal < 58) {
            g.armed = false;
            seal.hp--;
            seal.el.classList.remove('eg-colo-seal-crack1', 'eg-colo-seal-crack2');
            if (seal.hp === 2) seal.el.classList.add('eg-colo-seal-crack1');
            if (seal.hp === 1) seal.el.classList.add('eg-colo-seal-crack2');
            _egColoRubble(g.fxRun, seal.x, seal.y, false);
            if (seal.hp <= 0) {
                seal.el.classList.add('eg-colo-seal-broken');
                _egColoRubble(g.fxRun, seal.x, seal.y, true);
                _egColoShake(1.4);
                g.seal++;
                if (g.seal >= g.sealEls.length) {
                    // All three seals broken: the titan collapses.
                    _egColoFinalEnd(g, monster, true);
                    return false;
                }
                _egNkToast('eg_mech_colo_seal_down', '🗿 SEAL BROKEN - the titan slumps! Next seal lit!', '#4ade80');
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
        if (g.sealTimer >= EG_COLO_FINALE_SEAL_MS * _EG_COLO_DEBUG_MULT) {
            g.sealTimer = 0;
            const dealt = _egNkHit(EG_COLO_CHARGE_DMG, null, level);
            _egNkAbilityHitToast(dealt, 'The Colossus', 'Seal Collapse');
            g.seal++;
            g.armed = false;
            if (g.seal >= g.sealEls.length) {
                _egColoCaveIn(g, seal, level, monster);
                return true;
            }
            _egNkToast('eg_mech_colo_seal_fail', '🗿 The seal collapsed on its own - next seal lit!', '#f59e0b');
        }

        // Seal countdown in the banner.
        if (hintEl) {
            const left = Math.max(0, Math.ceil((EG_COLO_FINALE_SEAL_MS * _EG_COLO_DEBUG_MULT - g.sealTimer) / 1000));
            hintEl.textContent = 'Seal ' + (g.seal + 1) + '/3 - ram it ' + Math.max(0, seal.hp) + ' more time' + (seal.hp === 1 ? '' : 's') + ' - ' + left + 's left';
        }
        // Keep the lit-seal visuals honest.
        g.sealEls.forEach((s, i) => {
            s.el.classList.toggle('eg-colo-seal-lit', i === g.seal);
        });
        return true;
    });
}

// CAVE-IN: the failed finale's punish - a 3-2-1 with a glowing safe ring
// around the last seal, then dust wipes the arena (35% outside the ring)
// and the fight resumes.
const EG_COLO_CAVEIN_R = 120;
const EG_COLO_CAVEIN_WARN_MS = 3000;
export function _egColoCaveIn(g, seal, level, monster) {
    if (g.finished || g.caveIn) return;
    g.caveIn = true;
    const ring = document.createElement('div');
    ring.className = 'eg-colo-cavein-ring';
    ring.style.left = Math.round(seal.x - EG_COLO_CAVEIN_R) + 'px';
    ring.style.top = Math.round(seal.y - EG_COLO_CAVEIN_R) + 'px';
    ring.style.width = ring.style.height = (EG_COLO_CAVEIN_R * 2) + 'px';
    ring.innerHTML = '<span class="eg-colo-cavein-count"></span>';
    document.body.appendChild(ring);
    (g.activeChutes || []).forEach(ch => { try { ch.el.remove(); } catch (e) {} });
    g.activeChutes = [];
    g.sealEls.forEach(s => s.el.classList.remove('eg-colo-seal-lit'));
    const hint = g.overlay && g.overlay.querySelector('.eg-colo-cd-hint');
    if (hint) hint.textContent = 'CAVE-IN - get into the glowing ring!';
    _egNkToast('eg_mech_colo_cavein_warn', '🗿💀 CAVE-IN - get into the glowing ring!', '#f59e0b');
    const countEl = ring.querySelector('.eg-colo-cavein-count');
    const t0 = performance.now();
    const warnMs = EG_COLO_CAVEIN_WARN_MS * _EG_COLO_DEBUG_MULT;
    const tick = () => {
        if (g.finished) return;
        const left = warnMs - (performance.now() - t0);
        if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
        if (left > 0) { _egColoAfter(g, 100, tick); return; }
        const dust = document.createElement('div');
        dust.className = 'eg-colo-cavein';
        dust.style.setProperty('--cx', Math.round(seal.x) + 'px');
        dust.style.setProperty('--cy', Math.round(seal.y) + 'px');
        document.body.appendChild(dust);
        setTimeout(() => { try { dust.remove(); } catch (e) {} }, _EG_COLO_DEBUG_SLOW ? 4000 : 1600);
        _egColoShake(2);
        const pc = _egColoPC();
        if (Math.hypot(pc.x - seal.x, pc.y - seal.y) >= EG_COLO_CAVEIN_R) {
            const dealt = _egNkHit(EG_COLO_CAVEIN_DMG, null, level);
            _egNkAbilityHitToast(dealt, 'The Colossus', 'CAVE-IN');
        }
        _egNkToast('eg_mech_colo_cavein', '🗿💀 CAVE-IN! The titan shrugs you off!', '#f59e0b');
        _egColoFinalEnd(g, monster, false);
    };
    tick();
}

// Ends the finale: collapse (seals broken) - releases immunity + charge bar.
export function _egColoFinalEnd(g, monster, collapsed) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    g.sealEls.forEach(s => { try { s.el.remove(); } catch (e) {} });
    document.querySelectorAll('.eg-colo-chute-warn, .eg-colo-chute, .eg-colo-cd, .eg-colo-cavein-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-colo-kneeling');
        wrap.classList.remove('eg-nk-shielded');
    }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    try {
        const m = (typeof _egMonsters !== 'undefined') ? globalThis._egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    if (collapsed) {
        _egColoShake(2);
        if (typeof _egNkToast === 'function') {
            _egNkToast('eg_mech_colo_collapsed', '🗿💥 THE TITAN FALLS!', '#4ade80');
        }
    }
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _egColoTeardown() {
    if (_egColoFinal) { try { _egColoFinalEnd(_egColoFinal, null, false); } catch (e) {} _egColoFinal = null; }
    document.querySelectorAll('.eg-colo-foot-warn, .eg-colo-foot-slam, .eg-colo-wave, .eg-colo-quake-zone, ' +
        '.eg-colo-boulder, .eg-colo-boulder-mark, .eg-colo-frag, .eg-colo-golem, .eg-colo-chip, ' +
        '.eg-colo-seal, .eg-colo-chute-warn, .eg-colo-chute, .eg-colo-cd, .eg-colo-cavein, .eg-colo-cavein-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-colo-kneeling').forEach(el => el.classList.remove('eg-colo-kneeling'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_COLO_DEBUG.fire('stride'|'boulders'|'golems', phase) - runs one now
//   _EG_COLO_DEBUG.final()                                   - TITAN'S FALL now
if (typeof window !== 'undefined') {
    window._EG_COLO_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? globalThis._egMonsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            const fn = name === 'stride' ? _egMechSeismicSlam
                : name === 'boulders' ? _egMechColoBoulders
                : name === 'golems' ? _egMechColoGolems : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'stride' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? globalThis._egMonsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            _egColoFinalStart(monster);
            return 'TITAN\u2019S FALL started';
        },
    };
}
