import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE ARBITER (boss_arbiter)---------------------------
//------------------------------------------------------------------------
// A courtroom with a verdict for every move you make:
//  - STILLNESS TRIAL (all fight): a BLUE border means hold still, an ORANGE
//    border means keep walking. Breaking the rule hurts, again and again.
//  - SCALES OF JUDGEMENT (all fight): the court is split in two; the heavy
//    half fills with red and is struck. Cross to the green half in time.
//  - GAVEL WAVES (60%+, boss-arbiter-court.js): rings of force roll out of the
//    Arbiter, each with one gap. Walk into the green gap.
//  - FATED CELL (shared grid mechanic).
//  - LAST JUDGEMENT (10%, boss-arbiter-court.js): the Scales, then the Gavel
//    Waves, faster and harder, while the Arbiter is immune.
// Fated Cell is a shared mechanic referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_arbiter: {
        id: 'boss_arbiter', name: 'The Arbiter', emoji: '⚖️',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_arbiter: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'stillness_trial', intervalBase: 19000, intervalVariance: 4500, handler: '_mechStillnessTrial' },
            { name: 'scales_verdict', intervalBase: 17000, intervalVariance: 4000, handler: '_mechArbScales' },
            { name: 'gavel_waves', intervalBase: 21000, intervalVariance: 4500, handler: '_mechArbGavel', phase2Only: true },
            { name: 'fated_cell', intervalBase: 22000, intervalVariance: 5000, handler: '_mechFatedCell' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------SHARED HELPERS---------------------------------------------
//------------------------------------------------------------------------
const ARB_HIT_CD_MS = 650;                         // shared touch cooldown
let _arbHitUntil = 0;

// One hit with the boss-ability flash and number, behind a short shared
// cooldown so overlapping verdicts never stack several hits at once.
export function _arbStrike(pct, level, label) {
    const now = performance.now();
    if (now < _arbHitUntil) return false;
    _arbHitUntil = now + ARB_HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'shadow', level), 'The Arbiter', label, true);
    return true;
}

export function _arbPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// Centre of the Arbiter's card (where his rings start); top middle if it is gone.
export function _arbBossCentre(monster) {
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    if (card) {
        const r = card.getBoundingClientRect();
        if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: 90 };
}


//------------------------------------------------------------------------
//-------------------STILLNESS TRIAL (blue = hold still, orange = keep moving)------------------------
//------------------------------------------------------------------------
const TRIAL_WAVES = [0, 2, 3, 3];                  // rules per cast, by phase
const TRIAL_WARN_MS = [0, 1300, 1150, 1000];       // the border fills in, then the rule is live
const TRIAL_LIVE_MS = [0, 2300, 2500, 2700];
const TRIAL_GAP_MS = 600;
const TRIAL_DMG = [0, 0.12, 0.15, 0.18];           // share of max life + shield, per break
const TRIAL_MOVE_TOL = 30;                         // BLUE forgives this much jitter (px)
const TRIAL_STEP_MS = 700;                         // ORANGE: every step you must have walked ...
const TRIAL_STEP_PX = 70;                          // ... at least this far (px)

// Which rule each wave of one cast uses (true = blue); never all the same.
function _trialRules(n) {
    const rules = [];
    for (let i = 0; i < n; i++) rules.push(Math.random() < 0.5);
    if (rules.every(r => r === rules[0])) rules[n - 1] = !rules[n - 1];
    return rules;
}

// Blue and orange rules in a row. A rule fades in on the screen border, then
// goes live: every time you break it you are hit (with a short pause between).
export function _mechStillnessTrial(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _arbPhase(phase);
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const rules = _trialRules(TRIAL_WAVES[p]);
    let wave = -1, stage = 'idle', t = 0, blue = true;
    let tint = null, label = null, anchor = null, stepT = 0;
    const clearWave = () => {
        if (tint) { tint.remove(); tint = null; }
        if (label) { label.remove(); label = null; }
    };
    const startWave = () => {
        blue = rules[wave];
        stage = 'warn';
        t = 0;
        tint = _nkEl(run, 'div', 'sx-arb-trial ' + (blue ? 'sx-arb-trial-blue' : 'sx-arb-trial-orange'));
        tint.style.setProperty('--arb-warn', TRIAL_WARN_MS[p] + 'ms');
        label = _nkEl(run, 'div', 'sx-arb-trial-label ' + (blue ? 'sx-arb-trial-label-blue' : 'sx-arb-trial-label-orange'), (blue ? '✋ NEXT: HOLD STILL' : '➤ NEXT: KEEP MOVING'));
    };
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (stage === 'idle') {
            if (t < (wave < 0 ? 0 : TRIAL_GAP_MS)) return true;
            wave++;
            if (wave >= rules.length) return false;
            startWave();
            return true;
        }
        if (stage === 'warn') {
            if (t >= TRIAL_WARN_MS[p]) {
                stage = 'live';
                t = 0;
                tint.classList.add('sx-arb-trial-live');
                label.classList.add('sx-arb-trial-label-live');
                label.textContent = blue ? '✋ HOLD STILL' : '➤ KEEP MOVING';
                anchor = _nkPlayerCenter();
                stepT = 0;
            }
            return true;
        }
        const c = _nkPlayerCenter();
        if (c && anchor) {
            if (blue) {
                if (Math.hypot(c.x - anchor.x, c.y - anchor.y) > TRIAL_MOVE_TOL) {
                    _arbStrike(TRIAL_DMG[p], level, 'Stillness Trial');
                    anchor = c;
                }
            } else {
                stepT += dtS * 1000;
                if (stepT >= TRIAL_STEP_MS) {
                    stepT = 0;
                    if (Math.hypot(c.x - anchor.x, c.y - anchor.y) < TRIAL_STEP_PX) _arbStrike(TRIAL_DMG[p], level, 'Stillness Trial');
                    anchor = c;
                }
            }
        }
        if (label) label.textContent = (blue ? '✋ HOLD STILL ' : '➤ KEEP MOVING ') + Math.max(0, Math.ceil((TRIAL_LIVE_MS[p] - t) / 1000));
        if (t >= TRIAL_LIVE_MS[p]) { clearWave(); stage = 'idle'; t = 0; }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SCALES OF JUDGEMENT (the heavy half is struck)------------------------
//------------------------------------------------------------------------
const SC_GAP_MS = 450;                             // pause between two verdicts
const SC_REACH_PX_S = 224;                         // how fast we assume you can cross
const SC_FLIP_CHANCE = 0.7;                        // chance the heavy side swaps sides again
const SC_BY_PHASE = [
    null,
    { verdicts: 3, warnMs: [1500, 1250], dmg: 0.15, horizontal: false },
    { verdicts: 4, warnMs: [1350, 1050], dmg: 0.18, horizontal: false },
    { verdicts: 5, warnMs: [1250, 900], dmg: 0.22, horizontal: true },
];

// Which side (0 = left/top, 1 = right/bottom) a point is on.
function _scSide(pt, horizontal) {
    return horizontal ? (pt.y < window.innerHeight / 2 ? 0 : 1) : (pt.x < window.innerWidth / 2 ? 0 : 1);
}

// Picks the heavy side of one verdict. The first one lands on your side, later
// ones usually swap sides; a side you could not leave in time is never heavy.
function _scPickHeavy(pc, horizontal, warnMs, prevHeavy) {
    const mine = _scSide(pc, horizontal);
    let heavy = prevHeavy < 0 ? mine : (Math.random() < SC_FLIP_CHANCE ? 1 - prevHeavy : prevHeavy);
    const edge = horizontal ? window.innerHeight / 2 : window.innerWidth / 2;
    const dist = Math.abs((horizontal ? pc.y : pc.x) - edge) + 30;
    if (heavy === mine && dist > SC_REACH_PX_S * warnMs / 1000) heavy = 1 - mine;
    return heavy;
}

// Draws the two halves of one verdict: red heavy half (filling), green light half.
function _scDeal(run, horizontal, heavy, warnMs) {
    const mk = (side, cls) => {
        const el = _nkEl(run, 'div', 'sx-arb-half ' + cls);
        el.style.left = (!horizontal && side === 1) ? '50%' : '0';
        el.style.top = (horizontal && side === 1) ? '50%' : '0';
        el.style.width = horizontal ? '100%' : '50%';
        el.style.height = horizontal ? '50%' : '100%';
        el.style.setProperty('--arb-warn', warnMs + 'ms');
        return el;
    };
    return { heavyEl: mk(heavy, 'sx-arb-half-heavy'), lightEl: mk(1 - heavy, 'sx-arb-half-light') };
}

// Runs a series of verdicts (cfg: verdicts, warnMs [first, last], dmg, horizontal,
// label, onDone). Each one gives the heavy half a warning that fills with red,
// then strikes everyone standing on it.
export function _arbRunScales(monster, cfg) {
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let i = -1, stage = 'idle', t = 0, v = null, prevHeavy = -1;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (stage === 'idle') {
            if (t < (i < 0 ? 0 : SC_GAP_MS)) return true;
            i++;
            if (i >= cfg.verdicts) { if (cfg.onDone) cfg.onDone(); return false; }
            const f = cfg.verdicts > 1 ? i / (cfg.verdicts - 1) : 0;
            const warn = Math.round(cfg.warnMs[0] + (cfg.warnMs[1] - cfg.warnMs[0]) * f);
            const horizontal = !!cfg.horizontal && Math.random() < 0.5;
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const heavy = _scPickHeavy(pc, horizontal, warn, prevHeavy);
            prevHeavy = heavy;
            v = { horizontal, heavy, warn, ..._scDeal(run, horizontal, heavy, warn) };
            stage = 'warn'; t = 0;
            return true;
        }
        if (t < v.warn) return true;
        const pc = _nkPlayerCenter();
        v.heavyEl.classList.add('sx-arb-half-slam');
        v.lightEl.classList.add('sx-arb-half-ok');
        if (pc && _scSide(pc, v.horizontal) === v.heavy) _arbStrike(cfg.dmg, level, cfg.label || 'Scales of Judgement');
        const old = [v.heavyEl, v.lightEl];
        run.timers.push(setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) {} }), 450));
        stage = 'idle'; t = 0;
        return true;
    });
    return run;
}

// The court is split in two. One half is declared heavy: it fills with red and
// is struck. Be on the green half when it lands; later verdicts swap sides.
export function _mechArbScales(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _arbRunScales(monster, SC_BY_PHASE[_arbPhase(phase)]);
}
