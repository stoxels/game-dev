import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE JESTER (boss_jester)------------------------
//------------------------------------------------------------------------
// A stage show with three acts, one idea each (red = hurts, gold = good):
//  - JUGGLING BALLS (all fight): thin red lines show where the balls will fly,
//    then he throws them one after another and they bounce off the walls.
//  - CARD TOSS (60%+): playing cards fall onto marked circles; each circle
//    fills with red until its card lands.
//  - JUGGLER'S JINX (60%+): purple jinx balls drift after you; a gold luck
//    ball is a small heal if you dare.
//  - THE GRAND FINALE (10%, boss-jester-finale.js): the stage is dealt out
//    like a card table; stand on the green cards.
// Clue Swap is a shared mechanic referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_jester: {
        id: 'boss_jester', name: 'The Jester', emoji: '🤹',
        baseHP: 960, baseDamage: 22, chargeMax: 10,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_jester: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.25 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.50 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'bouncing_mayhem', intervalBase: 16000, intervalVariance: 3500, handler: '_mechJsOrbs' },
            { name: 'clue_swap', intervalBase: 18000, intervalVariance: 4000, handler: '_mechClueSwap' },
            { name: 'card_toss', intervalBase: 19000, intervalVariance: 4000, handler: '_mechJsCards', phase2Only: true },
            { name: 'jugglers_jinx', intervalBase: 23000, intervalVariance: 5000, handler: '_mechJsJinx', phase2Only: true },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------SHARED HELPERS---------------------------------------------
//------------------------------------------------------------------------
const JS_HIT_CD_MS = 600;                          // shared touch cooldown
let _jsHitUntil = 0;

// One hit with the boss-ability flash and number, behind a short shared
// cooldown so overlapping hazards never stack several hits at once.
export function _jsStrike(pct, level, label) {
    const now = performance.now();
    if (now < _jsHitUntil) return false;
    _jsHitUntil = now + JS_HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'shadow', level), 'The Jester', label, true);
    return true;
}

export function _jsPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// Flat heal of the player + HUD refresh.
function _jsHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (globalThis.playerCurrentHP <= 0) return;
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(amount) : amount));
        if (globalThis.playerCurrentHP !== before) Audio_Manager.playSFX('boss_heal');
        if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    } catch (e) {}
}

// Confetti puff where a show event lands (body-level so it survives the run ending).
export function _jsConfetti(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'sx-js-confetti' + (big ? ' sx-js-confetti-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    const colors = ['#f472b6', '#facc15', '#4ade80', '#60a5fa', '#c084fc'];
    for (let i = 0; i < (big ? 14 : 8); i++) {
        const s = document.createElement('div');
        s.className = 'sx-js-bit';
        s.style.background = colors[Math.floor(Math.random() * colors.length)];
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * (big ? 84 : 46);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 24) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 520) + 'deg');
        s.style.animationDelay = (Math.random() * 110) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, 950);
}

// Centre of the Jester's card (where his throws start); the top middle if it is gone.
function _jsBossCentre(monster) {
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    if (card) {
        const r = card.getBoundingClientRect();
        if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: 90 };
}


//------------------------------------------------------------------------
//-------------------JUGGLING BALLS (thrown along marked lines)------------------------
//------------------------------------------------------------------------
const BALL_COUNT = [0, 4, 5, 6];                   // balls per throw, by phase
const BALL_SPEED = [0, 300, 330, 360];             // px/s
const BALL_DMG = [0, 0.07, 0.09, 0.11];            // share of max life
const BALL_R = 13;
const BALL_WARN_MS = [0, 1100, 1000, 900];         // aim lines shown before the first throw
const BALL_GAP_MS = 230;                           // time between two throws
const BALL_BOUNCES = 2;                            // wall bounces before a ball is gone
const BALL_FAN = 15 * Math.PI / 180;               // angle between neighbouring lines

// Distance from (x, y) along (dx, dy) to the screen edge.
function _jsRayLength(x, y, dx, dy) {
    const W = window.innerWidth, H = window.innerHeight;
    const tx = dx > 0 ? (W - x) / dx : dx < 0 ? -x / dx : Infinity;
    const ty = dy > 0 ? (H - y) / dy : dy < 0 ? -y / dy : Infinity;
    return Math.max(40, Math.min(tx, ty));
}

// The Jester fans out several thin red lines (one through you); a moment
// later balls fly down them one after another and bounce off the walls.
export function _mechJsOrbs(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _jsPhase(phase);
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const o = _jsBossCentre(monster);
    const pc = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const base = Math.atan2(pc.y - o.y, pc.x - o.x);
    const balls = [];
    for (let i = 0; i < BALL_COUNT[p]; i++) {
        const a = base + (i - (BALL_COUNT[p] - 1) / 2) * BALL_FAN;
        const dx = Math.cos(a), dy = Math.sin(a);
        const line = _nkEl(run, 'div', 'sx-js-aim');
        line.style.left = Math.round(o.x) + 'px';
        line.style.top = Math.round(o.y - 3) + 'px';
        line.style.width = Math.round(_jsRayLength(o.x, o.y, dx, dy)) + 'px';
        line.style.transform = 'rotate(' + a + 'rad)';
        line.style.setProperty('--js-warn', BALL_WARN_MS[p] + 'ms');
        balls.push({ x: o.x, y: o.y, vx: dx * BALL_SPEED[p], vy: dy * BALL_SPEED[p], bounces: 0, line, el: null, thrown: false, gone: false });
    }
    let e = 0;
    _nkLoop(run, (dtS) => {
        e += dtS * 1000;
        const pr = _nkPlayerRect();
        balls.forEach((b, i) => {
            if (b.gone) return;
            if (!b.thrown && e >= BALL_WARN_MS[p] + i * BALL_GAP_MS) {
                b.thrown = true;
                b.el = _nkEl(run, 'div', 'sx-js-ball sx-js-ball-' + (i % 3));
                try { b.line.remove(); } catch (er) {}
            }
            if (!b.thrown) return;
            b.x += b.vx * dtS; b.y += b.vy * dtS;
            if (b.x < BALL_R || b.x > W - BALL_R) { b.vx *= -1; b.bounces++; b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x)); }
            if (b.y < BALL_R || b.y > H - BALL_R) { b.vy *= -1; b.bounces++; b.y = Math.max(BALL_R, Math.min(H - BALL_R, b.y)); }
            if (b.bounces > BALL_BOUNCES) { b.gone = true; try { b.el.remove(); } catch (er) {} return; }
            b.el.style.transform = 'translate(' + Math.round(b.x - BALL_R) + 'px,' + Math.round(b.y - BALL_R) + 'px)';
            if (_nkCircleHit(b.x, b.y, BALL_R, pr, 0)) _jsStrike(BALL_DMG[p], level, 'Juggling Balls');
        });
        return balls.some(b => !b.gone);
    });
}


//------------------------------------------------------------------------
//-------------------CARD TOSS (falling cards on marked circles)------------------------
//------------------------------------------------------------------------
const CARD_VOLLEYS = [0, 0, 2, 3];                 // volleys per cast, by phase
const CARD_COUNT = [0, 0, 4, 5];                   // cards per volley
const CARD_R = 78;                                 // landing circle = hit radius
const CARD_WARN_MS = [0, 0, 1250, 1100];           // circle fills while the card falls
const CARD_STEP_MS = [0, 0, 1900, 1600];           // time from one volley to the next
const CARD_DMG = [0, 0, 0.14, 0.17];               // share of max life
const CARD_SUITS = ['♠', '♥', '♦', '♣'];

// Landing spots for one volley: the first on the player, the rest spread out.
function _jsCardSpots(count, pc) {
    const W = window.innerWidth, H = window.innerHeight;
    const spots = [{ x: Math.max(100, Math.min(W - 100, pc.x)), y: Math.max(130, Math.min(H - 150, pc.y)) }];
    for (let i = 1; i < count; i++) {
        for (let tries = 0; tries < 30; tries++) {
            const s = { x: 100 + Math.random() * (W - 200), y: 130 + Math.random() * (H - 300) };
            if (spots.every(q => Math.hypot(q.x - s.x, q.y - s.y) >= 2 * CARD_R + 40)) { spots.push(s); break; }
        }
    }
    return spots;
}

// Playing cards drop from the top of the stage onto red circles that fill
// until the card lands; being inside a circle at that moment hurts. One
// circle is always on you.
export function _mechJsCards(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, _jsPhase(phase));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const volleys = [];
    let launched = 0, untilNext = 500, tail = 0;
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        untilNext -= dt;
        if (launched < CARD_VOLLEYS[p] && untilNext <= 0) {
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const cards = _jsCardSpots(CARD_COUNT[p], pc).map(s => {
                const ring = _nkEl(run, 'div', 'sx-js-spot');
                ring.style.left = Math.round(s.x - CARD_R) + 'px';
                ring.style.top = Math.round(s.y - CARD_R) + 'px';
                ring.style.width = ring.style.height = (CARD_R * 2) + 'px';
                ring.style.setProperty('--js-warn', CARD_WARN_MS[p] + 'ms');
                const card = _nkEl(run, 'div', 'sx-js-card' + (Math.random() < 0.5 ? ' sx-js-card-red' : ''), CARD_SUITS[Math.floor(Math.random() * 4)]);
                return { ...s, ring, card, spin: (Math.random() * 2 - 1) * 40 };
            });
            volleys.push({ cards, t: 0 });
            launched++;
            untilNext = CARD_STEP_MS[p];
        }
        for (let i = volleys.length - 1; i >= 0; i--) {
            const v = volleys[i];
            v.t += dt;
            const k = Math.min(1, v.t / CARD_WARN_MS[p]);
            v.cards.forEach(c => {
                c.card.style.left = Math.round(c.x - 23) + 'px';
                c.card.style.top = Math.round(-90 + (c.y - 32 + 90) * k * k) + 'px';
                c.card.style.rotate = (c.spin * (1 - k)) + 'deg';
            });
            if (k < 1) continue;
            const pc = _nkPlayerCenter();
            const hit = pc && v.cards.some(c => Math.hypot(pc.x - c.x, pc.y - c.y) < CARD_R);
            v.cards.forEach(c => {
                c.ring.classList.add('sx-js-spot-boom');
                c.card.classList.add('sx-js-card-landed');
                _jsConfetti(c.x, c.y, false);
                setTimeout(() => { try { c.ring.remove(); c.card.remove(); } catch (er) {} }, 600);
            });
            if (hit) _jsStrike(CARD_DMG[p], level, 'Card Toss');
            volleys.splice(i, 1);
        }
        if (launched < CARD_VOLLEYS[p] || volleys.length > 0) return true;
        tail += dt;
        return tail < 600;
    });
}


//------------------------------------------------------------------------
//-------------------JUGGLER'S JINX (purple bites, gold heals)------------------------
//------------------------------------------------------------------------
const JINX_LIFE_MS = 8000;
const JINX_TURN = 1.4;                             // rad/s course change (wide loops, never a tight chase)
const JINX_DMG = [0, 0, 0.10, 0.12];               // share of max life
const LUCK_HEAL = 0.06;                            // share of max life

// Purple jinx balls drift after you in wide loops (slower than you walk);
// one gold luck ball drifts through the same space - touching it heals a
// little and pops it. Phase 3 adds a third jinx ball.
export function _mechJsJinx(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, _jsPhase(phase));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const turn = JINX_TURN * (p >= 3 ? 1.25 : 1);
    const mk = (cls, speed, luck) => {
        const side = Math.floor(Math.random() * 4);
        return {
            x: side === 0 ? 50 : side === 1 ? W - 50 : W * (0.2 + Math.random() * 0.6),
            y: side === 2 ? 60 : side === 3 ? H - 60 : H * (0.2 + Math.random() * 0.6),
            ang: Math.random() * Math.PI * 2, speed, luck, done: false, el: _nkEl(run, 'div', 'sx-js-orb ' + cls),
        };
    };
    const balls = [];
    for (let i = 0; i < (p >= 3 ? 3 : 2); i++) balls.push(mk('sx-js-orb-jinx', p >= 3 ? 190 : 160, false));
    balls.push(mk('sx-js-orb-luck', 150, true));
    let t = 0;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const c = _nkPlayerCenter(), pr = _nkPlayerRect();
        balls.forEach(b => {
            if (b.done) return;
            if (c) {
                const want = Math.atan2(c.y - b.y, c.x - b.x);
                const diff = ((want - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const max = turn * dtS;
                b.ang += Math.max(-max, Math.min(max, diff));
            }
            b.x += Math.cos(b.ang) * b.speed * dtS;
            b.y += Math.sin(b.ang) * b.speed * dtS;
            if (b.x < 34 || b.x > W - 34) { b.ang = Math.PI - b.ang; b.x = Math.max(34, Math.min(W - 34, b.x)); }
            if (b.y < 34 || b.y > H - 34) { b.ang = -b.ang; b.y = Math.max(34, Math.min(H - 34, b.y)); }
            b.el.style.transform = 'translate(' + Math.round(b.x - 17) + 'px,' + Math.round(b.y - 17) + 'px)';
            if (!_nkCircleHit(b.x, b.y, 17, pr, 0)) return;
            if (b.luck) {
                _jsHeal(Math.max(1, Math.round(_nkMaxHP() * LUCK_HEAL)));
                _jsConfetti(b.x, b.y, false);
                b.done = true;
                try { b.el.remove(); } catch (e) {}
                return;
            }
            if (_jsStrike(JINX_DMG[p], level, 'Jinx Ball')) _jsConfetti(b.x, b.y, false);
        });
        return t < JINX_LIFE_MS && balls.some(b => !b.done);
    });
}
