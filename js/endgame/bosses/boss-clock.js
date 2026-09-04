//------------------------------------------------------------------------
//-------------------BOSS: THE CLOCK (boss_clock)-------------------------------
//------------------------------------------------------------------------
// Clock-face duel: the hands sweep the dial like a real clock — the second
// hand races, the minute hand lumbers behind it, the hour hand crawls.
// Before every sweep The Clock calls the time ("35 seconds", "27 minutes",
// "5 hours") at the exact spot where each hand will spawn, so the player can
// read the dial and count the rhythm. Phase 1 runs a single hand (seconds),
// phase 2 adds the minute hand, phase 3 adds the hour hand — up to three
// beams sweeping at three speeds. The hands are slow by design, so getting
// caught is punishing: hits deal a large % of max HP.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_clock: {
        id: 'boss_clock', name: 'The Clock', emoji: '🕐',
        baseHP: 940, baseDamage: 20, chargeMax: 13,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_clock: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'clock_hand', intervalBase: 19000, intervalVariance: 5000, handler: '_egMechClockHand' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
    },
});


// ── Hand unit metadata ───────────────────────────────────────────────────────
// Each hand maps a dial reading to a spawn angle (scale = unit per full turn)
// and sweeps clockwise at its own speed, like the hand of a real clock.
const EG_CLOCK_HAND_SECONDS = {
    keyS: 'eg_clock_second', keyP: 'eg_clock_seconds', fbS: 'second', fbP: 'seconds',
    max: 59, scale: 60, omega: (2 * Math.PI) / 12,   // one sweep per 12s
    cls: 'eg-nk-clock-second', callCls: 'eg-nk-clock-call-second',
    height: 6, halfW: 4,
};
const EG_CLOCK_HAND_MINUTES = {
    keyS: 'eg_clock_minute', keyP: 'eg_clock_minutes', fbS: 'minute', fbP: 'minutes',
    max: 59, scale: 60, omega: (2 * Math.PI) / 22,   // one sweep per 22s
    cls: 'eg-nk-clock-minute', callCls: 'eg-nk-clock-call-minute',
    height: 12, halfW: 7,
};
const EG_CLOCK_HAND_HOURS = {
    keyS: 'eg_clock_hour', keyP: 'eg_clock_hours', fbS: 'hour', fbP: 'hours',
    max: 12, scale: 12, omega: (2 * Math.PI) / 32,   // one sweep per 32s
    cls: 'eg-nk-clock-hour', callCls: 'eg-nk-clock-call-hour',
    height: 20, halfW: 11,
};


// Localized "seconds / minutes / hours" label (singular form for value 1).
function _egClockUnitLabel(h, value) {
    const key = value === 1 ? h.keyS : h.keyP;
    let unit = value === 1 ? h.fbS : h.fbP;
    try {
        const r = t(key);
        if (r && r !== key) unit = r;
    } catch (e) {}
    return value + ' ' + unit;
}


function _egMechClockHand(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    // The hands are slow by design — counting the rhythm is the whole fight,
    // so getting caught has to sting: %maxHP hits, scaled up per phase.
    const dmgPct = [0, 0.18, 0.22, 0.26][p];
    const warnMs = 1600;
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);

    // ── Clock face (pivot) ────────────────────────────────────────────────
    // The .eg-nk-anchor pulse animates the independent `scale` property, so
    // the inline translate below is preserved and the face stays centered.
    const face = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🕐');
    face.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';

    // ── Hand roster per phase ─────────────────────────────────────────────
    const roster = [EG_CLOCK_HAND_SECONDS];
    if (p >= 2) roster.push(EG_CLOCK_HAND_MINUTES);
    if (p >= 3) roster.push(EG_CLOCK_HAND_HOURS);

    // ── Telegraph: call the time where each hand will spawn ───────────────
    // Each callout floats at the tip of its hand's spawn angle; a dashed
    // ghost beam previews the exact line the sweep will start from.
    const tipR = Math.max(150, Math.min(window.innerWidth, window.innerHeight) * 0.42);
    const hands = roster.map(h => {
        const value = 1 + Math.floor(Math.random() * h.max); // 1..max
        // CSS rotate(0) points at 3 o'clock and positive angles turn
        // clockwise — subtract π/2 so the dial reads like a real clock
        // (12 o'clock = 0 seconds/minutes/hours).
        const a0 = (value / h.scale) * 2 * Math.PI - Math.PI / 2;
        const call = _egNkEl(run, 'div', 'eg-nk-clock-call ' + h.callCls, _egClockUnitLabel(h, value));
        call.style.left = Math.round(cx + Math.cos(a0) * tipR) + 'px';
        call.style.top = Math.round(cy + Math.sin(a0) * tipR) + 'px';
        const ghost = _egNkEl(run, 'div', 'eg-nk-beam ' + h.cls + ' eg-nk-clock-ghost');
        ghost.style.width = Math.round(len) + 'px';
        ghost.style.left = Math.round(cx) + 'px';
        ghost.style.top = Math.round(cy - h.height / 2) + 'px';
        ghost.style.transform = 'rotate(' + a0 + 'rad)';
        return { cfg: h, value, a0, call, ghost, beam: null, cdUntil: 0 };
    });

    _egNkToast('eg_mech_clock', '🕐 The Clock: Clock Hand! Count the rhythm!');

    // ── Sweep phase ───────────────────────────────────────────────────────
    // e starts negative (the telegraph window): callouts + ghost beams stay
    // visible while e < 0, then the real beams spawn at their telegraphed
    // angles and sweep clockwise. Pause-safe via _egNkLoop.
    let e = -warnMs, spawned = false;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        if (e < 0) return true; // telegraph window — keep waiting

        if (!spawned) {
            spawned = true;
            hands.forEach(h => {
                h.ghost.remove();
                // The time callout stays up for the WHOLE sweep and rides the
                // tip of its hand around the dial — so "35 seconds" can't be
                // missed: it marks where the hand spawned, then which hand it
                // belongs to.
                h.beam = _egNkEl(run, 'div', 'eg-nk-beam ' + h.cfg.cls);
                h.beam.style.width = Math.round(len) + 'px';
                h.beam.style.left = Math.round(cx) + 'px';
                h.beam.style.top = Math.round(cy - h.cfg.height / 2) + 'px';
            });
        }

        const pr = _egNkPlayerRect();
        for (const h of hands) {
            const a = h.a0 + (e / 1000) * h.cfg.omega;
            h.beam.style.transform = 'rotate(' + a + 'rad)';
            // Label rides the hand's tip around the dial.
            h.call.style.left = Math.round(cx + Math.cos(a) * tipR) + 'px';
            h.call.style.top = Math.round(cy + Math.sin(a) * tipR) + 'px';
            if (pr && now >= h.cdUntil) {
                const pts = [
                    [pr.left + pr.width / 2, pr.top + pr.height / 2],
                    [pr.left, pr.top], [pr.right, pr.top],
                    [pr.left, pr.bottom], [pr.right, pr.bottom],
                ];
                const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
                for (const pt of pts) {
                    if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < h.cfg.halfW + 6) {
                        h.cdUntil = now + 1000;
                        const dealt = _egNkHit(dmgPct, 'lightning', level);
                        _egNkAbilityHitToast(dealt, 'The Clock', 'Clock Hand');
                        break;
                    }
                }
            }
        }
        return e < durMs;
    });
}