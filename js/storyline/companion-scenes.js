import { STATE } from '../state.js';
import { hasSeen } from './storyline-progress.js';
import { COOP_AFTERMATH_SCENES } from './coop-aftermath-scenes.js';
import { REVEAL_SCENES } from './reveal-scenes.js';
import { questItemFor } from './quest-items.js';

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
// A scene has `stage` ('none' | 'base' | 'ascended', see COMPANION_LOOKS) and an optional
// `pet` ('browney' | 'drifter') that stands beside Syla in ascended scenes.
// A line is { who: 'player' | 'companion' | 'companion2' | 'voice', en, de };
// { beat: 'character_intro' } plays the player's own intro as a flashback.
// `bg` on the scene is the default backdrop; a script (pairing) may set its own `bg`
// (art made for that hero's version, in images/story/<scene>/), and
// { beat: 'background', bg } switches the backdrop in the middle of a script.
// A missing story image falls back to the scene's `bg`.
// `layout` (node default), `pictureLayouts` (per picture) and a script's `heroLayout` (per
// hero version) move the heroes and speech bubbles; see resolveCompanionLayout.

//------------------------------------------------------------------------
// CAST
//------------------------------------------------------------------------

// Display name + speech colour of each hero.
export const COMPANION_CAST = {
    stox: { name: 'Stox', color: '#4fc3f7' },
    trix: { name: 'Trix', color: '#ce93d8' },
    syla: { name: 'Syla', color: '#66bb6a' },
    // Verun's ghost: speaks as { who: 'voice' } (a voice from the mist, no sprite).
    verun: { name: 'Verun Vors', color: '#9fb4ff' },
};

// The class sprite each hero wears as a companion. World 1 happens before the
// class is chosen (end of world 1), so its scene uses 'none' (no class, for the
// player too). Scenes before the first meeting after the player can pick an
// ascendency (end of world 8, so from world 9 on) use 'base'; later scenes use
// 'ascended'. A scene sets this with its `stage` field. Class sprites live in images/sprites/<Hero>_<class>.webp.
export const COMPANION_LOOKS = {
    stox: { none: 'noclass', base: 'statistician', ascended: 'actuary' },
    trix: { none: 'noclass', base: 'mathmagician', ascended: 'markovian' },
    syla: { none: 'noclass', base: 'probabilist', ascended: 'random_walker' },
};

//------------------------------------------------------------------------
// SCENES
//------------------------------------------------------------------------

export const COMPANION_SCENES = {
    den_reunion: {
        note: 'World 2 (Distribution Den): the three trained together at the Outpost under the same Professor, so this is a reunion out in the field.',
        bg: 'images/backgrounds/Distribution-Den-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/den_reunion/humming_stone.webp': {
                sprites: { left: { x: 48, y: 65.6, s: 0.22, r: 0, pose: 'right' }, right: { x: 55.9, y: 63.3, s: 0.2, r: 0 } },
                bubbles: { left: { x: 48.3, y: 39.2 }, right: { x: 57.2, y: 35.9 } },
            },
            'images/story/den_reunion/fault_pit.webp': {
                sprites: { left: { x: 37.6, y: 46.9, s: 0.25, r: 0, pose: 'right' }, right: { x: 55.3, y: 43.1, s: 0.22, r: 0, pose: 'left' } },
                bubbles: { left: { x: 36.1, y: 20.9 }, right: { x: 57, y: 18.5 } },
            },
            'images/story/den_reunion/humming_wall.webp': {
                sprites: { left: { x: 37.3, y: 90, s: 0.48, r: 0, pose: 'right' }, right: { x: 71.6, y: 88.2, s: 0.5, r: 0, pose: 'left' } },
                bubbles: { left: { x: 37.9, y: 50.3 }, right: { x: 71.5, y: 47.8 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/den_reunion/humming_stone.webp',
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
                bg: 'images/story/den_reunion/fault_pit.webp',
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
                bg: 'images/story/den_reunion/humming_wall.webp',
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
        note: 'World 1 (Probability Peaks), near the Hypothesis Testing Hamlet. Syla and Trix visit Stox; he tells the safe half aloud, his full intro plays as a private flashback (the beat marker). The secret half (the faceless portrait) is NOT said aloud. All heroes (the player too) have no class yet: the class is chosen at the end of world 1.',
        bg: 'images/backgrounds/Probability-Peaks-Background.webp',
        stage: 'none',
        layout: {
            sprites: { left: { x: 28.3, y: 84.3, s: 0.55, r: 0 }, right: { x: 61.7, y: 84.7, s: 0.55, r: 0 }, mid: { x: 47.5, y: 84.7, s: 0.57, r: 0 } },
            bubbles: { left: { x: 24.5, y: 34 }, right: { x: 69.8, y: 34.3 }, mid: { x: 44.9, y: 20 } },
        },
        pictureLayouts: {
            'images/story/home_stox/outpost_view.webp': {
                sprites: { left: { x: 47.5, y: 84.3, s: 0.55, r: 0, pose: 'up' }, right: { x: 63.6, y: 84.6, s: 0.55, r: 0, pose: 'left' }, mid: { x: 26.6, y: 84.8, s: 0.57, r: 0, pose: 'right' } },
                bubbles: { left: { x: 47.2, y: 40.9 }, right: { x: 62.8, y: 41.2 }, mid: { x: 25.4, y: 40.1 } },
            },
            'images/story/home_stox/hamlet_ruins.webp': {
                sprites: { left: { x: 24.6, y: 78.3, s: 0.4, r: 0, pose: 'right' }, right: { x: 80, y: 76, s: 0.39, r: 0, pose: 'left' } },
                bubbles: { left: { x: 24.1, y: 40.5 }, right: { x: 80.5, y: 40 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/home_stox/outpost_view.webp',
                lines: [
                    { who: 'companion', en: 'Stox, you have gone quiet. We are a few steps from the Outpost walls and you keep looking back at them.', de: 'Stox, du bist still geworden. Wir sind ein paar Schritte von den Mauern des Außenpostens entfernt und du schaust ständig zurück.' },
                    { who: 'player', en: 'I grew up behind those walls. The archive, mostly. I know every shelf.', de: 'Ich bin hinter diesen Mauern aufgewachsen. Im Archiv, vor allem. Ich kenne jedes Regal.' },
                    { who: 'companion2', en: 'Of course you do. Born between the shelves, our bookworm.', de: 'Natürlich tust du das. Zwischen den Regalen geboren, unser Bücherwurm.' },
                    { who: 'companion', en: 'Trix, be nice. Tell us, Stox. I told you about the Grove on the road here, remember? Fair is fair.', de: 'Trix, sei nett. Erzähl es uns, Stox. Ich habe dir auf dem Weg hierher vom Hain erzählt, weißt du noch? Gleiches Recht für alle.' },
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
            trix: {
                companion: 'stox',
                bg: 'images/story/home_stox/hamlet_ruins.webp',
                lines: [
                    { who: 'companion', en: 'Welcome to the Hypothesis Testing Hamlet. Population: me, a great many ruins, and a fence I have measured twice.', de: 'Willkommen im Hypothesentest-Weiler. Einwohner: ich, sehr viele Ruinen und ein Zaun, den ich zweimal vermessen habe.' },
                    { who: 'player', en: 'You grew up next to THIS? It looks like a hypothesis somebody failed to confirm.', de: 'Du bist neben DEM hier aufgewachsen? Das sieht aus wie eine Hypothese, die jemand nicht bestätigen konnte.' },
                    { who: 'companion', en: 'It was. The Guild\'s first trial site for solving Stoxels. The result was "possible, but slowly".', de: 'Das war sie. Der erste Versuchsort der Gilde für das Lösen von Stoxels. Das Ergebnis lautete: "möglich, aber langsam".' },
                    { who: 'player', en: 'And you keep coming back to stare at it.', de: 'Und du kommst trotzdem immer wieder her und starrst es an.' },
                    { who: 'companion', en: 'I keep a record. Of errors, mostly. Mine included.', de: 'Ich führe Buch. Über Fehler, hauptsächlich. Meine eingeschlossen.' },
                    { who: 'player', en: 'Of course you do. ...Fine, bookworm, show me the good parts.', de: 'Natürlich tust du das. ...Na gut, Bücherwurm, zeig mir die guten Stellen.' },
                    { who: 'companion', en: 'There are none. There is a very well labelled bench, though.', de: 'Es gibt keine. Aber es gibt eine sehr gut beschriftete Bank.' },
                    { who: 'player', en: 'Ha. Lead the way.', de: 'Ha. Geh voran.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/home_stox/hamlet_ruins.webp',
                lines: [
                    { who: 'companion', en: 'Syla. You are humming next to the Hamlet. It is not a restful place.', de: 'Syla. Du summst neben dem Weiler. Er ist kein erholsamer Ort.' },
                    { who: 'player', en: 'Oh, sorry! But it is a hopeful place. The walls remember people trying.', de: 'Oh, Entschuldigung! Aber es ist ein hoffnungsvoller Ort. Die Mauern erinnern sich daran, dass Leute es versucht haben.' },
                    { who: 'companion', en: 'Trying and failing, statistically. The first fourteen attempts to solve a Stoxel here ended in failure.', de: 'Versucht und gescheitert, statistisch gesehen. Die ersten vierzehn Versuche, hier einen Stoxel zu lösen, schlugen fehl.' },
                    { who: 'player', en: 'Fourteen? And then?', de: 'Vierzehn? Und dann?' },
                    { who: 'companion', en: 'The fifteenth worked. I keep its notes. Under my pillow, if you must know.', de: 'Der fünfzehnte hat funktioniert. Ich bewahre die Notizen dazu auf. Unter meinem Kopfkissen, wenn du es genau wissen willst.' },
                    { who: 'player', en: 'That is the loveliest thing you have ever told me.', de: 'Das ist das Schönste, was du mir je erzählt hast.' },
                    { who: 'companion', en: 'It is a precaution. ...But thank you.', de: 'Das ist eine Vorsichtsmaßnahme. ...Aber danke.' },
                ],
            },
        },
    },
    home_trix: {
        note: 'World 5 (Regression Rift), the ruined OLS Observatory. Stox and Syla visit Trix; she tells the safe half aloud, her full intro plays as a private flashback. The secret half (Warden, key, vault, Verun Vors book) is NOT said aloud.',
        bg: 'images/backgrounds/Regression-Rift-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/home_trix/logbook_desk.webp': {
                sprites: { left: { x: 32.3, y: 100.5, s: 1.06, r: 0, pose: 'up' }, right: { x: 66.9, y: 99.6, s: 1, r: 0, pose: 'up' } },
                bubbles: { left: { x: 32.1, y: 28 }, right: { x: 67.3, y: 30.9 } },
            },
            'images/story/home_trix/instrument_room.webp': {
                sprites: { left: { x: 22.8, y: 96.2, s: 1, r: 0, pose: 'up' }, right: { x: 81.7, y: 96, s: 1.04, r: 0, pose: 'up' }, mid: { x: 56.3, y: 97.1, s: 1, r: 0, pose: 'up' } },
                bubbles: { left: { x: 23.1, y: 27.4 }, right: { x: 81.8, y: 26.1 }, mid: { x: 55.1, y: 28.9 } },
            },
        },
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/home_trix/logbook_desk.webp',
                lines: [
                    { who: 'player', en: 'The logbook is still on the desk. May I?', de: 'Das Logbuch liegt noch auf dem Tisch. Darf ich?' },
                    { who: 'companion', en: 'Touch nothing. ...Fine. The last page only. Do not turn it back.', de: 'Fass nichts an. ...Na gut. Nur die letzte Seite. Nicht zurückblättern.' },
                    { who: 'player', en: 'The variance readings. They fall by roughly the same fraction every night.', de: 'Die Varianzwerte. Sie fallen jede Nacht um ungefähr denselben Anteil.' },
                    { who: 'companion', en: 'Now you know why I left. Somebody had to go and look.', de: 'Jetzt weißt du, warum ich gegangen bin. Irgendwer musste nachsehen.' },
                    { who: 'player', en: 'If this continues, the value reaches zero. That is not a measurement error. That is a deadline.', de: 'Wenn das so weitergeht, erreicht der Wert null. Das ist kein Messfehler. Das ist eine Frist.' },
                    { who: 'companion', en: 'Look at you, doing arithmetic in my house. ...Thank you for not laughing.', de: 'Sieh dich an, du rechnest in meinem Haus. ...Danke, dass du nicht gelacht hast.' },
                    { who: 'player', en: 'I do not laugh at data.', de: 'Ich lache nicht über Daten.' },
                    { who: 'companion', en: 'I know. That is the only reason you are still standing here.', de: 'Ich weiß. Das ist der einzige Grund, warum du noch hier stehst.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/home_trix/instrument_room.webp',
                lines: [
                    { who: 'companion', en: 'The instruments are still bolted to the floor, and the dust lies thick on every dial. Nobody has touched this place in years.', de: 'Die Instrumente sind noch am Boden festgeschraubt, und auf jedem Regler liegt dicker Staub. Seit Jahren hat niemand diesen Ort berührt.' },
                    { who: 'player', en: 'Longer than you think. The ones who built it were sent away generations ago, and nobody came back. Stop touching that dial.', de: 'Länger, als du denkst. Die, die es gebaut haben, wurden vor Generationen weggeschickt, und niemand kam zurück. Lass die Finger von dem Regler.' },
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
            syla: {
                companion: 'trix',
                bg: 'images/story/home_trix/instrument_room.webp',
                lines: [
                    { who: 'player', en: 'Oh... it is so quiet here. Like the place is holding its breath.', de: 'Oh... es ist so still hier. Als hielte der Ort den Atem an.' },
                    { who: 'companion', en: 'It is not holding its breath. It is waiting. There is a difference.', de: 'Er hält nicht den Atem an. Er wartet. Das ist ein Unterschied.' },
                    { who: 'player', en: 'May I listen to the instruments? I will not touch anything.', de: 'Darf ich den Instrumenten zuhören? Ich fasse nichts an.' },
                    { who: 'companion', en: '...Nobody has asked me that before. Everybody just grabs. Go on.', de: '...Das hat mich noch nie jemand gefragt. Alle greifen einfach zu. Los.' },
                    { who: 'player', en: 'They tick very slowly. Like something that is getting tired.', de: 'Sie ticken sehr langsam. Wie etwas, das müde wird.' },
                    { who: 'companion', en: 'Yeah. ...That is what I thought, too. I did not say it out loud.', de: 'Ja. ...Das habe ich auch gedacht. Ich habe es nur nie laut gesagt.' },
                    { who: 'player', en: 'You can say it to me. I will not tell anyone.', de: 'Du kannst es mir sagen. Ich erzähle es niemandem.' },
                    { who: 'companion', en: 'Do not get used to it, Forest Girl. ...But thanks.', de: 'Gewöhn dich nicht daran, Waldmädchen. ...Aber danke.' },
                ],
            },
        },
    },
    home_syla: {
        note: 'World 6 (Frequency Forest), her home by the Normal Grove. Trix and Stox visit Syla; she tells the safe half aloud, her full intro plays as a private flashback. The secret half (parents, fox) is NOT said aloud.',
        bg: 'images/backgrounds/Frequency-Forest-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/home_syla/grove_birds.webp': {
                sprites: { left: { x: 36, y: 95.6, s: 0.42, r: 0, pose: 'up' }, right: { x: 55.3, y: 94.4, s: 0.4, r: 0, pose: 'up' } },
                bubbles: { left: { x: 34.5, y: 57.6 }, right: { x: 57.9, y: 57.7 } },
            },
            'images/story/home_syla/grove_windows.webp': {
                sprites: { left: { x: 38.1, y: 97.2, s: 0.53, r: 0, pose: 'up' }, right: { x: 59.1, y: 97.9, s: 0.55, r: 0, pose: 'up' }, mid: { x: 74.5, y: 98.2, s: 0.57, r: 0, pose: 'up' } },
                bubbles: { left: { x: 37.5, y: 52.7 }, right: { x: 61.4, y: 53.1 }, mid: { x: 78.2, y: 53.1 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/home_syla/grove_birds.webp',
                lines: [
                    { who: 'companion', en: 'Listen, Stox. The birds. Do you hear it?', de: 'Hör zu, Stox. Die Vögel. Hörst du es?' },
                    { who: 'player', en: 'Eight notes, the same order. Then a pause of exactly six seconds, and again.', de: 'Acht Töne, immer dieselbe Reihenfolge. Dann eine Pause von genau sechs Sekunden, und wieder von vorn.' },
                    { who: 'companion', en: 'Every bird, every squirrel, every morning. For as long as anyone can remember.', de: 'Jeder Vogel, jedes Eichhörnchen, jeden Morgen. Solange sich irgendjemand erinnern kann.' },
                    { who: 'player', en: 'A natural system with no variance is not natural. Somebody should have reported this.', de: 'Ein natürliches System ohne Varianz ist nicht natürlich. Jemand hätte das melden müssen.' },
                    { who: 'companion', en: 'I did. Many times. The Guild said: "Forests are predictable."', de: 'Habe ich. Oft. Die Gilde sagte: "Wälder sind vorhersagbar."' },
                    { who: 'player', en: 'That is not an answer. That is a shrug with a seal on it.', de: 'Das ist keine Antwort. Das ist ein Achselzucken mit Siegel.' },
                    { who: 'companion', en: '...Thank you. I have waited a long time for someone to say that.', de: '...Danke. Ich habe lange darauf gewartet, dass jemand das sagt.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/home_syla/grove_windows.webp',
                lines: [
                    { who: 'player', en: 'So this is the famous Grove. Why does every window have a curtain that moves at the exact same moment?', de: 'Das ist also der berühmte Hain. Warum bewegt sich in jedem Fenster der Vorhang im selben Moment?' },
                    { who: 'companion', en: 'Oh, you noticed. Most people say it is the wind.', de: 'Oh, du hast es bemerkt. Die meisten sagen, es sei der Wind.' },
                    { who: 'player', en: 'I am not "most people". I count things.', de: 'Ich bin nicht "die meisten". Ich zähle Dinge.' },
                    { who: 'companion', en: 'I know. That is why I wanted you to see it.', de: 'Ich weiß. Deshalb wollte ich, dass du es siehst.' },
                    { who: 'player', en: '...You wanted ME to see it? Why not the bookworm?', de: '...Du wolltest, dass ICH es sehe? Warum nicht der Bücherwurm?' },
                    { who: 'companion', en: 'Because you notice the things people try to hide. And I do not think the Grove is hiding. I think it is asking.', de: 'Weil du Dinge bemerkst, die Leute verstecken wollen. Und ich glaube nicht, dass der Hain sich versteckt. Ich glaube, er fragt.' },
                    { who: 'player', en: 'Asking what?', de: 'Was fragt er?' },
                    { who: 'companion', en: 'For someone to finally say it out loud. Maybe it is you.', de: 'Dass endlich jemand es laut ausspricht. Vielleicht bist du das.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/home_syla/grove_windows.webp',
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
    w3_assembly: {
        note: 'World 3 (Sampling Savanna): The Bimodal Assembly. Two camps of scholars shout past each other: the Collapse was an accident / was deliberate. A bimodal crowd. The heroes show how they handle a split. Trix hints that she knows which camp gets thrown out.',
        bg: 'images/backgrounds/Sampling-Savanna-Background.webp',
        stage: 'base',
        layout: {
            sprites: { left: { x: 31.9, y: 78, s: 0.37, r: 0, pose: 'up' }, right: { x: 64.7, y: 74.9, s: 0.35, r: 0, pose: 'up' } },
            bubbles: { left: { x: 31.9, y: 41.8 }, right: { x: 66.8, y: 41.6 } },
        },
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/w3_assembly/assembly_square.webp',
                lines: [
                    { who: 'companion', en: 'Listen to them. Two groups, two loud answers, nothing in between.', de: 'Hör sie dir an. Zwei Gruppen, zwei laute Antworten, nichts dazwischen.' },
                    { who: 'player', en: 'A bimodal distribution. One camp says the Collapse was an accident. The other says someone caused it.', de: 'Eine bimodale Verteilung. Das eine Lager sagt, der Kollaps war ein Unfall. Das andere sagt, jemand hat ihn verursacht.' },
                    { who: 'companion', en: 'Let me guess which camp keeps getting thrown out of the Guild.', de: 'Lass mich raten, welches Lager die Gilde immer wieder hinauswirft.' },
                    { who: 'player', en: 'Statistically it is the smaller one.', de: 'Statistisch gesehen ist es das kleinere.' },
                    { who: 'companion', en: 'That is not a statistic. That is a habit.', de: 'Das ist keine Statistik. Das ist eine Gewohnheit.' },
                    { who: 'player', en: 'You speak as if you have seen it happen.', de: 'Du sprichst, als hättest du es erlebt.' },
                    { who: 'companion', en: 'Everyone has seen it happen. Some of us just stayed to watch the aftermath. Come on, bookworm.', de: 'Alle haben es erlebt. Manche von uns sind nur geblieben, um die Folgen anzusehen. Komm, Bücherwurm.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/w3_assembly/assembly_square.webp',
                lines: [
                    { who: 'companion', en: 'They are so loud. Both sides. It makes my ears ache.', de: 'Sie sind so laut. Beide Seiten. Davon tun mir die Ohren weh.' },
                    { who: 'player', en: 'Loud is cheap. Pick a side, shout, go home. That is the whole Guild in one square.', de: 'Laut ist billig. Seite wählen, brüllen, nach Hause gehen. Das ist die ganze Gilde auf einem Platz.' },
                    { who: 'companion', en: 'I think they are loud because they are afraid of being wrong.', de: 'Ich glaube, sie sind laut, weil sie Angst haben, sich zu irren.' },
                    { who: 'player', en: '...Huh. That is annoyingly accurate.', de: '...Hm. Das ist ärgerlich treffend.' },
                    { who: 'companion', en: 'Both camps want the same thing: for it to make sense. They just disagree about what "sense" looks like.', de: 'Beide Lager wollen dasselbe: dass es einen Sinn ergibt. Sie sind sich nur uneinig, wie dieser Sinn aussieht.' },
                    { who: 'player', en: 'Do not make me like you, Forest Girl. I have a reputation.', de: 'Bring mich nicht dazu, dich zu mögen, Waldmädchen. Ich habe einen Ruf.' },
                    { who: 'companion', en: 'Too late, I think.', de: 'Zu spät, glaube ich.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/w3_assembly/assembly_square.webp',
                lines: [
                    { who: 'companion', en: 'Two peaks and a valley between them. Textbook bimodal.', de: 'Zwei Gipfel und dazwischen ein Tal. Lehrbuchmäßig bimodal.' },
                    { who: 'player', en: 'It sounds like two songs sung at once. Neither one is wrong, they just do not fit together yet.', de: 'Es klingt wie zwei Lieder, die gleichzeitig gesungen werden. Keines ist falsch, sie passen nur noch nicht zusammen.' },
                    { who: 'companion', en: 'Or a third, hidden group is pulling the two apart. A bimodal result usually means you are measuring two different things.', de: 'Oder eine dritte, versteckte Gruppe zieht die beiden auseinander. Ein bimodales Ergebnis heißt meist, dass man zwei verschiedene Dinge misst.' },
                    { who: 'player', en: 'Then what are they really measuring?', de: 'Was messen sie dann wirklich?' },
                    { who: 'companion', en: 'Fear, on one side. Suspicion, on the other. And nobody is measuring the Apex.', de: 'Auf der einen Seite Angst. Auf der anderen Misstrauen. Und niemand misst den Apex.' },
                    { who: 'player', en: 'Then we will. Together.', de: 'Dann tun wir das. Zusammen.' },
                    { who: 'companion', en: '...That was the plan. I am relieved you suggested it first.', de: '...Das war der Plan. Ich bin erleichtert, dass du es zuerst vorgeschlagen hast.' },
                ],
            },
        },
    },
    w4_forest: {
        note: 'World 4 (Vortex of Possibilities): The Branching Bifurcation Forests. Foreshadowing: the glowing centre is not corruption leaving, it is gathering. Everything leans toward the middle (the Nexus).',
        bg: 'images/backgrounds/Vortex-of-Possibilities-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/w4_forest/forest_fork.webp': {
                sprites: { left: { x: 40.5, y: 90.7, s: 0.37, r: 0, pose: 'right' }, right: { x: 60.3, y: 91.7, s: 0.4, r: 0, pose: 'up' }, mid: { x: 71, y: 92.1, s: 0.4, r: 0, pose: 'up' } },
                bubbles: { left: { x: 41.2, y: 55.7 }, right: { x: 64.8, y: 55.5 }, mid: { x: 76.1, y: 55.5 } },
            },
            'images/story/w4_forest/vortex_edge.webp': {
                sprites: { left: { x: 54.5, y: 63.7, s: 0.2, r: 0, pose: 'right' }, right: { x: 66.7, y: 87.5, s: 0.35, r: 0, pose: 'up' } },
                bubbles: { left: { x: 55.9, y: 38.9 }, right: { x: 68.2, y: 54.1 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/w4_forest/forest_fork.webp',
                lines: [
                    { who: 'player', en: 'Every branch in this forest splits in two, and each half splits again. Probability, in wood.', de: 'Jeder Ast in diesem Wald teilt sich in zwei, und jede Hälfte teilt sich wieder. Wahrscheinlichkeit, in Holz.' },
                    { who: 'companion', en: 'They all lean toward the middle. Look. The whole forest bends toward the light.', de: 'Alle neigen sich zur Mitte. Sieh nur. Der ganze Wald biegt sich dem Licht entgegen.' },
                    { who: 'player', en: 'The Guild maps show the vortex at half this width.', de: 'Die Karten der Gilde zeigen den Wirbel nur halb so breit.' },
                    { who: 'companion', en: 'Then it grew. Maybe each Stoxel we solve feeds it a little.', de: 'Dann ist er gewachsen. Vielleicht füttert jeder Stoxel, den wir lösen, ihn ein bisschen.' },
                    { who: 'player', en: 'A hypothesis. I will need data to confirm it.', de: 'Eine Hypothese. Ich brauche Daten, um sie zu bestätigen.' },
                    { who: 'companion', en: 'It does not feel like corruption leaving, Stox. It feels like something gathering.', de: 'Es fühlt sich nicht an, als würde die Verderbnis verschwinden, Stox. Es fühlt sich an, als würde sich etwas sammeln.' },
                    { who: 'player', en: '...I dislike how plausible that sounds.', de: '...Mir gefällt nicht, wie plausibel das klingt.' },
                    { who: 'companion', en: 'Look past the fork, Stox. There is a path that winds inward, round and round. It has no name on any chart.', de: 'Sieh hinter die Gabelung, Stox. Dort windet sich ein Pfad nach innen, rund und rund. Auf keiner Karte hat er einen Namen.' },
                    { who: 'player', en: 'A spiral. It would take two readers: one to walk it, one to check every turn.', de: 'Eine Spirale. Dafür braucht es zwei Leser: einen, der geht, und einen, der jede Biegung prüft.' },
                    { who: 'companion', en: 'Then it is you and me. Trix said she would stay at the fork and keep the way back open.', de: 'Dann sind wir zwei es. Trix hat gesagt, sie bleibt an der Gabelung und hält den Rückweg offen.' },
                    { who: 'player', en: 'Sensible. Stay close, and tell me when the branches shift.', de: 'Vernünftig. Bleib dicht bei mir und sag mir, wenn sich die Äste verschieben.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w4_forest/forest_fork.webp',
                lines: [
                    { who: 'companion', en: 'Fork after fork after fork. If I had a coin for every one of these branches, I would never need to roll one.', de: 'Gabelung um Gabelung. Hätte ich für jeden dieser Äste eine Münze, müsste ich nie wieder eine werfen.' },
                    { who: 'player', en: 'Do not start with the coin jokes, bookworm.', de: 'Fang nicht mit den Münzwitzen an, Bücherwurm.' },
                    { who: 'companion2', en: 'Everything here leans toward the light in the middle. The trees, the mist, even the little stones.', de: 'Hier neigt sich alles zum Licht in der Mitte. Die Bäume, der Nebel, sogar die kleinen Steine.' },
                    { who: 'companion', en: 'The vortex is wider than the Guild\'s charts say. By a margin I do not like.', de: 'Der Wirbel ist breiter, als die Karten der Gilde behaupten. Um eine Spanne, die mir nicht gefällt.' },
                    { who: 'player', en: 'So the bright thing in the middle is eating the world. Great.', de: 'Das helle Ding in der Mitte frisst also die Welt. Wunderbar.' },
                    { who: 'companion2', en: 'Or collecting it. I think it is calling everything home.', de: 'Oder sammelt sie. Ich glaube, es ruft alles heim.' },
                    { who: 'player', en: 'Home. Wonderful. Remind me to avoid it.', de: 'Heim. Wunderbar. Erinnert mich daran, ihn zu meiden.' },
                    { who: 'companion', en: 'We cannot avoid it. Past the fork a path winds inward, round and round. The Guild charts show nothing there.', de: 'Wir können ihn nicht meiden. Hinter der Gabelung windet sich ein Pfad nach innen, rund und rund. Die Karten der Gilde zeigen dort nichts.' },
                    { who: 'companion2', en: 'It will only let two through, I think. The branches pull apart when all three of us step closer. I will stay at the fork and keep the way back open.', de: 'Ich glaube, er lässt nur zwei durch. Die Äste weichen auseinander, sobald wir zu dritt näher kommen. Ich bleibe an der Gabelung und halte den Rückweg offen.' },
                    { who: 'player', en: 'Convenient. Fine, bookworm. You and me, one path, and no coin jokes.', de: 'Praktisch. Gut, Bücherwurm. Du und ich, ein Pfad, und keine Münzwitze.' },
                    { who: 'companion', en: 'I will read the turns. You walk fast and complain quietly.', de: 'Ich lese die Biegungen. Du gehst schnell und beschwerst dich leise.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/w4_forest/vortex_edge.webp',
                lines: [
                    { who: 'companion', en: 'Do not stand so close to the edge, Forest Girl. This place does not like being looked at.', de: 'Steh nicht so nah am Rand, Waldmädchen. Dieser Ort mag es nicht, angesehen zu werden.' },
                    { who: 'player', en: 'But look at the trees, Trix. They all bow to the same spot.', de: 'Aber sieh die Bäume an, Trix. Sie verneigen sich alle vor derselben Stelle.' },
                    { who: 'companion', en: '...They do. Even the dead ones.', de: '...Stimmt. Sogar die toten.' },
                    { who: 'player', en: 'It is like the Grove back home. Everything repeats. Everything leans one way.', de: 'Es ist wie der Hain zu Hause. Alles wiederholt sich. Alles neigt sich in eine Richtung.' },
                    { who: 'companion', en: 'And at the end of that leaning is a hole in the world. Cheerful.', de: 'Und am Ende dieser Neigung ist ein Loch in der Welt. Erfreulich.' },
                    { who: 'player', en: 'Not a hole. A middle. Every circle has one. We just have to find out what lives there.', de: 'Kein Loch. Eine Mitte. Jeder Kreis hat eine. Wir müssen nur herausfinden, was dort lebt.' },
                    { who: 'companion', en: 'I will go first. Do not argue.', de: 'Ich gehe zuerst. Widersprich nicht.' },
                    { who: 'player', en: 'Wait. Do you see it, past the bowing trees? A path that winds inward, round and round.', de: 'Warte. Siehst du es hinter den sich verneigenden Bäumen? Ein Pfad, der sich nach innen windet, rund und rund.' },
                    { who: 'companion', en: 'It is narrow. Two can walk it at most. Stox can stay at the fork with his maps and shout if the branches shift.', de: 'Er ist schmal. Höchstens zwei können ihn gehen. Stox kann mit seinen Karten an der Gabelung bleiben und rufen, wenn sich die Äste verschieben.' },
                    { who: 'player', en: 'Then it is you and me. Together, like the Professor taught us.', de: 'Dann sind wir zwei es. Zusammen, so wie der Professor es uns beigebracht hat.' },
                    { who: 'companion', en: 'Do not hum on the way in. The path will hear you.', de: 'Summ nicht auf dem Weg hinein. Der Pfad hört dich sonst.' },
                ],
            },
        },
    },
    w7_loom: {
        note: 'World 7 (Stochapolis): The Bayes\' Theorem Loom. It weaves prior beliefs into updated ones, but its threads are stuck on one old pattern. Theme: updating beliefs (and the Guild that refused to).',
        bg: 'images/backgrounds/Stochapolis-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/w7_loom/loom_hall.webp': {
                sprites: { left: { x: 43.3, y: 97.3, s: 0.72, r: 0, pose: 'up' }, right: { x: 90.3, y: 97.2, s: 0.7, r: 0, pose: 'up' }, mid: { x: 73.4, y: 97.5, s: 0.7, r: 0, pose: 'up' } },
                bubbles: { left: { x: 42.4, y: 43.1 }, right: { x: 85.5, y: 43.6 }, mid: { x: 72.5, y: 43.5 } },
            },
            'images/story/w7_loom/loom_threads.webp': {
                sprites: { left: { x: 30.2, y: 98.5, s: 0.7, r: 0, pose: 'up' }, right: { x: 76.6, y: 97.3, s: 0.74, r: 0, pose: 'up' } },
                bubbles: { left: { x: 30.5, y: 46.6 }, right: { x: 77.4, y: 42.9 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w7_loom/loom_hall.webp',
                lines: [
                    { who: 'companion', en: 'The Loom is still running. Look at the threads. Hundreds of colours, each one a belief.', de: 'Der Webstuhl läuft noch. Sieh dir die Fäden an. Hunderte Farben, jede eine Überzeugung.' },
                    { who: 'player', en: 'Prior times likelihood, divided by evidence. It weaves an old belief into a new one.', de: 'A-priori mal Likelihood, geteilt durch Evidenz. Er webt eine alte Überzeugung zu einer neuen.' },
                    { who: 'companion2', en: 'Except it is not weaving anymore. Same pattern, round and round.', de: 'Nur dass er nicht mehr webt. Immer dasselbe Muster, rund und rund.' },
                    { who: 'companion', en: 'The threads are tired. They want to change, but something holds them in place.', de: 'Die Fäden sind müde. Sie wollen sich ändern, aber irgendetwas hält sie fest.' },
                    { who: 'player', en: 'A belief locked on a dead prior. The Loom keeps receiving new evidence and refuses to update.', de: 'Eine Überzeugung, die an einem toten Prior hängt. Der Webstuhl bekommt neue Evidenz und weigert sich, sich zu ändern.' },
                    { who: 'companion2', en: 'Sounds like a certain Guild.', de: 'Klingt nach einer gewissen Gilde.' },
                    { who: 'player', en: 'I was avoiding saying it, Trix. But yes.', de: 'Ich habe versucht, es nicht zu sagen, Trix. Aber ja.' },
                ],
            },
            trix: {
                companion: 'stox',
                bg: 'images/story/w7_loom/loom_hall.webp',
                lines: [
                    { who: 'companion', en: 'Prior times likelihood over evidence. A machine that makes you change your mind.', de: 'A-priori mal Likelihood durch Evidenz. Eine Maschine, die einen dazu bringt, seine Meinung zu ändern.' },
                    { who: 'player', en: '"Update." Funny word. Sounds so much nicer than "admit you were wrong".', de: '"Aktualisieren." Lustiges Wort. Klingt so viel netter als "zugeben, dass man sich geirrt hat".' },
                    { who: 'companion', en: 'It is the same thing, Trix. The only difference is the courage.', de: 'Es ist dasselbe, Trix. Der einzige Unterschied ist der Mut.' },
                    { who: 'player', en: 'The Loom is stuck. It keeps weaving the same thread.', de: 'Der Webstuhl hängt fest. Er webt immer denselben Faden.' },
                    { who: 'companion', en: 'Yes. Whoever set its prior set it to "the Collapse was an accident", and it has not moved since.', de: 'Ja. Wer auch immer seinen Prior eingestellt hat, hat ihn auf "der Kollaps war ein Unfall" gesetzt, und seitdem hat er sich nicht bewegt.' },
                    { who: 'player', en: 'Guild policy, in cloth. I could cut it down in a minute.', de: 'Gildenpolitik, in Stoff. Ich könnte ihn in einer Minute zerschneiden.' },
                    { who: 'companion', en: 'Do not. We may need it later, as evidence.', de: 'Lass das. Wir brauchen ihn vielleicht später, als Beweis.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/w7_loom/loom_threads.webp',
                lines: [
                    { who: 'player', en: 'The threads look sad. All pulled the same way, none of them allowed to turn.', de: 'Die Fäden sehen traurig aus. Alle in dieselbe Richtung gezogen, keiner darf sich drehen.' },
                    { who: 'companion', en: 'You talk to everything, do you not? Even a pile of string.', de: 'Du redest mit allem, oder? Sogar mit einem Haufen Fäden.' },
                    { who: 'player', en: 'Somebody should. It has been waiting a long time for someone to say "you may change".', de: 'Jemand sollte es. Er wartet schon lange darauf, dass jemand sagt: "du darfst dich ändern".' },
                    { who: 'companion', en: 'It is a machine, Syla.', de: 'Es ist eine Maschine, Syla.' },
                    { who: 'player', en: 'You said "Syla". Not "Forest Girl". That is the first time.', de: 'Du hast "Syla" gesagt. Nicht "Waldmädchen". Das ist das erste Mal.' },
                    { who: 'companion', en: '...Do not make it weird. Tell your string it can change, if it helps.', de: '...Mach es nicht komisch. Sag deiner Schnur, dass sie sich ändern darf, wenn es hilft.' },
                    { who: 'player', en: 'You may change. See? It hummed.', de: 'Du darfst dich ändern. Siehst du? Er hat gesummt.' },
                ],
            },
        },
    },
    w8_fieldbase: {
        note: 'World 8 (Hypothesis Hinterlands): The Field Research Base: an abandoned Guild camp. The last researcher noted that every bearing of the corruption points to one centre, reported it three times, and was told to stop measuring. Foreshadows the suppression.',
        bg: 'images/backgrounds/Hypothesis-Hinterlands-Background.webp',
        stage: 'base',
        pictureLayouts: {
            'images/story/w8_fieldbase/camp_notebooks.webp': {
                sprites: { left: { x: 36, y: 92, s: 0.74, r: 0, pose: 'up' }, right: { x: 55.4, y: 68.2, s: 0.46, r: 0, pose: 'left' } },
                bubbles: { left: { x: 36.2, y: 37.5 }, right: { x: 57.2, y: 28.5 } },
            },
            'images/story/w8_fieldbase/camp_cup.webp': {
                sprites: { left: { x: 31, y: 83.4, s: 0.76, r: 0, pose: 'right' }, right: { x: 45.8, y: 59, s: 0.42, r: 0, pose: 'left' } },
                bubbles: { left: { x: 31.2, y: 27.9 }, right: { x: 47.5, y: 22.4 } },
            },
        },
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/w8_fieldbase/camp_notebooks.webp',
                lines: [
                    { who: 'companion', en: 'Tents, a fire pit and a stack of notebooks nobody burned. Interesting.', de: 'Zelte, eine Feuerstelle und ein Stapel Notizbücher, den niemand verbrannt hat. Interessant.' },
                    { who: 'player', en: 'These are bearings. The same angle, recorded in every region, week after week. They all meet at a single point.', de: 'Das sind Peilungen. Derselbe Winkel, in jeder Region aufgezeichnet, Woche für Woche. Sie treffen sich alle in einem Punkt.' },
                    { who: 'companion', en: 'The middle of the map. The thing the Guild keeps calling "a natural basin".', de: 'Die Mitte der Karte. Das, was die Gilde ständig "ein natürliches Becken" nennt.' },
                    { who: 'player', en: 'The last entry: "Reported to the Guild three times. Reply: the Collapse was random. Stop measuring."', de: 'Der letzte Eintrag: "Dreimal an die Gilde gemeldet. Antwort: Der Kollaps war zufällig. Hört auf zu messen."' },
                    { who: 'companion', en: 'Three reports and a reply that does not answer a single one. I have seen that letter before.', de: 'Drei Berichte und eine Antwort, die auf keinen einzigen eingeht. Diesen Brief habe ich schon einmal gesehen.' },
                    { who: 'player', en: 'Where?', de: 'Wo?' },
                    { who: 'companion', en: 'Let us say a family I know received the same one. Take the notebooks, bookworm.', de: 'Sagen wir, eine Familie, die ich kenne, hat denselben bekommen. Nimm die Notizbücher, Bücherwurm.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/w8_fieldbase/camp_notebooks.webp',
                lines: [
                    { who: 'companion', en: 'Somebody lived here. There are still warm-looking ashes, even after all this time.', de: 'Hier hat jemand gelebt. Die Asche sieht noch immer warm aus, nach all der Zeit.' },
                    { who: 'player', en: 'Do not fall for the cosy camp, Forest Girl. Read the last page.', de: 'Fall nicht auf das gemütliche Lager herein, Waldmädchen. Lies die letzte Seite.' },
                    { who: 'companion', en: '"Reported three times. Reply: stop measuring." Oh... that poor researcher.', de: '"Dreimal gemeldet. Antwort: Hört auf zu messen." Oh... dieser arme Forscher.' },
                    { who: 'player', en: 'Every bearing points at the middle. They knew. The Guild knew, and told them to stop.', de: 'Jede Peilung zeigt auf die Mitte. Sie wussten es. Die Gilde wusste es und sagte ihnen, sie sollten aufhören.' },
                    { who: 'companion', en: 'Maybe they were scared of what it would mean.', de: 'Vielleicht hatten sie Angst vor dem, was es bedeuten würde.' },
                    { who: 'player', en: 'Scared people tear pages out of books. Scared people erase names.', de: 'Verängstigte Leute reißen Seiten aus Büchern. Verängstigte Leute streichen Namen.' },
                    { who: 'companion', en: '...Trix, are you all right?', de: '...Trix, geht es dir gut?' },
                    { who: 'player', en: 'Fine. Pack the notebooks. We keep the evidence.', de: 'Alles gut. Pack die Notizbücher ein. Wir behalten die Beweise.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/w8_fieldbase/camp_cup.webp',
                lines: [
                    { who: 'player', en: 'Somebody made tea here. There is still a cup on the log.', de: 'Hier hat jemand Tee gekocht. Auf dem Baumstamm steht noch eine Tasse.' },
                    { who: 'companion', en: 'Somebody also made notes. Several hundred of them. Come and look at this, Syla.', de: 'Jemand hat auch Notizen gemacht. Mehrere hundert. Komm und sieh dir das an, Syla.' },
                    { who: 'player', en: 'Lines drawn across the map, all meeting in the same place.', de: 'Linien quer über die Karte, die sich alle an derselben Stelle treffen.' },
                    { who: 'companion', en: 'The corruption does not spread randomly. It spreads away from one point, or toward it.', de: 'Die Verderbnis breitet sich nicht zufällig aus. Sie breitet sich von einem Punkt weg aus, oder auf ihn zu.' },
                    { who: 'player', en: 'And the last page says they told the Guild.', de: 'Und auf der letzten Seite steht, dass sie es der Gilde gesagt haben.' },
                    { who: 'companion', en: 'Three times. The Guild replied: "stop measuring". I would like to find whoever wrote that reply.', de: 'Dreimal. Die Gilde antwortete: "Hört auf zu messen". Ich würde gern herausfinden, wer diese Antwort geschrieben hat.' },
                    { who: 'player', en: 'You sound almost angry, Stox.', de: 'Du klingst fast wütend, Stox.' },
                    { who: 'companion', en: 'Statistically, I am. Do not tell anyone. It ruins my reputation.', de: 'Statistisch gesehen bin ich es. Sag es niemandem. Das ruiniert meinen Ruf.' },
                ],
            },
        },
    },
    w9_vortex: {
        note: 'World 9 (Data Delta): The Principal Vortex: all the data reduces to one axis. Trix finds a survey stone stamped VORS (Verun mapped these regions). She goes silent. Stox knows the name from the struck-off register.',
        bg: 'images/backgrounds/Data-Delta-Background.webp',
        stage: 'ascended',
        pet: 'browney',
        layout: {
            sprites: { left: { x: 11.9, y: 96, s: 1, r: 0, pose: 'right' }, right: { x: 88, y: 96, s: 1, r: 0, pose: 'left' }, pet: { x: 94.8, y: 97, s: 1, r: 0 } },
        },
        pictureLayouts: {
            'images/story/w9_vortex/vortex_stone.webp': {
                sprites: { left: { x: 52.9, y: 93.6, s: 0.74, r: 0 }, right: { x: 72.3, y: 94.3, s: 0.7, r: 0 }, pet: { x: 84.1, y: 93.8, s: 0.86, r: 0 } },
                bubbles: { left: { x: 51.2, y: 44.3 }, right: { x: 73.9, y: 41.4 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/w9_vortex/vortex_stone.webp',
                lines: [
                    { who: 'companion', en: 'It is so beautiful. All those colours, winding into one single thread.', de: 'Es ist so schön. All diese Farben, die sich zu einem einzigen Faden verdrehen.' },
                    { who: 'companion', en: 'Browney, my bear, keeps trying to wade into the colours. I have to hold him back by the collar.', de: 'Browney, mein Bär, will ständig in die Farben hineinwaten. Ich muss ihn am Halsband festhalten.' },
                    { who: 'player', en: 'Dimensionality reduction. Thousands of variables collapsing onto one axis. The most information in the least space.', de: 'Dimensionsreduktion. Tausende Variablen fallen auf eine Achse zusammen. Die meiste Information auf dem wenigsten Raum.' },
                    { who: 'companion', en: 'It feels like every river ends here.', de: 'Es fühlt sich an, als endete hier jeder Fluss.' },
                    { who: 'player', en: 'Because they do. Every channel in the Delta drains into the Vortex. And from the Vortex...', de: 'Weil sie das tun. Jeder Kanal im Delta mündet in den Wirbel. Und vom Wirbel...' },
                    { who: 'companion', en: '...to the middle of the map. Stox, look at the stone by the water. It has a mark.', de: '...zur Mitte der Karte. Stox, sieh dir den Stein am Wasser an. Er hat ein Zeichen.' },
                    { who: 'player', en: 'A survey mark. "V. Vors". That name was struck from the register in the archive. I have only ever seen it crossed out.', de: 'Ein Vermessungszeichen. "V. Vors". Dieser Name wurde im Archiv aus dem Register gestrichen. Ich habe ihn bisher nur durchgestrichen gesehen.' },
                    { who: 'companion', en: 'Then someone wanted it forgotten. ...Stox, you are gripping that stone very hard.', de: 'Dann wollte jemand, dass er vergessen wird. ...Stox, du hältst diesen Stein sehr fest.' },
                ],
            },
            trix: {
                companion: 'stox',
                bg: 'images/story/w9_vortex/vortex_stone.webp',
                lines: [
                    { who: 'companion', en: 'Every channel in the Delta drains into this Vortex. A tidy system. Efficient.', de: 'Jeder Kanal im Delta mündet in diesen Wirbel. Ein ordentliches System. Effizient.' },
                    { who: 'player', en: 'Pretty, too. Do not tell anyone I said it.', de: 'Hübsch auch. Sag niemandem, dass ich das gesagt habe.' },
                    { who: 'companion', en: 'There is a survey mark on this stone. Old. Chiselled by someone careful.', de: 'Auf diesem Stein ist ein Vermessungszeichen. Alt. Von jemandem gemeißelt, der sorgfältig war.' },
                    { who: 'player', en: '...Let me see.', de: '...Lass mich sehen.' },
                    { who: 'companion', en: '"V. Vors". There is a Vors in the archive. A line in the register, crossed out in black.', de: '"V. Vors". Es gibt einen Vors im Archiv. Eine Zeile im Register, schwarz durchgestrichen.' },
                    { who: 'player', en: 'I said let me see it, bookworm. ...Do not say another word. Please.', de: 'Ich sagte, lass mich sehen, Bücherwurm. ...Sag kein Wort mehr. Bitte.' },
                    { who: 'companion', en: '...I will not. Not until you decide to.', de: '...Das werde ich nicht. Nicht, bis du es beschließt.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/w9_vortex/vortex_stone.webp',
                lines: [
                    { who: 'companion', en: 'So many colours, all swirling together. Pretty. Dangerous. Probably both.', de: 'So viele Farben, die sich alle verwirbeln. Hübsch. Gefährlich. Wahrscheinlich beides.' },
                    { who: 'player', en: 'Browney, my bear, keeps trying to wade into the colours. I have to hold him back by the collar.', de: 'Browney, mein Bär, will ständig in die Farben hineinwaten. Ich muss ihn am Halsband festhalten.' },
                    { who: 'player', en: 'Everything in the Delta ends up here. It is like a heart.', de: 'Alles im Delta endet hier. Es ist wie ein Herz.' },
                    { who: 'companion', en: 'There is a mark on that stone. ...A survey mark.', de: 'Auf diesem Stein ist ein Zeichen. ...Ein Vermessungszeichen.' },
                    { who: 'player', en: 'Trix? You have gone very quiet.', de: 'Trix? Du bist sehr still geworden.' },
                    { who: 'companion', en: 'It is a name. Old. A name I know. ...I do not want to talk about it.', de: 'Es ist ein Name. Alt. Ein Name, den ich kenne. ...Ich will nicht darüber reden.' },
                    { who: 'player', en: 'Then we will not. I will just stand here with you for a while. Humming, if that is all right.', de: 'Dann tun wir es nicht. Ich stehe einfach eine Weile bei dir. Und summe, wenn das in Ordnung ist.' },
                    { who: 'companion', en: '...Thanks for not asking.', de: '...Danke, dass du nicht fragst.' },
                ],
            },
        },
    },
    w10_enclave: {
        note: 'World 10 (Parameter Plains): The Estimated Enclave. The hooded estimators explain: the Apex parameters did not drift, they were SET by someone with a First Cartographer key. The heroes share what they have learned so far.',
        bg: 'images/backgrounds/Parameter-Plains-Background.webp',
        stage: 'ascended',
        pet: 'drifter',
        layout: {
            sprites: { left: { x: 22.7, y: 93.7, s: 0.72, r: 0, pose: 'up' }, right: { x: 77.5, y: 94.7, s: 0.74, r: 0, pose: 'up' }, mid: { x: 54.2, y: 93.6, s: 0.72, r: 0, pose: 'up' }, pet: { x: 59.4, y: 53.7, s: 0.37, r: 0 } },
            bubbles: { left: { x: 23, y: 40.5 }, right: { x: 80.2, y: 39.1 }, mid: { x: 53.6, y: 39.9 } },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w10_enclave/enclave_hall.webp',
                lines: [
                    { who: 'companion', en: 'The estimators were kind. They showed us their ledger of Apex parameters.', de: 'Die Schätzer waren freundlich. Sie haben uns ihr Verzeichnis der Apex-Parameter gezeigt.' },
                    { who: 'companion', en: 'Drifter, my dog, keeps wagging at the estimators. They keep pretending not to see him.', de: 'Drifter, mein Hund, wedelt ständig die Schätzer an. Sie tun so, als würden sie ihn nicht sehen.' },
                    { who: 'player', en: 'And every parameter that changed, changed in the same direction. By exact amounts. That is not drift.', de: 'Und jeder Parameter, der sich verändert hat, hat sich in dieselbe Richtung verändert. Um genaue Beträge. Das ist keine Abweichung.' },
                    { who: 'companion2', en: 'They said it plainly. The Apex was edited from inside. By someone with a First Cartographer\'s key.', de: 'Sie haben es klar gesagt. Der Apex wurde von innen bearbeitet. Von jemandem mit dem Schlüssel eines Ersten Kartografen.' },
                    { who: 'companion', en: 'A key. So it was not a mistake. Someone chose this.', de: 'Ein Schlüssel. Es war also kein Fehler. Jemand hat das gewollt.' },
                    { who: 'companion2', en: 'Keys can be stolen, copied, passed down. Do not look so surprised, Syla.', de: 'Schlüssel kann man stehlen, kopieren, vererben. Schau nicht so überrascht, Syla.' },
                    { who: 'player', en: 'Let us write down what we know. Bearings meeting at the centre. A key. A name on a survey stone. And a faceless figure in a portrait.', de: 'Schreiben wir auf, was wir wissen. Peilungen, die sich in der Mitte treffen. Ein Schlüssel. Ein Name auf einem Vermessungsstein. Und eine gesichtslose Gestalt auf einem Porträt.' },
                    { who: 'companion', en: 'That is more than the Guild has known in three hundred years.', de: 'Das ist mehr, als die Gilde in dreihundert Jahren wusste.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w10_enclave/enclave_hall.webp',
                lines: [
                    { who: 'companion', en: 'The estimators showed us their ledger. Every Apex parameter that changed, changed in the same direction.', de: 'Die Schätzer haben uns ihr Verzeichnis gezeigt. Jeder Apex-Parameter, der sich verändert hat, hat sich in dieselbe Richtung verändert.' },
                    { who: 'companion2', en: 'Drifter, my dog, keeps wagging at the estimators. They keep pretending not to see him.', de: 'Drifter, mein Hund, wedelt ständig die Schätzer an. Sie tun so, als würden sie ihn nicht sehen.' },
                    { who: 'companion2', en: 'They said: someone with a First Cartographer\'s key rewrote them. From inside the Apex.', de: 'Sie sagten: Jemand mit dem Schlüssel eines Ersten Kartografen hat sie neu geschrieben. Von innen, im Apex.' },
                    { who: 'player', en: '...A key. Of course it is a key.', de: '...Ein Schlüssel. Natürlich ist es ein Schlüssel.' },
                    { who: 'companion', en: 'You touched your collar when she said it, Trix. I did not see anything. I am simply saying that I did not see anything.', de: 'Du hast dir an den Kragen gefasst, als sie das sagte, Trix. Ich habe nichts gesehen. Ich sage nur, dass ich nichts gesehen habe.' },
                    { who: 'player', en: 'Stop being polite, it is creepy.', de: 'Hör auf, höflich zu sein, das ist unheimlich.' },
                    { who: 'companion2', en: 'We trust you, Trix. Whatever it is, you can tell us when you want to.', de: 'Wir vertrauen dir, Trix. Was es auch ist, du kannst es uns sagen, wenn du willst.' },
                    { who: 'player', en: '...Not today. But I heard that. Both of you.', de: '...Nicht heute. Aber ich habe das gehört. Ihr beide.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/w10_enclave/enclave_hall.webp',
                lines: [
                    { who: 'companion', en: 'Nobody told me estimators were so grim. Hoods, ledgers, candles. It is practically my childhood.', de: 'Mir hat niemand gesagt, dass Schätzer so düster sind. Kapuzen, Verzeichnisse, Kerzen. Das ist praktisch meine Kindheit.' },
                    { who: 'player', en: 'Drifter, my dog, keeps wagging at the estimators. They keep pretending not to see him.', de: 'Drifter, mein Hund, wedelt ständig die Schätzer an. Sie tun so, als würden sie ihn nicht sehen.' },
                    { who: 'companion2', en: 'The ledger is clear. Every changed parameter moved by exact amounts. Somebody edited the Apex, using a First Cartographer\'s key.', de: 'Das Verzeichnis ist eindeutig. Jeder veränderte Parameter hat sich um genaue Beträge verschoben. Jemand hat den Apex bearbeitet, mit dem Schlüssel eines Ersten Kartografen.' },
                    { who: 'player', en: 'So the Collapse was not a mistake... somebody did it on purpose.', de: 'Der Kollaps war also kein Fehler... jemand hat es absichtlich getan.' },
                    { who: 'companion', en: 'Not quite news, Forest Girl. Some of us were exiled for saying it.', de: 'Nicht ganz neu, Waldmädchen. Manche von uns wurden dafür verbannt, es zu sagen.' },
                    { who: 'player', en: 'Trix... you were?', de: 'Trix... wirklich?' },
                    { who: 'companion', en: '...My people were. That is all I am going to say today.', de: '...Meine Leute wurden es. Mehr sage ich heute nicht.' },
                    { who: 'companion2', en: 'It is more than you have ever said. We will remember it carefully.', de: 'Es ist mehr, als du je gesagt hast. Wir werden es sorgfältig im Gedächtnis behalten.' },
                ],
            },
        },
    },
    w11_ghost: {
        note: 'World 11 (Null Hypothesis Void): In the Mists of Type II Errors the heroes meet Verun\'s ghost: restless, angry that nobody believed him, but wanting the truth revealed. He hints that \'she\' used his pages (the culprit is a woman), names no name. No art for the ghost yet: he speaks as a voice.',
        bg: 'images/backgrounds/Null-Hypothesis-Void.webp',
        stage: 'ascended',
        pet: 'browney',
        pictureLayouts: {
            'images/story/w11_ghost/mist_faces.webp': {
                sprites: { left: { x: 20.8, y: 94.8, s: 0.65, r: 0, pose: 'up' }, right: { x: 73.1, y: 95.2, s: 0.64, r: 0, pose: 'up' }, mid: { x: 50.1, y: 96.5, s: 0.68, r: 0, pose: 'up' }, pet: { x: 35.2, y: 80.9, s: 0.54, r: 0 } },
                bubbles: { left: { x: 21.2, y: 43.5 }, right: { x: 78.6, y: 45.7 }, mid: { x: 50.8, y: 45.7 } },
            },
            'images/story/w11_ghost/mist_ghost.webp': {
                sprites: { left: { x: 50.1, y: 96.1, s: 0.7, r: 0, pose: 'up' }, right: { x: 90.7, y: 95.8, s: 0.7, r: 0, pose: 'up' }, mid: { x: 74, y: 95.3, s: 0.7, r: 0, pose: 'up' }, pet: { x: 30.4, y: 86.3, s: 0.58, r: 0 } },
                bubbles: { left: { x: 47.5, y: 42.8 }, right: { x: 85.6, y: 42.6 }, mid: { x: 72.7, y: 42.8 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w11_ghost/mist_faces.webp',
                lines: [
                    { who: 'companion', en: 'The mist is full of faces. Hypotheses that were rejected. They are all looking at us.', de: 'Der Nebel ist voller Gesichter. Hypothesen, die verworfen wurden. Sie alle sehen uns an.' },
                    { who: 'companion', en: 'Browney is shaking. Even he does not like this mist.', de: 'Browney zittert. Sogar ihm gefällt dieser Nebel nicht.' },
                    { beat: 'background', bg: 'images/story/w11_ghost/mist_ghost.webp' },
                    { who: 'voice', en: 'Another observer. Another person who thinks I am a Type II error.', de: 'Noch ein Beobachter. Noch jemand, der mich für einen Fehler zweiter Art hält.' },
                    { who: 'player', en: 'You are not a Type II error. You are a witness who was ignored.', de: 'Du bist kein Fehler zweiter Art. Du bist ein Zeuge, den man ignoriert hat.' },
                    { who: 'voice', en: 'I wrote the book. I told them the Apex was being changed from inside. They called it heresy and struck my name from the page.', de: 'Ich habe das Buch geschrieben. Ich sagte ihnen, dass der Apex von innen verändert wird. Sie nannten es Ketzerei und strichen meinen Namen von der Seite.' },
                    { who: 'companion2', en: 'Verun Vors. That is my family name too, Stox. I found your book.', de: 'Verun Vors. Das ist auch mein Familienname, Stox. Ich habe dein Buch gefunden.' },
                    { who: 'voice', en: 'I died knowing I was right, and nobody believed me. Do you know how long a truth can wait in the dark?', de: 'Ich starb in dem Wissen, dass ich recht hatte, und niemand glaubte mir. Wisst ihr, wie lange eine Wahrheit im Dunkeln warten kann?' },
                    { who: 'companion', en: 'Too long. Tell us who did it.', de: 'Zu lange. Sag uns, wer es getan hat.' },
                    { who: 'voice', en: 'She used my own pages. She smiled when she took them. That is all the mist lets me keep. Find the rest, and say my name where they can hear it.', de: 'Sie benutzte meine eigenen Seiten. Sie lächelte, als sie sie nahm. Mehr lässt mir der Nebel nicht. Findet den Rest, und sprecht meinen Namen dort, wo sie ihn hören können.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w11_ghost/mist_faces.webp',
                lines: [
                    { who: 'companion', en: 'The mist is full of faces. Rejected hypotheses, every one of them. And they are all looking at you, Trix.', de: 'Der Nebel ist voller Gesichter. Verworfene Hypothesen, jede einzelne. Und alle sehen dich an, Trix.' },
                    { who: 'companion2', en: 'Browney, my bear, is shaking. Even he does not like this mist.', de: 'Browney, mein Bär, zittert. Sogar ihm gefällt dieser Nebel nicht.' },
                    { beat: 'background', bg: 'images/story/w11_ghost/mist_ghost.webp' },
                    { who: 'voice', en: '...Vors. I know that chin.', de: '...Vors. Dieses Kinn kenne ich.' },
                    { who: 'player', en: 'Who are you?', de: 'Wer bist du?' },
                    { who: 'voice', en: 'Verun. I wrote the book they hid. I told them the Apex was being changed from inside. They called it heresy and struck my name from the page.', de: 'Verun. Ich habe das Buch geschrieben, das sie versteckt haben. Ich sagte ihnen, dass der Apex von innen verändert wird. Sie nannten es Ketzerei und strichen meinen Namen von der Seite.' },
                    { who: 'player', en: 'Then they struck mine, too. A few hundred years later. I have your book, Verun. I found it.', de: 'Dann haben sie meinen auch gestrichen. Ein paar hundert Jahre später. Ich habe dein Buch, Verun. Ich habe es gefunden.' },
                    { who: 'voice', en: 'You read it. Good. Do not let them call you what they called me. A Vors does not lie.', de: 'Du hast es gelesen. Gut. Lass dich nicht nennen, was sie mich nannten. Ein Vors lügt nicht.' },
                    { who: 'companion2', en: 'Who broke the Apex, Verun?', de: 'Wer hat den Apex zerstört, Verun?' },
                    { who: 'voice', en: 'She used my pages. She smiled when she took them. Find the rest, and say my name where they can hear it.', de: 'Sie benutzte meine Seiten. Sie lächelte, als sie sie nahm. Findet den Rest, und sprecht meinen Namen dort, wo sie ihn hören können.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/w11_ghost/mist_faces.webp',
                lines: [
                    { who: 'companion', en: 'The mist is full of faces. Hypotheses that were rejected. They are all staring at us.', de: 'Der Nebel ist voller Gesichter. Hypothesen, die verworfen wurden. Sie starren uns alle an.' },
                    { who: 'player', en: 'Browney is shaking. Even he does not like this mist.', de: 'Browney zittert. Sogar ihm gefällt dieser Nebel nicht.' },
                    { who: 'player', en: 'They look so lonely. Hello. We are not here to reject you.', de: 'Sie sehen so einsam aus. Hallo. Wir sind nicht hier, um euch zu verwerfen.' },
                    { beat: 'background', bg: 'images/story/w11_ghost/mist_ghost.webp' },
                    { who: 'voice', en: '...Kind. Children are always kind. It is very annoying.', de: '...Freundlich. Kinder sind immer freundlich. Das ist sehr lästig.' },
                    { who: 'companion2', en: 'Who are you?', de: 'Wer bist du?' },
                    { who: 'voice', en: 'Verun Vors. I wrote the book they hid. I said the Apex was being changed from inside. They called it heresy and struck my name from the page.', de: 'Verun Vors. Ich habe das Buch geschrieben, das sie versteckt haben. Ich sagte, der Apex werde von innen verändert. Sie nannten es Ketzerei und strichen meinen Namen von der Seite.' },
                    { who: 'companion', en: '...Vors. That is my name too. A hundred times removed, but mine. I found your book.', de: '...Vors. Das ist auch mein Name. Hundertmal entfernt, aber meiner. Ich habe dein Buch gefunden.' },
                    { who: 'player', en: 'I am so sorry. For all of it. For three hundred years of nobody listening.', de: 'Es tut mir so leid. Für alles. Für dreihundert Jahre, in denen niemand zuhörte.' },
                    { who: 'voice', en: 'She used my pages. She smiled when she took them. Find the rest, and say my name where they can hear it.', de: 'Sie benutzte meine Seiten. Sie lächelte, als sie sie nahm. Findet den Rest, und sprecht meinen Namen dort, wo sie ihn hören können.' },
                ],
            },
        },
    },
    w12_wreck: {
        note: 'World 12 (Bayesian Bay): A Guild flagship wreck. The heroes find the PRIOR half of the key to the Nexus and the captain\'s log: the Council ordered "do not update". All three heroes together.',
        bg: 'images/backgrounds/Bayesian-Bay-Background.webp',
        stage: 'ascended',
        pet: 'drifter',
        pictureLayouts: {
            'images/story/w12_wreck/wreck_deck.webp': {
                sprites: { left: { x: 24.3, y: 94.3, s: 0.52, r: 0, pose: 'up' }, right: { x: 69.7, y: 97.7, s: 0.57, r: 0, pose: 'up' }, mid: { x: 47.6, y: 96.5, s: 0.57, r: 0, pose: 'up' }, pet: { x: 37.3, y: 55.9, s: 0.2, r: 0 } },
                bubbles: { left: { x: 22.4, y: 50.4 }, right: { x: 71.6, y: 52.6 }, mid: { x: 48.3, y: 50.4 } },
            },
            'images/story/w12_wreck/captain_cabin.webp': {
                sprites: { left: { x: 36.3, y: 98.8, s: 1.08, r: 0, pose: 'right' }, right: { x: 88.3, y: 95.6, s: 1, r: 0, pose: 'left' }, mid: { x: 76.8, y: 98.1, s: 1, r: 0, pose: 'left' }, pet: { x: 5, y: 95.3, s: 0.95, r: 0 } },
                bubbles: { left: { x: 37.3, y: 26 }, right: { x: 85.7, y: 26.9 }, mid: { x: 75.2, y: 29 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w12_wreck/wreck_deck.webp',
                lines: [
                    { who: 'companion', en: 'The ship is called the Steadfast Prior. A Guild flagship, by the seal on the stern.', de: 'Das Schiff heißt Steadfast Prior. Ein Flaggschiff der Gilde, nach dem Siegel am Heck.' },
                    { who: 'companion', en: 'Drifter smells the sea and does not like it. He keeps nosing at the old cabin door.', de: 'Drifter riecht das Meer und mag es nicht. Er stupst immer wieder die alte Kajütentür an.' },
                    { who: 'companion2', en: 'And the captain\'s cabin is still dry. Somebody sealed it. Stand back, I can pick that lock.', de: 'Und die Kajüte des Kapitäns ist noch trocken. Jemand hat sie versiegelt. Tretet zurück, ich knacke das Schloss.' },
                    { beat: 'background', bg: 'images/story/w12_wreck/captain_cabin.webp' },
                    { who: 'player', en: 'The log\'s last line: "Council order: do not update the chart. Hold course." They sailed into the maelstrom because they were told not to change their mind.', de: 'Die letzte Zeile des Logbuchs: "Befehl des Rates: Karte nicht aktualisieren. Kurs halten." Sie segelten in den Mahlstrom, weil man ihnen verbot, ihre Meinung zu ändern.' },
                    { who: 'companion', en: 'That is the Guild that refused to update its beliefs. And it killed these people.', de: 'Das ist die Gilde, die sich weigerte, ihre Überzeugungen zu aktualisieren. Und sie hat diese Leute getötet.' },
                    { who: 'companion2', en: 'There is something in the strongbox. Half a key, with the First Cartographers\' seal. It says "PRIOR".', de: 'Im Tresor liegt etwas. Ein halber Schlüssel mit dem Siegel der Ersten Kartografen. Darauf steht "PRIOR".' },
                    { who: 'player', en: 'Half. The other half must be labelled "POSTERIOR". Prior times likelihood gives the posterior. The Nexus opens with both.', de: 'Eine Hälfte. Die andere muss "POSTERIOR" heißen. A-priori mal Likelihood ergibt den Posterior. Der Nexus öffnet sich mit beiden.' },
                    { who: 'companion', en: 'Then we need the other half. Where would a First Cartographer hide a posterior?', de: 'Dann brauchen wir die andere Hälfte. Wo würde ein Erster Kartograf einen Posterior verstecken?' },
                    { who: 'player', en: 'At the top of the expected value. The Plateau.', de: 'An der Spitze des Erwartungswerts. Auf dem Plateau.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w12_wreck/wreck_deck.webp',
                lines: [
                    { who: 'companion', en: 'Steadfast Prior. A Guild flagship. The captain locked his cabin and the lock is still good.', de: 'Steadfast Prior. Ein Flaggschiff der Gilde. Der Kapitän hat seine Kajüte abgeschlossen, und das Schloss ist noch gut.' },
                    { who: 'companion2', en: 'Drifter smells the sea and does not like it. He keeps nosing at the old cabin door.', de: 'Drifter riecht das Meer und mag es nicht. Er stupst immer wieder die alte Kajütentür an.' },
                    { who: 'player', en: 'Stand back. I have wanted to pick a Guild lock since I was nine.', de: 'Tretet zurück. Ich wollte schon seit meinem neunten Lebensjahr ein Gildenschloss knacken.' },
                    { beat: 'background', bg: 'images/story/w12_wreck/captain_cabin.webp' },
                    { who: 'companion2', en: 'It opened! Trix, you are wonderful. Look, a log, and a strongbox!', de: 'Es ging auf! Trix, du bist wunderbar. Sieh nur, ein Logbuch und ein Tresor!' },
                    { who: 'companion', en: 'The last line: "Council order: do not update the chart. Hold course." They sailed into the maelstrom on purpose.', de: 'Die letzte Zeile: "Befehl des Rates: Karte nicht aktualisieren. Kurs halten." Sie segelten absichtlich in den Mahlstrom.' },
                    { who: 'player', en: 'Of course they did. Never change your mind, even when the sea is eating you. That is Guild policy.', de: 'Natürlich. Nie die Meinung ändern, selbst wenn das Meer einen frisst. Das ist Gildenpolitik.' },
                    { who: 'companion2', en: 'There is half a key in the strongbox. It says "PRIOR". And it is humming.', de: 'Im Tresor liegt ein halber Schlüssel. Darauf steht "PRIOR". Und er summt.' },
                    { who: 'companion', en: 'Prior times likelihood gives the posterior, so the other half is "POSTERIOR". The expected value peaks on the Plateau. We need both to enter the Nexus.', de: 'A-priori mal Likelihood ergibt den Posterior, also ist die andere Hälfte "POSTERIOR". Der Erwartungswert gipfelt auf dem Plateau. Wir brauchen beide, um in den Nexus zu kommen.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/w12_wreck/wreck_deck.webp',
                lines: [
                    { who: 'companion', en: 'Steadfast Prior. I do not like ships that stay upright after being wrecked. It looks smug.', de: 'Steadfast Prior. Ich mag keine Schiffe, die nach einem Schiffbruch aufrecht bleiben. Das sieht selbstgefällig aus.' },
                    { who: 'player', en: 'Drifter smells the sea and does not like it. He keeps nosing at the old cabin door.', de: 'Drifter riecht das Meer und mag es nicht. Er stupst immer wieder die alte Kajütentür an.' },
                    { who: 'player', en: 'The poor sailors. They can still feel everything that happened here.', de: 'Die armen Seeleute. Sie spüren noch alles, was hier geschehen ist.' },
                    { beat: 'background', bg: 'images/story/w12_wreck/captain_cabin.webp' },
                    { who: 'companion2', en: 'The log says the Council ordered them to hold course. "Do not update." They obeyed.', de: 'Das Logbuch sagt, der Rat habe ihnen befohlen, den Kurs zu halten. "Nicht aktualisieren." Sie gehorchten.' },
                    { who: 'companion', en: 'That is the Guild in one sentence. Open that strongbox, Forest Girl.', de: 'Das ist die Gilde in einem Satz. Mach den Tresor auf, Waldmädchen.' },
                    { who: 'player', en: 'Oh! It is half a key. It says "PRIOR". It hums when I hold it, like it knows me.', de: 'Oh! Es ist ein halber Schlüssel. Darauf steht "PRIOR". Er summt, wenn ich ihn halte, als würde er mich kennen.' },
                    { who: 'companion2', en: 'Prior times likelihood gives the posterior. So the other half must be POSTERIOR, and the expected value peaks on the Plateau. We need both to open the Nexus.', de: 'A-priori mal Likelihood ergibt den Posterior. Die andere Hälfte muss also POSTERIOR sein, und der Erwartungswert gipfelt auf dem Plateau. Wir brauchen beide, um den Nexus zu öffnen.' },
                    { who: 'companion', en: 'The Plateau, then. Pack up, we are leaving. Before this ship decides to hold course again.', de: 'Dann also das Plateau. Packt ein, wir gehen. Bevor dieses Schiff beschließt, wieder Kurs zu halten.' },
                ],
            },
        },
    },
    w13_peak: {
        note: 'World 13 (Expectation Plateau): Foot of Peak mu. The POSTERIOR half of the key. The proof stone on the plateau has been defaced recently: the ink is fresh, someone is still erasing. All three heroes together.',
        bg: 'images/backgrounds/Expectation-Plateau-Background.webp',
        stage: 'ascended',
        pet: 'browney',
        pictureLayouts: {
            'images/story/w13_peak/peak_foot.webp': {
                sprites: { left: { x: 25.9, y: 90.7, s: 0.52, r: 0, pose: 'up' }, right: { x: 78.3, y: 89.9, s: 0.64, r: 0, pose: 'up' }, mid: { x: 61.3, y: 87.8, s: 0.57, r: 0, pose: 'up' }, pet: { x: 45.9, y: 72.7, s: 0.41, r: 0 } },
                bubbles: { left: { x: 24.2, y: 46.9 }, right: { x: 77.3, y: 41.3 }, mid: { x: 59.7, y: 42.2 } },
            },
            'images/story/w13_peak/proof_stone.webp': {
                sprites: { left: { x: 34.4, y: 94.4, s: 0.59, r: 0, pose: 'right' }, right: { x: 87, y: 95.5, s: 0.64, r: 0, pose: 'left' }, mid: { x: 54.5, y: 95.2, s: 0.61, r: 0, pose: 'right' }, pet: { x: 11.1, y: 54.7, s: 0.37, r: 0 } },
                bubbles: { left: { x: 33.6, y: 49.4 }, right: { x: 85.2, y: 46.3 }, mid: { x: 54.6, y: 49 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w13_peak/peak_foot.webp',
                lines: [
                    { who: 'companion', en: 'The Peak glows brighter every step. It is humming the same note as the first half of the key.', de: 'Der Gipfel leuchtet mit jedem Schritt heller. Er summt denselben Ton wie die erste Schlüsselhälfte.' },
                    { who: 'companion', en: 'Browney is sniffing the whole mountain. I think he wants to climb it.', de: 'Browney beschnuppert den ganzen Berg. Ich glaube, er will hinaufklettern.' },
                    { who: 'companion2', en: 'Here. In a crack of the stone. The seal of the First Cartographers, and "POSTERIOR" under it.', de: 'Hier. In einer Felsspalte. Das Siegel der Ersten Kartografen, und darunter "POSTERIOR".' },
                    { who: 'player', en: 'Join them. Prior and posterior, side by side.', de: 'Fügt sie zusammen. Prior und Posterior, nebeneinander.' },
                    { who: 'companion', en: 'It clicked! The whole key is warm. It wants to go home.', de: 'Es hat eingerastet! Der ganze Schlüssel ist warm. Er will heim.' },
                    { beat: 'background', bg: 'images/story/w13_peak/proof_stone.webp' },
                    { who: 'companion2', en: 'Look at the proof stone over there. Somebody scratched out the last line. The scratches are fresh. The dust has not even settled.', de: 'Seht euch den Beweisstein da drüben an. Jemand hat die letzte Zeile ausgekratzt. Die Kratzer sind frisch. Der Staub hat sich noch nicht einmal gelegt.' },
                    { who: 'player', en: 'Which means whoever is finishing the erasure was here this week.', de: 'Das heißt, wer auch immer die Löschung zu Ende bringt, war diese Woche hier.' },
                    { who: 'companion', en: 'Then she is still out there. Still working.', de: 'Dann ist sie noch da draußen. Und arbeitet immer noch.' },
                    { who: 'companion2', en: 'We have the key. Let us go and meet her before she finishes.', de: 'Wir haben den Schlüssel. Gehen wir und treffen sie, bevor sie fertig ist.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w13_peak/peak_foot.webp',
                lines: [
                    { who: 'companion', en: 'The Peak is bright. And the key in my bag is humming along with it.', de: 'Der Gipfel leuchtet hell. Und der Schlüssel in meiner Tasche summt mit.' },
                    { who: 'companion2', en: 'Browney is sniffing the whole mountain. I think he wants to climb it.', de: 'Browney beschnuppert den ganzen Berg. Ich glaube, er will hinaufklettern.' },
                    { who: 'companion2', en: 'Here! In the crack. "POSTERIOR". Trix, it is so warm.', de: 'Hier! In der Spalte. "POSTERIOR". Trix, er ist so warm.' },
                    { who: 'player', en: 'Hand it over. Let us see if the Guild\'s greatest secret fits together like a toy.', de: 'Gib her. Mal sehen, ob das größte Geheimnis der Gilde zusammenpasst wie ein Spielzeug.' },
                    { who: 'companion', en: 'It did. The whole key hums as one note.', de: 'Hat es. Der ganze Schlüssel summt als ein Ton.' },
                    { beat: 'background', bg: 'images/story/w13_peak/proof_stone.webp' },
                    { who: 'companion2', en: 'And look over there. Someone scratched out the last line of the proof. The dust is still loose.', de: 'Und seht dort drüben. Jemand hat die letzte Zeile des Beweises ausgekratzt. Der Staub ist noch locker.' },
                    { who: 'player', en: 'Fresh. Meaning somebody is still erasing things. I would like to meet that somebody.', de: 'Frisch. Das heißt, jemand löscht immer noch Dinge. Ich würde diesen Jemand gern kennenlernen.' },
                    { who: 'companion', en: 'With the three of us, I would like to see her try to stop us.', de: 'Zu dritt möchte ich sehen, wie sie versucht, uns aufzuhalten.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/w13_peak/peak_foot.webp',
                lines: [
                    { who: 'player', en: 'The Peak is singing, Trix. I can feel the key\'s first half answering it.', de: 'Der Gipfel singt, Trix. Ich spüre, wie die erste Schlüsselhälfte antwortet.' },
                    { who: 'player', en: 'Browney is sniffing the whole mountain. I think he wants to climb it.', de: 'Browney beschnuppert den ganzen Berg. Ich glaube, er will hinaufklettern.' },
                    { who: 'companion2', en: 'Found it. In a crack, under the seal. "POSTERIOR".', de: 'Gefunden. In einer Spalte, unter dem Siegel. "POSTERIOR".' },
                    { who: 'companion', en: 'Give me that. ...There. The whole key. It is almost purring.', de: 'Gib her. ...So. Der ganze Schlüssel. Er schnurrt fast.' },
                    { who: 'player', en: 'Oh, it is so happy. It has been apart for three hundred years.', de: 'Oh, er ist so glücklich. Er war dreihundert Jahre lang getrennt.' },
                    { beat: 'background', bg: 'images/story/w13_peak/proof_stone.webp' },
                    { who: 'companion2', en: 'Syla, look at the proof stone. The last line was scratched out recently. The dust has not settled.', de: 'Syla, sieh dir den Beweisstein an. Die letzte Zeile wurde vor kurzem ausgekratzt. Der Staub hat sich nicht gesetzt.' },
                    { who: 'companion', en: 'So someone is still finishing the job. Pleasant. Remind me to be furious later.', de: 'Jemand bringt die Arbeit also noch zu Ende. Angenehm. Erinnert mich daran, später wütend zu sein.' },
                    { who: 'player', en: 'We will find her. Together.', de: 'Wir finden sie. Zusammen.' },
                ],
            },
        },
    },
    w14_sanctum: {
        note: 'World 14 (The Apex Remnant): The First Cartographers\' Sanctum. The last maintenance log is signed by C. Quell, with \'Variance: 0\'. The villain\'s name is revealed (Calista Quell). Stox recognises the signature from the faceless portrait frame. All three heroes together; Verun\'s voice closes the scene.',
        bg: 'images/backgrounds/The-Nexus-Background.webp',
        stage: 'ascended',
        pet: 'drifter',
        pictureLayouts: {
            'images/story/w14_sanctum/sanctum_door.webp': {
                sprites: { left: { x: 22.3, y: 95.4, s: 0.74, r: 0, pose: 'up' }, right: { x: 79.2, y: 96.9, s: 0.79, r: 0, pose: 'up' }, mid: { x: 54.5, y: 97, s: 0.78, r: 0, pose: 'up' }, pet: { x: 94.5, y: 96.3, s: 0.82, r: 0 } },
                bubbles: { left: { x: 22.4, y: 40.6 }, right: { x: 80.7, y: 39.9 }, mid: { x: 54.2, y: 40.2 } },
            },
            'images/story/w14_sanctum/sanctum_desk.webp': {
                sprites: { left: { x: 17.2, y: 95.2, s: 1, r: 0, pose: 'right' }, right: { x: 84.1, y: 96, s: 1, r: 0, pose: 'left' }, mid: { x: 61.4, y: 97.5, s: 1, r: 0, pose: 'left' }, pet: { x: 37.1, y: 95.3, s: 1, r: 0 } },
                bubbles: { left: { x: 16.7, y: 27.1 }, right: { x: 84.3, y: 28.4 }, mid: { x: 61, y: 28.9 } },
            },
            'images/story/w14_sanctum/sanctum_register.webp': {
                sprites: { left: { x: 24, y: 94.8, s: 0.85, r: 0, pose: 'up' }, right: { x: 83.2, y: 95.9, s: 0.89, r: 0, pose: 'up' }, mid: { x: 62.7, y: 94.9, s: 0.87, r: 0, pose: 'up' }, pet: { x: 41.2, y: 94.3, s: 0.84, r: 0 } },
                bubbles: { left: { x: 21.9, y: 34.2 }, right: { x: 81.1, y: 33.2 }, mid: { x: 60.4, y: 34.3 } },
            },
        },
        pairings: {
            stox: {
                companion: 'syla',
                companion2: 'trix',
                bg: 'images/story/w14_sanctum/sanctum_door.webp',
                lines: [
                    { who: 'companion', en: 'The door opened for the key without a sound. Listen to how quiet this room is.', de: 'Die Tür hat sich für den Schlüssel ohne ein Geräusch geöffnet. Hört, wie still dieser Raum ist.' },
                    { who: 'companion', en: 'Drifter will not go in first. He is waiting for us to lead.', de: 'Drifter will nicht als Erster hinein. Er wartet darauf, dass wir vorangehen.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_desk.webp' },
                    { who: 'companion2', en: 'There is a maintenance log on the desk. Last entry before the Collapse. Stox, you will want to read this.', de: 'Auf dem Tisch liegt ein Wartungslog. Letzter Eintrag vor dem Kollaps. Stox, das willst du lesen.' },
                    { who: 'player', en: '"Variance: zero. Procedure complete." Signed: C. Quell. ...Calista Quell.', de: '"Varianz: null. Vorgang abgeschlossen." Gezeichnet: C. Quell. ...Calista Quell.' },
                    { who: 'companion', en: 'Not on the exile list. Not on any list.', de: 'Nicht auf der Verbanntenliste. Auf keiner Liste.' },
                    { who: 'player', en: 'I have seen that signature. On the back of a portrait frame in the archive, the one with no face. I could not read it before. I can now.', de: 'Ich habe diese Unterschrift gesehen. Auf der Rückseite eines Porträtrahmens im Archiv, dem ohne Gesicht. Ich konnte sie vorher nicht lesen. Jetzt kann ich es.' },
                    { who: 'companion2', en: 'Verun wrote the book. Quell used it. And the Guild buried the one who warned them.', de: 'Verun hat das Buch geschrieben. Quell hat es benutzt. Und die Gilde hat den begraben, der sie gewarnt hat.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_register.webp' },
                    { who: 'companion', en: 'In the Void he asked us to say his name where they could hear it. This is that place.', de: 'In der Leere hat er uns gebeten, seinen Namen dort zu sagen, wo sie ihn hören können. Dies ist dieser Ort.' },
                    { who: 'player', en: 'The register. The whole Vors line was scraped out of it with a chisel. This gap is where his name belonged.', de: 'Das Register. Die ganze Vors-Linie wurde mit einem Meißel herausgekratzt. In dieser Lücke gehörte sein Name hin.' },
                    { who: 'companion2', en: 'Then we do more than say it. That is my family on that wall. We put it back. Verun Vors, author of The Apex of Stochastics. He warned them.', de: 'Dann sagen wir ihn nicht nur. Das ist meine Familie an dieser Wand. Wir setzen ihn wieder ein. Verun Vors, Verfasser von Der Apex der Stochastik. Er hat sie gewarnt.' },
                    { who: 'voice', en: '...Louder. The stone has to hear it.', de: '...Lauter. Der Stein muss es hören.' },
                    { who: 'player', en: 'Verun Vors. First Cartographer. He told the Guild the Apex was being edited from inside, and he was right.', de: 'Verun Vors. Erster Kartograf. Er sagte der Gilde, der Apex werde von innen bearbeitet, und er hatte recht.' },
                    { who: 'companion', en: 'Look! The gap is filling with light. The letters are writing themselves.', de: 'Seht! Die Lücke füllt sich mit Licht. Die Buchstaben schreiben sich selbst.' },
                    { who: 'voice', en: '...There. Three hundred years, and the stone remembers me. Thank you. Now listen: she is not hiding. She is inside the Apex, finishing the edit. The register opens the inner door for those it knows. It knows you now.', de: '...So. Dreihundert Jahre, und der Stein erinnert sich an mich. Danke. Nun hört zu: Sie versteckt sich nicht. Sie ist im Apex und bringt die Bearbeitung zu Ende. Das Register öffnet die innere Tür für die, die es kennt. Euch kennt es jetzt.' },
                    { who: 'companion2', en: 'Then the way in is open. Let us go and meet Calista Quell.', de: 'Dann ist der Weg hinein offen. Gehen wir und treffen Calista Quell.' },
                ],
            },
            trix: {
                companion: 'stox',
                companion2: 'syla',
                bg: 'images/story/w14_sanctum/sanctum_door.webp',
                lines: [
                    { who: 'companion', en: 'The door opened for the key without a sound. The room feels like it has been holding its breath for three centuries.', de: 'Die Tür hat sich für den Schlüssel ohne ein Geräusch geöffnet. Der Raum fühlt sich an, als hielte er seit drei Jahrhunderten den Atem an.' },
                    { who: 'companion2', en: 'Drifter will not go in first. He is waiting for us to lead.', de: 'Drifter will nicht als Erster hinein. Er wartet darauf, dass wir vorangehen.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_desk.webp' },
                    { who: 'companion2', en: 'Trix, there is a maintenance log. Last entry before the Collapse.', de: 'Trix, hier liegt ein Wartungslog. Letzter Eintrag vor dem Kollaps.' },
                    { who: 'player', en: '"Variance: zero. Procedure complete." Signed: C. Quell. ...Calista Quell.', de: '"Varianz: null. Vorgang abgeschlossen." Gezeichnet: C. Quell. ...Calista Quell.' },
                    { who: 'companion', en: 'I know that signature. It is on the back of a portrait frame in the archive. The portrait with no face. I could not read it until now.', de: 'Ich kenne diese Unterschrift. Sie steht auf der Rückseite eines Porträtrahmens im Archiv. Dem Porträt ohne Gesicht. Ich konnte sie bis jetzt nicht lesen.' },
                    { who: 'player', en: 'Then it was never Verun. It was never a Vors. They crossed out my family for her crime.', de: 'Dann war es nie Verun. Es war nie ein Vors. Sie haben meine Familie für ihr Verbrechen gestrichen.' },
                    { who: 'companion2', en: 'We will make them read it out loud. All of it.', de: 'Wir werden sie zwingen, es laut vorzulesen. Alles.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_register.webp' },
                    { who: 'companion', en: 'In the Void he asked for his name to be said where they could hear it. This is that place.', de: 'In der Leere hat er darum gebeten, dass sein Name dort gesagt wird, wo sie ihn hören können. Dies ist dieser Ort.' },
                    { who: 'player', en: 'Look at the wall. A whole line scraped smooth. That is my family. That is where "Vors" used to be.', de: 'Seht euch die Wand an. Eine ganze Zeile glattgekratzt. Das ist meine Familie. Dort stand einmal "Vors".' },
                    { who: 'companion2', en: 'Then write it back, Trix. It is yours to write.', de: 'Dann schreib es zurück, Trix. Es ist deines zu schreiben.' },
                    { who: 'voice', en: '...Vors. A Vors. Say my name where they can hear it.', de: '...Vors. Eine Vors. Sag meinen Namen, dort, wo sie ihn hören können.' },
                    { who: 'player', en: 'Verun Vors. First Cartographer. My ancestor. He warned them, and they struck out a whole family for him being right.', de: 'Verun Vors. Erster Kartograf. Mein Vorfahr. Er hat sie gewarnt, und sie haben eine ganze Familie gestrichen, weil er recht hatte.' },
                    { who: 'companion', en: 'The gap is filling with light, Trix. The letters are writing themselves, one by one.', de: 'Die Lücke füllt sich mit Licht, Trix. Die Buchstaben schreiben sich selbst, einer nach dem anderen.' },
                    { who: 'voice', en: '...There. Three hundred years, and the stone remembers me. Good. Now listen, all of you: she is not hiding. She is inside the Apex, finishing the edit. The register opens the inner door for those it knows. It knows a Vors again.', de: '...So. Dreihundert Jahre, und der Stein erinnert sich an mich. Gut. Nun hört zu, ihr alle: Sie versteckt sich nicht. Sie ist im Apex und bringt die Bearbeitung zu Ende. Das Register öffnet die innere Tür für die, die es kennt. Es kennt wieder einen Vors.' },
                    { who: 'player', en: 'Then the door is open. And this time I walk in under my own name.', de: 'Dann ist die Tür offen. Und diesmal gehe ich unter meinem eigenen Namen hinein.' },
                ],
            },
            syla: {
                companion: 'trix',
                companion2: 'stox',
                bg: 'images/story/w14_sanctum/sanctum_door.webp',
                lines: [
                    { who: 'companion', en: 'The door opened for the key without a sound. It is so quiet. Even you have stopped humming, Forest Girl.', de: 'Die Tür hat sich für den Schlüssel ohne ein Geräusch geöffnet. Es ist so still. Sogar du hast aufgehört zu summen, Waldmädchen.' },
                    { who: 'player', en: 'Drifter will not go in first. He is waiting for us to lead.', de: 'Drifter will nicht als Erster hinein. Er wartet darauf, dass wir vorangehen.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_desk.webp' },
                    { who: 'companion2', en: 'There is a maintenance log. "Variance: zero. Procedure complete." Signed: C. Quell. Calista Quell.', de: 'Hier liegt ein Wartungslog. "Varianz: null. Vorgang abgeschlossen." Gezeichnet: C. Quell. Calista Quell.' },
                    { who: 'player', en: 'Quell? A woman. And she wrote "Variance: zero" like she was closing a ledger. That is my father at the window. That is my fox, going quiet.', de: 'Quell? Eine Frau. Und sie schrieb "Varianz: null", als würde sie ein Buch schließen. Das ist mein Vater am Fenster. Das ist mein Fuchs, der still wird.' },
                    { who: 'companion2', en: 'That signature is on the back of a portrait in the archive. The one without a face. I should have said so earlier.', de: 'Diese Unterschrift steht auf der Rückseite eines Porträts im Archiv. Dem ohne Gesicht. Das hätte ich früher sagen sollen.' },
                    { who: 'companion', en: 'The Guild exiled my family for her crime. For this woman, who is probably still in here somewhere.', de: 'Die Gilde hat meine Familie für ihr Verbrechen verbannt. Für diese Frau, die wahrscheinlich noch irgendwo hier drin ist.' },
                    { who: 'player', en: 'Then we finish what Verun started. All of us.', de: 'Dann bringen wir zu Ende, was Verun begonnen hat. Wir alle.' },
                    { beat: 'background', bg: 'images/story/w14_sanctum/sanctum_register.webp' },
                    { who: 'companion2', en: 'In the Void he asked us to say his name where they could hear it. This is that place.', de: 'In der Leere hat er uns gebeten, seinen Namen dort zu sagen, wo sie ihn hören können. Dies ist dieser Ort.' },
                    { who: 'player', en: 'Oh... look at the wall. Where the writing was scraped away, there is a gap. His name belongs right there.', de: 'Oh... seht euch die Wand an. Dort, wo die Schrift weggekratzt wurde, ist eine Lücke. Genau dort gehört sein Name hin.' },
                    { who: 'companion', en: 'Then we put it back. All of it. Say it, Forest Girl, loud enough for the stone.', de: 'Dann setzen wir ihn wieder ein. Ganz. Sag ihn, Waldmädchen, laut genug für den Stein.' },
                    { who: 'voice', en: '...Say it. Say my name.', de: '...Sag es. Sag meinen Namen.' },
                    { who: 'player', en: 'Verun Vors. We hear you. Your name goes back where it belongs.', de: 'Verun Vors. Wir hören dich. Dein Name kommt dorthin zurück, wo er hingehört.' },
                    { who: 'companion2', en: 'The gap is filling with light. The letters are writing themselves. The register is accepting it.', de: 'Die Lücke füllt sich mit Licht. Die Buchstaben schreiben sich selbst. Das Register nimmt ihn an.' },
                    { who: 'voice', en: '...There. Three hundred years, and the stone remembers me. Thank you, children. Now listen: she is not hiding. She is inside the Apex, finishing the edit. The register opens the inner door for those it knows. It knows you now.', de: '...So. Dreihundert Jahre, und der Stein erinnert sich an mich. Danke, Kinder. Nun hört zu: Sie versteckt sich nicht. Sie ist im Apex und bringt die Bearbeitung zu Ende. Das Register öffnet die innere Tür für die, die es kennt. Euch kennt es jetzt.' },
                    { who: 'companion', en: 'Then the door is open. Stay close, both of you.', de: 'Dann ist die Tür offen. Bleibt dicht bei mir, ihr beiden.' },
                ],
            },
        },
    },
};

//------------------------------------------------------------------------
// LOOKUPS
//------------------------------------------------------------------------

// Names of the story meetings, shown on the world map instead of the hero's name.
const COMPANION_SCENE_TITLES = {
    home_stox: { en: 'A Hamlet Under Test', de: 'Ein Weiler auf dem Prüfstand' },
    den_reunion: { en: 'The Stone That Hums', de: 'Der Stein, der summt' },
    w3_assembly: { en: 'The Bimodal Assembly', de: 'Die bimodale Versammlung' },
    w4_forest: { en: 'Where the Branches Lean', de: 'Wo sich die Äste neigen' },
    home_trix: { en: 'The Silent Observatory', de: 'Das stille Observatorium' },
    home_syla: { en: 'Under the Old Grove', de: 'Unter dem alten Hain' },
    w7_loom: { en: 'The Loom That Will Not Update', de: 'Der Webstuhl, der nichts dazulernt' },
    w8_fieldbase: { en: 'Three Reports, No Reply', de: 'Drei Berichte, keine Antwort' },
    w9_vortex: { en: 'The Stone Stamped VORS', de: 'Der Stein mit dem Stempel VORS' },
    w10_enclave: { en: 'What the Estimators Said', de: 'Was die Schätzer sagten' },
    w11_ghost: { en: 'Verun in the Mist', de: 'Verun im Nebel' },
    w12_wreck: { en: 'The Order Not to Update', de: 'Der Befehl, nichts zu ändern' },
    w13_peak: { en: 'Fresh Ink on Peak Mu', de: 'Frische Tinte am Gipfel Mu' },
    w14_sanctum: { en: 'Variance: Zero', de: 'Varianz: Null' },
};

// The map name of a story meeting in the given language ('de' or English), or
// '' when the scene has none.
export function companionSceneTitle(sceneId, lang) {
    const title = COMPANION_SCENE_TITLES[sceneId];
    return title ? (lang === 'de' ? title.de : title.en) : '';
}

// A hero's script for a scene (the current player's unless `heroId` is given;
// companion id, sprite look, lines, background), or null when the scene doesn't exist or has no script for the
// chosen character.
export function getCompanionPairing(sceneId, heroId = STATE && STATE.playerCharacter) {
    const scene = COMPANION_SCENES[sceneId] || COOP_AFTERMATH_SCENES[sceneId] || REVEAL_SCENES[sceneId];
    const pairing = scene && scene.pairings[heroId];
    if (!pairing) return null;
    // A script with no English text yet is still a draft from the story editor: keep it hidden.
    if (!pairing.lines.some(l => l.en && l.en.trim())) return null;
    const stage = ['none', 'ascended'].includes(scene.stage) ? scene.stage : 'base';
    const looks = Object.fromEntries(Object.keys(COMPANION_LOOKS).map(h => [h, COMPANION_LOOKS[h][stage]]));
    // A scene after a co-op encounter can show the quest item that encounter handed over (once a layout places it).
    const quest = scene.coop ? questItemFor(scene.coop) : null;
    return {
        ...pairing, bg: pairing.bg || scene.bg, fallbackBg: scene.bg, stage, pet: stage === 'ascended' ? (scene.pet || '') : '', looks,
        questItem: quest && quest.art ? { art: quest.art } : null,
        noAffinity: !!scene.noAffinity,
        layout: scene.layout || null, pictureLayouts: scene.pictureLayouts || {},
    };
}

// Where the heroes and speech bubbles stand while picture `path` is on screen.
// The node's own `layout` is the default for all its pictures; `pictureLayouts[path]`
// replaces it for single spots, and the script's own `heroLayout` (the version played by
// one hero) replaces both. Spots with no entry keep the stage's built-in position.
// Shape: { sprites: { left|right|mid|pet: { x, y, s, r, pose? } }, bubbles: { left|right|mid|voice: { x, y } } }
// (x/y in percent of the screen: sprites by their feet-centre, bubbles by their top-centre;
// s = size factor, r = rotation in degrees, pose = which idle picture a hero shows:
// 'down' (default), 'up', 'left' or 'right').
export function resolveCompanionLayout(pairing, path) {
    const base = pairing.layout || {};
    const pic = (pairing.pictureLayouts || {})[path] || {};
    const hero = pairing.heroLayout || {};
    return { sprites: { ...base.sprites, ...pic.sprites, ...hero.sprites }, bubbles: { ...base.bubbles, ...pic.bubbles, ...hero.bubbles } };
}

// Every story scene the Replay gallery lists, in story order: [id, world, kind, English
// title, German title]. `kind` is 'meeting', 'reveal' (a hero's secret half) or 'coop' (the
// scene after a co-op encounter, named after the encounter).
const REPLAY_SCENE_ROWS = [
    ['home_stox', 1, 'meeting'],
    ['den_reunion', 2, 'meeting'],
    ['w3_assembly', 3, 'meeting'],
    ['w4_forest', 4, 'meeting'],
    ['after_coop_w4', 4, 'coop', 'Through the Vortex, Together', 'Gemeinsam durch den Strudel'],
    ['home_trix', 5, 'meeting'],
    ['home_syla', 6, 'meeting'],
    ['after_coop_w6', 6, 'coop', 'The Grove Does Not Sing Alone', 'Der Hain singt nicht allein'],
    ['reveal_syla', 6, 'reveal', "Syla's Secret", 'Sylas Geheimnis'],
    ['w7_loom', 7, 'meeting'],
    ['w8_fieldbase', 8, 'meeting'],
    ['after_coop_w8', 8, 'coop', 'Before the Lantern Goes Out', 'Bevor die Laterne erlischt'],
    ['reveal_stox', 8, 'reveal', "Stox's Secret", "Stox' Geheimnis"],
    ['w9_vortex', 9, 'meeting'],
    ['after_coop_w9', 9, 'coop', 'The Whirl at the Delta', 'Der Wirbel im Delta'],
    ['w10_enclave', 10, 'meeting'],
    ['w11_ghost', 11, 'meeting'],
    ['after_coop_w11', 11, 'coop', 'What the Mist Hides', 'Was der Nebel verbirgt'],
    ['reveal_trix', 11, 'reveal', "Trix's Secret", "Trix' Geheimnis"],
    ['w12_wreck', 12, 'meeting'],
    ['w13_peak', 13, 'meeting'],
    ['after_coop_w13', 13, 'coop', 'The Sentinel on the Plateau', 'Der Sentinel auf dem Plateau'],
    ['w14_sanctum', 14, 'meeting'],
];

// The scenes for the Replay gallery: { id, world, kind, en, de, heroes } where `heroes` are the
// player heroes that have a (non-draft) script for it. Scenes with no script at all are left out.
export function getReplayScenes() {
    return REPLAY_SCENE_ROWS.map(([id, world, kind, en, de]) => ({
        id, world, kind,
        en: en || COMPANION_SCENE_TITLES[id].en,
        de: de || COMPANION_SCENE_TITLES[id].de,
        heroes: Object.keys(COMPANION_LOOKS).filter(h => getCompanionPairing(id, h)),
    })).filter(sc => sc.heroes.length > 0);
}

// How many of the story scenes a save has watched or skipped, out of all scenes its hero has a
// version of: { watched, total }. Read from that slot's own "seen" marks, so deleting the slot
// (which clears them) resets it.
export function getStoryProgress(slotNum, heroId) {
    const own = getReplayScenes().filter(sc => sc.heroes.includes(heroId));
    let watched = 0;
    try {
        watched = own.filter(sc => localStorage.getItem(`storyline_seen_slot${slotNum}_companion_scene_${sc.id}`) === '1').length;
    } catch (e) { /* storage unavailable */ }
    return { watched, total: own.length };
}

// True once the player has watched this scene in the current save.
export function hasMetCompanion(sceneId) {
    return hasSeen('companion_scene', { sceneId });
}
