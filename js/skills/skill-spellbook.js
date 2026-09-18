import { t } from '../translation/translations.js';
import { hideHUDTooltip } from '../classes/class-hud.js';
import { CHARM_SLOT_COUNT, initCharmPanelInteractions, renderSpellbookCharmPanel } from './skill-charms.js';
import { _isGameScreenActive, renderSkillHotbar, setHotbarAboveModal } from './skill-hotbar.js';
import { getSkillDef } from './skill-registry.js';
import { UNIVERSAL_SPELL_MAP, isUniversalMovementSpell, isUniversalSupportSpell } from './universal-spells.js';
import { STATE } from '../state.js';
// skill-spellbook.js
//------------------------------------------------------------------------
//-----------------------------SPELL BOOK---------------------------------
//------------------------------------------------------------------------
// Overlay for the two-step spell loadout: the charm inventory (found in the
// world) on the left, the 10 spell slots on the right. Slotting a charm
// unlocks its spell directly on the matching hotbar slot (spell slot N =
// hotbar key N) - there is no separate spell list and no drag-to-hotbar
// step. Passives (Variance Shield, Momentum, …) and traits are always-on
// and live outside the book (class HUD / level-select tooltips).
//
// Open/close: the 'spellbook' keybind (default P), the pause-menu button,
// or the close button. Escape closes it through the shared modal machinery
// in main.js. When opened while paused, the pause overlay is tucked away
// (game stays paused) and restored on close.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------DOM CONTAINER--------------------------------
//------------------------------------------------------------------------

// Returns the spell book overlay, creating it on first use.
export function _ensureSpellbookOverlay() {
    let overlay = document.getElementById('spellbook-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'spellbook-overlay';
    overlay.className = 'modal-bg spellbook-bg';
    overlay.innerHTML = `
        <div class="modal-box spellbook-box">
            <button class="modal-close" id="btn-spellbook-close">${t('reset_close')}</button>
            <div class="spellbook-plaque">
                <span class="spellbook-plaque-text">${t('spellbook_title')}</span>
            </div>
            <div class="spellbook-frame-body">
                <div class="spellbook-body">
                    <aside class="spellbook-page sb-page-charms" id="spellbook-charms"></aside>
                    <div class="spellbook-page sb-page-slots" id="spellbook-slots"></div>
                </div>
                <div class="spellbook-footer" id="spellbook-footer"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-spellbook-close')
        .addEventListener('click', closeSpellbook);
    // Charm drag & drop / shift-click interactions (js/skills/skill-charms.js).
    if (typeof initCharmPanelInteractions === 'function') initCharmPanelInteractions(overlay);
    // Clicking the dimmed backdrop (but not the box) closes the book.
    overlay.addEventListener('pointerdown', (e) => {
        if (e.target === overlay) closeSpellbook();
    });

    return overlay;
}


//------------------------------------------------------------------------
//-----------------------------STATE--------------------------------------
//------------------------------------------------------------------------

// True while the spell book overlay is visible.
export function isSpellbookOpen() {
    return !!document.getElementById('spellbook-overlay')?.classList.contains('show');
}

// True while the book itself is the reason the game is paused, so closing it
// can hand control back (see openSpellbook / closeSpellbook).
export let _spellbookAutoPaused = false;

// True when the book was opened from the pause menu, so closing it brings the
// pause menu back. A SILENT engine pause (tutorial lesson, chain interstitial)
// must not pop the pause screen open when the book closes.
export let _spellbookOpenedFromPauseMenu = false;

// Opens the spell book (rendering fresh contents).
export function openSpellbook() {
    // Pre-class characters cast universal charm spells (found in the world),
    // so the book opens for them too - it then shows the slotted universals
    // plus the charm inventory/slots panel. Class/ascendency sections are
    // simply empty until a class is chosen. (The tutorial's puzzle 3 used to
    // be the only classless exception - Fireball before any class.)
    if (typeof STATE === 'undefined' || !STATE) return;
    const tqActive = (typeof globalThis._tqIsTutorialActive === 'function') && globalThis._tqIsTutorialActive();
    const overlay = _ensureSpellbookOverlay();
    renderSpellbook();
    overlay.classList.add('show');
    // Opening the book pauses the game (spec) - but only when a level is
    // actually on screen. On the overworld screens (map view, world detail,
    // level select) there is nothing to pause, and running the pause dance
    // there would be actively harmful: closeSpellbook() → unpauseGame() →
    // resumeTimer() → startTimer() would spin up the puzzle countdown while
    // the player is standing on the map. It also keeps the pause overlay
    // from flickering over the map.
    const inLiveLevel = (typeof _isGameScreenActive === 'function') ? _isGameScreenActive() : true;
    // If the player was ALREADY paused (opened from the pause menu, or the
    // tutorial's silent pause), that pause is left alone and closing restores
    // the previous state.
    if (!tqActive && inLiveLevel) {
        const pauseElNow = document.getElementById('pause-overlay');
        const pauseMenuShown = !!(pauseElNow && pauseElNow.classList.contains('show'));
        const wasPaused = (typeof globalThis._gamePaused !== 'undefined') && globalThis._gamePaused === true;
        if (!wasPaused && typeof globalThis.pauseGame === 'function') {
            try { globalThis.pauseGame(); } catch (e) { /* pause is best-effort */ }
        }
        _spellbookAutoPaused = !wasPaused && (typeof globalThis._gamePaused !== 'undefined') && globalThis._gamePaused === true;
        _spellbookOpenedFromPauseMenu = wasPaused && pauseMenuShown;
    } else {
        // The tutorial owns its own silent pause - never touch it here. Same
        // for the overworld: no level, no pause to take and hand back.
        _spellbookAutoPaused = false;
        _spellbookOpenedFromPauseMenu = false;
    }
    // If the book was opened from the pause menu (or via P while paused),
    // tuck the pause overlay away while the book is up. The game STAYS
    // paused (_gamePaused untouched, timer stopped) - closeSpellbook()
    // brings the pause menu back. This keeps the book fully interactable
    // without depending on overlay z-index battles.
    const pauseEl = document.getElementById('pause-overlay');
    if (pauseEl && pauseEl.classList.contains('show')) pauseEl.classList.remove('show');
    // Lift the hotbar above the modal backdrop (and out of the game screen's
    // stacking context) so the player can see which hotbar key each spell
    // slot casts from while slotting charms (see setHotbarAboveModal +
    // css/skills.css).
    document.body.classList.add('spellbook-open');
    // Tutorial: also lift the Professor + his pointer line above the book so
    // the assignment stays visible while dragging (css/tutorial.css).
    document.body.classList.add('tq-spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(true);
    // Re-render the bar now that it has left the game screen's stacking
    // context: on the overworld screens it was hidden by the previous render
    // and has to come back as a drag target.
    _refreshHotbarForSpellbook();
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}

// Re-evaluates the hotbar's visibility for the book's open/closed state.
// Safe to call anywhere: renderSkillHotbar() no-ops when the bar should be
// hidden and the host element does not exist yet.
export function _refreshHotbarForSpellbook() {
    if (typeof renderSkillHotbar !== 'function') return;
    try { renderSkillHotbar(); } catch (e) { /* bar is best-effort */ }
}

// Closes the spell book and any floating tooltip.
export function closeSpellbook() {
    const overlay = document.getElementById('spellbook-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('spellbook-open');
    document.body.classList.remove('tq-spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(false);
    // Back home (or hidden again when the book was opened off the game
    // screen and the player has nothing to cast at yet).
    _refreshHotbarForSpellbook();
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
    // If the book itself paused the game, hand control right back.
    if (_spellbookAutoPaused) {
        _spellbookAutoPaused = false;
        _spellbookOpenedFromPauseMenu = false;
        if (typeof globalThis.unpauseGame === 'function') { try { globalThis.unpauseGame(); } catch (e) { /* best-effort */ } }
        return;
    }
    // Otherwise: if the book was opened FROM the pause menu, bring the pause
    // overlay back so the player lands on the pause screen. A silent engine
    // pause (tutorial lesson, chain interstitial) leaves the UI untouched.
    const restorePauseMenu = _spellbookOpenedFromPauseMenu;
    _spellbookOpenedFromPauseMenu = false;
    try {
        if (restorePauseMenu && typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) {
            const pauseEl = document.getElementById('pause-overlay');
            if (pauseEl && !pauseEl.classList.contains('show')) pauseEl.classList.add('show');
        }
    } catch { /* _gamePaused unavailable - nothing to restore */ }
}

// Toggles the spell book.
export function toggleSpellbook() {
    if (isSpellbookOpen()) closeSpellbook();
    else openSpellbook();
}


//------------------------------------------------------------------------
//---------------------------RENDERING------------------------------------
//------------------------------------------------------------------------

// Carved gold section header, shared by every panel in the book: the spell
// slots row, each spell group and the charm panel. Art: the gold banner from
// images/Spellbook/spellbook_category_header.webp (same asset the book's
// title plaque wears).
export function buildSpellbookHeadHTML(title, sub) {
    return `<div class="sb3-head">`
        + `<span class="sb3-head-text">${title}</span>`
        + `</div>`
        + (sub ? `<div class="sb3-head-sub">${sub}</div>` : '');
}

// SCHOOL GLOW - charm inventory rows and spell slots carry their element as
// data-school so the CSS element glow keys off it (see
// css/spellbook-redesign.css). (The old right-side spell list with its stone
// builders is gone: slotting a charm now places its spell on the matching
// hotbar slot directly, so there is nothing left to curate or sort here.
// Passives and traits are always-on and live outside the book - class HUD /
// level-select tooltips.)
//
// SPELLBOOK_SCHOOL_ORDER is the canonical school set (elemental first,
// physical last). Themes are read defensively: universal-spells.js loads
// after the registry in some load orders.
export const SPELLBOOK_SCHOOL_ORDER = ['fire', 'frost', 'lightning', 'nature', 'holy', 'shadow', 'arcane', 'physical'];

// The offensive school of a universal spell id, or null when the spell is
// not an offensive universal (support / movement live in their own sections;
// class / ascendency / heartbloom keep their ownership groups).
export function _sbSpellSchool(skillId) {
    if (typeof UNIVERSAL_SPELL_MAP === 'undefined' || !UNIVERSAL_SPELL_MAP[skillId]) return null;
    const spell = UNIVERSAL_SPELL_MAP[skillId];
    if (typeof isUniversalSupportSpell === 'function' && isUniversalSupportSpell(spell)) return null;
    if (typeof isUniversalMovementSpell === 'function' && isUniversalMovementSpell(spell)) return null;
    if (SPELLBOOK_SCHOOL_ORDER.indexOf(spell.theme) !== -1) return spell.theme;
    // Blade / arrow arts are physical weapon schools, not arcane.
    return (spell.theme === 'blade' || spell.theme === 'arrow') ? 'physical' : 'arcane';
}

// Element/school of a skill for the stone glow. Universal spells read their
// damageKind (design key: fire/cold/lightning/...), class + ascendency skills
// fall back to the class colour as data-school so the glow follows the class.
export function _sbSpellSchoolKey(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    if (typeof UNIVERSAL_SPELL_MAP !== 'undefined' && UNIVERSAL_SPELL_MAP[skillId]) {
        const spell = UNIVERSAL_SPELL_MAP[skillId];
        if (spell.damageKind) return spell.damageKind;
        const school = _sbSpellSchool(skillId);
        if (school) return school;
    }
    if (def.slotKind === 'base1' || def.slotKind === 'base2') return STATE.playerClass || '';
    if (def.slotKind === 'asc1' || def.slotKind === 'asc2') return STATE.playerAscendency || '';
    return '';
}

// Rebuilds the spell book: the charm inventory / currency panel plus the
// spell slot grid (both in skill-charms.js), and the footer meter showing
// how full the spell slots are. Slotting a charm places its spell on the
// matching hotbar slot, so there is no spell list to render here.
export function renderSpellbook() {
    if (typeof STATE === 'undefined' || !STATE) return;

    // Spell slot grid + charm inventory / currency (skill-charms.js).
    if (typeof renderSpellbookCharmPanel === 'function') renderSpellbookCharmPanel();

    // Footer: how full the spell slots currently are, so the player can see
    // at a glance whether there is room left. (The hotbar mirrors the slots
    // 1:1, so a second hotbar meter would always read the same.)
    const footer = document.getElementById('spellbook-footer');
    if (footer) {
        const charmSlots = Array.isArray(STATE.charmSlots) ? STATE.charmSlots : [];
        const charmUsed = charmSlots.filter(Boolean).length;
        const charmTotal = (typeof CHARM_SLOT_COUNT === 'number') ? CHARM_SLOT_COUNT : 10;
        const slotPct = charmTotal ? Math.round(100 * charmUsed / charmTotal) : 0;
        footer.innerHTML = `<div class="sb3-meter">`
            + `<span class="sb3-meter-label">${t('charm_slots_title')} ${charmUsed} / ${charmTotal}</span>`
            + `<div class="sb3-meter-track"><div class="sb3-meter-fill is-cyan" style="width:${slotPct}%"></div></div>`
            + `</div>`;
    }
}
