//------------------------------------------------------------------------
//-------------------IMAGE LOOKUP-----------------------------------------
//------------------------------------------------------------------------

// Maps character id + class/ascendency id → image path.
// Falls back to the no-class portrait if no class is selected.
function _getPlayerCharacterImage() {
    const char = (STATE && STATE.playerCharacter) ? STATE.playerCharacter : 'stox';

    // Ascendency takes priority over base class
    const classKey = (STATE && STATE.playerAscendency)
        ? STATE.playerAscendency
        : (STATE && STATE.playerClass ? STATE.playerClass : 'noclass');

    // Expected filenames: e.g. images/sprites/Stox_statistician.png
    // No-class fallback: images/sprites/Stox_noclass.png
    const charCap = char.charAt(0).toUpperCase() + char.slice(1);
    return `images/sprites/${charCap}_${classKey}.png`;
}


// Returns the display name of the currently selected character.
function _getAvatarCharacterName() {
    const names = { stox: 'STOX', trix: 'TRIX', syla: 'SYLA' };
    return names[STATE?.playerCharacter] || 'STOX';
}

function _getAvatarCharacterColor() {
    const colors = {
        stox: '#4fc3f7',
        trix: '#ce93d8',
        syla: '#66bb6a',
    };
    return colors[STATE?.playerCharacter] || '#ffffff';
}

// Returns true if the given character id is currently selected.
// Shared helper for all character-trait checks across the codebase.
function _charIs(id) {
    return STATE?.playerCharacter === id;
}


//------------------------------------------------------------------------
//-------------------SIMPLE IN-GAME AVATAR (non-monster levels)-----------
//------------------------------------------------------------------------

// Renders a small WASD-controlled sprite in the top-left of the game meta bar.
// No HP or charge bars — those are monster-level only.
function _renderPlayerAvatarSimple() {
    if (typeof dead !== 'undefined' && dead) {
        const _hideSimple = document.getElementById('player-avatar-simple');
        if (_hideSimple) _hideSimple.style.display = 'none';
        return;
    }
    if (typeof _egIsActive === 'function' && _egIsActive()) return; // monster levels use full avatar
    // Remove the full endgame avatar if switching from a monster level
    const full = document.getElementById('player-avatar-wrapper');
    if (full) full.remove();

    const withCompanions = _hasCompanions();
    const existing = document.getElementById('player-avatar-simple');

    if (existing) {
        // If companion visibility has changed since this wrapper was built
        // (e.g. the player just picked/un-picked the Random Walker ascendency),
        // the layout needs to be rebuilt from scratch rather than patched.
        const existingHasCompanions = !!existing.querySelector('#avatar-companion-drifter');

        if (existingHasCompanions !== withCompanions) {
            existing.remove();
        } else {
            const img = existing.querySelector('#avatar-sprite-img-simple');
            if (img) img.src = _getPlayerCharacterImage();

            const nameLabel = existing.querySelector('#avatar-simple-drag-handle');
            if (nameLabel) {
                nameLabel.textContent = _getAvatarCharacterName();
                nameLabel.style.color = _getAvatarCharacterColor();
            }

            // Companions don't change image, but re-run facing so order stays correct
            _updateAvatarFacing(existing);
            return;
        }
    }

    const wrapperWidth = withCompanions ? '328px' : '72px';

    const wrapper = document.createElement('div');
    wrapper.id = 'player-avatar-simple';
    wrapper.style.cssText = `
        position: fixed;
        top: 15px;
        left: 250px;
        z-index: 500;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: ${wrapperWidth};
        cursor: default;
        user-select: none;
    `;

    wrapper.innerHTML = `
        <div id="avatar-simple-drag-handle" style="
            width: 100%;
            text-align: center;
            font-size: 15px;
            letter-spacing: 1px;
            color: ${_getAvatarCharacterColor()};
            cursor: default;
            padding: 2px 0 4px;
            font-family: monospace;
        ">${_getAvatarCharacterName()}</div>
        <div class="avatar-sprite-row" style="
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            gap: 4px;
        ">
            ${withCompanions ? `<img
                src="images/sprites/companion_drifter.png"
                id="avatar-companion-drifter"
                style="width: 80px; height: 80px; object-fit: contain; pointer-events: none;"
                draggable="false"
            />` : ''}
            <img
                src="${_getPlayerCharacterImage()}"
                id="avatar-sprite-img-simple"
                style="width: 128px; height: 128px; object-fit: contain; pointer-events: none;"
                draggable="false"
            />
            ${withCompanions ? `<img
                src="images/sprites/companion_browney.png"
                id="avatar-companion-brownian"
                style="width: 112px; height: 112px; object-fit: contain; pointer-events: none;"
                draggable="false"
            />` : ''}
        </div>
    `;

    document.body.appendChild(wrapper);
    _initSimpleAvatarWASD(wrapper);
    _updateAvatarFacing(wrapper);
}

// Removes the simple avatar (called when entering a monster level).
function _removePlayerAvatarSimple() {
    const simple = document.getElementById('player-avatar-simple');
    if (simple) simple.remove();
    // Clean up WASD listeners
    _removeSimpleAvatarWasdListeners();
    if (typeof hideCharacterBanter === 'function') hideCharacterBanter();
}

// Refreshes the sprite image on the simple avatar (e.g. after class selection).
function _updateAvatarSimpleImage() {
    const img = document.getElementById('avatar-sprite-img-simple');
    if (img) img.src = _getPlayerCharacterImage();
    const imgFull = document.getElementById('avatar-sprite-img');
    if (imgFull) imgFull.src = _getPlayerCharacterImage();
}


//------------------------------------------------------------------------
//-------------------WASD MOVEMENT----------------------------------------
//------------------------------------------------------------------------

// --- Shared held-key movement -------------------------------------------
// The old handlers moved the sprite once per physical keydown event, so the
// OS key-repeat delay (~500 ms) had to elapse before continuous movement
// started. Instead we track which keys are currently held and move the
// sprite every animation frame, so it reacts instantly and smoothly.

// Held-key movement. Keys come from the persisted keybind map
// (js/keybinds.js, actions move-up/down/left/right, WASD by default) so
// player rebindings take effect here too.
const AVATAR_MOVE_SPEED_PX_PER_SEC = 320;

// Boots movement-speed modifier (PoE-style). Reads live gear via
// _egComputePlayerStats().movementSpeedPct which is only rolled on
// boots (10–35%). Outside endgame or with no boots equipped this
// stays at 1.0×.
function _avatarGetMoveSpeed() {
    let base = AVATAR_MOVE_SPEED_PX_PER_SEC;
    try {
        if (typeof _egComputePlayerStats === 'function') {
            const pct = _egComputePlayerStats().movementSpeedPct || 0;
            if (pct) base *= (1 + pct / 100);
        }
    } catch (e) {}
    // The Snail's broom: sweeping slows the player to a crawl so the Doom
    // Snail can catch up while a slimed cell is being cleaned (see
    // boss-snail.js — EG_SNAIL_BROOM_SPEED_MULT lives on window).
    if (typeof _egSnailBroomHeld === 'function' && _egSnailBroomHeld()) {
        base *= (typeof window.EG_SNAIL_BROOM_SPEED_MULT === 'number')
            ? window.EG_SNAIL_BROOM_SPEED_MULT : 0.10;
    }
    return base;
}

const _avatarMoveState = {
    held: new Set(),
    elId: null,
    rafId: null,
    lastTs: 0,
};

function _avatarMoveUiBlocked() {
    const tag = document.activeElement ? document.activeElement.tagName : null;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || !!document.querySelector('.modal-bg.show')) return true;
    // The Clock's Time Freeze locks the avatar in place for the whole window.
    if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) return true;
    if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) return true;
    if (typeof _egPlayerHasAilment === 'function' && _egPlayerHasAilment('frozen')) return true;
    return false;
}

function _avatarMoveTick(ts) {
    _avatarMoveState.rafId = null;
    if (!_avatarMoveState.held.size || !_avatarMoveState.elId) return;

    const el = document.getElementById(_avatarMoveState.elId);
    if (!el) return;

    const dt = Math.min((ts - _avatarMoveState.lastTs) / 1000, 0.05);
    _avatarMoveState.lastTs = ts;

    if (!_avatarMoveUiBlocked()) {
        let dx = 0;
        let dy = 0;
        // Direction from the persisted keybind map (defaults: WASD).
        const held = _avatarMoveState.held;
        if (held.has(keybindKeyFor('move-up') ?? 'w')) dy -= 1;
        if (held.has(keybindKeyFor('move-down') ?? 's')) dy += 1;
        if (held.has(keybindKeyFor('move-left') ?? 'a')) dx -= 1;
        if (held.has(keybindKeyFor('move-right') ?? 'd')) dx += 1;

        if (dx || dy) {
            const dist = _avatarGetMoveSpeed() * dt;
            const norm = Math.hypot(dx, dy);   // keeps diagonal speed equal
            // Float accumulator (per element) so very slow speeds — e.g. The
            // Snail's broom at ~10% — still move: a sub-pixel per-frame step
            // would otherwise be truncated away by re-parsing the integer
            // style position every frame, locking the avatar in place.
            let fx = parseFloat(el.dataset.avatarFx);
            let fy = parseFloat(el.dataset.avatarFy);
            if (!isFinite(fx)) fx = parseInt(el.style.left) || 12;
            if (!isFinite(fy)) fy = parseInt(el.style.top) ||
                (el.id === 'player-avatar-wrapper' ? window.innerHeight - 220 : 80);
            // Teleports / nudges / knockbacks write style.left/top directly —
            // reseed the accumulator when the rendered position diverges.
            const curX = parseFloat(el.style.left);
            const curY = parseFloat(el.style.top);
            if (isFinite(curX) && Math.abs(curX - fx) > 2) fx = curX;
            if (isFinite(curY) && Math.abs(curY - fy) > 2) fy = curY;
            fx += (dx / norm) * dist;
            fy += (dy / norm) * dist;
            el.dataset.avatarFx = String(fx);
            el.dataset.avatarFy = String(fy);
            _setAvatarPos(el, fx, fy);
        }
    } else if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) {
        // Drop keys that were held when Time Freeze started so the avatar
        // doesn't lurch forward the instant the freeze lifts.
        _avatarMoveState.held.clear();
    }

    _avatarMoveState.rafId = requestAnimationFrame(_avatarMoveTick);
}

function _makeAvatarWasdHandlers(elId) {
    const onKeyDown = (e) => {
        if (_avatarMoveUiBlocked()) return;
        const k = (e.key || '').toLowerCase();
        // Which direction does this key drive? Read from the persisted
        // keybind map (defaults: WASD).
        let direction = null;
        if (typeof keybindMatches === 'function') {
            if (keybindMatches(e, 'move-up')) direction = 'up';
            else if (keybindMatches(e, 'move-down')) direction = 'down';
            else if (keybindMatches(e, 'move-left')) direction = 'left';
            else if (keybindMatches(e, 'move-right')) direction = 'right';
        } else {
            switch (k) {
                case 'w': direction = 'up'; break;
                case 's': direction = 'down'; break;
                case 'a': direction = 'left'; break;
                case 'd': direction = 'right'; break;
            }
        }
        if (!direction) return;
        e.preventDefault();
        if (_avatarMoveState.held.has(k)) return;   // ignore OS auto-repeat events
        _avatarMoveState.held.add(k);
        _avatarMoveState.elId = elId;
        if (!_avatarMoveState.rafId) {
            _avatarMoveState.lastTs = performance.now();
            _avatarMoveState.rafId = requestAnimationFrame(_avatarMoveTick);
        }
    };
    const onKeyUp = (e) => {
        _avatarMoveState.held.delete((e.key || '').toLowerCase());
    };
    const onBlur = () => _avatarMoveState.held.clear();
    return { onKeyDown, onKeyUp, onBlur };
}

function _removeSimpleAvatarWasdListeners() {
    if (window._avatarWASDHandler) {
        document.removeEventListener('keydown', window._avatarWASDHandler);
        window._avatarWASDHandler = null;
    }
    if (window._avatarWASDKeyUpHandler) {
        document.removeEventListener('keyup', window._avatarWASDKeyUpHandler);
        window._avatarWASDKeyUpHandler = null;
    }
    if (window._avatarWASDBlurHandler) {
        window.removeEventListener('blur', window._avatarWASDBlurHandler);
        window._avatarWASDBlurHandler = null;
    }
}

function _initSimpleAvatarWASD(wrapper) {
    // Remove any previous listeners
    _removeSimpleAvatarWasdListeners();

    const h = _makeAvatarWasdHandlers('player-avatar-simple');
    window._avatarWASDHandler = h.onKeyDown;
    window._avatarWASDKeyUpHandler = h.onKeyUp;
    window._avatarWASDBlurHandler = h.onBlur;

    document.addEventListener('keydown', h.onKeyDown);
    document.addEventListener('keyup', h.onKeyUp);
    window.addEventListener('blur', h.onBlur);
}

// Returns true when the random_walker companions should be shown.
function _hasCompanions() {
    return STATE && STATE.playerAscendency === 'random_walker';
}

// Charges a companion sprite from its current position to a grid cell,
// calls onArrival() when it lands, then flies it back home.
// companionId: 'avatar-companion-drifter' | 'avatar-companion-brownian'
function _chargeCompanionToCell(companionId, targetR, targetC, onArrival, onReturn) {
    const el = document.getElementById(companionId);
    if (!el) {
        // No companion visible (e.g. wrong ascendency) — just fire callbacks immediately
        if (onArrival) onArrival();
        return;
    }

    const cellEl = document.getElementById(`g-${targetR}-${targetC}`);
    if (!cellEl) {
        if (onArrival) onArrival();
        return;
    }

    // Snapshot home position before detaching from flex row
    const homeRect = el.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    const targetX = cellRect.left + cellRect.width / 2;
    const targetY = cellRect.top + cellRect.height / 2;

    // Detach from flex row and pin to fixed position at current spot
    el.style.position = 'fixed';
    el.style.left = homeRect.left + 'px';
    el.style.top = homeRect.top + 'px';
    el.style.zIndex = '1200';
    el.classList.add('companion-charging');

    // Charge to target cell
    requestAnimationFrame(() => {
        el.style.transition = 'left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1)';
        el.style.left = (targetX - el.offsetWidth / 2) + 'px';
        el.style.top = (targetY - el.offsetHeight / 2) + 'px';
    });

    setTimeout(() => {
        if (onArrival) onArrival();

        // Brief pause at destination, then fly home
        setTimeout(() => {
            el.style.transition = 'left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1)';
            el.style.left = homeRect.left + 'px';
            el.style.top = homeRect.top + 'px';

            setTimeout(() => {
                // Re-attach to flex row — clear fixed overrides
                el.style.position = '';
                el.style.left = '';
                el.style.top = '';
                el.style.zIndex = '';
                el.style.transition = '';
                el.classList.remove('companion-charging');
                if (onReturn) onReturn();
            }, 450);
        }, 300);
    }, 380);
}

// Flips sprites to always face the screen centre.
// With companions, also reorders Drifter/Brownian so they stay on the
// correct side (Drifter left, Brownian right) relative to the character.
function _updateAvatarFacing(el) {
    const left = parseInt(el.style.left) || 0;
    const avatarCenterX = left + (el.offsetWidth || 72) / 2;
    const facingLeft = avatarCenterX > window.innerWidth / 2;

    if (_hasCompanions()) {
        const row = el.querySelector('.avatar-sprite-row');
        const playerImg = el.querySelector('#avatar-sprite-img-simple');
        const drifterImg = el.querySelector('#avatar-companion-drifter');
        const brownianImg = el.querySelector('#avatar-companion-brownian');

        // Flip every sprite so each individual image faces the right direction
        [playerImg, drifterImg, brownianImg].forEach(img => {
            if (img) img.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
        });

        // Reorder: facing right → Drifter | Player | Brownian
        //          facing left  → Brownian | Player | Drifter
        if (row && drifterImg && brownianImg) {
            if (facingLeft) {
                row.prepend(brownianImg);
                row.append(drifterImg);
            } else {
                row.prepend(drifterImg);
                row.append(brownianImg);
            }
        }
    } else {
        const img = el.querySelector('#avatar-sprite-img-simple');
        if (img) img.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    }
}



// Sets position clamped to the viewport so the avatar never goes off-screen.
// Also drives the walking animation: every position change starts/keeps
// the walk loop running and re-arms its idle debounce (see
// sprite_animations.js for _playAvatarWalkAnimation).
function _setAvatarPos(el, x, y) {
    const w = el.offsetWidth || 72;
    const h = el.offsetHeight || 90;
    const maxX = window.innerWidth - w - 4;
    const maxY = window.innerHeight - h - 4;
    el.style.bottom = 'auto';   // <-- add this
    el.style.left = Math.max(4, Math.min(maxX, x)) + 'px';
    el.style.top = Math.max(4, Math.min(maxY, y)) + 'px';
    _updateAvatarFacing(el);

    if (typeof _banterRepositionBubbleIfVisible === 'function') _banterRepositionBubbleIfVisible();

    if (typeof _playAvatarWalkAnimation === 'function') {
        const spriteImgId = el.id === 'player-avatar-wrapper'
            ? 'avatar-sprite-img'
            : 'avatar-sprite-img-simple';
        _playAvatarWalkAnimation(spriteImgId);
    }
}


//------------------------------------------------------------------------
//-------------------LEVEL-SELECT AVATAR----------------------------------
//------------------------------------------------------------------------

// Call this inside renderLSCharacterAvatar() (character-select.js) to also
// update the avatar image when the level select screen opens.
function _updateLSAvatarImage() {
    const img = document.querySelector('.ls-char-avatar-img');
    if (img) img.src = _getPlayerCharacterImage();
}


//------------------------------------------------------------------------
//-------------------GAME SETUP SCREEN-------------------------------------
//------------------------------------------------------------------------



// Maps character id → the per-character name-image asset shown on the
// left page of the setup screen's book. Expected filenames:
// images/Game_Setup/Stox.png, Trix.png, Syla.png
function _getSetupCharNameImage() {
    const char = (STATE && STATE.playerCharacter) ? STATE.playerCharacter : 'stox';
    const charCap = char.charAt(0).toUpperCase() + char.slice(1);
    return `images/Game_Setup/${charCap}.png`;
}




// Call this inside showSetup() (screens.js) to sync the setup screen's
// character name image + portrait to whichever character the player chose.
function _updateSetupScreenCharacter() {
    const nameImg = document.getElementById('setup-char-name-img');
    if (nameImg) nameImg.src = _getSetupCharNameImage();

    const portraitImg = document.getElementById('setup-char-portrait');
    if (portraitImg) portraitImg.src = _getPlayerCharacterImage();
}




//------------------------------------------------------------------------
//-------------------FULL ENDGAME AVATAR (monster levels)-----------------
//------------------------------------------------------------------------

// Creates and updates the full avatar with HP and charge bars.
// Used for endgame / monster levels only.
function _renderPlayerAvatar() {
    if (typeof dead !== 'undefined' && dead) {
        const _hideEl = document.getElementById('player-avatar-wrapper');
        if (_hideEl) _hideEl.style.display = 'none';
        return;
    }
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _removePlayerAvatarSimple();

    let avatar = document.getElementById('player-avatar-wrapper');

    if (!avatar) {
        avatar = document.createElement('div');
        avatar.id = 'player-avatar-wrapper';

        avatar.style.cssText = `
            position: fixed;
            top: 15px;
            left: 250px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100px;
            cursor: default;
            user-select: none;
        `;

        avatar.innerHTML = `
            <div id="avatar-name-label" style="
                width: 100%;
                text-align: center;
                font-size: 9px;
                letter-spacing: 1px;
                color: ${_getAvatarCharacterColor()};
                padding: 2px 0 4px;
                font-family: monospace;
            ">${_getAvatarCharacterName()}</div>

            <div style="width: 100%; margin-bottom: 4px;">
                <span id="avatar-hp-text" style="font-size: 12px; font-weight: bold; color: white; display: block; text-align: center; text-shadow: 1px 1px 2px black;"></span>
                <div style="background: #111; width: 100%; height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #000;">
                    <div id="avatar-hp-fill" style="background: red; width: 100%; height: 100%; transition: width 0.1s;"></div>
                </div>
            </div>

            <!-- absorption / shield bar -->
            <div id="avatar-shield-wrap" style="width: 100%; margin-bottom: 4px; display: none;">
                <span id="avatar-shield-text" style="font-size: 10px; font-weight: bold; color: #7fd6ff; display: block; text-align: center; text-shadow: 1px 1px 2px black;"></span>
                <div style="background: #111; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #000;">
                    <div id="avatar-shield-fill" style="background: #3ec6ff; width: 0%; height: 100%; transition: width 0.1s;"></div>
                </div>
            </div>

            <div style="width: 100%; margin-bottom: 8px;">
                <div style="background: #111; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #000; box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);">
                    <div id="avatar-charge-fill" style="background: #4ade80; width: 0%; height: 100%; transition: width 0.1s linear;"></div>
                </div>
            </div>

            <img src="${_getPlayerCharacterImage()}" id="avatar-sprite-img"
                style="width: 100px; height: 100px; object-fit: contain; pointer-events: none;"
                draggable="false" />
        `;

        document.body.appendChild(avatar);

        _initFullAvatarWASD(avatar);
        _updateAvatarFacing(avatar);
    }

    avatar.style.display = 'flex';   // always ensure visible, regardless of prior hide

    // Update health
    const hpPct = Math.max(0, (playerCurrentHP / playerMaxHP) * 100);
    document.getElementById('avatar-hp-text').innerText = `HP: ${playerCurrentHP} / ${playerMaxHP}`;
    document.getElementById('avatar-hp-fill').style.width = hpPct + '%';

    // Update absorption shield
    const maxAbsorption = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats().absorption : 0;
    const shieldWrap = document.getElementById('avatar-shield-wrap');
    const shieldFill = document.getElementById('avatar-shield-fill');
    const shieldText = document.getElementById('avatar-shield-text');
    if (shieldWrap && shieldFill && shieldText) {
        if (maxAbsorption > 0) {
            shieldWrap.style.display = '';
            const shieldPct = Math.max(0, Math.min(100, (_egPlayerAbsorptionCurrent / maxAbsorption) * 100));
            shieldText.innerText = `🛡 ${Math.round(_egPlayerAbsorptionCurrent)} / ${maxAbsorption}`;
            shieldFill.style.width = shieldPct + '%';
        } else {
            shieldWrap.style.display = 'none';
        }
    }

    // Update charge
    const chargeMax = (typeof _egGetPlayerAttackInterval === 'function') ? _egGetPlayerAttackInterval() : EG_PLAYER_DEFAULT_ATTACK_INTERVAL;
    const chargePct = Math.min(100, Math.max(0, (_egPlayerCurrentCharge / chargeMax) * 100));
    document.getElementById('avatar-charge-fill').style.width = chargePct + '%';

    if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();

    // Hold-E pause — keep sprite label in sync if the avatar was recreated while E is still held
    if (typeof _egHoldEPauseActive !== 'undefined' && typeof _egSetHoldEPauseVisual === 'function') {
        // Avoid redundant DOM churn: _egSetHoldEPauseVisual is idempotent and cheap
        const lbl = document.getElementById('eg-hold-pause-label');
        const shouldShow = !!_egHoldEPauseActive;
        const isShowing = !!lbl && lbl.parentElement === avatar;
        if (shouldShow !== isShowing) _egSetHoldEPauseVisual(shouldShow);
        else if (shouldShow && lbl) {
            // Ensure text stays translated if language was switched while held
            const raw = (typeof t === 'function') ? (t('eg_hold_paused') || t('eg_parrying')) : '';
            const txt = raw && raw !== 'eg_hold_paused' && raw !== 'eg_parrying' ? raw : 'PARRYING';
            if (txt && lbl.textContent !== txt) lbl.textContent = txt;
        }
    }
}

function _removeFullAvatarWasdListeners() {
    if (window._avatarFullWASDHandler) {
        document.removeEventListener('keydown', window._avatarFullWASDHandler);
        window._avatarFullWASDHandler = null;
    }
    if (window._avatarFullWASDKeyUpHandler) {
        document.removeEventListener('keyup', window._avatarFullWASDKeyUpHandler);
        window._avatarFullWASDKeyUpHandler = null;
    }
    if (window._avatarFullWASDBlurHandler) {
        window.removeEventListener('blur', window._avatarFullWASDBlurHandler);
        window._avatarFullWASDBlurHandler = null;
    }
}

function _initFullAvatarWASD(wrapper) {
    _removeFullAvatarWasdListeners();

    const h = _makeAvatarWasdHandlers('player-avatar-wrapper');
    window._avatarFullWASDHandler = h.onKeyDown;
    window._avatarFullWASDKeyUpHandler = h.onKeyUp;
    window._avatarFullWASDBlurHandler = h.onBlur;

    document.addEventListener('keydown', h.onKeyDown);
    document.addEventListener('keyup', h.onKeyUp);
    window.addEventListener('blur', h.onBlur);
}





function _hidePlayerAvatarSimple() {
    const el = document.getElementById('player-avatar-simple');
    if (el) el.style.display = 'none';
    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    // Clear any held WASD keys so the hidden sprite doesn't keep moving off-screen
    if (typeof _avatarMoveState !== 'undefined' && _avatarMoveState.held) _avatarMoveState.held.clear();
}

function _showPlayerAvatarSimple() {
    if (typeof dead !== 'undefined' && dead) return;
    const el = document.getElementById('player-avatar-simple');
    if (el) el.style.display = 'flex';
}

// In js/sprite/player_sprite.js — add to wherever _egStopEncounter cleans up,
// or add a dedicated hide function mirroring the simple one:

function _hidePlayerAvatar() {
    const el = document.getElementById('player-avatar-wrapper');
    if (el) el.style.display = 'none';
    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    if (typeof _avatarMoveState !== 'undefined' && _avatarMoveState.held) _avatarMoveState.held.clear();
}

function _showPlayerAvatar() {
    if (typeof dead !== 'undefined' && dead) return;
    const el = document.getElementById('player-avatar-wrapper');
    if (el) el.style.display = 'flex';
}



function _renderPlayerHealth() {
    const hpText = document.getElementById('avatar-hp-text');
    const hpFill = document.getElementById('avatar-hp-fill');
    if (!hpText || !hpFill) return;
    const hpPct = Math.max(0, Math.min(100, (playerCurrentHP / playerMaxHP) * 100));
    hpText.innerText = `HP: ${playerCurrentHP} / ${playerMaxHP}`;
    hpFill.style.width = hpPct + '%';
    if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();
}