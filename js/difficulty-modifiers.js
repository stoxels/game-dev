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
const MOD_SCROLL_TEXT = {
    timetrial: 'A clock is ticking against you.',
    hardcore: 'One mistake and game over.',
    ironman: 'No retries. No mercy.',
    classless: 'All class abilities are disabled.',
    treeless: 'The passive tree is sealed shut.',
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
// the description ribbon.
function selDiff(btn) {
    curDiff = btn.dataset.diff;
    document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
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
        .map(m => MOD_SCROLL_TEXT[m])
        .filter(Boolean);

    el.textContent = activeLines.length
        ? activeLines.join(' ')
        : t('setup_no_mods');
}

// Toggles a modifier on/off from its button, updates the button's yellow
// highlight state and refreshes the active-modifiers description.
function togMod(btn) {
    const m = btn.dataset.mod;
    curMods[m] = !curMods[m];
    btn.classList.toggle('sel-yellow', curMods[m]);
    updModDesc();
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