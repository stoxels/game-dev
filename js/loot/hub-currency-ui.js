import { _egBuildItemChipHTML } from '../endgame/hub-mass-sell.js';

//------------------------------------------------------------------------
//-------------------CURRENCY TAB UI---------------------------------------
//------------------------------------------------------------------------

// Builds the crafting-bench drop target shown above the currency tab.
export function _egBuildCraftingBenchSlotHTML() {
    const item = typeof _egCraftingBenchItem !== 'undefined' ? globalThis._egCraftingBenchItem : null;
    return `<div class="eg-crafting-launcher"><button class="eg-crafting-open-btn" onclick="_egOpenCraftingBench()">⚒ CRAFTING BENCH</button><div class="eg-crafting-slot" id="eg-crafting-bench-launch-slot" data-eg-dropzone="crafting" ondragover="egDragOver(event)" ondrop="egDropOnCraftingBench(event)">${item ? _egBuildItemChipHTML(item) : 'Drop equipment here'}</div></div>`;
}
