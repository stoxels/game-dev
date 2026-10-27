//------------------------------------------------------------------------
//-------------------HUB QUEST ITEM TAB-----------------------------------
//------------------------------------------------------------------------
// The Quest tab of the stash: one cell per story item (see
// storyline/quest-items.js). Items you do not have yet show a "?"; items you
// have show their icon and a short story text on hover. Nothing here can be
// moved, sold or used. The cell look is the Uniques tab's.
//------------------------------------------------------------------------

import { STATE } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { QUEST_ITEMS, hasQuestItem, questIconHtml, questItemCount } from '../storyline/quest-items.js';

// "found/total" for the tab button.
function _countText() {
    return `${questItemCount(STATE.questItems)}/${QUEST_ITEMS.length}`;
}

// HTML of the quest item grid: collected items with their icon, the rest as locked "?" cells.
export function _buildQuestGridHTML() {
    const de = LANG === 'de';
    return QUEST_ITEMS.map(q => {
        const have = hasQuestItem(STATE.questItems, q.id);
        const name = have ? (de ? q.nameDE : q.nameEn) : '???';
        return `<div class="sx-unique-cell ${have ? 'collected' : 'locked'}" data-quest-id="${q.id}"
            onmouseenter="_onQuestCellEnter('${q.id}', event)"
            onmousemove="_onQuestCellMove(event)"
            onmouseleave="_onQuestCellLeave()">
            <div class="sx-unique-cell-name">${name}</div>
            <div class="sx-unique-cell-icon">${have ? questIconHtml(q, 56) : '?'}</div>
        </div>`;
    }).join('');
}

// Redraws the grid, the found/total line, the progress bar and the tab count.
export function _renderQuestStash() {
    const grid = document.getElementById('sx-quest-grid');
    if (!grid) return;
    grid.innerHTML = _buildQuestGridHTML();
    const found = questItemCount(STATE.questItems);
    const cnt = document.getElementById('sx-quest-count');
    if (cnt) cnt.textContent = (t('quest_items_collected') || 'Quest items found: {found} / {total}').replace('{found}', found).replace('{total}', QUEST_ITEMS.length);
    const fill = document.getElementById('sx-quest-progress-fill');
    if (fill) fill.style.width = Math.round(found / QUEST_ITEMS.length * 100) + '%';
    const tab = document.getElementById('sx-tab-quests');
    const badge = tab && tab.querySelector('.sx-tab-count');
    if (badge) badge.textContent = _countText();
}

// Hover tooltip: the story of a collected item (and where it came from), or a hint for a locked one.
export function _onQuestCellEnter(id, e) {
    const q = QUEST_ITEMS.find(x => x.id === id);
    if (!q) return;
    const de = LANG === 'de';
    const have = hasQuestItem(STATE.questItems, id);
    const from = de ? q.fromDE : q.fromEn;
    const hint = de ? 'Wird in einem gemeinsamen Abenteuer verdient.' : 'Earned in a co-op encounter.';
    const html = have
        ? `<div class="sx-tt-frame" style="--tt-border:#7fe0b0;"><div class="sx-tt-header"><div class="sx-tt-icon">${questIconHtml(q, 40)}</div><div class="sx-tt-name" style="color:#7fe0b0;">${de ? q.nameDE : q.nameEn}</div><div class="sx-tt-rarity-line" style="color:#9fd8bd;">${de ? 'Questgegenstand' : 'Quest item'} · ${from}</div></div><div class="sx-tt-section"><div class="sx-tt-desc">${de ? q.textDE : q.textEn}</div></div></div>`
        : `<div class="sx-tt-frame" style="--tt-border:#555;"><div class="sx-tt-header"><div class="sx-tt-icon">?</div><div class="sx-tt-name" style="color:#888;">???</div><div class="sx-tt-rarity-line" style="color:#888;">${de ? 'Questgegenstand' : 'Quest item'}</div></div><div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:.7;">${hint}</div></div></div>`;
    globalThis.showGameTooltip(html, e);
}

// The tooltip follows the cursor.
export function _onQuestCellMove(e) {
    globalThis.moveGameTooltip(e);
}

// The tooltip goes away.
export function _onQuestCellLeave() {
    globalThis.hideGameTooltip();
}
