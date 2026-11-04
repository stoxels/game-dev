import { t } from '../../translation/translations.js';
import { GAME_ART } from '../combat-art.js';
import { _updateTargetAfterKill } from '../encounter.js';
import { _buildMonster } from '../combat-monsters.js';
import { _isActive } from '../combat-state.js';
import { _bossTierNorm, _nkDodgeBusy } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BRUTUS: SACRIFICIAL ZOMBIES----------------------------------
//------------------------------------------------------------------------
// Weak zombie adds that shamble into Brutus's slam bands. Every zombie a
// slam lands on is devoured and speeds up Brutus's attacks for a while;
// kill them first. The slams themselves live in boss-brutus.js.
//------------------------------------------------------------------------

// Brutus periodically raises small, weak zombies. They never attack -
// their only purpose is to shamble into the ground-slam band while the
// telegraph is up. If a zombie is still inside the band when the slam
// lands, Brutus devours it and gains a stacking attack charge-up boost
// for 15 s per zombie. The player's job is to kill the adds first (low
// health, no loot, but a chance to drop a healing heart). Zombies are kept
// OUT of MONSTER_DEFS so the ambient respawn pool can never raise them.

export const _brutusSlamBand = { active: false, cy: 0, half: 0 };

export let _brutusZombies = [];       // live zombie monster objects (also in _monsters)
export let _brutusZombieTimer = null; // roaming movement interval (50ms)
export let _brutusFeedExpiries = [];  // Date.now() expiry per devoured zombie, sorted ascending
export let _brutusWavePending = false; // spawn deferred while a ground-slam chain is busy
export let _brutusFeedHudTimer = null; // 100ms countdown driver for the haste chip on Brutus's card
export let _brutusFeedHudCount = -1;   // stack count the chip DOM was last (re)built for
// Boss monsters get a spawn-suffixed id (boss_brutus_7), so the chip and the
// enrage frame must target the card through the REAL id captured at spawn /
// devour time - never the bare def id.
export let _brutusBossCardId = null;   // 'sx-card-' + live Brutus monster id

export const BRUTUS_ZOMBIE_HEART_CHANCE = 0.2;      // per PLAYER kill - slam-devoured zombies drop nothing
export const BRUTUS_ZOMBIE_LIFETIME_MS = 45000;     // shamble away in a poof if neither killed nor devoured
// Fresh zombies claw out of the ground for the first 1.5s after spawning:
// they neither shamble nor can be devoured during it, so a slam can never
// eat a zombie within a second of it appearing (the earliest a slam can
// land after a wave is one full telegraph later).
export const BRUTUS_ZOMBIE_RISE_MS = 1500;
export const BRUTUS_FEED_WINDOW_MS = 15000;         // each devoured zombie speeds Brutus up for this long
export const BRUTUS_FEED_CHARGE_PCT = 30;           // +30% attack charge rate per active feed stack
export const BRUTUS_FEED_MAX_STACKS = 6;            // concurrent stack cap (visual/balance sanity)
export const BRUTUS_ZOMBIES_MAX_FIELD = 6;          // concurrent zombies on the field

// Low-health add def - built inline (NOT in MONSTER_DEFS, so the random
// respawn pool never spawns one). baseHP 45 keeps them at a few hits at any
// level; chargeMax 1 means their (hidden) charge bar never fills.
export const BRUTUS_ZOMBIE_DEF = {
    id: 'brutus_zombie',
    name: '', // filled at spawn via t('eg_mon_brutus_zombie')
    emoji: '🧟',
    baseHP: 45,
    baseDamage: 4,
    chargeMax: 1,
    attackType: 'melee',
    element: 'shadow',
    resistances: {}
};


// Charge-rate multiplier for Brutus while feed stacks are active. Called by
// _getMonsterChargeMultiplier (endgame-ailments.js) for every monster on
// every tick, so this must stay cheap. Only prunes expired stacks - the HUD
// chip itself is driven by its own 100ms timer (_brutusFeedHudTick).
export function _bossFeedChargeMult(m) {
    // baseId is the unsuffixed def id - the real monster id carries a spawn
    // counter suffix (boss_brutus_7), which is why we never compare m.id.
    if (!m || (m.baseId || m.id) !== 'boss_brutus') return 1;
    const now = Date.now();
    while (_brutusFeedExpiries.length && _brutusFeedExpiries[0] <= now) {
        _brutusFeedExpiries.shift();
    }
    const n = _brutusFeedExpiries.length;
    if (n === 0) return 1;
    return 1 + (BRUTUS_FEED_CHARGE_PCT / 100) * n;
}


// Starts the 100ms countdown driver that keeps the haste chip + enrage frame
// fresh while at least one feed stack is live. Idempotent.
export function _brutusEnsureFeedHudTimer() {
    if (_brutusFeedHudTimer) return;
    _brutusFeedHudTimer = setInterval(_brutusFeedHudTick, 100);
}


// 100ms driver - renders the haste chip and stops itself once every stack
// has expired (the chip hides and Brutus cools back down).
export function _brutusFeedHudTick() {
    _brutusRenderFeedHud();
    if (_brutusFeedExpiries.length === 0 && _brutusFeedHudTimer) {
        clearInterval(_brutusFeedHudTimer);
        _brutusFeedHudTimer = null;
    }
}


// ── Feed-haste HUD chip on Brutus's card ────────────────────────────────
// While the buff is up Brutus's frame burns red-hot (sx-boss-enraged) and a
// chip on his card shows one pip per stack (+30% attack charge each) and a
// drain bar counting down to the NEXT stack expiry (the oldest window governs the countdown; the bar refills
// when that stack drops, and new devours extend the tail). Recreates itself
// after any panel rebuild - the 100ms timer calls this, so a fresh chip is
// back within a tick of a rebuild while stacks are active.
export function _brutusRenderFeedHud() {
    const card = _brutusBossCardId ? document.getElementById(_brutusBossCardId) : null;
    const now = Date.now();
    while (_brutusFeedExpiries.length && _brutusFeedExpiries[0] <= now) {
        _brutusFeedExpiries.shift();
    }
    const n = _brutusFeedExpiries.length;

    // Red-hot boss frame while fed (golden targeting ring still wins when
    // the player targets Brutus - that class overrides via CSS).
    const frame = card ? card.querySelector('.sx-emoji-wrapper') : null;
    if (frame) frame.classList.toggle('sx-boss-enraged', n > 0);

    if (!card) return;
    if (n === 0) {
        const old = card.querySelector('.sx-boss-feed-badge');
        if (old) old.style.display = 'none';
        _brutusFeedHudCount = -1;
        return;
    }

    let badge = card.querySelector('.sx-boss-feed-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'sx-boss-feed-badge';
        badge.innerHTML =
            '<span class="sx-boss-feed-pips"></span>' +
            '<span class="sx-boss-feed-track"><i class="sx-boss-feed-fill"></i></span>';
        card.appendChild(badge);
        _brutusFeedHudCount = -1; // force count/mult text below
    }

    if (n !== _brutusFeedHudCount) {
        const pips = badge.querySelector('.sx-boss-feed-pips');
        if (pips) pips.innerHTML = '<i></i>'.repeat(n);
        _brutusFeedHudCount = n;
    }

    badge.style.display = '';

    // Drain to the NEXT expiry (oldest window). New stacks don't move the
    // needle - only an actual stack drop refills the bar.
    const oldest = _brutusFeedExpiries[0];
    const remainMs = Math.max(0, oldest - now);
    const fill = badge.querySelector('.sx-boss-feed-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, (remainMs / BRUTUS_FEED_WINDOW_MS) * 100)) + '%';
}


// Boss mechanic handler - raises a wave of sacrificial zombies (2 at tier 1
// up to 4 at tier 16, capped to the concurrent field limit).
export function _mechSacrificialZombies(monster, phase) {
    if (!_isActive()) return;
    if (!monster || typeof _buildMonster !== 'function') return;

    // Remember the REAL boss card id (suffixed id) for the feed-haste chip.
    _brutusBossCardId = 'sx-card-' + monster.id;

    // NEVER raise a wave while a ground-slam telegraph / chain is resolving:
    // zombies popping in mid-slam would be devoured within a second of
    // appearing, before the player could react. Defer and retry shortly after
    // the dodge window instead of losing the wave.
    if (typeof _nkDodgeBusy === 'function' && _nkDodgeBusy()) {
        if (!_brutusWavePending) {
            _brutusWavePending = true;
            setTimeout(() => {
                _brutusWavePending = false;
                if (!_isActive()) return;
                if (!globalThis._monsters.some(m => m.id === (monster && monster.id))) return;
                _mechSacrificialZombies(monster, phase);
            }, 2500);
        }
        return;
    }

    if (_brutusZombies.length >= BRUTUS_ZOMBIES_MAX_FIELD) return;

    const norm = _bossTierNorm(monster);
    const count = Math.min(2 + Math.round(norm * 2), // 2–4 by tier
        BRUTUS_ZOMBIES_MAX_FIELD - _brutusZombies.length);
    if (count <= 0) return;

    for (let i = 0; i < count; i++) _brutusSpawnZombie(monster);
}


// Builds one zombie add, registers it in _monsters (so clicking / auto-
// attack / bar updates / kill handling all work like any other add) and
// renders its roaming card in the fixed #sx-zombie-layer. Zombies render
// ONLY there - _renderMonstersIntoZones skips isSacrificialZombie.
export function _brutusSpawnZombie(monster) {
    BRUTUS_ZOMBIE_DEF.name = t('eg_mon_brutus_zombie') || 'Sacrificial Zombie';
    const z = _buildMonster(BRUTUS_ZOMBIE_DEF, monster.level || 1);
    if (!z) return;

    z.isSacrificialZombie = true;
    z.artId = 'zombie';                // the regular zombie's art, not an emoji
    z.noLoot = true;
    z.zombieHeartDropChance = BRUTUS_ZOMBIE_HEART_CHANCE;
    z.damageValue = 0; // never attacks

    // Roaming state - spawn off-screen at a random edge, aim at the band.
    const fromLeft = Math.random() < 0.5;
    z.x = fromLeft ? -40 : window.innerWidth + 40;
    z.y = window.innerHeight * (0.15 + Math.random() * 0.6);
    z.speed = 55 + Math.random() * 40; // px/s, per-zombie jitter
    z.bornAt = Date.now();
    // Rise grace: for the first BRUTUS_ZOMBIE_RISE_MS the zombie is stuck
    // clawing out of the ground at the screen edge - it neither shambles nor
    // can be devoured, so Brutus can never eat a zombie it just raised.
    z.walkableAt = z.bornAt + BRUTUS_ZOMBIE_RISE_MS;
    z.zoneId = 'sx-monster-panel';     // present but unused (panel render skips zombies)

    _brutusZombies.push(z);
    globalThis._monsters.push(z);
    if (!globalThis._targetId) globalThis._targetId = z.id;

    z.roamingCard = _brutusRenderZombieCard(z);
    _brutusSyncZombieCard(z);
    _brutusEnsureTick();
    return z;
}


// Creates the roaming card for one zombie and returns it. Mirrors the
// compact monster card (same ids, so _updateBars / _showDamageNumber /
// _flashKillCard all work). Target feedback (gold highlight) is managed
// separately by _brutusSyncZombieCard, since the roaming layer is not
// touched by the panel rebuild that marks other monsters targeted.
export function _brutusRenderZombieCard(z) {
    let layer = document.getElementById('sx-zombie-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'sx-zombie-layer';
        document.body.appendChild(layer);
    }

    const card = document.createElement('div');
    card.className = 'sx-monster-card-compact';
    card.id = 'sx-card-' + z.id;
    card.style.left = z.x + 'px';
    card.style.top = z.y + 'px';
    card.style.transform = 'translate(-50%, -50%)';
    card.style.setProperty('--sx-art', z.artScale || 1);
    card.setAttribute('onclick', "_selectTarget('" + z.id + "')");

    const hpPct = Math.max(0, Math.round((z.currentHP / z.maxHP) * 100));
    card.innerHTML =
        '<div class="sx-compact-bars">' +
            '<div class="sx-charge-track-compact"><div class="sx-charge-bar" id="sx-charge-bar-' + z.id + '" style="width:0%"></div></div>' +
            '<div class="sx-hp-track-compact"><div class="sx-hp-bar-compact" id="sx-hp-bar-' + z.id + '" style="width:' + hpPct + '%"></div></div>' +
        '</div>' +
        '<div class="sx-status-strip" id="sx-status-' + z.id + '"></div>' +
        '<div class="sx-emoji-wrapper">' +
            '<span class="sx-monster-emoji-compact">' + ((typeof GAME_ART !== 'undefined' && GAME_ART.html) ? GAME_ART.html('monster', z.artId || z.baseId, z.emoji) : z.emoji) + '</span>' +
            '<span class="sx-level-bottom-left">' + z.level + '</span>' +
            '<div class="sx-monster-compact-tooltip">' +
                '<div class="sx-tooltip-name">' + z.name + '</div>' +
                '<div class="sx-tooltip-hp" id="sx-hp-label-' + z.id + '">' + z.currentHP + ' / ' + z.maxHP + ' HP</div>' +
            '</div>' +
        '</div>';
    layer.appendChild(card);
    return card;
}


// Keeps one roaming zombie card's target feedback current (gold highlight
// only - the TARGET pill was removed). Called on spawn and every 50ms
// roaming tick (cheap class toggles - the engine's panel rebuild never
// touches roaming cards, so this is the only sync point).
export function _brutusSyncZombieCard(z) {
    const card = (z && z.roamingCard) || (z ? document.getElementById('sx-card-' + z.id) : null);
    if (!card) return;
    const isTarget = (typeof _targetId !== 'undefined' && globalThis._targetId === z.id);
    card.classList.toggle('sx-card-targeted', isTarget);
    const arrow = card.querySelector('.sx-target-arrow');
    if (arrow) arrow.remove();
}


// Starts the roaming movement interval on first zombie spawn. Idempotent.
export function _brutusEnsureTick() {
    if (_brutusZombieTimer) return;
    _brutusZombieTimer = setInterval(_brutusZombieTick, 50);
}


// 20Hz roaming driver. Moves every zombie toward the active slam band's
// centre line (or drifts to mid-screen while no band is up), reconciles
// against _monsters (player kills remove zombies there - the roaming card
// is dropped here with a poof), and enforces the per-zombie lifetime.
export function _brutusZombieTick() {
    if (_brutusZombies.length === 0) return;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
    if (typeof _isActive === 'function' && !_isActive()) return;

    const now = Date.now();
    const dt = 0.05;
    const band = _brutusSlamBand;
    const targetY = band.active ? band.cy : window.innerHeight * 0.5;
    const midX = window.innerWidth / 2;

    for (let i = _brutusZombies.length - 1; i >= 0; i--) {
        const z = _brutusZombies[i];

        // Player killed this zombie elsewhere (_killMonster): drop its card.
        if (!globalThis._monsters.some(m => m.id === z.id)) {
            _brutusPoof(z.x, z.y);
            const card = document.getElementById('sx-card-' + z.id);
            if (card) card.remove();
            _brutusZombies.splice(i, 1);
            continue;
        }

        // Neither killed nor devoured in time - the zombie rots away.
        if (now - z.bornAt > BRUTUS_ZOMBIE_LIFETIME_MS) {
            _brutusPoof(z.x, z.y);
            const card = document.getElementById('sx-card-' + z.id);
            if (card) card.remove();
            const midx = globalThis._monsters.findIndex(m => m.id === z.id);
            if (midx !== -1) globalThis._monsters.splice(midx, 1);
            if (globalThis._targetId === z.id && typeof _updateTargetAfterKill === 'function') {
                _updateTargetAfterKill();
            }
            _brutusZombies.splice(i, 1);
            continue;
        }

        // Rise phase: the zombie is still clawing out of the ground at its
        // spawn edge - no shambling yet (and the devour gate in
        // _brutusFeedZombies won't touch it until walkableAt passes).
        const card = z.roamingCard || document.getElementById('sx-card-' + z.id);
        if (now >= z.walkableAt) {
            // Shamble: vertical progress toward the slam band, slow horizontal
            // drift toward the middle so a wave fans out across the line.
            const dy = targetY - z.y;
            z.y += Math.sign(dy) * Math.min(Math.abs(dy), z.speed * dt);
            const dx = midX - z.x;
            z.x += Math.sign(dx) * Math.min(Math.abs(dx), z.speed * 0.45 * dt);

            if (card) {
                card.style.left = z.x + 'px';
                card.style.top = z.y + 'px';
            }
        }
        _brutusSyncZombieCard(z);
    }
}


// Slam impact: every zombie standing inside the band that just landed is
// devoured - removed without loot (the kill handler is bypassed entirely,
// so no heart roll either), and each victim stacks a 30s charge-rate buff.
// Reads the band cy/half published at aim time (still valid - _mechGroundSlam
// clears only .active before calling us, so steering stops but the rect holds).
export function _brutusFeedZombies(monster) {
    if (_brutusZombies.length === 0) return;
    if (monster) _brutusBossCardId = 'sx-card-' + monster.id;
    const band = _brutusSlamBand;
    const now = Date.now();
    // Only zombies that actually made it onto the field can be devoured: the
    // victim must have finished its rise grace AND be on-screen horizontally.
    // Zombies that spawned a moment before the slam (still crawling out at
    // the screen edge / off-screen) survive it and shamble on - the player
    // always gets the full telegraph plus their rise time to react.
    const devoured = _brutusZombies.filter(z =>
        now >= z.walkableAt && z.x > 0 && z.x < window.innerWidth
        && Math.abs(z.y - band.cy) <= band.half + 24);
    if (devoured.length === 0) return;

    devoured.forEach(z => _brutusRemoveZombie(z, true));

    // Expiries stay sorted ascending (every new window ends after every
    // existing one) - the chip's drain bar keys off the oldest entry.
    devoured.forEach(() => {
        _brutusFeedExpiries.push(now + BRUTUS_FEED_WINDOW_MS);
    });
    while (_brutusFeedExpiries.length > BRUTUS_FEED_MAX_STACKS) {
        _brutusFeedExpiries.shift();
    }

    _brutusEnsureFeedHudTimer();
    _brutusRenderFeedHud();
}


// Removes a zombie completely: roaming card + poof, and (unlike the player
// kill path, which goes through _killMonster) direct removal from
// _monsters with target reselect when needed. poof=false on teardown.
export function _brutusRemoveZombie(z, poof) {
    const card = document.getElementById('sx-card-' + z.id);
    if (card) card.remove();
    if (poof) _brutusPoof(z.x, z.y);

    const zi = _brutusZombies.indexOf(z);
    if (zi !== -1) _brutusZombies.splice(zi, 1);
    const mi = globalThis._monsters.findIndex(m => m.id === z.id);
    if (mi !== -1) globalThis._monsters.splice(mi, 1);

    if (globalThis._targetId === z.id && typeof _updateTargetAfterKill === 'function') {
        _updateTargetAfterKill();
    }
}


// Small dust puff where a zombie vanished (devoured, expired or player-killed).
export function _brutusPoof(x, y) {
    const p = document.createElement('span');
    p.className = 'sx-zombie-poof';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 750);
}


// Full teardown - stops the roaming driver, removes every zombie card/state
// and clears the feed stacks. Fired from _bossCleanup when Brutus dies or
// the encounter stops; never on individual zombie kills.
export function _brutusZombieTeardown() {
    if (_brutusZombieTimer) {
        clearInterval(_brutusZombieTimer);
        _brutusZombieTimer = null;
    }
    if (_brutusFeedHudTimer) {
        clearInterval(_brutusFeedHudTimer);
        _brutusFeedHudTimer = null;
    }
    _brutusWavePending = false;
    _brutusFeedHudCount = -1;
    _brutusZombies.slice().forEach(z => _brutusRemoveZombie(z, false));
    _brutusZombies = [];
    _brutusFeedExpiries = [];
    const badge = document.querySelector('.sx-boss-feed-badge');
    if (badge) badge.remove();
    const card = _brutusBossCardId ? document.getElementById(_brutusBossCardId) : null;
    const frame = card ? card.querySelector('.sx-emoji-wrapper') : null;
    if (frame) frame.classList.remove('sx-boss-enraged');
    _brutusBossCardId = null;
    const layer = document.getElementById('sx-zombie-layer');
    if (layer) layer.innerHTML = '';
}
