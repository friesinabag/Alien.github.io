"use strict";

/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */

/* =========================================================
   SETTINGS
   ========================================================= */

const SPRITE_SHEET = "alien-icon.png";

const $ = id => document.getElementById(id);

const ROLE_DATA = {
  alien: {
    icon: "👽",
    name: "Alien",
    team: "Hostile",
    desc: "Kill 1 player every round. If there is no living Saboteur, you may choose to kill or sabotage."
  },

  saboteur: {
    icon: "😈",
    name: "Saboteur",
    team: "Hostile",
    desc: "Sabotage 1 ship system every round."
  },

  silencer: {
    icon: "🔇",
    name: "Silencer",
    team: "Hostile",
    desc: "Silence 1 living player for 2 rounds. They cannot vote."
  },

  parasite: {
    icon: "🦠",
    name: "Parasite",
    team: "Hostile",
    desc: "Secretly infect 1 player once. Their infection eventually progresses to Diseased, then Parasite."
  },

  engineer: {
    icon: "🔧",
    name: "Engineer",
    team: "Human",
    desc: "Repair 1 offline ship system every round. The Engineer can act while Power is offline."
  },

  scientist: {
    icon: "🧪",
    name: "Scientist",
    team: "Human",
    desc: "Check a player to discover whether they are Healthy, Infected, Diseased or Parasite. You can cure Infected or Diseased players."
  },

  detective: {
    icon: "🕵️",
    name: "Detective",
    team: "Human",
    desc: "Investigate a player to see what they interacted with during the previous round."
  },

  medic: {
    icon: "🩺",
    name: "Medic",
    team: "Human",
    desc: "Protect 1 living player from being killed this round."
  },

  captain: {
    icon: "👨‍✈️",
    name: "Captain",
    team: "Human",
    desc: "If a vote ties, secretly choose which tied player is ejected."
  },

  guard: {
    icon: "🛡️",
    name: "Guard",
    team: "Human",
    desc: "Block 1 living player's ability for this round."
  },

  survivor: {
    icon: "👤",
    name: "Survivor",
    team: "Human",
    desc: "You have no special ability."
  },

  radio: {
    icon: "📻",
    name: "Radio Operator",
    team: "Human",
    desc: "Choose whether to receive a private transmission from Earth."
  },

  judge: {
    icon: "⚖️",
    name: "Judge",
    team: "Human",
    desc: "Once per game, cancel any vote that would eject a player."
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
    desc: "Win independently if you are one of the final 2 living players."
  },

  trickster: {
    icon: "🎭",
    name: "Trickster",
    team: "Neutral",
    desc: "Once per game, swap the displayed identities of two living players until voting has completely finished."
  },

  infected: {
    icon: "🦠",
    name: "Infected",
    team: "Human",
    hidden: true,
    desc: ""
  },

  diseased: {
    icon: "☣️",
    name: "Diseased",
    team: "Hostile",
    hidden: true,
    desc: ""
  }
};

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
  enabled: {
    alien: true,
    saboteur: true,
    silencer: true,
    parasite: true,

    engineer: true,
    scientist: true,
    detective: true,
    medic: true,
    captain: true,
    guard: true,
    survivor: true,
    radio: true,
    judge: true,

    jester: true,
    king: true,

    trickster: false
  },

  counts: {
    alien: 0,
    saboteur: 0,
    silencer: 0,
    parasite: 0,

    engineer: 1,
    scientist: 0,
    detective: 0,
    medic: 0,
    captain: 0,
    guard: 0,
    survivor: 0,
    radio: 0,
    judge: 0,

    jester: 0,
    king: 0,
    trickster: 0
  }
};

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

  systems: {
    engines: true,
    o2: true,
    communications: true,
    power: true
  },

  engineStage: 1,

  judgeUsed: false,
  tricksterUsed: false,

  displaySwap: null,

  gameOver: false,

  victoryTeam: null
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function rand(array) {
  if (!array || !array.length) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function alive(player) {
  return !!(player && player.alive);
}

function getPlayer(id) {
  return game.players.find(player => player.id === id);
}

function livingPlayers() {
  return game.players.filter(player => player.alive);
}

function isHostile(player) {
  return !!(
    player &&
    player.alive &&
    (
      player.role === "alien" ||
      player.role === "saboteur" ||
      player.role === "silencer" ||
      player.role === "parasite" ||
      player.role === "diseased"
    )
  );
}

function isNeutral(player) {
  return !!(
    player &&
    player.alive &&
    (
      player.role === "jester" ||
      player.role === "king" ||
      player.role === "trickster"
    )
  );
}

function roleTeam(player) {
  if (!player) return "Human";

  if (player.role === "infected") {
    return "Human";
  }

  if (isHostile(player)) {
    return "Hostile";
  }

  if (isNeutral(player)) {
    return "Neutral";
  }

  return "Human";
}

/* =========================================================
   DISPLAY IDENTITY SYSTEM
   ========================================================= */

function getDisplayedId(realId) {
  if (!game.displaySwap) {
    return realId;
  }

  const [a, b] = game.displaySwap;

  if (realId === a) return b;
  if (realId === b) return a;

  return realId;
}

function getRealIdFromDisplayed(displayedId) {
  if (!game.displaySwap) {
    return displayedId;
  }

  const [a, b] = game.displaySwap;

  if (displayedId === a) return b;
  if (displayedId === b) return a;

  return displayedId;
}

function displayedName(realId) {
  const displayedId = getDisplayedId(realId);
  const player = getPlayer(displayedId);

  return player ? player.name : "Unknown";
}

/* =========================================================
   SCREEN CONTROL
   ========================================================= */

function setScreen(id) {
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
   SELECTED BUTTON
   ========================================================= */

function markSelected(container, selectedButton) {
  if (!container) return;

  container.querySelectorAll("button").forEach(button => {
    button.classList.remove("selected");
    button.removeAttribute("aria-pressed");
    button.style.borderColor = "";
    button.style.boxShadow = "";
  });

  if (selectedButton) {
    selectedButton.classList.add("selected");
    selectedButton.setAttribute("aria-pressed", "true");
    selectedButton.style.borderColor = "#ff3b30";
    selectedButton.style.boxShadow =
      "0 0 0 2px rgba(255,59,48,.25)";
  }
}

/* =========================================================
   BUTTON HTML
   ========================================================= */

function choiceButton(text, value) {
  return `
    <button
      type="button"
      class="choice-button"
      data-value="${esc(value)}"
    >
      ${text}
    </button>
  `;
}

/* =========================================================
   PLAYER SETUP
   ========================================================= */

function resetSetupPlayers() {
  const count =
    Number($("playerCount")?.value || 4);

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

function renderSetup() {
  const container = $("playersSetup");

  if (!container) return;

  container.innerHTML = game.players.map((player, index) => {

    const roleOptions = [
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
      .join("");

    const randomHidden =
      game.randomisedRoles &&
      game.randomRoles[index];

    return `
      <div class="setup-player">

        <label>
          Player ${index + 1} Name

          <input
            class="player-name-input"
            type="text"
            maxlength="20"
            value="${esc(player.name)}"
            data-name-index="${index}"
            autocomplete="off"
            placeholder="Player ${index + 1}"
          >
        </label>

        <label>
          Role

          <select
            class="role-select ${randomHidden ? "random-hidden" : ""}"
            data-index="${index}"
          >

            <option value="random">
              🎲 RANDOM
            </option>

            ${roleOptions}

          </select>
        </label>

      </div>
    `;
  }).join("");

  bindSetupInputs();
  updatePlayerValidity();
}

function bindSetupInputs() {

  document
    .querySelectorAll(".player-name-input")
    .forEach(input => {

      input.addEventListener("input", () => {

        const index =
          Number(input.dataset.nameIndex);

        const player =
          game.players[index];

        if (!player) return;

        player.name =
          input.value.trim() ||
          `Player ${index + 1}`;

      });

    });

  document
    .querySelectorAll(".role-select")
    .forEach(select => {

      select.addEventListener("change", () => {

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

        select.value = "random";

        select.classList.add(
          "random-hidden"
        );

      });

    });

}

function updatePlayerValidity() {
  const element = $("playerValidity");

  if (!element) return;

  const count =
    game.players.length;

  const customCount =
    Object.values(settings.counts)
      .reduce(
        (total, value) =>
          total + Number(value || 0),
        0
      );

  element.textContent =
    `PLAYERS: ${count} • ` +
    (
      customCount
        ? `CUSTOM ROLES: ${customCount}`
        : "RANDOM ROLES"
    );
}

/* =========================================================
   RANDOM ROLES
   ========================================================= */

function weightedRandom(items, weights) {
  const total =
    items.reduce(
      (sum, item) =>
        sum + (weights[item] || 0),
      0
    );

  if (total <= 0) {
    return rand(items);
  }

  let roll =
    Math.random() * total;

  for (const item of items) {
    roll -= weights[item] || 0;

    if (roll < 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function randomiseRoles() {

  const playerCount =
    game.players.length;

  const hostileCount =
    HOSTILE_COUNTS[playerCount];

  if (!hostileCount) {
    alert(
      "You need between 4 and 12 players."
    );
    return;
  }

  const enabledHostiles =
    HOSTILES.filter(
      role => settings.enabled[role]
    );

  if (
    enabledHostiles.length <
    hostileCount
  ) {

    alert(
      "Not enough Hostile roles are enabled."
    );

    return;
  }

  const enabledHumans =
    HUMANS.filter(
      role =>
        settings.enabled[role] ||
        role === "engineer"
    );

  /*
   * Engineer is always present.
   */

  if (!settings.enabled.engineer) {
    settings.enabled.engineer = true;
  }

  const roles = [];

  /*
   * Pick unique Hostiles.
   */

  roles.push(
    ...shuffle(enabledHostiles)
      .slice(0, hostileCount)
  );

  /*
   * Engineer is guaranteed.
   */

  roles.push("engineer");

  /*
   * Pick remaining Humans with weights.
   */

  const humanSlots =
    playerCount -
    hostileCount -
    1;

  let humanPool =
    enabledHumans.filter(
      role => role !== "engineer"
    );

  if (humanPool.length < humanSlots) {

    alert(
      "Not enough enabled Human roles."
    );

    return;
  }

  for (
    let i = 0;
    i < humanSlots;
    i++
  ) {

    const selected =
      weightedRandom(
        humanPool,
        HUMAN_WEIGHTS
      );

    roles.push(selected);

    humanPool =
      humanPool.filter(
        role => role !== selected
      );

  }

  /*
   * Any remaining spaces use enabled Neutrals.
   */

  const remaining =
    playerCount - roles.length;

  if (remaining > 0) {

    const enabledNeutrals =
      [
        ...NEUTRALS,
        ...CONCEPTS
      ].filter(
        role => settings.enabled[role]
      );

    if (
      enabledNeutrals.length <
      remaining
    ) {

      alert(
        "Not enough enabled Neutral roles."
      );

      return;
    }

    roles.push(
      ...shuffle(enabledNeutrals)
        .slice(0, remaining)
    );
  }

  const shuffledRoles =
    shuffle(roles);

  game.randomRoles =
    Object.fromEntries(
      shuffledRoles.map(
        (role, index) => [
          index,
          role
        ]
      )
    );

  game.randomisedRoles = true;

  renderSetup();
}

/* =========================================================
   CUSTOM ROLES
   ========================================================= */

function applyCustomRoles() {

  const playerCount =
    game.players.length;

  const requiredHostiles =
    HOSTILE_COUNTS[playerCount];

  if (!requiredHostiles) {
    alert(
      "Choose between 4 and 12 players."
    );
    return;
  }

  let selected = [];

  /*
   * Read any manual role choices.
   */

  document
    .querySelectorAll(".role-select")
    .forEach(select => {

      const index =
        Number(select.dataset.index);

      if (
        game.randomisedRoles &&
        game.randomRoles[index]
      ) {

        selected.push(
          game.randomRoles[index]
        );

        return;
      }

      if (
        select.value &&
        select.value !== "random"
      ) {

        selected.push(
          select.value
        );

      }

    });

  /*
   * If no manual choices exist,
   * fall back to random.
   */

  if (!selected.length) {

    randomiseRoles();

    return;
  }

  /*
   * Remove duplicates.
   */

  const unique =
    [...new Set(selected)];

  if (unique.length !== selected.length) {

    alert(
      "You cannot have duplicate starting roles."
    );

    return;
  }

  /*
   * Engineer must exist exactly once.
   */

  if (
    unique.filter(
      role => role === "engineer"
    ).length !== 1
  ) {

    alert(
      "Engineer must be included exactly once."
    );

    return;
  }

  /*
   * Correct Hostile count.
   */

  const hostileCount =
    unique.filter(
      role =>
        HOSTILES.includes(role)
    ).length;

  if (
    hostileCount !==
    requiredHostiles
  ) {

    alert(
      `You need exactly ${requiredHostiles} Hostile role(s).`
    );

    return;
  }

  /*
   * Need exactly the number of players.
   */

  if (
    unique.length !==
    playerCount
  ) {

    alert(
      `You need exactly ${playerCount} unique roles.`
    );

    return;
  }

  game.randomisedRoles = false;
  game.randomRoles = {};

  game.players.forEach(
    (player, index) => {

      player.role =
        unique[index];

      player.originalRole =
        unique[index];

    }
  );

  renderSetup();

}

/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

  const playerCount =
    game.players.length;

  const requiredHostiles =
    HOSTILE_COUNTS[playerCount];

  if (!requiredHostiles) {

    alert(
      "Choose between 4 and 12 players."
    );

    return;
  }

  /*
   * Save names currently in inputs.
   */

  document
    .querySelectorAll(".player-name-input")
    .forEach(input => {

      const index =
        Number(input.dataset.nameIndex);

      if (!game.players[index]) return;

      game.players[index].name =
        input.value.trim() ||
        `Player ${index + 1}`;

    });

  let roles =
    game.randomisedRoles

      ? game.players.map(
          (_, index) =>
            game.randomRoles[index]
        )

      : game.players.map(
          player =>
            player.role
        );

  /*
   * If some roles are still RANDOM,
   * randomise the missing ones.
   */

  if (
    roles.some(
      role =>
        !role ||
        role === "random"
    )
  ) {

    randomiseRoles();

    roles =
      game.players.map(
        (_, index) =>
          game.randomRoles[index]
      );

  }

  /*
   * Validate roles.
   */

  if (
    roles.length !==
    playerCount
  ) {

    alert(
      "Invalid role setup."
    );

    return;
  }

  const uniqueRoles =
    new Set(roles);

  if (
    uniqueRoles.size !==
    roles.length
  ) {

    alert(
      "Starting roles cannot be duplicated."
    );

    return;
  }

  const hostileCount =
    roles.filter(
      role =>
        HOSTILES.includes(role)
    ).length;

  if (
    hostileCount !==
    requiredHostiles
  ) {

    alert(
      `This game needs exactly ${requiredHostiles} Hostile role(s).`
    );

    return;
  }

  if (
    roles.filter(
      role =>
        role === "engineer"
    ).length !== 1
  ) {

    alert(
      "There must be exactly 1 Engineer."
    );

    return;
  }

  /*
   * Apply roles.
   */

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

  /*
   * Reset game.
   */

  game.round = 1;
  game.stage = 1;
  game.engineStage = 1;

  game.actions = {};
  game.previousActions = {};

  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();

  game.silencedUntil = {};

  game.votes = {};

  game.selectedAction = null;
  game.selectedVote = null;

  game.randomisedRoles = false;
  game.randomRoles = {};

  game.reactionInfo = {};

  game.lastRoundResults = [];

  game.judgeUsed = false;
  game.tricksterUsed = false;

  game.displaySwap = null;

  game.gameOver = false;
  game.victoryTeam = null;

  game.systems = {
    engines: true,
    o2: true,
    communications: true,
    power: true
  };

  startRound();
}

/* =========================================================
   ROUND START
   ========================================================= */

function startRound() {

  if (checkVictory()) {
    return;
  }

  game.actions = {};
  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();

  game.selectedAction =
    null;

  game.reactionInfo = {};

  /*
   * Snapshot living players BEFORE any abilities.
   */

  game.roundStartAliveIds =
    livingPlayers().map(
      player => player.id
    );

  game.abilityQueue =
    [...game.roundStartAliveIds];

  game.abilityIndex = 0;

  game.displaySwap = null;

  game.lastRoundResults = [];

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

    resolveAbilities();

    return;
  }

  const player =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if (!player) {

    game.abilityIndex++;

    passToAbility();

    return;
  }

  $("passPlayerName").textContent =
    player.name;

  $("passRound").textContent =
    `ROUND ${game.round}`;

  $("passSubtext").textContent =
    "PASS THE PHONE TO THIS PLAYER";

  setScreen("passScreen");
}

/* =========================================================
   SHOW ROLE
   ========================================================= */

function showRole() {

  const player =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if (!player) return;

  $("rolePlayerName").textContent =
    player.name;

  $("roleIcon").textContent =
    ROLE_DATA[player.role]?.icon ||
    "❓";

  /*
   * Infected players MUST continue seeing
   * their original role.
   */

  const visibleRole =
    player.role === "infected"
      ? player.originalRole
      : player.role;

  const data =
    ROLE_DATA[visibleRole] ||
    ROLE_DATA.survivor;

  $("roleIcon").textContent =
    data.icon;

  $("roleName").textContent =
    data.name;

  /*
   * Infected is still shown as Human.
   */

  const team =
    player.role === "infected"
      ? "Human"
      : roleTeam(player);

  $("roleTeam").textContent =
    `${team.toUpperCase()} TEAM`;

  $("roleDescription").textContent =
    player.role === "infected"
      ? ROLE_DATA[player.originalRole]?.desc || ""
      : data.desc;

  /*
   * Hostile allies.
   */

  $("hostileList").innerHTML =
    "";

  if (team === "Hostile") {

    const allies =
      livingPlayers().filter(
        other =>
          other.id !== player.id &&
          isHostile(other)
      );

    if (allies.length) {

      $("hostileList").innerHTML = `
        <div class="ally-box">
          <strong>HOSTILE ALLIES</strong>
          <br><br>
          ${allies
            .map(
              ally =>
                `${ROLE_DATA[ally.role]?.icon || "👽"} ${esc(ally.name)}`
            )
            .join("<br>")
          }
        </div>
      `;

    }

  }

  setScreen("roleScreen");
}

/* =========================================================
   SHOW ACTION
   ========================================================= */

function showAction() {

  const player =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if (!player) return;

  $("actionOptions").innerHTML =
    "";

  $("actionDescription").textContent =
    "";

  game.selectedAction =
    null;

  const role =
    player.role;

  $("actionTitle").textContent =
    `${ROLE_DATA[role]?.icon || ""} ${ROLE_DATA[role]?.name || ""}`;

  /*
   * Roles without active abilities.
   */

  if (
    role === "survivor" ||
    role === "jester" ||
    role === "king" ||
    role === "infected" ||
    role === "diseased"
  ) {

    $("actionDescription").textContent =
      role === "diseased"
        ? "You cannot use an ability while Diseased."
        : "You have no active ability this round.";

    $("confirmActionButton").textContent =
      "CONTINUE";

    setScreen("actionScreen");

    return;
  }

  /*
   * Power is offline.
   * Engineer is the only exception.
   */

  if (
    !game.systems.power &&
    role !== "engineer"
  ) {

    $("actionDescription").textContent =
      "⚡ POWER IS OFFLINE. Your ability cannot be used.";

    $("confirmActionButton").textContent =
      "CONTINUE";

    setScreen("actionScreen");

    return;
  }

  /*
   * Blocked.
   */

  if (
    game.blockedPlayers.has(
      player.id
    )
  ) {

    $("actionDescription").textContent =
      "🛡️ Your ability was blocked this round.";

    $("confirmActionButton").textContent =
      "CONTINUE";

    setScreen("actionScreen");

    return;
  }

  /* -------------------------------------------------------
     ALIEN
     ------------------------------------------------------- */

  if (role === "alien") {

    const saboteurAlive =
      livingPlayers().some(
        p =>
          p.role === "saboteur"
      );

    $("actionDescription").textContent =
      saboteurAlive
        ? "A living Saboteur exists, so you must kill."
        : "Choose whether to Kill or Sabotage.";

    $("actionOptions").innerHTML =
      choiceButton(
        "☠️ KILL",
        "kill"
      ) +
      (
        saboteurAlive
          ? ""
          : choiceButton(
              "💥 SABOTAGE",
              "sabotage"
            )
      );

    bindActionButtons();

  }

  /* -------------------------------------------------------
     SABOTEUR
     ------------------------------------------------------- */

  else if (role === "saboteur") {

    renderSystemChoices(false);

  }

  /* -------------------------------------------------------
     SILENCER
     ------------------------------------------------------- */

  else if (role === "silencer") {

    renderTargetChoices(
      player,
      "silence",
      false
    );

  }

  /* -------------------------------------------------------
     PARASITE
     ------------------------------------------------------- */

  else if (role === "parasite") {

    if (player.hasInfected) {

      $("actionDescription").textContent =
        "You already infected someone.";

    } else {

      renderTargetChoices(
        player,
        "infect",
        false
      );

    }

  }

  /* -------------------------------------------------------
     ENGINEER
     ------------------------------------------------------- */

  else if (role === "engineer") {

    renderSystemChoices(true);

  }

  /* -------------------------------------------------------
     SCIENTIST
     ------------------------------------------------------- */

  else if (role === "scientist") {

    renderScientistChoices(
      player
    );

  }

  /* -------------------------------------------------------
     DETECTIVE
     ------------------------------------------------------- */

  else if (role === "detective") {

    renderTargetChoices(
      player,
      "detect",
      false
    );

  }

  /* -------------------------------------------------------
     MEDIC
     ------------------------------------------------------- */

  else if (role === "medic") {

    renderTargetChoices(
      player,
      "protect",
      true
    );

  }

  /* -------------------------------------------------------
     CAPTAIN
     ------------------------------------------------------- */

  else if (role === "captain") {

    $("actionDescription").textContent =
      "Your tie-break ability activates automatically if a vote ties.";

  }

  /* -------------------------------------------------------
     GUARD
     ------------------------------------------------------- */

  else if (role === "guard") {

    renderTargetChoices(
      player,
      "block",
      false
    );

  }

  /* -------------------------------------------------------
     RADIO
     ------------------------------------------------------- */

  else if (role === "radio") {

    if (!game.systems.communications) {

      $("actionDescription").textContent =
        "📡 COMMUNICATIONS IS OFFLINE.";

    } else {

      $("actionDescription").textContent =
        "Choose whether to receive a private transmission from Earth.";

      $("actionOptions").innerHTML =
        choiceButton(
          "📻 RECEIVE TRANSMISSION",
          "radio"
        );

      bindActionButtons();

    }

  }

  /* -------------------------------------------------------
     JUDGE
     ------------------------------------------------------- */

  else if (role === "judge") {

    if (game.judgeUsed) {

      $("actionDescription").textContent =
        "You already used your Judge ability.";

    } else {

      $("actionDescription").textContent =
        "Your Judge ability activates automatically if a player would be ejected.";

    }

  }

  /* -------------------------------------------------------
     TRICKSTER
     ------------------------------------------------------- */

  else if (role === "trickster") {

    if (game.tricksterUsed) {

      $("actionDescription").textContent =
        "You already used your Trickster ability.";

    } else {

      renderTricksterChoices();

    }

  }

  $("confirmActionButton").textContent =
    "CONFIRM";

  setScreen("actionScreen");
}

/* =========================================================
   ACTION BUTTON BINDING
   ========================================================= */

function bindActionButtons() {

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        markSelected(
          $("actionOptions"),
          button
        );

        const value =
          button.dataset.value;

        /*
         * Alien first choice.
         */

        if (
          value === "kill" ||
          value === "sabotage" ||
          value === "radio"
        ) {

          game.selectedAction =
            value;

          if (value === "kill") {

            const player =
              getPlayer(
                game.abilityQueue[
                  game.abilityIndex
                ]
              );

            renderTargetChoices(
              player,
              "kill",
              false
            );

          }

          if (value === "sabotage") {

            renderSystemChoices(false);

          }

        } else {

          game.selectedAction =
            value;

        }

      };

    });
}

/* =========================================================
   TARGET CHOICES
   ========================================================= */

function getTargetPlayers(
  actor,
  allowSelf = false
) {

  return livingPlayers().filter(
    target => {

      if (
        !allowSelf &&
        target.id === actor.id
      ) {

        return false;

      }

      /*
       * Normally Hostiles cannot target Hostiles.
       *
       * If Trickster swapped displayed identities,
       * the hostile may accidentally select the teammate
       * because they are targeting the displayed identity.
       */

      if (
        isHostile(actor) &&
        isHostile(target) &&
        !game.displaySwap
      ) {

        return false;

      }

      return true;

    }
  );

}

function renderTargetChoices(
  actor,
  type,
  allowSelf
) {

  const descriptions = {

    kill:
      "Choose a player to kill.",

    silence:
      "Choose a player to silence for 2 rounds.",

    infect:
      "Choose a player to infect.",

    detect:
      "Choose a player to investigate.",

    protect:
      "Choose a player to protect.",

    block:
      "Choose a player whose ability to block."

  };

  $("actionDescription").textContent =
    descriptions[type] ||
    "Choose a target.";

  const targets =
    getTargetPlayers(
      actor,
      allowSelf
    );

  $("actionOptions").innerHTML =
    targets
      .map(
        target =>
          choiceButton(
            esc(displayedName(target.id)),
            target.id
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        markSelected(
          $("actionOptions"),
          button
        );

        game.selectedAction =
          JSON.stringify({
            type,
            target:
              getRealIdFromDisplayed(
                button.dataset.value
              )
          });

      };

    });
}

/* =========================================================
   SYSTEM CHOICES
   ========================================================= */

function renderSystemChoices(
  repairMode
) {

  const available =
    Object.keys(
      game.systems
    );

  const choices =
    repairMode

      ? available.filter(
          system =>
            !game.systems[system]
        )

      : available;

  if (!choices.length) {

    $("actionDescription").textContent =
      repairMode
        ? "There are no offline systems to repair."
        : "No systems available.";

    game.selectedAction =
      "none";

    return;
  }

  $("actionDescription").textContent =
    repairMode
      ? "Choose 1 offline system to repair."
      : "Choose 1 system to sabotage.";

  $("actionOptions").innerHTML =
    choices
      .map(
        system =>
          choiceButton(
            `${game.systems[system] ? "🟢" : "🔴"} ${system.toUpperCase()}`,
            system
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        markSelected(
          $("actionOptions"),
          button
        );

        game.selectedAction =
          JSON.stringify({
            type:
              repairMode
                ? "repair"
                : "sabotage",

            system:
              button.dataset.value
          });

      };

    });
}

/* =========================================================
   SCIENTIST
   ========================================================= */

function renderScientistChoices(player) {

  $("actionDescription").textContent =
    "Choose a player to investigate.";

  const targets =
    getTargetPlayers(
      player,
      false
    );

  $("actionOptions").innerHTML =
    targets
      .map(
        target =>
          choiceButton(
            esc(displayedName(target.id)),
            target.id
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        const target =
          getPlayer(
            getRealIdFromDisplayed(
              button.dataset.value
            )
          );

        if (!target) return;

        markSelected(
          $("actionOptions"),
          button
        );

        let status;

        if (
          target.role === "infected"
        ) {
          status = "🦠 INFECTED";
        } else if (
          target.role === "diseased"
        ) {
          status = "☣️ DISEASED";
        } else if (
          target.role === "parasite"
        ) {
          status = "🦠 PARASITE";
        } else {
          status = "💚 HEALTHY";
        }

        $("actionDescription").textContent =
          `${target.name}: ${status}`;

        $("actionOptions").innerHTML =
          choiceButton(
            "🔬 CHECK",
            "check"
          ) +
          (
            target.role === "infected" ||
            target.role === "diseased"

              ? choiceButton(
                  "💉 CURE",
                  "cure"
                )

              : ""
          );

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(choice => {

            choice.onclick = () => {

              markSelected(
                $("actionOptions"),
                choice
              );

              game.selectedAction =
                JSON.stringify({
                  type: "science",

                  target: target.id,

                  mode:
                    choice.dataset.value
                });

            };

          });

      };

    });
}

/* =========================================================
   TRICKSTER
   ========================================================= */

function renderTricksterChoices() {

  $("actionDescription").textContent =
    "Choose TWO living players to swap displayed identities.";

  const players =
    livingPlayers();

  $("actionOptions").innerHTML =
    players
      .map(
        player =>
          choiceButton(
            esc(player.name),
            player.id
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
              value =>
                value !== id
            );

          button.classList.remove(
            "selected"
          );

        } else {

          if (chosen.length >= 2) {
            return;
          }

          chosen.push(id);

          button.classList.add(
            "selected"
          );

        }

        if (chosen.length === 2) {

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

      };

    });
}

/* =========================================================
   CONFIRM ABILITY
   ========================================================= */

function confirmAction() {

  const player =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if (!player) {

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
    } catch {
      action = "none";
    }

  }

  /*
   * Save the action for Detective.
   */

  if (
    action &&
    typeof action === "object"
  ) {

    game.actions[player.id] =
      action;

  } else {

    game.actions[player.id] = {
      type:
        action || "none"
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
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

  /*
   * -------------------------------------------------------
   * FIRST: BLOCKS
   * -------------------------------------------------------
   */

  const guardActions =
    Object.values(
      game.actions
    ).filter(
      action =>
        action &&
        action.type === "block"
    );

  guardActions.forEach(action => {

    if (
      action.target &&
      getPlayer(action.target)
    ) {

      game.blockedPlayers.add(
        action.target
      );

    }

  });

  /*
   * -------------------------------------------------------
   * PROTECTION
   * -------------------------------------------------------
   */

  Object.values(
    game.actions
  ).forEach(action => {

    if (
      action &&
      action.type === "protect"
    ) {

      game.protectedPlayers.add(
        action.target
      );

    }

  });

  /*
   * -------------------------------------------------------
   * SILENCE
   * -------------------------------------------------------
   */

  Object.values(
    game.actions
  ).forEach(action => {

    if (
      action &&
      action.type === "silence"
    ) {

      game.silencedUntil[
        action.target
      ] =
        game.round + 2;

    }

  });

  /*
   * -------------------------------------------------------
   * REPAIRS
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "repair"
      ) return;

      const player =
        getPlayer(playerId);

      if (
        !player ||
        player.role !== "engineer"
      ) return;

      const system =
        action.system;

      if (
        system &&
        game.systems.hasOwnProperty(
          system
        ) &&
        !game.systems[system]
      ) {

        game.systems[system] =
          true;

        game.lastRoundResults.push(
          `🔧 ${player.name} repaired ${system.toUpperCase()}.`
        );

      }

    }
  );

  /*
   * -------------------------------------------------------
   * SABOTAGE
   * -------------------------------------------------------
   */

  let sabotagePerformed =
    false;

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "sabotage"
      ) return;

      const player =
        getPlayer(playerId);

      if (
        !player ||
        !player.alive
      ) return;

      /*
       * Saboteur can sabotage.
       */

      if (
        player.role !== "saboteur" &&
        player.role !== "alien"
      ) return;

      /*
       * Alien cannot sabotage while a
       * living Saboteur exists.
       */

      if (
        player.role === "alien" &&
        livingPlayers().some(
          p =>
            p.role === "saboteur"
        )
      ) return;

      if (
        !action.system ||
        !game.systems.hasOwnProperty(
          action.system
        )
      ) return;

      game.systems[
        action.system
      ] = false;

      sabotagePerformed =
        true;

      game.lastRoundResults.push(
        `💥 ${action.system.toUpperCase()} was sabotaged.`
      );

    }
  );

  /*
   * -------------------------------------------------------
   * INFECTION
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "infect"
      ) return;

      const parasite =
        getPlayer(playerId);

      const target =
        getPlayer(action.target);

      if (
        !parasite ||
        !target ||
        !parasite.alive ||
        !target.alive
      ) return;

      if (
        parasite.role !== "parasite" ||
        parasite.hasInfected
      ) return;

      if (
        game.blockedPlayers.has(
          parasite.id
        )
      ) return;

      /*
       * Secret infection.
       */

      if (
        target.role !== "infected" &&
        target.role !== "diseased" &&
        target.role !== "parasite"
      ) {

        target.infectionRound =
          game.round;

        target.originalRole =
          target.role;

        target.role =
          "infected";

        parasite.hasInfected =
          true;

        /*
         * IMPORTANT:
         * NO message is shown to target.
         */

      }

    }
  );

  /*
   * -------------------------------------------------------
   * SCIENTIST
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "science"
      ) return;

      const scientist =
        getPlayer(playerId);

      const target =
        getPlayer(action.target);

      if (
        !scientist ||
        !target ||
        !scientist.alive ||
        !target.alive
      ) return;

      if (
        scientist.role !== "scientist" ||
        game.blockedPlayers.has(
          scientist.id
        )
      ) return;

      let status;

      if (
        target.role === "infected"
      ) {
        status = "Infected";
      } else if (
        target.role === "diseased"
      ) {
        status = "Diseased";
      } else if (
        target.role === "parasite"
      ) {
        status = "Parasite";
      } else {
        status = "Healthy";
      }

      if (
        action.mode === "check"
      ) {

        game.reactionInfo[
          scientist.id
        ] =
          `SCIENCE: ${target.name} is ${status}.`;

      }

      if (
        action.mode === "cure" &&
        (
          target.role === "infected" ||
          target.role === "diseased"
        )
      ) {

        target.role =
          target.originalRole ||
          "survivor";

        target.infectionRound =
          null;

        target.hasInfected =
          false;

        game.reactionInfo[
          scientist.id
        ] =
          `SCIENCE: ${target.name} was cured.`;

      }

    }
  );

  /*
   * -------------------------------------------------------
   * DETECTIVE
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "detect"
      ) return;

      const detective =
        getPlayer(playerId);

      const target =
        getPlayer(action.target);

      if (
        !detective ||
        !target ||
        !detective.alive
      ) return;

      if (
        detective.role !== "detective" ||
        game.blockedPlayers.has(
          detective.id
        )
      ) return;

      const previous =
        game.previousActions[
          target.id
        ];

      game.reactionInfo[
        detective.id
      ] =
        getDetectiveMessage(
          target,
          previous
        );

    }
  );

  /*
   * -------------------------------------------------------
   * TRICKSTER
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "swap"
      ) return;

      const trickster =
        getPlayer(playerId);

      if (
        !trickster ||
        trickster.role !== "trickster" ||
        game.tricksterUsed ||
        game.blockedPlayers.has(
          trickster.id
        )
      ) return;

      const a =
        getPlayer(action.a);

      const b =
        getPlayer(action.b);

      if (
        !a ||
        !b ||
        !a.alive ||
        !b.alive ||
        a.id === b.id
      ) return;

      game.displaySwap = [
        a.id,
        b.id
      ];

      game.tricksterUsed =
        true;

    }
  );

  /*
   * -------------------------------------------------------
   * KILLS
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "kill"
      ) return;

      const attacker =
        getPlayer(playerId);

      const target =
        getPlayer(action.target);

      if (
        !attacker ||
        !target ||
        !attacker.alive ||
        !target.alive
      ) return;

      if (
        attacker.role !== "alien"
      ) return;

      if (
        game.blockedPlayers.has(
          attacker.id
        )
      ) return;

      /*
       * Medic protection.
       */

      if (
        game.protectedPlayers.has(
          target.id
        )
      ) {

        game.reactionInfo[
          target.id
        ] =
          "You were attacked, but the Medic protected you.";

        return;

      }

      target.alive =
        false;

      game.lastRoundResults.push(
        `☠️ ${target.name} was killed.`
      );

      game.reactionInfo[
        target.id
      ] =
        "You died this round.";

    }
  );

  /*
   * -------------------------------------------------------
   * RADIO
   * -------------------------------------------------------
   */

  Object.entries(
    game.actions
  ).forEach(
    ([playerId, action]) => {

      if (
        !action ||
        action.type !== "radio"
      ) return;

      const radio =
        getPlayer(playerId);

      if (
        !radio ||
        !radio.alive ||
        radio.role !== "radio"
      ) return;

      if (
        game.systems.communications &&
        !game.blockedPlayers.has(
          radio.id
        )
      ) {

        game.reactionInfo[
          radio.id
        ] =
          randomRadioMessage();

      }

    }
  );

  /*
   * -------------------------------------------------------
   * INFECTION PROGRESSION
   * -------------------------------------------------------
   */

  game.players.forEach(
    player => {

      if (
        !player.alive ||
        !player.infectionRound
      ) return;

      const age =
        game.round -
        player.infectionRound +
        1;

      /*
       * Infected -> Diseased
       */

      if (
        age === 2 &&
        player.role === "infected"
      ) {

        player.role =
          "diseased";

        game.reactionInfo[
          player.id
        ] =
          "You became DISEASED. You are on the HOSTILE TEAM.";

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

        game.reactionInfo[
          player.id
        ] =
          "You became a PARASITE. You are on the HOSTILE TEAM.";

      }

    }
  );

  /*
   * -------------------------------------------------------
   * ENGINE PROGRESS
   * -------------------------------------------------------
   */

  if (game.systems.engines) {

    game.engineStage++;

    if (
      game.engineStage > 10
    ) {

      game.engineStage = 10;

    }

    game.stage =
      game.engineStage;

  }

  /*
   * Save actions for Detective.
   */

  game.previousActions =
    JSON.parse(
      JSON.stringify(
        game.actions
      )
    );

  showReactions();
}

/* =========================================================
   DETECTIVE MESSAGE
   ========================================================= */

function getDetectiveMessage(
  target,
  action
) {

  if (
    !action ||
    action.type === "none"
  ) {

    return `${target.name} had no recorded interaction last round.`;

  }

  if (
    action.type === "radio"
  ) {

    return `${target.name} interacted with Communications.`;

  }

  if (
    action.type === "repair" ||
    action.type === "sabotage"
  ) {

    return `${target.name} interacted with ${String(action.system).toUpperCase()}.`;

  }

  if (
    action.target
  ) {

    const targetPlayer =
      getPlayer(
        action.target
      );

    return targetPlayer
      ? `${target.name} interacted with ${targetPlayer.name}.`
      : `${target.name} interacted with another player.`;

  }

  if (
    action.type === "swap"
  ) {

    return `${target.name} interacted with two players.`;

  }

  return `${target.name} had an interaction last round.`;
}

/* =========================================================
   RADIO MESSAGE
   ========================================================= */

function randomRadioMessage() {

  const hostiles =
    livingPlayers().filter(
      isHostile
    );

  /*
   * Exact hostile count.
   */

  if (
    hostiles.length > 0 &&
    Math.random() < 0.5
  ) {

    return `EARTH: There are exactly ${hostiles.length} hostile${hostiles.length === 1 ? "" : "s"} remaining.`;

  }

  /*
   * If sabotage occurred, give a concrete clue.
   */

  const sabotage =
    Object.entries(
      game.actions
    ).filter(
      ([, action]) =>
        action &&
        action.type === "sabotage"
    );

  if (
    sabotage.length
  ) {

    const selected =
      rand(sabotage);

    const system =
      selected[1].system;

    const possible =
      shuffle(
        livingPlayers()
      );

    if (
      possible.length >= 3
    ) {

      /*
       * Exactly one actual Hostile.
       */

      const hostile =
        rand(
          hostiles
        );

      const humans =
        shuffle(
          possible.filter(
            player =>
              !isHostile(player) &&
              player.id !== hostile?.id
          )
        ).slice(0, 2);

      if (
        hostile &&
        humans.length === 2
      ) {

        return `EARTH: ${[
          hostile,
          ...humans
        ]
          .map(
            player =>
              player.name
          )
          .join(", ")} — one of them made ${system.toUpperCase()} OFFLINE.`;

      }

    }

  }

  /*
   * Three-player hostile clue.
   */

  if (
    hostiles.length &&
    livingPlayers().length >= 3
  ) {

    const hostile =
      rand(hostiles);

    const humans =
      shuffle(
        livingPlayers().filter(
          player =>
            !isHostile(player)
        )
      ).slice(0, 2);

    if (
      hostile &&
      humans.length === 2
    ) {

      return `EARTH: ${[
        hostile,
        ...humans
      ]
        .map(
          player =>
            player.name
        )
        .join(", ")} — one of them is hostile.`;

    }

  }

  return "EARTH: Stay alert. We are monitoring the ship.";
}

/* =========================================================
   REACTION ROUND
   ========================================================= */

function showReactions() {

  /*
   * CRITICAL:
   *
   * Use the START-OF-ROUND snapshot.
   *
   * So someone killed during this round still gets
   * their Reaction screen.
   */

  game.reactionQueue =
    [...game.roundStartAliveIds];

  game.reactionIndex = 0;

  nextReaction();
}

function nextReaction() {

  if (
    game.reactionIndex >=
    game.reactionQueue.length
  ) {

    showDiscussion();

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

    nextReaction();

    return;
  }

  $("reactionRound").textContent =
    `ROUND ${game.round}`;

  $("reactionStage").textContent =
    `STAGE ${game.stage} / 10`;

  $("reactionPlayerName").textContent =
    player.name;

  setScreen("reactionScreen");
}

function showReactionResult() {

  const player =
    getPlayer(
      game.reactionQueue[
        game.reactionIndex
      ]
    );

  if (!player) return;

  $("reactionResultTitle").textContent =
    player.alive
      ? "ROUND RESULT"
      : "YOU DIED THIS ROUND";

  let message =
    game.reactionInfo[
      player.id
    ];

  /*
   * Silencer result.
   */

  if (!message) {

    const silencedUntil =
      game.silencedUntil[
        player.id
      ] || 0;

    if (
      silencedUntil >
      game.round
    ) {

      const remaining =
        silencedUntil -
        game.round;

      message =
        `🔇 You are silenced for ${remaining} more round${remaining === 1 ? "" : "s"}. You cannot vote.`;

    }

  }

  /*
   * Default.
   */

  if (!message) {

    message =
      "Nothing happened to you this round.";

  }

  $("reactionResultMessage").textContent =
    message;

  setScreen(
    "reactionResultScreen"
  );
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
    Object.entries(
      game.systems
    )
      .map(
        ([name, online]) =>
          `${online ? "🟢" : "🔴"} ${name.toUpperCase()}`
      )
      .join(" • ");

  $("roundResults").innerHTML = `

    <p>
      ${
        game.lastRoundResults.length
          ? game.lastRoundResults
              .map(esc)
              .join("<br>")
          : "No deaths or major events this round."
      }
    </p>

    <p>
      ${systems}
    </p>

    <p>
      🚀 ENGINE PROGRESS:
      ${game.engineStage} / 10
    </p>

  `;

  setScreen(
    "discussionScreen"
  );
}

/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {

  game.votes = {};

  game.currentVoteIndex = 0;

  game.selectedVote = null;

  showVotingPlayer();
}

function showVotingPlayer() {

  const players =
    livingPlayers();

  if (
    game.currentVoteIndex >=
    players.length
  ) {

    resolveVoting();

    return;
  }

  const voter =
    players[
      game.currentVoteIndex
    ];

  $("votingRound").textContent =
    `ROUND ${game.round}`;

  $("votingStage").textContent =
    `STAGE ${game.stage} / 10`;

  $("voterName").textContent =
    voter.name;

  const silenced =
    (
      game.silencedUntil[
        voter.id
      ] || 0
    ) > game.round;

  $("votingSilenced").textContent =
    silenced
      ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
      : "";

  const candidates =
    livingPlayers().filter(
      candidate =>
        candidate.id !== voter.id
    );

  $("voteOptions").innerHTML =
    candidates
      .map(
        candidate =>
          choiceButton(
            esc(
              displayedName(
                candidate.id
              )
            ),
            candidate.id
          )
      )
      .join("") +
    choiceButton(
      "⏭️ SKIP",
      "skip"
    );

  $("voteOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        if (
          silenced &&
          button.dataset.value !== "skip"
        ) {

          return;

        }

        markSelected(
          $("voteOptions"),
          button
        );

        game.selectedVote =
          getRealIdFromDisplayed(
            button.dataset.value
          );

        if (
          button.dataset.value === "skip"
        ) {

          game.selectedVote =
            "skip";

        }

      };

    });

  setScreen(
    "votingScreen"
  );
}

function confirmVote() {

  const players =
    livingPlayers();

  const voter =
    players[
      game.currentVoteIndex
    ];

  if (!voter) return;

  if (!game.selectedVote) {
    return;
  }

  game.votes[
    voter.id
  ] =
    game.selectedVote;

  game.currentVoteIndex++;

  game.selectedVote =
    null;

  showVotingPlayer();
}

/* =========================================================
   RESOLVE VOTE
   ========================================================= */

function resolveVoting() {

  const tally = {};

  Object.values(
    game.votes
  ).forEach(vote => {

    if (
      !vote ||
      vote === "skip"
    ) return;

    tally[vote] =
      (tally[vote] || 0) + 1;

  });

  const counts =
    Object.values(tally);

  if (!counts.length) {

    finishVote(null);

    return;
  }

  const highest =
    Math.max(...counts);

  const tied =
    Object.keys(tally)
      .filter(
        id =>
          tally[id] === highest
      );

  /*
   * One clear winner.
   */

  if (tied.length === 1) {

    finishVote(
      tied[0]
    );

    return;
  }

  /*
   * Tie.
   */

  const captain =
    livingPlayers().find(
      player =>
        player.role === "captain" &&
        !game.blockedPlayers.has(
          player.id
        ) &&
        game.systems.power
    );

  if (captain) {

    showCaptainTie(
      tied
    );

    return;
  }

  finishVote(null);
}

/* =========================================================
   CAPTAIN TIE
   ========================================================= */

function showCaptainTie(
  tied
) {

  $("captainTieOptions").innerHTML = `
    <p>
      The vote is tied.
      Captain, secretly choose the player to eject.
    </p>

    ${tied
      .map(
        id =>
          choiceButton(
            esc(
              displayedName(id)
            ),
            id
          )
      )
      .join("")
    }
  `;

  $("captainTieOptions")
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        const selected =
          getRealIdFromDisplayed(
            button.dataset.value
          );

        finishVote(
          selected
        );

      };

    });

  setScreen(
    "captainTieScreen"
  );
}

/* =========================================================
   FINISH VOTE
   ========================================================= */

function finishVote(
  ejectedId
) {

  /*
   * Judge gets a chance to cancel ANY ejection.
   */

  if (ejectedId) {

    const judge =
      livingPlayers().find(
        player =>
          player.role === "judge" &&
          !game.judgeUsed &&
          game.systems.power &&
          !game.blockedPlayers.has(
            player.id
          )
      );

    if (judge) {

      game.judgeUsed =
        true;

      $("voteResultTitle").textContent =
        "⚖️ EJECTION CANCELLED";

      $("voteResultMessage").textContent =
        "The Judge cancelled the ejection. Nobody was voted out.";

      $("afterVoteButton").onclick =
        afterVoting;

      setScreen(
        "voteResultScreen"
      );

      return;
    }

    const player =
      getPlayer(
        ejectedId
      );

    if (player) {

      player.alive =
        false;

      /*
       * JESTER WIN.
       */

      if (
        player.role === "jester"
      ) {

        game.gameOver =
          true;

        game.victoryTeam =
          "jester";

        $("voteResultTitle").textContent =
          "🃏 JESTER WINS";

        $("voteResultMessage").textContent =
          `${player.name} was voted out and wins!`;

      } else {

        $("voteResultTitle").textContent =
          "PLAYER EJECTED";

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

  setScreen(
    "voteResultScreen"
  );
}

/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

  /*
   * Trickster swap ends after full vote resolution.
   */

  game.displaySwap =
    null;

  if (game.gameOver) {

    showGameOver();

    return;
  }

  if (checkVictory()) {
    return;
  }

  /*
   * Earth lifeline every 3 rounds.
   */

  if (
    game.round % 3 === 0 &&
    game.systems.communications
  ) {

    showLifeline();

    return;
  }

  nextRound();
}

/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showLifeline() {

  $("lifelineTitle").textContent =
    "🌍 EARTH LIFELINE";

  const hostiles =
    livingPlayers().filter(
      isHostile
    );

  const available =
    livingPlayers();

  let message =
    "EARTH: We have received your transmission.";

  /*
   * Exactly one actual Hostile in public clue.
   */

  if (
    available.length >= 3 &&
    hostiles.length
  ) {

    const hostile =
      rand(hostiles);

    const humans =
      shuffle(
        available.filter(
          player =>
            !isHostile(player)
        )
      ).slice(0, 2);

    if (
      hostile &&
      humans.length === 2
    ) {

      message =
        `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${[
          hostile,
          ...humans
        ]
          .map(
            player =>
              player.name
          )
          .join(", ")}`;

    }

  }

  $("lifelineMessage").textContent =
    message;

  setScreen(
    "lifelineScreen"
  );
}

/* =========================================================
   NEXT ROUND
   ========================================================= */

function nextRound() {

  game.round++;

  /*
   * Stage does not automatically increase just because
   * a new round begins. Engine progress happens when
   * Engines are online during the round.
   */

  if (
    game.engineStage >= 10
  ) {

    checkVictory();

    if (game.gameOver) {
      return;
    }

  }

  startRound();
}

/* =========================================================
   SYSTEMS SCREEN
   ========================================================= */

function showSystems() {

  $("systemsRound").textContent =
    `ROUND ${game.round}`;

  $("systemsStage").textContent =
    `STAGE ${game.stage} / 10`;

  $("systemsList").innerHTML =
    Object.entries(
      game.systems
    )
      .map(
        ([name, online]) =>
          `
            <div class="system-row">
              <span>
                ${online ? "🟢" : "🔴"}
                ${name.toUpperCase()}
              </span>
              <strong>
                ${online ? "ONLINE" : "OFFLINE"}
              </strong>
            </div>
          `
      )
      .join("");

  setScreen(
    "systemsScreen"
  );
}

/* =========================================================
   VICTORY
   ========================================================= */

function checkVictory() {

  if (game.gameOver) {
    return true;
  }

  const living =
    livingPlayers();

  /*
   * Survivor King wins independently if one of final 2.
   */

  if (
    living.length <= 2 &&
    living.some(
      player =>
        player.role === "king"
    )
  ) {

    game.gameOver =
      true;

    game.victoryTeam =
      "king";

    showGameOver();

    return true;
  }

  /*
   * If engines reach Earth:
   *
   * Neutral alive overrides normal Human victory.
   */

  if (
    game.engineStage >= 10
  ) {

    const neutral =
      living.find(
        player =>
          isNeutral(player)
      );

    if (neutral) {

      game.gameOver =
        true;

      game.victoryTeam =
        "neutral";

      showGameOver();

      return true;
    }

    const humans =
      living.filter(
        player =>
          roleTeam(player) === "Human"
      );

    if (humans.length) {

      game.gameOver =
        true;

      game.victoryTeam =
        "human";

      showGameOver();

      return true;
    }

  }

  /*
   * If all Hostiles are gone, Humans win.
   */

  const hostileAlive =
    living.some(
      player =>
        isHostile(player)
    );

  if (!hostileAlive) {

    game.gameOver =
      true;

    game.victoryTeam =
      "human";

    showGameOver();

    return true;
  }

  /*
   * If Hostiles reach parity with Humans,
   * Hostiles win.
   */

  const hostileCount =
    living.filter(
      player =>
        isHostile(player)
    ).length;

  const humanCount =
    living.filter(
      player =>
        roleTeam(player) === "Human"
    ).length;

  if (
    hostileCount >= humanCount &&
    hostileCount > 0
  ) {

    game.gameOver =
      true;

    game.victoryTeam =
      "hostile";

    showGameOver();

    return true;
  }

  return false;
}

/* =========================================================
   GAME OVER
   ========================================================= */

function showGameOver() {

  let title =
    "GAME OVER";

  let message =
    "";

  if (
    game.victoryTeam ===
    "human"
  ) {

    title =
      "🌍 HUMANS WIN";

    message =
      "The Human team survived and reached victory.";

  } else if (
    game.victoryTeam ===
    "hostile"
  ) {

    title =
      "👽 HOSTILES WIN";

    message =
      "The Hostile team has taken control of the ship.";

  } else if (
    game.victoryTeam ===
    "jester"
  ) {

    title =
      "🃏 JESTER WINS";

    message =
      "The Jester successfully got voted out.";

  } else if (
    game.victoryTeam ===
    "king"
  ) {

    title =
      "👑 SURVIVOR KING WINS";

    message =
      "The Survivor King became one of the final two.";

  } else if (
    game.victoryTeam ===
    "neutral"
  ) {

    title =
      "⚖️ NEUTRAL VICTORY";

    message =
      "A Neutral role survived to Earth.";

  }

  $("gameOverTitle").textContent =
    title;

  $("gameOverMessage").textContent =
    message;

  $("finalPlayers").innerHTML =
    livingPlayers()
      .map(
        player =>
          `
            <div class="final-player">
              ${ROLE_DATA[player.role]?.icon || "👤"}
              ${esc(player.name)}
            </div>
          `
      )
      .join("");

  setScreen(
    "gameOverScreen"
  );
}

/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

  const content =
    $("roleGuideContent");

  if (!content) return;

  const roles = [
    ...HOSTILES,
    ...HUMANS,
    ...NEUTRALS,
    ...CONCEPTS
  ];

  content.innerHTML =
    roles
      .filter(
        role =>
          settings.enabled[role] ||
          role === "engineer"
      )
      .map(
        role =>
          `
            <div class="guide-card">

              <h3>
                ${ROLE_DATA[role].icon}
                ${ROLE_DATA[role].name}
              </h3>

              <p>
                ${esc(
                  ROLE_DATA[role].desc
                )}
              </p>

            </div>
          `
      )
      .join("");
}

/* =========================================================
   CUSTOM ROLE MENU
   ========================================================= */

function renderCustomRoles() {

  const container =
    $("customRoleContent");

  if (!container) return;

  const roles = [
    ...HOSTILES,
    ...HUMANS,
    ...NEUTRALS,
    ...CONCEPTS
  ];

  container.innerHTML =
    roles
      .map(
        role =>
          `
            <div class="custom-role-row">

              <label>
                <input
                  type="checkbox"
                  data-role="${role}"
                  ${
                    settings.enabled[role]
                      ? "checked"
                      : ""
                  }
                  ${
                    role === "engineer"
                      ? "disabled"
                      : ""
                  }
                >

                ${ROLE_DATA[role].icon}
                ${ROLE_DATA[role].name}

              </label>

            </div>
          `
      )
      .join("");

  container
    .querySelectorAll(
      "input[data-role]"
    )
    .forEach(input => {

      input.onchange = () => {

        const role =
          input.dataset.role;

        if (
          role === "engineer"
        ) return;

        settings.enabled[role] =
          input.checked;

        renderSetup();

      };

    });

}

/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindEvents() {

  /*
   * Player count.
   */

  $("playerCount")?.addEventListener(
    "change",
    resetSetupPlayers
  );

  /*
   * Start game.
   */

  $("startGameButton")?.addEventListener(
    "click",
    startGame
  );

  /*
   * Random roles.
   */

  $("randomRolesButton")?.addEventListener(
    "click",
    randomiseRoles
  );

  /*
   * Custom roles.
   */

  $("customRolesButton")?.addEventListener(
    "click",
    () => {

      renderCustomRoles();

      setScreen(
        "customRolesScreen"
      );

    }
  );

  /*
   * Apply custom roles.
   */

  $("applyCustomRolesButton")?.addEventListener(
    "click",
    () => {

      applyCustomRoles();

      setScreen(
        "setupScreen"
      );

    }
  );

  /*
   * Pass screen -> role.
   */

  $("readyButton")?.addEventListener(
    "click",
    showRole
  );

  /*
   * Role -> action.
   */

  $("showActionButton")?.addEventListener(
    "click",
    showAction
  );

  /*
   * Confirm ability.
   */

  $("confirmActionButton")?.addEventListener(
    "click",
    confirmAction
  );

  /*
   * Reaction ready.
   */

  $("reactionReadyButton")?.addEventListener(
    "click",
    showReactionResult
  );

  /*
   * Reaction continue.
   */

  $("reactionContinueButton")?.addEventListener(
    "click",
    advanceReaction
  );

  /*
   * Discussion -> voting.
   */

  $("startVotingButton")?.addEventListener(
    "click",
    startVoting
  );

  /*
   * Vote confirm.
   */

  $("confirmVoteButton")?.addEventListener(
    "click",
    confirmVote
  );

  /*
   * After vote.
   */

  $("afterVoteButton")?.addEventListener(
    "click",
    afterVoting
  );

  /*
   * Lifeline continue.
   */

  $("lifelineContinue")?.addEventListener(
    "click",
    nextRound
  );

  /*
   * Next round.
   */

  $("nextRoundButton")?.addEventListener(
    "click",
    nextRound
  );

  /*
   * Role guide.
   */

  $("roleGuideButton")?.addEventListener(
    "click",
    () => {

      renderRoleGuide();

      /*
       * If a dedicated guide screen exists,
       * use it. Otherwise keep current screen.
       */

      const guide =
        $("roleGuideScreen");

      if (guide) {
        setScreen(
          "roleGuideScreen"
        );
      }

    }
  );

  /*
   * Restart.
   */

  $("restartButton")?.addEventListener(
    "click",
    () => {

      game = {
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

        systems: {
          engines: true,
          o2: true,
          communications: true,
          power: true
        },

        engineStage: 1,

        judgeUsed: false,
        tricksterUsed: false,

        displaySwap: null,

        gameOver: false,

        victoryTeam: null
      };

      resetSetupPlayers();

      setScreen(
        "setupScreen"
      );

    }
  );

}

/* =========================================================
   INITIALISE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    bindEvents();

    resetSetupPlayers();

  }
);
