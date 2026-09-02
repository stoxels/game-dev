// =============================================================================
// preview-highscore-seed.js
// Test data for preview_highscore.html ONLY. Never included by index.html.
// Provides the minimal globals the real screens-highscore.js expects:
//   t(), ALL[], SAVE_SLOT_COUNT, screenHistory, switchScreen
// and seeds localStorage with highscores spread across save slots —
// including a superTutor entry that must never show up in the table.
// =============================================================================

// --- minimal fake translation (English only) --------------------------------
function t(key) {
    const strings = {
        hs_level: 'Level',
        hs_best: 'Best Score',
        hs_diff: 'Difficulty',
        hs_mods: 'Mods',
        hs_slot: 'Slot',
        hs_all_slots: 'ALL',
        hs_filter_empty: 'No highscores in Slot {n} yet.',
        no_hs: 'No highscores yet.',
        diff_easy: 'Easy',
        diff_normal: 'Normal',
        diff_hard: 'Hard'
    };
    return strings[key] || key;
}

// --- fake level list: 5 worlds x 8 levels = 40 levels -----------------------
// 40 rows guarantee the table overflows its parchment window in the preview,
// so the scroll-mover can be verified with real scrolling.
const ALL = [];
for (let world = 1; world <= 5; world++) {
    for (let li = 1; li <= 8; li++) {
        ALL.push({ world, li, gIdx: (world - 1) * 8 + (li - 1) });
    }
}

// --- fake save slot system ----------------------------------------------------
const SAVE_SLOT_COUNT = 20;
function loadRawSaveFromSlot(slotNum) {
    return window.__hsSeedSlots[slotNum] || null;
}

// minimal stand-ins so buildHS()/showHS() can run unmodified
const screenHistory = [];
function switchScreen(id) {
    console.info('[preview] switchScreen(' + id + ')');
}

// =============================================================================
// SEEDED TEST DATA
// Levels are keyed by global index (gi = 0..23 → world 1-1 … 3-8).
// =============================================================================

// Slot 7: the overall record on level 1-1 — set with Super Tutor active.
// Verifies (a) superTutor is filtered out of the Mods column and
// (b) the slot column shows 7 even though the mods display nothing for it.
const recordWithSuperTutor = {
    0: { score: 980, diff: 'easy', mods: { superTutor: true } }
};

// Slot 3: a spread of normal progress with a score TIED with slot 12 on 1-2.
const slot3Records = {
    0: { score: 540, diff: 'normal', mods: {} },
    1: { score: 610, diff: 'normal', mods: { timetrial: true } },
    2: { score: 700, diff: 'hard', mods: { hardcore: true } }
};

// Slot 12: beats slot 3's records on several levels.
const slot12Records = {
    1: { score: 610, diff: 'hard', mods: { timetrial: true, classless: true } },
    2: { score: 720, diff: 'hard', mods: { hardcore: true, treeless: true } },
    9: { score: 1300, diff: 'hard', mods: { timetrial: true, hardcore: true, ironman: true, classless: true, treeless: true } }
};

// Slot 20: the final slot's lone record plus a descending tail so the
// table overflows and the scroll-mover gets exercised in the preview.
const slot20Records = {
    23: { score: 830, diff: 'easy', mods: { treeless: true } }
};
for (let gi = 24; gi < 40; gi++) {
    slot20Records[gi] = { score: 800 - (gi - 24) * 35, diff: 'normal', mods: {} };
}

window.__hsSeedSlots = {
    3: { totalScore: 9000, levelHS: slot3Records },
    7: { totalScore: 12000, levelHS: recordWithSuperTutor },
    12: { totalScore: 15500, levelHS: slot12Records },
    20: { totalScore: 4000, levelHS: slot20Records }
};

// Sort-order smoke test, mirrored from the seeds above:
//   2-1 (1300, slot 12) > 1-1 (980, slot 7) > 1-3 (720, slot 12)
//   > 2-8 (830, slot 20) …
window.__hsSeedInfo = 'expected top row: 2-1 / 1300 / slot 12 — all 5 mods shown, no superTutor anywhere';
