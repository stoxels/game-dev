//------------------------------------------------------------------------
//-------------------UNIQUE STAT REQUIREMENT REBALANCE--------------------
//------------------------------------------------------------------------
// Raises each unique's strength/agility/intellect requirements to the
// passive-tree attribute curve (see equipment-base-types.js). Jewelry asks
// ~82% of armour (pure) / 80% (hybrid). Starter uniques (minLevel <= 10)
// are left alone. Runs once from unique-item-data.js, right after the data.
//------------------------------------------------------------------------

import { requirementStatTarget, scaleRequirements } from './equipment-base-types.js';

// Mutates the given unique definitions in place. Authored literals are
// scaled by the curve first, then anything still below the curve is raised.
export function applyUniqueRequirementRebalance(items) {
    const pureForArmor = (lvl) => Math.round(requirementStatTarget(lvl, 1));
    const pureForJewelry = (lvl) => Math.round(16 + (requirementStatTarget(lvl, 1) - 20) * 0.82);
    const hybridForArmor = (lvl) => { if(lvl<40) return null; return Math.round(requirementStatTarget(lvl, 2)); };
    const hybridForJewelry = (lvl) => { if(lvl<40) return null; return Math.round(16 + (requirementStatTarget(lvl, 2) - 20) * 0.80); };
    const JEWELRY = new Set(['ring','earring','amulet','talisman']);
    for (const u of items) {
        const lvl = u.minLevel || 1;
        // Authored literals were written for the old economy: scale them first.
        if (u.requirements) scaleRequirements(u.requirements);
        if (lvl <= 10) continue;
        const cur = u.requirements || { level: lvl, str:0, agi:0, int:0 };
        const hasStat = (cur.str||0)+(cur.agi||0)+(cur.int||0) > 0;
        if (hasStat) {
            // Bump existing pure/hybrid uniques that are too low (<70% of curve)
            const isHybrid = ((cur.str>0?1:0)+(cur.agi>0?1:0)+(cur.int>0?1:0))===2;
            const isTriple = ((cur.str>0?1:0)+(cur.agi>0?1:0)+(cur.int>0?1:0))===3;
            if (isHybrid && !isTriple) {
                const target = (JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl));
                const curPer = Math.max(cur.str||0,cur.agi||0,cur.int||0);
                if (target > curPer) {
                    if (cur.str>0) cur.str = target;
                    if (cur.agi>0) cur.agi = target;
                    if (cur.int>0) cur.int = target;
                }
            } else if (!isHybrid && !isTriple) {
                // pure single-stat
                const target = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
                const curVal = cur.str||cur.agi||cur.int;
                if (target > curVal && curVal>0) {
                    if (cur.str>0) cur.str = target;
                    else if (cur.agi>0) cur.agi = target;
                    else if (cur.int>0) cur.int = target;
                }
            }
            u.requirements = cur;
            continue;
        }
        // Zero-stat -> assign based on power and slot
        // Jewelry any keeps lighter pure, armor/weapons get full pure, high-impact chase gets hybrid/triple
        // Prefer archetype if not any
        let arch = u.archetype;
        if (arch === 'any' || !arch) {
            // Infer from flavor: default to single stat 70% of pure for jewelry flex, so still requires investment but allows off-build with gear
            const target = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
            // Use least-committed: require int for amulet/arcane, agi for ranged/bracers, str for weapon/shield, any for talisman -> pick str for talisman hybrid?
            if (JEWELRY.has(u.slotType)) {
                // jewelry any: give single stat of lowest barrier (agi for generic, but keep as int to push spell builds? Choose agi for universal)
                // Assign to agi for jewelry free-for-all? Instead assign to int for amulet, agi for ring, etc.
                if (u.slotType === 'amulet' || u.slotType === 'arcane') { cur.int = target; }
                else if (u.slotType === 'ring') { cur.agi = target; }
                else if (u.slotType === 'earring') { cur.agi = target; }
                else { cur.int = target; }
            } else {
                // armor any: give str (most common)
                cur.str = target;
            }
        } else if (arch === 'strength') cur.str = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'agility') cur.agi = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'intellect') cur.int = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'str_agi') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.str=t; cur.agi=t; }
        else if (arch === 'str_int') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.str=t; cur.int=t; }
        else if (arch === 'agi_int') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.agi=t; cur.int=t; }
        cur.level = lvl;
        u.requirements = cur;
    }
}
