//------------------------------------------------------------------------
//-------------------LOOT FILTER PUBLIC FACADE------------------------------
//------------------------------------------------------------------------

// Compatibility facade for the loot filter's historical module surface.
export {
    _egLootFilter,
    _eglfDefaultState,
    _eglfNormaliseRule,
    _eglfNormaliseState,
    _egLoadLootFilter,
    _egSaveLootFilter,
} from './loot-filter-state.js';

export {
    _eglfRuleMatches,
    _egLootFilterShouldVendor,
    _egLootFilterKeeps,
    _egLootFilterAutoVendor,
    _eglfSlotTypes,
    _eglfBasesForSlot,
    _eglfModFamiliesForSlot,
    _eglfAllModFamilies,
} from './loot-filter-rules.js';

export { _egInjectLootFilterStyles } from './loot-filter-styles.js';

export {
    _eglfWorking,
    _eglfEscapeHTML,
    _egEnsureLootFilterModal,
    _eglfRuleHTML,
    _eglfRenderRules,
    _eglfUpdatePreview,
    _eglfRenderModalContent,
    _eglfSyncChrome,
    _eglfRenderStaticText,
    _egOpenLootFilterModal,
    _eglfCloseModal,
    _eglfSaveModal,
    _eglfSetRule,
    _eglfAddRule,
    _eglfDelRule,
    _egShowLootFilterTooltip,
} from './loot-filter-editor.js';
