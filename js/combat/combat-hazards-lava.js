import { EG_AIL_IGNITE_DMG_SHARE, EG_AIL_MIN_DOT_DAMAGE } from './combat-ailments-core.js';
import {
    EG_HZ_LAVA_BLAST_R, EG_HZ_LAVA_EXPLOSION_BASE_DMG_PCT, EG_HZ_LAVA_FUSE_MS,
    EG_HZ_LAVA_IGNITE_CHANCE_PCT, EG_HZ_LAVA_MAX_R, EG_HZ_LAVA_MIN_R,
    EG_HZ_LAVA_RESPAWN_MS, EG_HZ_LAVA_SPEED_MAX, EG_HZ_LAVA_SPEED_MIN,
    _egHzApplyCircleHit, _egHzCircleRectOverlap, _egHzGridRect, _egHzMult,
    _egHzPlayerHitbox, _egHzPointOutsideGrid, _egHzRand,
} from './combat-hazards.js';
import { _egHzLava, _egHzLayer, _egSetHzLava } from './combat-hazards.js';

//------------------------------------------------------------------------
//-------------------LAVA BALLS-------------------------------------------
//------------------------------------------------------------------------

export function _egHzCreateLavaPool() {
    const r = _egHzRand(EG_HZ_LAVA_MIN_R, EG_HZ_LAVA_MAX_R);
    const pos = _egHzPointOutsideGrid(r + 24);
    const speed = _egHzRand(EG_HZ_LAVA_SPEED_MIN, EG_HZ_LAVA_SPEED_MAX);
    const angle = Math.random() * Math.PI * 2;
    const el = document.createElement('div');
    el.className = 'eg-hz-lava';
    const size = r * 2;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.animationDelay = (-Math.random() * 3) + 's';
    if (_egHzLayer) _egHzLayer.appendChild(el);
    el.style.transform = `translate(${Math.round(pos.x - r)}px, ${Math.round(pos.y - r)}px)`;
    return {
        x: pos.x, y: pos.y, r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        el,
        state: 'active', // 'active' | 'fusing' | 'respawning'
        fuseT: 0,
        respawnIn: 0,
    };
}

export function _egHzTriggerLavaFuse(pool) {
    if (!pool || pool.state !== 'active') return;
    pool.state = 'fusing';
    pool.fuseT = EG_HZ_LAVA_FUSE_MS;
    if (pool.el) pool.el.classList.add('eg-hz-lava-fuse');
}

export function _egHzDetonateLava(pool) {
    if (!pool) return;
    const bx = pool.x;
    const by = pool.y;
    const br = pool.r;
    // Visual explosion: remove the lava ball element and spawn a dedicated blast copy
    // at the exact world position (left/top based) so the scale animation does not
    // fight the translate() used for drift positioning.
    if (pool.el) {
        try { pool.el.remove(); } catch (e) {}
        pool.el = null;
    }
    if (_egHzLayer) {
        // Fiery core that puffs up and fades
        const boom = document.createElement('div');
        boom.className = 'eg-hz-lava eg-hz-lava-blast';
        const size = br * 2;
        boom.style.width = size + 'px';
        boom.style.height = size + 'px';
        boom.style.left = (bx - br) + 'px';
        boom.style.top = (by - br) + 'px';
        // blast elements are positioned via left/top, not translate()
        boom.style.transform = 'none';
        _egHzLayer.appendChild(boom);
        setTimeout(() => boom.remove(), 500);

        // Expanding ring so the 140 px blast radius is readable
        const ring = document.createElement('div');
        ring.className = 'eg-hz-lava-explosion';
        const d = EG_HZ_LAVA_BLAST_R * 2;
        ring.style.width = d + 'px';
        ring.style.height = d + 'px';
        ring.style.left = (bx - EG_HZ_LAVA_BLAST_R) + 'px';
        ring.style.top = (by - EG_HZ_LAVA_BLAST_R) + 'px';
        _egHzLayer.appendChild(ring);
        setTimeout(() => ring.remove(), 550);
    }

    // Heavy fire damage if the player is still inside the blast radius at detonation time
    // Uses tight hitbox vs blast disc so footing/edges respect the sprite.
    const pr = _egHzPlayerHitbox();
    if (_egHzApplyCircleHit(bx, by, EG_HZ_LAVA_BLAST_R, pr,
        EG_HZ_LAVA_EXPLOSION_BASE_DMG_PCT * _egHzLava.dmgMult,
        'fire', '#ff6b4a',
        Math.random() * 100 < EG_HZ_LAVA_IGNITE_CHANCE_PCT ? 'ignite' : null,
        Math.max(EG_AIL_MIN_DOT_DAMAGE, (globalThis.playerMaxHP || 100) * EG_AIL_IGNITE_DMG_SHARE / 100))) {
        // Damage and ailment application are handled consistently above.
    }

    // Despawn for 3 minutes (gameplay time)
    pool.state = 'respawning';
    pool.respawnIn = EG_HZ_LAVA_RESPAWN_MS;
    pool.fuseT = 0;
}

export function _egHzRespawnLavaPool(pool) {
    const fresh = _egHzCreateLavaPool();
    // Reuse the same object identity so the pools array stays stable
    pool.x = fresh.x; pool.y = fresh.y; pool.r = fresh.r;
    pool.vx = fresh.vx; pool.vy = fresh.vy;
    // fresh already appended its element; steal it
    pool.el = fresh.el;
    // fresh's element is already in the DOM - no extra append needed
    pool.state = 'active';
    pool.fuseT = 0;
    pool.respawnIn = 0;
    // Ensure blast/fuse classes are clean (fresh element is clean by construction)
}

export function _egHzInitLava(intensity) {
    // ~8 balls at low intensity (tier 3), scaling up to a cap of 14 at high
    // intensity (tier 1):  25 → 7 | 45 → 8 | 50 → 9 | 75 → 10 | 80 → 11 | 100 → 12
    const count = Math.min(14, 5 + Math.round(intensity / 16));
    const pools = [];
    for (let i = 0; i < count; i++) {
        pools.push(_egHzCreateLavaPool());
    }
    _egSetHzLava({ pools, dmgMult: _egHzMult(intensity), intensity });
}

export function _egHzTickLava(dtMs) {
    const dtS = dtMs / 1000;
    const grid = _egHzGridRect(10);
    const pr = _egHzPlayerHitbox();

    _egHzLava.pools.forEach(p => {
        // ── Respawning (despawned) ──────────────────────────────────
        if (p.state === 'respawning') {
            p.respawnIn -= dtMs;
            if (p.respawnIn <= 0) {
                _egHzRespawnLavaPool(p);
            }
            return;
        }

        // ── Fusing (about to explode) - frozen in place ─────────────
        if (p.state === 'fusing') {
            p.fuseT -= dtMs;
            if (p.fuseT <= 0) _egHzDetonateLava(p);
            return;
        }

        // ── Active: slow drift + collision detection ────────────────
        if (!p.el || !p.el.isConnected) return;

        // Slow drift; bounce off viewport edges and steer around the grid.
        let nx = p.x + p.vx * dtS;
        let ny = p.y + p.vy * dtS;
        const half = p.r;
        if (_egHzCircleRectOverlap(nx, ny, half * 0.7, grid)) {
            // Reflect away from the grid without entering it.
            if (nx > grid.left - half && nx < grid.right + half) p.vx *= -1;
            if (ny > grid.top - half && ny < grid.bottom + half) p.vy *= -1;
            nx = p.x; ny = p.y;
        }
        if (nx < half || nx > window.innerWidth - half) { p.vx *= -1; nx = p.x; }
        if (ny < half || ny > window.innerHeight - half) { p.vy *= -1; ny = p.y; }
        p.x = nx; p.y = ny;
        p.el.style.transform = `translate(${Math.round(p.x - p.r)}px, ${Math.round(p.y - p.r)}px)`;

        // Collision → start 0.5 s fuse, then heavy fire explosion
        // Tight sprite hitbox vs lava disc (r * 0.88 keeps leniency for shoulders)
        if (pr && _egHzCircleRectOverlap(p.x, p.y, p.r * 0.88, pr)) {
            _egHzTriggerLavaFuse(p);
        }
    });
}
