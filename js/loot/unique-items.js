//------------------------------------------------------------------------
//-------------------UNIQUE ITEMS (IMPORT POINT)--------------------------
//------------------------------------------------------------------------
// The one path other files import unique-item data and logic from. Only the
// names with outside users are re-exported; definitions live in
// unique-item-data.js, the logic in unique-item-logic.js.
//------------------------------------------------------------------------

export { UNIQUE_ITEMS } from './unique-item-data.js';
export {
    _applyUniqueZeroLineAutomark,
    _buildUniqueItem,
    _getUniqueSpecialLines,
    _inferWeaponHands,
    _tryGenerateUniqueDrop,
} from './unique-item-logic.js';
