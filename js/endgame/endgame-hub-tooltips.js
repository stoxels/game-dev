//  endgame-hub-tooltips.js
//  HUB TOOLTIPS — extracted 2026-09-10 from endgame-hub.js
//  (stat-block tooltip builder, mouse tracking, Alt-compare tooltip
//  and their event listeners). Loads AFTER endgame-hub.js; the single
//  _egShowTooltip implementation in endgame-currency.js dispatches to
//  _egBuildTooltipBodyHTML / _egUpdateCompareTooltip at runtime.
//
//------------------------------------------------------------------------
//-------------------TOOLTIP----------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for the tooltip panel body from an item object.


function _egBuildTooltipBodyHTML(item) {
    const RARITY_COLOR_MAP = {
        common: { border: '#7a7a7a', color: '#b0b0b0' },
        uncommon: { border: '#2ecc71', color: '#2ecc71' },
        rare: { border: '#3498db', color: '#3498db' },
        epic: { border: '#9b59b6', color: '#c39bd3' },
        legendary: { border: '#f39c12', color: '#f5b642' },
        cursed: { border: '#e74c3c', color: '#e74c3c' },
        artifact: { border: '#f1c40f', color: '#f1c40f' },
    };

    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const EG_TT_RARITY_KEYS = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    const EG_TT_SLOT_KEYS = {
        head: 'eg_slot_head', shoulders: 'eg_slot_shoulders', cloak: 'eg_slot_cloak',
        chest: 'eg_slot_chest', bracers: 'eg_slot_bracers', gloves: 'eg_slot_gloves',
        belt: 'eg_slot_belt', pants: 'eg_slot_pants', boots: 'eg_slot_boots',
        amulet: 'eg_slot_amulet', earring: 'eg_slot_earring', ring: 'eg_slot_ring',
        arcane: 'eg_slot_arcane', talisman: 'eg_slot_talisman', weapon: 'eg_slot_weapon',
        shield: 'eg_slot_shield',
        ranged: 'eg_slot_ranged',
    };

    const rarityLabel = item.isUnique
        ? t('rar_unique')
        : EG_TT_RARITY_KEYS[rarity]
            ? t(EG_TT_RARITY_KEYS[rarity])
            : rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const slotLabel = item.slotType
        ? (EG_TT_SLOT_KEYS[item.slotType]
            ? t(EG_TT_SLOT_KEYS[item.slotType])
            : item.slotType.charAt(0).toUpperCase() + item.slotType.slice(1))
        : '';

    // ── Weapon hand line (PoE-style): One-Handed / Two-Handed ──────────
    // Shown directly under the rarity line so the 1H/2H choice — and with it
    // the shield / dual-wield decision — is visible before equipping.
    let handHTML = '';
    if (item.slotType === 'weapon') {
        let hands = (item.hands === 1 || item.hands === 2) ? item.hands : null;
        if (hands == null && typeof _egGetWeaponHands === 'function') {
            try { hands = _egGetWeaponHands(item); } catch (e) { hands = null; }
        }
        if (hands == null && typeof _egInferWeaponHands === 'function') {
            try { hands = _egInferWeaponHands(item); } catch (e) { hands = null; }
        }
        if (hands === 1 || hands === 2) {
            let handLabel = null;
            try {
                const key = hands === 2 ? 'eg_hands_two' : 'eg_hands_one';
                const s = t(key);
                if (s && s !== key) handLabel = s;
            } catch (e) {}
            if (!handLabel) {
                const de = (typeof LANG !== 'undefined' && LANG === 'de');
                handLabel = hands === 2
                    ? (de ? 'Zweihandwaffe' : 'Two-Handed Weapon')
                    : (de ? 'Einhandwaffe' : 'One-Handed Weapon');
            }
            handHTML = `<div class="eg-tt-hands">${handLabel}</div>`;
        }
    }

    // ── Implicit defenses & damage ───────────────────────────────────
    // Defense and damage values shown are the LOCAL-modified totals (base +
    // local flat, scaled by the item's own "% increased" mods — Path of
    // Exile style). Values altered by local mods get the
    // .eg-tt-val-modified highlight so the player can tell them apart from
    // the untouched base value.
    const implicitLines = [];
    const def = item.defenses || {};
    let eff = null;
    try { eff = _egGetItemEffectiveDefenses(item); } catch (e) { eff = null; }
    const defVal = (stat) => {
        if (eff) return { v: eff[stat], m: eff.modded && eff.modded[stat] };
        return { v: def[stat] || 0, m: false };
    };
    const defLine = (labelKey, stat) => {
        const { v, m } = defVal(stat);
        if ((v || 0) <= 0) return;
        const valCls = m ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
        implicitLines.push(`<div class="eg-tt-implicit">${t(labelKey)}: <span class="${valCls}">${v}</span></div>`);
    };
    defLine('eg_tt_armour', 'armour');
    defLine('eg_tt_evasion', 'evasion');
    defLine('eg_tt_absorption', 'absorption');
    if (item.damage) {
        let dmgEff = null;
        try { dmgEff = _egGetItemEffectiveDamage(item); } catch (e) { dmgEff = null; }
        const rangeLine = (labelKey, min, max, moddedFlag) => {
            if ((max || 0) <= 0 && (min || 0) <= 0) return;
            const valCls = moddedFlag ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
            implicitLines.push(`<div class="eg-tt-implicit">${t(labelKey)}: <span class="${valCls}">${min}–${max}</span></div>`);
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
        // Only the melee weapon slot has an auto-strike interval — ranged
        // weapons scale the input-driven projectile channel instead.
        if (item.slotType === 'weapon') {
            let atkEff = null;
            try { atkEff = _egGetItemEffectiveAttackInterval(item); } catch (e) { atkEff = null; }
            const interval = (atkEff && atkEff.interval != null) ? atkEff.interval : item.attackIntervalSeconds;
            const valCls = (atkEff && atkEff.modded) ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
            implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_attack_interval')}: <span class="${valCls}">${interval}s</span></div>`);
        }
    }
    if (item.blockChance) {
        let blockEff = null;
        try { blockEff = typeof _egGetItemEffectiveBlockChance === 'function' ? _egGetItemEffectiveBlockChance(item) : null; } catch (e) { blockEff = null; }
        const bcVal = blockEff ? blockEff.value : item.blockChance;
        const bcModded = blockEff ? blockEff.modded : false;
        const valCls = bcModded ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_block_chance')}: <span class="${valCls}">${bcVal}%</span></div>`);
    }
    const implicitHTML = implicitLines.length
        ? `<div class="eg-tt-section">${implicitLines.join('')}</div>`
        : '';

    // ── Implicit modifiers (PoE-style base implicits) ────────────────
    // Each equipment base has 1 (sometimes 2) beneficial implicits scaled
    // by required level. Rendered in its own blue section with an "Implicit"
    // tag and a separator line above explicit mods, matching PoE layout.
    let implicitsHTML = '';
    const implicits = Array.isArray(item.implicits) ? item.implicits : [];
    if (implicits.length > 0) {
        const merged = (typeof _egBuildMergedModLines === 'function')
            ? _egBuildMergedModLines(implicits)
            : implicits.flatMap(imp => (imp.rolledStats||[]).map(s => ({ label: s.label, downside:false, tierLabel:'Implicit' })));
        const lines = merged.map(entry => {
            // Implicits are always beneficial — render in PoE implicit blue (no text tag needed, color is the indicator)
            return `<div class="eg-tt-mod eg-tt-mod-implicit"><span class="eg-tt-mod-label">${entry.label}</span></div>`;
        });
        if (lines.length) {
            implicitsHTML = `<div class="eg-tt-section eg-tt-implicits-section">${lines.join('')}</div>`;
        }
    }


    // ── Requirements ─────────────────────────────────────────────────
    // Each requirement part is compared against the attribute totals as the
    // equip gate will see them after the swap (displaced occupant removed,
    // item's own bonuses included — self-carrying). This keeps the tooltip
    // consistent with what _egCanEquipInSlot will actually accept.
    const req = item.requirements || {};
    const curAttrs = _egPreviewEquipAttributes(item);
    const reqParts = [];
    const missingParts = [];
    if ((req.level || 0) > 0) {
        const met = EG_PLAYER_BASE_ATTRIBUTES.level == null
            || EG_PLAYER_BASE_ATTRIBUTES.level >= req.level;
        const label = t('eg_req_level').replace('{n}', req.level);
        reqParts.push(met ? label : `<span class="eg-tt-req-unmet">${label}</span>`);
        if (!met) missingParts.push(label);
    }
    [['str', 'eg_attr_str', 'str'], ['agi', 'eg_attr_agi', 'agi'], ['int', 'eg_attr_int', 'int']]
        .forEach(([reqKey, labelKey, attrKey]) => {
            if ((req[reqKey] || 0) <= 0) return;
            const have = curAttrs[attrKey];
            const label = `${req[reqKey]} ${t(labelKey)}`;
            reqParts.push(have >= req[reqKey]
                ? label
                : `<span class="eg-tt-req-unmet">${label}</span>`);
            if (have < req[reqKey]) missingParts.push(`${req[reqKey] - have} ${t(labelKey)}`);
        });
    const missingHTML = missingParts.length
        ? `<div class="eg-tt-req-missing">${t('eg_req_missing')} ${missingParts.join(', ')}</div>`
        : '';
    const reqHTML = reqParts.length
        ? `<div class="eg-tt-section"><div class="eg-tt-req">${t('eg_requires')} ${reqParts.join(', ')}${missingHTML}</div></div>`
        : '';

    // ── Chain-break warning ──────────────────────────────────────────
    // Shown when the item's own requirements are all met but equipping it
    // would displace an item whose attribute bonuses other equipped items
    // rely on (e.g. a +13 Int ring keeping a 45 Int chest satisfied).
    const chain = _egGetSwapChainBreak(item);
    const chainHTML = chain
        ? `<div class="eg-tt-section"><div class="eg-tt-swap-warning">${t('eg_swap_breaks_warning')
            .replace('{equipped}', chain.occupant.name || '?')
            .replace('{list}', _egGetUnmetRequirementsText(chain.broken))}</div></div>`
        : '';

    // ── Hand-conflict warning (PoE-style) ────────────────────────────
    // Shown when the item fits its own slot but the hand setup forbids it
    // (2H needs a free off-hand, off-hand takes 1H/shield only).
    let handHTML2 = '';
    try {
        if (item && item.category === 'equip'
            && (item.slotType === 'weapon' || item.slotType === 'shield')
            && typeof _egCheckHandCompatibilityInSlot === 'function'
            && typeof _dndFindTargetSlot === 'function') {
            const equippedList = (typeof _egGetAllEquippedItems === 'function')
                ? _egGetAllEquippedItems() : [];
            if (!equippedList.includes(item)) {
                const target = _dndFindTargetSlot(item);
                if (target) {
                    const hg = _egCheckHandCompatibilityInSlot(item, target);
                    if (!hg.ok && hg.handError && typeof _egHandErrorMessage === 'function') {
                        handHTML2 = `<div class="eg-tt-section"><div class="eg-tt-swap-warning">${_egHandErrorMessage(hg.handError, item)}</div></div>`;
                    }
                }
            }
        }
    } catch (e) { handHTML2 = ''; }

    // ── Explicit mods ─────────────────────────────────────────────────
    const mods = Array.isArray(item.mods) ? item.mods : [];
    let modsHTML = '';
    if (mods.length > 0) {
        // Mods sharing the same stat (e.g. flat Health + the Health half of
        // a hybrid roll) are merged into one combined line per stat.
        const mergedLines = _egBuildMergedModLines(mods);
        // Unique items use bespoke mods without tiers — hide PoE-style tier badges.
        const hideTier = !!item.isUnique;
        const lines = mergedLines.map(entry => {
            // Unique downsides render in warning red instead of mod blue.
            const cls = entry.downside ? 'eg-tt-mod eg-tt-mod-downside' : 'eg-tt-mod';
            const tierSpan = (!hideTier && entry.tierLabel) ? `<span class="eg-tt-mod-tier">${entry.tierLabel}</span>` : '';
            const craftedSpan = entry.crafted ? `<span class="eg-tt-mod-crafted">${t('eg_tt_crafted')}</span>` : '';
            return `<div class="${cls}"><span class="eg-tt-mod-label">${entry.label}</span>${tierSpan}${craftedSpan}</div>`;
        });
        if (lines.length) {
            modsHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    }

    // ── Unique special modifiers (non-stat QoL perks) ─────────────────
    // Rendered in implicit-blue between stat mods and flavor text so the
    // zero-line auto-mark tradeoff is visible before equipping.
    let specialHTML = '';
    try {
        const specials = (typeof _egGetUniqueSpecialLines === 'function')
            ? _egGetUniqueSpecialLines(item) : [];
        if (specials.length) {
            const lines = specials.map(s => {
                const label = (typeof LANG !== 'undefined' && LANG === 'de') ? (s.de || s.en) : (s.en || s.de);
                return `<div class="eg-tt-mod eg-tt-mod-implicit"><span class="eg-tt-mod-label">✨ ${label}</span></div>`;
            });
            specialHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    } catch (e) { specialHTML = ''; }

    // ── Unique flavor text ────────────────────────────────────────────
    const flavorHTML = item.isUnique
        ? `<div class="eg-tt-section"><div class="eg-tt-flavor">${LANG === 'de'
            ? (item.flavorDe || item.flavorEn || '')
            : (item.flavorEn || item.flavorDe || '')}</div></div>`
        : '';

    // ── Item level ────────────────────────────────────────────────────
    const ilvlHTML = item.itemLevel != null
        ? `<div class="eg-tt-ilvl">${t('eg_item_level').replace('{n}', item.itemLevel)}</div>`
        : '';

    const mirroredHTML = item.mirrored
        ? `<div class="eg-tt-mirrored">🪞 ${t('eg_tt_mirrored')}</div>`
        : '';

    const bonusLootHTML = item.isBonusLoot
        ? `<div class="eg-tt-mirrored" style="color:#f5d98a;">🎁 ${t('eg_bonus_chance_title')}</div>`
        : '';

    return `
<div class="eg-tt-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.name || item.baseName || '???'}</div>
        ${(item.baseName && item.baseName !== item.name)
            ? `<div class="eg-tt-basename" style="opacity:.7;">${item.baseName}</div>` : ''}
        <div class="eg-tt-rarity-line" style="color:${rc.color};">${rarityLabel} ${slotLabel}</div>
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



// _egShowTooltip is defined ONCE, in endgame-currency.js: it renders the
// floating mouseover tooltip (equipment stat blocks, currency/essence/shard
// cards, map tooltips) via the shared tooltip engine from tooltips-hud.js,
// and drives the Alt-compare tooltip (_egUpdateCompareTooltip /
// _egHideCompareTooltip). Historically this file and
// endgame-hub-drag-and-drop.js each shipped their own copy and the
// LAST-DECLARED-WINS load-order rule picked currency's version silently —
// the duplicates were removed (2026-09) and this is the single source.




function _egClearTooltip() {
    _egShowTooltip(null);
}


// Moves the main tooltip (and the compare tooltip with it) while the
// cursor glides over the hovered item chip.
function _egMoveTooltip(e) {
    moveGameTooltip(e);
    _egPositionCompareTooltip();
}


// ── Alt-hold compare tooltip ────────────────────────────────────────────

// True while the Alt key is held down.
let _egAltDown = false;

// Last known cursor position — fallback anchor when no event is available.
let _egLastMouse = { x: 0, y: 0 };

document.addEventListener('mousemove', e => {
    _egLastMouse.x = e.clientX;
    _egLastMouse.y = e.clientY;
});

// True while the endgame hub or gate screen is the active screen.
// Used to scope the Alt-key browser-menu suppression to the item UIs.
function _egIsItemScreenActive() {
    const hub = document.getElementById('screen-endgame-hub');
    const gate = document.getElementById('screen-endgame-gate');
    return (hub && hub.classList.contains('active'))
        || (gate && gate.classList.contains('active'));
}

window.addEventListener('keydown', e => {
    if (e.key === 'Alt') {
        // Suppress the browser's default Alt behaviour (Firefox/Chrome
        // focus the menu bar, which shifts the layout mid-comparison).
        if (_egIsItemScreenActive()) e.preventDefault();
        if (!_egAltDown) {
            _egAltDown = true;
            _egUpdateCompareTooltip();
        }
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'Alt') {
        // Firefox triggers the menu bar on Alt *release* — block that too.
        if (_egIsItemScreenActive()) e.preventDefault();
        _egAltDown = false;
        _egUpdateCompareTooltip();
    }
});

// Alt state is unreliable after alt-tabbing away — reset on blur.
window.addEventListener('blur', () => {
    _egAltDown = false;
    _egUpdateCompareTooltip();
});


// Resolves the equipped item to compare against the hovered item.
// Only equipment items have a matching paperdoll slot; for multi-slot
// types (rings, earrings, weapons) the first occupied slot wins.
// Returns null when there is nothing meaningful to compare.
function _egGetCompareItem(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return null;
    if (typeof EG_SLOT_ACCEPTS === 'undefined') return null;
    const ids = Object.keys(EG_SLOT_ACCEPTS)
        .filter(id => EG_SLOT_ACCEPTS[id] === item.slotType);
    for (const id of ids) {
        if (_egEquipped[id]) return _egEquipped[id];
    }
    return null;
}


// Shows or hides the compare tooltip based on the current hover target
// and Alt key state. Only shown while Alt is held AND the hovered item
// is not itself the equipped one being compared.
function _egUpdateCompareTooltip() {
    const compareItem = (_egAltDown && _egTooltipItem)
        ? _egGetCompareItem(_egTooltipItem)
        : null;

    // Don't "compare" an equipped item with itself.
    if (compareItem === _egTooltipItem) {
        _egHideCompareTooltip();
        return;
    }

    if (compareItem) _egShowCompareTooltip(compareItem);
    else _egHideCompareTooltip();
}


// Lazily creates the compare tooltip element (visual twin of the main
// game tooltip, but with a yellow accent edge to tell them apart).
function _egGetCompareTip() {
    let tip = document.getElementById('eg-compare-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'eg-compare-tip';
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


function _egShowCompareTooltip(item) {
    const tip = _egGetCompareTip();
    tip.innerHTML = `
<div class="eg-compare-label">${t('eg_tt_currently_equipped')}</div>
${_egBuildTooltipBodyHTML(item)}`;
    tip.style.opacity = '1';
    _egPositionCompareTooltip();
}


function _egHideCompareTooltip() {
    const tip = document.getElementById('eg-compare-tip');
    if (tip) tip.style.opacity = '0';
}


// Places the compare tooltip to the right of the main tooltip
// (flips to the left side when there is not enough room).
function _egPositionCompareTooltip() {
    const main = document.getElementById('ghud-floating-tip');
    const cmp = document.getElementById('eg-compare-tip');
    if (!main || !cmp || cmp.style.opacity !== '1') return;

    let x = main.offsetLeft + main.offsetWidth + 8;
    if (x + cmp.offsetWidth > window.innerWidth - 8) {
        x = Math.max(8, main.offsetLeft - cmp.offsetWidth - 8);
    }
    cmp.style.left = x + 'px';
    // Keep the compare tooltip fully on screen vertically as well.
    const clampedTop = Math.max(8, Math.min(
        main.offsetTop,
        window.innerHeight - cmp.offsetHeight - 8
    ));
    cmp.style.top = clampedTop + 'px';
}
