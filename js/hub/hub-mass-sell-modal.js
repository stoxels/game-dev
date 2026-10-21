//------------------------------------------------------------------------
//-------------------MASS SELL MODAL--------------------------------------
//------------------------------------------------------------------------
// The mass-sell UI in the stash header: a filter modal (which rarities and
// levels are protected) and a one-click sell of everything unprotected, with a
// single confirmation and a single save. The sell gives the same result as a
// Ctrl+click on each item. Settings are changed through hub-mass-sell.js.
//------------------------------------------------------------------------

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _clearTooltip } from './hub-tooltips.js';
import { _renderInventory, _updateInvCount } from './hub.js';
import { SHARD_DEFS, _rollShardForItem, addShard } from '../loot/loot-shards.js';
import { saveHubState } from './hub-save.js';
import { MASS_SELL_RARITIES, _isProtectedFromMassSell, _loadMassSellSettings, _massSellCounts, _massSellKeep, _massSellMinItemLevel, _massSellMinReqLevel, _normaliseMassSellKeep, _saveMassSellSettings } from './hub-mass-sell.js';
import { INV_COLS, _inventory } from './hub-stash.js';
import { _injectMassSellStyles } from './hub-mass-sell-styles.js';


//------------------------------------------------------------------------
//-------------------MODAL BUILD & CONTENT--------------------------------
//------------------------------------------------------------------------

// Two buttons live in the stash header ("STASH" row):
//   ⚙  opens the filter modal where the player marks which rarities are
//      PROTECTED (kept). Unchecked rarities are sold.
//   ⚒  sells every non-protected item in the stash in one go - same effect
//      as Ctrl+Click (shard or no-value destroy), but batched with a single
//      confirmation and a single save.

// Builds the shared mass-sell modal the first time and returns it.
export function _ensureMassSellModal() {
    _injectMassSellStyles();
    let modal = document.getElementById('sx-mass-sell-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'sx-mass-sell-modal';
    modal.className = 'sx-mass-sell-modal-bg';
    modal.innerHTML = `
<div class="sx-mass-sell-box" id="sx-mass-sell-box">
    <div class="sx-ms-head">
        <span class="sx-ms-head-icon">⚒</span>
        <span class="sx-ms-head-title">${t('eg_mass_sell_modal_title')}</span>
        <button class="sx-ms-close" onclick="_closeMassSellModal()"
                data-tip-t="eg_mass_sell_close" aria-label="${t('eg_mass_sell_close')}">✕</button>
    </div>
    <div class="sx-ms-body">
        <div class="sx-ms-how">
            <div class="sx-ms-how-title">${t('eg_mass_sell_how')}</div>
            <div class="sx-ms-how-li"><span class="sx-ms-how-b">▸</span><span>${t('eg_mass_sell_b1')}</span></div>
            <div class="sx-ms-how-li"><span class="sx-ms-how-b">▸</span><span>${t('eg_mass_sell_b2')}</span></div>
            <div class="sx-ms-how-li"><span class="sx-ms-how-b">▸</span><span>${t('eg_mass_sell_b3')}</span></div>
        </div>
        <div class="sx-ms-section-head">
            <span class="sx-ms-section-title">${t('eg_mass_sell_rarities_section')}</span>
            <span class="sx-ms-section-line"></span>
        </div>
        <div class="sx-mass-sell-rarities" id="sx-mass-sell-rarities"></div>
        <label class="sx-ms-toggle sx-ms-toggle-gold">
            <input type="checkbox" id="sx-mass-sell-keep-unique" class="sx-ms-check">
            <span>${t('eg_mass_sell_keep_unique')}</span>
        </label>
        <div class="sx-ms-section-head">
            <span class="sx-ms-section-title">${t('eg_mass_sell_levels_section')}</span>
            <span class="sx-ms-section-line"></span>
        </div>
        <div class="sx-ms-level-filters">
            <div class="sx-ms-field">
                <label for="sx-mass-sell-min-ilvl">${t('eg_mass_sell_min_ilvl')}</label>
                <input type="number" id="sx-mass-sell-min-ilvl" min="0" max="100" step="1" value="0">
                <span class="sx-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
            <div class="sx-ms-field">
                <label for="sx-mass-sell-min-reqlvl">${t('eg_mass_sell_min_reqlvl')}</label>
                <input type="number" id="sx-mass-sell-min-reqlvl" min="0" max="100" step="1" value="0">
                <span class="sx-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
        </div>
    </div>
    <div class="sx-ms-foot">
        <div class="sx-mass-sell-preview" id="sx-mass-sell-preview"></div>
        <div class="sx-mass-sell-btns">
            <button class="sx-mass-sell-btn sx-mass-sell-save" onclick="_saveMassSellModal()">${t('eg_mass_sell_save')}</button>
            <button class="sx-mass-sell-btn sx-mass-sell-cancel" onclick="_closeMassSellModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>
<div class="sx-mass-sell-confirm" id="sx-mass-sell-confirm" style="display:none;">
    <div class="sx-ms-head">
        <span class="sx-ms-head-icon">⚒</span>
        <span class="sx-ms-head-title">${t('eg_mass_sell_confirm_title')}</span>
    </div>
    <div class="sx-ms-confirm-body">
        <div class="sx-mass-sell-confirm-text" id="sx-mass-sell-confirm-text"></div>
        <div class="sx-mass-sell-btns">
            <button class="sx-mass-sell-btn sx-mass-sell-confirm" onclick="_confirmMassSell()">${t('eg_mass_sell_confirm_btn')}</button>
            <button class="sx-mass-sell-btn sx-mass-sell-cancel" onclick="_cancelMassSellConfirm()">${t('eg_mass_sell_cancel')}</button>
        </div>
    </div>
</div>`;
    // Clicking the dimmed backdrop closes the modal (but not clicks inside the box).
    modal.addEventListener('click', (e) => { if (e.target === modal) _closeMassSellModal(); });
    document.body.appendChild(modal);
    return modal;
}

// Translated rarity name (falls back to the capitalised key).
export function _itemRarityLabel(rarity) {
    const keys = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    const k = keys[rarity];
    if (k) { const tr = t(k); if (tr && tr !== k) return tr; }
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

// Display color for a rarity.
export function _rarityColor(rarity) {
    const map = {
        common: '#b0b0b0', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#c39bd3', legendary: '#f5b642', cursed: '#e74c3c', artifact: '#f1c40f',
    };
    return map[rarity] || '#ccc';
}

// Fills the rarity checkboxes and level inputs from the saved settings and
// wires them to the live preview.
export function _renderMassSellModalContent() {
    const wrap = document.getElementById('sx-mass-sell-rarities');
    if (!wrap) return;
    if (!globalThis._massSellKeep) _loadMassSellSettings();
    const rows = MASS_SELL_RARITIES.map(r => {
        const checked = _massSellKeep[r] ? 'checked' : '';
        const col = _rarityColor(r);
        const label = _itemRarityLabel(r);
        return `<label class="sx-mass-sell-row" style="--rar:${col};">
            <input type="checkbox" class="sx-ms-check" data-rarity="${r}" ${checked}>
            <span class="sx-mass-sell-dot"></span>
            <span class="sx-mass-sell-rarity-name">${label}</span>
            <span class="sx-mass-sell-keep-hint">${t('eg_mass_sell_keep_label').replace('{rarity}', label)}</span>
        </label>`;
    }).join('');
    wrap.innerHTML = rows;
    // wire preview updates
    wrap.querySelectorAll('input[data-rarity]').forEach(cb => {
        cb.addEventListener('change', _updateMassSellPreview);
    });
    const uniqCb = document.getElementById('sx-mass-sell-keep-unique');
    if (uniqCb) {
        uniqCb.checked = !!globalThis._massSellKeepUnique;
        uniqCb.onchange = _updateMassSellPreview;
    }
    // Level filters
    const minIlvlInput = document.getElementById('sx-mass-sell-min-ilvl');
    const minReqLvlInput = document.getElementById('sx-mass-sell-min-reqlvl');
    if (minIlvlInput) {
        minIlvlInput.value = _massSellMinItemLevel || 0;
        minIlvlInput.onchange = _updateMassSellPreview;
    }
    if (minReqLvlInput) {
        minReqLvlInput.value = _massSellMinReqLevel || 0;
        minReqLvlInput.onchange = _updateMassSellPreview;
    }
    _updateMassSellPreview();
}

// Recounts how many items would be kept / sold from the UNSAVED modal values.
export function _updateMassSellPreview() {
    const preview = document.getElementById('sx-mass-sell-preview');
    if (!preview) return;
    // read current UI state (not yet saved) for live numbers
    const tempKeep = {};
    document.querySelectorAll('#sx-mass-sell-rarities input[data-rarity]').forEach(cb => {
        tempKeep[cb.dataset.rarity] = cb.checked;
    });
    const tempKeepUnique = !!document.getElementById('sx-mass-sell-keep-unique')?.checked;
    const tempMinItemLevel = parseInt(document.getElementById('sx-mass-sell-min-ilvl')?.value || '0', 10);
    const tempMinReqLevel = parseInt(document.getElementById('sx-mass-sell-min-reqlvl')?.value || '0', 10);
    let keep = 0, sell = 0;
    if (_inventory) {
        for (let r = 0; r < _inventory.length; r++) {
            for (let c = 0; c < INV_COLS; c++) {
                const it = _inventory[r][c];
                if (!it) continue;
                const rarity = (it.rarity || 'common').toLowerCase();
                const protectedByRarity = !!tempKeep[rarity];
                const protectedByUnique = tempKeepUnique && it.isUnique;
                const protectedByItemLevel = tempMinItemLevel > 0 && it.itemLevel != null && it.itemLevel >= tempMinItemLevel;
                const protectedByReqLevel = tempMinReqLevel > 0 && it.requirements && it.requirements.level != null && it.requirements.level >= tempMinReqLevel;
                if (protectedByRarity || protectedByUnique || protectedByItemLevel || protectedByReqLevel) keep++; else sell++;
            }
        }
    }
    preview.innerHTML = t('eg_mass_sell_preview')
        .replace('{keep}', `<span class="sx-ms-n-keep">${keep}</span>`)
        .replace('{sell}', `<span class="sx-ms-n-sell">${sell}</span>`);
    // also stash for confirm step
    preview.dataset.keep = String(keep);
    preview.dataset.sell = String(sell);
}

// Re-applies the static shell strings on every open so a language switch
// mid-session is picked up (the shell markup itself is built only once).
export function _massSellRenderStaticText(modal) {
    const title = modal.querySelector('.sx-mass-sell-box .sx-ms-head-title');
    if (title) title.textContent = t('eg_mass_sell_modal_title');
    const close = modal.querySelector('.sx-ms-close');
    if (close) {
        // The hint is data-tip-t (resolved live at hover time), so only the
        // accessible name needs re-applying on a language switch.
        close.setAttribute('aria-label', t('eg_mass_sell_close'));
    }
    const howTitle = modal.querySelector('.sx-ms-how-title');
    if (howTitle) howTitle.textContent = t('eg_mass_sell_how');
    const bullets = ['eg_mass_sell_b1', 'eg_mass_sell_b2', 'eg_mass_sell_b3'];
    modal.querySelectorAll('.sx-ms-how-li > span:last-child').forEach((el, i) => {
        if (bullets[i]) el.textContent = t(bullets[i]);
    });
    const sections = modal.querySelectorAll('.sx-mass-sell-box .sx-ms-section-title');
    if (sections[0]) sections[0].textContent = t('eg_mass_sell_rarities_section');
    if (sections[1]) sections[1].textContent = t('eg_mass_sell_levels_section');
    const toggleSpan = modal.querySelector('.sx-ms-toggle-gold > span');
    if (toggleSpan) toggleSpan.textContent = t('eg_mass_sell_keep_unique');
    const ilvlLabel = modal.querySelector('label[for="sx-mass-sell-min-ilvl"]');
    if (ilvlLabel) ilvlLabel.textContent = t('eg_mass_sell_min_ilvl');
    const reqLabel = modal.querySelector('label[for="sx-mass-sell-min-reqlvl"]');
    if (reqLabel) reqLabel.textContent = t('eg_mass_sell_min_reqlvl');
    modal.querySelectorAll('.sx-ms-zero-hint').forEach(el => { el.textContent = t('eg_mass_sell_zero_off'); });
    const saveBtn = modal.querySelector('.sx-mass-sell-btn.sx-mass-sell-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.sx-mass-sell-box .sx-mass-sell-btn.sx-mass-sell-cancel');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
    const confirmTitle = modal.querySelector('.sx-mass-sell-confirm .sx-ms-head-title');
    if (confirmTitle) confirmTitle.textContent = t('eg_mass_sell_confirm_title');
    const confirmSell = modal.querySelector('.sx-mass-sell-btn.sx-mass-sell-confirm');
    if (confirmSell) confirmSell.textContent = t('eg_mass_sell_confirm_btn');
    const confirmCancel = modal.querySelector('.sx-mass-sell-confirm .sx-mass-sell-btn.sx-mass-sell-cancel');
    if (confirmCancel) confirmCancel.textContent = t('eg_mass_sell_cancel');
}


//------------------------------------------------------------------------
//-------------------MODAL OPEN / CLOSE / SAVE----------------------------
//------------------------------------------------------------------------

// Opens the filter view.
export function _openMassSellModal() {
    _loadMassSellSettings();
    const modal = _ensureMassSellModal();
    _massSellRenderStaticText(modal);
    _renderMassSellModalContent();
    // ensure filter view is visible, confirm hidden
    const box = modal.querySelector('.sx-mass-sell-box');
    const confirm = document.getElementById('sx-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    modal.classList.add('show');
}

// Hides the modal.
export function _closeMassSellModal() {
    const modal = document.getElementById('sx-mass-sell-modal');
    if (modal) modal.classList.remove('show');
}

// Writes the modal values into the mass-sell settings (via the globalThis
// accessors) and saves them.
export function _saveMassSellModal() {
    const keep = {};
    document.querySelectorAll('#sx-mass-sell-rarities input[data-rarity]').forEach(cb => {
        keep[cb.dataset.rarity] = cb.checked;
    });
    globalThis._massSellKeep = _normaliseMassSellKeep(keep);
    globalThis._massSellKeepUnique = !!document.getElementById('sx-mass-sell-keep-unique')?.checked;
    globalThis._massSellMinItemLevel = Math.max(0, parseInt(document.getElementById('sx-mass-sell-min-ilvl')?.value || '0', 10));
    globalThis._massSellMinReqLevel = Math.max(0, parseInt(document.getElementById('sx-mass-sell-min-reqlvl')?.value || '0', 10));
    _saveMassSellSettings();
    _closeMassSellModal();
    if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_saved'));
}


//------------------------------------------------------------------------
//-------------------SELL CONFIRMATION & EXECUTION------------------------
//------------------------------------------------------------------------

// Opens the confirmation view, or just toasts when nothing would be sold.
export function _requestMassSell() {
    _loadMassSellSettings();
    const { keep, sell } = _massSellCounts();
    if (sell === 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_nothing_to_sell'));
        else alert(t('eg_mass_sell_nothing_to_sell'));
        return;
    }
    const modal = _ensureMassSellModal();
    // populate confirm text in the same modal (re-uses the overlay)
    _massSellRenderStaticText(modal);
    _renderMassSellModalContent();
    const box = modal.querySelector('.sx-mass-sell-box');
    const confirm = document.getElementById('sx-mass-sell-confirm');
    const confirmText = document.getElementById('sx-mass-sell-confirm-text');
    if (confirmText) {
        confirmText.textContent = t('eg_mass_sell_confirm_text')
            .replace('{n}', String(sell))
            .replace('{k}', String(keep));
    }
    if (box) box.style.display = 'none';
    if (confirm) confirm.style.display = '';
    modal.classList.add('show');
}

// Cancelling the sell confirmation closes the dialog (it used to fall back to the
// filter settings, which read as "the loot filter opened by itself"). The filter
// view is reset so the next open starts there.
export function _cancelMassSellConfirm() {
    const modal = document.getElementById('sx-mass-sell-modal');
    if (!modal) return;
    const box = modal.querySelector('.sx-mass-sell-box');
    const confirm = document.getElementById('sx-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    _closeMassSellModal();
}

// Closes the dialog and runs the sale.
export function _confirmMassSell() {
    const modal = document.getElementById('sx-mass-sell-modal');
    if (modal) modal.classList.remove('show');
    // Hide confirm sub-panel for next open
    const box = modal && modal.querySelector('.sx-mass-sell-box');
    const confirm = document.getElementById('sx-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    _executeMassSell();
}

// Lists every unprotected stash item (a snapshot, so changing the stash while
// selling is safe).
function _collectMassSellTargets() {
    const targets = [];
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < INV_COLS; c++) {
            const it = _inventory[r][c];
            if (!it) continue;
            if (_isProtectedFromMassSell(it)) continue;
            targets.push({ r, c, item: it });
        }
    }
    return targets;
}

// Sells one item. Free starter gear is destroyed without a shard, uniques give
// an Ancient Shard, everything else a rolled shard. Returns 'sold',
// 'noValue' (destroyed, no shard) or 'failed' (shard strip full, item kept).
function _massSellOne(r, c, item) {
    if (item.noSellValue) {
        _inventory[r][c] = null;
        return 'noValue';
    }
    let shardDef = null;
    try {
        if (item.isUnique && SHARD_DEFS.shard_ancient) {
            shardDef = SHARD_DEFS.shard_ancient;
        } else {
            shardDef = _rollShardForItem(item);
        }
    } catch (e) { shardDef = null; }
    if (!shardDef) {
        // Shard system unavailable: destroy so the stash does not get stuck.
        _inventory[r][c] = null;
        return 'noValue';
    }
    let granted = false;
    try {
        granted = addShard(shardDef.id, 1);
    } catch (e) { granted = false; }
    if (!granted) return 'failed';
    _inventory[r][c] = null;
    return 'sold';
}

// Shakes the stash grid to show some items could not be sold.
function _flashStashReject() {
    const grid = document.getElementById('sx-inv-grid');
    if (grid) {
        grid.classList.add('sx-slot-reject');
        setTimeout(() => grid.classList.remove('sx-slot-reject'), 600);
    }
}

// Re-renders, saves, plays the sound and shows the result toast.
function _finishMassSell(sold, noValue, failed) {
    if (sold > 0) {
        _renderInventory();
        _updateInvCount();
        _clearTooltip();
        saveHubState();
        try { Audio_Manager.playSFX('mass_sell_confirm', 'player_equip_pickup'); } catch (e) {}
        if (typeof showToast === 'function') {
            if (failed > 0) {
                globalThis.showToast(t('eg_mass_sell_done')
                    .replace('{n}', String(sold))
                    + ' ' + t('eg_mass_sell_failed_shard_full').replace('{n}', String(failed)));
            } else if (noValue > 0) {
                globalThis.showToast(t('eg_mass_sell_done_no_value')
                    .replace('{n}', String(sold))
                    .replace('{z}', String(noValue)));
            } else {
                globalThis.showToast(t('eg_mass_sell_done').replace('{n}', String(sold)));
            }
        }
        if (failed > 0) _flashStashReject();
    } else if (failed > 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_failed_shard_full').replace('{n}', String(failed)));
        _flashStashReject();
    }
}

// Sells every unprotected stash item in one batch: one render and one save at
// the end instead of a toast and save per item.
export function _executeMassSell() {
    if (!globalThis._inventory) return;
    _loadMassSellSettings();
    const targets = _collectMassSellTargets();
    if (targets.length === 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_nothing_to_sell'));
        return;
    }

    let sold = 0, noValue = 0, failed = 0;
    for (const { r, c, item } of targets) {
        // Skip if the slot no longer holds the same item.
        if (_inventory[r][c] !== item) continue;
        const result = _massSellOne(r, c, item);
        if (result === 'failed') { failed++; continue; }
        sold++;
        if (result === 'noValue') noValue++;
    }
    _finishMassSell(sold, noValue, failed);
}
