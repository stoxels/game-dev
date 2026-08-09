//------------------------------------------------------------------------
//-------------------TRANSLATIONS-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Handles language selection and applying translated strings to the UI.
// The translation dictionary T is expected to be defined externally
// (e.g. translations-data.js or inline below this block).
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
let LANG = 'en';


//------------------------------------------------------------------------
//-------------------HELPER FUNCTIONS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the translation dictionary for the currently active language.
// Falls back to English if the active language has no entry in T.
function getActiveDictionary() {
    return T[LANG] || T.en;
}

// Resolves a translation key to its string value.
// Falls back to English if the key is missing in the active language.
// Falls back to the key itself as a last resort so missing translations are visible.
function t(key) {
    return getActiveDictionary()[key] || key;
}

// Updates the visual highlight on language selector buttons to reflect the active language.
function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn =>
        btn.classList.toggle('active', btn.textContent === lang.toUpperCase())
    );
}

// Finds all elements marked with data-t and writes their translated string into innerHTML.
// Skips elements where the translation key has no match, to avoid overwriting fallback content.
function applyTranslationsToDOM() {
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        const value = t(key);
        if (value && value !== key) {
            el.innerHTML = value;
        }
    });
}


//------------------------------------------------------------------------
//-------------------LANGUAGE SWITCHING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Switches the active language and refreshes all translated UI elements.
// Called when the player clicks a language button on the title screen.
function setLang(lang) {
    LANG = lang;
    updateLangButtons(lang);
    applyTranslationsToDOM();
}