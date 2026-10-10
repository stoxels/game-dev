# STOXELS

**A nonogram puzzle RPG about probability and statistics.**
Solve grid puzzles against the clock, learn real maths from the quizzes,
level up a class, grow a 2,000-node passive tree and push into an
endgame of loot, maps and bosses - all in the browser, no install.

**[▶ Play it online](https://stoxels.github.io/game-dev/)** · Version 0.29 BETA · English and German

---

## What is it?

STOXELS starts as a classic **nonogram** (a.k.a. picross): the numbers
next to every row and column tell you how many filled cells in a row
that line contains, and you uncover a hidden picture ("Stoxel") by
working out which cells are filled.

Around that puzzle sits a full RPG:

- every level is a **race against a timer** - mistakes cost time,
- levels are linked by a **story** about the broken *Apex* and three
  playable characters,
- **quizzes and "Probability Gates"** ask real probability and statistics
  questions (sample spaces, Bayes, distributions, ...) to earn bonuses,
- an **endgame** turns the puzzle into a combat encounter system with
  monsters, bosses, loot, crafting and an atlas of maps.

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
| **Modifiers** | *Time Trial* (half the time), *Hardcore* (one mistake fails the level) and *Ironman* (no items) trade risk for more score. |
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

---

## Worlds and story

The campaign runs through **13 worlds plus the Nexus**, each with its
own levels and its own quiz topics. Level types include
normal puzzles, **Ascension** levels (class progression), **Convergence**
levels (passive tree points) and **Inference** objectives (extra points).
A storyline engine plays intro beats for each character.

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

Skills have ten ranks. **Charms** drop from defeated monsters (bosses
always drop one) and are slotted into a **spell book** with hotbar keys.
Duplicates turn into *Lemmas*, and ten Lemmas prove a *Theorem* that you
can spend for a permanent bonus. A large arsenal of **universal spells**
(fire, frost, lightning, arcane, shadow, holy, blade and arrow families)
is available on top of class abilities.

---

## The Probability Tree

The passive tree has **about 2,100 nodes**: 53 keystones, 528 notables
and over 1,500 small and travel nodes, laid out around three starting
points. You spend Convergence points to allocate nodes.

The tree is **being reworked node by node** onto a shared *effects
registry*: every reworked node is just a list such as
`["str_flat:5", "armour_flat:10"]`, and its tooltip, stat wiring and
character-sheet entry are generated from the registry in both languages.
Keystones change the rules - for example *Blood Magic* (spells cost Life
instead of Mana), *Primal Flame* (convert damage to fire, deal no other
damage) and *Vital Conduit* (trade regeneration and leech for
Absorption-to-Life). The in-game counter in the tree's top bar shows how
many nodes are done.

---

## Endgame

After the campaign the game opens into a loot-driven endgame, closer to
an action RPG than to a puzzle game.

- **Encounters.** Puzzle levels spawn monsters; you fight with spells,
  charged melee strikes and projectiles while you solve. Monsters carry
  resistances, ailments (ignite, chill, shock, bleed, stun, impale, ...)
  and elemental damage; there are **more than 80 bosses**, each with its
  own mechanics.
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
  and attribute allocation and an achievement list (200+ achievements).

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

- **Vanilla JavaScript** - no UI framework. About 400 source files under
  `js/`, grouped by system (`classes`, `combat`, `endgame`, `loot`,
  `probability-tree`, `skills`, `puzzle-items`, `storyline`, ...).
- **Bundled with Vite** into one module entry that `index.html` loads;
  the game is a static site served as-is by GitHub Pages.
- **Data-driven**: levels, quizzes, items, mod tables, bosses and the
  passive tree are plain data files.
- **Tested**: more than 1,500 automated tests run the real game modules
  in a simulated browser; a headless boot check confirms a clean console.
- **Bilingual**: every player-facing string exists in English and German.
- Best tested in **Firefox**; Chromium browsers work too.

---

## Status

STOXELS is a work-in-progress **beta** under active development. The
passive tree rework, endgame balance and art are still moving, and
saves from older versions may be migrated or reset between releases.
