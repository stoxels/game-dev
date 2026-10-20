import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { save, STATE } from '../state.js';
import { t } from '../translation/translations.js';
import { CURRENCY_DEFS } from './loot-currency.js';
import { ESSENCE_DEFS } from './loot-essences-defs.js';
import { _essenceCompatibleSlotTypes } from './loot-essences.js';
import { ITEM_GROUPS } from '../puzzle-items/item-definitions.js';
import { addEssence } from './loot-essences-stash.js';
import { addCurrency } from '../hub/hub-drag-and-drop.js';
import { getGold, spendGold } from './loot-gold.js';
import { _vendorBuildCardHTML, _vendorBuildCharmFilterBarHTML, _vendorBuildChipBarHTML, _vendorFilterCharmIds, _vendorGetEssenceFilter, _vendorGetItemFilter, _vendorIconHTML, _vendorPurchase, _vendorRefreshTabContent } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Prices per currency orb id (gold). Missing ids fall back to the default.
// Rebalanced: common crafting orbs are affordable, rare/epic orbs are
// deliberately expensive so they remain chase items and cannot be spammed.
const VENDOR_CURRENCY_PRICES = {
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
const VENDOR_CURRENCY_DEFAULT_PRICE = 320;

// Prices per essence id (gold). Every per-modifier essence has a distinct
// price: baseline 320, powerful families cost significantly more.
const VENDOR_ESSENCE_PRICES = {
    // Recovery / absorption - 400-440
    essence_absorption_on_kill: 440,
    essence_absorption_regen_rate: 440,
    // Cheap / puzzle-utility tier - ~260-320
    essence_time_added: 260,
    essence_mistake_count: 260,
    essence_mistake_not_count: 280,
    essence_focus: 280,
    essence_reveal_hint: 280,
    essence_chance_for_new_question: 300,
    essence_fate: 320,
    essence_echo: 320,
    // Resistances - 340-380
    essence_fire_resist: 360,
    essence_cold_resist: 360,
    essence_lightning_resist: 360,
    essence_shadow_resist: 380,
    // Flat defenses - 380-450
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
    // Elemental / flat damage - 500-620
    essence_fire_damage: 520,
    essence_cold_damage: 520,
    essence_lightning_damage: 520,
    essence_shadow_damage: 520,
    essence_spell_damage: 720,
    essence_inc_spell_damage: 720,
    // Support counterpart of the two above - priced alongside them, since a
    // healing build wants it exactly as much as a damage build wants spell power.
    essence_healing_power: 700,
    essence_inc_healing_power: 700,
    essence_precision_damage: 580,
    // Life / mana / hybrid life+mana - 550-750 (very desirable)
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
    // Attributes - 620
    essence_strength: 620,
    essence_agility: 620,
    essence_intelligence: 620,
    // Offensive power - most expensive
    essence_flat_physical_damage: 820,
    essence_inc_physical_damage: 820,
    essence_crit_chance: 900,
    essence_crit_multiplier: 900,
    essence_attack_speed: 850,
    essence_arcane_surge: 680,
    essence_mana_to_damage: 700,
    essence_precision_regen: 500,
    // Weapon mechanics - mid-high
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
    // Defensive mechanics - 500-620
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
    // Status / ailment chance - 480-560
    essence_chance_to_ignite: 520,
    essence_chance_to_freeze: 520,
    essence_chance_to_shock: 520,
    essence_chance_to_blind: 480,
    essence_chance_to_convert: 500,
    // Recovery / sustain - 440-520
    essence_life_leech: 540,
    essence_life_on_kill: 440,
    essence_mana_on_kill: 440,
    essence_mana_on_mistake: 440,
    essence_faster_absorption_regen_start: 400,
    essence_heart_heal: 400,
    essence_inc_heart_heal: 420,
    essence_mana_heal: 400,
    essence_inc_mana_heal: 420,
    // Movement / utility
    essence_movement_speed: 540,
};
const VENDOR_ESSENCE_DEFAULT_PRICE = 350;

// Puzzle item prices by rarity (gold) - rebalanced to be more expensive
// across the board so puzzle items remain meaningful purchases.
const VENDOR_ITEM_RARITY_PRICES = {
    common: 55,
    uncommon: 130,
    rare: 280,
    epic: 600,
    legendary: 1300,
    artifact: 2800,
    cursed: 1950,
};

//------------------------------------------------------------------------
//-------------------CURRENCY TAB-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Returns the gold price for a currency orb id.
function _vendorCurrencyPrice(id) {
    return VENDOR_CURRENCY_PRICES[id] != null ? VENDOR_CURRENCY_PRICES[id] : VENDOR_CURRENCY_DEFAULT_PRICE;
}

// Builds purchase cards for every known currency orb.
export function _vendorBuildCurrencyTabHTML() {
    const defs = Object.values(CURRENCY_DEFS);
    const cards = defs.map(def => _vendorBuildCardHTML({
        icon: _vendorIconHTML(def.id, def.icon),
        title: def.name,
        desc: def.description,
        price: _vendorCurrencyPrice(def.id),
        buyCall: `_vendorBuyCurrency('${def.id}')`,
    })).join('');
    return `<div class="sx-vendor-cards">${cards}</div>`;
}

// Buys one currency orb and adds it to the hub stash.
export function _vendorBuyCurrency(id) {
    const def = CURRENCY_DEFS[id];
    if (!def) return;
    const price = _vendorCurrencyPrice(id);
    if (!_vendorPurchase(price, () => addCurrency(id, 1, {
        name: def.name,
        icon: def.icon,
        rarity: 'currency',
        category: 'currency',
        description: def.description,
    }))) return;

    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _vendorRefreshTabContent();
}

//------------------------------------------------------------------------
//-------------------ESSENCES TAB-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Returns the gold price for an essence id.
function _vendorEssencePrice(id) {
    return VENDOR_ESSENCE_PRICES[id] != null ? VENDOR_ESSENCE_PRICES[id] : VENDOR_ESSENCE_DEFAULT_PRICE;
}

// Display order of the equipment base types in the essence filter.
const VENDOR_SLOT_ORDER = ['weapon', 'ranged', 'arcane', 'shield', 'head', 'shoulders', 'chest', 'gloves', 'bracers',
    'belt', 'pants', 'boots', 'cloak', 'amulet', 'ring', 'earring', 'talisman'];

// Cache of the base types per essence id.
const _vendorEssenceSlotCache = {};

// Equipment base types an essence can be applied to.
function _vendorEssenceSlots(def) {
    if (!_vendorEssenceSlotCache[def.id]) {
        let slots = [];
        try { slots = _essenceCompatibleSlotTypes(def.guaranteedFamily) || []; } catch (e) { slots = []; }
        _vendorEssenceSlotCache[def.id] = slots;
    }
    return _vendorEssenceSlotCache[def.id];
}

// Label for a base type (slot type), falling back to the raw id.
function _vendorSlotLabel(slot) {
    const key = 'eg_slot_' + slot;
    const txt = t(key);
    return txt && txt !== key ? txt : slot;
}

// Builds purchase cards for the essences. Each card is compact: the name and
// the base types it works on (the long how-to text lives in the tab hint).
// The all-tabs search passes ignoreFilter so a query still covers every essence.
export function _vendorBuildEssencesTabHTML(ignoreFilter) {
    const all = Object.values(ESSENCE_DEFS);
    const present = new Set();
    all.forEach(def => _vendorEssenceSlots(def).forEach(s => present.add(s)));
    const order = VENDOR_SLOT_ORDER.filter(s => present.has(s))
        .concat([...present].filter(s => VENDOR_SLOT_ORDER.indexOf(s) === -1));
    const filter = ignoreFilter ? 'all' : _vendorGetEssenceFilter();
    const defs = filter === 'all' ? all : all.filter(def => _vendorEssenceSlots(def).includes(filter));
    const worksOn = t('eg_vendor_essence_works_on');
    const cards = defs.map(def => {
        const slots = _vendorEssenceSlots(def);
        const list = slots.length >= order.length - 1 ? t('eg_vendor_essence_all_gear')
            : slots.map(_vendorSlotLabel).join(', ');
        return _vendorBuildCardHTML({
            icon: _vendorIconHTML(def.id, def.icon),
            title: def.name,
            desc: `${worksOn} ${list}`,
            price: _vendorEssencePrice(def.id),
            buyCall: `_vendorBuyEssence('${def.id}')`,
            extraClass: 'sx-vendor-essence-card',
        });
    }).join('');
    const bar = ignoreFilter ? '' : _vendorBuildChipBarHTML(order.map(s => ({ id: s, label: _vendorSlotLabel(s) })), filter, '_vendorSetEssenceFilter');
    return `${bar}<div class="sx-vendor-cards sx-vendor-cards-essence">${cards}</div>`;
}

// Buys one essence and adds it to the hub stash.
export function _vendorBuyEssence(id) {
    const def = ESSENCE_DEFS[id];
    if (!def) return;
    const price = _vendorEssencePrice(id);
    if (!_vendorPurchase(price, () => addEssence(id, 1, {
        name: def.name,
        icon: def.icon,
        rarity: 'essence',
        category: 'essence',
        description: def.description,
    }))) return;

    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _vendorRefreshTabContent();
}

//------------------------------------------------------------------------
//-------------------PUZZLE ITEMS TAB--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

//------------------------------------------------------------------------

// Returns the gold price for a puzzle-item rarity.
function _vendorPuzzleItemPrice(rarity) {
    return VENDOR_ITEM_RARITY_PRICES[rarity] != null ? VENDOR_ITEM_RARITY_PRICES[rarity] : 100;
}

// Builds purchase cards for the regular puzzle items, optionally narrowed to
// one category (Reveal, Mark, Time...). The all-tabs search passes
// ignoreFilter so a query still covers every item.
export function _vendorBuildItemsTabHTML(ignoreFilter) {
    const filter = ignoreFilter ? 'all' : _vendorGetItemFilter();
    const group = ITEM_GROUPS.find(g => g.label === filter);
    const all = Object.values(globalThis.ITEM_DEFS);
    const defs = group ? all.filter(def => group.slots.includes(def.id)) : all;
    const cards = defs.map(def => _vendorBuildCardHTML({
        icon: _vendorIconHTML(def.id, def.icon),
        title: globalThis.itemName(def),
        subtitle: def.rarity,
        desc: globalThis.itemDesc(def),
        price: _vendorPuzzleItemPrice(def.rarity),
        buyCall: `_vendorBuyPuzzleItem('${def.id}')`,
    })).join('');
    const bar = ignoreFilter ? '' : _vendorBuildChipBarHTML(ITEM_GROUPS.map(g => ({ id: g.label, label: t(g.labelKey) })), filter, '_vendorSetItemFilter');
    return `${bar}<div class="sx-vendor-cards">${cards}</div>`;
}

// Buys a regular puzzle item straight into the persistent main inventory.
export function _vendorBuyPuzzleItem(defId) {
    const def = globalThis.ITEM_DEFS[defId];
    if (!def) return;
    const price = _vendorPuzzleItemPrice(def.rarity);

    if (!spendGold(price)) {
        globalThis.showToast(t('eg_vendor_no_gold').replace('{n}', price - getGold()));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId,
    });
    save();
    globalThis.buildInventoryPanel();

    Audio_Manager.playSFX('player_equip_pickup');
    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', globalThis.itemName(def)));
    try { trackAchStat('egVendorPurchases', 1); } catch (e) { /* never block a purchase */ }
    _vendorRefreshTabContent();
}

//------------------------------------------------------------------------
//-------------------SPELL CHARMS TAB---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The Cartographer sells every rank (1-10). A rank opens up at the player
// level that can slot it (mirrors CHARM_RANK_MIN_PLAYER_LEVEL in
// skill-charms.js for ranks 6+), so the shop never runs ahead of the road.
// Ranks 6-10 are the atlas ranks and carry atlas-sized prices (gold).
const VENDOR_CHARM_RANK_PRICES = [60, 250, 700, 1800, 4200, 9000, 20000, 44000, 95000, 200000];
// Minimum player level per rank (index = rank - 1).
const VENDOR_CHARM_RANK_MIN_LEVEL = [1, 10, 22, 35, 50, 68, 74, 79, 84, 89];

// Live player level for the rank gates (saved level when the HUD hook is absent).
function _vendorPlayerLevel() {
    try {
        const lv = Math.round(Number(globalThis._getPlayerLevel && globalThis._getPlayerLevel()) || 0);
        if (lv >= 1) return lv;
    } catch (e) { /* fall back to the saved level */ }
    return Math.max(1, Math.round(Number(STATE && STATE.playerLevel) || 1));
}

// One row per universal spell (the arsenal charms drop for), in registry order.
function _vendorCharmSkillIds() {
    const defs = Array.isArray(globalThis.UNIVERSAL_SPELL_DEFS) ? globalThis.UNIVERSAL_SPELL_DEFS : [];
    return defs.map(d => d && d.id).filter(id => id && globalThis.getSkillDef(id));
}

// True when the charm for this skill + rank is already in the inventory.
function _vendorCharmOwned(skillId, rank) {
    return !!globalThis.getCharmByKey(globalThis.charmKeyFor(skillId, rank));
}

// Builds one card per spell with a buy button for every sold rank. The
// all-tabs search passes ignoreFilter so a query still covers every spell.
export function _vendorBuildCharmsTabHTML(ignoreFilter) {
    const lv = _vendorPlayerLevel();
    const gold = getGold();
    const ids = ignoreFilter ? _vendorCharmSkillIds() : _vendorFilterCharmIds(_vendorCharmSkillIds());
    const cards = ids.map(id => {
        const def = globalThis.getSkillDef(id);
        const art = globalThis.getCharmArtForSkill(id, 1);
        const icon = art ? `<img class="sx-art-img" src="${art}" alt="" draggable="false">` : (def.icon || '💫');
        const ranks = VENDOR_CHARM_RANK_PRICES.map((price, i) => {
            const rank = i + 1;
            const tip = ` onmouseenter="handleSkillTipRank(event, '${id}', ${rank})" onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()"`;
            if (_vendorCharmOwned(id, rank)) {
                return `<span class="sx-vendor-charm-rank sx-vendor-charm-owned"${tip}>R${rank}<small>${t('eg_vendor_charm_owned')}</small></span>`;
            }
            const need = VENDOR_CHARM_RANK_MIN_LEVEL[i];
            if (lv < need) {
                return `<span class="sx-vendor-charm-rank sx-vendor-charm-locked"${tip}>R${rank}<small>${t('eg_vendor_charm_locked').replace('{n}', need)}</small></span>`;
            }
            const cls = gold < price ? ' sx-vendor-charm-short' : '';
            return `<button class="sx-vendor-charm-rank sx-vendor-charm-buy${cls}"${tip} onclick="_vendorBuyCharm('${id}', ${rank})">R${rank}<small>🪙 ${price.toLocaleString()}</small></button>`;
        }).join('');
        return `
<div class="sx-vendor-card sx-vendor-charm-card">
    <div class="sx-vendor-card-top" onmouseenter="handleSkillTipRank(event, '${id}', 1)" onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()">
        <div class="sx-vendor-card-icon">${icon}</div>
        <div class="sx-vendor-card-info"><div class="sx-vendor-card-name">${globalThis.getSkillName(id)}</div></div>
    </div>
    <div class="sx-vendor-charm-ranks">${ranks}</div>
</div>`;
    }).join('');
    const bar = ignoreFilter ? '' : _vendorBuildCharmFilterBarHTML();
    return `${bar}<div class="sx-vendor-cards">${cards}</div>`;
}

// Buys one rank's charm; it goes straight into the spell book.
export function _vendorBuyCharm(skillId, rank) {
    rank = Math.round(Number(rank));
    const i = rank - 1;
    const price = VENDOR_CHARM_RANK_PRICES[i];
    if (!(price > 0) || !globalThis.getSkillDef(skillId)) return;
    if (_vendorCharmOwned(skillId, rank) || _vendorPlayerLevel() < VENDOR_CHARM_RANK_MIN_LEVEL[i]) return;

    if (!spendGold(price)) {
        globalThis.showToast(t('eg_vendor_no_gold').replace('{n}', price - getGold()));
        Audio_Manager.playSFX('ui_error', 'player_equip_not_pickup');
        return;
    }
    globalThis.grantCharm(skillId, rank);
    Audio_Manager.playSFX('gold_spend');
    globalThis.showToast(t('eg_vendor_bought_charm')
        .replace('{name}', `${globalThis.getSkillName(skillId)} · ${t('skill_tip_rank')} ${rank}`));
    try { trackAchStat('egVendorPurchases', 1); } catch (e) { /* never block a purchase */ }
    _vendorRefreshTabContent();
}
