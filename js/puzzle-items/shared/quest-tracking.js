//------------------------------------------------------------------------
//-------------------SHARED — QUEST TRACKING----------------------
//------------------------------------------------------------------------

// Quest-stat wrappers shared by every item handler so the guard logic
// lives in exactly one place. Add further shared wrappers here.

// Records cursed-item usage while The Witch's immunity window is active.
// Must be called once at the very top of every cursed item handler,
// before any downside logic runs.
function _trackWitchImmuneCursedUse() {
    if (window._cursedImmune) {
        updateQuestStats('cursedUnderImmunityUsed', {});
    }
}
