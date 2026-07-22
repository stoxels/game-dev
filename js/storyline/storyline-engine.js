// =============================================================================
// storyline-engine.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// The rendering engine for story beats: text pages, image slideshows, and
// karaoke-style songs. Contains no story CONTENT — only the machinery that
// plays it back.
//
// Load order: this file (or its shared constants, see below) must be loaded
// AFTER all storyline-intro-*.js / storyline-beats.js data files, since
// showBeat()/StorylineRenderer read STORY_BEATS, INTRO_SONG, etc. lazily
// inside function bodies — so technically order vs. those doesn't matter at
// parse time. The one thing that DOES matter: this file defines
// _wordsFromLine(), DEFAULT_SLIDE_DURATION_MS, and
// SLIDE_FADE_MS, which the data files (e.g. storyline-intro.js) call/reference
// directly inside their own top-level const declarations — so THIS file must
// load BEFORE storyline-intro.js and any other file that calls
// _wordsFromLine(...) or references these constants at parse time.
//
// Suggested <script> order in index.html:
//   1. storyline-engine.js          (this file)
//   2. storyline-intro.js           (main game intro song)
//   3. storyline-intro-stox.js      (Stox character intro)
//   4. storyline-intro-trix.js      (Trix character intro)
//   5. storyline-intro-syla.js      (Syla character intro)
//   6. storyline-beats.js           (STORY_BEATS — references all of the above)
//
// ---------------------------------------------------------------------------
// VIDEO BEATS — data shape
// ---------------------------------------------------------------------------
// A video beat's `video` object supports two shapes:
//
//   1) Single clip (legacy, still fully supported):
//        video: { videoFile: "video/foo.mp4", audio: "...", captions: [...] }
//
//   2) Multi-clip sequence (new):
//        video: {
//            clips: [
//                { videoFile: "video/foo_part1.mp4", audio: "audio/foo_part1.mp3", gapAfterMs: 0 },
//                { videoFile: "video/foo_part2.mp4", audio: "audio/foo_part2.mp3", gapAfterMs: 2000 },
//                { videoFile: "video/foo_part3.mp4", audio: "audio/foo_part3.mp3" } // last clip — gapAfterMs ignored
//            ],
//            captions: [...]     // unchanged — see below
//        }
//
// Playback behavior for video beats:
//   - Clips play in order. `gapAfterMs` on a clip is how long (ms) playback
//     holds on that clip's OWN end frame before the next clip starts. 0 means
//     jump to the next clip immediately. The gap on the LAST clip is ignored.
//   - Videos never loop. Once the final clip finishes, playback simply
//     freezes on that last frame — it does not restart and does not auto-close.
//   - EACH CLIP OWNS ITS OWN AUDIO. If a clip has an `audio` field, that file
//     starts playing the moment the clip starts playing (in lockstep — same
//     call, same frame), and the clip's own video track is muted so the two
//     don't overlap. When the sequence advances to the next clip, the
//     previous clip's audio is stopped and the next clip's audio (if any)
//     starts. There is no longer a single shared narration track spanning
//     the whole sequence, and no independent per-line narration queue —
//     audio is scoped 1:1 to whichever clip is currently on screen. A clip
//     with no `audio` field just plays silently (or with its own embedded
//     track, if `audio` is omitted and you want the raw video sound).
//   - The bottom-right button reads "skip" until the final clip has finished
//     playing, at which point it relabels itself to "continue" (same click
//     handler either way — it closes the beat). This avoids a "skip" button
//     that doesn't make sense once there's nothing left to skip.
//   - Captions are unrelated to the per-clip audio and still support TWO
//     shapes, auto-detected per beat:
//       a) Per-line narration: { text, audio, durationMs }[]. No `start`
//          field. Each line gets its OWN short audio clip, played in strict
//          sequence via _playNarrationLine() — independent of which video
//          clip happens to be on screen at the time.
//       b) Legacy start-based (still fully supported): each caption's
//          `start` (ms) is measured from the START of the whole clip
//          sequence (not any single clip's currentTime) — so `start: 4000`
//          always means "4 seconds after this beat began," regardless of
//          how many clips/gaps came before it. This is driven off a
//          wall-clock timer started when the beat began (videoSeqStartTime),
//          since with multiple clips no single video element's currentTime
//          spans the whole sequence, and clip audio is no longer a single
//          track either.
//     Caption lines still only ever fade IN once and are never hidden or
//     dimmed again — the panel just keeps growing.
// =============================================================================

// ---------------------------------------------------------------------------
// SHARED CONSTANTS — used by storyline-intro*.js data files
// ---------------------------------------------------------------------------

// Default time each slide stays on screen (ms) for image-slideshow beats.
// Override per-slide via the optional `duration` field on a slide object.
const DEFAULT_SLIDE_DURATION_MS = 10000;

// How long the text/image fade transition takes (ms) for slideshow beats.
const SLIDE_FADE_MS = 500;

// _wordsFromLine — PLACEHOLDER-STYLE timestamp generator for karaoke song
// beats. Splits a line into words and spaces their "fully revealed" times
// evenly between lineStartMs and lineEndMs. When fed real per-LINE timing
// (e.g. parsed from an .srt file), this still gives accurate line-level
// sync — only the word-by-word pace within a line is estimated/even, since
// SRT files don't carry per-word timestamps. Swap in literal per-word
// timestamps for any line where you have them.
function _wordsFromLine(text, lineStartMs, lineEndMs) {
    const words = text.split(' ').filter(Boolean);
    const span = lineEndMs - lineStartMs;
    return words.map((word, i) => ({
        word,
        time: Math.round(lineStartMs + span * ((i + 1) / words.length)),
    }));
}



const _imgCache = new Map(); // url -> Promise<HTMLImageElement>

function _preloadImage(url) {
    if (_imgCache.has(url)) return _imgCache.get(url);
    const img = new Image();
    const p = new Promise((resolve) => {
        img.onload = () => {
            if (img.decode) img.decode().then(() => resolve(img)).catch(() => resolve(img));
            else resolve(img);
        };
        img.onerror = () => resolve(img); // don't hang the queue on one bad file
    });
    img.src = url;
    _imgCache.set(url, p);
    return p;
}



// ---------------------------------------------------------------------------
// RENDERER
// ---------------------------------------------------------------------------

const StorylineRenderer = (() => {

    // -- Styling constants --
    const STYLES = {
        overlay: `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #000;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: hidden;
        `,
        textBox: `
            max-width: 680px;
            width: 90%;
            text-align: center;
        `,
        line: `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(14px, 2.2vw, 18px);
            line-height: 1.85;
            color: rgba(255, 255, 255, 0);
            margin: 0 0 1.1em 0;
            transition: color 2s ease;
        `,
        // Lines that open with a quote mark are styled differently
        quotedLine: `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(13px, 2vw, 16px);
            line-height: 1.9;
            color: rgba(255, 255, 255, 0);
            margin: 0 0 1em 0;
            font-style: italic;
            transition: color 2s ease;
        `,
        hint: `
            position: absolute;
            bottom: clamp(14px, 4vh, 36px);
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(11px, 2.4vw, 20px);
            letter-spacing: 0.18em;
            color: rgba(255, 255, 255, 0);
            text-transform: uppercase;
            transition: color 2s ease;
            white-space: nowrap;
            pointer-events: none;
        `,
        skipBtn: `
            position: absolute;
            bottom: clamp(10px, 3.2vh, 28px);
            right: clamp(10px, 3.6vw, 36px);
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(13px, 3vw, 30px);
            letter-spacing: 0.18em;
            color: rgba(255, 255, 255, 0.75);
            text-transform: uppercase;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.5);
            cursor: pointer;
            border-radius: 4px;
            padding: clamp(4px, 1vh, 6px) clamp(8px, 2vw, 12px);
            pointer-events: all;
            transition: border-color 300ms ease, color 300ms ease;
        `,
        pageIndicator: `
            position: absolute;
            top: clamp(10px, 3.2vh, 28px);
            right: clamp(10px, 3.6vw, 36px);
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(13px, 3vw, 30px);
            letter-spacing: 0.14em;
            color: rgba(255, 255, 255, 0.75);
        `,
        // -- Media frame: locked to the source images' native aspect ratio
        // (1376x768 = 1.791667). Sized via calc() so it always fits fully
        // inside the viewport on whichever axis is the tighter constraint —
        // letterboxed/pillarboxed as needed — the same "contain"-style fix
        // used for the title screen's .title-canvas. Both slideshow and
        // song beats render their <img> layers inside this frame instead of
        // directly against the full-viewport overlay, so object-fit: cover
        // on the images never has to crop content to fill a mismatched box.
        mediaFrame: `
            position: relative;
            aspect-ratio: 1376 / 768;
            width: min(100%, calc(100vh * 1.791667));
            height: auto;
            max-height: 100%;
            overflow: hidden;
        `,
        // -- Slideshow-specific styles --
        slideImage: `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity ${SLIDE_FADE_MS}ms ease;
            pointer-events: none;
        `,
        slideTextWrap: `
            position: absolute;
            left: 0; right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            padding: 0 clamp(10px, 4vw, 24px) clamp(28px, 10vh, 64px) clamp(10px, 4vw, 24px);
            box-sizing: border-box;
            pointer-events: none;
        `,
        slideTextBox: `
            max-width: 760px;
            width: 100%;
            text-align: center;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: clamp(10px, 2.4vh, 18px) clamp(12px, 4vw, 28px);
            box-sizing: border-box;
        `,
        //rgba(0, 0, 0, 0);
        slideText: `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(15px, 2.4vw, 20px);
            line-height: 1.7;
            color: rgba(0, 0, 0, 0);    
            margin: 0;
            transition: color ${SLIDE_FADE_MS}ms ease;
        `,
        // -- Song / karaoke-specific styles --
        songTextWrap: `
            position: absolute;
            left: 0; right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            padding: 0 clamp(10px, 4vw, 24px) clamp(28px, 10vh, 64px) clamp(10px, 4vw, 24px);
            box-sizing: border-box;
            pointer-events: none;
        `,
        songTextBox: `
            max-width: min(520px, 92vw);
            min-width: min(280px, 92vw);
            text-align: center;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 10px;
            padding: clamp(10px, 2.4vh, 18px) clamp(12px, 4vw, 28px);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
        `,
        // One row per lyric line within the current section.
        songLineRow: `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-weight: bold;
            font-size: clamp(15px, 2.4vw, 20px);
            line-height: 1.6;
            margin: 0;
            min-height: 1.6em;
            transition: opacity 400ms ease;
        `,
        // Letters not yet reached by playback in the active line.
        songLineUnrevealed: `
            color: rgba(0, 0, 0, 0.95);
        `,
        // Letters already sung in the currently-active line.
        songLineRevealedActive: `
            color: rgba(0, 0, 0, 0.95);
        `,
        // Full lines from earlier in the section, already sung — dimmed but
        // still visible, so the whole section builds up rather than vanishing.
        songLineRevealedPast: `
            color: rgba(0, 0, 0, 0.95);
        `,
        // -- Video-beat-specific styles --
        videoEl: `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            pointer-events: none;
        `,
        videoCaptionWrap: `
            position: absolute;
            left: 0; right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            padding: 0 clamp(10px, 4vw, 24px) clamp(20px, 8vh, 48px) clamp(10px, 4vw, 24px);
            box-sizing: border-box;
            pointer-events: none;
        `,
        // Grows as lines accumulate; capped so it never overtakes the frame,
        // with auto-scroll keeping the newest line in view.
        videoCaptionBox: `
            max-width: 760px;
            width: 100%;
            max-height: 45%;
            overflow-y: auto;
            text-align: center;
            background: rgba(0, 0, 0, 0.45);
            border-radius: 10px;
            padding: clamp(10px, 2.4vh, 18px) clamp(12px, 4vw, 28px);
            box-sizing: border-box;
            scrollbar-width: none;
        `,
        // Each accumulated caption line — fades in once, then stays visible
        // (never removed or dimmed) for the rest of the clip.
        videoCaptionLine: `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(14px, 2.2vw, 18px);
            line-height: 1.7;
            color: rgba(255, 255, 255, 0);
            margin: 0 0 0.6em 0;
            transition: color 600ms ease;
        `,
    };


    const FADE_IN_DELAY_MS = 5000;  // stagger between lines appearing (text-page beats)
    const HINT_DELAY_MS = 1800;    // how long before "click to continue" appears

    let overlay = null;
    let currentPages = [];
    let currentPage = 0;
    let onComplete = null;
    let hintTimeout = null;

    // -- Slideshow-specific state --
    let currentSlides = [];
    let currentSlide = 0;
    let currentSlideImagePath = ''; // set per-beat in show(); see usage sites below for fallback
    let slideAdvanceTimeout = null;
    let slideImgEls = {}; // index -> <img> element (for crossfade between two layers)

    // -- Song / karaoke-specific state --
    let songAudioEl = null;      // the <audio> element driving the karaoke clock
    let songImages = [];         // [{ image, time }] sorted by time
    let songLines = [];          // [{ section, words: [{word, time}] }] sorted by time
    let songImagePath = '';
    let songImgEls = {};         // dom refs, same shape as slideImgEls
    let songRafId = null;        // requestAnimationFrame handle for the sync loop
    let songCurrentImageIdx = -1;
    let songCurrentLineIdx = -1;
    let songLineRowEls = [];     // <p> row element for the line currently being sung

    // -- Video-beat-specific state --
    let videoEl = null;          // the persistent <video> element (src is swapped between clips)
    let videoClips = [];         // [{ videoFile, audio, gapAfterMs }], normalized, in play order
    let videoClipIndex = -1;     // index of the clip currently loaded/playing in videoEl
    let videoClipAudioEl = null; // the CURRENT clip's own audio track (1:1 with videoClipIndex);
    // started in lockstep with that clip and torn down the moment the
    // sequence advances to the next clip (see _playClip / _stopClipAudio)
    let videoGapTimeout = null;  // setTimeout handle while holding on a finished clip's end frame
    let videoSeqStartTime = 0;   // performance.now() when the sequence began — wall-clock caption
    // master for the legacy start-based caption shape (a single clip's own
    // currentTime can't be used since it resets every time the clip changes,
    // and audio is now scoped per-clip rather than spanning the sequence)
    let videoSeqComplete = false; // true once the final clip has played through to its end frame
    let videoSkipBtnEl = null;    // reference so we can relabel skip -> continue
    let videoCaptions = [];      // sorted captions — EITHER legacy [{text, start}] shape
    // (start-based, driven by _videoSyncTick) OR per-line narration
    // [{text, audio, durationMs}] shape (driven by _playNarrationLine) —
    // see isPerLineNarration(). Independent of per-clip audio above.
    let videoCaptionBoxEl = null;
    let videoCaptionLineEls = []; // one <p> per caption line, index-matched to videoCaptions;
    // each fades in once (at its start time in legacy mode, or when its turn
    // comes up in per-line narration mode) and is never hidden again
    let videoRafId = null;

    // -- Per-line narration state (caption-driven audio, independent of clips) --
    let narrationAudioEl = null;  // the <audio> for whichever caption line is currently playing
    let narrationGapTimeout = null; // fallback wall-clock timer when a line has no audio
    let narrationIndex = -1;      // index into videoCaptions of the line currently playing
    let narrationActive = false;  // true while a per-line narration sequence is in flight


    // buildSlideshow — returns { slides, imagePath } for a slideshow beat,
    // or null if the requested beat/variant isn't a slideshow.
    function buildSlideshow(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) {
            console.warn(`[Storyline] Unknown beat: "${beatId}"`);
            return null;
        }

        // Top-level slideshow beats (e.g. intro_cinematic)
        if (beat.slides) {
            return { slides: beat.slides, imagePath: beat.imagePath || INTRO_CINEMATIC_IMAGE_PATH };
        }

        // Character-variant slideshow beats (e.g. character_intro)
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            if (!variant) {
                console.warn(`[Storyline] No character variant "${char}" for beat "${beatId}"`);
                return null;
            }
            if (variant.slides) {
                return { slides: variant.slides, imagePath: variant.imagePath || INTRO_CINEMATIC_IMAGE_PATH };
            }
        }

        return null;
    }

    // buildSong — returns { audio, images, lines, imagePath } for a song beat,
    // or null if the requested beat/variant isn't a song.
    function buildSong(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) {
            console.warn(`[Storyline] Unknown beat: "${beatId}"`);
            return null;
        }

        // Top-level song beats
        if (beat.song) {
            return beat.song;
        }

        // Character-variant song beats (e.g. character_intro using songs)
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            if (!variant) {
                console.warn(`[Storyline] No character variant "${char}" for beat "${beatId}"`);
                return null;
            }
            if (variant.song) {
                return variant.song;
            }
        }

        return null;
    }


    function buildPages(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) {
            console.warn(`[Storyline] Unknown beat: "${beatId}"`);
            return null;
        }

        // Slideshow beats (e.g. intro_cinematic) are handled via buildSlideshow
        if (beat.slides) {
            return beat.slides;
        }

        // Character-variant beats
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            if (!variant) {
                console.warn(`[Storyline] No character variant "${char}" for beat "${beatId}"`);
                return null;
            }
            // Slideshow-style character variants are handled via buildSlideshow
            if (variant.slides) {
                return variant.slides;
            }
            return variant.pages;
        }

        // Class unlock beat (special structure)
        if (beatId === 'class_unlock') {
            const className = options.className || '';
            const classLine = beat.classLines[className] || beat.defaultClassLine;
            return [
                [...beat.shared, classLine]
            ];
        }

        // Ascendency unlock beat (special structure)
        if (beatId === 'ascendency_unlock') {
            const key = (options.ascendencyClass || '').replace(/\s+/g, '');
            return beat.variants[key] || beat.defaultVariant;
        }

        return beat.pages;
    }

    // isSlideshowBeat — true if this beat (given options) should render as
    // an image slideshow rather than a text-page sequence.
    function isSlideshowBeat(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) return false;
        if (beat.slides) return true;
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            return !!(variant && variant.slides);
        }
        return false;
    }

    // isSongBeat — true if this beat (given options) should render as a
    // karaoke-style song (independent image timeline + word-by-word lyric reveal).
    function isSongBeat(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) return false;
        if (beat.song) return true;
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            return !!(variant && variant.song);
        }
        return false;
    }


    // buildVideo — returns { videoFile|clips, audio?, captions? } for a video
    // beat, or null if the requested beat/variant isn't a video.
    function buildVideo(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) {
            console.warn(`[Storyline] Unknown beat: "${beatId}"`);
            return null;
        }
        if (beat.video) return beat.video;
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            if (!variant) {
                console.warn(`[Storyline] No character variant "${char}" for beat "${beatId}"`);
                return null;
            }
            if (variant.video) return variant.video;
        }
        return null;
    }

    // isVideoBeat — true if this beat (given options) should render as a
    // video clip (with optional overlaid captions and/or narration track).
    function isVideoBeat(beatId, options = {}) {
        const beat = STORY_BEATS[beatId];
        if (!beat) return false;
        if (beat.video) return true;
        if (beat.characterVariants) {
            const char = (options.character || '').toLowerCase();
            const variant = beat.characterVariants[char];
            return !!(variant && variant.video);
        }
        return false;
    }

    // _normalizeVideoClips — accepts either shape of a video beat's data and
    // always returns a plain, ordered array: [{ videoFile, audio, gapAfterMs }].
    //   - New shape:    video.clips = [{ videoFile, audio, gapAfterMs }, ...]
    //     `audio` is OPTIONAL per clip — if present, that file plays in
    //     lockstep with this clip and the clip's own video track is muted.
    //   - Legacy shape: video.videoFile = "..." (treated as a single 1-clip
    //     sequence, gapAfterMs irrelevant since there's nothing after it).
    //     video.audio (if present) is carried over as that single clip's
    //     audio, so old single-clip beats keep working unchanged.
    // Returns [] if neither shape is present (caller treats that as invalid).
    function _normalizeVideoClips(video) {
        if (!video) return [];
        if (Array.isArray(video.clips) && video.clips.length > 0) {
            return video.clips.map(c => ({
                videoFile: c.videoFile,
                audio: c.audio || null,
                gapAfterMs: c.gapAfterMs || 0,
            }));
        }
        if (video.videoFile) {
            return [{ videoFile: video.videoFile, audio: video.audio || null, gapAfterMs: 0 }];
        }
        return [];
    }


    function createOverlay() {
        const el = document.createElement('div');
        el.style.cssText = STYLES.overlay;
        return el;
    }

    // -------------------------------------------------------------------
    // TEXT-PAGE RENDERING (multi-line pages, click/space to advance)
    // -------------------------------------------------------------------

    function renderPage(pages, pageIndex) {
        if (!overlay) return;
        overlay.innerHTML = '';

        const lines = pages[pageIndex];
        const box = document.createElement('div');
        box.style.cssText = STYLES.textBox;

        lines.forEach((text, i) => {
            const p = document.createElement('p');
            const isQuote = text.startsWith('"');
            p.style.cssText = isQuote ? STYLES.quotedLine : STYLES.line;
            p.textContent = text;
            box.appendChild(p);

            // Stagger fade-in
            setTimeout(() => {
                p.style.color = isQuote
                    ? 'rgba(255, 255, 255, 0.82)'
                    : 'rgba(255, 255, 255, 0.95)';
            }, i * FADE_IN_DELAY_MS + 80);
        });

        overlay.appendChild(box);

        // Page indicator (only when multi-page)
        if (pages.length > 1) {
            const indicator = document.createElement('div');
            indicator.style.cssText = STYLES.pageIndicator;
            indicator.textContent = `${pageIndex + 1} / ${pages.length}`;
            overlay.appendChild(indicator);
        }

        // "Click to continue" hint
        const hint = document.createElement('div');
        hint.style.cssText = STYLES.hint;
        const isLast = pageIndex === pages.length - 1;
        hint.textContent = isLast ? 'click to continue' : 'click for next';
        overlay.appendChild(hint);

        if (hintTimeout) clearTimeout(hintTimeout);
        const lastLineFadeIn = lines.length * FADE_IN_DELAY_MS + 80;
        const dynamicHintDelay = Math.max(HINT_DELAY_MS, lastLineFadeIn + 600);
        hintTimeout = setTimeout(() => {
            hint.style.color = 'rgba(255, 255, 255, 0.28)';
        }, dynamicHintDelay);
    }

    function advance() {
        currentPage++;
        if (currentPage < currentPages.length) {
            renderPage(currentPages, currentPage);
        } else {
            close();
        }
    }

    // -------------------------------------------------------------------
    // SLIDESHOW RENDERING (image + overlay text, auto-advances by timer)
    // -------------------------------------------------------------------

    function renderSlideshow(slides) {
        if (!overlay) return;
        overlay.innerHTML = '';
        slideImgEls = {};

        // Media frame — locked to the images' native aspect ratio so they're
        // never cropped to fill a mismatched viewport shape (letterboxed/
        // pillarboxed as needed instead).
        const frame = document.createElement('div');
        frame.style.cssText = STYLES.mediaFrame;
        overlay.appendChild(frame);
        slideImgEls.frame = frame;

        // Two stacked <img> layers so we can crossfade between slides.
        const imgA = document.createElement('img');
        const imgB = document.createElement('img');
        imgA.style.cssText = STYLES.slideImage;
        imgB.style.cssText = STYLES.slideImage;
        frame.appendChild(imgA);
        frame.appendChild(imgB);
        slideImgEls.layers = [imgA, imgB];
        slideImgEls.activeLayer = 0;

        // Text overlay box (sits above the images, inside the frame so it
        // always tracks the visible image rather than the full viewport)
        const textWrap = document.createElement('div');
        textWrap.style.cssText = STYLES.slideTextWrap;
        const textBox = document.createElement('div');
        textBox.style.cssText = STYLES.slideTextBox;
        const textP = document.createElement('p');
        textP.style.cssText = STYLES.slideText;
        textBox.appendChild(textP);
        textWrap.appendChild(textBox);
        frame.appendChild(textWrap);
        slideImgEls.textP = textP;

        // Page indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = STYLES.pageIndicator;
        overlay.appendChild(indicator);
        slideImgEls.indicator = indicator;

        // "Click for next" hint
        const hint = document.createElement('div');
        hint.style.cssText = STYLES.hint;
        hint.textContent = 'click for next';
        overlay.appendChild(hint);
        slideImgEls.hint = hint;

        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.style.cssText = STYLES.skipBtn;
        skipBtn.textContent = 'skip';
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // don't also advance the slide
            close();
        });
        overlay.appendChild(skipBtn);
        slideImgEls.skipBtn = skipBtn;

        showSlide(slides, 0);
    }

    function showSlide(slides, index) {
        if (!overlay) return;
        if (slideAdvanceTimeout) {
            clearTimeout(slideAdvanceTimeout);
            slideAdvanceTimeout = null;
        }

        const slide = slides[index];
        const duration = slide.duration || DEFAULT_SLIDE_DURATION_MS;

        // Crossfade images: fade out the active layer, fade in the other one.
        const layers = slideImgEls.layers;
        const activeIdx = slideImgEls.activeLayer;
        const nextIdx = activeIdx === 0 ? 1 : 0;

        const outgoing = layers[activeIdx];
        const incoming = layers[nextIdx];

        incoming.src = currentSlideImagePath + slide.image;
        incoming.style.opacity = '0';
        outgoing.style.opacity = '0';

        // Force the new image in front once loaded (or immediately as fallback)
        requestAnimationFrame(() => {
            incoming.style.opacity = '1';
        });

        slideImgEls.activeLayer = nextIdx;

        // Update text (fade out then in)
        const textP = slideImgEls.textP;
        textP.style.color = 'rgba(0, 0, 0, 0)';
        setTimeout(() => {
            textP.textContent = slide.text || '';
            requestAnimationFrame(() => {
                textP.style.color = 'rgba(0, 0, 0, 0.95)';
            });
        }, SLIDE_FADE_MS);

        // Update page indicator
        slideImgEls.indicator.textContent = `${index + 1} / ${slides.length}`;

        // Hint text + style
        const isLast = index === slides.length - 1;
        slideImgEls.hint.textContent = isLast ? 'click to continue' : 'click for next';
        slideImgEls.hint.style.color = 'rgba(255, 255, 255, 0)';
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => {
            slideImgEls.hint.style.color = 'rgba(255, 255, 255, 0.28)';
        }, HINT_DELAY_MS);

        // Auto-advance after `duration` ms
        slideAdvanceTimeout = setTimeout(() => {
            advanceSlide(slides);
        }, duration);
    }

    function advanceSlide(slides) {
        currentSlide++;
        if (currentSlide < slides.length) {
            showSlide(slides, currentSlide);
        } else {
            close();
        }
    }

    // -------------------------------------------------------------------
    // SONG RENDERING (karaoke-style: independent image timeline +
    // word-by-word lyric reveal, both driven off audio.currentTime)
    // -------------------------------------------------------------------

    // Escapes text so it's safe to drop into innerHTML for the per-letter spans.
    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Measures the rendered width (px) of the widest line of lyric text,
    // using the same font as the visible rows (STYLES.songLineRow), so the
    // box can be sized once up front and never resize as lines change.
    // Capped between the box's min/max-width so very short or very long
    // songs still get a sane box. `padding` accounts for the textBox's own
    // left+right padding (28px each side, per STYLES.songTextBox).
    function _measureWidestLineWidth(lines) {
        const MIN_PX = 280;
        const MAX_PX = 520;
        const PADDING_PX = 28 * 2;

        const measurer = document.createElement('span');
        measurer.style.cssText = STYLES.songLineRow;
        measurer.style.position = 'absolute';
        measurer.style.visibility = 'hidden';
        measurer.style.whiteSpace = 'nowrap';
        measurer.style.left = '-9999px';
        document.body.appendChild(measurer);

        let widest = 0;
        for (const line of lines) {
            const text = line.words.map(w => w.word).join(' ');
            measurer.textContent = text;
            widest = Math.max(widest, measurer.getBoundingClientRect().width);
        }

        document.body.removeChild(measurer);

        const target = widest + PADDING_PX;
        return Math.min(MAX_PX, Math.max(MIN_PX, target));
    }

    function renderSong(song) {
        if (!overlay) return;
        overlay.innerHTML = '';
        songImgEls = {};

        // Media frame — locked to the images' native aspect ratio, same
        // fix as the regular slideshow, so song backgrounds aren't cropped.
        const frame = document.createElement('div');
        frame.style.cssText = STYLES.mediaFrame;
        overlay.appendChild(frame);
        songImgEls.frame = frame;

        // Two stacked <img> layers so we can crossfade between images,
        // same approach as the regular slideshow.
        const imgA = document.createElement('img');
        const imgB = document.createElement('img');
        imgA.style.cssText = STYLES.slideImage;
        imgB.style.cssText = STYLES.slideImage;
        frame.appendChild(imgA);
        frame.appendChild(imgB);
        songImgEls.layers = [imgA, imgB];
        songImgEls.activeLayer = 0;

        // Text overlay box. Holds exactly one row — the line currently
        // being sung — rebuilt fresh each time the active line changes
        // (see _buildSingleLineRow). Width is fixed once here (based on the
        // widest line in the whole song) so the box doesn't resize as
        // different lines appear. Lives inside the frame so it tracks the
        // visible image rather than the full viewport.
        const textWrap = document.createElement('div');
        textWrap.style.cssText = STYLES.songTextWrap;
        const textBox = document.createElement('div');
        textBox.style.cssText = STYLES.songTextBox;
        textBox.style.width = _measureWidestLineWidth(songLines) + 'px';
        textWrap.appendChild(textBox);
        frame.appendChild(textWrap);
        songImgEls.textBox = textBox;

        // Skip button (no page indicator / click-to-advance hint — song beats
        // are driven by audio playback, not click-through)
        const skipBtn = document.createElement('button');
        skipBtn.style.cssText = STYLES.skipBtn;
        skipBtn.textContent = 'skip';
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });
        overlay.appendChild(skipBtn);
        songImgEls.skipBtn = skipBtn;

        // Show the first image immediately (don't wait for the RAF loop's
        // first tick) so there's no blank flash at time 0.
        if (songImages.length > 0) {
            const firstLayer = songImgEls.layers[0];
            firstLayer.src = songImagePath + songImages[0].image;
            firstLayer.style.opacity = '1';
            songImgEls.activeLayer = 0;
            songCurrentImageIdx = 0;
        }
        songCurrentLineIdx = -1;
        songLineRowEls = [];
    }

    // Swaps to a new image with a crossfade. Mirrors showSlide's image logic
    // but is driven by elapsed playback time rather than a fixed timer.
    function _songSwapImage(imageFile) {
        const layers = songImgEls.layers;
        const activeIdx = songImgEls.activeLayer;
        const nextIdx = activeIdx === 0 ? 1 : 0;
        const outgoing = layers[activeIdx];
        const incoming = layers[nextIdx];
        const url = songImagePath + imageFile;

        _preloadImage(url).then((img) => {
            incoming.src = img.src;
            requestAnimationFrame(() => {
                incoming.style.opacity = '1';
                outgoing.style.opacity = '0';
            });
        });

        songImgEls.activeLayer = nextIdx;
    }

    // Builds the letter-revealable inner markup for one lyric line (a row's
    // innerHTML). Each word is wrapped in a span holding its own letters,
    // each letter its own span, so we can toggle "revealed" vs "unrevealed"
    // per letter without re-building the DOM every frame.
    function _buildLineMarkup(line) {
        return line.words.map((w, wi) => {
            const letters = w.word.split('').map(ch =>
                `<span class="ka-letter" data-revealed="0" style="color: rgba(0, 0, 0, 0.95);">${_escapeHtml(ch)}</span>`
            ).join('');
            const space = wi < line.words.length - 1 ? ' ' : '';
            return `<span class="ka-word">${letters}</span>${space}`;
        }).join('');
    }

    // Rebuilds the text block to hold exactly one row, for the line
    // currently being sung. Called every time the active line changes —
    // the box always shows just the current line, never accumulating
    // earlier lines from the same section.
    function _buildSingleLineRow() {
        const textBox = songImgEls.textBox;
        textBox.innerHTML = '';
        songLineRowEls = [];

        const row = document.createElement('p');
        row.style.cssText = STYLES.songLineRow;
        row.style.opacity = '0';
        textBox.appendChild(row);
        songLineRowEls.push(row);
    }

    // Given a line's row element and the current playback time, reveals
    // letters up through the word that should be fully sung by now.
    // Interpolates within the current word so it types out smoothly.
    function _updateLineReveal(rowEl, line, nowMs, lineStartMs) {
        const words = line.words;
        const letterSpans = rowEl.querySelectorAll('.ka-letter');
        let letterCursor = 0;

        for (let wi = 0; wi < words.length; wi++) {
            const word = words[wi];
            const wordLen = word.word.length;
            const wordStart = wi === 0 ? lineStartMs : words[wi - 1].time;
            const wordEnd = word.time;

            let revealCount;
            if (nowMs >= wordEnd) {
                revealCount = wordLen; // fully sung
            } else if (nowMs <= wordStart) {
                revealCount = 0; // not started yet
            } else {
                const progress = (nowMs - wordStart) / Math.max(1, wordEnd - wordStart);
                revealCount = Math.floor(progress * wordLen);
            }

            for (let li = 0; li < wordLen; li++) {
                const span = letterSpans[letterCursor + li];
                if (!span) continue;
                const shouldReveal = li < revealCount;
                if (shouldReveal && span.dataset.revealed !== '1') {
                    span.dataset.revealed = '1';
                    span.style.color = 'rgba(0, 0, 0, 0.95)';
                } else if (!shouldReveal && span.dataset.revealed !== '0') {
                    span.dataset.revealed = '0';
                    span.style.color = 'rgba(0, 0, 0, 0.95)';
                }
            }
            letterCursor += wordLen;
        }
    }

    // The main sync loop — ticks every animation frame while the song plays.
    // Reads the audio element's real playback time and updates whichever
    // image / lyric line should be showing at that moment.
    function _songSyncTick() {
        if (!overlay || !songAudioEl) return;

        const nowMs = songAudioEl.currentTime * 1000;

        // -- Image timeline: advance to the latest image whose time has passed --
        let targetImageIdx = songCurrentImageIdx;
        for (let i = 0; i < songImages.length; i++) {
            if (songImages[i].time <= nowMs) targetImageIdx = i;
            else break;
        }
        if (targetImageIdx !== songCurrentImageIdx && targetImageIdx >= 0) {
            songCurrentImageIdx = targetImageIdx;
            _songSwapImage(songImages[targetImageIdx].image);
        }

        // -- Lyric timeline: find the active line (the last line whose first
        //    word has started). Stays -1 ("nothing yet") until playback
        //    actually reaches the first line's start time, so there's a
        //    silent/blank lead-in instead of showing line 0 immediately. --
        let targetLineIdx = -1;
        for (let i = 0; i < songLines.length; i++) {
            const firstWordTime = songLines[i].words[0] ? songLines[i].words[0].time : 0;
            if (firstWordTime <= nowMs) {
                targetLineIdx = i;
            } else {
                break;
            }
        }

        if (targetLineIdx >= 0 && targetLineIdx !== songCurrentLineIdx && songLines.length > 0) {
            songCurrentLineIdx = targetLineIdx;

            // Always a fresh single-row box — the box only ever shows the
            // line currently being sung, never accumulating past lines.
            _buildSingleLineRow();

            const row = songLineRowEls[0];
            if (row) {
                row.innerHTML = _buildLineMarkup(songLines[targetLineIdx]);
                requestAnimationFrame(() => { row.style.opacity = '1'; });
            }
        }

        // Progressively reveal letters within the active line
        if (songCurrentLineIdx >= 0) {
            const line = songLines[songCurrentLineIdx];
            const prevLine = songLines[songCurrentLineIdx - 1];
            const lineStartMs = prevLine ? prevLine.words.slice(-1)[0].time : 0;
            const row = songLineRowEls[0];
            if (row) _updateLineReveal(row, line, nowMs, lineStartMs);
        }

        // Stop the loop once the track ends (or once it's paused/closed elsewhere)
        if (songAudioEl.ended) {
            close();
            return;
        }

        songRafId = requestAnimationFrame(_songSyncTick);
    }

    // Starts a song beat: plays the audio and kicks off the sync loop.
    // Falls back to a timer-driven close if autoplay is blocked, so the
    // beat doesn't hang forever waiting on a play() promise that never resolves.
    function startSong(song) {
        songImages = (song.images || []).slice().sort((a, b) => a.time - b.time);
        songLines = (song.lines || []).slice().sort((a, b) => {
            const at = a.words[0] ? a.words[0].time : 0;
            const bt = b.words[0] ? b.words[0].time : 0;
            return at - bt;
        });
        songImagePath = song.imagePath || INTRO_CINEMATIC_IMAGE_PATH;
        songCurrentImageIdx = -1;
        songCurrentLineIdx = -1;
        songLineRowEls = [];

        songImages.forEach(entry => _preloadImage(songImagePath + entry.image));

        renderSong(song);

        songAudioEl = new Audio(song.audio);
        songAudioEl.volume = 1.0;

        songAudioEl.addEventListener('ended', close);

        songAudioEl.play().then(() => {
            songRafId = requestAnimationFrame(_songSyncTick);
        }).catch(() => {
            // Autoplay blocked — resume on first user interaction, same
            // pattern as Audio_Manager's BGM autoplay-resume fallback.
            const resume = () => {
                songAudioEl.play().then(() => {
                    songRafId = requestAnimationFrame(_songSyncTick);
                }).catch(() => { });
                document.removeEventListener('click', resume);
                document.removeEventListener('keydown', resume);
            };
            document.addEventListener('click', resume, { once: true });
            document.addEventListener('keydown', resume, { once: true });
        });
    }

    function stopSong() {
        if (songRafId) {
            cancelAnimationFrame(songRafId);
            songRafId = null;
        }
        if (songAudioEl) {
            songAudioEl.removeEventListener('ended', close);
            songAudioEl.pause();
            songAudioEl.currentTime = 0;
            songAudioEl = null;
        }
    }

    // -------------------------------------------------------------------
    // VIDEO RENDERING (a SEQUENCE of one or more video clips, each with its
    // own optional audio track, + overlaid captions — captions can either
    // ride the legacy wall-clock timeline or run their own independent
    // per-line narration queue)
    // -------------------------------------------------------------------


    function renderVideo(video) {
        if (!overlay) return;
        overlay.innerHTML = '';

        // Media frame — same aspect-ratio-locked container the slideshow
        // and song beats use, so the clip is never cropped to fill a
        // mismatched viewport shape.
        const frame = document.createElement('div');
        frame.style.cssText = STYLES.mediaFrame;
        overlay.appendChild(frame);

        // Single persistent <video> element — its `src` is swapped between
        // clips as the sequence advances (see _playClip). Never loops: once
        // the final clip's `ended` event fires, we simply stop advancing,
        // so the browser leaves the last frame on screen indefinitely.
        // `muted` is set per-clip in _playClip (muted whenever that specific
        // clip has its own dedicated audio file), so start unmuted here —
        // _playClip corrects it before the first clip ever plays.
        videoEl = document.createElement('video');
        videoEl.style.cssText = STYLES.videoEl;
        videoEl.playsInline = true;
        videoEl.muted = false;
        videoEl.loop = false;
        videoEl.addEventListener('ended', _onClipEnded);
        frame.appendChild(videoEl);

        // Caption box — holds one <p> per caption line, built up front and
        // hidden. Lines fade in one at a time as playback reaches their
        // start time, and are never removed or dimmed afterward, so by the
        // end of the sequence the full accumulated text is visible together.
        const captionWrap = document.createElement('div');
        captionWrap.style.cssText = STYLES.videoCaptionWrap;
        const captionBox = document.createElement('div');
        captionBox.style.cssText = STYLES.videoCaptionBox;
        captionWrap.appendChild(captionBox);
        frame.appendChild(captionWrap);
        videoCaptionBoxEl = captionBox;

        videoCaptionLineEls = videoCaptions.map(line => {
            const p = document.createElement('p');
            p.style.cssText = STYLES.videoCaptionLine;
            p.textContent = line.text;
            captionBox.appendChild(p);
            return p;
        });

        // Skip / Continue button — reads "skip" while the sequence still has
        // clips left to play, and relabels itself to "continue" once the
        // final clip has finished (see _onClipEnded). Either way, clicking
        // it closes the beat.
        const skipBtn = document.createElement('button');
        skipBtn.style.cssText = STYLES.skipBtn;
        skipBtn.textContent = 'skip';
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });
        overlay.appendChild(skipBtn);
        videoSkipBtnEl = skipBtn;
    }

    // Stops and clears whichever audio belongs to the clip currently (or
    // most recently) on screen. Called right before a new clip's audio
    // starts, and during full teardown (stopVideo).
    function _stopClipAudio() {
        if (videoClipAudioEl) {
            videoClipAudioEl.pause();
            videoClipAudioEl.currentTime = 0;
            videoClipAudioEl = null;
        }
    }

    // Loads and plays the clip at `idx` in videoClips, together with that
    // clip's own audio file (if it has one) — started in the same call so
    // they begin in lockstep. The clip's video track is muted whenever a
    // dedicated audio file is driving sound for it, so the two never
    // overlap. Falls back to resuming both on first user interaction if
    // autoplay is blocked, same pattern used elsewhere (startSong, etc.).
    function _playClip(idx) {
        if (!videoEl || !videoClips[idx]) return;
        videoClipIndex = idx;
        const clip = videoClips[idx];

        // The previous clip's audio (if any) has done its job — tear it
        // down before this clip's audio (if any) starts.
        _stopClipAudio();

        videoEl.src = clip.videoFile;
        videoEl.muted = !!clip.audio;
        videoEl.load();

        const attemptVideoPlay = () => videoEl.play().catch(() => {
            const resume = () => {
                if (videoEl) videoEl.play().catch(() => { });
                document.removeEventListener('click', resume);
                document.removeEventListener('keydown', resume);
            };
            document.addEventListener('click', resume, { once: true });
            document.addEventListener('keydown', resume, { once: true });
        });
        attemptVideoPlay();

        if (clip.audio) {
            videoClipAudioEl = new Audio(clip.audio);
            videoClipAudioEl.volume = 1.0;

            const attemptAudioPlay = () => videoClipAudioEl.play().catch(() => {
                const resume = () => {
                    if (videoClipAudioEl) videoClipAudioEl.play().catch(() => { });
                    document.removeEventListener('click', resume);
                    document.removeEventListener('keydown', resume);
                };
                document.addEventListener('click', resume, { once: true });
                document.addEventListener('keydown', resume, { once: true });
            });
            attemptAudioPlay();
        }
    }

    // Fires when the CURRENTLY LOADED clip reaches its end. Either holds on
    // that end frame for `gapAfterMs` (or advances instantly if 0) and then
    // plays the next clip (and its audio), or — if this was the last clip —
    // marks the sequence complete and relabels the skip button to
    // "continue". The video element (and, if the last clip had one, its
    // audio) is left untouched in that case, so playback stays on the last
    // frame/sound indefinitely (no loop, no auto-close).
    function _onClipEnded() {
        const nextIdx = videoClipIndex + 1;
        if (nextIdx < videoClips.length) {
            const gap = videoClips[videoClipIndex].gapAfterMs || 0;
            if (gap > 0) {
                videoGapTimeout = setTimeout(() => _playClip(nextIdx), gap);
            } else {
                _playClip(nextIdx);
            }
        } else {
            videoSeqComplete = true;
            if (videoSkipBtnEl) {
                videoSkipBtnEl.textContent = 'continue';
                videoSkipBtnEl.style.borderColor = 'rgba(255, 255, 255, 0.9)';
            }
        }
    }

    // True if this beat's captions use the per-line narration shape
    // ({ text, audio, durationMs }, no `start` field) rather than the
    // legacy start-based shape ({ text, start }). Detected off the first
    // caption line — a beat is one shape or the other, never mixed. This is
    // ENTIRELY INDEPENDENT of per-clip audio: a beat can use per-clip audio
    // for its video sound and still drive captions off either shape.
    function isPerLineNarration() {
        return videoCaptions.length > 0 && typeof videoCaptions[0].start !== 'number';
    }

    // Reveals caption line `idx`, plays its own narration audio, and — once
    // that audio finishes (or errors out, or the line has no audio at all)
    // — moves on to line `idx + 1`. This is what makes per-line narration
    // "just work" for pacing: a long sentence's own (longer) audio file
    // naturally keeps its caption on screen longer, no manual timing needed.
    // Stops cleanly once every line has played.
    function _playNarrationLine(idx) {
        if (!overlay || idx >= videoCaptions.length) {
            narrationActive = false;
            return;
        }
        narrationIndex = idx;
        const line = videoCaptions[idx];

        const lineEl = videoCaptionLineEls[idx];
        if (lineEl && lineEl.dataset.revealed !== '1') {
            lineEl.dataset.revealed = '1';
            lineEl.style.color = 'rgba(255, 255, 255, 0.95)';
            if (videoCaptionBoxEl) videoCaptionBoxEl.scrollTop = videoCaptionBoxEl.scrollHeight;
        }

        const advance = () => _playNarrationLine(idx + 1);

        if (line.audio) {
            narrationAudioEl = new Audio(line.audio);
            narrationAudioEl.volume = 1.0;
            narrationAudioEl.addEventListener('ended', advance, { once: true });
            narrationAudioEl.addEventListener('error', () => {
                // This line's audio file is missing/failed to load — don't
                // stall the whole beat on one bad file, fall back to the
                // word-count-estimated reading time instead (see
                // _estimateReadMs() in storyline-beats.js).
                narrationGapTimeout = setTimeout(advance, line.durationMs || 3200);
            }, { once: true });
            narrationAudioEl.play().catch(() => {
                const resume = () => {
                    if (narrationAudioEl) narrationAudioEl.play().catch(() => { });
                    document.removeEventListener('click', resume);
                    document.removeEventListener('keydown', resume);
                };
                document.addEventListener('click', resume, { once: true });
                document.addEventListener('keydown', resume, { once: true });
            });
        } else {
            // No audio for this line at all (e.g. still using a placeholder
            // beat) — just hold it on screen for its estimated reading time.
            narrationGapTimeout = setTimeout(advance, line.durationMs || 3200);
        }
    }

    // The video sync loop — ticks every frame for as long as the beat is
    // open. Reveals any caption lines whose start time has been reached.
    // Lines accumulate — once revealed, a line is never hidden or dimmed
    // again. Caption time comes from wall-clock time elapsed since the
    // sequence started (videoSeqStartTime) — a single clip's own currentTime
    // resets on every clip change and can't represent "time since the whole
    // sequence began," and per-clip audio no longer spans the sequence
    // either, so wall-clock is the only stable master clock left for this
    // legacy caption shape.
    // This loop deliberately never auto-closes the beat — closing only
    // happens when the user clicks the skip/continue button.
    function _videoSyncTick() {
        if (!overlay) return;

        // Per-line narration beats reveal their own captions from inside
        // _playNarrationLine as each line's audio starts — this tick loop
        // only handles the legacy start-based timing shape.
        if (isPerLineNarration()) {
            videoRafId = requestAnimationFrame(_videoSyncTick);
            return;
        }

        const nowMs = performance.now() - videoSeqStartTime;

        let revealedNew = false;
        for (let i = 0; i < videoCaptions.length; i++) {
            const lineEl = videoCaptionLineEls[i];
            if (!lineEl) continue;
            if (videoCaptions[i].start <= nowMs && lineEl.dataset.revealed !== '1') {
                lineEl.dataset.revealed = '1';
                lineEl.style.color = 'rgba(255, 255, 255, 0.95)';
                revealedNew = true;
            }
        }

        // Auto-scroll so the newest revealed line is always in view.
        if (revealedNew && videoCaptionBoxEl) {
            videoCaptionBoxEl.scrollTop = videoCaptionBoxEl.scrollHeight;
        }

        videoRafId = requestAnimationFrame(_videoSyncTick);
    }

    // Starts a video beat: normalizes the clip list, kicks off the caption
    // path (either the legacy wall-clock sync loop or the independent
    // per-line narration queue), and starts clip 0 (which starts its own
    // audio in lockstep, if it has one — see _playClip).
    function startVideo(video) {
        // Sort by `start` only for the legacy shape — per-line narration
        // captions have no `start` field and are already in play order.
        const rawCaptions = video.captions || [];
        videoCaptions = typeof rawCaptions[0]?.start === 'number'
            ? rawCaptions.slice().sort((a, b) => a.start - b.start)
            : rawCaptions.slice();
        videoClips = _normalizeVideoClips(video);
        videoClipIndex = -1;
        videoSeqComplete = false;
        videoSeqStartTime = performance.now();

        renderVideo(video);

        if (isPerLineNarration()) {
            // Per-line narration: each caption drives its own audio in
            // sequence, entirely independent of which video clip (and its
            // own per-clip audio) happens to be playing at the time.
            narrationActive = true;
            _playNarrationLine(0);
        } else {
            // Legacy start-based captions: wall-clock timer is the master
            // clock (per-clip audio no longer spans the whole sequence).
            videoRafId = requestAnimationFrame(_videoSyncTick);
        }

        _playClip(0);
    }

    function stopVideo() {
        if (videoRafId) {
            cancelAnimationFrame(videoRafId);
            videoRafId = null;
        }
        if (videoGapTimeout) {
            clearTimeout(videoGapTimeout);
            videoGapTimeout = null;
        }
        if (videoEl) {
            videoEl.removeEventListener('ended', _onClipEnded);
            videoEl.pause();
            videoEl.src = '';
            videoEl = null;
        }
        _stopClipAudio();
        if (narrationGapTimeout) {
            clearTimeout(narrationGapTimeout);
            narrationGapTimeout = null;
        }
        if (narrationAudioEl) {
            narrationAudioEl.pause();
            narrationAudioEl.currentTime = 0;
            narrationAudioEl = null;
        }
        narrationIndex = -1;
        narrationActive = false;
        videoCaptionBoxEl = null;
        videoCaptionLineEls = [];
        videoCaptions = [];
        videoClips = [];
        videoClipIndex = -1;
        videoSeqComplete = false;
        videoSkipBtnEl = null;
    }


    function close() {
        if (!overlay) return;
        if (slideAdvanceTimeout) {
            clearTimeout(slideAdvanceTimeout);
            slideAdvanceTimeout = null;
        }
        stopSong();
        stopVideo();
        overlay.style.transition = 'opacity 0.7s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            overlay = null;
            if (typeof onComplete === 'function') onComplete();
            if (typeof Audio_Manager !== 'undefined') {
                Audio_Manager.playBGM(Audio_Manager._lastBGMKey || 'title');
            }
        }, 720);
    }

    // -------------------------------------------------------------------
    // PUBLIC
    // -------------------------------------------------------------------

    function show(beatId, options = {}) {
        const isVideo = isVideoBeat(beatId, options);
        const isSong = !isVideo && isSongBeat(beatId, options);
        const isSlideshow = !isVideo && !isSong && isSlideshowBeat(beatId, options);

        let pages = null;
        let slideshow = null;
        let song = null;
        let video = null;
        let videoClipsCheck = null;

        if (isVideo) {
            video = buildVideo(beatId, options);
            videoClipsCheck = _normalizeVideoClips(video);
            if (!video || videoClipsCheck.length === 0) return;
        } else if (isSong) {
            song = buildSong(beatId, options);
            if (!song || !song.audio) return;
        } else if (isSlideshow) {
            slideshow = buildSlideshow(beatId, options);
            if (!slideshow || !slideshow.slides || slideshow.slides.length === 0) return;
        } else {
            pages = buildPages(beatId, options);
            if (!pages || pages.length === 0) return;
        }

        // Skip if already seen (unless forced)
        if (!options.force && hasSeen(beatId, options)) return;
        markSeen(beatId, options);

        onComplete = options.onComplete || null;

        overlay = createOverlay();
        document.body.appendChild(overlay);
        if (typeof Audio_Manager !== 'undefined') {
            Audio_Manager.stopBGM(300); // short fade so it doesn't cut harshly
        }

        if (isVideo) {
            startVideo(video);
            // Clicking/space does NOT skip a video beat — playback drives it.
            // Only the explicit skip/continue button (rendered in renderVideo) closes it early.
        } else if (isSong) {
            startSong(song);
            // Clicking/space does NOT skip a song beat — playback drives it.
            // Only the explicit skip button (rendered in renderSong) closes it early.
        } else if (isSlideshow) {
            currentSlides = slideshow.slides;
            currentSlideImagePath = slideshow.imagePath || INTRO_CINEMATIC_IMAGE_PATH;
            currentSlide = 0;
            renderSlideshow(currentSlides);

            // Click anywhere to advance / close
            overlay.addEventListener('click', () => advanceSlide(currentSlides));

            function onKeySlide(e) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    advanceSlide(currentSlides);
                }
            }
            document.addEventListener('keydown', onKeySlide);
        } else {
            currentPages = pages;
            currentPage = 0;
            renderPage(currentPages, currentPage);

            // Click anywhere to advance / close
            overlay.addEventListener('click', advance);

            // Keyboard: Space or Enter also advance
            function onKey(e) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    advance();
                }
            }
            document.addEventListener('keydown', onKey);
            // Remove listener when overlay closes
            // (listener is cleaned up when overlay is removed from DOM — acceptable for this use case)
        }
    }

    return { show };

})();


// ---------------------------------------------------------------------------
// SEEN-STATE — uses localStorage so beats only show once per save
// ---------------------------------------------------------------------------

function _seenKey(beatId, options = {}) {
    // For character beats, include character id in key
    const suffix = options.character
        ? `_${options.character}`
        : options.className
            ? `_${options.className}`
            : options.ascendencyClass
                ? `_${options.ascendencyClass}`
                : '';
    return `storyline_seen_${beatId}${suffix}`;
}

function hasSeen(beatId, options = {}) {
    try {
        return localStorage.getItem(_seenKey(beatId, options)) === '1';
    } catch (e) {
        return false;
    }
}

function markSeen(beatId, options = {}) {
    try {
        localStorage.setItem(_seenKey(beatId, options), '1');
    } catch (e) { /* storage unavailable */ }
}

// getUnlockedReplayEntries — subset of REPLAY_GALLERY_ENTRIES (storyline-beats.js)
// the player has already seen. Used by the title screen's Replay panel.
function getUnlockedReplayEntries() {
    if (typeof REPLAY_GALLERY_ENTRIES === 'undefined') return [];
    return REPLAY_GALLERY_ENTRIES.filter(entry => hasSeen(entry.beatId, entry.options || {}));
}



// Allow resetting a specific beat (useful for testing)
function resetBeat(beatId, options = {}) {
    try {
        localStorage.removeItem(_seenKey(beatId, options));
    } catch (e) { /* noop */ }
}

// Reset all story beats at once (e.g. new game)
function resetAllBeats() {
    try {
        Object.keys(localStorage)
            .filter(k => k.startsWith('storyline_seen_'))
            .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* noop */ }
}


// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * showBeat(beatId, options)
 *
 * beatId      — key from STORY_BEATS (e.g. 'intro_cinematic', 'region_5')
 * options     — {
 *   character:       'stox' | 'trix' | 'syla'      (for character_intro)
 *   className:       'Mathmagician' | ...           (for class_unlock)
 *   ascendencyClass: 'Outlier' | ...                 (for ascendency_unlock)
 *   force:           true                           (show even if already seen)
 *   onComplete:      function                       (called after the beat closes)
 * }
 *
 * Beats are shown only once per save by default (localStorage flag).
 * Pass { force: true } to override — handy for replaying in a codex / gallery.
 *
 * Video beats specifically (see the "VIDEO BEATS" comment block near the top
 * of this file for the full data shape): a beat's `video` can be either the
 * legacy single-clip `{ videoFile, audio }` shape, or a new `{ clips: [...] }`
 * shape for playing several clips back-to-back with a configurable pause
 * between each. Each clip can carry its OWN `audio` field — that file plays
 * in lockstep with its clip and is torn down the moment the sequence moves
 * to the next one. Either way, playback never loops — it freezes on the
 * final clip's last frame (and whatever its audio was doing), and the
 * corner button switches from "skip" to "continue" once that happens.
 */
function showBeat(beatId, options = {}) {
    StorylineRenderer.show(beatId, options);
}