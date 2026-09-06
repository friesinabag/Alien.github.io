/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */


/* =========================================================
   ROLES
   ========================================================= */

const ROLES = {

    alien: {
        name: "Alien",
        icon: "👽",
        hostile: true,
        description:
            "Kill 1 player per round. If there is no living Saboteur, you may choose Kill or Sabotage."
    },

    saboteur: {
        name: "Saboteur",
        icon: "😈",
        hostile: true,
        description:
            "Sabotage 1 ship system per round."
    },

    silencer: {
        name: "Silencer",
        icon: "🔇",
        hostile: true,
        description:
            "Silence 1 player for 2 rounds. They can still discuss and use their ability, but cannot vote."
    },

    engineer: {
        name: "Engineer",
        icon: "🔧",
        hostile: false,
        description:
            "Repair 1 offline system per round. You can always act, even when Power is offline."
    },

    detective: {
        name: "Detective",
        icon: "🕵️",
        hostile: false,
        description:
            "Investigate 1 player and discover who or what they interacted with last round."
    },

    medic: {
        name: "Medic",
        icon: "🩺",
        hostile: false,
        description:
            "Protect 1 player from being killed each round."
    },

    captain: {
        name: "Captain",
        icon: "👨‍✈️",
        hostile: false,
        description:
            "If a vote is tied, secretly choose which tied player is ejected."
    },

    guard: {
        name: "Guard",
        icon: "🛡️",
        hostile: false,
        description:
            "Block 1 player's ability for the round."
    },

    survivor: {
        name: "Survivor",
        icon: "👤",
        hostile: false,
        description:
            "You have no special ability."
    }

};


/* =========================================================
   SYSTEMS
   ========================================================= */

const SYSTEM_NAMES = {

    engines: "🚀 Engines",
    o2: "🫁 O2",
    communications: "📡 Communications",
    power: "⚡ Power"

};


/* =========================================================
   GAME STATE
   ========================================================= */

let game = {

    players: [],

    round: 1,

    stage: 1,

    currentPlayerIndex: 0,

    currentVoteIndex: 0,

    abilityQueue: [],

    abilityIndex: 0,

    reactionQueue: [],

    reactionIndex: 0,

    /*
     * Players who were ALIVE when the round started.
     *
     * This is what allows someone who dies during the
     * round to still receive their reaction.
     */
    roundStartAliveIds: [],

    systems: {

        engines: true,
        o2: true,
        communications: true,
        power: true

    },

    actions: {},

    previousActions: {},

    blockedPlayers: new Set(),

    protectedPlayers: new Set(),

    silencedUntil: {},

    votes: {},

    selectedAction: null,

    selectedVote: null,

    randomisedRoles: false,

    /*
     * Actual random roles are stored here.
     *
     * They are NOT shown in the setup dropdown.
     */
    randomRoles: {},

    reactionInfo: {},

    lastRoundResults: [],

    lifelineNumber: 0,

    gameOver: false

};


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {

    return document.getElementById(id);

}


function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.add("hidden");

        });

    const screen = $(id);

    if (screen) {

        screen.classList.remove("hidden");

    }

}


function getPlayer(id) {

    return game.players.find(
        player => player.id === id
    );

}


function getAlivePlayers() {

    return game.players.filter(
        player => player.alive
    );

}


function getLivingHostiles() {

    return getAlivePlayers().filter(
        player => ROLES[player.role].hostile
    );

}


function getLivingHumans() {

    return getAlivePlayers().filter(
        player => !ROLES[player.role].hostile
    );

}


function isPowerOnline() {

    return game.systems.power;

}


function isEnginesOnline() {

    return game.systems.engines;

}


function isSilenced(player) {

    if (!player) return false;

    return (
        game.silencedUntil[player.id] &&
        game.round <
        game.silencedUntil[player.id]
    );

}


/* =========================================================
   PLAYER SETUP
   ========================================================= */

function createPlayerSetup() {

    const count =
        Number($("playerCount").value);

    const container =
        $("playersSetup");

    if (!container) return;

    container.innerHTML = "";

    game.randomisedRoles = false;

    game.randomRoles = {};

    for (let i = 0; i < count; i++) {

        const row =
            document.createElement("div");

        row.className =
            "player-setup";

        row.innerHTML = `

            <input
                type="text"
                class="player-name"
                data-index="${i}"
                value="Player ${i + 1}"
                placeholder="Player ${i + 1}"
            >

            <select
                class="role-select"
                data-index="${i}"
            >

                <option value="alien">
                    👽 Alien
                </option>

                <option value="saboteur">
                    😈 Saboteur
                </option>

                <option value="silencer">
                    🔇 Silencer
                </option>

                <option value="engineer">
                    🔧 Engineer
                </option>

                <option value="detective">
                    🕵️ Detective
                </option>

                <option value="medic">
                    🩺 Medic
                </option>

                <option value="captain">
                    👨‍✈️ Captain
                </option>

                <option value="guard">
                    🛡️ Guard
                </option>

                <option value="survivor">
                    👤 Survivor
                </option>

            </select>

        `;

        container.appendChild(row);

    }

}


/* =========================================================
   HOSTILE COUNT
   ========================================================= */

function getHostileCount(count) {

    if (count <= 5) return 1;

    if (count <= 7) return 2;

    if (count <= 10) return 3;

    return Math.min(
        4,
        Math.floor((count - 1) / 2)
    );

}


/* =========================================================
   RANDOMISE ROLES
   ========================================================= */

function randomiseRoles() {

    const selects = [
        ...document.querySelectorAll(
            ".role-select"
        )
    ];

    if (!selects.length) return;

    const count =
        selects.length;

    const hostileCount =
        getHostileCount(count);

    let roles = [];


    /*
     * Always have an Alien.
     */

    roles.push("alien");


    /*
     * Second hostile.
     */

    if (hostileCount >= 2) {

        roles.push("saboteur");

    }


    /*
     * Third hostile.
     */

    if (hostileCount >= 3) {

        roles.push("silencer");

    }


    /*
     * Extra hostile slots become Aliens.
     */

    while (
        roles.length <
        hostileCount
    ) {

        roles.push("alien");

    }


    /*
     * Engineer is guaranteed.
     */

    roles.push("engineer");


    const humanRoles = [

        "detective",
        "medic",
        "captain",
        "guard",
        "survivor"

    ];


    while (
        roles.length <
        count
    ) {

        const randomHuman =
            humanRoles[
                Math.floor(
                    Math.random() *
                    humanRoles.length
                )
            ];

        roles.push(randomHuman);

    }


    /*
     * Shuffle.
     */

    for (
        let i = roles.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            roles[i],
            roles[j]
        ] = [
            roles[j],
            roles[i]
        ];

    }


    /*
     * Store the actual roles.
     */

    game.randomRoles = {};


    roles.forEach(
        (role, index) => {

            game.randomRoles[index] =
                role;

            /*
             * IMPORTANT:
             *
             * The dropdown NEVER shows
             * the actual random role.
             */

            const select =
                selects[index];

            select.innerHTML = `

                <option value="random">
                    🎲 RANDOM
                </option>

                <option value="manual-alien">
                    👽 Alien
                </option>

                <option value="manual-saboteur">
                    😈 Saboteur
                </option>

                <option value="manual-silencer">
                    🔇 Silencer
                </option>

                <option value="manual-engineer">
                    🔧 Engineer
                </option>

                <option value="manual-detective">
                    🕵️ Detective
                </option>

                <option value="manual-medic">
                    🩺 Medic
                </option>

                <option value="manual-captain">
                    👨‍✈️ Captain
                </option>

                <option value="manual-guard">
                    🛡️ Guard
                </option>

                <option value="manual-survivor">
                    👤 Survivor
                </option>

            `;

            /*
             * Always display RANDOM.
             */

            select.value =
                "random";

            /*
             * DO NOT disable it.
             */

            select.disabled =
                false;

            /*
             * Do NOT use pointer-events:none.
             */

            select.style.pointerEvents =
                "auto";


            /*
             * If the user chooses a role,
             * replace the hidden role.
             */

            select.onchange =
                function () {

                    const value =
                        this.value;

                    if (
                        value ===
                        "random"
                    ) {

                        return;

                    }


                    const newRole =
                        value.replace(
                            "manual-",
                            ""
                        );


                    /*
                     * Replace the secret role.
                     */

                    game.randomRoles[index] =
                        newRole;


                    /*
                     * Hide it again.
                     */

                    this.value =
                        "random";

                };

        }
    );


    game.randomisedRoles =
        true;

}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

    const names = [
        ...document.querySelectorAll(
            ".player-name"
        )
    ];

    const selects = [
        ...document.querySelectorAll(
            ".role-select"
        )
    ];

    if (
        !names.length ||
        !selects.length
    ) {

        return;

    }


    game.players = [];

    let hasEngineer =
        false;


    for (
        let i = 0;
        i < names.length;
        i++
    ) {

        const name =
            names[i].value.trim() ||
            `Player ${i + 1}`;

        let role;


        /*
         * If randomised:
         *
         * Use the hidden role.
         */

        if (
            game.randomisedRoles
        ) {

            role =
                game.randomRoles[i];

        }

        /*
         * Otherwise use the visible
         * manually selected role.
         */

        else {

            role =
                selects[i].value;

        }


        if (
            role === "engineer"
        ) {

            hasEngineer =
                true;

        }


        game.players.push({

            id: i,

            name: name,

            role: role,

            alive: true

        });

    }


    /*
     * Engineer MUST exist.
     */

    if (!hasEngineer) {

        game.players[
            game.players.length - 1
        ].role =
            "engineer";

    }


    game.round = 1;

    game.stage = 1;

    game.currentPlayerIndex = 0;

    game.currentVoteIndex = 0;

    game.abilityQueue = [];

    game.abilityIndex = 0;

    game.reactionQueue = [];

    game.reactionIndex = 0;

    game.roundStartAliveIds = [];


    game.systems = {

        engines: true,
        o2: true,
        communications: true,
        power: true

    };


    game.actions = {};

    game.previousActions = {};

    game.blockedPlayers =
        new Set();

    game.protectedPlayers =
        new Set();

    game.silencedUntil = {};

    game.votes = {};

    game.reactionInfo = {};

    game.lastRoundResults = [];

    game.lifelineNumber = 0;

    game.gameOver = false;


    beginRound();

}


/* =========================================================
   BEGIN ROUND
   ========================================================= */

function beginRound() {

    if (game.gameOver) return;

    cleanupSilences();


    /*
     * SNAPSHOT OF EVERYONE ALIVE
     * AT THE START OF THE ROUND.
     *
     * This list does NOT change if somebody
     * dies during the round.
     */

    const aliveAtStart =
        getAlivePlayers();


    game.roundStartAliveIds =
        aliveAtStart.map(
            player => player.id
        );


    /*
     * Ability turns.
     */

    game.abilityQueue =
        [...game.roundStartAliveIds];

    game.abilityIndex = 0;


    game.actions = {};

    game.blockedPlayers =
        new Set();

    game.protectedPlayers =
        new Set();

    game.reactionInfo = {};


    showPassScreen();

}


/* =========================================================
   ABILITY PASS SCREEN
   ========================================================= */

function showPassScreen() {

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        resolveActions();

        return;

    }


    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );


    if (
        !player ||
        !player.alive
    ) {

        game.abilityIndex++;

        showPassScreen();

        return;

    }


    $("passPlayerName").textContent =
        player.name;

    $("passRound").textContent =
        `ROUND ${game.round}`;


    showScreen("passScreen");

}


/* =========================================================
   PLAYER TURN
   ========================================================= */

function startPlayerTurn() {

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        resolveActions();

        return;

    }


    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );


    if (
        !player ||
        !player.alive
    ) {

        game.abilityIndex++;

        showPassScreen();

        return;

    }


    game.currentPlayerIndex =
        player.id;


    showRoleForCurrentPlayer();

}


/* =========================================================
   SHOW ROLE
   ========================================================= */

function showRoleForCurrentPlayer() {

    const player =
        getPlayer(
            game.currentPlayerIndex
        );

    if (!player) return;


    const role =
        ROLES[player.role];


    $("rolePlayerName").textContent =
        player.name;

    $("roleIcon").textContent =
        role.icon;

    $("roleName").textContent =
        role.name;

    $("roleDescription").textContent =
        role.description;


    const hostileList =
        $("hostileList");


    if (hostileList) {

        if (role.hostile) {

            const hostiles =
                getLivingHostiles()
                    .filter(
                        other =>
                            other.id !==
                            player.id
                    );


            if (
                hostiles.length
            ) {

                hostileList.innerHTML = `

                    <strong>
                        HOSTILE TEAM:
                    </strong>

                    <br>

                    ${
                        hostiles
                            .map(
                                other =>
                                    `${ROLES[other.role].icon} ${other.name}`
                            )
                            .join("<br>")
                    }

                `;

            }

            else {

                hostileList.innerHTML =
                    "<strong>YOU ARE THE ONLY HOSTILE.</strong>";

            }

        }

        else {

            hostileList.innerHTML =
                "";

        }

    }


    showScreen("roleScreen");

}


/* =========================================================
   SHOW ACTION
   ========================================================= */

function showActionForCurrentPlayer() {

    const player =
        getPlayer(
            game.currentPlayerIndex
        );

    if (!player) return;


    /*
     * Survivor does nothing.
     */

    if (
        player.role ===
        "survivor"
    ) {

        game.selectedAction = {
            type: "none"
        };

        finishCurrentPlayerTurn();

        return;

    }


    /*
     * Power offline.
     *
     * Engineer is the exception.
     */

    if (
        !isPowerOnline() &&
        player.role !==
        "engineer"
    ) {

        $("actionTitle").textContent =
            "⚡ POWER OFFLINE";

        $("actionDescription").textContent =
            "Your ability cannot be used because Power is offline.";

        $("actionOptions").innerHTML =
            "";

        game.selectedAction = {
            type: "none",
            unavailable: true
        };

        $("confirmActionButton").style.display =
            "block";

        showScreen("actionScreen");

        return;

    }


    setupActionScreen(player);

}


/* =========================================================
   ACTION SETUP
   ========================================================= */

function setupActionScreen(player) {

    switch (player.role) {

        case "alien":
            showAlienAction(player);
            break;

        case "saboteur":
            showSaboteurAction(player);
            break;

        case "silencer":
            showSilencerAction(player);
            break;

        case "engineer":
            showEngineerAction(player);
            break;

        case "detective":
            showDetectiveAction(player);
            break;

        case "medic":
            showMedicAction(player);
            break;

        case "guard":
            showGuardAction(player);
            break;

        case "captain":
            showCaptainAction(player);
            break;

        default:

            game.selectedAction = {
                type: "none"
            };

            finishCurrentPlayerTurn();

    }

}


/* =========================================================
   ALIEN
   ========================================================= */

function showAlienAction(player) {

    $("actionTitle").textContent =
        "👽 ALIEN";

    $("actionDescription").textContent =
        "Choose a living player to kill.";

    createPlayerActionButtons(
        player,
        target => ({

            type: "kill",

            targetId:
                target.id

        })
    );


    /*
     * Alien can sabotage ONLY when
     * there is no living Saboteur.
     */

    const saboteurAlive =
        getLivingHostiles()
            .some(
                p =>
                    p.role ===
                    "saboteur"
            );


    if (!saboteurAlive) {

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "action-option";

        button.textContent =
            "⚠️ SABOTAGE A SYSTEM";

        button.onclick =
            () => {

                showAlienSabotageAction();

            };


        $("actionOptions")
            .appendChild(button);

    }


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   ALIEN SABOTAGE
   ========================================================= */

function showAlienSabotageAction() {

    $("actionTitle").textContent =
        "⚠️ ALIEN SABOTAGE";

    $("actionDescription").textContent =
        "Choose 1 ship system to sabotage.";

    createSystemActionButtons(
        system => ({

            type: "sabotage",

            system

        }),
        true
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   SABOTEUR
   ========================================================= */

function showSaboteurAction() {

    $("actionTitle").textContent =
        "😈 SABOTEUR";

    $("actionDescription").textContent =
        "Choose 1 ship system to sabotage.";

    createSystemActionButtons(
        system => ({

            type: "sabotage",

            system

        }),
        true
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   SILENCER
   ========================================================= */

function showSilencerAction() {

    $("actionTitle").textContent =
        "🔇 SILENCER";

    $("actionDescription").textContent =
        "Choose 1 living player to silence for 2 rounds.";

    createPlayerActionButtons(
        getPlayer(
            game.currentPlayerIndex
        ),
        target => ({

            type: "silence",

            targetId:
                target.id

        })
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   ENGINEER
   ========================================================= */

function showEngineerAction() {

    $("actionTitle").textContent =
        "🔧 ENGINEER";

    $("actionDescription").textContent =
        "Choose 1 offline system to repair.";

    createSystemActionButtons(
        system => ({

            type: "repair",

            system

        }),
        false
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   DETECTIVE
   ========================================================= */

function showDetectiveAction() {

    $("actionTitle").textContent =
        "🕵️ DETECTIVE";

    $("actionDescription").textContent =
        "Choose a living player to investigate.";

    createPlayerActionButtons(
        getPlayer(
            game.currentPlayerIndex
        ),
        target => ({

            type: "investigate",

            targetId:
                target.id

        })
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   MEDIC
   ========================================================= */

function showMedicAction() {

    $("actionTitle").textContent =
        "🩺 MEDIC";

    $("actionDescription").textContent =
        "Choose a living player to protect.";

    createPlayerActionButtons(
        getPlayer(
            game.currentPlayerIndex
        ),
        target => ({

            type: "protect",

            targetId:
                target.id

        })
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   GUARD
   ========================================================= */

function showGuardAction() {

    $("actionTitle").textContent =
        "🛡️ GUARD";

    $("actionDescription").textContent =
        "Choose a living player whose ability you want to block.";

    createPlayerActionButtons(
        getPlayer(
            game.currentPlayerIndex
        ),
        target => ({

            type: "block",

            targetId:
                target.id

        })
    );


    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   CAPTAIN
   ========================================================= */

function showCaptainAction() {

    $("actionTitle").textContent =
        "👨‍✈️ CAPTAIN";

    $("actionDescription").textContent =
        "Your special ability activates if the vote is tied.";

    $("actionOptions").innerHTML =
        "";

    game.selectedAction = {
        type: "none"
    };

    $("confirmActionButton").style.display =
        "block";

    showScreen(
        "actionScreen"
    );

}


/* =========================================================
   PLAYER ACTION BUTTONS
   ========================================================= */

function createPlayerActionButtons(
    currentPlayer,
    actionCreator
) {

    const container =
        $("actionOptions");

    container.innerHTML =
        "";

    $("confirmActionButton").style.display =
        "block";

    game.selectedAction =
        null;


    const targets =
        getAlivePlayers()
            .filter(
                player =>
                    player.id !==
                    currentPlayer.id
            );


    targets.forEach(
        target => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "action-option";

            button.textContent =
                target.name;


            button.onclick =
                () => {

                    document
                        .querySelectorAll(
                            ".action-option"
                        )
                        .forEach(
                            btn =>
                                btn.classList
                                    .remove(
                                        "selected"
                                    )
                        );


                    button.classList.add(
                        "selected"
                    );


                    game.selectedAction =
                        actionCreator(
                            target
                        );

                };


            container.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   SYSTEM ACTION BUTTONS
   ========================================================= */

function createSystemActionButtons(
    actionCreator,
    sabotage
) {

    const container =
        $("actionOptions");

    container.innerHTML =
        "";

    $("confirmActionButton").style.display =
        "block";

    game.selectedAction =
        null;


    Object.keys(
        game.systems
    ).forEach(
        system => {

            const online =
                game.systems[
                    system
                ];


            /*
             * Sabotage online systems.
             */

            if (
                sabotage &&
                !online
            ) return;


            /*
             * Repair offline systems.
             */

            if (
                !sabotage &&
                online
            ) return;


            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "action-option";

            button.textContent =
                SYSTEM_NAMES[
                    system
                ];


            button.onclick =
                () => {

                    document
                        .querySelectorAll(
                            ".action-option"
                        )
                        .forEach(
                            btn =>
                                btn.classList
                                    .remove(
                                        "selected"
                                    )
                        );


                    button.classList.add(
                        "selected"
                    );


                    game.selectedAction =
                        actionCreator(
                            system
                        );

                };


            container.appendChild(
                button
            );

        }
    );


    if (
        !container.children.length
    ) {

        container.innerHTML =
            sabotage
                ? "<p>No systems can be sabotaged.</p>"
                : "<p>No systems need repairing.</p>";


        game.selectedAction = {
            type: "none"
        };

    }

}


/* =========================================================
   CONFIRM ACTION
   ========================================================= */

function confirmAction() {

    if (!game.selectedAction) {

        game.selectedAction = {
            type: "none"
        };

    }


    const player =
        getPlayer(
            game.currentPlayerIndex
        );


    if (!player) return;


    game.actions[player.id] =
        game.selectedAction;


    finishCurrentPlayerTurn();

}


/* =========================================================
   FINISH PLAYER
   ========================================================= */

function finishCurrentPlayerTurn() {

    game.abilityIndex++;

    game.selectedAction =
        null;

    showPassScreen();

}


/* =========================================================
   RESOLVE ACTIONS
   ========================================================= */

function resolveActions() {

    const results = [];


    /*
     * Reset round effects.
     */

    game.blockedPlayers =
        new Set();

    game.protectedPlayers =
        new Set();


    /* -------------------------------------------------------
       GUARD
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "block" &&
            player.role ===
                "guard"
        ) {

            const target =
                getPlayer(
                    action.targetId
                );


            if (
                target &&
                target.alive &&
                target.id !==
                    player.id
            ) {

                game.blockedPlayers.add(
                    target.id
                );

            }

        }

    }


    /* -------------------------------------------------------
       MEDIC
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "protect" &&
            player.role ===
                "medic" &&
            !game.blockedPlayers.has(
                player.id
            )
        ) {

            const target =
                getPlayer(
                    action.targetId
                );


            if (
                target &&
                target.alive
            ) {

                game.protectedPlayers.add(
                    target.id
                );

            }

        }

    }


    /* -------------------------------------------------------
       SABOTAGE
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "sabotage" &&
            !game.blockedPlayers.has(
                player.id
            )
        ) {

            const system =
                action.system;


            if (
                system &&
                game.systems[
                    system
                ]
            ) {

                game.systems[
                    system
                ] = false;


                results.push(
                    `⚠️ ${SYSTEM_NAMES[system]} has been sabotaged!`
                );

            }

        }

    }


    /* -------------------------------------------------------
       ENGINEER REPAIR
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "repair" &&
            player.role ===
                "engineer"
        ) {

            const system =
                action.system;


            if (
                system &&
                !game.systems[
                    system
                ]
            ) {

                game.systems[
                    system
                ] = true;


                results.push(
                    `🔧 ${SYSTEM_NAMES[system]} has been repaired!`
                );

            }

        }

    }


    /* -------------------------------------------------------
       SILENCER
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "silence" &&
            player.role ===
                "silencer" &&
            !game.blockedPlayers.has(
                player.id
            )
        ) {

            const target =
                getPlayer(
                    action.targetId
                );


            if (
                target &&
                target.alive &&
                target.id !==
                    player.id
            ) {

                game.silencedUntil[
                    target.id
                ] =
                    game.round + 2;

            }

        }

    }


    /* -------------------------------------------------------
       ALIEN KILL
       ------------------------------------------------------- */

    for (
        const player of game.players
    ) {

        if (!player.alive) continue;


        const action =
            game.actions[
                player.id
            ];


        if (
            action &&
            action.type ===
                "kill" &&
            player.role ===
                "alien" &&
            !game.blockedPlayers.has(
                player.id
            )
        ) {

            const target =
                getPlayer(
                    action.targetId
                );


            if (
                target &&
                target.alive &&
                target.id !==
                    player.id
            ) {

                if (
                    game.protectedPlayers
                        .has(
                            target.id
                        )
                ) {

                    // Protected.

                }

                else {

                    target.alive =
                        false;

                }

            }

        }

    }


    /* =====================================================
       BUILD REACTION INFORMATION
       ===================================================== */

    game.reactionInfo = {};


    /*
     * EVERYONE WHO WAS ALIVE AT THE
     * START OF THE ROUND gets an entry.
     */

    game.roundStartAliveIds.forEach(
        id => {

            game.reactionInfo[id] = {
                messages: []
            };

        }
    );


    /*
     * KILLED.
     */

    game.players.forEach(
        player => {

            if (
                game.roundStartAliveIds
                    .includes(
                        player.id
                    ) &&
                !player.alive
            ) {

                game.reactionInfo[
                    player.id
                ].messages.push(
                    "💀 You were killed this round."
                );

            }

        }
    );


    /*
     * PROTECTED FROM AN ATTACK.
     */

    game.players.forEach(
        player => {

            if (
                !game.roundStartAliveIds
                    .includes(
                        player.id
                    )
            ) return;


            if (
                !game.protectedPlayers
                    .has(
                        player.id
                    )
            ) return;


            const attacked =
                game.players.some(
                    attacker => {

                        const action =
                            game.actions[
                                attacker.id
                            ];


                        return (
                            action &&
                            action.type ===
                                "kill" &&
                            action.targetId ===
                                player.id &&
                            !game.blockedPlayers
                                .has(
                                    attacker.id
                                )
                        );

                    }
                );


            if (attacked) {

                game.reactionInfo[
                    player.id
                ].messages.push(
                    "🩺 You were attacked, but you were protected."
                );

            }

        }
    );


    /*
     * GUARD BLOCK.
     */

    game.blockedPlayers.forEach(
        playerId => {

            if (
                game.reactionInfo[
                    playerId
                ]
            ) {

                game.reactionInfo[
                    playerId
                ].messages.push(
                    "🛡️ Your ability was blocked this round."
                );

            }

        }
    );


    /*
     * SILENCED.
     */

    game.players.forEach(
        player => {

            if (
                !game.roundStartAliveIds
                    .includes(
                        player.id
                    )
            ) return;


            if (
                game.silencedUntil[
                    player.id
                ] ===
                game.round + 2
            ) {

                game.reactionInfo[
                    player.id
                ].messages.push(
                    "🔇 You have been silenced for 2 rounds. You cannot vote."
                );

            }

        }
    );


    /* =====================================================
       DETECTIVE
       ===================================================== */

    game.players.forEach(
        player => {

            if (!player.alive) return;


            const action =
                game.actions[
                    player.id
                ];


            if (
                action &&
                action.type ===
                    "investigate" &&
                player.role ===
                    "detective" &&
                !game.blockedPlayers.has(
                    player.id
                )
            ) {

                const target =
                    getPlayer(
                        action.targetId
                    );


                let message =
                    "🕵️ Your investigation found nothing.";


                if (target) {

                    const targetAction =
                        game.previousActions[
                            target.id
                        ];


                    if (
                        targetAction &&
                        targetAction
                            .targetId !==
                            undefined
                    ) {

                        const interacted =
                            getPlayer(
                                targetAction
                                    .targetId
                            );


                        if (interacted) {

                            message =
                                `🕵️ ${target.name} interacted with ${interacted.name} last round.`;

                        }

                    }

                    else if (
                        targetAction &&
                        targetAction.system
                    ) {

                        message =
                            `🕵️ ${target.name} interacted with ${SYSTEM_NAMES[targetAction.system]} last round.`;

                    }

                    else {

                        message =
                            `🕵️ ${target.name} did not interact with anyone or a system last round.`;

                    }

                }


                if (
                    game.reactionInfo[
                        player.id
                    ]
                ) {

                    game.reactionInfo[
                        player.id
                    ].messages.push(
                        message
                    );

                }

            }

        }
    );


    /*
     * NOTHING HAPPENED.
     */

    game.roundStartAliveIds.forEach(
        id => {

            const info =
                game.reactionInfo[id];


            if (
                info &&
                info.messages.length === 0
            ) {

                info.messages.push(
                    "✅ Nothing happened to you this round."
                );

            }

        }
    );


    /*
     * Save current actions for
     * next round's Detective.
     */

    game.previousActions = {
        ...game.actions
    };


    game.lastRoundResults =
        results;


    /*
     * Reaction Round starts here.
     */

    startReactionRound();

}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function startReactionRound() {

    /*
     * IMPORTANT:
     *
     * We use roundStartAliveIds.
     *
     * Therefore someone killed this round
     * STILL appears here.
     *
     * Someone already dead before this round
     * does NOT appear.
     */

    game.reactionQueue =
        [...game.roundStartAliveIds];

    game.reactionIndex = 0;

    showReactionPass();

}


/* =========================================================
   REACTION PASS
   ========================================================= */

function showReactionPass() {

    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {

        finishReactionRound();

        return;

    }


    const player =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );


    if (!player) {

        game.reactionIndex++;

        showReactionPass();

        return;

    }


    $("reactionPlayerName").textContent =
        player.name;

    $("reactionRound").textContent =
        `ROUND ${game.round}`;

    $("reactionStage").textContent =
        `STAGE ${game.stage} / 10`;


    showScreen(
        "reactionScreen"
    );

}


/* =========================================================
   REACTION RESULT
   ========================================================= */

function showReactionResult() {

    const player =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );


    if (!player) {

        game.reactionIndex++;

        showReactionPass();

        return;

    }


    const info =
        game.reactionInfo[
            player.id
        ];


    const messages =
        info
            ? info.messages
            : [
                "✅ Nothing happened to you this round."
            ];


    $("reactionResultTitle").textContent =
        player.alive
            ? "⚡ YOUR REACTION"
            : "💀 YOUR LAST REACTION";


    $("reactionResultMessage").innerHTML =
        messages
            .map(
                message =>
                    `<p>${message}</p>`
            )
            .join("");


    showScreen(
        "reactionResultScreen"
    );

}


/* =========================================================
   NEXT REACTION
   ========================================================= */

function finishReactionPlayer() {

    game.reactionIndex++;

    showReactionPass();

}


/* =========================================================
   FINISH REACTION
   ========================================================= */

function finishReactionRound() {

    /*
     * Check victory AFTER the Reaction Round.
     *
     * This lets someone killed this round
     * still see their reaction.
     */

    if (
        checkImmediateVictory()
    ) {

        return;

    }


    showDiscussion();

}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {

    $("discussionRound").textContent =
        `ROUND ${game.round}`;

    $("discussionStage").textContent =
        `STAGE ${game.stage} / 10`;


    const results =
        $("roundResults");


    if (results) {

        if (
            game.lastRoundResults
                .length
        ) {

            results.innerHTML =
                game.lastRoundResults
                    .map(
                        result =>
                            `<p>${result}</p>`
                    )
                    .join("");

        }

        else {

            results.innerHTML =
                "<p>No public ship events this round.</p>";

        }

    }


    showScreen(
        "discussionScreen"
    );

}


/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {

    game.votes = {};

    game.currentVoteIndex =
        0;

    showScreen(
        "votingScreen"
    );

    startNextVote();

}


function startNextVote() {

    const alive =
        getAlivePlayers();


    if (
        game.currentVoteIndex >=
        alive.length
    ) {

        resolveVoting();

        return;

    }


    const player =
        alive[
            game.currentVoteIndex
        ];


    $("votingRound").textContent =
        `ROUND ${game.round}`;

    $("votingStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("voterName").textContent =
        player.name;


    const silenced =
        isSilenced(player);


    if (
        $("votingSilenced")
    ) {

        $("votingSilenced")
            .textContent =
                silenced
                    ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
                    : "";

    }


    renderVoteOptions(player);

}


function updateVotingInfo() {

    startNextVote();

}


/* =========================================================
   VOTE OPTIONS
   ========================================================= */

function renderVoteOptions(player) {

    const container =
        $("voteOptions");

    container.innerHTML =
        "";

    $("confirmVoteButton").style.display =
        "block";

    game.selectedVote =
        null;


    /*
     * Silenced players automatically skip.
     */

    if (
        isSilenced(player)
    ) {

        container.innerHTML =
            "<p>🔇 You cannot vote this round.</p>";

        game.selectedVote =
            "skip";

        return;

    }


    getAlivePlayers()
        .filter(
            target =>
                target.id !==
                player.id
        )
        .forEach(
            target => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "vote-option";

                button.textContent =
                    `🗳️ ${target.name}`;


                button.onclick =
                    () => {

                        document
                            .querySelectorAll(
                                ".vote-option"
                            )
                            .forEach(
                                btn =>
                                    btn.classList
                                        .remove(
                                            "selected"
                                        )
                            );


                        button.classList.add(
                            "selected"
                        );


                        game.selectedVote =
                            target.id;

                    };


                container.appendChild(
                    button
                );

            }
        );


    const skipButton =
        document.createElement(
            "button"
        );

    skipButton.type =
        "button";

    skipButton.className =
        "vote-option";

    skipButton.textContent =
        "⏭️ SKIP VOTE";


    skipButton.onclick =
        () => {

            document
                .querySelectorAll(
                    ".vote-option"
                )
                .forEach(
                    btn =>
                        btn.classList
                            .remove(
                                "selected"
                            )
                );


            skipButton.classList.add(
                "selected"
            );


            game.selectedVote =
                "skip";

        };


    container.appendChild(
        skipButton
    );

}


/* =========================================================
   CONFIRM VOTE
   ========================================================= */

function confirmVote() {

    const alive =
        getAlivePlayers();


    const player =
        alive[
            game.currentVoteIndex
        ];


    if (!player) return;


    if (
        isSilenced(player)
    ) {

        game.votes[
            player.id
        ] = "skip";

        game.currentVoteIndex++;

        startNextVote();

        return;

    }


    if (
        game.selectedVote ===
        null
    ) {

        return;

    }


    game.votes[
        player.id
    ] =
        game.selectedVote;


    game.currentVoteIndex++;

    game.selectedVote =
        null;


    startNextVote();

}


/* =========================================================
   RESOLVE VOTING
   ========================================================= */

function resolveVoting() {

    const counts = {};


    Object.values(
        game.votes
    ).forEach(
        vote => {

            if (
                vote === "skip"
            ) return;


            counts[vote] =
                (
                    counts[vote] ||
                    0
                ) + 1;

        }
    );


    const entries =
        Object.entries(
            counts
        );


    if (
        !entries.length
    ) {

        showVoteResult(
            "🗳️ NO EJECTION",
            "Everyone skipped. Nobody was ejected."
        );

        return;

    }


    const highest =
        Math.max(
            ...entries.map(
                ([, count]) =>
                    count
            )
        );


    const tied =
        entries
            .filter(
                ([, count]) =>
                    count ===
                    highest
            )
            .map(
                ([id]) =>
                    Number(id)
            );


    if (
        tied.length > 1
    ) {

        showCaptainTieDecision(
            tied
        );

        return;

    }


    ejectPlayer(
        tied[0]
    );

}


/* =========================================================
   EJECT
   ========================================================= */

function ejectPlayer(
    playerId
) {

    const player =
        getPlayer(playerId);


    if (
        !player ||
        !player.alive
    ) {

        finishVoting();

        return;

    }


    player.alive =
        false;


    showVoteResult(
        "🚪 PLAYER EJECTED",
        `${player.name} was ejected.`
    );

}


/* =========================================================
   VOTE RESULT
   ========================================================= */

function showVoteResult(
    title,
    message
) {

    $("voteResultTitle")
        .textContent =
            title;

    $("voteResultMessage")
        .textContent =
            message;


    showScreen(
        "voteResultScreen"
    );

}


/* =========================================================
   CAPTAIN TIE
   ========================================================= */

function showCaptainTieDecision(
    tiedPlayers
) {

    const captain =
        getAlivePlayers()
            .find(
                player =>
                    player.role ===
                    "captain"
            );


    /*
     * No Captain or Power offline.
     */

    if (
        !captain ||
        !isPowerOnline()
    ) {

        showVoteResult(
            "🗳️ TIE",
            "The vote was tied. No player was ejected."
        );

        return;

    }


    const container =
        $("captainTieOptions");

    container.innerHTML =
        "";


    tiedPlayers.forEach(
        id => {

            const player =
                getPlayer(id);


            if (!player) return;


            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "vote-option";

            button.textContent =
                `🚪 EJECT ${player.name}`;


            button.onclick =
                () => {

                    ejectPlayer(
                        id
                    );

                };


            container.appendChild(
                button
            );

        }
    );


    showScreen(
        "captainTieScreen"
    );

}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function finishVoting() {

    if (
        checkImmediateVictory()
    ) {

        return;

    }


    showVoteResult(
        "🗳️ VOTE COMPLETE",
        "The vote is complete."
    );

}


function afterVoting() {

    if (
        checkImmediateVictory()
    ) {

        return;

    }


    /*
     * Earth lifeline every 3 rounds.
     */

    if (
        game.round % 3 === 0 &&
        game.systems
            .communications
    ) {

        showEarthLifeline();

        return;

    }


    continueRoundProgression();

}


/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showEarthLifeline() {

    game.lifelineNumber++;


    $("lifelineTitle")
        .textContent =
            `📡 EARTH LIFELINE #${game.lifelineNumber}`;


    $("lifelineMessage")
        .textContent =
            generateLifeline();


    showScreen(
        "lifelineScreen"
    );

}


function generateLifeline() {

    const candidates =
        [...getAlivePlayers()];


    const hostile =
        candidates.find(
            player =>
                ROLES[player.role]
                    .hostile
        );


    if (!hostile) {

        return "🌍 EARTH: Stay alert. Something is wrong aboard the ship.";

    }


    const cluePlayers = [
        hostile
    ];


    const remaining =
        candidates.filter(
            player =>
                player.id !==
                hostile.id
        );


    while (
        cluePlayers.length < 3 &&
        remaining.length
    ) {

        const index =
            Math.floor(
                Math.random() *
                remaining.length
            );


        cluePlayers.push(
            remaining.splice(
                index,
                1
            )[0]
        );

    }


    return (
        "⚠️ ONE OF THESE PLAYERS IS HOSTILE: " +
        cluePlayers
            .map(
                player =>
                    player.name
            )
            .join(", ")
    );

}


function continueAfterLifeline() {

    continueRoundProgression();

}


/* =========================================================
   ROUND PROGRESSION
   ========================================================= */

function continueRoundProgression() {

    if (
        checkImmediateVictory()
    ) {

        return;

    }


    /*
     * Engines online =
     * complete one stage.
     */

    if (
        isEnginesOnline()
    ) {

        game.stage++;

    }


    /*
     * Stage 10 completed.
     */

    if (
        game.stage > 10
    ) {

        humanWin(
            "🚀 The crew completed all 10 engine stages!"
        );

        return;

    }


    game.round++;


    showSystemsStatus();

}


/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function showSystemsStatus() {

    $("systemsRound")
        .textContent =
            `ROUND ${game.round - 1}`;

    $("systemsStage")
        .textContent =
            `STAGE ${game.stage} / 10`;


    const container =
        $("systemsList");


    container.innerHTML =
        Object.keys(
            game.systems
        )
        .map(
            system => `

                <div class="system-row">

                    <span>
                        ${SYSTEM_NAMES[system]}
                    </span>

                    <strong>

                        ${
                            game.systems[system]
                                ? "🟢 ONLINE"
                                : "🔴 OFFLINE"
                        }

                    </strong>

                </div>

            `
        )
        .join("");


    showScreen(
        "systemsScreen"
    );

}


/* =========================================================
   NEXT ROUND
   ========================================================= */

function startNextRound() {

    beginRound();

}


/* =========================================================
   SILENCE CLEANUP
   ========================================================= */

function cleanupSilences() {

    Object.keys(
        game.silencedUntil
    ).forEach(
        id => {

            if (
                game.round >=
                game.silencedUntil[id]
            ) {

                delete game.silencedUntil[id];

            }

        }
    );

}


/* =========================================================
   VICTORY
   ========================================================= */

function checkImmediateVictory() {

    const alive =
        getAlivePlayers();


    const hostiles =
        alive.filter(
            player =>
                ROLES[player.role]
                    .hostile
        );


    const humans =
        alive.filter(
            player =>
                !ROLES[player.role]
                    .hostile
        );


    /*
     * No hostiles left.
     */

    if (
        hostiles.length === 0
    ) {

        humanWin(
            "🗳️ All hostile players have been eliminated!"
        );

        return true;

    }


    /*
     * Hostiles equal or outnumber humans.
     */

    if (
        hostiles.length >=
        humans.length
    ) {

        hostileWin(
            "👽 The hostiles now equal or outnumber the humans!"
        );

        return true;

    }


    return false;

}


/* =========================================================
   HUMAN WIN
   ========================================================= */

function humanWin(reason) {

    game.gameOver =
        true;


    $("gameOverTitle")
        .textContent =
            "🟢 HUMANS WIN!";


    $("gameOverMessage")
        .textContent =
            reason;


    showFinalPlayers();


    showScreen(
        "gameOverScreen"
    );

}


/* =========================================================
   HOSTILE WIN
   ========================================================= */

function hostileWin(reason) {

    game.gameOver =
        true;


    $("gameOverTitle")
        .textContent =
            "🔴 HOSTILES WIN!";


    $("gameOverMessage")
        .textContent =
            reason;


    showFinalPlayers();


    showScreen(
        "gameOverScreen"
    );

}


/* =========================================================
   FINAL PLAYERS
   ========================================================= */

function showFinalPlayers() {

    const container =
        $("finalPlayers");


    if (!container) return;


    container.innerHTML =
        game.players
            .map(
                player => {

                    const role =
                        ROLES[
                            player.role
                        ];


                    return `

                        <div class="
                            final-player
                            ${
                                player.alive
                                    ? "alive"
                                    : "dead"
                            }
                        ">

                            <strong>

                                ${
                                    player.alive
                                        ? "🟢"
                                        : "💀"
                                }

                                ${player.name}

                            </strong>

                            <span>

                                ${role.icon}
                                ${role.name}

                            </span>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   RESTART
   ========================================================= */

function restartGame() {

    location.reload();

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Player count.
         */

        const playerCount =
            $("playerCount");


        if (playerCount) {

            playerCount.addEventListener(
                "change",
                createPlayerSetup
            );


            createPlayerSetup();

        }


        /*
         * RANDOMISE
         *
         * ONE click event only.
         *
         * This keeps it working properly
         * on mobile.
         */

        const randomButton =
            $("randomRolesButton");


        if (randomButton) {

            randomButton.type =
                "button";


            randomButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    randomiseRoles();

                }
            );

        }


        /*
         * START GAME
         */

        const startButton =
            $("startGameButton");


        if (startButton) {

            startButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    startGame();

                }
            );

        }


        /*
         * ABILITY READY
         */

        const readyButton =
            $("readyButton");


        if (readyButton) {

            readyButton.addEventListener(
                "click",
                () => {

                    startPlayerTurn();

                }
            );

        }


        /*
         * VIEW ABILITY
         */

        const showActionButton =
            $("showActionButton");


        if (showActionButton) {

            showActionButton.addEventListener(
                "click",
                () => {

                    showActionForCurrentPlayer();

                }
            );

        }


        /*
         * CONFIRM ABILITY
         */

        const confirmActionButton =
            $("confirmActionButton");


        if (confirmActionButton) {

            confirmActionButton.addEventListener(
                "click",
                () => {

                    confirmAction();

                }
            );

        }


        /*
         * REACTION READY
         */

        const reactionReadyButton =
            $("reactionReadyButton");


        if (reactionReadyButton) {

            reactionReadyButton.addEventListener(
                "click",
                () => {

                    showReactionResult();

                }
            );

        }


        /*
         * REACTION CONTINUE
         */

        const reactionContinueButton =
            $("reactionContinueButton");


        if (reactionContinueButton) {

            reactionContinueButton.addEventListener(
                "click",
                () => {

                    finishReactionPlayer();

                }
            );

        }


        /*
         * START VOTING
         */

        const startVotingButton =
            $("startVotingButton");


        if (startVotingButton) {

            startVotingButton.addEventListener(
                "click",
                () => {

                    startVoting();

                }
            );

        }


        /*
         * CONFIRM VOTE
         */

        const confirmVoteButton =
            $("confirmVoteButton");


        if (confirmVoteButton) {

            confirmVoteButton.addEventListener(
                "click",
                () => {

                    confirmVote();

                }
            );

        }


        /*
         * AFTER VOTE
         */

        const afterVoteButton =
            $("afterVoteButton");


        if (afterVoteButton) {

            afterVoteButton.addEventListener(
                "click",
                () => {

                    afterVoting();

                }
            );

        }


        /*
         * EARTH LIFELINE
         */

        const lifelineContinue =
            $("lifelineContinue");


        if (lifelineContinue) {

            lifelineContinue.addEventListener(
                "click",
                () => {

                    continueAfterLifeline();

                }
            );

        }


        /*
         * NEXT ROUND
         */

        const nextRoundButton =
            $("nextRoundButton");


        if (nextRoundButton) {

            nextRoundButton.addEventListener(
                "click",
                () => {

                    startNextRound();

                }
            );

        }


        /*
         * RESTART
         */

        const restartButton =
            $("restartButton");


        if (restartButton) {

            restartButton.addEventListener(
                "click",
                () => {

                    restartGame();

                }
            );

        }

    }
);
