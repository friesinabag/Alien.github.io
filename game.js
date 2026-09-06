"use strict";

/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const alive = p => p && p.alive;

const rand = arr =>
    arr[Math.floor(Math.random() * arr.length)];

const shuffle = arr =>
    [...arr].sort(() => Math.random() - 0.5);

const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c]));


/* =========================================================
   ROLE DATA
   ========================================================= */

const ROLE_DATA = {

    alien: {
        icon: "👽",
        name: "Alien",
        team: "Hostile",
        desc:
            "Kill 1 player each round. If no living Saboteur exists, you may choose Kill or Sabotage. You can see the other Hostile players."
    },

    saboteur: {
        icon: "😈",
        name: "Saboteur",
        team: "Hostile",
        desc:
            "Sabotage 1 ship system each round. You can see the other Hostile players."
    },

    silencer: {
        icon: "🔇",
        name: "Silencer",
        team: "Hostile",
        desc:
            "Silence 1 living player for 2 rounds. They may still discuss and use their ability. You can see the other Hostile players."
    },

    parasite: {
        icon: "🦠",
        name: "Parasite",
        team: "Hostile",
        desc:
            "Infect 1 player once. Infection progresses to Diseased, then Parasite. You can see the other Hostile players."
    },

    engineer: {
        icon: "🔧",
        name: "Engineer",
        team: "Human",
        desc:
            "Repair 1 offline system each round. You can act even when Power is offline."
    },

    scientist: {
        icon: "🧪",
        name: "Scientist",
        team: "Human",
        desc:
            "Check 1 living player to see Healthy, Infected, Diseased or Parasite. You may cure Infected or Diseased."
    },

    detective: {
        icon: "🕵️",
        name: "Detective",
        team: "Human",
        desc:
            "Investigate 1 player. You learn what they interacted with last round."
    },

    medic: {
        icon: "🩺",
        name: "Medic",
        team: "Human",
        desc:
            "Protect 1 living player from a kill this round."
    },

    captain: {
        icon: "👨‍✈️",
        name: "Captain",
        team: "Human",
        desc:
            "If a vote ties, secretly choose which tied player is ejected. Power must be online."
    },

    guard: {
        icon: "🛡️",
        name: "Guard",
        team: "Human",
        desc:
            "Block 1 living player's role ability for this round."
    },

    survivor: {
        icon: "👤",
        name: "Survivor",
        team: "Human",
        desc:
            "No special ability. Help the Human team survive and reach Earth."
    },

    radio: {
        icon: "📻",
        name: "Radio Operator",
        team: "Human",
        desc:
            "Once per round, receive a private message from Earth while Communications is online."
    },

    judge: {
        icon: "⚖️",
        name: "Judge",
        team: "Human",
        desc:
            "Once per game, cancel a Captain's tie-breaker ejection."
    },

    jester: {
        icon: "🃏",
        name: "Jester",
        team: "Neutral",
        desc:
            "Try to get yourself voted out. If normally ejected, you win immediately."
    },

    king: {
        icon: "👑",
        name: "Survivor King",
        team: "Neutral",
        desc:
            "Win independently by being one of the final 2 living players."
    },

    trickster: {
        icon: "🎭",
        name: "Trickster",
        team: "Neutral",
        concept: true,
        desc:
            "Once per game, swap the displayed identities of two living players. The swap lasts through voting, then ends."
    },

    infected: {
        icon: "🦠",
        name: "Infected",
        team: "Infection",
        sub: true,
        desc:
            "A hidden infection stage. Only the Scientist can see this status. The infected player does not know."
    },

    diseased: {
        icon: "☣️",
        name: "Diseased",
        team: "Hostile",
        sub: true,
        desc:
            "The second infection stage. You know you are Diseased and on the Hostile Team. You cannot use an ability."
    },

    parasite_stage: {
        icon: "🦠",
        name: "Parasite",
        team: "Hostile",
        sub: true,
        desc:
            "The final infection stage. You are Hostile and can infect one player."
    }
};


/* =========================================================
   ROLE LISTS
   ========================================================= */

const HOSTILE_ROLES = [
    "alien",
    "saboteur",
    "silencer",
    "parasite"
];

const HUMAN_ROLES = [
    "survivor",
    "medic",
    "detective",
    "guard",
    "scientist",
    "radio",
    "captain",
    "judge"
];

const NEUTRAL_ROLES = [
    "jester",
    "king"
];

const CONCEPT_ROLES = [
    "trickster"
];


/* =========================================================
   HOSTILE COUNT
   ========================================================= */

const HOSTILE_COUNT = {
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    11: 4,
    12: 4
};


/* =========================================================
   HUMAN WEIGHTS
   ========================================================= */

const HUMAN_WEIGHTS = {
    survivor: 25,
    medic: 15,
    detective: 12.5,
    guard: 12.5,
    scientist: 10,
    radio: 10,
    captain: 7.5,
    judge: 7.5
};


/* =========================================================
   GAME STATE
   ========================================================= */

const game = {

    players: [],

    round: 1,

    stage: 1,

    randomisedRoles: false,

    randomRoles: [],

    customRoles: null,

    systems: {
        engines: true,
        o2: true,
        communications: true,
        power: true
    },

    roundStartAliveIds: [],

    reactionQueue: [],

    reactionIndex: 0,

    reactionInfo: {},

    selectedAction: null,

    selectedVote: null,

    currentVoterIndex: 0,

    votes: {},

    interactionLog: {},

    roundInteractions: {},

    blockedPlayers: new Set(),

    protectedPlayers: new Set(),

    silencedUntil: {},

    displaySwap: null,

    tricksterUsed: false,

    judgeUsed: false,

    captainChoice: null,

    voteResult: null,

    lifelineNumber: 0,

    customMode: false,

    gameOver: false
};


/* =========================================================
   SCREEN CONTROL
   ========================================================= */

function showScreen(id) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const screen = $(id);

    if (screen) {
        screen.classList.add("active");
    }

    window.scrollTo(0, 0);
}


/* =========================================================
   PLAYER HELPERS
   ========================================================= */

function getPlayer(id) {
    return game.players.find(p => p.id === id);
}

function living() {
    return game.players.filter(alive);
}

function livingHumans() {
    return living().filter(p => roleTeam(p) === "Human");
}

function livingHostiles() {
    return living().filter(p => roleTeam(p) === "Hostile");
}

function livingNeutrals() {
    return living().filter(p => roleTeam(p) === "Neutral");
}


/* =========================================================
   TEAM / ROLE HELPERS
   ========================================================= */

function roleTeam(player) {

    if (!player) {
        return "Human";
    }

    if (
        player.role === "infected"
    ) {
        return "Human";
    }

    if (
        player.role === "diseased" ||
        player.role === "parasite"
    ) {
        return "Hostile";
    }

    return ROLE_DATA[player.role]?.team || "Human";
}

function isHostile(player) {
    return roleTeam(player) === "Hostile";
}

function isNeutral(player) {
    return roleTeam(player) === "Neutral";
}

function isHuman(player) {
    return roleTeam(player) === "Human";
}

function teamClass(team) {

    if (team === "Hostile") {
        return "hostile";
    }

    if (team === "Neutral") {
        return "neutral";
    }

    return "human";
}


/* =========================================================
   DISPLAY NAMES
   ========================================================= */

function displayName(id) {

    if (!game.displaySwap) {
        return getPlayer(id)?.name || `Player ${id}`;
    }

    const index = game.displaySwap.indexOf(id);

    if (index === -1) {
        return getPlayer(id)?.name || `Player ${id}`;
    }

    const otherId =
        game.displaySwap[index === 0 ? 1 : 0];

    return getPlayer(otherId)?.name || `Player ${otherId}`;
}


/* =========================================================
   REAL NAME
   ========================================================= */

function realName(id) {
    return getPlayer(id)?.name || `Player ${id}`;
}


/* =========================================================
   HOSTILE TEAMMATES
   ========================================================= */

function hostileTeammates(player) {

    return living().filter(other =>
        other.id !== player.id &&
        isHostile(other)
    );
}


/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(actor = null, excludeId = null) {

    return living()
        .filter(p => {

            if (p.id === excludeId) {
                return false;
            }

            /*
             * Hostiles normally cannot target known Hostile
             * teammates.
             *
             * Trickster exception:
             * If a displayed identity is swapped, the hostile
             * may accidentally target the actual hostile player.
             */

            if (
                actor &&
                roleTeam(actor) === "Hostile" &&
                isHostile(p) &&
                !(
                    game.displaySwap &&
                    game.displaySwap.includes(p.id)
                )
            ) {
                return false;
            }

            return true;
        })
        .map(p => ({
            id: p.id,
            label: displayName(p.id)
        }));
}


/* =========================================================
   BUTTON HTML
   ========================================================= */

function button(label, value, cls = "") {

    return `
        <button
            type="button"
            class="${cls}"
            data-value="${esc(value)}"
        >
            ${esc(label)}
        </button>
    `;
}


/* =========================================================
   SETUP
   ========================================================= */

function createPlayers() {

    const count =
        Number($("playerCount").value);

    game.players = [];

    for (let i = 1; i <= count; i++) {

        game.players.push({
            id: i,
            name: `Player ${i}`,

            role: "survivor",
            originalRole: null,

            alive: true,

            infectionRound: null,
            hasInfected: false,

            acted: false,

            vote: null
        });
    }

    game.randomRoles =
        Array(count).fill("random");

    game.randomisedRoles = false;

    renderSetupPlayers();
}


function renderSetupPlayers() {

    const container = $("playersSetup");

    if (!container) {
        return;
    }

    container.innerHTML =
        game.players.map((p, index) => {

            return `
                <div class="player-setup-row">

                    <div class="player-setup-name">
                        ${esc(p.name)}
                    </div>

                    <select
                        class="role-select"
                        data-index="${index}"
                    >
                        <option value="random">
                            🎲 RANDOM
                        </option>

                        ${getAvailableStartingRoles()
                            .map(role => `
                                <option value="${role}">
                                    ${ROLE_DATA[role].icon}
                                    ${ROLE_DATA[role].name}
                                </option>
                            `)
                            .join("")}

                    </select>

                </div>
            `;
        })
        .join("");

    bindSetupSelects();

    updatePlayerCountStatus();
}


/* =========================================================
   AVAILABLE STARTING ROLES
   ========================================================= */

function getAvailableStartingRoles() {

    const enabled =
        game.customRoles || {

            alien: true,
            saboteur: true,
            silencer: true,
            parasite: true,

            engineer: true,
            survivor: true,
            medic: true,
            detective: true,
            guard: true,
            scientist: true,
            radio: true,
            captain: true,
            judge: true,

            jester: false,
            king: false,
            trickster: false
        };

    return [
        ...HOSTILE_ROLES,
        "engineer",
        ...HUMAN_ROLES,
        ...NEUTRAL_ROLES,
        ...CONCEPT_ROLES
    ].filter(role => enabled[role]);
}


/* =========================================================
   SETUP SELECTS
   ========================================================= */

function bindSetupSelects() {

    document.querySelectorAll(".role-select").forEach(select => {

        select.onchange = () => {

            const i =
                Number(select.dataset.index);

            const value =
                select.value;

            if (value !== "random") {

                game.randomisedRoles = true;

                game.randomRoles[i] = value;

                /*
                 * Return the visible dropdown to RANDOM.
                 * The actual manually selected role stays
                 * hidden in game.randomRoles.
                 */

                select.value = "random";

                select.classList.add("random-hidden");
            }
        };
    });
}


/* =========================================================
   PLAYER COUNT
   ========================================================= */

function updatePlayerCountStatus() {

    const count =
        Number($("playerCount").value);

    const status =
        $("playerCountStatus");

    if (!status) {
        return;
    }

    const hostileCount =
        HOSTILE_COUNT[count];

    status.textContent =
        `PLAYERS: ${count} / ${count} • HOSTILES: ${hostileCount}`;
}


/* =========================================================
   RANDOM ROLE SELECTION
   ========================================================= */

function weightedPick(roles, weights) {

    let total = 0;

    roles.forEach(role => {
        total += weights[role] || 0;
    });

    let random =
        Math.random() * total;

    for (const role of roles) {

        random -= weights[role] || 0;

        if (random <= 0) {
            return role;
        }
    }

    return roles[roles.length - 1];
}


function randomiseRoles() {

    const count =
        game.players.length;

    const hostileCount =
        HOSTILE_COUNT[count];

    if (!hostileCount) {
        return;
    }

    const enabled =
        game.customRoles || {

            alien: true,
            saboteur: true,
            silencer: true,
            parasite: true,

            engineer: true,
            survivor: true,
            medic: true,
            detective: true,
            guard: true,
            scientist: true,
            radio: true,
            captain: true,
            judge: true,

            jester: false,
            king: false,
            trickster: false
        };


    /*
     * Start with guaranteed Engineer.
     */

    const roles = Array(count).fill("survivor");

    const availableHostiles =
        HOSTILE_ROLES.filter(r => enabled[r]);

    /*
     * Ensure enough hostile roles are available.
     */

    if (availableHostiles.length < hostileCount) {

        alert(
            "Not enough Hostile roles are enabled for this player count."
        );

        return;
    }


    /*
     * Choose unique Hostile roles.
     */

    let hostilePool =
        shuffle(availableHostiles);

    const selectedHostiles =
        hostilePool.slice(0, hostileCount);


    /*
     * Pick positions.
     */

    const positions =
        shuffle(
            Array.from(
                { length: count },
                (_, i) => i
            )
        );

    let positionIndex = 0;

    selectedHostiles.forEach(role => {

        roles[
            positions[positionIndex++]
        ] = role;
    });


    /*
     * Engineer is guaranteed.
     */

    let engineerPosition =
        positions[positionIndex++];

    /*
     * Make sure Engineer doesn't replace a Hostile.
     */

    while (
        roles[engineerPosition] !== "survivor"
    ) {

        engineerPosition =
            Math.floor(Math.random() * count);
    }

    roles[engineerPosition] = "engineer";


    /*
     * Human roles.
     *
     * No duplicates.
     * Weights renormalise automatically.
     */

    const remainingHumanCount =
        count - hostileCount - 1;

    let humanPool =
        HUMAN_ROLES.filter(
            r => enabled[r]
        );

    if (humanPool.length < remainingHumanCount) {

        alert(
            "Not enough Human roles are enabled for this player count."
        );

        return;
    }

    const humanRoles = [];

    for (
        let i = 0;
        i < remainingHumanCount;
        i++
    ) {

        const pick =
            weightedPick(
                humanPool,
                HUMAN_WEIGHTS
            );

        humanRoles.push(pick);

        humanPool =
            humanPool.filter(
                r => r !== pick
            );
    }


    /*
     * Put Humans into remaining positions.
     */

    for (const role of humanRoles) {

        let position =
            Math.floor(Math.random() * count);

        while (
            roles[position] !== "survivor"
        ) {
            position =
                Math.floor(Math.random() * count);
        }

        roles[position] = role;
    }


    /*
     * Any remaining spaces become Survivor.
     */

    game.randomRoles = roles;

    game.randomisedRoles = true;


    /*
     * Update visible dropdowns.
     */

    document
        .querySelectorAll(".role-select")
        .forEach(select => {

            select.value = "random";
            select.classList.add("random-hidden");
        });

    updatePlayerCountStatus();
}


/* =========================================================
   VALIDATE SETUP
   ========================================================= */

function validateSetup() {

    const count =
        game.players.length;

    const roles =
        game.randomRoles;

    if (
        roles.length !== count ||
        roles.some(r => !r || r === "random")
    ) {
        alert(
            "Please randomise the roles or manually select every role."
        );

        return false;
    }

    const hostileCount =
        roles.filter(role =>
            HOSTILE_ROLES.includes(role)
        ).length;

    if (
        hostileCount !==
        HOSTILE_COUNT[count]
    ) {
        alert(
            `This game needs exactly ${HOSTILE_COUNT[count]} Hostile role(s).`
        );

        return false;
    }

    if (
        roles.filter(r => r === "engineer").length !== 1
    ) {
        alert(
            "Engineer must always be present exactly once."
        );

        return false;
    }

    return true;
}


/* =========================================================
   APPLY ROLES
   ========================================================= */

function applyRoles() {

    game.players.forEach((p, i) => {

        p.role =
            game.randomRoles[i];

        p.originalRole =
            p.role;

        p.alive = true;

        p.infectionRound = null;
        p.hasInfected = false;

        p.acted = false;
        p.vote = null;
    });
}


/* =========================================================
   RESET GAME
   ========================================================= */

function resetGameState() {

    game.round = 1;

    game.stage = 1;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    game.roundStartAliveIds = [];

    game.reactionQueue = [];
    game.reactionIndex = 0;

    game.reactionInfo = {};

    game.selectedAction = null;
    game.selectedVote = null;

    game.currentVoterIndex = 0;

    game.votes = {};

    game.interactionLog = {};
    game.roundInteractions = {};

    game.blockedPlayers =
        new Set();

    game.protectedPlayers =
        new Set();

    game.silencedUntil = {};

    game.displaySwap = null;

    game.tricksterUsed = false;

    game.judgeUsed = false;

    game.captainChoice = null;

    game.voteResult = null;

    game.lifelineNumber = 0;

    game.gameOver = false;
}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

    if (!validateSetup()) {
        return;
    }

    resetGameState();

    applyRoles();

    beginRound();
}


/* =========================================================
   BEGIN ROUND
   ========================================================= */

function beginRound() {

    if (checkVictory()) {
        return;
    }

    /*
     * Snapshot who is alive at the START of the round.
     *
     * This is important because these exact players
     * receive the Reaction Round even if they die later.
     */

    game.roundStartAliveIds =
        living().map(p => p.id);

    game.reactionQueue =
        [...game.roundStartAliveIds];

    game.reactionIndex = 0;

    game.reactionInfo = {};

    game.selectedAction = null;

    game.selectedVote = null;

    game.votes = {};

    game.currentVoterIndex = 0;

    game.roundInteractions = {};

    game.blockedPlayers =
        new Set();

    game.protectedPlayers =
        new Set();


    /*
     * Decrease silence timers.
     */

    for (const id of Object.keys(game.silencedUntil)) {

        if (
            game.silencedUntil[id] <
            game.round
        ) {
            delete game.silencedUntil[id];
        }
    }


    startAbilityRound();
}


/* =========================================================
   ABILITY ROUND
   ========================================================= */

function startAbilityRound() {

    showNextAbilityPlayer();
}


function showNextAbilityPlayer() {

    /*
     * Ability players are ONLY people alive now.
     */

    const queue =
        living().map(p => p.id);

    if (!queue.length) {
        endAbilityRound();
        return;
    }

    const player =
        getPlayer(queue[0]);

    /*
     * Store a temporary queue on game.
     */

    game.abilityQueue = queue;

    game.abilityIndex = 0;

    showAbilityForPlayer();
}


function showAbilityForPlayer() {

    const id =
        game.abilityQueue[game.abilityIndex];

    const player =
        getPlayer(id);

    if (!player || !player.alive) {

        advanceAbilityPlayer();
        return;
    }

    $("passPlayerName").textContent =
        player.name;

    $("passRound").textContent =
        `ROUND ${game.round}`;

    game.currentAbilityPlayer =
        id;

    showScreen("passScreen");
}


function advanceAbilityPlayer() {

    game.abilityIndex++;

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        endAbilityRound();

        return;
    }

    showAbilityForPlayer();
}


/* =========================================================
   ROLE SCREEN
   ========================================================= */

function showRoleScreen(player) {

    $("rolePlayerName").textContent =
        player.name;

    $("roleIcon").textContent =
        ROLE_DATA[player.role]?.icon || "👤";

    $("roleName").textContent =
        ROLE_DATA[player.role]?.name ||
        player.role;

    const team =
        roleTeam(player);

    $("roleName").className =
        `role-title ${teamClass(team)}`;

    $("roleTeam").textContent =
        `${team.toUpperCase()} TEAM`;

    $("roleTeam").className =
        `team-badge ${teamClass(team)}`;

    $("roleDescription").textContent =
        ROLE_DATA[player.role]?.desc ||
        "";

    const hostileList =
        $("hostileList");

    if (
        team === "Hostile" &&
        player.role !== "infected"
    ) {

        const teammates =
            hostileTeammates(player);

        if (teammates.length) {

            hostileList.classList.remove("hidden");

            hostileList.innerHTML =
                `<strong>HOSTILE TEAMMATES:</strong><br>` +
                teammates
                    .map(p =>
                        `${ROLE_DATA[p.role]?.icon || ""} ${esc(p.name)}`
                    )
                    .join("<br>");

        } else {

            hostileList.classList.add("hidden");
            hostileList.innerHTML = "";
        }

    } else {

        hostileList.classList.add("hidden");
        hostileList.innerHTML = "";
    }

    showScreen("roleScreen");
}


/* =========================================================
   SHOW CURRENT ROLE
   ========================================================= */

function handleRoleScreenContinue() {

    const id =
        game.currentAbilityPlayer;

    const player =
        getPlayer(id);

    if (!player) {
        return;
    }

    renderActionForPlayer(player);
}


/* =========================================================
   ACTION RENDERING
   ========================================================= */

function renderActionForPlayer(player) {

    game.selectedAction = null;

    $("actionOptions").innerHTML = "";

    $("confirmActionButton").disabled = false;

    const role = player.role;

    /*
     * No ability.
     */

    if (
        role === "survivor" ||
        role === "jester" ||
        role === "king" ||
        role === "trickster"
    ) {

        if (
            role === "trickster" &&
            !game.tricksterUsed
        ) {

            $("actionTitle").textContent =
                "🎭 TRICKSTER";

            $("actionDescription").textContent =
                "Choose two living players to swap their displayed identities.";

            renderTricksterChoices(player);

        } else {

            $("actionTitle").textContent =
                "NO ACTION";

            $("actionDescription").textContent =
                "You have no action this round.";

            $("actionOptions").innerHTML =
                `<p style="text-align:center;color:#9ba9b8;">
                    Continue when ready.
                </p>`;
        }

        showScreen("actionScreen");

        return;
    }


    /*
     * Diseased cannot act.
     */

    if (role === "diseased") {

        $("actionTitle").textContent =
            "☣️ NO ACTION";

        $("actionDescription").textContent =
            "Diseased players cannot use an ability.";

        showScreen("actionScreen");

        return;
    }


    /*
     * Power offline disables abilities except Engineer.
     */

    if (
        !game.systems.power &&
        role !== "engineer"
    ) {

        $("actionTitle").textContent =
            "⚡ POWER OFFLINE";

        $("actionDescription").textContent =
            "Your ability is disabled while Power is offline.";

        showScreen("actionScreen");

        return;
    }


    switch (role) {

        case "alien":
            renderAlienAction(player);
            break;

        case "saboteur":
            renderSaboteurAction(player);
            break;

        case "silencer":
            renderSilencerAction(player);
            break;

        case "parasite":
            renderParasiteAction(player);
            break;

        case "engineer":
            renderEngineerAction(player);
            break;

        case "scientist":
            renderScientistChoices(player);
            break;

        case "detective":
            renderDetectiveAction(player);
            break;

        case "medic":
            renderMedicAction(player);
            break;

        case "captain":

            $("actionTitle").textContent =
                "👨‍✈️ CAPTAIN";

            $("actionDescription").textContent =
                "You have no normal action. If the vote ties, you may break the tie.";

            break;

        case "guard":
            renderGuardAction(player);
            break;

        case "radio":
            renderRadioAction(player);
            break;

        case "judge":

            $("actionTitle").textContent =
                "⚖️ JUDGE";

            $("actionDescription").textContent =
                game.judgeUsed
                    ? "Your Judge ability has already been used."
                    : "Your ability is used only if a Captain attempts a tie-breaker.";

            break;

        default:

            $("actionTitle").textContent =
                "NO ACTION";

            $("actionDescription").textContent =
                "You have no action this round.";
    }

    showScreen("actionScreen");
}


/* =========================================================
   ALIEN
   ========================================================= */

function renderAlienAction(player) {

    const saboteurAlive =
        living().some(
            p => p.role === "saboteur"
        );

    $("actionTitle").textContent =
        "👽 ALIEN";

    if (saboteurAlive) {

        $("actionDescription").textContent =
            "A living Saboteur exists, so you may only kill.";

        $("actionOptions").innerHTML =
            targetOptions(player, player.id)
                .map(o => button(
                    `💀 KILL ${o.label}`,
                    JSON.stringify({
                        type: "kill",
                        target: o.id
                    })
                ))
                .join("");

    } else {

        $("actionDescription").textContent =
            "Choose Kill or Sabotage.";

        $("actionOptions").innerHTML = `

            ${button("💀 KILL", "kill-mode")}

            ${button("⚠️ SABOTAGE", "sabotage-mode")}

        `;

        $("actionOptions")
            .querySelectorAll("button")
            .forEach(b => {

                b.onclick = () => {

                    const mode =
                        b.dataset.value;

                    if (mode === "kill-mode") {

                        $("actionOptions").innerHTML =
                            targetOptions(player, player.id)
                                .map(o =>
                                    button(
                                        `💀 KILL ${o.label}`,
                                        JSON.stringify({
                                            type: "kill",
                                            target: o.id
                                        })
                                    )
                                )
                                .join("");

                        bindActionButtons();

                    }

                    if (mode === "sabotage-mode") {

                        renderSabotageTarget(
                            player,
                            "alien"
                        );
                    }
                };
            });

        return;
    }

    bindActionButtons();
}


/* =========================================================
   SABOTEUR
   ========================================================= */

function renderSaboteurAction(player) {

    $("actionTitle").textContent =
        "😈 SABOTEUR";

    $("actionDescription").textContent =
        "Choose 1 ship system to sabotage.";

    renderSabotageTarget(
        player,
        "saboteur"
    );
}


function renderSabotageTarget(player, source) {

    $("actionOptions").innerHTML =
        Object.keys(game.systems)
            .map(system => {

                const label =
                    systemDisplayName(system);

                return button(
                    `⚠️ ${label}`,
                    JSON.stringify({
                        type: "sabotage",
                        target: system,
                        source
                    })
                );
            })
            .join("");

    bindActionButtons();
}


/* =========================================================
   SILENCER
   ========================================================= */

function renderSilencerAction(player) {

    $("actionTitle").textContent =
        "🔇 SILENCER";

    $("actionDescription").textContent =
        "Choose 1 living player to silence for 2 rounds.";

    $("actionOptions").innerHTML =
        targetOptions(player, player.id)
            .map(o =>
                button(
                    `🔇 ${o.label}`,
                    JSON.stringify({
                        type: "silence",
                        target: o.id
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   PARASITE
   ========================================================= */

function renderParasiteAction(player) {

    $("actionTitle").textContent =
        "🦠 PARASITE";

    if (player.hasInfected) {

        $("actionDescription").textContent =
            "You have already used your infection ability.";

        return;
    }

    $("actionDescription").textContent =
        "Choose 1 living player to infect.";

    $("actionOptions").innerHTML =
        targetOptions(player, player.id)
            .map(o =>
                button(
                    `🦠 INFECT ${o.label}`,
                    JSON.stringify({
                        type: "infect",
                        target: o.id
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   ENGINEER
   ========================================================= */

function renderEngineerAction(player) {

    $("actionTitle").textContent =
        "🔧 ENGINEER";

    const offline =
        Object.keys(game.systems)
            .filter(k => !game.systems[k]);

    if (!offline.length) {

        $("actionDescription").textContent =
            "All ship systems are online.";

        return;
    }

    $("actionDescription").textContent =
        "Choose 1 offline system to repair.";

    $("actionOptions").innerHTML =
        offline
            .map(system =>
                button(
                    `🔧 REPAIR ${systemDisplayName(system)}`,
                    JSON.stringify({
                        type: "repair",
                        target: system
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   SCIENTIST
   ========================================================= */

function renderScientistChoices(player) {

    $("actionTitle").textContent =
        "🧪 SCIENTIST";

    $("actionDescription").textContent =
        "Choose a living player to check. If they are Infected or Diseased, you may then choose whether to cure them.";

    $("actionOptions").innerHTML =
        targetOptions(player, player.id)
            .map(o =>
                button(
                    `🔬 CHECK ${o.label}`,
                    o.id
                )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(b => {

            b.onclick = () => {

                const t =
                    getPlayer(
                        Number(b.dataset.value)
                    );

                if (!t) {
                    return;
                }

                game.selectedAction =
                    JSON.stringify({
                        type: "science",
                        target: t.id,
                        mode: "check"
                    });

                const canCure =
                    t.role === "infected" ||
                    t.role === "diseased";

                $("actionOptions").innerHTML = `

                    ${button("🔬 CHECK", "check")}

                    ${
                        canCure
                            ? button("💉 CURE", "cure")
                            : ""
                    }

                `;

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(x => {

                        x.onclick = () => {

                            const mode =
                                x.dataset.value;

                            game.selectedAction =
                                JSON.stringify({
                                    type: "science",
                                    target: t.id,
                                    mode
                                });

                            $("actionOptions")
                                .querySelectorAll("button")
                                .forEach(y =>
                                    y.classList.remove(
                                        "selected"
                                    )
                                );

                            x.classList.add("selected");
                        };
                    });
            };
        });
}


/* =========================================================
   DETECTIVE
   ========================================================= */

function renderDetectiveAction(player) {

    $("actionTitle").textContent =
        "🕵️ DETECTIVE";

    $("actionDescription").textContent =
        "Choose a living player. You will learn what they interacted with last round.";

    $("actionOptions").innerHTML =
        targetOptions(player, player.id)
            .map(o =>
                button(
                    `🕵️ INVESTIGATE ${o.label}`,
                    JSON.stringify({
                        type: "detect",
                        target: o.id
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   MEDIC
   ========================================================= */

function renderMedicAction(player) {

    $("actionTitle").textContent =
        "🩺 MEDIC";

    $("actionDescription").textContent =
        "Choose 1 living player to protect from a kill.";

    $("actionOptions").innerHTML =
        targetOptions(player)
            .map(o =>
                button(
                    `🛡️ PROTECT ${o.label}`,
                    JSON.stringify({
                        type: "protect",
                        target: o.id
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   GUARD
   ========================================================= */

function renderGuardAction(player) {

    $("actionTitle").textContent =
        "🛡️ GUARD";

    $("actionDescription").textContent =
        "Choose 1 living player whose role ability will be blocked this round.";

    $("actionOptions").innerHTML =
        targetOptions(player, player.id)
            .map(o =>
                button(
                    `🛡️ BLOCK ${o.label}`,
                    JSON.stringify({
                        type: "block",
                        target: o.id
                    })
                )
            )
            .join("");

    bindActionButtons();
}


/* =========================================================
   RADIO
   ========================================================= */

function renderRadioAction(player) {

    $("actionTitle").textContent =
        "📻 RADIO OPERATOR";

    if (!game.systems.communications) {

        $("actionDescription").textContent =
            "Communications is offline. You cannot receive a message from Earth.";

        return;
    }

    $("actionDescription").textContent =
        "Receive your private message from Earth.";

    game.selectedAction =
        JSON.stringify({
            type: "radio"
        });
}


/* =========================================================
   TRICKSTER
   ========================================================= */

function renderTricksterChoices(player) {

    const targets =
        targetOptions(player);

    $("actionOptions").innerHTML =
        targets
            .map(o =>
                button(
                    `🎭 ${o.label}`,
                    o.id
                )
            )
            .join("");

    let first = null;

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(b => {

            b.onclick = () => {

                const id =
                    Number(b.dataset.value);

                if (first === null) {

                    first = id;

                    b.classList.add("selected");

                    $("actionDescription").textContent =
                        "Now choose the second player.";

                } else if (id !== first) {

                    game.selectedAction =
                        JSON.stringify({
                            type: "trickster",
                            a: first,
                            b: id
                        });

                    $("actionOptions")
                        .querySelectorAll("button")
                        .forEach(x =>
                            x.classList.remove(
                                "selected"
                            )
                        );

                    b.classList.add("selected");
                }
            };
        });
}


/* =========================================================
   ACTION BUTTON BINDING
   ========================================================= */

function bindActionButtons() {

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(b => {

            b.onclick = () => {

                game.selectedAction =
                    b.dataset.value;

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(x =>
                        x.classList.remove(
                            "selected"
                        )
                    );

                b.classList.add("selected");
            };
        });
}


/* =========================================================
   EXECUTE ACTION
   ========================================================= */

function executeCurrentAction() {

    const id =
        game.currentAbilityPlayer;

    const player =
        getPlayer(id);

    if (!player) {
        advanceAbilityPlayer();
        return;
    }

    /*
     * No action required.
     */

    if (
        !game.selectedAction &&
        (
            player.role === "survivor" ||
            player.role === "jester" ||
            player.role === "king" ||
            player.role === "captain" ||
            player.role === "judge" ||
            player.role === "diseased" ||
            player.role === "trickster"
        )
    ) {

        recordInteraction(
            player.id,
            "Nothing"
        );

        advanceAbilityPlayer();

        return;
    }


    if (!game.selectedAction) {

        recordInteraction(
            player.id,
            "Nothing"
        );

        advanceAbilityPlayer();

        return;
    }


    let action;

    try {
        action =
            JSON.parse(
                game.selectedAction
            );
    } catch {

        action = {
            type: "unknown"
        };
    }


    /*
     * Guard can block the actor.
     */

    if (
        game.blockedPlayers.has(player.id) &&
        player.role !== "engineer"
    ) {

        game.reactionInfo[player.id] =
            "Your ability was blocked this round.";

        recordInteraction(
            player.id,
            "Ability blocked"
        );

        advanceAbilityPlayer();

        return;
    }


    switch (action.type) {

        case "kill": {

            const target =
                getPlayer(action.target);

            if (
                target &&
                alive(target)
            ) {

                recordInteraction(
                    player.id,
                    target.name
                );

                if (
                    game.protectedPlayers.has(
                        target.id
                    )
                ) {

                    game.reactionInfo[player.id] =
                        `Your attack on ${target.name} was stopped.`;

                } else {

                    target.alive = false;

                    game.reactionInfo[player.id] =
                        `${target.name} is no longer alive.`;

                    game.reactionInfo[target.id] =
                        "You died during this round.";
                }
            }

            break;
        }


        case "sabotage": {

            const system =
                action.target;

            if (
                Object.prototype.hasOwnProperty.call(
                    game.systems,
                    system
                )
            ) {

                game.systems[system] = false;

                recordInteraction(
                    player.id,
                    systemDisplayName(system)
                );

                game.reactionInfo[player.id] =
                    `${systemDisplayName(system)} was sabotaged.`;
            }

            break;
        }


        case "silence": {

            const target =
                getPlayer(action.target);

            if (
                target &&
                alive(target)
            ) {

                game.silencedUntil[target.id] =
                    game.round + 2;

                recordInteraction(
                    player.id,
                    target.name
                );

                game.reactionInfo[player.id] =
                    `${target.name} has been silenced for 2 rounds.`;
            }

            break;
        }


        case "infect": {

            player.hasInfected = true;

            const target =
                getPlayer(action.target);

            if (
                target &&
                alive(target) &&
                !target.infectionRound &&
                !game.blockedPlayers.has(target.id)
            ) {

                target.infectionRound =
                    game.round;

                target.originalRole =
                    target.role;

                target.role =
                    "infected";

                target.hasInfected = false;

                recordInteraction(
                    player.id,
                    target.name
                );

                /*
                 * The infected player is NOT told
                 * their identity changed.
                 */

                game.reactionInfo[target.id] =
                    "You were infected this round.";

                game.reactionInfo[player.id] =
                    `${target.name} was infected.`;

            } else {

                recordInteraction(
                    player.id,
                    "Failed infection"
                );

                game.reactionInfo[player.id] =
                    "The infection failed.";
            }

            break;
        }


        case "repair": {

            const system =
                action.target;

            if (
                Object.prototype.hasOwnProperty.call(
                    game.systems,
                    system
                ) &&
                !game.systems[system]
            ) {

                game.systems[system] = true;

                recordInteraction(
                    player.id,
                    systemDisplayName(system)
                );

                game.reactionInfo[player.id] =
                    `${systemDisplayName(system)} was repaired.`;
            }

            break;
        }


        case "science": {

            const target =
                getPlayer(action.target);

            if (target) {

                const status =
                    ROLE_DATA[target.role]?.name ||
                    target.role;

                recordInteraction(
                    player.id,
                    target.name
                );

                if (
                    action.mode === "cure" &&
                    (
                        target.role === "infected" ||
                        target.role === "diseased"
                    )
                ) {

                    target.role =
                        "survivor";

                    target.infectionRound =
                        null;

                    target.hasInfected =
                        false;

                    game.reactionInfo[player.id] =
                        `SCIENCE: ${target.name} was cured and is now a Survivor.`;

                    if (
                        target.id !== player.id
                    ) {

                        game.reactionInfo[target.id] =
                            "You were cured by the Scientist and are now a Survivor.";
                    }

                } else {

                    game.reactionInfo[player.id] =
                        `SCIENCE: ${target.name} is ${status}.`;
                }
            }

            break;
        }


        case "detect": {

            const target =
                getPlayer(action.target);

            if (target) {

                recordInteraction(
                    player.id,
                    target.name
                );

                const previous =
                    game.interactionLog[target.id];

                if (previous) {

                    game.reactionInfo[player.id] =
                        `DETECTIVE: ${target.name} interacted with ${previous}.`;

                } else {

                    game.reactionInfo[player.id] =
                        `DETECTIVE: ${target.name} has no recorded interaction from the previous round.`;
                }
            }

            break;
        }


        case "protect": {

            const target =
                getPlayer(action.target);

            if (
                target &&
                alive(target)
            ) {

                game.protectedPlayers.add(
                    target.id
                );

                recordInteraction(
                    player.id,
                    target.name
                );

                game.reactionInfo[player.id] =
                    `${target.name} is protected this round.`;
            }

            break;
        }


        case "block": {

            const target =
                getPlayer(action.target);

            if (
                target &&
                alive(target)
            ) {

                game.blockedPlayers.add(
                    target.id
                );

                recordInteraction(
                    player.id,
                    target.name
                );

                game.reactionInfo[player.id] =
                    `${target.name}'s ability is blocked this round.`;
            }

            break;
        }


        case "radio": {

            recordInteraction(
                player.id,
                "Earth"
            );

            game.reactionInfo[player.id] =
                randomEarthMessage();

            break;
        }


        case "trickster": {

            if (
                !game.tricksterUsed &&
                action.a !== action.b
            ) {

                const a =
                    getPlayer(action.a);

                const b =
                    getPlayer(action.b);

                if (
                    a &&
                    b &&
                    alive(a) &&
                    alive(b)
                ) {

                    game.displaySwap = [
                        a.id,
                        b.id
                    ];

                    game.tricksterUsed = true;

                    recordInteraction(
                        player.id,
                        `${a.name} / ${b.name}`
                    );

                    game.reactionInfo[player.id] =
                        "The displayed identities of two players have been swapped.";
                }
            }

            break;
        }
    }


    advanceAbilityPlayer();
}


/* =========================================================
   ADVANCE ABILITY PLAYER
   ========================================================= */

function advanceAbilityPlayer() {

    game.abilityIndex++;

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        endAbilityRound();

        return;
    }

    showAbilityForPlayer();
}


/* =========================================================
   END ABILITY ROUND
   ========================================================= */

function endAbilityRound() {

    /*
     * Infection progression happens at the end of
     * the round, after all abilities.
     */

    progressInfections();

    /*
     * Check hostile victory before reaction.
     */

    if (checkVictory()) {
        return;
    }

    startReactionRound();
}


/* =========================================================
   INFECTION PROGRESSION
   ========================================================= */

function progressInfections() {

    for (const p of game.players) {

        if (
            !alive(p) ||
            !p.infectionRound
        ) {
            continue;
        }

        const age =
            game.round -
            p.infectionRound +
            1;


        /*
         * Stage 2:
         * Infected -> Diseased
         */

        if (
            age >= 2 &&
            p.role === "infected"
        ) {

            p.role =
                "diseased";

            game.reactionInfo[p.id] =
                "You are now DISEASED and on the Hostile Team.";
        }


        /*
         * Stage 3:
         * Diseased -> Parasite
         */

        else if (
            age >= 3 &&
            p.role === "diseased"
        ) {

            p.role =
                "parasite";

            p.hasInfected =
                false;

            p.infectionRound =
                null;

            game.reactionInfo[p.id] =
                "You are now a PARASITE and on the Hostile Team. You can infect one player.";
        }
    }
}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function startReactionRound() {

    /*
     * IMPORTANT:
     * Use the snapshot taken at the START of the round.
     *
     * Someone who died during this round still gets
     * their reaction screen.
     */

    game.reactionQueue =
        [...game.roundStartAliveIds];

    game.reactionIndex = 0;

    showNextReactionPlayer();
}


function showNextReactionPlayer() {

    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {

        endReactionRound();

        return;
    }

    const id =
        game.reactionQueue[
            game.reactionIndex
        ];

    const player =
        getPlayer(id);

    if (!player) {

        game.reactionIndex++;

        showNextReactionPlayer();

        return;
    }

    $("reactionRound").textContent =
        `REACTION — ROUND ${game.round}`;

    $("reactionStage").textContent =
        `STAGE ${Math.min(game.stage, 10)} / 10`;

    $("reactionPlayerName").textContent =
        player.name;

    showScreen("reactionScreen");
}


/* =========================================================
   REACTION RESULT
   ========================================================= */

function showReactionResult() {

    const id =
        game.reactionQueue[
            game.reactionIndex
        ];

    const player =
        getPlayer(id);

    if (!player) {
        return;
    }

    let message =
        game.reactionInfo[player.id];

    if (!message) {

        if (!player.alive) {

            message =
                "You died during this round.";

        } else {

            message =
                "Nothing happened to you this round.";
        }
    }

    $("reactionResultMessage").textContent =
        message;

    showScreen("reactionResultScreen");
}


/* =========================================================
   ADVANCE REACTION
   ========================================================= */

function advanceReaction() {

    game.reactionIndex++;

    showNextReactionPlayer();
}


/* =========================================================
   END REACTION
   ========================================================= */

function endReactionRound() {

    /*
     * Store this round's interactions for Detective.
     */

    game.interactionLog =
        {
            ...game.roundInteractions
        };


    /*
     * Engine stage progression.
     */

    if (game.systems.engines) {

        game.stage++;

    }


    /*
     * Check Human / Neutral / Hostile victory.
     */

    if (checkVictory()) {
        return;
    }


    /*
     * Earth lifeline every 3 rounds.
     */

    if (
        game.round % 3 === 0
    ) {

        showLifeline();

        return;
    }


    startDiscussion();
}


/* =========================================================
   DISCUSSION
   ========================================================= */

function startDiscussion() {

    $("discussionTitle").textContent =
        "DISCUSSION";

    $("discussionRound").textContent =
        `ROUND ${game.round}`;

    $("discussionStage").textContent =
        `STAGE ${Math.min(game.stage, 10)} / 10`;

    const results =
        game.players
            .map(p => {

                let state =
                    p.alive
                        ? "ALIVE"
                        : "OUT";

                return `
                    <div class="result-row">
                        <strong>${esc(p.name)}</strong>
                        — ${state}
                    </div>
                `;
            })
            .join("");

    $("roundResults").innerHTML =
        results;

    showScreen("discussionScreen");
}


/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {

    game.votes = {};

    game.currentVoterIndex = 0;

    /*
     * Trickster swap remains active through voting.
     */

    showNextVoter();
}


function showNextVoter() {

    const voters =
        living();

    if (
        game.currentVoterIndex >=
        voters.length
    ) {

        finishVoting();

        return;
    }

    const player =
        voters[game.currentVoterIndex];

    $("votingRound").textContent =
        `ROUND ${game.round}`;

    $("votingStage").textContent =
        `STAGE ${Math.min(game.stage, 10)} / 10`;

    $("voterName").textContent =
        player.name;

    game.currentVoter =
        player.id;

    const silenced =
        isSilenced(player);

    const warning =
        $("votingSilenced");

    if (silenced) {

        warning.classList.remove("hidden");

    } else {

        warning.classList.add("hidden");
    }


    const options =
        living()
            .filter(
                target =>
                    target.id !== player.id
            );

    let html =
        options
            .map(target =>
                button(
                    `🗳️ ${displayName(target.id)}`,
                    target.id
                )
            )
            .join("");

    html +=
        button(
            "⏭️ SKIP",
            "skip",
            "vote-skip"
        );

    $("voteOptions").innerHTML =
        html;


    /*
     * Silenced player cannot vote.
     */

    if (silenced) {

        game.selectedVote = "skip";

        $("voteOptions")
            .querySelectorAll("button")
            .forEach(b =>
                b.disabled = true
            );

    } else {

        game.selectedVote = null;

        $("voteOptions")
            .querySelectorAll("button")
            .forEach(b => {

                b.onclick = () => {

                    game.selectedVote =
                        b.dataset.value;

                    $("voteOptions")
                        .querySelectorAll("button")
                        .forEach(x =>
                            x.classList.remove(
                                "selected"
                            )
                        );

                    b.classList.add("selected");
                };
            });
    }

    showScreen("votingScreen");
}


/* =========================================================
   SILENCED CHECK
   ========================================================= */

function isSilenced(player) {

    return (
        player &&
        game.silencedUntil[player.id] &&
        game.silencedUntil[player.id] >=
            game.round
    );
}


/* =========================================================
   CONFIRM VOTE
   ========================================================= */

function confirmVote() {

    const player =
        getPlayer(game.currentVoter);

    if (!player) {
        return;
    }

    if (
        isSilenced(player)
    ) {

        game.votes[player.id] =
            "skip";

    } else {

        if (
            game.selectedVote === null
        ) {

            alert(
                "Choose a player or Skip."
            );

            return;
        }

        game.votes[player.id] =
            game.selectedVote;
    }

    game.currentVoterIndex++;

    showNextVoter();
}


/* =========================================================
   FINISH VOTING
   ========================================================= */

function finishVoting() {

    const counts = {};

    for (const vote of Object.values(game.votes)) {

        if (
            vote === "skip"
        ) {
            continue;
        }

        counts[vote] =
            (counts[vote] || 0) + 1;
    }


    const values =
        Object.values(counts);

    if (!values.length) {

        game.voteResult = {
            type: "none"
        };

        showVoteResult();

        return;
    }


    const highest =
        Math.max(...values);

    const tied =
        Object.keys(counts)
            .filter(
                id => counts[id] === highest
            )
            .map(Number);


    if (tied.length > 1) {

        handleTie(tied);

        return;
    }


    ejectPlayer(tied[0]);
}


/* =========================================================
   HANDLE TIE
   ========================================================= */

function handleTie(tiedIds) {

    const captain =
        living().find(
            p => p.role === "captain"
        );

    if (
        captain &&
        game.systems.power
    ) {

        game.captainChoice = tiedIds;

        showCaptainTie();

        return;
    }


    /*
     * No Captain or Power offline:
     * no ejection.
     */

    game.voteResult = {
        type: "tie",
        tied: tiedIds
    };

    showVoteResult();
}


/* =========================================================
   CAPTAIN TIE SCREEN
   ========================================================= */

function showCaptainTie() {

    $("captainTieOptions").innerHTML =
        game.captainChoice
            .map(id =>
                button(
                    `EJECT ${displayName(id)}`,
                    id
                )
            )
            .join("");

    $("captainTieOptions")
        .querySelectorAll("button")
        .forEach(b => {

            b.onclick = () => {

                const target =
                    Number(b.dataset.value);

                game.captainChoice =
                    target;

                const judge =
                    living().find(
                        p => p.role === "judge"
                    );

                /*
                 * Judge can secretly cancel.
                 */

                if (
                    judge &&
                    !game.judgeUsed
                ) {

                    const useJudge =
                        confirm(
                            "Judge: cancel this Captain ejection?"
                        );

                    if (useJudge) {

                        game.judgeUsed =
                            true;

                        game.voteResult = {
                            type: "judge_cancel"
                        };

                        showVoteResult();

                        return;
                    }
                }

                ejectPlayer(target);
            };
        });

    showScreen("captainTieScreen");
}


/* =========================================================
   EJECT PLAYER
   ========================================================= */

function ejectPlayer(id) {

    const player =
        getPlayer(id);

    if (!player || !player.alive) {
        return;
    }

    player.alive = false;

    /*
     * Jester wins if normally voted out.
     */

    if (
        player.role === "jester"
    ) {

        game.voteResult = {
            type: "jester_win",
            player: id
        };

        showVoteResult();

        return;
    }


    game.voteResult = {
        type: "ejected",
        player: id
    };

    showVoteResult();
}


/* =========================================================
   VOTE RESULT
   ========================================================= */

function showVoteResult() {

    const result =
        game.voteResult;

    if (!result) {
        return;
    }

    if (
        result.type === "none"
    ) {

        $("voteResultMessage").textContent =
            "Nobody was ejected.";

    } else if (
        result.type === "tie"
    ) {

        $("voteResultMessage").textContent =
            `The vote was tied between ${
                result.tied
                    .map(id => realName(id))
                    .join(", ")
            }. Nobody was ejected.`;

    } else if (
        result.type === "judge_cancel"
    ) {

        $("voteResultMessage").textContent =
            "⚖️ The Judge cancelled the Captain's tie-breaker. Nobody was ejected.";

    } else if (
        result.type === "jester_win"
    ) {

        $("voteResultMessage").textContent =
            `🃏 ${realName(result.player)} was the Jester and won by being voted out.`;

    } else if (
        result.type === "ejected"
    ) {

        $("voteResultMessage").textContent =
            `🚪 ${realName(result.player)} was voted out.`;
    }

    showScreen("voteResultScreen");
}


/* =========================================================
   AFTER VOTE
   ========================================================= */

function afterVote() {

    /*
     * Trickster swap ends ONLY after voting and the
     * complete vote result has been resolved.
     */

    game.displaySwap = null;

    if (checkVictory()) {
        return;
    }

    showSystemsScreen();
}


/* =========================================================
   SYSTEMS SCREEN
   ========================================================= */

function showSystemsScreen() {

    $("systemsRound").textContent =
        `ROUND ${game.round}`;

    $("systemsStage").textContent =
        `STAGE ${Math.min(game.stage, 10)} / 10`;

    $("systemsList").innerHTML =
        Object.keys(game.systems)
            .map(system => {

                const online =
                    game.systems[system];

                return `
                    <div class="system-row">

                        <span class="system-name">
                            ${systemDisplayName(system)}
                        </span>

                        <span class="system-status ${
                            online
                                ? "system-online"
                                : "system-offline"
                        }">
                            ${
                                online
                                    ? "ONLINE"
                                    : "OFFLINE"
                            }
                        </span>

                    </div>
                `;
            })
            .join("");

    showScreen("systemsScreen");
}


/* =========================================================
   NEXT ROUND
   ========================================================= */

function nextRound() {

    /*
     * Human victory happens when Stage 10 has been
     * successfully completed.
     */

    if (
        game.stage > 10
    ) {

        checkVictory();

        return;
    }

    game.round++;

    beginRound();
}


/* =========================================================
   LIFELINES
   ========================================================= */

function showLifeline() {

    game.lifelineNumber++;

    $("lifelineTitle").textContent =
        `📡 EARTH LIFELINE #${game.lifelineNumber}`;

    if (
        game.systems.communications
    ) {

        $("lifelineMessage").textContent =
            generateLifeline();

    } else {

        $("lifelineMessage").textContent =
            "COMMUNICATIONS IS OFFLINE. THIS LIFELINE HAS BEEN LOST PERMANENTLY.";
    }

    showScreen("lifelineScreen");
}


function generateLifeline() {

    const options = [];

    if (
        livingHostiles().length >= 1
    ) {
        options.push(
            "There is an Alien aboard."
        );
    }

    if (
        livingHostiles().length > 1
    ) {
        options.push(
            "There is more than 1 Alien aboard."
        );
    }

    if (
        living().some(
            p => p.role === "saboteur"
        )
    ) {
        options.push(
            "There is a Saboteur."
        );
    }

    if (
        living().some(
            p => p.role === "silencer"
        )
    ) {
        options.push(
            "There is a Silencer."
        );
    }

    const hostileCount =
        livingHostiles().length;

    if (
        hostileCount === 2
    ) {
        options.push(
            "Exactly 2 hostile roles are alive."
        );
    }

    if (
        hostileCount === 3
    ) {
        options.push(
            "Exactly 3 hostile roles are alive."
        );
    }

    if (
        living().some(
            p => p.role === "engineer"
        )
    ) {
        options.push(
            "Engineer is still alive."
        );
    }

    const specialHumans = [
        "captain",
        "detective",
        "medic",
        "guard"
    ];

    for (const role of specialHumans) {

        if (
            living().some(
                p => p.role === role
            )
        ) {

            options.push(
                `${ROLE_DATA[role].name} is aboard.`
            );
        }
    }

    options.push(
        "A ship system was sabotaged."
    );

    options.push(
        "A ship system was repaired."
    );

    const clue =
        randomClueWithHostiles();

    if (clue) {
        options.push(clue);
    }

    return rand(options);
}


function randomClueWithHostiles() {

    const hostiles =
        livingHostiles();

    if (
        hostiles.length < 1
    ) {
        return null;
    }

    const players =
        shuffle(
            living()
        ).slice(
            0,
            Math.min(
                3,
                living().length
            )
        );

    if (
        !players.some(
            p => isHostile(p)
        )
    ) {

        players[
            Math.floor(
                Math.random() *
                players.length
            )
        ] =
            rand(hostiles);
    }

    const hostileInList =
        players.find(
            p => isHostile(p)
        );

    if (!hostileInList) {
        return null;
    }

    return (
        "⚠️ ONE OF THESE PLAYERS IS HOSTILE: " +
        players
            .map(p => p.name)
            .join(", ")
    );
}


/* =========================================================
   RADIO MESSAGES
   ========================================================= */

function randomEarthMessage() {

    const messages = [

        "Earth reports unusual activity aboard the ship.",

        "Earth says the ship's systems are being monitored.",

        "Earth reports that the crew must stay alert.",

        "Earth has detected suspicious activity.",

        "Earth reminds you that Communications must remain online.",

        "Earth reports that the ship is still on course.",

        "Earth warns that someone aboard may be hostile."
    ];

    return rand(messages);
}


/* =========================================================
   SYSTEM DISPLAY
   ========================================================= */

function systemDisplayName(system) {

    const names = {

        engines: "🚀 ENGINES",

        o2: "🫁 O2",

        communications: "📡 COMMUNICATIONS",

        power: "⚡ POWER"
    };

    return names[system] || system;
}


/* =========================================================
   INTERACTION LOG
   ========================================================= */

function recordInteraction(playerId, target) {

    game.roundInteractions[playerId] =
        target;
}


/* =========================================================
   VICTORY CHECK
   ========================================================= */

function checkVictory() {

    if (game.gameOver) {
        return true;
    }

    const alivePlayers =
        living();

    const hostiles =
        alivePlayers.filter(
            p => roleTeam(p) === "Hostile"
        );

    const others =
        alivePlayers.filter(
            p => roleTeam(p) !== "Hostile"
        );


    /*
     * Hostiles win if they equal or outnumber
     * everyone else alive.
     */

    if (
        hostiles.length > 0 &&
        hostiles.length >= others.length
    ) {

        endGame(
            "HOSTILES WIN",
            "The Hostile Team has gained control of the ship."
        );

        return true;
    }


    /*
     * Survivor King:
     * wins independently if one of final 2.
     */

    if (
        alivePlayers.length <= 2 &&
        alivePlayers.some(
            p => p.role === "king"
        )
    ) {

        const king =
            alivePlayers.find(
                p => p.role === "king"
            );

        endGame(
            "SURVIVOR KING WINS",
            `${king.name} is one of the final 2 living players.`
        );

        return true;
    }


    /*
     * Earth reached.
     *
     * Neutral victory overrides Human victory.
     */

    if (
        game.stage > 10
    ) {

        const neutrals =
            alivePlayers.filter(
                p => roleTeam(p) === "Neutral"
            );

        if (
            neutrals.length
        ) {

            endGame(
                "NEUTRALS WIN",
                "A Neutral survived until the ship reached Earth."
            );

        } else {

            endGame(
                "HUMANS WIN",
                "The ship completed all 10 Engine stages and reached Earth."
            );
        }

        return true;
    }


    /*
     * If there are no Hostiles and the ship has not
     * reached Earth, the game continues.
     */

    return false;
}


/* =========================================================
   GAME OVER
   ========================================================= */

function endGame(title, message) {

    game.gameOver = true;

    $("gameOverTitle").textContent =
        title;

    $("gameOverMessage").textContent =
        message;


    $("finalPlayers").innerHTML =
        game.players
            .map(p => {

                const role =
                    ROLE_DATA[p.role] ||
                    ROLE_DATA[p.originalRole] ||
                    {};

                return `
                    <div class="final-player">

                        <span class="final-player-name">
                            ${esc(p.name)}
                            ${
                                p.alive
                                    ? ""
                                    : " 💀"
                            }
                        </span>

                        <span class="final-player-role">
                            ${role.icon || ""}
                            ${role.name || p.role}
                        </span>

                    </div>
                `;
            })
            .join("");


    showScreen("gameOverScreen");
}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

    const sections = [
        {
            title: "HOSTILE",
            roles: HOSTILE_ROLES
        },
        {
            title: "HUMAN",
            roles: [
                "engineer",
                ...HUMAN_ROLES
            ]
        },
        {
            title: "NEUTRAL",
            roles: NEUTRAL_ROLES
        },
        {
            title: "ROLE CONCEPT",
            roles: CONCEPT_ROLES
        },
        {
            title: "INFECTION / SUB-ROLES",
            roles: [
                "infected",
                "diseased",
                "parasite_stage"
            ]
        }
    ];


    $("roleGuideContent").innerHTML =
        sections
            .map(section => {

                return `
                    <div class="role-guide-section">

                        <h2>
                            ${esc(section.title)}
                        </h2>

                        ${section.roles
                            .map(role => {

                                const data =
                                    ROLE_DATA[role];

                                return `
                                    <div class="role-guide-card">

                                        <div class="role-guide-name">
                                            ${data.icon}
                                            ${esc(data.name)}
                                        </div>

                                        <div class="role-guide-team">
                                            ${esc(data.team)}
                                        </div>

                                        <div class="role-guide-description">
                                            ${esc(data.desc)}
                                        </div>

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   CUSTOM ROLE SETTINGS
   ========================================================= */

const DEFAULT_CUSTOM_ROLES = {

    alien: true,
    saboteur: true,
    silencer: true,
    parasite: true,

    engineer: true,

    survivor: true,
    medic: true,
    detective: true,
    guard: true,
    scientist: true,
    radio: true,
    captain: true,
    judge: true,

    jester: false,
    king: false,

    trickster: false
};


function renderCustomRoles() {

    const sections = [

        {
            title: "HOSTILE",
            roles: HOSTILE_ROLES
        },

        {
            title: "HUMAN",
            roles: [
                "engineer",
                ...HUMAN_ROLES
            ]
        },

        {
            title: "NEUTRAL",
            roles: NEUTRAL_ROLES
        },

        {
            title: "ROLE CONCEPT",
            roles: CONCEPT_ROLES
        }
    ];


    const enabled =
        game.customRoles ||
        { ...DEFAULT_CUSTOM_ROLES };


    $("customRolesContent").innerHTML =
        sections
            .map(section => {

                return `
                    <div class="custom-role-section">

                        <h2>
                            ${esc(section.title)}
                        </h2>

                        ${section.roles
                            .map(role => {

                                const data =
                                    ROLE_DATA[role];

                                const required =
                                    role === "engineer";

                                return `
                                    <div class="custom-role-row">

                                        <div class="custom-role-info">

                                            <div class="custom-role-name">
                                                ${data.icon}
                                                ${esc(data.name)}
                                            </div>

                                            <div class="custom-role-desc">
                                                ${esc(data.desc)}
                                            </div>

                                        </div>

                                        <div class="custom-role-controls">

                                            <label>
                                                <input
                                                    type="checkbox"
                                                    class="custom-role-enabled"
                                                    data-role="${role}"
                                                    ${
                                                        enabled[role]
                                                            ? "checked"
                                                            : ""
                                                    }
                                                    ${
                                                        required
                                                            ? "disabled"
                                                            : ""
                                                    }
                                                >
                                                ${
                                                    required
                                                        ? "REQUIRED"
                                                        : "ENABLED"
                                                }
                                            </label>

                                        </div>

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   SAVE CUSTOM ROLES
   ========================================================= */

function saveCustomRoles() {

    const settings =
        { ...DEFAULT_CUSTOM_ROLES };

    document
        .querySelectorAll(".custom-role-enabled")
        .forEach(input => {

            settings[
                input.dataset.role
            ] =
                input.checked;
        });

    settings.engineer =
        true;

    const count =
        game.players.length;

    const hostileEnabled =
        HOSTILE_ROLES.filter(
            role => settings[role]
        );

    if (
        hostileEnabled.length <
        HOSTILE_COUNT[count]
    ) {

        alert(
            `You need at least ${HOSTILE_COUNT[count]} enabled Hostile roles.`
        );

        return;
    }


    game.customRoles =
        settings;

    renderSetupPlayers();

    showScreen("setupScreen");
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /*
     * Player count.
     */

    $("playerCount").addEventListener(
        "change",
        () => {

            createPlayers();

        }
    );


    /*
     * IMPORTANT MOBILE FIX:
     *
     * Use ONE normal click listener.
     * Do NOT use touchend.
     * Do NOT disable pointer events.
     */

    $("randomRolesButton").type =
        "button";

    $("randomRolesButton").addEventListener(
        "click",
        e => {

            e.preventDefault();
            e.stopPropagation();

            randomiseRoles();
        }
    );


    $("startGameButton").addEventListener(
        "click",
        e => {

            e.preventDefault();

            startGame();
        }
    );


    $("roleGuideButton").addEventListener(
        "click",
        () => {

            renderRoleGuide();

            showScreen(
                "roleGuideScreen"
            );
        }
    );


    $("closeRoleGuideButton").addEventListener(
        "click",
        () => {

            showScreen(
                "setupScreen"
            );
        }
    );


    $("customRolesButton").addEventListener(
        "click",
        () => {

            renderCustomRoles();

            showScreen(
                "customRolesScreen"
            );
        }
    );


    $("cancelCustomRolesButton").addEventListener(
        "click",
        () => {

            showScreen(
                "setupScreen"
            );
        }
    );


    $("saveCustomRolesButton").addEventListener(
        "click",
        () => {

            saveCustomRoles();
        }
    );


    /*
     * Pass screen.
     */

    $("readyButton").addEventListener(
        "click",
        () => {

            const player =
                getPlayer(
                    game.currentAbilityPlayer
                );

            if (!player) {
                return;
            }

            showRoleScreen(player);
        }
    );


    /*
     * Role screen.
     */

    $("showActionButton").addEventListener(
        "click",
        () => {

            handleRoleScreenContinue();
        }
    );


    /*
     * Confirm ability.
     */

    $("confirmActionButton").addEventListener(
        "click",
        () => {

            executeCurrentAction();
        }
    );


    /*
     * Reaction ready.
     */

    $("reactionReadyButton").addEventListener(
        "click",
        () => {

            showReactionResult();
        }
    );


    /*
     * Reaction continue.
     */

    $("reactionContinueButton").addEventListener(
        "click",
        () => {

            advanceReaction();
        }
    );


    /*
     * Discussion.
     */

    $("startVotingButton").addEventListener(
        "click",
        () => {

            startVoting();
        }
    );


    /*
     * Voting.
     */

    $("confirmVoteButton").addEventListener(
        "click",
        () => {

            confirmVote();
        }
    );


    /*
     * Vote result.
     */

    $("afterVoteButton").addEventListener(
        "click",
        () => {

            afterVote();
        }
    );


    /*
     * Lifeline.
     */

    $("lifelineContinue").addEventListener(
        "click",
        () => {

            startDiscussion();
        }
    );


    /*
     * Systems.
     */

    $("nextRoundButton").addEventListener(
        "click",
        () => {

            nextRound();
        }
    );


    /*
     * Restart.
     */

    $("restartButton").addEventListener(
        "click",
        () => {

            createPlayers();

            showScreen(
                "setupScreen"
            );
        }
    );
}


/* =========================================================
   INITIALISE
   ========================================================= */

function init() {

    /*
     * Make sure the default custom role settings exist.
     */

    game.customRoles =
        { ...DEFAULT_CUSTOM_ROLES };


    createPlayers();

    setupEventListeners();

    renderRoleGuide();

    showScreen(
        "setupScreen"
    );
}


document.addEventListener(
    "DOMContentLoaded",
    init
);
