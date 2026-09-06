"use strict";

/* =========================================================
   ALIEN
   COMPLETE LOCAL + ONLINE GAME.JS
   ========================================================= */

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://sovwkrauwyoskxrnajjn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ck6DlHqxEFmoCex44rXbKw_HlAtPkaW";

const supabaseClient =
    window.supabase
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const alive = p => p && p.alive;

const rand = arr =>
    arr[Math.floor(Math.random() * arr.length)];

const shuffle = arr =>
    [...arr].sort(() => Math.random() - 0.5);

const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c]));

function safeName(name, fallback) {
    return String(name || fallback)
        .trim()
        .slice(0, 20) || fallback;
}

function setScreen(id) {
    document.querySelectorAll(".screen").forEach(s =>
        s.classList.remove("active")
    );

    $(id)?.classList.add("active");

    window.scrollTo(0, 0);
}

function button(text, value, cls = "choice-button") {
    return `
        <button
            type="button"
            class="${cls}"
            data-value="${esc(value)}"
        >${text}</button>
    `;
}


/* =========================================================
   ROLES
   ========================================================= */

const ROLE_DATA = {
    alien: {
        icon: "👽",
        name: "Alien",
        team: "Hostile",
        desc: "Kill 1 player each round. If there is no living Saboteur, you may choose Kill or Sabotage. You can see the other Hostile players."
    },

    saboteur: {
        icon: "😈",
        name: "Saboteur",
        team: "Hostile",
        desc: "Sabotage 1 ship system each round. You can see the other Hostile players."
    },

    silencer: {
        icon: "🔇",
        name: "Silencer",
        team: "Hostile",
        desc: "Silence 1 living player for 2 rounds. They can still discuss and use their ability, but cannot vote. You can see the other Hostile players."
    },

    parasite: {
        icon: "🦠",
        name: "Parasite",
        team: "Hostile",
        desc: "Infect 1 player once. The infection progresses secretly until they become Diseased and eventually a Parasite."
    },

    engineer: {
        icon: "🔧",
        name: "Engineer",
        team: "Human",
        desc: "Repair 1 offline ship system each round. The Engineer can act even when Power is offline."
    },

    scientist: {
        icon: "🧪",
        name: "Scientist",
        team: "Human",
        desc: "Check a living player to see if they are Healthy, Infected, Diseased or Parasite. You may cure Infected or Diseased players."
    },

    detective: {
        icon: "🕵️",
        name: "Detective",
        team: "Human",
        desc: "Investigate a living player and learn what they interacted with last round."
    },

    medic: {
        icon: "🩺",
        name: "Medic",
        team: "Human",
        desc: "Protect one living player from being killed this round."
    },

    captain: {
        icon: "👨‍✈️",
        name: "Captain",
        team: "Human",
        desc: "If a vote ties, secretly choose which tied player is ejected. Power must be online."
    },

    guard: {
        icon: "🛡️",
        name: "Guard",
        team: "Human",
        desc: "Block one living player's ability for this round."
    },

    survivor: {
        icon: "👤",
        name: "Survivor",
        team: "Human",
        desc: "No special ability. Help the Human team survive."
    },

    radio: {
        icon: "📻",
        name: "Radio Operator",
        team: "Human",
        desc: "Choose to receive a private message from Earth each round while Communications is online."
    },

    judge: {
        icon: "⚖️",
        name: "Judge",
        team: "Human",
        desc: "Once per game, cancel a vote that would eject a player. Requires Power and a living Judge."
    },

    jester: {
        icon: "🃏",
        name: "Jester",
        team: "Neutral",
        desc: "Win if you are normally voted out."
    },

    king: {
        icon: "👑",
        name: "Survivor King",
        team: "Neutral",
        desc: "Win independently by being one of the final 2 living players."
    },

    trickster: {
        icon: "🎭",
        name: "Trickster",
        team: "Neutral",
        concept: true,
        desc: "Once per game, swap the displayed identities of two living players through voting."
    },

    infected: {
        icon: "🦠",
        name: "Infected",
        team: "Infection",
        sub: true,
        desc: "A hidden infection stage. The infected player does not know they are infected."
    },

    diseased: {
        icon: "☣️",
        name: "Diseased",
        team: "Hostile",
        sub: true,
        desc: "You know you are Diseased and on the Hostile Team. You cannot use an ability."
    }
};

const ROLE_KEYS = Object.keys(ROLE_DATA);

const HOSTILES = [
    "alien",
    "saboteur",
    "silencer",
    "parasite"
];

const HUMANS = [
    "engineer",
    "scientist",
    "detective",
    "medic",
    "captain",
    "guard",
    "survivor",
    "radio",
    "judge"
];

const NEUTRALS = [
    "jester",
    "king"
];

const CONCEPTS = [
    "trickster"
];

const HOSTILE_COUNTS = {
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
   SETTINGS
   ========================================================= */

let settings = {
    enabled: Object.fromEntries(
        [...HOSTILES, ...HUMANS, ...NEUTRALS, ...CONCEPTS]
            .map(role => [role, role !== "trickster"])
    ),

    counts: Object.fromEntries(
        [...HOSTILES, ...HUMANS, ...NEUTRALS, ...CONCEPTS]
            .map(role => [role, 0])
    )
};

settings.counts.engineer = 1;


/* =========================================================
   GAME STATE
   ========================================================= */

let game = {
    players: [],

    round: 1,
    stage: 1,

    abilityQueue: [],
    abilityIndex: 0,

    reactionQueue: [],
    reactionIndex: 0,

    roundStartAliveIds: [],

    actions: {},
    previousActions: {},

    blockedPlayers: new Set(),
    protectedPlayers: new Set(),

    silencedUntil: {},

    votes: {},
    currentVoteIndex: 0,

    selectedAction: null,
    selectedVote: null,

    randomisedRoles: false,
    randomRoles: {},

    reactionInfo: {},
    lastRoundResults: [],

    lifelineNumber: 0,

    gameOver: false,
    voteResolutionDone: false,

    tricksterUsed: false,
    displaySwap: null,

    judgeUsed: false,

    systems: {
        engines: true,
        o2: true,
        communications: true,
        power: true
    }
};


/* =========================================================
   BASIC GAME FUNCTIONS
   ========================================================= */

function teamClass(team) {
    if (team === "Human") return "human";
    if (team === "Hostile") return "hostile";
    if (team === "Neutral") return "neutral";
    return "infection";
}

function roleTeam(role) {
    if (role === "infected") return "Human";
    if (role === "diseased") return "Hostile";

    return ROLE_DATA[role]?.team || "Human";
}

function isHostile(player) {
    return alive(player) && roleTeam(player.role) === "Hostile";
}

function isNeutral(player) {
    return alive(player) && roleTeam(player.role) === "Neutral";
}

function isHuman(player) {
    return alive(player) && roleTeam(player.role) === "Human";
}

function getPlayer(id) {
    return game.players.find(p => p.id === id);
}

function living() {
    return game.players.filter(alive);
}

function realName(id) {
    return getPlayer(id)?.name || "";
}

function displayMap() {
    const map = {};

    living().forEach(player => {
        map[player.id] = player.id;
    });

    if (game.displaySwap) {
        const [a, b] = game.displaySwap;

        if (map[a] && map[b]) {
            map[a] = b;
            map[b] = a;
        }
    }

    return map;
}

function displayName(id) {
    const mapped = displayMap()[id];

    return realName(mapped || id);
}

function targetOptions(actor = null, excludeId = null) {
    return living()
        .filter(player => {
            if (player.id === excludeId) return false;

            if (
                actor &&
                roleTeam(actor.role) === "Hostile" &&
                isHostile(player) &&
                !(
                    game.displaySwap &&
                    game.displaySwap.includes(player.id)
                )
            ) {
                return false;
            }

            return true;
        })
        .map(player => ({
            id: player.id,
            label: displayName(player.id)
        }));
}

function resetTransient() {
    game.actions = {};
    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();
    game.selectedAction = null;
    game.reactionInfo = {};
}

function canAct(player) {
    if (!alive(player)) return false;

    if (player.role === "engineer") return true;

    if (
        player.role === "infected" ||
        player.role === "diseased" ||
        player.role === "survivor" ||
        player.role === "jester" ||
        player.role === "king"
    ) {
        return false;
    }

    if (!game.systems.power) return false;

    if (game.blockedPlayers.has(player.id)) return false;

    if (player.role === "judge" && game.judgeUsed) {
        return false;
    }

    return true;
}


/* =========================================================
   SETUP
   ========================================================= */

function showSetup() {
    setScreen("setupScreen");
    renderSetup();
}

function renderSetup() {
    const container = $("playersSetup");

    if (!container) return;

    container.innerHTML = game.players.map((player, index) => `
        <div class="setup-player">

            <label class="player-name-section">
                Player ${index + 1}

                <input
                    class="player-name-input"
                    type="text"
                    maxlength="20"
                    value="${esc(player.name || `Player ${index + 1}`)}"
                    data-name-index="${index}"
                    autocomplete="off"
                    autocapitalize="words"
                    spellcheck="false"
                    placeholder="Player ${index + 1}"
                >
            </label>

            <label>
                Role

                <select
                    class="role-select ${
                        game.randomisedRoles && game.randomRoles[index]
                            ? "random-hidden"
                            : ""
                    }"
                    data-index="${index}"
                >

                    <option value="random">🎲 RANDOM</option>

                    ${
                        [...HOSTILES, ...HUMANS, ...NEUTRALS, ...CONCEPTS]
                            .filter(role =>
                                settings.enabled[role] ||
                                role === "engineer"
                            )
                            .map(role => `
                                <option value="${role}">
                                    ${ROLE_DATA[role].icon}
                                    ${ROLE_DATA[role].name}
                                </option>
                            `)
                            .join("")
                    }

                </select>
            </label>

        </div>
    `).join("");

    bindSetupNames();
    bindSetupSelects();
    updatePlayerValidity();
}

function bindSetupNames() {
    document.querySelectorAll(".player-name-input").forEach(input => {
        input.oninput = () => {
            const index = Number(input.dataset.nameIndex);

            if (game.players[index]) {
                game.players[index].name =
                    safeName(input.value, `Player ${index + 1}`);
            }
        };
    });
}

function bindSetupSelects() {
    document.querySelectorAll(".role-select").forEach(select => {
        select.onchange = () => {
            const index = Number(select.dataset.index);
            const value = select.value;

            if (value === "random") {
                return;
            }

            game.randomisedRoles = true;
            game.randomRoles[index] = value;

            select.value = "random";
            select.classList.add("random-hidden");
        };
    });
}

function resetSetupPlayers() {
    const count = Number($("playerCount")?.value || 8);

    game.players = Array.from(
        { length: count },
        (_, index) => ({
            id: `p${index + 1}`,
            name: `Player ${index + 1}`,
            role: "survivor",
            originalRole: "survivor",
            alive: true,
            infectionRound: null,
            hasInfected: false
        })
    );

    game.randomisedRoles = false;
    game.randomRoles = {};

    renderSetup();
}

function updatePlayerValidity() {
    const element = $("playerValidity");

    if (!element) return;

    const total =
        Object.values(settings.counts)
            .reduce((sum, value) => sum + value, 0);

    element.textContent =
        `PLAYERS: ${game.players.length} / ${game.players.length} • ` +
        (
            total
                ? `CUSTOM ROLES: ${total} / ${game.players.length}`
                : "RANDOM ROLES"
        );
}


/* =========================================================
   RANDOM ROLES
   ========================================================= */

function weightedPick(items, weights) {
    const total =
        items.reduce(
            (sum, role) => sum + (weights[role] || 0),
            0
        );

    let roll = Math.random() * total;

    for (const role of items) {
        roll -= weights[role] || 0;

        if (roll < 0) {
            return role;
        }
    }

    return items[items.length - 1];
}

function randomiseRoles() {
    const count = game.players.length;
    const hostileCount = HOSTILE_COUNTS[count];

    if (!hostileCount) return;

    const enabledHostiles =
        HOSTILES.filter(role => settings.enabled[role]);

    if (enabledHostiles.length < hostileCount) {
        alert(
            "Enable enough Hostile roles to fill the random setup."
        );
        return;
    }

    let roles = [];

    roles.push(
        ...shuffle(enabledHostiles).slice(0, hostileCount)
    );

    roles.push("engineer");

    const humansNeeded =
        count - hostileCount - 1;

    let humanPool =
        HUMANS.filter(role =>
            role !== "engineer" &&
            settings.enabled[role]
        );

    if (humanPool.length < humansNeeded) {
        alert(
            "Enable enough Human roles to fill the random setup."
        );
        return;
    }

    for (let i = 0; i < humansNeeded; i++) {
        const chosen =
            weightedPick(humanPool, HUMAN_WEIGHTS);

        roles.push(chosen);

        humanPool =
            humanPool.filter(role => role !== chosen);
    }

    const neutralSlots =
        count - roles.length;

    if (neutralSlots > 0) {
        const neutralPool =
            [...NEUTRALS, ...CONCEPTS]
                .filter(role => settings.enabled[role]);

        if (neutralPool.length < neutralSlots) {
            alert(
                "Enable enough Neutral roles to fill the setup."
            );
            return;
        }

        roles.push(
            ...shuffle(neutralPool)
                .slice(0, neutralSlots)
        );
    }

    roles = shuffle(roles);

    game.randomRoles =
        Object.fromEntries(
            roles.map((role, index) => [index, role])
        );

    game.randomisedRoles = true;

    renderSetup();
}


/* =========================================================
   START LOCAL GAME
   ========================================================= */

function startGame() {
    if (ONLINE.mode === "online" && ONLINE.role === "host") {
        return onlineHostStart();
    }

    document.querySelectorAll(".player-name-input")
        .forEach((input, index) => {
            if (game.players[index]) {
                game.players[index].name =
                    safeName(
                        input.value,
                        `Player ${index + 1}`
                    );
            }
        });

    const count = game.players.length;
    const hostileCount = HOSTILE_COUNTS[count];

    let roles = game.randomisedRoles
        ? Array.from(
            { length: count },
            (_, index) => game.randomRoles[index]
        )
        : game.players.map(player => player.role);

    if (
        roles.includes("random") ||
        roles.some(role => !role)
    ) {
        alert(
            "Press RANDOMISE ROLES or choose all roles first."
        );
        return;
    }

    const roleCounts = {};

    roles.forEach(role => {
        roleCounts[role] =
            (roleCounts[role] || 0) + 1;
    });

    if (roleCounts.engineer !== 1) {
        alert("There must be exactly 1 Engineer.");
        return;
    }

    const actualHostiles =
        HOSTILES.reduce(
            (sum, role) =>
                sum + (roleCounts[role] || 0),
            0
        );

    if (actualHostiles !== hostileCount) {
        alert(
            `This setup needs exactly ${hostileCount} Hostile role(s).`
        );
        return;
    }

    const valid =
        roles.every(role =>
            ROLE_DATA[role] &&
            !ROLE_DATA[role].sub &&
            (
                settings.enabled[role] ||
                role === "engineer"
            )
        );

    if (!valid) {
        alert("A disabled role is selected.");
        return;
    }

    game.players.forEach((player, index) => {
        player.role = roles[index];
        player.originalRole = roles[index];
        player.alive = true;
        player.infectionRound = null;
        player.hasInfected = false;
    });

    game.round = 1;
    game.stage = 1;
    game.lifelineNumber = 0;
    game.gameOver = false;
    game.judgeUsed = false;
    game.tricksterUsed = false;
    game.displaySwap = null;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    resetTransient();

    startRound();
}


/* =========================================================
   ROUND
   ========================================================= */

function startRound() {
    if (checkVictory()) return;

    resetTransient();

    game.roundStartAliveIds =
        living().map(player => player.id);

    game.previousActions =
        { ...game.actions };

    game.actions = {};

    game.abilityQueue =
        [...game.roundStartAliveIds];

    game.abilityIndex = 0;

    passToAbility();
}

function passToAbility() {
    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {
        return resolveAbilities();
    }

    const player =
        getPlayer(
            game.abilityQueue[game.abilityIndex]
        );

    if (!player) {
        game.abilityIndex++;
        return passToAbility();
    }

    if (ONLINE.mode === "online" && ONLINE.role === "host") {
        if (player.id !== "p1") {
            return onlinePromptAbility(player);
        }
    }

    $("passPlayerName").textContent =
        player.name;

    $("passRound").textContent =
        `ROUND ${game.round} • STAGE ${game.stage} / 10`;

    $("passSubtext").textContent =
        "PASS THE PHONE TO THIS PLAYER";

    setScreen("passScreen");
}

function showRole() {
    const player =
        getPlayer(
            game.abilityQueue[game.abilityIndex]
        );

    if (!player) return;

    $("rolePlayerName").textContent =
        player.name;

    $("roleIcon").textContent =
        ROLE_DATA[player.role]?.icon || "❓";

    $("roleName").textContent =
        ROLE_DATA[player.role]?.name ||
        player.role;

    const team =
        roleTeam(player.role);

    $("roleName").className =
        `role-title ${teamClass(team)}`;

    $("roleTeam").textContent =
        `${team.toUpperCase()} TEAM`;

    $("roleTeam").className =
        `team-badge ${teamClass(team)}`;

    $("roleDescription").textContent =
        ROLE_DATA[player.role]?.desc || "";

    $("hostileList").innerHTML = "";

    if (team === "Hostile") {
        const allies =
            living().filter(
                other =>
                    other.id !== player.id &&
                    isHostile(other)
            );

        $("hostileList").innerHTML =
            allies.length
                ? `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong><br>
                        ${
                            allies
                                .map(
                                    ally =>
                                        `${ROLE_DATA[ally.role].icon} ${esc(ally.name)}`
                                )
                                .join("<br>")
                        }
                    </div>
                  `
                : `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong><br>
                        None
                    </div>
                  `;
    }

    setScreen("roleScreen");
}


/* =========================================================
   ABILITIES
   ========================================================= */

function showAction() {
    const player =
        getPlayer(
            game.abilityQueue[game.abilityIndex]
        );

    if (!player) return;

    $("actionTitle").textContent =
        `${ROLE_DATA[player.role]?.icon || ""} ${ROLE_DATA[player.role]?.name || ""}`;

    $("actionDescription").textContent = "";
    $("actionOptions").innerHTML = "";

    game.selectedAction = null;

    if (!canAct(player)) {
        $("actionDescription").textContent =
            player.role === "diseased"
                ? "You are Diseased. You cannot use an ability."
                : player.role === "infected"
                    ? "You are Infected. You do not know about the infection and have no ability."
                    : "Your ability cannot be used this round.";

        $("confirmActionButton").textContent =
            "CONTINUE";

        $("confirmActionButton").onclick =
            completeAbility;

        setScreen("actionScreen");
        return;
    }

    if (player.role === "alien") {
        const saboteurAlive =
            living().some(
                other => other.role === "saboteur"
            );

        $("actionDescription").textContent =
            saboteurAlive
                ? "A living Saboteur exists. You must kill."
                : "Choose Kill or Sabotage.";

        $("actionOptions").innerHTML = `
            <div class="button-row">
                <button
                    type="button"
                    class="choice-button"
                    data-alien-action="kill"
                >☠️ KILL</button>

                ${
                    saboteurAlive
                        ? ""
                        : `
                            <button
                                type="button"
                                class="choice-button"
                                data-alien-action="sabotage"
                            >💥 SABOTAGE</button>
                          `
                }
            </div>
        `;

        const chooseAlien =
            action => {
                game.selectedAction =
                    action;

                $("actionOptions")
                    .querySelectorAll("[data-alien-action]")
                    .forEach(button =>
                        button.classList.toggle(
                            "selected",
                            button.dataset.alienAction === action
                        )
                    );

                if (action === "kill") {
                    renderTargetChoices(
                        player,
                        null,
                        "kill"
                    );
                } else {
                    renderSystemChoices(false);
                }
            };

        $("actionOptions")
            .querySelectorAll("[data-alien-action]")
            .forEach(button =>
                button.onclick = () =>
                    chooseAlien(
                        button.dataset.alienAction
                    )
            );

        if (saboteurAlive) {
            chooseAlien("kill");
        }

    } else if (player.role === "saboteur") {
        renderSystemChoices(false);

    } else if (player.role === "silencer") {
        renderTargetChoices(
            player,
            null,
            "silence"
        );

    } else if (player.role === "parasite") {
        if (player.hasInfected) {
            $("actionDescription").textContent =
                "You already used your infection.";

            game.selectedAction = "none";
        } else {
            renderTargetChoices(
                player,
                null,
                "infect"
            );
        }

    } else if (player.role === "engineer") {
        renderSystemChoices(true);

    } else if (player.role === "scientist") {
        renderScientistChoices(player);

    } else if (player.role === "detective") {
        renderTargetChoices(
            player,
            null,
            "detect"
        );

    } else if (player.role === "medic") {
        renderTargetChoices(
            player,
            null,
            "protect"
        );

    } else if (player.role === "guard") {
        renderTargetChoices(
            player,
            null,
            "block"
        );

    } else if (player.role === "radio") {
        if (!game.systems.communications) {
            $("actionDescription").textContent =
                "Communications is OFFLINE.";

            game.selectedAction = "none";
        } else {
            $("actionDescription").textContent =
                "Choose whether to receive a private message from Earth.";

            $("actionOptions").innerHTML =
                button(
                    "📻 RECEIVE EARTH MESSAGE",
                    "radio"
                );
        }

    } else if (player.role === "captain") {
        $("actionDescription").textContent =
            "Your ability activates automatically if the vote ties.";

        game.selectedAction = "none";

    } else if (player.role === "judge") {
        $("actionDescription").textContent =
            game.judgeUsed
                ? "You have already used your Judge ability."
                : "Your ability activates when a vote would eject a player.";

        game.selectedAction = "none";

    } else if (player.role === "trickster") {
        if (game.tricksterUsed) {
            $("actionDescription").textContent =
                "You already used your Trickster ability.";

            game.selectedAction = "none";
        } else {
            renderSwapChoices(player);
        }

    } else {
        $("actionDescription").textContent =
            "No ability.";

        game.selectedAction = "none";
    }

    $("actionOptions")
        .querySelectorAll(".choice-button")
        .forEach(button => {
            button.onclick = () => {
                if (
                    button.dataset.value === "radio"
                ) {
                    game.selectedAction = "radio";
                }
            };
        });

    $("confirmActionButton").textContent =
        "CONFIRM";

    $("confirmActionButton").onclick =
        completeAbility;

    setScreen("actionScreen");
}

function renderTargetChoices(player, unused, action) {
    const descriptions = {
        kill: "Choose a player to kill.",
        silence: "Choose a player to silence for 2 rounds.",
        infect: "Choose a player to infect.",
        detect: "Choose a player to investigate.",
        protect: "Choose a player to protect.",
        block: "Choose a player whose ability to block."
    };

    $("actionDescription").textContent =
        descriptions[action] || "Choose a player.";

    $("actionOptions").innerHTML =
        targetOptions(player)
            .map(option =>
                button(
                    option.label,
                    option.id
                )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () => {
                game.selectedAction =
                    JSON.stringify({
                        type: action,
                        target: button.dataset.value
                    });

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(other =>
                        other.classList.remove("selected")
                    );

                button.classList.add("selected");
            };
        });
}

function renderSystemChoices(engineer = false) {
    const systems =
        engineer
            ? Object.keys(game.systems)
                .filter(system => !game.systems[system])
            : Object.keys(game.systems);

    if (!systems.length) {
        $("actionDescription").textContent =
            "No systems are offline.";

        game.selectedAction = "none";
        return;
    }

    $("actionDescription").textContent =
        engineer
            ? "Choose an offline system to repair."
            : "Choose a ship system to sabotage.";

    $("actionOptions").innerHTML =
        systems
            .map(system =>
                button(
                    `${game.systems[system] ? "🟢" : "🔴"} ${system.toUpperCase()}`,
                    system
                )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () => {
                game.selectedAction =
                    JSON.stringify({
                        type: engineer
                            ? "repair"
                            : "sabotage",
                        system: button.dataset.value
                    });

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(other =>
                        other.classList.remove("selected")
                    );

                button.classList.add("selected");
            };
        });
}

function renderScientistChoices(player) {
    $("actionDescription").textContent =
        "Choose a living player to investigate.";

    $("actionOptions").innerHTML =
        targetOptions(player)
            .map(option =>
                button(
                    option.label,
                    option.id
                )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () => {
                const target =
                    getPlayer(button.dataset.value);

                if (!target) return;

                $("actionOptions").innerHTML = `
                    ${button(
                        "🔬 CHECK",
                        "check"
                    )}

                    ${
                        target.role === "infected" ||
                        target.role === "diseased"
                            ? button(
                                "💉 CURE",
                                "cure"
                            )
                            : ""
                    }
                `;

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(actionButton => {
                        actionButton.onclick = () => {
                            game.selectedAction =
                                JSON.stringify({
                                    type: "science",
                                    target: target.id,
                                    mode:
                                        actionButton.dataset.value
                                });

                            $("actionOptions")
                                .querySelectorAll("button")
                                .forEach(other =>
                                    other.classList.remove(
                                        "selected"
                                    )
                                );

                            actionButton.classList.add(
                                "selected"
                            );
                        };
                    });
            };
        });
}

function renderSwapChoices() {
    const ids =
        living().map(player => player.id);

    $("actionDescription").textContent =
        "Choose TWO living players whose displayed identities will be swapped.";

    $("actionOptions").innerHTML =
        ids
            .map(id =>
                button(
                    displayName(id),
                    id
                )
            )
            .join("");

    let chosen = [];

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () => {
                const id =
                    button.dataset.value;

                if (chosen.includes(id)) {
                    chosen =
                        chosen.filter(
                            value => value !== id
                        );

                    button.classList.remove(
                        "selected"
                    );

                } else if (chosen.length < 2) {
                    chosen.push(id);
                    button.classList.add(
                        "selected"
                    );
                }

                game.selectedAction =
                    chosen.length === 2
                        ? JSON.stringify({
                            type: "swap",
                            a: chosen[0],
                            b: chosen[1]
                        })
                        : null;
            };
        });
}


/* =========================================================
   ABILITY RESOLUTION
   ========================================================= */

function completeAbility() {
    const player =
        getPlayer(
            game.abilityQueue[game.abilityIndex]
        );

    if (!player) {
        game.abilityIndex++;
        return passToAbility();
    }

    let action =
        game.selectedAction;

    if (
        typeof action === "string" &&
        action.startsWith("{")
    ) {
        try {
            action = JSON.parse(action);
        } catch {
            action = "none";
        }
    }

    if (!action) {
        action = "none";
    }

    game.actions[player.id] =
        typeof action === "object"
            ? action
            : { type: action };

    applyImmediateAction(
        player,
        game.actions[player.id]
    );

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicState();
    }

    game.abilityIndex++;

    passToAbility();
}

function applyImmediateAction(player, action) {
    if (!action) return;

    if (
        action.type === "repair" &&
        game.systems[action.system] === false
    ) {
        game.systems[action.system] = true;
    }

    if (
        action.type === "sabotage" &&
        Object.prototype.hasOwnProperty.call(
            game.systems,
            action.system
        )
    ) {
        game.systems[action.system] = false;
    }

    if (action.type === "protect") {
        game.protectedPlayers.add(
            action.target
        );
    }

    if (action.type === "block") {
        game.blockedPlayers.add(
            action.target
        );
    }

    if (action.type === "silence") {
        game.silencedUntil[action.target] =
            Math.max(
                game.silencedUntil[action.target] || 0,
                game.round + 2
            );
    }

    if (action.type === "swap") {
        if (
            !game.tricksterUsed &&
            action.a &&
            action.b &&
            action.a !== action.b
        ) {
            game.displaySwap = [
                action.a,
                action.b
            ];

            game.tricksterUsed = true;
        }
    }

    if (action.type === "infect") {
        if (player.hasInfected) return;

        const target =
            getPlayer(action.target);

        if (
            target &&
            alive(target) &&
            target.id !== player.id &&
            !target.infectionRound
        ) {
            player.hasInfected = true;

            target.infectionRound =
                game.round;

            target.originalRole =
                target.role;

            target.role =
                "infected";

            target.hasInfected = false;

            /*
             * IMPORTANT:
             * No infection message is shown.
             *
             * The infected player DOES NOT know.
             */
        }
    }

    if (action.type === "science") {
        const target =
            getPlayer(action.target);

        if (!target) return;

        const status =
            target.role === "infected"
                ? "Infected"
                : target.role === "diseased"
                    ? "Diseased"
                    : target.role === "parasite"
                        ? "Parasite"
                        : "Healthy";

        if (action.mode === "cure") {
            if (
                target.role === "infected" ||
                target.role === "diseased"
            ) {
                target.role = "survivor";
                target.originalRole = "survivor";
                target.infectionRound = null;
                target.hasInfected = false;

                game.reactionInfo[player.id] =
                    `SCIENCE: ${target.name} was cured and is now a Survivor.`;

                game.reactionInfo[target.id] =
                    "You were cured by the Scientist and are now a Survivor.";

                return;
            }
        }

        game.reactionInfo[player.id] =
            `SCIENCE: ${target.name} is ${status}.`;
    }

    if (action.type === "detect") {
        const target =
            getPlayer(action.target);

        if (target) {
            game.reactionInfo[player.id] =
                detectiveMessage(
                    target,
                    game.previousActions[target.id]
                );
        }
    }

    if (action.type === "radio") {
        if (game.systems.communications) {
            game.reactionInfo[player.id] =
                randomRadioMessage();
        }
    }
}

function resolveAbilities() {
    const kills =
        Object.entries(game.actions)
            .filter(
                ([, action]) =>
                    action.type === "kill"
            );

    for (const [actorId, action] of kills) {
        const actor =
            getPlayer(actorId);

        const target =
            getPlayer(action.target);

        if (
            !actor ||
            !target ||
            !alive(actor) ||
            !alive(target)
        ) {
            continue;
        }

        if (
            game.blockedPlayers.has(actor.id)
        ) {
            continue;
        }

        if (
            game.protectedPlayers.has(target.id)
        ) {
            game.reactionInfo[target.id] =
                "You were attacked, but the Medic protected you.";
            continue;
        }

        target.alive = false;

        game.lastRoundResults.push(
            `${target.name} was killed.`
        );

        game.reactionInfo[target.id] =
            "You were killed this round.";
    }

    for (const player of game.players) {
        if (
            !player.alive ||
            !player.infectionRound
        ) {
            continue;
        }

        const age =
            game.round -
            player.infectionRound +
            1;

        if (
            age === 2 &&
            player.role === "infected"
        ) {
            player.role = "diseased";

            game.reactionInfo[player.id] =
                "You became DISEASED. You are on the HOSTILE TEAM.";

        } else if (
            age >= 3 &&
            player.role === "diseased"
        ) {
            player.role = "parasite";
            player.hasInfected = false;

            game.reactionInfo[player.id] =
                "You became a PARASITE. You are on the HOSTILE TEAM.";
        }
    }

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicState();
    }

    showReactions();
}

function detectiveMessage(target, action) {
    if (!action || action.type === "none") {
        return `${target.name} had no interaction last round.`;
    }

    if (action.type === "radio") {
        return `${target.name} interacted with Communications.`;
    }

    if (action.target) {
        return `${target.name} interacted with ${displayName(action.target)}.`;
    }

    if (action.system) {
        return `${target.name} interacted with ${action.system.toUpperCase()}.`;
    }

    if (action.type === "swap") {
        return `${target.name} interacted with ${displayName(action.a)} and ${displayName(action.b)}.`;
    }

    return `${target.name} had an interaction last round.`;
}

function randomRadioMessage() {
    const messages = [
        "EARTH: There are exactly 2 hostiles remaining.",
        "EARTH: One living player is hostile.",
        "EARTH: A ship system was recently tampered with.",
        "EARTH: Communications is stable. Stay alert.",
        "EARTH: We detected hostile activity somewhere on the ship."
    ];

    return rand(messages);
}


/* =========================================================
   REACTION
   ========================================================= */

function showReactions() {
    game.reactionQueue =
        [...game.roundStartAliveIds]
            .filter(id => getPlayer(id));

    game.reactionIndex = 0;

    nextReaction();
}

function nextReaction() {
    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {
        return showDiscussion();
    }

    const player =
        getPlayer(
            game.reactionQueue[game.reactionIndex]
        );

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host" &&
        player.id !== "p1"
    ) {
        return onlinePromptReaction(player);
    }

    $("reactionRound").textContent =
        `ROUND ${game.round}`;

    $("reactionStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("reactionPlayerName").textContent =
        player.name;

    $("reactionReadyButton").textContent =
        "SHOW MY RESULT";

    setScreen("reactionScreen");
}

function showReactionResult() {
    const player =
        getPlayer(
            game.reactionQueue[game.reactionIndex]
        );

    if (!player) return;

    $("reactionResultTitle").textContent =
        player.alive
            ? "ROUND RESULT"
            : "YOU DIED THIS ROUND";

    let message =
        game.reactionInfo[player.id];

    if (!message) {
        if (
            game.silencedUntil[player.id] &&
            game.silencedUntil[player.id] >
                game.round
        ) {
            message =
                `You have been silenced for ${
                    game.silencedUntil[player.id] -
                    game.round
                } more round(s). You cannot vote.`;
        } else {
            message =
                "Nothing happened to you this round.";
        }
    }

    $("reactionResultMessage").textContent =
        message;

    setScreen("reactionResultScreen");
}

function advanceReaction() {
    game.reactionIndex++;

    nextReaction();
}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {
    $("discussionRound").textContent =
        `ROUND ${game.round}`;

    $("discussionStage").textContent =
        `STAGE ${game.stage} / 10`;

    const systems =
        Object.entries(game.systems)
            .map(
                ([system, online]) =>
                    `${online ? "🟢" : "🔴"} ${system.toUpperCase()}`
            )
            .join("  ");

    $("roundResults").innerHTML = `
        <p>
            ${
                game.lastRoundResults.length
                    ? game.lastRoundResults
                        .map(esc)
                        .join("<br>")
                    : "No deaths this round."
            }
        </p>

        <p>${systems}</p>

        ${
            game.displaySwap
                ? `
                    <p class="warning">
                        🎭 Displayed identities are currently swapped until voting is resolved.
                    </p>
                  `
                : ""
        }
    `;

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicMessage(
            `DISCUSSION: Round ${game.round} is ready.`
        );
    }

    setScreen("discussionScreen");
}


/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {
    game.votes = {};
    game.currentVoteIndex = 0;
    game.voteResolutionDone = false;

    showVote();
}

function showVote() {
    const players =
        living();

    if (
        game.currentVoteIndex >=
        players.length
    ) {
        return resolveVoting();
    }

    const voter =
        players[game.currentVoteIndex];

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host" &&
        voter.id !== "p1"
    ) {
        return onlinePromptVote(voter);
    }

    $("votingRound").textContent =
        `ROUND ${game.round}`;

    $("votingStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("voterName").textContent =
        voter.name;

    const silenced =
        (game.silencedUntil[voter.id] || 0) >
        game.round;

    $("votingSilenced").textContent =
        silenced
            ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
            : "";

    const options =
        silenced
            ? [
                button(
                    "SKIP (SILENCED)",
                    "skip"
                )
            ]
            : [
                ...living()
                    .filter(
                        player =>
                            player.id !== voter.id
                    )
                    .map(player =>
                        button(
                            displayName(player.id),
                            player.id
                        )
                    ),

                button(
                    "⏭️ SKIP",
                    "skip"
                )
            ];

    $("voteOptions").innerHTML =
        options.join("");

    game.selectedVote = null;

    $("voteOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () => {
                game.selectedVote =
                    button.dataset.value;

                $("voteOptions")
                    .querySelectorAll("button")
                    .forEach(other =>
                        other.classList.remove(
                            "selected"
                        )
                    );

                button.classList.add(
                    "selected"
                );
            };
        });

    $("confirmVoteButton").onclick =
        confirmVote;

    setScreen("votingScreen");
}

function confirmVote() {
    const voter =
        living()[game.currentVoteIndex];

    if (!voter || !game.selectedVote) {
        return;
    }

    game.votes[voter.id] =
        game.selectedVote;

    game.currentVoteIndex++;

    showVote();
}

function resolveVoting() {
    const tally = {};

    Object.values(game.votes)
        .forEach(vote => {
            if (vote === "skip") return;

            tally[vote] =
                (tally[vote] || 0) + 1;
        });

    const max =
        Math.max(
            0,
            ...Object.values(tally)
        );

    const tied =
        Object.keys(tally)
            .filter(
                id =>
                    tally[id] === max &&
                    max > 0
            );

    if (tied.length === 1) {
        return finishEjection(
            tied[0],
            false
        );
    }

    if (tied.length > 1) {
        const captain =
            living().find(
                player =>
                    player.role === "captain" &&
                    game.systems.power &&
                    !game.blockedPlayers.has(
                        player.id
                    )
            );

        if (captain) {
            return showCaptainTie(
                tied,
                captain
            );
        }
    }

    finishEjection(null, false);
}

function showCaptainTie(tied, captain) {
    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host" &&
        captain.id !== "p1"
    ) {
        return onlinePromptCaptain(
            captain,
            tied
        );
    }

    $("captainTieOptions").innerHTML =
        `
            <p>
                Choose one tied player to eject.
            </p>

            ${
                tied
                    .map(id =>
                        button(
                            displayName(id),
                            id
                        )
                    )
                    .join("")
            }
        `;

    $("captainTieOptions")
        .querySelectorAll("button")
        .forEach(button => {
            button.onclick = () =>
                finishEjection(
                    button.dataset.value,
                    true
                );
        });

    setScreen("captainTieScreen");
}

function finishEjection(id, byCaptain) {
    if (id) {
        const judge =
            living().find(
                player =>
                    player.role === "judge" &&
                    !game.judgeUsed &&
                    game.systems.power &&
                    !game.blockedPlayers.has(
                        player.id
                    )
            );

        /*
         * Judge can cancel ANY vote that would
         * eject someone.
         *
         * If Judge cancels a Jester vote,
         * Jester does not win.
         */

        if (judge) {
            game.judgeUsed = true;

            $("voteResultTitle").textContent =
                "EJECTION CANCELLED";

            $("voteResultMessage").textContent =
                "The Judge cancelled the ejection. Nobody was voted out.";

            $("afterVoteButton").onclick =
                afterVoting;

            setScreen("voteResultScreen");

            if (
                ONLINE.mode === "online" &&
                ONLINE.role === "host"
            ) {
                broadcastPublicMessage(
                    "The Judge cancelled the ejection."
                );
            }

            return;
        }

        const player =
            getPlayer(id);

        if (player) {
            player.alive = false;

            if (player.role === "jester") {
                $("voteResultTitle").textContent =
                    "JESTER WINS";

                $("voteResultMessage").textContent =
                    `${player.name} was voted out and wins as the Jester!`;

                game.gameOver = true;

            } else {
                $("voteResultTitle").textContent =
                    "PLAYER VOTED OUT";

                $("voteResultMessage").textContent =
                    `${player.name} was voted out.`;
            }
        }

    } else {
        $("voteResultTitle").textContent =
            "NO EJECTION";

        $("voteResultMessage").textContent =
            "Nobody was voted out.";
    }

    $("afterVoteButton").onclick =
        afterVoting;

    setScreen("voteResultScreen");

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicState();

        if (game.gameOver) {
            broadcastGameOver(
                $("voteResultTitle").textContent,
                $("voteResultMessage").textContent
            );
        }
    }
}

function afterVoting() {
    game.displaySwap = null;

    if (game.gameOver) {
        return showGameOver();
    }

    if (
        checkVictory()
    ) {
        return;
    }

    if (game.round % 3 === 0) {
        if (game.systems.communications) {
            game.lifelineNumber++;
            return showLifeline();
        }

        return proceedToSystems();
    }

    proceedToSystems();
}


/* =========================================================
   EARTH / SYSTEMS
   ========================================================= */

function showLifeline() {
    const hostiles =
        living().filter(isHostile);

    const others =
        living().filter(
            player => !isHostile(player)
        );

    const pool = [];

    if (hostiles.length) {
        pool.push(
            ...shuffle(hostiles).slice(0, 1)
        );
    }

    pool.push(
        ...shuffle(others).slice(0, 2)
    );

    const message =
        pool.length
            ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${pool.map(p => p.name).join(", ")}`
            : "Earth sent no useful clue.";

    $("lifelineTitle").textContent =
        `EARTH LIFELINE #${game.lifelineNumber}`;

    $("lifelineMessage").textContent =
        message;

    $("lifelineContinue").onclick =
        proceedToSystems;

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicMessage(
            message
        );
    }

    setScreen("lifelineScreen");
}

function proceedToSystems() {
    if (game.systems.engines) {
        game.stage++;
    }

    if (game.stage > 10) {
        return earthCheck();
    }

    $("systemsRound").textContent =
        `ROUND ${game.round}`;

    $("systemsStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("systemsList").innerHTML =
        Object.entries(game.systems)
            .map(
                ([system, online]) =>
                    `
                    <div>
                        ${online ? "🟢" : "🔴"}
                        <strong>${system.toUpperCase()}</strong>
                        —
                        ${online ? "ONLINE" : "OFFLINE"}
                    </div>
                    `
            )
            .join("");

    $("nextRoundButton").onclick = () => {
        game.round++;
        game.lastRoundResults = [];
        startRound();
    };

    setScreen("systemsScreen");

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastPublicState();
    }
}

function earthCheck() {
    const neutrals =
        living().filter(isNeutral);

    if (neutrals.length) {
        endGame(
            "NEUTRAL VICTORY",
            "The ship reached Earth with a Neutral player still alive."
        );

    } else {
        endGame(
            "HUMAN VICTORY",
            "The crew completed all 10 stages and reached Earth."
        );
    }
}

function checkVictory() {
    if (game.gameOver) return true;

    const hostiles =
        living().filter(isHostile).length;

    const nonHostiles =
        living().filter(
            player => !isHostile(player)
        ).length;

    if (
        hostiles > 0 &&
        hostiles >= nonHostiles
    ) {
        endGame(
            "HOSTILE VICTORY",
            "The Hostile team now equals or outnumbers everyone else alive."
        );

        return true;
    }

    const neutrals =
        living().filter(isNeutral);

    if (
        living().length === 2 &&
        neutrals.some(
            player =>
                player.role === "king"
        )
    ) {
        const king =
            neutrals.find(
                player =>
                    player.role === "king"
            );

        endGame(
            "SURVIVOR KING WINS",
            `${king.name} is one of the final 2 living players.`
        );

        return true;
    }

    return false;
}

function endGame(title, message) {
    game.gameOver = true;

    $("gameOverTitle").textContent =
        title;

    $("gameOverMessage").textContent =
        message;

    $("finalPlayers").innerHTML =
        game.players
            .map(player => `
                <div class="${player.alive ? "" : "dead"}">
                    <strong>${esc(player.name)}</strong>
                    —
                    ${ROLE_DATA[player.role]?.icon || ""}
                    ${ROLE_DATA[player.role]?.name || player.role}
                    <span class="team-${teamClass(roleTeam(player.role))}">
                        [${roleTeam(player.role)}]
                    </span>
                    ${player.alive ? "ALIVE" : "DEAD"}
                </div>
            `)
            .join("");

    setScreen("gameOverScreen");

    if (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    ) {
        broadcastGameOver(
            title,
            message
        );
    }
}

function showGameOver() {
    endGame(
        $("voteResultTitle")?.textContent ||
            "GAME OVER",

        $("voteResultMessage")?.textContent ||
            "The game has ended."
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
    $(id)?.classList.add("open");
}

function closeModal(id) {
    $(id)?.classList.remove("open");
}

function renderRoleGuide() {
    const sections = [
        ["HOSTILE", [...HOSTILES, "diseased"]],
        ["HUMAN", HUMANS],
        ["NEUTRAL", NEUTRALS],
        ["INFECTION", ["infected", "diseased"]],
        ["ROLE CONCEPT", CONCEPTS]
    ];

    $("roleGuideContent").innerHTML =
        sections
            .map(
                ([title, roles]) =>
                    `
                    <section>
                        <h3>${title}</h3>

                        ${
                            roles
                                .map(role => `
                                    <article
                                        class="guide-card ${teamClass(ROLE_DATA[role].team)}"
                                    >
                                        <div class="guide-icon">
                                            ${ROLE_DATA[role].icon}
                                        </div>

                                        <div>
                                            <strong>
                                                ${ROLE_DATA[role].name}
                                            </strong>

                                            <div class="guide-team">
                                                ${ROLE_DATA[role].team}
                                            </div>

                                            <p>
                                                ${ROLE_DATA[role].desc}
                                            </p>
                                        </div>
                                    </article>
                                `)
                                .join("")
                        }
                    </section>
                    `
            )
            .join("");
}

function renderCustomRoles() {
    const groups = [
        ["HOSTILE", HOSTILES],
        ["HUMAN", HUMANS],
        ["NEUTRAL", NEUTRALS],
        ["ROLE CONCEPT", CONCEPTS]
    ];

    $("customRoleContent").innerHTML =
        groups
            .map(
                ([title, roles]) =>
                    `
                    <section>
                        <h3>${title}</h3>

                        ${
                            roles
                                .map(role => {
                                    const locked =
                                        role === "engineer";

                                    return `
                                        <div
                                            class="custom-row ${
                                                locked
                                                    ? "locked"
                                                    : ""
                                            }"
                                        >

                                            <span>
                                                ${ROLE_DATA[role].icon}
                                                ${ROLE_DATA[role].name}
                                            </span>

                                            <label>
                                                Count

                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    value="${
                                                        settings.counts[role] || 0
                                                    }"
                                                    data-role-count="${role}"
                                                    ${
                                                        locked
                                                            ? "readonly"
                                                            : ""
                                                    }
                                                >
                                            </label>

                                            <label class="switch">
                                                <input
                                                    type="checkbox"
                                                    data-role-enabled="${role}"
                                                    ${
                                                        settings.enabled[role] ||
                                                        locked
                                                            ? "checked"
                                                            : ""
                                                    }
                                                    ${
                                                        locked
                                                            ? "disabled"
                                                            : ""
                                                    }
                                                >

                                                <span>
                                                    Enabled
                                                </span>
                                            </label>

                                        </div>
                                    `;
                                })
                                .join("")
                        }
                    </section>
                    `
            )
            .join("");

    $("customRoleContent")
        .querySelectorAll("[data-role-enabled]")
        .forEach(input => {
            input.onchange = () => {
                const role =
                    input.dataset.roleEnabled;

                settings.enabled[role] =
                    input.checked;

                if (!input.checked) {
                    settings.counts[role] = 0;
                }

                renderCustomRoles();
                renderSetup();
            };
        });

    $("customRoleContent")
        .querySelectorAll("[data-role-count]")
        .forEach(input => {
            input.onchange = () => {
                const role =
                    input.dataset.roleCount;

                settings.counts[role] =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            Number(input.value) || 0
                        )
                    );

                if (
                    settings.counts[role] > 0
                ) {
                    settings.enabled[role] =
                        true;
                }

                updatePlayerValidity();
            };
        });
}

function applyCustomRoles() {
    const count =
        game.players.length;

    const selected = [];

    Object.entries(settings.counts)
        .forEach(([role, amount]) => {
            for (let i = 0; i < amount; i++) {
                selected.push(role);
            }
        });

    if (selected.length !== count) {
        alert(
            `Custom roles must total exactly ${count} players. Current total: ${selected.length}.`
        );
        return;
    }

    if (!selected.includes("engineer")) {
        alert("Engineer is required.");
        return;
    }

    const hostiles =
        selected.filter(
            role => HOSTILES.includes(role)
        ).length;

    if (
        hostiles !==
        HOSTILE_COUNTS[count]
    ) {
        alert(
            `You need exactly ${HOSTILE_COUNTS[count]} Hostile role(s).`
        );
        return;
    }

    game.randomRoles =
        Object.fromEntries(
            shuffle(selected)
                .map(
                    (role, index) =>
                        [index, role]
                )
        );

    game.randomisedRoles = true;

    renderSetup();

    closeModal("customRoleModal");
}


/* =========================================================
   ONLINE MODE
   ========================================================= */

const ONLINE = {
    mode: "local",

    role: null,

    roomCode: null,

    playerId: null,

    connectionId: null,

    name: "",

    channel: null,

    privateChannels: {},

    connected: false,

    hostStarted: false,

    assignedRole: null,

    waitingFor: null,

    peerConnections: {},

    clientConnections: {},

    publicState: null,

    uiReady: false,

    messageSeq: 0
};

function onlineId() {
    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}

function onlineCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 5; i++) {
        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];
    }

    return code;
}

function onlineIsHost() {
    return (
        ONLINE.mode === "online" &&
        ONLINE.role === "host"
    );
}

function onlineIsClient() {
    return (
        ONLINE.mode === "online" &&
        ONLINE.role === "client"
    );
}

function onlineStatus(text, good = false) {
    const element =
        $("onlineStatus");

    if (!element) return;

    element.textContent =
        text;

    element.className =
        `online-status ${good ? "good" : ""}`;
}

function onlineUi(html) {
    const element =
        $("onlineContent");

    if (element) {
        element.innerHTML =
            html;
    }
}

function onlineShowScreen() {
    setScreen("onlineScreen");
}

function buildOnlineUI() {
    if (
        ONLINE.uiReady ||
        !$("setupScreen")
    ) {
        return;
    }

    ONLINE.uiReady = true;

    const setup =
        $("setupScreen");

    const hero =
        setup.querySelector(".hero");

    if (hero) {
        const modeBar =
            document.createElement("div");

        modeBar.className =
            "panel online-mode-bar";

        modeBar.innerHTML = `
            <div class="online-mode-title">
                GAME MODE
            </div>

            <div class="button-row">

                <button
                    id="localModeButton"
                    type="button"
                    class="primary"
                >
                    📱 LOCAL MODE
                </button>

                <button
                    id="onlineModeButton"
                    type="button"
                    class="secondary"
                >
                    🌐 ONLINE MODE
                </button>

            </div>
        `;

        hero.insertAdjacentElement(
            "afterend",
            modeBar
        );
    }

    const onlinePanel =
        document.createElement("section");

    onlinePanel.id =
        "onlinePanel";

    onlinePanel.className =
        "panel";

    onlinePanel.style.display =
        "none";

    onlinePanel.innerHTML = `
        <h2>ONLINE MULTIPLAYER</h2>

        <p>
            Create a room or join a friend's room.
        </p>

        <label class="big-label">
            YOUR NAME

            <input
                id="onlineNameInput"
                type="text"
                maxlength="20"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
                placeholder="Your name"
            >
        </label>

        <div class="button-row">

            <button
                id="createRoomButton"
                type="button"
                class="primary"
            >
                👑 CREATE ROOM
            </button>

            <button
                id="joinRoomButton"
                type="button"
                class="secondary"
            >
                🚪 JOIN ROOM
            </button>

        </div>

        <div
            id="joinRoomBox"
            style="display:none;margin-top:12px"
        >

            <label class="big-label">
                ROOM CODE

                <input
                    id="roomCodeInput"
                    type="text"
                    maxlength="5"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck="false"
                    placeholder="ABCDE"
                    style="text-transform:uppercase"
                >
            </label>

            <button
                id="confirmJoinButton"
                type="button"
                class="primary full"
            >
                JOIN
            </button>

        </div>

        <div
            id="onlineStatus"
            class="online-status"
        ></div>
    `;

    setup.appendChild(
        onlinePanel
    );

    const screen =
        document.createElement("section");

    screen.id =
        "onlineScreen";

    screen.className =
        "screen";

    screen.innerHTML = `
        <div class="panel hero">

            <h1 id="onlineScreenTitle">
                ONLINE
            </h1>

            <p id="onlineScreenSub">
                Waiting…
            </p>

        </div>

        <div
            class="panel"
            id="onlineContent"
        ></div>
    `;

    document
        .querySelector("main.app")
        ?.appendChild(screen);

    $("localModeButton").onclick =
        () => setGameMode("local");

    $("onlineModeButton").onclick =
        () => setGameMode("online");

    $("createRoomButton").onclick =
        createOnlineRoom;

    $("joinRoomButton").onclick =
        () => {
            const box =
                $("joinRoomBox");

            box.style.display =
                box.style.display === "none"
                    ? "block"
                    : "none";
        };

    $("confirmJoinButton").onclick =
        joinOnlineRoom;

    $("onlineNameInput").oninput =
        event => {
            ONLINE.name =
                event.target.value
                    .trim()
                    .slice(0, 20);
        };

    $("roomCodeInput").oninput =
        event => {
            event.target.value =
                event.target.value
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]/g,
                        ""
                    )
                    .slice(0, 5);
        };
}

function setGameMode(mode) {
    buildOnlineUI();

    ONLINE.mode =
        mode;

    const localPanel =
        document.querySelector(
            "#setupScreen .panel:nth-of-type(2)"
        );

    const onlinePanel =
        $("onlinePanel");

    if (mode === "online") {
        if (localPanel) {
            localPanel.style.display =
                "none";
        }

        if (onlinePanel) {
            onlinePanel.style.display =
                "block";
        }

        $("localModeButton").className =
            "secondary";

        $("onlineModeButton").className =
            "primary";

        onlineStatus(
            "Create a room or join one."
        );

    } else {
        if (localPanel) {
            localPanel.style.display =
                "";
        }

        if (onlinePanel) {
            onlinePanel.style.display =
                "none";
        }

        $("localModeButton").className =
            "primary";

        $("onlineModeButton").className =
            "secondary";

        onlineLeave(false);

        showSetup();
    }
}


/* =========================================================
   ONLINE CONNECTION
   ========================================================= */

async function subscribeOnlineRoom() {
    if (
        !supabaseClient ||
        !ONLINE.roomCode
    ) {
        return false;
    }

    if (ONLINE.channel) {
        try {
            await supabaseClient.removeChannel(
                ONLINE.channel
            );
        } catch {}
    }

    ONLINE.channel =
        supabaseClient.channel(
            `alien-room-${ONLINE.roomCode}`,
            {
                config: {
                    broadcast: {
                        self: false
                    }
                }
            }
        );

    ONLINE.channel.on(
        "broadcast",
        {
            event: "alien"
        },
        event => {
            handleOnlineMessage(
                event.payload || event
            );
        }
    );

    const result =
        await ONLINE.channel.subscribe();

    if (result !== "SUBSCRIBED") {
        ONLINE.channel = null;

        onlineStatus(
            "Could not connect to Supabase."
        );

        return false;
    }

    return true;
}

async function subscribePrivate(key) {
    if (
        !supabaseClient ||
        !ONLINE.roomCode ||
        !key
    ) {
        return null;
    }

    if (
        ONLINE.privateChannels[key]
    ) {
        return ONLINE.privateChannels[key];
    }

    const channel =
        supabaseClient.channel(
            `alien-private-${ONLINE.roomCode}-${key}`,
            {
                config: {
                    broadcast: {
                        self: false
                    }
                }
            }
        );

    channel.on(
        "broadcast",
        {
            event: "secret"
        },
        event => {
            handleOnlinePrivateMessage(
                event.payload || event
            );
        }
    );

    const result =
        await channel.subscribe();

    if (result !== "SUBSCRIBED") {
        return null;
    }

    ONLINE.privateChannels[key] =
        channel;

    return channel;
}

function broadcastOnline(message) {
    if (!ONLINE.channel) return;

    const payload = {
        ...message,
        seq: ++ONLINE.messageSeq
    };

    ONLINE.channel.send({
        type: "broadcast",
        event: "alien",
        payload
    });
}

async function sendPrivateToConnection(
    connectionId,
    message
) {
    if (!connectionId) return;

    let channel =
        ONLINE.privateChannels[
            connectionId
        ];

    if (!channel) {
        channel =
            await subscribePrivate(
                connectionId
            );
    }

    if (!channel) return;

    channel.send({
        type: "broadcast",
        event: "secret",
        payload: message
    });
}


/* =========================================================
   CREATE ROOM
   ========================================================= */

async function createOnlineRoom() {
    if (!supabaseClient) {
        alert(
            "Supabase did not load. Make sure index.html loads the Supabase script before game.js."
        );
        return;
    }

    const name =
        safeName(
            $("onlineNameInput")?.value,
            ""
        );

    if (!name) {
        alert("Enter your name first.");
        return;
    }

    ONLINE.mode = "online";
    ONLINE.role = "host";
    ONLINE.name = name;
    ONLINE.roomCode = onlineCode();
    ONLINE.playerId = "p1";
    ONLINE.connectionId = "host";
    ONLINE.connected = false;
    ONLINE.hostStarted = false;

    game.players = [{
        id: "p1",
        name,
        role: "survivor",
        originalRole: "survivor",
        alive: true,
        infectionRound: null,
        hasInfected: false
    }];

    const connected =
        await subscribeOnlineRoom();

    if (!connected) {
        return;
    }

    await subscribePrivate("host");

    ONLINE.connected = true;

    localStorage.setItem(
        "alienOnlineRoom",
        JSON.stringify({
            roomCode: ONLINE.roomCode,
            playerId: "p1",
            name,
            role: "host"
        })
    );

    renderHostLobby();

    broadcastOnline({
        type: "room_state",
        players: onlinePublicPlayers(),
        started: false
    });
}


/* =========================================================
   JOIN ROOM
   ========================================================= */

async function joinOnlineRoom() {
    if (!supabaseClient) {
        alert(
            "Supabase did not load. Make sure index.html loads the Supabase script before game.js."
        );
        return;
    }

    const name =
        safeName(
            $("onlineNameInput")?.value,
            ""
        );

    const code =
        (
            $("roomCodeInput")?.value ||
            ""
        )
            .trim()
            .toUpperCase();

    if (!name) {
        alert("Enter your name first.");
        return;
    }

    if (code.length !== 5) {
        alert(
            "Enter the 5-character room code."
        );
        return;
    }

    ONLINE.mode = "online";
    ONLINE.role = "client";
    ONLINE.name = name;
    ONLINE.roomCode = code;

    ONLINE.connectionId =
        `c-${onlineId()}`;

    ONLINE.playerId =
        null;

    const connected =
        await subscribeOnlineRoom();

    if (!connected) {
        return;
    }

    await subscribePrivate(
        ONLINE.connectionId
    );

    ONLINE.connected = true;

    localStorage.setItem(
        "alienOnlineRoom",
        JSON.stringify({
            roomCode: code,
            playerId: null,
            connectionId:
                ONLINE.connectionId,
            name,
            role: "client"
        })
    );

    onlineShowScreen();

    $("onlineScreenTitle").textContent =
        "JOINING ROOM";

    $("onlineScreenSub").textContent =
        `ROOM ${code}`;

    onlineUi(`
        <p>
            Asking the host to let you in…
        </p>

        <div class="online-spinner">
            ⏳
        </div>
    `);

    broadcastOnline({
        type: "join_request",
        connectionId:
            ONLINE.connectionId,
        name
    });
}


/* =========================================================
   ONLINE PLAYER LIST
   ========================================================= */

function onlinePublicPlayers() {
    return game.players.map(
        player => ({
            id: player.id,
            name: player.name,
            alive: !!player.alive
        })
    );
}


/* =========================================================
   HOST ACCEPTS PLAYER
   ========================================================= */

async function hostAcceptPlayer(message) {
    if (!onlineIsHost()) return;

    if (ONLINE.hostStarted) {
        return sendPrivateToConnection(
            message.connectionId,
            {
                type: "reject",
                message:
                    "The game has already started."
            }
        );
    }

    if (game.players.length >= 12) {
        return sendPrivateToConnection(
            message.connectionId,
            {
                type: "reject",
                message:
                    "The room is full."
            }
        );
    }

    const name =
        safeName(
            message.name,
            "Player"
        );

    if (
        game.players.some(
            player =>
                player.name.toLowerCase() ===
                name.toLowerCase()
        )
    ) {
        return sendPrivateToConnection(
            message.connectionId,
            {
                type: "reject",
                message:
                    "That name is already taken."
            }
        );
    }

    const playerId =
        `p${game.players.length + 1}`;

    game.players.push({
        id: playerId,
        name,
        role: "survivor",
        originalRole: "survivor",
        alive: true,
        infectionRound: null,
        hasInfected: false
    });

    ONLINE.clientConnections[playerId] =
        message.connectionId;

    await subscribePrivate(
        message.connectionId
    );

    await sendPrivateToConnection(
        message.connectionId,
        {
            type: "accepted",
            playerId,
            name,
            roomCode:
                ONLINE.roomCode
        }
    );

    broadcastOnline({
        type: "room_state",
        players:
            onlinePublicPlayers(),
        started: false
    });

    renderHostLobby();
}


/* =========================================================
   HOST LOBBY
   ========================================================= */

function renderHostLobby() {
    onlineShowScreen();

    $("onlineScreenTitle").textContent =
        "ROOM LOBBY";

    $("onlineScreenSub").textContent =
        `ROOM CODE: ${ONLINE.roomCode}`;

    const rows =
        game.players
            .map(
                (player, index) =>
                    `
                    <div class="online-player-row">
                        <strong>
                            ${
                                index === 0
                                    ? "👑 "
                                    : ""
                            }
                            ${esc(player.name)}
                        </strong>

                        <span>
                            ${
                                index === 0
                                    ? "HOST"
                                    : "CONNECTED"
                            }
                        </span>
                    </div>
                    `
            )
            .join("");

    onlineUi(`
        <div class="online-room-code">
            ${esc(ONLINE.roomCode)}
        </div>

        <p>
            Send this code to the other players.
        </p>

        <div class="online-player-list">
            ${rows}
        </div>

        <hr>

        <p>
            <strong>
                Players: ${game.players.length}/12
            </strong>
        </p>

        <button
            id="onlineSetupButton"
            type="button"
            class="secondary full"
        >
            ⚙️ SET ROLES & START SETUP
        </button>

        <button
            id="onlineStartButton"
            type="button"
            class="primary full"
            ${
                game.players.length < 4
                    ? "disabled"
                    : ""
            }
        >
            🚀 START ONLINE GAME
        </button>

        <button
            id="onlineLeaveButton"
            type="button"
            class="secondary full"
        >
            LEAVE ROOM
        </button>
    `);

    $("onlineSetupButton").onclick =
        onlineHostSetup;

    $("onlineStartButton").onclick =
        onlineHostStart;

    $("onlineLeaveButton").onclick =
        () => onlineLeave(true);
}


/* =========================================================
   ONLINE HOST SETUP
   ========================================================= */

function onlineHostSetup() {
    setScreen("setupScreen");

    ONLINE.mode = "online";
    ONLINE.role = "host";

    const localPanel =
        document.querySelector(
            "#setupScreen .panel:nth-of-type(2)"
        );

    if (localPanel) {
        localPanel.style.display = "";
    }

    $("onlinePanel").style.display =
        "none";

    $("playerCount").value =
        String(game.players.length);

    renderSetup();

    const title =
        document.querySelector(
            "#setupScreen h2"
        );

    if (title) {
        title.textContent =
            "ONLINE GAME SETUP";
    }

    let notice =
        $("onlineSetupNotice");

    if (!notice) {
        notice =
            document.createElement("div");

        notice.id =
            "onlineSetupNotice";

        notice.className =
            "validity";

        $("playersSetup")
            ?.insertAdjacentElement(
                "beforebegin",
                notice
            );
    }

    notice.innerHTML =
        `
            🌐 ONLINE ROOM
            <strong>
                ${esc(ONLINE.roomCode)}
            </strong>
            • ${game.players.length} players connected
        `;

    $("startGameButton").textContent =
        "🚀 START ONLINE GAME";
}


/* =========================================================
   ONLINE HOST START
   ========================================================= */

async function onlineHostStart() {
    if (game.players.length < 4) {
        alert(
            "You need at least 4 connected players."
        );
        return;
    }

    document
        .querySelectorAll(".player-name-input")
        .forEach((input, index) => {
            if (game.players[index]) {
                game.players[index].name =
                    safeName(
                        input.value,
                        `Player ${index + 1}`
                    );
            }
        });

    const count =
        game.players.length;

    const hostileCount =
        HOSTILE_COUNTS[count];

    let roles =
        game.randomisedRoles
            ? Array.from(
                { length: count },
                (_, index) =>
                    game.randomRoles[index]
            )
            : game.players.map(
                player => player.role
            );

    if (
        roles.includes("random") ||
        roles.some(role => !role)
    ) {
        alert(
            "Press RANDOMISE ROLES or select every role."
        );
        return;
    }

    const roleCounts = {};

    roles.forEach(role => {
        roleCounts[role] =
            (roleCounts[role] || 0) + 1;
    });

    if (roleCounts.engineer !== 1) {
        alert(
            "There must be exactly 1 Engineer."
        );
        return;
    }

    const hostileTotal =
        HOSTILES.reduce(
            (sum, role) =>
                sum +
                (roleCounts[role] || 0),
            0
        );

    if (
        hostileTotal !== hostileCount
    ) {
        alert(
            `This setup needs exactly ${hostileCount} Hostile role(s).`
        );
        return;
    }

    const valid =
        roles.every(role =>
            ROLE_DATA[role] &&
            !ROLE_DATA[role].sub &&
            (
                settings.enabled[role] ||
                role === "engineer"
            )
        );

    if (!valid) {
        alert(
            "A disabled role is selected."
        );
        return;
    }

    game.players.forEach(
        (player, index) => {
            player.role =
                roles[index];

            player.originalRole =
                roles[index];

            player.alive = true;

            player.infectionRound =
                null;

            player.hasInfected =
                false;
        }
    );

    game.round = 1;
    game.stage = 1;
    game.lifelineNumber = 0;
    game.gameOver = false;
    game.judgeUsed = false;
    game.tricksterUsed = false;
    game.displaySwap = null;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    resetTransient();

    ONLINE.hostStarted =
        true;

    broadcastOnline({
        type: "game_start",
        players:
            onlinePublicPlayers()
    });

    /*
     * Send each player their secret role
     * through their private channel.
     */
    for (const player of game.players) {
        if (player.id === "p1") {
            continue;
        }

        const connection =
            ONLINE.clientConnections[
                player.id
            ];

        if (!connection) {
            continue;
        }

        await sendPrivateToConnection(
            connection,
            {
                type: "role_assignment",
                playerId: player.id,
                name: player.name,
                role: player.role
            }
        );
    }

    /*
     * Host is player 1 and plays locally.
     */
    setScreen("passScreen");

    startRound();
}


/* =========================================================
   ONLINE HOST ABILITY PROMPT
   ========================================================= */

async function onlinePromptAbility(player) {
    const connection =
        ONLINE.clientConnections[
            player.id
        ];

    if (!connection) {
        /*
         * If a player disconnected,
         * skip their turn rather than
         * permanently freezing the game.
         */
        game.actions[player.id] = {
            type: "none"
        };

        game.abilityIndex++;

        return passToAbility();
    }

    const allies =
        roleTeam(player.role) === "Hostile"
            ? living()
                .filter(
                    other =>
                        other.id !== player.id &&
                        isHostile(other)
                )
                .map(
                    other => ({
                        id: other.id,
                        name: other.name,
                        role: other.role
                    })
                )
            : [];

    await sendPrivateToConnection(
        connection,
        {
            type: "ability_prompt",
            playerId: player.id,
            round: game.round,
            stage: game.stage,
            role: player.role,
            systems: {
                ...game.systems
            },
            players:
                onlinePublicPlayers(),
            allies,
            hasInfected:
                !!player.hasInfected
        }
    );

    onlineShowHostWaiting(
        `Waiting for ${player.name}'s ability…`
    );
}


/* =========================================================
   ONLINE HOST REACTION
   ========================================================= */

async function onlinePromptReaction(player) {
    const connection =
        ONLINE.clientConnections[
            player.id
        ];

    if (!connection) {
        game.reactionIndex++;
        return nextReaction();
    }

    await sendPrivateToConnection(
        connection,
        {
            type: "reaction_prompt",
            playerId: player.id,
            round: game.round,
            alive: player.alive
        }
    );

    onlineShowHostWaiting(
        `Waiting for ${player.name}'s reaction…`
    );
}


/* =========================================================
   ONLINE HOST VOTE
   ========================================================= */

async function onlinePromptVote(player) {
    const connection =
        ONLINE.clientConnections[
            player.id
        ];

    if (!connection) {
        game.votes[player.id] =
            "skip";

        game.currentVoteIndex++;

        return showVote();
    }

    await sendPrivateToConnection(
        connection,
        {
            type: "vote_prompt",
            playerId: player.id,
            round: game.round,
            players:
                onlinePublicPlayers(),
            silenced:
                (
                    game.silencedUntil[player.id] ||
                    0
                ) > game.round
        }
    );

    onlineShowHostWaiting(
        `Waiting for ${player.name}'s vote…`
    );
}


/* =========================================================
   ONLINE HOST CAPTAIN
   ========================================================= */

async function onlinePromptCaptain(
    captain,
    tied
) {
    const connection =
        ONLINE.clientConnections[
            captain.id
        ];

    if (!connection) {
        finishEjection(
            tied[0],
            true
        );

        return;
    }

    await sendPrivateToConnection(
        connection,
        {
            type: "captain_prompt",
            playerId: captain.id,
            tied,
            names:
                Object.fromEntries(
                    tied.map(
                        id => [
                            id,
                            displayName(id)
                        ]
                    )
                )
        }
    );

    onlineShowHostWaiting(
        `Waiting for Captain ${captain.name}…`
    );
}


/* =========================================================
   ONLINE CLIENT ROLE
   ========================================================= */

function clientReceiveRole(message) {
    if (
        message.playerId &&
        ONLINE.playerId !==
            message.playerId
    ) {
        ONLINE.playerId =
            message.playerId;
    }

    ONLINE.assignedRole =
        message.role;

    localStorage.setItem(
        "alienOnlineRoom",
        JSON.stringify({
            roomCode:
                ONLINE.roomCode,
            playerId:
                ONLINE.playerId,
            connectionId:
                ONLINE.connectionId,
            name:
                ONLINE.name,
            role:
                "client"
        })
    );

    $("onlineScreenTitle").textContent =
        "YOUR ROLE";

    $("onlineScreenSub").textContent =
        `ROOM ${ONLINE.roomCode}`;

    const role =
        ROLE_DATA[
            message.role
        ];

    onlineUi(`
        <div class="role-reveal-online">

            <div class="guide-icon">
                ${role?.icon || "❓"}
            </div>

            <h2>
                ${esc(role?.name || message.role)}
            </h2>

            <p>
                ${esc(role?.desc || "")}
            </p>

            <p>
                <strong>
                    ${esc(
                        roleTeam(message.role)
                            .toUpperCase()
                    )}
                    TEAM
                </strong>
            </p>

            <button
                id="onlineRoleReady"
                type="button"
                class="primary full"
            >
                I'M READY
            </button>

        </div>
    `);

    onlineShowScreen();

    $("onlineRoleReady").onclick =
        () => {
            broadcastOnline({
                type: "client_ready",
                playerId:
                    ONLINE.playerId
            });

            $("onlineRoleReady").disabled =
                true;

            $("onlineRoleReady").textContent =
                "READY ✓";
        };
}


/* =========================================================
   ONLINE CLIENT ABILITY UI
   ========================================================= */

function clientReceiveAbility(message) {
    if (
        message.playerId !==
        ONLINE.playerId
    ) {
        return;
    }

    ONLINE.waitingFor = {
        type: "ability",
        round: message.round
    };

    const role =
        message.role;

    $("onlineScreenTitle").textContent =
        `ROUND ${message.round} • ABILITY`;

    $("onlineScreenSub").textContent =
        `${ROLE_DATA[role]?.icon || ""} ${ROLE_DATA[role]?.name || role}`;

    let html = `
        <p>
            ${esc(
                ROLE_DATA[role]?.desc || ""
            )}
        </p>
    `;

    if (
        message.allies?.length
    ) {
        html += `
            <div class="ally-box">
                <strong>
                    HOSTILE ALLIES
                </strong>
                <br>

                ${
                    message.allies
                        .map(
                            ally =>
                                `${ROLE_DATA[ally.role]?.icon || ""} ${esc(ally.name)}`
                        )
                        .join("<br>")
                }
            </div>
        `;
    }

    html += `
        <div id="onlineActionOptions"></div>

        <button
            id="onlineConfirmAction"
            type="button"
            class="primary full"
        >
            CONFIRM
        </button>
    `;

    onlineUi(html);
    onlineShowScreen();

    renderClientAbility(
        message
    );
}

function onlineClientButtons(items) {
    return items
        .map(
            item =>
                `
                <button
                    type="button"
                    class="choice-button"
                    data-online-value="${esc(item.id)}"
                >
                    ${item.label}
                </button>
                `
        )
        .join("");
}

function renderClientAbility(message) {
    const box =
        $("onlineActionOptions");

    if (!box) return;

    const role =
        message.role;

    const players =
        (message.players || [])
            .filter(
                player =>
                    player.alive
            );

    const targets =
        players
            .filter(
                player =>
                    player.id !==
                    ONLINE.playerId
            )
            .map(
                player => ({
                    id: player.id,
                    label:
                        esc(player.name)
                })
            );

    let selected =
        null;

    const setSelected =
        value => {
            selected =
                value;

            box
                .querySelectorAll(
                    "button"
                )
                .forEach(button => {
                    button.classList.toggle(
                        "selected",
                        button.dataset.onlineValue ===
                            value
                    );
                });
        };

    function finish() {
        if (
            !selected &&
            ![
                "captain",
                "judge",
                "survivor",
                "jester",
                "king",
                "diseased",
                "infected"
            ].includes(role)
        ) {
            alert(
                "Choose an action first."
            );

            return;
        }

        if (!selected) {
            selected =
                "none";
        }

        sendClientAction(
            selected
        );

        $("onlineConfirmAction").disabled =
            true;

        $("onlineConfirmAction").textContent =
            "WAITING…";
    }

    if (role === "alien") {
        let mode = null;

        box.innerHTML = `
            <p>
                Choose an action.
            </p>

            <div class="button-row">

                <button
                    type="button"
                    class="choice-button"
                    data-kind="kill"
                >
                    ☠️ KILL
                </button>

                ${
                    !(
                        message.players || []
                    ).some(
                        player =>
                            player.alive &&
                            player.role ===
                                "saboteur"
                    )
                        ? `
                            <button
                                type="button"
                                class="choice-button"
                                data-kind="sabotage"
                            >
                                💥 SABOTAGE
                            </button>
                          `
                        : ""
                }

            </div>

            <div id="onlineTargetBox"></div>
        `;

        const renderTargets =
            () => {
                const targetBox =
                    $("onlineTargetBox");

                if (!targetBox) return;

                if (mode === "kill") {
                    targetBox.innerHTML =
                        onlineClientButtons(
                            targets
                        );
                }

                if (
                    mode === "sabotage"
                ) {
                    targetBox.innerHTML =
                        onlineClientButtons(
                            Object.keys(
                                message.systems || {}
                            ).map(
                                system => ({
                                    id: system,
                                    label:
                                        `${message.systems[system] ? "🟢" : "🔴"} ${system.toUpperCase()}`
                                })
                            )
                        );
                }

                targetBox
                    .querySelectorAll(
                        "button"
                    )
                    .forEach(button => {
                        button.onclick =
                            () => {
                                selected =
                                    mode === "kill"
                                        ? {
                                            type: "kill",
                                            target:
                                                button.dataset.onlineValue
                                        }
                                        : {
                                            type: "sabotage",
                                            system:
                                                button.dataset.onlineValue
                                        };

                                targetBox
                                    .querySelectorAll(
                                        "button"
                                    )
                                    .forEach(
                                        other =>
                                            other.classList.remove(
                                                "selected"
                                            )
                                    );

                                button.classList.add(
                                    "selected"
                                );
                            };
                    });
            };

        box
            .querySelectorAll(
                "[data-kind]"
            )
            .forEach(button => {
                button.onclick =
                    () => {
                        mode =
                            button.dataset.kind;

                        box
                            .querySelectorAll(
                                "[data-kind]"
                            )
                            .forEach(
                                other =>
                                    other.classList.remove(
                                        "selected"
                                    )
                            );

                        button.classList.add(
                            "selected"
                        );

                        renderTargets();
                    };
            });

    } else if (role === "saboteur") {
        box.innerHTML =
            onlineClientButtons(
                Object.keys(
                    message.systems || {}
                ).map(
                    system => ({
                        id: system,
                        label:
                            `${message.systems[system] ? "🟢" : "🔴"} ${system.toUpperCase()}`
                    })
                )
            );

        box
            .querySelectorAll("button")
            .forEach(button =>
                button.onclick =
                    () =>
                        setSelected({
                            type:
                                "sabotage",
                            system:
                                button.dataset.onlineValue
                        })
            );

    } else if (role === "silencer") {
        box.innerHTML =
            onlineClientButtons(
                targets
            );

        box
            .querySelectorAll("button")
            .forEach(button =>
                button.onclick =
                    () =>
                        setSelected({
                            type:
                                "silence",
                            target:
                                button.dataset.onlineValue
                        })
            );

    } else if (role === "parasite") {
        if (message.hasInfected) {
            box.innerHTML =
                "<p>You already used your infection.</p>";

            selected =
                "none";
        } else {
            box.innerHTML =
                onlineClientButtons(
                    targets
                );

            box
                .querySelectorAll("button")
                .forEach(button =>
                    button.onclick =
                        () =>
                            setSelected({
                                type:
                                    "infect",
                                target:
                                    button.dataset.onlineValue
                            })
                );
        }

    } else if (role === "engineer") {
        const offline =
            Object.keys(
                message.systems || {}
            )
                .filter(
                    system =>
                        !message.systems[
                            system
                        ]
                );

        if (!offline.length) {
            box.innerHTML =
                "<p>No systems are offline.</p>";

            selected =
                "none";
        } else {
            box.innerHTML =
                onlineClientButtons(
                    offline.map(
                        system => ({
                            id: system,
                            label:
                                `🔧 REPAIR ${system.toUpperCase()}`
                        })
                    )
                );

            box
                .querySelectorAll("button")
                .forEach(button =>
                    button.onclick =
                        () =>
                            setSelected({
                                type:
                                    "repair",
                                system:
                                    button.dataset.onlineValue
                            })
                );
        }

    } else if (
        role === "scientist"
    ) {
        box.innerHTML =
            onlineClientButtons(
                targets
            );

        box
            .querySelectorAll("button")
            .forEach(button => {
                button.onclick =
                    () => {
                        const targetId =
                            button.dataset.onlineValue;

                        box.innerHTML = `
                            <p>
                                Choose what to do.
                            </p>

                            ${onlineClientButtons([
                                {
                                    id: "check",
                                    label: "🔬 CHECK"
                                },
                                {
                                    id: "cure",
                                    label: "💉 CURE IF INFECTED"
                                }
                            ])}
                        `;

                        box
                            .querySelectorAll(
                                "button"
                            )
                            .forEach(actionButton =>
                                actionButton.onclick =
                                    () =>
                                        setSelected({
                                            type:
                                                "science",
                                            target:
                                                targetId,
                                            mode:
                                                actionButton.dataset.onlineValue
                                        })
                            );
                    };
            });

    } else if (
        [
            "detective",
            "medic",
            "guard"
        ].includes(role)
    ) {
        const type =
            {
                detective:
                    "detect",
                medic:
                    "protect",
                guard:
                    "block"
            }[role];

        box.innerHTML =
            onlineClientButtons(
                targets
            );

        box
            .querySelectorAll("button")
            .forEach(button =>
                button.onclick =
                    () =>
                        setSelected({
                            type,
                            target:
                                button.dataset.onlineValue
                        })
            );

    } else if (role === "radio") {
        if (
            message.systems
                ?.communications
        ) {
            box.innerHTML =
                onlineClientButtons([
                    {
                        id: "radio",
                        label:
                            "📻 RECEIVE EARTH MESSAGE"
                    }
                ]);

            box
                .querySelector("button")
                ?.click();

            selected =
                "radio";
        } else {
            box.innerHTML =
                "<p>Communications is OFFLINE.</p>";

            selected =
                "none";
        }

    } else if (role === "trickster") {
        let chosen = [];

        box.innerHTML =
            `
                <p>
                    Choose TWO living players.
                </p>

                ${onlineClientButtons(
                    players.map(
                        player => ({
                            id:
                                player.id,
                            label:
                                esc(
                                    player.name
                                )
                        })
                    )
                )}
            `;

        box
            .querySelectorAll("button")
            .forEach(button => {
                button.onclick =
                    () => {
                        const id =
                            button.dataset.onlineValue;

                        if (
                            chosen.includes(
                                id
                            )
                        ) {
                            chosen =
                                chosen.filter(
                                    value =>
                                        value !== id
                                );

                            button.classList.remove(
                                "selected"
                            );

                        } else if (
                            chosen.length < 2
                        ) {
                            chosen.push(id);

                            button.classList.add(
                                "selected"
                            );
                        }

                        selected =
                            chosen.length === 2
                                ? {
                                    type:
                                        "swap",
                                    a:
                                        chosen[0],
                                    b:
                                        chosen[1]
                                }
                                : null;
                    };
            });

    } else {
        selected =
            "none";
    }

    $("onlineConfirmAction").onclick =
        finish;
}

function sendClientAction(action) {
    broadcastOnline({
        type: "action_submit",
        playerId:
            ONLINE.playerId,
        action
    });
}


/* =========================================================
   ONLINE CLIENT REACTION
   ========================================================= */

function clientReceiveReactionPrompt(
    message
) {
    $("onlineScreenTitle").textContent =
        `ROUND ${message.round} • REACTION`;

    $("onlineScreenSub").textContent =
        message.alive
            ? "Your private result is ready."
            : "You died this round.";

    onlineUi(`
        <p>
            Tap below to reveal your result.
        </p>

        <button
            id="onlineShowReaction"
            type="button"
            class="primary full"
        >
            SHOW MY RESULT
        </button>
    `);

    onlineShowScreen();

    $("onlineShowReaction").onclick =
        () => {
            broadcastOnline({
                type:
                    "reaction_request",
                playerId:
                    ONLINE.playerId
            });

            $("onlineShowReaction").disabled =
                true;
        };
}

function clientReceiveReactionResult(
    message
) {
    $("onlineScreenTitle").textContent =
        `ROUND ${message.round} • RESULT`;

    $("onlineScreenSub").textContent =
        message.alive
            ? "Round result"
            : "You died this round.";

    onlineUi(`
        <div class="panel-in-panel">
            <p>
                ${esc(
                    message.message ||
                    "Nothing happened to you this round."
                )}
            </p>
        </div>

        <button
            id="onlineReactionContinue"
            type="button"
            class="primary full"
        >
            CONTINUE
        </button>
    `);

    onlineShowScreen();

    $("onlineReactionContinue").onclick =
        () => {
            broadcastOnline({
                type:
                    "reaction_continue",
                playerId:
                    ONLINE.playerId
            });

            $("onlineReactionContinue").disabled =
                true;
        };
}


/* =========================================================
   ONLINE CLIENT VOTING
   ========================================================= */

function clientReceiveVotePrompt(
    message
) {
    const options =
        message.silenced
            ? [
                {
                    id: "skip",
                    label:
                        "SKIP (SILENCED)"
                }
            ]
            : [
                ...(message.players || [])
                    .filter(
                        player =>
                            player.alive &&
                            player.id !==
                                ONLINE.playerId
                    )
                    .map(
                        player => ({
                            id:
                                player.id,
                            label:
                                esc(
                                    player.name
                                )
                        })
                    ),

                {
                    id: "skip",
                    label:
                        "⏭️ SKIP"
                }
            ];

    $("onlineScreenTitle").textContent =
        `ROUND ${message.round} • VOTING`;

    $("onlineScreenSub").textContent =
        message.silenced
            ? "🔇 YOU ARE SILENCED"
            : "Choose who to vote for.";

    onlineUi(`
        <div id="onlineVoteOptions">
            ${onlineClientButtons(options)}
        </div>

        <button
            id="onlineConfirmVote"
            type="button"
            class="primary full"
        >
            CONFIRM VOTE
        </button>
    `);

    onlineShowScreen();

    let selected =
        null;

    $("onlineVoteOptions")
        .querySelectorAll("button")
        .forEach(button =>
            button.onclick =
                () => {
                    selected =
                        button.dataset.onlineValue;

                    $("onlineVoteOptions")
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            other =>
                                other.classList.remove(
                                    "selected"
                                )
                        );

                    button.classList.add(
                        "selected"
                    );
                }
        );

    $("onlineConfirmVote").onclick =
        () => {
            if (!selected) {
                alert(
                    "Choose a vote first."
                );
                return;
            }

            broadcastOnline({
                type:
                    "vote_submit",
                playerId:
                    ONLINE.playerId,
                vote:
                    selected
            });

            $("onlineConfirmVote").disabled =
                true;

            $("onlineConfirmVote").textContent =
                "VOTE SENT ✓";
        };
}


/* =========================================================
   ONLINE CLIENT CAPTAIN
   ========================================================= */

function clientReceiveCaptainPrompt(
    message
) {
    $("onlineScreenTitle").textContent =
        "CAPTAIN TIE-BREAK";

    $("onlineScreenSub").textContent =
        "Choose one tied player to eject.";

    onlineUi(`
        <p>
            Choose one tied player.
        </p>

        <div id="onlineCaptainOptions">
            ${
                (message.tied || [])
                    .map(
                        id =>
                            button(
                                esc(
                                    message.names?.[id] ||
                                    id
                                ),
                                id
                            )
                    )
                    .join("")
            }
        </div>

        <button
            id="onlineCaptainConfirm"
            type="button"
            class="primary full"
        >
            CONFIRM
        </button>
    `);

    onlineShowScreen();

    let selected =
        null;

    $("onlineCaptainOptions")
        .querySelectorAll("button")
        .forEach(button =>
            button.onclick =
                () => {
                    selected =
                        button.dataset.value;

                    $("onlineCaptainOptions")
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            other =>
                                other.classList.remove(
                                    "selected"
                                )
                        );

                    button.classList.add(
                        "selected"
                    );
                }
        );

    $("onlineCaptainConfirm").onclick =
        () => {
            if (!selected) return;

            broadcastOnline({
                type:
                    "captain_submit",
                playerId:
                    ONLINE.playerId,
                target:
                    selected
            });

            $("onlineCaptainConfirm").disabled =
                true;

            $("onlineCaptainConfirm").textContent =
                "SENT ✓";
        };
}


/* =========================================================
   ONLINE CLIENT LOBBY
   ========================================================= */

function clientReceiveRoomState(
    message
) {
    if (
        !onlineIsClient()
    ) {
        return;
    }

    if (message.started) {
        return;
    }

    const me =
        (message.players || [])
            .find(
                player =>
                    player.id ===
                    ONLINE.playerId
            );

    $("onlineScreenTitle").textContent =
        "ROOM LOBBY";

    $("onlineScreenSub").textContent =
        `ROOM ${ONLINE.roomCode}`;

    onlineUi(`
        <p>
            Connected as
            <strong>
                ${esc(me?.name || ONLINE.name)}
            </strong>
        </p>

        <div class="online-player-list">
            ${
                (message.players || [])
                    .map(
                        player =>
                            `
                            <div class="online-player-row">
                                <strong>
                                    ${
                                        player.id === "p1"
                                            ? "👑 "
                                            : ""
                                    }
                                    ${esc(player.name)}
                                </strong>

                                <span>
                                    ${
                                        player.id === "p1"
                                            ? "HOST"
                                            : "PLAYER"
                                    }
                                </span>
                            </div>
                            `
                    )
                    .join("")
            }
        </div>

        <p>
            Waiting for the host to start…
        </p>

        <button
            id="clientLeaveRoomButton"
            type="button"
            class="secondary full"
        >
            LEAVE ROOM
        </button>
    `);

    onlineShowScreen();

    $("clientLeaveRoomButton").onclick =
        () => onlineLeave(true);
}


/* =========================================================
   ONLINE PUBLIC STATE
   ========================================================= */

function broadcastPublicState() {
    if (!onlineIsHost()) return;

    broadcastOnline({
        type: "public_state",

        players:
            onlinePublicPlayers(),

        systems:
            { ...game.systems },

        round:
            game.round,

        stage:
            game.stage
    });
}

function broadcastPublicMessage(
    message
) {
    if (!onlineIsHost()) return;

    broadcastOnline({
        type:
            "public_message",
        message
    });
}

function broadcastGameOver(
    title,
    message
) {
    if (!onlineIsHost()) return;

    broadcastOnline({
        type:
            "game_over",
        title,
        message
    });
}


/* =========================================================
   ONLINE MESSAGE HANDLER
   ========================================================= */

function handleOnlineMessage(
    message
) {
    if (
        !message ||
        !ONLINE.connected
    ) {
        return;
    }

    if (
        message.type ===
            "join_request" &&
        onlineIsHost()
    ) {
        return hostAcceptPlayer(
            message
        );
    }

    if (
        message.type ===
            "room_state" &&
        onlineIsClient()
    ) {
        return clientReceiveRoomState(
            message
        );
    }

    if (
        message.type ===
            "game_start" &&
        onlineIsClient()
    ) {
        ONLINE.hostStarted = true;

        $("onlineScreenTitle").textContent =
            "GAME STARTING";

        $("onlineScreenSub").textContent =
            `ROOM ${ONLINE.roomCode}`;

        onlineUi(`
            <p>
                🚀 The game has started.
            </p>

            <p>
                Waiting for your private role…
            </p>
        `);

        onlineShowScreen();

        return;
    }

    if (
        message.type ===
            "client_ready" &&
        onlineIsHost()
    ) {
        return;
    }

    if (
        message.type ===
            "action_submit" &&
        onlineIsHost()
    ) {
        return hostReceiveAction(
            message
        );
    }

    if (
        message.type ===
            "reaction_request" &&
        onlineIsHost()
    ) {
        return hostReceiveReactionRequest(
            message
        );
    }

    if (
        message.type ===
            "reaction_continue" &&
        onlineIsHost()
    ) {
        return hostReceiveReactionContinue(
            message
        );
    }

    if (
        message.type ===
            "vote_submit" &&
        onlineIsHost()
    ) {
        return hostReceiveVote(
            message
        );
    }

    if (
        message.type ===
            "captain_submit" &&
        onlineIsHost()
    ) {
        return hostReceiveCaptain(
            message
        );
    }

    if (
        message.type ===
            "public_state" &&
        onlineIsClient()
    ) {
        ONLINE.publicState =
            message;

        return;
    }

    if (
        message.type ===
            "public_message" &&
        onlineIsClient()
    ) {
        $("onlineScreenTitle").textContent =
            "PUBLIC UPDATE";

        $("onlineScreenSub").textContent =
            `ROUND ${game.round}`;

        onlineUi(`
            <div class="online-public-banner">
                ${esc(message.message)}
            </div>
        `);

        onlineShowScreen();

        return;
    }

    if (
        message.type ===
            "game_over" &&
        onlineIsClient()
    ) {
        return clientGameOver(
            message
        );
    }

    if (
        message.type ===
            "host_left" &&
        onlineIsClient()
    ) {
        return clientHostLeft();
    }
}


/* =========================================================
   ONLINE PRIVATE MESSAGE HANDLER
   ========================================================= */

function handleOnlinePrivateMessage(
    message
) {
    if (
        !message ||
        !ONLINE.connected
    ) {
        return;
    }

    if (
        message.type ===
            "accepted" &&
        onlineIsClient()
    ) {
        ONLINE.playerId =
            message.playerId;

        ONLINE.name =
            message.name ||
            ONLINE.name;

        localStorage.setItem(
            "alienOnlineRoom",
            JSON.stringify({
                roomCode:
                    ONLINE.roomCode,
                playerId:
                    ONLINE.playerId,
                connectionId:
                    ONLINE.connectionId,
                name:
                    ONLINE.name,
                role:
                    "client"
            })
        );

        return;
    }

    if (
        message.type ===
            "reject" &&
        onlineIsClient()
    ) {
        alert(
            message.message ||
            "The host rejected you."
        );

        onlineLeave(false);

        return;
    }

    if (
        message.type ===
            "role_assignment" &&
        onlineIsClient()
    ) {
        return clientReceiveRole(
            message
        );
    }

    if (
        message.type ===
            "ability_prompt" &&
        onlineIsClient()
    ) {
        return clientReceiveAbility(
            message
        );
    }

    if (
        message.type ===
            "reaction_prompt" &&
        onlineIsClient()
    ) {
        return clientReceiveReactionPrompt(
            message
        );
    }

    if (
        message.type ===
            "reaction_result" &&
        onlineIsClient()
    ) {
        return clientReceiveReactionResult(
            message
        );
    }

    if (
        message.type ===
            "vote_prompt" &&
        onlineIsClient()
    ) {
        return clientReceiveVotePrompt(
            message
        );
    }

    if (
        message.type ===
            "captain_prompt" &&
        onlineIsClient()
    ) {
        return clientReceiveCaptainPrompt(
            message
        );
    }
}


/* =========================================================
   ONLINE HOST ACTION VALIDATION
   ========================================================= */

function onlineValidateAction(
    player,
    action
) {
    if (!player || !action) {
        return false;
    }

    if (
        action === "none"
    ) {
        return true;
    }

    if (
        typeof action === "string"
    ) {
        return (
            action === "radio" &&
            player.role === "radio" &&
            game.systems.communications
        );
    }

    if (!canAct(player)) {
        return false;
    }

    const target =
        action.target
            ? getPlayer(
                action.target
            )
            : null;

    if (
        action.target &&
        (
            !target ||
            !target.alive ||
            target.id === player.id
        )
    ) {
        return false;
    }

    if (
        action.type === "kill"
    ) {
        return (
            player.role === "alien" &&
            target &&
            !isHostile(target)
        );
    }

    if (
        action.type ===
            "sabotage"
    ) {
        if (
            player.role !== "saboteur" &&
            player.role !== "alien"
        ) {
            return false;
        }

        if (
            player.role === "alien" &&
            living().some(
                other =>
                    other.role ===
                    "saboteur"
            )
        ) {
            return false;
        }

        return Object.prototype
            .hasOwnProperty.call(
                game.systems,
                action.system
            );
    }

    if (
        action.type ===
            "silence"
    ) {
        return (
            player.role === "silencer" &&
            !!target
        );
    }

    if (
        action.type ===
            "infect"
    ) {
        return (
            player.role === "parasite" &&
            !player.hasInfected &&
            !!target &&
            !target.infectionRound
        );
    }

    if (
        action.type ===
            "repair"
    ) {
        return (
            player.role === "engineer" &&
            Object.prototype
                .hasOwnProperty.call(
                    game.systems,
                    action.system
                ) &&
            !game.systems[
                action.system
            ]
        );
    }

    if (
        action.type ===
            "science"
    ) {
        return (
            player.role === "scientist" &&
            !!target &&
            (
                action.mode === "check" ||
                action.mode === "cure"
            )
        );
    }

    if (
        action.type ===
            "detect"
    ) {
        return (
            player.role === "detective" &&
            !!target
        );
    }

    if (
        action.type ===
            "protect"
    ) {
        return (
            player.role === "medic" &&
            !!target
        );
    }

    if (
        action.type ===
            "block"
    ) {
        return (
            player.role === "guard" &&
            !!target
        );
    }

    if (
        action.type ===
            "swap"
    ) {
        return (
            player.role === "trickster" &&
            !game.tricksterUsed &&
            getPlayer(action.a)?.alive &&
            getPlayer(action.b)?.alive &&
            action.a !== action.b
        );
    }

    return false;
}


/* =========================================================
   ONLINE HOST RECEIVES ACTION
   ========================================================= */

function hostReceiveAction(
    message
) {
    if (!onlineIsHost()) return;

    const expected =
        game.abilityQueue[
            game.abilityIndex
        ];

    if (
        expected !==
        message.playerId
    ) {
        return;
    }

    const player =
        getPlayer(
            message.playerId
        );

    if (!player || !player.alive) {
        return;
    }

    let action =
        message.action;

    if (
        typeof action === "string" &&
        action.startsWith("{")
    ) {
        try {
            action =
                JSON.parse(action);
        } catch {
            action = "none";
        }
    }

    if (
        !onlineValidateAction(
            player,
            action
        )
    ) {
        return;
    }

    game.selectedAction =
        action;

    completeAbility();
}


/* =========================================================
   ONLINE HOST REACTION REQUEST
   ========================================================= */

function hostReceiveReactionRequest(
    message
) {
    if (!onlineIsHost()) return;

    const expected =
        game.reactionQueue[
            game.reactionIndex
        ];

    if (
        expected !==
        message.playerId
    ) {
        return;
    }

    const player =
        getPlayer(
            message.playerId
        );

    if (!player) return;

    const info =
        game.reactionInfo[
            player.id
        ] ||
        (
            game.silencedUntil[player.id] >
            game.round
                ? `You have been silenced for ${
                    game.silencedUntil[player.id] -
                    game.round
                } more round(s). You cannot vote.`
                : "Nothing happened to you this round."
        );

    const connection =
        ONLINE.clientConnections[
            player.id
        ];

    sendPrivateToConnection(
        connection,
        {
            type:
                "reaction_result",
            round:
                game.round,
            alive:
                player.alive,
            message:
                info
        }
    );
}

function hostReceiveReactionContinue(
    message
) {
    if (!onlineIsHost()) return;

    const expected =
        game.reactionQueue[
            game.reactionIndex
        ];

    if (
        expected !==
        message.playerId
    ) {
        return;
    }

    game.reactionIndex++;

    nextReaction();
}


/* =========================================================
   ONLINE HOST RECEIVES VOTE
   ========================================================= */

function hostReceiveVote(
    message
) {
    if (!onlineIsHost()) return;

    const expected =
        living()[
            game.currentVoteIndex
        ]?.id;

    if (
        expected !==
        message.playerId
    ) {
        return;
    }

    const voter =
        getPlayer(
            message.playerId
        );

    if (!voter) return;

    const silenced =
        (
            game.silencedUntil[
                voter.id
            ] || 0
        ) > game.round;

    let vote =
        message.vote;

    if (silenced) {
        vote = "skip";
    }

    if (
        vote !== "skip" &&
        !living().some(
            player =>
                player.id === vote
        )
    ) {
        return;
    }

    game.selectedVote =
        vote;

    confirmVote();
}


/* =========================================================
   ONLINE HOST CAPTAIN RESULT
   ========================================================= */

function hostReceiveCaptain(
    message
) {
    if (!onlineIsHost()) return;

    const captain =
        living().find(
            player =>
                player.id ===
                    message.playerId &&
                player.role ===
                    "captain"
        );

    if (!captain) return;

    finishEjection(
        message.target,
        true
    );
}


/* =========================================================
   ONLINE GAME OVER
   ========================================================= */

function clientGameOver(
    message
) {
    $("onlineScreenTitle").textContent =
        message.title ||
        "GAME OVER";

    $("onlineScreenSub").textContent =
        "The game has ended.";

    onlineUi(`
        <h2>
            ${esc(
                message.title ||
                "GAME OVER"
            )}
        </h2>

        <p>
            ${esc(
                message.message ||
                ""
            )}
        </p>

        <button
            id="onlineReturnButton"
            type="button"
            class="primary full"
        >
            RETURN TO MENU
        </button>
    `);

    onlineShowScreen();

    $("onlineReturnButton").onclick =
        () => {
            onlineLeave(false);
            location.reload();
        };
}

function clientHostLeft() {
    alert(
        "The host left the room."
    );

    onlineLeave(false);

    location.reload();
}


/* =========================================================
   ONLINE HOST WAITING SCREEN
   ========================================================= */

function onlineShowHostWaiting(
    message
) {
    onlineShowScreen();

    $("onlineScreenTitle").textContent =
        "ONLINE GAME";

    $("onlineScreenSub").textContent =
        `ROOM ${ONLINE.roomCode}`;

    onlineUi(`
        <div class="online-waiting">

            <div class="online-spinner">
                ⏳
            </div>

            <h2>
                ${esc(message)}
            </h2>

            <p>
                The other player is using their own device.
            </p>

        </div>
    `);
}


/* =========================================================
   ONLINE LEAVE
   ========================================================= */

function onlineLeave(
    notifyHost = true
) {
    if (
        notifyHost &&
        onlineIsClient() &&
        ONLINE.channel
    ) {
        broadcastOnline({
            type:
                "leave_room",
            playerId:
                ONLINE.playerId
        });
    }

    if (supabaseClient) {
        Object.values(
            ONLINE.privateChannels
        ).forEach(channel => {
            try {
                supabaseClient.removeChannel(
                    channel
                );
            } catch {}
        });

        if (ONLINE.channel) {
            try {
                supabaseClient.removeChannel(
                    ONLINE.channel
                );
            } catch {}
        }
    }

    ONLINE.privateChannels = {};
    ONLINE.clientConnections = {};
    ONLINE.channel = null;

    ONLINE.connected = false;
    ONLINE.hostStarted = false;

    ONLINE.roomCode = null;
    ONLINE.playerId = null;
    ONLINE.connectionId = null;
    ONLINE.role = null;
    ONLINE.assignedRole = null;
    ONLINE.waitingFor = null;

    if (notifyHost) {
        localStorage.removeItem(
            "alienOnlineRoom"
        );
    }
}


/* =========================================================
   INITIAL UI
   ========================================================= */

function initGameUI() {
    const playerCount =
        $("playerCount");

    if (!playerCount) return;

    playerCount.onchange =
        resetSetupPlayers;

    if (!game.players.length) {
        resetSetupPlayers();
    } else {
        renderSetup();
    }

    $("randomRolesButton").type =
        "button";

    $("randomRolesButton").onclick =
        event => {
            event.preventDefault();
            randomiseRoles();
        };

    $("startGameButton").onclick =
        event => {
            event.preventDefault();

            if (
                ONLINE.mode === "online" &&
                ONLINE.role === "host"
            ) {
                onlineHostStart();
            } else {
                startGame();
            }
        };

    $("roleGuideButton").onclick =
        () => {
            renderRoleGuide();
            openModal(
                "roleGuideModal"
            );
        };

    $("customRolesButton").onclick =
        () => {
            renderCustomRoles();
            openModal(
                "customRoleModal"
            );
        };

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(button => {
            button.onclick =
                () =>
                    closeModal(
                        button.dataset.close
                    );
        });

    $("readyButton").onclick =
        showRole;

    $("showActionButton").onclick =
        showAction;

    $("reactionReadyButton").onclick =
        showReactionResult;

    $("reactionContinueButton").onclick =
        advanceReaction;

    $("startVotingButton").onclick =
        startVoting;

    $("restartButton").onclick =
        () => location.reload();

    $("applyCustomRolesButton").onclick =
        applyCustomRoles;

    buildOnlineUI();
}


/* =========================================================
   ONLINE LEAVE MESSAGE SUPPORT
   ========================================================= */

const oldHandleOnlineMessage =
    handleOnlineMessage;

function enhancedOnlineMessageHandler(
    message
) {
    if (
        message?.type ===
            "leave_room" &&
        onlineIsHost()
    ) {
        const player =
            getPlayer(
                message.playerId
            );

        if (player) {
            game.players =
                game.players.filter(
                    p =>
                        p.id !==
                        message.playerId
                );

            delete ONLINE.clientConnections[
                message.playerId
            ];

            broadcastOnline({
                type:
                    "room_state",
                players:
                    onlinePublicPlayers(),
                started:
                    ONLINE.hostStarted
            });

            if (
                ONLINE.hostStarted &&
                game.players.length < 4
            ) {
                endGame(
                    "GAME ENDED",
                    "Not enough players remain in the online room."
                );

                return;
            }

            if (
                !ONLINE.hostStarted
            ) {
                renderHostLobby();
            }
        }

        return;
    }

    oldHandleOnlineMessage(
        message
    );
}


/* =========================================================
   REPLACE MESSAGE HANDLER
   ========================================================= */

handleOnlineMessage =
    enhancedOnlineMessageHandler;


/* =========================================================
   ONLINE STARTUP
   ========================================================= */

function installOnlineBindings() {
    buildOnlineUI();

    /*
     * Mobile-safe random button.
     * Removes old listeners and prevents
     * touch + click from firing twice.
     */

    const randomButton =
        $("randomRolesButton");

    if (randomButton) {
        const fresh =
            randomButton.cloneNode(
                true
            );

        randomButton.replaceWith(
            fresh
        );

        let lastRandom =
            0;

        const handler =
            event => {
                event.preventDefault();
                event.stopPropagation();

                const now =
                    Date.now();

                if (
                    now - lastRandom <
                    500
                ) {
                    return;
                }

                lastRandom =
                    now;

                randomiseRoles();
            };

        if (
            "PointerEvent" in window
        ) {
            fresh.addEventListener(
                "pointerup",
                handler
            );
        } else {
            fresh.addEventListener(
                "click",
                handler
            );
        }
    }

    const count =
        $("playerCount");

    if (count) {
        count.onchange = () => {
            resetSetupPlayers();
        };
    }
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            initGameUI();
            installOnlineBindings();
        },
        { once: true }
    );
} else {
    initGameUI();
    installOnlineBindings();
}
