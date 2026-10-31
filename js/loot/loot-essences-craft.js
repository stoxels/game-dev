//----------------------------------------------------------------------
//-------------------ESSENCE CRAFTING (THE RE-FORGE)--------------------
//----------------------------------------------------------------------

// Applying an essence strips every modifier off the target and reforges
// it as an epic with the essence's family guaranteed plus 3-5 random
// ones. Returns null when the base cannot carry the family at all.

import { ITEM_MOD_CAPS } from './loot-equipment-generator.js';
import { _getModTable } from './loot-equipment-mod-tables.js';
import {_buildItemName} from './loot-mod-naming.js';
import {_buildModPool, _buildRolledStats, _eligibleTiers, _familyAllowedOnBase, _pickModFromPool, _pickTier} from './loot-mod-application.js';


//----------------------------------------------------------------------
//-------------------------GUARANTEED MODIFIER--------------------------
//----------------------------------------------------------------------

// Rolls the GUARANTEED modifier for an essence application.
// Now single-family: looks for the family in either prefix or suffix section,
// checks defense gating and ilvl eligibility, and rolls a random eligible tier.
export function _rollGuaranteedMod(modTable, preferredFamilies, itemLevel, defenses) {
    const families = Array.isArray(preferredFamilies) ? preferredFamilies : [preferredFamilies];
    const sections = [
        { type: 'prefix', pool: modTable.prefixes || {} },
        { type: 'suffix', pool: modTable.suffixes || {} },
    ];
    for (const familyId of families) {
        for (const sec of sections) {
            const family = sec.pool[familyId];
            if (!family) continue;
            if (!_familyAllowedOnBase(familyId, defenses)) continue;
            const tiers = _eligibleTiers(family, itemLevel);
            if (!tiers || tiers.length === 0) continue;
            const tier = _pickTier(tiers, itemLevel);
            if (!tier) continue;
            return {
                familyId,
                type: sec.type,
                tier: tier.tier,
                rolledStats: _buildRolledStats(family, tier),
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
export function _applyEssenceCraft(item, def) {
    const modTable = _getModTable(item);
    if (!modTable) return null;
    // Epic caps per spec
    const cap = ITEM_MOD_CAPS.epic;
    const itemLevel = item.itemLevel || 1;
    const mods = [];
    const chosenFamilyIds = new Set();
    const families = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    // 1 guaranteed modifier - must succeed or the craft is incompatible
    let preCount = 0;
    let sufCount = 0;
    const guaranteed = _rollGuaranteedMod(modTable, families, itemLevel, item.defenses);
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
            const pool = _buildModPool(modTable.prefixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'prefix', pool });
        }
        if (sufCount < cap.maxSuf) {
            const pool = _buildModPool(modTable.suffixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'suffix', pool });
        }
        if (options.length === 0) break;
        const sec = options[Math.floor(Math.random() * options.length)];
        const entry = _pickModFromPool(sec.pool);
        if (!entry) break;
        const tier = _pickTier(entry.tiers, itemLevel);
        if (!tier) break;
        chosenFamilyIds.add(entry.familyId);
        if (sec.type === 'prefix') preCount++; else sufCount++;
        mods.push({
            familyId: entry.familyId,
            type: sec.type,
            tier: tier.tier,
            rolledStats: _buildRolledStats(entry.family, tier),
        });
    }

    // Ensure at least 4 mods for epic feel when pool allowed - if we ended <4 try to fill
    // (spec: 4-6) - already 1+3 =4 minimum, so okay.

    const name = _buildItemName(item.baseName || item.name, 'epic', mods);
    return { ...item, rarity: 'epic', mods, name };
}
