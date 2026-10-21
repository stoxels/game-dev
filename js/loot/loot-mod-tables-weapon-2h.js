//------------------------------------------------------------------------
//-------------------TWO-HANDED MELEE MODIFIER TABLE----------------------
//------------------------------------------------------------------------
// Derived from the 1H table: flat damage (physical + elemental) is ~45% higher and % increased physical ~25%
// higher. Attack speed, crit, accuracy, status and cleave pools are unchanged.

import { MOD_TABLE_WEAPON1 } from './loot-mod-tables-weapon1.js';

export const MOD_TABLE_WEAPON_2H = (() => {
    const clone = JSON.parse(JSON.stringify(MOD_TABLE_WEAPON1));
    const scaleTierList = (tiers, factor) => {
        for (const tr of tiers) {
            for (const k of ['min', 'max', 'min1', 'max1', 'min2', 'max2']) {
                if (typeof tr[k] === 'number') tr[k] = Math.round(tr[k] * factor * 10) / 10;
            }
        }
    };
    const FLAT_2H = 1.45, INC_2H = 1.25;
    try {
        const p = clone.prefixes || {};
        if (p.flat_physical_damage) scaleTierList(p.flat_physical_damage.tiers, FLAT_2H);
        if (p.inc_physical_damage) scaleTierList(p.inc_physical_damage.tiers, INC_2H);
        for (const id of ['fire_damage', 'cold_damage', 'lightning_damage', 'shadow_damage']) {
            if (p[id]) scaleTierList(p[id].tiers, FLAT_2H);
        }
    } catch (e) {}
    // 2H is pure offense: strip the 1H-exclusive parry suffix (cloned above).
    try { if (clone.suffixes && clone.suffixes.parry) delete clone.suffixes.parry; } catch (e) {}
    return clone;
})();

