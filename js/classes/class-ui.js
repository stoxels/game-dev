import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { save } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { ASCENDENCY_DEFS, ASCENDENCY_SPELL_ICONS } from './ascendency-defs.js';
import { ASCENDENCY_LIST, hasAscendency, isAscendencyMaxed, isBaseClassMaxed } from './class-cooldown-state.js';
import { CLASS_DEFS, CLASS_LIST, CLASS_SPELL_ICONS } from './class-defs.js';
import { buildClassHUD } from './class-hud.js';
import { CHARM_BASE_ICON, charmKeyFor, ensureCharmState, getCharmByKey, promoteCharmSlotToRank } from '../skills/skill-charms.js';
import { getSkillDef, getSkillName } from '../skills/skill-registry.js';
import { updateQuestStats } from '../quests/quests-stats.js';

//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Max level any class or ascendency skill can reach.
export const CLASS_SKILL_MAX_LEVEL = 3;

// Delay (ms) before firing the post-overlay callback, giving the close animation time to finish.
export const AFTER_CLASS_EVENT_DELAY_MS = 120;

// Cursor offset (px) used when positioning the weapon-locker / spell-locker tooltip.
export const CLASS_TOOLTIP_OFFSET_X = 18;
export const CLASS_TOOLTIP_OFFSET_Y = 18;




//------------------------------------------------------------------------
//----------------------------STATE---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Callback fired after the full class-event flow finishes (e.g. closes the world-completion modal).
// Set via triggerClassEventIfPending and consumed by closeClassOverlay.
export let _afterClassEventCallback = null;

// Whether the shared #cs-tooltip element is currently open. Used by every screen that has
// hover targets (class-selection weapon lockers, ascendency-selection lockers, class-upgrade /
// ascendency-upgrade spell lockers) so mousemove just repositions instead of rebuilding
// content on every event.
export let _classTooltipOpen = false;




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
export function hideClassTooltip() {
    _classTooltipOpen = false;

    const tooltip = document.getElementById('cs-tooltip');
    if (!tooltip) return;

    tooltip.classList.remove('show');
}

// Moves the tooltip to follow the cursor while a locker is hovered,
// clamping to the viewport so it never renders off-screen.
export function positionClassTooltip(event) {
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
export function showCsTooltip(html, color, event) {
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
export function getClassOverlayElements() {
    return {
        overlay: document.getElementById('class-selection-overlay'),
        content: document.getElementById('class-selection-content'),
    };
}

// Writes HTML into the overlay content area and makes the overlay visible.
// classId (optional) is written to data-classid on the overlay element so CSS
// can key a per-class background (or other per-class chrome) off it - see
// showClassUpgrade(), showAscendencySelection() and their respective CSS files.
export function openClassOverlay(html, mode, classId) {
    const { overlay, content } = getClassOverlayElements();
    content.innerHTML = html;
    overlay.dataset.mode = mode || '';
    if (classId) overlay.dataset.classid = classId;
    else overlay.removeAttribute('data-classid');
    overlay.classList.add('show');
}

// Hides the overlay and fires the pending after-event callback if one is set.
export function closeClassOverlay() {
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
export function buildAbilityBlock(tagLabel, tagClass, abilityName, abilityDesc, slotClass) {
    return `
        <div class="cs-ability ${tagClass} ${slotClass || ''}">
            <span class="cs-ability-tag ${tagClass}">${tagLabel}</span>
            <span class="cs-ability-name">${abilityName}</span>
            <span class="cs-ability-desc">${abilityDesc}</span>
        </div>`;
}

// Builds the "✓ MAX LEVEL" badge used on upgrade cards when an ability is already capped.
export function buildMaxedBadge() {
    return `<div class="cs-upgrade-maxed">${t('cls_max_level')}</div>`;
}

// Returns the localised display name from any definition object that has nameEn / nameDE fields.
export function _clsGetLocalizedName(obj) {
    return LANG === 'de' ? obj.nameDE : obj.nameEn;
}

// Returns the localised description string from any level-data object with descEn / descDE fields.
export function _clsGetLocalizedDesc(data) {
    return LANG === 'de' ? data.descDE : data.descEn;
}

// Builds the current -> new comparison block shown inside a spell-locker tooltip.
// Used by both base-class upgrades and ascendency upgrades.
// If atMax is true, only the current description is shown alongside a "maxed" tag.
export function buildUpgradeTooltipContent(tagLabel, tagClass, abilityName, currentDesc, nextDesc, atMax) {
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
export function buildOverlayHeader(titleHtml, subtitleHtml) {
    return `
        <div class="cs-header">
            <div class="cs-title">${titleHtml}</div>
            <div class="cs-subtitle">${subtitleHtml}</div>
        </div>`;
}

// Builds the "all maxed" footer with a close button; returns empty string if not all abilities are maxed.
export function buildAllMaxedFooter(color, emoji, messageKey) {
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
export function getAbilityDef(def, type) {
    if (type === 'passive') return def.passive;
    if (type === 'active1') return def.active1;
    return def.active2;
}

// Increments the state level for the given ability type, capped at CLASS_SKILL_MAX_LEVEL.
export function incrementClassSkillLevel(type) {
    if (type === 'passive') {
        globalThis.STATE.classPassiveLevel = Math.min((globalThis.STATE.classPassiveLevel || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else if (type === 'active1') {
        globalThis.STATE.classActive1Level = Math.min((globalThis.STATE.classActive1Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else if (type === 'active2') {
        globalThis.STATE.classActive2Level = Math.min((globalThis.STATE.classActive2Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    }
}

// Returns the current saved level for the given ability type.
export function getClassSkillLevel(type) {
    if (type === 'passive') return globalThis.STATE.classPassiveLevel;
    if (type === 'active1') return globalThis.STATE.classActive1Level;
    return globalThis.STATE.classActive2Level;
}

// Returns the localised ability name for the given type from a class definition.
export function getClassAbilityName(def, type) {
    if (type === 'passive') return _clsGetLocalizedName(def.passive);
    if (type === 'active1') return _clsGetLocalizedName(def.active1);
    return _clsGetLocalizedName(def.active2);
}

// Increments the state level for the given ascendency skill type, capped at CLASS_SKILL_MAX_LEVEL.
export function incrementAscendencySkillLevel(type) {
    if (type === 'active1') {
        globalThis.STATE.ascendencySkill1Level = Math.min((globalThis.STATE.ascendencySkill1Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    } else {
        globalThis.STATE.ascendencySkill2Level = Math.min((globalThis.STATE.ascendencySkill2Level || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    }
}

// Returns the current saved level for the given ascendency skill type.
export function getAscendencySkillLevel(type) {
    return type === 'active1' ? globalThis.STATE.ascendencySkill1Level : globalThis.STATE.ascendencySkill2Level;
}




//------------------------------------------------------------------------
//-------------------WORLD COMPLETION CHECK-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Checks whether every level in the current world has been completed.
// Iterates over all global indices that belong to this world.
export function areAllWorldLevelsDone(wi, world) {
    const worldStart = globalThis.WORLD_START_GI[wi];
    const worldEnd = worldStart + world.data.length - 1;
    for (let gi = worldStart; gi <= worldEnd; gi++) {
        if (!globalThis.STATE.done.includes(gi)) return false;
    }
    return true;
}

// Called after every level completion.
// If the whole world is now done and hasn't triggered a class event yet,
// sets a pending flag so the event fires when the result screen is dismissed.
export function checkWorldCompletion() {
    if (!globalThis.cur) return;
    const wi = globalThis.cur.world - 1;
    const world = globalThis.WORLDS[wi];
    if (!world || !world.data.length) return;
    if (!areAllWorldLevelsDone(wi, world)) return;

    if (!globalThis.STATE.classWorldsCompleted) globalThis.STATE.classWorldsCompleted = [];
    if (globalThis.STATE.classWorldsCompleted.includes(wi)) return;

    // Nexus World special case: its Ascension Level grants a one-time
    // CLASS CHANGE TOKEN instead of the normal upgrade/ascendency flow.
    // The token is spent from the class-change screen (topbar button).
    if (typeof globalThis.isNexusWorld === 'function' && globalThis.isNexusWorld(wi)) {
        grantClassChangeToken(wi);
        return;
    }

    globalThis.STATE._pendingClassEvent = true;
    globalThis.STATE._lastClassWorld = wi;
    save();
}




//------------------------------------------------------------------------
//-------------------CLASS CHANGE TOKENS----------------------------------
//------------------------------------------------------------------------
// The Nexus Ascension Level (and, in the future, endgame sources) grant
// class-change tokens. Spending one lets the player pick a new base class;
// every class upgrade and the ascendency already earned are replayed on the
// new class (the spent worlds' upgrade list is carried over 1:1).

// Grants one class-change token (once per Nexus completion).
export function grantClassChangeToken(wi) {
    if (!globalThis.STATE.classWorldsCompleted) globalThis.STATE.classWorldsCompleted = [];
    if (!globalThis.STATE.classWorldsCompleted.includes(wi)) globalThis.STATE.classWorldsCompleted.push(wi);
    globalThis.STATE._lastClassWorld = wi;

    if (globalThis.STATE.classChangeTokens === undefined) globalThis.STATE.classChangeTokens = 0;
    globalThis.STATE.classChangeTokens++;
    save();

    if (typeof globalThis.showToast === 'function') globalThis.showToast(t('cls_change_token_toast'));
    Audio_Manager.playSFX('classSelected');

    // The topbars read token state on populate - refresh both entry buttons.
    if (typeof updateClassChangeButtons === 'function') updateClassChangeButtons();
}

// Returns how many class-change tokens the player currently holds.
export function getClassChangeTokens() {
    return globalThis.STATE.classChangeTokens || 0;
}

// Shows/hides the topbar class-change buttons (mv + wd) based on token count.
export function updateClassChangeButtons() {
    ['mv', 'wd'].forEach(p => {
        const btn = document.getElementById(p + '-btn-class-change');
        if (btn) btn.style.display = getClassChangeTokens() > 0 ? '' : 'none';
    });
}

// Opens the class-change screen (token-gated entry point).
export function showClassChange() {
    if (getClassChangeTokens() <= 0) return;
    showClassChangeSelection();
}

// The class-change screen: same card grid as the initial class selection,
// but the current class is marked, the CTA consumes a token, and the
// subtitle explains what happens to progression.
export function showClassChangeSelection() {
    const title = t('cls_change_title');
    const subtitle = t('cls_change_sub')
        .replace('{n}', getClassChangeTokens())
        .replace('{old}', globalThis.STATE.playerClass ? _clsGetLocalizedName(CLASS_DEFS[globalThis.STATE.playerClass]) : '-');

    const header = buildOverlayHeader(`🔄 ${title}`, subtitle);
    const cards = CLASS_LIST.map(cid => buildClassCard(cid, 'change')).join('');

    openClassOverlay(`
        ${header}
        <div class="cs-cards">${cards}</div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
    `, 'class-change');

    Audio_Manager.playSFX('classSelection');
}

// Consumes one class-change token and switches the base class.
// Ascendency + all skill levels are reset, but every world-upgrade the
// player has already banked is replayed on the new class, in order:
// base upgrades → ascendency selection → ascendency upgrades.
export function confirmClassChange(cid) {
    if (!CLASS_DEFS[cid]) return;
    if (getClassChangeTokens() <= 0) return;
    if (cid === globalThis.STATE.playerClass) { hideClassTooltip(); return; } // no-op pick

    globalThis.STATE.classChangeTokens--;
    globalThis.STATE.classChangeUsed = true;

    // Full reset of the class + ascendency progression...
    globalThis.STATE.playerClass = cid;
    globalThis.STATE.playerAscendency = null;
    globalThis.STATE.classPassiveLevel = 1;
    globalThis.STATE.classActive1Level = 1;
    globalThis.STATE.classActive2Level = 1;
    globalThis.STATE.classActiveLevel = 1;
    globalThis.STATE.classActiveChoice = 'active1';
    globalThis.STATE.ascendencySkill1Level = 1;
    globalThis.STATE.ascendencySkill2Level = 1;

    // ...then replay the earned upgrade flow on the new class: every
    // previously-completed world except the Nexus world itself queues one
    // class event (the very first of those was the original class CHOICE,
    // not an upgrade, so it doesn't count). The router serves them in the
    // correct order: base upgrades → ascendency selection → ascendency
    // upgrades, exactly as if the worlds had been completed in sequence.
    const nexusWi = (typeof globalThis.NEXUS_WORLD_INDEX !== 'undefined') ? globalThis.NEXUS_WORLD_INDEX : 13;
    const eventsToReplay = Math.max(0,
        (globalThis.STATE.classWorldsCompleted || []).filter(w => w !== nexusWi).length - 1);
    globalThis.STATE._classChangeReplayRemaining = eventsToReplay;
    // The replayed upgrades must not push worlds into classWorldsCompleted
    // again - clear the pointer so markLastWorldCompleted() no-ops.
    globalThis.STATE._lastClassWorld = null;

    // Switching class is a fresh class unlock: grant (and seed) the new
    // class's Rank 1 charms, and drop the old class's charms from the slots.
    if (typeof ensureCharmState === 'function') ensureCharmState();
    save();

    const def = CLASS_DEFS[cid];
    Audio_Manager.playSFX('classSelected');
    globalThis.showToast(`🔄 ${_clsGetLocalizedName(def)} ${t('cls_selected_toast')}`);
    if (typeof globalThis.showToast === 'function') globalThis.showToast(`🧿 ${t('charm_class_granted_toast')}`, '#8fd3ff');
    updateQuestStats('classChosen', {});

    closeClassOverlay();
    buildClassHUD();
    serveClassChangeReplay();
    if (typeof updateClassChangeButtons === 'function') updateClassChangeButtons();
}

// Serves the next queued class-change replay event, if any. Called after
// the class-change confirmation and after every progression-advancing
// applier (applyClassUpgrade, confirmAscendencySelection,
// applyAscendencyUpgrade) so the replayed events chain back-to-back.
export function serveClassChangeReplay() {
    const left = globalThis.STATE._classChangeReplayRemaining || 0;
    if (left <= 0) return;
    globalThis.STATE._classChangeReplayRemaining = left - 1;
    globalThis.STATE._pendingClassEvent = true;
    save();
    setTimeout(() => { triggerClassEventIfPending(); }, AFTER_CLASS_EVENT_DELAY_MS);
}




//------------------------------------------------------------------------
//-------------------CLASS SELECTION SCREEN-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip content (passive + two actives) shown when hovering a class's weapon locker.
export function buildClassTooltipContent(def) {
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

//------------------------------------------------------------------------
//-------------------CHARM REWARD PREVIEW---------------------------------
//------------------------------------------------------------------------
// Every class-side unlock hands over a REAL charm item (js/skills/skill-charms.js):
// picking a class / ascendency grants that line's Rank 1 charms, and every
// ability upgrade grants that spell's charm at the new rank. These builders
// render that payout as chips on the selection and upgrade cards, so the
// reward is visible BEFORE the player commits to it.
//
// The class PASSIVE is deliberately absent from the ladder: it is an
// always-on ability rather than an equippable spell, so it has no charm.
// Its upgrade card says so instead of quietly showing nothing.
//------------------------------------------------------------------------

// True when a skill id is part of the charm ladder. The roster comes from the
// skill registry, which registers the class passives elsewhere.
export function _clsSkillHasCharm(skillId) {
    return (typeof getSkillDef === 'function') && !!getSkillDef(skillId);
}

// One charm chip: the same glyph + gold rank coin the charm inventory uses,
// so the player recognises the item they are being promised.
// `owned` marks a charm already in the inventory: on the class-change screen
// that is a duplicate (it becomes a Lemma), on a maxed upgrade card it is
// simply the charm the ability already has.
export function _clsCharmChipHTML(skillId, rank, owned) {
    const name = (typeof getSkillName === 'function') ? getSkillName(skillId) : skillId;
    return `<span class="cs-charm${owned ? ' cs-charm--owned' : ''}">`
        + `<span class="cs-charm-glyph">${CHARM_BASE_ICON}`
        + `<span class="cs-charm-rank-badge">${rank}</span></span>`
        + `<span class="cs-charm-name">${name}</span>`
        + (owned ? `<span class="cs-charm-owned-mark">✓</span>` : '')
        + `</span>`;
}

// Rank 1 charms a class / ascendency choice hands over.
export function buildCharmGrantPreviewHTML(prefix) {
    const ids = [`${prefix}_active1`, `${prefix}_active2`].filter(_clsSkillHasCharm);
    if (!ids.length) return '';
    let ownedCount = 0;
    const chips = ids.map((id) => {
        const owned = (typeof getCharmByKey === 'function' && typeof charmKeyFor === 'function')
            && !!getCharmByKey(charmKeyFor(id, 1));
        if (owned) ownedCount++;
        return _clsCharmChipHTML(id, 1, owned);
    });
    return `<div class="cs-charms">`
        + `<div class="cs-charms-head">${t('cls_charms_included')}</div>`
        + `<div class="cs-charms-list">${chips.join('')}</div>`
        // Only worth explaining when at least one chip is already in the bag
        // (switching back to a class the player has used before).
        + (ownedCount ? `<div class="cs-charms-note">${t('cls_charms_owned_note')}</div>` : '')
        + `</div>`;
}

// The charm rank a single ability upgrade hands over.
export function buildCharmRewardPreviewHTML(prefix, type, currentLv, maxLv) {
    if (!_clsSkillHasCharm(`${prefix}_${type}`)) {
        return `<div class="cs-charms cs-charms--none">`
            + `<div class="cs-charms-note">${t('cls_charm_none_note')}</div>`
            + `</div>`;
    }
    const atMax = currentLv >= maxLv;
    const rank = atMax ? currentLv : Math.min(currentLv + 1, maxLv);
    const skillId = `${prefix}_${type}`;
    const owned = (typeof getCharmByKey === 'function' && typeof charmKeyFor === 'function')
        && !!getCharmByKey(charmKeyFor(skillId, rank));
    return `<div class="cs-charms">`
        + `<div class="cs-charms-head">${t(atMax ? 'cls_charm_max_title' : 'cls_charm_reward_title')}</div>`
        + `<div class="cs-charms-list">${_clsCharmChipHTML(skillId, rank, owned)}</div>`
        + `</div>`;
}

// Builds a full class card - used both in the initial selection screen (mode = 'select')
// and in any display-only context (mode = 'view').
// Layout: icon -> name -> desc -> weapon locker (hover = tooltip) -> charm
// reward -> select button.
export function buildClassCard(cid, mode) {
    const def = CLASS_DEFS[cid];

    let cta = '';
    if (mode === 'select') {
        cta = `<div class="cs-card-cta" onclick="confirmClassSelection('${cid}')">${t('cls_btn_select')}</div>`;
    } else if (mode === 'change') {
        // Class-change screen: the current class gets a badge instead of a CTA;
        // every other class spends a token via confirmClassChange().
        cta = (cid === globalThis.STATE.playerClass)
            ? `<div class="cc-current-tag">${t('cls_change_current_tag')}</div>`
            : `<div class="cs-card-cta" onclick="confirmClassChange('${cid}')">${t('cls_change_btn').replace('{n}', getClassChangeTokens())}</div>`;
    }

    const name = _clsGetLocalizedName(def);
    const desc = _clsGetLocalizedDesc(def);
    // The Rank 1 charms that come with the class, sat right above the button
    // that commits to it. Display-only cards get no promise they can't keep.
    const charmPreview = (mode === 'view') ? '' : buildCharmGrantPreviewHTML(cid);

    return `
        <div class="cs-card${mode === 'change' && cid === globalThis.STATE.playerClass ? ' cc-current' : ''}"
             style="border-color:${def.color};--cls-color:${def.color};--cls-light:${def.colorLight};"
             data-classid="${cid}">
            <div class="cs-card-icon">${def.icon}</div>
            <div class="cs-card-name" style="color:${def.colorLight};">${name}</div>
            <div class="cs-card-desc">${desc}</div>
            <div class="cs-weapon-locker"
                 onmouseenter="showClassTooltip('${cid}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()"></div>
            ${charmPreview}
            ${cta}
        </div>`;
}

// Shows the custom tooltip for a class's weapon locker, fills it with that
// class's ability info, colours it to match the class, and positions it
// near the cursor. Called on mouseenter of .cs-weapon-locker.
export function showClassTooltip(cid, event) {
    const def = CLASS_DEFS[cid];
    if (!def) return;

    showCsTooltip(buildClassTooltipContent(def), def.color, event);
}

// Shows the initial class selection overlay, letting the player pick their base class.
// Triggered on first world completion when no class has been chosen yet.
export function showClassSelection() {
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
export function confirmClassSelection(cid) {
    if (!CLASS_DEFS[cid]) return;

    globalThis.STATE.playerClass = cid;
    globalThis.STATE.classPassiveLevel = 1;
    globalThis.STATE.classActive1Level = 1;
    globalThis.STATE.classActive2Level = 1;
    globalThis.STATE.classActiveLevel = 1;
    globalThis.STATE.classActiveChoice = 'active1';

    if (!globalThis.STATE.classWorldsCompleted) globalThis.STATE.classWorldsCompleted = [];
    globalThis.STATE.classWorldsCompleted.push(globalThis.STATE._lastClassWorld);
    // Unlocking the class also hands over its Rank 1 charms (the passive
    // class ability itself comes from STATE.playerClass). ensureCharmState()
    // grants them into the charm inventory and seeds the free spell slots.
    if (typeof ensureCharmState === 'function') ensureCharmState();
    save();

    const def = CLASS_DEFS[cid];
    const className = _clsGetLocalizedName(def);
    const selectedLabel = t('cls_selected_toast');

    Audio_Manager.playSFX('classSelected');
    globalThis.showToast(`${def.icon} ${className} ${selectedLabel}`);
    // A fresh class starts with an empty/patchy hotbar, so point the player at
    // the spell book where they pick and drag their new skills onto the bar.
    if (typeof globalThis.showToast === 'function') globalThis.showToast(t('spellbook_after_class_hint'), '#ffd27f');
    if (typeof globalThis.showToast === 'function') globalThis.showToast(`🧿 ${t('charm_class_granted_toast')}`, '#8fd3ff');
    updateQuestStats('classChosen', {});

    closeClassOverlay();
    buildClassHUD();
}




//------------------------------------------------------------------------
//-------------------CLASS UPGRADE SCREEN---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised tag label shown on an upgrade card header row.
export function getUpgradeTagLabel(type, classId) {
    const icon = (CLASS_SPELL_ICONS[classId] && CLASS_SPELL_ICONS[classId][type]) || (type === 'passive' ? '⚡' : '🎯');
    if (type === 'passive') return t('cls_tag_passive').replace('{i}', icon);
    if (type === 'active1') return t('cls_tag_active1').replace('{i}', icon);
    return t('cls_tag_active2').replace('{i}', icon);
}

// Returns the localised CTA button label for the given ability, using its actual
// spell name (e.g. "▶ UPGRADE MOMENTUM") instead of a generic slot label.
export function getUpgradeCTALabel(type, abilityName) {
    return t('cls_upgrade_cta').replace('{n}', abilityName);
}

// Builds one spell card for a base-class ability (passive / active1 / active2), styled to match
// the class-selection cards: icon -> name -> level badge -> spell locker (hover = tooltip) -> CTA.
// The spell locker currently shows a generic glyph placeholder - see class_spell_upgrade.css
// for how to swap in real per-class/per-ability artwork later.
export function buildClassUpgradeCard(def, type, currentLv, maxLv) {
    const atMax = currentLv >= maxLv;
    const abilityDef = getAbilityDef(def, type);
    const tagLabel = getUpgradeTagLabel(type, globalThis.STATE.playerClass);
    const nextLv = Math.min(currentLv + 1, maxLv);

    const abilityName = _clsGetLocalizedName(abilityDef);
    const levelLabel = t('cls_level_label');
    const tagClass = type === 'passive' ? 'passive' : 'active';
    const lockerIcon = (CLASS_SPELL_ICONS[globalThis.STATE.playerClass] && CLASS_SPELL_ICONS[globalThis.STATE.playerClass][type]) || (type === 'passive' ? '⚡' : '🎯');

    const cta = atMax
        ? buildMaxedBadge()
        : `<div class="cs-card-cta" onclick="applyClassUpgrade('${type}')">${getUpgradeCTALabel(type, abilityName)}</div>`;
    // The charm this upgrade hands over (Rank N+1), named before the button
    // that spends the upgrade. The passive has no charm and says so.
    const charmPreview = buildCharmRewardPreviewHTML(globalThis.STATE.playerClass, type, currentLv, maxLv);

    return `
        <div class="cs-card cs-spell-card ${atMax ? 'maxed' : ''}"
             style="border-color:${def.color};--cls-color:${def.color};--cls-light:${def.colorLight};"
             data-classid="${globalThis.STATE.playerClass}" data-type="${type}">
            <div class="cs-card-icon">${lockerIcon}</div>
            <div class="cs-card-name" style="color:${def.colorLight};">${abilityName}</div>
            <div class="cs-spell-level-badge ${tagClass}">${tagLabel} · ${levelLabel} ${currentLv} → ${nextLv}</div>
            <div class="cs-spell-locker cs-spell-locker--${tagClass}"
                 onmouseenter="showUpgradeTooltip('${type}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()">
            </div>
            ${charmPreview}
            ${cta}
        </div>`;
}

// Shows the tooltip for a base-class spell locker: current level's description compared
// against the next level's description (or a "maxed" tag if already at cap).
// Called on mouseenter of .cs-spell-locker inside the class-upgrade screen.
export function showUpgradeTooltip(type, event) {
    const def = CLASS_DEFS[globalThis.STATE.playerClass];
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
export function showClassUpgrade() {
    if (!globalThis.STATE.playerClass) return;

    if (globalThis.STATE.classUpgradesAvailable === undefined) globalThis.STATE.classUpgradesAvailable = 0;
    globalThis.STATE.classUpgradesAvailable++;
    save();

    const def = CLASS_DEFS[globalThis.STATE.playerClass];
    const levels = {
        passive: globalThis.STATE.classPassiveLevel || 1,
        active1: globalThis.STATE.classActive1Level || 1,
        active2: globalThis.STATE.classActive2Level || 1,
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
    `, 'upgrade', globalThis.STATE.playerClass);
}




//------------------------------------------------------------------------
//-------------------APPLY CLASS UPGRADE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Decrements the available-upgrade counter, floored at 0.
export function decrementUpgradesAvailable() {
    globalThis.STATE.classUpgradesAvailable = Math.max(0, (globalThis.STATE.classUpgradesAvailable || 1) - 1);
}

// Appends the last completed world index to the classWorldsCompleted list.
// Guards against null and duplicates (class-change replay sets _lastClassWorld
// to null so replayed upgrades don't pollute the completion list).
export function markLastWorldCompleted() {
    if (!globalThis.STATE.classWorldsCompleted) globalThis.STATE.classWorldsCompleted = [];
    const wi = globalThis.STATE._lastClassWorld;
    if (wi === null || wi === undefined) return;
    if (globalThis.STATE.classWorldsCompleted.includes(wi)) return;
    globalThis.STATE.classWorldsCompleted.push(wi);
}

// Shows a toast confirming which ability was upgraded and to what level.
export function showClassUpgradeToast(type) {
    const def = CLASS_DEFS[globalThis.STATE.playerClass];
    const abilityName = getClassAbilityName(def, type);
    const newLv = getClassSkillLevel(type);
    globalThis.showToast(`${def.icon} ${abilityName} → ${t('cls_level_word')} ${newLv}!`);
}

// Applies a base-class skill upgrade: increments the level, saves state, updates UI.
// The next rank's charm is granted by the charm system's progression sync
// (skill-charms.js) the moment the new level lands in STATE - ownership is
// snapshotted first so we only announce a charm the upgrade actually added.
export function applyClassUpgrade(type) {
    const charmSkillId = `${globalThis.STATE.playerClass}_${type}`;
    const charmRank = Math.min((getClassSkillLevel(type) || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    const hadCharm = typeof getCharmByKey === 'function'
        && !!getCharmByKey(charmKeyFor(charmSkillId, charmRank));

    incrementClassSkillLevel(type);
    decrementUpgradesAvailable();
    markLastWorldCompleted();
    if (typeof ensureCharmState === 'function') ensureCharmState();
    // If the spell was equipped, its slot follows the new rank so the upgrade
    // screen and what the spell actually casts agree.
    const promoted = (typeof promoteCharmSlotToRank === 'function')
        && promoteCharmSlotToRank(charmSkillId, charmRank);
    save();

    Audio_Manager.playSFX('classUpgraded');
    trackAchStat('classUpgradesApplied');
    updateQuestStats('classUpgradeApplied', {});
    closeClassOverlay();
    showClassUpgradeToast(type);
    _showCharmGrantToast(charmSkillId, charmRank, hadCharm, promoted);
    buildClassHUD();
    serveClassChangeReplay();
}

// Announces a charm that class progression just handed over, or a spell slot
// that an upgrade promoted to the new rank. No-ops when the player already
// owned the charm AND no slot changed (e.g. it dropped from a monster and was
// already the rank sitting in the slot).
export function _showCharmGrantToast(skillId, rank, hadCharm, promoted) {
    if (hadCharm && !promoted) return;
    if (typeof globalThis.showToast !== 'function') return;
    const name = (typeof getSkillName === 'function') ? getSkillName(skillId) : skillId;
    const key = promoted ? 'charm_rank_equipped_toast' : 'charm_rank_granted_toast';
    globalThis.showToast(`🧿 ${t(key).replace('{n}', name).replace('{r}', rank)}`, '#8fd3ff');
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
export function buildAscendencyTooltipContent(asc) {
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

// Builds a full ascendency card - used in selection (mode = 'select') or display (mode = 'view') contexts.
// Layout matches buildClassCard(): icon -> name -> archetype tag -> desc -> locker (hover) -> CTA.
export function buildAscendencyCard(aid, mode) {
    const asc = ASCENDENCY_DEFS[aid];
    if (!asc) return '';

    const cta = mode === 'select'
        ? `<div class="cs-card-cta" onclick="confirmAscendencySelection('${aid}')">${t('cls_btn_ascend')}</div>`
        : '';

    const name = _clsGetLocalizedName(asc);
    const desc = _clsGetLocalizedDesc(asc);
    // Choosing an ascendency is a second class unlock, so it hands over its
    // two Rank 1 charms the same way - shown here so the pick is informed.
    const charmPreview = (mode === 'view') ? '' : buildCharmGrantPreviewHTML(aid);

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
            ${charmPreview}
            ${cta}
        </div>`;
}

// Shows the custom tooltip for an ascendency's locker, filled with both of its
// skills, coloured to match, and positioned near the cursor.
// Called on mouseenter of .cs-ascendency-locker.
export function showAscendencyTooltip(aid, event) {
    const asc = ASCENDENCY_DEFS[aid];
    if (!asc) return;

    showCsTooltip(buildAscendencyTooltipContent(asc), asc.color, event);
}

// Shows the ascendency selection overlay.
// Triggered when the base class is fully maxed and no ascendency has been chosen yet.
// Only the ascendencies reachable from STATE.playerClass are rendered (2 out of the 6 total).
export function showAscendencySelection() {
    const baseDef = CLASS_DEFS[globalThis.STATE.playerClass];
    const options = ASCENDENCY_LIST[globalThis.STATE.playerClass] || [];

    const baseName = _clsGetLocalizedName(baseDef);
    const title = t('cls_choose_ascendency_title');
    const subtitle = t('cls_ascendency_select_sub').replace('{n}', baseName);

    const header = buildOverlayHeader(`✨ ${title}`, subtitle);
    const cards = options.map(aid => buildAscendencyCard(aid, 'select')).join('');

    openClassOverlay(`
        ${header}
        <div class="cs-cards cs-ascendency-cards">${cards}</div>
        <div id="cs-tooltip" class="cs-tooltip"></div>
    `, 'ascend-select', globalThis.STATE.playerClass);

    Audio_Manager.playSFX('classSelection');
}

// Saves the chosen ascendency, initialises both skill levels to 1, and closes the overlay.
export function confirmAscendencySelection(aid) {
    if (!ASCENDENCY_DEFS[aid]) return;

    globalThis.STATE.playerAscendency = aid;
    globalThis.STATE.ascendencySkill1Level = 1;
    globalThis.STATE.ascendencySkill2Level = 1;

    if (!globalThis.STATE.classWorldsCompleted) globalThis.STATE.classWorldsCompleted = [];
    globalThis.STATE.classWorldsCompleted.push(globalThis.STATE._lastClassWorld);
    // Choosing an ascendency is a second class unlock: its Rank 1 charms are
    // granted too, so both skills are castable straight away.
    if (typeof ensureCharmState === 'function') ensureCharmState();
    save();

    const asc = ASCENDENCY_DEFS[aid];
    const ascName = _clsGetLocalizedName(asc);
    const chosenLabel = t('cls_ascendency_chosen_toast');

    Audio_Manager.playSFX('classSelected');
    globalThis.showToast(`✨ ${ascName} ${chosenLabel}`);
    if (typeof globalThis.showToast === 'function') globalThis.showToast(`🧿 ${t('charm_class_granted_toast')}`, '#8fd3ff');
    updateQuestStats('ascendencyChosen', {});
    trackAchStat('ascendencyChosen');
    closeClassOverlay();
    buildClassHUD();
    serveClassChangeReplay();
}




//------------------------------------------------------------------------
//-------------------ASCENDENCY UPGRADE SCREEN----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised tag label for an ascendency skill slot.
export function getAscendencySkillTagLabel(type) {
    return type === 'active1'
        ? t('cls_tag_skill1').replace('{i}', '🎯')
        : t('cls_tag_skill2').replace('{i}', '🎯');
}

// Returns the localised CTA label for an ascendency skill upgrade, using its actual
// skill name instead of a generic slot label.
export function getAscendencyUpgradeCTALabel(type, skillName) {
    return t('cls_upgrade_cta').replace('{n}', skillName);
}

// Builds one spell card for an ascendency skill slot (active1 or active2), styled to match
// the class-selection cards: icon -> name -> level badge -> spell locker (hover = tooltip) -> CTA.
export function buildAscendencyUpgradeCard(asc, type, currentLv, maxLv) {
    const atMax = currentLv >= maxLv;
    const skillDef = asc[type];
    const nextLv = Math.min(currentLv + 1, maxLv);
    const tagLabel = getAscendencySkillTagLabel(type);
    const skillName = _clsGetLocalizedName(skillDef);
    const levelLabel = t('cls_level_label');
    const lockerIcon = (ASCENDENCY_SPELL_ICONS[globalThis.STATE.playerAscendency] && ASCENDENCY_SPELL_ICONS[globalThis.STATE.playerAscendency][type]) || '🎯';

    const cta = atMax
        ? buildMaxedBadge()
        : `<div class="cs-card-cta" onclick="applyAscendencyUpgrade('${type}')">${getAscendencyUpgradeCTALabel(type, skillName)}</div>`;
    const charmPreview = buildCharmRewardPreviewHTML(globalThis.STATE.playerAscendency, type, currentLv, maxLv);

    return `
        <div class="cs-card cs-spell-card ${atMax ? 'maxed' : ''}"
             style="border-color:${asc.color};--cls-color:${asc.color};--cls-light:${asc.colorLight};"
             data-classid="${globalThis.STATE.playerAscendency}" data-type="${type}">
            <div class="cs-card-icon">${lockerIcon}</div>
            <div class="cs-card-name" style="color:${asc.colorLight};">${skillName}</div>
            <div class="cs-spell-level-badge active">${tagLabel} · ${levelLabel} ${currentLv} → ${nextLv}</div>
            <div class="cs-spell-locker cs-spell-locker--active"
                 onmouseenter="showAscendencyUpgradeTooltip('${type}', event)"
                 onmousemove="positionClassTooltip(event)"
                 onmouseleave="hideClassTooltip()">
            </div>
            ${charmPreview}
            ${cta}
        </div>`;
}

// Shows the tooltip for an ascendency spell locker: current level's description compared
// against the next level's description (or a "maxed" tag if already at cap).
// Called on mouseenter of .cs-spell-locker inside the ascendency-upgrade screen.
export function showAscendencyUpgradeTooltip(type, event) {
    const asc = ASCENDENCY_DEFS[globalThis.STATE.playerAscendency];
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
export function showAscendencyUpgrade() {
    if (!globalThis.STATE.playerAscendency) return;

    const asc = ASCENDENCY_DEFS[globalThis.STATE.playerAscendency];
    const levels = {
        active1: globalThis.STATE.ascendencySkill1Level || 1,
        active2: globalThis.STATE.ascendencySkill2Level || 1,
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
    `, 'ascend-upgrade', globalThis.STATE.playerAscendency);
}




//------------------------------------------------------------------------
//-------------------APPLY ASCENDENCY UPGRADE-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies an ascendency skill upgrade: increments the level, saves state, updates UI.
// Like the base-class upgrade, the new rank's charm is granted by the charm
// progression sync and announced only when it is genuinely new.
export function applyAscendencyUpgrade(type) {
    const charmSkillId = `${globalThis.STATE.playerAscendency}_${type}`;
    const charmRank = Math.min((getAscendencySkillLevel(type) || 1) + 1, CLASS_SKILL_MAX_LEVEL);
    const hadCharm = typeof getCharmByKey === 'function'
        && !!getCharmByKey(charmKeyFor(charmSkillId, charmRank));

    incrementAscendencySkillLevel(type);
    markLastWorldCompleted();
    if (typeof ensureCharmState === 'function') ensureCharmState();
    // Same promotion as the base-class path - see applyClassUpgrade().
    const promoted = (typeof promoteCharmSlotToRank === 'function')
        && promoteCharmSlotToRank(charmSkillId, charmRank);
    save();

    const asc = ASCENDENCY_DEFS[globalThis.STATE.playerAscendency];
    const skillDef = asc[type];
    const newLv = getAscendencySkillLevel(type);

    Audio_Manager.playSFX('classUpgraded');
    globalThis.showToast(`✨ ${_clsGetLocalizedName(skillDef)} → ${t('cls_level_word')} ${newLv}!`);
    _showCharmGrantToast(charmSkillId, charmRank, hadCharm, promoted);
    updateQuestStats('ascendencyUpgradeApplied', {});
    trackAchStat('ascendencyUpgradesApplied');
    closeClassOverlay();
    buildClassHUD();
    serveClassChangeReplay();
}




//------------------------------------------------------------------------
//-------------------CLASS EVENT ROUTER-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Top-level orchestrator - placed last since it dispatches to every screen
// entry point defined above (showClassSelection, showClassUpgrade,
// showAscendencySelection, showAscendencyUpgrade).

// Determines which class-event screen to show based on the current progression state.
// Priority order: initial selection → base class upgrades → ascendency selection → ascendency upgrades → nothing.
export function resolveNextClassEvent() {
    if (!globalThis.STATE.playerClass) return 'selectClass';
    if (!isBaseClassMaxed()) return 'upgradeClass';
    if (!hasAscendency()) return 'selectAscendency';
    if (!isAscendencyMaxed()) return 'upgradeAscendency';
    return 'allDone';
}

// Fires the appropriate class-event screen if a pending event exists.
// afterCallback (optional) is invoked once the whole flow is complete and the overlay is closed.
// Returns true if an event was triggered, false otherwise.
export function triggerClassEventIfPending(afterCallback) {
    if (!globalThis.STATE._pendingClassEvent) return false;

    globalThis.STATE._pendingClassEvent = false;
    save();

    _afterClassEventCallback = afterCallback || null;

    const next = resolveNextClassEvent();
    if (next === 'selectClass') showClassSelection();
    else if (next === 'upgradeClass') showClassUpgrade();
    else if (next === 'selectAscendency') showAscendencySelection();
    else if (next === 'upgradeAscendency') showAscendencyUpgrade();
    else {
        // Nothing left to upgrade - fire the callback immediately.
        if (_afterClassEventCallback) {
            const cb = _afterClassEventCallback;
            _afterClassEventCallback = null;
            setTimeout(cb, AFTER_CLASS_EVENT_DELAY_MS);
        }
    }

    return true;
}