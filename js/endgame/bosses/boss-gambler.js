//------------------------------------------------------------------------
//-------------------BOSS: THE GAMBLER (boss_gambler)---------------------
//------------------------------------------------------------------------
// A rework of the old one-shot Loaded Dice into a persistent casino siege.
// The Gambler runs the table and the table is the arena. Fight identity:
// RISK — every mechanic offers a visible payout or a visible price.
//
//   PERSISTENT (whole fight, watcher):
//   • THE HOUSE CHIPS — the boss's arena body: a stack of 4 glowing casino
//     chips that drifts around the table. Touching it is a Croupier Slam:
//     animated fling + shadow damage.
//   • CHIP VOLLEY — the chips periodically fan out and whip at you like
//     thrown playing cards (fast small shadow hits, phase-scaled count).
//
//   60% GATE — WHEEL OF FORTUNE: a giant prize wheel spins center-screen
//   for ~4s (visibly ticking through wedges). Where it stops, everyone
//   pays — one of: SNAKE EYES (heavy hit + double volley), FREE SPIN
//   (the wheel fires again immediately), JACKPOT (the Gambler heals 12%),
//   or YOU WIN (you heal 10% — the one good wedge). The wheel result is
//   broadcast with a big toast; the gamble is real.
//
//   30% GATE — JACKPOT RUSH: slot symbols rain across the table in waves
//   (🍒🔔🍋7️⃣); matching 7️⃣s detonate in expanding coin bursts. Pure
//   dodge pressure, phase-scaled.
//
//   CHARGE ATTACK — RUSSIAN ROULETTE: a 6-chamber cylinder overlays your
//   position; chambers tick down visibly (1.8s total). When the hammer
//   falls, 5 of 6 chambers are blanks — a visible shell lands harmless —
//   but the loaded chamber deal a heavy shadow hit. Pure odds, fully
//   telegraphed; move out of the mark before the click.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string. Damage flows through the shared tier curve.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gambler: {
        id: 'boss_gambler', name: 'The Gambler', emoji: '🎲',
        baseHP: 960, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gambler: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility — the persistent watcher now
            // owns the chip volley; the handler no-ops (same shim pattern
            // as the other reworked bosses).
            { name: 'loaded_dice', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechLoadedDice' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
        onInit: _egGamblerArenaInit,
    },
});


// ── Casino tuning ────────────────────────────────────────────────────────
// The House Chips (boss body)
const EG_GMB_CHIP_R = 42;                    // chip-stack visual radius
const EG_GMB_DRIFT_SPEED = [0, 28, 38, 50];  // px/s per phase
const EG_GMB_DRIFT_REPICK_MS = 6000;
const EG_GMB_SLAM_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the stack
const EG_GMB_SLAM_CD_MS = 1000;
const EG_GMB_SLAM_FLING = [0, 125, 150, 175];
// Chip volley
const EG_GMB_VOLLEY_N = [0, 3, 4, 6];        // chips per volley per phase
const EG_GMB_VOLLEY_MS = [0, 6800, 5400, 4200]; // volley cadence
const EG_GMB_CHIP_SPEED = 300;               // px/s
const EG_GMB_CHIP_DMG = 0.05;                // %maxHP per chip (shadow)
// Wheel of Fortune (60% gate)
const EG_GMB_WHEEL_SPIN_MS = 4000;           // visible spin duration
const EG_GMB_WHEEL_SNAKE_DMG = 0.16;         // snake eyes hit
const EG_GMB_WHEEL_HEAL_BOSS = 0.12;         // jackpot: boss heals 12%
const EG_GMB_WHEEL_HEAL_PLAYER = 0.10;       // you win: heal 10% maxHP
// Jackpot Rush (30% gate)
const EG_GMB_RUSH_WAVES = 4;
const EG_GMB_RUSH_PER_WAVE = [0, 6, 8, 10];
const EG_GMB_RUSH_WAVE_GAP_MS = 1700;
const EG_GMB_SYMBOL_SPEED = 240;
const EG_GMB_SYMBOL_DMG = 0.06;              // %maxHP per symbol
const EG_GMB_SEVEN_BURST_DMG = 0.11;         // %maxHP in a 7 blast
const EG_GMB_SEVEN_BURST_R = 150;
const EG_GMB_RUSH_MS = 8200;
// Russian Roulette (charge attack)
const EG_GMB_RR_MARK_MS = 1800;              // cylinder telegraph
const EG_GMB_RR_DMG = [0, 0.18, 0.21, 0.25]; // loaded chamber
const EG_GMB_RR_R = 110;                     // mark radius


let _egGamblerWatcher = null; // per-fight casino state

// Phase lookup helper — resolves the boss's current phase (default 1).
function _egGmbPhase(st) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Flat player heal (% of maxHP) — same inline pattern as the hearts.
function _egGmbHealPct(pct) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (playerCurrentHP <= 0) return;
        const heal = Math.round(_egNkMaxHP() * pct);
        const before = playerCurrentHP;
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
        if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    } catch (e) {}
}

// Boss heal (absolute % of its max).
function _egGmbHealBoss(monster, pct) {
    try {
        if (!monster || !monster.maxHP) return;
        monster.currentHP = Math.min(monster.maxHP, monster.currentHP + Math.round(monster.maxHP * pct));
        if (typeof _renderPlayerHealth === 'function') { try { _egRenderPanel && _egRenderPanel(); } catch (e) {} }
    } catch (e) {}
}

// Removes every casino overlay (registered in boss-framework teardown).
function _egGamblerTeardown() {
    if (_egGamblerWatcher) {
        const st = _egGamblerWatcher;
        _egGamblerWatcher = null;
        (st.cards || []).forEach(cd => { try { if (cd.el) cd.el.remove(); } catch (e) {} });
        (st.symbols || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        (st.bursts || []).forEach(b => { try { if (b.el) b.el.remove(); } catch (e) {} });
        if (st.wheel) { try { if (st.wheel.el) st.wheel.el.remove(); } catch (e) {} }
        if (st.rr) { try { if (st.rr.el) st.rr.el.remove(); } catch (e) {} try { if (st.rr.shellEl) st.rr.shellEl.remove(); } catch (e) {} }
        try { if (st.run) _egNkKillRun(st.run); } catch (e) {} // removes chips
    }
    document.querySelectorAll('.eg-gmb-chips, .eg-gmb-card, .eg-gmb-wheel, .eg-gmb-wheel-result, .eg-gmb-symbol, .eg-gmb-burst, .eg-gmb-rr, .eg-gmb-shell').forEach(el => el.remove());
}


// ── Persistent arena: the chip stack + chip volleys ─────────────────────
function _egGamblerArenaInit(monster) {
    if (_egGamblerWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        chips: null,
        cards: [], volleyAcc: 0,
        wheel: null,
        symbols: [], bursts: [], rush: null,
        rr: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egGamblerWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_egGamblerWatcher === st) _egGamblerWatcher = null; };
    st.run = run;

    // The House Chips: the boss's arena body.
    const el = _egNkEl(run, 'div', 'eg-gmb-chips', '🎰');
    el.style.width = el.style.height = (EG_GMB_CHIP_R * 2) + 'px';
    st.chips = {
        x: window.innerWidth / 2, y: window.innerHeight * 0.3,
        tx: window.innerWidth / 2, ty: window.innerHeight * 0.3,
        repickAt: EG_GMB_DRIFT_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.chips.x - EG_GMB_CHIP_R) + 'px,' + Math.round(st.chips.y - EG_GMB_CHIP_R) + 'px)';

    if (monster) st.everLive = true;

    _egNkLoop(run, (dtS, now) => {
        if (_egGamblerWatcher !== st) return false;
        const live = _egMonsters ? _egMonsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egGamblerWheel(st, live); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egGamblerRush(st, now); }

        // ── The House Chips: drift + Croupier Slam on touch ──
        const ch = st.chips;
        ch.repickAt -= dtS * 1000;
        const cdx = ch.tx - ch.x, cdy = ch.ty - ch.y;
        const cd = Math.hypot(cdx, cdy) || 1;
        const cstep = EG_GMB_DRIFT_SPEED[p] * dtS;
        if (cd <= cstep || ch.repickAt <= 0) {
            ch.tx = 90 + Math.random() * Math.max(60, W - 180);
            ch.ty = 90 + Math.random() * Math.max(60, H - 200);
            ch.repickAt = EG_GMB_DRIFT_REPICK_MS;
        } else {
            ch.x += (cdx / cd) * cstep;
            ch.y += (cdy / cd) * cstep;
        }
        ch.el.style.transform = 'translate(' + Math.round(ch.x - EG_GMB_CHIP_R) + 'px,' + Math.round(ch.y - EG_GMB_CHIP_R) + 'px)';
        if (c && pr && now >= ch.cdUntil && _egNkCircleHit(ch.x, ch.y, EG_GMB_CHIP_R * 0.85, pr, 0)) {
            ch.cdUntil = now + EG_GMB_SLAM_CD_MS;
            const dx = c.x - ch.x, dy = c.y - ch.y;
            const d = Math.hypot(dx, dy) || 1;
            // Animated fling (contact at the stack): glide + tumble + burst.
            _egNkFlingAvatar((dx / d) * EG_GMB_SLAM_FLING[p], (dy / d) * EG_GMB_SLAM_FLING[p], ch.x, ch.y);
            const dealt = _egNkHit(EG_GMB_SLAM_DMG[p], 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Gambler', 'Croupier Slam');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e2) {}
        }

        // ── Chip volley: cards whip from the stack at the player ──
        st.volleyAcc += dtS * 1000;
        if (st.cards.length < EG_GMB_VOLLEY_N[p] && st.volleyAcc >= EG_GMB_VOLLEY_MS[p]) {
            st.volleyAcc = 0;
            _egGamblerThrowCard(st, p);
        }
        _egGamblerTickCards(st, dtS, pr);

        // ── Wheel of Fortune (60% gate state machine) ──
        if (st.wheel) {
            const wl = st.wheel;
            wl.t += dtS * 1000;
            // Visibly tick through wedges while spinning.
            if (wl.phase === 'spin' && wl.t < EG_GMB_WHEEL_SPIN_MS) {
                const wedge = Math.floor(wl.t / 220) % 4;
                if (wedge !== wl.wedge) {
                    wl.wedge = wedge;
                    wl.el.textContent = EG_GMB_WHEEL_FACES[wedge];
                }
            }
            if (wl.phase === 'spin' && wl.t >= EG_GMB_WHEEL_SPIN_MS) {
                wl.phase = 'result';
                _egGamblerWheelResolve(st, wl, live);
            }
            if (wl.phase === 'result' && wl.t >= EG_GMB_WHEEL_SPIN_MS + 1400) {
                try { wl.el.remove(); } catch (e) {}
                try { if (wl.resultEl) wl.resultEl.remove(); } catch (e) {}
                st.wheel = null;
            }
        }

        // ── Jackpot Rush (30% gate) ──
        _egGamblerTickRush(st, dtS, pr, p);
        _egGamblerTickSymbols(st, dtS, pr);
        _egGamblerTickBursts(st, dtS);

        // ── Russian Roulette (charge attack state machine) ──
        if (st.rr) {
            const rr = st.rr;
            rr.t += dtS * 1000;
            const k = rr.t / EG_GMB_RR_MARK_MS;
            if (k < 1) {
                // Tick the cylinder display down as the hammer cocks.
                const chamber = Math.max(0, 6 - Math.floor(k * 6));
                if (chamber !== rr.chamber) {
                    rr.chamber = chamber;
                    rr.el.textContent = '🔫' + '⚪'.repeat(Math.max(0, chamber));
                }
            } else {
                // Hammer falls: the mark detonates (5/6 odds it's a blank —
                // rolled here; both outcomes are broadcast).
                const loaded = Math.random() < (1 / 6);
                try { rr.el.remove(); } catch (e) {}
                rr.el = null;
                if (loaded) {
                    const pr2 = _egNkPlayerRect();
                    if (pr2 && _egNkCircleHit(rr.x, rr.y, EG_GMB_RR_R, pr2, 0)) {
                        const dealt = _egNkHit(EG_GMB_RR_DMG[rr.p], 'shadow', st.level);
                        _egNkAbilityHitToast(dealt, 'The Gambler', 'Russian Roulette');
                    } else {
                        _egNkToast('eg_gmb_blank', '🔘 CLICK — the chamber was loaded, but you stepped out!', '#4ade80');
                    }
                } else {
                    _egNkToast('eg_gmb_blank', '🔘 CLICK — blank. This time.', '#4ade80');
                    _egGamblerShellPop(st, rr.x, rr.y);
                }
                st.rr = null;
            }
        }

        return true;
    });
}


// ── Chip volley: one thrown card from the stack toward the player ────────
function _egGamblerThrowCard(st, p) {
    const ch = st.chips;
    const c = _egNkPlayerCenter();
    const tx = c ? c.x : window.innerWidth / 2;
    const ty = c ? c.y : window.innerHeight / 2;
    const el = _egNkEl(st.run, 'div', 'eg-gmb-card', ['🂡', '🂱', '🃁', '🃑'][Math.floor(Math.random() * 4)]);
    const dx = tx - ch.x, dy = ty - ch.y;
    const d = Math.hypot(dx, dy) || 1;
    const card = {
        x: ch.x, y: ch.y,
        vx: (dx / d) * EG_GMB_CHIP_SPEED * (0.85 + Math.random() * 0.3),
        vy: (dy / d) * EG_GMB_CHIP_SPEED * (0.85 + Math.random() * 0.3),
        t: 0, hit: false, el,
    };
    st.cards.push(card);
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e) {}
}


// Advances cards: fly, hit, expire.
function _egGamblerTickCards(st, dtS, pr) {
    for (let i = st.cards.length - 1; i >= 0; i--) {
        const cd = st.cards[i];
        cd.t += dtS * 1000;
        cd.x += cd.vx * dtS;
        cd.y += cd.vy * dtS;
        cd.el.style.transform = 'translate(' + Math.round(cd.x - 16) + 'px,' + Math.round(cd.y - 16) + 'px) rotate(' + Math.round(cd.t / 40) + 'deg)';
        if (pr && !cd.hit && _egNkCircleHit(cd.x, cd.y, 20, pr, 0)) {
            cd.hit = true;
            const dealt = _egNkHit(EG_GMB_CHIP_DMG, 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Gambler', 'Card');
            try { cd.el.remove(); } catch (e) {}
            st.cards.splice(i, 1);
            continue;
        }
        if (cd.t > 5200 || cd.x < -60 || cd.x > window.innerWidth + 60 || cd.y < -60 || cd.y > window.innerHeight + 60) {
            try { cd.el.remove(); } catch (e) {}
            st.cards.splice(i, 1);
        }
    }
}


// ── 60% gate: Wheel of Fortune ───────────────────────────────────────────
// A giant prize wheel spins center-screen, visibly ticking wedges, then
// lands on one of four outcomes — including one that helps the player.
const EG_GMB_WHEEL_FACES = ['🍒', '7️⃣', '💎', '🎲'];
const EG_GMB_WHEEL_KEYS = ['snake', 'free', 'jackpot', 'win'];

function _egGamblerWheel(st, live) {
    if (st.wheel) return;
    const W = window.innerWidth, H = window.innerHeight;
    const el = _egNkEl(st.run, 'div', 'eg-gmb-wheel', '🎲');
    el.style.left = Math.round(W / 2 - 80) + 'px';
    el.style.top = Math.round(H * 0.38 - 80) + 'px';
    st.wheel = { phase: 'spin', t: 0, wedge: -1, el, resultEl: null, live };
    _egNkToast('eg_gmb_wheel', '🎡 WHEEL OF FORTUNE! Where it lands, everyone pays!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e) {}
}


// Resolves the landed wedge. FREE SPIN immediately re-spins once.
function _egGamblerWheelResolve(st, wl, live) {
    let key = EG_GMB_WHEEL_KEYS[Math.floor(Math.random() * 4)];
    if (key === 'free' && wl.respun) key = 'snake'; // free spin only once
    const face = EG_GMB_WHEEL_FACES[EG_GMB_WHEEL_KEYS.indexOf(key)];
    wl.el.textContent = face;
    wl.el.classList.add('landed');
    const resultEl = _egNkEl(st.run, 'div', 'eg-gmb-wheel-result');
    resultEl.style.left = window.innerWidth / 2 + 'px';
    resultEl.style.top = Math.round(window.innerHeight * 0.38 + 130) + 'px';
    wl.resultEl = resultEl;
    const p = _egGmbPhase(st);
    if (key === 'snake') {
        resultEl.textContent = '🐍 SNAKE EYES!';
        // Heavy hit on the player wherever they stand + a double card volley.
        const pr = _egNkPlayerRect();
        if (pr) {
            const dealt = _egNkHit(EG_GMB_WHEEL_SNAKE_DMG, 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Gambler', 'Snake Eyes');
        }
        for (let i = 0; i < EG_GMB_VOLLEY_N[p]; i++) _egGamblerThrowCard(st, p);
    } else if (key === 'free') {
        resultEl.textContent = '🔄 FREE SPIN!';
        wl.respun = true;
        wl.phase = 'spin';
        wl.t = EG_GMB_WHEEL_SPIN_MS * 0.15; // short re-spin, still visible
        wl.el.classList.remove('landed');
        return;
    } else if (key === 'jackpot') {
        resultEl.textContent = '💰 JACKPOT — THE HOUSE WINS!';
        _egGmbHealBoss(live, EG_GMB_WHEEL_HEAL_BOSS);
    } else {
        resultEl.textContent = '⭐ YOU WIN!';
        _egGmbHealPct(EG_GMB_WHEEL_HEAL_PLAYER);
    }
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e) {}
}


// ── 30% gate: Jackpot Rush ───────────────────────────────────────────────
// Slot symbols rain across the table in waves; 7️⃣ symbols detonate in
// expanding coin bursts when they expire.
function _egGamblerRush(st, now) {
    if (st.rush) return;
    st.rush = { wave: 0, t: 0 };
    _egNkToast('eg_gmb_rush', '🎰 JACKPOT RUSH! Dodge the reels — mind the 7s!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e) {}
}


function _egGamblerTickRush(st, dtS, pr, p) {
    const rush = st.rush;
    if (!rush) return;
    rush.t += dtS * 1000;
    if (rush.wave < EG_GMB_RUSH_WAVES && rush.t >= rush.wave * EG_GMB_RUSH_WAVE_GAP_MS) {
        const n = EG_GMB_RUSH_PER_WAVE[Math.max(1, Math.min(3, p))];
        for (let i = 0; i < n; i++) _egGamblerSpawnSymbol(st);
        rush.wave++;
    }
    if (rush.t >= EG_GMB_RUSH_MS) st.rush = null;
}


const EG_GMB_SYMBOL_FACES = ['🍒', '🔔', '🍋', '7️⃣'];


function _egGamblerSpawnSymbol(st) {
    const W = window.innerWidth;
    const el = _egNkEl(st.run, 'div', 'eg-gmb-symbol', EG_GMB_SYMBOL_FACES[Math.floor(Math.random() * 4)]);
    const fromLeft = Math.random() < 0.5;
    const sym = {
        x: fromLeft ? -30 : W + 30,
        y: 70 + Math.random() * Math.max(60, window.innerHeight - 150),
        vx: (fromLeft ? 1 : -1) * EG_GMB_SYMBOL_SPEED * (0.85 + Math.random() * 0.3),
        t: 0, hit: false, seven: false, el,
    };
    sym.seven = el.textContent === '7️⃣';
    el.style.transform = 'translate(' + Math.round(sym.x) + 'px,' + Math.round(sym.y) + 'px)';
    st.symbols.push(sym);
}


// Advances symbols; expiring 7s burst into coin rings.
function _egGamblerTickSymbols(st, dtS, pr) {
    for (let i = st.symbols.length - 1; i >= 0; i--) {
        const s = st.symbols[i];
        s.t += dtS * 1000;
        s.x += s.vx * dtS;
        s.y += Math.sin(s.t / 300) * 26 * dtS;
        s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
        if (pr && !s.hit && _egNkCircleHit(s.x, s.y, 18, pr, 0)) {
            s.hit = true;
            const dealt = _egNkHit(EG_GMB_SYMBOL_DMG, 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Gambler', 'Reel');
            if (s.seven) _egGamblerBurst(st, s.x, s.y);
            try { s.el.remove(); } catch (e) {}
            st.symbols.splice(i, 1);
            continue;
        }
        if (s.t > 4600 || s.x < -60 || s.x > window.innerWidth + 60) {
            if (s.seven) _egGamblerBurst(st, s.x, s.y);
            try { s.el.remove(); } catch (e) {}
            st.symbols.splice(i, 1);
        }
    }
}


// Expanding coin burst from an expiring 7.
function _egGamblerBurst(st, x, y) {
    const el = _egNkEl(st.run, 'div', 'eg-gmb-burst', '💰');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    st.bursts.push({ x, y, t: 0, hit: false, el });
}


function _egGamblerTickBursts(st, dtS) {
    for (let i = st.bursts.length - 1; i >= 0; i--) {
        const b = st.bursts[i];
        b.t += dtS * 1000;
        const k = b.t / 700;
        if (k >= 1) { try { b.el.remove(); } catch (e) {} st.bursts.splice(i, 1); continue; }
        const r = 20 + (EG_GMB_SEVEN_BURST_R - 20) * k;
        b.el.style.width = b.el.style.height = Math.round(r * 2) + 'px';
        b.el.style.marginLeft = b.el.style.marginTop = (-r) + 'px';
        if (!b.hit) {
            const c = _egNkPlayerCenter();
            if (c && Math.hypot(c.x - b.x, c.y - b.y) <= r + 6) {
                b.hit = true;
                const dealt = _egNkHit(EG_GMB_SEVEN_BURST_DMG, 'shadow', st.level);
                _egNkAbilityHitToast(dealt, 'The Gambler', 'Jackpot Blast');
            }
        }
    }
}


// ── Charge attack: Russian Roulette ──────────────────────────────────────
// A 6-chamber cylinder telegraphs over the player for 1.8s, visibly
// ticking down; then the hammer falls — 5/6 blank, 1/6 heavy hit.
function _egGamblerRoulette(monster) {
    const st = _egGamblerWatcher;
    if (!st || st.rr || _egNkDodgeBusy() || _egNkFrozen()) return;
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const el = _egNkEl(st.run, 'div', 'eg-gmb-rr', '🔫⚪⚪⚪⚪⚪⚪');
    el.style.left = c.x + 'px';
    el.style.top = c.y + 'px';
    st.rr = { x: c.x, y: c.y, t: 0, chamber: 6, p, el, shellEl: null };
    _egNkToast('eg_gmb_rr', '🔫 RUSSIAN ROULETTE! Step out before the hammer falls!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('gambler_deal'); } catch (e) {}
}


// Blank outcome: a spent shell pops at the mark (flavor).
function _egGamblerShellPop(st, x, y) {
    try {
        const el = document.createElement('div');
        el.className = 'eg-gmb-shell';
        el.textContent = '🔘';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent chip volley — keep the
// handler name alive so any stale schedule entry no-ops instead of
// erroring.
function _egMechLoadedDice(monster, phase) { void monster; void phase; }
