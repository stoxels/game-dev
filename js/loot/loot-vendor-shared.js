import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _addGold, getGold, spendGold } from './loot-gold.js';
import { saveHubState } from '../hub/hub.js';
import { GAME_ART } from '../combat/combat-art.js';

//------------------------------------------------------------------------
//-------------------CARD HELPERS------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resolves a vendor card icon through the shared item-art system
// (images/items/manifest.json). Returns an <img> when art exists for the
// id, else the emoji fallback - same pattern as hub/gate/mass-sell.
// Kicks off the lazy manifest fetch on first use.
export function _vendorIconHTML(artId, fallbackEmoji) {
    try {
        if (typeof GAME_ART !== 'undefined' && GAME_ART && typeof GAME_ART.html === 'function') {
            return GAME_ART.html('item', artId, fallbackEmoji);
        }
    } catch (e) { /* art system not ready - fall through to emoji */ }
    return fallbackEmoji || '';
}

// Builds one vendor offer card from its display and purchase details.
export function _vendorBuildCardHTML({ icon, title, subtitle, desc, price, buyCall, extraClass = '', blockedReason = '', extraAttrs = '' }) {
    const blockedCls = blockedReason ? ' sx-vendor-card-blocked' : '';
    const blockedTitle = blockedReason ? ` data-tip="${globalThis._tipAttr(blockedReason)}"` : '';
    // Free offers (price 0) never show a gold deficit.
    const isFree = price <= 0;
    // Dim the card + show the deficit while the player cannot afford it.
    const cannotAfford = !isFree && getGold() < price;
    const affordCls = cannotAfford ? ' sx-vendor-card-cannot-afford' : '';
    const affordLine = cannotAfford
        ? `<div class="sx-vendor-price-missing">${t('eg_vendor_missing_gold').replace('{n}', (price - getGold()).toLocaleString())}</div>`
        : '';
    return `
<div class="sx-vendor-card${blockedCls}${affordCls} ${extraClass}"${blockedTitle}${extraAttrs}>
    <div class="sx-vendor-card-top">
        <div class="sx-vendor-card-icon">${icon}</div>
        <div class="sx-vendor-card-info">
            <div class="sx-vendor-card-name">${title}</div>
            ${subtitle ? `<div class="sx-vendor-card-sub">${subtitle}</div>` : ''}
            ${desc ? `<div class="sx-vendor-card-desc">${desc}</div>` : ''}
        </div>
    </div>
    <div class="sx-vendor-card-bottom">
        <div>
            <div class="sx-vendor-offer-price">${isFree ? `🪙 ${t('eg_vendor_free')}` : `🪙 ${price.toLocaleString()}`}</div>
            ${affordLine}
        </div>
        <button class="title-btn sx-vendor-buy-btn" onclick="${buyCall}">${t('eg_vendor_buy')}</button>
    </div>
</div>`;
}

//------------------------------------------------------------------------
//-------------------PURCHASE ----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spends gold first, grants the item, then refunds if granting fails.
export function _vendorPurchase(price, grantFn) {
    if (!spendGold(price)) {
        globalThis.showToast(t('eg_vendor_no_gold').replace('{n}', price - getGold()));
        Audio_Manager.playSFX('ui_error', 'player_equip_not_pickup');
        return false;
    }
    if (typeof _loadHubState === 'function') globalThis._loadHubState();
    if (!grantFn()) {
        _addGold(price); // refund
        globalThis.showToast(t('eg_vendor_no_space'));
        Audio_Manager.playSFX('ui_error', 'player_equip_not_pickup');
        return false;
    }
    saveHubState();
    Audio_Manager.playSFX('gold_spend');
    try { trackAchStat('egVendorPurchases', 1); } catch (e) { /* never block a purchase */ }
    return true;
}

//------------------------------------------------------------------------
//-------------------GOLD DISPLAY-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The vendor shell registers the real re-render function at load time. The
// tab modules call this instead of importing the shell directly, which would
// make the shell and the tabs import each other in a circle.
let _renderTabContent = () => {};

// Hands the shell's tab re-render to the tab modules. Called once by the shell.
export function _vendorSetRenderTabContent(render) {
    _renderTabContent = render;
}

// Asks the shell to redraw the active tab, e.g. after a purchase.
export function _vendorRefreshTabContent() {
    _renderTabContent();
}
// Updates the vendor's displayed gold balance when that row exists.
export function _vendorRefreshGoldDisplay() {
    const balanceEl = document.getElementById('sx-vendor-gold-balance');
    if (balanceEl) {
        balanceEl.textContent = t('eg_vendor_gold_balance').replace('{n}', getGold().toLocaleString());
    }
}

//------------------------------------------------------------------------
//-------------------CHARM TYPE FILTER-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spell-type filter chips above the charm cards: label key, plus a test on the
// spell's definition (its tags come from the registry's ARPG-style type line).
const VENDOR_CHARM_FILTERS = [
    { id: 'fire', test: d => _vendorHasTag(d, 'Fire') },
    { id: 'cold', test: d => _vendorHasTag(d, 'Cold') },
    { id: 'lightning', test: d => _vendorHasTag(d, 'Lightning') },
    { id: 'shadow', test: d => _vendorHasTag(d, 'Shadow') },
    { id: 'arcane', test: d => _vendorHasTag(d, 'Arcane') },
    { id: 'holy', test: d => _vendorHasTag(d, 'Holy') },
    { id: 'physical', test: d => _vendorHasTag(d, 'Physical') },
    { id: 'melee', test: d => d.castKind === 'melee' },
    { id: 'projectile', test: d => _vendorHasTag(d, 'Projectile') },
    { id: 'area', test: d => _vendorHasTag(d, 'Area') },
    { id: 'movement', test: d => ['Movement', 'Leap', 'Teleport', 'Dash'].some(g => _vendorHasTag(d, g)) },
    { id: 'cleanse', test: d => _vendorHasTag(d, 'Cleanse') },
    { id: 'defensive', test: d => ['Shield', 'Heal', 'Heal over Time'].some(g => _vendorHasTag(d, g))
        || ['guard', 'ward', 'evade', 'thorns', 'shield', 'heal', 'hot'].includes(d.behavior) },
    { id: 'buff', test: d => _vendorHasTag(d, 'Buff') },
];

// Chosen chip ('all' = no filter); remembered while the shop stays loaded.
let _vendorCharmFilter = 'all';

// The raw universal-spell definition (carries tags, castKind and behavior;
// the generic skill def only keeps the tags).
function _vendorUniversalDef(id) {
    const defs = Array.isArray(globalThis.UNIVERSAL_SPELL_DEFS) ? globalThis.UNIVERSAL_SPELL_DEFS : [];
    return defs.find(d => d && d.id === id) || {};
}

// True when the spell definition carries the given tag.
function _vendorHasTag(def, tag) {
    return Array.isArray(def.tags) && def.tags.includes(tag);
}

// Picks a spell-type chip and redraws the charm cards.
export function _vendorSetCharmFilter(id) {
    _vendorCharmFilter = id;
    _vendorRefreshTabContent();
}

// One chip per spell type, with the chosen one highlighted.
export function _vendorBuildCharmFilterBarHTML() {
    const chip = (id, label) => `<button type="button" class="sx-vendor-filter-btn${_vendorCharmFilter === id ? ' sx-vendor-filter-btn-on' : ''}" onclick="_vendorSetCharmFilter('${id}')">${label}</button>`;
    return `<div class="sx-vendor-charm-filters">${chip('all', t('eg_vendor_charm_filter_all'))}${
        VENDOR_CHARM_FILTERS.map(f => chip(f.id, t('eg_vendor_charm_filter_' + f.id))).join('')}</div>`;
}

// Keeps only the spell ids that match the chosen chip.
export function _vendorFilterCharmIds(ids) {
    const filter = VENDOR_CHARM_FILTERS.find(f => f.id === _vendorCharmFilter);
    return filter ? ids.filter(id => filter.test(_vendorUniversalDef(id))) : ids;
}
