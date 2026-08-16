// Residual Analysis



// ⚡🔬 Residual Analysis: High-Voltage Lightning Strike Effect
function playResidualAnalysisEffect(row, col) {
    const wrap = document.getElementById('puzzle-scaler');
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!wrap || !cell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();

    // Calculate logical center coordinates relative to scaling container
    const cx = (cRect.left - wRect.left + cRect.width / 2) / zoom;
    const cy = (cRect.top - wRect.top + cRect.height / 2) / zoom;

    // Allocate a longer overlay window (1.2 seconds) to let sparks crackle out
    const overlay = _fxOverlay(wrap, 1200);

    // --- STEP 1: GENERATE JAGGED LIGHTNING SVG ---
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("style", "position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:999;");

    const polyline = document.createElementNS(svgNS, "polyline");

    // Build procedural jagged trajectory nodes from top boundary (y=0) to targets
    let points = `${cx},0 `;
    const segments = 6;
    const stepY = cy / segments;
    let currentY = 0;

    for (let i = 1; i < segments; i++) {
        currentY += stepY;
        // Jitter horizontally away from axis to form electric branching
        const jitterX = cx + (Math.random() * 40 - 20);
        points += `${jitterX},${currentY} `;
    }
    points += `${cx},${cy}`; // Snap strike vector straight to target cell

    // Style the structural neon elements
    polyline.setAttribute("points", points);
    polyline.setAttribute("stroke", "#00ffff");
    polyline.setAttribute("stroke-width", "4");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("filter", "drop-shadow(0 0 10px #70e0ff) drop-shadow(0 0 2px #ffffff)");

    // Inject rapid lightning ionization flicker keyframes
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fx-lightning-strike {
            0% { opacity: 0; stroke-width: 2; }
            5% { opacity: 1; stroke-width: 6; stroke: #ffffff; }
            15% { opacity: 0.3; stroke-width: 3; }
            20% { opacity: 1; stroke-width: 5; stroke: #00ffff; }
            35% { opacity: 0.2; }
            40% { opacity: 0.9; stroke-width: 3; }
            100% { opacity: 0; stroke-width: 0; }
        }
    `;
    polyline.setAttribute("style", "animation: fx-lightning-strike 0.35s ease-out forwards;");

    svg.appendChild(style);
    svg.appendChild(polyline);
    overlay.appendChild(svg);

    // --- STEP 2: SPAWN SUSTAINED ELECTRICAL SPARKS ---
    // Fires instantly on strike impact, lingering for ~1000ms
    _fxSpawnParticles({
        count: 20,
        chars: ['⚡', '✨', '·', '▫️'],
        colors: ['#00ffff', '#ffffff', '#70e0ff', '#008b8b'],
        sizeMin: 10,
        sizeMax: 18,
        container: overlay,
        startX: cx,
        startY: cy,
        spreadX: 45,
        spreadY: 45,
        duration: 1000,
        cssClass: 'fx-particle-generic'
    });
}




// standard deviation node
function createBeamEffect(srcRow, srcCol, tgtRow, tgtCol) {
    // FIX 1: Updated selectors to check 'g-r-c' first to match your actual grid DOM convention
    const srcEl = document.getElementById(`g-${srcRow}-${srcCol}`) || document.getElementById(`cell-${srcRow}-${srcCol}`) || document.querySelector(`[data-row="${srcRow}"][data-col="${srcCol}"]`);
    const tgtEl = document.getElementById(`g-${tgtRow}-${tgtCol}`) || document.getElementById(`cell-${tgtRow}-${tgtCol}`) || document.querySelector(`[data-row="${tgtRow}"][data-col="${tgtCol}"]`);

    if (!srcEl || !tgtEl) return;

    // Grab viewport-relative bounding dimensions
    const srcRect = srcEl.getBoundingClientRect();
    const tgtRect = tgtEl.getBoundingClientRect();

    // Determine target coordinate midpoints (absolute page positioning)
    const srcX = srcRect.left + srcRect.width / 2 + window.scrollX;
    const srcY = srcRect.top + srcRect.height / 2 + window.scrollY;
    const tgtX = tgtRect.left + tgtRect.width / 2 + window.scrollX;
    const tgtY = tgtRect.top + tgtRect.height / 2 + window.scrollY;

    // Linear algebra calculations for the DOM line element
    const deltaX = tgtX - srcX;
    const deltaY = tgtY - srcY;
    const distance = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Build the dynamic beam line element
    const beam = document.createElement('div');
    beam.className = 'sd-beam-effect';
    beam.style.width = `${distance}px`;
    beam.style.left = `${srcX}px`;
    beam.style.top = `${srcY}px`;

    // FIX 2: Bind the calculated angle to the CSS variable '--rotation' so keyframes don't break it
    beam.style.setProperty('--rotation', `${angle}deg`);
    beam.style.transform = `rotate(${angle}deg)`;

    document.body.appendChild(beam);

    // Gracefully sweep the DOM clean after animation completes
    setTimeout(() => {
        beam.remove();
    }, 600);
}




// 📈 Sample Efficiency: Dark scan wave + converging particles + reveal flash
function playSampleEfficiencyEffect(targetRow, targetCol) {
    const wrap = document.getElementById('puzzle-scaler');
    const targetCell = document.getElementById(`g-${targetRow}-${targetCol}`);
    if (!wrap || !targetCell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const tRect = targetCell.getBoundingClientRect();

    // 1a. Grid Center (for the wave origin)
    const cx = (wRect.width / 2) / zoom;
    const cy = (wRect.height / 2) / zoom;

    // 1b. Target Cell Center (for the particle destination)
    const tx = (tRect.left - wRect.left + tRect.width / 2) / zoom;
    const ty = (tRect.top - wRect.top + tRect.height / 2) / zoom;

    // 2. Create the temporary overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:absolute; inset:0;
        pointer-events:none;
        z-index:326; 
        overflow:hidden;
    `;
    wrap.appendChild(overlay);

    // 3. Inject the dynamic CSS animations 
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fx-se-wave {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; border-width: 4px; }
            100% { transform: translate(-50%, -50%) scale(25); opacity: 0; border-width: 1px; }
        }
        @keyframes fx-se-particle {
            0% { transform: translate(var(--startX), var(--startY)) scale(0); opacity: 0; }
            15% { transform: translate(var(--startX), var(--startY)) scale(1); opacity: 1; }
            95% { transform: translate(var(--targetX), var(--targetY)) scale(0.3); opacity: 1; }
            100% { transform: translate(var(--targetX), var(--targetY)) scale(0); opacity: 0; } /* Vanish exactly on impact */
        }
        .fx-se-flash {
            animation: fx-se-cell-pop 0.6s ease-out forwards;
        }
        @keyframes fx-se-cell-pop {
            0% { filter: brightness(2) saturate(1.5); transform: scale(1.2); box-shadow: 0 0 20px #ffd700; z-index: 50; }
            100% { filter: brightness(1) saturate(1); transform: scale(1); box-shadow: none; z-index: 1; }
        }
    `;
    overlay.appendChild(style);

    // 4. Trigger the expanding dark wave (Slowed down to 1.2s)
    const wave = document.createElement('div');
    wave.style.cssText = `
        position: absolute;
        left: ${cx}px; top: ${cy}px; 
        width: 100px; height: 100px;
        border: 2px solid rgba(0, 0, 0, 0.6);
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.4) inset;
        border-radius: 50%;
        animation: fx-se-wave 1.2s ease-out forwards; 
    `;
    overlay.appendChild(wave);

    // 5. Gather previously completed correct cells to serve as particle origins
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) {
                if (r !== targetRow || c !== targetCol) {
                    const el = document.getElementById(`g-${r}-${c}`);
                    if (el) pool.push(el);
                }
            }
        }
    }

    const maxParticles = 12;
    const shuffledPool = pool.sort(() => Math.random() - 0.5).slice(0, maxParticles);

    // The universal time of impact for all particles (in seconds)
    const impactTime = 1.3;

    // 6. Spawn particles and animate them converging
    shuffledPool.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const sx = (rect.left - wRect.left + rect.width / 2) / zoom;
        const sy = (rect.top - wRect.top + rect.height / 2) / zoom;

        // Randomize the spawn delay, but strictly link the travel duration to it
        const delay = 0.3 + Math.random() * 0.4; // Particles spawn between 0.3s and 0.7s
        const duration = impactTime - delay;     // Math ensures every particle hits at exactly 1.3s

        const p = document.createElement('div');
        p.style.cssText = `
            position: absolute;
            left: 0; top: 0;
            width: 8px; height: 8px;
            background-color: #ffd700;
            border-radius: 50%;
            box-shadow: 0 0 6px #ffd700;
            --startX: ${sx}px;
            --startY: ${sy}px;
            --targetX: ${tx}px;
            --targetY: ${ty}px;
            animation: fx-se-particle ${duration}s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
            animation-delay: ${delay}s;
        `;
        overlay.appendChild(p);
    });

    // 7. Flash the target cell precisely on impact
    setTimeout(() => {
        targetCell.classList.add('fx-se-flash');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('sample_efficiency_pop');

        setTimeout(() => targetCell.classList.remove('fx-se-flash'), 600);
        setTimeout(() => overlay.remove(), 700); // Wait for the flash to finish before cleaning DOM
    }, impactTime * 1000); // 1.3s * 1000 = 1300ms
}






/*


// 〰️ Stochastic Resonance: Colliding mistake (red) and opposing (blue) pulses
function playStochasticResonanceEffect(mistakeRow, mistakeCol, targetRow, targetCol) {
    const wrap = document.getElementById('puzzle-scaler');
    const targetCell = document.getElementById(`g-${targetRow}-${targetCol}`);
    const mistakeCell = document.getElementById(`g-${mistakeRow}-${mistakeCol}`);
    if (!wrap || !targetCell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const tRect = targetCell.getBoundingClientRect();

    // 1. Target coordinates (the intersection/collision point)
    const tx = (tRect.left - wRect.left + tRect.width / 2) / zoom;
    const ty = (tRect.top - wRect.top + tRect.height / 2) / zoom;

    // 2. Mistake coordinates (Red pulse origin)
    let mx = tx - 100; // Sensible defaults if mistakeCell isn't provided/found
    let my = ty - 100;
    if (mistakeCell) {
        const mRect = mistakeCell.getBoundingClientRect();
        mx = (mRect.left - wRect.left + mRect.width / 2) / zoom;
        my = (mRect.top - wRect.top + mRect.height / 2) / zoom;
    }

    // 3. Project opposite end coordinates (Blue pulse origin)
    // We calculate the vector from mistake to target, and mirror it past the target
    const dx = tx - mx;
    const dy = ty - my;
    const bx = tx + dx;
    const by = ty + dy;

    // 4. Create overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute; inset:0; pointer-events:none; z-index:326; overflow:hidden;`;
    wrap.appendChild(overlay);

    // 5. Inject dynamic smooth travel keyframes
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fx-sr-travel-red {
            0% { transform: translate(var(--startX), var(--startY)) scale(0.3); opacity: 0; }
            15% { opacity: 0.7; }
            100% { transform: translate(var(--targetX), var(--targetY)) scale(1.5); opacity: 0.9; }
        }
        @keyframes fx-sr-travel-blue {
            0% { transform: translate(var(--startX), var(--startY)) scale(0.3); opacity: 0; }
            15% { opacity: 0.7; }
            100% { transform: translate(var(--targetX), var(--targetY)) scale(1.5); opacity: 0.9; }
        }
        .fx-sr-flash { animation: fx-sr-pop 0.6s ease-out forwards; }
        @keyframes fx-sr-pop { 
            0% { filter: brightness(2.5) saturate(1.5); transform: scale(1.2); box-shadow: 0 0 25px #00ffff; z-index: 50; }
            100% { filter: brightness(1) saturate(1); transform: scale(1); box-shadow: none; z-index: 1; }
        }
    `;
    overlay.appendChild(style);

    const travelTime = 1.2; // Adjusted to move slow and build anticipation

    // 6. Spawn the Red Circle (Starts at Mistake, travels to Target)
    const redCircle = document.createElement('div');
    redCircle.style.cssText = `
        position: absolute; left: 0; top: 0; width: 40px; height: 40px; margin-left: -20px; margin-top: -20px;
        border-radius: 50%; border: 3px solid #ff3232; box-shadow: 0 0 12px #ff3232, inset 0 0 12px #ff3232;
        --startX: ${mx}px; --startY: ${my}px; --targetX: ${tx}px; --targetY: ${ty}px;
        animation: fx-sr-travel-red ${travelTime}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    `;
    overlay.appendChild(redCircle);

    // 7. Spawn the Blue Circle (Starts at Opposite point, travels to Target)
    const blueCircle = document.createElement('div');
    blueCircle.style.cssText = `
        position: absolute; left: 0; top: 0; width: 40px; height: 40px; margin-left: -20px; margin-top: -20px;
        border-radius: 50%; border: 3px solid #3232ff; box-shadow: 0 0 12px #3232ff, inset 0 0 12px #3232ff;
        --startX: ${bx}px; --startY: ${by}px; --targetX: ${tx}px; --targetY: ${ty}px;
        animation: fx-sr-travel-blue ${travelTime}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    `;
    overlay.appendChild(blueCircle);

    // 8. Handle the collision point (Resonance pop)
    setTimeout(() => {
        // Remove traveling elements right on impact so they look like they fuse
        redCircle.remove();
        blueCircle.remove();

        targetCell.classList.add('fx-sr-flash');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('item_revealed');

        setTimeout(() => {
            targetCell.classList.remove('fx-sr-flash');
            overlay.remove();
        }, 600);
    }, travelTime * 1000);
}

*/

// 〰️ Stochastic Resonance: Static expanding pulses
function playStochasticResonanceEffect(mistakeRow, mistakeCol, targetRow, targetCol) {
    const wrap = document.getElementById('puzzle-scaler');
    const targetCell = document.getElementById(`g-${targetRow}-${targetCol}`);
    const mistakeCell = document.getElementById(`g-${mistakeRow}-${mistakeCol}`);
    if (!wrap || !targetCell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const tRect = targetCell.getBoundingClientRect();

    // 1. Target Center (Intersection point)
    const tx = (tRect.left - wRect.left + tRect.width / 2) / zoom;
    const ty = (tRect.top - wRect.top + tRect.height / 2) / zoom;

    // 2. Mistake Center (Red Origin)
    let mx = tx - 100, my = ty - 100;
    if (mistakeCell) {
        const mRect = mistakeCell.getBoundingClientRect();
        mx = (mRect.left - wRect.left + mRect.width / 2) / zoom;
        my = (mRect.top - wRect.top + mRect.height / 2) / zoom;
    }

    // 3. Blue Origin (Mirror point)
    const bx = tx + (tx - mx), by = ty + (ty - my);

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute; inset:0; pointer-events:none; z-index:326; overflow:hidden;`;
    wrap.appendChild(overlay);

    const style = document.createElement("style");
    style.textContent = `
        .fx-sr-pulse {
            position: absolute;
            width: 40px; height: 40px;
            border-radius: 50%;
            border: 4px solid var(--color);
            box-shadow: 0 0 20px var(--color);
            left: var(--originX);
            top: var(--originY);
            transform: translate(-50%, -50%) scale(0);
            animation: fx-sr-grow 1.5s ease-out forwards;
        }
        @keyframes fx-sr-grow {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            10% { opacity: 1; }      /* Fade in quickly */
            85% { opacity: 1; }      /* STAY visible for almost the whole duration */
            100% { transform: translate(-50%, -50%) scale(var(--finalScale)); opacity: 0; } /* Only fade out at the very last moment */
        }
        .fx-sr-flash { animation: fx-sr-pop 0.6s ease-out forwards; }
        @keyframes fx-sr-pop { 
            0% { filter: brightness(3) saturate(2); transform: scale(1.2); box-shadow: 0 0 25px cyan; }
            100% { filter: brightness(1); transform: scale(1); box-shadow: none; }
        }
    `;
    overlay.appendChild(style);

    // Calculate distance to target to determine how much the circle needs to grow to "reach" it
    const getDist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
    const redDist = getDist(mx, my, tx, ty);
    const blueDist = getDist(bx, by, tx, ty);

    // Helper to create the static expanding circle
    const createStaticPulse = (originX, originY, color, dist) => {
        const p = document.createElement('div');
        p.className = 'fx-sr-pulse';
        p.style.setProperty('--color', color);
        p.style.setProperty('--originX', `${originX}px`);
        p.style.setProperty('--originY', `${originY}px`);
        // Scale 1 is 40px diameter. We need to reach 'dist' radius.
        // Formula: scale = (distance * 2) / base_size
        p.style.setProperty('--finalScale', (dist * 2) / 40);
        overlay.appendChild(p);
    };

    createStaticPulse(mx, my, '#ff3232', redDist); // Red
    createStaticPulse(bx, by, '#3232ff', blueDist); // Blue

    // Trigger resonance flash when they finish growing
    setTimeout(() => {
        targetCell.classList.add('fx-sr-flash');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('stochastic_resonance_pop');
        setTimeout(() => {
            targetCell.classList.remove('fx-sr-flash');
            overlay.remove();
        }, 800);
    }, 1400); // Wait for the 1.5s grow animation
}