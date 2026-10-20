//----------------------------------------------------------------------
//------------------TOOLTIP OVERRIDE (CURRENCY ITEMS)-------------------
//----------------------------------------------------------------------

// THE single _showHubTooltip implementation (consolidated 2026-09 from
// endgame-hub.js / endgame-hub-drag-and-drop.js, where duplicate
// copies used to race via load order). Currency/essence/shard items
// get a styled card; maps use loot-maps.js's tooltip builder;
// everything else uses the full stat block from _buildTooltipBodyHTML.

import { t } from '../translation/translations.js';
import { GAME_ART } from '../endgame/endgame-art.js';
import { _buildTooltipBodyHTML, _hideCompareTooltip, _lastMouse, _updateCompareTooltip } from '../endgame/endgame-hub-tooltips.js';
import { CURRENCY_DEFS } from './loot-currency.js';
import { ESSENCE_DEFS } from './loot-essences-defs.js';
import { _buildEssenceDetailHTML } from './loot-essences-tooltip.js';
import { _egBuildMapTooltipBodyHTML } from './loot-map-tooltip.js';
import { SHARD_DEFS } from './loot-shards.js';


export function _showHubTooltip(item, e) {
    globalThis._tooltipItem = item;

    if (!item) {
        globalThis.hideGameTooltip();
        _hideCompareTooltip();
        return;
    }

    // Heal legacy currency/shard items that lack category/description before rendering.
    if (item && item.id && (!item.category || !item.description)) {
        const isShard = typeof SHARD_DEFS !== 'undefined' && SHARD_DEFS[item.id];
        const cdef = (typeof CURRENCY_DEFS !== 'undefined' && CURRENCY_DEFS[item.id]) || (isShard ? SHARD_DEFS[item.id] : null);
        const edef = (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]) || null;
        const d = cdef || edef;
        if (d) {
            if (!item.category) item.category = d.category || (edef ? 'essence' : 'currency');
            if (!item.description) item.description = d.description || '';
            if (!item.name) item.name = d.name || item.name;
            if (!item.icon) item.icon = d.icon || item.icon;
            if (!item.rarity) item.rarity = d.rarity || item.category;
        }
    }

    let html;
    const isCurrencyLike = item.category === 'currency' || item.category === 'essence'
        || (typeof CURRENCY_DEFS !== 'undefined' && CURRENCY_DEFS[item.id])
        || (typeof SHARD_DEFS !== 'undefined' && SHARD_DEFS[item.id])
        || (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]);
    if (isCurrencyLike) {
        // Resolve display fields from the canonical def when still missing (orb of chance legacy case).
        const defForTT = (typeof CURRENCY_DEFS !== 'undefined' && CURRENCY_DEFS[item.id])
            || (typeof SHARD_DEFS !== 'undefined' && SHARD_DEFS[item.id])
            || (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]) || {};
        const ttName = item.name || defForTT.name || '???';
        const ttIcon = item.icon || defForTT.icon || '📦';
        const ttDesc = item.description || defForTT.description || '';
        const isEssenceTT = item.category === 'essence' || (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]);
        const countLine = item.count > 1 ? ` <span class="eg-tooltip-count">×${item.count}</span>` : '';
        let essenceDetailHTML = '';
        if (isEssenceTT && typeof _buildEssenceDetailHTML === 'function') {
            const edef = (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]) || defForTT;
            if (edef && edef.guaranteedFamilies) {
                try { essenceDetailHTML = _buildEssenceDetailHTML(edef); } catch (e) { essenceDetailHTML = ''; }
            }
        }
        html = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${GAME_ART.html('item', item.id, ttIcon)}</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${ttName}${countLine}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${isEssenceTT ? t('eg_rarity_essence') : t('eg_rarity_currency')}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc">${ttDesc}</div></div>
    ${essenceDetailHTML}
</div>`;
    } else if (item.category === 'map' && typeof _egBuildMapTooltipBodyHTML === 'function') {
        // Maps get their own tooltip with mods grouped by
        // monster / player / puzzle categories (endgame-maps.js).
        html = _egBuildMapTooltipBodyHTML(item);
    } else {
        html = _buildTooltipBodyHTML(item);
    }

    globalThis.showGameTooltip(html, e || {
        clientX: _lastMouse.x,
        clientY: _lastMouse.y,
    });
    _updateCompareTooltip();
}
