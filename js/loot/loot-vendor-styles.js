import { _egnEnsureStyles } from '../endgame/endgame-nexus.js';

//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Injects the vendor stylesheet once, after the shared Nexus styles exist.
export function _vendorEnsureStyles() {
    // The vendor topbar reuses the Nexus topbar styles.
    _egnEnsureStyles();
    if (document.getElementById('sx-vendor-vendor-style')) return;

    const style = document.createElement('style');
    style.id = 'sx-vendor-vendor-style';
    style.textContent = `
        .sx-vendor-body {
            flex-grow: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: flex-start; gap: 14px;
            width: min(1100px, 96vw); margin: 0 auto; padding-bottom: 16px;
        }
        .sx-vendor-gold-balance {
            font-size: 16px; letter-spacing: 2px; color: #f5d98a;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 8px 26px;
        }
        /* ── Search ──────────────────────────────────────────────────── */
        .sx-vendor-search-row { width: 100%; display: flex; justify-content: center; }
        .sx-vendor-search {
            width: min(420px, 92%); box-sizing: border-box;
            font-family: var(--PX, monospace); font-size: 12px; letter-spacing: 1px;
            padding: 8px 12px; color: #f5d98a;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--border2, #444); border-radius: 6px;
            outline: none;
        }
        .sx-vendor-search:focus { border-color: var(--accent, #c8a84b); box-shadow: 0 0 8px rgba(200, 168, 75, 0.3); }
        .sx-vendor-search-title {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 3px;
            color: var(--accent, #c8a84b); margin: 10px 0 6px; padding-bottom: 4px;
            border-bottom: 1px solid rgba(200, 168, 75, 0.35);
        }
        .sx-vendor-search-section { width: 100%; }
        .sx-vendor-search-none { font-family: var(--PX, monospace); font-size: 12px; color: var(--accent2, #888); padding: 24px 0; }
        .sx-vendor-searching .sx-vendor-base-controls { display: none; }
        .sx-vendor-searching .sx-vendor-base-wrap, .sx-vendor-searching .sx-vendor-base-list { max-height: none; }
        /* ── Tabs ────────────────────────────────────────────────────── */
        .sx-vendor-tab-bar {
            display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
        }
        .sx-vendor-tab-btn {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            padding: 9px 18px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444); color: var(--accent2, #888);
            transition: all 0.12s;
        }
        .sx-vendor-tab-btn:hover {
            color: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b);
        }
        .sx-vendor-tab-btn.sx-vendor-tab-active {
            color: #f5d98a; border-color: var(--accent, #c8a84b);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25), inset 0 0 8px rgba(200,168,75,0.08);
        }
        .sx-vendor-tab-content {
            width: 100%; display: flex; flex-direction: column; align-items: center;
            max-height: 58vh; overflow-y: auto; padding-right: 4px;
        }
        .sx-vendor-base-wrap {
            display: flex; flex-direction: column; width: 100%; max-height: 58vh;
        }
        .sx-vendor-base-wrap .sx-vendor-base-list {
            overflow-y: auto; flex: 1; min-height: 0; padding-right: 4px;
        }
        .sx-vendor-tab-content:has(.sx-vendor-base-wrap) {
            overflow: hidden;
        }
        /* ── Card grid ───────────────────────────────────────────────── */
        .sx-vendor-cards {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 10px; width: 100%;
        }
        .sx-vendor-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.12);
        }
        /* Red highlight when the player cannot equip the item */
        .sx-vendor-card.sx-vendor-card-blocked {
            border-color: #c0392b;
            background: rgba(60, 10, 10, 0.55);
            box-shadow: 0 0 10px rgba(192, 57, 43, 0.25);
        }
        .sx-vendor-card-top { display: flex; gap: 10px; align-items: flex-start; }
        .sx-vendor-card-icon { font-size: 34px; line-height: 1; }
        .sx-vendor-card-icon img.sx-art-img {
            width: 44px; height: 44px; object-fit: contain;
            display: inline-block; vertical-align: middle; pointer-events: none;
        }
        .sx-vendor-card-info { flex-grow: 1; min-width: 0; }
        .sx-vendor-card-name {
            font-size: 13px; letter-spacing: 1px; color: var(--accent, #c8a84b);
            word-break: break-word;
        }
        .sx-vendor-card-sub {
            font-size: 9px; letter-spacing: 1px; color: #f5d98a;
            text-transform: uppercase; margin-top: 3px;
        }
        .sx-vendor-card-desc {
            font-size: 10px; color: var(--accent2, #ccc); line-height: 1.5; margin-top: 4px;
        }
        .sx-vendor-card-bottom {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .sx-vendor-card-blocked .sx-vendor-buy-btn { opacity: 0.45; }
        /* ── Cannot-afford highlight ─────────────────────────────────── */
        .sx-vendor-card.sx-vendor-card-cannot-afford .sx-vendor-buy-btn,
        .sx-vendor-offer-card.sx-vendor-card-cannot-afford .sx-vendor-buy-btn {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .sx-vendor-price-missing {
            font-size: 9px; letter-spacing: 1px; color: #e06055; margin-top: 3px;
        }
        /* ── Base items: filter/sort controls ────────────────────────── */
        .sx-vendor-base-controls {
            display: flex; gap: 18px; flex-wrap: wrap; justify-content: center;
            position: sticky; top: 0; z-index: 5;
            background: rgba(20, 15, 5, 0.92);
            padding: 8px 0 10px 0;
            margin-bottom: 10px;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(200,168,75,0.18);
        }
        .sx-vendor-base-control-label {
            display: flex; align-items: center; gap: 8px;
            font-size: 10px; letter-spacing: 1px; color: var(--accent2, #ccc);
        }
        .sx-vendor-base-control-label select {
            font-family: var(--PX, monospace); font-size: 11px;
            background: rgba(20, 15, 5, 0.85); color: var(--accent, #c8a84b);
            border: 1px solid var(--accent, #c8a84b); border-radius: 4px;
            padding: 5px 8px; cursor: pointer;
        }
        .sx-vendor-filter-btn {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 1px;
            background: rgba(20, 15, 5, 0.85); color: var(--accent2, #ccc);
            border: 1px solid var(--border2, #666); border-radius: 4px;
            padding: 5px 12px; cursor: pointer;
        }
        .sx-vendor-charm-filters { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 0 0 12px; }
        .sx-vendor-filter-btn-on {
            color: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b);
            background: rgba(200,168,75,0.22);
        }
        .sx-vendor-base-list { width: 100%; }
        .sx-vendor-base-list::-webkit-scrollbar { width: 10px; }
        .sx-vendor-base-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .sx-vendor-base-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .sx-vendor-base-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
        .sx-vendor-tab-content::-webkit-scrollbar { width: 10px; }
        .sx-vendor-tab-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .sx-vendor-tab-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .sx-vendor-tab-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
        /* ── Maps tab (legacy offer card look) ───────────────────────── */
        .sx-vendor-offer-card {
            width: 320px; min-height: 280px; padding: 24px;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 14px; text-align: center;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px;
            box-shadow: 0 0 18px rgba(200, 168, 75, 0.2);
        }
        .sx-vendor-offer-icon { font-size: 64px; line-height: 1; }
        .sx-vendor-offer-name {
            font-size: 15px; letter-spacing: 2px; color: var(--accent, #c8a84b);
        }
        .sx-vendor-offer-desc { font-size: 11px; color: var(--accent2, #ccc); line-height: 1.6; }
        .sx-vendor-offer-price {
            font-size: 13px; letter-spacing: 1px; color: #f5d98a;
        }
        .sx-vendor-buy-btn {
            font-family: var(--PX, monospace); font-size: 12px; letter-spacing: 2px;
            padding: 10px 22px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--accent, #c8a84b); color: var(--accent, #c8a84b);
            transition: all 0.12s;
        }
        .sx-vendor-buy-btn:hover {
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.35);
            color: #f5d98a;
        }
        .sx-vendor-buy-btn:active { transform: translateY(1px); }
        .sx-vendor-buy-btn.sx-vendor-cannot-afford {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        /* ── Spell charm cards ───────────────────────────────────────── */
        .sx-vendor-charm-ranks { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
        .sx-vendor-charm-rank {
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            font-family: var(--PX, monospace); font-size: 11px; padding: 6px 2px;
            border: 1px solid var(--border2, #444); border-radius: 5px;
            background: rgba(0,0,0,0.35); color: var(--accent2, #bbb);
        }
        .sx-vendor-charm-rank small { font-size: 9px; letter-spacing: 0; }
        .sx-vendor-charm-buy { cursor: pointer; border-color: var(--accent, #c8a84b); color: #f5d98a; transition: all 0.12s; }
        .sx-vendor-charm-buy:hover { box-shadow: 0 0 10px rgba(200,168,75,0.4); }
        .sx-vendor-charm-buy.sx-vendor-charm-short { opacity: 0.5; border-color: #8a4a3a; color: #e0a090; }
        .sx-vendor-charm-owned { border-color: #3f8f5a; color: #86e0a0; background: rgba(30,80,45,0.35); }
        .sx-vendor-charm-locked { opacity: 0.45; }
        .sx-vendor-hint {
            font-size: 10px; letter-spacing: 1px; color: rgba(232, 218, 239, 0.55);
            max-width: 520px; text-align: center; line-height: 1.6;
        }
        /* Reuse the Nexus topbar button look for back/buy buttons */
        .sx-vendor-layout .egn-topbar { margin-bottom: 0; }
        .sx-vendor-layout .egn-topbar .title-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
}
