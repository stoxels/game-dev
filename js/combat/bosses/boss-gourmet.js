import { Audio_Manager } from '../../audio/audio.js';
import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE GOURMET (boss_gourmet)---------------------
//------------------------------------------------------------------------
// Tasting-menu siege - YOU are the main course: chomping gourmand, aroma
// inhale into spit fans, roaming sizzling plates, DINNER SERVICE cloches at
// 60%, BANQUET TOSS at 30%, and the DEVOUR suction charge attack. One
// _nkLoop drives every state machine.
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_gourmet: {
        id: 'boss_gourmet', name: 'The Gourmet', emoji: '👄',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'fire', resistances: { fire: 25, cold: 10, lightning: 10, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_gourmet: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility - the persistent watcher now
            // owns the inhale/spit cadence; the handler no-ops (same shim
            // pattern as the other reworked bosses).
            { name: 'gourmet_gulp', intervalBase: 21000, intervalVariance: 5000, handler: '_mechGourmetGulp' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_mechCorruptCells' },
        ],
        onInit: _gourmetArenaInit,
    },
});


// ── Kitchen tuning ───────────────────────────────────────────────────────
// The Gourmand (boss body)
export const GMT_MOUTH_R = 44;                    // maw visual radius
export const GMT_DRIFT_SPEED = [0, 24, 34, 46];   // px/s per phase
export const GMT_DRIFT_REPICK_MS = 5200;
export const GMT_CHOMP_DMG = [0, 0.05, 0.06, 0.08]; // %maxHP touching the maw
export const GMT_CHOMP_CD_MS = 1000;
export const GMT_CHOMP_FLING = [0, 120, 145, 170];
export const GMT_CHOMP_HEAL = 0.01;               // boss heals 1% per bite
// Aroma inhale + food spit (persistent cadence)
export const GMT_INHALE_IDLE_MS = [0, 4200, 3400, 2600];
export const GMT_INHALE_MS = 1600;                // suction duration
export const GMT_PULL_SPEED = [0, 95, 115, 140];  // px/s suction
export const GMT_SPIT_N = [0, 3, 4, 5];           // food per breath
export const GMT_FOOD_SPEED = 280;
export const GMT_FOOD_DMG = 0.05;                 // %maxHP per food hit
// Sizzling plate + grease trails
export const GMT_PLATE_SPEED = [0, 70, 90, 115];
export const GMT_PLATE_DMG = 0.05;                // %maxHP touching the plate
export const GMT_PLATE_CD_MS = 900;
export const GMT_TRAIL_TTL_MS = 5200;             // grease pool lifetime
export const GMT_TRAIL_GAP_MS = 420;              // pool spacing along the path
export const GMT_TRAIL_DMG = 0.03;                // %maxHP per grease tick
export const GMT_TRAIL_TICK_MS = 700;
export const GMT_TRAIL_MAX = 14;                  // cap so the table stays readable
// Dinner Service (60% gate)
export const GMT_CLOCHE_N = 3;                    // sequential slams
export const GMT_CLOCHE_WARN_MS = 900;
export const GMT_CLOCHE_R = 120;
export const GMT_CLOCHE_DMG = [0, 0.13, 0.15, 0.18];
export const GMT_CLOCHE_GAP_MS = 1350;
export const GMT_CLOCHE_POOL_TTL = 6000;
// Banquet Toss (30% gate)
export const GMT_BANQUET_WAVES = 4;
export const GMT_BANQUET_PER_WAVE = [0, 5, 6, 8];
export const GMT_BANQUET_GAP_MS = 1750;
export const GMT_DISH_SPEED = 320;                // px/s fall
export const GMT_DISH_DMG = 0.06;                 // %maxHP per dish
export const GMT_BANQUET_MS = 9500;
// Devour (charge attack)
export const GMT_DEVOUR_LOCK_MS = 700;            // ring follows the player
export const GMT_DEVOUR_SUCK_MS = 1400;           // strong suction
export const GMT_DEVOUR_SUCK_SPEED = [0, 150, 180, 215];
export const GMT_DEVOUR_R = 150;                  // maw danger radius
export const GMT_DEVOUR_DMG = [0, 0.18, 0.21, 0.25];
export const GMT_DEVOUR_FLING = [0, 190, 215, 240];


export let _gourmetWatcher = null; // per-fight kitchen state

// Phase lookup helper - resolves the boss's current phase (default 1).
export function _gmtPhase(st) {
    if (typeof _monsters !== 'undefined') {
        const m = globalThis._monsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Boss heal (absolute % of its max) - the Gourmet gets stronger by eating.
export function _gmtHealBoss(monster, pct) {
    try {
        if (!monster || !monster.maxHP) return;
        const before = monster.currentHP;
        monster.currentHP = Math.min(monster.maxHP, monster.currentHP + Math.round(monster.maxHP * pct));
        if (monster.currentHP !== before && typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e2) {} }
    } catch (e) {}
}

// Removes every kitchen overlay (registered in boss-framework teardown).
export function _gourmetTeardown() {
    if (_gourmetWatcher) {
        const st = _gourmetWatcher;
        _gourmetWatcher = null;
        (st.foods || []).forEach(f => { try { if (f.el) f.el.remove(); } catch (e) {} });
        (st.pools || []).forEach(p => { try { if (p.el) p.el.remove(); } catch (e) {} });
        (st.warns || []).forEach(w => { try { if (w.el) w.el.remove(); } catch (e) {} });
        (st.dishes || []).forEach(d => { try { if (d.el) d.el.remove(); } catch (e) {} });
        if (st.aroma) { try { if (st.aroma.el) st.aroma.el.remove(); } catch (e) {} }
        if (st.cloche) { try { if (st.cloche.el) st.cloche.el.remove(); } catch (e) {} }
        if (st.devour) { try { if (st.devour.el) st.devour.el.remove(); } catch (e) {} }
        if (st.plate) { try { if (st.plate.el) st.plate.el.remove(); } catch (e) {} }
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes the maw
    }
    document.querySelectorAll('.sx-gmt-mouth, .sx-gmt-aroma, .sx-gmt-food, .sx-gmt-plate, .sx-gmt-pool, .sx-gmt-warn, .sx-gmt-cloche, .sx-gmt-dish, .sx-gmt-maw').forEach(el => el.remove());
}


// ── Persistent arena: the maw, the breath, the plate ────────────────────
export function _gourmetArenaInit(monster) {
    if (_gourmetWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        mouth: null,
        aroma: null, inhaleT: 0, inhaling: false,
        foods: [],
        plate: null, pools: [], trailAcc: 0,
        cloche: null,
        warns: [], dishes: [], banquet: null,
        devour: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _gourmetWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_gourmetWatcher === st) _gourmetWatcher = null; };
    st.run = run;

    // The Gourmand: the boss's arena body.
    const el = _nkEl(run, 'div', 'sx-gmt-mouth', '👄');
    el.style.width = el.style.height = (GMT_MOUTH_R * 2) + 'px';
    st.mouth = {
        x: window.innerWidth * 0.7, y: window.innerHeight * 0.3,
        tx: window.innerWidth * 0.7, ty: window.innerHeight * 0.3,
        repickAt: GMT_DRIFT_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.mouth.x - GMT_MOUTH_R) + 'px,' + Math.round(st.mouth.y - GMT_MOUTH_R) + 'px)';

    // Sizzling plate: roams and drips grease.
    const pel = _nkEl(run, 'div', 'sx-gmt-plate', '🍳');
    pel.style.width = pel.style.height = '52px';
    st.plate = {
        x: window.innerWidth * 0.3, y: window.innerHeight * 0.6,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.5,
        repickAt: 0, cdUntil: 0, el: pel,
    };

    if (monster) st.everLive = true;

    _nkLoop(run, (dtS, now) => {
        if (_gourmetWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _gourmetDinnerService(st); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _gourmetBanquet(st, p); }

        // ── The Gourmand: drift + CHOMP on touch ──
        const mh = st.mouth;
        mh.repickAt -= dtS * 1000;
        const mdx = mh.tx - mh.x, mdy = mh.ty - mh.y;
        const md = Math.hypot(mdx, mdy) || 1;
        const mstep = GMT_DRIFT_SPEED[p] * dtS;
        if (md <= mstep || mh.repickAt <= 0) {
            mh.tx = 90 + Math.random() * Math.max(60, W - 180);
            mh.ty = 90 + Math.random() * Math.max(60, H - 200);
            mh.repickAt = GMT_DRIFT_REPICK_MS;
        } else if (!st.devour) { // the maw plants its feet while devouring
            mh.x += (mdx / md) * mstep;
            mh.y += (mdy / md) * mstep;
        }
        mh.el.style.transform = 'translate(' + Math.round(mh.x - GMT_MOUTH_R) + 'px,' + Math.round(mh.y - GMT_MOUTH_R) + 'px)';
        if (c && pr && now >= mh.cdUntil && !st.devour && _nkCircleHit(mh.x, mh.y, GMT_MOUTH_R * 0.85, pr, 0)) {
            mh.cdUntil = now + GMT_CHOMP_CD_MS;
            const dx = c.x - mh.x, dy = c.y - mh.y;
            const d = Math.hypot(dx, dy) || 1;
            // Animated fling (contact at the maw): glide + tumble + burst.
            _nkFlingAvatar((dx / d) * GMT_CHOMP_FLING[p], (dy / d) * GMT_CHOMP_FLING[p], mh.x, mh.y);
            const dealt = _nkHit(GMT_CHOMP_DMG[p], null, st.level);
            _nkAbilityHitToast(dealt, 'The Gourmet', 'Chomp');
            _gmtHealBoss(live, GMT_CHOMP_HEAL); // it eats you a little
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e2) {}
        }

        // ── Aroma inhale → food spit (persistent cadence) ──
        st.inhaleT += dtS * 1000;
        if (!st.inhaling && st.inhaleT >= GMT_INHALE_IDLE_MS[p] && !st.devour) {
            st.inhaling = true;
            st.inhaleT = 0;
            // Aroma telegraph: dashed ring blooming around the maw.
            const ael = _nkEl(st.run, 'div', 'sx-gmt-aroma');
            ael.style.left = Math.round(mh.x) + 'px';
            ael.style.top = Math.round(mh.y) + 'px';
            st.aroma = { el: ael };
        }
        if (st.inhaling) {
            // Suction toward the maw + aroma ring grows with the breath.
            if (c && typeof _nkNudgeAvatar === 'function') {
                const dx = mh.x - c.x, dy = mh.y - c.y;
                const d = Math.hypot(dx, dy) || 1;
                _nkNudgeAvatar((dx / d) * GMT_PULL_SPEED[p] * dtS, (dy / d) * GMT_PULL_SPEED[p] * dtS);
            }
            if (st.aroma) {
                const k = Math.min(1, st.inhaleT / GMT_INHALE_MS);
                const r = GMT_MOUTH_R + 90 * k;
                st.aroma.el.style.width = st.aroma.el.style.height = Math.round(r * 2) + 'px';
                st.aroma.el.style.marginLeft = st.aroma.el.style.marginTop = (-r) + 'px';
            }
            if (st.inhaleT >= GMT_INHALE_MS) {
                st.inhaling = false;
                st.inhaleT = 0;
                if (st.aroma) { try { st.aroma.el.remove(); } catch (e) {} st.aroma = null; }
                // SPIT: a fan of food back where the suction dragged you from.
                const base = c ? Math.atan2(c.y - mh.y, c.x - mh.x) : 0;
                const n = GMT_SPIT_N[p];
                for (let k = 0; k < n; k++) {
                    const a = base + (k - (n - 1) / 2) * 0.26;
                    _gmtSpitFood(st, mh.x, mh.y, Math.cos(a) * GMT_FOOD_SPEED, Math.sin(a) * GMT_FOOD_SPEED);
                }
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
            }
        }

        // ── Sizzling plate: roam + drip grease + burn on touch ──
        const pl = st.plate;
        pl.repickAt -= dtS * 1000;
        const pdx = pl.tx - pl.x, pdy = pl.ty - pl.y;
        const pd = Math.hypot(pdx, pdy) || 1;
        const pstep = GMT_PLATE_SPEED[p] * dtS;
        if (pd <= pstep || pl.repickAt <= 0) {
            pl.tx = 80 + Math.random() * Math.max(60, W - 160);
            pl.ty = 80 + Math.random() * Math.max(60, H - 160);
            pl.repickAt = 3000 + Math.random() * 2500;
        } else {
            pl.x += (pdx / pd) * pstep;
            pl.y += (pdy / pd) * pstep;
        }
        pl.el.style.transform = 'translate(' + Math.round(pl.x - 26) + 'px,' + Math.round(pl.y - 26) + 'px)';
        if (c && pr && now >= pl.cdUntil && _nkCircleHit(pl.x, pl.y, 30, pr, 0)) {
            pl.cdUntil = now + GMT_PLATE_CD_MS;
            const dealt = _nkHit(GMT_PLATE_DMG, 'fire', st.level);
            _nkAbilityHitToast(dealt, 'The Gourmet', 'Sizzling Plate');
        }
        // Grease trail: drop a pool every GAP along the path.
        st.trailAcc += dtS * 1000;
        if (st.trailAcc >= GMT_TRAIL_GAP_MS) {
            st.trailAcc = 0;
            if (st.pools.length < GMT_TRAIL_MAX) _gmtDropPool(st, pl.x, pl.y, GMT_TRAIL_TTL_MS);
        }

        // ── Grease pools: burn anyone standing in them ──
        for (let i = st.pools.length - 1; i >= 0; i--) {
            const pool = st.pools[i];
            pool.t += dtS * 1000;
            if (pool.t >= pool.ttl) { try { pool.el.remove(); } catch (e) {} st.pools.splice(i, 1); continue; }
            if (pr && now >= pool.nextTick && _nkCircleHit(pool.x, pool.y, 46, pr, 0)) {
                pool.nextTick = now + GMT_TRAIL_TICK_MS;
                const dealt = _nkHit(GMT_TRAIL_DMG, 'fire', st.level);
                _nkAbilityHitToast(dealt, 'The Gourmet', 'Grease Fire');
            }
        }

        // ── Dinner Service (60% gate): sequential cloche slams ──
        if (st.cloche) {
            const cl = st.cloche;
            cl.t += dtS * 1000;
            if (cl.t >= GMT_CLOCHE_WARN_MS && !cl.slammed) {
                cl.slammed = true;
                try { if (cl.el) cl.el.remove(); } catch (e) {}
                cl.el = null;
                const el2 = _nkEl(st.run, 'div', 'sx-gmt-cloche', '🍽️');
                el2.style.left = Math.round(cl.x) + 'px';
                el2.style.top = Math.round(cl.y) + 'px';
                const pr2 = _nkPlayerRect();
                const c2 = _nkPlayerCenter();
                if (pr2 && _nkCircleHit(cl.x, cl.y, GMT_CLOCHE_R, pr2, 0)) {
                    const dx = (c2 ? c2.x : cl.x) - cl.x, dy = (c2 ? c2.y : cl.y) - cl.y;
                    const d = Math.hypot(dx, dy) || 1;
                    _nkFlingAvatar((dx / d) * 150, (dy / d) * 150, cl.x, cl.y);
                    const dealt = _nkHit(GMT_CLOCHE_DMG[_gmtPhase(st)], null, st.level);
                    _nkAbilityHitToast(dealt, 'The Gourmet', 'Dinner Service');
                }
                // The slammed cloche leaves a grease pool behind.
                _gmtDropPool(st, cl.x, cl.y, GMT_CLOCHE_POOL_TTL);
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
                setTimeout(() => { try { el2.remove(); } catch (e) {} }, 650);
            }
            if (cl.slammed && cl.t >= GMT_CLOCHE_GAP_MS) {
                cl.idx++;
                if (cl.idx >= GMT_CLOCHE_N) st.cloche = null;
                else {
                    const c3 = _nkPlayerCenter();
                    const x3 = c3 ? c3.x : W / 2, y3 = c3 ? c3.y : H / 2;
                    st.cloche = { idx: cl.idx, x: x3, y: y3, t: 0, slammed: false, el: _gmtWarn(st, x3, y3, GMT_CLOCHE_R) };
                }
            }
        }

        // ── Banquet Toss (30% gate): telegraphed dessert rain ──
        if (st.banquet) {
            st.banquet.t += dtS * 1000;
            if (st.banquet.wave < GMT_BANQUET_WAVES && st.banquet.t >= st.banquet.wave * GMT_BANQUET_GAP_MS) {
                const n = GMT_BANQUET_PER_WAVE[Math.max(1, Math.min(3, p))];
                for (let k = 0; k < n; k++) _gmtDropDish(st, W);
                st.banquet.wave++;
            }
            if (st.banquet.t >= GMT_BANQUET_MS) st.banquet = null;
        }
        // Dishes: telegraph column, then fall.
        for (let i = st.dishes.length - 1; i >= 0; i--) {
            const dsh = st.dishes[i];
            dsh.t += dtS * 1000;
            if (!dsh.warn) { // warning phase: the column marker holds
                if (dsh.t >= 620) {
                    dsh.warn = true;
                    try { if (dsh.warnEl) dsh.warnEl.remove(); } catch (e) {}
                    const el4 = _nkEl(st.run, 'div', 'sx-gmt-dish', ['🍰', '🧁', '🎂'][Math.floor(Math.random() * 3)]);
                    el4.style.left = Math.round(dsh.x) + 'px';
                    el4.style.top = '-30px';
                    dsh.el = el4;
                }
            } else {
                dsh.y += GMT_DISH_SPEED * dtS;
                dsh.el.style.transform = 'translate(-50%,0) translateY(' + Math.round(dsh.y) + 'px) rotate(' + Math.round(dsh.t / 30) + 'deg)';
                if (pr && !dsh.hit && _nkCircleHit(dsh.x, dsh.y, 20, pr, 0)) {
                    dsh.hit = true;
                    const dealt = _nkHit(GMT_DISH_DMG, null, st.level);
                    _nkAbilityHitToast(dealt, 'The Gourmet', 'Banquet Toss');
                    try { dsh.el.remove(); } catch (e) {}
                    st.dishes.splice(i, 1);
                    continue;
                }
                if (dsh.y > H + 40) {
                    try { dsh.el.remove(); } catch (e) {}
                    st.dishes.splice(i, 1);
                }
            }
        }

        // ── Devour (charge attack state machine) ──
        if (st.devour) {
            const dv = st.devour;
            dv.t += dtS * 1000;
            if (dv.phase === 'lock') {
                // The ring stalks the player's live position.
                const c4 = _nkPlayerCenter();
                if (c4) { dv.mx = c4.x; dv.my = c4.y; }
                // Ring tracks the MAW's danger radius (the chomp zone).
                dv.el.style.left = Math.round(mh.x) + 'px';
                dv.el.style.top = Math.round(mh.y) + 'px';
                dv.el.style.width = dv.el.style.height = Math.round(GMT_DEVOUR_R * 2) + 'px';
                dv.el.style.marginLeft = dv.el.style.marginTop = (-GMT_DEVOUR_R) + 'px';
                if (dv.t >= GMT_DEVOUR_LOCK_MS) {
                    dv.phase = 'suck';
                    dv.t = 0;
                    dv.el.classList.add('sucking');
                }
            } else if (dv.phase === 'suck') {
                // Strong suction into the maw - fight it or be eaten.
                const c5 = _nkPlayerCenter();
                if (c5) {
                    const dx = mh.x - c5.x, dy = mh.y - c5.y;
                    const d = Math.hypot(dx, dy) || 1;
                    _nkNudgeAvatar((dx / d) * GMT_DEVOUR_SUCK_SPEED[p] * dtS, (dy / d) * GMT_DEVOUR_SUCK_SPEED[p] * dtS);
                }
                if (dv.t >= GMT_DEVOUR_SUCK_MS) {
                    dv.phase = 'chomp';
                    dv.t = 0;
                    // SWALLOW: everything still inside the ring is eaten.
                    const pr5 = _nkPlayerRect();
                    const c5b = _nkPlayerCenter();
                    dv.el.classList.remove('sucking');
                    dv.el.classList.add('chomping');
                    if (pr5 && _nkCircleHit(mh.x, mh.y, GMT_DEVOUR_R, pr5, 0)) {
                        const dx = (c5b ? c5b.x : mh.x) - mh.x, dy = (c5b ? c5b.y : mh.y) - mh.y;
                        const d = Math.hypot(dx, dy) || 1;
                        _nkFlingAvatar((dx / d) * GMT_DEVOUR_FLING[p], (dy / d) * GMT_DEVOUR_FLING[p], mh.x, mh.y);
                        const dealt = _nkHit(GMT_DEVOUR_DMG[p], null, st.level);
                        _nkAbilityHitToast(dealt, 'The Gourmet', 'Devour');
                        _gmtHealBoss(live, 0.02); // a proper mouthful
                    } else {
                        _nkToast('eg_gmt_escaped', '🫧 It swallowed air. You escaped the maw!', '#4ade80');
                    }
                    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
                }
            } else { // chomp flash, then done
                if (dv.t >= 500) {
                    try { dv.el.remove(); } catch (e) {}
                    st.devour = null;
                }
            }
        }

        return true;
    });
}


// A dashed warn ring (shared by cloches + devour lock styling).
export function _gmtWarn(st, x, y, r) {
    const el = _nkEl(st.run, 'div', 'sx-gmt-warn');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    el.style.width = el.style.height = Math.round(r * 2) + 'px';
    el.style.marginLeft = el.style.marginTop = (-r) + 'px';
    return el;
}


// One food projectile from the maw's spit.
export function _gmtSpitFood(st, x, y, vx, vy) {
    const el = _nkEl(st.run, 'div', 'sx-gmt-food', ['🍖', '🍗', '🧀'][Math.floor(Math.random() * 3)]);
    const food = { x, y, vx, vy, t: 0, hit: false, el };
    st.foods.push(food);
}


// A grease-fire pool on the table.
export function _gmtDropPool(st, x, y, ttl) {
    const el = _nkEl(st.run, 'div', 'sx-gmt-pool');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    st.pools.push({ x, y, t: 0, ttl, nextTick: 0, el });
}


// ── 60% gate: Dinner Service ─────────────────────────────────────────────
// Three giant cloches slam onto telegraphed rings in sequence; each leaves
// a grease pool where it lands.
export function _gourmetDinnerService(st) {
    if (st.cloche) return;
    const c = _nkPlayerCenter();
    const x = c ? c.x : window.innerWidth / 2;
    const y = c ? c.y : window.innerHeight / 2;
    st.cloche = { idx: 0, x, y, t: 0, slammed: false, el: _gmtWarn(st, x, y, GMT_CLOCHE_R) };
    _nkToast('eg_gmt_dinner', '🍽️ DINNER SERVICE! Three courses, plated where you stand!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
}


// ── 30% gate: Banquet Toss ───────────────────────────────────────────────
// Dessert courses rain down on telegraphed columns in staggered waves.
export function _gourmetBanquet(st, p) {
    if (st.banquet) return;
    st.banquet = { wave: 0, t: 0 };
    _nkToast('eg_gmt_banquet', '🍰 BANQUET TOSS! The dessert course is landing on YOU!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
}


export function _gmtDropDish(st, W) {
    const x = 60 + Math.random() * Math.max(80, W - 120);
    const warnEl = _nkEl(st.run, 'div', 'sx-gmt-warncol');
    warnEl.style.left = Math.round(x) + 'px';
    st.dishes.push({ x, y: 0, t: 0, warn: false, warnEl, el: null, hit: false });
}


// ── Charge attack: Devour ────────────────────────────────────────────────
// The maw locks on, then inhales hard - the ring shows the swallow radius.
// Fight the suction and be outside the ring when the breath ends.
export function _gourmetDevour(monster) {
    const st = _gourmetWatcher;
    if (!st || st.devour || _nkDodgeBusy() || _nkFrozen()) return;
    const el = _nkEl(st.run, 'div', 'sx-gmt-maw');
    st.devour = { phase: 'lock', t: 0, el };
    _nkToast('eg_gmt_devour', '👄 DEVOUR! Fight the suction - get out of the ring!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_pull', 'gourmet_bite'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent inhale/spit cadence -
// keep the handler name alive so any stale schedule entry no-ops instead
// of erroring.
export function _mechGourmetGulp(monster, phase) { void monster; void phase; }
