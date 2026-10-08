import { _egnEnsureStyles } from '../endgame/endgame-nexus.js';

//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Injects the vendor stylesheet once, after the shared Nexus styles exist.
export function _egvEnsureStyles() {
    // The vendor topbar reuses the Nexus topbar styles.
    _egnEnsureStyles();
    if (document.getElementById('egv-vendor-style')) return;

    const style = document.createElement('style');
    style.id = 'egv-vendor-style';
    style.textContent = `
        .egv-body {
            flex-grow: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: flex-start; gap: 14px;
            width: min(1100px, 96vw); margin: 0 auto; padding-bottom: 16px;
        }
        .egv-gold-balance {
            font-size: 16px; letter-spacing: 2px; color: #f5d98a;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 8px 26px;
        }
        /* ── Tabs ────────────────────────────────────────────────────── */
        .egv-tab-bar {
            display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
        }
        .egv-tab-btn {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            padding: 9px 18px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444); color: var(--accent2, #888);
            transition: all 0.12s;
        }
        .egv-tab-btn:hover {
            color: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b);
        }
        .egv-tab-btn.egv-tab-active {
            color: #f5d98a; border-color: var(--accent, #c8a84b);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25), inset 0 0 8px rgba(200,168,75,0.08);
        }
        .egv-tab-content {
            width: 100%; display: flex; flex-direction: column; align-items: center;
            max-height: 58vh; overflow-y: auto; padding-right: 4px;
        }
        .egv-base-wrap {
            display: flex; flex-direction: column; width: 100%; max-height: 58vh;
        }
        .egv-base-wrap .egv-base-list {
            overflow-y: auto; flex: 1; min-height: 0; padding-right: 4px;
        }
        .egv-tab-content:has(.egv-base-wrap) {
            overflow: hidden;
        }
        /* ── Card grid ───────────────────────────────────────────────── */
        .egv-cards {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 10px; width: 100%;
        }
        .egv-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.12);
        }
        /* Red highlight when the player cannot equip the item */
        .egv-card.egv-card-blocked {
            border-color: #c0392b;
            background: rgba(60, 10, 10, 0.55);
            box-shadow: 0 0 10px rgba(192, 57, 43, 0.25);
        }
        .egv-card-top { display: flex; gap: 10px; align-items: flex-start; }
        .egv-card-icon { font-size: 34px; line-height: 1; }
        .egv-card-icon img.eg-art-img {
            width: 44px; height: 44px; object-fit: contain;
            display: inline-block; vertical-align: middle; pointer-events: none;
        }
        .egv-card-info { flex-grow: 1; min-width: 0; }
        .egv-card-name {
            font-size: 13px; letter-spacing: 1px; color: var(--accent, #c8a84b);
            word-break: break-word;
        }
        .egv-card-sub {
            font-size: 9px; letter-spacing: 1px; color: #f5d98a;
            text-transform: uppercase; margin-top: 3px;
        }
        .egv-card-desc {
            font-size: 10px; color: var(--accent2, #ccc); line-height: 1.5; margin-top: 4px;
        }
        .egv-card-bottom {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .egv-card-blocked .egv-buy-btn { opacity: 0.45; }
        /* ── Cannot-afford highlight ─────────────────────────────────── */
        .egv-card.egv-card-cannot-afford .egv-buy-btn,
        .egv-offer-card.egv-card-cannot-afford .egv-buy-btn {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .egv-price-missing {
            font-size: 9px; letter-spacing: 1px; color: #e06055; margin-top: 3px;
        }
        /* ── Base items: filter/sort controls ────────────────────────── */
        .egv-base-controls {
            display: flex; gap: 18px; flex-wrap: wrap; justify-content: center;
            position: sticky; top: 0; z-index: 5;
            background: rgba(20, 15, 5, 0.92);
            padding: 8px 0 10px 0;
            margin-bottom: 10px;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(200,168,75,0.18);
        }
        .egv-base-control-label {
            display: flex; align-items: center; gap: 8px;
            font-size: 10px; letter-spacing: 1px; color: var(--accent2, #ccc);
        }
        .egv-base-control-label select {
            font-family: var(--PX, monospace); font-size: 11px;
            background: rgba(20, 15, 5, 0.85); color: var(--accent, #c8a84b);
            border: 1px solid var(--accent, #c8a84b); border-radius: 4px;
            padding: 5px 8px; cursor: pointer;
        }
        .egv-base-list { width: 100%; }
        .egv-base-list::-webkit-scrollbar { width: 10px; }
        .egv-base-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .egv-base-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .egv-base-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
        .egv-tab-content::-webkit-scrollbar { width: 10px; }
        .egv-tab-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .egv-tab-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #656f96); border-radius: 5px;
        }
        .egv-tab-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, #7882ab);
        }
        /* ── Maps tab (legacy offer card look) ───────────────────────── */
        .egv-offer-card {
            width: 320px; min-height: 280px; padding: 24px;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 14px; text-align: center;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px;
            box-shadow: 0 0 18px rgba(200, 168, 75, 0.2);
        }
        .egv-offer-icon { font-size: 64px; line-height: 1; }
        .egv-offer-name {
            font-size: 15px; letter-spacing: 2px; color: var(--accent, #c8a84b);
        }
        .egv-offer-desc { font-size: 11px; color: var(--accent2, #ccc); line-height: 1.6; }
        .egv-offer-price {
            font-size: 13px; letter-spacing: 1px; color: #f5d98a;
        }
        .egv-buy-btn {
            font-family: var(--PX, monospace); font-size: 12px; letter-spacing: 2px;
            padding: 10px 22px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--accent, #c8a84b); color: var(--accent, #c8a84b);
            transition: all 0.12s;
        }
        .egv-buy-btn:hover {
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.35);
            color: #f5d98a;
        }
        .egv-buy-btn:active { transform: translateY(1px); }
        .egv-buy-btn.egv-cannot-afford {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .egv-hint {
            font-size: 10px; letter-spacing: 1px; color: rgba(232, 218, 239, 0.55);
            max-width: 520px; text-align: center; line-height: 1.6;
        }
        /* Reuse the Nexus topbar button look for back/buy buttons */
        .egv-layout .egn-topbar { margin-bottom: 0; }
        .egv-layout .egn-topbar .title-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
}
