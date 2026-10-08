//----------------------------------------------------------------------
//-------------------------ESSENCE DEFINITIONS--------------------------
//----------------------------------------------------------------------

// One essence per modifier family, built at load time: the family it
// guarantees, an icon from the cycle, and a translated name and
// description. Also owns looking a def up by id.

import { LANG, t } from '../translation/translations.js';
import { _EG_ESSENCE_FAMILIES, _EG_ESSENCE_ICON_CYCLE } from './loot-essences.js';
import { _egEssenceFamilyDisplayName } from './loot-essences-names.js';


export const EG_ESSENCE_DEFS = {};

// Generate per-modifier essences
(function _egBuildPerModEssences() {
    _EG_ESSENCE_FAMILIES.forEach((familyId, idx) => {
        const id = 'essence_' + familyId;
        const icon = _EG_ESSENCE_ICON_CYCLE[idx % _EG_ESSENCE_ICON_CYCLE.length];
        const tNameKey = 'eg_essence_' + familyId;
        const tDescKey = 'eg_essence_' + familyId + '_desc';
        let name = null, desc = null;
        try { const tr = t(tNameKey); if (tr && tr !== tNameKey) name = tr; } catch (e) { }
        try { const tr = t(tDescKey); if (tr && tr !== tDescKey) desc = tr; } catch (e) { }
        if (!name) {
            const disp = (typeof _egEssenceFamilyDisplayName === 'function') ? _egEssenceFamilyDisplayName(familyId) : familyId;
            name = (typeof LANG !== 'undefined' && LANG === 'de') ? ('Essenz der ' + disp) : ('Essence of ' + disp);
        }
        if (!desc) {
            const disp = (typeof _egEssenceFamilyDisplayName === 'function') ? _egEssenceFamilyDisplayName(familyId) : familyId;
            const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
            if (isDe) {
                desc = `Schmiedet einen Gegenstand beliebiger Seltenheit in einen epischen Gegenstand um (4–6 Modifikatoren) mit garantiertem Modifikator: ${disp}. Funktioniert nur auf Basen, die diesen Mod haben können. Tier hängt vom Itemlevel ab. Alle vorhandenen Modifikatoren gehen verloren.`;
            } else {
                desc = `Re-forges any item of any rarity into an epic item (4–6 modifiers) with a guaranteed ${disp} modifier. Only works on bases that can roll this modifier. Tier depends on item level. All existing modifiers are lost.`;
            }
        }
        EG_ESSENCE_DEFS[id] = {
            id,
            name,
            icon,
            description: desc,
            category: 'essence',
            rarity: 'essence',
            guaranteedFamily: familyId,
            guaranteedFamilies: [familyId],
        };
    });
})();


//----------------------------------------------------------------------
//------------------------------DEF LOOKUP------------------------------
//----------------------------------------------------------------------

export function _egEssenceDefForId(id) {
    if (typeof EG_ESSENCE_DEFS !== 'undefined' && EG_ESSENCE_DEFS[id]) return EG_ESSENCE_DEFS[id];
    return null;
}

// Resolves the guaranteed family for a stash item/def robustly. Never trust
// only the object's own fields - legacy or partially-constructed stash items
// (e.g. built from a stripped-down drop "def") can be missing
// guaranteedFamily/guaranteedFamilies even though the canonical
// EG_ESSENCE_DEFS entry for the same id has them. Falling back to the
// canonical def by id prevents such items from silently bypassing the
// slot-type filter.
export function _egEssenceResolveFamilyId(itemOrDef) {
    if (!itemOrDef) return null;
    let familyId = itemOrDef.guaranteedFamily
        || (itemOrDef.guaranteedFamilies && itemOrDef.guaranteedFamilies[0]);
    if (familyId) return familyId;
    const canonical = itemOrDef.id ? _egEssenceDefForId(itemOrDef.id) : null;
    if (canonical) {
        familyId = canonical.guaranteedFamily
            || (canonical.guaranteedFamilies && canonical.guaranteedFamilies[0]);
    }
    return familyId || null;
}
