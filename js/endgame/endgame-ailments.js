//------------------------------------------------------------------------
//-------------------ELEMENTAL AILMENTS SYSTEM----------------------------
//------------------------------------------------------------------------
// Central runtime system for elemental status effects (ailments).
//
// Combat side:
//   ignite      (fire)      – damage over time; on the player it drains the
//                             absorption shield first, then HP.
//   chill       (cold)      – attack charge bar fills at 50% speed.
//   frozen      (cold)      – attack charge bar does not fill at all
//                             (movement prevention hooks in here later).
//   shocked     (lightning) – target takes +25% damage from all hits.
//   shadowburn  (shadow)    – damage over time that IGNORES the absorption
//                             shield and burns straight from HP.
//
// Puzzle side (applied when a monster shoots the grid centre instead of the
// player — see EG_PUZZLE_ATTACK_CHANCE_PCT):
//   fire      → lava cells: wrong clicks count as 2 mistakes / double penalty
//   cold      → ice cells:  clicks may slip onto a random adjacent cell
//   lightning → shocked cursor: revealing cells may strip ✕ marks nearby
//   shadow    → blackout: one row/column clue line is hidden for a while
//
// NOTE: Arcane has no ailment yet (no arcane damage element exists).
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------TUNING CONSTANTS------------------------------------
//------------------------------------------------------------------------

const EG_AIL_TICK_INTERVAL_S = 1.0;     // DoT tick every second
const EG_AIL_IGNITE_DURATION_S = 5;
const EG_AIL_IGNITE_DMG_SHARE = 0.15;   // dps = share of the triggering hit
const EG_AIL_CHILL_DURATION_S = 4;
const EG_AIL_CHARGE_SLOW_MULT = 0.5;    // chilled attack bar fills at 50%
const EG_AIL_FROZEN_DURATION_S = 2.5;
const EG_AIL_SHOCK_DURATION_S = 5;
const EG_AIL_SHOCK_AMP_PCT = 25;        // +damage taken while shocked
const EG_AIL_SHADOWBURN_DURATION_S = 4;
const EG_AIL_SHADOWBURN_DMG_SHARE = 0.2;
const EG_AIL_POLYMORPH_DURATION_S = 6;  // monsters fight each other, your own reveals hurt you

const EG_MONSTER_AILMENT_CHANCE_PCT = 15;     // monster hit → player ailment
const EG_COLD_INNATE_CHILL_CHANCE_PCT = 10;   // cold hits chill even w/o mods
const EG_AIL_MIN_DOT_DAMAGE = 2;              // floor for DoT ticks

// Puzzle-side tuning
const EG_PUZZLE_ATTACK_CHANCE_PCT = 5;        // monster attack → grid instead of player
const EG_PUZZLE_EFFECT_DURATION_MS = 10000;
const EG_PUZZLE_HAZARD_CELLS = 6;             // lava / ice patch size
const EG_ICE_SLIP_CHANCE = 0.4;               // click slips to a neighbour
const EG_SHOCK_MARK_STRIP_CHANCE = 0.35;      // per reveal, strips a random ✕ anywhere

const EG_AILMENT_ICONS = {
    ignite: '🔥',
    chill: '❄️',
    frozen: '🧊',
    shocked: '⚡',
    shadowburn: '🌑',
    polymorph: '🌀',
};

//------------------------------------------------------------------------
//-------------------RUNTIME STATE---------------------------------------
//------------------------------------------------------------------------

// Player afflictions: key → { until, dps, acc } (acc = DoT tick accumulator)
let _egPlayerStatuses = {};

// Active puzzle ailments: [{ type, until, timer, cells?, line? }]
let _egPuzzleEffects = [];

// Recursion guard for chained ice slips
let _egIceRedirectDepth = 0;

// Shocked-cursor follower node + listener handles
let _egSparkFollowerEl = null;
let _egSparkMoveHandler = null;
let _egSparkSpawnTimer = null;
let _egSparkLastX = 0;
let _egSparkLastY = 0;
const EG_SPARK_GLYPHS = ['⚡', '✦', '✧', '＊'];


//------------------------------------------------------------------------
//-------------------GENERIC STATUS HELPERS------------------------------
//------------------------------------------------------------------------

function _egHasStatus(statusMap, key) {
    const st = statusMap[key];
    return !!(st && st.until > Date.now());
}

function _egApplyStatusToMap(statusMap, key, durationS, dps) {
    statusMap[key] = {
        until: Date.now() + durationS * 1000,
        dps: dps || 0,
        acc: (statusMap[key] && statusMap[key].until > Date.now()) ? (statusMap[key].acc || 0) : 0,
    };
}

// Applies an ailment to a monster (or refreshes an existing one).
function _egApplyMonsterAilment(monster, key, dps) {
    if (!monster) return;
    // Active map run: monsters may avoid ailments entirely (PoE purity).
    if ((monster.avoidAilmentPct || 0) > 0 && Math.random() * 100 < monster.avoidAilmentPct) return;
    if (!monster.statuses) monster.statuses = {};
    const durationS = ({
        ignite: EG_AIL_IGNITE_DURATION_S,
        chill: EG_AIL_CHILL_DURATION_S,
        frozen: EG_AIL_FROZEN_DURATION_S,
        shocked: EG_AIL_SHOCK_DURATION_S,
        shadowburn: EG_AIL_SHADOWBURN_DURATION_S,
        polymorph: EG_AIL_POLYMORPH_DURATION_S,
    })[key];
    if (!durationS) return;
    _egApplyStatusToMap(monster.statuses, key, durationS, dps);
}

// Applies an ailment to the player (or refreshes an existing one).
function _egApplyPlayerAilment(key, dps) {
    const durationS = ({
        ignite: EG_AIL_IGNITE_DURATION_S,
        chill: EG_AIL_CHILL_DURATION_S,
        frozen: EG_AIL_FROZEN_DURATION_S,
        shocked: EG_AIL_SHOCK_DURATION_S,
        shadowburn: EG_AIL_SHADOWBURN_DURATION_S,
        polymorph: EG_AIL_POLYMORPH_DURATION_S,
    })[key];
    if (!durationS) return;
    // Active map run: "Ailments on you last #% longer".
    let scaled = durationS;
    if (typeof _egGetActiveMapModValue === 'function') {
        const longerPct = _egGetActiveMapModValue('map_longer_ailments');
        if (longerPct > 0) scaled = durationS * (1 + Math.min(100, longerPct) / 100);
    }
    _egApplyStatusToMap(_egPlayerStatuses, key, scaled, dps);
    _egStartPlayerStatusBarTicker();
    showToast(`${EG_AILMENT_ICONS[key] || ''} ${key === 'shadowburn' ? 'Shadow Burn' : key === 'polymorph' ? 'Polymorph — the encounter turns chaotic!' : key.charAt(0).toUpperCase() + key.slice(1)}!`);
}


//------------------------------------------------------------------------
//-------------------PLAYER STATUS BAR (above inventory)------------------
//------------------------------------------------------------------------
// Shared bar above the inventory strip. Shows a chip per active player
// ailment (icon + live countdown); the block-recovery chip is appended by
// endgame-encounter.js into the same bar.
//------------------------------------------------------------------------

// 100 ms ticker that refreshes ailment chip countdowns.
let _egPlayerStatusBarTicker = null;

// Creates (or returns) the shared player status bar container.
function _egEnsurePlayerStatusBar() {
    let bar = document.getElementById('eg-player-status-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'eg-player-status-bar';
        document.body.appendChild(bar);
    }
    return bar;
}

function _egStartPlayerStatusBarTicker() {
    if (_egPlayerStatusBarTicker) return;
    _egPlayerStatusBarTicker = setInterval(_egRenderPlayerAilmentChips, 100);
    _egRenderPlayerAilmentChips();
}

// Syncs the ailment chips with _egPlayerStatuses; stops itself when empty.
function _egRenderPlayerAilmentChips() {
    if (!_egIsActive()) { _egStopPlayerStatusBarTicker(); return; }

    const bar = document.getElementById('eg-player-status-bar');
    if (!bar) {
        if (!Object.keys(_egPlayerStatuses).length) { _egStopPlayerStatusBarTicker(); return; }
        _egEnsurePlayerStatusBar();
        return;
    }

    const now = Date.now();
    let anyActive = false;
    for (const key of Object.keys(_egPlayerStatuses)) {
        const st = _egPlayerStatuses[key];
        const remainingMs = st.until - now;
        let chip = document.getElementById(`eg-status-ail-${key}`);

        if (remainingMs <= 0) {
            if (chip) chip.remove();
            continue;
        }
        anyActive = true;

        if (!chip) {
            chip = document.createElement('div');
            chip.id = `eg-status-ail-${key}`;
            chip.className = `eg-status-chip eg-status-chip-${key}`;
            chip.title = key === 'shadowburn' ? 'Shadow Burn'
                : key.charAt(0).toUpperCase() + key.slice(1);
            chip.innerHTML = `
                <div class="eg-lockout-icon">${EG_AILMENT_ICONS[key] || ''}</div>
                <div class="eg-lockout-countdown"></div>`;
            bar.appendChild(chip);
        }
        const cd = chip.querySelector('.eg-lockout-countdown');
        if (cd) cd.textContent = `${Math.ceil(remainingMs / 1000)}`;
    }

    if (!anyActive && !document.getElementById('eg-block-lockout-overlay')) {
        _egStopPlayerStatusBarTicker();
    }
}

function _egStopPlayerStatusBarTicker() {
    if (_egPlayerStatusBarTicker) {
        clearInterval(_egPlayerStatusBarTicker);
        _egPlayerStatusBarTicker = null;
    }
    const bar = document.getElementById('eg-player-status-bar');
    if (bar) bar.remove();
}

// True while the player is polymorphed: monsters attack each other and the
// player's charged reveal shots hit themself.
function _egIsPolymorphActive() {
    if (!_egIsActive()) return false;
    return _egPlayerHasAilment('polymorph');
}

// Picks a random OTHER living monster for polymorph friendly fire.
// Returns the monster object or null when alone (then attacks land normally).
function _egGetPolymorphVictim(attackerId) {
    const others = _egMonsters.filter(m => m.id !== attackerId && m.currentHP > 0);
    if (others.length === 0) return null;
    return others[Math.floor(Math.random() * others.length)];
}

function _egPlayerHasAilment(key) {
    return _egHasStatus(_egPlayerStatuses, key);
}

// Charge-bar rate multiplier for the PLAYER (chill/frozen).
function _egGetPlayerChargeMultiplier() {
    if (!_egIsActive()) return 1;
    if (_egPlayerHasAilment('frozen')) return 0;
    // Active map run: a permanent icy aura chills the player.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_chilling_aura')) {
        return EG_AIL_CHARGE_SLOW_MULT;
    }
    if (_egPlayerHasAilment('chill')) return EG_AIL_CHARGE_SLOW_MULT;
    return 1;
}

// Charge-bar rate multiplier for a MONSTER (chill/frozen).
function _egGetMonsterChargeMultiplier(m) {
    if (!m || !m.statuses) return 1;
    if (_egHasStatus(m.statuses, 'frozen')) return 0;
    if (_egHasStatus(m.statuses, 'chill')) return EG_AIL_CHARGE_SLOW_MULT;
    return 1;
}

// +shock damage-taken amplification for a MONSTER target.
function _egApplyAilmentShockAmpOnMonster(target, amount) {
    if (!target || !target.statuses || !_egHasStatus(target.statuses, 'shocked')) return amount;
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT / 100);
}

// +shock damage-taken amplification for the PLAYER.
function _egApplyPlayerShockAmp(amount) {
    if (!_egIsActive()) return amount;
    if (!_egPlayerHasAilment('shocked')) return amount;
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT / 100);
}


//------------------------------------------------------------------------
//-------------------AILMENT APPLICATION (COMBAT)------------------------
//------------------------------------------------------------------------
// Player → Monster: rolled from gear ailment chances when a hit carries the
// matching element. Called from _egDamageTargetById AFTER resistances, so
// `amount` is the actual damage dealt and `elements` the per-element share.
//------------------------------------------------------------------------

function _egRollPlayerHitAilments(target, amount, elements) {
    if (!_egIsActive() || !target || target.currentHP <= 0) return;
    const stats = _egComputePlayerStats();

    const fireShare = elements ? (elements.fire || 0) : 0;
    const coldShare = elements ? (elements.cold || 0) : 0;
    const lightningShare = elements ? (elements.lightning || 0) : 0;

    if (fireShare > 0 && stats.ignitePct > 0 && Math.random() * 100 < stats.ignitePct) {
        _egApplyMonsterAilment(target, 'ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_IGNITE_DMG_SHARE));
    }
    if (coldShare > 0) {
        if (stats.freezePct > 0 && Math.random() * 100 < stats.freezePct) {
            _egApplyMonsterAilment(target, 'frozen');
        } else if (Math.random() * 100 < EG_COLD_INNATE_CHILL_CHANCE_PCT) {
            _egApplyMonsterAilment(target, 'chill');
        }
    }
    if (lightningShare > 0 && stats.shockPct > 0 && Math.random() * 100 < stats.shockPct) {
        _egApplyMonsterAilment(target, 'shocked');
    }
}

//------------------------------------------------------------------------
// Monster → Player: rolled from the monster's attack element whenever an
// attack actually deals damage. Called from _egPlayerTakeDamage.
//------------------------------------------------------------------------

function _egRollMonsterHitAilment(element, dealt) {
    if (!_egIsActive() || !element || !(dealt > 0)) return;
    // Active map run: "Monster Hits have +#% chance to inflict Ailments".
    const ailChance = EG_MONSTER_AILMENT_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_ailments') : 0);
    if (Math.random() * 100 >= ailChance) return;

    switch (element) {
        case 'fire':
            _egApplyPlayerAilment('ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
            break;
        case 'cold':
            _egApplyPlayerAilment('chill');
            // Active map run: monster cold hits may freeze the player.
            if (typeof _egGetActiveMapModValue === 'function'
                && Math.random() * 100 < _egGetActiveMapModValue('map_freezing_hits')) {
                _egApplyPlayerAilment('frozen');
            }
            break;
        case 'lightning':
            _egApplyPlayerAilment('shocked');
            break;
        case 'shadow':
            _egApplyPlayerAilment('shadowburn', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_SHADOWBURN_DMG_SHARE));
            break;
        case 'arcane':
            _egApplyPlayerAilment('polymorph');
            break;
    }
}


//------------------------------------------------------------------------
//-------------------DoT DAMAGE DEALT TO THE PLAYER----------------------
//------------------------------------------------------------------------
// Ignite drains the absorption shield FIRST, then HP.
// Shadow Burn ignores the shield entirely and burns straight from HP.
//------------------------------------------------------------------------

function _egDealPlayerDotDamage(rawAmount, ignoreShield) {
    if (typeof dead !== 'undefined' && dead) return;

    let amount = rawAmount;

    // Active map run: "#% increased Damage over Time taken".
    if (typeof _egGetActiveMapModValue === 'function') {
        const dotPct = _egGetActiveMapModValue('map_increased_dot');
        if (dotPct > 0) amount *= (1 + dotPct / 100);
    }

    if (!ignoreShield && _egPlayerAbsorptionCurrent > 0) {
        const absorbed = Math.min(_egPlayerAbsorptionCurrent, amount);
        _egPlayerAbsorptionCurrent -= absorbed;
        amount -= absorbed;
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('player_shield_damage_taken');
    }

    amount = Math.round(Math.max(0, amount));

    // Floating DoT number on the player HUD (no squish/SFX spam)
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud && amount > 0) {
        const label = document.createElement('div');
        label.className = 'eg-player-damage eg-dot-damage';
        label.textContent = `-${amount}`;
        hud.appendChild(label);
        setTimeout(() => label.remove(), 1500);
    }

    if (amount <= 0) {
        if (typeof _renderPlayerAvatar === 'function') _renderPlayerAvatar();
        return;
    }

    playerCurrentHP = Math.max(0, playerCurrentHP - amount);
    if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    if (playerCurrentHP <= 0 && typeof _egGameOver === 'function') _egGameOver();
}


//------------------------------------------------------------------------
//-------------------AILMENTS TICK (called at 10Hz)----------------------
//------------------------------------------------------------------------

function _egExpireFromMap(statusMap, now) {
    Object.keys(statusMap).forEach(key => {
        if (statusMap[key].until <= now) delete statusMap[key];
    });
}

function _egTickAilments() {
    if (!_egIsActive()) return;
    const now = Date.now();
    const deltaS = 0.1; // 10Hz tick

    // --- Player statuses ---
    _egExpireFromMap(_egPlayerStatuses, now);
    let playerDot = 0;
    let playerIgnoresShield = false;
    Object.keys(_egPlayerStatuses).forEach(key => {
        const st = _egPlayerStatuses[key];
        if (!(st.dps > 0)) return;
        st.acc = (st.acc || 0) + deltaS;
        if (st.acc >= EG_AIL_TICK_INTERVAL_S) {
            st.acc -= EG_AIL_TICK_INTERVAL_S;
            playerDot += Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(st.dps));
            if (key === 'shadowburn') playerIgnoresShield = true;
        }
    });
    if (playerDot > 0) _egDealPlayerDotDamage(playerDot, playerIgnoresShield);

    // --- Monster statuses ---
    const deadIds = [];
    _egMonsters.forEach(m => {
        if (!m.statuses) return;
        _egExpireFromMap(m.statuses, now);

        let dotTotal = 0;
        Object.keys(m.statuses).forEach(key => {
            const st = m.statuses[key];
            if (!(st.dps > 0)) return;
            st.acc = (st.acc || 0) + deltaS;
            if (st.acc >= EG_AIL_TICK_INTERVAL_S) {
                st.acc -= EG_AIL_TICK_INTERVAL_S;
                dotTotal += Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(st.dps));
            }
        });

        if (dotTotal > 0) {
            m.currentHP = Math.max(0, m.currentHP - dotTotal);
            if (typeof _egShowDamageNumber === 'function') _egShowDamageNumber(m.id, dotTotal);
            if (m.currentHP <= 0) deadIds.push(m.id);
        }
    });

    // Kill DoT victims after iteration (loot/xp pipeline runs normally)
    deadIds.forEach(id => {
        if (typeof _egBossCheckPhase === 'function') {
            const target = _egMonsters.find(mm => mm.id === id);
            if (target && target.isBoss) _egBossCheckPhase(target);
        }
        if (typeof _egKillMonster === 'function') _egKillMonster(id);
    });
}


//------------------------------------------------------------------------
//-------------------STATUS ICON UI--------------------------------------
//------------------------------------------------------------------------

// Builds "🔥5 ❄️3" style signature so icons only rebuild when they change.
function _egStatusSignature(statusMap) {
    const now = Date.now();
    return Object.keys(statusMap)
        .filter(key => statusMap[key].until > now)
        .sort()
        .map(key => `${key}:${Math.ceil((statusMap[key].until - now) / 1000)}`)
        .join(',');
}

function _egBuildStatusIconsHTML(statusMap) {
    const now = Date.now();
    return Object.keys(statusMap)
        .filter(key => statusMap[key].until > now)
        .map(key => `<span class="eg-status-icon st-${key}" title="${key}">${EG_AILMENT_ICONS[key] || '?'}${Math.ceil((statusMap[key].until - now) / 1000)}</span>`)
        .join('');
}

// Per-monster icon strip — cheap DOM update driven by _egUpdateMonsterBars.
function _egRenderMonsterStatusStrip(m) {
    if (!m || !m.statuses) return;
    const strip = document.getElementById(`eg-status-${m.id}`);
    if (!strip) return;
    const sig = _egStatusSignature(m.statuses);
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.innerHTML = _egBuildStatusIconsHTML(m.statuses);
}

// Player icon strip above the avatar — created lazily, refreshed per tick.
function _egRefreshPlayerStatusIcons() {
    if (!_egIsActive()) return;
    let strip = document.getElementById('eg-player-status-strip');
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'eg-player-status-strip';
        strip.className = 'eg-status-strip eg-player-status-strip';
        hud.appendChild(strip);
    }
    const sig = _egStatusSignature(_egPlayerStatuses);
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.innerHTML = _egBuildStatusIconsHTML(_egPlayerStatuses);
}


//------------------------------------------------------------------------
//-------------------PUZZLE ATTACK (Monster → Grid)----------------------
//------------------------------------------------------------------------
// 5% of monster attacks fly to the CENTRE OF THE GRID instead of the player
// and inflict a puzzle ailment based on the monster's element. Reads as the
// monster corrupting the puzzle itself — visible, dodgeable-in-spirit, and
// never a sudden unfair hit.
//------------------------------------------------------------------------

function _egMaybePuzzleAttack(monster) {
    if (!_egIsActive()) return false;
    if (!monster || !monster.element) return false;
    // Active map run: "Monster Attacks have +#% chance to strike the Puzzle".
    const aggroChance = EG_PUZZLE_ATTACK_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_puzzle_aggro') : 0);
    if (Math.random() * 100 >= aggroChance) return false;

    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const grid = document.getElementById('ptable');
    if (!sourceCard || !grid || typeof _egFireProjectile !== 'function') return false;
    if (typeof cur === 'undefined' || !cur || !cur.grid || !cur.grid.length) return false;

    const start = (typeof _egGetElementCentre === 'function') ? _egGetElementCentre(sourceCard) : null;
    const end = (typeof _egGetElementCentre === 'function') ? _egGetElementCentre(grid) : null;
    if (!start || !end) return false;

    _egFireProjectile(monster.emoji, 'eg-proj-monster eg-proj-puzzle', start, end,
        (typeof EG_MONSTER_PROJ_DURATION_MS !== 'undefined') ? EG_MONSTER_PROJ_DURATION_MS : 600,
        'ease-in',
        () => _egApplyPuzzleAilment(monster.element));
    return true;
}

function _egApplyPuzzleAilment(element) {
    if (!_egIsActive()) return;
    switch (element) {
        case 'fire': _egPuzzleLava(); break;
        case 'cold': _egPuzzleIce(); break;
        case 'lightning': _egPuzzleShockedCursor(); break;
        case 'shadow': _egPuzzleShadowBlackout(); break;
        // Arcane has no grid hazard — the chaos curse IS the effect
        case 'arcane': _egApplyPlayerAilment('polymorph'); break;
    }
}

// Picks a random valid cell for hazard placement (unfilled, unrevealed).
function _egPickHazardCell(existingKeys, radiusCenter) {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    for (let tries = 0; tries < 40; tries++) {
        let r, c;
        if (radiusCenter && tries < 20) {
            // Bias towards the impact zone around the grid centre
            r = radiusCenter.r + Math.floor(Math.random() * 7) - 3;
            c = radiusCenter.c + Math.floor(Math.random() * 7) - 3;
        } else {
            r = Math.floor(Math.random() * rows);
            c = Math.floor(Math.random() * cols);
        }
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const key = `${r}-${c}`;
        if (existingKeys.has(key)) continue;
        if (revealedGrid[r][c] || userGrid[r][c] === 1) continue;
        return { r, c, key };
    }
    return null;
}

function _egRegisterPuzzleEffect(effect) {
    effect.until = Date.now() + EG_PUZZLE_EFFECT_DURATION_MS;
    effect.timer = setTimeout(() => _egRemovePuzzleEffect(effect), EG_PUZZLE_EFFECT_DURATION_MS);
    _egPuzzleEffects.push(effect);
}

function _egRemovePuzzleEffect(effect) {
    clearTimeout(effect.timer);
    _egPuzzleEffects = _egPuzzleEffects.filter(e => e !== effect);

    if (effect.type === 'lava' || effect.type === 'ice') {
        effect.cells.forEach((spanId) => {
            const span = document.getElementById(spanId);
            if (span) span.remove();
        });
    } else if (effect.type === 'shockcursor') {
        _egStopShockedCursor();
    } else if (effect.type === 'shadowline') {
        _egRestoreLineClues(effect.line);
    }
}

// Removes ALL active puzzle ailments (encounter stop / new map).
function _egClearAllPuzzleEffects() {
    _egPuzzleEffects.slice().forEach(_egRemovePuzzleEffect);
}


//------------------------------------------------------------------------
//-------------------PUZZLE: LAVA (fire)---------------------------------
//------------------------------------------------------------------------
// Wrong clicks on lava cells count as 2 mistakes and cost double time.
// The doubling itself lives in penalty.js (_egIsLavaCell check).
//------------------------------------------------------------------------

function _egPuzzleLava() {
    if (_egPuzzleEffects.some(e => e.type === 'lava')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map(); // key → overlay span id

    for (let i = 0; i < EG_PUZZLE_HAZARD_CELLS; i++) {
        const pick = _egPickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'eg-lava-overlay';
        span.id = `eg-lava-${pick.r}-${pick.c}`;
        span.textContent = '🌋';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _egRegisterPuzzleEffect({ type: 'lava', cells });
    showToast('🌋 The monster scorched the grid — lava cells punish wrong clicks doubly!');
}

function _egIsLavaCell(row, col) {
    return _egPuzzleEffects.some(e => e.type === 'lava' && e.cells.has(`${row}-${col}`));
}


//------------------------------------------------------------------------
//-------------------PUZZLE: ICE (cold)----------------------------------
//------------------------------------------------------------------------
// Clicking an icy cell may slip onto a random orthogonal neighbour instead.
// Registered as a click intercept in mouse-button-handlers.js.
//------------------------------------------------------------------------

function _egPuzzleIce() {
    if (_egPuzzleEffects.some(e => e.type === 'ice')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map();

    for (let i = 0; i < EG_PUZZLE_HAZARD_CELLS; i++) {
        const pick = _egPickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'eg-ice-overlay';
        span.id = `eg-ice-${pick.r}-${pick.c}`;
        span.textContent = '🧊';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _egRegisterPuzzleEffect({ type: 'ice', cells });
    showToast('🧊 Ice spreads across the grid — clicks may slip!');
}

function _egIsIceCell(row, col) {
    return _egPuzzleEffects.some(e => e.type === 'ice' && e.cells.has(`${row}-${col}`));
}

// Click intercept: slip the click to a random orthogonal neighbour.
// Returns true when the click was consumed by the slip.
function _egPuzzleIceRedirect(row, col) {
    if (!_egIsActive() || _egIceRedirectDepth >= 2) return false;
    if (!_egIsIceCell(row, col)) return false;
    if (Math.random() >= EG_ICE_SLIP_CHANCE) return false;

    const neighbours = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ].filter(([r, c]) =>
        r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length
        && !revealedGrid[r][c]
    );
    if (neighbours.length === 0) return false;

    const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];
    showToast('🧊 Slippery! Your click slid to another cell.');
    _egIceRedirectDepth++;
    try {
        applyCell(nr, nc); // reuses the same pval → same click type on neighbour
    } finally {
        _egIceRedirectDepth--;
    }
    return true;
}


//------------------------------------------------------------------------
//-------------------PUZZLE: SHOCKED CURSOR (lightning)------------------
//------------------------------------------------------------------------
// Lightning sparks orbit the mouse cursor. While active, every revealed
// (correctly filled) cell has a chance to strip a random ✕ mark anywhere on
// the grid, regardless of its distance from the revealed cell.
//------------------------------------------------------------------------

function _egPuzzleShockedCursor() {
    if (_egPuzzleEffects.some(e => e.type === 'shockcursor')) return;
    _egStartShockedCursor();
    _egRegisterPuzzleEffect({ type: 'shockcursor' });
    showToast('⚡ Your cursor is shocked — reveals may scatter your ✕ marks!');
}

function _egStartShockedCursor() {
    if (_egSparkFollowerEl) return;
    document.body.classList.add('eg-cursor-shocked');
    _egSparkFollowerEl = document.createElement('div');
    _egSparkFollowerEl.id = 'eg-cursor-sparks';
    _egSparkFollowerEl.textContent = '⚡';
    document.body.appendChild(_egSparkFollowerEl);
    _egSparkLastX = window.innerWidth / 2;
    _egSparkLastY = window.innerHeight / 2;
    _egSparkMoveHandler = (e) => {
        _egSparkLastX = e.clientX;
        _egSparkLastY = e.clientY;
        _egSparkFollowerEl.style.left = `${e.clientX}px`;
        _egSparkFollowerEl.style.top = `${e.clientY}px`;
    };
    document.addEventListener('mousemove', _egSparkMoveHandler);
    // Continuous lightning sparks crackling around the cursor
    _egSparkSpawnTimer = setInterval(() => {
        if (!_egSparkFollowerEl) return;
        const count = 2 + Math.floor(Math.random() * 3); // 2–4 sparks per tick
        for (let i = 0; i < count; i++) _egSpawnCursorSpark();
    }, 110);
}

function _egSpawnCursorSpark(x = _egSparkLastX, y = _egSparkLastY) {
    const spark = document.createElement('div');
    spark.className = 'eg-spark-particle';
    spark.textContent = EG_SPARK_GLYPHS[Math.floor(Math.random() * EG_SPARK_GLYPHS.length)];
    // Start at a small random offset so sparks ring the target point
    const ang = Math.random() * Math.PI * 2;
    const startR = 4 + Math.random() * 10;
    const dx = Math.cos(ang) * (14 + Math.random() * 26);
    const dy = Math.sin(ang) * (14 + Math.random() * 26) - 6; // slight upward bias
    spark.style.left = `${x + Math.cos(ang) * startR}px`;
    spark.style.top = `${y + Math.sin(ang) * startR}px`;
    spark.style.fontSize = `${(9 + Math.random() * 8).toFixed(1)}px`;
    const life = 0.35 + Math.random() * 0.3;
    spark.style.setProperty('--eg-spark-life', `${life.toFixed(2)}s`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), life * 1000 + 60);
}

// Lightning-zap burst on a ✕ mark that was just stripped by the shocked cursor.
function _egSpawnCrossZapFX(row, col) {
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Big electric ✕ flashing over the cell, then burning away
    const fx = document.createElement('div');
    fx.className = 'eg-cross-zap';
    fx.textContent = '✕';
    fx.style.left = `${cx}px`;
    fx.style.top = `${cy}px`;
    fx.style.fontSize = `${Math.max(rect.width, rect.height) * 0.85}px`;
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 700);

    // Sparks scattering from the zapped mark
    for (let i = 0; i < 5; i++) _egSpawnCursorSpark(cx, cy);
}

function _egStopShockedCursor() {
    document.body.classList.remove('eg-cursor-shocked');
    if (_egSparkSpawnTimer) { clearInterval(_egSparkSpawnTimer); _egSparkSpawnTimer = null; }
    if (_egSparkFollowerEl) { _egSparkFollowerEl.remove(); _egSparkFollowerEl = null; }
    if (_egSparkMoveHandler) { document.removeEventListener('mousemove', _egSparkMoveHandler); _egSparkMoveHandler = null; }
}

// Called from handleCorrectFill — while the cursor is shocked, each reveal has
// a chance to strip a random ✕ mark anywhere on the grid (distance irrelevant).
function _egOnCorrectCellPuzzleFX(row, col) {
    if (!_egIsActive()) return;
    if (!_egPuzzleEffects.some(e => e.type === 'shockcursor')) return;
    if (Math.random() >= EG_SHOCK_MARK_STRIP_CHANCE) return;

    // Collect all currently ✕-marked cells, regardless of distance from reveal
    const marked = [];
    for (let r = 0; r < cur.grid.length; r++) {
        for (let c = 0; c < cur.grid[0].length; c++) {
            if (userGrid[r][c] === 2) marked.push([r, c]);
        }
    }
    if (!marked.length) return;

    const [r, c] = marked[Math.floor(Math.random() * marked.length)];
    userGrid[r][c] = 0;
    systemMarkedGrid[r][c] = false;
    renderCell(r, c);
    _egSpawnCrossZapFX(r, c);
    showToast('⚡ A spark zapped one of your ✕ marks!');
}


//------------------------------------------------------------------------
//-------------------PUZZLE: SHADOW BLACKOUT (shadow)--------------------
//------------------------------------------------------------------------
// One random row OR column clue line goes dark ("?") for a while.
// Scoped variant of the boss-wide Clue Blackout mechanic.
//------------------------------------------------------------------------

function _egPuzzleShadowBlackout() {
    if (_egPuzzleEffects.some(e => e.type === 'shadowline')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const isRow = Math.random() < 0.5;
    const idx = isRow ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);
    const prefix = isRow ? `rn-${idx}-` : `cn-${idx}-`;
    const line = { dir: isRow ? 'row' : 'col', idx };

    const spans = document.querySelectorAll(`[id^="${prefix}"]`);
    if (!spans.length) return;

    spans.forEach(span => {
        span.dataset.origText = span.textContent;
        span.textContent = '?';
        span.classList.add('eg-shadow-clue-blackout');
    });

    _egRegisterPuzzleEffect({ type: 'shadowline', line });
    showToast(`🌑 Shadow veils a ${isRow ? 'row' : 'column'} of clue numbers!`);
}

function _egRestoreLineClues(line) {
    if (!line) return;
    const prefix = line.dir === 'row' ? `rn-${line.idx}-` : `cn-${line.idx}-`;
    document.querySelectorAll(`[id^="${prefix}"]`).forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('eg-shadow-clue-blackout');
    });
}


//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------

// Full reset — called when a fresh encounter starts.
function _egAilmentsReset() {
    _egPlayerStatuses = {};
    _egClearAllPuzzleEffects();
    _egIceRedirectDepth = 0;
    _egStopShockedCursor();
    _egStopPlayerStatusBarTicker();
    if (typeof _egHideBlockLockoutOverlay === 'function') _egHideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}

// Cleanup — called when the encounter stops (also covers game over).
function _egAilmentsCleanup() {
    _egPlayerStatuses = {};
    _egClearAllPuzzleEffects();
    _egStopShockedCursor();
    _egStopPlayerStatusBarTicker();
    if (typeof _egHideBlockLockoutOverlay === 'function') _egHideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}
