//------------------------------------------------------------------------
//-------------------ENDGAME CRAFTING BENCH-------------------------------
//------------------------------------------------------------------------
// Deterministic, catalogue-style crafting for equipment. Uses the existing
// modifier tables and currency stash. Crafted modifiers are tracked
// separately from regular modifiers with their own capacity limits.
//------------------------------------------------------------------------

let _egCraftingBenchItem = null;
let _egCraftingBenchSelection = null;

// Crafted modifier capacity limits (separate from regular affix caps).
// PoE-style: 1 crafted prefix + 1 crafted suffix max by default.
const EG_CRAFTED_MOD_CAPS = {
    maxPre: 1,
    maxSuf: 1,
    maxTotal: 2,
};

function _egCraftingBenchCanAfford(costs) {
    return costs.every(cost => _egCraftCurrencyCount(cost.id) >= cost.count);
}

function _egCraftingBenchCostLabel(costs) {
    return costs.map(cost => {
        const def = _egCurrencyDefForId(cost.id) || {};
        const icon = def.icon || '🪙';
        return `${icon}×${cost.count}`;
    }).join(' + ');
}

function _egCraftingBenchCostTooltip(costs) {
    return costs.map(cost => {
        const def = _egCurrencyDefForId(cost.id) || {};
        const icon = def.icon || '🪙';
        const name = def.name || cost.id;
        return `${cost.count}x ${icon} ${name}`;
    }).join(' + ');
}

function _egCraftingBenchTooltipHTML(entry, tier, costs, disabled, affordable) {
    const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
    const hasSecond = tier.min2 != null;
    const lo1 = tier.min1 != null ? tier.min1 : tier.min;
    const hi1 = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond
        ? `${lo1}-${hi1} / ${tier.min2}-${tier.max2}`
        : `${tier.min}-${tier.max}`;
    let html = `<strong style="color:#f1d27b">${label}</strong>`;
    html += `<br><span style="color:#a8c8e8">Range:</span> ${range}`;
    html += `<br><span style="color:#a8c8e8">Cost:</span> ${_egCraftingBenchCostTooltip(costs)}`;
    if (disabled) html += `<br><span style="color:#e87d70">Requires item level ${tier.ilvl}</span>`;
    else if (!affordable) html += '<br><span style="color:#e87d70">Not enough currency for this craft</span>';
    return html;
}

function _egCraftingBenchBindTooltips(overlay) {
    overlay.addEventListener('mouseover', event => {
        const button = event.target.closest('.eg-craft-tier');
        if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
        if (typeof showGameTooltip === 'function' && button.dataset.tooltipHtml) {
            showGameTooltip(button.dataset.tooltipHtml, event);
        }
    });
    overlay.addEventListener('mousemove', event => {
        if (event.target.closest && event.target.closest('.eg-craft-tier')
            && typeof moveGameTooltip === 'function') moveGameTooltip(event);
    });
    overlay.addEventListener('mouseout', event => {
        const button = event.target.closest ? event.target.closest('.eg-craft-tier') : null;
        if (button && !(event.relatedTarget && button.contains(event.relatedTarget))
            && typeof hideGameTooltip === 'function') hideGameTooltip();
    });
}

function _egCraftCurrencyCount(id) {
    const pos = typeof _egCurrencySlotForId === 'function' ? _egCurrencySlotForId(id) : null;
    return pos && _egCurrencyStash[pos.r] && _egCurrencyStash[pos.r][pos.c]
        ? (_egCurrencyStash[pos.r][pos.c].count || 0) : 0;
}

function _egCountCraftedMods(item, type) {
    return (item.mods || []).filter(mod => mod.type === type && mod.crafted === true).length;
}

function _egCountRegularMods(item, type) {
    return (item.mods || []).filter(mod => mod.type === type && mod.crafted !== true).length;
}

function _egCraftingBenchCanUseItem(item) {
    if (!item || item.category !== 'equip' || item.isUnique) return false;
    // Ensure item has required properties
    if (!item.slotType) return false;
    const table = typeof _egGetModTable === 'function' ? _egGetModTable(item) : null;
    if (!table) return false;

    const caps = typeof EG_MOD_CAPS !== 'undefined' ? EG_MOD_CAPS[item.rarity] : null;
    const craftedPre = _egCountCraftedMods(item, 'prefix');
    const craftedSuf = _egCountCraftedMods(item, 'suffix');
    const regularPre = _egCountRegularMods(item, 'prefix');
    const regularSuf = _egCountRegularMods(item, 'suffix');

    // White items: no regular affix capacity, but can receive crafted mods
    // up to EG_CRAFTED_MOD_CAPS limits.
    if (item.rarity === 'common') {
        return craftedPre < EG_CRAFTED_MOD_CAPS.maxPre || craftedSuf < EG_CRAFTED_MOD_CAPS.maxSuf;
    }

    // Non-white items: check both regular caps and crafted caps
    if (!caps) return false;
    if (regularPre >= caps.maxPre && regularSuf >= caps.maxSuf) return false;
    if (craftedPre >= EG_CRAFTED_MOD_CAPS.maxPre && craftedSuf >= EG_CRAFTED_MOD_CAPS.maxSuf) return false;
    if ((regularPre + craftedPre) >= caps.maxPre && (regularSuf + craftedSuf) >= caps.maxSuf) return false;

    return true;
}

function _egCraftingBenchFamilies(item) {
    if (!item || !item.slotType) return [];
    const table = typeof _egGetModTable === 'function' ? _egGetModTable(item) : null;
    if (!table) return [];

    const existingFamilies = new Set((item.mods || []).map(mod => mod.familyId));
    const ilvl = item.itemLevel || 1;
    const craftedPre = _egCountCraftedMods(item, 'prefix');
    const craftedSuf = _egCountCraftedMods(item, 'suffix');
    const regularPre = _egCountRegularMods(item, 'prefix');
    const regularSuf = _egCountRegularMods(item, 'suffix');
    const caps = typeof EG_MOD_CAPS !== 'undefined' ? EG_MOD_CAPS[item.rarity] : null;
    const defenses = item.defenses || {};

    const result = [];
    for (const type of ['prefix', 'suffix']) {
        const section = table[type + 'es'] || {};
        const usedCrafted = type === 'prefix' ? craftedPre : craftedSuf;
        const usedRegular = type === 'prefix' ? regularPre : regularSuf;

        // Determine max slots for this type (regular + crafted combined)
        let maxForType;
        if (item.rarity === 'common') {
            maxForType = EG_CRAFTED_MOD_CAPS[type === 'prefix' ? 'maxPre' : 'maxSuf'];
        } else {
            maxForType = caps ? (type === 'prefix' ? caps.maxPre : caps.maxSuf) : 0;
        }

        const usedTotal = usedRegular + usedCrafted;
        if (usedTotal >= maxForType) continue;

        for (const [familyId, family] of Object.entries(section)) {
            if (existingFamilies.has(familyId)) continue;
            if (typeof _egFamilyAllowedOnBase === 'function' && !_egFamilyAllowedOnBase(familyId, defenses)) continue;

            const tiers = (family.tiers || [])
                .map(tier => ({ ...tier, eligible: tier.ilvl <= ilvl }))
                .filter(tier => tier.eligible);

            if (tiers.length) result.push({ familyId, family, type, tiers });
        }
    }
    return result;
}

function _egCraftingBenchTierLabel(tier) {
    const hasSecond = tier.min2 != null;
    const lo1 = tier.min1 != null ? tier.min1 : tier.min;
    const hi1 = tier.max1 != null ? tier.max1 : tier.max;
    const range = hasSecond ? `${lo1}-${hi1} / ${tier.min2}-${tier.max2}` : `${tier.min}-${tier.max}`;
    return `<span class="tier-label">T${tier.tier} · ilvl ${tier.ilvl}</span><span class="tier-range">${range}</span>`;
}

function _egCraftingBenchCapacityHTML(item) {
    if (!item) return '';
    const caps = typeof EG_MOD_CAPS !== 'undefined' ? EG_MOD_CAPS[item.rarity] : null;
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
    } else {
        const maxPre = caps ? caps.maxPre : 0;
        const maxSuf = caps ? caps.maxSuf : 0;
        const prePct = maxPre > 0 ? Math.round(((regularPre + craftedPre) / maxPre) * 100) : 0;
        const sufPct = maxSuf > 0 ? Math.round(((regularSuf + craftedSuf) / maxSuf) * 100) : 0;
        return `<div class="eg-craft-capacity">
            <div class="eg-craft-capacity-item"><span>Prefix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${prePct}%"></div></div><span>${regularPre + craftedPre}/${maxPre} (${craftedPre} crafted)</span></div>
            <div class="eg-craft-capacity-item"><span>Suffix:</span><div class="eg-craft-capacity-bar"><div class="eg-craft-capacity-fill" style="width:${sufPct}%"></div></div><span>${regularSuf + craftedSuf}/${maxSuf} (${craftedSuf} crafted)</span></div>
        </div>`;
    }
}

function _egCraftingBenchCostHTML() {
    return '';
}

function _egCraftingBenchBuildHTML() {
    const item = _egCraftingBenchItem;
    const valid = _egCraftingBenchCanUseItem(item);
    const families = valid ? _egCraftingBenchFamilies(item) : [];

    let options = '';
    for (const entry of families) {
        const label = LANG === 'de' && entry.family.labelDe ? entry.family.labelDe : entry.family.label;
        options += `<div class="eg-craft-family ${entry.type}"><div class="eg-craft-family-name ${entry.type}">${entry.type.toUpperCase()} · ${label}</div><div class="eg-craft-tiers">`;
        for (const tier of entry.tiers) {
            const selected = _egCraftingBenchSelection &&
                _egCraftingBenchSelection.familyId === entry.familyId &&
                _egCraftingBenchSelection.type === entry.type &&
                _egCraftingBenchSelection.tier === tier.tier;
            const disabled = !tier.eligible;
            const costs = _egCraftingBenchCostFor(entry.familyId, tier.tier);
            const affordable = _egCraftingBenchCanAfford(costs);
            const costHTML = `<span class="eg-craft-tier-cost ${affordable ? '' : 'missing'}">${_egCraftingBenchCostLabel(costs)}</span>`;
            const tooltipHTML = _egCraftingBenchTooltipHTML(entry, tier, costs, disabled, affordable);
            const isDisabled = disabled || !affordable;
            options += `<button class="eg-craft-tier ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" ${isDisabled ? 'aria-disabled="true"' : `onclick="_egCraftingBenchSelect('${entry.familyId}', '${entry.type}', ${tier.tier})"`} data-tooltip-html="${tooltipHTML.replace(/"/g, '&quot;')}">${_egCraftingBenchTierLabel(tier)}${costHTML}${disabled ? ' 🔒' : ''}</button>`;
        }
        options += '</div></div>';
    }

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

    const capacityHTML = item ? _egCraftingBenchCapacityHTML(item) : '';

    return `<div class="eg-craft-bench-panel"><div class="eg-craft-head"><span class="eg-craft-head-icon">⚒</span><span class="eg-craft-head-title">CRAFTING BENCH</span><button class="eg-craft-close" onclick="_egCloseCraftingBench()" title="Close" aria-label="Close">✕</button></div><h2>⚒ CRAFTING BENCH</h2><div class="eg-craft-body"><div class="eg-craft-bench-item" id="eg-crafting-bench-item" data-eg-dropzone="crafting" ondragover="egDragOver(event)"><span>${item ? _egBuildItemChipHTML(item, 'large') : 'Drop an equipment item here'}</span></div><div class="eg-craft-ilvl">${item ? `Item level: ${item.itemLevel || 1}` : status}</div>${capacityHTML}<div class="eg-craft-options">${options || `<div class="eg-craft-empty">${status}</div>`}</div></div><div class="eg-craft-footer"><div>${_egCraftingBenchCostHTML()}</div><button class="eg-craft-apply" onclick="_egCraftingBenchApply()" ${!_egCraftingBenchSelection ? 'disabled' : ''}>CRAFT SELECTED MODIFIER</button></div></div>`;
}

function _egEnsureCraftingBenchOverlay() {
    if (document.getElementById('eg-crafting-bench-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'eg-crafting-bench-overlay';
    overlay.className = 'eg-craft-overlay';
    overlay.innerHTML = _egCraftingBenchBuildHTML();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _egCloseCraftingBench(); });
    document.body.appendChild(overlay);
    _egCraftingBenchBindDrop(overlay);
    _egCraftingBenchBindTooltips(overlay);
}

function _egCraftingBenchBindDrop(overlay) {
    const slot = overlay.querySelector('#eg-crafting-bench-item');
    slot.addEventListener('dragover', event => { event.preventDefault(); slot.classList.add('eg-craft-drop-active'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('eg-craft-drop-active'));
    slot.addEventListener('drop', event => {
        event.preventDefault();
        slot.classList.remove('eg-craft-drop-active');
        // The hub mouseup router owns custom drags. This native handler is only
        // retained to prevent browser navigation; accepting here would bypass
        // the router's source cleanup and cause the item to disappear.
    });
}

function _egRefreshCraftingBench() {
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    if (!overlay) return;
    overlay.innerHTML = _egCraftingBenchBuildHTML();
    _egCraftingBenchBindDrop(overlay);
    _egCraftingBenchBindTooltips(overlay);
}

function _egOpenCraftingBench() {
    _egEnsureCraftingBenchOverlay();
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    overlay.classList.add('show');
    _egRefreshCraftingBench();
}

function _egCloseCraftingBench() {
    const overlay = document.getElementById('eg-crafting-bench-overlay');
    if (overlay) overlay.classList.remove('show');
    _egCraftingBenchSelection = null;
}

// Global Escape handler — closes the crafting bench when open.
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const ov = document.getElementById('eg-crafting-bench-overlay');
        if (ov && ov.classList.contains('show')) {
            _egCloseCraftingBench();
            e.preventDefault();
            e.stopPropagation();
        }
    }
});

function _egCraftingBenchSelect(familyId, type, tier) {
    _egCraftingBenchSelection = { familyId, type, tier };
    _egRefreshCraftingBench();
}

function _egCraftingBenchApply() {
    const item = _egCraftingBenchItem;
    const selection = _egCraftingBenchSelection;
    if (!item || !selection || !_egCraftingBenchCanUseItem(item)) return;

    const entry = _egCraftingBenchFamilies(item).find(candidate =>
        candidate.familyId === selection.familyId && candidate.type === selection.type);
    const tier = entry && entry.tiers.find(candidate =>
        candidate.tier === selection.tier && candidate.eligible);

    if (!entry || !tier) return;

    const costs = _egCraftingBenchCostFor(entry.familyId, tier.tier);
    const missingCosts = costs.filter(cost => _egCraftCurrencyCount(cost.id) < cost.count);
    if (missingCosts.length) {
        const missing = missingCosts.map(cost => {
            const def = _egCurrencyDefForId(cost.id) || {};
            const have = _egCraftCurrencyCount(cost.id);
            return `${cost.count - have} more ${def.name || cost.id}`;
        }).join(', ');
        if (typeof showToast === 'function') showToast(`Insufficient currency: need ${missing}`, '#e87d70');
        else if (typeof _egShowStashInfo === 'function') _egShowStashInfo(`Insufficient currency: need ${missing}`, { type: 'error' });
        return;
    }

    for (const cost of costs) {
        const pos = _egCurrencySlotForId(cost.id);
        const stack = _egCurrencyStash[pos.r][pos.c];
        stack.count -= cost.count;
        if (stack.count <= 0) _egCurrencyStash[pos.r][pos.c] = null;
        _egRenderCurrencyCell(pos.r, pos.c);
    }

    const newMod = {
        familyId: entry.familyId,
        type: entry.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
        crafted: true,
    };
    item.mods = [...(item.mods || []), newMod];
    item.name = _egBuildItemName(item.baseName || item.name, item.rarity, item.mods);

    _egCraftingBenchSelection = null;
    _egRenderAll();
    egSaveHubState();
    _egRefreshCraftingBench();
}

function _egSetCraftingBenchItem(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return false;
    _egCraftingBenchItem = item;
    _egCraftingBenchSelection = null;
    _egRefreshCraftingBench();
    if (typeof _egUpdateCraftingBenchLauncherSlot === 'function') _egUpdateCraftingBenchLauncherSlot();
    return true;
}