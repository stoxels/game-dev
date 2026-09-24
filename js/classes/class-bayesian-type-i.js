import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { renderCell, updClues } from '../grid.js';
import { t } from '../translation/translations.js';
import { _setAbilityMode } from './class-abilities.js';
import { cooldownState } from './class-cooldown-state.js';
import { buildClassHUD } from './class-hud.js';
import { questStat_classRevealUsed, updateQuestStats } from '../inference/inference-stats.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//-----------------TYPE I ERROR SHIELD------------------------------------
//------------------------------------------------------------------------
// Type I Error Shield marks random empty cells as protected.
// A wrong fill on a protected cell becomes a mark; an optional bonus reveals a correct cell.



//------------------------------------------------------------------------
//-----------------TYPE I SHIELD HELPERS----------------------------------
//------------------------------------------------------------------------

// Returns a shuffled list of empty cells eligible for shielding.
function _typeIGetEligibleCells() {
    if (!cur) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const shielded = window._typeIShieldedCells || new Set();
    const eligible = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 0
                && globalThis.revealedGrid[r][c] !== true
                && !shielded.has(`${r}-${c}`)) {
                eligible.push([r, c]);
            }
        }
    }

    // Fisher-Yates shuffle for uniform random seeding
    for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    return eligible;
}

// Registers shielded cells and staggers their reveal animation.
function _typeISeedShieldedCells(cells) {
    cells.forEach(([r, c], index) => {
        window._typeIShieldedCells.add(`${r}-${c}`);

        const cellEl = document.getElementById(`g-${r}-${c}`);
        if (!cellEl) return;

        // Stagger bursts so they don't all fire simultaneously
        setTimeout(() => {
            const matrixFlash = document.createElement('div');
            matrixFlash.style.cssText = `
                position: absolute; inset: 0; background: rgba(46, 204, 113, 0.4);
                z-index: 10; pointer-events: none; border-radius: inherit;
                animation: type1-matrix-sweep 0.8s ease-out forwards;
            `;
            if (getComputedStyle(cellEl).position === 'static') cellEl.style.position = 'relative';
            cellEl.appendChild(matrixFlash);
            setTimeout(() => matrixFlash.remove(), 800);
        }, index * 120);
    });
}

// Creates a keyframe for one shard's trajectory and returns its name.
function _typeIInjectShardKeyframe(row, col, shardIndex, tx, ty, rotation) {
    const animName = `shard-fly-${row}-${col}-${shardIndex}`;
    if (!document.getElementById(animName)) {
        const style = document.createElement('style');
        style.id = animName;
        style.textContent = `
            @keyframes ${animName} {
                0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0) rotate(${rotation}deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    return animName;
}

// Creates one glowing shard flying outward from a broken shield.
function _typeICreateShardElement(row, col, shardIndex) {
    const angle = (shardIndex / 8) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
    const velocity = 30 + Math.random() * 30;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rotation = Math.random() * 360 + 180;

    const shard = document.createElement('div');
    shard.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        width: 4px; height: 4px; background: #2ecc71;
        box-shadow: 0 0 6px #2ecc71, 0 0 2px #fff;
        border-radius: ${Math.random() > 0.5 ? '0px' : '50%'};
        transform: translate(-50%, -50%);
        opacity: 1;
    `;

    const animName = _typeIInjectShardKeyframe(row, col, shardIndex, tx, ty, rotation);
    shard.style.animation = `${animName} 0.6s cubic-bezier(0.1, 0.8, 0.25, 1) forwards`;
    return shard;
}



//------------------------------------------------------------------------
//-----------------TYPE I SHIELD ENTRY------------------------------------
//------------------------------------------------------------------------

// Seeds eligible cells with the Type I shield and updates the HUD.
export function _executeTypeIShield(seedCount, bonusReveal) {
    if (!cur) return;

    if (!window._typeIShieldedCells) window._typeIShieldedCells = new Set();
    window._typeIBonusReveal = bonusReveal;

    const eligible = _typeIGetEligibleCells();

    if (eligible.length === 0) {
        globalThis.showToast(t('cls_typei_none'));
        _setAbilityMode(false);
        const cd = cooldownState['active4'];
        if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
        if (cd) cd.remaining = 0;
        buildClassHUD();
        return;
    }

    const toSeed = eligible.slice(0, Math.min(seedCount, eligible.length));
    _typeISeedShieldedCells(toSeed);

    const bonusNote = bonusReveal
        ? t('cls_typei_bonus_note')
        : '';

    globalThis.showToast(t('cls_typei_seeded')
        .replace('{n}', toSeed.length)
        .replace('{bonus}', bonusNote));

    Audio_Manager.playSFX('type1errorShieldHide');
    buildClassHUD();
    trackAchStat('skillType1ErrorShieldUsed');
}

//------------------------------------------------------------------------
//-----------------TYPE I SHIELD INTERCEPTION HELPERS---------------------
//------------------------------------------------------------------------

// Shows the particle burst when a hidden shield breaks.
function _typeIShowShieldBreakEffect(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 100; overflow: visible;
    `;
    el.appendChild(container);

    // Spawn 8 shards flying outward in evenly-spaced angles
    const SHARD_COUNT = 8;
    for (let i = 0; i < SHARD_COUNT; i++) {
        container.appendChild(_typeICreateShardElement(row, col, i));
    }

    // Central shield icon that expands and fades out simultaneously
    const shieldWave = document.createElement('div');
    shieldWave.textContent = '🛡️';
    shieldWave.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 16px; text-shadow: 0 0 8px #2ecc71;
        animation: type1-shield-shatter 0.5s ease-out forwards;
    `;
    container.appendChild(shieldWave);

    // Clean up all injected elements after animation completes
    setTimeout(() => {
        container.remove();
        document.querySelectorAll(`[id^="shard-fly-${row}-${col}-"]`).forEach(s => s.remove());
    }, 650);
}

// Reveals one correct cell in the triggered shield's row or column.
function _typeIBonusRevealCell(row, col) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    // Collect unrevealed correct cells in the same row
    for (let c = 0; c < cols; c++) {
        if (sol[row][c] === 1 && !globalThis.revealedGrid[row][c] && globalThis.userGrid[row][c] !== 1)
            candidates.push([row, c]);
    }
    // Collect unrevealed correct cells in the same column
    for (let r = 0; r < rows; r++) {
        if (r === row) continue;
        if (sol[r][col] === 1 && !globalThis.revealedGrid[r][col] && globalThis.userGrid[r][col] !== 1)
            candidates.push([r, col]);
    }

    if (!candidates.length) return;

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    globalThis.revealedGrid[r][c] = true;
    globalThis.userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    globalThis._applyCellEffect([`g-${r}-${c}`], 'reveal');

    globalThis.showToast(t('cls_typei_bonus'));

    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    globalThis.checkWin();
}



//------------------------------------------------------------------------
//-----------------TYPE I SHIELD INTERCEPTION-----------------------------
//------------------------------------------------------------------------

// Consumes a shielded cell before a wrong fill is registered.
export function _typeIShieldIntercept(row, col) {
    const cells = window._typeIShieldedCells;
    if (!cells || cells.size === 0) return false;

    const key = `${row}-${col}`;
    if (!cells.has(key)) return false;

    cells.delete(key);

    globalThis.userGrid[row][col] = 2; // ✕
    renderCell(row, col);
    trackAchStat('tilesMarkedWrong', 1);

    _typeIShowShieldBreakEffect(row, col);

    globalThis.showToast(t('cls_typei_triggered'));

    Audio_Manager.playSFX('type1errorShieldBreak');
    trackAchStat('type1Intercepts');

    if (window._typeIBonusReveal) {
        _typeIBonusRevealCell(row, col);
    }

    return true;
}
