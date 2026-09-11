//  endgame-mod-name-words.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Mod name words used by the item-name builder (_egBuildItemName).
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//

// T1 is the highest/best tier.
// 'ilvl' is the minimum item level required for this tier to roll.
// 'weight' determines how common the roll is (higher = more common).
//
// LOCALIZATION: every mod family carries 'label' (EN) + 'labelDe' (DE).
// The display layer picks the right language at generation time
// (see _egBuildRolledStats in endgame-equipment-generator.js).
//
// EG_MOD_NAME_WORDS provides proper-language name parts used by the item
// name builder (_egBuildItemName): [enAdjective, enOfPhrase, deGenitive].
//   enAdjective – reads naturally BEFORE a noun ("Healthy Leather Cap")
//   enOfPhrase  – reads naturally AFTER a noun ("Leather Cap of Vitality")
//   deGenitive  – German genitive post-position ("Lederkappe des Lebens"),
//                 which avoids German adjective-declension issues entirely.
const EG_MOD_NAME_WORDS = {
    // --- LIFE & MANA ---
    flat_health: ['Healthy', 'of Vitality', 'des Lebens'],
    inc_health: ['Vital', 'of Vitality', 'des Lebens'],
    flat_mana: ['Lucid', 'of Lucidity', 'des Manas'],
    heart_heal: ['Restorative', 'of Restoration', 'der Herzheilung'],
    inc_heart_heal: ['Mending', 'of Mending', 'der Herzheilung'],
    mana_heal: ['Replenishing', 'of Replenishment', 'der Manawiederherstellung'],
    inc_mana_heal: ['Resonant', 'of Resonance', 'der Manaresonanz'],
    time_added: ['Patient', 'of Patience', 'des Zeitzuwachses'],

    // --- DEFENSES (flat / increased / hybrid) ---
    flat_armour: ['Sturdy', 'of Stone', 'der Rüstung'],
    inc_armour: ['Reinforced', 'of Iron', 'der Rüstung'],
    flat_evasion: ['Nimble', 'of Air', 'des Ausweichens'],
    inc_evasion: ['Fleet', 'of Wind', 'des Ausweichens'],
    flat_absorption: ['Guarded', 'of Shields', 'der Absorption'],
    inc_absorption: ['Fortified', 'of Fortress', 'der Absorption'],
    hybrid_life_armour: ['Stalwart', 'of the Colossus', 'der Lebensrüstung'],
    hybrid_mana_armour: ['Scholarly', 'of the Scholar', 'der Manarüstung'],
    hybrid_life_evasion: ['Lithe', 'of the Lynx', 'des Lebensausweichens'],
    hybrid_mana_evasion: ['Elusive', 'of the Phantom', 'des Manaausweichens'],
    hybrid_life_absorption: ['Tireless', 'of the Titan', 'der Lebensabsorption'],
    hybrid_mana_absorption: ['Meditative', 'of the Monk', 'der Manaabsorption'],
    hybrid_armour_evasion: ['Tempered', 'of the Duelist', 'des Rüstungsausweichens'],
    hybrid_armour_absorption: ['Unyielding', 'of the Citadel', 'der Rüstungsabsorption'],
    hybrid_evasion_absorption: ['Slippery', 'of the Wisp', 'der Ausweichabsorption'],
    hybrid_evasion_armour: ['Dancing', 'of the Dervish', 'der Ausweichrüstung'],

    // --- ATTRIBUTES & CORE SUFFIXES ---
    strength: ['Mighty', 'of Strength', 'der Stärke'],
    agility: ['Agile', 'of Agility', 'der Beweglichkeit'],
    intelligence: ['Cunning', 'of Intelligence', 'der Intelligenz'],
    accuracy: ['True', 'of Accuracy', 'der Genauigkeit'],
    life_regen: ['Renewing', 'of Regeneration', 'der Lebensregeneration'],
    mana_regen: ['Serene', 'of Clarity', 'der Manaregeneration'],

    // --- RESISTANCES ---
    fire_resist: ['Fireproof', 'of Embers', 'des Feuerwiderstands'],
    cold_resist: ['Frostproof', 'of Frost', 'des Kältewiderstands'],
    lightning_resist: ['Stormproof', 'of Storms', 'des Blitzwiderstands'],
    shadow_resist: ['Duskward', 'of Shade', 'des Schattenwiderstands'],
    arcane_resistance: ['Runic', 'of Hexbreaking', 'des Arkanwiderstands'],

    // --- PUZZLE / MISTAKE RELATED ---
    mistake_count: ['Careful', 'of Care', 'der Fehleranzahl'],
    mistake_not_count: ['Flawless', 'of Perfection', 'der Fehlerfreiheit'],
    focus: ['Attentive', 'of Focus', 'des Fokus'],
    chance_for_new_question: ['Inquisitive', 'of Alternatives', 'der neuen Frage'],
    reveal_hint: ['Revealing', 'of Revelation', 'der Hinweisgabe'],

    // --- OFFENSE PREFIXES ---
    flat_physical_damage: ['Heavy', 'of Force', 'physischen Schadens'],
    inc_physical_damage: ['Cruel', 'of Cruelty', 'physischen Schadens'],
    spell_damage: ['Mystic', 'of Mysticism', 'des Zauberschadens'],
    inc_spell_damage: ['Eldritch', 'of Sorcery', 'des Zauberschadens'],
    cold_damage: ['Icy', 'of Cold', 'des Kälteschadens'],
    fire_damage: ['Scorching', 'of Fire', 'des Feuerschadens'],
    lightning_damage: ['Crackling', 'of Lightning', 'des Blitzschadens'],
    shadow_damage: ['Umbral', 'of Shadow', 'des Schattenschadens'],
    crit_chance: ['Keen', 'of Sharpness', 'der kritischen Trefferchance'],
    crit_multiplier: ['Savage', 'of Brutality', 'des kritischen Schadens'],
    attack_speed: ['Rapid', 'of Fury', 'des Angriffstempos'],
    pierce: ['Piercing', 'of Piercing', 'des Durchschlags'],
    cleave: ['Cleaving', 'of the Cleaver', 'des Flächenschlags'],
    splash_damage: ['Sweeping', 'of the Wave', 'des Flächenschadens'],
    chain: ['Coiling', 'of Chaining', 'der Kettenwirkung'],
    channel: ['Flowing', 'of Channeling', 'des Kanalisierens'],
    multishot: ['Splitting', 'of Volley', 'des Mehrfachschusses'],
    mana_to_damage: ['Mindfire', 'of Mind over Matter', 'der Manawandlung'],
    arcane_surge: ['Surging', 'of the Surge', 'der Arkanwoge'],
    overkill: ['Brutal', 'of Overkill', 'des Overkills'],
    pushback: ['Forceful', 'of Impact', 'des Zurückdrängens'],
    stagger: ['Staggering', 'of Staggering', 'des Wankens'],

    // --- OFFENSE SUFFIXES (chance effects etc.) ---
    chance_to_ignite: ['Igniting', 'of Burning', 'des Entzündens'],
    chance_to_freeze: ['Freezing', 'of Winter', 'des Einfrierens'],
    chance_to_shock: ['Shocking', 'of Thunder', 'des Schocks'],
    chance_to_blind: ['Dazzling', 'of Blinding', 'der Blendung'],
    chance_to_convert: ['Transmuting', 'of Transmutation', 'der Umwandlung'],
    precision_damage: ["Marksman's", 'of Marksmanship', 'des Präzisionsschadens'],
    precision_regen: ['Steadied', 'of Steadiness', 'der Präzisionsregeneration'],
    snipe: ['Sharpshooting', 'of the Hunter', 'des Scharfschusses'],
    shield_bash: ['Battering', 'of Battering', 'des Schildstoßes'],

    // --- KILL / LEECH ON-EFFECTS (roll as prefix AND suffix on some slots,
    //     so both word forms are chosen to read well in either position) ---
    life_leech: ['Vampiric', 'of Leeching', 'des Lebensraubs'],
    life_on_kill: ['Feasting', 'of Feasting', 'des Killlebens'],
    mana_on_kill: ['Siphoning', 'of Siphoning', 'des Killmanas'],
    mana_on_mistake: ['Forgiving', 'of Forgiveness', 'des Fehlermanas'],
    absorption_on_kill: ['Reaping', 'of Reaping', 'der Killabsorption'],

    // --- BLOCK / DODGE / ABSORPTION UTILITY ---
    absorption_regen_rate: ['Recovering', 'of Recovery', 'der Absorptionsregeneration'],
    faster_absorption_regen_start: ['Readied', 'of Readiness', 'der frühen Absorptionsregeneration'],
    block_chance: ['Deflecting', 'of Deflection', 'der Blockchance'],
    spell_block_chance: ['Spellward', 'of Aegis', 'der Zauberblockchance'],
    block_recovery: ['Resilient', 'of Resilience', 'der Blockerholung'],
    dodge: ['Evasive', 'of the Hare', 'der Ausweichkunst'],
    spell_dodge: ['Wraithlike', 'of the Ghost', 'des Zauberausweichens'],
    preemptive_dodge: ['Prescient', 'of Foresight', 'des frühen Ausweichens'],

    // --- MISC ---
    echo: ['Reverberating', 'of Echoes', 'des Nachhalls'],
    fate: ['Fated', 'of Destiny', 'des Schicksals'],
    first_step: ['Pioneering', 'of Beginnings', 'des ersten Schritts'],
    grounded: ['Anchored', 'of Grounding', 'der Standfestigkeit'],
    warding: ['Protective', 'of Warding', 'der Abwehr'],
    parry: ['Riposting', 'of Riposte', 'der Riposte'],
    deflect: ['Redirecting', 'of Redirection', 'der Umlenkung'],
    deflect_damage: ['Vengeful', 'of Vengeance', 'der Vergeltung'],
    movement_speed: ['Swift', 'of Swiftness', 'der Schnelligkeit'],

    // ── MAP MODS (endgame-maps.js EG_MAP_MOD_TABLES) ─────────────────
    // Prefixes
    map_monster_life: ['Beastly', 'of Beasts', 'der Bestien'],
    map_monster_damage: ['Ferocious', 'of Predators', 'der Raubtiere'],
    map_monster_speed: ['Frantic', 'of Frenzy', 'des Wahnsinns'],
    map_extra_monsters: ['Teeming', 'of Swarms', 'der Schwärme'],
    map_player_life: ['Fragile', 'of Frailty', 'der Gebrechlichkeit'],
    map_player_damage: ['Weary', 'of Weakness', 'der Schwäche'],
    map_player_defences: ['Exposed', 'of Exposure', 'der Schutzlosigkeit'],
    map_melee_damage: ['Dulled', 'of Dulling', 'der Abstumpfung'],
    map_projectile_damage: ['Windless', 'of Headwinds', 'der Gegenwinde'],
    map_elem_weakness: ['Unwarded', 'of Susceptibility', 'der Anfälligkeit'],
    map_temporal_chains: ['Sluggish', 'of Temporal Chains', 'der Zeitketten'],
    map_vulnerability: ['Defenseless', 'of Vulnerability', 'der Verwundbarkeit'],
    map_no_regeneration: ['Withering', 'of Withering', 'des Welkens'],
    map_reduced_recovery: ['Anemic', 'of Anaemia', 'der Blutarmut'],
    map_mistake_damage: ['Punishing', 'of Retribution', 'der Vergeltung'],
    map_reduced_evasion: ['Blinded', 'of Blindness', 'der Blindheit'],
    map_reduced_absorption: ['Depleted', 'of Depletion', 'der Erschöpfung'],
    map_puzzle_cells: ['Sprawling', 'of Labyrinths', 'der Labyrinthe'],
    map_required_puzzles: ['Demanding', 'of Trials', 'der Prüfungen'],
    map_hazard_lava: ['Molten', 'of Magma', 'des Magmas'],
    map_hazard_blizzard: ['Freezing', 'of Blizzards', 'des Schneesturms'],
    map_hazard_meteor: ['Blazing', 'of Meteors', 'der Meteore'],
    map_hazard_firewall: ['Scorching', 'of Fire Walls', 'der Feuerwände'],
    map_hazard_cyclone: ['Turbulent', 'of Cyclones', 'der Zyklone'],
    map_reduced_accuracy: ['Shaky', 'of Tremors', 'des Zitterns'],
    map_reduced_attack_speed: ['Lumbering', 'of Sloth', 'der Trägheit'],
    map_chilling_aura: ['Glacial', 'of Glaciers', 'der Gletscher'],
    map_longer_lockout: ['Hampering', 'of Iron Manacles', 'der Eisenfesseln'],
    map_slower_absorption: ['Sapping', 'of Siphoning', 'des Abzapfens'],
    // Suffixes
    map_monster_resistances: ['Warded', 'of Barriers', 'der Widerstände'],
    map_boss_chance: ['Tyrannical', 'of Tyrants', 'der Tyrannen'],
    map_monster_crit: ['Brutal', 'of Brutality', 'der Brutalität'],
    map_monster_avoid_ailments: ['Purified', 'of Purity', 'der Reinheit'],
    map_monster_regen: ['Rejuvenating', 'of Regrowth', 'des Nachwachsens'],
    map_monster_explosions: ['Detonating', 'of Detonation', 'der Detonation'],
    map_monster_ailments: ['Afflicting', 'of Affliction', 'des Leidens'],
    map_monster_puzzle_aggro: ['Taunting', 'of Taunting', 'der Verspottung'],
    map_reflect_melee: ['Mirrored', 'of Reflection', 'der Spiegelung'],
    map_boss_enrage: ['Enraging', 'of Enragement', 'der Raserei'],
    map_armour_pierce: ['Piercing', 'of Piercing', 'des Durchdringens'],
    map_monster_ambush: ['Ambushing', 'of Ambushes', 'der Hinterhalte'],
    map_fewer_mistakes: ['Merciless', 'of Severity', 'der Gnadenlosigkeit'],
    map_less_time: ['Hurried', 'of Haste', 'der Hast'],
    map_item_reveal_damage: ['Obscured', 'of Obscurity', 'der Dunkelheit'],
    map_ability_reveal_damage: ['Muted', 'of Silence', 'der Stille'],
    map_spell_damage: ['Nullified', 'of Nullification', 'der Nullifikation'],
    map_less_time_gained: ['Stalled', 'of Stagnation', 'der Stagnation'],
    map_mana_penalty: ['Draining', 'of Drain', 'des Entzugs'],
    map_extra_questions: ['Quizzing', 'of Inquisition', 'der Inquisition'],
    map_longer_ailments: ['Lingering', 'of Persistence', 'der Hartnäckigkeit'],
    map_increased_dot: ['Corrosive', 'of Corrosion', 'der Korrosion'],
    map_freezing_hits: ['Numbing', 'of Numbness', 'der Betäubung'],
    map_mana_costs: ['Thirsty', 'of Thirst', 'des Durstes'],
    map_hazard_delirium: ['Delirious', 'of Delirium', 'des Deliriums'],
    map_monster_ethereal: ['Phasing', 'of Phasing', 'der Phasenverschiebung'],
    map_boss_life: ['Colossal', 'of Titans', 'der Titanen'],
    map_monster_snowball: ['Escalating', 'of Escalation', 'der Eskalation'],
    map_monster_second_wind: ['Undying', 'of Rebirth', 'der Wiedergeburt'],
    map_monster_desperation: ['Cornered', 'of Desperation', 'der Verzweiflung'],
    map_time_leech: ['Thieving', 'of Time Theft', 'des Zeitdiebstahls'],
    map_fewer_pickups: ['Barren', 'of Scarcity', 'der Knappheit'],
    map_blood_pact: ['Pacted', 'of Blood Pacts', 'des Blutpakts'],
    map_quiz_damage: ['Testing', 'of Examinations', 'der Examinationen'],
    map_reduced_block: ['Staved', 'of Splintering', 'des Zersplitterns'],
    map_hazard_lightning: ['Stormy', 'of Tempests', 'der Stürme'],
    map_hazard_darkness: ['Shadowed', 'of Darkness', 'der Finsternis'],
    map_hazard_arcane: ['Warped', 'of Arcane Storms', 'der Arkanstürme'],
    map_hazard_volatile: ['Unstable', 'of Volatiles', 'der Instabilität'],
    map_hazard_frostnova: ['Shivering', 'of Frost Novas', 'der Frostnovas'],
};

