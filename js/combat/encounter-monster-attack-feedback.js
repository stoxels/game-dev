import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_PLAYER_DAMAGE_NUMBER_DURATION_MS, EG_PLAYER_HIT_FLASH_MS } from './encounter-constants.js';
import { _egEnsurePlayerStatusBar } from './combat-ailments-core.js';
import { _egIsActive } from './combat-state.js';

// Shows a short miss label above the player avatar.
export function _egApplyPlayerMissFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_miss');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Shows a short blocked label above the player avatar.
export function _egApplyPlayerBlockFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_blocked');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Shows a short recovery label for callers that still use block-lockout feedback.
export function _egApplyPlayerBlockLockoutFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_block_lockout');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Drives the live countdown shown while the player cannot block again.
export let _egBlockLockoutOverlayTimer = null;

// Shows or refreshes the block-lockout chip in the player status bar.
export function _egShowBlockLockoutOverlay(durationMs) {
    const bar = (typeof _egEnsurePlayerStatusBar === 'function')
        ? _egEnsurePlayerStatusBar()
        : document.body;

    let chip = document.getElementById('eg-block-lockout-overlay');
    if (!chip) {
        chip = document.createElement('div');
        chip.id = 'eg-block-lockout-overlay';
        chip.className = 'eg-status-chip eg-status-chip-lockout';
        chip.innerHTML = `
            <div class="eg-lockout-icon">🛡️</div>
            <div class="eg-lockout-countdown" id="eg-lockout-countdown">0.0</div>
            <div class="eg-lockout-label">${t('eg_block_lockout')}</div>`;
        bar.appendChild(chip);
    }

    const countdownEl = document.getElementById('eg-lockout-countdown');
    if (countdownEl) countdownEl.textContent = (durationMs / 1000).toFixed(1);

    // Restart the update loop so an overlapping block extends cleanly.
    if (_egBlockLockoutOverlayTimer) clearInterval(_egBlockLockoutOverlayTimer);
    _egBlockLockoutOverlayTimer = setInterval(() => {
        const remaining = globalThis._egPlayerBlockLockoutUntil - Date.now();
        if (remaining <= 0 || !_egIsActive()) {
            _egHideBlockLockoutOverlay();
            return;
        }
        const el = document.getElementById('eg-lockout-countdown');
        if (el) el.textContent = (remaining / 1000).toFixed(1);
    }, 100);
}

// Removes the block-lockout chip and stops its countdown loop.
export function _egHideBlockLockoutOverlay() {
    if (_egBlockLockoutOverlayTimer) {
        clearInterval(_egBlockLockoutOverlayTimer);
        _egBlockLockoutOverlayTimer = null;
    }
    const chip = document.getElementById('eg-block-lockout-overlay');
    if (chip) chip.remove();
}

// Applies hit feedback to the player HUD: floating damage number, squish, and glow.
export function _egApplyPlayerHitFeedback(damageValue, isCrit, element) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Floating damage label - crits and elemental hits get extra emphasis.
    const dmgLabel = document.createElement('div');
    let cls = 'eg-player-damage';
    if (isCrit) cls += ' eg-dmg-crit';
    if (element) {
        const map = { fire: 'eg-dmg-fire', cold: 'eg-dmg-cold', lightning: 'eg-dmg-lightning', shadow: 'eg-dmg-shadow' };
        if (map[element]) cls += ' ' + map[element];
    }
    dmgLabel.className = cls;
    dmgLabel.textContent = `-${damageValue}`;
    // Slight random horizontal jitter so stacked hits do not perfectly overlap.
    dmgLabel.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    hud.appendChild(dmgLabel);
    setTimeout(() => dmgLabel.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);

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
    setTimeout(() => { hud.style.transform = ''; hud.style.boxShadow = ''; }, isCrit ? 220 : EG_PLAYER_HIT_FLASH_MS);

    Audio_Manager.playSFX('player_damage_taken');
}
