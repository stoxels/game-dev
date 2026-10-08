//------------------------------------------------------------------------
//-------------------CURRENCY PUBLIC FACADE--------------------------------
//------------------------------------------------------------------------

// Compatibility facade for the currency tab's historical module surface.
export {
    EG_CURRENCY_COLS,
    EG_CURRENCY_ROWS,
    EG_CURRENCY_SLOT_MAP,
    EG_CURRENCY_SLOT_REVERSE,
    _egCurrencyDefForId,
    _egCurrencyIdForSlot,
    _egCurrencySlotForId,
} from './hub-currency-layout.js';

export { _egCurrencyStash } from './hub-currency-state.js';
export { _egBuildCraftingBenchSlotHTML } from './hub-currency-ui.js';
