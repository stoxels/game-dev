//------------------------------------------------------------------------
//-------------------REQUIREMENTS PUBLIC FACADE---------------------------
//------------------------------------------------------------------------

// Compatibility facade for the equipment requirements module surface.
export {
    EG_PLAYER_BASE_ATTRIBUTES,
    _egSumAttributeBonuses,
    _egComputeLoadoutAttributes,
    _egFindUnmetRequirements,
    _egSimulateAndCheck,
    _egCheckMoveAllowed,
    _egCanEquipInSlot,
    _egCheckUnequipSlot,
    _egFormatRequirementPart,
    _egGetUnmetRequirementsText,
} from './loot-requirements-core.js';

export {
    _egGetWeaponHands,
    _egIsTwoHandedWeapon,
    _egIsOneHandedWeapon,
    _egIsDualWielding,
    _egHasShieldEquipped,
    _egCheckHandCompatibilityInSlot,
    _egHandErrorMessage,
    _egHealWeaponHands,
} from './loot-requirements-weapons.js';

export {
    _egShowRequirementsToast,
    _egPreviewEquipAttributes,
    _egGetSwapChainBreak,
    _egIsItemBlocked,
    _egTryAutoUnequipOffhandForTwoHander,
    _egMigrateIllegalHandsToStash,
} from './loot-requirements-actions.js';
