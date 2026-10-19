import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egAddGold, egGetGold, egSpendGold } from './loot-gold.js';
import { egSaveHubState } from '../endgame/endgame-hub.js';
import { EG_ART } from '../endgame/endgame-art.js';

//------------------------------------------------------------------------
//-------------------CARD HELPERS------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resolves a vendor card icon through the shared item-art system
// (images/items/manifest.json). Returns an <img> when art exists for the
// id, else the emoji fallback - same pattern as hub/gate/mass-sell.
// Kicks off the lazy manifest fetch on first use.
export function _egvIconHTML(artId, fallbackEmoji) {
    try {
        if (typeof EG_ART !== 'undefined' && EG_ART && typeof EG_ART.html === 'function') {
            return EG_ART.html('item', artId, fallbackEmoji);
        }
    } catch (e) { /* art system not ready - fall through to emoji */ }
    return fallbackEmoji || '';
}

// Builds one vendor offer card from its display and purchase details.
export function _egvBuildCardHTML({ icon, title, subtitle, desc, price, buyCall, extraClass = '', blockedReason = '', extraAttrs = '' }) {
    const blockedCls = blockedReason ? ' egv-card-blocked' : '';
    const blockedTitle = blockedReason ? ` data-tip="${globalThis._tipAttr(blockedReason)}"` : '';
    // Free offers (price 0) never show a gold deficit.
    const isFree = price <= 0;
    // Dim the card + show the deficit while the player cannot afford it.
    const cannotAfford = !isFree && egGetGold() < price;
    const affordCls = cannotAfford ? ' egv-card-cannot-afford' : '';
    const affordLine = cannotAfford
        ? `<div class="egv-price-missing">${t('eg_vendor_missing_gold').replace('{n}', (price - egGetGold()).toLocaleString())}</div>`
        : '';
    return `
<div class="egv-card${blockedCls}${affordCls} ${extraClass}"${blockedTitle}${extraAttrs}>
    <div class="egv-card-top">
        <div class="egv-card-icon">${icon}</div>
        <div class="egv-card-info">
            <div class="egv-card-name">${title}</div>
            ${subtitle ? `<div class="egv-card-sub">${subtitle}</div>` : ''}
            ${desc ? `<div class="egv-card-desc">${desc}</div>` : ''}
        </div>
    </div>
    <div class="egv-card-bottom">
        <div>
            <div class="egv-offer-price">${isFree ? `🪙 ${t('eg_vendor_free')}` : `🪙 ${price.toLocaleString()}`}</div>
            ${affordLine}
        </div>
        <button class="title-btn egv-buy-btn" onclick="${buyCall}">${t('eg_vendor_buy')}</button>
    </div>
</div>`;
}

//------------------------------------------------------------------------
//-------------------PURCHASE ----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spends gold first, grants the item, then refunds if granting fails.
export function _egvPurchase(price, grantFn) {
    if (!egSpendGold(price)) {
        globalThis.showToast(t('eg_vendor_no_gold').replace('{n}', price - egGetGold()));
        Audio_Manager.playSFX('ui_error', 'player_equip_not_pickup');
        return false;
    }
    if (typeof _egLoadHubState === 'function') globalThis._egLoadHubState();
    if (!grantFn()) {
        _egAddGold(price); // refund
        globalThis.showToast(t('eg_vendor_no_space'));
        Audio_Manager.playSFX('ui_error', 'player_equip_not_pickup');
        return false;
    }
    egSaveHubState();
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
export function _egvSetRenderTabContent(render) {
    _renderTabContent = render;
}

// Asks the shell to redraw the active tab, e.g. after a purchase.
export function _egvRefreshTabContent() {
    _renderTabContent();
}
// Updates the vendor's displayed gold balance when that row exists.
export function _egvRefreshGoldDisplay() {
    const balanceEl = document.getElementById('egv-gold-balance');
    if (balanceEl) {
        balanceEl.textContent = t('eg_vendor_gold_balance').replace('{n}', egGetGold().toLocaleString());
    }
}

//------------------------------------------------------------------------
//-------------------CHARM TYPE FILTER-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spell-type filter chips above the charm cards: label key, plus a test on the
// spell's definition (its tags come from the registry's ARPG-style type line).
const EG_VENDOR_CHARM_FILTERS = [
    { id: 'fire', test: d => _egvHasTag(d, 'Fire') },
    { id: 'cold', test: d => _egvHasTag(d, 'Cold') },
    { id: 'lightning', test: d => _egvHasTag(d, 'Lightning') },
    { id: 'shadow', test: d => _egvHasTag(d, 'Shadow') },
    { id: 'arcane', test: d => _egvHasTag(d, 'Arcane') },
    { id: 'holy', test: d => _egvHasTag(d, 'Holy') },
    { id: 'physical', test: d => _egvHasTag(d, 'Physical') },
    { id: 'melee', test: d => d.castKind === 'melee' },
    { id: 'projectile', test: d => _egvHasTag(d, 'Projectile') },
    { id: 'area', test: d => _egvHasTag(d, 'Area') },
    { id: 'movement', test: d => ['Movement', 'Leap', 'Teleport', 'Dash'].some(g => _egvHasTag(d, g)) },
    { id: 'cleanse', test: d => _egvHasTag(d, 'Cleanse') },
    { id: 'defensive', test: d => ['Shield', 'Heal', 'Heal over Time'].some(g => _egvHasTag(d, g))
        || ['guard', 'ward', 'evade', 'thorns', 'shield', 'heal', 'hot'].includes(d.behavior) },
    { id: 'buff', test: d => _egvHasTag(d, 'Buff') },
];

// Chosen chip ('all' = no filter); remembered while the shop stays loaded.
let _egvCharmFilter = 'all';

// The raw universal-spell definition (carries tags, castKind and behavior;
// the generic skill def only keeps the tags).
function _egvUniversalDef(id) {
    const defs = Array.isArray(globalThis.UNIVERSAL_SPELL_DEFS) ? globalThis.UNIVERSAL_SPELL_DEFS : [];
    return defs.find(d => d && d.id === id) || {};
}

// True when the spell definition carries the given tag.
function _egvHasTag(def, tag) {
    return Array.isArray(def.tags) && def.tags.includes(tag);
}

// Picks a spell-type chip and redraws the charm cards.
export function _egvSetCharmFilter(id) {
    _egvCharmFilter = id;
    _egvRefreshTabContent();
}

// One chip per spell type, with the chosen one highlighted.
export function _egvBuildCharmFilterBarHTML() {
    const chip = (id, label) => `<button type="button" class="egv-filter-btn${_egvCharmFilter === id ? ' egv-filter-btn-on' : ''}" onclick="_egvSetCharmFilter('${id}')">${label}</button>`;
    return `<div class="egv-charm-filters">${chip('all', t('eg_vendor_charm_filter_all'))}${
        EG_VENDOR_CHARM_FILTERS.map(f => chip(f.id, t('eg_vendor_charm_filter_' + f.id))).join('')}</div>`;
}

// Keeps only the spell ids that match the chosen chip.
export function _egvFilterCharmIds(ids) {
    const filter = EG_VENDOR_CHARM_FILTERS.find(f => f.id === _egvCharmFilter);
    return filter ? ids.filter(id => filter.test(_egvUniversalDef(id))) : ids;
}
