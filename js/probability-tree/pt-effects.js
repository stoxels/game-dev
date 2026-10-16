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
    mana_flat: { channel: 'mana', en: '+{v} to maximum Mana', de: '+{v} auf maximales Mana' },

    // --- defence ----------------------------------------------------------
    armour_flat: { channel: 'armourFlat', en: '+{v} Armour', de: '+{v} Rüstung' },
    armour_inc_pct: { channel: 'armourIncPct', en: '{v}% increased Armour', de: '{v}% erhöhte Rüstung' },
    evasion_flat: { channel: 'evasionFlat', en: '+{v} to Evasion Rating', de: '+{v} Ausweichwertung' },
    parry_spell_chance: { channel: 'parrySpellChancePct', en: '{v}% Chance to Parry Spell Damage', de: '{v}% Chance, Zauberschaden zu parieren' },
    evasion_inc_pct: { channel: 'evasionIncPct', en: '{v}% increased Evasion Rating', de: '{v}% erhöhte Ausweichwertung' },
    health_inc_pct: { channel: 'healthIncPct', en: '{v}% increased maximum Life', de: '{v}% erhöhtes maximales Leben' },
    // Flat maximum Life (reworked node 20031 Anvil Guard): seeds the same
    // flat pool gear's flat_health feeds, so it is multiplied by
    // % increased maximum Life like every other flat source.
    life_flat: { channel: 'healthFlat', en: '+{v} to maximum Life', de: '+{v} auf maximales Leben' },
    life_regen_pct: { channel: 'lifeRegenPct', en: 'Regenerate {v}% of Life per second', de: 'Regeneriere {v}% des Lebens pro Sekunde' },
    // Flat Life regeneration per second (reworked node 129 Horizon
    // Tracker): rides the same lifeRegen bucket gear's life_regen feeds,
    // so tree and gear regen add up in _egTickLifeRegen().
    life_regen_flat: { channel: 'lifeRegenFlat', en: 'Regenerate {v} Life per second', de: 'Regeneriere {v} Leben pro Sekunde' },
    // Flat physical retaliation against melee attackers (reworked node 13
    // Enhanced Rewards): unlike the buff-gated percentage Retribution in
    // encounter-damage.js, this fires on every landed melee hit for the
    // advertised flat amount - see the hook next to that block.
    reflect_phys_flat: { channel: 'reflectPhysFlat', en: 'Reflect {v} physical Damage back to melee attackers', de: 'Reflektiere {v} physischen Schaden auf Nahkampfangreifer' },
    // Block chance that works without a shield, as long as the stance fits:
    // dual-wielding or holding a shield (ward batch, e.g. reworked node
    // 30255). Attacks only - spells still use spell block. Stacks on top of
    // gear block chance inside the 75% cap in _egPlayerTakeDamage.
    block_dualshield: { channel: 'blockChanceTree', en: '+{v}% Chance to Block Attack Damage while dual wielding or Holding a Shield', de: '+{v}% Chance, Angriffsschaden mit zwei Waffen oder Schild zu blocken' },
    // Block recovery (ward batch, e.g. reworked node 30254): rides the very
    // same bucket gear's block_recovery feeds, so tree and gear shorten the
    // post-block lockout together.
    block_recovery: { channel: 'blockRecoveryPct', en: '{v}% increased Block Recovery', de: '{v}% erhöhte Blockerholung' },
    // Timed armour pulse (reworked node 337 Warding Stance): flat Armour
    // granted while a block landed in the last 10 seconds - see the pulse
    // in _egComputePlayerStats, fed by globalThis._egLastBlockAt which the
    // block branch of _egPlayerTakeDamage refreshes on every block.
    block_pulse: { channel: 'blockArmorPulse', en: '+{v} Armour for 10 seconds after Blocking', de: '+{v} Rüstung für 10 Sekunden nach dem Blocken' },
    // Per-ailment durations for YOUR ailments on enemies (tithe batch, e.g.
    // reworked nodes 30252/30253): scale the monster-side durations in
    // _egApplyMonsterAilment. Bleed itself is a full ailment (see
    // combat-ailments-core.js): physical hits innately bleed, both sides tick.
    ignite_duration: { channel: 'igniteDurationPct', en: '{v}% increased Ignite Duration on enemies', de: '{v}% erhöhte Entzündungsdauer bei Gegnern' },
    bleed_duration: { channel: 'bleedDurationPct', en: '{v}% increased Duration of Bleeds on enemies', de: '{v}% erhöhte Blutungsdauer bei Gegnern' },
    accuracy_flat: { channel: 'accuracy', en: '+{v} to Accuracy Rating', de: '+{v} Präzision' },
    accuracy_rating_pct: { channel: 'accuracyIncPct', en: '{v}% increased Accuracy Rating', de: '{v}% erhöhte Präzision' },
    all_elemental_resist: { channel: 'allElementalResist', en: '+{v}% to all Elemental Resistances', de: '+{v}% auf alle elementaren Widerstände' },
    fire_resist_flat: { channel: 'fireResistFlat', en: '+{v}% to Fire Resistance', de: '+{v}% Feuerwiderstand' },
    cold_resist_flat: { channel: 'coldResistFlat', en: '+{v}% to Cold Resistance', de: '+{v}% Kältewiderstand' },
    lightning_resist_flat: { channel: 'lightningResistFlat', en: '+{v}% to Lightning Resistance', de: '+{v}% Blitzwiderstand' },

    // Shield batch (reworked nodes 30375/30374/30376/285). Every line is
    // conditional on a shield being equipped. Wiring: blockChanceShieldPct
    // in _egPlayerTakeDamage; the physical-damage lines folded into the
    // physical buckets and shieldDefencePct applied to the shield's own
    // defences, both in _egComputePlayerStats; Endurance Charges in
    // combat-ailments-state.js (gained in _egKillMonster).
    block_shield: { channel: 'blockChanceShieldPct', en: '+{v}% Chance to Block Attack Damage while Holding a Shield', de: '+{v}% Chance, Angriffsschaden mit Schild zu blocken' },
    melee_phys_shield: { channel: 'meleePhysShieldIncPct', en: '{v}% increased physical melee Damage while Holding a Shield', de: '{v}% erhöhter physischer Nahkampfschaden mit Schild' },
    attack_phys_shield: { channel: 'attackPhysShieldIncPct', en: '{v}% increased physical attack Damage while Holding a Shield', de: '{v}% erhöhter physischer Angriffsschaden mit Schild' },
    shield_defences: { channel: 'shieldDefencePct', en: '{v}% increased Defences from equipped Shield', de: '{v}% erhöhte Verteidigung vom ausgerüsteten Schild' },
    endurance_on_kill_shield: { channel: 'enduranceOnKillShieldPct', en: '{v}% Chance to gain an Endurance Charge on Kill while Holding a Shield', de: '{v}% Chance, beim Töten mit Schild eine Ausdauerladung zu erhalten' },

    // Endurance batch (reworked nodes 30344/20067/30341): charge duration
    // (applied when a charge is gained, combat-ailments-state.js), the charge
    // cap (added onto EG_ENDURANCE_BASE_MAX in _egComputePlayerStats) and
    // Life regeneration per live charge (_egTickLifeRegen).
    endurance_duration: { channel: 'enduranceDurationPct', en: '{v}% increased Endurance Charge Duration', de: '{v}% erhöhte Dauer von Ausdauerladungen' },
    endurance_max: { channel: 'enduranceChargesMax', en: '+{v} to maximum Endurance Charges', de: '+{v} auf maximale Ausdauerladungen' },
    endurance_regen: { channel: 'lifeRegenPerEndurancePct', en: 'Regenerate {v}% of Life per second per Endurance Charge', de: 'Regeneriere {v}% des Lebens pro Sekunde pro Ausdauerladung' },

    // Impale (heavy-weapon batch, e.g. reworked nodes 30268/240/8): a melee
    // hit with a Heavy (two-handed) weapon can impale the enemy, storing 10%
    // of the hit's physical damage; the next 5 hits on it (within 8s) each
    // deal that stored amount again as extra physical damage. Wired in
    // _egApplyImpaleToHit (combat-ailments-core.js).
    impale_chance_heavy: { channel: 'impaleChanceHeavyPct', en: '{v}% Chance to impale enemies on Hit with Heavy weapons', de: '{v}% Chance, Gegner bei Treffern mit schweren Waffen aufzuspießen' },
    impale_effect_heavy: { channel: 'impaleEffectHeavyPct', en: '{v}% increased Effect of Impales you inflict with Heavy weapons', de: '{v}% erhöhte Wirkung von Aufspießungen, die du mit schweren Waffen verursachst' },
    // Only applies while the enemy carries no impale at the moment the new
    // one lands (a still-active impale it refreshes does not count).
    impale_effect_fresh: { channel: 'impaleEffectFreshPct', en: '{v}% increased Effect of Impales you inflict with Heavy weapons on non-impaled enemies', de: '{v}% erhöhte Wirkung von Aufspießungen, die du mit schweren Waffen auf nicht aufgespießten Gegnern verursachst' },
    impale_duration: { channel: 'impaleDurationPct', en: '{v}% increased Impale Duration', de: '{v}% erhöhte Aufspießungsdauer' },

    // --- damage -----------------------------------------------------------
    phys_damage_inc: { channel: 'physDamageIncPct', en: '{v}% increased physical Damage', de: '{v}% erhöhter physischer Schaden' },
    melee_phys_inc: { channel: 'meleePhysIncPct', en: '{v}% increased physical melee Damage', de: '{v}% erhöhter physischer Nahkampfschaden' },
    // Weapon-stance split (melee batch): only ONE of the two applies per
    // strike - Heavy when a two-handed weapon is equipped, one-handed
    // otherwise (1H + shield, dual-wield, or unarmed). Both stack on top of
    // the generic melee_phys_inc above. Stance is read in
    // _egCalcPlayerMeleeDamage via stats.isHeavyWeaponEquipped.
    melee_phys_1h: { channel: 'meleePhys1HIncPct', en: '{v}% increased physical melee Damage with one-handed weapons', de: '{v}% erhöhter physischer Nahkampfschaden mit einhändigen Waffen' },
    melee_phys_heavy: { channel: 'meleePhysHeavyIncPct', en: '{v}% increased physical melee Damage with Heavy weapons', de: '{v}% erhöhter physischer Nahkampfschaden mit schweren Waffen' },
    // Weapon-family batch (sword/axe nodes 30270/30271/30274/147/30272/30273/
    // 227 and 30281/30280/30339/30340/125). The family comes from the
    // equipped weapon (_egGetEquippedWeaponInfo): the damage lines are a
    // separate multiplier in _egCalcPlayerMeleeDamage, the charge-up line is
    // added to the melee charge speed, the accuracy line to the flat
    // accuracy pool, all in _egComputePlayerStats / the interval breakdown.
    melee_phys_sword: { channel: 'meleePhysSwordIncPct', en: '{v}% increased physical melee Damage with Swords', de: '{v}% erhöhter physischer Nahkampfschaden mit Schwertern' },
    melee_phys_axe: { channel: 'meleePhysAxeIncPct', en: '{v}% increased physical melee Damage with Axes', de: '{v}% erhöhter physischer Nahkampfschaden mit Äxten' },
    sword_charge_speed: { channel: 'swordChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while wielding a Sword', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit mit Schwert' },
    melee_phys_mace: { channel: 'meleePhysMaceIncPct', en: '{v}% increased physical melee Damage with Maces or Sceptres', de: '{v}% erhöhter physischer Nahkampfschaden mit Streitkolben oder Zeptern' },
    // Area of Effect (node 30334): a general size scaler for player-placed
    // spell targeting areas. No spell consumes it yet - the stat is tracked
    // and shown so the future targeting-area code can read stats.areaOfEffectPct.
    area_of_effect: { channel: 'areaOfEffectPct', en: '{v}% increased Area of Effect', de: '{v}% vergrößerter Wirkungsbereich' },
    // Stun (mace batch, nodes 360/30331/30332). A stun is the game's existing
    // stagger: the monster's charge timer is paused (staggeredUntil). The
    // chance is rolled on melee hits with a Mace or Sceptre struck at
    // EG_MACE_STUN_MIN_CHARGE (90%) or more on the charge-up bar
    // (_egDamageTargetById); the duration line scales every stun and
    // stagger you inflict (_egApplyHitToMonster).
    stun_chance_mace_charged: { channel: 'stunChanceMaceChargedPct', en: '{v}% Chance to Stun enemies on Hit with a Mace or Sceptre at 90% or more charge', de: '{v}% Chance, Gegner bei Treffern mit Streitkolben oder Zepter bei mindestens 90% Aufladung zu betäuben' },
    stun_duration: { channel: 'stunDurationPct', en: '{v}% increased Stun Duration on enemies', de: '{v}% erhöhte Betäubungsdauer bei Gegnern' },
    // Heavy-weapon stun batch (nodes 30248/30249/30250/20037): heavy means a
    // two-handed weapon (stats.isHeavyWeaponEquipped) and melee hits only.
    // Chance and duration extend the shared stun (= stagger) effect above;
    // stun_double_chance doubles the length of a stun when one is applied,
    // melee_double_damage_chance doubles a whole melee strike (rolled next
    // to the crit roll in _egCalcPlayerMeleeDamage).
    stun_chance_heavy: { channel: 'stunChanceHeavyPct', en: '{v}% Chance to Stun enemies on Hit with Heavy weapons', de: '{v}% Chance, Gegner bei Treffern mit schweren Waffen zu betäuben' },
    stun_duration_heavy: { channel: 'stunDurationHeavyPct', en: '{v}% increased Stun Duration with Heavy weapons', de: '{v}% erhöhte Betäubungsdauer mit schweren Waffen' },
    stun_double_chance: { channel: 'stunDoubleChancePct', en: '{v}% Chance to double Stun Duration', de: '{v}% Chance, die Betäubungsdauer zu verdoppeln' },
    melee_double_damage_chance: { channel: 'meleeDoubleDamageChancePct', en: '{v}% Chance to deal double Damage with melee attacks', de: '{v}% Chance, mit Nahkampfangriffen doppelten Schaden zu verursachen' },
    // Melee-spell batch (nodes 30371/30370/20044): "melee spells" are spells
    // carrying the Melee tag. No spell has that tag yet, so these two stats
    // are tracked and shown on the sheet but nothing consumes them until
    // melee spells exist (the cost code should read
    // stats.meleeSpellManaCostReducedPct / meleeSpellLifeCostPct).
    melee_spell_mana_reduced: { channel: 'meleeSpellManaCostReducedPct', en: '{v}% reduced Mana Cost of Melee spells', de: '{v}% reduzierte Manakosten von Nahkampfzaubern' },
    melee_spell_life_cost: { channel: 'meleeSpellLifeCostPct', en: '{v}% of the Mana Cost of Melee spells is paid with Life instead', de: '{v}% der Manakosten von Nahkampfzaubern werden stattdessen mit Leben bezahlt' },
    // Melee area of effect (nodes 30373/30372/20045): rides the existing
    // meleeAoEPct bucket (cleave radius in encounter-melee-impact.js).
    melee_aoe_pct: { channel: 'meleeAoEPct', en: 'Melee skills have {v}% increased Area of Effect', de: 'Nahkampffertigkeiten haben {v}% vergrößerten Wirkungsbereich' },
    // Corpse explosion (node 20045): rolled when a melee strike kills; the
    // dying enemy deals EG_MELEE_EXPLODE_LIFE_SHARE of its maximum Life as
    // physical damage to the other enemies in its spawn zone
    // (_egDamageTargetById). The 10% is fixed and part of the tooltip text.
    melee_kill_explode: { channel: 'meleeKillExplodeChancePct', en: 'Enemies killed by melee skills have a {v}% Chance to explode, dealing 10% of their Life as physical Damage to nearby enemies', de: 'Von Nahkampffertigkeiten getötete Gegner explodieren mit {v}% Chance und verursachen 10% ihres Lebens als physischen Schaden bei Gegnern in der Nähe' },
    axe_charge_speed: { channel: 'axeChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while wielding an Axe', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit mit Axt' },
    // Rage (axe notable 369): a new stacking resource. Melee hits with an
    // Axe grant rage_on_hit_axe Rage (capped at rage_max); every Rage is a
    // multiplicative "more" step of rage_effect % on melee damage
    // (_egCalcPlayerMeleeDamage). One Rage fades per second once 5 seconds
    // passed without being hit or gaining Rage (combat-ailments-state.js).
    rage_on_hit_axe: { channel: 'rageOnHitAxe', en: 'Gain {v} Rage on Hit with Axes', de: 'Erhalte {v} Wut bei Treffern mit Äxten' },
    rage_effect: { channel: 'rageMeleeMorePct', en: 'Each point of Rage grants {v}% more melee Damage', de: 'Jeder Wutpunkt gewährt {v}% mehr Nahkampfschaden' },
    rage_max: { channel: 'rageMax', en: 'Maximum Rage is {v}', de: 'Maximale Wut beträgt {v}' },
    accuracy_sword: { channel: 'accuracySwordFlat', en: '+{v} to Accuracy Rating with Swords', de: '+{v} Präzision mit Schwertern' },
    // Armour pierce (node 147): rolled per player hit in
    // _egDamageTargetById; a successful roll skips the target's POSITIVE
    // physical resistance for that hit (vulnerability still amplifies).
    ignore_phys_reduction: { channel: 'ignorePhysReductionPct', en: 'Hits have {v}% Chance to ignore enemy physical Damage reduction', de: 'Treffer haben {v}% Chance, die physische Schadensreduktion von Gegnern zu ignorieren' },
    // Intimidate (node 125): new status. Chance is rolled on melee hits
    // (_egRollIntimidate); an intimidated enemy takes intimidateMeleeAmpPct
    // % more melee damage for the duration (_egApplyIntimidateAmp), where the
    // amplification itself is the separate intimidate_amp line.
    intimidate_melee: { channel: 'intimidateChanceMeleePct', en: '{v}% Chance to Intimidate enemies for 10 seconds on Hit with melee attacks', de: '{v}% Chance, Gegner bei Nahkampftreffern für 10 Sekunden einzuschüchtern' },
    intimidate_amp: { channel: 'intimidateMeleeAmpPct', en: 'Intimidated enemies take {v}% increased melee Damage', de: 'Eingeschüchterte Gegner erleiden {v}% erhöhten Nahkampfschaden' },

    // Bleed batch (reworked nodes 30284/30285/30283/251): extra chances for
    // your attacks to cause Bleeding (rolled per hit in
    // _egRollPlayerHitAilments, sized from the hit's physical share) and a
    // speed-up of the bleeds you inflict (_egApplyMonsterAilment: same total
    // damage, faster ticks, shorter duration).
    bleed_chance_melee: { channel: 'bleedChanceMeleePct', en: 'Melee attacks have a {v}% Chance to cause Bleeding', de: 'Nahkampfangriffe haben {v}% Chance, Blutung zu verursachen' },
    bleed_chance_attack: { channel: 'bleedChanceAttackPct', en: 'Attacks have a {v}% Chance to cause Bleeding', de: 'Angriffe haben {v}% Chance, Blutung zu verursachen' },
    bleed_speed: { channel: 'bleedSpeedPct', en: 'Bleeding you inflict deals Damage {v}% faster', de: 'Von dir verursachte Blutung verursacht Schaden {v}% schneller' },
    // Life regeneration rate (reworked node 111): multiplies the whole
    // per-second regeneration (flat + percentage) in _egTickLifeRegen.
    life_regen_rate: { channel: 'lifeRegenRatePct', en: '{v}% increased Life Regeneration rate', de: '{v}% erhöhte Lebensregenerationsrate' },

    // Maximum Fire Resistance (reworked node 20068 Resolute Advance): seeds
    // the same fireResistMax bucket gear's max_fire_res feeds, so tree and
    // gear raise the 75% cap together.
    fire_res_max: { channel: 'fireResistMax', en: '+{v}% to maximum Fire Resistance', de: '+{v}% auf maximalen Feuerwiderstand' },
    // Maximum resistances (resistance batch, nodes 30308/30312/250): feed
    // the same cap buckets gear's max_*_res mods feed (see
    // _egGetPlayerResistCap). all_elemental_res_max raises fire, cold and
    // lightning only - shadow is excluded, exactly like allElementalResist.
    cold_res_max: { channel: 'coldResistMax', en: '+{v}% to maximum Cold Resistance', de: '+{v}% auf maximalen Kältewiderstand' },
    lightning_res_max: { channel: 'lightningResistMax', en: '+{v}% to maximum Lightning Resistance', de: '+{v}% auf maximalen Blitzwiderstand' },
    all_elemental_res_max: { channel: 'allElementalResistMax', en: '+{v}% to all maximum Elemental Resistances', de: '+{v}% auf alle maximalen elementaren Widerstände' },
    spell_damage_inc_pct: { channel: 'spellDamageIncPct', en: '{v}% increased Spell Damage', de: '{v}% erhöhter Zauberschaden' },
    elemental_damage_inc_pct: { channel: 'elementalDamageIncPct', en: '{v}% increased Elemental Damage', de: '{v}% erhöhter elementarer Schaden' },
    fire_damage_inc_pct: { channel: 'fireDamageIncPct', en: '{v}% increased Fire Damage', de: '{v}% erhöhter Feuerschaden' },
    cold_damage_inc_pct: { channel: 'coldDamageIncPct', en: '{v}% increased Cold Damage', de: '{v}% erhöhter Kälteschaden' },
    lightning_damage_inc_pct: { channel: 'lightningDamageIncPct', en: '{v}% increased Lightning Damage', de: '{v}% erhöhter Blitzschaden' },

    // Projectile batch (nodes 97/30867/30866/30865/20101/30868/30869/30864/
    // 30856/30855/30858/30859/20102). "Projectile" = every shot the player
    // fires from a revealed cell (the _egCalcPlayerDamage channel).
    // projectile_damage_inc multiplies the whole roll (physical + elemental,
    // before crit) in _egCalcPlayerDamage; projectile_crit_chance is added to
    // the crit chance of that same roll; projectile_speed shortens every
    // player projectile's flight time (_egAnimatePlayerProjectile).
    projectile_damage_inc: { channel: 'projectileDamageIncPct', en: '{v}% increased Projectile Damage', de: '{v}% erhöhter Projektilschaden' },
    // Added to the crit multiplier (base 150%) of projectile rolls only.
    projectile_crit_multi: { channel: 'projectileCritMultiplierPct', en: '+{v}% to Critical Strike Multiplier with Projectiles', de: '+{v}% auf den kritischen Schadensmultiplikator mit Projektilen' },
    projectile_speed: { channel: 'projectileSpeedPct', en: '{v}% increased Projectile Speed', de: '{v}% erhöhte Projektilgeschwindigkeit' },
    projectile_crit_chance: { channel: 'projectileCritChancePct', en: '+{v}% to Critical Strike Chance with Projectiles', de: '+{v}% auf die kritische Trefferchance mit Projektilen' },
    // Bow spells (nodes 30857/20102/30858/30859): spells carrying the Bow tag.
    // No spell has that tag yet, so these two stats are tracked and shown on
    // the sheet but nothing consumes them until bow spells exist (the spell
    // damage code should read stats.bowSpellDamageIncPct, and the
    // damage-over-time code stats.bowSpellDotIncPct for Bow + DoT spells).
    bow_spell_damage_inc: { channel: 'bowSpellDamageIncPct', en: '{v}% increased Damage with Bow spells', de: '{v}% erhöhter Schaden mit Bogenzaubern' },
    bow_spell_dot_inc: { channel: 'bowSpellDotIncPct', en: 'Bow spells deal {v}% increased Damage over Time', de: 'Bogenzauber verursachen {v}% erhöhten Schaden über Zeit' },

    // Flat bonus to every Heart pickup (node 248): rides the heartHealFlat
    // bucket gear's heart_heal feeds (_egCalcHeartHeal).
    heart_heal_flat: { channel: 'heartHealFlat', en: 'Hearts heal for {v} more Life', de: 'Herzen heilen {v} mehr Leben' },
    // Mana on projectile hit (node 400): every projectile that connects
    // (after the accuracy roll) grants this much Mana, see
    // _egResolveProjectileImpact.
    mana_on_projectile_hit: { channel: 'manaOnProjectileHitPct', en: 'Gain {v} Mana whenever you hit with a Projectile', de: 'Erhalte {v} Mana, wenn du mit einem Projektil triffst' },
    // Bow spells (nodes 31008/31009/400): tracked only until Bow-tagged spells
    // exist (the spell cost code should read stats.bowSpellManaCostReducedPct).
    bow_spell_mana_reduced: { channel: 'bowSpellManaCostReducedPct', en: '{v}% reduced Mana Cost of Bow spells', de: '{v}% reduzierte Manakosten von Bogenzaubern' },
    // Frenzy Charges (nodes 30788/20126/30791): cap, duration and the
    // evasion-per-charge line; see combat-ailments-state.js.
    frenzy_max: { channel: 'frenzyChargesMax', en: '+{v} to maximum Frenzy Charges', de: '+{v} auf maximale Raserei-Ladungen' },
    frenzy_duration: { channel: 'frenzyDurationPct', en: '{v}% increased Frenzy Charge Duration', de: '{v}% erhöhte Dauer von Raserei-Ladungen' },
    evasion_per_frenzy: { channel: 'evasionPerFrenzyChargePct', en: '{v}% increased Evasion Rating per Frenzy Charge', de: '{v}% erhöhte Ausweichwertung pro Raserei-Ladung' },
    // Life on projectile hit (nodes 30881/30880/20110): rolled for every
    // projectile that connects (after the accuracy roll) in
    // _egResolveProjectileImpact. The burst amount is fixed (300) and part
    // of the tooltip text; the value is the chance.
    life_on_projectile_hit: { channel: 'lifeOnProjectileHit', en: 'Gain {v} Life whenever a Projectile hits an enemy', de: 'Erhalte {v} Leben, wenn ein Projektil einen Gegner trifft' },
    life_burst_on_projectile_hit: { channel: 'lifeBurstOnProjectileHitChancePct', en: '{v}% Chance to gain 300 Life when a Projectile hits an enemy', de: '{v}% Chance, 300 Leben zu erhalten, wenn ein Projektil einen Gegner trifft' },
    // Shadow damage / mana on kill (nodes 30895/30898/30106/30105/30103/20020).
    // shadow_damage_inc_pct scales the shadow share of every player hit
    // (combat-calculations.js); mana_on_kill_flat feeds the existing
    // manaOnKill stat read in encounter-kills.js.
    shadow_damage_inc_pct: { channel: 'shadowDamageIncPct', en: '{v}% increased Shadow Damage', de: '{v}% erhöhter Schattenschaden' },
    // damage_inc_pct (nodes 30102/30149): generic "increased Damage" - one
    // multiplier over the whole physical + elemental hit (melee AND
    // projectile), applied before crit in combat-calculations.js.
    damage_inc_pct: { channel: 'damageIncPct', en: '{v}% increased Damage', de: '{v}% erhöhter Schaden' },
    // life_on_kill_flat (node 399) feeds the existing lifeOnKill stat read in
    // encounter-kills.js (gear's life_on_kill bucket adds on top).
    life_on_kill_flat: { channel: 'lifeOnKillFlat', en: 'Gain {v} Life per Enemy Killed', de: 'Erhalte {v} Leben pro getötetem Gegner' },
    mana_on_kill_flat: { channel: 'manaOnKillFlat', en: 'Gain {v} Mana per Enemy Killed', de: 'Erhalte {v} Mana pro getötetem Gegner' },
    // Leech / crit / shadow resistance (nodes 30888/20109/30889/20111/30884).
    // life_leech_attack feeds the shared lifeLeechPct (melee AND projectile
    // hits); life_leech_effect_inc scales every leech heal (_egLeechHealMult);
    // crit_chance_flat adds to the base crit chance (melee + projectile).
    life_leech_attack: { channel: 'lifeLeechPct', en: '+{v}% of Attack Damage leeched as Life', de: '+{v}% des Angriffsschadens als Leben entzogen' },
    life_leech_effect_inc: { channel: 'lifeLeechEffectIncPct', en: '{v}% increased Life recovered from Leech', de: '{v}% erhöhtes durch Lebensentzug erhaltenes Leben' },
    shadow_resist_flat: { channel: 'shadowResistFlat', en: '+{v}% to Shadow Resistance', de: '+{v}% Schattenwiderstand' },
    crit_chance_flat: { channel: 'critChanceFlat', en: '+{v}% to Critical Strike Chance', de: '+{v}% auf die kritische Trefferchance' },
    // Dagger / crit-ailment / poison duration (nodes 30891/30892/30890/30883/238).
    // The dagger lines read stats.isDaggerEquipped (weapon family 'dagger').
    dot_inc_dagger: { channel: 'dotIncDaggerPct', en: '{v}% increased Damage over Time while wielding a Dagger', de: '{v}% erhöhter Schaden über Zeit mit einem Dolch' },
    // crit_chance_dagger (node 31190): flat crit chance that only applies to
    // melee strikes while a dagger is equipped (combat-calculations.js).
    // crit_multi_flat (node 22): generic Critical Strike Multiplier, adds to the
    // 150% base of EVERY crit (melee + projectile) via critMultiplierPct. The
    // scoped lines (daggers, maces, projectiles) stack on top of it.
    crit_multi_flat: { channel: 'critMultiplierFlatPct', en: '+{v}% to Critical Strike Multiplier', de: '+{v}% auf den kritischen Schadensmultiplikator' },
    // mana_regen_inc_pct (node 168): scales the whole mana regen tick
    // (base + gear manaRegen) in class-mana.js.
    mana_regen_inc_pct: { channel: 'manaRegenIncPct', en: '{v}% increased Mana Regeneration Rate', de: '{v}% erhöhte Manaregenerationsrate' },
    // Spell-only crit lines (nodes 31487/31488/31490/31489/20026): added to the
    // crit roll of spell hits only (universal-spells.js _uspRollCritMult), on
    // top of the generic crit chance / multiplier.
    spell_crit_chance: { channel: 'spellCritChancePct', en: '+{v}% to Critical Strike Chance with Spells', de: '+{v}% auf die kritische Trefferchance mit Zaubern' },
    spell_crit_multi: { channel: 'spellCritMultiplierPct', en: '+{v}% to Critical Strike Multiplier with Spells', de: '+{v}% auf den kritischen Schadensmultiplikator mit Zaubern' },
    // Chill effect (node 31491): scales the slow of chills YOU inflict on
    // enemies (_egGetMonsterChargeMultiplier). Absorption leech (nodes
    // 30128/387): spell hits leech a share of their damage as Absorption
    // (_egLeechAbsorption); the effect line scales every such recovery.
    chill_effect_inc_pct: { channel: 'chillEffectIncPct', en: '{v}% increased Effect of Chill', de: '{v}% erhöhte Wirkung von Unterkühlung' },
    absorption_leech_spell: { channel: 'absorptionLeechSpellPct', en: '+{v}% of Spell Damage leeched as Absorption', de: '+{v}% des Zauberschadens als Absorption entzogen' },
    absorption_leech_effect_inc: { channel: 'absorptionLeechEffectIncPct', en: '{v}% increased Absorption recovered from Leech', de: '{v}% erhöhte durch Entzug erhaltene Absorption' },
    // Gain X% of physical Damage as extra Shadow (node 20218): mirrors
    // phys_as_fire; handled in _egApplyDamageConversion (extra, not converted).
    phys_as_shadow: { channel: 'physAsExtraShadowPct', en: 'Gain {v}% of physical Damage as extra Shadow Damage', de: 'Erhalte {v}% des physischen Schadens als zusätzlichen Schattenschaden' },
    // Life Recoup (nodes 30950/30949/20120): a share of the Life damage you
    // take is paid back as Life over about 4 seconds (pool filled in
    // _egPlayerTakeDamage, drained in _egTickLifeRegen).
    life_recoup_pct: { channel: 'lifeRecoupPct', en: '{v}% of Damage taken Recouped as Life', de: '{v}% des erlittenen Schadens werden als Leben zurückgewonnen' },
    // Damage with Daggers (node 30941): multiplier over the whole melee hit
    // while a dagger is the equipped weapon family.
    dagger_damage_inc: { channel: 'daggerDamageIncPct', en: '{v}% increased melee Damage with Daggers', de: '{v}% erhöhter Nahkampfschaden mit Dolchen' },
    // Ghost Reaver keystone (node 219): every Life leech (melee, projectile,
    // spell) refills Absorption instead of Life (_egLeechAbsorption), and the
    // Absorption recharge is switched off (_egScheduleAbsorptionRegen).
    leech_as_absorption: { channel: 'lifeLeechAsAbsorption', flag: true, en: 'Life Leech recovers Absorption instead of Life', de: 'Lebensentzug stellt stattdessen Absorption wieder her' },
    absorption_no_recharge: { channel: 'absorptionNoRecharge', flag: true, en: 'Cannot Recharge Absorption', de: 'Absorption kann sich nicht aufladen' },
    // Dagger charge-up speed (nodes 30942-30944/20119): shortens the melee
    // charge interval only while a dagger is equipped (mirrors the sword/axe lines).
    dagger_charge_speed: { channel: 'daggerChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while wielding a Dagger', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit mit Dolch' },
    // Absorption on kill (nodes 30928/30956): flat Absorption per kill,
    // paid out by the existing kill hook (encounter-kills.js).
    absorption_on_kill_flat: { channel: 'absorptionOnKillFlat', en: 'Gain {v} Absorption per Enemy Killed', de: 'Erhalte {v} Absorption pro getötetem Gegner' },
    crit_chance_dagger: { channel: 'critChanceDaggerPct', en: '+{v}% to melee Critical Strike Chance with Daggers', de: '+{v}% auf die kritische Nahkampf-Trefferchance mit Dolchen' },
    crit_multi_dagger: { channel: 'critMultiplierDaggerPct', en: '+{v}% to melee Critical Strike Multiplier with Daggers', de: '+{v}% auf den kritischen Nahkampf-Schadensmultiplikator mit Dolchen' },
    poison_duration: { channel: 'poisonDurationPct', en: '{v}% increased Poison Duration on enemies', de: '{v}% erhöhte Giftdauer bei Gegnern' },
    crit_dot_multi: { channel: 'critDotMultiPct', en: '+{v}% to the Damage over Time Multiplier for Ailments from Critical Strikes', de: '+{v}% auf den Schaden-über-Zeit-Multiplikator für Statuseffekte durch kritische Treffer' },
    // Damage over Time (nodes 20112/30919/30924/...): scales the stored dps of
    // every DoT ailment you inflict (ignite, bleed, poison) once, when it is
    // applied (_egAilmentDamageMult).
    dot_inc_pct: { channel: 'dotIncPct', en: '{v}% increased Damage over Time', de: '{v}% erhöhter Schaden über Zeit' },
    // Skill Effect Duration (nodes 20112/339): tracked on the stat sheet for
    // the buff spells to come - they read stats.skillEffectDurationPct.
    skill_effect_duration: { channel: 'skillEffectDurationPct', en: '{v}% increased Skill Effect Duration', de: '{v}% erhöhte Dauer von Fertigkeitseffekten' },
    // Life on attack hits (nodes 30841/30842/357): melee-only and
    // melee + projectile variants, see encounter-melee-impact.js and
    // encounter-player-attacks.js.
    life_on_melee_hit: { channel: 'lifeOnMeleeHit', en: 'Gain {v} Life whenever a Melee strike hits an enemy', de: 'Erhalte {v} Leben, wenn ein Nahkampfschlag einen Gegner trifft' },
    life_on_attack_hit: { channel: 'lifeOnAttackHit', en: 'Gain {v} Life per Enemy hit with Attacks', de: 'Erhalte {v} Leben pro getroffenem Gegner mit Angriffen' },
    // Poison (nodes 30834/30835): shadow damage over time, see
    // combat-ailments-core.js (_egRollPlayerHitAilments).
    poison_chance_attack: { channel: 'poisonChanceAttackPct', en: '{v}% Chance to Poison on Hit with Attacks', de: '{v}% Chance, bei Angriffstreffern zu vergiften' },
    poison_dot_multi: { channel: 'poisonDotMultiPct', en: '+{v}% to the Damage over Time Multiplier for Poison', de: '+{v}% auf den Schaden-über-Zeit-Multiplikator für Gift' },
    // Grid pickup spawn weights (nodes 30917/20103): scale the weight of the
    // heart / mana family in the ambient pickup roll (combat-grid-pickups.js).
    heart_spawn_inc: { channel: 'heartSpawnIncPct', en: '{v}% increased chance for Hearts to appear on the Grid', de: '{v}% erhöhte Chance, dass Herzen auf dem Raster erscheinen' },
    mana_spawn_inc: { channel: 'manaSpawnIncPct', en: '{v}% increased chance for Mana pickups to appear on the Grid', de: '{v}% erhöhte Chance, dass Mana-Pickups auf dem Raster erscheinen' },
    // Stun avoidance (nodes 30860/30863/20100): tracked and shown only - no
    // enemy can stun the player yet.
    stun_avoid: { channel: 'stunAvoidPct', en: '{v}% Chance to avoid being Stunned', de: '{v}% Chance, nicht betäubt zu werden' },
    // Mana batch (nodes 30861/30862/226): pickups ride the existing
    // manaHealIncPct bucket gear's inc_mana_heal feeds (_egCalcManaGain);
    // the melee line is the ONLY built-in source of mana on melee hits
    // (_egApplyPlayerMeleeImpact: strike must be above 50% charge).
    mana_pickup_effect: { channel: 'manaHealIncPct', en: 'Mana pickups have {v}% increased effect', de: 'Mana-Pickups haben {v}% erhöhte Wirkung' },
    mana_on_melee_hit_charged: { channel: 'manaOnMeleeHitChargedPct', en: 'Gain {v} Mana when you hit an enemy with a melee attack above 50% charge-up', de: 'Erhalte {v} Mana, wenn du einen Gegner mit einem Nahkampfangriff über 50% Aufladung triffst' },
    // Melee crit (node 305): added to the crit chance of melee strikes only.
    crit_chance_melee: { channel: 'critChanceMeleePct', en: '+{v}% to Critical Strike Chance with melee attacks', de: '+{v}% auf die kritische Trefferchance mit Nahkampfangriffen' },
    // Elemental damage of projectiles (node 30783): additive with the
    // general increased elemental damage, projectile channel only.
    projectile_elemental_damage_inc: { channel: 'projectileElementalDamageIncPct', en: '{v}% increased Elemental Damage with Projectiles', de: '{v}% erhöhter elementarer Schaden mit Projektilen' },

    // --- speed ------------------------------------------------------------
    attack_speed_pct: { channel: 'attackSpeedPct', en: '{v}% increased Attack Speed', de: '{v}% erhöhte Angriffsgeschwindigkeit' },
    melee_charge_speed_pct: { channel: 'meleeChargeSpeedPct', en: '{v}% increased melee attack charge-up speed', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit' },
    // Life leech from the tree (grit batch, nodes 30257/30258/20043): MELEE
    // attacks only. It is a separate channel from the gear leech bucket
    // (lifeLeechPct, which heals off every hit including spells and
    // projectiles) and is applied only in _egCalcPlayerMeleeDamage
    // (combat-calculations.js). Supports fractions (0.4).
    life_leech_melee: { channel: 'lifeLeechMeleePct', en: '+{v}% of melee attack Damage leeched as Life', de: '+{v}% des Nahkampfangriffsschadens als Leben entzogen' },
    cast_speed_pct: { channel: 'castSpeedPct', en: '{v}% increased Cast Speed', de: '{v}% erhöhte Zaubergeschwindigkeit' },
    movement_speed_pct: { channel: 'movementSpeedPct', en: '{v}% increased Movement Speed', de: '{v}% erhöhte Bewegungsgeschwindigkeit' },
    // --- hand-written legacy nodes moved onto the registry (2026-10 audit) --
    // Mana / Absorption maxima and increases (Trix hub nodes 134/256/31212/
    // 31213/31214/31217/31230/31244/31478/31479).
    mana_inc_pct: { channel: 'manaIncPct', en: '{v}% increased maximum Mana', de: '{v}% erhöhtes maximales Mana' },
    // "Less" maximum Mana (Butterfly Effect keystone downside): a separate
    // multiplier on the whole Mana pool (base + gear), applied in
    // _getPlayerMaxMana() (class-mana.js) after every increased source.
    mana_less_pct: { channel: 'manaLessPct', en: '{v}% less maximum Mana', de: '{v}% weniger maximales Mana' },
    absorption_flat: { channel: 'absorptionFlat', en: '+{v} to maximum Absorption', de: '+{v} auf maximale Absorption' },
    absorption_inc_pct: { channel: 'absorptionIncPct', en: '{v}% increased maximum Absorption', de: '{v}% erhöhte maximale Absorption' },
    absorption_regen_rate_pct: { channel: 'absorptionRegenRatePct', en: '{v}% increased Absorption regeneration rate', de: '{v}% erhöhte Absorptionsregenerationsrate' },
    // Element-specific cast speed (nodes 110/20174/20175): only counts for
    // spells of that element (spell-casttime.js), on top of cast_speed_pct.
    cast_speed_fire: { channel: 'fireCastSpeedPct', en: '{v}% increased Cast Speed with Fire Skills', de: '{v}% erhöhte Zaubergeschwindigkeit mit Feuerzaubern' },
    cast_speed_cold: { channel: 'coldCastSpeedPct', en: '{v}% increased Cast Speed with Cold Skills', de: '{v}% erhöhte Zaubergeschwindigkeit mit Kältezaubern' },
    cast_speed_lightning: { channel: 'lightningCastSpeedPct', en: '{v}% increased Cast Speed with Lightning Skills', de: '{v}% erhöhte Zaubergeschwindigkeit mit Blitzzaubern' },
    // While holding a cast-time spell button, an incoming ailment is avoided
    // with this chance (_egTryAvoidAilmentWhileCasting, nodes 130/31477/31480).
    // Chance to avoid being Bled / Poisoned by monster hits
    // (_egTryAvoidPlayerAilmentStat in combat-ailments-core.js; nodes 31071...).
    avoid_bleed_pct: { channel: 'bleedAvoidPct', en: '{v}% chance to Avoid Bleeding', de: '{v}% Chance, Blutung zu vermeiden' },
    avoid_poison_pct: { channel: 'poisonAvoidPct', en: '{v}% chance to Avoid being Poisoned', de: '{v}% Chance, Vergiftung zu vermeiden' },
    // Elemental ailment avoidance (nodes 30766/30767/30764/30765/20156):
    // rolled in _egRollMonsterHitAilment after the base ailment chance.
    avoid_shock_pct: { channel: 'shockAvoidPct', en: '{v}% chance to Avoid being Shocked', de: '{v}% Chance, nicht geschockt zu werden' },
    avoid_ignite_pct: { channel: 'igniteAvoidPct', en: '{v}% chance to Avoid being Ignited', de: '{v}% Chance, nicht entzündet zu werden' },
    avoid_chill_pct: { channel: 'chillAvoidPct', en: '{v}% chance to Avoid being Chilled or Frozen', de: '{v}% Chance, nicht unterkühlt oder eingefroren zu werden' },
    avoid_elemental_ailment_pct: { channel: 'elementalAilmentAvoidPct', en: '{v}% chance to Avoid Elemental Ailments', de: '{v}% Chance, elementare Statuseffekte zu vermeiden' },
    // Tree-sourced Chance to Ignite on Hit (nodes 30648/30649/30650): seeds the
    // same ignitePct stat gear uses; still needs fire damage in the hit.
    ignite_chance_pct: { channel: 'igniteChancePct', en: '+{v}% Chance to Ignite on Hit', de: '+{v}% Chance, bei Treffern zu entzünden' },
    // Weapon-family (sword/axe/staff/wand) and dual-wield lines, extra cold/lightning,
    // tree freeze/shock chance and per-element penetration (PoE-port phase A).
    crit_chance_sword: { channel: 'critChanceSwordPct', en: '+{v}% to Critical Strike Chance with Swords', de: '+{v}% auf die kritische Trefferchance mit Schwertern' },
    crit_multi_sword: { channel: 'critMultiplierSwordPct', en: '+{v}% to Critical Strike Multiplier with Swords', de: '+{v}% auf den kritischen Schadensmultiplikator mit Schwertern' },
    crit_chance_axe: { channel: 'critChanceAxePct', en: '+{v}% to Critical Strike Chance with Axes', de: '+{v}% auf die kritische Trefferchance mit Äxten' },
    crit_multi_axe: { channel: 'critMultiplierAxePct', en: '+{v}% to Critical Strike Multiplier with Axes', de: '+{v}% auf den kritischen Schadensmultiplikator mit Äxten' },
    staff_damage: { channel: 'staffDamageIncPct', en: '{v}% increased physical melee Damage with Staves', de: '{v}% erhöhter physischer Nahkampfschaden mit Stäben' },
    staff_charge_speed: { channel: 'staffChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while wielding a Staff', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit mit Stab' },
    crit_chance_staff: { channel: 'critChanceStaffPct', en: '+{v}% to Critical Strike Chance with Staves', de: '+{v}% auf die kritische Trefferchance mit Stäben' },
    crit_multi_staff: { channel: 'critMultiplierStaffPct', en: '+{v}% to Critical Strike Multiplier with Staves', de: '+{v}% auf den kritischen Schadensmultiplikator mit Stäben' },
    wand_damage: { channel: 'wandDamageIncPct', en: '{v}% increased physical melee Damage with Wands', de: '{v}% erhöhter physischer Nahkampfschaden mit Zauberstäben' },
    wand_charge_speed: { channel: 'wandChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while wielding a Wand', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit mit Zauberstab' },
    crit_chance_wand: { channel: 'critChanceWandPct', en: '+{v}% to Critical Strike Chance with Wands', de: '+{v}% auf die kritische Trefferchance mit Zauberstäben' },
    crit_multi_wand: { channel: 'critMultiplierWandPct', en: '+{v}% to Critical Strike Multiplier with Wands', de: '+{v}% auf den kritischen Schadensmultiplikator mit Zauberstäben' },
    dual_damage: { channel: 'dualDamageIncPct', en: '{v}% increased Damage while Dual Wielding', de: '{v}% erhöhter Schaden beim Beidhändigen Kämpfen' },
    dual_charge_speed: { channel: 'dualChargeSpeedPct', en: '{v}% increased melee attack charge-up speed while Dual Wielding', de: '{v}% erhöhte Nahkampf-Aufladegeschwindigkeit beim Beidhändigen Kämpfen' },
    dual_accuracy: { channel: 'dualAccuracyIncPct', en: '{v}% increased Accuracy Rating while Dual Wielding', de: '{v}% erhöhte Präzision beim Beidhändigen Kämpfen' },
    dual_crit_chance: { channel: 'dualCritChancePct', en: '+{v}% to Critical Strike Chance while Dual Wielding', de: '+{v}% auf die kritische Trefferchance beim Beidhändigen Kämpfen' },
    dual_crit_multi: { channel: 'dualCritMultiPct', en: '+{v}% to Critical Strike Multiplier while Dual Wielding', de: '+{v}% auf den kritischen Schadensmultiplikator beim Beidhändigen Kämpfen' },
    dual_cast_speed: { channel: 'dualCastSpeedPct', en: '{v}% increased Cast Speed while Dual Wielding', de: '{v}% erhöhtes Zaubertempo beim Beidhändigen Kämpfen' },
    dual_spell_damage: { channel: 'dualSpellDamagePct', en: '{v}% increased Spell Damage while Dual Wielding', de: '{v}% erhöhter Zauberschaden beim Beidhändigen Kämpfen' },
    dual_move_speed: { channel: 'dualMoveSpeedPct', en: '{v}% increased Movement Speed while Dual Wielding', de: '{v}% erhöhte Bewegungsgeschwindigkeit beim Beidhändigen Kämpfen' },
    dual_block: { channel: 'dualBlockPct', en: '+{v}% Chance to Block Attack Damage while Dual Wielding', de: '+{v}% Chance, Angriffsschaden beim Beidhändigen Kämpfen zu blocken' },
    phys_as_cold: { channel: 'physAsExtraColdPct', en: 'Gain {v}% of physical Damage as extra Cold Damage', de: 'Erhalte {v}% des physischen Schadens als zusätzlichen Kälteschaden' },
    phys_as_lightning: { channel: 'physAsExtraLightningPct', en: 'Gain {v}% of physical Damage as extra Lightning Damage', de: 'Erhalte {v}% des physischen Schadens als zusätzlichen Blitzschaden' },
    freeze_chance_pct: { channel: 'freezeChancePct', en: '+{v}% Chance to Freeze on Hit', de: '+{v}% Chance, bei Treffern einzufrieren' },
    shock_chance_pct: { channel: 'shockChancePct', en: '+{v}% Chance to Shock on Hit', de: '+{v}% Chance, bei Treffern zu schocken' },
    pen_fire: { channel: 'penFirePct', en: 'Damage Penetrates {v}% of Enemy Fire Resistance', de: 'Schaden durchdringt {v}% des Feuerwiderstands von Gegnern' },
    pen_cold: { channel: 'penColdPct', en: 'Damage Penetrates {v}% of Enemy Cold Resistance', de: 'Schaden durchdringt {v}% des Kältewiderstands von Gegnern' },
    pen_lightning: { channel: 'penLightningPct', en: 'Damage Penetrates {v}% of Enemy Lightning Resistance', de: 'Schaden durchdringt {v}% des Blitzwiderstands von Gegnern' },
    pen_shadow: { channel: 'penShadowPct', en: 'Damage Penetrates {v}% of Enemy Shadow Resistance', de: 'Schaden durchdringt {v}% des Schattenwiderstands von Gegnern' },
    pen_elemental: { channel: 'penElementalPct', en: 'Damage Penetrates {v}% of Enemy Elemental Resistances', de: 'Schaden durchdringt {v}% der Elementarwiderstände von Gegnern' },
    staff_block: { channel: 'staffBlockPct', en: '+{v}% Chance to Block Attack Damage while wielding a Staff', de: '+{v}% Chance, Angriffsschaden mit einem Stab zu blocken' },
    staff_spell_block: { channel: 'staffSpellBlockPct', en: '+{v}% Chance to Block Spell Damage while wielding a Staff', de: '+{v}% Chance, Zauberschaden mit einem Stab zu blocken' },
    shield_spell_block: { channel: 'shieldSpellBlockPct', en: '+{v}% Chance to Block Spell Damage while holding a Shield', de: '+{v}% Chance, Zauberschaden mit einem Schild zu blocken' },
    // Phase B: Power charges, charge sources, Blind, Fortify, stun chance, Riposte,
    // dagger poison (see combat-ailments-state.js).
    power_max: { channel: 'powerChargesMax', en: '+{v} to Maximum Power Charges', de: '+{v} auf maximale Kraftladungen' },
    power_duration: { channel: 'powerDurationPct', en: '{v}% increased Power Charge Duration', de: '{v}% erhöhte Dauer der Kraftladungen' },
    power_on_crit: { channel: 'powerOnCritPct', en: '{v}% chance to gain a Power Charge on Critical Strike', de: '{v}% Chance auf eine Kraftladung bei kritischen Treffern' },
    power_on_kill: { channel: 'powerOnKillPct', en: '{v}% chance to gain a Power Charge on Kill', de: '{v}% Chance auf eine Kraftladung bei Tötung' },
    power_on_block: { channel: 'powerOnBlockPct', en: '{v}% chance to gain a Power Charge when you Block', de: '{v}% Chance auf eine Kraftladung beim Blocken' },
    power_on_stun: { channel: 'powerOnStunPct', en: '{v}% chance to gain a Power Charge when you Stun with Melee Damage', de: '{v}% Chance auf eine Kraftladung beim Betäuben mit Nahkampf' },
    power_damage: { channel: 'powerDamagePerChargePct', en: '{v}% increased Damage per Power Charge', de: '{v}% erhöhter Schaden pro Kraftladung' },
    frenzy_on_kill: { channel: 'frenzyOnKillPct', en: '{v}% chance to gain a Frenzy Charge on Kill', de: '{v}% Chance auf eine Raserei-Ladung bei Tötung' },
    frenzy_on_block: { channel: 'frenzyOnBlockPct', en: '{v}% chance to gain a Frenzy Charge when you Block', de: '{v}% Chance auf eine Raserei-Ladung beim Blocken' },
    endurance_on_block: { channel: 'enduranceOnBlockPct', en: '{v}% chance to gain an Endurance Charge when you Block', de: '{v}% Chance auf eine Ausdauerladung beim Blocken' },
    endurance_on_melee_crit: { channel: 'enduranceOnMeleeCritPct', en: '{v}% chance to gain an Endurance Charge on Melee Critical Strike', de: '{v}% Chance auf eine Ausdauerladung bei kritischen Nahkampftreffern' },
    blind_chance: { channel: 'blindChancePct', en: '{v}% chance to Blind enemies on Hit with Attacks', de: '{v}% Chance, Gegner bei Angriffstreffern zu blenden' },
    blind_effect: { channel: 'blindEffectIncPct', en: '{v}% increased Blind Effect', de: '{v}% erhöhte Blendwirkung' },
    crit_vs_blinded: { channel: 'critChanceVsBlindedPct', en: '+{v}% to Critical Strike Chance against Blinded enemies', de: '+{v}% auf die kritische Trefferchance gegen geblendete Gegner' },
    fortify_max: { channel: 'fortifyMax', en: '+{v} to maximum Fortification', de: '+{v} auf maximale Befestigung' },
    fortify_duration: { channel: 'fortifyDurationPct', en: '{v}% increased Fortification Duration', de: '{v}% erhöhte Befestigungsdauer' },
    fortify_on_stun: { channel: 'fortifyOnStunPct', en: 'Melee Hits which Stun have {v}% chance to Fortify', de: 'Betäubende Nahkampftreffer haben {v}% Chance zu befestigen' },
    fortify_effect: { channel: 'fortifyEffectIncPct', en: '{v}% increased Effect of Fortification', de: '{v}% erhöhte Wirkung der Befestigung' },
    fortified_defences: { channel: 'fortifiedDefencePct', en: '{v}% increased Armour and Evasion Rating while Fortified', de: '{v}% erhöhte Rüstung und Ausweichwertung mit Befestigung' },
    stun_chance: { channel: 'stunChancePct', en: '{v}% chance to Stun on Melee Hit', de: '{v}% Chance, bei Nahkampftreffern zu betäuben' },
    riposte_damage: { channel: 'riposteDamagePct', en: 'Riposte strikes deal {v}% more Damage', de: 'Riposte-Schläge verursachen {v}% mehr Schaden' },
    riposte_duration: { channel: 'riposteDurationPct', en: '{v}% increased Riposte Duration', de: '{v}% erhöhte Riposte-Dauer' },
    dagger_poison_chance: { channel: 'poisonChanceDaggerPct', en: '{v}% chance to Poison on Hit with Daggers', de: '{v}% Chance, bei Treffern mit Dolchen zu vergiften' },
    dagger_crit_poison: { channel: 'daggerCritPoisons', flag: true, en: 'Critical Strikes with Daggers Poison the Enemy', de: 'Kritische Treffer mit Dolchen vergiften den Gegner' },
    rage_max_add: { channel: 'rageMax', en: '+{v} to Maximum Rage', de: '+{v} auf maximale Wut' },
    rage_decay: { channel: 'rageDecaySlowerPct', en: 'Inherent loss of Rage is {v}% slower', de: 'Der natürliche Wutverlust ist {v}% langsamer' },
    rage_armour: { channel: 'ragePerArmourPct', en: 'Every point of Rage also grants {v}% increased Armour', de: 'Jeder Wutpunkt gewährt außerdem {v}% erhöhte Rüstung' },
    rage_when_hit: { channel: 'rageWhenHitAmount', en: 'Gain {v} Rage when Hit by an Enemy', de: 'Erhalte {v} Wut, wenn ein Gegner dich trifft' },
    // Phase C-1 (batch 34): per-charge lines, faster ailments, spell DoT, conditional and
    // shield lines, leech and defence extras.
    dmg_full_absorption: { channel: 'dmgFullAbsorptionPct', en: '{v}% increased Damage while on Full Absorption', de: '{v}% erhöhter Schaden bei voller Absorption' },
    crit_multi_heavy: { channel: 'critMultiHeavy', en: '+{v}% to Critical Strike Multiplier with Heavy weapons', de: '+{v}% kritischer Trefferschaden mit schweren Waffen' },
    dmg_vs_low_life: { channel: 'dmgVsLowLifePct', en: '{v}% increased Damage against enemies on Low Life', de: '{v}% erhöhter Schaden gegen Gegner mit wenig Leben' },
    aoe_recent_kill: { channel: 'aoeRecentKillPct', en: '{v}% increased Area of Effect if you Killed Recently', de: '{v}% erhöhter Wirkungsbereich, wenn du kürzlich getötet hast' },
    ailment_duration_taken: { channel: 'ailmentDurationTakenPct', en: '{v}% reduced Duration of Ailments on you', de: '{v}% verringerte Dauer von Zuständen auf dir' },
    chill_shock_effect_taken: { channel: 'chillShockTakenPct', en: '{v}% reduced Effect of Chill and Shock on you', de: '{v}% verringerte Wirkung von Kälte und Schock auf dir' },
    spell_dot_multi: { channel: 'spellDotMultiPct', en: '+{v}% to the Damage over Time Multiplier with Spells', de: '+{v}% auf den Schaden-über-Zeit-Multiplikator mit Zaubern' },
    mana_leech_attack: { channel: 'manaLeechAttackPct', en: '+{v}% of Attack Damage leeched as Mana', de: '+{v}% des Angriffsschadens als Mana entzogen' },
    spell_block_flat: { channel: 'spellBlockFlat', en: '+{v}% Chance to Block Spell Damage', de: '+{v}% Chance, Zauberschaden zu blocken' },
    dmg_recent_shock: { channel: 'dmgRecentShockPct', en: '{v}% increased Damage if you Shocked an enemy Recently', de: '{v}% erhöhter Schaden, wenn du kürzlich geschockt hast' },
    lightning_ailment_duration: { channel: 'shockDurationPct', en: '{v}% increased Duration of Shock on enemies', de: '{v}% erhöhte Schockdauer auf Gegnern' },
    shock_effect_inc: { channel: 'shockEffectPct', en: '{v}% increased Effect of Shock', de: '{v}% erhöhte Wirkung von Schock' },
    life_pulse: { channel: 'lifePulsePct', en: 'Every 4 seconds, Regenerate {v}% of Life over one second', de: 'Alle 4 Sekunden regenerierst du {v}% Leben über eine Sekunde' },
    dot_faster: { channel: 'dotFasterPct', en: 'Damaging Ailments deal Damage {v}% faster', de: 'Schadensbringende Zustände verursachen Schaden {v}% schneller' },
    endurance_min: { channel: 'enduranceMin', en: '+{v} to Minimum Endurance Charges', de: '+{v} auf minimale Ausdauerladungen' },
    endurance_on_kill: { channel: 'enduranceOnKillPct', en: '{v}% chance to gain an Endurance Charge on Kill', de: '{v}% Chance auf eine Ausdauerladung bei Tötung' },
    damage_per_endurance: { channel: 'damagePerEndurancePct', en: '{v}% increased Damage per Endurance Charge', de: '{v}% erhöhter Schaden pro Ausdauerladung' },
    endurance_when_hit: { channel: 'enduranceWhenHitPct', en: '{v}% chance to gain an Endurance Charge when you are Hit', de: '{v}% Chance auf eine Ausdauerladung, wenn du getroffen wirst' },
    low_life_regen_pct: { channel: 'lowLifeRegenPct', en: 'Regenerate {v}% of Life per second while on Low Life', de: 'Regeneriere {v}% Leben pro Sekunde bei wenig Leben' },
    phys_taken_flat: { channel: 'physTakenFlat', en: '-{v} physical Damage taken from Hits', de: '-{v} erlittener physischer Schaden durch Treffer' },
    mana_leech_effect_inc: { channel: 'manaLeechEffectPct', en: '{v}% increased Mana recovered from Leech', de: '{v}% erhöhtes Mana aus Entzug' },
    crit_vs_bleeding: { channel: 'critVsBleedingPct', en: '+{v}% to Critical Strike Chance against Bleeding enemies', de: '+{v}% kritische Trefferchance gegen blutende Gegner' },
    crit_multi_vs_bleeding: { channel: 'critMultiVsBleedingPct', en: '+{v}% to Critical Strike Multiplier against Bleeding enemies', de: '+{v}% kritischer Trefferschaden gegen blutende Gegner' },
    avoid_phys_hit_pct: { channel: 'avoidPhysHitPct', en: '{v}% chance to Avoid physical Damage from Hits', de: '{v}% Chance, physischen Schaden durch Treffer zu vermeiden' },
    armour_if_hit_recently: { channel: 'armourIfHitPct', en: '{v}% increased Armour if you have been Hit Recently', de: '{v}% erhöhte Rüstung, wenn du kürzlich getroffen wurdest' },
    evasion_if_not_hit: { channel: 'evasionIfNotHitPct', en: '{v}% increased Evasion Rating if you have not been Hit Recently', de: '{v}% erhöhte Ausweichwertung, wenn du kürzlich nicht getroffen wurdest' },
    ignite_faster: { channel: 'igniteFasterPct', en: 'Ignites you inflict deal Damage {v}% faster', de: 'Entzündungen, die du verursachst, verursachen Schaden {v}% schneller' },
    freeze_duration_inc: { channel: 'freezeDurationPct', en: '{v}% increased Freeze Duration on enemies', de: '{v}% erhöhte Gefrierdauer auf Gegnern' },
    crit_vs_shocked: { channel: 'critVsShockedPct', en: '+{v}% to Critical Strike Chance against Shocked enemies', de: '+{v}% kritische Trefferchance gegen geschockte Gegner' },
    shadow_res_double: { channel: 'shadowResDouble', flag: true, en: 'Shadow Resistance is doubled', de: 'Schattenwiderstand ist verdoppelt' },
    armour_per_endurance: { channel: 'armourPerEndurancePct', en: '{v}% increased Armour per Endurance Charge', de: '{v}% erhöhte Rüstung pro Ausdauerladung' },
    move_per_frenzy: { channel: 'moveSpeedPerFrenzyPct', en: '{v}% increased Movement Speed per Frenzy Charge', de: '{v}% erhöhtes Bewegungstempo pro Raserei-Ladung' },
    charge_per_frenzy: { channel: 'chargeSpeedPerFrenzyPct', en: '{v}% increased melee attack charge-up speed per Frenzy Charge', de: '{v}% erhöhte Aufladegeschwindigkeit pro Raserei-Ladung' },
    stun_per_endurance: { channel: 'stunPerEndurancePct', en: '{v}% increased Stun Duration on enemies per Endurance Charge', de: '{v}% erhöhte Betäubungsdauer pro Ausdauerladung' },
    aoe_per_endurance: { channel: 'aoePerEndurancePct', en: '{v}% increased Area of Effect per Endurance Charge', de: '{v}% erhöhter Wirkungsbereich pro Ausdauerladung' },
    area_damage_inc: { channel: 'areaDamagePct', en: '{v}% increased Area Damage', de: '{v}% erhöhter Flächenschaden' },
    shield_elemental_res: { channel: 'shieldElementalRes', en: '+{v}% to all Elemental Resistances while Holding a Shield', de: '+{v}% auf alle Elementarwiderstände mit Schild' },
    ailment_effect_inc: { channel: 'ailmentEffectTreePct', en: '{v}% increased Effect of Non-Damaging Ailments', de: '{v}% erhöhte Wirkung nicht-schadender Zustände' },
    blind_duration: { channel: 'blindDurationPct', en: '{v}% increased Blind Duration', de: '{v}% erhöhte Blenddauer' },
    cold_ailment_duration: { channel: 'chillDurationPct', en: '{v}% increased Duration of Chill and Freeze on enemies', de: '{v}% erhöhte Dauer von Kälte und Gefrierung auf Gegnern' },
    poison_chance_spell: { channel: 'poisonChanceSpellPct', en: '{v}% chance to Poison on Hit with Spells', de: '{v}% Chance, mit Zaubern zu vergiften' },
    ignite_duration_taken: { channel: 'igniteDurationTakenPct', en: '{v}% reduced Ignite Duration on you', de: '{v}% verringerte Entzündungsdauer auf dir' },
    shock_effect_taken: { channel: 'shockEffectTakenPct', en: '{v}% reduced Effect of Shock on you', de: '{v}% verringerte Schockwirkung auf dir' },
    chill_effect_taken: { channel: 'chillEffectTakenPct', en: '{v}% reduced Effect of Chill on you', de: '{v}% verringerte Kältewirkung auf dir' },
    freeze_duration_taken: { channel: 'freezeDurationTakenPct', en: '{v}% reduced Freeze Duration on you', de: '{v}% verringerte Gefrierdauer auf dir' },
    spell_dot_inc: { channel: 'spellDotIncPct', en: '{v}% increased Damage over Time with Spells', de: '{v}% erhöhter Schaden über Zeit mit Zaubern' },
    crit_per_power: { channel: 'critPerPowerCharge', en: '+{v}% to Critical Strike Chance per Power Charge', de: '+{v}% kritische Trefferchance pro Kraftladung' },
    mana_regen_per_power: { channel: 'manaRegenPerPowerPct', en: '{v}% increased Mana Regeneration Rate per Power Charge', de: '{v}% erhöhte Manaregeneration pro Kraftladung' },
    crit_multi_per_power: { channel: 'critMultiPerPowerCharge', en: '+{v}% to Critical Strike Multiplier per Power Charge', de: '+{v}% kritischer Trefferschaden pro Kraftladung' },
    shield_cast_speed: { channel: 'shieldCastSpeedPct', en: '{v}% increased Cast Speed while Holding a Shield', de: '{v}% erhöhtes Zaubertempo mit Schild' },
    shield_spell_damage: { channel: 'shieldSpellDamagePct', en: '{v}% increased Spell Damage while Holding a Shield', de: '{v}% erhöhter Zauberschaden mit Schild' },
    spell_damage_per_power: { channel: 'spellDamagePerPowerPct', en: '{v}% increased Spell Damage per Power Charge', de: '{v}% erhöhter Zauberschaden pro Kraftladung' },
    shield_absorption_inc: { channel: 'shieldAbsorptionPct', en: '{v}% increased Absorption from equipped Shield', de: '{v}% erhöhte Absorption vom Schild' },
    // Phase C-2 (batch 35): Onslaught, cost efficiency, mana-leech extras,
    // wand/bow conditionals.
    cost_efficiency: { channel: 'costEfficiencyPct', en: '{v}% increased Cost Efficiency of spells', de: '{v}% erhöhte Kosteneffizienz von Zaubern' },
    onslaught_effect: { channel: 'onslaughtEffectPct', en: '{v}% increased Effect of Onslaught on you', de: '{v}% erhöhte Wirkung von Ansturm auf dich' },
    onslaught_on_kill: { channel: 'onslaughtOnKillPct', en: '{v}% chance to gain Onslaught for 4 seconds on Kill', de: '{v}% Chance auf Ansturm für 4 Sekunden bei Tötung' },
    onslaught_defences: { channel: 'onslaughtDefencePct', en: '{v}% increased Armour and Evasion Rating during Onslaught', de: '{v}% erhöhte Rüstung und Ausweichwertung bei Ansturm' },
    leech_effect_recent_crit: { channel: 'leechEffectRecentCritPct', en: '{v}% increased Life recovered from Leech if you dealt a Critical Strike Recently', de: '{v}% erhöhtes Leben aus Entzug, wenn du kürzlich kritisch getroffen hast' },
    wand_phys_as_lightning: { channel: 'wandPhysAsLightningPct', en: 'Gain {v}% of Wand physical Damage as extra Lightning Damage', de: 'Erhalte {v}% des physischen Zauberstabschadens als zusätzlichen Blitzschaden' },
    bow_aoe: { channel: 'bowAoePct', en: '{v}% increased Area of Effect while wielding a Bow', de: '{v}% vergrößerter Wirkungsbereich mit Bogen' },
    // Phase C-3 (batch 36): projectile secondary hits - secondary damage,
    // pierce, chain, fork and multishot tree lines.
    secondary_damage: { channel: 'secondaryDamagePct', en: '{v}% increased Damage of Secondary hits', de: '{v}% erhöhter Schaden von Sekundärtreffern' },
    pierce_chance: { channel: 'pierceChanceTreePct', en: '+{v}% Chance for Projectiles to Pierce', de: '+{v}% Chance, dass Projektile durchbohren' },
    pierce_targets: { channel: 'pierceTargetsExtra', en: 'Projectiles Pierce +{v} additional Targets', de: 'Projektile durchbohren +{v} zusätzliche Ziele' },
    chain_chance: { channel: 'chainChanceTreePct', en: '+{v}% Chance for Projectiles to Chain', de: '+{v}% Chance, dass Projektile überspringen' },
    chain_count: { channel: 'chainCountExtra', en: 'Projectiles Chain +{v} additional times', de: 'Projektile springen +{v} zusätzliche Male über' },
    fork_chance: { channel: 'forkChancePct', en: '{v}% Chance for Projectile hits to Fork to 2 other enemies', de: '{v}% Chance, dass Projektiltreffer sich auf 2 weitere Gegner gabeln' },
    fork_extra: { channel: 'forkExtraChancePct', en: '+{v}% Chance for a Fork to hit one additional enemy', de: '+{v}% Chance, dass eine Gabelung einen weiteren Gegner trifft' },
    multishot_chance: { channel: 'multishotChanceTreePct', en: '+{v}% Chance to fire an additional Projectile', de: '+{v}% Chance auf ein zusätzliches Projektil' },
    // Keystone batch (batch 40): PoE-style keystones adapted to Stoxels.
    evasion_to_armour: { channel: 'evasionToArmour', flag: true, en: 'Converts all Evasion Rating to Armour', de: 'Wandelt die gesamte Ausweichwertung in Rüstung um' },
    agility_no_evasion: { channel: 'agilityNoEvasion', flag: true, en: 'Agility provides no bonus to Evasion Rating', de: 'Beweglichkeit gewährt keine Ausweichwertung' },
    life_leech_instant: { channel: 'lifeLeechInstant', flag: true, en: 'Life Leech from Melee Damage is Instant', de: 'Lebensraub durch Nahkampfschaden ist sofort' },
    life_only_leech: { channel: 'lifeOnlyFromLeech', flag: true, en: 'Cannot Recover Life other than from Leech', de: 'Leben kann nur durch Raub wiederhergestellt werden' },
    wind_dancer_less: { channel: 'windDancerLessPct', en: '{v}% less Attack Damage taken if you have not been Hit by an Attack Recently', de: '{v}% weniger erlittener Angriffsschaden, wenn du kürzlich nicht von einem Angriff getroffen wurdest' },
    wind_dancer_evade: { channel: 'windDancerEvadePct', en: '{v}% more chance to Evade Attacks if you have been Hit by an Attack Recently', de: '{v}% mehr Chance, Angriffen auszuweichen, wenn du kürzlich von einem Angriff getroffen wurdest' },
    wind_dancer_more: { channel: 'windDancerMorePct', en: '{v}% more Attack Damage taken if you have been Hit by an Attack Recently', de: '{v}% mehr erlittener Angriffsschaden, wenn du kürzlich von einem Angriff getroffen wurdest' },
    life_becomes_one: { channel: 'lifeBecomesOne', flag: true, en: 'Maximum Life becomes 1', de: 'Maximales Leben wird zu 1' },
    shadow_immune: { channel: 'shadowImmune', flag: true, en: 'Immune to Shadow Damage', de: 'Immun gegen Schattenschaden' },
    chilled_cold_taken: { channel: 'chilledColdTaken', flag: true, en: 'Chilled enemies take increased Cold Damage equal to your Chill Effect', de: 'Verlangsamte Gegner erleiden erhöhten Kälteschaden in Höhe deiner Verlangsamungswirkung' },
    damage_to_cold_pct: { channel: 'damageToColdPct', en: '{v}% of physical, fire and lightning Damage is converted to Cold Damage', de: '{v}% des physischen, Feuer- und Blitzschadens wird in Kälteschaden umgewandelt' },
    only_cold_damage: { channel: 'onlyColdDamage', flag: true, en: 'You cannot deal non-Cold Damage', de: 'Du kannst keinen Schaden außer Kälteschaden verursachen' },
    bleed_stack_max: { channel: 'bleedStackMax', en: 'You can inflict Bleeding on an Enemy up to {v} times', de: 'Du kannst einen Gegner bis zu {v} Mal bluten lassen' },
    bleed_dmg_less: { channel: 'bleedLessPct', en: '{v}% less Damage with Bleeding', de: '{v}% weniger Schaden mit Blutung' },
    absorption_removed: { channel: 'absorptionRemoved', flag: true, en: 'Removes all Absorption', de: 'Entfernt die gesamte Absorption' },
    mana_to_life: { channel: 'manaToLifePct', en: 'While not on Full Life, Sacrifice {v}% of Mana per Second to Recover that much Life', de: 'Opfert {v}% des Manas pro Sekunde, um so viel Leben wiederherzustellen, solange du nicht volles Leben hast' },
    elemental_overload: { channel: 'elementalOverloadPct', en: 'Skills that dealt a Critical Strike Recently deal {v}% more Elemental Damage with Hits and Ailments', de: 'Fertigkeiten, die kürzlich einen kritischen Treffer verursacht haben, verursachen {v}% mehr Elementarschaden mit Treffern und Leiden' },
    no_crit_damage: { channel: 'critsNoExtraDamage', flag: true, en: 'Your Critical Strikes do not deal extra Damage', de: 'Deine kritischen Treffer verursachen keinen zusätzlichen Schaden' },
    dot_multi_equals_crit: { channel: 'dotMultiEqualsCrit', flag: true, en: 'Damage over Time Multiplier for Ailments is equal to Critical Strike Multiplier', de: 'Der Schaden-über-Zeit-Multiplikator für Leiden entspricht dem kritischen Trefferschaden-Multiplikator' },
    non_crit_no_ailments: { channel: 'nonCritNoAilments', flag: true, en: 'Non-Critical Strikes cannot inflict Ailments', de: 'Nicht-kritische Treffer können keine Leiden verursachen' },
    absorption_regen_uninterrupted: { channel: 'absorptionRegenUninterrupted', flag: true, en: 'Absorption regeneration is not interrupted by Damage if it began Recently', de: 'Absorptionsregeneration wird nicht durch Schaden unterbrochen, wenn sie kürzlich begonnen hat' },
    absorption_regen_less: { channel: 'absorptionRegenLessPct', en: '{v}% less Absorption regeneration rate', de: '{v}% weniger Absorptionsregenerationsrate' },
    armour_defend_double: { channel: 'armourDefendDouble', flag: true, en: '100% chance to Defend with 200% of Armour', de: '100% Chance, mit 200% der Rüstung zu verteidigen' },
    max_damage_reduction: { channel: 'maxDamageReductionCap', en: 'Maximum Damage Reduction for any Damage Type is {v}%', de: 'Maximale Schadensreduktion für jeden Schadenstyp beträgt {v}%' },
    spell_dmg_low_life: { channel: 'spellDmgLowLifeMorePct', en: '{v}% more Spell Damage when on Low Life', de: '{v}% mehr Zauberschaden bei niedrigem Leben' },
    damage_from_mana: { channel: 'damageFromManaPct', en: '{v}% of Damage is taken from Mana before Life', de: '{v}% des Schadens wird vor dem Leben vom Mana genommen' },
    ghost_dance: { channel: 'ghostDance', flag: true, en: 'Cannot Recover Absorption to above Evasion Rating', de: 'Absorption kann nicht über die Ausweichwertung hinaus wiederhergestellt werden' },
    ghost_shroud_max: { channel: 'ghostShroudMax', en: 'Every 2 seconds, gain a Ghost Shroud, up to a maximum of {v}', de: 'Alle 2 Sekunden erhältst du einen Geisterschleier, maximal {v}' },
    ghost_shroud_recover: { channel: 'ghostShroudRecoverPct', en: 'When Hit, lose a Ghost Shroud to Recover Absorption equal to {v}% of your Evasion Rating', de: 'Wenn du getroffen wirst, verlierst du einen Geisterschleier und stellst Absorption in Höhe von {v}% deiner Ausweichwertung wieder her' },
    block_doubled: { channel: 'blockDoubled', flag: true, en: 'Chance to Block Attack and Spell Damage is doubled', de: 'Chance, Angriffs- und Zauberschaden zu blocken, wird verdoppelt' },
    blocked_hit_taken: { channel: 'blockedHitTakenPct', en: 'You take {v}% of Damage from Blocked Hits', de: 'Du erleidest {v}% des Schadens von geblockten Treffern' },
    damage_to_lightning_pct: { channel: 'damageToLightningPct', en: '{v}% of physical, fire and cold Damage is converted to Lightning Damage', de: '{v}% des physischen, Feuer- und Kälteschadens wird in Blitzschaden umgewandelt' },
    only_lightning_damage: { channel: 'onlyLightningDamage', flag: true, en: 'You cannot deal non-Lightning Damage', de: 'Du kannst keinen Schaden außer Blitzschaden verursachen' },
    lightning_max_more: { channel: 'lightningMaxMorePct', en: '{v}% more Maximum Lightning Damage', de: '{v}% mehr maximaler Blitzschaden' },
    lightning_min_less: { channel: 'lightningMinLessPct', en: '{v}% less Minimum Lightning Damage', de: '{v}% weniger minimaler Blitzschaden' },
    cannot_evade: { channel: 'cannotEvade', flag: true, en: 'Cannot Evade enemy Attacks', de: 'Du kannst gegnerischen Angriffen nicht ausweichen' },
    cannot_be_stunned: { channel: 'cannotBeStunned', flag: true, en: 'Cannot be Stunned', de: 'Du kannst nicht betäubt werden' },
    point_blank: { channel: 'pointBlankPct', en: 'Projectile Attack Hits deal up to {v}% more Damage to close targets, less Damage as the projectile travels farther', de: 'Projektilangriffe verursachen bis zu {v}% mehr Schaden bei nahen Zielen, weniger je weiter das Projektil fliegt' },
    block_max_attack_less: { channel: 'blockMaxAttackLess', en: '-{v}% to maximum Chance to Block Attack Damage', de: '-{v}% auf die maximale Chance, Angriffsschaden zu blocken' },
    block_max_spell_less: { channel: 'blockMaxSpellLess', en: '-{v}% to maximum Chance to Block Spell Damage', de: '-{v}% auf die maximale Chance, Zauberschaden zu blocken' },
    spell_block_per_overcap: { channel: 'spellBlockPerOvercap', en: '+{v}% Chance to Block Spell Damage for each 1% Overcapped Chance to Block Attack Damage', de: '+{v}% Chance, Zauberschaden zu blocken, pro 1% überschüssiger Chance, Angriffsschaden zu blocken' },
    dodge_chance_tree: { channel: 'dodgeChanceTreePct', en: '+{v}% chance to Evade Attacks', de: '+{v}% Chance, Angriffen auszuweichen' },
    armour_less: { channel: 'armourLessPct', en: '{v}% less Armour', de: '{v}% weniger Rüstung' },
    absorption_less: { channel: 'absorptionLessPct', en: '{v}% less maximum Absorption', de: '{v}% weniger maximale Absorption' },
    spell_cost_from_absorption: { channel: 'spellCostFromAbsorption', flag: true, en: 'Spell Mana costs are paid from Absorption before Mana', de: 'Mana-Kosten von Zaubern werden zuerst aus der Absorption bezahlt' },
    strength_spell_damage: { channel: 'strengthSpellDamage', flag: true, en: 'Strength also grants Spell Damage like Intelligence', de: 'Stärke gewährt auch Zauberschaden wie Intelligenz' },
    life_regen_to_absorption: { channel: 'lifeRegenToAbsorption', flag: true, en: 'Life Regeneration is applied to Absorption instead', de: 'Lebensregeneration wird stattdessen auf die Absorption angewendet' },
    precise_technique: { channel: 'preciseTechniquePct', en: '{v}% more Attack Damage if Accuracy Rating is higher than maximum Life', de: '{v}% mehr Angriffsschaden, wenn die Genauigkeit höher als das maximale Leben ist' },
    never_crit: { channel: 'neverCrit', flag: true, en: 'Never deal Critical Strikes', de: 'Du verursachst niemals kritische Treffer' },
    impale_spread: { channel: 'impaleSpread', flag: true, en: 'When your Hits Impale an Enemy, other enemies in its area are Impaled too', de: 'Wenn deine Treffer einen Gegner aufspießen, werden auch andere Gegner in seinem Bereich aufgespießt' },
    impale_extra: { channel: 'impaleExtra', en: 'Inflict {v} additional Impales on enemies you Impale', de: 'Verursache {v} zusätzliche Aufspießungen bei Gegnern, die du aufspießt' },
    impale_lockout: { channel: 'impaleLockout', en: 'For {v} seconds after Impaling an Enemy it cannot be Impaled again', de: 'Für {v} Sekunden nach dem Aufspießen kann ein Gegner nicht erneut aufgespießt werden' },
    // Keystone batch (batch 40): PoE-style keystones adapted to Stoxels.
    never_miss: { channel: 'attacksNeverMiss', flag: true, en: 'Your attacks can no longer miss', de: 'Deine Angriffe können nicht mehr verfehlen' },
    movement_speed_less: { channel: 'movementSpeedLessPct', en: '{v}% reduced Movement Speed', de: '{v}% verringerte Bewegungsgeschwindigkeit' },
    no_repeat_target: { channel: 'noRepeatTarget', flag: true, en: 'Projectiles cannot hit the same enemy twice in a row (they pick another enemy when one is alive)', de: 'Projektile können denselben Gegner nicht zweimal hintereinander treffen (sie wählen einen anderen Gegner, wenn einer lebt)' },
    single_element_more: { channel: 'singleElementMorePct', en: 'Hits that deal a single element deal {v}% more Damage', de: 'Treffer mit nur einem Element verursachen {v}% mehr Schaden' },
    last_element_resist: { channel: 'lastElementResistPct', en: 'Enemies gain {v}% resistance to the last element you used', de: 'Gegner erhalten {v}% Widerstand gegen das zuletzt genutzte Element' },
    absorption_stops_attacking: { channel: 'absorptionStopsWhileAttacking', flag: true, en: 'Absorption does not regenerate while you are attacking', de: 'Absorption regeneriert nicht, solange du angreifst' },
    absorption_regen_delay: { channel: 'absorptionRegenDelaySecs', en: 'Absorption regeneration begins {v} seconds after taking damage', de: 'Absorptionsregeneration beginnt {v} Sekunden nach erlittenem Schaden' },
    avoid_ailment_casting: { channel: 'castingAilmentAvoidPct', en: '{v}% Chance to Avoid Ailments while Casting', de: '{v}% Chance, Statuseffekte beim Zaubern zu vermeiden' },
    // Level-start timer bonus (nodes 31211/31215/31216): read by the _initTimer
    // patch in probability-tree-expansion.js via _egGetTreeTimerStartSecs().
    timer_start_secs: { channel: 'timerStartSecs', en: '+{v} seconds added to the Timer', de: '+{v} Sekunden zum Timer hinzugefügt' },
    // Puzzle budget (campaign levels, maps and trials): time_added shares the
    // timer_start_secs channel (_initTimer patch in probability-tree-expansion.js),
    // mistake_count raises the allowed-mistake cap, mistake_not_count_pct is
    // the "uncounted mistake" roll (penalty.js applyPenalty).
    time_added: { channel: 'timerStartSecs', en: '+{v} seconds added to the Timer', de: '+{v} Sekunden zum Timer hinzugefügt' },
    mistake_count: { channel: 'mistakeCountTree', en: '+{v} Allowed Mistakes', de: '+{v} erlaubte Fehler' },
    mistake_not_count_pct: { channel: 'mistakeNotCountTreePct', en: '{v}% Chance that a Mistake is not counted', de: '{v}% Chance, dass ein Fehler nicht gezählt wird' },
    // Puzzle <-> combat crossover lines (REGISTERED ONLY - see
    // PT_UNWIRED_EFFECT_KEYS below; no node may use them until wired).
    life_on_line: { channel: 'lifeOnLine', en: 'Recover {v} Life for each completed Row or Column', de: 'Stelle {v} Leben pro abgeschlossener Zeile oder Spalte wieder her' },
    absorption_on_line: { channel: 'absorptionOnLine', en: 'Gain {v} Absorption for each completed Row or Column', de: 'Erhalte {v} Absorption pro abgeschlossener Zeile oder Spalte' },
    mana_on_line: { channel: 'manaOnLine', en: 'Gain {v} Mana for each completed Row or Column', de: 'Erhalte {v} Mana pro abgeschlossener Zeile oder Spalte' },
    charge_on_line: { channel: 'chargeOnLinePct', en: '{v}% Chance to gain a Charge for each completed Row or Column', de: '{v}% Chance auf eine Aufladung pro abgeschlossener Zeile oder Spalte' },
    // Charge-specific variants: each charge cluster pays out ITS OWN charge
    // (generic charge_on_line rolls a random kind, ~1/3 each).
    endurance_on_line: { channel: 'enduranceOnLinePct', en: '{v}% Chance to gain an Endurance Charge for each completed Row or Column', de: '{v}% Chance auf eine Widerstandsladung pro abgeschlossener Zeile oder Spalte' },
    frenzy_on_line: { channel: 'frenzyOnLinePct', en: '{v}% Chance to gain a Frenzy Charge for each completed Row or Column', de: '{v}% Chance auf eine Raserei-Ladung pro abgeschlossener Zeile oder Spalte' },
    power_on_line: { channel: 'powerOnLinePct', en: '{v}% Chance to gain a Power Charge for each completed Row or Column', de: '{v}% Chance auf eine Kraftladung pro abgeschlossener Zeile oder Spalte' },
    armour_per_streak: { channel: 'armourPerStreak', en: '+{v} Armour per 10 correct Fills in a row', de: '+{v} Rüstung pro 10 richtigen Füllungen in Folge' },
    block_flawless: { channel: 'blockFlawlessPct', en: '+{v}% Chance to Block while you have made no Mistakes this level', de: '+{v}% Blockchance, solange du in diesem Level keinen Fehler gemacht hast' },
    mistake_heal: { channel: 'mistakeHeal', en: 'Recover {v} Life when you make a Mistake', de: 'Stelle {v} Leben wieder her, wenn du einen Fehler machst' },
    damage_per_streak: { channel: 'damagePerStreakPct', en: '{v}% increased Damage per 10 correct Fills in a row', de: '{v}% erhöhter Schaden pro 10 richtigen Füllungen in Folge' },
    damage_flawless: { channel: 'damageFlawlessPct', en: '{v}% more Damage while you have made no Mistakes this level', de: '{v}% mehr Schaden, solange du in diesem Level keinen Fehler gemacht hast' },
    damage_low_time: { channel: 'damageLowTimePct', en: '{v}% more Damage while below 25% of the Timer', de: '{v}% mehr Schaden, solange weniger als 25% des Timers übrig sind' },
    damage_after_line: { channel: 'damageAfterLinePct', en: '{v}% increased Damage for 5 seconds after completing a Row or Column', de: '{v}% erhöhter Schaden für 5 Sekunden nach einer abgeschlossenen Zeile oder Spalte' },
    reveal_projectile_damage: { channel: 'revealProjectileDamagePct', en: 'Reveal Projectiles deal {v}% increased Damage', de: 'Aufdeckungs-Projektile verursachen {v}% erhöhten Schaden' },
    damage_on_mistake: { channel: 'damageOnMistakePct', en: 'After a Mistake your next Attack deals {v}% more Damage', de: 'Nach einem Fehler verursacht dein nächster Angriff {v}% mehr Schaden' },
    time_on_kill: { channel: 'timeOnKill', en: '+{v} seconds on the Timer for each Monster killed', de: '+{v} Sekunden auf dem Timer für jedes getötete Monster' },
    time_on_elite: { channel: 'timeOnElite', en: '+{v} seconds on the Timer for each Boss or Elite killed', de: '+{v} Sekunden auf dem Timer für jeden getöteten Boss oder Elite' },
    freeze_timer_on_stun: { channel: 'timerFreezeOnStun', en: 'Stunning an enemy pauses the Timer for {v} seconds', de: 'Das Betäuben eines Gegners pausiert den Timer für {v} Sekunden' },
    cell_on_kill: { channel: 'cellOnKillPct', en: '{v}% Chance that a defeated Monster reveals one correct Cell', de: '{v}% Chance, dass ein besiegtes Monster eine richtige Zelle aufdeckt' },
    mark_on_kill: { channel: 'markOnKillPct', en: '{v}% Chance that a defeated Monster marks one wrong Cell', de: '{v}% Chance, dass ein besiegtes Monster eine falsche Zelle markiert' },
    quick_fill_streak: { channel: 'quickFillStreakPct', en: 'Correct Fills within 1 second of each other count {v}% more towards Momentum', de: 'Richtige Füllungen im Abstand von höchstens 1 Sekunde zählen {v}% stärker für Schwung' },
    first_step_time: { channel: 'firstStepTreeSecs', en: 'Your first correct Fill each level grants +{v} seconds', de: 'Deine erste richtige Füllung pro Level gewährt +{v} Sekunden' },
    pickup_lifetime: { channel: 'pickupLifetimeSecs', en: 'Heart and Mana pickups stay {v} seconds longer', de: 'Herz- und Manaaufnahmen bleiben {v} Sekunden länger' },
    lucky_tile_reward: { channel: 'luckyTileRewardAmount', en: 'Lucky Tiles also restore {v} Life and Mana', de: 'Glücksfelder stellen zusätzlich {v} Leben und Mana wieder her' },
    regen_low_time: { channel: 'regenLowTimePct', en: '{v}% faster Life Regeneration while below 25% of the Timer', de: '{v}% schnellere Lebensregeneration, solange weniger als 25% des Timers übrig sind' },
    // Glass Clock / Long Game / Perfectionist / Marathon keystones.
    glass_clock_timer: { channel: 'glassClockTimerLessPct', en: 'Your level Timer is {v}% shorter', de: 'Dein Level-Timer ist {v}% kürzer' },
    glass_clock_gain: { channel: 'glassClockGain', flag: true, en: 'Time gained from correct Fills and completed Lines is doubled', de: 'Zeit aus richtigen Füllungen und abgeschlossenen Linien wird verdoppelt' },
    long_game_no_gain: { channel: 'noFillTimeGain', flag: true, en: 'You can no longer gain time from correct Fills or completed Lines', de: 'Du kannst keine Zeit mehr aus richtigen Füllungen oder abgeschlossenen Linien gewinnen' },
    perfectionist_cost: { channel: 'mistakeTimeCostMorePct', en: 'Mistakes cost {v}% more time', de: 'Fehler kosten {v}% mehr Zeit' },
    marathon_size: { channel: 'marathon', flag: true, en: 'Your time budget counts the grid as one size larger, but your mistake cap counts it as one size smaller', de: 'Dein Zeitbudget zählt das Raster eine Größe größer, deine Fehlergrenze aber eine Größe kleiner' },
    quiz_hint: { channel: 'quizHintPct', en: '{v}% Chance that a Quiz answer shows a Hint', de: '{v}% Chance, dass eine Quizantwort einen Hinweis zeigt' },
    quiz_retry: { channel: 'quizRetryPct', en: '{v}% Chance for a new Question after a wrong Answer', de: '{v}% Chance auf eine neue Frage nach einer falschen Antwort' },
    quiz_time: { channel: 'quizTimeSecs', en: 'A correct Quiz answer adds {v} seconds to the Timer', de: 'Eine richtige Quizantwort fügt dem Timer {v} Sekunden hinzu' },
    item_drop: { channel: 'itemDropPct', en: 'Monsters have {v}% increased Chance to drop puzzle Items', de: 'Monster haben {v}% erhöhte Chance, Rätselgegenstände fallen zu lassen' },
    item_effect: { channel: 'itemEffectPct', en: 'Puzzle Items are {v}% more effective', de: 'Rätselgegenstände sind {v}% effektiver' },
    // Champion's Vigor (node 20033): extra melee strike range, and the melee
    // splash it unlocks (radius in meters, converted to px in
    // _egComputePlayerStats; scaled by melee_aoe_pct in _egTryMeleeSplashHit).
    melee_range_m: { channel: 'meleeRangeM', en: '+{v} meter to melee strike range', de: '+{v} Meter Nahkampf-Reichweite' },
    melee_splash_m: { channel: 'meleeSplashBaseM', en: 'Melee attacks also hit enemies within {v} meters of the target', de: 'Nahkampfangriffe treffen auch Gegner im Umkreis von {v} Metern um das Ziel' },
    // Retaliation ward (node 20036): flag effects without a number. A
    // bleeding attacker cannot bleed you / a burning one cannot ignite you
    // (_egTryRetaliationWard in combat-ailments-core.js).
    ward_bleed_retaliation: { channel: 'retaliationWardBleed', flag: true, en: 'Bleeding enemies cannot inflict Bleeding on you', de: 'Blutende Gegner können dir keine Blutung zufügen' },
    ward_ignite_retaliation: { channel: 'retaliationWardIgnite', flag: true, en: 'Ignited enemies cannot inflict Ignite on you', de: 'Brennende Gegner können dich nicht entzünden' },
    // Primal Flame keystone (node 350): damageToFirePct converts that share of
    // physical, cold and lightning Damage to Fire; onlyFireDamage then drops
    // everything non-fire that is left (_egApplyDamageConversion in
    // combat-calculations-resistances.js, applied by the melee, projectile
    // and spell hit rolls plus flat player hits).
    damage_to_fire_pct: { channel: 'damageToFirePct', en: '{v}% of physical, cold and lightning Damage is converted to Fire Damage', de: '{v}% des physischen, Kälte- und Blitzschadens wird in Feuerschaden umgewandelt' },
    only_fire_damage: { channel: 'onlyFireDamage', flag: true, en: 'You cannot deal non-Fire Damage', de: 'Du kannst keinen Schaden außer Feuerschaden verursachen' },
    // Blood Magic keystone (node 40001). "More" life is a separate
    // multiplier applied after every % increased source where max HP is
    // composed; the two flags are read through _egGetTreeChannel() by
    // class-mana.js (max Mana 0, costs paid in Life) and the cost increase
    // scales every spell/ability cost there too.
    life_more_pct: { channel: 'healthMorePct', en: '{v}% more maximum Life', de: '{v}% mehr maximales Leben' },
    mana_removed: { channel: 'manaRemoved', flag: true, en: 'You have no Mana', de: 'Du hast kein Mana' },
    spells_cost_life: { channel: 'spellsCostLife', flag: true, en: 'Spells cost Life instead of Mana', de: 'Zauber kosten Leben statt Mana' },
    spell_cost_inc_pct: { channel: 'spellCostIncPct', en: '{v}% increased Cost of all spells', de: '{v}% erhöhte Kosten aller Zauber' },

    // Mace / Sceptre critical strikes (Colossus nodes 30353/30354/30352/20086).
    // Both are ADDITIVE like the gear mods of the same name: the chance is
    // added to critChance, the multiplier to critMultiplierPct (base 150%).
    // They only count for melee strikes with a Mace or Sceptre equipped
    // (_egCalcPlayerMeleeDamage -> _egRollCrit bonus argument).
    crit_chance_mace: { channel: 'critChanceMeleeMacePct', en: '+{v}% to melee Critical Strike Chance with Maces or Sceptres', de: '+{v}% auf die kritische Nahkampf-Trefferchance mit Streitkolben oder Zeptern' },
    crit_multi_mace: { channel: 'critMultiplierMeleeMacePct', en: '+{v}% to melee Critical Strike Multiplier with Maces or Sceptres', de: '+{v}% auf den kritischen Nahkampf-Schadensmultiplikator mit Streitkolben oder Zeptern' },
    // Damage-over-time multipliers (nodes 30355/95, 30306/30309): applied to
    // the stored damage-per-second of the ailment when it is inflicted
    // (_egApplyMonsterAilment). Bleeding is the physical damage over time.
    ignite_damage_more: { channel: 'igniteDamageMorePct', en: 'Ignites you inflict deal {v}% more Damage', de: 'Von dir verursachte Entzündungen verursachen {v}% mehr Schaden' },
    phys_dot_more: { channel: 'physDotMorePct', en: 'You deal {v}% more physical Damage over Time', de: 'Du verursachst {v}% mehr physischen Schaden über Zeit' },
    // Physical damage gained as Fire (nodes 30356/217): added to the fire
    // share of every hit from the hit's physical share, AFTER the fire-only
    // drop of the Primal Flame keystone (_egApplyDamageConversion). The
    // timed variant is active for 5 seconds out of every 10 seconds of the
    // encounter, counted from the second the encounter starts (stats seed).
    phys_as_fire: { channel: 'physAsExtraFirePct', en: 'Gain {v}% of physical Damage as extra Fire Damage', de: 'Erhalte {v}% des physischen Schadens als zusätzlichen Feuerschaden' },
    phys_as_fire_timed: { channel: 'physAsExtraFireTimedPct', en: 'Every 10 seconds, gain {v}% of physical Damage as extra Fire Damage for 5 seconds', de: 'Erhalte alle 10 Sekunden für 5 Sekunden {v}% des physischen Schadens als zusätzlichen Feuerschaden' },
    // Crush (notable 331): a melee strike on an enemy at full Life crushes it
    // for 5 seconds; a crushed enemy's physical Damage reduction is lowered
    // by the value (it can drop below 0 and then amplifies physical hits).
    // Vital Conduit keystone (node 291): a "less" multiplier on the whole
    // per-second Life regeneration (_egTickLifeRegen), a "less" multiplier on
    // every Life leech heal (_egLeechHealMult in the melee, projectile and
    // spell hit rolls) and a flag that sends the Absorption recharge to Life
    // (_egScheduleAbsorptionRegen).
    life_regen_less: { channel: 'lifeRegenLessPct', en: '{v}% less Life Regeneration rate', de: '{v}% weniger Lebensregenerationsrate' },
    life_leech_less: { channel: 'lifeLeechLessPct', en: '{v}% less Life recovered from Life leech effects', de: '{v}% weniger Leben durch Lebensentzug' },
    absorption_recharge_life: { channel: 'absorptionRechargesLife', flag: true, en: 'Absorption recharge restores Life instead of Absorption', de: 'Absorptionsaufladung stellt stattdessen Leben wieder her' },
    crush_full_life: { channel: 'crushPhysReductionPct', en: 'Crush enemies for 5 seconds when you hit them with a melee strike while they are on full Life. Crushed enemies have {v}% reduced physical Damage reduction', de: 'Zermalme Gegner für 5 Sekunden, wenn du sie mit einem Nahkampfschlag triffst, während sie volles Leben haben. Zermalmte Gegner haben {v}% reduzierte physische Schadensreduktion' },
});

// The puzzle <-> combat crossover lines. They are appended to existing combat
// nodes as an extra line, so tests that pin a node's base effects compare
// against the node WITHOUT these keys.
export const PT_CROSSOVER_EFFECT_KEYS = Object.freeze([
    'life_on_line', 'absorption_on_line', 'mana_on_line', 'charge_on_line',
    'endurance_on_line', 'frenzy_on_line', 'power_on_line',
    'armour_per_streak', 'block_flawless', 'mistake_heal', 'damage_per_streak',
    'damage_flawless', 'damage_low_time', 'damage_after_line', 'reveal_projectile_damage',
    'damage_on_mistake', 'time_on_kill', 'time_on_elite', 'freeze_timer_on_stun',
    'cell_on_kill', 'mark_on_kill', 'quick_fill_streak', 'first_step_time',
    'pickup_lifetime', 'lucky_tile_reward', 'regen_low_time', 'quiz_hint',
    'quiz_retry', 'quiz_time', 'item_drop', 'item_effect',
]);

// Effect keys that exist in the registry (text + channel) but whose gameplay
// hook is not written yet. The integrity suite fails if any tree node uses
// one of these, so a node can never advertise a stat that does nothing.
// Remove a key from this list in the same change that wires it.
export const PT_UNWIRED_EFFECT_KEYS = Object.freeze([]);

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

// ---------------------------------------------------------------------------
// Node icons (emoji), derived from what a node DOES - not stored per node.
// One emoji per effect family so identical effects always share an icon and
// similar effects (same family) look alike. Nodes with real art keep their
// art; this only replaces the neutral dot / hand-picked emoji. Reserved
// placeholder nodes share the lock icon.
// ---------------------------------------------------------------------------

// Registry effect keys -> emoji. First matching rule wins, so order matters
// (specific mechanics before generic damage / duration families).
const PT_EFFECT_ICON_RULES = [
    [/^(life_becomes_one)$/, '💔'],
    [/^shadow_immune$/, '🌑'],
    [/^(wind_dancer|ghost_|dodge|evasion|agi|agility|cannot_evade)/, '💨'],
    [/^(timer_start|time_added)/, '⏰'],
    [/^mistake_(count|not_count)/, '🛟'],
    [/^quiz_(hint|retry)/, '🎓'],
    [/^quiz_time/, '⏳'],
    [/^item_drop/, '🎁'],
    [/^item_effect/, '🧰'],
    [/^pickup_lifetime/, '🕰️'],
    [/^lucky_tile_reward/, '🍀'],
    [/^(time_on_kill|time_on_elite)/, '⌛'],
    [/^cell_on_kill/, '🔎'],
    [/^mark_on_kill/, '✖️'],
    [/^first_step_time/, '👣'],
    [/^quick_fill_streak/, '⚡'],
    [/^regen_low_time/, '🩹'],
    [/^mistake_heal/, '💞'],
    [/^(charge|endurance|frenzy|power)_on_line/, '🔋'],
    [/^reveal_projectile_damage/, '🎯'],
    [/^damage_(per_streak|flawless|low_time|after_line|on_mistake)/, '🗡️'],
    [/leech/, '🧛'],
    [/^(bleed|crit_multi_vs_bleeding|crit_vs_bleeding|ward_bleed|avoid_bleed)/, '🩸'],
    [/^(crush|ignore_phys_reduction)/, '🔨'],
    [/^dmg_vs_low_life/, '💪'],
    [/^(dot_multi_equals_crit|no_crit_damage)/, '💥'],
    [/^(fortif|fortified)/, '🏰'],
    [/^(poison|dagger_crit_poison|avoid_poison|phys_dot)/, '🧪'],
    [/^(ignite|avoid_ignite|ward_ignite)/, '🔥'],
    [/^(freeze|chill|chilled|avoid_chill|cold_ailment)/, '🧊'],
    [/^(shock|avoid_shock|crit_vs_shocked|dmg_recent_shock|lightning_ailment)/, '⚡'],
    [/^(blind|crit_vs_blinded)/, '🕶️'],
    [/^stun/, '😵'],
    [/^(cannot_be_stunned)/, '🛑'],
    [/^(avoid_|non_crit_no_ailments)/, '🛑'],
    [/^ailment_/, '🤢'],
    [/^impale/, '🗡️'],
    [/^intimidate/, '😨'],
    [/^(rage)/, '😡'],
    [/^(frenzy|evasion_per_frenzy|move_per_frenzy|charge_per_frenzy)/, '🌀'],
    [/^(onslaught)/, '🏃'],
    [/^(power_|mana_on_melee_hit_charged|mana_regen_per_power|crit_multi_per_power|crit_per_power|spell_damage_per_power)/, '🔋'],
    [/^(endurance|armour_per_endurance|damage_per_endurance|aoe_per_endurance|stun_per_endurance)/, '🪨'],
    [/^(attack_speed|cast_speed|dual_cast_speed|shield_cast_speed|dual_charge|.*charge_speed|melee_charge)/, '⏩'],
    [/^shield_spell_damage/, '🔮'],
    [/^(attack_phys_shield|melee_phys_shield)/, '⚔️'],
    [/^shield_absorption_inc/, '🔰'],
    [/^all_elemental_res/, '☔'],
    [/^fire_res/, '🧯'],
    [/^cold_res/, '🥶'],
    [/^lightning_res/, '🌩️'],
    [/^(shadow_resist)/, '🌑'],
    [/^(last_element_resist|shield_elemental_res)/, '☔'],
    [/^(pen_)/, '🔻'],
    [/^(phys_as_|damage_to_|wand_phys_as)/, '🔄'],
    [/^(only_fire|fire_|ignite)/, '🔥'],
    [/^(only_cold|cold_)/, '❄️'],
    [/^(only_lightning|lightning_)/, '⚡'],
    [/^(shadow_)/, '🌑'],
    [/^(elemental_|single_element)/, '🌈'],
    [/^(block|spell_block|staff_spell_block|staff_block|dual_block|shield_spell_block|blocked_hit|parry|frenzy_on_block|endurance_on_block|power_on_block)/, '🧱'],
    [/^(armour|shield_|attack_phys_shield|melee_phys_shield|max_damage_reduction|rage_armour|armour_defend|fortified_defences)/, '🛡️'],
    [/^(absorption|spell_cost_from_absorption|dmg_full_absorption|leech_as_absorption)/, '🔰'],
    [/^(reflect)/, '🪞'],
    [/^(life_regen|low_life_regen|life_pulse|heart_|life_on_|life_recoup|life_burst)/, '💗'],
    [/^(life_|health_)/, '❤️'],
    [/^(mana_regen|mana_on_|mana_pickup|mana_spawn|mana_removed)/, '💧'],
    [/^(mana_|damage_from_mana)/, '🔷'],
    [/^(spells_cost|spell_cost|cost_efficiency|melee_spell_|bow_spell_mana)/, '🪙'],
    [/^(accuracy|never_miss|dual_accuracy)/, '👁️'],
    [/crit_multi|crit_dot|dual_crit_multi|projectile_crit_multi/, '💥'],
    [/crit|never_crit|no_crit/, '🎯'],
    [/^(chain)/, '⛓️'],
    [/^(fork)/, '🔱'],
    [/^(pierce|projectile|multishot|bow_|point_blank|secondary_damage|no_repeat)/, '🏹'],
    [/aoe|area|melee_splash|melee_range/, '⭕'],
    [/^(attack_speed|cast_speed|dual_cast_speed|dual_charge|.*charge_speed|melee_charge|axe_charge)/, '⏩'],
    [/^(movement_speed|dual_move|move_)/, '👟'],
    [/^(spell_|shield_cast|dual_spell|staff_damage|wand_damage|bow_spell)/, '🔮'],
    [/^(dot_|spell_dot|dot)/, '☣️'],
    [/^(melee_|phys_|sword|dagger|dual_damage|axe|mace|melee_phys|impale|accuracy_sword|crit_chance_)/, '⚔️'],
    [/^(damage_inc|dual_)/, '💪'],
    [/_duration|duration/, '⏳'],
    [/^(str_)/, '💪'],
    [/^(int_)/, '🧠'],
];

// Attribute-only effects are the weakest hint about what a node is for, so
// any other effect on the same node decides the icon first.
const PT_WEAK_ICON_EFFECT = /^(str_flat|agi_flat|int_flat)$/;

// Class-skill nodes still carry hand-written descriptions instead of effects.
// They are matched on the FIRST sentence only (what the node mainly does).
const PT_DESC_ICON_RULES = [
    [/^(As an? \w+, you have)|bonus items/i, '🎁'],
    [/cooldown|not to go on cooldown/i, '⏱️'],
    [/(chance to|can) (cast|fire|trigger)s? a second time|triggers a second time/i, '🔁'],
    [/(add|adds|gives|grants|recovers).*(seconds?|minutes?|time)|on the timer|to the timer|costs? .*less per cell|cost no time|more time/i, '⏰'],
    [/(lasts?|live|extends it|lifetime|countdown lasts).*(longer|by)|lasts? \d+(\.\d+)? seconds longer|lifetime/i, '⏳'],
    [/rewinds/i, '⏪'],
    [/fire \d+ seconds faster|step .*faster|take each step/i, '⏩'],
    [/mark(s)? .*wrong|incorrect|marks every|marks the cells/i, '🚩'],
    [/reveal(s)? .*correct|reveal(s)? 1 additional cell|reveal(s)? up to .*cell|can reveal|reveals correct|reveal up to/i, '🔍'],
    [/mistake|Variance Shield|shields?|Threshold|forgives|absorb/i, '🛡️'],
    [/momentum|streak/i, '🔥'],
    [/scan area|3×3|radius|reach/i, '⭕'],
    [/cascade/i, '🔗'],
    [/trap/i, '🪤'],
    [/skeleton/i, '💀'],
    [/zombie|curse/i, '🧟'],
    [/Drifter|Browney|Wiener/i, '🐾'],
    [/reveal projectiles/i, '🏹'],
    [/solves|solve /i, '🎯'],
];
const PT_DESC_ICON_BY_ID = { 55: '📊', 72: '🧮', 88: '🎲', 41006: '🎯', 41053: '🧟', 41063: '🪤', 41049: '💀', 41039: '🩹', 41078: '🐾', 41061: '🔗', 41077: '⏳', 41065: '⭕',
    // Restored puzzle chains (batches 2, 4, 5 + 6): one emoji per chain / keystone
    107: '📊', 108: '📐', 160: '🚶', 162: '📡', 233: '🔄', 242: '🚨', 264: '👁️', 289: '〰️', 290: '🎛️', 293: '🌡️', 333: '🌊', 379: '⚗️', 20053: '⏸️', 20166: '💢', 20205: '📈', 30233: '⏸️', 30234: '⏸️', 30245: '📐', 30246: '📐', 30336: '🚨', 30337: '🚨', 30877: '⚗️', 30878: '⚗️', 31037: '💢', 31038: '💢', 31062: '📈', 31063: '📈', 31193: '🔄', 31194: '🔄', 31272: '📊', 31273: '📊',
    193: '📐', 239: '🌊', 244: '🎲', 319: '📑', 325: '🔎', 326: '∅', 347: '❌', 363: '🧩', 20017: '↔️', 20028: '🍀', 20048: '🔃', 20049: '🎚️', 20060: '🌘', 20078: '🎁', 20169: '🗃️', 20170: '🏜️', 20189: '❓', 20198: '🎯', 20228: '📦', 20234: '🔀', 30091: '↔️', 30092: '↔️', 30141: '🍀', 30275: '❌', 30276: '❌', 30389: '🔃', 30390: '🔃', 30600: '🎁', 30601: '🎁', 30701: '🏜️', 30702: '🏜️', 30705: '🗃️', 30706: '🗃️', 30945: '🔎', 31160: '🎯', 31161: '🎯', 31346: '📦', 31349: '📦', 31424: '🎲', 31425: '🎲', 41101: '👁️', 41102: '🔁', 41103: '🧮', 41104: '🕳️',
    146: '📏', 220: '🕰️', 257: '🧲', 265: '🌟', 314: '✏️', 318: '🔢', 391: '📐', 20027: '🎓', 20188: '🎓', 20190: '🕯️', 20191: '⚪', 20227: '🎩', 30079: '✏️', 31287: '🕯️', 31288: '🔍', 31350: '🧹', 31392: '🕯️', 31397: '🎓', 31398: '🎓', 31429: '🕯️', 41105: '🛡️', 41106: '🛡️', 41107: '🛡️', 41108: '🛡️', 41109: '🛡️', 41110: '🛡️', 41111: '🌫️', 41112: '🌫️', 41113: '🌫️', 41114: '♻️', 41115: '♻️', 41116: '♻️', 41117: '📉', 41118: '📉', 41119: '📉', 41120: '🎓', 41121: '📖', 41122: '📗', 41123: '💬', 41124: '🔵', 41125: '🌑', 41126: '🌑', 41127: '🌑', 41128: '🌑', 41129: '🔒', 41130: '🔒', 41131: '🔒', 41132: '🎲', 41133: '🎲', 41134: '🎲', 41135: '🔥', 41136: '🔥', 41137: '🔥', 41138: '🎁', 41139: '🎁', 41140: '🎓', 41141: '🍀', 41142: '✂️', 41143: '💡', 41144: '🟣', 41145: '🧙',
    20185: '🔢', 41146: '🎰', 41147: '💸', 41148: '🎰', 41149: '➖', 41150: '❄️', 41151: '📉', 41152: '♾️', 41153: '⚔️', 41154: '⚡', 41155: '✨', 41156: '🪡', 41157: '📜', 41158: '🫥', 41159: '🗺️', 41160: '🧬', 41161: '❔', 41162: '🌃', 41163: '🧭', 41164: '🏔️', 41165: '💡', 41166: '🔬', 41167: '📉', 41168: '🦋', 41169: '🎲', 41170: '🚨', 41171: '💥', 41172: '👁️', 41173: '🏪', 41174: '🧪', 41175: '⌛', 41176: '♟️', 41177: '🔮', 41178: '💎', 41179: '🏃' };

// Emoji for a node definition (TALENT_TREE_DATA entry) or '' when the node
// has no derivable meaning. Pure function of the node data.
// Placeholder slots that exist in the layout but have no effects yet.
export function ptIsReservedNode(node) {
    if (!node || ptNodeHasEffects(node)) return false;
    return /^Reserved/.test(node.nameEn || '') || /^reserved_/.test(node.statKey || '');
}

export function ptDerivedNodeEmoji(node) {
    if (!node || node.tier === 'start') return '';
    if (PT_DESC_ICON_BY_ID[node.id]) return PT_DESC_ICON_BY_ID[node.id];
    if (ptNodeHasEffects(node)) {
        const keys = node.effects.map(e => String(e).split(':')[0]);
        const ordered = keys.filter(k => !PT_WEAK_ICON_EFFECT.test(k))
            .concat(keys.filter(k => PT_WEAK_ICON_EFFECT.test(k)));
        for (const key of ordered) {
            for (const [re, emoji] of PT_EFFECT_ICON_RULES) {
                if (re.test(key)) return emoji;
            }
        }
        return '';
    }
    if (ptIsReservedNode(node)) return '🔒';
    const desc = String(node.descEn || '');
    const first = desc.split(/\n|\. (?=[A-Z])/)[0];
    for (const [re, emoji] of PT_DESC_ICON_RULES) {
        if (re.test(first)) return emoji;
    }
    return '';
}

// ---------------------------------------------------------------------------
// Stat summary (the "total of everything I have allocated" panel).
// Sums every allocated node's effects per effect key, then groups the totals
// into a few readable categories. Pure function of the node data - the UI
// layer only renders what comes back.
// ---------------------------------------------------------------------------

// Display order of the summary sections. `rule` is matched against the
// effect key; the FIRST category whose rule matches wins, so specific
// families (puzzle, life, mana, defence) come before broad ones.
export const PT_STAT_CATEGORIES = Object.freeze([
    { id: 'puzzle', en: 'Puzzle', de: 'Rätsel',
        rule: /^(timer_start|time_added|mistake_|quiz_|item_(drop|effect)|pickup_lifetime|lucky_tile|first_step|cell_on_kill|mark_on_kill|quick_fill|time_on_|freeze_timer|regen_low_time|glass_clock|long_game|perfectionist|marathon|reveal_projectile|damage_(per_streak|flawless|low_time|after_line|on_mistake)|armour_per_streak|block_flawless|.*_on_line)/ },
    { id: 'attr', en: 'Attributes', de: 'Attribute', rule: /^(str|agi|int)_flat$/ },
    { id: 'life', en: 'Life', de: 'Leben',
        rule: /^(life_|health_|heart_|low_life_regen|life_pulse|leech_effect_recent_crit)/ },
    { id: 'mana', en: 'Mana', de: 'Mana',
        rule: /^(mana_|spells_cost|spell_cost|cost_efficiency|melee_spell_|bow_spell_mana|damage_from_mana)/ },
    { id: 'defence', en: 'Defence & Movement', de: 'Verteidigung & Bewegung',
        rule: /(^|_)(armour|evasion|block|absorption|parry|dodge|reflect|fortif\w*|endurance|ghost|wind_dancer|riposte|resist|res|taken|shroud|movement_speed)(_|$)|^(avoid_|cannot_|stun_avoid|max_damage_reduction|phys_taken|dmg_full_absorption|spell_block|shield_(defences|elemental|absorption))|^(rage_armour|agility_no_evasion|shadow_immune|last_element_resist|leech_as_absorption)/ },
    { id: 'ailments', en: 'Ailments & Damage over Time', de: 'Zustände & Schaden über Zeit',
        rule: /(poison|bleed|ignite|chill|shock|freeze|blind|ailment|^dot_|_dot_|^dot|stun|impale|crush|intimidate|dagger_crit_poison)/ },
    { id: 'projectiles', en: 'Projectiles', de: 'Projektile',
        rule: /^(projectile_|pierce|chain_|fork_|multishot|point_blank|secondary_damage|bow_aoe|frenzy|evasion_per_frenzy|move_per_frenzy|charge_per_frenzy|life_on_projectile|mana_on_projectile)/ },
    { id: 'melee', en: 'Melee & Attacks', de: 'Nahkampf & Angriffe',
        rule: /^(melee_|sword|axe|mace|dagger|attack_|rage|accuracy|ignore_phys|dual_(damage|charge|accuracy|crit|move|block)|crit_(chance|multi)_(melee|sword|axe|mace|dagger|heavy)|phys_dot|never_miss|no_repeat|precise_technique|riposte|onslaught|crit_multi_heavy)/ },
    { id: 'spells', en: 'Spells & Elements', de: 'Zauber & Elemente',
        rule: /^(spell_|cast_speed|dual_(cast|spell)|shield_(cast|spell)|bow_spell|wand|staff|power_|strength_spell|elemental_|fire_|cold_|lightning_|pen_|only_(fire|cold|lightning)|damage_to_|phys_as_|single_element|skill_effect|area_of_effect|area_damage|spell_dmg|lightning_(max|min)|crit_(chance|multi)_(staff|wand)|mana_leech|absorption_leech_spell|crit_(per|multi_per)_power)/ },
    { id: 'damage', en: 'Damage & Critical Hits', de: 'Schaden & Kritische Treffer',
        rule: /^(damage_|phys_damage|shadow_|crit_|never_crit|no_crit|dmg_|aoe_|dot_multi_equals_crit)/ },
]);

const PT_STAT_OTHER = Object.freeze({ id: 'other', en: 'Other', de: 'Sonstiges' });

// Category id for an effect key ('other' when no rule matches).
export function ptStatCategoryId(key) {
    const k = String(key || '');
    for (const cat of PT_STAT_CATEGORIES) {
        if (cat.rule.test(k)) return cat.id;
    }
    return PT_STAT_OTHER.id;
}

// Builds the summary for a list of allocated node definitions.
//   sections  - [{ id, label, lines: [text, ...] }] in display order, only
//               categories that have at least one line.
//   keystones - [{ name, desc }] allocated keystones (their text, not sums).
//   specials  - [{ name, desc }] hand-written puzzle/class-skill nodes that
//               have no numeric effects (they cannot be summed).
//   nodes     - how many nodes were counted (start nodes excluded).
// Same effect key on several nodes is summed into one line; flag effects
// (no number) appear once. Keystones appear only in their own list so their
// text is not repeated inside the numeric sections.
export function ptBuildStatSummary(nodeDefs, lang) {
    const de = lang === 'de';
    const totals = new Map();   // effect key -> summed value (insertion order)
    const keystones = [];
    const specials = [];
    let nodes = 0;
    const isKeystone = (n) => Boolean(n && ((n.statKey && String(n.statKey).startsWith('keystone_'))
        || (n.nameEn && String(n.nameEn).startsWith('Keystone:'))
        || (n.nameDe && String(n.nameDe).startsWith('Schlüsselfertigkeit:'))));
    const cleanName = (n) => String((de ? n.nameDe : n.nameEn) || n.nameEn || '')
        .replace(/^(Keystone:|Schlüsselfertigkeit:)\s*/, '');

    for (const node of nodeDefs || []) {
        if (!node || node.tier === 'start') continue;
        nodes += 1;
        if (isKeystone(node)) {
            keystones.push({ name: cleanName(node), desc: ptResolveNodeDesc(node, lang) });
            continue;
        }
        if (ptNodeHasEffects(node)) {
            for (const spec of node.effects) {
                const parsed = ptParseEffectSpec(spec);
                if (!parsed) continue;
                totals.set(parsed.key, (totals.get(parsed.key) || 0) + parsed.value);
            }
        } else if (!ptIsReservedNode(node)) {
            const desc = ptResolveNodeDesc(node, lang);
            if (desc) specials.push({ name: cleanName(node), desc });
        }
    }

    const byCat = new Map();
    for (const [key, value] of totals) {
        const def = PT_EFFECT_DEFS[key];
        const template = de ? def.de : def.en;
        // Round away float noise from summing decimals (0.1 + 0.2).
        const shown = Math.round(value * 100) / 100;
        const text = String(template).replace('{v}', String(shown));
        const id = ptStatCategoryId(key);
        if (!byCat.has(id)) byCat.set(id, []);
        byCat.get(id).push(text);
    }
    const sections = [];
    for (const cat of [...PT_STAT_CATEGORIES, PT_STAT_OTHER]) {
        const lines = byCat.get(cat.id);
        if (lines && lines.length) sections.push({ id: cat.id, label: de ? cat.de : cat.en, lines });
    }
    return { sections, keystones, specials, nodes };
}
