import { LANG } from '../translation/translations.js';
import { MOD_NAME_WORDS } from './loot-mod-name-words.js';
import { _pickRareItemName } from './loot-mod-rare-names.js';

//----------------------------------------------------------------------
//-------------------ITEM NAME BUILDER----------------------------------
//----------------------------------------------------------------------

// Builds an item's display name from its rolled mods: the EN adjective + "of ..."
// form, the DE genitive form, and the common/uncommon/rare fallbacks. Reads the
// grammatical name parts from loot-mod-name-words.js and the rare pools from
// loot-mod-rare-names.js.

// common   → base name only
// uncommon → proper-language affix naming (see below)
// rare/epic→ random two-word name from RARE_NAME_WORDS_* (ARPG-style);
//            the base type stays visible via .baseName on the item
//
// Uncommon items use MOD_NAME_WORDS (loot-mod-name-words.js), which
// provides grammatical name parts per mod family:
//   [enAdjective, enOfPhrase, deGenitive]
// EN: adjective before the noun + "of ..." after it
//     e.g. "Healthy Leather Cap of Vitality"
// DE: genitive post-position instead of inflected adjectives
//     e.g. "Lederkappe des Lebens und der Rüstung"

export function _modNameEntry(familyId) {
    return (typeof MOD_NAME_WORDS !== 'undefined') ? MOD_NAME_WORDS[familyId] : null;
}

// Fallback when a family has no dictionary entry: title-case the familyId,
// stripping generic segments ("flat_hybrid_map").
export function _modFallbackWord(familyId) {
    return familyId
        .split('_')
        .filter(w => !['flat', 'inc', 'hybrid', 'map'].includes(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// EN adjective for the prefix position, e.g. "Healthy".
export function _modAdjective(familyId) {
    const entry = _modNameEntry(familyId);
    return entry ? entry[0] : _modFallbackWord(familyId);
}

// EN "of ..." phrase for the suffix position, e.g. "of Vitality".
export function _modOfPhrase(familyId) {
    const entry = _modNameEntry(familyId);
    return entry ? entry[1] : 'of ' + _modFallbackWord(familyId);
}

// DE genitive post-position phrase, e.g. "des Lebens" / "der Rüstung".
export function _modDeGenitive(familyId) {
    const entry = _modNameEntry(familyId);
    return entry ? entry[2] : 'des ' + _modFallbackWord(familyId);
}

export function _buildItemName(baseName, rarity, mods) {
    if (rarity === 'common' || mods.length === 0) return baseName;

    // rare/epic: ARPG-style random two-word name ("Doom Bane").
    if (rarity === 'rare' || rarity === 'epic') return _pickRareItemName();

    const prefixes = mods.filter(m => m.type === 'prefix');
    const suffixes = mods.filter(m => m.type === 'suffix');
    const pre = prefixes.length > 0 ? prefixes[0].familyId : null;
    const suf = suffixes.length > 0 ? suffixes[0].familyId : null;
    if (!pre && !suf) return baseName;

    if (LANG === 'de') {
        // German puts descriptors after the noun: "Lederkappe des Lebens".
        // With both affixes they are joined: "... des Lebens und des Feuers".
        const parts = [];
        if (pre) parts.push(_modDeGenitive(pre));
        if (suf) parts.push(_modDeGenitive(suf));
        return `${baseName} ${parts.join(' und ')}`;
    }

    const preStr = pre ? _modAdjective(pre) + ' ' : '';
    const sufStr = suf ? ' ' + _modOfPhrase(suf) : '';
    return `${preStr}${baseName}${sufStr}`.trim();
}
