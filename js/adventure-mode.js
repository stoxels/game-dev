/*
    ========================================================================
    ADVENTURE-MODE.JS
    ========================================================================
    Temporary development sandbox for the future main game mode.

    Scope for now: just a screen with a WASD-movable player sprite, isolated
    from the legacy world-map/avatar systems. No combat, loot, enemies, or
    stoxel interactions yet — those come in later steps.

    Movement is adapted from the WASD pattern in player_sprite.js
    (_initSimpleAvatarWASD / _setAvatarPos), but reimplemented against this
    screen's own canvas and its own element ids, so Adventure Mode never
    depends on legacy puzzle-screen DOM structure.
    ========================================================================
*/

'use strict';

// Pixels moved per WASD keypress inside the sandbox canvas.
const ADV_MOVE_STEP = 16;

// Keydown handler reference, so we can remove it cleanly when leaving the screen.
let _advWASDHandler = null;


//------------------------------------------------------------------------
//-------------------SPRITE BUILD & MOVEMENT-------------------------------
//------------------------------------------------------------------------

// Builds the player sprite element used in the sandbox.
function _advBuildSprite() {
    const sprite = document.createElement('img');
    sprite.id = 'adv-player-sprite';
    sprite.className = 'adv-player-sprite';
    sprite.src = (typeof _getPlayerCharacterImage === 'function')
        ? _getPlayerCharacterImage()
        : 'images/sprites/Stox_noclass.png';
    sprite.draggable = false;
    sprite.style.left = '50%';
    sprite.style.top = '50%';
    return sprite;
}

// Moves the sprite by (dx, dy) pixels, clamped to the canvas bounds.
function _advMoveSprite(dx, dy) {
    const canvas = document.getElementById('adv-canvas-wrap');
    const sprite = document.getElementById('adv-player-sprite');
    if (!canvas || !sprite) return;

    const maxX = canvas.clientWidth - sprite.offsetWidth;
    const maxY = canvas.clientHeight - sprite.offsetHeight;

    const curLeft = parseFloat(sprite.style.left) || 0;
    const curTop = parseFloat(sprite.style.top) || 0;

    sprite.style.left = Math.max(0, Math.min(maxX, curLeft + dx)) + 'px';
    sprite.style.top = Math.max(0, Math.min(maxY, curTop + dy)) + 'px';

    // Face the direction of travel
    if (dx !== 0) sprite.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
}

// Registers the WASD keydown listener for the sandbox.
function _advInitWASD() {
    if (_advWASDHandler) document.removeEventListener('keydown', _advWASDHandler);

    _advWASDHandler = (e) => {
        // Don't steal input from text fields or open modals
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (document.querySelector('.modal-bg.show')) return;
        if (!document.getElementById('screen-adventure').classList.contains('active')) return;

        switch (e.key) {
            case 'w': case 'W': _advMoveSprite(0, -ADV_MOVE_STEP); break;
            case 's': case 'S': _advMoveSprite(0, ADV_MOVE_STEP); break;
            case 'a': case 'A': _advMoveSprite(-ADV_MOVE_STEP, 0); break;
            case 'd': case 'D': _advMoveSprite(ADV_MOVE_STEP, 0); break;
            default: return;
        }
    };

    document.addEventListener('keydown', _advWASDHandler);
}

// Removes the WASD listener (call when leaving the screen, to avoid leaks).
function _advTeardownWASD() {
    if (_advWASDHandler) {
        document.removeEventListener('keydown', _advWASDHandler);
        _advWASDHandler = null;
    }
}


//------------------------------------------------------------------------
//-------------------ENTRY POINT-------------------------------------------
//------------------------------------------------------------------------

// Builds (or rebuilds) the sandbox canvas and shows the Adventure Mode screen.
function showAdventureMode() {
    const wrap = document.getElementById('adv-canvas-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';
    wrap.appendChild(_advBuildSprite());

    _advInitWASD();

    switchScreen('screen-adventure');
}