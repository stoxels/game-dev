//------------------------------------------------------------------------
//-------------------UNIQUE ITEM LOGIC------------------------------------
//------------------------------------------------------------------------
// Stat labels, base-stat fallbacks, item building and the drop roll for
// unique items. Definitions live in unique-item-data.js, the save-healing
// pass in unique-item-heal.js.
//------------------------------------------------------------------------

import { renderCell, updClues } from '../grid.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { cur } from '../state.js';
import { LANG } from '../translation/translations.js';
import { ptParseEffectSpec } from '../probability-tree/pt-effects.js';
import { ALL_BASE_TYPES } from './equipment-base-items.js';
import { _rollImplicitsForBase } from './loot-implicits.js';
import { _egMapLootRarityWeightMult } from '../endgame/endgame-map-launch.js';
import { SLOT_ICONS } from './equipment-slot-icons.js';
// Side-effect import kept for evaluation order: it must load before the data file (the save-healing code that needs it moved to unique-item-heal.js).
import '../hub/hub-save.js';
import { UNIQUE_DROP_CHANCE, UNIQUE_ITEMS, UNIQUE_ZERO_AUTOMARK_DE, UNIQUE_ZERO_AUTOMARK_EN } from './unique-item-data.js';
import { _equipped } from '../hub/hub-stash.js';

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
function _hasZeroAutomarkEquipped() {
    try {
        if (!_equipped) return false;
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
    if (!cur || !cur.grid) return 0;
    try {
        if (ptHasSkill('keystone_ergodic_field')) return 0;
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
        try { updClues(r, c, true); } catch (e) {}
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

// Fallbacks: a unique with no explicit defenses / damage / block chance borrows
// them from the closest base item (same slot, preferably same archetype, at
// or below its level), so it is never a useless item.
export function _uniqueFallbackDefenses(def) {
    const jewelry = new Set(['ring', 'earring', 'amulet', 'talisman']);
    if (jewelry.has(def.slotType)) return { armour: 0, evasion: 0, absorption: 0 };
    if (!Array.isArray(ALL_BASE_TYPES)) return null;
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
    if (!Array.isArray(ALL_BASE_TYPES)) return null;
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
    if (!Array.isArray(ALL_BASE_TYPES)) return null;
    let candidates = ALL_BASE_TYPES.filter(b => b.slotType === 'shield' && b.blockChance != null);
    if (!candidates.length) return 24;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    return best.blockChance != null ? best.blockChance : 24;
}

// Makes a legacy downside ~30% stronger to balance the newer implicits.
// ±1 stays untouched (e.g. -1 mistake_count) so it is not doubly harsh.
function _strengthenDownsideValue(v) {
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

// Two-handed unique weapons (everything else with slotType 'weapon' is 1H).
const UNIQUE_TWO_HANDED_IDS = new Set([
    'worldsplitter', 'doomcallers_maul', 'hammer_of_reasonable_doubt',
    'protractor_polearm', 'slide_rule_scythe',
]);

// Infers 1H/2H for a weapon item without a `hands` field (legacy saves).
// Prefers the unique def, then the base-type table, then a slow-interval heuristic.
export function _inferWeaponHands(item) {
    if (!item || item.slotType !== 'weapon') return null;
    if (item.baseId) {
        const def = UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId);
        if (def && (def.hands === 1 || def.hands === 2)) return def.hands;
        if (def && UNIQUE_TWO_HANDED_IDS.has(def.uniqueId)) return 2;
    }
    if (item.baseId) {
        const base = ALL_BASE_TYPES.find(b => b.id === item.baseId);
        if (base && (base.hands === 1 || base.hands === 2)) return base.hands;
    }
    // Heuristic: very slow swing (>= 9.8s) was a 2H swing in the old system.
    if (typeof item.attackIntervalSeconds === 'number' && item.attackIntervalSeconds >= 9.8) return 2;
    return 1;
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
// Called from _spawnLootDrop before the regular generator.
export function _tryGenerateUniqueDrop(monsterLevel = 1) {
    // The active map's loot-rarity bonus softens the odds (square-root scaled).
    const mult = Math.sqrt(Math.max(1, Number(_egMapLootRarityWeightMult()) || 1));
    if (Math.random() > UNIQUE_DROP_CHANCE * mult) return null;

    const eligible = UNIQUE_ITEMS.filter(u => u.minLevel <= monsterLevel);
    if (eligible.length === 0) return null;

    const def = eligible[Math.floor(Math.random() * eligible.length)];
    return _buildUniqueItem(def, monsterLevel);
}
