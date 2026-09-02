//------------------------------------------------------------------------
//-------------------SCREENS-HIGHSCORE.JS---------------------------------
//------------------------------------------------------------------------
// Handles everything related to the Highscore screen:
//   - aggregating the best HS per level across ALL save slots
//   - sorting and preparing HS entries
//   - the score table (rows, colors, mod formatting)
//   - the decorative-but-interactive scroll-mover on the right edge
//   - assembling and displaying the full HS screen
//------------------------------------------------------------------------
//------------------------------------------------------------------------




//------------------------------------------------------------------------
//-------------------CONSTANTS / LOOKUP MAPS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps internal mod keys to their short display abbreviations.
// NOTE: superTutor is deliberately absent — it is a temporary beta-testing
// cheat mode that contributes nothing to scoring, so it must never appear
// in the highscore table (see HS_SCORED_MODS below).
const MOD_ABBR_MAP = {
    timetrial: 'TT',
    hardcore: 'HC',
    ironman: 'IM',
    classless: 'CL',
    treeless: 'TL'
};

// The mod keys that legitimately contribute to a score. Only these are ever
// displayed in the table — anything else found in a saved mods object
// (e.g. the temporary superTutor beta cheat flag) is filtered out.
const HS_SCORED_MODS = ['timetrial', 'hardcore', 'ironman', 'classless', 'treeless'];

// Current slot filter for the Highscore table: 0 = all slots combined,
// 1..SAVE_SLOT_COUNT = that single slot only. Reset to 0 (all) every time
// the screen opens; changing it just re-renders the table.
let hsSlotFilter = 0;

// Maps difficulty strings to CSS color variables.
// The vars are defined (parchment-friendly, darkened) in highscore.css and
// fall back to the global bright screen colors if that sheet is missing.
const DIFF_COLOR_MAP = {
    easy: 'var(--hs-diff-easy, var(--green))',
    normal: 'var(--hs-diff-normal, var(--hs-row-text))',   // neutral — normal is intentionally understated
    hard: 'var(--hs-diff-hard, var(--red))'
};

// Maps mod abbreviations to CSS color variables (same fallback pattern).
const MOD_COLOR_MAP = {
    TT: 'var(--hs-mod-tt, var(--orange))',
    HC: 'var(--hs-mod-hc, var(--red))',
    IM: 'var(--hs-mod-im, var(--purple))',
    CL: 'var(--hs-mod-cl, var(--accent))',
    TL: 'var(--hs-mod-tl, var(--green))'
};




//------------------------------------------------------------------------
//-------------------ENTRY SORTING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Reads one save slot's raw levelHS map without touching the active STATE.
// Returns null for empty or structurally invalid slots so corrupt or very
// old save data can never break the whole table.
function getSlotLevelHS(slotNum) {
    const raw = loadRawSaveFromSlot(slotNum);
    if (!raw) return null;
    const hs = raw.levelHS;
    if (!hs || typeof hs !== 'object' || Array.isArray(hs)) return null;
    return hs;
}

// Builds the best-per-level highscore map for a SINGLE save slot.
// Returns {} for empty or structurally invalid slots so a corrupt save
// can never break the whole table.
function buildSlotHighscores(slotNum) {
    const slotHS = getSlotLevelHS(slotNum);
    if (!slotHS) return {};

    const best = {};
    for (const gi of Object.keys(slotHS)) {
        const hs = slotHS[gi];
        if (!hs || !Number.isFinite(Number(hs.score))) continue;
        best[gi] = {
            score: Number(hs.score),
            diff: hs.diff,
            mods: hs.mods,
            slot: slotNum
        };
    }
    return best;
}

// Aggregates the all-time best highscore for every level across ALL save
// slots (SAVE_SLOT_COUNT in state.js). For each level the winning entry —
// the highest score, wherever it was achieved — keeps its own difficulty,
// its own modifiers and the slot number it was set in.
function buildCrossSlotHighscores() {
    const best = {};
    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
        const slotBest = buildSlotHighscores(slot);
        for (const gi of Object.keys(slotBest)) {
            if (!best[gi] || slotBest[gi].score > best[gi].score) {
                best[gi] = slotBest[gi];
            }
        }
    }
    return best;
}

// Returns one entry per level, sorted by score descending, honoring the
// current hsSlotFilter: all-slot bests or a single slot's records.
function getHSSortedEntries() {
    const source = hsSlotFilter === 0 ? buildCrossSlotHighscores() : buildSlotHighscores(hsSlotFilter);
    return Object.entries(source)
        .map(([gi, hs]) => ({ gi: Number(gi), lv: ALL[Number(gi)], hs }))
        .filter(entry => entry.lv)   // drop records for levels that no longer exist
        .sort((a, b) => b.hs.score - a.hs.score);
}




//------------------------------------------------------------------------
//-------------------TABLE ROW HELPERS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the CSS color variable for a given difficulty string.
// Falls back to the neutral row text color if the difficulty is unknown/unset.
function getDiffColor(diff) {
    return DIFF_COLOR_MAP[diff] || 'var(--hs-row-text)';
}

// Returns the CSS color variable for a given mod abbreviation.
// Falls back to the neutral row text color if the mod abbreviation is not in the map.
function getModColor(modAbbr) {
    return MOD_COLOR_MAP[modAbbr] || 'var(--hs-row-text)';
}

// Converts a single mod key to its colored <span> element.
function buildModSpan(modKey) {
    const abbr = MOD_ABBR_MAP[modKey] || modKey.slice(0, 2).toUpperCase();
    return `<span style="color:${getModColor(abbr)}">${abbr}</span>`;
}

// The separator placed between mod spans (e.g. TT+HC).
function buildModSeparator() {
    return `<span style="color:var(--hs-row-text)">+</span>`;
}

// Converts a mods object into a string of colored <span> elements joined by "+".
// Only scored modifiers (HS_SCORED_MODS) are shown — a saved mods object can
// still carry the temporary superTutor beta flag, which never contributed to
// scoring and must not appear in the table.
// Returns "—" if no scored mods are active or if the mods object is missing.
function formatModsString(mods) {
    if (!mods) return '—';

    const activeSpans = HS_SCORED_MODS
        .filter(m => mods[m])
        .map(buildModSpan);

    return activeSpans.length
        ? activeSpans.join(buildModSeparator())
        : '—';
}

// Resolves the display label for a difficulty value, or "—" if not set.
function getDiffLabel(diff) {
    return diff ? t('diff_' + diff) : '—';
}




//------------------------------------------------------------------------
//-------------------TABLE ROW MAIN BUILD---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for a single row in the highscore table.
// lv — the level object (has .world and .li)
// hs — the cross-slot best highscore (has .score, .diff, .mods, .slot)
function buildHSTableRow({ lv, hs }) {
    const diffLabel = getDiffLabel(hs.diff);
    const diffColor = getDiffColor(hs.diff);
    const modsHTML = formatModsString(hs.mods);

    return `<tr>
        <td>${lv.world}-${lv.li}</td>
        <td style="color:var(--hs-score, var(--yellow))">${hs.score}</td>
        <td style="color:${diffColor}">${diffLabel}</td>
        <td>${modsHTML}</td>
        <td style="color:var(--hs-slot-text, var(--hs-row-text))">${hs.slot}</td>
    </tr>`;
}




//------------------------------------------------------------------------
//-------------------HIGHSCORE TABLE MAIN BUILD---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the table header row using localized column labels.
function buildHSTableHeader() {
    return `<thead><tr>
        <th>${t('hs_level')}</th>
        <th>${t('hs_best')}</th>
        <th>${t('hs_diff')}</th>
        <th>${t('hs_mods')}</th>
        <th>${t('hs_slot')}</th>
    </tr></thead>`;
}

// Builds the table body from all sorted entries.
function buildHSTableBody(entries) {
    return `<tbody>${entries.map(buildHSTableRow).join('')}</tbody>`;
}

// Builds the full score table, or an empty-state message if there are no entries.
function buildHSTableSection(entries) {
    if (!entries.length) {
        const msg = hsSlotFilter === 0
            ? t('no_hs')
            : t('hs_filter_empty').replace('{n}', hsSlotFilter);
        return `<p class="hs-empty-msg">${msg}</p>`;
    }

    return `<table class="hs-table">
        <colgroup>
            <col><col><col><col><col>
        </colgroup>
        ${buildHSTableHeader()}
        ${buildHSTableBody(entries)}
    </table>`;
}




//------------------------------------------------------------------------
//-------------------SCROLL-MOVER SYNC------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Slides the stone scroll-mover thumb up/down inside its track to match
// how far the player has scrolled through #hs-body. The track is also
// interactive: dragging the thumb, grabbing the rail or wheeling over it
// scrolls the table (see _initHSScrollMover below).
// Placed here (above the screen builder) since buildHS() depends on
// _initHSScrollMover() below.

// Moves the scroll-mover thumb to match the current scroll position of #hs-body.
// All geometry is derived from the track/thumb's live sizes (no hard-coded
// pixel offsets), so it stays correct at every viewport size.
function _updateHSScrollMoverPosition() {
    const scrollEl = document.getElementById('hs-body');
    const thumb = document.getElementById('hs-scrollbar-thumb');
    const track = document.getElementById('hs-scrollbar-track');
    if (!scrollEl || !thumb || !track) return;

    const scrollableHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.offsetHeight;

    if (scrollableHeight <= 0 || trackHeight <= 0) {
        thumb.style.top = '0px';
        return;
    }

    // Small proportional insets keep the thumb inside the carved rail.
    const topInset = trackHeight * 0.04;
    const maxThumbTravel = Math.max(trackHeight - thumbHeight - topInset * 2, 0);

    const scrollPct = Math.min(Math.max(scrollEl.scrollTop / scrollableHeight, 0), 1); // 0 → 1
    thumb.style.top = (topInset + scrollPct * maxThumbTravel) + 'px';
}

// Scrolls #hs-body so the thumb center lands on the given pointer position —
// the inverse of _updateHSScrollMoverPosition(), used by drag/click.
function _hsScrollFromPointer(scrollEl, track, thumb, clientY) {
    const scrollable = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (scrollable <= 0) return;

    const rect = track.getBoundingClientRect();
    const topInset = rect.height * 0.04;
    const maxThumbTravel = Math.max(rect.height - thumb.offsetHeight - topInset * 2, 0);
    if (maxThumbTravel <= 0) return;

    const y = clientY - rect.top - thumb.offsetHeight / 2 - topInset;
    const pct = Math.min(Math.max(y / maxThumbTravel, 0), 1);
    scrollEl.scrollTop = pct * scrollable;
}

// Wires up the highscore scroll-mover.
//   - #hs-body scroll events move the thumb (re-bound safely on rebuilds)
//   - the track itself is interactive once: dragging the thumb, click/drag
//     anywhere on the rail and mouse-wheel all scroll the table
// Safe to call multiple times: the scroll listener is removed before re-adding
// and the track handlers are bound only once (guarded via a dataset flag).
function _initHSScrollMover() {
    const scrollEl = document.getElementById('hs-body');
    const track = document.getElementById('hs-scrollbar-track');
    const thumb = document.getElementById('hs-scrollbar-thumb');
    if (!scrollEl || !track || !thumb) return;

    scrollEl.removeEventListener('scroll', _updateHSScrollMoverPosition);
    scrollEl.addEventListener('scroll', _updateHSScrollMoverPosition);

    if (!track.dataset.hsMoverBound) {
        track.dataset.hsMoverBound = '1';

        // Drag the thumb (or just grab the rail anywhere) to scroll.
        let dragging = false;
        track.addEventListener('pointerdown', (e) => {
            dragging = true;
            thumb.style.transition = 'none';   // no lag while dragging
            try { track.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
            _hsScrollFromPointer(scrollEl, track, thumb, e.clientY);
        });
        track.addEventListener('pointermove', (e) => {
            if (dragging) _hsScrollFromPointer(scrollEl, track, thumb, e.clientY);
        });
        const endDrag = (e) => {
            dragging = false;
            thumb.style.transition = '';
            try {
                if (e.pointerId !== undefined && track.hasPointerCapture(e.pointerId)) {
                    track.releasePointerCapture(e.pointerId);
                }
            } catch { /* pointer already gone */ }
        };
        track.addEventListener('pointerup', endDrag);
        track.addEventListener('pointercancel', endDrag);

        // Wheel over the rail scrolls the table like a real scrollbar.
        track.addEventListener('wheel', (e) => {
            e.preventDefault();
            scrollEl.scrollTop += e.deltaY;
        }, { passive: false });
    }

    // Set correct initial position (e.g. resets to top on rebuild).
    _updateHSScrollMoverPosition();
}




//------------------------------------------------------------------------
//-------------------SLOT FILTER------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// A chip row (ALL + slots 1..20) lets the player view every slot's records
// combined or break them down by the slot that set them. The chip row is
// authored in #hs-slot-filter (the scroll container) + #hs-slot-filter-row
// (the centered, max-content strip of chips) in index.html.

// Rebuilds the chip row to reflect the current hsSlotFilter selection.
function buildHSSlotFilter() {
    const row = document.getElementById('hs-slot-filter-row');
    if (!row) return;
    row.innerHTML = '';

    const makeChip = (slot, label) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hs-slot-chip' + (hsSlotFilter === slot ? ' active' : '');
        chip.dataset.slot = String(slot);
        chip.textContent = label;
        return chip;
    };

    row.appendChild(makeChip(0, t('hs_all_slots')));
    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
        row.appendChild(makeChip(slot, String(slot)));
    }
}

// Wires the chip row to re-render the table on selection.
// Bound once (guarded via a dataset flag) so re-running buildHS() never
// stacks duplicate listeners. Uses event delegation so chips built later
// by buildHSSlotFilter() are handled without rebinding.
function _initHSSlotFilter() {
    const bar = document.getElementById('hs-slot-filter');
    if (!bar || bar.dataset.hsFilterBound) return;
    bar.dataset.hsFilterBound = '1';

    bar.addEventListener('click', (e) => {
        const chip = e.target.closest('.hs-slot-chip');
        if (!chip) return;
        const slot = parseInt(chip.dataset.slot, 10);
        if (Number.isNaN(slot) || slot < 0 || slot > SAVE_SLOT_COUNT) return;
        hsSlotFilter = slot;
        buildHS();   // re-reads hsSlotFilter, rebuilds table + scroll-mover
    });
}




//------------------------------------------------------------------------
//-------------------FULL HIGHSCORE SCREEN BUILD--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Assembles the complete inner HTML for the highscore screen body.
// Total score and code progress bars live on the Codes screen instead.
function buildHSBodyHTML(entries) {
    return buildHSTableSection(entries);
}

// Gathers all data and renders the full highscore screen into #hs-body
// (chip row, table, scroll-mover) using the current hsSlotFilter.
function buildHS() {
    const body = document.getElementById('hs-body');

    buildHSSlotFilter();
    const entries = getHSSortedEntries();

    body.innerHTML = buildHSBodyHTML(entries);
    _initHSScrollMover();
    _initHSSlotFilter();
}




//------------------------------------------------------------------------
//-------------------SHOW HIGHSCORE SCREEN--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and navigates to the highscore screen.
// Pushes the title screen onto history so the back button works correctly.
// The slot filter resets to All each time the screen is opened.
function showHS() {
    hsSlotFilter = 0;   // default view: best across every slot
    buildHS();
    screenHistory.push('screen-title');
    switchScreen('screen-hs');
}