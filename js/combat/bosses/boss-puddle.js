import { Audio_Manager } from '../../audio/audio.js';
import { _hzGridRect } from '../combat-hazards.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE PUDDLE (boss_puddle)-----------------------------
//------------------------------------------------------------------------
// Drowning-weather siege under a thunder sky. Endless cold rain, water rising
// at HP gates (75 / 50 / 25 %) with sweeping GATE WAVES (a pair from both
// edges from the second rise on), and two telegraphed set-pieces on a timer:
//  - CLOUDBURST: giant drops fall on marked circles, one on you first.
//  - GEYSERS: ripples on the water surface, then tall jets burst from them.
// Air bubbles pop into shrapnel. At 10 %: THE DELUGE (shared finale waves).
// The fight shows no combat toasts: everything is telegraphed on screen and
// the floating hit numbers carry the damage.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_puddle: {
        id: 'boss_puddle', name: 'The Puddle', emoji: '💧',
        baseHP: 920, baseDamage: 18, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_puddle: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the weather is the real threat.
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'cloudburst', intervalBase: 15000, intervalVariance: 4000, handler: '_mechCloudburst' },
            { name: 'geysers', intervalBase: 19000, intervalVariance: 5000, handler: '_mechGeysers' },
        ],
        onInit: (m) => { _puddleArenaInit(m); _nkWatchFinale(m, PUD_FINALE); },
    },
});

// THE DELUGE finale (shared waves): the sky falls in sheets.
const PUD_FINALE = {
    name: 'The Puddle', title: '💧 THE DELUGE', element: 'cold', cls: 'sx-nk-fin-water', color: '#7dd3fc',
    quiet: true, // no shield-absorbed toasts on finale hits (fight-wide rule)
    toastKey: 'eg_pud_final',
    hint: 'The sky falls - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2200, dmg: 0.15, extra: 2, label: 'Deluge' },
        { kind: 'shelter', ms: 2800, dmg: 0.22, label: 'Deluge' },
        { kind: 'avoid', ms: 2000, dmg: 0.15, extra: 3, label: 'Deluge' },
        { kind: 'shelter', ms: 2600, dmg: 0.26, label: 'The Deluge' },
    ],
};


//------------------------------------------------------------------------
//-------------------TUNING------------------------------------------------
//------------------------------------------------------------------------
// Rain and flood (index 0 is unused: phases are 1-3)
const PUD_RAIN_INTERVAL_MS = [0, 1000, 820, 680]; // per boss phase - rain thickens
const PUD_RAIN_SPEED = 640;        // px/s fall speed
const PUD_RAIN_R = 7;              // drop hit radius
const PUD_RAIN_DMG = 0.04;         // %maxHP per drop impact (cold)
const PUD_RAIN_HIT_CD_MS = 400;    // global rain-hit cooldown
const PUD_DROP_FOUNTAIN_P = 0.3;   // share of drops landing in water that erupt (the rest only ripple)
const PUD_WATER_PCT = [0, 1 / 6, 2 / 6, 3 / 6]; // of viewport height per band
const PUD_WATER_RISE = 130;        // px/s the flood visibly rises
const PUD_WATER_DOT = [0, 7, 9, 12];  // %maxHP/s standing in the water (paid as hits)
const PUD_TOUCH_CD_MS = 700;       // water/fountain hit cadence (real hits, not a silent DoT)
// Fountains
const PUD_FOUNTAIN_DMG = 8;        // %maxHP/s touching a fountain jet (paid as hits)
const PUD_FOUNTAIN_MS = 2000;      // fountain lifetime - quick crown splash
const PUD_FOUNTAIN_H = 260;        // full jet height (px)
const PUD_FOUNTAIN_CANOPY_W = 3.4; // canopy spread at full flare (x stem width)
const PUD_FOUNTAIN_W = 14;         // jet width (hitbox half = W/2 + pad)
// Bubbles
const PUD_BUBBLE_N = 3;            // air bubbles airborne at once
const PUD_BUBBLE_R = 27;           // bubble radius (visual + hit)
const PUD_BUBBLE_SPEED = 130;      // px/s drift
const PUD_BUBBLE_RESPAWN_MS = 40000; // new bubble this long after a burst
const PUD_SHARD_SPEED = 300;       // px/s burst shrapnel
const PUD_SHARD_DMG = 0.05;        // %maxHP per shrapnel (cold)
const PUD_SHARD_CD_MS = 450;       // global shrapnel-hit cooldown
// Gate wave - sweeps the flood surface after each HP gate rise.
const PUD_WAVE_TELEGRAPH_MS = 1300; // crest looms at the edge before sweeping
const PUD_WAVE_SPEED = 430;         // px/s sweep across the screen
const PUD_WAVE_W = 96;              // crest width (visual + hitbox)
const PUD_WAVE_H = [0, 150, 190, 230]; // crest height above the surface per band
const PUD_WAVE_DMG = [0, 0.14, 0.18, 0.22]; // %maxHP single cold hit per band
const PUD_WAVE_PAIR_DELAY_MS = 900; // second wave (from the far edge) leaves this long after the first
// Cloudburst (timed set-piece)
const PUD_BURST_N = [0, 3, 4, 5];            // circles per cast
const PUD_BURST_WARN_MS = 1300;              // circle fills up this long before its drop lands
const PUD_BURST_STAGGER_MS = 520;            // circles start one after another
const PUD_BURST_R = 84;                      // splash radius
const PUD_BURST_DMG = [0, 0.10, 0.12, 0.14]; // %maxHP, one cold hit
const PUD_BURST_GAP_PX = 170;                // circles keep this far apart
// Geysers (timed set-piece, needs standing water)
const PUD_GEY_N = [0, 3, 4, 5];              // jets per cast
const PUD_GEY_WARN_MS = 1200;                // ripples show this long before the jets burst
const PUD_GEY_R = 52;                        // half width of the burst column
const PUD_GEY_DMG = [0, 0.11, 0.13, 0.15];   // %maxHP, one cold hit
const PUD_GEY_GAP_PX = 150;                  // jets keep this far apart

let _pudWatcher = null; // per-fight weather state


// Called from _bossCleanup (boss-framework.js) on boss death / stop.
export function _puddleTeardown() {
    if (!_pudWatcher) return;
    const st = _pudWatcher;
    _pudWatcher = null;
    if (st.run) { try { _nkKillRun(st.run); } catch (e) {} }
}


//------------------------------------------------------------------------
//-------------------SMALL HELPERS-----------------------------------------
//------------------------------------------------------------------------

function _pudSfx(name) {
    try { if (Audio_Manager && Audio_Manager.playSFX) Audio_Manager.playSFX(name); } catch (e) {}
}

// Removes an element after `ms` (tracked on the run so a boss death clears it).
function _pudLater(st, ms, fn) {
    st.run.timers.push(setTimeout(fn, ms));
}

function _pudPhase(live) {
    return Math.max(1, Math.min(3, Number(live && live.bossPhase) || 1));
}

// A brief sky flash (lightning) for big moments.
function _pudFlash(st) {
    const el = st.flashEl;
    if (!el) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
}

// Picks `n` x positions spread across the screen, the first near the player,
// each at least `gap` px from the others.
function _pudSpreadXs(n, gap) {
    const W = window.innerWidth;
    const c = _nkPlayerCenter();
    const xs = [Math.max(60, Math.min(W - 60, (c ? c.x : W / 2) + (Math.random() * 60 - 30)))];
    let guard = 0;
    while (xs.length < n && guard++ < 80) {
        const x = 60 + Math.random() * Math.max(60, W - 120);
        if (xs.every(o => Math.abs(o - x) >= gap)) xs.push(x);
    }
    return xs;
}


//------------------------------------------------------------------------
//-------------------SPAWNERS (rain, bubbles, fountains)-------------------
//------------------------------------------------------------------------

function _pudSpawnDrop(st, W) {
    // 25% of drops drift toward the player (+-90px) so the rain stays
    // honest pressure; the rest scatter across the full width.
    let x;
    if (Math.random() < 0.25) {
        const c = _nkPlayerCenter();
        x = (c ? c.x : W / 2) + (Math.random() * 180 - 90);
    } else {
        x = 12 + Math.random() * Math.max(24, W - 24);
    }
    st.drops.push({ x, y: -20, el: _nkEl(st.run, 'div', 'sx-pud-drop') });
}

function _pudSpawnBubble(st, now) {
    const r = PUD_BUBBLE_R;
    const el = _nkEl(st.run, 'div', 'sx-pud-bubble');
    // Freshly spawned bubbles are briefly un-burstable, so a respawn during a
    // heavy barrage isn't popped the frame it appears. They float in the upper
    // sky, never below the water surface.
    const b = { x: r + Math.random() * Math.max(60, window.innerWidth - 2 * r), y: 0, a: Math.random() * Math.PI * 2, el, graceUntil: now + 3000 };
    const ceilY = 50 + r;
    const maxY = Math.max(ceilY + 40, Math.min(window.innerHeight * 0.5, st.waterY) - r - 8);
    b.y = ceilY + Math.random() * Math.max(60, maxY - ceilY);
    st.bubbles.push(b);
}

function _pudBurstBubble(st, b, now) {
    if (b.dead) return;
    b.dead = true;
    const ring = _nkEl(st.run, 'div', 'sx-pud-pop');
    ring.style.left = Math.round(b.x) + 'px';
    ring.style.top = Math.round(b.y) + 'px';
    _pudLater(st, 450, () => { try { ring.remove(); } catch (e) {} });
    // Shrapnel: small bubbles fly off toward BOTH screen sides.
    for (let i = 0; i < 6; i++) {
        const dir = (i % 2 === 0) ? -1 : 1;
        st.shards.push({
            x: b.x, y: b.y,
            vx: dir * PUD_SHARD_SPEED * (0.7 + Math.random() * 0.6),
            vy: -50 + Math.random() * 100,
            el: _nkEl(st.run, 'div', 'sx-pud-shard'),
        });
    }
    _pudSfx('pud_pop');
    try { b.el.remove(); } catch (e) {}
    st.respawnQ.push(now + PUD_BUBBLE_RESPAWN_MS);
}

// A crown-splash fountain at x, rooted on the water surface.
function _pudSpawnFountain(st, x, now) {
    const anchor = _nkEl(st.run, 'div', 'sx-pud-fountain');
    anchor.style.left = Math.round(x) + 'px';
    anchor.style.top = Math.round(st.waterY) + 'px';
    const jet = document.createElement('div');
    jet.className = 'sx-pud-fountain-jet';
    anchor.appendChild(jet);
    // Wide lacy crown that flares open as the splash matures, with droplets
    // draping off its rim.
    const crown = document.createElement('div');
    crown.className = 'sx-pud-fountain-crown';
    for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'sx-pud-drape d' + (i + 1);
        crown.appendChild(s);
    }
    anchor.appendChild(crown);
    st.fountains.push({ x, t: 0, anchor, jet, crown });
    // Splash SFX, rate-limited so volleys of rain don't stack clips.
    if (now - st.fountainSfxAt > 280) {
        st.fountainSfxAt = now;
        _pudSfx('pud_fountain');
    }
}

// A drop hitting dry ground (small splash) or calm water (a ripple).
function _pudSplash(st, x, y, onWater) {
    const el = _nkEl(st.run, 'div', onWater ? 'sx-pud-ripple' : 'sx-pud-splash');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    _pudLater(st, 700, () => { try { el.remove(); } catch (e) {} });
}

// Crown-splash profile (a droplet hitting water in slow motion):
//   0-260ms   thin column shoots up to 55% height
//   260-560ms the column's head flares into the wide draping canopy
//   560-1250ms full crown boils gently
//   1250ms+   the whole splash collapses
function _pudFountainHeight(tMs) {
    if (tMs >= PUD_FOUNTAIN_MS) return 0;
    const colEnd = 260, flareEnd = 560, boilEnd = 1250;
    let h;
    if (tMs < colEnd) {
        const k = tMs / colEnd;
        h = PUD_FOUNTAIN_H * 0.55 * (1 - Math.pow(1 - k, 2));
    } else if (tMs < flareEnd) {
        const k = (tMs - colEnd) / (flareEnd - colEnd);
        h = PUD_FOUNTAIN_H * (0.55 + 0.45 * (1 - Math.pow(1 - k, 2)));
    } else if (tMs < boilEnd) {
        h = PUD_FOUNTAIN_H * (0.97 + 0.03 * Math.sin(tMs / 110));
    } else {
        const k = (tMs - boilEnd) / (PUD_FOUNTAIN_MS - boilEnd);
        h = PUD_FOUNTAIN_H * (1 - k * k);
    }
    return Math.max(0, h);
}

// Canopy width over the fountain's life: narrow stem -> wide draping crown.
function _pudFountainWidth(tMs) {
    const flareStart = 200, flareEnd = 700;
    if (tMs <= flareStart) return 1;
    if (tMs >= flareEnd) return PUD_FOUNTAIN_CANOPY_W;
    const k = (tMs - flareStart) / (flareEnd - flareStart);
    return 1 + (PUD_FOUNTAIN_CANOPY_W - 1) * (1 - Math.pow(1 - k, 2));
}


//------------------------------------------------------------------------
//-------------------GATE WAVES---------------------------------------------
//------------------------------------------------------------------------

// Starts a wave looming at one screen edge.
function _pudSpawnWave(st, fromLeft) {
    const W = window.innerWidth;
    const wv = {
        x: fromLeft ? -PUD_WAVE_W / 2 : W + PUD_WAVE_W / 2,
        dir: fromLeft ? 1 : -1, t: 0, hit: false, sprayAt: 0,
        el: _nkEl(st.run, 'div', 'sx-pud-wave' + (fromLeft ? '' : ' flip')),
    };
    const inner = document.createElement('div');
    inner.className = 'sx-pud-wave-inner';
    wv.el.appendChild(inner);
    st.waves.push(wv);
    _pudSfx('pud_wave');
}

// Counts down to the post-rise wave, launches it (and its twin from the far
// edge once the flood is deep) and moves every wave across the surface.
function _pudStepWaves(st, dtS, now, pr, level) {
    const W = window.innerWidth;
    if (st.waveQ > 0 && st.waterH > 40) {
        st.waveQ -= dtS * 1000;
        if (st.waveQ <= 0) {
            st.waveQ = 0;
            const fromLeft = Math.random() < 0.5;
            _pudSpawnWave(st, fromLeft);
            if (st.waterBand >= 2) st.waveTwin = { t: PUD_WAVE_PAIR_DELAY_MS, fromLeft: !fromLeft };
        }
    }
    if (st.waveTwin) {
        st.waveTwin.t -= dtS * 1000;
        if (st.waveTwin.t <= 0) { _pudSpawnWave(st, st.waveTwin.fromLeft); st.waveTwin = null; }
    }
    const h = PUD_WAVE_H[st.waterBand] || PUD_WAVE_H[1];
    for (let i = st.waves.length - 1; i >= 0; i--) {
        const wv = st.waves[i];
        wv.t += dtS * 1000;
        if (wv.t >= PUD_WAVE_TELEGRAPH_MS) {
            wv.el.classList.add('sweep'); // release the curl from its loom
            wv.x += wv.dir * PUD_WAVE_SPEED * dtS;
            if (!wv.hit && pr && _nkRectsOverlap(
                    { left: wv.x - PUD_WAVE_W / 2, right: wv.x + PUD_WAVE_W / 2, top: st.waterY - h, bottom: st.waterY + 8 }, pr)) {
                wv.hit = true;
                _nkAbilityHitToast(_nkHit(PUD_WAVE_DMG[st.waterBand] || PUD_WAVE_DMG[1], 'cold', level), 'The Puddle', 'Gate Wave');
            }
            if (now - wv.sprayAt > 130) { // foam kicked up along the crest (visual only)
                wv.sprayAt = now;
                const s = _nkEl(st.run, 'div', 'sx-pud-wave-spray');
                s.style.left = Math.round(wv.x + (Math.random() * 60 - 30)) + 'px';
                s.style.top = Math.round(st.waterY - Math.random() * 40) + 'px';
                _pudLater(st, 520, () => { try { s.remove(); } catch (e) {} });
            }
        }
        const gone = (wv.dir === 1) ? (wv.x - PUD_WAVE_W / 2 > W + 70) : (wv.x + PUD_WAVE_W / 2 < -70);
        if (gone) {
            try { wv.el.remove(); } catch (e) {}
            st.waves.splice(i, 1);
        } else {
            wv.el.style.left = Math.round(wv.x) + 'px';
            wv.el.style.top = Math.round(st.waterY) + 'px'; // rides the rising flood
            wv.el.style.height = h + 'px';
        }
    }
}


//------------------------------------------------------------------------
//-------------------CLOUDBURST (timed set-piece)---------------------------
//------------------------------------------------------------------------

// Picks the circle centres: the first right on the player, the rest spread out.
function _pudBurstSpots(n) {
    const W = window.innerWidth, H = window.innerHeight;
    const c = _nkPlayerCenter();
    const spots = [{ x: c ? c.x : W / 2, y: c ? c.y : H / 2 }];
    let guard = 0;
    while (spots.length < n && guard++ < 100) {
        const s = { x: PUD_BURST_R + Math.random() * Math.max(60, W - 2 * PUD_BURST_R), y: 110 + Math.random() * Math.max(60, H - 280) };
        if (spots.every(o => Math.hypot(o.x - s.x, o.y - s.y) >= PUD_BURST_GAP_PX)) spots.push(s);
    }
    return spots;
}

// Giant drops fall onto marked circles one after another. Each circle fills
// up while its drop is on the way; stand outside it when the drop lands.
export function _mechCloudburst(monster, phase) {
    const st = _pudWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen()) return;
    if (monster && monster.bossImmune) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const zones = _pudBurstSpots(PUD_BURST_N[p]).map((s, i) => ({ ...s, start: i * PUD_BURST_STAGGER_MS, ring: null, drop: null, done: false }));
    let t = 0;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        let busy = false;
        zones.forEach(z => {
            if (z.done) return;
            const local = t - z.start;
            if (local < 0) { busy = true; return; }
            if (!z.ring) { z.ring = _pudBurstRing(run, z); z.drop = _pudBurstDrop(run, z); }
            if (local < PUD_BURST_WARN_MS) {
                const k = local / PUD_BURST_WARN_MS;
                z.ring.style.setProperty('--fill', (k * 100).toFixed(1) + '%');
                z.drop.style.transform = 'translate(' + Math.round(z.x) + 'px,' + Math.round(-40 + (z.y + 40) * k * k) + 'px)';
                busy = true;
                return;
            }
            z.done = true;
            z.ring.remove(); z.drop.remove();
            _pudBurstSplash(run, z);
            if (pr && _nkCircleHit(z.x, z.y, PUD_BURST_R, pr, 0)) {
                _nkAbilityHitToast(_nkHit(PUD_BURST_DMG[p], 'cold', level), 'The Puddle', 'Cloudburst');
            }
            _pudFlash(st);
            _pudSfx('pud_fountain');
        });
        return busy || t < zones[zones.length - 1].start + PUD_BURST_WARN_MS + 450;
    });
}

function _pudBurstRing(run, z) {
    const ring = _nkEl(run, 'div', 'sx-pud-burst-warn');
    ring.style.left = Math.round(z.x) + 'px';
    ring.style.top = Math.round(z.y) + 'px';
    ring.style.width = ring.style.height = (PUD_BURST_R * 2) + 'px';
    ring.style.marginLeft = ring.style.marginTop = (-PUD_BURST_R) + 'px';
    return ring;
}

function _pudBurstDrop(run, z) {
    const drop = _nkEl(run, 'div', 'sx-pud-burst-drop');
    drop.style.transform = 'translate(' + Math.round(z.x) + 'px,-40px)';
    return drop;
}

function _pudBurstSplash(run, z) {
    const el = _nkEl(run, 'div', 'sx-pud-burst-splash');
    el.style.left = Math.round(z.x) + 'px';
    el.style.top = Math.round(z.y) + 'px';
    el.style.width = el.style.height = (PUD_BURST_R * 2) + 'px';
    el.style.marginLeft = el.style.marginTop = (-PUD_BURST_R) + 'px';
    run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 520));
}


//------------------------------------------------------------------------
//-------------------GEYSERS (timed set-piece)------------------------------
//------------------------------------------------------------------------

// Ripples mark spots on the water surface; a moment later tall jets burst
// from them. Stand away from the marked columns (above the jet or beside it).
// With no standing water yet the sky answers with a cloudburst instead.
export function _mechGeysers(monster, phase) {
    const st = _pudWatcher;
    if (!st || _nkDodgeBusy() || _nkFrozen()) return;
    if (monster && monster.bossImmune) return;
    if (st.waterH < 40) { _mechCloudburst(monster, phase); return; }
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const spots = _pudSpreadXs(PUD_GEY_N[p], PUD_GEY_GAP_PX).map(x => {
        const el = _nkEl(run, 'div', 'sx-pud-geyser-warn');
        el.style.width = (PUD_GEY_R * 2) + 'px';
        el.style.marginLeft = (-PUD_GEY_R) + 'px';
        return { x, el };
    });
    let t = 0, erupted = false;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        spots.forEach(s => {
            s.el.style.left = Math.round(s.x) + 'px';
            s.el.style.top = Math.round(st.waterY) + 'px'; // ride the rising flood
            s.el.style.setProperty('--fill', (Math.min(1, t / PUD_GEY_WARN_MS) * 100).toFixed(1) + '%');
        });
        if (!erupted && t >= PUD_GEY_WARN_MS) {
            erupted = true;
            const pr = _nkPlayerRect();
            let caught = false; // one hit per cast, not per jet
            spots.forEach(s => {
                s.el.remove();
                _pudSpawnFountain(st, s.x, now);
                if (!caught && pr && _nkRectsOverlap({ left: s.x - PUD_GEY_R, right: s.x + PUD_GEY_R, top: st.waterY - PUD_FOUNTAIN_H, bottom: st.waterY + 10 }, pr)) {
                    _nkAbilityHitToast(_nkHit(PUD_GEY_DMG[p], 'cold', level), 'The Puddle', 'Geyser');
                    caught = true;
                }
            });
            _pudFlash(st);
        }
        return t < PUD_GEY_WARN_MS + 300;
    });
}


//------------------------------------------------------------------------
//-------------------THE PERSISTENT WEATHER LOOP----------------------------
//------------------------------------------------------------------------

// Water level: HP gates 75/50/25% -> 1/6 / 2/6 / 3/6 of screen, but never
// above the puzzle grid's lower border. Standing in it is a real cold hit.
function _pudStepWater(st, live, dtS, now, pr, level) {
    const H = window.innerHeight;
    const hpPct = live.currentHP / live.maxHP;
    const band = hpPct <= 0.25 ? 3 : hpPct <= 0.50 ? 2 : hpPct <= 0.75 ? 1 : 0;
    if (band > st.waterBand) {
        st.waterBand = band;
        st.waveQ = 2600; // once the flood settles, a wave sweeps the surface
    }
    const gridR = _hzGridRect();
    const capH = gridR ? Math.max(120, H - gridR.bottom) : H;
    const targetH = Math.min(H * PUD_WATER_PCT[st.waterBand], capH);
    if (st.waterH < targetH) st.waterH = Math.min(targetH, st.waterH + PUD_WATER_RISE * dtS);
    st.waterY = H - st.waterH;
    st.waterEl.style.height = Math.round(st.waterH) + 'px';
    const inWater = !!(pr && st.waterH > 4 && pr.bottom > st.waterY + 6);
    st.waterEl.classList.toggle('hot', inWater);
    if (inWater && now >= st.waterCd) {
        st.waterCd = now + PUD_TOUCH_CD_MS;
        const dealt = _nkHit(PUD_WATER_DOT[st.waterBand] / 100 * (PUD_TOUCH_CD_MS / 1000), 'cold', level);
        _nkAbilityHitToast(dealt, 'The Puddle', 'Freezing Flood', true);
    }
}

// Rain drops: spawn, fall, hit the player, pop bubbles, ripple or erupt on landing.
function _pudStepRain(st, live, dtS, now, pr, level) {
    const W = window.innerWidth, H = window.innerHeight;
    const p = _pudPhase(live);
    st.rainAcc += dtS * 1000;
    if (live._nkFinaleDone && live.bossImmune) st.rainAcc = 0; // the deluge owns the sky
    while (st.rainAcc >= PUD_RAIN_INTERVAL_MS[p]) {
        st.rainAcc -= PUD_RAIN_INTERVAL_MS[p];
        _pudSpawnDrop(st, W);
    }
    for (let i = st.drops.length - 1; i >= 0; i--) {
        const d = st.drops[i];
        d.y += PUD_RAIN_SPEED * dtS;
        d.el.style.transform = 'translate(' + Math.round(d.x) + 'px,' + Math.round(d.y) + 'px)';
        let consumed = false;
        if (pr && now >= st.rainCd && _nkCircleHit(d.x, d.y, PUD_RAIN_R, pr, 0)) {
            st.rainCd = now + PUD_RAIN_HIT_CD_MS;
            _nkAbilityHitToast(_nkHit(PUD_RAIN_DMG, 'cold', level), 'The Puddle', 'Rain', true);
            consumed = true;
        }
        if (!consumed) {
            const b = st.bubbles.find(bb => !bb.dead && now >= bb.graceUntil && Math.hypot(bb.x - d.x, bb.y - d.y) < PUD_BUBBLE_R + PUD_RAIN_R);
            if (b) { _pudBurstBubble(st, b, now); consumed = true; }
        }
        if (!consumed && d.y >= st.waterY) {
            if (st.waterH > 24 && Math.random() < PUD_DROP_FOUNTAIN_P) _pudSpawnFountain(st, d.x, now);
            else _pudSplash(st, d.x, st.waterH > 24 ? st.waterY : H - 8, st.waterH > 24);
            consumed = true;
        }
        if (consumed) {
            try { d.el.remove(); } catch (e) {}
            st.drops.splice(i, 1);
        }
    }
}

// Fountains: grow, flare, collapse; touching the stem or canopy hurts and
// the splash bursts any bubble it reaches.
function _pudStepFountains(st, dtS, now, pr, level) {
    for (let i = st.fountains.length - 1; i >= 0; i--) {
        const f = st.fountains[i];
        f.t += dtS * 1000;
        const h = _pudFountainHeight(f.t);
        const wMul = _pudFountainWidth(f.t);
        f.anchor.style.top = Math.round(st.waterY) + 'px'; // ride the rising flood
        f.jet.style.height = Math.round(h) + 'px';
        const flare = Math.max(0, Math.min(1, (wMul - 1) / (PUD_FOUNTAIN_CANOPY_W - 1)));
        f.jet.style.transform = 'scaleX(' + (1 + (wMul - 1) * 0.65).toFixed(3) + ')';
        f.crown.style.top = Math.round(st.waterY - h) + 'px';
        f.crown.style.opacity = (flare * 0.95).toFixed(3);
        f.crown.style.transform = 'translate(-50%, -50%) scale(' + (0.7 + 0.3 * flare).toFixed(3) + ')';
        if (h > 6) {
            // Two-part hitbox: narrow stem (full height) + wide canopy head (top 35%).
            const stemW = PUD_FOUNTAIN_W / 2 + 4;
            const canW = (PUD_FOUNTAIN_W / 2) * wMul + 4;
            const canH = h * 0.35;
            if (pr && now >= st.fountainCd && (
                    _nkRectsOverlap({ left: f.x - stemW, right: f.x + stemW, top: st.waterY - h, bottom: st.waterY }, pr) ||
                    _nkRectsOverlap({ left: f.x - canW, right: f.x + canW, top: st.waterY - h, bottom: st.waterY - h + canH }, pr))) {
                st.fountainCd = now + PUD_TOUCH_CD_MS;
                const dealt = _nkHit(PUD_FOUNTAIN_DMG / 100 * (PUD_TOUCH_CD_MS / 1000), 'cold', level);
                _nkAbilityHitToast(dealt, 'The Puddle', 'Fountain', true);
            }
            for (const b of st.bubbles) {
                if (b.dead || now < b.graceUntil) continue;
                const nearStem = Math.abs(b.x - f.x) < stemW + PUD_BUBBLE_R && b.y > st.waterY - h - PUD_BUBBLE_R;
                const nearCrown = Math.abs(b.x - f.x) < canW + PUD_BUBBLE_R && b.y > st.waterY - h - canH - PUD_BUBBLE_R && b.y < st.waterY - h + canH;
                if (nearStem || nearCrown) _pudBurstBubble(st, b, now);
            }
        }
        if (f.t >= PUD_FOUNTAIN_MS) {
            try { f.anchor.remove(); } catch (e) {}
            st.fountains.splice(i, 1);
        }
    }
}

// Air bubbles drift and bounce above the flood; burst ones respawn later.
function _pudStepBubbles(st, dtS, now) {
    const W = window.innerWidth;
    st.bubbles = st.bubbles.filter(b => !b.dead);
    st.bubbles.forEach(b => {
        if (Math.random() < dtS * 1.2) b.a += (Math.random() - 0.5) * 2.4;
        b.x += Math.cos(b.a) * PUD_BUBBLE_SPEED * dtS;
        b.y += Math.sin(b.a) * PUD_BUBBLE_SPEED * dtS;
        if (b.x < PUD_BUBBLE_R || b.x > W - PUD_BUBBLE_R) b.a = Math.PI - b.a;
        const ceil = 40 + PUD_BUBBLE_R, floor = st.waterY - PUD_BUBBLE_R - 8;
        if (b.y < ceil || (floor > ceil && b.y > floor)) b.a = -b.a;
        b.x = Math.max(PUD_BUBBLE_R, Math.min(W - PUD_BUBBLE_R, b.x));
        b.y = Math.max(ceil, Math.min(Math.max(ceil, floor), b.y));
        const bob = Math.sin(now / 320 + b.x) * 4; // idle float
        b.el.style.transform = 'translate(' + Math.round(b.x - PUD_BUBBLE_R) + 'px,' + Math.round(b.y - PUD_BUBBLE_R + bob) + 'px)';
    });
    st.respawnQ = st.respawnQ.filter(t => {
        if (now >= t) { _pudSpawnBubble(st, now); return false; }
        return true;
    });
}

// Bubble shrapnel flies toward the screen sides; contact hurts.
function _pudStepShards(st, dtS, now, pr, level) {
    const W = window.innerWidth;
    for (let i = st.shards.length - 1; i >= 0; i--) {
        const s = st.shards[i];
        s.x += s.vx * dtS;
        s.y += s.vy * dtS;
        s.vy -= 30 * dtS; // bubbles rise as they fly
        s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
        if (pr && now >= st.shardCd && _nkCircleHit(s.x, s.y, 7, pr, 0)) {
            st.shardCd = now + PUD_SHARD_CD_MS;
            _nkAbilityHitToast(_nkHit(PUD_SHARD_DMG, 'cold', level), 'The Puddle', 'Bubble Burst', true);
        }
        if (s.x < -24 || s.x > W + 24 || s.y < -24) {
            try { s.el.remove(); } catch (e) {}
            st.shards.splice(i, 1);
        }
    }
}

function _puddleArenaInit(monster) {
    if (_pudWatcher) return;
    const monsterId = monster ? monster.id : null;
    const level = monster ? monster.level : 1;
    const st = {
        monsterId, level, run: null,
        waterBand: 0, waterH: 0, waterY: window.innerHeight, waterEl: null, skyEl: null, flashEl: null,
        drops: [], fountains: [], bubbles: [], shards: [],
        waves: [], waveQ: 0, waveTwin: null,
        respawnQ: [],
        rainAcc: 0, rainCd: 0, shardCd: 0, fountainSfxAt: 0, waterCd: 0, fountainCd: 0,
    };
    _pudWatcher = st;
    // Passive run: the watcher lives the whole fight, so it must not hog
    // _nkDodgeBusy() - only its set-pieces should.
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_pudWatcher && _pudWatcher.run === run) _pudWatcher = null;
    };
    st.skyEl = _nkEl(run, 'div', 'sx-pud-sky');
    st.flashEl = _nkEl(run, 'div', 'sx-pud-flash');
    st.waterEl = _nkEl(run, 'div', 'sx-pud-water');
    const t0 = performance.now();
    for (let i = 0; i < PUD_BUBBLE_N; i++) _pudSpawnBubble(st, t0);

    _nkLoop(run, (dtS, now) => {
        const live = globalThis._monsters ? (globalThis._monsters.find(m => m && m.id === st.monsterId) || null) : null;
        if (!live) return false; // boss gone: the loop kills the run, onKill cleans state
        const pr = _nkPlayerRect();
        _pudStepWater(st, live, dtS, now, pr, level);
        _pudStepWaves(st, dtS, now, pr, level);
        _pudStepRain(st, live, dtS, now, pr, level);
        _pudStepFountains(st, dtS, now, pr, level);
        _pudStepBubbles(st, dtS, now);
        _pudStepShards(st, dtS, now, pr, level);
        return true;
    });
}
