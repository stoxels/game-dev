import { BOSS_MECHANICS } from './boss-framework.js';
import { _nkBossAlive, _nkEl, _nkKillRun, _nkLoop, _nkNewRun, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';
import { WARDEN_COLOR, _wardenPC, _wardenSparks, _wardenTouch } from './boss-warden.js';

//------------------------------------------------------------------------
//-------------------THE WARDEN: LOCKDOWN (finale, <=10%)-----------------------
//------------------------------------------------------------------------
// The arena is locked down into six cells (3 x 2) divided by electric
// fences. Every fence has GATES, and a few seconds after the siren the
// current surges through every cell that is not lit green. Walk through a
// gate into a green cell before the countdown ends - crossing a fence
// anywhere else shocks you. The last rounds slam the gates SHUT and open
// new ones halfway through the countdown. The Warden is immune throughout.
//------------------------------------------------------------------------

const COLS = 3, ROWS = 2;
const GATE_HALF = 70;               // px half-width of a gate in a fence
const FENCE_DMG = 0.10;             // %maxHP for crossing a fence outside a gate
const FENCE_REACH = 15;             // px from a fence that counts as touching
const GAP_MS = 1100;                // breather between rounds
const SHIFT_BONUS_MS = 700;         // extra time after the gates re-open
const MAX_SAFE_HOPS = 2;            // the green cell is never further than this many gates away
const ROUNDS = [
    { safe: 3, ms: 3600, dmg: 0.28, extraGates: 1, label: 'Cell Block Surge' },
    { safe: 2, ms: 3300, dmg: 0.32, extraGates: 1, label: 'Cell Block Surge' },
    { safe: 2, ms: 3000, dmg: 0.36, extraGates: 0, label: 'Cell Block Surge' },
    { safe: 1, ms: 3000, dmg: 0.40, extraGates: 0, shift: true, label: 'Gates Shift' },
    { safe: 1, ms: 2800, dmg: 0.46, extraGates: 0, shift: true, label: 'Total Lockdown' },
];


//------------------------------------------------------------------------
//-------------------GEOMETRY----------------------------------------------
//------------------------------------------------------------------------

// The playable area (the strip along the bottom belongs to the inventory bar).
function _area() {
    return { W: window.innerWidth, H: window.innerHeight - 70 };
}

// The cell (0..5) a point is standing in.
function _cellOf(x, y) {
    const { W, H } = _area();
    const c = Math.max(0, Math.min(COLS - 1, Math.floor(x / (W / COLS))));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor(y / (H / ROWS))));
    return r * COLS + c;
}

// The seven fences between neighbouring cells, each a straight segment.
function _fenceList() {
    const { W, H } = _area();
    const cw = W / COLS, ch = H / ROWS, list = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 1; c++) {
            list.push({ a: r * COLS + c, b: r * COLS + c + 1, x1: (c + 1) * cw, y1: r * ch, x2: (c + 1) * cw, y2: (r + 1) * ch, gate: false, gateAt: 0.5 });
        }
    }
    for (let c = 0; c < COLS; c++) {
        list.push({ a: c, b: COLS + c, x1: c * cw, y1: ch, x2: (c + 1) * cw, y2: ch, gate: false, gateAt: 0.5 });
    }
    return list;
}

// Opens a random spanning set of gates (every cell stays reachable) plus
// `extra` more, at random spots along their fences.
function _pickGates(fences, extra) {
    const parent = [0, 1, 2, 3, 4, 5];
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const order = fences.slice().sort(() => Math.random() - 0.5);
    fences.forEach(f => { f.gate = false; f.gateAt = 0.28 + Math.random() * 0.44; });
    const spare = [];
    for (const f of order) {
        const ra = find(f.a), rb = find(f.b);
        if (ra !== rb) { parent[ra] = rb; f.gate = true; } else spare.push(f);
    }
    for (let i = 0; i < extra && i < spare.length; i++) spare[i].gate = true;
}

// How many gates apart every cell is from `from` (breadth-first over open gates).
function _gateDistances(fences, from) {
    const dist = [-1, -1, -1, -1, -1, -1];
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        for (const f of fences) {
            if (!f.gate) continue;
            const nxt = f.a === cur ? f.b : (f.b === cur ? f.a : -1);
            if (nxt >= 0 && dist[nxt] < 0) { dist[nxt] = dist[cur] + 1; queue.push(nxt); }
        }
    }
    return dist;
}

// The solid pieces of every fence (a gated fence has a hole in it).
function _solidPieces(fences) {
    const out = [];
    for (const f of fences) {
        const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
        const ux = (f.x2 - f.x1) / len, uy = (f.y2 - f.y1) / len;
        const spans = f.gate
            ? [[0, f.gateAt * len - GATE_HALF], [f.gateAt * len + GATE_HALF, len]]
            : [[0, len]];
        for (const [s, e] of spans) {
            if (e - s > 4) out.push({ x1: f.x1 + ux * s, y1: f.y1 + uy * s, x2: f.x1 + ux * e, y2: f.y1 + uy * e, vertical: Math.abs(uy) > 0.5 });
        }
    }
    return out;
}


//------------------------------------------------------------------------
//-------------------DRAWING-----------------------------------------------
//------------------------------------------------------------------------

// Draws the solid fence pieces and green gate frames; returns the elements.
function _drawFences(run, fences, pieces) {
    const els = [];
    for (const s of pieces) {
        const el = _nkEl(run, 'div', 'sx-ward-fence' + (s.vertical ? ' sx-ward-fence-v' : ' sx-ward-fence-h'));
        el.style.left = Math.round(Math.min(s.x1, s.x2) - (s.vertical ? 6 : 0)) + 'px';
        el.style.top = Math.round(Math.min(s.y1, s.y2) - (s.vertical ? 0 : 6)) + 'px';
        if (s.vertical) el.style.height = Math.round(Math.abs(s.y2 - s.y1)) + 'px';
        else el.style.width = Math.round(Math.abs(s.x2 - s.x1)) + 'px';
        els.push(el);
    }
    for (const f of fences) {
        if (!f.gate) continue;
        const vertical = f.x1 === f.x2;
        const gx = vertical ? f.x1 : f.x1 + (f.x2 - f.x1) * f.gateAt;
        const gy = vertical ? f.y1 + (f.y2 - f.y1) * f.gateAt : f.y1;
        const el = _nkEl(run, 'div', 'sx-ward-gate' + (vertical ? ' sx-ward-gate-v' : ' sx-ward-gate-h'));
        el.style.left = Math.round(gx - (vertical ? 9 : GATE_HALF)) + 'px';
        el.style.top = Math.round(gy - (vertical ? GATE_HALF : 9)) + 'px';
        els.push(el);
    }
    return els;
}

// One tinted overlay per cell (green = safe, red = surge) with a countdown.
function _drawCells(run, safeSet) {
    const { W, H } = _area();
    const cw = W / COLS, ch = H / ROWS, cells = [];
    for (let i = 0; i < COLS * ROWS; i++) {
        const safe = safeSet.has(i);
        const el = _nkEl(run, 'div', 'sx-ward-cell ' + (safe ? 'sx-ward-cell-safe' : 'sx-ward-cell-danger'));
        el.style.left = Math.round((i % COLS) * cw) + 'px';
        el.style.top = Math.round(Math.floor(i / COLS) * ch) + 'px';
        el.style.width = Math.round(cw) + 'px';
        el.style.height = Math.round(ch) + 'px';
        el.innerHTML = '<span class="sx-ward-cell-count"></span>';
        cells.push({ el, count: el.firstChild, safe });
    }
    return cells;
}


//------------------------------------------------------------------------
//-------------------THE FINALE--------------------------------------------
//------------------------------------------------------------------------

// A re-pick of the gates that keeps the nearest green cell within reach of
// where the player stands now (so a shift is dramatic, never unfair).
function _shiftGates(fences, safeSet, fromCell) {
    for (let tries = 0; tries < 40; tries++) {
        _pickGates(fences, 0);
        const dist = _gateDistances(fences, fromCell);
        const best = Math.min(...Array.from(safeSet).map(i => dist[i]));
        if (best <= MAX_SAFE_HOPS) return;
    }
}

// Picks this round's green cells: never the cell you stand in, always within
// MAX_SAFE_HOPS gates.
function _pickSafe(fences, fromCell, count) {
    const dist = _gateDistances(fences, fromCell);
    let pool = dist.map((d, i) => ({ d, i })).filter(o => o.d >= 1 && o.d <= MAX_SAFE_HOPS).map(o => o.i);
    if (!pool.length) pool = dist.map((_d, i) => i).filter(i => i !== fromCell);
    pool.sort(() => Math.random() - 0.5);
    return new Set(pool.slice(0, Math.min(count, pool.length)));
}

// Releases the surge: every red cell flashes; standing in one is a hit.
function _surge(run, state, level, round) {
    const pc = _wardenPC();
    const here = _cellOf(pc.x, pc.y);
    state.cells.forEach((c, i) => {
        if (c.safe) return;
        c.el.classList.add('sx-ward-cell-strike');
        const { W, H } = _area();
        const cw = W / COLS, ch = H / ROWS;
        _wardenSparks(run, (i % COLS) * cw + cw * (0.2 + Math.random() * 0.6), Math.floor(i / COLS) * ch + ch * (0.2 + Math.random() * 0.6), 5);
    });
    if (!state.cells[here].safe) _wardenTouch(round.dmg, level, round.label, true);
}

// Builds a round: fences, gates, green cells and the countdown.
function _startRound(run, state) {
    const round = ROUNDS[state.round];
    const pc = _wardenPC();
    state.fromCell = _cellOf(pc.x, pc.y);
    _pickGates(state.fences, round.extraGates);
    state.safeSet = _pickSafe(state.fences, state.fromCell, round.safe);
    state.pieces = _solidPieces(state.fences);
    state.fenceEls = _drawFences(run, state.fences, state.pieces);
    state.cells = _drawCells(run, state.safeSet);
    state.t = 0;
    state.shifted = !round.shift;
    state.ms = round.ms;
    state.hint.textContent = (state.safeSet.size > 1 ? 'Get into a GREEN cell - through a GATE!' : 'Get into the GREEN cell - through a GATE!')
        + '  (' + (state.round + 1) + '/' + ROUNDS.length + ')';
}

// Halfway through a shifting round the gates slam shut and re-open elsewhere.
function _doShift(run, state) {
    state.shifted = true;
    state.fenceEls.forEach(el => { try { el.remove(); } catch (e) { /* already gone */ } });
    const pc = _wardenPC();
    _shiftGates(state.fences, state.safeSet, _cellOf(pc.x, pc.y));
    state.pieces = _solidPieces(state.fences);
    state.fenceEls = _drawFences(run, state.fences, state.pieces);
    state.ms += SHIFT_BONUS_MS;
    _nkToast('eg_mech_warden_shift', '🗼 The gates SLAM shut - new gates open!', WARDEN_COLOR);
}

// Shocks the player for brushing a fence anywhere but a gate.
function _fenceTouch(state, level) {
    const pc = _wardenPC();
    for (const s of state.pieces) {
        if (_ptSegDist(pc.x, pc.y, s.x1, s.y1, s.x2, s.y2) < FENCE_REACH) {
            _wardenTouch(FENCE_DMG, level, 'Electric Fence');
            return;
        }
    }
}

// The finale's frame-by-frame logic: gap -> countdown -> surge -> next round.
function _lockdownTick(run, state, level, dtS) {
    state.t += dtS * 1000;
    if (state.stage === 'gap') {
        if (state.t < GAP_MS) return true;
        if (state.round >= ROUNDS.length) return false;
        state.stage = 'count';
        _startRound(run, state);
        return true;
    }
    const round = ROUNDS[state.round];
    if (!state.shifted && state.t >= state.ms * 0.5) _doShift(run, state);
    _fenceTouch(state, level);
    const left = state.ms - state.t;
    state.cells.forEach(c => { c.count.textContent = c.safe ? '✓' : (left > 0 ? String(Math.ceil(left / 1000)) : ''); });
    if (left > 0) return true;
    _surge(run, state, level, round);
    const old = state.cells.map(c => c.el).concat(state.fenceEls);
    setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) { /* already gone */ } }), 650);
    state.pieces = [];
    state.round++;
    state.stage = 'gap';
    state.t = 0;
    return true;
}

// Starts LOCKDOWN: takes over the arena, makes the Warden immune and runs
// the five rounds. Immunity is released when the run ends.
function _wardenLockdown(monster) {
    if (!monster || monster._wardenLockdownDone) return;
    monster._wardenLockdownDone = true;
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) { /* already gone */ } }
    });
    const run = _nkNewRun(monster.id, false);
    run.passive = true;
    monster.bossImmune = true;
    monster._wardenLockdown = true;   // the other Warden casts hold off while the arena is sealed
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-nk-shielded');
    run.onKill = () => {
        try { monster.bossImmune = false; monster._wardenLockdown = false; } catch (e) { /* monster gone */ }
        if (wrap) wrap.classList.remove('sx-nk-shielded');
    };
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-storm');
    banner.innerHTML = '<div class="sx-nk-fin-title"></div><div class="sx-nk-fin-hint"></div>';
    banner.querySelector('.sx-nk-fin-title').textContent = '🗼 LOCKDOWN';
    const hint = banner.querySelector('.sx-nk-fin-hint');
    hint.textContent = 'The arena is sealed into cells - move through the GATES!';
    _nkToast('eg_mech_warden_final', '🗼💀 LOCKDOWN - run the gates into the green cell before the surge!', WARDEN_COLOR);
    const state = {
        stage: 'gap', t: 0, round: 0, hint, fences: _fenceList(), pieces: [], fenceEls: [], cells: [],
        safeSet: new Set(), fromCell: 0, shifted: true, ms: 0,
    };
    const level = monster.level || 1;
    _nkLoop(run, (dtS) => {
        if (!_nkBossAlive(monster.id)) return false;
        return _lockdownTick(run, state, level, dtS);
    });
}

// A passive watcher: at 10% HP (once the Warden is vulnerable) LOCKDOWN begins.
function _wardenWatchLockdown(monster) {
    if (!monster || monster._wardenLockdownWatch) return;
    monster._wardenLockdownWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._wardenLockdownDone) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune) {
            _wardenLockdown(monster);
            return false;
        }
        return true;
    });
}

// The framework calls onInit when the Warden spawns.
BOSS_MECHANICS.boss_warden.onInit = _wardenWatchLockdown;
