import { Audio_Manager } from '../audio/audio.js';
import { switchScreen } from '../screens/screens.js';
import { t } from '../translation/translations.js';
import { _egvBuildCharmsTabHTML, _egvBuildEssencesTabHTML, _egvBuildItemsTabHTML } from './loot-vendor-supplies.js';
import { _egvRefreshGoldDisplay, _egvSetRenderTabContent } from './loot-vendor-shared.js';
import { _egvEnsureStyles } from './loot-vendor-styles.js';
import { _egvBuildBaseTabHTML } from './loot-vendor-equipment.js';
import { _egvBuildCurrencyTabHTML } from './loot-vendor-supplies.js';

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
let _egvActiveTab = 'charms';
// Search text. While non-empty the content area shows every tab's cards in
// one list, filtered to the matches (see _egvApplySearch).
let _egvQuery = '';

// The vendor tabs (maps are no longer sold - they drop in the late campaign), in display order.
const EG_VENDOR_TABS = [
    { id: 'charms', labelKey: 'eg_vendor_tab_charms' },
    { id: 'currency', labelKey: 'eg_vendor_tab_currency' },
    { id: 'essences', labelKey: 'eg_vendor_tab_essences' },
    { id: 'items', labelKey: 'eg_vendor_tab_items' },
    { id: 'base', labelKey: 'eg_vendor_tab_base' },
];

// Hint line shown under each tab's content, as a translation key.
const EG_VENDOR_TAB_HINTS = {
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
function _egvBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="back-btn" onclick="goToPreviousScreen()">${t('btn_back')}</button>
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
        <div class="egv-search-row"><input type="search" id="egv-search" class="egv-search" autocomplete="off" spellcheck="false" placeholder="${t('eg_vendor_search_ph')}"></div>
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

    if (_egvQuery) {
        _egvBuildSearchView(contentEl);
        _egvApplySearch();
        _egvRefreshGoldDisplay();
        return;
    }
    contentEl.classList.remove('egv-searching');
    const activeBtn = document.getElementById(`egv-tab-btn-${_egvActiveTab}`);
    if (activeBtn) activeBtn.classList.add('egv-tab-active');

    switch (_egvActiveTab) {
        case 'charms': contentEl.innerHTML = _egvBuildCharmsTabHTML(); break;
        case 'currency': contentEl.innerHTML = _egvBuildCurrencyTabHTML(); break;
        case 'essences': contentEl.innerHTML = _egvBuildEssencesTabHTML(); break;
        case 'items': contentEl.innerHTML = _egvBuildItemsTabHTML(); break;
        case 'base': contentEl.innerHTML = _egvBuildBaseTabHTML(); break;
    }

    const hintEl = document.getElementById('egv-hint');
    if (hintEl) hintEl.textContent = t(EG_VENDOR_TAB_HINTS[_egvActiveTab] || '');

    _egvRefreshGoldDisplay();
}

// Search mode: every tab's cards under its own heading, so one query covers
// charms, currency, essences, items and base items alike.
function _egvBuildSearchView(contentEl) {
    const builders = {
        charms: _egvBuildCharmsTabHTML, currency: _egvBuildCurrencyTabHTML, essences: _egvBuildEssencesTabHTML,
        items: _egvBuildItemsTabHTML, base: _egvBuildBaseTabHTML,
    };
    contentEl.classList.add('egv-searching');
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    contentEl.innerHTML = EG_VENDOR_TABS.map(tab => `
<div class="egv-search-section">
    <div class="egv-search-title">${t(tab.labelKey)}</div>
    ${builders[tab.id](true)}
</div>`).join('') + `<div class="egv-search-none" id="egv-search-none" style="display:none">${t('eg_vendor_search_none')}</div>`;
    const hintEl = document.getElementById('egv-hint');
    if (hintEl) hintEl.textContent = t('eg_vendor_hint_search');
}

// Shows only the cards whose text contains the query, hides empty sections.
function _egvApplySearch() {
    const contentEl = document.getElementById('egv-tab-content');
    if (!contentEl) return;
    const words = _egvQuery.toLowerCase().split(/\s+/).filter(Boolean);
    let total = 0;
    contentEl.querySelectorAll('.egv-search-section').forEach(sec => {
        let shown = 0;
        sec.querySelectorAll('.egv-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            const hit = words.every(w => text.indexOf(w) !== -1);
            card.style.display = hit ? '' : 'none';
            if (hit) shown++;
        });
        sec.style.display = shown ? '' : 'none';
        total += shown;
    });
    const none = document.getElementById('egv-search-none');
    if (none) none.style.display = total ? 'none' : '';
}

// Search box typing: build the combined view once, then just re-filter.
function _egvOnSearchInput(value) {
    const had = !!_egvQuery;
    _egvQuery = String(value || '').trim();
    const contentEl = document.getElementById('egv-tab-content');
    if (!contentEl) return;
    if (!_egvQuery) { _egvRenderTabContent(); return; }
    if (!had || !contentEl.classList.contains('egv-searching')) _egvRenderTabContent();
    else _egvApplySearch();
}

// Switches to another tab. Called from the generated tab-bar buttons, so the
// name is an inline handler and must stay reachable as a global.
export function _egvSwitchTab(tabId) {
    Audio_Manager.playSFX('ui_tab_switch');
    _egvActiveTab = tabId;
    // Picking a tab leaves search mode.
    _egvQuery = '';
    const box = document.getElementById('egv-search');
    if (box) box.value = '';
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
    const box = screen.querySelector('#egv-search');
    if (box) {
        box.addEventListener('input', () => _egvOnSearchInput(box.value));
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && box.value) { box.value = ''; _egvOnSearchInput(''); e.stopPropagation(); }
        });
    }
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

    // The vendor is opened from the overworld (launchAtlasVendor), which
    // pushes the screen it came from onto the history: back pops to it.
    const backBtn = document.querySelector('#screen-endgame-vendor .back-btn');
    if (backBtn) backBtn.setAttribute('onclick', 'goToPreviousScreen()');

    switchScreen('screen-endgame-vendor');

    // Keep the active tab highlighted across visits.
    document.querySelectorAll('.egv-tab-btn').forEach(btn => btn.classList.remove('egv-tab-active'));
    const activeBtn = document.getElementById(`egv-tab-btn-${_egvActiveTab}`);
    if (activeBtn) activeBtn.classList.add('egv-tab-active');

    _egvRenderTabContent();
    _egvRefreshGoldDisplay();
}

// The tab modules call back through the shared module to redraw; wire that up
// now that the shell's renderer exists.
_egvSetRenderTabContent(_egvRenderTabContent);
