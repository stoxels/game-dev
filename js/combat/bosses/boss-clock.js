import { Audio_Manager } from '../../audio/audio.js';
import { _clearCenterGridBanners } from '../../timer/timer.js';
import { t } from '../../translation/translations.js';
import { endTimerFreeze, startTimerFreeze } from '../../timer/timer-freeze.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkEl, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE CLOCK (boss_clock)---------------------------
//------------------------------------------------------------------------
// Clockwork duel: three beam hands summon at 90/60/30% HP and sweep at one
// shared speed, staggered 120° apart. At 15% HP time freezes for 30s while
// twelve beams ring the arena and lunge - survive the strikes to restart
// the clock.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_clock: {
        id: 'boss_clock', name: 'The Clock', emoji: '🕐',
        baseHP: 940, baseDamage: 20, chargeMax: 13,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
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
            { name: 'clock_hands', intervalBase: 600000, intervalVariance: 0, handler: '_mechClockHands' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_mechProbabilityShift' },
        ],
    },
});


// ── Tunables ──────────────────────────────────────────────────────────────
export const CLOCK_SUMMON_WARN_MS = 3000;            // center call → hand appears
// All three hands share ONE rotation speed so the staggered spawn positions
// keep their relative gaps forever (a rigid three-hand clock). Every boss
// phase (2 at 60% HP, 3 at 30%) speeds all beams up by 33% more (16s → 12s
// → 9s per revolution). Tuned against the avatar's ~320 px/s WASD speed:
// phase 3's sweep can be outrun at any radius inside the grid area only
// with movement-speed boots - far from the pivot the beams outrun a
// base-speed avatar, so the fight funnels you toward the clock's center.
export const CLOCK_HAND_OMEGA = (2 * Math.PI) / 16;  // one full revolution per 16s in phase 1
export const CLOCK_PHASE_SPEED_STEP = 0.33;          // +33% rotation speed per boss phase
export const CLOCK_HIT_SLACK_PX = 2;                 // beam hit width ≈ its visual thickness
export const CLOCK_HURTBOX_INSET_PX = 3;             // extra inset on the damage sample box
export const CLOCK_SPAWN_GRACE_MS = 400;             // grace window after a hand spawns
export const CLOCK_HIT_CD_MS = 1000;                 // per-hand cooldown while caught
export const CLOCK_SPAWN_STAGGER_RAD = (2 * Math.PI) / 3; // new hands spawn ~120° apart → three equal safe wedges
export const CLOCK_SPAWN_JITTER_RAD = (5 * Math.PI) / 180;  // ±5° randomness on top

// ── Time Freeze tunables (the 15% HP last-stand) ─────────────────────────
export const CLOCK_FREEZE_WARN_MS = 2500;    // telegraph before time actually stops
export const CLOCK_FREEZE_TRIGGER_PCT = 0.15;   // boss HP% that stops time
export const CLOCK_FREEZE_DURATION_MS = 30000;  // the frozen window (30s)
export const CLOCK_FREEZE_STRIKE_MS = 800;      // beams lunge through the player
export const CLOCK_FREEZE_BEAMS = 12;           // beams ringed all around the screen
export const CLOCK_FREEZE_HOLD_PX = 68;         // hover radius from player center
export const CLOCK_FREEZE_LUNGE_PX = 220;       // strike punches this far past the player
export const CLOCK_FREEZE_DMG_PCT = 0.90;       // total damage on failure - every beam hits, ~7.5% each × 12
export const CLOCK_FREEZE_COLOR = '#ffe536';    // lightning yellow
export const CLOCK_FREEZE_RING_RADIUS = 92;     // countdown ring radius (px) around the player

// Global freeze flags - true while The Clock is telegraphing then holding
// time. _clockTimeFreezeWarn is the 2.5s buildup (hands stop, face flares)
// so the player isn't blindsided; _clockTimeFreezeActive is the real 30s
// freeze. Both are written BEFORE any side effect so a single frame can
// never slip between the flag and the effect taking hold. timerFrozen
// itself is owned by the shared timer-freeze mechanic: the freeze is
// started via startTimerFreeze(hold:true) and released via
// endTimerFreeze(), so shorter freezes can never cut this one short and
// the Clock no longer writes the flag directly. The meta-flags are read
// in:
//   start-level.js      keeps timerFrozen alive across arena transitions
//   penalty.js          mistake counter frozen
//   player_sprite.js    avatar can't move
//   endgame-encounter.js auto-attack charge bar frozen
// Cleared by _clockClearFreezeWarn / _clockTimeFreezeEnd, which every
// freeze-run kill path runs.
window._clockTimeFreezeWarn = false;
window._clockTimeFreezeActive = false;


// ── Hand unit metadata ────────────────────────────────────────────────────
// Each hand maps a dial reading to an angle (scale = unit per full turn),
// like a real clock. Hands are told apart by color + thickness + the
// announced unit (seconds red/thin, minutes cyan/medium, hours amber/thick).
// Every beam is SOLID from the pivot to the screen edge - no safe hole -
// so the whole fight is reading the three beams' rhythm and staying off
// their lines.
export const CLOCK_HAND_SECONDS = {
    keyS: 'eg_clock_second', keyP: 'eg_clock_seconds', fbS: 'second', fbP: 'seconds',
    max: 59, scale: 60,
    summonPct: 0.90, dmgPct: 0.10,
    cls: 'sx-nk-clock-second', callCls: 'sx-nk-clock-call-second',
    height: 6, halfW: 4,
};
export const CLOCK_HAND_MINUTES = {
    keyS: 'eg_clock_minute', keyP: 'eg_clock_minutes', fbS: 'minute', fbP: 'minutes',
    max: 59, scale: 60,
    summonPct: 0.60, dmgPct: 0.13,
    cls: 'sx-nk-clock-minute', callCls: 'sx-nk-clock-call-minute',
    height: 12, halfW: 7,
};
export const CLOCK_HAND_HOURS = {
    keyS: 'eg_clock_hour', keyP: 'eg_clock_hours', fbS: 'hour', fbP: 'hours',
    max: 12, scale: 12,
    summonPct: 0.30, dmgPct: 0.16,
    cls: 'sx-nk-clock-hour', callCls: 'sx-nk-clock-call-hour',
    height: 20, halfW: 11,
};


// Localized "seconds / minutes / hours" label (singular form for value 1).
export function _clockUnitLabel(h, value) {
    const key = value === 1 ? h.keyS : h.keyP;
    let unit = value === 1 ? h.fbS : h.fbP;
    try {
        const r = t(key);
        if (r && r !== key) unit = r;
    } catch (e) {}
    return value + ' ' + unit;
}


// Nearest dial reading (1..max) for an angle - used to announce a spawn
// position as a human-readable clock number. Angles follow the dial
// convention (12 o'clock = 0 units, clockwise positive).
export function _clockValueFromAngle(cfg, a) {
    let v = Math.round(((a + Math.PI / 2) / (2 * Math.PI)) * cfg.scale);
    v = ((v - 1) % cfg.max + cfg.max) % cfg.max + 1;
    return v;
}


// Builds one hand: a solid beam from the pivot (left end) to the screen
// edge that rotates about the pivot. Returns the element.
export function _clockMakeHand(run, cfg, cx, cy, len) {
    const el = _nkEl(run, 'div', 'sx-nk-clock-hand');
    el.style.width = Math.round(len) + 'px';
    el.style.height = cfg.height + 'px';
    el.style.left = Math.round(cx) + 'px';
    el.style.top = Math.round(cy - cfg.height / 2) + 'px';
    el.style.animation = 'sx-clock-hand-in 0.45s ease-out';

    const beam = document.createElement('div');
    beam.className = 'sx-nk-clock-seg ' + cfg.cls;
    beam.style.width = Math.round(len) + 'px';
    el.appendChild(beam);
    return { el };
}


// Sample points for the damage test, inset a few px toward the sprite
// center - the avatar's visible artwork carries transparent padding, so a
// grazing corner shouldn't register as a hit. Returns the inset box's four
// corners + center for the beam line tests.
export function _clockPlayerPts(pr) {
    const ix = Math.min(CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.width / 2 - 8));
    const iy = Math.min(CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.height / 2 - 8));
    const l = pr.left + ix, r = pr.right - ix, t = pr.top + iy, b = pr.bottom - iy;
    const cx = (l + r) / 2, cy = (t + b) / 2;
    return [[cx, cy], [l, t], [r, t], [l, b], [r, b]];
}


// ── Center-grid call banner (same slot as the low-time / mistakes /
//    low-health warnings). One colored line per summoned hand, each line
//    colored like its beam (red seconds, cyan minutes, amber hours).
export function _clockShowCall(plan) {
    if (typeof _clearCenterGridBanners === 'function') {
        _clearCenterGridBanners('sx-clock-call-banner');
    }
    const banner = document.createElement('div');
    banner.id = 'sx-clock-call-banner';
    banner.className = 'sx-clock-call-banner';
    plan.forEach(p => {
        const line = document.createElement('div');
        line.className = 'sx-nk-clock-call-line ' + p.cfg.callCls;
        line.textContent = _clockUnitLabel(p.cfg, p.value);
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
// threshold - center call, 3s later the beam appears and rotates forever.
// Hands only stop when the run dies with the boss (win or loss).
export function _mechClockHands(monster, phase) {
    if (typeof _nkNewRun !== 'function' || typeof _nkEl !== 'function') return;
    // The face element doubles as the "hands already running" flag - it is
    // removed with the run's elements when the boss dies or the encounter
    // stops, so a fresh fight always starts clean.
    if (document.getElementById('sx-nk-clock-face')) return;

    const bossId = monster && monster.id;
    const run = _nkNewRun(bossId, false);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);

    // Clock face (pivot). The .sx-nk-anchor pulse animates the independent
    // `scale` property, so the inline translate below is preserved.
    const face = _nkEl(run, 'div', 'sx-nk-dot sx-nk-anchor', '🕐');
    face.id = 'sx-nk-clock-face';
    face.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';

    const roster = [CLOCK_HAND_SECONDS, CLOCK_HAND_MINUTES, CLOCK_HAND_HOURS];
    const live = [];     // spawned hands { cfg, a, el, cdUntil }
    const armed = {};    // summonPct → true once the threshold was crossed
    const pending = [];  // hand cfgs waiting for their center call
    let announced = [];  // { cfg, a, value } during the 3s call window
    let freezeFired = false; // once-per-fight latch → Time Freeze never restarts
    let callBanner = null;
    let callLines = [];  // banner line els, index-aligned with `announced`
    let callMsLeft = 0;

    function beginAnnounce() {
        const batch = pending.splice(0);
        if (!batch.length) return;
        // Plan spawn angles in order - each new hand starts ~120° past the
        // previous planned one (or past the last live hand). Because every
        // hand rotates at the SAME speed, those gaps stay open forever.
        // NOTE: the live hands keep rotating during the 3s call window, so
        // these planned angles are advanced frame-by-frame in the loop below
        // (at the same speed, pausing while time is frozen) - otherwise the
        // new hand would spawn at a stale angle and land almost on top of a
        // live hand (up to ~119° of drift in phase 3).
        announced = [];
        let lastAngle = live.length ? live[live.length - 1].a : -Math.PI / 2;
        batch.forEach(cfg => {
            const a = lastAngle + CLOCK_SPAWN_STAGGER_RAD
                + (Math.random() * 2 - 1) * CLOCK_SPAWN_JITTER_RAD;
            lastAngle = a;
            announced.push({ cfg, a, value: _clockValueFromAngle(cfg, a) });
        });
        callMsLeft = CLOCK_SUMMON_WARN_MS;
        callBanner = _clockShowCall(announced);
        callLines = Array.prototype.slice.call(callBanner.children);
        run.els.push(callBanner);
    }

    function spawnAnnounced(now) {
        announced.forEach(p => {
            const made = _clockMakeHand(run, p.cfg, cx, cy, len);
            made.el.style.transform = 'rotate(' + p.a + 'rad)';
            // safeSince = spawn moment → a hand that appears right on top of
            // the player gets the same short grace window before first hit.
            live.push({ cfg: p.cfg, a: p.a, el: made.el, cdUntil: 0, safeSince: now });
            // The mechanic intro toast rides along with the first hand.
            if (p.cfg.fbP === 'seconds') {
                _nkToast('eg_mech_clock', '🕐 The Clock: Clock Hand! Count the rhythm!');
            }
        });
        if (callBanner) { callBanner.remove(); callBanner = null; }
        callLines = [];
        announced = [];
    }

    _nkLoop(run, (dtS, now) => {
        // HP polling - the run's aliveness check already kills it when the
        // boss dies; this lookup only feeds the summon thresholds.
        const m = (typeof _monsters !== 'undefined' && globalThis._monsters)
            ? globalThis._monsters.find(x => x && x.id === bossId) : null;
        const pct = (m && m.maxHP > 0) ? (m.currentHP / m.maxHP) : 1;

        // Arm hands whose HP threshold was crossed (each exactly once).
        roster.forEach(cfg => {
            if (!armed[cfg.summonPct] && pct <= cfg.summonPct) {
                armed[cfg.summonPct] = true;
                pending.push(cfg);
            }
        });
        if (!announced.length && pending.length) beginAnnounce();

        const pr = _nkPlayerRect();
        const pts = pr ? _clockPlayerPts(pr) : null;

        // Time Freeze (≤15% HP): the clock stops - 2.5s telegraph first
        // (hands halt, face flares, callout), then the 30s window while the
        // player races to slay the boss. `freezeFired` latches for this
        // fight, so a FAILED freeze never loops into a fresh one.
        if (!freezeFired && pct <= CLOCK_FREEZE_TRIGGER_PCT) {
            freezeFired = true;
            _clockStartTimeFreezeWarn(m || monster, level);
        }

        // Phase scaling: phase 1 spins at base speed, each further phase
        // +33% (×1.33² ≈ +77% in phase 3) - all hands share it, so their
        // gaps stay fixed.
        const timeStopped = !!window._clockTimeFreezeActive || !!window._clockTimeFreezeWarn;
        const phaseNo = pct <= 0.30 ? 3 : pct <= 0.60 ? 2 : 1;
        const speed = CLOCK_HAND_OMEGA
            * Math.pow(1 + CLOCK_PHASE_SPEED_STEP, phaseNo - 1);

        // 3s call window → the announced hand(s) spawn and start rotating.
        // The live hands keep sweeping during the call, so the planned
        // angles are advanced at the same speed (and frozen with everything
        // else while time is stopped) - otherwise the stagger measured at
        // announce time would collapse by the time the hand spawns. The
        // call banner is refreshed to match, so the dial reading still
        // describes the actual spawn position.
        if (announced.length && !timeStopped) {
            for (let i = 0; i < announced.length; i++) {
                announced[i].a += dtS * speed;
                const v = _clockValueFromAngle(announced[i].cfg, announced[i].a);
                announced[i].value = v;
                if (callLines[i]) callLines[i].textContent = _clockUnitLabel(announced[i].cfg, v);
            }
        }
        if (announced.length) {
            callMsLeft -= dtS * 1000;
            if (callMsLeft <= 0) spawnAnnounced(now);
        }
        for (const h of live) {
            // Frozen hands stand dead still (and stop hurting) during Time Freeze.
            if (timeStopped) continue;
            h.a += dtS * speed;
            h.el.style.transform = 'rotate(' + h.a + 'rad)';
            if (!pts) continue;
            // Spawn grace: a hand that appears right on top of the player
            // gets a short window before its first hit (set at spawn).
            if (now < h.cdUntil || now - h.safeSince < CLOCK_SPAWN_GRACE_MS) continue;
            const bx = cx + Math.cos(h.a) * len, by = cy + Math.sin(h.a) * len;
            for (const pt of pts) {
                if (_ptSegDist(pt[0], pt[1], cx, cy, bx, by) < h.cfg.halfW + CLOCK_HIT_SLACK_PX) {
                    h.cdUntil = now + CLOCK_HIT_CD_MS;
                    const dealt = _nkHit(h.cfg.dmgPct, 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Clock', 'Clock Hand');
                    break;
                }
            }
        }
        return true; // rotate until the boss dies or the encounter stops
    });
}


//------------------------------------------------------------------------
//-------------------TIME FREEZE (15% HP LAST-STAND)----------------------
//------------------------------------------------------------------------
// Below 15% HP The Clock stops time:
//   • a 2.5s telegraph first - the hands halt, the clock face flares and a
//     "TIME FREEZE INCOMING" callout pops (see _clockStartTimeFreezeWarn)
//   • then the 30s freeze: hands stay stopped, the map timer (timerFrozen)
//     and the mistake counter freeze, the avatar cannot move (player_sprite /
//     penalty read the flag) and its auto-attack charge bar stops charging
//     (endgame-encounter.js)
//   • a ring of 12 frozen beams rushes in from all sides of the screen and
//     hovers just short of the player, aimed straight at them
// The player must slay the boss inside the window - and the freeze fires
// EXACTLY ONCE per fight: killing the boss ends it cleanly, and a failed
// freeze never restarts.
// If the freeze expires with the boss still standing - even on a NEW PUZZLE
// when the arena grid was solved mid-freeze (the countdown never resets) -
// every beam lunges through the player: 12 hits ≈ 90% max HP total.
// The freeze lives in its OWN nk run owned by the boss id: it survives
// boss-arena puzzle transitions (the boss is carried to the next grid), is
// killed with the fight when the boss dies (success → no strike) or when
// the encounter stops, and run.onKill always restores the frozen systems so
// the game can never stay frozen.


// Tears down the telegraph state (flag + face glow + center callout). Runs
// as the warn run's onKill and defensively when the real freeze starts/ends.
export function _clockClearFreezeWarn() {
    window._clockTimeFreezeWarn = false;
    const face = document.getElementById('sx-nk-clock-face');
    if (face) face.classList.remove('sx-clock-freeze-warn');
    const banner = document.getElementById('sx-clock-freeze-warn-banner');
    if (banner) banner.remove();
}


// Restores every system the Time Freeze pinned. Idempotent and safe to call
// from onKill AND from the kill loop - the run is only ever killed once.
export function _clockTimeFreezeEnd() {
    if (!window._clockTimeFreezeActive && !window._clockTimeFreezeWarn) return;
    _clockClearFreezeWarn();                       // warn-only? just the telegraph
    if (!window._clockTimeFreezeActive) return;    // nothing else was pinned
    window._clockTimeFreezeActive = false;         // drop the guard BEFORE the
    // release, so endTimerFreeze's Clock-guard sees the hold as ended.
    endTimerFreeze();
}


// Localized helper with {n} placeholder support (English fallback).
export function _clockL10n(key, fallback, n) {
    let msg = fallback;
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    if (n != null && msg.indexOf('{n}') !== -1) msg = msg.replace('{n}', n);
    return msg;
}


// Distance from a point to the viewport edge along a unit direction - the
// beam's outer end sits on that edge, its tip hovers just short of the
// player.
export function _clockRayEdgeDist(px, py, ux, uy) {
    const w = window.innerWidth, h = window.innerHeight;
    let t = Infinity;
    if (ux > 0) t = Math.min(t, (w - px) / ux);
    else if (ux < 0) t = Math.min(t, -px / ux);
    if (uy > 0) t = Math.min(t, (h - py) / uy);
    else if (uy < 0) t = Math.min(t, -py / uy);
    return Math.max(0, t);
}


// Applies the strike: every beam hits once (≈7.5% each, 90% total) and a
// single summed toast reports the whole barrage. Per-beam hits let an
// absorption shield soften only part of the blow.
export function _clockFreezeApplyStrike(level, beams) {
    const count = Math.max(1, (beams && beams.length) || 1);
    let dealt = 0;
    for (let i = 0; i < count; i++) {
        dealt += _nkHit(CLOCK_FREEZE_DMG_PCT / count, 'lightning', level);
    }
    _nkAbilityHitToast(dealt, 'The Clock', 'Time Freeze');
}


// Center-grid telegraph callout - same pop style as the hand-summon calls,
// so the incoming freeze reads instantly without a new visual language.
export function _clockShowFreezeWarnBanner() {
    const banner = document.createElement('div');
    banner.id = 'sx-clock-freeze-warn-banner';
    banner.className = 'sx-clock-freeze-warn-banner';
    const line = document.createElement('div');
    line.className = 'sx-clock-freeze-warn-line';
    line.textContent = _clockL10n('eg_clock_freeze_warn', '⏳ TIME FREEZE INCOMING!');
    banner.appendChild(line);
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
}


// 2.5s telegraph before time stops: the hands halt (the hands loop reads
// the warn flag), the clock face flares gold, a center callout warns the
// player, and a clock sound builds. Then the real Time Freeze begins.
// Own boss-owned nk run so it survives arena transitions and dies with the
// fight.
export function _clockStartTimeFreezeWarn(monster, level) {
    if (typeof _nkNewRun !== 'function' || typeof _nkEl !== 'function') return;
    if (window._clockTimeFreezeWarn || window._clockTimeFreezeActive) return;

    const bossId = (monster && monster.id) || 'boss_clock';
    const lvl = (monster && monster.level) ? monster.level : (level || 1);

    window._clockTimeFreezeWarn = true;

    if (typeof _clearCenterGridBanners === 'function') {
        _clearCenterGridBanners('sx-clock-freeze-warn-banner');
    }
    const face = document.getElementById('sx-nk-clock-face');
    if (face) face.classList.add('sx-clock-freeze-warn');

    _clockShowFreezeWarnBanner();

    _nkToast('eg_mech_clock_freeze_warn',
        '🕐 The Clock: The hands are stopping - get ready!',
        CLOCK_FREEZE_COLOR);
    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('boss_clock_tick', 'clock');

    const run = _nkNewRun(bossId, false);
    run.onKill = _clockClearFreezeWarn;
    let elapsedMs = 0;
    _nkLoop(run, (dtS) => {
        elapsedMs += dtS * 1000;
        if (elapsedMs >= CLOCK_FREEZE_WARN_MS) {
            _clockStartTimeFreeze(monster, lvl);
            return false;   // kill this run → onKill clears the warn state
        }
        return true;
    });
}


// Kicks off the Time Freeze. Single-flight: the global flag is raised before
// any side effect, and the hands loop only ever starts it once per fight.
export function _clockStartTimeFreeze(monster, level) {
    if (typeof _nkNewRun !== 'function' || typeof _nkEl !== 'function') return;
    if (window._clockTimeFreezeActive) return;

    const bossId = (monster && monster.id) || 'boss_clock';
    const lvl = (monster && monster.level) ? monster.level : (level || 1);

    // Freeze the global systems BEFORE any visual lands - one synchronous
    // block, so nothing else (timer tick, mistake penalty, WASD) can fire
    // between the flag and the freeze taking hold. The timer pin goes
    // through the shared timer-freeze mechanic in hold mode: this loop's
    // countdown is pause-aware, so the release must not be a real-time
    // setTimeout (it would tick through Escape-pause and arena
    // transitions); _clockTimeFreezeEnd releases via endTimerFreeze().
    window._clockTimeFreezeActive = true;
    _clockClearFreezeWarn();   // telegraph done - drop its flag, glow, callout
    startTimerFreeze(CLOCK_FREEZE_DURATION_MS, { hold: true, overlay: false });

    // Clear center-grid banners so the frozen arena reads clean.
    if (typeof _clearCenterGridBanners === 'function') {
        _clearCenterGridBanners('sx-clock-freeze-banner');
    }

    // Own run owned by the boss id - boss death / encounter stop tears it
    // down with the fight, and onKill always restores the frozen systems.
    const run = _nkNewRun(bossId, false);
    run.onKill = _clockTimeFreezeEnd;

    // Full-screen cold tint (transparent centre so the grid stays readable).
    _nkEl(run, 'div', 'sx-clock-freeze-tint');

    // Screen-edge frost: ice creeps in from every side while time is stopped
    // and flashes bright the instant the hands strike.
    const frost = _nkEl(run, 'div', 'sx-clock-freeze-frost');
    ['sx-frost-top', 'sx-frost-bottom', 'sx-frost-left', 'sx-frost-right'].forEach(cls => {
        const e = document.createElement('div');
        e.className = 'sx-frost-edge ' + cls;
        frost.appendChild(e);
    });

    // Top-centre countdown banner.
    const banner = document.createElement('div');
    banner.id = 'sx-clock-freeze-banner';
    banner.className = 'sx-clock-freeze-banner';
    banner.style.left = '50%';
    banner.style.top = '14px';
    document.body.appendChild(banner);
    run.els.push(banner);

    // Ring of beams: one from every side, aimed straight at the avatar.
    // The avatar can't move during the freeze (nor across a mid-freeze
    // puzzle transition), so each beam's geometry is computed once and
    // stays correct for the whole window.
    const pc = _nkPlayerCenter()
        || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const beams = [];
    for (let i = 0; i < CLOCK_FREEZE_BEAMS; i++) {
        const ang = (i / CLOCK_FREEZE_BEAMS) * Math.PI * 2 + (Math.random() * 4 - 2) * (Math.PI / 180);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const edge = Math.max(0, _clockRayEdgeDist(pc.x, pc.y, ux, uy) - 6);
        const len = Math.max(40, edge - CLOCK_FREEZE_HOLD_PX);
        const ax = pc.x - ux * edge;   // outer end sits just off the screen edge
        const ay = pc.y - uy * edge;

        const outer = _nkEl(run, 'div', 'sx-nk-clock-freeze-beam');
        outer.style.left = Math.round(ax) + 'px';
        outer.style.top = Math.round(ay - 1) + 'px';   // 2px tall → centre on the ray
        outer.style.width = Math.round(len) + 'px';
        outer.style.transform = 'rotate(' + Math.atan2(uy, ux) + 'rad)';

        const seg = document.createElement('div');
        seg.className = 'sx-nk-clock-freeze-beam-seg';
        seg.style.setProperty('--sx-freeze-strike-scale',
            (1 + (CLOCK_FREEZE_HOLD_PX + CLOCK_FREEZE_LUNGE_PX) / Math.max(40, len)).toFixed(3));
        outer.appendChild(seg);

        beams.push({ el: outer, seg, len });
    }

    // Shrinking countdown ring around the avatar - the remaining freeze time
    // is readable at a glance: the gold arc depletes over the 30s window,
    // the seconds sit in the middle, and it turns red under 5s. Lives on the
    // same fixed centre as the beams, so it follows the player across a
    // mid-freeze puzzle transition too.
    const RING_R = CLOCK_FREEZE_RING_RADIUS;
    const RING_C = 2 * Math.PI * RING_R;
    const ringWrap = _nkEl(run, 'div', 'sx-clock-freeze-ring-wrap');
    ringWrap.style.left = Math.round(pc.x) + 'px';
    ringWrap.style.top = Math.round(pc.y) + 'px';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('class', 'sx-clock-freeze-ring');
    svgEl.setAttribute('viewBox', '0 0 200 200');
    const track = document.createElementNS(svgNS, 'circle');
    track.setAttribute('class', 'sx-clock-freeze-ring-track');
    track.setAttribute('cx', '100'); track.setAttribute('cy', '100'); track.setAttribute('r', String(RING_R));
    track.setAttribute('fill', 'none'); track.setAttribute('stroke-width', '7');
    const arcEl = document.createElementNS(svgNS, 'circle');
    arcEl.setAttribute('class', 'sx-clock-freeze-ring-arc');
    arcEl.setAttribute('cx', '100'); arcEl.setAttribute('cy', '100'); arcEl.setAttribute('r', String(RING_R));
    arcEl.setAttribute('fill', 'none'); arcEl.setAttribute('stroke-width', '7');
    arcEl.setAttribute('stroke-dasharray', String(RING_C));
    arcEl.setAttribute('stroke-dashoffset', '0');
    svgEl.appendChild(track);
    svgEl.appendChild(arcEl);
    ringWrap.appendChild(svgEl);
    const labelEl = document.createElement('div');
    labelEl.className = 'sx-clock-freeze-ring-label';
    ringWrap.appendChild(labelEl);

    _nkToast('eg_mech_clock_freeze',
        '🕐 The Clock: TIME FREEZE! Slay it before the hands strike!',
        CLOCK_FREEZE_COLOR);
    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('time_freeze');

    // Countdown runs on the nk loop's scaled clock (dtS accumulates only
    // ACTIVE time) - it pauses with the game (Escape) and through a
    // mid-freeze arena transition, and it NEVER resets on a new puzzle.
    // If the player dies, the encounter teardown kills this run (onKill
    // restores everything) - no explicit `dead` check needed here, and one
    // would wrongly end the freeze across the grid-solve transition.
    const bannerEl = banner;
    let elapsedMs = 0;
    let struck = false;
    let lastShownSec = -1;

    function renderBanner(secs) {
        bannerEl.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'sx-clock-freeze-banner-title';
        title.textContent = (secs < 0 ? '💥 ' : '⏸️ ')
            + _clockL10n('eg_clock_freeze_title', 'TIME FREEZE');
        bannerEl.appendChild(title);
        const count = document.createElement('div');
        count.className = 'sx-clock-freeze-banner-count';
        count.textContent = (secs < 0)
            ? _clockL10n('eg_clock_freeze_strike', 'THE HANDS STRIKE!')
            : _clockL10n('eg_clock_freeze_count', '{n}s - finish the boss before the hands strike!', String(secs));
        bannerEl.appendChild(count);
        bannerEl.classList.toggle('sx-clock-freeze-banner-urgent', secs >= 0 && secs <= 5);
    }

    renderBanner(Math.ceil(CLOCK_FREEZE_DURATION_MS / 1000));

    _nkLoop(run, (dtS) => {
        elapsedMs += dtS * 1000;

        // Countdown ring: deplete the gold arc with the remaining freeze
        // time and tick the seconds inside it (red + blinking under 5s).
        if (!struck) {
            const frac = Math.max(0, Math.min(1, (CLOCK_FREEZE_DURATION_MS - elapsedMs) / CLOCK_FREEZE_DURATION_MS));
            arcEl.setAttribute('stroke-dashoffset', String(RING_C * (1 - frac)));
            const rem = Math.max(0, Math.ceil((CLOCK_FREEZE_DURATION_MS - elapsedMs) / 1000));
            labelEl.textContent = String(rem);
            ringWrap.classList.toggle('sx-clock-freeze-ring-urgent', rem <= 5);
        }

        // Freeze expired with the boss still standing → every beam lunges.
        if (!struck && elapsedMs >= CLOCK_FREEZE_DURATION_MS) {
            struck = true;
            _clockFreezeApplyStrike(lvl, beams);
            beams.forEach(b => b.seg.classList.add('sx-clock-freeze-strike'));
            frost.classList.add('sx-clock-freeze-frost-strike');
            ringWrap.classList.add('sx-clock-freeze-ring-struck');
            if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('absoluteZero');
            renderBanner(-1);
            return true; // keep looping so the strike animation plays out
        }
        if (struck && elapsedMs >= CLOCK_FREEZE_DURATION_MS + CLOCK_FREEZE_STRIKE_MS) {
            return false; // run dies → onKill restores the frozen systems
        }

        const secs = Math.max(0, Math.ceil((CLOCK_FREEZE_DURATION_MS - elapsedMs) / 1000));
        if (secs !== lastShownSec) {
            lastShownSec = secs;
            renderBanner(secs);
        }
        return true;
    });
}
