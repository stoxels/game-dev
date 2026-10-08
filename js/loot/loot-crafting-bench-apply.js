import { trackAchStat } from '../achievements/achievements.js';
import {
    _egCurrencyDefForId,
    _egCurrencySlotForId,
    _egCurrencyStash,
    _egRenderAll,
    _egUpdateCraftingBenchLauncherSlot,
    egSaveHubState,
} from '../endgame/endgame-hub.js';
import { showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import {
    _egCraftingBenchItem,
    _egCraftingBenchSelection,
    _egResetCraftingBenchScrollState,
    _egSetCraftingBenchItemState,
    _egSetCraftingBenchSelectionState,
} from './loot-crafting-bench-state.js';
import {
    _egCraftCurrencyCount,
    _egCraftingBenchCanUseItem,
    _egCraftingBenchEffectiveCosts,
    _egCraftingBenchFamilies,
} from './loot-crafting-bench-rules.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import {_egBuildRolledStats} from './loot-mod-application.js';
import { _egRefreshCraftingBench } from './loot-crafting-bench-overlay.js';

//------------------------------------------------------------------------
//-------------------CRAFT ACTIONS----------------------------------------
//------------------------------------------------------------------------

// Stores the chosen family/type/tier and refreshes the open bench.
export function _egCraftingBenchSelect(familyId, type, tier) {
    _egSetCraftingBenchSelectionState({ familyId, type, tier });
    _egRefreshCraftingBench(true, true);
}

// Spends the selected craft's currencies and applies its rolled modifier.
export function _egCraftingBenchApply() {
    const item = _egCraftingBenchItem;
    const selection = _egCraftingBenchSelection;
    if (!item || !selection || !_egCraftingBenchCanUseItem(item)) return;

    const entry = _egCraftingBenchFamilies(item).find(candidate =>
        candidate.familyId === selection.familyId && candidate.type === selection.type);
    const tier = entry && entry.tiers.find(candidate =>
        candidate.tier === selection.tier && candidate.eligible);
    if (!entry || !tier) return;

    const costs = _egCraftingBenchEffectiveCosts(entry, tier);
    const missingCosts = costs.filter(cost => _egCraftCurrencyCount(cost.id) < cost.count);
    if (missingCosts.length) {
        const missing = missingCosts.map(cost => {
            const def = _egCurrencyDefForId(cost.id) || {};
            const have = _egCraftCurrencyCount(cost.id);
            return `${cost.count - have} more ${def.name || cost.id}`;
        }).join(', ');
        showToast(`Insufficient currency: need ${missing}`, '#e87d70');
        return;
    }

    for (const cost of costs) {
        const pos = _egCurrencySlotForId(cost.id);
        const stack = _egCurrencyStash[pos.r][pos.c];
        stack.count -= cost.count;
        if (stack.count <= 0) _egCurrencyStash[pos.r][pos.c] = null;
        globalThis._egRenderCurrencyCell(pos.r, pos.c);
    }

    const newMod = {
        familyId: entry.familyId,
        type: entry.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
        crafted: true,
    };
    const baseMods = (item.mods || []).filter(mod =>
        !(entry.isReplace && mod.type === entry.type && mod.crafted === true));
    item.mods = [...baseMods, newMod];
    item.name = _egBuildItemName(item.baseName || item.name, item.rarity, item.mods);

    _egSetCraftingBenchSelectionState(null);
    try { trackAchStat('egBenchCrafts', 1); } catch (e) { /* never block a craft */ }
    _egRenderAll();
    egSaveHubState();
    _egRefreshCraftingBench(true, true);
}

// Places eligible equipment on the bench and resets per-item bench state.
export function _egSetCraftingBenchItem(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return false;
    if (item.isUnique) return false;
    _egSetCraftingBenchItemState(item);
    _egSetCraftingBenchSelectionState(null);
    _egResetCraftingBenchScrollState();
    _egRefreshCraftingBench();
    _egUpdateCraftingBenchLauncherSlot();
    return true;
}
