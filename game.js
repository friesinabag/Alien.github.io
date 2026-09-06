"use strict";

/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */

const $ = id => document.getElementById(id);
const alive = p => p && p.alive;
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[c]));


/* =========================================================
   ROLE DATA
   ========================================================= */

const ROLE_DATA = {

    alien: {
        icon: "👽",
        name: "Alien",
        team: "Hostile",
        desc: "Kill 1 player each round. If no living Saboteur exists, you may choose Kill or Sabotage. You can see the other Hostile players."
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
        desc: "Silence 1 living player for 2 rounds. They may still discuss and use their ability. You can see the other Hostile players."
    },

    parasite: {
        icon: "🦠",
        name: "Parasite",
        team: "Hostile",
        desc: "Infect 1 player once. An infection progresses to Diseased, then Parasite. You can see the other Hostile players."
    },

    engineer: {
        icon: "🔧",
        name: "Engineer",
        team: "Human",
        desc: "Repair 1 offline system each round. You can act even when Power is offline."
    },

    scientist: {
        icon: "🧪",
        name: "Scientist",
        team: "Human",
        desc: "Check 1 living player to see Healthy, Infected, Diseased or Parasite. Cure Infected or Diseased."
    },

    detective: {
        icon: "🕵️",
        name: "Detective",
        team: "Human",
        desc: "Investigate 1 player. You learn what they interacted with last round."
    },

    medic: {
        icon: "🩺",
        name: "Medic",
        team: "Human",
        desc: "Protect 1 living player from a kill this round."
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
        desc: "Block 1 living player's role ability for this round."
    },

    survivor: {
        icon: "👤",
        name: "Survivor",
        team: "Human",
        desc: "No special ability. Help the Human team survive and reach Earth."
    },

    radio: {
        icon: "📻",
        name: "Radio Operator",
        team: "Human",
        desc: "Choose whether to receive one private message from Earth each round while Communications is online."
    },

    judge: {
        icon: "⚖️",
        name: "Judge",
        team: "Human",
        desc: "Once per game, cancel ANY vote that would eject a player, including normal votes and Captain tie-breakers."
    },

    jester: {
        icon: "🃏",
        name: "Jester",
        team: "Neutral",
        desc: "Try to get yourself voted out. If normally ejected, you win immediately."
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
        desc: "Once per game, swap the displayed identities of two living players. The swap lasts through voting, then ends."
    },

    infected: {
        icon: "🦠",
        name: "Infected",
        team: "Infection",
        sub: true,
        desc: "A hidden infection stage. Only the Scientist can see this status. The infected player does not know."
    },

    diseased: {
        icon: "☣️",
        name: "Diseased",
        team: "Hostile",
        sub: true,
        desc: "The second infection stage. You know you are Diseased and on the Hostile Team. You cannot use an ability."
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


/* =========================================================
   RANDOM ROLE SETTINGS
   ========================================================= */

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


let settings = {

    enabled: Object.fromEntries(
        [
            ...HOSTILES,
            ...HUMANS,
            ...NEUTRALS,
            ...CONCEPTS
        ].map(r => [
            r,
            r !== "trickster"
        ])
    ),

    counts: Object.fromEntries(
        [
            ...HOSTILES,
            ...HUMANS,
            ...NEUTRALS,
            ...CONCEPTS
        ].map(r => [
            r,
            0
        ])
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
   BASIC HELPERS
   ========================================================= */

function teamClass(team) {

    return team === "Human"
        ? "human"
        : team === "Hostile"
            ? "hostile"
            : team === "Neutral"
                ? "neutral"
                : "infection";
}


function roleTeam(role) {

    if (role === "infected") {
        return "Human";
    }

    if (role === "diseased") {
        return "Hostile";
    }

    return ROLE_DATA[role]?.team || "Human";
}


function isHostile(p) {

    return alive(p) &&
        roleTeam(p.role) === "Hostile";
}


function isNeutral(p) {

    return alive(p) &&
        roleTeam(p.role) === "Neutral";
}


function isHuman(p) {

    return alive(p) &&
        roleTeam(p.role) === "Human";
}


function getPlayer(id) {

    return game.players.find(p => p.id === id);
}


function living() {

    return game.players.filter(alive);
}


function activeRole(p) {

    return ROLE_DATA[p.role];
}


/* =========================================================
   ABILITY AVAILABILITY
   ========================================================= */

function canAct(p) {

    if (!alive(p)) {
        return false;
    }

    if (p.role === "engineer") {
        return true;
    }

    if (
        p.role === "diseased" ||
        p.role === "infected" ||
        p.role === "survivor" ||
        p.role === "jester" ||
        p.role === "king"
    ) {
        return false;
    }

    if (!game.systems.power) {
        return false;
    }

    if (game.blockedPlayers.has(p.id)) {
        return false;
    }

    if (p.role === "judge" && game.judgeUsed) {
        return false;
    }

    return true;
}


/* =========================================================
   DISPLAY SWAP
   ========================================================= */

function realName(id) {

    return getPlayer(id)?.name || "";
}


function displayMap() {

    const map = Object.fromEntries(
        living().map(p => [
            p.id,
            p.id
        ])
    );

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

    return realName(displayMap()[id]);
}


function displayIdFromName(name) {

    const map = displayMap();

    const hit = Object.entries(map)
        .find(([, realId]) =>
            realName(realId) === name
        );

    return hit ? hit[0] : null;
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
             * Hostiles normally cannot target known hostile
             * teammates.
             *
             * Trickster exception:
             * swapped displayed identities can cause an
             * accidental hostile teammate target.
             */

            if (
                actor &&
                roleTeam(actor.role) === "Hostile" &&
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
   RESET ROUND TRANSIENT STATE
   ========================================================= */

function resetTransient() {

    game.actions = {};

    game.blockedPlayers = new Set();

    game.protectedPlayers = new Set();

    game.selectedAction = null;

    game.reactionInfo = {};
}


/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function setScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(s => s.classList.remove("active"));

    $(id)?.classList.add("active");

    window.scrollTo(0, 0);
}


/* =========================================================
   BUTTON HTML
   ========================================================= */

function button(
    text,
    value,
    cls = "choice-button"
) {

    return `
        <button
            type="button"
            class="${cls}"
            data-value="${esc(value)}"
        >
            ${text}
        </button>
    `;
}


/* =========================================================
   SETUP
   ========================================================= */

function showSetup() {

    setScreen("setupScreen");

    renderSetup();
}


function renderSetup() {

    $("playersSetup").innerHTML =
        game.players.length

            ? game.players.map((p, i) => `

                <div class="setup-player">

                    <label>
                        Player ${i + 1}

                        <select
                            class="role-select ${game.randomisedRoles && game.randomRoles[i]
                                ? "random-hidden"
                                : ""}"
                            data-index="${i}"
                        >

                            <option value="random">
                                🎲 RANDOM
                            </option>

                            ${
                                [
                                    ...HOSTILES,
                                    ...HUMANS,
                                    ...NEUTRALS,
                                    ...CONCEPTS
                                ]

                                .filter(r =>
                                    settings.enabled[r] ||
                                    r === "engineer"
                                )

                                .map(r => `
                                    <option value="${r}">
                                        ${ROLE_DATA[r].icon}
                                        ${ROLE_DATA[r].name}
                                    </option>
                                `)

                                .join("")
                            }

                        </select>

                    </label>

                </div>

            `).join("")

            : "";

    updatePlayerValidity();

    bindSetupSelects();
}


/* =========================================================
   SETUP ROLE DROPDOWNS
   ========================================================= */

function bindSetupSelects() {

    document
        .querySelectorAll(".role-select")
        .forEach(select => {

            select.onchange = () => {

                const i =
                    Number(select.dataset.index);

                const value =
                    select.value;

                if (value !== "random") {

                    game.randomisedRoles = true;

                    game.randomRoles[i] = value;

                    /*
                     * Keep dropdown visually showing RANDOM.
                     * Actual selected role is stored privately.
                     */

                    select.value = "random";

                    select.classList.add("random-hidden");
                }
            };
        });
}


/* =========================================================
   RESET PLAYERS
   ========================================================= */

function resetSetupPlayers() {

    const n =
        Number($("playerCount").value);

    game.players =
        Array.from(
            { length: n },
            (_, i) => ({

                id: `p${i + 1}`,

                name: `Player ${i + 1}`,

                role: "survivor",

                alive: true,

                originalRole: "survivor",

                infectionRound: null,

                hasInfected: false
            })
        );

    game.randomisedRoles = false;

    game.randomRoles = {};

    renderSetup();
}


/* =========================================================
   PLAYER VALIDITY
   ========================================================= */

function updatePlayerValidity() {

    const n =
        game.players.length;

    const total =
        Object.values(settings.counts)
            .reduce((a, b) => a + b, 0);

    $("playerValidity").textContent =
        `PLAYERS: ${n} / ${n}  •  ${
            total
                ? `CUSTOM ROLES: ${total} / ${n}`
                : "RANDOM ROLES"
        }`;
}


/* =========================================================
   WEIGHTED RANDOM
   ========================================================= */

function weightedPick(items, weights) {

    const total =
        items.reduce(
            (s, k) =>
                s + (weights[k] || 0),
            0
        );

    let r =
        Math.random() * total;

    for (const k of items) {

        r -= weights[k] || 0;

        if (r < 0) {
            return k;
        }
    }

    return items[items.length - 1];
}


/* =========================================================
   RANDOMISE ROLES
   ========================================================= */

function randomiseRoles() {

    const n =
        game.players.length;

    const h =
        HOSTILE_COUNTS[n];

    if (!h) {
        return;
    }

    const enabledHostiles =
        HOSTILES.filter(
            r => settings.enabled[r]
        );

    if (enabledHostiles.length < h) {

        return alert(
            "Enable enough Hostile roles to fill the random setup."
        );
    }

    const enabledHumans =
        HUMANS.filter(
            r =>
                settings.enabled[r] ||
                r === "engineer"
        );

    if (enabledHumans.length < n - h) {

        return alert(
            "Enable enough Human roles to fill the random setup."
        );
    }

    let roles = [];

    /*
     * Hostiles
     */

    const hostile =
        shuffle(enabledHostiles)
            .slice(0, h);

    roles.push(...hostile);

    /*
     * Engineer is guaranteed
     */

    roles.push("engineer");

    /*
     * Remaining humans
     */

    const humanNeeded =
        n - h - 1;

    let pool =
        enabledHumans.filter(
            r => r !== "engineer"
        );

    if (pool.length < humanNeeded) {

        return alert(
            "Not enough enabled Human roles for this player count."
        );
    }

    for (
        let i = 0;
        i < humanNeeded;
        i++
    ) {

        const pick =
            weightedPick(
                pool,
                HUMAN_WEIGHTS
            );

        roles.push(pick);

        pool =
            pool.filter(
                r => r !== pick
            );
    }

    /*
     * Neutral slots, if there are any.
     */

    const neutralSlots =
        n - roles.length;

    if (neutralSlots > 0) {

        const enabledNeutral =
            [
                ...NEUTRALS,
                ...CONCEPTS
            ]
            .filter(
                r => settings.enabled[r]
            );

        if (
            enabledNeutral.length <
            neutralSlots
        ) {

            return alert(
                "Enable enough Neutral roles, or use manual role counts."
            );
        }

        roles.push(
            ...shuffle(enabledNeutral)
                .slice(0, neutralSlots)
        );
    }

    /*
     * Shuffle final assignments.
     */

    roles =
        shuffle(roles);

    game.randomRoles =
        Object.fromEntries(
            roles.map(
                (r, i) => [i, r]
            )
        );

    game.randomisedRoles = true;

    renderSetup();
}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

    const n =
        game.players.length;

    const h =
        HOSTILE_COUNTS[n];

    let roles =
        game.randomisedRoles

            ? Array.from(
                { length: n },
                (_, i) =>
                    game.randomRoles[i]
            )

            : Array.from(
                { length: n },
                (_, i) =>
                    game.players[i].role
            );

    if (
        roles.includes("random") ||
        roles.some(r => !r)
    ) {

        return alert(
            "Choose roles or press RANDOMISE ROLES first."
        );
    }

    /*
     * Guarantee Engineer.
     */

    if (!roles.includes("engineer")) {
        roles[n - 1] = "engineer";
    }

    const counts =
        Object.fromEntries(
            ROLE_KEYS.map(
                r => [r, 0]
            )
        );

    roles.forEach(
        r =>
            counts[r] =
                (counts[r] || 0) + 1
    );

    if (counts.engineer !== 1) {

        return alert(
            "There must be exactly 1 Engineer."
        );
    }

    const hostileTotal =
        counts.alien +
        counts.saboteur +
        counts.silencer +
        counts.parasite;

    if (hostileTotal !== h) {

        return alert(
            `This setup needs exactly ${h} Hostile role(s).`
        );
    }

    const valid =
        roles.every(
            r =>
                ROLE_DATA[r] &&
                !ROLE_DATA[r].sub &&
                (
                    settings.enabled[r] ||
                    r === "engineer"
                )
        );

    if (!valid) {

        return alert(
            "A disabled role is selected."
        );
    }

    /*
     * Apply roles while preserving names.
     */

    game.players.forEach(
        (p, i) => {

            p.role = roles[i];

            p.originalRole = roles[i];

            p.alive = true;

            p.infectionRound = null;

            p.hasInfected = false;
        }
    );

    /*
     * Reset game state.
     */

    game.round = 1;

    game.stage = 1;

    game.gameOver = false;

    game.lifelineNumber = 0;

    game.judgeUsed = false;

    game.tricksterUsed = false;

    game.displaySwap = null;

    game.previousActions = {};

    game.silencedUntil = {};

    game.lastRoundResults = [];

    game.voteResolutionDone = false;

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
   START ROUND
   ========================================================= */

function startRound() {

    if (checkVictory()) {
        return;
    }

    /*
     * IMPORTANT:
     * Save previous round's actions BEFORE clearing them.
     * This allows Detective to see what happened last round.
     */

    game.previousActions =
        game.actions
            ? { ...game.actions }
            : {};

    resetTransient();

    /*
     * Snapshot who was alive at the START
     * of this round.
     */

    game.roundStartAliveIds =
        living().map(
            p => p.id
        );

    /*
     * Everyone alive at round start gets
     * an Ability Round.
     */

    game.abilityQueue =
        [...game.roundStartAliveIds];

    game.abilityIndex = 0;

    passToAbility();
}


/* =========================================================
   PASS TO ABILITY
   ========================================================= */

function passToAbility() {

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        return resolveAbilities();
    }

    const p =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!p) {
        return advanceAbility();
    }

    $("passPlayerName").textContent =
        p.name;

    $("passRound").textContent =
        `ROUND ${game.round} • STAGE ${game.stage} / 10`;

    $("passSubtext").textContent =
        "PASS THE PHONE TO THIS PLAYER";

    game.currentPlayerIndex =
        game.abilityIndex;

    setScreen("passScreen");
}


/* =========================================================
   SHOW ROLE
   ========================================================= */

function showRole() {

    const p =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!p) {
        return;
    }

    $("rolePlayerName").textContent =
        p.name;

    $("roleIcon").textContent =
        ROLE_DATA[p.role]?.icon ||
        "❓";

    $("roleName").textContent =
        ROLE_DATA[p.role]?.name ||
        p.role;

    const team =
        roleTeam(p.role);

    $("roleName").className =
        `role-title ${teamClass(team)}`;

    $("roleTeam").textContent =
        `${team.toUpperCase()} TEAM`;

    $("roleTeam").className =
        `team-badge ${teamClass(team)}`;

    $("roleDescription").textContent =
        ROLE_DATA[p.role]?.desc ||
        "";

    $("hostileList").innerHTML = "";

    /*
     * Only Hostiles see Hostile teammates.
     */

    if (team === "Hostile") {

        const allies =
            living().filter(
                x =>
                    x.id !== p.id &&
                    isHostile(x)
            );

        $("hostileList").innerHTML =
            allies.length

                ? `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong>
                        <br>
                        ${
                            allies
                                .map(
                                    x =>
                                        `${ROLE_DATA[x.role].icon} ${esc(x.name)}`
                                )
                                .join("<br>")
                        }
                    </div>
                `

                : `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong>
                        <br>
                        None
                    </div>
                `;
    }

    setScreen("roleScreen");
}


/* =========================================================
   SHOW ABILITY
   ========================================================= */

function showAction() {

    const p =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!p) {
        return;
    }

    $("actionTitle").textContent =
        `${ROLE_DATA[p.role]?.icon || ""} ${ROLE_DATA[p.role]?.name || ""}`;

    $("actionDescription").textContent =
        "";

    $("actionOptions").innerHTML =
        "";

    game.selectedAction = null;

    /*
     * Cannot act.
     */

    if (!canAct(p)) {

        $("actionDescription").textContent =
            p.role === "diseased"

                ? "You are Diseased. You cannot use an ability."

                : p.role === "infected"

                    ? "You are Infected and do not have an ability."

                    : "Your ability cannot be used this round.";

        $("confirmActionButton").textContent =
            "CONTINUE";

        $("confirmActionButton").onclick =
            () => completeAbility();

        setScreen("actionScreen");

        return;
    }


    /*
     * Generic choice helper.
     */

    const choose =
        (title, desc, items) => {

            $("actionDescription").textContent =
                desc;

            $("actionOptions").innerHTML =
                items
                    .map(
                        o =>
                            button(
                                o.label,
                                o.id
                            )
                    )
                    .join("");

            $("actionOptions")
                .querySelectorAll("button")
                .forEach(
                    b =>
                        b.onclick = () => {

                            game.selectedAction =
                                b.dataset.value;

                            $("actionOptions")
                                .querySelectorAll("button")
                                .forEach(
                                    x =>
                                        x.classList.remove(
                                            "selected"
                                        )
                                );

                            b.classList.add(
                                "selected"
                            );
                        }
                );
        };


    /* =====================================================
       ALIEN
       ===================================================== */

    if (p.role === "alien") {

        if (
            !living().some(
                x =>
                    x.role === "saboteur"
            )
        ) {

            $("actionDescription").textContent =
                "Choose Kill or Sabotage.";

        } else {

            $("actionDescription").textContent =
                "A living Saboteur exists, so you can only kill.";
        }

        $("actionOptions").innerHTML = `
            <button
                type="button"
                class="choice-button"
                data-value="kill"
            >
                ☠️ KILL
            </button>

            <button
                type="button"
                class="choice-button"
                data-value="sabotage"
            >
                💥 SABOTAGE
            </button>
        `;

        $("actionOptions")
            .querySelectorAll("button")
            .forEach(
                b =>
                    b.onclick = () => {

                        if (
                            b.dataset.value === "sabotage" &&
                            living().some(
                                x =>
                                    x.role === "saboteur"
                            )
                        ) {
                            return;
                        }

                        game.selectedAction =
                            b.dataset.value;

                        if (
                            b.dataset.value === "kill"
                        ) {

                            renderTargetChoices(
                                p,
                                null,
                                "kill"
                            );

                        } else {

                            renderSystemChoices();
                        }
                    }
            );

        if (
            living().some(
                x =>
                    x.role === "saboteur"
            )
        ) {

            const sabotageButton =
                $("actionOptions")
                    .querySelector(
                        '[data-value="sabotage"]'
                    );

            if (sabotageButton) {
                sabotageButton.style.display =
                    "none";
            }

            renderTargetChoices(
                p,
                null,
                "kill"
            );
        }


    /* =====================================================
       SABOTEUR
       ===================================================== */

    } else if (p.role === "saboteur") {

        renderSystemChoices();


    /* =====================================================
       SILENCER
       ===================================================== */

    } else if (p.role === "silencer") {

        renderTargetChoices(
            p,
            null,
            "silence"
        );


    /* =====================================================
       PARASITE
       ===================================================== */

    } else if (p.role === "parasite") {

        if (p.hasInfected) {

            $("actionDescription").textContent =
                "You already used your infection.";

            $("confirmActionButton").textContent =
                "CONTINUE";

            $("confirmActionButton").onclick =
                completeAbility;

            setScreen("actionScreen");

            return;
        }

        renderTargetChoices(
            p,
            null,
            "infect"
        );


    /* =====================================================
       ENGINEER
       ===================================================== */

    } else if (p.role === "engineer") {

        renderSystemChoices(true);


    /* =====================================================
       SCIENTIST
       ===================================================== */

    } else if (p.role === "scientist") {

        renderScientistChoices(p);


    /* =====================================================
       DETECTIVE
       ===================================================== */

    } else if (p.role === "detective") {

        renderTargetChoices(
            p,
            null,
            "detect"
        );


    /* =====================================================
       MEDIC
       ===================================================== */

    } else if (p.role === "medic") {

        renderTargetChoices(
            p,
            null,
            "protect"
        );


    /* =====================================================
       GUARD
       ===================================================== */

    } else if (p.role === "guard") {

        renderTargetChoices(
            p,
            null,
            "block"
        );


    /* =====================================================
       RADIO OPERATOR
       ===================================================== */

    } else if (p.role === "radio") {

        /*
         * Communications offline:
         * no message can be received.
         */

        if (!game.systems.communications) {

            $("actionDescription").textContent =
                "📡 COMMUNICATIONS IS OFFLINE. You cannot receive a message from Earth this round.";

            $("actionOptions").innerHTML = `
                <button
                    type="button"
                    class="choice-button"
                    data-value="radio-decline"
                >
                    CONTINUE
                </button>
            `;

            $("actionOptions")
                .querySelector("button")
                .onclick = () => {

                    game.selectedAction =
                        "none";
                };

        } else {

            /*
             * THIS IS THE NEW RADIO OPERATOR CHOICE.
             */

            $("actionDescription").textContent =
                "📻 Would you like to receive a private message from Earth?";

            $("actionOptions").innerHTML = `

                <button
                    type="button"
                    class="choice-button"
                    data-value="radio-receive"
                >
                    📡 RECEIVE MESSAGE
                </button>

                <button
                    type="button"
                    class="choice-button"
                    data-value="radio-decline"
                >
                    ⏭️ DON'T RECEIVE
                </button>

            `;

            $("actionOptions")
                .querySelectorAll("button")
                .forEach(
                    b =>
                        b.onclick = () => {

                            const value =
                                b.dataset.value;

                            game.selectedAction =
                                value;

                            $("actionOptions")
                                .querySelectorAll("button")
                                .forEach(
                                    x =>
                                        x.classList.remove(
                                            "selected"
                                        )
                                );

                            b.classList.add(
                                "selected"
                            );
                        }
                );
        }


    /* =====================================================
       CAPTAIN
       ===================================================== */

    } else if (p.role === "captain") {

        $("actionDescription").textContent =
            "Your ability is automatic only if a vote ties.";

        game.selectedAction =
            "none";


    /* =====================================================
       JUDGE
       ===================================================== */

    } else if (p.role === "judge") {

        $("actionDescription").textContent =
            "Your ability only appears when a vote would eject a player.";

        game.selectedAction =
            "none";


    /* =====================================================
       TRICKSTER
       ===================================================== */

    } else if (p.role === "trickster") {

        if (game.tricksterUsed) {

            $("actionDescription").textContent =
                "You already used your Trickster swap.";

            game.selectedAction =
                "none";

        } else {

            renderSwapChoices(p);
        }


    /* =====================================================
       NO ABILITY
       ===================================================== */

    } else {

        $("actionDescription").textContent =
            "No ability.";

        game.selectedAction =
            "none";
    }


    $("confirmActionButton").textContent =
        "CONFIRM";

    $("confirmActionButton").onclick =
        completeAbility;

    setScreen("actionScreen");
}


/* =========================================================
   SCIENTIST CHOICES
   ========================================================= */

function renderScientistChoices(p) {

    $("actionDescription").textContent =
        "Choose a living player to check. If they are Infected or Diseased, you may then choose whether to cure them.";

    $("actionOptions").innerHTML =
        targetOptions(p)
            .map(
                o =>
                    button(
                        o.label,
                        o.id
                    )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(
            b =>
                b.onclick = () => {

                    const t =
                        getPlayer(
                            b.dataset.value
                        );

                    game.selectedAction =
                        JSON.stringify({
                            type: "science",
                            target: t.id
                        });

                    $("actionOptions").innerHTML = `

                        ${button(
                            "🔬 CHECK",
                            "check"
                        )}

                        ${
                            [
                                "infected",
                                "diseased"
                            ].includes(t.role)

                                ? button(
                                    "💉 CURE",
                                    "cure"
                                )

                                : ""
                        }

                    `;

                    $("actionOptions")
                        .querySelectorAll("button")
                        .forEach(
                            x =>
                                x.onclick = () => {

                                    const mode =
                                        x.dataset.value;

                                    if (
                                        mode === "check"
                                    ) {

                                        game.selectedAction =
                                            JSON.stringify({
                                                type: "science",
                                                target: t.id,
                                                mode: "check"
                                            });
                                    }

                                    if (
                                        mode === "cure"
                                    ) {

                                        game.selectedAction =
                                            JSON.stringify({
                                                type: "science",
                                                target: t.id,
                                                mode: "cure"
                                            });
                                    }

                                    $("actionOptions")
                                        .querySelectorAll("button")
                                        .forEach(
                                            y =>
                                                y.classList.remove(
                                                    "selected"
                                                )
                                        );

                                    x.classList.add(
                                        "selected"
                                    );
                                }
                        );
                }
        );
}


/* =========================================================
   TARGET CHOICES
   ========================================================= */

function renderTargetChoices(
    p,
    unused,
    action
) {

    $("actionDescription").textContent = {

        kill:
            "Choose a player to kill.",

        silence:
            "Choose a player to silence for 2 rounds.",

        infect:
            "Choose a player to infect.",

        science:
            "Choose a player to investigate.",

        detect:
            "Choose a player to investigate.",

        protect:
            "Choose a player to protect.",

        block:
            "Choose a player whose ability to block."

    }[action] || "Choose a player.";


    $("actionOptions").innerHTML =
        targetOptions(p)
            .map(
                o =>
                    button(
                        o.label,
                        o.id
                    )
            )
            .join("");


    $("actionOptions")
        .querySelectorAll("button")
        .forEach(
            b =>
                b.onclick = () => {

                    game.selectedAction =
                        JSON.stringify({
                            type: action,
                            target:
                                b.dataset.value
                        });

                    $("actionOptions")
                        .querySelectorAll("button")
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "selected"
                                )
                        );

                    b.classList.add(
                        "selected"
                    );
                }
        );
}


/* =========================================================
   SYSTEM CHOICES
   ========================================================= */

function renderSystemChoices(
    engineer = false
) {

    const systems =
        engineer

            ? Object.keys(game.systems)
                .filter(
                    k => !game.systems[k]
                )

            : Object.keys(game.systems);


    if (!systems.length) {

        $("actionDescription").textContent =
            "No systems are offline.";

        game.selectedAction =
            "none";

        return;
    }


    $("actionDescription").textContent =
        engineer

            ? "Choose an offline system to repair."

            : "Choose a ship system to sabotage.";


    $("actionOptions").innerHTML =
        systems
            .map(
                k =>
                    button(
                        `${game.systems[k] ? "🟢" : "🔴"} ${k.toUpperCase()}`,
                        k
                    )
            )
            .join("");


    $("actionOptions")
        .querySelectorAll("button")
        .forEach(
            b =>
                b.onclick = () => {

                    game.selectedAction =
                        JSON.stringify({

                            type:
                                engineer
                                    ? "repair"
                                    : "sabotage",

                            system:
                                b.dataset.value
                        });


                    $("actionOptions")
                        .querySelectorAll("button")
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "selected"
                                )
                        );

                    b.classList.add(
                        "selected"
                    );
                }
        );
}


/* =========================================================
   TRICKSTER
   ========================================================= */

function renderSwapChoices(p) {

    const ids =
        living().map(
            x => x.id
        );

    $("actionDescription").textContent =
        "Choose TWO living players whose displayed identities will be swapped through voting.";

    $("actionOptions").innerHTML =
        ids
            .map(
                id =>
                    button(
                        displayName(id),
                        id
                    )
            )
            .join("");


    let chosen = [];


    $("actionOptions")
        .querySelectorAll("button")
        .forEach(
            b =>
                b.onclick = () => {

                    const id =
                        b.dataset.value;

                    if (
                        chosen.includes(id)
                    ) {

                        chosen =
                            chosen.filter(
                                x => x !== id
                            );

                        b.classList.remove(
                            "selected"
                        );

                    } else if (
                        chosen.length < 2
                    ) {

                        chosen.push(id);

                        b.classList.add(
                            "selected"
                        );
                    }


                    if (
                        chosen.length === 2
                    ) {

                        game.selectedAction =
                            JSON.stringify({
                                type: "swap",
                                a: chosen[0],
                                b: chosen[1]
                            });

                    } else {

                        game.selectedAction =
                            null;
                    }
                }
        );
}


/* =========================================================
   COMPLETE ABILITY
   ========================================================= */

function completeAbility() {

    const p =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!alive(p)) {

        return advanceAbility();
    }


    let action =
        game.selectedAction;


    /*
     * Parse JSON actions.
     */

    if (
        action &&
        typeof action === "string" &&
        action.startsWith("{")
    ) {

        action =
            JSON.parse(action);
    }


    /*
     * Normal object-based actions.
     */

    if (
        action &&
        typeof action === "object"
    ) {

        game.actions[p.id] =
            action;

        applyImmediateAction(
            p,
            action
        );


    /*
     * RADIO OPERATOR
     *
     * Only store a message if they actually
     * selected RECEIVE MESSAGE.
     */

    } else if (
        action === "radio-receive" &&
        game.systems.communications
    ) {

        const message =
            randomRadioMessage();

        game.actions[p.id] = {
            type: "radio",
            message: message
        };

        /*
         * Private message is stored for the
         * Radio Operator's Reaction Round.
         */

        game.reactionInfo[p.id] =
            message;


    /*
     * Radio Operator declined.
     */

    } else if (
        action === "radio-decline"
    ) {

        game.actions[p.id] = {
            type: "radio",
            message: null,
            declined: true
        };


    /*
     * Legacy radio fallback.
     */

    } else if (
        action === "radio" &&
        game.systems.communications
    ) {

        const message =
            randomRadioMessage();

        game.actions[p.id] = {
            type: "radio",
            message: message
        };

        game.reactionInfo[p.id] =
            message;


    } else {

        game.actions[p.id] = {
            type: "none"
        };
    }


    advanceAbility();
}


/* =========================================================
   ADVANCE ABILITY
   ========================================================= */

function advanceAbility() {

    game.abilityIndex++;

    if (
        game.abilityIndex <
        game.abilityQueue.length
    ) {

        passToAbility();

    } else {

        resolveAbilities();
    }
}


/* =========================================================
   APPLY IMMEDIATE ACTION
   ========================================================= */

function applyImmediateAction(
    p,
    a
) {

    /*
     * Engineer repair
     */

    if (a.type === "repair") {

        game.systems[a.system] =
            true;
    }


    /*
     * Sabotage
     */

    if (a.type === "sabotage") {

        game.systems[a.system] =
            false;
    }


    /*
     * Medic
     */

    if (a.type === "protect") {

        game.protectedPlayers.add(
            a.target
        );
    }


    /*
     * Guard
     */

    if (a.type === "block") {

        game.blockedPlayers.add(
            a.target
        );
    }


    /*
     * Silencer
     */

    if (a.type === "silence") {

        game.silencedUntil[a.target] =
            Math.max(
                game.silencedUntil[a.target] || 0,
                game.round + 2
            );
    }


    /*
     * Trickster
     */

    if (a.type === "swap") {

        game.displaySwap = [
            a.a,
            a.b
        ];

        game.tricksterUsed = true;
    }


    /*
     * Parasite infection
     */

    if (a.type === "infect") {

        p.hasInfected = true;

        const target =
            getPlayer(a.target);

        if (
            target &&
            alive(target) &&
            !target.infectionRound &&
            !game.blockedPlayers.has(
                target.id
            )
        ) {

            target.infectionRound =
                game.round;

            target.originalRole =
                target.role;

            target.role =
                "infected";

            target.hasInfected =
                false;

            /*
             * The infected player is secretly
             * notified in their Reaction Round.
             */

            game.reactionInfo[target.id] =
                "You were infected this round.";
        }
    }


    /*
     * Scientist
     */

    if (a.type === "science") {

        const t =
            getPlayer(a.target);

        if (t) {

            const status =
                ROLE_DATA[t.role]?.name ||
                t.role;

            game.reactionInfo[p.id] =
                `SCIENCE: ${t.name} is ${status}.`;


            /*
             * Cure Infected or Diseased.
             *
             * They become Survivor rather than
             * returning to their original role.
             */

            if (
                a.mode === "cure" &&
                (
                    t.role === "infected" ||
                    t.role === "diseased"
                )
            ) {

                t.role =
                    "survivor";

                t.infectionRound =
                    null;

                t.hasInfected =
                    false;

                game.reactionInfo[p.id] =
                    `SCIENCE: ${t.name} was cured and is now a Survivor.`;

                if (
                    game.reactionInfo[t.id] &&
                    t.id !== p.id
                ) {

                    game.reactionInfo[t.id] =
                        "You were cured by the Scientist and are now a Survivor.";
                }
            }
        }
    }


    /*
     * Detective
     */

    if (a.type === "detect") {

        const t =
            getPlayer(a.target);

        const prev =
            game.previousActions[t.id];

        game.reactionInfo[p.id] =
            detectiveMessage(
                t,
                prev
            );
    }


    /*
     * Radio Operator object fallback.
     */

    if (a.type === "radio") {

        if (a.message) {

            game.reactionInfo[p.id] =
                a.message;

        } else {

            /*
             * Don't overwrite a different private
             * result if there isn't a message.
             */

            if (
                !game.reactionInfo[p.id]
            ) {

                game.reactionInfo[p.id] =
                    "You chose not to receive a message from Earth this round.";
            }
        }
    }
}


/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

    /*
     * Kills happen after protection/blocking
     * is known.
     */

    const killActions =
        Object.entries(
            game.actions
        )
        .filter(
            ([, a]) =>
                a.type === "kill"
        );


    for (
        const [id, a]
        of killActions
    ) {

        const actor =
            getPlayer(id);

        const target =
            getPlayer(a.target);


        if (
            actor &&
            target &&
            alive(actor) &&
            alive(target) &&
            !game.blockedPlayers.has(
                actor.id
            )
        ) {

            if (
                !game.protectedPlayers.has(
                    target.id
                )
            ) {

                target.alive =
                    false;

                game.lastRoundResults.push(
                    `${target.name} was killed.`
                );

                /*
                 * The player was alive at the
                 * start of the round, so they
                 * still receive their Reaction.
                 */

                game.reactionInfo[target.id] =
                    "You were killed this round.";

            } else {

                game.reactionInfo[target.id] =
                    "You were attacked, but you were protected.";
            }
        }
    }


    /*
     * Infection progression.
     *
     * Second full infection round:
     * Infected -> Diseased
     *
     * Third full infection round:
     * Diseased -> Parasite
     */

    for (
        const p of game.players
    ) {

        if (
            !p.alive ||
            !p.infectionRound
        ) {
            continue;
        }

        const age =
            game.round -
            p.infectionRound +
            1;


        if (
            age === 2 &&
            p.role === "infected"
        ) {

            p.role =
                "diseased";

            game.reactionInfo[p.id] =
                "You became DISEASED. You are on the HOSTILE TEAM.";

        } else if (
            age >= 3 &&
            p.role === "diseased"
        ) {

            p.role =
                "parasite";

            p.hasInfected =
                false;

            game.reactionInfo[p.id] =
                "You became a PARASITE. You are on the HOSTILE TEAM.";
        }
    }


    showReactions();
}


/* =========================================================
   DETECTIVE MESSAGE
   ========================================================= */

function detectiveMessage(
    target,
    action
) {

    if (
        !action ||
        action.type === "none"
    ) {

        return `${target.name} had no interaction last round.`;
    }


    if (
        action.type === "radio"
    ) {

        if (action.declined) {

            return `${target.name} interacted with Communications.`;

        }

        return `${target.name} interacted with Communications.`;
    }


    if (action.target) {

        return `${target.name} interacted with ${displayName(action.target)}.`;
    }


    if (action.system) {

        return `${target.name} interacted with ${action.system.toUpperCase()}.`;
    }


    if (
        action.type === "swap"
    ) {

        return `${target.name} interacted with ${displayName(action.a)} and ${displayName(action.b)}.`;
    }


    return `${target.name} had an interaction last round.`;
}


/* =========================================================
   RADIO OPERATOR EARTH MESSAGES
   ========================================================= */

function randomRadioMessage() {

    const messages = [

        "Earth: We detected hostile activity somewhere on the ship.",

        "Earth: One of the living players is hostile.",

        "Earth: A ship system was recently tampered with.",

        "Earth: Communications is stable. Stay alert.",

        "Earth: We cannot identify a hostile player from this transmission.",

        "Earth: Our sensors detected unusual activity aboard the ship.",

        "Earth: Be careful. Someone aboard the ship may not be who they claim.",

        "Earth: We are monitoring your ship. Stay alert.",

        "Earth: We detected an unexplained signal coming from inside the ship.",

        "Earth: Something aboard your ship is interfering with our scans."
    ];

    return rand(messages);
}


/* =========================================================
   SHOW REACTIONS
   ========================================================= */

function showReactions() {

    /*
     * CRITICAL:
     *
     * Everyone alive at the START of the round
     * gets a Reaction Round.
     *
     * This means someone killed during the round
     * still gets their result.
     */

    game.reactionQueue =
        [
            ...game.roundStartAliveIds
        ]
        .filter(
            id => getPlayer(id)
        );

    game.reactionIndex =
        0;

    nextReaction();
}


/* =========================================================
   NEXT REACTION
   ========================================================= */

function nextReaction() {

    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {

        return showDiscussion();
    }

    const p =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );

    if (!p) {

        game.reactionIndex++;

        return nextReaction();
    }

    $("reactionRound").textContent =
        `ROUND ${game.round}`;

    $("reactionStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("reactionPlayerName").textContent =
        p.name;

    $("reactionReadyButton").textContent =
        "SHOW MY RESULT";

    setScreen("reactionScreen");
}


/* =========================================================
   SHOW REACTION RESULT
   ========================================================= */

function showReactionResult() {

    const p =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );

    if (!p) {
        return advanceReaction();
    }


    $("reactionResultTitle").textContent =
        p.alive
            ? "ROUND RESULT"
            : "YOU DIED THIS ROUND";


    let msg =
        game.reactionInfo[p.id];


    /*
     * Radio Operator message.
     *
     * This is already stored privately in
     * reactionInfo when they chose RECEIVE.
     *
     * The important part is that it is shown
     * ONLY when this player's Reaction screen
     * is being displayed.
     */

    if (
        p.role === "radio" &&
        game.reactionInfo[p.id]
    ) {

        msg =
            `📻 MESSAGE FROM EARTH\n\n${game.reactionInfo[p.id]}`;
    }


    if (!msg) {

        if (
            game.silencedUntil[p.id] &&
            game.silencedUntil[p.id] >
            game.round
        ) {

            msg =
                `You have been silenced for ${
                    game.silencedUntil[p.id] -
                    game.round
                } more round(s). You cannot vote.`;

        } else {

            msg =
                "Nothing happened to you this round.";
        }
    }


    $("reactionResultMessage").textContent =
        msg;

    setScreen(
        "reactionResultScreen"
    );
}


/* =========================================================
   ADVANCE REACTION
   ========================================================= */

function advanceReaction() {

    game.reactionIndex++;

    nextReaction();
}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {

    const systems =
        Object.entries(
            game.systems
        )
        .map(
            ([k, v]) =>
                `${v ? "🟢" : "🔴"} ${k.toUpperCase()}`
        )
        .join("  ");


    $("discussionRound").textContent =
        `ROUND ${game.round}`;

    $("discussionStage").textContent =
        `STAGE ${game.stage} / 10`;


    $("roundResults").innerHTML = `

        <p>
            ${
                game.lastRoundResults.join("<br>") ||
                "No deaths this round."
            }
        </p>

        <p>
            ${systems}
        </p>

        ${
            game.displaySwap

                ? `
                    <p class="warning">
                        🎭 Identities are currently swapped until voting is fully resolved.
                    </p>
                `

                : ""
        }

    `;

    setScreen(
        "discussionScreen"
    );
}


/* =========================================================
   START VOTING
   ========================================================= */

function startVoting() {

    game.votes = {};

    game.currentVoteIndex =
        0;

    game.voteResolutionDone =
        false;

    showVote();
}


/* =========================================================
   SHOW VOTE
   ========================================================= */

function showVote() {

    const alivePlayers =
        living();


    if (
        game.currentVoteIndex >=
        alivePlayers.length
    ) {

        return resolveVoting();
    }


    const p =
        alivePlayers[
            game.currentVoteIndex
        ];


    $("votingRound").textContent =
        `ROUND ${game.round}`;

    $("votingStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("voterName").textContent =
        p.name;


    const silenced =
        (
            game.silencedUntil[p.id] ||
            0
        ) > game.round;


    $("votingSilenced").textContent =
        silenced

            ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"

            : "";


    $("voteOptions").innerHTML =

        silenced

            ? button(
                "SKIP (SILENCED)",
                "skip"
            )

            : [
                ...living()
                    .filter(
                        x =>
                            x.id !== p.id
                    )
                    .map(
                        x =>
                            button(
                                displayName(x.id),
                                x.id
                            )
                    ),

                button(
                    "⏭️ SKIP",
                    "skip"
                )

            ].join("");


    game.selectedVote =
        null;


    $("voteOptions")
        .querySelectorAll("button")
        .forEach(
            b =>
                b.onclick = () => {

                    game.selectedVote =
                        b.dataset.value;

                    $("voteOptions")
                        .querySelectorAll("button")
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "selected"
                                )
                        );

                    b.classList.add(
                        "selected"
                    );
                }
        );


    $("confirmVoteButton").onclick =
        confirmVote;


    setScreen(
        "votingScreen"
    );
}


/* =========================================================
   CONFIRM VOTE
   ========================================================= */

function confirmVote() {

    const p =
        living()[
            game.currentVoteIndex
        ];

    if (!game.selectedVote) {
        return;
    }

    game.votes[p.id] =
        game.selectedVote;

    game.currentVoteIndex++;

    showVote();
}


/* =========================================================
   RESOLVE VOTING
   ========================================================= */

function resolveVoting() {

    const tally = {};


    Object.values(
        game.votes
    )
    .forEach(
        v => {

            if (v !== "skip") {

                tally[v] =
                    (tally[v] || 0) + 1;
            }
        }
    );


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


    /*
     * One clear winner.
     */

    if (tied.length === 1) {

        return finishEjection(
            tied[0],
            false
        );
    }


    /*
     * Tie.
     */

    if (tied.length > 1) {

        const captain =
            living().find(
                p =>
                    p.role === "captain" &&
                    game.systems.power &&
                    !game.blockedPlayers.has(
                        p.id
                    )
            );


        if (captain) {

            showCaptainTie(
                tied,
                captain
            );

            return;
        }
    }


    /*
     * No ejection.
     */

    finishEjection(
        null,
        false
    );
}


/* =========================================================
   CAPTAIN TIE
   ========================================================= */

function showCaptainTie(
    tied,
    captain
) {

    $("captainTieOptions").innerHTML = `

        <p>
            Choose one tied player to eject.
        </p>

        ${
            tied
                .map(
                    id =>
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
        .forEach(
            b =>
                b.onclick = () => {

                    finishEjection(
                        b.dataset.value,
                        true
                    );
                }
        );


    setScreen(
        "captainTieScreen"
    );
}


/* =========================================================
   FINISH EJECTION
   ========================================================= */

function finishEjection(
    id,
    byCaptain
) {

    if (id) {

        /*
         * Judge can cancel ANY ejection,
         * including normal votes and Captain
         * tie-breaks.
         */

        const judge =
            living().find(
                p =>
                    p.role === "judge" &&
                    !game.judgeUsed &&
                    game.systems.power &&
                    !game.blockedPlayers.has(
                        p.id
                    )
            );


        if (judge) {

            /*
             * Store pending ejection so the Judge
             * can decide.
             */

            game.pendingEjection = {
                id: id,
                byCaptain: byCaptain
            };

            $("judgeDescription").textContent =
                byCaptain

                    ? "The Captain selected this player for ejection. You may cancel the ejection."

                    : "A vote would eject this player. You may cancel the ejection.";

            $("judgeCancelButton").onclick =
                judgeCancelEjection;

            $("judgeAllowButton").onclick =
                judgeAllowEjection;

            setScreen(
                "judgeScreen"
            );

            return;
        }


        applyEjection(id);

        return;
    }


    $("voteResultTitle").textContent =
        "NO EJECTION";

    $("voteResultMessage").textContent =
        "Nobody was voted out.";

    $("afterVoteButton").onclick =
        () => afterVoting();

    setScreen(
        "voteResultScreen"
    );
}


/* =========================================================
   APPLY EJECTION
   ========================================================= */

function applyEjection(id) {

    const p =
        getPlayer(id);


    if (!p) {

        $("voteResultTitle").textContent =
            "NO EJECTION";

        $("voteResultMessage").textContent =
            "Nobody was voted out.";

        $("afterVoteButton").onclick =
            () => afterVoting();

        setScreen(
            "voteResultScreen"
        );

        return;
    }


    p.alive =
        false;


    /*
     * Jester wins only if actually ejected.
     */

    if (p.role === "jester") {

        $("voteResultTitle").textContent =
            "JESTER WINS";

        $("voteResultMessage").textContent =
            `${p.name} was voted out and wins as the Jester!`;

        game.gameOver =
            true;

    } else {

        $("voteResultTitle").textContent =
            "PLAYER VOTED OUT";

        $("voteResultMessage").textContent =
            `${p.name} was voted out.`;
    }


    $("afterVoteButton").onclick =
        () => afterVoting();

    setScreen(
        "voteResultScreen"
    );
}


/* =========================================================
   JUDGE CANCEL
   ========================================================= */

function judgeCancelEjection() {

    if (!game.pendingEjection) {
        return;
    }

    game.judgeUsed =
        true;

    game.pendingEjection =
        null;

    $("voteResultTitle").textContent =
        "VOTE CANCELLED";

    $("voteResultMessage").textContent =
        "The Judge cancelled the ejection. Nobody was voted out.";

    $("afterVoteButton").onclick =
        () => afterVoting();

    setScreen(
        "voteResultScreen"
    );
}


/* =========================================================
   JUDGE ALLOW
   ========================================================= */

function judgeAllowEjection() {

    if (!game.pendingEjection) {
        return;
    }

    const pending =
        game.pendingEjection;

    game.pendingEjection =
        null;

    applyEjection(
        pending.id
    );
}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

    /*
     * Trickster ends only after the complete
     * voting/result sequence.
     */

    game.displaySwap =
        null;


    if (game.gameOver) {

        return showGameOver();
    }


    /*
     * Earth lifeline checkpoint every 3 rounds.
     */

    if (
        game.round % 3 === 0
    ) {

        if (
            game.systems.communications
        ) {

            game.lifelineNumber++;

            showLifeline();

        } else {

            proceedToSystems();
        }

    } else {

        proceedToSystems();
    }
}


/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showLifeline() {

    const livingHostile =
        living().filter(
            isHostile
        );

    const others =
        living().filter(
            p => !isHostile(p)
        );


    const pool = [];


    /*
     * Exactly one Hostile is included.
     */

    if (
        livingHostile.length
    ) {

        pool.push(
            ...shuffle(
                livingHostile
            ).slice(0, 1)
        );
    }


    /*
     * Two non-hostile players.
     */

    pool.push(
        ...shuffle(
            others
        ).slice(0, 2)
    );


    const msg =
        pool.length

            ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${pool.map(p => p.name).join(", ")}`

            : "Earth sent no useful clue.";


    $("lifelineTitle").textContent =
        `EARTH LIFELINE #${game.lifelineNumber}`;

    $("lifelineMessage").textContent =
        msg;

    $("lifelineContinue").onclick =
        proceedToSystems;

    setScreen(
        "lifelineScreen"
    );
}


/* =========================================================
   SYSTEMS / STAGE
   ========================================================= */

function proceedToSystems() {

    /*
     * Engines online = advance one stage.
     *
     * Engines offline = no stage progress.
     */

    if (
        game.systems.engines
    ) {

        game.stage++;
    }


    /*
     * Stage 10 completed.
     */

    if (
        game.stage > 10
    ) {

        return earthCheck();
    }


    $("systemsRound").textContent =
        `ROUND ${game.round}`;

    $("systemsStage").textContent =
        `STAGE ${game.stage} / 10`;


    $("systemsList").innerHTML =
        Object.entries(
            game.systems
        )
        .map(
            ([k, v]) => `
                <div>
                    ${v ? "🟢" : "🔴"}
                    <strong>
                        ${k.toUpperCase()}
                    </strong>
                    —
                    ${v ? "ONLINE" : "OFFLINE"}
                </div>
            `
        )
        .join("");


    $("nextRoundButton").onclick =
        () => {

            game.round++;

            game.lastRoundResults =
                [];

            startRound();
        };


    setScreen(
        "systemsScreen"
    );
}


/* =========================================================
   EARTH CHECK
   ========================================================= */

function earthCheck() {

    const neutrals =
        living().filter(
            isNeutral
        );


    /*
     * Neutral victory overrides Human victory.
     */

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


/* =========================================================
   VICTORY CHECK
   ========================================================= */

function checkVictory() {

    if (game.gameOver) {
        return true;
    }


    /*
     * Hostiles win when they equal or outnumber
     * everyone else alive.
     */

    const host =
        living()
            .filter(isHostile)
            .length;

    const nonHost =
        living()
            .filter(
                p => !isHostile(p)
            )
            .length;


    if (
        host >= nonHost &&
        host > 0
    ) {

        endGame(
            "HOSTILE VICTORY",
            "The Hostile team now equals or outnumbers everyone else alive."
        );

        return true;
    }


    /*
     * Survivor King wins if one of final two.
     */

    const neutrals =
        living().filter(
            isNeutral
        );


    if (
        living().length === 2 &&
        neutrals.length
    ) {

        const kings =
            neutrals.filter(
                p =>
                    p.role === "king"
            );


        if (kings.length) {

            endGame(
                "SURVIVOR KING WINS",
                `${kings[0].name} is one of the final 2 living players.`
            );

            return true;
        }
    }


    return false;
}


/* =========================================================
   END GAME
   ========================================================= */

function endGame(
    title,
    msg
) {

    game.gameOver =
        true;


    $("gameOverTitle").textContent =
        title;

    $("gameOverMessage").textContent =
        msg;


    $("finalPlayers").innerHTML =
        game.players

            .map(
                p => `

                    <div
                        class="${p.alive ? "" : "dead"}"
                    >

                        <strong>
                            ${esc(p.name)}
                        </strong>

                        —
                        ${ROLE_DATA[p.role]?.icon || ""}
                        ${ROLE_DATA[p.role]?.name || p.role}

                        <span
                            class="team-${teamClass(
                                roleTeam(p.role)
                            )}"
                        >
                            [${roleTeam(p.role)}]
                        </span>

                        ${p.alive ? "ALIVE" : "DEAD"}

                    </div>

                `
            )

            .join("");


    setScreen(
        "gameOverScreen"
    );
}


function showGameOver() {

    endGame(
        $("voteResultTitle").textContent,
        $("voteResultMessage").textContent
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {

    $(id).classList.add(
        "open"
    );
}


function closeModal(id) {

    $(id).classList.remove(
        "open"
    );
}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

    const sections = [

        [
            "HOSTILE",
            HOSTILES.concat([
                "diseased"
            ])
        ],

        [
            "HUMAN",
            HUMANS
        ],

        [
            "NEUTRAL",
            [
                "jester",
                "king"
            ]
        ],

        [
            "INFECTION / SUB-ROLES",
            [
                "infected",
                "diseased",
                "parasite"
            ]
        ],

        [
            "ROLE CONCEPT",
            [
                "trickster"
            ]
        ]

    ];


    $("roleGuideContent").innerHTML =
        sections

            .map(
                ([title, roles]) => `

                    <section>

                        <h3>
                            ${title}
                        </h3>

                        ${
                            roles
                                .map(
                                    r => `

                                        <article
                                            class="guide-card ${teamClass(
                                                ROLE_DATA[r].team
                                            )}"
                                        >

                                            <div
                                                class="guide-icon"
                                            >
                                                ${ROLE_DATA[r].icon}
                                            </div>

                                            <div>

                                                <strong>
                                                    ${ROLE_DATA[r].name}
                                                </strong>

                                                <div
                                                    class="guide-team"
                                                >
                                                    ${ROLE_DATA[r].team}
                                                </div>

                                                <p>
                                                    ${ROLE_DATA[r].desc}
                                                </p>

                                            </div>

                                        </article>

                                    `
                                )
                                .join("")
                        }

                    </section>

                `
            )

            .join("");
}


/* =========================================================
   CUSTOM ROLES
   ========================================================= */

function renderCustomRoles() {

    const groups = [

        [
            "HOSTILE",
            HOSTILES
        ],

        [
            "HUMAN",
            HUMANS
        ],

        [
            "NEUTRAL",
            NEUTRALS
        ],

        [
            "ROLE CONCEPT",
            CONCEPTS
        ]

    ];


    $("customRoleContent").innerHTML =
        groups

            .map(
                ([title, roles]) => `

                    <section>

                        <h3>
                            ${title}
                        </h3>

                        ${
                            roles
                                .map(
                                    r => {

                                        const locked =
                                            r === "engineer";

                                        return `

                                            <div
                                                class="custom-row ${locked ? "locked" : ""}"
                                            >

                                                <span>
                                                    ${ROLE_DATA[r].icon}
                                                    ${ROLE_DATA[r].name}
                                                </span>

                                                <label>
                                                    Count

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="1"
                                                        value="${
                                                            settings.counts[r] || 0
                                                        }"
                                                        data-role-count="${r}"
                                                        ${
                                                            locked
                                                                ? "readonly"
                                                                : ""
                                                        }
                                                    >

                                                </label>

                                                <label
                                                    class="switch"
                                                >

                                                    <input
                                                        type="checkbox"
                                                        data-role-enabled="${r}"
                                                        ${
                                                            (
                                                                settings.enabled[r] ||
                                                                locked
                                                            )
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
                                    }
                                )
                                .join("")
                        }

                    </section>

                `
            )

            .join("");


    /*
     * Enable / disable role.
     */

    $("customRoleContent")
        .querySelectorAll(
            "[data-role-enabled]"
        )
        .forEach(
            el =>
                el.onchange = () => {

                    const role =
                        el.dataset.roleEnabled;

                    settings.enabled[role] =
                        el.checked;

                    if (!el.checked) {

                        settings.counts[role] =
                            0;
                    }

                    renderCustomRoles();

                    renderSetup();
                }
        );


    /*
     * Role count.
     */

    $("customRoleContent")
        .querySelectorAll(
            "[data-role-count]"
        )
        .forEach(
            el =>
                el.onchange = () => {

                    const role =
                        el.dataset.roleCount;

                    settings.counts[role] =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                Number(el.value) || 0
                            )
                        );


                    if (
                        settings.counts[role] > 0
                    ) {

                        settings.enabled[role] =
                            true;
                    }


                    updatePlayerValidity();
                }
        );
}


/* =========================================================
   APPLY CUSTOM ROLES
   ========================================================= */

function applyCustomRoles() {

    const n =
        game.players.length;

    const selected = [];


    Object.entries(
        settings.counts
    )
    .forEach(
        ([r, c]) => {

            for (
                let i = 0;
                i < c;
                i++
            ) {

                selected.push(r);
            }
        }
    );


    if (
        selected.length !== n
    ) {

        return alert(
            `Custom roles must total exactly ${n} players. Current total: ${selected.length}.`
        );
    }


    if (
        !selected.includes("engineer")
    ) {

        return alert(
            "Engineer is required."
        );
    }


    const hostileCount =
        selected.filter(
            r =>
                HOSTILES.includes(r)
        ).length;


    if (
        hostileCount !==
        HOSTILE_COUNTS[n]
    ) {

        return alert(
            `You need exactly ${HOSTILE_COUNTS[n]} Hostile role(s).`
        );
    }


    game.randomRoles =
        Object.fromEntries(
            shuffle(selected)
                .map(
                    (r, i) =>
                        [i, r]
                )
        );


    game.randomisedRoles =
        true;


    renderSetup();

    closeModal(
        "customRoleModal"
    );
}


/* =========================================================
   INITIALISE UI
   ========================================================= */

function initGameUI() {

    /*
     * Safe to call more than once.
     *
     * Also works if the script loads after
     * DOMContentLoaded.
     */

    const playerCount =
        $("playerCount");


    if (!playerCount) {
        return;
    }


    playerCount.onchange =
        resetSetupPlayers;


    if (!game.players.length) {

        resetSetupPlayers();

    } else {

        renderSetup();
    }


    /*
     * Setup buttons
     */

    $("randomRolesButton").type =
        "button";

    $("randomRolesButton").onclick =
        e => {

            e.preventDefault();

            e.stopPropagation();

            randomiseRoles();
        };


    $("startGameButton").onclick =
        e => {

            e.preventDefault();

            e.stopPropagation();

            startGame();
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


    /*
     * Modal close buttons
     */

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(
            b =>
                b.onclick =
                    () =>
                        closeModal(
                            b.dataset.close
                        )
        );


    /*
     * Pass / role / ability
     */

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
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initGameUI,
        {
            once: true
        }
    );

} else {

    initGameUI();
}
