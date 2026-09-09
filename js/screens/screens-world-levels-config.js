
'use strict';

//------------------------------------------------------------------------
//-------------------WORLD CONFIGURATIONS----------------------------------
//------------------------------------------------------------------------

const WD_WORLD_CONFIGS = [

    // -----------------------------------------------------------------------
    // PROBABILITY PEAKS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Probability-Peaks.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 55.8, y: 85.3 },
        nodes: [
            { x: 68.6, y: 82.4 },  // 1-1
            { x: 83.6, y: 75.3 },  // 1-2
            { x: 54.6, y: 72.8 },  // 1-3
            { x: 30.6, y: 90.4 },  // 1-4
            { x: 19.1, y: 78.6 },  // 1-5 Convergence
            { x: 16.1, y: 61.3 },  // 1-6
            { x: 26.2, y: 47.8 },  // 1-7
            { x: 30.8, y: 58.4 },  // 1-8
            { x: 41.5, y: 57.0 },  // 1-9 Convergence
            { x: 58.9, y: 58.4 },  // 1-10 
            { x: 76.6, y: 56.7 },  // 1-11
            { x: 64.3, y: 47.5 },  // 1-12
            { x: 64.5, y: 37.6 },  // 1-13 Ascension

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
        entrancePos: { x: 3.9, y: 35.0 },
        nodes: [
            { x: 17.5, y: 65.9 },  // 2-1
            { x: 31.9, y: 47.5 },  // 2-2
            { x: 44.5, y: 75.4 },  // 2-3
            { x: 50.2, y: 55.1 },  // 2-4 Convergence
            { x: 67.8, y: 81.8 },  // 2-5
            { x: 88.4, y: 62.1 },  // 2-6
            { x: 89.1, y: 41.1 },  // 2-7 Convergence
            { x: 76.2, y: 33.5 },  // 2-8
            { x: 69.0, y: 50.1 },  // 2-9
            { x: 49.7, y: 36.6 },  // 2-10
            { x: 50.3, y: 14.9 },  // 2-11 Ascension
            
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
        entrancePos: { x: 95.0, y: 93.6 },
        nodes: [
            { x: 89.5, y: 75.0 },  // 1
            { x: 72.2, y: 66.5 },  // 2
            { x: 88.8, y: 52.5 },  // 3
            { x: 73.4, y: 46.0 }, // 4 Convergence
            { x: 54.7, y: 35.0 },  // 5
            { x: 38.0, y: 32.9 },  // 6
            { x: 13.6, y: 51.1 },  // 7 Convergence
            { x: 21.1, y: 84.4 },  // 8
            { x: 37.2, y: 87.7 },  // 9
            { x: 59.2, y: 84.4 },  // 10
            { x: 38.1, y: 68.1 },  // 11 Ascension

        ],
    },

    // -----------------------------------------------------------------------
    // THE VORTEX OF POSSIBILITIES
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Vortex-of-Possibilities.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 5.6, y: 89.2 },
        nodes: [
            { x: 12.9, y: 90.1 },  // 1
            { x: 24.7, y: 88.0 },  // 2
            { x: 21.3, y: 74.8 },  // 3
            { x: 8.7, y: 73.0 },  // 4
            { x: 17.4, y: 61.9 },  // 5
            { x: 5.3, y: 61.0 },  // 6
            { x: 14.1, y: 45.1 },  // 7 Convergence
            { x: 31.7, y: 75.9 },  // 8
            { x: 49.5, y: 83.9 },  // 9
            { x: 66.1, y: 78.9 },  // 10
            { x: 84.6, y: 81.2 },  // 11
            { x: 84.6, y: 64.0 },  // 12
            { x: 85.0, y: 39.6 },  // 13 Convergence
            { x: 71.4, y: 22.9 },  // 14
            { x: 55.2, y: 15.5 },  // 15
            { x: 40.3, y: 25.9 },  // 16
            { x: 36.7, y: 46.1 },  // 17
            { x: 48.0, y: 61.6 },  // 18
            { x: 50.1, y: 49.0 },  // 19
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
        nodes: [
            { x: 63.0, y: 38.4 },  // 1
            { x: 74.2, y: 17.3 },  // 2
            { x: 90.2, y: 31.6 },  // 3
            { x: 92.5, y: 55.8 },  // 4
            { x: 83.0, y: 70.7 },  // 5 Convergence
            { x: 69.3, y: 78.4 },  // 6
            { x: 46.5, y: 90.0 },  // 7
            { x: 47.3, y: 69.2 },  // 8
            { x: 48.1, y: 47.3 },  // 9 Convergence
            { x: 24.5, y: 62.1 , hideRoad: true },  // 10
            { x: 7.2, y: 51.7 },  // 11
            { x: 32.2, y: 44.8 },  // 12
            { x: 22.9, y: 32.6 },  // 13 Ascension
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
        nodes: [
            { x: 43.9, y: 68.4 },  // 1
            { x: 29.3, y: 54.3 },  // 2
            { x: 11.9, y: 55.1 },  // 3
            { x: 22.5, y: 68.6 },  // 4 Convergence
            { x: 59.2, y: 85.0, hideRoad: true },  // 5
            { x: 76.5, y: 64.2 },  // 6
            { x: 88.9, y: 56.7 },  // 7
            { x: 80.2, y: 85.9 },  // 8 Convergence
            { x: 40.7, y: 45.4, hideRoad: true },  // 9
            { x: 31.2, y: 34.1 },  // 10
            { x: 21.1, y: 24.0 },  // 11
            { x: 54.6, y: 49.9, hideRoad: true },  // 12 Ascension

        ],
        extraRoads: [
            { from: 0, to: 4, showAfter: 3 },
            { from: 0, to: 8, showAfter: 7 },
            { from: 0, to: 11, showAfter: 10},
        ],
    },



    // -----------------------------------------------------------------------
    // Stochapolis
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Stochapolis.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 50.5, y: 92.7 }, 
        nodes: [
            { x: 37.1, y: 82.4 },  // 1
            { x: 27.5, y: 71.6 },  // 2
            { x: 15.9, y: 53.7 },  // 3
            { x: 14.7, y: 75.7 },  // 4 Convergence
            { x: 62.1, y: 81.0, hideRoad: true },  // 5
            { x: 85.3, y: 76.6 },  // 6
            { x: 83.0, y: 53.9 },  // 7
            { x: 76.8, y: 29.3 },  // 8 Convergence
            { x: 61.8, y: 36.7 },  // 9
            { x: 44.3, y: 27.6 },  // 10
            { x: 27.8, y: 31.1 },  // 11
            { x: 44.5, y: 52.0 },  // 12 Ascension
        ],
        extraRoads: [
            { from: 'entrance', to: 4, showAfter: 3},

        ],
    },


    // -----------------------------------------------------------------------
    // HYPOTHESIS HINTERLANDS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Hypothesis-Hinterlands.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 39.2, y: 27.3 },
        nodes: [
            { x: 43.7, y: 53.4 },  // 1
            { x: 8.6, y: 63.6 },  // 2
            { x: 21.0, y: 35.2 },  // 3 Convergence
            { x: 68.9, y: 51.4, hideRoad: true },  // 4
            { x: 72.9, y: 28.4 }, // 5
            { x: 89.7, y: 70.7, hideRoad: true },  // 6 Convergence
            { x: 74.0, y: 79.7 },  // 7
            { x: 36.9, y: 82.1, hideRoad: true },  // 8
            { x: 59.0, y: 87.4, hideRoad: true },  // 9 Ascension
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
        nodes: [
            { x: 25.6, y: 37.0 },  // 1
            { x: 38.8, y: 33.8 },  // 2
            { x: 36.3, y: 52.6 },  // 3
            { x: 27.8, y: 74.7 },  // 4
            { x: 18.3, y: 86.6 },  // 5
            { x: 16.6, y: 61.3 },  // 6 Convergence
            { x: 55.1, y: 79.4, hideRoad: true },  // 7
            { x: 63.4, y: 70.9 },  // 8
            { x: 63.0, y: 84.6 },  // 9
            { x: 70.6, y: 76.9 },  // 10
            { x: 89.8, y: 82.3 },  // 11 Convergence
            { x: 77.5, y: 54.6 },  // 12
            { x: 84.6, y: 30.4 },  // 13
            { x: 68.6, y: 19.7 },  // 14
            { x: 52.3, y: 32.6 },  // 15
            { x: 52, y: 50.7 },  // 16 Ascension

        ],
        extraRoads: [
            {from: 3, to: 6, showAfter: 5},

        ],
    },


    // -----------------------------------------------------------------------
    // PARAMETER PLAINS
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/Parameter-Plains.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 51.5, y: 91.2 },
        nodes: [
            
            { x: 42.4, y: 73.4 },  // 1
            { x: 18.5, y: 78.4 },  // 2
            { x: 18.2, y: 57.8 },  // 3
            { x: 19.0, y: 41.0 },  // 4 Convergence
            { x: 38.2, y: 38.6 },  // 5
            { x: 47.8, y: 43.0 },  // 6
            { x: 66.1, y: 55.1 },  // 7
            { x: 86.9, y: 57.8 },  // 8 Convergence
            { x: 79.9, y: 38.9 }, // 9
            { x: 80.4, y: 21.9 },  // 10
            { x: 62.7, y: 23.6 },  // 11
            { x: 51.4, y: 18.8 },  // 12 Ascension
            
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
        nodes: [
            
            { x: 26.0, y: 70.4 },  // 1
            { x: 45.7, y: 51.9 },  // 2
            { x: 35.1, y: 33.7 },  // 3
            { x: 53.6, y: 22.1 },  // 4 Convergence
            { x: 82.2, y: 21.2 },  // 5
            { x: 89.1, y: 37.0 },  // 6
            { x: 87.7, y: 57.0 },  // 7 Convergence
            { x: 78.2, y: 74.5 },  // 8
            { x: 67.7, y: 84.9 },  // 9
            { x: 52.9, y: 73.9 },  // 10
            { x: 57.6, y: 50.7 },  // 11 Ascension
            
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
        nodes: [
            { x: 84.0, y: 40.0 },  // 12-1 harbor docks
            { x: 85.0, y: 28.0 },  // 12-2 cliff harbor
            { x: 73.0, y: 22.0 },  // 12-3 toward silent keep
            { x: 62.0, y: 28.0 },  // 12-4 silent keep temple
            { x: 48.0, y: 32.0 },  // 12-5 north water (Convergence)
            { x: 32.0, y: 30.0 },  // 12-6 promontory edge
            { x: 20.0, y: 28.0 },  // 12-7 crystal cliffs
            { x: 14.0, y: 42.0 },  // 12-8 west shipwreck north
            { x: 20.0, y: 55.0 },  // 12-9 wreck masts
            { x: 26.0, y: 66.0 },  // 12-10 dead-tree islet (Convergence)
            { x: 38.0, y: 72.0 },  // 12-11 south whirlpool rim
            { x: 55.0, y: 70.0 },  // 12-12 south rim east
            { x: 70.0, y: 62.0 },  // 12-13 toward straits
            { x: 78.0, y: 75.0 },  // 12-14 credible straits obelisk
            { x: 66.0, y: 85.0 },  // 12-15 Ascension over maelstrom
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
        nodes: [
            { x: 80.0, y: 84.0 },  // 13-1 hamlet ruins
            { x: 88.0, y: 70.0 },  // 13-2 tower base
            { x: 78.0, y: 60.0 },  // 13-3 integration bridge east
            { x: 66.0, y: 55.0 },  // 13-4 bridge arch
            { x: 58.0, y: 62.0 },  // 13-5 canyon rim (Convergence)
            { x: 52.0, y: 50.0 },  // 13-6 variance valley
            { x: 42.0, y: 38.0 },  // 13-7 sigma rocks
            { x: 32.0, y: 32.0 },  // 13-8 deviation spires (Convergence)
            { x: 20.0, y: 40.0 },  // 13-9 cliff lake overlook
            { x: 14.0, y: 55.0 },  // 13-10 lake of large numbers
            { x: 24.0, y: 62.0 },  // 13-11 sigma bridge
            { x: 36.0, y: 58.0 },  // 13-12 canyon west rim
            { x: 48.0, y: 32.0 },  // 13-13 ascent slope
            { x: 58.0, y: 22.0 },  // 13-14 peak base
            { x: 62.0, y: 12.0 },  // 13-15 Peak Mu summit Ascension
        ],
        extraRoads: [


        ],
    },


    // -----------------------------------------------------------------------
    // NEXUS WORLD (secret World 14 — Descriptive Statistics)
    // -----------------------------------------------------------------------
    {
        bgImage: 'images/The-Nexus.webp',
        imageAspect: 16 / 9,
        entrancePos: { x: 8.0, y: 90.0 },
        nodes: [
            { x: 10.0, y: 80.0 },  // 14-1 compass point, Sample Space rim
            { x: 16.0, y: 62.0 },  // 14-2 Omega ring west
            { x: 24.0, y: 45.0 },  // 14-3 beneath Sample Space text
            { x: 33.0, y: 40.0 },  // 14-4 Kolmogorov Cradle
            { x: 40.0, y: 52.0 },  // 14-5 P(Omega)=1 (Convergence)
            { x: 42.0, y: 64.0 },  // 14-6 P(A)>=0 floor
            { x: 47.0, y: 74.0 },  // 14-7 union formula floor
            { x: 56.0, y: 64.0 },  // 14-8 Variance Collapse Epicenter
            { x: 64.0, y: 60.0 },  // 14-9 crack road to sanctum
            { x: 72.0, y: 55.0 },  // 14-10 Cartographers Sanctum (Convergence)
            { x: 84.0, y: 56.0 },  // 14-11 Entropy Archives approach
            { x: 92.0, y: 56.0 },  // 14-12 Entropy Archives
            { x: 78.0, y: 72.0 },  // 14-13 Constants Pillars
            { x: 80.0, y: 86.0 },  // 14-14 Null Event Void
            { x: 51.0, y: 34.0 },  // 14-15 Apex of Stochastics Ascension
        ],
        extraRoads: [


        ],
    },

];