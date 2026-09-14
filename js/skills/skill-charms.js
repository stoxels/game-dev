// skill-charms.js
//------------------------------------------------------------------------
//---------------------------CHARM SYSTEM---------------------------------
//------------------------------------------------------------------------
// A charm is the castable "gem" of exactly one skill at exactly one rank.
// Charms drop from defeated monsters onto the puzzle grid (drop section
// below), are picked up like any other grid drop, and then live in the
// player's charm inventory inside the spell book.
//
// Progression loop:
//   • every skill + rank pair has its own charm - key "<skillId>#<rank>"
//   • picking up a charm you already own yields a Lemma instead
//   • 10 Lemmas automatically prove 1 Theorem
//   • shift-left-clicking a charm spends 1 Theorem → +1% damage for its spell
//   • placing a charm into one of the 10 SPELL SLOTS unlocks that spell in
//     the spell book, from where it can be dragged onto the hotbar
//
// Persistence: charmInventory / charmSlots / charmShards / charmOrbs /
// charmSeedKey live on STATE (js/state.js), so they travel with the save.
// The charmShards / charmOrbs identifiers (and CHARM_SHARDS_PER_ORB) keep
// their internal names for save compatibility - they are the player-facing
// "Lemmas" and "Theorems" shown in the spell book.
//
// Damage hook: getCharmSkillDamageMult() is consulted by the reveal
// projectile path (endgame-class-projectiles.js) and by universal spells
// (universal-spells.js) for the skill that is being cast.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------CONSTANTS------------------------------------
//------------------------------------------------------------------------

// The two rows of five spell slots the player drags charms into.
const CHARM_SLOT_COUNT = 10;
const CHARM_SLOT_COLS = 5;

// Ten duplicate Lemmas prove one Theorem.
const CHARM_SHARDS_PER_ORB = 10;

// Every applied Theorem adds this much damage to the charm's spell.
const CHARM_ORB_DAMAGE_PCT = 1;

// Charm item glyph. The rank is drawn as a badge on top of it.
const CHARM_BASE_ICON = '🧿';

// Monster drop tuning (mirrors the loot-drop constants in
// endgame-grid-pickups.js).
const CHARM_DROP_CHANCE_NORMAL = 0.30;   // per normal monster kill
const CHARM_DROP_CHANCE_BOSS = 1.00;     // bosses always drop
const CHARM_DROP_LIFETIME_MS = 60000;    // uncollected charm lifetime
const CHARM_DROP_MAX_ON_BOARD = 2;       // simultaneous charm drops

// Rarity per rank - drives the overlay glow + toast colour.
const CHARM_RANK_RARITY = ['common', 'rare', 'epic'];

// PoE-style rank gates: the minimum MONSTER level that can DROP each rank.
// Index = rank - 1. Ranks 1-5 drop throughout the campaign (monster levels
// 1..68), ranks 6-10 are map-only (T1 maps start at monster level 68, T16 at
// 90 - see EG_MAP_TIER_MONSTER_LEVELS). Bosses share the same cap: a boss
// only guarantees A drop, never a rank above its monster level.
const CHARM_RANK_MIN_MONSTER_LEVEL = [1, 10, 22, 35, 50, 68, 74, 79, 84, 89];

// Minimum PLAYER level required to SLOT (use) each rank. Ranks 1-3 stay free
// so the class/ascendency progression (which grants up to rank 3 via upgrades
// at any character level) never bricks: the gate only bites on ranks 4+,
// which are drop-only and mirror their drop thresholds. A player finding a
// rank at monster level N is therefore roughly at the player level needed to
// use it, while a twinked low-level character cannot slot a high rank early.
const CHARM_RANK_MIN_PLAYER_LEVEL = [1, 1, 1, 35, 50, 68, 74, 79, 84, 89];


//------------------------------------------------------------------------
//--------------------------SPELL RANKS-----------------------------------
//------------------------------------------------------------------------
// Every spell exists at ranks 1..SPELL_MAX_RANK and every rank has its own
// charm. The rank is the late-game power knob: a high-rank charm hits far
// harder but drains the mana pool much faster, and because the rank follows
// the SLOTTED CHARM the player can always drop back to a cheap low rank.
//
// The multipliers below are ABSOLUTE (rank 1 = 1.00) and compound per rank:
//   damage ×~1.28 →  rank 3 = 1.65×, rank 5 = 2.50×, rank 10 = 6.00×
//   mana   ×1.18  →  rank 3 = 1.40×, rank 5 = 1.95×, rank 10 = 4.45×
// Damage per mana still rises with rank (1.35× by rank 10), so pushing a
// spell's rank pays off while a low rank stays the frugal option. The damage
// curve was flattened from its old 9.00× top (2026-09 balance pass) because
// max-rank nukes one-shot same-level bosses and made mana irrelevant.
// Ranks 1-3 line up with the authored 3-rank curves the class defs already
// shipped (rank 3 ≈ 1.65× the rank-1 reference damage), so existing content
// keeps its feel and ranks 4-10 simply continue the curve.
const SPELL_MAX_RANK = 10;

// Index = rank - 1.
const SPELL_RANK_DAMAGE_MULT = [1.00, 1.30, 1.65, 2.05, 2.50, 3.00, 3.60, 4.30, 5.10, 6.00];
const SPELL_RANK_MANA_MULT = [1.00, 1.18, 1.40, 1.65, 1.95, 2.30, 2.72, 3.20, 3.78, 4.45];

// Relative chance a monster drops each rank's charm. Normal monsters skew hard
// to low ranks; bosses roll a linear table so high ranks are a boss-farm
// reward (a boss at monster level 89+ has ~18% chance of a rank-10 charm).
// Both tables are rolled only among ranks the monster's level unlocks (see
// CHARM_RANK_MIN_MONSTER_LEVEL), so low-level monsters can never drop high.
const SPELL_RANK_DROP_WEIGHT_NORMAL = [16, 10, 7, 5, 4, 3, 2, 2, 1, 1];
const SPELL_RANK_DROP_WEIGHT_BOSS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function _spellRankClamp(rank) {
    const r = Math.round(Number(rank) || 1);
    return Math.max(1, Math.min(SPELL_MAX_RANK, r));
}

// Damage multiplier for a rank (1.00 at rank 1).
function getSpellRankDamageMult(rank) {
    return SPELL_RANK_DAMAGE_MULT[_spellRankClamp(rank) - 1];
}

// Mana/life cost multiplier for a rank (1.00 at rank 1).
function getSpellRankManaMult(rank) {
    return SPELL_RANK_MANA_MULT[_spellRankClamp(rank) - 1];
}

//------------------------------------------------------------------------
//----------------------RANK LEVEL REQUIREMENTS---------------------------
//------------------------------------------------------------------------
// Minimum monster level that can drop a rank (1 when unknown).
function getCharmRankMinMonsterLevel(rank) {
    const r = _spellRankClamp(rank);
    const v = CHARM_RANK_MIN_MONSTER_LEVEL[r - 1];
    return Number.isFinite(Number(v)) ? Math.max(1, Math.round(v)) : 1;
}

// Highest rank a monster of `monsterLevel` may drop. Low-level creatures can
// therefore never produce high-rank charms, no matter the weight table.
function getCharmRankMaxForMonsterLevel(monsterLevel) {
    const mlvl = Math.max(1, Math.round(Number(monsterLevel) || 1));
    let max = 1;
    for (let r = 1; r <= SPELL_MAX_RANK; r++) {
        if (getCharmRankMinMonsterLevel(r) <= mlvl) max = r;
    }
    return max;
}

// Minimum player level required to slot/use a rank (1 when unknown).
function getCharmRankMinPlayerLevel(rank) {
    const r = _spellRankClamp(rank);
    const v = CHARM_RANK_MIN_PLAYER_LEVEL[r - 1];
    return Number.isFinite(Number(v)) ? Math.max(1, Math.round(v)) : 1;
}

// Live player level for requirement checks (endgame leveling when present).
function _charmGetPlayerLevel() {
    try {
        if (typeof _egGetPlayerLevel === 'function') {
            const lv = Math.round(Number(_egGetPlayerLevel()) || 0);
            if (lv >= 1) return lv;
        }
    } catch (e) { /* fall through to STATE */ }
    if (typeof STATE !== 'undefined' && STATE) {
        const lv = Math.round(Number(STATE.playerLevel) || 0);
        if (lv >= 1) return lv;
    }
    return 1;
}

// True when the character meets the player-level requirement of a rank.
function charmRankMeetsPlayerLevel(rank) {
    return _charmGetPlayerLevel() >= getCharmRankMinPlayerLevel(rank);
}


//------------------------------------------------------------------------
//--------------------------DROP STATE------------------------------------
//------------------------------------------------------------------------
// Charm drops currently sitting on the grid: "row-col" → charm object.
// Kept in its own map so the shared drop helpers (expiry, pause/resume,
// cell-collision checks) can treat it like loot/currency/maps.
let _egCharmDrops = new Map();

// Charm drag operation: { charmKey, fromSlot, moved, startX, startY } | null.
let _charmDragState = null;
let _charmDragGhost = null;

// Transient "the player just cast this skill" marker. Reveal projectiles
// fire asynchronously (staggered setTimeout), so the cast is remembered for
// a short window and the orb bonus is snapshotted when the reveal starts.
let _charmCastSkillId = null;
let _charmCastAt = 0;
const CHARM_CAST_MEMORY_MS = 1500;


//------------------------------------------------------------------------
//--------------------------KEY HELPERS-----------------------------------
//------------------------------------------------------------------------

// Stable charm key for a skill+rank pair.
function charmKeyFor(skillId, rank) {
    return `${skillId}#${rank}`;
}

// Parses "mathmagician_active1#2" → { skillId, rank } (or null).
function _charmParseKey(key) {
    if (typeof key !== 'string') return null;
    const i = key.lastIndexOf('#');
    if (i <= 0) return null;
    const skillId = key.slice(0, i);
    const rank = Number(key.slice(i + 1));
    if (!skillId || !Number.isFinite(rank) || rank < 1) return null;
    return { skillId, rank };
}

// Highest rank a spell has - every spell supports the full rank ladder, so
// every rank gets its own charm (getSkillCastRankClamped keeps the authored
// effect tables itself at ranks 1..levels.length).
function getSkillMaxRank(skillId) {
    if (typeof getSkillDef === 'function' && !getSkillDef(skillId)) return 1;
    return SPELL_MAX_RANK;
}

// Creates a fresh charm object (no orbs applied yet).
function _charmMake(skillId, rank) {
    return { key: charmKeyFor(skillId, rank), skillId, rank, orbs: 0 };
}

// Localised display name of a charm, e.g. "Data Strike · Rank 2".
function getCharmName(charm) {
    if (!charm) return '';
    const skillName = (typeof getSkillName === 'function') ? getSkillName(charm.skillId) : charm.skillId;
    return `${skillName} · ${t('skill_tip_rank')} ${charm.rank}`;
}


//------------------------------------------------------------------------
//----------------------------STATE---------------------------------------
//------------------------------------------------------------------------

// Ensures every charm container exists on STATE, prunes stale slot
// references and grants the starter charms for a fresh class/ascendency.
function ensureCharmState() {
    if (typeof STATE === 'undefined' || !STATE) return null;

    if (!Array.isArray(STATE.charmInventory)) STATE.charmInventory = [];
    if (!Array.isArray(STATE.charmSlots) || STATE.charmSlots.length !== CHARM_SLOT_COUNT) {
        const slots = Array.isArray(STATE.charmSlots) ? STATE.charmSlots.slice(0, CHARM_SLOT_COUNT) : [];
        while (slots.length < CHARM_SLOT_COUNT) slots.push(null);
        STATE.charmSlots = slots;
    }
    if (!Number.isFinite(Number(STATE.charmShards))) STATE.charmShards = 0;
    if (!Number.isFinite(Number(STATE.charmOrbs))) STATE.charmOrbs = 0;
    // UI preference for the charm list (see _charmApplyRankFilter).
    STATE.charmMaxRankOnly = STATE.charmMaxRankOnly === true;

    // Drop slot references whose charm is no longer owned (save edits,
    // class resets) so a slot can never unlock a spell that isn't held.
    // A charm for a skill the player no longer owns (class change) also
    // frees its slot, so the new class's charms can take it.
    for (let i = 0; i < STATE.charmSlots.length; i++) {
        const key = STATE.charmSlots[i];
        if (!key) continue;
        const charm = getCharmByKey(key);
        if (!charm) { STATE.charmSlots[i] = null; continue; }
        if (STATE.playerClass && typeof getSkillDef === 'function'
            && getSkillDef(charm.skillId) && !_charmIsPlayerSkill(charm.skillId)) {
            STATE.charmSlots[i] = null;
        }
    }

    _charmSeedStarterCharms();
    return STATE;
}

// Returns the owned charm object for a key, or null.
function getCharmByKey(key) {
    if (!key || typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.charmInventory)) return null;
    return STATE.charmInventory.find((c) => c && c.key === key) || null;
}

// Every owned charm of a skill (any rank).
function getCharmsForSkill(skillId) {
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.charmInventory)) return [];
    return STATE.charmInventory.filter((c) => c && c.skillId === skillId);
}

// Progression charms: the player owns a charm for every rank up to their
// trained rank, for each of their own skills.
//
//   • unlocking a class grants that class's Rank 1 charms
//   • upgrading a class / ascendency spell grants the next rank's charm
//   • every lower rank stays owned, so a cheaper rank can always be re-slotted
//
// The grant is idempotent and reconciled on every ensureCharmState(), which
// also back-fills the rank ladder for saves made before this rule existed.
// Universal spells are deliberately NOT seeded - that arsenal is meant to be
// found in the world.
//
// On top of the grants the class's castable skills are auto-placed into free
// spell slots ONCE per class/ascendency (charmSeedKey), so a brand-new
// character has usable spells; after that the player's slot choices are left
// alone - with one exception: a real rank UPGRADE promotes the slot from the
// old rank to the new one (promoteCharmSlotToRank), so the upgrade screen and
// the charm ladder agree. A deliberate down-rank stays until the next
// upgrade of that same spell.
let _charmProgressionSig = null;
function _charmSeedStarterCharms() {
    const cls = STATE.playerClass;
    if (!cls) return false;
    if (typeof getPlayerSkillIds !== 'function' || typeof getSkillDef !== 'function') return false;

    let changed = false;
    let ids = [];
    try { ids = getPlayerSkillIds(); } catch (e) { ids = []; }

    // 1) Rank ladder for every owned (non-universal) skill. Memoised on the
    //    progression inputs because ensureCharmState() runs on every render.
    const sig = [cls, STATE.playerAscendency || '',
        STATE.classActive1Level || 1, STATE.classActive2Level || 1,
        STATE.ascendencySkill1Level || 1, STATE.ascendencySkill2Level || 1].join('|');
    if (_charmProgressionSig !== sig) {
        _charmProgressionSig = sig;
        for (const id of ids) {
            const def = getSkillDef(id);
            if (!def || def.slotKind === 'universal') continue;
            const trained = (typeof getSkillLevel === 'function') ? (getSkillLevel(id) || 1) : 1;
            for (let rank = 1; rank <= trained; rank++) {
                if (getCharmByKey(charmKeyFor(id, rank))) continue;
                STATE.charmInventory.push(_charmMake(id, rank));
                changed = true;
            }
        }
    }

    // 2) One-time starter slots for the current class + ascendency.
    const seedKey = `${cls}|${STATE.playerAscendency || ''}`;
    if (STATE.charmSeedKey !== seedKey) {
        for (const id of ids) {
            const def = getSkillDef(id);
            if (!def || def.slotKind === 'universal') continue;
            const rank = (typeof getSkillLevel === 'function') ? (getSkillLevel(id) || 1) : 1;
            const key = charmKeyFor(id, rank);
            if (!getCharmByKey(key)) continue;       // only slot charms we actually own
            if (STATE.charmSlots.includes(key)) continue;
            // Never override a slot the player already dedicated to this spell.
            const alreadySlotted = STATE.charmSlots.some((k) => {
                const c = getCharmByKey(k);
                return !!c && c.skillId === id;
            });
            if (alreadySlotted) continue;
            const free = STATE.charmSlots.indexOf(null);
            if (free !== -1) { STATE.charmSlots[free] = key; changed = true; }
        }
        STATE.charmSeedKey = seedKey;
    }

    if (changed && typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    return changed;
}


//------------------------------------------------------------------------
//--------------------------INVENTORY-------------------------------------
//------------------------------------------------------------------------

// Grants a charm to the inventory. Returns
// { duplicate, orbsMade, shards } - a duplicate becomes a shard and every
// ten shards forge an orb.
function grantCharm(skillId, rank) {
    ensureCharmState();
    const key = charmKeyFor(skillId, rank);
    let duplicate = false;
    let orbsMade = 0;

    if (getCharmByKey(key)) {
        duplicate = true;
        STATE.charmShards = (STATE.charmShards || 0) + 1;
        while (STATE.charmShards >= CHARM_SHARDS_PER_ORB) {
            STATE.charmShards -= CHARM_SHARDS_PER_ORB;
            STATE.charmOrbs = (STATE.charmOrbs || 0) + 1;
            orbsMade++;
        }
    } else {
        STATE.charmInventory.push(_charmMake(skillId, rank));
    }

    if (typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    return { duplicate, orbsMade, shards: STATE.charmShards };
}

// Spends one orb on a charm → +CHARM_ORB_DAMAGE_PCT% damage for its spell.
function applyOrbToCharm(key) {
    ensureCharmState();
    const charm = getCharmByKey(key);
    if (!charm) return false;
    if ((STATE.charmOrbs || 0) <= 0) {
        if (typeof showToast === 'function') showToast(`🔮 ${t('charm_no_orbs')}`, '#c39bd3');
        return false;
    }
    STATE.charmOrbs -= 1;
    charm.orbs = (charm.orbs || 0) + 1;
    if (typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    if (typeof showToast === 'function') {
        showToast(`🔮 ${getCharmName(charm)} - ${t('charm_orb_applied')} +${CHARM_ORB_DAMAGE_PCT}%`, '#f5d98b');
    }
    _charmRefreshSpellbook();
    return true;
}

// Total orb bonus (in %) a skill's charms carry.
function getCharmSkillOrbBonusPct(skillId) {
    if (!skillId) return 0;
    let orbs = 0;
    for (const c of getCharmsForSkill(skillId)) orbs += (c.orbs || 0);
    return orbs * CHARM_ORB_DAMAGE_PCT;
}

// Damage multiplier for a skill (1.0 when it has no orbs applied).
function getCharmSkillDamageMult(skillId) {
    return 1 + getCharmSkillOrbBonusPct(skillId) / 100;
}


//------------------------------------------------------------------------
//--------------------------SPELL SLOTS-----------------------------------
//------------------------------------------------------------------------

// True when a charm with this skill sits in any spell slot AND meets its
// player-level requirement. An over-level charm stays owned but does not
// unlock its spell until the character grows into it (PoE gem-style).
function isSkillCharmUnlocked(skillId) {
    if (typeof STATE === 'undefined' || !STATE) return true;
    // Tutorial: the Professor's Scroll of Fireball (Rank 1) lesson gates the
    // Fireball exactly like a normal charm - but ONLY Fireball, so the
    // earlier (classless) puzzle lessons keep working.
    const tqActive = (typeof _tqIsTutorialActive === 'function')
        && (function () { try { return _tqIsTutorialActive(); } catch (e) { return false; } })();
    if (tqActive) {
        if (skillId !== 'fireball') return true;
    } else if (!STATE.playerClass) {
        // Before a class is chosen nothing is charm-gated.
        return true;
    }
    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    if (!def) return true; // unknown ids are never gated
    if (!_charmIsPlayerSkill(skillId)) return true; // not part of the charm pool
    ensureCharmState();
    return STATE.charmSlots.some((key) => {
        const charm = getCharmByKey(key);
        return !!charm && charm.skillId === skillId && charmRankMeetsPlayerLevel(charm.rank);
    });
}

// True when the spell's charm currently sits in one of the 10 spell slots.
// The spell book lists exactly these spells and nothing else - the slots ARE
// the loadout, and the ~100-spell arsenal is far too large to browse. New
// spells reach the book by slotting their charm from the charm inventory.
function isSkillCharmSlotted(skillId) {
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.charmSlots)) return false;
    ensureCharmState();
    return STATE.charmSlots.some((key) => {
        const charm = getCharmByKey(key);
        return !!charm && charm.skillId === skillId;
    });
}

// True when the skill belongs to the player's own charm pool. The set is
// memoised per class/ascendency because this is consulted for every spell on
// every hotbar / spell book render.
let _charmPlayerSkillSet = null;
let _charmPlayerSkillKey = null;
function _charmIsPlayerSkill(skillId) {
    if (typeof getPlayerSkillIds !== 'function' || typeof STATE === 'undefined' || !STATE) return false;
    const ownerKey = `${STATE.playerClass || ''}|${STATE.playerAscendency || ''}`;
    if (!_charmPlayerSkillSet || _charmPlayerSkillKey !== ownerKey) {
        try { _charmPlayerSkillSet = new Set(getPlayerSkillIds()); } catch (e) { _charmPlayerSkillSet = new Set(); }
        _charmPlayerSkillKey = ownerKey;
    }
    return _charmPlayerSkillSet.has(skillId);
}

// Resolves the player's skill id that owns a legacy ability slot
// ('active1'…'active5'), or null when nothing maps to it. Memoised per
// class/ascendency - this runs on every HUD render and tooltip.
let _charmSlotSkillMap = null;
let _charmSlotSkillMapKey = null;
function getSkillIdForLegacySlot(slot) {
    if (!slot || typeof getPlayerSkillIds !== 'function' || typeof STATE === 'undefined' || !STATE) return null;
    const ownerKey = `${STATE.playerClass || ''}|${STATE.playerAscendency || ''}`;
    if (!_charmSlotSkillMap || _charmSlotSkillMapKey !== ownerKey) {
        _charmSlotSkillMap = {};
        try {
            for (const id of getPlayerSkillIds()) {
                const def = getSkillDef(id);
                if (def && def.legacySlot) _charmSlotSkillMap[def.legacySlot] = id;
            }
        } catch (e) { /* registry not ready */ }
        _charmSlotSkillMapKey = ownerKey;
    }
    return _charmSlotSkillMap[slot] || null;
}

// Returns the skill id using a legacy slot when its charm is NOT slotted
// (so the legacy ability engine can refuse the cast), else null.
function getCharmLockedSkillForLegacySlot(slot) {
    const id = getSkillIdForLegacySlot(slot);
    if (!id) return null;
    return isSkillCharmUnlocked(id) ? null : id;
}

// Rank of the charm currently slotted for a skill, or null.
// NOTE: returns the raw slotted rank even when it exceeds the player-level
// requirement - use isSkillCharmUnlocked()/getSkillCastRankFull() for the
// gated (effective) view. Raw display keeps the inventory/slot UI honest
// about what is actually sitting in the slot while it is locked.
function getCharmSlottedRank(skillId) {
    ensureCharmState();
    if (typeof STATE === 'undefined' || !STATE) return null;
    for (const key of STATE.charmSlots) {
        const charm = getCharmByKey(key);
        if (charm && charm.skillId === skillId) return charm.rank;
    }
    return null;
}

// Rank of the slotted charm that the character may actually USE (meets the
// player-level requirement), or null when nothing usable is slotted.
function getCharmUsableSlottedRank(skillId) {
    ensureCharmState();
    if (typeof STATE === 'undefined' || !STATE) return null;
    for (const key of STATE.charmSlots) {
        const charm = getCharmByKey(key);
        if (charm && charm.skillId === skillId && charmRankMeetsPlayerLevel(charm.rank)) return charm.rank;
    }
    return null;
}

//------------------------------------------------------------------------
//--------------------------CAST RANK-------------------------------------
//------------------------------------------------------------------------
// The rank a spell is cast at follows the SLOTTED CHARM when one is placed,
// otherwise the character's trained rank. Damage and cost both read this, so
// slotting a lower-rank charm is a legitimate, cheaper choice.
//------------------------------------------------------------------------

// Full cast rank (may exceed the authored effect table - see below).
// An over-level slotted charm does NOT raise the cast rank: the spell falls
// back to the character's trained rank until the level requirement is met.
function getSkillCastRankFull(skillId) {
    const slotted = getCharmUsableSlottedRank(skillId);
    if (slotted) return _spellRankClamp(slotted);
    const trained = (typeof getSkillLevel === 'function') ? getSkillLevel(skillId) : 1;
    return _spellRankClamp(trained);
}

// Rank used for EFFECT lookups (radius, reveal counts, durations). The
// authored level tables only define ranks 1..levels.length, so higher-rank
// charms keep the top authored effect and get their extra power from the
// rank damage multiplier instead of indexing past the table.
function getSkillCastRankClamped(skillId) {
    const full = getSkillCastRankFull(skillId);
    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    const max = (def && Array.isArray(def.levels) && def.levels.length) ? def.levels.length : 1;
    return Math.max(1, Math.min(full, max));
}

// Effect rank for a legacy ability slot ('active1'…'active5'), or null when
// no player skill maps to the slot.
function getSkillCastRankClampedForSlot(slot) {
    const id = getSkillIdForLegacySlot(slot);
    if (!id) return null;
    return getSkillCastRankClamped(id);
}

// Mana-cost multiplier for a legacy ability slot.
function getSkillRankManaMultForSlot(slot) {
    const id = getSkillIdForLegacySlot(slot);
    if (!id) return 1;
    return getSpellRankManaMult(getSkillCastRankFull(id));
}

// Damage multiplier for a skill id.
function getSpellRankDamageMultForSkill(skillId) {
    return getSpellRankDamageMult(getSkillCastRankFull(skillId));
}

// Mana-cost multiplier for a skill id.
function getSpellRankManaMultForSkill(skillId) {
    return getSpellRankManaMult(getSkillCastRankFull(skillId));
}


// Places a charm into a spell slot. The charm is moved out of any other
// slot (a slot holds each charm at most once); whatever occupied the target
// slot simply returns to the inventory (ownership is tracked by the
// inventory, so no data is lost). Charms above the character's player level
// are rejected with a toast - they stay owned until the level requirement is
// met (see CHARM_RANK_MIN_PLAYER_LEVEL).
function setCharmSlot(slotIndex, charmKey, opts) {
    ensureCharmState();
    if (slotIndex < 0 || slotIndex >= CHARM_SLOT_COUNT) return false;
    if (charmKey !== null && !getCharmByKey(charmKey)) return false;
    const bypassLevel = !!(opts && opts.bypassLevel);
    if (charmKey !== null && !bypassLevel) {
        const charm = getCharmByKey(charmKey);
        if (charm && !charmRankMeetsPlayerLevel(charm.rank)) {
            if (typeof showToast === 'function') {
                const need = getCharmRankMinPlayerLevel(charm.rank);
                const msg = (typeof t === 'function')
                    ? t('charm_rank_locked_toast').replace('{r}', charm.rank).replace('{n}', need)
                    : `Rank ${charm.rank} charm needs player level ${need}`;
                showToast(`🔒 ${msg}`, '#e06c55');
            }
            return false;
        }
    }

    if (charmKey !== null) {
        // A charm lives in at most one slot, and only one charm per skill is
        // ever slotted (two ranks of the same spell must not both unlock it).
        for (let i = 0; i < STATE.charmSlots.length; i++) {
            if (i === slotIndex) continue;
            if (STATE.charmSlots[i] === charmKey) { STATE.charmSlots[i] = null; continue; }
            const other = getCharmByKey(STATE.charmSlots[i]);
            const placedCharm = getCharmByKey(charmKey);
            if (other && placedCharm && other.skillId === placedCharm.skillId) STATE.charmSlots[i] = null;
        }
    }
    STATE.charmSlots[slotIndex] = charmKey;
    if (typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    // Slotting changes which spells are unlocked, so refresh the open book
    // (spell lock icons + charm panel) and the hotbar lock states.
    _charmRefreshSpellbook();
    return true;
}

// Empties a spell slot (the charm stays in the inventory).
function clearCharmSlot(slotIndex) {
    return setCharmSlot(slotIndex, null);
}

// Right-click shortcut: slots a charm from the inventory into the first
// empty spell slot. No-ops when the charm is unknown or already slotted,
// and toasts when every slot is taken. setCharmSlot() owns dedupe, save
// and re-render.
function _charmQuickSlot(charmKey) {
    ensureCharmState();
    if (!charmKey || !getCharmByKey(charmKey)) return false;
    if (STATE.charmSlots.includes(charmKey)) return false;
    const idx = STATE.charmSlots.findIndex((s) => !s);
    if (idx === -1) {
        if (typeof showToast === 'function') showToast(t('charm_slots_full'));
        return false;
    }
    return setCharmSlot(idx, charmKey);
}

// Promotes a spell's slotted charm to a rank it just earned, so the class
// upgrade screen ("Rank N") and the rank the spell actually casts at never
// drift apart.
//
// Deliberately narrow, because it silently changes a slot the player set up:
//   • only called from the real upgrade appliers (applyClassUpgrade /
//     applyAscendencyUpgrade), never from a load or a render, so a player who
//     prefers a cheaper low rank keeps it until they choose otherwise;
//   • only promotes a slot that already holds a LOWER rank of that same spell
//     - a free slot is left free, and a higher-rank charm is never downgraded;
//   • only promotes to a charm that is actually owned.
// Returns true when a slot was rewritten.
function promoteCharmSlotToRank(skillId, rank) {
    ensureCharmState();
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.charmSlots)) return false;
    if (!skillId || !rank) return false;
    const newKey = charmKeyFor(skillId, rank);
    if (!getCharmByKey(newKey)) return false;          // only promote charms we own
    if (STATE.charmSlots.includes(newKey)) return false;
    const idx = STATE.charmSlots.findIndex((key) => {
        const charm = getCharmByKey(key);
        return !!charm && charm.skillId === skillId && charm.rank < rank;
    });
    if (idx === -1) return false;
    STATE.charmSlots[idx] = newKey;
    if (typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    // The book (equipped list + ranks) and the hotbar (cast rank, lock state)
    // both read the slotted charm.
    _charmRefreshSpellbook();
    return true;
}



//------------------------------------------------------------------------
//--------------------------CAST CONTEXT----------------------------------
//------------------------------------------------------------------------
// Remembers which skill is casting so the orb bonus can be applied to the
// right spell. Class abilities reveal cells synchronously, so the reveal
// handler snapshots this at entry; the armed-slot fallback covers casts
// routed through the legacy class HUD.
function noteCharmCast(skillId) {
    if (!skillId) return;
    _charmCastSkillId = skillId;
    _charmCastAt = Date.now();
}

// Resolves the skill currently being cast (or null).
function resolveCharmCastingSkillId() {
    if (_charmCastSkillId && (Date.now() - _charmCastAt) < CHARM_CAST_MEMORY_MS) {
        return _charmCastSkillId;
    }
    try {
        if (typeof activeAbilityMode !== 'undefined' && activeAbilityMode
            && typeof STATE !== 'undefined' && STATE && STATE.classActiveChoice
            && typeof getPlayerSkillIds === 'function') {
            for (const id of getPlayerSkillIds()) {
                const def = getSkillDef(id);
                if (def && def.legacySlot === STATE.classActiveChoice) return id;
            }
        }
    } catch (e) { /* no legacy slot engine → no bonus */ }
    return null;
}

// Damage multiplier for whichever spell is casting right now: its applied
// charm orbs (+1% each) times its cast rank (rank 10 = 9.00×). Returns 1.0
// when the reveal did not come from a charm-slotted skill.
function getCastingSkillDamageMult() {
    const skillId = resolveCharmCastingSkillId();
    if (!skillId) return 1;
    return getCharmSkillDamageMult(skillId) * getSpellRankDamageMultForSkill(skillId);
}

// Back-compat alias (older call site in endgame-class-projectiles.js).
function getCharmCastingDamageMult() {
    return getCastingSkillDamageMult();
}


//------------------------------------------------------------------------
//-----------------------SPELLBOOK PANEL RENDER---------------------------
//------------------------------------------------------------------------

// Small inline icon: the charm glyph with its rank badge on top.
function _charmIconMarkup(charm, extraClass) {
    if (!charm) return '';
    const cls = extraClass ? ` ${extraClass}` : '';
    return `<span class="charm-icon${cls}">`
        + `<span class="charm-glyph">${CHARM_BASE_ICON}</span>`
        + `<span class="charm-rank-badge">${charm.rank}</span>`
        + `</span>`;
}

// The 2 × 5 spell slot grid.
function _charmBuildSlotsHTML() {
    ensureCharmState();
    const slots = (STATE && STATE.charmSlots) || [];
    const cells = [];
    for (let i = 0; i < CHARM_SLOT_COUNT; i++) {
        const charm = getCharmByKey(slots[i]);
        if (!charm) {
            // Empty slots carry the custom hover tooltip too - never the
            // browser's native `title` popup (see the TOOLTIP section).
            cells.push(`<div class="charm-slot is-empty" data-charm-slot="${i}"`
                + ` onmouseenter="handleCharmEmptySlotTip(event,${i})"`
                + ` onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()">`
                + `<span class="charm-slot-index">${i + 1}</span>`
                + `<span class="charm-slot-empty">·</span>`
                + `</div>`);
            continue;
        }
        const bonus = charm.orbs > 0 ? `<span class="charm-item-orbs">+${charm.orbs * CHARM_ORB_DAMAGE_PCT}%</span>` : '';
        cells.push(`<div class="charm-slot is-filled" data-charm-slot="${i}" data-charm-key="${charm.key}"`
            + ` onmouseenter="handleCharmTip(event,'${charm.key}')" onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()">`
            + `<span class="charm-slot-index">${i + 1}</span>`
            + _charmIconMarkup(charm)
            + `<span class="charm-slot-name">${getSkillName(charm.skillId)}</span>`
            + bonus
            + `</div>`);
    }

    const head = (typeof buildSpellbookHeadHTML === 'function')
        ? buildSpellbookHeadHTML(t('charm_slots_title'), t('charm_slots_hint'))
        : `<div class="charm-panel-title">${t('charm_slots_title')}`
            + `<span class="charm-panel-sub">${t('charm_slots_hint')}</span></div>`;
    return head
        + `<div class="charm-slots" style="--charm-slot-cols:${CHARM_SLOT_COLS}">${cells.join('')}</div>`;
}

// Currency strip: Lemmas (towards the next Theorem) + spendable Theorems.
// The Lemma meter always reads plural (it is a count of ten); the Theorem
// count flips to its singular form at exactly one. Both widgets use the
// custom spell-book hover tooltip instead of a native `title` popup.
function _charmBuildCurrencyHTML() {
    ensureCharmState();
    const shards = (STATE && STATE.charmShards) || 0;
    const orbs = (STATE && STATE.charmOrbs) || 0;
    const orbLabel = t(orbs === 1 ? 'charm_currency_orb_one' : 'charm_currency_orbs');
    const tipAttrs = (kind) => ` onmouseenter="handleCharmCurrencyTip(event,'${kind}')"`
        + ` onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()"`;
    return `<div class="charm-currency">`
        + `<div class="charm-currency-item"${tipAttrs('shards')}>`
        + `<span class="charm-currency-val">${shards}<span class="charm-currency-max">/${CHARM_SHARDS_PER_ORB}</span></span>`
        + `<span class="charm-currency-label">${t('charm_currency_shards')}</span>`
        + `</div>`
        + `<div class="charm-currency-item is-orb"${tipAttrs('orbs')}>`
        + `<span class="charm-currency-val">${orbs}</span>`
        + `<span class="charm-currency-label">${orbLabel}</span>`
        + `</div>`
        + `</div>`;
}

// "Max rank only" filter row, above the charm list. Persisted on STATE so the
// choice survives a reload like every other loadout preference.
function _charmBuildFilterHTML() {
    ensureCharmState();
    const on = !!(STATE && STATE.charmMaxRankOnly);
    return `<label class="charm-filter">`
        + `<input type="checkbox" class="charm-filter-cb"${on ? ' checked' : ''}`
        + ` onchange="handleCharmMaxRankToggle(this.checked)">`
        + `<span class="charm-filter-label">${t('charm_filter_max_rank')}</span>`
        + `</label>`;
}

// Toggles the rank filter and re-renders the book.
function handleCharmMaxRankToggle(checked) {
    if (typeof STATE === 'undefined' || !STATE) return;
    STATE.charmMaxRankOnly = !!checked;
    if (typeof save === 'function') { try { save(); } catch (e) { /* best effort */ } }
    _charmRefreshSpellbook();
}

// Collapses the inventory to ONE entry per spell - the highest rank owned -
// when the "max rank only" filter is on. Charms that are currently sitting in
// a spell slot are kept regardless of rank: the filter is for tidying the
// ladder, it must never hide the charm you would have to drag back out.
function _charmApplyRankFilter(charms) {
    if (!STATE || !STATE.charmMaxRankOnly) return charms;
    const topRank = {};
    for (const c of charms) {
        if (!topRank[c.skillId] || c.rank > topRank[c.skillId]) topRank[c.skillId] = c.rank;
    }
    const slotted = Array.isArray(STATE.charmSlots) ? STATE.charmSlots : [];
    return charms.filter((c) => c.rank === topRank[c.skillId] || slotted.includes(c.key));
}

// The inventory grid (drag source for the spell slots).
function _charmBuildInventoryHTML() {
    ensureCharmState();
    const charms = (STATE && Array.isArray(STATE.charmInventory)) ? STATE.charmInventory : [];
    if (!charms.length) {
        return `<div class="charm-inv-grid"><div class="charm-inv-empty">${t('charm_inventory_empty')}</div></div>`;
    }
    const sorted = _charmApplyRankFilter(charms).sort((a, b) => {
        const an = getSkillName(a.skillId), bn = getSkillName(b.skillId);
        if (an !== bn) return an.localeCompare(bn);
        return a.rank - b.rank;
    });
    const items = sorted.map((charm) => {
        const slotted = STATE.charmSlots.includes(charm.key) ? ' is-slotted' : '';
        const bonus = charm.orbs > 0 ? `<span class="charm-item-orbs">+${charm.orbs * CHARM_ORB_DAMAGE_PCT}%</span>` : '';
        return `<div class="charm-item${slotted}" data-charm-key="${charm.key}"`
            + ` onmouseenter="handleCharmTip(event,'${charm.key}')" onmousemove="handleSkillTipMove(event)" onmouseleave="handleSkillTipLeave()">`
            + _charmIconMarkup(charm)
            + `<span class="charm-item-name">${getSkillName(charm.skillId)}</span>`
            + bonus
            + `</div>`;
    }).join('');
    return `<div class="charm-inv-grid">${items}</div>`;
}

// Renders the whole charm side of the spell book into the two hosts
// created by skill-spellbook.js.
function renderSpellbookCharmPanel() {
    ensureCharmState();
    const slotsHost = document.getElementById('spellbook-slots');
    if (slotsHost) slotsHost.innerHTML = _charmBuildSlotsHTML();
    const invHost = document.getElementById('spellbook-charms');
    if (invHost) {
        const head = (typeof buildSpellbookHeadHTML === 'function')
            ? buildSpellbookHeadHTML(t('charm_inventory_title'))
            : `<div class="charm-panel-title">${t('charm_inventory_title')}</div>`;
        // The shift-click instruction lives in the Theorem tooltip only -
        // repeating it as a standing line under the list just added noise.
        // The currency strip and the rank filter share one wrapper (.charm-tools)
        // so a short panel can lay them out side by side instead of stacked,
        // which is most of the panel's fixed chrome (see css/skills.css 4a-1).
        invHost.innerHTML = head
            + `<div class="charm-tools">${_charmBuildCurrencyHTML()}${_charmBuildFilterHTML()}</div>`
            + `<div class="charm-inv-panel" id="charm-inv-panel">${_charmBuildInventoryHTML()}</div>`;
    }
}

// Re-renders the spell book when it is open (hotbar lock states included).
function _charmRefreshSpellbook() {
    if (typeof isSpellbookOpen === 'function' && isSpellbookOpen()
        && typeof renderSpellbook === 'function') {
        renderSpellbook();
    }
    if (typeof renderSkillHotbar === 'function') {
        try { renderSkillHotbar(); } catch (e) { /* hotbar may not exist yet */ }
    }
}


//------------------------------------------------------------------------
//-------------------------TOOLTIP----------------------------------------
//------------------------------------------------------------------------

function handleCharmTip(e, charmKey) {
    if (typeof showHUDTooltip !== 'function') return;
    const html = buildCharmTooltipHTML(charmKey);
    if (html) showHUDTooltip(html, e);
}

// Hover tooltip for the Lemma / Theorem currency widgets. Called from inline
// attributes, so it must stay a global.
function handleCharmCurrencyTip(e, kind) {
    // Never fight an in-flight drag: the ghost follows the cursor and the
    // tooltip would sit on top of it.
    if (_charmDragState) return;
    if (typeof showHUDTooltip !== 'function') return;
    showHUDTooltip(buildCharmCurrencyTipHTML(kind), e);
}

// Builds the currency tooltip: what the currency is, how much you hold and
// what the next one buys you.
function buildCharmCurrencyTipHTML(kind) {
    ensureCharmState();
    const isOrb = (kind === 'orbs');
    const count = isOrb ? ((STATE && STATE.charmOrbs) || 0) : ((STATE && STATE.charmShards) || 0);
    // No emoji in the title either - the currency is named in words
    // everywhere else in the book now.
    const title = isOrb
        ? t(count === 1 ? 'charm_currency_orb_one' : 'charm_currency_orbs')
        : t('charm_currency_shards');
    const stat = isOrb
        ? `${t('charm_orbs_owned')}: <b style="color:#c39bd3">${count}</b>`
        : `${t('charm_tip_shards_progress')}: <b style="color:#7fd9ff">${count} / ${CHARM_SHARDS_PER_ORB}</b>`;

    // The Lemma meter also says how many are still missing, with the singular
    // form at exactly one.
    let tail = '';
    if (!isOrb) {
        const need = CHARM_SHARDS_PER_ORB - (count % CHARM_SHARDS_PER_ORB);
        tail = `<div class="skl-tip-note">${need === 1
            ? t('charm_tip_shards_need_one')
            : t('charm_tip_shards_need_many').replace('{n}', need)}</div>`;
    }

    return `<div class="skl-tip charm-tip">`
        + `<div class="skl-tip-title">${title}</div>`
        + `<div class="skl-tip-tags">${t('charm_tip_currency_tags')}</div>`
        + `<div class="skl-tip-stat">${stat}</div>`
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${isOrb ? t('charm_orbs_hint') : t('charm_shards_hint')}</div>`
        + tail
        + (isOrb ? `<div class="skl-tip-foot">${t('charm_shift_hint')}</div>` : '')
        + `</div>`;
}

// Hover tooltip for an empty spell slot (the drop target for a charm).
function handleCharmEmptySlotTip(e, slotIndex) {
    if (_charmDragState) return;
    if (typeof showHUDTooltip !== 'function') return;
    showHUDTooltip(buildCharmEmptySlotTipHTML(slotIndex), e);
}

function buildCharmEmptySlotTipHTML(slotIndex) {
    const pos = t('charm_slot_tip_of')
        .replace('{i}', slotIndex + 1)
        .replace('{n}', CHARM_SLOT_COUNT);
    return `<div class="skl-tip charm-tip">`
        + `<div class="skl-tip-title">🪄 ${t('charm_slot_tip_title')}</div>`
        + `<div class="skl-tip-tags">${pos}</div>`
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${t('charm_slot_tip_desc')}</div>`
        + `</div>`;
}

// Builds the hover tooltip for a charm (mirrors the skill tooltip look).
function buildCharmTooltipHTML(charmKey) {
    const charm = getCharmByKey(charmKey);
    if (!charm) return '';
    const slotted = (typeof STATE !== 'undefined' && STATE && Array.isArray(STATE.charmSlots)
        && STATE.charmSlots.includes(charm.key));
    const bonus = charm.orbs * CHARM_ORB_DAMAGE_PCT;
    const desc = (typeof getSkillDesc === 'function') ? getSkillDesc(charm.skillId) : '';
    const usable = charmRankMeetsPlayerLevel(charm.rank);
    const needMlvl = getCharmRankMinMonsterLevel(charm.rank);
    const needPlvl = getCharmRankMinPlayerLevel(charm.rank);
    // Level line: green when usable, red when the character is too low.
    // t() keys fall back to English when a translation is missing.
    const reqColor = usable ? '#2ecc71' : '#e06c55';
    const reqLine = (typeof t === 'function')
        ? `<div class="skl-tip-stat">${t('charm_tip_req_player')}: <b style="color:${reqColor}">${needPlvl}</b>`
            + ` <span style="opacity:.65">· ${t('charm_tip_req_drop')}: ${needMlvl}</span></div>`
        : `<div class="skl-tip-stat">Requires player Lv <b style="color:${reqColor}">${needPlvl}</b>`
            + ` <span style="opacity:.65">· drops at monster Lv ${needMlvl}+</span></div>`;
    const lockedLine = usable ? '' : `<div class="skl-tip-note" style="color:#e06c55">${
        (typeof t === 'function' ? t('charm_tip_locked_level') : 'Too high rank for your level - slot it once you reach the required level.')
    }</div>`;

    return `<div class="skl-tip charm-tip">`
        + `<div class="skl-tip-title">${CHARM_BASE_ICON} ${getSkillName(charm.skillId)}</div>`
        + `<div class="skl-tip-tags">${t('charm_tip_type')}</div>`
        + `<div class="skl-tip-stat">${t('skill_tip_rank')}: <b style="color:#f1c40f">${charm.rank}</b></div>`
        + reqLine
        + lockedLine
        + (bonus > 0
            ? `<div class="skl-tip-stat">${t('charm_tip_orb_bonus')}: <b style="color:#7fd9ff">+${bonus}%</b></div>`
            : '')
        + (slotted ? `<div class="skl-tip-note">${t('charm_tip_slotted')}</div>` : '')
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${desc}</div>`
        + `<div class="skl-tip-note">${t('charm_tip_unlock')}</div>`
        + `<div class="skl-tip-foot">${t('charm_shift_hint')} · ${t('charm_orbs_owned')}: ${(STATE.charmOrbs || 0)}</div>`
        + (!slotted ? `<div class="skl-tip-foot">${t('charm_rightclick_hint')}</div>` : '')
        + `</div>`;
}


//------------------------------------------------------------------------
//-------------------------DRAG & DROP------------------------------------
//------------------------------------------------------------------------
// Pointer-based, like the skill hotbar drag. A charm can be dragged from
// the inventory into a spell slot, between slots, and from a slot back into
// the inventory panel to unslot it.
//------------------------------------------------------------------------

function startCharmDrag(charmKey, e, fromSlot) {
    if (!getCharmByKey(charmKey)) return;
    _charmDragState = {
        charmKey,
        fromSlot: (fromSlot === undefined ? null : fromSlot),
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
    };

    const charm = getCharmByKey(charmKey);
    _charmDragGhost = document.createElement('div');
    _charmDragGhost.className = 'skill-drag-ghost charm-drag-ghost';
    _charmDragGhost.innerHTML = _charmIconMarkup(charm);
    document.body.appendChild(_charmDragGhost);
    _charmMoveGhost(e.clientX, e.clientY);

    document.addEventListener('pointermove', _onCharmDragMove, true);
    document.addEventListener('pointerup', _onCharmDragEnd, true);
    document.addEventListener('pointercancel', _onCharmDragEnd, true);
}

function _charmMoveGhost(x, y) {
    if (!_charmDragGhost) return;
    _charmDragGhost.style.left = (x + 10) + 'px';
    _charmDragGhost.style.top = (y + 10) + 'px';
}

function _charmHighlightDropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    document.querySelectorAll('.charm-slot.drop-target').forEach((n) => n.classList.remove('drop-target'));
    const slot = el && el.closest ? el.closest('.charm-slot') : null;
    if (slot) slot.classList.add('drop-target');
}

function _onCharmDragMove(e) {
    if (!_charmDragState) return;
    if (!_charmDragState.moved) {
        const dx = e.clientX - _charmDragState.startX;
        const dy = e.clientY - _charmDragState.startY;
        if (Math.hypot(dx, dy) < 4) return;
        _charmDragState.moved = true;
        document.body.classList.add('skill-dragging');
    }
    _charmMoveGhost(e.clientX, e.clientY);
    _charmHighlightDropTarget(e.clientX, e.clientY);
}

function _onCharmDragEnd(e) {
    if (!_charmDragState) return;
    const { charmKey, fromSlot, moved } = _charmDragState;
    _charmCleanupDrag();
    if (!moved) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el && el.closest ? el.closest('.charm-slot') : null;
    const invPanel = el && el.closest ? el.closest('.charm-inv-panel') : null;

    if (slot) {
        const slotIndex = Number(slot.getAttribute('data-charm-slot'));
        if (!Number.isNaN(slotIndex)) setCharmSlot(slotIndex, charmKey);
    } else if (invPanel && fromSlot !== null && fromSlot !== undefined) {
        clearCharmSlot(fromSlot);
    } else if (fromSlot !== null && fromSlot !== undefined) {
        // Dropped into empty space → return the charm to the inventory.
        clearCharmSlot(fromSlot);
    }
    // setCharmSlot()/clearCharmSlot() already re-rendered the book.
}

function _charmCleanupDrag() {
    _charmDragState = null;
    if (_charmDragGhost) { _charmDragGhost.remove(); _charmDragGhost = null; }
    document.body.classList.remove('skill-dragging');
    document.querySelectorAll('.charm-slot.drop-target').forEach((n) => n.classList.remove('drop-target'));
    document.removeEventListener('pointermove', _onCharmDragMove, true);
    document.removeEventListener('pointerup', _onCharmDragEnd, true);
    document.removeEventListener('pointercancel', _onCharmDragEnd, true);
}

// Installs the delegated charm interactions on the (persistent) spell book
// overlay: shift-click applies an orb, right-click slots into the next free
// spell slot, a normal press starts a drag.
function initCharmPanelInteractions(host) {
    if (!host || host.dataset.charmBound === '1') return;
    host.dataset.charmBound = '1';

    // Right-click a charm in the INVENTORY (.charm-item - filled slots use
    // .charm-slot and are intentionally excluded) to slot it into the first
    // empty spell slot.
    host.addEventListener('contextmenu', (e) => {
        const target = e.target.closest ? e.target.closest('.charm-item[data-charm-key]') : null;
        if (!target) return;   // anywhere else: leave the menu alone
        e.preventDefault();
        e.stopPropagation();
        const charmKey = target.getAttribute('data-charm-key');
        if (charmKey) _charmQuickSlot(charmKey);
    });

    host.addEventListener('pointerdown', (e) => {
        const target = e.target.closest ? e.target.closest('[data-charm-key]') : null;
        if (!target) return;
        const charmKey = target.getAttribute('data-charm-key');
        if (!charmKey) return;
        // Shift-left-click spends an orb on the charm.
        if (e.shiftKey && e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            applyOrbToCharm(charmKey);
            return;
        }
        if (e.button !== 0) return;
        const slotEl = target.closest('.charm-slot');
        const fromSlot = slotEl ? Number(slotEl.getAttribute('data-charm-slot')) : null;
        e.preventDefault();
        startCharmDrag(charmKey, e, Number.isNaN(fromSlot) ? null : fromSlot);
    });

    // Suppress the click that follows a drag so it can't re-apply an orb.
    host.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('[data-charm-key]')) e.preventDefault();
    });
}


//------------------------------------------------------------------------
//-------------------------GRID DROPS-------------------------------------
//------------------------------------------------------------------------
// Charms drop from defeated monsters and are claimed like every other grid
// drop. The shared helpers from endgame-grid-pickups.js handle the expiry,
// pause/resume and overlay bookkeeping.
//------------------------------------------------------------------------

// True when a charm drop occupies the cell (used by the shared
// drop-collision and stop/cleanup helpers).
function _charmCellHasDrop(row, col) {
    return _egCharmDrops.has(`${row}-${col}`);
}

// Weighted pool of player skills a monster can drop a charm for. The player's
// own class / ascendency / Heartbloom skills are three times as likely as a
// universal-spell charm so drops stay relevant to the character.
function _charmBuildDropSkillPool() {
    const pool = [];
    let ids = [];
    try { ids = getPlayerSkillIds(); } catch (e) { ids = []; }
    for (const id of ids) {
        const def = (typeof getSkillDef === 'function') ? getSkillDef(id) : null;
        if (!def) continue;
        const weight = (def.slotKind === 'universal') ? 1 : 3;
        for (let i = 0; i < weight; i++) pool.push(id);
    }
    return pool;
}

// Rolls a drop rank, capped by the killer's monster level: only ranks whose
// CHARM_RANK_MIN_MONSTER_LEVEL the monster meets participate in the roll, so
// a low-level creature can never produce a high-rank charm. Rank and skill
// are rolled independently so the huge universal arsenal can never dilute
// the chance of a high-rank own-class charm (which was the case when every
// skill×rank pair went into one pool).
function _charmRollDropRank(isBoss, monsterLevel) {
    const table = isBoss ? SPELL_RANK_DROP_WEIGHT_BOSS : SPELL_RANK_DROP_WEIGHT_NORMAL;
    const maxRank = getCharmRankMaxForMonsterLevel(monsterLevel);
    const eligible = Math.max(1, Math.min(table.length, maxRank));
    let total = 0;
    for (let i = 0; i < eligible; i++) total += table[i];
    if (!(total > 0)) return 1;
    let roll = Math.random() * total;
    for (let i = 0; i < eligible; i++) {
        roll -= table[i];
        if (roll <= 0) return i + 1;
    }
    return 1;
}

// Rolls a random charm key for a drop (or null when there is no roster yet).
function _charmRollDropKey(isBoss, monsterLevel) {
    const skills = _charmBuildDropSkillPool();
    if (!skills.length) return null;
    const skillId = skills[Math.floor(Math.random() * skills.length)];
    const rank = Math.min(_charmRollDropRank(!!isBoss, monsterLevel), getSkillMaxRank(skillId));
    return charmKeyFor(skillId, rank);
}

// Chance-driven charm drop after a monster death (bosses always drop).
// `monsterLevel` gates the drop rank via getCharmRankMaxForMonsterLevel -
// bosses share the same cap, they only guarantee a drop within it.
function _charmTryMonsterDrop(isBoss, monsterLevel) {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return false;
    if (_egCharmDrops.size >= CHARM_DROP_MAX_ON_BOARD) return false;

    const chance = isBoss ? CHARM_DROP_CHANCE_BOSS : CHARM_DROP_CHANCE_NORMAL;
    if (Math.random() > chance) return false;

    const dropKey = _charmRollDropKey(isBoss, monsterLevel);
    if (!dropKey) return false;
    const parsed = _charmParseKey(dropKey);
    if (!parsed) return false;

    if (typeof _egBuildPickupEligiblePool !== 'function') return false;
    const pool = _egBuildPickupEligiblePool();
    const free = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (!free.length) return false;

    const [r, c] = free[Math.floor(Math.random() * free.length)];
    const key = `${r}-${c}`;
    const charm = _charmMake(parsed.skillId, parsed.rank);

    _egCharmDrops.set(key, charm);
    _charmRenderOverlay(r, c, charm);
    _egScheduleTrackedExpiry(_egCharmDrops, key, charm, CHARM_DROP_LIFETIME_MS, `eg-charm-${r}-${c}`, _charmRemoveOverlay);
    return true;
}

// Writes the charm overlay into the cell's DOM.
function _charmRenderOverlay(row, col, charm) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-charm-overlay eg-charm-rank-${charm.rank}`;
    span.id = `eg-charm-${row}-${col}`;
    span.innerHTML = _charmIconMarkup(charm);
    el.appendChild(span);
}

function _charmRemoveOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-charm-${r}-${c}`);
    if (span) span.remove();
}

// Small pop animation when a charm is claimed.
function _charmAnimateClaim(row, col, charm) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el || typeof _egGetElementCentre !== 'function') return;
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater charm-floater';
    floater.textContent = CHARM_BASE_ICON;
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Player made a CORRECT action on a cell holding a charm → collect it.
function _charmCheckClaim(row, col) {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return false;
    const key = `${row}-${col}`;
    const charm = _egCharmDrops.get(key);
    if (!charm) return false;

    _egCancelTrackedExpiry(_egCharmDrops, key, charm);
    _egCharmDrops.delete(key);
    _charmRemoveOverlay(key);
    _charmAnimateClaim(row, col, charm);

    const res = grantCharm(charm.skillId, charm.rank);
    const name = getSkillName(charm.skillId);
    if (typeof showToast === 'function') {
        if (res.duplicate) {
            let msg = `💠 ${t('charm_pickup_duplicate')}: ${name} (${t('skill_tip_rank')} ${charm.rank}) - +1 ${t('charm_currency_shard_one')} (${res.shards}/${CHARM_SHARDS_PER_ORB})`;
            if (res.orbsMade > 0) msg += ` - 🔮 ${t('charm_orb_forged')}`;
            showToast(msg, '#c39bd3');
        } else {
            showToast(`🧿 ${t('charm_pickup_found')}: ${name} (${t('skill_tip_rank')} ${charm.rank})`, '#f5d98b');
        }
    }
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('player_equip_pickup'); } catch (e) { /* audio best-effort */ }
    }
    _charmRefreshSpellbook();
    return true;
}

// Player made a WRONG action on a cell holding a charm → it is destroyed.
function _charmDiscardDrop(row, col) {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egCharmDrops.has(key)) return;
    const charm = _egCharmDrops.get(key);
    _egCancelTrackedExpiry(_egCharmDrops, key, charm);
    _egCharmDrops.delete(key);
    _charmRemoveOverlay(key);
    if (typeof _egAnimatePickupDiscard === 'function') {
        try { _egAnimatePickupDiscard(row, col, { emoji: CHARM_BASE_ICON }); } catch (e) { /* anim best-effort */ }
    }
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('player_equip_not_pickup'); } catch (e) { /* audio best-effort */ }
    }
}

// Revealed cells can no longer be filled, so any charm sitting there would
// be permanently unclaimable - auto-collect it instead.
function _charmAutoClaimOnReveal(row, col) {
    if (_egCharmDrops.has(`${row}-${col}`)) _charmCheckClaim(row, col);
}

// Clears every charm drop from the board (encounter stop).
function _charmStopDrops() {
    Array.from(_egCharmDrops.entries()).forEach(([key, charm]) => {
        _egCancelTrackedExpiry(_egCharmDrops, key, charm);
    });
    _egCharmDrops.forEach((charm, key) => _charmRemoveOverlay(key));
    _egCharmDrops.clear();
}

// Re-places carried charm drops after a chain transition.
function _charmReplaceCarriedDrops(charms) {
    if (!Array.isArray(charms) || !charms.length) return;
    for (const charm of charms) {
        const pool = (typeof _egBuildPickupEligiblePool === 'function') ? _egBuildPickupEligiblePool() : [];
        const free = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
        if (!free.length) break;
        const [r, c] = free[Math.floor(Math.random() * free.length)];
        const key = `${r}-${c}`;
        _egCharmDrops.set(key, charm);
        _charmRenderOverlay(r, c, charm);
        _egScheduleTrackedExpiry(_egCharmDrops, key, charm, CHARM_DROP_LIFETIME_MS, `eg-charm-${r}-${c}`, _charmRemoveOverlay);
    }
}


//------------------------------------------------------------------------
//---------------------------DEV / TESTING--------------------------------
//------------------------------------------------------------------------
// Small helpers used by the dev tools and the endgame test screen to grant
// charms without waiting for a drop.
//------------------------------------------------------------------------

// Grants a charm (or a shard when already owned) by skill id + rank.
function charmGrantBySkill(skillId, rank) {
    const r = Math.max(1, Math.min(Number(rank) || 1, getSkillMaxRank(skillId)));
    return grantCharm(skillId, r);
}

// Places a skill's charm into the first free spell slot (creating it when
// the player does not own it yet). Returns the slot index, or -1.
// Dev/testing helper: bypasses the player-level gate so builds can be
// exercised at any character level.
function charmSlotSkill(skillId, rank) {
    ensureCharmState();
    const r = Math.max(1, Math.min(Number(rank) || 1, getSkillMaxRank(skillId)));
    const key = charmKeyFor(skillId, r);
    if (!getCharmByKey(key)) STATE.charmInventory.push(_charmMake(skillId, r));
    const free = STATE.charmSlots.indexOf(null);
    const index = free !== -1 ? free : 0;
    setCharmSlot(index, key, { bypassLevel: true });
    return index;
}
