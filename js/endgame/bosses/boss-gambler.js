//------------------------------------------------------------------------
//-------------------BOSS: THE GAMBLER (boss_gambler)---------------------------
//------------------------------------------------------------------------
// Dice-game homage: the Gambler rolls for a random classic trick every few
// seconds — corruption, bombs, frost, mind games — plus slow aimed shots
// while you reel. Never the same fight twice.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gambler: {
        id: 'boss_gambler', name: 'The Gambler', emoji: '🎲',
        baseHP: 960, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gambler: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'loaded_dice', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechLoadedDice' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


// Classic tricks the dice can roll (handler names only — the shared file
// owns the implementations, so new shared mechanics join the pool for free).
const EG_GAMBLER_POOL = [
    '_egMechCorruptCells', '_egMechPriorBomb', '_egMechFrozenCells',
    '_egMechProbabilityShift', '_egMechClueSwap', '_egMechGridInvert',
    '_egMechFatedCell', '_egMechFogBank', '_egMechClueScramble',
];

function _egMechLoadedDice(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rolls = [0, 2, 3, 4][p];
    const rollGapMs = 2500;
    const boltSpeed = 150, boltR = 10;
    const dmgPct = [0, 0.05, 0.06, 0.08][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth;
    const dice = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-dice', '🎲');
    dice.style.transform = 'translate(' + Math.round(W - 120) + 'px,80px)';
    _egNkToast('eg_mech_gambler', '🎲 The Gambler: Loaded Dice! Place your bets!');
    const bolts = [];
    let done = 0, acc = 0, orbCdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        acc += dtS * 1000;
        if (done < rolls && acc >= rollGapMs) {
            acc = 0;
            done++;
            // Roll a random classic trick.
            const pick = EG_GAMBLER_POOL[Math.floor(Math.random() * EG_GAMBLER_POOL.length)];
            const fn = window[pick];
            if (typeof fn === 'function') { try { fn(monster, phase); } catch (e) {} }
            // ...and throw a slow aimed bolt for good measure.
            const c = _egNkPlayerCenter();
            const tx = c ? c.x : window.innerWidth / 2;
            const ty = c ? c.y : window.innerHeight / 2;
            const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb');
            const dx = tx - (W - 94), dy = ty - 106;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            bolts.push({ x: W - 94, y: 106, vx: (dx / d) * boltSpeed, vy: (dy / d) * boltSpeed, t: 0, hitDone: false, el });
        }
        const pr = _egNkPlayerRect();
        for (let i = bolts.length - 1; i >= 0; i--) {
            const o = bolts[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.t > 7000 || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
                o.el.remove();
                bolts.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && now >= orbCdUntil && _egNkCircleHit(o.x, o.y, boltR, pr, 2)) {
                o.hitDone = true;
                orbCdUntil = now + 600;
                _egNkHit(dmgPct, 'shadow', level);
            }
        }
        return done < rolls || bolts.length > 0;
    });
}
