//------------------------------------------------------------------------
//-------------------BOSS: THE TACTICIAN (boss_tactician)-----------------------
//------------------------------------------------------------------------
// Tactics homage: the Tactician declares its intent — crossed swords for a
// volley, a shield for a tithe, a raging face for raw empowerment — then
// executes it two seconds later. Read the intent, prepare the answer.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_tactician: {
        id: 'boss_tactician', name: 'The Tactician', emoji: '♟️',
        baseHP: 980, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_tactician: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'battle_intent', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBattleIntent' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechBattleIntent(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const plans = [0, 2, 2, 3][p];
    const declareMs = 2000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const intents = ['swords', 'shield', 'rage'];
    const queue = [];
    for (let i = 0; i < plans; i++) {
        queue.push({ kind: intents[Math.floor(Math.random() * intents.length)], t: -i * 3500, done: false, banner: null });
    }
    _egNkToast('eg_mech_tactician', '♟️ The Tactician: Battle Intent! Read the plan!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(q => {
            if (q.done) return;
            pending = true;
            q.t += dtS * 1000;
            if (q.t < 0) return;
            if (!q.banner) {
                const txt = q.kind === 'swords' ? '⚔️ VOLLEY' : q.kind === 'shield' ? '🛡️ TITHE' : '😡 ENRAGE';
                q.banner = _egNkEl(run, 'div', 'eg-nk-intent', txt);
            }
            if (q.t >= declareMs) {
                q.done = true;
                if (q.banner) { q.banner.remove(); q.banner = null; }
                if (q.kind === 'swords') {
                    // Aimed 5-orb volley from the top corners.
                    const c = _egNkPlayerCenter();
                    const tx = c ? c.x : window.innerWidth / 2;
                    const ty = c ? c.y : window.innerHeight / 2;
                    for (let k = -2; k <= 2; k++) {
                        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb');
                        const ox = k < 0 ? 60 : window.innerWidth - 60;
                        const dx = tx - ox, dy = ty - 80;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        const spd = 170;
                        const o = { x: ox, y: 80, vx: (dx / d) * spd, vy: (dy / d) * spd, t: 0, hitDone: false, el, run };
                        _egTacticianOrbTick(run, o, level);
                    }
                } else if (q.kind === 'shield') {
                    if (typeof _egMechSoulTithe === 'function') { try { _egMechSoulTithe(monster, phase); } catch (e) {} }
                } else {
                    // Rage: the boss empowers itself — +1 soft-enrage stack.
                    monster.enrageStacks = Math.min(10, (monster.enrageStacks || 0) + 1);
                    if (typeof _egBossRecalcDamage === 'function') {
                        try { _egBossRecalcDamage(monster); } catch (e) {}
                    }
                    _egNkToast('eg_tactician_rage', '😡 The Tactician rages! Boss damage rises!', '#f87171');
                }
            }
        });
        return pending;
    });
}

// One-shot orb flight attached to the shared run (no _egNkDodgeBusy gate —
// the intent already passed the gate when it was declared).
function _egTacticianOrbTick(run, o, level) {
    const step = () => {
        if (!run || !document.body.contains(o.el)) return;
        if (_egNkFrozen()) { setTimeout(step, 200); return; }
        o.t += 50;
        o.x += o.vx * 0.05;
        o.y += o.vy * 0.05;
        if (o.t > 6000 || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
            o.el.remove();
            return;
        }
        o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
        if (!o.hitDone && _egNkDotHit(o.el, _egNkPlayerRect(), 2)) {
            o.hitDone = true;
            const dealt = _egNkHit(0.06, null, level);
            _egNkAbilityHitToast(dealt, 'The Tactician', 'Battle Intent');
        }
        setTimeout(step, 50);
    };
    setTimeout(step, 50);
}
