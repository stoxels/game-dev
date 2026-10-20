//----------------------------------------------------------------------
//------------------------ESSENCE TOOLTIP DETAIL------------------------
//----------------------------------------------------------------------

// The inner HTML for an essence tooltip's "Guaranteed" section: the
// modifier it promises and the bases that can actually roll it.

import { LANG, t } from '../translation/translations.js';
import { _essenceCompatibleSlotTypes, _essenceItemLevelRange } from './loot-essences.js';
import { _essenceFamilyDisplayName } from './loot-essences-names.js';


// Builds the inner HTML for the essence tooltip's "Guaranteed" section.
// NEW per-modifier version: single mod name + list of compatible base types.
export function _buildEssenceDetailHTML(def) {
    if (!def) return '';
    const families = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    if (!families.length) return '';
    const familyId = families[0];
    const modName = _essenceFamilyDisplayName(familyId);
    const slotTypes = _essenceCompatibleSlotTypes(familyId);
    const slotLabel = (slotType) => {
        const key = 'eg_slot_' + slotType;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) { }
        return slotType.charAt(0).toUpperCase() + slotType.slice(1);
    };
    const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
    let html = '<div class="sx-tt-section sx-tt-essence-detail">';
    const titleMod = isDe ? 'Garantierter Modifikator:' : 'Guaranteed modifier:';
    html += `<div class="sx-tt-essence-title">${titleMod}</div>`;
    html += `<div class="sx-tt-essence-line"><span class="sx-tt-essence-mod" style="font-size:0.92rem;">${modName}</span></div>`;

    const titleSlots = isDe ? 'Funktioniert auf:' : 'Works on:';
    if (slotTypes.length > 0) {
        const slotsStr = slotTypes.map(slotLabel).join(', ');
        html += `<div class="sx-tt-essence-title" style="margin-top:6px;">${titleSlots}</div>`;
        html += `<div class="sx-tt-essence-line"><span class="sx-tt-essence-slots">${slotsStr}</span></div>`;
    } else {
        const noneStr = isDe ? 'Keine kompatiblen Basen gefunden' : 'No compatible bases found';
        html += `<div class="sx-tt-essence-line"><span class="sx-tt-essence-slots" style="color:#e74c3c;">${noneStr}</span></div>`;
    }

    // Item level the target item must have for the modifier to be able to roll.
    const range = _essenceItemLevelRange(familyId);
    if (range) {
        const lvl = range.min === range.max ? `${range.min}+` : `${range.min}+ (${range.min}–${range.max})`;
        const titleIlvl = isDe ? 'Benötigtes Itemlevel:' : 'Required item level:';
        html += `<div class="sx-tt-essence-title" style="margin-top:6px;">${titleIlvl}</div>`;
        html += `<div class="sx-tt-essence-line"><span class="sx-tt-essence-slots">${lvl}</span></div>`;
    }

    html += '</div>';
    return html;
}
