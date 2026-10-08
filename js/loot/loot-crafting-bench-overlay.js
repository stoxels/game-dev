import {
    _egCraftingBenchScroll,
    _egSetCraftingBenchSelectionState,
} from './loot-crafting-bench-state.js';
import { _egCraftingBenchBindTooltips, _egCraftingBenchBuildHTML } from './loot-crafting-bench-render.js';

//------------------------------------------------------------------------
//-------------------OVERLAY LIFECYCLE------------------------------------
//------------------------------------------------------------------------

// Creates the crafting overlay once and binds its persistent listeners.
export function _egEnsureCraftingBenchOverlay() {
    if (document.getElementById('eg-crafting-bench-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'eg-crafting-bench-overlay';
    overlay.className = 'eg-craft-overlay';
    overlay.innerHTML = _egCraftingBenchBuildHTML();
    overlay.addEventListener('click', event => {
        if (event.target === overlay) _egCloseCraftingBench();
    });
    overlay.addEventListener('scroll', () => _egCraftingBenchSyncScrollStore(overlay), true);
    document.body.appendChild(overlay);
    _egCraftingBenchBindDrop(overlay);
    _egCraftingBenchBindTooltips(overlay);
}

// Prevents native drops from navigating while the hub router owns item moves.
export function _egCraftingBenchBindDrop(overlay) {
    const slot = overlay.querySelector('#eg-crafting-bench-item');
    slot.addEventListener('dragover', event => {
        event.preventDefault();
        slot.classList.add('eg-craft-drop-active');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('eg-craft-drop-active'));
    slot.addEventListener('drop', event => {
        event.preventDefault();
        slot.classList.remove('eg-craft-drop-active');
    });
}

// Stores each visible column's current scroll position before a rebuild.
export function _egCraftingBenchSyncScrollStore(overlay) {
    if (!overlay) return;
    overlay.querySelectorAll('.eg-craft-col').forEach(element => {
        const type = element.classList.contains('prefix') ? 'prefix' : 'suffix';
        _egCraftingBenchScroll[type] = element.scrollTop;
    });
}

// Restores each column's remembered scroll position after a rebuild.
export function _egCraftingBenchRestoreScroll(overlay) {
    if (!overlay) return;
    overlay.querySelectorAll('.eg-craft-col').forEach(element => {
        const type = element.classList.contains('prefix') ? 'prefix' : 'suffix';
        const scrollTop = _egCraftingBenchScroll[type];
        if (typeof scrollTop === 'number') element.scrollTop = scrollTop;
    });
}

// Rebuilds the open overlay and optionally preserves its column positions.
export function _egRefreshCraftingBench(preserveScroll = false, captureCurrent = false) {
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    if (!overlay) return;
    if (captureCurrent) _egCraftingBenchSyncScrollStore(overlay);
    overlay.innerHTML = _egCraftingBenchBuildHTML();
    if (preserveScroll) _egCraftingBenchRestoreScroll(overlay);
    _egCraftingBenchBindDrop(overlay);
    _egCraftingBenchBindTooltips(overlay);
}

// Opens the crafting overlay and restores its remembered scroll position.
export function _egOpenCraftingBench() {
    _egEnsureCraftingBenchOverlay();
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    overlay.classList.add('show');
    _egRefreshCraftingBench(true);
}

// Hides the crafting overlay, remembers its position, and clears selection.
export function _egCloseCraftingBench() {
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    if (overlay) {
        _egCraftingBenchSyncScrollStore(overlay);
        overlay.classList.remove('show');
    }
    _egSetCraftingBenchSelectionState(null);
}

// Escape closes the visible crafting overlay before other screen handlers.
window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    if (overlay && overlay.classList.contains('show')) {
        _egCloseCraftingBench();
        event.preventDefault();
        event.stopPropagation();
    }
});
