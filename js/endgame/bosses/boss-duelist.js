//------------------------------------------------------------------------
//-------------------BOSS: THE DUELIST (boss_duelist)---------------------------
//------------------------------------------------------------------------
// Flurry homage: three blinding slashes chase you down in under two
// seconds — then a breath, then another flurry. Block with distance, and
// never be where you were a heartbeat ago.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_duelist: {
        id: 'boss_duelist', name: 'The Duelist', emoji: '🤺',
        baseHP: 1040, baseDamage: 25, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_duelist: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'flurry', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFlurry' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechFlurry(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const flurries = [0, 2, 2, 3][p];
    const slashGapMs = 700, warnMs = 450, radius = 80;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    _egNkToast('eg_mech_duelist', '🤺 The Duelist: Flurry! Never be where you were!');
    let f = 0, s = -1, t = 0, sx = 0, sy = 0;
    let mark = null;
    _egNkLoop(run, (dtS) => {
        if (f >= flurries) {
            if (mark) { mark.remove(); mark = null; }
            return false;
        }
        t += dtS * 1000;
        if (s < 0) {
            // Start of a flurry: 3 slashes, each re-aimed at your live position.
            s = 0;
            t = 0;
        }
        if (!mark) {
            const c = _egNkPlayerCenter();
            sx = c ? c.x : window.innerWidth / 2;
            sy = c ? c.y : window.innerHeight / 2;
            mark = _egNkEl(run, 'div', 'eg-nk-slash');
            mark.style.left = Math.round(sx - radius) + 'px';
            mark.style.top = Math.round(sy - radius) + 'px';
            mark.style.width = radius * 2 + 'px';
            mark.style.height = radius * 2 + 'px';
            t = 0;
        } else if (t >= warnMs) {
            mark.classList.add('eg-nk-slash-hit');
            if (_egNkCircleHit(sx, sy, radius, _egNkPlayerRect(), 0)) {
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
            }
            setTimeout(() => { if (mark) { mark.remove(); mark = null; } }, 300);
            s++;
            t = -slashGapMs + warnMs; // next slash re-aims after a short gap
            if (s >= 3) {
                s = -1;
                f++;
                t = -1200; // breath between flurries
            }
        }
        return true;
    });
}
