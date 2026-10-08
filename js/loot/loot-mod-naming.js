import { LANG } from '../translation/translations.js';
import { EG_MOD_NAME_WORDS } from './loot-mod-name-words.js';
import { _egPickRareItemName } from './loot-mod-rare-names.js';

//----------------------------------------------------------------------
//-------------------ITEM NAME BUILDER----------------------------------
//----------------------------------------------------------------------

// Builds an item's display name from its rolled mods: the EN adjective + "of ..."
// form, the DE genitive form, and the common/uncommon/rare fallbacks. Reads the
// grammatical name parts from loot-mod-name-words.js and the rare pools from
// loot-mod-rare-names.js.

// common   → base name only
// uncommon → proper-language affix naming (see below)
// rare/epic→ random two-word name from EG_RARE_NAME_WORDS_* (PoE-style);
//            the base type stays visible via .baseName on the item
//
// Uncommon items use EG_MOD_NAME_WORDS (loot-mod-name-words.js), which
// provides grammatical name parts per mod family:
//   [enAdjective, enOfPhrase, deGenitive]
// EN: adjective before the noun + "of ..." after it
//     e.g. "Healthy Leather Cap of Vitality"
// DE: genitive post-position instead of inflected adjectives
//     e.g. "Lederkappe des Lebens und der Rüstung"

export function _egModNameEntry(familyId) {
    return (typeof EG_MOD_NAME_WORDS !== 'undefined') ? EG_MOD_NAME_WORDS[familyId] : null;
}

// Fallback when a family has no dictionary entry: title-case the familyId,
// stripping generic segments ("flat_hybrid_map").
export function _egModFallbackWord(familyId) {
    return familyId
        .split('_')
        .filter(w => !['flat', 'inc', 'hybrid', 'map'].includes(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// EN adjective for the prefix position, e.g. "Healthy".
export function _egModAdjective(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[0] : _egModFallbackWord(familyId);
}

// EN "of ..." phrase for the suffix position, e.g. "of Vitality".
export function _egModOfPhrase(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[1] : 'of ' + _egModFallbackWord(familyId);
}

// DE genitive post-position phrase, e.g. "des Lebens" / "der Rüstung".
export function _egModDeGenitive(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[2] : 'des ' + _egModFallbackWord(familyId);
}

export function _egBuildItemName(baseName, rarity, mods) {
    if (rarity === 'common' || mods.length === 0) return baseName;

    // rare/epic: PoE-style random two-word name ("Doom Bane").
    if (rarity === 'rare' || rarity === 'epic') return _egPickRareItemName();

    const prefixes = mods.filter(m => m.type === 'prefix');
    const suffixes = mods.filter(m => m.type === 'suffix');
    const pre = prefixes.length > 0 ? prefixes[0].familyId : null;
    const suf = suffixes.length > 0 ? suffixes[0].familyId : null;
    if (!pre && !suf) return baseName;

    if (LANG === 'de') {
        // German puts descriptors after the noun: "Lederkappe des Lebens".
        // With both affixes they are joined: "... des Lebens und des Feuers".
        const parts = [];
        if (pre) parts.push(_egModDeGenitive(pre));
        if (suf) parts.push(_egModDeGenitive(suf));
        return `${baseName} ${parts.join(' und ')}`;
    }

    const preStr = pre ? _egModAdjective(pre) + ' ' : '';
    const sufStr = suf ? ' ' + _egModOfPhrase(suf) : '';
    return `${preStr}${baseName}${sufStr}`.trim();
}
