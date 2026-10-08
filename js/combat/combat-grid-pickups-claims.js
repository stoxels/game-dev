import { _charmAutoClaimOnReveal } from '../skills/skill-charms.js';
import { _egCheckMapDropClaim, _egMapDrops } from '../loot/loot-map-drops.js';
import { _egCurrencyDrops, _egIsActive, _egItemDrops, _egLootDrops, _egPickups } from './combat-state.js';
import { _egCheckLootClaim } from './combat-grid-pickups-loot.js';
import { _egCheckCurrencyDropClaim } from './combat-grid-pickups-currency.js';
import { _egCheckItemDropClaim } from './combat-grid-pickups-items.js';
import { _egCheckPickupClaim } from './combat-grid-pickups-spawner.js';

// Called from renderCell whenever a cell becomes visually revealed
// (via an ability, passive ability, or item reveal effect).
// Revealed cells can no longer be filled by the player, so any drop
// sitting there would be permanently unclaimable - instead it is
// automatically picked up using the normal claim flow.
export function _egAutoClaimDropsOnReveal(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;

    // Claim every drop type present (not else-if) - spawn guards now keep
    // drops from stacking, but this stays defensive so a stacked legacy
    // state can never leave a stuck overlay behind.
    if (_egPickups.has(key)) _egCheckPickupClaim(row, col);
    if (_egLootDrops.has(key)) _egCheckLootClaim(row, col);
    if (_egCurrencyDrops.has(key)) _egCheckCurrencyDropClaim(row, col);
    if (_egItemDrops.has(key)) _egCheckItemDropClaim(row, col);
    if (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key)) _egCheckMapDropClaim(row, col);
    if (typeof _charmAutoClaimOnReveal === 'function') _charmAutoClaimOnReveal(row, col);
}
