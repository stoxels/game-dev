//------------------------------------------------------------------------
//-------------------CHARACTER BANTER (SPEECH BUBBLE)----------------------
//------------------------------------------------------------------------
// Shows a speech bubble above-right of the player's sprite during puzzle
// levels. Lines are picked per-character (Stox / Trix / Syla) and per
// trigger (mistakes, items, streaks, etc.) to give each character a
// distinct personality:
//   - Stox  : analytical, dry, "math nerd"
//   - Trix  : arrogant, know-it-all, full of herself
//   - Syla  : down-to-earth, childish/naive, sees the good in everything
//
// This file owns:
//   - the line bank (_BANTER_LINES)
//   - the bubble DOM element (create / position / show / hide)
//   - triggerBanter(eventKey, ctx) — the single public entry point
//   - cooldown + chance gating so lines don't spam every tick
//
// All other files just call triggerBanter('some_event') at the moment
// that event happens. See bottom of file for the full list of event keys.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------LINE BANK----------------------------------------------
//------------------------------------------------------------------------
// Keyed by character -> event key -> array of { en, de } lines.
// One is picked at random each time triggerBanter() fires for that event.
//------------------------------------------------------------------------

const _BANTER_LINES = {
    stox: {
        level_start: [
            { en: "Let's see the distribution of this one.", de: "Schauen wir uns die Verteilung an." },
            { en: "Hypothesis: solvable. Let's test it.", de: "Hypothese: lösbar. Testen wir das." },
            { en: "Initial conditions look... manageable.", de: "Die Ausgangsbedingungen sehen... machbar aus." },
            { en: "Every grid is just a system waiting to be solved.", de: "Jedes Raster ist nur ein System, das darauf wartet, gelöst zu werden." },
            { en: "Let's approach this methodically.", de: "Gehen wir das methodisch an." },
            { en: "The pattern is in here somewhere. It always is.", de: "Das Muster steckt irgendwo drin. Das ist immer so." },
            { en: "I've cross-referenced worse than this.", de: "Ich hab Schlimmeres abgeglichen." },
            { en: "Every anomaly leaves a signature. Let's find this one's.", de: "Jede Anomalie hinterlässt eine Signatur. Finden wir diese." },
            { en: "Sample size of one grid. Confidence: high.", de: "Stichprobe von einem Raster. Zuversicht: hoch." },
            { en: "I've mapped this pattern family before. Variants only.", de: "Diese Musterfamilie hab ich schon kartiert. Nur Varianten." },
            { en: "Predicted solution time: irrelevant. Begin.", de: "Prognostizierte Lösungszeit: irrelevant. Anfangen." },
            { en: "Structure first, intuition later. If at all.", de: "Erst die Struktur, dann die Intuition. Wenn überhaupt." },
            { en: "Note to self: previous grids showed an upward difficulty trend.", de: "Notiz an mich selbst: Frühere Raster zeigten einen steigenden Schwierigkeitstrend." },
        ],
        mistake_single: [
            { en: "Hm. Noted. Recalculating.", de: "Hm. Notiert. Neu berechnet." },
            { en: "An outlier. Statistically expected, actually.", de: "Ein Ausreißer. Statistisch eigentlich erwartet." },
            { en: "Data point rejected. Adjusting the model.", de: "Datenpunkt verworfen. Modell wird angepasst." },
            { en: "Error margin updated.", de: "Fehlermarge aktualisiert." },
            { en: "Within acceptable variance. Continuing.", de: "Innerhalb akzeptabler Varianz. Weiter geht's." },
            { en: "Wrong. But informative.", de: "Falsch. Aber aufschlussreich." },
            { en: "That's one path eliminated. Good.", de: "Ein Weg weniger. Gut." },
            { en: "Deviation logged. Cause analysis pending.", de: "Abweichung protokolliert. Ursachenanalyse ausstehend." },
            { en: "A single point doesn't move the mean much.", de: "Ein einzelner Punkt verschiebt den Mittelwert kaum." },
            { en: "Recalibrating. The next inference will be sharper.", de: "Neu kalibriert. Der nächste Schluss wird schärfer." },
            { en: "That was within my uncertainty interval. Barely.", de: "Das lag in meinem Unsicherheitsintervall. Knapp." },
            { en: "Hypothesis discarded. Forming a better one.", de: "Hypothese verworfen. Eine bessere wird gebildet." },
        ],
        mistake_streak: [
            { en: "Three errors in a row isn't randomness anymore, it's a pattern.", de: "Drei Fehler in Folge sind kein Zufall mehr, das ist ein Muster." },
            { en: "Let's slow down and actually read the clues.", de: "Lass uns langsamer machen und die Hinweise wirklich lesen." },
            { en: "I'm seeing a correlation between speed and errors here.", de: "Ich sehe hier eine Korrelation zwischen Tempo und Fehlern." },
            { en: "Maybe we re-verify our assumptions before the next cell.", de: "Vielleicht überprüfen wir unsere Annahmen, bevor wir weitermachen." },
            { en: "This isn't going well. Let's reassess.", de: "Das läuft nicht gut. Lass uns das neu bewerten." },
            { en: "I spent three hundred years of records learning to read patterns. This one is not going to beat me.", de: "Ich hab drei Jahrhunderte Aufzeichnungen studiert. Dieses Muster schlägt mich nicht." },
            { en: "The archive never gave me easy answers either. Adjust and continue.", de: "Das Archiv hat mir auch keine einfachen Antworten gegeben. Anpassen und weitermachen." },
            { en: "Error rate exceeds threshold. Switching to manual verification.", de: "Fehlerrate überschreitet den Schwellenwert. Wechsel zu manueller Überprüfung." },
            { en: "My confidence intervals clearly need wider margins today.", de: "Meine Konfidenzintervalle brauchen heute offenbar breitere Margen." },
            { en: "Correlation identified: haste. Causation confirmed.", de: "Korrelation identifiziert: Eile. Kausalität bestätigt." },
            { en: "Backtracking is not failure. It's optimization.", de: "Zurückverfolgen ist kein Scheitern. Es ist Optimierung." },
            { en: "The archive taught me: when lost, return to first principles.", de: "Das Archiv lehrte mich: Wenn man sich verirrt, kehre zu den Grundprinzipien zurück." },
        ],
        mistake_absorbed: [
            { en: "Mitigated. The model accounted for that.", de: "Abgefedert. Das Modell hat das eingeplant." },
            { en: "Contingency held. As designed.", de: "Der Notfallplan hat funktioniert. Wie geplant." },
            { en: "No cost incurred. Good.", de: "Keine Kosten entstanden. Gut." },
            { en: "Absorbed. The variance shield holds, as calculated.", de: "Abgefangen. Der Varianzschild hält, wie berechnet." },
            { en: "Risk buffer consumed exactly as projected.", de: "Risikopuffer exakt wie prognostiziert verbraucht." },
            { en: "Zero expected loss. The math was on our side.", de: "Null erwarteter Verlust. Die Mathematik war auf unserer Seite." },
            { en: "Anomaly neutralized before it entered the dataset.", de: "Anomalie neutralisiert, bevor sie in den Datensatz kam." },
            { en: "The insurance policy is paying out. Satisfying.", de: "Die Versicherung zahlt aus. Befriedigend." },
        ],
        correct_streak: [
            { en: "Consistent. I like consistent.", de: "Konsistent. Ich mag konsistent." },
            { en: "The error rate is converging nicely.", de: "Die Fehlerrate konvergiert schön." },
            { en: "This is what a stable process looks like.", de: "So sieht ein stabiler Prozess aus." },
            { en: "Precision noted. Keep going.", de: "Präzision notiert. Weiter so." },
            { en: "The data is cooperating. Unusual, but welcome.", de: "Die Daten kooperieren. Ungewöhnlich, aber willkommen." },
            { en: "Cross-referenced and confirmed.", de: "Abgeglichen und bestätigt." },
            { en: "This is what it feels like when the model holds.", de: "So fühlt es sich an, wenn das Modell stimmt." },
            { en: "Zero variance across five trials. Remarkable.", de: "Keine Varianz über fünf Durchgänge. Bemerkenswert." },
            { en: "The model predicts we continue like this. I agree with it.", de: "Das Modell sagt voraus, dass wir so weitermachen. Ich stimme ihm zu." },
            { en: "Each correct fill increases the posterior probability of the next.", de: "Jede richtige Füllung erhöht die a-posteriori-Wahrscheinlichkeit der nächsten." },
            { en: "Efficiency rating climbing. As designed.", de: "Effizienzwert steigt. Wie geplant." },
            { en: "This grid is converging toward order. Slowly but surely.", de: "Dieses Raster konvergiert Richtung Ordnung. Langsam, aber sicher." },
        ],
        item_used_generic: [
            { en: "A calculated use of resources.", de: "Ein kalkulierter Einsatz von Ressourcen." },
            { en: "Efficient. I'd have done the same.", de: "Effizient. Das hätte ich genauso gemacht." },
            { en: "Resource allocation: optimal.", de: "Ressourcenverteilung: optimal." },
            { en: "Deployed at the optimal point in the sequence. Good timing.", de: "Am optimalen Punkt der Sequenz eingesetzt. Gutes Timing." },
            { en: "Consumable resources exist to be consumed. Logically sound.", de: "Verbrauchsressourcen sind zum Verbrauchen da. Logisch schlüssig." },
            { en: "Expected value of that exchange: positive.", de: "Erwartungswert dieses Tauschs: positiv." },
            { en: "Utility gained. Efficiency maintained.", de: "Nutzen gewonnen. Effizienz erhalten." },
            { en: "A reasonable investment. I approve.", de: "Eine vernünftige Investition. Ich genehmige das." },
        ],
        item_used_cursed: [
            { en: "Interesting. High variance, high reward.", de: "Interessant. Hohe Varianz, hohe Belohnung." },
            { en: "Risky. Let's see if the expected value holds up.", de: "Riskant. Mal sehen, ob der Erwartungswert standhält." },
            { en: "High-risk maneuver. Monitoring side effects closely.", de: "Manöver mit hohem Risiko. Beobachte Nebenwirkungen genau." },
            { en: "Cursed items obey rules too. Just less documented ones.", de: "Verfluchte Items folgen auch Regeln. Nur weniger dokumentierten." },
            { en: "Variance spike detected. Acceptable, temporarily.", de: "Varianzspitze erkannt. Akzeptabel, vorübergehend." },
            { en: "If this backfires, remember it was still the rational choice.", de: "Wenn das nach hinten losgeht: Es blieb trotzdem die rationale Wahl." },
            { en: "The Collapse corrupted it. But corruption is just structure we haven't decoded yet.", de: "Der Kollaps hat es korrumpiert. Aber Korruption ist nur Struktur, die wir noch nicht entschlüsselt haben." },
        ],
        lucky_tile: [
            { en: "Luck is just probability you haven't modeled yet.", de: "Glück ist nur Wahrscheinlichkeit, die du noch nicht modelliert hast." },
            { en: "A favorable deviation. I'll take it.", de: "Eine günstige Abweichung. Ich nehm's." },
            { en: "An unexpected variable. Updating the model.", de: "Eine unerwartete Variable. Modell wird aktualisiert." },
            { en: "Coincidence registered. It will not repeat. Probably.", de: "Zufall registriert. Wiederholt sich nicht. Wahrscheinlich." },
            { en: "A positive outlier. Statistically owed to us, actually.", de: "Ein positiver Ausreißer. Steht uns statistisch gesehen eigentlich zu." },
            { en: "Randomness favors us today. Noted with suspicion.", de: "Der Zufall begünstigt uns heute. Mit Misstrauen notiert." },
            { en: "Probability delivered ahead of schedule.", de: "Wahrscheinlichkeit vorzeitig geliefert." },
            { en: "I'll log that as 'beneficial anomaly'.", de: "Ich vermerke das als 'vorteilhafte Anomalie'." },
        ],
        low_time: [
            { en: "Time is a finite resource. Allocate it wisely.", de: "Zeit ist eine endliche Ressource. Setz sie klug ein." },
            { en: "We're entering the critical window.", de: "Wir betreten das kritische Zeitfenster." },
            { en: "I did not leave the archive to fail out here.", de: "Ich hab das Archiv nicht verlassen, um hier zu scheitern." },
            { en: "Remaining time: suboptimal. Focus is now mandatory.", de: "Verbleibende Zeit: suboptimal. Fokus ist jetzt Pflicht." },
            { en: "Under pressure, accuracy matters more than speed. Mostly.", de: "Unter Druck zählt Genauigkeit mehr als Tempo. Meistens." },
            { en: "We have enough time. If we stop spending it on commentary.", de: "Wir haben genug Zeit. Wenn wir aufhören, sie für Kommentare auszugeben." },
            { en: "Deadline approaching. Executing final phase.", de: "Deadline naht. Endphase wird eingeleitet." },
            { en: "Time pressure introduces errors. Therefore: calm, precise moves only.", de: "Zeitdruck erzeugt Fehler. Also: nur ruhige, präzise Züge." },
        ],
        win: [
            { en: "As predicted.", de: "Wie vorhergesagt." },
            { en: "Solved. The data never lies.", de: "Gelöst. Die Daten lügen nie." },
            { en: "Hypothesis confirmed.", de: "Hypothese bestätigt." },
            { en: "A clean result. Satisfying.", de: "Ein sauberes Ergebnis. Befriedigend." },
            { en: "One more piece of the pattern.", de: "Noch ein Stück des Musters." },
            { en: "The Collapse was deliberate. Every solved Stoxel makes that clearer.", de: "Der Kollaps war absichtlich. Jeder gelöste Stoxel macht das deutlicher." },
            { en: "Filed. Moving on.", de: "Notiert. Weiter." },
            { en: "Solution verified. No residual anomalies detected.", de: "Lösung verifiziert. Keine Restanomalien erkannt." },
            { en: "The numbers aligned. They usually do, eventually.", de: "Die Zahlen haben gepasst. Tun sie meistens, irgendwann." },
            { en: "Result archived. Reference stored for future grids.", de: "Ergebnis archiviert. Referenz für künftige Raster gespeichert." },
            { en: "Another hypothesis survived contact with reality.", de: "Noch eine Hypothese hat den Kontakt mit der Realität überlebt." },
            { en: "Deterministic outcome. Exactly how I prefer things.", de: "Deterministisches Ergebnis. Genau wie ich es bevorzuge." },
        ],
    },

    trix: {
        level_start: [
            { en: "Oh please, this one's basically solved already.", de: "Bitte, das hier ist quasi schon gelöst." },
            { en: "Watch and learn.", de: "Schau und lern." },
            { en: "Another puzzle that won't stand a chance against me.", de: "Noch ein Rätsel, das gegen mich keine Chance hat." },
            { en: "Step aside, I've got this.", de: "Geh zur Seite, ich hab das." },
            { en: "This'll be fun. For me, anyway.", de: "Das wird lustig. Für mich zumindest." },
            { en: "I've broken into harder things than this.", de: "Ich hab schon härtere Sachen geknackt als das." },
            { en: "The Warden thought he was clever too. He wasn't.", de: "Der Warden dachte auch, er wäre clever. War er nicht." },
            { en: "Another lock. Another key I'll find.", de: "Noch ein Schloss. Noch ein Schlüssel, den ich finden werde." },
            { en: "Try to keep up. Actually — don't bother, I'm fast.", de: "Versuch mitzuhalten. Ach eigentlich — lass es, ich bin schnell." },
            { en: "I could solve this blindfolded. But where's the show in that?", de: "Könnte das blind lösen. Aber wo bleibt da die Show?" },
            { en: "One look and I already know how this ends. Spoiler: I win.", de: "Ein Blick und ich weiß schon, wie's ausgeht. Spoiler: Ich gewinne." },
            { en: "The Guild's best trainees studied under me. True story.", de: "Die besten Azubis der Gilde haben bei mir gelernt. Wahre Geschichte." },
            { en: "Grids fear me. This one's already sweating.", de: "Raster haben Angst vor mir. Dieses schwitzt schon." },
        ],
        mistake_single: [
            { en: "Oops. Lucky I'm carrying us.", de: "Oops. Gut, dass ich uns trage." },
            { en: "Pfft, that one didn't count.", de: "Pff, der zählt nicht." },
            { en: "Even I have an off-second sometimes.", de: "Sogar ich hab mal eine schlechte Sekunde." },
            { en: "Barely a scratch on my record.", de: "Kaum ein Kratzer in meiner Bilanz." },
            { en: "I meant to do that. Scouting.", de: "Das war Absicht. Aufklärung." },
            { en: "The Rift taught me worse. I'm fine.", de: "Der Rift hat mich Schlimmeres gelehrt. Mir geht's gut." },
            { en: "That was a trap cell. Obviously I test those first.", de: "Das war eine Fallen-Zelle. Natürlich teste ich die zuerst." },
            { en: "I let you two feel useful sometimes. You're welcome.", de: "Ich lass euch zwei manchmal nützlich fühlen. Bitte schön." },
            { en: "Flawless records are boring anyway.", de: "Makellose Bilanzen sind sowieso langweilig." },
            { en: "Nobody saw that. Right?", de: "Das hat keiner gesehen. Oder?" },
            { en: "One mistake. Still more talent than most people have in total.", de: "Ein Fehler. Immer noch mehr Talent als die meisten Leute insgesamt haben." },
        ],
        mistake_streak: [
            { en: "Okay, dummy... maybe just let me handle this.", de: "Okay, Dummerchen... lass mich das vielleicht einfach machen." },
            { en: "Wow. Just— wow. Move over.", de: "Wow. Einfach... wow. Mach Platz." },
            { en: "Are you doing this on purpose?", de: "Machst du das mit Absicht?" },
            { en: "Okay, I'm taking over now.", de: "Okay, ich übernehme jetzt." },
            { en: "This is painful to watch.", de: "Das ist schmerzhaft anzusehen." },
            { en: "Fine! Fine. I'm recalibrating my genius. Give me a second.", de: "Also gut! Gut. Ich kalibriere mein Genie neu. Gib mir 'ne Sekunde." },
            { en: "This grid is clearly defective. Nothing wrong with my technique.", de: "Dieses Raster ist eindeutig defekt. Mit meiner Technik stimmt alles." },
            { en: "I'm used to working alone. Clearly for good reason.", de: "Ich bin's gewohnt, allein zu arbeiten. Aus offensichtlich gutem Grund." },
            { en: "If anyone asks, this part never happened.", de: "Falls jemand fragt: Dieser Teil hat nie stattgefunden." },
            { en: "Even legends have warm-up rounds. This was ours.", de: "Selbst Legenden haben Aufwärmrunden. Das war unsere." },
        ],
        mistake_absorbed: [
            { en: "You're welcome.", de: "Bitte schön." },
            { en: "Saved your skin again.", de: "Hab dich mal wieder gerettet." },
            { en: "That's what I'm here for.", de: "Dafür bin ich ja da." },
            { en: "Good thing my safety net is as brilliant as I am.", de: "Gut, dass mein Sicherheitsnetz genauso genial ist wie ich." },
            { en: "See? Even my mistakes come with insurance.", de: "Siehst du? Selbst meine Fehler haben eine Versicherung." },
            { en: "Contingency number three. I planned three contingencies.", de: "Notfallplan Nummer drei. Ich hatte drei Notfallpläne." },
            { en: "Nothing gets past Trix. Official policy.", de: "Nichts kommt an Trix vorbei. Offizielle Richtlinie." },
            { en: "You almost embarrassed us there. Almost.", de: "Da hättest uns fast in Verlegenheit gebracht. Fast." },
        ],
        correct_streak: [
            { en: "See, this is what I'm talking about. Flawless.", de: "Siehst du, genau davon rede ich. Makellos." },
            { en: "Obviously. I make it look easy.", de: "Logisch. Ich mach's einfach aussehen." },
            { en: "We're unstoppable. Well, I am.", de: "Wir sind unaufhaltsam. Also, ich bin's." },
            { en: "Take notes, this is how it's done.", de: "Mach dir Notizen, so macht man das." },
            { en: "My family survived the Regression Rift. I can survive a bad streak.", de: "Meine Familie hat den Regression-Rift überlebt. Ich überlebe auch eine Pechsträhne." },
            { en: "The Guild thinks I'm loyal. The puzzle should be at least as easy to fool.", de: "Die Gilde denkt, ich bin loyal. Das Rätsel sollte genauso leicht zu täuschen sein." },
            { en: "See, when I actually try, it's not even close.", de: "Siehst du, wenn ich mich wirklich anstrenge, ist es nicht mal knapp." },
            { en: "My name was in the archive. Turns out that counts for something.", de: "Mein Name stand im Archiv. Stellt sich raus, das zählt für was." },
            { en: "This streak is going in my memoirs.", de: "Diese Serie kommt in meine Memoiren." },
            { en: "They should study this in the Guild. Chapter one: Trix.", de: "Das sollte man in der Gilde studieren. Kapitel eins: Trix." },
            { en: "Perfection isn't a goal for me. It's a baseline.", de: "Perfektion ist für mich kein Ziel. Sie ist die Basislinie." },
            { en: "Keep up! This pace is entirely my fault.", de: "Halte durch! Dieses Tempo ist komplett meine Schuld." },
            { en: "I'd applaud, but my hands are busy being excellent.", de: "Ich würde klatschen, aber meine Hände sind damit beschäftigt, großartig zu sein." },
        ],
        item_used_generic: [
            { en: "Cheating? No. Optimal play. There's a difference.", de: "Schummeln? Nein. Optimales Spiel. Da ist ein Unterschied." },
            { en: "I deserve this item, honestly.", de: "Ich verdien dieses Item, ehrlich gesagt." },
            { en: "Of course I'd use it perfectly.", de: "Klar nutz ich's perfekt." },
            { en: "Only the best items for the best thief. That's me.", de: "Nur die besten Items für die beste Diebin. Das bin ich." },
            { en: "Strategic brilliance, item edition.", de: "Strategische Glanzleistung, Item-Edition." },
            { en: "In my hands, everything becomes legendary.", de: "In meinen Händen wird alles legendär." },
            { en: "Item deployed flawlessly. Like everything I touch.", de: "Item makellos eingesetzt. Wie alles, was ich berühre." },
            { en: "I could've done without it. But why make it hard?", de: "Ich hätte's auch ohne geschafft. Aber warum kompliziert?" },
        ],
        item_used_cursed: [
            { en: "Ooh, risky. I love it.", de: "Ooh, riskant. Ich liebe es." },
            { en: "Danger just makes it more fun.", de: "Gefahr macht's nur lustiger." },
            { en: "Risk is just probability you're not afraid of.", de: "Risiko ist nur Wahrscheinlichkeit, vor der man keine Angst hat." },
            { en: "Cursed? Please. Nothing out-curses me.", de: "Verflucht? Bitte. Niemand ist verfluchter als ich." },
            { en: "The Rift cursed worse things than this, and look at me.", de: "Der Rift hat Schlimmeres verflucht als das, und sieh mich an." },
            { en: "Dangerous items work better for dangerous people.", de: "Gefährliche Items funktionieren besser bei gefährlichen Leuten." },
            { en: "If it explodes, I dodged it before it even sparked.", de: "Wenn's explodiert, bin ich ausgewichen, bevor es gezündet hat." },
            { en: "Bold move? I don't do any other kind.", de: "Mutiger Zug? Andere mache ich gar nicht." },
        ],
        lucky_tile: [
            { en: "Of course I found that. I find everything.", de: "Klar hab ich das gefunden. Ich finde alles." },
            { en: "Lucky? Please, that was skill.", de: "Glück? Bitte, das war Können." },
            { en: "The archive had my name. Of course the grid does too.", de: "Das Archiv hatte meinen Namen. Natürlich hat ihn das Raster auch." },
            { en: "'Lucky'. The grid finally admitted what everyone knows.", de: "'Glück'. Das Raster hat endlich zugegeben, was alle wissen." },
            { en: "Skill looks like luck to people who don't have either.", de: "Können sieht aus wie Glück für Leute, die beides nicht haben." },
            { en: "Treasure is simply attracted to me.", de: "Schätze werden einfach von mir angezogen." },
            { en: "Of course the bonus was where I looked first. I looked everywhere first.", de: "Natürlich war der Bonus dort, wo ich zuerst gesucht hab. Ich hab überall zuerst gesucht." },
            { en: "Add it to my ever-growing list of victories.", de: "Auf meine immer länger werdende Siegesliste damit." },
        ],
        low_time: [
            { en: "Relax, I've got this under control. Probably.", de: "Entspann dich, ich hab das im Griff. Wahrscheinlich." },
            { en: "Pressure makes me better, actually.", de: "Druck macht mich eigentlich nur besser." },
            { en: "I've had tighter escapes. This is nothing.", de: "Ich hab engere Entkommen erlebt. Das ist nichts." },
            { en: "Tick tock all you want. I finish early on principle.", de: "Tick tack, so viel du willst. Ich werde grundsätzlich früher fertig." },
            { en: "Great, time pressure. My favorite audience.", de: "Schön, Zeitdruck. Mein Lieblingspublikum." },
            { en: "Watch closely. This is how professionals close a level.", de: "Schau genau hin. So schließen Profis ein Level ab." },
            { en: "Panicking wastes seconds. Complimenting me wastes none. Choose wisely.", de: "Panik kostet Sekunden. Mir Komplimente machen kostet keine. Wähl weise." },
            { en: "I've escaped vaults with less time. This is practically a vacation.", de: "Ich bin aus Tresoren mit weniger Zeit entkommen. Das ist praktisch Urlaub." },
        ],
        win: [
            { en: "Called it. I'm always right.", de: "Hab ich's doch gesagt. Ich hab immer recht." },
            { en: "Another flawless victory for me.", de: "Noch ein makelloser Sieg für mich." },
            { en: "Easy. Next.", de: "Easy. Nächstes." },
            { en: "Was there ever any doubt?", de: "Gab's da je einen Zweifel?" },
            { en: "Knew exactly which door to pick. Same as always.", de: "Wusste genau, welche Tür ich nehmen soll. Wie immer." },
            { en: "The key always turns for me. It's practically tradition.", de: "Der Schlüssel dreht sich immer für mich. Es ist schon fast Tradition." },
            { en: "And the crowd goes wild. In spirit.", de: "Und die Menge tobt. Im Geiste." },
            { en: "Solved, styled, superior. Standard procedure.", de: "Gelöst, gestylt, überlegen. Standardprozedur." },
            { en: "Someone should carve my name into this grid.", de: "Jemand sollte meinen Namen in dieses Raster ritzen." },
            { en: "I make winning look effortless because it is. For me.", de: "Ich lasse Siegen mühelos aussehen, weil es so ist. Für mich." },
            { en: "Another victory. At this rate I'll need a bigger trophy shelf.", de: "Noch ein Sieg. Bei dem Tempo brauch ich ein größeres Trophäenregal." },
        ],
    },

    syla: {
        level_start: [
            { en: "Ooh, this grid looks like a little garden plot!", de: "Ooh, dieses Raster sieht aus wie ein kleines Gartenbeet!" },
            { en: "Every puzzle's got something nice hiding in it.", de: "In jedem Rätsel steckt was Schönes." },
            { en: "Hi grid! Let's be friends.", de: "Hallo Raster! Lass uns Freunde sein." },
            { en: "I wonder what little picture is hiding in here.", de: "Ich frag mich, welches kleine Bild sich hier versteckt." },
            { en: "New puzzle, new adventure!", de: "Neues Rätsel, neues Abenteuer!" },
            { en: "The fox is waiting. Let's do this quickly.", de: "Der Fuchs wartet. Lass uns das schnell machen." },
            { en: "The Grove taught me to read patterns. This is just a different kind.", de: "Der Hain hat mich gelehrt, Muster zu lesen. Das hier ist nur eine andere Art." },
            { en: "Every Stoxel is something that needs healing. Let's help it.", de: "Jeder Stoxel ist etwas, das Heilung braucht. Lass uns helfen." },
            { en: "It's like a little dot garden waiting to bloom!", de: "Wie ein kleiner Punkte-Garten, der darauf wartet zu blühen!" },
            { en: "Hello little cells! We're going to figure you out, nicely!", de: "Hallo kleine Zellen! Wir bringen euch hinter's Licht, aber nett!" },
            { en: "Puzzle day is my favorite kind of day!", de: "Rätseltag ist meine Lieblingsart von Tag!" },
            { en: "Maybe the fox left paw prints somewhere in here!", de: "Vielleicht hat der Fuchs hier irgendwo Pfotenabdrücke hinterlassen!" },
            { en: "Deep breath... okay! Adventure mode: on!", de: "Tief durchatmen... okay! Abenteuermodus: an!" },
        ],
        mistake_single: [
            { en: "That's okay! Mistakes are just how you learn.", de: "Ist schon okay! Fehler sind einfach Lernen." },
            { en: "Oopsie. No big deal.", de: "Hoppla. Halb so schlimm." },
            { en: "The grid forgives, I'm sure.", de: "Das Raster verzeiht bestimmt." },
            { en: "Aw, close though!", de: "Ach, war aber knapp!" },
            { en: "Even the fox takes the wrong path sometimes!", de: "Auch der Fuchs nimmt manchmal den falschen Weg!" },
            { en: "Papa made mistakes in his logs too. He always found the right answer eventually.", de: "Papa hat auch Fehler in seinen Aufzeichnungen gemacht. Er hat immer irgendwann die richtige Antwort gefunden." },
            { en: "Oopsie daisy! The flowers say that all the time when they fall over.", de: "Hoppla! Die Blumen sagen das ständig, wenn sie umkippen." },
            { en: "It's fine! Even baby birds fall out of the nest a little!", de: "Alles gut! Auch Babyvögel fallen mal ein bisschen aus dem Nest!" },
            { en: "That cell just wanted attention, I think.", de: "Diese Zelle wollte glaube ich einfach Aufmerksamkeit." },
            { en: "Wrong turns make the best stories later!", de: "Falsche Abbiegungen ergeben später die besten Geschichten!" },
            { en: "I forgive you, puzzle! You'll forgive me too, right?", de: "Ich vergeb dir, Rätsel! Du mir bestimmt auch, oder?" },
        ],
        mistake_streak: [
            { en: "No worries, no worries — we'll figure it out together!", de: "Kein Stress, kein Stress — wir kriegen das schon zusammen hin!" },
            { en: "Even the grid doesn't mean to be tricky, I think.", de: "Ich glaub, nicht mal das Raster will uns ärgern." },
            { en: "Let's just take a little breath and try again.", de: "Lass uns kurz durchatmen und's nochmal versuchen." },
            { en: "It's okay! Every flower needs a little rain too.", de: "Ist schon okay! Auch jede Blume braucht mal ein bisschen Regen." },
            { en: "The animals in the Grove were stuck in a loop too. Being patient was how we helped them.", de: "Die Tiere im Hain steckten auch in einer Schleife. Geduld war der Weg, ihnen zu helfen." },
            { en: "Mama always said: when the data doesn't fit, check what you're measuring.", de: "Mama hat immer gesagt: Wenn die Daten nicht stimmen, prüf, was du misst." },
            { en: "Okay okay okay! Deep breaths! Like calming the spooked deer!", de: "Okay okay okay! Tief durchatmen! Wie beim beruhigen vom verschreckten Reh!" },
            { en: "Maybe the grid is having a grumpy day. We all do!", de: "Vielleicht hat das Raster einen Muffel-Tag. Den haben wir alle mal!" },
            { en: "When the vines tangle, you don't pull harder. You go slower!", de: "Wenn sich Ranken verknoten, zieht man nicht stärker. Man macht's langsamer!" },
            { en: "It's like the Grove taught me: every knot has a patient way out.", de: "Wie der Hain mich gelehrt hat: Jeder Knoten hat einen geduldigen Ausweg." },
            { en: "We're not failing! We're just taking the scenic route!", de: "Wir scheitern nicht! Wir nehmen nur die Landschaftsroute!" },
        ],
        mistake_absorbed: [
            { en: "Phew, that was close! Lucky us.", de: "Puh, das war knapp! Glück gehabt." },
            { en: "Something looked out for us there!", de: "Da hat irgendwas auf uns aufgepasst!" },
            { en: "The shield hugged our mistake away! Thank you, shield!", de: "Der Schild hat unseren Fehler weggekuschelt! Danke, Schild!" },
            { en: "Wow! It's like a big leaf catching the rain for us!", de: "Wow! Wie ein großes Blatt, das den Regen für uns auffängt!" },
            { en: "Protected! Like a little bug under a mushroom!", de: "Beschützt! Wie ein kleines Käferchen unter einem Pilz!" },
            { en: "Phew! The grid winked at us, I'm sure of it!", de: "Puh! Das Raster hat uns zugewunken, da bin ich sicher!" },
            { en: "Saved! Somebody up in the branches likes us today!", de: "Gerettet! Da oben in den Zweigen mag uns heute jemand!" },
        ],
        correct_streak: [
            { en: "We're on a little roll! Yay!", de: "Wir sind richtig im Flow! Juhu!" },
            { en: "Look at us go!", de: "Schau uns an, wie wir das hinkriegen!" },
            { en: "This feels really nice, doesn't it?", de: "Das fühlt sich richtig schön an, oder?" },
            { en: "The pattern is starting to sing! Like the birds did before everything went quiet.", de: "Das Muster fängt an zu singen! Wie die Vögel, bevor alles still wurde." },
            { en: "One step closer to bringing them home.", de: "Einen Schritt näher daran, sie nach Hause zu bringen." },
            { en: "Click click click! It's like fireflies lighting up one by one!", de: "Klick klick klick! Wie Glühwürmchen, die einzeln aufleuchten!" },
            { en: "Are we magic? I think we might be a little magic!", de: "Sind wir magisch? Ich glaub, wir sind vielleicht ein bisschen magisch!" },
            { en: "The grid is smiling! I can tell!", de: "Das Raster lächelt! Ich seh das!" },
            { en: "Go go go! But also gently gently!", de: "Los los los! Aber auch behutsam behutsam!" },
            { en: "Mama would say we're measuring twice AND cutting once!", de: "Mama würde sagen: Wir messen zweimal UND schneiden einmal!" },

        ],
        item_used_generic: [
            { en: "Ooh, a little helper! Thank you, helper.", de: "Ooh, ein kleiner Helfer! Danke, Helferlein." },
            { en: "Yay, teamwork!", de: "Juhu, Teamarbeit!" },
            { en: "Little item, big job! Do your best!", de: "Kleines Item, großer Job! Gib dein Bestes!" },
            { en: "It tickles when the items help! I love it!", de: "Es kitzelt, wenn die Items helfen! Das liebe ich!" },
            { en: "Bye-bye, item! You were very brave!", de: "Tschüss, Item! Du warst sehr mutig!" },
            { en: "Sharing is caring, even with puzzles!", de: "Teilen ist Liebhaben, sogar mit Rätseln!" },
            { en: "Ooh, sparkly help! Thank you thank you!", de: "Ooh, funkelnde Hilfe! Danke danke!" },
        ],
        item_used_cursed: [
            { en: "It looks spooky but I'm sure it means well.", de: "Sieht gruselig aus, aber meint's bestimmt gut." },
            { en: "Ooh, a little scary! But exciting too!", de: "Ooh, ein bisschen gruselig! Aber auch aufregend!" },
            { en: "It's hissing at me... but in a friendly way? Maybe?", de: "Es zischt mich an... aber auf freundliche Art? Vielleicht?" },
            { en: "Spooky helper, brave us! Together we're fine!", de: "Gruseliger Helfer, mutiges uns! Zusammen schaffen wir das!" },
            { en: "Even grumpy old items just need a friend. Watch!", de: "Auch mürrische alte Items brauchen nur 'nen Freund. Schau!" },
            { en: "If it goes 'boo', we say 'boo' right back! Politely!", de: "Wenn es 'Buh' sagt, sagen wir 'Buh' zurück! Aber höflich!" },
            { en: "It smells like thunderstorms and old leaves. Exciting!", de: "Es riecht nach Gewitter und alten Blättern. Aufregend!" },
        ],
        lucky_tile: [
            { en: "A little present from the grid!", de: "Ein kleines Geschenk vom Raster!" },
            { en: "Aw, it's like the puzzle likes us.", de: "Aw, es ist, als würde das Rätsel uns mögen." },
            { en: "Just like the Grove used to give little gifts. I've missed that.", de: "Genau wie der Hain früher kleine Geschenke gemacht hat. Das hab ich vermisst." },
            { en: "The grid gave us a present! Best puzzle ever!", de: "Das Raster hat uns ein Geschenk gemacht! Bestes Rätsel überhaupt!" },
            { en: "It's like finding a berry you didn't plant!", de: "Wie eine Beere finden, die man selbst nicht gepflanzt hat!" },
            { en: "Yay! A surprise! I love surprises that aren't scary!", de: "Juhu! Eine Überraschung! Ich liebe Überraschungen, die nicht gruselig sind!" },
            { en: "Thank you, hidden helper! Whoever you are!", de: "Danke, versteckter Helfer! Wer auch immer du bist!" },
            { en: "The Grove used to hide treats like this too. It remembers how!", de: "Der Hain hat auch solche Leckerlis versteckt. Er weiß noch, wie!" },
        ],
        low_time: [
            { en: "Time's getting short, but we're doing great!", de: "Die Zeit wird knapp, aber wir machen das super!" },
            { en: "Quick quick, but no need to panic!", de: "Schnell schnell, aber keine Panik!" },
            { en: "My parents are still out there in that loop. I can't afford to fail.", de: "Meine Eltern stecken noch in dieser Schleife. Ich kann es mir nicht leisten zu scheitern." },
            { en: "Quick quick! Like bunnies! But friendly bunnies!", de: "Schnell schnell! Wie Hasen! Aber freundliche Hasen!" },
            { en: "Almost there! The grid is rooting for us, I can feel it!", de: "Fast geschafft! Das Raster drückt uns die Däumchen, ich spür es!" },
            { en: "No no no panicking! Panic makes everything wobbly!", de: "Nein nein nein, keine Panik! Panik macht alles wackelig!" },
            { en: "Faster feet, steadier heart. Papa taught me that!", de: "Schnellere Füße, ruhigeres Herz. Das hat Papa mir beigebracht!" },
            { en: "We can do this! The fox believes in us and so do I!", de: "Wir schaffen das! Der Fuchs glaubt an uns, und ich auch!" },
        ],
        win: [
            { en: "We did it! I knew the grid believed in us.", de: "Wir haben's geschafft! Ich wusste, das Raster glaubt an uns." },
            { en: "Yay! Another happy ending.", de: "Juhu! Wieder ein Happy End." },
            { en: "See, everything works out!", de: "Siehst du, alles wird gut!" },
            { en: "One more wound closed. The Grove will feel that, I think.", de: "Noch eine Wunde geschlossen. Der Hain wird das spüren, glaube ich." },
            { en: "That's how you heal something. Carefully, piece by piece.", de: "So heilt man etwas. Behutsam, Stück für Stück." },
            { en: "I'm coming, little fox. Just a few more of these.", de: "Ich komme, kleiner Fuchs. Nur noch ein paar davon." },
            { en: "All done! Every little cell found its home!", de: "Geschafft! Jedes kleine Zellchen hat sein Zuhause gefunden!" },
            { en: "We did it together! Grid, you were wonderful!", de: "Wir haben's zusammen geschafft! Raster, du warst wunderbar!" },
            { en: "One more healed! The forest is counting them, I bet!", de: "Eins mehr geheilt! Der Wald zählt bestimmt mit!" },
            { en: "Victory dance! Fox, save me one for when you're free!", de: "Siegestanz! Fuchs, hebe mir einen auf, wenn du frei bist!" },
            { en: "See? Nice works. Being nice always works!", de: "Siehst du? Nett sein funktioniert. Nett sein funktioniert immer!" },
        ],
    },
};

//------------------------------------------------------------------------
//-------------------ITEM-SPECIFIC LINE BANK-------------------------------
//------------------------------------------------------------------------
// Keyed by character -> ITEM_DEFS id -> array of { en, de } lines.
// Fired via triggerItemBanter(itemId) when that exact item is used.
// At least two unique lines exist per character per item.
//------------------------------------------------------------------------

const _BANTER_ITEM_LINES = {
    stox: {
        reveal1: [
            { en: "A candle. Illumination radius: exactly one cell.", de: "Eine Kerze. Beleuchtungsradius: exakt eine Zelle." },
            { en: "One data point gained. Incremental progress.", de: "Ein Datenpunkt gewonnen. Inkrementeller Fortschritt." },
        ],
        reveal2: [
            { en: "Magnification engaged. Sample expanded by two.", de: "Vergrößerung aktiv. Stichprobe um zwei erweitert." },
            { en: "Two cells resolved. The lens performs.", de: "Zwei Zellen aufgelöst. Die Linse leistet was." },
        ],
        reveal3: [
            { en: "Long-range observation: three cells acquired.", de: "Fernbeobachtung: drei Zellen erfasst." },
            { en: "Three data points. The uncertainty shrinks.", de: "Drei Datenpunkte. Die Unsicherheit schrumpft." },
        ],
        reveal4: [
            { en: "Quad-scan complete. Four certainties logged.", de: "Vierfach-Scan abgeschlossen. Vier Gewissheiten protokolliert." },
            { en: "High-yield instrument. Efficiency rating: excellent.", de: "Hochertragsinstrument. Effizienzwert: ausgezeichnet." },
        ],
        rowSolve: [
            { en: "An entire row solved. Geometrically satisfying.", de: "Eine ganze Zeile gelöst. Geometrisch befriedigend." },
            { en: "Full-row dataset acquired. A rare luxury.", de: "Kompletter Zeilen-Datensatz erhalten. Ein seltener Luxus." },
        ],
        colSolve: [
            { en: "Column solved. Straight-line thinking pays off.", de: "Spalte gelöst. Geradliniges Denken zahlt sich aus." },
            { en: "One column fully measured. Precisely.", de: "Eine Spalte komplett vermessen. Präzise." },
        ],
        scoutPrimer: [
            { en: "A questionnaire disguised as an artifact. Intriguing.", de: "Ein Fragebogen als Artefakt getarnt. Faszinierend." },
            { en: "Pre-solving via quiz. Unconventional methodology.", de: "Vorgelöst per Quiz. Unkonventionelle Methodik." },
        ],
        artifactComplete: [
            { en: "Total solution. Every variable resolved at once.", de: "Totallösung. Jede Variable auf einmal aufgelöst." },
            { en: "The entire grid, solved instantly. Statistically improbable. Welcome anyway.", de: "Das ganze Raster, sofort gelöst. Statistisch unwahrscheinlich. Trotzdem willkommen." },
        ],
        markWrong2: [
            { en: "Two impossibilities eliminated. The model tightens.", de: "Zwei Unmöglichkeiten eliminiert. Das Modell wird enger." },
            { en: "Negative knowledge counts too. Two points of it.", de: "Negatives Wissen zählt auch. Zwei Punkte davon." },
        ],
        markWrong4: [
            { en: "Four cells swept clear of possibility.", de: "Vier Zellen von Möglichkeit befreit." },
            { en: "Systematic elimination. My preferred method.", de: "Systematische Eliminierung. Meine bevorzugte Methode." },
        ],
        markWrong6: [
            { en: "Six errors attracted and pinned down. Useful physics.", de: "Sechs Fehler angezogen und festgehalten. Nützliche Physik." },
            { en: "Magnetic field strength: sufficient. Six marks confirmed.", de: "Magnetfeldstärke: ausreichend. Sechs Markierungen bestätigt." },
        ],
        markWrong8: [
            { en: "Eight eliminations in a single deployment. Optimal.", de: "Acht Eliminierungen in einem einzigen Einsatz. Optimal." },
            { en: "Crystallized certainty. Eight wrongs identified.", de: "Kristallisierte Gewissheit. Acht Fehler identifiziert." },
        ],
        addTime60: [
            { en: "Sixty seconds added. The sand obeys.", de: "Sechzig Sekunden hinzugefügt. Der Sand gehorcht." },
            { en: "+60 seconds. Time budget extended.", de: "+60 Sekunden. Zeitbudget verlängert." },
        ],
        addTime300: [
            { en: "Five minutes gained. Adequate runway.", de: "Fünf Minuten gewonnen. Ausreichend Spielraum." },
            { en: "+300 seconds. Recalculating the schedule.", de: "+300 Sekunden. Zeitplan wird neu berechnet." },
        ],
        addTime600: [
            { en: "Ten minutes. Now the sample has room to breathe.", de: "Zehn Minuten. Jetzt hat die Stichprobe Raum zum Atmen." },
            { en: "+10 minutes. Comfortable margin restored.", de: "+10 Minuten. Komfortable Marge wiederhergestellt." },
        ],
        addTime900: [
            { en: "Fifteen minutes. A significant temporal injection.", de: "Fünfzehn Minuten. Eine signifikante Zeit-Injektion." },
            { en: "+15 minutes. The deadline recedes. Excellent.", de: "+15 Minuten. Die Deadline rückt weiter. Hervorragend." },
        ],
        shield: [
            { en: "Defensive buffer armed. One mistake pre-forgiven.", de: "Defensivpuffer aktiviert. Ein Fehler im Voraus verziehen." },
            { en: "Insurance against exactly one anomaly. A rational purchase.", de: "Versicherung gegen genau eine Anomalie. Ein vernünftiger Kauf." },
        ],
        mistakeEraser: [
            { en: "Two errors expunged from the record.", de: "Zwei Fehler aus der Akte getilgt." },
            { en: "Error count reduced. The dataset smooths out.", de: "Fehleranzahl reduziert. Der Datensatz glättet sich." },
        ],
        mistakeEraser4: [
            { en: "Four mistakes struck from the log. Academic rigor applied.", de: "Vier Fehler aus dem Protokoll gestrichen. Akademische Sorgfalt angewandt." },
            { en: "Correcting the record. Four revisions accepted.", de: "Die Akte korrigiert. Vier Revisionen akzeptiert." },
        ],
        mistakeEraser6: [
            { en: "Six errors erased. That is deep scholarship at work.", de: "Sechs Fehler ausgelöscht. Das ist tiefgründige Gelehrsamkeit." },
            { en: "Six failed hypotheses quietly retired.", de: "Sechs gescheiterte Hypothesen still zur Rente geschickt." },
        ],
        mistakeEraserAll: [
            { en: "Complete error reset. As if they never occurred.", de: "Kompletter Fehler-Reset. Als wären sie nie passiert." },
            { en: "The record is wiped clean. Statistically reborn.", de: "Das Protokoll ist komplett gewischt. Statistisch wiedergeboren." },
        ],
        freeze: [
            { en: "Timer suspended. A useful violation of continuity.", de: "Timer angehalten. Eine nützliche Verletzung der Kontinuität." },
            { en: "Stasis achieved. Time is negotiable here. Noted.", de: "Stase erreicht. Zeit ist hier verhandelbar. Notiert." },
        ],
        cursedReveal: [
            { en: "Six reveals for scrambled marks. Net gain: uncertain.", de: "Sechs Enthüllungen für durcheinandergebrachte Markierungen. Netto-Gewinn: unklar." },
            { en: "The lens gives and takes. Classic cursed economics.", de: "Die Linse gibt und nimmt. Klassische verfluchte Ökonomie." },
        ],
        cursedTime: [
            { en: "Twenty minutes gained; clues darkened for thirty seconds. Trade-off: acceptable.", de: "Zwanzig Minuten gewonnen; Hinweise für dreißig Sekunden ausgeblendet. Trade-off: akzeptabel." },
            { en: "A temporal loan with interest. The archive warned me about these.", de: "Ein zeitlicher Kredit mit Zinsen. Das Archiv hat mich vor diesen gewarnt." },
        ],
        cursedShield: [
            { en: "Protection plus revelation plus blindness. Three variables, one artifact.", de: "Schutz plus Enthüllung plus Blindheit. Drei Variablen, ein Artefakt." },
            { en: "It watches. Unsettling, but the expected value works out.", de: "Es beobachtet. Verstörend, aber der Erwartungswert stimmt." },
        ],
        cursedRowSolve: [
            { en: "Three rows gained, one erased. The entropy tax is collected.", de: "Drei Zeilen gewonnen, eine gelöscht. Die Entropie-Steuer wird eingezogen." },
            { en: "Fluid dynamics applied to a grid. Results: mixed. Literally.", de: "Fluidmechanik am Raster angewandt. Ergebnis: gemischt. Im Wortsinn." },
        ],
        cursedColSolve: [
            { en: "Three columns in, one column gone. Rotational cost.", de: "Drei Spalten rein, eine Spalte weg. Rotationskosten." },
            { en: "The vortex takes its tithe. Still net positive.", de: "Der Wirbel nimmt seinen Zehnt. Trotzdem netto positiv." },
        ],
        cursedRowCol: [
            { en: "Chaos theory demonstrated: eight lines revealed, clues dimmed.", de: "Chaos demonstriert: acht Linien enthüllt, Hinweise verdunkelt." },
            { en: "High-entropy input. Manageable, if we stay careful.", de: "Hochentropiger Input. Beherrschbar, wenn wir vorsichtig bleiben." },
        ],
        chronoFracture: [
            { en: "Cooldowns halved, time drain quadrupled. Aggressive arbitrage.", de: "Abklingzeiten halbiert, Zeitabfluss vervierfacht. Aggressive Arbitrage." },
            { en: "Trading clock speed for ability uptime. Bold. Conditionally approved.", de: "Tausche Taktrate gegen Fähigkeitsverfügbarkeit. Mutig. Bedingt genehmigt." },
        ],
        pearlOfHaste: [
            { en: "First ability on a one-second cycle. That breaks the usual metrics.", de: "Erste Fähigkeit im Ein-Sekunden-Takt. Das bricht die üblichen Metriken." },
            { en: "Pearl installed. Cooldown curve dramatically flattened.", de: "Perle installiert. Abklingzeit-Kurve drastisch geglättet." },
        ],
        pearlOfSwiftness: [
            { en: "Second skill now repeatable at will. Interesting optimization.", de: "Zweite Fähigkeit jetzt beliebig wiederholbar. Interessante Optimierung." },
            { en: "Cooldown: negligible. The mathematics smiles.", de: "Abklingzeit: vernachlässigbar. Die Mathematik lächelt." },
        ],
        grandPearl: [
            { en: "Both abilities at one second. Maximum throughput achieved.", de: "Beide Fähigkeiten bei einer Sekunde. Maximaler Durchsatz erreicht." },
            { en: "Full cooldown collapse. This reshapes the entire strategy space.", de: "Kompletter Abklingzeit-Einsturz. Das formt den gesamten Strategieraum neu." },
        ],
        theWitch: [
            { en: "Cursed immunity for sixty seconds, minus ten minutes. Steep price.", de: "Fluch-Immunität für sechzig Sekunden, minus zehn Minuten. Steiler Preis." },
            { en: "She cackles. The contract terms are... precise.", de: "Sie kichert. Die Vertragsbedingungen sind... präzise." },
        ],
        goldenClock: [
            { en: "Timer frozen in place, three-mistake ceiling. A high-stakes equilibrium.", de: "Timer eingefroren, Drei-Fehler-Obergrenze. Ein Gleichgewicht mit hohem Einsatz." },
            { en: "A clock that refuses to run backwards. Fascinating mechanism.", de: "Eine Uhr, die sich weigert rückwärts zu laufen. Faszinierender Mechanismus." },
        ],
        shadowSeal: [
            { en: "All clues hidden, seventy-five percent marked. Brutal information asymmetry.", de: "Alle Hinweise versteckt, fünfundsiebzig Prozent markiert. Brutale Informationsasymmetrie." },
            { en: "This artifact solves by destroying. Effective. Concerning.", de: "Dieses Artefakt löst durch Zerstörung. Effektiv. Besorgniserregend." },
        ],
    },

    trix: {
        reveal1: [
            { en: "A candle? Cute. One cell, lit by yours truly.", de: "Eine Kerze? Süß. Eine Zelle, von mir persönlich erleuchtet." },
            { en: "One reveal down. Try to look impressed.", de: "Eine Enthüllung geschafft. Versuch mal beeindruckt zu gucken." },
        ],
        reveal2: [
            { en: "Magnifying glass. As if I need help finding things.", de: "Eine Lupe. Als ob ich Hilfe beim Finden bräuchte." },
            { en: "Two cells found. Barely warmed up.", de: "Zwei Zellen gefunden. So gut wie nicht warmgelaufen." },
        ],
        reveal3: [
            { en: "Now this is more my style. Three finds, all obviously perfect.", de: "Jetzt wird's mein Stil. Drei Funde, alle natürlich perfekt." },
            { en: "Three cells spotted from way over here. Pure talent.", de: "Drei Zellen von hier ganz hinten gesichtet. Pures Talent." },
        ],
        reveal4: [
            { en: "Four at once. Even my standards are impressed.", de: "Gleich vier. Sogar meine Ansprüche sind beeindruckt." },
            { en: "Scanner deployed. It scans, I take the credit.", de: "Scanner eingesetzt. Er scannt, ich kassiere den Ruhm." },
        ],
        rowSolve: [
            { en: "A whole row? Please, I've stolen bigger.", de: "Eine ganze Zeile? Bitte, ich hab schon Größeres geklaut." },
            { en: "Row solved. Frame that moment.", de: "Zeile gelöst. Rahmen diesen Moment ein." },
        ],
        colSolve: [
            { en: "Straight line, straight to victory. Naturally.", de: "Gerade Linie, direkt zum Sieg. Natürlich." },
            { en: "The column practically surrendered when I looked at it.", de: "Die Spalte hat praktisch kapituliert, als ich sie angeguckt hab." },
        ],
        scoutPrimer: [
            { en: "Homework? I don't do homework. I do correct answers.", de: "Hausaufgaben? Ich mach keine Hausaufgaben. Ich mache richtige Antworten." },
            { en: "Answer questions, get free rows. Even quizzes can't resist me.", de: "Fragen beantworten, Zeilen geschenkt. Sogar Quizze können mir nicht widerstehen." },
        ],
        artifactComplete: [
            { en: "The WHOLE puzzle? And here I was pacing myself.", de: "Das GANZE Rätsel? Und ich hab mich extra zurückgehalten." },
            { en: "Instant win. Yes, I planned this from the very start.", de: "Sofortsieg. Ja, das hab ich von Anfang an geplant." },
        ],
        markWrong2: [
            { en: "Two wrongs marked. Spotting flaws is my profession.", de: "Zwei Fehler markiert. Schwächen finden ist mein Beruf." },
            { en: "Those two never stood a chance.", de: "Diese beiden hatten nie eine Chance." },
        ],
        markWrong4: [
            { en: "Four swept away. Cleaning up after this grid again.", de: "Vier gefegt. Ich räum schon wieder nach diesem Raster auf." },
            { en: "Four wrongs, zero effort.", de: "Vier Fehler, null Aufwand." },
        ],
        markWrong6: [
            { en: "Six attracted. Mistakes simply flock around quality.", de: "Sechs angezogen. Fehler sammeln sich einfach rund um Qualität." },
            { en: "Six marks. I could do this blindfolded. Twice.", de: "Sechs Markierungen. Könnte ich blind. Zweimal." },
        ],
        markWrong8: [
            { en: "Eight eliminations. This grid should pay me rent.", de: "Acht Eliminierungen. Dieses Raster sollte mir Miete zahlen." },
            { en: "Eight wrongs exposed by yours truly.", de: "Acht Fehler von mir persönlich entlarvt." },
        ],
        addTime60: [
            { en: "One minute. I only need seconds, but sure.", de: "Eine Minute. Ich brauch nur Sekunden, aber bitte." },
            { en: "Sixty extra seconds of watching me work.", de: "Sechzig Extra-Sekunden, mir bei der Arbeit zuzusehen." },
        ],
        addTime300: [
            { en: "Five whole minutes. Generous. Wasted on me though — I'm fast.", de: "Fünf ganze Minuten. Großzügig. Für mich verschwendet — ich bin schnell." },
            { en: "More time to admire my technique.", de: "Mehr Zeit, meine Technik zu bewundern." },
        ],
        addTime600: [
            { en: "Ten minutes?! Fine, I'll stay a little longer.", de: "Zehn Minuten?! Na gut, ich bleib noch etwas länger." },
            { en: "The clock bends for Trix. As it should.", de: "Die Uhr beugt sich vor Trix. Wie es sich gehört." },
        ],
        addTime900: [
            { en: "Fifteen minutes! Now it's officially unfair — for the puzzle.", de: "Fünfzehn Minuten! Jetzt ist es offiziell unfair — für das Rätsel." },
            { en: "Quarter hour added. I'd have won without it. Obviously.", de: "Viertelstunde dazu. Ich hätte auch ohne gewonnen. Offensichtlich." },
        ],
        shield: [
            { en: "A shield? I AM the shield. But fine, I'll wear it.", de: "Ein Schild? ICH bin der Schild. Aber na gut, ich trag ihn." },
            { en: "Next mistake bounces right off. Like everything else.", de: "Der nächste Fehler prallt einfach ab. Wie alles andere." },
        ],
        mistakeEraser: [
            { en: "Two mistakes deleted. History gets rewritten by winners.", de: "Zwei Fehler gelöscht. Geschichte wird von Gewinnerinnen neu geschrieben." },
            { en: "Poof. Never happened.", de: "Puff. Nie passiert." },
        ],
        mistakeEraser4: [
            { en: "Four erased. My record stays spotless. Officially.", de: "Vier ausgelöscht. Meine Bilanz bleibt makellos. Offiziell." },
            { en: "The Professor owes me one now.", de: "Der Professor schuldet mir jetzt einen Gefallen." },
        ],
        mistakeEraser6: [
            { en: "Six gone. Even scholars agree: flawless.", de: "Sechs weg. Sogar Gelehrte sind sich einig: makellos." },
            { en: "Six mistakes retired, with honors.", de: "Sechs Fehler in den Ruhestand geschickt, mit Ehren." },
        ],
        mistakeEraserAll: [
            { en: "Zero mistakes. Exactly the number I remember making.", de: "Null Fehler. Genau die Zahl, an die ich mich erinnere." },
            { en: "A perfectly clean slate. Just how legends are written.", de: "Ein perfekt weißes Blatt. So schreibt man Legenden." },
        ],
        freeze: [
            { en: "Time froze. Even the clock wanted to watch me longer.", de: "Die Zeit stand still. Sogar die Uhr wollte mir länger zusehen." },
            { en: "Frozen time, flawless Trix. Perfect combination.", de: "Eingefrorene Zeit, makellose Trix. Perfekte Kombination." },
        ],
        cursedReveal: [
            { en: "Six reveals, some marks lost. Fair trade — I adapt faster than curses.", de: "Sechs Enthüllungen, ein paar Kreuze weg. Fairer Deal — ich passe mich schneller an als Flüche." },
            { en: "Ooh, spooky lens. It blinked first.", de: "Ooh, gruselige Linse. Sie hat zuerst geblinzelt." },
        ],
        cursedTime: [
            { en: "Twenty minutes MORE? Cursed things love me.", de: "ZWANZIG Minuten mehr? Verfluchte Dinge lieben mich." },
            { en: "Clues hidden for half a minute? Fine, I'll solve blind. Again.", de: "Hinweise eine halbe Minute versteckt? Na gut, löse halt blind. Wieder mal." },
        ],
        cursedShield: [
            { en: "The eye protects me. Smart eye.", de: "Das Auge beschützt mich. Cleveres Auge." },
            { en: "It watches me work. Honestly, can't blame it.", de: "Es schaut mir bei der Arbeit zu. Kann ich ihm ehrlich nicht verübeln." },
        ],
        cursedRowSolve: [
            { en: "Three rows in, one row out. I make the rules; I break them.", de: "Drei Zeilen rein, eine raus. Ich mach die Regeln, ich brech sie." },
            { en: "Tidal wave? More like a gentle splash of genius.", de: "Flutwelle? Eher ein sanfter Schwall Genialität." },
        ],
        cursedColSolve: [
            { en: "Columns spin my way. Most things do.", de: "Spalten drehen sich nach mir. Die meisten Dinge tun das." },
            { en: "Three columns kept. The fourth wasn't worthy.", de: "Drei Spalten behalten. Die vierte war's nicht wert." },
        ],
        cursedRowCol: [
            { en: "CHAOS! My favorite kind of order.", de: "CHAOS! Meine Lieblingsart von Ordnung." },
            { en: "Eight lines revealed. You're welcome, everyone.", de: "Acht Linien enthüllt. Gern geschehen, allerseits." },
        ],
        chronoFracture: [
            { en: "Everything faster? Finally the world keeps up with me.", de: "Alles schneller? Endlich hält die Welt mit mir Schritt." },
            { en: "Timer drains fast. Good thing I never needed much time anyway.", de: "Timer rinnt schnell. Gut, dass ich sowieso nie viel Zeit gebraucht hab." },
        ],
        pearlOfHaste: [
            { en: "One-second cooldowns? NOW we're talking my pace.", de: "Ein Sekunde Abklingzeit? JETZT reden wir übers Tempo." },
            { en: "Skill spam unlocked. Keep the applause going.", de: "Dauerfeuer freigeschaltet. Haltet den Applaus am Laufen." },
        ],
        pearlOfSwiftness: [
            { en: "Second skill, always ready. Like me. Always amazing.", de: "Zweite Fähigkeit, immer bereit. Wie ich. Immer großartig." },
            { en: "Another pearl for the legend of Trix.", de: "Noch eine Perle für die Legende von Trix." },
        ],
        grandPearl: [
            { en: "BOTH pearls. I collect treasures AND cooldown cuts.", de: "BEIDE Perlen. Ich sammle Schätze UND Abklingzeit-Rabatte." },
            { en: "Unlimited skills. Honestly, the grid should just surrender now.", de: "Unbegrenzte Fähigkeiten. Ehrlich, das Raster kann jetzt einfach kapitulieren." },
        ],
        theWitch: [
            { en: "Immunity for sixty seconds? The witch has excellent taste in thieves.", de: "Sechzig Sekunden Immunität? Die Hexe hat einen exzellenten Geschmack bei Diebinnen." },
            { en: "Minus ten minutes, whatever. I work fast.", de: "Minus zehn Minuten, egal. Ich arbeite schnell." },
        ],
        goldenClock: [
            { en: "Time literally stops for me now. As it should.", de: "Die Zeit bleibt jetzt buchstäblich für mich stehen. Wie es sich gehört." },
            { en: "Only three more mistakes allowed? Watch me use zero.", de: "Nur noch drei Fehler erlaubt? Zähl mal mit: null." },
        ],
        shadowSeal: [
            { en: "All clues gone, most marks set. Honestly, I'd have done it prettier.", de: "Alle Hinweise weg, die meisten Kreuze gesetzt. Ehrlich, ich hätt's schöner hinbekommen." },
            { en: "Brutal. Dramatic. Efficient. It's basically me.", de: "Brutal. Dramatisch. Effizient. Das ist quasi ich." },
        ],
    },

    syla: {
        reveal1: [
            { en: "A little candle! Hello little light, show us the way!", de: "Eine kleine Kerze! Hallo kleines Licht, zeig uns den Weg!" },
            { en: "One little cell glows! Like a firefly friend!", de: "Eine kleine Zelle leuchtet! Wie ein Glühwürmchen-Freund!" },
        ],
        reveal2: [
            { en: "Big magnifier! Everything looks so curious through it!", de: "Große Lupe! Alles sieht damit so neugierig aus!" },
            { en: "Two friends found hiding in the grid!", de: "Zwei Freunde gefunden, die sich im Raster versteckt haben!" },
        ],
        reveal3: [
            { en: "A spyglass! Just like real explorers have! Look look!", de: "Ein Fernglas! Wie echte Entdecker eins haben! Guck guck!" },
            { en: "I see three little cells waving at us!", de: "Ich seh drei kleine Zellen, die uns zuwinken!" },
        ],
        reveal4: [
            { en: "Beep beep beep! The scanner says hello four times!", de: "Piep piep piep! Der Scanner sagt viermal Hallo!" },
            { en: "Four at once! That's like a whole family of cells!", de: "Gleich vier! Das ist wie eine ganze Zellen-Familie!" },
        ],
        rowSolve: [
            { en: "The set square drew us a whole row! What a clever tool!", de: "Das Geodreieck hat uns eine ganze Zeile gezeichnet! Was für ein schlau Werkzeug!" },
            { en: "A full line of solved cells, like tiny lanterns!", de: "Eine ganze Reihe gelöster Zellen, wie kleine Lämpchen!" },
        ],
        colSolve: [
            { en: "The ruler straightened things out! Thank you, ruler!", de: "Das Lineal hat alles gerade gerückt! Danke, Lineal!" },
            { en: "A whole column stood up and smiled!", de: "Eine ganze Spalte ist aufgestanden und hat gelächelt!" },
        ],
        scoutPrimer: [
            { en: "Questions first, then the grid gets easier! Like campfire riddles!", de: "Erst Fragen, dann wird das Raster leichter! Wie Rätsel am Lagerfeuer!" },
            { en: "Ooh, a quiz adventure! I love those! Mostly!", de: "Ooh, ein Quiz-Abenteuer! Das liebe ich! Meistens!" },
        ],
        artifactComplete: [
            { en: "The whole puzzle at once?! Like magic sunshine everywhere!", de: "Das ganze Rätsel auf einmal?! Wie Zauber-Sonnenschein überall!" },
            { en: "Everyone's home! All the little cells together!", de: "Alle sind zu Hause! Alle kleinen Zellen beisammen!" },
        ],
        markWrong2: [
            { en: "Two crosses! Don't worry, little crosses, you're helpful!", de: "Zwei Kreuze! Keine Sorge, ihr Kreuzlein, ihr helft ja!" },
            { en: "Bye-bye, wrong spots! Nothing personal!", de: "Tschüss, falsche Stellen! Nichts Persönliches!" },
        ],
        markWrong4: [
            { en: "Sweep sweep! Like sweeping leaves in autumn!", de: "Fegen fegen! Wie Laub kehren im Herbst!" },
            { en: "Four hiding places found! They were hiding so well!", de: "Vier Verstecke gefunden! Die haben sich so gut versteckt!" },
        ],
        markWrong6: [
            { en: "The magnet tickles the wrong cells out of hiding!", de: "Der Magnet kitzelt die falschen Zellen aus dem Versteck!" },
            { en: "Six crosses! Like little birds sitting on a wire!", de: "Sechs Kreuze! Wie kleine Vögel auf einem Draht!" },
        ],
        markWrong8: [
            { en: "The shiny gem found eight! Shiny things are always helpful!", de: "Der glitzernde Stein hat acht gefunden! Glitzerndes ist immer so hilfreich!" },
            { en: "Eight goodbyes to eight wrong cells!", de: "Acht Tschüss an acht falsche Zellen!" },
        ],
        addTime60: [
            { en: "Sand falling upwards! Magic hourglass!", de: "Sand fällt nach oben! Zauber-Sanduhr!" },
            { en: "A minute more! That's sixty little breaths of time!", de: "Eine Minute mehr! Das sind sechzig kleine Zeit-Atemzüge!" },
        ],
        addTime300: [
            { en: "Five more minutes! Just like Mama's 'five more minutes of play'!", de: "Fünf Minuten mehr! Genau wie Mamas 'noch fünf Minuten spielen'!" },
            { en: "Yay, the stopwatch stretched time! Stretchy time!", de: "Juhu, die Stoppuhr hat die Zeit gedehnt! Dehnbare Zeit!" },
        ],
        addTime600: [
            { en: "Ten whole minutes! The clock is being generous today!", de: "Zehn ganze Minuten! Die Uhr ist heute so großzügig!" },
            { en: "More time means more care for every cell!", de: "Mehr Zeit heißt mehr Sorgfalt für jede Zelle!" },
        ],
        addTime900: [
            { en: "FIFTEEN minutes?! That's a whole lunch break of time!", de: "FÜNFZEHN Minuten?! Das ist eine ganze Mittagspause voll Zeit!" },
            { en: "The lightning gave us time! Fast and friendly!", de: "Der Blitz hat uns Zeit geschenkt! Schnell und freundlich!" },
        ],
        shield: [
            { en: "Little shield, guard us well! You can do it!", de: "Kleines Schild, pass gut auf uns auf! Du schaffst das!" },
            { en: "Now mistakes bounce off, like rain off a leaf!", de: "Jetzt prallen Fehler einfach ab, wie Regen von einem Blatt!" },
        ],
        mistakeEraser: [
            { en: "The tutor washed two mistakes away! Clean as a stream!", de: "Der Tutor hat zwei Fehler fortgewaschen! Sauber wie ein Bach!" },
            { en: "Two oopsies less! Thank you, wise helper!", de: "Zwei Hoppla-Momente weniger! Danke, weiser Helfer!" },
        ],
        mistakeEraser4: [
            { en: "Four mistakes healed! Like little scrapes on knees!", de: "Vier Fehler verheilt! Wie kleine Schürfwunden auf Knien!" },
            { en: "The professor knows so much! And shares it kindly!", de: "Der Professor weiß so viel! Und teilt es freundlich!" },
        ],
        mistakeEraser6: [
            { en: "All better now! The scholar is like a gentle doctor!", de: "Allen wieder gut! Der Gelehrte ist wie ein sanfter Doktor!" },
            { en: "So many oopsies gone! The grid feels lighter, I think!", de: "So viele Hoppla-Weg! Das Raster fühlt sich leichter an, glaube ich!" },
        ],
        mistakeEraserAll: [
            { en: "ALL mistakes gone! Fresh as morning dew!", de: "ALLE Fehler weg! Frisch wie Morgentau!" },
            { en: "Zero mistakes! The grid forgave everything! I knew it!", de: "Null Fehler! Das Raster hat alles vergeben! Ich wusste es!" },
        ],
        freeze: [
            { en: "Time took a tiny nap! Sweet dreams, time!", de: "Die Zeit macht ein kleines Nickerchen! Süße Träume, Zeit!" },
            { en: "Shhh! The timer is sleeping! We tiptoe very carefully!", de: "Pssst! Der Timer schläft! Wir schleichen ganz vorsichtig!" },
        ],
        cursedReveal: [
            { en: "The lens shows six but jumbles our crosses... rude, but okay!", de: "Die Linse zeigt sechs, aber unsere Kreuze sind durcheinander... frech, aber okay!" },
            { en: "Grumpy lens! It helped anyway, in its own grumpy way!", de: "Mürrische Linse! Sie hat trotzdem geholfen, auf ihre mürrische Art!" },
        ],
        cursedTime: [
            { en: "Lots of time, but the clues hid behind clouds!", de: "Viel Zeit, aber die Hinweise verstecken sich hinter Wolken!" },
            { en: "The clock gave and took! Just like the wind does!", de: "Die Uhr hat gegeben und genommen! So wie der Wind!" },
        ],
        cursedShield: [
            { en: "The eye is scary but it winked! Maybe it likes us?", de: "Das Auge ist gruselig, aber es hat gezwinkert! Vielleicht mag es uns?" },
            { en: "Protected by a big spooky eye! Friends come in all shapes!", de: "Beschützt von einem großen Grusel-Auge! Freunde haben alle Formen!" },
        ],
        cursedRowSolve: [
            { en: "The wave gave three rows and took one! Waves are like that!", de: "Die Welle gab drei Zeilen und nahm eine! Wellen sind halt so!" },
            { en: "Splash! Sorry little row, the sea borrowed you!", de: "Platsch! Tut mir leid, kleine Zeile, das Meer hat dich geliehen!" },
        ],
        cursedColSolve: [
            { en: "The wind spun three columns to us! Wheee!", de: "Der Wind hat drei Spalten zu uns gedreht! Wheee!" },
            { en: "One column flew away... fly safe, little column!", de: "Eine Spalte ist weggeflogen... flieg sicher, kleine Spalte!" },
        ],
        cursedRowCol: [
            { en: "Boom! So many cells at once! My heart went boom too!", de: "BUMM! So viele Zellen auf einmal! Mein Herz hat auch BUMM gemacht!" },
            { en: "Big chaos! But we'll tidy it gently, promise!", de: "Großes Chaos! Aber wir räumen es behutsam auf, versprochen!" },
        ],
        chronoFracture: [
            { en: "Everything goes zoom zoom! Hold on tight!", de: "Alles geht zoom zoom! Halt dich fest!" },
            { en: "The clock got hurt and runs funny... let's be quick and kind!", de: "Die Uhr ist verletzt und läuft komisch... lass uns schnell und lieb sein!" },
        ],
        pearlOfHaste: [
            { en: "A little blue pearl! It makes the skill bouncy-fast!", de: "Eine kleine blaue Perle! Sie macht die Fähigkeit gummiballschnell!" },
            { en: "Thank you, pearl! I'll use it lots and lots!", de: "Danke, Perle! Ich benutze sie ganz, ganz oft!" },
        ],
        pearlOfSwiftness: [
            { en: "Purple pearl! It hums a hurry-up song!", de: "Lila Perle! Sie summt ein Beeil-dich-Lied!" },
            { en: "The second skill never naps now! Lucky skill!", de: "Die zweite Fähigkeit macht nie mehr ein Nickerchen! Glückliche Fähigkeit!" },
        ],
        grandPearl: [
            { en: "The big pearl helps BOTH skills! Sharing is caring!", de: "Die große Perle hilft BEIDEN Fähigkeiten! Teilen ist Liebhaben!" },
            { en: "So much helping power in one tiny pearl!", de: "So viel Hilfskraft in einer winzigen Perle!" },
        ],
        theWitch: [
            { en: "The witch is grumpy but her magic hugs protect us!", de: "Die Hexe ist mürrisch, aber ihre Magie-Umarmungen schützen uns!" },
            { en: "Ten minutes for sixty safe seconds... she drives a hard bargain!", de: "Zehn Minuten für sechzig sichere Sekunden... sie handelt hart!" },
        ],
        goldenClock: [
            { en: "The golden clock purrs like a cat! Time stays put!", de: "Die goldene Uhr schnurrt wie eine Katze! Die Zeit bleibt, wo sie ist!" },
            { en: "Only three mistakes left... we'll be extra careful, promise!", de: "Nur noch drei Fehler... wir sind extra vorsichtig, versprochen!" },
        ],
        shadowSeal: [
            { en: "Shadows hid the clues but marked lots for us! Confusing gift!", de: "Schatten haben Hinweise versteckt, aber vieles für uns markiert! Verwirrendes Geschenk!" },
            { en: "Don't be scared, little clues... we'll find each other again!", de: "Keine Angst, kleine Hinweise... wir finden uns wieder!" },
        ],
    },
};

//------------------------------------------------------------------------
//-------------------SKILL-SPECIFIC LINE BANK------------------------------
//------------------------------------------------------------------------
// Keyed by character -> skill key -> array of { en, de } lines.
// Skill keys combine the class/ascendency id with the active slot:
//   '<classId>_active1' | '<classId>_active2'
// Fired via triggerSkillBanter(skillKey) when that exact class uses that
// exact skill. Each character can hold every class, so every combination
// gets character-specific lines. At least two per skill per character.
//
// Base classes:
//   mathmagician  — active1 Arcane Reveal,   active2 Absolute Zero
//   statistician  — active1 Data Strike,     active2 Diagonal Strike
//   probabilist   — active1 Precision Shot,  active2 Rain of Arrows
// Ascendencies:
//   outlier       — active1 Tail Risk,             active2 SPEEDFORCE
//   actuary       — active1 Regression to Prior,   active2 Significance Threshold
//   recursionist  — active1 Residual,              active2 Degrees of Freedom
//   markovian     — active1 State Rollback,        active2 Transition Matrix
//   bayesian      — active1 Bayes Traps,           active2 Type I Error Shield
//   random_walker — active1 Brownian Motion,       active2 Drifter
//------------------------------------------------------------------------

const _BANTER_SKILL_LINES = {
    stox: {
        mathmagician_active1: [
            { en: "Arcane Reveal deployed. Sampling neighbours systematically.", de: "Arkane Enthüllung eingesetzt. Nachbarn werden systematisch beprobt." },
            { en: "Local scan initiated. Expect up to six confirmations.", de: "Lokaler Scan gestartet. Erwarte bis zu sechs Bestätigungen." },
        ],
        mathmagician_active2: [
            { en: "Absolute Zero engaged. Penalties briefly suspended.", de: "Absoluter Nullpunkt aktiv. Strafen kurzfristig ausgesetzt." },
            { en: "Thermal motion stopped. The timer will follow.", de: "Thermische Bewegung gestoppt. Der Timer folgt." },
        ],
        statistician_active1: [
            { en: "Data Strike incoming. Rows or columns — both valid hypotheses.", de: "Datenhieb kommt. Zeilen oder Spalten — beides gültige Hypothesen." },
            { en: "Striking the dataset directly. Crude, but effective.", de: "Direkter Schlag in den Datensatz. Ruppig, aber effektiv." },
        ],
        statistician_active2: [
            { en: "Diagonal trajectory calculated. Executing.", de: "Diagonale Trajektorie berechnet. Wird ausgeführt." },
            { en: "Cross-section strike. Elegant geometry, practical results.", de: "Querschnittschlag. Elegante Geometrie, praktische Ergebnisse." },
        ],
        probabilist_active1: [
            { en: "Precision Shot armed. Only wrong targets selected.", de: "Präzisionsschuss scharf. Nur falsche Ziele ausgewählt." },
            { en: "Marksmanship by elimination. My favorite discipline.", de: "Schießen durch Ausschluss. Meine Lieblingsdisziplin." },
        ],
        probabilist_active2: [
            { en: "Area scan launched. Statistical coverage: promising.", de: "Flächenscan gestartet. Statistische Abdeckung: vielversprechend." },
            { en: "Broad sampling, narrow uncertainty. Proceeding.", de: "Breite Stichprobe, geringe Unsicherheit. Weiter geht's." },
        ],
        outlier_active1: [
            { en: "Tail Risk accepted. The Infinite Hunger takes its price.", de: "Tail Risk akzeptiert. Der Unendliche Hunger nimmt seinen Preis." },
            { en: "Trading time for revelations. Extreme, but the numbers justify it.", de: "Zeit gegen Enthüllungen getauscht. Extrem, aber die Zahlen rechtfertigen es." },
        ],
        outlier_active2: [
            { en: "Speedforce entered. Temporal velocity multiplied by ten.", de: "Speedforce betreten. Zeitgeschwindigkeit verzehnfacht." },
            { en: "Moving faster than penalties can register. Zero margin, maximum speed.", de: "Wir bewegen uns schneller, als Strafen registrieren können. Keine Marge, maximales Tempo." },
        ],
        actuary_active1: [
            { en: "Regression to Prior. Correcting recent deviations.", de: "Regression to Prior. Korrigiere aktuelle Abweichungen." },
            { en: "Recovering lost time. The premiums finally pay off.", de: "Verlorene Zeit zurückholen. Die Prämien zahlen sich endlich aus." },
        ],
        actuary_active2: [
            { en: "Significance Threshold set. Errors there fall below significance.", de: "Signifikanzschwelle gesetzt. Fehler dort fallen unter die Bedeutsamkeitsschwelle." },
            { en: "Selected lines are protected. Risk properly priced.", de: "Gewählte Linien sind geschützt. Risiko korrekt kalkuliert." },
        ],
        recursionist_active1: [
            { en: "Residual planted. Errors become sources of revelation.", de: "Residuum gepflanzt. Fehler werden zu Quellen der Enthüllung." },
            { en: "The totem iterates. Self-correcting systems, as designed.", de: "Das Totem iteriert. Selbstkorrigierende Systeme, wie entworfen." },
        ],
        recursionist_active2: [
            { en: "Degrees of Freedom applied. The zombie is loose. Mind its hunger.", de: "Freiheitsgrade angewandt. Der Zombie ist unterwegs. Achte auf seinen Hunger." },
            { en: "Every error contains its own correction. The zombie will find them.", de: "Jeder Fehler enth\u00e4lt seine eigene Korrektur. Der Zombie wird sie finden." },
        ],
        markovian_active1: [
            { en: "State Rollback executed. Reverting to a previous configuration.", de: "State Rollback ausgeführt. Rückkehr zu einer früheren Konfiguration." },
            { en: "Undoing recent history. If only archives worked this way.", de: "Neueste Geschichte wird rückgängig gemacht. Wenn Archive nur so funktionieren würden." },
        ],
        markovian_active2: [
            { en: "Transition Matrix active. Every fill now cascades probabilistically.", de: "Übergangsmatrix aktiv. Jede Füllung kaskadiert jetzt wahrscheinlichkeitsbasiert." },
            { en: "Markov chain engaged. Future states depend only on the present.", de: "Markow-Kette aktiv. Künftige Zustände hängen nur von der Gegenwart ab." },
        ],
        bayesian_active1: [
            { en: "Bayes Traps placed. Conditional revelations armed.", de: "Bayes-Fallen platziert. Bedingte Enthüllungen scharf gestellt." },
            { en: "Each trap updates our priors automatically. Efficient.", de: "Jede Falle aktualisiert unsere Annahmen automatisch. Effizient." },
        ],
        bayesian_active2: [
            { en: "Type I Error Shield seeded. False alarms deflected.", de: "Typ-I-Fehler-Schild verteilt. Falschalarme werden abgelenkt." },
            { en: "Misclassification insurance distributed across the cells. Rational.", de: "Fehlklassifikations-Versicherung über die Zellen verteilt. Rational." },
        ],
        random_walker_active1: [
            { en: "Brownian walker released. Random path, deterministic benefit.", de: "Brownscher Wanderer entlassen. Zufälliger Pfad, deterministischer Nutzen." },
            { en: "It wanders and reveals. Convergence through randomness.", de: "Er wandert und enthüllt. Konvergenz durch Zufall." },
        ],
        random_walker_active2: [
            { en: "Drifter summoned. An autonomous agent working our side of the grid.", de: "Drifter beschworen. Ein autonomer Agent auf unserer Seite des Rasters." },
            { en: "Feed it correct fills. It repays in revelations. Fair exchange.", de: "Füttere ihn mit richtigen Füllungen. Er zahlt in Enthüllungen zurück. Fairer Tausch." },
        ],
    },

    trix: {
        mathmagician_active1: [
            { en: "Arcane Reveal? I call it 'showing off'. Same spell.", de: "Arkane Enthüllung? Ich nenn's 'angeben'. Gleicher Zauber." },
            { en: "Neighbors revealed. Even your surroundings can't hide from me.", de: "Nachbarschaft enthüllt. Nicht mal deine Umgebung kann sich vor mir verstecken." },
        ],
        mathmagician_active2: [
            { en: "Absolute Zero! Coldest trick in my repertoire.", de: "Absoluter Nullpunkt! Der coolste Trick in meinem Repertoire." },
            { en: "Time frozen. Perfect — it needed to watch me properly.", de: "Zeit eingefroren. Perfekt — sie musste mir endlich ordentlich zusehen." },
        ],
        statistician_active1: [
            { en: "Data Strike! I strike, the data trembles.", de: "Datenhieb! Ich schlage zu, die Daten erzittern." },
            { en: "Row or column? Whichever hurts the puzzle most.", de: "Zeile oder Spalte? Die, die dem Rätsel am meisten wehtut." },
        ],
        statistician_active2: [
            { en: "Diagonal Strike. Angles this sharp should be illegal.", de: "Diagonalschlag. Solch scharfe Winkel sollten verboten sein." },
            { en: "Watch the blade work. Well — the math-blade.", de: "Sieh dir die Klinge an. Also — die Mathe-Klinge." },
        ],
        probabilist_active1: [
            { en: "Precision Shot. Precision is practically my middle name.", de: "Präzisionsschuss. Präzision ist quasi mein Mittelname." },
            { en: "Every wrong cell marked by the Guild's finest shot.", de: "Jede falsche Zelle markiert von der besten Schützin der Gilde." },
        ],
        probabilist_active2: [
            { en: "Rain of Arrows! It rains, it scores, I shine.", de: "Pfeilregen! Es regnet, es trifft, ich strahle." },
            { en: "Scanned the area. Of course I picked the important one.", de: "Bereich gescannt. Natürlich hab ich den wichtigen gewählt." },
        ],
        outlier_active1: [
            { en: "Tail Risk! Danger is just drama that hasn't happened yet.", de: "Tail Risk! Gefahr ist nur Drama, das noch nicht stattgefunden hat." },
            { en: "I live at the extremes. The middle is boring.", de: "Ich lebe in den Extremen. Die Mitte ist langweilig." },
        ],
        outlier_active2: [
            { en: "SPEEDFORCE! Finally, a skill named after my personality.", de: "SPEEDFORCE! Endlich eine Fähigkeit, die nach meiner Persönlichkeit benannt ist." },
            { en: "Too fast to fail. Usually. Today definitely.", de: "Zu schnell zum Scheitern. Meistens. Heute definitiv." },
        ],
        actuary_active1: [
            { en: "Undoing mistakes? Can I undo other people's too?", de: "Fehler rückgängig machen? Kann ich auch die von anderen rückgängig machen?" },
            { en: "Back to perfection. So, back to whenever I last acted.", de: "Zurück zur Perfektion. Also zurück zu meinem letzten Auftritt." },
        ],
        actuary_active2: [
            { en: "Small errors simply don't qualify for my attention anymore.", de: "Kleine Fehler qualifizieren sich einfach nicht mehr für meine Aufmerksamkeit." },
            { en: "Only truly significant events may impress me.", de: "Nur wirklich signifikante Ereignisse dürfen mich beeindrucken." },
        ],
        recursionist_active1: [
            { en: "A totem that fixes my leftovers? Even my mistakes overachieve.", de: "Ein Totem, das meine Reste fixiert? Sogar meine Fehler übertreffen sich." },
            { en: "Plant it, forget it, take the credit later.", de: "Reinstellen, vergessen, sich später den Ruhm nehmen." },
        ],
        recursionist_active2: [
            { en: "Degrees of Freedom! Freedom is my favorite thing. After me.", de: "Freiheitsgrade! Freiheit ist mein Lieblingsding. Direkt nach mir." },
            { en: "The zombie works for me. Technically for you. Mostly for me.", de: "Der Zombie arbeitet für mich. Technisch für dich. Hauptsächlich für mich." },
        ],
        markovian_active1: [
            { en: "Rewind button for people who deserve second chances. Me.", de: "Rückgängig-Knopf für Leute, die zweite Chancen verdienen. Mir." },
            { en: "That mistake officially never happened. I decided.", de: "Dieser Fehler ist offiziell nie passiert. Hab ich entschieden." },
        ],
        markovian_active2: [
            { en: "Transition Matrix. Every step chains perfectly when I plan it.", de: "Übergangsmatrix. Jeder Schritt verkettet sich perfekt, wenn ich's plane." },
            { en: "Cascades follow me around. I'm very followable.", de: "Kaskaden folgen mir überall hin. Ich bin sehr gut zum Folgen." },
        ],
        bayesian_active1: [
            { en: "Bayes Traps! I lay traps better than traps lay traps.", de: "Bayes-Fallen! Ich lege Fallen besser, als Fallen Fallen legen." },
            { en: "Step carefully, grid. These are professional-grade ambushes.", de: "Pass auf, Raster. Das sind Hinterhalte in Profiqualität." },
        ],
        bayesian_active2: [
            { en: "False alarms bounce off me. True alarms apologize first.", de: "Falschalarme prallen an mir ab. Echte Alarme entschuldigen sich vorher." },
            { en: "Type I Error Shield. Because I'm never wrong twice.", de: "Typ-I-Fehler-Schild. Denn ich liege nie zweimal falsch." },
        ],
        random_walker_active1: [
            { en: "Brownian Motion! Random paths — all somehow leading to brilliance.", de: "Brownsche Bewegung! Zufällige Pfade — alle irgendwie zur Genialität." },
            { en: "Even randomness cooperates with me. Shocking, I know.", de: "Selbst der Zufall kooperiert mit mir. Schockierend, ich weiß." },
        ],
        random_walker_active2: [
            { en: "Go on, Drifter. Serve the greatest thief you'll ever meet.", de: "Los, Drifter. Dien der größten Diebin, die du je treffen wirst." },
            { en: "My own personal minion. Every legend needs staff.", de: "Mein ganz persönlicher Gehilfe. Jede Legende braucht Personal." },
        ],
    },

    syla: {
        mathmagician_active1: [
            { en: "Sparkly magic! Say hi to the neighbors, little cells!", de: "Funkelnde Magie! Sag Hallo zu den Nachbarn, kleine Zellen!" },
            { en: "The spell tickles them awake, one by one!", de: "Der Zauber kitzelt sie wach, eins nach dem anderen!" },
        ],
        mathmagician_active2: [
            { en: "Brrr! Everything's frosty! Even the mistakes take a nap!", de: "Brrr! Alles ist frostig! Sogar die Fehler machen ein Nickerchen!" },
            { en: "Snow-day time! Nothing slips while it's snowy!", de: "Schneetag! Nichts rutscht aus, wenn es schneit!" },
        ],
        statistician_active1: [
            { en: "Go, mighty strike! Be gentle though!", de: "Los, mächtiger Hieb! Aber sei lieb!" },
            { en: "Row or column? Hmm... whichever looks loneliest!", de: "Zeile oder Spalte? Hmm... welche sieht am einsamsten aus!" },
        ],
        statistician_active2: [
            { en: "Whoosh! A diagonal slide, like a fox down a hillside!", de: "Wusch! Eine diagonale Rutschbahn, wie ein Fuchs am Hang!" },
            { en: "Zipping corner to corner! Hold on, little cells!", de: "Von Ecke zu Ecke sausen! Haltet euch fest, kleine Zellen!" },
        ],
        probabilist_active1: [
            { en: "Steady hands, kind aim! Only marking, never hurting!", de: "Ruhige Hände, freundliches Zielen! Nur markieren, nie wehtun!" },
            { en: "The cross-marks land softly, like little leaves!", de: "Die Kreuzchen landen sanft, wie kleine Blätter!" },
        ],
        probabilist_active2: [
            { en: "Arrow rain! Don't worry, grid, they're friendly arrows!", de: "Pfeilregen! Keine Angst, Raster, das sind freundliche Pfeile!" },
            { en: "Pitter patter! The arrows dance across the field!", de: "Plipplaplonk! Die Pfeile tanzen über das Feld!" },
        ],
        outlier_active1: [
            { en: "The scary edge of chances! We'll hold its hand, then it's nice!", de: "Die gruselige Kante der Chancen! Wir geben ihr die Hand, dann ist sie nett!" },
            { en: "Big risks feel smaller when we stick together!", de: "Große Risiken fühlen sich kleiner an, wenn wir zusammenhalten!" },
        ],
        outlier_active2: [
            { en: "Zoom zoom! Faster than bunny hops!", de: "Zack Zack! Schneller als Hasenhüpfer!" },
            { en: "Everything's speedy! Wheee! But don't trip though!", de: "Alles wird schnell! Wheee! Aber nicht stolpern!" },
        ],
        actuary_active1: [
            { en: "Turn back time a bit? Like putting a ladybug back on its leaf!", de: "Zeit ein bisschen zurückdrehen? Wie ein Marienkäferchen zurück aufs Blatt!" },
            { en: "Back to the cozy part! I liked that part!", de: "Zurück zum gemütlichen Teil! Den mochte ich!" },
        ],
        actuary_active2: [
            { en: "Tiny oopsies don't count there now! The threshold said so!", de: "Mini-Hoppla zählen dort jetzt nicht! Das hat die Schwelle gesagt!" },
            { en: "Small mistakes get a hug and a free pass!", de: "Kleine Fehler kriegen eine Umarmung und bleiben ohne Folgen!" },
        ],
        recursionist_active1: [
            { en: "A little leftover guardian! Stay safe back there, okay?", de: "Ein kleiner Rest-Wächter! Pass hinten gut auf, ja?" },
            { en: "It hums softly while it works! What a patient totem!", de: "Es summt leise bei der Arbeit! Was für ein geduldiges Totem!" },
        ],
        recursionist_active2: [
            { en: "Zombie friend shambles around! Click its cell real fast, okay?", de: "Zombie-Freund schlurft herum! Klick seine Zelle ganz schnell, okay?" },
            { en: "If you're too slow, zombie helps! Zombie-help is a little bitey!", de: "Wenn du zu langsam bist, hilft der Zombie! Zombie-Hilfe ist ein bisschen bissig!" },
        ],
        markovian_active1: [
            { en: "Turn around, turn around, let's try again nicely!", de: "Dreh dich um, dreh dich um, versuchen wir's nochmal nett!" },
            { en: "The past lets go when you ask politely!", de: "Die Vergangenheit lässt los, wenn man höflich fragt!" },
        ],
        markovian_active2: [
            { en: "Each step holds hands with the next one! Teamwork!", de: "Jeder Schritt hält des nächsten Händchen! Teamarbeit!" },
            { en: "The links glow like dewdrops in a row!", de: "Die Verbindungen leuchten wie Tautropfen in einer Reihe!" },
        ],
        bayesian_active1: [
            { en: "Little traps, set with care! Surprise — but politely!", de: "Kleine Fallen, liebevoll gestellt! Überraschung — aber höflich!" },
            { en: "They wait quietly, like frogs on lily pads!", de: "Sie warten still, wie Frösche auf Seerosenblättern!" },
        ],
        bayesian_active2: [
            { en: "No false scares allowed past this shield!", de: "Keine falschen Schrecke kommen durch dieses Schild!" },
            { en: "What a thoughtful shield! It filters grumpy surprises!", de: "Was für ein aufmerksames Schild! Es filtert mürrische Überraschungen raus!" },
        ],
        random_walker_active1: [
            { en: "Hello, little wanderer! Walk safely and share what you find!", de: "Hallo, kleiner Wanderer! Geh sicher und teile, was du findest!" },
            { en: "It hops wherever it likes! Free little helper!", de: "Es hüpft, wohin es will! Freies kleines Helferlein!" },
        ],
        random_walker_active2: [
            { en: "Hello new friend! Wander safely and help lots!", de: "Hallo neuer Freund! Wander sicher und hilf fleißig!" },
            { en: "It drifts like a little cloud! Come back soon, cloud buddy!", de: "Er driftet wie ein kleines Wölkchen! Komm bald wieder, Wolkenfreund!" },
        ],
    },
};







//------------------------------------------------------------------------
//-------------------TRIGGER CONFIG-----------------------------------------
//------------------------------------------------------------------------
// Per-event chance (0-1) and minimum cooldown (ms) before the SAME event
// key can fire banter again. Events not listed default to chance 1.0
// and the DEFAULT cooldown.
//------------------------------------------------------------------------

const _BANTER_DEFAULT_COOLDOWN_MS = 12000;

// Item-specific banter: chance per use + cooldown per item id.
const _BANTER_ITEM_CHANCE = 0.3;
const _BANTER_ITEM_COOLDOWN_MS = 25000;

// Skill-specific banter: chance per activation + cooldown per skill key.
const _BANTER_SKILL_CHANCE = 0.5;
const _BANTER_SKILL_COOLDOWN_MS = 45000;

const _BANTER_EVENT_CFG = {
    level_start: { chance: 0.6, cooldownMs: 0 },
    mistake_single: { chance: 0.18, cooldownMs: 15000 },
    mistake_streak: { chance: 0.9, cooldownMs: 25000 },
    mistake_absorbed: { chance: 0.35, cooldownMs: 15000 },
    correct_streak: { chance: 0.5, cooldownMs: 30000 },
    item_used_generic: { chance: 0.25, cooldownMs: 15000 },
    item_used_cursed: { chance: 0.6, cooldownMs: 15000 },
    lucky_tile: { chance: 0.5, cooldownMs: 15000 },
    low_time: { chance: 1.0, cooldownMs: 9999999 }, // effectively once per level (gated by flag too)
    win: { chance: 0.7, cooldownMs: 0 },
};

// Global gate: minimum gap between ANY two banter lines, regardless of
// event key, so the bubble never feels spammy even if several different
// triggers fire in quick succession.
const _BANTER_GLOBAL_MIN_GAP_MS = 6000;

// Runtime cooldown tracking. Reset per level in resetBanterState().
let _banterLastShownByEvent = {};
let _banterLastShownAt = 0;
let _banterLowTimeFired = false;


//------------------------------------------------------------------------
//-------------------BUBBLE DOM HELPERS-------------------------------------
//------------------------------------------------------------------------

// Returns the avatar wrapper the bubble should attach to — the simple
// (non-monster level) avatar or the full (monster level) avatar,
// whichever currently exists.
function _banterGetAvatarEl() {
    return document.getElementById('player-avatar-simple')
        || document.getElementById('player-avatar-wrapper');
}

// Creates (if needed) and returns the bubble element, attached to body
// so it can be positioned with fixed coordinates relative to the avatar.
function _banterEnsureBubbleEl() {
    let bubble = document.getElementById('char-speech-bubble');
    if (bubble) return bubble;

    bubble = document.createElement('div');
    bubble.id = 'char-speech-bubble';
    bubble.className = 'char-speech-bubble';
    bubble.innerHTML = `<div class="char-speech-bubble-text" id="char-speech-bubble-text"></div>`;
    document.body.appendChild(bubble);
    return bubble;
}

// Positions the bubble to the top-right of the current avatar element.
function _banterPositionBubble(bubble) {
    const avatar = _banterGetAvatarEl();
    if (!avatar) return false;

    const rect = avatar.getBoundingClientRect();
    // Anchor near the top-right corner of the avatar sprite.
    const left = rect.right - 10;
    const top = rect.top - 8;

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    return true;
}

// Hides and clears the bubble immediately (no fade).
function hideCharacterBanter() {
    const bubble = document.getElementById('char-speech-bubble');
    if (!bubble) return;
    bubble.classList.remove('show');
    if (window._banterHideTimeout) {
        clearTimeout(window._banterHideTimeout);
        window._banterHideTimeout = null;
    }
}

// Shows the bubble with the given text for a few seconds, then fades out.
function _banterShowBubble(text) {
    const bubble = _banterEnsureBubbleEl();
    const textEl = document.getElementById('char-speech-bubble-text');
    if (!textEl) return;

    textEl.textContent = text;

    if (!_banterPositionBubble(bubble)) return; // no avatar on screen — skip

    bubble.classList.add('show');

    if (window._banterHideTimeout) clearTimeout(window._banterHideTimeout);
    window._banterHideTimeout = setTimeout(() => {
        bubble.classList.remove('show');
    }, 4200);
}


// Repositions the bubble (if it's currently visible) without changing its
// text or restarting its hide timer. Called whenever the avatar moves.
function _banterRepositionBubbleIfVisible() {
    const bubble = document.getElementById('char-speech-bubble');
    if (!bubble || !bubble.classList.contains('show')) return;
    _banterPositionBubble(bubble);
}


//------------------------------------------------------------------------
//-------------------LINE SELECTION-----------------------------------------
//------------------------------------------------------------------------

// Picks a random localized line for the given character + event key.
// Returns null if no lines are defined (so callers can no-op safely).
function _banterPickLine(charId, eventKey) {
    const lines = _BANTER_LINES[charId]?.[eventKey];
    if (!lines || lines.length === 0) return null;

    const entry = lines[Math.floor(Math.random() * lines.length)];
    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    return (lang === 'de' && entry.de) ? entry.de : entry.en;
}


//------------------------------------------------------------------------
//-------------------PUBLIC ENTRY POINT-------------------------------------
//------------------------------------------------------------------------

// Call this from gameplay code whenever a banter-worthy event happens.
// eventKey must match a key used in _BANTER_LINES / _BANTER_EVENT_CFG.
// Handles: character selection check, chance roll, per-event cooldown,
// and the global minimum gap between any two lines.
function triggerBanter(eventKey) {
    const charId = STATE?.playerCharacter;
    if (!charId || !_BANTER_LINES[charId]) return; // no character chosen yet

    const cfg = _BANTER_EVENT_CFG[eventKey] || { chance: 1.0, cooldownMs: _BANTER_DEFAULT_COOLDOWN_MS };
    const now = Date.now();

    // Global gap: don't show two lines back-to-back regardless of source.
    if (now - _banterLastShownAt < _BANTER_GLOBAL_MIN_GAP_MS) return;

    // Per-event cooldown.
    const lastForEvent = _banterLastShownByEvent[eventKey] || 0;
    if (now - lastForEvent < cfg.cooldownMs) return;

    // Chance roll.
    if (Math.random() >= cfg.chance) return;

    const line = _banterPickLine(charId, eventKey);
    if (!line) return;

    _banterLastShownAt = now;
    _banterLastShownByEvent[eventKey] = now;

    _banterShowBubble(line);
}

// Shared gating + display logic for the item/skill-specific banks.
// Returns true if a line was shown, false otherwise (so callers can fall
// back to the generic banks when no specific line exists).
function _banterFireFromBank(bank, id, eventKeyPrefix, chance, cooldownMs) {
    const charId = STATE?.playerCharacter;
    const charBank = charId && bank[charId];
    if (!charBank || !charBank[id] || charBank[id].length === 0) return false;

    const eventKey = `${eventKeyPrefix}_${id}`;
    const now = Date.now();

    // Same global gap as generic banter: never two bubbles back-to-back.
    if (now - _banterLastShownAt < _BANTER_GLOBAL_MIN_GAP_MS) return false;

    // Per-item / per-skill cooldown (shares the runtime cooldown map).
    const lastForEvent = _banterLastShownByEvent[eventKey] || 0;
    if (now - lastForEvent < cooldownMs) return false;

    // Chance roll.
    if (Math.random() >= chance) return false;

    const entry = charBank[id][Math.floor(Math.random() * charBank[id].length)];
    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    const line = (lang === 'de' && entry.de) ? entry.de : entry.en;
    if (!line) return false;

    _banterLastShownAt = now;
    _banterLastShownByEvent[eventKey] = now;
    _banterShowBubble(line);
    return true;
}

// Call this when a specific item is used. Shows an item-specific,
// character-specific line (chance-gated). If no item-specific lines exist
// for the current character, falls back to the generic/cursed item lines
// so every item use can still produce banter. Safe to call unconditionally:
// all gating (character check, global gap, cooldowns, chance) is internal.
function triggerItemBanter(itemId, rarity) {
    if (typeof itemId !== 'string') return;
    if (_banterFireFromBank(_BANTER_ITEM_LINES, itemId, 'item', _BANTER_ITEM_CHANCE, _BANTER_ITEM_COOLDOWN_MS)) return;
    triggerBanter(rarity === 'cursed' ? 'item_used_cursed' : 'item_used_generic');
}

// Call this when a specific class skill is used. skillKey must combine the
// class/ascendency id with the active slot, e.g. 'mathmagician_active1'
// or 'markovian_active2'. No-op if no lines exist for that key.
function triggerSkillBanter(skillKey) {
    if (typeof skillKey !== 'string') return;
    _banterFireFromBank(_BANTER_SKILL_LINES, skillKey, 'skill', _BANTER_SKILL_CHANCE, _BANTER_SKILL_COOLDOWN_MS);
}

// Special-cased entry point for the "low time" warning so it only ever
// fires once per level (separate from the normal per-event cooldown,
// since levels can run long and we don't want repeats every cooldown window).
function triggerLowTimeBanterIfNeeded() {
    if (_banterLowTimeFired) return;
    if (typeof timerSecs === 'undefined' || timerSecs > 60 || timerSecs <= 0) return;

    _banterLowTimeFired = true;
    triggerBanter('low_time');
}

// Resets all banter cooldown/flag state. Call at the start of each level
// (alongside the other _reset* helpers in start-level.js).
function resetBanterState() {
    _banterLastShownByEvent = {};
    _banterLastShownAt = 0;
    _banterLowTimeFired = false;
    hideCharacterBanter();
}


//------------------------------------------------------------------------
//-------------------EVENT KEY REFERENCE------------------------------------
//------------------------------------------------------------------------
// level_start        — fired once when a level/puzzle screen opens
// mistake_single      — fired on an ordinary (unabsorbed) wrong fill
// mistake_streak       — fired when several mistakes happen close together
// mistake_absorbed    — fired when a shield/freeze/CI absorbs a mistake
// correct_streak       — fired on a long run of consecutive correct fills
// item_used_generic   — fired when a normal (non-cursed) item is used
// item_used_cursed    — fired when a cursed item is used
// lucky_tile           — fired when a lucky tile reward is claimed
// low_time              — fired once when the timer drops under 60s
// win                       — fired when the puzzle is solved
//
// Item-specific banter (triggerItemBanter):
//   item_<ITEM_DEFS id>     — e.g. item_reveal1, item_cursedRowSolve
//   Fired from _consumeItem() in js/items/inventory-use-item.js
//   Chance-gated (_BANTER_ITEM_CHANCE) with per-item cooldown.
//
// Skill-specific banter (triggerSkillBanter):
//   skill_<classId>_<slot>  — e.g. skill_mathmagician_active1,
//                             skill_markovian_active2
//   Fired from _dispatchBaseAbility / _dispatchAscendencyAbility in
//   js/classes/class-abilities.js. Chance-gated (_BANTER_SKILL_CHANCE)
//   with per-skill cooldown. Line banks live in _BANTER_ITEM_LINES and
//   _BANTER_SKILL_LINES above.
//------------------------------------------------------------------------