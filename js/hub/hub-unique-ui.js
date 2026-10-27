//------------------------------------------------------------------------
//-------------------HUB UNIQUE COLLECTION UI-----------------------------
//------------------------------------------------------------------------
// The Uniques tab of the stash: tab switching, the collection grid and its
// hover / click handlers. Collection data and helpers live in hub-uniques.js.
// Most handlers are called from inline attributes in the grid HTML.
//------------------------------------------------------------------------

import { Audio_Manager } from '../audio/audio.js';
import { LANG, t } from '../translation/translations.js';
import { GAME_ART } from '../combat/combat-art.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { UNIQUE_ITEMS } from '../loot/unique-item-data.js';
import { _buildTooltipBodyHTML, _clearTooltip } from './hub-tooltips.js';
import { _ensureUniqueStash, _getUniqueCount, _isUniqueCollected, _moveUniqueToInventory, _updateUniqueTabBadge } from './hub-uniques.js';
import { _stashTab } from './hub-stash.js';
import { _renderInventory, _showStashInfo } from './hub.js';
import { _renderQuestStash } from './hub-quest-ui.js';


// Switches the stash between the Inventory and Uniques tabs.
export function _switchStashTab(tab) {
    Audio_Manager.playSFX('ui_tab_switch');
    globalThis._stashTab = (tab === 'uniques' || tab === 'quests') ? tab : 'inventory';
    const invBody = document.getElementById('sx-stash-tab-inventory');
    const uniqBody = document.getElementById('sx-stash-tab-uniques');
    const questBody = document.getElementById('sx-stash-tab-quests');
    const invTab = document.getElementById('sx-tab-inventory');
    const uniqTab = document.getElementById('sx-tab-uniques');
    const questTab = document.getElementById('sx-tab-quests');
    if (invBody) invBody.classList.toggle('active', _stashTab === 'inventory');
    if (uniqBody) uniqBody.classList.toggle('active', _stashTab === 'uniques');
    if (questBody) questBody.classList.toggle('active', _stashTab === 'quests');
    if (invTab) invTab.classList.toggle('active', _stashTab === 'inventory');
    if (uniqTab) uniqTab.classList.toggle('active', _stashTab === 'uniques');
    if (questTab) questTab.classList.toggle('active', _stashTab === 'quests');
    if (_stashTab === 'uniques') _renderUniqueStash();
    else if (_stashTab === 'quests') _renderQuestStash();
    else _renderInventory();
}

// HTML for the unique collection grid: locked '?' cells, collected cells with
// a copy count, and collected-but-empty cells.
export function _buildUniqueGridHTML() {
    if (typeof UNIQUE_ITEMS === 'undefined' || !Array.isArray(UNIQUE_ITEMS)) return '<div class="sx-unique-empty">No uniques defined</div>';
    let html = '';
    for (let i = 0; i < UNIQUE_ITEMS.length; i++) {
        const def = UNIQUE_ITEMS[i];
        const uid = def.uniqueId;
        const collected = _isUniqueCollected(uid);
        const count = _getUniqueCount(uid);
        const items = collected ? (globalThis._uniqueStash[uid] || []) : [];
        const displayName = (LANG === 'de' ? (def.nameDe || def.nameEn) : def.nameEn) || uid;
        let cellCls;
        if (!collected) cellCls = 'locked';
        else if (count === 0) cellCls = 'collected-empty';
        else cellCls = 'collected';
        const icon = collected ? (items[0] ? (items[0].icon || def.icon || '❓') : (def.icon || '❓')) : '?';
        const countBadge = count > 1 ? `<span class="sx-unique-count-badge">${t('eg_unique_count').replace('{n}', count)}</span>` : (count === 0 && collected ? `<span class="sx-unique-count-badge" style="background:#888;">0</span>` : '');
        const lockedOverlay = !collected ? '<span class="sx-unique-lock">?</span>' : '';
        html += `<div class="sx-unique-cell ${cellCls}" data-unique-id="${uid}" data-uid="${uid}" data-eg-dropzone="uniques"
            ondragover="hubDragOver(event)" ondragleave="hubDragLeave(event)"
            onmouseenter="_onUniqueCellEnter('${uid}', event)"
            onmousemove="_onUniqueCellMove('${uid}', event)"
            onmouseleave="_onUniqueCellLeave('${uid}', event)"
            oncontextmenu="_onUniqueCellRightClick(event, '${uid}')"
            onclick="_onUniqueCellClick(event, '${uid}')">
            <div class="sx-unique-cell-name">${displayName}</div>
            <div class="sx-unique-cell-icon">${GAME_ART ? GAME_ART.html('item', uid, icon) : icon}${countBadge}${lockedOverlay}</div>
        </div>`;
    }
    return html;
}

// Redraws the collection grid, the found/total line, the progress bar and the tab badge.
export function _renderUniqueStash() {
    const grid = document.getElementById('sx-unique-grid');
    if (!grid) return;
    grid.innerHTML = _buildUniqueGridHTML();
    const total = UNIQUE_ITEMS.length;
    const found = (globalThis._uniqueCollected ? globalThis._uniqueCollected.size : 0);
    const cntEl = document.getElementById('sx-unique-count');
    if (cntEl) cntEl.textContent = t('eg_uniques_collected').replace('{found}', found).replace('{total}', total);
    const fillEl = document.getElementById('sx-unique-progress-fill');
    if (fillEl) fillEl.style.width = (total ? Math.round(found / total * 100) : 0) + '%';
    _updateUniqueTabBadge();
}

// Left click does nothing; transfers happen on right click.
export function _onUniqueCellClick(e, uid) {
    // left click does nothing except ensure tooltip stays; right-click handles transfer via contextmenu
    if (e.button === 0) e.preventDefault();
}

// Right click moves one copy of the unique into the inventory.
export function _onUniqueCellRightClick(e, uid) {
    e.preventDefault();
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    if (!arr || arr.length === 0) {
        _showStashInfo(t('eg_unique_not_collected'), {type:'info'});
        return;
    }
    _clearTooltip();
    const ok = _moveUniqueToInventory(uid);
    if (ok) _renderInventory();
}

// Hover tooltip: a hint for locked / empty cells, the normal item tooltip for
// one copy, or a pinned scrollable side-by-side view when several copies exist.
export function _onUniqueCellEnter(uid, e) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    // Ensure previous multi-tip inline overrides don't leak into next tooltip
    const prevTip = document.getElementById('ghud-floating-tip');
    if (prevTip && prevTip.classList.contains('sx-unique-multi')) {
        prevTip.classList.remove('sx-unique-multi','sx-wide-tip');
        prevTip.style.maxWidth = '380px';
        prevTip.style.width = '';
        prevTip.style.maxHeight = '';
        prevTip.style.overflowY = '';
        prevTip.style.pointerEvents = 'none';
        // remove multi hover handlers if any
        prevTip.onmouseenter = null;
        prevTip.onmouseleave = null;
    }
    if (!arr || arr.length === 0) {
        const isCollected = _isUniqueCollected(uid);
        const def = (typeof UNIQUE_ITEMS !== 'undefined') ? UNIQUE_ITEMS.find(u=>u.uniqueId===uid) : null;
        const name = def ? ((LANG==='de'?def.nameDe:def.nameEn)||def.nameEn) : uid;
        const icon = def ? (def.icon || '?') : '?';
        if (isCollected) {
            const html = `<div class="sx-tt-frame" style="--tt-border:#c8a84b;"><div class="sx-tt-header"><div class="sx-tt-icon" style="opacity:0.6;">${GAME_ART ? GAME_ART.html('item', uid, icon) : icon}</div><div class="sx-tt-name" style="color:#c8a84b;">${name}</div><div class="sx-tt-rarity-line" style="color:#f5d98a;">${t('eg_unique_in_inventory') || 'Collected - in Inventory (0 remaining)'}</div></div><div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:.8;">${t('eg_unique_empty_hint') || 'All copies moved to Inventory. Drag one back or loot another.'}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
        } else {
            const html = `<div class="sx-tt-frame" style="--tt-border:#555;"><div class="sx-tt-header"><div class="sx-tt-icon">?</div><div class="sx-tt-name" style="color:#888;">${name}</div><div class="sx-tt-rarity-line" style="color:#888;">${t('eg_unique_not_collected')}</div></div><div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:.6;">${t('eg_unique_stash_hint')}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
        }
        return;
    }
    // Build multi-tooltip: container with flex row of each variant's full tooltip body
    if (arr.length === 1) {
        _showHubTooltip(arr[0], e);
        // append right-click hint
        // we could inject after, but just let normal tooltip; right-click hint via extra line handled in custom?
        // add hint via stash info? Instead append to tooltip DOM after show
        setTimeout(()=>{
            const tip=document.getElementById('ghud-floating-tip');
            if(tip && !tip.querySelector('.sx-unique-tip-hint')){
                const h=document.createElement('div');
                h.className='sx-unique-tip-hint';
                h.textContent=t('eg_unique_right_click_hint');
                h.style.cssText='margin-top:6px;padding-top:4px;border-top:1px dashed #444;font-size:9px;color:#f5d98a;text-align:center;';
                tip.appendChild(h);
            }
        },10);
        return;
    }
    // Multiple copies: build side-by-side frames – scrollable, stays open while hovering tip
    const frames = arr.map(it=>_buildTooltipBodyHTML(it)).join('');
    const header = `<div style="text-align:center;font-family:var(--PX);font-size:9px;color:#f5d98a;margin-bottom:6px;letter-spacing:1px;">${t('eg_unique_tooltip_count').replace('{n}', arr.length)} - ${t('eg_unique_right_click_hint')}</div>`;
    const html = `<div class="sx-unique-multi-tip">${header}<div class="sx-unique-multi-row">${frames}</div></div>`;
    globalThis.showGameTooltip(html, e);
    const tip=document.getElementById('ghud-floating-tip');
    if(tip){
        tip.classList.add('sx-wide-tip','sx-unique-multi');
        tip.style.maxWidth = '96vw';
        tip.style.width = 'auto';
        tip.style.maxHeight = '85vh';
        tip.style.overflowY = 'auto';
        tip.style.pointerEvents = 'auto';
        // keep tip open when mouse moves from cell onto the tip itself
        tip.onmouseenter = null;
        tip.onmouseleave = (ev) => {
            // hide when leaving the tip unless re-entering the originating cell
            const stillOverCell = document.querySelector(`.sx-unique-cell[data-uid="${uid}"]:hover`);
            if (!stillOverCell) {
                _clearTooltip();
                tip.classList.remove('sx-wide-tip','sx-unique-multi');
                tip.style.maxWidth = '380px';
                tip.style.width = '';
                tip.style.maxHeight = '';
                tip.style.overflowY = '';
                tip.style.pointerEvents = 'none';
                tip.onmouseenter = null;
                tip.onmouseleave = null;
            }
        };
        if (typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
        else if (typeof _calcGameTooltipPos === 'function') {
            const pos = globalThis._calcGameTooltipPos(e, tip.offsetWidth, tip.offsetHeight);
            tip.style.left = pos.x + 'px';
            tip.style.top = pos.y + 'px';
        }
    }
}

// Follows the cursor, except while the multi-copy tooltip is pinned.
export function _onUniqueCellMove(uid, e){
    // support both signatures: (uid, e) and (e)
    if (e === undefined) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if (tip && tip.classList.contains('sx-unique-multi')) return; // multi tip is pinned, don't follow mouse
    if(typeof moveGameTooltip==='function') globalThis.moveGameTooltip(e);
}

// Hides the tooltip; a pinned multi-copy tooltip waits so the cursor can move onto it.
export function _onUniqueCellLeave(uid, e){
    if (e === undefined && typeof uid === 'object' && uid && uid.type) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if(tip && tip.classList.contains('sx-unique-multi')) {
        // don't hide immediately – let tip's own mouseleave handle it, or delay to allow moving onto tip
        setTimeout(()=>{
            const tipNow=document.getElementById('ghud-floating-tip');
            if(!tipNow) return;
            const overTip = tipNow.matches(':hover');
            const overCell = uid ? document.querySelector(`.sx-unique-cell[data-uid="${uid}"]:hover`) : null;
            if (!overTip && !overCell) {
                _clearTooltip();
                tipNow.classList.remove('sx-wide-tip','sx-unique-multi');
                tipNow.style.maxWidth = '380px';
                tipNow.style.width = '';
                tipNow.style.maxHeight = '';
                tipNow.style.overflowY = '';
                tipNow.style.pointerEvents = 'none';
                tipNow.onmouseenter = null;
                tipNow.onmouseleave = null;
            }
        }, 80);
        return;
    }
    _clearTooltip();
    if(tip) {
        tip.classList.remove('sx-wide-tip','sx-unique-multi');
        tip.style.maxWidth = '380px';
        tip.style.width = '';
        tip.style.maxHeight = '';
        tip.style.overflowY = '';
        tip.style.pointerEvents = 'none';
        tip.onmouseenter = null;
        tip.onmouseleave = null;
    }
}
