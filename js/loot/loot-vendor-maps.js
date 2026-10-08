import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { trackAchStat } from '../achievements/achievements.js';
import { EG_ATLAS_MAX_TIER } from '../endgame/endgame-atlas.js';
import { _egGenerateMapDrop } from './loot-maps.js';
import { EG_MAX_MAP_TIER, _egMapTierMonsterLevel } from './loot-map-config.js';
import { _egAddMapToMapStash } from './loot-map-drops.js';
import { egSaveHubState } from '../endgame/endgame-hub.js';
import { egGetGold } from './loot-gold.js';
import { _egvBuildCardHTML, _egvIconHTML, _egvRefreshGoldDisplay } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Price of one vendor-bought Tier 1 map, in gold (0 = free).
const EG_VENDOR_T1_MAP_PRICE = 0;

//------------------------------------------------------------------------
//-------------------MAPS TAB----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the Maps tab: only a single free Tier 1 Normal map is offered.
// Maps are always Normal (white, no modifiers) so players must use currency
// orbs to upgrade them. This keeps progression gated through map drops.
export function _egvBuildMapsTabHTML() {
    const tier = 1;
    const monsterLevel = _egMapTierMonsterLevel(tier);
    let title;
    try { title = t('eg_vendor_offer_name'); } catch (e) { title = 'Tier 1 Map'; }
    const sub = `Tier ${tier} · Monster Lv ${monsterLevel} · Normal`;
    let desc;
    try { desc = t('eg_vendor_offer_desc'); } catch (e) { desc = 'A freshly charted Tier 1 map - always Normal (white). Use currency orbs to add modifiers.'; }
    const card = _egvBuildCardHTML({
        icon: _egvIconHTML('map_t01', '🗺️'),
        title,
        subtitle: sub,
        desc,
        price: 0,
        buyCall: `_egvBuyTierMap(1)`,
        extraClass: 'egv-map-card',
    });
    return `<div class="egv-cards egv-cards-maps">${card}</div>`;
}

// Refreshes dynamic bits on the Maps tab. All tier maps are free (price 0)
// so there is no cannot-afford state - we keep legacy single-card support
// for save-compatibility and simply refresh the gold balance.
export function _egvRefreshMapsTabDynamic() {
    // Legacy single-card path (pre multi-tier): keep behaviour if that DOM still exists.
    const priceEl = document.getElementById('egv-offer-price');
    if (priceEl) {
        if (EG_VENDOR_T1_MAP_PRICE > 0) {
            priceEl.textContent = t('eg_vendor_price').replace('{n}', EG_VENDOR_T1_MAP_PRICE.toLocaleString());
        } else {
            priceEl.textContent = `🪙 ${t('eg_vendor_free')}`;
        }
    }
    const cannotAfford = egGetGold() < EG_VENDOR_T1_MAP_PRICE;
    const cardEl = document.getElementById('egv-map-offer-card');
    if (cardEl) cardEl.classList.toggle('egv-card-cannot-afford', cannotAfford);
    const btn = document.getElementById('egv-buy-btn');
    if (btn) btn.classList.toggle('egv-cannot-afford', cannotAfford);
    const missingEl = document.getElementById('egv-map-missing-gold');
    if (missingEl) {
        missingEl.style.display = cannotAfford ? '' : 'none';
        if (cannotAfford) {
            missingEl.textContent = t('eg_vendor_missing_gold')
                .replace('{n}', (EG_VENDOR_T1_MAP_PRICE - egGetGold()).toLocaleString());
        }
    }
    _egvRefreshGoldDisplay();
}

// Core purchase helper - always produces a Normal (white) map with no
// modifiers. Players must use currency orbs to upgrade the map afterwards.
export function _egvBuyTierMap(tier) {
    const maxTier = EG_MAX_MAP_TIER || EG_ATLAS_MAX_TIER || 16;
    tier = Math.max(1, Math.min(maxTier, Math.round(tier || 1)));
    // Vendor only sells Tier 1 for now - clamp higher tiers down.
    tier = 1;

    if (typeof _egLoadHubState === 'function') globalThis._egLoadHubState();

    // Always Normal - no rarity or mod rolls, but upgradeable with orbs.
    const map = _egGenerateMapDrop(4, 1, { forceNormal: true });
    _egAddMapToMapStash(map);
    egSaveHubState();

    Audio_Manager.playSFX('player_equip_pickup');
    globalThis.showToast(t('eg_vendor_bought')
        .replace('{icon}', map.icon || '🗺️')
        .replace('{name}', map.name));

    try { trackAchStat('egVendorPurchases', 1); } catch (e) { /* never block a purchase */ }
    _egvRefreshMapsTabDynamic();
    _egvRefreshGoldDisplay();
}

// Backwards-compat shim: old Maps tab and external callers used this name.
export function _egvBuyTierOneMap() {
    return _egvBuyTierMap(1);
}
