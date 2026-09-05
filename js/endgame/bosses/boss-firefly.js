//------------------------------------------------------------------------
//-------------------BOSS: THE FIREFLY (boss_firefly)---------------------
//------------------------------------------------------------------------
// The Firefly is an arena-light survival puzzle. The whole screen drowns in
// darkness; the player's five fairies are the only light sources — and the
// darkness itself is the enemy: stand outside every fairy's light and the
// dark gnaws you HEAVILY. The swarm is commanded like RTS units: press the
// Special Ability key (F by default) to send the selected fairy to the
// mouse cursor, or simply drag a fairy with the mouse. Fairies that cluster
// overlap their glow — the more that stack, the bigger the safe pool —
// while formation trials force the swarm to spread out.
//
// Between trials the boss fights back directly: LUMEN BURSTS. A bright
// tell blooms somewhere on the grid (~2s), then detonates — searing the
// keeper if she stands inside and chipping every fairy caught in the blast
// (three hits fell a fairy). Bursts aim at the keeper herself and at the
// biggest fairy cluster, so the answer is to keep moving AND keep the swarm
// spread. Trials cancel pending bursts (a set-piece owns the screen).
//
// Formation trials (per intended design):
//   75% HP → LIGHTFALL — all 5 fairies + the keeper in one shared position
//            (10s to gather)
//   50% HP → SPLIT — 2 groups of fairies, keeper in a third position (15s)
//   25% HP → SCATTER — every fairy in its own position, keeper in the 5th
//            (20s)
// Circles are QUOTA-based ("3× fairies"), never per-number — any fairy can
// fill any slot, and greedy nearest-assignment decides the verdict.
//
// Commanding: F sends the SELECTED fairy to the cursor; G cycles which
// fairy is selected (with a flash so the eye catches the hand-off); H
// recalls ALL fairies to the keeper's orbit; dragging does F and recall
// at once. Aiming F at the keeper recalls just that one fairy.
// Fail any placement and that fairy is LOST from the swarm (60s respawn),
// plus the burst damages the keeper.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + onInit + trial phase hook)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_firefly: {
        id: 'boss_firefly', name: 'The Firefly', emoji: '✨', baseHP: 880,
        baseDamage: 19, chargeMax: 13, element: 'lightning',
        resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_firefly: {
        phases: [
            { threshold: 1, chargeMax: 13, damageMultiplier: 1 },
            { threshold: .75, chargeMax: 11, damageMultiplier: 1.25 },
            { threshold: .50, chargeMax: 9, damageMultiplier: 1.5 },
            { threshold: .25, chargeMax: 7, damageMultiplier: 1.75 },
        ],
        immunityDuration: 0, mechanics: [], onInit: _egFireflyStart,
        // Each phase threshold opens its formation trial (75/50/25%). The
        // trial owns the immunity window: _egFireflyResolveTrial releases
        // the boss once the verdict is in.
        onPhaseEnter(monster, phase) { _egFireflyStartTrial(monster, phase); return true; }
    },
});

// ── Tuning ────────────────────────────────────────────────────────────────
const EG_FIREFLY_COUNT = 5;        // the swarm — permanently flying around the keeper
const EG_FIREFLY_MAX_HP = 3;       // restored on respawn (fairies die outright to trial fails)
const EG_FIREFLY_RESPAWN_MS = 60000;  // lost lights return after one minute
// Fairy names so the keeper can tell the swarm apart — shown on the sprites
// and used in every message that mentions a light.
const EG_FIREFLY_NAMES = ['Lumina', 'Faye', 'Glimmer', 'Willow', 'Twila'];
function _egFireflyName(i) {
    let list = null;
    try { const raw = t('eg_ff_names'); if (raw && raw !== 'eg_ff_names') list = raw.split(',').map(s => s.trim()); } catch (e) {}
    const names = (list && list.length >= EG_FIREFLY_COUNT) ? list : EG_FIREFLY_NAMES;
    return names[i % names.length];
}
const EG_FIREFLY_ORBIT_SPEED = 180;   // px/s while orbiting the keeper
const EG_FIREFLY_FLY_SPEED = 430;    // px/s on a commanded flight
// Darkness damage: the real threat — the keeper takes heavy ticking damage
// while NO living fairy's light reaches them. Inside light you are simply
// safe (fairies never hurt their keeper); straying into the dark to fill a
// cell is the actual risk, and the veil pulses as a damage tell.
const EG_FIREFLY_DARK_PCT = 0.03;    // % maxHP/s while fully outside the light
// Lumen Burst (the boss's direct attack between trials):
const EG_FIREFLY_BURST_TELL_MS = 2000;   // tell bloom → detonation
const EG_FIREFLY_BURST_R = 130;          // detonation radius (keeper + fairies)
const EG_FIREFLY_BURST_PLAYER_PCT = 0.10; // % maxHP when caught inside
const EG_FIREFLY_BURST_CHIP = 1;         // fairy HP per burst (3 = fallen)
// Burst cadence per boss phase (1–4), lerped between pairs [phase, ms].
const EG_FIREFLY_BURST_CADENCE = [0, 5200, 4300, 3400]; // 0 = phase 1 is safe
const EG_FIREFLY_BURST_TWINS = 2;        // simultaneous bursts in phase 4
const EG_FIREFLY_HOLE_R = 150;       // fully lit radius in the darkness mask
const EG_FIREFLY_FEATHER_R = 235;    // feathered falloff radius beyond that
// Graduated cluster bonus: every EXTRA fairy inside another's radius widens
// that fairy's mask hole by this much — 2 huddled fairies light visibly
// more than one, 3 more than 2, up to the full 5-stack. Both the mask hole
// and the visible halo div grow, so pool size always tells the truth.
const EG_FIREFLY_CLUSTER_BONUS_R = 55;
// Fairy emblems — the fairy trio 🧚‍♀️🧚🧚‍♂️, cycled across the five fairies
// (Lumina ♀, Faye neutral, Glimmer ♂, Willow ♀, Twila neutral) so the swarm
// reads as individual sprites rather than five copies of one glyph.
const EG_FIREFLY_EMOJIS = ['🧚‍♀️', '🧚', '🧚‍♂️'];
// Trial placement tolerance (px) + per-fail burst penalties.
const EG_FIREFLY_TRIAL_TOL = 80;
const EG_FIREFLY_FAIL_PLAYER_PCT = 0.06;  // burst when the keeper misses their circle
const EG_FIREFLY_FAIL_LIGHT_PCT = 0.015;  // burst per light that missed its mark

const _egFireflyRuns = new Map();
let _egFireflyMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
document.addEventListener('mousemove', e => { _egFireflyMouse = { x: e.clientX, y: e.clientY }; }, { passive: true });

// Local template fills: {key} → Special Ability 1, {cycle} → Special
// Ability 2, {recall} → Special Ability 3, {n}/{s} → numeric values.
// (_egNkToast only knows {n} baked into the fallback; these need the
// LIVE keybind label.)
function _egFireflyText(key, fallback, vals) {
    let msg = fallback;
    try { const raw = t(key); if (raw && raw !== key) msg = raw; } catch (e) {}
    if (vals) {
        if (vals.key) msg = msg.replace(/\{key\}/g, vals.key);
        if (vals.cycle) msg = msg.replace(/\{cycle\}/g, vals.cycle);
        if (vals.recall) msg = msg.replace(/\{recall\}/g, vals.recall);
        if (vals.name) msg = msg.replace(/\{name\}/g, vals.name);
        if (vals.names) msg = msg.replace(/\{names\}/g, vals.names);
        if (vals.n != null) msg = msg.replace(/\{n\}/g, String(vals.n));
        if (vals.s != null) msg = msg.replace(/\{s\}/g, String(vals.s));
    }
    return msg;
}
function _egFireflyToast(key, fallback, vals) {
    if (typeof showToast !== 'function') return;
    showToast(_egFireflyText(key, fallback, vals));
}

// ── Fight setup ───────────────────────────────────────────────────────────

function _egFireflyStart(monster) {
    _egFireflyTeardown(monster.id);
    const darkness = document.createElement('div'); darkness.className = 'eg-firefly-darkness'; document.body.appendChild(darkness);
    // The mask punches genuine transparent holes through the darkness. A
    // coloured glow alone cannot reveal the grid beneath an opaque overlay.
    const svgNs = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNs, 'svg');
    const maskId = `eg-firefly-mask-${monster.id}`, defs = document.createElementNS(svgNs, 'defs');
    const mask = document.createElementNS(svgNs, 'mask'); mask.id = maskId; mask.setAttribute('maskUnits', 'userSpaceOnUse');
    const maskBase = document.createElementNS(svgNs, 'rect'); maskBase.setAttribute('fill', 'white'); mask.appendChild(maskBase);
    const veil = document.createElementNS(svgNs, 'rect'); veil.setAttribute('fill', '#000'); veil.setAttribute('mask', `url(#${maskId})`);
    defs.appendChild(mask); svg.append(defs, veil); darkness.appendChild(svg);
    const respawnStatus = document.createElement('div'); respawnStatus.className = 'eg-firefly-respawn'; document.body.appendChild(respawnStatus);

    const run = {
        monsterId: monster.id, darkness, svg, maskBase, veil, respawnStatus,
        controls: null, flies: [], selected: 0, trial: null, raf: null,
        last: performance.now(), drag: null, frame: 0, darkTick: 0,
        bursts: [], burstTimer: null,
    };

    // Five fairies, numbered 1–5 (number badges + selection key tag). Each
    // carries her own emblem so the keeper can tell the swarm apart at a
    // glance even before reading the name tags.
    for (let i = 0; i < EG_FIREFLY_COUNT; i++) {
        const el = document.createElement('div');
        el.className = 'eg-nk-firefly';
        // The emoji lives in an inner wrapper: flash/pulse animations scale
        // the INNER element so they can never clobber the root's inline
        // translate (animating transform on the root teleports the sprite
        // to the top-left corner for the animation's duration).
        const glyph = document.createElement('span'); glyph.className = 'eg-firefly-glyph'; glyph.textContent = EG_FIREFLY_EMOJIS[i % EG_FIREFLY_EMOJIS.length]; el.appendChild(glyph);
        const badge = document.createElement('span'); badge.className = 'eg-firefly-badge'; badge.textContent = i + 1; el.appendChild(badge);
        // Key tag: shows the LIVE command key on whichever light is selected,
        // so "which one is targeted" and "what do I press" are the same visual.
        const keytag = document.createElement('span'); keytag.className = 'eg-firefly-keytag'; el.appendChild(keytag);
        // Fairy name under the sprite: constant identification for the swarm.
        const nametag = document.createElement('span'); nametag.className = 'eg-firefly-name'; nametag.textContent = _egFireflyName(i); el.appendChild(nametag);
        const light = document.createElement('div'); light.className = 'eg-firefly-light';
        // The sprite is the drag handle; the light halo stays non-interactive.
        el.addEventListener('pointerdown', e => _egFireflyDragStart(e, run, i));
        document.body.append(light, el);
        const feather = document.createElementNS(svgNs, 'circle'); feather.setAttribute('fill', 'black'); feather.setAttribute('opacity', '.35');
        const hole = document.createElementNS(svgNs, 'circle'); hole.setAttribute('fill', 'black');
        mask.append(feather, hole);
        run.flies.push({ el, light, feather, hole, keytag, nametag, x: 0, y: 0, target: null, hp: EG_FIREFLY_MAX_HP, respawnAt: 0, wobble: i * 1.57 });
    }

    _egFireflyRuns.set(monster.id, run);
    run.raf = requestAnimationFrame(_egFireflyTick);

    // Settle the swarm around the keeper before the intro toast fires.
    const center = _egNkPlayerCenter();
    if (center) run.flies.forEach(f => { f.x = center.x; f.y = center.y; });

    const keyLabel = (typeof keybindDisplayLabel === 'function')
        ? keybindDisplayLabel(keybindKeyFor('eg-special')) : 'F';
    const cycleLabel = (typeof keybindDisplayLabel === 'function')
        ? keybindDisplayLabel(keybindKeyFor('eg-special-2')) : 'G';
    const recallLabel = (typeof keybindDisplayLabel === 'function')
        ? keybindDisplayLabel(keybindKeyFor('eg-special-3')) : 'H';
    run.keyLabel = keyLabel;
    run.flies.forEach(f => { f.keytag.textContent = keyLabel; });
    _egFireflyToast('eg_ff_intro',
        '✨ The Firefly: command your fairies — they are your only lanterns! {key} sends a fairy to your cursor, {cycle} picks another fairy, {recall} recalls the whole swarm — or simply drag one!',
        { key: keyLabel, cycle: cycleLabel, recall: recallLabel });

    // Control guide banner: how to command the swarm, shown on level load
    // and kept up until teardown (rebinding mid-fight re-renders the text
    // on the refresh timer below, so the labels always stay honest).
    const controls = document.createElement('div');
    controls.className = 'eg-firefly-controls';
    controls.textContent = _egFireflyText('eg_ff_controls',
        '✨ [{key}] Send Fairy · [{cycle}] Cycle Fairy · [{recall}] Recall Fairies · [Drag] Move Fairy',
        { key: keyLabel, cycle: cycleLabel, recall: recallLabel });
    document.body.appendChild(controls);
    run.controls = controls;
}

// ── Per-frame tick ────────────────────────────────────────────────────────

function _egFireflyTick(now) {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run) return;
    const dt = Math.min(.05, (now - run.last) / 1000);
    run.last = now;
    const monster = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(m => m && m.id === run.monsterId) : null;
    if (!monster) { _egFireflyTeardown(run.monsterId); return; }
    const center = _egNkPlayerCenter();
    const aliveFlies = run.flies.filter(f => f.hp > 0);

    run.flies.forEach((fly, i) => {
        if (fly.hp <= 0) {
            if (fly.respawnAt && now >= fly.respawnAt) {
                fly.hp = EG_FIREFLY_MAX_HP; fly.respawnAt = 0; fly.target = null;
                if (center) { fly.x = center.x; fly.y = center.y; }
                fly.el.classList.remove('eg-firefly-hurt'); document.body.append(fly.light, fly.el);
                _egFireflyToast('eg_ff_return', '✨ {name} has returned to the swarm!', { name: _egFireflyName(i) });
            } else return;
        }

        if (run.drag && run.drag.fly === fly) {
            // Dragged fairy follows the cursor exactly.
            fly.x = _egFireflyMouse.x; fly.y = _egFireflyMouse.y;
        } else {
            // Idle fairies orbit the keeper; dispatched fairies fly to their post.
            const orbit = center && fly.target == null
                ? { x: center.x + Math.cos(now / 650 + fly.wobble) * 68, y: center.y + Math.sin(now / 720 + fly.wobble) * 52 }
                : fly.target;
            if (orbit) {
                const dx = orbit.x - fly.x, dy = orbit.y - fly.y, d = Math.hypot(dx, dy) || 1;
                const step = Math.min(d, (fly.target ? EG_FIREFLY_FLY_SPEED : EG_FIREFLY_ORBIT_SPEED) * dt);
                fly.x += dx / d * step;
                fly.y += dy / d * step;
            }
        }

        fly.el.style.transform = `translate(${Math.round(fly.x - 15)}px,${Math.round(fly.y - 15)}px)`;
        fly.el.classList.toggle('eg-firefly-dragging', !!(run.drag && run.drag.fly === fly));
        fly.light.style.left = `${fly.x}px`; fly.light.style.top = `${fly.y}px`;
        fly.el.classList.toggle('eg-firefly-selected', i === run.selected);
        // Keep the selected fairy's key tag honest if the bind changes.
        if (i === run.selected && fly.keytag.textContent !== run.keyLabel) fly.keytag.textContent = run.keyLabel;
        // Clustered tint: a neighbour inside this fairy's radius means the
        // glows merge — tint the sprite so pairing up reads at a glance.
        fly.el.classList.toggle('eg-firefly-clustered',
            fly.hp > 0 && aliveFlies.some(o => o !== fly && Math.hypot(o.x - fly.x, o.y - fly.y) < EG_FIREFLY_HOLE_R));
    });

    // Graduated illumination: size each halo by how many living fairies are
    // huddled with it (1 → base, each extra neighbour +1 step). The mask
    // holes get the same radii in PaintMask, so pool size always tells the
    // truth. Divisors shape the curve: a pair already gains ~3/4 of a step.
    aliveFlies.forEach(fly => {
        const neighbours = aliveFlies.filter(o => o !== fly && Math.hypot(o.x - fly.x, o.y - fly.y) < EG_FIREFLY_HOLE_R).length;
        const r = EG_FIREFLY_HOLE_R + EG_FIREFLY_CLUSTER_BONUS_R * neighbours / (EG_FIREFLY_COUNT - 1) * 1.75;
        const size = Math.max(160, Math.round(r * 2.35));
        const half = Math.round(size / 2);
        const s = fly.light.style;
        if (s.width !== `${size}px`) { s.width = s.height = `${size}px`; s.margin = `-${half}px 0 0 -${half}px`; }
        fly.light.style.left = `${fly.x}px`; fly.light.style.top = `${fly.y}px`;
    });

    // The dark itself is the enemy: while NO living fairy's light reaches
    // the keeper, it gnaws — heavy, ticking, and telegraphed by a pulsing
    // vignette. Inside any light (full radius OR feathered falloff) you are
    // simply safe; fairies never hurt their own keeper.
    if (center) {
        const lit = aliveFlies.some(fly => Math.hypot(center.x - fly.x, center.y - fly.y) <= EG_FIREFLY_FEATHER_R);
        run.darkness.classList.toggle('eg-firefly-dark-danger', !lit);
        if (!lit && performance.now() - run.darkTick >= 1000) {
            run.darkTick = performance.now();
            _egNkHit(EG_FIREFLY_DARK_PCT, 'shadow', monster.level);
        }
    }

    // Direct pressure: keep the Lumen Burst cadence alive between trials.
    if (!run.trial && !run.burstTimer && !run.bursts.length) _egFireflyBurstSchedule(run, monster);

    if (!run.drag && (!run.flies[run.selected] || run.flies[run.selected].hp <= 0)) {
        const next = run.flies.findIndex(fly => fly.hp > 0);
        if (next >= 0) run.selected = next;
    }

    const missing = run.flies.map((fly, i) => fly.hp <= 0 && fly.respawnAt
        ? _egFireflyText('eg_ff_respawn_entry', '{name}: {s}s', { name: _egFireflyName(i), s: Math.max(0, Math.ceil((fly.respawnAt - now) / 1000)) })
        : '').filter(Boolean);
    run.respawnStatus.textContent = missing.length
        ? ((t('eg_ff_respawn_bar') || '✦ LIGHT LOST — RESPAWNING: ') + missing.join('  ·  '))
        : '';
    run.respawnStatus.classList.toggle('eg-firefly-respawn-visible', missing.length > 0);

    // Live trial feedback: markers turn green as their quota fills (the
    // YOU circle once the keeper stands in it). Quota check every 5 frames
    // — greedy assignment on 5 flies is trivially cheap, but no need at
    // full frame rate.
    run.frame++;
    // Refresh the command-key labels occasionally (rebinds mid-fight).
    if (run.frame % 60 === 0) {
        const kl = (typeof keybindDisplayLabel === 'function')
            ? keybindDisplayLabel(keybindKeyFor('eg-special')) : 'F';
        run.keyLabel = kl;
        if (run.controls) {
            const cl = (typeof keybindDisplayLabel === 'function')
                ? keybindDisplayLabel(keybindKeyFor('eg-special-2')) : 'G';
            const rl = (typeof keybindDisplayLabel === 'function')
                ? keybindDisplayLabel(keybindKeyFor('eg-special-3')) : 'H';
            run.controls.textContent = _egFireflyText('eg_ff_controls',
                '✨ [{key}] Send Fairy · [{cycle}] Cycle Fairy · [{recall}] Recall Fairies · [Drag] Move Fairy',
                { key: kl, cycle: cl, recall: rl });
        }
    }
    if (run.trial && run.frame % 5 === 0) {
        const trial = run.trial;
        const assignment = _egFireflyAssignToCircles(run, trial);
        const fill = trial.circles.map(() => 0);
        assignment.forEach(ci => { if (ci >= 0) fill[ci]++; });
        trial.els.forEach((el, i) => {
            const ok = i < trial.circles.length
                ? fill[i] >= trial.circles[i].quota
                : _egBlastHudInZone({ ...trial.targets[i], radius: EG_FIREFLY_TRIAL_TOL + 12 });
            el.classList.toggle('eg-firefly-target-ok', ok);
        });
    }

    _egFireflyPaintMask(run);
    run.raf = requestAnimationFrame(_egFireflyTick);
}

// ── Darkness mask ─────────────────────────────────────────────────────────

function _egFireflyPaintMask(run) {
    const w = window.innerWidth, h = window.innerHeight;
    run.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    run.maskBase.setAttribute('width', w); run.maskBase.setAttribute('height', h);
    run.veil.setAttribute('width', w); run.veil.setAttribute('height', h);
    const alive = run.flies.filter(f => f.hp > 0);
    run.flies.forEach(fly => {
        const on = fly.hp > 0;
        // Graduated cluster bonus — the same radius the tick computes for
        // the halo div: 1 fairy lights her base pool, each extra huddled
        // fairy adds a full step, so 2 / 3 / 4 / 5 stacks light visibly
        // larger and larger pools.
        let r = 0;
        if (on) {
            const neighbours = alive.filter(o => o !== fly && Math.hypot(o.x - fly.x, o.y - fly.y) < EG_FIREFLY_HOLE_R).length;
            r = EG_FIREFLY_HOLE_R + EG_FIREFLY_CLUSTER_BONUS_R * neighbours / (EG_FIREFLY_COUNT - 1) * 1.75;
        }
        fly.feather.setAttribute('cx', fly.x); fly.feather.setAttribute('cy', fly.y); fly.feather.setAttribute('r', EG_FIREFLY_FEATHER_R * (on ? 1 : 0));
        fly.hole.setAttribute('cx', fly.x); fly.hole.setAttribute('cy', fly.y); fly.hole.setAttribute('r', r);
    });
}

// ── Commanding: F key + drag & drop ───────────────────────────────────────

function _egFireflyCommand() {
    // Formation trials are precisely when rapid commands matter most.
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !_egIsActive()) return;
    const fly = run.flies[run.selected];
    if (!fly || fly.hp <= 0) return;
    const player = _egNkPlayerCenter();
    // Aim at the keeper's sprite to recall a fairy to its orbit; otherwise
    // station it at the cursor.
    if (player && Math.hypot(player.x - _egFireflyMouse.x, player.y - _egFireflyMouse.y) < 75) {
        if (fly.target != null) {
            fly.target = null; // back to the keeper's orbit
            _egFireflyToast('eg_ff_recalled', '✨ {name} circles you again.', { name: _egFireflyName(run.selected) });
        }
        return false;
    }
    fly.target = { ..._egFireflyMouse };
    return false;
}
if (typeof onKeybindAction === 'function') onKeybindAction('eg-special', _egFireflyCommand);

// G (rebindable — "Endgame Special Ability 2", reserved channel): cycles
// WHICH fairy the F command controls. The hand-off gets a short flash so
// the eye catches which fairy just became targeted even mid-trial.
function _egFireflyCycle() {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !_egIsActive()) return;
    // Skip fairies that are down; wrap until a living fairy is found.
    for (let n = 1; n <= run.flies.length; n++) {
        const next = (run.selected + n) % run.flies.length;
        if (run.flies[next].hp > 0) {
            run.selected = next;
            const fly = run.flies[next];
            if (fly._flashTimer) clearTimeout(fly._flashTimer);
            fly.el.classList.remove('eg-firefly-flash');
            void fly.el.offsetWidth; // restart the animation from a clean state
            fly.el.classList.add('eg-firefly-flash');
            fly._flashTimer = setTimeout(() => fly.el.classList.remove('eg-firefly-flash'), 650);
            break;
        }
    }
    return false;
}
if (typeof onKeybindAction === 'function') onKeybindAction('eg-special-2', _egFireflyCycle);

// H (rebindable — "Endgame Special Ability 3", reserved channel): recalls
// the WHOLE swarm — every stationed fairy drops its target and resumes its
// orbit around the keeper. The go-to panic button when the light gets thin
// or a burst is about to land on a far-flung cluster.
function _egFireflyRecallAll() {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !_egIsActive()) return;
    let recalled = 0, lastName = '';
    run.flies.forEach((fly, i) => {
        if (fly.hp <= 0) return;
        if (fly.target != null) {
            fly.target = null; // back to the keeper's orbit
            fly.el.classList.remove('eg-firefly-flash');
            void fly.el.offsetWidth; // restart the flash from a clean state
            fly.el.classList.add('eg-firefly-flash');
            if (fly._flashTimer) clearTimeout(fly._flashTimer);
            fly._flashTimer = setTimeout(() => fly.el.classList.remove('eg-firefly-flash'), 650);
            recalled++;
            lastName = _egFireflyName(i);
        }
    });
    // Only surface a toast when something actually changed — pressing H
    // with nobody stationed shouldn't spam the log. One fairy reuses the
    // single recall message; several get a count summary.
    if (recalled === 1) {
        _egFireflyToast('eg_ff_recalled', '✨ {name} circles you again.', { name: lastName });
    } else if (recalled > 1) {
        _egFireflyToast('eg_ff_recalled_all', '✨ {n} fairies circle you again.', { n: recalled });
    }
    return false;
}
if (typeof onKeybindAction === 'function') onKeybindAction('eg-special-3', _egFireflyRecallAll);

function _egFireflyDragStart(e, run, index) {
    if (e.button !== 0) return;
    const fly = run.flies[index];
    if (!fly || fly.hp <= 0) return;
    e.preventDefault();
    e.stopPropagation(); // keep the board from starting a paint stroke
    run.drag = { fly: index };
    run.selected = index;
    // Capture the pointer so the release ALWAYS reaches us, even if the
    // cursor leaves the window mid-drag.
    try { fly.el.setPointerCapture(e.pointerId); } catch (err) {}
    document.body.classList.add('eg-firefly-drag-cursor');
    try { document.getElementById('board').style.cursor = 'grabbing'; } catch (err) {}
}

// Document-level listeners are installed once (module scope, not per-run):
// without a run they are cheap no-ops.
document.addEventListener('pointermove', e => {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !run.drag) return;
    // Track the cursor HERE: preventDefault() on pointermove suppresses the
    // compatibility mousemove event that _egFireflyMouse would otherwise
    // receive, so without this the dragged light freezes at its grab point.
    _egFireflyMouse = { x: e.clientX, y: e.clientY };
    e.preventDefault();
}, { passive: false });

document.addEventListener('pointerup', e => {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !run.drag) return;
    const fly = run.flies[run.drag.fly];
    if (fly && fly.hp > 0) {
        // Dropping on the keeper's sprite recalls the fairy to its orbit,
        // matching the F-key behavior.
        const player = _egNkPlayerCenter();
        if (player && Math.hypot(player.x - _egFireflyMouse.x, player.y - _egFireflyMouse.y) < 75) {
            fly.target = null;
            _egFireflyToast('eg_ff_recalled', '✨ {name} circles you again.', { name: _egFireflyName(run.drag.fly) });
        } else {
            fly.target = { x: _egFireflyMouse.x, y: _egFireflyMouse.y };
            _egFireflyToast('eg_ff_stationed', '✨ {name} holds position there.', { name: _egFireflyName(run.drag.fly) });
        }
    }
    run.drag = null;
    document.body.classList.remove('eg-firefly-drag-cursor');
    try { const b = document.getElementById('board'); if (b) b.style.cursor = ''; } catch (err) {}
    e.preventDefault();
    e.stopPropagation();
}, { capture: true });

// Alt-tab, incoming call, missed capture — any lost pointer ends the drag
// so a light never stays glued to the cursor.
document.addEventListener('pointercancel', () => {
    const run = Array.from(_egFireflyRuns.values())[0];
    if (!run || !run.drag) return;
    run.drag = null;
    document.body.classList.remove('eg-firefly-drag-cursor');
    try { const b = document.getElementById('board'); if (b) b.style.cursor = ''; } catch (err) {}
});

// ── Lumen Burst (the boss's direct attack between trials) ──────────────

// Current attack phase from boss HP thresholds (mirrors the 75/50/25 rows).
function _egFireflyBurstPhase(monster) {
    const pct = monster.maxHP > 0 ? monster.currentHP / monster.maxHP : 1;
    if (pct <= .25) return 4;
    if (pct <= .50) return 3;
    if (pct <= .75) return 2;
    return 1;
}

function _egFireflyBurstRemove(run, burst) {
    try { burst.tell.remove(); } catch (e) {}
    try { burst.boom.remove(); } catch (e) {}
    if (burst.timer) clearTimeout(burst.timer);
}

// Schedule the next burst wave. Phase 1 (above 75%) is calm; from phase 2
// on the boss lobs light at the keeper and the biggest fairy cluster, and
// phase 4 fires twin bursts. One timer only — rescheduling replaces it.
function _egFireflyBurstSchedule(run, monster, delay) {
    if (run.burstTimer) clearTimeout(run.burstTimer);
    run.burstTimer = null;
    const phase = _egFireflyBurstPhase(monster);
    const ms = delay != null ? delay : (EG_FIREFLY_BURST_CADENCE[phase] || 0);
    if (!ms) return; // phase 1: no bursts yet
    run.burstTimer = setTimeout(() => {
        run.burstTimer = null;
        const mon = _egMonsters.find(m => m && m.id === run.monsterId);
        if (!mon || run.trial) return; // fight over / set-piece owns the screen
        const count = phase >= 4 ? EG_FIREFLY_BURST_TWINS : 1;
        for (let i = 0; i < count; i++) _egFireflyBurstCast(run, mon, i);
        _egFireflyBurstSchedule(run, mon);
    }, ms);
}

// One burst: a growing tell at the target point, then a detonation that
// sears the keeper and chips every fairy caught inside.
function _egFireflyBurstCast(run, monster, index) {
    const w = window.innerWidth, h = window.innerHeight;
    const pc = _egNkPlayerCenter();
    let x, y;
    if (index === 0 && pc) {
        x = pc.x; y = pc.y; // first burst hunts the keeper herself
    } else {
        // Heaviest fairy cluster: the fairy with the most living neighbours.
        let best = null, bestN = -1;
        const alive = run.flies.filter(f => f.hp > 0);
        alive.forEach(f => {
            const n = alive.filter(o => o !== f && Math.hypot(o.x - f.x, o.y - f.y) < EG_FIREFLY_HOLE_R).length;
            if (n > bestN) { bestN = n; best = f; }
        });
        if (best) { x = best.x; y = best.y; }
        else if (pc) { x = pc.x + (Math.random() - .5) * 260; y = pc.y + (Math.random() - .5) * 260; }
        else { x = w * (.2 + Math.random() * .6); y = h * (.2 + Math.random() * .6); }
    }
    x = Math.max(40, Math.min(w - 40, x));
    y = Math.max(40, Math.min(h - 40, y));
    const tell = document.createElement('div');
    tell.className = 'eg-firefly-burst-tell';
    tell.style.left = `${x}px`; tell.style.top = `${y}px`;
    document.body.appendChild(tell);
    const boom = document.createElement('div');
    boom.className = 'eg-firefly-burst-boom';
    boom.style.left = `${x}px`; boom.style.top = `${y}px`;
    document.body.appendChild(boom);
    const burst = { x, y, tell, boom, timer: null };
    run.bursts.push(burst);
    burst.timer = setTimeout(() => {
        burst.timer = null;
        boom.classList.add('eg-firefly-burst-fire');
        const mon = _egMonsters.find(m => m && m.id === run.monsterId);
        if (mon) {
            const keeper = _egNkPlayerCenter();
            if (keeper && Math.hypot(keeper.x - x, keeper.y - y) <= EG_FIREFLY_BURST_R) {
                _egNkAbilityHitToast(_egNkHit(EG_FIREFLY_BURST_PLAYER_PCT, 'lightning', mon.level), 'The Firefly', 'Lumen Burst');
            }
            run.flies.forEach((fly, i) => {
                if (fly.hp <= 0) return;
                if (Math.hypot(fly.x - x, fly.y - y) > EG_FIREFLY_BURST_R) return;
                fly.hp -= EG_FIREFLY_BURST_CHIP;
                if (fly.hp <= 0) {
                    // Fell to the blast — same loss flow as a failed trial.
                    fly.hp = 0;
                    fly.respawnAt = performance.now() + EG_FIREFLY_RESPAWN_MS;
                    fly.el.remove(); fly.light.remove();
                    _egFireflyToast('eg_ff_fairy_down', '⚠️ {name} fell to the burst — she returns in {s} seconds!', { name: _egFireflyName(i), s: EG_FIREFLY_RESPAWN_MS / 1000 });
                } else {
                    fly.el.classList.add('eg-firefly-chip');
                    setTimeout(() => fly.el.classList.remove('eg-firefly-chip'), 500);
                }
            });
        }
        setTimeout(() => {
            _egFireflyBurstRemove(run, burst);
            const at = run.bursts.indexOf(burst);
            if (at >= 0) run.bursts.splice(at, 1);
        }, 620);
    }, EG_FIREFLY_BURST_TELL_MS);
}

// ── Formation trials ──────────────────────────────────────────────────────

// Trial layouts are QUOTA-based: circles show how many lights each needs,
// not which numbered light goes where — any light can fill any slot.
//   phase 2 LIGHTFALL — one circle wanting all 5 fairies, plus YOU
//   phase 3 SPLIT     — two circles of fairies, plus YOU
//   phase 4 SCATTER   — five circles of 1 fairy each, plus YOU
// Trial layouts are ALIVE-AWARE: circle quotas scale to the fairies currently
// in the fight, so a fairy you already lost (or a dead fairy mid-respawn)
// never leaves a circle nobody can fill. Losing a swarm unit still hurts
// (less light, less flexibility) but a trial is always winnable with the
// lights you have — no death spiral from a fixed quota you can't reach.
function _egFireflyTrialLayout(phase, alive) {
    const w = window.innerWidth, h = window.innerHeight;
    const n = Math.max(0, Math.min(EG_FIREFLY_COUNT, Number(alive) || 0));
    if (n <= 0) return { circles: [], you: { x: w * .5, y: h * .7 } }; // all lights down
    if (phase === 2) {
        return {
            circles: [{ x: w * .5, y: h * .46, quota: n }],
            you: { x: w * .5, y: h * .78 },
        };
    }
    if (phase === 3) {
        const a = Math.ceil(n / 2), b = Math.floor(n / 2);
        const circles = [{ x: w * .25, y: h * .4, quota: a }];
        if (b > 0) circles.push({ x: w * .75, y: h * .4, quota: b });
        return { circles, you: { x: w * .5, y: h * .76 } };
    }
    const spots = [
        { x: w * .16, y: h * .3 }, { x: w * .5, y: h * .18 }, { x: w * .84, y: h * .3 },
        { x: w * .74, y: h * .6 }, { x: w * .26, y: h * .6 },
    ];
    return {
        circles: spots.slice(0, n).map(p => ({ x: p.x, y: p.y, quota: 1 })),
        you: { x: w * .5, y: h * .82 },
    };
}

const EG_FIREFLY_TRIALS = {
    2: { seconds: 10, key: 'eg_ff_trial_gather', fallback: 'LIGHTFALL — every light and you into the circle!', severity: 1.0 },
    3: { seconds: 15, key: 'eg_ff_trial_split', fallback: 'SPLIT — lights in two circles, you take the third!', severity: 1.25 },
    4: { seconds: 20, key: 'eg_ff_trial_scatter', fallback: 'SCATTER — one light per mark, you to the last circle!', severity: 1.5 },
};

// True while a formation trial is running. The encounter engine checks this
// (via the window flag) to freeze the player's charge-up attack bar during
// the trial — a coordination set-piece, not free auto-attack time, same
// pattern as the Clock's Time Freeze or the Snail's finisher.
function _egFireflyTrialActive() {
    const run = Array.from(_egFireflyRuns.values())[0];
    return !!(run && run.trial);
}
window._egFireflyTrialActive = _egFireflyTrialActive;

function _egFireflyStartTrial(monster, phase) {
    const run = _egFireflyRuns.get(monster.id);
    if (!run || run.trial) return;
    const spec = EG_FIREFLY_TRIALS[phase];
    if (!spec) return; // phase 1 has no trial
    // The set-piece owns the attack cadence: no NEW bursts are scheduled
    // while a trial runs. Bursts already telegraphed keep their timers —
    // their tells are on screen and dodging them stays part of the trial.
    if (run.burstTimer) { clearTimeout(run.burstTimer); run.burstTimer = null; }
    const alive = run.flies.filter(f => f.hp > 0).length;
    const layout = _egFireflyTrialLayout(phase, alive);
    const seconds = spec.seconds;
    const targets = [...layout.circles, layout.you];
    const els = layout.circles.map((c) => {
        const el = document.createElement('div');
        el.className = 'eg-firefly-target';
        el.style.left = `${c.x}px`; el.style.top = `${c.y}px`;
        const unit = c.quota === 1
            ? (t('eg_ff_quota_one') || 'firefly')
            : (t('eg_ff_quota_many') || 'fireflies');
        el.innerHTML = `<span class="eg-firefly-quota">${c.quota}×</span><span class="eg-firefly-quota-sub">${unit}</span>`;
        document.body.appendChild(el); return el;
    });
    const you = document.createElement('div');
    you.className = 'eg-firefly-target eg-firefly-target-you';
    you.style.left = `${layout.you.x}px`; you.style.top = `${layout.you.y}px`;
    you.textContent = (t('eg_ff_target_you') || 'YOU');
    document.body.appendChild(you); els.push(you);
    const countdown = document.createElement('div'); countdown.className = 'eg-firefly-countdown'; document.body.appendChild(countdown);
    const trial = run.trial = { phase, targets, circles: layout.circles, els, countdown, until: Date.now() + seconds * 1000 };
    _egNkToast(spec.key, `✨ FIREFLY ${spec.fallback} ${seconds} seconds to take position!`);
    trial.timer = setInterval(() => {
        const remain = Math.max(0, Math.ceil((trial.until - Date.now()) / 1000));
        countdown.textContent = (t('eg_ff_countdown') || 'FORMATION {n}s').replace('{n}', String(remain));
        if (!remain) _egFireflyResolveTrial(monster, run);
    }, 100);
}

function _egFireflyInTarget(fly, target) {
    return fly && fly.hp > 0 && Math.hypot(fly.x - target.x, fly.y - target.y) <= EG_FIREFLY_TRIAL_TOL;
}

// Greedy quota fill: each living light claims the nearest circle that still
// has free capacity. Lights are interchangeable — only the counts matter.
function _egFireflyAssignToCircles(run, trial) {
    const capacity = trial.circles.map(c => c.quota);
    const assignment = new Map(); // flyIndex → circleIndex (or -1)
    run.flies.forEach((fly, i) => {
        if (fly.hp <= 0) { assignment.set(i, -1); return; }
        let best = -1, bestD = Infinity;
        trial.targets.forEach((t, ci) => {
            if (ci >= capacity.length || capacity[ci] <= 0) return;
            const d = Math.hypot(fly.x - t.x, fly.y - t.y);
            if (d < bestD) { bestD = d; best = ci; }
        });
        if (best >= 0 && bestD <= EG_FIREFLY_TRIAL_TOL) {
            capacity[best]--;
            assignment.set(i, best);
        } else assignment.set(i, -1);
    });
    return assignment;
}

function _egFireflyResolveTrial(monster, run) {
    const trial = run.trial; if (!trial) return;
    clearInterval(trial.timer);
    const assignment = _egFireflyAssignToCircles(run, trial);
    let failedLights = 0;
    const lostNames = [];
    run.flies.forEach((fly, i) => {
        // A light that's already down was counted when it fell — don't reset
        // its respawn timer here.
        if (fly.hp <= 0) return;
        if (assignment.get(i) === -1) {
            // Failing the formation costs the light ITSELF: mispositioned
            // flies are lost from the swarm and return after a full minute.
            failedLights++;
            lostNames.push(_egFireflyName(i));
            fly.hp = 0;
            fly.respawnAt = performance.now() + EG_FIREFLY_RESPAWN_MS;
            fly.el.remove(); fly.light.remove();
        }
    });
    let playerFailed = !_egBlastHudInZone({ ...trial.targets[trial.circles.length], radius: EG_FIREFLY_TRIAL_TOL + 12 });

    run.darkness.classList.add('eg-firefly-blast');
    setTimeout(() => run.darkness && run.darkness.classList.remove('eg-firefly-blast'), 550);

    if (failedLights || playerFailed) {
        // Later phases sting harder: the burst ramps with the trial severity so
        // the 25% SCATTER is a real "take big damage" moment, not a slap.
        const severity = (EG_FIREFLY_TRIALS[trial.phase] && EG_FIREFLY_TRIALS[trial.phase].severity) || 1;
        const dealt = (playerFailed ? EG_FIREFLY_FAIL_PLAYER_PCT : 0) * severity + EG_FIREFLY_FAIL_LIGHT_PCT * failedLights;
        _egNkAbilityHitToast(_egNkHit(dealt, 'lightning', monster.level), 'The Firefly', 'Formation Burst');
        _egNkToast('eg_ff_trial_fail', '💥 The formation collapsed! The burst sears through the dark!');
        // Name the lost lights so the keeper knows exactly who to wait for.
        if (lostNames.length === 1) {
            _egFireflyToast('eg_ff_light_lost', '⚠️ {name} missed the mark and was lost — she returns in {s} seconds!',
                { name: lostNames[0], s: EG_FIREFLY_RESPAWN_MS / 1000 });
        } else if (lostNames.length > 1) {
            _egFireflyToast('eg_ff_lights_lost', '⚠️ {names} missed the mark and were lost — they return in {s} seconds!',
                { names: lostNames.join(', '), s: EG_FIREFLY_RESPAWN_MS / 1000 });
        }
    } else {
        _egNkToast('eg_ff_trial_win', '✨ Perfect formation! The swarm blazes in unison.');
    }

    trial.els.forEach(el => el.remove()); trial.countdown.remove(); run.trial = null;
    // Sweep any burst the trial cancelled mid-tell, then ease the boss back
    // into its attack cadence after a short breather.
    run.bursts.forEach(b => _egFireflyBurstRemove(run, b));
    run.bursts.length = 0;
    _egFireflyBurstSchedule(run, monster, 2800);
    setTimeout(() => {
        if (!_egMonsters.find(m => m.id === monster.id)) return;
        monster.bossImmune = false;
        _egBossScheduleMechanics(monster, monster.bossPhase);
        _egRenderPanel();
    }, 350);
}

// ── Teardown ──────────────────────────────────────────────────────────────

function _egFireflyTeardown(monsterId) {
    const run = _egFireflyRuns.get(monsterId); if (!run) return;
    run.flies.forEach(f => { if (f._flashTimer) clearTimeout(f._flashTimer); });
    cancelAnimationFrame(run.raf);
    if (run.trial) { clearInterval(run.trial.timer); run.trial.els.forEach(el => el.remove()); run.trial.countdown.remove(); }
    run.bursts.forEach(b => _egFireflyBurstRemove(run, b));
    run.bursts.length = 0;
    if (run.burstTimer) clearTimeout(run.burstTimer);
    run.darkness.remove(); run.respawnStatus.remove();
    if (run.controls) run.controls.remove();
    run.flies.forEach(f => { f.el.remove(); f.light.remove(); });
    document.body.classList.remove('eg-firefly-drag-cursor');
    try { const b = document.getElementById('board'); if (b) b.style.cursor = ''; } catch (err) {}
    _egFireflyRuns.delete(monsterId);
}
