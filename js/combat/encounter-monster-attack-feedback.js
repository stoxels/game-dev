import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { PLAYER_DAMAGE_NUMBER_DURATION_MS, PLAYER_HIT_FLASH_MS } from './encounter-constants.js';
import { _ensurePlayerStatusBar } from './combat-ailments-core.js';
import { _isActive } from './combat-state.js';

// Shows a short miss label above the player avatar.
export function _applyPlayerMissFeedback(silent) {
    if (!silent) Audio_Manager.playSFX('player_dodge');
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-player-damage sx-player-miss';
    label.textContent = t('eg_miss');
    hud.appendChild(label);
    setTimeout(() => label.remove(), PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Shows a short blocked label above the player avatar.
export function _applyPlayerBlockFeedback() {
    Audio_Manager.playSFX('player_block');
    // Reaction strikes (universal-spells.js) open for a few seconds after this.
    try { if (typeof globalThis.noteUniversalReaction === 'function') globalThis.noteUniversalReaction('block'); } catch (e) { /* optional */ }
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-player-damage sx-player-miss';
    label.textContent = t('eg_blocked');
    hud.appendChild(label);
    setTimeout(() => label.remove(), PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Shows a short recovery label for callers that still use block-lockout feedback.
export function _applyPlayerBlockLockoutFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-player-damage sx-player-miss';
    label.textContent = t('eg_block_lockout');
    hud.appendChild(label);
    setTimeout(() => label.remove(), PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Drives the live countdown shown while the player cannot block again.
export let _blockLockoutOverlayTimer = null;

// Shows or refreshes the block-lockout chip in the player status bar.
export function _showBlockLockoutOverlay(durationMs) {
    const bar = (typeof _ensurePlayerStatusBar === 'function')
        ? _ensurePlayerStatusBar()
        : document.body;

    let chip = document.getElementById('sx-block-lockout-overlay');
    if (!chip) {
        // Guard-broken sting, slightly after the block clang so they don't mask each other.
        setTimeout(() => Audio_Manager.playSFX('player_block_lockout'), 180);
        chip = document.createElement('div');
        chip.id = 'sx-block-lockout-overlay';
        chip.className = 'sx-status-chip sx-status-chip-lockout';
        chip.innerHTML = `
            <div class="sx-lockout-icon">🛡️</div>
            <div class="sx-lockout-countdown" id="sx-lockout-countdown">0.0</div>
            <div class="sx-lockout-label">${t('eg_block_lockout')}</div>`;
        bar.appendChild(chip);
    }

    const countdownEl = document.getElementById('sx-lockout-countdown');
    if (countdownEl) countdownEl.textContent = (durationMs / 1000).toFixed(1);

    // Restart the update loop so an overlapping block extends cleanly.
    if (_blockLockoutOverlayTimer) clearInterval(_blockLockoutOverlayTimer);
    _blockLockoutOverlayTimer = setInterval(() => {
        const remaining = globalThis._playerBlockLockoutUntil - Date.now();
        if (remaining <= 0 || !_isActive()) {
            _hideBlockLockoutOverlay();
            return;
        }
        const el = document.getElementById('sx-lockout-countdown');
        if (el) el.textContent = (remaining / 1000).toFixed(1);
    }, 100);
}

// Removes the block-lockout chip and stops its countdown loop.
export function _hideBlockLockoutOverlay() {
    if (_blockLockoutOverlayTimer) {
        clearInterval(_blockLockoutOverlayTimer);
        _blockLockoutOverlayTimer = null;
    }
    const chip = document.getElementById('sx-block-lockout-overlay');
    if (chip) chip.remove();
}

// Applies hit feedback to the player HUD: floating damage number, squish, and glow.
export function _applyPlayerHitFeedback(damageValue, isCrit, element) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Floating damage label - crits and elemental hits get extra emphasis.
    const dmgLabel = document.createElement('div');
    let cls = 'sx-player-damage';
    if (isCrit) cls += ' sx-dmg-crit';
    if (element) {
        const map = { fire: 'sx-dmg-fire', cold: 'sx-dmg-cold', lightning: 'sx-dmg-lightning', shadow: 'sx-dmg-shadow' };
        if (map[element]) cls += ' ' + map[element];
    }
    dmgLabel.className = cls;
    dmgLabel.textContent = `-${damageValue}`;
    // Slight random horizontal jitter so stacked hits do not perfectly overlap.
    dmgLabel.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    hud.appendChild(dmgLabel);
    setTimeout(() => dmgLabel.remove(), PLAYER_DAMAGE_NUMBER_DURATION_MS);

    // Squish and red-glow flash; critical hits shake harder.
    if (isCrit) {
        hud.style.transform = 'scale(0.92)';
        hud.style.boxShadow = 'inset 0 0 22px rgba(255,40,40,0.95), 0 0 22px rgba(255,0,0,0.95)';
        if (hud.animate) {
            hud.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(-4px)' },
                { transform: 'translateX(0)' }
            ], { duration: 180, easing: 'ease-out' });
        }
    } else {
        hud.style.transform = 'scale(0.95)';
        hud.style.boxShadow = 'inset 0 0 15px rgba(255,0,0,0.8), 0 0 15px rgba(255,0,0,0.8)';
    }
    setTimeout(() => { hud.style.transform = ''; hud.style.boxShadow = ''; }, isCrit ? 220 : PLAYER_HIT_FLASH_MS);

    Audio_Manager.playSFX('player_damage_taken');
    // Crits layer a heavier accent on top of the base hit sound.
    if (isCrit) Audio_Manager.playSFX('player_crit_taken');
}

// Healing numbers: every Life gain (any source) writes playerCurrentHP, whose
// setter in state.js reports the gain here. Gains landing within a short
// window merge into one green "+N" over the avatar. Continuous regeneration
// (encounter-tick.js sets _healSilent around its tick) and anything outside
// an active encounter stay silent.
let _healPending = 0;
let _healTimer = null;
globalThis.__onPlayerHeal = function (amount) {
    // Cosmetic only: a failure here must never break the heal itself.
    try { if (globalThis._healSilent || !_isActive()) return; } catch (e) { return; }
    _healPending += amount;
    if (_healTimer) return;
    _healTimer = setTimeout(() => {
        _healTimer = null;
        const n = Math.round(_healPending);
        _healPending = 0;
        const hud = document.getElementById('player-avatar-wrapper');
        if (n < 1 || !hud) return;
        const label = document.createElement('div');
        label.className = 'sx-player-damage sx-player-heal';
        label.textContent = `+${n}`;
        label.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
        hud.appendChild(label);
        setTimeout(() => label.remove(), PLAYER_DAMAGE_NUMBER_DURATION_MS);
    }, 250);
};
