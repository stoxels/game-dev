import { _egEndMapDefeated } from './encounter-chain.js';
import { _egIsActive } from './combat-state.js';

//------------------------------------------------------------------------
//-------------------MAP FAILED OVERLAY-----------------------------------
//------------------------------------------------------------------------

// Redirects generic lose overlays to the map-defeat screen during active maps.
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
