
/* =========================================================
   ALIEN
   PASS-AND-PLAY SOCIAL DEDUCTION GAME
   ========================================================= */


/* =========================================================
   CONSTANTS
========================================================= */

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;

const STAGES_TO_WIN = 10;

const SYSTEMS = [
    "engines",
    "o2",
    "communications",
    "power"
];

const ROLE_DATA = {

    alien: {
        name: "Alien",
        icon: "👽",
        team: "hostile"
    },

    saboteur: {
        name: "Saboteur",
        icon: "😈",
        team: "hostile"
    },

    silencer: {
        name: "Silencer",
        icon: "🔇",
        team: "hostile"
    },

    engineer: {
        name: "Engineer",
        icon: "🔧",
        team: "human"
    },

    detective: {
        name: "Detective",
        icon: "🕵️",
        team: "human"
    },

    medic: {
        name: "Medic",
        icon: "🩺",
        team: "human"
    },

    captain: {
        name: "Captain",
        icon: "👨‍✈️",
        team: "human"
    },

    guard: {
        name: "Guard",
        icon: "🛡️",
        team: "human"
    },

    crewmate: {
        name: "Crewmate",
        icon: "👤",
        team: "human"
    }
};


/* =========================================================
   GAME STATE
========================================================= */

let game = {

    players: [],

    round: 1,

    stage: 1,

    systems: {
        engines: true,
        o2: true,
        communications: true,
        power: true
    },

    actions: {},

    votes: {},

    silencedUntil: {},

    detectiveInfo: {},

    protectedPlayer: null,

    guardTarget: null,

    blockedPlayers: {},

    stageProgress: 0,

    pendingEjection: null,

    lastVoteResult: null,

    randomRoles: false
};


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const screens = document.querySelectorAll(".screen");


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(id) {

    screens.forEach(screen => {
        screen.classList.remove("active");
    });

    $(id).classList.add("active");

    window.scrollTo(0, 0);
}


/* =========================================================
   SETUP
========================================================= */

let setupCount = 6;

function createRoleOptions(selected = "crewmate") {

    let html = "";

    Object.entries(ROLE_DATA).forEach(([key, role]) => {

        html += `
            <option value="${key}" ${key === selected ? "selected" : ""}>
                ${role.icon} ${role.name}
            </option>
        `;

    });

    return html;
}


function renderSetupPlayers() {

    $("playerCount").textContent = setupCount;

    const container = $("playersSetup");

    container.innerHTML = "";

    for (let i = 0; i < setupCount; i++) {

        const player = game.players[i];

        const name = player?.name || `Player ${i + 1}`;
        const role = player?.role || "crewmate";

        container.innerHTML += `
            <div class="setup-player">

                <div class="setup-player-title">
                    PLAYER ${i + 1}
                </div>

                <div class="setup-row">

                    <input
                        class="player-name"
                        data-index="${i}"
                        value="${escapeHtml(name)}"
                        placeholder="Player ${i + 1}"
                        maxlength="20"
                    >

                    <select
                        class="player-role"
                        data-index="${i}"
                    >
                        ${createRoleOptions(role)}
                    </select>

                </div>

            </div>
        `;
    }

    document.querySelectorAll(".player-name").forEach(input => {

        input.addEventListener("input", e => {

            const index = Number(e.target.dataset.index);

            if (!game.players[index]) {
                game.players[index] = {};
            }

            game.players[index].name = e.target.value;

        });

    });

    document.querySelectorAll(".player-role").forEach(select => {

        select.addEventListener("change", e => {

            const index = Number(e.target.dataset.index);

            if (!game.players[index]) {
                game.players[index] = {};
            }

            game.players[index].role = e.target.value;

        });

    });
}


$("addPlayer").addEventListener("click", () => {

    if (setupCount >= MAX_PLAYERS) return;

    setupCount++;

    renderSetupPlayers();
});


$("removePlayer").addEventListener("click", () => {

    if (setupCount <= MIN_PLAYERS) return;

    setupCount--;

    game.players = game.players.slice(0, setupCount);

    renderSetupPlayers();
});


/* =========================================================
   RANDOM ROLES
========================================================= */

$("randomizeRoles").addEventListener("click", () => {

    game.randomRoles = true;

    const roles = generateRandomRoles(setupCount);

    game.players = [];

    for (let i = 0; i < setupCount; i++) {

        game.players.push({
            id: i,
            name: `Player ${i + 1}`,
            role: roles[i],
            alive: true
        });

    }

    renderSetupPlayers();
});


function generateRandomRoles(count) {

    /*
        Engineer is always guaranteed.

        The randomizer chooses a sensible hostile
        count based on player count.
    */

    let hostileCount;

    if (count <= 5) {
        hostileCount = 1;
    } else if (count <= 7) {
        hostileCount = 2;
    } else if (count <= 10) {
        hostileCount = 3;
    } else {
        hostileCount = 4;
    }

    hostileCount = Math.min(
        hostileCount,
        Math.floor((count - 1) / 2)
    );

    const hostileRoles = [];

    hostileRoles.push("alien");

    if (hostileCount >= 2) {
        hostileRoles.push("saboteur");
    }

    if (hostileCount >= 3) {
        hostileRoles.push("silencer");
    }

    while (hostileRoles.length < hostileCount) {
        hostileRoles.push("alien");
    }

    const humanRoles = [
        "engineer",
        "detective",
        "medic",
        "captain",
        "guard"
    ];

    const result = [...hostileRoles];

    result.push("engineer");

    while (result.length < count) {

        const available = humanRoles.filter(role => {

            if (role === "engineer") {
                return !result.includes("engineer");
            }

            return true;

        });

        const role =
            available[Math.floor(Math.random() * available.length)];

        result.push(role);
    }

    shuffle(result);

    return result;
}


/* =========================================================
   START GAME
========================================================= */

$("startGame").addEventListener("click", startGame);


function startGame() {

    const names = document.querySelectorAll(".player-name");
    const roles = document.querySelectorAll(".player-role");

    game.players = [];

    for (let i = 0; i < setupCount; i++) {

        const name =
            names[i].value.trim() ||
            `Player ${i + 1}`;

        const role =
            roles[i].value;

        game.players.push({
            id: i,
            name,
            role,
            alive: true
        });
    }

    /*
        Engineer must always exist.
        If manual setup doesn't include one,
        automatically turn the last player into Engineer.
    */

    if (!game.players.some(p => p.role === "engineer")) {

        game.players[game.players.length - 1].role = "engineer";

        alert(
            "An Engineer is required in every game. " +
            `${game.players[game.players.length - 1].name} is now the Engineer.`
        );
    }

    game.round = 1;
    game.stage = 1;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    game.actions = {};
    game.votes = {};
    game.silencedUntil = {};
    game.detectiveInfo = {};
    game.protectedPlayer = null;
    game.guardTarget = null;
    game.blockedPlayers = {};
    game.stageProgress = 0;

    startRound();
}


/* =========================================================
   ROUND START
========================================================= */

function startRound() {

    game.actions = {};
    game.votes = {};
    game.protectedPlayer = null;
    game.guardTarget = null;
    game.blockedPlayers = {};

    const alive = game.players.filter(p => p.alive);

    if (checkHostileWin()) return;

    showPassScreen(
        `ROUND ${game.round}`,
        `Pass the phone to ${alive[0].name}.`
    );

    window.currentActionIndex = 0;

    $("readyButton").onclick = beginCurrentAction;
}


/* =========================================================
   PASS SCREEN
========================================================= */

function showPassScreen(title, text) {

    $("passTitle").textContent = title;
    $("passText").textContent = text;

    showScreen("passScreen");
}


/* =========================================================
   ACTION PHASE
========================================================= */

function beginCurrentAction() {

    const alive = game.players.filter(p => p.alive);

    if (window.currentActionIndex >= alive.length) {

        resolveRound();

        return;
    }

    const player = alive[window.currentActionIndex];

    showActionScreen(player);
}


function showActionScreen(player) {

    $("actionRound").textContent =
        `ROUND ${game.round}`;

    $("actionStage").textContent =
        `STAGE ${game.stage}/10`;

    $("actionPlayer").textContent =
        player.name;

    const role = ROLE_DATA[player.role];

    $("actionRole").textContent =
        `${role.icon} ${role.name}`;

    const actionOptions = $("actionOptions");

    actionOptions.innerHTML = "";

    $("confirmAction").disabled = true;

    const powerOffline = !game.systems.power;

    /*
        Engineer is the only role that can act while
        Power is offline.
    */

    if (powerOffline && player.role !== "engineer") {

        $("actionDescription").textContent =
            "⚡ POWER IS OFFLINE. Your ability cannot be used this round.";

        createActionButton(
            actionOptions,
            "Continue",
            "none",
            () => {
                game.actions[player.id] = {
                    type: "none"
                };

                finishAction();
            }
        );

        return;
    }

    buildRoleAction(player);
}


function createActionButton(container, text, value, callback) {

    const button = document.createElement("button");

    button.className = "action-option";

    button.textContent = text;

    button.onclick = () => {

        document.querySelectorAll(".action-option")
            .forEach(b => b.classList.remove("selected"));

        button.classList.add("selected");

        callback(value);

    };

    container.appendChild(button);

    return button;
}


/* =========================================================
   ROLE ACTIONS
========================================================= */

function buildRoleAction(player) {

    const container = $("actionOptions");

    switch (player.role) {

        case "alien":
            buildAlienAction(player, container);
            break;

        case "saboteur":
            buildSaboteurAction(player, container);
            break;

        case "silencer":
            buildSilencerAction(player, container);
            break;

        case "engineer":
            buildEngineerAction(player, container);
            break;

        case "detective":
            buildDetectiveAction(player, container);
            break;

        case "medic":
            buildMedicAction(player, container);
            break;

        case "captain":
            buildCaptainAction(player, container);
            break;

        case "guard":
            buildGuardAction(player, container);
            break;

        case "crewmate":

            $("actionDescription").textContent =
                "You have no special ability. Stay alert and watch the crew.";

            createActionButton(
                container,
                "Continue",
                "none",
                () => finishAction()
            );

            break;
    }
}


/* =========================================================
   ALIEN
========================================================= */

function buildAlienAction(player, container) {

    const hasSaboteur =
        game.players.some(
            p => p.alive && p.role === "saboteur"
        );

    if (hasSaboteur) {

        $("actionDescription").textContent =
            "Choose one living player to kill.";

        const targets =
            game.players.filter(
                p =>
                    p.alive &&
                    p.id !== player.id
            );

        targets.forEach(target => {

            createActionButton(
                container,
                `👤 ${target.name}`,
                target.id,
                value => {

                    game.actions[player.id] = {
                        type: "kill",
                        target: Number(value)
                    };

                    $("confirmAction").disabled = false;

                }
            );

        });

        $("confirmAction").onclick = finishAction;

    } else {

        $("actionDescription").textContent =
            "Choose to kill a player OR sabotage a ship system.";

        createActionButton(
            container,
            "💀 Kill a player",
            "killmode",
            () => {

                container.innerHTML = "";

                const targets =
                    game.players.filter(
                        p =>
                            p.alive &&
                            p.id !== player.id
                    );

                targets.forEach(target => {

                    createActionButton(
                        container,
                        `💀 ${target.name}`,
                        target.id,
                        value => {

                            game.actions[player.id] = {
                                type: "kill",
                                target: Number(value)
                            };

                            $("confirmAction").disabled = false;

                        }
                    );

                });

            }
        );

        createActionButton(
            container,
            "⚠️ Sabotage a system",
            "sabotage",
            () => {

                container.innerHTML = "";

                SYSTEMS.forEach(system => {

                    if (game.systems[system]) {

                        createActionButton(
                            container,
                            systemName(system),
                            system,
                            value => {

                                game.actions[player.id] = {
                                    type: "sabotage",
                                    system: value
                                };

                                $("confirmAction").disabled = false;

                            }
                        );

                    }

                });

            }
        );

        $("confirmAction").onclick = finishAction;
    }
}


/* =========================================================
   SABOTEUR
========================================================= */

function buildSaboteurAction(player, container) {

    $("actionDescription").textContent =
        "Choose one ONLINE ship system to sabotage.";

    SYSTEMS.forEach(system => {

        if (!game.systems[system]) return;

        createActionButton(
            container,
            `⚠️ ${systemName(system)}`,
            system,
            value => {

                game.actions[player.id] = {
                    type: "sabotage",
                    system: value
                };

                $("confirmAction").disabled = false;

            }
        );

    });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   SILENCER
========================================================= */

function buildSilencerAction(player, container) {

    $("actionDescription").textContent =
        "Choose one living player. They cannot vote for 2 rounds.";

    game.players
        .filter(p => p.alive && p.id !== player.id)
        .forEach(target => {

            createActionButton(
                container,
                `🔇 ${target.name}`,
                target.id,
                value => {

                    game.actions[player.id] = {
                        type: "silence",
                        target: Number(value)
                    };

                    $("confirmAction").disabled = false;

                }
            );

        });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   ENGINEER
========================================================= */

function buildEngineerAction(player, container) {

    const offline =
        SYSTEMS.filter(system => !game.systems[system]);

    if (offline.length === 0) {

        $("actionDescription").textContent =
            "All ship systems are online. No repair is needed.";

        createActionButton(
            container,
            "Continue",
            "none",
            () => finishAction()
        );

        return;
    }

    $("actionDescription").textContent =
        "Choose one offline system to repair.";

    offline.forEach(system => {

        createActionButton(
            container,
            `🔧 Repair ${systemName(system)}`,
            system,
            value => {

                game.actions[player.id] = {
                    type: "repair",
                    system: value
                };

                $("confirmAction").disabled = false;

            }
        );

    });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   DETECTIVE
========================================================= */

function buildDetectiveAction(player, container) {

    $("actionDescription").textContent =
        "Choose a player to learn who or what they interacted with last round.";

    game.players
        .filter(p => p.alive && p.id !== player.id)
        .forEach(target => {

            createActionButton(
                container,
                `🕵️ Investigate ${target.name}`,
                target.id,
                value => {

                    game.actions[player.id] = {
                        type: "investigate",
                        target: Number(value)
                    };

                    $("confirmAction").disabled = false;

                }
            );

        });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   MEDIC
========================================================= */

function buildMedicAction(player, container) {

    $("actionDescription").textContent =
        "Choose one living player to protect from being killed.";

    game.players
        .filter(p => p.alive)
        .forEach(target => {

            createActionButton(
                container,
                `🩺 Protect ${target.name}`,
                target.id,
                value => {

                    game.actions[player.id] = {
                        type: "protect",
                        target: Number(value)
                    };

                    $("confirmAction").disabled = false;

                }
            );

        });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   CAPTAIN
========================================================= */

function buildCaptainAction(player, container) {

    $("actionDescription").textContent =
        "Your ability activates automatically if the vote is tied.";

    createActionButton(
        container,
        "👨‍✈️ Continue",
        "none",
        () => finishAction()
    );
}


/* =========================================================
   GUARD
========================================================= */

function buildGuardAction(player, container) {

    $("actionDescription").textContent =
        "Choose one living player to block their ability for this round.";

    game.players
        .filter(p => p.alive && p.id !== player.id)
        .forEach(target => {

            createActionButton(
                container,
                `🛡️ Guard ${target.name}`,
                target.id,
                value => {

                    game.actions[player.id] = {
                        type: "guard",
                        target: Number(value)
                    };

                    $("confirmAction").disabled = false;

                }
            );

        });

    $("confirmAction").onclick = finishAction;
}


/* =========================================================
   ACTION FINISHED
========================================================= */

function finishAction() {

    const alive = game.players.filter(p => p.alive);

    window.currentActionIndex++;

    if (window.currentActionIndex >= alive.length) {

        resolveRound();

        return;
    }

    showScreen("actionDoneScreen");

    $("nextPlayerButton").onclick = () => {

        const next =
            alive[window.currentActionIndex];

        showPassScreen(
            "PASS THE PHONE",
            `Give the phone to ${next.name}.`
        );

        $("readyButton").onclick = beginCurrentAction;
    };
}


/* =========================================================
   RESOLVE ROUND
========================================================= */

function resolveRound() {

    game.protectedPlayer = null;
    game.guardTarget = null;

    /*
        Process Guard first.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (action.type === "guard") {

            game.guardTarget = action.target;

            game.blockedPlayers[action.target] = true;
        }

    });


    /*
        Process Medic.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "protect" &&
            !game.blockedPlayers[player.id]
        ) {

            game.protectedPlayer = action.target;
        }

    });


    /*
        Process Sabotage.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "sabotage" &&
            !game.blockedPlayers[player.id]
        ) {

            if (game.systems[action.system]) {
                game.systems[action.system] = false;
            }
        }

    });


    /*
        Process Engineer repairs.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "repair" &&
            !game.blockedPlayers[player.id]
        ) {

            game.systems[action.system] = true;
        }

    });


    /*
        Process Silencer.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "silence" &&
            !game.blockedPlayers[player.id]
        ) {

            game.silencedUntil[action.target] =
                game.round + 1;
        }

    });


    /*
        Process kills.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "kill" &&
            !game.blockedPlayers[player.id]
        ) {

            if (
                action.target !== game.protectedPlayer
            ) {

                const target =
                    getPlayer(action.target);

                if (target && target.alive) {

                    target.alive = false;
                }
            }
        }

    });


    /*
        Detective results.
    */

    Object.entries(game.actions).forEach(([id, action]) => {

        const player = getPlayer(Number(id));

        if (!player || !player.alive) return;

        if (
            action.type === "investigate" &&
            !game.blockedPlayers[player.id]
        ) {

            game.detectiveInfo[player.id] =
                getLastInteraction(action.target);

        }

    });


    /*
        Remove expired silence states.
    */

    Object.keys(game.silencedUntil).forEach(id => {

        if (
            game.round >
            game.silencedUntil[id]
        ) {

            delete game.silencedUntil[id];

        }

    });


    if (checkHostileWin()) return;

    showRoundResults();
}


/* =========================================================
   LAST INTERACTION
========================================================= */

function getLastInteraction(targetId) {

    const target = getPlayer(targetId);

    if (!target) return "Unknown";

    const action =
        game.actions[target.id];

    if (!action) {

        return "nothing";
    }

    if (action.target !== undefined) {

        const targetPlayer =
            getPlayer(action.target);

        if (targetPlayer) {

            return `interacted with ${targetPlayer.name}`;
        }
    }

    if (action.system) {

        return `interacted with ${systemName(action.system)}`;
    }

    return "nothing";
}


/* =========================================================
   ROUND RESULTS
========================================================= */

function showRoundResults() {

    const content = $("resultsContent");

    content.innerHTML = "";

    content.innerHTML += `
        <div class="result-card">
            <strong>🚀 Engines</strong>
            <span class="${game.systems.engines ? "online" : "offline"}">
                ${game.systems.engines ? "ONLINE" : "OFFLINE"}
            </span>
        </div>

        <div class="result-card">
            <strong>🫁 O2</strong>
            <span class="${game.systems.o2 ? "online" : "offline"}">
                ${game.systems.o2 ? "ONLINE" : "OFFLINE"}
            </span>
        </div>

        <div class="result-card">
            <strong>📡 Communications</strong>
            <span class="${game.systems.communications ? "online" : "offline"}">
                ${game.systems.communications ? "ONLINE" : "OFFLINE"}
            </span>
        </div>

        <div class="result-card">
            <strong>⚡ Power</strong>
            <span class="${game.systems.power ? "online" : "offline"}">
                ${game.systems.power ? "ONLINE" : "OFFLINE"}
            </span>
        </div>
    `;

    /*
        Show detective result privately later.
        It isn't publicly revealed.
    */

    $("discussionInfo").innerHTML =
        `<strong>ROUND ${game.round}</strong><br>
         🚀 STAGE ${game.stage}/10`;

    showScreen("resultsScreen");
}


$("discussionButton").onclick = () => {

    showScreen("discussionScreen");

    $("voteButton").onclick = startVoting;
};


/* =========================================================
   VOTING
========================================================= */

function startVoting() {

    $("voteRound").textContent =
        `ROUND ${game.round}`;

    $("voteStage").textContent =
        `STAGE ${game.stage} / 10`;

    renderVoteOptions();

    showScreen("voteScreen");
}


function renderVoteOptions() {

    const container = $("voteOptions");

    container.innerHTML = "";

    const alive = game.players.filter(p => p.alive);

    alive.forEach(player => {

        const button =
            document.createElement("button");

        button.className = "vote-option";

        const silenced =
            game.silencedUntil[player.id] >= game.round;

        /*
            A silenced player cannot vote.
            We don't prevent other players from voting
            FOR them.
        */

        button.innerHTML = `
            ${player.name}
            <small>
                ${player.id === 0 ? "" : ""}
            </small>
        `;

        button.onclick = () => {

            const voter = chooseCurrentVoter();

            if (!voter) return;

            if (
                game.silencedUntil[voter.id] >= game.round
            ) {

                alert(
                    `${voter.name} is silenced and cannot vote this round.`
                );

                return;
            }

            game.votes[voter.id] = player.id;

        };

        container.appendChild(button);
    });
}


/*
    In this simple pass-and-play voting system,
    each player gets a private voting turn.
*/

let votingPlayerIndex = 0;

function chooseCurrentVoter() {

    const alive = game.players.filter(p => p.alive);

    if (votingPlayerIndex >= alive.length) {
        return null;
    }

    return alive[votingPlayerIndex];
}


/* =========================================================
   BETTER PASS-AND-PLAY VOTING
========================================================= */

function startVoting() {

    votingPlayerIndex = 0;

    game.votes = {};

    beginVoter();
}


function beginVoter() {

    const alive = game.players.filter(p => p.alive);

    if (votingPlayerIndex >= alive.length) {

        finishVoting();

        return;
    }

    const voter = alive[votingPlayerIndex];

    $("voteRound").textContent =
        `ROUND ${game.round}`;

    $("voteStage").textContent =
        `STAGE ${game.stage} / 10`;

    const instruction =
        document.querySelector(".vote-instruction");

    const silenced =
        game.silencedUntil[voter.id] >= game.round;

    instruction.innerHTML =
        `<strong>${voter.name}</strong> — choose a player or skip.`;

    const container = $("voteOptions");

    container.innerHTML = "";

    if (silenced) {

        instruction.innerHTML =
            `<strong>${voter.name}</strong> is 🔇 SILENCED and cannot vote this round.`;

        const button =
            document.createElement("button");

        button.className = "primary-btn";
        button.textContent = "CONTINUE";

        button.onclick = () => {

            votingPlayerIndex++;

            beginVoter();

        };

        container.appendChild(button);

        $("skipVote").style.display = "none";

        showScreen("voteScreen");

        return;
    }

    $("skipVote").style.display = "block";

    alive.forEach(target => {

        if (target.id === voter.id) return;

        const button =
            document.createElement("button");

        button.className = "vote-option";

        button.textContent =
            `🗳️ ${target.name}`;

        button.onclick = () => {

            game.votes[voter.id] =
                target.id;

            votingPlayerIndex++;

            beginVoter();

        };

        container.appendChild(button);
    });

    showScreen("voteScreen");
}


$("skipVote").onclick = () => {

    const alive = game.players.filter(p => p.alive);

    if (votingPlayerIndex >= alive.length) return;

    const voter =
        alive[votingPlayerIndex];

    game.votes[voter.id] = null;

    votingPlayerIndex++;

    beginVoter();
};


/* =========================================================
   FINISH VOTING
========================================================= */

function finishVoting() {

    const counts = {};

    Object.values(game.votes).forEach(target => {

        if (target === null) return;

        counts[target] =
            (counts[target] || 0) + 1;

    });

    const entries =
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {

        game.lastVoteResult = {
            type: "skip"
        };

        showVoteResult();

        return;
    }

    const highest =
        Number(entries[0][1]);

    const tied =
        entries.filter(
            entry => Number(entry[1]) === highest
        );

    if (tied.length > 1) {

        game.lastVoteResult = {
            type: "tie",
            players: tied.map(entry =>
                Number(entry[0])
            )
        };

        captainDecision();

        return;
    }

    const ejected =
        Number(entries[0][0]);

    ejectPlayer(ejected);
}


/* =========================================================
   CAPTAIN TIE BREAK
========================================================= */

function captainDecision() {

    const captain =
        game.players.find(
            p => p.alive &&
            p.role === "captain"
        );

    if (!captain) {

        /*
            No living Captain.
            A tie means nobody is ejected.
        */

        game.lastVoteResult = {
            type: "skip"
        };

        showVoteResult();

        return;
    }

    const options =
        $("captainOptions");

    options.innerHTML = "";

    game.lastVoteResult.players.forEach(id => {

        const player = getPlayer(id);

        const button =
            document.createElement("button");

        button.className = "vote-option";

        button.textContent =
            `👨‍✈️ Eject ${player.name}`;

        button.onclick = () => {

            ejectPlayer(player.id);

        };

        options.appendChild(button);
    });

    showScreen("captainScreen");
}


/* =========================================================
   EJECT PLAYER
========================================================= */

function ejectPlayer(id) {

    const player = getPlayer(id);

    if (!player) return;

    player.alive = false;

    game.pendingEjection = id;

    game.lastVoteResult = {
        type: "eject",
        player: id
    };

    if (checkHumanWin()) return;

    if (checkHostileWin()) return;

    showEjectedScreen(player);
}


/* =========================================================
   EJECTED SCREEN
========================================================= */

function showEjectedScreen(player) {

    $("ejectedTitle").textContent =
        `${player.name} EJECTED`;

    const role =
        ROLE_DATA[player.role];

    $("ejectedContent").innerHTML = `
        <p>
            Their role was:
        </p>

        <div class="role-card">
            ${role.icon} ${role.name}
        </div>
    `;

    $("ejectedContinue").onclick =
        afterVote;

    showScreen("ejectedScreen");
}


function showVoteResult() {

    $("voteResultContent").innerHTML = `
        <div class="result-card">
            ⏭️ The crew chose to skip the vote.
        </div>
    `;

    $("continueAfterVote").onclick =
        afterVote;

    showScreen("voteResultScreen");
}


$("continueAfterVote").onclick =
    afterVote;


function afterVote() {

    /*
        Earth lifeline every 3 rounds.
    */

    if (game.round % 3 === 0) {

        if (game.systems.communications) {

            showEarthLifeline();

            return;
        }
    }

    advanceStageOrRound();
}


/* =========================================================
   EARTH LIFELINES
========================================================= */

function showEarthLifeline() {

    const message =
        generateEarthMessage();

    $("lifelineMessage").innerHTML =
        message;

    $("lifelineContinue").onclick =
        advanceStageOrRound;

    showScreen("lifelineScreen");
}


function generateEarthMessage() {

    const alive =
        game.players.filter(p => p.alive);

    const hostile =
        alive.filter(
            p =>
                ROLE_DATA[p.role].team === "hostile"
        );

    const options = [];


    /* One of these players is hostile */

    if (hostile.length > 0 && alive.length >= 3) {

        const chosenHostile =
            hostile[
                Math.floor(
                    Math.random() * hostile.length
                )
            ];

        let candidates =
            alive.filter(
                p => p.id !== chosenHostile.id
            );

        candidates =
            shuffle([...candidates])
                .slice(0, 2);

        candidates.push(chosenHostile);

        candidates =
            shuffle(candidates);

        options.push(`
            ⚠️ ONE OF THESE PLAYERS IS HOSTILE
            <br><br>
            ${candidates
                .map(p => `• ${escapeHtml(p.name)}`)
                .join("<br>")}
        `);
    }


    /* Specific hostile role */

    hostile.forEach(player => {

        options.push(
            `${ROLE_DATA[player.role].icon}
             There is a
             <strong>${ROLE_DATA[player.role].name}</strong>
             aboard.`
        );

    });


    /* Multiple Alien */

    const aliens =
        alive.filter(
            p => p.role === "alien"
        );

    if (aliens.length > 1) {

        options.push(
            "👽 There is more than 1 Alien aboard."
        );
    }


    /* Hostile count */

    if (hostile.length === 2) {

        options.push(
            "⚠️ There are exactly 2 hostile roles."
        );
    }

    if (hostile.length === 3) {

        options.push(
            "⚠️ There are exactly 3 hostile roles."
        );
    }


    /* Human roles */

    const humanRoles = [
        "engineer",
        "detective",
        "medic",
        "captain",
        "guard"
    ];

    humanRoles.forEach(role => {

        if (
            alive.some(
                p => p.role === role
            )
        ) {

            options.push(
                `${ROLE_DATA[role].icon}
                 The ${ROLE_DATA[role].name}
                 is aboard.`
            );

        }

    });


    /* Action clues */

    if (
        Object.values(game.actions)
            .some(a => a.type === "sabotage")
    ) {

        options.push(
            "⚠️ A ship system was deliberately sabotaged."
        );
    }

    if (
        Object.values(game.actions)
            .some(a => a.type === "repair")
    ) {

        options.push(
            "🔧 A ship system was repaired."
        );
    }

    if (
        Object.values(game.actions)
            .some(a => a.type === "silence")
    ) {

        options.push(
            "🔇 A player was prevented from voting."
        );
    }

    if (
        Object.values(game.actions)
            .some(a => a.type === "guard")
    ) {

        options.push(
            "🛡️ A player's ability was blocked."
        );
    }


    if (options.length === 0) {

        return "🌍 Earth has sent a message: Stay alert, crew.";
    }

    return options[
        Math.floor(
            Math.random() * options.length
        )
    ];
}


/* =========================================================
   STAGE PROGRESSION
========================================================= */

function advanceStageOrRound() {

    /*
        Engines must be online to advance the stage.
        If offline, stage stays where it is.
    */

    if (game.systems.engines) {

        game.stageProgress++;

        game.stage++;

        if (game.stage > STAGES_TO_WIN) {

            humanWin(
                "The crew successfully completed all 10 stages and reached Earth."
            );

            return;
        }

        showStageScreen();

        return;
    }

    /*
        Engines offline.
        Stage does not advance.
    */

    game.round++;

    startRound();
}


/* =========================================================
   STAGE SCREEN
========================================================= */

function showStageScreen() {

    $("stageContent").innerHTML = `
        <p>
            The ship has reached:
        </p>

        <h2>
            🚀 STAGE ${game.stage} / ${STAGES_TO_WIN}
        </h2>

        <div class="stage-progress">

            <div class="stage-bar">
                <div
                    class="stage-fill"
                    style="width:${(game.stage / STAGES_TO_WIN) * 100}%"
                ></div>
            </div>

        </div>
    `;

    $("stageContinue").onclick = () => {

        game.round++;

        startRound();

    };

    showScreen("stageScreen");
}


/* =========================================================
   WIN CONDITIONS
========================================================= */

function checkHumanWin() {

    const hostiles =
        game.players.filter(
            p =>
                p.alive &&
                ROLE_DATA[p.role].team === "hostile"
        );

    if (hostiles.length === 0) {

        humanWin(
            "Every hostile role has been voted out."
        );

        return true;
    }

    return false;
}


function checkHostileWin() {

    const humans =
        game.players.filter(
            p =>
                p.alive &&
                ROLE_DATA[p.role].team === "human"
        );

    const hostiles =
        game.players.filter(
            p =>
                p.alive &&
                ROLE_DATA[p.role].team === "hostile"
        );

    if (
        hostiles.length >= humans.length &&
        hostiles.length > 0
    ) {

        hostileWin(
            "The hostile team has reached parity with the humans."
        );

        return true;
    }

    return false;
}


/* =========================================================
   HUMAN WIN
========================================================= */

function humanWin(reason) {

    $("winIcon").textContent = "🏆";

    $("winTitle").textContent =
        "HUMANS WIN!";

    $("winReason").textContent =
        reason;

    showScreen("winScreen");
}


/* =========================================================
   HOSTILE WIN
========================================================= */

function hostileWin(reason) {

    $("winIcon").textContent = "👽";

    $("winTitle").textContent =
        "HOSTILES WIN!";

    $("winReason").textContent =
        reason;

    showScreen("winScreen");
}


/* =========================================================
   HELPERS
========================================================= */

function getPlayer(id) {

    return game.players.find(
        p => p.id === Number(id)
    );
}


function systemName(system) {

    const names = {

        engines: "🚀 Engines",

        o2: "🫁 O2",

        communications: "📡 Communications",

        power: "⚡ Power"

    };

    return names[system] || system;
}


function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   INITIAL SETUP
========================================================= */

renderSetupPlayers();
