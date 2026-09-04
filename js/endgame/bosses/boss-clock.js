//------------------------------------------------------------------------
//-------------------BOSS: THE CLOCK (boss_clock)---------------------------
//------------------------------------------------------------------------
// Clockwork duel: The Clock summons three hands as the fight progresses —
// the seconds hand at 90% HP, the minutes hand at 60%, the hours hand at
// 30%. Every hand is a single THIN BEAM (a line from the pivot outward)
// with a HOLE inside it: an inner segment, then an open gap, then an outer
// segment —  ------------------  <<< hole >>>  ------------------
// The gap is the only safe place: stand inside it and the sweeping beam
// passes around you harmlessly. Every hand's hole sits at a DIFFERENT
// radius (seconds near the pivot, minutes mid-way, hours far out), so no
// single spot is safe from all hands — each beam sweeps over you once per
// revolution and you must be inside THAT hand's hole when it passes,
// hopping between the rings. Each hand is announced by calling the time
// in the center of the grid ("35 seconds", "27 minutes", "5 hours") 3
// seconds before it appears, and once summoned the hands NEVER stop — they
// rotate at the SAME speed until the boss is won or lost, and they spawn
// staggered ~120° apart so the three beams keep permanent gaps between
// them instead of bunching into a single blade.
// Phase 1 runs a single hand (seconds), phase 2 adds the minute hand,
// phase 3 adds the hour hand. Getting caught by a segment is punishing:
// hits deal a large % of max HP, scaled per hand.
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
            // clock_hands is only a START trigger: the first fire creates the
            // permanent watcher run that summons each hand at its HP threshold;
            // later fires (every 10 min) are cheap no-ops while it is alive.
            { name: 'clock_hands', intervalBase: 600000, intervalVariance: 0, handler: '_egMechClockHands' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
    },
});


// ── Tunables ──────────────────────────────────────────────────────────────
const EG_CLOCK_SUMMON_WARN_MS = 3000;            // center call → hand appears
// All three hands share ONE rotation speed so the staggered spawn positions
// keep their relative gaps forever (a rigid three-hand clock). Every boss
// phase (2 at 60% HP, 3 at 30%) speeds all beams up by 20% more.
const EG_CLOCK_HAND_OMEGA = (2 * Math.PI) / 14;  // one full revolution per 14s in phase 1
const EG_CLOCK_PHASE_SPEED_STEP = 0.20;          // +20% rotation speed per boss phase
const EG_CLOCK_HIT_SLACK_PX = 2;                 // beam hit width ≈ its visual thickness
const EG_CLOCK_HURTBOX_INSET_PX = 3;             // extra inset on the damage sample box
const EG_CLOCK_HOLE_GRACE_MS = 400;              // grace window after leaving a hole / hand spawn
const EG_CLOCK_HIT_CD_MS = 1000;                 // per-hand cooldown while caught
const EG_CLOCK_SPAWN_STAGGER_RAD = (2 * Math.PI) / 3; // new hands spawn ~120° apart
const EG_CLOCK_SPAWN_JITTER_RAD = (10 * Math.PI) / 180; // ±10° randomness on top


// ── Hand unit metadata ────────────────────────────────────────────────────
// Each hand maps a dial reading to an angle (scale = unit per full turn),
// like a real clock. Hands are told apart by color + thickness + the
// announced unit (seconds red/thin, minutes cyan/medium, hours amber/thick).
// Every hand carries its OWN hole at a DIFFERENT radius (holeIn..holeOut,
// as fractions of the arena radius): the seconds hole sits close to the
// pivot, the minutes hole mid-way, the hours hole far out. Adjacent bands
// overlap slightly, but all three never share a common radius — so there
// is no single spot safe from every hand. Each beam passes over your
// position once per revolution, and you must be standing in THAT hand's
// hole when it does, hopping between the rings.
const EG_CLOCK_HAND_SECONDS = {
    keyS: 'eg_clock_second', keyP: 'eg_clock_seconds', fbS: 'second', fbP: 'seconds',
    max: 59, scale: 60,
    summonPct: 0.90, dmgPct: 0.12,
    cls: 'eg-nk-clock-second', callCls: 'eg-nk-clock-call-second',
    height: 6, halfW: 4,
    holeIn: 0.18, holeOut: 0.53,
};
const EG_CLOCK_HAND_MINUTES = {
    keyS: 'eg_clock_minute', keyP: 'eg_clock_minutes', fbS: 'minute', fbP: 'minutes',
    max: 59, scale: 60,
    summonPct: 0.60, dmgPct: 0.15,
    cls: 'eg-nk-clock-minute', callCls: 'eg-nk-clock-call-minute',
    height: 12, halfW: 7,
    holeIn: 0.46, holeOut: 0.74,
};
const EG_CLOCK_HAND_HOURS = {
    keyS: 'eg_clock_hour', keyP: 'eg_clock_hours', fbS: 'hour', fbP: 'hours',
    max: 12, scale: 12,
    summonPct: 0.30, dmgPct: 0.18,
    cls: 'eg-nk-clock-hour', callCls: 'eg-nk-clock-call-hour',
    height: 20, halfW: 11,
    holeIn: 0.68, holeOut: 0.98,
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


// Nearest dial reading (1..max) for an angle — used to announce a spawn
// position as a human-readable clock number. Angles follow the dial
// convention (12 o'clock = 0 units, clockwise positive).
function _egClockValueFromAngle(cfg, a) {
    let v = Math.round(((a + Math.PI / 2) / (2 * Math.PI)) * cfg.scale);
    v = ((v - 1) % cfg.max + cfg.max) % cfg.max + 1;
    return v;
}


// Builds one hand: a thin beam with a hole inside it. The container is a
// line from the pivot (left end) to the screen edge that rotates about the
// pivot; inside it sit two colinear segments — inner [0, r1] and outer
// [r2, len] — so the open gap between r1 and r2 is the safe hole. Returns
// the element plus the hole's pixel band for the hit test.
function _egClockMakeHand(run, cfg, cx, cy, len, arenaB) {
    const r1 = arenaB * cfg.holeIn;
    const r2 = arenaB * cfg.holeOut;
    const el = _egNkEl(run, 'div', 'eg-nk-clock-hand');
    el.style.width = Math.round(len) + 'px';
    el.style.height = cfg.height + 'px';
    el.style.left = Math.round(cx) + 'px';
    el.style.top = Math.round(cy - cfg.height / 2) + 'px';
    el.style.animation = 'eg-clock-hand-in 0.45s ease-out';

    const inner = document.createElement('div');
    inner.className = 'eg-nk-clock-seg ' + cfg.cls;
    inner.style.width = Math.round(Math.max(0, r1)) + 'px';
    const outer = document.createElement('div');
    outer.className = 'eg-nk-clock-seg ' + cfg.cls;
    outer.style.left = Math.round(r2) + 'px';
    outer.style.width = Math.round(Math.max(0, len - r2)) + 'px';
    el.appendChild(inner);
    el.appendChild(outer);
    return { el, r1, r2 };
}


// Sample points for the damage test, inset a few px toward the sprite
// center — the avatar's visible artwork carries transparent padding, so a
// grazing corner shouldn't register as a hit. Returns the center (used for
// hole membership) plus the inset box's four corners + center for the beam
// line tests.
function _egClockPlayerPts(pr) {
    const ix = Math.min(EG_CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.width / 2 - 8));
    const iy = Math.min(EG_CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.height / 2 - 8));
    const l = pr.left + ix, r = pr.right - ix, t = pr.top + iy, b = pr.bottom - iy;
    const cx = (l + r) / 2, cy = (t + b) / 2;
    return {
        center: [cx, cy],
        pts: [[cx, cy], [l, t], [r, t], [l, b], [r, b]],
    };
}


// ── Center-grid call banner (same slot as the low-time / mistakes /
//    low-health warnings). One colored line per summoned hand, each line
//    colored like its beam (red seconds, cyan minutes, amber hours).
function _egClockShowCall(plan) {
    if (typeof _egClearCenterGridBanners === 'function') {
        _egClearCenterGridBanners('eg-clock-call-banner');
    }
    const banner = document.createElement('div');
    banner.id = 'eg-clock-call-banner';
    banner.className = 'eg-clock-call-banner';
    plan.forEach(p => {
        const line = document.createElement('div');
        line.className = 'eg-nk-clock-call-line ' + p.cfg.callCls;
        line.textContent = _egClockUnitLabel(p.cfg, p.value);
        banner.appendChild(line);
    });
    document.body.appendChild(banner);
    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        banner.style.left = (r.left + r.width / 2) + 'px';
        banner.style.top = (r.top + r.height / 2) + 'px';
    } else {
        banner.style.left = '50%';
        banner.style.top = '50%';
    }
    return banner;
}


// Watcher run that lives for the whole boss fight (created by the
// clock_hands start trigger): watches boss HP and summons each hand at its
// threshold — center call, 3s later the beam appears and rotates forever.
// Hands only stop when the run dies with the boss (win or loss).
function _egMechClockHands(monster, phase) {
    if (typeof _egNkNewRun !== 'function' || typeof _egNkEl !== 'function') return;
    // The face element doubles as the "hands already running" flag — it is
    // removed with the run's elements when the boss dies or the encounter
    // stops, so a fresh fight always starts clean.
    if (document.getElementById('eg-nk-clock-face')) return;

    const bossId = monster && monster.id;
    const run = _egNkNewRun(bossId, false);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const arenaB = Math.max(240, Math.min(window.innerWidth, window.innerHeight) * 0.5);

    // Clock face (pivot). The .eg-nk-anchor pulse animates the independent
    // `scale` property, so the inline translate below is preserved.
    const face = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🕐');
    face.id = 'eg-nk-clock-face';
    face.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';

    const roster = [EG_CLOCK_HAND_SECONDS, EG_CLOCK_HAND_MINUTES, EG_CLOCK_HAND_HOURS];
    const live = [];     // spawned hands { cfg, a, el, cdUntil }
    const armed = {};    // summonPct → true once the threshold was crossed
    const pending = [];  // hand cfgs waiting for their center call
    let announced = [];  // { cfg, a, value } during the 3s call window
    let callBanner = null;
    let callMsLeft = 0;

    function beginAnnounce() {
        const batch = pending.splice(0);
        if (!batch.length) return;
        // Plan spawn angles in order — each new hand starts ~120° past the
        // previous planned one (or past the last live hand). Because every
        // hand rotates at the SAME speed, those gaps stay open forever.
        announced = [];
        let lastAngle = live.length ? live[live.length - 1].a : -Math.PI / 2;
        batch.forEach(cfg => {
            const a = lastAngle + EG_CLOCK_SPAWN_STAGGER_RAD
                + (Math.random() * 2 - 1) * EG_CLOCK_SPAWN_JITTER_RAD;
            lastAngle = a;
            announced.push({ cfg, a, value: _egClockValueFromAngle(cfg, a) });
        });
        callMsLeft = EG_CLOCK_SUMMON_WARN_MS;
        callBanner = _egClockShowCall(announced);
        run.els.push(callBanner);
    }

    function spawnAnnounced(now) {
        announced.forEach(p => {
            const made = _egClockMakeHand(run, p.cfg, cx, cy, len, arenaB);
            made.el.style.transform = 'rotate(' + p.a + 'rad)';
            // safeSince = spawn moment → a hand that appears right on top of
            // the player gets the same short grace window before first hit.
            live.push({ cfg: p.cfg, a: p.a, el: made.el, r1: made.r1, r2: made.r2, cdUntil: 0, safeSince: now });
            // The mechanic intro toast rides along with the first hand.
            if (p.cfg.fbP === 'seconds') {
                _egNkToast('eg_mech_clock', '🕐 The Clock: Clock Hand! Count the rhythm!');
            }
        });
        if (callBanner) { callBanner.remove(); callBanner = null; }
        announced = [];
    }

    _egNkLoop(run, (dtS, now) => {
        // HP polling — the run's aliveness check already kills it when the
        // boss dies; this lookup only feeds the summon thresholds.
        const m = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? _egMonsters.find(x => x && x.id === bossId) : null;
        const pct = (m && m.maxHP > 0) ? (m.currentHP / m.maxHP) : 1;

        // Arm hands whose HP threshold was crossed (each exactly once).
        roster.forEach(cfg => {
            if (!armed[cfg.summonPct] && pct <= cfg.summonPct) {
                armed[cfg.summonPct] = true;
                pending.push(cfg);
            }
        });
        if (!announced.length && pending.length) beginAnnounce();

        // 3s call window → the announced hand(s) spawn and start rotating.
        if (announced.length) {
            callMsLeft -= dtS * 1000;
            if (callMsLeft <= 0) spawnAnnounced(now);
        }

        const pr = _egNkPlayerRect();
        const box = pr ? _egClockPlayerPts(pr) : null;

        // Phase scaling: phase 1 spins at base speed, phase 2 +20%,
        // phase 3 +40% — all hands share it, so their gaps stay fixed.
        const phaseNo = pct <= 0.30 ? 3 : pct <= 0.60 ? 2 : 1;
        const speed = EG_CLOCK_HAND_OMEGA
            * Math.pow(1 + EG_CLOCK_PHASE_SPEED_STEP, phaseNo - 1);
        for (const h of live) {
            h.a += dtS * speed;
            h.el.style.transform = 'rotate(' + h.a + 'rad)';
            if (!box) continue;
            // Standing in THIS hand's hole (center inside the band) resets
            // the grace timer: the hand can't hurt you for a short while
            // after you step out, so edge-clipping on a ring hop feels fair.
            const dc = Math.hypot(box.center[0] - cx, box.center[1] - cy);
            if (dc > h.r1 && dc < h.r2) h.safeSince = now;
            if (now < h.cdUntil || now - h.safeSince < EG_CLOCK_HOLE_GRACE_MS) continue;
            const bx = cx + Math.cos(h.a) * len, by = cy + Math.sin(h.a) * len;
            for (const pt of box.pts) {
                // Points inside THIS hand's hole → the beam is missing at
                // this radius, so its sweep passes harmlessly by.
                const d = Math.hypot(pt[0] - cx, pt[1] - cy);
                if (d > h.r1 && d < h.r2) continue;
                if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < h.cfg.halfW + EG_CLOCK_HIT_SLACK_PX) {
                    h.cdUntil = now + EG_CLOCK_HIT_CD_MS;
                    const dealt = _egNkHit(h.cfg.dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Clock', 'Clock Hand');
                    break;
                }
            }
        }
        return true; // rotate until the boss dies or the encounter stops
    });
}
