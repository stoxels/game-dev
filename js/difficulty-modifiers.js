import { hideModal, showModal } from './screens/screens.js';
import { t } from './translation/translations.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Currently selected difficulty tier. Drives penalty timing and score mult.
export let curDiff = 'normal';

// Per-difficulty config: scoreMult applied to final score, pens = mistake
// penalty (seconds) at 1st/2nd/3rd/4th+ wrong fill.
export const DIFF_CFG = {
    easy: { scoreMult: 0.5, pens: [15, 30, 45, 60] },
    normal: { scoreMult: 1, pens: [40, 80, 120, 150] },
    hard: { scoreMult: 1.5, pens: [75, 150, 225, 300] },
};

// Currently toggled optional modifiers. Keys drive UI, scoring and gameplay
// checks below - order here also determines score-multiplier application
// order, so don't reorder without checking scoreMultiplier().
// MONSTERLESS disables all Rise of the Beasts features (monsters, combat
// bars, grid pickups, trial bosses, endgame) at x1.0 - it is intentionally
// absent from MOD_MULT below so scoreMultiplier() ignores it.
// BETA TEST ONLY: Super Tutor is temporary and will be removed after the beta period.
export let curMods = { timetrial: false, hardcore: false, ironman: false, classless: false, treeless: false, monsterless: false, superTutor: false };

// Score multiplier applied per active modifier (stacks multiplicatively).
// MONSTERLESS is deliberately missing here: disabling the Beasts expansion
// costs nothing and grants nothing (x1.0) - scoreMultiplier() only applies
// keys present in this table.
const MOD_MULT = {
    timetrial: 1.2,
    hardcore: 1.3,
    ironman: 1.15,
    classless: 1.2,   // +20% - disables all class abilities
    treeless: 1.25,  // +25% - disables all passive tree nodes
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
    monsterless: 'scr_mod_scroll_ml',
};


//------------------------------------------------------------------------
//-------------------GAME DIFFICULTY---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Refreshes the difficulty description ribbon to match curDiff.
export function updDiffDesc() {
    const el = document.getElementById('diff-desc');
    if (el) el.textContent = t('diff_desc_' + curDiff);
}

// Sets curDiff from the clicked button, updates button highlighting and
// the description ribbon. Highlighting is applied to ALL [data-diff]
// buttons on the page (setup screen + retry modal) so duplicates stay
// in sync.
export function selDiff(btn) {
    curDiff = btn.dataset.diff;
    syncDiffModButtons();
    updDiffDesc();
}


//------------------------------------------------------------------------
//-------------------GAME MODIFIERS-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Refreshes the left-page "active modifiers" scroll text with the warning
// lines for every currently-active modifier.
// Per-tombstone descriptions are handled separately by CSS
// (.sel-yellow .mod-per-desc), so this only touches the scroll text.
export function updModDesc() {
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
export function togMod(btn) {
    const m = btn.dataset.mod;
    curMods[m] = !curMods[m];
    syncDiffModButtons();
    updModDesc();
}


//------------------------------------------------------------------------
//-------------------SETUP-SCREEN FIGURE STYLES-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The two setup-screen figures (monsterless boss, super-tutor Professor)
// carry their BASE styling inline in index.html, so a stale/missed cache of
// setup-screen.css can no longer leave them as default white buttons with
// natural-size art. Their ACTIVE visuals are mirrored as inline styles here
// (red cross over the boss / yellow border on the Professor) for the same
// reason: they render even when the stylesheet never arrives.

// Self-healing copy of the base inline styles. _ensureSetupFigBaseStyles()
// re-applies anything missing, so even a stale cached page (old markup
// without the inline styles) renders the figures correctly as soon as fresh
// JS runs. Idempotent: it only fills gaps and never fights the mirror.
const SETUP_FIG_BASE = {
    '.setup-fig-monsterless': {
        btn: 'position:absolute; left:-10%; top:16%; width:190px; height:190px; z-index:6; background:transparent; border:none; padding:0; cursor:pointer; line-height:0;',
        img: 'display:block; width:170px; height:170px; object-fit:contain; pointer-events:none;',
        cross: 'position:absolute; left:0; top:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:125px; font-weight:bold; color:#e02c2c; text-shadow:0 0 18px rgba(224,44,44,0.85), 0 3px 6px rgba(0,0,0,0.7); pointer-events:none; line-height:1; opacity:0; transform:scale(0.4) rotate(-12deg); transition:opacity .15s ease, transform .25s cubic-bezier(.2,2,.4,1);',
        title: 'position:absolute; top:-46px; left:50%; transform:translateX(-50%);'
    },
    '.setup-fig-super-tutor': {
        btn: 'position:absolute; right:-10%; top:16%; width:145px; height:224px; z-index:6; background:transparent; border:none; padding:0; cursor:pointer; line-height:0;',
        img: 'display:block; width:132px; height:212px; object-fit:contain; pointer-events:none; border-radius:12px; outline:4px solid transparent; outline-offset:2px;',
        title: 'position:absolute; top:-46px; left:50%; transform:translateX(-50%);'
    }
};

// Fills in any missing base inline styles on the two setup-screen figures.
function _ensureSetupFigBaseStyles() {
    for (const sel of Object.keys(SETUP_FIG_BASE)) {
        const base = SETUP_FIG_BASE[sel];
        const btn = document.querySelector(sel);
        if (!btn) continue;
        if (!btn.style.position) btn.style.cssText += base.btn;
        const img = btn.querySelector('.setup-fig-img');
        if (img && !img.style.width) img.style.cssText += base.img;
        const cross = btn.querySelector('.setup-fig-cross');
        if (cross && !cross.style.position) cross.style.cssText += base.cross;
        const title = btn.querySelector('.setup-fig-title');
        if (title && !title.style.position) title.style.cssText += base.title;
    }
}

// Mirrors the ACTIVE state of the two figures as inline styles: the red
// cross over the boss while monsterless is on, the yellow glow around the
// Professor while Super Tutor is on.
function _mirrorSetupFigActiveStyles() {
    const mlBtn = document.querySelector('.setup-fig-monsterless');
    if (mlBtn) {
        const active = !!curMods.monsterless;
        const cross = mlBtn.querySelector('.setup-fig-cross');
        const img = mlBtn.querySelector('.setup-fig-img');
        if (cross) {
            if (!cross.style.opacity) cross.style.opacity = '0'; // hidden by default
            cross.style.opacity = active ? '1' : '0';
            cross.style.transform = active ? 'scale(1) rotate(-6deg)' : 'scale(0.4) rotate(-12deg)';
        }
        if (img) img.style.filter = active ? 'grayscale(0.55) brightness(0.75)' : '';
    }
    const stBtn = document.querySelector('.setup-fig-super-tutor');
    if (stBtn) {
        const active = !!curMods.superTutor;
        const img = stBtn.querySelector('.setup-fig-img');
        if (img) {
            img.style.outlineColor = active ? '#f5c518' : 'transparent';
            img.style.filter = active ? 'drop-shadow(0 0 14px rgba(245,197,24,0.65))' : '';
        }
    }
}

// Refreshes the .sel / .sel-yellow highlighting of every difficulty and
// modifier button on the page from the current curDiff / curMods state.
export function syncDiffModButtons() {
    _ensureSetupFigBaseStyles();
    document.querySelectorAll('[data-diff]').forEach(b =>
        b.classList.toggle('sel', b.dataset.diff === curDiff));
    document.querySelectorAll('[data-mod]').forEach(b =>
        b.classList.toggle('sel-yellow', !!curMods[b.dataset.mod]));
    _mirrorSetupFigActiveStyles();
}


//------------------------------------------------------------------------
//-------------------SCORE MULTIPLIER---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Combines the difficulty's base score multiplier with every active
// modifier's multiplier. Iterates curMods in its declared key order
// (timetrial, hardcore, ironman, classless, treeless) to keep the
// multiplication order identical to the old explicit if-chain.
// MONSTERLESS and Super Tutor have no MOD_MULT entry and pass through at x1.0.
export function scoreMultiplier() {
    const diffCfg = DIFF_CFG[curDiff] || DIFF_CFG.normal;
    let mult = Number(diffCfg.scoreMult);
    Object.keys(curMods)
        .filter(m => curMods[m] && Number.isFinite(MOD_MULT[m]))
        .forEach(m => { mult *= MOD_MULT[m]; });
    return Number.isFinite(mult) ? mult : 1;
}


//------------------------------------------------------------------------
//-------------------MODIFIER ACTIVE CHECKS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true when class abilities/passives should be fully suppressed.
export function isClassless() { return !!curMods.classless; }

// Returns true when passive tree nodes should be treated as unallocated.
export function isTreeless() { return !!curMods.treeless; }

// Returns true when all Rise of the Beasts features should be disabled:
// no monster packs, no combat bars, no grid pickups, no trial bosses,
// no endgame. Score multiplier is unaffected (x1.0).
export function isMonsterless() { return !!curMods.monsterless; }


//------------------------------------------------------------------------
//-------------------RETRY WITH OTHER DIFFICULTY / MODIFIERS----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Snapshot of the player's original difficulty/modifiers while a
// "retry with other settings" run (started from the win overlay) is in
// flight. null = no such run is currently active.
let _retrySetupOriginal = null;

// True while the player is replaying a level with settings that differ
// from their standing setup and haven't yet decided whether to keep them.
export function retrySetupIsActive() {
    return _retrySetupOriginal !== null;
}

// Writes the snapshot's difficulty/modifiers back into the live state and
// refreshes every settings-dependent UI element. Shared by the cancel and
// revert paths.
function _restoreRetrySnapshot(orig) {
    curDiff = orig.diff;
    Object.keys(curMods).forEach(m => { curMods[m] = !!orig.mods[m]; });
    syncDiffModButtons();
    updDiffDesc();
    updModDesc();
}

// Opens the "retry with new settings" modal from the win overlay.
// Snapshots the current setup once, so it can be restored later if the
// player chooses to revert after finishing/failing the retried level.
export function openRetrySetupModal() {
    if (!retrySetupIsActive()) {
        _retrySetupOriginal = { diff: curDiff, mods: { ...curMods } };
    }
    syncDiffModButtons();
    showModal('retry-setup-modal');
}

// Dismisses the setup modal WITHOUT starting the retry. Drops the
// snapshot and undoes any difficulty/modifier selections the player may
// have previewed inside the modal, so their standing setup is untouched.
export function cancelRetrySetupModal() {
    const orig = _retrySetupOriginal;
    _retrySetupOriginal = null;
    hideModal('retry-setup-modal');

    if (orig) _restoreRetrySnapshot(orig);
}

// Marks a retry-with-new-settings run as started. Called right before
// replayLevel() so the end-of-level prompt knows to appear afterwards.
export function beginRetrySetupRun() {
    if (!retrySetupIsActive()) {
        _retrySetupOriginal = { diff: curDiff, mods: { ...curMods } };
    }
}

// Resolves the keep-or-revert choice shown after completing or failing a
// retried level. keep = true leaves the newly selected difficulty/modifiers
// in place; keep = false restores the snapshot taken when the run started
// and refreshes every settings-dependent UI element.
export function retrySetupResolve(keep) {
    hideModal('retry-keep-modal');
    const orig = _retrySetupOriginal;
    _retrySetupOriginal = null;

    if (orig && !keep) _restoreRetrySnapshot(orig);
}

// Modifier key -> i18n key for the short button labels, used to render the
// keep-modal setup comparison in the active language.
const RETRY_SETUP_MOD_LABEL_KEYS = {
    timetrial: 'mod_tt',
    hardcore: 'mod_hc',
    ironman: 'mod_im',
    classless: 'mod_cl',
    treeless: 'mod_tl',
    monsterless: 'mod_ml',
    superTutor: 'mod_super_tutor',
};

// Formats one difficulty/modifier setup as a human-readable string, e.g.
// "Hard + Hardcore, Ironman" or "Normal (no modifiers)". Used for the
// keep-modal NEW vs PREVIOUS comparison so the player sees exactly what
// each choice would keep or restore.
function formatRetrySetup(diff, mods) {
    const diffLabel = t('diff_' + diff);
    const activeMods = Object.keys(mods || {})
        .filter(m => mods[m])
        .map(m => t(RETRY_SETUP_MOD_LABEL_KEYS[m] || m))
        .filter(s => s && s !== '');
    const diffName = (diffLabel && diffLabel !== 'diff_' + diff) ? diffLabel : String(diff);
    if (!activeMods.length) {
        return diffName + ' (' + t('retry_keep_none') + ')';
    }
    return diffName + ' + ' + activeMods.join(', ');
}

// Refreshes the NEW vs PREVIOUS comparison lines inside #retry-keep-modal
// from the live selection (new) and the snapshot (previous). Called right
// before the modal is shown so a mid-run language switch is also reflected.
export function updateRetryKeepModal() {
    const orig = _retrySetupOriginal;
    if (!orig) return;
    const newEl = document.getElementById('retry-keep-new');
    const prevEl = document.getElementById('retry-keep-prev');
    if (newEl) newEl.textContent = formatRetrySetup(curDiff, curMods);
    if (prevEl) prevEl.textContent = formatRetrySetup(orig.diff, orig.mods);
}

// Hides the keep-modal WITHOUT resolving the pending run, so the snapshot
// stays active. The caller is expected to replay the level immediately -
// the prompt will reappear after the next win/fail until the player finally
// picks KEEP or REVERT. This is the "try the new setup again, decide later"
// escape hatch for e.g. repeated hardcore fails.
export function retrySetupDefer() {
    hideModal('retry-keep-modal');
}
