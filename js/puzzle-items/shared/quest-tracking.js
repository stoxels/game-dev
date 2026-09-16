//------------------------------------------------------------------------
// PHASE 3 (step 9): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { updateQuestStats } from '../../quests/quests-stats.js';

//------------------------------------------------------------------------
//-------------------SHARED - QUEST TRACKING----------------------
//------------------------------------------------------------------------

// Quest-stat wrappers shared by every item handler so the guard logic
// lives in exactly one place. Add further shared wrappers here.

// Records cursed-item usage while The Witch's immunity window is active.
// Must be called once at the very top of every cursed item handler,
// before any downside logic runs.
export function _trackWitchImmuneCursedUse() {
    if (window.STOX_FLAGS.cursedImmune) {
        updateQuestStats('cursedUnderImmunityUsed', {});
    }
}
