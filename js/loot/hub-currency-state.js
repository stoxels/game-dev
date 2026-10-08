import { EG_CURRENCY_COLS, EG_CURRENCY_ROWS } from './hub-currency-layout.js';

//------------------------------------------------------------------------
//-------------------CURRENCY STASH STATE----------------------------------
//------------------------------------------------------------------------

// Live currency stash grid; null represents an empty cell.
export let _egCurrencyStash = Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));

// Keep legacy global writes connected to the module binding.
try { Object.defineProperty(globalThis, '_egCurrencyStash', { get() { return _egCurrencyStash; }, set(v) { _egCurrencyStash = v; }, configurable: true }); } catch (e) {}
