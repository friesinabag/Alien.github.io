/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */

const MAX_STAGES = 10;

const SYSTEMS = {
    engines: {
        name: "🚀 Engines"
    },
    o2: {
        name: "🫁 O2"
    },
    communications: {
        name: "📡 Communications"
    },
    power: {
        name: "⚡ Power"
    }
};

const ROLE_DATA = {
    alien: {
        name: "Alien",
        icon: "👽",
        hostile: true,
        description:
            "Kill one player each round. If there is no living Saboteur, you may either kill or sabotage."
    },

    saboteur: {
        name: "Saboteur",
        icon: "😈",
        hostile: true,
        description:
            "Sabotage one ship system each round."
    },

    silencer: {
        name: "Silencer",
        icon: "🔇",
        hostile: true,
        description:
            "Silence one living player for 2 rounds. They can still talk and use their ability, but cannot vote."
    },

    engineer: {
        name: "Engineer",
        icon: "🔧",
        hostile: false,
        description:
            "Repair one offline ship system each round. You can always act, even if Power is offline."
    },

    detective: {
        name: "Detective",
        icon: "🕵️",
        hostile: false,
        description:
            "Investigate one player to learn what they interacted with during the previous round."
    },

    medic: {
        name: "Medic",
        icon: "🩺",
        hostile: false,
        description:
            "Protect one player from being killed this round."
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
            "Block one player's role ability for this round."
    },

    survivor: {
        name: "Survivor",
        icon: "👤",
        hostile: false,
        description:
            "You have no special ability. Work with the crew and survive."
    }
};

const HOSTILE_ROLES = [
    "alien",
    "saboteur",
    "silencer"
];


/* =========================================================
   GAME STATE
   ========================================================= */

let game = {
    players: [],

    round: 1,
    stage: 1,

    currentPlayerIndex: 0,
    currentVoteIndex: 0,

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
    randomRoles: {},

    lastRoundResults: [],

    lifelineNumber: 0,

    gameOver: false
};


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    const screen = $(id);

    if (screen) {
        screen.classList.remove("hidden");
    }

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


/* =========================================================
   PLAYER SETUP
   ========================================================= */

function getPlayerCount() {
    const select = $("playerCount");

    if (!select) {
        return 4;
    }

    return Number(select.value);
}


function getHostileCount(count) {
    if (count <= 5) {
        return 1;
    }

    if (count <= 7) {
        return 2;
    }

    if (count <= 10) {
        return 3;
    }

    return 4;
}


function createPlayerSetup() {
    const count = getPlayerCount();
    const container = $("playersSetup");

    if (!container) {
        return;
    }

    game.randomisedRoles = false;
    game.randomRoles = {};

    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const wrapper = document.createElement("div");

        wrapper.className = "player-setup";

        wrapper.innerHTML = `
            <h3>Player ${i + 1}</h3>

            <input
                type="text"
                class="player-name"
                data-player="${i}"
                value="Player ${i + 1}"
                placeholder="Player name"
                maxlength="20"
            >

            <select
                class="role-select"
                data-player="${i}"
            >
                <option value="survivor">👤 Survivor</option>
                <option value="engineer">🔧 Engineer</option>
                <option value="detective">🕵️ Detective</option>
                <option value="medic">🩺 Medic</option>
                <option value="captain">👨‍✈️ Captain</option>
                <option value="guard">🛡️ Guard</option>
                <option value="alien">👽 Alien</option>
                <option value="saboteur">😈 Saboteur</option>
                <option value="silencer">🔇 Silencer</option>
            </select>
        `;

        container.appendChild(wrapper);
    }
}


/* =========================================================
   RANDOM ROLE GENERATION
   ========================================================= */

function randomiseRoles() {
    const count = getPlayerCount();

    if (!count || count < 4) {
        return;
    }

    const roleSelects = document.querySelectorAll(".role-select");

    if (roleSelects.length !== count) {
        createPlayerSetup();
    }

    const hostileCount = getHostileCount(count);

    let availableHostiles = [
        "alien"
    ];

    if (hostileCount >= 2) {
        availableHostiles.push("saboteur");
    }

    if (hostileCount >= 3) {
        availableHostiles.push("silencer");
    }

    while (availableHostiles.length < hostileCount) {
        availableHostiles.push("alien");
    }

    availableHostiles = shuffleArray(availableHostiles);

    const humanRoles = [
        "survivor",
        "detective",
        "medic",
        "captain",
        "guard"
    ];

    let roles = [];

    roles.push(...availableHostiles);

    /*
     * Engineer MUST always be present.
     */
    roles.push("engineer");

    while (roles.length < count) {
        roles.push(
            humanRoles[
                Math.floor(Math.random() * humanRoles.length)
            ]
        );
    }

    roles = shuffleArray(roles);

    /*
     * Safety check:
     * If Engineer somehow isn't present, force one slot.
     */
    if (!roles.includes("engineer")) {
        roles[roles.length - 1] = "engineer";
    }

    /*
     * Make sure the hostile count is correct.
     */
    let actualHostiles = roles.filter(role =>
        HOSTILE_ROLES.includes(role)
    ).length;

    while (actualHostiles > hostileCount) {
        const index = roles.findIndex(role =>
            HOSTILE_ROLES.includes(role)
        );

        if (index === -1) {
            break;
        }

        roles[index] = "survivor";
        actualHostiles--;
    }

    while (actualHostiles < hostileCount) {
        const index = roles.findIndex(role =>
            !HOSTILE_ROLES.includes(role) &&
            role !== "engineer"
        );

        if (index === -1) {
            break;
        }

        roles[index] = "alien";
        actualHostiles++;
    }

    /*
     * IMPORTANT:
     *
     * The actual random roles are stored separately.
     * The visible dropdown NEVER contains the real role.
     *
     * This prevents players from looking at the setup screen
     * and seeing everyone else's randomised role.
     */
    game.randomRoles = {};

    for (let i = 0; i < roles.length; i++) {
        game.randomRoles[i] = roles[i];
    }

    game.randomisedRoles = true;

    document.querySelectorAll(".role-select").forEach((select, i) => {
        select.innerHTML = `
            <option value="random">🎲 RANDOM</option>
        `;

        select.value = "random";

        select.disabled = true;
        select.classList.add("random-hidden");
    });

    /*
     * Give visual feedback without revealing roles.
     */
    const button = $("randomRolesButton");

    if (button) {
        button.textContent = "🎲 ROLES RANDOMISED";
    }
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [copy[i], copy[j]] = [
            copy[j],
            copy[i]
        ];
    }

    return copy;
}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {
    const count = getPlayerCount();

    game.players = [];

    const names = document.querySelectorAll(".player-name");
    const roleSelects = document.querySelectorAll(".role-select");

    for (let i = 0; i < count; i++) {
        const nameInput = names[i];

        let name = nameInput
            ? nameInput.value.trim()
            : `Player ${i + 1}`;

        if (!name) {
            name = `Player ${i + 1}`;
        }

        let role;

        if (
            game.randomisedRoles &&
            game.randomRoles[i]
        ) {
            role = game.randomRoles[i];
        } else {
            role = roleSelects[i]
                ? roleSelects[i].value
                : "survivor";
        }

        game.players.push({
            id: i,
            name,
            role,
            alive: true
        });
    }

    /*
     * Engineer is mandatory.
     */
    if (
        !game.players.some(player =>
            player.role === "engineer"
        )
    ) {
        game.players[
            game.players.length - 1
        ].role = "engineer";
    }

    /*
     * Reset game state.
     */
    game.round = 1;
    game.stage = 1;

    game.currentPlayerIndex = 0;
    game.currentVoteIndex = 0;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    game.actions = {};
    game.previousActions = {};

    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();

    game.silencedUntil = {};

    game.votes = {};

    game.selectedAction = null;
    game.selectedVote = null;

    game.lastRoundResults = [];

    game.lifelineNumber = 0;

    game.gameOver = false;

    beginRound();
}


/* =========================================================
   BEGIN ROUND
   ========================================================= */

function beginRound() {
    if (game.gameOver) {
        return;
    }

    game.currentPlayerIndex = 0;

    game.actions = {};

    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();

    game.selectedAction = null;

    cleanupSilences();

    if (checkImmediateVictory()) {
        return;
    }

    showPassScreen();
}


/* =========================================================
   PASS SCREEN
   ========================================================= */

function showPassScreen() {
    const currentPlayer =
        game.players[game.currentPlayerIndex];

    if (!currentPlayer) {
        return;
    }

    const nameElement = $("passPlayerName");

    if (nameElement) {
        nameElement.textContent =
            currentPlayer.name;
    }

    const roundElement = $("passRound");

    if (roundElement) {
        roundElement.textContent =
            `ROUND ${game.round}`;
    }

    showScreen("passScreen");
}


/* =========================================================
   START PLAYER TURN
   ========================================================= */

function startPlayerTurn() {
    showRoleForCurrentPlayer();
}


/* =========================================================
   ROLE SCREEN
   ========================================================= */

function showRoleForCurrentPlayer() {
    const player =
        game.players[game.currentPlayerIndex];

    if (!player) {
        return;
    }

    const role =
        ROLE_DATA[player.role];

    if (!role) {
        return;
    }

    const nameElement =
        $("rolePlayerName");

    if (nameElement) {
        nameElement.textContent =
            player.name;
    }

    const iconElement =
        $("roleIcon");

    if (iconElement) {
        iconElement.textContent =
            role.icon;
    }

    const roleNameElement =
        $("roleName");

    if (roleNameElement) {
        roleNameElement.textContent =
            role.name;
    }

    const descriptionElement =
        $("roleDescription");

    if (descriptionElement) {
        descriptionElement.textContent =
            role.description;
    }

    /*
     * Hostiles can see every other hostile.
     */
    const hostileBox =
        $("hostileList");

    if (hostileBox) {
        if (role.hostile) {
            const hostiles =
                game.players.filter(player =>
                    player.alive &&
                    player.id !== game.currentPlayerIndex &&
                    HOSTILE_ROLES.includes(player.role)
                );

            if (hostiles.length > 0) {
                hostileBox.innerHTML = `
                    <h3>👁️ OTHER HOSTILES</h3>
                    ${hostiles.map(player => `
                        <div class="hostile-player">
                            ${ROLE_DATA[player.role].icon}
                            ${player.name}
                            — ${ROLE_DATA[player.role].name}
                        </div>
                    `).join("")}
                `;
            } else {
                hostileBox.innerHTML = `
                    <h3>👁️ OTHER HOSTILES</h3>
                    <p>You are the only living hostile.</p>
                `;
            }

            hostileBox.classList.remove("hidden");
        } else {
            hostileBox.innerHTML = "";
            hostileBox.classList.add("hidden");
        }
    }

    showScreen("roleScreen");
}


/* =========================================================
   ACTION SCREEN
   ========================================================= */

function showActionForCurrentPlayer() {
    const player =
        game.players[game.currentPlayerIndex];

    if (!player) {
        return;
    }

    /*
     * Power disables every ability except Engineer.
     */
    if (
        !game.systems.power &&
        player.role !== "engineer"
    ) {
        game.actions[player.id] = {
            type: "none",
            target: null,
            system: null
        };

        showPrivateResult(
            "⚡ POWER OFFLINE",
            "Your role ability cannot be used this round."
        );

        return;
    }

    setupActionScreen();
}


function setupActionScreen() {
    const player =
        game.players[game.currentPlayerIndex];

    if (!player) {
        return;
    }

    const role =
        ROLE_DATA[player.role];

    const title =
        $("actionTitle");

    if (title) {
        title.textContent =
            `${role.icon} ${role.name}`;
    }

    const description =
        $("actionDescription");

    if (description) {
        description.textContent =
            role.description;
    }

    const options =
        $("actionOptions");

    if (options) {
        options.innerHTML = "";
    }

    game.selectedAction = null;

    switch (player.role) {
        case "alien":
            showAlienAction();
            break;

        case "saboteur":
            showSaboteurAction();
            break;

        case "silencer":
            showSilencerAction();
            break;

        case "engineer":
            showEngineerAction();
            break;

        case "detective":
            showDetectiveAction();
            break;

        case "medic":
            showMedicAction();
            break;

        case "guard":
            showGuardAction();
            break;

        case "captain":
        case "survivor":
            game.actions[player.id] = {
                type: "none",
                target: null,
                system: null
            };

            showPrivateResult(
                "NO ACTION",
                "You have no active ability this round."
            );
            break;
    }

    showScreen("actionScreen");
}


/* =========================================================
   ACTION BUTTON HELPERS
   ========================================================= */

function createPlayerActionButtons(
    players,
    callback
) {
    const container =
        $("actionOptions");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    players.forEach(player => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "action-option";

        button.textContent =
            `👤 ${player.name}`;

        button.addEventListener(
            "click",
            function () {
                container
                    .querySelectorAll("button")
                    .forEach(btn =>
                        btn.classList.remove("selected")
                    );

                button.classList.add("selected");

                callback(player);
            }
        );

        container.appendChild(button);
    });
}


function createSystemActionButtons(
    systems,
    callback
) {
    const container =
        $("actionOptions");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    systems.forEach(systemKey => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "action-option";

        button.textContent =
            SYSTEMS[systemKey].name;

        button.addEventListener(
            "click",
            function () {
                container
                    .querySelectorAll("button")
                    .forEach(btn =>
                        btn.classList.remove("selected")
                    );

                button.classList.add("selected");

                callback(systemKey);
            }
        );

        container.appendChild(button);
    });
}


/* =========================================================
   ALIEN
   ========================================================= */

function showAlienAction() {
    const player =
        game.players[game.currentPlayerIndex];

    const livingTargets =
        game.players.filter(other =>
            other.alive &&
            other.id !== player.id
        );

    const livingSaboteur =
        game.players.some(other =>
            other.alive &&
            other.role === "saboteur"
        );

    if (!livingSaboteur) {
        const container =
            $("actionOptions");

        if (container) {
            container.innerHTML = "";

            const killButton =
                document.createElement("button");

            killButton.type = "button";
            killButton.className =
                "action-option";

            killButton.textContent =
                "☠️ KILL";

            killButton.addEventListener(
                "click",
                function () {
                    container
                        .querySelectorAll("button")
                        .forEach(btn =>
                            btn.classList.remove("selected")
                        );

                    killButton.classList.add(
                        "selected"
                    );

                    createPlayerActionButtons(
                        livingTargets,
                        target => {
                            game.selectedAction = {
                                type: "kill",
                                target: target.id,
                                system: null
                            };
                        }
                    );
                }
            );

            container.appendChild(killButton);

            const sabotageButton =
                document.createElement("button");

            sabotageButton.type = "button";
            sabotageButton.className =
                "action-option";

            sabotageButton.textContent =
                "💥 SABOTAGE";

            sabotageButton.addEventListener(
                "click",
                function () {
                    container
                        .querySelectorAll("button")
                        .forEach(btn =>
                            btn.classList.remove("selected")
                        );

                    sabotageButton.classList.add(
                        "selected"
                    );

                    showAlienSabotageAction();
                }
            );

            container.appendChild(sabotageButton);
        }
    } else {
        createPlayerActionButtons(
            livingTargets,
            target => {
                game.selectedAction = {
                    type: "kill",
                    target: target.id,
                    system: null
                };
            }
        );
    }
}


function showAlienSabotageAction() {
    const offlineSystems =
        Object.keys(game.systems).filter(
            key => game.systems[key]
        );

    /*
     * Alien can sabotage a currently online system.
     */
    createSystemActionButtons(
        offlineSystems,
        system => {
            game.selectedAction = {
                type: "sabotage",
                target: null,
                system
            };
        }
    );
}


/* =========================================================
   SABOTEUR
   ========================================================= */

function showSaboteurAction() {
    const onlineSystems =
        Object.keys(game.systems).filter(
            key => game.systems[key]
        );

    createSystemActionButtons(
        onlineSystems,
        system => {
            game.selectedAction = {
                type: "sabotage",
                target: null,
                system
            };
        }
    );
}


/* =========================================================
   SILENCER
   ========================================================= */

function showSilencerAction() {
    const player =
        game.players[game.currentPlayerIndex];

    const targets =
        game.players.filter(other =>
            other.alive &&
            other.id !== player.id
        );

    createPlayerActionButtons(
        targets,
        target => {
            game.selectedAction = {
                type: "silence",
                target: target.id,
                system: null
            };
        }
    );
}


/* =========================================================
   ENGINEER
   ========================================================= */

function showEngineerAction() {
    const offlineSystems =
        Object.keys(game.systems).filter(
            key => !game.systems[key]
        );

    if (offlineSystems.length === 0) {
        game.selectedAction = {
            type: "none",
            target: null,
            system: null
        };

        showPrivateResult(
            "ALL SYSTEMS ONLINE",
            "There is nothing to repair."
        );

        return;
    }

    createSystemActionButtons(
        offlineSystems,
        system => {
            game.selectedAction = {
                type: "repair",
                target: null,
                system
            };
        }
    );
}


/* =========================================================
   DETECTIVE
   ========================================================= */

function showDetectiveAction() {
    const player =
        game.players[game.currentPlayerIndex];

    const targets =
        game.players.filter(other =>
            other.alive &&
            other.id !== player.id
        );

    createPlayerActionButtons(
        targets,
        target => {
            game.selectedAction = {
                type: "investigate",
                target: target.id,
                system: null
            };
        }
    );
}


/* =========================================================
   MEDIC
   ========================================================= */

function showMedicAction() {
    const player =
        game.players[game.currentPlayerIndex];

    const targets =
        game.players.filter(other =>
            other.alive
        );

    createPlayerActionButtons(
        targets,
        target => {
            game.selectedAction = {
                type: "protect",
                target: target.id,
                system: null
            };
        }
    );
}


/* =========================================================
   GUARD
   ========================================================= */

function showGuardAction() {
    const player =
        game.players[game.currentPlayerIndex];

    const targets =
        game.players.filter(other =>
            other.alive &&
            other.id !== player.id
        );

    createPlayerActionButtons(
        targets,
        target => {
            game.selectedAction = {
                type: "block",
                target: target.id,
                system: null
            };
        }
    );
}


/* =========================================================
   CONFIRM ACTION
   ========================================================= */

function confirmAction() {
    const player =
        game.players[game.currentPlayerIndex];

    if (!player) {
        return;
    }

    /*
     * Players with no ability automatically finish.
     */
    if (
        player.role === "captain" ||
        player.role === "survivor"
    ) {
        finishCurrentPlayerTurn();
        return;
    }

    /*
     * Power offline.
     */
    if (
        !game.systems.power &&
        player.role !== "engineer"
    ) {
        finishCurrentPlayerTurn();
        return;
    }

    if (!game.selectedAction) {
        alert("Choose an action first.");
        return;
    }

    game.actions[player.id] =
        game.selectedAction;

    showPrivateResult(
        "ACTION LOCKED",
        "Your action has been recorded. Pass the phone to the next player."
    );
}


/* =========================================================
   PRIVATE RESULT
   ========================================================= */

function showPrivateResult(
    title,
    message
) {
    const titleElement =
        $("privateResultTitle");

    if (titleElement) {
        titleElement.textContent =
            title;
    }

    const messageElement =
        $("privateResultMessage");

    if (messageElement) {
        messageElement.textContent =
            message;
    }

    showScreen("privateResultScreen");
}


/* =========================================================
   FINISH PLAYER TURN
   ========================================================= */

function finishCurrentPlayerTurn() {
    const player =
        game.players[game.currentPlayerIndex];

    if (
        player &&
        player.role !== "captain" &&
        player.role !== "survivor" &&
        !game.actions[player.id]
    ) {
        game.actions[player.id] = {
            type: "none",
            target: null,
            system: null
        };
    }

    game.currentPlayerIndex++;

    if (
        game.currentPlayerIndex >=
        game.players.length
    ) {
        resolveActions();
        return;
    }

    showPassScreen();
}


/* =========================================================
   RESOLVE ACTIONS
   ========================================================= */

function resolveActions() {
    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();

    const results = [];

    /*
     * -----------------------------------------------------
     * 1. GUARD
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (player.role !== "guard") {
            return;
        }

        const action =
            game.actions[player.id];

        if (
            !action ||
            action.type !== "block" ||
            action.target === null
        ) {
            return;
        }

        game.blockedPlayers.add(
            action.target
        );
    });


    /*
     * -----------------------------------------------------
     * 2. MEDIC
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (player.role !== "medic") {
            return;
        }

        if (
            game.blockedPlayers.has(player.id)
        ) {
            return;
        }

        const action =
            game.actions[player.id];

        if (
            action &&
            action.type === "protect" &&
            action.target !== null
        ) {
            game.protectedPlayers.add(
                action.target
            );
        }
    });


    /*
     * -----------------------------------------------------
     * 3. SABOTAGE
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (
            player.role !== "saboteur" &&
            player.role !== "alien"
        ) {
            return;
        }

        if (
            game.blockedPlayers.has(player.id)
        ) {
            return;
        }

        const action =
            game.actions[player.id];

        if (
            action &&
            action.type === "sabotage" &&
            action.system
        ) {
            game.systems[action.system] = false;

            results.push(
                `${SYSTEMS[action.system].name} was sabotaged.`
            );
        }
    });


    /*
     * -----------------------------------------------------
     * 4. ENGINEER
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (player.role !== "engineer") {
            return;
        }

        /*
         * Engineer cannot be blocked.
         * Engineer is the Power exception.
         */
        const action =
            game.actions[player.id];

        if (
            action &&
            action.type === "repair" &&
            action.system
        ) {
            if (!game.systems[action.system]) {
                game.systems[action.system] = true;

                results.push(
                    `${SYSTEMS[action.system].name} was repaired.`
                );
            }
        }
    });


    /*
     * -----------------------------------------------------
     * 5. SILENCER
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (player.role !== "silencer") {
            return;
        }

        if (
            game.blockedPlayers.has(player.id)
        ) {
            return;
        }

        const action =
            game.actions[player.id];

        if (
            action &&
            action.type === "silence" &&
            action.target !== null
        ) {
            game.silencedUntil[action.target] =
                game.round + 2;
        }
    });


    /*
     * -----------------------------------------------------
     * 6. ALIEN KILLS
     * -----------------------------------------------------
     */

    game.players.forEach(player => {
        if (!player.alive) {
            return;
        }

        if (player.role !== "alien") {
            return;
        }

        if (
            game.blockedPlayers.has(player.id)
        ) {
            return;
        }

        const action =
            game.actions[player.id];

        if (
            action &&
            action.type === "kill" &&
            action.target !== null
        ) {
            const target =
                game.players.find(
                    p => p.id === action.target
                );

            if (!target || !target.alive) {
                return;
            }

            if (
                game.protectedPlayers.has(
                    target.id
                )
            ) {
                results.push(
                    `${target.name} survived an attack.`
                );

                return;
            }

            target.alive = false;

            results.push(
                `${target.name} was eliminated.`
            );
        }
    });


    /*
     * -----------------------------------------------------
     * 7. SAVE ACTIONS FOR DETECTIVE
     * -----------------------------------------------------
     */

    game.previousActions = {};

    game.players.forEach(player => {
        const action =
            game.actions[player.id];

        if (!action) {
            game.previousActions[player.id] = {
                type: "none",
                target: null,
                system: null
            };

            return;
        }

        game.previousActions[player.id] = {
            type: action.type,
            target: action.target,
            system: action.system
        };
    });


    /*
     * Detective results are private.
     */
    showDetectiveResult();

    game.lastRoundResults = results;

    continueAfterActions();
}


/* =========================================================
   DETECTIVE RESULT
   ========================================================= */

function showDetectiveResult() {
    const detectives =
        game.players.filter(player =>
            player.alive &&
            player.role === "detective"
        );

    /*
     * We don't interrupt the round with a complicated
     * multi-player private sequence here.
     *
     * The result is shown when the Detective reaches
     * their private result screen.
     */
    detectives.forEach(detective => {
        const action =
            game.actions[detective.id];

        if (
            !action ||
            action.type !== "investigate"
        ) {
            return;
        }

        if (
            game.blockedPlayers.has(
                detective.id
            )
        ) {
            return;
        }

        const target =
            game.players.find(
                player =>
                    player.id === action.target
            );

        if (!target) {
            return;
        }

        const previous =
            game.previousActions[target.id];

        if (!previous) {
            return;
        }

        /*
         * Store the Detective result privately
         * for use when needed.
         */
        detective.lastInvestigation =
            buildDetectiveMessage(
                target,
                previous
            );
    });
}


function buildDetectiveMessage(
    target,
    action
) {
    if (
        !action ||
        action.type === "none"
    ) {
        return `${target.name} did not interact with anyone or a system last round.`;
    }

    if (
        action.target !== null &&
        action.target !== undefined
    ) {
        const person =
            game.players.find(
                player =>
                    player.id === action.target
            );

        if (person) {
            return `${target.name} interacted with ${person.name} last round.`;
        }
    }

    if (action.system) {
        return `${target.name} interacted with ${SYSTEMS[action.system].name} last round.`;
    }

    return `${target.name} interacted with something last round.`;
}


/* =========================================================
   CONTINUE AFTER ACTIONS
   ========================================================= */

function continueAfterActions() {
    /*
     * If a living Detective made an investigation,
     * privately show it before discussion.
     */
    const detective =
        game.players.find(player =>
            player.alive &&
            player.role === "detective" &&
            player.lastInvestigation
        );

    if (detective) {
        const result =
            detective.lastInvestigation;

        detective.lastInvestigation = null;

        const current =
            game.players.findIndex(
                player =>
                    player.id === detective.id
            );

        if (current !== -1) {
            const oldIndex =
                game.currentPlayerIndex;

            game.currentPlayerIndex =
                current;

            showPrivateResult(
                "🕵️ DETECTIVE RESULT",
                result
            );

            game.currentPlayerIndex =
                oldIndex;
        }

        /*
         * The game continues after the private result.
         */
    }

    showDiscussion();
}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {
    const roundElement =
        $("discussionRound");

    if (roundElement) {
        roundElement.textContent =
            `ROUND ${game.round}`;
    }

    const stageElement =
        $("discussionStage");

    if (stageElement) {
        stageElement.textContent =
            `STAGE ${game.stage} / ${MAX_STAGES}`;
    }

    const resultsBox =
        $("roundResults");

    if (resultsBox) {
        if (game.lastRoundResults.length > 0) {
            resultsBox.innerHTML =
                game.lastRoundResults
                    .map(result =>
                        `<p>${result}</p>`
                    )
                    .join("");
        } else {
            resultsBox.innerHTML =
                "<p>Nothing unusual happened.</p>";
        }
    }

    showScreen("discussionScreen");
}


/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {
    game.currentVoteIndex = 0;
    game.votes = {};

    startNextVote();
}


function startNextVote() {
    /*
     * Skip dead players.
     */
    while (
        game.currentVoteIndex <
        game.players.length &&
        !game.players[
            game.currentVoteIndex
        ].alive
    ) {
        game.currentVoteIndex++;
    }

    if (
        game.currentVoteIndex >=
        game.players.length
    ) {
        resolveVoting();
        return;
    }

    game.selectedVote = null;

    updateVotingInfo();
    renderVoteOptions();

    showScreen("votingScreen");
}


/* =========================================================
   VOTING INFO
   ========================================================= */

function updateVotingInfo() {
    const player =
        game.players[game.currentVoteIndex];

    if (!player) {
        return;
    }

    const voter =
        $("voterName");

    if (voter) {
        voter.textContent =
            player.name;
    }

    const round =
        $("votingRound");

    if (round) {
        round.textContent =
            `ROUND ${game.round}`;
    }

    const stage =
        $("votingStage");

    if (stage) {
        stage.textContent =
            `STAGE ${game.stage} / ${MAX_STAGES}`;
    }

    const warning =
        $("votingSilenced");

    if (warning) {
        if (isSilenced(player.id)) {
            warning.textContent =
                "🔇 You are silenced and cannot vote.";
            warning.classList.remove("hidden");
        } else {
            warning.classList.add("hidden");
        }
    }
}


/* =========================================================
   RENDER VOTE OPTIONS
   ========================================================= */

function renderVoteOptions() {
    const container =
        $("voteOptions");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const voter =
        game.players[game.currentVoteIndex];

    if (!voter) {
        return;
    }

    if (isSilenced(voter.id)) {
        const skip =
            document.createElement("button");

        skip.type = "button";
        skip.className = "vote-option";

        skip.textContent =
            "🔇 SILENCED — NO VOTE";

        skip.addEventListener(
            "click",
            function () {
                game.votes[voter.id] = null;

                game.currentVoteIndex++;

                startNextVote();
            }
        );

        container.appendChild(skip);

        return;
    }

    const targets =
        game.players.filter(player =>
            player.alive &&
            player.id !== voter.id
        );

    targets.forEach(target => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "vote-option";

        button.textContent =
            `🗳️ ${target.name}`;

        button.addEventListener(
            "click",
            function () {
                game.selectedVote =
                    target.id;

                container
                    .querySelectorAll("button")
                    .forEach(btn =>
                        btn.classList.remove(
                            "selected"
                        )
                    );

                button.classList.add(
                    "selected"
                );
            }
        );

        container.appendChild(button);
    });

    const skipButton =
        document.createElement("button");

    skipButton.type = "button";
    skipButton.className =
        "vote-option";

    skipButton.textContent =
        "⏭️ SKIP";

    skipButton.addEventListener(
        "click",
        function () {
            game.selectedVote = null;

            container
                .querySelectorAll("button")
                .forEach(btn =>
                    btn.classList.remove(
                        "selected"
                    )
                );

            skipButton.classList.add(
                "selected"
            );
        }
    );

    container.appendChild(skipButton);
}


/* =========================================================
   CONFIRM VOTE
   ========================================================= */

function confirmVote() {
    const voter =
        game.players[game.currentVoteIndex];

    if (!voter) {
        return;
    }

    if (isSilenced(voter.id)) {
        game.votes[voter.id] = null;

        game.currentVoteIndex++;

        startNextVote();

        return;
    }

    /*
     * selectedVote === null is a valid skip,
     * so we need a separate check to know whether
     * the player actually chose something.
     */
    const selectedButtons =
        document.querySelectorAll(
            "#voteOptions .selected"
        );

    if (selectedButtons.length === 0) {
        alert("Choose a player or SKIP.");
        return;
    }

    game.votes[voter.id] =
        game.selectedVote;

    game.currentVoteIndex++;

    startNextVote();
}


/* =========================================================
   RESOLVE VOTING
   ========================================================= */

function resolveVoting() {
    const counts = {};

    Object.values(game.votes).forEach(targetId => {
        if (
            targetId === null ||
            targetId === undefined
        ) {
            return;
        }

        counts[targetId] =
            (counts[targetId] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
        finishVoting(null);
        return;
    }

    const highest =
        Math.max(
            ...Object.values(counts)
        );

    const tied =
        Object.keys(counts)
            .filter(
                id =>
                    counts[id] === highest
            )
            .map(Number);

    if (tied.length > 1) {
        showCaptainTieDecision(tied);
        return;
    }

    finishVoting(tied[0]);
}


/* =========================================================
   CAPTAIN TIE
   ========================================================= */

function showCaptainTieDecision(tiedPlayers) {
    const captain =
        game.players.find(player =>
            player.alive &&
            player.role === "captain"
        );

    /*
     * Captain cannot use ability if Power is offline.
     */
    if (
        !captain ||
        !game.systems.power
    ) {
        finishVoting(null);
        return;
    }

    const container =
        $("captainTieOptions");

    if (!container) {
        finishVoting(null);
        return;
    }

    container.innerHTML = "";

    tiedPlayers.forEach(id => {
        const player =
            game.players.find(
                p => p.id === id
            );

        if (!player) {
            return;
        }

        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "vote-option";

        button.textContent =
            `☠️ EJECT ${player.name}`;

        button.addEventListener(
            "click",
            function () {
                finishVoting(player.id);
            }
        );

        container.appendChild(button);
    });

    showScreen("captainTieScreen");
}


/* =========================================================
   FINISH VOTING
   ========================================================= */

function finishVoting(ejectedId) {
    if (
        ejectedId !== null &&
        ejectedId !== undefined
    ) {
        const player =
            game.players.find(
                p => p.id === ejectedId
            );

        if (player && player.alive) {
            player.alive = false;
        }
    }

    const resultTitle =
        $("voteResultTitle");

    const resultMessage =
        $("voteResultMessage");

    if (ejectedId === null) {
        if (resultTitle) {
            resultTitle.textContent =
                "🗳️ NO EJECTION";
        }

        if (resultMessage) {
            resultMessage.textContent =
                "Nobody was ejected this round.";
        }
    } else {
        const player =
            game.players.find(
                p => p.id === ejectedId
            );

        if (resultTitle) {
            resultTitle.textContent =
                "☠️ PLAYER EJECTED";
        }

        if (resultMessage && player) {
            resultMessage.textContent =
                `${player.name} has been ejected.`;
        }
    }

    showScreen("voteResultScreen");
}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {
    if (checkImmediateVictory()) {
        return;
    }

    /*
     * Engines only progress the stage when ONLINE.
     */
    if (game.systems.engines) {
        game.stage++;
    }

    /*
     * Earth lifeline exactly every 3 rounds.
     */
    if (game.round % 3 === 0) {
        if (game.systems.communications) {
            showEarthLifeline();
            return;
        }
    }

    continueRoundProgression();
}


/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showEarthLifeline() {
    game.lifelineNumber++;

    const title =
        $("lifelineTitle");

    if (title) {
        title.textContent =
            `📡 EARTH LIFELINE #${game.lifelineNumber}`;
    }

    const message =
        $("lifelineMessage");

    if (message) {
        message.textContent =
            generateLifeline();
    }

    showScreen("lifelineScreen");
}


function generateLifeline() {
    const messages = [];

    const livingHostiles =
        game.players.filter(player =>
            player.alive &&
            HOSTILE_ROLES.includes(player.role)
        );

    const livingPlayers =
        game.players.filter(
            player => player.alive
        );

    messages.push(
        "There is an Alien aboard."
    );

    if (livingHostiles.length > 1) {
        messages.push(
            "There is more than 1 Alien aboard."
        );
    }

    if (
        livingHostiles.some(
            player =>
                player.role === "saboteur"
        )
    ) {
        messages.push(
            "There is a Saboteur aboard."
        );
    }

    if (
        livingHostiles.some(
            player =>
                player.role === "silencer"
        )
    ) {
        messages.push(
            "There is a Silencer aboard."
        );
    }

    if (livingHostiles.length === 2) {
        messages.push(
            "There are exactly 2 hostile roles."
        );
    }

    if (livingHostiles.length === 3) {
        messages.push(
            "There are exactly 3 hostile roles."
        );
    }

    const engineer =
        livingPlayers.find(
            player =>
                player.role === "engineer"
        );

    if (engineer) {
        messages.push(
            "Engineer is still alive."
        );
    }

    /*
     * GUARANTEED clue:
     * Exactly one listed player is hostile.
     */
    if (livingHostiles.length > 0) {
        const hostile =
            livingHostiles[
                Math.floor(
                    Math.random() *
                    livingHostiles.length
                )
            ];

        const humans =
            livingPlayers.filter(
                player =>
                    !HOSTILE_ROLES.includes(
                        player.role
                    ) &&
                    player.id !== hostile.id
            );

        const numberOfHumans =
            Math.min(
                2,
                humans.length
            );

        const chosenHumans =
            shuffleArray(humans)
                .slice(
                    0,
                    numberOfHumans
                );

        const cluePlayers =
            shuffleArray([
                hostile,
                ...chosenHumans
            ]);

        messages.push(
            `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${cluePlayers
                .map(player => player.name)
                .join(", ")}`
        );
    }

    return messages[
        Math.floor(
            Math.random() *
            messages.length
        )
    ];
}


/* =========================================================
   CONTINUE ROUND
   ========================================================= */

function continueRoundProgression() {
    if (checkImmediateVictory()) {
        return;
    }

    /*
     * Humans win after completing Stage 10.
     */
    if (game.stage > MAX_STAGES) {
        humanWin();
        return;
    }

    game.round++;

    showSystemsStatus();
}


/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function showSystemsStatus() {
    const container =
        $("systemsList");

    if (container) {
        container.innerHTML =
            Object.keys(SYSTEMS)
                .map(key => {
                    const online =
                        game.systems[key];

                    return `
                        <div class="system ${
                            online
                                ? "online"
                                : "offline"
                        }">
                            <span>
                                ${SYSTEMS[key].name}
                            </span>

                            <strong>
                                ${
                                    online
                                        ? "ONLINE"
                                        : "OFFLINE"
                                }
                            </strong>
                        </div>
                    `;
                })
                .join("");
    }

    const round =
        $("systemsRound");

    if (round) {
        round.textContent =
            `ROUND ${game.round}`;
    }

    const stage =
        $("systemsStage");

    if (stage) {
        stage.textContent =
            `STAGE ${game.stage} / ${MAX_STAGES}`;
    }

    showScreen("systemsScreen");
}


/* =========================================================
   START NEXT ROUND
   ========================================================= */

function startNextRound() {
    beginRound();
}


/* =========================================================
   SILENCE
   ========================================================= */

function isSilenced(playerId) {
    const until =
        game.silencedUntil[playerId];

    if (!until) {
        return false;
    }

    return game.round < until;
}


function cleanupSilences() {
    Object.keys(
        game.silencedUntil
    ).forEach(id => {
        if (
            game.round >=
            game.silencedUntil[id]
        ) {
            delete game.silencedUntil[id];
        }
    });
}


/* =========================================================
   VICTORY CHECK
   ========================================================= */

function checkImmediateVictory() {
    const livingHostiles =
        game.players.filter(player =>
            player.alive &&
            HOSTILE_ROLES.includes(
                player.role
            )
        );

    const livingHumans =
        game.players.filter(player =>
            player.alive &&
            !HOSTILE_ROLES.includes(
                player.role
            )
        );

    /*
     * Humans have eliminated all hostiles.
     */
    if (livingHostiles.length === 0) {
        humanWin();
        return true;
    }

    /*
     * Hostiles win when they equal or outnumber
     * the living humans.
     */
    if (
        livingHostiles.length >=
        livingHumans.length
    ) {
        hostileWin();
        return true;
    }

    return false;
}


/* =========================================================
   HUMAN WIN
   ========================================================= */

function humanWin() {
    if (game.gameOver) {
        return;
    }

    game.gameOver = true;

    const title =
        $("gameOverTitle");

    const message =
        $("gameOverMessage");

    if (title) {
        title.textContent =
            "🚀 HUMANS WIN!";
    }

    if (message) {
        message.textContent =
            "The crew survived and completed the mission.";
    }

    showFinalPlayers();

    showScreen("gameOverScreen");
}


/* =========================================================
   HOSTILE WIN
   ========================================================= */

function hostileWin() {
    if (game.gameOver) {
        return;
    }

    game.gameOver = true;

    const title =
        $("gameOverTitle");

    const message =
        $("gameOverMessage");

    if (title) {
        title.textContent =
            "👽 HOSTILES WIN!";
    }

    if (message) {
        message.textContent =
            "The hostile roles have taken control of the ship.";
    }

    showFinalPlayers();

    showScreen("gameOverScreen");
}


/* =========================================================
   FINAL PLAYERS
   ========================================================= */

function showFinalPlayers() {
    const container =
        $("finalPlayers");

    if (!container) {
        return;
    }

    container.innerHTML =
        game.players
            .map(player => {
                const role =
                    ROLE_DATA[player.role];

                return `
                    <div class="final-player">
                        <strong>
                            ${player.name}
                        </strong>

                        <span>
                            ${role.icon}
                            ${role.name}
                        </span>

                        <span>
                            ${
                                player.alive
                                    ? "🟢 ALIVE"
                                    : "🔴 ELIMINATED"
                            }
                        </span>
                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   RESTART
   ========================================================= */

function restartGame() {
    location.reload();
}


/* =========================================================
   MOBILE-SAFE EVENT SETUP
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Player count changes.
         */
        const playerCount =
            $("playerCount");

        if (playerCount) {
            playerCount.addEventListener(
                "change",
                function () {
                    createPlayerSetup();
                }
            );
        }


        /*
         * =================================================
         * RANDOMISE ROLES
         * =================================================
         *
         * IMPORTANT MOBILE FIX:
         *
         * - type="button" prevents accidental form submit
         * - one click handler only
         * - no touchend handler
         * - prevents double activation on phones
         */
        const randomButton =
            $("randomRolesButton");

        if (randomButton) {
            randomButton.type = "button";

            randomButton.addEventListener(
                "click",
                function (event) {
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
            startButton.type = "button";

            startButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    startGame();
                }
            );
        }


        /*
         * PASS PHONE
         */
        const readyButton =
            $("readyButton");

        if (readyButton) {
            readyButton.type = "button";

            readyButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    startPlayerTurn();
                }
            );
        }


        /*
         * CONFIRM ACTION
         */
        const confirmActionButton =
            $("confirmActionButton");

        if (confirmActionButton) {
            confirmActionButton.type =
                "button";

            confirmActionButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    confirmAction();
                }
            );
        }


        /*
         * FINISH PRIVATE RESULT
         */
        const privateContinue =
            $("privateResultContinue");

        if (privateContinue) {
            privateContinue.type =
                "button";

            privateContinue.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    /*
                     * If there are still players who need
                     * to act, continue their turns.
                     */
                    if (
                        game.currentPlayerIndex <
                        game.players.length - 1
                    ) {
                        game.currentPlayerIndex++;

                        showPassScreen();

                        return;
                    }

                    /*
                     * If everyone acted, continue.
                     */
                    if (
                        game.currentPlayerIndex >=
                        game.players.length - 1
                    ) {
                        showDiscussion();
                    }
                }
            );
        }


        /*
         * START VOTING
         */
        const startVotingButton =
            $("startVotingButton");

        if (startVotingButton) {
            startVotingButton.type =
                "button";

            startVotingButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

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
            confirmVoteButton.type =
                "button";

            confirmVoteButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

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
            afterVoteButton.type =
                "button";

            afterVoteButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    afterVoting();
                }
            );
        }


        /*
         * AFTER LIFELINE
         */
        const lifelineContinue =
            $("lifelineContinue");

        if (lifelineContinue) {
            lifelineContinue.type =
                "button";

            lifelineContinue.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    continueRoundProgression();
                }
            );
        }


        /*
         * START NEXT ROUND
         */
        const nextRoundButton =
            $("nextRoundButton");

        if (nextRoundButton) {
            nextRoundButton.type =
                "button";

            nextRoundButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

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
            restartButton.type =
                "button";

            restartButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    restartGame();
                }
            );
        }


        /*
         * Create the initial player setup.
         */
        createPlayerSetup();
    }
);
