import { Audio_Manager } from '../audio/audio.js';
import { save } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { _getGlobalCooldownReduction } from '../classes/class-cooldown-state.js';
import { _bloodMagicActive, _scaleAbilityManaCost, canAffordLifeCost, canAffordMana, payAbilityCost, spendMana } from '../classes/class-mana.js';
import { getCharmSkillDamageMult, getSkillCastRankFull, getSpellRankDamageMult, getSpellRankDamageMultForSkill, getSpellRankManaMultForSkill } from './skill-charms.js';
import { patchHotbarSlotCooldown, refreshSkillUI, renderSkillHotbar } from './skill-hotbar.js';
import { SKILL_REGISTRY } from './skill-registry.js';
import { _uspAnchorMarkerClear, _uspAnchorMarkerShow, _uspBlinkFX, _uspFireThemedProjectile, _uspSupportCastFX, _uspSupportPulseFX, _uspTelegraph } from './universal-spell-fx.js';
import { updateQuestStats } from '../quests/quests-stats.js';

// universal-spells.js
//------------------------------------------------------------------------
//--------------------UNIVERSAL SPELL ARSENAL-----------------------------
//------------------------------------------------------------------------
// A Path-of-Exile / WoW-Classic inspired spell arsenal. Every spell here:
//   - lives in the SPELLBOOK under its own "Universal" section,
//   - is dragged onto the hotbar like any other skill,
//   - costs MANA (scaled by _scaleAbilityManaCost, Blood-Magic aware),
//   - deals DIRECT damage to monsters via _egDamageTargetById,
//   - plays a code-drawn themed effect (see universal-spell-fx.js +
//     css/universal-spells.css - no emoji in combat visuals).
//
// The tutorial Fireball (id 'fireball', tutorial-quest.js) stays untouched;
// these 36 spells extend the same universal-spell idea to a full arsenal
// (24 elemental + 6 physical melee + 6 arrows).
//
// DESIGN CONTRACT (for the future dev-passive-tree scaling pass):
//   Every def carries:
//     element    - engine resist key: 'fire' | 'cold' | 'lightning' |
//                  'shadow' | 'physical'. (The combat engine resists the
//                  four elements per-share; 'physical' hits carry no
//                  elemental breakdown so only physical resistance applies.
//                  Arcane, holy and nature visuals map onto the closest key.)
//     damageKind - design scaling key: 'fire' | 'cold' | 'lightning' |
//                  'shadow' | 'arcane' | 'holy' | 'nature' | 'physical'.
//                  The future dev tree reads this via
//                  getUniversalSpellDamageBonus().
//     scalingTags- extra tags ('area', 'projectile', 'dot', 'channel') the
//                  future tree can hook per-spell-type modifiers onto.
//     behavior   - 'single' | 'volley' | 'nova' | 'ticks' | 'chain' |
//                  'delayed' | 'starfall' | 'wild'. Drives cast + FX, never
//                  balance. 'wild' = Spark-style random-target projectiles.
//
// LOCKING (future-gating infrastructure, all open for now):
//   STATE.universalSpellsUnlocked === null/undefined → everything unlocked.
//   Set it to an array of ids to lock everything else behind whatever
//   system you design later (quest, level, boss soul, …). No other code
//   changes needed: spellbook (🔒), drag, hotbar and casting all honour
//   isUniversalSpellUnlocked(). Per-spell requirement text can be added as
//   unlockHintEn/unlockHintDE on a def - _uspUnlockHint() reads it.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------SPELL DEFINITIONS----------------------------
//------------------------------------------------------------------------
// dmg:[min,max] per HIT. count: hits for tooltip totals (volley missiles,
// DoT ticks, channel ticks; AoE uses perTarget:true → "to each enemy").
//------------------------------------------------------------------------

export const UNIVERSAL_SPELL_DEFS = [
    // ── FIRE ────────────────────────────────────────────────────────────
    {
        id: 'usp_pyroblast', icon: '☄️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'single', dmg: [19, 24], manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 2.0,
        tags: ['Spell', 'Fire', 'Projectile'], scalingTags: ['spell', 'fire', 'projectile'],
        nameEn: 'Pyroblast', nameDE: 'Pyroschlag',
        descEn: 'Hurls a massive blazing boulder that explodes on impact, dealing heavy fire damage to the target.',
        descDE: 'Schleudert einen gewaltigen brennenden Felsbrocken, der beim Aufprall explodiert und schweren Feuerschaden verursacht.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_flamestrike', icon: '🔥', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'nova', dmg: [6, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.2, perTarget: true,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Flamestrike', nameDE: 'Flammenstoß',
        descEn: 'Calls down a pillar of flame that scorches EVERY enemy on the battlefield.',
        descDE: 'Ruft eine Flammensäule herab, die ALLE Gegner auf dem Schlachtfeld versengt.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_immolate', icon: '🕯️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [2, 4], ticks: 5, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.8,
        tags: ['Spell', 'Fire', 'Damage over Time'], scalingTags: ['spell', 'fire', 'dot'],
        nameEn: 'Immolate', nameDE: 'Feuerbrand',
        descEn: 'Ignites the target, dealing instant fire damage plus burning damage over 5 seconds.',
        descDE: 'Entzündet das Ziel: sofortiger Feuerschaden plus Brennschaden über 5 Sekunden.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_meteor', icon: '🌠', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'delayed', dmg: [20, 27], delayMs: 900, manaCost: 53, cooldownSeconds: 24, castTimeSeconds: 1.6,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Meteor', nameDE: 'Meteor',
        descEn: 'A meteor crashes from the sky after a short delay, crushing the target for massive fire damage.',
        descDE: 'Nach kurzer Verzögerung schlägt ein Meteor ein und zerschmettert das Ziel mit gewaltigem Feuerschaden.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_rain_of_fire', icon: '🎆', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Fire', 'Area', 'Damage over Time'], scalingTags: ['spell', 'fire', 'area', 'dot'],
        nameEn: 'Rain of Fire', nameDE: 'Feuerregen',
        descEn: 'Burning embers rain down for 4 seconds, striking EVERY enemy each second.',
        descDE: 'Brennende Glut regnet 4 Sekunden lang herab und trifft JEGLICHEN Gegner pro Sekunde.',
        sfx: 'drifterExplosion',
    },

    // ── FROST ───────────────────────────────────────────────────────────
    {
        id: 'usp_frostbolt', icon: '❄️', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [8, 10], manaCost: 21, cooldownSeconds: 6, castTimeSeconds: 0.5,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Frostbolt', nameDE: 'Frostblitz',
        descEn: 'A fast shard of ice. Cheap, quick, reliable cold damage.',
        descDE: 'Eine schnelle Eisscherbe. Günstiger, schneller, verlässlicher Kälteschaden.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_blizzard', icon: '🌨️', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Cold', 'Area', 'Damage over Time'], scalingTags: ['spell', 'cold', 'area', 'dot'],
        nameEn: 'Blizzard', nameDE: 'Blizzard',
        descEn: 'A freezing storm rages for 4 seconds, battering EVERY enemy each second.',
        descDE: 'Ein Eissturm tobt 4 Sekunden lang und trifft JEGLICHEN Gegner pro Sekunde.',
        sfx: 'time_freeze',
    },
    {
        id: 'usp_cone_of_cold', icon: '🧊', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'nova', dmg: [5, 8], manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Cold', 'Area'], scalingTags: ['spell', 'cold', 'area'],
        nameEn: 'Cone of Cold', nameDE: 'Kältekegel',
        descEn: 'A cone of freezing wind blasts EVERY enemy on the battlefield.',
        descDE: 'Ein Kegel aus Eiswind trifft ALLE Gegner auf dem Schlachtfeld.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_ice_lance', icon: '💎', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [9, 11], manaCost: 21, cooldownSeconds: 6, castTimeSeconds: 0.6,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Ice Lance', nameDE: 'Eislanze',
        descEn: 'A needle of pure ice that streaks at the target faster than any other spell.',
        descDE: 'Eine Nadel aus purem Eis, schneller am Ziel als jeder andere Zauber.',
        sfx: 'absoluteZero',
    },

    // ── ARCANE ──────────────────────────────────────────────────────────
    {
        id: 'usp_arcane_missiles', icon: '✨', theme: 'arcane', element: 'shadow', damageKind: 'arcane',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Arcane', 'Projectile'], scalingTags: ['spell', 'arcane', 'projectile'],
        nameEn: 'Arcane Missiles', nameDE: 'Arkane Geschosse',
        descEn: 'Launches 5 arcane missiles that home in on the target one after another.',
        descDE: 'Feuert 5 arkane Geschosse ab, die nacheinander ins Ziel einschlagen.',
        sfx: 'arcaneReveal',
    },
    {
        id: 'usp_arcane_explosion', icon: '💫', theme: 'arcane', element: 'shadow', damageKind: 'arcane',
        behavior: 'nova', dmg: [5, 9], manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Arcane', 'Area'], scalingTags: ['spell', 'arcane', 'area'],
        nameEn: 'Arcane Explosion', nameDE: 'Arkane Explosion',
        descEn: 'Detonates raw arcane energy around you, blasting EVERY enemy.',
        descDE: 'Sprengt rohe arkane Energie und trifft ALLE Gegner.',
        sfx: 'transitionMatrix',
    },
    {
        id: 'usp_arcane_blast', icon: '🔮', theme: 'arcane', element: 'shadow', damageKind: 'arcane',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 14, castTimeSeconds: 1.2,
        tags: ['Spell', 'Arcane', 'Projectile'], scalingTags: ['spell', 'arcane', 'projectile'],
        nameEn: 'Arcane Blast', nameDE: 'Arkaner Stoß',
        descEn: 'A concentrated blast of pure arcane force. Heavy single-target damage.',
        descDE: 'Ein konzentrierter Stoß reiner Arkanmacht. Schwerer Schaden gegen ein Ziel.',
        sfx: 'arcaneReveal',
    },
    {
        id: 'usp_disintegrate', icon: '⚛️', theme: 'arcane', element: 'shadow', damageKind: 'arcane',
        behavior: 'volley', dmg: [4, 6], count: 4, volleyDelayMs: 260, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Arcane', 'Channel'], scalingTags: ['spell', 'arcane', 'channel'],
        nameEn: 'Disintegrate', nameDE: 'Desintegration',
        descEn: 'Channels a beam of unraveling energy, striking the target 4 times in rapid succession.',
        descDE: 'Kanalisiert einen Strahl auflösender Energie: 4 Treffer in schneller Folge.',
        sfx: 'transitionCascade',
    },

    // ── SHADOW ──────────────────────────────────────────────────────────
    {
        id: 'usp_shadow_bolt', icon: '💜', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'single', dmg: [10, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.6,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Shadow Bolt', nameDE: 'Schattenblitz',
        descEn: 'A bolt of void darkness. Solid shadow damage for modest mana.',
        descDE: 'Ein Blitz aus Leere und Dunkelheit. Solider Schattenschaden für wenig Mana.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_corruption', icon: '☠️', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 6, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'dot'],
        nameEn: 'Corruption', nameDE: 'Verderbnis',
        descEn: 'Corrupts the target, dealing shadow damage over 6 seconds.',
        descDE: 'Verdirbt das Ziel: Schattenschaden über 6 Sekunden.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_shadow_word_pain', icon: '🖤', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [5, 6], tickDmg: [3, 5], ticks: 4, manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'dot'],
        nameEn: 'Shadow Word: Pain', nameDE: 'Schattenwort: Schmerz',
        descEn: 'A word of agony: instant shadow damage plus lingering pain over 4 seconds.',
        descDE: 'Ein Wort der Qual: sofortiger Schattenschaden plus 4 Sekunden Nachschmerz.',
        sfx: 'bayesTrapExplosion',
    },
    {
        id: 'usp_chaos_bolt', icon: '🟣', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'single', dmg: [20, 27], manaCost: 55, cooldownSeconds: 24, castTimeSeconds: 2.2,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Chaos Bolt', nameDE: 'Chaosblitz',
        descEn: 'A cataclysmic bolt of chaos. The hardest-hitting single spell in the arsenal.',
        descDE: 'Ein katastrophaler Chaosblitz. Der härteste Einzelzauber des Arsenals.',
        sfx: 'bayesTrapExplosion',
    },

    // ── LIGHTNING & NATURE ──────────────────────────────────────────────
    {
        id: 'usp_lightning_bolt', icon: '⚡', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [11, 13], manaCost: 26, cooldownSeconds: 8, castTimeSeconds: 0.6,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Lightning Bolt', nameDE: 'Blitzschlag',
        descEn: 'A crackling bolt of lightning. Fast and fierce.',
        descDE: 'Ein knisternder Blitz. Schnell und wild.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_chain_lightning', icon: '🌩️', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'chain', dmg: [13, 17], chainFalloff: 0.72, chainMax: 3, manaCost: 44, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Chaining'], scalingTags: ['spell', 'lightning', 'chain'],
        nameEn: 'Chain Lightning', nameDE: 'Kettenblitz',
        descEn: 'Lightning that leaps from the target to up to 2 more enemies, weakening with each jump.',
        descDE: 'Ein Blitz, der auf bis zu 2 weitere Gegner überspringt und pro Sprung schwächer wird.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_wrath', icon: '🍃', theme: 'nature', element: 'lightning', damageKind: 'nature',
        behavior: 'single', dmg: [10, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.5,
        tags: ['Spell', 'Nature', 'Projectile'], scalingTags: ['spell', 'nature', 'projectile'],
        nameEn: 'Wrath', nameDE: 'Zorn der Natur',
        descEn: 'Hurls the fury of the storm. Nature damage for modest mana.',
        descDE: 'Schleudert den Zorn des Sturms. Naturschaden für wenig Mana.',
        sfx: 'syla_nature',
    },
    {
        id: 'usp_starfall', icon: '🌟', theme: 'arcane', element: 'fire', damageKind: 'arcane',
        behavior: 'starfall', dmg: [3, 5], count: 6, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Arcane', 'Area'], scalingTags: ['spell', 'arcane', 'area'],
        nameEn: 'Starfall', nameDE: 'Sternenfall',
        descEn: '6 burning star shards crash onto random enemies over a few seconds.',
        descDE: '6 brennende Sternensplitter schlagen über einige Sekunden auf zufällige Gegner ein.',
        sfx: 'transitionMatrix',
    },

    // ── HOLY ────────────────────────────────────────────────────────────
    {
        id: 'usp_smite', icon: '🔆', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'single', dmg: [9, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.5,
        tags: ['Spell', 'Holy', 'Projectile'], scalingTags: ['spell', 'holy', 'projectile'],
        nameEn: 'Smite', nameDE: 'Züchtigung',
        descEn: 'A bolt of righteous light. Reliable holy damage.',
        descDE: 'Ein Blitz gerechten Lichts. Verlässlicher Heilschaden.',
        sfx: 'holySpell',
    },
    {
        id: 'usp_holy_fire', icon: '🕊️', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'ticks', dmg: [6, 9], tickDmg: [2, 4], ticks: 3, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.6,
        tags: ['Spell', 'Holy', 'Damage over Time'], scalingTags: ['spell', 'holy', 'dot'],
        nameEn: 'Holy Fire', nameDE: 'Heiliges Feuer',
        descEn: 'Sacred flames sear the target instantly and burn for 3 more seconds.',
        descDE: 'Heilige Flammen versengen das Ziel sofort und brennen 3 Sekunden nach.',
        sfx: 'holySpell',
    },
    {
        id: 'usp_consecration', icon: '🌞', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 44, cooldownSeconds: 20, castTimeSeconds: 1.0,
        tags: ['Spell', 'Holy', 'Area', 'Damage over Time'], scalingTags: ['spell', 'holy', 'area', 'dot'],
        nameEn: 'Consecration', nameDE: 'Weihe',
        descEn: 'Consecrates the ground for 3 seconds, searing EVERY enemy each second.',
        descDE: 'Weiht den Boden für 3 Sekunden: JEGLICHER Gegner wird pro Sekunde versengt.',
        sfx: 'holyHealing',
    },

    // ── PHYSICAL (melee strikes - thrown-blade visuals) ─────────────────
    // element 'physical' = pure physical hit: no elemental breakdown, so
    // only monster PHYSICAL resistance mitigates it (see _egApplyTargetResistances).
    {
        id: 'usp_heroic_strike', icon: '🤺', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [11, 13], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.6,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Heroic Strike', nameDE: 'Heroischer Stoß',
        descEn: 'A mighty empowered strike. Reliable physical damage for modest mana.',
        descDE: 'Ein gewaltiger verstärkter Hieb. Verlässlicher physischer Schaden für wenig Mana.',
        sfx: 'cleave',
    },
    {
        id: 'usp_mortal_strike', icon: '⚔️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [17, 23], manaCost: 49, cooldownSeconds: 20, castTimeSeconds: 1.4,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Mortal Strike', nameDE: 'Tödlicher Stoß',
        descEn: 'A devastating blow that crushes the target for heavy physical damage.',
        descDE: 'Ein verheerender Hieb, der das Ziel mit schwerem physischem Schaden zerschmettert.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_whirlwind', icon: '🌪️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Whirlwind', nameDE: 'Wirbelwind',
        descEn: 'Spin into a steel storm, slashing EVERY enemy on the battlefield.',
        descDE: 'Wirble in einem Stahlsturm und triff ALLE Gegner auf dem Schlachtfeld.',
        sfx: 'cleave',
    },
    {
        id: 'usp_rend', icon: '✂️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 5, manaCost: 31, cooldownSeconds: 14, castTimeSeconds: 0.7,
        tags: ['Spell', 'Physical', 'Damage over Time'], scalingTags: ['spell', 'physical', 'dot'],
        nameEn: 'Rend', nameDE: 'Verwunden',
        descEn: 'Rips the target open: instant damage plus bleeding over 5 seconds.',
        descDE: 'Reißt das Ziel auf: sofortiger Schaden plus 5 Sekunden Blutung.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_execute', icon: '💀', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [20, 27], manaCost: 53, cooldownSeconds: 24, castTimeSeconds: 1.8,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Execute', nameDE: 'Hinrichten',
        descEn: 'A finishing execution. The hardest-hitting physical strike in the arsenal.',
        descDE: 'Eine finale Hinrichtung. Der härteste physische Hieb des Arsenals.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_cleave', icon: '🪓', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 8], manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Cleave', nameDE: 'Spalten',
        descEn: 'A sweeping arc of steel that cleaves EVERY enemy on the battlefield.',
        descDE: 'Ein weiter Stahlbogen, der ALLE Gegner auf dem Schlachtfeld spaltet.',
        sfx: 'cleave',
    },

    // ── ARROWS (ranger shots - arrow-flight visuals) ────────────────────
    {
        id: 'usp_aimed_shot', icon: '🎯', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [19, 24], manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 2.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Aimed Shot', nameDE: 'Gezielter Schuss',
        descEn: 'A perfectly aimed arrow that punches through the target for massive physical damage.',
        descDE: 'Ein perfekt gezielter Pfeil mit gewaltigem physischem Schaden.',
        sfx: 'precisionMark',
    },
    {
        id: 'usp_multi_shot', icon: '🏹', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 8], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area', 'projectile'],
        nameEn: 'Multi-Shot', nameDE: 'Mehrfachschuss',
        descEn: 'A fan of arrows that rains onto EVERY enemy on the battlefield.',
        descDE: 'Ein Pfeilfächer, der auf ALLE Gegner auf dem Schlachtfeld niedergeht.',
        sfx: 'precisionMark',
    },
    {
        id: 'usp_barrage', icon: '➶', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Barrage', nameDE: 'Sperrfeuer',
        descEn: 'Unleashes a rapid barrage of 5 arrows into the target.',
        descDE: 'Entfesselt ein schnelles Sperrfeuer aus 5 Pfeilen auf das Ziel.',
        sfx: 'fieldScan',
    },
    {
        id: 'usp_arrow_volley', icon: '🌧️', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [4, 6], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Area', 'Damage over Time'], scalingTags: ['spell', 'physical', 'area', 'dot'],
        nameEn: 'Volley', nameDE: 'Salve',
        descEn: 'Arrows darken the sky for 4 seconds, striking EVERY enemy each second.',
        descDE: 'Pfeile verdunkeln 4 Sekunden lang den Himmel und treffen JEGLICHEN Gegner pro Sekunde.',
        sfx: 'fieldScan',
    },
    {
        id: 'usp_serpent_sting', icon: '🐍', theme: 'arrow', element: 'lightning', damageKind: 'nature',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [2, 4], ticks: 4, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.7,
        tags: ['Spell', 'Nature', 'Damage over Time'], scalingTags: ['spell', 'nature', 'dot', 'projectile'],
        nameEn: 'Serpent Sting', nameDE: 'Schlangenbiss',
        descEn: 'A venom-tipped arrow: instant nature damage plus poison over 4 seconds.',
        descDE: 'Ein vergifteter Pfeil: sofortiger Naturschaden plus Gift über 4 Sekunden.',
        sfx: 'syla_nature',
    },
    {
        id: 'usp_explosive_shot', icon: '🧨', theme: 'arrow', element: 'fire', damageKind: 'fire',
        behavior: 'delayed', dmg: [20, 27], delayMs: 900, manaCost: 53, cooldownSeconds: 24, castTimeSeconds: 1.6,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area', 'projectile'],
        nameEn: 'Explosive Shot', nameDE: 'Explosivschuss',
        descEn: 'An explosive charge sticks to the target and detonates after a short delay.',
        descDE: 'Eine Sprengladung haftet am Ziel und explodiert nach kurzer Verzögerung.',
        sfx: 'drifterExplosion',
    },

    // ── PATH OF EXILE: FIRE ─────────────────────────────────────────────
    {
        id: 'usp_firestorm', icon: '🌋', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'starfall', dmg: [3, 5], count: 8, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Firestorm', nameDE: 'Feuersturm',
        descEn: 'A storm of 8 flaming bolts crashes onto random enemies over a few seconds.',
        descDE: 'Ein Sturm aus 8 Flammenblitzen schlägt über einige Sekunden auf zufällige Gegner ein.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_flameblast', icon: '💣', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'delayed', dmg: [8, 11], delayMs: 1100, hitsAll: true, manaCost: 49, cooldownSeconds: 22, castTimeSeconds: 1.4,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Flameblast', nameDE: 'Flammenexplosion',
        descEn: 'Charges a massive explosion that detonates on EVERY enemy after a delay.',
        descDE: 'Lädt eine gewaltige Explosion auf, die verzögert auf JEGLICHEN Gegner detoniert.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_incinerate', icon: '🌡️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'volley', dmg: [3, 5], count: 4, volleyDelayMs: 200, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Fire', 'Channel'], scalingTags: ['spell', 'fire', 'channel'],
        nameEn: 'Incinerate', nameDE: 'Einäschern',
        descEn: 'Channels a torrent of flame, bathing the target in 4 waves of fire.',
        descDE: 'Kanalisiert einen Flammenstrom: 4 Feuerwellen in schneller Folge.',
        sfx: 'dofBurn',
    },

    // ── PATH OF EXILE: COLD ─────────────────────────────────────────────
    {
        id: 'usp_freezing_pulse', icon: '🌊', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'volley', dmg: [4, 5], count: 3, manaCost: 29, cooldownSeconds: 11, castTimeSeconds: 0.6,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Freezing Pulse', nameDE: 'Gefrierpuls',
        descEn: 'Releases 3 waves of freezing force that pulse through the target.',
        descDE: 'Entlässt 3 Wellen gefrierender Kraft, die durch das Ziel pulsieren.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_ice_spear', icon: '🔱', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [16, 20], manaCost: 44, cooldownSeconds: 16, castTimeSeconds: 1.4,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Ice Spear', nameDE: 'Eisspeer',
        descEn: 'A huge shard of ice with uncanny precision. Devastating single-target cold damage.',
        descDE: 'Eine gewaltige Eisscherbe mit unheimlicher Präzision. Vernichtender Kälteschaden.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_vortex', icon: '🌀', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'ticks', dmg: [5, 7], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.0,
        tags: ['Spell', 'Cold', 'Area', 'Damage over Time'], scalingTags: ['spell', 'cold', 'area', 'dot'],
        nameEn: 'Vortex', nameDE: 'Wirbel',
        descEn: 'Detonates a vortex of ice on EVERY enemy, then leaves freezing ground that burns for 3 seconds.',
        descDE: 'Zündet einen Eiswirbel auf JEGLICHEN Gegner und hinterlässt 3 Sekunden gefrierenden Boden.',
        sfx: 'time_freeze',
    },
    {
        id: 'usp_cold_snap', icon: '🥶', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'nova', dmg: [7, 10], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Cold', 'Area'], scalingTags: ['spell', 'cold', 'area'],
        nameEn: 'Cold Snap', nameDE: 'Kälteschock',
        descEn: 'A snap of absolute cold that cracks EVERY enemy on the battlefield.',
        descDE: 'Ein Schnappen absoluter Kälte, das ALLE Gegner auf dem Schlachtfeld aufreißt.',
        sfx: 'time_freeze',
    },

    // ── PATH OF EXILE: LIGHTNING ────────────────────────────────────────
    {
        id: 'usp_spark', icon: '🎇', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'wild', dmg: [3, 5], count: 6, volleyDelayMs: 150, manaCost: 42, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Spark', nameDE: 'Funken',
        descEn: 'Launches 6 wild sparks that bounce unpredictably into random enemies.',
        descDE: 'Feuert 6 wilde Funken ab, die unberechenbar in zufällige Gegner einschlagen.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_arc', icon: '🔗', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'chain', dmg: [10, 13], chainFalloff: 0.8, chainMax: 5, manaCost: 47, cooldownSeconds: 20, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Chaining'], scalingTags: ['spell', 'lightning', 'chain'],
        nameEn: 'Arc', nameDE: 'Lichtbogen',
        descEn: 'An arc of lightning that chains across up to 5 enemies, barely weakening.',
        descDE: 'Ein Lichtbogen, der über bis zu 5 Gegner springt und kaum schwächer wird.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_storm_call', icon: '⛈️', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'delayed', dmg: [7, 9], delayMs: 1000, hitsAll: true, manaCost: 47, cooldownSeconds: 20, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Area'], scalingTags: ['spell', 'lightning', 'area'],
        nameEn: 'Storm Call', nameDE: 'Sturmruf',
        descEn: 'Marks EVERY enemy; lightning crashes down on all of them after a delay.',
        descDE: 'Markiert ALLE Gegner; nach Verzögerung schlägt der Blitz auf jeden ein.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_ball_lightning', icon: '🔵', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'volley', dmg: [3, 5], count: 4, volleyDelayMs: 220, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Ball Lightning', nameDE: 'Kugelblitz',
        descEn: 'Hurls 4 slow, crackling orbs that grind through the target one after another.',
        descDE: 'Schleudert 4 langsame, knisternde Kugeln, die nacheinander durchs Ziel mahlen.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_crackling_lance', icon: '🦯', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 14, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Crackling Lance', nameDE: 'Knisterlanze',
        descEn: 'A focused lance of crackling energy. Heavy single-target lightning damage.',
        descDE: 'Eine fokussierte Lanze aus knisternder Energie. Schwerer Blitzschaden.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_orb_of_storms', icon: '🌐', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [3, 5], ticks: 3, manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Lightning', 'Damage over Time'], scalingTags: ['spell', 'lightning', 'dot'],
        nameEn: 'Orb of Storms', nameDE: 'Sturmkugel',
        descEn: 'Conjures a storm orb that zaps the target instantly, then 3 more times.',
        descDE: 'Beschwört eine Sturmkugel: sofortiger Blitz plus 3 weitere Entladungen.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_discharge', icon: '💥', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'nova', dmg: [10, 13], manaCost: 48, cooldownSeconds: 24, castTimeSeconds: 1.6, perTarget: true,
        tags: ['Spell', 'Lightning', 'Area'], scalingTags: ['spell', 'lightning', 'area'],
        nameEn: 'Discharge', nameDE: 'Entladung',
        descEn: 'Discharges all stored power in one blast that ravages EVERY enemy.',
        descDE: 'Entlädt alle gespeicherte Macht in einem Stoß, der ALLE Gegner verwüstet.',
        sfx: 'gust_thunder',
    },

    // ── PATH OF EXILE: SHADOW & CHAOS ───────────────────────────────────
    {
        id: 'usp_contagion', icon: '🤢', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 5, hitsAll: true, manaCost: 42, cooldownSeconds: 20, castTimeSeconds: 0.9,
        tags: ['Spell', 'Shadow', 'Area', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'area', 'dot'],
        nameEn: 'Contagion', nameDE: 'Ansteckung',
        descEn: 'Spreads a plague to EVERY enemy that festers over 5 seconds.',
        descDE: 'Verbreitet eine Seuche auf ALLE Gegner, die 5 Sekunden lang wütet.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_bane', icon: '🌑', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'nova', dmg: [7, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Shadow', 'Area'], scalingTags: ['spell', 'shadow', 'area'],
        nameEn: 'Bane', nameDE: 'Bannfluch',
        descEn: 'A wave of dread that crushes EVERY enemy on the battlefield.',
        descDE: 'Eine Welle des Grauens, die ALLE Gegner auf dem Schlachtfeld zermalmt.',
        sfx: 'bayesTrapExplosion',
    },
    {
        id: 'usp_soulrend', icon: '👻', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'volley', dmg: [4, 5], count: 4, volleyDelayMs: 200, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Soulrend', nameDE: 'Seelenriss',
        descEn: 'Tears 4 shreds from the target\u2019s soul, each feeding you with leeched life.',
        descDE: 'Reißt 4 Fetzen aus der Seele des Ziels - jeder Treffer heilt dich durch Lebensentzug.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_blight', icon: '☣️', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 44, cooldownSeconds: 20, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Area', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'area', 'dot'],
        nameEn: 'Blight', nameDE: 'Fäulnis',
        descEn: 'Coats EVERY enemy in rotting decay that eats them for 3 seconds.',
        descDE: 'Überzieht ALLE Gegner mit Fäulnis, die sie 3 Sekunden lang zerfrisst.',
        sfx: 'bayesTrapExplosion',
    },

    // ── PATH OF EXILE: BLOOD & BLADES ───────────────────────────────────
    {
        id: 'usp_exsanguinate', icon: '🩸', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 16, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Exsanguinate', nameDE: 'Ausbluten',
        descEn: 'Rips blood from the target in a crimson cascade. A physical SPELL, not a strike.',
        descDE: 'Reißt das Blut kaskadenartig aus dem Ziel. Ein physischer ZAUBER, kein Hieb.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_reap', icon: '🌾', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [7, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Reap', nameDE: 'Ernte',
        descEn: 'A spectral scythe reaps EVERY enemy on the battlefield.',
        descDE: 'Eine Geistersense erntet ALLE Gegner auf dem Schlachtfeld.',
        sfx: 'cleave',
    },
    {
        id: 'usp_ethereal_knives', icon: '🔪', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Ethereal Knives', nameDE: 'Ätherische Klingen',
        descEn: 'Hurls 5 conjured spirit knives that slice through the target.',
        descDE: 'Schleudert 5 beschworene Geistklingen, die durchs Ziel schneiden.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_bladefall', icon: '🗡️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'starfall', dmg: [3, 5], count: 6, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Bladefall', nameDE: 'Klingenfall',
        descEn: '6 conjured blades rain from the sky onto random enemies.',
        descDE: '6 beschworene Klingen regnen vom Himmel auf zufällige Gegner.',
        sfx: 'cleave',
    },
    {
        id: 'usp_blade_vortex', icon: '🪃', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [5, 6], tickDmg: [4, 5], ticks: 3, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Physical', 'Damage over Time'], scalingTags: ['spell', 'physical', 'dot'],
        nameEn: 'Blade Vortex', nameDE: 'Klingenwirbel',
        descEn: 'Orbiting spirit blades shred the target instantly, then 3 more times.',
        descDE: 'Kreisende Geistklingen zerfetzen das Ziel sofort und 3 weitere Male.',
        sfx: 'cleave',
    },
    {
        id: 'usp_blade_blast', icon: '✴️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'delayed', dmg: [19, 24], delayMs: 800, manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 1.6,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Blade Blast', nameDE: 'Klingenexplosion',
        descEn: 'Detonates a buried blade under the target after a short delay.',
        descDE: 'Sprengt nach kurzer Verzögerung eine vergrabene Klinge unter dem Ziel.',
        sfx: 'drifterExplosion',
    },

    // ── SUPPORT (defensive self-casts) ──────────────────────────────────
    // No monster target required - these cast on YOU (see the SUPPORT
    // SPELLS section below for how their magnitudes are derived). They are
    // deliberately the only spells in the arsenal that ignore the
    // target check, and they still need a live encounter to be worth
    // casting (and to be castable at all).
    {
        id: 'usp_mend_wounds', icon: '🩹', theme: 'holy', element: 'arcane', damageKind: 'holy',
        behavior: 'heal', selfCast: true, manaCost: 26, cooldownSeconds: 25,
        healFlat: 28, healPct: 10,
        tags: ['Spell', 'Holy', 'Support', 'Heal'], scalingTags: ['spell', 'holy', 'support', 'heal'],
        nameEn: 'Mend Wounds', nameDE: 'Wunden schließen',
        descEn: 'Channels restorative light into yourself, instantly restoring a chunk of Life. The flat portion grows with the charm rank; the rest scales with your maximum Life.',
        descDE: 'Leitet heilendes Licht in dich und stellt sofort einen Teil deines Lebens wieder her. Der feste Anteil wächst mit dem Anhänger-Rang, der Rest skaliert mit deinem maximalen Leben.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_renewal', icon: '🌿', theme: 'nature', element: 'nature', damageKind: 'nature',
        behavior: 'hot', selfCast: true, manaCost: 22, cooldownSeconds: 22,
        healTickFlat: 6, healTickPct: 2, ticks: 6, tickMs: 1000,
        tags: ['Spell', 'Nature', 'Support', 'Heal over Time'], scalingTags: ['spell', 'nature', 'support', 'heal'],
        nameEn: 'Renewal', nameDE: 'Erneuerung',
        descEn: 'Plants a renewal bloom on you that heals once per second for 6 seconds. More total Life than Mend Wounds, but it arrives slowly - cast it before the hit, not after.',
        descDE: 'Pflanzt eine Erneuerungsblüte auf dir, die 6 Sekunden lang einmal pro Sekunde heilt. Insgesamt mehr Leben als „Wunden schließen“, aber langsam - wirke sie vor dem Treffer, nicht danach.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_barrier', icon: '🔷', theme: 'arcane', element: 'shadow', damageKind: 'arcane',
        behavior: 'shield', selfCast: true, manaCost: 31, cooldownSeconds: 28,
        absorbFlat: 26, absorbPct: 45,
        tags: ['Spell', 'Arcane', 'Support', 'Shield'], scalingTags: ['spell', 'arcane', 'support', 'shield'],
        nameEn: 'Barrier', nameDE: 'Barriere',
        descEn: 'Condenses raw mana into your absorption shield, refilling it instantly instead of waiting out the 18-second regeneration delay. The mana you spend is the shield you gain.',
        descDE: 'Verdichtet rohe Mana zu deinem Absorptionsschild und füllt ihn sofort wieder auf, statt die 18 Sekunden Regenerationsverzögerung abzuwarten. Die ausgegebene Mana ist der gewonnene Schild.',
        sfx: 'player_shield_damage_taken',
    },
    {
        id: 'usp_bulwark', icon: '🛡️', theme: 'holy', element: 'arcane', damageKind: 'holy',
        behavior: 'guard', selfCast: true, manaCost: 26, cooldownSeconds: 30, buffSeconds: 8,
        drPct: 18, drPctPerRank: 1.5, drPctCap: 32,
        armourPct: 40, armourPctPerRank: 4, armourPctCap: 76,
        tags: ['Spell', 'Holy', 'Support', 'Buff'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Bulwark', nameDE: 'Bollwerk',
        descEn: 'Braces you in consecrated stone: greatly increased Armour and reduced damage taken. The classic "brace for the big hit" cooldown.',
        descDE: 'Panzerst dich in geweihtem Stein: stark erhöhte Rüstung und reduzierter erlittener Schaden. Der klassische „jetzt kommt der große Treffer“-Cooldown.',
        sfx: 'player_shield_damage_taken',
    },
    {
        id: 'usp_windward', icon: '💨', theme: 'nature', element: 'nature', damageKind: 'nature',
        behavior: 'evade', selfCast: true, manaCost: 22, cooldownSeconds: 28, buffSeconds: 8,
        dodgePct: 12, dodgePctPerRank: 1, dodgePctCap: 21,
        tags: ['Spell', 'Nature', 'Support', 'Buff'], scalingTags: ['spell', 'nature', 'support'],
        nameEn: 'Windward', nameDE: 'Windwärts',
        descEn: 'Wind carries your steps: a flat chance to dodge physical attacks outright. Complements Armour rather than stacking with it - evasion negates hits, armour shrinks them.',
        descDE: 'Wind trägt deine Schritte: eine feste Chance, physischen Angriffen komplett auszuweichen. Ergänzt Rüstung, statt sich damit zu stapeln - Ausweichen verhindert Treffer, Rüstung verkleinert sie.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_aegis_ward', icon: '✨', theme: 'holy', element: 'arcane', damageKind: 'holy',
        behavior: 'ward', selfCast: true, manaCost: 38, cooldownSeconds: 40, buffSeconds: 12,
        wardCharges: 2, wardChargesPerRank: 0.34, wardChargesCap: 5,
        tags: ['Spell', 'Holy', 'Support', 'Buff'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Aegis Ward', nameDE: 'Ägis-Schutz',
        descEn: 'Wraps you in a lattice of light that negates the next hits entirely - boss specials included, which nothing else in the game can do. Only hits dealing at least 5% of your maximum Life consume a charge, so chip damage and damage-over-time ticks cannot waste one. Charges scale slowly with rank; the duration is the real limit.',
        descDE: 'Hüllt dich in ein Gitter aus Licht, das die nächsten Treffer vollständig negiert - auch Boss-Fähigkeiten, was sonst nichts im Spiel kann. Nur Treffer mit mindestens 5% deines maximalen Lebens verbrauchen eine Ladung, damit Klein- und Dauerschaden keine verschwenden. Ladungen skalieren langsam mit dem Rang; die Dauer ist die eigentliche Grenze.',
        sfx: 'varianceShield',
    },
    {
        id: 'usp_retribution', icon: '🔥', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'thorns', selfCast: true, manaCost: 29, cooldownSeconds: 32, buffSeconds: 10,
        thornsPct: 25, thornsPctPerRank: 3, thornsPctCap: 52,
        tags: ['Spell', 'Fire', 'Support', 'Buff'], scalingTags: ['spell', 'fire', 'support'],
        nameEn: 'Retribution', nameDE: 'Vergeltung',
        descEn: 'Wreathes you in punishing flame: every monster that lands a hit on you takes back a share of the damage it dealt, for 10 seconds. Scales with the size of the incoming hit, so it is strongest against the biggest attacks.',
        descDE: 'Hüllt dich in strafende Flammen: Jedes Monster, das dich trifft, erleidet einen Teil des zugefügten Schadens zurück, 10 Sekunden lang. Skaliert mit der Größe des eingehenden Treffers und ist damit gegen die größten Angriffe am stärksten.',
        sfx: 'dofBurn',
    },

    // ── MOVEMENT (repositioning self-casts) ──────────────────────────────
    // No monster target and no damage: these move YOU. They exist because
    // damage against the player is resolved against the SPRITE'S HITBOX
    // (js/combat/combat-hazards.js → _egHzPlayerRect) and bosses telegraph
    // where they are about to land, so "be somewhere else in time" is real
    // defence. Everything here aims with the direction the sprite last
    // WALKED (js/sprite/player_sprite.js → getAvatarLastMoveDir).
    //
    // Ranges are quoted against the walk speed (320px/s, ×1.0–1.35 boots) so
    // each spell has a clear identity:
    //   Dash      ≈ 0.4–0.65s of walking, cheap and repeatable (7s)
    //   Blink     ≈ 0.7–1.25s of walking, INSTANTLY - the telegraph answer
    //   Disengage ≈ 0.6–1.0s of walking, BACKWARD, then a head start
    //   Windstep  no jump at all, but the most total distance per cast
    //   Rift Anchor  two-stage: plant it, then leave from anywhere
    {
        id: 'usp_blink', icon: '🌀', theme: 'arcane', element: 'arcane', damageKind: 'arcane',
        behavior: 'blink', selfCast: true, manaCost: 34, cooldownSeconds: 18,
        // Charge pool instead of a single cooldown: each cast spends one
        // charge, spent charges recharge individually and in parallel (see
        // CHARGE-BASED COOLDOWNS below). cooldownSeconds is kept as the
        // historical reference value; the runtime reads the charge fields.
        chargeMax: 3, chargeRechargeSeconds: 18,
        moveBasePx: 220, movePxPerRank: 20, movePxCap: 400,
        tags: ['Spell', 'Arcane', 'Movement', 'Teleport'], scalingTags: ['spell', 'arcane', 'movement'],
        nameEn: 'Blink', nameDE: 'Blinzeln',
        descEn: 'Tears a hole in space and steps through it instantly in the direction you were walking. Nothing on the path can touch you - the step is a teleport, not a sprint, so a pool of lava or a wall of projectiles on the way is simply not there. You can still land somewhere bad: blink into the wrong spot and the next hit finds you.',
        descDE: 'Reißt ein Loch in den Raum und tritt sofort in die Richtung hindurch, in die du gelaufen bist. Auf dem Weg kann dich nichts treffen - der Schritt ist eine Teleportation, kein Sprint, also existiert ein Lavasee oder ein Projektilvorhang dazwischen schlicht nicht. Du kannst trotzdem falsch landen: Blinzel an die falsche Stelle und der nächste Treffer findet dich.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_dash', icon: '💫', theme: 'shadow', element: 'physical', damageKind: 'physical',
        behavior: 'dash', selfCast: true, manaCost: 17, cooldownSeconds: 7, glideMs: 170,
        // Charge pool like Blink - short recharges, so the rhythm is
        // burst-burst-wait instead of one long lockout.
        chargeMax: 3, chargeRechargeSeconds: 7,
        moveBasePx: 130, movePxPerRank: 8, movePxCap: 210,
        tags: ['Spell', 'Physical', 'Movement', 'Dash'], scalingTags: ['spell', 'physical', 'movement'],
        nameEn: 'Shadow Dash', nameDE: 'Schattensprint',
        descEn: 'A short burst of speed along the ground you pick - cheap, fast to come back, and short enough that it will not cross the whole arena. Unlike Blink you still travel, so anything in the way still bites.',
        descDE: 'Ein kurzer Geschwindigkeitsschub über den Boden deiner Wahl - günstig, schnell wieder bereit und zu kurz, um die ganze Arena zu überqueren. Anders als beim Blinzeln reist du tatsächlich, also beißt alles im Weg weiterhin zu.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_disengage', icon: '🦘', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'disengage', selfCast: true, manaCost: 22, cooldownSeconds: 16, glideMs: 300,
        buffSeconds: 3, speedPct: 35, speedPctPerRank: 3, speedPctCap: 65,
        moveBasePx: 190, movePxPerRank: 14, movePxCap: 320,
        tags: ['Spell', 'Physical', 'Movement', 'Leap'], scalingTags: ['spell', 'physical', 'movement'],
        nameEn: 'Disengage', nameDE: 'Rückzugssprung',
        descEn: 'Leaps BACKWARD - opposite the direction you were walking - and the momentum carries into a short burst of foot speed. The escape tool: it creates distance even when the boss is between you and the exit.',
        descDE: 'Springt RÜCKWÄRTS - entgegen der Richtung, in die du gelaufen bist - und der Schwung trägt in einen kurzen Laufschub. Das Fluchttalent: Es schafft Abstand, selbst wenn der Boss zwischen dir und dem Ausgang steht.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_windstep', icon: '🪶', theme: 'nature', element: 'nature', damageKind: 'nature',
        behavior: 'windstep', selfCast: true, manaCost: 19, cooldownSeconds: 20, buffSeconds: 6,
        speedPct: 30, speedPctPerRank: 3.5, speedPctCap: 62,
        tags: ['Spell', 'Nature', 'Movement', 'Buff'], scalingTags: ['spell', 'nature', 'movement'],
        nameEn: 'Windstep', nameDE: 'Windschritt',
        descEn: 'Lightens your feet for 6 seconds. No burst, no teleport - just more total ground covered than any single jump, which is what you want when the fight is a long dance rather than one dodge.',
        descDE: 'Macht deine Füße 6 Sekunden lang leicht. Kein Sprung, keine Teleportation - nur mehr zurückgelegte Strecke als mit jedem einzelnen Sprung, was du willst, wenn der Kampf ein langer Tanz ist statt eines Ausweichmannövers.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_rift_anchor', icon: '📍', theme: 'arcane', element: 'arcane', damageKind: 'arcane',
        behavior: 'anchor', selfCast: true, manaCost: 17, cooldownSeconds: 26,
        anchorSeconds: 15, anchorPlaceCooldownSeconds: 3,
        tags: ['Spell', 'Arcane', 'Movement', 'Recall'], scalingTags: ['spell', 'arcane', 'movement'],
        nameEn: 'Rift Anchor', nameDE: 'Spaltanker',
        descEn: 'Two casts. The first plants an anchor where you stand and arms it for 15 seconds; the second is free of the puzzle and returns you to the anchor from anywhere - no travel, no path, no argument. Cast it on good ground before things go wrong. Both casts cost mana; only the recall uses the full cooldown.',
        descDE: 'Zwei Zauber. Der erste setzt einen Anker, wo du stehst, und schärft ihn 15 Sekunden lang; der zweite reißt dich von überall zum Anker zurück - ohne Weg, ohne Strecke, ohne Widerrede. Wirke ihn auf gutem Boden, bevor es schiefgeht. Beide Zauber kosten Mana; nur der Rückruf nutzt die volle Abklingzeit.',
        sfx: 'classSelected',
    },
];

export const UNIVERSAL_SPELL_MAP = {};
UNIVERSAL_SPELL_DEFS.forEach((d) => { UNIVERSAL_SPELL_MAP[d.id] = d; });

// Group label fallback (used directly so no translation keys are required).
// No emoji here - the spell book prefixes the section icon itself
// (GROUP_ICONS in js/skills/skill-spellbook.js), so embedding one would
// render it twice.
export function _uspGroupTitle() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'Zauber' : 'Spells';
}

// Spellbook section header for the defensive family.
export function _uspSupportGroupTitle() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'Unterstützungszauber' : 'Support Spells';
}


//------------------------------------------------------------------------
//-------------------------SUPPORT SPELLS-------------------------------
//------------------------------------------------------------------------
// The defensive self-cast family: heal / heal-over-time / absorption refill /
// damage reduction / evasion / hit-negation / damage reflection.
//
// MAGNITUDE MODEL - heals and shields are never a bare flat number the
// balance pass has to revisit every time gear grows:
//
//     magnitude = flatBase × RANK_MULT(rank) + pctOfPool × poolMax
//
//   • the flat half scales with the charm's CAST rank, using the same curve
//     offensive spells use (SPELL_RANK_DAMAGE_MULT, js/skills/skill-charms.js),
//     so a rank-10 support charm is the same class of late-game prize;
//   • the percentage half scales with the player's own gear-driven pool
//     (max Life for heals, max Absorption for the shield), so a heal never
//     falls behind as gear grows - and no new "healing power" stat is needed;
//   • overflow is impossible by construction: heals clamp at max Life and the
//     shield clamps at max Absorption.
//
// BUFF STRENGTH (damage reduction, dodge, thorns, ward charges) is ADDITIVE
// per rank and hard-capped. Survivability compounds far faster than damage,
// so a rank-10 Bulwark is ~1.8x a rank-1 Bulwark, not 9x - the rank buys a
// stronger, longer-lasting answer, it does not buy immunity.
//
// DURATION is flat per spell. Cooldowns are long relative to durations on
// purpose: every support spell is a decision about WHEN, not a passive aura.
//
// CLEANUP: buffs live only inside an encounter. _egStopEncounter() and
// startLevel() call _uspClearSupportBuffs(), and the sweep respects
// _gamePaused so pausing (spell book open) does not burn buff time.
//------------------------------------------------------------------------

// Behaviours handled as self-casts (no monster target required).
export const USP_SUPPORT_BEHAVIORS = ['heal', 'hot', 'shield', 'guard', 'evade', 'ward', 'thorns'];

// Sweep cadence. Also the paused-clock compensation step (the whole sweep is
// skipped while paused and every expiry is pushed forward by one tick instead).
export const USP_BUFF_TICK_MS = 250;

// Aegis Ward only spends a charge on a hit worth at least this share of the
// player's maximum Life. Without it, a 5-damage ignite tick or a chip hazard
// would silently eat a charge that was meant for the boss slam - the ward
// would read as broken. Documented in the spell's description and tooltip.
export const USP_WARD_MIN_HIT_PCT = 5;

// Active support buffs: { spellId, kind, icon, until, ...payload }.
export let _uspActiveBuffs = [];
export let _uspBuffSweepInterval = null;
// Remaining full-hit negations from the Aegis Ward.
export let _uspWardCharges = 0;

// True when the spell (id or def) is part of the defensive family.
export function isUniversalSupportSpell(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? UNIVERSAL_SPELL_MAP[spellOrId] : spellOrId;
    return !!spell && USP_SUPPORT_BEHAVIORS.indexOf(spell.behavior) !== -1;
}

// Cast rank: the slotted charm's rank, else the trained rank (js/skills/
// skill-charms.js). Falls back to 1 before the charm system loads.
export function _uspCastRank(spellId) {
    if (typeof getSkillCastRankFull === 'function') {
        try {
            const r = getSkillCastRankFull(spellId);
            if (r) return Math.max(1, r);
        } catch (e) { /* charm system not ready - rank 1 */ }
    }
    return 1;
}

// Rank multiplier for support magnitudes (the offensive curve).
export function _uspSupportRankMult(spellId) {
    if (typeof getSpellRankDamageMultForSkill === 'function') {
        try {
            const m = getSpellRankDamageMultForSkill(spellId);
            if (m) return m;
        } catch (e) { /* fall through */ }
    }
    return 1;
}

// ---------------------------------------------------------------------
// EXPLICIT-RANK VARIANTS
// ---------------------------------------------------------------------
// The live resolvers read the SLOTTED charm, so they can only ever answer for
// one rank. Every magnitude calculator below therefore takes an optional
// `rank` argument: omitted (the cast path) it resolves the live cast rank,
// supplied it answers "what would rank N be?" - which is what the spell rank
// audit screen (js/skills/spell-rank-audit.js) asks. Keeping ONE calculator
// for both means the audit tool cannot drift from the real cast.
export function _uspRankFor(spellId, rank) {
    if (rank != null) return Math.max(1, Math.round(Number(rank) || 1));
    return _uspCastRank(spellId);
}

export function _uspSupportRankMultFor(spellId, rank) {
    if (rank != null) {
        if (typeof getSpellRankDamageMult === 'function') {
            try {
                const m = getSpellRankDamageMult(rank);
                if (m) return m;
            } catch (e) { /* fall through */ }
        }
        return 1;
    }
    return _uspSupportRankMult(spellId);
}

// ---------------------------------------------------------------------
// HEALING POWER (gear stat)
// ---------------------------------------------------------------------
// The support analogue of Spell Damage: equipment that makes every SUPPORT
// cast land harder. Applied as `round(raw × (1 + inc%)) + flat`, so a player
// wearing none of it gets exactly the authored number - 0 gear is bit-for-bit
// today's behaviour, which is what makes the stat safe to add mid-save.
//
// The axes it CANNOT touch are as deliberate as the ones it can: guard (DR%),
// evade (dodge%), ward (charges) and thorns are additive-with-a-hard-cap, and
// scaling those from gear would quietly raise a ceiling that exists to keep
// boss specials fair. Healing power buys throughput inside the existing
// limits, never a new one.
export function _uspHealingPower() {
    try {
        if (typeof globalThis._egComputePlayerStats === 'function') {
            const s = globalThis._egComputePlayerStats() || {};
            return {
                flat: Math.max(0, Number(s.healingPowerFlat) || 0),
                incPct: Math.max(0, Number(s.healingPowerIncPct) || 0),
            };
        }
    } catch (e) { /* outside an endgame level - no gear */ }
    return { flat: 0, incPct: 0 };
}

export function _uspApplyHealingPower(amount) {
    const hp = _uspHealingPower();
    return Math.max(1, Math.round(amount * (1 + hp.incPct / 100)) + hp.flat);
}

// base + perRank × (rank - 1), hard-capped. Used for every buff axis.
export function _uspRankAdditive(base, perRank, cap, rank) {
    const value = (base || 0) + (perRank || 0) * (Math.max(1, rank) - 1);
    return (cap != null) ? Math.min(cap, value) : value;
}

// The player's Life pool (100 baseline before any gear).
export function _uspMaxLife() {
    return (typeof globalThis.playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
}

// The player's Absorption pool - 0 without absorption gear, in which case
// Barrier has nothing to refill and says so instead of silently no-oping.
export function _uspMaxAbsorption() {
    try {
        if (typeof globalThis._egComputePlayerStats === 'function') {
            return Math.max(0, Math.round(globalThis._egComputePlayerStats().absorption || 0));
        }
    } catch (e) { /* outside an endgame level - no shield */ }
    return 0;
}

// ---------------------------------------------------------------------
// Magnitudes (all share the flat×rank + %×pool model)
// ---------------------------------------------------------------------

// The authored magnitude BEFORE healing power - flat×rank + %×pool. Kept
// separate so the audit screen can show what the spell alone is worth and
// what the player's gear adds on top of it.
export function _uspBaseHeal(spell, rank) {
    const flat = Math.round((spell.healFlat || 0) * _uspSupportRankMultFor(spell.id, rank));
    const pct = Math.round(_uspMaxLife() * ((spell.healPct || 0) / 100));
    return Math.max(1, flat + pct);
}

export function _uspBaseHotTick(spell, rank) {
    const flat = Math.round((spell.healTickFlat || 0) * _uspSupportRankMultFor(spell.id, rank));
    const pct = Math.round(_uspMaxLife() * ((spell.healTickPct || 0) / 100));
    return Math.max(1, flat + pct);
}

export function _uspBaseAbsorb(spell, rank) {
    const flat = Math.round((spell.absorbFlat || 0) * _uspSupportRankMultFor(spell.id, rank));
    const pct = Math.round(_uspMaxAbsorption() * ((spell.absorbPct || 0) / 100));
    return Math.max(1, flat + pct);
}

// The numbers the game actually casts with (authored magnitude + gear).
export function _uspCalcHeal(spell, rank) {
    return _uspApplyHealingPower(_uspBaseHeal(spell, rank));
}

export function _uspCalcHotTick(spell, rank) {
    return _uspApplyHealingPower(_uspBaseHotTick(spell, rank));
}

export function _uspCalcAbsorb(spell, rank) {
    return _uspApplyHealingPower(_uspBaseAbsorb(spell, rank));
}

// Rank-scaled buff axes (capped additively). No healing power here - see the
// note above _uspHealingPower() for why the caps stay untouched.
export function _uspCalcDrPct(spell, rank) {
    return Math.round(_uspRankAdditive(spell.drPct, spell.drPctPerRank, spell.drPctCap, _uspRankFor(spell.id, rank)));
}
export function _uspCalcArmourPct(spell, rank) {
    return Math.round(_uspRankAdditive(spell.armourPct, spell.armourPctPerRank, spell.armourPctCap, _uspRankFor(spell.id, rank)));
}
export function _uspCalcDodgePct(spell, rank) {
    return Math.round(_uspRankAdditive(spell.dodgePct, spell.dodgePctPerRank, spell.dodgePctCap, _uspRankFor(spell.id, rank)));
}
export function _uspCalcThornsPct(spell, rank) {
    return Math.round(_uspRankAdditive(spell.thornsPct, spell.thornsPctPerRank, spell.thornsPctCap, _uspRankFor(spell.id, rank)));
}
export function _uspCalcWardCharges(spell, rank) {
    const raw = _uspRankAdditive(spell.wardCharges, spell.wardChargesPerRank, spell.wardChargesCap, _uspRankFor(spell.id, rank));
    return Math.max(1, Math.floor(raw));
}

// ---------------------------------------------------------------------
// Player pool writers
// ---------------------------------------------------------------------

// Heals the player; returns the amount actually restored (0 at full Life).
export function _uspHealPlayer(amount) {
    if (typeof globalThis.playerCurrentHP !== 'undefined' && typeof globalThis.playerMaxHP !== 'undefined') {
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, before + Math.max(0, Math.round(amount)));
        const gained = globalThis.playerCurrentHP - before;
        if (gained > 0 && typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        return gained;
    }
    return 0;
}

// Adds to the absorption shield; returns the amount actually gained.
export function _uspRestoreAbsorption(amount) {
    if (typeof globalThis._egPlayerAbsorptionCurrent === 'undefined') return 0;
    const max = _uspMaxAbsorption();
    if (max <= 0) return 0;
    const before = globalThis._egPlayerAbsorptionCurrent;
    globalThis._egPlayerAbsorptionCurrent = Math.min(max, before + Math.max(0, Math.round(amount)));
    return globalThis._egPlayerAbsorptionCurrent - before;
}

// ---------------------------------------------------------------------
// Buff registry (sweep, expiry, pause handling)
// ---------------------------------------------------------------------

export function _uspStartBuffSweep() {
    if (_uspBuffSweepInterval) return;
    _uspBuffSweepInterval = setInterval(_uspSweepSupportBuffs, USP_BUFF_TICK_MS);
}

export function _uspSweepSupportBuffs() {
    // Death ends every buff immediately - a corpse must not keep its ward.
    if (typeof globalThis.dead !== 'undefined' && globalThis.dead) {
        if (_uspActiveBuffs.length) _uspClearSupportBuffs();
        return;
    }

    // Paused (spell book / menus): the fight clock is stopped, so buff time
    // must stop too - push every expiry forward by one tick rather than
    // letting wall-clock time eat the buff while the player reads a tooltip.
    // The armed Rift Anchor is a buff for exactly this reason: opening the
    // spell book must not eat the window you set up.
    if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) {
        if (_uspAnchor) _uspAnchor.until += USP_BUFF_TICK_MS;
        if (!_uspActiveBuffs.length) return;
        for (const b of _uspActiveBuffs) {
            b.until += USP_BUFF_TICK_MS;
            if (b.nextTickAt) b.nextTickAt += USP_BUFF_TICK_MS;
        }
        return;
    }

    const now = Date.now();

    // HoT ticks ride this sweep so they inherit the pause handling above.
    for (const b of _uspActiveBuffs) {
        if (b.kind !== 'hot' || !(b.ticksLeft > 0)) continue;
        if (now < b.nextTickAt) continue;
        const spell = UNIVERSAL_SPELL_MAP[b.spellId];
        if (spell) {
            _uspHealPlayer(_uspCalcHotTick(spell));
            if (typeof _uspSupportPulseFX === 'function') _uspSupportPulseFX(spell);
        }
        b.ticksLeft -= 1;
        b.nextTickAt = now + (b.tickMs || 1000);
        if (b.ticksLeft <= 0) b.until = 0;
    }

    const before = _uspActiveBuffs.length;
    _uspActiveBuffs = _uspActiveBuffs.filter((b) => b.until > now);

    // An armed Rift Anchor is dropped by the same clock its chip counts down
    // on, so the world marker can never outlive the window.
    if (_uspAnchor && _uspAnchor.until <= now) _uspClearAnchor();

    // A ward that expired (or was consumed) takes its charges with it.
    if (_uspWardCharges > 0 && !_uspActiveBuffs.some((b) => b.kind === 'ward')) _uspWardCharges = 0;

    if (_uspActiveBuffs.length !== before) _uspForceBuffIconRefresh();
    if (!_uspActiveBuffs.length) {
        if (_uspBuffSweepInterval) { clearInterval(_uspBuffSweepInterval); _uspBuffSweepInterval = null; }
    }
}

// Adds (or refreshes) a buff. The payload carries the pre-computed, already
// rank-scaled axis values so the combat hooks never re-derive anything.
export function _uspAddBuff(spell, payload) {
    const until = Date.now() + Math.max(1, spell.buffSeconds || 8) * 1000;
    const existing = _uspActiveBuffs.find((b) => b.spellId === spell.id);
    if (existing) {
        existing.until = until;
        Object.assign(existing, payload || {});
    } else {
        _uspActiveBuffs.push(Object.assign({
            spellId: spell.id, kind: spell.behavior, icon: spell.icon,
            nameEn: spell.nameEn, nameDE: spell.nameDE, until,
        }, payload || {}));
    }
    _uspStartBuffSweep();
    _uspForceBuffIconRefresh();
}

// Drops every buff. Called when an encounter stops and when a level starts -
// a support buff must never carry into the next puzzle. The movement family
// rides the same registry, so a Windstep and an armed Rift Anchor are cleared
// here for free.
export function _uspClearSupportBuffs() {
    _uspActiveBuffs = [];
    _uspWardCharges = 0;
    _uspAnchor = null;
    if (typeof _uspAnchorMarkerClear === 'function') _uspAnchorMarkerClear();
    if (_uspBuffSweepInterval) { clearInterval(_uspBuffSweepInterval); _uspBuffSweepInterval = null; }
    _uspForceBuffIconRefresh();
}

// ---------------------------------------------------------------------
// Combat hooks - all typeof-guarded from endgame-encounter.js so the
// combat path pays nothing when no support buff is active.
// ---------------------------------------------------------------------

export function _uspBuffSum(kind, field) {
    let total = 0;
    for (const b of _uspActiveBuffs) if (b.kind === kind) total += (b[field] || 0);
    return total;
}

// Aggregate support profile, or null when nothing is active. Deliberately
// returns non-null whenever ANY buff is up - the ward and Retribution have no
// mitigation axes, so gating this on dodge/dr/armour would silently disable
// them (they are read as separate fields by their own call sites).
export function _uspGetSupportMitigation() {
    if (!_uspActiveBuffs.length) return null;
    return {
        dodgePct: _uspBuffSum('evade', 'dodgePct'),
        drPct: Math.min(80, _uspBuffSum('guard', 'drPct')),
        armourPct: _uspBuffSum('guard', 'armourPct'),
        thornsPct: _uspBuffSum('thorns', 'thornsPct'),
    };
}

// Flat + percentage damage reduction, applied after armour mitigation and
// before the absorption shield (so a Bulwark also stretches the shield).
export function _uspApplySupportMitigation(mitigated) {
    const p = _uspGetSupportMitigation();
    if (!p || !p.drPct) return mitigated;
    return Math.max(0, mitigated * (1 - p.drPct / 100));
}

// Consumes one Aegis Ward charge. Returns true when the hit is negated
// entirely (boss specials included - that is the whole point of the ward).
// `incoming` is the raw pre-mitigation amount; hits below the threshold
// (USP_WARD_MIN_HIT_PCT of max Life) pass through so chip damage cannot
// waste a charge, and a charge is never spent by a zero-damage call.
export function _uspTryWardNegate(incoming) {
    if (_uspWardCharges <= 0) return false;
    if (!(incoming > 0)) return false;
    if (incoming < _uspMaxLife() * (USP_WARD_MIN_HIT_PCT / 100)) return false;
    if (!_uspActiveBuffs.some((b) => b.kind === 'ward' && b.until > Date.now())) {
        _uspWardCharges = 0;
        return false;
    }
    _uspWardCharges -= 1;
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    if (typeof globalThis.showToast === 'function') {
        const left = _uspWardCharges > 0 ? ` (${_uspWardCharges} ${de ? 'übrig' : 'left'})` : '';
        globalThis.showToast(`${de ? '✨ Ägis-Schutz absorbiert den Treffer!' : '✨ Aegis Ward absorbed the hit!'}${left}`, '#ffe082');
    }
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('player_shield_damage_taken'); } catch (e) { /* audio is best-effort */ }
    }
    _uspForceBuffIconRefresh();
    return true;
}

// Reflects a share of an incoming hit back at its attacker. `incoming` is
// the PRE-mitigation amount, so Retribution scales with the size of the hit
// rather than with how well the player happened to mitigate it.
export function _uspReflectThorns(attacker, incoming) {
    if (!attacker || !attacker.id) return;
    const pct = _uspBuffSum('thorns', 'thornsPct');
    if (pct <= 0 || !(incoming > 0)) return;
    if (typeof globalThis._egDamageTargetById !== 'function') return;
    const dealt = Math.max(1, Math.round(incoming * pct / 100));
    try {
        globalThis._egDamageTargetById(attacker.id, dealt, {}, {});
        const de = (typeof LANG !== 'undefined' && LANG === 'de');
        if (typeof globalThis.showToast === 'function') globalThis.showToast(`🔥 ${de ? 'Vergeltung' : 'Retribution'} (-${dealt})`, '#ff8a65');
    } catch (e) { /* reflection is best-effort - never break the damage path */ }
}

// True while any support buff is up (used by the tooltip / icon strip).
export function isUspSupportBuffActive(kind) {
    const now = Date.now();
    return _uspActiveBuffs.some((b) => b.until > now && (!kind || b.kind === kind));
}

// ---------------------------------------------------------------------
// Player status-strip icons (js/combat/combat-ailments.js appends this)
// ---------------------------------------------------------------------

export function _uspSupportStatusSignature() {
    const now = Date.now();
    return _uspActiveBuffs
        .filter((b) => b.until > now)
        .map((b) => `${b.spellId}:${Math.ceil((b.until - now) / 1000)}:${b.kind === 'ward' ? _uspWardCharges : ''}`)
        .join(',');
}

export function _uspBuildSupportStatusIconsHTML() {
    const now = Date.now();
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    return _uspActiveBuffs
        .filter((b) => b.until > now)
        .map((b) => {
            const secs = Math.ceil((b.until - now) / 1000);
            const label = de ? (b.nameDE || b.nameEn) : b.nameEn;
            const charges = (b.kind === 'ward' && _uspWardCharges > 0) ? `×${_uspWardCharges} ` : '';
            return `<span class="eg-status-icon usp-buff-icon usp-buff-${b.kind}" data-tip="${globalThis._tipAttr(label)}">${b.icon}${charges}${secs}</span>`;
        })
        .join('');
}

// Forces the shared player status strip to rebuild on its next tick without
// waiting for an ailment change (the sentinel never matches a real signature).
export function _uspForceBuffIconRefresh() {
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.dataset.sig = '__usp_dirty__';
}

// ---------------------------------------------------------------------
// Cast application
// ---------------------------------------------------------------------

// Applies a support spell's effect. Called from castUniversalSpell once the
// mana and the cooldown are committed. Returns a short toast-ready summary.
export function _uspApplySupportSpell(spell) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    switch (spell.behavior) {
        case 'heal': {
            const wanted = _uspCalcHeal(spell);
            const gained = _uspHealPlayer(wanted);
            _uspSupportCastFX(spell, `+${gained}`, gained > 0 ? 'heal' : 'wasted');
            if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
                try { Audio_Manager.playSFX('heart_heals'); } catch (e) { /* best-effort */ }
            }
            return gained > 0
                ? `${de ? 'geheilt' : 'healed'} +${gained}`
                : (de ? 'Leben bereits voll' : 'Life already full');
        }

        case 'hot': {
            const ticks = Math.max(1, spell.ticks || 6);
            const tickMs = Math.max(200, spell.tickMs || 1000);
            _uspAddBuff(spell, {
                ticksLeft: ticks, tickMs, nextTickAt: Date.now() + tickMs,
                until: Date.now() + ticks * tickMs,
            });
            _uspSupportCastFX(spell, `+${_uspCalcHotTick(spell)}/s`, 'heal');
            return `${de ? 'Heilung über' : 'healing over'} ${Math.round(ticks * tickMs / 1000)}s`;
        }

        case 'shield': {
            if (_uspMaxAbsorption() <= 0) {
                // No absorption gear → there is no shield to refill. The cast
                // still cost mana and started its cooldown, so say so plainly
                // rather than pretending it worked.
                if (typeof globalThis.showToast === 'function') {
                    globalThis.showToast(de ? '🔷 Keine Absorptionsausrüstung - kein Schild zum Auffüllen!' : '🔷 No absorption gear - nothing to refill!', '#ff8a65');
                }
                return de ? 'kein Schild' : 'no shield';
            }
            const wanted = _uspCalcAbsorb(spell);
            const gained = _uspRestoreAbsorption(wanted);
            _uspSupportCastFX(spell, `+${gained}`, gained > 0 ? 'shield' : 'wasted');
            return `${de ? 'Schild' : 'shield'} +${gained}`;
        }

        case 'guard': {
            const drPct = _uspCalcDrPct(spell);
            const armourPct = _uspCalcArmourPct(spell);
            _uspAddBuff(spell, { drPct, armourPct });
            _uspSupportCastFX(spell, `-${drPct}%`, 'buff');
            return `${de ? 'Schaden' : 'damage'} -${drPct}% ${de ? '+' : '+'}${armourPct}% ${de ? 'Rüstung' : 'Armour'}`;
        }

        case 'evade': {
            const dodgePct = _uspCalcDodgePct(spell);
            _uspAddBuff(spell, { dodgePct });
            _uspSupportCastFX(spell, `+${dodgePct}%`, 'buff');
            return `${de ? 'Ausweichen' : 'dodge'} +${dodgePct}%`;
        }

        case 'ward': {
            const charges = _uspCalcWardCharges(spell);
            _uspWardCharges = charges;
            _uspAddBuff(spell, { charges });
            _uspSupportCastFX(spell, `×${charges}`, 'buff');
            return `${de ? 'negiert' : 'negates'} ${charges} ${de ? 'Treffer' : 'hits'}`;
        }

        case 'thorns': {
            const thornsPct = _uspCalcThornsPct(spell);
            _uspAddBuff(spell, { thornsPct });
            _uspSupportCastFX(spell, `🔥${thornsPct}%`, 'buff');
            return `${de ? 'Vergeltung' : 'retribution'} ${thornsPct}%`;
        }

        default:
            return '';
    }
}

// Tooltip/estimate payload for a support spell: exactly what the cast will
// deliver at the current rank and pools, so the book never lies.
export function getUniversalSpellSupportEstimate(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell || !isUniversalSupportSpell(spell)) return null;
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const rank = _uspCastRank(spellId);
    const secs = Math.round(spell.buffSeconds || 0);

    switch (spell.behavior) {
        case 'heal': {
            const value = _uspCalcHeal(spell);
            return { kind: 'heal', value, rank,
                lineEn: `Instantly restores ${value} Life`, lineDe: `Stellt sofort ${value} Leben wieder her` };
        }
        case 'hot': {
            const per = _uspCalcHotTick(spell);
            const ticks = Math.max(1, spell.ticks || 6);
            return { kind: 'hot', value: per * ticks, perTick: per, ticks, rank,
                lineEn: `Heals ${per} Life per second for ${ticks}s (${per * ticks} total)`, lineDe: `Heilt ${per} Leben pro Sekunde für ${ticks}s (insgesamt ${per * ticks})` };
        }
        case 'shield': {
            const maxAbs = _uspMaxAbsorption();
            const value = _uspCalcAbsorb(spell);
            return { kind: 'shield', value, rank, noPool: maxAbs <= 0,
                lineEn: maxAbs > 0 ? `Restores ${value} Absorption shield` : `No absorption gear - nothing to refill`, lineDe: maxAbs > 0 ? `Stellt ${value} Absorptionsschild wieder her` : `Keine Absorptionsausrüstung - nichts aufzufüllen` };
        }
        case 'guard':
            return { kind: 'guard', drPct: _uspCalcDrPct(spell), armourPct: _uspCalcArmourPct(spell), seconds: secs, rank,
                lineEn: `${_uspCalcDrPct(spell)}% less damage taken, +${_uspCalcArmourPct(spell)}% Armour for ${secs}s`, lineDe: `${_uspCalcDrPct(spell)}% weniger erlittener Schaden, +${_uspCalcArmourPct(spell)}% Rüstung für ${secs}s` };
        case 'evade':
            return { kind: 'evade', dodgePct: _uspCalcDodgePct(spell), seconds: secs, rank,
                lineEn: `+${_uspCalcDodgePct(spell)}% chance to dodge attacks for ${secs}s`, lineDe: `+${_uspCalcDodgePct(spell)}% Chance, Angriffen auszuweichen, für ${secs}s` };
        case 'ward':
            return { kind: 'ward', charges: _uspCalcWardCharges(spell), seconds: secs, rank,
                lineEn: `Negates the next ${_uspCalcWardCharges(spell)} hits entirely - hits of ${USP_WARD_MIN_HIT_PCT}%+ max Life only (${secs}s window)`,
                lineDe: `Negiert die nächsten ${_uspCalcWardCharges(spell)} Treffer vollständig - nur Treffer ab ${USP_WARD_MIN_HIT_PCT}% max. Leben (${secs}s Fenster)` };
        case 'thorns':
            return { kind: 'thorns', thornsPct: _uspCalcThornsPct(spell), seconds: secs, rank,
                lineEn: `Attackers take ${_uspCalcThornsPct(spell)}% of the damage they deal, for ${secs}s`, lineDe: `Angreifer erleiden ${_uspCalcThornsPct(spell)}% des ausgeteilten Schadens, für ${secs}s` };
        default:
            return null;
    }
}


//------------------------------------------------------------------------
//-------------------------MOVEMENT SPELLS-------------------------------
//------------------------------------------------------------------------
// The repositioning family: blink / dash / disengage / windstep / rift anchor.
//
// WHY THIS EXISTS - damage against the player is resolved against the
// SPRITE'S HITBOX (js/combat/combat-hazards.js → _egHzPlayerRect), and the
// game's own design note says a boss special is only avoidable by MOVEMENT
// AND POSITION. Walking is 320px/s, so a telegraph that resolves faster than
// that is unavoidable without a movement ability. That is the niche these
// fill: they buy POSITION, never immunity. Nothing here negates a hit - a
// blink into bad ground dies to bad ground.
//
// AIM - every spell fires along the direction the sprite last actually WALKED
// (js/sprite/player_sprite.js → getAvatarLastMoveDir), falling back to the
// direction its art is mirrored towards, then to 'right'. Disengage is the
// same vector REVERSED.
//
// SCALING - distance and speed are ADDITIVE per rank and hard-capped, like
// every other non-damage axis (see the support-family note above): a rank-10
// Blink is ~1.8x a rank-1 Blink, not 9x. Movement is a positional advantage,
// and positional advantages are worth far more per point than damage.
//
// COST - cheap relative to the offensive arsenal (12–24 mana) and gated by
// cooldown instead, because a movement spell's real price is the answer you
// did not have ready 5 seconds later.
//
// CLEANUP - the speed buffs ride the support buff registry, so they inherit
// its pause handling and are cleared by _uspClearSupportBuffs() when an
// encounter stops, a level starts or the player dies. The anchor is cleared
// by the same function; an armed anchor therefore cannot survive its fight.
//------------------------------------------------------------------------

// Behaviours handled as self-casts that reposition the player.
export const USP_MOVEMENT_BEHAVIORS = ['blink', 'dash', 'disengage', 'windstep', 'anchor'];

// The four walking directions, as unit vectors.
export const USP_DIR_VECTORS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

// Armed Rift Anchor: { x, y, until } or null. One at a time, by design - a
// second anchor replaces the first rather than stacking escapes.
export let _uspAnchor = null;

// Supersede token for in-flight glides: a newer movement cast cancels the
// glide it was cast during instead of fighting it for the avatar's position.
export let _uspGlideSeq = 0;

// True when the spell (id or def) is part of the movement family.
export function isUniversalMovementSpell(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? UNIVERSAL_SPELL_MAP[spellOrId] : spellOrId;
    return !!spell && USP_MOVEMENT_BEHAVIORS.indexOf(spell.behavior) !== -1;
}

// True for the families that need a live encounter but no monster target.
export function _uspIsSelfCastSpell(spell) {
    return isUniversalSupportSpell(spell) || isUniversalMovementSpell(spell);
}

// Jump distance at the charm's cast rank.
export function _uspCalcMoveDistance(spell) {
    return Math.round(_uspRankAdditive(
        spell.moveBasePx || 0, spell.movePxPerRank || 0, spell.movePxCap || 0,
        _uspCastRank(spell.id)));
}

// Movement-speed share granted by Windstep / Disengage, at the cast rank.
export function _uspCalcMoveSpeedPct(spell) {
    return Math.round(_uspRankAdditive(
        spell.speedPct || 0, spell.speedPctPerRank || 0, spell.speedPctCap || 0,
        _uspCastRank(spell.id)));
}

// Walk-speed multiplier from active movement buffs. Read by
// _avatarGetMoveSpeed() in js/sprite/player_sprite.js - typeof-guarded there,
// so the sprite is independent of this file. Returns exactly 1 when nothing
// is up, so walking pays nothing for the check.
export function _uspMovementSpeedMult() {
    if (!_uspActiveBuffs.length) return 1;
    let pct = 0;
    for (const b of _uspActiveBuffs) if (b.speedPct) pct += b.speedPct;
    return pct ? 1 + pct / 100 : 1;
}

// ---------------------------------------------------------------------
// Avatar position plumbing
// ---------------------------------------------------------------------

// The live player sprite, or null when the avatar is not on screen.
export function _uspAvatarEl() {
    return document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
}

// Current sprite position in viewport coordinates. Precedence matches the
// walk loop's own (js/sprite/player_sprite.js): float accumulator → inline
// style → rendered rect, so a blink never starts from a stale corner.
export function _uspAvatarPos() {
    const el = _uspAvatarEl();
    if (!el) return null;
    let x = parseFloat(el.dataset.avatarFx);
    let y = parseFloat(el.dataset.avatarFy);
    if (!isFinite(x)) x = parseFloat(el.style.left);
    if (!isFinite(y)) y = parseFloat(el.style.top);
    if (!isFinite(x) || !isFinite(y)) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return null;
        if (!isFinite(x)) x = r.left;
        if (!isFinite(y)) y = r.top;
    }
    return { el, x, y };
}

// Writes a position through the shared setter and re-seeds the float
// accumulator, so the walk loop continues from the landing spot instead of
// snapping back to the pre-cast value. Returns the CLAMPED position that was
// actually achieved - _setAvatarPos() keeps the sprite inside the viewport,
// and the FX/toast should report where you really ended up.
export function _uspAvatarWrite(el, x, y, dir) {
    if (typeof globalThis._setAvatarPos === 'function') {
        try { globalThis._setAvatarPos(el, x, y, dir || null); } catch (e) { /* fall through to the raw write */ }
    } else {
        const w = el.offsetWidth || 72;
        const h = el.offsetHeight || 90;
        el.style.bottom = 'auto';
        el.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, x)) + 'px';
        el.style.top = Math.max(4, Math.min(window.innerHeight - h - 4, y)) + 'px';
    }
    const cx = parseFloat(el.style.left);
    const cy = parseFloat(el.style.top);
    if (isFinite(cx)) el.dataset.avatarFx = String(cx);
    if (isFinite(cy)) el.dataset.avatarFy = String(cy);
    return { x: isFinite(cx) ? cx : x, y: isFinite(cy) ? cy : y };
}

// The direction the sprite's art is mirrored towards ('left' / 'right'), used
// only until the player has walked once. Null when neither sprite exists.
export function _uspMirrorDir() {
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!img || !img.style) return null;
    const tr = img.style.transform || '';
    if (/scaleX\(\s*-1/.test(tr)) return 'left';
    if (/scaleX\(\s*1\s*\)/.test(tr)) return 'right';
    return null;
}

// Which way this cast goes: last walked direction → mirrored facing → 'right'.
export function _uspAimDir() {
    let dir = null;
    if (typeof globalThis.getAvatarLastMoveDir === 'function') {
        try { dir = globalThis.getAvatarLastMoveDir(); } catch (e) { dir = null; }
    }
    if (!USP_DIR_VECTORS[dir]) dir = _uspMirrorDir();
    return USP_DIR_VECTORS[dir] ? dir : 'right';
}

// Glides the sprite to a target over `ms`, easing out so the move reads as a
// burst that settles rather than a linear slide. The walk cycle is kicked off
// once on the first frame (that is what _setAvatarPos does when handed a
// direction); intermediate frames pass no direction so the running cycle is
// not restarted 60 times a second.
export function _uspGlide(el, fromX, fromY, toX, toY, ms, dir) {
    const seq = ++_uspGlideSeq;
    const dur = Math.max(60, ms || 200);
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let first = true;
    const step = (now) => {
        if (seq !== _uspGlideSeq) return;      // superseded by a newer cast
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);      // ease-out cubic
        _uspAvatarWrite(el, fromX + (toX - fromX) * e, fromY + (toY - fromY) * e,
            first ? dir : null);
        first = false;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// ---------------------------------------------------------------------
// Rift Anchor state
// ---------------------------------------------------------------------

export function isUspAnchorArmed() {
    return !!(_uspAnchor && _uspAnchor.until > Date.now());
}

export function getUspAnchorRemainingSeconds() {
    if (!isUspAnchorArmed()) return 0;
    return Math.max(1, Math.ceil((_uspAnchor.until - Date.now()) / 1000));
}

// Drops the armed anchor (and its world marker). Safe to call unconditionally.
export function _uspClearAnchor() {
    _uspAnchor = null;
    _uspActiveBuffs = _uspActiveBuffs.filter((b) => b.kind !== 'anchor');
    if (typeof _uspAnchorMarkerClear === 'function') _uspAnchorMarkerClear();
}

// ---------------------------------------------------------------------
// Cast application
// ---------------------------------------------------------------------

// Applies a movement spell. Returns { text, flavor, cooldown? } - `cooldown`
// overrides the spell's normal cooldown for this cast (the Rift Anchor's
// PLACE cast is deliberately cheap so the recall can follow).
export function _uspApplyMovementSpell(spell) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const pos = _uspAvatarPos();
    if (!pos) return { text: de ? 'kein Spielersprite' : 'no player sprite', flavor: 'wasted' };

    switch (spell.behavior) {
        case 'blink': {
            const dist = _uspCalcMoveDistance(spell);
            const dir = _uspAimDir();
            const v = USP_DIR_VECTORS[dir];
            const landed = _uspAvatarWrite(pos.el, pos.x + v.x * dist, pos.y + v.y * dist, dir);
            if (typeof _uspBlinkFX === 'function') _uspBlinkFX(spell, pos.x, pos.y, landed.x, landed.y);
            _uspSupportCastFX(spell, `${dir}`, 'buff');
            return { text: `${de ? 'teleportiert' : 'blinked'} ${dir} ${dist}px`, flavor: 'buff' };
        }

        case 'dash':
        case 'disengage': {
            const dist = _uspCalcMoveDistance(spell);
            const dir = _uspAimDir();
            // Disengage is the same vector REVERSED: it buys distance in the
            // direction you were backing away from, not the way you headed.
            const v = USP_DIR_VECTORS[dir];
            const sign = (spell.behavior === 'disengage') ? -1 : 1;
            const tx = pos.x + v.x * dist * sign;
            const ty = pos.y + v.y * dist * sign;
            _uspGlide(pos.el, pos.x, pos.y, tx, ty, spell.glideMs || 200, dir);
            if (typeof _uspBlinkFX === 'function') {
                _uspBlinkFX(spell, pos.x, pos.y, tx, ty, true);
            }
            let speed = 0;
            if (spell.behavior === 'disengage') {
                speed = _uspCalcMoveSpeedPct(spell);
                if (speed > 0) _uspAddBuff(spell, { speedPct: speed });
            }
            _uspSupportCastFX(spell, `${dist}px`, 'buff');
            const label = spell.behavior === 'disengage' ? (de ? 'Rückzug' : 'leapt back') : (de ? 'gesprintet' : 'dashed');
            return {
                text: `${label} ${dist}px${speed ? ` · +${speed}% ${de ? 'Tempo' : 'speed'} ${spell.buffSeconds}s` : ''}`,
                flavor: 'buff',
            };
        }

        case 'windstep': {
            const pct = _uspCalcMoveSpeedPct(spell);
            _uspAddBuff(spell, { speedPct: pct });
            _uspSupportCastFX(spell, `+${pct}%`, 'buff');
            return { text: `${de ? 'Tempo' : 'speed'} +${pct}% ${spell.buffSeconds}s`, flavor: 'buff' };
        }

        case 'anchor': {
            if (isUspAnchorArmed()) {
                // RECALL - the whole payoff: no travel, no path, no argument.
                const a = _uspAnchor;
                const secs = getUspAnchorRemainingSeconds();
                _uspClearAnchor();
                const landed = _uspAvatarWrite(pos.el, a.x, a.y, null);
                if (typeof _uspBlinkFX === 'function') _uspBlinkFX(spell, pos.x, pos.y, landed.x, landed.y);
                _uspSupportCastFX(spell, de ? 'Rückruf' : 'recall', 'buff');
                return {
                    text: de ? `Rückruf zum Anker (${secs}s vor Ablauf)` : `recalled to the anchor (${secs}s left)`,
                    flavor: 'buff',
                };
            }
            // PLACE - short cooldown so the recall can actually follow it.
            const secs = Math.max(1, spell.anchorSeconds || 15);
            _uspAnchor = { x: pos.x, y: pos.y, until: Date.now() + secs * 1000 };
            // The status-strip chip comes from the shared buff registry, so the
            // armed window gets the same countdown and pause handling as every
            // other buff (payload `until` overrides the buffSeconds default).
            _uspAddBuff(spell, { until: _uspAnchor.until });
            if (typeof _uspAnchorMarkerShow === 'function') _uspAnchorMarkerShow(spell, pos.x, pos.y, secs);
            _uspSupportCastFX(spell, '📍', 'buff');
            return {
                text: de ? `Anker gesetzt - ${secs}s, erneut wirken für Rückruf` : `anchor planted - ${secs}s, cast again to recall`,
                flavor: 'buff',
                cooldown: Math.max(1, spell.anchorPlaceCooldownSeconds || 3),
            };
        }

        default:
            return { text: '', flavor: 'wasted' };
    }
}

// Tooltip/estimate payload for a movement spell: the concrete jump and window
// at the current rank, plus the armed-anchor state so the tooltip can tell you
// what the NEXT cast will do rather than what the spell does in general.
export function getUniversalSpellMovementEstimate(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell || !isUniversalMovementSpell(spell)) return null;
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const rank = _uspCastRank(spellId);
    const base = {
        kind: spell.behavior,
        rank,
        aimEn: 'the direction you were walking',
        aimDe: 'die Richtung, in die du gelaufen bist',
    };
    if (spell.behavior === 'anchor') {
        if (isUspAnchorArmed()) {
            const secs = getUspAnchorRemainingSeconds();
            return Object.assign(base, {
                armed: true, seconds: secs,
                lineEn: `Anchor ARMED - cast again to recall to it. ${secs}s left.`,
                lineDe: `Anker SCHARF - erneut wirken für den Rückruf. ${secs}s übrig.`,
            });
        }
        const secs = Math.max(1, spell.anchorSeconds || 15);
        return Object.assign(base, {
            armed: false, seconds: secs,
            lineEn: `Plants an anchor where you stand, armed for ${secs}s. Cast again to return to it from anywhere.`,
            lineDe: `Setzt einen Anker, wo du stehst, ${secs}s lang scharf. Erneut wirken, um von überall dorthin zurückzukehren.`,
        });
    }
    const dist = _uspCalcMoveDistance(spell);
    if (spell.behavior === 'windstep') {
        const pct = _uspCalcMoveSpeedPct(spell);
        const secs = Math.round(spell.buffSeconds || 6);
        return Object.assign(base, {
            speedPct: pct, seconds: secs, distance: Math.round(320 * (pct / 100) * secs),
            lineEn: `Walk speed +${pct}% for ${secs}s (about +${Math.round(320 * (pct / 100) * secs)}px of travel)`,
            lineDe: `Lauftempo +${pct}% für ${secs}s (etwa +${Math.round(320 * (pct / 100) * secs)}px Strecke)`,
        });
    }
    if (spell.behavior === 'disengage') {
        const pct = _uspCalcMoveSpeedPct(spell);
        const secs = Math.round(spell.buffSeconds || 3);
        return Object.assign(base, {
            distance: dist, speedPct: pct, seconds: secs,
            lineEn: `Leaps ${dist}px BACKWARD, then walk speed +${pct}% for ${secs}s`,
            lineDe: `Springt ${dist}px RÜCKWÄRTS, danach Lauftempo +${pct}% für ${secs}s`,
        });
    }
    const glide = Math.round(spell.glideMs || 0);
    return Object.assign(base, {
        distance: dist,
        lineEn: spell.behavior === 'blink'
            ? `Teleports ${dist}px in an instant - nothing on the way can touch you`
            : `Dashes ${dist}px over ${glide}ms - fast, but you are still travelling`,
        lineDe: spell.behavior === 'blink'
            ? `Teleportiert ${dist}px in einem Augenblick - unterwegs kann dich nichts treffen`
            : `Sprintet ${dist}px in ${glide}ms - schnell, aber du bist weiterhin unterwegs`,
    });
}

// Movement-spell section header for the spell book.
export function _uspMovementGroupTitle() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'Bewegungszauber' : 'Movement Spells';
}


//------------------------------------------------------------------------
//---------------------------UNLOCK INFRASTRUCTURE------------------------
//------------------------------------------------------------------------
// STATE.universalSpellsUnlocked:
//   null / undefined → every spell is available (current behaviour).
//   array of ids     → only those ids are available; everything else shows
//                      🔒 in the spellbook with its unlock hint.
// When you design the gating system later, just write the array (and call
// refreshSkillUI()). Helpers below cover the rest.

export function getUniversalSpellUnlockList() {
    try {
        if (typeof globalThis.STATE !== 'undefined' && Array.isArray(globalThis.STATE.universalSpellsUnlocked)) {
            return globalThis.STATE.universalSpellsUnlocked;
        }
    } catch (e) { /* no gating configured */ }
    return null; // null = all unlocked
}

export function isUniversalSpellUnlocked(spellId) {
    const list = getUniversalSpellUnlockList();
    if (!list) return true;
    return list.indexOf(spellId) !== -1;
}

// Unlock one spell (persists via save()).
export function unlockUniversalSpell(spellId) {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE) return false;
    if (!UNIVERSAL_SPELL_MAP[spellId]) return false;
    if (!Array.isArray(globalThis.STATE.universalSpellsUnlocked)) globalThis.STATE.universalSpellsUnlocked = UNIVERSAL_SPELL_DEFS.map((d) => d.id);
    if (globalThis.STATE.universalSpellsUnlocked.indexOf(spellId) === -1) {
        globalThis.STATE.universalSpellsUnlocked.push(spellId);
        if (typeof save === 'function') save();
        if (typeof refreshSkillUI === 'function') refreshSkillUI();
    }
    return true;
}

// (Re-)lock one spell - used by the future gating system / testing.
export function lockUniversalSpell(spellId) {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE) return false;
    if (!Array.isArray(globalThis.STATE.universalSpellsUnlocked)) globalThis.STATE.universalSpellsUnlocked = UNIVERSAL_SPELL_DEFS.map((d) => d.id);
    const i = globalThis.STATE.universalSpellsUnlocked.indexOf(spellId);
    if (i !== -1) {
        globalThis.STATE.universalSpellsUnlocked.splice(i, 1);
        if (typeof save === 'function') save();
        if (typeof refreshSkillUI === 'function') refreshSkillUI();
    }
    return true;
}

export function isUniversalSpellId(skillId) {
    return !!UNIVERSAL_SPELL_MAP[skillId];
}

export function getUniversalSpellDef(spellId) {
    return UNIVERSAL_SPELL_MAP[spellId] || null;
}

export function _uspUnlockHint(spell) {
    if (!spell) return '';
    if (typeof LANG !== 'undefined' && LANG === 'de') {
        return spell.unlockHintDE || 'Dieser Zauber ist noch versiegelt. Die Bedingung wird später enthüllt.';
    }
    return spell.unlockHintEn || 'This spell is still sealed. Its requirement will be revealed later.';
}


//------------------------------------------------------------------------
//---------------------FUTURE DEV-TREE DAMAGE HOOK------------------------
//------------------------------------------------------------------------
// The development passive tree will scale spell damage of all kinds.
// This is THE hook: every universal-spell hit adds {flat, incPct} from
// here on top of gear. It returns zeros today; when the tree exists,
// implement getDevTreeSpellBonus(spell) (or edit this function) to sum
// allocated nodes matching spell.damageKind / spell.scalingTags.
//   spell.damageKind: fire|cold|lightning|shadow|arcane|holy|nature|physical
//   spell.scalingTags: spell + kind + area|projectile|dot|chain|channel

export function getUniversalSpellDamageBonus(spell) {
    let flat = 0;
    let incPct = 0;
    try {
        if (typeof window.getDevTreeSpellBonus === 'function') {
            const b = window.getDevTreeSpellBonus(spell) || {};
            flat += Number(b.flat) || 0;
            incPct += Number(b.incPct) || 0;
        }
    } catch (e) { /* tree not present yet - base damage only */ }
    return { flat, incPct };
}


//------------------------------------------------------------------------
//-------------------------MANA & COOLDOWN--------------------------------
//------------------------------------------------------------------------

export function getUniversalSpellManaCost(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return 0;
    let cost = spell.manaCost || 0;
    if (typeof _scaleAbilityManaCost === 'function') {
        try { cost = _scaleAbilityManaCost(cost); } catch (e) { /* fall through */ }
    }
    // Spell rank multiplies the price (SPELL_RANK_MANA_MULT in skill-charms.js).
    if (typeof getSpellRankManaMultForSkill === 'function') {
        cost = Math.round(cost * getSpellRankManaMultForSkill(spellId));
    }
    return cost;
}

export function canAffordUniversalSpell(spellId) {
    const cost = getUniversalSpellManaCost(spellId);
    if (!cost || cost <= 0) return true;
    try {
        if (typeof _bloodMagicActive === 'function' && _bloodMagicActive()) {
            return (typeof canAffordLifeCost === 'function') ? canAffordLifeCost(cost) : true;
        }
    } catch (e) { /* fall through to mana */ }
    return (typeof canAffordMana === 'function') ? canAffordMana(cost) : true;
}

export function getUniversalSpellEffectiveCooldown(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return 0;
    const base = spell.cooldownSeconds || 0;
    // Global cooldown-recovery sources (passive tree / keystones) apply to
    // spells too; class-specific ones intentionally do not.
    try {
        if (typeof _getGlobalCooldownReduction === 'function') {
            return Math.max(0, base - _getGlobalCooldownReduction());
        }
    } catch (e) { /* fall through */ }
    return base;
}

// Per-spell live cooldowns (session-only, like the legacy slots).
export const _uspCooldowns = {}; // spellId → { remaining, interval }

// ---------------------------------------------------------------------
// CHARGE-BASED COOLDOWNS
// ---------------------------------------------------------------------
// A spell with `chargeMax` holds a pool of charges instead of one cooldown:
// every cast spends one charge, and spent charges recharge INDIVIDUALLY and
// in parallel - with 3 charges at 18s you can cast twice back-to-back and
// still have one in the tank. The pool is the positioning rhythm of a fight:
// burn it for safety, then wait as it refills.
//
// Recharge intentionally ignores cooldown-REDUCTION passives (flat seconds
// like Celerity would zero out an 18s pool); it uses the raw authored
// recharge time. Mana still gates every cast, so the pool bounds mobility,
// not damage output.
// Session-only, like _uspCooldowns: a fresh encounter starts full.
// state = { current, pending: [secsLeft,…], interval } - `pending` holds the
// per-charge countdowns of the charges currently recharging. The invariant
// current + pending.length = max always holds, so a landed charge can never
// overflow the pool. Countdown COUNTERS (not wall-clock deadlines) ticked by
// a pause-aware interval, exactly like the plain-cooldown tick below: the
// sweep skips while _gamePaused / dead, so pausing (spell book open) does
// not burn recharge time.
export const _uspCharges = {}; // spellId → charge state

// Charge config for a spell, or null when the spell is plain-cooldown.
export function _uspChargeConfig(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? getUniversalSpellDef(spellOrId) : spellOrId;
    if (!spell || !spell.chargeMax || spell.chargeMax < 1) return null;
    return { max: spell.chargeMax, recharge: spell.chargeRechargeSeconds || spell.cooldownSeconds || 0 };
}

// Live charge pool for a spell (session-only): starts full, never persists.
export function _uspChargeState(spellId, cfg) {
    let st = _uspCharges[spellId];
    if (!st) {
        st = _uspCharges[spellId] = { current: cfg.max, pending: [], interval: null };
    }
    return st;
}

// Schedules one spent charge for recharge and starts the shared ticker.
// Recharge intentionally ignores cooldown-reduction passives (flat seconds
// like Celerity would zero out short pools) - it uses the authored time.
export function _uspScheduleRecharge(spellId, cfg) {
    const st = _uspChargeState(spellId, cfg);
    const scale = (typeof window !== 'undefined' && window.STOX_EFFECT_TIME_SCALE > 0 && window.STOX_EFFECT_TIME_SCALE !== 1)
        ? window.STOX_EFFECT_TIME_SCALE : 1;
    st.pending.push(Math.max(1, Math.round(cfg.recharge * scale)));
    if (st.interval) return;
    st.interval = setInterval(() => {
        try {
            if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) return;
            if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
        } catch (e) {}
        const liveCfg = _uspChargeConfig(spellId);
        const live = _uspCharges[spellId];
        if (!liveCfg || !live) { // def/state vanished - stop ticking
            if (live && live.interval) { clearInterval(live.interval); live.interval = null; }
            return;
        }
        let landed = 0;
        live.pending = live.pending
            .map((s) => s - 1)
            .filter((s) => (s <= 0 ? (landed++, false) : true));
        if (landed > 0) {
            live.current = Math.min(liveCfg.max, live.current + landed);
            if (typeof renderSkillHotbar === 'function') {
                try { renderSkillHotbar(); } catch (e) {}
            }
        }
        if (!live.pending.length) {
            clearInterval(live.interval);
            live.interval = null;
        } else if (typeof patchHotbarSlotCooldown === 'function') {
            try { patchHotbarSlotCooldown(spellId); } catch (e) {}
        }
    }, 1000);
}

// Charges currently held (null for plain-cooldown spells).
export function getUniversalSpellCharges(spellId) {
    const cfg = _uspChargeConfig(spellId);
    if (!cfg) return null;
    const st = _uspChargeState(spellId, cfg);
    return { current: st.current, max: cfg.max, recharge: cfg.recharge };
}

// Seconds until the NEXT charge returns, or 0 when the pool is full.
export function getUniversalSpellChargeRechargeRemaining(spellId) {
    const cfg = _uspChargeConfig(spellId);
    if (!cfg) return 0;
    const st = _uspChargeState(spellId, cfg);
    return st.pending.length ? Math.min(...st.pending) : 0;
}

// Consumes one charge; returns false when the pool is empty (cast is refused).
export function _uspConsumeCharge(spellId) {
    const cfg = _uspChargeConfig(spellId);
    if (!cfg) return true; // not a charge spell - nothing to spend
    const st = _uspChargeState(spellId, cfg);
    if (st.current <= 0) return false;
    st.current -= 1;
    _uspScheduleRecharge(spellId, cfg);
    if (typeof patchHotbarSlotCooldown === 'function') {
        try { patchHotbarSlotCooldown(spellId); } catch (e) {}
    }
    return true;
}

// Empties the charge pools (round-end reset). Clears the tickers so a reset
// cannot leave an interval counting down against a dead pool.
export function _uspClearAllCharges() {
    Object.keys(_uspCharges).forEach((id) => {
        const st = _uspCharges[id];
        if (st.interval) { clearInterval(st.interval); st.interval = null; }
        delete _uspCharges[id];
    });
}

// Remaining cooldown seconds for the spell (0 when ready / unknown).
// Charge spells are "ready" exactly while the pool holds a charge: their
// cooldown reads as the wait for the NEXT charge (0 while any charge left,
// which mirrors the old single-cooldown behaviour where casting again was
// only blocked while the one cooldown ran).
export function getUniversalSpellCooldownRemaining(spellId) {
    const charges = getUniversalSpellCharges(spellId);
    if (charges) {
        return charges.current > 0 ? 0 : getUniversalSpellChargeRechargeRemaining(spellId);
    }
    const cd = _uspCooldowns[spellId];
    return (cd && cd.remaining > 0) ? cd.remaining : 0;
}

// Consumes one charge (charge spells) or starts the plain cooldown. The
// Rift Anchor's `secondsOverride` shortens this one cast's cooldown - used
// by its PLACE cast, which must be cheap (3s) so the recall can actually
// follow it; the recall itself takes the spell's full cooldown.
export function startUniversalSpellCooldown(spellId, secondsOverride) {
    // Charge-based spells are committed through _uspConsumeCharge (see the
    // cast path). A call here is a deliberate no-op so a late re-time (the
    // Rift Anchor's PLACE cast re-cooldown) can never double-spend a charge.
    if (_uspChargeConfig(spellId)) return;
    const secs = (typeof secondsOverride === 'number' && secondsOverride > 0)
        ? secondsOverride
        : getUniversalSpellEffectiveCooldown(spellId);
    const prev = _uspCooldowns[spellId];
    if (prev && prev.interval) clearInterval(prev.interval);
    const scale = (typeof window !== 'undefined' && window.STOX_EFFECT_TIME_SCALE > 0 && window.STOX_EFFECT_TIME_SCALE !== 1)
        ? window.STOX_EFFECT_TIME_SCALE : 1;
    const state = _uspCooldowns[spellId] = {
        remaining: Math.max(1, Math.round(secs * scale)),
        interval: null,
    };
    if (typeof patchHotbarSlotCooldown === 'function') {
        try { patchHotbarSlotCooldown(spellId); } catch (e) {}
    }
    state.interval = setInterval(() => {
        try {
            if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) return;
            if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
        } catch (e) {}
        state.remaining -= 1;
        if (state.remaining <= 0) {
            state.remaining = 0;
            clearInterval(state.interval);
            state.interval = null;
            if (typeof renderSkillHotbar === 'function') {
                try { renderSkillHotbar(); } catch (e) {}
            }
        } else if (typeof patchHotbarSlotCooldown === 'function') {
            try { patchHotbarSlotCooldown(spellId); } catch (e) {}
        }
    }, 1000);
}


//------------------------------------------------------------------------
//---------------------------DAMAGE ROLL----------------------------------
//------------------------------------------------------------------------
// One rolled hit: base range + flat damage (gear + future dev tree),
// scaled by increased damage (gear + future dev tree), then crit,
// map mods and quiz buffs. Returns { amount, elements, isCrit }.
//   elemental spells → elements[element] = amount (monster resists apply).
//   PHYSICAL spells  → elements = {} (pure physical: only monster physical
//                       resistance mitigates; no elemental ailments).
// Physical spells scale with physical gear (physFlat/physIncPct) instead
// of spell damage - warrior gear, not caster gear.

export function _uspRollCritMult() {
    try {
        if (typeof globalThis._egComputePlayerStats === 'function' && typeof globalThis._egRollCrit === 'function') {
            return globalThis._egRollCrit(globalThis._egComputePlayerStats());
        }
    } catch (e) { /* no crit backend - normal hit */ }
    return 1;
}

export function calcUniversalSpellHit(spell, dmgMin, dmgMax) {
    const stats = (typeof globalThis._egComputePlayerStats === 'function')
        ? globalThis._egComputePlayerStats() : {};
    const tree = getUniversalSpellDamageBonus(spell);
    const isPhys = spell.damageKind === 'physical';

    let dmg = dmgMin + Math.random() * (dmgMax - dmgMin);
    if (isPhys) {
        dmg += ((stats.physFlatMin || 0) + (stats.physFlatMax || 0)) / 2 + (tree.flat || 0);
        dmg *= 1 + ((stats.physIncPct || 0) + (tree.incPct || 0)) / 100;
    } else {
        dmg += (stats.spellDamageFlat || 0) + (tree.flat || 0);
        dmg *= 1 + ((stats.spellDamageIncPct || 0) + (tree.incPct || 0)) / 100;
    }

    const critMult = _uspRollCritMult();
    const isCrit = critMult > 1;
    dmg *= critMult;
    if (isCrit && typeof globalThis.showToast === 'function') {
        try { globalThis.showToast('💥 Critical Hit!'); } catch (e) { /* toast is best-effort */ }
    }

    try {
        if (typeof globalThis._egMapPlayerDamageMult === 'function') dmg *= globalThis._egMapPlayerDamageMult();
        if (typeof globalThis._egQuizDamageBuffMult === 'function') dmg *= globalThis._egQuizDamageBuffMult();
        // Charm orbs applied to this spell's charm: +1% damage each
        // (js/skills/skill-charms.js).
        if (typeof getCharmSkillDamageMult === 'function') dmg *= getCharmSkillDamageMult(spell.id);
        // Spell rank: rank 10 hits ~6× a rank-1 cast (SPELL_RANK_DAMAGE_MULT).
        if (typeof getSpellRankDamageMultForSkill === 'function') dmg *= getSpellRankDamageMultForSkill(spell.id);
    } catch (e) { /* mods unavailable */ }

    const amount = Math.max(1, Math.round(dmg));
    const elements = {};
    if ((spell.element || 'fire') !== 'physical') {
        elements[spell.element || 'fire'] = amount;
    }

    // Life leech mirrors the weapon channels (heal on spell hits too).
    try {
        if (stats.lifeLeechPct > 0 && typeof globalThis.playerCurrentHP !== 'undefined') {
            const heal = Math.round(amount * (stats.lifeLeechPct / 100));
            if (heal > 0 && typeof globalThis.playerMaxHP !== 'undefined') {
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
                if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
            }
        }
    } catch (e) { /* leech is best-effort */ }

    return { amount, elements, isCrit };
}

// Tooltip estimate (outside encounters gear still applies via stats).
export function getUniversalSpellDamageEstimate(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return null;
    // Support spells carry no damage payload at all - their numbers live in
    // getUniversalSpellSupportEstimate(). Returning null here (instead of
    // letting spell.dmg[0] throw) keeps every damage consumer honest.
    if (!spell.dmg) return null;
    // Reference values are rank-1; the cast rank scales them
    // (SPELL_RANK_DAMAGE_MULT in skill-charms.js).
    const rankMult = (typeof getSpellRankDamageMultForSkill === 'function')
        ? getSpellRankDamageMultForSkill(spellId) : 1;
    const perHitMin = Math.max(1, Math.round(spell.dmg[0] * rankMult));
    const perHitMax = Math.max(1, Math.round(spell.dmg[1] * rankMult));
    let count = 1;
    if (spell.behavior === 'volley' || spell.behavior === 'starfall' || spell.behavior === 'wild') count = spell.count || 1;
    else if (spell.behavior === 'ticks') count = 1 + (spell.ticks || 0);
    else if (spell.behavior === 'chain') count = spell.chainMax || 1;
    return {
        perHitMin, perHitMax, count,
        totalMin: perHitMin * count, totalMax: perHitMax * count,
        perTarget: !!spell.perTarget || !!spell.hitsAll || spell.behavior === 'chain',
    };
}


//------------------------------------------------------------------------
//------------------------------CASTING-----------------------------------
//------------------------------------------------------------------------

export function _uspPlaySfx(spell) {
    try {
        if (spell && spell.sfx && typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
            Audio_Manager.playSFX(spell.sfx);
        }
    } catch (e) { /* audio is best-effort */ }
}

export function _uspLivingMonsters() {
    try {
        if (typeof globalThis._egMonsters === 'undefined' || !globalThis._egMonsters) return [];
        return globalThis._egMonsters.filter((m) => m && m.currentHP > 0);
    } catch (e) { return []; }
}

export function _uspNoTargetToast(spell) {
    if (typeof globalThis.showToast !== 'function') return;
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    // Self-cast families never need a monster - if they got here it is because
    // there is no fight running, so say that instead of blaming the target.
    const selfCast = _uspIsSelfCastSpell(spell);
    const name = de ? (spell.nameDE || spell.nameEn) : spell.nameEn;
    const msg = selfCast
        ? (de ? `✋ ${name} braucht einen laufenden Kampf!` : `✋ ${name} needs a live encounter!`)
        : (de ? `🔮 ${name} braucht ein Monster als Ziel!` : `🔮 ${name} needs a monster target!`);
    globalThis.showToast(msg, '#7fb3ff');
}

// Deals one rolled hit to a monster id (FX first, damage on impact).
export function _uspStrike(spell, monsterId, dmgMin, dmgMax, opts) {
    if (!monsterId) return;
    const hit = calcUniversalSpellHit(spell, dmgMin, dmgMax);
    const fxOpts = Object.assign({ isCrit: hit.isCrit }, opts || {});
    try {
        if (typeof _uspFireThemedProjectile === 'function') {
            _uspFireThemedProjectile(spell, monsterId, hit, fxOpts);
        } else if (typeof globalThis._egDamageTargetById === 'function') {
            globalThis._egDamageTargetById(monsterId, hit.amount, hit.elements, { isCrit: hit.isCrit, isPlayerSpell: true });
        }
    } catch (e) {
        try { globalThis._egDamageTargetById(monsterId, hit.amount, hit.elements, { isCrit: hit.isCrit, isPlayerSpell: true }); } catch (e2) {}
    }
}

// Main entry: cast a universal spell by id. Returns true if cast.
export function castUniversalSpell(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return false;
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return false;
    } catch (e) {}

    // Locked (future gating) - show the requirement, spend nothing.
    if (!isUniversalSpellUnlocked(spellId)) {
        if (typeof globalThis.showToast === 'function') globalThis.showToast('🔒 ' + _uspUnlockHint(spell), '#aaa');
        return false;
    }

    // Offensive spells need a monster to hit; the self-cast families (support
    // and movement) only need a live encounter, so a defensive or repositioning
    // cooldown can be pressed during the spawn stagger (before the first hit
    // lands). Cost and cooldown are NOT consumed when the cast is refused
    // (mirrors the Fireball rule).
    let encounterOn = false;
    try { encounterOn = (typeof globalThis._egIsActive === 'function') && globalThis._egIsActive(); } catch (e) {}
    const isSupport = isUniversalSupportSpell(spell);
    const isMovement = isUniversalMovementSpell(spell);
    const living = _uspLivingMonsters();
    let target = null;
    try { target = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null; } catch (e) {}
    if (!encounterOn || (!(isSupport || isMovement) && (living.length === 0 || !target))) {
        _uspNoTargetToast(spell);
        return false;
    }

    // A movement spell with no player sprite on screen has nothing to move.
    // Checked HERE, before mana and cooldown are committed, so a hidden
    // avatar costs nothing (the apply path can only find it at cast time).
    if (isMovement && !_uspAvatarEl()) {
        if (typeof globalThis.showToast === 'function') {
            globalThis.showToast((typeof LANG !== 'undefined' && LANG === 'de')
                ? '✋ Kein Spielersprite auf dem Bildschirm!'
                : '✋ No player sprite on screen!', '#ff8a65');
        }
        return false;
    }

    // Cooldown / charge gate. For charge spells this refuses exactly when
    // the pool is empty (the ready-read above returns the next-charge wait
    // then). The charge itself is spent LATER, together with the cooldown
    // start, so a refused cast (no target, no mana) spends nothing - the
    // mirror of "cost and cooldown are NOT consumed when the cast is refused".
    if (getUniversalSpellCooldownRemaining(spellId) > 0) return false;

    // Mana (life under Blood Magic) gate - spend nothing on failure.
    const cost = getUniversalSpellManaCost(spellId);
    if (typeof payAbilityCost === 'function') {
        if (!payAbilityCost(cost)) {
            if (typeof globalThis.showToast === 'function') {
                let noMana = 'cls_no_mana';
                try {
                    if (typeof _bloodMagicActive === 'function' && _bloodMagicActive()) noMana = 'cls_no_life';
                } catch (e) {}
                globalThis.showToast(t(noMana));
            }
            return false;
        }
    } else if (typeof spendMana === 'function') {
        if (!spendMana(cost)) {
            if (typeof globalThis.showToast === 'function') globalThis.showToast(t('cls_no_mana'));
            return false;
        }
    }

    // Commit point: spend the charge (charge spells) or start the cooldown
    // (plain spells). Mana has been paid above, so from here the cast lands.
    if (_uspChargeConfig(spellId)) {
        if (!_uspConsumeCharge(spellId)) return false; // pool raced empty (defensive)
    } else {
        startUniversalSpellCooldown(spellId);
    }
    _uspPlaySfx(spell);
    try {
        if (typeof globalThis.updateQuestStats === 'function') updateQuestStats('classAbilityUsed', {});
        if (typeof globalThis.triggerSkillBanter === 'function') globalThis.triggerSkillBanter(spellId);
    } catch (e) { /* non-combat progress is best-effort */ }

    // Support family: the effect lands on the player, not on a monster, so it
    // bypasses the projectile/strike machinery entirely.
    if (isSupport) {
        const summary = _uspApplySupportSpell(spell);
        if (typeof globalThis.showToast === 'function') {
            const label = (typeof LANG !== 'undefined' && LANG === 'de') ? spell.nameDE : spell.nameEn;
            if (summary) globalThis.showToast(`${spell.icon} ${label} - ${summary}`, '#7fe0b0');
        }
        if (typeof renderSkillHotbar === 'function') {
            try { renderSkillHotbar(); } catch (e) {}
        }
        return true;
    }

    // Movement family: the effect moves the player sprite, so like support it
    // never touches the projectile/strike machinery.
    if (isMovement) {
        const res = _uspApplyMovementSpell(spell) || {};
        // The Rift Anchor's PLACE cast re-times its own cooldown (short) so the
        // recall can follow inside the armed window; the recall keeps the full
        // one started above.
        if (res.cooldown) startUniversalSpellCooldown(spellId, res.cooldown);
        if (typeof globalThis.showToast === 'function') {
            const label = (typeof LANG !== 'undefined' && LANG === 'de') ? spell.nameDE : spell.nameEn;
            if (res.text) globalThis.showToast(`${spell.icon} ${label} - ${res.text}`, '#7fd9ff');
        }
        if (typeof renderSkillHotbar === 'function') {
            try { renderSkillHotbar(); } catch (e) {}
        }
        return true;
    }

    const targetId = target.id;
    switch (spell.behavior) {
        case 'volley': {
            const n = spell.count || 3;
            const step = spell.volleyDelayMs || 130;
            for (let i = 0; i < n; i++) {
                setTimeout(() => {
                    try {
                        if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                    } catch (e) { return; }
                    _uspStrike(spell, targetId, spell.dmg[0], spell.dmg[1], { volleyIndex: i });
                }, i * step);
            }
            break;
        }
        case 'nova':
        case 'starfall': {
            if (spell.behavior === 'starfall') {
                // Strikes rain onto RANDOM enemies with falling-star visuals.
                const n = spell.count || 6;
                for (let i = 0; i < n; i++) {
                    setTimeout(() => {
                        const pool = _uspLivingMonsters();
                        if (!pool.length) return;
                        try {
                            if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                        } catch (e) { return; }
                        const victim = pool[Math.floor(Math.random() * pool.length)];
                        _uspStrike(spell, victim.id, spell.dmg[0], spell.dmg[1], { fromSky: true });
                    }, i * 260);
                }
            } else {
                // Instant AoE: every living monster takes the hit.
                const pool = _uspLivingMonsters().slice(0, 8);
                pool.forEach((m, i) => {
                    setTimeout(() => {
                        try {
                            if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                        } catch (e) { return; }
                        _uspStrike(spell, m.id, spell.dmg[0], spell.dmg[1], { isAoE: true });
                    }, i * 70);
                });
            }
            break;
        }
        case 'ticks': {
            // Instant portion now, then one tick per second.
            _uspStrike(spell, targetId, spell.dmg[0], spell.dmg[1], { isDot: true });
            const td = spell.tickDmg || spell.dmg;
            const total = spell.ticks || 3;
            const hitAll = !!spell.hitsAll;
            for (let i = 0; i < total; i++) {
                setTimeout(() => {
                    try {
                        if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                    } catch (e) { return; }
                    if (hitAll) {
                        _uspLivingMonsters().slice(0, 8).forEach((m) => {
                            _uspStrike(spell, m.id, td[0], td[1], { isDot: true, isTick: true });
                        });
                    } else {
                        const stillAlive = _uspLivingMonsters().some((m) => m.id === targetId);
                        if (!stillAlive) return;
                        _uspStrike(spell, targetId, td[0], td[1], { isDot: true, isTick: true });
                    }
                }, (i + 1) * 1000);
            }
            break;
        }
        case 'chain': {
            // First hit on the target, then leaps to new victims with falloff.
            let dmgMin = spell.dmg[0];
            let dmgMax = spell.dmg[1];
            const falloff = spell.chainFalloff || 0.72;
            const maxJumps = Math.min(spell.chainMax || 3, 5);
            const hitSet = new Set();
            let fromId = null;
            const jump = (monsterId, depth) => {
                const pool = _uspLivingMonsters();
                if (!pool.length) return;
                let victim = pool.find((m) => m.id === monsterId && !hitSet.has(m.id));
                if (!victim) {
                    const fresh = pool.filter((m) => !hitSet.has(m.id));
                    if (!fresh.length) return;
                    victim = fresh[Math.floor(Math.random() * fresh.length)];
                }
                hitSet.add(victim.id);
                _uspStrike(spell, victim.id, Math.round(dmgMin), Math.round(dmgMax), { isChain: true, fromMonsterId: fromId });
                fromId = victim.id;
                dmgMin *= falloff;
                dmgMax *= falloff;
                if (depth + 1 < maxJumps) {
                    setTimeout(() => {
                        try {
                            if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                        } catch (e) { return; }
                        jump(victim.id, depth + 1);
                    }, 200);
                }
            };
            jump(targetId, 0);
            break;
        }
        case 'delayed': {
            // Telegraph the impact zone(s), then strike hard. hitsAll spells
            // (Flameblast, Storm Call, ...) mark EVERY enemy and split the
            // landing across all of them with nova rings.
            const delayMs = spell.delayMs || 900;
            try {
                if (typeof _uspTelegraph === 'function') {
                    if (spell.hitsAll) {
                        _uspLivingMonsters().slice(0, 8).forEach((m) => _uspTelegraph(spell, m.id, delayMs));
                    } else {
                        _uspTelegraph(spell, targetId, delayMs);
                    }
                }
            } catch (e) { /* telegraph is cosmetic */ }
            setTimeout(() => {
                try {
                    if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                } catch (e) { return; }
                if (spell.hitsAll) {
                    _uspLivingMonsters().slice(0, 8).forEach((m, i) => {
                        setTimeout(() => {
                            try {
                                if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                            } catch (e) { return; }
                            _uspStrike(spell, m.id, spell.dmg[0], spell.dmg[1], { fromSky: true, isAoE: true });
                        }, i * 70);
                    });
                    return;
                }
                const stillAlive = _uspLivingMonsters().some((m) => m.id === targetId);
                if (!stillAlive) return;
                _uspStrike(spell, targetId, spell.dmg[0], spell.dmg[1], { fromSky: true, isBig: true });
            }, delayMs);
            break;
        }
        case 'wild': {
            // Unpredictable projectiles (Spark): N shots at RANDOM enemies,
            // flying flat from the caster - no sky-fall, no homing.
            const n = spell.count || 6;
            const step = spell.volleyDelayMs || 150;
            for (let i = 0; i < n; i++) {
                setTimeout(() => {
                    const pool = _uspLivingMonsters();
                    if (!pool.length) return;
                    try {
                        if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                    } catch (e) { return; }
                    const victim = pool[Math.floor(Math.random() * pool.length)];
                    _uspStrike(spell, victim.id, spell.dmg[0], spell.dmg[1], { wildIndex: i });
                }, i * step);
            }
            break;
        }
        default: {
            // 'single' - one projectile, one impact.
            _uspStrike(spell, targetId, spell.dmg[0], spell.dmg[1], {});
            break;
        }
    }

    if (typeof renderSkillHotbar === 'function') {
        try { renderSkillHotbar(); } catch (e) {}
    }
    return true;
}


//------------------------------------------------------------------------
//---------------------------REGISTRY INTEGRATION-------------------------
//------------------------------------------------------------------------
// Registers every universal spell as a first-class SKILL_REGISTRY entry
// (slotKind 'universal', legacySlot null) so the spellbook, hotbar,
// tooltips and keybinds work with zero special-casing in their render
// code. skill-registry.js delegates mana / cooldown / usability / damage
// lookups for these ids back into this file (typeof-guarded).

export function _registerUniversalSpells() {
    if (typeof SKILL_REGISTRY === 'undefined') return;
    for (const spell of UNIVERSAL_SPELL_DEFS) {
        if (SKILL_REGISTRY[spell.id]) continue;
        SKILL_REGISTRY[spell.id] = {
            id: spell.id,
            icon: spell.icon,
            image: null,
            nameEn: spell.nameEn,
            nameDE: spell.nameDE,
            descCursorEn: spell.descEn,
            descCursorDE: spell.descDE,
            cooldownSeconds: spell.cooldownSeconds,
            manaCost: spell.manaCost,
            levels: [{
                descEn: spell.descEn,
                descDE: spell.descDE,
                effect: {},
            }],
            source: { kind: 'universal', ownerId: null, slot: 'active1' },
            legacySlot: null,
            slotKind: 'universal',
            isPassive: false,
            movable: true,
            endgameOnly: false,
            tags: spell.tags,
            scaling: _uspScalingLine(spell),
            damage: null,
            // Hold-to-cast: spells with castTimeSeconds need the button held
            // until the cast bar fills (see js/skills/spell-casttime.js).
            // The tooltip reads this string; the engine reads
            // getSkillCastTimeSeconds() in the same file.
            castTime: spell.castTimeSeconds ? `${spell.castTimeSeconds.toFixed(1)}s` : 'instant',
            castTimeSeconds: spell.castTimeSeconds || 0,
            usp: spell,
        };
    }
}

// "Scales with" line: Spell Damage (or Attack Damage for physical) + the
// design damage kind + the behaviour tags the future dev tree hooks onto.
export function _uspScalingLine(spell) {
    // Support spells do not scale off damage stats - they scale off the charm
    // rank plus the max Life / Absorption pool they refill (see SUPPORT
    // SPELLS). Saying "Scales with: Spell Damage" on a heal would be a lie.
    if (isUniversalSupportSpell(spell)) {
        return (typeof LANG !== 'undefined' && LANG === 'de')
            ? ['Anhänger-Rang', 'max. Leben/Schild']
            : ['Charm Rank', 'max Life/Shield'];
    }
    // Movement spells scale off rank alone: they deal no damage and their
    // speed buffs are a flat percentage, not a spell-power multiplier.
    if (isUniversalMovementSpell(spell)) {
        return (typeof LANG !== 'undefined' && LANG === 'de')
            ? ['Anhänger-Rang', 'Schrittweite']
            : ['Charm Rank', 'Step Distance'];
    }
    const isPhys = spell.damageKind === 'physical';
    const parts = [isPhys ? 'Attack Damage' : 'Spell Damage'];
    const kindName = {
        fire: 'Fire Damage', cold: 'Cold Damage', lightning: 'Lightning Damage',
        shadow: 'Shadow Damage', arcane: 'Arcane Damage', holy: 'Holy Damage',
        nature: 'Nature Damage', physical: 'Physical Damage',
    }[spell.damageKind];
    if (kindName && parts.indexOf(kindName) === -1) parts.push(kindName);
    const tagName = {
        area: 'Area of Effect', projectile: 'Projectile Damage', dot: 'Damage over Time',
        chain: 'Chaining', channel: 'Channelling',
    };
    (spell.scalingTags || []).forEach((tg) => {
        if (tagName[tg] && parts.indexOf(tagName[tg]) === -1) parts.push(tagName[tg]);
    });
    return parts;
}

// NOTE: registration is driven by skill-registry.js (bootstrap section)
// after buildSkillRegistry(). A top-level call here would run during the
// skill-registry <-> universal-spells import cycle, while SKILL_REGISTRY
// is still in its temporal dead zone (typeof on a TDZ import binding
// THROWS - it is not a soft guard like it was for classic globals).


//------------------------------------------------------------------------
//----------------------ROUND-END COOLDOWN RESET--------------------------
//------------------------------------------------------------------------
// The legacy engine wipes slot cooldowns when a round ends
// (resetActiveCooldown in class-cooldown-state.js). Spell cooldowns follow
// the same rule so a fresh puzzle never starts with dead hotbar slots.

function _uspWireRoundEndReset() {
    if (window._uspWrappedReset) return;
    window._uspWrappedReset = true;
    const _origResetActiveCooldown = globalThis.resetActiveCooldown;
    globalThis.resetActiveCooldown = function () {
        try {
            Object.keys(_uspCooldowns).forEach((id) => {
                const cd = _uspCooldowns[id];
                if (cd && cd.interval) clearInterval(cd.interval);
                _uspCooldowns[id] = { remaining: 0, interval: null };
            });
            // Charge pools refill too - a fresh puzzle starts with full
            // mobility, exactly like every other cooldown starts cleared.
            _uspClearAllCharges();
        } catch (e) { /* cooldown reset is best-effort */ }
        return _origResetActiveCooldown();
    };
}
// Deferred: at module-eval time the owner's globalThis accessor may not
// exist yet (import-cycle timing), so the old typeof guard silently
// skipped the wrap. After load everything is in place. NOTE: deferred module
// scripts execute at readyState 'interactive' - 'loading' alone would run
// this inside the import phase (the skill-hotbar P bug was this exact miss).
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _uspWireRoundEndReset);
} else {
    _uspWireRoundEndReset();
}

