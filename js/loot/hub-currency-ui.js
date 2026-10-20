import { _buildItemChipHTML } from '../endgame/hub-mass-sell.js';

//------------------------------------------------------------------------
//-------------------CURRENCY TAB UI---------------------------------------
//------------------------------------------------------------------------

// Builds the crafting-bench drop target shown above the currency tab.
export function _buildCraftingBenchSlotHTML() {
    const item = typeof _craftingBenchItem !== 'undefined' ? globalThis._craftingBenchItem : null;
    return `<div class="sx-crafting-launcher"><button class="sx-crafting-open-btn" onclick="_openCraftingBench()">⚒ CRAFTING BENCH</button><div class="sx-crafting-slot" id="sx-crafting-bench-launch-slot" data-eg-dropzone="crafting" ondragover="egDragOver(event)" ondrop="egDropOnCraftingBench(event)">${item ? _buildItemChipHTML(item) : 'Drop equipment here'}</div></div>`;
}
