import { Audio_Manager } from '../audio/audio.js';
import { _isActive } from './combat-state.js';
import { HZ_LAYER_Z, _hzIntensity, _hzActive, _hzLayer, _hzPausedForQuiz, _hzLava, _hzLightning, _hzBlizzard, _hzDarkness, _hzArcane, _hzMeteor, _hzVolatile, _hzFrostNova, _hzFirewall, _hzCyclone, _hzDelirium } from './combat-hazards.js';
import { _setHzActive, _setHzLayer, _setHzPausedForQuiz, _setHzLava, _setHzLightning, _setHzBlizzard, _setHzDarkness, _setHzArcane, _setHzMeteor, _setHzVolatile, _setHzFrostNova, _setHzFirewall, _setHzCyclone, _setHzDelirium } from './combat-hazards.js';
import { _hzInitLava, _hzTickLava } from './combat-hazards-lava.js';
import { _hzInitLightning, _hzTickLightning, _hzInitBlizzard, _hzTickBlizzard, _hzInitDarkness, _hzTickDarkness, _hzInitArcane, _hzTickArcane, _hzInitMeteor, _hzTickMeteor } from './combat-hazards-storms.js';
import { _hzInitVolatile, _hzTickVolatile, _hzInitFrostNova, _hzTickFrostNova, _hzInitFirewall, _hzTickFirewall } from './combat-hazards-auras.js';
import { _hzInitCyclone, _hzTickCyclone, _hzInitDelirium, _hzTickDelirium } from './combat-hazards-cyclone-delirium.js';

//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------

// Starts all hazards present on the active map. Called from
// _resetEncounterState when an encounter begins.
export function _hazardsReset() {
    _hazardsCleanup();
    if (!_isActive()) return;

    const lavaI = _hzIntensity('map_hazard_lava');
    const lightningI = _hzIntensity('map_hazard_lightning');
    const blizzardI = _hzIntensity('map_hazard_blizzard');
    const darknessI = _hzIntensity('map_hazard_darkness');
    const arcaneI = _hzIntensity('map_hazard_arcane');
    const meteorI = _hzIntensity('map_hazard_meteor');
    const volatileI = _hzIntensity('map_hazard_volatile');
    const frostNovaI = _hzIntensity('map_hazard_frostnova');
    const firewallI = _hzIntensity('map_hazard_firewall');
    const cycloneI = _hzIntensity('map_hazard_cyclone');
    const deliriumI = _hzIntensity('map_hazard_delirium');

    const active = [];
    if (lavaI > 0) active.push('🌋');
    if (lightningI > 0) active.push('⚡');
    if (blizzardI > 0) active.push('❄️');
    if (darknessI > 0) active.push('🌑');
    if (arcaneI > 0) active.push('🔮');
    if (meteorI > 0) active.push('☄️');
    if (volatileI > 0) active.push('👻');
    if (frostNovaI > 0) active.push('🧊');
    if (firewallI > 0) active.push('🔥');
    if (cycloneI > 0) active.push('🌪️');
    if (deliriumI > 0) active.push('🌫️');
    if (active.length === 0) return;

    _setHzLayer(document.createElement('div'));
    _hzLayer.id = 'sx-hazards-layer';
    _hzLayer.style.zIndex = String(HZ_LAYER_Z);
    document.body.appendChild(_hzLayer);

    if (lavaI > 0) _hzInitLava(lavaI);
    if (lightningI > 0) _hzInitLightning(lightningI);
    if (blizzardI > 0) _hzInitBlizzard(blizzardI);
    if (darknessI > 0) _hzInitDarkness(darknessI);
    if (arcaneI > 0) _hzInitArcane(arcaneI);
    if (meteorI > 0) _hzInitMeteor(meteorI);
    if (volatileI > 0) _hzInitVolatile(volatileI);
    if (frostNovaI > 0) _hzInitFrostNova(frostNovaI);
    if (firewallI > 0) _hzInitFirewall(firewallI);
    if (cycloneI > 0) _hzInitCyclone(cycloneI);
    if (deliriumI > 0) _hzInitDelirium(deliriumI);

    _setHzActive(true);
    _setHzPausedForQuiz(false);
    if (_hzLayer) _hzLayer.style.display = '';
    globalThis.showCombatToast(`☠️ Elemental Hazards active: ${active.join(' ')}`);
}

// Tears down every hazard DOM node and state. Safe to call anytime.
export function _hazardsCleanup() {
    Audio_Manager.stopSFX('hz_blizzard_loop');
    Audio_Manager.stopSFX('hz_cyclone_loop');
    _setHzActive(false);
    _setHzPausedForQuiz(false);
    _setHzLava(null);
    _setHzLightning(null);
    _setHzBlizzard(null);
    _setHzDarkness(null);
    _setHzArcane(null);
    _setHzMeteor(null);
    _setHzVolatile(null);
    _setHzFrostNova(null);
    _setHzFirewall(null);
    _setHzCyclone(null);
    _setHzDelirium(null);
    if (_hzLayer) {
        _hzLayer.remove();
        _setHzLayer(null);
    }
    // Darkness clouds live outside the main layer (higher z-index).
    document.querySelectorAll('.sx-hz-darkness-layer').forEach(el => el.remove());
    // Delirium mist likewise covers the whole screen from body level.
    document.querySelectorAll('.sx-hz-delirium').forEach(el => el.remove());
}

// Hides all hazard visuals and pauses hazard ticks while a quiz modal
// is visible so the question remains readable and the player is not
// damaged by invisible hazards.
export function _hazardsHideForQuiz() {
    Audio_Manager.stopSFX('hz_blizzard_loop');
    Audio_Manager.stopSFX('hz_cyclone_loop');
    if (!_hzActive || _hzPausedForQuiz) return;
    _setHzPausedForQuiz(true);
    if (_hzLayer) _hzLayer.style.display = 'none';
    document.querySelectorAll('.sx-hz-darkness-layer, .sx-hz-delirium').forEach(el => { el.style.display = 'none'; });
}

// Re-shows hazard visuals and resumes ticking when the next puzzle launches
// (or after a standalone interstitial question is dismissed).
export function _hazardsShowAfterQuiz() {
    if (_hzBlizzard) Audio_Manager.playSFX('hz_blizzard_loop');
    if (_hzCyclone) Audio_Manager.playSFX('hz_cyclone_loop');
    if (!_hzPausedForQuiz) return;
    _setHzPausedForQuiz(false);
    if (_hzLayer) _hzLayer.style.display = '';
    document.querySelectorAll('.sx-hz-darkness-layer, .sx-hz-delirium').forEach(el => { el.style.display = ''; });
}

// Per-tick driver - called at 10Hz from _tickLoop.
export function _hazardsTick() {
    if (!_hzActive) return;
    if (_hzPausedForQuiz) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    const dtMs = 100;

    if (_hzLava) _hzTickLava(dtMs);
    if (_hzLightning) _hzTickLightning(dtMs);
    if (_hzBlizzard) _hzTickBlizzard(dtMs);
    if (_hzDarkness) _hzTickDarkness(dtMs);
    if (_hzArcane) _hzTickArcane(dtMs);
    if (_hzMeteor) _hzTickMeteor(dtMs);
    if (_hzVolatile) _hzTickVolatile(dtMs);
    if (_hzFrostNova) _hzTickFrostNova(dtMs);
    if (_hzFirewall) _hzTickFirewall(dtMs);
    if (_hzCyclone) _hzTickCyclone(dtMs);
    if (_hzDelirium) _hzTickDelirium(dtMs);
}
