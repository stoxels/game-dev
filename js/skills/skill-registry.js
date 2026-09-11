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
// Each castable skill resolves to a "legacy slot" (active1…active5) — the
// key the existing execution + cooldown engine already understands. For the
// current roster that mapping is 1:1 per player, so cooldowns stay per-skill
// without touching the class ability files.
//------------------------------------------------------------------------

// Number of hotbar slots (2 rows of 5). Keep in sync with the CSS grid.
const SKILL_HOTBAR_SIZE = 10;

// Hotbar layout: 5 columns per row.
const SKILL_HOTBAR_COLS = 5;

// Legacy slot used by a skill that has no class/ascendency route.
const HEARTBLOOM_SKILL_ID = 'heartbloom';


//------------------------------------------------------------------------
//------------------------STATIC METADATA---------------------------------
//------------------------------------------------------------------------
// Extra info the ability defs do not carry. Keyed by skill id.
//
//   tags    — the PoE-style type line ("Spell, AoE, Duration")
//   scaling — what the skill's numbers grow with (shown as "Scales with")
//   damage  — null for non-damaging skills, otherwise:
//               count(effect, level) → how many reveal projectiles it fires
//               perHit: [[min,max] per rank] → reference damage per hit
//             The live endgame value (gear-scaled) overrides perHit when an
//             encounter is running (see getSkillDamage()).
//   castTime — 'instant' | 'channel' | null, purely informational
//------------------------------------------------------------------------

const SKILL_META = {
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
const SKILL_REGISTRY = {};

// PASSIVE_SKILL_REGISTRY: skill id → passive record. Passives are shown in
// the class HUD/level-select tooltips but are never castable and therefore
// never appear in the spell book or the hotbar (see the movable check).
const PASSIVE_SKILL_REGISTRY = {};

// Legacy slot key per source kind. Base actives reuse active1/active2,
// ascendency actives reuse active3/active4, heartbloom owns active5.
const _SKILL_LEGACY_SLOT = {
    base1: 'active1',
    base2: 'active2',
    asc1: 'active3',
    asc2: 'active4',
    heartbloom: 'active5',
};

// Registers one castable skill from a source ability def.
function _registerSkill(id, source, def, slotKind) {
    const meta = SKILL_META[id] || { tags: [], scaling: [], damage: null, castTime: 'instant' };
    SKILL_REGISTRY[id] = {
        id,
        icon: def.icon || _skillIconFor(id, source, slotKind),
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
const SKILL_ICON_OVERRIDES = {
    outlier_active1: '📈', outlier_active2: '⚡',
    actuary_active1: '🛡️', actuary_active2: '📊',
    recursionist_active1: '🌀', recursionist_active2: '🎲',
    markovian_active1: '⏳', markovian_active2: '🔗',
    bayesian_active1: '🪤', bayesian_active2: '🧿',
    random_walker_active1: '🌊', random_walker_active2: '🧭',
};

// Resolves a display icon for a skill. Precedence:
//   1. an explicit def.icon (heartbloom)
//   2. the per-class spell icon table (CLASS_SPELL_ICONS)
//   3. the SKILL_ICON_OVERRIDES table above (ascendencies)
function _skillIconFor(id, source, slotKind) {
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
function _registerPassive(id, def, source) {
    const classIcons = (typeof CLASS_SPELL_ICONS !== 'undefined' && CLASS_SPELL_ICONS[source.ownerId]) || null;
    PASSIVE_SKILL_REGISTRY[id] = {
        id,
        icon: def.icon || (classIcons && classIcons.passive) || '💠',
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
function buildSkillRegistry() {
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
function getSkillDef(skillId) {
    return SKILL_REGISTRY[skillId] || null;
}

// Returns the passive skill record for an id, or null.
function getPassiveSkillDef(skillId) {
    return PASSIVE_SKILL_REGISTRY[skillId] || null;
}

// True if the id belongs to a passive (never movable into the hotbar).
function isSkillPassive(skillId) {
    return !!PASSIVE_SKILL_REGISTRY[skillId];
}

// True if a skill may be placed into the hotbar.
function isSkillMovable(skillId) {
    const def = getSkillDef(skillId);
    return !!def && def.movable !== false;
}

// Returns the rank (1-based) of a castable skill for the current player.
function getSkillLevel(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 1;
    switch (def.slotKind) {
        case 'base1': return STATE.classActive1Level || 1;
        case 'base2': return STATE.classActive2Level || 1;
        case 'asc1': return STATE.ascendencySkill1Level || 1;
        case 'asc2': return STATE.ascendencySkill2Level || 1;
        default: return 1;
    }
}

// Returns the level data object (desc, effect) for the skill's current rank.
function getSkillLevelData(skillId) {
    const def = getSkillDef(skillId);
    if (!def || !def.levels) return null;
    const lvl = Math.min(getSkillLevel(skillId), def.levels.length);
    return def.levels[lvl - 1] || def.levels[0] || null;
}

// Returns the effect object for the skill's current rank, or {}.
function getSkillEffect(skillId) {
    const data = getSkillLevelData(skillId);
    return (data && data.effect) || {};
}

// Localised name of a castable skill.
function getSkillName(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    return LANG === 'de' ? (def.nameDE || def.nameEn) : def.nameEn;
}

// Localised rank description of a castable skill.
function getSkillDesc(skillId) {
    const data = getSkillLevelData(skillId);
    if (!data) return '';
    return LANG === 'de' ? (data.descDE || data.descEn) : data.descEn;
}

// Localised cursor hint (shown when the skill is armed).
function getSkillCursorDesc(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    return LANG === 'de' ? (def.descCursorDE || def.descCursorEn) : def.descCursorEn;
}

// Base (un-reduced, un-scaled) mana cost of the skill.
function getSkillBaseManaCost(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    // Heartbloom keeps its cost on the def; everything else too.
    return def.manaCost || 0;
}

// Live mana cost of the skill — includes gear/map cost scaling and the
// Blood Magic (life) swap. Prefers the existing per-slot resolver so the
// tooltip and the actual cast always agree.
function getSkillManaCost(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    if (typeof _getAbilityManaCost === 'function') {
        try { return _getAbilityManaCost(def.legacySlot); } catch (e) { /* fall through */ }
    }
    return getSkillBaseManaCost(skillId);
}

// Base cooldown of the skill in seconds.
function getSkillBaseCooldown(skillId) {
    const def = getSkillDef(skillId);
    return def ? (def.cooldownSeconds || 0) : 0;
}

// Live cooldown after passive-tree and gear reductions.
function getSkillCooldown(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    if (typeof getEffectiveCooldown === 'function') {
        try { return getEffectiveCooldown(def.legacySlot, def.cooldownSeconds || 0); } catch (e) { /* fall through */ }
    }
    return def.cooldownSeconds || 0;
}

// Remaining cooldown seconds for the skill (0 when ready / unknown).
function getSkillCooldownRemaining(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return 0;
    const state = (typeof cooldownState !== 'undefined') ? cooldownState[def.legacySlot] : null;
    return (state && state.remaining) || 0;
}

// True if the skill can be paid for right now (life under Blood Magic).
function canAffordSkill(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    if (typeof _abilityCanAfford === 'function') {
        try { return _abilityCanAfford(def.legacySlot); } catch (e) { /* fall through */ }
    }
    return true;
}

// True while the skill's own usability gate allows casting (Heartbloom is
// endgame-only; everything else is always available).
function isSkillUsableNow(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    if (def.endgameOnly) {
        if (typeof isEndgameLevel === 'function' && !isEndgameLevel()) return false;
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
function _skillLiveRevealDamage() {
    if (typeof _egGetRevealProjectileDamagePct !== 'function') return null;
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return null;
    if (typeof _egCalcPlayerDamage !== 'function') return null;
    try {
        const pct = _egGetRevealProjectileDamagePct() / 100;
        const rolled = _egCalcPlayerDamage();
        const hit = Math.max(1, Math.round(rolled * pct));
        return { min: hit, max: hit };
    } catch (e) {
        return null;
    }
}

// Returns { perHitMin, perHitMax, count, totalMin, totalMax } or null.
function getSkillDamage(skillId) {
    const def = getSkillDef(skillId);
    if (!def || !def.damage) return null;

    const level = getSkillLevel(skillId);
    const effect = getSkillEffect(skillId);
    let count = 1;
    try { count = Math.max(1, Number(def.damage.count(effect, level)) || 1); } catch (e) { count = 1; }

    const live = _skillLiveRevealDamage();
    if (live) {
        return {
            perHitMin: live.min,
            perHitMax: live.max,
            count,
            totalMin: live.min * count,
            totalMax: live.max * count,
        };
    }

    const range = (def.damage.perHit && def.damage.perHit[level - 1]) || (def.damage.perHit && def.damage.perHit[0]) || [1, 1];
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
function _playerBaseSkillIds() {
    const cls = STATE.playerClass;
    if (!cls || typeof CLASS_DEFS === 'undefined' || !CLASS_DEFS[cls]) return [];
    return [`${cls}_active1`, `${cls}_active2`];
}

// Returns the ascendency skill ids for the chosen ascendency.
function _playerAscendencySkillIds() {
    const asc = STATE.playerAscendency;
    if (!asc || typeof ASCENDENCY_DEFS === 'undefined' || !ASCENDENCY_DEFS[asc]) return [];
    return [`${asc}_active1`, `${asc}_active2`];
}

// Every castable skill the current player owns, in display order:
// base actives → ascendency actives → Heartbloom.
function getPlayerSkillIds() {
    const ids = [
        ..._playerBaseSkillIds(),
        ..._playerAscendencySkillIds(),
    ].filter((id) => !!getSkillDef(id));
    if (getSkillDef(HEARTBLOOM_SKILL_ID)) ids.push(HEARTBLOOM_SKILL_ID);
    return ids;
}

// Grouped view used by the spell book (section headers + entries).
function getPlayerSkillGroups() {
    const groups = [];
    const base = _playerBaseSkillIds().filter((id) => !!getSkillDef(id));
    if (base.length) groups.push({ labelKey: 'skillbook_group_class', ids: base });
    const asc = _playerAscendencySkillIds().filter((id) => !!getSkillDef(id));
    if (asc.length) {
        const ascDef = ASCENDENCY_DEFS[STATE.playerAscendency];
        groups.push({
            labelKey: 'skillbook_group_ascendency',
            labelFallback: ascDef ? (LANG === 'de' ? (ascDef.nameDE || ascDef.nameEn) : ascDef.nameEn) : '',
            ids: asc,
        });
    }
    if (getSkillDef(HEARTBLOOM_SKILL_ID)) groups.push({ labelKey: 'skillbook_group_endgame', ids: [HEARTBLOOM_SKILL_ID] });
    return groups;
}

// The passives the player owns (never movable, shown for reference).
function getPlayerPassiveSkillIds() {
    const cls = STATE.playerClass;
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
function _defaultSkillHotbar(state) {
    const slots = new Array(SKILL_HOTBAR_SIZE).fill(null);
    const s = state || (typeof STATE !== 'undefined' ? STATE : null);
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
// player no longer owns (e.g. after a class change), and — only on the very
// first init or when the class/ascendency changes — fills the free slots from
// the new roster.
//
// The auto-fill MUST NOT run on every call: clearing a slot would otherwise
// be silently undone (the spell would immediately be re-placed in the first
// free slot), which broke drag-out-to-remove.
function ensureSkillHotbar() {
    if (typeof STATE === 'undefined' || !STATE) return [];
    if (!Array.isArray(STATE.skillHotbar) || STATE.skillHotbar.length !== SKILL_HOTBAR_SIZE) {
        const existing = Array.isArray(STATE.skillHotbar) ? STATE.skillHotbar.slice(0, SKILL_HOTBAR_SIZE) : [];
        STATE.skillHotbar = existing;
        while (STATE.skillHotbar.length < SKILL_HOTBAR_SIZE) STATE.skillHotbar.push(null);
    }

    const owned = new Set(getPlayerSkillIds());

    // Drop skills the player can no longer use (class / ascendency change).
    for (let i = 0; i < SKILL_HOTBAR_SIZE; i++) {
        const id = STATE.skillHotbar[i];
        if (id && !owned.has(id)) STATE.skillHotbar[i] = null;
    }

    // First-ever init, or the player's class/ascendency changed → seed the
    // bar with the (new) roster so there's always something to press.
    const ownerKey = `${STATE.playerClass || ''}|${STATE.playerAscendency || ''}`;
    const shouldSeed = !STATE.skillHotbarInit || STATE.skillHotbarOwner !== ownerKey;
    if (shouldSeed) {
        const placed = new Set(STATE.skillHotbar.filter(Boolean));
        for (const id of getPlayerSkillIds()) {
            if (placed.has(id)) continue;
            const free = STATE.skillHotbar.indexOf(null);
            if (free === -1) break;
            STATE.skillHotbar[free] = id;
            placed.add(id);
        }
        STATE.skillHotbarInit = true;
        STATE.skillHotbarOwner = ownerKey;
    }

    return STATE.skillHotbar;
}

// Returns the skill id in a hotbar slot (or null).
function getHotbarSkill(slotIndex) {
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.skillHotbar)) return null;
    return STATE.skillHotbar[slotIndex] || null;
}

// Assigns a skill to a hotbar slot. Refuses passives and unknown skills.
// If the skill already sits in another slot it is swapped, so the same
// spell never occupies two slots.
function setHotbarSlot(slotIndex, skillId) {
    if (slotIndex < 0 || slotIndex >= SKILL_HOTBAR_SIZE) return false;
    if (skillId !== null && !isSkillMovable(skillId)) return false;
    ensureSkillHotbar();

    if (skillId !== null) {
        const prevIndex = STATE.skillHotbar.indexOf(skillId);
        if (prevIndex !== -1 && prevIndex !== slotIndex) {
            STATE.skillHotbar[prevIndex] = STATE.skillHotbar[slotIndex] || null;
        }
    }

    STATE.skillHotbar[slotIndex] = skillId;
    if (typeof save === 'function') save();
    return true;
}

// Empties a hotbar slot.
function clearHotbarSlot(slotIndex) {
    return setHotbarSlot(slotIndex, null);
}

// True if the skill currently sits in any hotbar slot.
function isSkillOnHotbar(skillId) {
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.skillHotbar)) return false;
    return STATE.skillHotbar.indexOf(skillId) !== -1;
}


//------------------------------------------------------------------------
//----------------------------ACTIVATION----------------------------------
//------------------------------------------------------------------------

// Casts the skill in a hotbar slot (entry point for the hotbar + keybinds).
function activateHotbarSlot(slotIndex) {
    const skillId = getHotbarSkill(slotIndex);
    if (!skillId) return false;
    return activateSkill(skillId);
}

// Activates a skill by id. Routes through the existing ability toggle so
// arming, affordability, instant firing and cooldowns stay untouched.
// Returns true if the attempt was dispatched.
function activateSkill(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return false;
    if (!isSkillUsableNow(skillId)) {
        if (typeof showToast === 'function') {
            showToast(t('skill_endgame_only'), '#ff6b9d');
        }
        return false;
    }
    if (typeof toggleActiveAbility === 'function') {
        toggleActiveAbility(def.legacySlot);
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
