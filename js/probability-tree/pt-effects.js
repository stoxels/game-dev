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
    rage_effect: { channel: 'rageMeleeMorePct', en: 'Each Rage grants {v}% more melee Damage', de: 'Jede Wut gewährt {v}% mehr Nahkampfschaden' },
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
    avoid_ailment_casting: { channel: 'castingAilmentAvoidPct', en: '{v}% Chance to Avoid Ailments while Casting', de: '{v}% Chance, Statuseffekte beim Zaubern zu vermeiden' },
    // Level-start timer bonus (nodes 31211/31215/31216): read by the _initTimer
    // patch in probability-tree-expansion.js via _egGetTreeTimerStartSecs().
    timer_start_secs: { channel: 'timerStartSecs', en: '+{v} seconds added to the Timer', de: '+{v} Sekunden zum Timer hinzugefügt' },
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
