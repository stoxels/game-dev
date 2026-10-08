//----------------------------------------------------------------------
//---------------------------MAP MOD REWARDS----------------------------
//----------------------------------------------------------------------

// Every mod family grants run-wide reward bonuses on top of its danger:
//   xp       - % more experience from kills
//   quantity - % higher chance for loot/currency/item drops
//   rarity   - % weight boost for non-common rarities when items drop
// Values are indexed by (tier - 1); T1 = strongest roll. More dangerous
// maps are therefore always strictly more rewarding, PoE-style.

export const EG_MAP_MOD_REWARDS = {
    // ── Monster-strengthening ────────────────────────────────────
    map_monster_life:        { xp: [20, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_damage:      { xp: [20, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_speed:       { xp: [18, 12, 7, 4],  quantity: [14, 9, 5, 3], rarity: [9, 7, 4, 1] },
    map_extra_monsters:      { xp: [27, 19, 12],    quantity: [22, 15, 9],   rarity: [15, 9, 5] },
    map_monster_resistances: { xp: [19, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_crit:         { xp: [27, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 12, 7] },
    map_monster_avoid_ailments: { xp: [20, 14, 8], quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_monster_regen:        { xp: [24, 16, 9],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_monster_explosions:   { xp: [30, 20, 14],  quantity: [23, 16, 9],   rarity: [19, 12, 5] },
    map_monster_ailments:     { xp: [23, 15, 9],   quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_monster_puzzle_aggro: { xp: [22, 15, 8],   quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_reflect_melee:        { xp: [31, 22, 14],  quantity: [24, 16, 11],   rarity: [20, 14, 7] },
    map_boss_chance:          { xp: [27, 19, 11],   quantity: [22, 15, 8],   rarity: [20, 14, 7] },
    map_boss_enrage:          { xp: [26, 18, 11],   quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_armour_pierce:        { xp: [23, 16, 9],   quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_monster_ambush:       { xp: [24, 16, 11],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_monster_ethereal:     { xp: [22, 15, 9],   quantity: [16, 11, 7],    rarity: [12, 8, 4] },
    map_monster_spellproof:   { xp: [24, 17, 10],  quantity: [18, 12, 7],    rarity: [14, 9, 5] },
    map_boss_life:            { xp: [26, 18, 11],   quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_monster_snowball:     { xp: [27, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 11, 5] },
    map_monster_second_wind:  { xp: [28, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 11, 5] },
    map_monster_desperation:  { xp: [20, 14, 8],   quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_hazard_firewall:      { xp: [32, 23, 15],  quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_cyclone:       { xp: [31, 22, 14],  quantity: [24, 16, 11],   rarity: [20, 14, 7] },
    map_hazard_delirium:      { xp: [35, 24, 16],  quantity: [28, 19, 12],   rarity: [24, 16, 9] },

    // ── Player-weakening ─────────────────────────────────────────
    map_player_life:         { xp: [22, 15, 8, 4], quantity: [16, 12, 7, 3], rarity: [12, 8, 4, 1] },
    map_player_damage:       { xp: [22, 15, 8, 4], quantity: [16, 12, 7, 3], rarity: [12, 8, 4, 1] },
    map_player_defences:     { xp: [19, 14, 7, 4], quantity: [15, 9, 5, 3], rarity: [11, 7, 4, 1] },
    map_melee_damage:        { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_projectile_damage:   { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_fewer_mistakes:      { xp: [23, 15, 8],    quantity: [19, 12, 7],    rarity: [15, 8, 4] },
    map_less_time:           { xp: [20, 14, 7],    quantity: [16, 11, 5],    rarity: [12, 7, 4] },
    map_item_reveal_damage:  { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_ability_reveal_damage: { xp: [18, 12, 7, 3], quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_spell_damage:        { xp: [18, 12, 7],     quantity: [14, 9, 5],    rarity: [9, 5, 3] },
    map_less_time_gained:    { xp: [18, 12, 7],     quantity: [14, 9, 5],    rarity: [9, 5, 3] },
    map_mana_penalty:        { xp: [18, 11, 5],     quantity: [14, 8, 4],    rarity: [9, 5, 3] },
    map_blood_magic:         { xp: [22],           quantity: [18],          rarity: [12] },
    map_elem_weakness:       { xp: [27, 19, 12],    quantity: [22, 15, 9],   rarity: [18, 12, 7] },
    map_temporal_chains:     { xp: [30, 20, 14],   quantity: [24, 16, 9],   rarity: [20, 14, 7] },
    map_vulnerability:       { xp: [28, 20, 12],    quantity: [23, 16, 9],   rarity: [19, 12, 7] },
    map_no_regeneration:     { xp: [24],           quantity: [19],          rarity: [15] },
    map_reduced_recovery:    { xp: [20, 14, 8],    quantity: [16, 11, 7],    rarity: [12, 8, 4] },
    map_mistake_damage:      { xp: [26, 18, 11],    quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_reduced_evasion:     { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_reduced_absorption:  { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_quiz_damage:         { xp: [22, 15, 8],    quantity: [16, 11, 5],    rarity: [14, 8, 4] },
    map_reduced_block:       { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_reduced_accuracy:    { xp: [18, 12, 7],     quantity: [14, 8, 4],    rarity: [9, 5, 3] },
    map_reduced_attack_speed: { xp: [24, 16, 9],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_chilling_aura:       { xp: [26],           quantity: [20],          rarity: [16] },
    map_longer_lockout:      { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_slower_absorption:   { xp: [20, 14, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_longer_ailments:     { xp: [23, 15, 9],    quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_increased_dot:       { xp: [22, 15, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_freezing_hits:       { xp: [24, 16, 11],    quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_mana_costs:          { xp: [20, 14, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_time_leech:          { xp: [30, 20, 14],   quantity: [23, 16, 9],   rarity: [18, 12, 5] },
    map_fewer_pickups:       { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 5, 3] },
    map_blood_pact:          { xp: [32, 22, 14],   quantity: [26, 16, 11],   rarity: [22, 14, 8] },

    // ── Puzzle behaviour ─────────────────────────────────────────
    map_puzzle_cells:        { xp: [16, 11, 5],     quantity: [12, 8, 4],     rarity: [9, 5, 3] },
    map_required_puzzles:    { xp: [27, 15],       quantity: [23, 12],       rarity: [16, 9] },
    map_extra_questions:     { xp: [23, 15, 8],    quantity: [19, 12, 7],    rarity: [14, 8, 5] },

    // ── Elemental Hazards - very rewarding: they demand active play
    //    (dodging) AND resistance stacking to mitigate.
    map_hazard_lava:         { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_lightning:    { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_blizzard:     { xp: [30, 20, 14],   quantity: [23, 16, 9],   rarity: [19, 14, 7] },
    map_hazard_darkness:     { xp: [24, 16, 9],    quantity: [19, 12, 7],    rarity: [15, 9, 5] },
    map_hazard_arcane:       { xp: [35, 24, 16],   quantity: [28, 19, 12],   rarity: [24, 16, 9] },
    map_hazard_meteor:       { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_volatile:     { xp: [34, 23, 16],   quantity: [27, 19, 11],   rarity: [22, 15, 8] },
    map_hazard_frostnova:    { xp: [31, 22, 14],   quantity: [24, 16, 9],   rarity: [19, 14, 7] },
};

// Resolves the reward triple of one mod at a given tier.
export function _egGetMapModRewards(familyId, tier) {
    const r = EG_MAP_MOD_REWARDS[familyId];
    if (!r) return { xp: 0, quantity: 0, rarity: 0 };
    const idx = Math.max(0, Math.min(r.xp.length - 1, (tier || 1) - 1));
    return { xp: r.xp[idx] || 0, quantity: r.quantity[idx] || 0, rarity: r.rarity[idx] || 0 };
}

// Sums the reward bonuses of all mods on a map → { xp, quantity, rarity }.
export function _egGetMapRewardBonuses(map) {
    const total = { xp: 0, quantity: 0, rarity: 0 };
    if (!map || !Array.isArray(map.mods)) return total;
    map.mods.forEach(mod => {
        const rw = _egGetMapModRewards(mod.familyId, mod.tier);
        total.xp += rw.xp;
        total.quantity += rw.quantity;
        total.rarity += rw.rarity;
    });
    return total;
}

// Computes the expected gold reward range for completing a map.
// Returns { min, max, avg } based on map tier and modifier load.
export function _egGetMapGoldRewardRange(map) {
    const tier = Math.max(1, map.mapTier || 1);
    const mods = Array.isArray(map.mods) ? map.mods : [];
    const tierFrac = (tier - 1) / 15; // EG_MAX_MAP_TIER - 1
    const modLoad = mods.reduce((s, m) => s + ((Number(m && m.tier) || 1)), 0);
    const modFrac = Math.min(1, modLoad / 12);
    const difficulty = tierFrac * 0.7 + modFrac * 0.3;
    const baseGold = 50 + difficulty * 450;
    const variance = 50; // (Math.random() - 0.5) * 100 -> ±50
    return {
        min: Math.max(50, Math.round(baseGold - variance)),
        max: Math.round(baseGold + variance),
        avg: Math.round(baseGold)
    };
}


