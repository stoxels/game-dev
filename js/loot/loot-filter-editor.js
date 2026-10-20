import { Audio_Manager } from '../audio/audio.js';
import { LANG, t } from '../translation/translations.js';
import { INV_COLS, _inventory } from '../hub/hub.js';
import { _lootFilter, _loadLootFilter, _saveLootFilter, _lootFilterNormaliseRule, _lootFilterNormaliseState } from './loot-filter-state.js';
import { _lootFilterShouldVendor, _lootFilterAllModFamilies, _lootFilterBasesForSlot, _lootFilterModFamiliesForSlot, _lootFilterSlotTypes } from './loot-filter-rules.js';
import { _injectLootFilterStyles } from './loot-filter-styles.js';

//------------------------------------------------------------------------
//-------------------LOOT FILTER EDITOR-----------------------------------
//------------------------------------------------------------------------

// Working copy used while the editor is open.
export let _lootFilterWorking = null;

// Escapes text inserted into editor option labels.
export function _lootFilterEscapeHTML(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Builds the static editor shell once and returns the existing modal if present.
export function _ensureLootFilterModal() {
    _injectLootFilterStyles();
    let modal = document.getElementById('sx-loot-filter-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'sx-loot-filter-modal';
    modal.className = 'sx-lf-modal-bg';
    modal.innerHTML = `
<div class="sx-lf-box" id="sx-lf-box">
    <div class="sx-lf-head">
        <span class="sx-lf-head-icon">⚗</span>
        <span class="sx-lf-head-title">${t('eg_loot_filter_title')}</span>
        <button class="sx-lf-close" onclick="_lootFilterCloseModal()" data-tip-t="eg_loot_filter_close" aria-label="${t('eg_loot_filter_close')}">✕</button>
    </div>
    <div class="sx-lf-body">
        <div class="sx-lf-how">
            <div class="sx-lf-how-title">${t('eg_loot_filter_how')}</div>
            <div class="sx-lf-how-li"><span class="sx-lf-how-b">▸</span><span>${t('eg_loot_filter_b1')}</span></div>
            <div class="sx-lf-how-li"><span class="sx-lf-how-b">▸</span><span>${t('eg_loot_filter_b2')}</span></div>
            <div class="sx-lf-how-li"><span class="sx-lf-how-b">▸</span><span>${t('eg_loot_filter_b3')}</span></div>
        </div>
        <div class="sx-lf-toggles">
            <label class="sx-lf-toggle"><input type="checkbox" id="sx-lf-enabled" class="sx-lf-check"><span>${t('eg_loot_filter_enable')}</span></label>
            <label class="sx-lf-toggle sx-lf-toggle-gold"><input type="checkbox" id="sx-lf-keep-unique" class="sx-lf-check"><span>${t('eg_loot_filter_keep_unique')}</span></label>
        </div>
        <div class="sx-lf-rules-zone" id="sx-lf-rules-zone">
            <div class="sx-lf-section-head"><span class="sx-lf-section-title">${t('eg_loot_filter_rules_section')}</span><span class="sx-lf-section-count" id="sx-lf-rules-count"></span><span class="sx-lf-section-line"></span></div>
            <div class="sx-lf-rules" id="sx-lf-rules"></div>
            <button class="sx-lf-add" onclick="_lootFilterAddRule()">+ ${t('eg_loot_filter_add_rule')}</button>
        </div>
    </div>
    <div class="sx-lf-foot">
        <div class="sx-lf-preview" id="sx-lf-preview"></div>
        <div class="sx-lf-btns">
            <button class="sx-lf-btn sx-lf-save" onclick="_lootFilterSaveModal()">${t('eg_mass_sell_save')}</button>
            <button class="sx-lf-btn" onclick="_lootFilterCloseModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) _lootFilterCloseModal(); });
    document.body.appendChild(modal);
    return modal;
}

// Builds one editable rule card.
export function _lootFilterRuleHTML(rule, idx) {
    const slotOpts = ['<option value="any"' + (rule.slot === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(_lootFilterSlotTypes().map(s => `<option value="${s}"${rule.slot === s ? ' selected' : ''}>${s}</option>`)).join('');
    const bases = _lootFilterBasesForSlot(rule.slot);
    const baseOpts = ['<option value="any"' + (rule.baseId === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(bases.map(b => `<option value="${_lootFilterEscapeHTML(b.id)}"${rule.baseId === b.id ? ' selected' : ''}>${_lootFilterEscapeHTML((LANG === 'de' && b.nameDe) ? b.nameDe : b.name)}</option>`)).join('');
    const modModeOpts = [['none', t('eg_loot_filter_mod_none')], ['has_t1', t('eg_loot_filter_mod_has_t1')], ['not_has', t('eg_loot_filter_mod_not_has')]]
        .map(([v, label]) => `<option value="${v}"${rule.modMode === v ? ' selected' : ''}>${label}</option>`).join('');
    const fams = rule.slot === 'any' ? _lootFilterAllModFamilies() : _lootFilterModFamiliesForSlot(rule.slot);
    const famOpts = ['<option value="">' + t('eg_loot_filter_any') + '</option>']
        .concat(fams.map(f => `<option value="${_lootFilterEscapeHTML(f.id)}"${rule.modFamily === f.id ? ' selected' : ''}>${_lootFilterEscapeHTML(f.label)}</option>`)).join('');
    const modFieldDim = rule.modMode === 'none' ? ' sx-lf-field-dim' : '';
    const maxT1Opts = ['<option value=""' + (rule.maxT1 == null ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat([0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${rule.maxT1 === n ? ' selected' : ''}>${n}</option>`)).join('');
    return `
<div class="sx-lf-rule${rule.enabled ? '' : ' sx-lf-rule-off'}">
    <div class="sx-lf-rule-head">
        <input type="checkbox" class="sx-lf-check" ${rule.enabled ? 'checked' : ''} onchange="_lootFilterSetRule(${idx}, 'enabled', this.checked)" data-tip-t="eg_loot_filter_rule_enable">
        <span class="sx-lf-rule-title">${t('eg_loot_filter_rule')} ${idx + 1}</span>
        <button class="sx-lf-rule-del" onclick="_lootFilterDelRule(${idx})" data-tip-t="eg_loot_filter_rule_del" aria-label="${t('eg_loot_filter_rule_del')}">✕</button>
    </div>
    <div class="sx-lf-fields">
        <div class="sx-lf-field"><label>${t('eg_loot_filter_slot')}</label><select onchange="_lootFilterSetRule(${idx}, 'slot', this.value)">${slotOpts}</select></div>
        <div class="sx-lf-field"><label>${t('eg_loot_filter_base')}</label><select onchange="_lootFilterSetRule(${idx}, 'baseId', this.value)">${baseOpts}</select></div>
        <div class="sx-lf-field"><label>${t('eg_loot_filter_max_ilvl')}</label><input type="number" min="0" max="100" step="1" value="${rule.maxIlvl}" onchange="_lootFilterSetRule(${idx}, 'maxIlvl', this.value)"><span class="sx-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span></div>
        <div class="sx-lf-field"><label>${t('eg_loot_filter_max_reqlvl')}</label><input type="number" min="0" max="100" step="1" value="${rule.maxReq}" onchange="_lootFilterSetRule(${idx}, 'maxReq', this.value)"><span class="sx-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span></div>
        <div class="sx-lf-field"><label>${t('eg_loot_filter_mod_mode')}</label><select onchange="_lootFilterSetRule(${idx}, 'modMode', this.value)">${modModeOpts}</select></div>
        <div class="sx-lf-field"><label>${t('eg_loot_filter_max_t1')}</label><select onchange="_lootFilterSetRule(${idx}, 'maxT1', this.value)">${maxT1Opts}</select></div>
        <div class="sx-lf-field${modFieldDim}"><label>${t('eg_loot_filter_mod_family')}</label><select onchange="_lootFilterSetRule(${idx}, 'modFamily', this.value)">${famOpts}</select></div>
    </div>
</div>`;
}

// Renders the current working rules into the editor.
export function _lootFilterRenderRules() {
    const wrap = document.getElementById('sx-lf-rules');
    if (!wrap || !_lootFilterWorking) return;
    wrap.innerHTML = _lootFilterWorking.rules.length === 0
        ? `<div class="sx-lf-empty"><span class="sx-lf-empty-icon">🗃</span>${t('eg_loot_filter_no_rules')}</div>`
        : _lootFilterWorking.rules.map((r, i) => _lootFilterRuleHTML(r, i)).join('');
}

// Recalculates vendor and keep counts against the uncommitted working copy.
export function _lootFilterUpdatePreview() {
    const preview = document.getElementById('sx-lf-preview');
    if (!preview || !_lootFilterWorking) return;
    let keep = 0, vendor = 0;
    if (typeof _inventory !== 'undefined' && _inventory) {
        for (let r = 0; r < _inventory.length; r++) {
            for (let c = 0; c < INV_COLS; c++) {
                const it = _inventory[r][c];
                if (!it || it.category !== 'equip') continue;
                if (_lootFilterShouldVendor(it, _lootFilterWorking)) vendor++; else keep++;
            }
        }
    }
    preview.innerHTML = t('eg_loot_filter_preview').replace('{vendor}', `<span class="sx-lf-n-vendor">${vendor}</span>`).replace('{keep}', `<span class="sx-lf-n-keep">${keep}</span>`);
}

// Rebuilds form controls from a cloned working filter.
export function _lootFilterRenderModalContent() {
    if (!_lootFilter) _loadLootFilter();
    _lootFilterWorking = JSON.parse(JSON.stringify(_lootFilter));
    const enabled = document.getElementById('sx-lf-enabled');
    const keepUnique = document.getElementById('sx-lf-keep-unique');
    if (enabled) {
        enabled.checked = !!_lootFilterWorking.enabled;
        enabled.onchange = () => { _lootFilterWorking.enabled = enabled.checked; _lootFilterSyncChrome(); _lootFilterUpdatePreview(); };
    }
    if (keepUnique) {
        keepUnique.checked = !!_lootFilterWorking.keepUnique;
        keepUnique.onchange = () => { _lootFilterWorking.keepUnique = keepUnique.checked; _lootFilterUpdatePreview(); };
    }
    _lootFilterRenderRules();
    _lootFilterSyncChrome();
    _lootFilterUpdatePreview();
}

// Keeps editor chrome synchronized with the working filter.
export function _lootFilterSyncChrome() {
    if (!_lootFilterWorking) return;
    const box = document.getElementById('sx-lf-box');
    if (box) box.classList.toggle('sx-lf-off', !_lootFilterWorking.enabled);
    const count = document.getElementById('sx-lf-rules-count');
    if (count) count.textContent = `· ${_lootFilterWorking.rules.length}`;
}

// Reapplies translated static labels when the language changes.
export function _lootFilterRenderStaticText(modal) {
    const title = modal.querySelector('.sx-lf-head-title');
    if (title) title.textContent = t('eg_loot_filter_title');
    const close = modal.querySelector('.sx-lf-close');
    if (close) close.setAttribute('aria-label', t('eg_loot_filter_close'));
    const howTitle = modal.querySelector('.sx-lf-how-title');
    if (howTitle) howTitle.textContent = t('eg_loot_filter_how');
    const bullets = ['eg_loot_filter_b1', 'eg_loot_filter_b2', 'eg_loot_filter_b3'];
    modal.querySelectorAll('.sx-lf-how-li > span:last-child').forEach((el, i) => { if (bullets[i]) el.textContent = t(bullets[i]); });
    const toggleSpans = modal.querySelectorAll('.sx-lf-toggles .sx-lf-toggle > span');
    if (toggleSpans[0]) toggleSpans[0].textContent = t('eg_loot_filter_enable');
    if (toggleSpans[1]) toggleSpans[1].textContent = t('eg_loot_filter_keep_unique');
    const sectionTitle = modal.querySelector('.sx-lf-section-title');
    if (sectionTitle) sectionTitle.textContent = t('eg_loot_filter_rules_section');
    const addBtn = modal.querySelector('.sx-lf-add');
    if (addBtn) addBtn.textContent = `+ ${t('eg_loot_filter_add_rule')}`;
    const saveBtn = modal.querySelector('.sx-lf-btn.sx-lf-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.sx-lf-foot .sx-lf-btn:not(.sx-lf-save)');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
}

// Opens the editor with a fresh working copy.
export function _openLootFilterModal() {
    if (!_lootFilter) _loadLootFilter();
    const modal = _ensureLootFilterModal();
    _lootFilterRenderStaticText(modal);
    _lootFilterRenderModalContent();
    modal.classList.add('show');
}

// Closes the editor and discards its working copy.
export function _lootFilterCloseModal() {
    const modal = document.getElementById('sx-loot-filter-modal');
    if (modal) modal.classList.remove('show');
    _lootFilterWorking = null;
}

// Commits the working copy, persists it, and closes the editor.
export function _lootFilterSaveModal() {
    if (!_lootFilterWorking) return;
    globalThis._lootFilter = _lootFilterNormaliseState(_lootFilterWorking);
    _lootFilterWorking = null;
    _saveLootFilter();
    _lootFilterCloseModal();
    Audio_Manager.playSFX('loot_filter_save');
    if (typeof showToast === 'function') globalThis.showToast(t('eg_loot_filter_saved'));
}

// Applies one inline-editor field change to the working copy.
export function _lootFilterSetRule(idx, field, value) {
    if (!_lootFilterWorking || !_lootFilterWorking.rules[idx]) return;
    const rule = _lootFilterWorking.rules[idx];
    if (field === 'enabled') rule.enabled = !!value;
    else if (field === 'maxIlvl' || field === 'maxReq') {
        const n = parseInt(value, 10);
        rule[field] = (isNaN(n) || n < 0) ? 0 : Math.min(100, n);
        _lootFilterRenderRules();
    } else if (field === 'slot') {
        rule.slot = value || 'any';
        const bases = _lootFilterBasesForSlot(rule.slot);
        if (rule.baseId !== 'any' && !bases.some(b => b.id === rule.baseId)) rule.baseId = 'any';
        _lootFilterRenderRules();
    } else if (field === 'modMode') {
        rule.modMode = ['none', 'has_t1', 'not_has'].includes(value) ? value : 'none';
        _lootFilterRenderRules();
    } else if (field === 'maxT1') {
        const n = parseInt(value, 10);
        rule.maxT1 = (isNaN(n) || n < 0) ? null : Math.min(6, n);
        _lootFilterRenderRules();
    } else rule[field] = String(value || '');
    _lootFilterUpdatePreview();
}

// Adds a default enabled rule to the working copy.
export function _lootFilterAddRule() {
    if (!_lootFilterWorking) return;
    _lootFilterWorking.rules.push(_lootFilterNormaliseRule({ enabled: true }));
    _lootFilterRenderRules();
    _lootFilterSyncChrome();
    _lootFilterUpdatePreview();
}

// Removes a working rule and refreshes the editor.
export function _lootFilterDelRule(idx) {
    if (!_lootFilterWorking || !_lootFilterWorking.rules[idx]) return;
    _lootFilterWorking.rules.splice(idx, 1);
    _lootFilterRenderRules();
    _lootFilterSyncChrome();
    _lootFilterUpdatePreview();
}

// Closes the editor when Escape is pressed while it is visible.
window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('sx-loot-filter-modal');
    if (modal && modal.classList.contains('show')) {
        _lootFilterCloseModal();
        e.preventDefault();
        e.stopPropagation();
    }
});

// Renders the stash-button tooltip for the current filter state.
export function _showLootFilterTooltip(e) {
    if (!_lootFilter) _loadLootFilter();
    const state = _lootFilter.enabled
        ? t('eg_loot_filter_state_on').replace('{n}', String(_lootFilter.rules.filter(r => r.enabled).length))
        : t('eg_loot_filter_state_off');
    globalThis.showGameTooltip(`
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header"><div class="sx-tt-icon">⚗</div><div class="sx-tt-name" style="color:#f5d98a;">${t('eg_loot_filter_title')}</div></div>
    <div class="sx-tt-section"><div class="sx-tt-desc">${state}</div></div>
</div>`, e);
}
