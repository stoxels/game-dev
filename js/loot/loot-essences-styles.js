//----------------------------------------------------------------------
//------------------------ESSENCE TAB STYLESHEET------------------------
//----------------------------------------------------------------------

// Adds the essence tab's CSS (cell grid, filter row, dimmed cells) to the
// page once, when the game loads.

(function _injectEssenceStyles() {
    if (document.getElementById('sx-essence-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-essence-styles';
    style.textContent = `
        /* Essence tab cells highlight while a drag hovers them */
        .sx-essence-cell.sx-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }
        /* Essence icon glow */
        .sx-item-chip.sx-rarity-essence .sx-item-chip-icon {
            filter: drop-shadow(0 0 4px #b06ae0);
        }
        /* Essence detail in tooltip */
        .sx-tt-essence-detail { padding-top: 6px; }
        .sx-tt-essence-title { color: #b59248; font-weight: 700; font-size: 0.82rem; margin-bottom: 5px; letter-spacing: 0.02em; }
        .sx-tt-essence-line { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.78rem; line-height: 1.45; padding: 3px 0; border-bottom: 1px solid rgba(181,146,72,0.08); }
        .sx-tt-essence-line:last-of-type { border-bottom: none; }
        .sx-tt-essence-slots { color: #9aa0b8; flex: 1 1 55%; min-width: 140px; white-space: normal; word-break: break-word; }
        .sx-tt-essence-mod { color: #f5d98a; font-weight: 600; white-space: normal; flex: 0 0 auto; word-break: break-word; overflow-wrap: anywhere; }
        .sx-tt-essence-mod.sx-tt-essence-random { color: #ccc; font-style: italic; font-weight: 400; }
        .sx-tt-essence-note { color: #7a7a8a; font-size: 0.70rem; line-height: 1.35; margin-top: 6px; font-style: italic; opacity: 0.9; }
        /* Empty assigned essence slot placeholder (mirrors currency) */
        .sx-essence-cell.sx-essence-assigned-empty {
            border: 1px dashed rgba(176,106,224,0.35);
            background: rgba(176,106,224,0.06);
            position: relative;
        }
        .sx-essence-cell.sx-essence-assigned-empty::after {
            content: attr(data-empty-icon);
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%,-50%);
            font-size: 1.1rem;
            opacity: 0.22;
            pointer-events: none;
        }
        .sx-essence-grid { gap: 4px; }
        .sx-essence-cell { position: relative; min-height: 38px; }
        .sx-panel-essence .sx-essence-grid { max-height: 560px; overflow-y: auto; padding-right: 4px; }
        .sx-panel-essence .sx-essence-grid::-webkit-scrollbar { width: 6px; }
        .sx-panel-essence .sx-essence-grid::-webkit-scrollbar-thumb { background: rgba(176,106,224,0.35); border-radius: 3px; }
        /* Essence filter dropdown */
        .sx-panel-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .sx-essence-filter-select {
            font-family: var(--PX);
            font-size: 12px;
            letter-spacing: 1px;
            padding: 2px 6px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--accent);
            cursor: pointer;
            min-width: 100px;
        }
        .sx-essence-filter-row { display: flex; align-items: center; gap: 6px; margin: 4px 0 6px; }
        .sx-essence-filter-input {
            font-family: var(--PX); font-size: 12px; padding: 2px 6px; min-width: 0; flex: 1 1 auto;
            background: var(--surface); border: 1px solid var(--border); color: var(--accent);
        }
        .sx-essence-filter-input.sx-essence-filter-ilvl { flex: 0 0 70px; width: 70px; }
        .sx-essence-filter-input:focus { outline: none; border-color: var(--accent); }
        .sx-essence-filter-owned { font-family: var(--PX); font-size: 12px; color: var(--accent); display: flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap; }
        .sx-essence-filter-select:hover { border-color: var(--accent2); }
        .sx-essence-filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 4px rgba(102,252,241,0.3); }
        /* Filtered-out essence cells (dimmed when filter is active) */
        .sx-essence-cell.sx-essence-filtered-out {
            opacity: 0.2;
        }
        .sx-essence-cell.sx-essence-filtered-out.sx-essence-assigned-empty {
            border-color: rgba(176,106,224,0.1);
            background: rgba(176,106,224,0.02);
        }
        .sx-essence-cell.sx-essence-filtered-out .sx-item-chip {
            opacity: 0.3;
            filter: grayscale(1);
        }
    `;
    document.head.appendChild(style);
})();
