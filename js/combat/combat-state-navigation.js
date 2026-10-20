//------------------------------------------------------------------------
//-------------------SCREEN NAVIGATION REGISTRY---------------------------
//------------------------------------------------------------------------
// Central registry for the endgame screen names used by back-navigation
// (atlas-ui ↔ gate ↔ nexus form a load-order cycle that only works
// because dispatch is deferred through inline onclick strings). Screens
// store a backFn NAME; the resolver validates that the name really is a
// global function so a typo can never silently produce a dead back button.
export const SCREEN_NAV = {
    hub: 'showHub',
    gate: 'showEndgameGate',
    atlas: 'showEndgameAtlas',
    nexus: 'showEndgameNexus',
    vendor: 'showVendor',
    bossTest: 'showEndgameBossTest',
};

// Returns `name` if it names a callable global (function declaration),
// otherwise warns and returns the fallback.
export function _resolveBackFn(name, fallback) {
    if (typeof name === 'string' && typeof window[name] === 'function') return name;
    if (name && name !== fallback) {
        console.warn('[load-order] unknown endgame back-nav function:', name, '- falling back to', fallback);
    }
    return fallback || SCREEN_NAV.nexus;
}
