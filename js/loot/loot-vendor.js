import { switchScreen } from '../screens/screens.js';
import { t } from '../translation/translations.js';
import { _egvBuildEssencesTabHTML, _egvBuildItemsTabHTML } from './loot-vendor-supplies.js';
import { _egvRefreshGoldDisplay, _egvSetRenderTabContent } from './loot-vendor-shared.js';
import { _egvEnsureStyles } from './loot-vendor-styles.js';
import { _egvBuildBaseTabHTML, _egvBuildStarterTabHTML } from './loot-vendor-equipment.js';
import { _egvBuildMapsTabHTML, _egvRefreshMapsTabDynamic } from './loot-vendor-maps.js';
import { _egvBuildCurrencyTabHTML } from './loot-vendor-supplies.js';

//------------------------------------------------------------------------
//-------------------ENDGAME VENDOR---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The gold vendor reached from the Nexus of Worlds screen. This module is the
// shell: it owns the tab bar, the screen layout, the tab registry and the
// redraw logic. Each tab lives in its own module (maps, supplies, equipment)
// and the stylesheet is injected once by loot-vendor-styles.js.

//------------------------------------------------------------------------
//-------------------TAB STATE & REGISTRY----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Which tab is open. The last active tab is remembered across visits.
let _egvActiveTab = 'maps';

// The six vendor tabs, in display order.
const EG_VENDOR_TABS = [
    { id: 'maps', labelKey: 'eg_vendor_tab_maps' },
    { id: 'starter', labelKey: 'eg_vendor_tab_starter' },
    { id: 'currency', labelKey: 'eg_vendor_tab_currency' },
    { id: 'essences', labelKey: 'eg_vendor_tab_essences' },
    { id: 'items', labelKey: 'eg_vendor_tab_items' },
    { id: 'base', labelKey: 'eg_vendor_tab_base' },
];

// Hint line shown under each tab's content, as a translation key.
const EG_VENDOR_TAB_HINTS = {
    maps: 'eg_vendor_hint',
    starter: 'eg_vendor_hint_starter',
    currency: 'eg_vendor_hint_currency',
    essences: 'eg_vendor_hint_essences',
    items: 'eg_vendor_hint_items',
    base: 'eg_vendor_hint_base',
};

//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Top bar with the back button and the screen title.
function _egvBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="back-btn" onclick="showEndgameNexus()">${t('btn_back')}</button>
    <span class="egn-topbar-title">${t('eg_vendor_title')}</span>
</div>`;
}

// One button per tab, with the active one highlighted.
function _egvBuildTabBarHTML() {
    const buttons = EG_VENDOR_TABS.map(tab => `
        <button class="egv-tab-btn${tab.id === _egvActiveTab ? ' egv-tab-active' : ''}"
                id="egv-tab-btn-${tab.id}"
                onclick="_egvSwitchTab('${tab.id}')">${t(tab.labelKey)}</button>`).join('');
    return `<div class="egv-tab-bar">${buttons}</div>`;
}

// Assembles the full vendor layout:
// topbar → gold balance → tab bar → tab content → hint text.
function _egvBuildFullScreenHTML() {
    return `
<div class="egn-hub-layout egv-layout">
    ${_egvBuildTopbarHTML()}
    <div class="egv-body">
        <div class="egv-gold-balance" id="egv-gold-balance"></div>
        ${_egvBuildTabBarHTML()}
        <div class="egv-tab-content" id="egv-tab-content"></div>
        <div class="egv-hint" id="egv-hint"></div>
    </div>
</div>`;
}

//------------------------------------------------------------------------
//-------------------RENDER HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Draws the active tab's cards and its hint line. Registered with the shared
// module so the tab modules can ask for a redraw without importing this file.
function _egvRenderTabContent() {
    const contentEl = document.getElementById('egv-tab-content');
    if (!contentEl) return;

    switch (_egvActiveTab) {
        case 'maps': contentEl.innerHTML = _egvBuildMapsTabHTML(); break;
        case 'starter': contentEl.innerHTML = _egvBuildStarterTabHTML(); break;
        case 'currency': contentEl.innerHTML = _egvBuildCurrencyTabHTML(); break;
        case 'essences': contentEl.innerHTML = _egvBuildEssencesTabHTML(); break;
        case 'items': contentEl.innerHTML = _egvBuildItemsTabHTML(); break;
        case 'base': contentEl.innerHTML = _egvBuildBaseTabHTML(); break;
    }

    const hintEl = document.getElementById('egv-hint');
    if (hintEl) hintEl.textContent = t(EG_VENDOR_TAB_HINTS[_egvActiveTab] || '');

    _egvRefreshGoldDisplay();
}

// Switches to another tab. Called from the generated tab-bar buttons, so the
// name is an inline handler and must stay reachable as a global.
export function _egvSwitchTab(tabId) {
    _egvActiveTab = tabId;
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    const btn = document.getElementById(`egv-tab-btn-${tabId}`);
    if (btn) btn.classList.add('egv-tab-active');
    _egvRenderTabContent();
}

//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the vendor screen the first time it is opened.
function _egvCreateScreen() {
    _egvEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-vendor';
    screen.className = 'screen';
    screen.innerHTML = _egvBuildFullScreenHTML();
    document.body.appendChild(screen);
}

// Item art arrives asynchronously (images/items/manifest.json is fetched
// lazily on first use). Cards rendered with emoji fallbacks before that
// refresh here so they swap to art without needing a reload.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('eg-art-loaded', function () {
        try {
            if (document.getElementById('egv-tab-content')) {
                _egvRenderTabContent();
            }
        } catch (e) { /* vendor screen not open - safe to ignore */ }
    });
}

// Opens the Vendor screen on the last active tab.
export function showEndgameVendor() {
    if (!document.getElementById('screen-endgame-vendor')) _egvCreateScreen();

    // The vendor screen DOM is built once - keep the back button pointed
    // at the Nexus of Worlds (also heals screens built before the
    // goToPreviousScreen() -> showEndgameNexus() fix).
    const backBtn = document.querySelector('#screen-endgame-vendor .back-btn');
    if (backBtn) backBtn.setAttribute('onclick', 'showEndgameNexus()');

    switchScreen('screen-endgame-vendor');

    // Keep the active tab highlighted across visits.
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    const activeBtn = document.getElementById(`egv-tab-btn-${_egvActiveTab}`);
    if (activeBtn) activeBtn.classList.add('egv-tab-active');

    _egvRenderTabContent();
    _egvRefreshMapsTabDynamic();
    _egvRefreshGoldDisplay();
}

// The tab modules call back through the shared module to redraw; wire that up
// now that the shell's renderer exists.
_egvSetRenderTabContent(_egvRenderTabContent);
