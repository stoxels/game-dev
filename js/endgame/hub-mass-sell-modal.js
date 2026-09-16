//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: mass-sell modal UI + sell execution. Saves rebind the
// mass-sell settings lets (hub-mass-sell.js) through the write-through
// globalThis accessors.

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egClearTooltip } from './endgame-hub-tooltips.js';
import { _egRenderInventory, _egUpdateInvCount } from './endgame-hub.js';
import { EG_SHARD_DEFS, _egRollShardForItem, egAddShard } from './endgame-shards.js';
import { egSaveHubState } from './hub-load.js';
import { EG_MASS_SELL_RARITIES, _egIsProtectedFromMassSell, _egLoadMassSellSettings, _egMassSellCounts, _egMassSellKeep, _egMassSellMinItemLevel, _egMassSellMinReqLevel, _egNormaliseMassSellKeep, _egSaveMassSellSettings } from './hub-mass-sell.js';
import { EG_INV_COLS, _egInventory } from './hub-stash.js';











//-------------------MASS SELL (STASH)------------------------------------
//------------------------------------------------------------------------
// Two buttons live in the stash header ("STASH" row):
//   ⚙  opens the filter modal where the player marks which rarities are
//      PROTECTED (kept). Unchecked rarities are sold.
//   ⚒  sells every non-protected item in the stash in one go - same effect
//      as Ctrl+Click (shard or no-value destroy), but batched with a single
//      confirmation and a single save.

// Builds / returns the shared mass-sell modal element (creates once).
export function _egEnsureMassSellModal() {
    _egInjectMassSellStyles();
    let modal = document.getElementById('eg-mass-sell-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'eg-mass-sell-modal';
    modal.className = 'eg-mass-sell-modal-bg';
    modal.innerHTML = `
<div class="eg-mass-sell-box" id="eg-mass-sell-box">
    <div class="eg-ms-head">
        <span class="eg-ms-head-icon">⚒</span>
        <span class="eg-ms-head-title">${t('eg_mass_sell_modal_title')}</span>
        <button class="eg-ms-close" onclick="_egCloseMassSellModal()"
                data-tip-t="eg_mass_sell_close" aria-label="${t('eg_mass_sell_close')}">✕</button>
    </div>
    <div class="eg-ms-body">
        <div class="eg-ms-how">
            <div class="eg-ms-how-title">${t('eg_mass_sell_how')}</div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b1')}</span></div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b2')}</span></div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b3')}</span></div>
        </div>
        <div class="eg-ms-section-head">
            <span class="eg-ms-section-title">${t('eg_mass_sell_rarities_section')}</span>
            <span class="eg-ms-section-line"></span>
        </div>
        <div class="eg-mass-sell-rarities" id="eg-mass-sell-rarities"></div>
        <label class="eg-ms-toggle eg-ms-toggle-gold">
            <input type="checkbox" id="eg-mass-sell-keep-unique" class="eg-ms-check">
            <span>${t('eg_mass_sell_keep_unique')}</span>
        </label>
        <div class="eg-ms-section-head">
            <span class="eg-ms-section-title">${t('eg_mass_sell_levels_section')}</span>
            <span class="eg-ms-section-line"></span>
        </div>
        <div class="eg-ms-level-filters">
            <div class="eg-ms-field">
                <label for="eg-mass-sell-min-ilvl">${t('eg_mass_sell_min_ilvl')}</label>
                <input type="number" id="eg-mass-sell-min-ilvl" min="0" max="100" step="1" value="0">
                <span class="eg-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
            <div class="eg-ms-field">
                <label for="eg-mass-sell-min-reqlvl">${t('eg_mass_sell_min_reqlvl')}</label>
                <input type="number" id="eg-mass-sell-min-reqlvl" min="0" max="100" step="1" value="0">
                <span class="eg-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
        </div>
    </div>
    <div class="eg-ms-foot">
        <div class="eg-mass-sell-preview" id="eg-mass-sell-preview"></div>
        <div class="eg-mass-sell-btns">
            <button class="eg-mass-sell-btn eg-mass-sell-save" onclick="_egSaveMassSellModal()">${t('eg_mass_sell_save')}</button>
            <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCloseMassSellModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>
<div class="eg-mass-sell-confirm" id="eg-mass-sell-confirm" style="display:none;">
    <div class="eg-ms-head">
        <span class="eg-ms-head-icon">⚒</span>
        <span class="eg-ms-head-title">${t('eg_mass_sell_confirm_title')}</span>
    </div>
    <div class="eg-ms-confirm-body">
        <div class="eg-mass-sell-confirm-text" id="eg-mass-sell-confirm-text"></div>
        <div class="eg-mass-sell-btns">
            <button class="eg-mass-sell-btn eg-mass-sell-confirm" onclick="_egConfirmMassSell()">${t('eg_mass_sell_confirm_btn')}</button>
            <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCancelMassSellConfirm()">${t('eg_mass_sell_cancel')}</button>
        </div>
    </div>
</div>`;
    // Clicking the dimmed backdrop closes the modal (but not clicks inside the box).
    modal.addEventListener('click', (e) => { if (e.target === modal) _egCloseMassSellModal(); });
    document.body.appendChild(modal);
    return modal;
}

export function _egRarityLabel(rarity) {
    const keys = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    const k = keys[rarity];
    if (k) { const tr = t(k); if (tr && tr !== k) return tr; }
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export function _egRarityColor(rarity) {
    const map = {
        common: '#b0b0b0', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#c39bd3', legendary: '#f5b642', cursed: '#e74c3c', artifact: '#f1c40f',
    };
    return map[rarity] || '#ccc';
}

export function _egRenderMassSellModalContent() {
    const wrap = document.getElementById('eg-mass-sell-rarities');
    if (!wrap) return;
    if (!globalThis._egMassSellKeep) _egLoadMassSellSettings();
    const rows = EG_MASS_SELL_RARITIES.map(r => {
        const checked = _egMassSellKeep[r] ? 'checked' : '';
        const col = _egRarityColor(r);
        const label = _egRarityLabel(r);
        return `<label class="eg-mass-sell-row" style="--rar:${col};">
            <input type="checkbox" class="eg-ms-check" data-rarity="${r}" ${checked}>
            <span class="eg-mass-sell-dot"></span>
            <span class="eg-mass-sell-rarity-name">${label}</span>
            <span class="eg-mass-sell-keep-hint">${t('eg_mass_sell_keep_label').replace('{rarity}', label)}</span>
        </label>`;
    }).join('');
    wrap.innerHTML = rows;
    // wire preview updates
    wrap.querySelectorAll('input[data-rarity]').forEach(cb => {
        cb.addEventListener('change', _egUpdateMassSellPreview);
    });
    const uniqCb = document.getElementById('eg-mass-sell-keep-unique');
    if (uniqCb) {
        uniqCb.checked = !!globalThis._egMassSellKeepUnique;
        uniqCb.onchange = _egUpdateMassSellPreview;
    }
    // Level filters
    const minIlvlInput = document.getElementById('eg-mass-sell-min-ilvl');
    const minReqLvlInput = document.getElementById('eg-mass-sell-min-reqlvl');
    if (minIlvlInput) {
        minIlvlInput.value = _egMassSellMinItemLevel || 0;
        minIlvlInput.onchange = _egUpdateMassSellPreview;
    }
    if (minReqLvlInput) {
        minReqLvlInput.value = _egMassSellMinReqLevel || 0;
        minReqLvlInput.onchange = _egUpdateMassSellPreview;
    }
    _egUpdateMassSellPreview();
}

export function _egUpdateMassSellPreview() {
    const preview = document.getElementById('eg-mass-sell-preview');
    if (!preview) return;
    // read current UI state (not yet saved) for live numbers
    const tempKeep = {};
    document.querySelectorAll('#eg-mass-sell-rarities input[data-rarity]').forEach(cb => {
        tempKeep[cb.dataset.rarity] = cb.checked;
    });
    const tempKeepUnique = !!document.getElementById('eg-mass-sell-keep-unique')?.checked;
    const tempMinItemLevel = parseInt(document.getElementById('eg-mass-sell-min-ilvl')?.value || '0', 10);
    const tempMinReqLevel = parseInt(document.getElementById('eg-mass-sell-min-reqlvl')?.value || '0', 10);
    let keep = 0, sell = 0;
    if (_egInventory) {
        for (let r = 0; r < _egInventory.length; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                const it = _egInventory[r][c];
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
        .replace('{keep}', `<span class="eg-ms-n-keep">${keep}</span>`)
        .replace('{sell}', `<span class="eg-ms-n-sell">${sell}</span>`);
    // also stash for confirm step
    preview.dataset.keep = String(keep);
    preview.dataset.sell = String(sell);
}

// Re-applies the static shell strings on every open so a language switch
// mid-session is picked up (the shell markup itself is built only once).
export function _egMassSellRenderStaticText(modal) {
    const title = modal.querySelector('.eg-mass-sell-box .eg-ms-head-title');
    if (title) title.textContent = t('eg_mass_sell_modal_title');
    const close = modal.querySelector('.eg-ms-close');
    if (close) {
        // The hint is data-tip-t (resolved live at hover time), so only the
        // accessible name needs re-applying on a language switch.
        close.setAttribute('aria-label', t('eg_mass_sell_close'));
    }
    const howTitle = modal.querySelector('.eg-ms-how-title');
    if (howTitle) howTitle.textContent = t('eg_mass_sell_how');
    const bullets = ['eg_mass_sell_b1', 'eg_mass_sell_b2', 'eg_mass_sell_b3'];
    modal.querySelectorAll('.eg-ms-how-li > span:last-child').forEach((el, i) => {
        if (bullets[i]) el.textContent = t(bullets[i]);
    });
    const sections = modal.querySelectorAll('.eg-mass-sell-box .eg-ms-section-title');
    if (sections[0]) sections[0].textContent = t('eg_mass_sell_rarities_section');
    if (sections[1]) sections[1].textContent = t('eg_mass_sell_levels_section');
    const toggleSpan = modal.querySelector('.eg-ms-toggle-gold > span');
    if (toggleSpan) toggleSpan.textContent = t('eg_mass_sell_keep_unique');
    const ilvlLabel = modal.querySelector('label[for="eg-mass-sell-min-ilvl"]');
    if (ilvlLabel) ilvlLabel.textContent = t('eg_mass_sell_min_ilvl');
    const reqLabel = modal.querySelector('label[for="eg-mass-sell-min-reqlvl"]');
    if (reqLabel) reqLabel.textContent = t('eg_mass_sell_min_reqlvl');
    modal.querySelectorAll('.eg-ms-zero-hint').forEach(el => { el.textContent = t('eg_mass_sell_zero_off'); });
    const saveBtn = modal.querySelector('.eg-mass-sell-btn.eg-mass-sell-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.eg-mass-sell-box .eg-mass-sell-btn.eg-mass-sell-cancel');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
    const confirmTitle = modal.querySelector('.eg-mass-sell-confirm .eg-ms-head-title');
    if (confirmTitle) confirmTitle.textContent = t('eg_mass_sell_confirm_title');
    const confirmSell = modal.querySelector('.eg-mass-sell-btn.eg-mass-sell-confirm');
    if (confirmSell) confirmSell.textContent = t('eg_mass_sell_confirm_btn');
    const confirmCancel = modal.querySelector('.eg-mass-sell-confirm .eg-mass-sell-btn.eg-mass-sell-cancel');
    if (confirmCancel) confirmCancel.textContent = t('eg_mass_sell_cancel');
}

export function _egOpenMassSellModal() {
    _egLoadMassSellSettings();
    const modal = _egEnsureMassSellModal();
    _egMassSellRenderStaticText(modal);
    _egRenderMassSellModalContent();
    // ensure filter view is visible, confirm hidden
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    modal.classList.add('show');
}

export function _egCloseMassSellModal() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (modal) modal.classList.remove('show');
}

export function _egSaveMassSellModal() {
    // persist checkbox states
    const keep = {};
    document.querySelectorAll('#eg-mass-sell-rarities input[data-rarity]').forEach(cb => {
        keep[cb.dataset.rarity] = cb.checked;
    });
    globalThis._egMassSellKeep = _egNormaliseMassSellKeep(keep);
    globalThis._egMassSellKeepUnique = !!document.getElementById('eg-mass-sell-keep-unique')?.checked;
    globalThis._egMassSellMinItemLevel = Math.max(0, parseInt(document.getElementById('eg-mass-sell-min-ilvl')?.value || '0', 10));
    globalThis._egMassSellMinReqLevel = Math.max(0, parseInt(document.getElementById('eg-mass-sell-min-reqlvl')?.value || '0', 10));
    _egSaveMassSellSettings();
    _egCloseMassSellModal();
    if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_saved'));
}

// ── Sell execution ───────────────────────────────────────────────────
export function _egRequestMassSell() {
    _egLoadMassSellSettings();
    const { keep, sell } = _egMassSellCounts();
    if (sell === 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_nothing_to_sell'));
        else alert(t('eg_mass_sell_nothing_to_sell'));
        return;
    }
    const modal = _egEnsureMassSellModal();
    // populate confirm text in the same modal (re-uses the overlay)
    _egMassSellRenderStaticText(modal);
    _egRenderMassSellModalContent();
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    const confirmText = document.getElementById('eg-mass-sell-confirm-text');
    if (confirmText) {
        confirmText.textContent = t('eg_mass_sell_confirm_text')
            .replace('{n}', String(sell))
            .replace('{k}', String(keep));
    }
    if (box) box.style.display = 'none';
    if (confirm) confirm.style.display = '';
    modal.classList.add('show');
}

export function _egCancelMassSellConfirm() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (!modal) return;
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    // stay open on the filter view (user can tweak and sell again) - alternatively close:
    // _egCloseMassSellModal();
}

export function _egConfirmMassSell() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (modal) modal.classList.remove('show');
    // Hide confirm sub-panel for next open
    const box = modal && modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    _egExecuteMassSell();
}

export function _egExecuteMassSell() {
    if (!globalThis._egInventory) return;
    _egLoadMassSellSettings();
    // Snapshot targets first so mutation during iteration is safe.
    const targets = [];
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            const it = _egInventory[r][c];
            if (!it) continue;
            if (_egIsProtectedFromMassSell(it)) continue;
            targets.push({ r, c, item: it });
        }
    }
    if (targets.length === 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_nothing_to_sell'));
        return;
    }

    let sold = 0, noValue = 0, failed = 0;

    // Re-use the per-item shard logic: noSellValue → destroy without shard,
    // otherwise roll a shard. We batch the side-effects (single save, single
    // render pass at the end) instead of calling _egSellStashItem per cell
    // which would toast + save each time.
    for (const { r, c, item } of targets) {
        // Item may have been moved/cleared already if a previous failure left
        // it - verify the slot still holds the same item.
        if (_egInventory[r][c] !== item) continue;
        if (item.noSellValue) {
            _egInventory[r][c] = null;
            sold++; noValue++;
            continue;
        }
        // Try to grant a shard; if the shard stash is blocked the spec says
        // to keep the item and flash - mirror _egSellStashItem behaviour.
        // Unique items always grant an Ancient Shard.
        let shardDef = null;
        try {
            if (item.isUnique && typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS.shard_ancient) {
                shardDef = EG_SHARD_DEFS.shard_ancient;
            } else {
                shardDef = (typeof _egRollShardForItem === 'function') ? _egRollShardForItem(item) : null;
            }
        } catch (e) { shardDef = null; }
        if (!shardDef) {
            // shard system unavailable - treat as no-value destroy so the
            // inventory does not get stuck
            _egInventory[r][c] = null;
            sold++; noValue++;
            continue;
        }
        let granted = false;
        try {
            granted = (typeof egAddShard === 'function') ? egAddShard(shardDef.id, 1) : false;
        } catch (e) { granted = false; }
        if (!granted) {
            failed++;
            continue;
        }
        _egInventory[r][c] = null;
        sold++;
    }

    if (sold > 0) {
        _egRenderInventory();
        _egUpdateInvCount();
        _egClearTooltip();
        egSaveHubState();
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
            try { Audio_Manager.playSFX('player_equip_pickup'); } catch (e) {}
        }
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
        if (failed > 0) {
            const grid = document.getElementById('eg-inv-grid');
            if (grid) {
                grid.classList.add('eg-slot-reject');
                setTimeout(() => grid.classList.remove('eg-slot-reject'), 600);
            }
        }
    } else if (failed > 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_mass_sell_failed_shard_full').replace('{n}', String(failed)));
        const grid = document.getElementById('eg-inv-grid');
        if (grid) {
            grid.classList.add('eg-slot-reject');
            setTimeout(() => grid.classList.remove('eg-slot-reject'), 600);
        }
    }
}

export function _egInjectMassSellStyles() {
    if (document.getElementById('eg-mass-sell-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-mass-sell-styles';
    style.textContent = `
        /* ── stash header buttons ── */
        .eg-stash-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .eg-stash-actions { display: flex; gap: 6px; align-items: center; }
        .eg-stash-btn {
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            padding: 5px 10px; cursor: pointer;
            border: 1px solid var(--border2, #656f96); color: var(--accent2, #fff);
            background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)), var(--surface, #303648);
            transition: all 0.12s;
            white-space: nowrap;
        }
        .eg-stash-btn:hover { color: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1); }
        .eg-stash-btn-sell { color: var(--yellow, #f5c518); border-color: rgba(245,197,24,0.55); }
        .eg-stash-btn-sell:hover {
            box-shadow: 0 0 8px rgba(245,197,24,0.3); color: #fff;
            border-color: var(--yellow, #f5c518);
        }

        /* ── backdrop ── */
        .eg-mass-sell-modal-bg {
            display: none; position: fixed; inset: 0;
            background: rgba(5,8,14,0.78);
            backdrop-filter: blur(2px);
            z-index: 10001;
            align-items: center; justify-content: center;
        }
        .eg-mass-sell-modal-bg.show { display: flex; }

        /* ── shell: fixed header, scrollable body, pinned footer ── */
        .eg-mass-sell-box {
            display: flex; flex-direction: column;
            box-sizing: border-box;
            background: var(--panel, #222630);
            border: 1px solid var(--border2, #656f96);
            border-radius: 8px;
            width: min(480px, 94vw);
            max-height: min(640px, 92vh);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.55),
                        0 0 26px rgba(102,252,241,0.10),
                        0 22px 48px rgba(0,0,0,0.55);
            overflow: hidden;
        }
        .eg-mass-sell-confirm {
            box-sizing: border-box;
            background: var(--panel, #222630);
            border: 1px solid var(--border2, #656f96);
            border-radius: 8px;
            width: min(420px, 92vw);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.55),
                        0 0 26px rgba(102,252,241,0.10),
                        0 22px 48px rgba(0,0,0,0.55);
            overflow: hidden;
        }

        /* ── header ── */
        .eg-ms-head {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--border, #4a5475);
            background: linear-gradient(180deg, rgba(102,252,241,0.07), rgba(102,252,241,0.02));
            flex-shrink: 0;
        }
        .eg-ms-head-icon {
            font-size: 16px; line-height: 1; color: var(--accent, #66fcf1);
            text-shadow: 0 0 8px rgba(102,252,241,0.5);
        }
        .eg-ms-head-title {
            flex: 1; min-width: 0;
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-ms-close {
            width: 24px; height: 24px; flex-shrink: 0;
            font-family: var(--PX, monospace); font-size: 10px; line-height: 1;
            color: var(--accent2, #fff); background: transparent;
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            cursor: pointer; transition: all 0.12s;
        }
        .eg-ms-close:hover {
            color: #ff6b6b; border-color: rgba(255,107,107,0.6);
            background: rgba(255,107,107,0.12);
        }

        /* ── scrollable body ── */
        .eg-ms-body {
            flex: 1; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
            padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            scrollbar-width: thin;
            scrollbar-color: var(--border2, #656f96) transparent;
        }
        .eg-ms-body::-webkit-scrollbar { width: 8px; }
        .eg-ms-body::-webkit-scrollbar-track { background: transparent; }
        .eg-ms-body::-webkit-scrollbar-thumb { background: var(--border2, #656f96); border-radius: 4px; }

        /* ── how-it-works ── */
        .eg-ms-how {
            border: 1px solid var(--border, #4a5475);
            border-left: 3px solid var(--accent, #66fcf1);
            border-radius: 4px;
            background: rgba(102,252,241,0.04);
            padding: 8px 10px;
        }
        .eg-ms-how-title {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 2px;
            color: var(--accent, #66fcf1); opacity: 0.9; margin-bottom: 6px;
        }
        .eg-ms-how-li {
            display: flex; gap: 7px; align-items: baseline;
            font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.45;
            color: var(--accent2, #fff); opacity: 0.88;
        }
        .eg-ms-how-li + .eg-ms-how-li { margin-top: 3px; }
        .eg-ms-how-b { color: var(--accent, #66fcf1); flex-shrink: 0; }

        /* ── section headers ── */
        .eg-ms-section-head { display: flex; align-items: center; gap: 8px; }
        .eg-ms-section-title {
            font-family: var(--PX, monospace); font-size: 8px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
        }
        .eg-ms-section-line { flex: 1; height: 1px; background: var(--border, #4a5475); opacity: 0.6; }

        /* ── rarity rows ── */
        .eg-mass-sell-rarities { display: flex; flex-direction: column; gap: 4px; }
        .eg-mass-sell-row {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border: 1px solid transparent; border-radius: 3px;
            background: transparent; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            transition: background 0.12s, border-color 0.12s;
        }
        .eg-mass-sell-row:hover { background: rgba(255,255,255,0.05); border-color: var(--rar, #888); }
        .eg-mass-sell-dot {
            width: 10px; height: 10px; border-radius: 2px; background: var(--rar);
            display: inline-block; flex-shrink: 0;
            box-shadow: 0 0 5px var(--rar);
        }
        .eg-mass-sell-rarity-name { font-weight: 700; color: var(--rar); }
        .eg-mass-sell-keep-hint {
            margin-left: auto;
            font-family: var(--F, monospace); font-size: 11px;
            opacity: 0.55; letter-spacing: 0.5px;
        }

        /* ── custom checkboxes (same look as the loot filter) ── */
        .eg-ms-check {
            appearance: none; -webkit-appearance: none;
            width: 15px; height: 15px; flex-shrink: 0; margin: 0;
            background: rgba(0,0,0,0.4);
            border: 1px solid var(--border2, #656f96); border-radius: 2px;
            cursor: pointer; position: relative;
            transition: all 0.12s;
        }
        .eg-ms-check:hover { border-color: var(--accent, #66fcf1); }
        .eg-ms-check:checked {
            background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 7px rgba(102,252,241,0.55);
        }
        .eg-ms-check:checked::after {
            content: '✓'; position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: #0c1016;
        }

        /* ── gold toggle row ── */
        .eg-ms-toggle {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            border: 1px solid transparent;
            transition: background 0.12s, border-color 0.12s;
        }
        .eg-ms-toggle:hover { background: rgba(102,252,241,0.05); border-color: var(--border, #4a5475); }
        .eg-ms-toggle-gold span { color: var(--yellow, #f5c518); }

        /* ── level filter fields ── */
        .eg-ms-level-filters { display: flex; flex-direction: column; gap: 8px; }
        .eg-ms-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .eg-ms-field > label {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 1px;
            color: var(--setup-opt-inactive, #8892a3); text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-ms-field input[type="number"] {
            width: 100%; box-sizing: border-box;
            font-family: var(--F, monospace); font-size: 13px;
            color: var(--accent, #66fcf1);
            background: rgba(0,0,0,0.35);
            border: 1px solid var(--border, #4a5475); border-radius: 3px;
            padding: 4px 7px;
            transition: border-color 0.12s, box-shadow 0.12s;
        }
        .eg-ms-field input[type="number"]:focus {
            outline: none; border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 6px rgba(102,252,241,0.3);
        }
        .eg-ms-zero-hint {
            font-family: var(--F, monospace); font-size: 10px; line-height: 1;
            color: var(--setup-opt-inactive, #8892a3); opacity: 0.85;
        }

        /* ── footer (pinned: preview + save/cancel always visible) ── */
        .eg-ms-foot {
            flex-shrink: 0;
            border-top: 1px solid var(--border, #4a5475);
            background: rgba(0,0,0,0.18);
            padding: 9px 14px 12px;
        }
        .eg-mass-sell-preview {
            text-align: center; min-height: 17px; margin-bottom: 8px;
            font-family: var(--F, monospace); font-size: 13px; letter-spacing: 0.5px;
            color: var(--accent2, #fff);
        }
        .eg-ms-n-keep { color: var(--green, #3ddc84); }
        .eg-ms-n-sell { color: var(--orange, #ff8c42); }
        .eg-mass-sell-btns { display: flex; gap: 10px; justify-content: center; }
        .eg-mass-sell-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            padding: 9px 20px; cursor: pointer;
            color: var(--accent2, #fff);
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            transition: all 0.12s;
        }
        .eg-mass-sell-btn:hover { border-color: var(--accent, #66fcf1); color: var(--accent, #66fcf1); }
        .eg-mass-sell-btn.eg-mass-sell-save {
            color: #0c1016; background: var(--accent, #66fcf1);
            border-color: var(--accent, #66fcf1); font-weight: 700;
        }
        .eg-mass-sell-btn.eg-mass-sell-save:hover { box-shadow: 0 0 12px rgba(102,252,241,0.5); }

        /* ── confirm view ── */
        .eg-ms-confirm-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
        .eg-mass-sell-confirm-text {
            font-family: var(--F, monospace); font-size: 13px; line-height: 1.5;
            color: var(--accent2, #fff); text-align: center;
        }
        /* Destructive action - red fill, matching the game's delete-confirm button */
        .eg-mass-sell-btn.eg-mass-sell-confirm {
            color: #fff; background: var(--red, #e74c3c);
            border-color: var(--red, #e74c3c); font-weight: 700;
        }
        .eg-mass-sell-btn.eg-mass-sell-confirm:hover {
            filter: brightness(1.1); box-shadow: 0 0 10px rgba(231,76,60,0.4);
        }

        /* ── narrow screens ── */
        @media (max-width: 500px) {
            .eg-ms-body { padding: 10px; }
            .eg-ms-foot { padding: 8px 10px 10px; }
        }
    `;
    document.head.appendChild(style);
}
