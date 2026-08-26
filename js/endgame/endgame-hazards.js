//------------------------------------------------------------------------
//-------------------ENDGAME MAP ELEMENTAL HAZARDS------------------------
//------------------------------------------------------------------------
// Screen-space environmental hazards driven by map modifier families:
//   map_hazard_lava      — drifting lava pools around the puzzle grid
//   map_hazard_lightning — telegraphed lightning strikes (shock on hit)
//   map_hazard_blizzard  — snow overlay + falling icicles (chill on hit)
//   map_hazard_darkness  — drifting dark clouds obscuring parts of the UI
//   map_hazard_arcane    — charged arcane beams sweeping right → left
//
// Hazards ONLY affect the player — monsters never interact with them.
// All damage flows through _egPlayerTakeDamage(amount, true, element) so
// the player's elemental resistances / flat Arcane Resistance mitigate it,
// giving a direct incentive to stack resistances on hazard maps.
//
// The rolled mod value acts as the hazard INTENSITY (%): it scales damage,
// spawn counts and frequency. All timing is driven from the encounter's
// 10Hz tick loop (_egHazardsTick), so pausing the game freezes hazards.
//
// Dependencies (loaded before this file):
//   endgame-map-launch.js — _egGetActiveMapModValue
//   endgame-encounter.js  — _egPlayerTakeDamage, _egIsActive
//   endgame-ailments.js   — _egApplyPlayerAilment
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------TUNING CONSTANTS------------------------------------
//------------------------------------------------------------------------

const EG_HZ_LAVA_BASE_DMG_PCT = 2;        // % of playerMaxHP per lava tick
const EG_HZ_LAVA_TICK_MS = 600;           // damage tick rate while standing in lava
const EG_HZ_LAVA_MIN_R = 55;              // pool radius range (px)
const EG_HZ_LAVA_MAX_R = 85;
const EG_HZ_LAVA_SPEED_MIN = 8;           // drift speed range (px/s)
const EG_HZ_LAVA_SPEED_MAX = 20;

const EG_HZ_LIGHTNING_BASE_DMG_PCT = 8;   // % of playerMaxHP per strike
const EG_HZ_LIGHTNING_WARNING_MS = 5000;  // telegraph time before impact
const EG_HZ_LIGHTNING_RADIUS = 80;        // impact radius (px)
const EG_HZ_LIGHTNING_INTERVAL_MIN_MS = 9000;
const EG_HZ_LIGHTNING_INTERVAL_MAX_MS = 14000;

const EG_HZ_ICICLE_BASE_DMG_PCT = 5;      // % of playerMaxHP per icicle hit
const EG_HZ_ICICLE_FALL_SPEED = 1400;     // px/s while dropping
const EG_HZ_ICICLE_SHAKE_MS = 750;
const EG_HZ_ICICLE_SPAWN_MIN_MS = 3000;
const EG_HZ_ICICLE_SPAWN_MAX_MS = 6000;

const EG_HZ_ARCANE_BASE_DMG_PCT = 7;      // % of playerMaxHP per beam hit
const EG_HZ_ARCANE_CHARGE_MIN_MS = 8000;
const EG_HZ_ARCANE_CHARGE_MAX_MS = 10000;
const EG_HZ_ARCANE_BEAM_TRAVEL_MS = 450;  // right → left sweep duration
const EG_HZ_ARCANE_BEAM_HEIGHT = 64;
const EG_HZ_ARCANE_POLYMORPH_CHANCE_PCT = 40;
const EG_HZ_ARCANE_INTERVAL_MIN_MS = 13000;
const EG_HZ_ARCANE_INTERVAL_MAX_MS = 18000;

const EG_HZ_LAYER_Z = 850;                // below player avatar (z:1000)


//------------------------------------------------------------------------
//-------------------RUNTIME STATE---------------------------------------
//------------------------------------------------------------------------

let _egHzActive = false;
let _egHzLayer = null;

let _egHzLava = null;       // { pools: [{x,y,r,vx,vy,el,dmgAcc}], dmgMult }
let _egHzLightning = null;  // { pending: [{x,y,t,el}], nextIn }
let _egHzBlizzard = null;   // { icicles: [], spawnIn, maxIcicles }
let _egHzDarkness = null;   // { clouds: [] }
let _egHzArcane = null;     // { charge: null | {...}, beam: null | {...}, nextIn }


//------------------------------------------------------------------------
//-------------------SMALL HELPERS---------------------------------------
//------------------------------------------------------------------------

function _egHzIntensity(familyId) {
    if (typeof _egGetActiveMapModValue !== 'function') return 0;
    return _egGetActiveMapModValue(familyId);
}

// Damage multiplier from the rolled intensity value (e.g. 60 → ×1.6).
function _egHzMult(intensity) {
    return 1 + Math.max(0, intensity) / 100;
}

function _egHzRand(min, max) {
    return min + Math.random() * (max - min);
}

function _egHzPlayerEl() {
    return document.getElementById('player-avatar-wrapper') ||
           document.getElementById('player-avatar-simple');
}

function _egHzPlayerRect() {
    const el = _egHzPlayerEl();
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return r;
}

// Bounding box of the puzzle grid INCLUDING row/col clue number cells —
// #ptable is one table containing both, so its rect already covers them.
function _egHzGridRect(pad) {
    const g = document.getElementById('ptable');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    const p = pad || 0;
    return {
        left: r.left - p, top: r.top - p,
        right: r.right + p, bottom: r.bottom + p,
        width: r.width + p * 2, height: r.height + p * 2,
    };
}

function _egHzRectsOverlap(a, b) {
    return !!a && !!b &&
        a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top;
}

function _egHzCircleRectOverlap(x, y, r, rect) {
    if (!rect) return false;
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < r * r;
}

// Samples a random viewport point that lies OUTSIDE the puzzle-grid rect
// (inflated by `pad`). Falls back to any viewport point after 40 tries.
function _egHzPointOutsideGrid(pad) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const grid = _egHzGridRect(pad || 0);
    for (let i = 0; i < 40; i++) {
        const x = _egHzRand(30, vw - 30);
        const y = _egHzRand(30, vh - 30);
        if (!grid ||
            x < grid.left || x > grid.right ||
            y < grid.top || y > grid.bottom) {
            return { x, y };
        }
    }
    return { x: vw * 0.5, y: vh - 60 };
}

// Applies an elemental hazard hit to the player (% of max life) through the
// normal intake pipeline → resistances / dodge / block / shock amp apply.
function _egHzDamage(pctOfMaxHP, element, colorHex) {
    if (!_egIsActive()) return 0;
    const maxHP = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
    const amount = Math.max(1, Math.round(maxHP * pctOfMaxHP / 100));
    const dealt = _egPlayerTakeDamage(amount, true, element);
    _egHzShowHitText(dealt, colorHex);
    return dealt;
}

// Small floating damage label on the player avatar.
function _egHzShowHitText(amount, colorHex) {
    if (!(amount > 0)) return;
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-hz-hit-text';
    label.style.color = colorHex || '#ff6b4a';
    label.textContent = '-' + amount;
    hud.appendChild(label);
    setTimeout(() => label.remove(), 900);
}


//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------

// Starts all hazards present on the active map. Called from
// _egResetEncounterState when an encounter begins.
function _egHazardsReset() {
    _egHazardsCleanup();
    if (!_egIsActive()) return;

    const lavaI = _egHzIntensity('map_hazard_lava');
    const lightningI = _egHzIntensity('map_hazard_lightning');
    const blizzardI = _egHzIntensity('map_hazard_blizzard');
    const darknessI = _egHzIntensity('map_hazard_darkness');
    const arcaneI = _egHzIntensity('map_hazard_arcane');

    const active = [];
    if (lavaI > 0) active.push('🌋');
    if (lightningI > 0) active.push('⚡');
    if (blizzardI > 0) active.push('❄️');
    if (darknessI > 0) active.push('🌑');
    if (arcaneI > 0) active.push('🔮');
    if (active.length === 0) return;

    _egHzLayer = document.createElement('div');
    _egHzLayer.id = 'eg-hazards-layer';
    _egHzLayer.style.zIndex = String(EG_HZ_LAYER_Z);
    document.body.appendChild(_egHzLayer);

    if (lavaI > 0) _egHzInitLava(lavaI);
    if (lightningI > 0) _egHzInitLightning(lightningI);
    if (blizzardI > 0) _egHzInitBlizzard(blizzardI);
    if (darknessI > 0) _egHzInitDarkness(darknessI);
    if (arcaneI > 0) _egHzInitArcane(arcaneI);

    _egHzActive = true;
    showToast(`☠️ Elemental Hazards active: ${active.join(' ')}`);
}

// Tears down every hazard DOM node and state. Safe to call anytime.
function _egHazardsCleanup() {
    _egHzActive = false;
    _egHzLava = null;
    _egHzLightning = null;
    _egHzBlizzard = null;
    _egHzDarkness = null;
    _egHzArcane = null;
    if (_egHzLayer) {
        _egHzLayer.remove();
        _egHzLayer = null;
    }
    // Darkness clouds live outside the main layer (higher z-index).
    document.querySelectorAll('.eg-hz-darkness-layer').forEach(el => el.remove());
}

// Per-tick driver — called at 10Hz from _egTickLoop.
function _egHazardsTick() {
    if (!_egHzActive) return;
    if (typeof dead !== 'undefined' && dead) return;
    const dtMs = 100;

    if (_egHzLava) _egHzTickLava(dtMs);
    if (_egHzLightning) _egHzTickLightning(dtMs);
    if (_egHzBlizzard) _egHzTickBlizzard(dtMs);
    if (_egHzDarkness) _egHzTickDarkness(dtMs);
    if (_egHzArcane) _egHzTickArcane(dtMs);
}


//------------------------------------------------------------------------
//-------------------LAVA POOLS------------------------------------------
//------------------------------------------------------------------------

function _egHzInitLava(intensity) {
    const count = Math.min(5, 2 + Math.round(intensity / 34));
    const pools = [];
    for (let i = 0; i < count; i++) {
        const r = _egHzRand(EG_HZ_LAVA_MIN_R, EG_HZ_LAVA_MAX_R);
        const pos = _egHzPointOutsideGrid(r + 24);
        const speed = _egHzRand(EG_HZ_LAVA_SPEED_MIN, EG_HZ_LAVA_SPEED_MAX);
        const angle = Math.random() * Math.PI * 2;

        const el = document.createElement('div');
        el.className = 'eg-hz-lava';
        const size = r * 2;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.animationDelay = (-Math.random() * 3) + 's';
        _egHzLayer.appendChild(el);

        pools.push({
            x: pos.x, y: pos.y, r,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            el, dmgAcc: 0,
        });
    }
    _egHzLava = { pools, dmgMult: _egHzMult(intensity), intensity };
}

function _egHzTickLava(dtMs) {
    const dtS = dtMs / 1000;
    const grid = _egHzGridRect(10);
    const pr = _egHzPlayerRect();

    _egHzLava.pools.forEach(p => {
        if (!p.el.isConnected) return;

        // Slow drift; bounce off viewport edges and steer around the grid.
        let nx = p.x + p.vx * dtS;
        let ny = p.y + p.vy * dtS;
        const half = p.r;
        if (_egHzCircleRectOverlap(nx, ny, half * 0.7, grid)) {
            // Reflect away from the grid without entering it.
            if (nx > grid.left - half && nx < grid.right + half) p.vx *= -1;
            if (ny > grid.top - half && ny < grid.bottom + half) p.vy *= -1;
            nx = p.x; ny = p.y;
        }
        if (nx < half || nx > window.innerWidth - half) { p.vx *= -1; nx = p.x; }
        if (ny < half || ny > window.innerHeight - half) { p.vy *= -1; ny = p.y; }
        p.x = nx; p.y = ny;
        p.el.style.transform = `translate(${Math.round(p.x - p.r)}px, ${Math.round(p.y - p.r)}px)`;

        // Fire damage while the player stands inside the pool.
        p.dmgAcc += dtMs;
        if (p.dmgAcc >= EG_HZ_LAVA_TICK_MS) {
            p.dmgAcc = 0;
            if (pr) {
                const cx = pr.left + pr.width / 2;
                const cy = pr.top + pr.height / 2;
                const dx = cx - p.x, dy = cy - p.y;
                if (dx * dx + dy * dy <= Math.pow(p.r * 0.95, 2)) {
                    _egHzDamage(EG_HZ_LAVA_BASE_DMG_PCT * _egHzLava.dmgMult, 'fire', '#ff6b4a');
                }
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------LIGHTNING STORM--------------------------------------
//------------------------------------------------------------------------

function _egHzInitLightning(intensity) {
    _egHzLightning = {
        pending: [],
        nextIn: _egHzRand(2500, 5000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzTickLightning(dtMs) {
    const st = _egHzLightning;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _egHzRand(
            EG_HZ_LIGHTNING_INTERVAL_MIN_MS,
            EG_HZ_LIGHTNING_INTERVAL_MAX_MS
        ) * st.intervalScale;

        const pos = _egHzPointOutsideGrid(EG_HZ_LIGHTNING_RADIUS * 0.6);
        const el = document.createElement('div');
        el.className = 'eg-hz-lightning-warning';
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        _egHzLayer.appendChild(el);
        st.pending.push({ x: pos.x, y: pos.y, t: EG_HZ_LIGHTNING_WARNING_MS, el });
    }

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const strike = st.pending[i];
        if (!strike.el.isConnected) { st.pending.splice(i, 1); continue; }

        strike.t -= dtMs;
        if (strike.t > 0) continue;

        // Impact: bolt flash, then remove the warning ring.
        strike.el.classList.add('eg-hz-lightning-bolt');
        const warnEl = strike.el;
        setTimeout(() => warnEl.remove(), 350);
        st.pending.splice(i, 1);

        const pr = _egHzPlayerRect();
        if (pr) {
            const cx = pr.left + pr.width / 2;
            const cy = pr.top + pr.height / 2;
            const dx = cx - strike.x, dy = cy - strike.y;
            if (dx * dx + dy * dy <= Math.pow(EG_HZ_LIGHTNING_RADIUS, 2)) {
                const dealt = _egHzDamage(
                    EG_HZ_LIGHTNING_BASE_DMG_PCT * st.dmgMult, 'lightning', '#ffe66b'
                );
                if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                    _egApplyPlayerAilment('shocked');
                }
            }
        }
    }
}


//------------------------------------------------------------------------
//-------------------BLIZZARD---------------------------------------------
//------------------------------------------------------------------------

function _egHzInitBlizzard(intensity) {
    // Full-screen snow layer (visual only — never blocks clicks).
    const overlay = document.createElement('div');
    overlay.className = 'eg-hz-blizzard';
    const flakes = 26;
    for (let i = 0; i < flakes; i++) {
        const flake = document.createElement('span');
        flake.className = 'eg-hz-snowflake';
        flake.textContent = '❄';
        flake.style.left = _egHzRand(0, 100) + '%';
        flake.style.fontSize = _egHzRand(8, 18) + 'px';
        flake.style.opacity = _egHzRand(0.35, 0.85).toFixed(2);
        flake.style.animationDuration = _egHzRand(5, 11) + 's';
        flake.style.animationDelay = (-_egHzRand(0, 10)) + 's';
        overlay.appendChild(flake);
    }
    _egHzLayer.appendChild(overlay);

    const maxIcicles = Math.min(6, 3 + Math.round(intensity / 40));
    _egHzBlizzard = {
        overlay,
        icicles: [],
        spawnIn: _egHzRand(1500, 3000),
        maxIcicles,
        spawnScale: 1 - Math.min(0.5, intensity / 200),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzSpawnIcicle() {
    const w = _egHzRand(28, 44);
    const h = _egHzRand(60, 115);
    const x = _egHzRand(20, window.innerWidth - w - 20);
    const el = document.createElement('div');
    el.className = 'eg-hz-icicle eg-hz-icicle-hang';
    el.style.left = x + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _egHzLayer.appendChild(el);
    return {
        x, w, h, el,
        state: 'hang',
        t: _egHzRand(3500, 9000),
        y: 0,
        hitDone: false,
    };
}

function _egHzTickBlizzard(dtMs) {
    const st = _egHzBlizzard;

    st.spawnIn -= dtMs;
    if (st.spawnIn <= 0) {
        st.spawnIn = _egHzRand(EG_HZ_ICICLE_SPAWN_MIN_MS, EG_HZ_ICICLE_SPAWN_MAX_MS)
            * st.spawnScale;
        if (st.icicles.length < st.maxIcicles) st.icicles.push(_egHzSpawnIcicle());
    }

    const dtS = dtMs / 1000;
    const pr = _egHzPlayerRect();

    for (let i = st.icicles.length - 1; i >= 0; i--) {
        const ic = st.icicles[i];
        if (!ic.el.isConnected) { st.icicles.splice(i, 1); continue; }

        if (ic.state === 'hang') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'shake';
                ic.t = EG_HZ_ICICLE_SHAKE_MS;
                ic.el.classList.remove('eg-hz-icicle-hang');
                ic.el.classList.add('eg-hz-icicle-shake');
            }
        } else if (ic.state === 'shake') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'fall';
                ic.el.classList.remove('eg-hz-icicle-shake');
                ic.el.classList.add('eg-hz-icicle-fall');
            }
        } else {
            ic.y += EG_HZ_ICICLE_FALL_SPEED * dtS;
            ic.el.style.transform = `translateY(${Math.round(ic.y)}px)`;

            if (pr && !ic.hitDone) {
                const icRect = {
                    left: ic.x, right: ic.x + ic.w,
                    top: ic.y, bottom: ic.y + ic.h,
                };
                if (_egHzRectsOverlap(icRect, pr)) {
                    ic.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_ICICLE_BASE_DMG_PCT * st.dmgMult, 'cold', '#8fd8ff'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                        _egApplyPlayerAilment('chill');
                    }
                }
            }

            if (ic.y > window.innerHeight + ic.h) {
                ic.el.remove();
                st.icicles.splice(i, 1);
            }
        }
    }
}


//------------------------------------------------------------------------
//-------------------DARKNESS CLOUDS--------------------------------------
//------------------------------------------------------------------------

function _egHzInitDarkness(intensity) {
    // Shadow Resistance thins the clouds (min opacity floor keeps them fair).
    let shadowResist = 0;
    try {
        shadowResist = Math.max(0, _egComputePlayerStats().shadowResist || 0);
    } catch (e) { /* stats unavailable → ignore */ }
    const opacity = Math.max(0.55,
        Math.min(0.95, 0.7 + intensity * 0.004 - (shadowResist / 100) * 0.15));

    const count = Math.min(5, 2 + Math.round(intensity / 33));

    // Own layer above the player HUD so clouds genuinely obscure the screen.
    const darkLayer = document.createElement('div');
    darkLayer.className = 'eg-hz-darkness-layer';

    const clouds = [];
    for (let i = 0; i < count; i++) {
        const scale = _egHzRand(0.8, 1.5);
        const el = document.createElement('div');
        el.className = 'eg-hz-cloud';
        el.style.opacity = opacity.toFixed(2);
        el.style.setProperty('--hz-cloud-scale', scale.toFixed(2));
        darkLayer.appendChild(el);
        const cloud = {
            x: _egHzRand(-100, window.innerWidth),
            y: _egHzRand(0, Math.max(1, window.innerHeight - 160)),
            vx: (i % 2 === 0 ? 1 : -1) * _egHzRand(6, 14), // gentle drift
            el,
        };
        // Place immediately so clouds never flash at the top-left corner
        // before the first tick positions them.
        el.style.transform =
            `translate(${Math.round(cloud.x)}px, ${Math.round(cloud.y)}px) scale(var(--hz-cloud-scale, 1))`;
        clouds.push(cloud);
    }
    document.body.appendChild(darkLayer);
    _egHzDarkness = { clouds, layer: darkLayer };
}

function _egHzTickDarkness(dtMs) {
    const dtS = dtMs / 1000;
    const vw = window.innerWidth;
    _egHzDarkness.clouds.forEach(c => {
        c.x += c.vx * dtS;
        // Wrap around the screen edges so clouds keep circulating slowly.
        if (c.vx > 0 && c.x > vw + 120) c.x = -260;
        if (c.vx < 0 && c.x < -260) c.x = vw + 120;
        c.el.style.transform =
            `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px) scale(var(--hz-cloud-scale, 1))`;
    });
}


//------------------------------------------------------------------------
//-------------------ARCANE STORM-----------------------------------------
//------------------------------------------------------------------------

function _egHzInitArcane(intensity) {
    _egHzArcane = {
        charge: null,
        beam: null,
        nextIn: _egHzRand(4000, 7000),
        intervalScale: 1 - Math.min(0.4, intensity / 250),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzStartArcaneCharge() {
    const y = _egHzRand(120, Math.max(140, window.innerHeight - 180));
    const chargeMs = _egHzRand(EG_HZ_ARCANE_CHARGE_MIN_MS, EG_HZ_ARCANE_CHARGE_MAX_MS);
    const size = 46;

    const orb = document.createElement('div');
    orb.className = 'eg-hz-arcane-orb';
    orb.style.transition = `width ${chargeMs}ms linear, height ${chargeMs}ms linear`;
    orb.style.top = y + 'px';
    _egHzLayer.appendChild(orb);
    // Start small, then grow to full charge size over the charge duration.
    requestAnimationFrame(() => {
        orb.style.width = '90px';
        orb.style.height = '90px';
    });

    _egHzArcane.charge = { y, t: chargeMs, total: chargeMs, orb, size };
}

function _egHzTickArcane(dtMs) {
    const st = _egHzArcane;

    // ── Charging phase ────────────────────────────────────────────────
    if (st.charge) {
        st.charge.t -= dtMs;
        if (st.charge.t <= 0) _egHzFireArcaneBeam();
    } else {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            st.nextIn = _egHzRand(
                EG_HZ_ARCANE_INTERVAL_MIN_MS, EG_HZ_ARCANE_INTERVAL_MAX_MS
            ) * st.intervalScale;
            _egHzStartArcaneCharge();
        }
    }

    // ── Beam sweep phase ──────────────────────────────────────────────
    if (st.beam) {
        const b = st.beam;
        b.x -= b.speed * (dtMs / 1000);
        b.el.style.transform = `translateX(${Math.round(b.x)}px)`;

        const pr = _egHzPlayerRect();
        if (pr && !b.hitDone) {
            const beamRight = b.x + b.w;
            if (beamRight >= pr.left && b.x <= pr.right) {
                const bandTop = b.y - EG_HZ_ARCANE_BEAM_HEIGHT / 2;
                const bandBottom = b.y + EG_HZ_ARCANE_BEAM_HEIGHT / 2;
                if (pr.bottom > bandTop && pr.top < bandBottom) {
                    b.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_ARCANE_BASE_DMG_PCT * st.dmgMult, 'arcane', '#c77dff'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function'
                        && Math.random() * 100 < EG_HZ_ARCANE_POLYMORPH_CHANCE_PCT) {
                        _egApplyPlayerAilment('polymorph');
                    }
                }
            }
        }

        if (b.x + b.w < -40) {
            b.el.remove();
            st.beam = null;
        }
    }
}

function _egHzFireArcaneBeam() {
    const st = _egHzArcane;
    if (!st.charge) return;
    const y = st.charge.y;
    if (st.charge.orb) st.charge.orb.remove();
    st.charge = null;

    const w = window.innerWidth + 80;
    const el = document.createElement('div');
    el.className = 'eg-hz-arcane-beam';
    el.style.width = w + 'px';
    el.style.height = EG_HZ_ARCANE_BEAM_HEIGHT + 'px';
    el.style.top = (y - EG_HZ_ARCANE_BEAM_HEIGHT / 2) + 'px';
    _egHzLayer.appendChild(el);

    st.beam = {
        el, w, y,
        x: window.innerWidth - 20,
        speed: (window.innerWidth + 100) / (EG_HZ_ARCANE_BEAM_TRAVEL_MS / 1000),
        hitDone: false,
    };
}
