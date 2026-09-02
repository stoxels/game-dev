//------------------------------------------------------------------------
//-------------------ARTIFACT COMPLETE — CODEX OF COMPLETION----------------------
//------------------------------------------------------------------------

// artifactComplete (Codex of Completion) — reveals every remaining cell.
function _useArtifactComplete(id, def) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1) {
                revealedGrid[r][c] = true;
                userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
            }
        }
    }

    playItemEffect(id);
    checkWin();
    return `🌟 ${t('item_artifact_complete')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: spawns the starburst rays radiating from the artifact centre.
function _fxMakeArtifactRays(container, cx, cy, rayLength) {
    for (let i = 0; i < 16; i++) {
        const ray = document.createElement('div');
        ray.className = 'fx-artifact-ray';
        ray.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            transform-origin:0 0;
            transform:translate(-50%,-50%) rotate(${(i / 16) * 360}deg);
            animation:fx-artifact-ray-shoot 1s ease-out ${i * 0.04}s forwards;
            --ray-len:${rayLength}px;
        `;
        container.appendChild(ray);
    }
}

// Helper: creates the gold grid-fill flash div for the artifact.
function _fxMakeArtifactFill(container, r) {
    const fill = document.createElement('div');
    fill.className = 'fx-artifact-fill';
    fill.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
    `;
    container.appendChild(fill);
}

// 🌟 Artifact Complete — full golden supernova engulfs the grid.
function _fxArtifact() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2400, `z-index:${FX_Z.supreme - 1};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rayLength = Math.max(r.width, r.height) * 0.75;

    _fxMakeArtifactFill(overlay, r);
    _fxMakeArtifactRays(overlay, cx, cy, rayLength);

    // Shower of gold stars across the whole grid
    _fxSpawnParticles({
        ...PARTICLES.artifactStars,
        count: 32, sizeMin: 14, sizeMax: 30,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 1600, cssClass: 'fx-artifact-star',
    });

    _fxMakeIcon(r.wrap, '🌟', cx, cy, 88,
        `z-index:${FX_Z.supreme + 1}; animation:fx-artifact-icon 1.8s ease-out forwards;`, 2200);

    Audio_Manager.playSFX('codex_of_completion');
}
