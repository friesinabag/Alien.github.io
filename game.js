"use strict";

/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */


/* =========================================================
   BASIC HELPERS
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
    desc: "Receive a private message from Earth each round while Communications is online."
  },

  judge: {
    icon: "⚖️",
    name: "Judge",
    team: "Human",
    desc: "Once per game, cancel a vote that would eject a player. Power must be online."
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


/* =========================================================
   ROLE LISTS
   ========================================================= */

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


/* =========================================================
   SETTINGS
   ========================================================= */

let settings = {

  enabled: Object.fromEntries(
    [
      ...HOSTILES,
      ...HUMANS,
      ...NEUTRALS,
      ...CONCEPTS
    ].map(role => [
      role,
      role !== "trickster"
    ])
  ),

  counts: Object.fromEntries(
    [
      ...HOSTILES,
      ...HUMANS,
      ...NEUTRALS,
      ...CONCEPTS
    ].map(role => [
      role,
      0
    ])
  )

};


/* Engineer is ALWAYS enabled and ALWAYS present. */
settings.counts.engineer = 1;
settings.enabled.engineer = true;


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
  },

  currentPlayerIndex: 0,

  currentVoteIndex: 0

};


/* =========================================================
   TEAM HELPERS
   ========================================================= */

function teamClass(team) {

  if (team === "Human") {
    return "human";
  }

  if (team === "Hostile") {
    return "hostile";
  }

  if (team === "Neutral") {
    return "neutral";
  }

  return "infection";
}


function roleTeam(roleOrPlayer) {

  const role =
    typeof roleOrPlayer === "object"
      ? roleOrPlayer.role
      : roleOrPlayer;

  /*
   * IMPORTANT:
   * Infected is still treated as Human
   * until they become Diseased.
   */

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
    roleTeam(p) === "Hostile";

}


function isNeutral(p) {

  return alive(p) &&
    roleTeam(p) === "Neutral";

}


function isHuman(p) {

  return alive(p) &&
    roleTeam(p) === "Human";

}


/* =========================================================
   PLAYER HELPERS
   ========================================================= */

function getPlayer(id) {

  return game.players.find(
    p => p.id === id
  );

}


function living() {

  return game.players.filter(alive);

}


function activeRole(p) {

  return ROLE_DATA[p.role];

}


function realName(id) {

  return getPlayer(id)?.name || "";

}


/* =========================================================
   DISPLAY IDENTITY SYSTEM
   ========================================================= */

function displayMap() {

  const map = Object.fromEntries(
    living().map(p => [
      p.id,
      p.id
    ])
  );

  if (game.displaySwap) {

    const [a, b] =
      game.displaySwap;

    if (
      map[a] &&
      map[b]
    ) {

      map[a] = b;
      map[b] = a;

    }

  }

  return map;

}


function displayName(id) {

  const mapped =
    displayMap()[id];

  return realName(mapped);

}


function displayIdFromName(name) {

  const map =
    displayMap();

  const found =
    Object.entries(map).find(
      ([, realId]) =>
        realName(realId) === name
    );

  return found
    ? found[0]
    : null;

}


/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(
  actor = null,
  excludeId = null
) {

  return living()

    .filter(p => {

      if (
        p.id === excludeId
      ) {
        return false;
      }

      /*
       * Hostiles normally cannot target
       * other Hostiles.
       *
       * Trickster swaps can temporarily
       * make displayed identities confusing.
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
   ACTION / ROUND RESET
   ========================================================= */

function resetTransient() {

  game.actions = {};

  game.blockedPlayers = new Set();

  game.protectedPlayers = new Set();

  game.selectedAction = null;

  game.reactionInfo = {};

}


/* =========================================================
   SCREEN HELPERS
   ========================================================= */

function setScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove("active");

    });

  const screen =
    $(id);

  if (screen) {
    screen.classList.add("active");
  }

  window.scrollTo(
    0,
    0
  );

}


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

  setScreen(
    "setupScreen"
  );

  renderSetup();

}


/*
 * THIS IS THE FIXED PLAYER SETUP.
 *
 * Each player now has:
 *
 * 1. A real name input
 * 2. A role dropdown
 *
 * Names are stored directly inside
 * game.players and survive randomisation.
 */

function renderSetup() {

  const container =
    $("playersSetup");

  if (!container) {
    return;
  }

  container.innerHTML =
    game.players.map((p, i) => {

      const playerName =
        p.name ||
        `Player ${i + 1}`;

      return `

        <div class="setup-player">

          <div class="player-name-section">

            <label
              class="player-name-label"
              for="playerName_${i}"
            >
              Player ${i + 1} Name
            </label>

            <input
              id="playerName_${i}"
              class="player-name-input"
              type="text"
              maxlength="20"
              value="${esc(playerName)}"
              data-name-index="${i}"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false"
              placeholder="Player ${i + 1}"
            >

          </div>


          <div class="player-role-section">

            <label
              class="player-role-label"
              for="playerRole_${i}"
            >
              Role
            </label>

            <select
              id="playerRole_${i}"
              class="role-select"
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

          </div>

        </div>

      `;

    }).join("");


  bindSetupNames();

  bindSetupSelects();

  updatePlayerValidity();

}


/* =========================================================
   PLAYER NAME INPUTS
   ========================================================= */

function bindSetupNames() {

  document
    .querySelectorAll(".player-name-input")
    .forEach(input => {

      input.addEventListener(
        "input",
        () => {

          const index =
            Number(
              input.dataset.nameIndex
            );

          if (
            Number.isNaN(index) ||
            !game.players[index]
          ) {
            return;
          }

          /*
           * Save the name immediately.
           *
           * This means changing a name and then
           * pressing RANDOMISE will NOT erase it.
           */

          game.players[index].name =
            input.value
              .slice(0, 20);

        }
      );


      input.addEventListener(
        "blur",
        () => {

          const index =
            Number(
              input.dataset.nameIndex
            );

          if (
            Number.isNaN(index) ||
            !game.players[index]
          ) {
            return;
          }

          let name =
            input.value.trim();

          if (!name) {

            name =
              `Player ${index + 1}`;

          }

          name =
            name.slice(0, 20);

          game.players[index].name =
            name;

          input.value =
            name;

        }
      );

    });

}


/* =========================================================
   ROLE DROPDOWNS
   ========================================================= */

function bindSetupSelects() {

  document
    .querySelectorAll(".role-select")
    .forEach(select => {

      /*
       * Always start visually as RANDOM.
       *
       * The actual manually selected role is
       * stored in game.randomRoles.
       */

      const index =
        Number(
          select.dataset.index
        );

      select.value = "random";

      select.addEventListener(
        "change",
        () => {

          const value =
            select.value;

          if (
            Number.isNaN(index) ||
            !game.players[index]
          ) {
            return;
          }

          if (value === "random") {

            delete game.randomRoles[index];

            /*
             * If there are no manual roles left,
             * go back to normal random mode.
             */

            game.randomisedRoles =
              Object.keys(
                game.randomRoles
              ).length > 0;

            select.classList.remove(
              "random-hidden"
            );

            return;

          }


          game.randomisedRoles =
            true;

          game.randomRoles[index] =
            value;

          /*
           * Keep the dropdown showing RANDOM
           * so the UI clearly says this player
           * will use the hidden/manual assignment.
           */

          select.value =
            "random";

          select.classList.add(
            "random-hidden"
          );

        }
      );

    });

}


/* =========================================================
   RESET PLAYERS WHEN PLAYER COUNT CHANGES
   ========================================================= */

function resetSetupPlayers() {

  const countInput =
    $("playerCount");

  if (!countInput) {
    return;
  }

  const n =
    Number(
      countInput.value
    );

  game.players =
    Array.from(
      {
        length: n
      },
      (_, i) => ({

        id:
          `p${i + 1}`,

        name:
          `Player ${i + 1}`,

        role:
          "survivor",

        originalRole:
          "survivor",

        alive:
          true,

        infectionRound:
          null,

        hasInfected:
          false

      })
    );


  game.randomisedRoles =
    false;

  game.randomRoles =
    {};


  renderSetup();

}


/* =========================================================
   SETUP VALIDITY
   ========================================================= */

function updatePlayerValidity() {

  const validity =
    $("playerValidity");

  if (!validity) {
    return;
  }

  const n =
    game.players.length;

  const total =
    Object.values(
      settings.counts
    ).reduce(
      (a, b) => a + b,
      0
    );

  validity.textContent =
    `PLAYERS: ${n} / ${n}  •  ${
      total
        ? `CUSTOM ROLES: ${total} / ${n}`
        : "RANDOM ROLES"
    }`;

}


/* =========================================================
   WEIGHTED RANDOM PICK
   ========================================================= */

function weightedPick(
  items,
  weights
) {

  const total =
    items.reduce(
      (sum, role) =>
        sum +
        (weights[role] || 0),
      0
    );

  if (total <= 0) {
    return rand(items);
  }

  let random =
    Math.random() * total;

  for (const role of items) {

    random -=
      weights[role] || 0;

    if (random < 0) {
      return role;
    }

  }

  return items[
    items.length - 1
  ];

}


/* =========================================================
   RANDOM ROLE GENERATION
   ========================================================= */

function randomiseRoles() {

  const n =
    game.players.length;

  const hostileCount =
    HOSTILE_COUNTS[n];

  if (!hostileCount) {

    alert(
      "Choose between 4 and 12 players."
    );

    return;

  }


  const enabledHostiles =
    HOSTILES.filter(
      role =>
        settings.enabled[role]
    );


  if (
    enabledHostiles.length <
    hostileCount
  ) {

    alert(
      "Enable enough Hostile roles to fill the random setup."
    );

    return;

  }


  const enabledHumans =
    HUMANS.filter(
      role =>
        settings.enabled[role] ||
        role === "engineer"
    );


  if (
    enabledHumans.length <
    n - hostileCount
  ) {

    alert(
      "Enable enough Human roles to fill the random setup."
    );

    return;

  }


  let roles = [];


  /*
   * HOSTILES
   */

  const hostileRoles =
    shuffle(
      enabledHostiles
    ).slice(
      0,
      hostileCount
    );

  roles.push(
    ...hostileRoles
  );


  /*
   * ENGINEER IS ALWAYS PRESENT.
   */

  roles.push(
    "engineer"
  );


  /*
   * OTHER HUMANS
   */

  const humansNeeded =
    n -
    hostileCount -
    1;

  let humanPool =
    enabledHumans.filter(
      role =>
        role !== "engineer"
    );


  if (
    humanPool.length <
    humansNeeded
  ) {

    alert(
      "Not enough enabled Human roles for this player count."
    );

    return;

  }


  for (
    let i = 0;
    i < humansNeeded;
    i++
  ) {

    const selected =
      weightedPick(
        humanPool,
        HUMAN_WEIGHTS
      );

    roles.push(
      selected
    );

    humanPool =
      humanPool.filter(
        role =>
          role !== selected
      );

  }


  /*
   * If a configuration ever leaves empty slots,
   * use enabled Neutral roles.
   */

  const neutralSlots =
    n - roles.length;

  if (
    neutralSlots > 0
  ) {

    const enabledNeutrals =
      [
        ...NEUTRALS,
        ...CONCEPTS
      ].filter(
        role =>
          settings.enabled[role]
      );


    if (
      enabledNeutrals.length <
      neutralSlots
    ) {

      alert(
        "Enable enough Neutral roles, or use manual role counts."
      );

      return;

    }


    roles.push(
      ...shuffle(
        enabledNeutrals
      ).slice(
        0,
        neutralSlots
      )
    );

  }


  roles =
    shuffle(roles);


  /*
   * Store the actual roles separately.
   *
   * The dropdowns remain visually RANDOM.
   */

  game.randomRoles =
    Object.fromEntries(
      roles.map(
        (role, index) => [
          index,
          role
        ]
      )
    );


  game.randomisedRoles =
    true;


  renderSetup();

}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

  const n =
    game.players.length;

  const hostileCount =
    HOSTILE_COUNTS[n];


  if (!hostileCount) {

    alert(
      "Choose between 4 and 12 players."
    );

    return;

  }


  /*
   * Make sure the latest typed names are stored.
   */

  document
    .querySelectorAll(".player-name-input")
    .forEach(input => {

      const index =
        Number(
          input.dataset.nameIndex
        );

      if (
        game.players[index]
      ) {

        const typed =
          input.value.trim();

        game.players[index].name =
          typed ||
          `Player ${index + 1}`;

      }

    });


  let roles;


  if (
    game.randomisedRoles
  ) {

    roles =
      Array.from(
        {
          length: n
        },
        (_, i) =>
          game.randomRoles[i]
      );

  } else {

    roles =
      game.players.map(
        p =>
          p.role
      );

  }


  /*
   * Every player must have a real role.
   */

  if (
    roles.some(
      role =>
        !role ||
        role === "random"
    )
  ) {

    alert(
      "Press RANDOMISE ROLES or choose roles for the players first."
    );

    return;

  }


  /*
   * Validate roles.
   */

  const counts =
    Object.fromEntries(
      ROLE_KEYS.map(
        role => [
          role,
          0
        ]
      )
    );


  roles.forEach(
    role => {

      if (
        counts[role] !== undefined
      ) {
        counts[role]++;
      }

    }
  );


  if (
    counts.engineer !== 1
  ) {

    alert(
      "There must be exactly 1 Engineer."
    );

    return;

  }


  const actualHostiles =
    HOSTILES.reduce(
      (sum, role) =>
        sum +
        (counts[role] || 0),
      0
    );


  if (
    actualHostiles !==
    hostileCount
  ) {

    alert(
      `This setup needs exactly ${hostileCount} Hostile role(s).`
    );

    return;

  }


  const validRoles =
    roles.every(
      role =>
        ROLE_DATA[role] &&
        !ROLE_DATA[role].sub &&
        (
          settings.enabled[role] ||
          role === "engineer"
        )
    );


  if (!validRoles) {

    alert(
      "A disabled role is selected."
    );

    return;

  }


  /*
   * Apply roles.
   */

  game.players.forEach(
    (p, i) => {

      p.role =
        roles[i];

      p.originalRole =
        roles[i];

      p.alive =
        true;

      p.infectionRound =
        null;

      p.hasInfected =
        false;

    }
  );


  /*
   * Reset complete game state.
   */

  game.round = 1;

  game.stage = 1;

  game.gameOver = false;

  game.lifelineNumber = 0;

  game.judgeUsed = false;

  game.tricksterUsed = false;

  game.displaySwap = null;

  game.silencedUntil = {};

  game.votes = {};

  game.previousActions = {};

  game.lastRoundResults = [];

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

  if (
    checkVictory()
  ) {
    return;
  }


  /*
   * IMPORTANT:
   * Save the previous round's actions BEFORE
   * resetting the current round.
   *
   * This fixes Detective.
   */

  game.previousActions =
    {
      ...game.actions
    };


  resetTransient();


  /*
   * Snapshot everyone alive at the START
   * of this round.
   *
   * Anyone who dies later still gets a
   * Reaction Round result.
   */

  game.roundStartAliveIds =
    living().map(
      p => p.id
    );


  game.abilityQueue =
    [
      ...game.roundStartAliveIds
    ];

  game.abilityIndex =
    0;


  passToAbility();

}


/* =========================================================
   PASS PHONE TO ABILITY PLAYER
   ========================================================= */

function passToAbility() {

  if (
    game.abilityIndex >=
    game.abilityQueue.length
  ) {

    resolveAbilities();

    return;

  }


  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );


  if (!p) {

    advanceAbility();

    return;

  }


  $("passPlayerName").textContent =
    p.name;

  $("passRound").textContent =
    `ROUND ${game.round} • STAGE ${game.stage} / 10`;

  $("passSubtext").textContent =
    "PASS THE PHONE TO THIS PLAYER";


  game.currentPlayerIndex =
    game.abilityIndex;


  setScreen(
    "passScreen"
  );

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
    roleTeam(p);


  $("roleName").className =
    `role-title ${teamClass(team)}`;


  $("roleTeam").textContent =
    `${team.toUpperCase()} TEAM`;

  $("roleTeam").className =
    `team-badge ${teamClass(team)}`;


  $("roleDescription").textContent =
    ROLE_DATA[p.role]?.desc ||
    "";


  $("hostileList").innerHTML =
    "";


  /*
   * Infected players are NOT shown as Hostile.
   */

  if (
    team === "Hostile"
  ) {

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

            <strong>
              HOSTILE ALLIES
            </strong>

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

            <strong>
              HOSTILE ALLIES
            </strong>

            <br>

            None

          </div>
        `;

  }


  setScreen(
    "roleScreen"
  );

}


/* =========================================================
   CAN ROLE ACT?
   ========================================================= */

function canAct(p) {

  if (!alive(p)) {
    return false;
  }


  /*
   * Engineer works even with Power offline.
   */

  if (
    p.role === "engineer"
  ) {
    return true;
  }


  /*
   * These roles have no ability.
   */

  if (
    p.role === "diseased" ||
    p.role === "infected" ||
    p.role === "survivor" ||
    p.role === "jester" ||
    p.role === "king"
  ) {

    return false;

  }


  /*
   * Power disables abilities.
   */

  if (
    !game.systems.power
  ) {

    return false;

  }


  /*
   * Guarded players cannot act.
   */

  if (
    game.blockedPlayers.has(
      p.id
    )
  ) {

    return false;

  }


  /*
   * Judge is one-use.
   */

  if (
    p.role === "judge" &&
    game.judgeUsed
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   SHOW ACTION
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

  game.selectedAction =
    null;


  /*
   * No action available.
   */

  if (!canAct(p)) {

    let message =
      "Your ability cannot be used this round.";


    if (
      p.role === "diseased"
    ) {

      message =
        "You are Diseased. You cannot use an ability.";

    }


    else if (
      p.role === "infected"
    ) {

      message =
        "You are Infected. You do not have an ability.";

    }


    else if (
      !game.systems.power &&
      p.role !== "engineer"
    ) {

      message =
        "⚡ POWER IS OFFLINE. Your ability is disabled.";

    }


    else if (
      game.blockedPlayers.has(
        p.id
      )
    ) {

      message =
        "🛡️ Your ability was blocked this round.";

    }


    $("actionDescription").textContent =
      message;

    $("confirmActionButton").textContent =
      "CONTINUE";

    $("confirmActionButton").onclick =
      () => completeAbility();


    setScreen(
      "actionScreen"
    );

    return;

  }


  /*
   * ALIEN
   */

  if (
    p.role === "alien"
  ) {

    const saboteurAlive =
      living().some(
        x =>
          x.role === "saboteur"
      );


    $("actionDescription").textContent =
      saboteurAlive
        ? "A living Saboteur exists, so you can only kill."
        : "Choose whether to Kill or Sabotage.";


    $("actionOptions").innerHTML =
      `
        <button
          type="button"
          class="choice-button"
          data-mode="kill"
        >
          ☠️ KILL
        </button>

        ${
          saboteurAlive
            ? ""
            : `
              <button
                type="button"
                class="choice-button"
                data-mode="sabotage"
              >
                💥 SABOTAGE
              </button>
            `
        }
      `;


    $("actionOptions")
      .querySelectorAll("button")
      .forEach(btn => {

        btn.onclick = () => {

          const mode =
            btn.dataset.mode;


          $("actionOptions")
            .querySelectorAll("button")
            .forEach(
              x =>
                x.classList.remove(
                  "selected"
                )
            );


          btn.classList.add(
            "selected"
          );


          if (
            mode === "kill"
          ) {

            renderTargetChoices(
              p,
              null,
              "kill"
            );

          }

          else {

            renderSystemChoices();

          }

        };

      });


    /*
     * Default to kill if Saboteur exists.
     */

    if (
      saboteurAlive
    ) {

      const killButton =
        $("actionOptions")
          .querySelector(
            '[data-mode="kill"]'
          );

      if (killButton) {
        killButton.click();
      }

    }


  }


  /*
   * SABOTEUR
   */

  else if (
    p.role === "saboteur"
  ) {

    renderSystemChoices();

  }


  /*
   * SILENCER
   */

  else if (
    p.role === "silencer"
  ) {

    renderTargetChoices(
      p,
      null,
      "silence"
    );

  }


  /*
   * PARASITE
   */

  else if (
    p.role === "parasite"
  ) {

    if (
      p.hasInfected
    ) {

      $("actionDescription").textContent =
        "You already used your infection.";

      game.selectedAction =
        "none";

    }

    else {

      renderTargetChoices(
        p,
        null,
        "infect"
      );

    }

  }


  /*
   * ENGINEER
   */

  else if (
    p.role === "engineer"
  ) {

    renderSystemChoices(
      true
    );

  }


  /*
   * SCIENTIST
   */

  else if (
    p.role === "scientist"
  ) {

    renderScientistChoices(
      p
    );

  }


  /*
   * DETECTIVE
   */

  else if (
    p.role === "detective"
  ) {

    renderTargetChoices(
      p,
      null,
      "detect"
    );

  }


  /*
   * MEDIC
   */

  else if (
    p.role === "medic"
  ) {

    renderTargetChoices(
      p,
      null,
      "protect"
    );

  }


  /*
   * GUARD
   */

  else if (
    p.role === "guard"
  ) {

    renderTargetChoices(
      p,
      null,
      "block"
    );

  }


  /*
   * RADIO
   */

  else if (
    p.role === "radio"
  ) {

    if (
      !game.systems.communications
    ) {

      $("actionDescription").textContent =
        "📡 COMMUNICATIONS IS OFFLINE.";

      game.selectedAction =
        "none";

    }

    else {

      $("actionDescription").textContent =
        "Choose RECEIVE to get a private message from Earth.";

      $("actionOptions").innerHTML =
        `
          <button
            type="button"
            class="choice-button"
            data-value="radio"
          >
            📻 RECEIVE EARTH MESSAGE
          </button>
        `;


      $("actionOptions")
        .querySelector("button")
        .onclick = () => {

          game.selectedAction =
            "radio";

          $("actionOptions")
            .querySelector("button")
            .classList.add(
              "selected"
            );

        };

    }

  }


  /*
   * CAPTAIN
   */

  else if (
    p.role === "captain"
  ) {

    $("actionDescription").textContent =
      "Your ability activates automatically if the vote ties.";

    game.selectedAction =
      "none";

  }


  /*
   * JUDGE
   */

  else if (
    p.role === "judge"
  ) {

    $("actionDescription").textContent =
      "Your ability activates automatically if a vote would eject a player.";

    game.selectedAction =
      "none";

  }


  /*
   * TRICKSTER
   */

  else if (
    p.role === "trickster"
  ) {

    if (
      game.tricksterUsed
    ) {

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction =
        "none";

    }

    else {

      renderSwapChoices(
        p
      );

    }

  }


  /*
   * NO ABILITY
   */

  else {

    $("actionDescription").textContent =
      "No special ability.";

    game.selectedAction =
      "none";

  }


  $("confirmActionButton").textContent =
    "CONFIRM";

  $("confirmActionButton").onclick =
    completeAbility;


  setScreen(
    "actionScreen"
  );

}


/* =========================================================
   SCIENTIST
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
    .forEach(btn => {

      btn.onclick = () => {

        const target =
          getPlayer(
            btn.dataset.value
          );


        if (!target) {
          return;
        }


        $("actionOptions")
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove(
                "selected"
              )
          );


        btn.classList.add(
          "selected"
        );


        const canCure =
          target.role === "infected" ||
          target.role === "diseased";


        $("actionDescription").textContent =
          canCure

            ? `${target.name} has an infection status. Choose CHECK or CURE.`

            : `Check ${target.name}'s condition.`;


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
          .forEach(
            option => {

              option.onclick =
                () => {

                  const mode =
                    option.dataset.value;

                  game.selectedAction =
                    JSON.stringify({
                      type: "science",
                      target: target.id,
                      mode
                    });


                  $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(
                      x =>
                        x.classList.remove(
                          "selected"
                        )
                    );


                  option.classList.add(
                    "selected"
                  );

                };

            }
          );

      };

    });

}


/* =========================================================
   TARGET CHOICES
   ========================================================= */

function renderTargetChoices(
  p,
  unused,
  action
) {

  const descriptions = {

    kill:
      "Choose a player to kill.",

    silence:
      "Choose a player to silence for 2 rounds.",

    infect:
      "Choose a player to secretly infect.",

    detect:
      "Choose a player to investigate.",

    protect:
      "Choose a player to protect from a kill.",

    block:
      "Choose a player whose ability you want to block."

  };


  $("actionDescription").textContent =
    descriptions[action] ||
    "Choose a player.";


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
    .forEach(btn => {

      btn.onclick = () => {

        game.selectedAction =
          JSON.stringify({

            type:
              action,

            target:
              btn.dataset.value

          });


        $("actionOptions")
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove(
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
   SYSTEM CHOICES
   ========================================================= */

function renderSystemChoices(
  engineer = false
) {

  const systems =
    engineer

      ? Object.keys(
          game.systems
        ).filter(
          key =>
            !game.systems[key]
        )

      : Object.keys(
          game.systems
        );


  if (
    !systems.length
  ) {

    $("actionDescription").textContent =
      engineer
        ? "All ship systems are already online."
        : "No systems are available.";

    game.selectedAction =
      "none";

    return;

  }


  $("actionDescription").textContent =
    engineer

      ? "Choose one offline system to repair."

      : "Choose one ship system to sabotage.";


  $("actionOptions").innerHTML =
    systems
      .map(
        system =>
          button(
            `${game.systems[system] ? "🟢" : "🔴"} ${system.toUpperCase()}`,
            system
          )
      )
      .join("");


  $("actionOptions")
    .querySelectorAll("button")
    .forEach(btn => {

      btn.onclick = () => {

        game.selectedAction =
          JSON.stringify({

            type:
              engineer
                ? "repair"
                : "sabotage",

            system:
              btn.dataset.value

          });


        $("actionOptions")
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove(
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
   TRICKSTER SWAP
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
    .forEach(btn => {

      btn.onclick = () => {

        const id =
          btn.dataset.value;


        if (
          chosen.includes(id)
        ) {

          chosen =
            chosen.filter(
              x =>
                x !== id
            );

          btn.classList.remove(
            "selected"
          );

        }

        else if (
          chosen.length < 2
        ) {

          chosen.push(id);

          btn.classList.add(
            "selected"
          );

        }


        if (
          chosen.length === 2
        ) {

          game.selectedAction =
            JSON.stringify({

              type:
                "swap",

              a:
                chosen[0],

              b:
                chosen[1]

            });

        }

        else {

          game.selectedAction =
            null;

        }

      };

    });

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


  if (!p) {

    advanceAbility();

    return;

  }


  if (!alive(p)) {

    advanceAbility();

    return;

  }


  let action =
    game.selectedAction;


  if (
    typeof action === "string" &&
    action.startsWith("{")
  ) {

    try {

      action =
        JSON.parse(action);

    }

    catch {

      action =
        "none";

    }

  }


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

  }

  else if (
    action === "radio" &&
    game.systems.communications
  ) {

    game.actions[p.id] = {

      type:
        "radio",

      message:
        randomRadioMessage()

    };

    game.reactionInfo[p.id] =
      game.actions[p.id].message;

  }

  else {

    game.actions[p.id] = {

      type:
        "none"

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

  }

  else {

    resolveAbilities();

  }

}


/* =========================================================
   APPLY IMMEDIATE ACTION
   ========================================================= */

function applyImmediateAction(
  p,
  action
) {

  if (!action) {
    return;
  }


  /*
   * ENGINEER
   */

  if (
    action.type === "repair"
  ) {

    if (
      !game.systems[
        action.system
      ]
    ) {

      game.systems[
        action.system
      ] = true;

    }

  }


  /*
   * SABOTAGE
   */

  if (
    action.type === "sabotage"
  ) {

    /*
     * Saboteur can sabotage.
     * Alien can only sabotage if no living
     * Saboteur exists.
     */

    const validSaboteur =
      p.role === "saboteur";

    const validAlien =
      p.role === "alien" &&
      !living().some(
        x =>
          x.role === "saboteur"
      );


    if (
      validSaboteur ||
      validAlien
    ) {

      game.systems[
        action.system
      ] = false;

    }

  }


  /*
   * MEDIC
   */

  if (
    action.type === "protect"
  ) {

    game.protectedPlayers.add(
      action.target
    );

  }


  /*
   * GUARD
   */

  if (
    action.type === "block"
  ) {

    game.blockedPlayers.add(
      action.target
    );

  }


  /*
   * SILENCER
   */

  if (
    action.type === "silence"
  ) {

    game.silencedUntil[
      action.target
    ] =
      Math.max(
        game.silencedUntil[
          action.target
        ] || 0,

        game.round + 2
      );

  }


  /*
   * TRICKSTER
   */

  if (
    action.type === "swap"
  ) {

    if (
      !game.tricksterUsed
    ) {

      game.displaySwap = [
        action.a,
        action.b
      ];

      game.tricksterUsed =
        true;

    }

  }


  /*
   * PARASITE
   *
   * IMPORTANT:
   *
   * The target does NOT receive an
   * infection message.
   *
   * They physically cannot know.
   */

  if (
    action.type === "infect"
  ) {

    p.hasInfected =
      true;


    const target =
      getPlayer(
        action.target
      );


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
       * NO message to target.
       */

    }

  }


  /*
   * SCIENTIST
   */

  if (
    action.type === "science"
  ) {

    const target =
      getPlayer(
        action.target
      );


    if (!target) {
      return;
    }


    let status;


    if (
      target.role === "infected"
    ) {

      status =
        "Infected";

    }

    else if (
      target.role === "diseased"
    ) {

      status =
        "Diseased";

    }

    else if (
      target.role === "parasite"
    ) {

      status =
        "Parasite";

    }

    else {

      status =
        "Healthy";

    }


    if (
      action.mode === "check"
    ) {

      game.reactionInfo[p.id] =
        `SCIENCE: ${target.name} is ${status}.`;

    }


    /*
     * CURE
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

      target.originalRole =
        "survivor";

      target.infectionRound =
        null;

      target.hasInfected =
        false;


      game.reactionInfo[p.id] =
        `SCIENCE: ${target.name} was cured and is now a Survivor.`;

    }

  }


  /*
   * DETECTIVE
   */

  if (
    action.type === "detect"
  ) {

    const target =
      getPlayer(
        action.target
      );


    if (target) {

      const previous =
        game.previousActions[
          target.id
        ];


      game.reactionInfo[p.id] =
        detectiveMessage(
          target,
          previous
        );

    }

  }


  /*
   * RADIO
   */

  if (
    action.type === "radio"
  ) {

    game.reactionInfo[p.id] =
      action.message;

  }

}


/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

  /*
   * Resolve kills AFTER all protection/blocking
   * choices have been collected.
   */

  const killActions =
    Object.entries(
      game.actions
    ).filter(
      ([, action]) =>
        action.type === "kill"
    );


  for (
    const [actorId, action]
    of killActions
  ) {

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
      game.blockedPlayers.has(
        actor.id
      )
    ) {

      continue;

    }


    if (
      game.protectedPlayers.has(
        target.id
      )
    ) {

      game.reactionInfo[target.id] =
        "You were attacked, but you were protected.";

      continue;

    }


    target.alive =
      false;


    game.lastRoundResults.push(
      `${target.name} was killed.`
    );


    game.reactionInfo[target.id] =
      "You were killed this round.";

  }


  /*
   * INFECTION PROGRESSION
   *
   * Round 1:
   * Hidden Infected
   *
   * Round 2:
   * Diseased
   *
   * Round 3:
   * Parasite
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

    }


    else if (
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


  /*
   * Check for an immediate victory before
   * showing the Reaction Round.
   *
   * We intentionally don't end immediately here
   * if someone died, because everyone alive at
   * the start of the round must still receive
   * their Reaction result.
   */

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

    return `${target.name} interacted with Communications.`;

  }


  if (
    action.target
  ) {

    const targetName =
      realName(
        action.target
      );


    return `${target.name} interacted with ${targetName}.`;

  }


  if (
    action.system
  ) {

    return `${target.name} interacted with ${action.system.toUpperCase()}.`;

  }


  if (
    action.type === "swap"
  ) {

    return `${target.name} interacted with two displayed identities.`;

  }


  return `${target.name} had an interaction last round.`;

}


/* =========================================================
   RADIO MESSAGES
   ========================================================= */

function randomRadioMessage() {

  const hostiles =
    living().filter(
      isHostile
    );

  const hostileCount =
    hostiles.length;


  const sabotaged =
    Object.keys(
      game.systems
    ).filter(
      system =>
        !game.systems[system]
    );


  const messages = [];


  /*
   * Exact hostile count.
   */

  messages.push(
    `EARTH: There are exactly ${hostileCount} hostiles remaining.`
  );


  /*
   * Specific offline system.
   */

  if (
    sabotaged.length
  ) {

    const system =
      rand(
        sabotaged
      );

    messages.push(
      `EARTH: ${system.toUpperCase()} is currently OFFLINE.`
    );

  }


  /*
   * Specific hostile clue.
   */

  if (
    hostileCount > 0
  ) {

    const sample =
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
      sample.length
    ) {

      messages.push(
        `EARTH: ${sample.map(p => p.name).join(", ")} — one of them is hostile.`
      );

    }

  }


  /*
   * Specific sabotage clue.
   */

  if (
    sabotaged.length
  ) {

    const sample =
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
      sample.length
    ) {

      messages.push(
        `EARTH: ${sample.map(p => p.name).join(", ")} — one of them may have caused the system failure.`
      );

    }

  }


  return rand(
    messages
  );

}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function showReactions() {

  /*
   * IMPORTANT:
   *
   * Use the snapshot from the beginning
   * of the round.
   *
   * Therefore a player killed during Round X
   * still receives Round X's Reaction screen.
   */

  game.reactionQueue =
    [
      ...game.roundStartAliveIds
    ];

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

    showDiscussion();

    return;

  }


  const p =
    getPlayer(
      game.reactionQueue[
        game.reactionIndex
      ]
    );


  if (!p) {

    game.reactionIndex++;

    nextReaction();

    return;

  }


  $("reactionRound").textContent =
    `ROUND ${game.round}`;

  $("reactionStage").textContent =
    `STAGE ${game.stage} / 10`;

  $("reactionPlayerName").textContent =
    p.name;

  $("reactionReadyButton").textContent =
    "SHOW MY RESULT";


  setScreen(
    "reactionScreen"
  );

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
    return;
  }


  $("reactionResultTitle").textContent =
    p.alive
      ? "ROUND RESULT"
      : "YOU DIED THIS ROUND";


  let message =
    game.reactionInfo[p.id];


  if (!message) {

    const silenceEnd =
      game.silencedUntil[p.id] || 0;


    if (
      silenceEnd >
      game.round
    ) {

      const remaining =
        silenceEnd -
        game.round;


      message =
        `You have been silenced for ${remaining} more round(s). You cannot vote.`;

    }

    else {

      message =
        "Nothing happened to you this round.";

    }

  }


  $("reactionResultMessage").textContent =
    message;


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
        ([key, online]) =>
          `${online ? "🟢" : "🔴"} ${key.toUpperCase()}`
      )
      .join("  ");


  $("discussionRound").textContent =
    `ROUND ${game.round}`;

  $("discussionStage").textContent =
    `STAGE ${game.stage} / 10`;


  $("roundResults").innerHTML =
    `
      <p>
        ${
          game.lastRoundResults.length
            ? game.lastRoundResults.join("<br>")
            : "No deaths this round."
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

    resolveVoting();

    return;

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


  if (silenced) {

    $("voteOptions").innerHTML =
      button(
        "SKIP (SILENCED)",
        "skip"
      );

  }

  else {

    $("voteOptions").innerHTML =
      [
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

  }


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
          .forEach(
            x =>
              x.classList.remove(
                "selected"
              )
          );


        btn.classList.add(
          "selected"
        );

      };

    });


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

  const alivePlayers =
    living();


  const p =
    alivePlayers[
      game.currentVoteIndex
    ];


  if (!p) {
    return;
  }


  if (
    !game.selectedVote
  ) {

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
  ).forEach(
    vote => {

      if (
        vote !== "skip"
      ) {

        tally[vote] =
          (
            tally[vote] ||
            0
          ) + 1;

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

  if (
    tied.length === 1
  ) {

    finishEjection(
      tied[0],
      false
    );

    return;

  }


  /*
   * Tie.
   *
   * Captain gets the final choice.
   */

  if (
    tied.length > 1
  ) {

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

  $("captainTieOptions").innerHTML =
    `
      <p>
        ${esc(captain.name)}, choose one tied player to eject.
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
    .forEach(btn => {

      btn.onclick = () => {

        finishEjection(
          btn.dataset.value,
          true
        );

      };

    });


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

  /*
   * Judge can cancel ANY ejection.
   *
   * This includes Captain tie-breakers
   * and normal majority votes.
   */

  if (id) {

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
       * Judge automatically cancels
       * the ejection.
       */

      game.judgeUsed =
        true;


      $("voteResultTitle").textContent =
        "EJECTION CANCELLED";


      $("voteResultMessage").textContent =
        "⚖️ The Judge cancelled the ejection. Nobody was voted out.";


      $("afterVoteButton").onclick =
        afterVoting;


      setScreen(
        "voteResultScreen"
      );

      return;

    }


    const player =
      getPlayer(id);


    if (player) {

      player.alive =
        false;


      /*
       * JESTER
       *
       * Only wins if normally voted out.
       *
       * Judge cancellation does not trigger
       * this because cancellation returns above.
       */

      if (
        player.role === "jester"
      ) {

        $("voteResultTitle").textContent =
          "JESTER WINS";


        $("voteResultMessage").textContent =
          `${player.name} was voted out and wins as the Jester!`;


        game.gameOver =
          true;

      }

      else {

        $("voteResultTitle").textContent =
          "PLAYER VOTED OUT";


        $("voteResultMessage").textContent =
          `${player.name} was voted out.`;

      }

    }

  }

  else {

    $("voteResultTitle").textContent =
      "NO EJECTION";


    $("voteResultMessage").textContent =
      "Nobody was voted out.";

  }


  $("afterVoteButton").onclick =
    afterVoting;


  setScreen(
    "voteResultScreen"
  );

}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

  /*
   * Trickster swap lasts until the FULL
   * vote resolution is finished.
   */

  game.displaySwap =
    null;


  if (
    game.gameOver
  ) {

    showGameOver();

    return;

  }


  /*
   * Check King / Hostile victory after voting.
   */

  if (
    checkVictory()
  ) {

    return;

  }


  /*
   * Earth lifeline happens exactly every
   * 3 rounds.
   *
   * It is permanently lost if Communications
   * is offline.
   */

  if (
    game.round % 3 === 0
  ) {

    if (
      game.systems.communications
    ) {

      game.lifelineNumber++;

      showLifeline();

    }

    else {

      proceedToSystems();

    }

  }

  else {

    proceedToSystems();

  }

}


/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showLifeline() {

  const hostiles =
    living().filter(
      isHostile
    );


  const nonHostiles =
    living().filter(
      p =>
        !isHostile(p)
    );


  /*
   * Exactly ONE listed player is actually hostile.
   *
   * Fill the rest with non-hostiles.
   */

  const selected = [];


  if (
    hostiles.length
  ) {

    selected.push(
      rand(hostiles)
    );

  }


  selected.push(
    ...shuffle(
      nonHostiles
    ).slice(
      0,
      Math.max(
        0,
        3 - selected.length
      )
    )
  );


  const message =
    selected.length

      ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${selected.map(p => p.name).join(", ")}`

      : "Earth sent no useful clue.";


  $("lifelineTitle").textContent =
    `EARTH LIFELINE #${game.lifelineNumber}`;


  $("lifelineMessage").textContent =
    message;


  $("lifelineContinue").onclick =
    proceedToSystems;


  setScreen(
    "lifelineScreen"
  );

}


/* =========================================================
   SYSTEMS SCREEN
   ========================================================= */

function proceedToSystems() {

  /*
   * Engines only progress if Engines are ONLINE.
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

    earthCheck();

    return;

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
        ([key, online]) =>
          `
            <div>
              ${online ? "🟢" : "🔴"}
              <strong>
                ${key.toUpperCase()}
              </strong>
              —
              ${online ? "ONLINE" : "OFFLINE"}
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
   * If a Neutral is alive when Earth is reached,
   * Neutral wins.
   */

  if (
    neutrals.length
  ) {

    endGame(
      "NEUTRAL VICTORY",
      "The ship reached Earth with a Neutral player still alive."
    );

    return;

  }


  endGame(
    "HUMAN VICTORY",
    "The crew completed all 10 stages and reached Earth."
  );

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


  const hostiles =
    living().filter(
      isHostile
    );


  const nonHostiles =
    living().filter(
      p =>
        !isHostile(p)
    );


  /*
   * Hostiles win when they equal or outnumber
   * everyone else alive.
   */

  if (
    hostiles.length >=
      nonHostiles.length &&
    hostiles.length > 0
  ) {

    endGame(
      "HOSTILE VICTORY",
      "The Hostile team now equals or outnumbers everyone else alive."
    );

    return true;

  }


  /*
   * Survivor King wins independently
   * if one of the final 2.
   */

  if (
    living().length === 2
  ) {

    const kings =
      living().filter(
        p =>
          p.role === "king"
      );


    if (
      kings.length
    ) {

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
      .map(
        p => {

          const team =
            roleTeam(p);


          return `
            <div
              class="${p.alive ? "" : "dead"}"
            >

              <strong>
                ${esc(p.name)}
              </strong>

              —

              ${
                ROLE_DATA[p.role]?.icon ||
                ""
              }

              ${
                ROLE_DATA[p.role]?.name ||
                p.role
              }

              <span
                class="team-${teamClass(team)}"
              >
                [${team}]
              </span>

              ${
                p.alive
                  ? "ALIVE"
                  : "DEAD"
              }

            </div>
          `;

        }
      )
      .join("");


  setScreen(
    "gameOverScreen"
  );

}


/* =========================================================
   GAME OVER DISPLAY
   ========================================================= */

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

  const modal =
    $(id);

  if (modal) {
    modal.classList.add(
      "open"
    );
  }

}


function closeModal(id) {

  const modal =
    $(id);

  if (modal) {
    modal.classList.remove(
      "open"
    );
  }

}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

  const sections = [

    [
      "HOSTILE",
      [
        ...HOSTILES,
        "diseased"
      ]
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
        ([title, roles]) =>
          `
            <section>

              <h3>
                ${title}
              </h3>

              ${
                roles
                  .map(
                    role => {

                      const data =
                        ROLE_DATA[role];


                      return `
                        <article
                          class="guide-card ${teamClass(data.team)}"
                        >

                          <div
                            class="guide-icon"
                          >
                            ${data.icon}
                          </div>

                          <div>

                            <strong>
                              ${data.name}
                            </strong>

                            <div
                              class="guide-team"
                            >
                              ${data.team}
                            </div>

                            <p>
                              ${data.desc}
                            </p>

                          </div>

                        </article>
                      `;

                    }
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
        ([title, roles]) =>
          `
            <section>

              <h3>
                ${title}
              </h3>

              ${
                roles
                  .map(
                    role => {

                      const locked =
                        role === "engineer";


                      return `
                        <div
                          class="custom-row ${locked ? "locked" : ""}"
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
                              value="${settings.counts[role] || 0}"
                              data-role-count="${role}"
                              ${locked ? "readonly" : ""}
                            >

                          </label>

                          <label
                            class="switch"
                          >

                            <input
                              type="checkbox"
                              data-role-enabled="${role}"
                              ${
                                (
                                  settings.enabled[role] ||
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
   * ENABLE / DISABLE
   */

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-enabled]"
    )
    .forEach(
      input => {

        input.onchange =
          () => {

            const role =
              input.dataset.roleEnabled;


            settings.enabled[role] =
              input.checked;


            if (
              !input.checked
            ) {

              settings.counts[role] =
                0;

            }


            renderCustomRoles();

            renderSetup();

          };

      }
    );


  /*
   * COUNTS
   */

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-count]"
    )
    .forEach(
      input => {

        input.onchange =
          () => {

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
              settings.counts[role] >
              0
            ) {

              settings.enabled[role] =
                true;

            }


            updatePlayerValidity();

          };

      }
    );

}


/* =========================================================
   APPLY CUSTOM ROLES
   ========================================================= */

function applyCustomRoles() {

  const n =
    game.players.length;


  const selected =
    [];


  Object.entries(
    settings.counts
  ).forEach(
    ([role, count]) => {

      for (
        let i = 0;
        i < count;
        i++
      ) {

        selected.push(
          role
        );

      }

    }
  );


  if (
    selected.length !== n
  ) {

    alert(
      `Custom roles must total exactly ${n} players. Current total: ${selected.length}.`
    );

    return;

  }


  if (
    !selected.includes(
      "engineer"
    )
  ) {

    alert(
      "Engineer is required."
    );

    return;

  }


  const hostileCount =
    selected.filter(
      role =>
        HOSTILES.includes(role)
    ).length;


  if (
    hostileCount !==
    HOSTILE_COUNTS[n]
  ) {

    alert(
      `You need exactly ${HOSTILE_COUNTS[n]} Hostile role(s).`
    );

    return;

  }


  game.randomRoles =
    Object.fromEntries(
      shuffle(selected)
        .map(
          (role, index) => [
            index,
            role
          ]
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
   MOBILE-SAFE RANDOM BUTTON
   ========================================================= */

/*
 * Some mobile browsers can cause problems when
 * buttons are nested inside forms or when touch
 * and click fire together.
 *
 * This handler uses POINTERUP and has a small
 * duplicate-event guard.
 */

function bindRandomButton() {

  const original =
    $("randomRolesButton");

  if (!original) {
    return;
  }


  original.type =
    "button";


  /*
   * Remove old listeners safely by replacing
   * the button with a clone.
   */

  const buttonElement =
    original.cloneNode(true);


  original.replaceWith(
    buttonElement
  );


  buttonElement.type =
    "button";


  let lastPress =
    0;


  const handleRandom =
    event => {

      if (
        event
      ) {

        event.preventDefault();

        event.stopPropagation();

      }


      const now =
        Date.now();


      /*
       * Prevent touch + click from causing
       * two randomisations.
       */

      if (
        now - lastPress <
        500
      ) {

        return;

      }


      lastPress =
        now;


      randomiseRoles();

    };


  if (
    window.PointerEvent
  ) {

    buttonElement.addEventListener(
      "pointerup",
      handleRandom
    );

  }

  else {

    buttonElement.addEventListener(
      "click",
      handleRandom
    );

  }

}


/* =========================================================
   INITIALISE UI
   ========================================================= */

function initGameUI() {

  const playerCount =
    $("playerCount");


  if (!playerCount) {
    return;
  }


  /*
   * PLAYER COUNT
   */

  playerCount.onchange =
    resetSetupPlayers;


  /*
   * INITIAL PLAYERS
   */

  if (
    !game.players.length
  ) {

    resetSetupPlayers();

  }

  else {

    renderSetup();

  }


  /*
   * RANDOM ROLES
   */

  bindRandomButton();


  /*
   * START
   */

  $("startGameButton").onclick =
    event => {

      event.preventDefault();

      startGame();

    };


  /*
   * ROLE GUIDE
   */

  $("roleGuideButton").onclick =
    () => {

      renderRoleGuide();

      openModal(
        "roleGuideModal"
      );

    };


  /*
   * CUSTOM ROLES
   */

  $("customRolesButton").onclick =
    () => {

      renderCustomRoles();

      openModal(
        "customRoleModal"
      );

    };


  /*
   * MODAL CLOSE BUTTONS
   */

  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach(
      buttonElement => {

        buttonElement.onclick =
          () => {

            closeModal(
              buttonElement.dataset.close
            );

          };

      }
    );


  /*
   * ROLE SCREEN
   */

  $("readyButton").onclick =
    showRole;


  /*
   * ACTION SCREEN
   */

  $("showActionButton").onclick =
    showAction;


  /*
   * REACTION SCREEN
   */

  $("reactionReadyButton").onclick =
    showReactionResult;


  $("reactionContinueButton").onclick =
    advanceReaction;


  /*
   * DISCUSSION
   */

  $("startVotingButton").onclick =
    startVoting;


  /*
   * RESTART
   */

  $("restartButton").onclick =
    () => {

      location.reload();

    };


  /*
   * CUSTOM ROLE APPLY
   */

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

}

else {

  initGameUI();

}
