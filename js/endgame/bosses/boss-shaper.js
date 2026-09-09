//------------------------------------------------------------------------
//-------------------BOSS: THE SHAPER (boss_shaper)------------------------
//------------------------------------------------------------------------
// REWORK — snow-globe homage, rebuilt as a sculptor of winter. The Shaper
// does not merely chill the floor: it SHAPES the arena. It plants ice
// monoliths that erect walls of frost, snaps a glacier finger at you,
// and sculpts living ice that walks. The finale is the sculpture itself:
// the SHAPED WINTER — the boss assembles a colossal ice monolith that
// grinds the whole arena with rotating frost arms while you shatter its
// three exposed cores.
//
//   Phase 1 (100–60%) — GLACIER RIFT (signature, upgraded). Frost fissures
//                       spider out from the boss side and erupt in a
//                       rolling wave — no longer instant zones, but a
//                       CREeping front you outpace. Where the front
//                       settles, lingering ice pools remain (the old
//                       domains, kept as the aftermath).
//                       Plus SOUL TITHE (shared).
//   Phase 2 ( ≤60%)   — FROST MONOLITHS. The Shaper plants rune-carved
//                       monoliths at the edges; each erects a growing wall
//                       of frost that slowly SHRINKS the arena. Break the
//                       monoliths (3 hits each) to stop the walls.
//                       Plus ICE WALKER. A sculpted ice sentinel stalks
//                       you, trailing a freezing wake — it shatters on
//                       contact, spawning shard shrapnel.
//   Phase 3 ( ≤30%)   — Three monoliths, two walkers, the rift front
//                       closes faster. Winter is winning.
//   Finale ( ≤10%)    — ⛄ THE SHAPED WINTER (one-shot set-piece): the boss
//                       assembles a colossal ice monolith at the centre
//                       and goes immune. Three frost arms (like a radar
//                       blade) sweep the arena, spinning faster each
//                       beat — and three CORES on the monolith's faces
//                       light up one at a time. Reach the lit core's safe
//                       arc and land 3 hits to SHATTER it; a shattered
//                       core stalls the sweep. Shatter all three before
//                       the final beat to break the sculpture — otherwise
//                       the MONOLITH BREAK: a full-screen ice shockwave
//                       (huge damage, only the eye at the centre is safe).
//                       Charge bar frozen for the whole set-piece (gate
//                       in _egTickPlayer via _egShpFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_SHP_DEBUG_SLOW = true;
const _EG_SHP_DEBUG_MULT = _EG_SHP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_shaper: {
        id: 'boss_shaper', name: 'The Shaper', emoji: '❄️',
        baseHP: 1060, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_shaper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'glacier_rift', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechShpRift' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
            { name: 'frost_monoliths', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechShpMonoliths', phase2Only: true },
            { name: 'ice_walker', intervalBase: 24000, intervalVariance: 6000, handler: '_egMechShpWalker', phase2Only: true },
        ],
        onPhaseEnter: _egShpOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_SHP_POOL_DMG      = [0, 9, 11, 13];   // %maxHP/s ice pool DoT
const EG_SHP_FRONT_DMG     = [0, 0.11, 0.13, 0.16]; // %maxHP rift-front eruption
const EG_SHP_WALL_DMG      = 0.10;             // %maxHP frost wall contact
const EG_SHP_WALKER_DMG    = [0, 0, 0.10, 0.12]; // %maxHP walker contact
const EG_SHP_SHARD_DMG     = 0.08;             // %maxHP shard shrapnel
const EG_SHP_ARM_DMG       = 0.12;             // %maxHP finale arm sweep
const EG_SHP_BREAK_DMG     = 0.35;             // %maxHP MONOLITH BREAK wave
const EG_SHP_HIT_CD_MS     = 700;              // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Shaper hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egShpHitCd = 0;
function _egShpTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egShpHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egShpHitCd = now + EG_SHP_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'cold', level);
    _egNkAbilityHitToast(dealt, 'The Shaper', label);
    return true;
}

// Ice-shard burst where a shatter/eruption lands (visual only, body-level
// so it survives the run ending in the same frame).
function _egShpShards(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-shp-shards' + (big ? ' eg-shp-shards-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'eg-shp-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (big ? 88 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 420) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_SHP_DEBUG_SLOW ? 1900 : 950);
}

// Lingering ice pools ACROSS casts (the rift's aftermath). Entries expire
// by timestamp; capped so recasts cannot pave the whole screen.
let _egShpPools = []; // { x, y, radius, until }
function _egShpPrunePools(now) {
    _egShpPools = _egShpPools.filter(z => z.until > now);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: GLACIER RIFT (signature, upgraded)-----------
//------------------------------------------------------------------------
// Frost fissures spider out from a random side and erupt in a ROLLING
// WAVE: a crested front (≈180px band) sweeps the screen over ~2.2s and
// erupts as it passes — outpace it or slip between the fissure gaps.
// Where the front settles, LINGERING ICE POOLS remain (the old frozen
// domains, now clearly the aftermath of the front) that drain while you
// stand in them.
const EG_SHP_RIFT_FRONT_MS = 2200;
const EG_SHP_POOL_LIFE = 7000;

function _egMechShpRift(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const frontMs = EG_SHP_RIFT_FRONT_MS * _EG_SHP_DEBUG_MULT;
    const poolLife = EG_SHP_POOL_LIFE * _EG_SHP_DEBUG_MULT;
    const frontDmg = EG_SHP_FRONT_DMG[p];
    const poolDot = EG_SHP_POOL_DMG[p] / 100;

    // The front sweeps from a random side; fissures: 3 gaps the player can
    // slip through (the band is not uniformly lethal across its sweep).
    const fromLeft = Math.random() < 0.5;
    const warnMs = 1100 * _EG_SHP_DEBUG_MULT;
    const bandH = 180;
    const gaps = [];
    for (let i = 0; i < 3; i++) gaps.push(140 + Math.random() * (H - 280));
    gaps.sort((a, b) => a - b);

    // Telegraph: fissure lines across the sweep axis + arrows on the origin.
    const warn = _egNkEl(run, 'div', 'eg-shp-riftwarn');
    warn.style.top = '0px';
    warn.style.width = W + 'px';
    warn.style.height = H + 'px';
    gaps.forEach(g => {
        const line = _egNkEl(run, 'div', 'eg-shp-fissure');
        line.style.top = Math.round(g - 3) + 'px';
        line.style.left = '0px';
        line.style.width = W + 'px';
    });

    _egNkToast('eg_mech_shp_rift', '❄️ The Shaper: GLACIER RIFT — outrun the front!', '#7dd3fc');

    const poolEls = new Map();  // zone → its element (persistent per pool)
    let t = 0, erupted = false, frontX = fromLeft ? 0 : W;
    let dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        if (!erupted && t >= warnMs) {
            erupted = true;
            const front = _egNkEl(run, 'div', 'eg-shp-front' + (fromLeft ? ' eg-shp-from-left' : ' eg-shp-from-right'));
            front.style.top = '0px';
            front.style.height = H + 'px';
            front.style.width = bandH + 'px';
            front.style.left = Math.round(fromLeft ? -bandH : W) + 'px';
            run.frontEl = front;
            _egShpShards(fromLeft ? 30 : W - 30, H / 2, false);
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
                if (inBand && !inGap && now >= _egShpHitCd) {
                    _egShpHitCd = now + EG_SHP_HIT_CD_MS;
                    _egShpTouch(frontDmg, level, 'Glacier Rift');
                }
            }
            if (k >= 1) {
                // The front settles → lingering ice pools between the gaps.
                _egShpPrunePools(now);
                const room = Math.max(0, 5 - _egShpPools.length);
                const seeds = gaps.slice(0, Math.min(gaps.length, room));
                seeds.forEach(g => {
                    const el = _egNkEl(run, 'div', 'eg-shp-pool');
                    el.style.width = '190px';
                    el.style.height = '190px';
                    el.style.transform = 'translate(' + Math.round(W / 2 - 95) + 'px,' + Math.round(g - 95) + 'px)';
                    const zone = { x: W / 2, y: g, radius: 95, until: now + poolLife };
                    _egShpPools.push(zone);
                    poolEls.set(zone, el);
                });
                try { run.frontEl.remove(); } catch (e) {}
                run.frontEl = null;
            }
        }
        // Pools drain while you stand in them; visuals persist per pool
        // (created once at settle-time), then fade out on expiry.
        _egShpPrunePools(now);
        Array.from(poolEls.entries()).forEach(([z, el]) => {
            if (z.until <= now) {
                el.classList.add('eg-shp-pool-out');
                const rm = setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
                run.timers.push(rm);
                poolEls.delete(z);
            }
        });
        if (pr) {
            const inside = _egShpPools.some(z => _egNkCircleHit(z.x, z.y, z.radius, pr, 0));
            if (inside) {
                _egNkDotTick(run, poolDot, dtS, level, 'cold');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#7dd3fc');
                }
            } else {
                run.dotAcc = 0;
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
// The Shaper plants rune-carved monoliths at the edges; each erects a
// growing wall of frost that slowly SHRINKS the arena toward the centre.
// Break the monoliths (3 hits each) to stop their walls. Walls despawn
// when their monolith dies; unbroken walls retract after the cast ends.
const EG_SHP_MONO_COUNT  = [0, 0, 2, 3];
const EG_SHP_MONO_HITS   = 3;
const EG_SHP_WALL_GROW   = 130;    // px/s the wall extends
const EG_SHP_MONO_LIFE   = 9000;

function _egMechShpMonoliths(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_SHP_MONO_COUNT[p];
    const lifeMs = EG_SHP_MONO_LIFE * _EG_SHP_DEBUG_MULT;

    // Monolith spots: near the screen edges (inset a bit), spread apart.
    const spots = [];
    const cands = [
        [90, 120], [W - 90, 120], [90, H * 0.6], [W - 90, H * 0.6], [W / 2, 100], [W / 2, H - 90],
    ];
    for (let i = 0; i < count && cands.length; i++) {
        spots.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
    }

    _egNkToast('eg_mech_shp_monos', '❄️ The Shaper: FROST MONOLITHS — break them to stop the walls!', '#7dd3fc');

    const monos = spots.map(spot => {
        const el = _egNkEl(run, 'div', 'eg-shp-mono', '🗿');
        el.style.left = Math.round(spot[0] - 24) + 'px';
        el.style.top = Math.round(spot[1] - 24) + 'px';
        // Wall grows from the monolith toward the arena centre.
        const dx = W / 2 - spot[0], dy = H / 2 - spot[1];
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const wall = _egNkEl(run, 'div', 'eg-shp-wall');
        wall.style.left = Math.round(spot[0]) + 'px';
        wall.style.top = Math.round(spot[1]) + 'px';
        wall.style.width = '0px';
        wall.style.rotate = ang + 'deg';
        return { x: spot[0], y: spot[1], el, wall, len, hp: EG_SHP_MONO_HITS, dead: false };
    });

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        let active = false;
        monos.forEach(m => {
            if (m.dead) return;
            active = true;
            const grown = Math.min(m.len, t * EG_SHP_WALL_GROW);
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
                    touchCd = now + EG_SHP_HIT_CD_MS;
                    _egShpTouch(EG_SHP_WALL_DMG, level, 'Frost Wall');
                }
            }
        });
        // Cast timeout: unbroken monoliths shatter on their own.
        if (t >= lifeMs) {
            monos.forEach(m => {
                if (!m.dead) {
                    m.dead = true;
                    _egShpShards(m.x, m.y, false);
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
    // touches them 3 times while DODGING — body-check the ice. Each touch
    // (with a cooldown) cracks a stage; the 3rd shatters it.
    const crackLoop = _egNkNewRun(monster && monster.id, true);
    let crackCd = 0;
    _egNkLoop(crackLoop, (dtS, now) => {
        const pr = _egNkPlayerRect();
        if (pr && now >= crackCd) {
            const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
            for (const m of monos) {
                if (m.dead) continue;
                if (Math.hypot(pc.x - m.x, pc.y - m.y) < 46) {
                    crackCd = now + 500;
                    m.hp--;
                    m.el.classList.remove('eg-shp-mono-crack1', 'eg-shp-mono-crack2');
                    if (m.hp === 2) m.el.classList.add('eg-shp-mono-crack1');
                    if (m.hp === 1) m.el.classList.add('eg-shp-mono-crack2');
                    _egShpShards(m.x, m.y, false);
                    if (m.hp <= 0) {
                        m.dead = true;
                        _egShpShards(m.x, m.y, true);
                        try { m.el.remove(); } catch (e) {}
                        try { m.wall.remove(); } catch (e) {}
                        _egNkToast('eg_mech_shp_mono_down', '❄️ Monolith shattered — the wall recedes!', '#4ade80');
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
// shatters on contact — dealing its hit AND spawning shard shrapnel that
// scatters outward. Phase 3 spawns two walkers.
const EG_SHP_WALKER_SPEED = 165;
const EG_SHP_WALKER_TURN = 1.9;
const EG_SHP_WALKER_LIFE = 9000;
const EG_SHP_SHARD_COUNT = 6;

function _egMechShpWalker(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const speed = EG_SHP_WALKER_SPEED / _EG_SHP_DEBUG_MULT;
    const lifeMs = EG_SHP_WALKER_LIFE * _EG_SHP_DEBUG_MULT;
    const dmgPct = EG_SHP_WALKER_DMG[p];

    const mk = (delayMs) => {
        const delayId = setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            const wk = {
                x: side === 0 ? 50 : side === 1 ? W - 50 : W * (0.2 + Math.random() * 0.6),
                y: side === 2 ? 50 : side === 3 ? H - 50 : H * (0.2 + Math.random() * 0.6),
                ang: Math.random() * Math.PI * 2, born: 0, el: null, dead: false,
            };
            wk.el = _egNkEl(run, 'div', 'eg-shp-walker', '⛄');
            wk.el.style.left = Math.round(wk.x - 18) + 'px';
            wk.el.style.top = Math.round(wk.y - 18) + 'px';
            walkers.push(wk);
        }, delayMs);
        run.timers.push(delayId);
    };

    const walkers = [];
    const n = p >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) mk(i * 1800 * _EG_SHP_DEBUG_MULT);

    _egNkToast('eg_mech_shp_walker', '❄️ The Shaper: ICE WALKER — it shatters on contact!', '#7dd3fc');

    const shards = [];   // { x, y, vx, vy, el, born, dead }
    let t = 0, touchCd = 0, shardTouchCd = 0;
    const shatter = (wk) => {
        wk.dead = true;
        try { wk.el.remove(); } catch (e) {}
        _egShpShards(wk.x, wk.y, false);
        for (let i = 0; i < EG_SHP_SHARD_COUNT; i++) {
            const a = (i / EG_SHP_SHARD_COUNT) * Math.PI * 2 + Math.random() * 0.5;
            const spd = (230 + Math.random() * 90) / _EG_SHP_DEBUG_MULT;
            const el = _egNkEl(run, 'div', 'eg-shp-shardlet', '❄');
            el.style.left = Math.round(wk.x - 8) + 'px';
            el.style.top = Math.round(wk.y - 8) + 'px';
            shards.push({ x: wk.x, y: wk.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, el, born: t });
        }
    };

    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        let active = false;
        walkers.forEach(wk => {
            if (wk.dead) return;
            active = true;
            if (!wk.born) wk.born = t;
            // Stalk: slow homing with a steering cap (readable pursuit).
            if (c) {
                const want = Math.atan2(c.y - wk.y, c.x - wk.x);
                let diff = ((want - wk.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const max = EG_SHP_WALKER_TURN * dtS;
                wk.ang += Math.max(-max, Math.min(max, diff));
            }
            wk.x += Math.cos(wk.ang) * speed * dtS;
            wk.y += Math.sin(wk.ang) * speed * dtS;
            if (wk.x < 30 || wk.x > W - 30) { wk.ang = Math.PI - wk.ang; wk.x = Math.max(30, Math.min(W - 30, wk.x)); }
            if (wk.y < 30 || wk.y > H - 30) { wk.ang = -wk.ang; wk.y = Math.max(30, Math.min(H - 30, wk.y)); }
            wk.el.style.left = Math.round(wk.x - 18) + 'px';
            wk.el.style.top = Math.round(wk.y - 18) + 'px';
            // Contact: the walker shatters — hit + shrapnel.
            if (pr && now >= touchCd && _egNkCircleHit(wk.x, wk.y, 20, pr, 0)) {
                touchCd = now + EG_SHP_HIT_CD_MS;
                _egShpTouch(dmgPct, level, 'Ice Walker');
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
            if (pr && now >= shardTouchCd && _egNkCircleHit(s.x, s.y, 9, pr, 0)) {
                shardTouchCd = now + EG_SHP_HIT_CD_MS;
                s.dead = true;
                try { s.el.remove(); } catch (e) {}
                _egShpTouch(EG_SHP_SHARD_DMG, level, 'Ice Shrapnel');
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
// The Shaper assembles a colossal ice monolith at the centre and goes
// immune. Three frost arms sweep the arena like a radar blade, spinning
// faster each beat — and three CORES on the monolith's faces light up one
// at a time. Reach the lit core's arc and stand there to SHATTER it (3
// stage-cracks, each stalling the sweep briefly); a shattered core stops
// its arm pair. Shatter all three before the final beat to break the
// sculpture — otherwise the MONOLITH BREAK: a full-screen ice shockwave
// (only the eye at the centre is safe). Charge bar frozen for the whole
// set-piece (gate in _egTickPlayer via _egShpFinalActive).
const EG_SHP_FINAL_BEATS = 3;
const EG_SHP_CORE_HITS = 3;          // player touches to shatter a core
const EG_SHP_CORE_TOUCH_CD = 420;    // ms between crack touches
const EG_SHP_ARM_OMEGAS = [70, 100, 135]; // deg/s per beat
const EG_SHP_BEAT_MS = 5200;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egShpFinal = null;

function _egShpFinalActive() {
    return !!_egShpFinal && !_egShpFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egShpOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egShpStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egShpStartFinalWatcher(monster) {
    if (!monster || _egShpFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egShpFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egShpFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egShpFinalStart(monster) {
    if (_egShpFinal || !monster) return;

    // The forge goes quiet: kill every other run of this boss (the finale
    // owns the arena).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });
    _egShpPools = [];

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_SHP_FINAL_BEATS,
        beat: 0,
        coresUp: 3,
        arm: Math.random() * 360,
        omega: EG_SHP_ARM_OMEGAS[0],
        px: W / 2, py: H / 2,
        monolith: null, arms: [],
        cores: [],          // { ang, el, hp, lit, shattered }
        overlay: null, fxRun: null, beatTimer: null,
    };
    _egShpFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds monolith, arms and the sweep loop.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Colossal monolith at the arena centre.
    const monolith = document.createElement('div');
    monolith.className = 'eg-shp-gmonolith';
    monolith.textContent = '🗿';
    monolith.style.left = Math.round(g.px - 52) + 'px';
    monolith.style.top = Math.round(g.py - 52) + 'px';
    document.body.appendChild(monolith);
    g.monolith = monolith;
    g.fxRun.els.push(monolith);
    requestAnimationFrame(() => monolith.classList.add('eg-shp-gmonolith-on'));

    // Three frost arms (120° apart), anchored at the monolith.
    const maxR = Math.hypot(W, H);
    g.arms = [0, 120, 240].map(() => {
        const el = document.createElement('div');
        el.className = 'eg-shp-arm';
        el.style.left = Math.round(g.px) + 'px';
        el.style.top = Math.round(g.py - 11) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return el;
    });

    // Cores: three 60° arcs, one per arm lane, at 120° spacing. The lit
    // core is the safe arc the player must stand in — and body-check.
    g.cores = [0, 120, 240].map((ang) => {
        const el = document.createElement('div');
        el.className = 'eg-shp-core';
        el.textContent = '💎';
        el.style.left = Math.round(g.px + Math.cos(ang * Math.PI / 180) * 120 - 20) + 'px';
        el.style.top = Math.round(g.py + Math.sin(ang * Math.PI / 180) * 120 - 20) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return { ang, el, hp: EG_SHP_CORE_HITS, lit: false, shattered: false };
    });

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-shp-cd';
    ov.innerHTML =
        '<div class="eg-shp-cd-label">⛄ THE SHAPED WINTER</div>' +
        '<div class="eg-shp-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-shp-cd-hint">Body-check the lit core — shatter all three!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_shp_final_cd', '⛄💀 THE SHAPED WINTER — shatter the cores!', '#7dd3fc');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss channels.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-shp-channelling');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;
    let touchCd = 0, coreTouchCd = 0;

    // Lit-core helper: the lit core's arc = ±55° around its angle.
    const litCore = () => g.cores.find(c2 => c2.lit && !c2.shattered) || null;

    // One loop drives everything: arms sweep, cores light, player cracks.
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        g.arm += g.omega * dtS;
        g.arms.forEach((el, i) => { el.style.rotate = (g.arm + i * 120) + 'deg'; });
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();

        // Arm sweep damage (outside the monolith hub).
        if (c && now >= touchCd) {
            const dx = c.x - g.px, dy = c.y - g.py;
            const d = Math.hypot(dx, dy);
            if (d > 90) {
                const pa = Math.atan2(dy, dx) * 180 / Math.PI;
                for (let i = 0; i < 3; i++) {
                    if (g.cores[i].shattered) continue; // shattered core's arm stalls out
                    const diff = ((pa - (g.arm + i * 120)) % 360 + 360) % 360;
                    if (diff < 4 || diff > 356) {
                        touchCd = now + EG_SHP_HIT_CD_MS;
                        _egShpTouch(EG_SHP_ARM_DMG, level, 'Frost Arm');
                        break;
                    }
                }
            }
        }

        // Core cracking: body-check the lit core (its arc is "safe" — the
        // arm behind it is stalled while the core is lit).
        const lc = litCore();
        if (lc && c && now >= coreTouchCd) {
            const cx = g.px + Math.cos(lc.ang * Math.PI / 180) * 120;
            const cy = g.py + Math.sin(lc.ang * Math.PI / 180) * 120;
            if (Math.hypot(c.x - cx, c.y - cy) < 58) {
                coreTouchCd = now + EG_SHP_CORE_TOUCH_CD;
                lc.hp--;
                lc.el.classList.remove('eg-shp-core-crack1', 'eg-shp-core-crack2');
                if (lc.hp === 2) lc.el.classList.add('eg-shp-core-crack1');
                if (lc.hp === 1) lc.el.classList.add('eg-shp-core-crack2');
                _egShpShards(cx, cy, false);
                if (lc.hp <= 0) {
                    lc.shattered = true;
                    lc.lit = false;
                    lc.el.classList.add('eg-shp-core-shattered');
                    _egShpShards(cx, cy, true);
                    g.coresUp--;
                    if (g.coresUp <= 0) {
                        _egShpFinalEnd(g, true);
                        return false;
                    }
                    _egNkToast('eg_mech_shp_core_down', '❄️ Core shattered — ' + g.coresUp + ' to go!', '#4ade80');
                }
            }
        }
        return true;
    });

    // Beat driver: lights a core each beat and speeds the arms up. Final
    // beat without all cores shattered → the MONOLITH BREAK.
    const beatMs = EG_SHP_BEAT_MS * (_EG_SHP_DEBUG_SLOW ? 8 : 1);
    const lightNext = () => {
        if (!_egShpFinal || _egShpFinal !== g || g.finished) return;
        if (_egNkFrozen()) { setTimeout(lightNext, 200); return; }
        g.count--;
        const num = g.overlay && g.overlay.querySelector('.eg-shp-cd-num');
        if (num) {
            num.textContent = Math.max(0, g.count);
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
        if (g.count <= 0) {
            // THE MONOLITH BREAK: full-screen ice shockwave — only the eye
            // at the centre is safe.
            _egShpBreak(g, level);
            return;
        }
        g.beat++;
        g.omega = EG_SHP_ARM_OMEGAS[Math.min(EG_SHP_ARM_OMEGAS.length - 1, g.beat)];
        // Light the next intact core (and unlight stale ones).
        const next = g.cores.find(c2 => !c2.shattered && !c2.lit) || g.cores.find(c2 => !c2.shattered);
        g.cores.forEach(c2 => { if (c2 !== next) c2.lit = false; c2.el.classList.toggle('eg-shp-core-lit', c2 === next); });
        if (next) {
            next.lit = true;
            _egNkToast('eg_mech_shp_core_lit', '💎 A core lights up — crack it!', '#7dd3fc');
        }
        g.beatTimer = setTimeout(lightNext, beatMs);
    };
    g.beatTimer = setTimeout(lightNext, beatMs * 0.6);
}

// THE MONOLITH BREAK: the sculpture detonates — a full-screen ice
// shockwave with a safe eye at the centre.
function _egShpBreak(g, level) {
    if (!g || g.finished) return;
    const W = window.innerWidth, H = window.innerHeight;
    _egNkToast('eg_mech_shp_break', '⛄💀 THE MONOLITH BREAK — reach the eye!', '#7dd3fc');
    // Ring telegraph, then detonate. Safe: within 130px of the centre.
    const ring = document.createElement('div');
    ring.className = 'eg-shp-breakring';
    ring.style.left = Math.round(g.px) + 'px';
    ring.style.top = Math.round(g.py) + 'px';
    document.body.appendChild(ring);
    g.fxRun.els.push(ring);
    const SAFE_R = 130;
    const warnMs = 1500 * (_EG_SHP_DEBUG_SLOW ? 8 : 1);
    setTimeout(() => {
        if (!g || g.finished) return;
        try { ring.remove(); } catch (e) {}
        _egShpShards(g.px, g.py, true);
        document.body.classList.add('eg-shp-flash');
        const fid = setTimeout(() => document.body.classList.remove('eg-shp-flash'), 700);
        if (g.fxRun) g.fxRun.timers.push(fid);
        const c = _egNkPlayerCenter();
        if (c && Math.hypot(c.x - g.px, c.y - g.py) > SAFE_R) {
            _egShpTouch(EG_SHP_BREAK_DMG, level, 'MONOLITH BREAK');
        }
        setTimeout(() => _egShpFinalEnd(g, false), _EG_SHP_DEBUG_SLOW ? 5000 : 1100);
    }, warnMs);
}

function _egShpFinalEnd(g, success) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.beatTimer) { clearTimeout(g.beatTimer); g.beatTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.monolith) { try { g.monolith.remove(); } catch (e) {} g.monolith = null; }
    g.arms.forEach(a => { try { a.remove(); } catch (e) {} });
    g.arms = [];
    g.cores.forEach(c2 => { try { c2.el.remove(); } catch (e) {} });
    g.cores = [];
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-shp-flash');
    document.querySelectorAll('.eg-shp-channelling').forEach(el => el.classList.remove('eg-shp-channelling'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }
    if (_egShpFinal === g) _egShpFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egShpTeardown() {
    if (_egShpFinal) { try { _egShpFinalEnd(_egShpFinal, false); } catch (e) {} _egShpFinal = null; }
    _egShpPools = [];
    document.querySelectorAll('.eg-shp-riftwarn, .eg-shp-fissure, .eg-shp-front, .eg-shp-pool, ' +
        '.eg-shp-mono, .eg-shp-wall, .eg-shp-walker, .eg-shp-shardlet, ' +
        '.eg-shp-gmonolith, .eg-shp-arm, .eg-shp-core, .eg-shp-cd, ' +
        '.eg-shp-breakring, .eg-shp-shards').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-shp-flash');
    document.querySelectorAll('.eg-shp-channelling').forEach(el => el.classList.remove('eg-shp-channelling'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_SHP_DEBUG.fire('rift'|'monos'|'walker', phase) — runs one now
//   _EG_SHP_DEBUG.final()                              — SHAPED WINTER now
if (typeof window !== 'undefined') {
    window._EG_SHP_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_shaper') : null;
            if (!monster) return 'no shaper alive';
            const fn = name === 'rift' ? _egMechShpRift
                : name === 'monos' ? _egMechShpMonoliths
                : name === 'walker' ? _egMechShpWalker : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'rift' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_shaper') : null;
            if (!monster) return 'no shaper alive';
            _egShpFinalStart(monster);
            return 'THE SHAPED WINTER started';
        },
    };
}
