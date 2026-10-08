import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { save, STATE } from '../state.js';
import { t } from '../translation/translations.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { EG_ESSENCE_DEFS } from './loot-essences-defs.js';
import { egAddEssence } from './loot-essences-stash.js';
import { egAddCurrency } from '../endgame/endgame-hub-drag-and-drop.js';
import { egGetGold, egSpendGold } from './loot-gold.js';
import { _egvBuildCardHTML, _egvIconHTML, _egvPurchase, _egvRefreshTabContent } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

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

// Prices per essence id (gold). Every per-modifier essence has a distinct
// price: baseline 320, powerful families cost significantly more.
const EG_VENDOR_ESSENCE_PRICES = {
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
    essence_arcane_resistance: 380,
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
const EG_VENDOR_ESSENCE_DEFAULT_PRICE = 350;

// Puzzle item prices by rarity (gold) - rebalanced to be more expensive
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

//------------------------------------------------------------------------
//-------------------CURRENCY TAB-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Returns the gold price for a currency orb id.
function _egvCurrencyPrice(id) {
    return EG_VENDOR_CURRENCY_PRICES[id] != null ? EG_VENDOR_CURRENCY_PRICES[id] : EG_VENDOR_CURRENCY_DEFAULT_PRICE;
}

// Builds purchase cards for every known currency orb.
export function _egvBuildCurrencyTabHTML() {
    const defs = Object.values(EG_CURRENCY_DEFS);
    const cards = defs.map(def => _egvBuildCardHTML({
        icon: _egvIconHTML(def.id, def.icon),
        title: def.name,
        desc: def.description,
        price: _egvCurrencyPrice(def.id),
        buyCall: `_egvBuyCurrency('${def.id}')`,
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

// Buys one currency orb and adds it to the hub stash.
export function _egvBuyCurrency(id) {
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

    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _egvRefreshTabContent();
}

//------------------------------------------------------------------------
//-------------------ESSENCES TAB-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Returns the gold price for an essence id.
function _egvEssencePrice(id) {
    return EG_VENDOR_ESSENCE_PRICES[id] != null ? EG_VENDOR_ESSENCE_PRICES[id] : EG_VENDOR_ESSENCE_DEFAULT_PRICE;
}

// Builds purchase cards for every known essence.
export function _egvBuildEssencesTabHTML() {
    const defs = Object.values(EG_ESSENCE_DEFS);
    const cards = defs.map(def => _egvBuildCardHTML({
        icon: _egvIconHTML(def.id, def.icon),
        title: def.name,
        desc: def.description,
        price: _egvEssencePrice(def.id),
        buyCall: `_egvBuyEssence('${def.id}')`,
        extraClass: 'egv-essence-card',
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

// Buys one essence and adds it to the hub stash.
export function _egvBuyEssence(id) {
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

    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
    _egvRefreshTabContent();
}

//------------------------------------------------------------------------
//-------------------PUZZLE ITEMS TAB--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

//------------------------------------------------------------------------

// Returns the gold price for a puzzle-item rarity.
function _egvPuzzleItemPrice(rarity) {
    return EG_VENDOR_ITEM_RARITY_PRICES[rarity] != null ? EG_VENDOR_ITEM_RARITY_PRICES[rarity] : 100;
}

// Builds purchase cards for every regular puzzle item.
export function _egvBuildItemsTabHTML() {
    const cards = Object.values(globalThis.ITEM_DEFS).map(def => _egvBuildCardHTML({
        icon: _egvIconHTML(def.id, def.icon),
        title: globalThis.itemName(def),
        subtitle: def.rarity,
        desc: globalThis.itemDesc(def),
        price: _egvPuzzleItemPrice(def.rarity),
        buyCall: `_egvBuyPuzzleItem('${def.id}')`,
    })).join('');
    return `<div class="egv-cards">${cards}</div>`;
}

// Buys a regular puzzle item straight into the persistent main inventory.
export function _egvBuyPuzzleItem(defId) {
    const def = globalThis.ITEM_DEFS[defId];
    if (!def) return;
    const price = _egvPuzzleItemPrice(def.rarity);

    if (!egSpendGold(price)) {
        globalThis.showToast(t('eg_vendor_no_gold').replace('{n}', price - egGetGold()));
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
    _egvRefreshTabContent();
}
