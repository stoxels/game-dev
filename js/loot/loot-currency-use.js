//----------------------------------------------------------------------
//---------CURRENCY USE MODE (RIGHT-CLICK ORB, LEFT-CLICK ITEM)---------
//----------------------------------------------------------------------

// The pending "use mode" state plus the application itself: gates the
// target, handles the Mirror copy, bundles extra orbs (Scouring),
// fires the shift-click chain fallback and consumes the stack.

import { trackAchStat } from '../achievements/achievements.js';
import { t } from '../translation/translations.js';
import { _egRenderMapStashCell, _egUpdateMapStashTabCounts } from '../endgame/endgame-gate.js';
import { _egRenderCurrencyCell } from '../endgame/endgame-hub-drag-and-drop.js';
import { EG_INV_COLS, EG_MAP_STASH_COLS, _egAddItemToStash, _egCurrencyStash, _egEnsureInvRows, _egFindFreeMapCellForTier, _egGetInvRows, _egGetMapTierGrid, _egInventory, _egMapStash, _egRebuildMapStashGrid, _egRenderInventoryCell, _egRenderStatsList, _egShowStashInfo, _egUpdateInvCount, egSaveHubState } from '../endgame/endgame-hub.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { EG_MAP_CURRENCY_RULES } from './loot-map-orbs.js';


export let _egPendingCurrencyUse = null; // { defId, sourceRow, sourceCol }

export function _egStartCurrencyUse(def, row, col, chipEl) {
    _egPendingCurrencyUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    if (chipEl) chipEl.classList.add('eg-currency-selected');
    document.body.classList.add('eg-currency-use-active');
    globalThis.showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

export function _egCancelCurrencyUse(silent) {
    if (!_egPendingCurrencyUse) return;
    _egPendingCurrencyUse = null;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    document.body.classList.remove('eg-currency-use-active');
    if (!silent) globalThis.showToast(t('eg_currency_cancelled'));
}

// Keeps use-mode active after an application (shift-click chaining, like
// PoE). The currency cell may have been re-rendered by the application,
// so the chip element is re-acquired from the DOM.
export function _egRefreshCurrencyUseHighlight() {
    if (!_egPendingCurrencyUse) return;
    const { sourceRow, sourceCol } = _egPendingCurrencyUse;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    const chip = document.querySelector(
        `.eg-currency-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .eg-item-chip`);
    if (chip) {
        chip.classList.add('eg-currency-selected');
        document.body.classList.add('eg-currency-use-active');
    } else {
        _egCancelCurrencyUse(true);
    }
}

export function _egApplyCurrencyToItem(item, applyFn, chipEl, keepActive) {
    if (!_egPendingCurrencyUse) return;
    const { sourceRow, sourceCol, defId } = _egPendingCurrencyUse;
    const def = EG_CURRENCY_DEFS[defId];
    const stack = _egCurrencyStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _egCancelCurrencyUse(true);
        return;
    }

    // Maps use the dedicated map rules (EG_MAP_CURRENCY_RULES in
    // endgame-maps.js) so orbs roll from the MAP modifier tables.
    const isMap = item.category === 'map';
    const mapRule = isMap && typeof EG_MAP_CURRENCY_RULES !== 'undefined'
        ? EG_MAP_CURRENCY_RULES[defId]
        : null;

    if (isMap && !mapRule) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        globalThis.showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    // Non-mirror map orbs must satisfy the map rule's own rarity gate.
    if (isMap && defId !== 'mirror_of_kalandra' && !mapRule.canApply(item)) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        globalThis.showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    if (!isMap && (item.category !== 'equip' || !def.canApply(item))) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        globalThis.showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    // Mirror: instead of modifying the target, create an independent copy.
    // Equipment copies go to the main inventory; map copies go to the
    // Probability Gate map stash. The copy keeps the original untouched and
    // can itself be modified further with any other currency.
    if (typeof trackAchStat === 'function' && defId === 'mirror_of_kalandra') try { trackAchStat('egMirrorsUsed', 1); } catch(e){}
    if ((isMap && defId === 'mirror_of_kalandra') || (!isMap && def.isMirror)) {
        const copyToMapStash = isMap;
        if (copyToMapStash) {
            // Tiered infinite stash: place copy into its own tier
            try {
                const tier = (item.mapTier != null ? item.mapTier : (globalThis._egMapStashActiveTier || 1));
                const pos = (typeof _egFindFreeMapCellForTier === 'function') ? _egFindFreeMapCellForTier(tier) : { r:0,c:0 };
                const grid = (typeof _egGetMapTierGrid === 'function') ? _egGetMapTierGrid(tier) : _egMapStash;
                const copy = JSON.parse(JSON.stringify(item));
                copy.mirrored = true;
                grid[pos.r][pos.c] = copy;
                // render if visible tier
                if (tier === (globalThis._egMapStashActiveTier || 1) && typeof _egRenderMapStashCell === 'function') {
                    const domCells = document.querySelectorAll('.eg-map-stash-cell').length;
                    const needed = grid.length * EG_MAP_STASH_COLS;
                    if (domCells < needed && typeof _egRebuildMapStashGrid === 'function') _egRebuildMapStashGrid();
                    else _egRenderMapStashCell(pos.r, pos.c);
                } else if (typeof _egUpdateMapStashTabCounts === 'function') {
                    _egUpdateMapStashTabCounts();
                }
                // Consume one mirror from the stack.
                stack.count = (stack.count || 1) - 1;
                if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
                _egRenderCurrencyCell(sourceRow, sourceCol);
                if (keepActive && stack.count > 0) {
                    _egRefreshCurrencyUseHighlight();
                    globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                    egSaveHubState();
                    return;
                }
                _egCancelCurrencyUse(true);
                globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                egSaveHubState();
                return;
            } catch(e) { /* fallback below */ }
        }
        const cols = EG_INV_COLS;
        const grid = _egInventory;
        const rows = (typeof _egGetInvRows === 'function' ? _egGetInvRows() : grid.length);

        let freeR = -1, freeC = -1;
        outer:
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c]) { freeR = r; freeC = c; break outer; }
            }
        }
        // Unlimited main stash: grow if needed
        if (freeR === -1) {
            if (typeof _egAddItemToStash === 'function') {
                const copy = JSON.parse(JSON.stringify(item));
                copy.mirrored = true;
                _egAddItemToStash(copy);
                // consume mirror below - handled after early return path
                // consume and update source
                stack.count = (stack.count || 1) - 1;
                if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
                _egRenderCurrencyCell(sourceRow, sourceCol);
                if (keepActive && stack.count > 0) {
                    _egRefreshCurrencyUseHighlight();
                    globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                    egSaveHubState();
                    return;
                }
                _egCancelCurrencyUse(true);
                globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                egSaveHubState();
                return;
            }
            // fallback expand
            if (typeof _egEnsureInvRows === 'function') _egEnsureInvRows(grid.length + 1);
            else grid.push(Array(EG_INV_COLS).fill(null));
            freeR = grid.length - 1; freeC = 0;
        }

        const copy = JSON.parse(JSON.stringify(item));
        copy.mirrored = true;
        grid[freeR][freeC] = copy;
        _egRenderInventoryCell(freeR, freeC);
        if (typeof _egUpdateInvCount === 'function') _egUpdateInvCount();

        // Consume one mirror from the stack.
        stack.count = (stack.count || 1) - 1;
        if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
        _egRenderCurrencyCell(sourceRow, sourceCol);

        // Shift-click chaining: keep the mirror selected while stacks remain.
        if (keepActive && stack.count > 0) {
            _egRefreshCurrencyUseHighlight();
            globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
            egSaveHubState();
            return;
        }

        _egCancelCurrencyUse(true);
        globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
        egSaveHubState();
        return;
    }

    // Some crafting shortcuts bundle a Scouring Orb into the same click.
    // Validate and consume the extra orb before changing the target so a
    // failed shortcut never partially applies.
    const extraCurrencyId = !isMap && typeof def.requiresExtraCurrency === 'function'
        ? def.requiresExtraCurrency(item) : null;
    let extraStack = null;
    let extraRow = -1, extraCol = -1;
    if (extraCurrencyId) {
        outerExtra:
        for (let r = 0; r < _egCurrencyStash.length; r++) {
            for (let c = 0; c < (_egCurrencyStash[r] || []).length; c++) {
                const candidate = _egCurrencyStash[r][c];
                if (candidate && candidate.id === extraCurrencyId && (candidate.count || 0) > 0) {
                    extraStack = candidate; extraRow = r; extraCol = c;
                    break outerExtra;
                }
            }
        }
        if (!extraStack) {
            const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
            globalThis.showToast(msg);
            _egCancelCurrencyUse(true);
            return;
        }
    }

    const newItem = isMap ? mapRule.apply(item) : def.apply(item);
    applyFn(newItem);

    // Shift-chained Alteration results with one modifier automatically use an
    // Augmentation Orb, if available, to complete the uncommon item.
    const chainFallbackId = keepActive && !isMap && typeof def.chainFallback === 'function'
        ? def.chainFallback(newItem) : null;
    if (chainFallbackId) {
        let fallbackStack = null;
        let fallbackRow = -1, fallbackCol = -1;
        outerFallback:
        for (let r = 0; r < _egCurrencyStash.length; r++) {
            for (let c = 0; c < (_egCurrencyStash[r] || []).length; c++) {
                const candidate = _egCurrencyStash[r][c];
                if (candidate && candidate.id === chainFallbackId && (candidate.count || 0) > 0) {
                    fallbackStack = candidate; fallbackRow = r; fallbackCol = c;
                    break outerFallback;
                }
            }
        }
        if (fallbackStack && typeof EG_CURRENCY_DEFS[chainFallbackId].apply === 'function'
            && EG_CURRENCY_DEFS[chainFallbackId].canApply(newItem)) {
            const completedItem = EG_CURRENCY_DEFS[chainFallbackId].apply(newItem);
            applyFn(completedItem);
            fallbackStack.count--;
            if (fallbackStack.count <= 0) _egCurrencyStash[fallbackRow][fallbackCol] = null;
            _egRenderCurrencyCell(fallbackRow, fallbackCol);
        }
    }

    // Consume the bundled Scouring Orb, if any.
    if (extraStack) {
        extraStack.count--;
        if (extraStack.count <= 0) _egCurrencyStash[extraRow][extraCol] = null;
        _egRenderCurrencyCell(extraRow, extraCol);
    }

    // Consume one orb from the stack.
    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
    _egRenderCurrencyCell(sourceRow, sourceCol);

    if (typeof trackAchStat === 'function') try {
        trackAchStat('egCurrencyApplied', 1);
        if (defId === 'orb_blessing') trackAchStat('egBlessingsUsed', 1);
        if (defId === 'mirror_of_kalandra') trackAchStat('egMirrorsUsed', 1);
    } catch(e){}

    // Shift-click chaining: keep the orb selected so further shift-clicks
    // re-use it on the next target until the stack runs out.
    if (keepActive && stack.count > 0) {
        _egRefreshCurrencyUseHighlight();
        globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
        egSaveHubState();
        return;
    }

    _egCancelCurrencyUse(true);
    globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    egSaveHubState();
}
