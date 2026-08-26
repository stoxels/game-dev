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
// png / webp / jpg / jpeg / gif are probed in that order.
// If no image exists for an id, every render call falls back to the
// emoji icon currently used, so nothing breaks while art is missing.


const EG_ART = (function () {

    const ART_PATHS = {
        monster: 'images/endgame/monsters/',
        item: 'images/endgame/items/'
    };

    const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'];

    // key "<kind>/<id>" -> resolved url, or null while probing / when missing.
    const _cache = new Map();


    function _key(kind, id) {
        return kind + '/' + id;
    }

    // Fires whenever a previously missing image resolves, so open screens
    // can swap their emoji fallbacks for the freshly found image.
    function _notify() {
        document.dispatchEvent(new CustomEvent('eg-art-loaded'));
    }

    function _probe(kind, id) {
        const key = _key(kind, id);
        let extIdx = 0;
        const tryNext = function () {
            if (extIdx >= EXTENSIONS.length) return; // stays null -> emoji fallback
            const src = ART_PATHS[kind] + id + '.' + EXTENSIONS[extIdx++];
            const img = new Image();
            img.onload = function () {
                _cache.set(key, src);
                _notify();
            };
            img.onerror = tryNext;
            img.src = src;
        };
        tryNext();
    }


    // Returns the image url for an id, or null if none exists (yet).
    // First call for an id kicks off the async probe.
    function url(kind, id) {
        if (!id) return null;
        const key = _key(kind, id);
        if (!_cache.has(key)) {
            _cache.set(key, null);
            _probe(kind, id);
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

    // Pre-probe everything known up front so results are cached before
    // the relevant screens are ever opened.
    function preload() {
        Object.keys(EG_MONSTER_DEFS || {}).forEach(id => url('monster', id));
        Object.keys(EG_BOSS_DEFS || {}).forEach(id => url('monster', id));
        (typeof EG_ALL_BASE_TYPES !== 'undefined' ? EG_ALL_BASE_TYPES : [])
            .forEach(b => url('item', b.id));
    }

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
