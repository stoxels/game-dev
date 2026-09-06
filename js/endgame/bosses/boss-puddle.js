//------------------------------------------------------------------------
//-------------------BOSS: THE PUDDLE (boss_puddle)-----------------------------
//------------------------------------------------------------------------
// Weather fight — the arena slowly drowns while the sky never stops:
//   • RAIN: drops fall from the top of the screen for the whole fight and
//     deal cold damage on impact. A quarter of them drift toward you.
//   • RISING WATER: at 75% / 50% / 25% boss HP the lower 1/6 / 2/6 / 3/6
//     of the screen floods. Standing in water ticks cold damage.
//   • FOUNTAINS: every drop that lands in the water erupts a crown splash
//     (thin column + wide draping canopy) — 2s of cold spray on contact.
//   The flood never climbs above the puzzle grid's lower border.
//   • GATE WAVE (signature): each HP gate, after the flood rises, a curling
//     wave crest charges at a screen edge (~1.3s telegraph) then sweeps the
//     whole water surface. Its crest reaches above the waterline into the
//     grid's lowest rows — one heavy cold hit if it catches you.
//   • AIR BUBBLES: three glossy bubbles drift around the arena (faster
//     than they used to wander). A raindrop or fountain jet that touches
//     one pops it — bubble shrapnel flies off toward the screen sides and
//     damages the player. A fresh bubble respawns after 40s.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (fated_cell) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_puddle: {
        id: 'boss_puddle', name: 'The Puddle', emoji: '💧',
        baseHP: 920, baseDamage: 18, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_puddle: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
        onInit: _egPuddleArenaInit,
    },
});


// ── Weather tuning ──────────────────────────────────────────────────────
const EG_PUD_RAIN_INTERVAL_MS = [0, 1150, 950, 800]; // per boss phase — rain thickens (kept light)
const EG_PUD_RAIN_SPEED = 640;        // px/s fall speed
const EG_PUD_RAIN_R = 7;              // drop hit radius
const EG_PUD_RAIN_DMG = 0.035;        // %maxHP per drop impact (cold)
const EG_PUD_RAIN_HIT_CD_MS = 400;    // global rain-hit cooldown
const EG_PUD_WATER_PCT = [0, 1 / 6, 2 / 6, 3 / 6]; // of viewport height per band
const EG_PUD_WATER_RISE = 130;        // px/s the flood visibly rises
const EG_PUD_WATER_DOT = [0, 7, 9, 12];  // %maxHP/s standing in the water
const EG_PUD_FOUNTAIN_DMG = 8;        // %maxHP/s touching a fountain jet
const EG_PUD_FOUNTAIN_MS = 2000;      // fountain lifetime — quick crown splash
const EG_PUD_FOUNTAIN_H = 260;        // full jet height (px) — tall, since the flood stays low
const EG_PUD_FOUNTAIN_CANOPY_W = 3.4; // canopy spread at full flare (× stem width)
const EG_PUD_FOUNTAIN_W = 14;         // jet width (hitbox half = W/2 + pad)
const EG_PUD_BUBBLE_N = 3;            // air bubbles airborne at once
const EG_PUD_BUBBLE_R = 27;           // bubble radius (visual + hit)
const EG_PUD_BUBBLE_SPEED = 130;      // px/s drift (used to stroll at 45-70)
const EG_PUD_BUBBLE_RESPAWN_MS = 40000; // new bubble this long after a burst
const EG_PUD_SHARD_SPEED = 300;       // px/s burst shrapnel
const EG_PUD_SHARD_DMG = 0.05;        // %maxHP per shrapnel (cold)
const EG_PUD_SHARD_CD_MS = 450;       // global shrapnel-hit cooldown
// Gate wave — sweeps the flood surface after each HP gate rise.
const EG_PUD_WAVE_TELEGRAPH_MS = 1300; // crest looms at the edge before sweeping
const EG_PUD_WAVE_SPEED = 430;         // px/s sweep across the screen
const EG_PUD_WAVE_W = 96;              // crest width (visual + hitbox)
const EG_PUD_WAVE_H = [0, 150, 190, 230]; // crest height above the surface per band
const EG_PUD_WAVE_DMG = [0, 0.14, 0.18, 0.22]; // %maxHP single cold hit per band


let _egPudWatcher = null; // per-fight weather state


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egPuddleTeardown() {
    if (!_egPudWatcher) return;
    const st = _egPudWatcher;
    _egPudWatcher = null;
    if (st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
}


// ── spawners ────────────────────────────────────────────────────────────

function _egPudSpawnDrop(st, W) {
    // 25% of drops drift toward the player (±90px) so the rain stays
    // honest pressure; the rest scatter across the full width.
    let x;
    if (Math.random() < 0.25) {
        const c = _egNkPlayerCenter();
        x = (c ? c.x : W / 2) + (Math.random() * 180 - 90);
    } else {
        x = 12 + Math.random() * Math.max(24, W - 24);
    }
    const el = _egNkEl(st.run, 'div', 'eg-pud-drop');
    st.drops.push({ x, y: -20, el });
}


function _egPudSpawnBubble(st, now) {
    const r = EG_PUD_BUBBLE_R;
    const el = _egNkEl(st.run, 'div', 'eg-pud-bubble');
    const b = {
        x: r + Math.random() * Math.max(60, window.innerWidth - 2 * r),
        y: 60 + Math.random() * Math.max(60, window.innerHeight * 0.5),
        a: Math.random() * Math.PI * 2,
        el,
        // Freshly spawned bubbles are briefly un-burstable, so a respawn
        // during heavy fountain barrage isn't popped the frame it appears.
        graceUntil: (typeof now === 'number' ? now : performance.now()) + 3000,
    };
    // Air bubbles float — never below the water surface, and respawns bias
    // toward the upper sky where fountains can't reach.
    const ceilY = 50 + r;
    const maxY = Math.max(ceilY + 40, Math.min(window.innerHeight * 0.5, (st.waterY != null ? st.waterY : window.innerHeight)) - r - 8);
    b.y = ceilY + Math.random() * Math.max(60, maxY - ceilY);
    st.bubbles.push(b);
}


function _egPudBurstBubble(st, b, now) {
    if (b.dead) return;
    b.dead = true;
    // Pop ring at the burst point.
    const ring = _egNkEl(st.run, 'div', 'eg-pud-pop');
    ring.style.left = Math.round(b.x) + 'px';
    ring.style.top = Math.round(b.y) + 'px';
    setTimeout(() => { try { ring.remove(); } catch (e) {} }, 450);
    // Shrapnel: small bubbles fly off toward BOTH screen sides.
    for (let i = 0; i < 6; i++) {
        const dir = (i % 2 === 0) ? -1 : 1;
        const el = _egNkEl(st.run, 'div', 'eg-pud-shard');
        st.shards.push({
            x: b.x, y: b.y,
            vx: dir * EG_PUD_SHARD_SPEED * (0.7 + Math.random() * 0.6),
            vy: -50 + Math.random() * 100,
            el,
        });
    }
    try {
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('pud_pop');
    } catch (e) {}
    try { b.el.remove(); } catch (e) {}
    // A fresh bubble drifts in 40s after the burst.
    st.respawnQ.push(now + EG_PUD_BUBBLE_RESPAWN_MS);
}


function _egPudSpawnFountain(st, x, now) {
    const anchor = _egNkEl(st.run, 'div', 'eg-pud-fountain');
    anchor.style.left = Math.round(x) + 'px';
    anchor.style.top = Math.round(st.waterY) + 'px';
    const jet = document.createElement('div');
    jet.className = 'eg-pud-fountain-jet';
    anchor.appendChild(jet);
    // Wide lacy crown that flares open as the splash matures (the umbrella
    // canopy from a droplet hitting water, with droplets draping off its rim).
    const crown = document.createElement('div');
    crown.className = 'eg-pud-fountain-crown';
    for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'eg-pud-drape d' + (i + 1);
        crown.appendChild(s);
    }
    anchor.appendChild(crown);
    st.fountains.push({ x, t: 0, anchor, jet, crown });
    // Splash SFX, rate-limited so volleys of rain don't stack clips.
    if (now - st.fountainSfxAt > 280) {
        st.fountainSfxAt = now;
        try {
            if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('pud_fountain');
        } catch (e) {}
    }
}


function _egPudSplash(st, x, y) {
    // No water yet — drops still leave a small ground splash.
    const el = _egNkEl(st.run, 'div', 'eg-pud-splash');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 500);
}


// Removes a consumed drop and, if it reached the water, erupts a fountain.
function _egPudConsumeDrop(st, idx, now) {
    const d = st.drops[idx];
    try { d.el.remove(); } catch (e) {}
    st.drops.splice(idx, 1);
}


// Crown-splash profile (like a droplet hitting water, seen in slow motion):
//   0–260ms   thin column shoots up (ease-out) to 55% height
//   260–560ms the column's head flares into the wide draping canopy
//   560–1250ms full crown boils gently
//   1250ms+   the whole splash collapses (ease-in)
function _egPudFountainHeight(tMs) {
    if (tMs >= EG_PUD_FOUNTAIN_MS) return 0;
    const colEnd = 260, flareEnd = 560, boilEnd = 1250;
    let h;
    if (tMs < colEnd) {
        const k = tMs / colEnd;                   // column shoots up
        h = EG_PUD_FOUNTAIN_H * 0.55 * (1 - Math.pow(1 - k, 2));
    } else if (tMs < flareEnd) {
        const k = (tMs - colEnd) / (flareEnd - colEnd); // canopy flares open
        h = EG_PUD_FOUNTAIN_H * (0.55 + 0.45 * (1 - Math.pow(1 - k, 2)));
    } else if (tMs < boilEnd) {
        h = EG_PUD_FOUNTAIN_H * (0.97 + 0.03 * Math.sin(tMs / 110)); // crown boil
    } else {
        const k = (tMs - boilEnd) / (EG_PUD_FOUNTAIN_MS - boilEnd); // collapse
        h = EG_PUD_FOUNTAIN_H * (1 - k * k);
    }
    return Math.max(0, h);
}

// Canopy width over the fountain's life: narrow stem → wide draping crown.
function _egPudFountainWidth(tMs) {
    const flareStart = 200, flareEnd = 700;
    if (tMs <= flareStart) return 1;                  // stem
    if (tMs >= flareEnd) return EG_PUD_FOUNTAIN_CANOPY_W; // full crown
    const k = (tMs - flareStart) / (flareEnd - flareStart);
    return 1 + (EG_PUD_FOUNTAIN_CANOPY_W - 1) * (1 - Math.pow(1 - k, 2));
}


// ── the persistent weather loop ─────────────────────────────────────────

function _egPuddleArenaInit(monster) {
    if (_egPudWatcher) return;
    const monsterId = monster ? monster.id : null;
    const level = monster ? monster.level : 1;
    const st = {
        monsterId, level, run: null,
        waterBand: 0, waterH: 0, waterY: window.innerHeight, waterEl: null,
        drops: [], fountains: [], bubbles: [], shards: [],
        wave: null, waveQ: 0,
        respawnQ: [],
        rainAcc: 0, rainCd: 0, shardCd: 0, fountainSfxAt: 0, warnAt: 0,
    };
    _egPudWatcher = st;
    _egNkToast('eg_mech_puddle', '💧 The Puddle: The sky opens — rain, rising water and drifting bubbles. Stay dry!');
    // Tier-scaled clock: the gate wave's 1.3s telegraph breathes with tier,
    // like the Marksman's aim and the Sprout's whips. `now`-stamp hit
    // cooldowns and the bubble respawn queue stay real-time (fairness floor).
    // Passive run: the watcher lives the whole fight, so it must not hog
    // _egNkDodgeBusy() — only its set-pieces should.
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egPudWatcher && _egPudWatcher.run === run) _egPudWatcher = null;
    };

    st.waterEl = _egNkEl(run, 'div', 'eg-pud-water');
    for (let i = 0; i < EG_PUD_BUBBLE_N; i++) _egPudSpawnBubble(st, performance.now());

    _egNkLoop(run, (dtS, now) => {
        const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
        if (!live) return false; // boss gone → loop kills the run, onKill cleans state

        const W = window.innerWidth, H = window.innerHeight;
        const pr = _egNkPlayerRect();

        // ── Water level: HP gates 75/50/25% → 1/6 / 2/6 / 3/6 of screen,
        //    but never above the puzzle grid's lower border. ──
        const hpPct = live.currentHP / live.maxHP;
        const band = hpPct <= 0.25 ? 3 : hpPct <= 0.50 ? 2 : hpPct <= 0.75 ? 1 : 0;
        if (band > st.waterBand) {
            st.waterBand = band;
            _egNkToast('eg_pud_water' + (band > 1 ? band : ''), '🌊 The water rises!', '#7dd3fc');
            // Signature: once the flood settles, a wave sweeps the surface.
            // 2.6s on the internal clock — tier-scaled like every telegraph.
            st.waveQ = 2600;
        }
        // Cap: surface may touch the grid's bottom edge, no higher.
        const gridR = (typeof _egHzGridRect === 'function') ? _egHzGridRect() : null;
        const capH = gridR ? Math.max(120, H - gridR.bottom) : H;
        const targetH = Math.min(H * EG_PUD_WATER_PCT[st.waterBand], capH);
        if (st.waterH < targetH) st.waterH = Math.min(targetH, st.waterH + EG_PUD_WATER_RISE * dtS);
        st.waterY = H - st.waterH;
        st.waterEl.style.height = Math.round(st.waterH) + 'px';

        // Standing in water: cold DoT (scales with how deep the flood is).
        if (pr && st.waterH > 4 && pr.bottom > st.waterY + 6) {
            _egNkDotTick(run, EG_PUD_WATER_DOT[st.waterBand], dtS, level, 'cold');
            if (now - st.warnAt > 3000) {
                st.warnAt = now;
                _egNkToast('eg_nk_move', '⚠️ Move!', '#7dd3fc');
            }
        }

        // ── Signature gate wave: telegraph at an edge, then sweep the surface ──
        // The queue counts down on the internal (tier-scaled) clock so the
        // settle window breathes with difficulty like every other telegraph.
        if (!st.wave && st.waveQ > 0 && st.waterH > 40) st.waveQ -= dtS * 1000;
        if (!st.wave && st.waveQ !== 0 && st.waveQ <= 0 && st.waterH > 40) {
            st.waveQ = 0;
            const fromLeft = Math.random() < 0.5;
            const wv = {
                x: fromLeft ? -EG_PUD_WAVE_W / 2 : W + EG_PUD_WAVE_W / 2,
                dir: fromLeft ? 1 : -1, t: 0, hit: false, el: _egNkEl(st.run, 'div', 'eg-pud-wave' + (fromLeft ? '' : ' flip')),
            };
            wv.el.style.height = (EG_PUD_WAVE_H[st.waterBand] || EG_PUD_WAVE_H[1]) + 'px';
            const inner = document.createElement('div');
            inner.className = 'eg-pud-wave-inner';
            wv.el.appendChild(inner);
            wv.el.style.left = Math.round(wv.x) + 'px';
            wv.el.style.top = Math.round(st.waterY) + 'px';
            st.wave = wv;
            _egNkToast('eg_pud_wave', '🌊 A wave is charging — get out of the water!', '#38bdf8');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('pud_wave'); } catch (e) {}
        }
        if (st.wave) {
            const wv = st.wave;
            wv.t += dtS * 1000;
            if (wv.t >= EG_PUD_WAVE_TELEGRAPH_MS) {
                wv.el.classList.add('sweep'); // release the curl from its loom
                wv.x += wv.dir * EG_PUD_WAVE_SPEED * dtS;
                // One heavy cold hit if the crest catches the player.
                const h = EG_PUD_WAVE_H[st.waterBand] || EG_PUD_WAVE_H[1];
                if (!wv.hit && pr && _egNkRectsOverlap(
                        { left: wv.x - EG_PUD_WAVE_W / 2, right: wv.x + EG_PUD_WAVE_W / 2, top: st.waterY - h, bottom: st.waterY + 8 }, pr)) {
                    wv.hit = true;
                    const dealt = _egNkHit(EG_PUD_WAVE_DMG[st.waterBand] || EG_PUD_WAVE_DMG[1], 'cold', level);
                    _egNkAbilityHitToast(dealt, 'The Puddle', 'Gate Wave');
                }
                // Spray kicked up along the travelling crest (visual only).
                if (!wv.sprayAt || now - wv.sprayAt > 130) {
                    wv.sprayAt = now;
                    const s = _egNkEl(st.run, 'div', 'eg-pud-wave-spray');
                    s.style.left = Math.round(wv.x + (Math.random() * 60 - 30)) + 'px';
                    s.style.top = Math.round(st.waterY - Math.random() * 40) + 'px';
                    setTimeout(() => { try { s.remove(); } catch (e) {} }, 520);
                }
            }
            const gone = (wv.dir === 1) ? (wv.x - EG_PUD_WAVE_W / 2 > W + 70) : (wv.x + EG_PUD_WAVE_W / 2 < -70);
            if (gone) {
                try { wv.el.remove(); } catch (e) {}
                st.wave = null;
            } else {
                wv.el.style.left = Math.round(wv.x) + 'px';
                wv.el.style.top = Math.round(st.waterY) + 'px'; // rides the rising flood
                wv.el.style.height = (EG_PUD_WAVE_H[st.waterBand] || EG_PUD_WAVE_H[1]) + 'px';
            }
        }

        // ── Rain emitter ──
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));
        st.rainAcc += dtS * 1000;
        const interval = EG_PUD_RAIN_INTERVAL_MS[p] || EG_PUD_RAIN_INTERVAL_MS[1];
        while (st.rainAcc >= interval) {
            st.rainAcc -= interval;
            _egPudSpawnDrop(st, W);
        }

        // ── Rain drops: fall, hit the player, pop bubbles, feed fountains ──
        for (let i = st.drops.length - 1; i >= 0; i--) {
            const d = st.drops[i];
            d.y += EG_PUD_RAIN_SPEED * dtS;
            d.el.style.transform = 'translate(' + Math.round(d.x) + 'px,' + Math.round(d.y) + 'px)';

            let consumed = false;
            // Impact with the player — this is when the damage happens.
            if (pr && now >= st.rainCd && _egNkCircleHit(d.x, d.y, EG_PUD_RAIN_R, pr, 0)) {
                st.rainCd = now + EG_PUD_RAIN_HIT_CD_MS;
                const dealt = _egNkHit(EG_PUD_RAIN_DMG, 'cold', level);
                _egNkAbilityHitToast(dealt, 'The Puddle', 'Rain');
                consumed = true;
            }
            // Raindrop pops an air bubble.
            if (!consumed) {
                for (const b of st.bubbles) {
                    if (b.dead || now < b.graceUntil) continue;
                    if (Math.hypot(b.x - d.x, b.y - d.y) < EG_PUD_BUBBLE_R + EG_PUD_RAIN_R) {
                        _egPudBurstBubble(st, b, now);
                        consumed = true;
                        break;
                    }
                }
            }
            // Landing: in the water → fountain; on dry ground → splash.
            if (!consumed && d.y >= st.waterY) {
                if (st.waterH > 24) _egPudSpawnFountain(st, d.x, now);
                else _egPudSplash(st, d.x, H - 8);
                consumed = true;
            }
            if (consumed) _egPudConsumeDrop(st, i);
        }

        // ── Fountains: crown splashes — grow, flare, collapse; damage on contact ──
        for (let i = st.fountains.length - 1; i >= 0; i--) {
            const f = st.fountains[i];
            f.t += dtS * 1000;
            const h = _egPudFountainHeight(f.t);
            const wMul = _egPudFountainWidth(f.t);
            f.anchor.style.top = Math.round(st.waterY) + 'px'; // ride the rising flood
            f.jet.style.height = Math.round(h) + 'px';
            // Stem head flares open; the crown canopy fades/scales in with it.
            const flare = Math.max(0, Math.min(1, (wMul - 1) / (EG_PUD_FOUNTAIN_CANOPY_W - 1)));
            f.jet.style.transform = 'scaleX(' + (1 + (wMul - 1) * 0.65).toFixed(3) + ')';
            f.crown.style.top = Math.round(st.waterY - h) + 'px';
            f.crown.style.opacity = (flare * 0.95).toFixed(3);
            f.crown.style.transform = 'translate(-50%, -50%) scale(' + (0.7 + 0.3 * flare).toFixed(3) + ')';
            if (h > 6) {
                // Two-part hitbox: narrow stem (full height) + wide canopy head
                // (top 35% of the jet). Player touching either takes the DoT.
                const stemW = EG_PUD_FOUNTAIN_W / 2 + 4;
                const canW = (EG_PUD_FOUNTAIN_W / 2) * wMul + 4;
                const canH = h * 0.35;
                if (pr && (_egNkRectsOverlap(
                        { left: f.x - stemW, right: f.x + stemW, top: st.waterY - h, bottom: st.waterY }, pr) ||
                        _egNkRectsOverlap(
                        { left: f.x - canW, right: f.x + canW, top: st.waterY - h, bottom: st.waterY - h + canH }, pr))) {
                    _egNkDotTick(run, EG_PUD_FOUNTAIN_DMG, dtS, level, 'cold');
                }
                // Splash vs air bubbles → burst (spawn-grace honoured).
                for (const b of st.bubbles) {
                    if (b.dead || now < b.graceUntil) continue;
                    const nearStem = Math.abs(b.x - f.x) < stemW + EG_PUD_BUBBLE_R && b.y > st.waterY - h - EG_PUD_BUBBLE_R;
                    const nearCrown = Math.abs(b.x - f.x) < canW + EG_PUD_BUBBLE_R && b.y > st.waterY - h - canH - EG_PUD_BUBBLE_R && b.y < st.waterY - h + canH;
                    if (nearStem || nearCrown) _egPudBurstBubble(st, b, now);
                }
            }
            if (f.t >= EG_PUD_FOUNTAIN_MS) {
                try { f.anchor.remove(); } catch (e) {}
                st.fountains.splice(i, 1);
            }
        }

        // ── Air bubbles: drift, bounce, stay above the flood ──
        st.bubbles = st.bubbles.filter(b => !b.dead);
        st.bubbles.forEach(b => {
            if (Math.random() < dtS * 1.2) b.a += (Math.random() - 0.5) * 2.4;
            b.x += Math.cos(b.a) * EG_PUD_BUBBLE_SPEED * dtS;
            b.y += Math.sin(b.a) * EG_PUD_BUBBLE_SPEED * dtS;
            if (b.x < EG_PUD_BUBBLE_R || b.x > W - EG_PUD_BUBBLE_R) b.a = Math.PI - b.a;
            const ceil = 40 + EG_PUD_BUBBLE_R, floor = st.waterY - EG_PUD_BUBBLE_R - 8;
            if (b.y < ceil || (floor > ceil && b.y > floor)) b.a = -b.a;
            b.x = Math.max(EG_PUD_BUBBLE_R, Math.min(W - EG_PUD_BUBBLE_R, b.x));
            b.y = Math.max(ceil, Math.min(Math.max(ceil, floor), b.y));
            const bob = Math.sin(now / 320 + b.x) * 4; // idle float
            b.el.style.transform = 'translate(' + Math.round(b.x - EG_PUD_BUBBLE_R) + 'px,' + Math.round(b.y - EG_PUD_BUBBLE_R + bob) + 'px)';
        });
        // Respawn burst bubbles after 40s (queued at burst time).
        st.respawnQ = st.respawnQ.filter(t => {
            if (now >= t) { _egPudSpawnBubble(st, now); return false; }
            return true;
        });

        // ── Bubble shrapnel: fly toward the screen sides, damage on contact ──
        for (let i = st.shards.length - 1; i >= 0; i--) {
            const s = st.shards[i];
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            s.vy -= 30 * dtS; // bubbles rise as they fly
            s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px)';
            if (pr && now >= st.shardCd && _egNkCircleHit(s.x, s.y, 7, pr, 0)) {
                st.shardCd = now + EG_PUD_SHARD_CD_MS;
                const dealt = _egNkHit(EG_PUD_SHARD_DMG, 'cold', level);
                _egNkAbilityHitToast(dealt, 'The Puddle', 'Bubble Burst');
            }
            if (s.x < -24 || s.x > W + 24 || s.y < -24) {
                try { s.el.remove(); } catch (e) {}
                st.shards.splice(i, 1);
            }
        }

        return true;
    });
}
