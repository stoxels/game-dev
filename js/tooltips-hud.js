// tooltips-hud.js
// Generic floating tooltip engine (visual twin of class-hud.js's tooltip)
// + content builders + wiring for: mistakes, timer, levels-back button,
// level name, and inventory label.


// _wireHoverByRect — tooltip trigger based on manual bounding-box hit
// testing instead of native hover events. Needed for elements that must
// stay pointer-events:none (so they never block clicks on whatever sits
// beneath them, e.g. the puzzle grid under the fixed corner HUD) but
// still need a working hover tooltip.
function _wireHoverByRect(el, builder) {
    if (!el) return;
    let isOver = false;

    document.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (inside) {
            if (!isOver) {
                isOver = true;
                showGameTooltip(builder(), e);
            } else {
                moveGameTooltip(e);
            }
        } else if (isOver) {
            isOver = false;
            hideGameTooltip();
        }
    });
}


//------------------------------------------------------------------------
//----------------------------TOOLTIP ENGINE-------------------------------
//------------------------------------------------------------------------

function getGameTooltip() {
    let tip = document.getElementById('ghud-floating-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'ghud-floating-tip';
        tip.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #12121e;
            border: 1px solid var(--accent, #5555aa);
            border-left: 3px solid var(--accent2, #aaaaff);
            color: var(--accent2, #ccc);
            font-family: var(--PX, monospace);
            font-size: 11px;
            line-height: 1.6;
            padding: 8px 12px;
            max-width: 280px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

function _calcGameTooltipPos(e, w, h) {
    let x = e.clientX + 14;
    let y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 10;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 10;
    // Hard-clamp so the tooltip can never leave the viewport, even when it
    // is taller/wider than the free space around the cursor.
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    return { x, y };
}

function showGameTooltip(html, e) {
    const tip = getGameTooltip();
    tip.innerHTML = html;
    tip.style.opacity = '1';
    const { x, y } = _calcGameTooltipPos(e, tip.offsetWidth || 220, tip.offsetHeight || 60);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function moveGameTooltip(e) {
    const tip = getGameTooltip();
    if (tip.style.opacity !== '1') return;
    const { x, y } = _calcGameTooltipPos(e, tip.offsetWidth || 220, tip.offsetHeight || 60);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function hideGameTooltip() {
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.style.opacity = '0';
}


//------------------------------------------------------------------------
//----------------------------CONTENT BUILDERS-----------------------------
//------------------------------------------------------------------------

// Formats a whole number of seconds as "Xm Ys" (e.g. 125 -> "2m 5s").
// Falls back to "0s" for 0/negative input.
function _fmtSecsAsMinSec(totalSecs) {
    const safeSecs = Math.max(0, Math.round(totalSecs));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
}


// 1. Mistakes
function _buildMistakesTooltipHTML() {
    const base = typeof _getPenaltySecondsAtCount === 'function'
        ? _getPenaltySecondsAtCount(mistakeCount + 1)
        : 0;
    const reduction = typeof _getAsymptoticMasteryReduction === 'function' ? _getAsymptoticMasteryReduction() : 0;
    const nextPenalty = Math.max(0, base - reduction);

    let html = `<strong style="color:#ff5555">${t('cg_tt_mistakes')}</strong>`;
    html += `<br>${t('cg_tt_total_level')} <b>${mistakeCount}</b>`;
    if (typeof absorbedMistakes !== 'undefined' && absorbedMistakes > 0) {
        html += `<br>${t('cg_tt_absorbed')} <b>${absorbedMistakes}</b>`;
    }
    if (typeof _levelMistakesErased !== 'undefined' && _levelMistakesErased > 0) {
        html += `<br>${t('cg_tt_erased')} <b>${_levelMistakesErased}</b>`;
    }
    html += `<br>${t('cg_tt_next_cost')} <b>−${_fmtSecsAsMinSec(nextPenalty)}</b>`;
    if (reduction > 0) {
        html += `<br><span style="opacity:.6;font-size:.85em">${t('cg_tt_reduction').replace('{n}', reduction)}</span>`;
    }
    html += `<br><span style="opacity:.55;font-size:.85em">${t('cg_tt_class_note')}</span>`;
    return html;
}

// 2. Timer
function _buildTimerTooltipHTML() {
    let html = `<strong style="color:var(--accent,#66fcf1)">${t('cg_tt_timer')}</strong>`;
    html += `<br>${t('cg_tt_time_added')} <b>+${_fmtSecsAsMinSec(_levelTimeAdded || 0)}</b>`;
    html += `<br>${t('cg_tt_time_lost')} <b>−${_fmtSecsAsMinSec(_levelTimeLost || 0)}</b>`;
    html += `<br><span style="opacity:.55;font-size:.85em">${t('cg_tt_includes')}</span>`;
    return html;
}

// 3. Levels/back button
function _buildLevelsButtonTooltipHTML() {
    return t('cg_return_levels');
}

// 4. Level name
const _MOD_SHORT = { timetrial: 'tt', hardcore: 'hc', ironman: 'im', classless: 'cl', treeless: 'tl' };

// Builds the mod lines of an active map-device run map, grouped by their
// affects category with the same colors as the map item tooltip:
// monster → orange, player → red, puzzle → blue.
function _buildActiveMapModsHTML(map) {
    const colors = { monster: '#e67e22', player: '#e74c3c', puzzle: '#5b9cf6' };
    let html = '';
    let hasMods = false;
    // Mods sharing the same stat are merged into one combined line, kept
    // grouped by their affects category (and thus color).
    const byColor = new Map();
    (map.mods || []).forEach(mod => {
        const key = _egMapModAffects(mod.familyId) || 'monster';
        if (!byColor.has(key)) byColor.set(key, []);
        byColor.get(key).push(mod);
    });
    byColor.forEach((mods, key) => {
        const color = colors[key] || '#e67e22';
        _egBuildMergedModLines(mods).forEach(entry => {
            hasMods = true;
            html += `<br><span style="color:${color}">${entry.label}</span>`;
        });
    });
    if (!hasMods && typeof t === 'function') {
        html += `<br><span style="opacity:.6">${t('eg_map_unmodified')}</span>`;
    }
    return html;
}

// Map-only tooltip shown while a map-device run is active and the corner
// HUD displays the launched map's name instead of the seed level's hint.
// Contains ONLY the map identity (rarity-colored) + its rolled modifiers
// + the reward bonuses (xp / quantity / rarity) the run grants.
function _buildMapRunTooltipHTML() {
    const map = (typeof _egActiveMapItem !== 'undefined') ? _egActiveMapItem : null;
    if (!map) return '';
    const rc = (typeof rarityColors === 'function') ? rarityColors(map.rarity) : null;
    let html = `<strong style="color:${rc ? rc.color : '#c8a84b'}">🗺️ ${map.name}</strong>`;
    html += _buildActiveMapModsHTML(map);

    const rw = (typeof _egGetMapRewardBonuses === 'function') ? _egGetMapRewardBonuses(map) : null;
    if (rw) {
        if (rw.xp > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_xp').replace('{n}', rw.xp)}</span>`;
        if (rw.quantity > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_quantity').replace('{n}', rw.quantity)}</span>`;
        if (rw.rarity > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_rarity').replace('{n}', rw.rarity)}</span>`;
    }
    return html;
}

function _buildLevelNameTooltipHTML() {
    // Endgame map-device run: the corner HUD shows the map's name, so the
    // tooltip shows ONLY the map identity + its rolled launch modifiers.
    if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem
        && typeof _egMapModAffects === 'function') {
        return _buildMapRunTooltipHTML();
    }

    if (!cur) return '';
    const gi = cur.gIdx;
    const hs = STATE.levelHS[gi];
    const bonusDone = STATE.bonusDone.includes(gi);
    const bonusHintText = lvText(cur, 'bonusHint') || '';

    let html = `<strong>${t('lvl_prefix')} ${cur.world}-${cur.li}</strong>`;
    html += `<br>${t('cg_tt_bonus').replace('{x}', bonusHintText)}`;
    html += `<br>${t('cg_tt_bonus_claimed')} <b style="color:${bonusDone ? '#2ecc71' : '#e74c3c'}">${bonusDone ? t('cg_yes') : t('cg_no')}</b>`;

    if (hs) {
        const mods = Object.keys(hs.mods || {}).filter(m => hs.mods[m]);
        html += `<br>${t('cg_tt_best_diff')} <b>${t('diff_' + hs.diff)}</b>`;
        html += `<br>${t('cg_tt_best_score')} <b>${hs.score}</b>`;
        if (mods.length) {
            html += `<br>${t('cg_tt_mods_used')} <b>${mods.map(m => t('mod_' + _MOD_SHORT[m])).join(', ')}</b>`;
        }
    } else {
        html += `<br><span style="opacity:.6">${t('cg_tt_not_cleared')}</span>`;
    }

    if (STATE.levelMistakes && STATE.levelMistakes[gi] !== undefined) {
        html += `<br>${t('cg_tt_best_mistakes')} <b>${STATE.levelMistakes[gi]}</b>`;
    }

    if (ptHasSkill('grid_awareness')) {
        const tierLabels = { small: 'cg_grid_small', medium: 'cg_grid_medium', large: 'cg_grid_large', massive: 'cg_grid_massive' };
        const tier = _getGridSizeTier(cur.grid.length, cur.grid[0].length);
        html += `<br>${t('cg_tt_grid_class')} <b>${t(tierLabels[tier])}</b>`;
    }

    const { isAscension, isConvergence } = _getLevelSpecialStatus(cur);
    if (isAscension) html += `<br><span style="color:#c080ff">${t('cg_ascension_lvl')}</span>`;
    if (isConvergence) html += `<br><span style="color:#6dbf40">${t('cg_convergence_lvl')}</span>`;

    return html;
}

// 5. Inventory label
function _buildInventoryLabelTooltipHTML() {
    return `<strong>${t('inv_title')}</strong>`
        + `<br>${t('cg_inv_reshuffle_hint')}`
        + `<br>${t('cg_inv_reward_pick').replace('{n}', typeof RESHUFFLE_GOAL !== 'undefined' ? RESHUFFLE_GOAL : 3)}`;
}


//------------------------------------------------------------------------
//----------------------------WIRING----------------------------------------
//------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    function wire(id, builder) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mouseenter', (e) => showGameTooltip(builder(), e));
        el.addEventListener('mousemove', moveGameTooltip);
        el.addEventListener('mouseleave', hideGameTooltip);
    }

    wire('mistake-counter', _buildMistakesTooltipHTML);
    wire('timer-val', _buildTimerTooltipHTML);
    wire('btn-hud-levels', _buildLevelsButtonTooltipHTML);
    _wireHoverByRect(document.getElementById('hud-level-name'), _buildLevelNameTooltipHTML);

    // Inventory label is re-created every buildInventoryPanel() call,
    // so use delegated mouseover/mouseout on the static #inv-panel wrapper.
    const invPanel = document.getElementById('inv-panel');
    if (invPanel) {
        invPanel.addEventListener('mouseover', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                showGameTooltip(_buildInventoryLabelTooltipHTML(), e);
            }
        });
        invPanel.addEventListener('mousemove', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                moveGameTooltip(e);
            }
        });
        invPanel.addEventListener('mouseout', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                hideGameTooltip();
            }
        });
    }
});



//------------------------------------------------------------------------
//----------------------------SAVE SLOT TOOLTIP----------------------------
//------------------------------------------------------------------------

function _fmtPlaytime(totalSecs) {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const _SAVE_SLOT_ALL_MODS = ['timetrial', 'hardcore', 'ironman', 'classless', 'treeless'];

// Counts levels whose recorded highscore was set on Hard difficulty
// with every optional modifier active.
function _countHardAllModsClears(levelHS) {
    return Object.values(levelHS || {}).filter(hs =>
        hs && hs.diff === 'hard' && _SAVE_SLOT_ALL_MODS.every(m => hs.mods && hs.mods[m])
    ).length;
}

function _pctOf(part, total) {
    if (!total) return '0%';
    return `${Math.round((part / total) * 100)}%`;
}

// Builds the lifetime-stats tooltip for a save-slot card.
// `summary` comes from getSlotSummary() in state.js.
function _buildSaveSlotTooltipHTML(summary) {
    const totalLevels = (typeof ALL !== 'undefined' && ALL.length) ? ALL.length : 0;

    const upgradesAchieved =
        (summary.classPassiveLevel - 1) +
        (summary.classActive1Level - 1) +
        (summary.classActive2Level - 1) +
        (summary.ascendencySkill1Level - 1) +
        (summary.ascendencySkill2Level - 1);

    const pctLevels = _pctOf(summary.levelsDone, totalLevels);
    const pctBonus = _pctOf(summary.bonusDone.length, totalLevels);
    const pctHardAllMods = _pctOf(_countHardAllModsClears(summary.levelHS), totalLevels);

    let html = `<strong>${t('cg_slot_stats').replace('{n}', summary.slot)}</strong>`;
    html += `<br>${t('cg_stat_revealed')} <b>${summary.lifetimeTilesRevealed}</b>`;
    html += `<br>${t('cg_stat_filled')} <b>${summary.lifetimeTilesFilled}</b>`;
    html += `<br>${t('cg_stat_mistakes')} <b>${summary.lifetimeMistakesMade}</b>`;
    html += `<br>${t('cg_stat_questions')} <b>${summary.questionsCorrect}</b>`;
    html += `<br>${t('cg_stat_items_used')} <b>${summary.itemsUsedTotal}</b>`;
    html += `<br>${t('cg_stat_abilities')} <b>${summary.classAbilitiesUsed}</b>`;
    html += `<br>${t('cg_stat_passive_pts')} <b>${summary.passivePointsObtained}</b>`;
    html += `<br>${t('cg_stat_inference')} <b>${summary.questsClaimedCount}</b>`;
    html += `<br>${t('cg_stat_upgrades')} <b>${upgradesAchieved}</b>`;
    html += `<br>${t('cg_stat_playtime')} <b>${_fmtPlaytime(summary.totalTimePlayedSecs)}</b>`;
    html += `<br><br><span style="opacity:.7">${t('cg_completion')}</span>`;
    html += `<br>&nbsp;&nbsp;${t('cg_comp_levels')} <b>${pctLevels}</b>`;
    html += `<br>&nbsp;&nbsp;${t('cg_comp_bonus')} <b>${pctBonus}</b>`;
    html += `<br>&nbsp;&nbsp;${t('cg_comp_hard_mods')} <b>${pctHardAllMods}</b>`;
    return html;
}