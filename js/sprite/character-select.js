//------------------------------------------------------------------------
//-------------------CHARACTER SELECTION----------------------------------
//------------------------------------------------------------------------
// Shows a character selection screen the first time a new game starts
// (i.e. no playerCharacter set in STATE). After selection the normal
// tutorial / setup flow resumes.
//------------------------------------------------------------------------

const CHARACTERS = {
    stox: {
        id: 'stox',
        name: 'STOX',
        nameDE: 'STOX',
        tagline: 'The Analyst',
        taglineDE: 'Der Analytiker',
        background: 'Raised in the Cartographers\' Guild archive, Stox has read every record of the day the Apex broke - and none of it adds up. He\'s out of pages to search, so now he searches in person.',
        backgroundDE: 'Im Archiv der Kartografengilde aufgewachsen, hat Stox jede Aufzeichnung über den Tag gelesen, an dem der Apex zerbrach - und nichts ergibt einen Sinn. Ihm sind die Seiten ausgegangen, also sucht er jetzt selbst.',
        personality: 'Dry, methodical, and quietly relentless. He trusts data over instinct, and a good pattern over a good feeling.',
        personalityDE: 'Trocken, methodisch und still unerbittlich. Er vertraut Daten mehr als Instinkt, und einem guten Muster mehr als einem guten Gefühl.',
        strength: 'Reads patterns fast and rarely panics under pressure - mistakes are just data points to him, not setbacks.',
        strengthDE: 'Erkennt Muster schnell und gerät selten in Panik - Fehler sind für ihn nur Datenpunkte, keine Rückschläge.',
        image: 'images/sprites/Stox_noclass.webp',
        accentColor: '#4fc3f7',
        glowColor: 'rgba(79,195,247,0.35)',
        traits: [
            {
                icon: '🧠',
                nameEn: 'Process of Elimination',
                nameDE: 'Ausschlussverfahren',
                descEn: '+10% chance to auto-remove one wrong multiple-choice answer. Stacks with Probability Tree passives.',
                descDE: '+10% Chance, eine falsche Multiple-Choice-Antwort automatisch zu entfernen. Wirkt zusammen mit passiven Effekten vom Wahrscheinlichkeitsbaum.',
            },
            {
                icon: '🛡️',
                nameEn: 'Unshakeable',
                nameDE: 'Unerschütterlich',
                descEn: 'Mistake penalties escalate 30% more slowly.',
                descDE: 'Fehlerstrafen steigen 30% langsamer an.',
            },
        ],
    },
    trix: {
        id: 'trix',
        name: 'TRIX',
        nameDE: 'TRIX',
        tagline: 'The Trickster',
        taglineDE: 'Die Trickserin',
        background: 'The last of a colony exiled for claiming the Variance Collapse was no accident, Trix grew up alone in a dying observatory deep in the Regression Rift. Now its readings are sliding toward zero, and she\'s come for answers.',
        backgroundDE: 'Als Letzte einer Kolonie, die verbannt wurde, weil sie behauptete, der Varianz-Kollaps sei kein Unfall gewesen, wuchs Trix allein in einem sterbenden Observatorium tief im Regressionsrift auf. Jetzt nähern sich dessen Messwerte der Null, und sie sucht Antworten.',
        personality: 'Cocky, sharp-tongued, and supremely confident - mostly because she\'s usually right.',
        personalityDE: 'Frech, schlagfertig und überaus selbstbewusst - meist, weil sie meistens recht hat.',
        strength: 'Thrives on risk and reads dangerous situations like a game she already knows how to win.',
        strengthDE: 'Blüht im Risiko auf und liest gefährliche Situationen wie ein Spiel, das sie schon gewonnen hat.',
        image: 'images/sprites/Trix_noclass.webp',
        accentColor: '#ce93d8',
        glowColor: 'rgba(206,147,216,0.35)',

        traits: [
            {
                icon: '🎓',
                nameEn: 'Silver Tongue',
                nameDE: 'Silberzunge',
                descEn: 'Enables the use of Tutor items for answering questions. +10% chance that a Tutor item answers a question correctly.',
                descDE: 'Ermöglicht die Verwendung von Tutor-Gegenständen zum Beantworten von Fragen. +10% Chance, dass ein Tutor-Gegenstand eine Frage richtig beantwortet.',
            },
            {
                icon: '🎲',
                nameEn: 'Loaded Dice',
                nameDE: 'Gezinkte Würfel',
                descEn: '15% Increased chance of lucky tiles in large and massive grids. 15% Increased chance of lucky item drops when replaying already completed levels. Both effects work without passive-tree skills.',
                descDE: '15% Erhöhte Chance auf Glücksfelder in großen und massiven Gittern. 15% Erhöhte Chance auf Glücks-Gegenstände beim Wiederholen bereits abgeschlossener Level. Beide Effekte funktionieren ohne passive Baum-Fähigkeiten.',
            },
        ],

    },
    syla: {
        id: 'syla',
        name: 'SYLA',
        nameDE: 'SYLA',
        tagline: 'The Naturalist',
        taglineDE: 'Die Naturalistin',
        background: 'Syla spent years listening to her home forest - until corruption locked inside it for three hundred quiet years began spreading. Her notebooks have the proof. She came to the Outpost to find help.',
        backgroundDE: 'Syla verbrachte Jahre damit, ihrem Heimatwald zuzuhören - bis die Korruption, die dreihundert ruhige Jahre lang darin eingeschlossen war, sich auszubreiten begann. Ihre Notizbücher liefern den Beweis. Sie kam zum Außenposten um Hilfe zu finden.',
        personality: 'Warm, patient, and endlessly forgiving of mistakes - she sees every setback as just part of growing.',
        personalityDE: 'Warmherzig, geduldig und unendlich nachsichtig bei Fehlern - sie sieht jeden Rückschlag einfach als Teil des Wachsens.',
        strength: 'Stays calm and steady no matter how badly things are going, and bounces back quickly from setbacks.',
        strengthDE: 'Bleibt ruhig und gefasst, egal wie schlecht es läuft, und erholt sich schnell von Rückschlägen.',
        image: 'images/sprites/Syla_noclass.webp',
        accentColor: '#66bb6a',
        glowColor: 'rgba(102,187,106,0.35)',

        traits: [
            {
                icon: '💡',
                nameEn: 'Quick Study',
                nameDE: 'Schnell gelernt',
                descEn: 'Exercise hints will appear after one less incorrectly answered question. While playing Syla this requires at most 4 incorrect answers. Probability Tree effects can lower the amount of incorrect answers down to 0.',
                descDE: 'Aufgabenhinweise erscheinen nach einer falsch beantworteten Frage weniger. Beim Spielen von Syla sind höchstens 4 falsche Antworten erforderlich. Effekte des Wahrscheinlichkeitsbaums können die Anzahl der falschen Antworten auf 0 reduzieren.',
            },
            {
                icon: '🌿',
                nameEn: "Nature's Aid",
                nameDE: 'Hilfe der Natur',
                descEn: 'On levels with remaining vegetation, nature reveals one correct tile at the start.',
                descDE: 'In Leveln mit verbleibender Vegetation enthüllt die Natur zu Beginn ein korrektes Feld.',
            },
        ],
    }
};


// showCharacterSelect - shows the character select screen.
// onSelect(characterId) is called once the player confirms.
function showCharacterSelect(onSelect) {
    switchScreen('screen-character-select');
    _buildCharacterSelectUI(onSelect);
    // The intro hands us its frozen last frame (37.webp) after the song
    // played out naturally. That frame IS the visual for the first moment -
    // the select screen mounts hidden underneath it and only fades in over
    // the identical artwork when the dissolve starts (below). Any other path
    // (intro skipped, replay from the gallery, no frozen frame) just shows
    // the select screen directly.
    _csiDissolveIntroOverlay();
}

// How long the bare final artwork stands alone (no UI) after the intro's
// natural end before the select screen crossfades in over it.
const CSI_FINAL_FRAME_HOLD_MS = 1000;

// Dissolves the intro overlay the engine froze for us (see close() in
// storyline-engine.js). Only a NATURAL song end hands over a frozen frame
// flagged __csiIntroFinalFrame: the screen stays hidden behind the bare
// artwork for ~1s, then crossfades in - the artwork underneath is the very
// image the song ended on, so the fade reads as one continuous scene.
// Everything else (a skip hands over no overlay at all; a replay from the
// gallery tears down normally) removes the frozen overlay immediately and
// shows the select screen straight away.
function _csiDissolveIntroOverlay() {
    const frozen = window.__csiIntroOverlay;
    const isFinalFrame = window.__csiIntroFinalFrame === true;
    window.__csiIntroOverlay = null; // consumed either way
    window.__csiIntroFinalFrame = false;
    if (!frozen || !frozen.parentNode) return;
    if (!isFinalFrame) { _csiRemoveFrozenOverlay(frozen); return; }

    // Mount the screen invisibly while the frozen frame stands in for it.
    // switchScreen() already ran; this only suppresses its painting.
    const screen = document.getElementById('screen-character-select');
    if (screen) {
        screen.style.visibility = 'hidden';
        screen.style.opacity = '0';
    }
    // The stage re-parents into fresh innerHTML on every rebuild, so look
    // the artwork up live (a cached node from a previous visit is detached).
    const bg = document.querySelector('#screen-character-select .csi-bg');
    // Artwork not decoded yet (fresh boot straight into the handoff): poll
    // briefly instead of bailing - bailing would tear the frozen intro down
    // abruptly and break the seamless loop.
    const t0 = Date.now();
    const tryDissolve = () => {
        if (!frozen.parentNode) { _csiRevealSelectScreen(); return; } // engine already reclaimed it
        if ((bg && bg.complete && bg.naturalWidth) || Date.now() - t0 >= 4000) {
            // Hold the bare artwork for a beat, then crossfade: the frozen
            // frame fades out while the (initially identical) screen fades in.
            setTimeout(() => {
                frozen.style.transition = 'opacity 0.7s ease';
                frozen.style.opacity = '0';
                _csiRevealSelectScreen();
                setTimeout(() => _csiRemoveFrozenOverlay(frozen), 720);
            }, CSI_FINAL_FRAME_HOLD_MS);
        } else {
            setTimeout(tryDissolve, 100);
        }
    };
    tryDissolve();
}

// The screen was mounted invisible while the frozen intro frame stood in
// for it - fade it back in as the frozen frame dissolves.
function _csiRevealSelectScreen() {
    const screen = document.getElementById('screen-character-select');
    if (!screen) return;
    screen.style.transition = 'opacity 0.7s ease';
    requestAnimationFrame(() => {
        screen.style.opacity = '1';
        setTimeout(() => {
            screen.style.visibility = '';
            screen.style.transition = '';
            screen.style.opacity = '';
        }, 720);
    });
}

function _csiRemoveFrozenOverlay(frozen) {
    if (frozen && frozen.parentNode) frozen.parentNode.removeChild(frozen);
}


//------------------------------------------------------------------------
//-------------------IMAGE CHARACTER SELECT-------------------------------
//------------------------------------------------------------------------
// The select screen reuses the intro's final frame (37.webp - the three
// heroes in the corridor). The intro ends on that exact image, so the
// slideshow loops directly into the choice: same scene, now interactive.
// The three painted characters are invisible hotspots - hovering one shows
// the game's custom tooltip (name, tagline, background, personality,
// strength, traits); clicking selects, clicking again confirms. If the
// artwork is ever missing, the builder falls back to the legacy card UI.

// Hotspot geometry as % of the 1376x768 artwork, measured on the frame:
// [left, top, width, height] per character (they track the image exactly
// because the stage keeps the artwork's aspect ratio). Values tuned against
// a live screenshot of the stage at native aspect.
const CSI_HOTSPOTS = {
    stox: { left: 34.9, top: 50.6, width: 10.9, height: 40.6 },
    trix: { left: 45.1, top: 48.2, width: 10.5, height: 43.2 },
    syla: { left: 54.9, top: 52.2, width: 14.6, height: 40.2 },
};

const CSI_IMAGE_PATH = 'images/Intro/Stoxels_Intro/37.webp';

// Builds the rich tooltip content for one character - everything the old
// cards showed, in the map-view tooltip's visual language.
function _buildCharacterSelectTipContent(char) {
    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    const charName = lang === 'de' ? char.nameDE : char.name;
    const tagline = lang === 'de' ? char.taglineDE : char.tagline;
    const background = lang === 'de' ? char.backgroundDE : char.background;
    const personality = lang === 'de' ? char.personalityDE : char.personality;
    const strength = lang === 'de' ? char.strengthDE : char.strength;
    const labelBackground = lang === 'de' ? 'Hintergrund' : 'Background';
    const labelPersonality = lang === 'de' ? 'Persönlichkeit' : 'Personality';
    const labelStrength = lang === 'de' ? 'Stärke' : 'Strength';
    const labelTraits = lang === 'de' ? 'Fähigkeiten' : 'Traits';

    const traitsHtml = (char.traits || []).map(tr => {
        const trName = lang === 'de' ? tr.nameDE : tr.nameEn;
        const trDesc = lang === 'de' ? tr.descDE : tr.descEn;
        return `<div class="csi-tip-trait">`
            + `<span class="csi-tip-trait-icon">${tr.icon}</span>`
            + `<span class="csi-tip-trait-text">`
            + `<span class="csi-tip-trait-name">${trName}</span>`
            + `<span class="csi-tip-trait-desc">${trDesc}</span>`
            + `</span></div>`;
    }).join('');

    return `<div class="mv-tooltip-title" style="color:${char.accentColor}">${charName}</div>`
        + `<div class="mv-tooltip-sub" style="color:${char.accentColor};opacity:.85">${tagline}</div>`
        + `<div class="csi-tip-section"><span class="csi-tip-label">${labelBackground}</span>${background}</div>`
        + `<div class="csi-tip-section"><span class="csi-tip-label">${labelPersonality}</span>${personality}</div>`
        + `<div class="csi-tip-section"><span class="csi-tip-label">${labelStrength}</span>${strength}</div>`
        + `<div class="csi-tip-section"><span class="csi-tip-label">${labelTraits}</span></div>`
        + traitsHtml;
}

// The select screen has its own tooltip element (the map view's #mv-tooltip
// is shared UI on other screens; a private id avoids any cross-screen leak
// of the wider width this content needs). Same .mv-tooltip base styling.
function _csiEnsureTip() {
    let tip = document.getElementById('csi-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'csi-tooltip';
        tip.className = 'mv-tooltip csi-tooltip';
        document.body.appendChild(tip);
    }
    return tip;
}

function _csiShowTip(e, char) {
    const tip = _csiEnsureTip();
    tip.innerHTML = _buildCharacterSelectTipContent(char);
    tip.style.setProperty('--tip-accent', char.accentColor);
    tip.classList.add('show');
    _csiTrackTip(e);
}

function _csiTrackTip(e) {
    const tip = document.getElementById('csi-tooltip');
    if (!tip) return;
    const rect = tip.getBoundingClientRect();
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    if (x + rect.width > window.innerWidth - 8) x = Math.max(8, e.clientX - rect.width - 14);
    if (y + rect.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - rect.height - 8);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function _csiHideTip() {
    const tip = document.getElementById('csi-tooltip');
    if (tip) tip.classList.remove('show');
}

// The shared confirm handler (image UI + legacy card fallback both funnel
// here): persist the pick, unlock the intro replays, then roll the chosen
// character's intro beat.
function _csiConfirmSelection(selectedId, onSelect) {
    // The character-intro beat takes over the screen next; without this the
    // hover tooltip would ride along on top of the cinematic.
    _csiHideTip();
    STATE.playerCharacter = selectedId;
    // Picking any character permanently unlocks the opening cinematic and
    // all three character-intro replays in the Replay Gallery, regardless
    // of which save slot is active (see storyline-engine.js).
    if (typeof unlockReplayIntroBundle === 'function') unlockReplayIntroBundle();
    save();
    showBeat('character_intro', {
        character: selectedId,
        onComplete: () => {
            if (typeof onSelect === 'function') onSelect(selectedId);
        }
    });
}

// Builds the image-based select UI (see block comment above).
function _buildCharacterSelectUI(onSelect) {
    const container = document.getElementById('char-select-content');
    if (!container) return;
    const screen = document.getElementById('screen-character-select');
    if (!screen) return;
    // The tooltip element lives on <body> and outlives screen rebuilds - a
    // tooltip left open by a previous visit (cursor never sent mouseleave)
    // would otherwise stay visible over the fresh screen.
    _csiHideTip();

    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    let selectedId = null;

    screen.classList.add('csi-mode');
    container.innerHTML = `
        <div class="cs-title csi-title">${lang === 'de' ? 'WÄHLE DEINEN CHARAKTER' : 'CHOOSE YOUR CHARACTER'}</div>
        <div class="csi-stage" id="csi-stage">
            <img class="csi-bg" src="${CSI_IMAGE_PATH}" alt="" draggable="false">
            <div class="csi-vignette"></div>
            ${Object.values(CHARACTERS).map(char => {
                const hs = CSI_HOTSPOTS[char.id] || { left: 50, top: 50, width: 14, height: 46 };
                const charName = lang === 'de' ? char.nameDE : char.name;
                return `<button class="csi-hotspot" data-char="${char.id}"
                    aria-label="${charName}"
                    style="left:${hs.left}%;top:${hs.top}%;width:${hs.width}%;height:${hs.height}%;--char-accent:${char.accentColor};--char-glow:${char.glowColor}">
                    <span class="csi-hotspot-label">${charName}</span>
                </button>`;
            }).join('')}
            <div class="csi-bottom">
                <button class="cs-confirm-btn disabled" id="cs-confirm-btn" disabled>
                    ${lang === 'de' ? '▶ BESTÄTIGEN' : '▶ CONFIRM'}
                </button>
            </div>
        </div>`;

    const stage = document.getElementById('csi-stage');
    const confirmBtn = document.getElementById('cs-confirm-btn');

    // Artwork missing → legacy card UI (also removes the cinema mode).
    const bg = stage.querySelector('.csi-bg');
    bg.addEventListener('error', () => {
        screen.classList.remove('csi-mode');
        _csiHideTip();
        _buildCharacterSelectCardsUI(onSelect);
    });

    const selectChar = (char, hotspot) => {
        const wasSelected = selectedId === char.id;
        stage.querySelectorAll('.csi-hotspot').forEach(h => h.classList.remove('selected'));
        hotspot.classList.add('selected');
        selectedId = char.id;
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
        confirmBtn.style.borderColor = char.accentColor;
        confirmBtn.style.color = char.accentColor;
        // Second click on the already-selected hero confirms immediately.
        if (wasSelected) _csiConfirmSelection(selectedId, onSelect);
    };

    stage.querySelectorAll('.csi-hotspot').forEach(hotspot => {
        const char = CHARACTERS[hotspot.dataset.char];
        if (!char) return;
        hotspot.addEventListener('mouseenter', (e) => _csiShowTip(e, char));
        hotspot.addEventListener('mousemove', (e) => _csiTrackTip(e));
        hotspot.addEventListener('mouseleave', _csiHideTip);
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation();
            _csiHideTip();
            selectChar(char, hotspot);
        });
    });

    confirmBtn.addEventListener('click', () => {
        if (!selectedId) return;
        _csiConfirmSelection(selectedId, onSelect);
    });
}


// _buildCharacterSelectCardsUI - the legacy card-based select UI. Still the
// live fallback when the intro artwork fails to load (see the .csi-bg error
// path), and useful as a reference for the data-driven layout.
function _buildCharacterSelectCardsUI(onSelect) {
    const container = document.getElementById('char-select-content');
    if (!container) return;

    let selectedId = null;

    const lang = typeof LANG !== 'undefined' ? LANG : 'en';

    container.innerHTML = `
        <div class="cs-title" data-t="cs_title">${lang === 'de' ? 'WÄHLE DEINEN CHARAKTER' : 'CHOOSE YOUR CHARACTER'}</div>
        <div class="cs-cards" id="cs-cards"></div>
        <button class="cs-confirm-btn disabled" id="cs-confirm-btn" disabled>
            ${lang === 'de' ? '▶ BESTÄTIGEN' : '▶ CONFIRM'}
        </button>
    `;

    const cardsEl = document.getElementById('cs-cards');

    Object.values(CHARACTERS).forEach(char => {
        const card = document.createElement('div');
        card.className = 'cs-card';
        card.dataset.charId = char.id;
        card.style.setProperty('--char-accent', char.accentColor);
        card.style.setProperty('--char-glow', char.glowColor);

        const charName = lang === 'de' ? char.nameDE : char.name;
        const tagline = lang === 'de' ? char.taglineDE : char.tagline;
        const background = lang === 'de' ? char.backgroundDE : char.background;
        const personality = lang === 'de' ? char.personalityDE : char.personality;
        const strength = lang === 'de' ? char.strengthDE : char.strength;

        const labelBackground = lang === 'de' ? 'Hintergrund' : 'Background';
        const labelPersonality = lang === 'de' ? 'Persönlichkeit' : 'Personality';
        const labelStrength = lang === 'de' ? 'Stärke' : 'Strength';
        const labelTraits = lang === 'de' ? 'Fähigkeiten' : 'Traits';

        const traitsHtml = (char.traits || []).map(tr => {
            const trName = lang === 'de' ? tr.nameDE : tr.nameEn;
            const trDesc = lang === 'de' ? tr.descDE : tr.descEn;
            return `
                <div class="cs-trait-row">
                    <span class="cs-trait-icon">${tr.icon}</span>
                    <span class="cs-trait-text">
                        <span class="cs-trait-name">${trName}</span>
                        <span class="cs-trait-desc">${trDesc}</span>
                    </span>
                </div>`;
        }).join('');

        card.innerHTML = `
            <div class="cs-card-glow"></div>
            <img class="cs-card-img" src="${char.image}" alt="${charName}" draggable="false">
            <div class="cs-card-body">
                <div class="cs-card-name">${charName}</div>
                <div class="cs-card-tag">${tagline}</div>
                <div class="cs-card-section">
                    <div class="cs-card-section-label">${labelBackground}</div>
                    <div class="cs-card-section-text">${background}</div>
                </div>
                <div class="cs-card-section">
                    <div class="cs-card-section-label">${labelPersonality}</div>
                    <div class="cs-card-section-text">${personality}</div>
                </div>
                <div class="cs-card-section cs-card-traits">
                    <div class="cs-card-section-label">${labelTraits}</div>
                    ${traitsHtml}
                </div>
            </div>
            <div class="cs-card-check">✓</div>
        `;

        card.addEventListener('click', () => {
            // Deselect all, select this one
            document.querySelectorAll('.cs-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedId = char.id;

            const confirmBtn = document.getElementById('cs-confirm-btn');
            if (confirmBtn) {
                confirmBtn.classList.remove('disabled');
                confirmBtn.disabled = false;
                confirmBtn.style.borderColor = char.accentColor;
                confirmBtn.style.color = char.accentColor;
            }
        });

        cardsEl.appendChild(card);
    });

    // Confirm button - funnels through the shared confirm handler so the
    // card fallback behaves identically to the image UI.
    document.getElementById('cs-confirm-btn').addEventListener('click', () => {
        if (!selectedId) return;
        _csiConfirmSelection(selectedId, onSelect);
    });
}


// maybeShowCharacterSelect - entry point called from the play button flow.
// Shows character select if no character chosen yet, otherwise calls onDone directly.
function maybeShowCharacterSelect(onDone) {
    if (STATE.playerCharacter) {
        onDone();
        return;
    }
    showCharacterSelect(() => onDone());
}


//------------------------------------------------------------------------
//-------------------CHARACTER AVATAR IN LEVEL SELECT--------------------
//------------------------------------------------------------------------

// renderLSCharacterAvatar - injects the chosen character's avatar into
// the level-select top bar. Safe to call multiple times (replaces old one).
function renderLSCharacterAvatar() {
    // Remove any existing avatar
    const old = document.getElementById('ls-char-avatar');
    if (old) old.remove();

    if (!STATE.playerCharacter) return;

    const char = CHARACTERS[STATE.playerCharacter];
    if (!char) return;

    const topbarRight = document.querySelector('#screen-levels .ls-topbar-right') ||
        document.querySelector('#screen-map-view .ls-topbar-right');
    if (!topbarRight) return;

    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    const charName = lang === 'de' ? char.nameDE : char.name;

    const avatar = document.createElement('div');
    avatar.id = 'ls-char-avatar';
    avatar.className = 'ls-char-avatar';
    avatar.style.setProperty('--char-accent', char.accentColor);
    avatar.style.setProperty('--char-glow', char.glowColor);
    avatar.setAttribute('data-tip', _tipAttr(charName));
    avatar.innerHTML = `
        <img src="${char.image}" alt="${charName}" class="ls-char-avatar-img">
        <span class="ls-char-avatar-name">${charName}</span>
    `;

    // Prepend so avatar sits at the far left of the right cluster
    topbarRight.prepend(avatar);

    // Sync sprite to current class/ascendency
    if (typeof _updateLSAvatarImage === 'function') _updateLSAvatarImage();
}



//------------------------------------------------------------------------
//-------------------MAP VIEW CHARACTER PORTRAIT + TOOLTIP----------------
//------------------------------------------------------------------------
// Renders the selected character's sprite in the map-view top bar
// (replaces the old "LIST" toggle button). Hovering shows the same
// tooltip used for world nodes (see screens-map-view.js), populated
// with this character's traits instead.

function _buildCharacterTooltipContent(char) {
    const lang = typeof LANG !== 'undefined' ? LANG : 'en';
    const charName = lang === 'de' ? char.nameDE : char.name;
    const tagline = lang === 'de' ? char.taglineDE : char.tagline;

    const traitsHtml = (char.traits || []).map(tr => {
        const trName = lang === 'de' ? tr.nameDE : tr.nameEn;
        const trDesc = lang === 'de' ? tr.descDE : tr.descEn;
        return `
            <div class="mv-char-tooltip-trait">
                <span class="mv-char-tooltip-trait-icon">${tr.icon}</span>
                <span class="mv-char-tooltip-trait-text">
                    <span class="mv-char-tooltip-trait-name">${trName}</span>
                    <span class="mv-char-tooltip-trait-desc">${trDesc}</span>
                </span>
            </div>`;
    }).join('');

    return `
        <div class="mv-tooltip-title">${charName}</div>
        <div class="mv-tooltip-sub">${tagline}</div>
        <div class="mv-char-tooltip-traits">${traitsHtml}</div>
    `;
}

function _showCharacterTooltip(e, char) {
    if (typeof _ensureTooltipElement !== 'function') return;
    const tip = _ensureTooltipElement();
    tip.innerHTML = _buildCharacterTooltipContent(char);
    tip.classList.add('show');
    if (typeof _trackTooltipToMouse === 'function') _trackTooltipToMouse(e);
}

function _hideCharacterTooltip() {
    if (typeof _hideWorldTooltip === 'function') _hideWorldTooltip();
}

// renderMapViewCharacterPortrait - injects the chosen character's sprite
// into #<p>-char-portrait-wrap ('mv' = overworld map view, 'wd' = the
// world-detail screen's mirrored topbar). Safe to call repeatedly.
function renderMapViewCharacterPortrait(p = 'mv') {
    const wrap = document.getElementById(p + '-char-portrait-wrap');
    if (!wrap) return;

    if (!STATE.playerCharacter || !CHARACTERS[STATE.playerCharacter]) {
        wrap.innerHTML = '';
        return;
    }

    const char = CHARACTERS[STATE.playerCharacter];
    wrap.innerHTML = `<img src="${_getPlayerCharacterImage()}" alt="${char.name}" class="mv-char-portrait-img" draggable="false">`;

    wrap.onmouseenter = (e) => _showCharacterTooltip(e, char);
    wrap.onmousemove = (e) => { if (typeof _trackTooltipToMouse === 'function') _trackTooltipToMouse(e); };
    wrap.onmouseleave = () => _hideCharacterTooltip();
}