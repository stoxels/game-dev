import { _fxChronobolt, _fxHourglass, _fxStopwatch } from './add-time.js';
import { _fxArtifact } from './artifact-complete.js';
import { _fxChronoFracture } from './chrono-fracture.js';
import { _fxVortex } from './cursed-col-solve.js';
import { _fxCursedReveal } from './cursed-reveal.js';
import { _fxChaosGrid } from './cursed-row-col.js';
import { _fxTidalWave } from './cursed-row-solve.js';
import { _fxCursedShield } from './cursed-shield.js';
import { _fxCursedTime } from './cursed-time.js';
import { _fxFreeze } from './freeze.js';
import { _fxGoldenClock } from './golden-clock.js';
import { _fxEraser, _fxErrorGem, _fxErrorMagnet, _fxSweeper } from './mark-wrong.js';
import { _fxTutorItem } from './tutor-item.js';
import { _fxPearl } from './pearls.js';
import { _fxCandle, _fxMagnifier, _fxScanner, _fxSpyglass } from './reveal.js';
import { _fxColSolve, _fxRowSolve } from './row-col-solve.js';
import { _fxScoutPrimer } from './scouts-primer-item.js';
import { _fxShadowSeal } from './shadow-seal.js';
import { _fxClock } from './shared/fx-helpers.js';
import { _fxShield } from './shield.js';
import { _fxSurveyScope } from './survey-scope.js';
import { _fxTheWitch } from './the-witch.js';

//------------------------------------------------------------------------
//-------------------FX DISPATCH----------------------
//------------------------------------------------------------------------

// playItemEffect(defId) - routes an item id to its visual effect
// function. The effect implementations live in the per-item files; this
// dispatcher is the only place that references them by name.

export function playItemEffect(defId) {
    if (!defId) return;

    // ── REVEAL ────────────────────────────────────────────────
    if (defId === 'reveal1') return _fxCandle();
    if (defId === 'reveal2') return _fxMagnifier();
    if (defId === 'reveal3') return _fxSpyglass();
    if (defId === 'reveal4') return _fxScanner();

    // ── MARK-WRONG ────────────────────────────────────────────
    if (defId === 'markWrong2') return _fxEraser();
    if (defId === 'markWrong4') return _fxSweeper();
    if (defId === 'markWrong6') return _fxErrorMagnet();
    if (defId === 'markWrong8') return _fxErrorGem();

    // ── ADD TIME ──────────────────────────────────────────────
    if (defId === 'addTime60') return _fxHourglass();
    if (defId === 'addTime300') return _fxStopwatch();
    if (defId === 'addTime600') return _fxClock();
    if (defId === 'addTime900') return _fxChronobolt();

    // ── UTILITY ───────────────────────────────────────────────
    if (defId === 'freeze') return _fxFreeze();
    if (defId === 'shield') return _fxShield();
    if (defId === 'rowSolve') return _fxRowSolve();
    if (defId === 'colSolve') return _fxColSolve();
    if (defId === 'surveyScope') return _fxSurveyScope();
    if (defId === 'scoutPrimer') return _fxScoutPrimer();
    if (defId === 'artifactComplete') return _fxArtifact();
    if (defId === 'tutor' ||
        defId === 'tutor4' ||
        defId === 'tutor6' ||
        defId === 'tutorAll') return _fxTutorItem(defId);

    // ── CURSED ────────────────────────────────────────────────
    if (defId === 'cursedReveal') return _fxCursedReveal();
    if (defId === 'cursedTime') return _fxCursedTime();
    if (defId === 'cursedShield') return _fxCursedShield();
    if (defId === 'cursedRowSolve') return _fxTidalWave();
    if (defId === 'cursedColSolve') return _fxVortex();
    if (defId === 'cursedRowCol') return _fxChaosGrid();

    // ── PEARLS ────────────────────────────────────────────────
    if (defId === 'pearlOfHaste') return _fxPearl('#88aaff');
    if (defId === 'pearlOfSwiftness') return _fxPearl('#cc88ff');
    if (defId === 'grandPearl') return _fxPearl('#e0e0e0');

    // ── KEYSTONES ─────────────────────────────────────────────
    if (defId === 'theWitch') return _fxTheWitch();
    if (defId === 'goldenClock') return _fxGoldenClock();
    if (defId === 'shadowSeal') return _fxShadowSeal();

    if (defId === 'chronoFracture') return _fxChronoFracture();
}
