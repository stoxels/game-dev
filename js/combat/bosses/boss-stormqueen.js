import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE STORMQUEEN (boss_stormqueen)---------------------
//------------------------------------------------------------------------
// Pinnacle tempest: three hunting storms that never tire, under a ceaseless
// shrapnel downpour. The storms herd you; the sky finishes the job. Keep
// your distance from everything, all at once.
//
// Shared mechanics (fated_cell) live in shared-puzzle-mechanics.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_stormqueen: {
        id: 'boss_stormqueen', name: 'The Stormqueen', emoji: '🌩️',
        baseHP: 1180, baseDamage: 26, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_stormqueen: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'queen_storms', intervalBase: 19000, intervalVariance: 4000, handler: '_mechQueenStorms' },
            { name: 'shrapnel_downpour', intervalBase: 20000, intervalVariance: 4000, handler: '_mechShrapnelDownpour' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_mechFatedCell' },
        ],
    },
});


export function _mechQueenStorms(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 62, 75, 92][p];
    const dotPct = [0, 11, 13, 16][p];
    const radius = 100;
    const durMs = 10000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const storms = [];
    for (let i = 0; i < 3; i++) {
        const el = _nkEl(run, 'div', 'sx-nk-storm');
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        const s = {
            x: window.innerWidth * (0.2 + 0.3 * i),
            y: 80 + (i % 2) * (window.innerHeight - 160),
            el,
        };
        el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        storms.push(s);
    }
    _nkToast('eg_mech_stormqueen', '🌩️ The Stormqueen: Queen Storms! No distance is safe!');
    let e = 0, dotWarnAt = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _nkPlayerCenter();
        storms.forEach(s => {
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * speed * dtS;
                s.y += (dy / d) * speed * dtS;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        });
        const pr = _nkPlayerRect();
        if (pr) {
            const inside = storms.some(s => _nkCircleHit(s.x, s.y, radius, pr, 0));
            if (inside) {
                _nkDotTick(run, dotPct, dtS, level, 'lightning');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _nkToast('eg_nk_move', '⚠️ Move!', '#f87171');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}

export function _mechShrapnelDownpour(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const total = [0, 14, 16, 20][p];
    const emitMs = 2200;
    const warnMs = 700, radius = 26;
    const dmgPct = [0, 0.06, 0.07, 0.09][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const drops = [];
    let emitted = 0, emitAcc = 0, cdUntil = 0;
    _nkToast('eg_mech_downpour', '🌩️ The Stormqueen: Shrapnel Downpour! The sky falls!');
    _nkLoop(run, (dtS, now) => {
        emitAcc += dtS * 1000;
        const step = emitMs / total;
        while (emitted < total && emitAcc >= step) {
            emitAcc -= step;
            emitted++;
            let x, y;
            if (Math.random() < 0.7) {
                const c = _nkPlayerCenter();
                x = (c ? c.x : window.innerWidth / 2) + (Math.random() * 220 - 110);
                y = (c ? c.y : window.innerHeight / 2) + (Math.random() * 220 - 110);
            } else {
                x = 40 + Math.random() * Math.max(40, window.innerWidth - 80);
                y = 40 + Math.random() * Math.max(40, window.innerHeight - 80);
            }
            const el = _nkEl(run, 'div', 'sx-nk-mark');
            el.style.left = Math.round(x - radius) + 'px';
            el.style.top = Math.round(y - radius) + 'px';
            el.style.width = radius * 2 + 'px';
            el.style.height = radius * 2 + 'px';
            drops.push({ x, y, t: 0, struck: false, el });
        }
        const pr = _nkPlayerRect();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dtS * 1000;
            if (!d.struck && d.t >= warnMs) {
                d.struck = true;
                d.el.classList.add('sx-nk-mark-hit');
                if (pr && now >= cdUntil && _nkCircleHit(d.x, d.y, radius, pr, 0)) {
                    cdUntil = now + 350;
                    const dealt = _nkHit(dmgPct, 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Stormqueen', 'Shrapnel Downpour');
                }
            }
            if (d.t >= warnMs + 400) {
                d.el.remove();
                drops.splice(i, 1);
            }
        }
        return emitted < total || drops.length > 0;
    });
}
