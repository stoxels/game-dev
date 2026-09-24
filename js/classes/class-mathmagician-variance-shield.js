// Mathmagician Variance Shield: dome lifecycle and meteor-impact presentation.
// The class dispatcher and mistake handler use the small public surface below.

import { STATE } from '../state.js';

//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD - ARCANE BUBBLE VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_DOME_PADDING_PX = 5; // how far the dome bulges past the actual grid edges

// Tracks the pending DOM-removal timeout so a reactivated dome can cancel
// a stale removal scheduled from a previous fade-out.
let _varianceShieldRemovalTimer = null;

// Positions the fixed dome to match the grid's current screen rect,
// using only the corner cells (g-0-0 / g-{lastRow}-{lastCol}) - same
// approach as _fxShieldBorderAdd's _repositionShieldBorder, so clue
// number gutters are never included and zoom/transform can't skew it.

function _varianceShield_reposition() {
    const bubble = document.getElementById('variance-shield-bubble');
    // Use the wrap-relative rect helper (item_effects.js) instead of manual
    // zoom-divided math - the bubble now lives in #puzzle-scaler-wrap
    // (unscaled), so no currentZoom division should ever be applied here.
    // This mirrors the fix for #fx-shield-border, which had the exact same
    // bug: dividing by currentZoom at high zoom levels produced wildly
    // incorrect `left` values.
    const r = typeof globalThis._fxGetPuzzleRectForWrap === 'function' ? globalThis._fxGetPuzzleRectForWrap() : null;
    if (!bubble || !r) return;

    const pad = VARIANCE_SHIELD_DOME_PADDING_PX;

    bubble.style.left = `${r.left - pad}px`;
    bubble.style.top = `${r.top - pad}px`;
    bubble.style.width = `${r.width + pad * 2}px`;
    bubble.style.height = `${r.height + pad * 2}px`;
}

// Creates (or re-uses) the dome element, attaches it to <body> as a
// fixed-position overlay tracking the grid, and fades it in.
function _varianceShield_spawnBubble() {

    const existing = document.getElementById('variance-shield-bubble');
    if (existing && (existing.classList.contains('shattering') || existing.classList.contains('vs-pending-impact'))) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    let bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'variance-shield-bubble';
        bubble.innerHTML = `
            <div class="vs-bubble-glow"></div>
            <div class="vs-bubble-glass"></div>
            <div class="vs-bubble-runes"></div>
            <div class="vs-bubble-inner-ring"></div>
            <div class="vs-bubble-rim"></div>
        `;
        // Attach to the WRAP (unscaled), not the scaler - see
        // _varianceShield_reposition() for why. Coordinates written there
        // are now wrap-relative and must NOT be divided by currentZoom.
        const wrapEl = document.getElementById('puzzle-scaler-wrap');
        if (wrapEl) {
            if (!wrapEl.style.position || wrapEl.style.position === 'static') {
                wrapEl.style.position = 'relative';
            }
            wrapEl.appendChild(bubble);
        } else {
            document.body.appendChild(bubble); // fallback, shouldn't normally hit
        }

        const wrap = document.getElementById('puzzle-scaler-wrap');
        bubble._reposition = _varianceShield_reposition;
        if (wrap) {
            wrap.addEventListener('scroll', _varianceShield_reposition, { passive: true });
        }
    }

    setTimeout(() => {
        if (bubble._reposition) bubble._reposition();
        bubble.classList.add('active');
    }, 50);
}

// Fades the bubble out, cleans up its tracking listeners, and removes it
// once no shield stacks remain.
export function _varianceShield_removeBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;
    if (bubble.classList.contains('shattering') || bubble.classList.contains('vs-pending-impact')) return;

    bubble.classList.remove('active');

    if (_varianceShieldRemovalTimer) clearTimeout(_varianceShieldRemovalTimer);
    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el && !el.classList.contains('active')) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, 1000);
}

// Shows/hides the dome based on current shield stack count.
// Call this any time window._classFreeMistakes changes.
export function _varianceShield_updateVisibility() {
    if (window._vsSuppressAutoHide) return; // a meteor is currently resolving this exact mistake - don't interfere

    const stacks = window._classFreeMistakes || 0;
    if (STATE.playerClass === 'mathmagician' && stacks > 0) {
        _varianceShield_spawnBubble();
    } else {
        _varianceShield_removeBubble();
    }
}

export function _varianceShield_playCometImpact(impactPoint) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    const impact = document.createElement('div');
    impact.className = 'vs-comet-impact';

    if (impactPoint) {
        const rect = bubble.getBoundingClientRect();
        impact.style.left = `${impactPoint.x - rect.left}px`;
        impact.style.top = `${impactPoint.y - rect.top}px`;
    } else {
        const rad = Math.random() * Math.PI * 2;
        const radiusX = bubble.offsetWidth / 2;
        const radiusY = bubble.offsetHeight / 2;
        impact.style.left = `calc(50% + ${Math.cos(rad) * radiusX}px)`;
        impact.style.top = `calc(50% + ${Math.sin(rad) * radiusY}px)`;
    }

    bubble.appendChild(impact);
    setTimeout(() => impact.remove(), 500);
}



//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD - METEOR IMPACT VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_METEOR_FLIGHT_MS = 1100;    // Time for meteor to travel from offscreen to the bubble
const VARIANCE_SHIELD_METEOR_OFFSCREEN_PX = 150; // How far past the viewport edge the meteor starts
const VARIANCE_SHIELD_SHATTER_MS = 650;          // Duration of the bubble shatter animation before removal

// Picks a random point just outside one of the four viewport edges.
function _varianceShield_pickMeteorStart() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
    switch (edge) {
        case 0: return { x: Math.random() * w, y: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        case 1: return { x: w + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
        case 2: return { x: Math.random() * w, y: h + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        default: return { x: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
    }
}

// Spawns a meteor flying in from offscreen toward the bubble's current
// on-screen center, then fires onImpact once it arrives.
function _varianceShield_spawnMeteor(onImpact) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) { if (onImpact) onImpact(null); return; }

    const rect = bubble.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const start = _varianceShield_pickMeteorStart();

    const angleRad = Math.atan2(targetY - start.y, targetX - start.x);
    const angleDeg = angleRad * (180 / Math.PI);

    const meteor = document.createElement('div');
    meteor.className = 'vs-meteor';
    meteor.style.left = `${targetX}px`;
    meteor.style.top = `${targetY}px`;
    meteor.style.setProperty('--start-x', `${start.x - targetX}px`);
    meteor.style.setProperty('--start-y', `${start.y - targetY}px`);
    meteor.style.setProperty('--travel-angle', `${angleDeg}deg`);
    meteor.style.animationDuration = `${VARIANCE_SHIELD_METEOR_FLIGHT_MS}ms`;

    document.body.appendChild(meteor);

    setTimeout(() => {
        meteor.remove();
        if (onImpact) onImpact({ x: targetX, y: targetY });
    }, VARIANCE_SHIELD_METEOR_FLIGHT_MS);
}

// Plays the bubble-shatter animation (used when the last shield stack breaks),
// then removes the bubble from the DOM once the animation finishes.
function _varianceShield_shatterBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    bubble.classList.remove('active');
    bubble.classList.add('shattering');

    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, VARIANCE_SHIELD_SHATTER_MS);
}

// _varianceShield_absorbMistake - call this from game.js at the exact
// moment a free mistake is consumed by the shield (i.e. right where
// window._classFreeMistakes gets decremented), INSTEAD of calling
// _varianceShield_updateVisibility() at that spot. Flies a meteor in
// from offscreen, flashes an impact where it hits, and shatters the
// bubble if that was the last stack.
export function _varianceShield_absorbMistake() {
    const stacksRemaining = window._classFreeMistakes || 0;
    const bubble = document.getElementById('variance-shield-bubble');

    if (bubble) bubble.classList.add('vs-pending-impact');

    _varianceShield_spawnMeteor((impactPoint) => {
        if (bubble) bubble.classList.remove('vs-pending-impact');
        window._vsSuppressAutoHide = false; // meteor resolved - outside visibility syncs can run again

        _varianceShield_playCometImpact(impactPoint);

        if (stacksRemaining <= 0) {
            _varianceShield_shatterBubble();
        }
    });
}
