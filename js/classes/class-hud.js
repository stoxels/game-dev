// class-hud.js
// In-game compact "class HUD" panel: passive/active skill buttons, cooldowns,
// tooltips, momentum bar, shield pips, and drag positioning.
//
// NOTE: the level-select screen's class summary tooltip lives in the
// companion file class-hud-ls-tooltip.js, which must load AFTER this file
// (it reuses getLocalName, getLocalDesc, _getRankWord, _getAscendencySkillLevel,
// _formatCooldownLabel, and the tooltip position helpers defined below).

//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Colours used for passive vs. active skill labels in tooltips and buttons
const HUD_COLOR_PASSIVE = '#f39c12';
const HUD_COLOR_ACTIVE = '#3498db';

// Maximum number of shield pip icons to display at once
const HUD_SHIELD_PIP_MAX = 5;




//------------------------------------------------------------------------
//-------------------LOCALISATION HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised name string from any object that has nameEn / nameDE.
function getLocalName(obj) {
    return LANG === 'de' ? obj.nameDE : obj.nameEn;
}

// Returns the localised description string from a skill level data object.
function getLocalDesc(data) {
    return LANG === 'de' ? data.descDE : data.descEn;
}

// Returns the localised word for "Rank" used in tooltips.
function _getRankWord() {
    return LANG === 'de' ? 'Rang' : 'Rank';
}




//------------------------------------------------------------------------
//------------------SKILL LEVEL LOOKUP HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the current level for a base class active skill slot (active1 or active2).
function getActiveSkillLevel(key) {
    return key === 'active1'
        ? (STATE.classActive1Level || 1)
        : (STATE.classActive2Level || 1);
}

// Returns the current level for an ascendency skill slot (active1 or active2 within the ascendency).
function _getAscendencySkillLevel(ascSlot) {
    return ascSlot === 'active1'
        ? (STATE.ascendencySkill1Level || 1)
        : (STATE.ascendencySkill2Level || 1);
}




//------------------------------------------------------------------------
//--------------------COOLDOWN FORMAT HELPERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Formats a raw cooldown in seconds to a short display string.
// Below 60s: "12s"   |   60s and above: "1m"  (used in tooltips)
function _formatCooldownLabel(secs) {
    const m = Math.floor(secs / 60);
    return m > 0 ? `${m}m` : `${secs}s`;
}

// Builds the cooldown footer line used inside skill tooltips.
// e.g. "⏱ CD: 90s"
function _buildTooltipCooldownLine(cooldownSeconds) {
    const cdSec = Math.ceil(cooldownSeconds || 0);
    const cdStr = _formatCooldownLabel(cdSec);
    return `<span style="opacity:.55;font-size:.85em">⏱ CD: ${cdStr}</span>`;
}




//------------------------------------------------------------------------
//---------------------TOOLTIP POSITION HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates the clamped {x, y} screen position for a floating tooltip,
// keeping it within the visible viewport on all sides.
function _calcTooltipPosition(e, tipWidth, tipHeight) {
    let x = e.clientX + 14;
    let y = e.clientY + 14;
    if (x + tipWidth > window.innerWidth - 8) x = e.clientX - tipWidth - 10;
    if (y + tipHeight > window.innerHeight - 8) y = e.clientY - tipHeight - 10;
    return { x, y };
}

// Applies a clamped tooltip position to a DOM element.
function _applyTooltipPosition(tipEl, e) {
    const { x, y } = _calcTooltipPosition(
        e,
        tipEl.offsetWidth || 220,
        tipEl.offsetHeight || 60
    );
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
}




//------------------------------------------------------------------------
//---------------------------HUD TOOLTIP ENGINE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns (creating if needed) the singleton floating tooltip element used
// by skill buttons on the class HUD panel.
function getHUDTooltip() {
    let tip = document.getElementById('chud-floating-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'chud-floating-tip';
        tip.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #12121e;
            border: 1px solid var(--accent, #5555aa);
            border-left: 3px solid var(--accent2, #aaaaff);
            color: var(--accent2, #ccc);
            font-family: var(--PX, monospace);
            font-size: 10px;
            line-height: 1.6;
            padding: 8px 12px;
            max-width: 260px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

// Shows the HUD tooltip with the given HTML content at the cursor position.
function showHUDTooltip(html, e) {
    const tip = getHUDTooltip();
    tip.innerHTML = html;
    tip.style.opacity = '1';
    _applyTooltipPosition(tip, e);
}

// Updates the HUD tooltip position as the cursor moves.
function moveHUDTooltip(e) {
    _applyTooltipPosition(getHUDTooltip(), e);
}

// Hides the HUD tooltip.
function hideHUDTooltip() {
    const tip = document.getElementById('chud-floating-tip');
    if (tip) tip.style.opacity = '0';
}

// Global event handlers called from inline HTML attributes on HUD buttons.
// These need to be globals because buildClassHUD rebuilds innerHTML each time.
function handleHUDTip(e, key) {
    const def = CLASS_DEFS[STATE.playerClass];
    if (!def) return;
    // Ascendency slots use a different tooltip builder
    if (key === 'active3' || key === 'active4') {
        showHUDTooltip(buildAscendencySkillTooltip(key), e);
        return;
    }
    showHUDTooltip(buildSkillTooltip(def, key), e);
}

function handleHUDTipMove(e) {
    moveHUDTooltip(e);
}




//------------------------------------------------------------------------
//---------------------HUD TOOLTIP CONTENT BUILDERS----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip HTML for the passive skill icon on the compact HUD.
function _buildPassiveTooltipHTML(def) {
    const passLv = STATE.classPassiveLevel || 1;
    const passData = def.passive.levels[passLv - 1];
    return `<strong style="color:${HUD_COLOR_PASSIVE}">${getLocalName(def.passive)}</strong>`
        + ` <span style="opacity:.6;font-size:.85em">— ${_getRankWord()} ${passLv}</span>`
        + `<br>${getLocalDesc(passData)}`;
}

// Builds the tooltip HTML for an active skill button on the compact HUD.
function _buildActiveTooltipHTML(def, key) {
    const skill = def[key];
    const skillLv = getActiveSkillLevel(key);
    const skillData = skill.levels[skillLv - 1];
    return `<strong style="color:${HUD_COLOR_ACTIVE}">${getLocalName(skill)}</strong>`
        + ` <span style="opacity:.6;font-size:.85em">— ${_getRankWord()} ${skillLv}</span>`
        + `<br>${getLocalDesc(skillData)}`
        + `<br>${_buildTooltipCooldownLine(def[key].cooldownSeconds || 0)}`;
}

// Routes to the correct tooltip builder based on the skill slot key.
// Called from handleHUDTip for base class slots (passive / active1 / active2).
function buildSkillTooltip(def, key) {
    if (key === 'passive') return _buildPassiveTooltipHTML(def);
    return _buildActiveTooltipHTML(def, key);
}

// Builds the tooltip HTML for ascendency skill buttons (active3 / active4 HUD slots).
function buildAscendencySkillTooltip(hudSlot) {
    if (!STATE.playerAscendency) return '';
    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];
    if (!asc) return '';

    const ascSlot = hudSlot === 'active3' ? 'active1' : 'active2';
    const skill = asc[ascSlot];
    const skillLv = _getAscendencySkillLevel(ascSlot);
    const skillData = skill.levels[skillLv - 1];

    return `<strong style="color:#f1c40f">${getLocalName(skill)}</strong>`
        + ` <span style="opacity:.6;font-size:.85em">— ${_getRankWord()} ${skillLv}</span>`
        + `<br>${getLocalDesc(skillData)}`
        + `<br>${_buildTooltipCooldownLine(skill.cooldownSeconds || 0)}`;
}




//------------------------------------------------------------------------
//-------------------SKILL BUTTON RENDER HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines the visual state properties (color, cursor, click handler, armed ring)
// for a skill button based on whether it is on cooldown or currently armed.
function _getSkillBtnState(hudSlot, accentColor) {
    const cdRemaining = cooldownState[hudSlot].remaining;
    const isOnCD = cdRemaining > 0;
    const isArmed = activeAbilityMode && STATE.classActiveChoice === hudSlot;

    const btnColor = isArmed ? '#e74c3c' : isOnCD ? '#555' : accentColor;
    const cursor = isOnCD ? 'not-allowed' : 'pointer';
    const clickAttr = isOnCD ? '' : `onclick="toggleActiveAbility('${hudSlot}')"`;
    const armedRing = isArmed ? `outline: 2px solid #e74c3c; outline-offset: 2px;` : '';

    return { cdRemaining, isOnCD, isArmed, btnColor, cursor, clickAttr, armedRing };
}

// Builds the inner label element for a skill button:
// - On cooldown: shows the remaining time
// - Armed (waiting for target): shows the cancel "✕" icon
// - Ready: shows the activate "▶" icon
function _buildSkillBtnLabel(isOnCD, isArmed, cdRemaining) {
    if (isOnCD) return `<span class="chud-btn-cd">${_formatCooldown(cdRemaining)}</span>`;
    if (isArmed) return `<span class="chud-btn-ready armed">✕</span>`;
    return `<span class="chud-btn-ready">▶</span>`;
}

// Builds the full HTML string for a single skill button (used for both base
// class and ascendency slots). Extra CSS classes can be passed in extraClasses.
function _buildSkillBtnHTML(hudSlot, displayIdx, accentColor, extraClasses) {
    const { cdRemaining, isOnCD, isArmed, btnColor, cursor, clickAttr, armedRing }
        = _getSkillBtnState(hudSlot, accentColor);

    const label = _buildSkillBtnLabel(isOnCD, isArmed, cdRemaining);
    const stateClasses = `${isArmed ? 'armed' : ''} ${isOnCD ? 'on-cd' : ''}`.trim();
    const allClasses = ['chud-skill-btn', extraClasses, stateClasses]
        .filter(Boolean).join(' ');

    return `
        <button class="${allClasses}"
                data-slot="${hudSlot}"
                style="border-color:${btnColor}; cursor:${cursor}; ${armedRing}"
                ${clickAttr}
                data-tipkey="${hudSlot}"
                onmouseenter="handleHUDTip(event,'${hudSlot}')"
                onmousemove="handleHUDTipMove(event)"
                onmouseleave="hideHUDTooltip()">
            <span class="chud-btn-idx" style="color:${btnColor}">${displayIdx}</span>
            ${label}
        </button>`;
}

// Renders a compact active skill button for a base class slot (active1 / active2).
function renderCompactActiveBtn(def, key) {
    const idx = key === 'active1' ? '1' : '2';
    return _buildSkillBtnHTML(key, idx, HUD_COLOR_ACTIVE, '');
}

// Renders a compact active skill button for an ascendency slot (active3 / active4).
function renderCompactAscBtn(asc, hudSlot, ascSlot) {
    const idx = hudSlot === 'active3' ? '3' : '4';
    return _buildSkillBtnHTML(hudSlot, idx, '#f1c40f', 'chud-asc-btn');
}




//------------------------------------------------------------------------
//--------------------ASCENDENCY SECTION RENDERER------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Renders the separator icon + two ascendency skill buttons.
// Returns an empty string when no ascendency is active.
function renderAscendencyButtons() {
    if (!STATE.playerAscendency) return '';
    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];
    if (!asc) return '';

    return `
        <span class="chud-asc-sep" title="${t(asc.nameEn, asc.nameDE)}">${asc.icon}</span>
        ${renderCompactAscBtn(asc, 'active3', 'active1')}
        ${renderCompactAscBtn(asc, 'active4', 'active2')}`;
}




//------------------------------------------------------------------------
//--------------------SHIELD PIP RENDERER---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Renders the row of pip icons that visualise current Variance Shield stacks.
// Caps the visual display at HUD_SHIELD_PIP_MAX pips regardless of actual stack count.
function _renderShieldPips(stacks) {
    const maxShow = Math.min(stacks, HUD_SHIELD_PIP_MAX);
    let pips = '';
    for (let i = 0; i < maxShow; i++) {
        pips += `<span class="chud-shield-pip"></span>`;
    }
    return `<span class="chud-shield-pips" title="Variance Shield: ${stacks} stack(s)">${pips}</span>`;
}




//------------------------------------------------------------------------
//--------------------MOMENTUM BAR HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates the momentum bar colour, glow, and border values based on how
// close the current streak is to the threshold. Returns a style object.
function _calcMomentumStyles(streak, threshold) {
    const pct = Math.min(streak / threshold, 1);
    const g = Math.round(30 + 60 * (1 - pct));
    const col = `rgb(220,${g},40)`;

    const glowSize = 2 + pct * 10;
    const glowOpacity = 0.3 + pct * 0.65;
    const borderWidth = 1 + Math.round(pct * 2);

    return {
        col,
        glow: `0 0 ${glowSize}px rgba(220,${g},40,${glowOpacity}), inset 0 0 ${glowSize * 0.6}px rgba(220,${g},40,${glowOpacity * 0.3})`,
        border: `${borderWidth}px solid ${col}`,
    };
}

// Applies an active momentum state to the drag handle element.
function _applyMomentumStyles(handle, countEl, streak, styles) {
    handle.style.setProperty('--mom-color', styles.col);
    handle.style.setProperty('--mom-glow', styles.glow);
    handle.style.setProperty('--mom-border', styles.border);
    handle.classList.add('chud-has-momentum');
    handle.classList.remove('chud-momentum-reset');
    countEl.textContent = streak;
    countEl.style.color = styles.col;
}

// Resets the momentum bar to its neutral state and triggers the flash animation.
function _resetMomentumBar(handle, countEl) {
    handle.classList.add('chud-momentum-reset');
    handle.style.removeProperty('--mom-color');
    handle.style.removeProperty('--mom-glow');
    handle.style.removeProperty('--mom-border');
    countEl.textContent = '';
    setTimeout(() => handle.classList.remove('chud-momentum-reset'), 400);
}

// Returns the momentum count element, creating and appending it if it doesn't exist yet.
function _getOrCreateMomentumCountEl(handle) {
    let count = document.getElementById('chud-momentum-count');
    if (!count) {
        count = document.createElement('span');
        count.id = 'chud-momentum-count';
        count.style.cssText = 'font-family:var(--PX,monospace); font-size:15px; font-weight:bold; min-width:14px; text-align:center;';
        handle.appendChild(count);
    }
    return count;
}

// Updates the momentum bar on the drag handle each time the streak changes.
// A streak of 0 triggers the reset flash animation; anything above 0 shows
// a colour gradient that intensifies as the streak approaches the threshold.
function updateMomentumBar(streak, threshold) {
    const handle = document.getElementById('class-hud-drag-handle');
    if (!handle) return;

    const countEl = _getOrCreateMomentumCountEl(handle);

    if (streak === 0) {
        _resetMomentumBar(handle, countEl);
        return;
    }

    _applyMomentumStyles(handle, countEl, streak, _calcMomentumStyles(streak, threshold));
}




//------------------------------------------------------------------------
//--------------------COMPACT HUD RENDERER--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the drag-handle row: grip icon, class icon (passive tooltip),
// active skill buttons, optional ascendency buttons, and optional shield pips.
function renderCompactHUD(def) {
    const isMage = STATE.playerClass === 'mathmagician';
    const stacks = isMage ? (window._classFreeMistakes || 0) : 0;
    const shieldAttr = isMage ? `data-shield-stacks="${stacks}"` : '';
    const shieldPips = isMage && stacks > 0 ? _renderShieldPips(stacks) : '';

    // The momentum bar row is injected only for the Statistician
    const momentumBar = STATE.playerClass === 'statistician'
        ? '<div id="chud-momentum-bar-wrap"><div id="chud-momentum-bar"></div><span id="chud-momentum-count"></span></div>'
        : '';

    return `
        <div id="class-hud-drag-handle" ${shieldAttr}>
            <span class="chud-grip">⠿</span>
            <span class="chud-icon-sm"
                  data-tipkey="passive"
                  onmouseenter="handleHUDTip(event,'passive')"
                  onmousemove="handleHUDTipMove(event)"
                  onmouseleave="hideHUDTooltip()">
                ${def.icon}
            </span>
            ${renderCompactActiveBtn(def, 'active1')}
            ${renderCompactActiveBtn(def, 'active2')}
            ${STATE.playerAscendency ? renderAscendencyButtons() : ''}
            ${shieldPips}
        </div>
        ${momentumBar}`;
}




//------------------------------------------------------------------------
//---------------------BUILD CLASS HUD (MAIN ENTRY)-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the shield stack attribute on the HUD panel element so CSS can
// layer the correct visual treatment.
function _updatePanelShieldAttribute(panel) {
    if (STATE.playerClass === 'mathmagician') {
        panel.setAttribute('data-shield-stacks', window._classFreeMistakes || 0);
    } else {
        panel.removeAttribute('data-shield-stacks');
    }
}

// Rebuilds the entire class HUD panel. Called after a cooldown expires,
// after an ability is used, or whenever game state changes class/ascendency.
function buildClassHUD() {
    const panel = document.getElementById('class-hud-panel');
    if (!panel) return;

    hideHUDTooltip();

    if (!STATE.playerClass || isClassless()) {
        panel.innerHTML = '';
        panel.style.display = 'none';
        return;
    }

    const def = CLASS_DEFS[STATE.playerClass];
    if (!def) return;

    // Ensure classActiveChoice is a valid slot key, not a legacy number
    if (!STATE.classActiveChoice || typeof STATE.classActiveChoice === 'number') {
        STATE.classActiveChoice = 'active1';
    }

    panel.style.display = 'flex';
    panel.innerHTML = renderCompactHUD(def);

    _updatePanelShieldAttribute(panel);
    injectCompactHUDStyles(def);
    makeClassHUDDraggable();

    // If the Drifter timer is running, keep the badge docked
    if (window._drifterHudInterval && typeof remainingSeconds !== 'undefined' && remainingSeconds > 0) {
        _drifterSpawnIndicator(remainingSeconds);
    }
}




//------------------------------------------------------------------------
//-------------------------HUD CSS INJECTION------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Injects the compact HUD stylesheet into <head> once per page load.
// Subsequent calls are no-ops (guarded by the style element ID).
function injectCompactHUDStyles(def) {
    if (document.getElementById('chud-compact-styles')) return;
    const s = document.createElement('style');
    s.id = 'chud-compact-styles';
    s.textContent = `
        #class-hud-panel {
            position: fixed;
            top: 60px;
            left: 12px;
            z-index: 600;
            display: flex;
            flex-direction: column;
            user-select: none;
        }

        #class-hud-drag-handle {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(10,10,20,0.88);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            padding: 4px 5px;
            cursor: grab;
            backdrop-filter: blur(4px);
            box-shadow: 0 2px 12px rgba(0,0,0,0.5);
            white-space: nowrap;
        }

        #class-hud-drag-handle:active { cursor: grabbing; }

        .chud-grip {
            font-size: 13px;
            opacity: .35;
            pointer-events: none;
            line-height: 1;
        }

        .chud-icon-sm {
            font-size: 16px;
            line-height: 1;
            cursor: help;
        }

        .chud-skill-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(0,0,0,0.4);
            border: 1px solid #3498db;
            border-radius: 5px;
            padding: 3px 7px;
            font-family: var(--PX, monospace);
            font-size: 10px;
            color: #ccc;
            transition: background .12s, border-color .12s;
            min-width: 44px;
            justify-content: center;
        }

        .chud-skill-btn:hover:not(.on-cd) {
            background: rgba(52,152,219,0.18);
        }

        .chud-skill-btn.armed {
            background: rgba(231,76,60,0.15) !important;
        }

        .chud-skill-btn.on-cd {
            opacity: .65;
        }

        .chud-btn-idx {
            font-weight: bold;
            font-size: 9px;
            opacity: .8;
        }

        .chud-btn-ready {
            font-size: 9px;
            opacity: .9;
        }

        .chud-btn-ready.armed {
            color: #e74c3c;
            font-weight: bold;
        }

        .chud-btn-cd {
            font-size: 9px;
            color: #e67e22;
            font-variant-numeric: tabular-nums;
            letter-spacing: .03em;
        }

        #class-hud-drag-handle.chud-has-momentum {
            border: var(--mom-border, 1px solid rgba(255,255,255,0.12));
            box-shadow: var(--mom-glow, 0 2px 12px rgba(0,0,0,0.5));
            transition: border .2s, box-shadow .2s;
        }

        #class-hud-drag-handle.chud-momentum-reset {
            border: 1px solid rgba(255,255,255,0.12) !important;
            box-shadow: 0 2px 12px rgba(0,0,0,0.5) !important;
            transition: border .15s, box-shadow .15s;
        }

        #chud-momentum-count {
            font-family: var(--PX, monospace);
            font-size: 13px;
            font-weight: bold;
            min-width: 14px;
            text-align: center;
            line-height: 1;
        }
    `;
    document.head.appendChild(s);
}




//------------------------------------------------------------------------
//----------------------------DRAG LOGIC----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Clamps a proposed panel position so it stays fully within the visible viewport.
function clampToViewport(left, top, panelW, panelH) {
    return {
        left: Math.max(0, Math.min(left, window.innerWidth - panelW)),
        top: Math.max(0, Math.min(top, window.innerHeight - panelH)),
    };
}

// Attaches pointer-event based drag behaviour to the HUD panel via its drag handle.
// Skill buttons on the handle are excluded from initiating a drag.
function makeClassHUDDraggable() {
    const panel = document.getElementById('class-hud-panel');
    const handle = document.getElementById('class-hud-drag-handle');
    if (!panel || !handle) return;

    let dragging = false;
    let startX, startY, origLeft, origTop;

    handle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.chud-skill-btn')) return; // let button clicks through
        e.preventDefault();
        dragging = true;
        handle.setPointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        startX = e.clientX;
        startY = e.clientY;
    });

    handle.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const { left, top } = clampToViewport(
            origLeft + (e.clientX - startX),
            origTop + (e.clientY - startY),
            panel.offsetWidth,
            panel.offsetHeight
        );
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    });

    handle.addEventListener('pointerup', () => { dragging = false; });
    handle.addEventListener('pointercancel', () => { dragging = false; });
}




//------------------------------------------------------------------------
//----------------------MINIMIZE TOGGLE (STUB)----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The compact HUD has no minimize state. This stub exists only to avoid
// errors in any external code that still calls toggleClassHUDMinimize.
function toggleClassHUDMinimize(e) {
    if (e) e.stopPropagation();
}

// The minimized cooldown bar is not used in compact mode. This stub keeps
// any external callers from breaking.
function renderMinimizedCooldownBar() { return ''; }