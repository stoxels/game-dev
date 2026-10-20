//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Unique item logic: special-line extraction, zero-automark application,
// stat labels, fallbacks, implicits, healing, item building and the drop
// roll. Operates on UNIQUE_ITEMS (unique-item-data.js, already
// requirements-rebalanced at its eval time).

import { renderCell, updClues } from '../grid.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { save } from '../state.js';
import { LANG } from '../translation/translations.js';
import { ptParseEffectSpec } from '../probability-tree/pt-effects.js';
import { ALL_BASE_TYPES } from './equipment-base-items.js';
import { _rollImplicitsForBase } from './loot-implicits.js';
import { _egMapLootRarityWeightMult } from '../endgame/endgame-map-launch.js';
import { SLOT_ICONS } from './equipment-slot-icons.js';
import { saveHubState } from '../hub/hub-save.js';
import { UNIQUE_DROP_CHANCE, UNIQUE_ITEMS, UNIQUE_ZERO_AUTOMARK_DE, UNIQUE_ZERO_AUTOMARK_EN } from './unique-item-data.js';
import { _equipped, _inventory } from '../hub/hub-stash.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';




//------------------------------------------------------------------------
//-------------------HELPERS----------------------------------------------
//------------------------------------------------------------------------

// Returns the special (non-stat) modifier lines for a unique item or def.
// Currently only the zero-line auto-mark perk. Each entry is { en, de }.
export function _getUniqueSpecialLines(itemOrDef) {
    if (!itemOrDef) return [];
    // Item instances carry the copied boolean flag (see _buildUniqueItem).
    const hasZeroAutomark = !!itemOrDef.autoMarkZeroLines;
    // Defs may also declare explicit specialLines for future perks.
    const extra = Array.isArray(itemOrDef.specialLines) ? itemOrDef.specialLines : [];
    const out = extra
        .filter(s => s && (s.en || s.de))
        .map(s => ({ en: s.en || s.de, de: s.de || s.en }));
    if (hasZeroAutomark && !out.some(s => s.en === UNIQUE_ZERO_AUTOMARK_EN)) {
        out.push({ en: UNIQUE_ZERO_AUTOMARK_EN, de: UNIQUE_ZERO_AUTOMARK_DE });
    }
    // Passive-tree style effects (see `effects` on unique defs): one tooltip
    // line per spec, generated from the shared effect registry templates.
    const specs = Array.isArray(itemOrDef.uniqueEffects) ? itemOrDef.uniqueEffects
        : (Array.isArray(itemOrDef.effects) ? itemOrDef.effects : []);
    for (const spec of specs) {
        const parsed = ptParseEffectSpec(spec);
        if (!parsed) continue;
        const fill = (tpl) => String(tpl).replace('{v}', String(parsed.value));
        out.push({ en: fill(parsed.def.en), de: fill(parsed.def.de) });
    }
    return out;
}

// True when any currently equipped unique grants zero-line auto-mark.
export function _hasZeroAutomarkEquipped() {
    try {
        if (typeof _equipped === 'undefined' || !globalThis._equipped) return false;
        return Object.values(_equipped).some(it => !!it && !!it.isUnique && !!it.autoMarkZeroLines);
    } catch (e) { return false; }
}

// Unique QoL perk: mark every cell of each all-empty row/column as
// incorrect (grey X → userGrid=2 + systemMarkedGrid) at level start.
// Call AFTER buildGrid() so the DOM exists. Returns the number of cells
// marked. Respects ergodic_field / oracle (which disable all auto-marks).
// Zero lines hold no solution cells, so this can never solve the puzzle
// and intentionally skips checkWin().
export function _applyUniqueZeroLineAutomark() {
    if (!_hasZeroAutomarkEquipped()) return 0;
    if (typeof cur === 'undefined' || !cur || !cur.grid) return 0;
    try {
        if (typeof ptHasSkill === 'function' && ptHasSkill('keystone_ergodic_field')) return 0;
    } catch (e) {}
    if (window.LEVEL_FLAGS.oracleActive) return 0;

    const sol = cur.grid;
    const rows = sol.length;
    if (!rows) return 0;
    const cols = sol[0].length;
    if (!cols) return 0;

    const affected = [];
    const markCell = (r, c) => {
        if (sol[r][c] !== 0) return;
        if (typeof wrongGrid !== 'undefined' && globalThis.wrongGrid[r][c]) return;
        if (typeof userGrid === 'undefined' || globalThis.userGrid[r][c] === 2) return;
        // Only touch untouched/questioned cells - never overwrite fills.
        if (globalThis.userGrid[r][c] !== 0 && globalThis.userGrid[r][c] !== 3) return;
        globalThis.userGrid[r][c] = 2;
        try { globalThis.systemMarkedGrid[r][c] = true; } catch (e) {}
        try { renderCell(r, c); } catch (e) {}
        affected.push(`g-${r}-${c}`);
        // Keep intersecting non-zero lines' clue flags consistent; isInitial
        // suppresses reward side-effects (see updClues).
        try { if (typeof updClues === 'function') updClues(r, c, true); } catch (e) {}
    };

    for (let r = 0; r < rows; r++) {
        let empty = true;
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1) { empty = false; break; }
        }
        if (!empty) continue;
        for (let c = 0; c < cols; c++) markCell(r, c);
    }
    for (let c = 0; c < cols; c++) {
        let empty = true;
        for (let r = 0; r < rows; r++) {
            if (sol[r][c] === 1) { empty = false; break; }
        }
        if (!empty) continue;
        for (let r = 0; r < rows; r++) markCell(r, c);
    }

    if (affected.length && typeof _applyCellEffect === 'function') {
        try { globalThis._applyCellEffect(affected, 'mark'); } catch (e) {}
    }
    return affected.length;
}

// Localized label for one unique stat line; '#' is replaced by the value
// with an explicit '+' sign for positive numbers.
export function _uniqueStatLabel(stat) {
    const template = (LANG === 'de') ? (stat.de || stat.en) : (stat.en || stat.de);
    const val = Number(stat.value) || 0;
    let str = String(template);
    // '{a}' = absolute value, for hand-written negative lines like
    // "{a}% reduced Physical Damage" (value -12 -> "12% reduced ...").
    if (str.includes('{a}')) str = str.split('{a}').join(String(Math.abs(val)));
    const signed = val >= 0 ? `+${val}` : `${val}`;
    // Templates historically use '+#' / '-#' while the helper also adds a
    // sign - replacing only '#' would produce "++2" / "--30" (e.g. Pebble
    // of Patience). Handle signed placeholders first.
    if (str.includes('+#') || str.includes('-#')) {
        return str.replace('+#', signed).replace('-#', signed);
    }
    return str.replace('#', signed);
}

// Fallback: derive base defenses / damage from the closest base item
// so uniques without explicit stats still have meaningful base armor / damage
// and are not useless. This also fixes old uniques that were defined without
// a defenses/damage field.
export function _uniqueFallbackDefenses(def) {
    const jewelry = new Set(['ring', 'earring', 'amulet', 'talisman']);
    if (jewelry.has(def.slotType)) return { armour: 0, evasion: 0, absorption: 0 };
    if (typeof ALL_BASE_TYPES === 'undefined' || !Array.isArray(ALL_BASE_TYPES)) return null;
    let candidates = ALL_BASE_TYPES.filter(b => b.slotType === def.slotType);
    if (!candidates.length) return null;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    if (best && best.defenses) return { armour: best.defenses.armour || 0, evasion: best.defenses.evasion || 0, absorption: best.defenses.absorption || 0 };
    return null;
}
export function _uniqueFallbackDamage(def) {
    if (typeof ALL_BASE_TYPES === 'undefined' || !Array.isArray(ALL_BASE_TYPES)) return null;
    let candidates = ALL_BASE_TYPES.filter(b => b.slotType === def.slotType && b.damage && !b.casterKind);
    if (!candidates.length) return null;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    if (!best || !best.damage) return null;
    const out = { damage: { min: best.damage.min, max: best.damage.max } };
    if (best.attackIntervalSeconds != null) out.attackIntervalSeconds = best.attackIntervalSeconds;
    else if (def.slotType === 'ranged') out.attackIntervalSeconds = 3.0; // sensible default for ranged
    return out;
}
export function _uniqueFallbackBlockChance(def) {
    if (def.slotType !== 'shield') return null;
    if (typeof ALL_BASE_TYPES === 'undefined' || !Array.isArray(ALL_BASE_TYPES)) return null;
    let candidates = ALL_BASE_TYPES.filter(b => b.slotType === 'shield' && b.blockChance != null);
    if (!candidates.length) return 24;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    return best.blockChance != null ? best.blockChance : 24;
}

// Helper: strenghten downside values to balance new implicits (~30% stronger).
// Keeps ±1 untouched (e.g. -1 mistake_count) to avoid double-harsh penalties.
export function _strengthenDownsideValue(v) {
    if (v === 0 || Math.abs(v) === 1) return v;
    const factor = 1.30;
    if (Number.isInteger(v)) {
        const scaled = v * factor;
        let r = Math.round(scaled);
        if (r === v) r = v > 0 ? v + 1 : v - 1;
        return r;
    }
    const scaled = v * factor;
    return Math.round(scaled * 10) / 10;
}
// Reworked ("v2") uniques author their downside numbers exactly as intended;
// only legacy defs get the historic +30% strengthening.
export function _uniqueDownsideValue(def, v) {
    return (def && def.v2) ? v : _strengthenDownsideValue(v);
}

// Everything on a unique that must follow its definition when the definition
// is rebalanced: stat lines, downsides, passive-style effects.
export function _uniqueContentSig(def) {
    return JSON.stringify([
        def.v2 ? 2 : 1,
        (def.bonuses || []).map(b => [b.key, b.value]),
        (def.downsides || []).map(d => [d.key, d.value]),
        def.effects || [],
        def.specialLines || [],
        def.v2 ? (def.defenses || null) : null,
    ]);
}

// Builds the unique's mod list (bonus block + one downside mod per downside).
export function _buildUniqueMods(def) {
    const bonusMod = {
        familyId: `unique_${def.uniqueId}`,
        type: 'unique',
        tier: 0,
        rolledStats: def.bonuses.map(stat => ({
            key: stat.key,
            label: _uniqueStatLabel(stat),
            value: stat.value,
        })),
    };
    const downsideMods = (def.downsides || []).map((stat, i) => {
        const sv = _uniqueDownsideValue(def, stat.value);
        const tmp = { ...stat, value: sv };
        return {
            familyId: `unique_${def.uniqueId}_down_${i}`,
            type: 'unique',
            tier: 0,
            isDownside: true,
            rolledStats: [{
                key: stat.key,
                label: _uniqueStatLabel(tmp),
                value: sv,
            }],
        };
    });
    return [bonusMod].concat(downsideMods);
}

export function _buildUniqueImplicits(def, defenses) {
    try {
        if (typeof _rollImplicitsForBase !== 'function') return [];
        const syntheticBase = {
            slotType: def.slotType,
            defenses: defenses || def.defenses || { armour: 0, evasion: 0, absorption: 0 },
            requirements: def.requirements || { level: def.minLevel || 1 },
            minLevel: def.minLevel || 1
        };
        const res = _rollImplicitsForBase(syntheticBase);
        return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
}
// Retroactively heals an already-stashed unique that was saved before
// Two-handed unique weapons (everything else with slotType 'weapon' is 1H).
export const UNIQUE_TWO_HANDED_IDS = new Set([
    'worldsplitter', 'doomcallers_maul', 'hammer_of_reasonable_doubt',
    'protractor_polearm', 'slide_rule_scythe',
]);

// Infers 1H/2H for a weapon item without a `hands` field (legacy saves).
// Prefers the unique def, then the base-type table, then a slow-interval heuristic.
export function _inferWeaponHands(item) {
    if (!item || item.slotType !== 'weapon') return null;
    if (typeof UNIQUE_ITEMS !== 'undefined' && item.baseId) {
        const def = UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId);
        if (def && (def.hands === 1 || def.hands === 2)) return def.hands;
        if (def && UNIQUE_TWO_HANDED_IDS.has(def.uniqueId)) return 2;
    }
    if (typeof ALL_BASE_TYPES !== 'undefined' && item.baseId) {
        const base = ALL_BASE_TYPES.find(b => b.id === item.baseId);
        if (base && (base.hands === 1 || base.hands === 2)) return base.hands;
    }
    // Heuristic: very slow swing (>= 9.8s) was a 2H swing in the old system.
    if (typeof item.attackIntervalSeconds === 'number' && item.attackIntervalSeconds >= 9.8) return 2;
    return 1;
}

// base armor/damage was added or before implicits/downside rebalance.
// Mutates `item` in place, returns true if anything was changed.
export function _healUniqueItem(item) {
    if (!item || !item.isUnique || !item.baseId) return false;
    let changed = false;
    let def = null;
    if (typeof UNIQUE_ITEMS !== 'undefined' && Array.isArray(UNIQUE_ITEMS)) {
        def = UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId) || null;
    }
    // --- content resync: stat lines / downsides / effects follow the def ---
    // Stashed copies are snapshots; when a unique is rebalanced its saved
    // copies must pick up the new numbers (crafting is blocked on uniques, so
    // the mod list is always exactly what the def says).
    if (def && Array.isArray(def.bonuses) && item.uniqueSig !== _uniqueContentSig(def)) {
        item.mods = _buildUniqueMods(def);
        if (Array.isArray(def.effects) && def.effects.length) item.uniqueEffects = [...def.effects];
        else delete item.uniqueEffects;
        if (def.v2 && def.defenses) item.defenses = { armour: def.defenses.armour || 0, evasion: def.defenses.evasion || 0, absorption: def.defenses.absorption || 0 };
        item.uniqueSig = _uniqueContentSig(def);
        changed = true;
    }
    // --- requirements: re-sync attributes after a requirement rebalance ---
    if (def && def.requirements && item.requirements) {
        for (const k of ['str', 'agi', 'int']) {
            const want = def.requirements[k] || 0;
            if ((item.requirements[k] || 0) !== want) {
                item.requirements[k] = want;
                changed = true;
            }
        }
    }
    // --- defenses ---
    let expDef = null;
    if (def && def.defenses) expDef = def.defenses;
    else if (typeof _uniqueFallbackDefenses === 'function') {
        try { expDef = _uniqueFallbackDefenses({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 }); } catch (e) { expDef = null; }
    }
    if (expDef) {
        const cur = item.defenses;
        const missing = !cur || typeof cur.armour !== 'number' || typeof cur.evasion !== 'number' || typeof cur.absorption !== 'number';
        const zeroButExpNonZero = cur && cur.armour === 0 && cur.evasion === 0 && cur.absorption === 0 && (expDef.armour || expDef.evasion || expDef.absorption);
        if (missing || zeroButExpNonZero) {
            item.defenses = { armour: expDef.armour || 0, evasion: expDef.evasion || 0, absorption: expDef.absorption || 0 };
            changed = true;
        }
    }
    // --- damage ---
    let expDmg = null, expInterval = undefined;
    if (def && def.damage) { expDmg = def.damage; expInterval = def.attackIntervalSeconds; }
    else if (typeof _uniqueFallbackDamage === 'function') {
        try {
            const fb = _uniqueFallbackDamage({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 });
            if (fb) { expDmg = fb.damage; expInterval = fb.attackIntervalSeconds; }
        } catch (e) {}
    }
    if (expDmg && (!item.damage || typeof item.damage.min !== 'number' || typeof item.damage.max !== 'number')) {
        item.damage = { min: expDmg.min, max: expDmg.max };
        if (expInterval != null) item.attackIntervalSeconds = expInterval;
        changed = true;
    }
    // --- blockChance (shields) ---
    if (item.slotType === 'shield') {
        let expBlock = null;
        if (def && def.blockChance != null) expBlock = def.blockChance;
        else if (typeof _uniqueFallbackBlockChance === 'function') {
            try { expBlock = _uniqueFallbackBlockChance({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || 1 }); } catch (e) {}
        }
        if (expBlock != null && (item.blockChance == null || typeof item.blockChance !== 'number')) {
            item.blockChance = expBlock;
            changed = true;
        }
    }
    // --- hands (1H/2H weapons) ---
    if (item.slotType === 'weapon' && (item.hands !== 1 && item.hands !== 2)) {
        if (def && (def.hands === 1 || def.hands === 2)) {
            item.hands = def.hands;
            changed = true;
        } else if (typeof _inferWeaponHands === 'function') {
            const inferred = _inferWeaponHands(item);
            if (inferred === 1 || inferred === 2) {
                item.hands = inferred;
                changed = true;
            }
        } else {
            item.hands = 1;
            changed = true;
        }
    }
    // --- implicits (now allowed on uniques) ---
    if (!Array.isArray(item.implicits) || item.implicits.length === 0) {
        const expImps = def ? _buildUniqueImplicits(def, item.defenses || expDef) : [];
        // Also try fallback from item itself if no def
        let imps = expImps;
        if ((!imps || !imps.length) && typeof _rollImplicitsForBase === 'function') {
            try {
                const syn = { slotType: item.slotType, defenses: item.defenses || expDef || {}, requirements: item.requirements || { level: item.itemLevel || 1 }, minLevel: item.itemLevel || 1 };
                imps = _rollImplicitsForBase(syn) || [];
            } catch (e) { imps = []; }
        }
        if (imps && imps.length) {
            item.implicits = imps;
            changed = true;
        } else if (!Array.isArray(item.implicits)) {
            item.implicits = [];
        }
    }
    // --- unique-only QoL perks (non-stat flags) ---
    if (def && def.autoMarkZeroLines && !item.autoMarkZeroLines) {
        item.autoMarkZeroLines = true;
        changed = true;
    }
    // --- downsides: strengthen to balance new implicits ---
    if (def && Array.isArray(def.downsides) && Array.isArray(item.mods)) {
        for (let i = 0; i < def.downsides.length; i++) {
            const stat = def.downsides[i];
            const expected = _uniqueDownsideValue(def, stat.value);
            const fid = `unique_${def.uniqueId}_down_${i}`;
            const mod = item.mods.find(m => m.familyId === fid && m.isDownside);
            if (!mod || !mod.rolledStats || !mod.rolledStats[0]) continue;
            const curVal = mod.rolledStats[0].value;
            if (curVal !== expected) {
                mod.rolledStats[0].value = expected;
                // rebuild label with new value
                const tmpStat = { ...stat, value: expected };
                mod.rolledStats[0].label = _uniqueStatLabel(tmpStat);
                // also keep key consistent
                mod.rolledStats[0].key = stat.key;
                changed = true;
            }
        }
    }
    return changed;
}

// Builds the full item object for a unique definition.
export function _buildUniqueItem(def, monsterLevel) {
    const name = (LANG === 'de') ? (def.nameDe || def.nameEn) : def.nameEn;
    const icon = def.icon || SLOT_ICONS[def.slotType] || '📦';

    // Resolve base stats - use explicit values if present, otherwise fall back
    // to the closest base item so every unique has meaningful armor / damage.
    let defenses = null;
    if (def.defenses) defenses = { ...def.defenses };
    else defenses = _uniqueFallbackDefenses(def);

    let damage = null;
    let attackIntervalSeconds = undefined;
    if (def.damage) {
        damage = { ...def.damage };
        attackIntervalSeconds = def.attackIntervalSeconds;
    } else {
        const fb = _uniqueFallbackDamage(def);
        if (fb) {
            damage = fb.damage;
            attackIntervalSeconds = fb.attackIntervalSeconds;
        }
    }

    let blockChance = def.blockChance;
    if (blockChance == null && def.slotType === 'shield') {
        const fb = _uniqueFallbackBlockChance(def);
        if (fb != null) blockChance = fb;
    }

    const implicits = _buildUniqueImplicits(def, defenses);

    return {
        id: `${def.uniqueId}_${Date.now()}_${Math.floor(Math.random() * 10000)}_u`,
        baseId: def.uniqueId,
        name,
        baseName: name,
        icon,
        ...(def.autoMarkZeroLines ? { autoMarkZeroLines: true } : {}),

        category: 'equip',
        slotType: def.slotType,
        archetype: def.archetype || 'any',
        rarity: 'legendary',
        isUnique: true,

        itemLevel: Math.max(def.minLevel, monsterLevel || 1),
        requirements: JSON.parse(JSON.stringify(def.requirements || {})),

        ...(defenses ? { defenses } : {}),
        ...(damage ? { damage, ...(attackIntervalSeconds != null ? { attackIntervalSeconds } : {}) } : {}),
        ...(def.hands ? { hands: def.hands } : (def.slotType === 'weapon' ? { hands: 1 } : {})),
        ...(blockChance != null ? { blockChance } : {}),

        mods: _buildUniqueMods(def),
        ...(Array.isArray(def.effects) && def.effects.length ? { uniqueEffects: [...def.effects] } : {}),
        uniqueSig: _uniqueContentSig(def),
        implicits,

        flavorEn: def.flavorEn,
        flavorDe: def.flavorDe,
    };
}


//------------------------------------------------------------------------
//-------------------DROP ROLLER------------------------------------------
//------------------------------------------------------------------------

// Returns a unique item object, or null when this drop is not a unique.
// Called from _spawnLootDrop BEFORE the regular generator.
export function _tryGenerateUniqueDrop(monsterLevel = 1) {
    // Active map's loot rarity bonus softens the odds in the player's favor.
    let mult = 1;
    if (typeof _egMapLootRarityWeightMult === 'function') {
        mult = Math.sqrt(Math.max(1, Number(_egMapLootRarityWeightMult()) || 1));
    }
    if (Math.random() > UNIQUE_DROP_CHANCE * mult) return null;

    const eligible = UNIQUE_ITEMS.filter(u => u.minLevel <= monsterLevel);
    if (eligible.length === 0) return null;

    const def = eligible[Math.floor(Math.random() * eligible.length)];
    return _buildUniqueItem(def, monsterLevel);
}

// ----------------------------------------------------------------------
// Retroactively heals already-stashed uniques that were saved before
// base armor/damage was added. Runs once after definitions are loaded
// to cover the load-order race where _loadHubState ran before this
// file was parsed (hub.js calls _loadHubState at file bottom).
// Also healed on every future _loadHubState via the hub's own block.
// ----------------------------------------------------------------------
// Module era: unique-items.js evaluates inside an import cycle, so running
// this HERE would read uninitialized _inventory/_equipped (typeof THROWS
// on TDZ bindings) and silently skip the live-stash heal. Classic order
// (unique-items BEFORE hub) always saw them ABSENT and skipped the live heal
// too - but it DID heal the persisted STATE. Defer to DOMContentLoaded: all
// bindings are initialized (live mirrors still empty - hub loads on user
// action), the STATE heal runs as in classic, and the audit stays honest
// (established step-5 passive-tree pattern).
function _bootHealExistingUniqueStash() {
    try {
        if (typeof _healUniqueItem !== 'function') return;
        let changed = false;
        const healGridState = (grid) => {
            if (!Array.isArray(grid)) return;
            for (let r = 0; r < grid.length; r++) {
                if (!Array.isArray(grid[r])) continue;
                for (let c = 0; c < grid[r].length; c++) {
                    const it = grid[r][c];
                    if (it && it.isUnique && _healUniqueItem(it)) changed = true;
                }
            }
        };
        // Heal STATE (persisted) and live _inventory/_equipped if already initialized
        if (typeof STATE !== 'undefined' && STATE) {
            if (Array.isArray(STATE.egInventory)) healGridState(STATE.egInventory);
            if (STATE.egEquipped && typeof STATE.egEquipped === 'object') {
                for (const it of Object.values(STATE.egEquipped)) if (it && it.isUnique && _healUniqueItem(it)) changed = true;
            }
            if (STATE.egMapSlotItem && STATE.egMapSlotItem.isUnique && _healUniqueItem(STATE.egMapSlotItem)) changed = true;
            if (STATE.egCraftingBenchItem && STATE.egCraftingBenchItem.isUnique && _healUniqueItem(STATE.egCraftingBenchItem)) changed = true;
        }
        if (typeof _inventory !== 'undefined' && Array.isArray(_inventory)) healGridState(_inventory);
        if (typeof _equipped !== 'undefined' && _equipped && typeof _equipped === 'object') {
            for (const it of Object.values(_equipped)) if (it && it.isUnique && _healUniqueItem(it)) changed = true;
        }
        if (typeof _egMapSlotItem !== 'undefined' && globalThis._egMapSlotItem && globalThis._egMapSlotItem.isUnique && _healUniqueItem(globalThis._egMapSlotItem)) changed = true;
        if (typeof _craftingBenchItem !== 'undefined' && globalThis._craftingBenchItem && globalThis._craftingBenchItem.isUnique && _healUniqueItem(globalThis._craftingBenchItem)) changed = true;
        if (changed) {
            if (typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
            else if (typeof save === 'function') { try { save(); } catch (e) {} }
        }
    } catch (e) { /* ignore load-order */ }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _bootHealExistingUniqueStash);
} else {
    _bootHealExistingUniqueStash();
}
