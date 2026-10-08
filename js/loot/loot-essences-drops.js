//----------------------------------------------------------------------
//---------------------ESSENCE DROPS FROM MONSTERS----------------------
//----------------------------------------------------------------------

// Every family drops at an equal weight, so all 95 targeted essences
// are equally likely; rarity differentiation comes from map tier and
// the active map's loot quantity bonus.

import { _egSpawnCurrencyDrop } from '../combat/combat-grid-pickups-currency.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _EG_ESSENCE_FAMILIES } from './loot-essences.js';
import { EG_ESSENCE_DEFS } from './loot-essences-defs.js';


// One entry per modifier family - equal weight so every targeted essence is
// equally likely to drop (rarity differentiation via map tier/loot quantity).
export const EG_ESSENCE_DROP_TABLE = _EG_ESSENCE_FAMILIES.map(fid => ({ id: 'essence_' + fid, weight: 100 }));

export const EG_ESSENCE_DROP_CHANCE_NORMAL = 0.06; // 6% per normal kill
export const EG_ESSENCE_DROP_CHANCE_BOSS = 0.45;   // bosses often reward one

export function _egRollEssenceDef() {
    const total = EG_ESSENCE_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_ESSENCE_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return EG_ESSENCE_DEFS[entry.id];
    }
    return EG_ESSENCE_DEFS[EG_ESSENCE_DROP_TABLE[0].id];
}

// Called when a monster dies. Essences land on the grid as pickup drops
// and are claimed like currency orbs.
export function _egTryDropEssence(isBoss) {
    const baseChance = isBoss ? EG_ESSENCE_DROP_CHANCE_BOSS : EG_ESSENCE_DROP_CHANCE_NORMAL;
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (Math.random() > chance) return;
    const def = _egRollEssenceDef();
    if (!def) return;
    if (typeof _egSpawnCurrencyDrop === 'function') {
        _egSpawnCurrencyDrop(def);
    }
}
