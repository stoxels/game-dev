// Sequenced delivery for released melee overcharge arts. The avatar visibly
// travels to each victim and returns home; damage remains owned by
// encounter-melee-arts.js and is never gated by this presentation layer.

import { _egGetElementCentre } from './combat-class-projectiles.js';

//------------------------------------------------------------------------
//-------------------SEQUENCED DELIVERY (visible arts)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Frozen timing bands for the outbound dash, arrival beat, sky leap, and
// return glide. Every flight has a safety fallback and resolves rather than
// rejecting, so presentation can never strand the gameplay follow-through.
export const EG_MELEE_DELIVERY_OUT_MIN_MS = 550;
export const EG_MELEE_DELIVERY_OUT_MAX_MS = 1150;
export const EG_MELEE_DELIVERY_ARRIVAL_BEAT_MS = 170;
export const EG_MELEE_DELIVERY_RETURN_MS = 550;
export const EG_MELEE_DELIVERY_LEAP_MS = 700;

function _egMeleeReducedMotion() {
    try {
        return !!(typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
}

// True when a sequenced delivery can be seen: the avatar and target card
// exist, WAAPI is available, and reduced motion is not active.
export function _egMeleeDeliveryAvailable(targetId) {
    try {
        if (typeof document === 'undefined') return false;
        if (_egMeleeReducedMotion()) return false;
        const avatar = document.getElementById('player-avatar-wrapper');
        const card = (targetId != null) ? document.getElementById(`eg-card-${targetId}`) : null;
        if (!avatar || !card) return false;
        if (typeof avatar.animate !== 'function') return false;
        return true;
    } catch (e) { return false; }
}

function _egMeleeWaitMs(ms) {
    return new Promise((resolve) => {
        try { setTimeout(resolve, Math.max(0, ms || 0)); }
        catch (e) { resolve(); }
    });
}

// Cancels in-flight avatar motion so each awaited leg starts from the
// laid-out position. Only already-active presentation is cut short.
function _egMeleeSnapAvatar() {
    try {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (avatar && typeof avatar.getAnimations === 'function') {
            avatar.getAnimations().forEach((a) => { try { a.cancel(); } catch (e) {} });
        }
    } catch (e) {}
}

// Last visual offset from _egMeleeFlyLeg. The return glide starts from this
// parked position; this state never gates damage.
let _egMeleeParkedOffset = { x: 0, y: 0 };

// Moves the avatar from its laid-out spot toward the target card. Arc lifts
// the midpoint and scale grows the sprite; a safety timeout always resolves.
function _egMeleeFlyLeg(targetId, durationMs, arc, scale) {
    try {
        const avatar = document.getElementById('player-avatar-wrapper');
        const card = (targetId != null) ? document.getElementById(`eg-card-${targetId}`) : null;
        if (!avatar || !card || typeof avatar.animate !== 'function') return Promise.resolve();
        _egMeleeSnapAvatar();
        const a = _egGetElementCentre(avatar);
        const b = _egGetElementCentre(card);
        // Aim to land ON the card, slightly short so the sprite overlaps
        // its edge instead of hiding dead-centre behind it.
        const dx = (b.x - a.x) * 0.82, dy = (b.y - a.y) * 0.82;
        const dur = Math.max(120, Math.round(durationMs || 600));
        const x1 = dx.toFixed(1), y1 = dy.toFixed(1);
        const s1 = (scale && scale > 1) ? scale : 1;
        let frames;
        if (arc && arc > 0) {
            frames = [
                { transform: 'translate(0px, 0px) scale(1)' },
                { transform: `translate(${(dx / 2).toFixed(1)}px, ${(dy / 2 - arc).toFixed(1)}px) scale(${((1 + s1) / 2).toFixed(3)})` },
                { transform: `translate(${x1}px, ${y1}px) scale(${s1})` },
            ];
        } else {
            frames = [
                { transform: 'translate(0px, 0px) scale(1)' },
                { transform: `translate(${x1}px, ${y1}px) scale(${s1})` },
            ];
        }
        _egMeleeParkedOffset = { x: dx, y: dy };
        let anim = null;
        try { anim = avatar.animate(frames, { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' }); }
        catch (e) { return Promise.resolve(); }
        return new Promise((resolve) => {
            let done = false;
            const fin = () => { if (!done) { done = true; resolve(); } };
            try {
                if (anim && 'onfinish' in Object(anim)) anim.onfinish = fin;
                else if (anim && anim.finished && typeof anim.finished.then === 'function') anim.finished.then(fin, fin);
                else fin();
            } catch (e) { fin(); }
            setTimeout(fin, dur + 400);
        });
    } catch (e) { return Promise.resolve(); }
}

// Raises the avatar above monster cards for a flight and returns a
// re-entrant restore function. Failure leaves the current style untouched.
export function _egMeleeRaiseAvatar() {
    try {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (!avatar) return () => {};
        if (avatar.dataset && avatar.dataset.egMeleeRaised === '1') return () => {};
        if (avatar.dataset) avatar.dataset.egMeleeRaised = '1';
        const prev = avatar.style.zIndex;
        avatar.style.zIndex = '9999';
        let done = false;
        return () => {
            if (done) return;
            done = true;
            try {
                if (avatar.dataset) delete avatar.dataset.egMeleeRaised;
                avatar.style.zIndex = prev;
            } catch (e) {}
        };
    } catch (e) { return () => {}; }
}

// Moves the avatar to the primary target at a readable pace, then holds
// the frozen arrival beat before the caller applies the impact.
export function _egMeleeDashOut(targetId) {
    try {
        const avatar = document.getElementById('player-avatar-wrapper');
        const card = (targetId != null) ? document.getElementById(`eg-card-${targetId}`) : null;
        if (!avatar || !card) return Promise.resolve();
        const a = _egGetElementCentre(avatar);
        const b = _egGetElementCentre(card);
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 0;
        const dur = Math.min(EG_MELEE_DELIVERY_OUT_MAX_MS,
            Math.max(EG_MELEE_DELIVERY_OUT_MIN_MS, Math.round(420 + dist * 0.55)));
        return _egMeleeFlyLeg(targetId, dur, 0, 1.08)
            .then(() => _egMeleeWaitMs(EG_MELEE_DELIVERY_ARRIVAL_BEAT_MS));
    } catch (e) { return Promise.resolve(); }
}

// Moves the avatar along the frozen high arc to the secondary victim.
export function _egMeleeLeapTo(victimId) {
    return _egMeleeFlyLeg(victimId, EG_MELEE_DELIVERY_LEAP_MS, 110, 1.18);
}

// Returns the avatar from its parked offset to the laid-out position.
export function _egMeleeGlideHome() {
    try {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (!avatar || typeof avatar.animate !== 'function') {
            _egMeleeParkedOffset = { x: 0, y: 0 };
            return Promise.resolve();
        }
        const ox = _egMeleeParkedOffset.x || 0, oy = _egMeleeParkedOffset.y || 0;
        _egMeleeParkedOffset = { x: 0, y: 0 };
        if (Math.hypot(ox, oy) < 1) {
            _egMeleeSnapAvatar();
            return Promise.resolve();
        }
        const dur = EG_MELEE_DELIVERY_RETURN_MS;
        let anim = null;
        try {
            anim = avatar.animate([
                { transform: `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)` },
                { transform: 'translate(0px, 0px)' },
            ], { duration: dur, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' });
        } catch (e) { _egMeleeSnapAvatar(); return Promise.resolve(); }
        return new Promise((resolve) => {
            let done = false;
            const fin = () => {
                if (!done) { done = true; _egMeleeSnapAvatar(); resolve(); }
            };
            try {
                if (anim && 'onfinish' in Object(anim)) anim.onfinish = fin;
                else if (anim && anim.finished && typeof anim.finished.then === 'function') anim.finished.then(fin, fin);
                else fin();
            } catch (e) { fin(); }
            setTimeout(fin, dur + 400);
        });
    } catch (e) { return Promise.resolve(); }
}
