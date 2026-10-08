import { LANG, t } from '../translation/translations.js';
import { EG_INV_COLS, _egInventory } from '../endgame/endgame-hub.js';
import { _egLootFilter, _egLoadLootFilter, _egSaveLootFilter, _eglfNormaliseRule, _eglfNormaliseState } from './loot-filter-state.js';
import { _egLootFilterShouldVendor, _eglfAllModFamilies, _eglfBasesForSlot, _eglfModFamiliesForSlot, _eglfSlotTypes } from './loot-filter-rules.js';
import { _egInjectLootFilterStyles } from './loot-filter-styles.js';

//------------------------------------------------------------------------
//-------------------LOOT FILTER EDITOR-----------------------------------
//------------------------------------------------------------------------

// Working copy used while the editor is open.
export let _eglfWorking = null;

// Escapes text inserted into editor option labels.
export function _eglfEscapeHTML(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Builds the static editor shell once and returns the existing modal if present.
export function _egEnsureLootFilterModal() {
    _egInjectLootFilterStyles();
    let modal = document.getElementById('eg-loot-filter-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'eg-loot-filter-modal';
    modal.className = 'eg-lf-modal-bg';
    modal.innerHTML = `
<div class="eg-lf-box" id="eg-lf-box">
    <div class="eg-lf-head">
        <span class="eg-lf-head-icon">⚗</span>
        <span class="eg-lf-head-title">${t('eg_loot_filter_title')}</span>
        <button class="eg-lf-close" onclick="_eglfCloseModal()" data-tip-t="eg_loot_filter_close" aria-label="${t('eg_loot_filter_close')}">✕</button>
    </div>
    <div class="eg-lf-body">
        <div class="eg-lf-how">
            <div class="eg-lf-how-title">${t('eg_loot_filter_how')}</div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b1')}</span></div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b2')}</span></div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b3')}</span></div>
        </div>
        <div class="eg-lf-toggles">
            <label class="eg-lf-toggle"><input type="checkbox" id="eg-lf-enabled" class="eg-lf-check"><span>${t('eg_loot_filter_enable')}</span></label>
            <label class="eg-lf-toggle eg-lf-toggle-gold"><input type="checkbox" id="eg-lf-keep-unique" class="eg-lf-check"><span>${t('eg_loot_filter_keep_unique')}</span></label>
        </div>
        <div class="eg-lf-rules-zone" id="eg-lf-rules-zone">
            <div class="eg-lf-section-head"><span class="eg-lf-section-title">${t('eg_loot_filter_rules_section')}</span><span class="eg-lf-section-count" id="eg-lf-rules-count"></span><span class="eg-lf-section-line"></span></div>
            <div class="eg-lf-rules" id="eg-lf-rules"></div>
            <button class="eg-lf-add" onclick="_eglfAddRule()">+ ${t('eg_loot_filter_add_rule')}</button>
        </div>
    </div>
    <div class="eg-lf-foot">
        <div class="eg-lf-preview" id="eg-lf-preview"></div>
        <div class="eg-lf-btns">
            <button class="eg-lf-btn eg-lf-save" onclick="_eglfSaveModal()">${t('eg_mass_sell_save')}</button>
            <button class="eg-lf-btn" onclick="_eglfCloseModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) _eglfCloseModal(); });
    document.body.appendChild(modal);
    return modal;
}

// Builds one editable rule card.
export function _eglfRuleHTML(rule, idx) {
    const slotOpts = ['<option value="any"' + (rule.slot === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(_eglfSlotTypes().map(s => `<option value="${s}"${rule.slot === s ? ' selected' : ''}>${s}</option>`)).join('');
    const bases = _eglfBasesForSlot(rule.slot);
    const baseOpts = ['<option value="any"' + (rule.baseId === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(bases.map(b => `<option value="${_eglfEscapeHTML(b.id)}"${rule.baseId === b.id ? ' selected' : ''}>${_eglfEscapeHTML((LANG === 'de' && b.nameDe) ? b.nameDe : b.name)}</option>`)).join('');
    const modModeOpts = [['none', t('eg_loot_filter_mod_none')], ['has_t1', t('eg_loot_filter_mod_has_t1')], ['not_has', t('eg_loot_filter_mod_not_has')]]
        .map(([v, label]) => `<option value="${v}"${rule.modMode === v ? ' selected' : ''}>${label}</option>`).join('');
    const fams = rule.slot === 'any' ? _eglfAllModFamilies() : _eglfModFamiliesForSlot(rule.slot);
    const famOpts = ['<option value="">' + t('eg_loot_filter_any') + '</option>']
        .concat(fams.map(f => `<option value="${_eglfEscapeHTML(f.id)}"${rule.modFamily === f.id ? ' selected' : ''}>${_eglfEscapeHTML(f.label)}</option>`)).join('');
    const modFieldDim = rule.modMode === 'none' ? ' eg-lf-field-dim' : '';
    const maxT1Opts = ['<option value=""' + (rule.maxT1 == null ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat([0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${rule.maxT1 === n ? ' selected' : ''}>${n}</option>`)).join('');
    return `
<div class="eg-lf-rule${rule.enabled ? '' : ' eg-lf-rule-off'}">
    <div class="eg-lf-rule-head">
        <input type="checkbox" class="eg-lf-check" ${rule.enabled ? 'checked' : ''} onchange="_eglfSetRule(${idx}, 'enabled', this.checked)" data-tip-t="eg_loot_filter_rule_enable">
        <span class="eg-lf-rule-title">${t('eg_loot_filter_rule')} ${idx + 1}</span>
        <button class="eg-lf-rule-del" onclick="_eglfDelRule(${idx})" data-tip-t="eg_loot_filter_rule_del" aria-label="${t('eg_loot_filter_rule_del')}">✕</button>
    </div>
    <div class="eg-lf-fields">
        <div class="eg-lf-field"><label>${t('eg_loot_filter_slot')}</label><select onchange="_eglfSetRule(${idx}, 'slot', this.value)">${slotOpts}</select></div>
        <div class="eg-lf-field"><label>${t('eg_loot_filter_base')}</label><select onchange="_eglfSetRule(${idx}, 'baseId', this.value)">${baseOpts}</select></div>
        <div class="eg-lf-field"><label>${t('eg_loot_filter_max_ilvl')}</label><input type="number" min="0" max="100" step="1" value="${rule.maxIlvl}" onchange="_eglfSetRule(${idx}, 'maxIlvl', this.value)"><span class="eg-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span></div>
        <div class="eg-lf-field"><label>${t('eg_loot_filter_max_reqlvl')}</label><input type="number" min="0" max="100" step="1" value="${rule.maxReq}" onchange="_eglfSetRule(${idx}, 'maxReq', this.value)"><span class="eg-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span></div>
        <div class="eg-lf-field"><label>${t('eg_loot_filter_mod_mode')}</label><select onchange="_eglfSetRule(${idx}, 'modMode', this.value)">${modModeOpts}</select></div>
        <div class="eg-lf-field"><label>${t('eg_loot_filter_max_t1')}</label><select onchange="_eglfSetRule(${idx}, 'maxT1', this.value)">${maxT1Opts}</select></div>
        <div class="eg-lf-field${modFieldDim}"><label>${t('eg_loot_filter_mod_family')}</label><select onchange="_eglfSetRule(${idx}, 'modFamily', this.value)">${famOpts}</select></div>
    </div>
</div>`;
}

// Renders the current working rules into the editor.
export function _eglfRenderRules() {
    const wrap = document.getElementById('eg-lf-rules');
    if (!wrap || !_eglfWorking) return;
    wrap.innerHTML = _eglfWorking.rules.length === 0
        ? `<div class="eg-lf-empty"><span class="eg-lf-empty-icon">🗃</span>${t('eg_loot_filter_no_rules')}</div>`
        : _eglfWorking.rules.map((r, i) => _eglfRuleHTML(r, i)).join('');
}

// Recalculates vendor and keep counts against the uncommitted working copy.
export function _eglfUpdatePreview() {
    const preview = document.getElementById('eg-lf-preview');
    if (!preview || !_eglfWorking) return;
    let keep = 0, vendor = 0;
    if (typeof _egInventory !== 'undefined' && _egInventory) {
        for (let r = 0; r < _egInventory.length; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                const it = _egInventory[r][c];
                if (!it || it.category !== 'equip') continue;
                if (_egLootFilterShouldVendor(it, _eglfWorking)) vendor++; else keep++;
            }
        }
    }
    preview.innerHTML = t('eg_loot_filter_preview').replace('{vendor}', `<span class="eg-lf-n-vendor">${vendor}</span>`).replace('{keep}', `<span class="eg-lf-n-keep">${keep}</span>`);
}

// Rebuilds form controls from a cloned working filter.
export function _eglfRenderModalContent() {
    if (!_egLootFilter) _egLoadLootFilter();
    _eglfWorking = JSON.parse(JSON.stringify(_egLootFilter));
    const enabled = document.getElementById('eg-lf-enabled');
    const keepUnique = document.getElementById('eg-lf-keep-unique');
    if (enabled) {
        enabled.checked = !!_eglfWorking.enabled;
        enabled.onchange = () => { _eglfWorking.enabled = enabled.checked; _eglfSyncChrome(); _eglfUpdatePreview(); };
    }
    if (keepUnique) {
        keepUnique.checked = !!_eglfWorking.keepUnique;
        keepUnique.onchange = () => { _eglfWorking.keepUnique = keepUnique.checked; _eglfUpdatePreview(); };
    }
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

// Keeps editor chrome synchronized with the working filter.
export function _eglfSyncChrome() {
    if (!_eglfWorking) return;
    const box = document.getElementById('eg-lf-box');
    if (box) box.classList.toggle('eg-lf-off', !_eglfWorking.enabled);
    const count = document.getElementById('eg-lf-rules-count');
    if (count) count.textContent = `· ${_eglfWorking.rules.length}`;
}

// Reapplies translated static labels when the language changes.
export function _eglfRenderStaticText(modal) {
    const title = modal.querySelector('.eg-lf-head-title');
    if (title) title.textContent = t('eg_loot_filter_title');
    const close = modal.querySelector('.eg-lf-close');
    if (close) close.setAttribute('aria-label', t('eg_loot_filter_close'));
    const howTitle = modal.querySelector('.eg-lf-how-title');
    if (howTitle) howTitle.textContent = t('eg_loot_filter_how');
    const bullets = ['eg_loot_filter_b1', 'eg_loot_filter_b2', 'eg_loot_filter_b3'];
    modal.querySelectorAll('.eg-lf-how-li > span:last-child').forEach((el, i) => { if (bullets[i]) el.textContent = t(bullets[i]); });
    const toggleSpans = modal.querySelectorAll('.eg-lf-toggles .eg-lf-toggle > span');
    if (toggleSpans[0]) toggleSpans[0].textContent = t('eg_loot_filter_enable');
    if (toggleSpans[1]) toggleSpans[1].textContent = t('eg_loot_filter_keep_unique');
    const sectionTitle = modal.querySelector('.eg-lf-section-title');
    if (sectionTitle) sectionTitle.textContent = t('eg_loot_filter_rules_section');
    const addBtn = modal.querySelector('.eg-lf-add');
    if (addBtn) addBtn.textContent = `+ ${t('eg_loot_filter_add_rule')}`;
    const saveBtn = modal.querySelector('.eg-lf-btn.eg-lf-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.eg-lf-foot .eg-lf-btn:not(.eg-lf-save)');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
}

// Opens the editor with a fresh working copy.
export function _egOpenLootFilterModal() {
    if (!_egLootFilter) _egLoadLootFilter();
    const modal = _egEnsureLootFilterModal();
    _eglfRenderStaticText(modal);
    _eglfRenderModalContent();
    modal.classList.add('show');
}

// Closes the editor and discards its working copy.
export function _eglfCloseModal() {
    const modal = document.getElementById('eg-loot-filter-modal');
    if (modal) modal.classList.remove('show');
    _eglfWorking = null;
}

// Commits the working copy, persists it, and closes the editor.
export function _eglfSaveModal() {
    if (!_eglfWorking) return;
    globalThis._egLootFilter = _eglfNormaliseState(_eglfWorking);
    _eglfWorking = null;
    _egSaveLootFilter();
    _eglfCloseModal();
    if (typeof showToast === 'function') globalThis.showToast(t('eg_loot_filter_saved'));
}

// Applies one inline-editor field change to the working copy.
export function _eglfSetRule(idx, field, value) {
    if (!_eglfWorking || !_eglfWorking.rules[idx]) return;
    const rule = _eglfWorking.rules[idx];
    if (field === 'enabled') rule.enabled = !!value;
    else if (field === 'maxIlvl' || field === 'maxReq') {
        const n = parseInt(value, 10);
        rule[field] = (isNaN(n) || n < 0) ? 0 : Math.min(100, n);
        _eglfRenderRules();
    } else if (field === 'slot') {
        rule.slot = value || 'any';
        const bases = _eglfBasesForSlot(rule.slot);
        if (rule.baseId !== 'any' && !bases.some(b => b.id === rule.baseId)) rule.baseId = 'any';
        _eglfRenderRules();
    } else if (field === 'modMode') {
        rule.modMode = ['none', 'has_t1', 'not_has'].includes(value) ? value : 'none';
        _eglfRenderRules();
    } else if (field === 'maxT1') {
        const n = parseInt(value, 10);
        rule.maxT1 = (isNaN(n) || n < 0) ? null : Math.min(6, n);
        _eglfRenderRules();
    } else rule[field] = String(value || '');
    _eglfUpdatePreview();
}

// Adds a default enabled rule to the working copy.
export function _eglfAddRule() {
    if (!_eglfWorking) return;
    _eglfWorking.rules.push(_eglfNormaliseRule({ enabled: true }));
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

// Removes a working rule and refreshes the editor.
export function _eglfDelRule(idx) {
    if (!_eglfWorking || !_eglfWorking.rules[idx]) return;
    _eglfWorking.rules.splice(idx, 1);
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

// Closes the editor when Escape is pressed while it is visible.
window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('eg-loot-filter-modal');
    if (modal && modal.classList.contains('show')) {
        _eglfCloseModal();
        e.preventDefault();
        e.stopPropagation();
    }
});

// Renders the stash-button tooltip for the current filter state.
export function _egShowLootFilterTooltip(e) {
    if (!_egLootFilter) _egLoadLootFilter();
    const state = _egLootFilter.enabled
        ? t('eg_loot_filter_state_on').replace('{n}', String(_egLootFilter.rules.filter(r => r.enabled).length))
        : t('eg_loot_filter_state_off');
    globalThis.showGameTooltip(`
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header"><div class="eg-tt-icon">⚗</div><div class="eg-tt-name" style="color:#f5d98a;">${t('eg_loot_filter_title')}</div></div>
    <div class="eg-tt-section"><div class="eg-tt-desc">${state}</div></div>
</div>`, e);
}
