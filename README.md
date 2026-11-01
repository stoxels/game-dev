# STOXELS

**A nonogram puzzle RPG about probability and statistics.**
Solve grid puzzles against the clock, learn real maths from the quizzes,
level up a class, grow a 2,000-node passive tree and push into an
endgame of loot, maps and bosses - all in the browser, no install.

**[▶ Play it online](https://stoxels.github.io/game-dev/)** · Version 0.36 BETA · English and German · desktop and touch

---

## What is it?

STOXELS starts as a classic **nonogram** (a.k.a. picross): the numbers
next to every row and column tell you how many filled cells in a row
that line contains, and you uncover a hidden picture ("Stoxel") by
working out which cells are filled.

Around that puzzle sits a full RPG:

- every level is a **race against a timer** - mistakes cost time,
- levels are linked by a **story** about the broken *Apex* and three
  playable characters who meet each other on the world maps and fight
  side by side as **companions**,
- **quizzes and "Probability Gates"** ask real probability and statistics
  questions (sample spaces, Bayes, distributions, ...) to earn bonuses,
- **monsters and bosses appear from the very first campaign levels** - you
  fight them with spells and melee strikes while you solve,
- an **endgame** adds loot, crafting and an atlas of maps on top.

The theme is mathematics: classes are called *Mathmagician*,
*Statistician* or *Probabilist*, abilities are *Variance Shield* or
*Type I Error Shield*, and the progression tree is the *Probability Tree*.

---

## Core gameplay

| | |
|---|---|
| **Puzzle** | Fill cells with the left mouse button, mark empty cells with the right one, drag to fill several at once. Finish the picture before the timer runs out. |
| **Mistakes** | A wrong cell costs seconds, and penalties escalate as you keep making mistakes. Free mistakes and penalty reductions come from classes, items and the passive tree. |
| **Difficulty** | Easy / Normal / Hard change the penalty size and the score multiplier. |
| **Modifiers** | *Time Trial* (half the time), *Hardcore* (one mistake fails the level) and *Ironman* (no items) trade risk for more score. *Classless*, *Treeless* and *Monsterless* strip a system away for a self-imposed challenge. |
| **Timer and kills** | Defeating a normal monster in the campaign adds seconds to the puzzle timer, so fighting is part of the pace, not a distraction. |
| **Movement trials** | Special levels where you move your hero around the arena instead of just clicking cells, with their own bonus objectives and reward chests. |
| **Bonus objectives** | Completing a level's objective drops a random puzzle item. |
| **Score and codes** | Score milestones unlock achievement codes, and there is a highscore screen. |

### Puzzle items

Scattered through the levels are consumable items such as time
additions, freezes, row/column solves, reveals, scout's primers,
shields, shadow seals and tutor items. Some are **cursed**: very
powerful, but with a built-in downside.

---

## Characters

Three characters, each with their own story intro and starting trait
and each starting from their own point in the passive tree:

- **Stox - the Analyst.** Reads patterns fast; mistake penalties escalate more slowly.
- **Trix - the Trickster.**
- **Syla - the Naturalist.**

You play one of them; the other two become your friends in the story.

---

## Worlds and story

The campaign runs through **13 worlds plus the Nexus**, each with its
own levels and its own quiz topics. Worlds unlock one after another.
Level types include normal puzzles, **Ascension** trials (class
progression, now their own node at the end of each world map),
**Convergence** trials (passive tree points) and **Inference**
objectives (extra points). A storyline engine plays intro beats for each
character, and a guided **tutorial** (including a crafting lesson) teaches
the basics.

### Companions and co-op

Every world map has optional **story nodes** where your hero meets the
other two heroes - 14 dialogue scenes in total, with story pictures.
Watching meetings and clearing **co-op encounters** (special levels you
play together with an AI friend, ending in a shared boss mechanic) grows
your **affinity** with each friend from level 1 to 5 and earns **quest
items** in their own stash tab. Spend **Tether Stones** to call a friend
onto any level as a **summon**: they fight with their own look, gear and
spells, and get stronger as the story moves on.

---

## Classes and abilities

Completing Ascension levels lets you pick one of three **base classes**:

| Class | Style |
|---|---|
| **Mathmagician** | Arcane reveals and area control (*Arcane Reveal*, *Absolute Zero*) |
| **Statistician** | Strikes and momentum (*Data Strike*, *Diagonal Strike*) |
| **Probabilist** | Ranged precision (*Precision Shot*, *Rain of Arrows*) |

Each class has one passive and two active abilities with three ranks.
Once all three are maxed you unlock one of **six ascendancies**, two per
class: *Outlier*, *Actuary* (Statistician), *Recursionist*, *Markovian*
(Mathmagician) and *Bayesian*, *Random Walker* (Probabilist), each with
two further abilities.

### Charms, spells and the spell book

Skills have ten ranks. **Charms** drop from defeated monsters (spells can
also **combo**: enemy debuffs that other spells consume, amplify or spread,
with element reactions) and are
slotted into a **spell book** with hotbar keys. Duplicates turn into
*Lemmas*, and ten Lemmas prove a *Theorem* that you apply to a charm for
a permanent bonus. A large arsenal of **universal spells** (fire, frost,
lightning, arcane, shadow, holy, blade and arrow families) is available
on top of class abilities, and spells cast in several ways: tap, hold,
channel (keep firing while mana drains), charge-and-release, ground
targeting, melee swings and toggled auras.

---

## The Probability Tree

The passive tree has **about 2,000 nodes**: 81 keystones, 566 notables
and around 1,400 small and travel nodes, laid out as three class wheels
around the centre, one per starting point. You spend Convergence points
to allocate nodes, and a **stat summary** tab in the corner of the tree
shows the combined total of everything you have picked, grouped into
Life, Mana, Defence, Spells, Melee, Puzzle and more.

The **rework is complete**: almost every node (about 1,700) runs on a
shared *effects registry*. A node is just a list such as
`["str_flat:5", "armour_flat:10"]`, and its tooltip, stat wiring and
character-sheet entry are generated from the registry in both
languages. Nodes cover attributes, life, mana, absorption, elemental and
weapon-class damage, projectiles and ailments, plus **puzzle effects**
that tie the nonogram to combat (line completion, streaks, flawless
solves, kills and quizzes can grant resources, time or damage).
Keystones change the rules - for example *Blood Magic* (spells cost Life
instead of Mana), *Primal Flame* (convert damage to fire, deal no other
damage), *Vital Conduit* (trade regeneration and leech for
Absorption-to-Life) and *Glass Clock* (a shorter timer for a bigger
payout). Each base class and ascendency has its own hand-placed wheel of
notables.

---

## Endgame

After the campaign the game opens into a loot-driven endgame, closer to
an action RPG than to a puzzle game.

- **Encounters.** Puzzle levels spawn monsters; you fight with spells,
  charged melee strikes and projectiles while you solve. Monsters carry
  resistances, ailments (ignite, chill, shock, bleed, stun, impale, ...)
  and elemental damage; there are **more than 80 bosses**, each with its
  own mechanics. The campaign's trial bosses (one per world for the
  Convergence and Ascension trials) are being **reworked one by one** into
  readable, telegraphed fights with a finale each - during a finale the
  boss stands still and shielded while you deal with its set-piece.
- **Atlas and map device.** An atlas of **86 map regions in 16 tiers**
  progresses from the corners towards the centre; maps are items with
  rolled modifiers that make runs harder and more rewarding.
- **Character sheet.** Strength / Agility / Intelligence attributes,
  Life, Mana and Absorption, Armour, Evasion, block, resistances,
  critical strikes, leech, regeneration and many more stats, shown with
  tooltips.
- **Loot.** Equipment in many slots with rarities, rolled prefixes and
  suffixes, implicits, requirements and **unique items**.
- **Crafting.** Currency orbs, essences, shards and a crafting bench.
- **Hub.** Stash, vendors, mass sell, a configurable loot filter, level
  and attribute allocation, 50 stackable **titles** and an achievement
  list (200+ achievements).

---

## Accessibility and quality of life

- **Touch controls** for phones and tablets (grid, clues and long-press
  marking), plus a layout that scales to the window.
- **Display settings:** text size, red-green and blue-yellow friendly
  colour modes, clue number size and strong row highlights.
- **Play settings:** pause when the window loses focus, confirm before
  leaving maps, loot notification filter and random background music
  (a shuffled playlist that does not repeat a track until all have played).
- **Save slots:** 20 slots, each with portrait, title and score, and
  **export/import to a file** so your progress survives browsers that
  clear site data.
- Full **English and German** text, including tooltips and quizzes.

---

## Run it locally

You need [Node.js](https://nodejs.org/) (the project was built with a
recent LTS).

```bash
npm install        # once
npm run dev        # play at http://127.0.0.1:5173
npm test           # unit tests (Vitest)
npm run lint       # ESLint
npm run build      # tests + production build into dist/ (works from file://)
```

On Windows you can also double-click `PLAY-STOXELS.bat` if you have the
full local project folder.

> This GitHub repository contains only the files the **published game**
> needs (`index.html`, `main.js`, `js/`, `css/`, `images/`, `audio/`,
> `animations/` and one generated entry file). The tooling, tests and
> design documents live in the author's local project and are
> intentionally not part of the public repo, so `npm install` only works
> in the full project folder.

---

## How it is built

- **Vanilla JavaScript** - no UI framework. About 480 source files under
  `js/`, grouped by system (`classes`, `combat`, `hub`, `endgame`, `loot`,
  `probability-tree`, `skills`, `puzzle-items`, `storyline`,
  `companion-bot`, `touch`, ...). Every file is a real ES module.
- **Bundled with Vite** into one module entry that `index.html` loads;
  the game is a static site served as-is by GitHub Pages.
- **Data-driven**: levels, quizzes, items, mod tables, bosses and the
  passive tree are plain data files.
- **Tested**: more than 3,500 automated tests run the real game modules
  in a simulated browser; a headless boot check confirms a clean console.
- **Bilingual**: every player-facing string exists in English and German.
- Best tested in **Firefox**; Chromium browsers work too.

---

## Status

STOXELS is a work-in-progress **beta** (currently **v0.36**) under active
development. The passive tree rework is done and the world 1-13 trial
bosses are being rebuilt one world at a time; balance (monster scaling,
spell tuning) and art are still moving, and saves from older versions may
be migrated between releases. See the in-game changelog for the latest
patch notes, and use the save export if you want a backup.
