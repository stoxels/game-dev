import { _fxChronobolt, _fxHourglass, _fxStopwatch } from './add-time/add-time.js';
import { _fxArtifact } from './artifact-complete/artifact-complete.js';
import { _fxChronoFracture } from './chrono-fracture/chrono-fracture.js';
import { _fxVortex } from './cursed/cursed-col-solve.js';
import { _fxCursedReveal } from './cursed/cursed-reveal.js';
import { _fxChaosGrid } from './cursed/cursed-row-col.js';
import { _fxTidalWave } from './cursed/cursed-row-solve.js';
import { _fxCursedShield } from './cursed/cursed-shield.js';
import { _fxCursedTime } from './cursed/cursed-time.js';
import { _fxFreeze } from './freeze/freeze.js';
import { _fxGoldenClock } from './golden-clock/golden-clock.js';
import { _fxEraser, _fxErrorGem, _fxErrorMagnet, _fxSweeper } from './mark-wrong.js';
import { _fxTutorItem } from './tutor-item/tutor-item.js';
import { _fxPearl } from './pearls/pearls.js';
import { _fxCandle, _fxMagnifier, _fxScanner, _fxSpyglass } from './reveal/reveal.js';
import { _fxColSolve, _fxRowSolve } from './row-col-solve/row-col-solve.js';
import { _fxScoutPrimer } from './scouts-primer/scouts-primer-item.js';
import { _fxShadowSeal } from './shadow-seal/shadow-seal.js';
import { _fxClock } from '../puzzle-mechanics/fx-helpers.js';
import { _fxShield } from './shield/shield.js';
import { _fxSurveyScope } from './survey-scope/survey-scope.js';
import { _fxTheWitch } from './the-witch/the-witch.js';

//------------------------------------------------------------------------
//-------------------ITEM FX DISPATCH TABLE-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps an item id to the visual effect that runs when the item is used.
// One row per item: giving an item its look means adding a row here, not
// touching playItemEffect(). Each row receives the item id (the Tutor
// entries use it, pearls ignore it and pass their glow color, everything
// else ignores it too).
const ITEM_FX = {
    // REVEAL
    reveal1: _fxCandle,
    reveal2: _fxMagnifier,
    reveal3: _fxSpyglass,
    reveal4: _fxScanner,

    // MARK-WRONG
    markWrong2: _fxEraser,
    markWrong4: _fxSweeper,
    markWrong6: _fxErrorMagnet,
    markWrong8: _fxErrorGem,

    // ADD TIME
    addTime60: _fxHourglass,
    addTime300: _fxStopwatch,
    addTime600: _fxClock,
    addTime900: _fxChronobolt,

    // UTILITY
    freeze: _fxFreeze,
    shield: _fxShield,
    rowSolve: _fxRowSolve,
    colSolve: _fxColSolve,
    surveyScope: _fxSurveyScope,
    scoutPrimer: _fxScoutPrimer,
    artifactComplete: _fxArtifact,
    tutor: _fxTutorItem,
    tutor4: _fxTutorItem,
    tutor6: _fxTutorItem,
    tutorAll: _fxTutorItem,

    // CURSED
    cursedReveal: _fxCursedReveal,
    cursedTime: _fxCursedTime,
    cursedShield: _fxCursedShield,
    cursedRowSolve: _fxTidalWave,
    cursedColSolve: _fxVortex,
    cursedRowCol: _fxChaosGrid,

    // PEARLS
    pearlOfHaste: () => _fxPearl('#88aaff'),
    pearlOfSwiftness: () => _fxPearl('#cc88ff'),
    grandPearl: () => _fxPearl('#e0e0e0'),

    // KEYSTONES + special
    theWitch: _fxTheWitch,
    goldenClock: _fxGoldenClock,
    shadowSeal: _fxShadowSeal,
    chronoFracture: _fxChronoFracture,
};


//------------------------------------------------------------------------
//-------------------ITEM FX DISPATCH-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// playItemEffect(defId) - routes an item id to its visual effect function.
// The effect implementations live in the per-item files; this dispatcher
// is the only place that references them by name. Unknown or empty ids
// do nothing.
export function playItemEffect(defId) {
    if (!defId) return;
    const fx = ITEM_FX[defId];
    if (fx) return fx(defId);
}
