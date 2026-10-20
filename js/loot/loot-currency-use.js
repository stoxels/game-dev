//----------------------------------------------------------------------
//---------CURRENCY USE MODE (RIGHT-CLICK ORB, LEFT-CLICK ITEM)---------
//----------------------------------------------------------------------

// The pending "use mode" state plus the application itself: gates the
// target, handles the Mirror copy, bundles extra orbs (Scouring),
// fires the shift-click chain fallback and consumes the stack.

import { Audio_Manager } from '../audio/audio.js';
import { trackAchStat } from '../achievements/achievements.js';
import { t } from '../translation/translations.js';
import { _egRenderMapStashCell, _egUpdateMapStashTabCounts } from '../endgame/endgame-gate.js';
import { _renderCurrencyCell } from '../endgame/endgame-hub-drag-and-drop.js';
import { INV_COLS, EG_MAP_STASH_COLS, _addItemToStash, _currencyStash, _ensureInvRows, _egFindFreeMapCellForTier, _getInvRows, _egGetMapTierGrid, _inventory, _egMapStash, _egRebuildMapStashGrid, _renderInventoryCell, _renderStatsList, _showStashInfo, _updateInvCount, saveHubState } from '../endgame/endgame-hub.js';
import { CURRENCY_DEFS } from './loot-currency.js';
import { EG_MAP_CURRENCY_RULES } from './loot-map-orbs.js';


export let _pendingCurrencyUse = null; // { defId, sourceRow, sourceCol }

export function _startCurrencyUse(def, row, col, chipEl) {
    _pendingCurrencyUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    if (chipEl) chipEl.classList.add('sx-currency-selected');
    document.body.classList.add('sx-currency-use-active');
    Audio_Manager.playSFX('currency_select');
    globalThis.showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

export function _cancelCurrencyUse(silent) {
    if (!_pendingCurrencyUse) return;
    _pendingCurrencyUse = null;
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    document.body.classList.remove('sx-currency-use-active');
    if (!silent) {
        Audio_Manager.playSFX('currency_cancel');
        globalThis.showToast(t('eg_currency_cancelled'));
    }
}

// Keeps use-mode active after an application (shift-click chaining).
// The currency cell may have been re-rendered by the application,
// so the chip element is re-acquired from the DOM.
export function _refreshCurrencyUseHighlight() {
    if (!_pendingCurrencyUse) return;
    const { sourceRow, sourceCol } = _pendingCurrencyUse;
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    const chip = document.querySelector(
        `.sx-currency-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .sx-item-chip`);
    if (chip) {
        chip.classList.add('sx-currency-selected');
        document.body.classList.add('sx-currency-use-active');
    } else {
        _cancelCurrencyUse(true);
    }
}

export function _applyCurrencyToItem(item, applyFn, chipEl, keepActive) {
    if (!_pendingCurrencyUse) return;
    const { sourceRow, sourceCol, defId } = _pendingCurrencyUse;
    const def = CURRENCY_DEFS[defId];
    const stack = _currencyStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _cancelCurrencyUse(true);
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
        Audio_Manager.playSFX('currency_apply_fail', 'player_equip_not_pickup');
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('sx-slot-reject');
            setTimeout(() => chipEl.classList.remove('sx-slot-reject'), 600);
        }
        _cancelCurrencyUse(true);
        return;
    }

    // Non-mirror map orbs must satisfy the map rule's own rarity gate.
    if (isMap && defId !== 'mirror_of_kalandra' && !mapRule.canApply(item)) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        globalThis.showToast(msg);
        Audio_Manager.playSFX('currency_apply_fail', 'player_equip_not_pickup');
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('sx-slot-reject');
            setTimeout(() => chipEl.classList.remove('sx-slot-reject'), 600);
        }
        _cancelCurrencyUse(true);
        return;
    }

    if (!isMap && (item.category !== 'equip' || !def.canApply(item))) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        globalThis.showToast(msg);
        Audio_Manager.playSFX('currency_apply_fail', 'player_equip_not_pickup');
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('sx-slot-reject');
            setTimeout(() => chipEl.classList.remove('sx-slot-reject'), 600);
        }
        _cancelCurrencyUse(true);
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
                if (stack.count <= 0) _currencyStash[sourceRow][sourceCol] = null;
                _renderCurrencyCell(sourceRow, sourceCol);
                if (keepActive && stack.count > 0) {
                    _refreshCurrencyUseHighlight();
                    globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                    saveHubState();
                    return;
                }
                _cancelCurrencyUse(true);
                globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                saveHubState();
                return;
            } catch(e) { /* fallback below */ }
        }
        const cols = INV_COLS;
        const grid = _inventory;
        const rows = (typeof _getInvRows === 'function' ? _getInvRows() : grid.length);

        let freeR = -1, freeC = -1;
        outer:
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c]) { freeR = r; freeC = c; break outer; }
            }
        }
        // Unlimited main stash: grow if needed
        if (freeR === -1) {
            if (typeof _addItemToStash === 'function') {
                const copy = JSON.parse(JSON.stringify(item));
                copy.mirrored = true;
                _addItemToStash(copy);
                // consume mirror below - handled after early return path
                // consume and update source
                stack.count = (stack.count || 1) - 1;
                if (stack.count <= 0) _currencyStash[sourceRow][sourceCol] = null;
                _renderCurrencyCell(sourceRow, sourceCol);
                if (keepActive && stack.count > 0) {
                    _refreshCurrencyUseHighlight();
                    globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                    saveHubState();
                    return;
                }
                _cancelCurrencyUse(true);
                globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
                saveHubState();
                return;
            }
            // fallback expand
            if (typeof _ensureInvRows === 'function') _ensureInvRows(grid.length + 1);
            else grid.push(Array(INV_COLS).fill(null));
            freeR = grid.length - 1; freeC = 0;
        }

        const copy = JSON.parse(JSON.stringify(item));
        copy.mirrored = true;
        grid[freeR][freeC] = copy;
        _renderInventoryCell(freeR, freeC);
        if (typeof _updateInvCount === 'function') _updateInvCount();

        // Consume one mirror from the stack.
        stack.count = (stack.count || 1) - 1;
        if (stack.count <= 0) _currencyStash[sourceRow][sourceCol] = null;
        _renderCurrencyCell(sourceRow, sourceCol);

        // Shift-click chaining: keep the mirror selected while stacks remain.
        if (keepActive && stack.count > 0) {
            _refreshCurrencyUseHighlight();
            globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
            saveHubState();
            return;
        }

        _cancelCurrencyUse(true);
        globalThis.showToast(t('eg_mirror_created').replace('{name}', copy.name));
        saveHubState();
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
        for (let r = 0; r < _currencyStash.length; r++) {
            for (let c = 0; c < (_currencyStash[r] || []).length; c++) {
                const candidate = _currencyStash[r][c];
                if (candidate && candidate.id === extraCurrencyId && (candidate.count || 0) > 0) {
                    extraStack = candidate; extraRow = r; extraCol = c;
                    break outerExtra;
                }
            }
        }
        if (!extraStack) {
            const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
            globalThis.showToast(msg);
        Audio_Manager.playSFX('currency_apply_fail', 'player_equip_not_pickup');
            _cancelCurrencyUse(true);
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
        for (let r = 0; r < _currencyStash.length; r++) {
            for (let c = 0; c < (_currencyStash[r] || []).length; c++) {
                const candidate = _currencyStash[r][c];
                if (candidate && candidate.id === chainFallbackId && (candidate.count || 0) > 0) {
                    fallbackStack = candidate; fallbackRow = r; fallbackCol = c;
                    break outerFallback;
                }
            }
        }
        if (fallbackStack && typeof CURRENCY_DEFS[chainFallbackId].apply === 'function'
            && CURRENCY_DEFS[chainFallbackId].canApply(newItem)) {
            const completedItem = CURRENCY_DEFS[chainFallbackId].apply(newItem);
            applyFn(completedItem);
            fallbackStack.count--;
            if (fallbackStack.count <= 0) _currencyStash[fallbackRow][fallbackCol] = null;
            _renderCurrencyCell(fallbackRow, fallbackCol);
        }
    }

    // Consume the bundled Scouring Orb, if any.
    if (extraStack) {
        extraStack.count--;
        if (extraStack.count <= 0) _currencyStash[extraRow][extraCol] = null;
        _renderCurrencyCell(extraRow, extraCol);
    }

    // Consume one orb from the stack.
    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _currencyStash[sourceRow][sourceCol] = null;
    _renderCurrencyCell(sourceRow, sourceCol);

    if (typeof trackAchStat === 'function') try {
        trackAchStat('egCurrencyApplied', 1);
        if (defId === 'orb_blessing') trackAchStat('egBlessingsUsed', 1);
        if (defId === 'mirror_of_kalandra') trackAchStat('egMirrorsUsed', 1);
    } catch(e){}
    Audio_Manager.playSFX('currency_apply_success');

    // Shift-click chaining: keep the orb selected so further shift-clicks
    // re-use it on the next target until the stack runs out.
    if (keepActive && stack.count > 0) {
        _refreshCurrencyUseHighlight();
        globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _renderStatsList === 'function') _renderStatsList();
        saveHubState();
        return;
    }

    _cancelCurrencyUse(true);
    globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _renderStatsList === 'function') _renderStatsList();
    saveHubState();
}
