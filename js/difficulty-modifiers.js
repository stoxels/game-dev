//------------------------------------------------------------------------
//----------------------CONSTANTS & STATE----------------------------------
//------------------------------------------------------------------------

// Currently selected difficulty tier. Drives penalty timing and score mult.
let curDiff = 'normal';

// Per-difficulty config: scoreMult applied to final score, pens = mistake
// penalty (seconds) at 1st/2nd/3rd/4th+ wrong fill.
const DIFF_CFG = {
    easy: { scoreMult: 0.5, pens: [15, 30, 45, 60] },
    normal: { scoreMult: 1, pens: [40, 80, 120, 150] },
    hard: { scoreMult: 1.5, pens: [75, 150, 225, 300] },
};

// Currently toggled optional modifiers. Keys drive UI, scoring and gameplay
// checks below — order here also determines score-multiplier application
// order, so don't reorder without checking scoreMultiplier().
let curMods = { timetrial: false, hardcore: false, ironman: false, classless: false, treeless: false };

// Score multiplier applied per active modifier (stacks multiplicatively).
const MOD_MULT = {
    timetrial: 1.2,
    hardcore: 1.3,
    ironman: 1.15,
    classless: 1.2,   // +20% — disables all class abilities
    treeless: 1.25,  // +25% — disables all passive tree nodes
};

// Short, plain-language warning text shown on the left-page scroll for
// each modifier when it's toggled on. Keyed by the same .dataset.mod value
// used everywhere else (timetrial, hardcore, ironman, classless, treeless).
// Values are i18n keys resolved through t() at render time (see updModDesc),
// so a language switch is always reflected.
const MOD_SCROLL_TEXT_KEYS = {
    timetrial: 'scr_mod_scroll_tt',
    hardcore: 'scr_mod_scroll_hc',
    ironman: 'scr_mod_scroll_im',
    classless: 'scr_mod_scroll_cl',
    treeless: 'scr_mod_scroll_tl',
};


//------------------------------------------------------------------------
//----------------------GAME DIFFICULTY-----------------------------------
//------------------------------------------------------------------------

// Refreshes the difficulty description ribbon to match curDiff.
function updDiffDesc() {
    const el = document.getElementById('diff-desc');
    if (el) el.textContent = t('diff_desc_' + curDiff);
}

// Sets curDiff from the clicked button, updates button highlighting and
// the description ribbon. Highlighting is applied to ALL [data-diff]
// buttons on the page (setup screen + retry modal) so duplicates stay
// in sync.
function selDiff(btn) {
    curDiff = btn.dataset.diff;
    syncDiffModButtons();
    updDiffDesc();
}


//------------------------------------------------------------------------
//------------------------GAME MODIFIERS----------------------------------
//------------------------------------------------------------------------

// Refreshes the left-page "active modifiers" scroll text with the warning
// lines for every currently-active modifier.
// Per-tombstone descriptions are handled separately by CSS
// (.sel-yellow .mod-per-desc), so this only touches the scroll text.
function updModDesc() {
    const el = document.getElementById('active-mods-text');
    if (!el) return;

    const activeLines = Object.keys(curMods)
        .filter(m => curMods[m])
        .map(m => t(MOD_SCROLL_TEXT_KEYS[m]))
        .filter(Boolean);

    el.textContent = activeLines.length
        ? activeLines.join(' ')
        : t('mod_desc_none');
}

// Toggles a modifier on/off from its button, updates the yellow highlight
// state of every matching [data-mod] button (setup screen + retry modal)
// and refreshes the active-modifiers description.
function togMod(btn) {
    const m = btn.dataset.mod;
    curMods[m] = !curMods[m];
    syncDiffModButtons();
    updModDesc();
}

// Refreshes the .sel / .sel-yellow highlighting of every difficulty and
// modifier button on the page from the current curDiff / curMods state.
function syncDiffModButtons() {
    document.querySelectorAll('[data-diff]').forEach(b =>
        b.classList.toggle('sel', b.dataset.diff === curDiff));
    document.querySelectorAll('[data-mod]').forEach(b =>
        b.classList.toggle('sel-yellow', !!curMods[b.dataset.mod]));
}


//------------------------------------------------------------------------
//-----------------SCORE MULTIPLIERS FOR GAME MODIFIERS-------------------
//------------------------------------------------------------------------

// Combines the difficulty's base score multiplier with every active
// modifier's multiplier. Iterates curMods in its declared key order
// (timetrial, hardcore, ironman, classless, treeless) to keep the
// multiplication order identical to the old explicit if-chain.
function scoreMultiplier() {
    let mult = DIFF_CFG[curDiff].scoreMult;
    Object.keys(curMods)
        .filter(m => curMods[m])
        .forEach(m => { mult *= MOD_MULT[m]; });
    return mult;
}


//------------------------------------------------------------------------
//------------------MODIFIER ACTIVE CHECKS -------------------------------
//------------------------------------------------------------------------

// Returns true when class abilities/passives should be fully suppressed.
function isClassless() { return !!curMods.classless; }

// Returns true when passive tree nodes should be treated as unallocated.
function isTreeless() { return !!curMods.treeless; }


//------------------------------------------------------------------------
//----------RETRY WITH OTHER DIFFICULTY / MODIFIERS-----------------------
//------------------------------------------------------------------------

// Snapshot of the player's original difficulty/modifiers while a
// "retry with other settings" run (started from the win overlay) is in
// flight. null = no such run is currently active.
let _retrySetupOriginal = null;

// True while the player is replaying a level with settings that differ
// from their standing setup and haven't yet decided whether to keep them.
function retrySetupIsActive() {
    return _retrySetupOriginal !== null;
}

// Opens the "retry with new settings" modal from the win overlay.
// Snapshots the current setup once, so it can be restored later if the
// player chooses to revert after finishing/failing the retried level.
function openRetrySetupModal() {
    if (!retrySetupIsActive()) {
        _retrySetupOriginal = { diff: curDiff, mods: { ...curMods } };
    }
    syncDiffModButtons();
    showModal('retry-setup-modal');
}

// Dismisses the setup modal WITHOUT starting the retry. Drops the
// snapshot and undoes any difficulty/modifier selections the player may
// have previewed inside the modal, so their standing setup is untouched.
function cancelRetrySetupModal() {
    const orig = _retrySetupOriginal;
    _retrySetupOriginal = null;
    hideModal('retry-setup-modal');

    if (orig) {
        curDiff = orig.diff;
        Object.keys(curMods).forEach(m => { curMods[m] = !!orig.mods[m]; });
        syncDiffModButtons();
        updDiffDesc();
        updModDesc();
    }
}

// Marks a retry-with-new-settings run as started. Called right before
// replayLevel() so the end-of-level prompt knows to appear afterwards.
function beginRetrySetupRun() {
    if (!retrySetupIsActive()) {
        _retrySetupOriginal = { diff: curDiff, mods: { ...curMods } };
    }
}

// Resolves the keep-or-revert choice shown after completing or failing a
// retried level. keep = true leaves the newly selected difficulty/modifiers
// in place; keep = false restores the snapshot taken when the run started
// and refreshes every settings-dependent UI element.
function retrySetupResolve(keep) {
    hideModal('retry-keep-modal');
    const orig = _retrySetupOriginal;
    _retrySetupOriginal = null;

    if (orig && !keep) {
        curDiff = orig.diff;
        Object.keys(curMods).forEach(m => { curMods[m] = !!orig.mods[m]; });
        syncDiffModButtons();
        updDiffDesc();
        updModDesc();
    }
}