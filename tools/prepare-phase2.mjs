#!/usr/bin/env node
//----------------------------------------------------------------------
// tools/prepare-phase2.mjs
//
// Regenerates generated/phase2/entry.mjs - the ONE ES module index.html
// loads - from tools/module-manifest.json.
//
//   node tools/prepare-phase2.mjs          build (writes entry.mjs)
//   node tools/prepare-phase2.mjs --check  verify only (CI / phase2:verify)
//
// The manifest is the source of truth and holds, in load order:
//   modules[] - every game JS file as a real ES module, with the named
//               exports pulled into entry scope (entry.mjs imports them).
//   getters[] - export names re-exposed as live globalThis.X / window.X
//               getters (PHASE3-BRIDGE) for code that reads them as globals.
//   shims[]   - export names copied onto globalThis for dynamic/string
//               access sites such as inline onclick handlers (PHASE3-SHIM).
//
// --check additionally verifies, so CI fails when the generated file or
// the manifest drifts out of sync with the sources:
//   1. every manifest module path exists and every listed name is really
//      exported by that file (stale manifest detection),
//   2. every game JS file is listed in the manifest or explicitly excluded,
//   3. every globalThis.X / window.X READ of an entry-scope export is
//      covered by a getter or shim (unbridged-global detection),
//   4. the committed entry.mjs is byte-identical to the rendered output.
//----------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'tools', 'module-manifest.json');
const ENTRY_PATH = path.join(ROOT, 'generated', 'phase2', 'entry.mjs');

const HEADER = [
    '//----------------------------------------------------------------------',
    '// GENERATED FILE - DO NOT EDIT BY HAND',
    '// Produced by: node tools/prepare-phase2.mjs',
    '// Source of truth: index.html script order (LOAD-ORDER SENSITIVE!)',
    '// Regenerate after ANY change to js/ or index.html.',
    '//',
    '// Phase 2: all files concatenated into ONE ES module scope, in exact',
    '// index.html order. Implicit cross-file globals keep working (one',
    '// shared scope, like the classic-script era). The globalThis bridge',
    '// after each file re-exposes top-level declarations the way classic',
    '// scripts did (function/var as window properties; let/const via live',
    '// accessors so window.X reads and boot-loader.js indirect-eval probes',
    '// keep working). Modules are implicitly strict; see report.md for the',
    '// pre-verified strict-mode hazard scan.',
    '//',
    '// Phase 3: files listed in tools/module-manifest.json are REAL ES modules',
    '// imported above the concatenated body. Their exports are entry-scope',
    '// bindings; concatenated files may reference them bare. See MIGRATION.md.',
    '//----------------------------------------------------------------------',
];
const IMPORTS_COMMENT = '//--- Phase 3: real ES module imports (tools/module-manifest.json) ---';
const GETTERS_COMMENT = [
    '//--- PHASE3 pass-through getters: module exports referenced as',
    '//--- globalThis.X / window.X members by concatenated code. Getter',
    '//--- form stays live with owner-module reassignments (patch()).',
];
const SHIMS_HEADER = '//=======[ PHASE 3 module-import shims ]=========================================';
const END_MARKER = '//=======[ end of generated module ]=============================================';

// Extracts named exports from a source file. Handles:
//   export function f / export async function f / export class C
//   export const|let|var NAME ...
//   export { a, b as c }   (single- and multi-line blocks)
// export-default / export-* are intentionally unsupported: entry.mjs can
// only pull named bindings, and no game file uses those forms.
export function parseExports(src) {
    const names = [];
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        let m = line.match(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/);
        if (m) { names.push(m[1]); continue; }
        if (/^export\s*\{/.test(line)) {
            // Single-line block, or the first line of a multi-line block:
            // gather until the closing brace.
            let chunk = line;
            for (let j = i + 1; j < lines.length && !/\}/.test(chunk); j++) chunk += ' ' + lines[j].trim();
            const block = chunk.match(/^export\s*\{([^}]*)\}/);
            if (block) {
                for (const spec of block[1].split(',')) {
                    const trimmed = spec.trim();
                    if (!trimmed) continue;
                    const parts = trimmed.split(/\s+as\s+/);
                    names.push((parts[1] || parts[0]).trim());
                }
                // Continue scanning after the block end for multi-line blocks.
                const consumed = chunk.split('\n').length;
                i += Math.max(0, consumed - 1);
            }
            continue;
        }
        if (/^export\s+default/.test(line) || /^export\s+\*\s+from/.test(line)) {
            throw new Error(`Unsupported export form at line ${i + 1}: ${line}`);
        }
    }
    return names;
}

function walkJs(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walkJs(p, out);
        else if (entry.name.endsWith('.js')) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
    return out;
}

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        throw new Error(`missing manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    for (const key of ['modules', 'getters', 'shims']) {
        if (!Array.isArray(manifest[key])) throw new Error(`manifest.${key} must be an array`);
    }
    for (const mod of manifest.modules) {
        if (typeof mod.path !== 'string' || !Array.isArray(mod.exports)) {
            throw new Error(`manifest.modules entry needs { path, exports[] }: ${JSON.stringify(mod)}`);
        }
    }
    for (const shim of manifest.shims) {
        if (typeof shim.name !== 'string' || typeof shim.from !== 'string') {
            throw new Error(`manifest.shims entry needs { name, from }: ${JSON.stringify(shim)}`);
        }
    }
    return manifest;
}

function render(manifest) {
    const out = [...HEADER, '', IMPORTS_COMMENT];
    for (const mod of manifest.modules) {
        const rel = '../../' + mod.path;
        if (mod.exports.length === 0) out.push(`import '${rel}';`);
        else out.push(`import { ${mod.exports.join(', ')} } from '${rel}';`);
    }
    out.push('');
    out.push(...GETTERS_COMMENT);
    for (const name of manifest.getters) {
        out.push(`try { Object.defineProperty(globalThis, "${name}", { get() { return ${name}; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE`);
    }
    out.push('', '', SHIMS_HEADER);
    for (const shim of manifest.shims) {
        out.push(`try { globalThis["${shim.name}"] = ${shim.name}; } catch (e) {} // PHASE3-SHIM (${shim.from})`);
    }
    out.push('', END_MARKER);
    return out.join('\n') + '\n';
}

// Scans every game JS file for globalThis.X / window.X accesses of
// entry-scope exports and returns the ones with no bridge coverage.
function findUnbridgedGlobals(manifest) {
    const imported = new Set();
    for (const mod of manifest.modules) for (const name of mod.exports) imported.add(name);
    const bridged = new Set([...manifest.getters, ...manifest.shims.map(s => s.name)]);

    const violations = [];
    const files = [...walkJs(path.join(ROOT, 'js')), 'main.js'];
    for (const rel of files) {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) continue;
        const lines = fs.readFileSync(abs, 'utf8').split('\n');
        lines.forEach((lineText, idx) => {
            const re = /(globalThis|window)\.([A-Za-z_$][\w$]*)/g;
            let m;
            while ((m = re.exec(lineText)) !== null) {
                const name = m[2];
                if (!imported.has(name) || bridged.has(name)) continue;
                const before = lineText.slice(0, m.index);
                const after = lineText.slice(m.index + m[0].length);
                if (/(^|[^\w.$])typeof\s+$/.test(before)) continue;        // typeof guard - safe
                if (/^\s*=[^=]/.test(after)) continue;                     // write target - creates the global
                if (new RegExp(`typeof\\s+(?:globalThis|window)\\.${name}\\b`).test(lineText)) continue; // same-line typeof guard
                violations.push(`${rel}:${idx + 1}: unbridged global read of "${name}" - add it to manifest.getters (or manifest.shims)`);
            }
        });
    }
    return violations;
}

function validate(manifest) {
    const errors = [];
    const importedNames = new Set();
    const exportIndex = new Map(); // name -> Set of files exporting it

    for (const mod of manifest.modules) {
        const abs = path.join(ROOT, mod.path);
        if (!fs.existsSync(abs)) {
            errors.push(`manifest module missing on disk: ${mod.path}`);
            continue;
        }
        let parsed;
        try {
            parsed = new Set(parseExports(fs.readFileSync(abs, 'utf8')));
        } catch (err) {
            errors.push(`${mod.path}: ${err.message}`);
            continue;
        }
        for (const name of mod.exports) {
            if (!parsed.has(name)) errors.push(`${mod.path}: manifest lists export "${name}" but the file does not export it`);
            importedNames.add(name);
            if (!exportIndex.has(name)) exportIndex.set(name, new Set());
            exportIndex.get(name).add(mod.path);
        }
    }

    // Every game file must be registered (or explicitly excluded) so a new
    // file can't silently miss the entry module.
    const listed = new Set(manifest.modules.map(m => m.path));
    const excluded = new Set(Array.isArray(manifest.exclude) ? manifest.exclude : []);
    for (const rel of [...walkJs(path.join(ROOT, 'js')), 'main.js']) {
        if (!listed.has(rel) && !excluded.has(rel)) {
            errors.push(`${rel}: not listed in tools/module-manifest.json (add it, or add it to manifest.exclude)`);
        }
    }
    for (const rel of excluded) {
        if (!listed.has(rel) && !fs.existsSync(path.join(ROOT, rel))) {
            errors.push(`manifest.exclude entry missing on disk: ${rel}`);
        }
    }

    for (const name of manifest.getters) {
        if (!importedNames.has(name)) errors.push(`manifest.getters: "${name}" is not imported by any manifest module`);
    }
    for (const shim of manifest.shims) {
        if (!importedNames.has(shim.name)) errors.push(`manifest.shims: "${shim.name}" is not imported by any manifest module`);
        const owners = exportIndex.get(shim.name);
        if (owners && !owners.has(shim.from)) {
            errors.push(`manifest.shims: "${shim.name}" is not exported by ${shim.from} (exports it: ${[...owners].join(', ') || 'nobody'})`);
        }
        if (!fs.existsSync(path.join(ROOT, shim.from))) {
            errors.push(`manifest.shims: file missing on disk: ${shim.from}`);
        }
    }

    if (new Set(manifest.getters).size !== manifest.getters.length) {
        errors.push('manifest.getters contains duplicates');
    }
    const shimNames = manifest.shims.map(s => s.name);
    if (new Set(shimNames).size !== shimNames.length) {
        errors.push('manifest.shims contains duplicate names');
    }

    errors.push(...findUnbridgedGlobals(manifest));
    return errors;
}

function main() {
    const check = process.argv.includes('--check');
    const manifest = loadManifest();
    const errors = validate(manifest);
    if (errors.length) {
        console.error(`phase2: ${errors.length} manifest problem(s):`);
        for (const e of errors) console.error(`  - ${e}`);
        process.exit(1);
    }

    const rendered = render(manifest);
    const onDisk = fs.existsSync(ENTRY_PATH) ? fs.readFileSync(ENTRY_PATH, 'utf8') : null;

    if (check) {
        if (onDisk === null) {
            console.error('phase2:verify: generated/phase2/entry.mjs is missing - run: node tools/prepare-phase2.mjs');
            process.exit(1);
        }
        if (onDisk !== rendered) {
            const a = onDisk.split('\n');
            const b = rendered.split('\n');
            let firstDiff = -1;
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i] !== b[i]) { firstDiff = i; break; }
            }
            console.error('phase2:verify: generated/phase2/entry.mjs is STALE (differs from tools/module-manifest.json).');
            console.error(`  first difference at line ${firstDiff + 1}:`);
            console.error(`    committed: ${JSON.stringify(a[firstDiff] ?? '<end of file>')}`);
            console.error(`    rendered : ${JSON.stringify(b[firstDiff] ?? '<end of file>')}`);
            console.error('  fix with: node tools/prepare-phase2.mjs   (then commit the regenerated file)');
            process.exit(1);
        }
        console.log(`phase2:verify: OK (${manifest.modules.length} modules, ${manifest.getters.length} getters, ${manifest.shims.length} shims, entry.mjs up to date)`);
        return;
    }

    if (onDisk === rendered) {
        console.log(`phase2:build: generated/phase2/entry.mjs already up to date (${manifest.modules.length} modules)`);
        return;
    }
    fs.mkdirSync(path.dirname(ENTRY_PATH), { recursive: true });
    fs.writeFileSync(ENTRY_PATH, rendered);
    console.log(`phase2:build: wrote generated/phase2/entry.mjs (${manifest.modules.length} modules, ${manifest.getters.length} getters, ${manifest.shims.length} shims)`);
}

try {
    main();
} catch (err) {
    console.error(`phase2: ${err.message}`);
    process.exit(1);
}
