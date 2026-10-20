import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE SHAPER (boss_shaper)------------------------
//------------------------------------------------------------------------
// Rework "sculptor of winter": glacier rifts (rolling frost fronts +
// lingering ice pools), frost monoliths and ice walkers from 60%, and the
// SHAPED WINTER finale at ≤10% - shatter three cores before the last beat.
// Shared soul_tithe pressure comes along (shared-puzzle-mechanics.js).
//------------------------------------------------------------------------

// DEBUG: stretch telegraphs/windups 2.5x for screenshots. Off for ship.
export const _SHP_DEBUG_SLOW = false;
export const _SHP_DEBUG_MULT = _SHP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_shaper: {
        id: 'boss_shaper', name: 'The Frostwright', emoji: '❄️',
        baseHP: 1060, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_shaper: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'glacier_rift', intervalBase: 19000, intervalVariance: 4500, handler: '_mechShpRift' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_mechSoulTithe' },
            { name: 'frost_monoliths', intervalBase: 21000, intervalVariance: 5000, handler: '_mechShpMonoliths', phase2Only: true },
            { name: 'ice_walker', intervalBase: 24000, intervalVariance: 6000, handler: '_mechShpWalker', phase2Only: true },
        ],
        onPhaseEnter: _shpOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const SHP_POOL_DMG      = [0, 9, 11, 13];   // %maxHP/s in an ice pool (paid as hits on the touch cooldown)
export const SHP_FRONT_DMG     = [0, 0.11, 0.13, 0.16]; // %maxHP rift-front eruption
export const SHP_WALL_DMG      = 0.10;             // %maxHP frost wall contact
export const SHP_WALKER_DMG    = [0, 0, 0.10, 0.12]; // %maxHP walker contact
export const SHP_SHARD_DMG     = 0.08;             // %maxHP shard shrapnel
export const SHP_ARM_DMG       = 0.12;             // %maxHP finale arm sweep
export const SHP_BREAK_DMG     = 0.35;             // %maxHP MONOLITH BREAK wave
export const SHP_HIT_CD_MS     = 700;              // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Frostwright hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _shpHitCd = 0;
export function _shpTouch(pct, level, label) {
    const now = performance.now();
    if (now < _shpHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _shpHitCd = now + SHP_HIT_CD_MS;
    const dealt = _nkHit(pct, 'cold', level);
    _nkAbilityHitToast(dealt, 'The Frostwright', label);
    return true;
}

// Ice-shard burst where a shatter/eruption lands (visual only, body-level
// so it survives the run ending in the same frame).
export function _shpShards(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'sx-shp-shards' + (big ? ' sx-shp-shards-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'sx-shp-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (big ? 88 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 420) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _SHP_DEBUG_SLOW ? 1900 : 950);
}

// Lingering ice pools ACROSS casts (the rift's aftermath). Entries expire
// by timestamp; capped so recasts cannot pave the whole screen.
export let _shpPools = []; // { x, y, radius, until }
export function _shpPrunePools(now) {
    _shpPools = _shpPools.filter(z => z.until > now);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: GLACIER RIFT (signature, upgraded)-----------
//------------------------------------------------------------------------
// Frost fissures spider out from a random side and erupt in a ROLLING
// WAVE: a crested front (≈180px band) sweeps the screen over ~2.2s - far
// faster than you can run. The three glowing FISSURE LANES are the only
// safe ground (one always opens within reach of you): stand in one while
// the front passes. Where the front settles, LINGERING ICE POOLS form in
// the lanes (0.8s grace while they freeze over) and hurt while you stand
// in them - step out once the front is gone.
export const SHP_RIFT_FRONT_MS = 2200;
export const SHP_POOL_LIFE = 7000;

export function _mechShpRift(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const frontMs = SHP_RIFT_FRONT_MS * _SHP_DEBUG_MULT;
    const poolLife = SHP_POOL_LIFE * _SHP_DEBUG_MULT;
    const frontDmg = SHP_FRONT_DMG[p];
    const poolDot = SHP_POOL_DMG[p] / 100;

    // The front sweeps from a random side; fissures: 3 gaps the player can
    // slip through (the band is not uniformly lethal across its sweep).
    const fromLeft = Math.random() < 0.5;
    const warnMs = 1100 * _SHP_DEBUG_MULT;
    const bandH = 180;
    // One lane always within reach (≤160px above/below you), two more apart.
    const pc0 = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const gaps = [Math.max(110, Math.min(H - 110, pc0.y + (Math.random() * 320 - 160)))];
    for (let tries = 0; gaps.length < 3 && tries < 40; tries++) {
        const g = 110 + Math.random() * (H - 220);
        if (gaps.every(o => Math.abs(o - g) > 150)) gaps.push(g);
    }
    gaps.sort((a, b) => a - b);

    // Telegraph: fissure lines across the sweep axis + arrows on the origin.
    const warn = _nkEl(run, 'div', 'sx-shp-riftwarn');
    warn.style.top = '0px';
    warn.style.width = W + 'px';
    warn.style.height = H + 'px';
    gaps.forEach(g => {
        // The safe lane: as tall as the real safe band (±52px).
        const line = _nkEl(run, 'div', 'sx-shp-fissure', fromLeft ? 'SAFE LANE ▶' : '◀ SAFE LANE');
        line.style.top = Math.round(g - 52) + 'px';
        line.style.left = '0px';
        line.style.width = W + 'px';
    });

    _nkToast('eg_mech_shp_rift', '❄️ GLACIER RIFT - stand in a glowing SAFE LANE while the front passes!', '#7dd3fc');

    const poolEls = new Map();  // zone → its element (persistent per pool)
    let t = 0, erupted = false, frontX = fromLeft ? 0 : W;
    let dotWarnAt = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        if (!erupted && t >= warnMs) {
            erupted = true;
            const front = _nkEl(run, 'div', 'sx-shp-front' + (fromLeft ? ' sx-shp-from-left' : ' sx-shp-from-right'));
            front.style.top = '0px';
            front.style.height = H + 'px';
            front.style.width = bandH + 'px';
            front.style.left = Math.round(fromLeft ? -bandH : W) + 'px';
            run.frontEl = front;
            _shpShards(fromLeft ? 30 : W - 30, H / 2, false);
        }
        if (erupted && run.frontEl) {
            const dur = frontMs;
            const k = Math.min(1, (t - warnMs) / dur);
            frontX = fromLeft ? k * (W + bandH) - bandH : W - k * (W + bandH);
            run.frontEl.style.left = Math.round(frontX) + 'px';
            // Standing inside the front band AND not in a fissure gap bites.
            if (pr) {
                const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                const inBand = fromLeft
                    ? (pc.x > frontX && pc.x < frontX + bandH)
                    : (pc.x > frontX && pc.x < frontX + bandH);
                const inGap = gaps.some(g => Math.abs(pc.y - g) < 52);
                if (inBand && !inGap && now >= _shpHitCd) {
                    _shpHitCd = now + SHP_HIT_CD_MS;
                    _shpTouch(frontDmg, level, 'Glacier Rift');
                }
            }
            if (k >= 1) {
                // The front settles → lingering ice pools between the gaps.
                _shpPrunePools(now);
                const room = Math.max(0, 5 - _shpPools.length);
                const seeds = gaps.slice(0, Math.min(gaps.length, room));
                seeds.forEach(g => {
                    const el = _nkEl(run, 'div', 'sx-shp-pool');
                    el.style.width = '190px';
                    el.style.height = '190px';
                    el.style.transform = 'translate(' + Math.round(W / 2 - 95) + 'px,' + Math.round(g - 95) + 'px)';
                    el.classList.add('sx-shp-pool-forming');
                    const fid = setTimeout(() => el.classList.remove('sx-shp-pool-forming'), 800 * _SHP_DEBUG_MULT);
                    run.timers.push(fid);
                    const zone = { x: W / 2, y: g, radius: 95, until: now + poolLife, armAt: now + 800 * _SHP_DEBUG_MULT };
                    _shpPools.push(zone);
                    poolEls.set(zone, el);
                });
                try { run.frontEl.remove(); } catch (e) {}
                run.frontEl = null;
            }
        }
        // Pools drain while you stand in them; visuals persist per pool
        // (created once at settle-time), then fade out on expiry.
        _shpPrunePools(now);
        Array.from(poolEls.entries()).forEach(([z, el]) => {
            if (z.until <= now) {
                el.classList.add('sx-shp-pool-out');
                const rm = setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
                run.timers.push(rm);
                poolEls.delete(z);
            }
        });
        if (pr) {
            // A real hit per touch cooldown (flash + number), not a silent DoT.
            const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
            const inside = _shpPools.some(z => now >= (z.armAt || 0) && Math.hypot(pc.x - z.x, pc.y - z.y) < z.radius);
            if (inside) {
                _shpTouch(poolDot * (SHP_HIT_CD_MS / 1000), level, 'Ice Pool');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _nkToast('eg_nk_move', '⚠️ Move!', '#7dd3fc');
                }
            }
        }
        // The run must outlive the pools: the DoT tick AND the pool visuals
        // live in this loop, so keep it alive for the pool's full lifetime.
        return t < warnMs + frontMs + poolLife + 400;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: FROST MONOLITHS (phase 2+)-------------------
//------------------------------------------------------------------------
// The Frostwright plants rune-carved monoliths at the edges; each erects a
// growing wall of frost that slowly SHRINKS the arena toward the centre.
// Break the monoliths (3 hits each) to stop their walls. Walls despawn
// when their monolith dies; unbroken walls retract after the cast ends.
export const SHP_MONO_COUNT  = [0, 0, 2, 3];
export const SHP_MONO_HITS   = 3;
export const SHP_WALL_GROW   = 130;    // px/s the wall extends
export const SHP_MONO_LIFE   = 9000;

export function _mechShpMonoliths(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = SHP_MONO_COUNT[p];
    const lifeMs = SHP_MONO_LIFE * _SHP_DEBUG_MULT;

    // Monolith spots: near the screen edges (inset a bit), spread apart.
    const spots = [];
    const cands = [
        [90, 120], [W - 90, 120], [90, H * 0.6], [W - 90, H * 0.6], [W / 2, 100], [W / 2, H - 90],
    ];
    for (let i = 0; i < count && cands.length; i++) {
        spots.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
    }

    _nkToast('eg_mech_shp_monos', '❄️ The Frostwright: FROST MONOLITHS - break them to stop the walls!', '#7dd3fc');

    const monos = spots.map(spot => {
        const el = _nkEl(run, 'div', 'sx-shp-mono', '🗿');
        el.style.left = Math.round(spot[0] - 24) + 'px';
        el.style.top = Math.round(spot[1] - 24) + 'px';
        // Wall grows from the monolith toward the arena centre.
        const dx = W / 2 - spot[0], dy = H / 2 - spot[1];
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const wall = _nkEl(run, 'div', 'sx-shp-wall');
        wall.style.left = Math.round(spot[0]) + 'px';
        wall.style.top = Math.round(spot[1]) + 'px';
        wall.style.width = '0px';
        wall.style.rotate = ang + 'deg';
        return { x: spot[0], y: spot[1], el, wall, len, hp: SHP_MONO_HITS, dead: false };
    });

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        let active = false;
        monos.forEach(m => {
            if (m.dead) return;
            active = true;
            const grown = Math.min(m.len, t * SHP_WALL_GROW);
            m.wall.style.width = Math.round(grown) + 'px';
            // Wall contact bites (point-to-segment against the player box).
            if (pr && now >= touchCd) {
                const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                const rad = (Math.atan2(H / 2 - m.y, W / 2 - m.x));
                const ex = m.x + Math.cos(rad) * grown, ey = m.y + Math.sin(rad) * grown;
                const dxs = ex - m.x, dys = ey - m.y;
                const len2 = dxs * dxs + dys * dys;
                const tt = len2 ? Math.max(0, Math.min(1, ((pc.x - m.x) * dxs + (pc.y - m.y) * dys) / len2)) : 0;
                if (Math.hypot(pc.x - (m.x + dxs * tt), pc.y - (m.y + dys * tt)) < 14) {
                    touchCd = now + SHP_HIT_CD_MS;
                    _shpTouch(SHP_WALL_DMG, level, 'Frost Wall');
                }
            }
        });
        // Cast timeout: unbroken monoliths shatter on their own.
        if (t >= lifeMs) {
            monos.forEach(m => {
                if (!m.dead) {
                    m.dead = true;
                    _shpShards(m.x, m.y, false);
                    try { m.el.remove(); } catch (e) {}
                    try { m.wall.remove(); } catch (e) {}
                }
            });
            return false;
        }
        return active;
    });

    // Monoliths are player-breakable: clicking the monolith's card is not a
    // thing (they are arena objects), so we shatter them when the player
    // touches them 3 times while DODGING - body-check the ice. Each touch
    // (with a cooldown) cracks a stage; the 3rd shatters it.
    const crackLoop = _nkNewRun(monster && monster.id, true);
    let crackCd = 0;
    _nkLoop(crackLoop, (dtS, now) => {
        const pr = _nkPlayerRect();
        if (pr && now >= crackCd) {
            const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
            for (const m of monos) {
                if (m.dead) continue;
                if (Math.hypot(pc.x - m.x, pc.y - m.y) < 46) {
                    crackCd = now + 500;
                    m.hp--;
                    m.el.classList.remove('sx-shp-mono-crack1', 'sx-shp-mono-crack2');
                    if (m.hp === 2) m.el.classList.add('sx-shp-mono-crack1');
                    if (m.hp === 1) m.el.classList.add('sx-shp-mono-crack2');
                    _shpShards(m.x, m.y, false);
                    if (m.hp <= 0) {
                        m.dead = true;
                        _shpShards(m.x, m.y, true);
                        try { m.el.remove(); } catch (e) {}
                        try { m.wall.remove(); } catch (e) {}
                        _nkToast('eg_mech_shp_mono_down', '❄️ Monolith shattered - the wall recedes!', '#4ade80');
                    }
                    break;
                }
            }
        }
        if (monos.every(m => m.dead)) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: ICE WALKER (phase 2+)------------------------
//------------------------------------------------------------------------
// A sculpted ice sentinel (⛄) stalks you, trailing a freezing wake. It
// shatters on contact - dealing its hit AND spawning shard shrapnel that
// scatters outward. Phase 3 spawns two walkers.
export const SHP_WALKER_SPEED = 165;
export const SHP_WALKER_TURN = 1.9;
export const SHP_WALKER_LIFE = 9000;
export const SHP_SHARD_COUNT = 6;

export function _mechShpWalker(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const speed = SHP_WALKER_SPEED / _SHP_DEBUG_MULT;
    const lifeMs = SHP_WALKER_LIFE * _SHP_DEBUG_MULT;
    const dmgPct = SHP_WALKER_DMG[p];

    const mk = (delayMs) => {
        const delayId = setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            const wk = {
                x: side === 0 ? 50 : side === 1 ? W - 50 : W * (0.2 + Math.random() * 0.6),
                y: side === 2 ? 50 : side === 3 ? H - 50 : H * (0.2 + Math.random() * 0.6),
                ang: Math.random() * Math.PI * 2, born: 0, el: null, dead: false,
            };
            wk.el = _nkEl(run, 'div', 'sx-shp-walker', '⛄');
            wk.el.style.left = Math.round(wk.x - 18) + 'px';
            wk.el.style.top = Math.round(wk.y - 18) + 'px';
            walkers.push(wk);
        }, delayMs);
        run.timers.push(delayId);
    };

    const walkers = [];
    const n = p >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) mk(i * 1800 * _SHP_DEBUG_MULT);

    _nkToast('eg_mech_shp_walker', '❄️ The Frostwright: ICE WALKER - it shatters on contact!', '#7dd3fc');

    const shards = [];   // { x, y, vx, vy, el, born, dead }
    let t = 0, touchCd = 0, shardTouchCd = 0;
    const shatter = (wk) => {
        wk.dead = true;
        try { wk.el.remove(); } catch (e) {}
        _shpShards(wk.x, wk.y, false);
        for (let i = 0; i < SHP_SHARD_COUNT; i++) {
            const a = (i / SHP_SHARD_COUNT) * Math.PI * 2 + Math.random() * 0.5;
            const spd = (230 + Math.random() * 90) / _SHP_DEBUG_MULT;
            const el = _nkEl(run, 'div', 'sx-shp-shardlet', '❄');
            el.style.left = Math.round(wk.x - 8) + 'px';
            el.style.top = Math.round(wk.y - 8) + 'px';
            shards.push({ x: wk.x, y: wk.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, el, born: t });
        }
    };

    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        let active = false;
        walkers.forEach(wk => {
            if (wk.dead) return;
            active = true;
            if (!wk.born) wk.born = t;
            // Stalk: slow homing with a steering cap (readable pursuit).
            if (c) {
                const want = Math.atan2(c.y - wk.y, c.x - wk.x);
                let diff = ((want - wk.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const max = SHP_WALKER_TURN * dtS;
                wk.ang += Math.max(-max, Math.min(max, diff));
            }
            wk.x += Math.cos(wk.ang) * speed * dtS;
            wk.y += Math.sin(wk.ang) * speed * dtS;
            if (wk.x < 30 || wk.x > W - 30) { wk.ang = Math.PI - wk.ang; wk.x = Math.max(30, Math.min(W - 30, wk.x)); }
            if (wk.y < 30 || wk.y > H - 30) { wk.ang = -wk.ang; wk.y = Math.max(30, Math.min(H - 30, wk.y)); }
            wk.el.style.left = Math.round(wk.x - 18) + 'px';
            wk.el.style.top = Math.round(wk.y - 18) + 'px';
            // Contact: the walker shatters - hit + shrapnel.
            if (pr && now >= touchCd && _nkCircleHit(wk.x, wk.y, 20, pr, 0)) {
                touchCd = now + SHP_HIT_CD_MS;
                _shpTouch(dmgPct, level, 'Ice Walker');
                shatter(wk);
                return;
            }
            if (t - wk.born > lifeMs) shatter(wk);
        });
        // Shard shrapnel flies out and melts.
        for (let i = shards.length - 1; i >= 0; i--) {
            const s = shards[i];
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            s.el.style.left = Math.round(s.x - 8) + 'px';
            s.el.style.top = Math.round(s.y - 8) + 'px';
            if (pr && now >= shardTouchCd && _nkCircleHit(s.x, s.y, 9, pr, 0)) {
                shardTouchCd = now + SHP_HIT_CD_MS;
                s.dead = true;
                try { s.el.remove(); } catch (e) {}
                _shpTouch(SHP_SHARD_DMG, level, 'Ice Shrapnel');
                continue;
            }
            if (s.dead || t - s.born > 1400 || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
                try { s.el.remove(); } catch (e) {}
                shards.splice(i, 1);
            }
        }
        return active || shards.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------⛄… THE SHAPED WINTER (≤10% HP one-shot finale)--------
//------------------------------------------------------------------------
// The Frostwright assembles a colossal ice monolith at the centre and goes
// immune. Three frost arms sweep the arena like a radar blade, spinning
// faster each beat - and three CORES on the monolith's faces light up one
// at a time. The lit core shelters you from the arms: stand on it to
// SHATTER it (3 stage-cracks); a shattered core stops its arm and the next
// core lights at once. Shatter all three before the last beat (~19s) to
// break the sculpture - otherwise the MONOLITH BREAK: a 3-2-1, then a
// full-screen ice shockwave (only the ring at the centre is safe).
export const SHP_FINAL_BEATS = 3;
export const SHP_CORE_HITS = 3;          // player touches to shatter a core
export const SHP_CORE_TOUCH_CD = 420;    // ms between crack touches
export const SHP_ARM_OMEGAS = [70, 100, 135]; // deg/s per beat
export const SHP_BEAT_MS = 5200;

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _shpFinal = null;

export function _shpFinalActive() {
    return !!_shpFinal && !_shpFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _shpOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _shpStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _shpStartFinalWatcher(monster) {
    if (!monster || _shpFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_shpFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _shpFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

export function _shpFinalStart(monster) {
    if (_shpFinal || !monster) return;

    // The forge goes quiet: kill every other run of this boss (the finale
    // owns the arena).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    _shpPools = [];

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        count: SHP_FINAL_BEATS,
        beat: 0,
        coresUp: 3,
        arm: Math.random() * 360,
        omega: SHP_ARM_OMEGAS[0],
        px: W / 2, py: H / 2,
        monolith: null, arms: [],
        cores: [],          // { ang, el, hp, lit, shattered }
        overlay: null, fxRun: null, beatTimer: null,
    };
    _shpFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds monolith, arms and the sweep loop.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Colossal monolith at the arena centre.
    const monolith = document.createElement('div');
    monolith.className = 'sx-shp-gmonolith';
    monolith.textContent = '🗿';
    monolith.style.left = Math.round(g.px - 52) + 'px';
    monolith.style.top = Math.round(g.py - 52) + 'px';
    document.body.appendChild(monolith);
    g.monolith = monolith;
    g.fxRun.els.push(monolith);
    requestAnimationFrame(() => monolith.classList.add('sx-shp-gmonolith-on'));

    // Three frost arms (120° apart), anchored at the monolith.
    const maxR = Math.hypot(W, H);
    g.arms = [0, 120, 240].map(() => {
        const el = document.createElement('div');
        el.className = 'sx-shp-arm';
        el.style.left = Math.round(g.px) + 'px';
        el.style.top = Math.round(g.py - 11) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return el;
    });

    // Cores: three 60° arcs, one per arm lane, at 120° spacing. The lit
    // core is the safe arc the player must stand in - and body-check.
    g.cores = [0, 120, 240].map((ang) => {
        const el = document.createElement('div');
        el.className = 'sx-shp-core';
        el.textContent = '💎';
        el.style.left = Math.round(g.px + Math.cos(ang * Math.PI / 180) * 120 - 20) + 'px';
        el.style.top = Math.round(g.py + Math.sin(ang * Math.PI / 180) * 120 - 20) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return { ang, el, hp: SHP_CORE_HITS, lit: false, shattered: false };
    });

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'sx-shp-cd';
    ov.innerHTML =
        '<div class="sx-shp-cd-label">⛄ THE SHAPED WINTER</div>' +
        '<div class="sx-shp-cd-num sx-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="sx-shp-cd-hint">Stand on the lit core - it shields you from the arms. Shatter all three!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_shp_final_cd', '⛄💀 THE SHAPED WINTER - shatter the cores!', '#7dd3fc');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss channels.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-shp-channelling');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;
    let touchCd = 0, coreTouchCd = 0;

    // Lit-core helper: the lit core's arc = ±55° around its angle.
    const litCore = () => g.cores.find(c2 => c2.lit && !c2.shattered) || null;

    // One loop drives everything: arms sweep, cores light, player cracks.
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        g.arm += g.omega * dtS;
        g.arms.forEach((el, i) => { el.style.rotate = (g.arm + i * 120) + 'deg'; });
        const c = _nkPlayerCenter();
        _nkPlayerRect();

        // Arm sweep damage (outside the monolith hub; the lit core shelters).
        const lit0 = litCore();
        const sheltered = c && lit0 && Math.hypot(c.x - (g.px + Math.cos(lit0.ang * Math.PI / 180) * 120),
            c.y - (g.py + Math.sin(lit0.ang * Math.PI / 180) * 120)) < 70;
        if (c && now >= touchCd && !sheltered && !g.breaking) {
            const dx = c.x - g.px, dy = c.y - g.py;
            const d = Math.hypot(dx, dy);
            if (d > 90) {
                const pa = Math.atan2(dy, dx) * 180 / Math.PI;
                for (let i = 0; i < 3; i++) {
                    if (g.cores[i].shattered) continue; // shattered core's arm stalls out
                    // Distance to the painted beam (22px wide), not an angle,
                    // so near and far hits match what you see.
                    const diff = ((pa - (g.arm + i * 120)) % 360 + 360) % 360;
                    const off = Math.abs(Math.sin(diff * Math.PI / 180)) * d;
                    if ((diff < 90 || diff > 270) && off < 11 + 14) {
                        touchCd = now + SHP_HIT_CD_MS;
                        _shpTouch(SHP_ARM_DMG, level, 'Frost Arm');
                        break;
                    }
                }
            }
        }

        // Core cracking: body-check the lit core (its arc is "safe" - the
        // arm behind it is stalled while the core is lit).
        const lc = litCore();
        if (lc && c && now >= coreTouchCd) {
            const cx = g.px + Math.cos(lc.ang * Math.PI / 180) * 120;
            const cy = g.py + Math.sin(lc.ang * Math.PI / 180) * 120;
            if (Math.hypot(c.x - cx, c.y - cy) < 58) {
                coreTouchCd = now + SHP_CORE_TOUCH_CD;
                lc.hp--;
                lc.el.classList.remove('sx-shp-core-crack1', 'sx-shp-core-crack2');
                if (lc.hp === 2) lc.el.classList.add('sx-shp-core-crack1');
                if (lc.hp === 1) lc.el.classList.add('sx-shp-core-crack2');
                _shpShards(cx, cy, false);
                if (lc.hp <= 0) {
                    lc.shattered = true;
                    lc.lit = false;
                    lc.el.classList.add('sx-shp-core-shattered');
                    _shpShards(cx, cy, true);
                    g.coresUp--;
                    if (g.coresUp <= 0) {
                        _shpFinalEnd(g, true);
                        return false;
                    }
                    _nkToast('eg_mech_shp_core_down', '❄️ Core shattered - ' + g.coresUp + ' to go!', '#4ade80');
                    // The next core lights at once - no waiting for a beat.
                    const nx = g.cores.find(c2 => !c2.shattered);
                    g.cores.forEach(c2 => { c2.lit = c2 === nx; c2.el.classList.toggle('sx-shp-core-lit', c2 === nx); });
                    const num = g.overlay && g.overlay.querySelector('.sx-shp-cd-num');
                    if (num) num.textContent = g.coresUp;
                }
            }
        }
        return true;
    });

    // Beat driver: the first beat lights a core, every beat speeds the arms
    // up; after SHP_FINAL_BEATS beats with cores left → the MONOLITH
    // BREAK. (The old driver broke the monolith on the 3rd beat, when only
    // two cores had ever been lit - shattering all three was impossible.)
    // The big number in the banner is the cores left.
    const beatMs = SHP_BEAT_MS * (_SHP_DEBUG_SLOW ? 8 : 1);
    const numEl = g.overlay && g.overlay.querySelector('.sx-shp-cd-num');
    if (numEl) numEl.textContent = g.coresUp;
    const lightNext = () => {
        if (!_shpFinal || _shpFinal !== g || g.finished) return;
        if (_nkFrozen()) { setTimeout(lightNext, 200); return; }
        g.beat++;
        if (g.beat > SHP_FINAL_BEATS) {
            _shpBreak(g, level);
            return;
        }
        g.omega = SHP_ARM_OMEGAS[Math.min(SHP_ARM_OMEGAS.length - 1, g.beat - 1)];
        if (!g.cores.some(c2 => c2.lit && !c2.shattered)) {
            const next = g.cores.find(c2 => !c2.shattered);
            g.cores.forEach(c2 => { c2.lit = c2 === next; c2.el.classList.toggle('sx-shp-core-lit', c2 === next); });
            if (next) _nkToast('eg_mech_shp_core_lit', '💎 A core lights up - stand on it to crack it!', '#7dd3fc');
        }
        g.beatTimer = setTimeout(lightNext, beatMs);
    };
    g.beatTimer = setTimeout(lightNext, beatMs * 0.6);
}

// THE MONOLITH BREAK: the sculpture detonates - a full-screen ice
// shockwave with a safe eye at the centre.
export function _shpBreak(g, level) {
    if (!g || g.finished) return;
    _nkToast('eg_mech_shp_break', '⛄💀 THE MONOLITH BREAK - get into the ring at the centre!', '#7dd3fc');
    // Ring telegraph with a 3-2-1, then detonate. Safe: within 130px of the
    // centre - 3.2s covers a walk from any corner (320 px/s + reaction).
    g.breaking = true;
    const ring = document.createElement('div');
    ring.className = 'sx-shp-breakring';
    ring.style.left = Math.round(g.px) + 'px';
    ring.style.top = Math.round(g.py) + 'px';
    ring.innerHTML = '<span class="sx-shp-break-count"></span>';
    document.body.appendChild(ring);
    g.fxRun.els.push(ring);
    const hint = g.overlay && g.overlay.querySelector('.sx-shp-cd-hint');
    if (hint) hint.textContent = 'MONOLITH BREAK - get into the ring at the centre!';
    const SAFE_R = 130;
    const warnMs = 3200 * (_SHP_DEBUG_SLOW ? 8 : 1);
    const t0 = performance.now();
    const countEl = ring.querySelector('.sx-shp-break-count');
    const cd = setInterval(() => {
        const left = warnMs - (performance.now() - t0);
        if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
        if (left <= 0) clearInterval(cd);
    }, 100);
    if (g.fxRun) g.fxRun.timers.push(cd);
    setTimeout(() => {
        if (!g || g.finished) return;
        try { ring.remove(); } catch (e) {}
        _shpShards(g.px, g.py, true);
        document.body.classList.add('sx-shp-flash');
        const fid = setTimeout(() => document.body.classList.remove('sx-shp-flash'), 700);
        if (g.fxRun) g.fxRun.timers.push(fid);
        const c = _nkPlayerCenter();
        if (c && Math.hypot(c.x - g.px, c.y - g.py) > SAFE_R) {
            _shpTouch(SHP_BREAK_DMG, level, 'MONOLITH BREAK');
        }
        setTimeout(() => _shpFinalEnd(g, false), _SHP_DEBUG_SLOW ? 5000 : 1100);
    }, warnMs);
}

export function _shpFinalEnd(g, success) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.beatTimer) { clearTimeout(g.beatTimer); g.beatTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.monolith) { try { g.monolith.remove(); } catch (e) {} g.monolith = null; }
    g.arms.forEach(a => { try { a.remove(); } catch (e) {} });
    g.arms = [];
    g.cores.forEach(c2 => { try { c2.el.remove(); } catch (e) {} });
    g.cores = [];
    if (g.fxRun) { try { _nkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    document.body.classList.remove('sx-shp-flash');
    document.querySelectorAll('.sx-shp-channelling').forEach(el => el.classList.remove('sx-shp-channelling'));

    const m = (g.monsterId && typeof _monsters !== 'undefined')
        ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _bossScheduleMechanics === 'function') {
            try { _bossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e2) {} }
    }
    if (_shpFinal === g) _shpFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _shpTeardown() {
    if (_shpFinal) { try { _shpFinalEnd(_shpFinal, false); } catch (e) {} _shpFinal = null; }
    _shpPools = [];
    document.querySelectorAll('.sx-shp-riftwarn, .sx-shp-fissure, .sx-shp-front, .sx-shp-pool, ' +
        '.sx-shp-mono, .sx-shp-wall, .sx-shp-walker, .sx-shp-shardlet, ' +
        '.sx-shp-gmonolith, .sx-shp-arm, .sx-shp-core, .sx-shp-cd, ' +
        '.sx-shp-breakring, .sx-shp-shards').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('sx-shp-flash');
    document.querySelectorAll('.sx-shp-channelling').forEach(el => el.classList.remove('sx-shp-channelling'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SHP_DEBUG.fire('rift'|'monos'|'walker', phase) - runs one now
//   _SHP_DEBUG.final()                              - SHAPED WINTER now
if (typeof window !== 'undefined') {
    window._SHP_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_shaper') : null;
            if (!monster) return 'no shaper alive';
            const fn = name === 'rift' ? _mechShpRift
                : name === 'monos' ? _mechShpMonoliths
                : name === 'walker' ? _mechShpWalker : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'rift' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_shaper') : null;
            if (!monster) return 'no shaper alive';
            _shpFinalStart(monster);
            return 'THE SHAPED WINTER started';
        },
    };
}
