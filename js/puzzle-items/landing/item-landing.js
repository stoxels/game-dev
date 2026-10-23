import { LANDING_CURSED_SPECIAL } from './landing-cursed-special.js';
import { LANDING_REVEAL_MARK_TIME } from './landing-reveal-mark-time.js';
import { LANDING_UTILITY } from './landing-utility.js';
import { gridBox } from './landing-toolkit.js';

//------------------------------------------------------------------------
//-------------------ITEM LANDING EFFECTS---------------------------------
//------------------------------------------------------------------------
// Every puzzle item has its own effect that plays on the grid when the
// thrown item lands. The effects live in three files by item family; this
// file joins them and runs the one for an item id.

const ITEM_LANDING = { ...LANDING_REVEAL_MARK_TIME, ...LANDING_UTILITY, ...LANDING_CURSED_SPECIAL };

// Plays the landing effect of item `defId` on the grid. Returns false when
// the item has no effect of its own (or no grid is showing), so the caller
// can fall back to a plain impact.
export function _fxItemLanding(defId) {
    const effect = ITEM_LANDING[defId];
    const G = gridBox();
    if (!effect || !G) return false;
    try { effect(G); } catch (e) { return false; }
    return true;
}
