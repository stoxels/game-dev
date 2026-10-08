import { LANG, t } from '../translation/translations.js';
import { _egBuildItemChipHTML } from '../endgame/endgame-hub.js';
import { hideGameTooltip, moveGameTooltip, showGameTooltip } from '../tooltips-hud.js';
import {
    EG_CRAFTED_MOD_CAPS,
    _egCraftingBenchItem,
    _egCraftingBenchSelection,
} from './loot-crafting-bench-state.js';
import {
    _egCountCraftedMods,
    _egCountRegularMods,
    _egCraftingBenchCanAfford,
    _egCraftingBenchCanUseItem,
    _egCraftingBenchCostLabel,
    _egCraftingBenchCostTooltip,
    _egCraftingBenchEffectiveCosts,
    _egCraftingBenchFamilies,
} from './loot-crafting-bench-rules.js';
import { EG_MOD_CAPS } from './loot-equipment-generator.js';

//------------------------------------------------------------------------
//-------------------TOOLTIP HELPERS--------------------------------------
//------------------------------------------------------------------------

// Builds the explanatory tooltip for one family tier and its effective cost.
export function _egCraftingBenchTooltipHTML(entry, tier, costs, disabled, affordable) {
    const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
    const hasSecond = tier.min2 != null;
    const lowOne = tier.min1 != null ? tier.min1 : tier.min;
    const highOne = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond
        ? `${lowOne}-${highOne} / ${tier.min2}-${tier.max2}`
        : `${tier.min}-${tier.max}`;
    let html = `<strong style="color:#f1d27b">${label}</strong>`;
    html += `<br><span style="color:#a8c8e8">Range:</span> ${range}`;
    html += `<br><span style="color:#a8c8e8">Cost:</span> ${_egCraftingBenchCostTooltip(costs)}`;
    if (entry.isReplace) html += `<br><span style="color:#f1d27b">Replaces the existing crafted ${entry.type} (includes +1 Hollow Core)</span>`;
    if (disabled) html += `<br><span style="color:#e87d70">Requires item level ${tier.ilvl}</span>`;
    else if (!affordable) html += '<br><span style="color:#e87d70">Not enough currency for this craft</span>';
    return html;
}

// Binds tier hover behavior to the shared game-tooltip implementation.
export function _egCraftingBenchBindTooltips(overlay) {
    overlay.addEventListener('mouseover', event => {
        const button = event.target.closest('.eg-craft-tier');
        if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
        if (button.dataset.tooltipHtml) showGameTooltip(button.dataset.tooltipHtml, event);
    });
    overlay.addEventListener('mousemove', event => {
        if (event.target.closest && event.target.closest('.eg-craft-tier')) {
            moveGameTooltip(event);
        }
    });
    overlay.addEventListener('mouseout', event => {
        const button = event.target.closest ? event.target.closest('.eg-craft-tier') : null;
        if (button && !(event.relatedTarget && button.contains(event.relatedTarget))) {
            hideGameTooltip();
        }
    });
}

//------------------------------------------------------------------------
//-------------------PANEL MARKUP-----------------------------------------
//------------------------------------------------------------------------

// Formats one craft tier's number and item-level label.
export function _egCraftingBenchTierLabel(tier) {
    const hasSecond = tier.min2 != null;
    const lowOne = tier.min1 != null ? tier.min1 : tier.min;
    const highOne = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond ? `${lowOne}-${highOne} / ${tier.min2}-${tier.max2}` : `${tier.min}-${tier.max}`;
    return `<span class="tier-label">T${tier.tier} · ilvl ${tier.ilvl}</span><span class="tier-range">${range}</span>`;
}

// Builds the crafted and natural affix capacity bars for the current item.
export function _egCraftingBenchCapacityHTML(item) {
    if (!item) return '';
    const caps = EG_MOD_CAPS[item.rarity];
    const regularPre = _egCountRegularMods(item, 'prefix');
    const regularSuf = _egCountRegularMods(item, 'suffix');
    const craftedPre = _egCountCraftedMods(item, 'prefix');
    const craftedSuf = _egCountCraftedMods(item, 'suffix');

    if (item.rarity === 'common') {
        const maxPre = EG_CRAFTED_MOD_CAPS.maxPre;
        const maxSuf = EG_CRAFTED_MOD_CAPS.maxSuf;
        const prePct = Math.round((craftedPre / maxPre) * 100);
        const sufPct = Math.round((craftedSuf / maxSuf) * 100);
        return `<div class="eg-craft-capacity">
            <div class="eg-craft-capacity-item"><span>Crafted Prefix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${prePct}%"></div></div><span>${craftedPre}/${maxPre}</span></div>
            <div class="eg-craft-capacity-item"><span>Crafted Suffix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${sufPct}%"></div></div><span>${craftedSuf}/${maxSuf}</span></div>
        </div>`;
    }

    const maxPre = caps ? caps.maxPre : 0;
    const maxSuf = caps ? caps.maxSuf : 0;
    const prePct = maxPre > 0 ? Math.round(((regularPre + craftedPre) / maxPre) * 100) : 0;
    const sufPct = maxSuf > 0 ? Math.round(((regularSuf + craftedSuf) / maxSuf) * 100) : 0;
    return `<div class="eg-craft-capacity">
            <div class="eg-craft-capacity-item"><span>Prefix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${prePct}%"></div></div><span>${regularPre + craftedPre}/${maxPre} (${craftedPre} crafted)</span></div>
            <div class="eg-craft-capacity-item"><span>Suffix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${sufPct}%"></div></div><span>${regularSuf + craftedSuf}/${maxSuf} (${craftedSuf} crafted)</span></div>
        </div>`;
}

// Returns the reserved footer-cost slot; the crafting bench currently fills none.
export function _egCraftingBenchCostHTML() {
    return '';
}

// Builds the complete crafting panel for the item and selection in state.
export function _egCraftingBenchBuildHTML() {
    const item = _egCraftingBenchItem;
    const valid = _egCraftingBenchCanUseItem(item);
    const families = valid ? _egCraftingBenchFamilies(item) : [];
    const prefixFamilies = families.filter(family => family.type === 'prefix');
    const suffixFamilies = families.filter(family => family.type === 'suffix');

    let status;
    if (!item) {
        status = 'Only non-unique equipment can be crafted';
    } else if (!valid) {
        const craftedPre = _egCountCraftedMods(item, 'prefix');
        const craftedSuf = _egCountCraftedMods(item, 'suffix');
        if (item.rarity === 'common') {
            status = `Crafted mods: ${craftedPre}/${EG_CRAFTED_MOD_CAPS.maxPre} prefix, ${craftedSuf}/${EG_CRAFTED_MOD_CAPS.maxSuf} suffix. No more crafted modifiers can be added.`;
        } else {
            const caps = EG_MOD_CAPS[item.rarity] || { maxPre: 0, maxSuf: 0 };
            const regularPre = _egCountRegularMods(item, 'prefix');
            const regularSuf = _egCountRegularMods(item, 'suffix');
            status = `Affixes: ${regularPre}/${caps.maxPre} prefix, ${regularSuf}/${caps.maxSuf} suffix. Crafted: ${craftedPre}/${EG_CRAFTED_MOD_CAPS.maxPre} prefix, ${craftedSuf}/${EG_CRAFTED_MOD_CAPS.maxSuf} suffix. No more modifiers can be added.`;
        }
    } else {
        status = 'Select a modifier to craft.';
    }

    // Renders one prefix or suffix column from its eligible family cards.
    const buildCards = columnFamilies => {
        let cards = '';
        for (const entry of columnFamilies) {
            const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
            cards += `<div class="eg-craft-family ${entry.type}"><div class="eg-craft-family-head"><span class="eg-craft-family-badge ${entry.type}">${entry.type.toUpperCase()}</span><span class="eg-craft-family-name ${entry.type}">${label}</span></div><div class="eg-craft-tiers">`;
            for (const tier of entry.tiers) {
                const selected = _egCraftingBenchSelection
                    && _egCraftingBenchSelection.familyId === entry.familyId
                    && _egCraftingBenchSelection.type === entry.type
                    && _egCraftingBenchSelection.tier === tier.tier;
                const disabled = !tier.eligible;
                const costs = _egCraftingBenchEffectiveCosts(entry, tier);
                const affordable = _egCraftingBenchCanAfford(costs);
                const costHTML = `<span class="eg-craft-tier-cost ${affordable ? '' : 'missing'}">${_egCraftingBenchCostLabel(costs)}</span>`;
                const tooltipHTML = _egCraftingBenchTooltipHTML(entry, tier, costs, disabled, affordable);
                const isDisabled = disabled || !affordable;
                cards += `<button class="eg-craft-tier ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" ${isDisabled ? 'aria-disabled="true"' : `onclick="_egCraftingBenchSelect('${entry.familyId}', '${entry.type}', ${tier.tier})"`} data-tooltip-html="${tooltipHTML.replace(/"/g, '&quot;')}">${_egCraftingBenchTierLabel(tier)}${costHTML}${disabled ? ' 🔒' : ''}</button>`;
            }
            cards += '</div></div>';
        }
        return cards;
    };

    let options = '';
    if (prefixFamilies.length) options += `<div class="eg-craft-col prefix"><div class="eg-craft-col-head prefix">PREFIX · ${prefixFamilies.length}</div>${buildCards(prefixFamilies)}</div>`;
    if (suffixFamilies.length) options += `<div class="eg-craft-col suffix"><div class="eg-craft-col-head suffix">SUFFIX · ${suffixFamilies.length}</div>${buildCards(suffixFamilies)}</div>`;
    if (!options) options = `<div class="eg-craft-empty">${status}</div>`;

    const capacityHTML = item ? _egCraftingBenchCapacityHTML(item) : '';
    return `<div class="eg-craft-bench-panel"><div class="eg-craft-head"><span class="eg-craft-head-icon">⚒</span><span class="eg-craft-head-title">CRAFTING BENCH</span><button class="eg-craft-close" onclick="_egCloseCraftingBench()" data-tip-t="ui_close" aria-label="${t('ui_close')}">✕</button></div><h2>⚒ CRAFTING BENCH</h2><div class="eg-craft-body"><div class="eg-craft-bench-item" id="eg-crafting-bench-item" data-eg-dropzone="crafting" ondragover="egDragOver(event)"><span>${item ? _egBuildItemChipHTML(item, 'large') : 'Drop an equipment item here'}</span></div><div class="eg-craft-ilvl">${item ? `Item level: ${item.itemLevel || 1}` : status}</div>${capacityHTML}<div class="eg-craft-options">${options || `<div class="eg-craft-empty">${status}</div>`}</div></div><div class="eg-craft-footer"><div>${_egCraftingBenchCostHTML()}</div><button class="eg-craft-apply" onclick="_egCraftingBenchApply()" ${!_egCraftingBenchSelection ? 'disabled' : ''}>CRAFT SELECTED MODIFIER</button></div></div>`;
}
