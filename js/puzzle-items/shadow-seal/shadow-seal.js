import { Audio_Manager } from '../../audio/audio.js';
import { renderCell } from '../../grid.js';
import { questStat_shadowSealUsed } from '../../quests/quests-stats.js';
import { setTimeSecs } from '../../timer/timer-adjust.js';
import { t } from '../../translation/translations.js';
import { _applyCellEffect } from '../../puzzle-mechanics/cell-fx.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { FX_Z, PARTICLES, _fxGetPuzzleRect, _fxMakeIcon, _fxOverlay, _fxSpawnParticles } from '../../puzzle-mechanics/fx-helpers.js';
import { shuffle } from '../../puzzle-mechanics/puzzle-helpers.js';

//------------------------------------------------------------------------
//-------------------SHADOW SEAL----------------------
//------------------------------------------------------------------------

// shadowSeal - sets the timer to exactly 5 min, permanently hides all
// clues for the rest of the level, and mass-marks 75 % of empty cells.
export function _useShadowSeal(id, def) {
    questStat_shadowSealUsed();
    if (!globalThis.cur) return '';

    // 1. Hard-set the timer to exactly 5 minutes
    setTimeSecs(300);

    // 2. Permanently hide all row and column clues for this level
    window._shadowSealActive = true;
    document.querySelectorAll('.row-clue, .col-clue, [class*="rct-"], [class*="cch-"]')
        .forEach(el => el.classList.add('clue-blackout'));

    // 3. Mark 75% of all empty non-solution cells as wrong
    const sol = globalThis.cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const cands = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 0 && (globalThis.userGrid[r][c] === 0 || globalThis.userGrid[r][c] === 3) && !globalThis.wrongGrid?.[r]?.[c]) {
                cands.push([r, c]);
            }
        }
    }

    const markCount = Math.floor(cands.length * 0.75);
    shuffle(cands);
    const affected = [];
    cands.slice(0, markCount).forEach(([r, c]) => {
        globalThis.userGrid[r][c] = 2;
        globalThis.systemMarkedGrid[r][c] = true;
        renderCell(r, c);
        affected.push(`g-${r}-${c}`);
    });
    _applyCellEffect(affected, 'mark');

    playItemEffect(id);
    return `${def.icon} ${t('itm_shadow_seal_used').replace('{n}', markCount)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Injects the veil keyframes used by _fxMakeShadowVeil (once).
function _ensureShadowVeilStyles() {
    if (document.getElementById('fx-shadow-seal-style')) return;
    const style = document.createElement('style');
    style.id = 'fx-shadow-seal-style';
    style.textContent = `
        @keyframes fx-shadow-seal-veil {
            0%   { background: rgba(0,0,0,0);    }
            60%  { background: rgba(0,0,0,0.55); }
            100% { background: rgba(0,0,0,0);    }
        }
    `;
    document.head.appendChild(style);
}

// Helper: creates the dark void veil that briefly obscures the grid.
export function _fxMakeShadowVeil(container, r) {
    _ensureShadowVeilStyles();
    const veil = document.createElement('div');
    veil.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
        background:rgba(0,0,0,0);
        animation:fx-shadow-seal-veil 1.5s ease-in forwards;
    `;
    container.appendChild(veil);
}

// 🌑 Shadow Seal - dark void engulfs the puzzle, then disperses.
export function _fxShadowSeal() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2200, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeShadowVeil(overlay, r);

    // Dark void particles spreading from the centre
    _fxSpawnParticles({
        ...PARTICLES.shadowVoid,
        count: 20, sizeMin: 8, sizeMax: 18,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 1600, cssClass: 'fx-cursed-cross',
    });

    _fxMakeIcon(r.wrap, '🌑', cx, cy, 88,
        `z-index:${FX_Z.supreme}; animation:fx-artifact-icon 1.8s ease-out forwards;`, 2200);

    Audio_Manager.playSFX('shadow_seal');
}
