//------------------------------------------------------------------------
//-------------------ENDGAME CRAFTING COSTS-------------------------------
//------------------------------------------------------------------------
// Single source of truth for crafting-bench costs: which orbs a family costs,
// and how many at each craft tier. Tier 1 is the strongest craft and costs
// the most, so the orbs get rarer as the tier number drops. Shards are not
// valid crafting currencies.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
// CONSTANTS & STATE
//------------------------------------------------------------------------

// Per-orb tier ladder: for each crafting orb, the orbs it costs at craft
// tier 5 (cheapest) down to tier 1 (most expensive). Each tier holds a list
// so the top end can mix orbs, e.g. 1x Exalted plus 2x Chaos.

export const EG_CRAFT_TIER_LADDER = {
    orb_transmutation: {
        5: [{ id: 'orb_transmutation', count: 4 }],
        4: [{ id: 'orb_augmentation', count: 3 }],
        3: [{ id: 'orb_alchemy', count: 2 }],
        2: [{ id: 'orb_regal', count: 1 }, { id: 'orb_alchemy', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_regal', count: 2 }],
    },
    orb_augmentation: {
        5: [{ id: 'orb_augmentation', count: 4 }],
        4: [{ id: 'orb_transmutation', count: 3 }],
        3: [{ id: 'orb_alteration', count: 2 }],
        2: [{ id: 'orb_chaos', count: 1 }, { id: 'orb_regal', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_chaos', count: 2 }],
    },
    orb_alteration: {
        5: [{ id: 'orb_alteration', count: 4 }],
        4: [{ id: 'orb_augmentation', count: 3 }],
        3: [{ id: 'orb_alchemy', count: 2 }],
        2: [{ id: 'orb_chaos', count: 1 }, { id: 'orb_regal', count: 1 }],
        1: [{ id: 'orb_divine', count: 1 }, { id: 'orb_chaos', count: 2 }],
    },
    orb_alchemy: {
        5: [{ id: 'orb_alchemy', count: 3 }],
        4: [{ id: 'orb_alchemy', count: 2 }],
        3: [{ id: 'orb_chaos', count: 2 }],
        2: [{ id: 'orb_divine', count: 1 }, { id: 'orb_chaos', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_chaos', count: 2 }],
    },
    orb_regal: {
        5: [{ id: 'orb_regal', count: 2 }],
        4: [{ id: 'orb_alchemy', count: 2 }],
        3: [{ id: 'orb_chaos', count: 1 }, { id: 'orb_alchemy', count: 1 }],
        2: [{ id: 'orb_divine', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_divine', count: 1 }],
    },
    orb_chaos: {
        5: [{ id: 'orb_alchemy', count: 2 }],
        4: [{ id: 'orb_chaos', count: 1 }],
        3: [{ id: 'orb_chaos', count: 2 }],
        2: [{ id: 'orb_divine', count: 1 }, { id: 'orb_chaos', count: 1 }],
        1: [{ id: 'orb_divine', count: 2 }],
    },
    orb_divine: {
        5: [{ id: 'orb_chaos', count: 2 }],
        4: [{ id: 'orb_chaos', count: 1 }, { id: 'orb_regal', count: 1 }],
        3: [{ id: 'orb_divine', count: 1 }],
        2: [{ id: 'orb_divine', count: 1 }, { id: 'orb_chaos', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_divine', count: 1 }],
    },
    orb_exalted: {
        5: [{ id: 'orb_regal', count: 2 }],
        4: [{ id: 'orb_chaos', count: 2 }],
        3: [{ id: 'orb_exalted', count: 1 }],
        2: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_chaos', count: 1 }],
        1: [{ id: 'orb_ancient', count: 1 }, { id: 'orb_exalted', count: 1 }],
    },
    orb_ascension: {
        5: [{ id: 'orb_alchemy', count: 2 }],
        4: [{ id: 'orb_ascension', count: 1 }],
        3: [{ id: 'orb_ascension', count: 1 }, { id: 'orb_chaos', count: 1 }],
        2: [{ id: 'orb_exalted', count: 1 }],
        1: [{ id: 'orb_ancient', count: 1 }],
    },
    orb_elevation: {
        5: [{ id: 'orb_regal', count: 2 }],
        4: [{ id: 'orb_elevation', count: 1 }],
        3: [{ id: 'orb_elevation', count: 1 }, { id: 'orb_chaos', count: 1 }],
        2: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_elevation', count: 1 }],
        1: [{ id: 'orb_ancient', count: 1 }, { id: 'orb_divine', count: 1 }],
    },
    orb_bloom: {
        5: [{ id: 'orb_bloom', count: 3 }],
        4: [{ id: 'orb_bloom', count: 2 }],
        3: [{ id: 'orb_chaos', count: 1 }, { id: 'orb_bloom', count: 1 }],
        2: [{ id: 'orb_divine', count: 1 }],
        1: [{ id: 'orb_exalted', count: 1 }, { id: 'orb_bloom', count: 1 }],
    },
    orb_scouring: {
        5: [{ id: 'orb_scouring', count: 3 }],
        4: [{ id: 'orb_scouring', count: 2 }],
        3: [{ id: 'orb_chaos', count: 1 }],
        2: [{ id: 'orb_annulment', count: 1 }],
        1: [{ id: 'orb_annulment', count: 1 }, { id: 'orb_chaos', count: 2 }],
    },
    orb_ancient: {
        5: [{ id: 'orb_regal', count: 2 }],
        4: [{ id: 'orb_chaos', count: 2 }],
        3: [{ id: 'orb_exalted', count: 1 }],
        2: [{ id: 'orb_ancient', count: 1 }, { id: 'orb_chaos', count: 1 }],
        1: [{ id: 'orb_ancient', count: 1 }, { id: 'orb_divine', count: 1 }],
    },
};

// Which crafting orb each mod family is made with. Families missing here
// fall back to orb_alchemy.
export const EG_CRAFT_FAMILY_CURRENCIES = {
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
    healing_power: 'orb_ascension', inc_healing_power: 'orb_ascension',
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

//------------------------------------------------------------------------
// COST LOOKUP
//------------------------------------------------------------------------

// Returns the orbs needed to craft `familyId` at `tier` as a fresh list, so
// callers can change it without touching the ladder table.
export function _egCraftingBenchCostFor(familyId, tier) {
    const baseId = EG_CRAFT_FAMILY_CURRENCIES[familyId] || 'orb_alchemy';
    const ladder = EG_CRAFT_TIER_LADDER[baseId] || EG_CRAFT_TIER_LADDER['orb_alchemy'];
    const entry = ladder[tier] || ladder[5] || [{ id: baseId, count: 2 }];
    // Return a shallow copy so callers can mutate without affecting the table.
    return entry.map(cost => ({ id: cost.id, count: cost.count }));
}

// Legacy flat view of the ladder: the largest per-tier orb total across all
// families. Kept for older tooling; the bench itself uses the ladder above.
export const EG_CRAFT_TIER_COSTS = (() => {
    const out = {};
    for (let tier = 1; tier <= 5; tier++) {
        let max = 0;
        for (const ladder of Object.values(EG_CRAFT_TIER_LADDER)) {
            const entry = ladder[tier];
            if (!entry) continue;
            const sum = entry.reduce((s, c) => s + c.count, 0);
            if (sum > max) max = sum;
        }
        out[tier] = max || 2;
    }
    return out;
})();
