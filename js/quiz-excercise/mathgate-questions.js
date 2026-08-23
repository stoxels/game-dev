


// Probability Gate Question Pool


const MATH_GATE_POOLS = {

    // WORLD 1
    // 
    1: [

        //1. ERGEBNISMENGE (Sample Space)

        {
            q: 'A six-sided fair die is rolled once. How many elements does the sample space Ω contain?',
            qDE: 'Ein sechsseitiger fairer Würfel wird einmal geworfen. Wie viele Elemente enthält die Ergebnismenge Ω?',
            answer: 6, tolerance: 0, unit: 'elements',
            hintEn: 'Ω = {1, 2, 3, 4, 5, 6}',
            hintDE: 'Ω = {1, 2, 3, 4, 5, 6}',
            explain: 'A single die roll can land on any of its 6 faces, and each face is a distinct outcome, so Ω = {1,2,3,4,5,6} has 6 elements.',
            explainDE: 'Ein einzelner Würfelwurf kann auf jeder der 6 Seiten landen, jede Seite ist ein eigenes Ergebnis, also hat Ω = {1,2,3,4,5,6} 6 Elemente.'
        },
        {
            q: 'A fair coin is flipped three times. How many elements are in the sample space?',
            qDE: 'Eine faire Münze wird dreimal geworfen. Wie viele Elemente enthält die Ergebnismenge?',
            answer: 8, tolerance: 0, unit: 'elements',
            hintEn: 'Each flip has 2 outcomes, head or tails.',
            hintDE: 'Jeder Wurf hat 2 mögliche Ergebnisse, Kopf oder Zahl.',
            explain: 'Each of the 3 flips independently has 2 outcomes, so the total count is 2 × 2 × 2 = 8 possible sequences.',
            explainDE: 'Jeder der 3 Würfe hat unabhängig 2 Ergebnisse, also insgesamt 2 × 2 × 2 = 8 mögliche Folgen.'
        },
        {
            q: 'A fair coin is flipped twice. How many outcomes are in the sample space?',
            qDE: 'Eine faire Münze wird zweimal geworfen. Wie viele Ergebnisse enthält die Ergebnismenge?',
            answer: 4, tolerance: 0, unit: 'outcomes',
            hintEn: 'Each flip has 2 outcomes, head or tails.',
            hintDE: 'Jeder Wurf hat 2 mögliche Ergebnisse, Kopf oder Zahl.',
            explain: 'Two independent flips, each with 2 outcomes, give 2 × 2 = 4 total sequences: HH, HT, TH, TT.',
            explainDE: 'Zwei unabhängige Würfe mit je 2 Ergebnissen ergeben 2 × 2 = 4 Folgen: KK, KZ, ZK, ZZ.'
        },
        {
            q: 'Two regular fair dice are rolled simultaneously. How many elements does the sample space Ω contain?',
            qDE: 'Zwei reguläre faire Würfel werden gleichzeitig geworfen. Wie viele Elemente enthält die Ergebnismenge Ω?',
            answer: 36, tolerance: 0, unit: 'elements',
            hintEn: 'Count the amount of ordered pairs (i, j) with i, j ∈ {1,…,6}.',
            hintDE: 'Zähle die geordneten Paare (i, j) mit i, j ∈ {1,…,6}.',
            explain: 'Each die independently shows one of 6 faces, so the number of ordered pairs (die 1, die 2) is 6 × 6 = 36.',
            explainDE: 'Jeder Würfel zeigt unabhängig eine von 6 Seiten, also gibt es 6 × 6 = 36 geordnete Paare (Würfel 1, Würfel 2).'
        },

        // ── 2. EREIGNIS (Event) ──────────────────────────────────────────────────

        {
            q: 'A fair die is rolled. Event A = "even number". How many elementary outcomes does A contain?',
            qDE: 'Ein fairer Würfel wird geworfen. Ereignis A = „gerade Zahl". Wie viele Elementarereignisse enthält A?',
            answer: 3, tolerance: 0, unit: 'outcomes',
            hintEn: 'A = {2, 4, 6}',
            hintDE: 'A = {2, 4, 6}',
            explain: 'Out of the six faces {1,...,6}, exactly the even ones {2, 4, 6} belong to A — that\'s 3 outcomes.',
            explainDE: 'Von den sechs Seiten {1,...,6} gehören genau die geraden {2, 4, 6} zu A — das sind 3 Ergebnisse.'
        },
        {
            q: 'A fair die is rolled. Event B = "number greater than 4". What is P(B)? Enter the numerator of the occurring fraction over 6.',
            qDE: 'Ein fairer Würfel wird geworfen. Ereignis B = „Zahl größer als 4". Was ist P(B)? Gib den Zähler des Bruches über 6 ein.',
            answer: 2, tolerance: 0, unit: '/ 6',
            hintEn: 'B = {5, 6}',
            hintDE: 'B = {5, 6}',
            explain: 'The numbers greater than 4 on a die are 5 and 6, so B contains exactly 2 outcomes out of 6.',
            explainDE: 'Die Zahlen größer als 4 auf einem Würfel sind 5 und 6, also enthält B genau 2 von 6 Ergebnissen.'
        },
        {
            q: 'A card is drawn from a standard 52-card deck. Event B = "Drawn card is Heart". What is P(B)? Enter the numerator of the occurring fraction over 52.',
            qDE: 'Eine Karte wird aus einem Standarddeck mit 52 Karten gezogen. Ereignis B = „gezogene Karte ist Herz". Was ist P(B)? Gib den Zähler des Bruches über 52 ein.',
            answer: 13, tolerance: 0, unit: 'cards',
            hintEn: 'A standard deck has 4 suits of 13 cards each.',
            hintDE: 'Ein Standarddeck hat 4 Farben mit je 13 Karten.',
            explain: 'A standard deck splits evenly into 4 suits of 13 cards each, and Hearts is one of those suits, so there are 13 favourable cards.',
            explainDE: 'Ein Standarddeck teilt sich gleichmäßig in 4 Farben zu je 13 Karten auf, und Herz ist eine dieser Farben, also gibt es 13 günstige Karten.'
        },
        {
            q: 'A bag has 3 red and 7 blue balls. What is the probability of drawing a red ball? Enter as a percentage.',
            qDE: 'Ein Beutel enthält 3 rote und 7 blaue Bälle. Was ist die Wahrscheinlichkeit, einen roten Ball zu ziehen? Gib als Prozentzahl ein.',
            answer: 30, tolerance: 0, unit: '%',
            hintEn: 'In total there are 10 balls in the bag.',
            hintDE: 'Insgesamt sind 10 Bälle in dem Beutel.',
            explain: 'There are 3 red balls out of 10 total, so P(red) = 3/10 = 0.3, which is 30%.',
            explainDE: 'Es gibt 3 rote Bälle von insgesamt 10, also P(rot) = 3/10 = 0,3, das entspricht 30%.'
        },

        // ── 3. ZUFALLSEXPERIMENT (Random Experiment) ────────────────────────────

        {
            q: 'A spinner has 5 equally sized sectors. Two spins are performed. How many possible outcomes are there?',
            qDE: 'Ein Glücksrad hat 5 gleich große Felder. Es wird zweimal gedreht. Wie viele mögliche Ergebnisse gibt es?',
            answer: 25, tolerance: 0, unit: 'outcomes',
            hintEn: 'Each spin has 5 different outcomes.',
            hintDE: 'Jede Drehung hat 5 Möglichkeiten.',
            explain: 'Each of the 2 independent spins has 5 possible results, giving 5 × 5 = 25 combined outcomes.',
            explainDE: 'Jede der 2 unabhängigen Drehungen hat 5 mögliche Ergebnisse, also insgesamt 5 × 5 = 25 Kombinationen.'
        },
        {
            q: 'A random experiment has sample space Ω = {a, b, c, d}. How many elements does Pot(Ω) have?',
            qDE: 'Ein Zufallsexperiment hat die Ergebnismenge Ω = {a, b, c, d}. Wie viele Elemente hat Pot(Ω)?',
            answer: 16, tolerance: 0, unit: 'subsets',
            hintEn: 'A set with n elements has 2ⁿ subsets.',
            hintDE: 'Eine Menge mit n Elementen hat 2ⁿ Teilmengen.',
            explain: 'Ω has 4 elements, and a set with n elements always has 2ⁿ subsets, so the power set has 2⁴ = 16 elements.',
            explainDE: 'Ω hat 4 Elemente, und eine Menge mit n Elementen hat immer 2ⁿ Teilmengen, also hat die Potenzmenge 2⁴ = 16 Elemente.'
        },

        // ── 4. DISJUNKTE EREIGNISSE (Mutually Exclusive Events) ─────────────────

        {
            q: 'P(A) = 0.3 and P(B) = 0.5. A and B are disjoint. What is P(A ∪ B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,3 und P(B) = 0,5. A und B sind disjunkt. Was ist P(A ∪ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'P(A ∪ B) = P(A) + P(B) for disjoint events',
            hintDE: 'P(A ∪ B) = P(A) + P(B) für disjunkte Ereignisse',
            explain: 'Since A and B never overlap, P(A ∩ B) = 0, so P(A ∪ B) simplifies to P(A) + P(B) = 0.3 + 0.5 = 0.8.',
            explainDE: 'Da sich A und B nie überschneiden, ist P(A ∩ B) = 0, also vereinfacht sich P(A ∪ B) zu P(A) + P(B) = 0,3 + 0,5 = 0,8.'
        },
        {
            q: 'A and B are disjoint and P(A ∪ B) = 0.7. If P(A) = 0.4, what is P(B)? Round to 3 decimal places.',
            qDE: 'A und B sind disjunkt und P(A ∪ B) = 0,7. Falls P(A) = 0,4, was ist P(B)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'P(B) = P(A ∪ B) − P(A) for disjoint events',
            hintDE: 'P(B) = P(A ∪ B) − P(A) für disjunkte Ereignisse',
            explain: 'For disjoint events P(A ∪ B) = P(A) + P(B), so rearranging gives P(B) = 0.7 − 0.4 = 0.3.',
            explainDE: 'Für disjunkte Ereignisse gilt P(A ∪ B) = P(A) + P(B), umgestellt ergibt sich P(B) = 0,7 − 0,4 = 0,3.'
        },
        {
            q: 'If A and B are disjoint, what is P(A ∩ B)?',
            qDE: 'Wenn A und B disjunkt sind, was ist P(A ∩ B)?',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Disjoint means A ∩ B = ∅.',
            hintDE: 'Disjunkt bedeutet A ∩ B = ∅',
            explain: 'Disjoint means A and B share no outcomes, so A ∩ B is the empty set, which always has probability 0.',
            explainDE: 'Disjunkt bedeutet, dass A und B keine gemeinsamen Ergebnisse haben, also ist A ∩ B die leere Menge mit Wahrscheinlichkeit 0.'
        },

        // ── 5. EREIGNISALGEBRA / POTENZMENGE (Event Algebra / Power Set) ─────────

        {
            q: 'Ω = {1, 2, 3}. How many elements does the power set Pot(Ω) contain?',
            qDE: 'Ω = {1, 2, 3}. Wie viele Elemente enthält die Potenzmenge Pot(Ω)?',
            answer: 8, tolerance: 0, unit: 'elements',
            hintEn: 'The power set contains all possible subsets.',
            hintDE: 'Die Potenzmenge enthält alle möglichen Teilmengen.',
            explain: 'Ω has 3 elements, and a set with n elements has 2ⁿ subsets, so Pot(Ω) has 2³ = 8 elements.',
            explainDE: 'Ω hat 3 Elemente, eine Menge mit n Elementen hat 2ⁿ Teilmengen, also hat Pot(Ω) 2³ = 8 Elemente.'
        },
        {
            q: 'Ω = {H, T} (coin flip). How many events does the full event algebra contain?',
            qDE: 'Ω = {K, Z} (Münzwurf). Wie viele Ereignisse enthält die vollständige Ereignisalgebra?',
            answer: 4, tolerance: 0, unit: 'events',
            hintEn: 'Pot(Ω) = {∅, {H}, {T}, {H,T}}',
            hintDE: 'Pot(Ω) = {∅, {K}, {Z}, {K,Z}}',
            explain: 'The full event algebra is the power set of Ω. With 2 elements, Ω has 2² = 4 subsets: ∅, {H}, {T}, {H,T}.',
            explainDE: 'Die vollständige Ereignisalgebra ist die Potenzmenge von Ω. Bei 2 Elementen hat Ω 2² = 4 Teilmengen: ∅, {K}, {Z}, {K,Z}.'
        },

        // ── 6. ELEMENTAREREIGNIS (Elementary Event) ──────────────────────────────

        {
            q: 'A fair six-sided die is rolled. How many elementary events does the sample space contain?',
            qDE: 'Ein fairer sechsseitiger Würfel wird geworfen. Wie viele Elementarereignisse enthält die Ergebnismenge?',
            answer: 6, tolerance: 0, unit: 'elementary events',
            hintEn: 'Each face {1}, {2}, …, {6} is one elementary event.',
            hintDE: 'Jede Seite {1}, {2}, …, {6} ist ein Elementarereignis.',
            explain: 'Each single face of the die {1}, {2}, ..., {6} is its own elementary event, giving 6 in total.',
            explainDE: 'Jede einzelne Seite des Würfels {1}, {2}, ..., {6} ist ein eigenes Elementarereignis, also 6 insgesamt.'
        },
        {
            q: 'In a Laplace experiment with 8 equally likely elementary events, what is the probability of each elementary event? Round to 3 decimal places.',
            qDE: 'Betrachte ein Laplace-Experiment mit 8 gleich wahrscheinlichen Elementarereignissen. Was ist die Wahrscheinlichkeit jedes Elementarereignisses? Runde auf 3 Nachkommastellen.',
            answer: 0.125, tolerance: 0.001, unit: '',
            hintEn: 'In a Laplace experiment the probability measure is the discrete uniform distribution.',
            hintDE: 'In einem Laplace-Experiment ist das Wahrscheinlichkeitsmaß die diskrete Gleichverteilung.',
            explain: 'In a Laplace experiment all outcomes share the probability equally, so with 8 outcomes each gets 1/8 = 0.125.',
            explainDE: 'In einem Laplace-Experiment teilen sich alle Ergebnisse die Wahrscheinlichkeit gleichmäßig, bei 8 Ergebnissen also je 1/8 = 0,125.'
        },

        // ── 7. SCHNITT UND VEREINIGUNG (Intersection and Union) ──────────────────

        {
            q: 'P(A) = 0.5, P(B) = 0.4, P(A ∩ B) = 0.2. What is P(A ∪ B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,5, P(B) = 0,4, P(A ∩ B) = 0,2. Was ist P(A ∪ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.7, tolerance: 0.001, unit: '',
            hintEn: 'Inclusion-exclusion formula: P(A ∪ B) = P(A) + P(B) − P(A ∩ B).',
            hintDE: 'Siebformel: P(A ∪ B) = P(A) + P(B) − P(A ∩ B).',
            explain: 'Using inclusion-exclusion: P(A ∪ B) = 0.5 + 0.4 − 0.2 = 0.7 — the overlap is subtracted once so it isn\'t double-counted.',
            explainDE: 'Mit der Siebformel: P(A ∪ B) = 0,5 + 0,4 − 0,2 = 0,7 — die Überlappung wird einmal abgezogen, damit sie nicht doppelt gezählt wird.'
        },
        {
            q: 'P(A ∪ B) = 0.8, P(A) = 0.5, P(B) = 0.6. What is P(A ∩ B)? Round to 3 decimal places.',
            qDE: 'P(A ∪ B) = 0,8, P(A) = 0,5, P(B) = 0,6. Was ist P(A ∩ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'Rearrange: P(A ∩ B) = P(A) + P(B) − P(A ∪ B).',
            hintDE: 'Umstellen: P(A ∩ B) = P(A) + P(B) − P(A ∪ B).',
            explain: 'Rearranging inclusion-exclusion gives P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = 0.5 + 0.6 − 0.8 = 0.3.',
            explainDE: 'Umgestellt ergibt sich P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = 0,5 + 0,6 − 0,8 = 0,3.'
        },
        {
            q: 'A fair six-sided die is rolled. A = {1,2,3}, B = {3,4,5}. How many elements are in A ∩ B?',
            qDE: 'Ein fairer sechsseitiger Würfel wird geworfen. A = {1,2,3}, B = {3,4,5}. Wie viele Elemente enthält A ∩ B?',
            answer: 1, tolerance: 0, unit: 'elements',
            hintEn: 'Count the amount of same elements in both sets.',
            hintDE: 'Zähle die Anzahl der Elemente, die in beiden Mengen vorkommen.',
            explain: 'Comparing A = {1,2,3} and B = {3,4,5}, the only value appearing in both sets is 3, so |A ∩ B| = 1.',
            explainDE: 'Vergleicht man A = {1,2,3} und B = {3,4,5}, kommt nur der Wert 3 in beiden Mengen vor, also |A ∩ B| = 1.'
        },

        // ── 8. KOMPLEMENT (Complement) ───────────────────────────────────────────

        {
            q: 'P(A) = 0.35. What is P(Aᶜ)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,35. Was ist P(Aᶜ)? Runde auf 3 Nachkommastellen.',
            answer: 0.65, tolerance: 0.001, unit: '',
            hintEn: 'P(Aᶜ) = 1 − P(A)',
            hintDE: 'P(Aᶜ) = 1 − P(A)',
            explain: 'A and Aᶜ together cover all of Ω, so their probabilities sum to 1: P(Aᶜ) = 1 − 0.35 = 0.65.',
            explainDE: 'A und Aᶜ ergeben zusammen ganz Ω, ihre Wahrscheinlichkeiten summieren sich zu 1: P(Aᶜ) = 1 − 0,35 = 0,65.'
        },
        {
            q: 'P(Aᶜ) = 0.72. What is P(A)? Round to 3 decimal places.',
            qDE: 'P(Aᶜ) = 0,72. Was ist P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.28, tolerance: 0.001, unit: '',
            hintEn: 'P(A) = 1 − P(Aᶜ)',
            hintDE: 'P(A) = 1 − P(Aᶜ)',
            explain: 'Since P(A) + P(Aᶜ) = 1, we get P(A) = 1 − 0.72 = 0.28.',
            explainDE: 'Da P(A) + P(Aᶜ) = 1 gilt, folgt P(A) = 1 − 0,72 = 0,28.'
        },
        {
            q: 'A fair six-sided die is rolled. A = {1,2,3,4}. How many elements does Aᶜ contain?',
            qDE: 'Ein fairer sechsseitiger Würfel wird geworfen. A = {1,2,3,4}. Wie viele Elemente enthält Aᶜ?',
            answer: 2, tolerance: 0, unit: 'elements',
            hintEn: 'Which elements of Ω are not in A?',
            hintDE: 'Welche Elemente von Ω sind nicht in A?',
            explain: 'Ω = {1,...,6} has 6 elements and A = {1,2,3,4} has 4 of them, so Aᶜ = {5,6} contains the remaining 2.',
            explainDE: 'Ω = {1,...,6} hat 6 Elemente, A = {1,2,3,4} enthält 4 davon, also enthält Aᶜ = {5,6} die restlichen 2.'
        },
        {
            q: 'P(A) = 0.6. What is P(Aᶜ)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,6. Was ist P(Aᶜ)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'The complement rule: P(Aᶜ) = 1 − P(A).',
            hintDE: 'Komplementregel: P(Aᶜ) = 1 − P(A).',
            explain: 'By the complement rule, P(Aᶜ) = 1 − P(A) = 1 − 0.6 = 0.4.',
            explainDE: 'Nach der Komplementregel gilt P(Aᶜ) = 1 − P(A) = 1 − 0,6 = 0,4.'
        },

        // ── 9. DE MORGAN REGELN ──────────────────────────────────────────────────

        {
            q: 'By De Morgan\'s law: (A ∪ B)ᶜ = Aᶜ __ Bᶜ. Enter 1 for ∪ or 2 for ∩.',
            qDE: 'Nach der De-Morgan-Regel gilt: (A ∪ B)ᶜ = Aᶜ __ Bᶜ. Gib 1 für ∪ oder 2 für ∩ ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'The complement of a union is an intersection.',
            hintDE: 'Das Komplement einer Vereinigung ist ein Schnitt.',
            explain: '"Not (A or B)" means neither happened, i.e. "not A AND not B" — so the union\'s complement turns into an intersection: Aᶜ ∩ Bᶜ.',
            explainDE: '„Nicht (A oder B)” bedeutet, dass keines von beiden eintrat, also „nicht A UND nicht B” — das Komplement einer Vereinigung wird so zu einem Schnitt: Aᶜ ∩ Bᶜ.'
        },
        {
            q: 'P(Aᶜ) = 0.3, P(Bᶜ) = 0.4, P(Aᶜ ∩ Bᶜ) = 0.1. By De Morgan, what is P((A ∪ B)ᶜ)? Round to 3 decimal places.',
            qDE: 'P(Aᶜ) = 0,3, P(Bᶜ) = 0,4, P(Aᶜ ∩ Bᶜ) = 0,1. Was ist P((A ∪ B)ᶜ) gemäß De Morgan? Runde auf 3 Nachkommastellen.',
            answer: 0.1, tolerance: 0.001, unit: '',
            hintEn: '(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ, so P((A ∪ B)ᶜ) = P(Aᶜ ∩ Bᶜ)',
            hintDE: '(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ, also P((A ∪ B)ᶜ) = P(Aᶜ ∩ Bᶜ)',
            explain: 'By De Morgan, (A ∪ B)ᶜ equals Aᶜ ∩ Bᶜ exactly, so its probability is simply the given P(Aᶜ ∩ Bᶜ) = 0.1.',
            explainDE: 'Nach De Morgan ist (A ∪ B)ᶜ genau gleich Aᶜ ∩ Bᶜ, also ist die Wahrscheinlichkeit einfach das gegebene P(Aᶜ ∩ Bᶜ) = 0,1.'
        },
        {
            q: 'P(A ∩ B) = 0.2. By De Morgan, what is P((Aᶜ ∪ Bᶜ)ᶜ)? Round to 3 decimal places.',
            qDE: 'P(A ∩ B) = 0,2. Nach De Morgan: Was ist P((Aᶜ ∪ Bᶜ)ᶜ)? Runde auf 3 Nachkommastellen.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: '(Aᶜ ∪ Bᶜ)ᶜ = A ∩ B by De Morgan.',
            hintDE: '(Aᶜ ∪ Bᶜ)ᶜ = A ∩ B nach De Morgan.',
            explain: 'By De Morgan, (Aᶜ ∪ Bᶜ)ᶜ simplifies back to A ∩ B, so its probability is directly the given P(A ∩ B) = 0.2.',
            explainDE: 'Nach De Morgan vereinfacht sich (Aᶜ ∪ Bᶜ)ᶜ wieder zu A ∩ B, also ist die Wahrscheinlichkeit direkt das gegebene P(A ∩ B) = 0,2.'
        },

        // ── 10. DISTRIBUTIVGESETZ (Distributive Law) ─────────────────────────────

        {
            q: 'Which law gives A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)? Enter 1 for distributive law, 2 for De Morgan or 3 for the law of large numbers.',
            qDE: 'Welches Gesetz liefert A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)? Gib 1 für Distributivgesetz, 2 für De Morgan oder 3 für das Gesetz großer Zahlen ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'The distributive law: A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C).',
            hintDE: 'Das Distributivgesetz: A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C).',
            explain: 'This identity — distributing ∩ over ∪ — is exactly the distributive law for set operations, analogous to multiplication distributing over addition.',
            explainDE: 'Diese Identität — Verteilen von ∩ über ∪ — ist genau das Distributivgesetz für Mengenoperationen, analog zur Multiplikation, die sich über die Addition verteilt.'
        },
        {
            q: 'P(A ∩ B) = 0.1, P(A ∩ C) = 0.2, and (A ∩ B) and (A ∩ C) are disjoint. What is P(A ∩ (B ∪ C))? Round to 3 decimal places.',
            qDE: 'P(A ∩ B) = 0,1, P(A ∩ C) = 0,2, und (A ∩ B) und (A ∩ C) sind disjunkt. Was ist P(A ∩ (B ∪ C))? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C).',
            hintDE: 'A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)',
            explain: 'By the distributive law, A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C). Since these two pieces are disjoint, their probabilities just add: 0.1 + 0.2 = 0.3.',
            explainDE: 'Nach dem Distributivgesetz gilt A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C). Da diese beiden Teile disjunkt sind, addieren sich ihre Wahrscheinlichkeiten einfach: 0,1 + 0,2 = 0,3.'
        },
        {
            q: 'Is A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C) true or false? Enter 1 for true, 0 for false.',
            qDE: 'Ist A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C) wahr oder falsch? Gib 1 für wahr, 0 für falsch ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Yes — ∪ distributes over ∩, just as ∩ distributes over ∪.',
            hintDE: 'Ja — ∪ ist distributiv über ∩, genau wie ∩ über ∪.',
            explain: 'The distributive law works in both directions: ∪ distributes over ∩ just as ∩ distributes over ∪, so this identity is true.',
            explainDE: 'Das Distributivgesetz gilt in beide Richtungen: ∪ verteilt sich über ∩ genau wie ∩ über ∪, also ist diese Identität wahr.'
        },

        // ── 11. WAHRSCHEINLICHKEITSMASS (Probability Measure) ────────────────────

        {
            q: 'A probability measure P must satisfy P(Ω) = ?',
            qDE: 'Ein Wahrscheinlichkeitsmaß P muss P(Ω) = ? erfüllen.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Kolmogorov axiom.',
            hintDE: 'Kolmogorov-Axiom.',
            explain: 'Ω contains every possible outcome, so something in Ω always happens — Kolmogorov\'s axioms require P(Ω) = 1.',
            explainDE: 'Ω enthält alle möglichen Ergebnisse, also tritt immer etwas aus Ω ein — die Kolmogorov-Axiome fordern P(Ω) = 1.'
        },
        {
            q: 'Events A₁, A₂, A₃ are pairwise disjoint with P(A₁) = 0.25, P(A₂) = 0.55, P(A₃) = 0.1. What is P(A₁ ∪ A₂ ∪ A₃)? Round to 3 decimal places.',
            qDE: 'Ereignisse A₁, A₂, A₃ sind paarweise disjunkt mit P(A₁) = 0,25, P(A₂) = 0,55, P(A₃) = 0,1. Was ist P(A₁ ∪ A₂ ∪ A₃)? Runde auf 3 Nachkommastellen.',
            answer: 0.9, tolerance: 0.001, unit: '',
            hintEn: 'σ-additivity.',
            hintDE: 'σ-Additivität.',
            explain: 'Since all three events are pairwise disjoint, σ-additivity lets us simply add: 0.25 + 0.55 + 0.1 = 0.9.',
            explainDE: 'Da alle drei Ereignisse paarweise disjunkt sind, erlaubt die σ-Additivität einfaches Addieren: 0,25 + 0,55 + 0,1 = 0,9.'
        },
        {
            q: 'Which value CANNOT be a valid probability? Enter 1 for 0, 2 for −0.1, 3 for 0.5, or 4 for 1.',
            qDE: 'Welcher Wert kann KEINE gültige Wahrscheinlichkeit sein? Gib 1 für 0, 2 für −0,1, 3 für 0,5 oder 4 für 1 ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Probabilities must satisfy 0 ≤ P(A) ≤ 1. Negative values are impossible.',
            hintDE: 'Wahrscheinlichkeiten müssen 0 ≤ P(A) ≤ 1 erfüllen. Negative Werte sind unmöglich.',
            explain: 'Every valid probability must lie between 0 and 1, inclusive. −0.1 is negative, so it violates that rule.',
            explainDE: 'Jede gültige Wahrscheinlichkeit muss zwischen 0 und 1 liegen. −0,1 ist negativ und verletzt damit diese Regel.'
        },

        // ── 12. RECHENREGELN FÜR DAS WAHRSCHEINLICHKEITSMASS ─────────────────────

        {
            q: 'P(A) = 0.6 and P(B) = 0.5. What is the maximum possible value of P(A ∩ B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,6 und P(B) = 0,5. Was ist der maximal mögliche Wert von P(A ∩ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'P(A ∩ B) ≤ min(P(A), P(B)).',
            hintDE: 'P(A ∩ B) ≤ min(P(A), P(B)).',
            explain: 'The overlap A ∩ B can never be larger than either individual event, so P(A ∩ B) ≤ min(0.6, 0.5) = 0.5 at most.',
            explainDE: 'Die Überlappung A ∩ B kann nie größer sein als eines der einzelnen Ereignisse, also gilt P(A ∩ B) ≤ min(0,6, 0,5) = 0,5 maximal.'
        },
        {
            q: 'P(A) = 0.7 and P(B) = 0.4. What is the minimum possible value of P(A ∪ B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,7 und P(B) = 0,4. Was ist der minimal mögliche Wert von P(A ∪ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.7, tolerance: 0.001, unit: '',
            hintEn: 'P(A ∪ B) ≥ max(P(A), P(B)).',
            hintDE: 'P(A ∪ B) ≥ max(P(A), P(B)).',
            explain: 'The union A ∪ B is always at least as large as the bigger individual event, so P(A ∪ B) ≥ max(0.7, 0.4) = 0.7 at minimum.',
            explainDE: 'Die Vereinigung A ∪ B ist immer mindestens so groß wie das größere Einzelereignis, also gilt P(A ∪ B) ≥ max(0,7, 0,4) = 0,7 minimal.'
        },
        {
            q: 'P(B) = 0.6 and A ⊆ B. What is the maximum possible value of P(A)? Round to 3 decimal places.',
            qDE: 'P(B) = 0,6 und A ⊆ B. Was ist der maximal mögliche Wert von P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.6, tolerance: 0.001, unit: '',
            hintEn: 'Since A ⊆ B, P(A) ≤ P(B).',
            hintDE: 'Da A ⊆ B, gilt P(A) ≤ P(B).',
            explain: 'Since A is a subset of B, A can\'t contain more probability than B — so P(A) can be at most P(B) = 0.6.',
            explainDE: 'Da A eine Teilmenge von B ist, kann A nicht mehr Wahrscheinlichkeit enthalten als B — also kann P(A) höchstens P(B) = 0,6 sein.'
        },

    ],

    // WORLD 2
    //


    2: [


        // ── 1. BOOLESCHE UNGLEICHUNG / UNION BOUND ───────────────────────────────

        {
            q: 'P(A) = 0.3 and P(B) = 0.4. Using the union bound, what is the upper bound for P(A ∪ B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,3 und P(B) = 0,4. Was ist mit der Booleschen Ungleichung die obere Schranke für P(A ∪ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.7, tolerance: 0.001, unit: '',
            hintEn: 'Union bound: P(A ∪ B) ≤ P(A) + P(B)',
            hintDE: 'Boolesche Ungleichung: P(A ∪ B) ≤ P(A) + P(B)',
            explain: "The union bound simply adds the individual probabilities without subtracting the overlap, giving 0.3 + 0.4 = 0.7 as the upper bound.",
            explainDE: "Die Boolesche Ungleichung addiert einfach die einzelnen Wahrscheinlichkeiten, ohne die Überschneidung abzuziehen, was 0,3 + 0,4 = 0,7 als obere Schranke ergibt."
        },
        {
            q: 'Three events have probabilities P(A₁) = 0.2, P(A₂) = 0.3, P(A₃) = 0.25. What does the union bound give as an upper bound for P(A₁ ∪ A₂ ∪ A₃)? Round to 3 decimal places.',
            qDE: 'Drei Ereignisse haben Wahrscheinlichkeiten P(A₁) = 0,2, P(A₂) = 0,3, P(A₃) = 0,25. Was liefert die Boolesche Ungleichung als obere Schranke für P(A₁ ∪ A₂ ∪ A₃)? Runde auf 3 Nachkommastellen.',
            answer: 0.75, tolerance: 0.001, unit: '',
            hintEn: 'Union bound: P(A₁ ∪ A₂ ∪ A₃) ≤ 0.2 + 0.3 + 0.25',
            hintDE: 'Boolesche Ungleichung: P(A₁ ∪ A₂ ∪ A₃) ≤ 0,2 + 0,3 + 0,25',
            explain: "The union bound extends the same way to any number of events: just sum all individual probabilities, giving 0.2 + 0.3 + 0.25 = 0.75.",
            explainDE: "Die Boolesche Ungleichung erweitert sich auf dieselbe Weise auf beliebig viele Ereignisse: einfach alle Einzelwahrscheinlichkeiten summieren, was 0,2 + 0,3 + 0,25 = 0,75 ergibt."
        },
        {
            q: 'P(A) = 0.5 and P(B) = 0.6. The union bound gives P(A ∪ B) ≤ 1.1. But probabilities cannot exceed 1. So the tightest valid upper bound is?',
            qDE: 'P(A) = 0,5 und P(B) = 0,6. Die Boolesche Ungleichung liefert P(A ∪ B) ≤ 1,1. Da Wahrscheinlichkeiten nicht größer als 1 sein können, was ist die schärfste gültige obere Schranke?',
            answer: 1.0, tolerance: 0.001, unit: '',
            hintEn: 'The union bound gives 1.1, but P(A ∪ B) ≤ 1 always.',
            hintDE: 'Die Boolesche Ungleichung liefert 1,1, aber P(A ∪ B) ≤ 1 gilt immer.',
            explain: "Since probability is always capped at 1 regardless of what the sum of individual probabilities suggests, the union bound of 1.1 must be clipped down to the actual tightest possible bound of 1.",
            explainDE: "Da eine Wahrscheinlichkeit immer höchstens 1 sein kann, unabhängig davon, was die Summe der Einzelwahrscheinlichkeiten nahelegt, muss die Schranke von 1,1 auf die tatsächlich schärfste mögliche Schranke von 1 gekappt werden."
        },

        // ── 2. LAPLACE RAUM (Laplace Space) ──────────────────────────────────────

        {
            q: 'A Laplace space has 20 equally likely outcomes. Event A contains 5 outcomes. What is P(A)? Round to 3 decimal places.',
            qDE: 'Ein Laplace-Raum hat 20 gleich wahrscheinliche Ergebnisse. Ereignis A enthält 5 Ergebnisse. Was ist P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'P(A) = |A| / |Ω|',
            hintDE: 'P(A) = |A| / |Ω|',
            explain: "In a Laplace space every outcome is equally likely, so the probability of an event is just the count of favorable outcomes over the total: 5/20 = 0.25.",
            explainDE: "In einem Laplace-Raum ist jedes Ergebnis gleich wahrscheinlich, sodass die Wahrscheinlichkeit eines Ereignisses einfach die Anzahl günstiger Ergebnisse geteilt durch die Gesamtzahl ist: 5/20 = 0,25."
        },
        {
            q: 'A card is randomly drawn from a standard 52-card deck. What is the probability of drawing an ace? Enter the numerator of the fraction over 52.',
            qDE: 'Eine Karte wird aus einem Standarddeck mit 52 Karten zufällig gezogen. Was ist die Wahrscheinlichkeit, ein Ass zu ziehen? Gib den Zähler über 52 ein.',
            answer: 4, tolerance: 0, unit: '/ 52',
            hintEn: 'There are 4 aces in 52 cards.',
            hintDE: 'Es gibt 4 Asse in 52 Karten.',
            explain: "A standard deck has exactly one ace per suit, and with 4 suits that gives 4 favorable outcomes out of the 52 equally likely cards.",
            explainDE: "Ein Standarddeck hat genau ein Ass pro Farbe, und mit 4 Farben ergeben sich 4 günstige Ergebnisse von den 52 gleich wahrscheinlichen Karten."
        },


        // ── 3. DISKRETE GLEICHVERTEILUNG (Discrete Uniform Distribution) ──────────

        {
            q: 'A random number is chosen uniformly from {1, 2, 3, 4, 5}. What is the probability of choosing a number ≤ 3? Round to 3 decimal places.',
            qDE: 'Eine Zahl wird gleichmäßig aus {1, 2, 3, 4, 5} gezogen. Was ist die Wahrscheinlichkeit, eine Zahl ≤ 3 zu wählen? Runde auf 3 Nachkommastellen.',
            answer: 0.6, tolerance: 0.001, unit: '',
            hintEn: '3 favourable outcomes out of 5.',
            hintDE: '3 günstige Ergebnisse von 5.',
            explain: "The numbers 1, 2, and 3 satisfy the condition ≤ 3, giving 3 favorable outcomes out of the 5 total, so the probability is 3/5 = 0.6.",
            explainDE: "Die Zahlen 1, 2 und 3 erfüllen die Bedingung ≤ 3, was 3 günstige Ergebnisse von insgesamt 5 ergibt, sodass die Wahrscheinlichkeit 3/5 = 0,6 beträgt."
        },
        {
            q: 'On a discrete uniform distribution over {1, 2, …, 10}, what is the probability of drawing an even number? Round to 3 decimal places.',
            qDE: 'Bei diskreter Gleichverteilung über {1, 2, …, 10}: Was ist die Wahrscheinlichkeit, eine gerade Zahl zu ziehen? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'Even numbers: {2,4,6,8,10}.',
            hintDE: 'Gerade Zahlen: {2,4,6,8,10}.',
            explain: "Exactly half of the numbers from 1 to 10 are even (2, 4, 6, 8, 10), so with 5 favorable outcomes out of 10, the probability is 0.5.",
            explainDE: "Genau die Hälfte der Zahlen von 1 bis 10 ist gerade (2, 4, 6, 8, 10), sodass bei 5 günstigen Ergebnissen von 10 die Wahrscheinlichkeit 0,5 beträgt."
        },
        {
            q: 'A fair die is a discrete uniform distribution over {1,…,6}. What is P(X ≥ 5) where X is the dice number? Enter as a fraction over 6.',
            qDE: 'Ein fairer Würfel ist diskret gleichverteilt über {1,…,6}. Was ist P(X ≥ 5) wobei X die Augenzahl ist? Gib den Zähler über 6 ein.',
            answer: 2, tolerance: 0, unit: '/ 6',
            hintEn: 'Favourable outcomes: {5, 6} — 2 out of 6.',
            hintDE: 'Günstige Ergebnisse: {5, 6} — 2 von 6.',
            explain: "Only the values 5 and 6 satisfy X ≥ 5, giving exactly 2 favorable outcomes out of the 6 equally likely die faces.",
            explainDE: "Nur die Werte 5 und 6 erfüllen X ≥ 5, was genau 2 günstige Ergebnisse von den 6 gleich wahrscheinlichen Würfelseiten ergibt."
        },

        // ── 4. MULTIPLIKATIONSREGEL DER KOMBINATORIK ─────────────────────────────

        {
            q: 'A menu has 3 starters, 4 mains, and 2 desserts. How many different 3-course meals are possible?',
            qDE: 'Eine Speisekarte hat 3 Vorspeisen, 4 Hauptgerichte und 2 Desserts. Wie viele verschiedene 3-Gänge-Menüs sind möglich?',
            answer: 24, tolerance: 0, unit: 'meals',
            hintEn: 'Multiplication rule',
            hintDE: 'Multiplikationsregel',
            explain: "Since each course is chosen independently of the others, the multiplication rule applies directly: 3 × 4 × 2 = 24 possible combinations.",
            explainDE: "Da jeder Gang unabhängig von den anderen gewählt wird, gilt die Multiplikationsregel direkt: 3 × 4 × 2 = 24 mögliche Kombinationen."
        },
        {
            q: 'A password consists of 2 letters (A–Z, 26 options each) followed by 1 digit (0–9). How many passwords are possible?',
            qDE: 'Ein Passwort besteht aus 2 Buchstaben (A–Z, je 26 Möglichkeiten) gefolgt von 1 Ziffer (0–9). Wie viele Passwörter sind möglich?',
            answer: 6760, tolerance: 0, unit: 'passwords',
            hintEn: 'Multiplication rule.',
            hintDE: 'Multiplikationsregel.',
            explain: "Each of the two letter positions has 26 independent options and the digit position has 10, so multiplying gives 26 × 26 × 10 = 6760 possible passwords.",
            explainDE: "Jede der beiden Buchstabenpositionen hat 26 unabhängige Möglichkeiten und die Ziffernposition hat 10, sodass die Multiplikation 26 × 26 × 10 = 6760 mögliche Passwörter ergibt."
        },
        {
            q: 'You roll a six-sided fair die and flip a coin. How many different combined outcomes are possible?',
            qDE: 'Du wirfst einen sechsseitigen fairen Würfel und eine Münze. Wie viele verschiedene kombinierte Ergebnisse gibt es?',
            answer: 12, tolerance: 0, unit: 'outcomes',
            hintEn: 'Multiplication rule.',
            hintDE: 'Multiplikationsregel.',
            explain: "Since the die roll and coin flip are independent, the total number of combined outcomes is the product of their individual outcome counts: 6 × 2 = 12.",
            explainDE: "Da Würfelwurf und Münzwurf unabhängig sind, ist die Gesamtzahl der kombinierten Ergebnisse das Produkt ihrer einzelnen Ergebnisanzahlen: 6 × 2 = 12."
        },

        // ── 5. URNENMODELL MIT ZURÜCKLEGEN MIT REIHENFOLGE ───────────────────────

        {
            q: 'An urn contains 5 balls labelled 1–5. You draw 3 times with replacement, order matters. How many outcomes are possible?',
            qDE: 'Eine Urne enthält 5 Bälle (1–5). Du ziehst 3 Mal mit Zurücklegen, Reihenfolge zählt. Wie viele Ergebnisse sind möglich?',
            answer: 125, tolerance: 0, unit: 'outcomes',
            hintEn: 'With replacement, order matters: 5 possibilities in each draw.',
            hintDE: 'Mit Zurücklegen, Reihenfolge zählt: 5 Möglichkeiten in jedem Zug.',
            explain: "Since balls are replaced after each draw, every one of the 3 draws independently has all 5 balls available, giving 5³ = 125 possible ordered outcomes.",
            explainDE: "Da die Bälle nach jedem Zug zurückgelegt werden, stehen bei jedem der 3 Züge unabhängig alle 5 Bälle zur Verfügung, was 5³ = 125 mögliche geordnete Ergebnisse ergibt."
        },
        {
            q: 'An urn has 4 balls. Drawing 2 times with replacement and order matters: what is the probability of drawing ball #1 both times? Enter as a fraction over 16.',
            qDE: 'Eine Urne hat 4 Bälle. 2 Mal mit Zurücklegen ziehen, Reihenfolge zählt: Was ist die Wahrscheinlichkeit, beide Male Ball Nr. 1 zu ziehen? Gib den Zähler über 16 ein.',
            answer: 1, tolerance: 0, unit: '/ 16',
            hintEn: 'Total outcomes: 4² = 16. Favourable: draw 1, then 1 again.',
            hintDE: 'Gesamtergebnisse: 4² = 16. Günstige: zuerst 1, dann nochmal 1.',
            explain: "With replacement there are 4² = 16 equally likely ordered outcomes total, and only the single specific sequence (1, 1) counts as favorable.",
            explainDE: "Mit Zurücklegen gibt es insgesamt 4² = 16 gleich wahrscheinliche geordnete Ergebnisse, und nur die eine bestimmte Sequenz (1, 1) zählt als günstig."
        },
        {
            q: 'An urn contains 3 balls (red, blue, green). Drawing 2 times with replacement, order matters. How many outcomes contain at least one red ball?',
            qDE: 'Eine Urne enthält 3 Bälle (rot, blau, grün). Ziehe zwei Mal mit Zurücklegen, Reihenfolge zählt. Wie viele Ergebnisse enthalten mindestens einen roten Ball?',
            answer: 5, tolerance: 0, unit: 'outcomes',
            hintEn: 'Total outcomes: 3² = 9. No red: 2² = 4',
            hintDE: 'Gesamtergebnisse: 3² = 9. Kein Rot: 2² = 4',
            explain: "It's easier to count the complement: with 2 non-red balls, there are 2² = 4 outcomes containing no red at all, so 9 − 4 = 5 outcomes contain at least one red ball.",
            explainDE: "Es ist einfacher, das Komplement zu zählen: Mit 2 nicht-roten Bällen gibt es 2² = 4 Ergebnisse ganz ohne Rot, sodass 9 − 4 = 5 Ergebnisse mindestens einen roten Ball enthalten."
        },

        // ── 6. URNENMODELL MIT REIHENFOLGE OHNE ZURÜCKLEGEN ──────────────────────

        {
            q: 'An urn has 6 balls. You draw 2 without replacement, order matters. How many ordered outcomes are possible?',
            qDE: 'Eine Urne enthält 6 Bälle. Du ziehst 2 Bälle ohne Zurücklegen, Reihenfolge zählt. Wie viele geordnete Ergebnisse sind möglich?',
            answer: 30, tolerance: 0, unit: 'outcomes',
            hintEn: 'First draw: 6 options, second draw: 5 (no replacement).',
            hintDE: 'Erster Zug: 6 Möglichkeiten, zweiter Zug: 5 (ohne Zurücklegen).',
            explain: "Without replacement, the pool shrinks by one after the first draw, so the count is 6 × 5 = 30 ordered outcomes rather than 6².",
            explainDE: "Ohne Zurücklegen schrumpft der Vorrat nach dem ersten Zug um eins, sodass die Anzahl 6 × 5 = 30 geordnete Ergebnisse beträgt, statt 6²."
        },
        {
            q: 'How many ways can 4 runners finish in 1st, 2nd, and 3rd place out of 8 runners? (Order matters, no replacement.)',
            qDE: 'Wie viele Möglichkeiten gibt es für Platz 1, 2 und 3 bei 8 Läufern? (Reihenfolge zählt, ohne Zurücklegen.)',
            answer: 336, tolerance: 0, unit: 'ways',
            hintEn: '8 different runners can finish first, 7 can finish second,...',
            hintDE: '8 Läufer können Platz 1 erreichen, 7 Läufer können Platz 2 erreichen,...',
            explain: "Each place removes one runner from contention for the next, so the count of ordered arrangements is 8 × 7 × 6 = 336.",
            explainDE: "Jeder Platz entfernt einen Läufer aus dem Rennen um den nächsten Platz, sodass die Anzahl geordneter Anordnungen 8 × 7 × 6 = 336 beträgt."
        },
        {
            q: 'An urn has 5 balls numbered 1–5. Two are drawn without replacement, order matters. What is the probability of drawing ball #1 first and then #2 second? Enter as a fraction over 20.',
            qDE: 'Eine Urne hat 5 Bälle (1–5). Zwei werden ohne Zurücklegen gezogen, Reihenfolge zählt. Was ist P(zuerst #1, dann #2)? Gib den Zähler über 20 ein.',
            answer: 1, tolerance: 0, unit: '/ 20',
            hintEn: 'Total ordered outcomes: 5 × 4 = 20. Only 1 favourable: (1,2).',
            hintDE: 'Geordnete Ergebnisse gesamt: 5 × 4 = 20. Nur 1 günstig: (1,2).',
            explain: "There are 5 × 4 = 20 total ordered outcomes without replacement, and exactly one of them is the specific sequence (1, 2) asked for.",
            explainDE: "Es gibt insgesamt 5 × 4 = 20 geordnete Ergebnisse ohne Zurücklegen, und genau eines davon ist die gefragte spezifische Sequenz (1, 2)."
        },

        // ── 7. CHANCEN / ODDS ─────────────────────────────────────────────────────

        {
            q: 'P(A) = 0.8. What are the odds in favour of A (odds = p/(1−p))? Round to 3 decimal places.',
            qDE: 'P(A) = 0,8. Was sind die Chancen (Odds) für A (Odds = p/(1−p))? Runde auf 3 Nachkommastellen.',
            answer: 4.0, tolerance: 0.001, unit: '',
            hintEn: 'Odds = P(A) / P(Aᶜ)',
            hintDE: 'Odds = P(A) / P(Aᶜ)',
            explain: "Odds compare the probability of A happening to it not happening: with P(A) = 0.8 and P(Aᶜ) = 0.2, the odds are 0.8/0.2 = 4.0.",
            explainDE: "Odds vergleichen die Wahrscheinlichkeit, dass A eintritt, mit der, dass es nicht eintritt: Bei P(A) = 0,8 und P(Aᶜ) = 0,2 betragen die Odds 0,8/0,2 = 4,0."
        },
        {
            q: 'The odds in favour of event A are 3 (i.e. 3:1). What is P(A)? Round to 3 decimal places.',
            qDE: 'Die Odds für Ereignis A betragen 3 (also 3:1). Was ist P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.75, tolerance: 0.001, unit: '',
            hintEn: 'Odds = p/(1−p) = 3',
            hintDE: 'Odds = p/(1−p) = 3',
            explain: "Solving p/(1−p) = 3 for p gives p = 3(1−p), so p = 3 − 3p, meaning 4p = 3 and p = 0.75.",
            explainDE: "Löst man p/(1−p) = 3 nach p auf, ergibt sich p = 3(1−p), also p = 3 − 3p, was 4p = 3 und somit p = 0,75 bedeutet."
        },
        {
            q: 'P(A) = 0.25. What are the odds against A (i.e. P(Aᶜ)/P(A))? Enter as a decimal.',
            qDE: 'P(A) = 0,25. Wie sind die Odds gegen A (also P(Aᶜ)/P(A))? Gib als Dezimalzahl ein.',
            answer: 3.0, tolerance: 0.001, unit: '',
            hintEn: 'Odds against = (1 − 0.25) / 0.25',
            hintDE: 'Odds gegen A = (1 − 0,25) / 0,25',
            explain: "Odds against A flip the usual ratio, comparing failure to success: with P(Aᶜ) = 0.75 and P(A) = 0.25, this gives 0.75/0.25 = 3.0.",
            explainDE: "Odds gegen A kehren das übliche Verhältnis um und vergleichen Misserfolg mit Erfolg: Bei P(Aᶜ) = 0,75 und P(A) = 0,25 ergibt sich 0,75/0,25 = 3,0."
        },

        // ── 8. SIEBFORMEL / INCLUSION-EXCLUSION ──────────────────────────────────

        {
            q: 'P(A) = 0.5, P(B) = 0.4, P(C) = 0.3, P(A∩B) = 0.2, P(A∩C) = 0.1, P(B∩C) = 0.15, P(A∩B∩C) = 0.05. What is P(A ∪ B ∪ C)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,5, P(B) = 0,4, P(C) = 0,3, P(A∩B) = 0,2, P(A∩C) = 0,1, P(B∩C) = 0,15, P(A∩B∩C) = 0,05. Was ist P(A ∪ B ∪ C)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'Inclusion-exclusion formula for 3 sets.',
            hintDE: 'Siebformel für 3 Mengen.',
            explain: "Adding the singles, subtracting the pairwise overlaps, and adding back the triple overlap gives (0.5+0.4+0.3) − (0.2+0.1+0.15) + 0.05 = 1.2 − 0.45 + 0.05 = 0.8.",
            explainDE: "Das Addieren der Einzelwahrscheinlichkeiten, Subtrahieren der paarweisen Überschneidungen und erneute Addieren der dreifachen Überschneidung ergibt (0,5+0,4+0,3) − (0,2+0,1+0,15) + 0,05 = 1,2 − 0,45 + 0,05 = 0,8."
        },
        {
            q: 'P(A) = 0.6, P(B) = 0.5, P(C) = 0.4, P(A∩B) = 0.3, P(A∩C) = 0.2, P(B∩C) = 0.25, P(A∩B∩C) = 0.1. What is P(A ∪ B ∪ C)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,6, P(B) = 0,5, P(C) = 0,4, P(A∩B) = 0,3, P(A∩C) = 0,2, P(B∩C) = 0,25, P(A∩B∩C) = 0,1. Was ist P(A ∪ B ∪ C)? Runde auf 3 Nachkommastellen.',
            answer: 0.85, tolerance: 0.001, unit: '',
            hintEn: 'Inclusion-exclusion formula for 3 sets.',
            hintDE: 'Siebformel für 3 Mengen.',
            explain: "Applying the same pattern: (0.6+0.5+0.4) − (0.3+0.2+0.25) + 0.1 = 1.5 − 0.75 + 0.1 = 0.85.",
            explainDE: "Bei Anwendung desselben Musters: (0,6+0,5+0,4) − (0,3+0,2+0,25) + 0,1 = 1,5 − 0,75 + 0,1 = 0,85."
        },
        {
            q: 'In the inclusion-exclusion formula for 3 sets, how many pairwise intersection terms are subtracted? Enter a whole number.',
            qDE: 'In der Siebformel für 3 Mengen: Wie viele paarweise Schnittterme werden subtrahiert? Gib eine ganze Zahl ein.',
            answer: 3, tolerance: 0, unit: 'terms',
            hintEn: 'The three pairwise intersections are P(A∩B), P(A∩C), P(B∩C) — 3 terms.',
            hintDE: 'Die drei paarweisen Schnitte sind P(A∩B), P(A∩C), P(B∩C) — 3 Terme.',
            explain: "With 3 sets there are exactly 3 distinct ways to choose 2 of them for a pairwise intersection: {A,B}, {A,C}, and {B,C}.",
            explainDE: "Bei 3 Mengen gibt es genau 3 verschiedene Möglichkeiten, 2 davon für eine paarweise Schnittmenge auszuwählen: {A,B}, {A,C} und {B,C}."
        },

        // ── 9. EREIGNISALGEBRA / SIGMA-ALGEBRA ───────────────────────────────────

        {
            q: 'Ω = {1,2,3,4}. Is ℱ = {∅, {1,2}, {3,4}, Ω} a valid σ-algebra? Enter 1 for yes, 0 for no.',
            qDE: 'Ω = {1,2,3,4}. Ist ℱ = {∅, {1,2}, {3,4}, Ω} eine gültige σ-Algebra? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Check: contains ∅ and Ω ✓; {1,2}ᶜ = {3,4} ∈ ℱ ✓; closed under unions ✓. Valid.',
            hintDE: 'Check: enthält ∅ und Ω ✓; {1,2}ᶜ = {3,4} ∈ ℱ ✓; abgeschlossen unter Vereinigung ✓. Gültig.',
            explain: "All three σ-algebra axioms hold here: ∅ and Ω are included, every set's complement is also present, and unions of sets in ℱ stay within ℱ.",
            explainDE: "Alle drei Axiome einer σ-Algebra sind hier erfüllt: ∅ und Ω sind enthalten, das Komplement jeder Menge ist ebenfalls vorhanden, und Vereinigungen von Mengen in ℱ bleiben innerhalb von ℱ."
        },
        {
            q: 'Ω = {1,2,3}. Is ℱ = {∅, {1}, {2}, Ω} a valid σ-algebra? Enter 1 for yes, 0 for no.',
            qDE: 'Ω = {1,2,3}. Ist ℱ = {∅, {1}, {2}, Ω} eine gültige σ-Algebra? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: '{1} ∪ {2} = {1,2} is not in ℱ — not closed under unions. Invalid.',
            hintDE: '{1} ∪ {2} = {1,2} ist nicht in ℱ — nicht abgeschlossen unter Vereinigung. Ungültig.',
            explain: "A σ-algebra must be closed under unions, but {1} ∪ {2} = {1,2} is missing from ℱ, so the closure property fails and ℱ is not a valid σ-algebra.",
            explainDE: "Eine σ-Algebra muss unter Vereinigung abgeschlossen sein, aber {1} ∪ {2} = {1,2} fehlt in ℱ, sodass die Abgeschlossenheitseigenschaft nicht erfüllt ist und ℱ keine gültige σ-Algebra ist."
        },
    ],

    // ── WORLD 3 ─────────────────────────────────────────────────────────
    //


    3: [
        // ── 1. BEDINGTE WAHRSCHEINLICHKEIT (Conditional Probability) ─────────────


        {
            q: 'P(A ∩ B) = 0.12 and P(B) = 0.4. What is P(A | B)? Round to 3 decimal places.',
            qDE: 'P(A ∩ B) = 0,12 und P(B) = 0,4. Was ist P(A | B)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'P(A|B) = P(A ∩ B) / P(B)',
            hintDE: 'P(A|B) = P(A ∩ B) / P(B)',
            explain: "Conditional probability restricts attention to the world where B has happened, so we divide the joint probability by P(B): 0.12 / 0.4 = 0.3.",
            explainDE: "Bedingte Wahrscheinlichkeit beschränkt die Betrachtung auf den Fall, dass B bereits eingetreten ist, daher teilt man die gemeinsame Wahrscheinlichkeit durch P(B): 0,12 / 0,4 = 0,3."
        },

        {
            q: 'P(B | A) = 0.5, P(A) = 0.6. What is P(A ∩ B)? Round to 3 decimal places.',
            qDE: 'P(B | A) = 0,5, P(A) = 0,6. Was ist P(A ∩ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'Multiplication rule: P(A ∩ B) = P(B|A) · P(A)',
            hintDE: 'Multiplikationsregel: P(A ∩ B) = P(B|A) · P(A)',
            explain: "Rearranging the definition of conditional probability gives the multiplication rule directly: P(A ∩ B) = P(B|A) · P(A) = 0.5 × 0.6 = 0.3.",
            explainDE: "Das Umstellen der Definition der bedingten Wahrscheinlichkeit ergibt direkt die Multiplikationsregel: P(A ∩ B) = P(B|A) · P(A) = 0,5 × 0,6 = 0,3."
        },
        {
            q: 'P(A) = 0.4, P(B) = 0.5, P(A ∩ B) = 0.2. What is P(A | B)? Round to 3 decimal places.',
            qDE: 'P(A) = 0,4, P(B) = 0,5, P(A ∩ B) = 0,2. Was ist P(A | B)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(A|B) = P(A ∩ B) / P(B)',
            hintDE: 'P(A|B) = P(A ∩ B) / P(B)',
            explain: "P(A) here is a distractor — conditioning on B only needs the joint probability divided by P(B): 0.2 / 0.5 = 0.4.",
            explainDE: "P(A) ist hier eine Ablenkung — die Bedingung auf B benötigt nur die gemeinsame Wahrscheinlichkeit geteilt durch P(B): 0,2 / 0,5 = 0,4."
        },

        // ── 2. SATZ VON DER TOTALEN WAHRSCHEINLICHKEIT ───────────────────────────

        {
            q: 'B₁ and B₂ partition Ω. P(B₁) = 0.3, P(B₂) = 0.7, P(A|B₁) = 0.4, P(A|B₂) = 0.2. What is P(A)? Round to 3 decimal places.',
            qDE: 'B₁ und B₂ partitionieren Ω. P(B₁) = 0,3, P(B₂) = 0,7, P(A|B₁) = 0,4, P(A|B₂) = 0,2. Was ist P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.26, tolerance: 0.001, unit: '',
            hintEn: 'P(A) = P(A|B₁)·P(B₁) + P(A|B₂)·P(B₂)',
            hintDE: 'P(A) = P(A|B₁)·P(B₁) + P(A|B₂)·P(B₂)',
            explain: "Since B₁ and B₂ partition the sample space, A's total probability is built by weighting each conditional probability by how likely its condition is: 0.4×0.3 + 0.2×0.7 = 0.12 + 0.14 = 0.26.",
            explainDE: "Da B₁ und B₂ den Stichprobenraum partitionieren, setzt sich die Gesamtwahrscheinlichkeit von A zusammen, indem jede bedingte Wahrscheinlichkeit mit der Wahrscheinlichkeit ihrer Bedingung gewichtet wird: 0,4×0,3 + 0,2×0,7 = 0,12 + 0,14 = 0,26."
        },
        {
            q: 'Three machines produce parts: B₁ (50%), B₂ (30%), B₃ (20%). Defect rates: P(D|B₁)=0.02, P(D|B₂)=0.05, P(D|B₃)=0.03. What is P(D)? Round to 3 decimal places.',
            qDE: 'Drei Maschinen produzieren Teile: B₁ (50%), B₂ (30%), B₃ (20%). Ausschussraten: P(D|B₁)=0,02, P(D|B₂)=0,05, P(D|B₃)=0,03. Was ist P(D)? Runde auf 3 Nachkommastellen.',
            answer: 0.031, tolerance: 0.001, unit: '',
            hintEn: 'P(D) = 0.02×0.5 + 0.05×0.3 + 0.03×0.2',
            hintDE: 'P(D) = 0,02×0,5 + 0,05×0,3 + 0,03×0,2',
            explain: "The overall defect rate blends each machine's individual defect rate weighted by its production share: 0.02×0.5 + 0.05×0.3 + 0.03×0.2 = 0.01 + 0.015 + 0.006 = 0.031.",
            explainDE: "Die Gesamtausschussrate ergibt sich, indem die Ausschussrate jeder Maschine mit ihrem Produktionsanteil gewichtet wird: 0,02×0,5 + 0,05×0,3 + 0,03×0,2 = 0,01 + 0,015 + 0,006 = 0,031."
        },
        {
            q: 'B₁, B₂, B₃ partition Ω with P(B₁)=0.2, P(B₂)=0.5, P(B₃)=0.3. P(A|B₁)=0.6, P(A|B₂)=0.4, P(A|B₃)=0.1. What is P(A)? Round to 3 decimal places.',
            qDE: 'B₁, B₂, B₃ partitionieren Ω mit P(B₁)=0,2, P(B₂)=0,5, P(B₃)=0,3. P(A|B₁)=0,6, P(A|B₂)=0,4, P(A|B₃)=0,1. Was ist P(A)? Runde auf 3 Nachkommastellen.',
            answer: 0.35, tolerance: 0.001, unit: '',
            hintEn: 'P(A) = 0.6×0.2 + 0.4×0.5 + 0.1×0.3',
            hintDE: 'P(A) = 0,6×0,2 + 0,4×0,5 + 0,1×0,3',
            explain: "Summing each conditional probability weighted by its partition probability gives 0.6×0.2 + 0.4×0.5 + 0.1×0.3 = 0.12 + 0.2 + 0.03 = 0.35.",
            explainDE: "Das Summieren jeder bedingten Wahrscheinlichkeit, gewichtet mit ihrer Partitionswahrscheinlichkeit, ergibt 0,6×0,2 + 0,4×0,5 + 0,1×0,3 = 0,12 + 0,2 + 0,03 = 0,35."
        },

        // ── 3. BAYES FORMEL ───────────────────────────────────────────────────────

        {
            q: 'P(B₁)=0.3, P(B₂)=0.7, P(A|B₁)=0.4, P(A|B₂)=0.2, P(A)=0.26. What is P(B₁|A)? Enter as a decimal rounded to 2 places.',
            qDE: 'P(B₁)=0,3, P(B₂)=0,7, P(A|B₁)=0,4, P(A|B₂)=0,2, P(A)=0,26. Was ist P(B₁|A)? Gib als Dezimalzahl auf 2 Stellen gerundet an.',
            answer: 0.46, tolerance: 0.01, unit: '',
            hintEn: 'Bayes: P(B₁|A) = P(A|B₁)·P(B₁) / P(A)',
            hintDE: 'Bayes: P(B₁|A) = P(A|B₁)·P(B₁) / P(A)',
            explain: "Bayes' formula reverses the conditioning: P(B₁|A) = P(A|B₁)·P(B₁) / P(A) = (0.4×0.3) / 0.26 = 0.12 / 0.26 ≈ 0.46.",
            explainDE: "Die Bayes-Formel kehrt die Bedingung um: P(B₁|A) = P(A|B₁)·P(B₁) / P(A) = (0,4×0,3) / 0,26 = 0,12 / 0,26 ≈ 0,46."
        },

        {
            q: 'P(A|B)=0.6, P(B)=0.4, P(A)=0.3. What is P(B|A)? Enter as a decimal rounded to 2 places.',
            qDE: 'P(A|B)=0,6, P(B)=0,4, P(A)=0,3. Was ist P(B|A)? Gib als Dezimalzahl auf 2 Stellen gerundet an.',
            answer: 0.8, tolerance: 0.01, unit: '',
            hintEn: 'Bayes: P(B|A) = P(A|B)·P(B)/P(A)',
            hintDE: 'Bayes: P(B|A) = P(A|B)·P(B)/P(A)',
            explain: "Applying Bayes' formula: P(B|A) = P(A|B)·P(B) / P(A) = (0.6×0.4) / 0.3 = 0.24 / 0.3 = 0.8.",
            explainDE: "Die Anwendung der Bayes-Formel ergibt: P(B|A) = P(A|B)·P(B) / P(A) = (0,6×0,4) / 0,3 = 0,24 / 0,3 = 0,8."
        },

        // ── 4. MEHRSTUFIGE WAHRSCHEINLICHKEITSRÄUME / WAHRSCHEINLICHKEITSBAUM ────

        {
            q: 'A bag has 3 red and 2 blue balls. You draw twice without replacement. What is P(red, then red)? Round to 3 decimal places.',
            qDE: 'Ein Beutel enthält 3 rote und 2 blaue Bälle. Du ziehst zweimal ohne Zurücklegen. Was ist P(rot, dann rot)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'P(R₁)=3/5, P(R₂|R₁)=2/4.',
            hintDE: 'P(R₁)=3/5, P(R₂|R₁)=2/4.'
            ,
            explain: "Using the multiplication rule along the tree: the first draw is red with probability 3/5, and given that, only 2 red balls remain out of 4, so P(red, red) = (3/5)×(2/4) = 0.3.",
            explainDE: "Mit der Multiplikationsregel entlang des Baums: Der erste Zug ist rot mit Wahrscheinlichkeit 3/5, und danach verbleiben nur noch 2 rote Bälle von 4, sodass P(rot, rot) = (3/5)×(2/4) = 0,3."
        },
        {
            q: 'In a two-stage probability tree, P(B₁)=0.6, P(B₂)=0.4. P(A|B₁)=0.3, P(A|B₂)=0.7. What is P(B₂ ∩ A)? Round to 3 decimal places.',
            qDE: 'In einem zweistufigen Wahrscheinlichkeitsbaum: P(B₁)=0,6, P(B₂)=0,4. P(A|B₁)=0,3, P(A|B₂)=0,7. Was ist P(B₂ ∩ A)? Runde auf 3 Nachkommastellen.',
            answer: 0.28, tolerance: 0.001, unit: '',
            hintEn: 'P(B₂ ∩ A) = P(A|B₂) · P(B₂)',
            hintDE: 'P(B₂ ∩ A) = P(A|B₂) · P(B₂)',
            explain: "The joint probability along the B₂ branch of the tree is just the product of the branch probabilities: P(A|B₂) · P(B₂) = 0.7 × 0.4 = 0.28.",
            explainDE: "Die gemeinsame Wahrscheinlichkeit entlang des B₂-Zweigs des Baums ist einfach das Produkt der Zweigwahrscheinlichkeiten: P(A|B₂) · P(B₂) = 0,7 × 0,4 = 0,28."
        },
        {
            q: 'A coin is flipped twice. In the probability tree, how many paths lead to exactly one head?',
            qDE: 'Eine Münze wird zweimal geworfen. Wie viele Pfade im Wahrscheinlichkeitsbaum führen zu genau einem Kopf?',
            answer: 2, tolerance: 0, unit: 'paths',
            hintEn: 'The paths Head-Tails and Tails-Head both give exactly one head — 2 paths.',
            hintDE: 'Die Pfade Kopf-Zahl und Zahl-Kopf ergeben jeweils genau einen Kopf — 2 Pfade.',
            explain: "Out of the 4 possible two-flip sequences, exactly one head occurs along two distinct paths: Head-Tails and Tails-Head.",
            explainDE: "Von den 4 möglichen Sequenzen bei zwei Würfen tritt genau ein Kopf entlang zweier unterschiedlicher Pfade auf: Kopf-Zahl und Zahl-Kopf."
        },

        // ── 5. STOCHASTISCHE UNABHÄNGIGKEIT (Statistical Independence) ────────────

        {
            q: 'P(A)=0.4, P(A ∩ B)=0.2. For which value of P(B) are A and B independent?',
            qDE: 'P(A)=0,4, P(A ∩ B)=0,2. Für welchen Wert von P(B) sind A und B unabhängig? ',
            answer: 0.5, tolerance: 0, unit: '',
            hintEn: 'Independent if P(A ∩ B) = P(A)·P(B).',
            hintDE: 'Unabhängig wenn P(A ∩ B) = P(A)·P(B).',
            explain: "Independence requires P(A ∩ B) = P(A)·P(B), so solving 0.2 = 0.4·P(B) gives P(B) = 0.5.",
            explainDE: "Unabhängigkeit erfordert P(A ∩ B) = P(A)·P(B), sodass das Lösen von 0,2 = 0,4·P(B) P(B) = 0,5 ergibt."
        },
        {
            q: 'P(A)=0.3, P(B)=0.6, P(A ∩ B)=0.2. Are A and B independent? Enter 1 for yes, 0 for no.',
            qDE: 'P(A)=0,3, P(B)=0,6, P(A ∩ B)=0,2. Sind A und B unabhängig? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'P(A)·P(B) = 0.3 × 0.6 = 0.18',
            hintDE: 'P(A)·P(B) = 0,3 × 0,6 = 0,18',
            explain: "Checking the independence condition: P(A)·P(B) = 0.3×0.6 = 0.18, which does not match the given P(A ∩ B) = 0.2, so A and B are not independent.",
            explainDE: "Beim Prüfen der Unabhängigkeitsbedingung: P(A)·P(B) = 0,3×0,6 = 0,18, was nicht mit dem gegebenen P(A ∩ B) = 0,2 übereinstimmt, sodass A und B nicht unabhängig sind."
        },
        {
            q: 'A and B are independent with P(A)=0.5 and P(B)=0.4. What is P(A ∩ B)? Round to 3 decimal places.',
            qDE: 'A und B sind unabhängig mit P(A)=0,5 und P(B)=0,4. Was ist P(A ∩ B)? Runde auf 3 Nachkommastellen.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: 'Independence: P(A ∩ B) = P(A) · P(B)',
            hintDE: 'Unabhängigkeit: P(A ∩ B) = P(A) · P(B)',
            explain: "For independent events, the joint probability is simply the product of the individual probabilities: 0.5 × 0.4 = 0.2.",
            explainDE: "Bei unabhängigen Ereignissen ist die gemeinsame Wahrscheinlichkeit einfach das Produkt der Einzelwahrscheinlichkeiten: 0,5 × 0,4 = 0,2."
        },

        // ── 6. ZUFALLSVARIABLEN (Random Variables) ────────────────────────────────

        {
            q: 'A fair die is rolled. X is the number shown. What is P(X = 3)? Enter as a fraction over 6.',
            qDE: 'Ein fairer Würfel wird geworfen. X ist die gezeigte Zahl. Was ist P(X = 3)? Gib den Zähler über 6 ein.',
            answer: 1, tolerance: 0, unit: '/ 6',
            hintEn: 'X maps each face to its number.',
            hintDE: 'X bildet jede Seite auf ihre Zahl ab',
            explain: "Since the die is fair, each of the 6 faces is equally likely, so exactly 1 outcome favors X = 3.",
            explainDE: "Da der Würfel fair ist, ist jede der 6 Seiten gleich wahrscheinlich, sodass genau 1 Ergebnis für X = 3 günstig ist."
        },
        {
            q: 'X takes values {0, 1, 2} with P(X=0)=0.2, P(X=1)=0.5, P(X=2)=0.3. What is P(X ≥ 1)? Round to 3 decimal places.',
            qDE: 'X nimmt Werte {0,1,2} an mit P(X=0)=0,2, P(X=1)=0,5, P(X=2)=0,3. Was ist P(X ≥ 1)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'P(X ≥ 1) = 1 − P(X=0)',
            hintDE: 'P(X ≥ 1) = 1 − P(X=0)',
            explain: "Rather than adding P(X=1) and P(X=2) separately, it's quicker to use the complement: P(X ≥ 1) = 1 − P(X=0) = 1 − 0.2 = 0.8.",
            explainDE: "Statt P(X=1) und P(X=2) separat zu addieren, ist es schneller, das Komplement zu nutzen: P(X ≥ 1) = 1 − P(X=0) = 1 − 0,2 = 0,8."
        },
        {
            q: 'X takes values {1, 2, 3} with P(X=1)=0.5, P(X=2)=0.3, P(X=3)=p. What must p be? Round to 3 decimal places.',
            qDE: 'X nimmt Werte {1,2,3} an mit P(X=1)=0,5, P(X=2)=0,3, P(X=3)=p. Was muss p sein? Runde auf 3 Nachkommastellen.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: 'All probabilities must sum to 1',
            hintDE: 'Alle Wahrscheinlichkeiten müssen 1 ergeben',
            explain: "Since all probabilities in a distribution must sum to 1, p = 1 − 0.5 − 0.3 = 0.2.",
            explainDE: "Da alle Wahrscheinlichkeiten einer Verteilung sich zu 1 summieren müssen, ist p = 1 − 0,5 − 0,3 = 0,2."
        },

        // ── 7. VERTEILUNG VON ZUFALLSVARIABLEN (Distribution of Random Variables) ─

        {
            q: 'X has distribution P(X=1)=0.3, P(X=2)=0.4, P(X=3)=0.3. What is P(X ≤ 2)? Round to 3 decimal places.',
            qDE: 'X hat die Verteilung P(X=1)=0,3, P(X=2)=0,4, P(X=3)=0,3. Was ist P(X ≤ 2)? Runde auf 3 Nachkommastellen.',
            answer: 0.7, tolerance: 0.001, unit: '',
            hintEn: 'P(X ≤ 2) = P(X=1) + P(X=2).',
            hintDE: 'P(X ≤ 2) = P(X=1) + P(X=2).',
            explain: "P(X ≤ 2) sums all probability mass at values 1 and 2: 0.3 + 0.4 = 0.7.",
            explainDE: "P(X ≤ 2) summiert die gesamte Wahrscheinlichkeitsmasse bei den Werten 1 und 2: 0,3 + 0,4 = 0,7."
        },
        {
            q: 'X is uniformly distributed on {1, 2, 3, 4, 5}. What is P(2 ≤ X ≤ 4)? Round to 3 decimal places.',
            qDE: 'X ist gleichverteilt auf {1,2,3,4,5}. Was ist P(2 ≤ X ≤ 4)? Runde auf 3 Nachkommastellen.',
            answer: 0.6, tolerance: 0.001, unit: '',
            hintEn: 'Values {2,3,4}: 3 out of 5 equally likely outcomes.',
            hintDE: 'Werte {2,3,4}: 3 von 5 gleich wahrscheinlichen Ergebnissen.',
            explain: "The values 2, 3, and 4 satisfy the condition, giving 3 out of the 5 equally likely outcomes, so the probability is 3/5 = 0.6.",
            explainDE: "Die Werte 2, 3 und 4 erfüllen die Bedingung, was 3 von den 5 gleich wahrscheinlichen Ergebnissen ergibt, sodass die Wahrscheinlichkeit 3/5 = 0,6 beträgt."
        },
        {
            q: 'X has P(X=0)=0.1, P(X=1)=0.4, P(X=2)=0.4, P(X=3)=0.1. What is P(X = 1 or X = 2)? Round to 3 decimal places.',
            qDE: 'X hat P(X=0)=0,1, P(X=1)=0,4, P(X=2)=0,4, P(X=3)=0,1. Was ist P(X=1 oder X=2)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'P(X=1) + P(X=2)',
            hintDE: 'P(X=1) + P(X=2)',
            explain: "Since X=1 and X=2 are mutually exclusive outcomes, their probabilities simply add: 0.4 + 0.4 = 0.8.",
            explainDE: "Da X=1 und X=2 sich gegenseitig ausschließende Ergebnisse sind, addieren sich ihre Wahrscheinlichkeiten einfach: 0,4 + 0,4 = 0,8."
        },

        // ── 8. BERECHNUNG VON INTERVALLWAHRSCHEINLICHKEITEN ──────────────────────

        {
            q: 'X is discrete with P(X=k) = 0.1 for k = 1,…,10. What is P(3 ≤ X ≤ 7)? Round to 3 decimal places.',
            qDE: 'X ist diskret mit P(X=k) = 0,1 für k = 1,…,10. Was ist P(3 ≤ X ≤ 7)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'Values 3,4,5,6,7',
            hintDE: 'Werte 3,4,5,6,7',
            explain: "There are 5 values (3 through 7) in this range, each with probability 0.1, giving a total of 5 × 0.1 = 0.5.",
            explainDE: "In diesem Bereich liegen 5 Werte (3 bis 7), jeder mit Wahrscheinlichkeit 0,1, was insgesamt 5 × 0,1 = 0,5 ergibt."
        },
        {
            q: 'F(x) is a distribution function with F(3)=0.7 and F(1)=0.3. What is P(1 < X ≤ 3)? Round to 3 decimal places.',
            qDE: 'F(x) ist eine Verteilungsfunktion mit F(3)=0,7 und F(1)=0,3. Was ist P(1 < X ≤ 3)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(1 < X ≤ 3) = F(3) − F(1)',
            hintDE: 'P(1 < X ≤ 3) = F(3) − F(1)',
            explain: "The probability of falling in an interval is the difference of the CDF at the endpoints: F(3) − F(1) = 0.7 − 0.3 = 0.4.",
            explainDE: "Die Wahrscheinlichkeit, in ein Intervall zu fallen, ist die Differenz der Verteilungsfunktion an den Endpunkten: F(3) − F(1) = 0,7 − 0,3 = 0,4."
        },
        {
            q: 'F(5)=0.9 and F(2)=0.5. What is P(2 < X ≤ 5)? Round to 3 decimal places.',
            qDE: 'F(5)=0,9 und F(2)=0,5. Was ist P(2 < X ≤ 5)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(2 < X ≤ 5) = F(5) − F(2)',
            hintDE: 'P(2 < X ≤ 5) = F(5) − F(2)',
            explain: "As with any interval probability from a CDF, subtracting the lower endpoint's value from the upper one gives F(5) − F(2) = 0.9 − 0.5 = 0.4.",
            explainDE: "Wie bei jeder Intervallwahrscheinlichkeit aus einer Verteilungsfunktion ergibt das Subtrahieren des Werts am unteren Endpunkt vom oberen F(5) − F(2) = 0,9 − 0,5 = 0,4."
        },

        // ── 9. ZÄHLDICHTE (Probability Mass Function) ─────────────────────────────

        {
            q: 'A discrete Random Variable X has PMF p(1)=0.2, p(2)=0.5, p(3)=0.3. What is p(2)? Round to 3 decimal places.',
            qDE: 'Eine diskrete Zufallsvariable X hat die Zähldichte p(1)=0,2, p(2)=0,5, p(3)=0,3. Was ist p(2)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'The PMF directly gives P(X=2) = p(2)',
            hintDE: 'Die Zähldichte gibt direkt P(X=2) = p(2)',
            explain: "The PMF value at a point is by definition the probability of that exact outcome, so p(2) is simply given as 0.5.",
            explainDE: "Der Wert der Zähldichte an einer Stelle ist per Definition die Wahrscheinlichkeit dieses exakten Ergebnisses, sodass p(2) einfach als 0,5 gegeben ist."
        },
        {
            q: 'A PMF must sum to 1. If p(1)=0.3 and p(2)=0.3, and X only takes values 1, 2, 3, what is p(3)? Round to 3 decimal places.',
            qDE: 'Eine Zähldichte muss 1 ergeben. Wenn p(1)=0,3 und p(2)=0,3 und X nur Werte 1,2,3 annimmt, was ist p(3)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'p(3) = 1 − 0.3 − 0.3',
            hintDE: 'p(3) = 1 − 0,3 − 0,3',
            explain: "Since the PMF must sum to 1 across all possible values, the missing probability is p(3) = 1 − 0.3 − 0.3 = 0.4.",
            explainDE: "Da sich die Zähldichte über alle möglichen Werte zu 1 summieren muss, ist die fehlende Wahrscheinlichkeit p(3) = 1 − 0,3 − 0,3 = 0,4."
        },
        {
            q: 'X has PMF p(k) = c · k for k = 1, 2, 3, 4. What must c be so that all probabilities sum to 1? Round to 3 decimal places.',
            qDE: 'X hat Zähldichte p(k) = c · k für k = 1,2,3,4. Welchen Wert muss c haben, damit sich alle Wahrscheinlichkeiten zu 1 addieren? Runde auf 3 Nachkommastellen.',
            answer: 0.1, tolerance: 0.001, unit: '',
            hintEn: 'c(1+2+3+4) = 1',
            hintDE: 'c(1+2+3+4) = 1',
            explain: "Summing p(k) over all k gives c(1+2+3+4) = 10c, and setting this equal to 1 yields c = 1/10 = 0.1.",
            explainDE: "Das Summieren von p(k) über alle k ergibt c(1+2+3+4) = 10c, und das Gleichsetzen mit 1 liefert c = 1/10 = 0,1."
        },

        // ── 10. VERTEILUNGSFUNKTION (Cumulative Distribution Function) ────────────

        {
            q: 'X has PMF p(1)=0.2, p(2)=0.3, p(3)=0.5. What is F(2) = P(X ≤ 2)? Round to 3 decimal places.',
            qDE: 'X hat Zähldichte p(1)=0,2, p(2)=0,3, p(3)=0,5. Was ist F(2) = P(X ≤ 2)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'F(2) = p(1) + p(2)',
            hintDE: 'F(2) = p(1) + p(2)',
            explain: "The CDF at 2 accumulates all probability mass at or below 2: F(2) = p(1) + p(2) = 0.2 + 0.3 = 0.5.",
            explainDE: "Die Verteilungsfunktion bei 2 kumuliert die gesamte Wahrscheinlichkeitsmasse bei oder unterhalb von 2: F(2) = p(1) + p(2) = 0,2 + 0,3 = 0,5."
        },
        {
            q: 'A distribution function satisfies F(+∞) = ?',
            qDE: 'Eine Verteilungsfunktion erfüllt F(+∞) = ?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'By definition...',
            hintDE: 'Per Definition...',
            explain: "As x goes to infinity, the CDF must accumulate all the probability mass of the distribution, which by definition totals 1.",
            explainDE: "Wenn x gegen unendlich geht, muss die Verteilungsfunktion die gesamte Wahrscheinlichkeitsmasse der Verteilung kumulieren, die per Definition insgesamt 1 beträgt."
        },
        {
            q: 'F(x) is a CDF. Which value is impossible for F(x)? Enter 1 for 0, 2 for −0.2, 3 for 0.7, or 4 for 1.',
            qDE: 'F(x) ist eine Verteilungsfunktion. Welcher Wert ist unmöglich für F(x)? Gib 1 für 0, 2 für −0,2, 3 für 0,7 oder 4 für 1 ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'A CDF satisfies 0 ≤ F(x) ≤ 1 for all x',
            hintDE: 'Eine Verteilungsfunktion erfüllt 0 ≤ F(x) ≤ 1 für alle x',
            explain: "Since a CDF is a probability and must always lie between 0 and 1, a negative value like −0.2 is impossible, unlike 0, 0.7, or 1. The correct entry is therefore 2.",
            explainDE: "Da eine Verteilungsfunktion eine Wahrscheinlichkeit ist und stets zwischen 0 und 1 liegen muss, ist ein negativer Wert wie −0,2 unmöglich, im Gegensatz zu 0, 0,7 oder 1. Die richtige Eingabe ist daher 2."
        },



        // ── 11. QUANTILFUNKTION (Quantile Function) ───────────────────────────────

        {
            q: 'X has the distribution function F with F(1)=0.2, F(2)=0.5, F(3)=1.0. What is the 0.5-quantile (median) of X?',
            qDE: 'X hat die Verteilungsfunktion F mit F(1)=0,2, F(2)=0,5, F(3)=1,0. Was ist das 0,5-Quantil (Median) von X?',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Q(p) = min{x : F(x) ≥ p}. For p=0.5: F(2)=0.5 ≥ 0.5.',
            hintDE: 'Q(p) = min{x : F(x) ≥ p}. Für p=0,5: F(2)=0,5 ≥ 0,5.',
            explain: "The quantile function finds the smallest x where the CDF reaches at least p; here F(1)=0.2 is too small, but F(2)=0.5 already meets the threshold, so Q(0.5) = 2.",
            explainDE: "Die Quantilfunktion findet das kleinste x, bei dem die Verteilungsfunktion mindestens p erreicht; hier ist F(1)=0,2 zu klein, aber F(2)=0,5 erreicht bereits die Schwelle, sodass Q(0,5) = 2 ist."
        },
        {
            q: 'X has the distribution function F with F(1)=0.1, F(2)=0.4, F(3)=0.8, F(4)=1.0. What is the 0.75-quantile of X?',
            qDE: 'X hat die Verteilungsfunktion F mit F(1)=0,1, F(2)=0,4, F(3)=0,8, F(4)=1,0. Was ist das 0,75-Quantil von X?',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'Q(0.75) = min{x : F(x) ≥ 0.75}. F(2)=0.4 < 0.75.',
            hintDE: 'Q(0,75) = min{x : F(x) ≥ 0,75}. F(2)=0,4 < 0,75.',
            explain: "Checking each value in order: F(1)=0.1 and F(2)=0.4 both fall short of 0.75, but F(3)=0.8 finally clears the threshold, so Q(0.75) = 3.",
            explainDE: "Prüft man jeden Wert der Reihe nach: F(1)=0,1 und F(2)=0,4 liegen beide unter 0,75, doch F(3)=0,8 überschreitet schließlich die Schwelle, sodass Q(0,75) = 3 ist."
        },
        {
            q: 'The 0.25-quantile of X is the smallest x with F(x) ≥ 0.25. Given F(1)=0.3, what is Q(0.25) where Q is the quantile function?',
            qDE: 'Das 0,25-Quantil von X ist das kleinste x mit F(x) ≥ 0,25. Gegeben F(1)=0,3, was ist Q(0,25) wenn Q die Quantilfunktion ist?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'F(1) = 0.3 ≥ 0.25.',
            hintDE: 'F(1) = 0,3 ≥ 0,25.',
            explain: "Since F(1) = 0.3 already meets or exceeds the required 0.25 threshold, and 1 is the smallest such x available, Q(0.25) = 1.",
            explainDE: "Da F(1) = 0,3 die erforderliche Schwelle von 0,25 bereits erreicht oder überschreitet und 1 das kleinste verfügbare x ist, gilt Q(0,25) = 1."
        },

        // ── 12. STETIGE ZUFALLSVARIABLE UND DICHTEFUNKTION (Continuous RV / PDF) ──

        {
            q: 'X has density function f(x) = 2x for x ∈ [0,1], 0 otherwise. What is P(0 ≤ X ≤ 1)?',
            qDE: 'X hat Dichtefunktion f(x) = 2x für x ∈ [0,1], sonst 0. Was ist P(0 ≤ X ≤ 1)?',
            answer: 1, tolerance: 0.001, unit: '',
            hintEn: 'Calculate the integral.',
            hintDE: 'Berechne das Integral.',
            explain: "Integrating the density over its entire support gives ∫₀¹ 2x dx = [x²]₀¹ = 1, confirming this is a valid density that covers the full probability of 1.",
            explainDE: "Das Integrieren der Dichte über ihren gesamten Träger ergibt ∫₀¹ 2x dx = [x²]₀¹ = 1, was bestätigt, dass dies eine gültige Dichte ist, die die volle Wahrscheinlichkeit von 1 abdeckt."
        },
        {
            q: 'X has density function f(x) = 2x for x ∈ [0,1]. What is P(0 ≤ X ≤ 0.5)? Round to 3 decimal places.',
            qDE: 'X hat Dichtefunktion f(x) = 2x für x ∈ [0,1]. Was ist P(0 ≤ X ≤ 0,5)? Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'Calculate the integral.',
            hintDE: 'Berechne das Integral.',
            explain: "Integrating the density from 0 to 0.5 gives ∫₀^0.5 2x dx = [x²]₀^0.5 = 0.25.",
            explainDE: "Das Integrieren der Dichte von 0 bis 0,5 ergibt ∫₀^0,5 2x dx = [x²]₀^0,5 = 0,25."
        },
        {
            q: 'For a continuous random variable X, what is P(X = 3)?',
            qDE: 'Was ist P(X = 3) für eine stetige Zufallsvariable X?',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Calculate the integral.',
            hintDE: 'Berechne das Integral.',
            explain: "For continuous distributions, the probability of hitting any single exact point is the integral over a zero-width interval, which is always 0.",
            explainDE: "Bei stetigen Verteilungen ist die Wahrscheinlichkeit, genau einen einzelnen Punkt zu treffen, das Integral über ein Intervall der Breite null, was stets 0 ergibt."
        },

        // ── 13. EXPONENTIALVERTEILUNG (Exponential Distribution CDF) ─────────────

        {
            q: 'X ~ Exp(1). Calculate the value of the distribution function of X at x=1. Enter as a decimal rounded to 3 places. (Use e ≈ 2.718)',
            qDE: 'X ~ Exp(1). Berechne den Wert der Verteilungsfunktion von X an der Stelle x=1. Gib auf 3 Stellen gerundet an. (e ≈ 2,718)',
            answer: 0.632, tolerance: 0.005, unit: '',
            hintEn: 'F(x) = 1 − e^(−x)',
            hintDE: 'F(x) = 1 − e^(−x)',
            explain: "Plugging x = 1 into the exponential CDF gives F(1) = 1 − e^(−1) ≈ 1 − 0.368 = 0.632.",
            explainDE: "Setzt man x = 1 in die Verteilungsfunktion der Exponentialverteilung ein, ergibt sich F(1) = 1 − e^(−1) ≈ 1 − 0,368 = 0,632."
        },
        {
            q: 'X ~ Exp(2). What is P(X > 1)? Enter as a decimal rounded to 3 places. (Use e ≈ 2.718)',
            qDE: 'X ~ Exp(2). Verteilungsfunktion: F(x) = 1 − e^(−2x) für x ≥ 0. Was ist P(X > 1)? Gib auf 3 Stellen gerundet an. (e ≈ 2,718)',
            answer: 0.135, tolerance: 0.005, unit: '',
            hintEn: 'F(x) = 1 − e^(−2x) for x ≥ 0.',
            hintDE: 'F(x) = 1 − e^(−2x) für x ≥ 0.',
            explain: "Since P(X > 1) = 1 − F(1), and F(1) = 1 − e^(−2), this simplifies directly to e^(−2) ≈ 0.135.",
            explainDE: "Da P(X > 1) = 1 − F(1) und F(1) = 1 − e^(−2) ist, vereinfacht sich dies direkt zu e^(−2) ≈ 0,135."
        },
        {
            q: 'X ~ Exp(λ). What is F(0), the distribution function F evaluated at x = 0?',
            qDE: 'X ~ Exp(λ). Was ist F(0) für die Verteilungsfunktion von X?',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'F(0) = 1 − e^(−λ·0)',
            hintDE: 'F(0) = 1 − e^(−λ·0)',
            explain: "Since e^0 = 1 for any λ, plugging x = 0 into the formula gives F(0) = 1 − 1 = 0, matching the fact that a CDF must start at 0.",
            explainDE: "Da e^0 = 1 für jedes λ ist, ergibt das Einsetzen von x = 0 in die Formel F(0) = 1 − 1 = 0, was damit übereinstimmt, dass eine Verteilungsfunktion bei 0 beginnen muss."
        },

    ],

    
    // ── WORLD 4 ─────────────────────────────────────────────────────────
    4: [


        // ── 1. DICHTETRANSFORMATIONSSATZ (Density Transformation Theorem) ─────────

        {
            q: 'X has density function f_X(x) = 1 for x ∈ [0,1]. Y = 2X. What is the density function f_Y(y) for y ∈ [0,2]? Enter the constant value of f_Y.',
            qDE: 'X hat Dichtefunktion f_X(x) = 1 für x ∈ [0,1]. Y = 2X. Was ist die Dichte f_Y(y) für y ∈ [0,2]? Gib den konstanten Wert von f_Y ein.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'For Y = aX: f_Y(y) = f_X(y/a) · (1/|a|).',
            hintDE: 'Für Y = aX: f_Y(y) = f_X(y/a) · (1/|a|).',
            explain: "For a linear transformation Y = aX, the density scales by 1/|a|: f_Y(y) = f_X(y/2)·(1/2) = 1×0.5 = 0.5.",
            explainDE: "Bei einer linearen Transformation Y = aX skaliert die Dichte mit 1/|a|: f_Y(y) = f_X(y/2)·(1/2) = 1×0,5 = 0,5."
        },
        {
            q: 'X has density function f_X(x) = 2x for x ∈ [0,1]. Y = 3X. What is f_Y(y) for y ∈ [0,3]? Enter the coefficient c where f_Y(y) = c·y. Round to 3 decimal places.',
            qDE: 'X hat Dichtefunktion f_X(x) = 2x für x ∈ [0,1]. Y = 3X. Was ist f_Y(y) für y ∈ [0,3]? Gib den Koeffizienten c an, sodass f_Y(y) = c·y gilt. Runde auf 3 Nachkommastellen.',
            answer: 0.222, tolerance: 0.005, unit: '',
            hintEn: 'f_Y(y) = f_X(y/3) · (1/3)',
            hintDE: 'f_Y(y) = f_X(y/3) · (1/3)',
            explain: "Substituting y/3 into f_X and scaling by 1/3 gives f_Y(y) = 2(y/3)·(1/3) = (2/9)y, so c = 2/9 ≈ 0.222.",
            explainDE: "Setzt man y/3 in f_X ein und skaliert mit 1/3, ergibt sich f_Y(y) = 2(y/3)·(1/3) = (2/9)y, also c = 2/9 ≈ 0,222."
        },
        {
            q: 'X ~ U[0,1]. Y = X². Calculate the density f_Y of Y. What is f_Y(0.25)? Enter as a decimal.',
            qDE: 'X ~ U[0,1]. Y = X². Bestimme die Dichte f_Y von Y. Was ist f_Y(0,25)? Gib als Dezimalzahl ein.',
            answer: 1.0, tolerance: 0.01, unit: '',
            hintEn: 'The transformation theorem gives f_Y(y) = 1/(2√y) for y ∈ [0,1]',
            hintDE: 'Der Transformationssatz liefert f_Y(y) = 1/(2√y) für y ∈ [0,1].',
            explain: "Using the transformation theorem for Y = X² with f_X = 1, f_Y(y) = 1/(2√y); at y = 0.25 this gives 1/(2×0.5) = 1.",
            explainDE: "Mit dem Transformationssatz für Y = X² und f_X = 1 gilt f_Y(y) = 1/(2√y); bei y = 0,25 ergibt das 1/(2×0,5) = 1."
        },

        // ── 2. UNABHÄNGIGKEIT VON ZUFALLSVARIABLEN ────────────────────────────────

        {
            q: 'X and Y are independent. P(X=1)=0.4, P(Y=1)=0.5. What is P(X=1, Y=1)? Round to 3 decimal places.',
            qDE: 'X und Y sind unabhängig. P(X=1)=0,4, P(Y=1)=0,5. Was ist P(X=1, Y=1)? Runde auf 3 Nachkommastellen.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: 'Independence: P(X=1, Y=1) = P(X=1) · P(Y=1)',
            hintDE: 'Unabhängigkeit: P(X=1, Y=1) = P(X=1) · P(Y=1)',
            explain: "Since X and Y are independent, the joint probability is the product of the marginals: 0.4 × 0.5 = 0.2.",
            explainDE: "Da X und Y unabhängig sind, ist die gemeinsame Wahrscheinlichkeit das Produkt der Randwahrscheinlichkeiten: 0,4 × 0,5 = 0,2."
        },
        {
            q: 'X and Y are independent with density functions f_X and f_Y. If f_X(x)=2x on [0,1] and f_Y(y)=1 on [0,1], what is f_{X,Y}(1, 0.5)?',
            qDE: 'X und Y sind unabhängig. Wenn f_X(x)=2x auf [0,1] und f_Y(y)=1 auf [0,1], was ist dann f_{X,Y}(1; 0,5)?',
            answer: 2.0, tolerance: 0.001, unit: '',
            hintEn: 'f_{X,Y}(1, 0.5) = f_X(1) · f_Y(0.5)',
            hintDE: 'f_{X,Y}(1; 0,5) = f_X(1) · f_Y(0,5)',
            explain: "For independent random variables, the joint density factors as f_X(x)·f_Y(y): f_X(1)·f_Y(0.5) = 2×1 = 2.",
            explainDE: "Bei unabhängigen Zufallsvariablen faktorisiert die gemeinsame Dichte als f_X(x)·f_Y(y): f_X(1)·f_Y(0,5) = 2×1 = 2."
        },
        {
            q: 'X and Y are independent. E[X]=3, E[Y]=4. What is E[X·Y]?',
            qDE: 'X und Y sind unabhängig. E[X]=3, E[Y]=4. Was ist E[X·Y]?',
            answer: 12, tolerance: 0, unit: '',
            hintEn: 'For independent Random Variables we have E[X·Y] = E[X] · E[Y]',
            hintDE: 'Für unabhängige Zufallsvariablen gilt E[X·Y] = E[X] · E[Y]',
            explain: "Independence lets the expectation of the product factor into the product of expectations: E[X]·E[Y] = 3×4 = 12.",
            explainDE: "Unabhängigkeit erlaubt es, den Erwartungswert des Produkts in das Produkt der Erwartungswerte zu zerlegen: E[X]·E[Y] = 3×4 = 12."
        },

        // ── 3. KONTINGENZTABELLE FÜR UNABHÄNGIGKEIT ──────────────────────────────

        {
            q: 'We have P(X=0,Y=0)=0.12, P(X=0)=0.4, P(Y=0)=0.3. Are X,Y independent? Enter 1 for yes (independent), 0 for no (dependent).',
            qDE: 'Wir haben P(X=0,Y=0)=0,12, P(X=0)=0,4, P(Y=0)=0,3. Sind X,Y unabhängig? Gib 1 für ja (unabhängig), 0 für nein (abhängig) ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'P(X=0)·P(Y=0) = 0.4 × 0.3 = 0.12 = P(X=0, Y=0)',
            hintDE: 'P(X=0)·P(Y=0) = 0,4 × 0,3 = 0,12 = P(X=0, Y=0)',
            explain: "Checking the independence condition P(X=0)·P(Y=0) = 0.4×0.3 = 0.12, which matches the given joint probability, so X and Y are independent.",
            explainDE: "Beim Prüfen der Unabhängigkeitsbedingung P(X=0)·P(Y=0) = 0,4×0,3 = 0,12, was mit der gegebenen gemeinsamen Wahrscheinlichkeit übereinstimmt, sodass X und Y unabhängig sind."
        },
        {
            q: 'We have P(X=1,Y=1)=0.3, P(X=1)=0.5, P(Y=1)=0.5. Are X and Y independent? Enter 1 for yes, 0 for no.',
            qDE: 'Wir haben P(X=1,Y=1)=0,3, P(X=1)=0,5, P(Y=1)=0,5. Sind X und Y unabhängig? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'P(X=1)·P(Y=1) = 0.5 × 0.5 = 0.25 ≠ 0.3',
            hintDE: 'P(X=1)·P(Y=1) = 0,5 × 0,5 = 0,25 ≠ 0,3',
            explain: "The product of the marginals P(X=1)·P(Y=1) = 0.5×0.5 = 0.25 does not match the given joint probability 0.3, so X and Y are not independent.",
            explainDE: "Das Produkt der Randwahrscheinlichkeiten P(X=1)·P(Y=1) = 0,5×0,5 = 0,25 stimmt nicht mit der gegebenen gemeinsamen Wahrscheinlichkeit 0,3 überein, sodass X und Y nicht unabhängig sind."
        },
        {
            q: 'In a 2×2 contingency table, P(X=0)=0.6, P(Y=1)=0.4. If X and Y are independent, what must P(X=0, Y=1) equal? Round to 3 decimal places.',
            qDE: 'In einer 2×2-Kontingenztabelle: P(X=0)=0,6, P(Y=1)=0,4. Wenn X und Y unabhängig sind, welchen Wert muss P(X=0, Y=1) haben? Runde auf 3 Nachkommastellen.',
            answer: 0.24, tolerance: 0.001, unit: '',
            hintEn: 'Independence criterion: P(X=0, Y=1) = P(X=0) · P(Y=1)',
            hintDE: 'Unabhängigkeitskriterium: P(X=0, Y=1) = P(X=0) · P(Y=1)',
            explain: "Under independence, the joint probability is the product of the marginals: P(X=0)·P(Y=1) = 0.6×0.4 = 0.24.",
            explainDE: "Bei Unabhängigkeit ist die gemeinsame Wahrscheinlichkeit das Produkt der Randwahrscheinlichkeiten: P(X=0)·P(Y=1) = 0,6×0,4 = 0,24."
        },

        // ── 4. KRITERIUM FÜR UNABHÄNGIGKEIT ──────────────────────────────────────

        {
            q: 'For X and Y to be independent, the joint density must equal what? Enter 1 for p(x,y)=p_X(x)·p_Y(y), or 2 for p(x,y)=p_X(x)+p_Y(y).',
            qDE: 'Damit X und Y unabhängig sind, muss die gemeinsame Zähldichte was erfüllen? Gib 1 für p(x,y)=p_X(x)·p_Y(y) oder 2 für p(x,y)=p_X(x)+p_Y(y) ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Independence criterion: the joint probability equals the product of the marginals.',
            hintDE: 'Unabhängigkeitskriterium: die gemeinsame Wahrscheinlichkeit ist gleich dem Produkt der Randwahrscheinlichkeiten.',
            explain: "By definition, independence of discrete random variables requires the joint probability mass function to factor as the product of the marginal mass functions.",
            explainDE: "Per Definition erfordert die Unabhängigkeit diskreter Zufallsvariablen, dass die gemeinsame Zähldichte als Produkt der Rand-Zähldichten faktorisiert."
        },
        {
            q: 'p_X(0)=0.5, p_X(1)=0.5, p_Y(0)=0.4, p_Y(1)=0.6. If independent, what is p(X=1, Y=0)? Round to 3 decimal places.',
            qDE: 'p_X(0)=0,5, p_X(1)=0,5, p_Y(0)=0,4, p_Y(1)=0,6. Falls X,Y unabhängig sind, was ist dann p(X=1, Y=0)? Runde auf 3 Nachkommastellen.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: 'p(X=1, Y=0) = p_X(1) · p_Y(0)',
            hintDE: 'p(X=1, Y=0) = p_X(1) · p_Y(0)',
            explain: "Assuming independence, the joint probability is the product of the marginals: p_X(1)·p_Y(0) = 0.5×0.4 = 0.2.",
            explainDE: "Unter der Annahme der Unabhängigkeit ist die gemeinsame Wahrscheinlichkeit das Produkt der Randwahrscheinlichkeiten: p_X(1)·p_Y(0) = 0,5×0,4 = 0,2."
        },
        {
            q: 'To verify independence from a contingency table with values p(0,0)=0.2, p(0,1)=0.3, p(1,0)=0.2, p(1,1)=0.3, first find p_X(0). Round to 3 decimal places.',
            qDE: 'Zur Unabhängigkeitsprüfung in einer Kontingenztabelle mit p(0,0)=0,2, p(0,1)=0,3, p(1,0)=0,2, p(1,1)=0,3 bestimme zuerst p_X(0). Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'Marginal: p_X(0) = p(0,0) + p(0,1)',
            hintDE: 'Randverteilung: p_X(0) = p(0,0) + p(0,1)',
            explain: "The marginal probability is found by summing the joint probabilities over all values of Y: p_X(0) = p(0,0) + p(0,1) = 0.2 + 0.3 = 0.5.",
            explainDE: "Die Randwahrscheinlichkeit erhält man durch Summieren der gemeinsamen Wahrscheinlichkeiten über alle Werte von Y: p_X(0) = p(0,0) + p(0,1) = 0,2 + 0,3 = 0,5."
        },

        // ── 5. STANDARDNORMALVERTEILUNG ───────────────────────────────────────────

        {
            q: 'Z ~ N(0,1). What is P(Z ≤ 1.0)? Round to 3 decimal places.',
            qDE: 'Z ~ N(0,1). Was ist P(Z ≤ 1,0)? Runde auf 3 Nachkommastellen.',
            answer: 0.841, tolerance: 0.001, unit: '',
            hintEn: 'Φ(z) = P(Z ≤ z) by definition. Check a quantile table.',
            hintDE: 'Φ(z) = P(Z ≤ z) per Definition. Schaue in einer Quantiltabelle nach.',
            explain: "This is read directly from the standard normal CDF table: Φ(1.0) ≈ 0.841.",
            explainDE: "Dies wird direkt aus der Tabelle der Standardnormalverteilung abgelesen: Φ(1,0) ≈ 0,841."
        },
        {
            q: 'Z ~ N(0,1). What is P(Z > 1.0)? Round to 3 decimal places.',
            qDE: 'Z ~ N(0,1). Was ist P(Z > 1,0)? Runde auf 3 Nachkommastellen.',
            answer: 0.159, tolerance: 0.002, unit: '',
            hintEn: 'P(Z > 1) = 1 − Φ(1) = 1 − 0.841',
            hintDE: 'P(Z > 1) = 1 − Φ(1) = 1 − 0,841',
            explain: "Using the complement rule, P(Z > 1) = 1 − Φ(1) = 1 − 0.841 = 0.159.",
            explainDE: "Mit der Komplementregel gilt P(Z > 1) = 1 − Φ(1) = 1 − 0,841 = 0,159."
        },
        {
            q: 'Z ~ N(0,1). Using symmetry Φ(−z) = 1 − Φ(z) and Φ(1.0) ≈ 0.841. What is P(−1 ≤ Z ≤ 1)? Round to 3 decimal places.',
            qDE: 'Z ~ N(0,1). Mit Φ(−z) = 1 − Φ(z) und Φ(1,0) ≈ 0,841, was ist P(−1 ≤ Z ≤ 1)? Runde auf 3 Nachkommastellen.',
            answer: 0.682, tolerance: 0.002, unit: '',
            hintEn: 'P(−1 ≤ Z ≤ 1) = Φ(1) − Φ(−1) = 0.841 − (1−0.841)',
            hintDE: 'P(−1 ≤ Z ≤ 1) = Φ(1) − Φ(−1) = 0,841 − (1−0,841)',
            explain: "By symmetry of the standard normal distribution, P(−1 ≤ Z ≤ 1) = Φ(1) − Φ(−1) = 0.841 − (1−0.841) = 0.682.",
            explainDE: "Durch die Symmetrie der Standardnormalverteilung gilt P(−1 ≤ Z ≤ 1) = Φ(1) − Φ(−1) = 0,841 − (1−0,841) = 0,682."
        },

        // ── 6. ERWARTUNGSWERT DISKRET UND STETIG ──────────────────────────────────

        {
            q: 'X has density P(X=1)=0.2, P(X=2)=0.5, P(X=3)=0.3. What is E[X]? Round to 3 decimal places.',
            qDE: 'X hat Zähldichte P(X=1)=0,2, P(X=2)=0,5, P(X=3)=0,3. Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 2.1, tolerance: 0.001, unit: '',
            hintEn: 'E[X] = 1·0.2 + 2·0.5 + 3·0.3',
            hintDE: 'E[X] = 1·0,2 + 2·0,5 + 3·0,3',
            explain: "The expected value weights each outcome by its probability: E[X] = 1×0.2 + 2×0.5 + 3×0.3 = 2.1.",
            explainDE: "Der Erwartungswert gewichtet jedes Ergebnis mit seiner Wahrscheinlichkeit: E[X] = 1×0,2 + 2×0,5 + 3×0,3 = 2,1."
        },
        {
            q: 'X has density f(x) = 2x for x ∈ [0,1]. What is E[X]? Round to 3 decimal places.',
            qDE: 'X hat Dichtefunktion f(x) = 2x für x ∈ [0,1]. Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 0.667, tolerance: 0.005, unit: '',
            hintEn: 'Integrate x*2x from 0 to 1',
            hintDE: 'Integriere x*2x von 0 bis 1',
            explain: "For continuous variables, E[X] = ∫x·f(x)dx; integrating x·2x from 0 to 1 gives [2x³/3]₀¹ = 2/3 ≈ 0.667.",
            explainDE: "Bei stetigen Variablen gilt E[X] = ∫x·f(x)dx; das Integrieren von x·2x von 0 bis 1 ergibt [2x³/3]₀¹ = 2/3 ≈ 0,667."
        },
        {
            q: 'A fair die is rolled. What is E[X]? Round to 3 decimal places.',
            qDE: 'Ein fairer Würfel wird geworfen. Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 3.5, tolerance: 0.001, unit: '',
            hintEn: 'E[X] = (1+2+3+4+5+6)/6',
            hintDE: 'E[X] = (1+2+3+4+5+6)/6',
            explain: "Each face is equally likely, so the expected value is the simple average of all outcomes: (1+2+3+4+5+6)/6 = 3.5.",
            explainDE: "Jede Seite ist gleich wahrscheinlich, sodass der Erwartungswert der einfache Durchschnitt aller Ergebnisse ist: (1+2+3+4+5+6)/6 = 3,5."
        },

        // ── 7. BERNOULLI VERTEILUNG ───────────────────────────────────────────────

        {
            q: 'X ~ Ber(p) with p=0.3. What is E[X]? Round to 3 decimal places.',
            qDE: 'X ~ Ber(p) mit p=0,3. Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'For X ~ Ber(p): E[X] = p',
            hintDE: 'Für X ~ Ber(p): E[X] = p',
            explain: "For a Bernoulli random variable, the expected value equals its success probability directly: E[X] = p = 0.3.",
            explainDE: "Bei einer Bernoulli-verteilten Zufallsvariable entspricht der Erwartungswert direkt der Erfolgswahrscheinlichkeit: E[X] = p = 0,3."
        },
        {
            q: 'X ~ Ber(p) with p=0.7. What is Var(X)? Round to 3 decimal places.',
            qDE: 'X ~ Ber(p) mit p=0,7. Was ist Var(X)? Runde auf 3 Nachkommastellen.',
            answer: 0.21, tolerance: 0.001, unit: '',
            hintEn: 'Var(X) = p(1−p)',
            hintDE: 'Var(X) = p(1−p)',
            explain: "The variance of a Bernoulli random variable is p(1−p): 0.7×0.3 = 0.21.",
            explainDE: "Die Varianz einer Bernoulli-verteilten Zufallsvariable ist p(1−p): 0,7×0,3 = 0,21."
        },
        {
            q: 'X ~ Ber(p). What is P(X=1)? Enter 1 for p, 2 for 1−p, 3 for p².',
            qDE: 'X ~ Ber(p). Was ist P(X=1)? Gib 1 für p, 2 für 1−p, 3 für p² ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Definition of the Bernoulli distribution',
            hintDE: 'Definition der Bernoulli-Verteilung',
            explain: "By definition of the Bernoulli distribution, X takes the value 1 with probability p.",
            explainDE: "Per Definition der Bernoulli-Verteilung nimmt X den Wert 1 mit Wahrscheinlichkeit p an."
        },

        // ── 8. ERWARTUNGSWERT RECHENREGELN ────────────────────────────────────────

        {
            q: 'E[X]=3. What is E[2X + 5]?',
            qDE: 'E[X]=3. Was ist E[2X + 5]?',
            answer: 11, tolerance: 0, unit: '',
            hintEn: 'Linearity',
            hintDE: 'Linearität',
            explain: "By linearity of expectation, E[2X+5] = 2E[X] + 5 = 2×3 + 5 = 11.",
            explainDE: "Durch die Linearität des Erwartungswerts gilt E[2X+5] = 2E[X] + 5 = 2×3 + 5 = 11."
        },
        {
            q: 'E[X]=2, E[Y]=4. What is E[3X − Y + 1]?',
            qDE: 'E[X]=2, E[Y]=4. Was ist E[3X − Y + 1]?',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'Linearity',
            hintDE: 'Linearität',
            explain: "By linearity of expectation, E[3X−Y+1] = 3E[X] − E[Y] + 1 = 3×2 − 4 + 1 = 3.",
            explainDE: "Durch die Linearität des Erwartungswerts gilt E[3X−Y+1] = 3E[X] − E[Y] + 1 = 3×2 − 4 + 1 = 3."
        },
        {
            q: 'f is convex. Jensen\'s inequality states E[f(X)] ≥ f(E[X]). If f(x)=x², E[X]=3, E[X²]=14. Does E[X²] ≥ (E[X])²? Enter 1 for yes, 0 for no.',
            qDE: 'f ist konvex. Die Jensen-Ungleichung besagt E[f(X)] ≥ f(E[X]). Wenn f(x)=x², E[X]=3, E[X²]=14, gilt dann E[X²] ≥ (E[X])²? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: '(E[X])² = 9, E[X²] = 14 ≥ 9 ✓. Jensen holds for convex f.',
            hintDE: '(E[X])² = 9, E[X²] = 14 ≥ 9 ✓. Jensen gilt für konvexes f.',
            explain: "Since (E[X])² = 3² = 9 and E[X²] = 14, the inequality E[X²] ≥ (E[X])² holds, consistent with Jensen's inequality for the convex function f(x)=x².",
            explainDE: "Da (E[X])² = 3² = 9 und E[X²] = 14 ist, gilt die Ungleichung E[X²] ≥ (E[X])², was mit der Jensen-Ungleichung für die konvexe Funktion f(x)=x² übereinstimmt."
        },

        // ── 9. PRODUKTEIGENSCHAFT FÜR UNABHÄNGIGE ZV ─────────────────────────────

        {
            q: 'X and Y are independent. E[X]=5, E[Y]=3. What is E[X·Y]?',
            qDE: 'X und Y sind unabhängig. E[X]=5, E[Y]=3. Was ist E[X·Y]?',
            answer: 15, tolerance: 0, unit: '',
            hintEn: 'For independent X, Y: E[XY] = E[X]·E[Y]',
            hintDE: 'Für unabhängige X, Y: E[XY] = E[X]·E[Y]',
            explain: "Because X and Y are independent, the expectation of their product factors: E[X]·E[Y] = 5×3 = 15.",
            explainDE: "Da X und Y unabhängig sind, faktorisiert der Erwartungswert ihres Produkts: E[X]·E[Y] = 5×3 = 15."
        },
        {
            q: 'X and Y are independent with E[X]=2, E[Y]=6, E[X²]=5. What is E[X²·Y]?',
            qDE: 'X und Y sind unabhängig mit E[X]=2, E[Y]=6, E[X²]=5. Was ist E[X²·Y]?',
            answer: 30, tolerance: 0, unit: '',
            hintEn: 'g(X)=X² and Y are also independent',
            hintDE: 'g(X)=X² und Y sind ebenfalls unabhängig',
            explain: "Since g(X)=X² is a function of X alone, it remains independent of Y, so E[X²·Y] = E[X²]·E[Y] = 5×6 = 30.",
            explainDE: "Da g(X)=X² allein eine Funktion von X ist, bleibt sie unabhängig von Y, sodass E[X²·Y] = E[X²]·E[Y] = 5×6 = 30 gilt."
        },
        {
            q: 'X and Y are NOT independent and E[X]=2, E[Y]=3. Can we conclude E[XY]=6? Enter 1 for yes, 0 for no.',
            qDE: 'X und Y sind NICHT unabhängig und E[X]=2, E[Y]=3. Können wir E[XY]=6 schlussfolgern? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'E[XY] = E[X]·E[Y] holds only for independent random variables',
            hintDE: 'E[XY] = E[X]·E[Y] gilt nur für unabhängige Zufallsvariablen',
            explain: "The factorization E[XY] = E[X]·E[Y] only holds under independence; without it, nothing can be concluded about E[XY] from the marginal expectations alone.",
            explainDE: "Die Faktorisierung E[XY] = E[X]·E[Y] gilt nur bei Unabhängigkeit; ohne diese lässt sich aus den einzelnen Erwartungswerten allein nichts über E[XY] schlussfolgern."
        },

        // ── 10. VARIANZ UND STANDARDABWEICHUNG ───────────────────────────────────

        {
            q: 'X has E[X]=4, E[X²]=20. What is Var(X)?',
            qDE: 'X hat E[X]=4, E[X²]=20. Was ist Var(X)?',
            answer: 4, tolerance: 0, unit: '',
            hintEn: 'Var(X) = E[X²] − (E[X])²',
            hintDE: 'Var(X) = E[X²] − (E[X])²',
            explain: "Applying the computational formula for variance: Var(X) = E[X²] − (E[X])² = 20 − 16 = 4.",
            explainDE: "Mit der Berechnungsformel für die Varianz: Var(X) = E[X²] − (E[X])² = 20 − 16 = 4."
        },
        {
            q: 'Var(X) = 9. What is the standard deviation σ(X)?',
            qDE: 'Var(X) = 9. Was ist die Standardabweichung σ(X)?',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'σ(X) = √Var(X)',
            hintDE: 'σ(X) = √Var(X)',
            explain: "The standard deviation is the square root of the variance: σ(X) = √9 = 3.",
            explainDE: "Die Standardabweichung ist die Quadratwurzel der Varianz: σ(X) = √9 = 3."
        },
        {
            q: 'X has density P(X=0)=0.5, P(X=2)=0.5. What is Var(X)?',
            qDE: 'X hat Zähldichte P(X=0)=0,5, P(X=2)=0,5. Was ist Var(X)?',
            answer: 1, tolerance: 0.001, unit: '',
            hintEn: 'E[X]=1, E[X²]=0·0.5+4·0.5=2',
            hintDE: 'E[X]=1, E[X²]=0·0,5+4·0,5=2',
            explain: "First compute E[X] = 0×0.5+2×0.5 = 1 and E[X²] = 0×0.5+4×0.5 = 2, then Var(X) = E[X²] − (E[X])² = 2 − 1 = 1.",
            explainDE: "Zunächst berechnet man E[X] = 0×0,5+2×0,5 = 1 und E[X²] = 0×0,5+4×0,5 = 2, dann Var(X) = E[X²] − (E[X])² = 2 − 1 = 1."
        },

        // ── 11. VERSCHIEBUNGSSATZ (Computational Formula for Variance) ────────────

        {
            q: 'E[X]=5, E[X²]=30. What is Var(X)?',
            qDE: 'E[X]=5, E[X²]=30. Was ist Var(X)?',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'Shift Theorem',
            hintDE: 'Verschiebungssatz',
            explain: "Using the shift theorem: Var(X) = E[X²] − (E[X])² = 30 − 25 = 5.",
            explainDE: "Mit dem Verschiebungssatz: Var(X) = E[X²] − (E[X])² = 30 − 25 = 5."
        },
        {
            q: 'E[X]=3, Var(X)=7. What is E[X²]?',
            qDE: 'E[X]=3, Var(X)=7. Was ist E[X²]?',
            answer: 16, tolerance: 0, unit: '',
            hintEn: 'E[X²] = Var(X) + (E[X])²',
            hintDE: 'E[X²] = Var(X) + (E[X])²',
            explain: "Rearranging the shift theorem gives E[X²] = Var(X) + (E[X])² = 7 + 9 = 16.",
            explainDE: "Das Umstellen des Verschiebungssatzes ergibt E[X²] = Var(X) + (E[X])² = 7 + 9 = 16."
        },
        {
            q: 'X ~ Ber(0.4), E[X]=0.4, E[X²]=0.4. What is Var(X)? Round to 3 decimal places.',
            qDE: 'X ~ Ber(0,4), E[X]=0,4, E[X²]=0,4. Was ist Var(X)? Runde auf 3 Nachkommastellen.',
            answer: 0.24, tolerance: 0.001, unit: '',
            hintEn: 'Var(X) = E[X²] − (E[X])²',
            hintDE: 'Var(X) = E[X²] − (E[X])²',
            explain: "Applying the shift theorem: Var(X) = E[X²] − (E[X])² = 0.4 − 0.16 = 0.24.",
            explainDE: "Mit dem Verschiebungssatz: Var(X) = E[X²] − (E[X])² = 0,4 − 0,16 = 0,24."
        },

        // ── 12. RECHENREGELN FÜR VARIANZ ─────────────────────────────────────────

        {
            q: 'Var(X)=4. What is Var(3X)?',
            qDE: 'Var(X)=4. Was ist Var(3X)?',
            answer: 36, tolerance: 0, unit: '',
            hintEn: 'Var(aX) = a²·Var(X)',
            hintDE: 'Var(aX) = a²·Var(X)',
            explain: "Scaling a random variable by a constant scales its variance by the square of that constant: Var(3X) = 3²×Var(X) = 9×4 = 36.",
            explainDE: "Skaliert man eine Zufallsvariable mit einer Konstante, skaliert die Varianz mit dem Quadrat dieser Konstante: Var(3X) = 3²×Var(X) = 9×4 = 36."
        },
        {
            q: 'Var(X)=4. What is Var(X + 7)?',
            qDE: 'Var(X)=4. Was ist Var(X + 7)?',
            answer: 4, tolerance: 0, unit: '',
            hintEn: 'Adding a constant does not change variance: Var(X+c) = Var(X).',
            hintDE: 'Eine Konstante addieren ändert die Varianz nicht: Var(X+c) = Var(X).',
            explain: "Adding a constant shifts the distribution but does not change its spread, so Var(X+7) = Var(X) = 4.",
            explainDE: "Das Addieren einer Konstante verschiebt die Verteilung, ändert aber nicht ihre Streuung, sodass Var(X+7) = Var(X) = 4 gilt."
        },
        {
            q: 'X and Y are independent with Var(X)=3, Var(Y)=5. What is Var(X+Y)?',
            qDE: 'X und Y sind unabhängig mit Var(X)=3, Var(Y)=5. Was ist Var(X+Y)?',
            answer: 8, tolerance: 0, unit: '',
            hintEn: 'For independent X, Y: Var(X+Y) = Var(X) + Var(Y)',
            hintDE: 'Für unabhängige X, Y: Var(X+Y) = Var(X) + Var(Y)',
            explain: "For independent random variables, variances add: Var(X+Y) = Var(X) + Var(Y) = 3 + 5 = 8.",
            explainDE: "Bei unabhängigen Zufallsvariablen addieren sich die Varianzen: Var(X+Y) = Var(X) + Var(Y) = 3 + 5 = 8."
        },

        // ── 13. TRANSFORMATIONSSATZ FÜR ERWARTUNGSWERT ───────────────────────────

        {
            q: 'X has density P(X=1)=0.4, P(X=2)=0.6. What is E[X²]? Round to 3 decimal places.',
            qDE: 'X hat Zähldichte P(X=1)=0,4, P(X=2)=0,6. Was ist E[X²]? Runde auf 3 Nachkommastellen.',
            answer: 2.8, tolerance: 0.001, unit: '',
            hintEn: 'E[g(X)] = Σ g(x)·p(x). E[X²]',
            hintDE: 'E[g(X)] = Σ g(x)·p(x). E[X²]',
            explain: "Applying the transformation theorem for expectation: E[X²] = 1²×0.4 + 2²×0.6 = 0.4 + 2.4 = 2.8.",
            explainDE: "Mit dem Transformationssatz für den Erwartungswert: E[X²] = 1²×0,4 + 2²×0,6 = 0,4 + 2,4 = 2,8."
        },
        {
            q: 'X has density P(X=0)=0.3, P(X=1)=0.5, P(X=2)=0.2. What is E[X²]? Round to 3 decimal places.',
            qDE: 'X hat Zähldichte P(X=0)=0,3, P(X=1)=0,5, P(X=2)=0,2. Was ist E[X²]? Runde auf 3 Nachkommastellen.',
            answer: 1.3, tolerance: 0.001, unit: '',
            hintEn: 'E[X²] = 0²·0.3 + 1²·0.5 + 2²·0.2',
            hintDE: 'E[X²] = 0²·0,3 + 1²·0,5 + 2²·0,2',
            explain: "Summing the squared values weighted by their probabilities: E[X²] = 0²×0.3 + 1²×0.5 + 2²×0.2 = 0.5 + 0.8 = 1.3.",
            explainDE: "Das Summieren der quadrierten Werte gewichtet mit ihren Wahrscheinlichkeiten ergibt: E[X²] = 0²×0,3 + 1²×0,5 + 2²×0,2 = 0,5 + 0,8 = 1,3."
        },
        {
            q: 'X ~ U[0,1]. What is E[X²]? Enter as a decimal rounded to 3 places.',
            qDE: 'X ~ U[0,1]. Was ist E[X²]? Gib auf 3 Dezimalstellen gerundet an.',
            answer: 0.333, tolerance: 0.002, unit: '',
            hintEn: 'Transformation Theorem',
            hintDE: 'Transformationssatz',
            explain: "Integrating x²·f(x) over the support gives E[X²] = ∫₀¹x²dx = [x³/3]₀¹ = 1/3 ≈ 0.333.",
            explainDE: "Das Integrieren von x²·f(x) über den Träger ergibt E[X²] = ∫₀¹x²dx = [x³/3]₀¹ = 1/3 ≈ 0,333."
        },

        // ── 14. BINOMIALVERTEILUNG ────────────────────────────────────────────────

        {
            q: 'X ~ Bin(5,0.5). What is E[X]? Round to 3 decimal places.',
            qDE: 'X ~ Bin(5,0,5). Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 2.5, tolerance: 0.001, unit: '',
            hintEn: 'E[X] = n·p',
            hintDE: 'E[X] = n·p',
            explain: "For a binomial random variable, the expected value is the product of the number of trials and the success probability: E[X] = n·p = 5×0.5 = 2.5.",
            explainDE: "Bei einer binomialverteilten Zufallsvariable ist der Erwartungswert das Produkt aus Anzahl der Versuche und Erfolgswahrscheinlichkeit: E[X] = n·p = 5×0,5 = 2,5."
        },
        {
            q: 'X ~ Bin(4,0.5). What is P(X=2)? Round to 3 decimal places.',
            qDE: 'X ~ Bin(4,0,5). Was ist P(X=2)? Runde auf 3 Nachkommastellen.',
            answer: 0.375, tolerance: 0.002, unit: '',
            hintEn: 'P(X=2) = binomialcoefficient(4,2)·0.5²·0.5²',
            hintDE: 'P(X=2) = binomialkoeffizient(4,2)·0,5²·0,5²',
            explain: "Using the binomial PMF, P(X=2) = C(4,2)·0.5²·0.5² = 6×0.0625 = 0.375.",
            explainDE: "Mit der Zähldichte der Binomialverteilung gilt P(X=2) = C(4,2)·0,5²·0,5² = 6×0,0625 = 0,375."
        },
        {
            q: 'X ~ Bin(10,0.3). What is Var(X)? Round to 3 decimal places.',
            qDE: 'X ~ Bin(10,0,3). Was ist Var(X)? Runde auf 3 Nachkommastellen.',
            answer: 2.1, tolerance: 0.001, unit: '',
            hintEn: 'Var(X) = n·p·(1−p)',
            hintDE: 'Var(X) = n·p·(1−p)',
            explain: "The variance of a binomial random variable is n·p·(1−p): 10×0.3×0.7 = 2.1.",
            explainDE: "Die Varianz einer binomialverteilten Zufallsvariable ist n·p·(1−p): 10×0,3×0,7 = 2,1."
        },

        // ── 15. FALTUNG BEI BINOMIALVERTEILUNG (Convolution) ─────────────────────

        {
            q: 'X ~ Bin(3, 0.4) and Y ~ Bin(2, 0.4) are independent. The distribution of X+Y is then Bin(n,0.4). What is n?',
            qDE: 'X ~ Bin(3; 0,4) und Y ~ Bin(2; 0,4) sind unabhängig. Die Verteilung von X+Y ist dann Bin(n,0.4). Was ist n?',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'Convolution',
            hintDE: 'Faltung',
            explain: "The sum of two independent binomial random variables with the same success probability is itself binomial, with the numbers of trials added: n = 3 + 2 = 5.",
            explainDE: "Die Summe zweier unabhängiger binomialverteilter Zufallsvariablen mit gleicher Erfolgswahrscheinlichkeit ist selbst binomialverteilt, wobei sich die Versuchszahlen addieren: n = 3 + 2 = 5."
        },
        {
            q: 'X ~ Bin(4, 0.6) and Y ~ Bin(6, 0.6) are independent. E[X+Y] = ?',
            qDE: 'X ~ Bin(4; 0,6) und Y ~ Bin(6; 0,6) sind unabhängig. E[X+Y] = ?',
            answer: 6, tolerance: 0, unit: '',
            hintEn: 'X+Y ~ Bin(10, 0.6)',
            hintDE: 'X+Y ~ Bin(10; 0,6)',
            explain: "Since X+Y ~ Bin(10, 0.6) by convolution, its expectation is E[X+Y] = 10×0.6 = 6.",
            explainDE: "Da X+Y durch Faltung ~ Bin(10; 0,6) ist, gilt für den Erwartungswert E[X+Y] = 10×0,6 = 6."
        },
        {
            q: 'X ~ Bin(8, p) and Y ~ Bin(3, p) are independent. X+Y follows Bin(?, p). Enter the first parameter.',
            qDE: 'X ~ Bin(n, p) und Y ~ Bin(m, p) sind unabhängig. X+Y folgt Bin(?, p). Gib den ersten Parameter ein.',
            answer: 11, tolerance: 0, unit: '',
            hintEn: 'The convolution of two binomials with the same p gives Bin(n+m, p).',
            hintDE: 'Die Faltung zweier Binomialverteilungen mit gleichem p ergibt Bin(n+m, p).',
            explain: "By the convolution property of binomial distributions sharing the same p, the combined number of trials is simply n + m = 8 + 3 = 11.",
            explainDE: "Durch die Faltungseigenschaft von Binomialverteilungen mit gleichem p ergibt sich die kombinierte Versuchszahl einfach als n + m = 8 + 3 = 11."
        },

        // ── 16. URNENMODELL OHNE REIHENFOLGE OHNE ZURÜCKLEGEN ────────────────────

        {
            q: 'An urn has 6 balls. How many ways can you choose 2 balls without replacement, ignoring order?',
            qDE: 'Eine Urne hat 6 Bälle. Wie viele Möglichkeiten gibt es, 2 Bälle ohne Zurücklegen zu ziehen, wenn die Reihenfolge egal ist?',
            answer: 15, tolerance: 0, unit: 'ways',
            hintEn: 'C(6,2) for the binomial coefficient C',
            hintDE: 'C(6,2) für den Binomialkoeffizient C',
            explain: "The number of ways to choose 2 items from 6 without regard to order is given by the binomial coefficient C(6,2) = 15.",
            explainDE: "Die Anzahl der Möglichkeiten, 2 Elemente aus 6 ohne Berücksichtigung der Reihenfolge zu wählen, ist der Binomialkoeffizient C(6,2) = 15."
        },
        {
            q: 'An urn has 10 balls: 4 red, 6 blue. Two balls are drawn without replacement, order ignored. How many ways give 2 red balls?',
            qDE: 'Eine Urne hat 10 Bälle: 4 rote, 6 blaue. Zwei Bälle werden ohne Zurücklegen gezogen, Reihenfolge egal. Wie viele Möglichkeiten liefern 2 rote Bälle?',
            answer: 6, tolerance: 0, unit: 'ways',
            hintEn: 'C(4,2) for the binomial coefficient C',
            hintDE: 'C(4,2) für den Binomialkoeffizient C',
            explain: "The number of ways to select 2 red balls from the 4 available, ignoring order, is C(4,2) = 6.",
            explainDE: "Die Anzahl der Möglichkeiten, 2 rote Bälle aus den 4 verfügbaren auszuwählen, ohne Reihenfolge, ist C(4,2) = 6."
        },
        {
            q: 'Urn: 5 red, 5 blue balls; draw 3 without replacement, order ignored. Total outcomes 120. How many outcomes have exactly 2 red balls?',
            qDE: 'Urne: 5 rote, 5 blaue Bälle; 3 ohne Zurücklegen ziehen, Reihenfolge egal. 120 Gesamtergebnisse. Wie viele Ergebnisse haben genau 2 rote Bälle?',
            answer: 50, tolerance: 0, unit: 'outcomes',
            hintEn: 'C(5,2)·C(5,1) for the binomial coefficient C',
            hintDE: 'C(5,2)·C(5,1) für den Binomialkoeffizient C',
            explain: "The number of favorable outcomes combines choosing 2 of the 5 red balls with 1 of the 5 blue balls: C(5,2)·C(5,1) = 10×5 = 50.",
            explainDE: "Die Anzahl der günstigen Ergebnisse ergibt sich aus der Wahl von 2 der 5 roten Bälle und 1 der 5 blauen Bälle: C(5,2)·C(5,1) = 10×5 = 50."
        },

        // ── 17. URNENMODELL OHNE REIHENFOLGE MIT ZURÜCKLEGEN ─────────────────────

        {
            q: 'An urn has 4 balls. You draw 2 with replacement, ignoring order. How many distinct unordered outcomes are possible?',
            qDE: 'Eine Urne hat 4 Bälle. Du ziehst 2 mit Zurücklegen, Reihenfolge egal. Wie viele verschiedene ungeordnete Ergebnisse sind möglich?',
            answer: 10, tolerance: 0, unit: 'outcomes',
            hintEn: 'With replacement, no order: C(n+k−1, k) = C(4+2−1, 2) for the binomial coefficient C',
            hintDE: 'Mit Zurücklegen, ohne Reihenfolge: C(n+k−1, k) = C(4+2−1, 2) für den Binomialkoeffizient C.',
            explain: "For sampling with replacement and no regard to order, the number of outcomes is C(n+k−1, k) = C(4+2−1, 2) = C(5,2) = 10.",
            explainDE: "Beim Ziehen mit Zurücklegen und ohne Berücksichtigung der Reihenfolge ist die Anzahl der Ergebnisse C(n+k−1, k) = C(4+2−1, 2) = C(5,2) = 10."
        },
        {
            q: 'An urn has 3 colours. You draw 3 times with replacement, order ignored. How many distinct colour combinations are possible?',
            qDE: 'Eine Urne hat 3 Farben. Du ziehst 3 Mal mit Zurücklegen, Reihenfolge egal. Wie viele verschiedene Farbkombinationen sind möglich?',
            answer: 10, tolerance: 0, unit: 'combinations',
            hintEn: 'C(n+k−1, k) = C(3+3−1, 3) for the binomial coefficient C',
            hintDE: 'C(n+k−1, k) = C(3+3−1, 3) für den Binomialkoeffizient C',
            explain: "Using the stars-and-bars formula for sampling with replacement and no order: C(n+k−1, k) = C(3+3−1, 3) = C(5,3) = 10.",
            explainDE: "Mit der Stars-and-Bars-Formel für das Ziehen mit Zurücklegen ohne Reihenfolge: C(n+k−1, k) = C(3+3−1, 3) = C(5,3) = 10."
        },
        {
            q: 'Urn with replacement, no order: n=5 balls, draw k=2. How many unordered outcomes? C(n+k−1, k) = C(6,2) = ?',
            qDE: 'Urne mit Zurücklegen, ohne Reihenfolge: n=5 Bälle, k=2 Züge. Wie viele ungeordnete Ergebnisse? C(n+k−1, k) = C(6,2) = ?',
            answer: 15, tolerance: 0, unit: 'outcomes',
            hintEn: 'C(6,2) for the binomial coefficient C',
            hintDE: 'C(6,2) für den Binomialkoeffizienten C ',
            explain: "Applying the same formula, C(n+k−1, k) = C(5+2−1, 2) = C(6,2) = 15.",
            explainDE: "Mit derselben Formel gilt C(n+k−1, k) = C(5+2−1, 2) = C(6,2) = 15."
        },
    ],


    // ── WORLD 5 ─────────────────────────────────────────────────────────
    //
    5: [

        // ── 1. HYPERGEOMETRISCHE VERTEILUNG ──────────────────────────────────────────
        {
            q: 'An urn has 10 balls: 4 red, 6 blue. Draw 3 without replacement. What is P(exactly 2 red)? Round to 3 decimal places.',
            qDE: 'Eine Urne hat 10 Bälle: 4 rote, 6 blaue. Ziehe 3 ohne Zurücklegen. P(genau 2 rote)? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'C(4,2)·C(6,1)/C(10,3) for the binomial coefficient C',
            hintDE: 'C(4,2)·C(6,1)/C(10,3) für den Binomialkoeffizient C',
            explain: "This follows the hypergeometric formula, combining the ways to choose 2 of the 4 red balls with 1 of the 6 blue balls, divided by all ways to choose 3 from 10: C(4,2)·C(6,1)/C(10,3) = 6×6/120 = 0.3.",
            explainDE: "Dies folgt der hypergeometrischen Formel: die Möglichkeiten, 2 der 4 roten Bälle mit 1 der 6 blauen zu kombinieren, geteilt durch alle Möglichkeiten, 3 aus 10 zu wählen: C(4,2)·C(6,1)/C(10,3) = 6×6/120 = 0,3."
        },
        {
            q: 'Urn with N=8 balls, K=3 red, draw n=2 without replacement. What is E[X] where X = number of red balls drawn? Round to 3 decimal places.',
            qDE: 'Urne mit N=8 Bällen, K=3 rote, ziehe n=2 ohne Zurücklegen. Was ist E[X], wobei X = Anzahl roter Bälle? Runde auf 3 Nachkommastellen.',
            answer: 0.75, tolerance: 0.001, unit: '',
            hintEn: 'E[X] = n·K/N',
            hintDE: 'E[X] = n·K/N',
            explain: "For the hypergeometric distribution, the expected value is E[X] = n·K/N = 2×3/8 = 0.75.",
            explainDE: "Bei der hypergeometrischen Verteilung ist der Erwartungswert E[X] = n·K/N = 2×3/8 = 0,75."
        },

        // ── 2. GEOMETRISCHE VERTEILUNG ────────────────────────────────────────────────
        {
            q: 'X ~ Ge(0.4): number of trials until first success. What is P(X=3)? Round to 3 decimal places.',
            qDE: 'X ~ Geo(0,4): Anzahl Versuche bis zum ersten Erfolg. Was ist P(X=3)? Runde auf 3 Nachkommastellen.',
            answer: 0.144, tolerance: 0.002, unit: '',
            hintEn: 'P(X=3) = 0.6²·0.4',
            hintDE: 'P(X=3) = 0,6²·0,4',
            explain: "The geometric distribution requires two failures followed by a success: P(X=3) = (1−p)²·p = 0.6²×0.4 = 0.144.",
            explainDE: "Die geometrische Verteilung erfordert zwei Misserfolge gefolgt von einem Erfolg: P(X=3) = (1−p)²·p = 0,6²×0,4 = 0,144."
        },
        {
            q: 'X ~ Geom(0.25). What is E[X]?',
            qDE: 'X ~ Geo(0,25). Was ist E[X]?',
            answer: 4, tolerance: 0, unit: '',
            hintEn: 'E[X] = 1/p',
            hintDE: 'E[X] = 1/p',
            explain: "For the geometric distribution, the expected number of trials until the first success is E[X] = 1/p = 1/0.25 = 4.",
            explainDE: "Bei der geometrischen Verteilung ist die erwartete Anzahl an Versuchen bis zum ersten Erfolg E[X] = 1/p = 1/0,25 = 4."
        },
        {
            q: 'X ~ Geo(0.5). What is P(X > 3)? Round to 3 decimal places.',
            qDE: 'X ~ Geo(p=0,5). Was ist P(X > 3)? Runde auf 3 Nachkommastellen.',
            answer: 0.125, tolerance: 0.001, unit: '',
            hintEn: 'P(X > 3) = (1−0.5)³.',
            hintDE: 'P(X > 3) = (1−0,5)³',
            explain: "P(X > 3) means the first 3 trials are all failures: P(X > 3) = (1−p)³ = 0.5³ = 0.125.",
            explainDE: "P(X > 3) bedeutet, dass die ersten 3 Versuche alle Misserfolge sind: P(X > 3) = (1−p)³ = 0,5³ = 0,125."
        },

        // ── 3. BERNOULLI-FOLGE ────────────────────────────────────────────────────────
        {
            q: 'A Bernoulli sequence has p=0.3. What is the probability of the pattern S-F-S (success, failure, success) in exactly that order? Enter as a decimal. Round to 3 decimal places.',
            qDE: 'Eine Bernoulli-Folge hat p=0,3. Was ist die Wahrscheinlichkeit des Musters E-M-E (Erfolg, Misserfolg, Erfolg) in genau dieser Reihenfolge? Runde auf 3 Nachkommastellen.',
            answer: 0.063, tolerance: 0.001, unit: '',
            hintEn: 'P = p·(1−p)·p',
            hintDE: 'P = p·(1−p)·p',
            explain: "Since trials in a Bernoulli sequence are independent, the probability of a specific pattern is the product of each trial's probability: 0.3×0.7×0.3 = 0.063.",
            explainDE: "Da die Versuche in einer Bernoulli-Folge unabhängig sind, ist die Wahrscheinlichkeit eines bestimmten Musters das Produkt der Einzelwahrscheinlichkeiten: 0,3×0,7×0,3 = 0,063."
        },
        {
            q: 'In a Bernoulli sequence with p=0.5, what is the probability of getting exactly 3 successes in 5 trials? Round to 3 decimal places.',
            qDE: 'In einer Bernoulli-Folge mit p=0,5: Was ist die Wahrscheinlichkeit von genau 3 Erfolgen in 5 Versuchen? Runde auf 3 Nachkommastellen.',
            answer: 0.3125, tolerance: 0.001, unit: '',
            hintEn: 'C(5,3)·0.5³·0.5² with C as binomial coefficient.',
            hintDE: 'C(5,3)·0,5³·0,5² mit C als Binomialkoeffizient',
            explain: "This is a binomial probability: C(5,3)·p³·(1−p)² = 10×0.125×0.25 = 0.3125.",
            explainDE: "Dies ist eine Binomialwahrscheinlichkeit: C(5,3)·p³·(1−p)² = 10×0,125×0,25 = 0,3125."
        },
        {
            q: 'A Bernoulli sequence has p=0.2. What is the probability that the first success occurs on trial 4 or later? Round to 3 decimal places.',
            qDE: 'Eine Bernoulli-Folge hat p=0,2. Was ist P(X ≥ 4), d.h. der erste Erfolg tritt frühestens beim 4. Versuch auf? Runde auf 3 Nachkommastellen.',
            answer: 0.512, tolerance: 0.001, unit: '',
            hintEn: 'P(X ≥ 4) = (1−p)³',
            hintDE: 'P(X ≥ 4) = (1−p)³',
            explain: "The first success occurs on trial 4 or later only if the first 3 trials are all failures: P(X ≥ 4) = (1−p)³ = 0.8³ = 0.512.",
            explainDE: "Der erste Erfolg tritt nur dann beim 4. Versuch oder später auf, wenn die ersten 3 Versuche alle Misserfolge sind: P(X ≥ 4) = (1−p)³ = 0,8³ = 0,512."
        },

        // ── 4. NEGATIVE BINOMIALVERTEILUNG ───────────────────────────────────────────
        {
            q: 'X ~ NegBin(r=2, p=0.5): number of trials until 2nd success. What is P(X=4)? Round to 3 decimal places.',
            qDE: 'X ~ NegBin(r=2, p=0,5): Anzahl Versuche bis zum 2. Erfolg. Was ist P(X=4)? Runde auf 3 Nachkommastellen.',
            answer: 0.1875, tolerance: 0.002, unit: '',
            hintEn: 'P(X=4) = C(3,1)·0.5²·0.5² with C as binomial coefficient',
            hintDE: 'P(X=4) = C(3,1)·0,5²·0,5² mit C als Binomialkoeffizient',
            explain: "The negative binomial PMF requires the 2nd success to fall exactly on trial 4, meaning exactly 1 success among the first 3 trials, followed by a success: P(X=4) = C(3,1)·p²·(1−p)² = 3×0.25×0.25 = 0.1875.",
            explainDE: "Die Zähldichte der negativen Binomialverteilung erfordert, dass der 2. Erfolg genau beim 4. Versuch eintritt, d.h. genau 1 Erfolg unter den ersten 3 Versuchen, gefolgt von einem Erfolg: P(X=4) = C(3,1)·p²·(1−p)² = 3×0,25×0,25 = 0,1875."
        },
        {
            q: 'X ~ NegBin(r=3, p=0.4). What is E[X]? Round to 3 decimal places.',
            qDE: 'X ~ NegBin(r=3, p=0,4). Was ist E[X]? Runde auf 3 Nachkommastellen.',
            answer: 7.5, tolerance: 0.001, unit: '',
            hintEn: 'E[X] = r/p',
            hintDE: 'E[X] = r/p',
            explain: "For the negative binomial distribution, the expected number of trials until the r-th success is E[X] = r/p = 3/0.4 = 7.5.",
            explainDE: "Bei der negativen Binomialverteilung ist die erwartete Anzahl an Versuchen bis zum r-ten Erfolg E[X] = r/p = 3/0,4 = 7,5."
        },
        {
            q: 'X ~ NegBin(r=2, p=0.5). What is Var(X)? Enter as a decimal.',
            qDE: 'X ~ NegBin(r=2, p=0,5). Was ist Var(X)? Gib als Dezimalzahl ein.',
            answer: 4.0, tolerance: 0.001, unit: '',
            hintEn: 'Var(X) = 2·0.5/0.25.',
            hintDE: 'Var(X) = 2·0,5/0,25.',
            explain: "The variance of the negative binomial distribution is Var(X) = r(1−p)/p² = 2×0.5/0.25 = 4.",
            explainDE: "Die Varianz der negativen Binomialverteilung ist Var(X) = r(1−p)/p² = 2×0,5/0,25 = 4."
        },

        // ── 5. POISSONVERTEILUNG ──────────────────────────────────────────────────────
        {
            q: 'X ~ Poi(3). What is P(X=0)? Round to 3 decimal places.',
            qDE: 'X ~ Poi(3). Was ist P(X=0)? Runde auf 3 Nachkommastellen.',
            answer: 0.0498, tolerance: 0.001, unit: '',
            hintEn: 'P(X=0) = e^(−3)·3⁰/0!',
            hintDE: 'P(X=0) = e^(−3)·3⁰/0!',
            explain: "The Poisson PMF at 0 reduces to e^(−λ): P(X=0) = e^(−3)·3⁰/0! = e^(−3) ≈ 0.0498.",
            explainDE: "Die Zähldichte der Poissonverteilung reduziert sich bei 0 auf e^(−λ): P(X=0) = e^(−3)·3⁰/0! = e^(−3) ≈ 0,0498."
        },
        {
            q: 'X ~ Poi(2). What is P(X=2)? Round to 3 decimal places.',
            qDE: 'X ~ Poi(2). Was ist P(X=2)? Runde auf 3 Nachkommastellen.',
            answer: 0.2707, tolerance: 0.002, unit: '',
            hintEn: 'P(X=2) = e^(−2)·2²/2!',
            hintDE: 'P(X=2) = e^(−2)·2²/2!',
            explain: "Plugging into the Poisson PMF: P(X=2) = e^(−2)·2²/2! = e^(−2)×2 ≈ 0.2707.",
            explainDE: "Einsetzen in die Zähldichte der Poissonverteilung: P(X=2) = e^(−2)·2²/2! = e^(−2)×2 ≈ 0,2707."
        },
        {
            q: 'X ~ Poi(5). What is E[X] and Var(X)? Enter the value.',
            qDE: 'X ~ Poi(5). Was sind E[X] und Var(X)? Gib den Wert ein.',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'For Poi(λ): E[X] = Var(X)',
            hintDE: 'Für Poi(λ): E[X] = Var(X)',
            explain: "A defining property of the Poisson distribution is that both its expected value and its variance equal the parameter λ: E[X] = Var(X) = 5.",
            explainDE: "Eine charakteristische Eigenschaft der Poissonverteilung ist, dass sowohl Erwartungswert als auch Varianz gleich dem Parameter λ sind: E[X] = Var(X) = 5."
        },

        // ── 6. POISSON-GRENZWERTSATZ ──────────────────────────────────────────────────
        {
            q: 'X ~ Bin(100,0.03). Approximate using Poisson. What is λ? Round to 3 decimal places.',
            qDE: 'X ~ Bin(100,0,03). Approximiere durch die Poissonverteilung an. Was ist λ? Runde auf 3 Nachkommastellen.',
            answer: 3.0, tolerance: 0.001, unit: '',
            hintEn: 'λ = n·p = 100·0.03.',
            hintDE: 'λ = n·p = 100·0,03.',
            explain: "In the Poisson approximation to the binomial, the rate parameter is λ = n·p = 100×0.03 = 3.",
            explainDE: "Bei der Poisson-Approximation der Binomialverteilung ist der Ratenparameter λ = n·p = 100×0,03 = 3."
        },
        {
            q: 'X ~ Bin(200,0.01). Using the Poisson approximation with λ=n·p, what is P(X=0)? Round to 3 decimal places.',
            qDE: 'X ~ Bin(200,0,01). Mit der Poisson-Näherung λ=n·p: Was ist P(X=0)? Runde auf 3 Nachkommastellen.',
            answer: 0.1353, tolerance: 0.002, unit: '',
            hintEn: 'λ = 2. P(X=0).',
            hintDE: 'λ = 2. P(X=0).',
            explain: "With λ = n·p = 200×0.01 = 2, the Poisson approximation gives P(X=0) = e^(−2) ≈ 0.1353.",
            explainDE: "Mit λ = n·p = 200×0,01 = 2 ergibt die Poisson-Näherung P(X=0) = e^(−2) ≈ 0,1353."
        },
        {
            q: 'For the Poisson limit theorem, the approximation Bin(n,p) ≈ Poi(λ) is good when n is large and p is small. If n=1000 and λ=2, what is p? Round to 4 decimal places.',
            qDE: 'Für den Poisson-Grenzwertsatz gilt Bin(n,p) ≈ Poi(λ) gut, wenn n groß und p klein ist. Wenn n=1000 und λ=2, was ist p? Runde auf 4 Nachkommastellen.',
            answer: 0.002, tolerance: 0.0001, unit: '',
            hintEn: 'p = λ/n',
            hintDE: 'p = λ/n',
            explain: "Rearranging λ = n·p gives p = λ/n = 2/1000 = 0.002.",
            explainDE: "Das Umstellen von λ = n·p ergibt p = λ/n = 2/1000 = 0,002."
        },

        // ── 7. STETIGE GLEICHVERTEILUNG ───────────────────────────────────────────────
        {
            q: 'X ~ U[2, 8]. What is E[X]? Enter as a whole number.',
            qDE: 'X ~ U[2, 8]. Was ist E[X]? Gib eine ganze Zahl ein.',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'E[X] = (a+b)/2',
            hintDE: 'E[X] = (a+b)/2',
            explain: "For a uniform distribution, the expected value is the midpoint of the interval: E[X] = (a+b)/2 = (2+8)/2 = 5.",
            explainDE: "Bei einer Gleichverteilung ist der Erwartungswert der Mittelpunkt des Intervalls: E[X] = (a+b)/2 = (2+8)/2 = 5."
        },
        {
            q: 'X ~ U[0, 10]. What is P(3 ≤ X ≤ 7)? Round to 3 decimal places.',
            qDE: 'X ~ U[0, 10]. Was ist P(3 ≤ X ≤ 7)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(3 ≤ X ≤ 7) = (7−3)/(10−0)',
            hintDE: 'P(3 ≤ X ≤ 7) = (7−3)/(10−0)',
            explain: "For a uniform distribution, probability over a subinterval is proportional to its length relative to the whole interval: (7−3)/(10−0) = 0.4.",
            explainDE: "Bei einer Gleichverteilung ist die Wahrscheinlichkeit eines Teilintervalls proportional zu dessen Länge im Verhältnis zum Gesamtintervall: (7−3)/(10−0) = 0,4."
        },
        {
            q: 'X ~ U[a, b]. For a=0, b=6, what is Var(X)? Enter as a whole number.',
            qDE: 'X ~ U[a, b]. Für a=0, b=6: Was ist Var(X)? Gib eine ganze Zahl ein.',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'Var(X) = (6−0)²/12',
            hintDE: 'Var(X) = (6−0)²/12',
            explain: "The variance of a uniform distribution is Var(X) = (b−a)²/12 = (6−0)²/12 = 3.",
            explainDE: "Die Varianz einer Gleichverteilung ist Var(X) = (b−a)²/12 = (6−0)²/12 = 3."
        },

        // ── 8. EXPONENTIALVERTEILUNG ──────────────────────────────────────────────────
        {
            q: 'X ~ Exp(0.5). What is E[X]? Enter as a whole number.',
            qDE: 'X ~ Exp(0,5). Was ist E[X]? Gib eine ganze Zahl ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'E[X] = 1/λ',
            hintDE: 'E[X] = 1/λ',
            explain: "For the exponential distribution, the expected value is the reciprocal of the rate: E[X] = 1/λ = 1/0.5 = 2.",
            explainDE: "Bei der Exponentialverteilung ist der Erwartungswert der Kehrwert der Rate: E[X] = 1/λ = 1/0,5 = 2."
        },
        {
            q: 'X ~ Exp(2). What is P(X ≤ 1)? Round to 3 decimal places.',
            qDE: 'X ~ Exp(λ=2). Was ist P(X ≤ 1)? Runde auf 3 Nachkommastellen.',
            answer: 0.8647, tolerance: 0.002, unit: '',
            hintEn: 'F(1) = 1 − e^(−2)',
            hintDE: 'F(1) = 1 − e^(−2)',
            explain: "Using the exponential CDF: P(X ≤ 1) = 1 − e^(−λ·1) = 1 − e^(−2) ≈ 0.8647.",
            explainDE: "Mit der Verteilungsfunktion der Exponentialverteilung: P(X ≤ 1) = 1 − e^(−λ·1) = 1 − e^(−2) ≈ 0,8647."
        },
        {
            q: 'X ~ Exp(3). What is Var(X)? Enter as a decimal rounded to 2 places.',
            qDE: 'X ~ Exp(3). Was ist Var(X)? Auf 2 Stellen runden.',
            answer: 0.11, tolerance: 0.02, unit: '',
            hintEn: 'Var(X) = 1/λ² = 1/9.',
            hintDE: 'Var(X) = 1/λ² = 1/9.',
            explain: "The variance of the exponential distribution is Var(X) = 1/λ² = 1/9 ≈ 0.11.",
            explainDE: "Die Varianz der Exponentialverteilung ist Var(X) = 1/λ² = 1/9 ≈ 0,11."
        },

        // ── 9. NORMALVERTEILUNG ───────────────────────────────────────────────────────
        {
            q: 'X ~ N(10, 4). What is the standard deviation σ? Enter as a whole number.',
            qDE: 'X ~ N(10, 4). Was ist die Standardabweichung σ? Gib eine ganze Zahl ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'σ = √σ²',
            hintDE: 'σ = √σ²',
            explain: "The standard deviation is the square root of the variance parameter: σ = √4 = 2.",
            explainDE: "Die Standardabweichung ist die Quadratwurzel des Varianzparameters: σ = √4 = 2."
        },

        {
            q: 'X ~ N(0,1). What is P(−1.96 ≤ X ≤ 1.96)? Round to 3 decimal places.',
            qDE: 'X ~ N(μ=0, σ=1). Was ist P(−1,96 ≤ X ≤ 1,96)? Runde auf 3 Nachkommastellen.',
            answer: 0.95, tolerance: 0.002, unit: '',
            hintEn: 'P(−1.96 ≤ Z ≤ 1.96) = Φ(1.96) − Φ(−1.96) ',
            hintDE: 'P(−1,96 ≤ Z ≤ 1,96) = Φ(1,96) − Φ(−1,96) ',
            explain: "This is the well-known 95% interval of the standard normal distribution: Φ(1.96) − Φ(−1.96) ≈ 0.975 − 0.025 = 0.95.",
            explainDE: "Dies ist das bekannte 95%-Intervall der Standardnormalverteilung: Φ(1,96) − Φ(−1,96) ≈ 0,975 − 0,025 = 0,95."
        },

        // ── 10. RECHNEN MIT NORMALVERTEILTEN ZUFALLSVARIABLEN ─────────────────────────
        {
            q: 'X ~ N(3,1), Y ~ N(2,4), independent. What is the distribution of X+Y? Give E[X+Y].',
            qDE: 'X ~ N(3, 1), Y ~ N(2,4), unabhängig. Welche Verteilung hat X+Y? Gib E[X+Y] an.',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'E(X+Y)=E(X)+E(Y)',
            hintDE: 'E(X+Y)=E(X)+E(Y)',
            explain: "By linearity of expectation, E[X+Y] = E[X] + E[Y] = 3 + 2 = 5.",
            explainDE: "Durch die Linearität des Erwartungswerts gilt E[X+Y] = E[X] + E[Y] = 3 + 2 = 5."
        },
        {
            q: 'X ~ N(3,1), Y ~ N(2,4), independent. What is Var(X+Y)?',
            qDE: 'X ~ N(3,1), Y ~ N(2,4), unabhängig. Was ist Var(X+Y)?',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'Var(X+Y) = Var(X) + Var(Y)',
            hintDE: 'Var(X+Y) = Var(X) + Var(Y)',
            explain: "For independent random variables, variances add: Var(X+Y) = Var(X) + Var(Y) = 1 + 4 = 5.",
            explainDE: "Bei unabhängigen Zufallsvariablen addieren sich die Varianzen: Var(X+Y) = Var(X) + Var(Y) = 1 + 4 = 5."
        },
        {
            q: 'X ~ N(10,3). What is P(X ≤ 10)? Round to 3 decimal places.',
            qDE: 'X ~ N(10,3). Was ist P(X ≤ 10)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'Symmetry',
            hintDE: 'Symmetrie',
            explain: "Since 10 is the mean of the distribution and the normal distribution is symmetric around its mean, exactly half the probability lies below it: P(X ≤ 10) = 0.5.",
            explainDE: "Da 10 der Mittelwert der Verteilung ist und die Normalverteilung symmetrisch um ihren Mittelwert ist, liegt genau die Hälfte der Wahrscheinlichkeit darunter: P(X ≤ 10) = 0,5."
        },

        // ── 11. ZUFALLSVEKTOREN ───────────────────────────────────────────────────────
        {
            q: 'A random vector (X,Y) has joint density: p(0,0)=0.1, p(0,1)=0.2, p(1,0)=0.3, p(1,1)=0.4. What is P(X=1)? Round to 3 decimal places.',
            qDE: 'Ein Zufallsvektor (X,Y) hat gemeinsame Zähldichte: p(0,0)=0,1, p(0,1)=0,2, p(1,0)=0,3, p(1,1)=0,4. Was ist P(X=1)? Runde auf 3 Nachkommastellen.',
            answer: 0.7, tolerance: 0.001, unit: '',
            hintEn: 'P(X=1) = p(1,0) + p(1,1)',
            hintDE: 'P(X=1) = p(1,0) + p(1,1)',
            explain: "The marginal probability P(X=1) sums the joint probabilities over all values of Y: p(1,0) + p(1,1) = 0.3 + 0.4 = 0.7.",
            explainDE: "Die Randwahrscheinlichkeit P(X=1) summiert die gemeinsamen Wahrscheinlichkeiten über alle Werte von Y: p(1,0) + p(1,1) = 0,3 + 0,4 = 0,7."
        },
        {
            q: 'A random vector (X,Y) has joint density p(0,0)=0.1, p(0,1)=0.2, p(1,0)=0.3, p(1,1)=0.4. What is P(Y=1)? Round to 3 decimal places.',
            qDE: 'Ein Zufallsvektor (X,Y) hat die gemeinsame Zähldichte: p(0,0)=0,1, p(0,1)=0,2, p(1,0)=0,3, p(1,1)=0,4. Was ist P(Y=1)? Runde auf 3 Nachkommastellen.',
            answer: 0.6, tolerance: 0.001, unit: '',
            hintEn: 'P(Y=1) = p(0,1) + p(1,1)',
            hintDE: 'P(Y=1) = p(0,1) + p(1,1)',
            explain: "Similarly, the marginal P(Y=1) sums the joint probabilities over all values of X: p(0,1) + p(1,1) = 0.2 + 0.4 = 0.6.",
            explainDE: "Analog summiert die Randwahrscheinlichkeit P(Y=1) die gemeinsamen Wahrscheinlichkeiten über alle Werte von X: p(0,1) + p(1,1) = 0,2 + 0,4 = 0,6."
        },
        {
            q: 'A random vector (X,Y) has joint density: p(0,0)=0.1, p(0,1)=0.2, p(1,0)=0.3, p(1,1)=0.4. What is E[X+Y]? Round to 3 decimal places.',
            qDE: 'Ein Zufallsvektor (X,Y) hat die gemeinsame Zähldichte: p(0,0)=0,1, p(0,1)=0,2, p(1,0)=0,3, p(1,1)=0,4. Was ist E[X+Y]? Runde auf 3 Nachkommastellen.',
            answer: 1.3, tolerance: 0.001, unit: '',
            hintEn: 'E[X+Y] = 0·0.1 + 1·0.2 + 1·0.3 + 2·0.4',
            hintDE: 'E[X+Y] = 0·0,1 + 1·0,2 + 1·0,3 + 2·0,4',
            explain: "Summing (x+y)·p(x,y) over all four outcomes: 0×0.1 + 1×0.2 + 1×0.3 + 2×0.4 = 1.3.",
            explainDE: "Summiert man (x+y)·p(x,y) über alle vier Ergebnisse: 0×0,1 + 1×0,2 + 1×0,3 + 2×0,4 = 1,3."
        },

        // ── 12. VERTEILUNG VON ZUFALLSVEKTOREN ───────────────────────────────────────

        {
            q: 'Joint density f(x,y) = 2x on [0,1]². What is the marginal density f_X(x)? Enter the value for x=0.4. Round to 3 decimal places.',
            qDE: 'Gemeinsame Dichte f(x,y) = 2x auf [0,1]². Was ist die Randdichte f_X(x)? Gib den Wert für x=0,4 ein. Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'Integrate the joint density with respect to y to receive the marginal density f_X(x).',
            hintDE: 'Integriere die gemeinsame Dichte bezüglich y um die Randdichte f_X(x) zu erhalten.',
            explain: "Integrating the joint density over y from 0 to 1 gives f_X(x) = 2x (since the integrand doesn't depend on y), so at x=0.4, f_X(0.4) = 0.8.",
            explainDE: "Das Integrieren der gemeinsamen Dichte über y von 0 bis 1 ergibt f_X(x) = 2x (da der Integrand nicht von y abhängt), also f_X(0,4) = 0,8."
        },
        {
            q: 'Joint density: p(1,1)=0.3, p(1,2)=0.2, p(2,1)=0.1, p(2,2)=0.4. What is P(X=2, Y=2)? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(1,1)=0,3, p(1,2)=0,2, p(2,1)=0,1, p(2,2)=0,4. Was ist P(X=2, Y=2)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(X=2, Y=2) = p(2,2)',
            hintDE: 'P(X=2, Y=2) = p(2,2)',
            explain: "The joint probability at a specific point is read directly from the joint density table: P(X=2, Y=2) = p(2,2) = 0.4.",
            explainDE: "Die gemeinsame Wahrscheinlichkeit an einem bestimmten Punkt wird direkt aus der Tabelle der gemeinsamen Dichte abgelesen: P(X=2, Y=2) = p(2,2) = 0,4."
        },

        // ── 13. PRODUKTVERTEILUNG BEI UNABHÄNGIGKEIT ─────────────────────────────────

        {
            q: 'X and Y are independent with f_X(x)=2x on [0,1] and f_Y(y)=3y² on [0,1]. What is f_{X,Y}(0.5, 0.5)? Round to 3 decimal places.',
            qDE: 'X und Y sind unabhängig mit f_X(x)=2x auf [0,1] und f_Y(y)=3y² auf [0,1]. Was ist f_{X,Y}(0,5; 0,5)? Runde auf 3 Nachkommastellen.',
            answer: 0.75, tolerance: 0.001, unit: '',
            hintEn: 'f_{X,Y}(0.5,0.5) = f_X(0.5)·f_Y(0.5)',
            hintDE: 'f_{X,Y}(0,5;0,5) = f_X(0,5)·f_Y(0,5)',
            explain: "For independent X and Y, the joint density factors as f_X(x)·f_Y(y): f_X(0.5)·f_Y(0.5) = 1×0.75 = 0.75.",
            explainDE: "Bei unabhängigen X und Y faktorisiert die gemeinsame Dichte als f_X(x)·f_Y(y): f_X(0,5)·f_Y(0,5) = 1×0,75 = 0,75."
        },
        {
            q: 'p_X(0)=0.4, p_X(1)=0.6, p_Y(0)=0.3, p_Y(1)=0.7. If X and Y are independent, what is p(X=1, Y=1)? Round to 3 decimal places.',
            qDE: 'p_X(0)=0,4, p_X(1)=0,6, p_Y(0)=0,3, p_Y(1)=0,7. Falls X und Y unabhängig sind, was ist p(X=1, Y=1)? Runde auf 3 Nachkommastellen.',
            answer: 0.42, tolerance: 0.001, unit: '',
            hintEn: 'p(1,1) = p_X(1)·p_Y(1)',
            hintDE: 'p(1,1) = p_X(1)·p_Y(1)',
            explain: "Under independence, the joint probability is the product of the marginals: p_X(1)·p_Y(1) = 0.6×0.7 = 0.42.",
            explainDE: "Bei Unabhängigkeit ist die gemeinsame Wahrscheinlichkeit das Produkt der Randwahrscheinlichkeiten: p_X(1)·p_Y(1) = 0,6×0,7 = 0,42."
        },

        // ── 14. BEDINGTE ZÄHLDICHTE ───────────────────────────────────────────────────
        {
            q: 'Joint density: p(0,0)=0.2, p(0,1)=0.3, p(1,0)=0.1, p(1,1)=0.4. What is p_{Y|X}(1|1) = P(Y=1|X=1)? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(0,0)=0,2, p(0,1)=0,3, p(1,0)=0,1, p(1,1)=0,4. Was ist p_{Y|X}(1|1) = P(Y=1|X=1)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'P(Y=1|X=1) = p(1,1)/p_X(1)',
            hintDE: 'P(Y=1|X=1) = p(1,1)/p_X(1)',
            explain: "First find p_X(1) = p(1,0) + p(1,1) = 0.1 + 0.4 = 0.5, then divide: p(1,1)/p_X(1) = 0.4/0.5 = 0.8.",
            explainDE: "Zunächst bestimmt man p_X(1) = p(1,0) + p(1,1) = 0,1 + 0,4 = 0,5, dann teilt man: p(1,1)/p_X(1) = 0,4/0,5 = 0,8."
        },
        {
            q: 'Joint density p(0,0)=0.2, p(0,1)=0.3, p(1,0)=0.1, p(1,1)=0.4. What is p_{Y|X}(0|0) = P(Y=0|X=0)? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(0,0)=0,2, p(0,1)=0,3, p(1,0)=0,1, p(1,1)=0,4. Was ist P(Y=0|X=0)? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'P(Y=0|X=0) = p(0,0)/p_X(0)',
            hintDE: 'P(Y=0|X=0) = p(0,0)/p_X(0)',
            explain: "First find p_X(0) = p(0,0) + p(0,1) = 0.2 + 0.3 = 0.5, then divide: p(0,0)/p_X(0) = 0.2/0.5 = 0.4.",
            explainDE: "Zunächst bestimmt man p_X(0) = p(0,0) + p(0,1) = 0,2 + 0,3 = 0,5, dann teilt man: p(0,0)/p_X(0) = 0,2/0,5 = 0,4."
        },
        {
            q: 'Joint density: p(1,1)=0.3, p(1,2)=0.2, p(2,1)=0.1, p(2,2)=0.4. What is E[Y|X=1]? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(1,1)=0,3, p(1,2)=0,2, p(2,1)=0,1, p(2,2)=0,4. Was ist E[Y|X=1]? Runde auf 3 Nachkommastellen.',
            answer: 1.4, tolerance: 0.001, unit: '',
            hintEn: 'p_X(1)=0.5. P(Y=1|X=1)=0.3/0.5=0.6, P(Y=2|X=1)=0.2/0.5=0.4',
            hintDE: 'p_X(1)=0,5. P(Y=1|X=1)=0,3/0,5=0,6, P(Y=2|X=1)=0,2/0,5=0,4',
            explain: "First compute the conditional probabilities P(Y=1|X=1) = 0.3/0.5 = 0.6 and P(Y=2|X=1) = 0.2/0.5 = 0.4, then E[Y|X=1] = 1×0.6 + 2×0.4 = 1.4.",
            explainDE: "Zunächst berechnet man die bedingten Wahrscheinlichkeiten P(Y=1|X=1) = 0,3/0,5 = 0,6 und P(Y=2|X=1) = 0,2/0,5 = 0,4, dann E[Y|X=1] = 1×0,6 + 2×0,4 = 1,4."
        },
    ],



    6: [
        // ── 1. SIMPSONS PARADOXON ─────────────────────────────────────────────────────

        {
            q: 'Hospital A has a 90% survival rate for minor surgery and 60% for major surgery. Hospital B has 85% for minor and 55% for major. But overall Hospital B looks better. Does Simpson\'s Paradox occur when subgroup trends reverse in the aggregate? Enter 0 for yes, 1 for no.',
            qDE: 'Krankenhaus A hat 90% Überlebensrate bei kleinen und 60% bei großen Operationen. Krankenhaus B hat 85% bzw. 55%. Trotzdem sieht B insgesamt besser aus. Tritt Simpsons Paradoxon auf, wenn sich Trendrichtungen bei Aggregation umkehren? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Simpson\'s Paradox: a trend in subgroups can reverse when groups are combined due to unequal group sizes.',
            hintDE: 'Simpsons Paradoxon: Ein Trend in Untergruppen kann sich durch ungleiche Gruppengrößen bei der Aggregation umkehren.',
            explain: "This is exactly the definition of Simpson's Paradox: a trend that holds consistently within every subgroup (here, both surgery types) can reverse once the subgroups are combined, typically due to unequal group sizes.",
            explainDE: "Dies ist genau die Definition von Simpsons Paradoxon: Ein Trend, der innerhalb jeder Untergruppe (hier beide Operationsarten) konsistent gilt, kann sich bei Zusammenfassung der Untergruppen umkehren, meist wegen ungleicher Gruppengrößen."
        },
        {
            q: 'Group A: 30 successes out of 50 (60%). Group B: 70 successes out of 150 (≈46.7%). Combined: A has 30/50, B has 70/150. What is the combined success rate of B as a percentage? Round to 1 decimal place.',
            qDE: 'Gruppe A: 30 Erfolge von 50 (60%). Gruppe B: 70 Erfolge von 150 (≈46,7%). Was ist die Gesamterfolgsrate von B in Prozent? Auf 1 Dezimalstelle gerundet.',
            answer: 46.7, tolerance: 0.1, unit: '%',
            hintEn: '70 / 150',
            hintDE: '70 / 150',
            explain: "The combined success rate is simply the total successes divided by the total trials: 70/150 ≈ 46.7%.",
            explainDE: "Die Gesamterfolgsrate ist einfach die Gesamtzahl der Erfolge geteilt durch die Gesamtzahl der Versuche: 70/150 ≈ 46,7%."
        },
        {
            q: 'In a study, Treatment A beats Treatment B in both men and women separately, but loses overall. The lurking variable causing this is called a __ variable. Enter 1 for random, 2 for confounding, 3 for independent.',
            qDE: 'In einer Studie schlägt Behandlung A die Behandlung B bei Männern und Frauen separat, verliert aber insgesamt. Die verursachende versteckte Variable heißt __ Variable. Gib 1 für zufällige, 2 für Störvariable, 3 für unabhängige ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'A confounding (lurking) variable creates Simpson\'s Paradox by being correlated with both the grouping and the outcome.',
            hintDE: 'Eine Störvariable (Confounder) erzeugt Simpsons Paradoxon, da sie mit Gruppierung und Ergebnis korreliert.',
            explain: "The hidden variable (here, sex) is correlated with both which treatment a patient tends to receive and the outcome itself, which is precisely what defines a confounding variable.",
            explainDE: "Die versteckte Variable (hier Geschlecht) korreliert sowohl damit, welche Behandlung ein Patient tendenziell erhält, als auch mit dem Ergebnis selbst — genau das definiert eine Störvariable."
        },

        // ── 2. BEDINGTE DICHTE ────────────────────────────────────────────────────────

        {
            q: 'Joint density f(x,y) = 3x for 0 ≤ x ≤ 1, 0 ≤ y ≤ x. What is f_{Y|X}(y|x) = f(x,y)/f_X(x)? Enter the value at x=0.5, y=0.3.',
            qDE: 'Gemeinsame Dichte f(x,y) = 3x für 0 ≤ x ≤ 1, 0 ≤ y ≤ x. Was ist f_{Y|X}(y|x) = f(x,y)/f_X(x) bei x=0,5, y=0,3? Runde auf 2 Nachkommastellen.',
            answer: 2.0, tolerance: 0.01, unit: '',
            hintEn: 'Calculate the marginal density',
            hintDE: 'Bestimme die Randdichte',
            explain: "The marginal density is f_X(x) = ∫₀ˣ 3x dy = 3x², so f_{Y|X}(y|x) = f(x,y)/f_X(x) = 3x/3x² = 1/x; at x=0.5, this gives 1/0.5 = 2.",
            explainDE: "Die Randdichte ist f_X(x) = ∫₀ˣ 3x dy = 3x², also f_{Y|X}(y|x) = f(x,y)/f_X(x) = 3x/3x² = 1/x; bei x=0,5 ergibt das 1/0,5 = 2."
        },
        {
            q: 'Joint density: p(1,1)=0.2, p(1,2)=0.3, p(2,1)=0.1, p(2,2)=0.4. What is the conditional density p_{Y|X}(2|2) = P(Y=2|X=2)? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(1,1)=0,2, p(1,2)=0,3, p(2,1)=0,1, p(2,2)=0,4. Was ist p_{Y|X}(2|2) = P(Y=2|X=2)? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'p_X(2) = p(2,1)+p(2,2)',
            hintDE: 'p_X(2) = p(2,1)+p(2,2)',
            explain: "First compute p_X(2) = p(2,1)+p(2,2) = 0.1+0.4 = 0.5, then divide: p(2,2)/p_X(2) = 0.4/0.5 = 0.8.",
            explainDE: "Zunächst bestimmt man p_X(2) = p(2,1)+p(2,2) = 0,1+0,4 = 0,5, dann teilt man: p(2,2)/p_X(2) = 0,4/0,5 = 0,8."
        },
        {
            q: 'Joint density f(x,y) = 2 for 0 ≤ y ≤ x ≤ 1. The marginal f_X(x) = 2x. What is f_{Y|X}(y|x)? Enter the value at x=0.6, y=0.3. Round to 3 decimal places.',
            qDE: 'Gemeinsame Dichte f(x,y) = 2 für 0 ≤ y ≤ x ≤ 1. Randdichte f_X(x) = 2x. Was ist f_{Y|X}(y|x) bei x=0,6, y=0,3? Runde auf 3 Nachkommastellen.',
            answer: 1.667, tolerance: 0.005, unit: '',
            hintEn: 'f_{Y|X}(y|x) = 2 / 2x = 1/x.',
            hintDE: 'f_{Y|X}(y|x) = 2 / 2x = 1/x.',
            explain: "Since f_X(x) = 2x, the conditional density is f_{Y|X}(y|x) = f(x,y)/f_X(x) = 2/(2x) = 1/x; at x=0.6, this gives 1/0.6 ≈ 1.667.",
            explainDE: "Da f_X(x) = 2x ist, gilt für die bedingte Dichte f_{Y|X}(y|x) = f(x,y)/f_X(x) = 2/(2x) = 1/x; bei x=0,6 ergibt das 1/0,6 ≈ 1,667."
        },

        // -- 3


        // ── 4. BEDINGTER ERWARTUNGSWERT DISKRET ───────────────────────────────────────

        {
            q: 'Joint density: p(1,1)=0.3, p(1,2)=0.2, p(2,1)=0.1, p(2,2)=0.4. What is E[Y|X=2]? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(1,1)=0,3, p(1,2)=0,2, p(2,1)=0,1, p(2,2)=0,4. Was ist E[Y|X=2]? Runde auf 3 Nachkommastellen.',
            answer: 1.8, tolerance: 0.001, unit: '',
            hintEn: 'p_X(2)=0.5. P(Y=1|X=2)=0.1/0.5=0.2, P(Y=2|X=2)=0.4/0.5=0.8.',
            hintDE: 'p_X(2)=0,5. P(Y=1|X=2)=0,1/0,5=0,2, P(Y=2|X=2)=0,4/0,5=0,8.',
            explain: "First find p_X(2) = p(2,1)+p(2,2) = 0.5, giving conditional probabilities P(Y=1|X=2) = 0.2 and P(Y=2|X=2) = 0.8, so E[Y|X=2] = 1×0.2 + 2×0.8 = 1.8.",
            explainDE: "Zunächst bestimmt man p_X(2) = p(2,1)+p(2,2) = 0,5, was die bedingten Wahrscheinlichkeiten P(Y=1|X=2) = 0,2 und P(Y=2|X=2) = 0,8 ergibt, sodass E[Y|X=2] = 1×0,2 + 2×0,8 = 1,8."
        },
        {
            q: 'Joint density: p(0,0)=0.1, p(0,1)=0.4, p(1,0)=0.3, p(1,1)=0.2. What is E[Y|X=0]? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(0,0)=0,1, p(0,1)=0,4, p(1,0)=0,3, p(1,1)=0,2. Was ist E[Y|X=0]? Runde auf 3 Nachkommastellen.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'p_X(0)=0.5. P(Y=0|X=0)=0.2',
            hintDE: 'p_X(0)=0,5. P(Y=0|X=0)=0,2',
            explain: "With p_X(0) = 0.5, the conditional probabilities are P(Y=0|X=0) = 0.2 and P(Y=1|X=0) = 0.8, so E[Y|X=0] = 0×0.2 + 1×0.8 = 0.8.",
            explainDE: "Mit p_X(0) = 0,5 ergeben sich die bedingten Wahrscheinlichkeiten P(Y=0|X=0) = 0,2 und P(Y=1|X=0) = 0,8, sodass E[Y|X=0] = 0×0,2 + 1×0,8 = 0,8."
        },
        {
            q: 'Joint density: p(1,2)=0.25, p(1,4)=0.25, p(2,2)=0.25, p(2,4)=0.25. What is E[Y|X=1]? Enter as a whole number.',
            qDE: 'Gemeinsame Zähldichte: p(1,2)=0,25, p(1,4)=0,25, p(2,2)=0,25, p(2,4)=0,25. Was ist E[Y|X=1]? Gib eine ganze Zahl ein.',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'p_X(1)=0.5. P(Y=2|X=1)=0.5, P(Y=4|X=1)=0.5',
            hintDE: 'p_X(1)=0,5. P(Y=2|X=1)=0,5, P(Y=4|X=1)=0,5',
            explain: "Since p_X(1) = 0.5 and both Y=2 and Y=4 are equally likely given X=1, E[Y|X=1] = 2×0.5 + 4×0.5 = 3.",
            explainDE: "Da p_X(1) = 0,5 ist und Y=2 sowie Y=4 gegeben X=1 gleich wahrscheinlich sind, gilt E[Y|X=1] = 2×0,5 + 4×0,5 = 3."
        },

        // ── 5. BEDINGTER ERWARTUNGSWERT STETIG ────────────────────────────────────────

        {
            q: 'Joint density f(x,y) = 2 for 0 ≤ y ≤ x ≤ 1. Conditional density: f_{Y|X}(y|x) = 1/x for y ∈ [0,x]. What is E[Y|X=x]? Enter the formula evaluated at x=0.6. Round to 3 decimal places.',
            qDE: 'Gemeinsame Dichte f(x,y) = 2 für 0 ≤ y ≤ x ≤ 1. Bedingte Dichte: f_{Y|X}(y|x) = 1/x. Was ist E[Y|X=x] ausgewertet bei x=0,6? Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'E[Y|X=x] = x/2',
            hintDE: 'E[Y|X=x] = x/2',
            explain: "Integrating y times the conditional density over [0,x] gives E[Y|X=x] = ∫₀ˣ y·(1/x) dy = x/2; at x=0.6, this is 0.3.",
            explainDE: "Das Integrieren von y multipliziert mit der bedingten Dichte über [0,x] ergibt E[Y|X=x] = ∫₀ˣ y·(1/x) dy = x/2; bei x=0,6 ergibt das 0,3."
        },

        // ── 6. BOX-MULLER-METHODE ─────────────────────────────────────────────────────

        {
            q: 'The Box-Muller transform takes U₁, U₂ ~ U[0,1] and produces Z₁ = √(−2·ln U₁)·cos(2πU₂). What distribution does Z₁ follow?  Enter 1 for N(0,1), 2 for Uniform[0,1], 3 for Exp(1).',
            qDE: 'Die Box-Muller-Methode nimmt U₁, U₂ ~ U[0,1] und erzeugt Z₁ = √(−2·ln U₁)·cos(2πU₂). Welche Verteilung hat Z₁? Gib 1 für N(0,1), 2 für Gleichverteilt, 3 für Exp(1) ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'The Box-Muller transform produces standard normal N(0,1) random variables.',
            hintDE: 'Die Box-Muller-Methode erzeugt standardnormalverteilte N(0,1) Zufallszahlen.',
            explain: "The Box-Muller transform is specifically designed to convert two independent uniform random variables into a standard normal random variable, so Z₁ ~ N(0,1).",
            explainDE: "Die Box-Muller-Methode ist speziell dafür konzipiert, zwei unabhängige gleichverteilte Zufallsvariablen in eine standardnormalverteilte Zufallsvariable umzuwandeln, sodass Z₁ ~ N(0,1) gilt."
        },


        // ── 7. ERWARTUNGSWERTVEKTOR ───────────────────────────────────────────────────

        {
            q: 'Random vector (X, Y) has E[X]=3 and E[Y]=7. What is the second component of the mean vector μ = (E[X], E[Y])? Enter as a whole number.',
            qDE: 'Zufallsvektor (X, Y) hat E[X]=3 und E[Y]=7. Was ist die zweite Komponente des Erwartungswertvektors μ=(E[X], E[Y])? Gib eine ganze Zahl ein.',
            answer: 7, tolerance: 0, unit: '',
            hintEn: 'The mean vector is μ = (3, 7)',
            hintDE: 'Der Erwartungswertvektor ist μ = (3, 7)',
            explain: "The mean vector simply collects each component's expected value in order, so its second entry is E[Y] = 7.",
            explainDE: "Der Erwartungswertvektor sammelt einfach die Erwartungswerte jeder Komponente der Reihe nach, sodass der zweite Eintrag E[Y] = 7 ist."
        },
        {
            q: 'X has density P(X=2)=0.5, P(X=4)=0.5 and Y has density P(Y=1)=0.3, P(Y=3)=0.7. What is E[X]+E[Y]? Round to 3 decimal places.',
            qDE: 'X hat P(X=2)=0,5, P(X=4)=0,5 und Y hat P(Y=1)=0,3, P(Y=3)=0,7. Was ist E[X]+E[Y]? Runde auf 3 Nachkommastellen.',
            answer: 5.4, tolerance: 0.001, unit: '',
            hintEn: 'E[X]=2·0.5+4·0.5=3. E[Y]=1·0.3+3·0.7=2.4',
            hintDE: 'E[X]=3. E[Y]=0,3+2,1=2,4',
            explain: "Computing each expectation separately, E[X] = 2×0.5+4×0.5 = 3 and E[Y] = 1×0.3+3×0.7 = 2.4, so E[X]+E[Y] = 5.4.",
            explainDE: "Berechnet man jeden Erwartungswert einzeln, ergibt sich E[X] = 2×0,5+4×0,5 = 3 und E[Y] = 1×0,3+3×0,7 = 2,4, sodass E[X]+E[Y] = 5,4."
        },
        {
            q: 'Random vector (X, Y, Z) has E[X]=1, E[Y]=2, E[Z]=3. What is E[2X − Y + 3Z]? Enter as a whole number.',
            qDE: 'Zufallsvektor (X, Y, Z) hat E[X]=1, E[Y]=2, E[Z]=3. Was ist E[2X − Y + 3Z]? Gib eine ganze Zahl ein.',
            answer: 9, tolerance: 0, unit: '',
            hintEn: 'Linearity',
            hintDE: 'Linearität',
            explain: "By linearity of expectation, E[2X−Y+3Z] = 2E[X] − E[Y] + 3E[Z] = 2×1 − 2 + 3×3 = 9.",
            explainDE: "Durch die Linearität des Erwartungswerts gilt E[2X−Y+3Z] = 2E[X] − E[Y] + 3E[Z] = 2×1 − 2 + 3×3 = 9."
        },

        // ── 8. KOVARIANZ ──────────────────────────────────────────────────────────────

        {
            q: 'E[XY]=10, E[X]=2, E[Y]=3. What is Cov(X,Y)? Enter as a whole number.',
            qDE: 'E[XY]=10, E[X]=2, E[Y]=3. Was ist Cov(X,Y)? Gib eine ganze Zahl ein.',
            answer: 4, tolerance: 0, unit: '',
            hintEn: 'Cov(X,Y) = E[XY] − E[X]·E[Y]',
            hintDE: 'Cov(X,Y) = E[XY] − E[X]·E[Y]',
            explain: "Applying the covariance formula: Cov(X,Y) = E[XY] − E[X]·E[Y] = 10 − 2×3 = 4.",
            explainDE: "Mit der Kovarianzformel: Cov(X,Y) = E[XY] − E[X]·E[Y] = 10 − 2×3 = 4."
        },
        {
            q: 'Joint density: p(1,1)=0.5, p(2,2)=0.5. E[X]=1.5, E[Y]=1.5. What is Cov(X,Y)? Round to 3 decimal places.',
            qDE: 'Gemeinsame Zähldichte: p(1,1)=0,5, p(2,2)=0,5. E[X]=1,5, E[Y]=1,5. Was ist Cov(X,Y)? Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'E[XY]=2.5',
            hintDE: 'E[XY]=2,5',
            explain: "The joint expectation is E[XY] = 1×1×0.5 + 2×2×0.5 = 2.5, so Cov(X,Y) = E[XY] − E[X]·E[Y] = 2.5 − 1.5×1.5 = 0.25.",
            explainDE: "Der gemeinsame Erwartungswert ist E[XY] = 1×1×0,5 + 2×2×0,5 = 2,5, sodass Cov(X,Y) = E[XY] − E[X]·E[Y] = 2,5 − 1,5×1,5 = 0,25."
        },
        {
            q: 'X and Y are independent. What is Cov(X,Y)? Enter as a whole number.',
            qDE: 'X und Y sind unabhängig. Was ist Cov(X,Y)? Gib eine ganze Zahl ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Independence...',
            hintDE: 'Unabhängigkeit...',
            explain: "Since independent random variables satisfy E[XY] = E[X]·E[Y], their covariance is always Cov(X,Y) = 0.",
            explainDE: "Da unabhängige Zufallsvariablen E[XY] = E[X]·E[Y] erfüllen, ist ihre Kovarianz stets Cov(X,Y) = 0."
        },

        // ── 9. KOVARIANZMATRIX ────────────────────────────────────────────────────────

        {
            q: 'Var(X)=4, Var(Y)=9, Cov(X,Y)=3. What is the entry Σ₁₂ (off-diagonal) of the covariance matrix Σ? Enter as a whole number.',
            qDE: 'Var(X)=4, Var(Y)=9, Cov(X,Y)=3. Was ist der Eintrag Σ₁₂ (Nebendiagonale) der Kovarianzmatrix Σ? Gib eine ganze Zahl ein.',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'The covariance matrix is Σ = [[4, 3], [3, 9]].',
            hintDE: 'Die Kovarianzmatrix ist Σ = [[4, 3], [3, 9]].',
            explain: "The off-diagonal entries of the covariance matrix are the covariance itself, so Σ₁₂ = Cov(X,Y) = 3.",
            explainDE: "Die Nebendiagonaleinträge der Kovarianzmatrix sind die Kovarianz selbst, sodass Σ₁₂ = Cov(X,Y) = 3 ist."
        },
        {
            q: 'For a random vector (X,Y), the covariance matrix Σ is always symmetric. What is Σ₂₁ if Σ₁₂ = Cov(X,Y) = 5? Enter as a whole number.',
            qDE: 'Für einen Zufallsvektor (X,Y) ist die Kovarianzmatrix Σ immer symmetrisch. Was ist Σ₂₁, wenn Σ₁₂ = Cov(X,Y) = 5? Gib eine ganze Zahl ein.',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'Symmetry',
            hintDE: 'Symmetrie',
            explain: "The covariance matrix is always symmetric, so Σ₂₁ = Σ₁₂ = 5.",
            explainDE: "Die Kovarianzmatrix ist stets symmetrisch, sodass Σ₂₁ = Σ₁₂ = 5 gilt."
        },
        {
            q: 'Var(X)=9, Var(Y)=4, Cov(X,Y)=0. What is the determinant of the covariance matrix Σ? Enter as a whole number.',
            qDE: 'Var(X)=9, Var(Y)=4, Cov(X,Y)=0. Was ist die Determinante der Kovarianzmatrix Σ? Gib eine ganze Zahl ein.',
            answer: 36, tolerance: 0, unit: '',
            hintEn: 'det([[9,0],[0,4]])',
            hintDE: 'det([[9,0],[0,4]])',
            explain: "Since Cov(X,Y) = 0, the covariance matrix is diagonal, and its determinant is simply the product of the diagonal entries: det(Σ) = 9×4 = 36.",
            explainDE: "Da Cov(X,Y) = 0 ist, ist die Kovarianzmatrix diagonal, und ihre Determinante ist einfach das Produkt der Diagonaleinträge: det(Σ) = 9×4 = 36."
        },

        // ── 10. UNKORRELIERT ──────────────────────────────────────────────────────────

        {
            q: 'Cov(X,Y)=0. Are X and Y necessarily independent? Enter 1 for yes, 0 for no.',
            qDE: 'Cov(X,Y)=0. Sind X und Y notwendigerweise unabhängig? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Uncorrelated (Cov=0) does not imply independence. Independence implies Cov=0, but not the reverse.',
            hintDE: 'Unkorreliert (Cov=0) impliziert nicht Unabhängigkeit. Unabhängigkeit impliziert Cov=0, nicht umgekehrt.',
            explain: "Zero covariance only rules out a linear relationship; nonlinear dependencies between X and Y can still exist, so uncorrelated does not imply independent.",
            explainDE: "Eine Kovarianz von null schließt nur einen linearen Zusammenhang aus; nichtlineare Abhängigkeiten zwischen X und Y können weiterhin bestehen, sodass unkorreliert nicht Unabhängigkeit bedeutet."
        },
        {
            q: 'E[XY]=6, E[X]=3, E[Y]=2. Are X and Y uncorrelated? Enter 1 for yes, 0 for no.',
            qDE: 'E[XY]=6, E[X]=3, E[Y]=2. Sind X und Y unkorreliert? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Cov(X,Y) = E[XY] − E[X]·E[Y] = 6 − 3·2 = 6 − 6 = 0',
            hintDE: 'Cov(X,Y) = 6 − 3·2 = 0',
            explain: "Computing Cov(X,Y) = E[XY] − E[X]·E[Y] = 6 − 3×2 = 0 shows X and Y are indeed uncorrelated.",
            explainDE: "Das Berechnen von Cov(X,Y) = E[XY] − E[X]·E[Y] = 6 − 3×2 = 0 zeigt, dass X und Y tatsächlich unkorreliert sind."
        },
        {
            q: 'X and Y are uncorrelated with Var(X)=4, Var(Y)=9. What is Var(X+Y)? Enter as a whole number.',
            qDE: 'X und Y sind unkorreliert mit Var(X)=4, Var(Y)=9. Was ist Var(X+Y)? Gib eine ganze Zahl ein.',
            answer: 13, tolerance: 0, unit: '',
            hintEn: 'Var(X+Y) = Var(X) + Var(Y) + 2·Cov(X,Y)',
            hintDE: 'Var(X+Y) = Var(X) + Var(Y) + 2·Cov(X,Y)',
            explain: "Since X and Y are uncorrelated, Cov(X,Y)=0, so Var(X+Y) = Var(X) + Var(Y) + 2·Cov(X,Y) = 4 + 9 + 0 = 13.",
            explainDE: "Da X und Y unkorreliert sind, ist Cov(X,Y)=0, sodass Var(X+Y) = Var(X) + Var(Y) + 2·Cov(X,Y) = 4 + 9 + 0 = 13 gilt."
        },

        // ── 11. KORRELATION ───────────────────────────────────────────────────────────

        {
            q: 'Cov(X,Y)=6, Var(X)=9, Var(Y)=16. What is the correlation coefficient ρ(X,Y)? Round to 3 decimal places.',
            qDE: 'Cov(X,Y)=6, Var(X)=9, Var(Y)=16. Was ist der Korrelationskoeffizient ρ(X,Y)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'ρ = Cov(X,Y) / (σ_X · σ_Y)',
            hintDE: 'ρ = Cov(X,Y) / (σ_X · σ_Y)',
            explain: "The correlation coefficient normalizes covariance by the standard deviations: ρ = Cov(X,Y)/(σ_X·σ_Y) = 6/(3×4) = 0.5.",
            explainDE: "Der Korrelationskoeffizient normiert die Kovarianz mit den Standardabweichungen: ρ = Cov(X,Y)/(σ_X·σ_Y) = 6/(3×4) = 0,5."
        },
        {
            q: 'ρ(X,Y) = −1 means X and Y are perfectly __ correlated. Enter 1 for positively, 2 for negatively, 3 for not.',
            qDE: 'ρ(X,Y) = −1 bedeutet, X und Y sind perfekt __ korreliert. Gib 1 für positiv, 2 für negativ, 3 für nicht korreliert ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'ρ = −1 indicates perfect negative (linear) correlation.',
            hintDE: 'ρ = −1 bedeutet perfekte negative (lineare) Korrelation.',
            explain: "A correlation coefficient of −1 indicates the strongest possible linear relationship in the opposite direction, meaning X and Y are perfectly negatively correlated.",
            explainDE: "Ein Korrelationskoeffizient von −1 bedeutet den stärkstmöglichen linearen Zusammenhang in entgegengesetzter Richtung, d.h. X und Y sind perfekt negativ korreliert."
        },
        {
            q: 'Cov(X,Y)=4, σ_X=2, σ_Y=4. What is ρ(X,Y)? Round to 3 decimal places.',
            qDE: 'Cov(X,Y)=4, σ_X=2, σ_Y=4. Was ist ρ(X,Y)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'ρ = 4 / (2·4)',
            hintDE: 'ρ = 4 / (2·4)',
            explain: "Dividing the covariance by the product of the standard deviations gives ρ = Cov(X,Y)/(σ_X·σ_Y) = 4/(2×4) = 0.5.",
            explainDE: "Das Teilen der Kovarianz durch das Produkt der Standardabweichungen ergibt ρ = Cov(X,Y)/(σ_X·σ_Y) = 4/(2×4) = 0,5."
        },

        // ── 12. RECHENREGELN FÜR KOVARIANZ & CAUCHY-SCHWARZ ──────────────────────────

        {
            q: 'Cov(X,X) = ? Enter 1 for Var(X), 2 for E[X], 3 for 0.',
            qDE: 'Cov(X,X) = ? Gib 1 für Var(X), 2 für E[X], 3 für 0 ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Cov(X,X) = E[X²] − (E[X])² = Var(X) by definition.',
            hintDE: 'Cov(X,X) = E[X²] − (E[X])² = Var(X) per Definition.',
            explain: "By definition, Cov(X,X) = E[X²] − (E[X])², which is exactly the formula for Var(X).",
            explainDE: "Per Definition ist Cov(X,X) = E[X²] − (E[X])², was genau der Formel für Var(X) entspricht."
        },
        {
            q: 'Cov(2X+1, Y) = 2·Cov(X,Y). If Cov(X,Y)=3, what is Cov(2X+1, Y)? Enter as a whole number.',
            qDE: 'Cov(2X+1, Y) = 2·Cov(X,Y). Wenn Cov(X,Y)=3, was ist dann Cov(2X+1, Y)? Gib eine ganze Zahl ein.',
            answer: 6, tolerance: 0, unit: '',
            hintEn: 'Cov(aX+b, Y) = a·Cov(X,Y)',
            hintDE: 'Cov(aX+b, Y) = a·Cov(X,Y)',
            explain: "Covariance is linear in each argument, and constants shift out without effect: Cov(2X+1,Y) = 2·Cov(X,Y) = 2×3 = 6.",
            explainDE: "Die Kovarianz ist in jedem Argument linear, und Konstanten fallen ohne Einfluss heraus: Cov(2X+1,Y) = 2·Cov(X,Y) = 2×3 = 6."
        },
        {
            q: 'If Var(X)=4 and Var(Y)=9, what is the maximum possible value of |Cov(X,Y)|? Enter as a whole number.',
            qDE: 'Wenn Var(X)=4 und Var(Y)=9, was ist der maximale Wert von |Cov(X,Y)|? Gib eine ganze Zahl ein.',
            answer: 6, tolerance: 0, unit: '',
            hintEn: '|Cov(X,Y)| ≤ √(Var(X)·Var(Y)) by Cauchy-Schwarz',
            hintDE: '|Cov(X,Y)| ≤ √(Var(X)·Var(Y)) nach Cauchy-Schwarz ',
            explain: "By the Cauchy-Schwarz inequality, covariance is bounded by the product of the standard deviations: |Cov(X,Y)| ≤ √(Var(X)·Var(Y)) = √(4×9) = 6.",
            explainDE: "Nach der Cauchy-Schwarz-Ungleichung ist die Kovarianz durch das Produkt der Standardabweichungen begrenzt: |Cov(X,Y)| ≤ √(Var(X)·Var(Y)) = √(4×9) = 6."
        },

        // ── 13. MULTIVARIATE NORMALVERTEILUNG ────────────────────────────────────────

        {
            q: '(X,Y) ~ N(μ, Σ) with μ=(0,0) and Σ=[[1,0],[0,1]]. Are X and Y independent? Enter 1 for yes, 0 for no.',
            qDE: '(X,Y) ~ N(μ, Σ) mit μ=(0,0) und Σ=[[1,0],[0,1]]. Sind X und Y unabhängig? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'For multivariate normal distributions, uncorrelated components (off-diagonal = 0) are also independent.',
            hintDE: 'Bei multivariaten Normalverteilungen sind unkorrelierte Komponenten (Nebendiagonale = 0) auch unabhängig.',
            explain: "For jointly (multivariate) normal random variables, zero covariance does imply independence — unlike the general case — so X and Y here are independent.",
            explainDE: "Bei gemeinsam (multivariat) normalverteilten Zufallsvariablen impliziert eine Kovarianz von null tatsächlich Unabhängigkeit — anders als im allgemeinen Fall — sodass X und Y hier unabhängig sind."
        },
        {
            q: '(X,Y) ~ bivariate normal with μ_X=2, μ_Y=3, σ_X=1, σ_Y=2, ρ=0.5. What is Cov(X,Y)? Enter as a whole number.',
            qDE: '(X,Y) ~ bivariat normalverteilt mit μ_X=2, μ_Y=3, σ_X=1, σ_Y=2, ρ=0,5. Was ist Cov(X,Y)? Gib eine ganze Zahl ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Cov(X,Y) = ρ·σ_X·σ_Y = 0.5·1·2 = 1.',
            hintDE: 'Cov(X,Y) = ρ·σ_X·σ_Y = 0,5·1·2 = 1.',
            explain: "Rearranging the correlation formula gives the covariance directly: Cov(X,Y) = ρ·σ_X·σ_Y = 0.5×1×2 = 1.",
            explainDE: "Das Umstellen der Korrelationsformel liefert direkt die Kovarianz: Cov(X,Y) = ρ·σ_X·σ_Y = 0,5×1×2 = 1."
        },
        {
            q: '(X,Y) ~ bivariate normal. The marginal distribution of X is also normal. If μ_X=5 and σ²_X=4, what is P(X ≤ 5)? Round to 3 decimal places.',
            qDE: '(X,Y) ~ bivariat normalverteilt. Die Randverteilung von X ist ebenfalls normal. Wenn μ_X=5 und σ²_X=4, was ist P(X ≤ 5)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'P(X ≤ μ_X) = 0.5 by symmetry of the normal distribution.',
            hintDE: 'P(X ≤ μ_X) = 0,5 wegen der Symmetrie der Normalverteilung.',
            explain: "Since the marginal of X is normal with mean 5, and the normal distribution is symmetric about its mean, exactly half the probability lies at or below the mean: P(X ≤ 5) = 0.5.",
            explainDE: "Da die Randverteilung von X normal mit Mittelwert 5 ist und die Normalverteilung symmetrisch um ihren Mittelwert ist, liegt genau die Hälfte der Wahrscheinlichkeit bei oder unterhalb des Mittelwerts: P(X ≤ 5) = 0,5."
        },

    ],

    //TODO: continue

    // ── WORLD 7 — Convergence & Limit Theorems ────────────────────────────────
    // Topics: Arithmetisches Mittel, Schwaches GGZ, Tschebyscheff-Ungleichung,
    //         Stochastische Konvergenz, Starkes GGZ, Hauptsatz der Statistik,
    //         Fast sichere Konvergenz, Zentraler Grenzwertsatz


    7: [

        // ── 1. ARITHMETISCHES MITTEL ─────────────────────────────────────────────

        {
            q: 'You observe x₁=2, x₂=5, x₃=8, x₄=1, x₅=4. What is the sample mean X̄?',
            qDE: 'Sie beobachten x₁=2, x₂=5, x₃=8, x₄=1, x₅=4. Was ist das arithmetische Mittel X̄?',
            answer: 4, tolerance: 0.001, unit: '',
            hintEn: 'Add all values and divide by the number of observations.',
            hintDE: 'Addiere alle Werte und teile durch die Anzahl der Beobachtungen.',
            explain: "Summing the observations and dividing by the sample size gives X̄ = (2+5+8+1+4)/5 = 20/5 = 4.",
            explainDE: "Das Summieren der Beobachtungen und Teilen durch die Stichprobengröße ergibt X̄ = (2+5+8+1+4)/5 = 20/5 = 4."
        },
        {
            q: 'X₁, …, Xₙ are i.i.d. with E[Xᵢ] = 7. What is E[X̄ₙ]?',
            qDE: 'X₁, …, Xₙ sind i.i.d. mit E[Xᵢ] = 7. Was ist E[X̄ₙ]?',
            answer: 7, tolerance: 0.001, unit: '',
            hintEn: 'The expected value of the sample mean equals the expected value of each individual variable.',
            hintDE: 'Der Erwartungswert des Stichprobenmittelwerts entspricht dem Erwartungswert jeder einzelnen Variablen.',
            explain: "By linearity of expectation, the expected value of the sample mean equals the expected value of each individual observation: E[X̄ₙ] = E[Xᵢ] = 7.",
            explainDE: "Durch die Linearität des Erwartungswerts entspricht der Erwartungswert des Stichprobenmittelwerts dem Erwartungswert jeder einzelnen Beobachtung: E[X̄ₙ] = E[Xᵢ] = 7."
        },
        {
            q: 'X₁, …, X₂₅ are i.i.d. with Var(Xᵢ) = 100. What is Var(X̄₂₅)?',
            qDE: 'X₁, …, X₂₅ sind i.i.d. mit Var(Xᵢ) = 100. Was ist Var(X̄₂₅)?',
            answer: 4, tolerance: 0.001, unit: '',
            hintEn: 'The variance of the sample mean is σ² divided by n.',
            hintDE: 'Die Varianz des Stichprobenmittelwerts ist σ² geteilt durch n.',
            explain: "The variance of the sample mean scales inversely with sample size: Var(X̄ₙ) = σ²/n = 100/25 = 4.",
            explainDE: "Die Varianz des Stichprobenmittelwerts skaliert umgekehrt mit der Stichprobengröße: Var(X̄ₙ) = σ²/n = 100/25 = 4."
        },
        {
            q: 'X₁, …, X₄ are i.i.d. with Var(Xᵢ) = 16. What is the standard deviation of X̄₄?',
            qDE: 'X₁, …, X₄ sind i.i.d. mit Var(Xᵢ) = 16. Was ist die Standardabweichung von X̄₄?',
            answer: 2, tolerance: 0.001, unit: '',
            hintEn: 'First compute Var(X̄ₙ) = σ²/n, then take the square root.',
            hintDE: 'Berechne zunächst Var(X̄ₙ) = σ²/n und ziehe dann die Wurzel.',
            explain: "First, Var(X̄₄) = σ²/n = 16/4 = 4, and the standard deviation is its square root: √4 = 2.",
            explainDE: "Zunächst gilt Var(X̄₄) = σ²/n = 16/4 = 4, und die Standardabweichung ist die Quadratwurzel davon: √4 = 2."
        },

        // ── 2. TSCHEBYSCHEFF-UNGLEICHUNG ─────────────────────────────────────────

        {
            q: 'X has E[X]=10 and Var(X)=9. Use Chebyshev to find an upper bound for P(|X−10| ≥ 3). Enter as a decimal.',
            qDE: 'X hat E[X]=10 und Var(X)=9. Was ist die Tschebyscheff-Schranke für P(|X−10| ≥ 3)? Gib als Dezimalzahl ein.',
            answer: 1, tolerance: 0.001, unit: '',
            hintEn: 'The Chebyshev bound is Var(X) / ε².',
            hintDE: 'Die Tschebyscheff-Schranke ist Var(X) / ε².',
            explain: "Applying Chebyshev's inequality: P(|X−μ| ≥ ε) ≤ Var(X)/ε² = 9/3² = 9/9 = 1.",
            explainDE: "Mit der Tschebyscheff-Ungleichung: P(|X−μ| ≥ ε) ≤ Var(X)/ε² = 9/3² = 9/9 = 1."
        },
        {
            q: 'X has E[X]=0 and Var(X)=4. Use Chebyshev to find an upper bound for P(|X| ≥ 4). Enter as a decimal. Round to 3 decimal places.',
            qDE: 'X hat E[X]=0 und Var(X)=4. Was ist die Tschebyscheff-Schranke für P(|X| ≥ 4)? Gib als Dezimalzahl ein. Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'The Chebyshev bound is Var(X) / ε².',
            hintDE: 'Die Tschebyscheff-Schranke ist Var(X) / ε².',
            explain: "Chebyshev's inequality gives P(|X| ≥ 4) ≤ Var(X)/ε² = 4/4² = 4/16 = 0.25.",
            explainDE: "Die Tschebyscheff-Ungleichung liefert P(|X| ≥ 4) ≤ Var(X)/ε² = 4/4² = 4/16 = 0,25."
        },
        {
            q: 'X̄ₙ is the mean of n=100 i.i.d. variables with σ²=25 and μ=50. Use Chebyshev to bound P(|X̄ₙ−50| ≥ 1). Enter as a decimal. Round to 3 decimal places.',
            qDE: 'X̄ₙ ist der Mittelwert von n=100 i.i.d. Variablen mit σ²=25 und μ=50. Was ist die Tschebyscheff-Schranke für P(|X̄ₙ−50| ≥ 1)? Gib als Dezimalzahl ein. Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'First find Var(X̄ₙ) = σ²/n, then apply the Chebyshev bound.',
            hintDE: 'Bestimme zunächst Var(X̄ₙ) = σ²/n und wende dann die Tschebyscheff-Ungleichung an.',
            explain: "First compute Var(X̄ₙ) = σ²/n = 25/100 = 0.25, then apply Chebyshev: P(|X̄ₙ−μ| ≥ 1) ≤ 0.25/1² = 0.25.",
            explainDE: "Zunächst berechnet man Var(X̄ₙ) = σ²/n = 25/100 = 0,25, dann wendet man Tschebyscheff an: P(|X̄ₙ−μ| ≥ 1) ≤ 0,25/1² = 0,25."
        },
        {
            q: 'Var(X) = 16. What is the Chebyshev upper bound for P(|X − μ| ≥ 2)? Enter as a decimal.',
            qDE: 'Var(X) = 16. Was ist die Tschebyscheff-Schranke für P(|X − μ| ≥ 2)? Gib als Dezimalzahl ein.',
            answer: 4, tolerance: 0.001, unit: '',
            hintEn: 'The Chebyshev bound is Var(X) / ε².',
            hintDE: 'Die Tschebyscheff-Schranke ist Var(X) / ε².',
            explain: "Chebyshev's inequality gives P(|X−μ| ≥ 2) ≤ Var(X)/ε² = 16/2² = 16/4 = 4; a bound above 1 is still valid but not informative, since probabilities never exceed 1.",
            explainDE: "Die Tschebyscheff-Ungleichung liefert P(|X−μ| ≥ 2) ≤ Var(X)/ε² = 16/2² = 16/4 = 4; eine Schranke über 1 ist zwar formal korrekt, aber nicht mehr aussagekräftig, da Wahrscheinlichkeiten nie größer als 1 sind."
        },

        // ── 3. SCHWACHES GESETZ DER GROSSEN ZAHLEN ───────────────────────────────

        {
            q: 'X₁, …, Xₙ are i.i.d. with E[Xᵢ]=3 and Var(Xᵢ)=9. The weak law guarantees X̄ₙ converges in probability to which value?',
            qDE: 'X₁, …, Xₙ sind i.i.d. mit E[Xᵢ]=3 und Var(Xᵢ)=9. Das schwache Gesetz garantiert, dass X̄ₙ stochastisch gegen welchen Wert konvergiert?',
            answer: 3, tolerance: 0.001, unit: '',
            hintEn: 'The sample mean converges to the true expected value of each variable.',
            hintDE: 'Der Stichprobenmittelwert konvergiert gegen den wahren Erwartungswert jeder Variablen.',
            explain: "The weak law of large numbers states that the sample mean converges in probability to the true expected value, which here is 3.",
            explainDE: "Das schwache Gesetz der großen Zahlen besagt, dass der Stichprobenmittelwert stochastisch gegen den wahren Erwartungswert konvergiert, hier also gegen 3."
        },
        {
            q: 'By the weak law, P(|X̄ₙ − μ| ≥ ε) approaches which value as n → ∞?',
            qDE: 'Nach dem schwachen Gesetz: Gegen welchen Wert strebt P(|X̄ₙ − μ| ≥ ε) für n → ∞?',
            answer: 0, tolerance: 0.001, unit: '',
            hintEn: 'This is what convergence in probability to μ means.',
            hintDE: 'Das ist genau die Bedeutung der stochastischen Konvergenz gegen μ.',
            explain: "This is precisely the definition of convergence in probability: the probability of any deviation from μ vanishes as n → ∞.",
            explainDE: "Dies ist genau die Definition der stochastischen Konvergenz: die Wahrscheinlichkeit jeder Abweichung von μ verschwindet für n → ∞."
        },
        {
            q: 'For σ²=1, ε=0.1, n=100: what is the Chebyshev bound on P(|X̄ₙ − μ| ≥ ε)?',
            qDE: 'Für σ²=1, ε=0,1, n=100: Was ist die Tschebyscheff-Schranke für P(|X̄ₙ − μ| ≥ ε)?',
            answer: 1, tolerance: 0.001, unit: '',
            hintEn: 'Plug the values directly into σ²/(n·ε²).',
            hintDE: 'Setze die Werte direkt in σ²/(n·ε²) ein.',
            explain: "Plugging into the Chebyshev bound: σ²/(n·ε²) = 1/(100×0.01) = 1/1 = 1.",
            explainDE: "Einsetzen in die Tschebyscheff-Schranke: σ²/(n·ε²) = 1/(100×0,01) = 1/1 = 1."
        },

        // ── 4. STOCHASTISCHE KONVERGENZ ──────────────────────────────────────────

        {
            q: 'Does almost sure convergence imply convergence in probability? Enter 0 for yes, 1 for no.',
            qDE: 'Impliziert fast sichere Konvergenz die stochastische Konvergenz? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Think about which convergence type is the stronger one.',
            hintDE: 'Überlege, welche Konvergenzart die stärkere ist.',
            explain: "Almost sure convergence is the stronger convergence concept, and it always implies convergence in probability.",
            explainDE: "Fast sichere Konvergenz ist die stärkere Konvergenzart und impliziert stets die stochastische Konvergenz."
        },
        {
            q: 'Does convergence in probability imply almost sure convergence? Enter 1 for yes, 0 for no.',
            qDE: 'Impliziert stochastische Konvergenz fast sichere Konvergenz? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Think about which convergence type is the stronger one.',
            hintDE: 'Überlege, welche Konvergenzart die stärkere ist.',
            explain: "Convergence in probability is the weaker concept and does not, in general, imply almost sure convergence.",
            explainDE: "Stochastische Konvergenz ist die schwächere Konvergenzart und impliziert im Allgemeinen keine fast sichere Konvergenz."
        },
        {
            q: 'Xₙ converges in probability to c means P(|Xₙ − c| ≥ ε) → ? for all ε > 0. Enter the limit.',
            qDE: 'Xₙ konvergiert stochastisch gegen c bedeutet P(|Xₙ − c| ≥ ε) → ? für alle ε > 0. Gib den Grenzwert ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'This is the definition — the probability of any deviation vanishes.',
            hintDE: 'Das ist die Definition — die Wahrscheinlichkeit jeder Abweichung verschwindet.',
            explain: "This is exactly the definition of convergence in probability: the probability of any deviation of at least ε vanishes as n → ∞.",
            explainDE: "Dies ist genau die Definition der stochastischen Konvergenz: Die Wahrscheinlichkeit einer Abweichung von mindestens ε verschwindet für n → ∞."
        },

        // ── 5. STARKES GESETZ DER GROSSEN ZAHLEN ────────────────────────────────

        {
            q: 'The strong law of large numbers guarantees X̄ₙ → μ with probability equal to?',
            qDE: 'Das starke Gesetz der großen Zahlen garantiert X̄ₙ → μ mit welcher Wahrscheinlichkeit?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'The strong law guarantees almost sure convergence.',
            hintDE: 'Das starke Gesetz garantiert fast sichere Konvergenz.',
            explain: "The strong law of large numbers guarantees almost sure convergence, meaning the sample mean converges to μ with probability 1.",
            explainDE: "Das starke Gesetz der großen Zahlen garantiert fast sichere Konvergenz, d.h. der Stichprobenmittelwert konvergiert mit Wahrscheinlichkeit 1 gegen μ."
        },
        {
            q: 'Which convergence type is stronger: convergence in probability (enter 1) or almost sure convergence (enter 2)?',
            qDE: 'Welche Konvergenzart ist stärker: stochastische Konvergenz (gib 1 ein) oder fast sichere Konvergenz (gib 2 ein)?',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'One of the two implies the other, but not vice versa.',
            hintDE: 'Eine der beiden impliziert die andere, aber nicht umgekehrt.',
            explain: "Almost sure convergence is the stronger notion; it implies convergence in probability, but the reverse doesn't hold in general.",
            explainDE: "Fast sichere Konvergenz ist die stärkere Konvergenzart; sie impliziert stochastische Konvergenz, aber die Umkehrung gilt im Allgemeinen nicht."
        },
        {
            q: 'You simulate X̄ₙ for i.i.d. Ber(0.4) variables. As n → ∞, X̄ₙ converges almost surely to which value? Round to 3 decimal places.',
            qDE: 'Sie simulieren X̄ₙ für i.i.d. Ber(0,4)-Variablen. Für n → ∞ konvergiert X̄ₙ fast sicher gegen welchen Wert? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'The sample mean converges to the true mean of the distribution.',
            hintDE: 'Der Stichprobenmittelwert konvergiert gegen den wahren Erwartungswert der Verteilung.',
            explain: "By the strong law of large numbers, the sample mean of i.i.d. Bernoulli(p) variables converges almost surely to p = 0.4.",
            explainDE: "Nach dem starken Gesetz der großen Zahlen konvergiert der Stichprobenmittelwert i.i.d. Bernoulli(p)-Variablen fast sicher gegen p = 0,4."
        },

        // ── 6. HAUPTSATZ DER STATISTIK (GLIVENKO–CANTELLI) ──────────────────────

        {
            q: 'You draw n=5 i.i.d. observations: 1, 3, 3, 5, 8. What is the empirical CDF value F̂₅(3)? Round to 3 decimal places.',
            qDE: 'Sie ziehen n=5 i.i.d. Beobachtungen: 1, 3, 3, 5, 8. Was ist der Wert der empirischen Verteilungsfunktion F̂₅(3)? Runde auf 3 Nachkommastellen.',
            answer: 0.6, tolerance: 0.001, unit: '',
            hintEn: 'Count how many observations are ≤ 3, then divide by n.',
            hintDE: 'Zähle die Beobachtungen, die ≤ 3 sind, und teile durch n.',
            explain: "Counting the observations at or below 3 (namely 1, 3, and 3) gives 3 out of 5, so F̂₅(3) = 3/5 = 0.6.",
            explainDE: "Das Zählen der Beobachtungen bei oder unter 3 (nämlich 1, 3 und 3) ergibt 3 von 5, sodass F̂₅(3) = 3/5 = 0,6."
        },
        {
            q: 'You draw n=4 i.i.d. observations: 2, 5, 7, 9. What is F̂₄(5)? Round to 3 decimal places.',
            qDE: 'Sie ziehen n=4 i.i.d. Beobachtungen: 2, 5, 7, 9. Was ist F̂₄(5)? Runde auf 3 Nachkommastellen.',
            answer: 0.5, tolerance: 0.001, unit: '',
            hintEn: 'Count how many observations are ≤ 5, then divide by n.',
            hintDE: 'Zähle die Beobachtungen, die ≤ 5 sind, und teile durch n.',
            explain: "Counting the observations at or below 5 (namely 2 and 5) gives 2 out of 4, so F̂₄(5) = 2/4 = 0.5.",
            explainDE: "Das Zählen der Beobachtungen bei oder unter 5 (nämlich 2 und 5) ergibt 2 von 4, sodass F̂₄(5) = 2/4 = 0,5."
        },
        {
            q: 'The Glivenko–Cantelli theorem states sup_x |F̂ₙ(x) − F(x)| → ? almost surely. Enter the limit.',
            qDE: 'Der Satz von Glivenko–Cantelli besagt sup_x |F̂ₙ(x) − F(x)| → ? fast sicher. Gib den Grenzwert ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'The empirical CDF gets arbitrarily close to the true CDF everywhere.',
            hintDE: 'Die empirische Verteilungsfunktion nähert sich überall beliebig nah an die wahre an.',
            explain: "The Glivenko-Cantelli theorem states that the empirical CDF converges uniformly to the true CDF almost surely, so the supremum of their difference goes to 0.",
            explainDE: "Der Satz von Glivenko-Cantelli besagt, dass die empirische Verteilungsfunktion fast sicher gleichmäßig gegen die wahre Verteilungsfunktion konvergiert, sodass das Supremum ihrer Differenz gegen 0 strebt."
        },

        // ── 7. FAST SICHERE KONVERGENZ ───────────────────────────────────────────

        {
            q: 'Xₙ converges almost surely to X means P(lim_{n→∞} Xₙ = X) = ? Enter the value.',
            qDE: 'Xₙ konvergiert fast sicher gegen X bedeutet P(lim_{n→∞} Xₙ = X) = ? Gib den Wert ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Almost sure means the convergence event has probability one.',
            hintDE: 'Fast sicher bedeutet, dass das Konvergenzereignis Wahrscheinlichkeit eins hat.',
            explain: "By definition, almost sure convergence means the event that Xₙ converges to X has probability exactly 1.",
            explainDE: "Per Definition bedeutet fast sichere Konvergenz, dass das Ereignis, dass Xₙ gegen X konvergiert, genau Wahrscheinlichkeit 1 hat."
        },
        {
            q: 'Xₙ = 1/n for all outcomes ω. Does Xₙ converge almost surely? If yes enter the limit, if no enter −1.',
            qDE: 'Xₙ = 1/n für alle Ergebnisse ω. Konvergiert Xₙ fast sicher? Falls ja, gib den Grenzwert ein; falls nein, gib −1 ein.',
            answer: 0, tolerance: 0.001, unit: '',
            hintEn: 'Ask yourself what 1/n approaches as n grows, for any fixed outcome.',
            hintDE: 'Überlege, gegen was 1/n strebt, wenn n wächst, für ein beliebiges festes Ergebnis.',
            explain: "Since 1/n → 0 as n → ∞ for every fixed outcome ω, the sequence converges almost surely, and the limit is 0.",
            explainDE: "Da 1/n → 0 für n → ∞ für jedes feste Ergebnis ω gilt, konvergiert die Folge fast sicher, und der Grenzwert ist 0."
        },
        {
            q: 'If Xₙ converges almost surely to 5, what does P(|Xₙ − 5| ≥ ε) converge to for any ε > 0?',
            qDE: 'Wenn Xₙ fast sicher gegen 5 konvergiert, gegen was strebt P(|Xₙ − 5| ≥ ε) für beliebiges ε > 0?',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Almost sure convergence is stronger than convergence in probability.',
            hintDE: 'Fast sichere Konvergenz ist stärker als stochastische Konvergenz.',
            explain: "Because almost sure convergence is stronger than convergence in probability, it implies P(|Xₙ−5| ≥ ε) → 0 for any ε > 0.",
            explainDE: "Da fast sichere Konvergenz stärker ist als stochastische Konvergenz, folgt daraus P(|Xₙ−5| ≥ ε) → 0 für beliebiges ε > 0."
        },

        // ── 8. ZENTRALER GRENZWERTSATZ ───────────────────────────────────────────

        {
            q: 'X₁, …, X₃₆ are i.i.d. with μ=10 and σ²=9. By the CLT, X̄₃₆ is approximately normal. What is Var(X̄₃₆)? Round to 3 decimal places.',
            qDE: 'X₁, …, X₃₆ sind i.i.d. mit μ=10 und σ²=9. Nach dem ZGS ist X̄₃₆ näherungsweise normalverteilt. Was ist Var(X̄₃₆)? Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'Var(X̄ₙ) = σ²/n.',
            hintDE: 'Var(X̄ₙ) = σ²/n.',
            explain: "By the usual formula for the variance of a sample mean, Var(X̄₃₆) = σ²/n = 9/36 = 0.25.",
            explainDE: "Mit der üblichen Formel für die Varianz eines Stichprobenmittelwerts gilt Var(X̄₃₆) = σ²/n = 9/36 = 0,25."
        },
        {
            q: 'X₁,…,Xₙ i.i.d. with μ=5, σ²=16, n=64. The standardised mean Zₙ = (X̄ₙ − μ)/(σ/√n) follows approximately which distribution? Enter 1 for N(0,1), 2 for N(μ,σ²), 3 for Exp(1).',
            qDE: 'X₁,…,Xₙ i.i.d. mit μ=5, σ²=16, n=64. Die standardisierte Größe Zₙ = (X̄ₙ − μ)/(σ/√n) folgt näherungsweise welcher Verteilung? Gib 1 für N(0,1), 2 für N(μ,σ²), 3 für Exp(1) ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Standardising a sum of i.i.d. variables always leads to the same limit distribution.',
            hintDE: 'Die Standardisierung einer Summe i.i.d. Variablen führt stets zur selben Grenzverteilung.',
            explain: "The Central Limit Theorem guarantees that standardizing the sample mean of i.i.d. variables always yields an approximately standard normal distribution, regardless of the original distribution.",
            explainDE: "Der zentrale Grenzwertsatz garantiert, dass die Standardisierung des Stichprobenmittelwerts i.i.d. Variablen unabhängig von der ursprünglichen Verteilung stets näherungsweise standardnormalverteilt ist."
        },
        {
            q: 'X₁, …, X₁₀₀ are i.i.d. Ber(0.3). The Central Limit Theorem approximates X̄₁₀₀ as normal with variance σ²/n. What is σ²/n here? Enter as a decimal. Round to 4 decimal places.',
            qDE: 'X₁, …, X₁₀₀ sind i.i.d. Ber(0,3). Der zentrale Grenzwertsatz nähert X̄₁₀₀ durch eine Normalverteilung mit Varianz σ²/n an. Was ist σ²/n? Gib als Dezimalzahl ein. Runde auf 4 Nachkommastellen.',
            answer: 0.0021, tolerance: 0.0001, unit: '',
            hintEn: 'For a Bernoulli(p) variable, σ² = p·(1−p).',
            hintDE: 'Für eine Bernoulli(p)-Variable gilt σ² = p·(1−p).',
            explain: "For a Bernoulli(p) variable, σ² = p(1−p) = 0.3×0.7 = 0.21, so σ²/n = 0.21/100 = 0.0021.",
            explainDE: "Für eine Bernoulli(p)-Variable gilt σ² = p(1−p) = 0,3×0,7 = 0,21, sodass σ²/n = 0,21/100 = 0,0021 ist."
        },
        {
            q: 'X₁,…,X₄₉ are i.i.d. with μ=0 and σ=7. What is the standard deviation of X̄₄₉?',
            qDE: 'X₁,…,X₄₉ sind i.i.d. mit μ=0 und σ=7. Was ist die Standardabweichung von X̄₄₉?',
            answer: 1, tolerance: 0.001, unit: '',
            hintEn: 'SD(X̄ₙ) = σ/√n.',
            hintDE: 'SD(X̄ₙ) = σ/√n.',
            explain: "The standard deviation of the sample mean is SD(X̄ₙ) = σ/√n = 7/√49 = 7/7 = 1.",
            explainDE: "Die Standardabweichung des Stichprobenmittelwerts ist SD(X̄ₙ) = σ/√n = 7/√49 = 7/7 = 1."
        },

    ],

    8: [

        // ── 1. ALLGEMEINE IDEE DER SCHLIEßENDEN STATISTIK ────────────────────────

        {
            q: 'In inferential statistics, we observe a sample to draw conclusions about a larger group. This larger group is called the __. Enter 1 for population, 2 for sample, 3 for estimator.',
            qDE: 'In der schließenden Statistik beobachten wir eine Stichprobe, um Rückschlüsse auf eine größere Gruppe zu ziehen. Diese größere Gruppe heißt __. Gib 1 für Grundgesamtheit, 2 für Stichprobe, 3 für Schätzer ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Think about what we are ultimately trying to learn about — it is not what we directly measure.',
            hintDE: 'Überlege, worüber wir letztlich etwas herausfinden wollen — es ist nicht das, was wir direkt messen.',
            explain: "The population is the entire group we want to draw conclusions about, while the sample is only the subset we actually observe.",
            explainDE: "Die Grundgesamtheit ist die gesamte Gruppe, über die wir Rückschlüsse ziehen wollen, während die Stichprobe nur die Teilmenge ist, die wir tatsächlich beobachten."
        },
        {
            q: 'The four core tasks of inferential statistics are: modelling, estimation, testing, and model validation. Which task asks "Does our assumed model fit the data at all?" Enter 1 for modelling, 2 for estimation, 3 for testing, 4 for model validation.',
            qDE: 'Die vier Kernaufgaben der schließenden Statistik sind: Modellierung, Schätzen, Testen und Modellvalidierung. Welche Aufgabe fragt "Passt unser angenommenes Modell überhaupt zu den Daten?" Gib 1 für Modellierung, 2 für Schätzen, 3 für Testen, 4 für Modellvalidierung ein.',
            answer: 4, tolerance: 0, unit: '',
            hintEn: 'This task comes after we have already fit a model and checks whether the whole approach was reasonable.',
            hintDE: 'Diese Aufgabe kommt, nachdem wir ein Modell angepasst haben, und prüft, ob der gesamte Ansatz sinnvoll war.',
            explain: "Model validation is the task that checks, after modelling, estimation, and testing, whether the assumed distributional family is actually appropriate for the data.",
            explainDE: "Die Modellvalidierung ist die Aufgabe, die nach Modellierung, Schätzen und Testen prüft, ob die angenommene Verteilungsfamilie tatsächlich zu den Daten passt."
        },
        {
            q: 'We want to know whether a new drug lowers blood pressure. We measure 50 patients and compute a test result. Which core task are we performing? Enter 1 for modelling, 2 for estimation, 3 for testing, 4 for model validation.',
            qDE: 'Wir wollen wissen, ob ein neues Medikament den Blutdruck senkt. Wir messen 50 Patienten und berechnen ein Testergebnis. Welche Kernaufgabe führen wir durch? Gib 1 für Modellierung, 2 für Schätzen, 3 für Testen, 4 für Modellvalidierung ein.',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'We are making a yes/no decision about a claim — that is different from just computing a numerical value for an unknown quantity.',
            hintDE: 'Wir treffen eine Ja/Nein-Entscheidung über eine Behauptung — das ist etwas anderes, als nur einen numerischen Wert für eine unbekannte Größe zu berechnen.',
            explain: "Since we are deciding between two competing claims (the drug works vs. it doesn't) based on a computed test result, this is a testing task.",
            explainDE: "Da wir anhand eines berechneten Testergebnisses zwischen zwei konkurrierenden Behauptungen entscheiden (das Medikament wirkt vs. es wirkt nicht), handelt es sich um eine Testaufgabe."
        },
        {
            q: 'We observe data and want to find the most plausible value for an unknown quantity, such as the average height in a country. Which core task is this? Enter 1 for modelling, 2 for estimation, 3 for testing, 4 for model validation.',
            qDE: 'Wir beobachten Daten und wollen den plausibelsten Wert für eine unbekannte Größe finden, z.B. die durchschnittliche Körpergröße in einem Land. Welche Kernaufgabe ist das? Gib 1 für Modellierung, 2 für Schätzen, 3 für Testen, 4 für Modellvalidierung ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'We are producing a concrete numerical guess for something we cannot observe directly.',
            hintDE: 'Wir erzeugen eine konkrete numerische Vermutung für etwas, das wir nicht direkt beobachten können.',
            explain: "Producing a plausible numerical value for an unknown parameter, such as an average, is the task of estimation.",
            explainDE: "Das Erzeugen eines plausiblen numerischen Werts für einen unbekannten Parameter, wie z.B. einen Durchschnitt, ist die Aufgabe des Schätzens."
        },

        // ── 2. STICHPROBENUMFANG UND STICHPROBENRAUM ─────────────────────────────

        {
            q: 'We draw 30 people from a population and record their age. What is the sample size? Enter the number.',
            qDE: 'Wir ziehen 30 Personen aus einer Grundgesamtheit und erfassen ihr Alter. Was ist der Stichprobenumfang? Gib die Zahl ein.',
            answer: 30, tolerance: 0, unit: '',
            hintEn: 'The sample size is simply the count of individual observations we collected.',
            hintDE: 'Der Stichprobenumfang ist einfach die Anzahl der einzelnen Beobachtungen, die wir erhoben haben.',
            explain: "The sample size is simply the number of individuals observed, which is 30 here.",
            explainDE: "Der Stichprobenumfang ist einfach die Anzahl der beobachteten Individuen, hier also 30."
        },

        {
            q: 'The sample space of a statistical model is the set of all possible values a single observation can take. A person is asked how many siblings they have; this value can be 0, 1, 2, 3, … Is the sample space here discrete or continuous? Enter 1 for discrete, 2 for continuous.',
            qDE: 'Der Stichprobenraum eines statistischen Modells ist die Menge aller möglichen Werte, die eine einzelne Beobachtung annehmen kann. Eine Person wird gefragt, wie viele Geschwister sie hat; dieser Wert kann 0, 1, 2, 3, … sein. Ist der Stichprobenraum hier diskret oder stetig? Gib 1 für diskret, 2 für stetig ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Ask yourself: can the observation only take whole-number values, or can it take any value in an interval?',
            hintDE: 'Frage dich: Kann die Beobachtung nur ganze Zahlen annehmen, oder jeden Wert in einem Intervall?',
            explain: "Since the number of siblings can only take isolated whole-number values (0, 1, 2, …), the sample space is discrete.",
            explainDE: "Da die Anzahl der Geschwister nur einzelne ganzzahlige Werte annehmen kann (0, 1, 2, …), ist der Stichprobenraum diskret."
        },
        {
            q: 'We measure the exact weight of a randomly chosen apple. Is the sample space here discrete or continuous? Enter 1 for discrete, 2 for continuous.',
            qDE: 'Wir messen das genaue Gewicht eines zufällig gewählten Apfels. Ist der Stichprobenraum hier diskret oder stetig? Gib 1 für diskret, 2 für stetig ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Weight can take any value within a range, not just isolated whole numbers.',
            hintDE: 'Gewicht kann jeden Wert in einem Bereich annehmen, nicht nur einzelne ganze Zahlen.',
            explain: "Since exact weight can take any real value within a range rather than just isolated points, the sample space is continuous.",
            explainDE: "Da das genaue Gewicht jeden reellen Wert in einem Bereich annehmen kann und nicht nur einzelne Punkte, ist der Stichprobenraum stetig."
        },

        // ── 3. PARAMETRISCHES VERTEILUNGSMODELL UND PARAMETERRAUM ────────────────

        {
            q: 'In a parametric model, we assume the data follows a specific family of distributions that is described by one or more unknown values. These unknown values are called __. Enter 1 for parameters, 2 for estimators, 3 for observations.',
            qDE: 'In einem parametrischen Modell nehmen wir an, dass die Daten einer bestimmten Verteilungsfamilie folgen, die durch einen oder mehrere unbekannte Werte beschrieben wird. Diese unbekannten Werte heißen __. Gib 1 für Parameter, 2 für Schätzer, 3 für Beobachtungen ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'These are the fixed but unknown quantities that completely determine which distribution from the family we are dealing with.',
            hintDE: 'Das sind die festen, aber unbekannten Größen, die vollständig bestimmen, mit welcher Verteilung aus der Familie wir es zu tun haben.',
            explain: "The fixed but unknown quantities that pin down which specific distribution from a family we are dealing with are called parameters.",
            explainDE: "Die festen, aber unbekannten Größen, die festlegen, mit welcher konkreten Verteilung aus einer Familie wir es zu tun haben, heißen Parameter."
        },
        {
            q: 'We model the number of defective items in a production line using a Binomial distribution. The Binomial family is described by n (known) and p (unknown). The parameter space for p is the interval [0, 1]. Is p = 1.3 a valid value in this parameter space? Enter 1 for yes, 0 for no.',
            qDE: 'Wir modellieren die Anzahl defekter Teile an einer Produktionslinie mit einer Binomialverteilung. Die Binomialfamilie wird durch n (bekannt) und p (unbekannt) beschrieben. Der Parameterraum für p ist das Intervall [0, 1]. Ist p = 1,3 ein gültiger Wert in diesem Parameterraum? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'The parameter space defines all values the parameter is allowed to take — check whether 1.3 lies within [0, 1].',
            hintDE: 'Der Parameterraum legt alle zulässigen Werte des Parameters fest — prüfe, ob 1,3 im Intervall [0, 1] liegt.',
            explain: "Since the parameter space for p is [0, 1] and 1.3 lies outside this interval, it is not a valid value.",
            explainDE: "Da der Parameterraum für p das Intervall [0, 1] ist und 1,3 außerhalb dieses Intervalls liegt, ist es kein gültiger Wert."
        },
        {
            q: 'We assume waiting times follow an Exponential distribution with unknown rate parameter λ. Since λ must be strictly positive, the parameter space is the set of all positive real numbers. Is λ = 0 a valid element of this parameter space? Enter 1 for yes, 0 for no.',
            qDE: 'Wir nehmen an, dass Wartezeiten einer Exponentialverteilung mit unbekanntem Ratenparameter λ folgen. Da λ strikt positiv sein muss, ist der Parameterraum die Menge aller positiven reellen Zahlen. Ist λ = 0 ein gültiges Element dieses Parameterraums? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'The parameter space only contains values that make the model well-defined — check whether 0 is strictly positive.',
            hintDE: 'Der Parameterraum enthält nur Werte, für die das Modell wohldefiniert ist — prüfe, ob 0 strikt positiv ist.',
            explain: "Since the parameter space requires λ to be strictly positive, and 0 is not strictly positive, λ = 0 is not a valid element.",
            explainDE: "Da der Parameterraum verlangt, dass λ strikt positiv ist, und 0 nicht strikt positiv ist, ist λ = 0 kein gültiges Element."
        },
        {
            q: 'A parametric model for coin flips assumes each flip follows a Bernoulli distribution with unknown probability of heads p. Two researchers use the same model family but estimate different values of p from their data. How many parameters does this model have?',
            qDE: 'Ein parametrisches Modell für Münzwürfe nimmt an, dass jeder Wurf einer Bernoulli-Verteilung mit unbekannter Kopfwahrscheinlichkeit p folgt. Zwei Forscher verwenden dieselbe Modellfamilie, schätzen aber unterschiedliche Werte von p aus ihren Daten. Wie viele Parameter hat dieses Modell?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Count how many unknown quantities fully describe which distribution from the Bernoulli family we are using.',
            hintDE: 'Zähle, wie viele unbekannte Größen vollständig beschreiben, welche Verteilung aus der Bernoulli-Familie wir verwenden.',
            explain: "The Bernoulli family is fully described by the single unknown probability p, so this model has exactly 1 parameter.",
            explainDE: "Die Bernoulli-Familie wird vollständig durch die einzige unbekannte Wahrscheinlichkeit p beschrieben, sodass dieses Modell genau 1 Parameter hat."
        },

        // ── 4. STATISTIK UND SCHÄTZER ─────────────────────────────────────────────

        {
            q: 'A statistic is a function that takes the observed data as input and produces a numerical output. It must NOT use any unknown parameters. We observe x₁=3, x₂=5, x₃=7. Is the sample mean (3+5+7)/3 a valid statistic? Enter 0 for yes, 1 for no.',
            qDE: 'Eine Statistik ist eine Funktion, die die beobachteten Daten als Eingabe nimmt und eine numerische Ausgabe produziert. Sie darf KEINE unbekannten Parameter verwenden. Wir beobachten x₁=3, x₂=5, x₃=7. Ist der Stichprobenmittelwert (3+5+7)/3 eine gültige Statistik? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Check whether the formula only uses the data values themselves, without any unknown quantities.',
            hintDE: 'Prüfe, ob die Formel nur die Datenwerte selbst verwendet, ohne unbekannte Größen.',
            explain: "Since the sample mean is computed only from the observed data values, without relying on any unknown parameters, it is a valid statistic.",
            explainDE: "Da der Stichprobenmittelwert nur aus den beobachteten Datenwerten berechnet wird, ohne auf unbekannte Parameter zurückzugreifen, ist er eine gültige Statistik."
        },
        {
            q: 'We observe data and compute a statistic to guess the value of an unknown parameter. When a statistic is used for this purpose it is called an __. Enter 1 for estimator, 2 for test statistic, 3 for parameter.',
            qDE: 'Wir beobachten Daten und berechnen eine Statistik, um den Wert eines unbekannten Parameters zu schätzen. Wenn eine Statistik für diesen Zweck verwendet wird, heißt sie __. Gib 1 für Schätzer, 2 für Teststatistik, 3 für Parameter ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'The name reflects that we are using data to make an educated guess about the true unknown value.',
            hintDE: 'Der Name spiegelt wider, dass wir Daten verwenden, um eine fundierte Vermutung über den wahren unbekannten Wert anzustellen.',
            explain: "A statistic used to guess the value of an unknown parameter is, by definition, called an estimator.",
            explainDE: "Eine Statistik, die verwendet wird, um den Wert eines unbekannten Parameters zu schätzen, heißt per Definition Schätzer."
        },
        {
            q: 'An estimator is itself a random variable because it depends on the random sample. Before collecting data, the estimator can take many possible values. After collecting data and computing a specific number, this specific number is called the __. Enter 1 for estimate, 2 for parameter, 3 for population mean.',
            qDE: 'Ein Schätzer ist selbst eine Zufallsvariable, weil er von der zufälligen Stichprobe abhängt. Bevor Daten erhoben werden, kann der Schätzer viele mögliche Werte annehmen. Nachdem Daten erhoben und eine konkrete Zahl berechnet wurde, nennt man diese konkrete Zahl __. Gib 1 für Schätzwert, 2 für Parameter, 3 für Erwartungswert der Grundgesamtheit ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'There is a distinction between the rule for computing (which is random) and the specific number you get after inserting your data.',
            hintDE: 'Es gibt einen Unterschied zwischen der Berechnungsregel (die zufällig ist) und der konkreten Zahl, die man erhält, wenn man die Daten einsetzt.',
            explain: "Once specific data has been plugged into the estimator, the resulting concrete number is called the estimate, distinguishing it from the estimator itself, which is a random variable.",
            explainDE: "Sobald konkrete Daten in den Schätzer eingesetzt wurden, nennt man die resultierende konkrete Zahl Schätzwert, im Unterschied zum Schätzer selbst, der eine Zufallsvariable ist."
        },
        {
            q: 'A desirable property of an estimator is that its expected value equals the true parameter value. Such an estimator is called unbiased. If the expected value of an estimator equals the true parameter, is the estimator unbiased? Enter 0 for yes, 1 for no.',
            qDE: 'Eine wünschenswerte Eigenschaft eines Schätzers ist, dass sein Erwartungswert dem wahren Parameterwert entspricht. Ein solcher Schätzer heißt erwartungstreu. Wenn der Erwartungswert eines Schätzers dem wahren Parameter entspricht, ist der Schätzer erwartungstreu? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'The definition of unbiasedness is exactly that the estimator is correct on average.',
            hintDE: 'Die Definition von Erwartungstreue ist genau, dass der Schätzer im Durchschnitt korrekt ist.',
            explain: "By definition, an estimator is unbiased precisely when its expected value equals the true parameter value.",
            explainDE: "Per Definition ist ein Schätzer genau dann erwartungstreu, wenn sein Erwartungswert dem wahren Parameterwert entspricht."
        },

        // ── 5. EMPIRISCHE VERTEILUNGSFUNKTION ALS SCHÄTZER ───────────────────────

        {
            q: 'The empirical distribution function assigns to each value x the fraction of observations that are less than or equal to x. We observe: 2, 5, 5, 8. What is the value of the empirical distribution function at x = 5? Round to 3 decimal places.',
            qDE: 'Die empirische Verteilungsfunktion weist jedem Wert x den Anteil der Beobachtungen zu, die kleiner oder gleich x sind. Wir beobachten: 2, 5, 5, 8. Was ist der Wert der empirischen Verteilungsfunktion bei x = 5? Runde auf 3 Nachkommastellen.',
            answer: 0.75, tolerance: 0.001, unit: '',
            hintEn: 'Count how many of the four observations are at most 5, then divide by the total number of observations.',
            hintDE: 'Zähle, wie viele der vier Beobachtungen höchstens 5 sind, und teile durch die Gesamtanzahl der Beobachtungen.',
            explain: "Counting the observations at or below 5 (namely 2, 5, and 5) gives 3 out of 4, so the empirical distribution function at x = 5 is 3/4 = 0.75.",
            explainDE: "Das Zählen der Beobachtungen bei oder unter 5 (nämlich 2, 5 und 5) ergibt 3 von 4, sodass die empirische Verteilungsfunktion bei x = 5 gleich 3/4 = 0,75 ist."
        },
        {
            q: 'We observe: 1, 3, 7, 9, 10. What is the value of the empirical distribution function at x = 3? Round to 3 decimal places.',
            qDE: 'Wir beobachten: 1, 3, 7, 9, 10. Was ist der Wert der empirischen Verteilungsfunktion bei x = 3? Runde auf 3 Nachkommastellen.',
            answer: 0.4, tolerance: 0.001, unit: '',
            hintEn: 'Count all observations that are less than or equal to 3 and divide by the total number.',
            hintDE: 'Zähle alle Beobachtungen, die kleiner oder gleich 3 sind, und teile durch die Gesamtanzahl.',
            explain: "Counting the observations at or below 3 (namely 1 and 3) gives 2 out of 5, so the empirical distribution function at x = 3 is 2/5 = 0.4.",
            explainDE: "Das Zählen der Beobachtungen bei oder unter 3 (nämlich 1 und 3) ergibt 2 von 5, sodass die empirische Verteilungsfunktion bei x = 3 gleich 2/5 = 0,4 ist."
        },
        {
            q: 'We observe: 4, 6, 6, 8. What is the value of the empirical distribution function at x = 5? Round to 3 decimal places.',
            qDE: 'Wir beobachten: 4, 6, 6, 8. Was ist der Wert der empirischen Verteilungsfunktion bei x = 5? Runde auf 3 Nachkommastellen.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'Check which observations are less than or equal to 5.',
            hintDE: 'Prüfe, welche Beobachtungen kleiner oder gleich 5 sind.',
            explain: "Only the observation 4 is at or below 5, giving 1 out of 4, so the empirical distribution function at x = 5 is 1/4 = 0.25.",
            explainDE: "Nur die Beobachtung 4 liegt bei oder unter 5, das ergibt 1 von 4, sodass die empirische Verteilungsfunktion bei x = 5 gleich 1/4 = 0,25 ist."
        },
        {
            q: 'The empirical distribution function is used as an estimator for the true (unknown) distribution function. As the sample size grows, the empirical distribution function gets closer and closer to the true one. This result is known as the Glivenko-Cantelli theorem. Does a larger sample size generally lead to a better estimate? Enter 1 for yes, 0 for no.',
            qDE: 'Die empirische Verteilungsfunktion wird als Schätzer für die wahre (unbekannte) Verteilungsfunktion verwendet. Mit wachsendem Stichprobenumfang nähert sich die empirische Verteilungsfunktion immer mehr der wahren an. Führt ein größerer Stichprobenumfang im Allgemeinen zu einem besseren Schätzer? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Think about what happens to the gap between the empirical and the true distribution function as we collect more and more data.',
            hintDE: 'Überlege, was mit der Lücke zwischen der empirischen und der wahren Verteilungsfunktion passiert, wenn wir immer mehr Daten sammeln.',
            explain: "By the Glivenko-Cantelli theorem, the empirical distribution function converges to the true one as the sample size grows, so a larger sample generally leads to a better estimate.",
            explainDE: "Nach dem Satz von Glivenko-Cantelli konvergiert die empirische Verteilungsfunktion mit wachsendem Stichprobenumfang gegen die wahre, sodass ein größerer Stichprobenumfang im Allgemeinen zu einem besseren Schätzer führt."
        },

        // ── 6. LIKELIHOOD-PRINZIP UND MAXIMUM-LIKELIHOOD-SCHÄTZER ────────────────

        {
            q: 'The likelihood of a parameter value θ given observed data is defined as the probability (or probability density) of observing that data assuming θ is the true value. If a higher likelihood means the data is more probable under that parameter value, do we prefer parameter values with higher or lower likelihood? Enter 1 for higher, 2 for lower.',
            qDE: 'Die Likelihood eines Parameterwertes θ gegeben beobachteten Daten ist definiert als die Wahrscheinlichkeit (oder Wahrscheinlichkeitsdichte), diese Daten zu beobachten, wenn θ der wahre Wert ist. Wenn eine höhere Likelihood bedeutet, dass die Daten unter diesem Parameterwert wahrscheinlicher sind, bevorzugen wir Parameterwerte mit höherer oder niedrigerer Likelihood? Gib 1 für höherer, 2 für niedrigerer ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'We want the parameter value that makes our observed data as probable as possible.',
            hintDE: 'Wir wollen den Parameterwert, der unsere beobachteten Daten so wahrscheinlich wie möglich macht.',
            explain: "Since a higher likelihood means the observed data is more probable under that parameter value, we prefer parameter values with higher likelihood.",
            explainDE: "Da eine höhere Likelihood bedeutet, dass die beobachteten Daten unter diesem Parameterwert wahrscheinlicher sind, bevorzugen wir Parameterwerte mit höherer Likelihood."
        },
        {
            q: 'The maximum likelihood estimator chooses the parameter value that maximises the likelihood function. Is the maximum likelihood estimator always the same as the sample mean? Enter 1 for yes, 0 for no.',
            qDE: 'Der Maximum-Likelihood-Schätzer wählt den Parameterwert, der die Likelihood-Funktion maximiert. Ist der Maximum-Likelihood-Schätzer immer gleich dem Stichprobenmittelwert? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'The maximum likelihood estimator depends on the assumed distribution family — for some families the answer changes.',
            hintDE: 'Der Maximum-Likelihood-Schätzer hängt von der angenommenen Verteilungsfamilie ab — für manche Familien ändert sich die Antwort.',
            explain: "The maximum likelihood estimator depends on the assumed distribution family, and while it coincides with the sample mean for some families (like the Normal), this is not true in general.",
            explainDE: "Der Maximum-Likelihood-Schätzer hängt von der angenommenen Verteilungsfamilie ab, und obwohl er für manche Familien (wie die Normalverteilung) mit dem Stichprobenmittelwert übereinstimmt, gilt dies nicht im Allgemeinen."
        },
        {
            q: 'We observe one coin flip and it comes up heads. We model this as Bernoulli with unknown probability p. The likelihood of observing heads is equal to p. Which value of p maximises this likelihood? Enter as a whole number.',
            qDE: 'Wir beobachten einen Münzwurf und er zeigt Kopf. Wir modellieren dies als Bernoulli mit unbekannter Wahrscheinlichkeit p. Die Likelihood, Kopf zu beobachten, ist gleich p. Welcher Wert von p maximiert diese Likelihood? Gib als ganze Zahl ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Within the allowed parameter space [0,1], ask yourself: for which value of p is the expression p as large as possible?',
            hintDE: 'Im erlaubten Parameterraum [0,1]: für welchen Wert von p ist der Ausdruck p so groß wie möglich?',
            explain: "Since the likelihood function equals p and p ranges over [0, 1], the likelihood is maximised at the largest allowed value, p = 1.",
            explainDE: "Da die Likelihood-Funktion gleich p ist und p über [0, 1] läuft, wird die Likelihood beim größtmöglichen zulässigen Wert p = 1 maximiert."
        },
        {
            q: 'We observe n independent coin flips with k heads. The maximum likelihood estimator for the probability of heads p is k/n. We observe 3 heads in 10 flips. What is the maximum likelihood estimate? Enter as a decimal. Round to 3 decimal places.',
            qDE: 'Wir beobachten n unabhängige Münzwürfe mit k Kopf-Ergebnissen. Der Maximum-Likelihood-Schätzer für die Kopfwahrscheinlichkeit p ist k/n. Wir beobachten 3 Kopf in 10 Würfen. Was ist der Maximum-Likelihood-Schätzwert? Gib als Dezimalzahl ein. Runde auf 3 Nachkommastellen.',
            answer: 0.3, tolerance: 0.001, unit: '',
            hintEn: 'Insert the observed values of k and n into the formula for the maximum likelihood estimator.',
            hintDE: 'Setze die beobachteten Werte von k und n in die Formel für den Maximum-Likelihood-Schätzer ein.',
            explain: "Plugging k = 3 heads and n = 10 flips into the formula k/n gives the maximum likelihood estimate 3/10 = 0.3.",
            explainDE: "Setzt man k = 3 Kopf-Ergebnisse und n = 10 Würfe in die Formel k/n ein, erhält man den Maximum-Likelihood-Schätzwert 3/10 = 0,3."
        },
        {
            q: 'The likelihood principle says that all information about the parameter contained in the data is captured by the likelihood function. Two datasets that produce the same likelihood function for all parameter values should lead to the same conclusion about the parameter. Is this the core idea of the likelihood principle? Enter 1 for yes, 0 for no.',
            qDE: 'Das Likelihood-Prinzip besagt, dass alle Information über den Parameter, die in den Daten steckt, durch die Likelihood-Funktion erfasst wird. Zwei Datensätze, die für alle Parameterwerte dieselbe Likelihood-Funktion erzeugen, sollten zur selben Schlussfolgerung über den Parameter führen. Ist das die Kernidee des Likelihood-Prinzips? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'The likelihood principle focuses on what the data tell us about the parameter, summarised entirely through the likelihood function.',
            hintDE: 'Das Likelihood-Prinzip konzentriert sich darauf, was die Daten über den Parameter aussagen, zusammengefasst vollständig durch die Likelihood-Funktion.',
            explain: "This is exactly the core idea of the likelihood principle: since the likelihood function fully summarizes what the data say about the parameter, identical likelihood functions should yield identical conclusions.",
            explainDE: "Dies ist genau die Kernidee des Likelihood-Prinzips: Da die Likelihood-Funktion vollständig zusammenfasst, was die Daten über den Parameter aussagen, sollten identische Likelihood-Funktionen zu identischen Schlussfolgerungen führen."
        },
    ],




    9: [

        // ── 1. ERWARTUNGSTREUE SCHÄTZER / BIAS ────────────────────────────────────

        {
            q: 'An estimator θ̂ has E[θ̂] = 7 and the true parameter is θ = 7. What is Bias(θ̂)?',
            qDE: 'Ein Schätzer θ̂ hat E[θ̂] = 7 und der wahre Parameter ist θ = 7. Wie groß ist Bias(θ̂)?',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Bias(θ̂) = E[θ̂] − θ. Compute the difference.',
            hintDE: 'Bias(θ̂) = E[θ̂] − θ. Berechne die Differenz.',
            explain: "Since Bias(θ̂) = E[θ̂] − θ = 7 − 7 = 0, the estimator is unbiased.",
            explainDE: "Da Bias(θ̂) = E[θ̂] − θ = 7 − 7 = 0 ist, ist der Schätzer erwartungstreu."
        },
        {
            q: 'An estimator θ̂ has E[θ̂] = 12 and the true parameter is θ = 10. What is Bias(θ̂)?',
            qDE: 'Ein Schätzer θ̂ hat E[θ̂] = 12 und der wahre Parameter ist θ = 10. Wie groß ist Bias(θ̂)?',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Bias(θ̂) = E[θ̂] − θ. Plug in both values.',
            hintDE: 'Bias(θ̂) = E[θ̂] − θ. Setze beide Werte ein.',
            explain: "Plugging into Bias(θ̂) = E[θ̂] − θ = 12 − 10 = 2.",
            explainDE: "Einsetzen in Bias(θ̂) = E[θ̂] − θ = 12 − 10 = 2."
        },
        {
            q: 'X₁,…,Xₙ are i.i.d. with E[Xᵢ] = μ. Is the sample mean X̄ₙ an unbiased estimator of μ? Enter 1 for yes, 0 for no.',
            qDE: 'X₁,…,Xₙ sind i.i.d. mit E[Xᵢ] = μ. Ist der Stichprobenmittelwert X̄ₙ ein erwartungstreuer Schätzer für μ? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Use linearity of expectation: E[X̄ₙ] = (1/n)∑E[Xᵢ].',
            hintDE: 'Nutze die Linearität des Erwartungswerts: E[X̄ₙ] = (1/n)∑E[Xᵢ].',
            explain: "By linearity of expectation, E[X̄ₙ] = (1/n)∑E[Xᵢ] = (1/n)(nμ) = μ, so the sample mean is unbiased.",
            explainDE: "Durch die Linearität des Erwartungswerts gilt E[X̄ₙ] = (1/n)∑E[Xᵢ] = (1/n)(nμ) = μ, sodass der Stichprobenmittelwert erwartungstreu ist."
        },
        {
            q: 'We want to estimate g(θ) = θ² using T = θ̂² where θ̂ is unbiased for θ with Var(θ̂) = 5. Since E[θ̂²] = θ² + Var(θ̂), what is Bias(T) in terms of the given variance? Enter as a whole number.',
            qDE: 'Wir wollen g(θ) = θ² mit T = θ̂² schätzen, wobei θ̂ erwartungstreu für θ mit Var(θ̂) = 5 ist. Da E[θ̂²] = θ² + Var(θ̂), wie groß ist Bias(T) anhand der gegebenen Varianz? Gib als ganze Zahl ein.',
            answer: 5, tolerance: 0, unit: '',
            hintEn: 'Bias(T) = E[T] − θ² = (θ² + Var(θ̂)) − θ² = Var(θ̂).',
            hintDE: 'Bias(T) = E[T] − θ² = (θ² + Var(θ̂)) − θ² = Var(θ̂).',
            explain: "Since Bias(T) = E[T] − θ² = (θ² + Var(θ̂)) − θ² = Var(θ̂) = 5, squaring an unbiased estimator introduces bias equal to its variance.",
            explainDE: "Da Bias(T) = E[T] − θ² = (θ² + Var(θ̂)) − θ² = Var(θ̂) = 5 ist, führt das Quadrieren eines erwartungstreuen Schätzers zu einem Bias, der gleich seiner Varianz ist."
        },
        {
            q: 'A sample of size n=5 gives ∑(Xᵢ − X̄)² = 40. Compute the unbiased sample variance estimate S² = (1/(n−1))∑(Xᵢ − X̄)².',
            qDE: 'Eine Stichprobe vom Umfang n=5 liefert ∑(Xᵢ − X̄)² = 40. Berechne den erwartungstreuen Schätzwert S² = (1/(n−1))∑(Xᵢ − X̄)².',
            answer: 10, tolerance: 0, unit: '',
            hintEn: 'Divide the sum of squared deviations by (n−1), not n.',
            hintDE: 'Teile die Summe der quadrierten Abweichungen durch (n−1), nicht durch n.',
            explain: "Dividing the sum of squared deviations by (n−1) = 4 gives S² = 40/4 = 10.",
            explainDE: "Das Teilen der Summe der quadrierten Abweichungen durch (n−1) = 4 ergibt S² = 40/4 = 10."
        },

        // ── 2. ASYMPTOTISCHE ERWARTUNGSTREUE ──────────────────────────────────────

        {
            q: 'An estimator θ̂ₙ has E[θ̂ₙ] = θ + 3/n. As n → ∞, does E[θ̂ₙ] converge to θ? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Schätzer θ̂ₙ hat E[θ̂ₙ] = θ + 3/n. Konvergiert E[θ̂ₙ] für n → ∞ gegen θ? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Consider what happens to the term 3/n as n grows without bound.',
            hintDE: 'Überlege, was mit dem Term 3/n passiert, wenn n unbeschränkt wächst.',
            explain: "As n → ∞, the term 3/n vanishes, so E[θ̂ₙ] = θ + 3/n converges to θ, meaning the estimator is asymptotically unbiased.",
            explainDE: "Für n → ∞ verschwindet der Term 3/n, sodass E[θ̂ₙ] = θ + 3/n gegen θ konvergiert; der Schätzer ist also asymptotisch erwartungstreu."
        },
        {
            q: 'The biased variance estimator has E[(1/n)∑(Xᵢ−X̄)²] = ((n−1)/n)·σ². For n = 20 and σ² = 4, what is the bias? Round to 2 decimal places.',
            qDE: 'Der verzerrte Varianzschätzer hat E[(1/n)∑(Xᵢ−X̄)²] = ((n−1)/n)·σ². Für n = 20 und σ² = 4: wie groß ist der Bias? Runde auf 2 Nachkommastellen.',
            answer: -0.2, tolerance: 0.01, unit: '',
            hintEn: 'Bias = ((n−1)/n)·σ² − σ² = −σ²/n. Plug in n=20, σ²=4.',
            hintDE: 'Bias = ((n−1)/n)·σ² − σ² = −σ²/n. Setze n=20, σ²=4 ein.',
            explain: "Using Bias = −σ²/n = −4/20 = −0.2, this negative value shows the biased estimator systematically underestimates the true variance.",
            explainDE: "Mit Bias = −σ²/n = −4/20 = −0,2 zeigt dieser negative Wert, dass der verzerrte Schätzer die wahre Varianz systematisch unterschätzt."
        },
        {
            q: 'For the biased variance estimator, Bias = −σ²/n. As n → ∞, does this bias vanish (approach 0)? Enter 0 for yes, 1 for no.',
            qDE: 'Für den verzerrten Varianzschätzer gilt Bias = −σ²/n. Verschwindet dieser Bias für n → ∞ (nähert sich 0)? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Look at what −σ²/n approaches as n becomes very large.',
            hintDE: 'Überlege, wogegen −σ²/n für sehr großes n strebt.',
            explain: "Since −σ²/n → 0 as n → ∞, the bias vanishes, making this estimator asymptotically unbiased.",
            explainDE: "Da −σ²/n → 0 für n → ∞ gilt, verschwindet der Bias, sodass dieser Schätzer asymptotisch erwartungstreu ist."
        },

        // ── 3. MSE UND ZERLEGUNG ──────────────────────────────────────────────────

        {
            q: 'An estimator θ̂ has Bias(θ̂) = 3 and Var(θ̂) = 4. What is MSE(θ̂)?',
            qDE: 'Ein Schätzer θ̂ hat Bias(θ̂) = 3 und Var(θ̂) = 4. Wie groß ist MSE(θ̂)?',
            answer: 13, tolerance: 0, unit: '',
            hintEn: 'MSE(θ̂) = Var(θ̂) + Bias(θ̂)². Square the bias first.',
            hintDE: 'MSE(θ̂) = Var(θ̂) + Bias(θ̂)². Quadriere zuerst den Bias.',
            explain: "Applying the MSE decomposition: MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 4 + 3² = 4 + 9 = 13.",
            explainDE: "Mit der MSE-Zerlegung: MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 4 + 3² = 4 + 9 = 13."
        },
        {
            q: 'An estimator θ̂ has Bias(θ̂) = −4 and Var(θ̂) = 5. What is MSE(θ̂)?',
            qDE: 'Ein Schätzer θ̂ hat Bias(θ̂) = −4 und Var(θ̂) = 5. Wie groß ist MSE(θ̂)?',
            answer: 21, tolerance: 0, unit: '',
            hintEn: 'MSE(θ̂) = Var(θ̂) + Bias(θ̂)². A negative bias still contributes positively once squared.',
            hintDE: 'MSE(θ̂) = Var(θ̂) + Bias(θ̂)². Ein negativer Bias trägt nach dem Quadrieren trotzdem positiv bei.',
            explain: "Applying the decomposition: MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 5 + (−4)² = 5 + 16 = 21.",
            explainDE: "Mit der Zerlegung: MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 5 + (−4)² = 5 + 16 = 21."
        },
        {
            q: 'An unbiased estimator θ̂ has Var(θ̂) = 8. What is MSE(θ̂)?',
            qDE: 'Ein erwartungstreuer Schätzer θ̂ hat Var(θ̂) = 8. Wie groß ist MSE(θ̂)?',
            answer: 8, tolerance: 0, unit: '',
            hintEn: 'For an unbiased estimator, Bias = 0, so the bias² term drops out.',
            hintDE: 'Bei einem erwartungstreuen Schätzer ist Bias = 0, daher entfällt der Bias²-Term.',
            explain: "Since the estimator is unbiased, Bias = 0, so MSE(θ̂) = Var(θ̂) + 0² = 8; for unbiased estimators, MSE always equals the variance.",
            explainDE: "Da der Schätzer erwartungstreu ist, gilt Bias = 0, sodass MSE(θ̂) = Var(θ̂) + 0² = 8 ist; bei erwartungstreuen Schätzern entspricht der MSE stets der Varianz."
        },
        {
            q: 'An estimator θ̂ has MSE(θ̂) = 25 and Var(θ̂) = 16. What is |Bias(θ̂)|?',
            qDE: 'Ein Schätzer θ̂ hat MSE(θ̂) = 25 und Var(θ̂) = 16. Wie groß ist |Bias(θ̂)|?',
            answer: 3, tolerance: 0, unit: '',
            hintEn: 'Rearrange MSE = Var + Bias² to solve for Bias², then take the square root.',
            hintDE: 'Forme MSE = Var + Bias² nach Bias² um und ziehe dann die Wurzel.',
            explain: "Rearranging MSE = Var + Bias² gives Bias² = MSE − Var = 25 − 16 = 9, so |Bias(θ̂)| = √9 = 3.",
            explainDE: "Das Umformen von MSE = Var + Bias² ergibt Bias² = MSE − Var = 25 − 16 = 9, sodass |Bias(θ̂)| = √9 = 3 ist."
        },
        {
            q: 'θ̂ has E[θ̂] = 8, θ = 5, and Var(θ̂) = 2. Compute MSE(θ̂).',
            qDE: 'θ̂ hat E[θ̂] = 8, θ = 5 und Var(θ̂) = 2. Berechne MSE(θ̂).',
            answer: 11, tolerance: 0, unit: '',
            hintEn: 'First find Bias(θ̂) = E[θ̂] − θ, then apply MSE = Var(θ̂) + Bias(θ̂)².',
            hintDE: 'Bestimme zuerst Bias(θ̂) = E[θ̂] − θ und wende dann MSE = Var(θ̂) + Bias(θ̂)² an.',
            explain: "First, Bias(θ̂) = E[θ̂] − θ = 8 − 5 = 3, then MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 2 + 3² = 2 + 9 = 11.",
            explainDE: "Zunächst gilt Bias(θ̂) = E[θ̂] − θ = 8 − 5 = 3, dann MSE(θ̂) = Var(θ̂) + Bias(θ̂)² = 2 + 3² = 2 + 9 = 11."
        },

        // ── 4. KONSISTENZ (SCHWACH / STARK) ───────────────────────────────────────

        {
            q: 'An estimator θ̂ₙ has Var(θ̂ₙ) = σ²/n and is unbiased for every n. As n → ∞, does θ̂ₙ converge in probability to θ (i.e. is it weakly consistent)? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Schätzer θ̂ₙ hat Var(θ̂ₙ) = σ²/n und ist für jedes n erwartungstreu. Konvergiert θ̂ₙ für n → ∞ stochastisch gegen θ (d.h. ist er schwach konsistent)? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Since θ̂ₙ is unbiased and Var(θ̂ₙ) → 0, apply Chebyshev\'s inequality to conclude convergence in probability.',
            hintDE: 'Da θ̂ₙ erwartungstreu ist und Var(θ̂ₙ) → 0, wende die Tschebyscheff-Ungleichung an, um auf stochastische Konvergenz zu schließen.',
            explain: "Since θ̂ₙ is unbiased and Var(θ̂ₙ) = σ²/n → 0 as n → ∞, Chebyshev's inequality guarantees convergence in probability to θ, so θ̂ₙ is weakly consistent.",
            explainDE: "Da θ̂ₙ erwartungstreu ist und Var(θ̂ₙ) = σ²/n → 0 für n → ∞ gilt, garantiert die Tschebyscheff-Ungleichung stochastische Konvergenz gegen θ, sodass θ̂ₙ schwach konsistent ist."
        },
        {
            q: 'An estimator θ̂ₙ has Var(θ̂ₙ) = 5 (constant, does not shrink with n) and is unbiased. Is θ̂ₙ weakly consistent for θ? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Schätzer θ̂ₙ hat Var(θ̂ₙ) = 5 (konstant, schrumpft nicht mit n) und ist erwartungstreu. Ist θ̂ₙ schwach konsistent für θ? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'For consistency via Chebyshev we typically need Var(θ̂ₙ) → 0 as n → ∞. Does a constant variance shrink?',
            hintDE: 'Für Konsistenz via Tschebyscheff braucht man i.d.R. Var(θ̂ₙ) → 0 für n → ∞. Schrumpft eine konstante Varianz?',
            explain: "Since the variance stays constant at 5 and does not shrink to 0 as n → ∞, the Chebyshev-based argument fails, so this estimator is not weakly consistent.",
            explainDE: "Da die Varianz konstant bei 5 bleibt und für n → ∞ nicht gegen 0 schrumpft, greift das Tschebyscheff-Argument nicht, sodass dieser Schätzer nicht schwach konsistent ist."
        },
        {
            q: 'By the Strong Law of Large Numbers, X̄ₙ → μ almost surely for i.i.d. Xᵢ with finite mean. Does almost sure convergence make X̄ₙ a strongly consistent estimator of μ? Enter 1 for yes, 0 for no.',
            qDE: 'Nach dem starken Gesetz der großen Zahlen gilt X̄ₙ → μ fast sicher für i.i.d. Xᵢ mit endlichem Erwartungswert. Macht fast sichere Konvergenz X̄ₙ zu einem stark konsistenten Schätzer für μ? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Strong consistency is defined exactly via almost sure convergence to the true parameter.',
            hintDE: 'Starke Konsistenz ist genau über fast sichere Konvergenz gegen den wahren Parameter definiert.',
            explain: "Since strong consistency is defined precisely as almost sure convergence to the true parameter, the strong law of large numbers directly establishes X̄ₙ as strongly consistent for μ.",
            explainDE: "Da starke Konsistenz genau als fast sichere Konvergenz gegen den wahren Parameter definiert ist, zeigt das starke Gesetz der großen Zahlen direkt, dass X̄ₙ stark konsistent für μ ist."
        },
        {
            q: 'If an estimator θ̂ₙ is strongly consistent, is it automatically also weakly consistent? Enter 1 for yes, 0 for no.',
            qDE: 'Wenn ein Schätzer θ̂ₙ stark konsistent ist, ist er dann automatisch auch schwach konsistent? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Recall the implication between the two modes of convergence used to define these consistency types.',
            hintDE: 'Erinnere dich an die Implikation zwischen den beiden Konvergenzarten, die diese Konsistenzbegriffe definieren.',
            explain: "Since almost sure convergence always implies convergence in probability, strong consistency automatically implies weak consistency.",
            explainDE: "Da fast sichere Konvergenz stets die stochastische Konvergenz impliziert, folgt aus starker Konsistenz automatisch auch schwache Konsistenz."
        },

        // ── 5. EFFIZIENZ (BEI ERWARTUNGSTREUEN SCHÄTZERN) ─────────────────────────

        {
            q: 'θ̂₁ and θ̂₂ are both unbiased for θ, with Var(θ̂₁) = 9 and Var(θ̂₂) = 6. Which estimator is more efficient? Enter 1 for θ̂₁, 2 for θ̂₂.',
            qDE: 'θ̂₁ und θ̂₂ sind beide erwartungstreu für θ, mit Var(θ̂₁) = 9 und Var(θ̂₂) = 6. Welcher Schätzer ist effizienter? Gib 1 für θ̂₁, 2 für θ̂₂ ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Among unbiased estimators, the more efficient one is the one with the smaller variance.',
            hintDE: 'Unter erwartungstreuen Schätzern ist derjenige effizienter, der die kleinere Varianz hat.',
            explain: "Since both estimators are unbiased, efficiency is compared purely by variance, and since 6 < 9, θ̂₂ is more efficient.",
            explainDE: "Da beide Schätzer erwartungstreu sind, wird die Effizienz allein anhand der Varianz verglichen, und da 6 < 9 ist, ist θ̂₂ effizienter."
        },
        {
            q: 'X̄ₙ (sample mean) is unbiased for μ with Var(X̄ₙ) = σ²/n. An alternative unbiased estimator uses only the first observation X₁, with Var(X₁) = σ². For n = 4, which has smaller variance? Enter 1 for X₁, 2 for X̄ₙ.',
            qDE: 'X̄ₙ (Stichprobenmittel) ist erwartungstreu für μ mit Var(X̄ₙ) = σ²/n. Ein alternativer erwartungstreuer Schätzer nutzt nur die erste Beobachtung X₁, mit Var(X₁) = σ². Für n = 4: welcher hat die kleinere Varianz? Gib 1 für X₁, 2 für X̄ₙ ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'Compare σ²/4 with σ². Which fraction of σ² is smaller?',
            hintDE: 'Vergleiche σ²/4 mit σ². Welcher Anteil von σ² ist kleiner?',
            explain: "Comparing Var(X̄ₙ) = σ²/4 with Var(X₁) = σ², the former is smaller, so the sample mean is the more efficient (and more sensible) estimator.",
            explainDE: "Der Vergleich von Var(X̄ₙ) = σ²/4 mit Var(X₁) = σ² zeigt, dass Ersteres kleiner ist, sodass der Stichprobenmittelwert der effizientere (und sinnvollere) Schätzer ist."
        },
        {
            q: 'Two unbiased estimators θ̂₁ and θ̂₂ have Var(θ̂₁) = Var(θ̂₂) = 7. Are they equally efficient? Enter 1 for yes, 0 for no.',
            qDE: 'Zwei erwartungstreue Schätzer θ̂₁ und θ̂₂ haben Var(θ̂₁) = Var(θ̂₂) = 7. Sind sie gleich effizient? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Efficiency comparison among unbiased estimators is based purely on variance — compare the two values.',
            hintDE: 'Der Effizienzvergleich unter erwartungstreuen Schätzern basiert allein auf der Varianz — vergleiche die beiden Werte.',
            explain: "Since both unbiased estimators have identical variance (7 = 7), they are equally efficient.",
            explainDE: "Da beide erwartungstreuen Schätzer die gleiche Varianz haben (7 = 7), sind sie gleich effizient."
        },

        // ── 6. MSE-EFFIZIENZ (BEI BELIEBIGEN SCHÄTZERN) ───────────────────────────

        {
            q: 'θ̂₁ (biased) has MSE(θ̂₁) = 4. θ̂₂ (unbiased) has MSE(θ̂₂) = 10. Which is MSE-efficient? Enter 1 for θ̂₁, 2 for θ̂₂.',
            qDE: 'θ̂₁ (verzerrt) hat MSE(θ̂₁) = 4. θ̂₂ (erwartungstreu) hat MSE(θ̂₂) = 10. Welcher ist MSE-effizient? Gib 1 für θ̂₁, 2 für θ̂₂ ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'MSE-efficiency compares MSE values directly, regardless of bias — pick the smaller MSE.',
            hintDE: 'MSE-Effizienz vergleicht die MSE-Werte direkt, unabhängig vom Bias — wähle den kleineren MSE.',
            explain: "Since 4 < 10, θ̂₁ has the smaller MSE and is therefore MSE-efficient, even though it is biased — a biased estimator can outperform an unbiased one in terms of MSE.",
            explainDE: "Da 4 < 10 ist, hat θ̂₁ den kleineren MSE und ist daher MSE-effizient, obwohl er verzerrt ist — ein verzerrter Schätzer kann einem erwartungstreuen hinsichtlich des MSE überlegen sein."
        },
        {
            q: 'θ̂₁ has Bias = 1 and Var = 5. θ̂₂ has Bias = 0 and Var = 7. Compute MSE(θ̂₁) and MSE(θ̂₂), then enter the smaller of the two MSE values.',
            qDE: 'θ̂₁ hat Bias = 1 und Var = 5. θ̂₂ hat Bias = 0 und Var = 7. Berechne MSE(θ̂₁) und MSE(θ̂₂) und gib den kleineren der beiden MSE-Werte ein.',
            answer: 6, tolerance: 0, unit: '',
            hintEn: 'Compute MSE = Var + Bias² separately for each estimator, then compare.',
            hintDE: 'Berechne MSE = Var + Bias² für jeden Schätzer einzeln und vergleiche dann.',
            explain: "MSE(θ̂₁) = 5 + 1² = 6 and MSE(θ̂₂) = 7 + 0² = 7, so the smaller value is 6.",
            explainDE: "MSE(θ̂₁) = 5 + 1² = 6 und MSE(θ̂₂) = 7 + 0² = 7, sodass der kleinere Wert 6 ist."
        },
        {
            q: 'θ̂₁ has Bias = 2, Var = 1. θ̂₂ has Bias = 0, Var = 4. Which estimator is MSE-efficient? Enter 1 for θ̂₁, 2 for θ̂₂.',
            qDE: 'θ̂₁ hat Bias = 2, Var = 1. θ̂₂ hat Bias = 0, Var = 4. Welcher Schätzer ist MSE-effizient? Gib 1 für θ̂₁, 2 für θ̂₂ ein.',
            answer: 2, tolerance: 0, unit: '',
            hintEn: 'MSE(θ̂₁) = 1 + 2² and MSE(θ̂₂) = 4 + 0². Compute both and compare.',
            hintDE: 'MSE(θ̂₁) = 1 + 2² und MSE(θ̂₂) = 4 + 0². Berechne beide und vergleiche.',
            explain: "MSE(θ̂₁) = 1 + 2² = 5 while MSE(θ̂₂) = 4 + 0² = 4, so θ̂₂ has the smaller MSE and is MSE-efficient.",
            explainDE: "MSE(θ̂₁) = 1 + 2² = 5, während MSE(θ̂₂) = 4 + 0² = 4 ist, sodass θ̂₂ den kleineren MSE hat und MSE-effizient ist."
        },
        {
            q: 'If both θ̂₁ and θ̂₂ are unbiased, comparing them by MSE-efficiency is equivalent to comparing them by which quantity? Enter 1 for variance, 2 for bias.',
            qDE: 'Wenn sowohl θ̂₁ als auch θ̂₂ erwartungstreu sind, ist der Vergleich nach MSE-Effizienz äquivalent zum Vergleich nach welcher Größe? Gib 1 für Varianz, 2 für Bias ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'When Bias = 0 for both estimators, the bias² term in MSE = Var + Bias² disappears for both.',
            hintDE: 'Wenn Bias = 0 für beide Schätzer gilt, entfällt der Bias²-Term in MSE = Var + Bias² für beide.',
            explain: "Since both estimators are unbiased, the bias² term vanishes for both, so MSE reduces to just the variance, making an MSE comparison equivalent to a variance comparison.",
            explainDE: "Da beide Schätzer erwartungstreu sind, entfällt der Bias²-Term bei beiden, sodass der MSE sich auf die reine Varianz reduziert und ein MSE-Vergleich einem Varianzvergleich entspricht."
        },

    ],


    10: [

        // ── 1. KONFIDENZINTERVALL FÜR ERWARTUNGSWERT (σ² bekannt) ────────────────

        {
            q: 'X̄ₙ = 50, σ = 8, n = 16. Compute the margin of error for a two-sided 95% CI for μ using z_{0.975} = 1.96. Round to 2 decimal places.',
            qDE: 'X̄ₙ = 50, σ = 8, n = 16. Berechne die Fehlerspanne für ein zweiseitiges 95%-KI für μ mit z_{0,975} = 1,96. Auf 2 Dezimalstellen runden.',
            answer: 3.92, tolerance: 0.05, unit: '',
            hintEn: 'Margin = z_{1−α/2} · σ/√n = 1.96 × 8/√16 = 1.96 × 2 = 3.92.',
            hintDE: 'Fehlerspanne = z_{1−α/2} · σ/√n = 1,96 × 8/√16 = 1,96 × 2 = 3,92.',
            explain: "Plugging in the values: margin = z_{1−α/2}·σ/√n = 1.96 × 8/√16 = 1.96 × 2 = 3.92.",
            explainDE: "Einsetzen der Werte: Fehlerspanne = z_{1−α/2}·σ/√n = 1,96 × 8/√16 = 1,96 × 2 = 3,92."
        },
        {
            q: 'X̄ₙ = 100, σ = 15, n = 25, z_{0.95} = 1.645. What is the upper bound of the one-sided (upper) 95% CI for μ? Round to 2 decimal places.',
            qDE: 'X̄ₙ = 100, σ = 15, n = 25, z_{0,95} = 1,645. Wie lautet die obere Grenze des einseitigen (oberen) 95%-KI für μ? Auf 2 Dezimalstellen runden.',
            answer: 104.94, tolerance: 0.1, unit: '',
            hintEn: 'Upper bound = X̄ₙ + z_{1−α} · σ/√n = 100 + 1.645 × 15/5 = 100 + 4.935.',
            hintDE: 'Obere Grenze = X̄ₙ + z_{1−α} · σ/√n = 100 + 1,645 × 15/5 = 100 + 4,935.',
            explain: "Computing the upper bound: X̄ₙ + z_{1−α}·σ/√n = 100 + 1.645 × 15/5 = 100 + 4.935 = 104.935 ≈ 104.94.",
            explainDE: "Berechnung der oberen Grenze: X̄ₙ + z_{1−α}·σ/√n = 100 + 1,645 × 15/5 = 100 + 4,935 = 104,935 ≈ 104,94."
        },
        {
            q: 'A 95% two-sided CI for μ is [46.08, 53.92]. What is the point estimate X̄ₙ (the midpoint)?',
            qDE: 'Ein zweiseitiges 95%-KI für μ ist [46,08, 53,92]. Wie lautet der Punktschätzer X̄ₙ (der Mittelpunkt)?',
            answer: 50, tolerance: 0.1, unit: '',
            hintEn: 'The midpoint of a symmetric CI is the point estimate.',
            hintDE: 'Der Mittelpunkt eines symmetrischen KI ist der Punktschätzer.',
            explain: "Since a two-sided CI is symmetric around the point estimate, X̄ₙ = (46.08 + 53.92)/2 = 100/2 = 50.",
            explainDE: "Da ein zweiseitiges KI symmetrisch um den Punktschätzer liegt, gilt X̄ₙ = (46,08 + 53,92)/2 = 100/2 = 50."
        },

        // ── 2. KONFIDENZINTERVALL FÜR ERWARTUNGSWERT (σ² unbekannt, t-Verteilung) ──

        {
            q: 'X̄ₙ = 20, Sₙ = 4, n = 9, t_{8, 0.975} = 2.306. Compute the margin of error of the two-sided 95% CI for μ. Round to 2 decimal places.',
            qDE: 'X̄ₙ = 20, Sₙ = 4, n = 9, t_{8; 0,975} = 2,306. Berechne die Fehlerspanne des zweiseitigen 95%-KI für μ. Auf 2 Dezimalstellen runden.',
            answer: 3.07, tolerance: 0.05, unit: '',
            hintEn: 'Margin = t_{n−1, 1−α/2} · Sₙ/√n = 2.306 × 4/3 ≈ 3.07.',
            hintDE: 'Fehlerspanne = t_{n−1; 1−α/2} · Sₙ/√n = 2,306 × 4/3 ≈ 3,07.',
            explain: "Plugging in: margin = t_{n−1,1−α/2}·Sₙ/√n = 2.306 × 4/3 = 2.306 × 1.333 ≈ 3.07.",
            explainDE: "Einsetzen: Fehlerspanne = t_{n−1;1−α/2}·Sₙ/√n = 2,306 × 4/3 = 2,306 × 1,333 ≈ 3,07."
        },
        {
            q: 'A sample has n = 10 observations. How many degrees of freedom does the t-distribution have for the CI of μ (unknown σ²)?',
            qDE: 'Eine Stichprobe hat n = 10 Beobachtungen. Wie viele Freiheitsgrade hat die t-Verteilung für das KI von μ (σ² unbekannt)?',
            answer: 9, tolerance: 0, unit: '',
            hintEn: 'Degrees of freedom = n − 1 = 10 − 1 = 9.',
            hintDE: 'Freiheitsgrade = n − 1 = 10 − 1 = 9.',
            explain: "The t-distribution here has n − 1 = 10 − 1 = 9 degrees of freedom, since one degree of freedom is lost from estimating the sample mean.",
            explainDE: "Die t-Verteilung hat hier n − 1 = 10 − 1 = 9 Freiheitsgrade, da ein Freiheitsgrad durch die Schätzung des Stichprobenmittelwerts verloren geht."
        },

        // ── 3. KONFIDENZINTERVALL FÜR VARIANZ (CHI-QUADRAT) ──────────────────────

        {
            q: 'n = 10, Sₙ² = 4. How many degrees of freedom does the chi-squared distribution have for the CI of σ²?',
            qDE: 'n = 10, Sₙ² = 4. Wie viele Freiheitsgrade hat die Chi-Quadrat-Verteilung für das KI von σ²?',
            answer: 9, tolerance: 0, unit: '',
            hintEn: 'The chi-squared distribution here has n − 1 degrees of freedom.',
            hintDE: 'Die Chi-Quadrat-Verteilung hat hier n − 1 Freiheitsgrade.',
            explain: "As with the t-distribution case, the chi-squared distribution for the variance CI has n − 1 = 10 − 1 = 9 degrees of freedom.",
            explainDE: "Wie im Fall der t-Verteilung hat die Chi-Quadrat-Verteilung für das Varianz-KI n − 1 = 10 − 1 = 9 Freiheitsgrade."
        },
        {
            q: 'n = 15, Sₙ² = 6, χ²_{14, 0.975} = 26.12. Compute the lower bound of the two-sided 95% CI for σ². Round to 2 decimal places.',
            qDE: 'n = 15, Sₙ² = 6, χ²_{14; 0,975} = 26,12. Berechne die untere Grenze des zweiseitigen 95%-KI für σ². Auf 2 Dezimalstellen runden.',
            answer: 3.22, tolerance: 0.05, unit: '',
            hintEn: 'Lower bound = (n−1)·Sₙ² / χ²_{n−1, 1−α/2} = 14×6/26.12 ≈ 3.22.',
            hintDE: 'Untere Grenze = (n−1)·Sₙ² / χ²_{n−1; 1−α/2} = 14×6/26,12 ≈ 3,22.',
            explain: "Plugging in: lower bound = (n−1)·Sₙ²/χ²_{n−1,1−α/2} = 14×6/26.12 = 84/26.12 ≈ 3.22.",
            explainDE: "Einsetzen: untere Grenze = (n−1)·Sₙ²/χ²_{n−1;1−α/2} = 14×6/26,12 = 84/26,12 ≈ 3,22."
        },

        // ── 4. KONFIDENZINTERVALL FÜR p (BINOMIAL, APPROXIMATIV) ─────────────────

        {
            q: 'In a sample of n = 200, X = 40 successes are observed. What is the point estimate p̂? Round to 3 decimal places.',
            qDE: 'In einer Stichprobe von n = 200 werden X = 40 Erfolge beobachtet. Wie lautet der Punktschätzer p̂? Auf 3 Dezimalstellen runden.',
            answer: 0.2, tolerance: 0.001, unit: '',
            hintEn: 'p̂ = X/n = 40/200 = 0.2.',
            hintDE: 'p̂ = X/n = 40/200 = 0,2.',
            explain: "The point estimate is simply the observed proportion of successes: p̂ = X/n = 40/200 = 0.2.",
            explainDE: "Der Punktschätzer ist einfach der beobachtete Anteil der Erfolge: p̂ = X/n = 40/200 = 0,2."
        },
        {
            q: 'p̂ = 0.2, n = 200, z_{0.975} = 1.96. Compute the margin of error of the approximate two-sided 95% CI for p. Round to 3 decimal places.',
            qDE: 'p̂ = 0,2, n = 200, z_{0,975} = 1,96. Berechne die Fehlerspanne des approximativen zweiseitigen 95%-KI für p. Auf 3 Dezimalstellen runden.',
            answer: 0.055, tolerance: 0.003, unit: '',
            hintEn: 'Margin = z_{1−α/2}·√(p̂(1−p̂)/n) = 1.96×√(0.2×0.8/200) ≈ 1.96×0.0283 ≈ 0.055.',
            hintDE: 'Fehlerspanne = z_{1−α/2}·√(p̂(1−p̂)/n) = 1,96×√(0,2×0,8/200) ≈ 1,96×0,0283 ≈ 0,055.',
            explain: "Plugging in: margin = z_{1−α/2}·√(p̂(1−p̂)/n) = 1.96×√(0.2×0.8/200) = 1.96×√0.0008 ≈ 1.96×0.0283 ≈ 0.055.",
            explainDE: "Einsetzen: Fehlerspanne = z_{1−α/2}·√(p̂(1−p̂)/n) = 1,96×√(0,2×0,8/200) = 1,96×√0,0008 ≈ 1,96×0,0283 ≈ 0,055."
        },

        // ── 5. FEHLER 1./2. ART, SIGNIFIKANZNIVEAU, POWER ────────────────────────

        {
            q: 'A test has significance level α = 0.05. What is the maximum allowed probability of a Type I error? Round to 3 decimal places.',
            qDE: 'Ein Test hat das Signifikanzniveau α = 0,05. Wie hoch ist die maximal zulässige Wahrscheinlichkeit für einen Fehler 1. Art? Auf 3 Dezimalstellen runden.',
            answer: 0.05, tolerance: 0.001, unit: '',
            hintEn: 'By definition, α bounds the probability of a Type I error.',
            hintDE: 'Per Definition begrenzt α die Wahrscheinlichkeit eines Fehlers 1. Art.',
            explain: "By definition, the significance level α is exactly the maximum allowed probability of falsely rejecting a true H₀ (a Type I error), so the answer is 0.05.",
            explainDE: "Per Definition ist das Signifikanzniveau α genau die maximal zulässige Wahrscheinlichkeit, ein wahres H₀ fälschlicherweise zu verwerfen (Fehler 1. Art), also 0,05."
        },
        {
            q: 'The probability of a Type II error is β = 0.2. What is the power of the test? Round to 3 decimal places.',
            qDE: 'Die Wahrscheinlichkeit für einen Fehler 2. Art beträgt β = 0,2. Wie groß ist die Power des Tests? Auf 3 Dezimalstellen runden.',
            answer: 0.8, tolerance: 0.001, unit: '',
            hintEn: 'Power = 1 − β = 1 − 0.2 = 0.8.',
            hintDE: 'Power = 1 − β = 1 − 0,2 = 0,8.',
            explain: "The power of a test is defined as 1 − β = 1 − 0.2 = 0.8, the probability of correctly rejecting a false H₀.",
            explainDE: "Die Power eines Tests ist definiert als 1 − β = 1 − 0,2 = 0,8, die Wahrscheinlichkeit, ein falsches H₀ korrekt zu verwerfen."
        },
        {
            q: 'A test has power 0.75. What is the probability β of a Type II error? Round to 3 decimal places.',
            qDE: 'Ein Test hat die Power 0,75. Wie groß ist die Wahrscheinlichkeit β für einen Fehler 2. Art? Auf 3 Dezimalstellen runden.',
            answer: 0.25, tolerance: 0.001, unit: '',
            hintEn: 'β = 1 − Power = 1 − 0.75 = 0.25.',
            hintDE: 'β = 1 − Power = 1 − 0,75 = 0,25.',
            explain: "Rearranging the relationship Power = 1 − β gives β = 1 − Power = 1 − 0.75 = 0.25.",
            explainDE: "Das Umformen von Power = 1 − β ergibt β = 1 − Power = 1 − 0,75 = 0,25."
        },

        // ── 6. GAUSS-TEST (Z-TEST, EIN STICHPROBE) ───────────────────────────────

        {
            q: 'H₀: μ = 50. X̄ₙ = 53, σ = 6, n = 36. Compute the test statistic Z of the one-sample Gauß-test. Round to 2 decimal places.',
            qDE: 'H₀: μ = 50. X̄ₙ = 53, σ = 6, n = 36. Berechne die Teststatistik Z des Ein-Stichproben-Gauß-Tests. Auf 2 Dezimalstellen runden.',
            answer: 3, tolerance: 0.05, unit: '',
            hintEn: 'Z = (X̄ₙ − μ₀)/(σ/√n) = (53−50)/(6/6) = 3/1 = 3.',
            hintDE: 'Z = (X̄ₙ − μ₀)/(σ/√n) = (53−50)/(6/6) = 3/1 = 3.',
            explain: "Plugging into the test statistic formula: Z = (X̄ₙ − μ₀)/(σ/√n) = (53−50)/(6/√36) = 3/1 = 3.",
            explainDE: "Einsetzen in die Teststatistik-Formel: Z = (X̄ₙ − μ₀)/(σ/√n) = (53−50)/(6/√36) = 3/1 = 3."
        },
        {
            q: 'A two-sided Gauß-test gives Z = 1.2. The critical value is z_{0.975} = 1.96. Is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein zweiseitiger Gauß-Test ergibt Z = 1,2. Der kritische Wert ist z_{0,975} = 1,96. Wird H₀ verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ only if |Z| > z_{1−α/2}. Here |1.2| < 1.96, so H₀ is not rejected.',
            hintDE: 'H₀ wird nur verworfen, wenn |Z| > z_{1−α/2}. Hier gilt |1,2| < 1,96, also wird H₀ nicht verworfen.',
            explain: "Since |Z| = 1.2 does not exceed the critical value 1.96, H₀ is not rejected.",
            explainDE: "Da |Z| = 1,2 den kritischen Wert 1,96 nicht überschreitet, wird H₀ nicht verworfen."
        },
        {
            q: 'A one-sided (upper-tailed) Gauß-test of H₀: μ ≤ μ₀ gives Z = 1.5. The critical value is z_{0.95} = 1.645. Is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein einseitiger (oberer) Gauß-Test von H₀: μ ≤ μ₀ ergibt Z = 1,5. Der kritische Wert ist z_{0,95} = 1,645. Wird H₀ verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ only if Z > z_{1−α}. Here 1.5 < 1.645, so H₀ is not rejected.',
            hintDE: 'H₀ wird nur verworfen, wenn Z > z_{1−α}. Hier gilt 1,5 < 1,645, also wird H₀ nicht verworfen.',
            explain: "Since Z = 1.5 is smaller than the critical value 1.645, there is not enough evidence to reject H₀.",
            explainDE: "Da Z = 1,5 kleiner ist als der kritische Wert 1,645, gibt es nicht genügend Evidenz, um H₀ zu verwerfen."
        },

        // ── 7. T-TEST (EIN STICHPROBE) ────────────────────────────────────────────

        {
            q: 'H₀: μ = 10. X̄ₙ = 11.5, Sₙ = 3, n = 16. Compute the test statistic T of the one-sample t-test. Round to 2 decimal places.',
            qDE: 'H₀: μ = 10. X̄ₙ = 11,5, Sₙ = 3, n = 16. Berechne die Teststatistik T des Ein-Stichproben-t-Tests. Auf 2 Dezimalstellen runden.',
            answer: 2, tolerance: 0.05, unit: '',
            hintEn: 'T = (X̄ₙ − μ₀)/(Sₙ/√n) = (11.5−10)/(3/4) = 1.5/0.75 = 2.',
            hintDE: 'T = (X̄ₙ − μ₀)/(Sₙ/√n) = (11,5−10)/(3/4) = 1,5/0,75 = 2.',
            explain: "Plugging into the t-test statistic: T = (X̄ₙ − μ₀)/(Sₙ/√n) = (11.5−10)/(3/√16) = 1.5/0.75 = 2.",
            explainDE: "Einsetzen in die t-Test-Statistik: T = (X̄ₙ − μ₀)/(Sₙ/√n) = (11,5−10)/(3/√16) = 1,5/0,75 = 2."
        },
        {
            q: 'A one-sample t-test uses a sample of size n = 12. How many degrees of freedom does the test statistic have under H₀?',
            qDE: 'Ein Ein-Stichproben-t-Test verwendet eine Stichprobe der Größe n = 12. Wie viele Freiheitsgrade hat die Teststatistik unter H₀?',
            answer: 11, tolerance: 0, unit: '',
            hintEn: 'Degrees of freedom = n − 1 = 12 − 1 = 11.',
            hintDE: 'Freiheitsgrade = n − 1 = 12 − 1 = 11.',
            explain: "As with the CI case, the one-sample t-test statistic has n − 1 = 12 − 1 = 11 degrees of freedom.",
            explainDE: "Wie im Fall des KI hat die Teststatistik des Ein-Stichproben-t-Tests n − 1 = 12 − 1 = 11 Freiheitsgrade."
        },
        {
            q: 'A two-sided t-test gives T = 1.8 with critical value t_{n−1, 0.975} = 2.1. Is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein zweiseitiger t-Test ergibt T = 1,8 mit kritischem Wert t_{n−1; 0,975} = 2,1. Wird H₀ verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if |T| > t_{n−1, 1−α/2}. Here |1.8| < 2.1, so H₀ is not rejected.',
            hintDE: 'H₀ wird verworfen, wenn |T| > t_{n−1; 1−α/2}. Hier gilt |1,8| < 2,1, also wird H₀ nicht verworfen.',
            explain: "Since |T| = 1.8 is smaller than the critical value 2.1, H₀ is not rejected.",
            explainDE: "Da |T| = 1,8 kleiner ist als der kritische Wert 2,1, wird H₀ nicht verworfen."
        },

        // ── 8. ZUSAMMENHANG TEST UND KONFIDENZINTERVALL ──────────────────────────

        {
            q: 'A 95% CI for μ is [40, 48]. A two-sided test of H₀: μ = 50 is performed at α = 0.05. Is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein 95%-KI für μ ist [40, 48]. Ein zweiseitiger Test von H₀: μ = 50 wird zum Niveau α = 0,05 durchgeführt. Wird H₀ verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ iff μ₀ lies outside the CI. Here 50 is outside [40, 48].',
            hintDE: 'H₀ wird verworfen, wenn μ₀ außerhalb des KI liegt. Hier liegt 50 außerhalb von [40, 48].',
            explain: "Since the hypothesized value 50 falls outside the CI [40, 48], H₀ is rejected — this reflects the duality between confidence intervals and hypothesis tests.",
            explainDE: "Da der hypothetische Wert 50 außerhalb des KI [40, 48] liegt, wird H₀ verworfen — dies spiegelt die Dualität zwischen Konfidenzintervallen und Hypothesentests wider."
        },
        {
            q: 'A 99% CI for μ is [18, 26]. A two-sided test of H₀: μ = 22 is performed at α = 0.01. Is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein 99%-KI für μ ist [18, 26]. Ein zweiseitiger Test von H₀: μ = 22 wird zum Niveau α = 0,01 durchgeführt. Wird H₀ verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ iff μ₀ lies outside the CI. Here 22 lies inside [18, 26], so H₀ is not rejected.',
            hintDE: 'H₀ wird verworfen, wenn μ₀ außerhalb des KI liegt. Hier liegt 22 innerhalb von [18, 26], also wird H₀ nicht verworfen.',
            explain: "Since the hypothesized value 22 lies inside the CI [18, 26], H₀ is not rejected.",
            explainDE: "Da der hypothetische Wert 22 innerhalb des KI [18, 26] liegt, wird H₀ nicht verworfen."
        },

        // ── 9. P-WERT ──────────────────────────────────────────────────────────

        {
            q: 'A test gives a p-value of 0.03. At significance level α = 0.05, is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Test ergibt einen p-Wert von 0,03. Wird H₀ zum Signifikanzniveau α = 0,05 verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if p-value ≤ α. Here 0.03 ≤ 0.05.',
            hintDE: 'H₀ wird verworfen, wenn p-Wert ≤ α. Hier gilt 0,03 ≤ 0,05.',
            explain: "Since the p-value 0.03 is less than or equal to α = 0.05, H₀ is rejected.",
            explainDE: "Da der p-Wert 0,03 kleiner oder gleich α = 0,05 ist, wird H₀ verworfen."
        },
        {
            q: 'A test gives a p-value of 0.12. At significance level α = 0.05, is H₀ rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Test ergibt einen p-Wert von 0,12. Wird H₀ zum Signifikanzniveau α = 0,05 verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if p-value ≤ α. Here 0.12 > 0.05, so H₀ is not rejected.',
            hintDE: 'H₀ wird verworfen, wenn p-Wert ≤ α. Hier gilt 0,12 > 0,05, also wird H₀ nicht verworfen.',
            explain: "Since the p-value 0.12 is greater than α = 0.05, there is not enough evidence to reject H₀.",
            explainDE: "Da der p-Wert 0,12 größer ist als α = 0,05, gibt es nicht genügend Evidenz, um H₀ zu verwerfen."
        },
        {
            q: 'A two-sided Gauß-test gives Z = 2. Using Φ(2) ≈ 0.9772, compute the p-value. Round to 4 decimal places.',
            qDE: 'Ein zweiseitiger Gauß-Test ergibt Z = 2. Mit Φ(2) ≈ 0,9772: Berechne den p-Wert. Auf 4 Dezimalstellen runden.',
            answer: 0.0456, tolerance: 0.002, unit: '',
            hintEn: 'p-value = 2·(1 − Φ(|Z|)) = 2·(1 − 0.9772) = 2×0.0228 = 0.0456.',
            hintDE: 'p-Wert = 2·(1 − Φ(|Z|)) = 2·(1 − 0,9772) = 2×0,0228 = 0,0456.',
            explain: "For a two-sided test, the p-value is p = 2·(1 − Φ(|Z|)) = 2·(1 − 0.9772) = 2×0.0228 = 0.0456.",
            explainDE: "Für einen zweiseitigen Test ist der p-Wert p = 2·(1 − Φ(|Z|)) = 2·(1 − 0,9772) = 2×0,0228 = 0,0456."
        },

    ],



    11: [

        // ── 1. ASYMPTOTISCHER BINOMIALTEST ───────────────────────────────────────

        {
            q: 'H₀: p = 0.5. n = 100, p̂ = 0.58. Compute the test statistic Z of the asymptotic binomial test. Round to 2 decimal places.',
            qDE: 'H₀: p = 0,5. n = 100, p̂ = 0,58. Berechne die Teststatistik Z des asymptotischen Binomialtests. Auf 2 Dezimalstellen runden.',
            answer: 1.6, tolerance: 0.05, unit: '',
            hintEn: 'Z = (p̂ − p₀)/√(p₀(1−p₀)/n) = 0.08/√(0.25/100) = 0.08/0.05 = 1.6.',
            hintDE: 'Z = (p̂ − p₀)/√(p₀(1−p₀)/n) = 0,08/√(0,25/100) = 0,08/0,05 = 1,6.'
        },
        {
            q: 'H₀: p = 0.3. n = 200, X = 70 successes. Compute p̂. Round to 2 decimal places.',
            qDE: 'H₀: p = 0,3. n = 200, X = 70 Erfolge. Berechne p̂. Auf 2 Dezimalstellen runden.',
            answer: 0.35, tolerance: 0.005, unit: '',
            hintEn: 'p̂ = X/n = 70/200 = 0.35.',
            hintDE: 'p̂ = X/n = 70/200 = 0,35.'
        },
        {
            q: 'A two-sided asymptotic binomial test gives Z = 2.3 with critical value z_{0.975} = 1.96. Is H₀ rejected? Enter 0 for yes, 1 for no.',
            qDE: 'Ein zweiseitiger asymptotischer Binomialtest ergibt Z = 2,3 mit kritischem Wert z_{0,975} = 1,96. Wird H₀ verworfen? Gib 0 für ja, 1 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if |Z| > z_{1−α/2}. Here 2.3 > 1.96, so enter 0.',
            hintDE: 'H₀ wird verworfen, wenn |Z| > z_{1−α/2}. Hier gilt 2,3 > 1,96, gib also 0 ein.'
        },

        // ── 2. VERBUNDENES DESIGN (PAIRED TEST) ─────────────────────────────────

        {
            q: 'Paired data: Xᵢ = (5, 7, 6) and Yᵢ = (8, 9, 7). Compute the differences Dᵢ = Yᵢ − Xᵢ and find D̄ (mean difference).',
            qDE: 'Verbundene Daten: Xᵢ = (5, 7, 6) und Yᵢ = (8, 9, 7). Berechne die Differenzen Dᵢ = Yᵢ − Xᵢ und bestimme D̄ (mittlere Differenz).',
            answer: 2, tolerance: 0.01, unit: '',
            hintEn: 'Dᵢ = (3, 2, 1), so D̄ = (3+2+1)/3 = 2.',
            hintDE: 'Dᵢ = (3, 2, 1), also D̄ = (3+2+1)/3 = 2.'
        },
        {
            q: 'Paired-sample test: n = 9, D̄ = 4, S_D = 6. Compute the test statistic T = √n · D̄ / S_D. Round to 2 decimal places.',
            qDE: 'Test bei verbundenen Stichproben: n = 9, D̄ = 4, S_D = 6. Berechne die Teststatistik T = √n · D̄ / S_D. Auf 2 Dezimalstellen runden.',
            answer: 2, tolerance: 0.05, unit: '',
            hintEn: 'T = √9 · 4/6 = 3 · 0.667 = 2.',
            hintDE: 'T = √9 · 4/6 = 3 · 0,667 = 2.'
        },
        {
            q: 'A paired-sample t-test uses n = 15 pairs. How many degrees of freedom does the test statistic have?',
            qDE: 'Ein Test bei verbundenen Stichproben verwendet n = 15 Paare. Wie viele Freiheitsgrade hat die Teststatistik?',
            answer: 14, tolerance: 0, unit: '',
            hintEn: 'Degrees of freedom = n − 1 = 15 − 1 = 14.',
            hintDE: 'Freiheitsgrade = n − 1 = 15 − 1 = 14.'
        },
        {
            q: 'Paired test: n = 25, T = 2.9, critical value t_{24, 0.975} = 2.064. Is H₀: E[D] = 0 rejected (two-sided)? Enter 1 for yes, 0 for no.',
            qDE: 'Verbundener Test: n = 25, T = 2,9, kritischer Wert t_{24; 0,975} = 2,064. Wird H₀: E[D] = 0 (zweiseitig) verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if |T| > t_{n−1, 1−α/2}. Here 2.9 > 2.064.',
            hintDE: 'H₀ wird verworfen, wenn |T| > t_{n−1; 1−α/2}. Hier gilt 2,9 > 2,064.'
        },

        // ── 3. F-TEST AUF VARIANZHOMOGENITÄT ────────────────────────────────────

        {
            q: 'Two independent samples give S_X² = 25 and S_Y² = 16. Compute the F-test statistic F = S_X²/S_Y². Round to 2 decimal places.',
            qDE: 'Zwei unabhängige Stichproben ergeben S_X² = 25 und S_Y² = 16. Berechne die F-Teststatistik F = S_X²/S_Y². Auf 2 Dezimalstellen runden.',
            answer: 1.56, tolerance: 0.02, unit: '',
            hintEn: 'F = 25/16 = 1.5625.',
            hintDE: 'F = 25/16 = 1,5625.'
        },
        {
            q: 'An F-test for variance homogeneity uses samples of size m = 10 and n = 8. What are the degrees of freedom of the numerator?',
            qDE: 'Ein F-Test auf Varianzhomogenität verwendet Stichproben der Größe m = 10 und n = 8. Wie groß ist der Freiheitsgrad des Zählers?',
            answer: 9, tolerance: 0, unit: '',
            hintEn: 'Numerator degrees of freedom = m − 1 = 10 − 1 = 9.',
            hintDE: 'Freiheitsgrad des Zählers = m − 1 = 10 − 1 = 9.'
        },
        {
            q: 'F-test: F = 3.2, critical value F_{9,7,0.975} = 4.20 (upper bound of the acceptance region). Is H₀: σ_X² = σ_Y² rejected (two-sided, using only the upper critical value shown)? Enter 1 for yes, 0 for no.',
            qDE: 'F-Test: F = 3,2, kritischer Wert F_{9,7;0,975} = 4,20 (obere Grenze des Annahmebereichs). Wird H₀: σ_X² = σ_Y² (zweiseitig, nur mit dem gezeigten oberen kritischen Wert) verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 0, tolerance: 0, unit: '',
            hintEn: 'H₀ is not rejected since F = 3.2 < 4.20.',
            hintDE: 'H₀ wird nicht verworfen, da F = 3,2 < 4,20.'
        },

        // ── 4. UNVERBUNDENER 2-STICHPROBEN-T-TEST (GLEICHE VARIANZ) ─────────────

        {
            q: 'Two-sample t-test: m = 10, n = 12, S_X² = 4, S_Y² = 5. Compute the pooled variance S_p² using S_p² = [(m−1)S_X² + (n−1)S_Y²]/(m+n−2). Round to 2 decimal places.',
            qDE: 'Zwei-Stichproben-t-Test: m = 10, n = 12, S_X² = 4, S_Y² = 5. Berechne die gepoolte Varianz S_p² mit S_p² = [(m−1)S_X² + (n−1)S_Y²]/(m+n−2). Auf 2 Dezimalstellen runden.',
            answer: 4.55, tolerance: 0.05, unit: '',
            hintEn: 'S_p² = (9×4 + 11×5)/(20) = (36+55)/20 = 91/20 = 4.55.',
            hintDE: 'S_p² = (9×4 + 11×5)/(20) = (36+55)/20 = 91/20 = 4,55.'
        },
        {
            q: 'Two-sample t-test: X̄ = 20, Ȳ = 17, S_p = 3, m = 10, n = 10. Compute T = (X̄ − Ȳ)/(S_p·√(1/m + 1/n)). Round to 2 decimal places.',
            qDE: 'Zwei-Stichproben-t-Test: X̄ = 20, Ȳ = 17, S_p = 3, m = 10, n = 10. Berechne T = (X̄ − Ȳ)/(S_p·√(1/m + 1/n)). Auf 2 Dezimalstellen runden.',
            answer: 2.24, tolerance: 0.05, unit: '',
            hintEn: 'T = 3/(3·√0.2) = 3/(3×0.447) = 3/1.342 ≈ 2.24.',
            hintDE: 'T = 3/(3·√0,2) = 3/(3×0,447) = 3/1,342 ≈ 2,24.'
        },
        {
            q: 'A two-sample t-test (equal variances) uses m = 14 and n = 18. How many degrees of freedom does T have?',
            qDE: 'Ein Zwei-Stichproben-t-Test (gleiche Varianzen) verwendet m = 14 und n = 18. Wie viele Freiheitsgrade hat T?',
            answer: 30, tolerance: 0, unit: '',
            hintEn: 'Degrees of freedom = m + n − 2 = 14 + 18 − 2 = 30.',
            hintDE: 'Freiheitsgrade = m + n − 2 = 14 + 18 − 2 = 30.'
        },

        // ── 5. WELCH-TEST ────────────────────────────────────────────────────────

        {
            q: 'Welch test: X̄ = 15, Ȳ = 12, S_X² = 9, S_Y² = 4, m = 12, n = 9. Compute T = (X̄ − Ȳ)/√(S_X²/m + S_Y²/n). Round to 2 decimal places.',
            qDE: 'Welch-Test: X̄ = 15, Ȳ = 12, S_X² = 9, S_Y² = 4, m = 12, n = 9. Berechne T = (X̄ − Ȳ)/√(S_X²/m + S_Y²/n). Auf 2 Dezimalstellen runden.',
            answer: 2.75, tolerance: 0.05, unit: '',
            hintEn: 'T = 3/√(9/12 + 4/9) = 3/√(0.75+0.444) = 3/√1.194 = 3/1.093 ≈ 2.75',
            hintDE: 'T = 3/√(9/12 + 4/9) = 3/√(0,75+0,444) = 3/√1,194 ≈ 3/1,093 ≈ 2,75.'
        },
        {
            q: 'Two independent samples have variances S_X² = 16 (m = 5) and S_Y² = 4 (n = 20). Which test is more appropriate: Welch (enter 1) or standard pooled t-test (enter 0)?',
            qDE: 'Zwei unabhängige Stichproben haben Varianzen S_X² = 16 (m = 5) und S_Y² = 4 (n = 20). Welcher Test ist angemessener: Welch (1 eingeben) oder Standard-gepoolter t-Test (0 eingeben)?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Very unequal variances and sample sizes call for the Welch test.',
            hintDE: 'Stark ungleiche Varianzen und Stichprobenumfänge erfordern den Welch-Test.'
        },

        // ── 6. UNVERBUNDENES DESIGN (GENERAL) ───────────────────────────────────

        {
            q: 'An unpaired study has a treatment group of 18 patients and an independent control group of 24 patients. What is the total combined sample size m + n?',
            qDE: 'Eine unverbundene Studie hat eine Behandlungsgruppe von 18 Patienten und eine unabhängige Kontrollgruppe von 24 Patienten. Wie groß ist der kombinierte Stichprobenumfang m + n?',
            answer: 42, tolerance: 0, unit: '',
            hintEn: 'm + n = 18 + 24 = 42.',
            hintDE: 'm + n = 18 + 24 = 42.'
        },

        // ── 7. 2-STICHPROBEN-BINOMIALTEST ───────────────────────────────────────

        {
            q: 'Two-sample binomial test: X successes = 40 out of m = 100, Y successes = 55 out of n = 100. Compute the pooled proportion p̂. Round to 2 decimal places.',
            qDE: 'Zwei-Stichproben-Binomialtest: X-Erfolge = 40 von m = 100, Y-Erfolge = 55 von n = 100. Berechne den gepoolten Anteil p̂. Auf 2 Dezimalstellen runden.',
            answer: 0.48, tolerance: 0.01, unit: '',
            hintEn: 'p̂ = (40+55)/(100+100) = 95/200 = 0.475 ≈ 0.48.',
            hintDE: 'p̂ = (40+55)/(100+100) = 95/200 = 0,475 ≈ 0,48.'
        },
        {
            q: 'Two-sample binomial test: p̂_X = 0.4, p̂_Y = 0.3, m = n = 100, pooled p̂ = 0.35. Compute Z = (p̂_X − p̂_Y)/√(p̂(1−p̂)(1/m+1/n)). Round to 2 decimal places.',
            qDE: 'Zwei-Stichproben-Binomialtest: p̂_X = 0,4, p̂_Y = 0,3, m = n = 100, gepoolt p̂ = 0,35. Berechne Z = (p̂_X − p̂_Y)/√(p̂(1−p̂)(1/m+1/n)). Auf 2 Dezimalstellen runden.',
            answer: 1.48, tolerance: 0.05, unit: '',
            hintEn: 'Z = 0.1/√(0.35×0.65×0.02) = 0.1/√0.00455 = 0.1/0.0675 ≈ 1.48.',
            hintDE: 'Z = 0,1/√(0,35×0,65×0,02) = 0,1/√0,00455 = 0,1/0,0675 ≈ 1,48.'
        },
        {
            q: 'A two-sample binomial test gives Z = 2.1 with critical value z_{0.975} = 1.96 (two-sided test). Is H₀: p_X = p_Y rejected? Enter 1 for yes, 0 for no.',
            qDE: 'Ein Zwei-Stichproben-Binomialtest ergibt Z = 2,1 mit kritischem Wert z_{0,975} = 1,96 (zweiseitiger Test). Wird H₀: p_X = p_Y verworfen? Gib 1 für ja, 0 für nein ein.',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'Reject H₀ if |Z| > z_{1−α/2}. Here 2.1 > 1.96.',
            hintDE: 'H₀ wird verworfen, wenn |Z| > z_{1−α/2}. Hier gilt 2,1 > 1,96.'
        },

    ],













    12: [],



    // WORLD 13 UNSORTED
    13: [
        {
            q: 'Var(2X) = ? if Var(X) = 9. Enter the numeric value.',
            qDE: 'Var(2X) = ? wenn Var(X) = 9. Gib den numerischen Wert ein.',
            answer: 36, tolerance: 0, unit: '',
            hintEn: 'Var(aX) = a² · Var(X) = 4 × 9 = 36.',
            hintDE: 'Var(aX) = a² · Var(X) = 4 × 9 = 36.'
        },
        {
            q: 'E[X²] = 10 and E[X] = 2. What is Var(X)? (Use Var(X) = E[X²] − (E[X])²)',
            qDE: 'E[X²] = 10 und E[X] = 2. Wie groß ist Var(X)? (Var(X) = E[X²] − (E[X])²)',
            answer: 6, tolerance: 0.01, unit: '',
            hintEn: 'Var(X) = 10 − 2² = 10 − 4 = 6.',
            hintDE: 'Var(X) = 10 − 2² = 10 − 4 = 6.'
        },
        {
            q: 'P(A|B) = 0.4, P(B) = 0.5, P(A) = 0.3. What is P(B|A)? Use Bayes. Round to 2 decimal places.',
            qDE: 'P(A|B) = 0,4, P(B) = 0,5, P(A) = 0,3. Wie groß ist P(B|A)? Verwende die Bayesregel. Runde auf 2 Dezimalstellen.',
            answer: 0.67, tolerance: 0.01, unit: '',
            hintEn: 'P(B|A) = P(A|B)·P(B)/P(A) = (0.4 × 0.5)/0.3 = 0.2/0.3 ≈ 0.67.',
            hintDE: 'P(B|A) = P(A|B)·P(B)/P(A) = (0,4 × 0,5)/0,3 = 0,2/0,3 ≈ 0,67.'
        },
        {
            q: 'X and Y are independent with E[X]=3 and E[Y]=4. What is E[X·Y]?',
            qDE: 'X und Y sind unabhängig mit E[X]=3 und E[Y]=4. Wie groß ist E[X·Y]?',
            answer: 12, tolerance: 0, unit: '',
            hintEn: 'For independent RVs: E[XY] = E[X]·E[Y] = 3 × 4 = 12.',
            hintDE: 'Für unabhängige ZVs: E[XY] = E[X]·E[Y] = 3 × 4 = 12.'
        },
        {
            q: 'What is the variance of a standard normal distribution N(0,1)?',
            qDE: 'Wie groß ist die Varianz der Standardnormalverteilung N(0,1)?',
            answer: 1, tolerance: 0, unit: '',
            hintEn: 'By definition, N(0,1) has mean 0 and variance 1.',
            hintDE: 'Per Definition hat N(0,1) Mittelwert 0 und Varianz 1.'
        },
        {
            q: 'MSE = Bias² + Variance. If Bias = 2 and Variance = 3, what is the MSE?',
            qDE: 'MSE = Bias² + Varianz. Wenn Bias = 2 und Varianz = 3, wie groß ist der MSE?',
            answer: 7, tolerance: 0, unit: '',
            hintEn: 'MSE = 2² + 3 = 4 + 3 = 7.',
            hintDE: 'MSE = 2² + 3 = 4 + 3 = 7.'
        },
        {
            q: 'For a Poisson process with rate λ=2 per hour, what is the expected number of events in 3 hours?',
            qDE: 'Für einen Poisson-Prozess mit Rate λ=2 pro Stunde, wie viele Ereignisse werden in 3 Stunden erwartet?',
            answer: 6, tolerance: 0, unit: 'events',
            hintEn: 'E[events] = λ · t = 2 × 3 = 6.',
            hintDE: 'E[Ereignisse] = λ · t = 2 × 3 = 6.'
        },


        {
            q: 'Cov(X,Y) = 6, Var(X) = 9, Var(Y) = 16. What is the correlation coefficient r? Round to 2 decimal places.',
            qDE: 'Cov(X,Y) = 6, Var(X) = 9, Var(Y) = 16. Wie groß ist der Korrelationskoeffizient r? Auf 2 Dezimalstellen gerundet.',
            answer: 0.5, tolerance: 0.01, unit: '',
            hintEn: 'r = Cov(X,Y) / (σX · σY) = 6 / (3 × 4) = 6/12 = 0.5.',
            hintDE: 'r = Cov(X,Y) / (σX · σY) = 6 / (3 × 4) = 6/12 = 0,5.'
        },
    ],



};
