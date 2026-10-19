import { Audio_Manager } from '../audio/audio.js';
import { save } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { _getGlobalCooldownReduction } from '../classes/class-cooldown-state.js';
import { _egApplyDamageConversion, _egHasDamageConversion, _egLeechAbsorption, _egLeechHealMult } from '../combat/combat-calculations-resistances.js';
import { _applyManaCostModifiers, _bloodMagicActive, _scaleAbilityManaCost, canAffordLifeCost, canAffordMana, payAbilityCost } from '../classes/class-mana.js';
import { getCharmSkillDamageMult, getSkillCastRankFull, getSpellRankDamageMult, getSpellManaCostOverrideForSkill, getSpellRankDamageMultForSkill, getSpellRankManaMultForSkill, isSkillCharmUnlocked, noteCharmCast } from './skill-charms.js';
import { patchHotbarSlotCooldown, refreshSkillUI, renderSkillHotbar } from './skill-hotbar.js';
import { SKILL_REGISTRY } from './skill-registry.js';
import { _uspAnchorMarkerClear, _uspAnchorMarkerShow, _uspArrowFan, _uspAuraClear, _uspAuraPulse, _uspAuraShow, _uspBladeBlastPlant, _uspBarrierRaise, _uspBarrierStart, _uspBulwarkClear, _uspBulwarkWall, _uspWindwardClear, _uspWindwardGale, _uspAegisWardClear, _uspAegisWardHit, _uspAegisWardShow, _uspRetributionClear, _uspRetributionFlare, _uspRetributionShow, _uspWindstepClear, _uspWindstepTailwind, _uspBlinkFX, _uspRenewalBloom, _uspRenewalClear, _uspRenewalPulse, _uspMendHearts, _uspFireThemedProjectile, _uspMeleeSwing, _uspMoveSpriteOffset, _uspLeapImpactFX, _uspSupportCastFX, _uspSupportPulseFX, _uspTelegraph, _uspZoneBlast, _uspZoneRain } from './universal-spell-fx.js';
import { beginSpellTargeting, cancelSpellTargeting, getAvatarCentre, getCursorPoint, isSpellTargeting, resolveGroundShape, shapeHitsRect, showSpellZone } from './spell-casttime.js';
import { updateQuestStats } from '../inference/inference-stats.js';
import { STATE } from '../state.js';

// universal-spells.js
//------------------------------------------------------------------------
//--------------------UNIVERSAL SPELL ARSENAL-----------------------------
//------------------------------------------------------------------------
// A classic ARPG / MMO inspired spell arsenal. Every spell here:
//   - lives in the SPELLBOOK under its own "Universal" section,
//   - is dragged onto the hotbar like any other skill,
//   - costs MANA (scaled by _scaleAbilityManaCost, Blood-Magic aware),
//   - deals DIRECT damage to monsters via _egDamageTargetById,
//   - plays a code-drawn themed effect (see universal-spell-fx.js +
//     css/universal-spells.css - no emoji in combat visuals).
//
// Fireball (usp_fireball) is the first spell of the arsenal - the tutorial
// just grants its rank-1 charm. The rest extend the same universal-spell idea to a full arsenal
// (24 elemental + 6 physical melee + 6 arrows).
//
// DESIGN CONTRACT (for the future Probability Tree scaling pass):
//   Every def carries:
//     element    - engine resist key: 'fire' | 'cold' | 'lightning' |
//                  'shadow' | 'physical'. (The combat engine resists the
//                  four elements per-share; 'physical' hits carry no
//                  elemental breakdown so only physical resistance applies.
//                  Spell themes outside this set (holy, a fire-tinted
//                  'arcane' visual) map onto the closest resist key.)
//     damageKind - design scaling key: 'fire' | 'cold' | 'lightning' |
//                  'shadow' | 'holy' | 'physical'.
//                  The future Probability Tree reads this via
//                  getUniversalSpellDamageBonus().
//     scalingTags- extra tags ('area', 'projectile', 'dot', 'channel') the
//                  future tree can hook per-spell-type modifiers onto.
//     behavior   - 'single' | 'volley' | 'nova' | 'ticks' | 'chain' |
//                  'delayed' | 'starfall' | 'wild'. Drives cast + FX, never
//                  balance. 'wild' = Spark-style random-target projectiles.
//
// CAST KINDS (spell pass 1) - how a spell is cast, from getUniversalSpellCastKind():
//     'hold'    hold the key / slot; the cast bar fills, release fires it
//               (castTimeSeconds > 0 - spell-casttime.js). Cancel by releasing early.
//     'instant' tap: the effect lands on the TARGETED monster, no cast time.
//     'self'    tap: the effect lands on the PLAYER (heals, shields, buffs).
//     'move'    tap: the player moves towards the CURSOR (Blink, Dash,
//               Disengage - Disengage goes directly AWAY from it).
//     'melee'   the effect plays NEXT TO THE PLAYER (a cone in front, or a
//               ring around) and the surroundings are then checked for what
//               it actually hit. No target needed; whiffing is possible.
//               May be instant or carry a cast time (hold).
//     'ground'  tap: a shaped reticle (circle / square / beam / cone, see
//               `ground` on the def) follows the cursor; left click places
//               the effect, right click / Esc cancels. Mana and cooldown are
//               spent on the click, not on the tap (spell-targeting.js).
//   The assignment lives in USP_CAST_KIND_TABLE below the defs - one place to
//   retune "which spells feel how".
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
        // The starter spell: the tutorial hands out its rank-1 charm. A
        // 1.0s cast bar and ~18 damage (the numbers the old tutorial-only
        // Fireball had), cheap enough to be the first spell you learn.
        id: 'usp_fireball', icon: '🔥', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'single', dmg: [16, 20], manaCost: 16, cooldownSeconds: 4, castTimeSeconds: 1.0,
        tags: ['Spell', 'Fire', 'Projectile'], scalingTags: ['spell', 'fire', 'projectile'],
        nameEn: 'Fireball', nameDE: 'Feuerball',
        descEn: 'A fireball at the target. 25% chance to Ignite.',
        descDE: 'Ein Feuerball auf das Ziel. 25% Chance zu entzünden.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_pyroblast', icon: '☄️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'single', dmg: [19, 24], manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 2.0,
        tags: ['Spell', 'Fire', 'Projectile'], scalingTags: ['spell', 'fire', 'projectile'],
        nameEn: 'Magma Shot', nameDE: 'Magmageschoss',
        descEn: 'A slow, heavy molten blast. Big single-target fire damage.',
        descDE: 'Ein schwerer Magmabrocken. Hoher Feuerschaden auf ein Ziel.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_flamestrike', icon: '🔥', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'nova', dmg: [6, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.2, perTarget: true,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Blazing Column', nameDE: 'Flammensäule',
        descEn: 'A pillar of flame scorches every enemy.',
        descDE: 'Eine Flammensäule versengt alle Gegner.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_immolate', icon: '🕯️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [2, 4], ticks: 5, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.8,
        tags: ['Spell', 'Fire', 'Damage over Time'], scalingTags: ['spell', 'fire', 'dot'],
        nameEn: 'Scorching Brand', nameDE: 'Sengendes Mal',
        descEn: 'Instant fire damage, then burning for 5 seconds.',
        descDE: 'Sofortiger Feuerschaden, danach 5 Sekunden Brand.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_meteor', icon: '🌠', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'delayed', dmg: [20, 27], delayMs: 900, manaCost: 53, cooldownSeconds: 24, castTimeSeconds: 1.6,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Meteor', nameDE: 'Meteor',
        descEn: 'A meteor hits the aimed spot after a short delay. Heavy fire damage in an area.',
        descDE: 'Ein Meteor trifft nach kurzer Verzögerung den Zielort. Hoher Feuerschaden im Bereich.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_rain_of_fire', icon: '🎆', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Fire', 'Area', 'Damage over Time'], scalingTags: ['spell', 'fire', 'area', 'dot'],
        nameEn: 'Ember Shower', nameDE: 'Glutschauer',
        descEn: 'Embers rain on the aimed area for 4 seconds, hitting every enemy inside each second.',
        descDE: 'Glut regnet 4 Sekunden auf das Zielgebiet und trifft jede Sekunde alle Gegner darin.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_holy_fire', icon: '☀️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [6, 9], tickDmg: [2, 4], ticks: 3, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.6,
        tags: ['Spell', 'Fire', 'Damage over Time'], scalingTags: ['spell', 'fire', 'dot'],
        nameEn: 'Solar Scorch', nameDE: 'Sonnenglut',
        descEn: 'Instant fire damage, then 3 more seconds of burning.',
        descDE: 'Sofortiger Feuerschaden, danach 3 Sekunden Brand.',
        sfx: 'dofBurn',
    },

    // ── FROST ───────────────────────────────────────────────────────────
    {
        id: 'usp_frostbolt', icon: '❄️', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [8, 10], manaCost: 21, cooldownSeconds: 6, castTimeSeconds: 0.5,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Frost Shard', nameDE: 'Frostsplitter',
        descEn: 'A quick shard of ice. Cheap, reliable cold damage.',
        descDE: 'Ein schneller Eissplitter. Günstiger, verlässlicher Kälteschaden.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_blizzard', icon: '🌨️', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Cold', 'Area', 'Damage over Time'], scalingTags: ['spell', 'cold', 'area', 'dot'],
        nameEn: 'Whiteout', nameDE: 'Eissturm',
        descEn: 'A freezing storm rages on the aimed area for 4 seconds, hitting every enemy inside each second.',
        descDE: 'Ein Eissturm tobt 4 Sekunden im Zielgebiet und trifft jede Sekunde alle Gegner darin.',
        sfx: 'time_freeze',
    },
    {
        id: 'usp_cone_of_cold', icon: '🧊', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'nova', dmg: [5, 8], manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Cold', 'Area'], scalingTags: ['spell', 'cold', 'area'],
        nameEn: 'Glacial Breath', nameDE: 'Eisatem',
        descEn: 'Freezing wind in a cone toward the cursor. Hits every enemy inside.',
        descDE: 'Eisiger Wind in einem Kegel zum Cursor. Trifft alle Gegner darin.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_ice_lance', icon: '💎', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [9, 11], manaCost: 21, cooldownSeconds: 6, castTimeSeconds: 0.6,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Rime Needle', nameDE: 'Reifnadel',
        descEn: 'A needle of ice at the target. The fastest spell.',
        descDE: 'Eine Eisnadel auf das Ziel. Der schnellste Zauber.',
        sfx: 'absoluteZero',
    },

    // ── ARCANE ──────────────────────────────────────────────────────────
    {
        id: 'usp_arcane_missiles', icon: '✨', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Arcane', 'Projectile'], scalingTags: ['spell', 'arcane', 'projectile'],
        nameEn: 'Arcane Darts', nameDE: 'Arkane Pfeile',
        descEn: 'Channelled: 5 homing darts hit the target one after another.',
        descDE: 'Kanalisiert: 5 zielsuchende Pfeile treffen das Ziel nacheinander.',
        sfx: 'arcaneReveal',
    },
    {
        id: 'usp_arcane_explosion', icon: '💫', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'nova', dmg: [5, 9], manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Arcane', 'Area'], scalingTags: ['spell', 'arcane', 'area'],
        nameEn: 'Mana Burst', nameDE: 'Manaschub',
        descEn: 'Arcane energy detonates around you and hits every enemy.',
        descDE: 'Arkane Energie explodiert um dich und trifft alle Gegner.',
        sfx: 'transitionMatrix',
    },
    {
        id: 'usp_arcane_blast', icon: '🔮', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 14, castTimeSeconds: 1.2,
        tags: ['Spell', 'Arcane', 'Projectile'], scalingTags: ['spell', 'arcane', 'projectile'],
        nameEn: 'Force Pulse', nameDE: 'Kraftstoß',
        descEn: 'A concentrated blast of arcane force. Heavy single-target damage.',
        descDE: 'Ein gebündelter arkaner Kraftstoß. Hoher Schaden auf ein Ziel.',
        sfx: 'arcaneReveal',
    },
    {
        id: 'usp_disintegrate', icon: '⚛️', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'volley', dmg: [4, 6], count: 4, volleyDelayMs: 260, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Arcane', 'Channel'], scalingTags: ['spell', 'arcane', 'channel'],
        nameEn: 'Unravel Beam', nameDE: 'Zerfallsstrahl',
        descEn: 'Channelled: a beam along a line to the cursor hits everything on it 4 times.',
        descDE: 'Kanalisiert: Ein Strahl entlang einer Linie zum Cursor trifft alles darauf 4-mal.',
        sfx: 'transitionCascade',
    },

    // ── SHADOW ──────────────────────────────────────────────────────────
    {
        id: 'usp_shadow_bolt', icon: '💜', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'single', dmg: [10, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.6,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Gloom Bolt', nameDE: 'Düsterblitz',
        descEn: 'A bolt of darkness. Solid shadow damage for modest mana.',
        descDE: 'Ein Blitz aus Dunkelheit. Solider Schattenschaden für wenig Mana.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_corruption', icon: '☠️', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 6, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'dot'],
        nameEn: 'Withering Curse', nameDE: 'Welkfluch',
        descEn: 'Shadow damage over 6 seconds.',
        descDE: 'Schattenschaden über 6 Sekunden.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_shadow_word_pain', icon: '🖤', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [5, 6], tickDmg: [3, 5], ticks: 4, manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'dot'],
        nameEn: 'Torment', nameDE: 'Qual',
        descEn: 'Instant shadow damage, then 4 seconds of lingering pain.',
        descDE: 'Sofortiger Schattenschaden, danach 4 Sekunden anhaltender Schmerz.',
        sfx: 'bayesTrapExplosion',
    },
    {
        id: 'usp_chaos_bolt', icon: '🟣', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'single', dmg: [20, 27], manaCost: 55, cooldownSeconds: 24, castTimeSeconds: 2.2,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Ruin Bolt', nameDE: 'Ruinblitz',
        descEn: 'A cataclysmic bolt. The hardest-hitting single-target spell.',
        descDE: 'Ein katastrophaler Blitz. Der stärkste Einzelzielzauber.',
        sfx: 'bayesTrapExplosion',
    },
    {
        id: 'usp_consecration', icon: '🕳️', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 44, cooldownSeconds: 20, castTimeSeconds: 1.0,
        tags: ['Spell', 'Shadow', 'Area', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'area', 'dot'],
        nameEn: 'Blighted Ground', nameDE: 'Verderbter Boden',
        descEn: 'Corrupts the ground for 3 seconds, hitting every enemy on it each second.',
        descDE: 'Verdirbt den Boden 3 Sekunden und trifft jede Sekunde alle Gegner darauf.',
        sfx: 'demon_eye',
    },

    // ── LIGHTNING ──────────────────────────────────────────────────────────
    {
        id: 'usp_lightning_bolt', icon: '⚡', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [11, 13], manaCost: 26, cooldownSeconds: 8, castTimeSeconds: 0.6,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Lightning Bolt', nameDE: 'Blitzschlag',
        descEn: 'A fast, fierce bolt of lightning.',
        descDE: 'Ein schneller, kraftvoller Blitz.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_chain_lightning', icon: '🌩️', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'chain', dmg: [13, 17], chainFalloff: 0.72, chainMax: 3, manaCost: 44, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Chaining'], scalingTags: ['spell', 'lightning', 'chain'],
        nameEn: 'Chain Lightning', nameDE: 'Kettenblitz',
        descEn: 'Leaps from the target to up to 2 more enemies, weakening with each jump.',
        descDE: 'Springt vom Ziel auf bis zu 2 weitere Gegner und wird mit jedem Sprung schwächer.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_wrath', icon: '🍃', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [10, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.5,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Storm Lash', nameDE: 'Sturmpeitsche',
        descEn: 'A lash of storm energy. Lightning damage for modest mana.',
        descDE: 'Ein Peitschenhieb aus Sturmenergie. Blitzschaden für wenig Mana.',
        sfx: 'syla_nature',
    },
    {
        id: 'usp_starfall', icon: '🌟', theme: 'arcane', element: 'fire', damageKind: 'shadow',
        behavior: 'starfall', dmg: [3, 5], count: 6, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Arcane', 'Area'], scalingTags: ['spell', 'arcane', 'area'],
        nameEn: 'Star Shower', nameDE: 'Sternenregen',
        descEn: '6 burning star shards crash onto random enemies.',
        descDE: '6 brennende Sternsplitter schlagen auf zufällige Gegner.',
        sfx: 'transitionMatrix',
    },
    {
        id: 'usp_smite', icon: '🌦️', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [9, 12], manaCost: 23, cooldownSeconds: 7, castTimeSeconds: 0.5,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Storm Smite', nameDE: 'Sturmschlag',
        descEn: 'A bolt from the sky strikes the target. Reliable lightning damage.',
        descDE: 'Ein Blitz vom Himmel trifft das Ziel. Verlässlicher Blitzschaden.',
        sfx: 'gust_thunder',
    },

    // ── PHYSICAL (melee strikes - thrown-blade visuals) ─────────────────
    // element 'physical' = pure physical hit: no elemental breakdown, so
    // only monster PHYSICAL resistance mitigates it (see _egApplyTargetResistances).
    {
        id: 'usp_heroic_strike', icon: '🤺', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [11, 13], manaCost: 23, cooldownSeconds: 3, castTimeSeconds: 0.6,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Mighty Blow', nameDE: 'Kräftiger Hieb',
        descEn: 'Instant strike in front of you. Reliable physical damage, no target needed.',
        descDE: 'Sofortiger Hieb vor dir. Verlässlicher physischer Schaden, kein Ziel nötig.',
        sfx: 'cleave',
    },
    {
        id: 'usp_mortal_strike', icon: '⚔️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [17, 23], manaCost: 49, cooldownSeconds: 10, castTimeSeconds: 1.4,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Fatal Blow', nameDE: 'Fataler Hieb',
        descEn: 'Instant heavy blow in front of you. Heavy physical damage.',
        descDE: 'Sofortiger schwerer Schlag vor dir. Hoher physischer Schaden.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_whirlwind', icon: '🌪️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 9], manaCost: 42, cooldownSeconds: 9, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Whirlwind', nameDE: 'Wirbelwind',
        descEn: 'Spin and slash every enemy in reach.',
        descDE: 'Wirbelt herum und trifft alle Gegner in Reichweite.',
        sfx: 'cleave',
    },
    {
        id: 'usp_rend', icon: '✂️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 5, manaCost: 31, cooldownSeconds: 7, castTimeSeconds: 0.7,
        tags: ['Spell', 'Physical', 'Damage over Time'], scalingTags: ['spell', 'physical', 'dot'],
        nameEn: 'Gash', nameDE: 'Aufschlitzen',
        descEn: 'Instant damage, then bleeding for 5 seconds.',
        descDE: 'Sofortiger Schaden, danach 5 Sekunden Blutung.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_execute', icon: '💀', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [20, 27], manaCost: 53, cooldownSeconds: 12, castTimeSeconds: 1.8,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Finishing Blow', nameDE: 'Gnadenstoß',
        descEn: 'Instant strike in front of you. The hardest-hitting physical attack.',
        descDE: 'Sofortiger Schlag vor dir. Der stärkste physische Angriff.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_cleave', icon: '🪓', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 8], manaCost: 36, cooldownSeconds: 8, castTimeSeconds: 0.8, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Cleave', nameDE: 'Spalten',
        descEn: 'A wide arc that hits every enemy inside it. Instant.',
        descDE: 'Ein weiter Bogen, der alle Gegner darin trifft. Sofort.',
        sfx: 'cleave',
    },

    // ── PHYSICAL: MORE MELEE ────────────────────────────────────────────
    // Same weapon-attack family as Heroic Strike / Cleave (castKind 'melee',
    // see USP_MELEE_SPELLS). Extra melee keys: hits (rapid repeat strikes),
    // stagger (ms the victims' attack charge freezes), healPct (% of max Life
    // restored when the swing connects).
    {
        id: 'usp_crushing_blow', icon: '🔨', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [15, 19], manaCost: 38, cooldownSeconds: 9, castTimeSeconds: 0.8,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Crushing Blow', nameDE: 'Vernichtender Schlag',
        descEn: 'A heavy hammer blow. Staggers the victim for 1.5 seconds.',
        descDE: 'Ein schwerer Hammerschlag. Betäubt das Opfer für 1,5 Sekunden.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_blade_flurry', icon: '💫', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [3, 4], manaCost: 33, cooldownSeconds: 8, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Rapid Cuts', nameDE: 'Schnittsalve',
        descEn: 'Hits whatever is in front of you 4 times. Instant.',
        descDE: 'Trifft alles vor dir 4-mal. Sofort.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_piercing_lunge', icon: '🗡️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [11, 14], manaCost: 30, cooldownSeconds: 7, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Piercing Lunge', nameDE: 'Durchbohrender Ausfall',
        descEn: 'A long, narrow thrust that skewers every enemy in the line. Instant.',
        descDE: 'Ein langer, schmaler Stoß, der alle Gegner in der Linie durchbohrt. Sofort.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_seismic_slam', icon: '🌍', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [6, 9], manaCost: 40, cooldownSeconds: 13, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Seismic Slam', nameDE: 'Erdbebenschlag',
        descEn: 'Smashes the ground: hits every enemy in reach and staggers them for 1.2 seconds.',
        descDE: 'Zerschmettert den Boden: trifft alle Gegner in Reichweite und betäubt sie 1,2 Sekunden.',
        sfx: 'cleave',
    },
    {
        id: 'usp_vampiric_strike', icon: '🧛', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [10, 13], manaCost: 31, cooldownSeconds: 10, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Vampiric Strike', nameDE: 'Vampirhieb',
        descEn: 'Strike in front of you; restores 6% of max life on hit. Instant.',
        descDE: 'Hieb vor dir; stellt bei Treffer 6% des maximalen Lebens wieder her. Sofort.',
        sfx: 'diagonalStrike',
    },

    // ── REACTION STRIKES (only usable right after you avoided a hit) ─────────
    // def.reaction: 'parry' | 'block' | 'dodge'. Locked until that has just
    // happened (window: USP_REACTION_WINDOW_MS); using one spends the window.
    {
        id: 'usp_counterstrike', icon: '↪️', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'parry',
        behavior: 'single', dmg: [20, 26], manaCost: 22, cooldownSeconds: 4, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Counterstrike', nameDE: 'Gegenschlag',
        descEn: 'REACTION (5s after a PARRY): riposte for heavy physical damage, staggers for 1 second.',
        descDE: 'REAKTION (5 Sek. nach einer PARADE): Konter mit hohem physischem Schaden, betäubt 1 Sekunde.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_blade_dance', icon: '💃', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'parry',
        behavior: 'nova', dmg: [4, 6], manaCost: 28, cooldownSeconds: 6, castTimeSeconds: 0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Dance of Blades', nameDE: 'Klingentanz',
        descEn: 'REACTION (5s after a PARRY): spin and slash every enemy in reach 3 times.',
        descDE: 'REAKTION (5 Sek. nach einer PARADE): wirbelt und trifft alle Gegner in Reichweite 3-mal.',
        sfx: 'cleave',
    },
    {
        id: 'usp_shield_slam', icon: '🛡️', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'block',
        behavior: 'single', dmg: [14, 18], manaCost: 20, cooldownSeconds: 4, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Guard Bash', nameDE: 'Wächterstoß',
        descEn: 'REACTION (5s after a BLOCK): heavy physical damage and a 2 second stagger.',
        descDE: 'REAKTION (5 Sek. nach einem BLOCK): hoher physischer Schaden und 2 Sekunden Betäubung.',
        sfx: 'cleave',
    },
    {
        id: 'usp_bastion_burst', icon: '🏰', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'block',
        behavior: 'nova', dmg: [8, 11], manaCost: 28, cooldownSeconds: 6, castTimeSeconds: 0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Bastion Burst', nameDE: 'Bastionswelle',
        descEn: 'REACTION (5s after a BLOCK): shockwave hits every enemy in reach and staggers for 1.2 seconds.',
        descDE: 'REAKTION (5 Sek. nach einem BLOCK): Schockwelle trifft alle Gegner in Reichweite und betäubt 1,2 Sekunden.',
        sfx: 'cleave',
    },
    {
        id: 'usp_phantom_strike', icon: '👤', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'dodge',
        behavior: 'single', dmg: [18, 23], manaCost: 24, cooldownSeconds: 4, castTimeSeconds: 0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Phantom Strike', nameDE: 'Phantomhieb',
        descEn: 'REACTION (4s after a DODGE): afterimage strike for heavy physical damage.',
        descDE: 'REAKTION (4 Sek. nach einem AUSWEICHEN): Nachbild-Hieb mit hohem physischem Schaden.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_flicker_slash', icon: '🌗', theme: 'blade', element: 'physical', damageKind: 'physical', reaction: 'dodge',
        behavior: 'nova', dmg: [3, 5], manaCost: 24, cooldownSeconds: 5, castTimeSeconds: 0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Flicker Slash', nameDE: 'Flackerschnitt',
        descEn: 'REACTION (4s after a DODGE): slashes every enemy in front of you 3 times.',
        descDE: 'REAKTION (4 Sek. nach einem AUSWEICHEN): trifft alle Gegner vor dir 3-mal.',
        sfx: 'cleave',
    },

    // ── ARROWS (ranger shots - arrow-flight visuals) ────────────────────
    {
        id: 'usp_aimed_shot', icon: '🎯', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [19, 24], manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 2.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Deadeye Shot', nameDE: 'Meisterschuss',
        descEn: 'A perfectly aimed arrow. Massive single-target physical damage.',
        descDE: 'Ein perfekt gezielter Pfeil. Enormer physischer Schaden auf ein Ziel.',
        sfx: 'precisionMark',
    },
    {
        id: 'usp_multi_shot', icon: '🏹', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [5, 8], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area', 'projectile'],
        nameEn: 'Arrow Fan', nameDE: 'Pfeilfächer',
        descEn: 'A fan of arrows toward the cursor hits every enemy inside the cone.',
        descDE: 'Ein Pfeilfächer zum Cursor trifft alle Gegner im Kegel.',
        sfx: 'precisionMark',
    },
    {
        id: 'usp_barrage', icon: '➶', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Arrow Burst', nameDE: 'Pfeilsalve',
        descEn: '5 arrows in rapid succession at the target.',
        descDE: '5 Pfeile in schneller Folge auf das Ziel.',
        sfx: 'fieldScan',
    },
    {
        id: 'usp_arrow_volley', icon: '🌧️', theme: 'arrow', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [4, 6], ticks: 4, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Area', 'Damage over Time'], scalingTags: ['spell', 'physical', 'area', 'dot'],
        nameEn: 'Skyfall Arrows', nameDE: 'Himmelspfeile',
        descEn: 'Arrows fall on the aimed square for 4 seconds, hitting every enemy inside each second.',
        descDE: 'Pfeile fallen 4 Sekunden auf das Zielfeld und treffen jede Sekunde alle Gegner darin.',
        sfx: 'fieldScan',
    },
    {
        id: 'usp_serpent_sting', icon: '🧪', theme: 'arrow', element: 'lightning', damageKind: 'lightning',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [2, 4], ticks: 4, manaCost: 34, cooldownSeconds: 14, castTimeSeconds: 0.7,
        tags: ['Spell', 'Lightning', 'Damage over Time'], scalingTags: ['spell', 'lightning', 'dot', 'projectile'],
        nameEn: 'Poison Arrow', nameDE: 'Giftpfeil',
        descEn: 'Instant lightning damage, then poison for 4 seconds.',
        descDE: 'Sofortiger Blitzschaden, danach 4 Sekunden Gift.',
        sfx: 'syla_nature',
    },
    {
        id: 'usp_explosive_shot', icon: '🧨', theme: 'arrow', element: 'fire', damageKind: 'fire',
        behavior: 'single', dmg: [20, 27], manaCost: 53, cooldownSeconds: 24, castTimeSeconds: 1.6,
        tags: ['Spell', 'Fire', 'Projectile'], scalingTags: ['spell', 'fire', 'projectile'],
        nameEn: 'Bomb Arrow', nameDE: 'Bombenpfeil',
        descEn: 'An arrow with a bomb: massive fire damage on impact.',
        descDE: 'Ein Pfeil mit Bombe: enormer Feuerschaden beim Aufprall.',
        sfx: 'drifterExplosion',
    },

    // ── FIRE SCHOOL ─────────────────────────────────────────────
    {
        id: 'usp_firestorm', icon: '🌋', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 5, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Fire', 'Area', 'Damage over Time'], scalingTags: ['spell', 'fire', 'area', 'dot'],
        nameEn: 'Inferno Swirl', nameDE: 'Feuerwirbel',
        descEn: 'A fire whirlwind burns the aimed area for 5 seconds, hitting every enemy inside each second.',
        descDE: 'Ein Feuerwirbel brennt 5 Sekunden im Zielgebiet und trifft jede Sekunde alle Gegner darin.',
        sfx: 'drifterExplosion',
    },
    {
        id: 'usp_flameblast', icon: '💣', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'delayed', dmg: [8, 11], delayMs: 350, hitsAll: true, manaCost: 49, cooldownSeconds: 22, castTimeSeconds: 1.4,
        tags: ['Spell', 'Fire', 'Area'], scalingTags: ['spell', 'fire', 'area'],
        nameEn: 'Pyre Blast', nameDE: 'Feuersbrunst',
        descEn: 'Charges a blast that detonates on every enemy after a delay.',
        descDE: 'Lädt eine Explosion auf, die nach einer Verzögerung bei allen Gegnern zündet.',
        sfx: 'dofBurn',
    },
    {
        id: 'usp_incinerate', icon: '🌡️', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'volley', dmg: [3, 5], count: 4, volleyDelayMs: 200, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Fire', 'Channel'], scalingTags: ['spell', 'fire', 'channel'],
        nameEn: 'Fire Torrent', nameDE: 'Feuerstrom',
        descEn: 'Channelled: 4 waves of fire wash over the target.',
        descDE: 'Kanalisiert: 4 Feuerwellen überrollen das Ziel.',
        sfx: 'dofBurn',
    },

    // ── COLD SCHOOL ─────────────────────────────────────────────
    {
        id: 'usp_freezing_pulse', icon: '🌊', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'volley', dmg: [4, 5], count: 3, manaCost: 29, cooldownSeconds: 11, castTimeSeconds: 0.6,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Chill Wave', nameDE: 'Kältewelle',
        descEn: '3 pulses of cold hit the target.',
        descDE: '3 Kälteimpulse treffen das Ziel.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_ice_spear', icon: '🔱', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'single', dmg: [16, 20], manaCost: 44, cooldownSeconds: 16, castTimeSeconds: 1.4,
        tags: ['Spell', 'Cold', 'Projectile'], scalingTags: ['spell', 'cold', 'projectile'],
        nameEn: 'Hoarfrost Javelin', nameDE: 'Reifspeer',
        descEn: 'A huge, precise ice shard. Devastating single-target cold damage.',
        descDE: 'Ein riesiger, präziser Eissplitter. Verheerender Kälteschaden auf ein Ziel.',
        sfx: 'absoluteZero',
    },
    {
        id: 'usp_vortex', icon: '🌀', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'ticks', dmg: [5, 7], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.0,
        tags: ['Spell', 'Cold', 'Area', 'Damage over Time'], scalingTags: ['spell', 'cold', 'area', 'dot'],
        nameEn: 'Frost Whirl', nameDE: 'Frostwirbel',
        descEn: 'Frost detonates on every enemy, then freezing ground burns for 3 seconds.',
        descDE: 'Frost explodiert bei allen Gegnern, danach brennt der gefrorene Boden 3 Sekunden.',
        sfx: 'time_freeze',
    },
    {
        id: 'usp_cold_snap', icon: '🥶', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'nova', dmg: [7, 10], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Cold', 'Area'], scalingTags: ['spell', 'cold', 'area'],
        nameEn: 'Glacial Crack', nameDE: 'Eisbruch',
        descEn: 'A burst of absolute cold hits every enemy.',
        descDE: 'Ein Stoß absoluter Kälte trifft alle Gegner.',
        sfx: 'time_freeze',
    },

    // ── LIGHTNING SCHOOL ────────────────────────────────────────
    {
        id: 'usp_spark', icon: '🎇', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'wild', dmg: [3, 5], count: 6, volleyDelayMs: 150, manaCost: 42, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Stray Sparks', nameDE: 'Streufunken',
        descEn: '6 sparks bounce into random enemies.',
        descDE: '6 Funken prallen auf zufällige Gegner.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_arc', icon: '🔗', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'chain', dmg: [10, 13], chainFalloff: 0.8, chainMax: 5, manaCost: 47, cooldownSeconds: 20, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Chaining'], scalingTags: ['spell', 'lightning', 'chain'],
        nameEn: 'Jolt Chain', nameDE: 'Zuckkette',
        descEn: 'Lightning chains across up to 5 enemies, barely weakening.',
        descDE: 'Blitz springt auf bis zu 5 Gegner und wird kaum schwächer.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_storm_call', icon: '⛈️', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'delayed', dmg: [7, 9], delayMs: 1000, hitsAll: true, manaCost: 47, cooldownSeconds: 20, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Area'], scalingTags: ['spell', 'lightning', 'area'],
        nameEn: 'Thunder Mark', nameDE: 'Donnermal',
        descEn: 'Marks every enemy; lightning strikes them all after a delay.',
        descDE: 'Markiert alle Gegner; nach einer Verzögerung schlägt der Blitz bei allen ein.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_ball_lightning', icon: '🔵', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [12, 20], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Storm Sphere', nameDE: 'Sturmkugel',
        descEn: 'A slow ball of lightning drifts onto the target. 25% chance to Shock. Faster with Projectile Speed.',
        descDE: 'Eine langsame Blitzkugel treibt zum Ziel. 25% Chance zu schocken. Schneller mit Projektilgeschwindigkeit.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_crackling_lance', icon: '🦯', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 14, castTimeSeconds: 1.2,
        tags: ['Spell', 'Lightning', 'Projectile'], scalingTags: ['spell', 'lightning', 'projectile'],
        nameEn: 'Voltage Spear', nameDE: 'Voltspeer',
        descEn: 'A piercing lance along a line to the cursor. Heavy lightning damage to every enemy on it.',
        descDE: 'Eine durchdringende Lanze entlang einer Linie zum Cursor. Hoher Blitzschaden an allen Gegnern darauf.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_orb_of_storms', icon: '🌐', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'ticks', dmg: [4, 5], tickDmg: [3, 5], ticks: 3, manaCost: 36, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Lightning', 'Damage over Time'], scalingTags: ['spell', 'lightning', 'dot'],
        nameEn: 'Tempest Halo', nameDE: 'Sturmhalo',
        descEn: 'Toggle: a storm halo zaps every enemy in reach each second. Drains mana while active.',
        descDE: 'Umschalten: Ein Sturmhalo trifft jede Sekunde alle Gegner in Reichweite. Verbraucht Mana, solange aktiv.',
        sfx: 'gust_thunder',
    },
    {
        id: 'usp_discharge', icon: '💥', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'nova', dmg: [10, 13], manaCost: 48, cooldownSeconds: 24, castTimeSeconds: 1.6, perTarget: true,
        tags: ['Spell', 'Lightning', 'Area'], scalingTags: ['spell', 'lightning', 'area'],
        nameEn: 'Surge Release', nameDE: 'Stromstoß',
        descEn: 'Releases all stored power in one blast on every enemy.',
        descDE: 'Setzt die gesamte gespeicherte Kraft in einer Explosion bei allen Gegnern frei.',
        sfx: 'gust_thunder',
    },

    // ── SHADOW & CHAOS SCHOOL ───────────────────────────────────
    {
        id: 'usp_contagion', icon: '🤢', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 4], tickDmg: [2, 4], ticks: 5, hitsAll: true, manaCost: 42, cooldownSeconds: 20, castTimeSeconds: 0.9,
        tags: ['Spell', 'Shadow', 'Area', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'area', 'dot'],
        nameEn: 'Plague Seed', nameDE: 'Seuchensaat',
        descEn: 'A plague spreads to every enemy and festers for 5 seconds.',
        descDE: 'Eine Seuche befällt alle Gegner und wütet 5 Sekunden.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_bane', icon: '🌑', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'nova', dmg: [7, 9], manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Shadow', 'Area'], scalingTags: ['spell', 'shadow', 'area'],
        nameEn: 'Dread Wave', nameDE: 'Schreckenswelle',
        descEn: 'A wave of dread hits every enemy.',
        descDE: 'Eine Welle des Schreckens trifft alle Gegner.',
        sfx: 'bayesTrapExplosion',
    },
    {
        id: 'usp_soulrend', icon: '👻', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'volley', dmg: [4, 5], count: 4, volleyDelayMs: 200, manaCost: 42, cooldownSeconds: 18, castTimeSeconds: 1.0,
        tags: ['Spell', 'Shadow', 'Projectile'], scalingTags: ['spell', 'shadow', 'projectile'],
        nameEn: 'Soul Shred', nameDE: 'Seelenfetzen',
        descEn: 'Channelled: tears 4 shreds from the target\'s soul, leeching life.',
        descDE: 'Kanalisiert: reißt 4 Fetzen aus der Seele des Ziels und entzieht Leben.',
        sfx: 'demon_eye',
    },
    {
        id: 'usp_blight', icon: '☣️', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'ticks', dmg: [3, 5], tickDmg: [3, 5], ticks: 3, hitsAll: true, manaCost: 44, cooldownSeconds: 20, castTimeSeconds: 0.8,
        tags: ['Spell', 'Shadow', 'Area', 'Damage over Time'], scalingTags: ['spell', 'shadow', 'area', 'dot'],
        nameEn: 'Rot Cloud', nameDE: 'Fäulniswolke',
        descEn: 'Rotting decay eats every enemy for 3 seconds.',
        descDE: 'Fauliger Zerfall zersetzt alle Gegner 3 Sekunden lang.',
        sfx: 'bayesTrapExplosion',
    },

    // ── BLOOD & BLADES SCHOOL ───────────────────────────────────
    {
        id: 'usp_exsanguinate', icon: '🩸', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'single', dmg: [15, 19], manaCost: 42, cooldownSeconds: 8, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Blood Cascade', nameDE: 'Blutkaskade',
        descEn: 'Rips blood from whatever is in melee range. A physical SPELL, not a strike.',
        descDE: 'Entzieht allem in Nahkampfreichweite das Blut. Ein physischer ZAUBER, kein Hieb.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_reap', icon: '🌾', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'nova', dmg: [7, 9], manaCost: 42, cooldownSeconds: 9, castTimeSeconds: 1.0, perTarget: true,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Spectral Scythe', nameDE: 'Geistersense',
        descEn: 'A spectral scythe sweeps a wide arc and hits every enemy in it.',
        descDE: 'Eine Geistersense fegt im weiten Bogen und trifft alle Gegner darin.',
        sfx: 'cleave',
    },
    {
        id: 'usp_ethereal_knives', icon: '🔪', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'volley', dmg: [3, 5], count: 5, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 1.0,
        tags: ['Spell', 'Physical', 'Projectile'], scalingTags: ['spell', 'physical', 'projectile'],
        nameEn: 'Spirit Daggers', nameDE: 'Geisterdolche',
        descEn: '5 spirit daggers slice through the target.',
        descDE: '5 Geisterdolche durchtrennen das Ziel.',
        sfx: 'diagonalStrike',
    },
    {
        id: 'usp_bladefall', icon: '🗡️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'starfall', dmg: [3, 5], count: 6, manaCost: 47, cooldownSeconds: 22, castTimeSeconds: 1.2,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Blade Downpour', nameDE: 'Klingenschauer',
        descEn: 'Aim a square: 6 blades rain onto the enemies inside.',
        descDE: 'Ziele ein Feld an: 6 Klingen regnen auf die Gegner darin.',
        sfx: 'cleave',
    },
    {
        id: 'usp_blade_vortex', icon: '🪃', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'ticks', dmg: [5, 6], tickDmg: [4, 5], ticks: 3, manaCost: 39, cooldownSeconds: 16, castTimeSeconds: 0.8,
        tags: ['Spell', 'Physical', 'Damage over Time'], scalingTags: ['spell', 'physical', 'dot'],
        nameEn: 'Orbiting Blades', nameDE: 'Kreisende Klingen',
        descEn: 'Spirit blades orbit you and hit every enemy in reach, then 3 more times.',
        descDE: 'Geisterklingen kreisen um dich und treffen alle Gegner in Reichweite, danach noch 3-mal.',
        sfx: 'cleave',
    },
    {
        id: 'usp_blade_blast', icon: '✴️', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'delayed', dmg: [19, 24], delayMs: 800, manaCost: 51, cooldownSeconds: 22, castTimeSeconds: 1.6,
        tags: ['Spell', 'Physical', 'Area'], scalingTags: ['spell', 'physical', 'area'],
        nameEn: 'Detonating Blade', nameDE: 'Sprengklinge',
        descEn: 'A bomb-lashed blade sticks in the aimed spot and detonates after a delay, hitting every enemy in the square.',
        descDE: 'Eine bombenbestückte Klinge steckt im Zielort und explodiert nach einer Verzögerung. Trifft alle Gegner im Feld.',
        sfx: 'drifterExplosion',
    },

    // ── SUPPORT (defensive self-casts) ──────────────────────────────────
    // No monster target required - these cast on YOU (see the SUPPORT
    // SPELLS section below for how their magnitudes are derived). They are
    // deliberately the only spells in the arsenal that ignore the
    // target check, and they still need a live encounter to be worth
    // casting (and to be castable at all).
    {
        id: 'usp_mend_wounds', icon: '🩹', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'heal', selfCast: true, manaCost: 26, cooldownSeconds: 25,
        healFlat: 28, healPct: 10,
        tags: ['Spell', 'Holy', 'Support', 'Heal'], scalingTags: ['spell', 'holy', 'support', 'heal'],
        nameEn: 'Mend Wounds', nameDE: 'Wunden schließen',
        descEn: 'Instantly restores Life: a flat part that grows with rank plus a share of max Life.',
        descDE: 'Stellt sofort Leben wieder her: ein fester Anteil, der mit dem Rang wächst, plus ein Teil des maximalen Lebens.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_renewal', icon: '🌿', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'hot', selfCast: true, manaCost: 22, cooldownSeconds: 22,
        healTickFlat: 6, healTickPct: 2, ticks: 6, tickMs: 1000,
        tags: ['Spell', 'Lightning', 'Support', 'Heal over Time'], scalingTags: ['spell', 'lightning', 'support', 'heal'],
        nameEn: 'Verdant Bloom', nameDE: 'Blütenheilung',
        descEn: 'Heals you once per second for 6 seconds. Cast it before the hit.',
        descDE: 'Heilt dich 6 Sekunden lang jede Sekunde. Wirke es vor dem Treffer.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_barrier', icon: '🔷', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'shield', selfCast: true, manaCost: 31, cooldownSeconds: 28,
        absorbFlat: 26, absorbPct: 45,
        tags: ['Spell', 'Arcane', 'Support', 'Shield'], scalingTags: ['spell', 'arcane', 'support', 'shield'],
        nameEn: 'Barrier', nameDE: 'Barriere',
        descEn: 'Spends mana to refill your absorption shield instantly.',
        descDE: 'Verbraucht Mana, um dein Absorptionsschild sofort aufzufüllen.',
        sfx: 'player_shield_damage_taken',
    },
    {
        id: 'usp_bulwark', icon: '🛡️', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'guard', selfCast: true, manaCost: 26, cooldownSeconds: 30, buffSeconds: 8,
        drPct: 18, drPctPerRank: 1.5, drPctCap: 32,
        armourPct: 40, armourPctPerRank: 4, armourPctCap: 76,
        tags: ['Spell', 'Holy', 'Support', 'Buff'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Bulwark', nameDE: 'Bollwerk',
        descEn: 'A stone ring circles you for 8 seconds: greatly increased Armour and reduced damage taken.',
        descDE: 'Ein Steinring umkreist dich 8 Sekunden: stark erhöhte Rüstung und weniger erlittener Schaden.',
        sfx: 'player_shield_damage_taken',
    },
    {
        id: 'usp_windward', icon: '💨', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'evade', selfCast: true, manaCost: 22, cooldownSeconds: 28, buffSeconds: 8,
        dodgePct: 12, dodgePctPerRank: 1, dodgePctCap: 21,
        tags: ['Spell', 'Lightning', 'Support', 'Buff'], scalingTags: ['spell', 'lightning', 'support'],
        nameEn: 'Windward', nameDE: 'Windwärts',
        descEn: 'A flat chance to dodge physical attacks outright.',
        descDE: 'Eine feste Chance, physischen Angriffen vollständig auszuweichen.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_aegis_ward', icon: '✨', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'ward', selfCast: true, manaCost: 38, cooldownSeconds: 40, buffSeconds: 12,
        wardCharges: 2, wardChargesPerRank: 0.34, wardChargesCap: 5,
        tags: ['Spell', 'Holy', 'Support', 'Buff'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Aegis Ward', nameDE: 'Ägis-Schutz',
        descEn: 'Negates the next hits entirely, boss specials included. Only hits of at least 5% max Life use a charge.',
        descDE: 'Negiert die nächsten Treffer vollständig, auch Boss-Spezialangriffe. Nur Treffer ab 5% des maximalen Lebens verbrauchen eine Ladung.',
        sfx: 'varianceShield',
    },
    {
        id: 'usp_retribution', icon: '🔥', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'thorns', selfCast: true, manaCost: 29, cooldownSeconds: 32, buffSeconds: 10,
        thornsPct: 25, thornsPctPerRank: 3, thornsPctCap: 52,
        tags: ['Spell', 'Fire', 'Support', 'Buff'], scalingTags: ['spell', 'fire', 'support'],
        nameEn: 'Reprisal Flame', nameDE: 'Racheflamme',
        descEn: 'For 10 seconds, monsters that hit you take back a share of the damage they dealt.',
        descDE: '10 Sekunden lang erleiden Monster, die dich treffen, einen Teil des verursachten Schadens zurück.',
        sfx: 'dofBurn',
    },

    // ── CLEANSE (remove ailments you currently suffer) ───────────────────
    // A spell removes its ailments only when the monster that inflicted them
    // was within reach of the charm rank (see USP_CLEANSE_MAX_LEVEL_BY_RANK).
    {
        id: 'usp_staunch', icon: '🩸', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'cleanse', selfCast: true, manaCost: 14, cooldownSeconds: 10,
        cleanses: ['bleed'], cleanseNameEn: 'Bleeding', cleanseNameDe: 'Blutung',
        tags: ['Spell', 'Holy', 'Support', 'Cleanse'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Staunch', nameDE: 'Blutstillung',
        descEn: 'Stops bleeding. Only cleanses ailments from monsters up to your charm rank\'s level.',
        descDE: 'Stoppt Blutungen. Entfernt nur Leiden von Monstern bis zur Stufe deines Zauberrangs.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_antidote', icon: '🧪', theme: 'shadow', element: 'shadow', damageKind: 'shadow',
        behavior: 'cleanse', selfCast: true, manaCost: 14, cooldownSeconds: 10,
        cleanses: ['poison'], cleanseNameEn: 'Poison', cleanseNameDe: 'Gift',
        tags: ['Spell', 'Holy', 'Support', 'Cleanse'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Antidote', nameDE: 'Gegengift',
        descEn: 'Purges poison. Only cleanses ailments from monsters up to your charm rank\'s level.',
        descDE: 'Entfernt Gift. Entfernt nur Leiden von Monstern bis zur Stufe deines Zauberrangs.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_quench', icon: '💧', theme: 'frost', element: 'cold', damageKind: 'cold',
        behavior: 'cleanse', selfCast: true, manaCost: 14, cooldownSeconds: 10,
        cleanses: ['ignite', 'shadowburn'], cleanseNameEn: 'Burning', cleanseNameDe: 'Brennen',
        tags: ['Spell', 'Holy', 'Support', 'Cleanse'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Quench', nameDE: 'Löschen',
        descEn: 'Douses the flames on you. Only cleanses ailments from monsters up to your charm rank\'s level.',
        descDE: 'Löscht die Flammen auf dir. Entfernt nur Leiden von Monstern bis zur Stufe deines Zauberrangs.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_thaw', icon: '🔆', theme: 'fire', element: 'fire', damageKind: 'fire',
        behavior: 'cleanse', selfCast: true, manaCost: 14, cooldownSeconds: 10,
        cleanses: ['chill', 'frozen'], cleanseNameEn: 'Chill and Freeze', cleanseNameDe: 'Kälte und Frost',
        tags: ['Spell', 'Holy', 'Support', 'Cleanse'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Thaw', nameDE: 'Auftauen',
        descEn: 'Melts the ice on you. Only cleanses ailments from monsters up to your charm rank\'s level.',
        descDE: 'Taut das Eis auf dir auf. Entfernt nur Leiden von Monstern bis zur Stufe deines Zauberrangs.',
        sfx: 'heart_heals',
    },
    {
        id: 'usp_purify', icon: '✨', theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'cleanse', selfCast: true, manaCost: 14, cooldownSeconds: 10,
        cleanses: ['shocked', 'shadow', 'blind', 'confused', 'polymorph'], cleanseNameEn: 'Shock, Blindness, Confusion and Polymorph', cleanseNameDe: 'Schock, Blindheit, Verwirrung und Verwandlung',
        tags: ['Spell', 'Holy', 'Support', 'Cleanse'], scalingTags: ['spell', 'holy', 'support'],
        nameEn: 'Purify', nameDE: 'Läuterung',
        descEn: 'Removes shock, shadow blindness, confusion and polymorph. Only cleanses ailments from monsters up to your charm rank\'s level.',
        descDE: 'Entfernt Schock, Schattenblindheit, Verwirrung und Verwandlung. Entfernt nur Leiden von Monstern bis zur Stufe deines Zauberrangs.',
        sfx: 'heart_heals',
    },

    // ── GAUNTLET (arena-only self-cast) ────────────────────────────────────
    // Gauntlet arenas have no puzzle grid, so reveal-projectile builds have
    // nothing to reveal there. This conjures temporary reveal cells in the
    // arena that fire the normal reveal-projectile volley. It never touches a
    // real puzzle: it cannot be cast outside an arena and the cells are pure
    // arena decoration that vanish right after they fire. Rank = cell count.
    {
        id: 'usp_gauntlet_reveal', icon: '🔎', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'gauntlet_reveal', selfCast: true, manaCost: 8, cooldownSeconds: 15,
        gauntletOnly: true,
        tags: ['Spell', 'Arcane', 'Support', 'Gauntlet'], scalingTags: ['spell', 'arcane', 'support'],
        nameEn: 'Summon Reveal Cells', nameDE: 'Aufdeckzellen beschwören',
        descEn: 'Gauntlet only. Conjures reveal cells (one per charm rank) that each fire a reveal projectile at your target. Higher rank costs more mana.',
        descDE: 'Nur Gauntlet. Beschwört Aufdeckzellen (eine pro Zauberrang), die je ein Aufdeck-Projektil auf dein Ziel feuern. Höherer Rang kostet mehr Mana.',
        sfx: 'arcaneReveal',
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
        id: 'usp_blink', icon: '🌀', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'blink', selfCast: true, manaCost: 34, cooldownSeconds: 18,
        // Charge pool instead of a single cooldown: each cast spends one
        // charge, spent charges recharge individually and in parallel (see
        // CHARGE-BASED COOLDOWNS below). cooldownSeconds is kept as the
        // historical reference value; the runtime reads the charge fields.
        chargeMax: 3, chargeRechargeSeconds: 18,
        moveBasePx: 220, movePxPerRank: 20, movePxCap: 400,
        tags: ['Spell', 'Arcane', 'Movement', 'Teleport'], scalingTags: ['spell', 'arcane', 'movement'],
        nameEn: 'Blink', nameDE: 'Blinzeln',
        descEn: 'Instantly teleports you to the cursor, up to its range. Nothing on the path can touch you.',
        descDE: 'Teleportiert dich sofort zum Cursor, bis zur Reichweite. Nichts auf dem Weg kann dich treffen.',
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
        descEn: 'A short burst of speed towards the cursor. You still travel, so anything in the way still hits you.',
        descDE: 'Ein kurzer Geschwindigkeitsschub zum Cursor. Du läufst wirklich, Hindernisse treffen dich weiterhin.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_disengage', icon: '🦘', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'disengage', selfCast: true, manaCost: 22, cooldownSeconds: 16, glideMs: 300,
        buffSeconds: 3, speedPct: 35, speedPctPerRank: 3, speedPctCap: 65,
        moveBasePx: 190, movePxPerRank: 14, movePxCap: 320,
        tags: ['Spell', 'Physical', 'Movement', 'Leap'], scalingTags: ['spell', 'physical', 'movement'],
        nameEn: 'Evasive Leap', nameDE: 'Rückzugssprung',
        descEn: 'Leaps away from the cursor with a short speed boost. Creates distance even with a boss between you and the exit.',
        descDE: 'Springt vom Cursor weg mit kurzem Geschwindigkeitsschub. Schafft Abstand, auch wenn ein Boss zwischen dir und dem Ausgang steht.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_leap_strike', icon: '🤸', theme: 'blade', element: 'physical', damageKind: 'physical',
        behavior: 'leap', selfCast: true, dmg: [6, 9], manaCost: 24, cooldownSeconds: 14, castTimeSeconds: 0, glideMs: 460,
        moveBasePx: 420, movePxPerRank: 25, movePxCap: 600, stagger: 700,
        tags: ['Spell', 'Physical', 'Movement', 'Leap'], scalingTags: ['spell', 'physical', 'movement'],
        nameEn: 'Leap Strike', nameDE: 'Sprungschlag',
        descEn: 'Vault onto the target with a stomp: modest physical damage and a brief stagger. Lands short if the target is too far.',
        descDE: 'Springt aufs Ziel und stampft: mäßiger physischer Schaden und kurze Betäubung. Landet zu kurz, wenn das Ziel zu weit ist.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_windstep', icon: '🪶', theme: 'lightning', element: 'lightning', damageKind: 'lightning',
        behavior: 'windstep', selfCast: true, manaCost: 19, cooldownSeconds: 20, buffSeconds: 6,
        speedPct: 30, speedPctPerRank: 3.5, speedPctCap: 62,
        tags: ['Spell', 'Lightning', 'Movement', 'Buff'], scalingTags: ['spell', 'lightning', 'movement'],
        nameEn: 'Windstep', nameDE: 'Windschritt',
        descEn: 'Faster movement for 6 seconds.',
        descDE: '6 Sekunden schnellere Bewegung.',
        sfx: 'classSelected',
    },
    {
        id: 'usp_rift_anchor', icon: '📍', theme: 'arcane', element: 'shadow', damageKind: 'shadow',
        behavior: 'anchor', selfCast: true, manaCost: 17, cooldownSeconds: 26,
        anchorSeconds: 15, anchorPlaceCooldownSeconds: 3,
        tags: ['Spell', 'Arcane', 'Movement', 'Recall'], scalingTags: ['spell', 'arcane', 'movement'],
        nameEn: 'Rift Anchor', nameDE: 'Spaltanker',
        descEn: 'Cast once to plant an anchor (lasts 15 seconds), cast again to return to it from anywhere.',
        descDE: 'Einmal wirken setzt einen Anker (hält 15 Sekunden), erneut wirken bringt dich von überall dorthin zurück.',
        sfx: 'classSelected',
    },
];

export const UNIVERSAL_SPELL_MAP = {};
UNIVERSAL_SPELL_DEFS.forEach((d) => { UNIVERSAL_SPELL_MAP[d.id] = d; });

//------------------------------------------------------------------------
//---------------------------CAST KIND TABLE------------------------------
//------------------------------------------------------------------------
// Everything not listed here keeps hold-to-cast (its castTimeSeconds above).
// Sizes are "design px" (a 1366x768 window) and scale with the viewport -
// see resolveGroundShape() in spell-targeting.js.
//
// Why these: INSTANT is the cheap, fast-cooldown bread-and-butter bolts and
// the damage-over-time applications (a quick DoT you can weave in). GROUND is
// the "place it" family - delayed impacts, storms / fields and the lines /
// cones whose value is in where you aim. HOLD stays on the heavy single hits
// and the all-enemy novas, where the cast bar is the price of the power.
const USP_INSTANT_SPELLS = [
    'usp_frostbolt', 'usp_ice_lance', 'usp_shadow_bolt', 'usp_lightning_bolt',
    'usp_wrath', 'usp_smite',
    'usp_corruption', 'usp_shadow_word_pain', 'usp_serpent_sting',
    'usp_immolate', 'usp_holy_fire',
];

const USP_GROUND_SPELLS = {
    // Delayed impacts: telegraph at the spot, strike after delayMs.
    usp_meteor:         { kind: 'circle', radius: 115 },
    usp_blade_blast:    { kind: 'square', radius: 100 },
    // Aimed skyfall: the reticle picks the square, then the counted
    // blades crash from above onto the enemies inside it (Bladefall).
    usp_bladefall:      { kind: 'square', radius: 120 },
    // Fields: damage everything inside once a second while the zone lasts.
    usp_blizzard:       { kind: 'circle', radius: 150 },
    usp_rain_of_fire:   { kind: 'circle', radius: 135 },
    usp_firestorm:       { kind: 'circle', radius: 120 },
    usp_arrow_volley:   { kind: 'square', radius: 140 },
    // Cones from the caster towards the cursor.
    usp_cone_of_cold:   { kind: 'cone', length: 420, angle: 70 },
    usp_multi_shot:     { kind: 'cone', length: 460, angle: 55 },
    // Beams from the caster through the cursor: pierce everything on the line.
    usp_crackling_lance: { kind: 'beam', length: 620, width: 64 },
};

// MELEE: the effect is played beside the player and the area is checked for
// victims (spell pass 1). reach is px from the caster (viewport-scaled like
// ground shapes). `all` hits everything inside; without it only ONE victim
// takes the hit - the selected monster when it is inside, else the nearest.
// Cast times are untouched (instant stays instant, hold stays hold).
const USP_MELEE_SPELLS = {
    usp_heroic_strike: { kind: 'cone', reach: 210, angle: 80 },
    usp_mortal_strike: { kind: 'cone', reach: 230, angle: 80 },
    usp_execute:       { kind: 'cone', reach: 240, angle: 60 },
    usp_rend:          { kind: 'cone', reach: 210, angle: 70 },
    usp_exsanguinate:  { kind: 'cone', reach: 220, angle: 70, noWeapon: true },
    usp_cleave:        { kind: 'cone', reach: 250, angle: 110, all: true },
    usp_reap:          { kind: 'cone', reach: 280, angle: 150, all: true },
    usp_whirlwind:     { kind: 'circle', reach: 230, all: true },
    // More melee. hits = rapid repeat strikes, hitDelayMs = gap between them,
    // stagger = ms the victims' attack charge freezes, healPct = % max Life
    // restored when the swing connects.
    usp_crushing_blow:   { kind: 'cone', reach: 220, angle: 70, stagger: 1500 },
    usp_blade_flurry:    { kind: 'cone', reach: 215, angle: 60, hits: 4, hitDelayMs: 110 },
    usp_piercing_lunge:  { kind: 'cone', reach: 330, angle: 24, all: true },
    usp_seismic_slam:    { kind: 'circle', reach: 215, all: true, stagger: 1200 },
    usp_vampiric_strike: { kind: 'cone', reach: 215, angle: 70, healPct: 6 },
    // Reaction strikes (def.reaction): only castable right after the matching
    // parry / block / dodge.
    usp_counterstrike:   { kind: 'cone', reach: 240, angle: 60, stagger: 1000 },
    usp_blade_dance:     { kind: 'circle', reach: 225, all: true, hits: 3, hitDelayMs: 170 },
    usp_shield_slam:     { kind: 'cone', reach: 210, angle: 70, stagger: 2000 },
    usp_bastion_burst:   { kind: 'circle', reach: 235, all: true, stagger: 1200 },
    usp_phantom_strike:  { kind: 'cone', reach: 260, angle: 50 },
    usp_flicker_slash:   { kind: 'cone', reach: 250, angle: 100, all: true, hits: 3, hitDelayMs: 130 },
};

// CHANNEL: hold the button and the spell keeps firing every tickSeconds, each
// tick draining manaCost x tickSeconds mana (manaCost is mana PER SECOND for
// these). It stops on release, when the mana runs out or when nothing is left
// to hit; the cooldown starts when the channel ends. dmg is damage PER TICK.
const USP_CHANNEL_SPELLS = {
    usp_arcane_missiles: {
        tickSeconds: 0.5, dmg: [2, 4], manaCost: 6, cooldownSeconds: 6,
        descEn: 'Hold the button to channel a stream of arcane missiles at your target, one every half second, for as long as you keep holding and have mana to pay for it. Release to stop.',
        descDE: 'Halte die Taste, um einen Strom arkaner Geschosse auf dein Ziel zu lenken, alle halbe Sekunde eines, solange du hältst und Mana dafür hast. Loslassen beendet den Zauber.',
    },
    usp_disintegrate: {
        tickSeconds: 0.5, dmg: [3, 5], manaCost: 7, cooldownSeconds: 8,
        // The longer the beam is held, the hungrier it gets: the per-tick cost
        // grows by this much of the base cost per second held, up to the cap.
        costRampPerSecond: 0.6, costRampMax: 8,
        descEn: 'Hold the button to focus a beam of disintegrating energy on your target. It strikes every half second and drains mana the whole time - and the longer you hold, the more mana it drains each second. Release to stop.',
        descDE: 'Halte die Taste, um einen Strahl zersetzender Energie auf dein Ziel zu bündeln. Er trifft alle halbe Sekunde und zieht die ganze Zeit Mana ab - je länger du hältst, desto mehr Mana kostet jede Sekunde. Loslassen beendet den Zauber.',
    },
    usp_incinerate: {
        tickSeconds: 0.4, dmg: [2, 4], manaCost: 7, cooldownSeconds: 8,
        descEn: 'Hold the button to spray a flamethrower stream of fire at your target: rapid fire damage for as long as you hold and can pay for it. Release to stop.',
        descDE: 'Halte die Taste, um einen flammenwerferartigen Feuerstrahl auf dein Ziel zu sprühen: schneller Feuerschaden, solange du hältst und zahlen kannst. Loslassen beendet den Zauber.',
    },
    usp_soulrend: {
        tickSeconds: 0.5, dmg: [3, 4], manaCost: 6, cooldownSeconds: 7,
        descEn: 'Hold the button to rend your target\'s soul: a steady drain of shadow damage every half second while you channel. Release to stop.',
        descDE: 'Halte die Taste, um die Seele deines Ziels zu zerreißen: ein stetiger Schattenschaden alle halbe Sekunde, solange du kanalisierst. Loslassen beendet den Zauber.',
    },
};

// CHARGE: hold to build power, release at any time to fire. A quick tap fires
// a weak shot (minPower), a full charge fires maxPower - same mana either
// way. Releasing before minFrac of the bar is filled cancels for free.
// The full-charge time is the def's castTimeSeconds (so cast speed applies).
const USP_CHARGE_SPELLS = {
    usp_aimed_shot: {
        descEn: 'Hold the button to draw the bow and release to loose the arrow. The longer you hold, the harder it hits: a quick snap shot does about 60% damage, a full draw 150%.',
        descDE: 'Halte die Taste, um den Bogen zu spannen, und lasse los, um den Pfeil zu schießen. Je länger du hältst, desto härter trifft er: ein schneller Schuss macht etwa 60 % Schaden, ein voll gespannter Bogen 150 %.',
    },
    usp_ice_spear: {
        descEn: 'Hold the button to condense a spear of ice and release to throw it. Longer charge means more damage: about 60% for a quick throw, 150% when fully charged.',
        descDE: 'Halte die Taste, um einen Eisspeer zu verdichten, und lasse los, um ihn zu werfen. Längeres Aufladen bedeutet mehr Schaden: etwa 60 % für einen schnellen Wurf, 150 % voll aufgeladen.',
    },
    usp_arcane_blast: {
        descEn: 'Hold the button to gather arcane power and release it as a blast. A short charge does about 60% damage, a full charge 150%.',
        descDE: 'Halte die Taste, um arkane Kraft zu sammeln, und entlade sie als Explosion. Kurzes Aufladen macht etwa 60 % Schaden, volles Aufladen 150 %.',
    },
    usp_pyroblast: {
        descEn: 'Hold the button to swell a huge ball of fire and release when you are ready. Charge it for up to 150% damage, or let it go early for about 60%.',
        descDE: 'Halte die Taste, um einen riesigen Feuerball anschwellen zu lassen, und lasse los, wenn du bereit bist. Voll aufgeladen macht er bis zu 150 % Schaden, früh losgelassen etwa 60 %.',
    },
    usp_flameblast: {
        descEn: 'Hold the button to grow a ring of flame around EVERY enemy - the longer you hold, the wider it gets. Release and the flames erupt inward from the outer edge, detonating everything inside. A quick release does about 60% damage, a full charge 150%.',
        descDE: 'Halte die Taste, um einen Flammenring um JEGLICHEN Gegner wachsen zu lassen - je länger, desto größer. Lass los und die Flammen schlagen vom äußeren Rand nach innen und detonieren alles darin. Schnelles Loslassen macht etwa 60 % Schaden, voll aufgeladen 150 %.',
    },
};

// TOGGLE: tap to switch an aura on, tap again to switch it off. While it is
// on it pulses every second (manaCost is mana PER SECOND), hitting every enemy
// within `radius` of the hero for dmg. It switches itself off when the mana
// runs out or the fight ends; the cooldown starts when it goes off.
const USP_TOGGLE_SPELLS = {
    usp_blade_vortex: {
        radius: 200, dmg: [2, 4], manaCost: 5, cooldownSeconds: 4,
        descEn: 'Tap to set blades spinning around you; they cut every enemy within reach once a second. Tap again to dismiss them. Drains mana for as long as they spin.',
        descDE: 'Tippe, um Klingen um dich kreisen zu lassen; sie schneiden jede Sekunde jeden Gegner in Reichweite. Tippe erneut, um sie zu beenden. Zieht Mana ab, solange sie kreisen.',
    },
    usp_orb_of_storms: {
        radius: 190, dmg: [2, 4], manaCost: 5, cooldownSeconds: 4,
        descEn: 'Tap to raise a storm aura around you that zaps every enemy within reach each second. Tap again to end it. Drains mana while it is active.',
        descDE: 'Tippe, um eine Sturmaura um dich zu errichten, die jede Sekunde jeden Gegner in Reichweite trifft. Tippe erneut, um sie zu beenden. Zieht Mana ab, solange sie aktiv ist.',
    },
    usp_vortex: {
        radius: 210, dmg: [2, 4], manaCost: 5, cooldownSeconds: 4,
        // Slower ramp than Disintegrate: the drain per second grows by this
        // share of the base cost per second the aura has been up, to the cap.
        costRampPerSecond: 0.25, costRampMax: 5,
        descEn: 'Tap to raise a freezing vortex around you that damages every enemy within reach each second. Tap again to end it. Drains mana while it is active - and the longer it stays up, the more mana it drains each second.',
        descDE: 'Tippe, um einen eisigen Wirbel um dich aufzuziehen, der jede Sekunde jeden Gegner in Reichweite verletzt. Tippe erneut, um ihn zu beenden. Zieht Mana ab, solange er aktiv ist - je länger er steht, desto mehr Mana kostet jede Sekunde.',
    },
    usp_consecration: {
        radius: 220, dmg: [2, 4], manaCost: 5, cooldownSeconds: 4,
        descEn: 'Tap to desecrate the ground around you; shadow consumes every enemy nearby each second. Tap again to end it. Drains mana while it is active.',
        descDE: 'Tippe, um den Boden um dich zu entweihen; Schatten verzehrt jede Sekunde jeden Gegner in der Nähe. Tippe erneut, um es zu beenden. Zieht Mana ab, solange es aktiv ist.',
    },
};

// Rewrites a def into one of the sustained kinds (see the three tables above).
function _uspConvertSustained(d, o, kind, tag) {
    ['count', 'volleyDelayMs', 'ticks', 'tickDmg', 'hitsAll', 'delayMs', 'perTarget'].forEach((k) => { delete d[k]; });
    d.castKind = kind;
    d.behavior = (kind === 'toggle') ? 'aura' : 'single';
    if (o.dmg) d.dmg = o.dmg.slice();
    if (o.manaCost) d.manaCost = o.manaCost;
    if (o.cooldownSeconds !== undefined) d.cooldownSeconds = o.cooldownSeconds;
    d.descEn = o.descEn;
    d.descDE = o.descDE;
    const stale = (kind === 'toggle') ? ['Damage over Time', 'Projectile'] : (kind === 'channel' ? ['Channel'] : []);
    d.tags = (d.tags || []).filter((x) => stale.indexOf(x) === -1).concat([tag]);
    d.scalingTags = (d.scalingTags || []).slice();
    if (kind === 'toggle') d.scalingTags = d.scalingTags.filter((x) => x !== 'dot' && x !== 'projectile');
    if (kind === 'channel' && d.scalingTags.indexOf('channel') === -1) d.scalingTags.push('channel');
    if (kind === 'toggle') d.scalingTags.push('area');
}

// The tag line the tooltip shows, derived from what the spell really does
// (cast kind, behaviour, damage type) so it can never drift from the engine:
//   Spell | Attack      physical damage scales with Attack Damage
//   Arcane              the arcane school (its damage type is Shadow)
//   <damage type>       Fire / Cold / Lightning / Shadow / Holy / Physical
//   delivery            Melee, Projectile, Area, Chaining
//   mechanic            Damage over Time, Aura, Channelling, Charged
// Support and movement spells keep their authored tags.
const USP_DAMAGE_TAG = {
    fire: 'Fire', cold: 'Cold', lightning: 'Lightning', shadow: 'Shadow',
    holy: 'Holy', physical: 'Physical',
};
function _uspDeriveTags(d) {
    const tags = [d.damageKind === 'physical' ? 'Attack' : 'Spell'];
    if (d.theme === 'arcane') tags.push('Arcane');
    if (USP_DAMAGE_TAG[d.damageKind]) tags.push(USP_DAMAGE_TAG[d.damageKind]);
    const add = (x) => { if (tags.indexOf(x) === -1) tags.push(x); };
    const k = d.castKind;
    if (k === 'melee') {
        add('Melee');
        if (d.melee.all || d.melee.kind === 'circle') add('Area');
    } else if (k === 'toggle') {
        add('Area');
    } else if (k === 'ground') {
        add('Area');
        if ((d.scalingTags || []).indexOf('projectile') !== -1) add('Projectile');
    } else {
        switch (d.behavior) {
            case 'single': case 'volley': case 'wild': add('Projectile'); break;
            case 'nova': case 'starfall': case 'delayed': add('Area'); break;
            case 'chain': add('Chaining'); break;
            case 'ticks': if (d.hitsAll) add('Area'); break;
            default: break;
        }
    }
    if (d.behavior === 'ticks') add('Damage over Time');
    if (d.reaction) add('Reaction');
    if (k === 'toggle') add('Aura');
    if (k === 'channel') add('Channelling');
    if (k === 'charge') add('Charged');
    return tags;
}

// Movement spells that aim at the cursor (the rest of the family - Windstep,
// Rift Anchor - are plain self-casts).
const USP_CURSOR_MOVE_BEHAVIORS = ['blink', 'dash', 'disengage'];

UNIVERSAL_SPELL_DEFS.forEach((d) => {
    // The hand-authored tags decide which charm ART school a spell gets
    // (skill-charms.js); the tooltip tags are derived below and may differ.
    d.schoolTags = (d.tags || []).slice();
    if (USP_TOGGLE_SPELLS[d.id]) {
        _uspConvertSustained(d, USP_TOGGLE_SPELLS[d.id], 'toggle', 'Aura');
        d.aura = {
            radius: USP_TOGGLE_SPELLS[d.id].radius,
            intervalSeconds: 1,
            costRampPerSecond: USP_TOGGLE_SPELLS[d.id].costRampPerSecond || 0,
            costRampMax: USP_TOGGLE_SPELLS[d.id].costRampMax || 1,
        };
        d.castTimeSeconds = 0;
    } else if (USP_CHANNEL_SPELLS[d.id]) {
        _uspConvertSustained(d, USP_CHANNEL_SPELLS[d.id], 'channel', 'Channelling');
        d.channel = {
            tickSeconds: USP_CHANNEL_SPELLS[d.id].tickSeconds,
            costRampPerSecond: USP_CHANNEL_SPELLS[d.id].costRampPerSecond || 0,
            costRampMax: USP_CHANNEL_SPELLS[d.id].costRampMax || 1,
        };
        d.castTimeSeconds = 0;
    } else if (USP_CHARGE_SPELLS[d.id]) {
        // Keeps its castTimeSeconds: that is the time to a FULL charge.
        _uspConvertSustained(d, USP_CHARGE_SPELLS[d.id], 'charge', 'Charged');
        d.charge = { minFrac: 0.2, minPower: 0.6, maxPower: 1.5 };
        if (d.id === 'usp_flameblast') {
            // A charged DETONATION, not a charged shot: the hold grows the
            // ring, the release erupts it. Keeps its delayed all-enemy
            // behavior - only the firing rhythm becomes hold-and-release.
            // delayMs shrinks to a short detonation beat (the hold itself
            // was the telegraph).
            d.behavior = 'delayed';
            d.hitsAll = true;
            d.delayMs = 350;
        }
    } else if (USP_MELEE_SPELLS[d.id]) {
        d.castKind = 'melee';
        d.melee = USP_MELEE_SPELLS[d.id];
        // Melee feels bad with a wind-up, so strikes are instant. Only the
        // genuinely heavy finishers keep a cast bar.
        if (['usp_execute', 'usp_seismic_slam'].indexOf(d.id) === -1) d.castTimeSeconds = 0;
        if (d.reaction) d.castTimeSeconds = 0; // a reaction is a snap response, never a wind-up
    } else if (USP_GROUND_SPELLS[d.id]) {
        d.castKind = 'ground';
        d.ground = USP_GROUND_SPELLS[d.id];
        d.castTimeSeconds = 0;
    } else if (USP_INSTANT_SPELLS.indexOf(d.id) !== -1) {
        d.castKind = 'instant';
        d.castTimeSeconds = 0;
    } else if (USP_CURSOR_MOVE_BEHAVIORS.indexOf(d.behavior) !== -1) {
        d.castKind = 'move';
    } else if (d.selfCast) {
        d.castKind = 'self';
    } else {
        d.castKind = 'hold';
    }
    if (!d.selfCast && d.dmg) d.tags = _uspDeriveTags(d);
});

// How the spell (id or def) is cast: 'hold' | 'instant' | 'self' | 'move' |
// 'ground' | 'melee' | 'channel' | 'charge' | 'toggle'. Null for an unknown id. Used by the tooltip and the cast path.
export function getUniversalSpellCastKind(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? UNIVERSAL_SPELL_MAP[spellOrId] : spellOrId;
    return (spell && spell.castKind) || null;
}

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
const USP_SUPPORT_BEHAVIORS = ['heal', 'hot', 'shield', 'guard', 'evade', 'ward', 'thorns', 'gauntlet_reveal', 'cleanse'];

// Highest monster level whose ailments a cleanse of each charm rank (index =
// rank - 1) can remove. Mirrors the monster levels at which the NEXT rank
// starts dropping (CHARM_RANK_MIN_MONSTER_LEVEL in skill-charms.js), so a
// rank always handles what the road produced before it; rank 10 handles all.
const USP_CLEANSE_MAX_LEVEL_BY_RANK = [9, 21, 34, 49, 67, 73, 78, 83, 88, Infinity];
function _uspCleanseMaxLevel(spell, rank) {
    const r = Math.max(1, Math.min(10, _uspRankFor(spell.id, rank)));
    return USP_CLEANSE_MAX_LEVEL_BY_RANK[r - 1];
}
// Lowest rank able to cleanse an ailment from a level-`level` monster.
function _uspCleanseRankFor(level) {
    for (let i = 0; i < USP_CLEANSE_MAX_LEVEL_BY_RANK.length; i++) {
        if (USP_CLEANSE_MAX_LEVEL_BY_RANK[i] >= level) return i + 1;
    }
    return 10;
}

// Sweep cadence. Also the paused-clock compensation step (the whole sweep is
// skipped while paused and every expiry is pushed forward by one tick instead).
const USP_BUFF_TICK_MS = 250;

// Aegis Ward only spends a charge on a hit worth at least this share of the
// player's maximum Life. Without it, a 5-damage ignite tick or a chip hazard
// would silently eat a charge that was meant for the boss slam - the ward
// would read as broken. Documented in the spell's description and tooltip.
export const USP_WARD_MIN_HIT_PCT = 5;

// Active support buffs: { spellId, kind, icon, until, ...payload }.
let _uspActiveBuffs = [];
let _uspBuffSweepInterval = null;
// Remaining full-hit negations from the Aegis Ward.
let _uspWardCharges = 0;

// True when the spell (id or def) is part of the defensive family.
export function isUniversalSupportSpell(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? UNIVERSAL_SPELL_MAP[spellOrId] : spellOrId;
    return !!spell && USP_SUPPORT_BEHAVIORS.indexOf(spell.behavior) !== -1;
}

// Cast rank: the slotted charm's rank, else the trained rank (js/skills/
// skill-charms.js). Falls back to 1 before the charm system loads.
function _uspCastRank(spellId) {
    {
        try {
            const r = getSkillCastRankFull(spellId);
            if (r) return Math.max(1, r);
        } catch (e) { /* charm system not ready - rank 1 */ }
    }
    return 1;
}

// Rank multiplier for support magnitudes (the offensive curve).
export function _uspSupportRankMult(spellId) {
    {
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
// audit screen (js/dev/spell-rank-audit.js) asks. Keeping ONE calculator
// for both means the audit tool cannot drift from the real cast.
function _uspRankFor(spellId, rank) {
    if (rank != null) return Math.max(1, Math.round(Number(rank) || 1));
    return _uspCastRank(spellId);
}

function _uspSupportRankMultFor(spellId, rank) {
    if (rank != null) {
        {
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
function _uspBaseHeal(spell, rank) {
    const flat = Math.round((spell.healFlat || 0) * _uspSupportRankMultFor(spell.id, rank));
    const pct = Math.round(_uspMaxLife() * ((spell.healPct || 0) / 100));
    return Math.max(1, flat + pct);
}

function _uspBaseHotTick(spell, rank) {
    const flat = Math.round((spell.healTickFlat || 0) * _uspSupportRankMultFor(spell.id, rank));
    const pct = Math.round(_uspMaxLife() * ((spell.healTickPct || 0) / 100));
    return Math.max(1, flat + pct);
}

function _uspBaseAbsorb(spell, rank) {
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
function _uspHealPlayer(amount) {
    if (typeof globalThis.playerCurrentHP !== 'undefined' && typeof globalThis.playerMaxHP !== 'undefined') {
        const before = globalThis.playerCurrentHP;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, before + (globalThis._egLifeGain ? globalThis._egLifeGain(Math.max(0, Math.round(amount))) : (Math.max(0, Math.round(amount)))));
        const gained = globalThis.playerCurrentHP - before;
        if (gained > 0 && typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        return gained;
    }
    return 0;
}

// Adds to the absorption shield; returns the amount actually gained.
function _uspRestoreAbsorption(amount) {
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

function _uspStartBuffSweep() {
    if (_uspBuffSweepInterval) return;
    _uspBuffSweepInterval = setInterval(_uspSweepSupportBuffs, USP_BUFF_TICK_MS);
}

function _uspSweepSupportBuffs() {
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
            _uspSupportPulseFX(spell);
            try { _uspRenewalPulse(b.spellId); } catch (e) { /* bloom is cosmetic */ }
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
    if (!_uspActiveBuffs.some((x) => x.kind === 'hot')) {
        try { _uspRenewalClear(); } catch (e) { /* bloom is cosmetic */ }
    }
    if (!_uspActiveBuffs.some((x) => x.kind === 'guard')) {
        try { _uspBulwarkClear(); } catch (e) { /* wall is cosmetic */ }
    }
    if (!_uspActiveBuffs.some((x) => x.kind === 'evade')) {
        try { _uspWindwardClear(); } catch (e) { /* gale is cosmetic */ }
    }
    if (!_uspActiveBuffs.some((x) => x.kind === 'ward')) {
        try { _uspAegisWardClear(); } catch (e) { /* lattice is cosmetic */ }
    }
    if (!_uspActiveBuffs.some((x) => x.kind === 'thorns')) {
        try { _uspRetributionClear(); } catch (e) { /* wreath is cosmetic */ }
    }
    if (!_uspActiveBuffs.some((x) => x.kind === 'windstep')) {
        try { _uspWindstepClear(); } catch (e) { /* tailwind is cosmetic */ }
    }
    if (!_uspActiveBuffs.length) {
        if (_uspBuffSweepInterval) { clearInterval(_uspBuffSweepInterval); _uspBuffSweepInterval = null; }
    }
}

// Adds (or refreshes) a buff. The payload carries the pre-computed, already
// rank-scaled axis values so the combat hooks never re-derive anything.
function _uspAddBuff(spell, payload) {
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
    _uspAnchorMarkerClear();
    try { _uspRenewalClear(); } catch (e) { /* bloom is cosmetic */ }
    try { _uspBulwarkClear(); } catch (e) { /* wall is cosmetic */ }
    try { _uspWindwardClear(); } catch (e) { /* gale is cosmetic */ }
    try { _uspAegisWardClear(); } catch (e) { /* lattice is cosmetic */ }
    try { _uspRetributionClear(); } catch (e) { /* wreath is cosmetic */ }
    try { _uspWindstepClear(); } catch (e) { /* tailwind is cosmetic */ }
    if (_uspBuffSweepInterval) { clearInterval(_uspBuffSweepInterval); _uspBuffSweepInterval = null; }
    _uspForceBuffIconRefresh();
}

// ---------------------------------------------------------------------
// Combat hooks - all typeof-guarded from endgame-encounter.js so the
// combat path pays nothing when no support buff is active.
// ---------------------------------------------------------------------

function _uspBuffSum(kind, field) {
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
    try { _uspAegisWardHit(_uspWardCharges); } catch (e) { /* flash is cosmetic */ }
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
        try { _uspRetributionFlare(); } catch (fxe) { /* flare is cosmetic */ }
        const de = (typeof LANG !== 'undefined' && LANG === 'de');
        if (typeof globalThis.showToast === 'function') globalThis.showToast(`🔥 ${de ? 'Vergeltung' : 'Retribution'} (-${dealt})`, '#ff8a65');
    } catch (e) { /* reflection is best-effort - never break the damage path */ }
}

// True while any support buff is up (used by the tooltip / icon strip).
// ⚠ SUSPECTED DEAD CODE (R3 2026-09-23): zero references since the export
// was privatized - kept for a later dead-code decision, not deleted.
// eslint-disable-next-line no-unused-vars
function isUspSupportBuffActive(kind) {
    const now = Date.now();
    return _uspActiveBuffs.some((b) => b.until > now && (!kind || b.kind === kind));
}

// ---------------------------------------------------------------------
// Player status-strip icons (js/combat/combat-ailments-core.js appends this)
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
function _uspForceBuffIconRefresh() {
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.dataset.sig = '__usp_dirty__';
}

// ---------------------------------------------------------------------
// Cast application
// ---------------------------------------------------------------------

// Reveal cells summoned at the slotted charm's rank: one per rank, 1..10.
function _uspGauntletCells(spell, rank) {
    return Math.max(1, Math.min(10, _uspRankFor(spell.id, rank)));
}

// Applies a support spell's effect. Called from castUniversalSpell once the
// mana and the cooldown are committed. Returns a short toast-ready summary.
function _uspApplySupportSpell(spell) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    switch (spell.behavior) {
        case 'heal': {
            const wanted = _uspCalcHeal(spell);
            const gained = _uspHealPlayer(wanted);
            _uspSupportCastFX(spell, `+${gained}`, gained > 0 ? 'heal' : 'wasted');
            try { _uspMendHearts(spell); } catch (e) { /* hearts are cosmetic */ }
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
            try { _uspRenewalBloom(spell, ticks * tickMs); } catch (e) { /* bloom is cosmetic */ }
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
            try { if (gained > 0) _uspBarrierRaise(); } catch (e) { /* shell is cosmetic */ }
            return `${de ? 'Schild' : 'shield'} +${gained}`;
        }

        case 'guard': {
            const drPct = _uspCalcDrPct(spell);
            const armourPct = _uspCalcArmourPct(spell);
            _uspAddBuff(spell, { drPct, armourPct });
            _uspSupportCastFX(spell, `-${drPct}%`, 'buff');
            try { _uspBulwarkWall(spell, Math.max(1, spell.buffSeconds || 8) * 1000); } catch (e) { /* wall is cosmetic */ }
            return `${de ? 'Schaden' : 'damage'} -${drPct}% ${de ? '+' : '+'}${armourPct}% ${de ? 'Rüstung' : 'Armour'}`;
        }

        case 'evade': {
            const dodgePct = _uspCalcDodgePct(spell);
            _uspAddBuff(spell, { dodgePct });
            _uspSupportCastFX(spell, `+${dodgePct}%`, 'buff');
            try { _uspWindwardGale(spell, Math.max(1, spell.buffSeconds || 8) * 1000); } catch (e) { /* gale is cosmetic */ }
            return `${de ? 'Ausweichen' : 'dodge'} +${dodgePct}%`;
        }

        case 'ward': {
            const charges = _uspCalcWardCharges(spell);
            _uspWardCharges = charges;
            _uspAddBuff(spell, { charges });
            _uspSupportCastFX(spell, `×${charges}`, 'buff');
            try { _uspAegisWardShow(spell, Math.max(1, spell.buffSeconds || 12) * 1000, charges); } catch (e) { /* lattice is cosmetic */ }
            return `${de ? 'negiert' : 'negates'} ${charges} ${de ? 'Treffer' : 'hits'}`;
        }

        case 'thorns': {
            const thornsPct = _uspCalcThornsPct(spell);
            _uspAddBuff(spell, { thornsPct });
            _uspSupportCastFX(spell, `🔥${thornsPct}%`, 'buff');
            try { _uspRetributionShow(spell, Math.max(1, spell.buffSeconds || 10) * 1000); } catch (e) { /* wreath is cosmetic */ }
            return `${de ? 'Vergeltung' : 'retribution'} ${thornsPct}%`;
        }

        case 'cleanse': {
            try {
                if (typeof globalThis._egCleansePlayerAilments === 'function') {
                    globalThis._egCleansePlayerAilments(spell.cleanses, _uspCleanseMaxLevel(spell));
                }
            } catch (e) { /* ailments module not ready */ }
            _uspSupportCastFX(spell, de ? 'gereinigt' : 'cleansed', 'heal');
            return `${de ? spell.cleanseNameDe : spell.cleanseNameEn} ${de ? 'entfernt' : 'removed'}`;
        }

        case 'gauntlet_reveal': {
            const n = _uspGauntletCells(spell);
            let made = 0;
            try {
                if (typeof globalThis._egGauntletSummonRevealCells === 'function') made = globalThis._egGauntletSummonRevealCells(n);
            } catch (e) { /* arena vanished mid-cast */ }
            return `${made} ${de ? (made === 1 ? 'Aufdeckzelle' : 'Aufdeckzellen') : (made === 1 ? 'reveal cell' : 'reveal cells')}`;
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
        case 'cleanse': {
            const maxLv = _uspCleanseMaxLevel(spell);
            const lim = Number.isFinite(maxLv) ? `monsters up to level ${maxLv}` : 'monsters of any level';
            const limDe = Number.isFinite(maxLv) ? `Monstern bis Stufe ${maxLv}` : 'Monstern jeder Stufe';
            return { kind: 'cleanse', maxLevel: maxLv, rank,
                lineEn: `Removes ${spell.cleanseNameEn} inflicted by ${lim}`,
                lineDe: `Entfernt ${spell.cleanseNameDe} von ${limDe}` };
        }
        case 'gauntlet_reveal': {
            const n = _uspGauntletCells(spell);
            return { kind: 'gauntlet_reveal', cells: n, rank,
                lineEn: `Summons ${n} reveal cell${n === 1 ? '' : 's'} - each fires a reveal projectile (Gauntlet only)`,
                lineDe: `Beschwört ${n} Aufdeckzelle${n === 1 ? '' : 'n'} - jede feuert ein Aufdeck-Projektil (nur Gauntlet)` };
        }
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
// AIM - Blink / Dash travel TOWARDS THE CURSOR (capped at the spell's range,
// landing on the cursor when it is closer); Disengage leaps directly AWAY
// from it. Only when no mouse position is known (touch-only play, or the
// cursor sits on the sprite) do they fall back to the direction the sprite
// last actually WALKED (js/sprite/player_sprite.js → getAvatarLastMoveDir),
// then the way its art is mirrored, then 'right'.
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
const USP_MOVEMENT_BEHAVIORS = ['blink', 'dash', 'disengage', 'windstep', 'anchor', 'leap'];

// The four walking directions, as unit vectors.
const USP_DIR_VECTORS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

// Armed Rift Anchor: { x, y, until } or null. One at a time, by design - a
// second anchor replaces the first rather than stacking escapes.
let _uspAnchor = null;

// Supersede token for in-flight glides: a newer movement cast cancels the
// glide it was cast during instead of fighting it for the avatar's position.
let _uspGlideSeq = 0;

// True when the spell (id or def) is part of the movement family.
export function isUniversalMovementSpell(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? UNIVERSAL_SPELL_MAP[spellOrId] : spellOrId;
    return !!spell && USP_MOVEMENT_BEHAVIORS.indexOf(spell.behavior) !== -1;
}

// True for the families that need a live encounter but no monster target.
function _uspIsSelfCastSpell(spell) {
    return isUniversalSupportSpell(spell) || isUniversalMovementSpell(spell)
        || getUniversalSpellCastKind(spell) === 'toggle';
}

// Jump distance at the charm's cast rank.
function _uspCalcMoveDistance(spell) {
    return Math.round(_uspRankAdditive(
        spell.moveBasePx || 0, spell.movePxPerRank || 0, spell.movePxCap || 0,
        _uspCastRank(spell.id)));
}

// Movement-speed share granted by Windstep / Disengage, at the cast rank.
function _uspCalcMoveSpeedPct(spell) {
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
function _uspAvatarEl() {
    return document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
}

// Current sprite position in viewport coordinates. Precedence matches the
// walk loop's own (js/sprite/player_sprite.js): float accumulator → inline
// style → rendered rect, so a blink never starts from a stale corner.
function _uspAvatarPos() {
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
function _uspAvatarWrite(el, x, y, dir) {
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
function _uspMirrorDir() {
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!img || !img.style) return null;
    const tr = img.style.transform || '';
    if (/scaleX\(\s*-1/.test(tr)) return 'left';
    if (/scaleX\(\s*1\s*\)/.test(tr)) return 'right';
    return null;
}

// Which way this cast goes: last walked direction → mirrored facing → 'right'.
function _uspAimDir() {
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
function _uspGlide(el, fromX, fromY, toX, toY, ms, dir) {
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

// Like _uspGlide, but the sprite hops: it rises and falls on a sine arc over
// the flight (Leap Strike). `onLand` runs once on the final frame.
function _uspLeapGlide(el, fromX, fromY, toX, toY, ms, dir, arcPx, onLand) {
    const seq = ++_uspGlideSeq;
    const dur = Math.max(120, ms || 460);
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let first = true;
    const step = (now) => {
        if (seq !== _uspGlideSeq) return;      // superseded by a newer cast
        const t = Math.min(1, (now - t0) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // ease in-out
        const hop = Math.sin(t * Math.PI) * arcPx;
        _uspAvatarWrite(el, fromX + (toX - fromX) * e, fromY + (toY - fromY) * e - hop,
            first ? dir : null);
        first = false;
        if (t < 1) requestAnimationFrame(step);
        else if (onLand) onLand();
    };
    requestAnimationFrame(step);
}

// Viewport centre of a living monster's card, or null.
function _uspMonsterCentre(id) {
    const card = document.getElementById(`eg-card-${id}`);
    if (!card || typeof globalThis._egGetElementCentre !== 'function') return null;
    const r = card.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return globalThis._egGetElementCentre(card);
}

// The monster a Leap Strike jumps to: the selected one, else the nearest.
function _uspLeapTarget(from) {
    let sel = null;
    try { sel = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null; } catch (e) { sel = null; }
    if (sel && sel.currentHP > 0) {
        const c = _uspMonsterCentre(sel.id);
        if (c) return { mon: sel, c };
    }
    let best = null;
    let bestD = Infinity;
    for (const m of _uspLivingMonsters()) {
        const c = _uspMonsterCentre(m.id);
        if (!c) continue;
        const d = Math.hypot(c.x - from.x, c.y - from.y);
        if (d < bestD) { best = { mon: m, c }; bestD = d; }
    }
    return best;
}

// ---------------------------------------------------------------------
// Rift Anchor state
// ---------------------------------------------------------------------

export function isUspAnchorArmed() {
    return !!(_uspAnchor && _uspAnchor.until > Date.now());
}

function getUspAnchorRemainingSeconds() {
    if (!isUspAnchorArmed()) return 0;
    return Math.max(1, Math.ceil((_uspAnchor.until - Date.now()) / 1000));
}

// Drops the armed anchor (and its world marker). Safe to call unconditionally.
function _uspClearAnchor() {
    _uspAnchor = null;
    _uspActiveBuffs = _uspActiveBuffs.filter((b) => b.kind !== 'anchor');
    _uspAnchorMarkerClear();
}

// Where a cursor-aimed jump lands. Returns { x, y, dist, dir } in wrapper
// coordinates (same space as _uspAvatarPos), or null when there is no usable
// cursor (callers then fall back to the walking direction). `away` flips the
// vector (Disengage). The jump is capped at maxDist and, towards the cursor,
// never overshoots it.
function _uspCursorMove(pos, maxDist, away) {
    const cur = getCursorPoint();
    if (!cur) return null;
    const off = _uspMoveSpriteOffset();
    const dx = cur.x - (pos.x + off.x);
    const dy = cur.y - (pos.y + off.y);
    const d = Math.hypot(dx, dy);
    if (!(d >= 8)) return null;
    const travel = away ? maxDist : Math.min(maxDist, d);
    const k = (away ? -1 : 1) * travel / d;
    const sx = dx * k;
    const sy = dy * k;
    const dir = Math.abs(sx) >= Math.abs(sy)
        ? (sx >= 0 ? 'right' : 'left')
        : (sy >= 0 ? 'down' : 'up');
    return { x: pos.x + sx, y: pos.y + sy, dist: Math.round(travel), dir };
}

// ---------------------------------------------------------------------
// Cast application
// ---------------------------------------------------------------------

// Applies a movement spell. Returns { text, flavor, cooldown? } - `cooldown`
// overrides the spell's normal cooldown for this cast (the Rift Anchor's
// PLACE cast is deliberately cheap so the recall can follow).
function _uspApplyMovementSpell(spell) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const pos = _uspAvatarPos();
    if (!pos) return { text: de ? 'kein Spielersprite' : 'no player sprite', flavor: 'wasted' };

    switch (spell.behavior) {
        case 'blink': {
            const maxDist = _uspCalcMoveDistance(spell);
            const aim = _uspCursorMove(pos, maxDist, false);
            const dir = aim ? aim.dir : _uspAimDir();
            const v = USP_DIR_VECTORS[dir];
            const dist = aim ? aim.dist : maxDist;
            const landed = aim
                ? _uspAvatarWrite(pos.el, aim.x, aim.y, dir)
                : _uspAvatarWrite(pos.el, pos.x + v.x * dist, pos.y + v.y * dist, dir);
            _uspBlinkFX(spell, pos.x, pos.y, landed.x, landed.y);
            _uspSupportCastFX(spell, `${dir}`, 'buff');
            return { text: `${de ? 'teleportiert' : 'blinked'} ${dir} ${dist}px`, flavor: 'buff' };
        }

        case 'dash':
        case 'disengage': {
            const maxDist = _uspCalcMoveDistance(spell);
            // Towards the cursor (Dash) or directly away from it (Disengage);
            // without a cursor, the walking direction (Disengage reversed).
            const aim = _uspCursorMove(pos, maxDist, spell.behavior === 'disengage');
            let dist = maxDist;
            let dir;
            let tx;
            let ty;
            if (aim) {
                dist = aim.dist;
                dir = aim.dir;
                tx = aim.x;
                ty = aim.y;
            } else {
                dir = _uspAimDir();
                const v = USP_DIR_VECTORS[dir];
                const sign = (spell.behavior === 'disengage') ? -1 : 1;
                tx = pos.x + v.x * dist * sign;
                ty = pos.y + v.y * dist * sign;
            }
            _uspGlide(pos.el, pos.x, pos.y, tx, ty, spell.glideMs || 200, dir);
            {
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

        case 'leap': {
            const off = _uspMoveSpriteOffset();
            const from = { x: pos.x + off.x, y: pos.y + off.y };
            const tgt = _uspLeapTarget(from);
            if (!tgt) return { text: de ? 'kein Ziel' : 'no target', flavor: 'wasted' };
            const dx = tgt.c.x - from.x;
            const dy = tgt.c.y - from.y;
            const dFull = Math.hypot(dx, dy) || 1;
            const STOP_SHORT = 80;                       // land beside the target, not on it
            const maxDist = _uspCalcMoveDistance(spell);
            const travel = Math.max(0, Math.min(maxDist, dFull - STOP_SHORT));
            const ux = dx / dFull, uy = dy / dFull;
            const tx = pos.x + ux * travel;
            const ty = pos.y + uy * travel;
            const dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
            const landDist = dFull - travel;             // centre-to-centre after landing
            const connects = landDist <= STOP_SHORT + 90;
            const ms = spell.glideMs || 460;
            try { _uspBlinkFX(Object.assign({}, spell, { behavior: 'disengage' }), pos.x, pos.y, tx, ty, true); } catch (e) { /* takeoff dust is cosmetic */ }
            _uspLeapGlide(pos.el, pos.x, pos.y, tx, ty, ms, dir, Math.min(90, 40 + travel * 0.12), () => {
                try {
                    if (typeof globalThis._egIsActive === 'function' && !globalThis._egIsActive()) return;
                } catch (e) { return; }
                const land = _uspAvatarPos();
                try { _uspLeapImpactFX(land ? land.x + off.x : tx + off.x, land ? land.y + off.y + 34 : ty + off.y + 34); } catch (e) { /* impact is cosmetic */ }
                const mon = _uspLivingMonsters().find((m) => m.id === tgt.mon.id);
                if (!connects || !mon) return;
                _uspStrike(spell, mon.id, spell.dmg[0], spell.dmg[1], { isMelee: true });
                if (spell.stagger) {
                    mon.staggeredUntil = Math.max(mon.staggeredUntil || 0, Date.now() + spell.stagger);
                    try {
                        if (typeof globalThis._egShowStatusLabel === 'function') {
                            globalThis._egShowStatusLabel(mon.id, de ? 'BENOMMEN' : 'STAGGERED');
                        }
                    } catch (e) { /* label is cosmetic */ }
                }
            });
            _uspSupportCastFX(spell, `${Math.round(travel)}px`, 'buff');
            return {
                text: connects
                    ? (de ? `Sprung ${Math.round(travel)}px auf ${tgt.mon.name || 'das Ziel'}` : `leapt ${Math.round(travel)}px onto ${tgt.mon.name || 'the target'}`)
                    : (de ? 'zu kurz gesprungen!' : 'fell short!'),
                flavor: connects ? 'buff' : 'wasted',
            };
        }

        case 'windstep': {
            const pct = _uspCalcMoveSpeedPct(spell);
            _uspAddBuff(spell, { speedPct: pct });
            _uspSupportCastFX(spell, `+${pct}%`, 'buff');
            try { _uspWindstepTailwind(spell, Math.max(1, spell.buffSeconds || 6) * 1000); } catch (e) { /* tailwind is cosmetic */ }
            return { text: `${de ? 'Tempo' : 'speed'} +${pct}% ${spell.buffSeconds}s`, flavor: 'buff' };
        }

        case 'anchor': {
            if (isUspAnchorArmed()) {
                // RECALL - the whole payoff: no travel, no path, no argument.
                const a = _uspAnchor;
                const secs = getUspAnchorRemainingSeconds();
                _uspClearAnchor();
                const landed = _uspAvatarWrite(pos.el, a.x, a.y, null);
                _uspBlinkFX(spell, pos.x, pos.y, landed.x, landed.y);
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
            _uspAnchorMarkerShow(spell, pos.x, pos.y, secs);
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
    const rank = _uspCastRank(spellId);
    const base = {
        kind: spell.behavior,
        rank,
        aimEn: 'your cursor',
        aimDe: 'deinen Cursor',
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
    if (spell.behavior === 'leap') {
        return Object.assign(base, {
            distance: dist,
            lineEn: `Leaps up to ${dist}px onto your target (selected, else nearest) and lands with a stomp. Too far and you land short.`,
            lineDe: `Springt bis zu ${dist}px auf dein Ziel (gewählt, sonst nächstes) und landet mit einem Stampfen. Zu weit und du landest zu kurz.`,
        });
    }
    if (spell.behavior === 'disengage') {
        const pct = _uspCalcMoveSpeedPct(spell);
        const secs = Math.round(spell.buffSeconds || 3);
        return Object.assign(base, {
            distance: dist, speedPct: pct, seconds: secs,
            lineEn: `Leaps up to ${dist}px AWAY from the cursor, then walk speed +${pct}% for ${secs}s`,
            lineDe: `Springt bis zu ${dist}px VOM CURSOR WEG, danach Lauftempo +${pct}% für ${secs}s`,
        });
    }
    const glide = Math.round(spell.glideMs || 0);
    return Object.assign(base, {
        distance: dist,
        lineEn: spell.behavior === 'blink'
            ? `Teleports up to ${dist}px towards the cursor in an instant - nothing on the way can touch you`
            : `Dashes up to ${dist}px towards the cursor over ${glide}ms - fast, but you are still travelling`,
        lineDe: spell.behavior === 'blink'
            ? `Teleportiert bis zu ${dist}px Richtung Cursor in einem Augenblick - unterwegs kann dich nichts treffen`
            : `Sprintet bis zu ${dist}px Richtung Cursor in ${glide}ms - schnell, aber du bist weiterhin unterwegs`,
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

function getUniversalSpellUnlockList() {
    try {
        if (typeof STATE !== 'undefined' && Array.isArray(STATE.universalSpellsUnlocked)) {
            return STATE.universalSpellsUnlocked;
        }
    } catch (e) { /* no gating configured */ }
    return null; // null = all unlocked
}

export function isUniversalSpellUnlocked(spellId) {
    const list = getUniversalSpellUnlockList();
    if (!list) return true;
    return list.indexOf(spellId) !== -1;
}

// ⚠ SUSPECTED DEAD CODE (R3 2026-09-23): zero references since the export
// was privatized - kept for a later dead-code decision, not deleted.
// eslint-disable-next-line no-unused-vars
// Unlock one spell (persists via save()).
function unlockUniversalSpell(spellId) {
    if (typeof STATE === 'undefined' || !STATE) return false;
    if (!UNIVERSAL_SPELL_MAP[spellId]) return false;
    if (!Array.isArray(STATE.universalSpellsUnlocked)) STATE.universalSpellsUnlocked = UNIVERSAL_SPELL_DEFS.map((d) => d.id);
    if (STATE.universalSpellsUnlocked.indexOf(spellId) === -1) {
        STATE.universalSpellsUnlocked.push(spellId);
        save();
        refreshSkillUI();
    }
    return true;
}

// (Re-)lock one spell - used by the future gating system / testing.
// ⚠ SUSPECTED DEAD CODE (R3 2026-09-23): zero references since the export
// was privatized - kept for a later dead-code decision, not deleted.
// eslint-disable-next-line no-unused-vars
function lockUniversalSpell(spellId) {
    if (typeof STATE === 'undefined' || !STATE) return false;
    if (!Array.isArray(STATE.universalSpellsUnlocked)) STATE.universalSpellsUnlocked = UNIVERSAL_SPELL_DEFS.map((d) => d.id);
    const i = STATE.universalSpellsUnlocked.indexOf(spellId);
    if (i !== -1) {
        STATE.universalSpellsUnlocked.splice(i, 1);
        save();
        refreshSkillUI();
    }
    return true;
}

// ⚠ SUSPECTED DEAD CODE (R3 2026-09-23): zero references since the export
// was privatized - kept for a later dead-code decision, not deleted.
// eslint-disable-next-line no-unused-vars
function isUniversalSpellId(skillId) {
    return !!UNIVERSAL_SPELL_MAP[skillId];
}

export function getUniversalSpellDef(spellId) {
    return UNIVERSAL_SPELL_MAP[spellId] || null;
}

function _uspUnlockHint(spell) {
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
//   spell.damageKind: fire|cold|lightning|shadow|holy|physical
//   spell.scalingTags: spell + kind + area|projectile|dot|chain|channel

function getUniversalSpellDamageBonus(spell) {
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
    // Per-spell override: the listed cost for this rank, then only the
    // passive-tree / map modifiers (no global multiplier, no rank curve).
    const listed = getSpellManaCostOverrideForSkill(spellId);
    if (listed != null) return Math.round(_applyManaCostModifiers(listed));
    let cost = spell.manaCost || 0;
    {
        try { cost = _scaleAbilityManaCost(cost); } catch (e) { /* fall through */ }
    }
    // Spell rank multiplies the price (SPELL_RANK_MANA_MULT in skill-charms.js).
    {
        cost = Math.round(cost * getSpellRankManaMultForSkill(spellId));
    }
    return cost;
}

export function canAffordUniversalSpell(spellId) {
    const cost = getUniversalSpellManaCost(spellId);
    if (!cost || cost <= 0) return true;
    try {
        if (_bloodMagicActive()) {
            return canAffordLifeCost(cost);
        }
    } catch (e) { /* fall through to mana */ }
    return canAffordMana(cost);
}

export function getUniversalSpellEffectiveCooldown(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return 0;
    const base = spell.cooldownSeconds || 0;
    // Global cooldown-recovery sources (passive tree / keystones) apply to
    // spells too; class-specific ones intentionally do not.
    try {
        {
            return Math.max(0, base - _getGlobalCooldownReduction());
        }
    } catch (e) { /* fall through */ }
    return base;
}

// Per-spell live cooldowns (session-only, like the legacy slots).
const _uspCooldowns = {}; // spellId → { remaining, interval }

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
const _uspCharges = {}; // spellId → charge state

// Charge config for a spell, or null when the spell is plain-cooldown.
function _uspChargeConfig(spellOrId) {
    const spell = (typeof spellOrId === 'string') ? getUniversalSpellDef(spellOrId) : spellOrId;
    if (!spell || !spell.chargeMax || spell.chargeMax < 1) return null;
    return { max: spell.chargeMax, recharge: spell.chargeRechargeSeconds || spell.cooldownSeconds || 0 };
}

// Live charge pool for a spell (session-only): starts full, never persists.
function _uspChargeState(spellId, cfg) {
    let st = _uspCharges[spellId];
    if (!st) {
        st = _uspCharges[spellId] = { current: cfg.max, pending: [], interval: null };
    }
    return st;
}

// Schedules one spent charge for recharge and starts the shared ticker.
// Recharge intentionally ignores cooldown-reduction passives (flat seconds
// like Celerity would zero out short pools) - it uses the authored time.
function _uspScheduleRecharge(spellId, cfg) {
    const st = _uspChargeState(spellId, cfg);
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0 && window.DEV_EFFECT_TIME_SCALE !== 1)
        ? window.DEV_EFFECT_TIME_SCALE : 1;
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
            {
                try { renderSkillHotbar(); } catch (e) {}
            }
        }
        if (!live.pending.length) {
            clearInterval(live.interval);
            live.interval = null;
        } else {
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
function _uspConsumeCharge(spellId) {
    const cfg = _uspChargeConfig(spellId);
    if (!cfg) return true; // not a charge spell - nothing to spend
    const st = _uspChargeState(spellId, cfg);
    if (st.current <= 0) return false;
    st.current -= 1;
    _uspScheduleRecharge(spellId, cfg);
    {
        try { patchHotbarSlotCooldown(spellId); } catch (e) {}
    }
    return true;
}

// Empties the charge pools (round-end reset). Clears the tickers so a reset
// cannot leave an interval counting down against a dead pool.
function _uspClearAllCharges() {
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
function startUniversalSpellCooldown(spellId, secondsOverride) {
    // Charge-based spells are committed through _uspConsumeCharge (see the
    // cast path). A call here is a deliberate no-op so a late re-time (the
    // Rift Anchor's PLACE cast re-cooldown) can never double-spend a charge.
    if (_uspChargeConfig(spellId)) return;
    const secs = (typeof secondsOverride === 'number' && secondsOverride > 0)
        ? secondsOverride
        : getUniversalSpellEffectiveCooldown(spellId);
    const prev = _uspCooldowns[spellId];
    if (prev && prev.interval) clearInterval(prev.interval);
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0 && window.DEV_EFFECT_TIME_SCALE !== 1)
        ? window.DEV_EFFECT_TIME_SCALE : 1;
    const state = _uspCooldowns[spellId] = {
        remaining: Math.max(1, Math.round(secs * scale)),
        interval: null,
    };
    {
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
            {
                try { renderSkillHotbar(); } catch (e) {}
            }
        } else {
            try { patchHotbarSlotCooldown(spellId); } catch (e) {}
        }
    }, 1000);
}


//------------------------------------------------------------------------
//---------------------------DAMAGE ROLL----------------------------------
//------------------------------------------------------------------------
// One rolled hit: base range + flat damage (gear + future Probability Tree),
// scaled by increased damage (gear + future Probability Tree), then crit,
// map mods and quiz buffs. Returns { amount, elements, isCrit }.
//   elemental spells → elements[element] = amount (monster resists apply).
//   PHYSICAL spells  → elements = {} (pure physical: only monster physical
//                       resistance mitigates; no elemental ailments).
// Physical spells scale with physical gear (physFlat/physIncPct) instead
// of spell damage - warrior gear, not caster gear.

function _uspRollCritMult() {
    try {
        if (typeof globalThis._egComputePlayerStats === 'function' && typeof globalThis._egRollCrit === 'function') {
            const critStats = globalThis._egComputePlayerStats();
            // Spell-only crit lines from the passive tree (spell_crit_chance /
            // spell_crit_multi) ride along as this roll's bonus.
            return globalThis._egRollCrit(critStats, {
                chance: critStats.spellCritChancePct || 0,
                multiplierPct: critStats.spellCritMultiplierPct || 0,
            });
        }
    } catch (e) { /* no crit backend - normal hit */ }
    return 1;
}

// Flat "+N spell damage" is added to EVERY hit, so it used to dwarf the base
// roll of the small-hit spells: a 3-5 channel tick with +115 flat dealt ~120
// per half second, ~5x what a single big cast of the same mana did. Flat
// damage now scales with the size of the hit it is added to (like the genre's
// damage effectiveness): full for a big single hit (>= USP_FLAT_FULL_HIT
// base damage), proportionally less for the many-small-hits spells, never
// below USP_FLAT_MIN_SHARE.
const USP_FLAT_FULL_HIT = 20;
const USP_FLAT_MIN_SHARE = 0.15;

// High-level spell ramp. Spell base damage has no weapon to grow with, so from
// character level 50 on it is multiplied by a geometric curve: 1x up to level
// 50 (the campaign anchors stay valid), about 7x at 68, 25x at 80 and 75x at 90.
// Physical (blade / arrow) spells already ride physical weapon damage and are
// left alone.
const USP_SPELL_RAMP_FROM_LEVEL = 50;
const USP_SPELL_RAMP_TO_LEVEL = 90;
const USP_SPELL_RAMP_MAX = 75;
function _uspSpellLevelRamp(level) {
    let lv = Number(level);
    if (!Number.isFinite(lv)) {
        try {
            lv = Number(typeof globalThis._egGetPlayerLevel === 'function' ? globalThis._egGetPlayerLevel() : STATE.playerLevel) || 1;
        } catch (e) { lv = 1; }
    }
    if (lv <= USP_SPELL_RAMP_FROM_LEVEL) return 1;
    const t = Math.min(1, (lv - USP_SPELL_RAMP_FROM_LEVEL) / (USP_SPELL_RAMP_TO_LEVEL - USP_SPELL_RAMP_FROM_LEVEL));
    return Math.pow(USP_SPELL_RAMP_MAX, t);
}

// Physical spells are weapon attacks: blade spells (Heroic Strike, Mortal Strike,
// Whirlwind, Execute...) add a share of the MELEE weapon's damage and ride the melee
// increases, arrow spells (Aimed Shot, Multi Shot, Barrage...) add a share of the BOW's
// damage (plus gear flat physical) and ride the physical + projectile increases.
// The share keeps a rank-10 cast near the elemental spells instead of a full weapon hit.
const USP_PHYS_WEAPON_EFFECTIVENESS = 0.25;
function _uspPhysicalWeaponPart(spell, stats, tree) {
    const mid = (a, b) => ((Number(a) || 0) + (Number(b) || 0)) / 2;
    const generic = (stats.damageIncPct || 0) + (tree.incPct || 0);
    if (spell.theme === 'arrow') {
        return {
            flat: mid(stats.physFlatMin, stats.physFlatMax) + (tree.flat || 0),
            incPct: (stats.physIncPct || 0) + (stats.projectileDamageIncPct || 0) + generic,
        };
    }
    const stance = stats.isHeavyWeaponEquipped ? (stats.meleePhysHeavyIncPct || 0) : (stats.meleePhys1HIncPct || 0);
    const family = stats.isSwordEquipped ? (stats.meleePhysSwordIncPct || 0)
        : stats.isAxeEquipped ? (stats.meleePhysAxeIncPct || 0)
        : stats.isMaceEquipped ? (stats.meleePhysMaceIncPct || 0)
        : stats.isStaffEquipped ? (stats.staffDamageIncPct || 0)
        : stats.isWandEquipped ? (stats.wandDamageIncPct || 0) : 0;
    return {
        flat: mid(stats.meleePhysMin, stats.meleePhysMax) + (tree.flat || 0),
        incPct: (stats.meleePhysIncPct || 0) + stance + family + generic,
    };
}

function calcUniversalSpellHit(spell, dmgMin, dmgMax, hitOpts) {
    const stats = (typeof globalThis._egComputePlayerStats === 'function')
        ? globalThis._egComputePlayerStats() : {};
    const tree = getUniversalSpellDamageBonus(spell);
    const isPhys = spell.damageKind === 'physical';
    const flatShare = Math.max(USP_FLAT_MIN_SHARE, Math.min(1, ((dmgMin + dmgMax) / 2) / USP_FLAT_FULL_HIT));

    let dmg = dmgMin + Math.random() * (dmgMax - dmgMin);
    // Melee strikes: a full weapon swing (100% of the melee weapon's damage) plus
    // the spell's own roll on top. Multi-hit strikes split the swing across their
    // hits so the whole cast stays one swing; DoT ticks carry no swing. The swing
    // is added after the spell-rank multiplier, so rank only grows the extra roll.
    let swing = 0;
    if (isPhys) {
        const part = _uspPhysicalWeaponPart(spell, stats, tree);
        const isSwing = spell.theme !== 'arrow' && hitOpts && hitOpts.isMelee && hitOpts.meleeHits > 0 && !(spell.melee && spell.melee.noWeapon) && !hitOpts.isTick && !hitOpts.isDot;
        if (isSwing) {
            const hitsTotal = hitOpts.meleeHits;
            swing = (part.flat / hitsTotal) * (1 + part.incPct / 100);
            dmg *= 1 + part.incPct / 100;
        } else {
            dmg += part.flat * USP_PHYS_WEAPON_EFFECTIVENESS * flatShare;
            dmg *= 1 + part.incPct / 100;
        }
    } else {
        dmg *= _uspSpellLevelRamp();
        dmg += ((stats.spellDamageFlat || 0) + (tree.flat || 0)) * flatShare;
        // Elemental spells (fire / frost / lightning / arcane - whatever the
        // def's element maps to) additionally ride the character's global
        // "+% increased elemental damage" from the passive tree. Physical
        // spells never do - they scale with physical gear above.
        // Fire/cold/lightning spells further ride their own element's tree-only
        // increase. Lightning is one of the four elemental damage types, so it
        // keys on the spell's element exactly like fire and cold do; the two
        // lightning damage spells (Wrath, Serpent Sting) are lightning-element
        // spells themselves, so they are covered by the same line.
        const fireBonus = (spell.element === 'fire') ? (stats.fireDamageIncPct || 0) : 0;
        const coldBonus = (spell.element === 'cold') ? (stats.coldDamageIncPct || 0) : 0;
        const lightningBonus = (spell.element === 'lightning') ? (stats.lightningDamageIncPct || 0) : 0;
        const shadowBonus = (spell.element === 'shadow') ? (stats.shadowDamageIncPct || 0) : 0;
        dmg *= 1 + ((stats.spellDamageIncPct || 0) + (stats.damageIncPct || 0) + (tree.incPct || 0)
            + (stats.elementalDamageIncPct || 0) + fireBonus + coldBonus + lightningBonus + shadowBonus) / 100;
    }

    // Tree: Area Damage (skills with the Area tag) and Spell Damage over Time (tick hits).
    if (Array.isArray(spell.tags) && spell.tags.includes('Area') && (stats.areaDamagePct || 0) > 0) {
        dmg *= 1 + stats.areaDamagePct / 100;
    }
    if (hitOpts && hitOpts.isTick) {
        dmg *= (1 + Math.max(0, stats.spellDotIncPct || 0) / 100) * (1 + Math.max(0, stats.spellDotMultiPct || 0) / 100);
    }
    const critMult = _uspRollCritMult();
    const isCrit = critMult > 1;
    dmg *= critMult;
    swing *= critMult;

    try {
        let common = 1;
        if (typeof globalThis._egMapPlayerDamageMult === 'function') common *= globalThis._egMapPlayerDamageMult();
        if (typeof globalThis._egQuizDamageBuffMult === 'function') common *= globalThis._egQuizDamageBuffMult();
        // Charm orbs applied to this spell's charm: +1% damage each
        // (js/skills/skill-charms.js).
        common *= getCharmSkillDamageMult(spell.id);
        dmg *= common;
        swing *= common;
        // Spell rank: rank 10 hits ~6× a rank-1 cast (SPELL_RANK_DAMAGE_MULT).
        dmg *= getSpellRankDamageMultForSkill(spell.id);
    } catch (e) { /* mods unavailable */ }
    dmg += swing;

    let amount = Math.max(1, Math.round(dmg));
    let elements = {};
    const spellElement = spell.element || 'fire';
    if (spellElement !== 'physical') {
        elements[spellElement] = amount;
    }
    // Fire conversion / fire-only (Primal Flame keystone, node 350).
    if (_egHasDamageConversion(stats) === true) {
        const converted = _egApplyDamageConversion(stats, spellElement === 'physical' ? amount : 0, elements);
        elements = converted.elements;
        amount = Math.max(1, Math.round(converted.physical
            + elements.fire + elements.cold + elements.lightning + elements.shadow));
    }

    // Life leech mirrors the weapon channels (heal on spell hits too).
    try {
        if (stats.lifeLeechPct > 0 && (stats.lifeLeechAsAbsorption || 0) > 0) {
            _egLeechAbsorption(stats, amount, stats.lifeLeechPct);
        } else if (stats.lifeLeechPct > 0 && typeof globalThis.playerCurrentHP !== 'undefined') {
            const heal = Math.round(amount * (stats.lifeLeechPct / 100) * _egLeechHealMult(stats));
            if (heal > 0 && typeof globalThis.playerMaxHP !== 'undefined') {
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
                if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
            }
        }
    } catch (e) { /* leech is best-effort */ }

    // Absorption leech from spell damage (passive tree: absorption_leech_spell).
    try {
        if (stats.absorptionLeechSpellPct > 0) _egLeechAbsorption(stats, amount, stats.absorptionLeechSpellPct);
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
    const rankMult = getSpellRankDamageMultForSkill(spellId) * (spell.damageKind === 'physical' ? 1 : _uspSpellLevelRamp());
    const perHitMin = Math.max(1, Math.round(spell.dmg[0] * rankMult));
    const perHitMax = Math.max(1, Math.round(spell.dmg[1] * rankMult));
    let count = 1;
    if (spell.behavior === 'volley' || spell.behavior === 'starfall' || spell.behavior === 'wild') count = spell.count || 1;
    else if (spell.behavior === 'ticks') count = 1 + (spell.ticks || 0);
    else if (spell.behavior === 'chain') count = spell.chainMax || 1;
    // Melee strikes also deal a full swing of the equipped melee weapon (see
    // calcUniversalSpellHit): shown as part of the per-hit range, split across
    // multi-hit strikes. Rend's swing rides its opening strike only.
    let swing = 0;
    const swingHits = (spell.castKind === 'melee' && spell.melee) ? Math.max(1, Math.round(spell.melee.hits || 1)) : 0;
    if (swingHits && spell.damageKind === 'physical' && !spell.melee.noWeapon && spell.behavior !== 'aura') {
        try {
            const stats = globalThis._egComputePlayerStats();
            const part = _uspPhysicalWeaponPart(spell, stats, getUniversalSpellDamageBonus(spell));
            swing = (part.flat / swingHits) * (1 + part.incPct / 100);
        } catch (e) { swing = 0; }
    }
    if (swingHits > 1) count = swingHits;
    const swingOnce = spell.behavior === 'ticks' ? Math.round(swing) : 0;
    const perHitSwing = spell.behavior === 'ticks' ? 0 : Math.round(swing);
    const hitMin = perHitMin + perHitSwing;
    const hitMax = perHitMax + perHitSwing;
    return {
        perHitMin: spell.behavior === 'ticks' ? perHitMin + Math.round(swing) : hitMin,
        perHitMax: spell.behavior === 'ticks' ? perHitMax + Math.round(swing) : hitMax,
        count,
        totalMin: hitMin * count + swingOnce,
        totalMax: hitMax * count + swingOnce,
        perTarget: !!spell.perTarget || !!spell.hitsAll || spell.behavior === 'chain',
        weaponSwing: swing > 0,
    };
}


//------------------------------------------------------------------------
//------------------------------CASTING-----------------------------------
//------------------------------------------------------------------------

// Cast sound per spell: the new family sound, with the spell's old
// placeholder (spell.sfx) as fallback until the family sound is recorded.
function _uspCastSfxKey(spell) {
    switch (spell.behavior) {
        case 'heal': case 'hot': return 'spell_heal';
        case 'shield': case 'guard': return 'spell_barrier';
        case 'ward': case 'evade': case 'thorns': return 'spell_buff';
        case 'blink': case 'anchor': return 'spell_blink';
        case 'dash': case 'disengage': case 'windstep': case 'leap': return 'spell_dash';
        default: break;
    }
    switch (spell.id) {
        case 'usp_whirlwind': case 'usp_blade_vortex': return 'spell_whirlwind';
        case 'usp_execute': return 'spell_execute';
        case 'usp_explosive_shot': return 'spell_explosive_arrow';
        case 'usp_arrow_volley': case 'usp_barrage': return 'spell_arrow_volley';
        default: break;
    }
    const byTheme = {
        arrow: 'spell_arrow_shot', blade: 'spell_blade_strike', fire: 'spell_fire_cast',
        frost: 'spell_frost_cast', lightning: 'spell_lightning_cast', arcane: 'spell_arcane_cast',
        shadow: 'spell_shadow_cast', holy: 'spell_holy_cast',
    };
    return byTheme[spell.theme] || null;
}

function _uspPlaySfx(spell) {
    try {
        if (!spell || typeof Audio_Manager === 'undefined' || !Audio_Manager.playSFX) return;
        const key = _uspCastSfxKey(spell);
        if (key) Audio_Manager.playSFX(key, spell.sfx);
        else if (spell.sfx) Audio_Manager.playSFX(spell.sfx);
    } catch (e) { /* audio is best-effort */ }
}

function _uspLivingMonsters() {
    try {
        if (typeof globalThis._egMonsters === 'undefined' || !globalThis._egMonsters) return [];
        return globalThis._egMonsters.filter((m) => m && m.currentHP > 0);
    } catch (e) { return []; }
}

function _uspNoTargetToast(spell) {
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
function _uspStrike(spell, monsterId, dmgMin, dmgMax, opts) {
    if (!monsterId) return;
    const hit = calcUniversalSpellHit(spell, dmgMin, dmgMax, opts);
    const fxOpts = Object.assign({ isCrit: hit.isCrit }, opts || {});
    try {
        _uspFireThemedProjectile(spell, monsterId, hit, fxOpts);
    } catch (e) {
        try { globalThis._egDamageTargetById(monsterId, hit.amount, hit.elements, { isCrit: hit.isCrit, isPlayerSpell: true }); } catch (e2) {}
    }
}

// The monster a melee swing would hit - the orange "melee target" box, not the
// yellow selection used by shots and spells: the selected monster when it is
// about as close as the nearest one in weapon reach, otherwise the nearest in
// reach. Null when nothing stands in reach.
function _uspMeleeVictimId() {
    try {
        const sel = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null;
        if (typeof globalThis._egMeleeFindVictim !== 'function') return sel ? sel.id : null;
        const id = globalThis._egMeleeFindVictim(sel ? sel.id : null);
        return id == null ? null : id;
    } catch (e) { return null; }
}

// Where a melee spell points: the melee target (orange box), else the selected
// monster, else the nearest living one, else the cursor, else the way the hero
// is facing. Always returns a point so the effect has a direction even when it
// is a pure whiff.
function _uspMeleeAimPoint(origin) {
    const centreOf = (id) => {
        const card = document.getElementById(`eg-card-${id}`);
        if (!card || typeof globalThis._egGetElementCentre !== 'function') return null;
        const r = card.getBoundingClientRect();
        if (!r.width && !r.height) return null;
        return globalThis._egGetElementCentre(card);
    };
    const meleeId = _uspMeleeVictimId();
    if (meleeId != null) {
        const c = centreOf(meleeId);
        if (c) return c;
    }
    try {
        const sel = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null;
        if (sel && sel.currentHP > 0) {
            const c = centreOf(sel.id);
            if (c) return c;
        }
    } catch (e) { /* fall through */ }
    let best = null;
    let bestD = Infinity;
    for (const m of _uspLivingMonsters()) {
        const c = centreOf(m.id);
        if (!c) continue;
        const d = Math.hypot(c.x - origin.x, c.y - origin.y);
        if (d < bestD) { best = c; bestD = d; }
    }
    if (best) return best;
    const cur = getCursorPoint();
    if (cur) return cur;
    const v = USP_DIR_VECTORS[_uspAimDir()];
    return { x: origin.x + v.x * 120, y: origin.y + v.y * 120 };
}

// Applies a MELEE-kind spell: plays the effect beside the player, then checks
// the surroundings for what it actually hit. Returns the number of victims.
function _uspApplyMeleeSpell(spell) {
    const m = spell.melee;
    const origin = getAvatarCentre() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const aim = _uspMeleeAimPoint(origin);
    const shape = resolveGroundShape(m.kind === 'circle'
        ? { kind: 'circle', radius: m.reach }
        : { kind: 'cone', length: m.reach, angle: m.angle });
    // A ring is centred on the caster; a cone points at the aim point.
    const point = m.kind === 'circle' ? origin : aim;
    const live = () => {
        try { return typeof globalThis._egIsActive !== 'function' || !!globalThis._egIsActive(); } catch (e) { return false; }
    };
    const inside = () => _uspLivingMonsters().filter((mon) => {
        const card = document.getElementById(`eg-card-${mon.id}`);
        if (!card) return false;
        const r = card.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        return shapeHitsRect(shape, point, origin, r);
    });
    // Single-victim strikes: the melee target (orange box) when inside the
    // strike area, else the nearest monster inside it.
    const pickOne = (list) => {
        if (!list.length) return [];
        const chosen = list.find((mon) => mon.id === _uspMeleeVictimId());
        if (chosen) return [chosen];
        let best = list[0];
        let bestD = Infinity;
        for (const mon of list) {
            const card = document.getElementById(`eg-card-${mon.id}`);
            const c = card && typeof globalThis._egGetElementCentre === 'function' ? globalThis._egGetElementCentre(card) : null;
            const d = c ? Math.hypot(c.x - origin.x, c.y - origin.y) : Infinity;
            if (d < bestD) { best = mon; bestD = d; }
        }
        return [best];
    };
    const victims = () => (m.all ? inside().slice(0, 8) : pickOne(inside()));

    showSpellZone(shape, point, origin, spell.theme, 420, 'burst');
    try { _uspMeleeSwing(spell, origin, aim); } catch (e) { /* swing is cosmetic */ }
    const first = victims();
    // hits > 1: rapid repeat strikes (Blade Flurry, Dance of Blades...). The
    // first volley takes the victims picked above; later ones re-check the area
    // for area strikes and stay on the same (still living) victims otherwise.
    const hits = Math.max(1, Math.round(m.hits || 1));
    const hitGap = m.hitDelayMs || 110;
    for (let h = 0; h < hits; h++) {
        setTimeout(() => {
            if (!live()) return;
            const list = h === 0 ? first
                : (m.all ? inside().slice(0, 8)
                    : first.filter((v) => _uspLivingMonsters().some((mon) => mon.id === v.id)));
            list.forEach((mon, i) => {
                setTimeout(() => {
                    if (!live()) return;
                    _uspStrike(spell, mon.id, spell.dmg[0], spell.dmg[1], { isMelee: true, isAoE: !!m.all, meleeHits: hits });
                }, i * 50);
            });
        }, h * hitGap);
    }
    // Stagger: the victims' attack charge freezes for a while (same channel
    // the Stagger gear stat uses).
    if (m.stagger && first.length) {
        const until = Date.now() + m.stagger;
        first.forEach((mon) => {
            mon.staggeredUntil = Math.max(mon.staggeredUntil || 0, until);
            try {
                if (typeof globalThis._egShowStatusLabel === 'function') {
                    globalThis._egShowStatusLabel(mon.id, (typeof LANG !== 'undefined' && LANG === 'de') ? 'BENOMMEN' : 'STAGGERED');
                }
            } catch (e) { /* label is cosmetic */ }
        });
    }
    // Life restored when the swing connects (Vampiric Strike).
    if (m.healPct && first.length) {
        try {
            const maxHP = Number(globalThis.playerMaxHP) || 0;
            const heal = Math.round(maxHP * m.healPct / 100);
            if (heal > 0 && typeof globalThis.playerCurrentHP !== 'undefined') {
                globalThis.playerCurrentHP = Math.min(maxHP, globalThis.playerCurrentHP + heal);
                if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
                if (typeof globalThis.showCombatToast === 'function') globalThis.showCombatToast('🩸 +' + heal, '#ff6b81');
            }
        } catch (e) { /* heal is best-effort */ }
    }

    // Damage-over-time follow-up (Rend bleeds one victim, Blade Vortex keeps
    // spinning): re-checks the area each second.
    if (spell.behavior === 'ticks') {
        const td = spell.tickDmg || spell.dmg;
        const total = spell.ticks || 3;
        const lockId = (!m.all && first[0]) ? first[0].id : null;
        for (let i = 0; i < total; i++) {
            setTimeout(() => {
                if (!live()) return;
                if (m.all) {
                    showSpellZone(shape, point === origin ? getAvatarCentre() || origin : point, getAvatarCentre() || origin, spell.theme, 350, 'burst');
                    inside().slice(0, 8).forEach((mon) => _uspStrike(spell, mon.id, td[0], td[1], { isMelee: true, isDot: true, isTick: true }));
                } else if (lockId && _uspLivingMonsters().some((mon) => mon.id === lockId)) {
                    _uspStrike(spell, lockId, td[0], td[1], { isDot: true, isTick: true });
                }
            }, (i + 1) * 1000);
        }
    }
    return first.length;
}

// Applies a GROUND-kind spell at the placed point: everything whose card
// overlaps the spell's shape is hit. The shape is the SAME one the reticle
// showed (resolveGroundShape), so what you aimed at is what lands.
//   delayed  telegraph the spot, strike after delayMs (Meteor, Blade Blast)
//   ticks    a lingering field: an opening hit, then one hit per second on
//            whatever stands inside at that moment (Blizzard, Rain of Fire)
//   starfall the counted blades crash from above onto random enemies
//            inside the placed shape (Bladefall)
//   other    instant blast, repeated `count` times for volley spells
//            (beams / cones: Cone of Cold, Disintegrate, ...)
function _uspApplyGroundSpell(spell, point) {
    const shape = resolveGroundShape(spell.ground);
    if (!shape || !point) return;
    const origin = getAvatarCentre();
    const live = () => {
        try { return typeof globalThis._egIsActive !== 'function' || !!globalThis._egIsActive(); } catch (e) { return false; }
    };
    const victims = () => _uspLivingMonsters().filter((m) => {
        const card = document.getElementById(`eg-card-${m.id}`);
        if (!card) return false;
        const r = card.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        return shapeHitsRect(shape, point, origin, r);
    }).slice(0, 8);
    const dmg = spell.dmg;

    if (spell.behavior === 'delayed') {
        const delayMs = spell.delayMs || 900;
        showSpellZone(shape, point, origin, spell.theme, delayMs + 150, 'telegraph');
        // Blade Blast - the delivery IS the visual: a bomb-lashed blade is
        // hurled onto the square and sticks there, bomb ticking, until the
        // detonation below lands.
        if (spell.id === 'usp_blade_blast') {
            try { _uspBladeBlastPlant(spell, origin, point, delayMs); } catch (e) { /* throw is cosmetic */ }
        }
        setTimeout(() => {
            if (!live()) return;
            showSpellZone(shape, point, origin, spell.theme, 600, 'burst');
            victims().forEach((m, i) => {
                setTimeout(() => {
                    if (!live()) return;
                    _uspStrike(spell, m.id, dmg[0], dmg[1], { fromSky: true, isAoE: true, isBig: true });
                }, i * 70);
            });
        }, delayMs);
        return;
    }

    if (spell.behavior === 'starfall') {
        const n = spell.count || 6;
        showSpellZone(shape, point, origin, spell.theme, n * 260 + 500, 'burst');
        for (let i = 0; i < n; i++) {
            setTimeout(() => {
                if (!live()) return;
                const pool = victims();
                if (!pool.length) return;
                const m = pool[Math.floor(Math.random() * pool.length)];
                _uspStrike(spell, m.id, dmg[0], dmg[1], { fromSky: true, isAoE: true });
            }, i * 260);
        }
        return;
    }

    if (spell.behavior === 'ticks') {
        const td = spell.tickDmg || dmg;
        const total = spell.ticks || 3;
        const zoneEl = showSpellZone(shape, point, origin, spell.theme, (total + 0.5) * 1000, 'zone');
        try { _uspZoneRain(spell, zoneEl); } catch (e) { /* weather is cosmetic */ }
        victims().forEach((m) => _uspStrike(spell, m.id, dmg[0], dmg[1], { isDot: true, isAoE: true }));
        for (let i = 0; i < total; i++) {
            setTimeout(() => {
                if (!live()) return;
                victims().forEach((m) => _uspStrike(spell, m.id, td[0], td[1], { isDot: true, isTick: true }));
            }, (i + 1) * 1000);
        }
        return;
    }

    const pulses = (spell.behavior === 'volley') ? (spell.count || 3) : 1;
    const step = spell.volleyDelayMs || 200;
    for (let i = 0; i < pulses; i++) {
        setTimeout(() => {
            if (!live()) return;
            const zoneEl = showSpellZone(shape, point, origin, spell.theme, 450, 'burst');
            try { _uspZoneBlast(spell, zoneEl); } catch (e) { /* blast is cosmetic */ }
            if (spell.id === 'usp_multi_shot') {
                try { _uspArrowFan(spell, origin, point); } catch (e) { /* fan is cosmetic */ }
            }
            victims().forEach((m) => _uspStrike(spell, m.id, dmg[0], dmg[1], { isAoE: true, volleyIndex: i }));
        }, i * step);
    }
}

// Arms the aiming reticle for a ground spell. Nothing is spent here: the
// click re-enters castUniversalSpell with `groundPoint`, which runs the normal
// cooldown / mana gates and then lands the effect.
function _uspBeginGroundTargeting(spell) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const spellId = spell.id;
    return beginSpellTargeting({
        id: spellId,
        spec: spell.ground,
        theme: spell.theme,
        hint: de ? 'Klick: wirken · Rechtsklick / Esc: abbrechen' : 'Click: cast · Right-click / Esc: cancel',
        onConfirm: (point) => {
            try {
                if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
                if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) return;
            } catch (e) { return; }
            if (!isSkillCharmUnlocked(spellId)) return;
            if (Date.now() < (Number(globalThis._egPlayerStunnedUntil) || 0)) {
                if (typeof globalThis.showToast === 'function') globalThis.showToast(t('eg_stunned'), '#ff6b9d');
                return;
            }
            noteCharmCast(spellId);
            castUniversalSpell(spellId, { groundPoint: point });
        },
    });
}

//------------------------------------------------------------------------
//------------------------SUSTAINED SPELLS (spell pass 2)-----------------
//------------------------------------------------------------------------
// channel / charge / toggle. The press-and-hold bookkeeping of the first two
// lives in spell-casttime.js (it owns the hold, the bar and the input
// listeners) and calls fireUniversalChannelTick / endUniversalChannel here;
// a released charge re-enters castUniversalSpell with opts.chargePower. The
// toggle auras are fully owned by this file.

const _uspAuras = {};   // spellId -> { timer }

export function isUniversalAuraActive(spellId) {
    return !!_uspAuras[spellId];
}

function _uspNoManaToast() {
    Audio_Manager.playSFX('spell_fizzle');
    Audio_Manager.playSFX('mana_empty');
    if (typeof globalThis.showToast !== 'function') return;
    let key = 'cls_no_mana';
    try { if (_bloodMagicActive()) key = 'cls_no_life'; } catch (e) { /* mana wording */ }
    globalThis.showToast(t(key));
}

function _uspEncounterLive() {
    try { return typeof globalThis._egIsActive !== 'function' || !!globalThis._egIsActive(); } catch (e) { return false; }
}

function _uspPlayerDead() {
    try { return typeof globalThis.dead !== 'undefined' && !!globalThis.dead; } catch (e) { return true; }
}

// Per-cast bookkeeping shared by every sustained spell's FIRST action.
function _uspSustainedCastBegan(spell) {
    _uspPlaySfx(spell);
    try {
        if (typeof globalThis.updateQuestStats === 'function') updateQuestStats('classAbilityUsed', {});
        if (typeof globalThis.triggerSkillBanter === 'function') globalThis.triggerSkillBanter(spell.id);
    } catch (e) { /* non-combat progress is best-effort */ }
}

// One channel tick: pays mana x tickSeconds and hits the selected monster
// (else the first living one). Returns false when the channel must end - dead,
// fight over, nothing to hit, or out of mana.
const _uspChannelTicksHeld = {};   // spellId -> ticks fired in the current hold

export function fireUniversalChannelTick(spellId, isFirst) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell || !spell.channel) return false;
    if (_uspPlayerDead() || !_uspEncounterLive()) return false;
    const living = _uspLivingMonsters();
    if (!living.length) return false;
    let victim = null;
    try {
        const sel = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null;
        if (sel) victim = living.find((m) => m.id === sel.id) || null;
    } catch (e) { victim = null; }
    if (!victim) victim = living[0];

    // Ramping channels (Disintegrate) cost more per tick the longer the hold.
    if (isFirst) _uspChannelTicksHeld[spellId] = 0;
    const heldSec = (_uspChannelTicksHeld[spellId] || 0) * spell.channel.tickSeconds;
    const ramp = spell.channel.costRampPerSecond
        ? Math.min(spell.channel.costRampMax || 1, 1 + spell.channel.costRampPerSecond * heldSec)
        : 1;
    const cost = getUniversalSpellManaCost(spellId) * spell.channel.tickSeconds * ramp;
    if (!payAbilityCost(cost)) {
        _uspNoManaToast();
        return false;
    }
    if (isFirst) _uspSustainedCastBegan(spell);
    _uspChannelTicksHeld[spellId] = (_uspChannelTicksHeld[spellId] || 0) + 1;
    _uspStrike(spell, victim.id, spell.dmg[0], spell.dmg[1], { isChannelTick: true });
    return true;
}

// The channel is over (release / out of mana / interrupted): starts the cooldown.
export function endUniversalChannel(spellId, ticks) {
    if (ticks > 0) startUniversalSpellCooldown(spellId);
    try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
}

// One aura pulse: pays a second of mana and hits everything in the ring.
// Returns false when the aura must switch off.
function _uspPulseAura(spell) {
    if (_uspPlayerDead() || !_uspEncounterLive()) return false;
    try { if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) return true; } catch (e) { /* not paused */ }
    const interval = spell.aura.intervalSeconds || 1;
    // Ramping auras (Vortex) cost more per pulse the longer they stay up.
    const st = _uspAuras[spell.id];
    const upSec = st ? (st.pulses || 0) * interval : 0;
    const ramp = spell.aura.costRampPerSecond
        ? Math.min(spell.aura.costRampMax || 1, 1 + spell.aura.costRampPerSecond * upSec)
        : 1;
    if (!payAbilityCost(getUniversalSpellManaCost(spell.id) * interval * ramp)) {
        _uspNoManaToast();
        return false;
    }
    if (st) st.pulses = (st.pulses || 0) + 1;
    const origin = getAvatarCentre() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const shape = resolveGroundShape({ kind: 'circle', radius: spell.aura.radius });
    showSpellZone(shape, origin, origin, spell.theme, 450, 'burst');
    try { _uspAuraPulse(spell.id); } catch (e) { /* flash is cosmetic */ }
    _uspLivingMonsters().filter((mon) => {
        const card = document.getElementById(`eg-card-${mon.id}`);
        if (!card) return false;
        const r = card.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        return shapeHitsRect(shape, origin, origin, r);
    }).slice(0, 8).forEach((mon, i) => {
        setTimeout(() => {
            if (!_uspAuras[spell.id] || !_uspEncounterLive()) return;
            _uspStrike(spell, mon.id, spell.dmg[0], spell.dmg[1], { isMelee: true, isAoE: true });
        }, i * 40);
    });
    return true;
}

function _uspStopAura(spellId, withCooldown) {
    const a = _uspAuras[spellId];
    if (!a) return;
    if (a.timer) clearTimeout(a.timer);
    delete _uspAuras[spellId];
    try { _uspAuraClear(spellId); } catch (e) { /* visual is cosmetic */ }
    if (withCooldown) startUniversalSpellCooldown(spellId);
    try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
}

// Switches every running aura off (round end / reset). No cooldown.
export function stopAllUniversalAuras() {
    Object.keys(_uspAuras).forEach((id) => _uspStopAura(id, false));
}

function _uspStartAura(spell) {
    const spellId = spell.id;
    if (!canAffordUniversalSpell(spellId)) {
        _uspNoManaToast();
        return false;
    }
    _uspAuras[spellId] = { timer: null, pulses: 0 };
    _uspSustainedCastBegan(spell);
    try { _uspAuraShow(spell, spell.aura.radius); } catch (e) { /* visual is cosmetic */ }
    if (!_uspPulseAura(spell)) {
        _uspStopAura(spellId, false);
        return false;
    }
    const intervalMs = Math.round((spell.aura.intervalSeconds || 1) * 1000);
    const run = () => {
        const a = _uspAuras[spellId];
        if (!a) return;
        if (!_uspPulseAura(spell)) { _uspStopAura(spellId, true); return; }
        a.timer = setTimeout(run, intervalMs);
    };
    _uspAuras[spellId].timer = setTimeout(run, intervalMs);
    try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
    return true;
}

//------------------------------------------------------------------------
//-------------------------REACTION WINDOWS-------------------------------
//------------------------------------------------------------------------
// Reaction strikes (def.reaction = 'parry' | 'block' | 'dodge') can only be
// cast shortly AFTER the player avoided a hit that way. The combat damage path
// reports each success through noteUniversalReaction(); the hotbar lights the
// matching spells up while the window is open and casting one spends it.
const USP_REACTION_WINDOW_MS = { parry: 5000, block: 5000, dodge: 4000 };
const _uspReactionUntil = { parry: 0, block: 0, dodge: 0 };
const _uspReactionTimer = {};

export function isUniversalReactionReady(kind) {
    return Date.now() < (_uspReactionUntil[kind] || 0);
}

// Remaining ms of a spell's reaction window ('ready' false once it lapsed).
// Null for spells without a reaction requirement.
export function getUniversalSpellReaction(spellId) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell || !spell.reaction) return null;
    const remaining = Math.max(0, (_uspReactionUntil[spell.reaction] || 0) - Date.now());
    return { kind: spell.reaction, ready: remaining > 0, remainingMs: remaining };
}

// Called by the damage path on every successful parry / block / dodge.
export function noteUniversalReaction(kind) {
    if (!USP_REACTION_WINDOW_MS[kind]) return;
    _uspReactionUntil[kind] = Date.now() + USP_REACTION_WINDOW_MS[kind];
    // Only bother the hotbar when a spell on it actually listens for this.
    let relevant = false;
    try {
        relevant = (STATE.skillHotbar || []).some((id) => {
            const d = id ? UNIVERSAL_SPELL_MAP[id] : null;
            return d && d.reaction === kind;
        });
    } catch (e) { relevant = false; }
    if (!relevant) return;
    try { Audio_Manager.playSFX('spell_cooldown_ready'); } catch (e) { /* audio is best-effort */ }
    try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
    clearTimeout(_uspReactionTimer[kind]);
    _uspReactionTimer[kind] = setTimeout(() => {
        try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
    }, USP_REACTION_WINDOW_MS[kind] + 60);
}

// Drops every open window (encounter end / reset).
export function clearUniversalReactions() {
    Object.keys(_uspReactionUntil).forEach((k) => { _uspReactionUntil[k] = 0; });
    try { renderSkillHotbar(); } catch (e) { /* hotbar is best-effort */ }
}

function _uspReactionToast(spell) {
    const de = typeof LANG !== 'undefined' && LANG === 'de';
    const what = { parry: de ? 'einer Parade' : 'a parry', block: de ? 'einem Block' : 'a block', dodge: de ? 'einem Ausweichen' : 'a dodge' }[spell.reaction];
    const name = de ? (spell.nameDE || spell.nameEn) : spell.nameEn;
    const msg = de ? `${spell.icon} ${name} geht nur direkt nach ${what}!` : `${spell.icon} ${name} only works right after ${what}!`;
    if (typeof globalThis.showCombatToast === 'function') globalThis.showCombatToast(msg, '#ff8a65');
    else if (typeof globalThis.showToast === 'function') globalThis.showToast(msg, '#ff8a65');
}

// Main entry: cast a universal spell by id. Returns true if cast.
// `opts.chargePower` (0.6 - 1.5) is set when a charged spell is released;
// without it a charge spell fires at normal strength.
// `opts.groundPoint` ({x, y} viewport px) is set by the reticle's confirm
// click for ground-kind spells; without it a ground spell only ARMS the reticle.
export function castUniversalSpell(spellId, opts) {
    const spell = getUniversalSpellDef(spellId);
    if (!spell) return false;
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return false;
    } catch (e) {}

    // One reticle at a time. Pressing the spell that is already aiming
    // cancels it (tap again to back out); any other cast replaces it.
    const groundPoint = opts && opts.groundPoint;
    if (isSpellTargeting()) {
        const same = isSpellTargeting(spellId);
        cancelSpellTargeting();
        if (same && !groundPoint) return true;
    }

    // A running aura is switched OFF by the same tap that switched it on -
    // always allowed (no mana, cooldown or target needed to stop it).
    const isToggle = getUniversalSpellCastKind(spell) === 'toggle';
    if (isToggle && isUniversalAuraActive(spellId)) {
        _uspStopAura(spellId, true);
        return true;
    }

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
    // Ground spells aim at a spot, not a target - they only need the fight.
    const isGround = getUniversalSpellCastKind(spell) === 'ground';
    // Melee spells swing at whatever is around - they need the fight, not a target.
    const isMelee = getUniversalSpellCastKind(spell) === 'melee';
    const living = _uspLivingMonsters();
    let target = null;
    try { target = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null; } catch (e) {}
    if (!encounterOn || (!(isSupport || isMovement || isGround || isMelee || isToggle) && (living.length === 0 || !target))) {
        _uspNoTargetToast(spell);
        return false;
    }

    // Leap Strike jumps TO a monster: with none alive nothing is spent.
    if (spell.behavior === 'leap' && encounterOn && living.length === 0) {
        if (typeof globalThis.showToast === 'function') {
            const de = (typeof LANG !== 'undefined' && LANG === 'de');
            globalThis.showToast(de ? `🔮 ${spell.nameDE} braucht ein Monster als Ziel!` : `🔮 ${spell.nameEn} needs a monster target!`, '#7fb3ff');
        }
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
    if (getUniversalSpellCooldownRemaining(spellId) > 0) {
        Audio_Manager.playSFX('spell_fizzle');
        return false;
    }

    // Reaction strikes: refused (nothing spent) until the matching parry /
    // block / dodge has just happened.
    if (spell.reaction && !isUniversalReactionReady(spell.reaction)) {
        Audio_Manager.playSFX('spell_fizzle');
        _uspReactionToast(spell);
        return false;
    }

    // Toggle auras: switch on (pays a second of mana up front, then drains).
    if (isToggle) return _uspStartAura(spell);

    // Ground spells: the tap only arms the reticle (after a cheap "can I even
    // afford it" look, so you are not aiming a spell you cannot pay for).
    if (isGround && !groundPoint) {
        if (!canAffordUniversalSpell(spellId)) {
            Audio_Manager.playSFX('spell_fizzle');
            Audio_Manager.playSFX('mana_empty');
            if (typeof globalThis.showToast === 'function') {
                let noMana = 'cls_no_mana';
                try {
                    if (_bloodMagicActive()) noMana = 'cls_no_life';
                } catch (e) {}
                globalThis.showToast(t(noMana));
            }
            return false;
        }
        return _uspBeginGroundTargeting(spell);
    }

    // Cleansing spells need an ailment they can actually remove; refused
    // casts spend nothing and say why (nothing to cleanse / ailment too strong).
    if (spell.cleanses) {
        let plan = { removed: [], blocked: [] };
        try {
            if (typeof globalThis._egCleansePlayerAilments === 'function') {
                plan = globalThis._egCleansePlayerAilments(spell.cleanses, _uspCleanseMaxLevel(spell), true);
            }
        } catch (e) { /* ailments module not ready */ }
        if (!plan.removed.length) {
            Audio_Manager.playSFX('spell_fizzle');
            const de = typeof LANG !== 'undefined' && LANG === 'de';
            let msg;
            if (plan.blocked.length) {
                const need = _uspCleanseRankFor(Math.max.apply(null, plan.blocked.map(b => b.level)));
                msg = de ? `${spell.icon} Zu stark (Lv ${plan.blocked[0].level})! Braucht Rang ${need}`
                         : `${spell.icon} Too strong (Lv ${plan.blocked[0].level})! Needs rank ${need}`;
            } else {
                msg = de ? `${spell.icon} Nichts zu reinigen!` : `${spell.icon} Nothing to cleanse!`;
            }
            if (typeof globalThis.showCombatToast === 'function') globalThis.showCombatToast(msg, '#ff8a65');
            else if (typeof globalThis.showToast === 'function') globalThis.showToast(msg, '#ff8a65');
            return false;
        }
    }

    // Gauntlet-only spells refuse to cast anywhere else (puzzles, parry
    // training, between waves) - before any mana or cooldown is spent.
    if (spell.gauntletOnly) {
        let inArena = false;
        try { inArena = typeof globalThis._egGauntletFighting === 'function' && globalThis._egGauntletFighting(); } catch (e) {}
        if (!inArena) {
            Audio_Manager.playSFX('spell_fizzle');
            const msg = (typeof LANG !== 'undefined' && LANG === 'de') ? '🔎 Nur im Gauntlet nutzbar!' : '🔎 Gauntlet only!';
            if (typeof globalThis.showCombatToast === 'function') globalThis.showCombatToast(msg, '#ff8a65');
            else if (typeof globalThis.showToast === 'function') globalThis.showToast(msg, '#ff8a65');
            return false;
        }
    }

    // Mana (life under Blood Magic) gate - spend nothing on failure.
    const cost = getUniversalSpellManaCost(spellId);
    if (!payAbilityCost(cost)) {
        if (typeof globalThis.showToast === 'function') {
            let noMana = 'cls_no_mana';
            try {
                if (_bloodMagicActive()) noMana = 'cls_no_life';
            } catch (e) {}
            globalThis.showToast(t(noMana));
        }
        return false;
    }

    // The reaction window is spent by the cast (one follow-up per avoided hit).
    if (spell.reaction) {
        _uspReactionUntil[spell.reaction] = 0;
        clearTimeout(_uspReactionTimer[spell.reaction]);
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
        {
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
        {
            try { renderSkillHotbar(); } catch (e) {}
        }
        return true;
    }

    // Melee family: swings beside the hero and checks what it reached. A
    // swing that finds nothing still costs the cast (it was a real swing).
    if (isMelee) {
        _uspApplyMeleeSpell(spell);
        {
            try { renderSkillHotbar(); } catch (e) {}
        }
        return true;
    }

    // Ground family: lands on the placed spot, not on the targeted monster.
    if (isGround) {
        _uspApplyGroundSpell(spell, groundPoint);
        {
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
                    _uspStrike(spell, targetId, spell.dmg[0], spell.dmg[1], { volleyIndex: i, volleyTotal: n });
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
            // landing across all of them with nova rings. A released charge
            // (Flameblast) scales the landing by the held power - damage and
            // blast size both grow with the hold.
            const delayMs = spell.delayMs || 900;
            const pw = (opts && opts.chargePower) || 1;
            const lo = Math.max(1, Math.round(spell.dmg[0] * pw));
            const hi = Math.max(1, Math.round(spell.dmg[1] * pw));
            try {
                {
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
                            _uspStrike(spell, m.id, lo, hi, { fromSky: true, isAoE: true, blastPower: pw, isBig: pw >= 1.3 });
                        }, i * 70);
                    });
                    return;
                }
                const stillAlive = _uspLivingMonsters().some((m) => m.id === targetId);
                if (!stillAlive) return;
                _uspStrike(spell, targetId, lo, hi, { fromSky: true, isBig: true, blastPower: pw });
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
            // 'single' - one projectile, one impact. A released charge
            // scales the hit by how long the button was held.
            const pw = (opts && opts.chargePower) || 1;
            _uspStrike(spell, targetId,
                Math.max(1, Math.round(spell.dmg[0] * pw)), Math.max(1, Math.round(spell.dmg[1] * pw)),
                pw >= 1.3 ? { isBig: true } : {});
            break;
        }
    }

    {
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
    // Order-independent by design: the two skills modules import each other,
    // so this can be called while either is still mid-evaluation. See the
    // note at skill-registry.js:891 and the self-call at the end of this
    // file. A call that lands too early is a no-op, not a crash; the other
    // call site completes the registration. Idempotent by construction.
    try {
        // Read straight through: if SKILL_REGISTRY is still in its temporal
        // dead zone the outer catch swallows it and the other call site wins.
        // (`typeof` would NOT have protected this - it throws on a
        // declared-but-uninitialised binding.)
        const registry = SKILL_REGISTRY;
        if (!registry) return;
        for (const spell of UNIVERSAL_SPELL_DEFS) {
            if (registry[spell.id]) continue;
            registry[spell.id] = {
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
    } catch (e) {
        // Universal spells are not initialised yet - the sibling call site
        // (the skill-registry bootstrap, or the self-call below) runs it.
    }
}

// "Scales with" line: Spell Damage (or Attack Damage for physical) + the
// design damage kind + the behaviour tags the future Probability Tree hooks onto.
function _uspScalingLine(spell) {
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
        shadow: 'Shadow Damage', holy: 'Holy Damage',
        physical: 'Physical Damage',
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
            stopAllUniversalAuras();
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

// Register here as well, at the end of this module body, so registration
// completes no matter which of the two skills modules the bundler happens
// to evaluate first. Idempotent: _registerUniversalSpells skips ids the
// registry already holds.
_registerUniversalSpells();