'use strict';

//========================================================================
//=  ENDGAME VENDOR                                                       =
//========================================================================
//=  Gold-based vendor reached from the Nexus of Worlds screen via the    =
//=  💰 door. Five tabs:                                                  =
//=    MAPS      — freshly rolled Tier 1 maps (→ Probability Gate stash)  =
//=    CURRENCY  — all currency orbs (→ currency stash)                   =
//=    ESSENCES  — all essences (→ essence tab)                           =
//=    ITEMS     — all regular puzzle items (ITEM_DEFS → STATE.inventory) =
//=    BASE      — all equipment base types, filterable by slot type and  =
//=                sortable by equipment slot or item level. Items the    =
//=                player cannot equip (level / stat requirements) are    =
//=                highlighted with a red background.                     =
//=                                                                       =
//=  Public API:                                                          =
//=    showEndgameVendor() — creates the screen on first call and         =
//=                          switches to it.                              =
//========================================================================

//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------

// Price of one vendor-bought Tier 1 map, in gold (0 = free).
const EG_VENDOR_T1_MAP_PRICE = 0;

// Base types given away for free in the Base Items tab — basic level 1
// starter gear (melee weapon, ranged weapon, armour chest + pants) so new
// players can gear up without gold.
const EG_VENDOR_FREE_BASE_IDS = new Set([
    'wpn_1h_1',    // Rusted Sword (level 1 melee)
    'ranged_1',    // Shortbow (level 1 ranged)
    'chest_str_1', // Plate Vest (level 1 chest, pure armour)
    'pants_str_1', // Rusted Greaves (level 1 pants, armour)
    'chest_agi_1', // Tattered Doublet (level 1 chest, evasion)
    'pants_agi_1', // Worn Britches (level 1 pants, evasion)
    'chest_int_1', // Simple Robe (level 1 chest, absorption)
    'pants_int_1', // Silk Pantaloons (level 1 pants, absorption)
]);

// Prices per currency orb id (gold). Missing ids fall back to the default.
const EG_VENDOR_CURRENCY_PRICES = {
    orb_transmutation: 15,
    orb_augmentation: 20,
    orb_alteration: 20,
    orb_scouring: 30,
    orb_alchemy: 35,
    orb_chance: 60,
    orb_regal: 80,
    orb_annulment: 90,
    orb_chaos: 120,
    orb_divine: 180,
    orb_elevation: 150,
    orb_cataclysm: 160,
    orb_ascension: 200,
    orb_exalted: 220,
    mirror_of_kalandra: 2500,
};
const EG_VENDOR_CURRENCY_DEFAULT_PRICE = 50;

// Prices per essence id (gold).
const EG_VENDOR_ESSENCE_PRICES = {
    essence_vitality: 60,
    essence_fortress: 70,
    essence_swiftness: 75,
    essence_might: 80,
    essence_sorcery: 80,
    essence_elements: 100,
};
const EG_VENDOR_ESSENCE_DEFAULT_PRICE = 80;

// Puzzle item prices by rarity (gold).
const EG_VENDOR_ITEM_RARITY_PRICES = {
    common: 25,
    uncommon: 60,
    rare: 120,
    epic: 250,
    legendary: 500,
    artifact: 1000,
    cursed: 750,
};

// Base item price scales with the item level of the base type.
function _egvBaseItemPrice(base) {
    return Math.round(40 + Math.pow(base.minLevel || 1, 1.75));
}


//------------------------------------------------------------------------
//-------------------TAB STATE---------------------------------------------
//------------------------------------------------------------------------

let _egvActiveTab = 'maps';
let _egvBaseFilterSlot = 'all';
let _egvBaseFilterOffer = 'all'; // 'all' | 'free'
let _egvBaseSortMode = 'slot'; // 'slot' | 'ilvl'

const EG_VENDOR_TABS = [
    { id: 'maps', labelKey: 'eg_vendor_tab_maps' },
    { id: 'currency', labelKey: 'eg_vendor_tab_currency' },
    { id: 'essences', labelKey: 'eg_vendor_tab_essences' },
    { id: 'items', labelKey: 'eg_vendor_tab_items' },
    { id: 'base', labelKey: 'eg_vendor_tab_base' },
];

// Hint text shown below each tab's content.
const EG_VENDOR_TAB_HINTS = {
    maps: 'eg_vendor_hint',
    currency: 'eg_vendor_hint_currency',
    essences: 'eg_vendor_hint_essences',
    items: 'eg_vendor_hint_items',
    base: 'eg_vendor_hint_base',
};


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY-----------------------------------------
//------------------------------------------------------------------------

function _egvBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="title-btn back-btn" onclick="goToPreviousScreen()">${t('btn_back')}</button>
    <span class="egn-topbar-title">${t('eg_vendor_title')}</span>
</div>`;
}

function _egvBuildTabBarHTML() {
    const buttons = EG_VENDOR_TABS.map(tab => `
        <button class="egv-tab-btn${tab.id === _egvActiveTab ? ' egv-tab-active' : ''}"
                id="egv-tab-btn-${tab.id}"
                onclick="_egvSwitchTab('${tab.id}')">${t(tab.labelKey)}</button>`).join('');
    return `<div class="egv-tab-bar">${buttons}</div>`;
}

// Assembles the full vendor layout:
// topbar → gold balance → tab bar → tab content → hint text.
function _egvBuildFullScreenHTML() {
    return `
<div class="egn-hub-layout egv-layout">
    ${_egvBuildTopbarHTML()}
    <div class="egv-body">
        <div class="egv-gold-balance" id="egv-gold-balance"></div>
        ${_egvBuildTabBarHTML()}
        <div class="egv-tab-content" id="egv-tab-content"></div>
        <div class="egv-hint" id="egv-hint"></div>
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER HELPERS-----------------------------------------
//------------------------------------------------------------------------

function _egvRefreshGoldDisplay() {
    const balanceEl = document.getElementById('egv-gold-balance');
    if (balanceEl) {
        balanceEl.textContent = t('eg_vendor_gold_balance').replace('{n}', egGetGold().toLocaleString());
    }
}

// Re-renders the active tab's content + hint.
function _egvRenderTabContent() {
    const contentEl = document.getElementById('egv-tab-content');
    if (!contentEl) return;

    switch (_egvActiveTab) {
        case 'maps': contentEl.innerHTML = _egvBuildMapsTabHTML(); break;
        case 'currency': contentEl.innerHTML = _egvBuildCurrencyTabHTML(); break;
        case 'essences': contentEl.innerHTML = _egvBuildEssencesTabHTML(); break;
        case 'items': contentEl.innerHTML = _egvBuildItemsTabHTML(); break;
        case 'base': contentEl.innerHTML = _egvBuildBaseTabHTML(); break;
    }

    const hintEl = document.getElementById('egv-hint');
    if (hintEl) hintEl.textContent = t(EG_VENDOR_TAB_HINTS[_egvActiveTab] || '');

    _egvRefreshGoldDisplay();
}

function _egvSwitchTab(tabId) {
    _egvActiveTab = tabId;
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    const btn = document.getElementById(`egv-tab-btn-${tabId}`);
    if (btn) btn.classList.add('egv-tab-active');
    _egvRenderTabContent();
}


//------------------------------------------------------------------------
//-------------------SHARED CARD HELPERS------------------------------------
//------------------------------------------------------------------------

function _egvBuildCardHTML({ icon, title, subtitle, desc, price, buyCall, extraClass = '', blockedReason = '', extraAttrs = '' }) {
    const blockedCls = blockedReason ? ' egv-card-blocked' : '';
    const blockedTitle = blockedReason ? ` title="${blockedReason.replace(/"/g, '&quot;')}"` : '';
    // Free offers (price 0) never show a gold deficit.
    const isFree = price <= 0;
    // Dim the card + show the deficit while the player cannot afford it.
    const cannotAfford = !isFree && egGetGold() < price;
    const affordCls = cannotAfford ? ' egv-card-cannot-afford' : '';
    const affordLine = cannotAfford
        ? `<div class="egv-price-missing">${t('eg_vendor_missing_gold').replace('{n}', (price - egGetGold()).toLocaleString())}</div>`
        : '';
    return `
<div class="egv-card${blockedCls}${affordCls} ${extraClass}"${blockedTitle}${extraAttrs}>
    <div class="egv-card-top">
        <div class="egv-card-icon">${icon}</div>
        <div class="egv-card-info">
            <div class="egv-card-name">${title}</div>
            ${subtitle ? `<div class="egv-card-sub">${subtitle}</div>` : ''}
            ${desc ? `<div class="egv-card-desc">${desc}</div>` : ''}
        </div>
    </div>
    <div class="egv-card-bottom">
        <div>
            <div class="egv-offer-price">${isFree ? `🪙 ${t('eg_vendor_free')}` : `🪙 ${price.toLocaleString()}`}</div>
            ${affordLine}
        </div>
        <button class="title-btn egv-buy-btn" onclick="${buyCall}">${t('eg_vendor_buy')}</button>
    </div>
</div>`;
}

// Generic gold purchase wrapper: spends first, runs grantFn, refunds on
// failure so gold is never eaten by a full stash.
function _egvPurchase(price, grantFn) {
    if (!egSpendGold(price)) {
        showToast(t('eg_vendor_no_gold').replace('{n}', price - egGetGold()));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return false;
    }
    if (typeof _egLoadHubState === 'function') _egLoadHubState();
    if (!grantFn()) {
        _egAddGold(price); // refund
        showToast(t('eg_vendor_no_space'));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return false;
    }
    if (typeof egSaveHubState === 'function') egSaveHubState();
    Audio_Manager.playSFX('player_equip_pickup');
    return true;
}


//------------------------------------------------------------------------
//-------------------TAB: MAPS----------------------------------------------
//------------------------------------------------------------------------

function _egvBuildMapsTabHTML() {
    return `
<div class="egv-offer-card" id="egv-map-offer-card">
    <div class="egv-offer-icon">🗺️</div>
    <div class="egv-offer-name">${t('eg_vendor_offer_name')}</div>
    <div class="egv-offer-desc">${t('eg_vendor_offer_desc')}</div>
    <div class="egv-offer-price" id="egv-offer-price"></div>
    <div class="egv-price-missing" id="egv-map-missing-gold" style="display:none;"></div>
    <button class="title-btn egv-buy-btn" id="egv-buy-btn"
            onclick="_egvBuyTierOneMap()">${t('eg_vendor_buy_btn')}</button>
</div>`;
}

// Kept for parity with the original single-map flow — refreshes the map
// card's dynamic bits after opening the vendor.
function _egvRefreshMapsTabDynamic() {
    const priceEl = document.getElementById('egv-offer-price');
    if (priceEl) {
        if (EG_VENDOR_T1_MAP_PRICE > 0) {
            priceEl.textContent = t('eg_vendor_price').replace('{n}', EG_VENDOR_T1_MAP_PRICE.toLocaleString());
        } else {
            priceEl.textContent = `🪙 ${t('eg_vendor_free')}`;
        }
    }
    const cannotAfford = egGetGold() < EG_VENDOR_T1_MAP_PRICE;
    const cardEl = document.getElementById('egv-map-offer-card');
    if (cardEl) cardEl.classList.toggle('egv-card-cannot-afford', cannotAfford);
    const btn = document.getElementById('egv-buy-btn');
    if (btn) btn.classList.toggle('egv-cannot-afford', cannotAfford);
    const missingEl = document.getElementById('egv-map-missing-gold');
    if (missingEl) {
        missingEl.style.display = cannotAfford ? '' : 'none';
        if (cannotAfford) {
            missingEl.textContent = t('eg_vendor_missing_gold')
                .replace('{n}', (EG_VENDOR_T1_MAP_PRICE - egGetGold()).toLocaleString());
        }
    }
}

// Buys one freshly-rolled Tier 1 map. Free starter maps are always forced
// to Normal rarity (no rolled mods) so a fresh character gets a clean
// baseline run; paid maps are generated like any other drop. The map is
// placed in the first free Probability Gate map stash slot.
function _egvBuyTierOneMap() {
    if (EG_VENDOR_T1_MAP_PRICE > 0 && !egSpendGold(EG_VENDOR_T1_MAP_PRICE)) {
        showToast(t('eg_vendor_no_gold').replace('{n}', EG_VENDOR_T1_MAP_PRICE - egGetGold()));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    if (typeof _egLoadHubState === 'function') _egLoadHubState();

    if (!_egMapStashHasFreeSlot()) {
        // Refund so gold is never eaten by a full stash.
        if (EG_VENDOR_T1_MAP_PRICE > 0) _egAddGold(EG_VENDOR_T1_MAP_PRICE);
        showToast(t('eg_vendor_stash_full'));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    // Tier 1 ≈ monster level 4 (same mapping as _egGenerateMapDrop).
    // The free starter map always launches modifier-free.
    const map = EG_VENDOR_T1_MAP_PRICE > 0
        ? _egGenerateMapDrop(4, 1)
        : _egGenerateMapDrop(4, 1, { forceNormal: true });
    _egAddMapToMapStash(map);
    egSaveHubState();

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_vendor_bought')
        .replace('{icon}', map.icon || '🗺️')
        .replace('{name}', map.name));

    _egvRefreshMapsTabDynamic();
    _egvRefreshGoldDisplay();
}


//------------------------------------------------------------------------
//-------------------TAB: CURRENCY------------------------------------------
//------------------------------------------------------------------------

function _egvCurrencyPrice(id) {
    return EG_VENDOR_CURRENCY_PRICES[id] != null ? EG_VENDOR_CURRENCY_PRICES[id] : EG_VENDOR_CURRENCY_DEFAULT_PRICE;
}

function _egvBuildCurrencyTabHTML() {
    const defs = Object.values(EG_CURRENCY_DEFS);
    const cards = defs.map(def => _egvBuildCardHTML({
        icon: def.icon,
        title: def.name,
        desc: def.description,
        price: _egvCurrencyPrice(def.id),
        buyCall: `_egvBuyCurrency('${def.id}')`,
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

function _egvBuyCurrency(id) {
    const def = EG_CURRENCY_DEFS[id];
    if (!def) return;
    const price = _egvCurrencyPrice(id);
    if (!_egvPurchase(price, () => egAddCurrency(id, 1, {
        name: def.name,
        icon: def.icon,
        rarity: 'currency',
        category: 'currency',
        description: def.description,
    }))) return;

    showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _egvRenderTabContent();
}


//------------------------------------------------------------------------
//-------------------TAB: ESSENCES-------------------------------------------
//------------------------------------------------------------------------

function _egvEssencePrice(id) {
    return EG_VENDOR_ESSENCE_PRICES[id] != null ? EG_VENDOR_ESSENCE_PRICES[id] : EG_VENDOR_ESSENCE_DEFAULT_PRICE;
}

function _egvBuildEssencesTabHTML() {
    const defs = Object.values(EG_ESSENCE_DEFS);
    const cards = defs.map(def => _egvBuildCardHTML({
        icon: def.icon,
        title: def.name,
        desc: def.description,
        price: _egvEssencePrice(def.id),
        buyCall: `_egvBuyEssence('${def.id}')`,
        extraClass: 'egv-essence-card',
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

function _egvBuyEssence(id) {
    const def = EG_ESSENCE_DEFS[id];
    if (!def) return;
    const price = _egvEssencePrice(id);
    if (!_egvPurchase(price, () => egAddEssence(id, 1, {
        name: def.name,
        icon: def.icon,
        rarity: 'essence',
        category: 'essence',
        description: def.description,
    }))) return;

    showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _egvRenderTabContent();
}


//------------------------------------------------------------------------
//-------------------TAB: PUZZLE ITEMS (ITEM_DEFS)--------------------------
//------------------------------------------------------------------------

function _egvPuzzleItemPrice(rarity) {
    return EG_VENDOR_ITEM_RARITY_PRICES[rarity] != null ? EG_VENDOR_ITEM_RARITY_PRICES[rarity] : 100;
}

function _egvBuildItemsTabHTML() {
    const cards = Object.values(ITEM_DEFS).map(def => _egvBuildCardHTML({
        icon: def.icon,
        title: itemName(def),
        subtitle: def.rarity,
        desc: itemDesc(def),
        price: _egvPuzzleItemPrice(def.rarity),
        buyCall: `_egvBuyPuzzleItem('${def.id}')`,
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

// Buys a regular puzzle item straight into the persistent main inventory.
function _egvBuyPuzzleItem(defId) {
    const def = ITEM_DEFS[defId];
    if (!def) return;
    const price = _egvPuzzleItemPrice(def.rarity);

    if (!egSpendGold(price)) {
        showToast(t('eg_vendor_no_gold').replace('{n}', price - egGetGold()));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId,
    });
    save();
    buildInventoryPanel();

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', itemName(def)));
    _egvRenderTabContent();
}


//------------------------------------------------------------------------
//-------------------TAB: BASE ITEMS----------------------------------------
//------------------------------------------------------------------------

// Canonical slot order — first appearance inside EG_ALL_BASE_TYPES.
function _egvGetSlotOrder() {
    const order = [];
    EG_ALL_BASE_TYPES.forEach(base => {
        if (!order.includes(base.slotType)) order.push(base.slotType);
    });
    return order;
}

// Requirement check against the player's live attributes/level.
// Returns a list of localized deficit strings ("Level 12", "5 Agi").
function _egvGetMissingRequirements(base) {
    const req = base.requirements || {};
    const missing = [];

    let level = (typeof _egGetPlayerLevel === 'function') ? _egGetPlayerLevel() : null;
    if (level == null && typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') {
        level = EG_PLAYER_BASE_ATTRIBUTES.level;
    }
    level = level == null ? Infinity : level;
    if ((req.level || 0) > level) {
        missing.push(_egFormatRequirementPart('level', req.level - level));
    }

    let attrs = { str: 0, agi: 0, int: 0 };
    if (typeof _egComputeLoadoutAttributes === 'function') {
        const equippedList = (typeof _egEquipped !== 'undefined')
            ? Object.values(_egEquipped).filter(Boolean) : [];
        attrs = _egComputeLoadoutAttributes(equippedList);
    }
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > attrs[stat]) {
            missing.push(`${Math.round(req[stat] - attrs[stat])} ${t(`eg_attr_${stat}`)}`);
        }
    });

    return missing;
}

// Short "Requires ..." summary line for a base type.
function _egvBuildReqSummaryText(base) {
    const req = base.requirements || {};
    const parts = [];
    if ((req.level || 0) > 0) parts.push(t('eg_req_level').replace('{n}', req.level));
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > 0) parts.push(`${req[stat]} ${t(`eg_attr_${stat}`)}`);
    });
    return parts.length ? `${t('eg_vendor_requires')} ${parts.join(' · ')}` : '';
}

function _egvSetBaseFilter(value) {
    _egvBaseFilterSlot = value;
    _egvRenderBaseListOnly();
}

function _egvSetBaseOfferFilter(value) {
    _egvBaseFilterOffer = value;
    _egvRenderBaseListOnly();
}

function _egvSetBaseSort(value) {
    _egvBaseSortMode = value;
    _egvRenderBaseListOnly();
}

// Re-renders only the base item list + filter controls (keeps focus/state).
function _egvRenderBaseListOnly() {
    _egvHideBaseTooltip(); // hovered card may be replaced by the re-render
    const listEl = document.getElementById('egv-base-list');
    if (listEl) listEl.innerHTML = _egvBuildBaseListHTML();
    _egvRefreshGoldDisplay();
}

function _egvGetFilteredSortedBases() {
    const slotOrder = _egvGetSlotOrder();
    let bases = EG_ALL_BASE_TYPES.slice();

    if (_egvBaseFilterSlot !== 'all') {
        bases = bases.filter(b => b.slotType === _egvBaseFilterSlot);
    }

    if (_egvBaseFilterOffer === 'free') {
        bases = bases.filter(b => EG_VENDOR_FREE_BASE_IDS.has(b.id));
    }

    if (_egvBaseSortMode === 'ilvl') {
        bases.sort((a, b) => (a.minLevel - b.minLevel)
            || slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType));
    } else {
        // Group by equipment slot (canonical order), then by item level.
        bases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)
            || a.minLevel - b.minLevel);
    }
    return bases;
}

function _egvBuildBaseFilterOptionsHTML() {
    const slotOrder = _egvGetSlotOrder();
    const options = [`<option value="all"${_egvBaseFilterSlot === 'all' ? ' selected' : ''}>${t('eg_vendor_filter_all')}</option>`];
    slotOrder.forEach(slot => {
        const selected = _egvBaseFilterSlot === slot ? ' selected' : '';
        options.push(`<option value="${slot}"${selected}>${t(`eg_slot_${slot}`)}</option>`);
    });
    return options.join('');
}

function _egvBuildBaseTabHTML() {
    return `
<div class="egv-base-controls">
    <label class="egv-base-control-label">
        <span>${t('eg_vendor_filter_type')}</span>
        <select onchange="_egvSetBaseFilter(this.value)">${_egvBuildBaseFilterOptionsHTML()}</select>
    </label>
    <label class="egv-base-control-label">
        <span>${t('eg_vendor_filter_offer')}</span>
        <select onchange="_egvSetBaseOfferFilter(this.value)">
            <option value="all"${_egvBaseFilterOffer === 'all' ? ' selected' : ''}>${t('eg_vendor_filter_offer_all')}</option>
            <option value="free"${_egvBaseFilterOffer === 'free' ? ' selected' : ''}>${t('eg_vendor_filter_free')}</option>
        </select>
    </label>
    <label class="egv-base-control-label">
        <span>${t('eg_vendor_sort_by')}</span>
        <select onchange="_egvSetBaseSort(this.value)">
            <option value="slot"${_egvBaseSortMode === 'slot' ? ' selected' : ''}>${t('eg_vendor_sort_slot')}</option>
            <option value="ilvl"${_egvBaseSortMode === 'ilvl' ? ' selected' : ''}>${t('eg_vendor_sort_ilvl')}</option>
        </select>
    </label>
</div>
<div class="egv-base-list" id="egv-base-list">${_egvBuildBaseListHTML()}</div>`;
}

function _egvBuildBaseListHTML() {
    const bases = _egvGetFilteredSortedBases();
    const cards = bases.map(base => {
        const name = (typeof LANG !== 'undefined' && LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _egvGetMissingRequirements(base);
        const price = EG_VENDOR_FREE_BASE_IDS.has(base.id) ? 0 : _egvBaseItemPrice(base);
        return _egvBuildCardHTML({
            icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _egvBuildReqSummaryText(base),
            price,
            buyCall: `_egvBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_egvShowBaseTooltip('${base.id}', event)" onmouseleave="_egvHideBaseTooltip()"`,
            blockedReason: missing.length
                ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', '))
                : '',
        });
    }).join('');
    return `<div class="egv-cards egv-cards-base">${cards}</div>`;
}

// Builds a preview/purchase item object from an equipment base type —
// used both for vendor purchases and for the mouseover stat tooltip.
function _egvBuildBaseItemFromBase(base) {
    const baseName = (typeof LANG !== 'undefined' && LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    return {
        id: `${base.id}_preview`,
        baseId: base.id,
        name: baseName,
        icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',
        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity: 'common',
        itemLevel: base.minLevel,
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },
        ...(base.damage ? { damage: { ...base.damage }, attackIntervalSeconds: base.attackIntervalSeconds } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
    };
}

// Shows the shared floating equipment tooltip (from endgame-hub.js) for a
// base type card. Holding Alt also compares against the equipped item.
function _egvShowBaseTooltip(baseId, e) {
    if (typeof _egShowTooltip !== 'function') return;
    const base = EG_ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    _egShowTooltip(_egvBuildBaseItemFromBase(base), e);
}

function _egvHideBaseTooltip() {
    if (typeof _egClearTooltip === 'function') _egClearTooltip();
}

// Buys a specific equipment base type as a fresh common (white) item at its
// minimum item level and places it in the first free hub inventory slot.
function _egvBuyBaseItem(baseId) {
    const base = EG_ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    const price = EG_VENDOR_FREE_BASE_IDS.has(baseId) ? 0 : _egvBaseItemPrice(base);

    if (!_egvPurchase(price, () => {
        if (!_egStashHasFreeSlot()) return false;

        const item = _egvBuildBaseItemFromBase(base);
        item.id = `${base.id}_${Date.now()}`;
        // Free starter gear sells for nothing — prevents a buy-free/sell-shard loop.
        if (price === 0) item.noSellValue = true;

        for (let r = 0; r < EG_INV_ROWS; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                if (!_egInventory[r][c]) {
                    _egInventory[r][c] = item;
                    if (typeof _egRenderInventoryCell === 'function') _egRenderInventoryCell(r, c);
                    return true;
                }
            }
        }
        return false;
    })) return;

    const name = (typeof LANG !== 'undefined' && LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', base.icon || EG_SLOT_ICONS[base.slotType] || '📦')
        .replace('{name}', name));
    _egvRenderTabContent();
    _egvHideBaseTooltip(); // card re-render may swallow the mouseleave event
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------

function _egvEnsureStyles() {
    // The vendor topbar reuses the Nexus topbar styles.
    if (typeof _egnEnsureStyles === 'function') _egnEnsureStyles();
    if (document.getElementById('egv-vendor-style')) return;

    const style = document.createElement('style');
    style.id = 'egv-vendor-style';
    style.textContent = `
        .egv-body {
            flex-grow: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: flex-start; gap: 14px;
            width: min(1100px, 96vw); margin: 0 auto; padding-bottom: 16px;
        }
        .egv-gold-balance {
            font-size: 16px; letter-spacing: 2px; color: #f5d98a;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 8px 26px;
        }
        /* ── Tabs ────────────────────────────────────────────────────── */
        .egv-tab-bar {
            display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
        }
        .egv-tab-btn {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            padding: 9px 18px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444); color: var(--accent2, #888);
            transition: all 0.12s;
        }
        .egv-tab-btn:hover {
            color: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b);
        }
        .egv-tab-btn.egv-tab-active {
            color: #f5d98a; border-color: var(--accent, #c8a84b);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25), inset 0 0 8px rgba(200,168,75,0.08);
        }
        .egv-tab-content {
            width: 100%; display: flex; justify-content: center;
            max-height: 58vh; overflow-y: auto; padding-right: 4px;
        }
        /* ── Card grid ───────────────────────────────────────────────── */
        .egv-cards {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 10px; width: 100%;
        }
        .egv-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.12);
        }
        /* Red highlight when the player cannot equip the item */
        .egv-card.egv-card-blocked {
            border-color: #c0392b;
            background: rgba(60, 10, 10, 0.55);
            box-shadow: 0 0 10px rgba(192, 57, 43, 0.25);
        }
        .egv-card-top { display: flex; gap: 10px; align-items: flex-start; }
        .egv-card-icon { font-size: 34px; line-height: 1; }
        .egv-card-info { flex-grow: 1; min-width: 0; }
        .egv-card-name {
            font-size: 13px; letter-spacing: 1px; color: var(--accent, #c8a84b);
            word-break: break-word;
        }
        .egv-card-sub {
            font-size: 9px; letter-spacing: 1px; color: #f5d98a;
            text-transform: uppercase; margin-top: 3px;
        }
        .egv-card-desc {
            font-size: 10px; color: var(--accent2, #ccc); line-height: 1.5; margin-top: 4px;
        }
        .egv-card-bottom {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .egv-card-blocked .egv-buy-btn { opacity: 0.45; }
        /* ── Cannot-afford highlight ─────────────────────────────────── */
        .egv-card.egv-card-cannot-afford .egv-buy-btn,
        .egv-offer-card.egv-card-cannot-afford .egv-buy-btn {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .egv-price-missing {
            font-size: 9px; letter-spacing: 1px; color: #e06055; margin-top: 3px;
        }
        /* ── Base items: filter/sort controls ────────────────────────── */
        .egv-base-controls {
            display: flex; gap: 18px; flex-wrap: wrap; justify-content: center;
        }
        .egv-base-control-label {
            display: flex; align-items: center; gap: 8px;
            font-size: 10px; letter-spacing: 1px; color: var(--accent2, #ccc);
        }
        .egv-base-control-label select {
            font-family: var(--PX, monospace); font-size: 11px;
            background: rgba(20, 15, 5, 0.85); color: var(--accent, #c8a84b);
            border: 1px solid var(--accent, #c8a84b); border-radius: 4px;
            padding: 5px 8px; cursor: pointer;
        }
        .egv-base-list { width: 100%; }
        .egv-tab-content::-webkit-scrollbar { width: 10px; }
        .egv-tab-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .egv-tab-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .egv-tab-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
        /* ── Maps tab (legacy offer card look) ───────────────────────── */
        .egv-offer-card {
            width: 320px; min-height: 280px; padding: 24px;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 14px; text-align: center;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px;
            box-shadow: 0 0 18px rgba(200, 168, 75, 0.2);
        }
        .egv-offer-icon { font-size: 64px; line-height: 1; }
        .egv-offer-name {
            font-size: 15px; letter-spacing: 2px; color: var(--accent, #c8a84b);
        }
        .egv-offer-desc { font-size: 11px; color: var(--accent2, #ccc); line-height: 1.6; }
        .egv-offer-price {
            font-size: 13px; letter-spacing: 1px; color: #f5d98a;
        }
        .egv-buy-btn {
            font-family: var(--PX, monospace); font-size: 12px; letter-spacing: 2px;
            padding: 10px 22px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--accent, #c8a84b); color: var(--accent, #c8a84b);
            transition: all 0.12s;
        }
        .egv-buy-btn:hover {
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.35);
            color: #f5d98a;
        }
        .egv-buy-btn:active { transform: translateY(1px); }
        .egv-buy-btn.egv-cannot-afford {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .egv-hint {
            font-size: 10px; letter-spacing: 1px; color: rgba(232, 218, 239, 0.55);
            max-width: 520px; text-align: center; line-height: 1.6;
        }
        /* Reuse the Nexus topbar button look for back/buy buttons */
        .egv-layout .egn-topbar { margin-bottom: 0; }
        .egv-layout .egn-topbar .title-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egvCreateScreen() {
    _egvEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-vendor';
    screen.className = 'screen';
    screen.innerHTML = _egvBuildFullScreenHTML();
    document.body.appendChild(screen);
}

// Entry point — opens the Vendor screen on the last active tab.
function showEndgameVendor() {
    if (!document.getElementById('screen-endgame-vendor')) _egvCreateScreen();

    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-vendor');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-vendor').style.display = 'block';
    }

    // Keep the active tab highlighted across visits.
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    const activeBtn = document.getElementById(`egv-tab-btn-${_egvActiveTab}`);
    if (activeBtn) activeBtn.classList.add('egv-tab-active');

    _egvRenderTabContent();
    _egvRefreshMapsTabDynamic();
}