//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const CHANGELOG_DATA = [

    {
        version: "v0.27 BETA",
        date: "22.07.2026",
        changes: [
            {
                category: "New Features",
                items: [
                    "Settings Modal has been fully remade.",
                    "There are now up to 20 individual Save - Slots. Each one can be reset individually and progress is based per Save - Slot."

                ],

            },
            {
                category: "General Adjustments",
                items: [
                    "Reduced the amount of achievements required to unlock Moodle Codes 2,3,4,5.",
                    "If you have enough Score to unlock a new Code but insufficient Achievement Points, then previously a Modal Popup occured after every single solved Stoxel. This now only happens after Game Setup and before Level Selection, so once per play session.",
                ],

            },
            {
                category: "Bug Fixes",
                items: [

                ],

            },


        ],


    },

    {
        version: "v0.26 BETA",
        date: "13.07.2026",
        changes: [
            {
                category: "New Features",
                items: [
                    "World 10 has been added.",
                    "World 11 has been added",
                    "Added a Replay button to the title screen to replay unlocked storyline beats and the tutorial.",
                    "Fully remade the Data Strike row/col selection panel for the Statistician class.",
                    "Fully remade the Infinite Hunger screen for the Outlier class.",
                    



                ],

            },
            {
                category: "General Adjustments",
                items: [
                    "It is now possible to dismiss Inference quest milestone popups by clicking on them.",
                    "While a character is walking towards the target node you can now select a different node to cancel the old routing on the next waypoint arrival to walk towards the newly selected node.",
                    "When going into the Probability Screen after a Convergence event, and then pressing the Back button in the Probability Tree screen, you will now automatically return to the detailed Map Screen of the World you were just in instead of the Overworld Screen.",
                    "Added a Sound Effect for Sylas nature trait.",
                    "The Loaded Dice effect of Trix does now work without having the passive tree nodes active.",
                    "Tutorial image adjustments",
                    "Removed some duplicated Quiz and Excercise questions.",
                    "The same Quiz or Excercise question can now no longer appear for the next 10 questions.",
                    "Moodle Codes Screen has been updated.",
                    "There is now a new effect on the Overworld Map if all Levels of a specific World have been cleared. This effect is more intense if all levels are cleared and all bonus requirements are met, and even more intense if all levels are cleared, all bonus requirements are met and all levels have been cleared on Hard with all available game modifiers.",

                ],

            },
            {
                category: "Bug Fixes",
                items: [
                    "Fixed a bug that made characters move faster on the world map when resizing the game window mid-walking.",
                    "Fixed a bug that made Level 8-5 only have 5 minutes duration instead of 30 minutes.",
                    "Fixed a bug that caused the glowing border effect around the grid applied by Shield items to remain on screen when leaving a level through the LEVELS button.",
                    "Fixed a bug that caused the CLUES button to create an arbitrary gap between row clue numbers after they have been switched back from right to left again. Now there is no more gap and the CLUES button remains in the same position permanently.",
                    "Fixed a bug that made the Time Trial modifier penalize the Base Score for level completion incorrectly.",
                    "Fixed a bug that made the lose overlay reposition itself weirdly in some situations.",
                ],

            },


        ],


    },


    {
        version: "v0.25.1 BETA",
        date: "09.07.2026",
        changes: [
            {
                category: "New Features",
                items: [
                    "Game Reset Screen has been completely remade.",
                    "The Win Overlay Screen has been redesigned to properly show a solved Stoxel visual.",


                ],

            },
            {
                category: "General Adjustments", 
                items: [
                    "Adjusted the way the Drag Stroke Counter works. It is now checking for correctly pre-filled correct cells, and if there are any then it starts counting the increased correctly filled counter instead of only the newly created new correct fills.",
                    "Clarified the description of the Unshakeable trait for Stox: Mistake penalties escalate 30% more slowly for Stox. The Trait description has been updated.",
                    "Multiple Choice question elimination chance can now exceed 100%. Values above 100% have a chance for multiple wrong answer removals.",
                    "Syla's Trait Quick Study now requires no Probability Tree investment and stacks with Probability Tree effects properly. The Trait description has been updated.",
                    "Optimized image loading and performance. In some cases this results in up to 75% improved load times.",
                ],

            },
            {
                category: "Bug Fixes",
                items: [
                    "Potentially fixed a bug that cause issues image loading in the intro while having a higher than usual connection delay. Together with image load optimization this should result in a smoother Intro sequence.",
                    "Fixed a bug that still caused console log output.",
                ],

            },


        ],


    },


    {
        version: "v0.25 BETA - CARTOGRAPHERS OF CHANCE Expansion",
        date: "06.07.2026",
        changes: [
            {
                category: "New Features",
                items: [
                    "The Cartographers of Chance are here! You can now choose between 3 playable Characters: Stox, Trix and Syla.",
                    "Stoxels now has gotten a storyline and intro cinematics.",
                    "Character Avatars for Stox, Trix and Syla vary with your chosen class and class upgrades, and can be moved around on the screen, either with WASD or mouse dragging.",
                    "Character movement on screen and maps is fully animated.",
                    "Characters have personalities and will react to the way you interact with a Stoxel.",
                    "Characters have unique traits that affect the way they interact with Stoxels.",
                    "Some characters & class abilities are now animated. More animations will be added over time",
                    "Added World 9.",
                    "Complete Graphical overhowl of the whole game",
                    "Title Screen has been complete remade",
                    "New Title Screen and Level Selection music has been added",
                    "The Tutorial has been completely remade",
                    "Game Setup Screen has been completely remade",
                    "Level Selection has been completely remade. The old version is still available through the List button, for now. Will be removed in the future.",
                    "Moodle Codes Screen has been completely remade",
                    "Highscores Screen has been completely remade",
                    "The Inference Modal overlay has been completely remade",
                    "Quiz, Excercise and Scout's Primer overlays have been completely remade",
                    "Special nodes are properly marked in the new interactive Level Selection screen.",
                    "Class Selection Screen has been completely remade.",
                    "Base Class Spell Upgrade Screens have been completely remade.",
                    "Ascendency Class Selection Screen has been completely remade, for all possible choices.",
                    "Ascendency Class Spell Upgrade Screens have been completely remade, for all Ascendency Classes.",
                    "All nodes are now visibly a Stoxel while unsolved.",
                    "Stoxels now have background images.",
                    "Added a new Setting: Touchpad Mode. When activated, it makes a small button appear on near the top (next to the mistake counter) that when activated, will cause leftclicks to do a X - mark and right click to do a reveal. Useful when using a touchpad and having issues doing right clicks. By default this button is disabled."

                ],
            },

            {
                category: "General Adjustments",
                items: [
                    "The following Levels now have a Probability gate: 3-10, 4-12, 4-17,",
                    "Adjusted level 4-4.",
                    "The Clue - Scrollbar to move the row clue header to the right has been removed. Instead there is now a button that instantly moves all row clues towards the right and reverse the clue number order.",
                    "Added a text - shadow to clue numbers so they are more visible on some backgrounds.",
                    "The Timer now has a black background so its more visible against some backgrounds",
                    "Inference Milestone Popups now show up for 10 seconds instead of 5 seconds.",
                    "Browney, Drifter and Wiener will now charge the grid.",
                    "Arcane Reveal, Diagonal Strike, Precision Mark, Field Scan and Residual Totem now have targeting crosshair effects.",
                    "Precision Mark has been renamed to Precision Shot and received a new visual. The marked incorrect cells now only switch to marked after getting hit by projectiles.",
                    "Field Scan has been changed from an instant ability targeting a random area to an armed ability where you can select the area to scan.",
                    "Field Scan ability has been renamed to Rain of Arrows.",
                    "Field Scan visual has been fully reworked.",
                    "Field Scan cooldown increased from 3 minutes to 5 minutes.",
                    "Field Scan Targeting Marker now also shows the full size of cells that will be revealed. The Targeting Marker targets the upper left corner of the NxN area.",
                    "If you have reached the Score - Treshold for a new Moodle Code, but have not reached the required Achievement - Treshold yet (for Codes 2-5), then currently a Toast Message is being shown that states you need to unlock more Achievements. This Toast - Message has been changed to an actual Modal and will now correctly show up.",
                    "Started working on Website Responsiveness such that Stoxels looks better on various screen sizes.",
                    "Adjusted unit color on Excercise Questions.",
                    "Class Selections now only register when pressing the Select button, instead of clicking anywhere on the class card.",
                    
                ],
            },

            {
                category: "Bug Fixes",
                items: [
                    "Fixed a bug that made the timer continue and eventually play the Game Over Sound when leaving a puzzle through the LEVELS button.",
                    "Fixed a bug that made cells revealed or marked by abilities or items transparent for half a second.",
                    "Fixed a bug that made the Skip button appear again after correctly answering a Quiz question",
                    "Fixed some bugs around bonus objectives in various levels",

                ],


            }



        ],


    },
    {
        version: "v0.24 BETA",
        date: "08.06.2026",
        changes: [
            {
                category: "New Features",
                items: [
                    "Added this Changelog. Will stay English only for now.",
                    "Added a Passive Tracker that tracks the state of various probability tree nodes while doing a puzzle. The Passive Tracker can be minimized and moved around.",
                    "Achievements for interactions with the Probability Tree and the Inference system have been added.",
                    "Added Pause functionality: Pressing Escape while in a Level now pauses and unpauses the game.",
                    "Added World 8.",

                ],
            },
            {
                category: "General Adjustments",
                items: [
                    "Slightly adjusted the order of levels in world 1 and 4.",
                    "Slightly adjusted the following levels: Union Bound, Exponential Distribution, Impossible Event, Algebra, Probability Tree, Quantile Function, Expectation, Discrete Expected Value, Draw without Order with Replacement, Standard Deviation, Variance Property, Transformation, Density Transform, Linearity, Convolution, Standard Normal, Poisson Limit Theorem, Geometric Expectation, Poisson Convolution, Geometric Distribution, Hypergeometric Distribution, Multivariate Normal Distribution, Variance of Dependent Sum, Correlation Bound, Bilinearity, Data Histogram with Gaussian Curve, Mean, Tschebyscheff, Central Limit Theorem  ",
                    "Multiple Choice and Excercises now use a different font for question texts and font size has been increased. This should help with seeing math symbols more clearly.",
                    "Updated and improved various Multiple Choice and Excercise questions.",
                    "Added a new sound effect that occurs when a shield - item effect protects the player from a penalty.",
                    "Using a Shield now visually protects the whole grid while it is active.",
                    "Almost all files have gotten another round of optimization and cleanup.",
                    "Updated the How-to-play? section.",
                    "Tutor - Items can now no longer be used when having no mistakes",
                    "The same question can now no longer appear more than once within the same Scouts Primer question pool.",
                    "Alot of german text has been updated.",
                    "Achievement Toasts now only show for 5 seconds (down from 10 seconds). They also appear much faster on the screen now.",
                    "Progress Bars towards Moodle Codes are now shown in the Codes screen instead of the Highscore screen. These now also give information about achievement milestone progress towards unlocking Moodle Codes.",
                    "Adjusted the Level Selection tooltip on Levels to indicate that you can get even more Score by completing the level faster when having all modifiers.",
                    "Time Penalties for mistakes have been slightly increased to offset all of the available ways of increasing time that exist now.",
                    "Title Screen has been modernized",
                    "Started building the foundations for an Endgame system.",
                ],
            },
            {
                category: "Class Changes",
                items: [
                    "Actuary: New sound effects added for both abilities.",
                    "Outlier: Tail Risk ability description has been adjusted.",
                    "Outlier: Tail Risk now shows the costs in minutes:seconds instead of only in seconds.",
                    "Probabilist: Precision Mark Bows now only target the cells it has just marked, instead of all marked cells on the grid.",
                    "Bayesian: Bayes Traps Fuse Timer reduced from 10 seconds down to 7 seconds.",
                    "Random Walker: Brownian Motion and Drifter are now instant abilities.", 
                    "Random Walker: Drifter cooldown has been reduced from 10 minutes to 5 minutes.",
                    "Random Walker: Drifter's parting gift is no longer able to walk.",
                    "Random Walker: Drifter's remaining Timer is now additionally also shown as Countdown underneath the icon on the grid.",
                    "Recursionist: Residual now properly requires a mistake cell to be selected.",
                    "Recursionist: Base Radius of Residual Totem Beams has been increased by 1 for each ability rank.",
                ],
            },
            {
                category: "Probability Tree",
                items: [
                    "Keystone nodes have been renamed to Keystones.",
                    "Keystone nodes are now visually distinct on the Probability Tree.",
                    "When opening the Tree the view is now centered on the last node you have selected.",
                    "Added a new sound effect for the Poisson Process node.",
                    "Binomial Burst now has a visual effect and an audio cue when it activates.",
                    "Residual Analysis proc chance has been lowered from 25% to 10%. Other nodes can now increase the chance to 25%.",
                    "Added a new visual and sound effect for Residual Analysis.",
                    "Error Feedback now has a new visual and sound effect.",
                    "Overfitting now plays an Alert sound when crossing the treshold.",
                    "Sample Efficiency now has new visuals and sound effects",
                    "Stochastic Resonance now has new visuals and sound effects",
                ],
            },
            {
                category: "Bug Fixes",
                items: [
                    "Fixed a bug that caused Inference Milestone Popups to not play a sound effect.",
                    "Fixed a bug that allowed casting instant abilities while a targeted ability was already armed.",
                    "Fixed a bug that made units on input Excercises not respect the chosen language when they were picked as bonus quiz question.",
                    "Fixed a bug that caused issues with scaling the grid.",
                    "Fixed a bug that made the Back buttons on the Highscores and Moodle Codes tabs huge.",
                ],
            }
        ]
    }
];


//------------------------------------------------------------------------
//-------------------CHANGELOG RENDERING----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML string for a single change category group (e.g. "Bug Fixes")
function buildCategoryGroupHtml(group) {
    const items = group.items
        .map(item => `<li>${item}</li>`)
        .join("");

    return `
        <div class="cl-category-group">
            <div class="cl-category-label">${group.category}</div>
            <ul class="cl-list">${items}</ul>
        </div>`;
}

// Builds the HTML string for a single version block, including all its category groups
function buildVersionBlockHtml(update) {
    const categoryGroupsHtml = update.changes
        .map(buildCategoryGroupHtml)
        .join("");

    return `
        <div class="cl-version-block">
            <div class="cl-header">
                <span class="cl-version-num">${update.version}</span>
                <span class="cl-date">${update.date}</span>
            </div>
            ${categoryGroupsHtml}
        </div>`;
}

// Renders the full changelog into the DOM. Skips if already rendered.
function renderChangelog() {
    const container = document.getElementById("changelog-content");
    if (container.innerHTML !== "") return;

    container.innerHTML = CHANGELOG_DATA
        .map(buildVersionBlockHtml)
        .join("");
}


//------------------------------------------------------------------------
//-------------------CHANGELOG MODAL--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Opens the changelog modal, rendering its content first if needed
function openChangelog() {
    renderChangelog();
    document.getElementById("changelog-modal").classList.add("show");
}