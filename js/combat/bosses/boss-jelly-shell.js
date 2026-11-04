import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _jlyBlob, _jlyBossCentre, _jlyClock, _jlyPC, _jlyPuddle, _jlyStepBlob, _jlyStepPuddles, _jlyStrike, _jlyUnder, _mechJellyHops, _mechJellySplit } from './boss-jelly.js';
import { _nkBossAlive, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkRuns } from './shared-boss-abilities.js';
import { cur } from '../../state.js';

//------------------------------------------------------------------------
//-------------------JELLY: ICE SHELL AND THE JELLY ARMY-------------------------
//------------------------------------------------------------------------
// ICE SHELL (55%): the Jelly freezes into a shell and ices a few grid cells.
// It lobs one blob at a time at you; a blob that lands on ice slips and
// slams into the shell. Two slips break it. Stand on the ice while the
// shadow fills, then step off before it lands.
// JELLY ARMY (10%): the Jelly is immune and pours out waves of blobs; their
// slime puddles pile up until the last wave is over.
//------------------------------------------------------------------------

const SHELL_HITS = 2;                              // slips needed to break the shell
const SHELL_MAX_MS = 30000;                        // the shell melts by itself after this long
const SHELL_ICE = 3;                               // icy cells kept on the floor
const SHELL_ICE_LIFE_MS = [11000, 17000];        // each icy cell melts after a random time in this range
const SHELL_FIRST_MS = 2200;
const SHELL_GAP_MS = [2200, 3000];
const SHELL_REST_MS = 900;                         // the blob sits on the card before its shadow appears
const SHELL_WARN_MS = 1100;
const SHELL_R = 62;
const SHELL_DMG = 0.18;
const SLIP_MS = 750;
const ARMY_INTRO_MS = 1800;
const ARMY_GAP_MS = 750;
const ARMY_FAILSAFE_MS = 120000;
const ARMY_PUDDLE_DMG = 0.12;
const ARMY_WAVES = [                               // blobs per wave, shadow time, hit
    { n: 2, ms: 1400, dmg: 0.24 }, { n: 3, ms: 1350, dmg: 0.25 }, { n: 3, ms: 1300, dmg: 0.26 },
    { n: 3, ms: 1250, dmg: 0.27 }, { n: 4, ms: 1300, dmg: 0.28 }, { n: 4, ms: 1250, dmg: 0.29 },
    { n: 4, ms: 1200, dmg: 0.30 }, { n: 4, ms: 1150, dmg: 0.31 }, { n: 5, ms: 1250, dmg: 0.32 },
    { n: 5, ms: 1200, dmg: 0.33 }, { n: 5, ms: 1150, dmg: 0.34 }, { n: 5, ms: 1100, dmg: 0.35 },
    { n: 5, ms: 1100, dmg: 0.36 }, { n: 5, ms: 1050, dmg: 0.37 }, { n: 5, ms: 1050, dmg: 0.38 },
];
const ARMY_SPREAD = 160;                           // the other blobs land this far around you (6 slots, at most 4 used)

let _shell = null;                                 // the running ice shell (one at a time)
let _army = null;                                  // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------ICE ON THE GRID-------------------------------------------------
//------------------------------------------------------------------------

// Picks grid cells to ice: empty untouched cells first, any cell as a fallback
// (so a solved grid can never soft-lock the shell).
function _icePick(ice, count) {
    if (!cur || !cur.grid || typeof userGrid === 'undefined') return [];
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const clean = [], any = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (ice.has(r + '-' + c)) continue;
            const open = globalThis.userGrid[r][c] === 0 && (typeof revealedGrid === 'undefined' || !globalThis.revealedGrid[r][c]);
            (open ? clean : any).push([r, c]);
        }
    }
    const mix = (a) => a.sort(() => Math.random() - 0.5);
    return mix(clean).concat(mix(any)).slice(0, Math.max(0, count));
}

// Tops the icy cells back up to SHELL_ICE (each melts after a while).
function _iceTopUp(g) {
    _icePick(g.ice, SHELL_ICE - g.ice.size).forEach(([r, c]) => {
        const cell = document.getElementById('g-' + r + '-' + c);
        if (!cell) return;
        const el = document.createElement('span');
        el.className = 'sx-jelly-ice';
        cell.appendChild(el);
        g.ice.set(r + '-' + c, { el, r, c, left: SHELL_ICE_LIFE_MS[0] + Math.random() * (SHELL_ICE_LIFE_MS[1] - SHELL_ICE_LIFE_MS[0]) });
    });
}

// Melts the icy cells whose time ran out.
function _iceMelt(g, dtMs) {
    g.ice.forEach((e, key) => {
        e.left -= dtMs;
        if (e.left > 0) return;
        try { e.el.remove(); } catch (err) {}
        g.ice.delete(key);
    });
}

// The icy cell under a screen point (with a little padding), or null.
function _iceAt(g, x, y) {
    let found = null;
    g.ice.forEach(e => {
        const cell = found ? null : document.getElementById('g-' + e.r + '-' + e.c);
        if (!cell || !cell.isConnected) return;
        const r = cell.getBoundingClientRect();
        if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) found = e;
    });
    return found;
}

// Marks the ice as the goal: every icy cell glows green while a blob waits,
// only the locked landing cell once its shadow is down.
function _iceMarks(g) {
    const b = g.blob;
    g.ice.forEach(e => {
        const on = !!b && (b.rest > 0 || _iceAt(g, b.tx, b.ty) === e);
        e.el.classList.toggle('sx-jelly-ice-safe', on);
    });
}


//------------------------------------------------------------------------
//-------------------ICE SHELL (55%: two slips break it)------------------------------
//------------------------------------------------------------------------

// Lobs the next shell blob: it sits on the Jelly for a moment, then its
// shadow locks onto where you stand.
function _shellLob(g, run, m) {
    const from = _jlyBossCentre(m);
    const restEl = _nkEl(run, 'div', 'sx-jly-blob');
    restEl.style.transform = 'translate(' + Math.round(from.x - 22) + 'px,' + Math.round(from.y - 22) + 'px)';
    g.blob = { rest: SHELL_REST_MS, from, restEl, b: null, tx: 0, ty: 0 };
}

// Steps the shell blob: rest, then a normal blob jump; a landing on ice
// turns into a slip toward the Jelly. Returns 'slip', 'hit', 'miss' or null.
function _shellStep(g, run, dt) {
    const s = g.blob;
    if (s.slip) {
        s.slip.t += dt;
        const f = Math.min(1, s.slip.t / SLIP_MS);
        const x = s.b.tx + (s.slip.x - s.b.tx) * f, y = s.b.ty + (s.slip.y - s.b.ty) * f - Math.sin(f * Math.PI) * 70;
        s.b.el.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
        if (f < 1) return null;
        try { s.b.el.remove(); } catch (e) {}
        return 'slip';
    }
    if (s.rest > 0) {
        s.rest -= dt;
        if (s.rest <= 0) {
            try { s.restEl.remove(); } catch (e) {}
            s.b = _jlyBlob(run, s.from, _jlyPC(), SHELL_WARN_MS, SHELL_R, 1);
            s.tx = s.b.tx; s.ty = s.b.ty;
            g.ice.forEach(e => { e.el.classList.remove('sx-jelly-ice-flash'); void e.el.offsetWidth; e.el.classList.add('sx-jelly-ice-flash'); });
        }
        return null;
    }
    if (!_jlyStepBlob(s.b, dt)) return null;
    if (_iceAt(g, s.b.tx, s.b.ty)) {
        s.b.el.classList.add('sx-nk-jelly-slip');
        s.slip = { t: 0, ..._jlyBossCentre(globalThis._monsters.find(x => x && x.id === g.monsterId)) };
        return null;
    }
    const hit = _jlyUnder(s.b);
    try { s.b.el.remove(); } catch (e) {}
    return hit ? 'hit' : 'miss';
}

// Ice Shell: the Jelly turns immune and ices a few grid cells; every blob
// that lands on ice slides into it. Two slips break the shell (it also
// melts by itself after SHELL_MAX_MS, so the fight never stalls), then the
// normal phase-2 attacks start.
function _shellStart(monster) {
    if (!monster || _shell) return;
    monster.bossImmune = true;
    const run = _nkNewRun(monster.id, true);
    const g = { monsterId: monster.id, run, ice: new Map(), blob: null, next: SHELL_FIRST_MS, hits: 0, refill: 0, bubble: null, age: 0 };
    _shell = g;
    g.bubble = _nkEl(run, 'div', 'sx-jelly-bubble');
    run.onKill = () => {
        g.ice.forEach(e => { try { e.el.remove(); } catch (err) {} });
        g.ice.clear();
        if (_shell === g) _shell = null;
    };
    _iceTopUp(g);
    try { _renderPanel(); } catch (e) {}
    const clock = _jlyClock();
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        g.age += dt;
        _shellBubble(g);
        if (g.age >= SHELL_MAX_MS) {
            _shellShatter(monster, true);
            _shellBreak(monster);
            return false;
        }
        if (g.age >= SHELL_MAX_MS / 2) g.bubble.classList.add('sx-jelly-bubble-cracked');
        _iceMelt(g, dt);
        g.refill -= dt;
        if (g.refill <= 0) { _iceTopUp(g); g.refill = 700; }
        if (!g.blob) {
            g.next -= dt;
            if (g.next <= 0) _shellLob(g, run, monster);
            _iceMarks(g);
            return true;
        }
        const out = _shellStep(g, run, dt);
        _iceMarks(g);
        if (!out) return true;
        g.blob = null;
        g.next = SHELL_GAP_MS[0] + Math.random() * (SHELL_GAP_MS[1] - SHELL_GAP_MS[0]);
        if (out === 'hit') _jlyStrike(SHELL_DMG, monster.level || 1, 'Ice Shell');
        if (out !== 'slip') return true;
        g.hits++;
        _shellShatter(monster, g.hits >= SHELL_HITS);
        if (g.hits < SHELL_HITS) { g.bubble.classList.add('sx-jelly-bubble-cracked'); return true; }
        _shellBreak(monster);
        return false;
    });
}

// Keeps the shell bubble hugging the Jelly's card (the panel re-renders).
function _shellBubble(g) {
    const card = document.getElementById('sx-card-' + g.monsterId);
    const el = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const r = el ? el.getBoundingClientRect() : null;
    if (!r || !r.width) { g.bubble.style.display = 'none'; return; }
    const size = Math.max(r.width, r.height) + 34;
    g.bubble.style.display = '';
    g.bubble.style.left = Math.round(r.left + r.width / 2 - size / 2) + 'px';
    g.bubble.style.top = Math.round(r.top + r.height / 2 - size / 2) + 'px';
    g.bubble.style.width = g.bubble.style.height = size + 'px';
}

// A ring of ice shards bursts off the Jelly's card where a blob slammed in.
function _shellShatter(monster, big) {
    const p = _jlyBossCentre(monster);
    const s = document.createElement('div');
    s.className = 'sx-jelly-shatter' + (big ? '' : ' sx-jelly-shatter-small');
    s.style.left = Math.round(p.x) + 'px';
    s.style.top = Math.round(p.y) + 'px';
    document.body.appendChild(s);
    setTimeout(() => { try { s.remove(); } catch (e) {} }, 700);
}

// The shell breaks: the Jelly can be hurt again and its attacks resume.
function _shellBreak(monster) {
    monster.bossImmune = false;
    try { _renderPanel(); } catch (e) {}
    if (monster.bossPhase === 2) { try { _bossScheduleMechanics(monster, 2); } catch (e) {} }
}

// Phase hook: at 55% the shell takes over the phase (holds the immunity
// itself instead of the framework's short immune window).
function _jlyOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 2 || !monster) return false;
    _shellStart(monster);
    return true;
}

BOSS_MECHANICS.boss_jelly.onPhaseEnter = _jlyOnPhaseEnter;


//------------------------------------------------------------------------
//-------------------JELLY ARMY (10% finale)------------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _armyPauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases the Jelly and frees the charge bar.
function _armyEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _armyPauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_army === g) _army = null;
}

// Landing spots of one wave: one shadow on you, the others spread around
// you (kept on screen) so there is always a gap to walk to.
function _armyTargets(n) {
    const pc = _jlyPC();
    const out = [pc];
    const off = Math.random() * Math.PI * 2;
    const slots = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    for (let i = 0; i < n - 1; i++) {
        const a = off + slots[i] * Math.PI / 3;
        const x = pc.x + Math.cos(a) * ARMY_SPREAD, y = pc.y + Math.sin(a) * ARMY_SPREAD;
        out.push({ x: Math.max(40, Math.min(window.innerWidth - 40, x)), y: Math.max(60, Math.min(window.innerHeight - 60, y)) });
    }
    return out;
}

// Starts the finale: silences every other run of the Jelly, turns it immune
// and pours out wave after wave of blobs. One loop; every exit runs _armyEnd.
function _armyStart(monster) {
    if (_army || monster._jlyArmyDone) return;
    monster._jlyArmyDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _army = g;
    monster.bossImmune = true;
    _armyPauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _armyEnd(g);
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-jly');
    banner.innerHTML = '<div class="sx-nk-fin-title">JELLY ARMY</div>';
    const level = monster.level || 1;
    const puddles = [];
    const clock = _jlyClock();
    let stage = 'intro', t = 0, total = 0, wave = 0, blobs = [];
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt; total += dt;
        if (total > ARMY_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        _jlyStepPuddles(puddles, dt, ARMY_PUDDLE_DMG, level);
        if (stage === 'intro' || stage === 'gap') {
            if (t < (stage === 'intro' ? ARMY_INTRO_MS : ARMY_GAP_MS)) return true;
            if (wave >= ARMY_WAVES.length) return false;
            const w = ARMY_WAVES[wave];
            const from = _jlyBossCentre(monster);
            blobs = _armyTargets(w.n).map(to => _jlyBlob(run, from, to, w.ms, 70, 1));
            stage = 'wave'; t = 0;
            return true;
        }
        const w = ARMY_WAVES[wave];
        let landed = false;
        blobs.forEach(b => { if (_jlyStepBlob(b, dt)) landed = true; });
        if (!landed) return true;
        if (blobs.some(_jlyUnder)) _jlyStrike(w.dmg, level, 'Jelly Army');
        blobs.forEach(b => { _jlyPuddle(run, puddles, b.tx, b.ty); try { b.el.remove(); } catch (e) {} });
        blobs = []; wave++; stage = 'gap'; t = 0;
        return true;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _jlyOnInit(monster) {
    if (!monster || monster._jlyWatch) return;
    monster._jlyWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._jlyArmyDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _armyStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_jelly.onInit = _jlyOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element the Jelly created and frees the charge bar.
export function _jlyTeardown() {
    if (_army) { try { _armyEnd(_army); } catch (e) {} }
    document.querySelectorAll('.sx-jly-blob, .sx-jly-shadow, .sx-jly-puddle, .sx-jly-lane, .sx-jly-drop, ' +
        '.sx-jelly-ice, .sx-jelly-bubble, .sx-jelly-shatter, .sx-nk-fin-jly').forEach(el => { try { el.remove(); } catch (e) {} });
    _armyPauseCharge(false);
}

// Console hook for playtests: _JLY_DEBUG.fire('hops'|'split', phase), .shell(), .final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_jelly');
    window._JLY_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { hops: _mechJellyHops, split: _mechJellySplit }[name];
            if (!m) return 'no jelly alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        shell: () => { const m = find(); if (!m) return 'no jelly alive'; _shellStart(m); return 'shell up'; },
        final: () => { const m = find(); if (!m) return 'no jelly alive'; _armyStart(m); return 'finale started'; },
    };
}
