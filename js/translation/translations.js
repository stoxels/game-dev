// Phase 3 step 2: REAL ES MODULE (tools/module-manifest.json) - imports the
// dictionary T from translations-strings.js; exports the translation API
// (t, LANG, setLang, ...) as entry-scope bindings for the concatenated core.
import { T } from './translations-strings.js';
//------------------------------------------------------------------------
//-------------------TRANSLATIONS-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Handles language selection and applying translated strings to the UI.
//
// Usage:
//   t('key')          → returns the translated string for the active language
//   setLang('de')     → switches active language and refreshes all UI text
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Default language on startup. Updated when the player clicks EN/DE on the title screen.
export let LANG = 'en';


//------------------------------------------------------------------------
//-------------------HELPER FUNCTIONS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the translation dictionary for the currently active language.
// Falls back to English if the active language has no entry in T.
export function getActiveDictionary() {
    return T[LANG] || T.en;
}

// Resolves a translation key to its string value.
// Falls back to English if the key is missing in the active language.
// Falls back to the key itself as a last resort so missing translations are visible.
export function t(key) {
    return getActiveDictionary()[key] || key;
}

// Updates the visual highlight on language selector buttons to reflect the active language.
export function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn =>
        btn.classList.toggle('active', btn.textContent === lang.toUpperCase())
    );
}

// Finds all elements marked with data-t and writes their translated string into innerHTML.
// Skips elements where the translation key has no match, to avoid overwriting fallback content.

// Title-screen buttons show text WITHOUT the leading emoji/icon glyphs that the
// shared translation strings carry (btn_settings etc. are also used by the pause
// menu, which keeps its icons). Anything before the first letter/digit is stripped
// for labels inside .title-overlay-btn - also the shared fallback strings.
export function stripTitleButtonIcon(html) {
    return html.replace(/^\s*[^\p{L}\p{N}]+/u, '');
}

export function applyTranslationsToDOM() {
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        const value = t(key);
        if (value && value !== key) {
            el.innerHTML = value;
        }
    });
    // Re-fill {k*} keybind placeholders (How-To-Play CONTROLS etc.) with
    // the player's current bindings for the newly active language.
    // core binding: late/probe-style call kept safe via the globalThis bridge
    if (typeof globalThis.tutUpdateKeybinds === 'function') globalThis.tutUpdateKeybinds();
    // Title labels render without their icon glyphs (see stripTitleButtonIcon).
    document.querySelectorAll('.title-overlay-btn .btn-label').forEach(el => {
        el.innerHTML = stripTitleButtonIcon(el.innerHTML);
    });
}


//------------------------------------------------------------------------
//-------------------LANGUAGE SWITCHING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Swaps the title/boot expansion logo image to match the active language
// (English vs. German "Rise of the Beasts" artwork). Called on every
// language switch, including the boot-time setLang in main.js.
export function updateTitleExpansionLogos(lang) {
    const src = lang === 'de'
        ? 'images/Title_Screen/RiseOfTheBeasts_GermanLogo.webp'
        : 'images/Title_Screen/RiseOfTheBeasts_EnglishLogo.webp';
    const alt = lang === 'de' ? 'Aufstieg der Bestien' : 'Rise of the Beasts';
    ['title-expansion-logo', 'boot-expansion-logo'].forEach(id => {
        const img = document.getElementById(id);
        if (img && img.getAttribute('src') !== src) {
            img.setAttribute('src', src);
            img.setAttribute('alt', alt);
        }
    });
}

// Switches the active language and refreshes all translated UI elements.
// Called when the player clicks a language button on the title screen.
export function setLang(lang) {
    LANG = lang;
    updateLangButtons(lang);
    applyTranslationsToDOM();
    updateTitleExpansionLogos(lang);
}