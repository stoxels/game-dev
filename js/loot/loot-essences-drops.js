//----------------------------------------------------------------------
//---------------------ESSENCE DROPS FROM MONSTERS----------------------
//----------------------------------------------------------------------

// Every family drops at an equal weight, so all 95 targeted essences
// are equally likely; rarity differentiation comes from map tier and
// the active map's loot quantity bonus.

import { _spawnCurrencyDrop } from '../combat/combat-grid-pickups-currency.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _ESSENCE_FAMILIES } from './loot-essences.js';
import { ESSENCE_DEFS } from './loot-essences-defs.js';


// One entry per modifier family - equal weight so every targeted essence is
// equally likely to drop (rarity differentiation via map tier/loot quantity).
export const ESSENCE_DROP_TABLE = _ESSENCE_FAMILIES.map(fid => ({ id: 'essence_' + fid, weight: 100 }));

export const ESSENCE_DROP_CHANCE_NORMAL = 0.06; // 6% per normal kill
export const ESSENCE_DROP_CHANCE_BOSS = 0.45;   // bosses often reward one

export function _rollEssenceDef() {
    const total = ESSENCE_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of ESSENCE_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return ESSENCE_DEFS[entry.id];
    }
    return ESSENCE_DEFS[ESSENCE_DROP_TABLE[0].id];
}

// Called when a monster dies. Essences land on the grid as pickup drops
// and are claimed like currency orbs.
// force - skip the chance roll (the kill handler already picked this bucket).
export function _tryDropEssence(isBoss, force = false) {
    const baseChance = isBoss ? ESSENCE_DROP_CHANCE_BOSS : ESSENCE_DROP_CHANCE_NORMAL;
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (!force && Math.random() > chance) return;
    const def = _rollEssenceDef();
    if (!def) return;
    if (typeof _spawnCurrencyDrop === 'function') {
        _spawnCurrencyDrop(def);
    }
}
