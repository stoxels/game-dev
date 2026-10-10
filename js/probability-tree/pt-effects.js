// pt-effects.js - passive-tree EFFECT REGISTRY (bulk-node pipeline, phase 1).
//
// Why this exists: reworking nodes one by one touched five places per node
// (data.js statKey + hand-written EN/DE desc, a bonus-table entry in
// endgame-leveling.js, seeding/labels in endgame-player-stats.js and
// translation strings). With 1000+ stat-stick nodes to author that is not
// feasible. This registry makes a plain stat node a SINGLE data.js line:
//
//     "effects": ["str_flat:5"]
//
// One effect = ONE stat channel + ONE localised template line. Composite
// nodes simply list several effects (one per advertised line, matching the
// rework rule "one stat per line"). The stat channels accumulate through
// the generic scan in endgame-leveling.js (_egGetPassiveTreeTravelBonuses)
// and the tooltip text is generated in both languages by
// ptResolveNodeDesc(), so no hand-written descEn/descDe and no per-node
// bonus-table entry are needed.
//
// Spec syntax in data.js: "<key>:<value>" (e.g. "melee_phys_inc:12").
// A bare key ("str_flat") is shorthand for value 1.
//
// Bespoke keystones with unique mechanics keep the legacy path:
// hand-written descEn/descDe win over generation, and a statKey plus a
// bonus-table entry still work exactly as before. Both pipelines coexist.

export const PT_EFFECT_DEFS = Object.freeze({
    // --- attributes -------------------------------------------------------
    str_flat: { channel: 'str', en: '+{v} to Strength', de: '+{v} Stärke' },
    agi_flat: { channel: 'agi', en: '+{v} to Agility', de: '+{v} Beweglichkeit' },
    int_flat: { channel: 'int', en: '+{v} to Intelligence', de: '+{v} Intelligenz' },
    mana_flat: { channel: 'mana', en: '+{v} to Mana', de: '+{v} Mana' },

    // --- defence ----------------------------------------------------------
    armour_flat: { channel: 'armourFlat', en: '+{v} Armour', de: '+{v} Rüstung' },
    armour_inc_pct: { channel: 'armourIncPct', en: '+{v}% increased Armour', de: '+{v}% erhöhte Rüstung' },
    health_inc_pct: { channel: 'healthIncPct', en: '+{v}% increased maximum Life', de: '+{v}% erhöhtes maximales Leben' },
    // Flat maximum Life (reworked node 20031 Anvil Guard): seeds the same
    // flat pool gear's flat_health feeds, so it is multiplied by
    // % increased maximum Life like every other flat source.
    life_flat: { channel: 'healthFlat', en: '+{v} to maximum Life', de: '+{v} zu maximalem Leben' },
    life_regen_pct: { channel: 'lifeRegenPct', en: 'Regenerate {v}% of Life per second', de: 'Regeneriere {v}% des Lebens pro Sekunde' },
    // Flat Life regeneration per second (reworked node 129 Horizon
    // Tracker): rides the same lifeRegen bucket gear's life_regen feeds,
    // so tree and gear regen add up in _egTickLifeRegen().
    life_regen_flat: { channel: 'lifeRegenFlat', en: 'Regenerate {v} Life per second', de: 'Regeneriere {v} Leben pro Sekunde' },
    // Flat physical retaliation against melee attackers (reworked node 13
    // Enhanced Rewards): unlike the buff-gated percentage Retribution in
    // encounter-damage.js, this fires on every landed melee hit for the
    // advertised flat amount - see the hook next to that block.
    reflect_phys_flat: { channel: 'reflectPhysFlat', en: 'Reflect {v} Physical Damage back to melee attackers', de: 'Reflektiere {v} physischen Schaden auf Nahkampfangreifer' },
    // Block chance that works without a shield, as long as the stance fits:
    // dual-wielding or holding a shield (ward batch, e.g. reworked node
    // 30255). Attacks only - spells still use spell block. Stacks on top of
    // gear block chance inside the 75% cap in _egPlayerTakeDamage.
    block_dualshield: { channel: 'blockChanceTree', en: '+{v}% Chance to Block attacks while dual wielding or Holding a Shield', de: '+{v}% Chance, Angriffe mit zwei Waffen oder Schild zu blocken' },
    // Block recovery (ward batch, e.g. reworked node 30254): rides the very
    // same bucket gear's block_recovery feeds, so tree and gear shorten the
    // post-block lockout together.
    block_recovery: { channel: 'blockRecoveryPct', en: '+{v}% increased Block Recovery', de: '+{v}% erhöhte Blockerholung' },
    // Timed armour pulse (reworked node 337 Umbral Survey): flat Armour
    // granted while a block landed in the last 10 seconds - see the pulse
    // in _egComputePlayerStats, fed by globalThis._egLastBlockAt which the
    // block branch of _egPlayerTakeDamage refreshes on every block.
    block_pulse: { channel: 'blockArmorPulse', en: '+{v} Armour for 10 seconds after Blocking', de: '+{v} Rüstung für 10 Sekunden nach dem Blocken' },
    // Per-ailment durations for YOUR ailments on enemies (tithe batch, e.g.
    // reworked nodes 30252/30253): scale the monster-side durations in
    // _egApplyMonsterAilment. Bleed itself is a full ailment (see
    // combat-ailments-core.js): physical hits innately bleed, both sides tick.
    ignite_duration: { channel: 'igniteDurationPct', en: '+{v}% increased Ignite Duration on enemies', de: '+{v}% erhöhte Entzündungsdauer bei Gegnern' },
    bleed_duration: { channel: 'bleedDurationPct', en: '+{v}% increased Duration of Bleeds on enemies', de: '+{v}% erhöhte Blutungsdauer bei Gegnern' },
    accuracy_flat: { channel: 'accuracy', en: '+{v} to Accuracy', de: '+{v} Präzision' },
    accuracy_rating_pct: { channel: 'accuracyIncPct', en: '+{v}% increased Accuracy Rating', de: '+{v}% erhöhte Präzision' },
    all_elemental_resist: { channel: 'allElementalResist', en: '+{v} to all Elemental Resistances', de: '+{v} zu allem elementalen Widerständen' },
    fire_resist_flat: { channel: 'fireResistFlat', en: '+{v} Fire Resistance', de: '+{v} Feuerwiderstand' },
    cold_resist_flat: { channel: 'coldResistFlat', en: '+{v} Cold Resistance', de: '+{v} Kältewiderstand' },
    lightning_resist_flat: { channel: 'lightningResistFlat', en: '+{v} Lightning Resistance', de: '+{v} Blitzwiderstand' },

    // --- damage -----------------------------------------------------------
    phys_damage_inc: { channel: 'physDamageIncPct', en: '+{v}% increased Physical Damage', de: '+{v}% erhöhter physischer Schaden' },
    melee_phys_inc: { channel: 'meleePhysIncPct', en: '+{v}% increased melee physical damage', de: '+{v}% physischer Nahkampfschaden' },
    // Weapon-stance split (melee batch): only ONE of the two applies per
    // strike - Heavy when a two-handed weapon is equipped, one-handed
    // otherwise (1H + shield, dual-wield, or unarmed). Both stack on top of
    // the generic melee_phys_inc above. Stance is read in
    // _egCalcPlayerMeleeDamage via stats.isHeavyWeaponEquipped.
    melee_phys_1h: { channel: 'meleePhys1HIncPct', en: '+{v}% increased melee physical Damage with one-handed weapons', de: '+{v}% erhöhter physischer Nahkampfschaden mit einhändigen Waffen' },
    melee_phys_heavy: { channel: 'meleePhysHeavyIncPct', en: '+{v}% increased melee physical Damage with Heavy weapons', de: '+{v}% erhöhter physischer Nahkampfschaden mit schweren Waffen' },
    // Maximum Fire Resistance (reworked node 20068 Resolute Advance): seeds
    // the same fireResistMax bucket gear's max_fire_res feeds, so tree and
    // gear raise the 75% cap together.
    fire_res_max: { channel: 'fireResistMax', en: '+{v}% to maximum Fire Resistance', de: '+{v}% auf maximalen Feuerwiderstand' },
    spell_damage_inc_pct: { channel: 'spellDamageIncPct', en: '+{v}% increased Spell Damage', de: '+{v}% erhöhter Zauberschaden' },
    elemental_damage_inc_pct: { channel: 'elementalDamageIncPct', en: '+{v}% increased Elemental Damage', de: '+{v}% erhöhter elementarer Schaden' },
    fire_damage_inc_pct: { channel: 'fireDamageIncPct', en: '+{v}% increased Fire Damage', de: '+{v}% erhöhter Feuerschaden' },
    cold_damage_inc_pct: { channel: 'coldDamageIncPct', en: '+{v}% increased Cold Damage', de: '+{v}% erhöhter Kälteschaden' },
    lightning_damage_inc_pct: { channel: 'lightningDamageIncPct', en: '+{v}% increased Lightning Damage', de: '+{v}% erhöhter Blitzschaden' },

    // --- speed ------------------------------------------------------------
    attack_speed_pct: { channel: 'attackSpeedPct', en: '+{v}% increased Attack Speed', de: '+{v}% erhöhte Angriffsgeschwindigkeit' },
    melee_charge_speed_pct: { channel: 'meleeChargeSpeedPct', en: '+{v}% increased melee attack charge-up speed', de: '+{v}% Nahkampf-Aufladegeschwindigkeit' },
    // Life leech from the tree (grit batch, e.g. reworked nodes 30257/30258
    // and 20043): feeds the very same lifeLeechPct bucket gear's life_leech
    // suffix feeds (see _egCalcPlayerDamage / _egCalcPlayerMeleeDamage in
    // combat-calculations.js), so both heal off attack damage together.
    // Supports fractions (0.4) like the life_regen_pct precedent.
    life_leech: { channel: 'lifeLeechPct', en: '+{v}% of physical attack Damage leeched as Life', de: '+{v}% des physischen Angriffsschadens als Leben entzogen' },
    cast_speed_pct: { channel: 'castSpeedPct', en: '+{v}% increased Cast Speed', de: '+{v}% erhöhte Zaubergeschwindigkeit' },
    movement_speed_pct: { channel: 'movementSpeedPct', en: '+{v}% increased Movement Speed', de: '+{v}% erhöhte Bewegungsgeschwindigkeit' },
});

// Splits "key:value" (or a bare "key" = value 1) into its parts.
// Returns null for unknown keys so a typo can never grant a silent zero.
export function ptParseEffectSpec(spec) {
    if (typeof spec !== 'string' || !spec) return null;
    const sep = spec.indexOf(':');
    const key = sep === -1 ? spec : spec.slice(0, sep);
    const def = PT_EFFECT_DEFS[key];
    if (!def) return null;
    const value = sep === -1 ? 1 : Number(spec.slice(sep + 1));
    if (!Number.isFinite(value)) return null;
    return { key, def, value };
}

// Merges a node's effect list into a { channel: value } object.
// Duplicate channels add up (two +5 Strength effects grant +10).
// Unparseable specs are skipped; the pt-effects-integrity test fails loudly
// on them, so the runtime path never throws on bad data.
export function ptEffectChannels(effectSpecs) {
    const channels = {};
    if (!Array.isArray(effectSpecs)) return channels;
    for (const spec of effectSpecs) {
        const parsed = ptParseEffectSpec(spec);
        if (!parsed) continue;
        const { channel } = parsed.def;
        channels[channel] = (channels[channel] || 0) + parsed.value;
    }
    return channels;
}

// True when a node is authored through the effects pipeline.
export function ptNodeHasEffects(node) {
    return Boolean(node && Array.isArray(node.effects) && node.effects.length > 0);
}

// Generates the localised description from the effect templates, one line
// per effect in the order they are listed (the rework rule: one stat per
// line). Empty string when the node carries no effects.
export function ptGenerateNodeDesc(node, lang) {
    if (!ptNodeHasEffects(node)) return '';
    const lines = [];
    for (const spec of node.effects) {
        const parsed = ptParseEffectSpec(spec);
        if (!parsed) continue;
        const template = lang === 'de' ? parsed.def.de : parsed.def.en;
        lines.push(String(template).replace('{v}', String(parsed.value)));
    }
    return lines.join('\n');
}

// The tooltip/search description for a node: hand-written descEn/descDe
// always win (bespoke keystones keep their authored text); effects nodes
// without authored text get the generated lines for the requested language.
export function ptResolveNodeDesc(node, lang) {
    if (!node) return '';
    const hand = lang === 'de' ? node.descDe : node.descEn;
    if (hand) return hand;
    return ptGenerateNodeDesc(node, lang);
}
