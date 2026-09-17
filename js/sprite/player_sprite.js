import { updateClassHUDManaBar } from '../classes/class-mana.js';
import { _egEntrMoveMult } from '../combat/bosses/boss-entropy.js';
import { _egSnailBroomHeld } from '../combat/bosses/boss-snail.js';
import { _egPlayerHasAilment } from '../combat/combat-ailments.js';
import { _egSetHoldEPauseVisual } from '../combat/encounter-tick.js';
import { _egComputePlayerStats, _egGetPlayerAttackInterval } from '../endgame/endgame-player-stats.js';
import { EG_PLAYER_DEFAULT_ATTACK_INTERVAL, _egIsActive } from '../combat/combat-state.js';
import { keybindKeyFor, keybindMatches } from '../keybinds.js';
import { _refreshQuestionModalFlag } from '../screens/screens.js';
import { _uspMovementSpeedMult } from '../skills/universal-spells.js';
import { _applyLowHealthVignette } from '../timer.js';
import { t } from '../translation/translations.js';
import { _banterRepositionBubbleIfVisible, hideCharacterBanter } from './character-banter.js';
import { ANIM_DIRECTIONS, _animHasDirectionalWalkSync, _animRefreshCacheFor, _animSetDefaultDownImage, _animShouldMirrorFor, _animWalkIsDirectionalFor, _playAvatarWalkAnimation, _startAvatarIdleAnimation, _stopAvatarWalkAnimation } from './sprite_animations.js';

//------------------------------------------------------------------------
//-------------------IMAGE LOOKUP-----------------------------------------
//------------------------------------------------------------------------

// Maps character id + class/ascendency id → image path.
// Falls back to the no-class portrait if no class is selected.
export function _getPlayerCharacterImage() {
    const char = (globalThis.STATE && globalThis.STATE.playerCharacter) ? globalThis.STATE.playerCharacter : 'stox';

    // Ascendency takes priority over base class
    const classKey = (globalThis.STATE && globalThis.STATE.playerAscendency)
        ? globalThis.STATE.playerAscendency
        : (globalThis.STATE && globalThis.STATE.playerClass ? globalThis.STATE.playerClass : 'noclass');

    // Expected filenames: e.g. images/sprites/Stox_statistician.webp
    // No-class fallback: images/sprites/Stox_noclass.webp
    const charCap = char.charAt(0).toUpperCase() + char.slice(1);
    return `images/sprites/${charCap}_${classKey}.webp`;
}


// Returns the display name of the currently selected character.
export function _getAvatarCharacterName() {
    const names = { stox: 'STOX', trix: 'TRIX', syla: 'SYLA' };
    return names[globalThis.STATE?.playerCharacter] || 'STOX';
}

export function _getAvatarCharacterColor() {
    const colors = {
        stox: '#4fc3f7',
        trix: '#ce93d8',
        syla: '#66bb6a',
    };
    return colors[globalThis.STATE?.playerCharacter] || '#ffffff';
}

// Returns true if the given character id is currently selected.
// Shared helper for all character-trait checks across the codebase.
export function _charIs(id) {
    return globalThis.STATE?.playerCharacter === id;
}


//------------------------------------------------------------------------
//-------------------SHARED AVATAR BAR STACK------------------------------
//------------------------------------------------------------------------

// The endgame-style bar stack BOTH avatar variants render (story puzzle
// levels and endgame monster levels look identical now - the old simple/
// full split was only ever a markup difference): Health, Mana, Shield
// (only while absorption is actually up), attack charge - bars above, then
// the sprite. barWidth pins the stack's width (the simple avatar's wrapper
// can be wider than the sprite when companions flank it); the full avatar
// uses the default 100% of its 100px wrapper. The ids are shared, so
// exactly one avatar may exist at a time (each render removes the other -
// see _renderPlayerAvatar* below).
export function _avatarBarsHTML(barWidth = '100%') {
    return `
            <div style="width: ${barWidth};">
                <div style="width: 100%; margin-bottom: 4px;">
                    <span id="avatar-hp-text" class="avatar-bar-num" style=""></span>
                    <div style="background: #111; width: 100%; height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #000;">
                        <div id="avatar-hp-fill" style="background: red; width: 100%; height: 100%; transition: width 0.1s;"></div>
                    </div>
                </div>

                <!-- mana bar (same recipe as the health bar, mana blue) -->
                <div id="avatar-mana-bar-wrap" class="avatar-mana-bar-wrap" style="width: 100%; margin-bottom: 4px;">
                    <span id="avatar-mana-text" class="avatar-mana-bar-text avatar-bar-num"></span>
                    <div class="avatar-mana-bar-track">
                        <div id="avatar-mana-fill" class="avatar-mana-bar-fill"></div>
                    </div>
                </div>

                <!-- absorption / shield bar - only rendered while the player
                     actually has absorption (see _updateAvatarBarStack) -->
                <div id="avatar-shield-wrap" style="width: 100%; margin-bottom: 4px; display: none;">
                    <span id="avatar-shield-text" class="avatar-bar-num avatar-bar-shield" style=""></span>
                    <div style="background: #111; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #000;">
                        <div id="avatar-shield-fill" style="background: #3ec6ff; width: 0%; height: 100%; transition: width 0.1s;"></div>
                    </div>
                </div>

                <!-- attack charge-up bar (with % readout to the bar's right - see _egUpdatePlayerChargeBar) -->
                <div style="width: 100%; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                    <div style="background: #111; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #000; box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);">
                        <div id="avatar-charge-fill" style="background: #4ade80; width: 0%; height: 100%; transition: width 0.1s linear;"></div>
                    </div>
                    <span id="avatar-charge-text" class="avatar-bar-num avatar-charge-num" style="flex-shrink: 0; min-width: 4ch; margin-bottom: 0;">0%</span>
                </div>
            </div>`;
}

// Syncs the shared bar stack from the live globals: health value + fill,
// shield visibility, charge bar. Mana fill/text are owned by
// updateClassHUDManaBar() (class-mana.js). Idempotent - call after any
// avatar (re)build or health change.
export function _updateAvatarBarStack() {
    // Health - the text shows only the current value (the bar's shape
    // already communicates the maximum), fill is the percentage.
    const hpText = document.getElementById('avatar-hp-text');
    const hpFill = document.getElementById('avatar-hp-fill');
    if (hpText) hpText.innerText = `${Math.max(0, Math.round(globalThis.playerCurrentHP))}`;
    if (hpFill) {
        const hpPct = (typeof playerMaxHP === 'number' && globalThis.playerMaxHP > 0)
            ? Math.max(0, Math.min(100, (globalThis.playerCurrentHP / globalThis.playerMaxHP) * 100))
            : 100;
        hpFill.style.width = hpPct + '%';
    }    // Absorption shield - hidden entirely unless the player actually has
    // some (gear absorption > 0 AND current charge above zero).
    const absCur = (typeof _egPlayerAbsorptionCurrent === 'number') ? globalThis._egPlayerAbsorptionCurrent : 0;
    const maxAbsorption = (typeof _egComputePlayerStats === 'function') ? (_egComputePlayerStats().absorption || 0) : 0;
    const shieldWrap = document.getElementById('avatar-shield-wrap');
    const shieldFill = document.getElementById('avatar-shield-fill');
    const shieldText = document.getElementById('avatar-shield-text');
    if (shieldWrap && shieldFill && shieldText) {
        if (maxAbsorption > 0 && absCur > 0) {
            shieldWrap.style.display = '';
            const shieldPct = Math.max(0, Math.min(100, (absCur / maxAbsorption) * 100));
            shieldText.innerText = `🛡 ${Math.round(absCur)} / ${maxAbsorption}`;
            shieldFill.style.width = shieldPct + '%';
        } else {
            shieldWrap.style.display = 'none';
        }
    }

    // Manual melee charge - fills toward 100% during combat and holds until
    // an E strike spends it. On puzzle levels the charge stays parked at 0.
    const chargeFill = document.getElementById('avatar-charge-fill');
    if (chargeFill) {
        const chargeCur = (typeof _egPlayerCurrentCharge === 'number') ? globalThis._egPlayerCurrentCharge : 0;
        const chargeMax = (typeof _egGetPlayerAttackInterval === 'function')
            ? _egGetPlayerAttackInterval()
            : (typeof EG_PLAYER_DEFAULT_ATTACK_INTERVAL === 'number' ? EG_PLAYER_DEFAULT_ATTACK_INTERVAL : 5000);
        const chargePct = Math.min(100, Math.max(0, (chargeCur / chargeMax) * 100));
        chargeFill.style.width = chargePct + '%';
        // Ready glow at full charge (paused styling is owned centrally by
        // _egUpdatePlayerChargeBar - only mirror the ready state here).
        const chargeReady = chargePct >= 100;
        chargeFill.classList.toggle('eg-charge-ready', chargeReady);
        const chargeText = document.getElementById('avatar-charge-text');
        if (chargeText) {
            chargeText.textContent = `${Math.floor(chargePct)}%`;
            chargeText.classList.toggle('eg-charge-ready', chargeReady);
        }
    }
}



//------------------------------------------------------------------------
//-------------------SIMPLE IN-GAME AVATAR (non-monster levels)-----------
//------------------------------------------------------------------------

// Viewport-aware scale factor for the simple avatar. On narrow screens
// (phones) the fixed 250px anchor position and the 128px sprite would
// overlap the right-hand HUD/zoom bar, so the whole wrapper is shrunk.
// Uses CSS zoom (same mechanism as the puzzle scaler) so offsetWidth
// stays in sync and _setAvatarPos() keeps clamping correctly.
export function _avatarResponsiveScale() {
    const vw = window.innerWidth || 1280;
    if (vw >= 700) return 1;   // desktop anchor - unchanged behaviour
    if (vw >= 480) return 0.8; // large phones / small tablets
    return 0.6;                // phones
}

// Anchor X/Y for the simple avatar wrapper. On phones the avatar moves to
// the left edge BELOW the clock/mistake HUD (that HUD is ~74px tall, plus
// extra rows when the touchpad toggle is shown), so it never covers the
// timer. Desktop keeps the original 250px/15px anchor.
//
// The 128px sprite img sits centered inside the (narrower) wrapper, so on a
// zoom-scaled phone layout its visual box spills past the wrapper's left
// edge by (128 - wrapperWidth) * scale / 2 px. The anchor compensates for
// that spill so the ARTWORK - not the wrapper box - keeps an 8px margin.
export function _avatarAnchorLeft() {
    const vw = window.innerWidth || 1280;
    if (vw >= 700) return '250px';
    const withCompanions = _hasCompanions();
    const wrapperW = withCompanions ? 328 : 72;
    const scale = _avatarResponsiveScale();
    const spill = Math.max(0, (128 - wrapperW) * scale / 2);
    return Math.round(8 + spill) + 'px';
}

export function _avatarAnchorTop() {
    if ((window.innerWidth || 1280) >= 700) return '15px';
    const hud = document.querySelector('.game-hud-corner');
    const hudBottom = hud ? hud.getBoundingClientRect().bottom : 0;
    return Math.max(84, Math.ceil(hudBottom) + 6) + 'px';
}

// Applies the responsive anchor + zoom scale to a simple-avatar wrapper.
// Desktop (>700px) is a no-op - behaviour there is byte-for-byte unchanged.
export function _applyAvatarResponsiveLayout(wrapper) {
    if (!wrapper) return;
    wrapper.style.left = _avatarAnchorLeft();
    wrapper.style.top = _avatarAnchorTop();
    // Position IS the anchor now, so resize handling may re-anchor freely
    // (clears the "player placed this" marker set by _setAvatarPos). The
    // anchored stamp tells the resize handler this sprite's position was
    // engine-anchored, not placed by another flow's direct style write.
    delete wrapper.dataset.avatarUserPos;
    wrapper.dataset.avatarAnchored = '1';
    const scale = _avatarResponsiveScale();
    const zoomSupported = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('zoom', '1');
    wrapper.style.zoom = (zoomSupported && scale !== 1) ? String(scale) : '';
}

// Renders the WASD-controlled sprite in the top-left with the full
// Health / Mana / Shield / charge bar stack above it (same presentation as
// the monster-level avatar - see _avatarBarsHTML).
export function _renderPlayerAvatarSimple() {
    if (typeof dead !== 'undefined' && globalThis.dead) {
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
            // Gameplay default: move-down art, not the menu portrait (the
            // idle loop below upgrades this to the exact facing frame once
            // discovery lands; menus keep using _getPlayerCharacterImage()).
            if (img) {
                if (typeof _animSetDefaultDownImage === 'function') _animSetDefaultDownImage(img);
                else img.src = _getPlayerCharacterImage();
            }

            const nameLabel = existing.querySelector('#avatar-simple-drag-handle');
            if (nameLabel) {
                nameLabel.textContent = _getAvatarCharacterName();
                nameLabel.style.color = _getAvatarCharacterColor();
            }

            // Viewport may have changed since the wrapper was first built
            // (e.g. rotating a phone) - re-sync anchor/scale before reuse.
            _applyAvatarResponsiveLayout(existing);

            // Self-heal: a mid-boot error between wrapper creation and
            // listener wiring used to leave the sprite drawn but unmovable
            // for the whole session (movement only worked after some later
            // flow re-rendered the avatar, e.g. entering the nexus).
            if (!window._avatarWASDHandler) _initSimpleAvatarWASD(existing);

            // Keep the mana bar in sync when the avatar is reused (e.g. after
            // a level transition where the pool was reset).
            if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar();
            _updateAvatarBarStack();

            // Companions don't change image, but re-run facing so order stays correct
            _updateAvatarFacing(existing);
            if (typeof _startAvatarIdleAnimation === 'function') _startAvatarIdleAnimation('avatar-sprite-img-simple');
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
    // Responsive anchor/scale for narrow viewports (no-op on desktop).
    _applyAvatarResponsiveLayout(wrapper);

    // The full endgame-style bar stack (Health / Mana / Shield / charge) -
    // identical markup and ids to the monster-level avatar, so puzzle levels
    // and endgame read the same way. Width follows the 128px sprite, not the
    // (narrower, possibly companion-widened) wrapper - a '100%' here would
    // resolve to the wrapper and leave the bars hugging a 72px box.
    wrapper.innerHTML = `
        ${_avatarBarsHTML('128px')}
        <div class="avatar-sprite-row" style="
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            gap: 4px;
        ">
            ${withCompanions ? `<img
                src="images/sprites/companion_drifter.webp"
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
                src="images/sprites/companion_browney.webp"
                id="avatar-companion-brownian"
                style="width: 112px; height: 112px; object-fit: contain; pointer-events: none;"
                draggable="false"
            />` : ''}
        </div>
    `;

    document.body.appendChild(wrapper);
    // Fill the bar stack from the live globals; the mana bar's own sync
    // (updateClassHUDManaBar) runs inside _updateAvatarBarStack's caller
    // chain below.
    _updateAvatarBarStack();
    // Mana bar lives on the sprite now (moved off the class HUD).
    if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar();
    // Gameplay default: move-down art on first paint (cold cache included),
    // with a safe chain back to the menu portrait for variants without
    // directional art. Menus (save slots, level-select topbar, quiz modal)
    // keep rendering _getPlayerCharacterImage() directly.
    const _newSimpleImg = wrapper.querySelector('#avatar-sprite-img-simple');
    if (_newSimpleImg && typeof _animSetDefaultDownImage === 'function') _animSetDefaultDownImage(_newSimpleImg);
    _initSimpleAvatarWASD(wrapper);
    _updateAvatarFacing(wrapper);
    // Re-sync anchor/scale once the rest of the level HUD has settled - the
    // touchpad toggle (FÜLLEN button) can appear after this point and grow
    // the left HUD, which the phone anchor is derived from.
    // ... but never yank the sprite back if the player already walked it
    // during those first 350ms.
    setTimeout(() => {
        if (wrapper.isConnected && !wrapper.dataset.avatarUserPos) {
            _applyAvatarResponsiveLayout(wrapper);
        }
    }, 350);
    // Start the idle loop (static portrait until idle frames exist) and
    // warm the frame cache for this character/variant in the background.
    if (typeof _startAvatarIdleAnimation === 'function') _startAvatarIdleAnimation('avatar-sprite-img-simple');
}

// Keeps the simple avatar in sync with viewport changes (phone rotation,
// window resizing). Position provenance is tracked explicitly via two
// dataset stamps:
//   avatarUserPos   - a deliberate placement happened (_setAvatarPos:
//                     walk, boss push, teleport). Resize handling must
//                     preserve the spot and only clamp it back in view.
//   avatarAnchored  - the position is the engine's responsive anchor
//                     (_applyAvatarResponsiveLayout). A still-anchored
//                     sprite follows the anchor when the viewport crosses
//                     the desktop/phone boundary.
// A sprite stamped by neither (e.g. placed by the tutorial's direct style
// writes) is treated as deliberately placed: never re-anchored, only
// clamped. Before this fix, a resize that dipped the window below 700px
// snapped the sprite to the phone's top-left anchor, and an early return
// for vw >= 700 meant it stayed stranded there after the window grew back.
(function _initAvatarResizeSync() {
    let lastVW = window.innerWidth, lastVH = window.innerHeight;
    const DESKTOP_MIN_VW = 700;
    // Cross-frame desktop anchor. Lives on window (not in this closure) so
    // it survives across sessions of the same wrapper and is not reset when
    // a new avatar is rendered - a phone edge-anchored avatar that crosses
    // back over 700px must return to the desktop spot it came from.
    if (!window._avatarDesktopAnchor) window._avatarDesktopAnchor = { left: '250px', top: '15px' };

    const setDesktopAnchor = (wrapper) => {
        wrapper.style.left = window._avatarDesktopAnchor.left;
        wrapper.style.top = window._avatarDesktopAnchor.top;
        // Desktop scale is 1: drop the phone zoom a dip below 700px applied,
        // or the sprite would come back correctly anchored but shrunk.
        wrapper.style.zoom = '';
        delete wrapper.dataset.avatarUserPos;
        wrapper.dataset.avatarAnchored = '1';
    };

    window.addEventListener('resize', () => {
        const vw = window.innerWidth, vh = window.innerHeight;
        if (vw === lastVW && vh === lastVH) return;
        const changedW = vw !== lastVW;
        lastVW = vw; lastVH = vh;

        const wrapper = document.getElementById('player-avatar-simple');
        if (!wrapper || wrapper.style.display === 'none') return;

        const userPlaced = !!wrapper.dataset.avatarUserPos;
        const anchored = !!wrapper.dataset.avatarAnchored;

        // A still-anchored sprite follows the responsive anchor across the
        // desktop/phone boundary. A deliberately placed sprite (or one whose
        // position some other flow wrote directly) is never re-anchored.
        if (!userPlaced && anchored) {
            if (vw >= DESKTOP_MIN_VW) {
                setDesktopAnchor(wrapper);
                return;
            }
            // Phone layout: a desktop-anchored avatar would cover the HUD.
            // Width change = rotation/resize - re-anchor + rescale;
            // height-only change - re-clamp vertically, keep the player's X.
            if (changedW) {
                _applyAvatarResponsiveLayout(wrapper);
                return;
            }
            const maxY = window.innerHeight - wrapper.offsetHeight - 4;
            wrapper.style.top = Math.max(4, Math.min(maxY, parseInt(wrapper.style.top) || 0)) + 'px';
            return;
        }

        // Deliberately placed: never yank it - only clamp back inside the
        // viewport if the resize pushed the sprite partly off-screen.
        const maxX = window.innerWidth - wrapper.offsetWidth - 4;
        const maxY = window.innerHeight - wrapper.offsetHeight - 4;
        wrapper.style.top = Math.max(4, Math.min(maxY, parseInt(wrapper.style.top) || 0)) + 'px';
        wrapper.style.left = Math.max(4, Math.min(maxX, parseInt(wrapper.style.left) || 0)) + 'px';
    });
})();

// Removes the simple avatar (called when entering a monster level).
export function _removePlayerAvatarSimple() {
    const simple = document.getElementById('player-avatar-simple');
    if (simple) simple.remove();
    // Clean up WASD listeners
    _removeSimpleAvatarWasdListeners();
    if (typeof hideCharacterBanter === 'function') hideCharacterBanter();
}

// Refreshes the sprite image on the simple avatar (e.g. after class selection).
export function _updateAvatarSimpleImage() {
    const img = document.getElementById('avatar-sprite-img-simple');
    if (img) {
        if (typeof _animSetDefaultDownImage === 'function') _animSetDefaultDownImage(img);
        else img.src = _getPlayerCharacterImage();
    }
    const imgFull = document.getElementById('avatar-sprite-img');
    if (imgFull) {
        if (typeof _animSetDefaultDownImage === 'function') _animSetDefaultDownImage(imgFull);
        else imgFull.src = _getPlayerCharacterImage();
    }
    // New class/variant: drop stale frame cache, warm the new one, and
    // (re)start the idle loop so fresh idle art appears.
    if (typeof _animRefreshCacheFor === 'function' && typeof STATE !== 'undefined' && globalThis.STATE) {
        _animRefreshCacheFor(globalThis.STATE.playerCharacter, globalThis.STATE.playerAscendency || globalThis.STATE.playerClass || 'noclass');
    }
    if (typeof _startAvatarIdleAnimation === 'function') {
        _startAvatarIdleAnimation('avatar-sprite-img-simple');
        _startAvatarIdleAnimation('avatar-sprite-img');
    }
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
export const AVATAR_MOVE_SPEED_PX_PER_SEC = 320;

// Boots movement-speed modifier (PoE-style). Reads live gear via
// _egComputePlayerStats().movementSpeedPct which is only rolled on
// boots (10–35%). Outside endgame or with no boots equipped this
// stays at 1.0×.
export function _avatarGetMoveSpeed() {
    let base = AVATAR_MOVE_SPEED_PX_PER_SEC;
    try {
        if (typeof _egComputePlayerStats === 'function') {
            const pct = _egComputePlayerStats().movementSpeedPct || 0;
            if (pct) base *= (1 + pct / 100);
        }
    } catch (e) {}
    // The Snail's broom: sweeping slows the player to a crawl so the Doom
    // Snail can catch up while a slimed cell is being cleaned (see
    // boss-snail.js - EG_SNAIL_BROOM_SPEED_MULT lives on window).
    if (typeof _egSnailBroomHeld === 'function' && _egSnailBroomHeld()) {
        base *= (typeof window.EG_SNAIL_BROOM_SPEED_MULT === 'number')
            ? window.EG_SNAIL_BROOM_SPEED_MULT : 0.10;
    }
    // Entropy's order economy: outside the ordered zones the cold makes you
    // progressively sluggish (never locked - floors at 55%). Perfect crystal
    // order during the finale restores full speed (see boss-entropy.js -
    // _egEntrMoveMult reads the order meter).
    if (typeof _egEntrMoveMult === 'function') {
        const entrMult = _egEntrMoveMult();
        if (entrMult < 1) base *= entrMult;
        else if (entrMult > 1) base = Math.min(base, AVATAR_MOVE_SPEED_PX_PER_SEC * 1.05) * entrMult;
    }
    // Movement spells (js/skills/universal-spells.js): Windstep and the
    // Disengage follow-through hand back their speed as a multiplier, so a
    // movement buff is the same kind of modifier as boots or a boss slow.
    // typeof-guarded so this file keeps working with the skill system absent.
    if (typeof _uspMovementSpeedMult === 'function') {
        try {
            const m = _uspMovementSpeedMult();
            if (m && m !== 1) base *= m;
        } catch (e) { /* a buff lookup must never break walking */ }
    }
    return base;
}

// The last direction this sprite actually WALKED (up/down/left/right), or null
// before the first step. Written by the move loop below, not by keydown: a
// player holding a key against a UI block is not walking, and the movement
// spells must aim where the sprite last went, not where a held key points.
// Read through getAvatarLastMoveDir() (js/skills/universal-spells.js).
export let _avatarLastMoveDir = null;

export function getAvatarLastMoveDir() {
    return _avatarLastMoveDir;
}

export const _avatarMoveState = {
    held: new Set(),
    elId: null,
    rafId: null,
    lastTs: 0,
};

export function _avatarMoveUiBlocked() {
    const tag = document.activeElement ? document.activeElement.tagName : null;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || !!document.querySelector('.modal-bg.show')) return true;
    // A question modal (quiz overlay / math gate / scouts primer) hides the
    // avatar via CSS - suspend its movement input along with it. The body
    // flag can go STALE (an overlay removed without a flag refresh, or an
    // interrupted boot), which used to dead-claim WASD until some unrelated
    // flow re-synced the flag - verify against the live DOM and self-heal
    // when no question modal is actually visible.
    if (document.body.classList.contains('question-modal-open')) {
        const qz = document.getElementById('quiz-overlay');
        const mg = document.getElementById('mg-modal');
        const open = !!(document.getElementById('primer-overlay') ||
            (qz && qz.classList.contains('show')) ||
            (mg && mg.classList.contains('show')));
        if (open) return true;
        if (typeof _refreshQuestionModalFlag === 'function') {
            try { _refreshQuestionModalFlag(); } catch (e) {}
        } else {
            document.body.classList.remove('question-modal-open');
        }
    }
    // The Clock's Time Freeze locks the avatar in place for the whole window.
    if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) return true;
    // Dev-testing harness (js/dev-testing.js) explicitly freezes the avatar
    // for scripted movement tests; never set in normal play.
    if (typeof window !== 'undefined' && window.STOX_FLAGS && window.STOX_FLAGS.devTestActive
        && window.STOX_FLAGS.devTestFreezeAvatar) return true;
    if (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) return true;
    if (typeof _egPlayerHasAilment === 'function' && _egPlayerHasAilment('frozen')) return true;
    return false;
}

export function _avatarMoveTick(ts) {
    _avatarMoveState.rafId = null;
    if (!_avatarMoveState.held.size || !_avatarMoveState.elId) return;

    const el = document.getElementById(_avatarMoveState.elId);
    if (!el) return;
    // A hidden avatar can never be steered: screens like setup and level
    // select keep the fixed sprite in the DOM after hiding it, and without
    // this guard held WASD keys would silently drag it around off-screen
    // (and any future flow that hides without clearing held keys would leak
    // movement too). Clear held so the keyup-less case can't linger.
    if (getComputedStyle(el).display === 'none') {
        _avatarMoveState.held.clear();
        return;
    }

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
            // Float accumulator (per element) so very slow speeds - e.g. The
            // Snail's broom at ~10% - still move: a sub-pixel per-frame step
            // would otherwise be truncated away by re-parsing the integer
            // style position every frame, locking the avatar in place.
            let fx = parseFloat(el.dataset.avatarFx);
            let fy = parseFloat(el.dataset.avatarFy);
            if (!isFinite(fx)) fx = parseInt(el.style.left) || 12;
            if (!isFinite(fy)) fy = parseInt(el.style.top) ||
                (el.id === 'player-avatar-wrapper' ? window.innerHeight - 220 : 80);
            // Teleports / nudges / knockbacks write style.left/top directly -
            // reseed the accumulator when the rendered position diverges.
            // While a boss-knockback glide is active, style.left/top hold the
            // glide TARGET (the transition animates toward it), so sampling
            // them mid-glide would snap the sprite to the target instantly -
            // the "knockback looks like a teleport" bug. Sample the RENDERED
            // rect instead and let the inputs blend with the glide.
            if (el.dataset.egFlingActive) {
                const fr = el.getBoundingClientRect();
                fx = fr.left;
                fy = fr.top;
            } else {
                const curX = parseFloat(el.style.left);
                const curY = parseFloat(el.style.top);
                if (isFinite(curX) && Math.abs(curX - fx) > 2) fx = curX;
                if (isFinite(curY) && Math.abs(curY - fy) > 2) fy = curY;
            }
            fx += (dx / norm) * dist;
            fy += (dy / norm) * dist;
            el.dataset.avatarFx = String(fx);
            el.dataset.avatarFy = String(fy);
            // Dominant-axis direction hint for directional walk frames
            // (sprite_animations.js falls back to omni when absent).
            let dirHint = null;
            if (dx || dy) {
                if (Math.abs(dx) >= Math.abs(dy)) dirHint = dx > 0 ? 'right' : 'left';
                else dirHint = dy > 0 ? 'down' : 'up';
            }
            if (dirHint) _avatarLastMoveDir = dirHint;
            _setAvatarPos(el, fx, fy, dirHint);
        }
    } else if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) {
        // Drop keys that were held when Time Freeze started so the avatar
        // doesn't lurch forward the instant the freeze lifts.
        _avatarMoveState.held.clear();
    }

    _avatarMoveState.rafId = requestAnimationFrame(_avatarMoveTick);
}

export function _makeAvatarWasdHandlers(elId) {
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

export function _removeSimpleAvatarWasdListeners() {
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

export function _initSimpleAvatarWASD(wrapper) {
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
// try/typeof-guard: this runs during avatar render, and a mid-boot STATE
// hiccup here used to abort the whole render - including the WASD listener
// wiring below it - leaving the sprite permanently unmovable for the
// session (the "movement only works after visiting the nexus" report).
export function _hasCompanions() {
    try {
        return !!(typeof STATE !== 'undefined' && globalThis.STATE && globalThis.STATE.playerAscendency === 'random_walker');
    } catch (e) {
        return false;
    }
}

// Charges a companion sprite from its current position to a grid cell,
// calls onArrival() when it lands, then flies it back home.
// companionId: 'avatar-companion-drifter' | 'avatar-companion-brownian'
export function _chargeCompanionToCell(companionId, targetR, targetC, onArrival, onReturn) {
    const el = document.getElementById(companionId);
    if (!el) {
        // No companion visible (e.g. wrong ascendency) - just fire callbacks immediately
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
                // Re-attach to flex row - clear fixed overrides
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

// Facing helper. While moving, the sprite faces its TRAVEL direction:
//   - directional walk art (up/down/left/right) is drawn facing that way,
//     so it must never be mirrored (this fixes the Trix left/right swap);
//   - omni fallback art faces right, so only leftward movement mirrors it.
// Idle (no direction) keeps the legacy face-the-screen-centre behaviour so
// the menu-style portrait presentation is unchanged.
// With companions, also reorders Drifter/Brownian so they stay on the
// correct side (Drifter left, Brownian right) relative to the character.
export function _updateAvatarFacing(el, direction) {
    const st = (typeof STATE !== 'undefined' && globalThis.STATE) ? globalThis.STATE : null;
    const char = st ? st.playerCharacter : null;
    const variant = st ? (st.playerAscendency || st.playerClass || 'noclass') : 'noclass';
    const dir = (direction && typeof ANIM_DIRECTIONS !== 'undefined' && ANIM_DIRECTIONS.indexOf(direction) !== -1)
        ? direction : null;

    const playerImg = el.querySelector('#avatar-sprite-img-simple') || el.querySelector('#avatar-sprite-img');

    // Moving with true directional art: clear any mirror, keep travel facing.
    // Checks both the discovered-art cache and the live walk loop (which
    // knows whether the frames it plays are directional).
    let directionalActive = false;
    if (dir && char) {
        if (typeof _animHasDirectionalWalkSync === 'function' && _animHasDirectionalWalkSync(char, variant, dir)) {
            directionalActive = true;
        } else if (typeof _animWalkIsDirectionalFor === 'function') {
            const spriteId = playerImg ? playerImg.id : null;
            if (_animWalkIsDirectionalFor(spriteId)) directionalActive = true;
        }
    }

    if (directionalActive) {
        if (playerImg) playerImg.style.transform = 'scaleX(1)';
        // Companions still flank relative to screen centre; only the player
        // sprite itself must not mirror.
        if (_hasCompanions()) {
            const left = parseInt(el.style.left) || 0;
            const avatarCenterX = left + (el.offsetWidth || 72) / 2;
            const facingLeft = avatarCenterX > window.innerWidth / 2;
            const row = el.querySelector('.avatar-sprite-row');
            const drifterImg = el.querySelector('#avatar-companion-drifter');
            const brownianImg = el.querySelector('#avatar-companion-brownian');
            [drifterImg, brownianImg].forEach(img => {
                if (img) img.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
            });
            if (row && drifterImg && brownianImg) {
                if (facingLeft) {
                    row.prepend(brownianImg);
                    row.append(drifterImg);
                } else {
                    row.prepend(drifterImg);
                    row.append(brownianImg);
                }
            }
        }
        return;
    }

    // Moving with omni fallback art: mirror follows travel direction, not
    // screen position (old screen-centre logic faced the wrong way whenever
    // the sprite walked away from the centre).
    if (dir) {
        const mirror = (typeof _animShouldMirrorFor === 'function')
            ? _animShouldMirrorFor(char, variant, dir)
            : (dir === 'left');
        const facingLeft = mirror;
        if (_hasCompanions()) {
            const row = el.querySelector('.avatar-sprite-row');
            const drifterImg = el.querySelector('#avatar-companion-drifter');
            const brownianImg = el.querySelector('#avatar-companion-brownian');
            [playerImg, drifterImg, brownianImg].forEach(img => {
                if (img) img.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
            });
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
            if (playerImg) playerImg.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
        }
        return;
    }

    // Idle: legacy face-the-screen-centre behaviour (unchanged).
    const left = parseInt(el.style.left) || 0;
    const avatarCenterX = left + (el.offsetWidth || 72) / 2;
    const facingLeft = avatarCenterX > window.innerWidth / 2;

    if (_hasCompanions()) {
        const row = el.querySelector('.avatar-sprite-row');
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
        if (playerImg) playerImg.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    }
}



// Sets position clamped to the viewport so the avatar never goes off-screen.
// Voluntary directed movement also drives the walking animation: it starts/
// keeps the walk loop running and re-arms its idle debounce (see
// sprite_animations.js for _playAvatarWalkAnimation). Positional shoves
// (boss nudges, wormhole pulls) pass no direction and leave the current
// animation state and facing untouched.
// direction is optional ('up' | 'down' | 'left' | 'right') - picks the
// directional walk set when it exists, omni otherwise.
export function _setAvatarPos(el, x, y, direction) {
    const w = el.offsetWidth || 72;
    const h = el.offsetHeight || 90;
    const maxX = window.innerWidth - w - 4;
    const maxY = window.innerHeight - h - 4;
    el.style.bottom = 'auto';   // <-- add this
    el.style.left = Math.max(4, Math.min(maxX, x)) + 'px';
    el.style.top = Math.max(4, Math.min(maxY, y)) + 'px';
    // Deliberate placement (walk, push, teleport): resize handling must
    // preserve this spot instead of snapping back to the responsive anchor.
    el.dataset.avatarUserPos = '1';
    delete el.dataset.avatarAnchored;
    _updateAvatarFacing(el, direction);

    if (typeof _banterRepositionBubbleIfVisible === 'function') _banterRepositionBubbleIfVisible();

    // Only voluntary, directed movement drives the walk cycle. Positional
    // callers (boss nudges, wormhole pulls) pass no direction: they must
    // move the sprite WITHOUT touching animation state. Driving the loop
    // with direction=null previously resolved the legacy fallback art and
    // clobbered the facing, so e.g. the Marksman bow-wall clamp flickered
    // the sprite back to the old frames while pinned.
    if (direction && typeof _playAvatarWalkAnimation === 'function') {
        const spriteImgId = el.id === 'player-avatar-wrapper'
            ? 'avatar-sprite-img'
            : 'avatar-sprite-img-simple';
        _playAvatarWalkAnimation(spriteImgId, direction);
    }
}


//------------------------------------------------------------------------
//-------------------LEVEL-SELECT AVATAR----------------------------------
//------------------------------------------------------------------------

// Call this inside renderLSCharacterAvatar() (character-select.js) to also
// update the avatar image when the level select screen opens.
export function _updateLSAvatarImage() {
    const img = document.querySelector('.ls-char-avatar-img');
    if (img) img.src = _getPlayerCharacterImage();
}


//------------------------------------------------------------------------
//-------------------GAME SETUP SCREEN-------------------------------------
//------------------------------------------------------------------------



// Maps character id → the per-character name-image asset shown on the
// left page of the setup screen's book. Expected filenames:
// images/Game_Setup/Stox.webp, Trix.png, Syla.png
export function _getSetupCharNameImage() {
    const char = (globalThis.STATE && globalThis.STATE.playerCharacter) ? globalThis.STATE.playerCharacter : 'stox';
    const charCap = char.charAt(0).toUpperCase() + char.slice(1);
    return `images/Game_Setup/${charCap}.webp`;
}




// Call this inside showSetup() (screens.js) to sync the setup screen's
// character name image + portrait to whichever character the player chose.
export function _updateSetupScreenCharacter() {
    const nameImg = document.getElementById('setup-char-name-img');
    if (nameImg) nameImg.src = _getSetupCharNameImage();

    const portraitImg = document.getElementById('setup-char-portrait');
    if (portraitImg) portraitImg.src = _getPlayerCharacterImage();
}




//------------------------------------------------------------------------
//-------------------FULL AVATAR (same stack, monster levels)-------------
//------------------------------------------------------------------------

// Creates and updates the full avatar with the Health / Mana / Shield /
// charge bar stack. Shares its markup and element ids with the simple
// avatar (see _avatarBarsHTML), so puzzle levels and monster levels render
// the exact same sprite presentation - the old endgame-only split is gone.
export function _renderPlayerAvatar() {
    if (typeof dead !== 'undefined' && globalThis.dead) {
        const _hideEl = document.getElementById('player-avatar-wrapper');
        if (_hideEl) _hideEl.style.display = 'none';
        return;
    }
    _removePlayerAvatarSimple();

    let avatar = document.getElementById('player-avatar-wrapper');

    if (!avatar) {
        avatar = document.createElement('div');
        avatar.id = 'player-avatar-wrapper';

        // 128px wrapper + sprite - MUST match the simple avatar's size
        // (see _renderPlayerAvatarSimple). The old 100px here made the sprite
        // visibly shrink whenever a monster level took over from a puzzle
        // level (tutorial puzzle 1 → 2 is the most obvious case).
        avatar.style.cssText = `
            position: fixed;
            top: 15px;
            left: 250px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 128px;
            cursor: default;
            user-select: none;
        `;

        // Stack order, top → bottom: Health, Mana, Shield (only while
        // absorption is up), Attack charge, then the sprite itself - the
        // exact same stack the simple avatar renders.
        avatar.innerHTML = `
            ${_avatarBarsHTML()}
            <img src="${_getPlayerCharacterImage()}" id="avatar-sprite-img"
                style="width: 128px; height: 128px; object-fit: contain; pointer-events: none;"
                draggable="false" />
        `;

        document.body.appendChild(avatar);

        // Gameplay default: move-down art on first paint (same as the simple
        // avatar - the menu portrait stays reserved for menus).
        const _newFullImg = avatar.querySelector('#avatar-sprite-img');
        if (_newFullImg && typeof _animSetDefaultDownImage === 'function') _animSetDefaultDownImage(_newFullImg);
        _initFullAvatarWASD(avatar);
        _updateAvatarFacing(avatar);
        if (typeof _startAvatarIdleAnimation === 'function') _startAvatarIdleAnimation('avatar-sprite-img');
    }

    avatar.style.display = 'flex';   // always ensure visible, regardless of prior hide

    // Health value + fill, shield visibility, charge bar (mana is synced by
    // updateClassHUDManaBar below).
    _updateAvatarBarStack();

    // Update the mana bar (shared with the story-mode simple avatar).
    if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar();

    if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();

    // Hold-parry pause - keep sprite label in sync if the avatar was recreated while the parry key is still held
    if (typeof _egHoldEPauseActive !== 'undefined' && typeof _egSetHoldEPauseVisual === 'function') {
        // Avoid redundant DOM churn: _egSetHoldEPauseVisual is idempotent and cheap
        const lbl = document.getElementById('eg-hold-pause-label');
        const shouldShow = !!globalThis._egHoldEPauseActive;
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

export function _removeFullAvatarWasdListeners() {
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

export function _initFullAvatarWASD(wrapper) {
    _removeFullAvatarWasdListeners();

    const h = _makeAvatarWasdHandlers('player-avatar-wrapper');
    window._avatarFullWASDHandler = h.onKeyDown;
    window._avatarFullWASDKeyUpHandler = h.onKeyUp;
    window._avatarFullWASDBlurHandler = h.onBlur;

    document.addEventListener('keydown', h.onKeyDown);
    document.addEventListener('keyup', h.onKeyUp);
    window.addEventListener('blur', h.onBlur);
}





export function _hidePlayerAvatarSimple() {
    const el = document.getElementById('player-avatar-simple');
    if (el) el.style.display = 'none';
    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    // Clear any held WASD keys so the hidden sprite doesn't keep moving off-screen
    if (typeof _avatarMoveState !== 'undefined' && _avatarMoveState.held) _avatarMoveState.held.clear();
}

export function _showPlayerAvatarSimple() {
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    const el = document.getElementById('player-avatar-simple');
    if (el) el.style.display = 'flex';
}

// In js/sprite/player_sprite.js - add to wherever _egStopEncounter cleans up,
// or add a dedicated hide function mirroring the simple one:

export function _hidePlayerAvatar() {
    const el = document.getElementById('player-avatar-wrapper');
    if (el) el.style.display = 'none';
    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    if (typeof _avatarMoveState !== 'undefined' && _avatarMoveState.held) _avatarMoveState.held.clear();
}

export function _showPlayerAvatar() {
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    const el = document.getElementById('player-avatar-wrapper');
    if (el) el.style.display = 'flex';
}



export function _renderPlayerHealth() {
    _updateAvatarBarStack();
    if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();
}