import { t } from '../../translation/translations.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE CREEPER (boss_creeper)---------------------
//------------------------------------------------------------------------
// A walking bomb. Creeperlings stalk you in silence, stop close by and HISS: a
// red pie-timer fills on the floor, then they blow. From 60% a lit FUSE TRAIL
// burns through rows of TNT, from 30% a creeperling is struck by lightning
// and charged, and at 10% the Creeper itself swells for SSSS…BOOM. The charge
// attack is the POUNCE. No combat toasts: the floor rings carry everything.
// (Fuse Trail: boss-creeper-fuse.js. Finale, teardown, debug hook: boss-creeper-finale.js.)
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_creeper: {
        id: 'boss_creeper', name: 'The Creeper', emoji: '💥',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_creeper: {
        phases: [
            // The charge attack IS the Pounce: keep its tempo readable.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'creeper_pack', intervalBase: 15000, intervalVariance: 3000, handler: '_mechCreeperPack' },
            { name: 'fuse_trail', intervalBase: 21000, intervalVariance: 4000, handler: '_mechFuseTrail', phase2Only: true },
        ],
        // onInit (the SSSS…BOOM watcher) is attached by boss-creeper-finale.js.
    },
});


//------------------------------------------------------------------------
//-------------------TUNING------------------------------------------------
//------------------------------------------------------------------------
// Index 0 of each phase table is unused: phases are 1-3.
const CRP_HIT_CD_MS = 700;                      // one blast hit per this long, whoever blew up
// Creeperlings
const CRP_PACK_COUNT = [0, 2, 3, 4];
const CRP_PACK_SPEED = [0, 88, 104, 120];       // px/s (you walk at 320)
const CRP_PACK_BLAST_R = [0, 125, 140, 155];
const CRP_PACK_HISS_MS = [0, 1500, 1350, 1200]; // the fuse: how long the pie-timer takes to fill
const CRP_PACK_DMG = [0, 0.10, 0.12, 0.14];
const CRP_PACK_TRIGGER = 0.85;                  // hiss starts when you are this close (share of the blast radius)
const CRP_PACK_WINDOW_MS = 11000;
const CRP_PACK_STAGGER_MS = 450;
const CRP_PACK_SPAWN_GAP = 380;                 // creeperlings never pop up closer than this
const CRP_PACK_RAMP_AFTER_MS = 4000;            // after this they get 5% faster every second (max +50%)
const CRP_SYMPATHY_MS = 1000;                   // a neighbour's blast leaves this much fuse
// Charged creeperling (phase 3)
const CRP_CHARGE_WARN_MS = 600;
const CRP_CHARGE_ZAP_MS = 1500;
const CRP_CHARGE_R_MULT = 1.4;
const CRP_CHARGE_DMG_MULT = 1.4;
// Pounce (charge attack)
const CRP_POUNCE_FALL_MS = 700;
const CRP_POUNCE_HISS_MS = 1200;
const CRP_POUNCE_R = 140;
const CRP_POUNCE_GAP_MS = 1800;                 // phase 3: the second pounce follows this long after
const CRP_POUNCE_DMG = [0, 0.14, 0.16, 0.18];

let _crpHitUntil = 0;                           // blast-hit cooldown (performance.now clock)
const _crpHinted = new Set();                   // hint chips already shown this fight


//------------------------------------------------------------------------
//-------------------SMALL HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Boss phase 1-3 from the live monster.
export function _crpPhaseOf(monster) {
    return Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
}

// Forgets the per-fight state (called by the teardown).
export function _crpReset() {
    _crpHitUntil = 0;
    _crpHinted.clear();
}

// One short instruction chip at the top of the arena, shown once per fight
// per key (it replaces the old combat toasts).
export function _crpHint(key, fallback) {
    if (_crpHinted.has(key)) return;
    _crpHinted.add(key);
    let msg = fallback;
    try { const raw = t(key); if (raw && raw !== key) msg = raw; } catch (e) {}
    const el = document.createElement('div');
    el.className = 'sx-crp-hint';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 4600);
}

// A floor circle of a blast's real reach. Its red pie fills clockwise as the
// fuse burns down (setFuse); `cls` adds a look (charged, land, final).
export function _crpFuseRing(run, x, y, R, cls) {
    const el = _nkEl(run, 'div', 'sx-crp-fuse' + (cls ? ' ' + cls : ''));
    el.style.left = Math.round(x - R) + 'px';
    el.style.top = Math.round(y - R) + 'px';
    el.style.width = el.style.height = Math.round(R * 2) + 'px';
    return el;
}

// Sets how far the fuse has burnt (0 to 1) on a fuse ring.
export function _crpSetFuse(el, k) {
    el.style.setProperty('--p', (Math.max(0, Math.min(1, k)) * 360).toFixed(1) + 'deg');
}

// A harmless ground puff (a creeperling popping up, a pounce landing).
function _crpPuff(x, y, size) {
    const el = document.createElement('div');
    el.className = 'sx-crp-puff';
    el.style.left = Math.round(x - size / 2) + 'px';
    el.style.top = Math.round(y - size / 2) + 'px';
    el.style.width = el.style.height = Math.round(size) + 'px';
    document.body.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 650);
}

// Builds one creeper sprite: a fixed outer dot (translate-positioned) with the
// green cube + face as a CHILD (scale and flash animations run on the child,
// never on the fixed wrapper). `big` is the pouncing mother.
function _crpSprite(run, charged, big) {
    const dot = _nkEl(run, 'div', 'sx-nk-dot sx-crp-creeper' + (charged ? ' sx-crp-charged' : ''));
    const body = document.createElement('div');
    body.className = 'sx-crp-body';
    dot.appendChild(body);
    return { dot, body, base: big ? 1.7 : 1 };
}

// Swells the sprite and blinks it faster as its fuse (0 to 1) climbs.
function _crpFuseVisual(sprite, fuse) {
    const swell = sprite.base * (1 + fuse * 0.4);
    sprite.body.style.scale = swell.toFixed(3);
    if (fuse > 0.02) {
        const blinkMs = Math.max(70, 260 - fuse * 190);
        sprite.body.style.animation = 'sx-crp-flash ' + blinkMs + 'ms steps(2) infinite';
    } else {
        sprite.body.style.animation = '';
    }
}

// Puts the sprite's centre at (x, y).
function _crpPlaceSprite(sprite, x, y) {
    sprite.dot.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
}

// The look of one explosion: white-hot core, smoke ring and puffs, flying
// blocks and a scorch crater. Body-level, so it survives its run ending.
function _crpBlastVisual(x, y, R) {
    const layer = document.createElement('div');
    layer.className = 'sx-crp-burst';
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = layer.style.height = (R * 2) + 'px';
    document.body.appendChild(layer);
    ['sx-crp-core', 'sx-crp-ring'].forEach(cls => {
        const d = document.createElement('div');
        d.className = cls;
        layer.appendChild(d);
    });
    for (let i = 0; i < 6; i++) {
        const s = document.createElement('div');
        s.className = 'sx-crp-smoke';
        const ang = Math.random() * Math.PI * 2, dist = R * 0.3 + Math.random() * R * 0.8;
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = (Math.random() * 120) + 'ms';
        layer.appendChild(s);
    }
    for (let i = 0; i < 9; i++) {
        const c = document.createElement('div');
        c.className = 'sx-crp-chunk c' + (i % 3);
        const ang = Math.random() * Math.PI * 2, dist = R * (0.55 + Math.random() * 0.55);
        c.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        c.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - R * 0.25) + 'px');
        c.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
        layer.appendChild(c);
    }
    const crater = document.createElement('div');
    crater.className = 'sx-crp-crater';
    crater.style.width = crater.style.height = Math.round(R * 1.1) + 'px';
    crater.style.left = Math.round(x - R * 0.55) + 'px';
    crater.style.top = Math.round(y - R * 0.55) + 'px';
    document.body.appendChild(crater);
    setTimeout(() => { try { crater.remove(); } catch (e) {} }, 4200);
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, 1100);
}

// One creeper detonation at (x, y). pct > 0 hurts you when you stand inside
// the disc; blasts share a short cooldown so a chain never stacks hits
// (`force` skips it - the finale always lands).
export function _crpBlast(x, y, radius, pct, level, label, force) {
    const R = Math.max(10, radius);
    _crpBlastVisual(x, y, R);
    if (pct <= 0) return false;
    const now = performance.now();
    if (!force && now < _crpHitUntil) return false;
    const pr = _nkPlayerRect();
    if (!pr || !_nkCircleHit(x, y, R, pr, 0)) return false;
    _crpHitUntil = now + CRP_HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'fire', level), 'The Creeper', label, true);
    return true;
}


//------------------------------------------------------------------------
//-------------------CREEPERLINGS (all phases)-----------------------------
//------------------------------------------------------------------------
// 2-4 creeperlings pop up away from you and stalk. Close enough, one stops and
// hisses: its blast circle appears and a red pie fills over ~1.4 s, then BOOM.
// Leave the circle and nothing happens; a blast sets neighbours off early, so
// lure them apart. Phase 3: lightning charges one (blue, bigger circle).

// A random spot on the arena edge, well away from you.
function _crpSpawnPoint(c) {
    const W = window.innerWidth, H = window.innerHeight;
    let best = null, bestD = -1;
    for (let i = 0; i < 14; i++) {
        const side = Math.floor(Math.random() * 4);
        const x = side === 0 ? 60 : side === 2 ? W - 60 : 60 + Math.random() * (W - 120);
        const y = side === 1 ? 110 : side === 3 ? H - 150 : 110 + Math.random() * (H - 260);
        const d = c ? Math.hypot(x - c.x, y - c.y) : CRP_PACK_SPAWN_GAP;
        if (d >= CRP_PACK_SPAWN_GAP) return { x, y };
        if (d > bestD) { bestD = d; best = { x, y }; }
    }
    return best;
}

// A creeperling starts hissing where it stands: its blast circle and the
// "SSSS" tag appear. `fuseLeft` (ms) lets a neighbour's blast shorten it.
function _crpIgnite(run, cr, fuseLeftMs) {
    cr.state = 'hiss';
    cr.hiss = Math.max(0, cr.hissMs - fuseLeftMs);
    cr.ring = _crpFuseRing(run, cr.x, cr.y, cr.R, cr.charged ? 'charged' : '');
    cr.label = _nkEl(run, 'div', 'sx-crp-hiss', 'SSSS…');
    cr.label.style.transform = 'translate(' + Math.round(cr.x - 28) + 'px,' + Math.round(cr.y - 58) + 'px)';
}

// Removes a finished creeperling's sprite, ring and tag.
function _crpDropCreeper(cr, delayMs) {
    cr.state = 'done';
    [cr.ring, cr.label].forEach(el => { if (el) { try { el.remove(); } catch (e) {} } });
    cr.ring = cr.label = null;
    setTimeout(() => { try { cr.sprite.dot.remove(); } catch (e) {} }, delayMs);
}

// Lightning charges a creeperling: telegraph pulse, then the bolt.
function _crpChargeStep(run, cr) {
    if (!cr.willCharge || cr.charged || cr.state !== 'stalk') return;
    if (cr.age >= CRP_CHARGE_WARN_MS && !cr.zapWarn) { cr.zapWarn = true; cr.sprite.dot.classList.add('sx-crp-zapwarn'); }
    if (cr.age < CRP_CHARGE_ZAP_MS) return;
    cr.charged = true;
    cr.R *= CRP_CHARGE_R_MULT;
    cr.dmg *= CRP_CHARGE_DMG_MULT;
    cr.sprite.dot.classList.remove('sx-crp-zapwarn');
    cr.sprite.dot.classList.add('sx-crp-charged');
    const bolt = _nkEl(run, 'div', 'sx-crp-bolt');
    bolt.style.left = Math.round(cr.x - 4) + 'px';
    bolt.style.height = Math.round(cr.y) + 'px';
}

// One stalking step: walk at you (with a scuttling wobble), hiss once close.
function _crpStalkStep(run, cr, c, dtS, tMs) {
    cr.age += dtS * 1000;
    const dx = c.x - cr.x, dy = c.y - cr.y, d = Math.hypot(dx, dy) || 1;
    const ramp = 1 + Math.min(0.5, Math.max(0, (tMs - CRP_PACK_RAMP_AFTER_MS) / 1000) * 0.05);
    const wob = Math.sin(cr.age / 260 + cr.seed) * 0.35;
    cr.x += ((dx / d) - (dy / d) * wob) * cr.speed * ramp * dtS;
    cr.y += ((dy / d) + (dx / d) * wob) * cr.speed * ramp * dtS;
    _crpPlaceSprite(cr.sprite, cr.x, cr.y);
    _crpChargeStep(run, cr);
    if (d <= cr.R * CRP_PACK_TRIGGER) _crpIgnite(run, cr, cr.hissMs);
}

// One hissing step: the fuse burns, then the blast; neighbours catch fire.
function _crpHissStep(run, cr, dtS, level, creepers) {
    cr.hiss += dtS * 1000;
    const k = cr.hiss / cr.hissMs;
    _crpFuseVisual(cr.sprite, k);
    _crpSetFuse(cr.ring, k);
    if (k < 1) return;
    _crpBlast(cr.x, cr.y, cr.R, cr.dmg, level, 'Creeper');
    creepers.forEach(o => {
        if (o === cr || o.state === 'done' || o.state === 'wait') return;
        if (Math.hypot(o.x - cr.x, o.y - cr.y) > cr.R + 40) return;
        if (o.state === 'stalk') _crpIgnite(run, o, CRP_SYMPATHY_MS);
        else o.hiss = Math.max(o.hiss, o.hissMs - CRP_SYMPATHY_MS);
    });
    _crpDropCreeper(cr, 150);
}

// Builds the pack for this phase (the last one is the charged one in phase 3).
function _crpMakePack(run, p) {
    const creepers = [];
    for (let i = 0; i < CRP_PACK_COUNT[p]; i++) {
        creepers.push({
            state: 'wait', delay: i * CRP_PACK_STAGGER_MS, age: 0, hiss: 0, seed: Math.random() * 6.28,
            speed: CRP_PACK_SPEED[p], R: CRP_PACK_BLAST_R[p], hissMs: CRP_PACK_HISS_MS[p], dmg: CRP_PACK_DMG[p],
            willCharge: p >= 3 && i === CRP_PACK_COUNT[p] - 1, charged: false, zapWarn: false,
            x: 0, y: 0, sprite: null, ring: null, label: null,
        });
    }
    return creepers;
}

// Scheduled mechanic: the creeperlings arrive and stalk for ~11 s.
export function _mechCreeperPack(monster, phase) {
    if (_nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    // Field mechanic: passive, so packs overlap the trail and the pounce.
    run.passive = true;
    _crpHint('eg_crp_hint_pack', 'Creeperlings hiss when they get close - leave the red ring before it fills!');
    const creepers = _crpMakePack(run, p);
    let t0 = 0;
    _nkLoop(run, (dtS) => {
        t0 += dtS * 1000;
        const c = _nkPlayerCenter();
        let pending = false;
        creepers.forEach(cr => {
            if (cr.state === 'done') return;
            pending = true;
            if (cr.state === 'wait') {
                if (t0 < cr.delay) return;
                const sp = _crpSpawnPoint(c);
                cr.x = sp.x; cr.y = sp.y; cr.state = 'stalk';
                cr.sprite = _crpSprite(run, false, false);
                cr.sprite.dot.classList.add('sx-crp-rise');
                _crpPlaceSprite(cr.sprite, cr.x, cr.y);
                _crpPuff(cr.x, cr.y + 14, 70);
            }
            if (cr.state === 'stalk' && t0 >= CRP_PACK_WINDOW_MS) {
                cr.sprite.dot.classList.add('sx-crp-flee');
                _crpDropCreeper(cr, 600);
            } else if (cr.state === 'stalk') {
                if (c) _crpStalkStep(run, cr, c, dtS, t0);
            } else if (cr.state === 'hiss') {
                _crpHissStep(run, cr, dtS, level, creepers);
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------POUNCE (charge attack)--------------------------------
//------------------------------------------------------------------------
// The attack bar sends the Creeper's mother leaping onto YOUR spot: the circle
// is marked first, she lands, hisses (the pie fills) and blows. Phase 3 follows
// up with a second pounce on wherever you went. Dispatched from _fireMonsterAttack.

// One pounce: marks the ground where you stand, falls, hisses, blows.
function _crpPounceOne(monster, p, level, delayMs) {
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    const R = CRP_POUNCE_R;
    let stage = 'wait', t0 = -delayMs, x = 0, y = 0, sprite = null, ring = null;
    _nkLoop(run, (dtS) => {
        t0 += dtS * 1000;
        if (t0 < 0) return true;
        if (stage === 'wait') {
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            x = Math.max(R * 0.6, Math.min(window.innerWidth - R * 0.6, pc.x));
            y = Math.max(R * 0.6 + 40, Math.min(window.innerHeight - R * 0.6 - 60, pc.y));
            ring = _crpFuseRing(run, x, y, R, 'land');
            sprite = _crpSprite(run, false, true);
            stage = 'fall'; t0 = 0;
        }
        if (stage === 'fall') {
            const k = Math.min(1, t0 / CRP_POUNCE_FALL_MS);
            _crpPlaceSprite(sprite, x, y - 300 * (1 - k * k));
            if (k < 1) return true;
            stage = 'hiss'; t0 = 0;
            ring.classList.remove('land');
            _crpPuff(x, y + 10, 150);
        }
        const k = Math.min(1, t0 / CRP_POUNCE_HISS_MS);
        _crpFuseVisual(sprite, k * 1.15);
        _crpSetFuse(ring, k);
        if (k < 1) return true;
        _crpBlast(x, y, R, CRP_POUNCE_DMG[p], level, 'Pounce');
        return false;
    });
}

// Charge attack entry point: one pounce, two in phase 3.
export function _crpPounce(monster, phaseOverride) {
    if (!monster || _nkFrozen()) return;
    const p = phaseOverride || _crpPhaseOf(monster);
    const level = monster.level || 1;
    try {
        document.dispatchEvent(new CustomEvent('sx-boss-mechanic', { detail: { monsterId: monster.id, mech: 'fuse_pounce', phase: p } }));
    } catch (e) {}
    _crpHint('eg_crp_hint_pounce', 'The Creeper leaps onto your spot - leave the circle!');
    _crpPounceOne(monster, p, level, 0);
    if (p >= 3) _crpPounceOne(monster, p, level, CRP_POUNCE_GAP_MS);
}
