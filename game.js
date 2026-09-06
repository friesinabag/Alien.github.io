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
arr.length
? arr[Math.floor(Math.random() * arr.length)]
: null;

const shuffle = arr =>
[...arr].sort(() => Math.random() - 0.5);

const esc = s =>
String(s).replace(/[&<>"']/g, c => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
}[c]));

/* =========================================================
ROLE DATA
========================================================= */

const ROLE_DATA = {

/* ---------------- HOSTILE ---------------- */

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
        "Silence 1 living player for 2 rounds. They can still discuss and use their ability. You can see the other Hostile players."
},

parasite: {
    icon: "🦠",
    name: "Parasite",
    team: "Hostile",
    desc:
        "Infect 1 player once. Infection progresses to Diseased, then Parasite. You can see the other Hostile players."
},


/* ---------------- HUMAN ---------------- */

engineer: {
    icon: "🔧",
    name: "Engineer",
    team: "Human",
    desc:
        "Repair 1 offline ship system each round. You can act even when Power is offline."
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
        "One use per game. Cancel a Captain's tie-breaker ejection."
},


/* ---------------- NEUTRAL ---------------- */

jester: {
    icon: "🃏",
    name: "Jester",
    team: "Neutral",
    desc:
        "Try to get yourself voted out. If normally ejected by the vote, you win immediately."
},

king: {
    icon: "👑",
    name: "Survivor King",
    team: "Neutral",
    desc:
        "Win independently by being one of the final 2 living players. If alive when the ship reaches Earth, the Neutral team wins."
},


/* ---------------- ROLE CONCEPT ---------------- */

trickster: {
    icon: "🎭",
    name: "Trickster",
    team: "Neutral",
    concept: true,
    desc:
        "Once per game, swap the displayed identities of two living players. The swap lasts through Reaction, Discussion and Voting, then ends after the vote result."
},


/* ---------------- INFECTION ---------------- */

infected: {
    icon: "🦠",
    name: "Infected",
    team: "Infection",
    sub: true,
    desc:
        "A hidden infection stage. Only the Scientist can identify this status. The infected player does not know."
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
DEFAULT CUSTOM ROLE SETTINGS

IMPORTANT:

Engineer:

- ON by default
- Cannot be disabled

Jester:

- ON by default
- CAN be disabled

Survivor King:

- ON by default
- CAN be disabled

Trickster:

- OFF by default
- CAN be enabled
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

/* NEUTRALS ARE ON BY DEFAULT */
jester: true,
king: true,

/* ROLE CONCEPT IS OFF BY DEFAULT */
trickster: false

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

customRoles: {
    ...DEFAULT_CUSTOM_ROLES
},

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

gameOver: false,

abilityQueue: [],

abilityIndex: 0,

currentAbilityPlayer: null,

currentVoter: null

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
return game.players.find(p => p.id === Number(id));
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

/*
 * Infected remains Human until it progresses
 * into Diseased.
 */

if (player.role === "infected") {
    return "Human";
}

/*
 * Infection Parasite uses the real hostile team.
 */

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

const player = getPlayer(id);

if (!player) {
    return `Player ${id}`;
}

if (!game.displaySwap) {
    return player.name;
}

const index =
    game.displaySwap.indexOf(player.id);

if (index === -1) {
    return player.name;
}

const otherIndex =
    index === 0 ? 1 : 0;

const otherId =
    game.displaySwap[otherIndex];

return realName(otherId);

}

/* =========================================================
REAL NAME
========================================================= */

function realName(id) {

return getPlayer(id)?.name ||
    `Player ${id}`;

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

        if (p.id === Number(excludeId)) {
            return false;
        }

        /*
         * Hostiles cannot normally target known
         * Hostile teammates.
         *
         * Trickster exception:
         * swapped identities can make a hostile
         * accidentally target another hostile.
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
    Number($("playerCount")?.value || 4);

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

/* =========================================================
AVAILABLE STARTING ROLES
========================================================= */

function getAvailableStartingRoles() {

const enabled =
    game.customRoles ||
    DEFAULT_CUSTOM_ROLES;

return [

    ...HOSTILE_ROLES,

    "engineer",

    ...HUMAN_ROLES,

    ...NEUTRAL_ROLES,

    ...CONCEPT_ROLES

].filter(role => enabled[role]);

}

/* =========================================================
RENDER SETUP PLAYERS
========================================================= */

function renderSetupPlayers() {

const container =
    $("playersSetup");

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
                            <option value="${esc(role)}">
                                ${ROLE_DATA[role].icon}
                                ${esc(ROLE_DATA[role].name)}
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
SETUP SELECTS
========================================================= */

function bindSetupSelects() {

document
    .querySelectorAll(".role-select")
    .forEach(select => {

        select.onchange = () => {

            const index =
                Number(select.dataset.index);

            const value =
                select.value;

            if (value === "random") {
                return;
            }

            game.randomisedRoles = true;

            game.randomRoles[index] =
                value;

            /*
             * Keep visible dropdown looking RANDOM.
             * The actual selected role remains hidden.
             */

            select.value = "random";

            select.classList.add(
                "random-hidden"
            );
        };
    });

}

/* =========================================================
PLAYER COUNT STATUS
========================================================= */

function updatePlayerCountStatus() {

const count =
    Number($("playerCount")?.value || 4);

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
WEIGHTED ROLE PICK
========================================================= */

function weightedPick(roles, weights) {

if (!roles.length) {
    return null;
}

let total = 0;

roles.forEach(role => {
    total += weights[role] || 0;
});

if (total <= 0) {
    return rand(roles);
}

let value =
    Math.random() * total;

for (const role of roles) {

    value -=
        weights[role] || 0;

    if (value <= 0) {
        return role;
    }
}

return roles[roles.length - 1];

}

/* =========================================================
RANDOM ROLE GENERATION
========================================================= */

function randomiseRoles() {

const count =
    game.players.length;

const hostileCount =
    HOSTILE_COUNT[count];

if (!hostileCount) {
    return;
}

const enabled =
    game.customRoles ||
    DEFAULT_CUSTOM_ROLES;

/*
 * Only enabled Hostile roles can be selected.
 */

const availableHostiles =
    HOSTILE_ROLES.filter(
        role => enabled[role]
    );

if (
    availableHostiles.length <
    hostileCount
) {

    alert(
        `Not enough Hostile roles are enabled. You need at least ${hostileCount}.`
    );

    return;
}


/*
 * We create exactly:
 *
 * Hostiles
 * + Engineer
 * + Humans
 *
 * Neutrals / Trickster are available in Custom
 * Roles but are not automatically inserted into
 * random games.
 */

const roles =
    Array(count).fill(null);


/*
 * Pick unique Hostile roles.
 */

const hostilePool =
    shuffle(availableHostiles);

const selectedHostiles =
    hostilePool.slice(
        0,
        hostileCount
    );


/*
 * Pick random positions.
 */

const positions =
    shuffle(
        Array.from(
            { length: count },
            (_, i) => i
        )
    );


let positionIndex = 0;


/*
 * Assign Hostiles.
 */

selectedHostiles.forEach(role => {

    roles[
        positions[positionIndex++]
    ] = role;
});


/*
 * Engineer is always guaranteed.
 */

let engineerPosition =
    positions[positionIndex++];

/*
 * Find an unused position if needed.
 */

while (
    roles[engineerPosition] !== null
) {

    engineerPosition =
        Math.floor(
            Math.random() * count
        );
}

roles[engineerPosition] =
    "engineer";


/*
 * Remaining Humans.
 */

const remainingHumanCount =
    count -
    hostileCount -
    1;

let humanPool =
    HUMAN_ROLES.filter(
        role => enabled[role]
    );

if (
    humanPool.length <
    remainingHumanCount
) {

    alert(
        `Not enough Human roles are enabled for ${count} players.`
    );

    return;
}


const selectedHumans = [];


/*
 * Weighted selection without duplicates.
 */

for (
    let i = 0;
    i < remainingHumanCount;
    i++
) {

    const role =
        weightedPick(
            humanPool,
            HUMAN_WEIGHTS
        );

    if (!role) {
        break;
    }

    selectedHumans.push(role);

    humanPool =
        humanPool.filter(
            r => r !== role
        );
}


/*
 * Fill remaining slots.
 */

for (const role of selectedHumans) {

    const empty =
        roles
            .map((value, index) =>
                value === null
                    ? index
                    : -1
            )
            .filter(index => index !== -1);

    if (!empty.length) {
        break;
    }

    const position =
        rand(empty);

    roles[position] =
        role;
}


/*
 * Any remaining slot becomes Survivor.
 */

roles.forEach((role, index) => {

    if (!role) {
        roles[index] =
            "survivor";
    }
});


/*
 * Save hidden roles.
 */

game.randomRoles =
    roles;

game.randomisedRoles =
    true;


/*
 * Reset visible dropdowns.
 *
 * IMPORTANT:
 * This uses only click-based randomisation,
 * so mobile browsers do not get a duplicate
 * touch/click event.
 */

document
    .querySelectorAll(".role-select")
    .forEach(select => {

        select.value =
            "random";

        select.classList.add(
            "random-hidden"
        );
    });


updatePlayerCountStatus();

}

/* =========================================================
SETUP VALIDATION
========================================================= */

function validateSetup() {

const count =
    game.players.length;

const roles =
    game.randomRoles;

if (
    roles.length !== count ||
    roles.some(
        role =>
            !role ||
            role === "random"
    )
) {

    alert(
        "Please randomise the roles or manually select every role."
    );

    return false;
}


/*
 * Exact Hostile count.
 */

const hostileCount =
    roles.filter(
        role =>
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


/*
 * Exactly one Engineer.
 */

const engineers =
    roles.filter(
        role => role === "engineer"
    ).length;

if (engineers !== 1) {

    alert(
        "Engineer must always be present exactly once."
    );

    return false;
}


/*
 * Every selected starting role must currently
 * be enabled.
 */

const enabled =
    game.customRoles ||
    DEFAULT_CUSTOM_ROLES;

for (const role of roles) {

    if (!enabled[role]) {

        alert(
            `${ROLE_DATA[role]?.name || role} is disabled in Custom Roles.`
        );

        return false;
    }
}

return true;

}

/* =========================================================
APPLY ROLES
========================================================= */

function applyRoles() {

game.players.forEach((player, index) => {

    player.role =
        game.randomRoles[index];

    player.originalRole =
        player.role;

    player.alive =
        true;

    player.infectionRound =
        null;

    player.hasInfected =
        false;

    player.acted =
        false;

    player.vote =
        null;
});

}

/* =========================================================
RESET GAME STATE
========================================================= */

function resetGameState() {

game.round =
    1;

game.stage =
    1;

game.systems = {
    engines: true,
    o2: true,
    communications: true,
    power: true
};

game.roundStartAliveIds =
    [];

game.reactionQueue =
    [];

game.reactionIndex =
    0;

game.reactionInfo =
    {};

game.selectedAction =
    null;

game.selectedVote =
    null;

game.currentVoterIndex =
    0;

game.votes =
    {};

game.interactionLog =
    {};

game.roundInteractions =
    {};

game.blockedPlayers =
    new Set();

game.protectedPlayers =
    new Set();

game.silencedUntil =
    {};

game.displaySwap =
    null;

game.tricksterUsed =
    false;

game.judgeUsed =
    false;

game.captainChoice =
    null;

game.voteResult =
    null;

game.lifelineNumber =
    0;

game.gameOver =
    false;

game.abilityQueue =
    [];

game.abilityIndex =
    0;

game.currentAbilityPlayer =
    null;

game.currentVoter =
    null;

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
 * IMPORTANT:
 *
 * Snapshot alive players BEFORE any abilities happen.
 *
 * These exact players receive the Reaction Round,
 * even if one dies during the Ability Round.
 */

game.roundStartAliveIds =
    living().map(
        player => player.id
    );

game.reactionQueue =
    [...game.roundStartAliveIds];

game.reactionIndex =
    0;

game.reactionInfo =
    {};

game.selectedAction =
    null;

game.selectedVote =
    null;

game.votes =
    {};

game.currentVoterIndex =
    0;

game.roundInteractions =
    {};

game.blockedPlayers =
    new Set();

game.protectedPlayers =
    new Set();


/*
 * Remove expired silence effects.
 */

for (
    const id of Object.keys(
        game.silencedUntil
    )
) {

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

game.abilityQueue =
    living().map(
        player => player.id
    );

game.abilityIndex =
    0;

showAbilityForPlayer();

}

/* =========================================================
SHOW ABILITY PLAYER
========================================================= */

function showAbilityForPlayer() {

if (
    game.abilityIndex >=
    game.abilityQueue.length
) {

    endAbilityRound();

    return;
}

const id =
    game.abilityQueue[
        game.abilityIndex
    ];

const player =
    getPlayer(id);

if (
    !player ||
    !player.alive
) {

    advanceAbilityPlayer();

    return;
}

$("passPlayerName").textContent =
    player.name;

$("passRound").textContent =
    `ROUND ${game.round}`;

game.currentAbilityPlayer =
    player.id;

showScreen(
    "passScreen"
);

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
ROLE SCREEN
========================================================= */

function showRoleScreen(player) {

$("rolePlayerName").textContent =
    player.name;

$("roleIcon").textContent =
    ROLE_DATA[player.role]?.icon ||
    "👤";

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
    team === "Hostile"
) {

    const teammates =
        hostileTeammates(player);

    if (teammates.length) {

        hostileList.classList.remove(
            "hidden"
        );

        hostileList.innerHTML =
            `<strong>HOSTILE TEAMMATES:</strong><br>` +
            teammates
                .map(other =>
                    `${ROLE_DATA[other.role]?.icon || "👤"} ${esc(other.name)}`
                )
                .join("<br>");

    } else {

        hostileList.classList.add(
            "hidden"
        );

        hostileList.innerHTML =
            "";
    }

} else {

    hostileList.classList.add(
        "hidden"
    );

    hostileList.innerHTML =
        "";
}

showScreen(
    "roleScreen"
);

}

/* =========================================================
ROLE SCREEN CONTINUE
========================================================= */

function handleRoleScreenContinue() {

const player =
    getPlayer(
        game.currentAbilityPlayer
    );

if (!player) {
    return;
}

renderActionForPlayer(
    player
);

}

/* =========================================================
ACTION RENDERING
========================================================= */

function renderActionForPlayer(player) {

game.selectedAction =
    null;

$("actionOptions").innerHTML =
    "";

$("confirmActionButton").disabled =
    false;


/*
 * Roles with no normal action.
 */

if (
    player.role === "survivor" ||
    player.role === "jester" ||
    player.role === "king"
) {

    $("actionTitle").textContent =
        "NO ACTION";

    $("actionDescription").textContent =
        "You have no action this round.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

    showScreen(
        "actionScreen"
    );

    return;
}


/*
 * Trickster.
 */

if (
    player.role === "trickster"
) {

    if (
        game.tricksterUsed
    ) {

        $("actionTitle").textContent =
            "🎭 TRICKSTER";

        $("actionDescription").textContent =
            "Your Trickster ability has already been used.";

        $("actionOptions").innerHTML =
            `
                <p style="text-align:center;color:#9ba9b8;">
                    Continue when ready.
                </p>
            `;

    } else {

        $("actionTitle").textContent =
            "🎭 TRICKSTER";

        $("actionDescription").textContent =
            "Choose two living players to swap their displayed identities.";

        renderTricksterChoices(
            player
        );
    }

    showScreen(
        "actionScreen"
    );

    return;
}


/*
 * Diseased cannot act.
 */

if (
    player.role === "diseased"
) {

    $("actionTitle").textContent =
        "☣️ NO ACTION";

    $("actionDescription").textContent =
        "Diseased players cannot use an ability.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

    showScreen(
        "actionScreen"
    );

    return;
}


/*
 * Power offline disables every ability
 * except Engineer.
 */

if (
    !game.systems.power &&
    player.role !== "engineer"
) {

    $("actionTitle").textContent =
        "⚡ POWER OFFLINE";

    $("actionDescription").textContent =
        "Your ability is disabled while Power is offline.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

    showScreen(
        "actionScreen"
    );

    return;
}


switch (player.role) {

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
            "You have no normal action. If the vote ties and Power is online, you may break the tie.";

        $("actionOptions").innerHTML =
            `
                <p style="text-align:center;color:#9ba9b8;">
                    Continue when ready.
                </p>
            `;

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

        $("actionOptions").innerHTML =
            `
                <p style="text-align:center;color:#9ba9b8;">
                    Continue when ready.
                </p>
            `;

        break;

    default:

        $("actionTitle").textContent =
            "NO ACTION";

        $("actionDescription").textContent =
            "You have no action this round.";
}


showScreen(
    "actionScreen"
);

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
        targetOptions(
            player,
            player.id
        )
            .map(option =>
                button(
                    `💀 KILL ${option.label}`,
                    JSON.stringify({
                        type: "kill",
                        target: option.id
                    })
                )
            )
            .join("");

    bindActionButtons();

    return;
}


$("actionDescription").textContent =
    "Choose Kill or Sabotage.";

$("actionOptions").innerHTML =
    `
        ${button(
            "💀 KILL",
            "kill-mode"
        )}

        ${button(
            "⚠️ SABOTAGE",
            "sabotage-mode"
        )}
    `;


$("actionOptions")
    .querySelectorAll("button")
    .forEach(btn => {

        btn.onclick = () => {

            const mode =
                btn.dataset.value;

            if (
                mode === "kill-mode"
            ) {

                $("actionOptions").innerHTML =
                    targetOptions(
                        player,
                        player.id
                    )
                        .map(option =>
                            button(
                                `💀 KILL ${option.label}`,
                                JSON.stringify({
                                    type: "kill",
                                    target: option.id
                                })
                            )
                        )
                        .join("");

                bindActionButtons();
            }

            if (
                mode === "sabotage-mode"
            ) {

                renderSabotageTarget(
                    player,
                    "alien"
                );
            }
        };
    });

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

/* =========================================================
SABOTAGE
========================================================= */

function renderSabotageTarget(
player,
source
) {

$("actionOptions").innerHTML =
    Object.keys(game.systems)
        .map(system =>
            button(
                `⚠️ ${systemDisplayName(system)}`,
                JSON.stringify({
                    type: "sabotage",
                    target: system,
                    source
                })
            )
        )
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
    targetOptions(
        player,
        player.id
    )
        .map(option =>
            button(
                `🔇 ${option.label}`,
                JSON.stringify({
                    type: "silence",
                    target: option.id
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

if (
    player.hasInfected
) {

    $("actionDescription").textContent =
        "You have already used your infection ability.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

    return;
}


$("actionDescription").textContent =
    "Choose 1 living player to infect.";

$("actionOptions").innerHTML =
    targetOptions(
        player,
        player.id
    )
        .map(option =>
            button(
                `🦠 INFECT ${option.label}`,
                JSON.stringify({
                    type: "infect",
                    target: option.id
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
        .filter(
            system =>
                !game.systems[system]
        );


if (!offline.length) {

    $("actionDescription").textContent =
        "All ship systems are online.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

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
    targetOptions(
        player,
        player.id
    )
        .map(option =>
            button(
                `🔬 CHECK ${option.label}`,
                option.id
            )
        )
        .join("");


$("actionOptions")
    .querySelectorAll("button")
    .forEach(btn => {

        btn.onclick = () => {

            const target =
                getPlayer(
                    Number(
                        btn.dataset.value
                    )
                );

            if (!target) {
                return;
            }

            const canCure =
                target.role === "infected" ||
                target.role === "diseased";


            $("actionOptions").innerHTML =
                `
                    ${button(
                        "🔬 CHECK",
                        "check"
                    )}

                    ${
                        canCure
                            ? button(
                                "💉 CURE",
                                "cure"
                            )
                            : ""
                    }
                `;


            $("actionOptions")
                .querySelectorAll("button")
                .forEach(choice => {

                    choice.onclick = () => {

                        const mode =
                            choice.dataset.value;

                        game.selectedAction =
                            JSON.stringify({
                                type: "science",
                                target: target.id,
                                mode
                            });

                        $("actionOptions")
                            .querySelectorAll("button")
                            .forEach(other =>
                                other.classList.remove(
                                    "selected"
                                )
                            );

                        choice.classList.add(
                            "selected"
                        );
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
    targetOptions(
        player,
        player.id
    )
        .map(option =>
            button(
                `🕵️ INVESTIGATE ${option.label}`,
                JSON.stringify({
                    type: "detect",
                    target: option.id
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
    targetOptions(
        player
    )
        .map(option =>
            button(
                `🛡️ PROTECT ${option.label}`,
                JSON.stringify({
                    type: "protect",
                    target: option.id
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
    targetOptions(
        player,
        player.id
    )
        .map(option =>
            button(
                `🛡️ BLOCK ${option.label}`,
                JSON.stringify({
                    type: "block",
                    target: option.id
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

if (
    !game.systems.communications
) {

    $("actionDescription").textContent =
        "Communications is offline. You cannot receive a message from Earth.";

    $("actionOptions").innerHTML =
        `
            <p style="text-align:center;color:#9ba9b8;">
                Continue when ready.
            </p>
        `;

    return;
}


$("actionDescription").textContent =
    "Receive your private message from Earth.";

$("actionOptions").innerHTML =
    `
        <p style="text-align:center;color:#9ba9b8;">
            Your private message will appear in the Reaction Round.
        </p>
    `;

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
        .map(option =>
            button(
                `🎭 ${option.label}`,
                option.id
            )
        )
        .join("");

let first =
    null;


$("actionOptions")
    .querySelectorAll("button")
    .forEach(btn => {

        btn.onclick = () => {

            const id =
                Number(
                    btn.dataset.value
                );

            if (
                first === null
            ) {

                first =
                    id;

                btn.classList.add(
                    "selected"
                );

                $("actionDescription").textContent =
                    "Now choose the second player.";

                return;
            }


            if (
                id === first
            ) {
                return;
            }


            game.selectedAction =
                JSON.stringify({
                    type: "trickster",
                    a: first,
                    b: id
                });


            $("actionOptions")
                .querySelectorAll("button")
                .forEach(other =>
                    other.classList.remove(
                        "selected"
                    )
                );

            btn.classList.add(
                "selected"
            );
        };
    });

}

/* =========================================================
ACTION BUTTONS
========================================================= */

function bindActionButtons() {

$("actionOptions")
    .querySelectorAll("button")
    .forEach(btn => {

        btn.onclick = () => {

            game.selectedAction =
                btn.dataset.value;

            $("actionOptions")
                .querySelectorAll("button")
                .forEach(other =>
                    other.classList.remove(
                        "selected"
                    )
                );

            btn.classList.add(
                "selected"
            );
        };
    });

}

/* =========================================================
EXECUTE ACTION
========================================================= */

function executeCurrentAction() {

const player =
    getPlayer(
        game.currentAbilityPlayer
    );

if (!player) {

    advanceAbilityPlayer();

    return;
}


/*
 * If Guard blocked this player,
 * they cannot use their ability.
 *
 * Engineer is still able to act if Power
 * is offline, but Guard can still block Engineer.
 */

if (
    game.blockedPlayers.has(
        player.id
    )
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


/*
 * No action.
 */

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


switch (action.type) {


    /* -----------------------------------------
       KILL
       ----------------------------------------- */

    case "kill": {

        const target =
            getPlayer(
                action.target
            );

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

                game.reactionInfo[
                    player.id
                ] =
                    `Your attack on ${target.name} was stopped.`;

            } else {

                target.alive =
                    false;

                game.reactionInfo[
                    player.id
                ] =
                    `${target.name} is no longer alive.`;

                game.reactionInfo[
                    target.id
                ] =
                    "You died during this round.";
            }
        }

        break;
    }


    /* -----------------------------------------
       SABOTAGE
       ----------------------------------------- */

    case "sabotage": {

        const system =
            action.target;

        if (
            Object.prototype.hasOwnProperty.call(
                game.systems,
                system
            )
        ) {

            game.systems[system] =
                false;

            recordInteraction(
                player.id,
                systemDisplayName(system)
            );

            game.reactionInfo[
                player.id
            ] =
                `${systemDisplayName(system)} was sabotaged.`;
        }

        break;
    }


    /* -----------------------------------------
       SILENCE
       ----------------------------------------- */

    case "silence": {

        const target =
            getPlayer(
                action.target
            );

        if (
            target &&
            alive(target)
        ) {

            game.silencedUntil[
                target.id
            ] =
                game.round + 1;

            recordInteraction(
                player.id,
                target.name
            );

            game.reactionInfo[
                player.id
            ] =
                `${target.name} has been silenced for 2 rounds.`;
        }

        break;
    }


    /* -----------------------------------------
       INFECT
       ----------------------------------------- */

    case "infect": {

        const target =
            getPlayer(
                action.target
            );


        if (
            player.hasInfected
        ) {

            game.reactionInfo[
                player.id
            ] =
                "You have already used your infection ability.";

            break;
        }


        player.hasInfected =
            true;


        if (
            target &&
            alive(target) &&
            !target.infectionRound
        ) {

            target.infectionRound =
                game.round;

            target.originalRole =
                target.role;

            target.role =
                "infected";

            target.hasInfected =
                false;

            recordInteraction(
                player.id,
                target.name
            );


            /*
             * The infected player is deliberately
             * NOT told they have become Infected.
             */

            game.reactionInfo[
                target.id
            ] =
                "You were infected this round.";

            game.reactionInfo[
                player.id
            ] =
                `${target.name} was infected.`;

        } else {

            recordInteraction(
                player.id,
                "Failed infection"
            );

            game.reactionInfo[
                player.id
            ] =
                "The infection failed.";
        }

        break;
    }


    /* -----------------------------------------
       REPAIR
       ----------------------------------------- */

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

            game.systems[system] =
                true;

            recordInteraction(
                player.id,
                systemDisplayName(system)
            );

            game.reactionInfo[
                player.id
            ] =
                `${systemDisplayName(system)} was repaired.`;
        }

        break;
    }


    /* -----------------------------------------
       SCIENCE
       ----------------------------------------- */

    case "science": {

        const target =
            getPlayer(
                action.target
            );

        if (!target) {
            break;
        }


        recordInteraction(
            player.id,
            target.name
        );


        const status =
            ROLE_DATA[target.role]?.name ||
            target.role;


        /*
         * Cure Infected or Diseased.
         *
         * They become Survivor rather than
         * returning to their original role.
         */

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


            game.reactionInfo[
                player.id
            ] =
                `SCIENCE: ${target.name} was cured and is now a Survivor.`;


            if (
                target.id !== player.id
            ) {

                game.reactionInfo[
                    target.id
                ] =
                    "You were cured by the Scientist and are now a Survivor.";
            }

        } else {

            game.reactionInfo[
                player.id
            ] =
                `SCIENCE: ${target.name} is ${status}.`;
        }

        break;
    }


    /* -----------------------------------------
       DETECT
       ----------------------------------------- */

    case "detect": {

        const target =
            getPlayer(
                action.target
            );

        if (!target) {
            break;
        }


        recordInteraction(
            player.id,
            target.name
        );


        const previous =
            game.interactionLog[
                target.id
            ];


        if (previous) {

            game.reactionInfo[
                player.id
            ] =
                `DETECTIVE: ${target.name} interacted with ${previous}.`;

        } else {

            game.reactionInfo[
                player.id
            ] =
                `DETECTIVE: ${target.name} has no recorded interaction from the previous round.`;
        }

        break;
    }


    /* -----------------------------------------
       PROTECT
       ----------------------------------------- */

    case "protect": {

        const target =
            getPlayer(
                action.target
            );

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

            game.reactionInfo[
                player.id
            ] =
                `${target.name} is protected this round.`;
        }

        break;
    }


    /* -----------------------------------------
       BLOCK
       ----------------------------------------- */

    case "block": {

        const target =
            getPlayer(
                action.target
            );

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

            game.reactionInfo[
                player.id
            ] =
                `${target.name}'s ability is blocked this round.`;
        }

        break;
    }


    /* -----------------------------------------
       RADIO
       ----------------------------------------- */

    case "radio": {

        recordInteraction(
            player.id,
            "Earth"
        );

        game.reactionInfo[
            player.id
        ] =
            randomEarthMessage();

        break;
    }


    /* -----------------------------------------
       TRICKSTER
       ----------------------------------------- */

    case "trickster": {

        if (
            game.tricksterUsed
        ) {
            break;
        }


        if (
            action.a === action.b
        ) {
            break;
        }


        const first =
            getPlayer(action.a);

        const second =
            getPlayer(action.b);


        if (
            first &&
            second &&
            alive(first) &&
            alive(second)
        ) {

            game.displaySwap = [
                first.id,
                second.id
            ];

            game.tricksterUsed =
                true;

            recordInteraction(
                player.id,
                `${first.name} / ${second.name}`
            );

            game.reactionInfo[
                player.id
            ] =
                "The displayed identities of two players have been swapped.";
        }

        break;
    }


    default:
        recordInteraction(
            player.id,
            "Nothing"
        );
}


advanceAbilityPlayer();

}

/* =========================================================
END ABILITY ROUND
========================================================= */

function endAbilityRound() {

/*
 * Infection progresses after every ability
 * has been resolved.
 */

progressInfections();


/*
 * Check victory before Reaction Round.
 */

if (
    checkVictory()
) {
    return;
}


startReactionRound();

}

/* =========================================================
INFECTION PROGRESSION
========================================================= */

function progressInfections() {

for (const player of game.players) {

    if (
        !alive(player) ||
        !player.infectionRound
    ) {
        continue;
    }


    const age =
        game.round -
        player.infectionRound +
        1;


    /*
     * Infected -> Diseased
     *
     * Happens after the round following infection.
     */

    if (
        age >= 2 &&
        player.role === "infected"
    ) {

        player.role =
            "diseased";

        game.reactionInfo[
            player.id
        ] =
            "You are now DISEASED and on the Hostile Team.";
    }


    /*
     * Diseased -> Parasite
     */

    else if (
        age >= 3 &&
        player.role === "diseased"
    ) {

        player.role =
            "parasite";

        player.hasInfected =
            false;

        player.infectionRound =
            null;

        game.reactionInfo[
            player.id
        ] =
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
 *
 * Reaction uses the START-OF-ROUND snapshot.
 *
 * Therefore a player killed during the Ability
 * Round still receives their Reaction screen.
 */

game.reactionQueue =
    [...game.roundStartAliveIds];

game.reactionIndex =
    0;

showNextReactionPlayer();

}

/* =========================================================
SHOW REACTION PLAYER
========================================================= */

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

showScreen(
    "reactionScreen"
);

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
    game.reactionInfo[
        player.id
    ];


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

showScreen(
    "reactionResultScreen"
);

}

/* =========================================================
ADVANCE REACTION
========================================================= */

function advanceReaction() {

game.reactionIndex++;

showNextReactionPlayer();

}

/* =========================================================
END REACTION ROUND
========================================================= */

function endReactionRound() {

/*
 * Save interactions for Detective.
 */

game.interactionLog =
    {
        ...game.roundInteractions
    };


/*
 * Engine progression.
 *
 * Offline Engines means the stage does not
 * advance this round.
 */

if (
    game.systems.engines
) {

    game.stage++;
}


/*
 * Check victory.
 */

if (
    checkVictory()
) {
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


$("roundResults").innerHTML =
    game.players
        .map(player => {

            const state =
                player.alive
                    ? "ALIVE"
                    : "OUT";

            return `
                <div class="result-row">

                    <strong>
                        ${esc(player.name)}
                    </strong>

                    — ${state}

                </div>
            `;
        })
        .join("");


showScreen(
    "discussionScreen"
);

}

/* =========================================================
VOTING
========================================================= */

function startVoting() {

game.votes =
    {};

game.currentVoterIndex =
    0;

game.selectedVote =
    null;

showNextVoter();

}

/* =========================================================
SHOW NEXT VOTER
========================================================= */

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
    voters[
        game.currentVoterIndex
    ];


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

    warning.classList.remove(
        "hidden"
    );

} else {

    warning.classList.add(
        "hidden"
    );
}


/*
 * Living targets only.
 */

const options =
    living().filter(
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
 * Silenced players cannot vote.
 */

if (silenced) {

    game.selectedVote =
        "skip";

    $("voteOptions")
        .querySelectorAll("button")
        .forEach(btn =>
            btn.disabled = true
        );

} else {

    game.selectedVote =
        null;

    $("voteOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                game.selectedVote =
                    btn.dataset.value;

                $("voteOptions")
                    .querySelectorAll("button")
                    .forEach(other =>
                        other.classList.remove(
                            "selected"
                        )
                    );

                btn.classList.add(
                    "selected"
                );
            };
        });
}


showScreen(
    "votingScreen"
);

}

/* =========================================================
SILENCED CHECK
========================================================= */

function isSilenced(player) {

if (!player) {
    return false;
}

const until =
    game.silencedUntil[
        player.id
    ];

return Boolean(
    until &&
    until >= game.round
);

}

/* =========================================================
CONFIRM VOTE
========================================================= */

function confirmVote() {

const player =
    getPlayer(
        game.currentVoter
    );


if (!player) {
    return;
}


if (
    isSilenced(player)
) {

    game.votes[
        player.id
    ] =
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

    game.votes[
        player.id
    ] =
        game.selectedVote;
}


game.currentVoterIndex++;

showNextVoter();

}

/* =========================================================
FINISH VOTING
========================================================= */

function finishVoting() {

const counts =
    {};


for (
    const vote of
    Object.values(game.votes)
) {

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
            id =>
                counts[id] === highest
        )
        .map(Number);


if (
    tied.length > 1
) {

    handleTie(tied);

    return;
}


ejectPlayer(
    tied[0]
);

}

/* =========================================================
HANDLE TIE
========================================================= */

function handleTie(tiedIds) {

const captain =
    living().find(
        player =>
            player.role === "captain"
    );


/*
 * Captain only works with Power online.
 */

if (
    captain &&
    game.systems.power
) {

    game.captainChoice =
        [...tiedIds];

    showCaptainTie();

    return;
}


/*
 * No Captain / Power offline:
 * nobody is ejected.
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
    .forEach(btn => {

        btn.onclick = () => {

            const target =
                Number(
                    btn.dataset.value
                );


            game.captainChoice =
                target;


            /*
             * Judge is checked privately here.
             */

            const judge =
                living().find(
                    player =>
                        player.role === "judge"
                );


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


            ejectPlayer(
                target
            );
        };
    });


showScreen(
    "captainTieScreen"
);

}

/* =========================================================
EJECT PLAYER
========================================================= */

function ejectPlayer(id) {

const player =
    getPlayer(id);


if (
    !player ||
    !player.alive
) {
    return;
}


player.alive =
    false;


/*
 * Jester wins immediately if they are
 * normally ejected.
 */

if (
    player.role === "jester"
) {

    game.voteResult = {
        type: "jester_win",
        player: player.id
    };

    showVoteResult();

    return;
}


game.voteResult = {
    type: "ejected",
    player: player.id
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


showScreen(
    "voteResultScreen"
);

}

/* =========================================================
AFTER VOTE
========================================================= */

function afterVote() {

/*
 * Trickster swap ends only after the entire
 * vote result has been resolved.
 */

game.displaySwap =
    null;


if (
    checkVictory()
) {
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


showScreen(
    "systemsScreen"
);

}

/* =========================================================
NEXT ROUND
========================================================= */

function nextRound() {

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
EARTH LIFELINES
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


showScreen(
    "lifelineScreen"
);

}

/* =========================================================
GENERATE LIFELINE
========================================================= */

function generateLifeline() {

const options = [];


/*
 * Alien clues.
 */

if (
    living().some(
        player =>
            player.role === "alien"
    )
) {

    options.push(
        "There is an Alien aboard."
    );
}


if (
    living().filter(
        player =>
            player.role === "alien"
    ).length > 1
) {

    options.push(
        "There is more than 1 Alien aboard."
    );
}


/*
 * Other Hostiles.
 */

if (
    living().some(
        player =>
            player.role === "saboteur"
    )
) {

    options.push(
        "There is a Saboteur."
    );
}


if (
    living().some(
        player =>
            player.role === "silencer"
    )
) {

    options.push(
        "There is a Silencer."
    );
}


/*
 * Hostile count clues.
 */

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


/*
 * Engineer clue.
 */

if (
    living().some(
        player =>
            player.role === "engineer"
    )
) {

    options.push(
        "Engineer is still alive."
    );
}


/*
 * Special Human clues.
 */

const specialHumans = [
    "captain",
    "detective",
    "medic",
    "guard"
];


for (
    const role of specialHumans
) {

    if (
        living().some(
            player =>
                player.role === role
        )
    ) {

        options.push(
            `${ROLE_DATA[role].name} is aboard.`
        );
    }
}


/*
 * System clues.
 */

options.push(
    "A ship system was sabotaged."
);

options.push(
    "A ship system was repaired."
);


/*
 * Hostile player clue.
 */

const hostileClue =
    randomClueWithHostiles();


if (hostileClue) {

    options.push(
        hostileClue
    );
}


return (
    rand(options) ||
    "Earth reports unusual activity aboard the ship."
);

}

/* =========================================================
RANDOM HOSTILE PLAYER CLUE
========================================================= */

function randomClueWithHostiles() {

const hostiles =
    livingHostiles();


if (
    hostiles.length < 1
) {

    return null;
}


const currentPlayers =
    shuffle(
        living()
    );


/*
 * Exactly up to 3 players.
 */

let selected =
    currentPlayers.slice(
        0,
        Math.min(
            3,
            currentPlayers.length
        )
    );


/*
 * Guarantee a Hostile is included.
 */

if (
    !selected.some(
        player =>
            isHostile(player)
    )
) {

    const replacement =
        rand(hostiles);

    const replaceIndex =
        Math.floor(
            Math.random() *
            selected.length
        );

    selected[
        replaceIndex
    ] =
        replacement;
}


/*
 * Guarantee exactly ONE Hostile in the clue.
 */

const selectedHostiles =
    selected.filter(
        player =>
            isHostile(player)
    );


if (
    selectedHostiles.length > 1
) {

    const keep =
        rand(selectedHostiles);


    selected =
        selected.filter(
            player =>
                !isHostile(player) ||
                player.id === keep.id
        );
}


const hostile =
    selected.find(
        player =>
            isHostile(player)
    );


if (!hostile) {
    return null;
}


return (
    "⚠️ ONE OF THESE PLAYERS IS HOSTILE: " +
    selected
        .map(
            player =>
                player.name
        )
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


return names[system] ||
    system;

}

/* =========================================================
INTERACTION LOG
========================================================= */

function recordInteraction(
playerId,
target
) {

game.roundInteractions[
    playerId
] =
    target;

}

/* =========================================================
VICTORY CHECK
========================================================= */

function checkVictory() {

if (
    game.gameOver
) {

    return true;
}


const alivePlayers =
    living();


/*
 * -----------------------------------------------------
 * HOSTILE VICTORY
 * -----------------------------------------------------
 *
 * Hostiles win when their living count is equal
 * to or greater than everyone else alive.
 */

const hostiles =
    alivePlayers.filter(
        player =>
            roleTeam(player) === "Hostile"
    );


const others =
    alivePlayers.filter(
        player =>
            roleTeam(player) !== "Hostile"
    );


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
 * -----------------------------------------------------
 * SURVIVOR KING
 * -----------------------------------------------------
 *
 * If the King is one of the final 2 living players,
 * the King wins independently.
 */

if (
    alivePlayers.length <= 2
) {

    const king =
        alivePlayers.find(
            player =>
                player.role === "king"
        );


    if (king) {

        endGame(
            "SURVIVOR KING WINS",
            `${king.name} is one of the final 2 living players.`
        );

        return true;
    }
}


/*
 * -----------------------------------------------------
 * EARTH / HUMAN / NEUTRAL VICTORY
 * -----------------------------------------------------
 */

if (
    game.stage > 10
) {

    const neutrals =
        alivePlayers.filter(
            player =>
                roleTeam(player) === "Neutral"
        );


    /*
     * Neutral Earth victory overrides Human victory.
     */

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
 * If there are no Hostiles but the ship has not
 * reached Earth, the game continues.
 */

return false;

}

/* =========================================================
GAME OVER
========================================================= */

function endGame(
title,
message
) {

game.gameOver =
    true;


$("gameOverTitle").textContent =
    title;

$("gameOverMessage").textContent =
    message;


$("finalPlayers").innerHTML =
    game.players
        .map(player => {

            /*
             * Use current role first.
             * This ensures infection stages are shown
             * correctly.
             */

            const roleData =
                ROLE_DATA[player.role] ||
                ROLE_DATA[player.originalRole] ||
                {};


            return `
                <div class="final-player">

                    <span class="final-player-name">

                        ${esc(player.name)}

                        ${
                            player.alive
                                ? ""
                                : " 💀"
                        }

                    </span>

                    <span class="final-player-role">

                        ${roleData.icon || "👤"}

                        ${roleData.name || player.role}

                    </span>

                </div>
            `;
        })
        .join("");


showScreen(
    "gameOverScreen"
);

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
    {
        ...DEFAULT_CUSTOM_ROLES
    };


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

                            /*
                             * ONLY Engineer is required.
                             *
                             * Jester and King are deliberately
                             * NOT required and NOT disabled.
                             */

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
                                                data-role="${esc(role)}"

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

/*
 * Start with current/default settings.
 */

const settings =
    {
        ...(game.customRoles ||
            DEFAULT_CUSTOM_ROLES)
    };


document
    .querySelectorAll(
        ".custom-role-enabled"
    )
    .forEach(input => {

        settings[
            input.dataset.role
        ] =
            input.checked;
    });


/*
 * Engineer is the ONLY role that is forced ON.
 *
 * Jester and King are NOT forced ON.
 */

settings.engineer =
    true;


const count =
    game.players.length;


const hostileEnabled =
    HOSTILE_ROLES.filter(
        role =>
            settings[role]
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


/*
 * Need enough enabled Human roles for random
 * generation.
 *
 * Engineer is separate and guaranteed.
 */

const humanEnabled =
    HUMAN_ROLES.filter(
        role =>
            settings[role]
    );


const requiredHumanCount =
    count -
    HOSTILE_COUNT[count] -
    1;


if (
    humanEnabled.length <
    requiredHumanCount
) {

    alert(
        `You need at least ${requiredHumanCount} enabled Human roles for ${count} players.`
    );

    return;
}


game.customRoles =
    settings;


/*
 * Re-render setup so disabled roles disappear
 * from the manual role dropdowns.
 */

renderSetupPlayers();

showScreen(
    "setupScreen"
);

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
 * -----------------------------------------------------
 * MOBILE RANDOMISE FIX
 * -----------------------------------------------------
 *
 * ONE click listener.
 *
 * No touchstart.
 * No touchend.
 * No pointer-events:none.
 */

$("randomRolesButton").type =
    "button";


$("randomRolesButton").addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();

        randomiseRoles();
    }
);


/*
 * START GAME
 */

$("startGameButton").addEventListener(
    "click",
    event => {

        event.preventDefault();

        startGame();
    }
);


/*
 * ROLE GUIDE
 */

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


/*
 * CUSTOM ROLES
 */

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
 * PASS SCREEN
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

        showRoleScreen(
            player
        );
    }
);


/*
 * ROLE SCREEN
 */

$("showActionButton").addEventListener(
    "click",
    () => {

        handleRoleScreenContinue();
    }
);


/*
 * CONFIRM ACTION
 */

$("confirmActionButton").addEventListener(
    "click",
    () => {

        executeCurrentAction();
    }
);


/*
 * REACTION READY
 */

$("reactionReadyButton").addEventListener(
    "click",
    () => {

        showReactionResult();
    }
);


/*
 * REACTION CONTINUE
 */

$("reactionContinueButton").addEventListener(
    "click",
    () => {

        advanceReaction();
    }
);


/*
 * DISCUSSION -> VOTING
 */

$("startVotingButton").addEventListener(
    "click",
    () => {

        startVoting();
    }
);


/*
 * CONFIRM VOTE
 */

$("confirmVoteButton").addEventListener(
    "click",
    () => {

        confirmVote();
    }
);


/*
 * VOTE RESULT
 */

$("afterVoteButton").addEventListener(
    "click",
    () => {

        afterVote();
    }
);


/*
 * LIFELINE
 */

$("lifelineContinue").addEventListener(
    "click",
    () => {

        startDiscussion();
    }
);


/*
 * SYSTEMS
 */

$("nextRoundButton").addEventListener(
    "click",
    () => {

        nextRound();
    }
);


/*
 * RESTART
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
 * IMPORTANT:
 *
 * Jester and Survivor King start ENABLED.
 * Trickster starts DISABLED.
 * Engineer is always required.
 */

game.customRoles =
    {
        ...DEFAULT_CUSTOM_ROLES
    };


createPlayers();

setupEventListeners();

renderRoleGuide();

showScreen(
    "setupScreen"
);

}

/* =========================================================
START
========================================================= */

document.addEventListener(
"DOMContentLoaded",
init
);
