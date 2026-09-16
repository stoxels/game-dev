import { isEndgameLevel } from '../mouse-button-handlers.js';
import { save } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { ASCENDENCY_DEFS } from '../classes/ascendency-defs.js';
import { cooldownState, getEffectiveCooldown } from '../classes/class-cooldown-state.js';
import { CLASS_DEFS, CLASS_SPELL_ICONS, ENDGAME_HEARTBLOOM_DEF } from '../classes/class-defs.js';
import { _abilityCanAfford, _getAbilityManaCost } from '../classes/class-mana.js';
import { getSkillCastRankClamped, getSkillCastRankFull, getSpellRankDamageMult, isSkillCharmUnlocked, noteCharmCast } from './skill-charms.js';
import { UNIVERSAL_SPELL_DEFS, _registerUniversalSpells, _uspGroupTitle, _uspMovementGroupTitle, _uspSupportGroupTitle, canAffordUniversalSpell, castUniversalSpell, getUniversalSpellCooldownRemaining, getUniversalSpellDamageEstimate, getUniversalSpellEffectiveCooldown, getUniversalSpellManaCost, isUniversalMovementSpell, isUniversalSpellUnlocked, isUniversalSupportSpell } from './universal-spells.js';
//--- Phase 3 step 5: live accessors (external write sites stay untouched) ---
try { Object.defineProperty(globalThis, 'getPlayerSkillIds', { get() { return getPlayerSkillIds; }, set(v) { getPlayerSkillIds = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'getPlayerSkillGroups', { get() { return getPlayerSkillGroups; }, set(v) { getPlayerSkillGroups = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'ensureSkillHotbar', { get() { return ensureSkillHotbar; }, set(v) { ensureSkillHotbar = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'setHotbarSlot', { get() { return setHotbarSlot; }, set(v) { setHotbarSlot = v; }, configurable: true }); } catch (e) {}
// skill-registry.js
//------------------------------------------------------------------------
//---------------------------SKILL REGISTRY-------------------------------
//------------------------------------------------------------------------
// Single source of truth for every CASTABLE skill in the game. The spell
// book, the hotbar, their tooltips and the keybind routing all read from
// here, so adding a new spell later means adding one entry (plus its
// execution wiring) rather than touching UI code.
//
// Existing class abilities are NOT re-declared: the registry is built at
// load time from CLASS_DEFS / ASCENDENCY_DEFS / ENDGAME_HEARTBLOOM_DEF so
// their names, descriptions, mana costs, cooldowns and effects keep living
// in exactly one place. This file only adds the extra metadata those defs
// do not carry (tags, scaling, reveal-projectile damage, passive flags).
//
// Skill ids are stable strings:
//   <classId>_active1     e.g. mathmagician_active1   (Arcane Reveal)
//   <classId>_active2     e.g. statistician_active2   (Diagonal Strike)
//   <ascId>_active1       e.g. outlier_active1        (Tail Risk)
//   <ascId>_active2       e.g. markovian_active2      (Transition Matrix)
//   heartbloom            universal endgame skill
//
// Each castable skill resolves to a "legacy slot" (active1…active5) - the
// key the existing execution + cooldown engine already understands. For the
// current roster that mapping is 1:1 per player, so cooldowns stay per-skill
// without touching the class ability files.
//------------------------------------------------------------------------

// Number of hotbar slots (2 rows of 5). Keep in sync with the CSS grid.
export const SKILL_HOTBAR_SIZE = 10;

// Hotbar layout: 5 columns per row.
export const SKILL_HOTBAR_COLS = 5;

// Legacy slot used by a skill that has no class/ascendency route.
export const HEARTBLOOM_SKILL_ID = 'heartbloom';


//------------------------------------------------------------------------
//------------------------STATIC METADATA---------------------------------
//------------------------------------------------------------------------
// Extra info the ability defs do not carry. Keyed by skill id.
//
//   tags    - the PoE-style type line ("Spell, AoE, Duration")
//   scaling - what the skill's numbers grow with (shown as "Scales with")
//   damage  - null for non-damaging skills, otherwise:
//               count(effect, level) → how many reveal projectiles it fires
//               perHit: [[min,max] per rank] → reference damage per hit
//             The live endgame value (gear-scaled) overrides perHit when an
//             encounter is running (see getSkillDamage()).
//   castTime - 'instant' | 'channel' | null, purely informational
//------------------------------------------------------------------------

export const SKILL_META = {
    // ── BASE CLASS ACTIVES ──────────────────────────────────────────────
    mathmagician_active1: {
        tags: ['Spell', 'Reveal', 'Area'],
        scaling: ['Spell Damage', 'Area of Effect', 'Cooldown Recovery'],
        damage: { count: (e) => e.maxReveals || 4, perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    mathmagician_active2: {
        tags: ['Spell', 'Duration', 'Buff'],
        scaling: ['Buff Duration', 'Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    statistician_active1: {
        tags: ['Attack', 'Reveal', 'Line'],
        scaling: ['Attack Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.revealCap || 5, perHit: [[7, 10], [9, 13], [11, 16]] },
        castTime: 'instant',
    },
    statistician_active2: {
        tags: ['Attack', 'Reveal', 'Line', 'Area'],
        scaling: ['Attack Damage', 'Area of Effect', 'Cooldown Recovery'],
        damage: { count: (e) => e.revealCap || 5, perHit: [[7, 10], [9, 13], [11, 16]] },
        castTime: 'instant',
    },
    probabilist_active1: {
        tags: ['Attack', 'Reveal', 'Mark'],
        scaling: ['Attack Damage', 'Mark Count', 'Cooldown Recovery'],
        damage: { count: (e, lvl) => [5, 6, 7][lvl - 1] || 5, perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    probabilist_active2: {
        tags: ['Attack', 'Area', 'Scan'],
        scaling: ['Attack Damage', 'Area of Effect', 'Cooldown Recovery'],
        damage: { count: (e) => (e.scanSize || 2) * (e.scanSize || 2), perHit: [[5, 8], [7, 10], [9, 13]] },
        castTime: 'instant',
    },

    // ── ASCENDENCY ACTIVES ──────────────────────────────────────────────
    outlier_active1: {
        tags: ['Spell', 'Reveal', 'Sacrifice'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.maxCells || 10, perHit: [[8, 12], [10, 15], [12, 18]] },
        castTime: 'instant',
    },
    outlier_active2: {
        tags: ['Spell', 'Duration', 'Buff'],
        scaling: ['Buff Duration', 'Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    actuary_active1: {
        tags: ['Spell', 'Reveal', 'Recovery'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => (e.revealCount || 1) * (e.correctCount || 1), perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    actuary_active2: {
        tags: ['Spell', 'Utility', 'Protection'],
        scaling: ['Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    recursionist_active1: {
        tags: ['Spell', 'Reveal', 'Companion'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.revealCount || e.maxReveals || 4, perHit: [[7, 10], [9, 13], [11, 16]] },
        castTime: 'instant',
    },
    recursionist_active2: {
        tags: ['Spell', 'Utility', 'Choice'],
        scaling: ['Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    markovian_active1: {
        tags: ['Spell', 'Time', 'Utility'],
        scaling: ['Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    markovian_active2: {
        tags: ['Spell', 'Cascade', 'Reveal'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.maxDepth || 3, perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    bayesian_active1: {
        tags: ['Spell', 'Trap', 'Utility'],
        scaling: ['Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
    },
    bayesian_active2: {
        tags: ['Spell', 'Shield', 'Reveal'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.bonusReveal || 1, perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    random_walker_active1: {
        tags: ['Spell', 'Summon', 'Companion'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: (e) => e.paths || 1, perHit: [[6, 9], [8, 12], [10, 15]] },
        castTime: 'instant',
    },
    random_walker_active2: {
        tags: ['Spell', 'Summon', 'Companion'],
        scaling: ['Spell Damage', 'Cooldown Recovery'],
        damage: { count: () => 1, perHit: [[8, 12], [10, 15], [12, 18]] },
        castTime: 'instant',
    },

    // ── UNIVERSAL ENDGAME SKILL ─────────────────────────────────────────
    heartbloom: {
        tags: ['Spell', 'Summon', 'Heart'],
        scaling: ['Cooldown Recovery'],
        damage: null,
        castTime: 'instant',
        endgameOnly: true,
    },
};


//------------------------------------------------------------------------
//--------------------------REGISTRY BUILD--------------------------------
//------------------------------------------------------------------------

// SKILL_REGISTRY: skill id → resolved skill record. Populated at load.
export const SKILL_REGISTRY = {};

// PASSIVE_SKILL_REGISTRY: skill id → passive record. Passives are shown in
// the class HUD/level-select tooltips but are never castable and therefore
// never appear in the spell book or the hotbar (see the movable check).
export const PASSIVE_SKILL_REGISTRY = {};

// Legacy slot key per source kind. Base actives reuse active1/active2,
// ascendency actives reuse active3/active4, heartbloom owns active5.
export const _SKILL_LEGACY_SLOT = {
    base1: 'active1',
    base2: 'active2',
    asc1: 'active3',
    asc2: 'active4',
    heartbloom: 'active5',
};

// Registers one castable skill from a source ability def.
export function _registerSkill(id, source, def, slotKind) {
    const meta = SKILL_META[id] || { tags: [], scaling: [], damage: null, castTime: 'instant' };
    SKILL_REGISTRY[id] = {
        id,
        icon: def.icon || _skillIconFor(id, source, slotKind),
        image: _skillImageFor(id),
        nameEn: def.nameEn,
        nameDE: def.nameDE,
        descCursorEn: def.descCursorEn,
        descCursorDE: def.descCursorDE,
        cooldownSeconds: def.cooldownSeconds || 0,
        manaCost: def.manaCost || 0,
        levels: def.levels,
        source,                 // { kind, ownerId, slot }
        legacySlot: _SKILL_LEGACY_SLOT[slotKind],
        slotKind,
        isPassive: false,
        movable: true,
        endgameOnly: meta.endgameOnly === true,
        tags: meta.tags || [],
        scaling: meta.scaling || [],
        damage: meta.damage || null,
        castTime: meta.castTime || 'instant',
    };
}

// Explicit icons for skills whose def carries none (ascendency actives).
export const SKILL_ICON_OVERRIDES = {
    outlier_active1: '📈', outlier_active2: '⚡',
    actuary_active1: '🛡️', actuary_active2: '📊',
    recursionist_active1: '🌀', recursionist_active2: '🎲',
    markovian_active1: '⏳', markovian_active2: '🔗',
    bayesian_active1: '🪤', bayesian_active2: '🧿',
    random_walker_active1: '🌊', random_walker_active2: '🧭',
};

// Per-skill artwork shipped in images/class_spell_upgrade/ (the same art the
// class-upgrade screen uses). The hotbar and spell book prefer these over the
// emoji/`def.icon` fallback whenever an entry exists here. Heartbloom has no
// artwork yet, so it keeps its glyph. Keyed by skill id.
export const SKILL_UPGRADE_IMAGES = {
    mathmagician_active1: 'arcane_reveal.webp',
    mathmagician_active2: 'absolute_zero.webp',
    mathmagician_passive: 'variance_shield.webp',
    statistician_active1: 'data_strike.webp',
    statistician_active2: 'diagonal_strike.webp',
    statistician_passive: 'momentum.webp',
    probabilist_active1: 'precision_shot.webp',
    probabilist_active2: 'rain_of_arrows.webp',
    probabilist_passive: 'bayesian_insight.webp',
    outlier_active1: 'tail_risk.webp',
    outlier_active2: 'speedforce.webp',
    actuary_active1: 'regression_to_prior.webp',
    actuary_active2: 'significance_threshold.webp',
    recursionist_active1: 'residual.webp',
    recursionist_active2: 'degrees_of_freedom.webp',
    markovian_active1: 'state_rollback.webp',
    markovian_active2: 'transition_matrix.webp',
    bayesian_active1: 'bayes_traps.webp',
    bayesian_active2: 'type1_error_shield.webp',
    random_walker_active1: 'brownian_motion.webp',
    random_walker_active2: 'drifter.webp',
};

// Folder (relative to index.html) holding SKILL_UPGRADE_IMAGES artwork.
export const SKILL_UPGRADE_IMAGE_DIR = 'images/class_spell_upgrade/';

// Resolves the artwork URL for a skill/passive id, or null when none exists.
export function _skillImageFor(id) {
    const file = SKILL_UPGRADE_IMAGES[id];
    return file ? SKILL_UPGRADE_IMAGE_DIR + file : null;
}

// Resolves a display icon for a skill. Precedence:
//   1. an explicit def.icon (heartbloom)
//   2. the per-class spell icon table (CLASS_SPELL_ICONS)
//   3. the SKILL_ICON_OVERRIDES table above (ascendencies)
export function _skillIconFor(id, source, slotKind) {
    if (SKILL_ICON_OVERRIDES[id]) return SKILL_ICON_OVERRIDES[id];
    if (source.kind === 'class' && typeof CLASS_SPELL_ICONS !== 'undefined') {
        const set = CLASS_SPELL_ICONS[source.ownerId];
        if (set) {
            if (slotKind === 'base1') return set.active1;
            if (slotKind === 'base2') return set.active2;
        }
    }
    return '✦';
}

// Registers a non-castable passive ability (Variance Shield, Momentum, …).
export function _registerPassive(id, def, source) {
    const classIcons = (typeof CLASS_SPELL_ICONS !== 'undefined' && CLASS_SPELL_ICONS[source.ownerId]) || null;
    PASSIVE_SKILL_REGISTRY[id] = {
        id,
        icon: def.icon || (classIcons && classIcons.passive) || '💠',
        image: _skillImageFor(id),
        nameEn: def.nameEn,
        nameDE: def.nameDE,
        levels: def.levels,
        source,
        isPassive: true,
        movable: false,
        tags: ['Passive'],
        scaling: [],
        damage: null,
    };
}

// Builds the registry from the class / ascendency / heartbloom defs.
// Runs once at load, after class-defs.js and ascendency-defs.js.
export function buildSkillRegistry() {
    if (typeof CLASS_DEFS !== 'undefined') {
        for (const classId of Object.keys(CLASS_DEFS)) {
            const cls = CLASS_DEFS[classId];
            if (cls.passive) _registerPassive(`${classId}_passive`, cls.passive, { kind: 'class', ownerId: classId, slot: 'passive' });
            if (cls.active1) _registerSkill(`${classId}_active1`, { kind: 'class', ownerId: classId, slot: 'active1' }, cls.active1, 'base1');
            if (cls.active2) _registerSkill(`${classId}_active2`, { kind: 'class', ownerId: classId, slot: 'active2' }, cls.active2, 'base2');
        }
    }

    if (typeof ASCENDENCY_DEFS !== 'undefined') {
        for (const ascId of Object.keys(ASCENDENCY_DEFS)) {
            const asc = ASCENDENCY_DEFS[ascId];
            if (asc.active1) _registerSkill(`${ascId}_active1`, { kind: 'ascendency', ownerId: ascId, slot: 'active1' }, asc.active1, 'asc1');
            if (asc.active2) _registerSkill(`${ascId}_active2`, { kind: 'ascendency', ownerId: ascId, slot: 'active2' }, asc.active2, 'asc2');
        }
    }

    if (typeof ENDGAME_HEARTBLOOM_DEF !== 'undefined' && ENDGAME_HEARTBLOOM_DEF) {
        _registerSkill(HEARTBLOOM_SKILL_ID, { kind: 'heartbloom', ownerId: null, slot: 'active1' }, ENDGAME_HEARTBLOOM_DEF, 'heartbloom');
    }
}


//------------------------------------------------------------------------
//--------------------------LOOKUP HELPERS--------------------------------
//------------------------------------------------------------------------

// Returns the castable skill record for an id, or null.
export function getSkillDef(skillId) {
    return SKILL_REGISTRY[skillId] || null;
}

// Returns the passive skill record for an id, or null.
export function getPassiveSkillDef(skillId) {
    return PASSIVE_SKILL_REGISTRY[skillId] || null;
}

// True if the id belongs to a passive (never movable into the hotbar).
export function isSkillPassive(skillId) {
    return !!PASSIVE_SKILL_REGISTRY[skillId];
}

// Upgrade artwork URL for a castable skill, or null when it has none.
export function getSkillImage(skillId) {
    const def = getSkillDef(skillId);
    return def ? (def.image || null) : null;
}

// Upgrade artwork URL for a passive ability, or null when it has none.
export function getPassiveSkillImage(passiveId) {
    const def = getPassiveSkillDef(passiveId);
    return def ? (def.image || null) : null;
}

// The character's innate traits (CHARACTERS, character-select.js). These are
// always-on abilities that are not class skills, so they are surfaced in the
// spell book's passive section rather than the hotbar.
export function getPlayerTraits() {
    if (typeof globalThis.CHARACTERS === 'undefined' || !globalThis.STATE || !globalThis.STATE.playerCharacter) return [];
    const char = globalThis.CHARACTERS[globalThis.STATE.playerCharacter];
    return (char && Array.isArray(char.traits)) ? char.traits : [];
}

// True if a skill may be placed into the hotbar. Sealed universal spells
// are refused (setHotbarSlot + startSkillDrag both funnel through here).
export function isSkillMovable(skillId) {
    const def = getSkillDef(skillId);
    if (!def || def.movable === false) return false;
    if (def.slotKind === 'universal' && typeof isUniversalSpellUnlocked === 'function') {
        try { if (!isUniversalSpellUnlocked(skillId)) return false; } catch (e) { /* treat as unlocked */ }
    }
    // Charm gate: a spell can only be placed on the hotbar while its charm
    // sits in one of the spell slots (js/skills/skill-charms.js).
    if (typeof isSkillCharmUnlocked === 'function') {
        try { if (!isSkillCharmUnlocked(skillId)) return false; } catch (e) { /* treat as unlocked */ }
    }
    return true;
}

// Returns the rank (1-based) of a castable skill for the current player.
export function getSkillLevel(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 1;
    switch (def.slotKind) {
        case 'base1': return globalThis.STATE.classActive1Level || 1;
        case 'base2': return globalThis.STATE.classActive2Level || 1;
        case 'asc1': return globalThis.STATE.ascendencySkill1Level || 1;
        case 'asc2': return globalThis.STATE.ascendencySkill2Level || 1;
        default: return 1;
    }
}

// Returns the level data object (desc, effect) for the rank the skill is
// actually CAST at. That is the slotted charm's rank when one is placed and
// the trained rank otherwise (js/skills/skill-charms.js), so slotting a rank-1
// charm makes every consumer of this - the spellbook/HUD description and the
// damage estimate's effect lookup - describe the rank-1 variant even while the
// character has the skill trained to rank 3. getSkillCastRankClamped also
// clamps to the authored level table, so indexing is always in range.
export function getSkillLevelData(skillId) {
    const def = getSkillDef(skillId);
    if (!def || !def.levels) return null;
    let lvl = getSkillLevel(skillId);
    if (typeof getSkillCastRankClamped === 'function') {
        const castRank = getSkillCastRankClamped(skillId);
        if (castRank) lvl = castRank;
    }
    lvl = Math.max(1, Math.min(lvl, def.levels.length));
    return def.levels[lvl - 1] || def.levels[0] || null;
}

// Returns the effect object for the skill's current rank, or {}.
export function getSkillEffect(skillId) {
    const data = getSkillLevelData(skillId);
    return (data && data.effect) || {};
}

// Localised name of a castable skill.
export function getSkillName(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    return LANG === 'de' ? (def.nameDE || def.nameEn) : def.nameEn;
}

// Localised rank description of a castable skill.
export function getSkillDesc(skillId) {
    const data = getSkillLevelData(skillId);
    if (!data) return '';
    return LANG === 'de' ? (data.descDE || data.descEn) : data.descEn;
}

// Localised cursor hint (shown when the skill is armed).
export function getSkillCursorDesc(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    return LANG === 'de' ? (def.descCursorDE || def.descCursorEn) : def.descCursorEn;
}

// Base (un-reduced, un-scaled) mana cost of the skill.
export function getSkillBaseManaCost(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    // Heartbloom keeps its cost on the def; everything else too.
    return def.manaCost || 0;
}

// Live mana cost of the skill - includes gear/map cost scaling and the
// Blood Magic (life) swap. Prefers the existing per-slot resolver so the
// tooltip and the actual cast always agree. Universal spells (slotKind
// 'universal', legacySlot null) delegate to their own cost resolver.
export function getSkillManaCost(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    if (def.slotKind === 'universal' && typeof getUniversalSpellManaCost === 'function') {
        try { return getUniversalSpellManaCost(skillId); } catch (e) { /* fall through */ }
    }
    if (typeof _getAbilityManaCost === 'function') {
        try { return _getAbilityManaCost(def.legacySlot); } catch (e) { /* fall through */ }
    }
    return getSkillBaseManaCost(skillId);
}

// Base cooldown of the skill in seconds.
export function getSkillBaseCooldown(skillId) {
    const def = getSkillDef(skillId);
    return def ? (def.cooldownSeconds || 0) : 0;
}

// Live cooldown after passive-tree and gear reductions. Universal spells
// own their per-spell cooldown map (see universal-spells.js).
export function getSkillCooldown(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    if (def.slotKind === 'universal' && typeof getUniversalSpellEffectiveCooldown === 'function') {
        try { return getUniversalSpellEffectiveCooldown(skillId); } catch (e) { /* fall through */ }
    }
    if (typeof getEffectiveCooldown === 'function') {
        try { return getEffectiveCooldown(def.legacySlot, def.cooldownSeconds || 0); } catch (e) { /* fall through */ }
    }
    return def.cooldownSeconds || 0;
}

// Remaining cooldown seconds for the skill (0 when ready / unknown).
// Universal spells read their own cooldown map (legacySlot is null).
export function getSkillCooldownRemaining(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    if (def.slotKind === 'universal' && typeof getUniversalSpellCooldownRemaining === 'function') {
        try { return getUniversalSpellCooldownRemaining(skillId); } catch (e) { return 0; }
    }
    const state = (typeof cooldownState !== 'undefined') ? cooldownState[def.legacySlot] : null;
    return (state && state.remaining) || 0;
}

// True if the skill can be paid for right now (life under Blood Magic).
export function canAffordSkill(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    if (def.slotKind === 'universal' && typeof canAffordUniversalSpell === 'function') {
        try { return canAffordUniversalSpell(skillId); } catch (e) { /* fall through */ }
    }
    if (typeof _abilityCanAfford === 'function') {
        try { return _abilityCanAfford(def.legacySlot); } catch (e) { /* fall through */ }
    }
    return true;
}

// True while the skill's own usability gate allows casting (Heartbloom is
// endgame-only; sealed universal spells are locked; everything else is
// always available).
export function isSkillUsableNow(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    if (def.slotKind === 'universal' && typeof isUniversalSpellUnlocked === 'function') {
        try { if (!isUniversalSpellUnlocked(skillId)) return false; } catch (e) { /* treat as unlocked */ }
    }
    if (def.endgameOnly) {
        if (typeof isEndgameLevel === 'function' && !isEndgameLevel()) return false;
    }
    // Charm gate: only spells whose charm is currently placed in one of the
    // spell slots may be cast (js/skills/skill-charms.js).
    if (typeof isSkillCharmUnlocked === 'function') {
        try { if (!isSkillCharmUnlocked(skillId)) return false; } catch (e) { /* treat as unlocked */ }
    }
    return true;
}


//------------------------------------------------------------------------
//--------------------------DAMAGE ESTIMATE-------------------------------
//------------------------------------------------------------------------
// Puzzle abilities deal damage through the reveal projectiles they fire
// (see _egOnProgrammaticReveal in endgame-class-projectiles.js). The tooltip
// shows: per-projectile range × number of projectiles.
//
// Inside an endgame encounter the per-projectile hit is derived from the
// player's live damage stats; outside endgame (story levels have no
// monsters) the per-rank reference values from SKILL_META are used.
//------------------------------------------------------------------------

// Returns the live per-projectile reveal damage, or null when unavailable.
export function _skillLiveRevealDamage() {
    if (typeof globalThis._egGetRevealProjectileDamagePct !== 'function') return null;
    if (typeof globalThis._egIsActive !== 'function' || !globalThis._egIsActive()) return null;
    if (typeof globalThis._egCalcPlayerDamage !== 'function') return null;
    try {
        const pct = globalThis._egGetRevealProjectileDamagePct() / 100;
        const rolled = globalThis._egCalcPlayerDamage();
        const hit = Math.max(1, Math.round(rolled * pct));
        return { min: hit, max: hit };
    } catch (e) {
        return null;
    }
}

// Returns { perHitMin, perHitMax, count, totalMin, totalMax } or null.
// Universal spells estimate from their def (volley/DoT/chain aware).
export function getSkillDamage(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return null;
    if (def.slotKind === 'universal' && typeof getUniversalSpellDamageEstimate === 'function') {
        try { return getUniversalSpellDamageEstimate(skillId); } catch (e) { return null; }
    }
    if (!def.damage) return null;

    // Damage follows the cast rank (the slotted charm's rank, else the
    // trained rank): ranks are the late-game damage knob - see
    // SPELL_RANK_DAMAGE_MULT in js/skills/skill-charms.js. The reference
    // perHit values are rank-1 baselines, so they are scaled by the rank
    // multiplier instead of indexed per rank.
    const level = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(skillId) : getSkillLevel(skillId);
    const effect = getSkillEffect(skillId);
    const rankMult = (typeof getSpellRankDamageMult === 'function') ? getSpellRankDamageMult(level) : 1;
    let count = 1;
    try { count = Math.max(1, Number(def.damage.count(effect, level)) || 1); } catch (e) { count = 1; }

    const live = _skillLiveRevealDamage();
    if (live) {
        const perHitMin = Math.max(1, Math.round(live.min * rankMult));
        const perHitMax = Math.max(1, Math.round(live.max * rankMult));
        return {
            perHitMin,
            perHitMax,
            count,
            totalMin: perHitMin * count,
            totalMax: perHitMax * count,
        };
    }

    const base = (def.damage.perHit && def.damage.perHit[0]) || [1, 1];
    const range = [Math.max(1, Math.round(base[0] * rankMult)), Math.max(1, Math.round(base[1] * rankMult))];
    return {
        perHitMin: range[0],
        perHitMax: range[1],
        count,
        totalMin: range[0] * count,
        totalMax: range[1] * count,
    };
}


//------------------------------------------------------------------------
//----------------------PLAYER-SKILL SELECTION----------------------------
//------------------------------------------------------------------------
// The spell book only lists skills the player can actually use: their own
// class's actives, their ascendency's actives (once chosen), and the
// universal Heartbloom endgame skill. Passives are deliberately excluded.
//------------------------------------------------------------------------

// Returns the base-class skill ids for the active class.
export function _playerBaseSkillIds() {
    const cls = globalThis.STATE.playerClass;
    if (!cls || typeof CLASS_DEFS === 'undefined' || !CLASS_DEFS[cls]) return [];
    return [`${cls}_active1`, `${cls}_active2`];
}

// Returns the ascendency skill ids for the chosen ascendency.
export function _playerAscendencySkillIds() {
    const asc = globalThis.STATE.playerAscendency;
    if (!asc || typeof ASCENDENCY_DEFS === 'undefined' || !ASCENDENCY_DEFS[asc]) return [];
    return [`${asc}_active1`, `${asc}_active2`];
}

// Every castable skill the current player owns, in display order:
// base actives → ascendency actives → Heartbloom → universal spells.
function getPlayerSkillIds() {
    const ids = [
        ..._playerBaseSkillIds(),
        ..._playerAscendencySkillIds(),
    ].filter((id) => !!getSkillDef(id));
    if (getSkillDef(HEARTBLOOM_SKILL_ID)) ids.push(HEARTBLOOM_SKILL_ID);
    // Universal spell arsenal (universal-spells.js): open to every class.
    if (typeof UNIVERSAL_SPELL_DEFS !== 'undefined') {
        for (const spell of UNIVERSAL_SPELL_DEFS) {
            if (getSkillDef(spell.id) && !ids.includes(spell.id)) ids.push(spell.id);
        }
    }
    return ids;
}

// Grouped view used by the spell book (section headers + entries).
function getPlayerSkillGroups() {
    const groups = [];
    const base = _playerBaseSkillIds().filter((id) => !!getSkillDef(id));
    if (base.length) groups.push({ labelKey: 'spellbook_group_class', ids: base });
    const asc = _playerAscendencySkillIds().filter((id) => !!getSkillDef(id));
    if (asc.length) {
        const ascDef = ASCENDENCY_DEFS[globalThis.STATE.playerAscendency];
        groups.push({
            labelKey: 'spellbook_group_ascendency',
            labelFallback: ascDef ? (LANG === 'de' ? (ascDef.nameDE || ascDef.nameEn) : ascDef.nameEn) : '',
            ids: asc,
        });
    }
    if (getSkillDef(HEARTBLOOM_SKILL_ID)) groups.push({ labelKey: 'spellbook_group_endgame', ids: [HEARTBLOOM_SKILL_ID] });
    // Universal spell arsenal - labelFallback (bilingual via _uspGroupTitle)
    // so no translation keys are required for the section header.
    if (typeof UNIVERSAL_SPELL_DEFS !== 'undefined') {
        // The arsenal is split into SUPPORT (defensive self-casts), MOVEMENT
        // (repositioning self-casts) and the offensive spells, so the handful
        // of utility spells is findable instead of being buried in the
        // 40-spell list. Order matters: the self-cast families sit directly
        // under the player's own skills, support first because it is the one
        // you reach for under pressure.
        const isSupport = (typeof isUniversalSupportSpell === 'function')
            ? isUniversalSupportSpell : () => false;
        const isMovement = (typeof isUniversalMovementSpell === 'function')
            ? isUniversalMovementSpell : () => false;
        const supIds = UNIVERSAL_SPELL_DEFS.filter((s) => isSupport(s)).map((s) => s.id).filter((id) => !!getSkillDef(id));
        const movIds = UNIVERSAL_SPELL_DEFS.filter((s) => !isSupport(s) && isMovement(s)).map((s) => s.id).filter((id) => !!getSkillDef(id));
        const uspIds = UNIVERSAL_SPELL_DEFS.filter((s) => !isSupport(s) && !isMovement(s)).map((s) => s.id).filter((id) => !!getSkillDef(id));
        if (supIds.length) {
            const supTitle = (typeof _uspSupportGroupTitle === 'function') ? _uspSupportGroupTitle() : 'Support Spells';
            groups.push({ labelKey: 'spellbook_group_support', labelFallback: supTitle, ids: supIds });
        }
        if (movIds.length) {
            const movTitle = (typeof _uspMovementGroupTitle === 'function') ? _uspMovementGroupTitle() : 'Movement Spells';
            groups.push({ labelKey: 'spellbook_group_movement', labelFallback: movTitle, ids: movIds });
        }
        if (uspIds.length) {
            const title = (typeof _uspGroupTitle === 'function') ? _uspGroupTitle() : 'Universal Spells';
            groups.push({ labelKey: 'spellbook_group_universal', labelFallback: title, ids: uspIds });
        }
    }
    return groups;
}

// The passives the player owns (never movable, shown for reference).
export function getPlayerPassiveSkillIds() {
    const cls = globalThis.STATE.playerClass;
    if (!cls) return [];
    return [`${cls}_passive`].filter((id) => !!getPassiveSkillDef(id));
}


//------------------------------------------------------------------------
//--------------------------HOTBAR STATE----------------------------------
//------------------------------------------------------------------------
// The hotbar is a fixed-size array of skill ids (or null) persisted on
// STATE.skillHotbar. Slot index 0..9 maps to the keys 1..9,0 by default.
//------------------------------------------------------------------------

// Builds the default hotbar for a save: the player's owned skills fill the
// first slots in roster order (active1, active2, ascendency, heartbloom).
export function _defaultSkillHotbar(state) {
    const slots = new Array(SKILL_HOTBAR_SIZE).fill(null);
    const s = state || (typeof globalThis.STATE !== 'undefined' ? globalThis.STATE : null);
    if (!s || !s.playerClass) return slots;

    const ids = [];
    if (typeof CLASS_DEFS !== 'undefined' && CLASS_DEFS[s.playerClass]) {
        ids.push(`${s.playerClass}_active1`, `${s.playerClass}_active2`);
    }
    if (s.playerAscendency && typeof ASCENDENCY_DEFS !== 'undefined' && ASCENDENCY_DEFS[s.playerAscendency]) {
        ids.push(`${s.playerAscendency}_active1`, `${s.playerAscendency}_active2`);
    }
    if (typeof ENDGAME_HEARTBLOOM_DEF !== 'undefined' && ENDGAME_HEARTBLOOM_DEF) ids.push(HEARTBLOOM_SKILL_ID);

    ids.slice(0, SKILL_HOTBAR_SIZE).forEach((id, i) => { slots[i] = id; });
    return slots;
}

// Ensures STATE.skillHotbar exists and is the right length, prunes skills the
// player no longer owns (e.g. after a class change), and - only on the very
// first init or when the class/ascendency changes - fills the free slots from
// the new roster.
//
// The auto-fill MUST NOT run on every call: clearing a slot would otherwise
// be silently undone (the spell would immediately be re-placed in the first
// free slot), which broke drag-out-to-remove.
function ensureSkillHotbar() {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE) return [];
    if (!Array.isArray(globalThis.STATE.skillHotbar) || globalThis.STATE.skillHotbar.length !== SKILL_HOTBAR_SIZE) {
        const existing = Array.isArray(globalThis.STATE.skillHotbar) ? globalThis.STATE.skillHotbar.slice(0, SKILL_HOTBAR_SIZE) : [];
        globalThis.STATE.skillHotbar = existing;
        while (globalThis.STATE.skillHotbar.length < SKILL_HOTBAR_SIZE) globalThis.STATE.skillHotbar.push(null);
    }

    const owned = new Set(getPlayerSkillIds());

    // Drop skills the player can no longer use (class / ascendency change).
    for (let i = 0; i < SKILL_HOTBAR_SIZE; i++) {
        const id = globalThis.STATE.skillHotbar[i];
        if (id && !owned.has(id)) globalThis.STATE.skillHotbar[i] = null;
    }

    // First-ever init, or the player's class/ascendency changed → seed the
    // bar with the (new) roster so there's always something to press.
    // Universal spells are NEVER auto-seeded: the player drags them onto
    // the bar themselves (mirrors the tutorial Fireball rule).
    const ownerKey = `${globalThis.STATE.playerClass || ''}|${globalThis.STATE.playerAscendency || ''}`;
    const shouldSeed = !globalThis.STATE.skillHotbarInit || globalThis.STATE.skillHotbarOwner !== ownerKey;
    if (shouldSeed) {
        const placed = new Set(globalThis.STATE.skillHotbar.filter(Boolean));
        for (const id of getPlayerSkillIds()) {
            const seedDef = getSkillDef(id);
            if (seedDef && seedDef.slotKind === 'universal') continue;
            if (placed.has(id)) continue;
            const free = globalThis.STATE.skillHotbar.indexOf(null);
            if (free === -1) break;
            globalThis.STATE.skillHotbar[free] = id;
            placed.add(id);
        }
        globalThis.STATE.skillHotbarInit = true;
        globalThis.STATE.skillHotbarOwner = ownerKey;
    }

    return globalThis.STATE.skillHotbar;
}

// Returns the skill id in a hotbar slot (or null).
export function getHotbarSkill(slotIndex) {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE || !Array.isArray(globalThis.STATE.skillHotbar)) return null;
    return globalThis.STATE.skillHotbar[slotIndex] || null;
}

// Assigns a skill to a hotbar slot. Refuses passives and unknown skills.
// If the skill already sits in another slot it is swapped, so the same
// spell never occupies two slots.
function setHotbarSlot(slotIndex, skillId) {
    if (slotIndex < 0 || slotIndex >= SKILL_HOTBAR_SIZE) return false;
    if (skillId !== null && !isSkillMovable(skillId)) return false;
    ensureSkillHotbar();

    if (skillId !== null) {
        const prevIndex = globalThis.STATE.skillHotbar.indexOf(skillId);
        if (prevIndex !== -1 && prevIndex !== slotIndex) {
            globalThis.STATE.skillHotbar[prevIndex] = globalThis.STATE.skillHotbar[slotIndex] || null;
        }
    }

    globalThis.STATE.skillHotbar[slotIndex] = skillId;
    if (typeof save === 'function') save();
    return true;
}

// Empties a hotbar slot.
export function clearHotbarSlot(slotIndex) {
    return setHotbarSlot(slotIndex, null);
}

// True if the skill currently sits in any hotbar slot.
export function isSkillOnHotbar(skillId) {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE || !Array.isArray(globalThis.STATE.skillHotbar)) return false;
    return globalThis.STATE.skillHotbar.indexOf(skillId) !== -1;
}


//------------------------------------------------------------------------
//----------------------------ACTIVATION----------------------------------
//------------------------------------------------------------------------

// Casts the skill in a hotbar slot (entry point for the hotbar + keybinds).
export function activateHotbarSlot(slotIndex) {
    const skillId = getHotbarSkill(slotIndex);
    if (!skillId) return false;
    return activateSkill(skillId);
}

// Activates a skill by id. Routes through the existing ability toggle so
// arming, affordability, instant firing and cooldowns stay untouched.
// Returns true if the attempt was dispatched.
export function activateSkill(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    // Charm gate first so the player gets the actionable message rather than
    // the generic "endgame only" one.
    if (typeof isSkillCharmUnlocked === 'function' && !isSkillCharmUnlocked(skillId)) {
        if (typeof globalThis.showToast === 'function') globalThis.showToast(t('charm_locked_toast'), '#ff6b9d');
        return false;
    }
    if (!isSkillUsableNow(skillId)) {
        if (typeof globalThis.showToast === 'function') {
            globalThis.showToast(t('skill_endgame_only'), '#ff6b9d');
        }
        return false;
    }
    // Remember the casting skill so its charm orb bonus reaches the reveal
    // projectiles it fires (see getCharmCastingDamageMult).
    if (typeof noteCharmCast === 'function') noteCharmCast(skillId);
    // Universal spells bypass the legacy slot engine entirely.
    if (def.slotKind === 'universal') {
        if (typeof castUniversalSpell === 'function') return castUniversalSpell(skillId);
        return false;
    }
    if (typeof globalThis.toggleActiveAbility === 'function') {
        globalThis.toggleActiveAbility(def.legacySlot);
        return true;
    }
    return false;
}


//------------------------------------------------------------------------
//---------------------------BOOTSTRAP------------------------------------
//------------------------------------------------------------------------

// Defs are loaded before this file (script order in index.html), so the
// registry can be built immediately.
buildSkillRegistry();
// Universal spells register themselves as first-class registry entries.
// This must run AFTER buildSkillRegistry() (classic order: skill-registry
// pos 84 fully evaluated before universal-spells pos 89) and it must live
// HERE, not in universal-spells.js, because that module's body executes
// during the import cycle before SKILL_REGISTRY is initialized.
_registerUniversalSpells();
