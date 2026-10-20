//------------------------------------------------------------------------
//-------------------LOOT FILTER STYLES-------------------------------------
//------------------------------------------------------------------------

// Injects the loot-filter editor styles once.
export function _injectLootFilterStyles() {
    if (document.getElementById('sx-loot-filter-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-loot-filter-styles';
    style.textContent = `
        .sx-lf-modal-bg { display: none; position: fixed; inset: 0; background: rgba(5,8,14,0.78); backdrop-filter: blur(2px); z-index: 10001; align-items: center; justify-content: center; }
        .sx-lf-modal-bg.show { display: flex; }
        .sx-lf-box { display: flex; flex-direction: column; box-sizing: border-box; background: var(--panel, #222630); border: 1px solid var(--border2, #656f96); border-radius: 8px; width: min(620px, 94vw); max-height: min(700px, 92vh); box-shadow: 0 0 0 1px rgba(0,0,0,0.55), 0 0 26px rgba(102,252,241,0.10), 0 22px 48px rgba(0,0,0,0.55); overflow: hidden; }
        .sx-lf-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--border, #4a5475); background: linear-gradient(180deg, rgba(102,252,241,0.07), rgba(102,252,241,0.02)); flex-shrink: 0; }
        .sx-lf-head-icon { font-size: 17px; line-height: 1; color: var(--accent, #66fcf1); text-shadow: 0 0 8px rgba(102,252,241,0.5); }
        .sx-lf-head-title { flex: 1; min-width: 0; font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px; color: var(--accent, #66fcf1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sx-lf-close { width: 24px; height: 24px; flex-shrink: 0; font-family: var(--PX, monospace); font-size: 10px; line-height: 1; color: var(--accent2, #fff); background: transparent; border: 1px solid var(--border2, #656f96); border-radius: 4px; cursor: pointer; transition: all 0.12s; }
        .sx-lf-close:hover { color: #ff6b6b; border-color: rgba(255,107,107,0.6); background: rgba(255,107,107,0.12); }
        .sx-lf-body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: var(--border2, #656f96) transparent; }
        .sx-lf-body::-webkit-scrollbar { width: 8px; }
        .sx-lf-body::-webkit-scrollbar-track { background: transparent; }
        .sx-lf-body::-webkit-scrollbar-thumb { background: var(--border2, #656f96); border-radius: 4px; }
        .sx-lf-how { border: 1px solid var(--border, #4a5475); border-left: 3px solid var(--accent, #66fcf1); border-radius: 4px; background: rgba(102,252,241,0.04); padding: 8px 10px; }
        .sx-lf-how-title { font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 2px; color: var(--accent, #66fcf1); opacity: 0.9; margin-bottom: 6px; }
        .sx-lf-how-li { display: flex; gap: 7px; align-items: baseline; font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.45; color: var(--accent2, #fff); opacity: 0.88; }
        .sx-lf-how-li + .sx-lf-how-li { margin-top: 3px; }
        .sx-lf-how-b { color: var(--accent, #66fcf1); flex-shrink: 0; }
        .sx-lf-toggles { display: flex; flex-direction: column; gap: 2px; }
        .sx-lf-toggle { display: flex; align-items: center; gap: 9px; padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none; font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff); border: 1px solid transparent; transition: background 0.12s, border-color 0.12s; }
        .sx-lf-toggle:hover { background: rgba(102,252,241,0.05); border-color: var(--border, #4a5475); }
        .sx-lf-toggle-gold span { color: var(--yellow, #f5c518); }
        .sx-lf-check { appearance: none; -webkit-appearance: none; width: 15px; height: 15px; flex-shrink: 0; margin: 0; background: rgba(0,0,0,0.4); border: 1px solid var(--border2, #656f96); border-radius: 2px; cursor: pointer; position: relative; transition: all 0.12s; }
        .sx-lf-check:hover { border-color: var(--accent, #66fcf1); }
        .sx-lf-check:checked { background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1); box-shadow: 0 0 7px rgba(102,252,241,0.55); }
        .sx-lf-check:checked::after { content: '✓'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #0c1016; }
        .sx-lf-section-head { display: flex; align-items: center; gap: 8px; }
        .sx-lf-section-title { font-family: var(--PX, monospace); font-size: 8px; letter-spacing: 2px; color: var(--accent, #66fcf1); }
        .sx-lf-section-count { font-family: var(--F, monospace); font-size: 12px; color: var(--setup-opt-inactive, #8892a3); }
        .sx-lf-section-line { flex: 1; height: 1px; background: var(--border, #4a5475); opacity: 0.6; }
        .sx-lf-rules-zone { display: flex; flex-direction: column; gap: 8px; transition: opacity 0.15s; }
        .sx-lf-box.sx-lf-off .sx-lf-rules-zone { opacity: 0.45; }
        .sx-lf-rules { display: flex; flex-direction: column; gap: 8px; }
        .sx-lf-rule { border: 1px solid var(--border, #4a5475); border-left: 3px solid var(--accent, #66fcf1); border-radius: 4px; background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.14)); padding: 9px 10px 10px; }
        .sx-lf-rule.sx-lf-rule-off { border-left-color: var(--border2, #656f96); }
        .sx-lf-rule.sx-lf-rule-off .sx-lf-fields, .sx-lf-rule.sx-lf-rule-off .sx-lf-rule-title { opacity: 0.55; }
        .sx-lf-rule-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .sx-lf-rule-title { font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px; color: var(--accent, #66fcf1); }
        .sx-lf-rule-del { margin-left: auto; width: 20px; height: 20px; padding: 0; font-family: var(--PX, monospace); font-size: 9px; line-height: 1; color: var(--red, #f70808); opacity: 0.75; background: transparent; border: 1px solid transparent; border-radius: 3px; cursor: pointer; transition: all 0.12s; }
        .sx-lf-rule-del:hover { opacity: 1; color: #ff6b6b; border-color: rgba(255,107,107,0.55); background: rgba(255,107,107,0.12); }
        .sx-lf-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 9px; }
        .sx-lf-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .sx-lf-field > label { font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 1px; color: var(--setup-opt-inactive, #8892a3); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sx-lf-field select, .sx-lf-field input[type="number"] { width: 100%; box-sizing: border-box; min-width: 0; font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff); background: rgba(0,0,0,0.35); border: 1px solid var(--border, #4a5475); border-radius: 3px; padding: 4px 7px; transition: border-color 0.12s, box-shadow 0.12s; }
        .sx-lf-field input[type="number"] { color: var(--accent, #66fcf1); }
        .sx-lf-field select:focus, .sx-lf-field input[type="number"]:focus { outline: none; border-color: var(--accent, #66fcf1); box-shadow: 0 0 6px rgba(102,252,241,0.3); }
        .sx-lf-field-dim { opacity: 0.4; }
        .sx-lf-zero-hint { font-family: var(--F, monospace); font-size: 10px; line-height: 1; color: var(--setup-opt-inactive, #8892a3); opacity: 0.85; }
        .sx-lf-empty { border: 1px dashed var(--border2, #656f96); border-radius: 4px; padding: 14px 10px; text-align: center; font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.5; color: var(--setup-opt-inactive, #8892a3); }
        .sx-lf-empty-icon { display: block; font-size: 20px; opacity: 0.5; margin-bottom: 6px; }
        .sx-lf-add { width: 100%; cursor: pointer; font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 2px; padding: 9px; color: var(--accent, #66fcf1); background: rgba(102,252,241,0.03); border: 1px dashed var(--border2, #656f96); border-radius: 4px; transition: all 0.12s; }
        .sx-lf-add:hover { border-color: var(--accent, #66fcf1); background: rgba(102,252,241,0.08); box-shadow: 0 0 10px rgba(102,252,241,0.18); }
        .sx-lf-foot { flex-shrink: 0; border-top: 1px solid var(--border, #4a5475); background: rgba(0,0,0,0.18); padding: 9px 14px 12px; }
        .sx-lf-preview { text-align: center; min-height: 17px; margin-bottom: 8px; font-family: var(--F, monospace); font-size: 13px; letter-spacing: 0.5px; color: var(--accent2, #fff); }
        .sx-lf-n-vendor { color: var(--orange, #ff8c42); }
        .sx-lf-n-keep { color: var(--green, #3ddc84); }
        .sx-lf-btns { display: flex; gap: 10px; justify-content: center; }
        .sx-lf-btn { font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px; padding: 9px 20px; cursor: pointer; color: var(--accent2, #fff); background: rgba(255,255,255,0.05); border: 1px solid var(--border2, #656f96); border-radius: 4px; transition: all 0.12s; }
        .sx-lf-btn:hover { border-color: var(--accent, #66fcf1); color: var(--accent, #66fcf1); }
        .sx-lf-btn.sx-lf-save { color: #0c1016; background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1); font-weight: 700; }
        .sx-lf-btn.sx-lf-save:hover { box-shadow: 0 0 12px rgba(102,252,241,0.5); }
        @media (max-width: 620px) { .sx-lf-fields { grid-template-columns: 1fr; } .sx-lf-body { padding: 10px; } .sx-lf-foot { padding: 8px 10px 10px; } }
    `;
    document.head.appendChild(style);
}
