import { _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerRect, _nkToast, _ptSegDist } from './shared-boss-abilities.js';
import { SHP_COLOR, _SHP_DEBUG_MULT, _shpPC, _shpPlace, _shpShards, _shpTouch } from './boss-shaper.js';

//------------------------------------------------------------------------
//-------------------THE FROSTWRIGHT: FROST MONOLITHS + ICE WALKERS (60%+)------
//------------------------------------------------------------------------
// Frost Monoliths: rune obelisks rise at the edges and each grows a wall of
// ice toward the middle. Walk into a monolith three times to shatter it and
// make its wall crumble. The wall runs right across the arena and, once fully
// grown, sweeps round like a clock hand until the monolith shatters by itself.
// Ice Walkers: snowmen rise from a frost circle and stalk you, leaving
// frozen footprints. Touching one shatters it (a hit plus flying shards);
// left alone it bursts after a few seconds.
//------------------------------------------------------------------------

// ── Monolith tuning, indexed by boss phase (2..3) ──
const MONO_COUNT = [0, 0, 2, 3];              // monoliths per cast
const MONO_HITS = 3;                          // walk-ins that shatter one
const MONO_RAM_R = 52;                        // px from its centre that counts as a walk-in
const MONO_RAM_CD_MS = 480;                   // between two walk-ins
const MONO_WARN_MS = 1100;                    // monolith rises and the wall path shows before the wall grows
const MONO_GROW = [0, 0, 230, 260];           // px/s the wall extends
const MONO_SWEEP = [0, 0, 15, 21];            // deg/s a fully grown wall turns around its monolith (the unbroken ones sweep the arena)
const MONO_LIFE_MS = 13000;                   // unbroken monoliths shatter after this
const MONO_WALL_START = 74;                   // the wall begins this far from the monolith, so ramming never touches it
const MONO_WALL_REACH = 15;                   // px from the wall's centre line that bites
const MONO_WALL_DMG = 0.10;                   // %maxHP for touching a wall
const MONO_FADE_MS = 500;                     // the cast lingers this long so the crumble can play

// ── Walker tuning, indexed by boss phase (2..3) ──
const WLK_COUNT = [0, 0, 1, 2];               // walkers per cast
const WLK_STAGGER_MS = 1800;                  // the second one appears this much later
const WLK_WARN_MS = 900;                      // frost circle before a walker rises
const WLK_SPEED = 165;                        // px/s
const WLK_TURN = 1.9;                         // rad/s it can steer
const WLK_LIFE_MS = 9000;                     // bursts by itself after this
const WLK_CRACK_AT = 0.7;                     // shows cracks once this much of its life is gone
const WLK_HIT_R = 20;
const WLK_DMG = [0, 0, 0.10, 0.12];           // %maxHP for letting one touch you
const WLK_MIN_SPAWN_DIST = 260;               // walkers rise at least this far from you
const WLK_PRINT_MS = 170;                     // a footprint this often
const WLK_SHARDS = 6;                         // shards from a burst
const WLK_SHARD_R = 9;
const WLK_SHARD_DMG = 0.08;
const WLK_SHARD_LIFE_MS = 1400;


//------------------------------------------------------------------------
//-------------------FROST MONOLITHS---------------------------------------
//------------------------------------------------------------------------

// Spots near the edges, away from the player, spread apart.
function _monoSpots(count) {
    const W = window.innerWidth, H = window.innerHeight - 70;
    const pc = _shpPC();
    const cands = [[90, 120], [W - 90, 120], [90, H * 0.6], [W - 90, H * 0.6], [W / 2, 100], [W / 2, H - 70]]
        .filter(c => Math.hypot(c[0] - pc.x, c[1] - pc.y) > 170);
    const spots = [];
    for (let i = 0; i < count && cands.length; i++) spots.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
    return spots;
}

// One monolith: the obelisk with its ram ring and three life pips, plus the
// wall (grows later) and a dashed preview of where the wall will run.
function _monoBuild(run, spot) {
    const [x, y] = spot;
    const W = window.innerWidth, H = window.innerHeight - 70;
    const ang = Math.atan2(H / 2 - y, W / 2 - x);
    const sx = x + Math.cos(ang) * MONO_WALL_START, sy = y + Math.sin(ang) * MONO_WALL_START;
    const len = Math.max(0, Math.hypot(W / 2 - sx, H / 2 - sy)) * 1.9;   // runs right across the arena
    const el = _nkEl(run, 'div', 'sx-shp-mono');
    el.innerHTML = '<i class="sx-shp-mono-ring"></i><b class="sx-shp-mono-body"></b><span class="sx-shp-mono-pips"><i></i><i></i><i></i></span>';
    _shpPlace(el, x, y, 30, 44);
    const preview = _nkEl(run, 'div', 'sx-shp-wall-preview');
    const wall = _nkEl(run, 'div', 'sx-shp-wall');
    [preview, wall].forEach(w => {
        w.style.left = Math.round(sx) + 'px';
        w.style.top = Math.round(sy) + 'px';
        w.style.rotate = (ang * 180 / Math.PI) + 'deg';
    });
    preview.style.width = Math.round(len) + 'px';
    wall.style.width = '0px';
    return { x, y, sx, sy, ang, len, el, preview, wall, hp: MONO_HITS, dead: false, grown: 0, sweepDir: Math.random() < 0.5 ? -1 : 1 };
}

// Shatters a monolith (broken by the player, or timed out): shards, and the
// wall crumbles away.
function _monoBreak(m, byPlayer) {
    m.dead = true;
    _shpShards(m.x, m.y, true);
    m.el.classList.add('sx-shp-mono-dying');
    m.wall.classList.add('sx-shp-wall-out');
    m.preview.remove();
    if (byPlayer) _nkToast('eg_mech_shp_mono_down', '❄️ Monolith shattered - the wall crumbles!', '#4ade80');
}

// A walk-in: the monolith cracks a stage; the third shatters it.
function _monoRam(m) {
    m.hp--;
    const pips = m.el.querySelectorAll('.sx-shp-mono-pips i');
    if (pips[m.hp]) pips[m.hp].classList.add('sx-off');
    m.el.classList.remove('sx-shp-mono-hurt');
    void m.el.offsetWidth;   // restart the flash
    m.el.classList.add('sx-shp-mono-hurt');
    _shpShards(m.x, m.y, false);
    if (m.hp <= 0) _monoBreak(m, true);
}

// Grows one live wall and bites if the player is touching it.
function _monoWallStep(m, st, ctx) {
    m.grown = Math.min(m.len, (st.t - MONO_WARN_MS * _SHP_DEBUG_MULT) / 1000 * MONO_GROW[ctx.p] / _SHP_DEBUG_MULT);
    m.wall.style.width = Math.round(Math.max(0, m.grown)) + 'px';
    m.preview.classList.add('sx-shp-wall-preview-off');
    if (m.grown >= m.len) {
        m.ang += m.sweepDir * MONO_SWEEP[ctx.p] * Math.PI / 180 * (st.dtS / _SHP_DEBUG_MULT);
        m.wall.style.rotate = (m.ang * 180 / Math.PI) + 'deg';
    }
    const ex = m.sx + Math.cos(m.ang) * m.grown, ey = m.sy + Math.sin(m.ang) * m.grown;
    if (_ptSegDist(ctx.pc.x, ctx.pc.y, m.sx, m.sy, ex, ey) < MONO_WALL_REACH) _shpTouch(MONO_WALL_DMG, ctx.level, 'Frost Wall');
}

// Frost Monoliths: see the section comment.
export function _mechShpMonoliths(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const monos = _monoSpots(MONO_COUNT[p]).map(s => _monoBuild(run, s));
    const st = { t: 0, ramCd: 0, endAt: 0 };
    _nkToast('eg_mech_shp_monos', '❄️ FROST MONOLITHS - walk into each one 3 times to shatter it!', SHP_COLOR);
    _nkLoop(run, (dtS, now) => {
        st.t += dtS * 1000;
        st.dtS = dtS;
        const ctx = { p, level, pc: _shpPC() };
        if (st.endAt) return st.t < st.endAt;
        if (st.t >= MONO_LIFE_MS * _SHP_DEBUG_MULT) monos.forEach(m => { if (!m.dead) _monoBreak(m, false); });
        monos.forEach(m => {
            if (m.dead) return;
            if (st.t >= MONO_WARN_MS * _SHP_DEBUG_MULT) _monoWallStep(m, st, ctx);
            if (now >= st.ramCd && Math.hypot(ctx.pc.x - m.x, ctx.pc.y - m.y) < MONO_RAM_R) {
                st.ramCd = now + MONO_RAM_CD_MS;
                _monoRam(m);
            }
        });
        if (monos.every(m => m.dead)) st.endAt = st.t + MONO_FADE_MS;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ICE WALKERS-------------------------------------------
//------------------------------------------------------------------------

// A spawn point on one of the edges, far enough from the player.
function _wlkSpawn() {
    const W = window.innerWidth, H = window.innerHeight - 70;
    const pc = _shpPC();
    let best = null;
    for (let i = 0; i < 12; i++) {
        const side = Math.floor(Math.random() * 4);
        const pt = {
            x: side === 0 ? 50 : side === 1 ? W - 50 : W * (0.2 + Math.random() * 0.6),
            y: side === 2 ? 50 : side === 3 ? H - 50 : H * (0.2 + Math.random() * 0.6),
        };
        best = pt;
        if (Math.hypot(pt.x - pc.x, pt.y - pc.y) > WLK_MIN_SPAWN_DIST) break;
    }
    return best;
}

// A walker waiting for its turn: its frost circle appears at spawnAt.
function _wlkMake(index) {
    return { state: 'wait', spawnAt: index * WLK_STAGGER_MS * _SHP_DEBUG_MULT, x: 0, y: 0, ang: 0, age: 0, printAcc: 0, el: null, ring: null, cracked: false };
}

// The frost circle appears where the walker will rise.
function _wlkWarn(run, wk) {
    const pt = _wlkSpawn();
    wk.x = pt.x; wk.y = pt.y;
    wk.ang = Math.random() * Math.PI * 2;
    wk.ring = _nkEl(run, 'div', 'sx-shp-spawnring');
    _shpPlace(wk.ring, wk.x, wk.y, 40, 40);
    wk.state = 'warn'; wk.age = 0;
}

// The walker rises out of its circle.
function _wlkRise(run, wk) {
    try { wk.ring.remove(); } catch (e) { /* run already cleaned up */ }
    wk.el = _nkEl(run, 'div', 'sx-shp-walker', '⛄');
    _shpPlace(wk.el, wk.x, wk.y, 18, 18);
    wk.state = 'live'; wk.age = 0;
}

// Leaves a frozen footprint behind the walker.
function _wlkPrint(run, wk) {
    const pr = _nkEl(run, 'div', 'sx-shp-print');
    _shpPlace(pr, wk.x, wk.y, 9, 6);
    pr.style.rotate = (wk.ang * 180 / Math.PI) + 'deg';
    const id = setTimeout(() => { try { pr.remove(); } catch (e) { /* run already cleaned up */ } }, 1100);
    run.timers.push(id);
}

// Bursts a walker into shards that fly outward and melt.
function _wlkShatter(run, wk, shards) {
    wk.state = 'dead';
    try { wk.el.remove(); } catch (e) { /* run already cleaned up */ }
    _shpShards(wk.x, wk.y, false);
    for (let i = 0; i < WLK_SHARDS; i++) {
        const a = (i / WLK_SHARDS) * Math.PI * 2 + Math.random() * 0.5;
        const spd = (230 + Math.random() * 90) / _SHP_DEBUG_MULT;
        const el = _nkEl(run, 'div', 'sx-shp-shardlet', '❄');
        _shpPlace(el, wk.x, wk.y, 8, 8);
        shards.push({ x: wk.x, y: wk.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, age: 0, el });
    }
}

// Moves one live walker: slow homing, wall bounce, footprints, contact.
function _wlkMove(run, wk, shards, ctx) {
    wk.age += ctx.dtS * 1000;
    const want = Math.atan2(ctx.pc.y - wk.y, ctx.pc.x - wk.x);
    const diff = ((want - wk.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const max = WLK_TURN * ctx.dtS;
    wk.ang += Math.max(-max, Math.min(max, diff));
    const speed = WLK_SPEED / _SHP_DEBUG_MULT;
    wk.x += Math.cos(wk.ang) * speed * ctx.dtS;
    wk.y += Math.sin(wk.ang) * speed * ctx.dtS;
    const W = window.innerWidth, H = window.innerHeight - 70;
    if (wk.x < 30 || wk.x > W - 30) { wk.ang = Math.PI - wk.ang; wk.x = Math.max(30, Math.min(W - 30, wk.x)); }
    if (wk.y < 30 || wk.y > H - 30) { wk.ang = -wk.ang; wk.y = Math.max(30, Math.min(H - 30, wk.y)); }
    _shpPlace(wk.el, wk.x, wk.y, 18, 18);
    wk.printAcc += ctx.dtS * 1000;
    if (wk.printAcc >= WLK_PRINT_MS) { wk.printAcc = 0; _wlkPrint(run, wk); }
    const lifeMs = WLK_LIFE_MS * _SHP_DEBUG_MULT;
    if (!wk.cracked && wk.age > lifeMs * WLK_CRACK_AT) { wk.cracked = true; wk.el.classList.add('sx-shp-walker-crack'); }
    if (_nkCircleHit(wk.x, wk.y, WLK_HIT_R, ctx.pr, 0)) {
        _shpTouch(WLK_DMG[ctx.p], ctx.level, 'Ice Walker', true);
        _wlkShatter(run, wk, shards);
    } else if (wk.age > lifeMs) _wlkShatter(run, wk, shards);
}

// Flies the shards, bites on contact, drops the spent ones.
function _wlkShards(shards, ctx) {
    for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.age += ctx.dtS * 1000;
        s.x += s.vx * ctx.dtS; s.y += s.vy * ctx.dtS;
        _shpPlace(s.el, s.x, s.y, 8, 8);
        const gone = s.age > WLK_SHARD_LIFE_MS * _SHP_DEBUG_MULT || s.x < -30 || s.x > window.innerWidth + 30 || s.y < -30 || s.y > window.innerHeight + 30;
        const hit = !gone && _nkCircleHit(s.x, s.y, WLK_SHARD_R, ctx.pr, 0) && _shpTouch(WLK_SHARD_DMG, ctx.level, 'Ice Shrapnel');
        if (gone || hit) { try { s.el.remove(); } catch (e) { /* run already cleaned up */ } shards.splice(i, 1); }
    }
}

// Ice Walkers: see the section comment.
export function _mechShpWalker(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const walkers = [];
    for (let i = 0; i < WLK_COUNT[p]; i++) walkers.push(_wlkMake(i));
    const shards = [];
    let t = 0;
    _nkToast('eg_mech_shp_walker', '❄️ ICE WALKER - it stalks you and shatters on contact!', SHP_COLOR);
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const ctx = { p, level, dtS, pc: _shpPC(), pr: _nkPlayerRect() };
        for (const wk of walkers) {
            if (wk.state === 'wait' && t >= wk.spawnAt) _wlkWarn(run, wk);
            else if (wk.state === 'warn') { wk.age += dtS * 1000; if (wk.age >= WLK_WARN_MS * _SHP_DEBUG_MULT) _wlkRise(run, wk); }
            else if (wk.state === 'live') _wlkMove(run, wk, shards, ctx);
        }
        _wlkShards(shards, ctx);
        return shards.length > 0 || walkers.some(wk => wk.state !== 'dead');
    });
}
