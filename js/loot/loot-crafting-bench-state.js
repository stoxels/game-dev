//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Item currently resting on the crafting bench.
export let _craftingBenchItem = null;

// Craft family/type/tier chosen by the player, or null before a selection.
export let _craftingBenchSelection = null;

// Surviving per-column scroll positions keyed by 'prefix' and 'suffix'.
export let _craftingBenchScroll = {};

// Crafted modifier limits, separate from naturally rolled affix limits.
export const CRAFTED_MOD_CAPS = {
    maxPre: 1,
    maxSuf: 1,
    maxTotal: 2,
};

// Keeps the legacy global bench-item slot live for save and drag/drop callers.
try {
    Object.defineProperty(globalThis, '_craftingBenchItem', {
        get() { return _craftingBenchItem; },
        set(value) { _craftingBenchItem = value; },
        configurable: true,
    });
} catch (e) { /* an accessor already exists */ }

// Replaces the item currently resting on the crafting bench.
export function _setCraftingBenchItemState(item) {
    _craftingBenchItem = item;
}

// Replaces or clears the player's pending craft selection.
export function _setCraftingBenchSelectionState(selection) {
    _craftingBenchSelection = selection;
}

// Clears remembered column scroll positions when a new item is selected.
export function _resetCraftingBenchScrollState() {
    _craftingBenchScroll = {};
}
