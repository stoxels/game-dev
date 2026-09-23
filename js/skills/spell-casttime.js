import { isSkillCharmUnlocked } from './skill-charms.js';
import { activateSkill, canAffordSkill, getSkillCooldownRemaining, getSkillDef, getSkillName, isSkillUsableNow } from './skill-registry.js';
import { isUniversalMovementSpell, isUniversalSupportSpell } from './universal-spells.js';
// spell-casttime.js
//------------------------------------------------------------------------
//----------------------HOLD-TO-CAST (CAST BAR)---------------------------
//------------------------------------------------------------------------
// World-of-Warcraft style cast times for the heavy spells. A spell whose
// def carries `castTimeSeconds` (see UNIVERSAL_SPELL_DEFS + the tutorial
// Fireball) cannot be fired with a quick click: the button - hotbar slot
// click OR bound key - must be HELD until the cast bar fills. Releasing
// early cancels the cast for free (no mana, no cooldown); once the bar is
// full the spell fires through the normal activation path, which pays mana
// and starts the cooldown exactly like an instant cast.
//
// While the bar fills, a themed charge orb grows over the player avatar -
// e.g. the Fireball visibly swells while held, then launches as the normal
// projectile when the cast completes.
//
// Wiring:
//   skill-hotbar.js pointerdown routes press-and-hold through
//     tryBeginHoldCast(skillId, slotIndex, 'pointer') and swallows the
//     follow-up click while a hold took over.
//   skill-hotbar.js keybind handlers route keydown through
//     tryBeginHoldCast(skillId, slotIndex, 'key'); the keyup listener below
//     releases the hold. Key auto-repeat never restarts a cast.
// Instant spells (no castTimeSeconds) are untouched: tryBeginHoldCast
// returns 'instant' and the caller runs the normal activation.
//------------------------------------------------------------------------


// Cast time of a skill in seconds (0 = instant). Reads the registry copy
// first (universal spells mirror their def's castTimeSeconds there, the
// Fireball carries its own), then falls back to parsing a '1.2s' string.
export function getSkillCastTimeSeconds(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (!def) return 0;
        if (typeof def.castTimeSeconds === 'number' && def.castTimeSeconds > 0) {
            return def.castTimeSeconds;
        }
        if (def.usp && typeof def.usp.castTimeSeconds === 'number' && def.usp.castTimeSeconds > 0) {
            return def.usp.castTimeSeconds;
        }
        if (typeof def.castTime === 'string') {
            const m = def.castTime.match(/([\d.]+)\s*s/);
            if (m) return Math.max(0, Number(m[1]) || 0);
        }
    } catch (e) { /* best-effort - instant on failure */ }
    return 0;
}


// True when the skill needs hold-to-cast instead of a plain click.
export function isSkillHoldCast(skillId) {
    return getSkillCastTimeSeconds(skillId) > 0.05;
}


// Live hold state, or null while nothing is charging.
let _holdCast = null;

// Normalised keys currently driving a keyboard hold (blocks key-repeat
// from restarting a cast while the key stays down).
const _heldCastKeys = new Set();

// Theme → charge-orb / cast-bar tint. Falls back to arcane violet.
const SPELL_CAST_THEME_COLORS = {
    fire: '#ff7a2f', frost: '#7fd9ff', arcane: '#c792ff', shadow: '#a678ff',
    holy: '#ffd76b', nature: '#7fe0a0', lightning: '#ffe45e',
    blade: '#cfd6e4', arrow: '#b5e07f',
};


// Resolves the visual theme of a skill (fireball → fire, universal → its
// theme, everything else → arcane).
function _holdCastTheme(skillId) {
    try {
        if (skillId === 'fireball') return 'fire';
        const def = getSkillDef(skillId);
        if (def && def.usp && def.usp.theme) return def.usp.theme;
    } catch (e) { /* fall through */ }
    return 'arcane';
}


// Pre-gate check for starting a hold: mirrors the refusal rules of the real
// cast paths (cooldown, affordability, encounter/target) WITHOUT spending
// anything or showing toasts - on failure the caller falls through to the
// normal activation, which reports the reason itself.
function _holdCastCanBegin(skillId) {
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return false;
        if (!isSkillUsableNow(skillId)) return false;
        if (!isSkillCharmUnlocked(skillId)) return false;
        if (getSkillCooldownRemaining(skillId) > 0) return false;
        if (!canAffordSkill(skillId)) return false;

        const def = getSkillDef(skillId);
        const isUniversal = !!def && def.slotKind === 'universal';
        const isFireball = skillId === 'fireball';
        if (isUniversal || isFireball) {
            let encounterOn = false;
            try { encounterOn = (typeof globalThis._egIsActive === 'function') && globalThis._egIsActive(); } catch (e) {}
            if (!encounterOn) return false;
            // Support / movement self-casts only need the live encounter;
            // everything offensive needs a target too.
            let selfCast = false;
            try {
                if (isUniversalSupportSpell(def.usp)) selfCast = true;
                if (isUniversalMovementSpell(def.usp)) selfCast = true;
            } catch (e) {}
            if (!selfCast) {
                let target = null;
                try { target = (typeof globalThis._egGetTarget === 'function') ? globalThis._egGetTarget() : null; } catch (e) {}
                if (!target) return false;
            }
        }
    } catch (e) { return false; }
    return true;
}


// Begins (or reuses) a hold-to-cast for the skill in a hotbar slot.
// source: 'pointer' | 'key'.
// Returns:
//   'instant'  - not a hold spell; caller runs the normal activation.
//   'started'  - hold began (caller must swallow the click/keypress).
//   'casting'  - already charging this skill (key-repeat); swallow.
//   'refused'  - hold spell, but a pre-gate failed; caller runs the normal
//                activation so the player gets the usual toast.
export function tryBeginHoldCast(skillId, slotIndex, source) {
    if (!skillId || !isSkillHoldCast(skillId)) return 'instant';
    if (_holdCast && _holdCast.skillId === skillId) return 'casting';
    // One cast at a time: a new press replaces a stale hold (nothing was
    // spent yet, so replacing is free).
    if (_holdCast) cancelHoldCast();
    if (!_holdCastCanBegin(skillId)) return 'refused';

    const secs = getSkillCastTimeSeconds(skillId);
    const theme = _holdCastTheme(skillId);
    let name = skillId;
    try {
        if (getSkillName(skillId)) name = getSkillName(skillId);
    } catch (e) {}

    _holdCast = {
        skillId, slotIndex, source: source || 'pointer',
        secs, elapsed: 0, held: true, lastTs: performance.now(),
        raf: null, name, theme,
        startX: null, startY: null,
    };
    try {
        if (source === 'pointer' && typeof window !== 'undefined' && window.event
            && typeof window.event.clientX === 'number') {
            _holdCast.startX = window.event.clientX;
            _holdCast.startY = window.event.clientY;
        }
    } catch (e) {}

    _holdCastShow(name, theme);
    _holdCastMarkSlot(skillId, true);
    _holdCast.raf = requestAnimationFrame(_holdCastTick);
    return 'started';
}


// Releases a hold: with source/key matching. Called on pointerup / keyup.
// A full bar finishes the cast; anything less cancels it for free.
function releaseHoldCast(source, slotIndex) {
    const h = _holdCast;
    if (!h || h.source !== source) return;
    if (typeof slotIndex === 'number' && h.slotIndex !== slotIndex) return;
    h.held = false;
    if (h.elapsed >= h.secs) finishHoldCast();
    else cancelHoldCast();
}


// Cancels the running hold (drag-away, death, manual cancel). Never spends.
function cancelHoldCast() {
    const h = _holdCast;
    _holdCast = null;
    _holdCastHide(true);
    if (h) _holdCastMarkSlot(h.skillId, false);
}


// Completes the cast: tears down the visuals, then fires through the normal
// activation path (pays mana, starts cooldown, launches the projectile).
function finishHoldCast() {
    const h = _holdCast;
    _holdCast = null;
    _holdCastHide(false);
    if (h) _holdCastMarkSlot(h.skillId, false);
    if (!h) return;
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
    } catch (e) { return; }
    try {
        activateSkill(h.skillId);
    } catch (e) { /* cast is best-effort */ }
}


// Frame driver: progress only accrues while the button is still held
// (pause/death freeze or cancel; release-early is handled by the input
// listeners, which flip held/cancel directly).
function _holdCastTick() {
    const h = _holdCast;
    if (!h) return;
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) { cancelHoldCast(); return; }
    } catch (e) { cancelHoldCast(); return; }
    let paused = false;
    try { paused = (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused); } catch (e) {}
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - h.lastTs) / 1000));
    h.lastTs = now;
    if (!paused && h.held) h.elapsed += dt;
    const p = Math.min(1, h.elapsed / h.secs);
    _holdCastPaint(p, h.theme);
    if (p >= 1) { finishHoldCast(); return; }
    h.raf = requestAnimationFrame(_holdCastTick);
}


//------------------------------------------------------------------------
//-------------------------CAST BAR + CHARGE ORB--------------------------
//------------------------------------------------------------------------

// Builds (once) the WoW-style cast bar pinned above the avatar's health bar.
function _holdCastBarEls() {
    let bar = document.getElementById('spell-castbar');
    if (bar) {
        return {
            bar,
            fill: bar.querySelector('.spell-castbar-fill'),
            spark: bar.querySelector('.spell-castbar-spark'),
            name: bar.querySelector('.spell-castbar-name'),
            icon: bar.querySelector('.spell-castbar-icon'),
        };
    }
    bar = document.createElement('div');
    bar.id = 'spell-castbar';
    bar.className = 'spell-castbar';
    bar.innerHTML =
        '<div class="spell-castbar-head">'
        + '<span class="spell-castbar-icon"></span>'
        + '<span class="spell-castbar-name"></span>'
        + '</div>'
        + '<div class="spell-castbar-track">'
        + '<div class="spell-castbar-fill"></div>'
        + '<div class="spell-castbar-spark"></div>'
        + '</div>';
    document.body.appendChild(bar);
    return {
        bar,
        fill: bar.querySelector('.spell-castbar-fill'),
        spark: bar.querySelector('.spell-castbar-spark'),
        name: bar.querySelector('.spell-castbar-name'),
        icon: bar.querySelector('.spell-castbar-icon'),
    };
}

// Positions the cast bar directly above the avatar's bar stack (HP bar is
// the stack's first row), so it reads as one more bar in that stack.
function _holdCastPositionBar() {
    const bar = document.getElementById('spell-castbar');
    if (!bar) return;
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!avatar) return;
    // Anchor to the first bar row when it exists (monster-level avatar);
    // otherwise fall back to the whole avatar wrapper.
    const hpWrap = avatar.querySelector('#avatar-hp-text')?.parentElement;
    const anchor = (hpWrap && hpWrap.getBoundingClientRect().width > 0) ? hpWrap : avatar;
    const rect = anchor.getBoundingClientRect();
    // Sit the whole bar (label + track) fully above the anchor row with a
    // 4px gap - matching the stack's own 4px row spacing.
    bar.style.left = `${rect.left + rect.width / 2}px`;
    bar.style.top = `${Math.round(rect.top - bar.offsetHeight - 4)}px`;
}


// Builds the charging orb that swells over the avatar while held. The
// fireball (and every other projectile spell) visibly grows here, then the
// real projectile launches from the avatar on completion.
function _holdCastOrbEl(theme) {
    _holdCastRemoveOrb();
    const anchor = _holdCastAvatarCentre();
    const orb = document.createElement('div');
    orb.id = 'spell-charge-orb';
    orb.className = `spell-charge-orb spell-charge-orb-${theme || 'arcane'}`;
    const color = SPELL_CAST_THEME_COLORS[theme] || SPELL_CAST_THEME_COLORS.arcane;
    orb.style.setProperty('--cast-color', color);
    if (anchor) {
        orb.style.left = `${anchor.x}px`;
        orb.style.top = `${anchor.y}px`;
    } else {
        orb.style.left = '50%';
        orb.style.top = '40%';
    }
    document.body.appendChild(orb);
    return orb;
}


function _holdCastRemoveOrb() {
    try {
        const old = document.getElementById('spell-charge-orb');
        if (old) old.remove();
    } catch (e) { /* best-effort */ }
}


// Avatar centre in viewport coordinates (same anchors the projectiles use).
function _holdCastAvatarCentre() {
    try {
        if (typeof globalThis._egGetElementCentre !== 'function') return null;
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        if (!avatar) return null;
        return globalThis._egGetElementCentre(avatar);
    } catch (e) { return null; }
}


function _holdCastShow(name, theme) {
    try {
        const els = _holdCastBarEls();
        const color = SPELL_CAST_THEME_COLORS[theme] || SPELL_CAST_THEME_COLORS.arcane;
        els.bar.style.setProperty('--cast-color', color);
        if (els.name) els.name.textContent = name;
        try {
            const def = getSkillDef(_holdCast.skillId);
            if (els.icon) els.icon.textContent = (def && def.icon) || '✦';
        } catch (e) { if (els.icon) els.icon.textContent = '✦'; }
        els.bar.classList.add('show');
        _holdCastPositionBar();
        _holdCastOrbEl(theme);
        _holdCastPaint(0, theme);
    } catch (e) { /* visuals are best-effort */ }
}


// Paints one frame: bar fill + spark position + orb growth. The orb scales
// from a small ember to a full boulder as progress → 1. Fire spells add a
// hotter outer flicker that intensifies with charge.
function _holdCastPaint(p, theme) {
    try {
        const els = _holdCastBarEls();
        if (els.fill) els.fill.style.width = `${Math.round(p * 100)}%`;
        if (els.spark) els.spark.style.left = `${Math.round(p * 100)}%`;
        _holdCastPositionBar();
        const orb = document.getElementById('spell-charge-orb');
        if (orb) {
            const s = 0.45 + p * 1.65;
            orb.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
            orb.style.opacity = `${(0.55 + p * 0.45).toFixed(2)}`;
            // Track the avatar every frame so the swelling orb travels with
            // the player while they move during the hold (the orb is
            // position:fixed, so it must be re-anchored each paint).
            const centre = _holdCastAvatarCentre();
            if (centre) {
                orb.style.left = `${centre.x}px`;
                orb.style.top = `${centre.y}px`;
            }
            if (orb.classList.contains('spell-charge-orb-fire')) {
                orb.style.filter = `blur(${Math.max(0, 0.8 - p * 0.4).toFixed(2)}px) drop-shadow(0 0 ${Math.round(10 + p * 18)}px var(--cast-color))`;
            }
        }
    } catch (e) { /* best-effort */ }
}


// Hides the bar; on cancel the orb fizzles, on completion it pops (the real
// projectile takes over from the avatar at the same moment).
function _holdCastHide(cancelled) {
    try {
        const bar = document.getElementById('spell-castbar');
        if (bar) bar.classList.remove('show');
        const orb = document.getElementById('spell-charge-orb');
        if (orb) {
            if (!cancelled) {
                orb.classList.add('is-fired');
                setTimeout(() => { try { orb.remove(); } catch (e) {} }, 180);
            } else {
                orb.classList.add('is-fizzle');
                setTimeout(() => { try { orb.remove(); } catch (e) {} }, 150);
            }
        }
    } catch (e) { /* best-effort */ }
}


// Toggles the charging state on the hotbar slot(s) bound to the skill.
function _holdCastMarkSlot(skillId, on) {
    try {
        const bar = document.getElementById('skill-hotbar');
        if (!bar) return;
        bar.querySelectorAll(`.skill-hotbar-slot[data-skill="${skillId}"]`)
            .forEach((el) => el.classList.toggle('is-casting', !!on));
    } catch (e) { /* best-effort */ }
}


//------------------------------------------------------------------------
//---------------------------INPUT LISTENERS------------------------------
//------------------------------------------------------------------------

// Keyboard release: the keybind keydown path (skill-hotbar.js) starts the
// hold; this ends it. Auto-repeat keydowns never reach here (keyup only).
function _holdCastKeyup(e) {
    const h = _holdCast;
    if (!h || h.source !== 'key' || typeof h.slotIndex !== 'number') return;
    try {
        if (typeof globalThis.keybindMatches === 'function' && !globalThis.keybindMatches(e, `hotbar-${h.slotIndex + 1}`)) return;
    } catch (err) { return; }
    try {
        if (typeof globalThis._keybindNormalize === 'function') _heldCastKeys.delete(globalThis._keybindNormalize(e));
    } catch (err) {}
    releaseHoldCast('key', h.slotIndex);
}


// Pointer release anywhere (the press may have slid off the slot) and
// drag-away cancel (a press that moves becomes a hotbar drag, not a cast).
function _holdCastPointerUp() {
    if (_holdCast && _holdCast.source === 'pointer') {
        releaseHoldCast('pointer', _holdCast.slotIndex);
    }
}


function _holdCastPointerMove(e) {
    const h = _holdCast;
    if (!h || h.source !== 'pointer') return;
    if (h.startX === null || h.startY === null) return;
    try {
        const dx = (e.clientX || 0) - h.startX;
        const dy = (e.clientY || 0) - h.startY;
        if (Math.hypot(dx, dy) > 8) cancelHoldCast();
    } catch (err) { /* best-effort */ }
}


// Forget a keyboard hold when its key is released anywhere (safety net for
// the repeat guard, kept in sync by _holdCastKeyup).
function _holdCastKeydownForget(e) {
    try {
        if (_holdCast && _holdCast.source === 'key' && typeof globalThis._keybindNormalize === 'function') {
            _heldCastKeys.add(globalThis._keybindNormalize(e));
        }
    } catch (err) { /* best-effort */ }
}


if (typeof document !== 'undefined' && !window._spellCasttimeWired) {
    window._spellCasttimeWired = true;
    document.addEventListener('keyup', _holdCastKeyup, { capture: true });
    document.addEventListener('pointerup', _holdCastPointerUp, { capture: true });
    document.addEventListener('pointercancel', _holdCastPointerUp, { capture: true });
    document.addEventListener('pointermove', _holdCastPointerMove, { capture: true });
    document.addEventListener('keydown', _holdCastKeydownForget, { capture: true });
}
