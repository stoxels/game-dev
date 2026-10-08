//----------------------------------------------------------------------
//---------------------CURRENCY BOOT HEAL + STYLES----------------------
//----------------------------------------------------------------------

// One-time heal of legacy currency/shard items, plus the three CSS
// rules the currency strip needs (selected chip, use-mode cursor,
// tooltip description). The heal is deferred to DOMContentLoaded on
// purpose: this module evaluates inside an import cycle, so running it
// here would read a not-yet-initialized _egCurrencyStash (typeof THROWS
// on TDZ bindings) and silently skip.

import { _egCurrencyStash, _egHealCurrencyItem } from '../endgame/endgame-hub.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { EG_SHARD_DEFS } from './loot-shards.js';


function _egBootHealExistingCurrencyStash() {
    try {
        if (typeof _egCurrencyStash !== 'undefined' && Array.isArray(_egCurrencyStash)) {
            for (let r = 0; r < _egCurrencyStash.length; r++) {
                if (!Array.isArray(_egCurrencyStash[r])) continue;
                for (let c = 0; c < _egCurrencyStash[r].length; c++) {
                    const it = _egCurrencyStash[r][c];
                    if (!it) continue;
                    if (typeof _egHealCurrencyItem === 'function') _egHealCurrencyItem(it);
                    else if (!it.description || !it.category) {
                        const d = EG_CURRENCY_DEFS[it.id] || (typeof EG_SHARD_DEFS !== 'undefined' ? EG_SHARD_DEFS[it.id] : null);
                        if (d) {
                            if (!it.description) it.description = d.description;
                            if (!it.category) it.category = d.category || 'currency';
                            if (!it.rarity) it.rarity = d.rarity || 'currency';
                            if (!it.name) it.name = d.name;
                            if (!it.icon) it.icon = d.icon;
                        }
                    }
                }
            }
        }
    } catch (e) { /* ignore */ }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _egBootHealExistingCurrencyStash);
} else {
    _egBootHealExistingCurrencyStash();
}

(function _egInjectCurrencyStyles() {
    if (document.getElementById('eg-currency-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-currency-styles';
    style.textContent = `
        .eg-item-chip.eg-currency-selected {
            outline: 2px solid #f5d98a;
            box-shadow: 0 0 10px rgba(245,217,138,0.8);
            border-radius: 6px;
        }
        body.eg-currency-use-active .eg-item-chip { cursor: crosshair; }
        .eg-tt-desc { color: #ccc; font-size: 0.85rem; padding: 4px 0; }
    `;
    document.head.appendChild(style);
})();
