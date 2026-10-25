import { STATE } from '../state.js';
import { hasSeen } from './storyline-progress.js';

//------------------------------------------------------------------------
//-------------------COMPANION SCENES--------------------------------------
//------------------------------------------------------------------------
// Meetings between the player's character and one of the other two heroes.
// Canon: all three trained at the Cartographers' Outpost under the same
// Professor, so they already know each other.
// Each scene is placed on the world map by a `companionNodes` entry in
// screens-world-levels-config.js (same id). A scene has one script per
// player character ("pairing"), so every pairing is written separately and
// the player never has to meet both companions at once.
//
// A line is { who: 'player' | 'companion', en, de }. `look` is the sprite
// variant the companion wears (noclass, statistician, ... see images/sprites).

//------------------------------------------------------------------------
// CAST
//------------------------------------------------------------------------

// Display name + speech colour of each hero.
export const COMPANION_CAST = {
    stox: { name: 'Stox', color: '#4fc3f7' },
    trix: { name: 'Trix', color: '#ce93d8' },
    syla: { name: 'Syla', color: '#66bb6a' },
};

//------------------------------------------------------------------------
// SCENES
//------------------------------------------------------------------------

export const COMPANION_SCENES = {

    // World 2 (Distribution Den): the three trained together at the Outpost
    // under the same Professor, so this is a reunion out in the field.
    den_reunion: {
        bg: 'images/backgrounds/Distribution-Den-Background.webp',
        pairings: {

            // Stox runs into Syla.
            stox: {
                companion: 'syla',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'Stox! Over here - and mind the crack. The stone next to it hums.', de: 'Stox! Hier drüben - und pass auf den Riss auf. Der Stein daneben summt.' },
                    { who: 'player', en: 'Syla. It repeats every four seconds. That is not a hum, that is a period.', de: 'Syla. Es wiederholt sich alle vier Sekunden. Das ist kein Summen, das ist eine Periode.' },
                    { who: 'companion', en: 'Just like in the Professor\'s class. I listen, you measure, and we both end up with the answer.', de: 'Genau wie im Unterricht beim Professor. Ich höre zu, du misst, und wir kommen beide zur Antwort.' },
                    { who: 'player', en: 'You always got there first. I just wrote it down properly.', de: 'Du warst immer zuerst da. Ich habe es nur ordentlich aufgeschrieben.' },
                    { who: 'companion', en: 'Did you find anything in the Outpost records before you left?', de: 'Hast du etwas in den Aufzeichnungen des Außenpostens gefunden, bevor du aufgebrochen bist?' },
                    { who: 'player', en: 'Nothing that adds up. So I came to ask the ground instead.', de: 'Nichts, was Sinn ergibt. Also frage ich jetzt stattdessen den Boden.' },
                    { who: 'companion', en: 'Then we are looking for the same thing. Walk with me for a while?', de: 'Dann suchen wir dasselbe. Gehst du ein Stück mit mir?' },
                    { who: 'player', en: 'For a while. Mind your left - that crack is on no map I have read.', de: 'Ein Stück. Pass links auf - dieser Riss steht auf keiner Karte, die ich kenne.' },
                ],
            },

            // Trix runs into Stox.
            trix: {
                companion: 'stox',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'Trix. You are standing on a fault line.', de: 'Trix. Du stehst auf einer Verwerfungslinie.' },
                    { who: 'player', en: 'Stox. Of course it is you. Still taking notes next to a pit?', de: 'Stox. Natürlich bist du es. Machst du immer noch Notizen neben einem Abgrund?' },
                    { who: 'companion', en: 'I am 1.4 meters away. That is a safe margin.', de: 'Ich bin 1,4 Meter entfernt. Das ist ein sicherer Abstand.' },
                    { who: 'player', en: 'You were this careful in the Professor\'s class too. It never won you a single sparring match.', de: 'Du warst im Unterricht beim Professor schon so vorsichtig. Einen Übungskampf hat dir das nie gewonnen.' },
                    { who: 'companion', en: 'It kept me alive through all of them. Unlike some people who ran in first.', de: 'Es hat mich durch alle durchgebracht. Anders als manche, die zuerst reingerannt sind.' },
                    { who: 'player', en: 'And I still beat you in the finals. Observatory kid beats Archive kid.', de: 'Und ich habe dich trotzdem im Finale geschlagen. Observatoriums-Kind schlägt Archiv-Kind.' },
                    { who: 'companion', en: 'Once. A sample size of one.', de: 'Einmal. Eine Stichprobe vom Umfang eins.' },
                    { who: 'player', en: 'Ha. Come on, bookworm. Walk with me - and try to keep up.', de: 'Ha. Komm, Bücherwurm. Geh mit mir - und versuch, mitzuhalten.' },
                ],
            },

            // Syla runs into Trix.
            syla: {
                companion: 'trix',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'Forest Girl! You are humming again. Something behind that wall is humming back.', de: 'Waldmädchen! Du summst schon wieder. Hinter der Wand summt etwas zurück.' },
                    { who: 'player', en: 'Trix! Oh - sorry. I hum when a place feels sad. The Professor said it made the whole class nervous.', de: 'Trix! Oh - Entschuldigung. Ich summe, wenn sich ein Ort traurig anfühlt. Der Professor meinte, das mache die ganze Klasse nervös.' },
                    { who: 'companion', en: 'It made me nervous. The Den is not sad, it is angry.', de: 'Mich hat es nervös gemacht. Der Bau ist nicht traurig, er ist wütend.' },
                    { who: 'player', en: 'Maybe both. I am glad it is you down here, though.', de: 'Vielleicht beides. Ich bin aber froh, dass du es bist, die hier unten ist.' },
                    { who: 'companion', en: 'Do not get sentimental. We trained together, we are not a club.', de: 'Werd nicht sentimental. Wir haben zusammen trainiert, wir sind kein Verein.' },
                    { who: 'player', en: 'We are a little bit a club.', de: 'Wir sind ein bisschen ein Verein.' },
                    { who: 'companion', en: '...A very small club. Stay behind me, the scratching is getting closer.', de: '...Ein sehr kleiner Verein. Bleib hinter mir, das Kratzen kommt näher.' },
                    { who: 'player', en: 'Together. Like the Professor taught us.', de: 'Zusammen. So, wie der Professor es uns beigebracht hat.' },
                ],
            },
        },
    },
};

//------------------------------------------------------------------------
// LOOKUPS
//------------------------------------------------------------------------

// The current player's script for a scene (companion id, sprite look, lines,
// background), or null when the scene doesn't exist or has no script for the
// chosen character.
export function getCompanionPairing(sceneId) {
    const scene = COMPANION_SCENES[sceneId];
    const pairing = scene && scene.pairings[STATE && STATE.playerCharacter];
    if (!pairing) return null;
    return { bg: scene.bg, ...pairing };
}

// True once the player has watched this scene in the current save.
export function hasMetCompanion(sceneId) {
    return hasSeen('companion_scene', { sceneId });
}
