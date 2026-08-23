//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Max level any class or ascendency skill can reach.
const CLASS_SKILL_MAX_LEVEL = 3;

// Delay (ms) before firing the post-overlay callback, giving the close animation time to finish.
const AFTER_CLASS_EVENT_DELAY_MS = 120;

// Cursor offset (px) used when positioning the weapon-locker / spell-locker tooltip.
const CLASS_TOOLTIP_OFFSET_X = 18;
const CLASS_TOOLTIP_OFFSET_Y = 18;




//------------------------------------------------------------------------
//----------------------------STATE---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Callback fired after the full class-event flow finishes (e.g. closes the world-completion modal).
// Set via triggerClassEventIfPending and consumed by closeClassOverlay.
let _afterClassEventCallback = null;

// Whether the shared #cs-tooltip element is currently open. Used by every screen that has
// hover targets (class-selection weapon lockers, ascendency-selection lockers, class-upgrade /
// ascendency-upgrade spell lockers) so mousemove just repositions instead of rebuilding
// content on every event.
let _classTooltipOpen = false;




//------------------------------------------------------------------------
//-------------------SHARED TOOLTIP MECHANICS (DOM)-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Generic show/hide/position plumbing for the shared #cs-tooltip element.
// Content-specific tooltip builders (showClassTooltip, showAscendencyTooltip,
// showUpgradeTooltip, showAscendencyUpgradeTooltip) live next to the screens
// that use them and call showCsTooltip() below to actually render.

// Hides the shared tooltip element. Called on mouseleave of any locker element
// and whenever the overlay closes.
function hideClassTooltip() {
    _classTooltipOpen = false;

    const tooltip = document.getElementById('cs-tooltip');
    if (!tooltip) return;

    tooltip.classList.remove('show');
}

// Moves the tooltip to follow the cursor while a locker is hovered,
// clamping to the viewport so it never renders off-screen.
function positionClassTooltip(event) {
    if (!_classTooltipOpen) return;

    const tooltip = document.getElementById('cs-tooltip');
    if (!tooltip) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();

    let x = event.clientX + CLASS_TOOLTIP_OFFSET_X;
    let y = event.clientY + CLASS_TOOLTIP_OFFSET_Y;

    if (x + rect.width > vw) x = event.clientX - rect.width - CLASS_TOOLTIP_OFFSET_X;
    if (y + rect.height > vh) y = event.clientY - rect.height - CLASS_TOOLTIP_OFFSET_Y;

    x = Math.max(4, x);
    y = Math.max(4, y);

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

// Renders arbitrary HTML into the shared #cs-tooltip element, colours it to match
// the calling card/class, and positions it near the cursor. Used by the class-selection
// weapon lockers, the ascendency-selection lockers, and the class-upgrade / ascendency-upgrade
// spell lockers.
function showCsTooltip(html, color, event) {
    const tooltip = document.getElementById('cs-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = html;
    tooltip.style.setProperty('--cls-color', color);
    tooltip.style.borderColor = color;

    _classTooltipOpen = true;

    tooltip.classList.add('show');
    positionClassTooltip(event);
}




//------------------------------------------------------------------------
//-------------------OVERLAY DOM HELPERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the two overlay DOM elements used by every class/ascendency screen.
function getClassOverlayElements() {
    return {
        overlay: document.getElementById('class-selection-overlay'),
        content: document.getElementById('class-selection-content'),
    };
}

// Writes HTML into the overlay content area and makes the overlay visible.
// classId (optional) is written to data-classid on the overlay element so CSS
// can key a per-class background (or other per-class chrome) off it — see
// showClassUpgrade(), showAscendencySelection() and their respective CSS files.
function openClassOverlay(html, mode, classId) {
    const { overlay, content } = getClassOverlayElements();
    content.innerHTML = html;
    overlay.dataset.mode = mode || '';
    if (classId) overlay.dataset.classid = classId;
    else overlay.removeAttribute('data-classid');
    overlay.classList.add('show');
}

// Hides the overlay and fires the pending after-event callback if one is set.
function closeClassOverlay() {
    const { overlay } = getClassOverlayElements();
    overlay.classList.remove('show');
    overlay.removeAttribute('data-mode');
    overlay.removeAttribute('data-classid');

    hideClassTooltip();

    if (_afterClassEventCallback) {
        const cb = _afterClassEventCallback;
        _afterClassEventCallback = null;
        setTimeout(cb, AFTER_CLASS_EVENT_DELAY_MS);
    }
}




//------------------------------------------------------------------------
//-------------------SHARED CARD HTML BUILDERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds a single ability row (passive or active) used inside class/ascendency cards
// and inside the weapon-locker / ascendency-locker tooltip.
function buildAbilityBlock(tagLabel, tagClass, abilityName, abilityDesc, slotClass) {
    return `
        <div class="cs-ability ${tagClass} ${slotClass || ''}">
            <span class="cs-ability-tag ${tagClass}">${tagLabel}</span>
            <span class="cs-ability-name">${abilityName}</span>
            <span class="cs-ability-desc">${abilityDesc}</span>
        </div>`;
}

// Builds the "✓ MAX LEVEL" badge used on upgrade cards when an ability is already capped.
function buildMaxedBadge() {
    return `<div class="cs-upgrade-maxed">${t('cls_max_level')}</div>`;
}

// Returns the localised display name from any definition object that has nameEn / nameDE fields.
function _clsGetLocalizedName(obj) {
    return LANG === 'de' ? obj.nameDE : obj.nameEn;
}

// Returns the localised description string from any level-data object with descEn / descDE fields.
function _clsGetLocalizedDesc(data) {
    return LANG === 'de' ? data.descDE : data.descEn;
}

// Builds the current -> new comparison block shown inside a spell-locker tooltip.
// Used by both base-class upgrades and ascendency upgrades.
// If atMax is true, only the current description is shown alongside a "maxed" tag.
function buildUpgradeTooltipContent(tagLabel, tagClass, abilityName, currentDesc, nextDesc, atMax) {
    const curLabel = t('cls_current');
    const newLabel = t('cls_new');
    const maxLabel = t('cls_max_level');

    const body = atMax
        ? `
            <div class="cs-tooltip-current"><span class="cs-tooltip-compare-label">${curLabel}</span>${currentDesc}</div>
            <div class="cs-tooltip-maxed-tag">${maxLabel}</div>`
        : `
            <div class="cs-tooltip-compare">
                <div class="cs-tooltip-current"><span class="cs-tooltip-compare-label">${curLabel}</span>${currentDesc}</div>
                <div class="cs-tooltip-arrow">↓</div>
                <div class="cs-tooltip-new"><span class="cs-tooltip-compare-label">${newLabel}</span>${nextDesc}</div>
            </div>`;

    return `
        <div class="cs-ability ${tagClass}">
            <span class="cs-ability-tag ${tagClass}">${tagLabel}</span>
            <span class="cs-ability-name">${abilityName}</span>
            ${body}
        </div>`;
}

// Builds the standard section header used at the top of every overlay screen.
function buildOverlayHeader(titleHtml, subtitleHtml) {
    return `
        <div class="cs-header">
            <div class="cs-title">${titleHtml}</div>
            <div class="cs-subtitle">${subtitleHtml}</div>
        </div>`;
}

// Builds the "all maxed" footer with a close button; returns empty string if not all abilities are maxed.
function buildAllMaxedFooter(color, emoji, messageKey) {
    const message = t(messageKey);
    const closeLabel = t('cls_close');

    return `
        <div style="text-align:center;margin-top:18px;color:${color};font-family:var(--PX);font-size:11px;">
            ${emoji} ${message}
        </div>
        <div style="text-align:center;margin-top:12px;">
            <button class="cs-skip-btn" onclick="closeClassOverlay()">
                ${closeLabel}
            </button>
        </div>`;
}




//------------------------------------------------------------------------
//-------------------SKILL STATE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Raw STATE accessors for base-class and ascendency skill levels. Grouped here
// (rather than under their respective "apply upgrade" sections) because the
// upgrade-tooltip builders on both screens need to read current level before
// the "apply" logic further down is defined.

// Returns the ability definition object for the given type key ('passive', 'active1', 'active2').
function getAbilityDef(def, type) {
    if (type === 'passive') return def.passive;
    if (type === 'active1') return def.active1;
    return def.active2;
}

// Increments the state level for the given ability type, capped at CLASS_SKILL_MAX_LEVEL.
function incrementClassSkillLevel(type) {
    if (type === 'passive') {
        STATE.classPassiveLevel = Math.min((STATE.classPassiveLevel || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else if (type === 'active1') {
        STATE.classActive1Level = Math.min((STATE.classActive1Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else if (type === 'active2') {
        STATE.classActive2Level = Math.min((STATE.classActive2Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    }
}

// Returns the current saved level for the given ability type.
function getClassSkillLevel(type) {
    if (type === 'passive') return STATE.classPassiveLevel;
    if (type === 'active1') return STATE.classActive1Level;
    return STATE.classActive2Level;
}

// Returns the localised ability name for the given type from a class definition.
function getClassAbilityName(def, type) {
    if (type === 'passive') return _clsGetLocalizedName(def.passive);
    if (type === 'active1') return _clsGetLocalizedName(def.active1);
    return _clsGetLocalizedName(def.active2);
}

// Increments the state level for the given ascendency skill type, capped at CLASS_SKILL_MAX_LEVEL.
function incrementAscendencySkillLevel(type) {
    if (type === 'active1') {
        STATE.ascendencySkill1Level = Math.min((STATE.ascendencySkill1Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else {
        STATE.ascendencySkill2Level = Math.min((STATE.ascendencySkill2Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    }
}

// Returns the current saved level for the given ascendency skill type.
function getAscendencySkillLevel(type) {
    return type === 'active1' ? STATE.ascendencySkill1Level : STATE.ascendencySkill2Level;
}




//------------------------------------------------------------------------
//-------------------WORLD COMPLETION CHECK-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Checks whether every level in the current world has been completed.
// Iterates over all global indices that belong to this world.
function areAllWorldLevelsDone(wi, world) {
    const worldStart = WORLD_START_GI[wi];
    const worldEnd = worldStart + world.data.length - 1;
    for (let gi = worldStart; gi <= worldEnd; gi++) {
        if (!STATE.done.includes(gi)) return false;
    }
    return true;
}

// Called after every level completion.
// If the whole world is now done and hasn't triggered a class event yet,
// sets a pending flag so the event fires when the result screen is dismissed.
function checkWorldCompletion() {
    if (!cur) return;
    const wi = cur.world - 1;
    const world = WORLDS[wi];
    if (!world || !world.data.length) return;
    if (!areAllWorldLevelsDone(wi, world)) return;

    if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
    if (STATE.classWorldsCompleted.includes(wi)) return;

    STATE._pendingClassEvent = true;
    STATE._lastClassWorld = wi;
    save();
}




//------------------------------------------------------------------------
//-------------------CLASS SELECTION SCREEN-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip content (passive + two actives) shown when hovering a class's weapon locker.
function buildClassTooltipContent(def) {
    const passiveBlock = buildAbilityBlock(
        t('cls_tag_passive').replace('{i}', '⚡'),
        'passive',
        _clsGetLocalizedName(def.passive),
        _clsGetLocalizedDesc(def.passive.levels[0])
    );
    const active1Block = buildAbilityBlock(
        t('cls_tag_active1').replace('{i}', '🎯'),
        'active',
        _clsGetLocalizedName(def.active1),
        _clsGetLocalizedDesc(def.active1.levels[0])
    );
    const active2Block = buildAbilityBlock(
        t('cls_tag_active2').replace('{i}', '🎯'),
        'active',
        _clsGetLocalizedName(def.active2),
        _clsGetLocalizedDesc(def.active2.levels[0])
    );
    return passiveBlock + active1Block + active2Block;
}

// Builds a full class card — used both in the initial selection screen (mode = 'select')
// and in any display-only context (mode = 'view').
// Layout: icon -> name -> desc -> weapon locker (hover = tooltip) -> select button.
function buildClassCard(cid, mode) {
    const def = CLASS_DEFS[cid];

    const cta = mode === 'select'
        ? `<div class="cs-card-cta" onclick="confirmClassSelection('${cid}')">${t('cls_btn_select')}</div>`
        : '';

    const name = _clsGetLocalizedName(def);
    const desc = _clsGetLocalizedDesc(def);

    return `
        <div class="cs-card"
             style="border-color:${def.color};--cls-color:${def.color};--cls-light:${def.colorLight};"
             data-classid="${cid}">
            <div class="cs-card-icon">${def.icon}</div>
            <div class="cs-card-name" style="color:${def.colorLight};">${name}</div>
            <div class="cs-card-desc">${desc}</div>
            <div class="cs-weapon-locker"
                 onmouseenter="showClassTooltip('${cid}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()"></div>
            ${cta}
        </div>`;
}

// Shows the custom tooltip for a class's weapon locker, fills it with that
// class's ability info, colours it to match the class, and positions it
// near the cursor. Called on mouseenter of .cs-weapon-locker.
function showClassTooltip(cid, event) {
    const def = CLASS_DEFS[cid];
    if (!def) return;

    showCsTooltip(buildClassTooltipContent(def), def.color, event);
}

// Shows the initial class selection overlay, letting the player pick their base class.
// Triggered on first world completion when no class has been chosen yet.
function showClassSelection() {
    const title = t('cls_choose_class_title');
    const subtitle = t('cls_decision_permanent');

    const header = buildOverlayHeader(`${title}`, subtitle);
    const cards = CLASS_LIST.map(cid => buildClassCard(cid, 'select')).join('');

    openClassOverlay(`
        ${header}
        <div class="cs-cards">${cards}</div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
    `, 'select');

    Audio_Manager.playSFX('classSelection');
}

// Saves the chosen class, initialises all skill levels to 1, and closes the overlay.
function confirmClassSelection(cid) {
    if (!CLASS_DEFS[cid]) return;

    STATE.playerClass = cid;
    STATE.classPassiveLevel = 1;
    STATE.classActive1Level = 1;
    STATE.classActive2Level = 1;
    STATE.classActiveLevel = 1;
    STATE.classActiveChoice = 'active1';

    if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
    STATE.classWorldsCompleted.push(STATE._lastClassWorld);
    save();

    const def = CLASS_DEFS[cid];
    const className = _clsGetLocalizedName(def);
    const selectedLabel = t('cls_selected_toast');

    Audio_Manager.playSFX('classSelected');
    showToast(`${def.icon} ${className} ${selectedLabel}`);
    updateQuestStats('classChosen', {});

    closeClassOverlay();
    buildClassHUD();
}




//------------------------------------------------------------------------
//-------------------CLASS UPGRADE SCREEN---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised tag label shown on an upgrade card header row.
function getUpgradeTagLabel(type, classId) {
    const icon = (CLASS_SPELL_ICONS[classId] && CLASS_SPELL_ICONS[classId][type]) || (type === 'passive' ? '⚡' : '🎯');
    if (type === 'passive') return t('cls_tag_passive').replace('{i}', icon);
    if (type === 'active1') return t('cls_tag_active1').replace('{i}', icon);
    return t('cls_tag_active2').replace('{i}', icon);
}

// Returns the localised CTA button label for the given ability, using its actual
// spell name (e.g. "▶ UPGRADE MOMENTUM") instead of a generic slot label.
function getUpgradeCTALabel(type, abilityName) {
    return t('cls_upgrade_cta').replace('{n}', abilityName);
}

// Builds one spell card for a base-class ability (passive / active1 / active2), styled to match
// the class-selection cards: icon -> name -> level badge -> spell locker (hover = tooltip) -> CTA.
// The spell locker currently shows a generic glyph placeholder — see class_spell_upgrade.css
// for how to swap in real per-class/per-ability artwork later.
function buildClassUpgradeCard(def, type, currentLv, maxLv) {
    const atMax = currentLv >= maxLv;
    const abilityDef = getAbilityDef(def, type);
    const tagLabel = getUpgradeTagLabel(type, STATE.playerClass);
    const nextLv = Math.min(currentLv + 1, maxLv);

    const abilityName = _clsGetLocalizedName(abilityDef);
    const levelLabel = t('cls_level_label');
    const tagClass = type === 'passive' ? 'passive' : 'active';
    const lockerIcon = (CLASS_SPELL_ICONS[STATE.playerClass] && CLASS_SPELL_ICONS[STATE.playerClass][type]) || (type === 'passive' ? '⚡' : '🎯');

    const cta = atMax
        ? buildMaxedBadge()
        : `<div class="cs-card-cta" onclick="applyClassUpgrade('${type}')">${getUpgradeCTALabel(type, abilityName)}</div>`;

    return `
        <div class="cs-card cs-spell-card ${atMax ? 'maxed' : ''}"
             style="border-color:${def.color};--cls-color:${def.color};--cls-light:${def.colorLight};"
             data-classid="${STATE.playerClass}" data-type="${type}">
            <div class="cs-card-icon">${lockerIcon}</div>
            <div class="cs-card-name" style="color:${def.colorLight};">${abilityName}</div>
            <div class="cs-spell-level-badge ${tagClass}">${tagLabel} · ${levelLabel} ${currentLv} → ${nextLv}</div>
            <div class="cs-spell-locker cs-spell-locker--${tagClass}"
                 onmouseenter="showUpgradeTooltip('${type}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()">
            </div>
            ${cta}
        </div>`;
}

// Shows the tooltip for a base-class spell locker: current level's description compared
// against the next level's description (or a "maxed" tag if already at cap).
// Called on mouseenter of .cs-spell-locker inside the class-upgrade screen.
function showUpgradeTooltip(type, event) {
    const def = CLASS_DEFS[STATE.playerClass];
    if (!def) return;

    const abilityDef = getAbilityDef(def, type);
    const currentLv = getClassSkillLevel(type);
    const atMax = currentLv >= CLASS_SKILL_MAX_LEVEL;

    const abilityName = _clsGetLocalizedName(abilityDef);
    const currentDesc = _clsGetLocalizedDesc(abilityDef.levels[currentLv - 1]);
    const nextDesc = atMax ? '' : _clsGetLocalizedDesc(abilityDef.levels[currentLv]);
    const tagLabel = getUpgradeTagLabel(type);
    const tagClass = type === 'passive' ? 'passive' : 'active';

    const html = buildUpgradeTooltipContent(tagLabel, tagClass, abilityName, currentDesc, nextDesc, atMax);
    showCsTooltip(html, def.color, event);
}

// Shows the base-class upgrade overlay.
// Increments the available-upgrade counter before rendering, since this call itself represents an earned upgrade.
function showClassUpgrade() {
    if (!STATE.playerClass) return;

    if (STATE.classUpgradesAvailable === undefined) STATE.classUpgradesAvailable = 0;
    STATE.classUpgradesAvailable++;
    save();

    const def = CLASS_DEFS[STATE.playerClass];
    const levels = {
        passive: STATE.classPassiveLevel || 1,
        active1: STATE.classActive1Level || 1,
        active2: STATE.classActive2Level || 1,
    };
    const allMax = Object.values(levels).every(lv => lv >= CLASS_SKILL_MAX_LEVEL);

    const className = _clsGetLocalizedName(def);
    const headerTitle = t('cls_class_upgrade_title');
    const headerSub = t('cls_class_upgrade_sub').replace('{n}', className);

    const header = buildOverlayHeader(`${def.icon} ${headerTitle}`, headerSub);

    const footer = allMax
        ? buildAllMaxedFooter(
            '#27ae60',
            '🏆',
            'cls_all_abilities_maxed'
        )
        : '';

    openClassOverlay(`
        ${header}
        <div class="cs-cards cs-spell-cards">
            ${buildClassUpgradeCard(def, 'passive', levels.passive, CLASS_SKILL_MAX_LEVEL)}
            ${buildClassUpgradeCard(def, 'active1', levels.active1, CLASS_SKILL_MAX_LEVEL)}
            ${buildClassUpgradeCard(def, 'active2', levels.active2, CLASS_SKILL_MAX_LEVEL)}
        </div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
        ${footer}
    `, 'upgrade', STATE.playerClass);
}




//------------------------------------------------------------------------
//-------------------APPLY CLASS UPGRADE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Decrements the available-upgrade counter, floored at 0.
function decrementUpgradesAvailable() {
    STATE.classUpgradesAvailable = Math.max(0, (STATE.classUpgradesAvailable || 1) - 1);
}

// Appends the last completed world index to the classWorldsCompleted list.
function markLastWorldCompleted() {
    if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
    STATE.classWorldsCompleted.push(STATE._lastClassWorld);
}

// Shows a toast confirming which ability was upgraded and to what level.
function showClassUpgradeToast(type) {
    const def = CLASS_DEFS[STATE.playerClass];
    const abilityName = getClassAbilityName(def, type);
    const newLv = getClassSkillLevel(type);
    showToast(`${def.icon} ${abilityName} → ${t('cls_level_word')} ${newLv}!`);
}

// Applies a base-class skill upgrade: increments the level, saves state, updates UI.
function applyClassUpgrade(type) {
    incrementClassSkillLevel(type);
    decrementUpgradesAvailable();
    markLastWorldCompleted();
    save();

    Audio_Manager.playSFX('classUpgraded');
    trackAchStat('classUpgradesApplied');
    updateQuestStats('classUpgradeApplied', {});
    closeClassOverlay();
    showClassUpgradeToast(type);
    buildClassHUD();
}




//------------------------------------------------------------------------
//-------------------ASCENDENCY SELECTION SCREEN--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Redesigned to match the base class-selection screen 1:1: icon -> name ->
// archetype tag -> desc -> ascendency locker (hover = tooltip with both
// skills) -> ascend button. Only ever renders the 2 ascendencies that are
// reachable from the player's current base class (see ASCENDENCY_LIST).

// Builds the tooltip content (both skills) shown when hovering an ascendency's locker.
function buildAscendencyTooltipContent(asc) {
    const skill1Block = buildAbilityBlock(
        t('cls_tag_skill1').replace('{i}', '🎯'),
        'active',
        _clsGetLocalizedName(asc.active1),
        _clsGetLocalizedDesc(asc.active1.levels[0])
    );
    const skill2Block = buildAbilityBlock(
        t('cls_tag_skill2').replace('{i}', '🎯'),
        'active',
        _clsGetLocalizedName(asc.active2),
        _clsGetLocalizedDesc(asc.active2.levels[0])
    );
    return skill1Block + skill2Block;
}

// Builds a full ascendency card — used in selection (mode = 'select') or display (mode = 'view') contexts.
// Layout matches buildClassCard(): icon -> name -> archetype tag -> desc -> locker (hover) -> CTA.
function buildAscendencyCard(aid, mode) {
    const asc = ASCENDENCY_DEFS[aid];
    if (!asc) return '';

    const cta = mode === 'select'
        ? `<div class="cs-card-cta" onclick="confirmAscendencySelection('${aid}')">${t('cls_btn_ascend')}</div>`
        : '';

    const name = _clsGetLocalizedName(asc);
    const desc = _clsGetLocalizedDesc(asc);

    return `
        <div class="cs-card"
             style="border-color:${asc.color};--cls-color:${asc.color};--cls-light:${asc.colorLight};"
             data-classid="${aid}">
            <div class="cs-card-icon">${asc.icon}</div>
            <div class="cs-card-name" style="color:${asc.colorLight};">${name}</div>
            <div class="cs-archetype-tag">${asc.archetype}</div>
            <div class="cs-card-desc">${desc}</div>
            <div class="cs-ascendency-locker"
                 onmouseenter="showAscendencyTooltip('${aid}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()"></div>
            ${cta}
        </div>`;
}

// Shows the custom tooltip for an ascendency's locker, filled with both of its
// skills, coloured to match, and positioned near the cursor.
// Called on mouseenter of .cs-ascendency-locker.
function showAscendencyTooltip(aid, event) {
    const asc = ASCENDENCY_DEFS[aid];
    if (!asc) return;

    showCsTooltip(buildAscendencyTooltipContent(asc), asc.color, event);
}

// Shows the ascendency selection overlay.
// Triggered when the base class is fully maxed and no ascendency has been chosen yet.
// Only the ascendencies reachable from STATE.playerClass are rendered (2 out of the 6 total).
function showAscendencySelection() {
    const baseDef = CLASS_DEFS[STATE.playerClass];
    const options = ASCENDENCY_LIST[STATE.playerClass] || [];

    const baseName = _clsGetLocalizedName(baseDef);
    const title = t('cls_choose_ascendency_title');
    const subtitle = t('cls_ascendency_select_sub').replace('{n}', baseName);

    const header = buildOverlayHeader(`✨ ${title}`, subtitle);
    const cards = options.map(aid => buildAscendencyCard(aid, 'select')).join('');

    openClassOverlay(`
        ${header}
        <div class="cs-cards cs-ascendency-cards">${cards}</div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
    `, 'ascend-select', STATE.playerClass);

    Audio_Manager.playSFX('classSelection');
}

// Saves the chosen ascendency, initialises both skill levels to 1, and closes the overlay.
function confirmAscendencySelection(aid) {
    if (!ASCENDENCY_DEFS[aid]) return;

    STATE.playerAscendency = aid;
    STATE.ascendencySkill1Level = 1;
    STATE.ascendencySkill2Level = 1;

    if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
    STATE.classWorldsCompleted.push(STATE._lastClassWorld);
    save();

    const asc = ASCENDENCY_DEFS[aid];
    const ascName = _clsGetLocalizedName(asc);
    const chosenLabel = t('cls_ascendency_chosen_toast');

    Audio_Manager.playSFX('classSelected');
    showToast(`✨ ${ascName} ${chosenLabel}`);
    updateQuestStats('ascendencyChosen', {});
    trackAchStat('ascendencyChosen');
    closeClassOverlay();
    buildClassHUD();
}




//------------------------------------------------------------------------
//-------------------ASCENDENCY UPGRADE SCREEN----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised tag label for an ascendency skill slot.
function getAscendencySkillTagLabel(type) {
    return type === 'active1'
        ? t('cls_tag_skill1').replace('{i}', '🎯')
        : t('cls_tag_skill2').replace('{i}', '🎯');
}

// Returns the localised CTA label for an ascendency skill upgrade, using its actual
// skill name instead of a generic slot label.
function getAscendencyUpgradeCTALabel(type, skillName) {
    return t('cls_upgrade_cta').replace('{n}', skillName);
}

// Builds one spell card for an ascendency skill slot (active1 or active2), styled to match
// the class-selection cards: icon -> name -> level badge -> spell locker (hover = tooltip) -> CTA.
function buildAscendencyUpgradeCard(asc, type, currentLv, maxLv) {
    const atMax = currentLv >= maxLv;
    const skillDef = asc[type];
    const nextLv = Math.min(currentLv + 1, maxLv);
    const tagLabel = getAscendencySkillTagLabel(type);
    const skillName = _clsGetLocalizedName(skillDef);
    const levelLabel = t('cls_level_label');
    const lockerIcon = (ASCENDENCY_SPELL_ICONS[STATE.playerAscendency] && ASCENDENCY_SPELL_ICONS[STATE.playerAscendency][type]) || '🎯';

    const cta = atMax
        ? buildMaxedBadge()
        : `<div class="cs-card-cta" onclick="applyAscendencyUpgrade('${type}')">${getAscendencyUpgradeCTALabel(type, skillName)}</div>`;

    return `
        <div class="cs-card cs-spell-card ${atMax ? 'maxed' : ''}"
             style="border-color:${asc.color};--cls-color:${asc.color};--cls-light:${asc.colorLight};"
             data-classid="${STATE.playerAscendency}" data-type="${type}">
            <div class="cs-card-icon">${lockerIcon}</div>
            <div class="cs-card-name" style="color:${asc.colorLight};">${skillName}</div>
            <div class="cs-spell-level-badge active">${tagLabel} · ${levelLabel} ${currentLv} → ${nextLv}</div>
            <div class="cs-spell-locker cs-spell-locker--active"
                 onmouseenter="showAscendencyUpgradeTooltip('${type}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()">
            </div>
            ${cta}
        </div>`;
}

// Shows the tooltip for an ascendency spell locker: current level's description compared
// against the next level's description (or a "maxed" tag if already at cap).
// Called on mouseenter of .cs-spell-locker inside the ascendency-upgrade screen.
function showAscendencyUpgradeTooltip(type, event) {
    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];
    if (!asc) return;

    const skillDef = asc[type];
    const currentLv = getAscendencySkillLevel(type);
    const atMax = currentLv >= CLASS_SKILL_MAX_LEVEL;

    const skillName = _clsGetLocalizedName(skillDef);
    const currentDesc = _clsGetLocalizedDesc(skillDef.levels[currentLv - 1]);
    const nextDesc = atMax ? '' : _clsGetLocalizedDesc(skillDef.levels[currentLv]);
    const tagLabel = getAscendencySkillTagLabel(type);

    const html = buildUpgradeTooltipContent(tagLabel, 'active', skillName, currentDesc, nextDesc, atMax);
    showCsTooltip(html, asc.color, event);
}

// Shows the ascendency upgrade overlay.
// Triggered when an ascendency is chosen but at least one skill is not yet at max level.
function showAscendencyUpgrade() {
    if (!STATE.playerAscendency) return;

    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];
    const levels = {
        active1: STATE.ascendencySkill1Level || 1,
        active2: STATE.ascendencySkill2Level || 1,
    };
    const allMax = Object.values(levels).every(lv => lv >= CLASS_SKILL_MAX_LEVEL);

    const ascName = _clsGetLocalizedName(asc);
    const title = t('cls_ascendency_upgrade_title');
    const subtitle = t('cls_ascendency_upgrade_sub').replace('{n}', ascName);

    const header = buildOverlayHeader(`${asc.icon} ${title}`, subtitle);

    const footer = allMax
        ? buildAllMaxedFooter(
            '#f1c40f',
            '✨',
            'cls_ascendency_fully_upgraded'
        )
        : '';

    openClassOverlay(`
        ${header}
        <div class="cs-cards cs-spell-cards">
            ${buildAscendencyUpgradeCard(asc, 'active1', levels.active1, CLASS_SKILL_MAX_LEVEL)}
            ${buildAscendencyUpgradeCard(asc, 'active2', levels.active2, CLASS_SKILL_MAX_LEVEL)}
        </div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
        ${footer}
    `, 'ascend-upgrade', STATE.playerAscendency);
}




//------------------------------------------------------------------------
//-------------------APPLY ASCENDENCY UPGRADE-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies an ascendency skill upgrade: increments the level, saves state, updates UI.
function applyAscendencyUpgrade(type) {
    incrementAscendencySkillLevel(type);
    markLastWorldCompleted();
    save();

    const asc = ASCENDENCY_DEFS[STATE.playerAscendency];
    const skillDef = asc[type];
    const newLv = getAscendencySkillLevel(type);

    Audio_Manager.playSFX('classUpgraded');
    showToast(`✨ ${_clsGetLocalizedName(skillDef)} → ${t('cls_level_word')} ${newLv}!`);
    updateQuestStats('ascendencyUpgradeApplied', {});
    trackAchStat('ascendencyUpgradesApplied');
    closeClassOverlay();
    buildClassHUD();
}




//------------------------------------------------------------------------
//-------------------CLASS EVENT ROUTER-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Top-level orchestrator — placed last since it dispatches to every screen
// entry point defined above (showClassSelection, showClassUpgrade,
// showAscendencySelection, showAscendencyUpgrade).

// Determines which class-event screen to show based on the current progression state.
// Priority order: initial selection → base class upgrades → ascendency selection → ascendency upgrades → nothing.
function resolveNextClassEvent() {
    if (!STATE.playerClass) return 'selectClass';
    if (!isBaseClassMaxed()) return 'upgradeClass';
    if (!hasAscendency()) return 'selectAscendency';
    if (!isAscendencyMaxed()) return 'upgradeAscendency';
    return 'allDone';
}

// Fires the appropriate class-event screen if a pending event exists.
// afterCallback (optional) is invoked once the whole flow is complete and the overlay is closed.
// Returns true if an event was triggered, false otherwise.
function triggerClassEventIfPending(afterCallback) {
    if (!STATE._pendingClassEvent) return false;

    STATE._pendingClassEvent = false;
    save();

    _afterClassEventCallback = afterCallback || null;

    const next = resolveNextClassEvent();
    if (next === 'selectClass') showClassSelection();
    else if (next === 'upgradeClass') showClassUpgrade();
    else if (next === 'selectAscendency') showAscendencySelection();
    else if (next === 'upgradeAscendency') showAscendencyUpgrade();
    else {
        // Nothing left to upgrade — fire the callback immediately.
        if (_afterClassEventCallback) {
            const cb = _afterClassEventCallback;
            _afterClassEventCallback = null;
            setTimeout(cb, AFTER_CLASS_EVENT_DELAY_MS);
        }
    }

    return true;
}