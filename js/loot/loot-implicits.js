import { _egBuildMergedModLines } from '../endgame/endgame-player-stats.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { EG_IMPLICIT_FAMILIES } from './loot-implicit-families.js';
import { _egBuildImplicitRolledStats, _egGetImplicitRange, _egImplicitAllowedOnBase } from './loot-implicit-scaling.js';

//----------------------------------------------------------------------
//---------------------------IMPLICIT ROLLING---------------------------
//----------------------------------------------------------------------

// Which families each slot may roll, plus the four entry points that put
// implicits on an item: the per-base roll, the Blessing Orb reroll, the
// tooltip line merge, and the save-heal that backfills pre-implicit gear.

// Each slot lists candidate familyIds. The generator samples uniformly from
// the subset that is actually allowed on the base (local-defense implicits
// need the base to have the stat). Jewelry never carries local implicits.
export const EG_IMPLICIT_POOL_BY_SLOT = {
    head:      ['flat_health','flat_mana','fire_resist','cold_resist','lightning_resist','shadow_resist','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen'],
    chest:     ['flat_health','flat_mana','fire_resist','cold_resist','lightning_resist','shadow_resist','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen','mana_regen'],
    gloves:    ['flat_health','accuracy','crit_chance','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','attack_speed','spell_damage'],
    boots:     ['flat_health','dodge','strength','agility','inc_armour','inc_evasion','inc_absorption','life_regen','mana_regen'],
    pants:     ['flat_health','flat_mana','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen'],
    belt:      ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','life_regen','mana_regen'],
    shoulders: ['flat_health','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','inc_armour','inc_evasion','inc_absorption'],
    cloak:     ['flat_health','flat_mana','dodge','shadow_resist','fire_resist','cold_resist','lightning_resist','inc_evasion','inc_absorption'],
    bracers:   ['flat_health','accuracy','crit_chance','strength','agility','inc_armour','inc_evasion','attack_speed'],
    // jewelry - global only, never local
    earring:   ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','life_regen','mana_regen','crit_chance','spell_damage','accuracy'],
    ring:      ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','life_regen','mana_regen','crit_chance','spell_damage','accuracy'],
    amulet:    ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','crit_chance','crit_multiplier','spell_damage','accuracy'],
    talisman:  ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','dodge','crit_chance','spell_damage'],
    arcane:    ['flat_health','flat_mana','intelligence','spell_damage','crit_chance','crit_multiplier','accuracy','mana_regen','cooldown_arcane_reveal','cooldown_absolute_zero','cooldown_data_strike','cooldown_diagonal_strike','cooldown_precision_shot','cooldown_rain_of_arrows','cooldown_tail_risk','cooldown_speedforce','cooldown_regression_to_prior','cooldown_significance_threshold','cooldown_residual','cooldown_degrees_of_freedom','cooldown_state_rollback','cooldown_transition_matrix','cooldown_bayes_traps','cooldown_type_i_error_shield','cooldown_brownian_motion','cooldown_drifter'],
    weapon:    ['inc_physical_damage','flat_physical_damage','crit_chance','crit_multiplier','attack_speed','accuracy','spell_damage'],
    shield:    ['block_chance','flat_health','strength','inc_armour','inc_absorption','life_regen','spell_damage'],
    ranged:    ['flat_physical_damage','inc_physical_damage','crit_chance','crit_multiplier','accuracy','attack_speed','spell_damage'],
};

// Picks 1 implicit for the given base, scaled by base.requirements.level.
// Returns array of implicit objects: [{ familyId, tier:'implicit', isImplicit:true, rolledStats }]
export function _egRollImplicitsForBase(base) {
    if (!base || !base.slotType) return [];
    const reqLevel = (base.requirements && base.requirements.level) || base.minLevel || 1;
    const pool = EG_IMPLICIT_POOL_BY_SLOT[base.slotType] || EG_IMPLICIT_POOL_BY_SLOT.head;
    // Filter pool to only families allowed on this base (local defense check)
    const eligible = pool.filter(fid => {
        const fam = EG_IMPLICIT_FAMILIES[fid];
        if (!fam) return false;
        return _egImplicitAllowedOnBase(fid, base.defenses);
    });
    if (eligible.length === 0) return [];
    // Most items get 1 implicit; high-tier bases (req >= 60) get a small chance for a second distinct implicit
    const implicitCount = (reqLevel >= 75 && Math.random() < 0.18) ? 2 : 1;
    const chosen = [];
    const used = new Set();
    for (let i = 0; i < implicitCount; i++) {
        const candidates = eligible.filter(fid => !used.has(fid));
        if (candidates.length === 0) break;
        const fid = candidates[Math.floor(Math.random() * candidates.length)];
        used.add(fid);
        const fam = EG_IMPLICIT_FAMILIES[fid];
        const range = _egGetImplicitRange(fam, reqLevel);
        // Safety: range sanity
        if (range.min == null && range.min1 == null) continue;
        const rolledStats = _egBuildImplicitRolledStats(fam, reqLevel);
        chosen.push({
            familyId: fid,
            tier: 'implicit',
            isImplicit: true,
            rolledStats,
            reqLevel,
        });
    }
    return chosen;
}

// Rerolls numeric values of existing implicits, keeping the same families.
// Used by the Blessing Orb. Values are freshly sampled from the SAME
// reqLevel-scaled range (so the orb can high-roll or low-roll within tier).
export function _egRerollImplicits(item) {
    if (!item || !Array.isArray(item.implicits) || item.implicits.length === 0) return item;
    const reqLevel = (item.requirements && item.requirements.level) || item.itemLevel || 1;
    const newImplicits = item.implicits.map(imp => {
        const fam = EG_IMPLICIT_FAMILIES[imp.familyId];
        if (!fam) return imp;
        const rolledStats = _egBuildImplicitRolledStats(fam, reqLevel);
        return { ...imp, rolledStats, reqLevel };
    });
    return { ...item, implicits: newImplicits };
}

// Helper for tooltip merging - returns merged implicit lines (like _egBuildMergedModLines but for implicits)
export function _egBuildMergedImplicitLines(implicits) {
    // Reuse the same merging logic as explicit mods when available
    if (typeof _egBuildMergedModLines === 'function' && Array.isArray(implicits) && implicits.length) {
        // Map implicits to pseudo-mods so the merger can handle them; tag them as implicit for styling
        return _egBuildMergedModLines(implicits.map(i => ({ ...i, isImplicit: true })));
    }
    // Fallback simple
    const out = [];
    (implicits || []).forEach(imp => {
        (imp.rolledStats || []).forEach(s => {
            if (s && s.label) out.push({ label: s.label, downside: false, tierLabel: 'Implicit', contributions: [{ type:'implicit', tier:'I'}] });
        });
    });
    return out;
}

// Heals a legacy item that was saved before implicits existed: generates implicits
// from its baseId/requirements when none are present. Returns the healed item.
export function _egHealItemImplicits(item) {
    if (!item || item.category !== 'equip' || item.isUnique) return item;
    if (Array.isArray(item.implicits) && item.implicits.length > 0) return item;
    try {
        if (typeof _egRollImplicitsForBase !== 'function') return item;
        let base = null;
        if (typeof EG_ALL_BASE_TYPES !== 'undefined' && Array.isArray(EG_ALL_BASE_TYPES) && item.baseId) {
            base = EG_ALL_BASE_TYPES.find(b => b.id === item.baseId) || null;
        }
        if (!base) {
            // synthesize a minimal base from item itself
            base = { slotType: item.slotType || 'head', requirements: item.requirements || { level: item.itemLevel || 1 }, defenses: item.defenses || {}, minLevel: (item.requirements && item.requirements.level) || 1 };
        }
        const implicits = _egRollImplicitsForBase(base);
        if (implicits && implicits.length) item.implicits = implicits;
        else if (!Array.isArray(item.implicits)) item.implicits = [];
    } catch (e) { if (!Array.isArray(item.implicits)) item.implicits = []; }
    return item;
}
