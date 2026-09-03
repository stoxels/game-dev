//------------------------------------------------------------------------
//-------------------BOSS: THE JUGGERNAUT (boss_juggernaut)---------------------
//------------------------------------------------------------------------
// Pinnacle momentum: five bull rushes at full gallop, then three thwomps
// with shortened fuses — sometimes back to back. The arena is never safe,
// only safer. Keep your feet moving and your eyes up.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_juggernaut: {
        id: 'boss_juggernaut', name: 'The Juggernaut', emoji: '🚂',
        baseHP: 1240, baseDamage: 28, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_juggernaut: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'bull_barrage', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechBullBarrage' },
            { name: 'thwomp_trio', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechThwompTrio' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechBullBarrage(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rushes = [0, 4, 5, 5][p];
    const warnMs = [0, 800, 700, 600][p];
    const dashSpeed = 1050;
    const bandH = 90;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let idx = 0, stage = 'idle', t = 0, dir = 1, ry = 0, bx = 0;
    let lineEl = null, bullEl = null, hitDone = false;
    const clear = () => {
        if (lineEl) { lineEl.remove(); lineEl = null; }
        if (bullEl) { bullEl.remove(); bullEl = null; }
    };
    _egNkToast('eg_mech_juggernaut', '🚂 The Juggernaut: Bull Barrage! No breath between horns!');
    _egNkLoop(run, (dtS) => {
        if (idx >= rushes) { clear(); return false; }
        t += dtS * 1000;
        if (stage === 'idle') {
            const c = _egNkPlayerCenter();
            ry = Math.max(bandH / 2 + 20, Math.min(window.innerHeight - bandH / 2 - 20,
                c ? c.y : window.innerHeight / 2));
            dir = idx % 2 === 0 ? 1 : -1;
            lineEl = _egNkEl(run, 'div', 'eg-nk-band');
            lineEl.style.top = Math.round(ry - bandH / 2) + 'px';
            lineEl.style.height = bandH + 'px';
            stage = 'warn';
            t = 0;
            hitDone = false;
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'dash';
                t = 0;
                if (lineEl) lineEl.classList.add('eg-nk-band-hit');
                bx = dir > 0 ? -90 : window.innerWidth + 90;
                bullEl = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-charger', '🚂');
            }
        } else if (stage === 'dash') {
            bx += dir * dashSpeed * dtS;
            if (bullEl) bullEl.style.transform = 'translate(' + Math.round(bx - 35) + 'px,' + Math.round(ry - 35) + 'px)';
            if (!hitDone) {
                const pr = _egNkPlayerRect();
                if (pr && pr.right > bx - 35 && pr.left < bx + 35
                    && pr.bottom > ry - bandH / 2 && pr.top < ry + bandH / 2) {
                    hitDone = true;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                }
            }
            if (dir > 0 ? bx > window.innerWidth + 90 : bx < -90) {
                clear();
                stage = 'idle';
                t = -350; // barely a breath
                idx++;
            }
        }
        return true;
    });
}

function _egMechThwompTrio(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const followMs = [0, 900, 750, 600][p];
    const lockMs = [0, 450, 400, 350][p];
    const radius = 105;
    const dmgPct = [0, 0.24, 0.28, 0.34][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const queue = [];
    for (let i = 0; i < 3; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-mark');
        el.style.display = 'none';
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        queue.push({ x: 0, y: 0, t: -i * 1300, stage: 'follow', el });
    }
    _egNkToast('eg_mech_trio', '🚂 The Juggernaut: Thwomp Trio! Short fuses!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(s => {
            if (s.stage === 'done') return;
            pending = true;
            s.t += dtS * 1000;
            if (s.t < 0) return;
            if (s.stage === 'follow') {
                const c = _egNkPlayerCenter();
                if (c) { s.x = c.x; s.y = c.y; }
                s.el.style.display = '';
                s.el.style.left = Math.round(s.x - radius) + 'px';
                s.el.style.top = Math.round(s.y - radius) + 'px';
                if (s.t >= followMs) { s.stage = 'lock'; s.t = 0; s.el.classList.add('eg-nk-mark-hit'); }
            } else if (s.stage === 'lock') {
                if (s.t >= lockMs) {
                    s.stage = 'done';
                    s.el.remove();
                    if (_egNkCircleHit(s.x, s.y, radius, _egNkPlayerRect(), 0)) {
                        const dealt = _egNkHit(dmgPct, null, level);
                        _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                    }
                }
            }
        });
        return pending;
    });
}
