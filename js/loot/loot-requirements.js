//------------------------------------------------------------------------
//-------------------REQUIREMENTS PUBLIC FACADE---------------------------
//------------------------------------------------------------------------

// Compatibility facade for the equipment requirements module surface.
export {
    PLAYER_BASE_ATTRIBUTES,
    _sumAttributeBonuses,
    _computeLoadoutAttributes,
    _findUnmetRequirements,
    _simulateAndCheck,
    _checkMoveAllowed,
    _canEquipInSlot,
    _checkUnequipSlot,
    _formatRequirementPart,
    _getUnmetRequirementsText,
} from './loot-requirements-core.js';

export {
    _getWeaponHands,
    _isTwoHandedWeapon,
    _isOneHandedWeapon,
    _isDualWielding,
    _hasShieldEquipped,
    _checkHandCompatibilityInSlot,
    _handErrorMessage,
    _healWeaponHands,
} from './loot-requirements-weapons.js';

export {
    _showRequirementsToast,
    _previewEquipAttributes,
    _getSwapChainBreak,
    _isItemBlocked,
    _tryAutoUnequipOffhandForTwoHander,
    _migrateIllegalHandsToStash,
} from './loot-requirements-actions.js';
