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
        Audio_Manager.playSFX('player_equip_not_pickup');
        return false;
    }
    if (typeof _egLoadHubState === 'function') globalThis._egLoadHubState();
    if (!grantFn()) {
        _egAddGold(price); // refund
        globalThis.showToast(t('eg_vendor_no_space'));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return false;
    }
    egSaveHubState();
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
