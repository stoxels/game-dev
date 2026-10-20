import { Audio_Manager } from '../audio/audio.js';
import { switchScreen } from '../screens/screens.js';
import { t } from '../translation/translations.js';
import { _vendorBuildCharmsTabHTML, _vendorBuildEssencesTabHTML, _vendorBuildItemsTabHTML } from './loot-vendor-supplies.js';
import { _vendorRefreshGoldDisplay, _vendorSetRenderTabContent } from './loot-vendor-shared.js';
import { _vendorEnsureStyles } from './loot-vendor-styles.js';
import { _vendorBuildBaseTabHTML } from './loot-vendor-equipment.js';
import { _vendorBuildCurrencyTabHTML } from './loot-vendor-supplies.js';

//------------------------------------------------------------------------
//-------------------ENDGAME VENDOR---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The Cartographer's shop (formerly the Atlas Vendor), reached by travelling
// back to the Cartographer's Outpost on the overworld map. This module is the
// shell: it owns the tab bar, the screen layout, the tab registry and the
// redraw logic. Each tab lives in its own module (maps, supplies, equipment)
// and the stylesheet is injected once by loot-vendor-styles.js.

//------------------------------------------------------------------------
//-------------------TAB STATE & REGISTRY----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Which tab is open. The last active tab is remembered across visits.
let _vendorActiveTab = 'charms';
// Search text. While non-empty the content area shows every tab's cards in
// one list, filtered to the matches (see _vendorApplySearch).
let _vendorQuery = '';

// The vendor tabs (maps are no longer sold - they drop in the late campaign), in display order.
const VENDOR_TABS = [
    { id: 'charms', labelKey: 'eg_vendor_tab_charms' },
    { id: 'currency', labelKey: 'eg_vendor_tab_currency' },
    { id: 'essences', labelKey: 'eg_vendor_tab_essences' },
    { id: 'items', labelKey: 'eg_vendor_tab_items' },
    { id: 'base', labelKey: 'eg_vendor_tab_base' },
];

// Hint line shown under each tab's content, as a translation key.
const VENDOR_TAB_HINTS = {
    charms: 'eg_vendor_hint_charms',
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
function _vendorBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="back-btn" onclick="goToPreviousScreen()">${t('btn_back')}</button>
    <span class="egn-topbar-title">${t('eg_vendor_title')}</span>
</div>`;
}

// One button per tab, with the active one highlighted.
function _vendorBuildTabBarHTML() {
    const buttons = VENDOR_TABS.map(tab => `
        <button class="sx-vendor-tab-btn${tab.id === _vendorActiveTab ? ' sx-vendor-tab-active' : ''}"
                id="sx-vendor-tab-btn-${tab.id}"
                onclick="_vendorSwitchTab('${tab.id}')">${t(tab.labelKey)}</button>`).join('');
    return `<div class="sx-vendor-tab-bar">${buttons}</div>`;
}

// Assembles the full vendor layout:
// topbar → gold balance → tab bar → tab content → hint text.
function _vendorBuildFullScreenHTML() {
    return `
<div class="egn-hub-layout sx-vendor-layout">
    ${_vendorBuildTopbarHTML()}
    <div class="sx-vendor-body">
        <div class="sx-vendor-gold-balance" id="sx-vendor-gold-balance"></div>
        <div class="sx-vendor-search-row"><input type="search" id="sx-vendor-search" class="sx-vendor-search" autocomplete="off" spellcheck="false" placeholder="${t('eg_vendor_search_ph')}"></div>
        ${_vendorBuildTabBarHTML()}
        <div class="sx-vendor-tab-content" id="sx-vendor-tab-content"></div>
        <div class="sx-vendor-hint" id="sx-vendor-hint"></div>
    </div>
</div>`;
}

//------------------------------------------------------------------------
//-------------------RENDER HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Draws the active tab's cards and its hint line. Registered with the shared
// module so the tab modules can ask for a redraw without importing this file.
function _vendorRenderTabContent() {
    const contentEl = document.getElementById('sx-vendor-tab-content');
    if (!contentEl) return;

    if (_vendorQuery) {
        _vendorBuildSearchView(contentEl);
        _vendorApplySearch();
        _vendorRefreshGoldDisplay();
        return;
    }
    contentEl.classList.remove('sx-vendor-searching');
    const activeBtn = document.getElementById(`sx-vendor-tab-btn-${_vendorActiveTab}`);
    if (activeBtn) activeBtn.classList.add('sx-vendor-tab-active');

    switch (_vendorActiveTab) {
        case 'charms': contentEl.innerHTML = _vendorBuildCharmsTabHTML(); break;
        case 'currency': contentEl.innerHTML = _vendorBuildCurrencyTabHTML(); break;
        case 'essences': contentEl.innerHTML = _vendorBuildEssencesTabHTML(); break;
        case 'items': contentEl.innerHTML = _vendorBuildItemsTabHTML(); break;
        case 'base': contentEl.innerHTML = _vendorBuildBaseTabHTML(); break;
    }

    const hintEl = document.getElementById('sx-vendor-hint');
    if (hintEl) hintEl.textContent = t(VENDOR_TAB_HINTS[_vendorActiveTab] || '');

    _vendorRefreshGoldDisplay();
}

// Search mode: every tab's cards under its own heading, so one query covers
// charms, currency, essences, items and base items alike.
function _vendorBuildSearchView(contentEl) {
    const builders = {
        charms: _vendorBuildCharmsTabHTML, currency: _vendorBuildCurrencyTabHTML, essences: _vendorBuildEssencesTabHTML,
        items: _vendorBuildItemsTabHTML, base: _vendorBuildBaseTabHTML,
    };
    contentEl.classList.add('sx-vendor-searching');
    document.querySelectorAll('.sx-vendor-tab-btn').forEach(btn => btn.classList.remove('sx-vendor-tab-active'));
    contentEl.innerHTML = VENDOR_TABS.map(tab => `
<div class="sx-vendor-search-section">
    <div class="sx-vendor-search-title">${t(tab.labelKey)}</div>
    ${builders[tab.id](true)}
</div>`).join('') + `<div class="sx-vendor-search-none" id="sx-vendor-search-none" style="display:none">${t('eg_vendor_search_none')}</div>`;
    const hintEl = document.getElementById('sx-vendor-hint');
    if (hintEl) hintEl.textContent = t('eg_vendor_hint_search');
}

// Shows only the cards whose text contains the query, hides empty sections.
function _vendorApplySearch() {
    const contentEl = document.getElementById('sx-vendor-tab-content');
    if (!contentEl) return;
    const words = _vendorQuery.toLowerCase().split(/\s+/).filter(Boolean);
    let total = 0;
    contentEl.querySelectorAll('.sx-vendor-search-section').forEach(sec => {
        let shown = 0;
        sec.querySelectorAll('.sx-vendor-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            const hit = words.every(w => text.indexOf(w) !== -1);
            card.style.display = hit ? '' : 'none';
            if (hit) shown++;
        });
        sec.style.display = shown ? '' : 'none';
        total += shown;
    });
    const none = document.getElementById('sx-vendor-search-none');
    if (none) none.style.display = total ? 'none' : '';
}

// Search box typing: build the combined view once, then just re-filter.
function _vendorOnSearchInput(value) {
    const had = !!_vendorQuery;
    _vendorQuery = String(value || '').trim();
    const contentEl = document.getElementById('sx-vendor-tab-content');
    if (!contentEl) return;
    if (!_vendorQuery) { _vendorRenderTabContent(); return; }
    if (!had || !contentEl.classList.contains('sx-vendor-searching')) _vendorRenderTabContent();
    else _vendorApplySearch();
}

// Switches to another tab. Called from the generated tab-bar buttons, so the
// name is an inline handler and must stay reachable as a global.
export function _vendorSwitchTab(tabId) {
    Audio_Manager.playSFX('ui_tab_switch');
    _vendorActiveTab = tabId;
    // Picking a tab leaves search mode.
    _vendorQuery = '';
    const box = document.getElementById('sx-vendor-search');
    if (box) box.value = '';
    document.querySelectorAll('.sx-vendor-tab-btn').forEach(btn => btn.classList.remove('sx-vendor-tab-active'));
    const btn = document.getElementById(`sx-vendor-tab-btn-${tabId}`);
    if (btn) btn.classList.add('sx-vendor-tab-active');
    _vendorRenderTabContent();
}

//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the vendor screen the first time it is opened.
function _vendorCreateScreen() {
    _vendorEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-vendor';
    screen.className = 'screen';
    screen.innerHTML = _vendorBuildFullScreenHTML();
    document.body.appendChild(screen);
    const box = screen.querySelector('#sx-vendor-search');
    if (box) {
        box.addEventListener('input', () => _vendorOnSearchInput(box.value));
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && box.value) { box.value = ''; _vendorOnSearchInput(''); e.stopPropagation(); }
        });
    }
}

// Item art arrives asynchronously (images/items/manifest.json is fetched
// lazily on first use). Cards rendered with emoji fallbacks before that
// refresh here so they swap to art without needing a reload.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('sx-art-loaded', function () {
        try {
            if (document.getElementById('sx-vendor-tab-content')) {
                _vendorRenderTabContent();
            }
        } catch (e) { /* vendor screen not open - safe to ignore */ }
    });
}

// Opens the Vendor screen on the last active tab.
export function showEndgameVendor() {
    if (!document.getElementById('screen-endgame-vendor')) _vendorCreateScreen();

    // The vendor is opened from the overworld (launchAtlasVendor), which
    // pushes the screen it came from onto the history: back pops to it.
    const backBtn = document.querySelector('#screen-endgame-vendor .back-btn');
    if (backBtn) backBtn.setAttribute('onclick', 'goToPreviousScreen()');

    switchScreen('screen-endgame-vendor');

    // Keep the active tab highlighted across visits.
    document.querySelectorAll('.sx-vendor-tab-btn').forEach(btn => btn.classList.remove('sx-vendor-tab-active'));
    const activeBtn = document.getElementById(`sx-vendor-tab-btn-${_vendorActiveTab}`);
    if (activeBtn) activeBtn.classList.add('sx-vendor-tab-active');

    _vendorRenderTabContent();
    _vendorRefreshGoldDisplay();
}

// The tab modules call back through the shared module to redraw; wire that up
// now that the shell's renderer exists.
_vendorSetRenderTabContent(_vendorRenderTabContent);
