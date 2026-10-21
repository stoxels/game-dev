//------------------------------------------------------------------------
//-------------------HUB STATS PANEL--------------------------------------
//------------------------------------------------------------------------
// The aggregated stat lists of the character sheet (offense, defense,
// puzzle) and their hover tooltips. Values come live from
// _computePlayerStats(), so they always reflect the equipped gear.
//------------------------------------------------------------------------

import { t } from '../translation/translations.js';
import { _getEncounterBaseLevel, _getTarget } from '../combat/encounter.js';
import { _buildGroupedStats, _calcAccuracyMissChance, _calcArmourReductionPct, _calcEvasionDodgeChance, _computePlayerStats } from '../combat/combat-player-stats.js';
import { LEVELING_CONFIG, _getPlayerLevel } from './hub-leveling.js';


// Re-renders the three aggregated stat regions of the character panel:
//   offense - upper left corner block, defense - upper right corner block,
//   puzzle  - center column between the paperdoll slots.
// Reads live gear via _computePlayerStats() / _buildGroupedStats()
// (combat-player-stats.js) so it always reflects whatever is equipped.
export function _renderStatsList() {
    const stats = _computePlayerStats();
    const groups = _buildGroupedStats(stats);

    const emptyHTML = `
<div class="sx-stat-row sx-stat-placeholder">
    <span class="sx-stat-name">${t('eg_no_stats_yet')}</span>
</div>`;

    function renderSide(listId, categories) {
        const el = document.getElementById(listId);
        if (!el) return;
        if (!categories.length) {
            el.innerHTML = emptyHTML;
            return;
        }
        el.innerHTML = categories.map(cat => `
<div class="sx-stats-category">
    <div class="sx-stats-category-title">${cat.title}</div>
    ${cat.lines.map(line => `
    <div class="sx-stat-row" data-desc-key="${line.descKey}" data-desc-label="${line.label}"${line.resTotal != null ? ` data-res-total="${line.resTotal}" data-res-cap="${line.resCap}" data-res-penalty="${line.resPenalty || 0}"` : ''}>
        <span class="sx-stat-name">${line.label}</span>
        <span class="sx-stat-value">${line.value}</span>
    </div>`).join('')}
</div>`).join('');
    }

    renderSide('sx-offense-stats-list', groups.offense);
    renderSide('sx-defense-stats-list', groups.defense);
    renderSide('sx-stats-list', groups.puzzle);
    _bindStatTooltips();
}


// Builds the hover tooltip body for a single stat row: stat name as the
// title plus its mechanic description. For armour and evasion the live
// combat values (damage reduction / dodge chance) are appended, using the
// exact formulas from combat-player-stats.js. For resistance rows the
// uncapped gear total and the effective cap are revealed (the row itself
// shows the capped value).
export function _buildStatDescTooltipHTML(descKey, label, row) {
    let html = `<strong style="color:var(--accent,#66fcf1)">${label}</strong>`;
    if (descKey) {
        const desc = t(descKey);
        // t() falls back to the raw key when a translation is missing
        if (desc && desc !== descKey) {
            html += `<br><span style="opacity:.75;font-size:.9em">${desc}</span>`;
        }
        // Resistance rows carry data-res-total / data-res-cap: show the
        // uncapped total, and flag when the cap is clipping it.
        if (row && row.dataset && row.dataset.resTotal != null) {
            const total = parseFloat(row.dataset.resTotal);
            const cap = parseFloat(row.dataset.resCap);
            const capped = total > cap;
            html += `<br><span style="color:var(--accent,#66fcf1)">`
                + t('eg_statdesc_res_total').replace('{t}', total.toFixed(0))
                + (capped ? ` - ${t('eg_statdesc_res_capped').replace('{c}', cap.toFixed(0))}` : '')
                + `</span>`;
            const penalty = parseFloat(row.dataset.resPenalty) || 0;
            if (penalty > 0) {
                html += `<br><span style="color:#ff8a6a">${t('eg_statdesc_res_penalty').replace('{p}', penalty.toFixed(0))}</span>`;
            }
        }
        const stats = _computePlayerStats();
        // Armour/evasion live values are measured against a representative
        // monster: the current target's level, else the encounter's base
        // level - same convention as the accuracy tooltip below.
        const refMonsterLevel = (_getTarget() && _getTarget().level) || _getEncounterBaseLevel() || 1;
        // Character level for multi-level display (falls back to ref level if unavailable)
        const playerLevel = Math.max(1, Number(_getPlayerLevel()) || 1);
        const maxLvl = LEVELING_CONFIG.maxLevel || 100;

        if (descKey === 'eg_statdesc_armour') {
            // Show damage reduction vs monster levels: playerLevel-1 .. playerLevel+3
            const levels = [];
            for (let d = -1; d <= 3; d++) {
                const lvl = playerLevel + d;
                if (lvl < 1) continue;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(refMonsterLevel);
            const lines = levels.map(lvl => {
                // Representative raw hit size at this monster level
                const refDamage = Math.round(12 * (1 + 0.12 * (lvl - 1)));
                const reductionPct = _calcArmourReductionPct(stats.armour, refDamage) * 100;
                const labelPart = t('eg_statdesc_armour_value').replace('{p}', reductionPct.toFixed(1));
                return `${labelPart} (L${lvl})`;
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        } else if (descKey === 'eg_statdesc_evasion') {
            // Show dodge chance vs monster levels: playerLevel-1 .. playerLevel+3
            const levels = [];
            for (let d = -1; d <= 3; d++) {
                const lvl = playerLevel + d;
                if (lvl < 1) continue;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(refMonsterLevel);
            const lines = levels.map(lvl => {
                const dodgeChance = Math.min(75, stats.dodgeChance + _calcEvasionDodgeChance(stats.evasion, lvl));
                const labelPart = t('eg_statdesc_evasion_value').replace('{p}', dodgeChance.toFixed(1));
                return `${labelPart} (L${lvl})`;
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        } else if (descKey === 'eg_statdesc_accuracy') {
            // Miss chance scaled to the character's own level and the next
            // three monster levels (e.g. at player level 12 -> 12/13/14/15).
            // Falls back to level 1 when the leveling system is unavailable.
            const levels = [];
            for (let d = 0; d < 4; d++) {
                const lvl = playerLevel + d;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(playerLevel);
            const lines = levels.map(lvl => {
                const missPct = _calcAccuracyMissChance(stats.accuracy, lvl);
                return t('eg_statdesc_accuracy_value')
                    .replace('{p}', missPct.toFixed(1))
                    .replace('{n}', lvl);
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        }
    }
    return html;
}

// Wires delegated mouseover tooltips onto the three stat list containers
// (delegation survives frequent innerHTML re-renders; the dataset guard
// makes repeated calls after each _renderStatsList() a no-op).
export function _bindStatTooltips() {
    ['sx-offense-stats-list', 'sx-stats-list', 'sx-defense-stats-list'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.statTipBound) return;
        el.dataset.statTipBound = '1';

        el.addEventListener('mouseover', e => {
            const row = e.target.closest ? e.target.closest('.sx-stat-row') : null;
            if (row && !row.classList.contains('sx-stat-placeholder')) {
                globalThis.showGameTooltip(_buildStatDescTooltipHTML(row.dataset.descKey, row.dataset.descLabel, row), e);
            }
        });
        el.addEventListener('mousemove', e => {
            if (e.target.closest && e.target.closest('.sx-stat-row')) globalThis.moveGameTooltip(e);
        });
        el.addEventListener('mouseout', e => {
            const row = e.target.closest ? e.target.closest('.sx-stat-row') : null;
            if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) globalThis.hideGameTooltip();
        });
    });
}
