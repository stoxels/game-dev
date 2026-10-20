import { Audio_Manager } from '../audio/audio.js';
import { _applyPlayerAilment } from './combat-ailments-core.js';
import { _computePlayerStats } from './combat-player-stats.js';
import {
    HZ_ARCANE_BASE_DMG_PCT, HZ_ARCANE_BEAM_HEIGHT, HZ_ARCANE_BEAM_TRAVEL_MS,
    HZ_ARCANE_CHARGE_MAX_MS, HZ_ARCANE_CHARGE_MIN_MS, HZ_ARCANE_INTERVAL_MAX_MS,
    HZ_ARCANE_INTERVAL_MIN_MS, HZ_ARCANE_POLYMORPH_CHANCE_PCT,
    HZ_ICICLE_BASE_DMG_PCT, HZ_ICICLE_FALL_SPEED, HZ_ICICLE_SHAKE_MS,
    HZ_ICICLE_SPAWN_MAX_MS, HZ_ICICLE_SPAWN_MIN_MS, HZ_LIGHTNING_BASE_DMG_PCT,
    HZ_LIGHTNING_INTERVAL_MAX_MS, HZ_LIGHTNING_INTERVAL_MIN_MS, HZ_LIGHTNING_RADIUS,
    HZ_LIGHTNING_WARNING_MS, HZ_METEOR_BASE_DMG_PCT, HZ_METEOR_FALL_MS,
    HZ_METEOR_IGNITE_CHANCE_PCT, HZ_METEOR_INTERVAL_MAX_MS, HZ_METEOR_INTERVAL_MIN_MS,
    HZ_METEOR_RADIUS, HZ_METEOR_VOLLEY_MAX, HZ_METEOR_VOLLEY_MIN, HZ_METEOR_WARNING_MS,
    _hzActive, _hzApplyCircleHit, _hzDamage, _hzLayer, _hzMult, _hzPlayerHitbox,
    _hzPointOutsideGrid, _hzRand, _hzRectsOverlap,
} from './combat-hazards.js';
import {
    _hzArcane, _hzBlizzard, _hzDarkness, _hzLightning, _hzMeteor,
    _setHzArcane, _setHzBlizzard, _setHzDarkness, _setHzLightning, _setHzMeteor,
} from './combat-hazards.js';

//------------------------------------------------------------------------
//-------------------LIGHTNING STORM--------------------------------------
//------------------------------------------------------------------------

export function _hzInitLightning(intensity) {
    _setHzLightning({
        pending: [],
        nextIn: _hzRand(2500, 5000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _hzMult(intensity),
    });
}

export function _hzTickLightning(dtMs) {
    const st = _hzLightning;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _hzRand(
            HZ_LIGHTNING_INTERVAL_MIN_MS,
            HZ_LIGHTNING_INTERVAL_MAX_MS
        ) * st.intervalScale;

        const pos = _hzPointOutsideGrid(HZ_LIGHTNING_RADIUS * 0.6);
        const el = document.createElement('div');
        el.className = 'sx-hz-lightning-warning';
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        _hzLayer.appendChild(el);
        Audio_Manager.playSFX('hz_lightning_warn');
        st.pending.push({ x: pos.x, y: pos.y, t: HZ_LIGHTNING_WARNING_MS, el });
    }

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const strike = st.pending[i];
        if (!strike.el.isConnected) { st.pending.splice(i, 1); continue; }

        strike.t -= dtMs;
        if (strike.t > 0) continue;

        // Impact: bolt flash, then remove the warning ring.
        strike.el.classList.add('sx-hz-lightning-bolt');
        Audio_Manager.playSFX('hz_lightning_strike');
        const warnEl = strike.el;
        setTimeout(() => warnEl.remove(), 350);
        st.pending.splice(i, 1);

        const pr = _hzPlayerHitbox();
        _hzApplyCircleHit(strike.x, strike.y, HZ_LIGHTNING_RADIUS, pr,
            HZ_LIGHTNING_BASE_DMG_PCT * st.dmgMult, 'lightning', '#ffe66b', 'shocked');
    }
}


//------------------------------------------------------------------------
//-------------------BLIZZARD---------------------------------------------
//------------------------------------------------------------------------

export function _hzInitBlizzard(intensity) {
    // Full-screen snow layer (visual only - never blocks clicks).
    const overlay = document.createElement('div');
    overlay.className = 'sx-hz-blizzard';
    const flakes = 26;
    for (let i = 0; i < flakes; i++) {
        const flake = document.createElement('span');
        flake.className = 'sx-hz-snowflake';
        flake.textContent = '❄';
        flake.style.left = _hzRand(0, 100) + '%';
        flake.style.fontSize = _hzRand(8, 18) + 'px';
        flake.style.opacity = _hzRand(0.35, 0.85).toFixed(2);
        flake.style.animationDuration = _hzRand(5, 11) + 's';
        flake.style.animationDelay = (-_hzRand(0, 10)) + 's';
        overlay.appendChild(flake);
    }
    _hzLayer.appendChild(overlay);
    Audio_Manager.playSFX('hz_blizzard_loop');

    const maxIcicles = Math.min(6, 3 + Math.round(intensity / 40));
    _setHzBlizzard({
        overlay,
        icicles: [],
        spawnIn: _hzRand(1500, 3000),
        maxIcicles,
        spawnScale: 1 - Math.min(0.5, intensity / 200),
        dmgMult: _hzMult(intensity),
    });
}

export function _hzSpawnIcicle() {
    const w = _hzRand(28, 44);
    const h = _hzRand(60, 115);
    const x = _hzRand(20, window.innerWidth - w - 20);
    const el = document.createElement('div');
    el.className = 'sx-hz-icicle sx-hz-icicle-hang';
    el.style.left = x + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _hzLayer.appendChild(el);
    return {
        x, w, h, el,
        state: 'hang',
        t: _hzRand(3500, 9000),
        y: 0,
        hitDone: false,
    };
}

export function _hzTickBlizzard(dtMs) {
    const st = _hzBlizzard;

    st.spawnIn -= dtMs;
    if (st.spawnIn <= 0) {
        st.spawnIn = _hzRand(HZ_ICICLE_SPAWN_MIN_MS, HZ_ICICLE_SPAWN_MAX_MS)
            * st.spawnScale;
        if (st.icicles.length < st.maxIcicles) st.icicles.push(_hzSpawnIcicle());
    }

    const dtS = dtMs / 1000;
    const pr = _hzPlayerHitbox();

    for (let i = st.icicles.length - 1; i >= 0; i--) {
        const ic = st.icicles[i];
        if (!ic.el.isConnected) { st.icicles.splice(i, 1); continue; }

        if (ic.state === 'hang') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'shake';
                ic.t = HZ_ICICLE_SHAKE_MS;
                ic.el.classList.remove('sx-hz-icicle-hang');
                ic.el.classList.add('sx-hz-icicle-shake');
            }
        } else if (ic.state === 'shake') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'fall';
                Audio_Manager.playSFX('hz_icicle_fall');
                ic.el.classList.remove('sx-hz-icicle-shake');
                ic.el.classList.add('sx-hz-icicle-fall');
            }
        } else {
            const prevY = ic.y;
            ic.y += HZ_ICICLE_FALL_SPEED * dtS;
            ic.el.style.transform = `translateY(${Math.round(ic.y)}px)`;

            if (pr && !ic.hitDone) {
                // Swept rect so 140px/tick tunneling can't skip the sprite
                const swept = {
                    left: ic.x, right: ic.x + ic.w,
                    top: Math.min(prevY, ic.y), bottom: Math.max(prevY + ic.h, ic.y + ic.h),
                };
                if (_hzRectsOverlap(swept, pr)) {
                    ic.hitDone = true;
                    const dealt = _hzDamage(
                        HZ_ICICLE_BASE_DMG_PCT * st.dmgMult, 'cold', '#8fd8ff'
                    );
                    if (dealt > 0 && typeof _applyPlayerAilment === 'function') {
                        _applyPlayerAilment('chill');
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

export function _hzInitDarkness(intensity) {
    // Shadow Resistance thins the clouds (min opacity floor keeps them fair).
    let shadowResist = 0;
    try {
        shadowResist = Math.max(0, _computePlayerStats().shadowResist || 0);
    } catch (e) { /* stats unavailable → ignore */ }
    const opacity = Math.max(0.55,
        Math.min(0.95, 0.7 + intensity * 0.004 - (shadowResist / 100) * 0.15));

    const count = Math.min(5, 2 + Math.round(intensity / 33));

    // Own layer above the player HUD so clouds genuinely obscure the screen.
    const darkLayer = document.createElement('div');
    darkLayer.className = 'sx-hz-darkness-layer';

    const clouds = [];
    for (let i = 0; i < count; i++) {
        const scale = _hzRand(0.8, 1.5);
        const el = document.createElement('div');
        el.className = 'sx-hz-cloud';
        el.style.opacity = opacity.toFixed(2);
        el.style.setProperty('--hz-cloud-scale', scale.toFixed(2));
        darkLayer.appendChild(el);
        const cloud = {
            x: _hzRand(-100, window.innerWidth),
            y: _hzRand(0, Math.max(1, window.innerHeight - 160)),
            vx: (i % 2 === 0 ? 1 : -1) * _hzRand(6, 14), // gentle drift
            el,
        };
        // Place immediately so clouds never flash at the top-left corner
        // before the first tick positions them.
        el.style.transform =
            `translate(${Math.round(cloud.x)}px, ${Math.round(cloud.y)}px) scale(var(--hz-cloud-scale, 1))`;
        clouds.push(cloud);
    }
    document.body.appendChild(darkLayer);
    Audio_Manager.playSFX('hz_darkness_spawn');
    _setHzDarkness({ clouds, layer: darkLayer, blinded: false });
}

export function _hzTickDarkness(dtMs) {
    const dtS = dtMs / 1000;
    const vw = window.innerWidth;
    const pr = _hzPlayerHitbox();
    _hzDarkness.clouds.forEach(c => {
        c.x += c.vx * dtS;
        // Wrap around the screen edges so clouds keep circulating slowly.
        if (c.vx > 0 && c.x > vw + 120) c.x = -260;
        if (c.vx < 0 && c.x < -260) c.x = vw + 120;
        c.el.style.transform =
            `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px) scale(var(--hz-cloud-scale, 1))`;
    });

    // A cloud's visual box is the same collision shape used for gameplay.
    // Test the sprite hitbox against every cloud so standing in any part of a
    // cloud reliably applies the blindness effect to player attacks.
    if (pr) {
        _hzDarkness.blinded = _hzDarkness.clouds.some(c => {
            const scale = Number(c.el.style.getPropertyValue('--hz-cloud-scale')) || 1;
            const cloudRect = {
                left: c.x,
                top: c.y,
                right: c.x + 260 * scale,
                bottom: c.y + 110 * scale,
            };
            return _hzRectsOverlap(pr, cloudRect);
        });
    } else {
        _hzDarkness.blinded = false;
    }
}

export function _isPlayerInDarknessCloud() {
    return !!(_hzActive && _hzDarkness && _hzDarkness.blinded);
}


//------------------------------------------------------------------------
//-------------------ARCANE STORM-----------------------------------------
//------------------------------------------------------------------------

export function _hzInitArcane(intensity) {
    _setHzArcane({
        charge: null,
        beam: null,
        nextIn: _hzRand(4000, 7000),
        intervalScale: 1 - Math.min(0.4, intensity / 250),
        dmgMult: _hzMult(intensity),
    });
}

export function _hzStartArcaneCharge() {
    const y = _hzRand(120, Math.max(140, window.innerHeight - 180));
    const chargeMs = _hzRand(HZ_ARCANE_CHARGE_MIN_MS, HZ_ARCANE_CHARGE_MAX_MS);
    const size = 46;

    const orb = document.createElement('div');
    orb.className = 'sx-hz-arcane-orb';
    orb.style.transition = `width ${chargeMs}ms linear, height ${chargeMs}ms linear`;
    orb.style.top = y + 'px';
    _hzLayer.appendChild(orb);
    // Start small, then grow to full charge size over the charge duration.
    requestAnimationFrame(() => {
        orb.style.width = '90px';
        orb.style.height = '90px';
    });

    Audio_Manager.playSFX('hz_arcane_charge');
    _hzArcane.charge = { y, t: chargeMs, total: chargeMs, orb, size };
}

export function _hzTickArcane(dtMs) {
    const st = _hzArcane;

    // ── Charging phase ────────────────────────────────────────────────
    if (st.charge) {
        st.charge.t -= dtMs;
        if (st.charge.t <= 0) _hzFireArcaneBeam();
    } else {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            st.nextIn = _hzRand(
                HZ_ARCANE_INTERVAL_MIN_MS, HZ_ARCANE_INTERVAL_MAX_MS
            ) * st.intervalScale;
            _hzStartArcaneCharge();
        }
    }

    // ── Beam sweep phase ──────────────────────────────────────────────
    if (st.beam) {
        const b = st.beam;
        const prevX = b.x;
        b.x -= b.speed * (dtMs / 1000);
        b.el.style.transform = `translateX(${Math.round(b.x)}px)`;

        const pr = _hzPlayerHitbox();
        if (pr && !b.hitDone) {
            // Swept horizontal interval so 240px/tick doesn't tunnel over 70px hitbox
            const sweptLeft = Math.min(b.x, prevX);
            const sweptRight = Math.max(b.x + b.w, prevX + b.w);
            if (sweptRight >= pr.left && sweptLeft <= pr.right) {
                const bandTop = b.y - HZ_ARCANE_BEAM_HEIGHT / 2;
                const bandBottom = b.y + HZ_ARCANE_BEAM_HEIGHT / 2;
                if (pr.bottom > bandTop && pr.top < bandBottom) {
                    b.hitDone = true;
                    const dealt = _hzDamage(
                        HZ_ARCANE_BASE_DMG_PCT * st.dmgMult, 'shadow', '#c77dff'
                    );
                    if (dealt > 0 && typeof _applyPlayerAilment === 'function'
                        && Math.random() * 100 < HZ_ARCANE_POLYMORPH_CHANCE_PCT) {
                        _applyPlayerAilment('polymorph');
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

export function _hzFireArcaneBeam() {
    const st = _hzArcane;
    if (!st.charge) return;
    const y = st.charge.y;
    if (st.charge.orb) st.charge.orb.remove();
    st.charge = null;

    const w = window.innerWidth + 80;
    const el = document.createElement('div');
    el.className = 'sx-hz-arcane-beam';
    Audio_Manager.playSFX('hz_arcane_beam');
    el.style.width = w + 'px';
    el.style.height = HZ_ARCANE_BEAM_HEIGHT + 'px';
    el.style.top = (y - HZ_ARCANE_BEAM_HEIGHT / 2) + 'px';
    _hzLayer.appendChild(el);

    st.beam = {
        el, w, y,
        x: window.innerWidth - 20,
        speed: (window.innerWidth + 100) / (HZ_ARCANE_BEAM_TRAVEL_MS / 1000),
        hitDone: false,
    };
}


//------------------------------------------------------------------------
//-------------------METEOR BARRAGE---------------------------------------
//------------------------------------------------------------------------
// Meteor volleys: every interval a salvo of meteors telegraphs
// impact circles, then slams down from above. Fire damage, may ignite.

export function _hzInitMeteor(intensity) {
    _setHzMeteor({
        pending: [],
        nextIn: _hzRand(3000, 6000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _hzMult(intensity),
    });
}

export function _hzSpawnMeteor(delayMs) {
    const pos = _hzPointOutsideGrid(HZ_METEOR_RADIUS * 0.6);
    const el = document.createElement('div');
    el.className = 'sx-hz-meteor-warning';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    _hzLayer.appendChild(el);
    _hzMeteor.pending.push({
        x: pos.x, ty: pos.y,
        t: HZ_METEOR_WARNING_MS + delayMs,
        warnEl: el,
        state: 'warn',
        fallEl: null,
        fallDist: 0,
        y: 0,
    });
}

export function _hzTickMeteor(dtMs) {
    const st = _hzMeteor;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _hzRand(
            HZ_METEOR_INTERVAL_MIN_MS,
            HZ_METEOR_INTERVAL_MAX_MS
        ) * st.intervalScale;

        // One salvo: several meteors with slightly staggered impacts.
        const count = HZ_METEOR_VOLLEY_MIN +
            Math.floor(Math.random() * (HZ_METEOR_VOLLEY_MAX - HZ_METEOR_VOLLEY_MIN + 1));
        for (let i = 0; i < count; i++) _hzSpawnMeteor(i * 160);
    }

    const dtS = dtMs / 1000;
    const pr = _hzPlayerHitbox();

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const m = st.pending[i];

        if (m.state === 'warn') {
            if (!m.warnEl.isConnected) { st.pending.splice(i, 1); continue; }
            m.t -= dtMs;
            if (m.t <= 0) {
                m.state = 'fall';
                Audio_Manager.playSFX('hz_meteor_incoming');
                // Start well above the screen, fall down onto the telegraph.
                m.fallDist = window.innerHeight * 0.6;
                m.y = m.ty - m.fallDist;
                const size = 46;
                const fallEl = document.createElement('div');
                fallEl.className = 'sx-hz-meteor-fall';
                fallEl.style.width = size + 'px';
                fallEl.style.height = size + 'px';
                fallEl.style.left = (m.x - size / 2) + 'px';
                fallEl.style.top = (m.y - size / 2) + 'px';
                _hzLayer.appendChild(fallEl);
                m.fallEl = fallEl;
            }
        } else {
            // Falling phase - descend towards the target, then detonate.
            if (!m.fallEl || !m.fallEl.isConnected) { st.pending.splice(i, 1); continue; }
            m.y += (m.fallDist / (HZ_METEOR_FALL_MS / 1000)) * dtS;
            m.fallEl.style.top = (m.y - 23) + 'px';

            if (m.y >= m.ty) {
                // Impact: flash ring, remove warning + meteor.
                Audio_Manager.playSFX('hz_meteor_impact');
                m.fallEl.remove();
                if (m.warnEl && m.warnEl.isConnected) {
                    m.warnEl.classList.add('sx-hz-meteor-impact');
                    const impactEl = m.warnEl;
                    setTimeout(() => impactEl.remove(), 350);
                }
                st.pending.splice(i, 1);

                _hzApplyCircleHit(m.x, m.y, HZ_METEOR_RADIUS, pr,
                    HZ_METEOR_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42',
                    Math.random() * 100 < HZ_METEOR_IGNITE_CHANCE_PCT ? 'ignite' : null);
            }
        }
    }
}
