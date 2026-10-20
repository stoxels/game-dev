//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Facade for the unique-item surface. Data lives in unique-item-data.js,
// logic in unique-item-logic.js; both are re-exported unchanged.

export {
    UNIQUE_DROP_CHANCE,
    UNIQUE_ITEMS,
    UNIQUE_ZERO_AUTOMARK_DE,
    UNIQUE_ZERO_AUTOMARK_EN,
} from './unique-item-data.js';
export {
    UNIQUE_TWO_HANDED_IDS,
    _applyUniqueZeroLineAutomark,
    _buildUniqueImplicits,
    _buildUniqueItem,
    _buildUniqueMods,
    _getUniqueSpecialLines,
    _hasZeroAutomarkEquipped,
    _healUniqueItem,
    _inferWeaponHands,
    _strengthenDownsideValue,
    _tryGenerateUniqueDrop,
    _uniqueFallbackBlockChance,
    _uniqueFallbackDamage,
    _uniqueContentSig,
    _uniqueDownsideValue,
    _uniqueFallbackDefenses,
    _uniqueStatLabel,
} from './unique-item-logic.js';
