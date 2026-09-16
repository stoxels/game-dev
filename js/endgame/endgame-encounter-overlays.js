//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { t } from '../translation/translations.js';
import { _egEndMapDefeated } from './endgame-encounter-chain.js';
import { _egGetMistakesRemaining } from './endgame-encounter-tick.js';
import { _egIsActive } from './endgame-state.js';
import { _egClearCenterGridBanners } from '../timer.js';


//  endgame-encounter-overlays.js
//  WARNINGS & FAIL OVERLAYS - extracted 2026-09-10 from
//  endgame-encounter.js (mistakes / low-health / absorption-broken
//  banners + the map-failed overlay interceptor). Loads AFTER
//  endgame-encounter-tick.js (uses its _egClearCenterGridBanners
//  fallback guard).
//
export function _egShowMistakesWarningBanner(remaining) {
    // Dismiss any other center-grid banner so concurrent events don't stack
    _egClearCenterGridBanners('eg-mistakes-warning-banner');
    // Remove any stale banner so a rapid 3→2→1 cascade always shows the newest count
    const old = document.getElementById('eg-mistakes-warning-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-mistakes-warning-banner';
    // Severity class drives color + shake for 0 remaining
    const sev = Math.max(0, Math.min(3, remaining));
    el.className = `eg-mw-${sev}`;

    // Translation key per threshold - falls back to a plain string if missing
    const key = `eg_mistakes_warning_${sev}`;
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = remaining === 0 ? '☠️ LAST CHANCE - 0 MISTAKES LEFT!'
        : remaining === 1 ? '⚠️ 1 MISTAKE LEFT!'
        : `⚠️ ${remaining} MISTAKES LEFT`;
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    // Center over the puzzle grid (fallback: viewport center)
    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    // Toast counterpart - brief, color-coded by severity
    const toastKey = `eg_mistakes_warning_toast_${sev}`;
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    const toastColors = { 3: '#facc15', 2: '#fb923c', 1: '#f87171', 0: '#ef4444' };
    if (typeof showToast === 'function') globalThis.showToast(toastText, toastColors[sev] || '#f87171');

    setTimeout(() => el.remove(), 2500);
}

export function _egMaybeShowMistakesWarning() {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    const remaining = _egGetMistakesRemaining();
    if (remaining == null || remaining < 0) {
        // No limit or already over - keep last remaining for next comparison
        globalThis._egLastMistakesRemaining = remaining;
        return;
    }
    const prev = globalThis._egLastMistakesRemaining;
    globalThis._egLastMistakesRemaining = remaining;

    if (remaining > 3) {
        // Out of the 3/2/1/0 window - clear the dedup so re-entering can fire again
        globalThis._egLastMistakesWarningShown = null;
        return;
    }
    // Only warn when the count *decreased* into / within the window.
    // Increases (eraser) update the tracker but do not re-fire the overlay.
    if (prev != null && remaining >= prev) return;
    if (remaining === globalThis._egLastMistakesWarningShown) return;
    globalThis._egLastMistakesWarningShown = remaining;
    _egShowMistakesWarningBanner(remaining);
}

export function _egResetMistakesWarningState() {
    globalThis._egLastMistakesWarningShown = null;
    globalThis._egLastMistakesRemaining = null;
    const banner = document.getElementById('eg-mistakes-warning-banner');
    if (banner) banner.remove();
}

//------------------------------------------------------------------------
//-------------------LOW HEALTH WARNING-----------------------------------
//------------------------------------------------------------------------

export let _egLastHealthPct = null;
export let _egLastLowHealthWarningShown = null;

export function _egGetHealthPct() {
    if (typeof playerMaxHP === 'undefined' || globalThis.playerMaxHP <= 0) return 1;
    return globalThis.playerCurrentHP / globalThis.playerMaxHP;
}

export function _egGetLowHealthWarningTier(pct) {
    if (pct <= 0.35) return 35;
    return null;
}

export function _egShowLowHealthWarningBanner() {
    _egClearCenterGridBanners('eg-low-health-warning-banner');
    const old = document.getElementById('eg-low-health-warning-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-low-health-warning-banner';
    el.className = 'eg-lh-35';

    const key = 'eg_low_health_warning_35';
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = '⚠️ LOW HEALTH - 35% REMAINING';
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    const toastKey = 'eg_low_health_warning_toast_35';
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    if (typeof showToast === 'function') globalThis.showToast(toastText, '#facc15');

    setTimeout(() => el.remove(), 2500);
}

export function _egMaybeShowLowHealthWarning() {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
    if (globalThis.playerCurrentHP <= 0) return;

    const pct = _egGetHealthPct();
    const prev = _egLastHealthPct;
    _egLastHealthPct = pct;

    const tier = _egGetLowHealthWarningTier(pct);
    if (!tier) {
        _egLastLowHealthWarningShown = null;
        return;
    }
    // Only warn when health *decreased* into / within a threshold.
    // Healing back up does not re-fire the overlay.
    if (prev != null && pct >= prev) return;
    if (_egLastLowHealthWarningShown) return;
    _egLastLowHealthWarningShown = true;
    _egShowLowHealthWarningBanner();
}

export function _egResetLowHealthWarningState() {
    _egLastHealthPct = null;
    _egLastLowHealthWarningShown = null;
    const banner = document.getElementById('eg-low-health-warning-banner');
    if (banner) banner.remove();
}

//------------------------------------------------------------------------
//-------------------ABSORPTION BROKEN WARNING----------------------------
//------------------------------------------------------------------------
// Only fires when the absorption shield transitions from >0 to 0 (broken),
// not at percentage thresholds like the health warning.

export function _egShowAbsorptionBrokenBanner() {
    _egClearCenterGridBanners('eg-absorption-broken-banner');
    const old = document.getElementById('eg-absorption-broken-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-absorption-broken-banner';

    const key = 'eg_absorption_broken';
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = '🛡️ SHIELD BROKEN!';
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    const toastKey = 'eg_absorption_broken_toast';
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    if (typeof showToast === 'function') globalThis.showToast(toastText, '#7dd3fc');

    setTimeout(() => el.remove(), 2500);
}

export function _egMaybeShowAbsorptionBroken(prevAbsorption, nextAbsorption) {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (prevAbsorption > 0 && nextAbsorption <= 0) {
        _egShowAbsorptionBrokenBanner();
    }
}

export function _egResetAbsorptionBrokenState() {
    const banner = document.getElementById('eg-absorption-broken-banner');
    if (banner) banner.remove();
}


//------------------------------------------------------------------------
//-------------------MAP FAILED OVERLAY-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Intercepts every defeat path that opens the generic lose overlay while an
// endgame map is still running (timer expiry, hardcore fail, golden clock,
// random walkers, ...): instead of Retry/Levels the player gets the map-lost
// screen (see _egEndMapDefeated in endgame-encounter-chain.js), which keeps
// everything collected during the run. Endgame-specific deaths (mistake
// limit reached, HP zero) call _egEndMapDefeated directly.
export function _egEnsureLoseOverlayEndgameUI() {
    const ov = document.getElementById('ov-lose');
    if (!ov || ov.dataset.egFailUiBound) return;
    ov.dataset.egFailUiBound = '1';

    new MutationObserver(() => {
        if (!ov.classList.contains('show')) return;
        if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
        if (window._egMapDefeatInProgress) {
            ov.classList.remove('show', 'eg-map-failed');
            return;
        }

        const titleEl = document.getElementById('lose-title');
        const subEl = document.getElementById('lose-sub');
        _egEndMapDefeated(
            titleEl ? titleEl.textContent : null,
            subEl ? subEl.textContent : null
        );
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
}

