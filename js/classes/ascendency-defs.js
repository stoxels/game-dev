//------------------------------------------------------------------------
//-------------------ASCENDENCY CLASS DEFINITIONS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Unlocked after all 3 base class skills reach Rank 3.
// Each base class has exactly 2 ascendency options.
// Each ascendency has 2 active skills, each with 3 ranks.

const ASCENDENCY_DEFS = {

    // ── STATISTICIAN ASCENDENCIES ────────────────────────────────────────

    outlier: {
        id: 'outlier',
        parentClass: 'statistician',
        icon: '📈',
        nameEn: 'Outlier',
        nameDE: 'Ausreißer',
        descEn: 'You are not an anomaly. You are the only data point that matters.',
        descDE: 'Du bist keine Anomalie. Du bist der einzige Datenpunkt, der zählt.',
        color: '#e74c3c',
        colorLight: '#f1948a',
        archetype: 'Berserker',

        active1: {
            nameEn: 'Tail Risk',
            nameDE: 'Tail-Risiko',
            descCursorEn: 'Make a deal with the Infinite Hunger. Sacrifice your time for reveals. Every second counts. ',
            descCursorDE: 'Mache einen Handel mit dem Unendlichen Hunger. Opfere deine Zeit für Enthüllungen. Jede Sekunde zählt.',
            cooldownSeconds: 240,
            manaCost: 40,
            levels: [
                {
                    level: 1,
                    descEn: 'Make a deal with the Infinite Hunger. Sacrifice 90 seconds of your time per cell in exchange for up to 10 revealed cells. Cooldown: 4 minutes.',
                    descDE: 'Mache einen Handel mit dem Unendlichen Hunger. Opfere 90 Sekunden deiner Zeit pro Zelle im Tausch für bis zu 10 enthüllte Zellen. Abklingzeit: 4 Minuten.',
                    effect: { secondsPerCell: 90, maxCells: 10 }
                },
                {
                    level: 2,
                    descEn: 'Make a deal with the Infinite Hunger. Sacrifice 75 seconds of your time per cell in exchange for up to 15 revealed cells. Cooldown: 4 minutes.',
                    descDE: 'Mache einen Handel mit dem Unendlichen Hunger. Opfere 75 Sekunden deiner Zeit pro Zelle im Tausch für bis zu 15 enthüllte Zellen. Abklingzeit: 4 Minuten.',
                    effect: { secondsPerCell: 75, maxCells: 15 }
                },
                {
                    level: 3,
                    descEn: 'Make a deal with the Infinite Hunger. Sacrifice 60 seconds of your time per cell in exchange for up to 20 revealed cells. Cooldown: 4 minutes.',
                    descDE: 'Mache einen Handel mit dem Unendlichen Hunger. Opfere 60 Sekunden deiner Zeit pro Zelle im Tausch für bis zu 20 enthüllte Zellen. Abklingzeit: 4 Minuten.',
                    effect: { secondsPerCell: 60, maxCells: 20 }
                },
            ]
        },

        active2: {
            nameEn: 'SPEEDFORCE',
            nameDE: 'SPEEDFORCE',
            descCursorEn: 'Enter the SPEEDFORCE: Every correct fill triggers a Momentum bonus. Time passes ten times as quickly.',
            descCursorDE: 'Betrete die SPEEDFORCE: Jede korrekte Füllung löst einen Momentum-Bonus aus. Die Zeit vergeht zehn mal so schnell.',
            cooldownSeconds: 120,
            manaCost: 25,
            levels: [
                {
                    level: 1,
                    descEn: 'Enter the SPEEDFORCE. Every correct fill triggers a Momentum bonus. Any mistake is five times as severe and ends the effect. Time passes ten times as fast while in the SPEEDFORCE. Lasts for 5 seconds Cooldown: 2 minutes.',
                    descDE: 'Betrete die SPEEDFORCE: Jede korrekte Füllung löst einen Momentum-Bonus aus. Fehler verfünffachen die Strafe und beenden den Effekt. Die Zeit vergeht zehn mal so schnell solange du in der SPEEDFORCE bist. Aktiv für 5 Sekunden. Abklingzeit: 2 Minuten.',
                    effect: { duration: 5000, streakThreshold: 1 }
                },
                {
                    level: 2,
                    descEn: 'Enter the SPEEDFORCE: Every correct fill triggers a Momentum bonus. Any mistake is five times as severe and ends the effect.Time passes ten times as fast while in the SPEEDFORCE. Lasts for 10 seconds. Cooldown: 2 minutes.',
                    descDE: 'Betrete die SPEEDFORCE: Jede korrekte Füllung löst einen Momentum-Bonus aus. Fehler verfünffachen die Strafe und beenden den Effekt. Die Zeit vergeht zehn mal so schnell solange du in der SPEEDFORCE bist. Aktiv für 10 Sekunden. Abklingzeit: 2 Minuten.',
                    effect: { duration: 10000, streakThreshold: 1 }
                },
                {
                    level: 3,
                    descEn: 'Enter the SPEEDFORCE: Every correct fill triggers a Momentum bonus. Any mistake is five times as severe and ends the effect. Time passes ten times as fast while in the SPEEDFORCE.Lasts for 15 seconds. Cooldown: 2 minutes.',
                    descDE: 'Betrete die SPEEDFORCE: Jede korrekte Füllung löst einen Momentum-Bonus aus. Fehler verfünffachen die Strafe und beenden den Effekt. Die Zeit vergeht zehn mal so schnell solange du in der SPEEDFORCE bist. Aktiv für 15 Sekunden. Abklingzeit: 2 Minuten.',
                    effect: { duration: 15000, streakThreshold: 1 }
                },
            ]
        },
    },

    actuary: {
        id: 'actuary',
        parentClass: 'statistician',
        icon: '🛡️',
        nameEn: 'Actuary',
        nameDE: 'Aktuar',
        descEn: 'Risk is not something to avoid. It is something to price correctly.',
        descDE: 'Risiko ist nichts, das man vermeidet. Es ist etwas, das man richtig bewertet.',
        color: '#e67e22',
        colorLight: '#f0a500',
        archetype: 'Paladin',

        active1: {
            nameEn: 'Regression to Prior',
            nameDE: 'Regression zum Prior',
            descCursorEn: 'Correct your most recent mistakes and recover lost time. Every corrected mistake reveals correct cells.',
            descCursorDE: 'Korrigiere deine letzten Fehler und erhalte verlorene Zeit zurück. Jeder korrigierte Fehler enthüllt korrekte Zellen.',
            cooldownSeconds: 120,
            manaCost: 45,
            levels: [
                {
                    level: 1,
                    descEn: 'Correct the most recent mistake. Every corrected mistake reveals 1 correct cell. Recover 50% of the lost time. Cooldown: 2 minutes.',
                    descDE: 'Korrigiere den letzten Fehler. Jeder korrigierte Fehler enthüllt 1 korrekte Zelle. Erhalte 50% der verlorenen Zeit zurück. Abklingzeit: 2 Minuten.',
                    effect: { correctCount: 1, recoverPct: 0.5, revealCount: 1 }
                },
                {
                    level: 2,
                    descEn: 'Correct the two most recent mistakes. Every corrected mistake reveals 2 correct cells. Recover 50% of the lost time. Cooldown: 2 minutes.',
                    descDE: 'Korrigiere die letzten zwei Fehler. Jeder korrigierte Fehler enthüllt 2 korrekte Zellen. Erhalte 50% der verlorenen Zeit zurück. Abklingzeit: 2 Minuten.',
                    effect: { correctCount: 2, recoverPct: 0.5, revealCount: 2 }
                },
                {
                    level: 3,
                    descEn: 'Correct the three most recent mistakes. Every corrected mistake reveals 3 correct cells. Recover 100% of the lost time. Cooldown: 2 minutes.',
                    descDE: 'Korrigiere die letzten drei Fehler. Jeder korrigierte Fehler enthüllt 3 korrekte Zellen. Erhalte 100% der verlorenen Zeit zurück. Abklingzeit: 2 Minuten.',
                    effect: { correctCount: 3, recoverPct: 1.0, revealCount: 3 }
                },
            ]
        },

        active2: {
            nameEn: 'Significance Threshold',
            nameDE: 'Signifikanzschwelle',
            descCursorEn: 'Arm the holy shield: your next mistake is prevented and its line becomes protected.',
            descCursorDE: 'Aktiviere den heiligen Schild: Dein nächster Fehler wird verhindert und dessen Linie wird geschützt.',
            cooldownSeconds: 180,
            manaCost: 35,
            levels: [
                {
                    level: 1,
                    descEn: 'Activate to arm the shield. Your next mistake is prevented, and the entire row of that cell becomes protected, blocking one further mistake. Cooldown: 4 minutes.',
                    descDE: 'Aktiviere den Schild. Dein nächster Fehler wird verhindert und die gesamte Zeile dieser Zelle wird geschützt und blockiert einen weiteren Fehler. Abklingzeit: 4 Minuten.',
                    effect: { lines: ['row'] }
                },
                {
                    level: 2,
                    descEn: 'Activate to arm the shield. Your next mistake is prevented, and the entire row and column of that cell become protected, each blocking one further mistake. Cooldown: 4 minutes.',
                    descDE: 'Aktiviere den Schild. Dein nächster Fehler wird verhindert und die gesamte Zeile sowie Spalte dieser Zelle werden geschützt und blockieren jeweils einen weiteren Fehler. Abklingzeit: 4 Minuten.',
                    effect: { lines: ['row', 'col'] }
                },
                {
                    level: 3,
                    descEn: 'Activate to arm the shield. Your next mistake is prevented, and the entire row, column and both diagonals of that cell become protected, each blocking one further mistake. Cooldown: 4 minutes.',
                    descDE: 'Aktiviere den Schild. Dein nächster Fehler wird verhindert und die gesamte Zeile, Spalte sowie beide Diagonalen dieser Zelle werden geschützt und blockieren jeweils einen weiteren Fehler. Abklingzeit: 4 Minuten.',
                    effect: { lines: ['row', 'col', 'diagonals'] }
                },
            ]
        },
    },

    // ── MATHMAGICIAN ASCENDENCIES ─────────────────────────────────────────

    recursionist: {
        id: 'recursionist',
        parentClass: 'mathmagician',
        icon: '💀',
        nameEn: 'Recursionist',
        nameDE: 'Rekursionist',
        descEn: 'Every error contains the seed of its own correction.',
        descDE: 'Jeder Fehler enthält den Keim seiner eigenen Korrektur.',
        color: '#8e44ad',
        colorLight: '#bb8fce',
        archetype: 'Necromancer',

        active1: {
            nameEn: 'Residual',
            nameDE: 'Residual',
            descCursorEn: 'Select a mistake cell to summon a roaming skeleton - it walks up and down its column and fires revealing beams at adjacent correct cells.',
            descCursorDE: 'Klicke eine Fehlerzelle, um ein wanderndes Skelett zu beschwören - es läuft in seiner Spalte auf und ab und feuert Enthüllungs-Strahlen auf angrenzende korrekte Zellen.',
            cooldownSeconds: 120,
            manaCost: 30,
            levels: [
                {
                    level: 1,
                    descEn: 'Summon a skeleton on a mistake cell. For 20s it roams up and down its column, firing beams every 10s at adjacent unfilled correct cells. If it crosses another mistake, it can leap 2 columns away — spawning an additional skeleton (20s). Max. 2 skeletons. Cooldown: 2 minutes.',
                    descDE: 'Beschwöre ein Skelett auf einer Fehlerzelle. 20s lang wandert es in seiner Spalte auf und ab und feuert alle 10s Strahlen auf angrenzende ungefüllte korrekte Zellen. Kreuzt es einen weiteren Fehler, springt es 2 Spalten weiter — und beschwört ein zusätzliches Skelett (20s). Max. 2 Skelette. Abklingzeit: 2 Minuten.',
                    effect: { durationSecs: 20, fires: 10, maxSkeletons: 2 }
                },
                {
                    level: 2,
                    descEn: 'Summon a skeleton on a mistake cell. For 30s it roams up and down its column, firing beams every 7s at adjacent unfilled correct cells. If it crosses another mistake, it can leap 2 columns away — spawning an additional skeleton (20s). Max. 3 skeletons. Cooldown: 2 minutes.',
                    descDE: 'Beschwöre ein Skelett auf einer Fehlerzelle. 30s lang wandert es in seiner Spalte auf und ab und feuert alle 7s Strahlen auf angrenzende ungefüllte korrekte Zellen. Kreuzt es einen weiteren Fehler, springt es 2 Spalten weiter — und beschwört ein zusätzliches Skelett (20s). Max. 3 Skelette. Abklingzeit: 2 Minuten.',
                    effect: { durationSecs: 30, fires: 7, maxSkeletons: 3 }
                },
                {
                    level: 3,
                    descEn: 'Summon a skeleton on a mistake cell. For 40s it roams up and down its column, firing beams every 5s at adjacent unfilled correct cells. If it crosses another mistake, it can leap 2 columns away — spawning an additional skeleton (20s). Max. 4 skeletons. Cooldown: 2 minutes.',
                    descDE: 'Beschwöre ein Skelett auf einer Fehlerzelle. 40s lang wandert es in seiner Spalte auf und ab und feuert alle 5s Strahlen auf angrenzende ungefüllte korrekte Zellen. Kreuzt es einen weiteren Fehler, springt es 2 Spalten weiter — und beschwört ein zusätzliches Skelett (20s). Max. 4 Skelette. Abklingzeit: 2 Minuten.',
                    effect: { durationSecs: 40, fires: 5, maxSkeletons: 4 }
                },
            ]
        },

        active2: {
            nameEn: 'Degrees of Freedom',
            nameDE: 'Freiheitsgrade',
            descCursorEn: 'Raise a zombie that wanders the grid permanently, haunts a free cell and challenges you to fill or mark it correctly.',
            descCursorDE: 'Erwecke einen Zombie, der dauerhaft über das Gitter wandert, eine freie Zelle heimsucht und dich herausfordert, sie korrekt zu füllen oder zu markieren.',
            cooldownSeconds: 1800,
            manaCost: 100,
            levels: [
                {
                    level: 1,
                    descEn: 'Raise a zombie on a random free cell. It wanders the grid for the rest of the level and occasionally haunts a free cell: after 5s of standing, a 10s countdown starts — make the correct click (fill or ✕) on that cell and the zombie curses a nearby incorrect cell into a mistake cell (no penalty, aids Residual skeleton jumps). If the countdown expires, the zombie fills the cell itself — on a truly incorrect cell this counts as a real mistake. The zombie stays until the level ends. Cooldown: 30 minutes.',
                    descDE: 'Erwecke einen Zombie auf einer zufälligen freien Zelle. Er wandert für den Rest des Levels über das Gitter und heimsucht gelegentlich eine freie Zelle: Nach 5s Stehen beginnt ein 10s-Countdown — klicke die Zelle korrekt (füllen oder ✕) und der Zombie verflucht eine angrenzende falsche Zelle in eine Fehlerzelle (keine Strafe, hilft den Residual-Skelett-Sprüngen). Läuft der Countdown ab, füllt der Zombie die Zelle selbst — bei einer wirklich falschen Zelle zählt dies als echter Fehler. Der Zombie bleibt bis zum Levelende. Abklingzeit: 30 Minuten.',
                    effect: {}
                },
                {
                    level: 2,
                    descEn: 'Raise a zombie on a random free cell. It wanders the grid for the rest of the level and occasionally haunts a free cell: after 5s of standing, a 10s countdown starts — make the correct click (fill or ✕) on that cell and the zombie curses a nearby incorrect cell into a mistake cell (no penalty, aids Residual skeleton jumps). If the countdown expires, the zombie fills the cell itself — on a truly incorrect cell this counts as a real mistake. The zombie stays until the level ends. Cooldown: 30 minutes.',
                    descDE: 'Erwecke einen Zombie auf einer zufälligen freien Zelle. Er wandert für den Rest des Levels über das Gitter und heimsucht gelegentlich eine freie Zelle: Nach 5s Stehen beginnt ein 10s-Countdown — klicke die Zelle korrekt (füllen oder ✕) und der Zombie verflucht eine angrenzende falsche Zelle in eine Fehlerzelle (keine Strafe, hilft den Residual-Skelett-Sprüngen). Läuft der Countdown ab, füllt der Zombie die Zelle selbst — bei einer wirklich falschen Zelle zählt dies als echter Fehler. Der Zombie bleibt bis zum Levelende. Abklingzeit: 30 Minuten.',
                    effect: {}
                },
                {
                    level: 3,
                    descEn: 'Raise a zombie on a random free cell. It wanders the grid for the rest of the level and occasionally haunts a free cell: after 5s of standing, a 10s countdown starts — make the correct click (fill or ✕) on that cell and the zombie curses a nearby incorrect cell into a mistake cell (no penalty, aids Residual skeleton jumps). If the countdown expires, the zombie fills the cell itself — on a truly incorrect cell this counts as a real mistake. The zombie stays until the level ends. Cooldown: 30 minutes.',
                    descDE: 'Erwecke einen Zombie auf einer zufälligen freien Zelle. Er wandert für den Rest des Levels über das Gitter und heimsucht gelegentlich eine freie Zelle: Nach 5s Stehen beginnt ein 10s-Countdown — klicke die Zelle korrekt (füllen oder ✕) und der Zombie verflucht eine angrenzende falsche Zelle in eine Fehlerzelle (keine Strafe, hilft den Residual-Skelett-Sprüngen). Läuft der Countdown ab, füllt der Zombie die Zelle selbst — bei einer wirklich falschen Zelle zählt dies als echter Fehler. Der Zombie bleibt bis zum Levelende. Abklingzeit: 30 Minuten.',
                    effect: {}
                },
            ]
        },
    },

    markovian: {
        id: 'markovian',
        parentClass: 'mathmagician',
        icon: '⏳',
        nameEn: 'Markovian',
        nameDE: 'Markovianer',
        descEn: 'The future depends only on the present. So change the present.',
        descDE: 'Die Zukunft hängt nur von der Gegenwart ab. Also ändere die Gegenwart.',
        color: '#2980b9',
        colorLight: '#7fb3d3',
        archetype: 'Chronomancer',

        active1: {
            nameEn: 'State Rollback',
            nameDE: 'Zustandsrücksetzer',
            descCursorEn: 'Roll back the puzzle to a previous state, undoing fills, marks and mistakes, and rewinding the timer.',
            descCursorDE: 'Setze das Rätsel auf einen früheren Zustand zurück, wobei Füllungen, Markierungen und Fehler rückgängig gemacht werden, und spule die Zeit zurück.',
            cooldownSeconds: 420,
            manaCost: 70,
            levels: [
                {
                    level: 1,
                    descEn: 'Rewind Time by 10 seconds, undoing fills, marks and mistakes. Cooldown: 7 minutes.',
                    descDE: 'Setze die Zeit um 10 Sekunden zurück. Abklingzeit: 7 Minuten.',
                    effect: { windowSeconds: 10, rewindSeconds: 10, clearOldMistakes: false }
                },
                {
                    level: 2,
                    descEn: 'Rewind Time by 20 seconds, undoing fills, marks and mistakes. Cooldown: 7 minutes.',
                    descDE: 'Setze die Zeit um 20 Sekunden zurück, wobei Füllungen, Markierungen und Fehler rückgängig gemacht werden. Abklingzeit: 7 Minuten.',
                    effect: { windowSeconds: 20, rewindSeconds: 20, clearOldMistakes: false }
                },
                {
                    level: 3,
                    descEn: 'Rewind Time by 30 seconds, undoing fills, marks and mistakes. Cooldown: 7 minutes.',
                    descDE: 'Setze die Zeit um 30 Sekunden zurück, wobei Füllungen, Markierungen und Fehler rückgängig gemacht werden. Abklingzeit: 7 Minuten.',
                    effect: { windowSeconds: 30, rewindSeconds: 30, clearOldMistakes: true }
                },
            ]
        },

        active2: {
            nameEn: 'Transition Matrix',
            nameDE: 'Übergangsmatrix',
            descCursorEn: 'Enter Transition Mode - each correct fill may cascade to a neighbouring cell.',
            descCursorDE: 'Betrete Übergangsmodus - jede korrekte Füllung kann auf eine benachbarte Zelle übertragen werden.',
            cooldownSeconds: 300,
            manaCost: 50,
            levels: [
                {
                    level: 1,
                    descEn: 'Enter the Matrix. Each correct fill has a 25% chance to cascade to a random unfilled neighbour. Lasts for 10 seconds. Cooldown: 5 minutes.',
                    descDE: 'Betrete die Matrix. Jede korrekte Füllung hat 25% Chance, auf eine zufällige ungefüllte Nachbarzelle übertragen zu werden. Aktiv für 10 Sekunden. Abklingzeit: 5 Minuten.',
                    effect: { duration: 10000, cascadeChance: 0.25, maxDepth: 1 }
                },
                {
                    level: 2,
                    descEn: 'Enter the Matrix. Each correct fill has a 40% chance to cascade to a random unfilled neighbour. Lasts for 15 seconds. Cooldown: 5 minutes.',
                    descDE: 'Betrete die Matrix. Jede korrekte Füllung hat 40% Chance, auf eine zufällige ungefüllte Nachbarzelle übertragen zu werden. Aktiv für 15 Sekunden. Abklingzeit: 5 Minuten.',
                    effect: { duration: 15000, cascadeChance: 0.40, maxDepth: 1 }
                },
                {
                    level: 3,
                    descEn: 'Enter the Matrix. Each correct fill has a 50% chance to cascade to a random unfilled neighbour. Cascaded fills can themselves cascade once (max chain depth 2). Lasts for 20 seconds. Cooldown: 5 minutes.',
                    descDE: 'Betrete die Matrix. Jede korrekte Füllung hat 50% Chance, auf eine zufällige ungefüllte Nachbarzelle übertragen zu werden. Übertragende Füllungen können selbst einmal übertragen werden (max. Kettentiefe 2). Aktiv für 20 Sekunden. Abklingzeit: 5 Minuten.',
                    effect: { duration: 20000, cascadeChance: 0.50, maxDepth: 2 }
                },
            ]
        },
    },

    // ── PROBABILIST ASCENDENCIES ─────────────────────────────────────────

    bayesian: {
        id: 'bayesian',
        parentClass: 'probabilist',
        icon: '🧪',
        nameEn: 'Bayesian',
        nameDE: 'Bayesianer',
        descEn: 'Your prior was a guess. Your posterior is a weapon.',
        descDE: 'Dein Prior war eine Vermutung. Dein Posterior ist eine Waffe.',
        color: '#27ae60',
        colorLight: '#58d68d',
        archetype: 'Trapper',

        active1: {
            nameEn: 'Bayes Traps',
            nameDE: 'Bayes-Fallen',
            descCursorEn: 'Choose and arm a specialized trap. Place it before the fuse expires or it detonates in your hands, reducing remaining time.',
            descCursorDE: 'Wähle und aktiviere eine spezialisierte Falle. Platziere sie vor Ablauf der Zündschnur, sonst explodiert sie in deinen Händen und reduziert die verbleibende Zeit.',
            cooldownSeconds: 240,
            manaCost: 40,
            levels: [
                {
                    level: 1,
                    descEn: 'Place a Reveal Trap onto the grid before its fuse expires. After a short delay, the trap activates automatically. Reveal Traps reveal nearby correct cells in a 1-step radius. Cooldown: 4 minutes.',
                    descDE: 'Platziere eine Enthüllungsfalle auf dem Feld bevor Ablauf der Zündschnur. Nach kurzer Verzögerung aktiviert sich die Falle automatisch. Die Enthüllungsfalle deckt korrekte Zellen in einem 1-Schritt Radius auf. Abklingzeit: 4 Minuten.',
                    effect: {
                        trapCount: 1,
                        availableTraps: ['reveal']
                    }
                },
                {
                    level: 2,
                    descEn: 'Choose between Reveal Traps and Elimination Traps. Place 2 traps before the fuse expires or they detonate in your hands, reducing remaining Time. Reveal Traps reveal nearby correct cells in a 1-step radius. Elimination Traps mark incorrect empty cells horizontally and vertically up to 5 cells away. Cooldown: 4 minutes.',
                    descDE: 'Wähle zwischen Enthüllungsfallen und Eliminierungsfallen. Platziere 2 Fallen vor Ablauf der Zündschnur, sonst explodieren sie in deinen Händen und reduzieren die verbleibende Zeit. Enthüllungsfallen decken nahe korrekte Zellen in einem 1-Schritt Radius auf. Eliminierungsfallen markieren falsche leere Zellen horizontal und vertikal bis zu 5 Zellen entfernt. Abklingzeit: 4 Minuten.',
                    effect: {
                        trapCount: 2,
                        availableTraps: ['reveal', 'elimination']
                    }
                },
                {
                    level: 3,
                    descEn: 'Choose between Reveal Traps, Elimination Traps and Protection Traps. Place 3 traps before the fuse expires or they detonate in your hands, reducing remaining Time. Reveal Traps reveal nearby correct cells in a 1-step radius. Elimination Traps mark incorrect empty cells horizontally and vertically up to 5 cells away. Protection Trap prevents mistake penalties on its row and column. Cooldown: 4 minutes.',
                    descDE: 'Wähle zwischen Enthüllungsfallen, Eliminierungsfallen und Schutzfallen. Platziere 3 Fallen vor Ablauf der Zündschnur, sonst explodieren sie in deinen Händen und reduzieren die verbleibende Zeit. Enthüllungsfallen decken nahe korrekte Zellen in einem 1-Schritt radius auf. Eliminierungsfallen markieren falsche leere Zellen horizontal und vertikal bis zu 5 Zellen entfernt. Schutzfallen verhindern Fehlerstrafen in ihrer Zeile und Spalte. Abklingzeit: 4 Minuten.',
                    effect: {
                        trapCount: 3,
                        availableTraps: ['reveal', 'elimination', 'protection']
                    }
                },
            ]
        },

        active2: {
            nameEn: 'Type I Error Shield',
            nameDE: 'Typ-I-Fehlerschutz',
            descCursorEn: 'Seeds random empty cells with invisible shields - incorrectly revealing a shielded cell will protect you from the mistake.',
            descCursorDE: 'Versieht zufällige leere Zellen mit unsichtbaren Schilden, die dich vor Fehlern schützen werden.',
            cooldownSeconds: 180,
            manaCost: 35,
            levels: [
                {
                    level: 1,
                    descEn: 'Seed 5 empty cells with shields. Clicking one auto-marks ✕ instead of a mistake. Cooldown: 3 minutes.',
                    descDE: '5 leere Zellen werden mit Schilden versehen. Klicken markiert ✕ statt Fehler. Abklingzeit: 3 Minuten.',
                    effect: { seedCount: 5, bonusReveal: false }
                },
                {
                    level: 2,
                    descEn: 'Seed 10 empty cells with shields. Cooldown: 3 minutes.',
                    descDE: '10 leere Zellen werden mit Schilden versehen. Abklingzeit: 3 Minuten.',
                    effect: { seedCount: 10, bonusReveal: false }
                },
                {
                    level: 3,
                    descEn: 'Seed 15 cells. When a shield triggers, also reveals 1 correct cell in the same row or column. Cooldown: 3 minutes.',
                    descDE: '15 Zellen werden versehen. Bei Auslösung wird 1 korrekte Zelle in derselben Zeile oder Spalte enthüllt. Abklingzeit: 3 Minuten.',
                    effect: { seedCount: 15, bonusReveal: true }
                },
            ]
        },
    },

    // done
    random_walker: {
        id: 'random_walker',
        parentClass: 'probabilist',
        icon: '🐻',
        nameEn: 'Random Walker',
        nameDE: 'Zufallswanderer',
        descEn: 'Not all who wander are lost. Some are converging.',
        descDE: 'Nicht alle, die wandern, sind verloren. Manche konvergieren.',
        color: '#16a085',
        colorLight: '#48c9b0',
        archetype: 'Beastmaster',

        active1: {
            nameEn: 'Brownian Motion',
            nameDE: 'Brownsche Bewegung',
            descCursorEn: 'Calls Browney, your loyal companion, who walks through the grid following a Brownian Motion path.',
            descCursorDE: 'Ruft Browney, deinen treuen Begleiter, der durch das Puzzle wandert. Browney folgt dem Pfad einer Brownschen Bewegung.',
            cooldownSeconds: 600,
            manaCost: 100,
            levels: [
                {
                    level: 1,
                    descEn: 'Browney walks through the grid every 3.5 seconds and reveals all correct cells along his path. Doing a mistake cuts Browney\'s walk short by 15 seconds. Cooldown: 10 minutes. ',
                    descDE: 'Browney wandert durch das Puzzle alle 3,5 Sekunden und enthüllt alle richtigen Zellen entlang seines Pfades. Ein Fehler verkürzt Browneys Wanderung um 15 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { paths: 1, rank: 1 }
                },
                {
                    level: 2,
                    descEn: 'Browney walks through the grid every 2.8 seconds and reveals all correct cells along his path. Doing a mistake cuts Browney\'s walk short by 10 seconds. Cooldown: 10 minutes. ',
                    descDE: 'Browney wandert durch das Puzzle alle 2,8 Sekunden und enthüllt alle richtigen Zellen entlang seines Pfades. Ein Fehler verkürzt Browneys Wanderung um 10 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { paths: 1, rank: 2 }
                },
                {
                    level: 3,
                    descEn: 'Browney and his brother Wiener walk through the grid every 2.1 seconds and reveal all correct cells along their paths. Doing a mistake cuts each of their walks short by 5 seconds. Cooldown: 10 minutes.',
                    descDE: 'Browney und sein Bruder Wiener wandern alle 2,1 Sekunden durch das Puzzle und enthüllen alle richtigen Zellen entlang ihrer Pfade. Ein Fehler verkürzt die Wanderung von Browney und Wiener jeweils um 5 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { paths: 2, rank: 3 }
                },
            ]
        },

        active2: {
            nameEn: 'Drifter',
            nameDE: 'Drifter',
            descCursorEn: 'Calls Drifter, your loyal companion. Drifter will walk through the grid and can be fed to increase his speed and duration.',
            descCursorDE: 'Ruft Drifter, deinen treuen Begleiter, um sich durch das Puzzle zu bewegen. Drifter kann gefüttert werden, um seine Geschwindigkeit und Dauer zu erhöhen.',
            cooldownSeconds: 300,
            manaCost: 45,
            levels: [
                {
                    level: 1,
                    descEn: 'Drifter lasts for 15 seconds. He will walk through the grid and periodically reveal or mark cells. Manually revealing correct cells will feed Drifter and increase his duration. When the timer runs out Drifter will leave behind a present for you. Mistakes reduce his remaining time by 5 seconds. Cooldown: 10 minutes.',
                    descDE: 'Drifter bleibt für 15 Sekunden. Er läuft durch das Gitter und deckt Zellen auf oder markiert sie. Manuelles Aufdecken von richtigen Zellen füttert Drifter und verlängert die Dauer. Wenn die Zeit abläuft wird Drifter ein Geschenk hinterlassen. Fehler reduzieren seine verbleibende Zeit um 5 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { duration: 15000, interval: 10000, smartTarget: false, finalHowl: true }
                },
                {
                    level: 2,
                    descEn: 'Drifter lasts for 20 seconds. He will walk through the grid and periodically reveal or mark cells. Manually revealing correct cells will feed Drifter and increase his duration. When the timer runs out Drifter will leave behind a present for you. Mistakes reduce his remaining time by 5 seconds. Cooldown: 10 minutes.',
                    descDE: 'Drifter bleibt für 20 Sekunden. Er läuft durch das Gitter und deckt Zellen auf oder markiert sie. Manuelles Aufdecken von richtigen Zellen füttert Drifter und verlängert die Dauer. Wenn die Zeit abläuft wird Drifter ein Geschenk hinterlassen. Fehler reduzieren seine verbleibende Zeit um 5 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { duration: 20000, interval: 10000, smartTarget: true, finalHowl: true }
                },
                {
                    level: 3,
                    descEn: 'Drifter lasts for 25 seconds. He will walk through the grid and periodically reveal or mark cells. Manually revealing correct cells will feed Drifter and increase his duration. When the timer runs out Drifter will leave behind a present for you. Mistakes reduce his remaining time by 5 seconds. Cooldown: 10 minutes.',
                    descDE: 'Drifter bleibt für 25 Sekunden. Er läuft durch das Gitter und deckt Zellen auf oder markiert sie. Manuelles Aufdecken von richtigen Zellen füttert Drifter und verlängert die Dauer. Wenn die Zeit abläuft wird Drifter ein Geschenk hinterlassen. Fehler reduzieren seine verbleibende Zeit um 5 Sekunden. Abklingzeit: 10 Minuten.',
                    effect: { duration: 25000, interval: 10000, smartTarget: true, finalHowl: true }
                },
            ]
        },
    },
};


//------------------------------------------------------------------------
//-------------------ASCENDENCY SPELL ICONS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Per-skill locker icons for the ascendency-upgrade screen.
// Keyed by ascendencyId -> 'active1' | 'active2'.
const ASCENDENCY_SPELL_ICONS = {
    outlier: { active1: '🩸', active2: '⚡' },   // Tail Risk / SPEEDFORCE
    actuary: { active1: '⏱️', active2: '🚧' },   // Regression to Prior / Significance Threshold
    recursionist: { active1: '🗿', active2: '♾️' },   // Residual / Degrees of Freedom
    markovian: { active1: '⏪', active2: '🔗' },   // State Rollback / Transition Matrix
    bayesian: { active1: '🪤', active2: '🔰' },   // Bayes Traps / Type I Error Shield
    random_walker: { active1: '🐾', active2: '🌬️' },   // Brownian Motion / Drifter
};