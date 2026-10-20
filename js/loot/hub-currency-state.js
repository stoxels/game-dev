import { CURRENCY_COLS, CURRENCY_ROWS } from './hub-currency-layout.js';

//------------------------------------------------------------------------
//-------------------CURRENCY STASH STATE----------------------------------
//------------------------------------------------------------------------

// Live currency stash grid; null represents an empty cell.
export let _currencyStash = Array.from({ length: CURRENCY_ROWS }, () => Array(CURRENCY_COLS).fill(null));

// Keep legacy global writes connected to the module binding.
try { Object.defineProperty(globalThis, '_currencyStash', { get() { return _currencyStash; }, set(v) { _currencyStash = v; }, configurable: true }); } catch (e) {}
