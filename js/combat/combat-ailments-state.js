//------------------------------------------------------------------------
//-------------------SHARED AILMENT STATE-------------------------------
//------------------------------------------------------------------------
// Mutable encounter state shared by the combat and puzzle helpers.

export let _egPlayerStatuses = {};
export let _egPuzzleEffects = [];
export let _egIceRedirectDepth = 0;
export let _egSparkFollowerEl = null;
export let _egSparkMoveHandler = null;
export let _egSparkSpawnTimer = null;
export let _egSparkLastX = 0;
export let _egSparkLastY = 0;
export const EG_SPARK_GLYPHS = ['⚡', '✦', '✧', '＊'];
export let _egGroundFireAcc = 0;
export let _egPlayerStatusBarTicker = null;

// Replaces the active puzzle list while keeping the owner binding writable
// from focused sibling modules.
export function _egReplacePuzzleEffects(nextEffects) {
    _egPuzzleEffects = nextEffects;
}

// Replaces the status-bar timer handle without exposing the owner binding
// to sibling modules that only need to stop or start the ticker.
export function _egSetPlayerStatusBarTicker(nextTimer) {
    _egPlayerStatusBarTicker = nextTimer;
}

export function _egAddGroundFireAcc(delta) {
    _egGroundFireAcc += delta;
}

export function _egSetIceRedirectDepth(value) {
    _egIceRedirectDepth = value;
}

export function _egSetSparkFollowerEl(value) {
    _egSparkFollowerEl = value;
}

export function _egSetSparkMoveHandler(value) {
    _egSparkMoveHandler = value;
}

export function _egSetSparkSpawnTimer(value) {
    _egSparkSpawnTimer = value;
}

export function _egSetSparkLastPosition(x, y) {
    _egSparkLastX = x;
    _egSparkLastY = y;
}

// Resets only the player status map at the start of the lifecycle sequence.
export function _egResetPlayerStatuses() {
    _egPlayerStatuses = {};
}

// Resets counters that are cleared after puzzle effects are removed.
export function _egResetAilmentCounters() {
    _egIceRedirectDepth = 0;
    _egGroundFireAcc = 0;
}
