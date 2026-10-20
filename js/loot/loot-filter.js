//------------------------------------------------------------------------
//-------------------LOOT FILTER PUBLIC FACADE------------------------------
//------------------------------------------------------------------------

// Compatibility facade for the loot filter's historical module surface.
export {
    _lootFilter,
    _lootFilterDefaultState,
    _lootFilterNormaliseRule,
    _lootFilterNormaliseState,
    _loadLootFilter,
    _saveLootFilter,
} from './loot-filter-state.js';

export {
    _lootFilterRuleMatches,
    _lootFilterShouldVendor,
    _lootFilterKeeps,
    _lootFilterAutoVendor,
    _lootFilterSlotTypes,
    _lootFilterBasesForSlot,
    _lootFilterModFamiliesForSlot,
    _lootFilterAllModFamilies,
} from './loot-filter-rules.js';

export { _injectLootFilterStyles } from './loot-filter-styles.js';

export {
    _lootFilterWorking,
    _lootFilterEscapeHTML,
    _ensureLootFilterModal,
    _lootFilterRuleHTML,
    _lootFilterRenderRules,
    _lootFilterUpdatePreview,
    _lootFilterRenderModalContent,
    _lootFilterSyncChrome,
    _lootFilterRenderStaticText,
    _openLootFilterModal,
    _lootFilterCloseModal,
    _lootFilterSaveModal,
    _lootFilterSetRule,
    _lootFilterAddRule,
    _lootFilterDelRule,
    _showLootFilterTooltip,
} from './loot-filter-editor.js';
