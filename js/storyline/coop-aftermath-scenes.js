//------------------------------------------------------------------------
//-------------------CO-OP AFTERMATH SCENES--------------------------------
//------------------------------------------------------------------------
// Short scenes that follow each co-op encounter (see dev/docs/STORYLINE.md
// section 4f). After the player and their friend cleared the encounter, a
// "talk" node appears on the map: the two look at the quest item they just
// found and say what it means. Same shape as COMPANION_SCENES (companion-
// scenes.js, which also reads this table), with two differences: `noAffinity`
// (watching earns no affinity, affinity comes only from meetings and clears, so
// every pair stays equal) and `coop` (the encounter that opens it). The friend
// in each script is the friend of that encounter for that hero.
// Lines: { who: 'player' | 'companion' | 'voice', en, de }.

export const COOP_AFTERMATH_SCENES = {
    after_coop_w4: {
        note: 'World 4, after the spiral puzzle. Quest item: Torn Vortex Chart (the vortex is wider than the Guild charts say).',
        coop: 'coop_w4',
        noAffinity: true,
        bg: 'images/backgrounds/Vortex-of-Possibilities-Background.webp',
        stage: 'base',
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/after_coop_w4/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Stox, look! The path unwound itself, and this was lying in the middle.', de: 'Stox, schau! Der Pfad hat sich selbst aufgerollt, und das hier lag in der Mitte.' },
                    { who: 'player', en: 'A Guild chart of the vortex. Torn, then redrawn by a steadier hand than the Guild\'s.', de: 'Eine Gildenkarte des Strudels. Zerrissen und von einer ruhigeren Hand neu gezeichnet als der der Gilde.' },
                    { who: 'companion', en: 'Is it right?', de: 'Stimmt sie?' },
                    { who: 'player', en: 'The rim is drawn forty percent wider than on the official charts. I measured the real rim this morning. This chart is the real one.', de: 'Der Rand ist vierzig Prozent weiter eingezeichnet als auf den offiziellen Karten. Ich habe den echten Rand heute Morgen vermessen. Diese Karte stimmt.' },
                    { who: 'companion', en: 'So the Guild charts are wrong?', de: 'Dann sind die Gildenkarten falsch?' },
                    { who: 'player', en: 'Wrong, or edited. I will keep the chart, and I will keep asking which.', de: 'Falsch oder bearbeitet. Ich behalte die Karte, und ich frage weiter, was von beidem.' },
                ],
            },
            trix: {
                companion: 'stox',
                bg: 'images/story/after_coop_w4/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Trix. That spiral had an exit, and you found it before I finished the calculation.', de: 'Trix. Diese Spirale hatte einen Ausgang, und du hast ihn gefunden, bevor ich die Rechnung fertig hatte.' },
                    { who: 'player', en: 'Obviously. What is that in your hand?', de: 'Offensichtlich. Was hast du da in der Hand?' },
                    { who: 'companion', en: 'A chart of the vortex, torn along an old fold. Its edge is drawn much wider than the Guild\'s.', de: 'Eine Karte des Strudels, an einer alten Falte zerrissen. Ihr Rand ist viel weiter eingezeichnet als bei der Gilde.' },
                    { who: 'player', en: 'Wider. So it is not leaving, it is gathering. I said that on day one.', de: 'Weiter. Also geht er nicht fort, er sammelt sich. Das habe ich am ersten Tag gesagt.' },
                    { who: 'companion', en: 'You said it as a feeling. This is a measurement.', de: 'Du hast es als Gefühl gesagt. Das hier ist eine Messung.' },
                    { who: 'player', en: 'Fine. Keep it. But I want credit for the feeling.', de: 'Gut. Behalte sie. Aber ich will Anerkennung für das Gefühl.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/after_coop_w4/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Forest Girl, you hum while you solve. I nearly lost the thread twice.', de: 'Waldmädchen, du summst beim Lösen. Ich hätte zweimal fast den Faden verloren.' },
                    { who: 'player', en: 'Sorry! But look, the picture left this behind.', de: 'Entschuldigung! Aber schau, das Bild hat das hier zurückgelassen.' },
                    { who: 'companion', en: '...A chart. Torn. Whoever drew this knew the vortex is bigger than they were told.', de: '...Eine Karte. Zerrissen. Wer sie gezeichnet hat, wusste, dass der Strudel größer ist, als man ihm gesagt hatte.' },
                    { who: 'player', en: 'It does not feel angry to me. It feels hungry.', de: 'Für mich fühlt er sich nicht wütend an. Er fühlt sich hungrig an.' },
                    { who: 'companion', en: 'Hungry. Wonderful. Put it in your bag before I think about it too hard.', de: 'Hungrig. Wunderbar. Steck sie in deine Tasche, bevor ich zu genau darüber nachdenke.' },
                    { who: 'player', en: 'We keep it together. It is ours now.', de: 'Wir behalten sie zusammen. Sie gehört jetzt uns.' },
                ],
            },
        },
    },
    after_coop_w6: {
        note: 'World 6, after the fight in the Grove. Quest item: The Grove\'s Eight Notes (a written-down page of the birds\' song). The secret half of Syla\'s story is NOT said aloud.',
        coop: 'coop_w6',
        noAffinity: true,
        bg: 'images/backgrounds/Frequency-Forest-Background.webp',
        stage: 'base',
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/after_coop_w6/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'That was loud for a quiet forest. And look, one of them dropped this as it fell.', de: 'Das war laut für einen stillen Wald. Und schau, eins davon hat das beim Fallen verloren.' },
                    { who: 'player', en: 'A page. Eight notes, written down in order.', de: 'Eine Seite. Acht Töne, der Reihe nach aufgeschrieben.' },
                    { who: 'companion', en: 'Somebody wrote those down a very long time ago. I thought nobody had.', de: 'Jemand hat die vor sehr langer Zeit aufgeschrieben. Ich dachte, das hätte nie jemand getan.' },
                    { who: 'player', en: 'Eight notes, then six seconds of silence, repeated for three centuries. A variance of zero.', de: 'Acht Töne, dann sechs Sekunden Stille, dreihundert Jahre lang wiederholt. Eine Varianz von null.' },
                    { who: 'companion', en: 'You say it like a worry. I say it like a song that is stuck.', de: 'Du sagst es wie eine Sorge. Ich sage es wie ein Lied, das hängen geblieben ist.' },
                    { who: 'player', en: 'A stuck song is a symptom. I will keep the page.', de: 'Ein hängendes Lied ist ein Symptom. Ich behalte die Seite.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/after_coop_w6/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'You hit them so hard the whole Grove shook. I think the trees were impressed.', de: 'Du hast so fest zugeschlagen, dass der ganze Hain gebebt hat. Ich glaube, die Bäume waren beeindruckt.' },
                    { who: 'player', en: 'Naturally. What did that creature drop?', de: 'Natürlich. Was hat das Vieh fallen lassen?' },
                    { who: 'companion', en: 'A page of music. Eight notes, written by hand.', de: 'Eine Seite Musik. Acht Töne, von Hand geschrieben.' },
                    { who: 'player', en: 'Eight notes, same order, same pause, three hundred years. That is not a song, that is a lock.', de: 'Acht Töne, dieselbe Reihenfolge, dieselbe Pause, dreihundert Jahre. Das ist kein Lied, das ist ein Schloss.' },
                    { who: 'companion', en: 'A lock? I always thought it was a lullaby.', de: 'Ein Schloss? Ich habe es immer für ein Wiegenlied gehalten.' },
                    { who: 'player', en: 'It can be both. Keep it close. I want to know what it opens.', de: 'Es kann beides sein. Behalte es nah bei dir. Ich will wissen, was es öffnet.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/after_coop_w6/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Syla. This page was in the nest. The creature had been guarding it.', de: 'Syla. Diese Seite lag im Nest. Das Wesen hat sie bewacht.' },
                    { who: 'player', en: 'Oh! Those are the Grove\'s notes, exactly. All eight.', de: 'Oh! Das sind die Töne des Hains, genau. Alle acht.' },
                    { who: 'companion', en: 'Guarded, written down, and repeated without a single error for three hundred years. I ought to find that unsettling.', de: 'Bewacht, aufgeschrieben und dreihundert Jahre lang ohne einen einzigen Fehler wiederholt. Das sollte ich beunruhigend finden.' },
                    { who: 'player', en: 'I find it lonely. Maybe I am allowed to find it both.', de: 'Ich finde es einsam. Vielleicht darf ich es beides finden.' },
                    { who: 'companion', en: 'Both is allowed. Keep the page. It is yours more than mine.', de: 'Beides ist erlaubt. Behalte die Seite. Sie gehört mehr dir als mir.' },
                    { who: 'player', en: 'Thank you, Stox. I will play it for the Grove one day.', de: 'Danke, Stox. Eines Tages spiele ich sie dem Hain vor.' },
                ],
            },
        },
    },
    after_coop_w8: {
        note: 'World 8, after the lantern puzzle. Quest item: The Last Bearing (the last researcher\'s notebook page; every bearing points to one centre; stamped stop measuring).',
        coop: 'coop_w8',
        noAffinity: true,
        bg: 'images/backgrounds/Hypothesis-Hinterlands-Background.webp',
        stage: 'base',
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/after_coop_w8/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'The lantern held. Fine, that was almost fun. What was sewn into the lining of the tent map?', de: 'Die Laterne hat gehalten. Gut, das war fast lustig. Was war in das Futter der Zeltkarte eingenäht?' },
                    { who: 'player', en: 'A notebook page, folded flat. Every bearing noted, and every bearing points to the same centre.', de: 'Eine Notizbuchseite, flach gefaltet. Jede Peilung ist verzeichnet, und jede zeigt auf dasselbe Zentrum.' },
                    { who: 'companion', en: 'And somebody stamped \'stop measuring\' across it.', de: 'Und jemand hat \'Messung einstellen\' quer darübergestempelt.' },
                    { who: 'player', en: 'The first honest sentence the Guild ever wrote about this. They did not want it measured.', de: 'Der erste ehrliche Satz, den die Gilde je darüber geschrieben hat. Sie wollten es nicht gemessen haben.' },
                    { who: 'companion', en: 'Then we measure. Pack it.', de: 'Dann messen wir. Pack es ein.' },
                    { who: 'player', en: 'Already packed.', de: 'Schon eingepackt.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/after_coop_w8/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'We were just in time! The lantern is still warm. Look, there was a page inside the map.', de: 'Wir waren gerade rechtzeitig! Die Laterne ist noch warm. Schau, in der Karte steckte eine Seite.' },
                    { who: 'player', en: 'The last researcher\'s. Bearings, all converging. They found the centre.', de: 'Die des letzten Forschers. Peilungen, die alle zusammenlaufen. Er hat das Zentrum gefunden.' },
                    { who: 'companion', en: 'And the Guild told them to stop measuring. That is so sad.', de: 'Und die Gilde hat ihm gesagt, er solle aufhören zu messen. Das ist so traurig.' },
                    { who: 'player', en: 'It is infuriating. Stopping someone from counting is the worst crime I know.', de: 'Es ist empörend. Jemanden am Zählen zu hindern ist das schlimmste Verbrechen, das ich kenne.' },
                    { who: 'companion', en: 'Then let us count for them.', de: 'Dann zählen wir für ihn.' },
                    { who: 'player', en: '...Fine. For them. Not for you.', de: '...Gut. Für ihn. Nicht für dich.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/after_coop_w8/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'The page was sewn into the lining. Careful, the ink is fading.', de: 'Die Seite war ins Futter eingenäht. Vorsicht, die Tinte verblasst.' },
                    { who: 'player', en: 'The last bearing... all the arrows point to one place, Stox.', de: 'Die letzte Peilung... alle Pfeile zeigen auf einen Ort, Stox.' },
                    { who: 'companion', en: 'One centre. Reported three times, and the answer was a stamp.', de: 'Ein Zentrum. Dreimal gemeldet, und die Antwort war ein Stempel.' },
                    { who: 'player', en: 'Someone was out here alone, measuring, and nobody listened.', de: 'Jemand war hier draußen allein, hat gemessen, und niemand hat zugehört.' },
                    { who: 'companion', en: 'We are listening now. It is late, but it is not zero.', de: 'Wir hören jetzt zu. Es ist spät, aber es ist nicht null.' },
                    { who: 'player', en: 'I will keep the page dry. I promise.', de: 'Ich halte die Seite trocken. Versprochen.' },
                ],
            },
        },
    },
    after_coop_w9: {
        note: 'World 9, after the Delta boss. Quest item: Survey Stone Rubbing (stamp V. Vors). Trix goes quiet; Stox knows the name from the struck-off register.',
        coop: 'coop_w9',
        noAffinity: true,
        bg: 'images/backgrounds/Data-Delta-Background.webp',
        stage: 'ascended',
        pet: 'browney',
        pairings: {
            stox: {
                companion: 'syla',
                bg: 'images/story/after_coop_w9/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'That whirl was scary. But the stone behind it... Stox, there are letters on it.', de: 'Dieser Wirbel war gruselig. Aber der Stein dahinter... Stox, da sind Buchstaben drauf.' },
                    { who: 'player', en: 'V. Vors. I have seen that name. Struck out of the register in the archive, line by line.', de: 'V. Vors. Ich kenne diesen Namen. Im Archiv aus dem Register gestrichen, Zeile für Zeile.' },
                    { who: 'companion', en: 'Who was V. Vors?', de: 'Wer war V. Vors?' },
                    { who: 'player', en: 'Someone the Guild wanted forgotten. I made a rubbing. A stone remembers what a register is told to forget.', de: 'Jemand, den die Gilde vergessen machen wollte. Ich habe einen Abrieb gemacht. Ein Stein erinnert sich an das, was ein Register vergessen soll.' },
                    { who: 'companion', en: 'Then we keep the rubbing. And the name.', de: 'Dann behalten wir den Abrieb. Und den Namen.' },
                    { who: 'player', en: 'Both.', de: 'Beides.' },
                ],
            },
            trix: {
                companion: 'stox',
                bg: 'images/story/after_coop_w9/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Trix. You have not said a word since the whirl fell.', de: 'Trix. Du hast kein Wort gesagt, seit der Wirbel gefallen ist.' },
                    { who: 'player', en: 'I read the stamp on the survey stone. \'V. Vors\'.', de: 'Ich habe den Stempel auf dem Vermessungsstein gelesen. \'V. Vors\'.' },
                    { who: 'companion', en: 'You know it?', de: 'Du kennst ihn?' },
                    { who: 'player', en: '...Not yet. Give me the rubbing. I want to look at it alone for a while.', de: '...Noch nicht. Gib mir den Abrieb. Ich will ihn eine Weile allein ansehen.' },
                    { who: 'companion', en: 'Take it. But tell me when you know.', de: 'Nimm ihn. Aber sag mir, wenn du es weißt.' },
                    { who: 'player', en: 'When I know, you will be the first. Do not make it a big thing.', de: 'Wenn ich es weiß, bist du der Erste. Mach kein großes Ding daraus.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/after_coop_w9/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Forest Girl, behind the whirl: a survey stone. Someone scratched a name off the front and missed the back.', de: 'Waldmädchen, hinter dem Wirbel: ein Vermessungsstein. Jemand hat vorn einen Namen abgekratzt und die Rückseite vergessen.' },
                    { who: 'player', en: 'V. Vors. It sounds like a person who liked wide skies.', de: 'V. Vors. Das klingt nach jemandem, der weite Himmel mochte.' },
                    { who: 'companion', en: 'You cannot know that.', de: 'Das kannst du nicht wissen.' },
                    { who: 'player', en: 'The stone feels like it. Let us take a rubbing, so the name is not alone.', de: 'Der Stein fühlt sich so an. Lass uns einen Abrieb nehmen, damit der Name nicht allein ist.' },
                    { who: 'companion', en: 'Take it. Take it before I decide to be sad about a stranger.', de: 'Nimm ihn. Nimm ihn, bevor ich beschließe, wegen eines Fremden traurig zu sein.' },
                    { who: 'player', en: 'You are already a little sad. It is okay.', de: 'Du bist schon ein bisschen traurig. Das ist in Ordnung.' },
                ],
            },
        },
    },
    after_coop_w11: {
        note: 'World 11, after the mist puzzle. Quest item: Verun\'s Page (margin note: she used my pages, she smiled). The ghost speaks once more and asks again for his name to be said where they can hear it.',
        coop: 'coop_w11',
        noAffinity: true,
        bg: 'images/backgrounds/Null-Hypothesis-Void.webp',
        stage: 'ascended',
        pet: 'browney',
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/after_coop_w11/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'The mist is thinning. And look, one single sheet pinned in the cloud like washing on a line.', de: 'Der Nebel lichtet sich. Und schau, ein einzelnes Blatt hängt in der Wolke wie Wäsche an der Leine.' },
                    { who: 'player', en: 'A page of handwriting. In the margin: she used my pages, and she smiled when she took them.', de: 'Eine handgeschriebene Seite. Am Rand: Sie hat meine Seiten benutzt, und sie lächelte, als sie sie nahm.' },
                    { who: 'companion', en: 'She. Who is she?', de: 'Sie. Wer ist sie?' },
                    { who: 'player', en: 'I do not know. But the hand matches the stamp on the survey stone.', de: 'Ich weiß es nicht. Aber die Schrift passt zum Stempel auf dem Vermessungsstein.' },
                    { who: 'voice', en: '...Keep it. And say my name, when you find the place where they can hear it.', de: '...Behaltet sie. Und sagt meinen Namen, wenn ihr den Ort findet, an dem sie ihn hören können.' },
                    { who: 'companion', en: 'A ghost with a filing system. I like him already. We keep the page.', de: 'Ein Geist mit Ablagesystem. Ich mag ihn jetzt schon. Wir behalten die Seite.' },
                ],
            },
            trix: {
                companion: 'stox',
                bg: 'images/story/after_coop_w11/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'Trix, the mist unwound, and this stayed behind. A page, in a shaking hand.', de: 'Trix, der Nebel hat sich aufgelöst, und das hier ist geblieben. Eine Seite, in zittriger Schrift.' },
                    { who: 'player', en: '\'She used my pages.\' Who is she?', de: '\'Sie hat meine Seiten benutzt.\' Wer ist sie?' },
                    { who: 'companion', en: 'Unknown. But whoever wrote it was never believed.', de: 'Unbekannt. Aber wer das schrieb, dem hat man nie geglaubt.' },
                    { who: 'player', en: 'I know that feeling. The Observatory taught me what it costs.', de: 'Dieses Gefühl kenne ich. Das Observatorium hat mir beigebracht, was es kostet.' },
                    { who: 'voice', en: '...Keep it. And say my name, when you find the place where they can hear it.', de: '...Behaltet sie. Und sagt meinen Namen, wenn ihr den Ort findet, an dem sie ihn hören können.' },
                    { who: 'player', en: '...All right, ghost. I heard you. Not a word of this to anyone, Stox.', de: '...Na gut, Geist. Ich habe dich gehört. Kein Wort davon zu irgendwem, Stox.' },
                ],
            },
            syla: {
                companion: 'trix',
                bg: 'images/story/after_coop_w11/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'I found your ghost\'s page. Do not cry, it is just paper.', de: 'Ich habe die Seite deines Geistes gefunden. Weine nicht, es ist nur Papier.' },
                    { who: 'player', en: 'I am not crying. I am listening. It is so sad: \'she smiled when she took them\'.', de: 'Ich weine nicht. Ich höre zu. Es ist so traurig: \'sie lächelte, als sie sie nahm\'.' },
                    { who: 'companion', en: 'That is the worst part. The smile.', de: 'Das ist das Schlimmste. Das Lächeln.' },
                    { who: 'voice', en: '...Keep it. And say my name, when you find the place where they can hear it.', de: '...Behaltet sie. Und sagt meinen Namen, wenn ihr den Ort findet, an dem sie ihn hören können.' },
                    { who: 'player', en: 'We will say it, Verun. We promise.', de: 'Wir werden ihn sagen, Verun. Wir versprechen es.' },
                    { who: 'companion', en: 'Do not promise on my behalf. ...But yes. We will.', de: 'Versprich nichts in meinem Namen. ...Aber ja. Das werden wir.' },
                ],
            },
        },
    },
    after_coop_w13: {
        note: 'World 13, after the Warden. Quest item: Proof Stone Shard (the proof stone was defaced recently: someone is still erasing).',
        coop: 'coop_w13',
        noAffinity: true,
        bg: 'images/backgrounds/Expectation-Plateau-Background.webp',
        stage: 'ascended',
        pet: 'browney',
        pairings: {
            stox: {
                companion: 'trix',
                bg: 'images/story/after_coop_w13/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'The Warden is down, and the proof stone is bare. Look at the cuts, they are still sharp.', de: 'Der Wächter ist gefallen, und der Beweisstein liegt frei. Schau dir die Schnitte an, sie sind noch scharf.' },
                    { who: 'player', en: 'Recent. A chisel, perhaps a week old.', de: 'Frisch. Ein Meißel, vielleicht eine Woche alt.' },
                    { who: 'companion', en: 'Someone is still erasing.', de: 'Jemand löscht immer noch.' },
                    { who: 'player', en: 'And someone is still ahead of us. This shard fell when the Warden did. The half-line on it is the one before the cut.', de: 'Und jemand ist uns immer noch voraus. Dieser Splitter fiel, als der Wächter fiel. Die halbe Zeile darauf ist die vor dem Schnitt.' },
                    { who: 'companion', en: 'Keep it. It is the only proof that something stood here.', de: 'Behalte ihn. Er ist der einzige Beweis, dass hier etwas stand.' },
                    { who: 'player', en: 'I always keep the evidence.', de: 'Ich behalte immer die Beweise.' },
                ],
            },
            trix: {
                companion: 'syla',
                bg: 'images/story/after_coop_w13/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'We did it together, twice over! The runes liked us.', de: 'Wir haben es zusammen geschafft, gleich zweimal! Die Runen mochten uns.' },
                    { who: 'player', en: 'Do not get carried away. Look at the proof stone: freshly cut.', de: 'Lass dich nicht mitreißen. Schau dir den Beweisstein an: frisch geschnitten.' },
                    { who: 'companion', en: 'Who would do that to a stone?', de: 'Wer tut einem Stein so etwas an?' },
                    { who: 'player', en: 'Someone afraid of what it says. Take the shard, Forest Girl. It is a piece of what they could not finish erasing.', de: 'Jemand, der Angst hat vor dem, was er sagt. Nimm den Splitter, Waldmädchen. Er ist ein Stück von dem, was sie nicht zu Ende löschen konnten.' },
                    { who: 'companion', en: 'I will carry it as if it were glass.', de: 'Ich trage ihn, als wäre er aus Glas.' },
                    { who: 'player', en: 'It is basically glass.', de: 'Es ist im Grunde Glas.' },
                ],
            },
            syla: {
                companion: 'stox',
                bg: 'images/story/after_coop_w13/aftermath.webp',
                lines: [
                    { who: 'companion', en: 'The shard fell when the Warden did. The edge is fresh: the stone was defaced recently.', de: 'Der Splitter fiel, als der Wächter fiel. Die Kante ist frisch: der Stein wurde erst kürzlich entstellt.' },
                    { who: 'player', en: 'Stox, that means whoever did it is close.', de: 'Stox, das heißt, wer es getan hat, ist in der Nähe.' },
                    { who: 'companion', en: 'Or was, recently. Both are bad.', de: 'Oder war es, vor Kurzem. Beides ist schlecht.' },
                    { who: 'player', en: 'But the letters on the shard still say something.', de: 'Aber die Buchstaben auf dem Splitter sagen immer noch etwas.' },
                    { who: 'companion', en: 'They say enough. We take it, and we are done being polite about the Guild.', de: 'Sie sagen genug. Wir nehmen ihn mit, und wir sind fertig damit, höflich zur Gilde zu sein.' },
                    { who: 'player', en: 'I was never very polite. I was just quiet.', de: 'Ich war nie sehr höflich. Ich war nur leise.' },
                ],
            },
        },
    },
};
