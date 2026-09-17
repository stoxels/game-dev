//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Facade for the unique-item surface. Data lives in unique-item-data.js,
// logic in unique-item-logic.js; both are re-exported unchanged.

export {
    EG_UNIQUE_DROP_CHANCE,
    EG_UNIQUE_ITEMS,
    EG_UNIQUE_ZERO_AUTOMARK_DE,
    EG_UNIQUE_ZERO_AUTOMARK_EN,
} from './unique-item-data.js';
export {
    EG_UNIQUE_TWO_HANDED_IDS,
    _egApplyUniqueZeroLineAutomark,
    _egBuildUniqueImplicits,
    _egBuildUniqueItem,
    _egGetUniqueSpecialLines,
    _egHasZeroAutomarkEquipped,
    _egHealUniqueItem,
    _egInferWeaponHands,
    _egStrengthenDownsideValue,
    _egTryGenerateUniqueDrop,
    _egUniqueFallbackBlockChance,
    _egUniqueFallbackDamage,
    _egUniqueFallbackDefenses,
    _egUniqueStatLabel,
} from './unique-item-logic.js';
