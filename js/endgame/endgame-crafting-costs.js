//------------------------------------------------------------------------
//-------------------ENDGAME CRAFTING COSTS-------------------------------
//------------------------------------------------------------------------
// Single source of truth for crafting-bench costs. Tier 1 is strongest and
// therefore costs the most. Costs intentionally use every equipment orb;
// shards are not valid crafting currencies.
//------------------------------------------------------------------------

const EG_CRAFT_TIER_COSTS = {
    1: 10,
    2: 7,
    3: 5,
    4: 3,
    5: 2,
};

const EG_CRAFT_FAMILY_CURRENCIES = {
    // Life, mana and recovery
    flat_health: 'orb_alchemy', inc_health: 'orb_alchemy', heart_heal: 'orb_alchemy',
    inc_heart_heal: 'orb_alchemy', flat_mana: 'orb_alteration', mana_heal: 'orb_alteration',
    inc_mana_heal: 'orb_alteration', mana_regen: 'orb_alteration', life_regen: 'orb_alchemy',
    time_added: 'orb_augmentation',

    // Defences and attributes
    flat_armour: 'orb_transmutation', inc_armour: 'orb_transmutation',
    flat_evasion: 'orb_augmentation', inc_evasion: 'orb_augmentation',
    flat_absorption: 'orb_regal', inc_absorption: 'orb_regal',
    hybrid_life_armour: 'orb_alchemy', hybrid_mana_armour: 'orb_alteration',
    hybrid_life_evasion: 'orb_augmentation', hybrid_mana_evasion: 'orb_augmentation',
    hybrid_life_absorption: 'orb_regal', hybrid_mana_absorption: 'orb_regal',
    hybrid_armour_evasion: 'orb_transmutation', hybrid_armour_absorption: 'orb_regal',
    hybrid_evasion_absorption: 'orb_regal', hybrid_evasion_armour: 'orb_transmutation',
    strength: 'orb_transmutation', agility: 'orb_augmentation', intelligence: 'orb_alteration',
    accuracy: 'orb_augmentation',

    // Resistances and puzzle utility
    fire_resist: 'orb_chaos', cold_resist: 'orb_chaos', lightning_resist: 'orb_chaos',
    shadow_resist: 'orb_chaos', arcane_resistance: 'orb_divine',
    mistake_count: 'orb_scouring', mistake_not_count: 'orb_scouring', focus: 'orb_scouring',
    chance_for_new_question: 'orb_scouring', reveal_hint: 'orb_scouring',

    // Damage and offensive effects
    flat_physical_damage: 'orb_exalted', inc_physical_damage: 'orb_exalted',
    spell_damage: 'orb_ascension', inc_spell_damage: 'orb_ascension',
    fire_damage: 'orb_chaos', cold_damage: 'orb_chaos', lightning_damage: 'orb_chaos',
    shadow_damage: 'orb_chaos', crit_chance: 'orb_divine', crit_multiplier: 'orb_divine',
    attack_speed: 'orb_regal', pierce: 'orb_elevation', cleave: 'orb_elevation',
    splash_damage: 'orb_elevation', chain: 'orb_elevation', channel: 'orb_elevation',
    multishot: 'orb_elevation', mana_to_damage: 'orb_ascension', arcane_surge: 'orb_ascension',
    overkill: 'orb_exalted', pushback: 'orb_exalted', stagger: 'orb_exalted',

    // Chance, ailment and effect modifiers
    chance_to_ignite: 'orb_bloom', chance_to_freeze: 'orb_bloom', chance_to_shock: 'orb_bloom',
    chance_to_blind: 'orb_bloom', chance_to_convert: 'orb_bloom', ailment_duration: 'orb_bloom',
    ailment_effect: 'orb_bloom', precision_damage: 'orb_exalted', precision_regen: 'orb_exalted',
    snipe: 'orb_ancient',

    // On-effect, block and movement utility
    life_leech: 'orb_chaos', life_on_kill: 'orb_chaos', mana_on_kill: 'orb_alteration',
    mana_on_mistake: 'orb_scouring', absorption_on_kill: 'orb_regal',
    absorption_regen_rate: 'orb_regal', faster_absorption_regen_start: 'orb_regal',
    block_chance: 'orb_transmutation', spell_block_chance: 'orb_transmutation',
    block_recovery: 'orb_transmutation', dodge: 'orb_augmentation', spell_dodge: 'orb_augmentation',
    preemptive_dodge: 'orb_augmentation', movement_speed: 'orb_elevation',

    // Miscellaneous named mechanics
    echo: 'orb_divine', fate: 'orb_divine', first_step: 'orb_ancient', grounded: 'orb_scouring',
    warding: 'orb_scouring', parry: 'orb_transmutation', deflect: 'orb_transmutation',
    deflect_damage: 'orb_exalted', shield_bash: 'orb_exalted',
};

function _egCraftingBenchCostFor(familyId, tier) {
    const currencyId = EG_CRAFT_FAMILY_CURRENCIES[familyId] || 'orb_alchemy';
    const count = EG_CRAFT_TIER_COSTS[tier] || EG_CRAFT_TIER_COSTS[5];
    return [{ id: currencyId, count }];
}
