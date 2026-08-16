//------------------------------------------------------------------------
//-------------------SCREENS-HIGHSCORE.JS---------------------------------
//------------------------------------------------------------------------
// Handles everything related to the Highscore screen:
//   - sorting and preparing HS entries
//   - progress bars for world code unlocks
//   - the score table (rows, colors, mod formatting)
//   - assembling and displaying the full HS screen
//------------------------------------------------------------------------
//------------------------------------------------------------------------




//------------------------------------------------------------------------
//-------------------CONSTANTS / LOOKUP MAPS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps internal mod keys to their short display abbreviations.
const MOD_ABBR_MAP = {
    timetrial: 'TT',
    hardcore: 'HC',
    ironman: 'IM',
    classless: 'CL',
    treeless: 'TL'
};

// Maps difficulty strings to their CSS color variables.
const DIFF_COLOR_MAP = {
    easy: 'var(--green)',
    normal: 'var(--hs-row-text)',   // neutral grey — normal is intentionally understated
    hard: 'var(--red)'
};

// Maps mod abbreviations to their CSS color variables.
const MOD_COLOR_MAP = {
    TT: 'var(--orange)',
    HC: 'var(--red)',
    IM: 'var(--purple)',
    CL: 'var(--accent)',
    TL: 'var(--green)'
};




//------------------------------------------------------------------------
//-------------------ENTRY SORTING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps a raw [globalIndex, hs] entry pair into a structured object.
// lv is the full level object from ALL[], which holds .world and .li for display.
function hsEntryFromPair([gi, hs]) {
    const index = parseInt(gi);
    return {
        gi: index,
        lv: ALL[index],
        hs
    };
}

// Returns all highscore entries as structured objects, sorted by score descending.
function getHSSortedEntries() {
    return Object.entries(STATE.levelHS)
        .map(hsEntryFromPair)
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
// Falls back to accent2 if the mod abbreviation is not in the map.
function getModColor(modAbbr) {
    return MOD_COLOR_MAP[modAbbr] || 'var(--accent2)';
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
// Returns "—" if no mods are active or if the mods object is missing.
function formatModsString(mods) {
    if (!mods) return '—';

    const activeSpans = Object.keys(mods)
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
// hs — the highscore object (has .score, .diff, .mods)
function buildHSTableRow({ lv, hs }) {
    const diffLabel = getDiffLabel(hs.diff);
    const diffColor = getDiffColor(hs.diff);
    const modsHTML = formatModsString(hs.mods);

    return `<tr>
        <td style="color:var(--white)">${lv.world}-${lv.li}</td>
        <td style="color:var(--yellow)">${hs.score}</td>
        <td style="color:${diffColor}">${diffLabel}</td>
        <td>${modsHTML}</td>
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
    </tr></thead>`;
}

// Builds the table body from all sorted entries.
function buildHSTableBody(entries) {
    return `<tbody>${entries.map(buildHSTableRow).join('')}</tbody>`;
}

// Builds the full score table, or an empty-state message if there are no entries.
function buildHSTableSection(entries) {
    if (!entries.length) {
        return `<p class="hs-empty-msg">${t('no_hs')}</p>`;
    }

    return `<table class="hs-table">
        <colgroup>
            <col><col><col><col>
        </colgroup>
        ${buildHSTableHeader()}
        ${buildHSTableBody(entries)}
    </table>`;
}




//------------------------------------------------------------------------
//-------------------SCROLL-MOVER SYNC (visual only)----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Slides the stone scroll-mover thumb up/down inside its track to match
// how far the player has scrolled through #hs-body. Pure decoration —
// does not affect scrolling itself, layout, or any game state.
// Placed here (above the screen builder) since buildHS() depends on
// _initHSScrollMover() below.

// Moves the scroll-mover thumb to match the current scroll position of #hs-body.
function _updateHSScrollMoverPosition() {
    const scrollEl = document.getElementById('hs-body');
    const thumb = document.getElementById('hs-scrollbar-thumb');
    const track = document.getElementById('hs-scrollbar-track');
    if (!scrollEl || !thumb || !track) return;

    const scrollableHeight = scrollEl.scrollHeight - scrollEl.clientHeight;

    if (scrollableHeight <= 0) {
        thumb.style.top = '0px';
        return;
    }

    // ── Clamp the thumb travel to this pixel range within the track ──
    const topOffset = 40;   // ← px from top of track where thumb starts
    const bottomOffset = 120;   // ← px from bottom of track where thumb stops

    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.clientHeight;
    const maxThumbTravel = Math.max(trackHeight - thumbHeight - topOffset - bottomOffset, 0);

    const scrollPct = scrollEl.scrollTop / scrollableHeight; // 0 → 1
    thumb.style.top = (topOffset + scrollPct * maxThumbTravel) + 'px';
}

// Wires the scroll listener for the highscore scroll-mover.
// Safe to call multiple times: it removes any previous listener first
// so re-running buildHS() (e.g. on revisiting the screen) never double-binds.
function _initHSScrollMover() {
    const scrollEl = document.getElementById('hs-body');
    if (!scrollEl) return;

    scrollEl.removeEventListener('scroll', _updateHSScrollMoverPosition);
    scrollEl.addEventListener('scroll', _updateHSScrollMoverPosition);

    // Set correct initial position (e.g. resets to top on rebuild).
    _updateHSScrollMoverPosition();
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

// Gathers all data and renders the full highscore screen into #hs-body.
function buildHS() {
    const body = document.getElementById('hs-body');
    const entries = getHSSortedEntries();

    body.innerHTML = buildHSBodyHTML(entries);
    _initHSScrollMover();
}




//------------------------------------------------------------------------
//-------------------SHOW HIGHSCORE SCREEN--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and navigates to the highscore screen.
// Pushes the title screen onto history so the back button works correctly.
function showHS() {
    buildHS();
    screenHistory.push('screen-title');
    switchScreen('screen-hs');
}