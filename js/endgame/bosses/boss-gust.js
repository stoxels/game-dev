//------------------------------------------------------------------------
//-------------------BOSS: THE GUST (boss_gust)---------------------------
//------------------------------------------------------------------------
// Storm-front duel, reworked: the arena has NO lanes. Instead, a whole-
// screen WIND howls across the fight on a fixed cadence — every ~30 s a
// storm front gathers on one (randomized) side, howls for a few seconds,
// and shoves the player toward the opposite wall.
//
// The counterplay is the WINDBREAK: the moment the wind announces itself,
// a wooden wall spawns on the DOWNWIND side at a RANDOM height. Riding the
// gale into the wall's shadow catches the player harmlessly (the wall stops
// the push); miss the catch window and the wind throws you into the edge
// SPIKES, which hit hard on contact and keep grinding damage every second
// while you stay inside them.
//
//   • Wind pushes toward one side; steering against it (holding the
//     opposite direction) weakens the push enough to make progress.
//   • While the wind blows, the auto-attack charge bar is PAUSED —
//     storm time is never free DPS time.
//   • Spikes line both screen edges permanently: contact hit + DoT while
//     inside, on either side.
//   • The boss hovers on the right edge, bobbing vertically, and throws
//     telegraphed wind blades at the player's current row.
//   • HP-gated tornado volleys remain the phase set-pieces (75/50/25%),
//     each entry pre-warned by a pulsing edge line:
//       75% — one tornado from the boss, sweeping left.
//       50% — boss tornado; as it fades, a return tornado from the left.
//       25% — boss tornado, left return, then a tornado diving from the top.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gust: {
        id: 'boss_gust', name: 'The Gust', emoji: '🍃',
        baseHP: 920, baseDamage: 19, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gust: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.75, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.50, chargeMax: 9, damageMultiplier: 1.60 },
            { threshold: 0.25, chargeMax: 7, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
        onInit: _egGustArenaInit,
    },
});


// ── Tuning ──────────────────────────────────────────────────────────────────
// Wind cadence: a storm front rolls in roughly every 30 s (±15% jitter),
// from a randomized side each time.
const EG_GUST_WIND_EVERY_MS = 30000;
const EG_GUST_WIND_WARN_MS = 2200;   // front gathers (screen-edge streaks preview) before the shove
const EG_GUST_WIND_RAMP_MS = 500;    // push strength fades in — a slide, not a shove
const EG_GUST_WIND_DUR = 5200;       // how long the gale blows

// Wind push in px/s — deliberately STRONGER than the avatar's ~320 px/s
// walk. Fighting the gale only trims the current (0.85×) and the walk
// partially offsets it, but the net drift still points downwind (P1:
// 320 − 0.85·530 ≈ −130 px/s), so the player can NEVER outpace the wind:
// holding against it buys ~4–6 s before the spikes still get you.
const EG_GUST_PUSH = [0, 530, 565, 600, 640]; // by boss phase 1–4
// Riding WITH the wind is a sprint; steering AGAINST it only slows the
// shove slightly — the current stays stronger than a full walk.
const EG_GUST_RIDE_MULT = 1.15;
const EG_GUST_RESIST_MULT = 0.85;

// Spike walls: contact hit + damage-over-time while inside (either side).
const EG_GUST_SPIKE_W = 46;
const EG_GUST_SPIKE_HIT = [0, 0.12, 0.13, 0.15, 0.17];  // %maxHP per contact hit
const EG_GUST_SPIKE_DOT = [0, 0.045, 0.05, 0.055, 0.06]; // %maxHP/s while inside
const EG_GUST_SPIKE_CD_MS = 900;

// Windbreak wall: spawns on the downwind edge right next to the spikes.
const EG_GUST_BREAK_W = 26;
const EG_GUST_BREAK_H = 170;
const EG_GUST_BREAK_GAP = 60;      // px between wall and the spike strip
const EG_GUST_BREAK_CATCH = 12;    // px catch margin around the wall box
const EG_GUST_BREAK_FADE_MS = 600; // linger after the wind dies, then vanish

// Wind blades (the boss's direct attack between fronts).
const EG_GUST_BLADE_INTERVAL = [0, 4200, 3400, 2800, 2300]; // ms by phase
const EG_GUST_BLADE_SPEED = 520;     // px/s — crosses the arena in ~2.5 s
const EG_GUST_BLADE_R = 30;          // hit radius
const EG_GUST_BLADE_DMG = [0, 0.09, 0.10, 0.11, 0.13]; // %maxHP per hit
const EG_GUST_BLADE_TELL_MS = 500;   // glint at the boss before launch
const EG_GUST_BLADE_TWIN_P = [0, 0, 0.35, 0.5, 0.65]; // P2+: chance of a second blade on a nearby row

// Tornadoes (HP-gated volleys).
const EG_GUST_TORNADO_SPEED = 300; // px/s horizontal (crosses ~1400px in ~4.5s)
const EG_GUST_TORNADO_R = 44;
const EG_GUST_TORNADO_DMG = 0.18;  // heavy hit %maxHP
const EG_GUST_TORNADO_CD_MS = 900;
const EG_GUST_TORNADO_WARN_MS = 1600; // edge warning line before each entry

// Boss hover.
const EG_GUST_BOSS_X_PAD = 110; // px from the right edge


let _egGustArena = null; // persistent non-dodge run state
let _egGustWindPause = false; // true while a storm front shoves the player


// Read by _egTickPlayer (endgame-encounter.js): freeze the auto-attack bar
// while a storm front is blowing.
function _egGustChargePaused() {
    return !!_egGustWindPause;
}


function _egGustSetChargePause(active) {
    _egGustWindPause = !!active;
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!active);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!active);
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        let lbl = document.getElementById('eg-gust-wind-label');
        if (active) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'eg-gust-wind-label';
                hud.appendChild(lbl);
            }
            lbl.textContent = 'WINDBLOWN';
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!active) {
        const stray = document.getElementById('eg-gust-wind-label');
        if (stray) stray.remove();
    }
}


// Which horizontal direction is the player actively steering?
// Reads the shared held-key set (rebind-aware) with a position-delta
// fallback, so counter-wind play works with any keybinds.
let _egGustLastPX = null;
function _egGustPlayerSteer() {
    let left = false, right = false;
    try {
        const held = (typeof _avatarMoveState !== 'undefined' && _avatarMoveState.held)
            ? _avatarMoveState.held : null;
        if (held && held.size) {
            const lk = (typeof keybindKeyFor === 'function') ? keybindKeyFor('move-left') : 'a';
            const rk = (typeof keybindKeyFor === 'function') ? keybindKeyFor('move-right') : 'd';
            const has = (k) => k != null && held.has(String(k).toLowerCase());
            left = has(lk) || held.has('a') || held.has('arrowleft');
            right = has(rk) || held.has('d') || held.has('arrowright');
        }
    } catch (e) { /* fall through to positional fallback */ }
    if (!left && !right) {
        try {
            const c = (typeof _egNkPlayerCenter === 'function') ? _egNkPlayerCenter() : null;
            if (c && _egGustLastPX != null) {
                const dx = c.x - _egGustLastPX;
                if (dx < -3) left = true;
                else if (dx > 3) right = true;
            }
            if (c) _egGustLastPX = c.x;
        } catch (e) {}
    } else {
        try {
            const c = (typeof _egNkPlayerCenter === 'function') ? _egNkPlayerCenter() : null;
            if (c) _egGustLastPX = c.x;
        } catch (e) {}
    }
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
}


function _egGustPhaseOf(monster) {
    if (monster && monster.bossPhase) return Math.max(1, Math.min(4, monster.bossPhase));
    return 1;
}


function _egGustLiveMonster(monsterId) {
    if (!monsterId || typeof _egMonsters === 'undefined') return null;
    return _egMonsters.find((m) => m && m.id === monsterId) || null;
}


// Localized storm-front announcement ({side} → left/right).
function _egGustWindToast(side) {
    const key = side === 1 ? 'eg_gust_windcoming_l' : 'eg_gust_windcoming_r';
    let msg = side === 1
        ? '🍃 A storm front gathers from the left!'
        : '🍃 A storm front gathers from the right!';
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    if (typeof showToast === 'function') showToast(msg);
}


// Persistent arena entry point (onInit): periodic storm fronts + windbreak
// walls + edge spikes + wind blades + boss hover + HP-gated tornado volleys.
// Non-dodge run on purpose, so the scheduled corrupt_cells mechanic and
// the tornado dodge runs can fire alongside it.
function _egGustArenaInit(monster) {
    if (_egGustArena) return;
    if (typeof _egNkNewRun !== 'function') return;
    const monsterId = monster ? monster.id : null;
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monsterId, false);

    // ── Spike walls (CSS sawtooths draw themselves — no children needed) ──
    const spikeL = _egNkEl(run, 'div', 'eg-nk-gust-spike eg-nk-gust-spike-left');
    const spikeR = _egNkEl(run, 'div', 'eg-nk-gust-spike eg-nk-gust-spike-right');

    // ── Wind overlay: full-screen streak field + drifting debris. The
    //    body classes drive the CSS; the node itself is ALWAYS visible so
    //    the overlay can fade in and out with the wind phase. ──
    const windFx = _egNkEl(run, 'div', 'eg-gust-windfx');
    for (let i = 0; i < 30; i++) {
        const d = document.createElement('i');
        d.style.top = (2 + Math.random() * 96).toFixed(2) + '%';
        d.style.left = (Math.random() * 100).toFixed(2) + '%';
        d.style.animationDelay = (Math.random() * 2.2).toFixed(2) + 's';
        d.style.animationDuration = (0.8 + Math.random() * 1.4).toFixed(2) + 's';
        const w = (8 + Math.random() * 16).toFixed(1);
        d.style.width = w + 'px';
        d.style.height = (2 + Math.random() * 2.5).toFixed(1) + 'px';
        d.style.setProperty('--d-op', (0.4 + Math.random() * 0.5).toFixed(2));
        windFx.appendChild(d);
    }

    _egNkToast('eg_mech_gust', '🍃 The Gust: When the storm howls, break the wind — or be thrown into the spikes!');

    const st = {
        run, monsterId, windFx,
        level,
        elapsed: 0,
        nextWindAt: EG_GUST_WIND_EVERY_MS * (0.5 + Math.random() * 0.25), // first front mid-cycle, not instantly
        wind: null,            // { side, phase: 'warn'|'blow', t, ramp, wallEl, wallDiesAt }
        blades: [],            // { x, y, vx, el, fireAt, hitCdUntil }
        bladeTimer: 3000,      // ms until next blade volley
        spikeCdUntil: 0, spikeHotUntil: 0, spikeWarnAt: 0,
        fired75: false, fired50: false, fired25: false,
    };
    _egGustArena = st;
    run.onKill = () => {
        _egGustSetChargePause(false);
        document.body.classList.remove('eg-gust-wind-from-left', 'eg-gust-wind-from-right');
        if (_egGustArena && _egGustArena.run === run) _egGustArena = null;
    };

    _egNkLoop(run, (dtS, now) => {
        try {
            return _egGustArenaTick(st, dtS, now);
        } catch (e) {
            // A throwing tick would otherwise be silently swallowed by the
            // nk loop (it kills the run without logging). Surface it once,
            // keep the arena alive — one bad frame must not end the fight.
            st.errCount = (st.errCount || 0) + 1;
            if (st.errCount <= 3) {
                try { console.warn('[The Gust] arena tick error:', e); } catch (e2) {}
                window.__gustErr = { msg: e && e.message, stack: e && e.stack };
            }
            return st.errCount < 60; // sustained breakage still ends the run
        }
    });
}


// One arena tick. Split from the rAF wrapper so the wrapper can own error
// visibility (see above).
function _egGustArenaTick(st, dtS, now) {
    const live = _egGustLiveMonster(st.monsterId);
    if (!live) {
        // Grace window: _egMonsters is rebuilt during encounter setup and
        // can briefly not contain the boss — killing the arena on the very
        // first gap left fights running with a dead wind system.
        st.missingSince = st.missingSince || now;
        if (now - st.missingSince > 3000) {
            _egGustSetChargePause(false);
            return false;
        }
        return true;
    }
    st.missingSince = 0;
    st.errCount = 0;
    const p = _egGustPhaseOf(live);
        const lvl = live.level || st.level || 1;
        st.elapsed += dtS * 1000;
        const W = window.innerWidth, H = window.innerHeight;

        // The Gust has no body on screen: the boss IS the storm. Wind
        // blades and tornadoes launch from the right edge at mid-height.
        st.bossX = W - EG_GUST_BOSS_X_PAD;
        st.bossY = H * 0.5;

        // ── Storm-front scheduler: warn → blow → off, every ~30 s ──
        let inWind = false;
        if (!st.wind && st.elapsed >= st.nextWindAt) {
            // Front announces itself from a randomized side.
            const side = Math.random() < 0.5 ? 1 : -1; // 1 = blows left→right
            _egGustWindStart(st, side, now);
        }
        if (st.wind) {
            const wind = st.wind;
            wind.t += dtS * 1000;
            if (wind.phase === 'warn' && wind.t >= EG_GUST_WIND_WARN_MS) {
                wind.phase = 'blow';
                wind.t = 0;
                wind.ramp = 0;
                // Wooden windbreak spawns on the DOWNWIND edge at a random
                // height — finding the catch spot is the player's job.
                const gap = EG_GUST_SPIKE_W + EG_GUST_BREAK_GAP;
                const wallY = Math.max(90, Math.min(H - 90 - EG_GUST_BREAK_H,
                    H * (0.28 + Math.random() * 0.44)));
                const wallEl = _egNkEl(st.run, 'div', 'eg-gust-break ' +
                    (wind.side === 1 ? 'eg-gust-break-right' : 'eg-gust-break-left'));
                wallEl.style.top = Math.round(wallY) + 'px';
                wallEl.style.height = EG_GUST_BREAK_H + 'px';
                wind.wallEl = wallEl;
                wind.wallDiesAt = Infinity;
            } else if (wind.phase === 'blow') {
                wind.ramp = Math.min(1, wind.ramp + dtS * 1000 / EG_GUST_WIND_RAMP_MS);
                inWind = true;
                if (wind.t >= EG_GUST_WIND_DUR) {
                    // Gale dies down: release the push, fade the wall out.
                    wind.phase = 'off';
                    inWind = false;
                    wind.wallDiesAt = now + EG_GUST_BREAK_FADE_MS;
                    if (wind.wallEl) wind.wallEl.classList.add('eg-gust-break-out');
                    document.body.classList.remove('eg-gust-wind-from-left', 'eg-gust-wind-from-right');
                    st.nextWindAt = st.elapsed + EG_GUST_WIND_EVERY_MS * (0.85 + Math.random() * 0.3);
                }
            } else if (wind.phase === 'off') {
                if (wind.wallEl && now >= wind.wallDiesAt) {
                    try { wind.wallEl.remove(); } catch (e) {}
                    wind.wallEl = null;
                }
                if (now >= (wind.wallDiesAt || 0)) st.wind = null;
            }
        }

        // ── Wind push: ride with it, fight against it ──
        const pr = _egNkPlayerRect();
        if (inWind && pr && st.wind && st.wind.phase === 'blow') {
            const wind = st.wind;
            const steer = _egGustPlayerSteer();
            let push = (EG_GUST_PUSH[p] || EG_GUST_PUSH[1]) * (wind.ramp || 0);
            if ((wind.side === 1 && steer === -1) || (wind.side === -1 && steer === 1)) {
                push *= EG_GUST_RESIST_MULT; // holding against the gale
            } else if (steer === wind.side) {
                push *= EG_GUST_RIDE_MULT; // sprinting downwind
            }
            if (push > 1) _egNkNudgeAvatar(wind.side * push * dtS, 0);
        }
        if (inWind !== !!_egGustWindPause) _egGustSetChargePause(inWind);

        // ── Windbreak catch: the wall stops the shove in its shadow ──
        if (st.wind && st.wind.wallEl && st.wind.phase === 'blow' && pr) {
            const wl = st.wind.wallEl.getBoundingClientRect();
            const m = EG_GUST_BREAK_CATCH;
            const overlapX = pr.left < wl.right + m && pr.right > wl.left - m;
            const overlapY = pr.top < wl.bottom + m && pr.bottom > wl.top - m;
            if (overlapX && overlapY) {
                // Clamp the player flush against the wall's windward face.
                if (st.wind.side === 1 && pr.right > wl.left) {
                    _egNkNudgeAvatar(wl.left - pr.right, 0); // pushed right → wall's left face
                } else if (st.wind.side === -1 && pr.left < wl.right) {
                    _egNkNudgeAvatar(wl.right - pr.left, 0); // pushed left → wall's right face
                }
            }
        }

        // ── Spikes: heavy contact hit + DoT while inside (either side) ──
        if (pr) {
            const inSpikes = pr.left < EG_GUST_SPIKE_W || pr.right > W - EG_GUST_SPIKE_W;
            if (inSpikes) {
                const side = pr.left < EG_GUST_SPIKE_W ? 'l' : 'r';
                if (now >= st.spikeCdUntil) {
                    st.spikeCdUntil = now + EG_GUST_SPIKE_CD_MS;
                    const dealt = _egNkHit(EG_GUST_SPIKE_HIT[p] || 0.12, 'cold', lvl);
                    _egNkAbilityHitToast(dealt, 'The Gust', side === 'l' ? 'Left Spikes' : 'Right Spikes');
                    st.spikeHotUntil = now + 500;
                    document.body.classList.add(side === 'l' ? 'eg-gust-spike-hot-l' : 'eg-gust-spike-hot-r');
                }
                // Grind damage every moment spent inside the thorns.
                _egNkDotTick(st.run, EG_GUST_SPIKE_DOT[p] || 0.045, dtS, lvl, 'cold');
                st.spikeHotUntil = Math.max(st.spikeHotUntil, now + 250);
                if (now - st.spikeWarnAt > 3000) {
                    st.spikeWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Out of the spikes!', '#f87171');
                }
            } else if (st.spikeHotUntil && now >= st.spikeHotUntil) {
                document.body.classList.remove('eg-gust-spike-hot-l', 'eg-gust-spike-hot-r');
                st.spikeHotUntil = 0;
            }
        }

        // ── Wind blades: telegraphed glint, then a fast crescent at the player's row ──
        st.bladeTimer -= dtS * 1000;
        if (st.bladeTimer <= 0) {
            st.bladeTimer = (EG_GUST_BLADE_INTERVAL[p] || 4200) * (0.85 + Math.random() * 0.3);
            const pc = _egNkPlayerCenter();
            const rows = [H * 0.24, H * 0.38, H * 0.52, H * 0.66, H * 0.80];
            // Aim at the row nearest the player; fall back to a random row.
            let aimY = rows[2];
            if (pc) {
                let bestD = Infinity;
                rows.forEach(ry => { const d = Math.abs(ry - pc.y); if (d < bestD) { bestD = d; aimY = ry; } });
            }
            _egGustBlade(st, aimY);
            // P2+: often a second blade on an adjacent row — dodge by row-hopping.
            if (p >= 2 && Math.random() < (EG_GUST_BLADE_TWIN_P[p] || 0)) {
                const others = rows.filter(ry => Math.abs(ry - aimY) > 90);
                if (others.length) _egGustBlade(st, others[Math.floor(Math.random() * others.length)]);
            }
        }
        for (let i = st.blades.length - 1; i >= 0; i--) {
            const b = st.blades[i];
            if (b.el.classList.contains('eg-gust-blade-tell')) {
                if (now >= b.fireAt) {
                    b.el.classList.remove('eg-gust-blade-tell');
                    b.el.classList.add(b.vx < 0 ? 'eg-gust-blade-left' : 'eg-gust-blade-right');
                }
            } else {
                b.x += b.vx * dtS;
                b.el.style.transform = 'translate(' + Math.round(b.x - EG_GUST_BLADE_R) + 'px,' + Math.round(b.y - EG_GUST_BLADE_R) + 'px)';
                if (pr && now >= b.hitCdUntil && _egNkCircleHit(b.x, b.y, EG_GUST_BLADE_R, pr, 0)) {
                    b.hitCdUntil = now + 800;
                    const dealt = _egNkHit(EG_GUST_BLADE_DMG[p] || 0.09, 'cold', lvl);
                    _egNkAbilityHitToast(dealt, 'The Gust', 'Wind Blade');
                }
                if (b.x < -60 || b.x > W + 60) {
                    try { b.el.remove(); } catch (e) {}
                    st.blades.splice(i, 1);
                }
            }
        }

        // ── HP-gated tornado volleys (fired once each, with edge warnings) ──
        const hpPct = (live.maxHP > 0) ? (live.currentHP / live.maxHP) : 1;
        if (!st.fired75 && hpPct <= 0.75) {
            st.fired75 = true;
            _egGustFireVolley(st.monsterId, 1, lvl, st.bossX, st.bossY);
        } else if (!st.fired50 && hpPct <= 0.50) {
            st.fired50 = true;
            _egGustFireVolley(st.monsterId, 2, lvl, st.bossX, st.bossY);
        } else if (!st.fired25 && hpPct <= 0.25) {
            st.fired25 = true;
            _egGustFireVolley(st.monsterId, 3, lvl, st.bossX, st.bossY);
        }

    return true; // persistent until the boss dies
}


// Announces a storm front: side streaks light up (CSS body class), then the
// gale starts shoving. The wall itself spawns when the blow begins.
function _egGustWindStart(st, side, now) {
    st.wind = { side, phase: 'warn', t: 0, ramp: 0, wallEl: null, wallDiesAt: Infinity };
    document.body.classList.add(side === 1 ? 'eg-gust-wind-from-left' : 'eg-gust-wind-from-right');
    _egGustWindToast(side);
}


// Spawns a wind blade: 0.5 s glint at the boss's mouth, then flight.
function _egGustBlade(st, y) {
    const el = _egNkEl(st.run, 'div', 'eg-nk-gust-blade');
    el.classList.add('eg-gust-blade-tell');
    el.style.transform = 'translate(' + Math.round(st.bossX - EG_GUST_BLADE_R) + 'px,' + Math.round(y - EG_GUST_BLADE_R) + 'px)';
    st.blades.push({
        x: st.bossX, y, vx: -EG_GUST_BLADE_SPEED,
        el, fireAt: performance.now() + EG_GUST_BLADE_TELL_MS, hitCdUntil: 0,
    });
}


// Fires a tornado volley as its own dodge run:
//   stage 1 — boss tornado sweeping left.
//   stage 2 — boss tornado, then a return tornado from the left wall.
//   stage 3 — boss tornado, left-wall return, then a top-down tornado.
// Every entry is pre-warned by a pulsing edge line so the choreography is
// readable before the tornado is even on screen.
function _egGustFireVolley(monsterId, stage, level, bossX, bossY) {
    if (typeof _egNkNewRun !== 'function') return;
    const run = _egNkNewRun(monsterId, true);
    const lvl = Math.max(1, Math.round(level || 1));
    const W = window.innerWidth, H = window.innerHeight;
    const sx = (bossX != null && isFinite(bossX)) ? bossX - 70 : W - EG_GUST_BOSS_X_PAD - 70;
    const sy0 = (bossY != null && isFinite(bossY)) ? bossY : H * 0.5;

    const label = stage >= 3 ? '🌪️ The Gust: TRIPLE Tornado!' : (stage === 2 ? '🌪️ The Gust: Twin Tornado!' : '🌪️ The Gust: Tornado!');
    _egNkToast('eg_mech_gust_tornado', label);

    const mk = (x, y) => {
        const el = _egNkEl(run, 'div', 'eg-nk-gust-tornado');
        el.appendChild(document.createElement('i'));
        el.appendChild(document.createElement('i'));
        el.appendChild(document.createElement('i'));
        return { x, y, el, hitCdUntil: 0 };
    };

    // Queue of spawn steps; each step waits for the previous tornado to
    // leave the screen so the volley reads as a sequence, not a pile-up.
    const steps = [{ x: sx, y: sy0, vx: -EG_GUST_TORNADO_SPEED, vy: 0 }];
    if (stage >= 2) steps.push({ x: -60, y: sy0, vx: EG_GUST_TORNADO_SPEED, vy: 0, fromLeft: true });
    if (stage >= 3) {
        const tx = Math.max(80, Math.min(W - 80, (window.innerWidth / 2) + (Math.random() - 0.5) * 240));
        steps.push({ x: tx, y: -60, vx: 0, vy: EG_GUST_TORNADO_SPEED * 0.9, fromTop: true });
    }

    let active = null, stepIdx = -1, warnEl = null;
    const clearWarn = () => { if (warnEl) { try { warnEl.remove(); } catch (e) {} warnEl = null; } };
    const spawnStep = (i) => {
        const s = steps[i];
        stepIdx = i;
        // Left-wall / top returns reuse the live viewport so a resize or
        // scroll mid-volley still enters from the visible edge.
        let x = s.x, y = s.y;
        if (s.fromLeft) { x = -60; y = Math.max(90, Math.min(window.innerHeight - 90, active ? active.y : sy0)); }
        if (s.fromTop) { x = Math.max(80, Math.min(window.innerWidth - 80, x)); y = -60; }
        // Edge warning line first: 1.6 s of pulsing telegraph, then the
        // tornado. The direction class drives animated stripes that show
        // which way the funnel will sweep.
        const dirCls = s.fromTop ? ' eg-gust-warn-down'
            : (s.vx < 0 ? ' eg-gust-warn-left' : ' eg-gust-warn-right');
        warnEl = _egNkEl(run, 'div', 'eg-gust-warn' + (s.fromTop ? ' eg-gust-warn-v' : ' eg-gust-warn-h') + dirCls);
        if (s.fromTop) warnEl.style.left = Math.round(x) + 'px';
        else warnEl.style.top = Math.round(y) + 'px';
        active = null;
        setTimeout(() => {
            if (!_egNkRuns.has(run.id)) return;
            clearWarn();
            active = mk(x, y);
            active.vx = s.vx;
            active.vy = s.vy;
            active.el.style.transform = 'translate(' + Math.round(active.x - EG_GUST_TORNADO_R) + 'px,' + Math.round(active.y - EG_GUST_TORNADO_R) + 'px)';
        }, EG_GUST_TORNADO_WARN_MS);
    };
    spawnStep(0);

    _egNkLoop(run, (dtS, now) => {
        if (!active) return true; // still telegraphing
        active.x += (active.vx || 0) * dtS;
        active.y += (active.vy || 0) * dtS;
        active.el.style.transform = 'translate(' + Math.round(active.x - EG_GUST_TORNADO_R) + 'px,' + Math.round(active.y - EG_GUST_TORNADO_R) + 'px)';

        const pr = _egNkPlayerRect();
        if (pr && now >= active.hitCdUntil && _egNkCircleHit(active.x, active.y, EG_GUST_TORNADO_R, pr, 0)) {
            active.hitCdUntil = now + EG_GUST_TORNADO_CD_MS;
            const dealt = _egNkHit(EG_GUST_TORNADO_DMG, 'cold', lvl);
            _egNkAbilityHitToast(dealt, 'The Gust', 'Tornado');
        }

        const W2 = window.innerWidth, H2 = window.innerHeight;
        const out = active.x < -90 || active.x > W2 + 90 || active.y < -110 || active.y > H2 + 110;
        if (out) {
            try { active.el.remove(); } catch (e) {}
            if (stepIdx + 1 < steps.length) {
                spawnStep(stepIdx + 1);
                return true;
            }
            return false;
        }
        return true;
    });
}


// Defensive teardown for encounter stop / boss death ordering edge cases.
// The arena run's onKill already clears the charge pause; this covers paths
// where the run map was cleared first.
function _egGustTeardown() {
    try { _egGustSetChargePause(false); } catch (e) { _egGustWindPause = false; }
    document.body.classList.remove('eg-gust-wind-from-left', 'eg-gust-wind-from-right',
        'eg-gust-spike-hot-l', 'eg-gust-spike-hot-r');
    _egGustArena = null;
    _egGustLastPX = null;
}
