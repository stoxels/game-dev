'use strict';

//========================================================================
//=  ENDGAME VENDOR                                                       =
//========================================================================
//=  Gold-based vendor reached from the Nexus of Worlds screen via the    =
//=  💰 door. Six tabs (Atlas Vendor):                                    =
//=    MAPS      — free Tier 1 Normal map only (→ map stash)              =
//=    STARTER   — free level 1 starter gear (no sell value)              =
//=    CURRENCY  — all currency orbs (→ currency stash)                   =
//=    ESSENCES  — all 93 essences (→ essence tab)                        =
//=    ITEMS     — all regular puzzle items (ITEM_DEFS → STATE.inventory) =
//=    BASE      — all non-starter equipment base types, filterable by    =
//=                slot type and auto-sorted descending by item level.    =
//=                Items the player cannot equip are highlighted red.     =
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

// Base types given away for free in the Starter Gear tab — basic level 1
// starter gear so new players can gear up without gold. No longer part
// of the Base Items tab.
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
// Rebalanced: common crafting orbs are affordable, rare/epic orbs are
// deliberately expensive so they remain chase items and cannot be spammed.
const EG_VENDOR_CURRENCY_PRICES = {
    orb_transmutation: 45,
    orb_augmentation: 55,
    orb_alteration: 65,
    orb_scouring: 110,
    orb_alchemy: 140,
    orb_chance: 280,
    orb_regal: 320,
    orb_bloom: 380,
    orb_annulment: 480,
    orb_chaos: 620,
    orb_divine: 950,
    orb_elevation: 900,
    orb_cataclysm: 1000,
    orb_ascension: 1100,
    orb_exalted: 1400,
    orb_ancient: 2800,
    orb_blessing: 420,
    orb_horizons: 500,
    mirror_of_kalandra: 8500,
};
const EG_VENDOR_CURRENCY_DEFAULT_PRICE = 320;

// Prices per essence id (gold). 93 per-modifier essences now all have
// distinct prices: baseline 320, powerful families cost significantly more.
const EG_VENDOR_ESSENCE_PRICES = {
    // Recovery / absorption — 400-440
    essence_absorption_on_kill: 440,
    essence_absorption_regen_rate: 440,
    // Cheap / puzzle-utility tier — ~260-320
    essence_time_added: 260,
    essence_mistake_count: 260,
    essence_mistake_not_count: 280,
    essence_focus: 280,
    essence_reveal_hint: 280,
    essence_chance_for_new_question: 300,
    essence_fate: 320,
    essence_echo: 320,
    // Resistances — 340-380
    essence_fire_resist: 360,
    essence_cold_resist: 360,
    essence_lightning_resist: 360,
    essence_shadow_resist: 380,
    essence_arcane_resistance: 380,
    // Flat defenses — 380-450
    essence_flat_armour: 420,
    essence_flat_evasion: 420,
    essence_flat_absorption: 420,
    essence_inc_armour: 380,
    essence_inc_evasion: 380,
    essence_inc_absorption: 380,
    essence_hybrid_armour_absorption: 480,
    essence_hybrid_armour_evasion: 480,
    essence_hybrid_evasion_absorption: 480,
    essence_hybrid_evasion_armour: 480,
    // Elemental / flat damage — 500-620
    essence_fire_damage: 520,
    essence_cold_damage: 520,
    essence_lightning_damage: 520,
    essence_shadow_damage: 520,
    essence_spell_damage: 720,
    essence_inc_spell_damage: 720,
    essence_precision_damage: 580,
    // Life / mana / hybrid life+mana — 550-750 (very desirable)
    essence_flat_health: 650,
    essence_inc_health: 620,
    essence_flat_mana: 580,
    essence_life_regen: 480,
    essence_mana_regen: 480,
    essence_hybrid_life_armour: 720,
    essence_hybrid_life_evasion: 720,
    essence_hybrid_life_absorption: 720,
    essence_hybrid_mana_armour: 680,
    essence_hybrid_mana_evasion: 680,
    essence_hybrid_mana_absorption: 680,
    // Attributes — 620
    essence_strength: 620,
    essence_agility: 620,
    essence_intelligence: 620,
    // Offensive power — most expensive
    essence_flat_physical_damage: 820,
    essence_inc_physical_damage: 820,
    essence_crit_chance: 900,
    essence_crit_multiplier: 900,
    essence_attack_speed: 850,
    essence_arcane_surge: 680,
    essence_mana_to_damage: 700,
    essence_precision_regen: 500,
    // Weapon mechanics — mid-high
    essence_accuracy: 460,
    essence_pierce: 620,
    essence_cleave: 620,
    essence_splash_damage: 620,
    essence_chain: 640,
    essence_channel: 640,
    essence_multishot: 680,
    essence_snipe: 560,
    essence_shield_bash: 520,
    essence_overkill: 520,
    essence_pushback: 420,
    essence_stagger: 460,
    // Defensive mechanics — 500-620
    essence_block_chance: 620,
    essence_spell_block_chance: 620,
    essence_block_recovery: 420,
    essence_dodge: 580,
    essence_spell_dodge: 580,
    essence_preemptive_dodge: 580,
    essence_parry: 560,
    essence_deflect: 520,
    essence_deflect_damage: 520,
    essence_first_step: 480,
    essence_grounded: 480,
    essence_warding: 520,
    // Status / ailment chance — 480-560
    essence_chance_to_ignite: 520,
    essence_chance_to_freeze: 520,
    essence_chance_to_shock: 520,
    essence_chance_to_blind: 480,
    essence_chance_to_convert: 500,
    // Recovery / sustain — 440-520
    essence_life_leech: 540,
    essence_life_on_kill: 440,
    essence_mana_on_kill: 440,
    essence_mana_on_mistake: 440,
    essence_absorption_on_kill: 440,
    essence_absorption_regen_rate: 440,
    essence_faster_absorption_regen_start: 400,
    essence_heart_heal: 400,
    essence_inc_heart_heal: 420,
    essence_mana_heal: 400,
    essence_inc_mana_heal: 420,
    // Movement / utility
    essence_movement_speed: 540,
};
const EG_VENDOR_ESSENCE_DEFAULT_PRICE = 350;

// Puzzle item prices by rarity (gold) — rebalanced to be more expensive
// across the board so puzzle items remain meaningful purchases.
const EG_VENDOR_ITEM_RARITY_PRICES = {
    common: 55,
    uncommon: 130,
    rare: 280,
    epic: 600,
    legendary: 1300,
    artifact: 2800,
    cursed: 1950,
};

// Base item price scales with the item level of the base type.
// Rebalanced to be ~2.5x more expensive than before so progression feels slower.
function _egvBaseItemPrice(base) {
    return Math.round(90 + Math.pow(base.minLevel || 1, 1.78) * 2.3);
}


//------------------------------------------------------------------------
//-------------------TAB STATE---------------------------------------------
//------------------------------------------------------------------------

let _egvActiveTab = 'maps';
let _egvBaseFilterSlot = 'all';

const EG_VENDOR_TABS = [
    { id: 'maps', labelKey: 'eg_vendor_tab_maps' },
    { id: 'starter', labelKey: 'eg_vendor_tab_starter' },
    { id: 'currency', labelKey: 'eg_vendor_tab_currency' },
    { id: 'essences', labelKey: 'eg_vendor_tab_essences' },
    { id: 'items', labelKey: 'eg_vendor_tab_items' },
    { id: 'base', labelKey: 'eg_vendor_tab_base' },
];

// Hint text shown below each tab's content.
const EG_VENDOR_TAB_HINTS = {
    maps: 'eg_vendor_hint',
    starter: 'eg_vendor_hint_starter',
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
        case 'starter': contentEl.innerHTML = _egvBuildStarterTabHTML(); break;
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
    if (typeof trackAchStat === 'function') try { trackAchStat('egVendorPurchases', 1); } catch(e){}
    return true;
}


//------------------------------------------------------------------------
//-------------------TAB: MAPS----------------------------------------------
//------------------------------------------------------------------------

// Builds the Maps tab: only a single free Tier 1 Normal map is offered.
// Maps are always Normal (white, no modifiers) so players must use currency
// orbs to upgrade them. This keeps progression gated through map drops.
function _egvBuildMapsTabHTML() {
    const tier = 1;
    const monsterLevel = (typeof _egMapTierMonsterLevel === 'function')
        ? _egMapTierMonsterLevel(tier) : tier;
    let title;
    try { title = t('eg_vendor_offer_name'); } catch (e) { title = 'Tier 1 Map'; }
    const sub = `Tier ${tier} · Monster Lv ${monsterLevel} · Normal`;
    let desc;
    try { desc = t('eg_vendor_offer_desc'); } catch (e) { desc = 'A freshly charted Tier 1 map — always Normal (white). Use currency orbs to add modifiers.'; }
    const card = _egvBuildCardHTML({
        icon: '🗺️',
        title,
        subtitle: sub,
        desc,
        price: 0,
        buyCall: `_egvBuyTierMap(1)`,
        extraClass: 'egv-map-card',
    });
    return `<div class="egv-cards egv-cards-maps">${card}</div>`;
}

// Refreshes dynamic bits on the Maps tab. All tier maps are free (price 0)
// so there is no cannot-afford state — we keep legacy single-card support
// for save-compatibility and simply refresh the gold balance.
function _egvRefreshMapsTabDynamic() {
    // Legacy single-card path (pre multi-tier): keep behaviour if that DOM still exists.
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
    _egvRefreshGoldDisplay();
}

// Core purchase helper — always produces a Normal (white) map with no
// modifiers. Players must use currency orbs to upgrade the map afterwards.
function _egvBuyTierMap(tier) {
    const maxTier = (typeof EG_MAX_MAP_TIER !== 'undefined') ? EG_MAX_MAP_TIER
        : ((typeof EG_ATLAS_MAX_TIER !== 'undefined') ? EG_ATLAS_MAX_TIER : 16);
    tier = Math.max(1, Math.min(maxTier, Math.round(tier || 1)));
    // Vendor only sells Tier 1 for now — clamp higher tiers down.
    tier = 1;

    if (typeof _egLoadHubState === 'function') _egLoadHubState();

    // Always Normal — no rarity or mod rolls, but upgradeable with orbs.
    const map = _egGenerateMapDrop(4, 1, { forceNormal: true });
    _egAddMapToMapStash(map);
    egSaveHubState();

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_vendor_bought')
        .replace('{icon}', map.icon || '🗺️')
        .replace('{name}', map.name));

    if (typeof trackAchStat === 'function') try { trackAchStat('egVendorPurchases', 1); } catch(e){}
    _egvRefreshMapsTabDynamic();
    _egvRefreshGoldDisplay();
}

// Backwards-compat shim: old Maps tab and external callers used this name.
function _egvBuyTierOneMap() {
    return _egvBuyTierMap(1);
}


//------------------------------------------------------------------------
//-------------------TAB: STARTER GEAR (FREE)-------------------------------
//------------------------------------------------------------------------

function _egvBuildStarterTabHTML() {
    const slotOrder = _egvGetSlotOrder();
    const starterBases = EG_ALL_BASE_TYPES.filter(b => EG_VENDOR_FREE_BASE_IDS.has(b.id));
    // No filter — always show all 8 starter items, sorted by slot order
    starterBases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType) || a.minLevel - b.minLevel);

    const cards = starterBases.map(base => {
        const name = (typeof LANG !== 'undefined' && LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _egvGetMissingRequirements(base);
        return _egvBuildCardHTML({
            icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _egvBuildReqSummaryText(base),
            price: 0,
            buyCall: `_egvBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_egvShowBaseTooltip('${base.id}', event)" onmouseleave="_egvHideBaseTooltip()"`,
            blockedReason: missing.length ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', ')) : '',
        });
    }).join('');

    return `<div class="egv-cards egv-cards-base">${cards}</div>`;
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
    if (typeof trackAchStat === 'function') try { trackAchStat('egVendorPurchases', 1); } catch(e){}
    _egvRenderTabContent();
}


// ------------------------------------------------------------------------
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

// Re-renders only the base item list + filter controls (keeps focus/state).
function _egvRenderBaseListOnly() {
    _egvHideBaseTooltip(); // hovered card may be replaced by the re-render
    const listEl = document.getElementById('egv-base-list');
    if (listEl) listEl.innerHTML = _egvBuildBaseListHTML();
    // Also refresh the filter dropdown selected state
    const sel = document.getElementById('egv-base-filter-select');
    if (sel) sel.value = _egvBaseFilterSlot;
    _egvRefreshGoldDisplay();
}

function _egvGetFilteredSortedBases() {
    // Exclude free starter gear — now in its own tab
    let bases = EG_ALL_BASE_TYPES.filter(b => !EG_VENDOR_FREE_BASE_IDS.has(b.id));

    if (_egvBaseFilterSlot !== 'all') {
        bases = bases.filter(b => b.slotType === _egvBaseFilterSlot);
    }

    // Auto-sort: highest item level on top (descending). When filtering by
    // a single slot, this surfaces the best bases for that slot first.
    // When showing all slots, still group by slot order but with highest
    // ilvl first within each slot group.
    const slotOrder = _egvGetSlotOrder();
    if (_egvBaseFilterSlot === 'all') {
        bases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)
            || b.minLevel - a.minLevel);
    } else {
        bases.sort((a, b) => b.minLevel - a.minLevel);
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
<div class="egv-base-wrap">
    <div class="egv-base-controls">
        <label class="egv-base-control-label">
            <span>${t('eg_vendor_filter_type')}</span>
            <select id="egv-base-filter-select" onchange="_egvSetBaseFilter(this.value)">${_egvBuildBaseFilterOptionsHTML()}</select>
        </label>
    </div>
    <div class="egv-base-list" id="egv-base-list">${_egvBuildBaseListHTML()}</div>
</div>`;
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
        const item = _egvBuildBaseItemFromBase(base);
        item.id = `${base.id}_${Date.now()}`;
        // Free starter gear sells for nothing — prevents a buy-free/sell-shard loop.
        if (price === 0) item.noSellValue = true;

        if (typeof _egAddItemToStash === 'function') {
            _egAddItemToStash(item);
            return true;
        }
        // fallback for load order
        for (let r = 0; r < _egInventory.length; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                if (!_egInventory[r][c]) {
                    _egInventory[r][c] = item;
                    if (typeof _egRenderInventoryCell === 'function') _egRenderInventoryCell(r, c);
                    return true;
                }
            }
        }
        // still no slot -> expand
        if (typeof _egEnsureInvRows === 'function') _egEnsureInvRows(_egInventory.length + 1);
        else _egInventory.push(Array(EG_INV_COLS).fill(null));
        _egInventory[_egInventory.length - 1][0] = item;
        if (typeof _egRenderInventoryCell === 'function') _egRenderInventoryCell(_egInventory.length - 1, 0);
        return true;
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
            width: 100%; display: flex; flex-direction: column; align-items: center;
            max-height: 58vh; overflow-y: auto; padding-right: 4px;
        }
        .egv-base-wrap {
            display: flex; flex-direction: column; width: 100%; max-height: 58vh;
        }
        .egv-base-wrap .egv-base-list {
            overflow-y: auto; flex: 1; min-height: 0; padding-right: 4px;
        }
        .egv-tab-content:has(.egv-base-wrap) {
            overflow: hidden;
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
            position: sticky; top: 0; z-index: 5;
            background: rgba(20, 15, 5, 0.92);
            padding: 8px 0 10px 0;
            margin-bottom: 10px;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(200,168,75,0.18);
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
        .egv-base-list::-webkit-scrollbar { width: 10px; }
        .egv-base-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .egv-base-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .egv-base-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
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