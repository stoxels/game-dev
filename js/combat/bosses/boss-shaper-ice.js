import { _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';
import { SHP_COLOR, _SHP_DEBUG_MULT, _shpPC, _shpPlace, _shpShards, _shpTouch } from './boss-shaper.js';

//------------------------------------------------------------------------
//-------------------THE FROSTWRIGHT: ICICLE VOLLEY + BLIZZARD-------------------
//------------------------------------------------------------------------
// Icicle Volley: red rings grow on the floor, then an icicle crashes down on
// each. The first ring of every wave sits on YOU, so standing still loses.
// Later phases: the icicle that was aimed at you leaves a patch of frost
// (phase 2) and splinters into four shards (phase 3).
// Blizzard (60%+): a whiteout. The cold bites you every few seconds unless
// you stand in a warm ring; the rings shrink as the storm goes on.
//------------------------------------------------------------------------

// ── Icicle tuning, indexed by boss phase (1..3) ──
const ICI_WAVES = [0, 2, 3, 3];               // waves per cast
const ICI_COUNT = [0, 4, 5, 6];               // icicles per wave
const ICI_WARN_MS = [0, 1150, 1050, 950];     // ring grows this long before the icicle lands
const ICI_RADIUS = [0, 62, 66, 70];           // px of the landing zone
const ICI_DMG = [0, 0.15, 0.17, 0.19];        // %maxHP for standing in a landing zone
const ICI_REST_MS = 450;                      // pause between one wave landing and the next marks
const ICI_FALL_MS = 240;                      // how long the icicle takes to drop
const ICI_SPACING = 140;                      // landing zones keep this far apart
const ICI_EDGE = 90;                          // and this far from the screen edge
const ICI_PATCH_LIFE_MS = 4200;               // how long the frost patch stays
const ICI_PATCH_R = 48;                       // px reach of the frost patch
const ICI_PATCH_DMG = 0.06;                   // %maxHP for standing in it
const ICI_SPLINTER_SPEED = 360;               // px/s the shards fly
const ICI_SPLINTER_LIFE_MS = 560;
const ICI_SPLINTER_R = 12;
const ICI_SPLINTER_DMG = 0.08;

// ── Blizzard tuning, indexed by boss phase (2..3) ──
const BLZ_WARN_MS = 1500;                     // snow builds, rings light, nobody is bitten yet
const BLZ_LIVE_MS = [0, 0, 8500, 9500];       // how long the cold bites
const BLZ_RINGS = [0, 0, 3, 2];               // warm rings
const BLZ_R_START = [0, 0, 112, 100];         // ring radius when the storm starts
const BLZ_R_END = [0, 0, 74, 66];             // ...and when it is at its worst
const BLZ_BITE_MS = 1250;                     // outside a ring this long and the cold bites
const BLZ_DMG = [0, 0, 0.075, 0.09];          // %maxHP per bite
const BLZ_RING_GAP = 290;                     // rings keep this far apart
const BLZ_NEAR_MIN = 110;                     // the first ring opens this far...
const BLZ_NEAR_MAX = 240;                     // ...to this far from you
const BLZ_FADE_MS = 700;                      // the storm dies down


//------------------------------------------------------------------------
//-------------------ICICLE VOLLEY-----------------------------------------
//------------------------------------------------------------------------

// Landing spots for one wave: the first on the player, the rest scattered
// with space between them.
function _iciPick(count, r) {
    const W = window.innerWidth, H = window.innerHeight - 70;
    const pc = _shpPC();
    const clampX = (v) => Math.max(ICI_EDGE, Math.min(W - ICI_EDGE, v));
    const clampY = (v) => Math.max(ICI_EDGE, Math.min(H - ICI_EDGE, v));
    const pts = [{ x: clampX(pc.x), y: clampY(pc.y), aimed: true, r }];
    for (let tries = 0; pts.length < count && tries < 80; tries++) {
        const x = ICI_EDGE + Math.random() * (W - ICI_EDGE * 2);
        const y = ICI_EDGE + Math.random() * (H - ICI_EDGE * 2);
        if (pts.every(o => Math.hypot(o.x - x, o.y - y) > ICI_SPACING)) pts.push({ x, y, aimed: false, r });
    }
    return pts;
}

// Draws one landing ring (it fills up over the warning time).
function _iciMark(run, pt, warnMs) {
    const el = _nkEl(run, 'div', 'sx-shp-ici' + (pt.aimed ? ' sx-shp-ici-aimed' : ''));
    el.style.width = el.style.height = (pt.r * 2) + 'px';
    _shpPlace(el, pt.x, pt.y, pt.r, pt.r);
    el.style.setProperty('--warn', Math.round(warnMs) + 'ms');
    el.innerHTML = '<i class="sx-shp-ici-fill"></i>';
    pt.el = el;
}

// The icicle itself, dropping out of the top of the screen onto its mark.
function _iciDrop(run, pt) {
    const sp = _nkEl(run, 'div', 'sx-shp-ici-spike');
    sp.style.left = Math.round(pt.x - 15) + 'px';
    sp.style.top = Math.round(pt.y - 130) + 'px';
    sp.style.setProperty('--drop', -Math.round(pt.y + 200) + 'px');
    sp.style.animationDuration = Math.round(ICI_FALL_MS * _SHP_DEBUG_MULT) + 'ms';
    pt.spike = sp;
}

// A cracked-ice scar where an icicle hit, fading on its own.
function _iciCrater(run, pt) {
    const cr = _nkEl(run, 'div', 'sx-shp-crater');
    cr.style.width = cr.style.height = (pt.r * 1.6) + 'px';
    _shpPlace(cr, pt.x, pt.y, pt.r * 0.8, pt.r * 0.8);
    const id = setTimeout(() => { try { cr.remove(); } catch (e) { /* run already cleaned up */ } }, 900);
    run.timers.push(id);
}

// Leaves a lingering frost patch where the aimed icicle landed.
function _iciPatch(run, st, pt, now) {
    const el = _nkEl(run, 'div', 'sx-shp-patch');
    el.style.width = el.style.height = (ICI_PATCH_R * 2) + 'px';
    _shpPlace(el, pt.x, pt.y, ICI_PATCH_R, ICI_PATCH_R);
    st.patches.push({ x: pt.x, y: pt.y, until: now + ICI_PATCH_LIFE_MS * _SHP_DEBUG_MULT, el });
}

// Four shards flying out diagonally from where the aimed icicle landed.
function _iciSplinter(run, st, pt) {
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const el = _nkEl(run, 'div', 'sx-shp-splinter');
        el.style.setProperty('--ang', a + 'rad');
        st.splinters.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * ICI_SPLINTER_SPEED, vy: Math.sin(a) * ICI_SPLINTER_SPEED, age: 0, el });
    }
}

// An icicle lands: scar, shards, a hit if you are in the zone, and the
// phase 2/3 aftermath for the one that was aimed at you.
function _iciLand(run, st, pt, ctx) {
    try { pt.el.remove(); } catch (e) { /* run already cleaned up */ }
    try { pt.spike.remove(); } catch (e) { /* run already cleaned up */ }
    _iciCrater(run, pt);
    _shpShards(pt.x, pt.y, pt.aimed);
    const pc = _shpPC();
    if (Math.hypot(pc.x - pt.x, pc.y - pt.y) < pt.r - 4) _shpTouch(ICI_DMG[ctx.p], ctx.level, 'Icicle', true);
    if (pt.aimed && ctx.p >= 2) _iciPatch(run, st, pt, ctx.now);
    if (pt.aimed && ctx.p >= 3) _iciSplinter(run, st, pt);
}

// Ages the frost patches (bite while you stand in one) and the shards.
function _iciAftermath(st, ctx) {
    const pc = _shpPC(), pr = _nkPlayerRect();
    for (let i = st.patches.length - 1; i >= 0; i--) {
        const z = st.patches[i];
        if (z.until - ctx.now < 350) z.el.classList.add('sx-shp-patch-out');
        if (ctx.now >= z.until) { try { z.el.remove(); } catch (e) { /* run already cleaned up */ } st.patches.splice(i, 1); continue; }
        if (Math.hypot(pc.x - z.x, pc.y - z.y) < ICI_PATCH_R) _shpTouch(ICI_PATCH_DMG, ctx.level, 'Frost Patch', false, true);
    }
    for (let i = st.splinters.length - 1; i >= 0; i--) {
        const s = st.splinters[i];
        s.age += ctx.dtS * 1000;
        s.x += s.vx * ctx.dtS; s.y += s.vy * ctx.dtS;
        _shpPlace(s.el, s.x, s.y, 4, 14);
        const gone = s.age > ICI_SPLINTER_LIFE_MS * _SHP_DEBUG_MULT || s.x < -30 || s.x > window.innerWidth + 30 || s.y < -30 || s.y > window.innerHeight + 30;
        const hit = !gone && _nkCircleHit(s.x, s.y, ICI_SPLINTER_R, pr, 0) && _shpTouch(ICI_SPLINTER_DMG, ctx.level, 'Ice Splinter');
        if (gone || hit) { try { s.el.remove(); } catch (e) { /* run already cleaned up */ } st.splinters.splice(i, 1); }
    }
}

// Starts a wave: pick the spots and draw the rings.
function _iciStartWave(run, p) {
    const marks = _iciPick(ICI_COUNT[p], ICI_RADIUS[p]);
    marks.forEach(pt => _iciMark(run, pt, ICI_WARN_MS[p] * _SHP_DEBUG_MULT));
    return { marks, t: 0, landed: false };
}

// Advances one wave: icicles start to fall just before the warning ends.
function _iciStepWave(run, st, w, ctx) {
    w.t += ctx.dtS * 1000;
    const warn = ICI_WARN_MS[ctx.p] * _SHP_DEBUG_MULT;
    if (w.t >= warn - ICI_FALL_MS * _SHP_DEBUG_MULT) w.marks.forEach(pt => { if (!pt.spike) _iciDrop(run, pt); });
    if (w.t < warn) return;
    w.marks.forEach(pt => _iciLand(run, st, pt, ctx));
    w.landed = true;
    w.t = 0;
}

// Icicle Volley: see the section comment.
export function _mechShpIcicles(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const st = { patches: [], splinters: [] };
    let wave = _iciStartWave(run, p), done = 0;
    _nkToast('eg_mech_shp_icicles', '❄️ ICICLE VOLLEY', SHP_COLOR);
    _nkLoop(run, (dtS, now) => {
        const ctx = { p, level, dtS, now };
        if (wave && !wave.landed) _iciStepWave(run, st, wave, ctx);
        else if (wave) {
            wave.t += dtS * 1000;
            if (wave.t >= ICI_REST_MS) { done++; wave = done < ICI_WAVES[p] ? _iciStartWave(run, p) : null; }
        }
        _iciAftermath(st, ctx);
        return !!wave || st.patches.length > 0 || st.splinters.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------BLIZZARD (60%+)---------------------------------------
//------------------------------------------------------------------------

// Spots for the warm rings: the first close to the player, the rest spread.
function _blzSpots(count, r) {
    const W = window.innerWidth, H = window.innerHeight - 70, m = r + 30;
    const pc = _shpPC();
    const a = Math.random() * Math.PI * 2, d = BLZ_NEAR_MIN + Math.random() * (BLZ_NEAR_MAX - BLZ_NEAR_MIN);
    const first = {
        x: Math.max(m, Math.min(W - m, pc.x + Math.cos(a) * d)),
        y: Math.max(m, Math.min(H - m, pc.y + Math.sin(a) * d)),
    };
    const spots = [first];
    for (let tries = 0; spots.length < count && tries < 80; tries++) {
        const x = m + Math.random() * (W - m * 2), y = m + Math.random() * (H - m * 2);
        if (spots.every(o => Math.hypot(o.x - x, o.y - y) > BLZ_RING_GAP)) spots.push({ x, y });
    }
    return spots;
}

// One warm ring: sized for the start radius, shrunk later with a scale.
function _blzRing(run, spot, r) {
    const el = _nkEl(run, 'div', 'sx-shp-hearth');
    el.style.width = el.style.height = (r * 2) + 'px';
    _shpPlace(el, spot.x, spot.y, r, r);
    el.innerHTML = '<i class="sx-shp-hearth-glow"></i><b>🔥</b>';
    return { x: spot.x, y: spot.y, el };
}

// The whiteout layer: vignette plus two drifting snow sheets.
function _blzVeil(run) {
    const veil = _nkEl(run, 'div', 'sx-shp-bliz');
    veil.innerHTML = '<i class="sx-shp-snow"></i><i class="sx-shp-snow sx-shp-snow2"></i>';
    requestAnimationFrame(() => veil.classList.add('sx-shp-bliz-on'));
    return veil;
}

// Tracks how long you have been out in the cold; bites at the limit.
function _blzCold(st, warm, dtS, level, p) {
    if (warm) { st.bite = Math.max(0, st.bite - dtS * 2000); return; }
    st.bite += dtS * 1000;
    if (st.bite >= BLZ_BITE_MS) {
        st.bite = 0;
        _shpTouch(BLZ_DMG[p], level, 'Frostbite', true);
    }
}

// Blizzard: see the section comment.
export function _mechShpBlizzard(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const veil = _blzVeil(run);
    const rings = _blzSpots(BLZ_RINGS[p], BLZ_R_START[p]).map(s => _blzRing(run, s, BLZ_R_START[p]));
    const warnMs = BLZ_WARN_MS * _SHP_DEBUG_MULT, liveMs = BLZ_LIVE_MS[p] * _SHP_DEBUG_MULT;
    const st = { t: 0, bite: 0 };
    _nkToast('eg_mech_shp_blizzard', '❄️ BLIZZARD - the cold bites! Stand in a warm 🔥 ring!', SHP_COLOR);
    _nkLoop(run, (dtS) => {
        st.t += dtS * 1000;
        if (st.t < warnMs) return true;
        const k = Math.min(1, (st.t - warnMs) / liveMs);
        if (k >= 1) {
            veil.classList.add('sx-shp-bliz-out');
            rings.forEach(r => r.el.classList.add('sx-shp-hearth-out'));
            return st.t < warnMs + liveMs + BLZ_FADE_MS * _SHP_DEBUG_MULT;
        }
        const r = BLZ_R_START[p] + (BLZ_R_END[p] - BLZ_R_START[p]) * k;
        const pc = _shpPC();
        rings.forEach(h => { h.el.style.transform = 'scale(' + (r / BLZ_R_START[p]).toFixed(3) + ')'; });
        const warm = rings.some(h => Math.hypot(pc.x - h.x, pc.y - h.y) <= r);
        _blzCold(st, warm, dtS, level, p);
        veil.classList.toggle('sx-shp-bliz-cold', st.bite > BLZ_BITE_MS * 0.5);
        return true;
    });
}
