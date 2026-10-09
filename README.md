# STOXELS (game-dev)

The playable game is the static site in this repo: `index.html` loads exactly
one module, `generated/phase2/entry.mjs`, which wires every file in `js/` as a
real ES module (see `tools/module-manifest.json`).

## Full workflow

Requires Node >= 22.

```bash
npm ci              # tooling dependencies (eslint, jsdom)
npm run lint        # eslint over js/, main.js, tools/, dev/tests/
npm test            # node --test dev/tests/*.test.mjs
npm run phase2:verify   # entry.mjs in sync + manifest sanity + global-bridge coverage
npm run build       # regenerate generated/phase2/entry.mjs from the manifest
npm run verify      # lint + test + phase2:verify in one go
```

CI runs the same gate on every push/PR: `.github/workflows/ci.yml`.

### phase2 rules

- `generated/phase2/entry.mjs` is GENERATED - never edit it by hand. After any
  change to `js/` or `index.html`, run `npm run build` and commit the result;
  `npm run phase2:verify` fails if it is stale.
- Adding a new JS file means adding it to `tools/module-manifest.json`
  (or to its `exclude` list). `phase2:verify` fails on unlisted files, on
  manifest names that are not really exported, and on unbridged
  `globalThis.X` / `window.X` reads of entry-scope exports.

### Passive tree reworks

Reworking a node (full replace, never an append) follows the order enforced by
`dev/tests/`:

1. Replace the node in `js/probability-tree/probability-tree-data.js`
   (own name, EN/DE description one stat per line, own `statKey`,
   `icon: ""` while art is deferred - never an emoji).
2. Wire every advertised stat line to real gameplay (bonus maps in
   `js/endgame/endgame-leveling.js`, consumers in combat/stats).
3. Run the full gate: `npm run lint && npm test && npm run phase2:verify && npm run build`.
4. Only after it passes, add the node ID to `PT_REWORKED_NODE_IDS`
   in `js/probability-tree/probability-tree-rework.js`.

The same steps - including the exact commands above - are embedded in the
rework template the Passive Tree Editor copies for every un-reworked node
(`_ptBuildReworkNodeTemplate` in `js/probability-tree/probability-tree-ui.js`),
so the workflow travels with the node.
