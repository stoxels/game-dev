import {
    _craftingBenchScroll,
    _setCraftingBenchSelectionState,
} from './loot-crafting-bench-state.js';
import { _craftingBenchBindTooltips, _craftingBenchBuildHTML } from './loot-crafting-bench-render.js';

//------------------------------------------------------------------------
//-------------------OVERLAY LIFECYCLE------------------------------------
//------------------------------------------------------------------------

// Creates the crafting overlay once and binds its persistent listeners.
export function _ensureCraftingBenchOverlay() {
    if (document.getElementById('sx-crafting-bench-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'sx-crafting-bench-overlay';
    overlay.className = 'sx-craft-overlay';
    overlay.innerHTML = _craftingBenchBuildHTML();
    overlay.addEventListener('click', event => {
        if (event.target === overlay) _closeCraftingBench();
    });
    overlay.addEventListener('scroll', () => _craftingBenchSyncScrollStore(overlay), true);
    document.body.appendChild(overlay);
    _craftingBenchBindDrop(overlay);
    _craftingBenchBindTooltips(overlay);
}

// Prevents native drops from navigating while the hub router owns item moves.
export function _craftingBenchBindDrop(overlay) {
    const slot = overlay.querySelector('#sx-crafting-bench-item');
    slot.addEventListener('dragover', event => {
        event.preventDefault();
        slot.classList.add('sx-craft-drop-active');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('sx-craft-drop-active'));
    slot.addEventListener('drop', event => {
        event.preventDefault();
        slot.classList.remove('sx-craft-drop-active');
    });
}

// Stores each visible column's current scroll position before a rebuild.
export function _craftingBenchSyncScrollStore(overlay) {
    if (!overlay) return;
    overlay.querySelectorAll('.sx-craft-col').forEach(element => {
        const type = element.classList.contains('prefix') ? 'prefix' : 'suffix';
        _craftingBenchScroll[type] = element.scrollTop;
    });
}

// Restores each column's remembered scroll position after a rebuild.
export function _craftingBenchRestoreScroll(overlay) {
    if (!overlay) return;
    overlay.querySelectorAll('.sx-craft-col').forEach(element => {
        const type = element.classList.contains('prefix') ? 'prefix' : 'suffix';
        const scrollTop = _craftingBenchScroll[type];
        if (typeof scrollTop === 'number') element.scrollTop = scrollTop;
    });
}

// Rebuilds the open overlay and optionally preserves its column positions.
export function _refreshCraftingBench(preserveScroll = false, captureCurrent = false) {
    const overlay = document.getElementById('sx-crafting-bench-overlay');
    if (!overlay) return;
    if (captureCurrent) _craftingBenchSyncScrollStore(overlay);
    overlay.innerHTML = _craftingBenchBuildHTML();
    if (preserveScroll) _craftingBenchRestoreScroll(overlay);
    _craftingBenchBindDrop(overlay);
    _craftingBenchBindTooltips(overlay);
}

// Opens the crafting overlay and restores its remembered scroll position.
export function _openCraftingBench() {
    _ensureCraftingBenchOverlay();
    const overlay = document.getElementById('sx-crafting-bench-overlay');
    overlay.classList.add('show');
    _refreshCraftingBench(true);
}

// Hides the crafting overlay, remembers its position, and clears selection.
export function _closeCraftingBench() {
    const overlay = document.getElementById('sx-crafting-bench-overlay');
    if (overlay) {
        _craftingBenchSyncScrollStore(overlay);
        overlay.classList.remove('show');
    }
    _setCraftingBenchSelectionState(null);
}

// Escape closes the visible crafting overlay before other screen handlers.
window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const overlay = document.getElementById('sx-crafting-bench-overlay');
    if (overlay && overlay.classList.contains('show')) {
        _closeCraftingBench();
        event.preventDefault();
        event.stopPropagation();
    }
});
