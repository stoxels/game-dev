//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Item currently resting on the crafting bench.
export let _egCraftingBenchItem = null;

// Craft family/type/tier chosen by the player, or null before a selection.
export let _egCraftingBenchSelection = null;

// Surviving per-column scroll positions keyed by 'prefix' and 'suffix'.
export let _egCraftingBenchScroll = {};

// Crafted modifier limits, separate from naturally rolled affix limits.
export const EG_CRAFTED_MOD_CAPS = {
    maxPre: 1,
    maxSuf: 1,
    maxTotal: 2,
};

// Keeps the legacy global bench-item slot live for save and drag/drop callers.
try {
    Object.defineProperty(globalThis, '_egCraftingBenchItem', {
        get() { return _egCraftingBenchItem; },
        set(value) { _egCraftingBenchItem = value; },
        configurable: true,
    });
} catch (e) { /* an accessor already exists */ }

// Replaces the item currently resting on the crafting bench.
export function _egSetCraftingBenchItemState(item) {
    _egCraftingBenchItem = item;
}

// Replaces or clears the player's pending craft selection.
export function _egSetCraftingBenchSelectionState(selection) {
    _egCraftingBenchSelection = selection;
}

// Clears remembered column scroll positions when a new item is selected.
export function _egResetCraftingBenchScrollState() {
    _egCraftingBenchScroll = {};
}
