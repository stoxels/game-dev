//------------------------------------------------------------------------
//-------------------BOSS TEST LIFECYCLE FACADE----------------------------
//------------------------------------------------------------------------
// Godmode state and the screen entry point remain here; configuration,
// descriptions, launch flow, and presentation live in focused siblings.

import { switchScreen } from '../screens/screens.js';
import { t } from '../translation/translations.js';
import { _bossTestBuildFullScreenHTML, _bossTestEnsureStyles, _bossTestRenderGrid } from './combat-boss-test-ui.js';

//------------------------------------------------------------------------
//-------------------GODMODE DEBUG TOGGLE----------------------------------
//------------------------------------------------------------------------
// Proper UI switch for the damage-immune debug flag window._godMode
// (honoured at the top of _playerTakeDamage). Lives in the boss-test
// settings bar, persists per browser so the state survives screen changes,
// and a fixed HUD chip shows "GODMODE ON" wherever you are - no console
// access needed. The chip also guards against accidentally leaving it on
// during a real map run.
let _bossTestGodModeOn = false;


// Applies the flag, persists it, and re-syncs every godmode UI element.
export function _bossTestApplyGodMode(on) {
    _bossTestGodModeOn = !!on;
    window._godMode = _bossTestGodModeOn;
    try { localStorage.setItem('_egbtGodMode', _bossTestGodModeOn ? '1' : '0'); } catch (e) {}
    _bossTestSyncGodModeUI();
}


// Restores the persisted state (called when the boss-test screen opens and
// once at script load, so the chip is correct even outside the screen).
export function _bossTestInitGodMode() {
    let on = false;
    try { on = localStorage.getItem('_egbtGodMode') === '1'; } catch (e) {}
    _bossTestApplyGodMode(on);
}


// Checkbox handler (inline onchange).
export function _bossTestToggleGodMode(checkbox) {
    _bossTestApplyGodMode(checkbox && checkbox.checked);
}


// Keeps every godmode UI element in sync: the settings checkbox + state
// badge on the boss-test screen, and the always-visible in-game chip.
export function _bossTestSyncGodModeUI() {
    const on = _bossTestGodModeOn;
    document.querySelectorAll('.egbt-godmode-checkbox').forEach(cb => { cb.checked = on; });
    const badge = document.getElementById('egbt-godmode-badge');
    if (badge) {
        badge.textContent = on ? t('eg_boss_test_godmode_on') : t('eg_boss_test_godmode_off');
        badge.classList.toggle('egbt-godmode-on', on);
    }
    let chip = document.getElementById('egbt-godmode-chip');
    if (on) {
        if (!chip) {
            chip = document.createElement('div');
            chip.id = 'egbt-godmode-chip';
            chip.textContent = '🛡️ ' + t('eg_boss_test_godmode_on');
            document.body.appendChild(chip);
        }
    } else if (chip) {
        chip.remove();
    }
}

//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

export function _bossTestCreateScreen() {
    _bossTestEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-boss-test';
    screen.className = 'screen';
    screen.innerHTML = _bossTestBuildFullScreenHTML();
    document.body.appendChild(screen);
}

export function ensureEndgameBossTestScreen() {
    if (!document.getElementById('screen-endgame-boss-test')) _bossTestCreateScreen();
}

// Entry point - call this to show the boss selection screen.
export function showEndgameBossTest() {
    ensureEndgameBossTestScreen();
    // Rebuild the shell so stale tier content is dropped, keeping the
    // search box for a fresh pick.
    const screen = document.getElementById('screen-endgame-boss-test');
    if (screen) {
        const keepSearch = window._bossTestSearch || '';
        screen.innerHTML = _bossTestBuildFullScreenHTML();
        const searchEl = document.getElementById('egbt-search');
        if (searchEl && keepSearch) {
            searchEl.value = keepSearch;
            window._bossTestSearch = keepSearch;
        } else {
            window._bossTestSearch = '';
        }
    }
    switchScreen('screen-endgame-boss-test');
    _bossTestRenderGrid();
    // Restore + re-apply the persisted godmode toggle (checkbox, badge, chip).
    _bossTestInitGodMode();
}


// Apply the persisted godmode flag at script load so the HUD chip is correct
// even before the boss-test screen is ever opened.
_bossTestInitGodMode();
