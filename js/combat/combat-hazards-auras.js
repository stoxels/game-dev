import { EG_AIL_IGNITE_DMG_SHARE, EG_AIL_MIN_DOT_DAMAGE, _egApplyPlayerAilment } from './combat-ailments-core.js';
import {
    EG_HZ_FIREWALL_BASE_DMG_PCT, EG_HZ_FIREWALL_BOTTOM_SAFE_MAX, EG_HZ_FIREWALL_BOTTOM_SAFE_MIN,
    EG_HZ_FIREWALL_GAP_MARGIN, EG_HZ_FIREWALL_GAP_MAX_W, EG_HZ_FIREWALL_GAP_MIN_W,
    EG_HZ_FIREWALL_HEIGHT, EG_HZ_FIREWALL_IGNITE_CHANCE_PCT, EG_HZ_FIREWALL_INTERVAL_MAX_MS,
    EG_HZ_FIREWALL_INTERVAL_MIN_MS, EG_HZ_FIREWALL_SWEEP_MS, EG_HZ_FIREWALL_TOP_SAFE_MAX,
    EG_HZ_FIREWALL_TOP_SAFE_MIN, EG_HZ_FIREWALL_WARNING_MS, EG_HZ_FROSTNOVA_BAND,
    EG_HZ_FROSTNOVA_BASE_DMG_PCT, EG_HZ_FROSTNOVA_EXPAND_MS, EG_HZ_FROSTNOVA_FREEZE_CHANCE_PCT,
    EG_HZ_FROSTNOVA_INTERVAL_MAX_MS, EG_HZ_FROSTNOVA_INTERVAL_MIN_MS, EG_HZ_FROSTNOVA_MAX_R,
    EG_HZ_VOLATILE_BASE_DMG_PCT, EG_HZ_VOLATILE_BLAST_R, EG_HZ_VOLATILE_FUSE_MS,
    EG_HZ_VOLATILE_LIFETIME_MS, EG_HZ_VOLATILE_RESPAWN_MAX_MS, EG_HZ_VOLATILE_RESPAWN_MIN_MS,
    EG_HZ_VOLATILE_SHADOWBURN_CHANCE_PCT, EG_HZ_VOLATILE_SPEED_MAX, EG_HZ_VOLATILE_SPEED_MIN,
    EG_HZ_VOLATILE_TRIGGER_R, _egHzApplyCircleHit, _egHzCircleRectOverlap, _egHzDamage,
    _egHzLayer, _egHzMult, _egHzPlayerHitbox, _egHzPointOutsideGrid, _egHzRand, _egHzRingRectOverlap,
} from './combat-hazards.js';
import { _egHzFirewall, _egHzFrostNova, _egHzVolatile, _egSetHzFirewall, _egSetHzFrostNova, _egSetHzVolatile } from './combat-hazards.js';

//------------------------------------------------------------------------
//-------------------VOLATILE WISPS---------------------------------------
//------------------------------------------------------------------------
// PoE-style Volatiles: unstable wisps spawn off-screen-ish and slowly home
// in on the player. When close (or after a lifetime) they flash briefly,
// then detonate - shadow damage in a blast radius, may inflict Shadow Burn.

export function _egHzInitVolatile(intensity) {
    const maxWisps = Math.min(6, 1 + Math.round(intensity / 22));
    _egSetHzVolatile({
        wisps: [],
        respawnIn: 0,
        maxWisps,
        speedScale: Math.max(0.65, 1 - intensity / 300),
        dmgMult: _egHzMult(intensity),
    });
    // Stagger the initial wave so wisps don't all arrive simultaneously.
    for (let i = 0; i < maxWisps; i++) {
        const wisp = {
            x: -200, y: -200,
            speed: _egHzRand(EG_HZ_VOLATILE_SPEED_MIN, EG_HZ_VOLATILE_SPEED_MAX),
            state: 'delay',
            t: 800 + i * _egHzRand(1500, 3500),
            life: EG_HZ_VOLATILE_LIFETIME_MS,
            el: null,
        };
        wisp.speed /= _egHzVolatile.speedScale;
        _egHzVolatile.wisps.push(wisp);
    }
}

export function _egHzActivateVolatileWisp(wisp) {
    const pos = _egHzPointOutsideGrid(40);
    wisp.x = pos.x;
    wisp.y = pos.y;
    wisp.life = EG_HZ_VOLATILE_LIFETIME_MS;
    wisp.state = 'hunt';
    const el = document.createElement('div');
    el.className = 'eg-hz-volatile';
    _egHzLayer.appendChild(el);
    wisp.el = el;
}

export function _egHzDetonateVolatile(wisp) {
    const st = _egHzVolatile;
    wisp.state = 'dead';
    if (wisp.el) {
        wisp.el.classList.add('eg-hz-volatile-blast');
        const el = wisp.el;
        setTimeout(() => el.remove(), 400);
        wisp.el = null;
    }

    const pr = _egHzPlayerHitbox();
    _egHzApplyCircleHit(wisp.x, wisp.y, EG_HZ_VOLATILE_BLAST_R, pr,
        EG_HZ_VOLATILE_BASE_DMG_PCT * st.dmgMult, 'shadow', '#b39ddb',
        Math.random() * 100 < EG_HZ_VOLATILE_SHADOWBURN_CHANCE_PCT ? 'shadowburn' : null);

    // Queue a replacement so the pressure never runs dry.
    if (!(st.respawnIn > 0)) {
        st.respawnIn = _egHzRand(
            EG_HZ_VOLATILE_RESPAWN_MIN_MS, EG_HZ_VOLATILE_RESPAWN_MAX_MS);
    }
}

export function _egHzTickVolatile(dtMs) {
    const st = _egHzVolatile;
    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    // Respawn timer for detonated wisps.
    if (st.respawnIn > 0) {
        st.respawnIn -= dtMs;
        if (st.respawnIn <= 0) {
            st.respawnIn = 0;
            const idle = st.wisps.find(w => w.state === 'dead');
            if (idle) _egHzActivateVolatileWisp(idle);
            else st.respawnIn = _egHzRand(1000, 2500);
        }
    }

    st.wisps.forEach(w => {
        if (w.state === 'dead') return;

        if (w.state === 'delay') {
            w.t -= dtMs;
            if (w.t <= 0) _egHzActivateVolatileWisp(w);
            return;
        }

        if (!w.el || !w.el.isConnected) { w.state = 'dead'; return; }

        if (w.state === 'hunt') {
            w.life -= dtMs;
            if (pr) {
                // Use hitbox center for homing; trigger when wisp disc overlaps trigger radius vs hitbox
                const cx = pr.left + pr.width / 2;
                const cy = pr.top + pr.height / 2;
                const dx = cx - w.x, dy = cy - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (_egHzCircleRectOverlap(w.x, w.y, EG_HZ_VOLATILE_TRIGGER_R, pr) || w.life <= 0) {
                    w.state = 'fuse';
                    w.t = EG_HZ_VOLATILE_FUSE_MS;
                    w.el.classList.add('eg-hz-volatile-fuse');
                    return;
                }
                w.x += (dx / dist) * w.speed * dtS;
                w.y += (dy / dist) * w.speed * dtS;
            } else {
                // Player rect unavailable - drift gently instead of stalling.
                w.x += w.speed * 0.2 * dtS;
            }
            w.el.style.transform =
                `translate(${Math.round(w.x)}px, ${Math.round(w.y)}px)`;
        } else if (w.state === 'fuse') {
            w.t -= dtMs;
            if (w.t <= 0) _egHzDetonateVolatile(w);
        }
    });
}


//------------------------------------------------------------------------
//-------------------FROST NOVAS------------------------------------------
//------------------------------------------------------------------------
// PoE-style freezing novas: a frosty core erupts near the player and the
// expanding ring damages anything it passes through once (chill + freeze
// chance). Cold Resistance mitigates; dodging out of the ring radius works.

export function _egHzInitFrostNova(intensity) {
    _egSetHzFrostNova({
        novas: [],
        nextIn: _egHzRand(2500, 5000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    });
}

export function _egHzSpawnFrostNova() {
    // Erupt close to the player so the expanding ring must be reacted to.
    let x = window.innerWidth * 0.5;
    let y = window.innerHeight * 0.5;
    const pr = _egHzPlayerHitbox();
    if (pr) {
        x = pr.left + pr.width / 2 + _egHzRand(-240, 240);
        y = pr.top + pr.height / 2 + _egHzRand(-240, 240);
    }
    x = Math.max(20, Math.min(window.innerWidth - 20, x));
    y = Math.max(20, Math.min(window.innerHeight - 20, y));

    const el = document.createElement('div');
    el.className = 'eg-hz-frostnova';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    _egHzLayer.appendChild(el);

    _egHzFrostNova.novas.push({ x, y, t: EG_HZ_FROSTNOVA_EXPAND_MS, r: 0, el, hitDone: false });
}

export function _egHzTickFrostNova(dtMs) {
    const st = _egHzFrostNova;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _egHzRand(
            EG_HZ_FROSTNOVA_INTERVAL_MIN_MS,
            EG_HZ_FROSTNOVA_INTERVAL_MAX_MS
        ) * st.intervalScale;
        _egHzSpawnFrostNova();
    }

    const pr = _egHzPlayerHitbox();

    for (let i = st.novas.length - 1; i >= 0; i--) {
        const nova = st.novas[i];
        if (!nova.el.isConnected) { st.novas.splice(i, 1); continue; }

        nova.prevR = nova.r;
        nova.t -= dtMs;
        nova.r = EG_HZ_FROSTNOVA_MAX_R *
            Math.min(1, 1 - nova.t / EG_HZ_FROSTNOVA_EXPAND_MS);

        const size = nova.r * 2;
        nova.el.style.width = size + 'px';
        nova.el.style.height = size + 'px';
        nova.el.style.marginLeft = (-nova.r) + 'px';
        nova.el.style.marginTop = (-nova.r) + 'px';

        // The ring band damages the player exactly once as it sweeps past.
        // Swept so 10px/tick + 26px band can't be missed; tight hitbox vs ring.
        if (pr && !nova.hitDone) {
            const prevR = (typeof nova.prevR === 'number') ? nova.prevR : nova.r;
            const hitNow = _egHzRingRectOverlap(nova.x, nova.y, nova.r, EG_HZ_FROSTNOVA_BAND, pr);
            const hitPrev = _egHzRingRectOverlap(nova.x, nova.y, prevR, EG_HZ_FROSTNOVA_BAND, pr);
            if (hitNow || hitPrev) {
                nova.hitDone = true;
                const dealt = _egHzDamage(
                    EG_HZ_FROSTNOVA_BASE_DMG_PCT * st.dmgMult, 'cold', '#a8e6ff'
                );
                if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                    _egApplyPlayerAilment('chill');
                    if (Math.random() * 100 < EG_HZ_FROSTNOVA_FREEZE_CHANCE_PCT) {
                        _egApplyPlayerAilment('frozen');
                    }
                }
            }
        }

        if (nova.t <= 0) {
            nova.el.remove();
            st.novas.splice(i, 1);
        }
    }
}


//------------------------------------------------------------------------
//-------------------FIRE WALLS-------------------------------------------
//------------------------------------------------------------------------
// Telegraphed horizontal flame walls. Randomly picks one of several
// outplay-able variations each spawn so the mechanic is never an
// unavoidable full-screen hit:
//
//   offsetTop  - wall starts inset from the TOP (185–260 px safe strip
//                at the very top, clears the avatar+HP/charge HUD). Sweeps
//                TOP → BOTTOM. Dodge by hugging the top edge.
//   offsetBottom- wall starts inset from the BOTTOM (90–165 px safe strip
//                at the very bottom). Sweeps BOTTOM → TOP. Dodge by
//                hugging the bottom edge.
//   gapDown    - full-width wall with a horizontal GAP (180–280 px) that
//                spans the wall's thickness. Starts at the TOP, sweeps
//                TOP → BOTTOM. Stand in the gap.
//   gapUp      - same gap wall but mirrored: starts at the BOTTOM and
//                sweeps BOTTOM → TOP.
//
// Telegraph (warning) mirrors the wall geometry so the player can read
// the safe zone / gap position during the 5 s wind-up. Damage is
// dealt once when the flame band (including swept interval) overlaps
// the player's tight sprite hitbox; for gap variants the hit is
// suppressed when the hitbox is fully inside the gap.

export function _egHzInitFirewall(intensity) {
    _egSetHzFirewall({
        pending: [],
        nextIn: _egHzRand(3500, 6500),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    });
}

export function _egHzCreateFirewallWallEls(variant, gapX, gapW, startY) {
    const h = EG_HZ_FIREWALL_HEIGHT;
    const hasGap = variant === 'gapDown' || variant === 'gapUp';
    const els = [];
    if (!hasGap) {
        const el = document.createElement('div');
        el.className = 'eg-hz-firewall';
        el.style.height = h + 'px';
        el.style.transform = `translateY(${Math.round(startY)}px)`;
        el.style.display = 'none';
        if (_egHzLayer) _egHzLayer.appendChild(el);
        els.push(el);
    } else {
        const vw = window.innerWidth;
        // Clamp gap to viewport
        const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
            Math.min(gapX, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
        const leftW = gx;
        const rightX = gx + gapW;
        const rightW = Math.max(0, vw - rightX);
        const mkSeg = (left, width) => {
            const seg = document.createElement('div');
            seg.className = 'eg-hz-firewall eg-hz-firewall--gap-seg';
            seg.style.height = h + 'px';
            seg.style.left = left + 'px';
            seg.style.right = 'auto';
            seg.style.width = width + 'px';
            seg.style.transform = `translateY(${Math.round(startY)}px)`;
            seg.style.display = 'none';
            if (_egHzLayer) _egHzLayer.appendChild(seg);
            return seg;
        };
        if (leftW > 2) els.push(mkSeg(0, leftW));
        if (rightW > 2) els.push(mkSeg(rightX, rightW));
        // Edge case: if one side is degenerate (gap at very edge) at least one seg will exist.
        // If both degenerate (should not happen), fallback to single full wall.
        if (els.length === 0) {
            const el = document.createElement('div');
            el.className = 'eg-hz-firewall';
            el.style.height = h + 'px';
            el.style.transform = `translateY(${Math.round(startY)}px)`;
            el.style.display = 'none';
            if (_egHzLayer) _egHzLayer.appendChild(el);
            els.push(el);
        }
    }
    return els;
}

export function _egHzCreateFirewallWarningEls(variant, gapX, gapW, startY) {
    const h = EG_HZ_FIREWALL_HEIGHT;
    const hasGap = variant === 'gapDown' || variant === 'gapUp';
    const els = [];
    if (!hasGap) {
        const warn = document.createElement('div');
        warn.className = 'eg-hz-firewall-warning';
        // Position at the wall's start location so the safe strip is visible.
        warn.style.top = Math.round(startY) + 'px';
        warn.style.height = h + 'px';
        if (_egHzLayer) _egHzLayer.appendChild(warn);
        els.push(warn);
    } else {
        const vw = window.innerWidth;
        const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
            Math.min(gapX, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
        const leftW = gx;
        const rightX = gx + gapW;
        const rightW = Math.max(0, vw - rightX);
        const mkWarnSeg = (left, width) => {
            const seg = document.createElement('div');
            seg.className = 'eg-hz-firewall-warning eg-hz-firewall-warning--gap-seg';
            seg.style.top = Math.round(startY) + 'px';
            seg.style.height = h + 'px';
            seg.style.left = left + 'px';
            seg.style.right = 'auto';
            seg.style.width = width + 'px';
            if (_egHzLayer) _egHzLayer.appendChild(seg);
            return seg;
        };
        if (leftW > 2) els.push(mkWarnSeg(0, leftW));
        if (rightW > 2) els.push(mkWarnSeg(rightX, rightW));
        if (els.length === 0) {
            const warn = document.createElement('div');
            warn.className = 'eg-hz-firewall-warning';
            warn.style.top = Math.round(startY) + 'px';
            warn.style.height = h + 'px';
            if (_egHzLayer) _egHzLayer.appendChild(warn);
            els.push(warn);
        }
    }
    return els;
}

export function _egHzTickFirewall(dtMs) {
    const st = _egHzFirewall;
    const dtS = dtMs / 1000;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        // Never queue a second firewall while any existing firewall is still
        // telegraphing, lingering, or sweeping. In particular, this keeps a
        // gap wall from overlapping an offset wall (and vice versa).
        if (st.pending.length > 0) {
            st.nextIn = 250;
        } else {
            st.nextIn = _egHzRand(
                EG_HZ_FIREWALL_INTERVAL_MIN_MS,
                EG_HZ_FIREWALL_INTERVAL_MAX_MS
            ) * st.intervalScale;

            // ── Pick a random outplay variation ───────────────────────────
            const variants = ['offsetTop', 'offsetBottom', 'gapDown', 'gapUp'];
            const variant = variants[Math.floor(Math.random() * variants.length)];
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const h = EG_HZ_FIREWALL_HEIGHT;
            let startY, endY, dir, gapX = 0, gapW = 0;

            if (variant === 'offsetTop') {
                const safeTop = _egHzRand(EG_HZ_FIREWALL_TOP_SAFE_MIN, EG_HZ_FIREWALL_TOP_SAFE_MAX);
                startY = safeTop;
                endY = vh;
                dir = 1;
            } else if (variant === 'offsetBottom') {
                const safeBottom = _egHzRand(EG_HZ_FIREWALL_BOTTOM_SAFE_MIN, EG_HZ_FIREWALL_BOTTOM_SAFE_MAX);
                startY = vh - h - safeBottom;
                endY = -h;
                dir = -1;
            } else if (variant === 'gapDown') {
                gapW = _egHzRand(EG_HZ_FIREWALL_GAP_MIN_W, EG_HZ_FIREWALL_GAP_MAX_W);
                gapX = _egHzRand(EG_HZ_FIREWALL_GAP_MARGIN, Math.max(EG_HZ_FIREWALL_GAP_MARGIN, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                startY = -h;
                endY = vh;
                dir = 1;
            } else { // gapUp
                gapW = _egHzRand(EG_HZ_FIREWALL_GAP_MIN_W, EG_HZ_FIREWALL_GAP_MAX_W);
                gapX = _egHzRand(EG_HZ_FIREWALL_GAP_MARGIN, Math.max(EG_HZ_FIREWALL_GAP_MARGIN, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                startY = vh;
                endY = -h;
                dir = -1;
            }

            const totalDist = Math.abs(endY - startY);
            const wallEls = _egHzCreateFirewallWallEls(variant, gapX, gapW, startY);
            const warningEls = _egHzCreateFirewallWarningEls(variant, gapX, gapW, startY);
            // Remove telegraph after wind-up; wall becomes visible then.
            const warnElsSnapshot = warningEls.slice();
            setTimeout(() => warnElsSnapshot.forEach(el => { try { el.remove(); } catch(e){} }), EG_HZ_FIREWALL_WARNING_MS);

            const isGapVariant = variant === 'gapDown' || variant === 'gapUp';
            st.pending.push({
                t: EG_HZ_FIREWALL_WARNING_MS,
                lingerT: isGapVariant ? EG_HZ_FIREWALL_WARNING_MS : 0,
                y: startY,
                dir: dir,
                totalDist: totalDist,
                endY: endY,
                variant: variant,
                gapX: gapX,
                gapW: gapW,
                wallEls: wallEls,
                warningEls: warningEls,
                hitDone: false,
            });
        }
    }

    const pr = _egHzPlayerHitbox();

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const w = st.pending[i];
        // If all wall segments have been removed externally, drop entry.
        const anyConnected = w.wallEls.some(el => el.isConnected);
        if (!anyConnected && w.t <= 0 && (w.lingerT || 0) <= 0) { st.pending.splice(i, 1); continue; }
        if (w.wallEls.length === 0) { st.pending.splice(i, 1); continue; }

        // Warning phase - telegraph visible, wall hidden.
        if (w.t > 0) {
            w.t -= dtMs;
            if (w.t <= 0) {
                w.wallEls.forEach(el => { el.style.display = 'block'; });
            }
            continue;
        }

        // Linger phase (gap variants only) - wall visible at start edge, not sweeping yet.
        const isGap = w.variant === 'gapDown' || w.variant === 'gapUp';
        if (isGap && w.lingerT > 0) {
            w.lingerT -= dtMs;
            if (w.lingerT <= 0) {
                // Linger done, sweep will start on next tick.
            }

            // Hit detection during linger - wall is stationary at startY.
            const wallTop = w.y;
            const wallBottom = w.y + EG_HZ_FIREWALL_HEIGHT;
            const verticalOverlap = pr && pr.bottom > wallTop && pr.top < wallBottom;
            if (!w.hitDone && verticalOverlap) {
                let shouldHit = true;
                if (w.variant === 'gapDown' || w.variant === 'gapUp') {
                    const vw = window.innerWidth;
                    const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
                        Math.min(w.gapX, vw - w.gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                    const gapLeft = gx;
                    const gapRight = gx + w.gapW;
                    const inset = 6;
                    const safeLeft = gapLeft + inset;
                    const safeRight = gapRight - inset;
                    if (pr.left >= safeLeft && pr.right <= safeRight) {
                        shouldHit = false;
                    } else {
                        if (w.wallEls.length === 1 && w.gapW <= 0) shouldHit = true;
                    }
                }
                if (shouldHit) {
                    w.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_FIREWALL_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                        _egApplyPlayerAilment('ignite',
                            Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
                    }
                }
            }
            continue;
        }

        // Sweeping phase - the wave moves in its variant direction.
        const prevY = w.y;
        const speed = w.totalDist / (EG_HZ_FIREWALL_SWEEP_MS / 1000);
        w.y += w.dir * speed * dtS;
        w.wallEls.forEach(el => { el.style.transform = `translateY(${Math.round(w.y)}px)`; });

        // Swept vertical interval so high speed cannot skip hitbox.
        const wallTop = Math.min(prevY, w.y);
        const wallBottom = Math.max(prevY + EG_HZ_FIREWALL_HEIGHT, w.y + EG_HZ_FIREWALL_HEIGHT);
        const verticalOverlap = pr && pr.bottom > wallTop && pr.top < wallBottom;

        if (!w.hitDone && verticalOverlap) {
            let shouldHit = true;
            // Gap variants: player fully inside the gap is safe.
            if (w.variant === 'gapDown' || w.variant === 'gapUp') {
                const vw = window.innerWidth;
                const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
                    Math.min(w.gapX, vw - w.gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                const gapLeft = gx;
                const gapRight = gx + w.gapW;
                // Small forgiveness inset so touching the flame edge still burns.
                const inset = 6;
                const safeLeft = gapLeft + inset;
                const safeRight = gapRight - inset;
                // Player rect must be fully inside the inset gap to be safe.
                if (pr.left >= safeLeft && pr.right <= safeRight) {
                    shouldHit = false;
                } else {
                    // Also consider case where gap is degenerate (no segments):
                    // if wallEls covers full width there is no safe gap - must hit.
                    if (w.wallEls.length === 1 && w.gapW <= 0) shouldHit = true;
                }
            }
            // Offset variants use pure vertical check - the top/bottom safe strip
            // is naturally safe because the wall band never covers it.

            if (shouldHit) {
                w.hitDone = true;
                const dealt = _egHzDamage(
                    EG_HZ_FIREWALL_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42'
                );
                if (dealt > 0 && typeof _egApplyPlayerAilment === 'function'
                    && Math.random() * 100 < EG_HZ_FIREWALL_IGNITE_CHANCE_PCT) {
                    _egApplyPlayerAilment('ignite',
                        Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
                }
            }
        }

        // Remove when the wall has fully exited the screen in its direction.
        const exited = (w.dir === 1 && w.y >= window.innerHeight) ||
                       (w.dir === -1 && w.y <= -EG_HZ_FIREWALL_HEIGHT);
        if (exited) {
            w.wallEls.forEach(el => { try { el.remove(); } catch(e){} });
            // Warning already removed via timeout, but ensure cleanup.
            if (w.warningEls) w.warningEls.forEach(el => { try { el.remove(); } catch(e){} });
            st.pending.splice(i, 1);
        }
    }
}
