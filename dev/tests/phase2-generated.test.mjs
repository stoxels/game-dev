// Verifies the phase2 gate: generated/phase2/entry.mjs (the ONE module
// index.html loads) is in sync with tools/module-manifest.json, and that
// index.html still points at it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('phase2:verify - entry.mjs matches tools/module-manifest.json', () => {
    const res = spawnSync(
        process.execPath,
        [path.join(ROOT, 'tools', 'prepare-phase2.mjs'), '--check'],
        { encoding: 'utf8' }
    );
    assert.equal(res.status, 0, `phase2:verify failed:\n${res.stdout}${res.stderr}`);
    assert.match(res.stdout, /phase2:verify: OK/);
});

test('index.html loads the generated entry module exactly once', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const loads = html.match(/<script[^>]*src="[^"]*entry\.mjs"[^>]*>/g) || [];
    assert.equal(loads.length, 1, `expected exactly 1 entry.mjs script tag, found ${loads.length}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'generated', 'phase2', 'entry.mjs')), 'entry.mjs missing - run: npm run build');
});

test('entry.mjs imports the passive tree data and rework registry', () => {
    const entry = fs.readFileSync(path.join(ROOT, 'generated', 'phase2', 'entry.mjs'), 'utf8');
    assert.match(entry, /from '\.\.\/\.\.\/js\/probability-tree\/probability-tree-data\.js'/);
    assert.match(entry, /from '\.\.\/\.\.\/js\/probability-tree\/probability-tree-rework\.js'/);
});
