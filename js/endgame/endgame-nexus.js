'use strict';

//========================================================================
//=  ENDGAME NEXUS OF WORLDS — PARENT SCREEN                             =
//========================================================================
//=  Central hub screen for the endgame system. Reached from the mode    =
//=  select screen ("Endgame Test") and from all "Return to Nexus"       =
//=  flows. Contains exactly three doors:                                =
//=                                                                      =
//=    1. Endgame Test Maps        -> showEndgameTestHub()               =
//=       (endgame-testing-screen.js)                                    =
//=    2. Character Sheet & Inventory -> showEndgameHub()                =
//=       (endgame-hub.js)                                               =
//=    3. Probability Gate         -> showEndgameGate()                  =
//=       (endgame-gate.js)                                              =
//=                                                                      =
//=  All three child screens navigate BACK to this screen, so the Nexus  =
//=  is the single anchor of the endgame screen cluster.                 =
//=                                                                      =
//=  Public API:                                                         =
//=    showEndgameNexus() — creates the screen on first call and         =
//=                         switches to it.                              =
//========================================================================

//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button and Nexus title.
function _egnBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="title-btn back-btn" onclick="goToPreviousScreen()">${t('btn_back')}</button>
    <span class="egn-topbar-title">${t('eg_nexus_title')}</span>
</div>`;
}

// Builds one large "door" card of the Nexus.
function _egnBuildDoorHTML(icon, labelKey, onclick) {
    return `
<div class="egn-door" onclick="${onclick}">
    <div class="egn-door-icon">${icon}</div>
    <div class="egn-door-label">${t(labelKey)}</div>
</div>`;
}

// Assembles the complete Nexus screen layout:
// topbar → row with the three endgame doors.
function _egnBuildFullScreenHTML() {
    return `
<div class="egn-hub-layout">
    ${_egnBuildTopbarHTML()}
    <div class="egn-doors">
        ${_egnBuildDoorHTML('🧪', 'egt_title', 'showEndgameTestHub()')}
        ${_egnBuildDoorHTML('🧙', 'eg_char_sheet_title', 'showEndgameHub()')}
        ${_egnBuildDoorHTML('🎲', 'mg_gate_badge', 'showEndgameGate()')}
        ${_egnBuildDoorHTML('🗺️', 'eg_atlas_title', 'showEndgameAtlas()')}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
// Injected via JS, same pattern as _egtEnsureStyles() in
// endgame-testing-screen.js — avoids needing to touch the (large) main CSS file.

function _egnEnsureStyles() {
    if (document.getElementById('egn-nexus-style')) return;

    const style = document.createElement('style');
    style.id = 'egn-nexus-style';
    style.textContent = `
        .egn-hub-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 16px; box-sizing: border-box; font-family: var(--PX, monospace);
            color: var(--accent2, #e8daef);
        }
        .egn-topbar {
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 24px; gap: 10px; position: relative;
        }
        .egn-topbar-title {
            font-size: 18px; letter-spacing: 3px; color: var(--accent, #c8a84b);
        }
        .egn-topbar .back-btn { position: absolute; left: 0; }
        .egn-doors {
            flex-grow: 1; display: flex; align-items: center; justify-content: center;
            gap: 28px; flex-wrap: wrap; overflow-y: auto;
        }
        .egn-door {
            width: 220px; min-height: 180px; padding: 22px 16px; cursor: pointer;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 14px; text-align: center;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .egn-door:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 18px rgba(200, 168, 75, 0.35);
        }
        .egn-door-icon { font-size: 44px; }
        .egn-door-label {
            font-size: 12px; letter-spacing: 1px; color: var(--accent, #c8a84b);
            line-height: 1.5;
        }
        .egn-topbar .title-btn {
            font-family: var(--PX, monospace);
            font-size: 10px;
            letter-spacing: 1px;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444);
            color: var(--accent2, #ccc);
            padding: 8px 16px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.12s;
        }
        .egn-topbar .title-btn:hover {
            border-color: var(--accent, #c8a84b);
            color: var(--accent, #c8a84b);
            background: linear-gradient(180deg, rgba(200,168,75,0.12), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25);
        }
        .egn-topbar .title-btn:active {
            transform: translateY(1px);
            box-shadow: none;
        }
     `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egnCreateScreen() {
    _egnEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-nexus';
    screen.className = 'screen';
    screen.innerHTML = _egnBuildFullScreenHTML();
    document.body.appendChild(screen);
}

function ensureEndgameNexusScreen() {
    if (!document.getElementById('screen-endgame-nexus')) _egnCreateScreen();
}

// Entry point — call this to show the Nexus of Worlds screen.
// (History push to 'screen-mode-select' happens in launchEndgameTestMode()
// in screens.js on entry from the mode select screen.)
function showEndgameNexus() {
    ensureEndgameNexusScreen();
    switchScreen('screen-endgame-nexus');
}
