// class-hud-ls-tooltip.js
// Level-select screen class summary tooltip: shows the chosen class's passive,
// both active skills, and (if unlocked) ascendency skills, with current ranks.
//
// Depends on globals defined in class-hud.js (loaded BEFORE this file):
// getLocalName, getLocalDesc, _getRankWord, _getAscendencySkillLevel,
// _formatCooldownLabel, _calcTooltipPosition, _applyTooltipPosition.

//------------------------------------------------------------------------
//----------LEVEL-SELECT TOOLTIP — COOLDOWN & RANK BADGE HELPERS---------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the small inline cooldown annotation used in the level-select tooltip.
// e.g. " ⏱ 2m"  (lower opacity, smaller font)
function _buildLsCooldownAnnotation(cooldownSeconds) {
    return `<span style="opacity:.4;font-size:.8em"> ⏱ ${_formatCooldownLabel(cooldownSeconds)}</span>`;
}

// Builds the MAX rank badge shown next to a skill rank when it is maxed out.
function _buildMaxRankBadge(level) {
    return level >= 3
        ? ` <span style="color:#27ae60;font-size:.85em">✓ MAX</span>`
        : '';
}




//------------------------------------------------------------------------
//----------LEVEL-SELECT CLASS TOOLTIP — DATA HELPERS--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML block for a single skill entry in the level-select tooltip.
// Used for both base class and ascendency skills.
function _buildLsSkillBlock(nameHTML, rankWord, level, maxLevel, cooldownSeconds, descHTML) {
    return `
        <div style="color:#f1c40f;margin-bottom:2px;">
            🎯 ${nameHTML}
            <span style="opacity:.6;font-size:.85em">— ${rankWord} ${level}/${maxLevel}${_buildMaxRankBadge(level)}</span>
            ${_buildLsCooldownAnnotation(cooldownSeconds)}
        </div>
        <div style="color:#ccc;">${descHTML}</div>`;
}

// Builds the ascendency section HTML block for the level-select tooltip.
// Returns an empty string when no ascendency is active.
function _buildLsAscendencySection(rankWord) {
    if (!STATE.playerAscendency || !ASCENDENCY_DEFS[STATE.playerAscendency]) return '';
    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];

    const ascName = getLocalName(asc);
    const sk1Name = getLocalName(asc.active1);
    const sk2Name = getLocalName(asc.active2);

    const sk1Lv = _getAscendencySkillLevel('active1');
    const sk2Lv = _getAscendencySkillLevel('active2');
    const sk1Data = asc.active1.levels[sk1Lv - 1];
    const sk2Data = asc.active2.levels[sk2Lv - 1];

    const sk1Desc = getLocalDesc(sk1Data);
    const sk2Desc = getLocalDesc(sk2Data);

    const sk1Block = _buildLsSkillBlock(
        sk1Name,
        rankWord, sk1Lv, 3,
        asc.active1.cooldownSeconds,
        sk1Desc
    );
    const sk2Block = _buildLsSkillBlock(
        sk2Name,
        rankWord, sk2Lv, 3,
        asc.active2.cooldownSeconds,
        sk2Desc
    );

    return `
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(241,196,15,0.25);">
            <div style="margin-bottom:6px;">
                <span style="font-size:1.1em">${asc.icon}</span>
                <strong style="color:${asc.colorLight};letter-spacing:1px;margin-left:4px;">${ascName}</strong>
                <span style="opacity:.5;font-size:.8em;margin-left:4px;">${asc.archetype}</span>
            </div>
            <div style="margin-bottom:6px;">${sk1Block}</div>
            <div>${sk2Block}</div>
        </div>`;
}




//------------------------------------------------------------------------
//----------LEVEL-SELECT CLASS TOOLTIP — MAIN BUILDER--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the full HTML for the class summary tooltip shown on the level-select screen.
// Covers the class header, passive skill, both active skills, and the ascendency section.
function buildLsClassTooltipHTML() {
    if (!STATE.playerClass || !CLASS_DEFS[STATE.playerClass]) return '';
    const def = CLASS_DEFS[STATE.playerClass];
    const rankWord = _getRankWord();

    const passLv = STATE.classPassiveLevel || 1;
    const act1Lv = STATE.classActive1Level || 1;
    const act2Lv = STATE.classActive2Level || 1;

    const passData = def.passive.levels[passLv - 1];
    const act1Data = def.active1.levels[act1Lv - 1];
    const act2Data = def.active2.levels[act2Lv - 1];

    const passName = getLocalName(def.passive);
    const act1Name = getLocalName(def.active1);
    const act2Name = getLocalName(def.active2);
    const passDesc = getLocalDesc(passData);
    const act1Desc = getLocalDesc(act1Data);
    const act2Desc = getLocalDesc(act2Data);
    const className = getLocalName(def);

    return `
        <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
            <span style="font-size:1.3em">${def.icon}</span>
            <strong style="color:${def.colorLight};font-size:1.1em;letter-spacing:1px;margin-left:4px;">${className}</strong>
        </div>
        <div style="margin-bottom:7px;">
            <div style="color:${HUD_COLOR_PASSIVE};margin-bottom:2px;">
                ⚡ ${passName}
                <span style="opacity:.6;font-size:.85em">— ${rankWord} ${passLv}/3${_buildMaxRankBadge(passLv)}</span>
            </div>
            <div style="color:#ccc;">${passDesc}</div>
        </div>
        <div style="margin-bottom:7px;">
            ${_buildLsSkillBlock(act1Name, rankWord, act1Lv, 3, def.active1.cooldownSeconds, act1Desc)}
        </div>
        <div>
            ${_buildLsSkillBlock(act2Name, rankWord, act2Lv, 3, def.active2.cooldownSeconds, act2Desc)}
        </div>
        ${_buildLsAscendencySection(rankWord)}`;
}




//------------------------------------------------------------------------
//----------LEVEL-SELECT CLASS TOOLTIP — DOM & VISIBILITY----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns (creating if needed) the singleton tooltip element used on the
// level-select screen to show full class and ascendency skill details.
function _getLsClassTooltipEl() {
    let tip = document.getElementById('ls-class-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'ls-class-tooltip';
        tip.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #12121e;
            border: 1px solid var(--accent, #5555aa);
            border-left: 3px solid var(--purple, #9b59b6);
            color: var(--accent2, #ccc);
            font-family: var(--PX, monospace);
            font-size: 11px;
            line-height: 1.6;
            padding: 12px 14px;
            max-width: 400px;
            min-width: 220px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

// Shows the level-select class tooltip with fresh content at the cursor position.
function showLsClassTooltip(e) {
    const tip = _getLsClassTooltipEl();
    tip.innerHTML = buildLsClassTooltipHTML();
    tip.style.opacity = '1';
    _applyTooltipPosition(tip, e);
}

// Updates the level-select class tooltip position as the cursor moves.
function moveLsClassTooltip(e) {
    _applyTooltipPosition(_getLsClassTooltipEl(), e);
}

// Hides the level-select class tooltip.
function hideLsClassTooltip() {
    const tip = document.getElementById('ls-class-tooltip');
    if (tip) tip.style.opacity = '0';
}