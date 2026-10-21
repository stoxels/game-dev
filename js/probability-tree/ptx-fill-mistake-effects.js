//------------------------------------------------------------------------
//-------------------EXPANSION: FILL & MISTAKE EFFECTS--------------------
//------------------------------------------------------------------------
// Expansion-node effects that fire after a correct fill (ON_FILL) or a
// counted mistake (ON_MISTAKE).
//------------------------------------------------------------------------

import { revealTiles } from '../puzzle-mechanics/grid-actions.js';
import { ON_FILL, has, S, addSecs, toast, lineFillStats, roll, ORTHO, inGrid, revealAt, ON_MISTAKE, markAt, PTX } from './ptx-core.js';

//--------------------------------------------------------------------------
//------------------------------FILL HOOKS----------------------------------
//--------------------------------------------------------------------------

ON_FILL.push((r, c) => {   // Dialectic (310)
    if (has('dialectic') && S.dialecticArmed) {
        S.dialecticArmed = false;
        const s = addSecs(5);
        if (s > 0) toast(`🧠 Dialectic +${s}s`);
    }
});

ON_FILL.push(() => {   // Regression to Mean (359)
    if (has('regression_to_mean') && S.regFills > 0) {
        S.regFills--;
        addSecs(4);
    }
});

ON_FILL.push(() => {   // Brownian Ratchet (320)
    if (has('brownian_ratchet') && S.ratchetFills > 0) {
        S.ratchetFills--;
        addSecs(3);
    }
});

ON_FILL.push((r, c) => {   // Channel Capacity (315)
    if (!has('channel_capacity')) return;
    const row = lineFillStats(r, true);
    const col = lineFillStats(c, false);
    const ok = (st) => st.total > 0 && st.filled / st.total < 0.25;
    if (ok(row) || ok(col)) addSecs(1);
});

ON_FILL.push(() => {   // Coding Theory (316) & Gnostic Echo (311) & Serendipity Seed (384)
    S.fillCount++;
    if (has('coding_theory') && S.fillCount % 20 === 0) {
        revealTiles(1);
        toast('🧮 Coding Theory');
    }
    if (has('gnostic_echo') && S.fillCount % 10 === 0 && Math.random() < 0.15) {
        revealTiles(1);
        toast('🔁 Gnostic Echo');
    }
    if (has('serendipity_seed') && S.fillCount === 1 && roll(0.25, false)) {
        revealTiles(1);
        toast('🌰 Serendipity Seed');
    }
});

// Butterfly Effect FX: a ripple on the filled tile and a butterfly that
// flutters out to each tile it reveals, which flashes on arrival.
function playButterflyFx(r, c, targets) {
    const wrap = document.getElementById('puzzle-scaler');
    const src = document.getElementById(`g-${r}-${c}`);
    if (!wrap || !src || typeof wrap.animate !== 'function') return;
    const zoom = globalThis.currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const center = (el) => {
        const b = el.getBoundingClientRect();
        return [(b.left - wRect.left + b.width / 2) / zoom, (b.top - wRect.top + b.height / 2) / zoom, b.width / zoom];
    };
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:326; overflow:hidden;';
    wrap.appendChild(overlay);
    const [sx, sy, size] = center(src);

    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute; left:${sx}px; top:${sy}px; width:${size}px; height:${size}px;`
        + 'border:2px solid #7fd8ff; border-radius:50%; box-shadow:0 0 12px #7fd8ff, inset 0 0 8px #7fd8ff;';
    ring.animate([
        { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }
    ], { duration: 700, easing: 'ease-out', fill: 'forwards' });
    overlay.appendChild(ring);

    targets.forEach(([tr, tc], i) => {
        const el = document.getElementById(`g-${tr}-${tc}`);
        if (!el) return;
        const [tx, ty] = center(el);
        const dx = tx - sx, dy = ty - sy;
        const fly = document.createElement('div');
        fly.textContent = '🦋';
        fly.style.cssText = `position:absolute; left:${sx}px; top:${sy}px; font-size:${Math.round(size * 0.9)}px;`
            + 'line-height:1; filter:drop-shadow(0 0 6px #7fd8ff);';
        fly.animate([
            { transform: 'translate(-50%,-50%) scale(0.4) rotate(0deg)', opacity: 0 },
            { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4 - size * 0.8}px)) scale(1.3) rotate(-18deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7) rotate(14deg)`, opacity: 1, offset: 0.85 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 }
        ], { duration: 700, delay: i * 120, easing: 'ease-in-out', fill: 'both' });
        overlay.appendChild(fly);
        el.animate([
            { filter: 'brightness(2.2) saturate(1.6)', boxShadow: '0 0 18px #7fd8ff' },
            { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' }
        ], { duration: 600, delay: 450 + i * 120, easing: 'ease-out' });
    });
    setTimeout(() => overlay.remove(), 1200 + targets.length * 120);
}

ON_FILL.push((r, c) => {   // Butterfly Effect keystone (336): 3% per correct fill
    if (!has('keystone_butterfly_effect') || Math.random() >= 0.03) return;
    const hit = [];
    for (const [dr, dc] of ORTHO) {
        if (hit.length >= 2) break;
        const nr = r + dr, nc = c + dc;
        if (inGrid(nr, nc) && revealAt(nr, nc)) hit.push([nr, nc]);
    }
    if (hit.length > 0) {
        playButterflyFx(r, c, hit);
        toast('🦋 Butterfly Effect');
    }
});

//--------------------------------------------------------------------------
//-----------------------------MISTAKE HOOKS--------------------------------
//--------------------------------------------------------------------------

ON_MISTAKE.push(() => {   // Martingale keystone (322)
    if (!has('keystone_martingale')) return;
    S.martingaleStake = Math.min(480, S.martingaleStake * 2);
    toast(`🎰 Martingale stake raised to ${S.martingaleStake}s`);
});

ON_MISTAKE.push(() => {   // Brownian Ratchet stacks (320)
    if (!has('brownian_ratchet')) return;
    S.ratchetStacks++;
    if (S.ratchetStacks % 3 === 0) {
        S.ratchetFills = 3;
        toast('⚙️ Brownian Ratchet armed: next 3 fills +3s each');
    }
});

ON_MISTAKE.push(() => {   // Chaos Buffer (335)
    if (!has('chaos_buffer')) return;
    S.chaosMistakes++;
    if (S.chaosMistakes % 2 === 0) { const s = addSecs(10); if (s > 0) toast(`🌪️ Chaos Buffer +${s}s`); }
});

ON_MISTAKE.push(() => {   // Dialectic arm (310)
    if (has('dialectic')) S.dialecticArmed = true;
});

ON_MISTAKE.push(() => {   // Regression to Mean arm (359)
    if (has('regression_to_mean')) S.regFills = 5;
});

ON_MISTAKE.push((r, c) => {   // Markov Blanket (319)
    if (!has('markov_blanket')) return;
    let n = 0;
    for (const [dr, dc] of ORTHO) {
        const nr = r + dr, nc = c + dc;
        if (inGrid(nr, nc) && markAt(nr, nc)) n++;
    }
    if (n > 0) toast('🛡️ Markov Blanket');
});

ON_MISTAKE.push(() => {   // Risk Auditor refund (329)
    if (!has('risk_auditor') || Math.random() >= 0.20) return;
    const last = PTX.lastPen || 0;
    if (last > 0) {
        const refund = Math.ceil(last / 2);
        const got = addSecs(refund);
        if (got > 0) toast(`🧾 Risk Auditor refunded ${got}s`);
    }
});

