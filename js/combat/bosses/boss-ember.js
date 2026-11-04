import { AIL_IGNITE_DMG_SHARE, AIL_MIN_DOT_DAMAGE, _applyPlayerAilment } from '../combat-ailments-core.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap, _nkTierDamageFactor } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EMBER (boss_ember)-------------------------------
//------------------------------------------------------------------------
// A living flame (fire sits at the 75% resistance cap). Every flame that
// touches you sets you on fire.
//  - EMBER RAIN (all fight): red columns fill from the top, then flames
//    fall down them. From 30% a second comb follows, shifted half a step.
//  - FIREBALLS (all fight): filling circles chase you; from 60% each one
//    leaves burning ground for a few seconds.
//  - BONFIRE finale (10%): boss-ember-bonfire.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_ember: {
        id: 'boss_ember', name: 'The Ember', emoji: '🔥',
        baseHP: 850, baseDamage: 18, chargeMax: 14,
        // A living flame: fire sits at the hard resistance cap (75%), so
        // fire skills deal only a quarter of their damage to it.
        element: 'fire', resistances: { fire: 75, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_ember: {
        phases: [
            // Basic attacks are steady pressure; the flames are the real threat.
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'ember_rain', intervalBase: 15000, intervalVariance: 3500, handler: '_mechEmbRain' },
            { name: 'ember_fireballs', intervalBase: 16000, intervalVariance: 4000, handler: '_mechEmbFireballs' },
            { name: 'prior_bomb', intervalBase: 22000, intervalVariance: 5000, handler: '_mechPriorBomb' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND SHARED HELPERS---------------------------------
//------------------------------------------------------------------------
const HIT_CD_MS = 650;                             // shared hit cooldown
const RAIN_COL_W = 86;                             // width of one flame column (px)
const RAIN_SPACING = 210;                          // gap between column centres (px)
const RAIN_STAGGER_MS = 160;                       // columns fill one after another
const RAIN_BY_PHASE = [
    null,
    { cols: 3, warnMs: 1150, dmg: 0.17, second: false },
    { cols: 4, warnMs: 1080, dmg: 0.20, second: false },
    { cols: 5, warnMs: 1000, dmg: 0.23, second: true },
];
const BALL_R = 92;
const BALL_EVERY_MS = 650;                         // a new circle on your spot this often
const BALL_BY_PHASE = [
    null,
    { n: 3, warnMs: 1150, dmg: 0.15, patchMs: 0 },
    { n: 4, warnMs: 1080, dmg: 0.18, patchMs: 4500 },
    { n: 5, warnMs: 1000, dmg: 0.21, patchMs: 5500 },
];
const PATCH_R = 70;                                // burning ground left by a fireball
const PATCH_DMG = 0.06;
let _hitUntil = 0;

// The phase number clamped to 1-3.
function _embPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One fire hit with the boss-ability flash and number, behind a short shared
// cooldown; every hit also sets the player on fire (ignite).
export function _embStrike(pct, level, label) {
    const now = performance.now();
    if (now < _hitUntil) return false;
    _hitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'fire', level), 'The Ember', label, true);
    const dps = Math.max(AIL_MIN_DOT_DAMAGE,
        Math.max(1, Math.round(_nkMaxHP() * pct * _nkTierDamageFactor(level))) * AIL_IGNITE_DMG_SHARE);
    try { _applyPlayerAilment('ignite', dps); } catch (e) {}
    return true;
}

// Player centre, or the screen centre when there is no avatar.
export function _embPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// A clock that follows real time (clamped to 0.1 s per frame), so the CSS
// fills and the strikes in code never drift apart.
export function _embClock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Removes an element after a short delay (the run also cleans it up).
function _later(run, el, ms) {
    run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, ms));
}


//------------------------------------------------------------------------
//-------------------EMBER RAIN (filling columns, falling flames)------------------------
//------------------------------------------------------------------------

// Column centres of one comb: one column on `x`, the others every
// RAIN_SPACING to both sides (kept on screen).
function _rainComb(x, n) {
    const W = window.innerWidth, out = [x];
    for (let k = 1; out.length < n && k < 12; k++) {
        [x + k * RAIN_SPACING, x - k * RAIN_SPACING].forEach(c => {
            if (out.length < n && c > RAIN_COL_W / 2 && c < W - RAIN_COL_W / 2) out.push(c);
        });
    }
    return out;
}

// Paints one column whose red fill runs down from the top (starting after
// `delay`), plus the flame that falls when it is full. `start` is the run
// time the column was laid at.
function _rainColumn(run, x, warnMs, delay, start) {
    const el = _nkEl(run, 'div', 'sx-emb-col');
    el.style.left = Math.round(x - RAIN_COL_W / 2) + 'px';
    el.style.width = RAIN_COL_W + 'px';
    el.style.setProperty('--emb-warn', warnMs + 'ms');
    el.style.setProperty('--emb-delay', delay + 'ms');
    return { x, el, at: start + delay + warnMs, done: false };
}

// Ember Rain: a comb of columns (one on you) fills red from the top, then
// flames fall down them. In phase 3 a second comb follows, shifted half a
// step - right onto the gaps you dodged into.
export function _mechEmbRain(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = RAIN_BY_PHASE[_embPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const clock = _embClock();
    const cols = [];
    const lay = (x, start) => _rainComb(x, cfg.cols).sort((a, b) => a - b)
        .forEach((c, i) => cols.push(_rainColumn(run, c, cfg.warnMs, i * RAIN_STAGGER_MS, start)));
    const pc = _embPC();
    lay(pc.x, 0);
    let t = 0, second = cfg.second;
    const secondAt = cfg.warnMs + cfg.cols * RAIN_STAGGER_MS + 250;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        if (second && t >= secondAt) {
            second = false;
            const x0 = _embPC().x + (Math.random() < 0.5 ? 1 : -1) * RAIN_SPACING / 2;
            lay(Math.max(RAIN_COL_W, Math.min(window.innerWidth - RAIN_COL_W, x0)), t);
        }
        cols.forEach(c => {
            if (c.done || t < c.at) return;
            c.done = true;
            c.el.classList.add('hot');
            const pr = _nkPlayerRect();
            if (_nkRectsOverlap(pr, { left: c.x - RAIN_COL_W / 2, right: c.x + RAIN_COL_W / 2, top: 0, bottom: window.innerHeight })) {
                _embStrike(cfg.dmg, level, 'Ember Rain');
            }
            _later(run, c.el, 500);
        });
        return second || !cols.every(c => c.done) || t < cols[cols.length - 1].at + 520;
    });
}


//------------------------------------------------------------------------
//-------------------FIREBALLS (filling circles, burning ground)--------------------------
//------------------------------------------------------------------------

// Lights a burning patch on the ground; standing in it burns you.
function _patch(run, patches, x, y, lifeMs) {
    const el = _nkEl(run, 'div', 'sx-emb-patch');
    el.style.left = Math.round(x - PATCH_R) + 'px';
    el.style.top = Math.round(y - PATCH_R) + 'px';
    el.style.width = el.style.height = (PATCH_R * 2) + 'px';
    el.style.setProperty('--emb-life', lifeMs + 'ms');
    patches.push({ x, y, el, left: lifeMs });
}

// Burns the player standing in a patch and lets old patches go out.
// Returns true while any patch still burns.
function _embStepPatches(patches, dt, level) {
    const pr = _nkPlayerRect();
    for (let i = patches.length - 1; i >= 0; i--) {
        const p = patches[i];
        p.left -= dt;
        if (p.left <= 0) { try { p.el.remove(); } catch (e) {} patches.splice(i, 1); continue; }
        if (_nkCircleHit(p.x, p.y, PATCH_R * 0.85, pr, 0)) _embStrike(PATCH_DMG, level, 'Burning Ground');
    }
    return patches.length > 0;
}

// Fireballs: red circles fill on your spot one after another; when one is
// full the fireball lands. From 60% it leaves burning ground behind.
export function _mechEmbFireballs(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = BALL_BY_PHASE[_embPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const balls = [], patches = [];
    const clock = _embClock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt;
        while (balls.length < cfg.n && t >= balls.length * BALL_EVERY_MS) {
            const c = _embPC();
            const el = _nkEl(run, 'div', 'sx-emb-ball');
            el.style.left = Math.round(c.x - BALL_R) + 'px';
            el.style.top = Math.round(c.y - BALL_R) + 'px';
            el.style.width = el.style.height = (BALL_R * 2) + 'px';
            el.style.setProperty('--emb-warn', cfg.warnMs + 'ms');
            balls.push({ x: c.x, y: c.y, el, at: balls.length * BALL_EVERY_MS + cfg.warnMs, done: false });
        }
        balls.forEach(b => {
            if (b.done || t < b.at) return;
            b.done = true;
            b.el.classList.add('hot');
            if (_nkCircleHit(b.x, b.y, BALL_R, _nkPlayerRect(), 0)) _embStrike(cfg.dmg, level, 'Fireball');
            if (cfg.patchMs) _patch(run, patches, b.x, b.y, cfg.patchMs);
            _later(run, b.el, 420);
        });
        const burning = _embStepPatches(patches, dt, level);
        // Once every fireball landed, the leftover fire must not block other attacks.
        if (balls.length >= cfg.n && balls.every(b => b.done)) run.passive = true;
        return burning || !(balls.length >= cfg.n && balls.every(b => b.done) && t > balls[balls.length - 1].at + 450);
    });
}
