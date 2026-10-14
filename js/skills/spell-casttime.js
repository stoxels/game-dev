import { Audio_Manager } from '../audio/audio.js';
import { isSkillCharmUnlocked } from './skill-charms.js';
import { activateSkill, canAffordSkill, getSkillCooldownRemaining, getSkillDef, getSkillName, isSkillUsableNow } from './skill-registry.js';
import { endUniversalChannel, fireUniversalChannelTick, getUniversalSpellCastKind, isUniversalMovementSpell, isUniversalSupportSpell } from './universal-spells.js';
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
function _getBaseSkillCastTimeSeconds(skillId) {
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

// True when the skill deals FIRE damage - the tutorial Fireball and every
// universal spell whose def is element: 'fire'. Drives the passive tree's
// fire-only cast speed (see getSkillCastTimeSeconds) and mirrors the
// theme resolution of _holdCastTheme() below, which tints the same spells.
function _isFireSpell(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (!def) return false;
        if (def.element === 'fire') return true;
        if (def.usp) {
            if (def.usp.element === 'fire') return true;
            if (!def.usp.element && def.usp.theme === 'fire') return true;
        }
    } catch (e) { /* unknown skill - treat as non-fire */ }
    return false;
}

// True when the skill deals COLD damage - every universal spell whose def is
// element: 'cold' (or, for a def that only declares the visual theme, the
// 'frost' theme). The cold mirror of _isFireSpell above; drives the passive
// tree's cold-only cast speed.
function _isColdSpell(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (!def) return false;
        if (def.element === 'cold') return true;
        if (def.usp) {
            if (def.usp.element === 'cold') return true;
            if (!def.usp.element && def.usp.theme === 'frost') return true;
        }
    } catch (e) { /* unknown skill - treat as non-cold */ }
    return false;
}

// True when the skill is a LIGHTNING spell - the third sibling of the two above.
// Lightning is one of the four elemental damage types, so both its element and
// its damageKind are checked: support spells declare element: 'lightning'
// (Renewal, Windward, Windstep) while the lightning damage spells (Wrath,
// Serpent Sting) declare damageKind: 'lightning' on a lightning element.
// Drives the passive tree's lightning-only cast speed.
function _isLightningSpell(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (!def) return false;
        if (def.element === 'lightning') return true;
        if (def.damageKind === 'lightning') return true;
        if (def.usp) {
            if (def.usp.element === 'lightning') return true;
            if (def.usp.damageKind === 'lightning') return true;
            if (!def.usp.element && def.usp.theme === 'lightning') return true;
        }
    } catch (e) { /* unknown skill - treat as non-lightning */ }
    return false;
}

export function getSkillCastTimeSeconds(skillId) {
    const base = _getBaseSkillCastTimeSeconds(skillId);
    if (!(base > 0)) return 0;
    let speedPct = 0;
    try {
        if (typeof globalThis._egComputePlayerStats === 'function') {
            const stats = globalThis._egComputePlayerStats();
            speedPct = Number(stats.castSpeedPct) || 0;
            // Fire/cold/lightning-only cast speed (passive tree) stacks on top, but
            // ONLY for spells of that element - every other element keeps the
            // general value.
            if (_isFireSpell(skillId)) {
                const firePct = Number(stats.fireCastSpeedPct);
                if (Number.isFinite(firePct)) speedPct += firePct;
            }
            if (_isColdSpell(skillId)) {
                const coldPct = Number(stats.coldCastSpeedPct);
                if (Number.isFinite(coldPct)) speedPct += coldPct;
            }
            if (_isLightningSpell(skillId)) {
                const lightningPct = Number(stats.lightningCastSpeedPct);
                if (Number.isFinite(lightningPct)) speedPct += lightningPct;
            }
        }
    } catch (e) { /* best-effort - authored cast time */ }
    if (!Number.isFinite(speedPct)) speedPct = 0;
    speedPct = Math.max(-50, Math.min(80, speedPct));
    return Math.max(0.1, base * (1 - speedPct / 100));
}


// Sustained kinds that ride on the hold machinery: 'channel' (fires every
// tick while held, mana drains) and 'charge' (power builds while held, fires
// on release). Null for everything else. Toggles are plain taps.
function _sustainedKind(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (def && def.slotKind === 'universal' && def.usp) {
            const k = getUniversalSpellCastKind(def.usp);
            if (k === 'channel' || k === 'charge') return k;
        }
    } catch (e) { /* plain cast */ }
    return null;
}

function _channelTickSeconds(skillId) {
    try {
        const def = getSkillDef(skillId);
        if (def && def.usp && def.usp.channel && def.usp.channel.tickSeconds > 0) return def.usp.channel.tickSeconds;
    } catch (e) { /* default */ }
    return 0.5;
}

function _chargeConfig(skillId) {
    const dflt = { minFrac: 0.2, minPower: 0.6, maxPower: 1.5 };
    try {
        const def = getSkillDef(skillId);
        if (def && def.usp && def.usp.charge) return Object.assign(dflt, def.usp.charge);
    } catch (e) { /* default */ }
    return dflt;
}

// True when the skill needs hold-to-cast instead of a plain click.
export function isSkillHoldCast(skillId) {
    return getSkillCastTimeSeconds(skillId) > 0.05 || _sustainedKind(skillId) === 'channel';
}


// Live hold state, or null while nothing is charging.
let _holdCast = null;

// True while a hold-to-cast is running: the player is holding a hotbar button
// on a cast-time spell and the cast has neither completed nor been cancelled.
// Combat reads this for cast-gated effects (e.g. avoiding ailments mid-cast).
export function isHoldCasting() {
    return !!_holdCast;
}

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
        if (isUniversal) {
            let encounterOn = false;
            try { encounterOn = (typeof globalThis._egIsActive === 'function') && globalThis._egIsActive(); } catch (e) {}
            if (!encounterOn) return false;
            // Support / movement self-casts only need the live encounter;
            // everything offensive needs a target too.
            let selfCast = false;
            try {
                if (isUniversalSupportSpell(def.usp)) selfCast = true;
                if (isUniversalMovementSpell(def.usp)) selfCast = true;
                // Melee swings need the fight, not a selected target.
                if (getUniversalSpellCastKind(def.usp) === 'melee') selfCast = true;
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

    const mode = _sustainedKind(skillId) || 'cast';
    // cast: the bar fills once. charge: the bar is the charge (full = max
    // power). channel: the bar sweeps once per tick.
    const secs = (mode === 'channel') ? _channelTickSeconds(skillId) : getSkillCastTimeSeconds(skillId);
    const theme = _holdCastTheme(skillId);
    let name = skillId;
    try {
        if (getSkillName(skillId)) name = getSkillName(skillId);
    } catch (e) {}

    _holdCast = {
        skillId, slotIndex, source: source || 'pointer', mode, ticks: 0,
        // a channel fires its first tick on the first frame
        secs, elapsed: (mode === 'channel') ? secs : 0, held: true, lastTs: performance.now(),
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

    Audio_Manager.playSFX('spell_cast_start');
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
    if (h.mode === 'channel') { cancelHoldCast(); return; }   // ends the channel + cooldown
    if (h.mode === 'charge') {
        const frac = Math.min(1, h.elapsed / h.secs);
        if (frac >= _chargeConfig(h.skillId).minFrac) finishChargeCast(h, frac);
        else cancelHoldCast();
        return;
    }
    if (h.elapsed >= h.secs) finishHoldCast();
    else cancelHoldCast();
}


// Cancels the running hold (drag-away, death, manual cancel). Never spends.
export function cancelHoldCast() {
    const h = _holdCast;
    // Only an unfinished cast counts as interrupted (a channel that already
    // fired ends normally below).
    if (h && h.mode !== 'channel') Audio_Manager.playSFX('spell_cast_interrupt');
    _holdCast = null;
    _holdCastHide(true);
    if (h) _holdCastMarkSlot(h.skillId, false);
    // A channel that already fired is a real cast: its cooldown starts now.
    if (h && h.mode === 'channel') {
        try { endUniversalChannel(h.skillId, h.ticks); } catch (e) { /* best-effort */ }
    }
}


// Releases a charge: fires through the normal activation path with the power
// the hold earned (pays mana, starts the cooldown like any other cast).
function finishChargeCast(h, frac) {
    _holdCast = null;
    _holdCastHide(false);
    _holdCastMarkSlot(h.skillId, false);
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
    } catch (e) { return; }
    const c = _chargeConfig(h.skillId);
    const power = c.minPower + (c.maxPower - c.minPower) * frac;
    try {
        activateSkill(h.skillId, { chargePower: power });
    } catch (e) { /* cast is best-effort */ }
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
    if (!paused && h.held) {
        h.elapsed += dt;
        if (h.mode === 'channel') {
            let guard = 0;
            while (h.elapsed >= h.secs && guard++ < 3) {
                h.elapsed -= h.secs;
                let fired = false;
                try { fired = fireUniversalChannelTick(h.skillId, h.ticks === 0); } catch (e) { fired = false; }
                if (!fired) { cancelHoldCast(); return; }
                h.ticks++;
            }
        }
    }
    const p = Math.min(1, h.elapsed / h.secs);
    _holdCastPaint(p, h.theme);
    // Only a plain cast completes by itself; a charge waits for the release.
    if (p >= 1 && h.mode === 'cast') { finishHoldCast(); return; }
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
    // Ice Spear condenses a real spear of ice while held (not a plain orb):
    // the spear canvas rides the orb's own scale transform, so it grows
    // with the charge and pops into the matching flight on release.
    try {
        const def = (_holdCast && _holdCast.skillId) ? getSkillDef(_holdCast.skillId) : null;
        if (def && def.usp && def.usp.id === 'usp_ice_spear') {
            orb.classList.add('spell-charge-spear');
            orb.innerHTML =
                '<div class="egp usp-charge-spear-canvas">' +
                    '<div class="usp-p-lance-vapor"></div>' +
                    '<div class="usp-p-lance-shaft">' +
                        '<div class="usp-p-lance-facet"></div>' +
                    '</div>' +
                    '<div class="usp-p-lance-tip"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-1"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-2"></div>' +
                '</div>';
        }
    } catch (e) { /* plain orb fallback */ }
    if (anchor) {
        orb.style.left = `${anchor.x}px`;
        orb.style.top = `${anchor.y}px`;
    } else {
        orb.style.left = '50%';
        orb.style.top = '40%';
    }
    document.body.appendChild(orb);
    // Discharge gathers an overcharge shell around the caster while held
    // (not a ball): the aura-shell art at a fixed span, intensifying with
    // the hold, popping with the blast on release.
    try {
        const def = (_holdCast && _holdCast.skillId) ? getSkillDef(_holdCast.skillId) : null;
        if (def && def.usp && def.usp.id === 'usp_discharge') {
            _holdCastRemoveShell();
            const shell = document.createElement('div');
            shell.id = 'spell-charge-shell';
            shell.className = 'usp-aura-vortex usp-aura-discharge';
            shell.style.width = '150px';
            shell.style.height = '150px';
            if (anchor) {
                shell.style.left = `${anchor.x}px`;
                shell.style.top = `${anchor.y}px`;
            } else {
                shell.style.left = '50%';
                shell.style.top = '40%';
            }
            shell.innerHTML =
                '<div class="usp-aura-floor"></div>' +
                '<div class="usp-aura-mist"></div>' +
                '<div class="usp-aura-ring"></div>' +
                '<div class="usp-aura-mote usp-aura-mote-1"></div>' +
                '<div class="usp-aura-mote usp-aura-mote-2"></div>' +
                '<div class="usp-aura-mote usp-aura-mote-3"></div>';
            document.body.appendChild(shell);
        }
    } catch (e) { /* shell is cosmetic */ }
    return orb;
}


function _holdCastRemoveOrb() {
    try {
        const old = document.getElementById('spell-charge-orb');
        if (old) old.remove();
    } catch (e) { /* best-effort */ }
}


function _holdCastRemoveShell() {
    try {
        const old = document.getElementById('spell-charge-shell');
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
        // A fully drawn charge glows: it is at maximum power, release any time.
        els.bar.classList.toggle('is-ready', !!_holdCast && _holdCast.mode === 'charge' && p >= 1);
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
            } else if (orb.classList.contains('spell-charge-spear')) {
                // The condensing spear sharpens and glows colder as it grows.
                orb.style.filter = `blur(${Math.max(0, 0.6 - p * 0.4).toFixed(2)}px) drop-shadow(0 0 ${Math.round(8 + p * 20)}px rgba(179,229,252,.95))`;
            }
        }
        // The Discharge shell travels with the avatar and charges up with
        // the hold (same paint loop as the orb, so they never desync).
        const shell = document.getElementById('spell-charge-shell');
        if (shell) {
            const centre = _holdCastAvatarCentre();
            if (centre) {
                shell.style.left = `${centre.x}px`;
                shell.style.top = `${centre.y}px`;
            }
            shell.style.opacity = `${(0.45 + p * 0.55).toFixed(2)}`;
            shell.style.filter = `brightness(${(0.85 + p * 0.6).toFixed(2)}) drop-shadow(0 0 ${Math.round(6 + p * 22)}px rgba(206,147,216,.9))`;
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
        // The shell pops with the blast, fizzles with a cancel.
        const shell = document.getElementById('spell-charge-shell');
        if (shell) {
            if (!cancelled) shell.classList.add('is-pulse');
            setTimeout(() => { try { shell.remove(); } catch (e) {} }, cancelled ? 150 : 480);
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


//------------------------------------------------------------------------
//------------------------GROUND-TARGETED SPELLS--------------------------
//------------------------------------------------------------------------
// The "tap the key, aim with the mouse, click to place it" cast kind (spell
// pass 1). Lives beside the hold-to-cast code because both are "how a spell
// gets from key press to effect".
//
//   1. Tapping the hotbar key arms a targeting reticle in the spell's SHAPE
//      (circle / square / beam / cone) that follows the cursor.
//   2. A left click places the effect; right click, Escape, or tapping any
//      other spell cancels. Cancelling is free - mana and cooldown are only
//      spent when the click lands (universal-spells.js re-runs its normal
//      gates inside the confirm callback).
//   3. While armed, clicks are swallowed in the CAPTURE phase so aiming never
//      fills a puzzle cell by accident (hotbar slots and modals pass through).
//
// This section owns the geometry, the reticle DOM, the click capture and the
// zone visuals, and talks to the spell engine through the callbacks handed to
// beginSpellTargeting(). It also keeps the last known cursor position, which
// the move-to-cursor family (Blink, Dash, Disengage) reads - getCursorPoint().
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-----------------------------CURSOR TRACKING----------------------------
//------------------------------------------------------------------------

let _stgCursor = null;   // { x, y } in viewport px, or null before any movement

function _stgTrackCursor(e) {
    if (typeof e.clientX !== 'number') return;
    _stgCursor = { x: e.clientX, y: e.clientY };
}

// Last known pointer position, or null when the mouse has not moved yet
// (touch-only play) - callers fall back to the walking direction.
export function getCursorPoint() {
    return _stgCursor ? { x: _stgCursor.x, y: _stgCursor.y } : null;
}


//------------------------------------------------------------------------
//--------------------------------GEOMETRY--------------------------------
//------------------------------------------------------------------------
// A shape spec (authored per spell, in "design px"):
//   { kind: 'circle', radius }
//   { kind: 'square', radius }             half-side, so 2r x 2r
//   { kind: 'beam',   length, width }      from the caster through the cursor
//   { kind: 'cone',   length, angle }      apex at the caster, full angle deg
// resolveGroundShape() scales it to the current viewport so a spell covers
// about the same share of the arena on any window size; the reticle and the
// hit test both read the SAME resolved shape, so what you see is what hits.

// Design resolution the authored sizes assume (a typical 16:9 laptop window).
const STG_DESIGN_W = 1366;
const STG_DESIGN_H = 768;

function _stgViewScale() {
    if (typeof window === 'undefined') return 1;
    const s = Math.min(window.innerWidth / STG_DESIGN_W, window.innerHeight / STG_DESIGN_H);
    return Math.max(0.75, Math.min(1.5, s || 1));
}

export function resolveGroundShape(spec) {
    if (!spec) return null;
    const s = _stgViewScale();
    const kind = spec.kind || 'circle';
    switch (kind) {
        case 'square':
            return { kind, radius: (spec.radius || 90) * s };
        case 'beam':
            return { kind, length: (spec.length || 520) * s, width: (spec.width || 70) * s };
        case 'cone':
            return { kind, length: (spec.length || 380) * s, angle: spec.angle || 70 };
        default:
            return { kind: 'circle', radius: (spec.radius || 100) * s };
    }
}

// True when a monster card rect (viewport px, DOMRect-like) overlaps the
// shape. `point` is the aimed position, `origin` the caster (beam / cone).
export function shapeHitsRect(shape, point, origin, r) {
    if (!shape || !point || !r) return false;
    const left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const halfMin = Math.min(right - left, bottom - top) / 2;
    const halfDiag = Math.hypot(right - left, bottom - top) / 2;

    if (shape.kind === 'circle') {
        const nx = Math.max(left, Math.min(point.x, right));
        const ny = Math.max(top, Math.min(point.y, bottom));
        return Math.hypot(point.x - nx, point.y - ny) <= shape.radius;
    }
    if (shape.kind === 'square') {
        return right >= point.x - shape.radius && left <= point.x + shape.radius
            && bottom >= point.y - shape.radius && top <= point.y + shape.radius;
    }
    if (!origin) return false;
    let ux = point.x - origin.x;
    let uy = point.y - origin.y;
    const ulen = Math.hypot(ux, uy);
    if (ulen < 1) { ux = 1; uy = 0; } else { ux /= ulen; uy /= ulen; }
    const vx = cx - origin.x;
    const vy = cy - origin.y;

    if (shape.kind === 'beam') {
        const t = Math.max(0, Math.min(shape.length, vx * ux + vy * uy));
        const px = origin.x + ux * t;
        const py = origin.y + uy * t;
        return Math.hypot(cx - px, cy - py) <= shape.width / 2 + halfMin;
    }
    if (shape.kind === 'cone') {
        const d = Math.hypot(vx, vy);
        if (d > shape.length + halfDiag) return false;
        if (d <= halfDiag) return true;            // sitting on the apex
        const ang = Math.acos(Math.max(-1, Math.min(1, (vx * ux + vy * uy) / d)));
        const slack = Math.asin(Math.min(1, halfDiag / d));
        return (ang - slack) <= (shape.angle * Math.PI / 360);
    }
    return false;
}


//------------------------------------------------------------------------
//------------------------------SHAPE ELEMENTS----------------------------
//------------------------------------------------------------------------

const STG_THEME_COLORS = {
    fire: '#ff7a2f', frost: '#7fd9ff', arcane: '#c792ff', shadow: '#a678ff',
    holy: '#ffd76b', nature: '#7fe0a0', lightning: '#ffe45e',
    blade: '#cfd6e4', arrow: '#b5e07f',
};

// Caster centre in viewport px (beam / cone origin), or null.
export function getAvatarCentre() {
    try {
        if (typeof document === 'undefined') return null;
        const el = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        if (!el) return null;
        if (typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(el);
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } catch (e) { return null; }
}

// Lays an element out as the shape: position, size and rotation. Beam / cone
// are anchored at the caster and rotate towards the aimed point.
function _stgLayoutShape(el, shape, point, origin) {
    el.classList.remove('stg-circle', 'stg-square', 'stg-beam', 'stg-cone');
    el.style.transform = '';
    el.style.clipPath = '';
    if (shape.kind === 'circle' || shape.kind === 'square') {
        const d = shape.radius * 2;
        el.classList.add(shape.kind === 'circle' ? 'stg-circle' : 'stg-square');
        el.style.left = `${point.x - shape.radius}px`;
        el.style.top = `${point.y - shape.radius}px`;
        el.style.width = `${d}px`;
        el.style.height = `${d}px`;
        return;
    }
    const o = origin || point;
    const ang = Math.atan2(point.y - o.y, point.x - o.x);
    if (shape.kind === 'beam') {
        el.classList.add('stg-beam');
        el.style.left = `${o.x}px`;
        el.style.top = `${o.y - shape.width / 2}px`;
        el.style.width = `${shape.length}px`;
        el.style.height = `${shape.width}px`;
    } else {
        const h = 2 * shape.length * Math.tan(shape.angle * Math.PI / 360);
        el.classList.add('stg-cone');
        el.style.left = `${o.x}px`;
        el.style.top = `${o.y - h / 2}px`;
        el.style.width = `${shape.length}px`;
        el.style.height = `${h}px`;
        el.style.clipPath = 'polygon(0 50%, 100% 0, 100% 100%)';
    }
    el.style.transform = `rotate(${ang}rad)`;
}

function _stgThemeColor(theme) {
    return STG_THEME_COLORS[theme] || STG_THEME_COLORS.arcane;
}

// Drops a self-removing zone visual where a ground spell landed.
//   mode 'telegraph'  pulsing warning until `ms`, then gone (delayed spells)
//   mode 'burst'      quick flash (instant blasts)
//   mode 'zone'       steady glowing field for `ms` (damage-over-time ground)
export function showSpellZone(shape, point, origin, theme, ms, mode) {
    if (typeof document === 'undefined' || !shape || !point) return null;
    try {
        const el = document.createElement('div');
        el.className = `stg-zone stg-zone-${mode || 'burst'}`;
        el.style.setProperty('--stg-color', _stgThemeColor(theme));
        _stgLayoutShape(el, shape, point, origin);
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) { /* already gone */ } }, Math.max(200, ms || 700));
        return el;
    } catch (e) { return null; }
}


//------------------------------------------------------------------------
//-------------------------------TARGETING MODE---------------------------
//------------------------------------------------------------------------

let _stgActive = null;   // { id, shape, theme, onConfirm, onCancel, reticle, hint, raf }

// True while the reticle is armed (optionally for one specific spell id).
export function isSpellTargeting(id) {
    if (!_stgActive) return false;
    return id === undefined || _stgActive.id === id;
}

function _stgEnsureReticle() {
    const el = document.createElement('div');
    el.id = 'spell-target-reticle';
    el.className = 'stg-reticle';
    document.body.appendChild(el);
    return el;
}

function _stgPaint() {
    const a = _stgActive;
    if (!a) return;
    const p = _stgCursor || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    _stgLayoutShape(a.reticle, a.shape, p, getAvatarCentre());
    if (a.hint) {
        a.hint.style.left = `${p.x}px`;
        a.hint.style.top = `${p.y}px`;
    }
}

function _stgLoop() {
    if (!_stgActive) return;
    _stgPaint();
    _stgActive.raf = requestAnimationFrame(_stgLoop);
}

// Anything that is not part of the playfield keeps working while aiming: the
// hotbar (tapping another spell swaps / cancels) and open modals.
function _stgPassesThrough(e) {
    const t = e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('#skill-hotbar, .modal-bg, .modal-box, #pause-overlay');
}

// Capture-phase handler for every pointer event while armed.
function _stgOnPointer(e) {
    if (!_stgActive || _stgPassesThrough(e)) return;
    if (e.type === 'pointerdown') {
        _stgTrackCursor(e);
        const a = _stgActive;
        if (e.button === 2) {                    // right click: cancel
            e.preventDefault();
            e.stopImmediatePropagation();
            cancelSpellTargeting();
            return;
        }
        if (e.button === 0) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const point = { x: e.clientX, y: e.clientY };
            _stgEnd(true);
            try { a.onConfirm && a.onConfirm(point); } catch (err) { /* cast is best-effort */ }
            return;
        }
    }
    // Every other pointer / mouse / click event is swallowed so the grid under
    // the reticle never sees the aiming click.
    e.preventDefault();
    e.stopImmediatePropagation();
}

function _stgOnKey(e) {
    if (!_stgActive) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelSpellTargeting();
    }
}

const STG_SWALLOWED_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'auxclick'];

// Tears the mode down. `confirmed` keeps swallowing the trailing mouseup /
// click of the confirming press for a moment so it cannot reach the grid.
function _stgEnd(confirmed) {
    const a = _stgActive;
    if (!a) return;
    _stgActive = null;
    STG_SWALLOWED_EVENTS.forEach((n) => document.removeEventListener(n, _stgOnPointer, true));
    document.removeEventListener('keydown', _stgOnKey, true);
    if (a.raf) cancelAnimationFrame(a.raf);
    try { a.reticle.remove(); } catch (e) { /* already gone */ }
    try { if (a.hint) a.hint.remove(); } catch (e) { /* already gone */ }
    document.body.classList.remove('spell-targeting');

    if (confirmed) {
        const swallow = (ev) => { ev.stopImmediatePropagation(); };
        ['pointerup', 'mouseup', 'click'].forEach((n) => document.addEventListener(n, swallow, true));
        setTimeout(() => {
            ['pointerup', 'mouseup', 'click'].forEach((n) => document.removeEventListener(n, swallow, true));
        }, 350);
    }
}

// Cancels the armed reticle (no cost - nothing was spent yet).
export function cancelSpellTargeting() {
    const a = _stgActive;
    if (!a) return false;
    _stgEnd(false);
    try { a.onCancel && a.onCancel(); } catch (e) { /* best-effort */ }
    return true;
}

// Arms the reticle. Returns true when it armed. Any previous targeting is
// cancelled first (one reticle at a time).
//   opts: { id, spec, theme, name, hint, onConfirm(point), onCancel() }
export function beginSpellTargeting(opts) {
    if (typeof document === 'undefined' || !opts || !opts.spec) return false;
    if (_stgActive) cancelSpellTargeting();
    const shape = resolveGroundShape(opts.spec);
    if (!shape) return false;

    const reticle = _stgEnsureReticle();
    reticle.style.setProperty('--stg-color', _stgThemeColor(opts.theme));
    let hint = null;
    if (opts.hint) {
        hint = document.createElement('div');
        hint.className = 'stg-hint';
        hint.textContent = opts.hint;
        document.body.appendChild(hint);
    }
    _stgActive = {
        id: opts.id, shape, theme: opts.theme,
        onConfirm: opts.onConfirm, onCancel: opts.onCancel,
        reticle, hint, raf: 0,
    };
    STG_SWALLOWED_EVENTS.forEach((n) => document.addEventListener(n, _stgOnPointer, true));
    document.addEventListener('keydown', _stgOnKey, true);
    document.body.classList.add('spell-targeting');
    _stgPaint();
    _stgActive.raf = requestAnimationFrame(_stgLoop);
    return true;
}

//------------------------------------------------------------------------
//--------------------------------BOOTSTRAP-------------------------------
//------------------------------------------------------------------------

if (typeof document !== 'undefined') {
    document.addEventListener('pointermove', _stgTrackCursor, { passive: true, capture: true });
    document.addEventListener('mousemove', _stgTrackCursor, { passive: true, capture: true });
}
