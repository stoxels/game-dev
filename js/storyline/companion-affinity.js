//------------------------------------------------------------------------
//-------------------COMPANION AFFINITY---------------------------------------
//------------------------------------------------------------------------
// How much the player's hero is bonded to each of the other two heroes. Affinity is
// kept per pair (player hero > friend) in the save as `STATE.companionAffinity`
// and is only ever built up, never lost. Every watched meeting adds one
// point (counted once per scene, at most AFFINITY_MEETING_CAP points from
// meetings, so all six pairs can reach the same levels); every first clear
// of a co-op level adds AFFINITY_COOP_POINTS. A skipped meeting earns nothing.
// These functions work on a plain store object, so they know nothing about
// the save; the caller passes `STATE.companionAffinity` in and saves afterwards.

//------------------------------------------------------------------------
// CONSTANTS
//------------------------------------------------------------------------

// Most affinity points the meetings alone can give to one pair.
export const AFFINITY_MEETING_CAP = 9;
// Affinity points for the first clear of one co-op level.
export const AFFINITY_COOP_POINTS = 2;
// Points needed for affinity level 1, 2, 3, 4 and 5.
export const AFFINITY_LEVEL_POINTS = [3, 6, 9, 12, 15];

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Save key of one pair, e.g. 'trix>syla' (Trix is the player, Syla the friend).
export function affinityPairKey(playerId, friendId) {
    return `${playerId}>${friendId}`;
}

// The record of one pair, created empty when the pair has none yet.
function _pairRecord(store, playerId, friendId) {
    const key = affinityPairKey(playerId, friendId);
    const rec = store[key] && typeof store[key] === 'object' ? store[key] : (store[key] = {});
    if (!rec.meetings || typeof rec.meetings !== 'object') rec.meetings = {};
    if (!rec.coop || typeof rec.coop !== 'object') rec.coop = {};
    return rec;
}

//------------------------------------------------------------------------
// READING AFFINITY
//------------------------------------------------------------------------

// Affinity points of a pair: watched meetings (capped) plus co-op first clears.
export function getAffinityPoints(store, playerId, friendId) {
    const rec = store && store[affinityPairKey(playerId, friendId)];
    if (!rec) return 0;
    const meetings = Math.min(AFFINITY_MEETING_CAP, Object.keys(rec.meetings || {}).length);
    return meetings + AFFINITY_COOP_POINTS * Object.keys(rec.coop || {}).length;
}

// Affinity level of a pair, 0 (none yet) to 5.
export function getAffinityLevel(store, playerId, friendId) {
    const points = getAffinityPoints(store, playerId, friendId);
    return AFFINITY_LEVEL_POINTS.filter(need => points >= need).length;
}

// Everything the affinity screen shows for one pair: level, points, where the
// points came from and what is missing for the next level (`nextAt` and
// `toNext` are null at the top level).
export function affinitySummary(store, playerId, friendId) {
    const rec = (store && store[affinityPairKey(playerId, friendId)]) || {};
    const points = getAffinityPoints(store, playerId, friendId);
    const level = getAffinityLevel(store, playerId, friendId);
    const nextAt = level < AFFINITY_LEVEL_POINTS.length ? AFFINITY_LEVEL_POINTS[level] : null;
    return {
        points, level, nextAt,
        toNext: nextAt === null ? null : nextAt - points,
        fromLevel: level === 0 ? 0 : AFFINITY_LEVEL_POINTS[level - 1],
        meetings: Math.min(AFFINITY_MEETING_CAP, Object.keys(rec.meetings || {}).length),
        coopClears: Object.keys(rec.coop || {}).length,
    };
}

//------------------------------------------------------------------------
// BUILDING AFFINITY
//------------------------------------------------------------------------

// A meeting was watched to the end. Each friend in it earns one point for
// that scene; watching it again earns nothing more. Returns true when
// anything new was recorded (so the caller knows to save).
export function recordMeetingWatched(store, sceneId, playerId, friendIds) {
    let changed = false;
    for (const friendId of friendIds) {
        const rec = _pairRecord(store, playerId, friendId);
        if (!rec.meetings[sceneId]) { rec.meetings[sceneId] = true; changed = true; }
    }
    return changed;
}

// A co-op level was cleared with this friend. Only the first clear counts.
// Returns true when it was the first clear.
export function recordCoopClear(store, coopId, playerId, friendId) {
    const rec = _pairRecord(store, playerId, friendId);
    if (rec.coop[coopId]) return false;
    rec.coop[coopId] = true;
    return true;
}
