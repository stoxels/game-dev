//------------------------------------------------------------------------
//-------------------SCREEN NAVIGATION REGISTRY---------------------------
//------------------------------------------------------------------------
// Central registry for the endgame screen names used by back-navigation
// (atlas-ui ↔ gate ↔ nexus form a load-order cycle that only works
// because dispatch is deferred through inline onclick strings). Screens
// store a backFn NAME; the resolver validates that the name really is a
// global function so a typo can never silently produce a dead back button.
export const EG_SCREEN_NAV = {
    hub: 'showEndgameHub',
    gate: 'showEndgameGate',
    atlas: 'showEndgameAtlas',
    nexus: 'showEndgameNexus',
    vendor: 'showEndgameVendor',
    bossTest: 'showEndgameBossTest',
};

// Returns `name` if it names a callable global (function declaration),
// otherwise warns and returns the fallback.
export function _egResolveBackFn(name, fallback) {
    if (typeof name === 'string' && typeof window[name] === 'function') return name;
    if (name && name !== fallback) {
        console.warn('[load-order] unknown endgame back-nav function:', name, '- falling back to', fallback);
    }
    return fallback || EG_SCREEN_NAV.nexus;
}
