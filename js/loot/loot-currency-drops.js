//----------------------------------------------------------------------
//---------------------CURRENCY DROPS FROM MONSTERS---------------------
//----------------------------------------------------------------------

// Drop weights, the normal/boss drop chances, and the weighted roll
// that turns a monster death into one orb on the grid.

import { _egSpawnCurrencyDrop } from '../combat/combat-grid-pickups-currency.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';


export const EG_CURRENCY_DROP_TABLE = [
    { id: 'orb_transmutation', weight: 180 },
    { id: 'orb_augmentation', weight: 300 },
    { id: 'orb_alteration', weight: 380 },
    { id: 'orb_scouring', weight: 200 },
    { id: 'orb_alchemy', weight: 220 },
    { id: 'orb_chance', weight: 110 },
    { id: 'orb_annulment', weight: 40 },
    { id: 'orb_blessing', weight: 110 },
    { id: 'orb_regal', weight: 90 },
    { id: 'orb_bloom', weight: 85 },
    { id: 'orb_chaos', weight: 55 },
    { id: 'orb_divine', weight: 35 },
    // Epic-tier orbs - deliberately much more common than before so that
    // endgame crafting is actually reachable through normal play.
    // Orb of Ascension heavily buffed per player feedback (was 22).
    { id: 'orb_elevation', weight: 45 },
    { id: 'orb_cataclysm', weight: 30 },
    { id: 'orb_ascension', weight: 75 },
    { id: 'orb_exalted', weight: 22 },
    // Mirror stays genuinely rare, but shows up over a long session.
    { id: 'mirror_of_kalandra', weight: 5 },
    // Ancient Orb - very rare (rarer than exalted, near-mirror tier).
    { id: 'orb_ancient', weight: 4 },
];

export const EG_CURRENCY_DROP_CHANCE_NORMAL = 0.25; // 25% per normal kill
export const EG_CURRENCY_DROP_CHANCE_BOSS = 0.90;   // bosses almost always drop one

export function _egRollCurrencyDef() {
    const total = EG_CURRENCY_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_CURRENCY_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return EG_CURRENCY_DEFS[entry.id];
    }
    return EG_CURRENCY_DEFS.orb_transmutation;
}


// Called on monster death (see endgame-encounter.js edit below).
// Orbs now land on the grid and must be picked up, just like equipment loot.
export function _egTryDropCurrency(isBoss) {
    const baseChance = isBoss ? EG_CURRENCY_DROP_CHANCE_BOSS : EG_CURRENCY_DROP_CHANCE_NORMAL;
    // Active map's loot quantity bonus scales the drop chance up.
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (Math.random() > chance) return;

    const def = _egRollCurrencyDef();
    if (!def) return;

    if (typeof _egSpawnCurrencyDrop === 'function') {
        _egSpawnCurrencyDrop(def);
    }
}
