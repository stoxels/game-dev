// targeting-reticle.js
// Owns the custom mouse-follower reticle shown while a targeted class
// ability is armed (waiting for the player to click a cell).
//
// Replaces the previous approach of setting `cursor: crosshair` on
// #puzzle-scaler-wrap, which only ever covered the wrapper element and was
// silently overridden by .gc's `cursor: pointer` whenever the mouse was
// actually over a grid cell. This version hides the native cursor
// everywhere (see body.ability-armed in targeting-reticle.css) and draws
// a single tracked DOM element instead, so the same reticle now works
// both inside and outside the grid.


//------------------------------------------------------------------------
//---------------------------MODULE STATE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Cached references, created lazily on first arm.
let _arReticleEl = null;
let _arStageEl = null;

// Bound mousemove handler reference, so we can add/remove the exact same
// function and avoid leaking listeners across repeated arm/disarm cycles.
let _arMoveHandler = null;

// Last known pointer position, kept so the reticle can be (re)placed
// immediately on arm without waiting for the next mousemove.
let _arLastX = -9999;
let _arLastY = -9999;


//------------------------------------------------------------------------
//---------------------------THEME LOOKUP----------------------------------
//------------------------------------------------------------------------
// Maps the active class/ascendency to a CSS theme key understood by
// targeting-reticle.css ([data-reticle-theme="..."]). Extend this map as
// new classes get their own bespoke reticle palette.
//------------------------------------------------------------------------

function _arResolveTheme() {
    const slot = STATE.classActiveChoice;

    // Ascendency-specific themes take priority over the base class theme,
    // since an ascendency slot (active3/active4) can be armed independently
    // of which base class the player picked.
    if (STATE.playerAscendency === 'recursionist' && slot === 'active3') return 'recursionist'; // Residual Totem

    // Base class themes
    if (STATE.playerClass === 'mathmagician') return 'mathmagician'; // Arcane Reveal
    if (STATE.playerClass === 'statistician') return 'statistician'; // Diagonal Strike
    if (STATE.playerClass === 'probabilist') return 'probabilist';   // Precision Mark

    return 'default';
}


//------------------------------------------------------------------------
//---------------------------DOM CONSTRUCTION------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _arBuildReticleDOM — builds the reticle markup once and appends it to
//   <body>. Safe to call multiple times; it is a no-op after the first.
function _arBuildReticleDOM() {
    if (_arReticleEl) return;

    const root = document.createElement('div');
    root.id = 'ability-reticle';
    root.innerHTML = `
        <div class="ar-stage">
            <div class="ar-glow"></div>
            <div class="ar-ticks-counter">
                <span class="ar-tick t"></span>
                <span class="ar-tick r"></span>
                <span class="ar-tick b"></span>
                <span class="ar-tick l"></span>
            </div>
            <div class="ar-ring"></div>
            <div class="ar-ticks">
                <span class="ar-tick t"></span>
                <span class="ar-tick r"></span>
                <span class="ar-tick b"></span>
                <span class="ar-tick l"></span>
            </div>
            <div class="ar-center-dot"></div>
        </div>`;

    document.body.appendChild(root);

    _arReticleEl = root;
    _arStageEl = root.querySelector('.ar-stage');
}


//------------------------------------------------------------------------
//---------------------------POSITION TRACKING-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _arMoveTo — positions the reticle at the given viewport coordinates.
//   Uses a transform on the root element so we only ever touch one
//   property per move, keeping this cheap even on fast mouse movement.
function _arMoveTo(x, y) {
    _arLastX = x;
    _arLastY = y;
    if (_arReticleEl) {
        _arReticleEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

// _arOnMouseMove — listener bound to the whole document while armed, so
//   the reticle keeps following the cursor regardless of whether it is
//   currently over the grid, the HUD, or empty page space.
function _arOnMouseMove(e) {
    _arMoveTo(e.clientX, e.clientY);
    if (typeof _fieldScanUpdatePreview === 'function') _fieldScanUpdatePreview(e.clientX, e.clientY);
    if (typeof _arcaneReveal_updatePreview === 'function') _arcaneReveal_updatePreview(e.clientX, e.clientY);
    if (typeof _diagStrikeUpdatePreview === 'function') _diagStrikeUpdatePreview(e.clientX, e.clientY);
}


//------------------------------------------------------------------------
//---------------------------ARM / DISARM ENTRY POINTS----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _arShowArmPop — briefly replays the "just armed" pop animation by
//   re-triggering the CSS animation class (removing then re-adding it on
//   the next frame, since browsers won't restart an animation just by
//   re-adding the same class without a reflow in between).
function _arShowArmPop() {
    if (!_arStageEl) return;
    _arStageEl.classList.remove('ar-just-armed');
    void _arStageEl.offsetWidth; // force reflow
    _arStageEl.classList.add('ar-just-armed');
}

// activateTargetingReticle — arms or disarms the custom targeting reticle.
//   Called from _setAbilityMode() in class-abilities.js so the reticle
//   lifecycle always matches activeAbilityMode exactly.
function activateTargetingReticle(armed) {
    _arBuildReticleDOM();

    if (armed) {
        _arReticleEl.setAttribute('data-reticle-theme', _arResolveTheme());
        _arReticleEl.classList.add('show');
        document.body.classList.add('ability-armed');

        if (_arLastX > -9999) _arMoveTo(_arLastX, _arLastY);

        if (!_arMoveHandler) _arMoveHandler = _arOnMouseMove;
        document.addEventListener('mousemove', _arMoveHandler);

        _arShowArmPop();

        // Field Scan gets an extra live NxN boundary preview, synced to the
        // same mousemove handler — see _fieldScanUpdatePreview in class-probabilist.js.
        if (_arLastX > -9999 && typeof _fieldScanUpdatePreview === 'function') {
            _fieldScanUpdatePreview(_arLastX, _arLastY);
        }

        // Arcane Reveal gets the same treatment: a live radius-square preview,
        // see _arcaneReveal_updatePreview in class-mathmagician.js.
        if (_arLastX > -9999 && typeof _arcaneReveal_updatePreview === 'function') {
            _arcaneReveal_updatePreview(_arLastX, _arLastY);
        }

        // Diagonal Strike gets a live diagonal-line preview (1/2/4 bars
        // depending on rank), see _diagStrikeUpdatePreview in class-statistician.js.
        if (_arLastX > -9999 && typeof _diagStrikeUpdatePreview === 'function') {
            _diagStrikeUpdatePreview(_arLastX, _arLastY);
        }
    } else {
        _arReticleEl.classList.remove('show');
        document.body.classList.remove('ability-armed');

        if (_arMoveHandler) {
            document.removeEventListener('mousemove', _arMoveHandler);
        }

        if (typeof _fieldScanClearPreview === 'function') _fieldScanClearPreview();
        if (typeof _arcaneReveal_clearPreview === 'function') _arcaneReveal_clearPreview();
        if (typeof _diagStrikeClearPreview === 'function') _diagStrikeClearPreview();
    }
}