import { LANG } from '../translation/translations.js';

//----------------------------------------------------------------------
//-------------------RARE NAME DICTIONARIES-----------------------------
//----------------------------------------------------------------------

// The two word pools behind rare/epic item names ("Doom Bane"), each entry
// [english, german]. Pure data plus the picker; the affix namer is the only
// caller.

// PoE-style random names for rare/epic items: a word from the FIRST pool
// combined with a word from the SECOND pool, e.g. "Doom Bane".
// Each entry is [englishWord, germanWord]. The base type is still shown
// separately via .baseName, exactly like PoE handles rare names.

export const EG_RARE_NAME_WORDS_FIRST = [
    ['Blood', 'Blut'],
    ['Storm', 'Sturm'],
    ['Ash', 'Asche'],
    ['Frost', 'Frost'],
    ['Doom', 'Verderben'],
    ['Grim', 'Grimm'],
    ['Shadow', 'Schatten'],
    ['Ember', 'Glut'],
    ['Thorn', 'Dorn'],
    ['Raven', 'Rabe'],
    ['Wolf', 'Wolf'],
    ['Iron', 'Eisen'],
    ['Bone', 'Knochen'],
    ['Mist', 'Nebel'],
    ['Sun', 'Sonne'],
    ['Moon', 'Mond'],
    ['Serpent', 'Schlange'],
    ['Veil', 'Schleier'],
    ['Hollow', 'Hohl'],
    ['Sorrow', 'Kummer'],
    ['Wrath', 'Zorn'],
    ['Gloom', 'Düster'],
    ['Pyre', 'Scheiterhaufen'],
    ['Wraith', 'Geist'],
    ['Dread', 'Schrecken'],
    ['Onyx', 'Onyx'],
    ['Crimson', 'Purpur'],
    ['Pale', 'Blass'],
    ['Silent', 'Still'],
];
export const EG_RARE_NAME_WORDS_SECOND = [
    ['Bane', 'Fluch'],
    ['Song', 'Lied'],
    ['Grip', 'Griff'],
    ['Brand', 'Mal'],
    ['Coil', 'Ring'],
    ['Charm', 'Charm'],
    ['Whisper', 'Geflüster'],
    ['Howl', 'Heulen'],
    ['Seal', 'Siegel'],
    ['Crown', 'Krone'],
    ['Heart', 'Herz'],
    ['Edge', 'Klinge'],
    ['Call', 'Ruf'],
    ['Spark', 'Funke'],
    ['Shroud', 'Leichentuch'],
    ['Mark', 'Zeichen'],
    ['Knot', 'Knoten'],
    ['Wail', 'Klage'],
    ['Vow', 'Gelübde'],
    ['Sigil', 'Sigill'],
    ['Echo', 'Echo'],
    ['Tide', 'Flut'],
    ['Veil', 'Vorhang'],
    ['Bloom', 'Blüte'],
    ['Spire', 'Turm'],
    ['Shard', 'Scherbe'],
    ['Omen', 'Omen'],
    ['Wake', 'Wogen'],
    ['Gaze', 'Blick'],
    ['Maw', 'Rachen'],
];

export function _egPickRareItemName() {
    const first = EG_RARE_NAME_WORDS_FIRST[Math.floor(Math.random() * EG_RARE_NAME_WORDS_FIRST.length)];
    const second = EG_RARE_NAME_WORDS_SECOND[Math.floor(Math.random() * EG_RARE_NAME_WORDS_SECOND.length)];
    return (LANG === 'de') ? `${first[1]} ${second[1]}` : `${first[0]} ${second[0]}`;
}
