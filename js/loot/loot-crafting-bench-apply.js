import { Audio_Manager } from '../audio/audio.js';
import { trackAchStat } from '../achievements/achievements.js';
import {
    _currencyDefForId,
    _currencySlotForId,
    _currencyStash,
    _renderAll,
    _updateCraftingBenchLauncherSlot,
    saveHubState,
} from '../hub/hub.js';
import { showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import {
    _craftingBenchItem,
    _craftingBenchSelection,
    _resetCraftingBenchScrollState,
    _setCraftingBenchItemState,
    _setCraftingBenchSelectionState,
} from './loot-crafting-bench-state.js';
import {
    _craftCurrencyCount,
    _craftingBenchCanUseItem,
    _craftingBenchEffectiveCosts,
    _craftingBenchFamilies,
} from './loot-crafting-bench-rules.js';
import {_buildItemName} from './loot-mod-naming.js';
import {_buildRolledStats} from './loot-mod-application.js';
import { _refreshCraftingBench } from './loot-crafting-bench-overlay.js';

//------------------------------------------------------------------------
//-------------------CRAFT ACTIONS----------------------------------------
//------------------------------------------------------------------------

// Stores the chosen family/type/tier and refreshes the open bench.
export function _craftingBenchSelect(familyId, type, tier) {
    _setCraftingBenchSelectionState({ familyId, type, tier });
    _refreshCraftingBench(true, true);
}

// Spends the selected craft's currencies and applies its rolled modifier.
export function _craftingBenchApply() {
    const item = _craftingBenchItem;
    const selection = _craftingBenchSelection;
    if (!item || !selection || !_craftingBenchCanUseItem(item)) return;

    const entry = _craftingBenchFamilies(item).find(candidate =>
        candidate.familyId === selection.familyId && candidate.type === selection.type);
    const tier = entry && entry.tiers.find(candidate =>
        candidate.tier === selection.tier && candidate.eligible);
    if (!entry || !tier) return;

    const costs = _craftingBenchEffectiveCosts(entry, tier);
    const missingCosts = costs.filter(cost => _craftCurrencyCount(cost.id) < cost.count);
    if (missingCosts.length) {
        const missing = missingCosts.map(cost => {
            const def = _currencyDefForId(cost.id) || {};
            const have = _craftCurrencyCount(cost.id);
            return `${cost.count - have} more ${def.name || cost.id}`;
        }).join(', ');
        showToast(`Insufficient currency: need ${missing}`, '#e87d70');
        return;
    }

    for (const cost of costs) {
        const pos = _currencySlotForId(cost.id);
        const stack = _currencyStash[pos.r][pos.c];
        stack.count -= cost.count;
        if (stack.count <= 0) _currencyStash[pos.r][pos.c] = null;
        globalThis._renderCurrencyCell(pos.r, pos.c);
    }

    const newMod = {
        familyId: entry.familyId,
        type: entry.type,
        tier: tier.tier,
        rolledStats: _buildRolledStats(entry.family, tier),
        crafted: true,
    };
    const baseMods = (item.mods || []).filter(mod =>
        !(entry.isReplace && mod.type === entry.type && mod.crafted === true));
    item.mods = [...baseMods, newMod];
    item.name = _buildItemName(item.baseName || item.name, item.rarity, item.mods);

    _setCraftingBenchSelectionState(null);
    Audio_Manager.playSFX('craft_bench_apply');
    try { trackAchStat('egBenchCrafts', 1); } catch (e) { /* never block a craft */ }
    _renderAll();
    saveHubState();
    _refreshCraftingBench(true, true);
}

// Places eligible equipment on the bench and resets per-item bench state.
export function _setCraftingBenchItem(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return false;
    if (item.isUnique) return false;
    _setCraftingBenchItemState(item);
    _setCraftingBenchSelectionState(null);
    _resetCraftingBenchScrollState();
    _refreshCraftingBench();
    _updateCraftingBenchLauncherSlot();
    return true;
}
