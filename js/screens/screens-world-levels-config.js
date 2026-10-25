
'use strict';

//------------------------------------------------------------------------
//-------------------WORLD CONFIGURATIONS----------------------------------
//------------------------------------------------------------------------

export const WD_WORLD_CONFIGS = [

    // -----------------------------------------------------------------------
    // PROBABILITY PEAKS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Probability-Peaks.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 55.8, y: 85.3 },
        // Convergence Trial node.
        trialNode: { x: 41.7, y: 59.9 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 64.6, y: 37.9 },
        // Story node (character intro): only for that character, opens once level `from` (0-based) is cleared.
        storyNode: { character: 'stox', from: 4, x: 8.5, y: 89, label: 'Stox - Where It Started', labelDE: 'Stox - Wo alles begann' },
        nodes: [
            { x: 68.6, y: 82.4 },  // 1
            { x: 83.6, y: 75.3 },  // 2
            { x: 54.6, y: 72.8 },  // 3
            { x: 30.6, y: 90.4 },  // 4
            { x: 19.1, y: 78.6 },  // 5
            { x: 16.1, y: 61.3 },  // 6
            { x: 26.2, y: 47.8 },  // 7
            { x: 30.6, y: 61.6 },  // 8
            { x: 39.8, y: 75 },  // 9
            { x: 52.7, y: 64 },  // 10
            { x: 66.6, y: 62.7 },  // 11
            { x: 72.5, y: 53.6 },  // 12
            { x: 61.8, y: 46.3 },  // 13
        ],
        extraRoads: [
        ],
    },


    // -----------------------------------------------------------------------
    // THE DISTRIBUTION DEN
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Distribution-Den.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 4.8, y: 39.1 },
        // Convergence Trial node.
        trialNode: { x: 89.2, y: 41.8 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 50, y: 14.4 },
        nodes: [
            { x: 17.2, y: 64.7 },  // 1
            { x: 31.9, y: 47.5 },  // 2
            { x: 44.5, y: 75.4 },  // 3
            { x: 50.2, y: 55.1 },  // 4
            { x: 67.8, y: 81.8 },  // 5
            { x: 88.4, y: 62.1 },  // 6
            { x: 81.1, y: 48.2 },  // 7
            { x: 76.2, y: 33.5 },  // 8
            { x: 69, y: 50.1 },  // 9
            { x: 49.7, y: 47 },  // 10
            { x: 50.1, y: 38.5 },  // 11
        ],
        extraRoads: [
        ],
    },



    // -----------------------------------------------------------------------
    // SAMPLING SAVANNA
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Sampling-Savanna.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 95, y: 93.6 },
        // Convergence Trial node.
        trialNode: { x: 14.4, y: 54.6 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 38, y: 71.3 },
        nodes: [
            { x: 89.5, y: 75 },  // 1
            { x: 72.2, y: 66.5 },  // 2
            { x: 88.8, y: 52.5 },  // 3
            { x: 73.4, y: 46 },  // 4
            { x: 54.7, y: 35 },  // 5
            { x: 38, y: 32.9 },  // 6
            { x: 24.5, y: 55 },  // 7
            { x: 15, y: 72.8 },  // 8
            { x: 25.7, y: 91.4 },  // 9
            { x: 45.2, y: 92 },  // 10
            { x: 58.7, y: 84.3 },  // 11
        ],
        extraRoads: [
        ],
    },

    // -----------------------------------------------------------------------
    // THE VORTEX OF POSSIBILITIES
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Vortex-of-Possibilities.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 5.6, y: 89.2 },
        // Convergence Trial node.
        trialNode: { x: 86.3, y: 39.1 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 49.9, y: 50.4 },
        nodes: [
            { x: 12.9, y: 90.1 },  // 1
            { x: 24.7, y: 88 },  // 2
            { x: 21.3, y: 74.8 },  // 3
            { x: 8.7, y: 73 },  // 4
            { x: 17.4, y: 61.9 },  // 5
            { x: 5.3, y: 61 },  // 6
            { x: 14.1, y: 45.1 },  // 7
            { x: 31.7, y: 75.9 },  // 8
            { x: 49.5, y: 83.9 },  // 9
            { x: 66.1, y: 78.9 },  // 10
            { x: 84.6, y: 81.2 },  // 11
            { x: 84.6, y: 64 },  // 12
            { x: 80.4, y: 44.4 },  // 13
            { x: 71.4, y: 22.9 },  // 14
            { x: 55.2, y: 15.5 },  // 15
            { x: 40.3, y: 25.9 },  // 16
            { x: 36.7, y: 46.1 },  // 17
            { x: 48, y: 61.6 },  // 18
            { x: 58, y: 53.8 },  // 19
        ],
        extraRoads: [
        ],
    },


    // -----------------------------------------------------------------------
    // REGRESSION RIFT
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Regression-Rift.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 54.8, y: 24.9 },
        // Convergence Trial node.
        trialNode: { x: 47.3, y: 37.4 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 23.2, y: 36.1 },
        // Story node (character intro): only for that character, opens once level `from` (0-based) is cleared.
        storyNode: { character: 'trix', from: 1, x: 62.5, y: 30.5, label: 'Trix - The Ruined Observatory', labelDE: 'Trix - Das zerstörte Observatorium' },
        nodes: [
            { x: 72.1, y: 18.5 },  // 1
            { x: 70.8, y: 38.1 },  // 2
            { x: 90.2, y: 31.6 },  // 3
            { x: 92.5, y: 55.8 },  // 4
            { x: 83, y: 70.7 },  // 5
            { x: 69.3, y: 78.4 },  // 6
            { x: 46.5, y: 90 },  // 7
            { x: 47.3, y: 69.2 },  // 8
            { x: 48.1, y: 47.3 },  // 9
            { x: 24.5, y: 62.1, hideRoad: true },  // 10
            { x: 7.2, y: 51.7 },  // 11
            { x: 32.2, y: 44.8 },  // 12
            { x: 36.8, y: 25.9 },  // 13
        ],
        extraRoads: [
            { from: 6, to: 9, showAfter: 8 },
        ],
    },


    // -----------------------------------------------------------------------
    // FREQUENCY FOREST 
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Frequency-Forest.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 42.3, y: 91.1 },
        // Convergence Trial node.
        trialNode: { x: 85.7, y: 72.7 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 54.1, y: 51.7 },
        // Story node (character intro): only for that character, opens once level `from` (0-based) is cleared.
        storyNode: { character: 'syla', from: 3, x: 23.5, y: 83.5, label: 'Syla - Her Childhood Home', labelDE: 'Syla - Ihr Elternhaus' },
        nodes: [
            { x: 43.9, y: 68.4 },  // 1
            { x: 29.3, y: 54.3 },  // 2
            { x: 11.9, y: 55.1 },  // 3
            { x: 22.5, y: 68.6 },  // 4
            { x: 59.2, y: 85, hideRoad: true },  // 5
            { x: 73.4, y: 57.4 },  // 6
            { x: 85.9, y: 40.4 },  // 7
            { x: 95.1, y: 57.4 },  // 8
            { x: 40.7, y: 45.4, hideRoad: true },  // 9
            { x: 31.2, y: 34.1 },  // 10
            { x: 21.1, y: 24 },  // 11
            { x: 49.1, y: 59.2, hideRoad: true },  // 12
        ],
        extraRoads: [
            { from: 0, to: 4, showAfter: 3 },
            { from: 0, to: 8, showAfter: 7 },
            { from: 0, to: 11, showAfter: 10 },
        ],
    },



    // -----------------------------------------------------------------------
    // Stochapolis
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Stochapolis.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 50.5, y: 92.7 },
        // Convergence Trial node.
        trialNode: { x: 77.6, y: 29.7 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 46.6, y: 50.1 },
        nodes: [
            { x: 37.1, y: 82.4 },  // 1
            { x: 27.5, y: 71.6 },  // 2
            { x: 15.9, y: 53.7 },  // 3
            { x: 14.7, y: 75.7 },  // 4
            { x: 62.1, y: 81, hideRoad: true },  // 5
            { x: 85.3, y: 76.6 },  // 6
            { x: 83, y: 53.9 },  // 7
            { x: 73.2, y: 45 },  // 8
            { x: 61.8, y: 36.7 },  // 9
            { x: 44.3, y: 27.6 },  // 10
            { x: 27.8, y: 31.1 },  // 11
            { x: 35.2, y: 45.8 },  // 12
        ],
        extraRoads: [
            { from: 'entrance', to: 4, showAfter: 3 },
        ],
    },


    // -----------------------------------------------------------------------
    // HYPOTHESIS HINTERLANDS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Hypothesis-Hinterlands.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 39.2, y: 27.3 },
        // Convergence Trial node.
        trialNode: { x: 89.3, y: 62.9 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 57.9, y: 85.5 },
        nodes: [
            { x: 43.7, y: 53.4 },  // 1
            { x: 8.6, y: 63.6 },  // 2
            { x: 21, y: 35.2 },  // 3
            { x: 68.9, y: 51.4, hideRoad: true },  // 4
            { x: 72.9, y: 28.4 },  // 5
            { x: 79.4, y: 58.1, hideRoad: true },  // 6
            { x: 74, y: 79.7 },  // 7
            { x: 36.9, y: 82.1, hideRoad: true },  // 8
            { x: 60.8, y: 61.7, hideRoad: true },  // 9
        ],
        extraRoads: [
            { from: 0, to: 3, showAfter: 2 },
            { from: 3, to: 5, showAfter: 4 },
            { from: 0, to: 7, showAfter: 6 },
            { from: 3, to: 8, showAfter: 7 },
        ],
    },


    // -----------------------------------------------------------------------
    // DATA DELTA
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Data-Delta.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 15.8, y: 15.1 },
        // Convergence Trial node.
        trialNode: { x: 88.4, y: 81 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 51.9, y: 49.4 },
        nodes: [
            { x: 25.6, y: 37 },  // 1
            { x: 38.8, y: 33.8 },  // 2
            { x: 36.3, y: 52.6 },  // 3
            { x: 27.8, y: 74.7 },  // 4
            { x: 18.3, y: 86.6 },  // 5
            { x: 16.6, y: 61.3 },  // 6
            { x: 55.1, y: 79.4, hideRoad: true },  // 7
            { x: 63.4, y: 70.9 },  // 8
            { x: 63, y: 84.6 },  // 9
            { x: 70.6, y: 76.9 },  // 10
            { x: 72.4, y: 86.4 },  // 11
            { x: 77.5, y: 54.6 },  // 12
            { x: 81.5, y: 39.4 },  // 13
            { x: 86.6, y: 28.3 },  // 14
            { x: 70.8, y: 22.1 },  // 15
            { x: 65.7, y: 39.5 },  // 16
        ],
        extraRoads: [
            { from: 3, to: 6, showAfter: 5 },
        ],
    },


    // -----------------------------------------------------------------------
    // PARAMETER PLAINS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Parameter-Plains.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 51.5, y: 91.2 },
        // Convergence Trial node.
        trialNode: { x: 80, y: 20 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 17.8, y: 78.6 },
        nodes: [
            { x: 55, y: 83 },  // 1
            { x: 50.1, y: 66.2 },  // 2
            { x: 60.7, y: 57.6 },  // 3
            { x: 71.7, y: 68 },  // 4
            { x: 86.9, y: 59.5 },  // 5
            { x: 72.4, y: 48.8 },  // 6
            { x: 66.8, y: 37.1 },  // 7
            { x: 59.4, y: 29.9 },  // 8
            { x: 48.9, y: 42.5 },  // 9
            { x: 30, y: 41.1 },  // 10
            { x: 13.3, y: 41.8 },  // 11
            { x: 26.1, y: 67.1 },  // 12
        ],
        extraRoads: [
        ],
    },


    // -----------------------------------------------------------------------
    // NULL HYPOTHESIS VOID
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Null-Hypothesis-Void.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 6.1, y: 88.6 },
        // Convergence Trial node.
        trialNode: { x: 82.2, y: 21.2 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 57.6, y: 49.9 },
        nodes: [
            { x: 26, y: 70.4 },  // 1
            { x: 45.7, y: 51.9 },  // 2
            { x: 32.7, y: 37.4 },  // 3
            { x: 21.8, y: 24.8 },  // 4
            { x: 43.9, y: 30.7 },  // 5
            { x: 65.7, y: 29.2 },  // 6
            { x: 78.4, y: 41.5 },  // 7
            { x: 88.2, y: 58.1 },  // 8
            { x: 72.9, y: 85.3 },  // 9
            { x: 54.7, y: 86.7 },  // 10
            { x: 53.9, y: 64.8 },  // 11
        ],
        extraRoads: [
        ],
    },




    // -----------------------------------------------------------------------
    // BAYESIAN BAY
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Bayesian-Bay.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 89.4, y: 35.5 },
        // Convergence Trial node.
        trialNode: { x: 13.2, y: 78 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 50.6, y: 61.4 },
        nodes: [
            { x: 82.4, y: 46.2 },  // 1
            { x: 74.1, y: 38.2 },  // 2
            { x: 74.8, y: 29.9 },  // 3
            { x: 61.3, y: 20.1 },  // 4
            { x: 42.2, y: 34.6 },  // 5
            { x: 29.9, y: 31.6 },  // 6
            { x: 20.4, y: 25.4 },  // 7
            { x: 14, y: 54.4 },  // 8
            { x: 28, y: 59.9 },  // 9
            { x: 27.3, y: 80.8 },  // 10
            { x: 37.3, y: 80.5 },  // 11
            { x: 57, y: 90.4 },  // 12
            { x: 72.5, y: 87.2 },  // 13
            { x: 77.9, y: 73.7 },  // 14
            { x: 59.1, y: 72.5 },  // 15
        ],
        extraRoads: [
        ],
    },


    // -----------------------------------------------------------------------
    // EXPECTATION PLATEAU 
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Expectation-Plateau.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 89.8, y: 92.1 },
        // Convergence Trial node.
        trialNode: { x: 33.6, y: 32.5 },
        // Ascension Trial node - the road continues here after the world's last level.
        ascensionNode: { x: 62.2, y: 17.7 },
        nodes: [
            { x: 70.3, y: 81.2 },  // 1
            { x: 86.8, y: 80.5 },  // 2
            { x: 77.8, y: 63.9 },  // 3
            { x: 63.9, y: 48.7 },  // 4
            { x: 57.1, y: 49.9 },  // 5
            { x: 46.6, y: 54 },  // 6
            { x: 36.2, y: 57.2 },  // 7
            { x: 26.4, y: 57.5 },  // 8
            { x: 25.6, y: 39.7 },  // 9
            { x: 35.3, y: 39.4 },  // 10
            { x: 42.3, y: 32.2 },  // 11
            { x: 43.7, y: 45.5 },  // 12
            { x: 58, y: 43.5 },  // 13
            { x: 76.8, y: 39.1 },  // 14
            { x: 62.4, y: 32.3 },  // 15
        ],
        extraRoads: [
        ],
    },


    // -----------------------------------------------------------------------
    // NEXUS WORLD (secret World 14 - Descriptive Statistics)
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/The-Nexus.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 8, y: 90 },
        nodes: [
            { x: 16.6, y: 78.9 },  // 1
            { x: 18.5, y: 62.1 },  // 2
            { x: 20.6, y: 46.9 },  // 3
            { x: 32.9, y: 44.3 },  // 4
            { x: 36.4, y: 56.4 },  // 5
            { x: 36.4, y: 75.2 },  // 6
            { x: 47.9, y: 82.8 },  // 7
            { x: 55.2, y: 70.9 },  // 8
            { x: 67.3, y: 87.7 },  // 9
            { x: 83.5, y: 82.2 },  // 10
            { x: 90.5, y: 68.5 },  // 11
            { x: 89.8, y: 57 },  // 12
            { x: 75.5, y: 44.5 },  // 13
            { x: 60.8, y: 55.9 },  // 14
            { x: 51, y: 34 },  // 15
        ],
        extraRoads: [
        ],
    },

];