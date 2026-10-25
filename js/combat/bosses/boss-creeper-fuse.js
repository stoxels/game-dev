import { _crpBlast, _crpHint, _crpPhaseOf } from './boss-creeper.js';
import { _nkDodgeBusy, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerCenter } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------CREEPER: FUSE TRAIL (phase 2+)-----------------------
//------------------------------------------------------------------------
// A line of TNT crates and a gunpowder fuse is laid across the arena, right
// through you. A red lane shows the danger; the fuse is lit at the crate
// nearest to you and the spark runs both ways, blowing each crate as it arrives.
// Phase 3 lays a second trail across the first. Step out of the lane(s).
//------------------------------------------------------------------------

const CRP_TRAIL_R = 95;                         // blast radius of each crate (= the lane's half width)
const CRP_TRAIL_SPACING = 135;                  // px between crates, so the blasts overlap into one lane
const CRP_TRAIL_WARN_MS = [0, 0, 1700, 1500];   // the fuse is lit this long after the trail is laid
const CRP_TRAIL_SPARK_SPEED = [0, 0, 470, 520];
const CRP_TRAIL_LIT_MS = 280;                   // a crate flashes white this long before it blows
const CRP_TRAIL_DMG = [0, 0, 0.08, 0.10];
const CRP_TRAIL_MIN_LEN = 520;                  // shorter trails (steep angles in a corner) are re-rolled


//------------------------------------------------------------------------
//-------------------GEOMETRY----------------------------------------------
//------------------------------------------------------------------------

// The part of the screen a trail may cover (clear of the edges and the bottom bar).
function _crpTrailRect() {
    return { x0: 60, x1: window.innerWidth - 60, y0: 110, y1: window.innerHeight - 140 };
}

// How far a ray from (cx, cy) along (dx, dy) goes before it leaves the rect.
function _crpRayToRect(cx, cy, dx, dy, r) {
    let tMax = Infinity;
    if (dx > 1e-6) tMax = Math.min(tMax, (r.x1 - cx) / dx); else if (dx < -1e-6) tMax = Math.min(tMax, (r.x0 - cx) / dx);
    if (dy > 1e-6) tMax = Math.min(tMax, (r.y1 - cy) / dy); else if (dy < -1e-6) tMax = Math.min(tMax, (r.y0 - cy) / dy);
    return Math.max(0, tMax);
}

// A straight trail through (cx, cy) along `ang`, edge to edge of the rect.
function _crpTrailLine(cx, cy, ang) {
    const r = _crpTrailRect(), dx = Math.cos(ang), dy = Math.sin(ang);
    const back = _crpRayToRect(cx, cy, -dx, -dy, r), fwd = _crpRayToRect(cx, cy, dx, dy, r);
    return { x1: cx - dx * back, y1: cy - dy * back, dx, dy, ang, len: back + fwd };
}

// Rolls angles until the trail is long enough to be worth a lane.
function _crpPickLine(cx, cy, angBase, spread) {
    let best = null;
    for (let i = 0; i < 10; i++) {
        const line = _crpTrailLine(cx, cy, angBase + (Math.random() - 0.5) * spread);
        if (!best || line.len > best.len) best = line;
        if (line.len >= CRP_TRAIL_MIN_LEN) return line;
    }
    return best;
}


//------------------------------------------------------------------------
//-------------------BUILDING A TRAIL--------------------------------------
//------------------------------------------------------------------------

// Places an element on the line: one transform string (the separate `rotate`
// property orbits the screen corner on fixed elements in Chromium).
function _crpPlaceBar(el, line, len) {
    el.style.width = Math.round(len) + 'px';
    el.style.transform = 'translate(' + Math.round(line.x1) + 'px,' + Math.round(line.y1) + 'px) rotate(' + line.ang.toFixed(4) + 'rad)';
}

// Draws the red lane and the gunpowder line, and sets out the TNT crates.
// Returns the crates in order along the line, each with its distance `s` from the start.
function _crpBuildTrail(run, line, pc) {
    const lane = _nkEl(run, 'div', 'sx-crp-lane');
    lane.style.height = (CRP_TRAIL_R * 2) + 'px';
    lane.style.marginTop = (-CRP_TRAIL_R) + 'px';
    _crpPlaceBar(lane, line, line.len);
    const powder = _nkEl(run, 'div', 'sx-crp-powder');
    _crpPlaceBar(powder, line, line.len);
    const n = Math.max(3, Math.round(line.len / CRP_TRAIL_SPACING) + 1);
    const crates = [];
    for (let i = 0; i < n; i++) {
        const s = line.len * i / (n - 1);
        const x = line.x1 + line.dx * s, y = line.y1 + line.dy * s;
        const el = _nkEl(run, 'div', 'sx-nk-dot sx-crp-tnt', 'TNT');
        el.style.transform = 'translate(' + Math.round(x - 24) + 'px,' + Math.round(y - 16) + 'px)';
        crates.push({ s, x, y, el, lit: false, blown: false, near: pc ? Math.hypot(x - pc.x, y - pc.y) : 0 });
    }
    // The crate nearest to you is where the fuse will be lit: it glows from the start.
    crates.reduce((a, c) => (c.near < a.near ? c : a), crates[0]).el.classList.add('fuse-start');
    return { line, lane, powder, crates };
}

// Picks where the second trail (phase 3) crosses the first: the point of the
// first trail nearest to you, shifted a good way along it so the cross is not on your head.
function _crpCrossPoint(first, pc) {
    const off = (180 + Math.random() * 140) * (Math.random() < 0.5 ? -1 : 1);
    const along = (pc.x - first.x1) * first.dx + (pc.y - first.y1) * first.dy;
    const s = Math.max(100, Math.min(first.len - 100, along + off));
    return { x: first.x1 + first.dx * s, y: first.y1 + first.dy * s };
}


//------------------------------------------------------------------------
//-------------------BURNING A TRAIL---------------------------------------
//------------------------------------------------------------------------

// Lights a trail: the crate nearest to you glows and two sparks start there.
function _crpIgniteTrail(run, tr) {
    let at = tr.crates[0];
    tr.crates.forEach(c => { if (c.near < at.near) at = c; });
    tr.fromS = at.s;
    tr.sparks = [-1, 1].map(dir => ({ dir, el: _nkEl(run, 'div', 'sx-crp-spark') }));
    tr.crates.forEach(c => { c.t = Math.abs(c.s - tr.fromS); });
}

// Moves a trail's sparks and blows the crates they reach.
function _crpBurnStep(tr, burnS, speed, dmg, level) {
    tr.sparks.forEach(sp => {
        const s = tr.fromS + sp.dir * burnS;
        if (s < -20 || s > tr.line.len + 20) { sp.el.style.display = 'none'; return; }
        sp.el.style.transform = 'translate(' + Math.round(tr.line.x1 + tr.line.dx * s - 9) + 'px,' + Math.round(tr.line.y1 + tr.line.dy * s - 9) + 'px)';
    });
    tr.crates.forEach(c => {
        if (c.blown) return;
        const left = (c.t - burnS) / speed * 1000;
        if (left <= CRP_TRAIL_LIT_MS && !c.lit) { c.lit = true; c.el.classList.add('lit'); }
        if (burnS < c.t) return;
        c.blown = true;
        try { c.el.remove(); } catch (e) {}
        _crpBlast(c.x, c.y, CRP_TRAIL_R, dmg, level, 'Fuse Trail');
    });
}

// Scheduled mechanic (phase 2+): lays the trail(s), then lights them.
export function _mechFuseTrail(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || _crpPhaseOf(monster)));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const warnMs = CRP_TRAIL_WARN_MS[p], speed = CRP_TRAIL_SPARK_SPEED[p], dmg = CRP_TRAIL_DMG[p];
    const rect = _crpTrailRect();
    const raw = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pc = { x: Math.max(rect.x0, Math.min(rect.x1, raw.x)), y: Math.max(rect.y0, Math.min(rect.y1, raw.y)) };

    _crpHint('eg_crp_hint_trail', 'The fuse is lit! Get out of the red lane - the TNT blows along it.');
    const first = _crpPickLine(pc.x, pc.y, Math.random() * Math.PI, Math.PI);
    const trails = [_crpBuildTrail(run, first, pc)];
    if (p >= 3) {
        const cross = _crpCrossPoint(first, pc);
        const second = _crpPickLine(cross.x, cross.y, first.ang + Math.PI / 2, 0.9);
        trails.push(_crpBuildTrail(run, second, pc));
    }
    let t0 = 0, lit = false, maxT = 0;
    _nkLoop(run, (dtS) => {
        t0 += dtS * 1000;
        if (!lit) {
            if (t0 < warnMs) return true;
            lit = true;
            trails.forEach(tr => { _crpIgniteTrail(run, tr); tr.crates.forEach(c => { maxT = Math.max(maxT, c.t); }); });
        }
        const burnS = (t0 - warnMs) / 1000 * speed;
        trails.forEach(tr => _crpBurnStep(tr, burnS, speed, dmg, level));
        if (burnS < maxT + 80) return true;
        trails.forEach(tr => { tr.lane.classList.add('done'); tr.powder.classList.add('done'); });
        return burnS < maxT + 80 + speed * 0.6;
    });
}
