//------------------------------------------------------------------------
//-------------------TOUCH CLUE RULERS (zoomed puzzles)-------------------
//------------------------------------------------------------------------
// The puzzle's row and column clues are ordinary table cells at its left and
// top edge, so they scroll out of view as soon as the puzzle is zoomed in
// and panned. On a phone that happens all the time (large puzzles are only
// playable zoomed in), and a puzzle without its clues cannot be solved.
//
// On every device (PC included), this module pins a copy of the
// clues for the rows and columns currently on screen to the left and top
// edge of the play area, only for the side that has actually scrolled away.
// The copies are read-only and let touches pass through to the cells below.
// Clue numbers are read from the live table (rn-<row>-<k> / cn-<col>-<k>),
// so solved-line dimming and clue-side toggles keep working.
//
// Does nothing while the whole puzzle is in view (no clue has scrolled away).
//
// Side-effect module (no exports).

const REFRESH_MS = 250;
const EDGE_SLACK_PX = 2;

let rowBox = null;
let colBox = null;
const rowPool = new Map();   // row index -> element
const colPool = new Map();   // col index -> element

function ensureBoxes() {
    if (rowBox) return;
    rowBox = document.createElement('div');
    rowBox.id = 'touch-clue-rows';
    colBox = document.createElement('div');
    colBox.id = 'touch-clue-cols';
    document.body.append(rowBox, colBox);
}

function hideAll() {
    if (!rowBox) return;
    rowBox.hidden = true;
    colBox.hidden = true;
}

function numbersOf(prefix, index) {
    // Shorter lines are bottom/right-aligned, so their ids do not start at 0:
    // collect by prefix (document order = reading order), never by counting.
    // Each entry carries its struck-out state (clue-done) from the live table.
    const out = [];
    document.querySelectorAll(`[id^="${prefix}-${index}-"]`).forEach(el => {
        const text = el.textContent.trim();
        if (text) out.push({ text, done: el.classList.contains('clue-done') });
    });
    return out;
}

function solvedOf(cellClass, index) {
    const cell = document.querySelector(`#ptable td.${cellClass}-${index}`);
    return !!cell && cell.classList.contains('clue-line-solved');
}

function fill(el, numbers, solved) {
    const text = numbers.map(n => n.text + (n.done ? '!' : '')).join(' ');
    if (el.dataset.t !== text) {
        el.dataset.t = text;
        el.textContent = '';
        for (const n of numbers) {
            const s = document.createElement('span');
            s.textContent = n.text;
            if (n.done) s.className = 'clue-done';
            el.appendChild(s);
        }
    }
    el.classList.toggle('touch-clue-solved', solved);
}

function prune(pool, keep) {
    for (const [i, el] of pool) {
        if (!keep.has(i)) {
            el.remove();
            pool.delete(i);
        }
    }
}

function update() {
    const first = document.getElementById('g-0-0');
    const scroller = first ? document.querySelector('#screen-game .game-main') : null;
    // The win/lose screens sit over the puzzle; the pinned copies must not float on top of them.
    if (!first || !scroller || !first.offsetParent || document.querySelector('#ov-win.show, #ov-lose.show')) {
        hideAll();
        return;
    }
    ensureBoxes();

    const view = scroller.getBoundingClientRect();
    const g00 = first.getBoundingClientRect();
    const rows = document.querySelectorAll('#ptable tr').length;   // upper bound; the loop stops at the first missing cell
    const needRows = g00.left < view.left + EDGE_SLACK_PX;
    const needCols = g00.top < view.top + EDGE_SLACK_PX;

    // ---- row clues: left edge ----
    const keepRows = new Set();
    if (needRows) {
        for (let i = 0; i < rows; i++) {
            const cell = document.getElementById(`g-${i}-0`);
            if (!cell) break;
            const r = cell.getBoundingClientRect();
            if (r.bottom < view.top || r.top > view.bottom) continue;
            keepRows.add(i);
            let el = rowPool.get(i);
            if (!el) {
                el = document.createElement('div');
                el.className = 'touch-clue touch-clue-row';
                rowBox.appendChild(el);
                rowPool.set(i, el);
            }
            fill(el, numbersOf('rn', i), solvedOf('rct', i));
            el.style.top = r.top + 'px';
            el.style.height = r.height + 'px';
            el.style.left = Math.max(view.left, 0) + 'px';
            el.style.fontSize = Math.max(10, Math.min(18, r.height * 0.55)) + 'px';
        }
    }
    prune(rowPool, keepRows);
    rowBox.hidden = !needRows;

    // ---- column clues: top edge ----
    const keepCols = new Set();
    if (needCols) {
        for (let j = 0; ; j++) {
            const cell = document.getElementById(`g-0-${j}`);
            if (!cell) break;
            const r = cell.getBoundingClientRect();
            if (r.right < view.left || r.left > view.right) continue;
            keepCols.add(j);
            let el = colPool.get(j);
            if (!el) {
                el = document.createElement('div');
                el.className = 'touch-clue touch-clue-col';
                colBox.appendChild(el);
                colPool.set(j, el);
            }
            fill(el, numbersOf('cn', j), solvedOf('cch', j));
            el.style.left = r.left + 'px';
            el.style.width = r.width + 'px';
            el.style.top = Math.max(view.top, 0) + 'px';
            el.style.fontSize = Math.max(10, Math.min(18, r.width * 0.55)) + 'px';
        }
    }
    prune(colPool, keepCols);
    colBox.hidden = !needCols;
}

function init() {
    setInterval(update, REFRESH_MS);
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
}

document.addEventListener('DOMContentLoaded', init, { once: true });
