//----------------------------------------------------------------------
//--------------------------ESSENCE STASH API---------------------------
//----------------------------------------------------------------------

// The one public way to add essences: lands the stack on the essence's
// pre-assigned cell, merging when the id already matches.

import { trackAchStat } from '../achievements/achievements.js';
import { ESSENCE_COLS, _essenceSlotForId, _essenceStash } from './loot-essences.js';
import { ESSENCE_DEFS, _essenceDefForId } from './loot-essences-defs.js';
import { _renderEssenceCell } from './loot-essences-render.js';


// Adds `amount` of an essence type to the essence tab fixed slot.
// Stacks merge on the pre-assigned cell; returns true on success.
export function addEssence(id, amount = 1, def = null) {
    const pos = _essenceSlotForId(id);
    if (!pos) {
        console.warn(`[ESSENCE] addEssence: no fixed slot for "${id}".`);
        return false;
    }
    const r = pos.r, c = pos.c;
    if (!_essenceStash[r]) _essenceStash[r] = Array(ESSENCE_COLS).fill(null);
    const cell = _essenceStash[r][c];
    const resolvedDef = def || ESSENCE_DEFS[id] || _essenceDefForId(id);
    if (cell && cell.id === id) {
        cell.count = (cell.count || 1) + amount;
        _renderEssenceCell(r, c);
        if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesLooted', amount); } catch(e){}
        return true;
    }
    if (cell && cell.id !== id) {
        console.warn(`[ESSENCE] addEssence: slot [${r},${c}] occupied by different id "${cell.id}" (tried to add "${id}")`);
        return false;
    }
    if (!resolvedDef) {
        console.warn(`[ESSENCE] addEssence: no def for "${id}".`);
        return false;
    }
    _essenceStash[r][c] = { ...resolvedDef, id, count: amount };
    if (!_essenceStash[r][c].category) _essenceStash[r][c].category = 'essence';
    if (!_essenceStash[r][c].rarity) _essenceStash[r][c].rarity = 'essence';
    _renderEssenceCell(r, c);
    if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesLooted', amount); } catch(e){}
    return true;
}
