import { _egIsActive } from './combat-state.js';
import { EG_HZ_LAYER_Z, _egHzIntensity, _egHzActive, _egHzLayer, _egHzPausedForQuiz, _egHzLava, _egHzLightning, _egHzBlizzard, _egHzDarkness, _egHzArcane, _egHzMeteor, _egHzVolatile, _egHzFrostNova, _egHzFirewall, _egHzCyclone, _egHzDelirium } from './combat-hazards.js';
import { _egSetHzActive, _egSetHzLayer, _egSetHzPausedForQuiz, _egSetHzLava, _egSetHzLightning, _egSetHzBlizzard, _egSetHzDarkness, _egSetHzArcane, _egSetHzMeteor, _egSetHzVolatile, _egSetHzFrostNova, _egSetHzFirewall, _egSetHzCyclone, _egSetHzDelirium } from './combat-hazards.js';
import { _egHzInitLava, _egHzTickLava } from './combat-hazards-lava.js';
import { _egHzInitLightning, _egHzTickLightning, _egHzInitBlizzard, _egHzTickBlizzard, _egHzInitDarkness, _egHzTickDarkness, _egHzInitArcane, _egHzTickArcane, _egHzInitMeteor, _egHzTickMeteor } from './combat-hazards-storms.js';
import { _egHzInitVolatile, _egHzTickVolatile, _egHzInitFrostNova, _egHzTickFrostNova, _egHzInitFirewall, _egHzTickFirewall } from './combat-hazards-auras.js';
import { _egHzInitCyclone, _egHzTickCyclone, _egHzInitDelirium, _egHzTickDelirium } from './combat-hazards-cyclone-delirium.js';

//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------

// Starts all hazards present on the active map. Called from
// _egResetEncounterState when an encounter begins.
export function _egHazardsReset() {
    _egHazardsCleanup();
    if (!_egIsActive()) return;

    const lavaI = _egHzIntensity('map_hazard_lava');
    const lightningI = _egHzIntensity('map_hazard_lightning');
    const blizzardI = _egHzIntensity('map_hazard_blizzard');
    const darknessI = _egHzIntensity('map_hazard_darkness');
    const arcaneI = _egHzIntensity('map_hazard_arcane');
    const meteorI = _egHzIntensity('map_hazard_meteor');
    const volatileI = _egHzIntensity('map_hazard_volatile');
    const frostNovaI = _egHzIntensity('map_hazard_frostnova');
    const firewallI = _egHzIntensity('map_hazard_firewall');
    const cycloneI = _egHzIntensity('map_hazard_cyclone');
    const deliriumI = _egHzIntensity('map_hazard_delirium');

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

    _egSetHzLayer(document.createElement('div'));
    _egHzLayer.id = 'eg-hazards-layer';
    _egHzLayer.style.zIndex = String(EG_HZ_LAYER_Z);
    document.body.appendChild(_egHzLayer);

    if (lavaI > 0) _egHzInitLava(lavaI);
    if (lightningI > 0) _egHzInitLightning(lightningI);
    if (blizzardI > 0) _egHzInitBlizzard(blizzardI);
    if (darknessI > 0) _egHzInitDarkness(darknessI);
    if (arcaneI > 0) _egHzInitArcane(arcaneI);
    if (meteorI > 0) _egHzInitMeteor(meteorI);
    if (volatileI > 0) _egHzInitVolatile(volatileI);
    if (frostNovaI > 0) _egHzInitFrostNova(frostNovaI);
    if (firewallI > 0) _egHzInitFirewall(firewallI);
    if (cycloneI > 0) _egHzInitCyclone(cycloneI);
    if (deliriumI > 0) _egHzInitDelirium(deliriumI);

    _egSetHzActive(true);
    _egSetHzPausedForQuiz(false);
    if (_egHzLayer) _egHzLayer.style.display = '';
    globalThis.showToast(`☠️ Elemental Hazards active: ${active.join(' ')}`);
}

// Tears down every hazard DOM node and state. Safe to call anytime.
export function _egHazardsCleanup() {
    _egSetHzActive(false);
    _egSetHzPausedForQuiz(false);
    _egSetHzLava(null);
    _egSetHzLightning(null);
    _egSetHzBlizzard(null);
    _egSetHzDarkness(null);
    _egSetHzArcane(null);
    _egSetHzMeteor(null);
    _egSetHzVolatile(null);
    _egSetHzFrostNova(null);
    _egSetHzFirewall(null);
    _egSetHzCyclone(null);
    _egSetHzDelirium(null);
    if (_egHzLayer) {
        _egHzLayer.remove();
        _egSetHzLayer(null);
    }
    // Darkness clouds live outside the main layer (higher z-index).
    document.querySelectorAll('.eg-hz-darkness-layer').forEach(el => el.remove());
    // Delirium mist likewise covers the whole screen from body level.
    document.querySelectorAll('.eg-hz-delirium').forEach(el => el.remove());
}

// Hides all hazard visuals and pauses hazard ticks while a quiz modal
// is visible so the question remains readable and the player is not
// damaged by invisible hazards.
export function _egHazardsHideForQuiz() {
    if (!_egHzActive || _egHzPausedForQuiz) return;
    _egSetHzPausedForQuiz(true);
    if (_egHzLayer) _egHzLayer.style.display = 'none';
    document.querySelectorAll('.eg-hz-darkness-layer, .eg-hz-delirium').forEach(el => { el.style.display = 'none'; });
}

// Re-shows hazard visuals and resumes ticking when the next puzzle launches
// (or after a standalone interstitial question is dismissed).
export function _egHazardsShowAfterQuiz() {
    if (!_egHzPausedForQuiz) return;
    _egSetHzPausedForQuiz(false);
    if (_egHzLayer) _egHzLayer.style.display = '';
    document.querySelectorAll('.eg-hz-darkness-layer, .eg-hz-delirium').forEach(el => { el.style.display = ''; });
}

// Per-tick driver - called at 10Hz from _egTickLoop.
export function _egHazardsTick() {
    if (!_egHzActive) return;
    if (_egHzPausedForQuiz) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    const dtMs = 100;

    if (_egHzLava) _egHzTickLava(dtMs);
    if (_egHzLightning) _egHzTickLightning(dtMs);
    if (_egHzBlizzard) _egHzTickBlizzard(dtMs);
    if (_egHzDarkness) _egHzTickDarkness(dtMs);
    if (_egHzArcane) _egHzTickArcane(dtMs);
    if (_egHzMeteor) _egHzTickMeteor(dtMs);
    if (_egHzVolatile) _egHzTickVolatile(dtMs);
    if (_egHzFrostNova) _egHzTickFrostNova(dtMs);
    if (_egHzFirewall) _egHzTickFirewall(dtMs);
    if (_egHzCyclone) _egHzTickCyclone(dtMs);
    if (_egHzDelirium) _egHzTickDelirium(dtMs);
}
