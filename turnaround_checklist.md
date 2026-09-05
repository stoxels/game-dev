# Turnaround Tracker — clean 4-direction base bodies (no weapons, no floating props)

Workflow per variant: copy prompt from `turnaround_prompts/<Char>/<variant>.txt`
→ generate (16:9, Lite/2 draft, Pro keeper) → save sheet to
`turnaround_images/<Char>/<variant>/` → QC against checklist below →
slice into `animations/<Char>/walk/<variant>/{up,down,left,right}/` + idle.

QC rules: identity intact (face/hair/outfit), hands truly empty, no leftover
props (staff, hourglass, shards, gears), no face on back view, profiles correct
on both sides, feet on one baseline, clean green background with no shadow line.

## Stox

| Variant       | Prompt | Sheet generated | QC passed | Sliced into game |
|---------------|--------|-----------------|-----------|------------------|
| noclass       | [x]    | [x]             | [ ]       | [ ]              |
| statistician  | [x]    | [x]             | [ ]       | [ ]              |
| mathmagician  | [x]    | [x]             | [ ]       | [ ]              |
| probabilist   | [x]    | [x]             | [ ]       | [ ]              |
| outlier       | [x]    | [x]             | [ ]       | [ ]              |
| actuary       | [x]    | [x]             | [ ]       | [ ]              |
| recursionist  | [x]    | [x]             | [ ]       | [ ]              |
| markovian     | [x]    | [x]             | [x]       | [ ]              |
| bayesian      | [x]    | [x]             | [ ]       | [ ]              |
| random_walker | [x]    | [x]             | [ ]       | [ ]              |

## Trix

| Variant       | Prompt | Sheet generated | QC passed | Sliced into game |
|---------------|--------|-----------------|-----------|------------------|
| noclass       | [x]    | [x]             | [ ]       | [ ]              |
| statistician  | [x]    | [x]             | [ ]       | [ ]              |
| mathmagician  | [x]    | [x]             | [ ]       | [ ]              |
| probabilist   | [x]    | [x]             | [ ]       | [ ]              |
| outlier       | [x]    | [x]             | [ ]       | [ ]              |
| actuary       | [x]    | [x]             | [ ]       | [ ]              |
| recursionist  | [x]    | [x]             | [ ]       | [ ]              |
| markovian     | [x]    | [x]             | [ ]       | [ ]              |
| bayesian      | [x]    | [x]             | [ ]       | [ ]              |
| random_walker | [x]    | [x]             | [ ]       | [ ]              |

## Syla

| Variant       | Prompt | Sheet generated | QC passed | Sliced into game |
|---------------|--------|-----------------|-----------|------------------|
| noclass       | [x]    | [x]             | [ ]       | [ ]              |
| statistician  | [x]    | [x]             | [ ]       | [ ]              |
| mathmagician  | [x]    | [x]             | [ ]       | [ ]              |
| probabilist   | [x]    | [x]             | [ ]       | [ ]              |
| outlier       | [x]    | [x]             | [ ]       | [ ]              |
| actuary       | [x]    | [x]             | [ ]       | [ ]              |
| recursionist  | [x]    | [x]             | [ ]       | [ ]              |
| markovian     | [x]    | [x]             | [ ]       | [ ]              |
| bayesian      | [x]    | [x]             | [ ]       | [ ]              |
| random_walker | [x]    | [x]             | [ ]       | [ ]              |

## Walk videos (in progress)

Workflow per direction: crop the single panel from the approved turnaround
sheet → Video + Ingredients, 9:16, 720p, 4s (x1 to test, x2+ for keepers) →
save keeper take to `walk_videos/<Char>/<variant>/<dir>/takeN.mp4` → extract
3–4 stride poses → key out green → save to
`animations/<Char>/walk/<variant>/<dir>/` (engine picks them up automatically).
Order per variant: right → left → down → up. Finish one character first.

`vid` = keeper video saved. `frm` = frames extracted and in game.

### Stox walk

| Variant       | Right          | Left           | Down           | Up             |
|---------------|----------------|----------------|----------------|----------------|
| noclass       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| statistician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| mathmagician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| probabilist   | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| outlier       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| actuary       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| recursionist  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| markovian     | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| bayesian      | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| random_walker | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |

### Trix walk

| Variant       | Right          | Left           | Down           | Up             |
|---------------|----------------|----------------|----------------|----------------|
| noclass       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| statistician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| mathmagician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| probabilist   | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| outlier       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| actuary       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| recursionist  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| markovian     | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| bayesian      | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| random_walker | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |

### Syla walk

| Variant       | Right          | Left           | Down           | Up             |
|---------------|----------------|----------------|----------------|----------------|
| noclass       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| statistician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| mathmagician  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| probabilist   | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| outlier       | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| actuary       | [x]vid [ ]frm | [x]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| recursionist  | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| markovian     | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| bayesian      | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |
| random_walker | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm | [ ]vid [ ]frm |

## Later passes (not started)

- [ ] Directional walk videos + frames (in progress — see Walk videos above)
- [ ] Directional idle sets (2 panels each)
- [ ] Directional spell casts
- [ ] Weapon sheets (one per weapon type × 4 directions, shared across characters)
- [ ] Spell effect sprites (slash arcs, glints, clock-rings)
- [ ] hurt / defeat / victory / emote / spawn sets
