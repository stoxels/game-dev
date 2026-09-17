import { _clueColCount, _clueColWidth, _rowCluesOnRight } from '../../grid.js';
import { _fxGetPuzzleRect } from './fx-helpers.js';

//------------------------------------------------------------------------
//-------------------SHARED - CLUE BLACKOUT----------------------
//------------------------------------------------------------------------

// Applies / removes the clue-blackout CSS class on row and column clue
// elements and draws the ticking countdown badge. Shared by all cursed
// items whose downside hides clues.

// Tracks the active countdown badge per axis so overlapping cursed
// effects (e.g. two row-blackouts back to back) don't leak old badges.
let _blackoutCountdownState = { row: null, col: null };


// Tracks the pending "remove blackout class" timeout per axis, so a
// refreshed blackout (e.g. using Chaos Grid twice in a row) cancels the
// old removal instead of letting it fire early.
let _blackoutRemovalTimeout = { row: null, col: null };


// Clears any pending removal timeout for the given axis without touching
// the DOM classes themselves (those get reapplied/extended by the new call).
function _clearBlackoutRemoval(type) {
    if (_blackoutRemovalTimeout[type]) {
        clearTimeout(_blackoutRemovalTimeout[type]);
        _blackoutRemovalTimeout[type] = null;
    }
}


// Removes and clears the countdown badge for the given axis ('row'|'col').
export function _clearBlackoutCountdown(type) {
    const state = _blackoutCountdownState[type];
    if (!state) return;
    clearInterval(state.intervalId);
    state.el.remove();
    _blackoutCountdownState[type] = null;
}


// Repositions the badge centered over the row-clue strip or the
// column-clue header block, based on the puzzle grid's current rect.
function _positionBlackoutCountdown(type, el) {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    if (type === 'row') {
        const onRight = typeof _rowCluesOnRight !== 'undefined' && _rowCluesOnRight;
        const clueWidth = (_clueColWidth || 24) * (_clueColCount || 1);
        const cx = onRight ? r.right + clueWidth / 2 : r.left - clueWidth / 2;
        el.style.left = `${cx}px`;
        el.style.top = `${r.top + r.height / 2}px`;
    } else {
        const firstHeader = document.querySelector('.cch');
        let headerTop = r.top - 20;
        if (firstHeader) {
            const wrapRect = r.wrap.getBoundingClientRect();
            const hRect = firstHeader.getBoundingClientRect();
            const zoom = globalThis.currentZoom || 1;
            headerTop = (hRect.top - wrapRect.top) / zoom;
        }
        el.style.left = `${r.left + r.width / 2}px`;
        el.style.top = `${(headerTop + r.top) / 2}px`;
    }
}


// Creates (or restarts) a ticking countdown badge over the row-clue
// strip or column-clue header for durationMs, then removes itself.
function _startBlackoutCountdown(type, durationMs) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    _clearBlackoutCountdown(type);

    const el = document.createElement('div');
    el.className = `blackout-countdown blackout-countdown-${type}`;
    wrap.appendChild(el);

    let remaining = Math.ceil(durationMs / 1000);
    el.textContent = remaining;
    _positionBlackoutCountdown(type, el);

    const intervalId = setInterval(() => {
        remaining--;
        if (remaining <= 0) { _clearBlackoutCountdown(type); return; }
        el.textContent = remaining;
        _positionBlackoutCountdown(type, el);
    }, 1000);

    _blackoutCountdownState[type] = { el, intervalId };
}


// Cancels any pending removal for the axis and schedules the class removal
// after durationMs. Row clues match .rct-*, col clues .cch-*.
function _scheduleBlackoutRemoval(type, durationMs) {
    const sel = type === 'row' ? '[class*="rct-"]' : '[class*="cch-"]';
    _clearBlackoutRemoval(type);
    _blackoutRemovalTimeout[type] = setTimeout(() => {
        document.querySelectorAll(`${sel}.clue-blackout`)
            .forEach(el => el.classList.remove('clue-blackout'));
        _blackoutRemovalTimeout[type] = null;
    }, durationMs);
}


// Blacks out every row-clue cell for durationMs (default 30s), with a
// ticking countdown badge over the row-clue strip.
export function applyCursedRowBlackout(durationMs = 30000) {
    if (!globalThis.cur) return;

    const rows = globalThis.cur.grid.length;
    for (let r = 0; r < rows; r++) {
        document.querySelectorAll(`.rct-${r}`)
            .forEach(el => el.classList.add('clue-blackout'));
    }

    _startBlackoutCountdown('row', durationMs);

    _scheduleBlackoutRemoval('row', durationMs);
}


// Blacks out every column-clue header cell for durationMs, with a
// ticking countdown badge over the column-clue header block.
export function applyCursedColBlackout(durationMs) {
    if (!globalThis.cur) return;

    const cols = globalThis.cur.grid[0].length;
    for (let c = 0; c < cols; c++) {
        document.querySelectorAll(`.cch-${c}`)
            .forEach(el => el.classList.add('clue-blackout'));
    }

    _startBlackoutCountdown('col', durationMs);

    _scheduleBlackoutRemoval('col', durationMs);
}
