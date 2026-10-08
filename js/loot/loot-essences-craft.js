//----------------------------------------------------------------------
//-------------------ESSENCE CRAFTING (THE RE-FORGE)--------------------
//----------------------------------------------------------------------

// Applying an essence strips every modifier off the target and reforges
// it as an epic with the essence's family guaranteed plus 3-5 random
// ones. Returns null when the base cannot carry the family at all.

import { EG_MOD_CAPS } from './loot-equipment-generator.js';
import { _egGetModTable } from './loot-equipment-mod-tables.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import {_egBuildModPool, _egBuildRolledStats, _egEligibleTiers, _egFamilyAllowedOnBase, _egPickModFromPool, _egPickTier} from './loot-mod-application.js';


//----------------------------------------------------------------------
//-------------------------GUARANTEED MODIFIER--------------------------
//----------------------------------------------------------------------

// Rolls the GUARANTEED modifier for an essence application.
// Now single-family: looks for the family in either prefix or suffix section,
// checks defense gating and ilvl eligibility, and rolls a random eligible tier.
export function _egRollGuaranteedMod(modTable, preferredFamilies, itemLevel, defenses) {
    const families = Array.isArray(preferredFamilies) ? preferredFamilies : [preferredFamilies];
    const sections = [
        { type: 'prefix', pool: modTable.prefixes || {} },
        { type: 'suffix', pool: modTable.suffixes || {} },
    ];
    for (const familyId of families) {
        for (const sec of sections) {
            const family = sec.pool[familyId];
            if (!family) continue;
            if (!_egFamilyAllowedOnBase(familyId, defenses)) continue;
            const tiers = _egEligibleTiers(family, itemLevel);
            if (!tiers || tiers.length === 0) continue;
            const tier = _egPickTier(tiers);
            if (!tier) continue;
            return {
                familyId,
                type: sec.type,
                tier: tier.tier,
                rolledStats: _egBuildRolledStats(family, tier),
            };
        }
    }
    return null;
}


//----------------------------------------------------------------------
//-----------------------------THE RE-FORGE-----------------------------
//----------------------------------------------------------------------

// Core essence re-forge. Returns the new EPIC item, or null when the item
// has no usable mod table or the guaranteed family cannot roll on this base.
export function _egApplyEssenceCraft(item, def) {
    const modTable = _egGetModTable(item);
    if (!modTable) return null;
    // Epic caps per spec
    const cap = EG_MOD_CAPS.epic;
    const itemLevel = item.itemLevel || 1;
    const mods = [];
    const chosenFamilyIds = new Set();
    const families = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    // 1 guaranteed modifier - must succeed or the craft is incompatible
    let preCount = 0;
    let sufCount = 0;
    const guaranteed = _egRollGuaranteedMod(modTable, families, itemLevel, item.defenses);
    if (!guaranteed) return null;
    mods.push(guaranteed);
    chosenFamilyIds.add(guaranteed.familyId);
    if (guaranteed.type === 'prefix') preCount++; else sufCount++;

    // 3-5 additional random modifiers → 4-6 total (epic: 5-6 range but allow 4 when pool limited)
    let extra = 3 + Math.floor(Math.random() * 3); // 3..5
    const maxExtra = Math.min(
        cap.maxTotal - mods.length,
        (cap.maxPre - preCount) + (cap.maxSuf - sufCount)
    );
    extra = Math.min(extra, maxExtra);
    extra = Math.max(0, extra);

    for (let i = 0; i < extra; i++) {
        const options = [];
        if (preCount < cap.maxPre) {
            const pool = _egBuildModPool(modTable.prefixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'prefix', pool });
        }
        if (sufCount < cap.maxSuf) {
            const pool = _egBuildModPool(modTable.suffixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'suffix', pool });
        }
        if (options.length === 0) break;
        const sec = options[Math.floor(Math.random() * options.length)];
        const entry = _egPickModFromPool(sec.pool);
        if (!entry) break;
        const tier = _egPickTier(entry.tiers);
        if (!tier) break;
        chosenFamilyIds.add(entry.familyId);
        if (sec.type === 'prefix') preCount++; else sufCount++;
        mods.push({
            familyId: entry.familyId,
            type: sec.type,
            tier: tier.tier,
            rolledStats: _egBuildRolledStats(entry.family, tier),
        });
    }

    // Ensure at least 4 mods for epic feel when pool allowed - if we ended <4 try to fill
    // (spec: 4-6) - already 1+3 =4 minimum, so okay.

    const name = _egBuildItemName(item.baseName || item.name, 'epic', mods);
    return { ...item, rarity: 'epic', mods, name };
}
