import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell, updClues } from '../grid.js';
import { t } from '../translation/translations.js';
import { buildClassHUD } from './class-hud.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { questStat_classRevealUsed, updateQuestStats } from '../inference/inference-stats.js';
import { cur } from '../state.js';

// Transition Matrix state and presentation.
const TM_GLYPH_CHARSET = '01アイウエオカキクケコ∑∫∂∇λμπ';

const TM_BADGE_CSS = `
    #transition-matrix-badge {
        display: inline-flex; align-items: center; gap: 3px;
        background: rgba(41,128,185,0.18); border: 1px solid #2980b9;
        border-radius: 5px; padding: 2px 6px;
        font-family: var(--PX, monospace); font-size: 10px; color: #7fb3d3;
        animation: tm-pulse 1s ease-in-out infinite; white-space: nowrap;
    }
    .tm-icon  { font-size: 11px; line-height: 1; }
    .tm-timer { font-variant-numeric: tabular-nums; letter-spacing: .03em; font-weight: bold; }
    @keyframes tm-pulse {
        0%, 100% { box-shadow: 0 0 4px 1px rgba(41,128,185,0.4); }
        50%       { box-shadow: 0 0 10px 3px rgba(41,128,185,0.75); }
    }
    .rollback-flash {
        animation: rollback-wave 0.5s ease-out forwards;
    }
    @keyframes rollback-wave {
        0%   { filter: brightness(2.5) saturate(0.3) hue-rotate(180deg); }
        60%  { filter: brightness(1.4) saturate(1.2) hue-rotate(30deg); }
        100% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
    }
    .transition-cascade-flash {
        animation: cascade-pop 0.6s ease-out forwards;
    }
    @keyframes cascade-pop {
        0%   { filter: brightness(2) saturate(0.5) hue-rotate(200deg); transform: scale(1.15); }
        60%  { filter: brightness(1.3) saturate(1.5); transform: scale(1.05); }
        100% { filter: brightness(1) saturate(1); transform: scale(1); }
    }
`;


// Starts a new Transition Matrix session. Cancels any session already running.
//   durationMs    - how long the mode stays active.
//   cascadeChance - probability (0–1) of each correct fill triggering a cascade.
//   maxDepth      - maximum cascade chain length (1 = rank 1–2, 2 = rank 3).
export function _executeTransitionMatrix(durationMs, cascadeChance, maxDepth) {
    _clearTransitionMatrix();

    window._transitionMatrixActive = {
        cascadeChance,
        maxDepth,
        endTime: Date.now() + durationMs,
        timeout: null,
    };

    const secs = Math.ceil(durationMs / 1000);

    globalThis.showToast(t('cls_tm_active')
        .replace('{s}', secs)
        .replace('{p}', Math.round(cascadeChance * 100)));

    Audio_Manager.playSFX('transitionMatrix');
    trackAchStat('skillTransitionMatrixUsed');

    _transitionMatrixStartOverlay(durationMs);
    _transitionMatrixSpawnBadge(secs);

    // Tick the badge countdown every second.
    let remaining = secs;
    window._transitionMatrixTickInterval = setInterval(() => {
        remaining--;
        _transitionMatrixUpdateBadge(remaining);
        if (remaining <= 0) {
            clearInterval(window._transitionMatrixTickInterval);
            window._transitionMatrixTickInterval = null;
        }
    }, 1000);

    // Schedule natural expiry.
    window._transitionMatrixActive.timeout = setTimeout(() => {
        _clearTransitionMatrix(true);
    }, durationMs);
}

// Cleans up a Transition Matrix session.
// Pass natural=true when the session ends by time-out (shows the expiry toast
// and rebuilds the class HUD). Pass natural=false (default) when clearing
// as part of starting a new session or resetting the level.
export function _clearTransitionMatrix(natural = false) {
    if (window._transitionMatrixActive?.timeout) {
        clearTimeout(window._transitionMatrixActive.timeout);
    }
    if (window._transitionMatrixTickInterval) {
        clearInterval(window._transitionMatrixTickInterval);
        window._transitionMatrixTickInterval = null;
    }
    window._transitionMatrixActive = null;
    _transitionMatrixRemoveBadge();

    // Fade out and remove the canvas overlay if it is still running.
    const cvs = document.getElementById('tm-canvas-overlay');
    if (cvs) {
        if (cvs._animId) globalThis.cancelAnimationFrame(cvs._animId);
        cvs.style.transition = 'opacity 0.4s ease-out';
        cvs.style.opacity = '0';
        setTimeout(() => {
            if (cvs._resizeHandler) window.removeEventListener('resize', cvs._resizeHandler);
            cvs.remove();
        }, 450);
    }

    if (natural) {
        globalThis.showToast(t('cls_tm_ended'));
        buildClassHUD();
    }
}


// Long-running canvas overlay rendered while Transition Matrix is active.
// The overlay shows glyph rain, network nodes, connection chains, and
// cascade particles.
function _tmOverlay_buildNodes() {
    if (!cur) return [];

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const nodes = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            nodes.push({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                r, c,
                pulse: Math.random() * Math.PI * 2,
                active: sol[r][c] === 1 && (window.revealedGrid?.[r]?.[c] || window.userGrid?.[r]?.[c] === 1),
            });
        }
    }
    return nodes;
}

function _tmOverlay_buildChains(nodes) {
    const chains = [];
    const maxDist = 140;
    const maxDistSq = maxDist * maxDist;
    const MAX_CHAINS = 36;

    for (let i = 0; i < nodes.length && chains.length < MAX_CHAINS; i++) {
        for (let j = i + 1; j < nodes.length && chains.length < MAX_CHAINS; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const distSq = dx * dx + dy * dy;
            if (distSq < maxDistSq && Math.random() < 0.14) {
                chains.push({
                    a: nodes[i],
                    b: nodes[j],
                    progress: Math.random(),
                    speed: 0.004 + Math.random() * 0.004,
                });
            }
        }
    }
    return chains;
}

function _tmOverlay_buildGlyphRain(glyphRain, canvasW, canvasH) {
    const colW = 32;
    const colCount = Math.floor(canvasW / colW);
    for (let i = glyphRain.length; i < colCount; i++) {
        const len = 3 + Math.floor(Math.random() * 4);
        const chars = [];
        for (let k = 0; k < len; k++) {
            chars.push(TM_GLYPH_CHARSET[Math.floor(Math.random() * TM_GLYPH_CHARSET.length)]);
        }
        glyphRain.push({
            x: i * colW + colW / 2,
            y: Math.random() * canvasH,
            speed: 0.6 + Math.random() * 1.1,
            alpha: 0.045 + Math.random() * 0.045,
            len,
            chars,
            _tick: Math.floor(Math.random() * 10),
        });
    }
}

function _tmOverlay_drawGlyphRain(ctx, glyphRain, h, fade) {
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    for (let idx = 0; idx < glyphRain.length; idx++) {
        const col = glyphRain[idx];
        col.y += col.speed;
        if (col.y > h + col.len * 14) {
            col.y = -col.len * 14;
            for (let k = 0; k < col.len; k++) {
                if (Math.random() < 0.35) {
                    col.chars[k] = TM_GLYPH_CHARSET[Math.floor(Math.random() * TM_GLYPH_CHARSET.length)];
                }
            }
        }
        col._tick++;
        if ((col._tick & 7) === 0) {
            col.chars[0] = TM_GLYPH_CHARSET[Math.floor(Math.random() * TM_GLYPH_CHARSET.length)];
        }

        const baseA = col.alpha * fade;
        for (let i = 0; i < col.len; i++) {
            const a = (1 - i / col.len) * baseA * 0.55;
            if (a < 0.008) continue;
            ctx.fillStyle = `rgba(30,${110 + (col.len - i) * 12},70,${a})`;
            ctx.fillText(col.chars[i] || '0', col.x, col.y - i * 14);
        }
        ctx.fillStyle = `rgba(130,255,165,${baseA * 1.1})`;
        ctx.fillText(col.chars[0], col.x, col.y);
    }
}

function _tmOverlay_drawChains(ctx, chains, fade) {
    if (chains.length === 0) return;
    const lineAlpha = 0.18 * fade;
    ctx.strokeStyle = `rgba(30,180,100,${lineAlpha})`;
    ctx.lineWidth = 0.7;
    ctx.setLineDash([4, 7]);
    for (let i = 0; i < chains.length; i++) {
        const ch = chains[i];
        ch.progress += ch.speed;
        if (ch.progress > 1) ch.progress = 0;
        ctx.beginPath();
        ctx.moveTo(ch.a.x, ch.a.y);
        ctx.lineTo(ch.b.x, ch.b.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    for (let i = 0; i < chains.length; i++) {
        const ch = chains[i];
        const px = ch.a.x + (ch.b.x - ch.a.x) * ch.progress;
        const py = ch.a.y + (ch.b.y - ch.a.y) * ch.progress;
        ctx.fillStyle = `rgba(80,255,140,${0.18 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(200,255,210,${0.55 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function _tmOverlay_drawNodes(ctx, nodes, t2, fade) {
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = 0.5 + 0.5 * Math.sin(t2 * 2.2 + n.pulse);
        const r = n.active ? 6 + pulse * 3 : 3.5 + pulse;

        if (n.active) {
            ctx.fillStyle = `rgba(40,220,110,${0.09 * pulse * fade})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = n.active
            ? `rgba(60,230,130,${0.35 * fade})`
            : `rgba(30,110,70,${0.12 * fade})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = n.active
            ? `rgba(120,255,170,${0.75 * fade})`
            : `rgba(50,150,90,${0.25 * fade})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function _tmOverlay_drawParticles(ctx, particles, nodes, fade) {
    if (particles.length < 10 && Math.random() < 0.08 && nodes.length > 0) {
        const src = nodes[Math.floor(Math.random() * nodes.length)];
        particles.push({
            x: src.x,
            y: src.y,
            vx: (Math.random() - 0.5) * 1.0,
            vy: (Math.random() - 0.5) * 1.0,
            life: 1,
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012;
        p.life -= 0.028;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(100,255,150,${p.life * 0.55 * fade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function _transitionMatrixStartOverlay(durationMs) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.getElementById('tm-canvas-overlay')?.remove();

    const cvs = document.createElement('canvas');
    cvs.id = 'tm-canvas-overlay';
    cvs.style.cssText = `
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 400;
        opacity: 0;
        transition: opacity 0.5s ease-in;
    `;
    document.body.appendChild(cvs);

    const ctx = cvs.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        cvs.width = Math.floor(w * dpr);
        cvs.height = Math.floor(h * dpr);
        cvs.style.width = w + 'px';
        cvs.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    cvs._resizeHandler = resize;

    requestAnimationFrame(() => requestAnimationFrame(() => { cvs.style.opacity = '1'; }));

    const W = () => cvs.width / dpr;
    const H = () => cvs.height / dpr;
    const startTime = performance.now();

    const nodes = _tmOverlay_buildNodes();
    const chains = _tmOverlay_buildChains(nodes);
    const glyphRain = [];
    _tmOverlay_buildGlyphRain(glyphRain, W(), H());

    const particles = [];
    let animId;
    let lastFrame = 0;
    const FRAME_INTERVAL = 33;

    function tick(now) {
        const elapsed = now - startTime;
        const t = elapsed / durationMs;

        if (t >= 1) {
            globalThis.cancelAnimationFrame(animId);
            cvs.style.transition = 'opacity 0.5s ease-out';
            cvs.style.opacity = '0';
            setTimeout(() => {
                window.removeEventListener('resize', cvs._resizeHandler);
                cvs.remove();
            }, 550);
            return;
        }

        if (!window._transitionMatrixActive) {
            globalThis.cancelAnimationFrame(animId);
            cvs.style.transition = 'opacity 0.4s ease-out';
            cvs.style.opacity = '0';
            setTimeout(() => {
                window.removeEventListener('resize', cvs._resizeHandler);
                cvs.remove();
            }, 450);
            return;
        }

        if (now - lastFrame < FRAME_INTERVAL) {
            animId = requestAnimationFrame(tick);
            return;
        }
        lastFrame = now;

        const fade = t < 0.08 ? t / 0.08 : t > 0.9 ? (1 - t) / 0.1 : 1;
        const w = W();
        const h = H();
        const t2 = elapsed * 0.001;

        ctx.clearRect(0, 0, w, h);
        if (fade > 0.01) {
            ctx.fillStyle = `rgba(4,12,6,${0.18 * fade})`;
            ctx.fillRect(0, 0, w, h);
        }

        _tmOverlay_drawGlyphRain(ctx, glyphRain, h, fade);
        _tmOverlay_drawChains(ctx, chains, fade);
        _tmOverlay_drawNodes(ctx, nodes, t2, fade);
        _tmOverlay_drawParticles(ctx, particles, nodes, fade);

        animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    cvs._animId = animId;
}


// Called from onCorrectFill() in class-abilities.js whenever the player
// fills a cell correctly while Transition Matrix is active.
// Tries to cascade to a random unfilled correct cardinal neighbour.
//   row / col  - the cell that was just filled correctly.
//   depth      - remaining cascade depth (decremented on each recursive call).
export function _transitionMatrixCascade(row, col, depth) {
    const tm = window._transitionMatrixActive;

    if (!tm || Date.now() > tm.endTime) {
        _clearTransitionMatrix(true);
        return;
    }
    if (depth <= 0 || Math.random() > tm.cascadeChance || !cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const neighbours = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (sol[nr][nc] === 1 && !globalThis.revealedGrid[nr][nc] && globalThis.userGrid[nr][nc] !== 1) {
            neighbours.push([nr, nc]);
        }
    }

    if (neighbours.length === 0) return;

    const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];

    globalThis.revealedGrid[nr][nc] = true;
    globalThis.userGrid[nr][nc] = 1;
    renderCell(nr, nc);
    updClues(nr, nc);
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    _transitionMatrixCellVFX(nr, nc, row, col);

    globalThis.showToast(t('cls_tm_cascade'));

    if (depth > 1) {
        setTimeout(() => _transitionMatrixCascade(nr, nc, depth - 1), 250);
        trackAchStat('transitionMatrixCascades');
    }

    Audio_Manager.playSFX('transitionCascade');
    globalThis.checkWin();
}


// Short-lived canvas overlay drawn when a cascade reveal occurs.
function _tmBeam_getCellCenter(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function _tmBeam_drawCore(ctx, x1, y1, hx, hy, alpha) {
    const grad = ctx.createLinearGradient(x1, y1, hx, hy);
    grad.addColorStop(0, `rgba(46,204,113,0)`);
    grad.addColorStop(0.3, `rgba(46,204,113,${0.55 * alpha})`);
    grad.addColorStop(1, `rgba(150,255,180,${0.95 * alpha})`);

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(46,204,113,${0.8 * alpha})`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.strokeStyle = `rgba(220,255,235,${0.6 * alpha})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();
}

function _tmBeam_drawSpark(ctx, hx, hy, t, alpha) {
    const sparkR = 5 + 3 * Math.sin(t * Math.PI);
    const sparkGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, sparkR * 2.5);
    sparkGrad.addColorStop(0, `rgba(200,255,210,${alpha})`);
    sparkGrad.addColorStop(0.4, `rgba(46,204,113,${0.75 * alpha})`);
    sparkGrad.addColorStop(1, `rgba(46,204,113,0)`);
    ctx.beginPath();
    ctx.arc(hx, hy, sparkR * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = sparkGrad;
    ctx.fill();
}

function _tmBeam_drawBurst(ctx, x2, y2, t, alpha) {
    const burstT = (t - 0.55) / 0.45;
    const burstAlpha = alpha * (1 - burstT * 0.5);
    const burstR = 6 + burstT * 18;
    const burstGrad = ctx.createRadialGradient(x2, y2, 0, x2, y2, burstR);
    burstGrad.addColorStop(0, `rgba(180,255,200,${burstAlpha})`);
    burstGrad.addColorStop(0.5, `rgba(46,204,113,${burstAlpha * 0.6})`);
    burstGrad.addColorStop(1, `rgba(46,204,113,0)`);
    ctx.beginPath();
    ctx.arc(x2, y2, burstR, 0, Math.PI * 2);
    ctx.fillStyle = burstGrad;
    ctx.fill();
}

function _transitionMatrixCellVFX(row, col, srcRow, srcCol) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (el) {
        el.classList.add('transition-cascade-flash');
        setTimeout(() => el.classList.remove('transition-cascade-flash'), 600);
    }

    if (srcRow == null || srcCol == null) return;

    const src = _tmBeam_getCellCenter(srcRow, srcCol);
    const dst = _tmBeam_getCellCenter(row, col);
    if (!src || !dst) return;

    const { x: x1, y: y1 } = src;
    const { x: x2, y: y2 } = dst;
    const DURATION = 1000;

    const cvs = document.createElement('canvas');
    cvs.style.cssText = `
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 6000;
    `;
    document.body.appendChild(cvs);

    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const startTime = performance.now();
    let animId;
    const ctx = cvs.getContext('2d');

    function tick(now) {
        const t = Math.min((now - startTime) / DURATION, 1);
        const alpha = t < 0.15 ? t / 0.15 : 1 - ((t - 0.15) / 0.85);

        ctx.clearRect(0, 0, cvs.width, cvs.height);

        const headT = Math.min(t / 0.55, 1);
        const hx = x1 + (x2 - x1) * headT;
        const hy = y1 + (y2 - y1) * headT;

        _tmBeam_drawCore(ctx, x1, y1, hx, hy, alpha);
        _tmBeam_drawSpark(ctx, hx, hy, t, alpha);
        if (headT >= 1) _tmBeam_drawBurst(ctx, x2, y2, t, alpha);

        if (t < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            globalThis.cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            cvs.remove();
        }
    }

    animId = requestAnimationFrame(tick);
}


// Injects the badge CSS once, then creates and appends the badge element.
function _transitionMatrixSpawnBadge(remainingSecs) {
    _transitionMatrixRemoveBadge();

    if (!document.getElementById('tm-badge-styles')) {
        const s = document.createElement('style');
        s.id = 'tm-badge-styles';
        s.textContent = TM_BADGE_CSS;
        document.head.appendChild(s);
    }

    const badge = document.createElement('div');
    badge.id = 'transition-matrix-badge';
    badge.innerHTML = `<span class="tm-icon">⏳</span><span class="tm-timer" id="tm-timer-val">${remainingSecs}s</span>`;

    const handle = document.getElementById('class-hud-drag-handle');
    if (handle) {
        handle.appendChild(badge);
    } else {
        const panel = document.getElementById('class-hud-panel');
        if (panel) panel.appendChild(badge);
    }
}

function _transitionMatrixUpdateBadge(remainingSecs) {
    const el = document.getElementById('tm-timer-val');
    if (el) el.textContent = `${Math.max(0, remainingSecs)}s`;
}

function _transitionMatrixRemoveBadge() {
    document.getElementById('transition-matrix-badge')?.remove();
}
