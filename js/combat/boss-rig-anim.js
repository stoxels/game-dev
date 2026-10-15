//------------------------------------------------------------------------
//-------------------BOSS RIG ANIMATIONS (ability cues)-------------------------
//------------------------------------------------------------------------
// Cosmetic only. When a boss mechanic fires, boss-framework.js dispatches
// an 'eg-boss-mechanic' event; for the bosses listed in RIGS this module
// swaps the boss card's flat art for a small canvas that plays a skeletal
// animation (arms raise, wings flap, shockwaves...) and then puts the
// original <img> back. Nothing here touches combat state, timing or damage,
// and every failure path degrades to "no animation".
//
// Art: images/endgame/monsters/rigs/<boss>/<part>.webp, cut from the normal
// boss art by dev/scratch/rigger/cut_ingame.py (authoring demo: boss.html).
// Pose numbers below are in the units of the large source art (px); each
// rig's S converts them to the 512px in-game art.
//------------------------------------------------------------------------

const RIG_DIR = 'images/endgame/monsters/rigs/';

const RIGS = {
    boss_mech: {
        S: 0.418, ox: 2, oy: 106,
        parts: [
            { n: 'legL', x: 157, y: 310, px: 218.1, py: 317.1, par: 'torso' },
            { n: 'legR', x: 288, y: 313, px: 333.5, py: 317.1, par: 'torso' },
            { n: 'torso', x: 170, y: 125, px: 275.8, py: 315.0, par: null },
            { n: 'pauldronL', x: 109, y: 122, px: 189.3, py: 216.1, par: 'torso' },
            { n: 'pauldronR', x: 313, y: 125, px: 362.3, py: 216.1, par: 'torso' },
            { n: 'fistL', x: 12, y: 225, px: 185.2, py: 271.8, par: 'torso' },
            { n: 'fistR', x: 353, y: 221, px: 352.0, py: 271.8, par: 'torso' },
        ],
        // mechanic name -> animation + length (ms); the charge anim releases
        // at 82% of its length, so it is stretched to land on the blast.
        mechanics: {
            self_destruct: { anim: 'charge', ms: (p) => ([0, 3200, 2800, 2400][p] || 3000) / 0.82 },
            soul_tithe: { anim: 'slam', ms: () => 1500 },
        },
    },
    boss_guardian: {
        S: 0.382, ox: 1, oy: 115,
        parts: [
            { n: 'wingL', x: 3, y: 136, px: 174.2, py: 229.9, par: 'body' },
            { n: 'wingR', x: 341, y: 137, px: 337.8, py: 229.9, par: 'body' },
            { n: 'body', x: 128, y: 148, px: 256.2, py: 275.0, par: null },
            { n: 'dice', x: 157, y: 115, px: 256.2, py: 158.4, par: 'body' },
        ],
        mechanics: {
            lock_on: { anim: 'nova', ms: () => 2200 },
            clue_scramble: { anim: 'flap', ms: () => 1600 },
        },
    },
};

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ---- poses (pose objects: rot deg, dx/dy source-art px, sc scale) --------
const POSES = {
    slam(P, u) {
        let h;
        if (u < 0.4) h = ease(u / 0.4); else if (u < 0.5) h = 1 - Math.pow((u - 0.4) / 0.1, 2); else h = 0;
        const pulse = u >= 0.5 ? Math.max(0, 1 - (u - 0.5) * 4) : 0;
        P.fistL.rot = 62 * h; P.fistR.rot = -62 * h; P.fistL.dy = -14 * h; P.fistR.dy = -14 * h;
        P.fistL.sc = P.fistR.sc = 1 + 0.2 * pulse + 0.05 * h;
        P.pauldronL.rot = 7 * h; P.pauldronR.rot = -7 * h;
        P.torso.rot = -3 * h + 1.5 * pulse; P.torso.dy = -12 * h + 18 * pulse;
        P.legL.dy = P.legR.dy = 6 * pulse;
    },
    charge(P, u) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        P.torso.sc = 1 + 0.035 * g * pl; P.torso.dy = -4 * g;
        P.fistL.rot = 16 * g; P.fistR.rot = -16 * g;
        P.fistL.dx = Math.sin(u * 70) * 3 * g; P.fistR.dx = -Math.sin(u * 70) * 3 * g;
        P.legL.dy = P.legR.dy = 4 * g; P.pauldronL.rot = 4 * g; P.pauldronR.rot = -4 * g;
    },
    nova(P, u) {
        const c = ease(u / 0.62), rel = u > 0.62 ? Math.exp(-(u - 0.62) * 6) : 0, fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            P.body.dy = -26 * c + Math.sin(u * 50) * 2 * c;
            P.wingL.rot = 32 * c + fl * 5 * c; P.wingR.rot = -32 * c - fl * 5 * c;
            P.dice.dy = -22 * c; P.dice.sc = 1 + 0.09 * c; P.dice.rot = Math.sin(u * 40) * 4 * c;
        } else {
            P.body.dy = -26 * rel + 10 * (1 - rel) * Math.exp(-(u - 0.66) * 3);
            P.wingL.rot = 32 * rel - 18 * (1 - rel) * Math.exp(-(u - 0.66) * 4); P.wingR.rot = -P.wingL.rot;
            P.dice.dy = -22 * rel; P.dice.sc = 1 + 0.09 * rel;
        }
    },
    flap(P, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        P.body.dy = -14 * g + Math.sin(u * 30) * 3 * g;
        P.wingL.rot = Math.sin(u * 70) * 26 * g + 8 * g; P.wingR.rot = -Math.sin(u * 70) * 26 * g - 8 * g;
        P.dice.rot = Math.sin(u * 45) * 9 * g; P.dice.dy = Math.sin(u * 55) * 8 * g;
    },
};

// ---- effects, drawn in source-art space on top of the parts ---------------
const FX = {
    slam(ctx, u) {
        if (u < 0.5) return 0;
        const v = (u - 0.5) / 0.5;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.12; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(255,235,190,' + (0.7 * (1 - r)) + ')'; ctx.lineWidth = 14 * (1 - r) + 2;
            ctx.beginPath(); ctx.ellipse(610, 690, 60 + r * 620, 18 + r * 120, 0, 0, 7); ctx.stroke();
        }
        for (let i = 0; i < 14; i++) {
            const a = i * 0.9 + 1, d = v * (180 + (i % 5) * 40), y = 690 - Math.sin(v * 3) * 60 * (1 + (i % 3) * 0.3);
            ctx.fillStyle = 'rgba(190,170,140,' + (0.6 * (1 - v)) + ')'; ctx.beginPath();
            ctx.arc(610 + Math.cos(a) * d * (i % 2 ? 1 : -1), y - Math.abs(Math.sin(a)) * 30, 8 + (i % 4) * 4 * (1 - v), 0, 7); ctx.fill();
        }
        return 0;
    },
    charge(ctx, u, dy) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        const gr = ctx.createRadialGradient(640, 160 + dy, 10, 640, 160 + dy, 170 + 60 * pl);
        gr.addColorStop(0, 'rgba(180,255,150,' + (0.8 * g) + ')'); gr.addColorStop(1, 'rgba(120,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(640, 160 + dy, 230, 0, 7); ctx.fill();
        for (let i = 0; i < 26; i++) {
            const ph = ((u * 1.4 + i / 26) % 1), ang = i * 2.399, rr = (1 - ph) * 520 * Math.min(1, g * 1.4);
            ctx.fillStyle = 'rgba(190,255,170,' + (g * ph) + ')'; ctx.beginPath();
            ctx.arc(650 + Math.cos(ang) * rr, 300 + dy + Math.sin(ang) * rr * 0.7, 5 + 6 * ph, 0, 7); ctx.fill();
        }
        if (u > 0.82) {
            const v = (u - 0.82) / 0.18;
            ctx.strokeStyle = 'rgba(210,255,190,' + (1 - v) + ')'; ctx.lineWidth = 26 * (1 - v) + 3;
            ctx.beginPath(); ctx.arc(650, 300 + dy, 60 + v * 620, 0, 7); ctx.stroke();
            return 0.45 * (1 - v);
        }
        return 0;
    },
    nova(ctx, u, dy) {
        const ex = 694, ey = 300 + dy, c = ease(u / 0.62), fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            const gr = ctx.createRadialGradient(ex, ey, 5, ex, ey, 90 + 170 * c);
            gr.addColorStop(0, 'rgba(200,255,255,' + (0.95 * c) + ')'); gr.addColorStop(1, 'rgba(40,220,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, ey, 90 + 170 * c + fl * 20, 0, 7); ctx.fill();
            for (let i = 0; i < 30; i++) {
                const ph = ((u * 1.6 + i / 30) % 1), ang = i * 2.399, rr = (1 - ph) * 600 * Math.min(1, c * 1.5);
                ctx.fillStyle = 'rgba(150,240,255,' + (c * ph) + ')'; ctx.beginPath();
                ctx.arc(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr * 0.8, 4 + 6 * ph, 0, 7); ctx.fill();
            }
            return 0;
        }
        const v = (u - 0.66) / 0.34;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.1; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(190,250,255,' + (0.9 * (1 - r)) + ')'; ctx.lineWidth = 30 * (1 - r) + 3;
            ctx.beginPath(); ctx.arc(ex, ey, 40 + r * 1100, 0, 7); ctx.stroke();
        }
        return 0.55 * Math.max(0, 1 - v * 2.5);
    },
    flap(ctx, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        for (let i = 0; i < 10; i++) {
            const ph = ((u * 2 + i / 10) % 1), side = i % 2 ? 1 : -1;
            ctx.strokeStyle = 'rgba(190,240,255,' + (0.5 * g * (1 - ph)) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(668 + side * (330 + ph * 380), 200 + ph * 260);
            ctx.lineTo(668 + side * (380 + ph * 470), 240 + ph * 300); ctx.stroke();
        }
        return 0;
    },
};
const SHAKE = { slam: (u) => (u >= 0.5 ? 9 * Math.max(0, 1 - (u - 0.5) * 4) : 0) };

// ---- plumbing ------------------------------------------------------------
const _imgCache = {};
function _partImg(bossId, part) {
    const key = bossId + '/' + part;
    if (!_imgCache[key]) {
        const im = new Image();
        im.src = RIG_DIR + bossId + '/' + part + '.webp';
        _imgCache[key] = im;
    }
    return _imgCache[key];
}

const _running = {};   // monsterId -> true while an animation owns that card

function _findArt(monsterId) {
    const card = document.getElementById('eg-card-' + monsterId);
    return card ? card.querySelector('.eg-monster-emoji-compact') : null;
}

function _play(monsterId, bossId, animName, ms) {
    const rig = RIGS[bossId];
    if (!rig || !POSES[animName] || _running[monsterId]) return;
    const imgs = rig.parts.map((p) => _partImg(bossId, p.n));
    // Art not decoded yet (first use): skip this cue, it will be ready next time.
    if (!imgs.every((im) => im.complete && im.naturalWidth)) return;
    let art = _findArt(monsterId);
    if (!art) return;

    _running[monsterId] = true;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;           // art centred in a 2x area so rings can spill out
    canvas.style.cssText = 'position:absolute;left:50%;top:50%;width:200%;height:200%;'
        + 'transform:translate(-50%,-50%);pointer-events:none;z-index:6;';
    const ctx = canvas.getContext('2d');
    const by = {};
    const poses = {};
    rig.parts.forEach((p) => { by[p.n] = p; poses[p.n] = { rot: 0, dx: 0, dy: 0, sc: 1 }; });
    const chainOf = (p) => { const c = []; for (let q = p; q; q = q.par ? by[q.par] : null) c.unshift(q); return c; };
    const rootName = rig.parts.find((p) => !p.par).n;
    let hiddenImg = null;

    const attach = () => {
        art = _findArt(monsterId);
        if (!art) return false;
        if (getComputedStyle(art).position === 'static') art.style.position = 'relative';
        hiddenImg = art.querySelector('img');
        if (hiddenImg) hiddenImg.style.visibility = 'hidden';
        art.appendChild(canvas);
        return true;
    };
    const finish = () => {
        if (hiddenImg) hiddenImg.style.visibility = '';
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        const a = _findArt(monsterId);
        if (a) { const im = a.querySelector('img'); if (im) im.style.visibility = ''; }
        delete _running[monsterId];
    };
    if (!attach()) { delete _running[monsterId]; return; }

    const S = rig.S, t0 = performance.now();
    const frame = (now) => {
        const u = (now - t0) / ms;
        if (u >= 1) return finish();
        // The encounter re-renders cards; follow the live one if ours was dropped.
        if (!canvas.isConnected && !attach()) return finish();
        for (const k in poses) { const o = poses[k]; o.rot = o.dx = o.dy = 0; o.sc = 1; }
        POSES[animName](poses, u);
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.save();
        ctx.translate(256, 256);                      // the 512px art sits in the middle of the canvas
        const sh = SHAKE[animName] ? SHAKE[animName](u) : 0;
        if (sh) ctx.translate((Math.random() - 0.5) * sh * S, (Math.random() - 0.5) * sh * S);
        rig.parts.forEach((p, i) => {
            ctx.save();
            for (const q of chainOf(p)) {
                const o = poses[q.n];
                ctx.translate(o.dx * S, o.dy * S);
                ctx.translate(q.px, q.py); ctx.rotate(o.rot * Math.PI / 180); ctx.scale(o.sc, o.sc); ctx.translate(-q.px, -q.py);
            }
            ctx.drawImage(imgs[i], p.x, p.y);
            ctx.restore();
        });
        ctx.save();
        ctx.translate(rig.ox, rig.oy); ctx.scale(S, S);
        const flash = FX[animName](ctx, u, poses[rootName].dy);
        ctx.restore();
        ctx.restore();
        if (flash > 0) {
            const g = ctx.createRadialGradient(512, 512, 10, 512, 512, 420);
            g.addColorStop(0, 'rgba(255,255,255,' + flash + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

function _onBossMechanic(ev) {
    try {
        const d = (ev && ev.detail) || {};
        const art = _findArt(d.monsterId);
        if (!art) return;
        const img = art.querySelector('img');
        const src = img ? String(img.getAttribute('src') || '') : '';
        const bossId = Object.keys(RIGS).find((id) => src.indexOf('/' + id + '.') !== -1);
        if (!bossId) return;
        const m = RIGS[bossId].mechanics[d.mech];
        if (!m) return;
        _play(d.monsterId, bossId, m.anim, m.ms(Number(d.phase) || 1));
    } catch (e) { /* purely cosmetic - never let it surface */ }
}

document.addEventListener('eg-boss-mechanic', _onBossMechanic);

// Warm the part images shortly after boot (~170 KB total) so the very first
// ability of a fight already has its art decoded and is not skipped.
setTimeout(() => {
    try { Object.keys(RIGS).forEach((id) => RIGS[id].parts.forEach((p) => _partImg(id, p.n))); } catch (e) { /* cosmetic only */ }
}, 4000);
