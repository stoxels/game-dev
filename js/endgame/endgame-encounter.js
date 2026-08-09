//------------------------------------------------------------------------
//-------------------CONSTANTS & CONFIGURATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// All zone IDs where monster cards can be rendered.
const EG_MONSTER_ZONES = [
    'eg-monster-panel',
    'eg-panel-left',
    'eg-panel-right',
    'eg-panel-bottom',
    'eg-panel-top-corner'
];

// Default monster count per wave if cur.maxMonsters is not set.
const EG_DEFAULT_MONSTER_CAP = 3;

// How long the boss spawn delay is after the kill threshold is reached (ms).
const EG_BOSS_SPAWN_DELAY_MS = 1500;

// Delay range for respawn timer (ms). A random value in [min, min+variance] is used.
const EG_RESPAWN_DELAY_MIN_MS = 4000;
const EG_RESPAWN_DELAY_RANGE_MS = 6000;

// Delay before re-rendering the panel after a monster death (ms).
const EG_PANEL_RERENDER_DELAY_MS = 350;

// How long the player HUD hit flash lasts (ms).
const EG_PLAYER_HIT_FLASH_MS = 150;

// How long a floating damage number stays on screen (ms).
const EG_DAMAGE_NUMBER_DURATION_MS = 600;

// How long a floating player damage number stays on screen (ms).
const EG_PLAYER_DAMAGE_NUMBER_DURATION_MS = 1500;

// How long the immune flash and label last on the card (ms).
const EG_IMMUNE_FLASH_DURATION_MS = 400;
const EG_IMMUNE_LABEL_DURATION_MS = 700;

// Melee animation roundtrip duration (ms). Impact fires at the midpoint.
const EG_MELEE_ANIM_DURATION_MS = 500;

// Ranged monster projectile travel duration (ms).
const EG_MONSTER_PROJ_DURATION_MS = 400;

EG_INITIAL_SPAWN_STAGGER_BASE_MS = 500
EG_INITIAL_SPAWN_STAGGER_STEP_MS = 200


//------------------------------------------------------------------------
//-------------------PUZZLE HELPER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if every filled cell in the solution has been correctly placed.
function _egIsPuzzleSolved() {
    if (!cur || !userGrid) return false;
    for (let r = 0; r < cur.grid.length; r++)
        for (let c = 0; c < cur.grid[0].length; c++)
            if (cur.grid[r][c] === 1 && userGrid[r][c] !== 1) return false;
    return true;
}


//------------------------------------------------------------------------
//-------------------SPAWN LIST BUILDERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the base level for a monster, applying a small ±2 random variance.
// Variance keeps a wave from feeling perfectly uniform.
function _egRollMonsterLevel(baseLevel) {
    return Math.max(1, baseLevel + Math.floor(Math.random() * 5) - 2);
}

// Returns the resolved base level for the current encounter (falls back to 1).
function _egGetEncounterBaseLevel() {
    return (cur.monsterLevel != null && cur.monsterLevel > 0) ? cur.monsterLevel : 1;
}

// Builds a fixed monster list from cur.monsters, levelling each entry.
// Used when the map explicitly defines which monsters should appear.
function _egBuildFixedNormalList(baseLevel, cap) {
    return cur.monsters.slice(0, cap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
    }));
}

// Builds a randomised monster list by shuffling all non-boss defs.
// Count is random in [1, cap]. Used when the map has no explicit monster list.
function _egBuildRandomNormalList(baseLevel, cap) {
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return [];

    const shuffled = [...allNonBoss].sort(() => Math.random() - 0.5);
    const maxCount = Math.min(cap, shuffled.length);
    const count = 1 + Math.floor(Math.random() * maxCount); // 1..cap
    return shuffled.slice(0, count).map(d => ({ id: d.id, level: _egRollMonsterLevel(baseLevel) }));
}

// Builds the normal (non-boss) part of the spawn list for the current encounter.
// Delegates to fixed or random list builders depending on cur.monsters.
// cur.maxMonsters caps the total count (0 = boss-only encounter).
function _egBuildNormalSpawnList(baseLevel) {
    const cap = (cur.maxMonsters != null && cur.maxMonsters >= 0) ? cur.maxMonsters : EG_DEFAULT_MONSTER_CAP;
    if (cap === 0) return [];

    if (cur.monsters && cur.monsters.length > 0) {
        return _egBuildFixedNormalList(baseLevel, cap);
    }
    return _egBuildRandomNormalList(baseLevel, cap);
}

// Builds a boss list from an explicit list of boss entries on a map def object.
// Shared by both _egBuildBossSpawnList (cur) and _egBuildBossSpawnListFromDef (mapDef).
function _egBuildFixedBossList(bosses, bossCap, baseLevel) {
    return bosses.slice(0, bossCap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
        isBossSpawn: true,
    }));
}

// Picks one random boss from EG_BOSS_DEFS and returns it as a one-entry list.
// Used when hasBoss is true but no explicit boss list is defined.
function _egBuildRandomBossList(baseLevel) {
    const allBossDefs = Object.values(EG_BOSS_DEFS);
    if (allBossDefs.length === 0) return [];
    const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
    return [{ id: picked.id, level: _egRollMonsterLevel(baseLevel), isBossSpawn: true }];
}

// Builds the boss part of the spawn list for the current encounter (reads from cur).
// Uses cur.bosses if provided; otherwise picks one random boss when cur.hasBoss is true.
// cur.maxBosses caps the count (defaults to 1).
function _egBuildBossSpawnList(baseLevel) {
    const hasBossFlag = cur.hasBoss;
    const explicitBosses = cur.bosses && cur.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (cur.maxBosses != null && cur.maxBosses > 0) ? cur.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(cur.bosses, bossCap, baseLevel);
    return _egBuildRandomBossList(baseLevel);
}

// Like _egBuildBossSpawnList but reads from an explicit mapDef object instead of cur.
// Used by _egSpawnChainBoss so it always reads from the original map def.
function _egBuildBossSpawnListFromDef(mapDef, baseLevel) {
    if (!mapDef) return [];
    const hasBossFlag = mapDef.hasBoss;
    const explicitBosses = mapDef.bosses && mapDef.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (mapDef.maxBosses != null && mapDef.maxBosses > 0) ? mapDef.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(mapDef.bosses, bossCap, baseLevel);
    return _egBuildRandomBossList(baseLevel);
}

// Returns the full ordered spawn list for this encounter: normal monsters first.
// NOTE: Bosses are intentionally withheld from the initial wave.
//       They spawn later via _egSpawnChainBoss at the 50% kill threshold.
function _egBuildSpawnList() {
    const baseLevel = _egGetEncounterBaseLevel();
    return _egBuildNormalSpawnList(baseLevel);
}


//------------------------------------------------------------------------
//-------------------RESPAWN SCHEDULER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if a respawn should be suppressed right now.
// Checks encounter state, kill totals, boss presence, and concurrent cap.
function _egShouldSuppressRespawn() {
    if (!_egIsActive()) return true;

    const req = _egGetMapRequirements();
    const total = req.totalMonsters;
    if (total > 0 && _egChainKillCount >= total) return true;

    // Suppress if a boss is already on the field
    if (_egMonsters.some(m => m.isBoss)) return true;

    // Suppress if already at the concurrent cap
    if (_egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return true;

    return false;
}

// Picks a random non-boss def and spawns it at the current encounter's base level.
function _egRespawnRandomMonster() {
    const baseLevel = _egGetEncounterBaseLevel();
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return;

    const def = allNonBoss[Math.floor(Math.random() * allNonBoss.length)];
    _egSpawnMonster(def.id, _egRollMonsterLevel(baseLevel));
}

// Schedules a single replacement monster to spawn after a short random delay.
// Called whenever a normal monster dies and the kill gate is not yet reached.
function _egScheduleRespawn() {
    const delay = EG_RESPAWN_DELAY_MIN_MS + Math.random() * EG_RESPAWN_DELAY_RANGE_MS;
    const t = setTimeout(() => {
        if (_egShouldSuppressRespawn()) return;
        _egRespawnRandomMonster();
    }, delay);
    _egSpawnTimers.push(t); // tracked so it gets cancelled on encounter stop
}


//------------------------------------------------------------------------
//-------------------SPAWN STAGGER SCHEDULER------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates a staggered delay for a single spawn entry in the initial wave.
// The first 1-2 monsters appear almost immediately; the rest are spaced 4-10s apart.
function _egCalcSpawnDelay(index, immediateCount, cumulativeDelay) {
    if (index < immediateCount) {
        // Tiny stagger so the first batch doesn't all land simultaneously
        return { delay: EG_INITIAL_SPAWN_STAGGER_BASE_MS + index * EG_INITIAL_SPAWN_STAGGER_STEP_MS, cumulative: cumulativeDelay };
    }
    const extra = EG_RESPAWN_DELAY_MIN_MS + Math.random() * EG_RESPAWN_DELAY_RANGE_MS;
    const newCumulative = cumulativeDelay + extra;
    return { delay: newCumulative, cumulative: newCumulative };
}

// Queues all monsters in spawnList with staggered appearance delays.
// The first 1-2 entries appear almost immediately; the rest ramp up gradually.
function _egScheduleMonsterSpawns(spawnList) {
    if (spawnList.length === 0) return;

    const immediateCount = Math.min(spawnList.length, 1 + Math.floor(Math.random() * 2));
    let cumulativeDelay = 0;

    spawnList.forEach((entry, i) => {
        const result = _egCalcSpawnDelay(i, immediateCount, cumulativeDelay);
        cumulativeDelay = result.cumulative;

        const t = setTimeout(() => {
            if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
        }, result.delay);
        _egSpawnTimers.push(t);
    });
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER LIFECYCLE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resets all encounter state variables to their initial values.
function _egResetEncounterState() {
    _egEncounterActive = true;
    _egTargetId = null;
    _egMonsters = [];
    _egMapDef = cur;
    _egMonsterSpawnCounter = 0;
    _egPlayerAbsorptionCurrent = _egComputePlayerStats().absorption;
    _egCancelAbsorptionRegen();
}

// Starts the combat tick loop at 10Hz.
function _egStartTickLoop() {
    if (_egTickInterval) clearInterval(_egTickInterval);
    _egTickInterval = setInterval(_egTickLoop, 100);
}

// Initialises and begins a full monster encounter for the current level.
// Called from start-level.js or equivalent when cur.isMonsterLevel is true.
function _egStartEncounter() {
    _egResetEncounterState();
    _egRenderPanel();
    _egStartTickLoop();
    _egStartPickupSpawner();
    _egScheduleMonsterSpawns(_egBuildSpawnList());
}

// Clears all pending spawn timers and resets the timer list.
function _egCancelSpawnTimers() {
    _egSpawnTimers.forEach(t => clearTimeout(t));
    _egSpawnTimers = [];
}

// Stops the combat tick loop if one is running.
function _egStopTickLoop() {
    if (_egTickInterval) {
        clearInterval(_egTickInterval);
        _egTickInterval = null;
    }
}

// Tears down a running encounter and cleans up all state and DOM.
// Safe to call even if no encounter is active.
function _egStopEncounter() {
    if (window._egSuppressEncounterStop) return;

    _egEncounterActive = false;
    _egMonsters = [];
    _egTargetId = null;

    _egStopTickLoop();
    _egCancelSpawnTimers();
    _egStopPickupSpawner();
    _egBossCleanupAll();
    _egCancelAbsorptionRegen();
    if (typeof _egChainCleanup === 'function') _egChainCleanup();
    _egHideMonsterPanel();
}


//------------------------------------------------------------------------
//-------------------COMBAT TICK LOOP-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Advances a single monster's charge bar by one tick (0.1s at 10Hz).
// Fires the monster's attack when the charge bar fills completely.
function _egTickMonster(m) {
    m.currentCharge += 0.1;
    if (m.currentCharge >= m.chargeMax) {
        m.currentCharge = 0;
        _egFireMonsterAttack(m);
    }
}

// Advances the player's charge bar. Fires the player attack when full.
function _egTickPlayer() {
    _egPlayerCurrentCharge += 0.1; // Ticks at 10Hz[cite: 1]

    if (_egPlayerCurrentCharge >= EG_PLAYER_CHARGE_MAX) {
        _egPlayerCurrentCharge = 0; // Reset charge

        // Only fire if there is an active target selected
        if (_egTargetId) {
            _egAnimatePlayerMelee(_egTargetId);
        }
    }
}

// Renders the visual width of the player's charge bar.
function _egUpdatePlayerChargeBar() {
    const playerChargeBar = document.getElementById('eg-player-charge-bar');
    if (playerChargeBar) {
        const chargePct = Math.min(100, Math.max(0, (_egPlayerCurrentCharge / EG_PLAYER_CHARGE_MAX) * 100));
        playerChargeBar.style.width = chargePct + '%';
    }
}


function _egGetMaxAllowedMistakes() {
    const def = _egMapDef || cur;
    if (!def || def.egMaxMistakes == null) return null;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? (_egComputePlayerStats().mistakeCount || 0) : 0;
    return def.egMaxMistakes + gearBonus;
}

function _egCheckMistakeLimit() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return;
    if (typeof mistakeCount !== 'undefined' && mistakeCount > max) {
        _egStopEncounter();
        dead = true;
        stopTimer();
        document.getElementById('lose-title').textContent = 'Map Failed';
        document.getElementById('lose-sub').textContent = 'Too many mistakes!';
        Audio_Manager.playSFX('player_defeated');

        document.getElementById('ov-lose').classList.add('show');
    }
}


// Runs at 10Hz. Advances every monster's charge bar and fires their attack
// when the bar fills. Also calls _egBossTick for per-tick boss logic.
function _egTickLoop() {
    if (!_egIsActive()) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;

    _egCheckMistakeLimit(); 

    _egBossTick();
    _egMonsters.forEach(_egTickMonster);

    // Player mechanics
    _egTickPlayer();
    _renderPlayerAvatar();
    //_renderPlayerCharge();

    _egUpdateBars();
}


//------------------------------------------------------------------------
//-------------------MONSTER ATTACKS (Monster → Player)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Flashes the monster's card to signal it is attacking.
function _egFlashMonsterAttackCard(monster) {
    const card = document.getElementById(`eg-card-${monster.id}`);
    if (!card) return;
    card.classList.remove('eg-flash-attack');
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add('eg-flash-attack');
}

// Resolves whether this attack should be melee or ranged.
// 'both' type randomly picks one each time the monster swings.
function _egResolveAttackType(monster) {
    const type = monster.attackType || 'ranged';
    if (type === 'both') return Math.random() < 0.5 ? 'melee' : 'ranged';
    return type;
}

// Fires the monster's attack: flashes the card and dispatches the correct animation.
function _egFireMonsterAttack(monster) {
    _egFlashMonsterAttackCard(monster);
    const attackType = _egResolveAttackType(monster);
    if (attackType === 'melee') {
        _egAnimateMonsterMelee(monster);
    } else {
        _egAnimateMonsterProjectile(monster);
    }
}


function _egApplyPlayerMissFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = 'MISS';
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Applies hit feedback to the player HUD: floating damage number + squish + red glow.
function _egApplyPlayerHitFeedback(damageValue) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Floating damage label
    const dmgLabel = document.createElement('div');
    dmgLabel.className = 'eg-player-damage';
    dmgLabel.textContent = `-${damageValue}`;
    hud.appendChild(dmgLabel);
    setTimeout(() => dmgLabel.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);

    // Squish + red-glow flash
    hud.style.transform = 'scale(0.95)';
    hud.style.boxShadow = 'inset 0 0 15px rgba(255,0,0,0.8), 0 0 15px rgba(255,0,0,0.8)';
    setTimeout(() => { hud.style.transform = ''; hud.style.boxShadow = ''; }, EG_PLAYER_HIT_FLASH_MS);

    Audio_Manager.playSFX('player_damage_taken');
}

// Launches a projectile from the monster's card to the player HUD.
// Damage and feedback are applied when the projectile arrives.
function _egAnimateMonsterProjectile(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    const start = _egGetElementCentre(sourceCard);
    const end = _egGetElementCentre(targetHud);

    _egFireProjectile(monster.emoji, 'eg-proj-monster', start, end, EG_MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
        const dealt = _egPlayerTakeDamage(monster.damageValue);
        if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
    });
}

// Triggers damage and hit feedback at the melee impact moment.
// Only fires if the encounter is still active and the monster is still alive.
function _egApplyMeleeImpact(monster) {
    if (!_egIsActive() || !_egMonsters.some(m => m.id === monster.id)) return;
    const dealt = _egPlayerTakeDamage(monster.damageValue);
    if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
}

// Physically lunges the monster card toward the player HUD and snaps back.
// Damage triggers at the animation midpoint (impact apex).
function _egAnimateMonsterMelee(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    const start = _egGetElementCentre(sourceCard);
    const end = _egGetElementCentre(targetHud);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the lunging card renders on top of everything else during flight
    sourceCard.style.zIndex = '999';

    const anim = sourceCard.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // apex/impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => { sourceCard.style.zIndex = ''; };

    // Damage fires at the animation midpoint so it matches the visual impact
    setTimeout(() => _egApplyMeleeImpact(monster), EG_MELEE_ANIM_DURATION_MS / 2);
}


//------------------------------------------------------------------------
//-------------------PLAYER ATTACKS (Player → Monster)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pushes a correctly filled cell into the recent-fills circular buffer.
// Used by the Prior Bomb mechanic to undo recent player progress.
function _egTrackRecentFill(row, col) {
    _egRecentFills.push([row, col]);
    if (_egRecentFills.length > EG_RECENT_FILLS_CAPACITY) _egRecentFills.shift();
}

// Entry point called from mouse-button-handlers.js on every correct cell fill.
// Snapshots the target ID before the animation runs so mid-flight target
// changes don't redirect the projectile.
function _egOnCorrectCell(row, col) {
    if (!_egIsActive()) return;

    if (row !== undefined && col !== undefined) _egTrackRecentFill(row, col);

    const damage = _egCalcPlayerDamage();
    const targetIdAtFire = _egTargetId; // snapshot — do not use _egTargetId in the callback
    _egAnimatePlayerProjectile(damage, targetIdAtFire, row, col);
}


// Launches a projectile from the clicked cell toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
function _egAnimatePlayerProjectile(damage, targetId, row, col) {
    // Try to get the cell element first, fall back to the HUD if missing
    let sourceEl = (row !== undefined && col !== undefined)
        ? document.getElementById(`g-${row}-${col}`)
        : null;

    if (!sourceEl) {
        sourceEl = document.getElementById('class-hud-drag-handle');
    }

    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceEl || !targetCard) {
        // No visual target — apply damage instantly without animation
        if (damage != null) _egDamageTargetById(targetId, damage);
        return;
    }

    const start = _egGetElementCentre(sourceEl);
    const end = _egGetElementCentre(targetCard);
    const projDef = _egGetProjectileDef();

    _egFireProjectile(projDef.emoji, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egDamageTargetById(targetId, damage);
    });
}


/*

// Launches a projectile from the player HUD toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
function _egAnimatePlayerProjectile(damage, targetId, row, col) {



    const sourceHud = document.getElementById('class-hud-drag-handle');
    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceHud || !targetCard) {
        // No visual target — apply damage instantly without animation
        if (damage != null) _egDamageTargetById(targetId, damage);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const projDef = _egGetProjectileDef();

    _egFireProjectile(projDef.emoji, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egDamageTargetById(targetId, damage);
    });
}

*/


// player charges the monster


// Applies the default melee damage at the moment of impact.
function _egApplyPlayerMeleeImpact(targetId) {
    if (!_egIsActive() || !_egMonsters.some(m => m.id === targetId)) return;

    // Uses the existing damage application logic[cite: 1]
    _egDamageTargetById(targetId, EG_PLAYER_MELEE_DAMAGE);
}

// Physically lunges the class HUD toward the targeted monster and snaps back.

// Lunges the permanent player unit at the targeted monster
function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const avatarWrapper = document.getElementById('player-avatar-wrapper');
    const sprite = document.getElementById('avatar-sprite-img');

    if (!avatarWrapper || !targetCard) {
        _egDamageTargetById(targetId, EG_PLAYER_MELEE_DAMAGE);
        return;
    }

    const start = _egGetElementCentre(avatarWrapper);
    const end = _egGetElementCentre(targetCard);

    // If the monster is to the left (end.x < start.x), flip the sprite
    const shouldFlip = end.x < start.x;
    sprite.style.transform = shouldFlip ? 'scaleX(-1)' : 'scaleX(1)';

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Bring to front during the lunge
    const originalZIndex = avatarWrapper.style.zIndex;
    avatarWrapper.style.zIndex = '9999';

    const anim = avatarWrapper.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        avatarWrapper.style.zIndex = originalZIndex;
        //sprite.style.transform = 'scaleX(1)';
    };

    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

/*

function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const sourceHud = document.getElementById('class-hud-panel');

    if (!sourceHud || !targetCard) {
        // If UI elements are missing, deal damage instantly
        _egDamageTargetById(targetId, EG_PLAYER_MELEE_DAMAGE);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the HUD renders on top during flight
    sourceHud.style.zIndex = '9999';

    const anim = sourceHud.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // Apex/Impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        sourceHud.style.zIndex = '';
    };

    // Damage fires at the animation midpoint to match visual impact[cite: 1]
    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

*/


//------------------------------------------------------------------------
//-------------------TARGETING--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the currently targeted monster object, or null if none.
function _egGetTarget() {
    if (!_egTargetId) return null;
    return _egMonsters.find(m => m.id === _egTargetId) || null;
}

// Sets the player's target to the given monster and refreshes the panel.
// Called by the onclick handler on monster cards in the rendered panel HTML.
function _egSelectTarget(monsterId) {
    if (!_egIsActive()) return;
    _egTargetId = monsterId;
    _egRenderPanel();
}

// Convenience wrapper — damages the currently selected target.
// Kept for any legacy callers that don't pass an explicit id.
function _egDamageTarget(amount) {
    _egDamageTargetById(_egTargetId, amount);
}


//------------------------------------------------------------------------
//-------------------DAMAGE APPLICATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies stat changes when a hit lands: reduces HP and pushes back charge.
function _egApplyHitToMonster(target, amount) {
    target.currentHP = Math.max(0, target.currentHP - amount);
    target.currentCharge = Math.max(0, target.currentCharge - EG_PLAYER_STATS.chargePushback);
}

// Applies incoming player damage to a specific monster by id.
// Handles boss immunity, stat changes, phase transitions, and kill detection.
// Called by the projectile onfinish callback so the impact matches visually.
function _egDamageTargetById(monsterId, amount) {
    if (!_egIsActive()) return;

    const target = _egMonsters.find(m => m.id === monsterId);
    if (!target) return;

    // Boss immunity window — ignore damage and show the immune flash
    if (target.bossImmune) {
        _egFlashImmune(target.id);
        return;
    }

    _egApplyHitToMonster(target, amount);
    _egShowDamageNumber(target.id, amount);
    _egFlashDamageCard(target.id);

    // Check for boss phase transition before checking death
    if (target.isBoss) _egBossCheckPhase(target);

    if (target.currentHP <= 0) {
        _egKillMonster(target.id);
        return;
    }

    _egUpdateBars();
}


// Applies incoming monster damage to the player, after dodge/armour/absorption
// mitigation. Returns the actual HP lost (0 if dodged/fully absorbed) so
// callers can show an accurate floating number.
function _egPlayerTakeDamage(amount) {
    if (!_egIsActive()) return 0;

    const stats = _egComputePlayerStats();

    const dodgeChance = Math.min(75, stats.dodgeChance + _egCalcEvasionDodgeChance(stats.evasion));
    if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
        showToast('💨 Dodged!');
        Audio_Manager.playSFX('player_dodge_attack');
        _egApplyPlayerMissFeedback();
        _egScheduleAbsorptionRegen();
        return 0;
    }

    let mitigated = _egCalcArmourMitigation(amount, stats.armour);

    if (_egPlayerAbsorptionCurrent > 0) {
        const absorbed = Math.min(_egPlayerAbsorptionCurrent, mitigated);
        _egPlayerAbsorptionCurrent -= absorbed;
        mitigated -= absorbed;
        Audio_Manager.playSFX('player_shield_damage_taken');
    }

    _egScheduleAbsorptionRegen();

    mitigated = Math.max(0, Math.round(mitigated));
    if (mitigated <= 0) return 0;

    playerCurrentHP = Math.max(0, playerCurrentHP - mitigated);
    _renderPlayerHealth();
    if (playerCurrentHP <= 0) _egGameOver();
    return mitigated;
}


//------------------------------------------------------------------------
//-------------------KILL HANDLING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Auto-selects the first remaining monster after a kill, or clears the target.
function _egUpdateTargetAfterKill() {
    if (_egMonsters.length > 0) {
        _egTargetId = _egMonsters[0].id;
    } else {
        _egTargetId = null;
        _egOnAllMonstersDead();
    }
}

// Shows the kill toast, depending on whether the total monster count is known.
function _egShowNormalKillToast(monsterName) {
    const req = _egGetMapRequirements();
    const total = req.totalMonsters;
    if (total > 0) {
        showToast(`⚔️ ${monsterName} defeated! (${_egChainKillCount}/${total})`);
    } else {
        showToast(`⚔️ ${monsterName} defeated!`);
    }
}

// Checks whether the boss kill threshold has been crossed and schedules the boss spawn.
// Only fires once per encounter (_egBossSpawned guards against duplicates).
function _egCheckAndTriggerBossSpawn() {
    const req = _egGetMapRequirements();
    const total = req.totalMonsters;
    const bossThreshold = total > 0 ? Math.floor(total / 2) : 0;

    if (req.hasBoss && !_egBossSpawned && bossThreshold > 0 && _egChainKillCount >= bossThreshold) {
        _egBossSpawned = true;
        setTimeout(() => {
            if (_egIsActive()) _egSpawnChainBoss();
        }, EG_BOSS_SPAWN_DELAY_MS);
    }
}

// Handles all post-kill logic for a normal (non-boss) monster death.
function _egHandleNormalMonsterKill(dying) {
    _egChainKillCount++;

    _egShowNormalKillToast(dying.name);
    _egUpdateObjectivesHUD();
    _egCheckAndTriggerBossSpawn();

    // Keep spawning regular monsters until the total kill count is reached
    const req = _egGetMapRequirements();
    const total = req.totalMonsters;
    const totalReached = total > 0 && _egChainKillCount >= total;
    if (!totalReached) _egScheduleRespawn();

    if (typeof _egSpawnLootDrop === 'function') _egSpawnLootDrop(false, dying.level);
    if (typeof _egTryDropCurrency === 'function') _egTryDropCurrency(false);
}

// Handles all post-kill logic for a boss monster death.
function _egHandleBossKill(dying) {
    showToast(`🏆 ${dying.name} defeated!`);
    _egUpdateObjectivesHUD();
    if (typeof _egSpawnLootDrop === 'function') _egSpawnLootDrop(true,dying.level);
}

// Removes a monster from the encounter after its death animation fires.
// Delegates to the appropriate normal or boss kill handler.
function _egKillMonster(monsterId) {
    const dying = _egMonsters.find(m => m.id === monsterId);
    _egBossCleanup(monsterId);
    _egFlashKillCard(monsterId);
    _egMonsters = _egMonsters.filter(m => m.id !== monsterId);

    _egUpdateTargetAfterKill();

    if (dying && !dying.isBoss) _egHandleNormalMonsterKill(dying);
    if (dying && dying.isBoss) _egHandleBossKill(dying);

    setTimeout(() => _egRenderPanel(), EG_PANEL_RERENDER_DELAY_MS);
}

// Called when the last monster in the encounter is killed.
// Currently intentionally empty — kill toasts handle all feedback.
function _egOnAllMonstersDead() { }

// Triggers the game-over sequence when the player's HP reaches zero.
function _egGameOver() {
    _egStopEncounter();
    dead = true;
    stopTimer();
    document.getElementById('lose-title').textContent = 'Game Over';
    document.getElementById('lose-sub').textContent = 'The monsters overwhelmed you!';
    Audio_Manager.playSFX('player_defeated');
    document.getElementById('ov-lose').classList.add('show');
}


//------------------------------------------------------------------------
//-------------------MONSTER SPAWNING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Picks a random zone from EG_MONSTER_ZONES and assigns it to the monster.
function _egAssignRandomSpawnZone(monster) {
    monster.zoneId = EG_MONSTER_ZONES[Math.floor(Math.random() * EG_MONSTER_ZONES.length)];
}

// Tries to build the monster from normal defs first, then boss defs as fallback.
// Marks the monster as a boss if it was built from EG_BOSS_DEFS.
function _egBuildMonsterOrBoss(defId, level) {
    let monster = _egBuildMonster(defId, level);
    if (!monster) {
        monster = _egBuildBoss(defId, level);
        if (monster) monster.isBoss = true;
    }
    return monster;
}

// Shows the appropriate arrival toast and initialises boss logic if needed.
function _egNotifyMonsterArrival(monster) {
    if (typeof showToast !== 'function') return;

    if (monster.isBoss) {
        showToast(`💀 BOSS: ${monster.name} has arrived!`);
        _egBossInit(monster);
    } else {
        showToast(`⚠️ ${monster.name} appeared!`);
    }
}

// Adds a monster to the live encounter.
// Assigns a random spawn zone, auto-targets if no target exists, and notifies the player.
function _egSpawnMonster(defId, level) {
    if (_egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return;

    const monster = _egBuildMonsterOrBoss(defId, level);
    if (!monster) return;

    _egAssignRandomSpawnZone(monster);
    _egMonsters.push(monster);

    if (!_egTargetId) _egTargetId = monster.id; // auto-target the first monster to arrive

    _egRenderPanel();
    _egNotifyMonsterArrival(monster);
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Appends a floating "-N" damage number to the monster's card that fades out.
function _egShowDamageNumber(monsterId, amount) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    const dmgText = document.createElement('div');
    dmgText.className = 'eg-damage-number';
    dmgText.textContent = `-${amount}`;
    card.appendChild(dmgText);
    setTimeout(() => dmgText.remove(), EG_DAMAGE_NUMBER_DURATION_MS);
}

// Removes and re-adds a CSS flash class to force the animation to restart.
// Works for any flash class on any card element.
function _egRestartFlashClass(card, cssClass) {
    card.classList.remove(cssClass);
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add(cssClass);
}

// Triggers the damage flash CSS animation on the monster's card.
function _egFlashDamageCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    _egRestartFlashClass(card, 'eg-flash-damage');
}

// Adds the kill flash class to the monster's card (plays the death animation).
function _egFlashKillCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (card) card.classList.add('eg-flash-kill');
}

// Shows the IMMUNE label and flashes the immunity animation on the monster's card.
function _egFlashImmune(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    _egRestartFlashClass(card, 'eg-flash-immune');
    setTimeout(() => card.classList.remove('eg-flash-immune'), EG_IMMUNE_FLASH_DURATION_MS);

    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-immune-label';
    label.textContent = 'IMMUNE';
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_IMMUNE_LABEL_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the CSS class for an HP bar based on the percentage remaining.
function _egHpBarClass(hpPct) {
    if (hpPct > 60) return 'eg-hp-high';
    if (hpPct > 30) return 'eg-hp-mid';
    return 'eg-hp-low';
}

// Builds the badge HTML for a monster's name row (level, boss phase, immune, target).
// NOTE: _egBuildMonsterBadgesHTML is kept for any external callers.
function _egBuildMonsterBadgesHTML(m, isTarget) {
    let html = `<span class="eg-level-badge">Lv ${m.level}</span>`;
    if (m.isBoss && m.bossPhase)
        html += `<span class="eg-boss-phase-badge eg-boss-phase-${m.bossPhase}">Phase ${m.bossPhase}</span>`;
    if (m.bossImmune)
        html += `<span class="eg-boss-immune-badge">IMMUNE</span>`;
    if (isTarget)
        html += `<span class="eg-target-badge">TARGET</span>`;
    return html;
}

// Calculates HP and charge percentages clamped to [0, 100] for a given monster.
function _egCalcBarPercentages(m) {
    return {
        hpPct: Math.max(0, Math.round((m.currentHP / m.maxHP) * 100)),
        chargePct: Math.min(100, Math.max(0, (m.currentCharge / m.chargeMax) * 100)),
    };
}

// Builds the compact emoji card HTML for a single monster.
function _egBuildMonsterCardHTML(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);
    const isTarget = (m.id === _egTargetId);

    return `
    <div class="eg-monster-card-compact" id="eg-card-${m.id}" onclick="_egSelectTarget('${m.id}')">

        <!-- Bars stacked top-to-bottom: Charge bar then HP bar above the icon -->
        <div class="eg-compact-bars">
            <div class="eg-charge-track-compact">
                <div class="eg-charge-bar" id="eg-charge-bar-${m.id}" style="width:${chargePct}%"></div>
            </div>
            <div class="eg-hp-track-compact">
                <div class="eg-hp-bar-compact" id="eg-hp-bar-${m.id}" style="width:${hpPct}%"></div>
            </div>
        </div>

        <!-- Emoji icon with level badge and hover tooltip -->
        <div class="eg-emoji-wrapper ${isTarget ? 'eg-compact-targeted' : ''}">
            <span class="eg-monster-emoji-compact">${m.emoji}</span>
            <span class="eg-level-bottom-left">${m.level}</span>

            <div class="eg-monster-compact-tooltip">
                <div class="eg-tooltip-name">${m.name}</div>
                <div class="eg-tooltip-hp" id="eg-hp-label-${m.id}">${m.currentHP} / ${m.maxHP} HP</div>
            </div>
        </div>

    </div>`;
}





// Updates the HP bar, charge bar, and HP label for a single monster.
// Cheap DOM update used by the 10Hz tick loop — no full rebuild.
function _egUpdateMonsterBars(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);

    const hpBar = document.getElementById(`eg-hp-bar-${m.id}`);
    const chargeBar = document.getElementById(`eg-charge-bar-${m.id}`);
    const hpLabel = document.getElementById(`eg-hp-label-${m.id}`);

    if (hpBar) { hpBar.style.width = hpPct + '%'; hpBar.className = `eg-hp-bar ${_egHpBarClass(hpPct)}`; }
    if (chargeBar) chargeBar.style.width = chargePct + '%';
    if (hpLabel) hpLabel.textContent = `${m.currentHP} / ${m.maxHP} HP`;
}

// High-frequency bar update (10Hz). Only touches bar widths and HP text —
// no DOM rebuilds. Keeps the tick loop cheap.
function _egUpdateBars() {
    if (!_egIsActive()) return;
    _egMonsters.forEach(_egUpdateMonsterBars);
}

// Clears all monster zone elements and hides the wrapper.
function _egHideMonsterPanel() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
    const wrapper = document.getElementById('eg-monster-wrapper');
    if (wrapper) wrapper.classList.add('eg-hidden');
}

// Clears the HTML content of every monster zone panel.
function _egClearAllZones() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
}

// Renders each monster's card into its assigned zone panel.
// Uses += so multiple monsters assigned to the same zone stack correctly.
function _egRenderMonstersIntoZones() {
    _egMonsters.forEach(m => {
        const zoneEl = document.getElementById(m.zoneId || 'eg-monster-panel');
        if (zoneEl) zoneEl.innerHTML += _egBuildMonsterCardHTML(m);
    });
}

// Full panel rebuild. Only called on spawn, death, or target change —
// never from the tick loop.
function _egRenderPanel() {
    const wrapper = document.getElementById('eg-monster-wrapper');

    if (!_egIsActive()) {
        _egClearAllZones();
        if (wrapper) wrapper.classList.add('eg-hidden');
        return;
    }

    if (wrapper) wrapper.classList.remove('eg-hidden');

    _egClearAllZones();
    _egRenderMonstersIntoZones();
}

