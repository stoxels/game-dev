//----------------------------------------------------------------------
//--------------------------ESSENCE STASH API---------------------------
//----------------------------------------------------------------------

// The one public way to add essences: lands the stack on the essence's
// pre-assigned cell, merging when the id already matches.

import { trackAchStat } from '../achievements/achievements.js';
import { EG_ESSENCE_COLS, _egEssenceSlotForId, _egEssenceStash } from './loot-essences.js';
import { EG_ESSENCE_DEFS, _egEssenceDefForId } from './loot-essences-defs.js';
import { _egRenderEssenceCell } from './loot-essences-render.js';


// Adds `amount` of an essence type to the essence tab fixed slot.
// Stacks merge on the pre-assigned cell; returns true on success.
export function egAddEssence(id, amount = 1, def = null) {
    const pos = _egEssenceSlotForId(id);
    if (!pos) {
        console.warn(`[ESSENCE] egAddEssence: no fixed slot for "${id}".`);
        return false;
    }
    const r = pos.r, c = pos.c;
    if (!_egEssenceStash[r]) _egEssenceStash[r] = Array(EG_ESSENCE_COLS).fill(null);
    const cell = _egEssenceStash[r][c];
    const resolvedDef = def || EG_ESSENCE_DEFS[id] || _egEssenceDefForId(id);
    if (cell && cell.id === id) {
        cell.count = (cell.count || 1) + amount;
        _egRenderEssenceCell(r, c);
        if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesLooted', amount); } catch(e){}
        return true;
    }
    if (cell && cell.id !== id) {
        console.warn(`[ESSENCE] egAddEssence: slot [${r},${c}] occupied by different id "${cell.id}" (tried to add "${id}")`);
        return false;
    }
    if (!resolvedDef) {
        console.warn(`[ESSENCE] egAddEssence: no def for "${id}".`);
        return false;
    }
    _egEssenceStash[r][c] = { ...resolvedDef, id, count: amount };
    if (!_egEssenceStash[r][c].category) _egEssenceStash[r][c].category = 'essence';
    if (!_egEssenceStash[r][c].rarity) _egEssenceStash[r][c].rarity = 'essence';
    _egRenderEssenceCell(r, c);
    if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesLooted', amount); } catch(e){}
    return true;
}
