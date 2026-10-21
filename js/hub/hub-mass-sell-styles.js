//------------------------------------------------------------------------
//-------------------MASS SELL STYLES-------------------------------------
//------------------------------------------------------------------------
// Injects the stylesheet for the mass-sell modal and the stash header buttons
// (once; later calls do nothing).
//------------------------------------------------------------------------

// Adds the <style> element for the mass-sell UI to the page head.
export function _injectMassSellStyles() {
    if (document.getElementById('sx-mass-sell-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-mass-sell-styles';
    style.textContent = `
        /* ── stash header buttons ── */
        .sx-stash-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .sx-stash-actions { display: flex; gap: 6px; align-items: center; }
        .sx-stash-btn {
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            padding: 5px 10px; cursor: pointer;
            border: 1px solid var(--border2, #656f96); color: var(--accent2, #fff);
            background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)), var(--surface, #303648);
            transition: all 0.12s;
            white-space: nowrap;
        }
        .sx-stash-btn:hover { color: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1); }
        .sx-stash-btn-sell { color: var(--yellow, #f5c518); border-color: rgba(245,197,24,0.55); }
        .sx-stash-btn-sell:hover {
            box-shadow: 0 0 8px rgba(245,197,24,0.3); color: #fff;
            border-color: var(--yellow, #f5c518);
        }

        /* ── backdrop ── */
        .sx-mass-sell-modal-bg {
            display: none; position: fixed; inset: 0;
            background: rgba(5,8,14,0.78);
            backdrop-filter: blur(2px);
            z-index: 10001;
            align-items: center; justify-content: center;
        }
        .sx-mass-sell-modal-bg.show { display: flex; }

        /* ── shell: fixed header, scrollable body, pinned footer ── */
        .sx-mass-sell-box {
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
        .sx-mass-sell-confirm {
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
        .sx-ms-head {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--border, #4a5475);
            background: linear-gradient(180deg, rgba(102,252,241,0.07), rgba(102,252,241,0.02));
            flex-shrink: 0;
        }
        .sx-ms-head-icon {
            font-size: 16px; line-height: 1; color: var(--accent, #66fcf1);
            text-shadow: 0 0 8px rgba(102,252,241,0.5);
        }
        .sx-ms-head-title {
            flex: 1; min-width: 0;
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sx-ms-close {
            width: 24px; height: 24px; flex-shrink: 0;
            font-family: var(--PX, monospace); font-size: 10px; line-height: 1;
            color: var(--accent2, #fff); background: transparent;
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            cursor: pointer; transition: all 0.12s;
        }
        .sx-ms-close:hover {
            color: #ff6b6b; border-color: rgba(255,107,107,0.6);
            background: rgba(255,107,107,0.12);
        }

        /* ── scrollable body ── */
        .sx-ms-body {
            flex: 1; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
            padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            scrollbar-width: thin;
            scrollbar-color: var(--border2, #656f96) transparent;
        }
        .sx-ms-body::-webkit-scrollbar { width: 8px; }
        .sx-ms-body::-webkit-scrollbar-track { background: transparent; }
        .sx-ms-body::-webkit-scrollbar-thumb { background: var(--border2, #656f96); border-radius: 4px; }

        /* ── how-it-works ── */
        .sx-ms-how {
            border: 1px solid var(--border, #4a5475);
            border-left: 3px solid var(--accent, #66fcf1);
            border-radius: 4px;
            background: rgba(102,252,241,0.04);
            padding: 8px 10px;
        }
        .sx-ms-how-title {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 2px;
            color: var(--accent, #66fcf1); opacity: 0.9; margin-bottom: 6px;
        }
        .sx-ms-how-li {
            display: flex; gap: 7px; align-items: baseline;
            font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.45;
            color: var(--accent2, #fff); opacity: 0.88;
        }
        .sx-ms-how-li + .sx-ms-how-li { margin-top: 3px; }
        .sx-ms-how-b { color: var(--accent, #66fcf1); flex-shrink: 0; }

        /* ── section headers ── */
        .sx-ms-section-head { display: flex; align-items: center; gap: 8px; }
        .sx-ms-section-title {
            font-family: var(--PX, monospace); font-size: 8px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
        }
        .sx-ms-section-line { flex: 1; height: 1px; background: var(--border, #4a5475); opacity: 0.6; }

        /* ── rarity rows ── */
        .sx-mass-sell-rarities { display: flex; flex-direction: column; gap: 4px; }
        .sx-mass-sell-row {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border: 1px solid transparent; border-radius: 3px;
            background: transparent; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            transition: background 0.12s, border-color 0.12s;
        }
        .sx-mass-sell-row:hover { background: rgba(255,255,255,0.05); border-color: var(--rar, #888); }
        .sx-mass-sell-dot {
            width: 10px; height: 10px; border-radius: 2px; background: var(--rar);
            display: inline-block; flex-shrink: 0;
            box-shadow: 0 0 5px var(--rar);
        }
        .sx-mass-sell-rarity-name { font-weight: 700; color: var(--rar); }
        .sx-mass-sell-keep-hint {
            margin-left: auto;
            font-family: var(--F, monospace); font-size: 11px;
            opacity: 0.55; letter-spacing: 0.5px;
        }

        /* ── custom checkboxes (same look as the loot filter) ── */
        .sx-ms-check {
            appearance: none; -webkit-appearance: none;
            width: 15px; height: 15px; flex-shrink: 0; margin: 0;
            background: rgba(0,0,0,0.4);
            border: 1px solid var(--border2, #656f96); border-radius: 2px;
            cursor: pointer; position: relative;
            transition: all 0.12s;
        }
        .sx-ms-check:hover { border-color: var(--accent, #66fcf1); }
        .sx-ms-check:checked {
            background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 7px rgba(102,252,241,0.55);
        }
        .sx-ms-check:checked::after {
            content: '✓'; position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: #0c1016;
        }

        /* ── gold toggle row ── */
        .sx-ms-toggle {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            border: 1px solid transparent;
            transition: background 0.12s, border-color 0.12s;
        }
        .sx-ms-toggle:hover { background: rgba(102,252,241,0.05); border-color: var(--border, #4a5475); }
        .sx-ms-toggle-gold span { color: var(--yellow, #f5c518); }

        /* ── level filter fields ── */
        .sx-ms-level-filters { display: flex; flex-direction: column; gap: 8px; }
        .sx-ms-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .sx-ms-field > label {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 1px;
            color: var(--setup-opt-inactive, #8892a3); text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sx-ms-field input[type="number"] {
            width: 100%; box-sizing: border-box;
            font-family: var(--F, monospace); font-size: 13px;
            color: var(--accent, #66fcf1);
            background: rgba(0,0,0,0.35);
            border: 1px solid var(--border, #4a5475); border-radius: 3px;
            padding: 4px 7px;
            transition: border-color 0.12s, box-shadow 0.12s;
        }
        .sx-ms-field input[type="number"]:focus {
            outline: none; border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 6px rgba(102,252,241,0.3);
        }
        .sx-ms-zero-hint {
            font-family: var(--F, monospace); font-size: 10px; line-height: 1;
            color: var(--setup-opt-inactive, #8892a3); opacity: 0.85;
        }

        /* ── footer (pinned: preview + save/cancel always visible) ── */
        .sx-ms-foot {
            flex-shrink: 0;
            border-top: 1px solid var(--border, #4a5475);
            background: rgba(0,0,0,0.18);
            padding: 9px 14px 12px;
        }
        .sx-mass-sell-preview {
            text-align: center; min-height: 17px; margin-bottom: 8px;
            font-family: var(--F, monospace); font-size: 13px; letter-spacing: 0.5px;
            color: var(--accent2, #fff);
        }
        .sx-ms-n-keep { color: var(--green, #3ddc84); }
        .sx-ms-n-sell { color: var(--orange, #ff8c42); }
        .sx-mass-sell-btns { display: flex; gap: 10px; justify-content: center; }
        .sx-mass-sell-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            padding: 9px 20px; cursor: pointer;
            color: var(--accent2, #fff);
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            transition: all 0.12s;
        }
        .sx-mass-sell-btn:hover { border-color: var(--accent, #66fcf1); color: var(--accent, #66fcf1); }
        .sx-mass-sell-btn.sx-mass-sell-save {
            color: #0c1016; background: var(--accent, #66fcf1);
            border-color: var(--accent, #66fcf1); font-weight: 700;
        }
        .sx-mass-sell-btn.sx-mass-sell-save:hover { box-shadow: 0 0 12px rgba(102,252,241,0.5); }

        /* ── confirm view ── */
        .sx-ms-confirm-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
        .sx-mass-sell-confirm-text {
            font-family: var(--F, monospace); font-size: 13px; line-height: 1.5;
            color: var(--accent2, #fff); text-align: center;
        }
        /* Destructive action - red fill, matching the game's delete-confirm button */
        .sx-mass-sell-btn.sx-mass-sell-confirm {
            color: #fff; background: var(--red, #e74c3c);
            border-color: var(--red, #e74c3c); font-weight: 700;
        }
        .sx-mass-sell-btn.sx-mass-sell-confirm:hover {
            filter: brightness(1.1); box-shadow: 0 0 10px rgba(231,76,60,0.4);
        }

        /* ── narrow screens ── */
        @media (max-width: 500px) {
            .sx-ms-body { padding: 10px; }
            .sx-ms-foot { padding: 8px 10px 10px; }
        }
    `;
    document.head.appendChild(style);
}
