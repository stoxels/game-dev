import { _egbtRenderGrid } from '../combat/combat-boss-test.js';
import { _egRenderPanel } from '../combat/encounter.js';
import { _egRenderEquipSlots, _egRenderInventory } from './endgame-hub.js';
import { _egIsActive } from '../combat/combat-state.js';

//------------------------------------------------------------------------
//-------------------PLACEHOLDER ART SYSTEM-------------------------------
//------------------------------------------------------------------------
// Resolves real images for endgame monsters and equipment base items.
//
// Convention - drop images in these folders, named after the definition id:
//   images/endgame/monsters/<id>.png   (regular monsters AND bosses)
//       e.g. images/endgame/monsters/slime.png, boss_null.png
//   images/endgame/items/<id>.png      (equipment base items)
//       e.g. images/endgame/items/wpn_1h_1.png
//
// IMPORTANT - no extension probing!
// The old approach fired one request per id x extension (5x) on every page
// load, which got this GitHub Pages site rate-limited. Instead we fetch a
// single manifest file listing what actually exists:
//   images/endgame/manifest.json     { "monster": { "<id>": "png", ... },
//                                     "item":    { "<id>": "png", ... } }
// Regenerate it after adding/removing art with:
//   powershell -File tools/build-art-manifest.ps1
//
// Item icons (equipment, currency, essences, maps, slots, pickups) live in
// images/items/ under their ORIGINAL filenames; passive-tree icons live in
// images/passives/ and images/keystones/. All are mapped by game id in:
//   images/items/manifest.json       { "map": { "<id>": "<path from images/>" } }
// Regenerate it with:  node tools/build-items-manifest.mjs
// It is fetched LAZILY (first item lookup, not at boot) so the title screen
// and boot preload cost zero bytes for it - a page load that never shows an
// item icon never requests it. One request total, then pure Map lookups.
//
// Only ids present in a manifest are ever requested, so a page load costs
// at most TWO extra requests regardless of how much art exists.
// If a manifest is missing (e.g. local dev), we fall back to probing -
// but lazily (only when a screen actually asks for an id) and through a
// small concurrency-limited queue.
// If no image exists for an id, every render call falls back to the
// emoji icon currently used, so nothing breaks while art is missing.


export const EG_ART = (function () {

    const ART_PATHS = {
        monster: 'images/endgame/monsters/',
        item: 'images/endgame/items/'
    };

    const MANIFEST_URL = 'images/endgame/manifest.json';
    const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'];

    // Item-icon manifest (images/items/): id -> art path relative to images/.
    // Fetched LAZILY on the first 'item' lookup so boot and the title screen
    // never pay for it. Regenerate with: node tools/build-items-manifest.mjs
    const ITEMS_MANIFEST_URL = 'images/items/manifest.json';
    let _itemsManifestStarted = false;
    let _itemsManifestSettled = false;

    function _applyItemsManifest(entries) {
        Object.keys(entries).forEach(function (id) {
            const key = _key('item', id);
            if (!_cache.has(key) || !_cache.get(key)) {
                _cache.set(key, 'images/' + entries[id]);
            }
        });
    }

    function _ensureItemsManifest() {
        if (_itemsManifestStarted) return;
        _itemsManifestStarted = true;
        if (location.protocol === 'file:') {
            // fetch() is blocked by CORS on file:// (local double-click
            // build) - stay on emoji fallbacks there; the game plays on.
            _itemsManifestSettled = true;
            return;
        }
        fetch(ITEMS_MANIFEST_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('items manifest http ' + res.status);
                return res.json();
            })
            .then(function (m) {
                _itemsManifestSettled = true;
                _applyItemsManifest((m && m.map) || {});
                _notify();
            })
            .catch(function () {
                _itemsManifestSettled = true;
                // Screens rendered while the fetch was in flight used emoji;
                // re-render once so deferred ids get their legacy probing.
                _notify();
            });
    }

    // Fallback probing: never run more than this many image requests at once.
    const MAX_CONCURRENT_PROBES = 2;

    // key "<kind>/<id>" -> resolved url, or null while resolving / when missing.
    const _cache = new Map();

    // ids currently being probed (fallback mode) - avoids duplicate requests.
    const _probing = new Set();
    const _probeQueue = [];
    let _activeProbes = 0;

    let _manifestFailed = false;


    function _key(kind, id) {
        return kind + '/' + id;
    }

    // Fires whenever previously missing images resolve, so open screens
    // can swap their emoji fallbacks for the freshly found image.
    function _notify() {
        document.dispatchEvent(new CustomEvent('eg-art-loaded'));
    }

    function _setResolved(kind, id, ext) {
        _cache.set(_key(kind, id), ART_PATHS[kind] + id + '.' + ext);
    }

    // One fetch for the whole game - replaces hundreds of probe requests.
    // Skipped entirely on file:// - fetch() is blocked by CORS there and the
    // lazy probe fallback below handles local dev without console noise.
    const _manifestFetch = (location.protocol === 'file:')
        ? Promise.reject(new Error('file protocol'))
        : fetch(MANIFEST_URL);
    _manifestFetch
        .then(function (res) {
            if (!res.ok) throw new Error('manifest http ' + res.status);
            return res.json();
        })
        .then(function (m) {
            m = m || {};
            ['monster', 'item'].forEach(function (kind) {
                const entries = m[kind] || {};
                Object.keys(entries).forEach(function (id) {
                    const key = _key(kind, id);
                    if (!_cache.has(key)) {
                        _setResolved(kind, id, entries[id]);
                    }
                });
            });
            _notify();
        })
        .catch(function () {
            // Manifest unavailable -> lazy throttled probing on demand.
            _manifestFailed = true;
        });


    // ---- fallback probing (only when the manifest is missing) ----

    function _probe(kind, id, done) {
        let extIdx = 0;
        const tryNext = function () {
            if (extIdx >= EXTENSIONS.length) { done(); return; } // stays null -> emoji
            const src = ART_PATHS[kind] + id + '.' + EXTENSIONS[extIdx++];
            const img = new Image();
            img.onload = function () {
                _cache.set(_key(kind, id), src);
                done();
                _notify();
            };
            img.onerror = tryNext;
            img.src = src;
        };
        tryNext();
    }

    function _pumpQueue() {
        while (_activeProbes < MAX_CONCURRENT_PROBES && _probeQueue.length) {
            const job = _probeQueue.shift();
            _activeProbes++;
            _probe(job.kind, job.id, function () {
                _activeProbes--;
                _pumpQueue();
            });
        }
    }


    // Resolves the art id for an item object: tier-specific map art for map
    // items (which share one baseId), the base id otherwise. Null when the
    // item carries neither - callers fall back to emoji.
    function artIdForItem(item) {
        if (!item) return null;
        if (item.category === 'map' && item.mapTier != null) {
            return 'map_t' + String(item.mapTier).padStart(2, '0');
        }
        return item.baseId || null;
    }

    // Returns the image url for an id, or null if none exists (yet).
    // With a manifest present this is a pure Map lookup after load.
    function url(kind, id) {
        if (!id) return null;
        const key = _key(kind, id);
        if (!_cache.has(key)) {
            _cache.set(key, null);
            if (kind === 'item') {
                // The items manifest owns 'item' ids: start its lazy fetch
                // and hold off legacy path-probing only while it is still
                // in flight (its arrival notifies and re-renders). Once
                // settled, ids it does not cover still fall through to the
                // legacy probing below, preserving the drop-in workflow.
                _ensureItemsManifest();
                if (!_itemsManifestSettled) return _cache.get(key);
            }
            if (_manifestFailed && !_probing.has(key)) {
                _probing.add(key);
                _probeQueue.push({ kind: kind, id: id });
                _pumpQueue();
            }
        }
        return _cache.get(key);
    }

    // HTML helper for template strings: <img> when art exists, else the emoji.
    // Images decode async and load lazily so big grids (inventory, stash,
    // essence tab) never stall the frame or fetch off-screen icons eagerly.
    function html(kind, id, fallbackEmoji) {
        const u = url(kind, id);
        if (u) {
            return '<img src="' + u + '" alt="" class="eg-art-img" draggable="false" loading="lazy" decoding="async">';
        }
        return fallbackEmoji || '';
    }

    // DOM helper for code that previously used textContent.
    function fillElement(el, kind, id, fallbackEmoji) {
        if (!el) return;
        el.innerHTML = '';
        const u = url(kind, id);
        if (u) {
            const img = document.createElement('img');
            img.src = u;
            img.alt = '';
            img.className = 'eg-art-img';
            img.draggable = false;
            img.loading = 'lazy';
            img.decoding = 'async';
            el.appendChild(img);
        } else {
            el.textContent = fallbackEmoji || '';
        }
    }

    // Lists every known art id for a base id: [base, base_2, base_3, ...].
    // Variant files are named "<base>_<n>.<ext>" (see tools/process-monster-art.py).
    // Driven by the manifest cache, so no extra requests. Always contains at
    // least the base id itself - callers fall back to emoji when art is missing.
    function variants(kind, baseId) {
        if (!baseId) return [];
        const out = [baseId];
        let n = 2;
        while (_cache.get(_key(kind, baseId + '_' + n))) {
            out.push(baseId + '_' + n);
            n++;
        }
        return out;
    }

    // Picks a random variant for a base id. The caller is expected to store
    // the result on the spawned entity (e.g. monster.artId) so re-renders
    // keep showing the same image instead of flickering between variants.
    function randomVariant(kind, baseId) {
        const v = variants(kind, baseId);
        return v[(Math.random() * v.length) | 0];
    }

    // Kept for API compatibility. With the manifest present everything is
    // already cached by the single fetch above; nothing to do here.
    function preload() { /* handled by the manifest fetch */ }

    return { url, html, fillElement, variants, randomVariant, preload, artIdForItem };
})();


EG_ART.preload();

// Late-loading images: refresh whatever is currently on screen so the
// emoji fallbacks get replaced without needing a reload.
document.addEventListener('eg-art-loaded', function () {
    try {
        if (typeof _egIsActive === 'function' && _egIsActive()
                && typeof _egRenderPanel === 'function') {
            _egRenderPanel();
        }
        if (typeof _egRenderInventory === 'function') _egRenderInventory();
        if (typeof _egRenderEquipSlots === 'function') _egRenderEquipSlots();
        // Boss test screen: swap emoji fallbacks for freshly loaded boss art.
        if (typeof _egbtRenderGrid === 'function' && document.getElementById('egbt-boss-grid')) {
            _egbtRenderGrid();
        }
    } catch (e) { /* screens not initialised yet - safe to ignore */ }
});
