//------------------------------------------------------------------------
//-------------------PLACEHOLDER ART SYSTEM-------------------------------
//------------------------------------------------------------------------
// Resolves real images for endgame monsters and equipment base items.
//
// Convention — drop images in these folders, named after the definition id:
//   images/endgame/monsters/<id>.png   (regular monsters AND bosses)
//       e.g. images/endgame/monsters/slime.png, boss_null.png
//   images/endgame/items/<id>.png      (equipment base items)
//       e.g. images/endgame/items/wpn_1h_1.png
//
// IMPORTANT — no extension probing!
// The old approach fired one request per id x extension (5x) on every page
// load, which got this GitHub Pages site rate-limited. Instead we fetch a
// single manifest file listing what actually exists:
//   images/endgame/manifest.json     { "monster": { "<id>": "png", ... },
//                                     "item":    { "<id>": "png", ... } }
// Regenerate it after adding/removing art with:
//   powershell -File tools/build-art-manifest.ps1
//
// Only ids present in the manifest are ever requested, so a page load costs
// exactly ONE extra request regardless of how much art exists.
// If the manifest is missing (e.g. local dev), we fall back to probing —
// but lazily (only when a screen actually asks for an id) and through a
// small concurrency-limited queue.
// If no image exists for an id, every render call falls back to the
// emoji icon currently used, so nothing breaks while art is missing.


const EG_ART = (function () {

    const ART_PATHS = {
        monster: 'images/endgame/monsters/',
        item: 'images/endgame/items/'
    };

    const MANIFEST_URL = 'images/endgame/manifest.json';
    const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'];

    // Fallback probing: never run more than this many image requests at once.
    const MAX_CONCURRENT_PROBES = 2;

    // key "<kind>/<id>" -> resolved url, or null while resolving / when missing.
    const _cache = new Map();

    // ids currently being probed (fallback mode) — avoids duplicate requests.
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

    // One fetch for the whole game — replaces hundreds of probe requests.
    fetch(MANIFEST_URL)
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


    // Returns the image url for an id, or null if none exists (yet).
    // With the manifest present this is a pure Map lookup after load.
    function url(kind, id) {
        if (!id) return null;
        const key = _key(kind, id);
        if (!_cache.has(key)) {
            _cache.set(key, null);
            if (_manifestFailed && !_probing.has(key)) {
                _probing.add(key);
                _probeQueue.push({ kind: kind, id: id });
                _pumpQueue();
            }
        }
        return _cache.get(key);
    }

    // HTML helper for template strings: <img> when art exists, else the emoji.
    function html(kind, id, fallbackEmoji) {
        const u = url(kind, id);
        if (u) {
            return '<img src="' + u + '" alt="" class="eg-art-img" draggable="false">';
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
            el.appendChild(img);
        } else {
            el.textContent = fallbackEmoji || '';
        }
    }

    // Kept for API compatibility. With the manifest present everything is
    // already cached by the single fetch above; nothing to do here.
    function preload() { /* handled by the manifest fetch */ }

    return { url, html, fillElement, preload };
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
    } catch (e) { /* screens not initialised yet — safe to ignore */ }
});
