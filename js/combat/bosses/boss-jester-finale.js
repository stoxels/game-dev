import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _jsConfetti, _jsStrike } from './boss-jester.js';
import { _nkBossAlive, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkRuns, _nkKillRun } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------JESTER: THE GRAND FINALE (10% HP)-------------------------
//------------------------------------------------------------------------
// The curtain drops, the Jester bows (immune) and the stage is dealt out as
// a 3x3 card table. Every round the cards turn up: GREEN cards are safe, RED
// cards strike when their fill is full. Be on a green card. The green cards
// always include one next to you; the rounds get faster and hit harder.
// Everything runs in ONE loop; every way out (done, boss dead, encounter
// stopped, 2 minute failsafe) goes through the same cleanup.
//------------------------------------------------------------------------

const FIN_COLS = 3, FIN_ROWS = 3;
const FIN_TOP = 84, FIN_BOTTOM = 70;               // keep clear of the HUD above and the toolbar below
const FIN_INTRO_MS = 1800;
const FIN_GAP_MS = 500;                            // pause between rounds
const FIN_FAILSAFE_MS = 120000;
const FIN_SUITS = ['♠', '♥', '♦', '♣'];
const FIN_ROUNDS = [                               // time until the strike, share of max life + shield
    { ms: 2600, dmg: 0.22 }, { ms: 2300, dmg: 0.26 }, { ms: 2100, dmg: 0.30 },
    { ms: 1900, dmg: 0.34 }, { ms: 1800, dmg: 0.38 }, { ms: 1700, dmg: 0.44 },
];

let _finale = null;                                // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS------------------------------------------
//------------------------------------------------------------------------

// Charge bar of the player's auto attack stays paused while the show runs.
function _finPauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Which table cell a screen point is over (points outside are clamped to the edge cell).
function _finCellAt(x, y) {
    const W = window.innerWidth, H = window.innerHeight;
    const col = Math.max(0, Math.min(FIN_COLS - 1, Math.floor(x / (W / FIN_COLS))));
    const row = Math.max(0, Math.min(FIN_ROWS - 1, Math.floor((y - FIN_TOP) / ((H - FIN_TOP - FIN_BOTTOM) / FIN_ROWS))));
    return { col, row };
}

// Picks which cells are green this round: one next to (or under) the player,
// plus more at random (3 in the early rounds, 2 later).
function _finPickSafe(round) {
    const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const me = _finCellAt(pc.x, pc.y);
    const near = [];
    for (let r = 0; r < FIN_ROWS; r++) {
        for (let c = 0; c < FIN_COLS; c++) {
            if (Math.abs(c - me.col) <= 1 && Math.abs(r - me.row) <= 1) near.push(r * FIN_COLS + c);
        }
    }
    const safe = new Set([near[Math.floor(Math.random() * near.length)]]);
    const want = round < 2 ? 3 : 2;
    while (safe.size < want) safe.add(Math.floor(Math.random() * FIN_COLS * FIN_ROWS));
    return safe;
}

// Draws the nine cards of one round; returns them with their safe flag.
function _finDealRound(run, round) {
    const W = window.innerWidth, H = window.innerHeight;
    const cw = W / FIN_COLS, ch = (H - FIN_TOP - FIN_BOTTOM) / FIN_ROWS;
    const safe = _finPickSafe(round);
    const safeSuit = FIN_SUITS[Math.floor(Math.random() * 4)];
    const others = FIN_SUITS.filter(s => s !== safeSuit);
    const cells = [];
    for (let i = 0; i < FIN_COLS * FIN_ROWS; i++) {
        const isSafe = safe.has(i);
        const el = _nkEl(run, 'div', 'sx-js-cell ' + (isSafe ? 'sx-js-cell-safe' : 'sx-js-cell-danger'),
            isSafe ? safeSuit : others[Math.floor(Math.random() * 3)]);
        el.style.left = Math.round((i % FIN_COLS) * cw + 6) + 'px';
        el.style.top = Math.round(FIN_TOP + Math.floor(i / FIN_COLS) * ch + 6) + 'px';
        el.style.width = Math.round(cw - 12) + 'px';
        el.style.height = Math.round(ch - 12) + 'px';
        el.style.setProperty('--js-warn', FIN_ROUNDS[round].ms + 'ms');
        cells.push({ el, safe: isSafe, col: i % FIN_COLS, row: Math.floor(i / FIN_COLS) });
    }
    return cells;
}

// Judges one round: red cards flash, a player not standing on a green card is hit.
function _finStrike(cells, round, level) {
    const pc = _nkPlayerCenter();
    const at = pc ? _finCellAt(pc.x, pc.y) : null;
    const onSafe = !!at && cells.some(c => c.safe && c.col === at.col && c.row === at.row);
    cells.forEach(c => c.el.classList.add(c.safe ? 'sx-js-cell-ok' : 'sx-js-cell-strike'));
    if (!onSafe) {
        _jsStrike(FIN_ROUNDS[round].dmg, level, 'Grand Finale');
        if (pc) _jsConfetti(pc.x, pc.y, true);
    }
}


//------------------------------------------------------------------------
//-------------------START, LOOP AND CLEANUP---------------------------------------
//------------------------------------------------------------------------

// Ends the finale (idempotent): clears the stage, releases the boss and
// restarts its normal mechanics.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _finPauseCharge(false);
    document.querySelectorAll('.sx-js-bowing').forEach(el => el.classList.remove('sx-js-bowing'));
    document.querySelectorAll('.sx-nk-shielded').forEach(el => el.classList.remove('sx-nk-shielded'));
    if (g.curtain) { try { g.curtain.remove(); } catch (e) {} g.curtain = null; }
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) {
        m.bossImmune = false;
        try { _bossScheduleMechanics(m, 3); } catch (e) {}
        try { _renderPanel(); } catch (e) {}
    }
    if (_finale === g) _finale = null;
}

// Starts the finale: silences the boss's other runs, dims the house, bows.
function _finStart(monster) {
    if (_finale || monster._jsFinaleDone) return;
    monster._jsFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    const level = monster.level || 1;
    const run = _nkNewRun(monster.id, true);          // non-passive: no other mechanic starts meanwhile
    const g = { monsterId: monster.id, finished: false, curtain: null };
    _finale = g;
    run.onKill = () => _finEnd(g);
    monster.bossImmune = true;
    _finPauseCharge(true);
    const curtain = document.createElement('div');
    curtain.className = 'sx-js-curtain';
    document.body.appendChild(curtain);
    g.curtain = curtain;
    requestAnimationFrame(() => curtain.classList.add('sx-js-curtain-on'));
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-jes');
    banner.innerHTML = '<div class="sx-nk-fin-title">THE GRAND FINALE</div>';
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) { wrap.classList.add('sx-js-bowing'); wrap.classList.add('sx-nk-shielded'); }

    let stage = 'intro', t = 0, round = 0, cells = [], last = performance.now(), total = 0;
    _nkLoop(run, (dtS, now) => {
        const dtMs = Math.min(100, now - last);
        last = now;
        t += dtMs; total += dtMs;
        if (total > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (stage === 'intro') {
            if (t >= FIN_INTRO_MS) { stage = 'gap'; t = FIN_GAP_MS; }
        } else if (stage === 'gap') {
            if (t < FIN_GAP_MS) return true;
            if (round >= FIN_ROUNDS.length) return false;      // all rounds done: cleanup releases the boss
            cells.forEach(c => { try { c.el.remove(); } catch (e) {} });
            cells = _finDealRound(run, round);
            stage = 'round'; t = 0;
        } else if (t >= FIN_ROUNDS[round].ms) {
            _finStrike(cells, round, level);
            const old = cells;
            setTimeout(() => old.forEach(c => { try { c.el.remove(); } catch (e) {} }), 500);
            cells = [];
            round++; stage = 'gap'; t = 0;
        }
        return true;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _jsWatchFinale(monster) {
    if (!monster || monster._jsFinaleWatch) return;
    monster._jsFinaleWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._jsFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_jester.onInit = _jsWatchFinale;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK----------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element and body class the Jester ever created.
export function _jsTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    document.querySelectorAll('.sx-js-ball, .sx-js-aim, .sx-js-spot, .sx-js-card, .sx-js-orb, ' +
        '.sx-js-curtain, .sx-js-cell, .sx-js-confetti').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.sx-js-bowing').forEach(el => el.classList.remove('sx-js-bowing'));
    _finPauseCharge(false);
}

// Console hook for playtests: _JS_DEBUG.fire('orbs'|'cards'|'jinx', phase), _JS_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_jester');
    window._JS_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { orbs: globalThis._mechJsOrbs, cards: globalThis._mechJsCards, jinx: globalThis._mechJsJinx }[name];
            if (!m) return 'no jester alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no jester alive'; _finStart(m); return 'finale started'; },
    };
}
