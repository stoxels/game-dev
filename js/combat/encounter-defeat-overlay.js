import { _endMapDefeated } from './encounter-chain.js';
import { _isActive } from './combat-state.js';

//------------------------------------------------------------------------
//-------------------MAP FAILED OVERLAY-----------------------------------
//------------------------------------------------------------------------

// Redirects generic lose overlays to the map-defeat screen during active maps.
export function _ensureLoseOverlayCombatUI() {
    const ov = document.getElementById('ov-lose');
    if (!ov || ov.dataset.egFailUiBound) return;
    ov.dataset.egFailUiBound = '1';

    new MutationObserver(() => {
        if (!ov.classList.contains('show')) return;
        if (typeof _isActive !== 'function' || !_isActive()) return;
        if (window._mapDefeatInProgress) {
            ov.classList.remove('show', 'eg-map-failed');
            return;
        }

        const titleEl = document.getElementById('lose-title');
        const subEl = document.getElementById('lose-sub');
        _endMapDefeated(
            titleEl ? titleEl.textContent : null,
            subEl ? subEl.textContent : null
        );
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
}
