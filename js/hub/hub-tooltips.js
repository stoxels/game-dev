import { LANG, t } from '../translation/translations.js';
import { GAME_ART } from '../combat/combat-art.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { SLOT_ACCEPTS, _dndFindTargetSlot } from './hub-drag-and-drop.js';
import { _equipped } from './hub.js';
import { _buildMergedModLines, _getAllEquippedItems, _getItemEffectiveAttackInterval, _getItemEffectiveBlockChance, _getItemEffectiveDamage, _getItemEffectiveDefenses } from '../combat/combat-player-stats.js';
import { PLAYER_BASE_ATTRIBUTES, _checkHandCompatibilityInSlot, _getSwapChainBreak, _getUnmetRequirementsText, _getWeaponHands, _handErrorMessage, _previewEquipAttributes } from '../loot/loot-requirements.js';
import { _getUniqueSpecialLines, _inferWeaponHands } from '../loot/unique-items.js';

//------------------------------------------------------------------------
//-------------------HUB TOOLTIPS-----------------------------------------
//------------------------------------------------------------------------
// The item stat-block tooltip body, cursor tracking, and the compare
// tooltip (shown while Alt is held or Auto-compare is on). The floating
// tooltip itself is _showHubTooltip in loot-currency-tooltip.js, which calls
// back into _buildTooltipBodyHTML and _updateCompareTooltip here.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

const RARITY_COLOR_MAP = {
    common: { border: '#7a7a7a', color: '#b0b0b0' },
    uncommon: { border: '#2ecc71', color: '#2ecc71' },
    rare: { border: '#3498db', color: '#3498db' },
    epic: { border: '#9b59b6', color: '#c39bd3' },
    legendary: { border: '#f39c12', color: '#f5b642' },
    cursed: { border: '#e74c3c', color: '#e74c3c' },
    artifact: { border: '#f1c40f', color: '#f1c40f' },
};

const TT_RARITY_KEYS = {
    common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
    epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
    artifact: 'eg_rar_artifact',
};

const TT_SLOT_KEYS = {
    head: 'eg_slot_head', shoulders: 'eg_slot_shoulders', cloak: 'eg_slot_cloak',
    chest: 'eg_slot_chest', bracers: 'eg_slot_bracers', gloves: 'eg_slot_gloves',
    belt: 'eg_slot_belt', pants: 'eg_slot_pants', boots: 'eg_slot_boots',
    amulet: 'eg_slot_amulet', earring: 'eg_slot_earring', ring: 'eg_slot_ring',
    arcane: 'eg_slot_arcane', talisman: 'eg_slot_talisman', weapon: 'eg_slot_weapon',
    shield: 'eg_slot_shield',
    ranged: 'eg_slot_ranged',
};

// True while the Alt key is held down.
let _altDown = false;

// Last known cursor position - fallback anchor when no event is available.
export let _lastMouse = { x: 0, y: 0 };


//------------------------------------------------------------------------
//-------------------TOOLTIP BODY: SECTION BUILDERS-----------------------
//------------------------------------------------------------------------

// "One-Handed" / "Heavy" line under the rarity line, so the 1H/2H choice
// (and with it the shield / dual-wield decision) is visible before equipping.
function _tooltipHandLineHTML(item) {
    if (item.slotType !== 'weapon') return '';
    let hands = (item.hands === 1 || item.hands === 2) ? item.hands : null;
    if (hands == null) {
        try { hands = _getWeaponHands(item); } catch (e) { hands = null; }
    }
    if (hands == null) {
        try { hands = _inferWeaponHands(item); } catch (e) { hands = null; }
    }
    if (hands !== 1 && hands !== 2) return '';
    let handLabel = null;
    try {
        const key = hands === 2 ? 'eg_hands_two' : 'eg_hands_one';
        const s = t(key);
        if (s && s !== key) handLabel = s;
    } catch (e) {}
    if (!handLabel) {
        const de = LANG === 'de';
        handLabel = hands === 2
            ? (de ? 'Schwerwaffe' : 'Heavy Weapon')
            : (de ? 'Einhandwaffe' : 'One-Handed Weapon');
    }
    return `<div class="sx-tt-hands">${handLabel}</div>`;
}

// Base defence / damage / attack interval / block lines. Values are the
// local-modified totals (base + local flat, scaled by the item's own
// "% increased" mods); modified values get the .sx-tt-val-modified highlight.
function _tooltipBaseStatsHTML(item) {
    const implicitLines = [];
    const def = item.defenses || {};
    let eff = null;
    try { eff = _getItemEffectiveDefenses(item); } catch (e) { eff = null; }
    const defVal = (stat) => {
        if (eff) return { v: eff[stat], m: eff.modded && eff.modded[stat] };
        return { v: def[stat] || 0, m: false };
    };
    const defLine = (labelKey, stat) => {
        const { v, m } = defVal(stat);
        if ((v || 0) <= 0) return;
        const valCls = m ? 'sx-tt-val sx-tt-val-modified' : 'sx-tt-val';
        implicitLines.push(`<div class="sx-tt-implicit">${t(labelKey)}: <span class="${valCls}">${v}</span></div>`);
    };
    defLine('eg_tt_armour', 'armour');
    defLine('eg_tt_evasion', 'evasion');
    defLine('eg_tt_absorption', 'absorption');
    if (item.damage) {
        let dmgEff = null;
        try { dmgEff = _getItemEffectiveDamage(item); } catch (e) { dmgEff = null; }
        const rangeLine = (labelKey, min, max, moddedFlag) => {
            if ((max || 0) <= 0 && (min || 0) <= 0) return;
            const valCls = moddedFlag ? 'sx-tt-val sx-tt-val-modified' : 'sx-tt-val';
            implicitLines.push(`<div class="sx-tt-implicit">${t(labelKey)}: <span class="${valCls}">${min}–${max}</span></div>`);
        };
        if (dmgEff) {
            rangeLine('eg_stat_phys_damage', dmgEff.physMin, dmgEff.physMax, dmgEff.modded.phys);
            rangeLine('eg_stat_fire_damage', dmgEff.fireMin, dmgEff.fireMax, dmgEff.modded.fire);
            rangeLine('eg_stat_cold_damage', dmgEff.coldMin, dmgEff.coldMax, dmgEff.modded.cold);
            rangeLine('eg_stat_lightning_damage', dmgEff.lightningMin, dmgEff.lightningMax, dmgEff.modded.lightning);
            rangeLine('eg_stat_shadow_damage', dmgEff.shadowMin, dmgEff.shadowMax, dmgEff.modded.shadow);
        } else {
            rangeLine('eg_stat_phys_damage', item.damage.min, item.damage.max, false);
        }
        if (item.casterKind && item.school) {
            implicitLines.push(`<div class="sx-tt-implicit">${t(item.casterKind === 'staff' ? 'eg_tt_shot_staff' : 'eg_tt_shot_wand').replace('{school}', t('eg_school_' + item.school))}</div>`);
        }
        // Only the melee weapon slot has a charge interval (time to 100% for
        // manual E strikes); ranged weapons scale the projectile channel instead.
        if (item.slotType === 'weapon') {
            let atkEff = null;
            try { atkEff = _getItemEffectiveAttackInterval(item); } catch (e) { atkEff = null; }
            const interval = (atkEff && atkEff.interval != null) ? atkEff.interval : item.attackIntervalSeconds;
            const valCls = (atkEff && atkEff.modded) ? 'sx-tt-val sx-tt-val-modified' : 'sx-tt-val';
            implicitLines.push(`<div class="sx-tt-implicit">${t('eg_tt_attack_interval')}: <span class="${valCls}">${interval}s</span></div>`);
        }
        // Innate bleed: melee weapons that deal physical damage always carry a
        // built-in bleed chance (PHYS_INNATE_BLEED_CHANCE_PCT in
        // combat-ailments-core.js - keep the translated number in sync).
        // Bows (slot 'ranged') are not a bleed weapon and must not advertise it.
        const physMax = dmgEff ? (dmgEff.physMax || 0) : (item.damage.max || 0);
        if (physMax > 0 && item.slotType === 'weapon') {
            implicitLines.push(`<div class="sx-tt-implicit">${t('eg_tt_innate_bleed')}</div>`);
        }
    }
    if (item.blockChance) {
        let blockEff = null;
        try { blockEff = _getItemEffectiveBlockChance(item); } catch (e) { blockEff = null; }
        const bcVal = blockEff ? blockEff.value : item.blockChance;
        const bcModded = blockEff ? blockEff.modded : false;
        const valCls = bcModded ? 'sx-tt-val sx-tt-val-modified' : 'sx-tt-val';
        implicitLines.push(`<div class="sx-tt-implicit">${t('eg_tt_block_chance')}: <span class="${valCls}">${bcVal}%</span></div>`);
    }
    // Bows have no fire button - tell the player how the bow actually shoots.
    if (item.slotType === 'ranged') {
        implicitLines.push(`<div class="sx-tt-implicit" style="font-style:italic;opacity:0.85;">${t('eg_tt_bow_hint')}</div>`);
    }
    return implicitLines.length
        ? `<div class="sx-tt-section">${implicitLines.join('')}</div>`
        : '';
}

// The base implicit modifiers (1-2 beneficial lines scaled by required
// level), in their own blue section above the explicit mods.
function _tooltipImplicitModsHTML(item) {
    const implicits = Array.isArray(item.implicits) ? item.implicits : [];
    if (implicits.length === 0) return '';
    const merged = _buildMergedModLines(implicits);
    // Implicits are always beneficial: the blue color is the indicator, no tag.
    const lines = merged.map(entry =>
        `<div class="sx-tt-mod sx-tt-mod-implicit"><span class="sx-tt-mod-label">${entry.label}</span></div>`);
    return lines.length
        ? `<div class="sx-tt-section sx-tt-implicits-section">${lines.join('')}</div>`
        : '';
}

// "Requires level / attributes" line. Each part is checked against the
// attribute totals as the equip gate will see them after the swap (displaced
// item removed, the item's own bonuses included), so the tooltip agrees with
// what _canEquipInSlot will accept. Unmet parts are red and listed as missing.
function _tooltipRequirementsHTML(item) {
    const req = item.requirements || {};
    const curAttrs = _previewEquipAttributes(item);
    const reqParts = [];
    const missingParts = [];
    if ((req.level || 0) > 0) {
        const met = PLAYER_BASE_ATTRIBUTES.level == null
            || PLAYER_BASE_ATTRIBUTES.level >= req.level;
        const label = t('eg_req_level').replace('{n}', req.level);
        reqParts.push(met ? label : `<span class="sx-tt-req-unmet">${label}</span>`);
        if (!met) missingParts.push(label);
    }
    [['str', 'eg_attr_str', 'str'], ['agi', 'eg_attr_agi', 'agi'], ['int', 'eg_attr_int', 'int']]
        .forEach(([reqKey, labelKey, attrKey]) => {
            if ((req[reqKey] || 0) <= 0) return;
            const have = curAttrs[attrKey];
            const label = `${req[reqKey]} ${t(labelKey)}`;
            reqParts.push(have >= req[reqKey]
                ? label
                : `<span class="sx-tt-req-unmet">${label}</span>`);
            if (have < req[reqKey]) missingParts.push(`${req[reqKey] - have} ${t(labelKey)}`);
        });
    const missingHTML = missingParts.length
        ? `<div class="sx-tt-req-missing">${t('eg_req_missing')} ${missingParts.join(', ')}</div>`
        : '';
    return reqParts.length
        ? `<div class="sx-tt-section"><div class="sx-tt-req">${t('eg_requires')} ${reqParts.join(', ')}${missingHTML}</div></div>`
        : '';
}

// Warning shown when the item's own requirements are met but equipping it
// would displace an item whose attribute bonuses other equipped gear relies
// on (e.g. a +13 Int ring keeping a 45 Int chest satisfied).
function _tooltipChainBreakHTML(item) {
    const chain = _getSwapChainBreak(item);
    return chain
        ? `<div class="sx-tt-section"><div class="sx-tt-swap-warning">${t('eg_swap_breaks_warning')
            .replace('{equipped}', chain.occupant.name || '?')
            .replace('{list}', _getUnmetRequirementsText(chain.broken))}</div></div>`
        : '';
}

// Warning shown when the item fits its slot but the hand setup forbids it
// (a two-hander needs a free off-hand; the off-hand takes 1H or shield only).
function _tooltipHandConflictHTML(item) {
    try {
        if (item && item.category === 'equip'
            && (item.slotType === 'weapon' || item.slotType === 'shield')) {
            if (!_getAllEquippedItems().includes(item)) {
                const target = _dndFindTargetSlot(item);
                if (target) {
                    const hg = _checkHandCompatibilityInSlot(item, target);
                    if (!hg.ok && hg.handError) {
                        return `<div class="sx-tt-section"><div class="sx-tt-swap-warning">${_handErrorMessage(hg.handError, item)}</div></div>`;
                    }
                }
            }
        }
    } catch (e) { return ''; }
    return '';
}

// The rolled explicit mods. Mods sharing one stat (flat Health plus the
// Health half of a hybrid roll) are merged into a single line.
function _tooltipExplicitModsHTML(item) {
    const mods = Array.isArray(item.mods) ? item.mods : [];
    if (mods.length === 0) return '';
    const mergedLines = _buildMergedModLines(mods);
    // Unique items use bespoke mods without tiers - hide the tier badges.
    const hideTier = !!item.isUnique;
    const lines = mergedLines.map(entry => {
        // Unique downsides render in warning red instead of mod blue.
        const cls = entry.downside ? 'sx-tt-mod sx-tt-mod-downside' : 'sx-tt-mod';
        const tierSpan = (!hideTier && entry.tierLabel) ? `<span class="sx-tt-mod-tier">${entry.tierLabel}</span>` : '';
        const craftedSpan = entry.crafted ? `<span class="sx-tt-mod-crafted">${t('eg_tt_crafted')}</span>` : '';
        return `<div class="${cls}"><span class="sx-tt-mod-label">${entry.label}</span>${tierSpan}${craftedSpan}</div>`;
    });
    return lines.length
        ? `<div class="sx-tt-section sx-tt-mods-section">${lines.join('')}</div>`
        : '';
}

// Unique non-stat perks (e.g. the zero-line auto-mark), in implicit blue
// between the stat mods and the flavor text so the tradeoff is visible
// before equipping.
function _tooltipUniquePerksHTML(item) {
    try {
        const specials = _getUniqueSpecialLines(item);
        if (!specials.length) return '';
        const lines = specials.map(s => {
            const label = LANG === 'de' ? (s.de || s.en) : (s.en || s.de);
            return `<div class="sx-tt-mod sx-tt-mod-implicit"><span class="sx-tt-mod-label">✨ ${label}</span></div>`;
        });
        return `<div class="sx-tt-section sx-tt-mods-section">${lines.join('')}</div>`;
    } catch (e) { return ''; }
}


//------------------------------------------------------------------------
//-------------------TOOLTIP BODY-----------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for the tooltip panel body from an item object.
export function _buildTooltipBodyHTML(item) {
    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const rarityLabel = item.isUnique
        ? t('rar_unique')
        : TT_RARITY_KEYS[rarity]
            ? t(TT_RARITY_KEYS[rarity])
            : rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const slotLabel = item.slotType
        ? (TT_SLOT_KEYS[item.slotType]
            ? t(TT_SLOT_KEYS[item.slotType])
            : item.slotType.charAt(0).toUpperCase() + item.slotType.slice(1))
        : '';

    const handHTML = _tooltipHandLineHTML(item);
    const implicitHTML = _tooltipBaseStatsHTML(item);
    const implicitsHTML = _tooltipImplicitModsHTML(item);
    const reqHTML = _tooltipRequirementsHTML(item);
    const chainHTML = _tooltipChainBreakHTML(item);
    const handHTML2 = _tooltipHandConflictHTML(item);
    const modsHTML = _tooltipExplicitModsHTML(item);
    const specialHTML = _tooltipUniquePerksHTML(item);

    const flavorHTML = item.isUnique
        ? `<div class="sx-tt-section"><div class="sx-tt-flavor">${LANG === 'de'
            ? (item.flavorDe || item.flavorEn || '')
            : (item.flavorEn || item.flavorDe || '')}</div></div>`
        : '';

    const ilvlHTML = item.itemLevel != null
        ? `<div class="sx-tt-ilvl">${t('eg_item_level').replace('{n}', item.itemLevel)}</div>`
        : '';

    const mirroredHTML = item.mirrored
        ? `<div class="sx-tt-mirrored">🪞 ${t('eg_tt_mirrored')}</div>`
        : '';

    const bonusLootHTML = item.isBonusLoot
        ? `<div class="sx-tt-mirrored" style="color:#f5d98a;">🎁 ${t('eg_bonus_chance_title')}</div>`
        : '';

    return `
<div class="sx-tt-frame" style="--tt-border:${rc.border};">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">${GAME_ART.html('item', GAME_ART.artIdForItem(item), item.icon || '📦')}</div>
        <div class="sx-tt-name" style="color:${rc.color};">${item.name || item.baseName || '???'}</div>
        ${(item.baseName && item.baseName !== item.name)
            ? `<div class="sx-tt-basename" style="opacity:.7;">${item.baseName}</div>` : ''}
        <div class="sx-tt-rarity-line" style="color:${rc.color};">${rarityLabel} ${slotLabel}</div>
        ${handHTML}
    </div>
    ${implicitHTML}
    ${implicitsHTML}
    ${reqHTML}
    ${chainHTML}
    ${handHTML2}
    ${modsHTML}
    ${specialHTML}
    ${flavorHTML}
    ${ilvlHTML}
    ${mirroredHTML}
    ${bonusLootHTML}
</div>`;
}


//------------------------------------------------------------------------
//-------------------MAIN TOOLTIP: CLEAR & MOVE--------------------------
//------------------------------------------------------------------------

// Hides the hover tooltip.
export function _clearTooltip() {
    _showHubTooltip(null);
}

// Moves the main tooltip (and the compare tooltip with it) while the
// cursor glides over the hovered item chip.
export function _moveTooltip(e) {
    globalThis.moveGameTooltip(e);
    _positionCompareTooltip();
}


//------------------------------------------------------------------------
//-------------------COMPARE TOOLTIP: LOOKUP------------------------------
//------------------------------------------------------------------------

// True while the hub or gate screen is the active screen. Scopes the
// Alt-key browser-menu suppression to the item screens.
function _isItemScreenActive() {
    const hub = document.getElementById('screen-hub');
    const gate = document.getElementById('screen-endgame-gate');
    return (hub && hub.classList.contains('active'))
        || (gate && gate.classList.contains('active'));
}

// "Auto-compare" checkbox in the character sheet's top bar (persisted).
// When on, hovering gear compares it without holding Alt.
function _autoCompareOn() {
    if (typeof globalThis._autoCompare === 'boolean') return globalThis._autoCompare;
    try { return localStorage.getItem('stoxels_auto_compare') === '1'; } catch (e) { return false; }
}

// Every equipped item the hovered piece could replace: both rings, both
// earrings, and for weapons / shields / two-handers the main hand AND the
// off-hand. Everything else maps to its single slot.
function _getCompareItems(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return [];
    const hands = (item.slotType === 'weapon' || item.slotType === 'shield');
    const ids = Object.keys(SLOT_ACCEPTS).filter(id =>
        SLOT_ACCEPTS[id] === item.slotType
        || (hands && (id === 'weapon1' || id === 'weapon2')));
    const out = [];
    for (const id of ids) {
        const eq = _equipped[id];
        if (eq && out.indexOf(eq) === -1) out.push(eq);
    }
    return out;
}


//------------------------------------------------------------------------
//-------------------COMPARE TOOLTIP: SHOW / HIDE / POSITION--------------
//------------------------------------------------------------------------

// Shows or hides the compare tooltip based on the current hover target.
// Shown while Alt is held or Auto-compare is checked, unless the hovered
// item is itself equipped.
export function _updateCompareTooltip() {
    const hovered = globalThis._tooltipItem;
    // Shop previews (id ends in _preview) compare only while Alt is held: the
    // auto-compare pop-up beside every card is just noise when browsing.
    const shopPreview = !!(hovered && /_preview$/.test(String(hovered.id || '')));
    const compareItems = (hovered && (_altDown || (_autoCompareOn() && !shopPreview)))
        ? _getCompareItems(hovered)
        : [];

    // Don't "compare" an equipped item with itself.
    if (compareItems.indexOf(hovered) !== -1) {
        _hideCompareTooltip();
        return;
    }

    if (compareItems.length) _showCompareTooltip(compareItems);
    else _hideCompareTooltip();
}

// Lazily creates the compare tooltip element (visual twin of the main
// game tooltip, with a yellow accent edge to tell them apart).
function _getCompareTip() {
    let tip = document.getElementById('sx-compare-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'sx-compare-tip';
        tip.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #12121e;
            border: 1px solid var(--accent, #5555aa);
            border-left: 3px solid var(--yellow, #c8a84b);
            color: var(--accent2, #ccc);
            font-family: var(--PX, monospace);
            font-size: 11px;
            line-height: 1.6;
            padding: 8px 12px;
            max-width: 380px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

// Fills the compare tooltip with one column per equipped item and shows it.
function _showCompareTooltip(itemOrItems) {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    const tip = _getCompareTip();
    // Columns start as wide as the regular tooltip (same 560px cap the shared
    // tooltip uses for equipment frames); _positionCompareTooltip then fits
    // them into the room beside it - side by side, or stacked when too tight.
    const main = document.getElementById('ghud-floating-tip');
    tip.dataset.naturalW = String(Math.min(560, (main && main.offsetWidth) || 360));
    tip.style.display = 'flex';
    tip.style.gap = '12px';
    tip.style.alignItems = 'flex-start';
    tip.style.width = 'auto';
    tip.style.maxWidth = '96vw';
    tip.innerHTML = items.map(it => `<div class="sx-compare-col" style="min-width:0;flex:0 0 auto">
<div class="sx-compare-label">${t('eg_tt_currently_equipped')}</div>
${_buildTooltipBodyHTML(it)}</div>`).join('');
    // Lift the frame's own narrow cap inside the compare box too.
    tip.querySelectorAll('.sx-tt-frame').forEach(f => { f.style.maxWidth = 'none'; f.style.margin = '0'; });
    tip.style.opacity = '1';
    _positionCompareTooltip();
}

// Fades the compare tooltip out.
export function _hideCompareTooltip() {
    const tip = document.getElementById('sx-compare-tip');
    if (tip) tip.style.opacity = '0';
}

// Places the compare tooltip beside the main tooltip, on whichever side has
// more room, and sizes its columns to fit that room: side by side when each
// column can stay readable (>= 250px), otherwise stacked. Several equipped
// items (main hand + off hand / shield, both rings) therefore never run under
// the main tooltip or off the screen.
function _positionCompareTooltip() {
    const main = document.getElementById('ghud-floating-tip');
    const cmp = document.getElementById('sx-compare-tip');
    if (!main || !cmp || cmp.style.opacity !== '1') return;

    const MARGIN = 8, CHROME = 28, GAP = 12, MIN_COL = 250;
    const cols = Array.from(cmp.querySelectorAll('.sx-compare-col'));
    const n = Math.max(1, cols.length);
    const natural = Number(cmp.dataset.naturalW) || 360;
    const mainRight = main.offsetLeft + main.offsetWidth;
    const roomRight = window.innerWidth - mainRight - MARGIN * 2;
    const roomLeft = main.offsetLeft - MARGIN * 2;
    const onRight = roomRight >= roomLeft;
    const room = Math.max(MIN_COL + CHROME, onRight ? roomRight : roomLeft);

    let colW = Math.floor((room - CHROME - GAP * (n - 1)) / n);
    let stacked = false;
    if (n > 1 && colW < MIN_COL) {
        stacked = true;
        colW = room - CHROME;
    }
    colW = Math.max(MIN_COL, Math.min(natural, colW));
    cmp.style.flexDirection = stacked ? 'column' : 'row';
    cols.forEach(c => { c.style.width = colW + 'px'; });

    let x = onRight ? mainRight + MARGIN : main.offsetLeft - cmp.offsetWidth - MARGIN;
    x = Math.max(MARGIN, Math.min(x, window.innerWidth - cmp.offsetWidth - MARGIN));
    cmp.style.left = x + 'px';
    // Keep the compare tooltip fully on screen vertically as well.
    const clampedTop = Math.max(MARGIN, Math.min(
        main.offsetTop,
        window.innerHeight - cmp.offsetHeight - MARGIN
    ));
    cmp.style.top = clampedTop + 'px';
}


//------------------------------------------------------------------------
//-------------------EVENT LISTENERS (REGISTERED AT LOAD)-----------------
//------------------------------------------------------------------------

document.addEventListener('mousemove', e => {
    _lastMouse.x = e.clientX;
    _lastMouse.y = e.clientY;
});

window.addEventListener('keydown', e => {
    if (e.key === 'Alt') {
        // Suppress the browser's default Alt behaviour (Firefox/Chrome
        // focus the menu bar, which shifts the layout mid-comparison).
        if (_isItemScreenActive()) e.preventDefault();
        if (!_altDown) {
            _altDown = true;
            _updateCompareTooltip();
        }
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'Alt') {
        // Firefox triggers the menu bar on Alt *release* - block that too.
        if (_isItemScreenActive()) e.preventDefault();
        _altDown = false;
        _updateCompareTooltip();
    }
});

// Alt state is unreliable after alt-tabbing away - reset on blur.
window.addEventListener('blur', () => {
    _altDown = false;
    _updateCompareTooltip();
});
