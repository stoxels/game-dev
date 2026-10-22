import { sfkBeam, sfkHeroPoint, sfkPlay, sfkPointLayer } from '../skills/spell-fx-kit.js';
import { CLASS_SKILL_FX } from '../skills/spell-fx-recipes.js';
// class-skill-fx.js
//------------------------------------------------------------------------
//------------------------CLASS SKILL FLOURISHES--------------------------
//------------------------------------------------------------------------
// A cast flourish for every class / ascendency active, styled after its
// hotbar icon, played on top of the skill's own grid effects. Purely
// cosmetic; recipes live in CLASS_SKILL_FX (js/skills/spell-fx-recipes.js).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------GRID GEOMETRY--------------------------------
//------------------------------------------------------------------------

// Viewport rect of one grid cell, or null when it is not on screen.
function _csfxCellRect(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width > 0) ? r : null;
}

// Viewport rect covering the whole puzzle grid (first to last cell), or null.
function _csfxGridRect() {
    const first = document.getElementById('g-0-0');
    if (!first) return null;
    const cells = document.querySelectorAll('[id^="g-"]');
    const last = cells.length ? cells[cells.length - 1] : first;
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    if (!(a.width > 0)) return null;
    return { left: a.left, top: a.top, right: b.right, bottom: b.bottom, width: b.right - a.left, height: b.bottom - a.top };
}

// A fixed layer covering a rect, so % positions and scatter ranges map onto
// the grid (or a cell). Lives `ms`.
function _csfxBoxLayer(rect, ms) {
    const layer = sfkPointLayer(rect.left, rect.top, ms, 'sfk-layer-box sfk-front');
    if (layer) {
        layer.style.width = `${rect.width}px`;
        layer.style.height = `${rect.height}px`;
    }
    return layer;
}


//------------------------------------------------------------------------
//---------------------------LIGHT LINES----------------------------------
//------------------------------------------------------------------------

// Draws light lines through a cell across the grid: 'cross' (its row and
// column) or 'diag' (both diagonals). `css` picks the line colour.
function _csfxLines(kind, cell, grid, css, ms) {
    const cx = cell.left + cell.width / 2;
    const cy = cell.top + cell.height / 2;
    const html = '<span class="sfx-cline-glow"></span><span class="sfx-cline-core"></span>';
    if (kind === 'cross') {
        sfkBeam({ x: grid.left, y: cy }, { x: grid.right, y: cy }, 'sfx-cline ' + css, ms, html);
        sfkBeam({ x: cx, y: grid.top }, { x: cx, y: grid.bottom }, 'sfx-cline ' + css, ms, html);
        return;
    }
    if (kind === 'diag') {
        // Each diagonal runs until it leaves the grid on either side.
        const reach = (dx, dy) => {
            const tx = dx > 0 ? (grid.right - cx) / dx : (grid.left - cx) / dx;
            const ty = dy > 0 ? (grid.bottom - cy) / dy : (grid.top - cy) / dy;
            const t = Math.min(tx, ty);
            return { x: cx + dx * t, y: cy + dy * t };
        };
        sfkBeam(reach(-1, -1), reach(1, 1), 'sfx-cline ' + css, ms, html);
        sfkBeam(reach(-1, 1), reach(1, -1), 'sfx-cline ' + css, ms, html);
    }
}


//------------------------------------------------------------------------
//---------------------------ENTRY POINT----------------------------------
//------------------------------------------------------------------------

// Plays the flourish of a class skill. row/col (optional) is the targeted
// cell; without one the cell steps play on the grid centre. opts.sweep
// ('rows' | 'cols') flips the grid sweep direction (Data Strike).
export function playClassSkillFlourish(skillId, row, col, opts) {
    try {
        const fx = CLASS_SKILL_FX[skillId];
        if (!fx || typeof document === 'undefined') return;
        const grid = _csfxGridRect();
        const hasCell = Number.isInteger(row) && Number.isInteger(col);
        const cell = hasCell ? _csfxCellRect(row, col) : null;
        const ms = fx.ms || 2200;
        if (fx.hero) {
            const h = sfkHeroPoint();
            if (h) sfkPlay(sfkPointLayer(h.x, h.y, ms, 'sfk-front'), fx.hero);
        }
        if (fx.grid && grid) {
            const layer = _csfxBoxLayer(grid, ms);
            // Row strikes sweep a horizontal band down the board, column strikes a
            // vertical band across it.
            if (layer && opts && opts.sweep === 'rows') layer.classList.add('is-rows');
            sfkPlay(layer, fx.grid);
        }
        const focus = cell || grid;
        if (fx.cell && focus) {
            const c = { left: focus.left + focus.width / 2, top: focus.top + focus.height / 2 };
            sfkPlay(sfkPointLayer(c.left, c.top, ms, 'sfk-front'), fx.cell);
        }
        if (fx.lines && cell && grid) _csfxLines(fx.lines, cell, grid, fx.lineCss || '', fx.lineMs || 900);
    } catch (e) { /* flourish is cosmetic */ }
}
