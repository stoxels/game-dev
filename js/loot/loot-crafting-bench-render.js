import { LANG, t } from '../translation/translations.js';
import { _buildItemChipHTML, _currencyDefForId } from '../endgame/endgame-hub.js';
import { hideGameTooltip, moveGameTooltip, showGameTooltip } from '../tooltips-hud.js';
import {
    CRAFTED_MOD_CAPS,
    _craftingBenchItem,
    _craftingBenchSelection,
} from './loot-crafting-bench-state.js';
import {
    _countCraftedMods,
    _countRegularMods,
    _craftingBenchCanAfford,
    _craftingBenchCanUseItem,
    _craftCurrencyCount,
    _craftingBenchCostTooltip,
    _craftingBenchEffectiveCosts,
    _craftingBenchFamilies,
} from './loot-crafting-bench-rules.js';
import { ITEM_MOD_CAPS } from './loot-equipment-generator.js';

//------------------------------------------------------------------------
//-------------------TOOLTIP HELPERS--------------------------------------
//------------------------------------------------------------------------

// Builds the explanatory tooltip for one family tier and its effective cost.
export function _craftingBenchTooltipHTML(entry, tier, costs, disabled, affordable) {
    const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
    const hasSecond = tier.min2 != null;
    const lowOne = tier.min1 != null ? tier.min1 : tier.min;
    const highOne = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond
        ? `${lowOne}-${highOne} / ${tier.min2}-${tier.max2}`
        : `${tier.min}-${tier.max}`;
    let html = `<strong style="color:#f1d27b">${label}</strong>`;
    html += `<br><span style="color:#a8c8e8">Range:</span> ${range}`;
    html += `<br><span style="color:#a8c8e8">Cost:</span> ${_craftingBenchCostTooltip(costs)}`;
    if (entry.isReplace) html += `<br><span style="color:#f1d27b">Replaces the existing crafted ${entry.type} (includes +1 Hollow Core)</span>`;
    if (disabled) html += `<br><span style="color:#e87d70">Requires item level ${tier.ilvl}</span>`;
    else if (!affordable) html += '<br><span style="color:#e87d70">Not enough currency for this craft</span>';
    return html;
}

// Binds tier hover behavior to the shared game-tooltip implementation.
export function _craftingBenchBindTooltips(overlay) {
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

// One chip per currency of a cost list: icon, name, and "have / need" with
// green (enough) or red (short) so affordability reads without hovering.
function _craftingBenchCostChipsHTML(costs) {
    return costs.map(cost => {
        const def = _currencyDefForId(cost.id) || {};
        const have = _craftCurrencyCount(cost.id);
        const ok = have >= cost.count;
        const name = def.name || cost.id;
        return `<span class="eg-craft-chip ${ok ? 'ok' : 'short'}" title="${name}">`
            + `<span class="eg-craft-chip-icon">${def.icon || '🪙'}</span>`
            + `<span class="eg-craft-chip-name">${name}</span>`
            + `<span class="eg-craft-chip-qty">${have}<i>/</i>${cost.count}</span></span>`;
    }).join('');
}

// Formats one craft tier's number and item-level label.
export function _craftingBenchTierLabel(tier) {
    const hasSecond = tier.min2 != null;
    const lowOne = tier.min1 != null ? tier.min1 : tier.min;
    const highOne = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond ? `${lowOne}-${highOne} / ${tier.min2}-${tier.max2}` : `${tier.min}-${tier.max}`;
    return `<span class="tier-label">T${tier.tier} · ilvl ${tier.ilvl}</span><span class="tier-range">${range}</span>`;
}

// Builds the crafted and natural affix capacity bars for the current item.
export function _craftingBenchCapacityHTML(item) {
    if (!item) return '';
    const caps = ITEM_MOD_CAPS[item.rarity];
    const regularPre = _countRegularMods(item, 'prefix');
    const regularSuf = _countRegularMods(item, 'suffix');
    const craftedPre = _countCraftedMods(item, 'prefix');
    const craftedSuf = _countCraftedMods(item, 'suffix');

    if (item.rarity === 'common') {
        const maxPre = CRAFTED_MOD_CAPS.maxPre;
        const maxSuf = CRAFTED_MOD_CAPS.maxSuf;
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
export function _craftingBenchCostHTML() {
    return '';
}

// Builds the complete crafting panel for the item and selection in state.
export function _craftingBenchBuildHTML() {
    const item = _craftingBenchItem;
    const valid = _craftingBenchCanUseItem(item);
    const families = valid ? _craftingBenchFamilies(item) : [];
    const prefixFamilies = families.filter(family => family.type === 'prefix');
    const suffixFamilies = families.filter(family => family.type === 'suffix');

    let status;
    if (!item) {
        status = 'Only non-unique equipment can be crafted';
    } else if (!valid) {
        const craftedPre = _countCraftedMods(item, 'prefix');
        const craftedSuf = _countCraftedMods(item, 'suffix');
        if (item.rarity === 'common') {
            status = `Crafted mods: ${craftedPre}/${CRAFTED_MOD_CAPS.maxPre} prefix, ${craftedSuf}/${CRAFTED_MOD_CAPS.maxSuf} suffix. No more crafted modifiers can be added.`;
        } else {
            const caps = ITEM_MOD_CAPS[item.rarity] || { maxPre: 0, maxSuf: 0 };
            const regularPre = _countRegularMods(item, 'prefix');
            const regularSuf = _countRegularMods(item, 'suffix');
            status = `Affixes: ${regularPre}/${caps.maxPre} prefix, ${regularSuf}/${caps.maxSuf} suffix. Crafted: ${craftedPre}/${CRAFTED_MOD_CAPS.maxPre} prefix, ${craftedSuf}/${CRAFTED_MOD_CAPS.maxSuf} suffix. No more modifiers can be added.`;
        }
    } else {
        status = 'Select a modifier to craft.';
    }

    // Renders one prefix or suffix column from its eligible family cards.
    const buildCards = columnFamilies => {
        let cards = '';
        for (const entry of columnFamilies) {
            let ready = 0;
            const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
            let tiersHTML = '';
            for (const tier of entry.tiers) {
                const selected = _craftingBenchSelection
                    && _craftingBenchSelection.familyId === entry.familyId
                    && _craftingBenchSelection.type === entry.type
                    && _craftingBenchSelection.tier === tier.tier;
                const disabled = !tier.eligible;
                const costs = _craftingBenchEffectiveCosts(entry, tier);
                const affordable = _craftingBenchCanAfford(costs);
                const tooltipHTML = _craftingBenchTooltipHTML(entry, tier, costs, disabled, affordable);
                const isDisabled = disabled || !affordable;
                const state = disabled ? 'locked' : (affordable ? 'ready' : 'short');
                const pill = disabled ? `🔒 ILVL ${tier.ilvl}` : (affordable ? '✓ READY' : '✗ MISSING');
                if (state === 'ready') ready++;
                tiersHTML += `<button class="eg-craft-tier ${state} ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" ${isDisabled ? 'aria-disabled="true"' : `onclick="_craftingBenchSelect('${entry.familyId}', '${entry.type}', ${tier.tier})"`} data-tooltip-html="${tooltipHTML.replace(/"/g, '&quot;')}">`
                    + `<span class="eg-craft-tier-main">${_craftingBenchTierLabel(tier)}</span>`
                    + `<span class="eg-craft-tier-costs">${_craftingBenchCostChipsHTML(costs)}</span>`
                    + `<span class="eg-craft-pill ${state}">${pill}</span></button>`;
            }
            cards += `<div class="eg-craft-family ${entry.type} ${ready ? 'has-ready' : 'none-ready'}"><div class="eg-craft-family-head"><span class="eg-craft-family-badge ${entry.type}">${entry.type.toUpperCase()}</span><span class="eg-craft-family-name ${entry.type}">${label}</span><span class="eg-craft-family-count ${ready ? 'ok' : 'none'}">${ready ? `${ready}/${entry.tiers.length} craftable` : 'not craftable'}</span></div><div class="eg-craft-tiers">${tiersHTML}</div></div>`;
        }
        return cards;
    };

    let options = '';
    if (prefixFamilies.length) options += `<div class="eg-craft-col prefix"><div class="eg-craft-col-head prefix">PREFIX · ${prefixFamilies.length}</div>${buildCards(prefixFamilies)}</div>`;
    if (suffixFamilies.length) options += `<div class="eg-craft-col suffix"><div class="eg-craft-col-head suffix">SUFFIX · ${suffixFamilies.length}</div>${buildCards(suffixFamilies)}</div>`;
    if (!options) options = `<div class="eg-craft-empty">${status}</div>`;

    const capacityHTML = item ? _craftingBenchCapacityHTML(item) : '';
    // Footer: cost of the currently selected modifier, have / need per currency.
    let selectedCostHTML = '';
    if (_craftingBenchSelection) {
        for (const entry of families) {
            if (entry.familyId !== _craftingBenchSelection.familyId || entry.type !== _craftingBenchSelection.type) continue;
            const tier = entry.tiers.find(x => x.tier === _craftingBenchSelection.tier);
            if (tier) selectedCostHTML = `<span class="eg-craft-selected-label">Cost</span>${_craftingBenchCostChipsHTML(_craftingBenchEffectiveCosts(entry, tier))}`;
        }
    }
    return `<div class="eg-craft-bench-panel"><div class="eg-craft-head"><span class="eg-craft-head-icon">⚒</span><span class="eg-craft-head-title">CRAFTING BENCH</span><button class="eg-craft-close" onclick="_closeCraftingBench()" data-tip-t="ui_close" aria-label="${t('ui_close')}">✕</button></div><h2>⚒ CRAFTING BENCH</h2><div class="eg-craft-body"><div class="eg-craft-bench-item" id="eg-crafting-bench-item" data-eg-dropzone="crafting" ondragover="egDragOver(event)"><span>${item ? _buildItemChipHTML(item, 'large') : 'Drop an equipment item here'}</span></div><div class="eg-craft-ilvl">${item ? `Item level: ${item.itemLevel || 1}` : status}</div>${capacityHTML}${valid ? '<div class="eg-craft-legend"><span class="eg-craft-pill ready">✓ READY</span> can craft now <span class="eg-craft-pill short">✗ MISSING</span> not enough currency <span class="eg-craft-pill locked">🔒 ILVL</span> item level too low</div>' : ''}<div class="eg-craft-options">${options || `<div class="eg-craft-empty">${status}</div>`}</div></div><div class="eg-craft-footer"><div class="eg-craft-selected-cost">${_craftingBenchCostHTML()}${selectedCostHTML}</div><button class="eg-craft-apply" onclick="_craftingBenchApply()" ${!_craftingBenchSelection ? 'disabled' : ''}>CRAFT SELECTED MODIFIER</button></div></div>`;
}
