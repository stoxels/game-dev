//------------------------------------------------------------------------
//-------------------BOSS: THE CHAOS (boss_chaos)-------------------------------
//------------------------------------------------------------------------
// Pinnacle entropy: a roulette of ruin — shrapnel, orbs, sweeps and pulses
// in an order even it does not know — punctuated by a war shout that
// empowers it further every time. Adapt or die adapting.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_chaos: {
        id: 'boss_chaos', name: 'The Chaos', emoji: '💢',
        baseHP: 1200, baseDamage: 27, chargeMax: 10,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_chaos: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 7, damageMultiplier: 1.65 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.30 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'chaos_roulette', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechChaosRoulette' },
            { name: 'war_shout', intervalBase: 22000, intervalVariance: 4000, handler: '_egMechWarShout' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egChaosDrop(run, x, y, level, dmg) {
    const el = _egNkEl(run, 'div', 'eg-nk-mark');
    el.style.left = Math.round(x - 26) + 'px';
    el.style.top = Math.round(y - 26) + 'px';
    el.style.width = '52px';
    el.style.height = '52px';
    const st = { t: 0 };
    const step = { update(dtS) { st.t += dtS * 1000; return st.t < 800; }, strike() {
        el.classList.add('eg-nk-mark-hit');
        setTimeout(() => el.remove(), 400);
        if (_egNkCircleHit(x, y, 26, _egNkPlayerRect(), 0)) _egNkHit(dmg, 'shadow', level);
    } };
    return step;
}

function _egChaosOrb(run, x, y, vx, vy, level, dmg) {
    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb');
    const o = { x, y, vx, vy, t: 0, hitDone: false, el };
    o.update = (dtS, now, cd) => {
        o.t += dtS * 1000;
        o.x += o.vx * dtS;
        o.y += o.vy * dtS;
        if (o.t > 6000 || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
            o.el.remove();
            return 'gone';
        }
        o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
        if (!o.hitDone && now >= cd.until && _egNkCircleHit(o.x, o.y, 10, _egNkPlayerRect(), 2)) {
            o.hitDone = true;
            cd.until = now + 500;
            _egNkHit(dmg, 'shadow', level);
        }
        return 'fly';
    };
    o.remove = () => o.el.remove();
    return o;
}

function _egMechChaosRoulette(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const spins = [0, 4, 5, 6][p];
    const spinGapMs = 1800;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    _egNkToast('eg_mech_chaos', '💢 The Chaos: Roulette of Ruin! Adapt or die adapting!');
    const bits = []; // active projectiles / delayed strikes
    const cd = { until: 0 };
    let done = 0, acc = 0;
    const spin = () => {
        const kind = Math.floor(Math.random() * 4);
        const c = _egNkPlayerCenter();
        const px = c ? c.x : W / 2, py = c ? c.y : H / 2;
        if (kind === 0) {
            // Shrapnel pair at the player's feet.
            for (let k = 0; k < 2; k++) {
                const x = Math.max(40, Math.min(W - 40, px + (Math.random() * 200 - 100)));
                const y = Math.max(40, Math.min(H - 40, py + (Math.random() * 200 - 100)));
                bits.push(_egChaosDrop(run, x, y, level, 0.08));
            }
        } else if (kind === 1) {
            // Orb cross from the center.
            const ex = W / 2, ey = H / 2;
            for (let k = 0; k < 4; k++) {
                const a = Math.random() * Math.PI * 2 + k * Math.PI / 2;
                bits.push(_egChaosOrb(run, ex, ey, Math.cos(a) * 170, Math.sin(a) * 170, level, 0.06));
            }
        } else if (kind === 2) {
            // Fast chaser, short life.
            const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-serpent', '💢');
            const ch = { x: Math.random() * W, y: 60, t: 0, el, cdU: 0 };
            ch.update = (dtS, now) => {
                ch.t += dtS * 1000;
                const q = _egNkPlayerCenter();
                if (q) {
                    const dx = q.x - ch.x, dy = q.y - ch.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    ch.x += (dx / d) * 200 * dtS;
                    ch.y += (dy / d) * 200 * dtS;
                }
                ch.el.style.transform = 'translate(' + Math.round(ch.x - 22) + 'px,' + Math.round(ch.y - 22) + 'px)';
                if (now >= ch.cdU && _egNkCircleHit(ch.x, ch.y, 22, _egNkPlayerRect(), 0)) {
                    ch.cdU = now + 800;
                    _egNkHit(0.12, 'shadow', level);
                }
                if (ch.t > 4000) { ch.el.remove(); return 'gone'; }
                return 'fly';
            };
            ch.remove = () => ch.el.remove();
            bits.push(ch);
        } else {
            // Pulse ring from a random anchor — outrun the band.
            const ax = 100 + Math.random() * Math.max(60, W - 200);
            const ay = 100 + Math.random() * Math.max(60, H - 200);
            const ring = _egNkEl(run, 'div', 'eg-nk-ring');
            const pu = { t: 0, r: 30 };
            const rMax = 320;
            pu.update = (dtS, now) => {
                pu.t += dtS * 1000;
                pu.r = 30 + (rMax - 30) * Math.min(1, pu.t / 1500);
                const r = Math.round(pu.r);
                ring.style.left = Math.round(ax - r) + 'px';
                ring.style.top = Math.round(ay - r) + 'px';
                ring.style.width = r * 2 + 'px';
                ring.style.height = r * 2 + 'px';
                const q = _egNkPlayerCenter();
                if (q && now >= cd.until && Math.abs(Math.hypot(q.x - ax, q.y - ay) - pu.r) < 24) {
                    cd.until = now + 900;
                    _egNkHit(0.14, 'shadow', level);
                }
                if (pu.t > 2000) { ring.remove(); return 'gone'; }
                return 'fly';
            };
            pu.remove = () => ring.remove();
            bits.push(pu);
        }
    };
    _egNkLoop(run, (dtS, now) => {
        acc += dtS * 1000;
        if (done < spins && acc >= spinGapMs) {
            acc = 0;
            done++;
            spin();
        }
        for (let i = bits.length - 1; i >= 0; i--) {
            const b = bits[i];
            const st = b.update(dtS, now, cd);
            if (st === 'gone') {
                // Projectiles/rings remove their own visuals on expiry.
                bits.splice(i, 1);
            } else if (st === false) {
                // Delayed drops detonate when their timer lapses.
                if (b.strike) b.strike();
                bits.splice(i, 1);
            }
        }
        return done < spins || bits.length > 0;
    });
}

function _egMechWarShout(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const stacks = [0, 1, 2, 2][p];
    const run = _egNkNewRun(monster && monster.id, false);
    void run;
    if (!monster) return;
    monster.enrageStacks = Math.min(10, (monster.enrageStacks || 0) + stacks);
    if (typeof _egBossRecalcDamage === 'function') {
        try { _egBossRecalcDamage(monster); } catch (e) {}
    }
    const card = document.getElementById(`eg-card-${monster.id}`);
    const wrapper = card ? card.querySelector('.eg-emoji-wrapper') : null;
    if (wrapper) wrapper.classList.add('eg-boss-enraged');
    _egNkToast('eg_tactician_rage', '💢 The Chaos ROARS! Its damage surges!', '#f87171');
}
