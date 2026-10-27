//------------------------------------------------------------------------
//-------------------SECRET HALF REVEAL SCENES-----------------------------
//------------------------------------------------------------------------
// The six scenes where a hero tells another hero their secret half (see
// dev/docs/STORYLINE.md sections 4a and 4b): Syla (her parents and the fox),
// Stox (the faceless portrait) and Trix (the Warden, the key, the vault and
// Verun's book). Three scenes, each with a script for the two OTHER heroes as
// the player, so 3 x 2 = 6. A scene opens on the map (config `revealNodes`)
// once the player's hero trusts the teller enough (Syla 3 points, Stox 6, Trix
// 9: she opens up last) and the world's story node was watched. Same shape as
// COMPANION_SCENES (companion-scenes.js, which also reads this table);
// `noTrust` means watching earns nothing, so all pairs stay equal.
// Lines: { who: 'player' | 'companion', en, de }.

export const REVEAL_SCENES = {
    reveal_syla: {
        note: 'World 6, after the Grove visit. Syla tells the secret half: her father at the window, her mother and the eight notes, the fox going quiet. The safe half was told in home_syla.',
        teller: 'syla', noTrust: true, stage: 'base',
        bg: 'images/backgrounds/Frequency-Forest-Background.webp',
        pairings: {
            stox: { companion: 'syla', lines: [
                { who: 'companion', en: "Stox... may I tell you something I have not told anyone at the Outpost?", de: "Stox... darf ich dir etwas erzählen, das ich im Außenposten noch niemandem erzählt habe?" },
                { who: 'player', en: "You may. I will not write it down unless you say I can.", de: "Du darfst. Ich schreibe es nicht auf, es sei denn, du erlaubst es." },
                { who: 'companion', en: "My father stands at the same window every morning, at the same hour, and says the same words. My mother hums the eight notes at her loom and never gets one wrong.", de: "Mein Vater steht jeden Morgen am selben Fenster, zur selben Stunde, und sagt dieselben Worte. Meine Mutter summt am Webstuhl die acht Töne und verpatzt nie einen." },
                { who: 'player', en: "The same pattern. Zero variance. In people.", de: "Dasselbe Muster. Varianz null. Bei Menschen." },
                { who: 'companion', en: "I thought every family was like that. Then I came to the Outpost, where people forget things and change their minds. It was the strangest thing I ever saw.", de: "Ich dachte, jede Familie wäre so. Dann kam ich in den Außenposten, wo Leute Dinge vergessen und ihre Meinung ändern. Es war das Seltsamste, was ich je gesehen habe." },
                { who: 'player', en: "And your fox?", de: "Und dein Fuchs?" },
                { who: 'companion', en: "She is getting quiet, like them. Slower every year. I did not come for the forest. I came for her.", de: "Sie wird still, wie sie. Jedes Jahr langsamer. Ich bin nicht wegen des Waldes gekommen. Ich bin wegen ihr gekommen." },
                { who: 'player', en: "Then the data point is not the Grove. It is the people in it. I will help you look, and I will not call it a coincidence.", de: "Dann ist der Datenpunkt nicht der Hain. Es sind die Menschen darin. Ich helfe dir beim Suchen, und ich nenne es keinen Zufall." },
                { who: 'companion', en: "You said that so kindly. Thank you, Stox.", de: "Das hast du so freundlich gesagt. Danke, Stox." },
            ] },
            trix: { companion: 'syla', lines: [
                { who: 'companion', en: "Trix. Can you keep a secret? A real one, not the Outpost kind.", de: "Trix. Kannst du ein Geheimnis für dich behalten? Ein echtes, nicht von der Außenposten-Sorte." },
                { who: 'player', en: "I have kept bigger ones than you can imagine. Go on, Forest Girl.", de: "Ich habe größere behalten, als du dir vorstellen kannst. Erzähl, Waldmädchen." },
                { who: 'companion', en: "My father stands at the same window every morning and says the same words. My mother hums the eight notes at her loom and never misses one.", de: "Mein Vater steht jeden Morgen am selben Fenster und sagt dieselben Worte. Meine Mutter summt am Webstuhl die acht Töne und verpasst nie einen." },
                { who: 'player', en: "It is a loop. Your whole home is a loop, and nobody noticed for three hundred years.", de: "Das ist eine Schleife. Dein ganzes Zuhause ist eine Schleife, und dreihundert Jahre lang hat es niemand bemerkt." },
                { who: 'companion', en: "You noticed. In one afternoon.", de: "Du hast es bemerkt. An einem Nachmittag." },
                { who: 'player', en: "I count things. ...And your fox?", de: "Ich zähle Dinge. ...Und dein Fuchs?" },
                { who: 'companion', en: "She is going quiet, like them. I came to the Outpost to find someone who could help her.", de: "Sie wird still, wie sie. Ich bin in den Außenposten gekommen, um jemanden zu finden, der ihr helfen kann." },
                { who: 'player', en: "I am sorry. Truly. Do not tell anyone I said that.", de: "Es tut mir leid. Wirklich. Sag niemandem, dass ich das gesagt habe." },
                { who: 'companion', en: "Do not be nice, Trix, or I will cry.", de: "Sei nicht nett, Trix, sonst muss ich weinen." },
                { who: 'player', en: "Then I will be rude: pull yourself together. We have a forest to wake up.", de: "Dann bin ich eben unhöflich: reiß dich zusammen. Wir haben einen Wald aufzuwecken." },
            ] },
        },
    },

    reveal_stox: {
        note: 'World 8, after the field base. Stox tells the secret half: the faceless portrait in the archive, the too-clean records, the unreadable signature under varnish (he does NOT yet say whose signature it is; that comes in world 14).',
        teller: 'stox', noTrust: true, stage: 'base',
        bg: 'images/backgrounds/Hypothesis-Hinterlands-Background.webp',
        pairings: {
            trix: { companion: 'stox', lines: [
                { who: 'companion', en: "I have enough data now. Many meetings, joint puzzles, no betrayals. The chance that you repeat this is low. I will tell you.", de: "Ich habe jetzt genug Daten. Viele Treffen, gemeinsame Rätsel, kein Verrat. Die Wahrscheinlichkeit, dass du es weitererzählst, ist gering. Ich erzähle es dir." },
                { who: 'player', en: "You calculated whether to trust me. Charming.", de: "Du hast berechnet, ob du mir vertrauen kannst. Reizend." },
                { who: 'companion', en: "In the archive hangs a portrait of the First Cartographer. The face is not damaged. It was never painted.", de: "Im Archiv hängt ein Porträt der Ersten Kartografin. Das Gesicht ist nicht beschädigt. Es wurde nie gemalt." },
                { who: 'player', en: "And the records about her?", de: "Und die Aufzeichnungen über sie?" },
                { who: 'companion', en: "Smoothed. Every report of the Collapse is too clean. Real records have errors. These were corrected after the fact.", de: "Geglättet. Jeder Bericht über den Zusammenbruch ist zu sauber. Echte Aufzeichnungen haben Fehler. Diese wurden nachträglich korrigiert." },
                { who: 'player', en: "What is on the back of the frame?", de: "Was steht auf der Rückseite des Rahmens?" },
                { who: 'companion', en: "A signature, under three layers of varnish. I cannot read it yet. I keep a sketch of it. I left the archive to find the person who was painted out.", de: "Eine Unterschrift, unter drei Schichten Firnis. Ich kann sie noch nicht lesen. Ich habe eine Skizze davon. Ich habe das Archiv verlassen, um die Person zu finden, die herausgemalt wurde." },
                { who: 'player', en: "A faceless founder, and a Guild that sands every edge. ...All right, bookworm. I am in.", de: "Eine Gründerin ohne Gesicht, und eine Gilde, die jede Kante abschleift. ...Na gut, Bücherwurm. Ich bin dabei." },
                { who: 'companion', en: "Statistically, I hoped you would be.", de: "Statistisch gesehen habe ich gehofft, dass du es bist." },
            ] },
            syla: { companion: 'stox', lines: [
                { who: 'companion', en: "Syla, I have reached my threshold. Enough data to tell you something. I state the threshold aloud, as a courtesy: it is six.", de: "Syla, ich habe meine Schwelle erreicht. Genug Daten, um dir etwas zu erzählen. Ich nenne die Schwelle laut, aus Höflichkeit: sie liegt bei sechs." },
                { who: 'player', en: "You count your friends?", de: "Du zählst deine Freunde?" },
                { who: 'companion', en: "I count everything. In the archive hangs a portrait of the First Cartographer. Her face was never painted.", de: "Ich zähle alles. Im Archiv hängt ein Porträt der Ersten Kartografin. Ihr Gesicht wurde nie gemalt." },
                { who: 'player', en: "Never? Oh... somebody painted a whole person and then painted her away.", de: "Nie? Oh... jemand hat einen ganzen Menschen gemalt und dann weggemalt." },
                { who: 'companion', en: "Yes. And the records about her are too clean, as if smoothed. Real records have errors.", de: "Ja. Und die Aufzeichnungen über sie sind zu sauber, wie geglättet. Echte Aufzeichnungen haben Fehler." },
                { who: 'player', en: "What is on the back of the frame?", de: "Was steht auf der Rückseite des Rahmens?" },
                { who: 'companion', en: "A signature under three layers of varnish. I cannot read it yet. I left the archive to find the person who was painted out.", de: "Eine Unterschrift unter drei Schichten Firnis. Ich kann sie noch nicht lesen. Ich habe das Archiv verlassen, um die Person zu finden, die herausgemalt wurde." },
                { who: 'player', en: "Maybe she is lonely somewhere, like the Grove. We will find her face, Stox.", de: "Vielleicht ist sie irgendwo einsam, wie der Hain. Wir finden ihr Gesicht, Stox." },
                { who: 'companion', en: "I do not promise faces. I promise evidence.", de: "Ich verspreche keine Gesichter. Ich verspreche Beweise." },
                { who: 'player', en: "That is the same thing, only more polite.", de: "Das ist dasselbe, nur höflicher." },
            ] },
        },
    },

    reveal_trix: {
        note: 'World 11, after Verun\'s ghost. Trix tells the secret half last and only after the ghost: the Observatory exile, the Warden, the stolen key, the vault, Verun\'s book with her people\'s names in it, the debt.',
        teller: 'trix', noTrust: true, stage: 'ascended', pet: 'browney',
        bg: 'images/backgrounds/Null-Hypothesis-Void.webp',
        pairings: {
            stox: { companion: 'trix', lines: [
                { who: 'companion', en: "Do not interrupt. Do not write. Do not analyse, for once.", de: "Unterbrich nicht. Schreib nicht mit. Analysiere nicht, ausnahmsweise." },
                { who: 'player', en: "...Acknowledged.", de: "...Verstanden." },
                { who: 'companion', en: "The Observatory was my home. My people were exiled to the Rift generations ago. Its readings slide toward zero every year, and the Guild calls it noise.", de: "Das Observatorium war mein Zuhause. Mein Volk wurde vor Generationen in den Riss verbannt. Seine Messwerte sinken jedes Jahr gegen null, und die Gilde nennt es Rauschen." },
                { who: 'player', en: "Variance falling. I read your logbook.", de: "Fallende Varianz. Ich habe dein Logbuch gelesen." },
                { who: 'companion', en: "I joined the Guild program under the Warden to get proof. I stole his key. Under the Outpost there is a vault, and in it a book by Verun Vors. My people's names are in its pages, in his hand, long before I was born.", de: "Ich bin dem Gildenprogramm unter dem Wächter beigetreten, um Beweise zu bekommen. Ich habe seinen Schlüssel gestohlen. Unter dem Außenposten liegt ein Tresor, und darin ein Buch von Verun Vors. Die Namen meines Volkes stehen darin, in seiner Handschrift, lange vor meiner Geburt." },
                { who: 'player', en: "He wrote you into his book.", de: "Er hat euch in sein Buch geschrieben." },
                { who: 'companion', en: "He knew we would come looking. I keep the uniform and the key. It is a debt, and I mean to repay it.", de: "Er wusste, dass wir danach suchen würden. Ich behalte die Uniform und den Schlüssel. Es ist eine Schuld, und ich werde sie begleichen." },
                { who: 'player', en: "To whom?", de: "Wem gegenüber?" },
                { who: 'companion', en: "Him. And everyone the Guild smoothed out. ...Do not make that face.", de: "Ihm. Und allen, die die Gilde geglättet hat. ...Mach nicht dieses Gesicht." },
                { who: 'player', en: "This is my normal face.", de: "Das ist mein normales Gesicht." },
                { who: 'companion', en: "Then it is unbearable. Come on. The ghost heard all of it anyway.", de: "Dann ist es unerträglich. Komm. Der Geist hat sowieso alles gehört." },
            ] },
            syla: { companion: 'trix', lines: [
                { who: 'companion', en: "Forest Girl. Sit. I am only going to say this once, so listen the way you listen to your trees.", de: "Waldmädchen. Setz dich. Ich sage das nur einmal, also hör zu, wie du deinen Bäumen zuhörst." },
                { who: 'player', en: "I am listening. I promise.", de: "Ich höre zu. Versprochen." },
                { who: 'companion', en: "The Observatory was my home. My people were exiled to the Rift generations ago. The readings there slide toward zero every year, and the Guild calls it noise.", de: "Das Observatorium war mein Zuhause. Mein Volk wurde vor Generationen in den Riss verbannt. Die Messwerte dort sinken jedes Jahr gegen null, und die Gilde nennt es Rauschen." },
                { who: 'player', en: "Oh, Trix. That is like the Grove, but slow and cold.", de: "Oh, Trix. Das ist wie der Hain, nur langsam und kalt." },
                { who: 'companion', en: "I joined the Guild program under the Warden to find proof. I stole his key and found a vault under the Outpost. In it was Verun's book, with my people's names in it, in his hand, long before I was born.", de: "Ich bin dem Gildenprogramm unter dem Wächter beigetreten, um Beweise zu finden. Ich habe seinen Schlüssel gestohlen und einen Tresor unter dem Außenposten entdeckt. Darin lag Veruns Buch, mit den Namen meines Volkes, in seiner Handschrift, lange vor meiner Geburt." },
                { who: 'player', en: "He knew you would come.", de: "Er wusste, dass ihr kommt." },
                { who: 'companion', en: "I keep the uniform and the key. It is a debt, and I mean to repay it. Do not dare hug me.", de: "Ich behalte die Uniform und den Schlüssel. Es ist eine Schuld, und ich werde sie begleichen. Wage nicht, mich zu umarmen." },
                { who: 'player', en: "I am only standing very close.", de: "Ich stehe nur sehr nah." },
                { who: 'companion', en: "...Fine. Very close is allowed. Once.", de: "...Gut. Sehr nah ist erlaubt. Einmal." },
                { who: 'player', en: "We will say his name together, Trix. When we find the place.", de: "Wir sagen seinen Namen zusammen, Trix. Wenn wir den Ort finden." },
            ] },
        },
    },
};
