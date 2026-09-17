//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { t } from '../translation/translations.js';
import { EG_MONSTER_ZONES, _egRenderPanel, _egRestartFlashClass, _egShowStatusLabel } from './encounter.js';
import { _egIsActive } from './combat-state.js';

// endgame-monster-roam.js
// MONSTER POSITIONING - normal monsters now HOLD GROUND in static side
// panels instead of pacing permanently around the puzzle grid.
//
// History: this file used to run a perimeter patrol (every normal monster
// walked a rectangular circuit around #ptable via rAF). That constant
// motion is gone by design - monsters sit still in their spawn zone panel.
//
// What remains:
//   - _egRoamShouldRoam() always returns false so _egRenderMonstersIntoZones
//     keeps every normal monster in its static panel.
//   - _egRoamSync/_egRoamTeardown only clear the legacy #eg-roam-layer (old
//     saves / cached DOM) and stop the driver.
//   - _egTryMonsterMeleeSidestep() is the ONLY movement left: an occasional,
//     melee-triggered sidestep to a different zone panel. Called from
//     _egApplyPlayerMeleeImpact after a successful hit, so standing still
//     and spamming E sometimes forces the player to walk back into range.
//     Chance is lore-weighted (vermin dart, brutes plod) with a per-monster
//     cooldown so it feels alive but never jittery.
// Loads AFTER endgame-encounter.js (calls its render helpers; encounter.js
// calls back into _egRoamShouldRoam/_egRoamSync/_egRoamTeardown guarded).

export const EG_ROAM_LAYER_ID = 'eg-roam-layer';

// Minimum time between two sidesteps of the SAME monster (ms). Keeps the
// behaviour occasional even when the player machine-guns E.
export const EG_SIDESTEP_COOLDOWN_MS = 5000;
// Grace period after spawn during which a monster never sidesteps (ms) -
// it should first be targetable where it appeared.
export const EG_SIDESTEP_SPAWN_GRACE_MS = 3500;

// Lore-weighted sidestep chance per successful melee hit. Small vermin dart
// around, medium beasts shift sometimes, heavy brutes barely move.
export const EG_SIDESTEP_NIMBLE = new Set([
    'rat', 'bat', 'bee', 'mosquito', 'ant', 'moth', 'spider', 'ladybug',
    'frog', 'beetle', 'owl'
]);
export const EG_SIDESTEP_HEAVY = new Set([
    'golem', 'golem_iron', 'ogre', 'troll', 'rhino', 'bison', 'zombie',
    'oni', 'volcano', 'meteor', 'moon', 'brain'
]);

// Permanent patrol is disabled - monsters hold ground in static panels.
// Always false so the zone renderer never skips normal monsters.
export function _egRoamShouldRoam(m) {
    return false;
}

// Legacy layer cleanup. The patrol owned #eg-roam-layer; it may still exist
// in a running session after this patch. Empty it so no ghost cards linger.
export function _egRoamClearLegacyLayer() {
    try {
        const layer = document.getElementById(EG_ROAM_LAYER_ID);
        if (layer) layer.innerHTML = '';
    } catch (e) { /* DOM not ready - nothing to clear */ }
    try {
        if (typeof _egMonsters !== 'undefined') {
            globalThis._egMonsters.forEach(m => { if (m) m.isRoaming = false; });
        }
    } catch (e) {}
}

// Called from _egRenderPanel after the static zones render. No roaming cards
// are built anymore - just make sure the legacy layer stays empty.
export function _egRoamSync() {
    _egRoamClearLegacyLayer();
}

// Removes every legacy roaming card and stops any old driver. Called from
// _egHideMonsterPanel (encounter over) and safe to call anytime.
export function _egRoamTeardown() {
    _egRoamClearLegacyLayer();
}

// No-op kept so any stale rAF handle from a pre-patch session settles.
// The patrol tick is gone; monsters no longer move on their own.
export function _egRoamEnsureTick() {}
export function _egRoamTick() {}

// Returns the sidestep chance (0..1) for one successful melee hit on `m`.
// Nimble vermin dart often, heavies plod, everyone else sits in between.
// Ranged monsters strafe a touch more - they dislike blades up close.
export function _egMonsterSidestepChance(m) {
    const baseId = (m && (m.baseId || m.id || '')) + '';
    const key = baseId.split('_')[0];
    let chance = 0.20;
    if (EG_SIDESTEP_NIMBLE.has(baseId) || EG_SIDESTEP_NIMBLE.has(key)) chance = 0.32;
    else if (EG_SIDESTEP_HEAVY.has(baseId) || EG_SIDESTEP_HEAVY.has(key)) chance = 0.10;
    if (m && m.attackType === 'ranged') chance += 0.05;
    if (m && m.isBoss) chance = 0;
    return Math.max(0, Math.min(0.45, chance));
}

// Picks a new zone panel for a sidestep: a different panel than `fromZone`,
// preferring the least-populated ones so cards never pile up.
export function _egPickSidestepZone(monster, fromZone) {
    let zones = [];
    try {
        zones = (typeof EG_MONSTER_ZONES !== 'undefined' && EG_MONSTER_ZONES.length)
            ? EG_MONSTER_ZONES.slice()
            : ['eg-monster-panel'];
    } catch (e) { zones = ['eg-monster-panel']; }
    const others = zones.filter(z => z !== fromZone);
    if (!others.length) return null;
    try {
        const counts = {};
        others.forEach(z => { counts[z] = 0; });
        if (typeof _egMonsters !== 'undefined') {
            globalThis._egMonsters.forEach(m => {
                if (!m || m.id === (monster && monster.id)) return;
                const z = m.zoneId || 'eg-monster-panel';
                if (counts[z] == null) counts[z] = 0;
                counts[z]++;
            });
        }
        const min = Math.min.apply(null, others.map(z => counts[z] || 0));
        const emptiest = others.filter(z => (counts[z] || 0) <= min);
        if (emptiest.length) return emptiest[Math.floor(Math.random() * emptiest.length)];
    } catch (e) { /* fall through to plain random */ }
    return others[Math.floor(Math.random() * others.length)];
}

// The ONLY monster movement left: after a successful melee hit, sometimes
// (chance above, gated by cooldown + spawn grace) the monster darts to a
// different zone panel. Re-renders the panel, keeps the target locked, and
// flashes a small status label so the hop reads as a dodge, not a glitch.
// No-ops for bosses, tutorial runs, dead targets and single-zone layouts.
export function _egTryMonsterMeleeSidestep(targetId) {
    try {
        if (typeof _egMonsters === 'undefined') return;
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        const m = globalThis._egMonsters.find(x => x && x.id === targetId);
        if (!m || m.currentHP <= 0) return;
        if (m.isBoss || m.isSacrificialZombie || m.isDynamoConductor) return;
        try {
            if (typeof _tqIsTutorialActive === 'function' && globalThis._tqIsTutorialActive()) return;
        } catch (e) {}
        const now = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
        if (m._sidestepCdUntil && now < m._sidestepCdUntil) return;
        if (m._spawnedAt && (now - m._spawnedAt) < EG_SIDESTEP_SPAWN_GRACE_MS) return;
        const chance = _egMonsterSidestepChance(m);
        if (!(chance > 0) || Math.random() >= chance) return;
        const fromZone = m.zoneId || 'eg-monster-panel';
        const toZone = _egPickSidestepZone(m, fromZone);
        if (!toZone || toZone === fromZone) return;
        m.zoneId = toZone;
        m._sidestepCdUntil = now + EG_SIDESTEP_COOLDOWN_MS
            + Math.floor(Math.random() * 2500);
        if (typeof _egRenderPanel === 'function') _egRenderPanel();
        // Small "sidestep!" label on the fresh card so the move reads.
        try {
            const label = (typeof t === 'function' ? t('eg_melee_sidestep') : '') || 'sidesteps!';
            if (label && label !== 'eg_melee_sidestep' && typeof _egShowStatusLabel === 'function') {
                _egShowStatusLabel(m.id, '↔ ' + label);
            } else if (typeof _egShowStatusLabel === 'function') {
                _egShowStatusLabel(m.id, '↔ …');
            }
        } catch (e) {}
        try {
            const card = document.getElementById('eg-card-' + m.id);
            if (card && typeof _egRestartFlashClass === 'function') {
                _egRestartFlashClass(card, 'eg-flash-cleave');
            }
        } catch (e) {}
    } catch (e) {}
}
