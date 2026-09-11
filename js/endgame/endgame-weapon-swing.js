//  endgame-weapon-swing.js
//  MANUAL WEAPON ATTACK (E) + shared CSS swing visuals.
//  Loads AFTER endgame-encounter.js, endgame-encounter-tick.js,
//  endgame-player-stats.js and sprite_animations.js (all globals are
//  typeof-guarded so load order is forgiving; behaviour only runs live).
//
//  WHY THIS EXISTS: the game has dozens of weapon base types (daggers,
//  swords, axes, maces, wands, staves, bows …) across three characters
//  and many classes. Animating every weapon for every character/class
//  combo would be an enormous art burden, so attacks are a single
//  character-agnostic CSS overlay anchored to the player avatar
//  (css/endgame/weapon-swing.css). The overlay is skinned per weapon
//  FAMILY — not per base item — and rotated toward the facing direction.
//
//  CONTROLS: E = manual attack (this file), parry (hold) lives on the
//  'eg-parry' keybind (R by default) in endgame-encounter-tick.js.
//------------------------------------------------------------------------
//-------------------WEAPON FAMILY RESOLUTION------------------------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
const EG_WEAPON_SWING_COOLDOWN_MS = 400;
let _egWeaponSwingLastAt = 0;

// Per-family visual lifetime (ms) — must cover the longest CSS keyframe
// in weapon-swing.css so the node is removed after the effect finishes.
const EG_WEAPON_SWING_DURATION_MS = {
    sword: 320, dagger: 260, axe: 400, mace: 420,
    wand: 360, staff: 480, bow: 340, unarmed: 280,
};

// Maps an equipped weapon item to one of the CSS families. Resolution is
// deliberately fuzzy (baseId prefix + icon + name keywords) so every
// current AND future base type — including the wpn_auto_* filler series —
// lands on a sensible visual without a per-item table.
function _egWeaponSwingFamily(item) {
    if (!item) return 'unarmed';
    if (item.slotType === 'ranged') return 'bow';
    const baseId = String(item.baseId || item.id || '');
    if (/^ranged/.test(baseId)) return 'bow';
    const icon = String(item.icon || '');
    const name = `${item.baseName || ''} ${item.name || ''}`.toLowerCase();
    const has = (...words) => words.some((w) => name.includes(w));

    // Icon is the strongest signal (set per base type in base-items.js).
    if (icon === '🪓' || has('axe', 'axt', 'worldsplitter')) return 'axe';
    if (icon === '🔨' || has('maul', 'hammer', 'mace', 'mauls', 'worldbreaker')) return 'mace';
    if (icon === '🦯' || has('staff', 'staves', 'warstaff', 'stab der', 'echoes')) return 'staff';
    if (icon === '🪄' || has('wand', 'sceptre', 'scepter', 'rod', 'zauberstab', 'zepter', 'arcane rod')) return 'wand';
    if (icon === '🗡️' || /^wpn_agi/.test(baseId) || has('dagger', 'dolch', 'baselard', 'rapier', 'stiletto', 'misericorde', 'nightfang', 'heartseeker', 'fang of', 'swift fang')) return 'dagger';
    // Default: swords (covers wpn_1h_*, wpn_2h_* greatswords, ⚔️, auto Battle Blades).
    return 'sword';
}

// Returns { item, family, hands, label } for the currently equipped melee
// weapon (weapon slot). Falls back to the ranged bow, then unarmed.
function _egGetEquippedWeaponInfo() {
    let item = null;
    try {
        if (typeof _egGetAllEquippedItems === 'function') {
            const all = _egGetAllEquippedItems() || [];
            item = all.find((it) => it && it.slotType === 'weapon')
                || all.find((it) => it && it.slotType === 'ranged')
                || null;
        }
    } catch (e) { item = null; }
    const family = _egWeaponSwingFamily(item);
    const hands = (item && item.hands === 2) ? 2 : 1;
    const label = item ? (item.baseName || item.name || '') : '';
    return { item, family, hands, label };
}


//------------------------------------------------------------------------
//-------------------FACING------------------------------------------------
//------------------------------------------------------------------------

// The direction the avatar is currently facing. Movement writes it to the
// walk loop (_lastFacingDir / _walkState.dirName in sprite_animations.js);
// idle keeps the last travel direction, so a standing player still attacks
// toward where they last walked. Falls back to 'down'.
function _egGetAttackFacing() {
    const ok = (d) => d === 'up' || d === 'down' || d === 'left' || d === 'right';
    try { if (typeof _lastFacingDir === 'string' && ok(_lastFacingDir)) return _lastFacingDir; } catch (e) {}
    try { if (typeof _walkState !== 'undefined' && _walkState && ok(_walkState.dirName)) return _walkState.dirName; } catch (e) {}
    return 'down';
}

// Facing implied by a screen-space vector (used so AUTO-attacks aim the
// swing at the targeted monster card instead of the movement facing).
function _egFacingFromVector(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
}


//------------------------------------------------------------------------
//-------------------SWING VISUAL------------------------------------------
//------------------------------------------------------------------------

// Spawns the family-skinned CSS overlay on the avatar, rotated toward
// `facing`. Character-agnostic: no sprite art is touched, so every
// character/class combo shares the same effect. No-op without an avatar.
function _egShowWeaponSwing(family, facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) return;
    const fam = EG_WEAPON_SWING_DURATION_MS[family] != null ? family : 'sword';
    const dir = (facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right')
        ? facing : 'down';
    let heavy = false;
    try { heavy = _egGetEquippedWeaponInfo().hands === 2; } catch (e) {}

    const el = document.createElement('div');
    el.className = `eg-weapon-swing eg-swing-${fam} eg-dir-${dir}${heavy ? ' eg-heavy' : ''}`;
    el.innerHTML = '<div class="egw-rot"><div class="egw-part egw-arc"></div><div class="egw-part egw-blade"></div></div>';
    avatar.appendChild(el);
    const lifetime = (EG_WEAPON_SWING_DURATION_MS[fam] || 320) + 60;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, lifetime);
}

// Small hop toward `facing` so the swing has weight. Uses WAAPI on the
// wrapper (coexists with the auto-attack lunge, which animates later).
function _egWeaponSwingHop(facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar || typeof avatar.animate !== 'function') return;
    const d = 14;
    const vec = facing === 'up' ? [0, -d] : facing === 'down' ? [0, d]
        : facing === 'left' ? [-d, 0] : [d, 0];
    try {
        avatar.animate([
            { transform: 'translate(0px, 0px)' },
            { transform: `translate(${vec[0]}px, ${vec[1]}px)` },
            { transform: 'translate(0px, 0px)' },
        ], { duration: 180, easing: 'ease-out' });
    } catch (e) {}
}

// Best-effort swing sound from already-registered SFX (no new assets).
function _egWeaponSwingSound(family) {
    try {
        if (typeof Audio_Manager === 'undefined' || !Audio_Manager.playSFX) return;
        const sfx = family === 'wand' || family === 'staff' ? 'arcaneReveal'
            : family === 'mace' ? 'bump_thwack'
            : family === 'bow' ? 'precisionMark'
            : 'cleave';
        Audio_Manager.playSFX(sfx);
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------MANUAL ATTACK (E)-------------------------------------
//------------------------------------------------------------------------

// Manual weapon attack: directional CSS swing + hop, damage through the
// standard melee channel against the CURRENT target (same damage, cleave,
// accuracy and reflect rules as auto-attacks). Without a target the swing
// still plays as a whiff — the visual never depends on combat state.
function _egDoWeaponAttack() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
    if (document.querySelector('.modal-bg.show')) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - _egWeaponSwingLastAt < EG_WEAPON_SWING_COOLDOWN_MS) return;
    _egWeaponSwingLastAt = now;

    const { family } = _egGetEquippedWeaponInfo();
    const facing = _egGetAttackFacing();
    _egShowWeaponSwing(family, facing);
    _egWeaponSwingHop(facing);
    _egWeaponSwingSound(family);

    // Damage at swing impact (matches the visual mid-point).
    setTimeout(() => {
        try {
            if (typeof _egIsActive === 'function' && !_egIsActive()) return;
            if (typeof dead !== 'undefined' && dead) return;
            if (typeof _egTargetId === 'undefined' || !_egTargetId) return;
            if (typeof _egApplyPlayerMeleeImpact === 'function') _egApplyPlayerMeleeImpact(_egTargetId);
        } catch (e) {}
    }, Math.max(80, Math.round((EG_WEAPON_SWING_DURATION_MS[family] || 320) / 2)));
}

function _initEgWeaponAttackHotkey() {
    if (typeof onKeybindAction === 'function') {
        onKeybindAction('eg-attack', () => {
            _egDoWeaponAttack();
            return false;
        });
    } else {
        // Fallback if the keybind system loads later/never: plain E key.
        document.addEventListener('keydown', (e) => {
            if (!e || e.repeat) return;
            if ((e.key || '').toLowerCase() !== 'e') return;
            _egDoWeaponAttack();
        });
    }
}
_initEgWeaponAttackHotkey();
