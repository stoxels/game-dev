import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { trackAchStat } from '../achievements/achievements.js';
import { EG_ATLAS_MAX_TIER } from '../endgame/endgame-atlas.js';
import { _egGenerateMapDrop } from './loot-maps.js';
import { EG_MAX_MAP_TIER, _egMapTierMonsterLevel } from './loot-map-config.js';
import { _egAddMapToMapStash } from './loot-map-drops.js';
import { saveHubState } from '../endgame/endgame-hub.js';
import { getGold } from './loot-gold.js';
import { _vendorBuildCardHTML, _vendorIconHTML, _vendorRefreshGoldDisplay } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Price of one vendor-bought Tier 1 map, in gold (0 = free).
const VENDOR_T1_MAP_PRICE = 0;

//------------------------------------------------------------------------
//-------------------MAPS TAB----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the Maps tab: only a single free Tier 1 Normal map is offered.
// Maps are always Normal (white, no modifiers) so players must use currency
// orbs to upgrade them. This keeps progression gated through map drops.
export function _vendorBuildMapsTabHTML() {
    const tier = 1;
    const monsterLevel = _egMapTierMonsterLevel(tier);
    let title;
    try { title = t('eg_vendor_offer_name'); } catch (e) { title = 'Tier 1 Map'; }
    const sub = `Tier ${tier} · Monster Lv ${monsterLevel} · Normal`;
    let desc;
    try { desc = t('eg_vendor_offer_desc'); } catch (e) { desc = 'A freshly charted Tier 1 map - always Normal (white). Use currency orbs to add modifiers.'; }
    const card = _vendorBuildCardHTML({
        icon: _vendorIconHTML('map_t01', '🗺️'),
        title,
        subtitle: sub,
        desc,
        price: 0,
        buyCall: `_vendorBuyTierMap(1)`,
        extraClass: 'egv-map-card',
    });
    return `<div class="egv-cards egv-cards-maps">${card}</div>`;
}

// Refreshes dynamic bits on the Maps tab. All tier maps are free (price 0)
// so there is no cannot-afford state - we keep legacy single-card support
// for save-compatibility and simply refresh the gold balance.
export function _vendorRefreshMapsTabDynamic() {
    // Legacy single-card path (pre multi-tier): keep behaviour if that DOM still exists.
    const priceEl = document.getElementById('egv-offer-price');
    if (priceEl) {
        if (VENDOR_T1_MAP_PRICE > 0) {
            priceEl.textContent = t('eg_vendor_price').replace('{n}', VENDOR_T1_MAP_PRICE.toLocaleString());
        } else {
            priceEl.textContent = `🪙 ${t('eg_vendor_free')}`;
        }
    }
    const cannotAfford = getGold() < VENDOR_T1_MAP_PRICE;
    const cardEl = document.getElementById('egv-map-offer-card');
    if (cardEl) cardEl.classList.toggle('egv-card-cannot-afford', cannotAfford);
    const btn = document.getElementById('egv-buy-btn');
    if (btn) btn.classList.toggle('egv-cannot-afford', cannotAfford);
    const missingEl = document.getElementById('egv-map-missing-gold');
    if (missingEl) {
        missingEl.style.display = cannotAfford ? '' : 'none';
        if (cannotAfford) {
            missingEl.textContent = t('eg_vendor_missing_gold')
                .replace('{n}', (VENDOR_T1_MAP_PRICE - getGold()).toLocaleString());
        }
    }
    _vendorRefreshGoldDisplay();
}

// Core purchase helper - always produces a Normal (white) map with no
// modifiers. Players must use currency orbs to upgrade the map afterwards.
export function _vendorBuyTierMap(tier) {
    const maxTier = EG_MAX_MAP_TIER || EG_ATLAS_MAX_TIER || 16;
    tier = Math.max(1, Math.min(maxTier, Math.round(tier || 1)));
    // Vendor only sells Tier 1 for now - clamp higher tiers down.
    tier = 1;

    if (typeof _loadHubState === 'function') globalThis._loadHubState();

    // Always Normal - no rarity or mod rolls, but upgradeable with orbs.
    const map = _egGenerateMapDrop(4, 1, { forceNormal: true });
    _egAddMapToMapStash(map);
    saveHubState();

    Audio_Manager.playSFX('player_equip_pickup');
    globalThis.showToast(t('eg_vendor_bought')
        .replace('{icon}', map.icon || '🗺️')
        .replace('{name}', map.name));

    try { trackAchStat('egVendorPurchases', 1); } catch (e) { /* never block a purchase */ }
    _vendorRefreshMapsTabDynamic();
    _vendorRefreshGoldDisplay();
}

// Backwards-compat shim: old Maps tab and external callers used this name.
export function _vendorBuyTierOneMap() {
    return _vendorBuyTierMap(1);
}
