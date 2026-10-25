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
// A line is { who: 'player' | 'companion' | 'companion2', en, de };
// { beat: 'character_intro' } plays the player's own intro as a flashback. `look` is the sprite
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
    den_reunion: {
        note: 'World 2 (Distribution Den): the three trained together at the Outpost under the same Professor, so this is a reunion out in the field.',
        bg: 'images/backgrounds/Distribution-Den-Background.webp',
        pairings: {
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
    home_stox: {
        note: 'World 1 (Probability Peaks), near the Hypothesis Testing Hamlet. Syla and Trix visit Stox; he tells the safe half aloud, his full intro plays as a private flashback (the beat marker). The secret half (the faceless portrait) is NOT said aloud.',
        bg: 'images/backgrounds/Probability-Peaks-Background.webp',
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'Stox, you have gone quiet. We are a few steps from the Outpost walls and you keep looking back at them.', de: 'Stox, du bist still geworden. Wir sind ein paar Schritte von den Mauern des Außenpostens entfernt und du schaust ständig zurück.' },
                    { who: 'player', en: 'I grew up behind those walls. The archive, mostly. I know every shelf.', de: 'Ich bin hinter diesen Mauern aufgewachsen. Im Archiv, vor allem. Ich kenne jedes Regal.' },
                    { who: 'companion2', en: 'Of course you do. Born between the shelves, our bookworm.', de: 'Natürlich tust du das. Zwischen den Regalen geboren, unser Bücherwurm.' },
                    { who: 'companion', en: 'Trix, be nice. Tell us, Stox. I told you about the Grove, remember? Fair is fair.', de: 'Trix, sei nett. Erzähl es uns, Stox. Ich habe dir vom Hain erzählt, weißt du noch? Gleiches Recht für alle.' },
                    { who: 'player', en: '...Fine. Let me remember how it started.', de: '...Gut. Lass mich überlegen, wie es anfing.' },
                    { beat: 'character_intro' },
                    { who: 'player', en: 'The archive holds every record of the Collapse, and none of them quite agree. That is what I can tell you.', de: 'Das Archiv hat jede Aufzeichnung über den Kollaps, und keine stimmt ganz mit der anderen überein. Mehr kann ich euch nicht sagen.' },
                    { who: 'companion', en: 'The failures were too clean, you said.', de: 'Die Ausfälle waren zu sauber, hast du gesagt.' },
                    { who: 'player', en: 'Too clean. As if someone had checked each one. I have no name yet, only a pattern.', de: 'Zu sauber. Als hätte jemand jeden einzelnen geprüft. Ich habe noch keinen Namen, nur ein Muster.' },
                    { who: 'companion2', en: 'A pattern with no name. Fine. I am good at finding what people hide.', de: 'Ein Muster ohne Namen. Gut. Ich bin gut darin, zu finden, was Leute verstecken.' },
                    { who: 'companion', en: 'Then we find the name together. I listen to places, you read what they say.', de: 'Dann finden wir den Namen zusammen. Ich höre den Orten zu, du liest, was sie sagen.' },
                    { who: 'player', en: 'Agreed. Do not tell the Professor I said that.', de: 'Einverstanden. Sagt dem Professor nicht, dass ich das gesagt habe.' },
                ],
            },
        },
    },
    home_trix: {
        note: 'World 5 (Regression Rift), the ruined OLS Observatory. Stox and Syla visit Trix; she tells the safe half aloud, her full intro plays as a private flashback. The secret half (Warden, key, vault, Verun Vors book) is NOT said aloud.',
        bg: 'images/backgrounds/Regression-Rift-Background.webp',
        pairings: {
            trix: {
                companion: 'stox',
                companion2: 'syla',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'The instruments are still bolted to the floor. Somebody left in a hurry.', de: 'Die Instrumente sind noch am Boden festgeschraubt. Jemand ist in Eile gegangen.' },
                    { who: 'player', en: 'Nobody left in a hurry. We were sent away. Slowly. Stop touching that dial.', de: 'Niemand ist in Eile gegangen. Wir wurden weggeschickt. Langsam. Lass die Finger von dem Regler.' },
                    { who: 'companion2', en: 'Oh, Trix... it is so quiet here. Like the place is holding its breath.', de: 'Oh, Trix... es ist so still hier. Als hielte der Ort den Atem an.' },
                    { who: 'companion', en: 'In all those months at the Outpost, you never said where you came from.', de: 'In all den Monaten am Außenposten hast du nie gesagt, woher du kommst.' },
                    { who: 'player', en: 'And I will not say much now. ...Sit down, both of you. One time.', de: 'Und ich werde jetzt auch nicht viel sagen. ...Setzt euch, beide. Einmal.' },
                    { beat: 'character_intro' },
                    { who: 'player', en: 'That is the part I give you: the Rift, this Observatory, and a name people spit on.', de: 'Das ist der Teil, den ich euch gebe: der Riss, dieses Observatorium und ein Name, auf den die Leute spucken.' },
                    { who: 'companion', en: 'The readings sliding toward zero. You left because of that?', de: 'Die Messwerte, die gegen null gleiten. Bist du deshalb gegangen?' },
                    { who: 'player', en: 'I left because nobody else would look. That is all you get.', de: 'Ich bin gegangen, weil sonst niemand hinsehen wollte. Mehr bekommt ihr nicht.' },
                    { who: 'companion2', en: 'It is more than I hoped for. Thank you, Trix.', de: 'Das ist mehr, als ich gehofft hatte. Danke, Trix.' },
                    { who: 'companion', en: 'I will not repeat it. Statistically, you trusted us a little.', de: 'Ich werde es nicht weitererzählen. Statistisch gesehen hast du uns ein bisschen vertraut.' },
                    { who: 'player', en: 'Do not push it, bookworm. Now help me find a working switch.', de: 'Übertreib es nicht, Bücherwurm. Und jetzt hilf mir, einen funktionierenden Schalter zu finden.' },
                ],
            },
        },
    },
    home_syla: {
        note: 'World 6 (Frequency Forest), her home by the Normal Grove. Trix and Stox visit Syla; she tells the safe half aloud, her full intro plays as a private flashback. The secret half (parents, fox) is NOT said aloud.',
        bg: 'images/backgrounds/Frequency-Forest-Background.webp',
        pairings: {
            syla: {
                companion: 'trix',
                companion2: 'stox',
                look: 'noclass',
                lines: [
                    { who: 'companion', en: 'So this is the famous Grove. It looks like every other forest to me.', de: 'Das ist also der berühmte Hain. Für mich sieht er aus wie jeder andere Wald.' },
                    { who: 'player', en: 'It is not like every other forest. Listen closely.', de: 'Er ist nicht wie jeder andere Wald. Hört genau hin.' },
                    { who: 'companion', en: '...I hear a forest.', de: '...Ich höre einen Wald.' },
                    { who: 'companion2', en: 'I hear the same eight notes, over and over. In the same order.', de: 'Ich höre dieselben acht Töne, immer wieder. In derselben Reihenfolge.' },
                    { who: 'player', en: 'That is because you are not used to it yet. Let me tell you what it taught me.', de: 'Das liegt daran, dass ihr es noch nicht gewohnt seid. Ich erzähle euch, was er mich gelehrt hat.' },
                    { beat: 'character_intro' },
                    { who: 'player', en: 'I have never told anyone that much at once.', de: 'So viel habe ich noch nie jemandem auf einmal erzählt.' },
                    { who: 'companion', en: 'Three hundred years of the same song, and nobody noticed?', de: 'Dreihundert Jahre dasselbe Lied, und niemand hat es bemerkt?' },
                    { who: 'player', en: 'Everyone noticed. Nobody wanted to say it out loud.', de: 'Alle haben es bemerkt. Niemand wollte es laut aussprechen.' },
                    { who: 'companion2', en: 'That sounds exactly like the archive.', de: 'Das klingt genau wie das Archiv.' },
                    { who: 'companion', en: 'I know a thing or two about that. Come on, Forest Girl. Show me which tree is yours.', de: 'Davon verstehe ich einiges. Komm, Waldmädchen. Zeig mir, welcher Baum deiner ist.' },
                    { who: 'player', en: 'That one. ...Thank you for listening, both of you.', de: 'Der da. ...Danke fürs Zuhören, ihr beiden.' },
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
    // A script with no English text yet is still a draft from the story editor: keep it hidden.
    if (!pairing.lines.some(l => l.en && l.en.trim())) return null;
    return { bg: scene.bg, ...pairing };
}

// True once the player has watched this scene in the current save.
export function hasMetCompanion(sceneId) {
    return hasSeen('companion_scene', { sceneId });
}
