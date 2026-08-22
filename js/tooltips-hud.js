// tooltips-hud.js
// Generic floating tooltip engine (visual twin of class-hud.js's tooltip)
// + content builders + wiring for: mistakes, timer, levels-back button,
// level name, and inventory label.

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

// 1. Mistakes
function _buildMistakesTooltipHTML() {
    const base = typeof _getPenaltySecondsAtCount === 'function'
        ? _getPenaltySecondsAtCount(mistakeCount + 1)
        : 0;
    const reduction = typeof _getAsymptoticMasteryReduction === 'function' ? _getAsymptoticMasteryReduction() : 0;
    const nextPenalty = Math.max(0, base - reduction);

    let html = `<strong style="color:#ff5555">✗ Mistakes</strong>`;
    html += `<br>Total this level: <b>${mistakeCount}</b>`;
    if (typeof absorbedMistakes !== 'undefined' && absorbedMistakes > 0) {
        html += `<br>Absorbed (no penalty): <b>${absorbedMistakes}</b>`;
    }
    if (typeof _levelMistakesErased !== 'undefined' && _levelMistakesErased > 0) {
        html += `<br>Erased by items: <b>${_levelMistakesErased}</b>`;
    }
    html += `<br>Next mistake costs: <b>−${nextPenalty}s</b>`;
    if (reduction > 0) {
        html += `<br><span style="opacity:.6;font-size:.85em">(−${reduction}s from completed lines)</span>`;
    }
    html += `<br><span style="opacity:.55;font-size:.85em">Class effects may change this further.</span>`;
    return html;
}

// 2. Timer
function _buildTimerTooltipHTML() {
    let html = `<strong style="color:var(--accent,#66fcf1)">⏱ Timer</strong>`;
    html += `<br>Time added this level: <b>+${_levelTimeAdded || 0}s</b>`;
    html += `<br>Time lost to mistakes: <b>−${_levelTimeLost || 0}s</b>`;
    html += `<br><span style="opacity:.55;font-size:.85em">Includes passive bonuses, items & penalties.</span>`;
    return html;
}

// 3. Levels/back button
function _buildLevelsButtonTooltipHTML() {
    return `Return to Level Selection`;
}

// 4. Level name
const _MOD_SHORT = { timetrial: 'tt', hardcore: 'hc', ironman: 'im', classless: 'cl', treeless: 'tl' };

function _buildLevelNameTooltipHTML() {
    if (!cur) return '';
    const gi = cur.gIdx;
    const hs = STATE.levelHS[gi];
    const bonusDone = STATE.bonusDone.includes(gi);
    const bonusHintText = lvText(cur, 'bonusHint') || '';

    let html = `<strong>${t('lvl_prefix')} ${cur.world}-${cur.li}</strong>`;
    html += `<br>🎯 Bonus: ${bonusHintText}`;
    html += `<br>Bonus claimed: <b style="color:${bonusDone ? '#2ecc71' : '#e74c3c'}">${bonusDone ? 'Yes' : 'No'}</b>`;

    if (hs) {
        const mods = Object.keys(hs.mods || {}).filter(m => hs.mods[m]);
        html += `<br>Best clear difficulty: <b>${t('diff_' + hs.diff)}</b>`;
        html += `<br>Best score: <b>${hs.score}</b>`;
        if (mods.length) {
            html += `<br>Modifiers used: <b>${mods.map(m => t('mod_' + _MOD_SHORT[m])).join(', ')}</b>`;
        }
    } else {
        html += `<br><span style="opacity:.6">Not cleared yet.</span>`;
    }

    if (STATE.levelMistakes && STATE.levelMistakes[gi] !== undefined) {
        html += `<br>Best mistake count: <b>${STATE.levelMistakes[gi]}</b>`;
    }

    return html;
}

// 5. Inventory label
function _buildInventoryLabelTooltipHTML() {
    return `<strong>🎒 Inventory</strong>`
        + `<br>Right-click an item to send it to the reshuffle pile.`
        + `<br>Every <b>${typeof RESHUFFLE_GOAL !== 'undefined' ? RESHUFFLE_GOAL : 3}</b> items reshuffled grants a reward pick!`;
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
    wire('hud-level-name', _buildLevelNameTooltipHTML);

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

    let html = `<strong>💾 Slot ${summary.slot} — Lifetime Stats</strong>`;
    html += `<br>🟩 Cells revealed: <b>${summary.lifetimeTilesRevealed}</b>`;
    html += `<br>🟦 Cells filled manually: <b>${summary.lifetimeTilesFilled}</b>`;
    html += `<br>✗ Mistakes made: <b>${summary.lifetimeMistakesMade}</b>`;
    html += `<br>🧠 Questions answered correctly: <b>${summary.questionsCorrect}</b>`;
    html += `<br>🎒 Items used: <b>${summary.itemsUsedTotal}</b>`;
    html += `<br>⚔️ Class abilities used: <b>${summary.classAbilitiesUsed}</b>`;
    html += `<br>🌿 Passive points obtained: <b>${summary.passivePointsObtained}</b>`;
    html += `<br>📋 Inference tasks completed: <b>${summary.questsClaimedCount}</b>`;
    html += `<br>⬆️ Class upgrades achieved: <b>${upgradesAchieved}</b>`;
    html += `<br>⏱ Total time played: <b>${_fmtPlaytime(summary.totalTimePlayedSecs)}</b>`;
    html += `<br><br><span style="opacity:.7">Completion:</span>`;
    html += `<br>&nbsp;&nbsp;Levels cleared: <b>${pctLevels}</b>`;
    html += `<br>&nbsp;&nbsp;Bonus objectives: <b>${pctBonus}</b>`;
    html += `<br>&nbsp;&nbsp;Hard + all modifiers: <b>${pctHardAllMods}</b>`;
    return html;
}