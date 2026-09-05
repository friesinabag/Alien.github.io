/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */


/* =========================================================
   SETTINGS
========================================================= */

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;
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
      "You are the Alien. Eliminate the crew and help the hostile side win. You may kill one player every round. If there is no Saboteur, you may choose between killing and sabotaging."
  },

  saboteur: {
    name: "Saboteur",
    icon: "😈",
    hostile: true,
    description:
      "You are the Saboteur. Sabotage one ship system every round. You cannot kill. The Alien cannot sabotage while you are aboard."
  },

  silencer: {
    name: "Silencer",
    icon: "🔇",
    hostile: true,
    description:
      "You are the Silencer. Choose one living player and prevent them from voting for two rounds. They can still discuss and use their ability."
  },

  engineer: {
    name: "Engineer",
    icon: "🔧",
    hostile: false,
    description:
      "You are the Engineer. Repair one offline ship system every round. You are the only role that can act while Power is offline."
  },

  detective: {
    name: "Detective",
    icon: "🕵️",
    hostile: false,
    description:
      "You are the Detective. Choose one player to learn what they interacted with during the previous round."
  },

  medic: {
    name: "Medic",
    icon: "🩺",
    hostile: false,
    description:
      "You are the Medic. Protect one player from being killed this round."
  },

  captain: {
    name: "Captain",
    icon: "👨‍✈️",
    hostile: false,
    description:
      "You are the Captain. If a vote ends in a tie, you secretly decide which tied player is ejected."
  },

  guard: {
    name: "Guard",
    icon: "🛡️",
    hostile: false,
    description:
      "You are the Guard. Choose one living player to block their role ability for this round."
  },

  survivor: {
    name: "Survivor",
    icon: "👤",
    hostile: false,
    description:
      "You are a Survivor. You have no special ability. Work with the crew to identify the hostile players."
  }
};

const ROLE_KEYS = Object.keys(ROLE_DATA);

const HOSTILE_ROLES = [
  "alien",
  "saboteur",
  "silencer"
];


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
  return document.getElementById(id);
}


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

  lastRoundResults: [],

  lifelineNumber: 0,

  gameOver: false
};


/* =========================================================
   SCREEN MANAGEMENT
========================================================= */

const screens = [
  "setupScreen",
  "passScreen",
  "roleScreen",
  "actionScreen",
  "privateResultScreen",
  "discussionScreen",
  "votingScreen",
  "voteResultScreen",
  "lifelineScreen",
  "systemsScreen",
  "gameOverScreen"
];

function showScreen(id) {
  screens.forEach(screenId => {
    const element = $(screenId);

    if (element) {
      element.classList.toggle("hidden", screenId !== id);
    }
  });
}


/* =========================================================
   SETUP
========================================================= */

function createPlayerSetup() {
  const count = Number($("playerCount").value);
  const container = $("playersSetup");

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "player-setup";

    wrapper.innerHTML = `
      <div class="player-header">
        <span class="player-number">Player ${i + 1}</span>
        <span class="player-role-status" id="roleStatus${i}">
          MANUAL
        </span>
      </div>

      <input
        id="playerName${i}"
        type="text"
        maxlength="20"
        placeholder="Player ${i + 1} name"
        value=""
      >

      <select id="playerRole${i}" class="role-select">
        ${createRoleOptions()}
      </select>
    `;

    container.appendChild(wrapper);
  }

  game.randomisedRoles = false;
}


function createRoleOptions() {
  let html = "";

  html += `<option value="survivor">Survivor</option>`;
  html += `<option value="engineer">Engineer</option>`;
  html += `<option value="detective">Detective</option>`;
  html += `<option value="medic">Medic</option>`;
  html += `<option value="captain">Captain</option>`;
  html += `<option value="guard">Guard</option>`;
  html += `<option value="alien">Alien</option>`;
  html += `<option value="saboteur">Saboteur</option>`;
  html += `<option value="silencer">Silencer</option>`;

  return html;
}


/* =========================================================
   RANDOM ROLE GENERATION
========================================================= */

function getHostileCount(playerCount) {
  let count;

  if (playerCount <= 5) {
    count = 1;
  } else if (playerCount <= 7) {
    count = 2;
  } else if (playerCount <= 10) {
    count = 3;
  } else {
    count = 4;
  }

  return Math.min(
    count,
    Math.floor((playerCount - 1) / 2)
  );
}


function randomiseRoles() {
  const count = Number($("playerCount").value);

  const roles = [];

  const hostileCount = getHostileCount(count);

  /*
    Alien is always the first hostile.
  */
  roles.push("alien");

  /*
    Add Saboteur if there are at least 2 hostiles.
  */
  if (hostileCount >= 2) {
    roles.push("saboteur");
  }

  /*
    Add Silencer if there are at least 3 hostiles.
  */
  if (hostileCount >= 3) {
    roles.push("silencer");
  }

  /*
    If there are 4 hostiles, add another hostile.
    The original role pool allows duplicate hostile types.
  */
  while (roles.length < hostileCount) {
    roles.push("alien");
  }

  /*
    Engineer is ALWAYS present.
  */
  roles.push("engineer");

  const humanPool = [
    "survivor",
    "detective",
    "medic",
    "captain",
    "guard"
  ];

  while (roles.length < count) {
    const randomRole =
      humanPool[Math.floor(Math.random() * humanPool.length)];

    roles.push(randomRole);
  }

  shuffleArray(roles);

  /*
    IMPORTANT:
    We ONLY change roles here.

    Existing names remain untouched.
  */
  for (let i = 0; i < count; i++) {
    const roleSelect = $(`playerRole${i}`);
    const status = $(`roleStatus${i}`);

    roleSelect.value = roles[i];

    /*
      The host does NOT see the actual random role.
    */
    status.textContent = "RANDOM";
  }

  game.randomisedRoles = true;
}


/* =========================================================
   START GAME
========================================================= */

function startGame() {
  const count = Number($("playerCount").value);

  const players = [];

  for (let i = 0; i < count; i++) {
    let name = $(`playerName${i}`).value.trim();

    /*
      Names are only given a fallback if the player
      themselves left the name blank.

      Randomising roles NEVER changes names.
    */
    if (!name) {
      name = `Player ${i + 1}`;
    }

    const role = $(`playerRole${i}`).value;

    players.push({
      id: i,
      name,
      role,
      alive: true
    });
  }

  /*
    Engineer must always exist.
  */
  const hasEngineer = players.some(
    player => player.role === "engineer"
  );

  if (!hasEngineer) {
    alert("There must always be an Engineer.");

    /*
      Put Engineer onto the last player.
      Their name stays exactly the same.
    */
    players[players.length - 1].role = "engineer";
  }

  game.players = players;

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

  $("gameInfo").classList.remove("hidden");

  updateGameInfo();

  beginRound();
}


/* =========================================================
   ROUND START
========================================================= */

function beginRound() {
  if (game.gameOver) return;

  game.currentPlayerIndex = 0;

  game.actions = {};
  game.blockedPlayers = new Set();
  game.protectedPlayers = new Set();

  startPlayerTurn();
}


/* =========================================================
   PASS PHONE
========================================================= */

function startPlayerTurn() {
  const livingPlayers = getLivingPlayers();

  /*
    Find next living player.
  */
  let player = game.players[game.currentPlayerIndex];

  while (player && !player.alive) {
    game.currentPlayerIndex++;

    if (game.currentPlayerIndex >= game.players.length) {
      break;
    }

    player = game.players[game.currentPlayerIndex];
  }

  if (!player) {
    resolveActions();
    return;
  }

  $("passTitle").textContent = "PASS THE PHONE";

  $("passText").textContent =
    `Pass the phone to ${player.name}.`;

  /*
    This is the fixed I'M READY button flow.
  */
  $("readyButton").onclick = function () {
    showRoleForCurrentPlayer();
  };

  showScreen("passScreen");
}


/* =========================================================
   SHOW ROLE
========================================================= */

function showRoleForCurrentPlayer() {
  const player = game.players[game.currentPlayerIndex];

  if (!player) {
    resolveActions();
    return;
  }

  const role = ROLE_DATA[player.role];

  $("roleIcon").textContent = role.icon;
  $("roleName").textContent = role.name;
  $("roleDescription").textContent = role.description;

  const hostiles = getLivingHostiles()
    .filter(other => other.id !== player.id);

  if (role.hostile && hostiles.length > 0) {
    $("hostilesBox").classList.remove("hidden");

    $("hostilesList").innerHTML = hostiles
      .map(other => `${ROLE_DATA[other.role].icon} ${other.name}`)
      .join("<br>");
  } else {
    $("hostilesBox").classList.add("hidden");
    $("hostilesList").innerHTML = "";
  }

  $("continueRoleButton").onclick = function () {
    showActionForCurrentPlayer();
  };

  showScreen("roleScreen");
}


/* =========================================================
   SHOW ACTION
========================================================= */

function showActionForCurrentPlayer() {
  const player = game.players[game.currentPlayerIndex];

  if (!player) {
    finishCurrentPlayerTurn();
    return;
  }

  /*
    Power OFFLINE disables every ability except Engineer.
  */
  if (
    !game.systems.power &&
    player.role !== "engineer"
  ) {
    game.actions[player.id] = {
      type: "none",
      target: null
    };

    showPrivateResult(
      "⚡",
      "POWER OFFLINE",
      "Power is offline. Your role ability cannot be used this round."
    );

    return;
  }

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
    case "survivor":
      game.actions[player.id] = {
        type: "none",
        target: null
      };

      showPrivateResult(
        "✓",
        "NO ACTION",
        "Your role has no active ability this round."
      );
      break;

    default:
      finishCurrentPlayerTurn();
  }
}


/* =========================================================
   ACTION UI HELPERS
========================================================= */

function setupActionScreen(title, description) {
  $("actionTitle").textContent = title;
  $("actionDescription").textContent = description;
  $("actionOptions").innerHTML = "";

  $("submitActionButton").classList.add("hidden");
  $("skipActionButton").classList.add("hidden");

  game.selectedAction = null;
}


function createPlayerActionButtons(
  players,
  onSelect
) {
  players.forEach(player => {
    const button = document.createElement("button");

    button.className = "action-option";
    button.textContent = player.name;

    button.onclick = () => {
      document
        .querySelectorAll(".action-option")
        .forEach(btn => btn.classList.remove("selected"));

      button.classList.add("selected");

      game.selectedAction = player;

      $("submitActionButton").classList.remove("hidden");
    };

    $("actionOptions").appendChild(button);
  });

  $("submitActionButton").onclick = onSelect;
}


/* =========================================================
   ALIEN
========================================================= */

function showAlienAction(player) {
  setupActionScreen(
    "ALIEN ACTION",
    "Choose a living player to kill."
  );

  const livingTargets = getLivingPlayers()
    .filter(target => target.id !== player.id);

  createPlayerActionButtons(
    livingTargets,
    () => {
      const target = game.selectedAction;

      game.actions[player.id] = {
        type: "kill",
        target: target.id,
        actor: player.id
      };

      showPrivateResult(
        "👽",
        "TARGET SELECTED",
        `You selected ${target.name}.`
      );
    }
  );

  /*
    If there is no Saboteur, Alien may sabotage instead.
  */
  const hasSaboteur = getLivingHostiles()
    .some(other => other.role === "saboteur");

  if (!hasSaboteur) {
    const sabotageButton = document.createElement("button");

    sabotageButton.className = "secondary-button";
    sabotageButton.textContent = "SABOTAGE INSTEAD";

    sabotageButton.onclick = () => {
      showAlienSabotageAction(player);
    };

    $("actionOptions").appendChild(sabotageButton);
  }

  showScreen("actionScreen");
}


function showAlienSabotageAction(player) {
  setupActionScreen(
    "ALIEN SABOTAGE",
    "Choose one ship system to sabotage."
  );

  createSystemActionButtons(
    getOnlineSystems(),
    () => {
      const system = game.selectedAction;

      game.actions[player.id] = {
        type: "sabotage",
        system,
        actor: player.id
      };

      showPrivateResult(
        "👽",
        "SYSTEM SABOTAGED",
        `${SYSTEMS[system].name} will be sabotaged.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   SABOTEUR
========================================================= */

function showSaboteurAction(player) {
  setupActionScreen(
    "SABOTAGE",
    "Choose one online ship system to sabotage."
  );

  createSystemActionButtons(
    getOnlineSystems(),
    () => {
      const system = game.selectedAction;

      game.actions[player.id] = {
        type: "sabotage",
        system,
        actor: player.id
      };

      showPrivateResult(
        "😈",
        "SABOTAGE SELECTED",
        `${SYSTEMS[system].name} will be sabotaged.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   SILENCER
========================================================= */

function showSilencerAction(player) {
  setupActionScreen(
    "SILENCE A PLAYER",
    "Choose one living player. They will be unable to vote for two rounds."
  );

  const targets = getLivingPlayers()
    .filter(target => target.id !== player.id);

  createPlayerActionButtons(
    targets,
    () => {
      const target = game.selectedAction;

      game.actions[player.id] = {
        type: "silence",
        target: target.id,
        actor: player.id
      };

      showPrivateResult(
        "🔇",
        "PLAYER SILENCED",
        `${target.name} will be unable to vote for two rounds.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   ENGINEER
========================================================= */

function showEngineerAction(player) {
  const offlineSystems = getOfflineSystems();

  if (offlineSystems.length === 0) {
    game.actions[player.id] = {
      type: "none",
      target: null,
      actor: player.id
    };

    showPrivateResult(
      "🔧",
      "ALL SYSTEMS ONLINE",
      "There are no offline systems to repair."
    );

    return;
  }

  setupActionScreen(
    "REPAIR SYSTEM",
    "Choose one offline system to repair."
  );

  createSystemActionButtons(
    offlineSystems,
    () => {
      const system = game.selectedAction;

      game.actions[player.id] = {
        type: "repair",
        system,
        actor: player.id
      };

      showPrivateResult(
        "🔧",
        "REPAIR SELECTED",
        `${SYSTEMS[system].name} will be repaired.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   DETECTIVE
========================================================= */

function showDetectiveAction(player) {
  setupActionScreen(
    "INVESTIGATE",
    "Choose a player. You will learn what they interacted with during the previous round."
  );

  const targets = getLivingPlayers()
    .filter(target => target.id !== player.id);

  createPlayerActionButtons(
    targets,
    () => {
      const target = game.selectedAction;

      game.actions[player.id] = {
        type: "investigate",
        target: target.id,
        actor: player.id
      };

      showPrivateResult(
        "🕵️",
        "INVESTIGATION READY",
        `You will receive information about ${target.name}'s previous-round interaction.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   MEDIC
========================================================= */

function showMedicAction(player) {
  setupActionScreen(
    "PROTECT",
    "Choose one living player to protect from being killed this round."
  );

  createPlayerActionButtons(
    getLivingPlayers(),
    () => {
      const target = game.selectedAction;

      game.actions[player.id] = {
        type: "protect",
        target: target.id,
        actor: player.id
      };

      showPrivateResult(
        "🩺",
        "PROTECTION SELECTED",
        `${target.name} will be protected this round.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   GUARD
========================================================= */

function showGuardAction(player) {
  setupActionScreen(
    "GUARD",
    "Choose one living player whose ability will be blocked this round."
  );

  const targets = getLivingPlayers()
    .filter(target => target.id !== player.id);

  createPlayerActionButtons(
    targets,
    () => {
      const target = game.selectedAction;

      game.actions[player.id] = {
        type: "block",
        target: target.id,
        actor: player.id
      };

      showPrivateResult(
        "🛡️",
        "PLAYER BLOCKED",
        `${target.name}'s ability will be blocked this round.`
      );
    }
  );

  showScreen("actionScreen");
}


/* =========================================================
   SYSTEM BUTTONS
========================================================= */

function createSystemActionButtons(
  systems,
  onSelect
) {
  systems.forEach(system => {
    const button = document.createElement("button");

    button.className = "action-option";
    button.textContent = SYSTEMS[system].name;

    button.onclick = () => {
      document
        .querySelectorAll(".action-option")
        .forEach(btn => btn.classList.remove("selected"));

      button.classList.add("selected");

      game.selectedAction = system;

      $("submitActionButton").classList.remove("hidden");
    };

    $("actionOptions").appendChild(button);
  });

  $("submitActionButton").onclick = onSelect;
}


/* =========================================================
   PRIVATE RESULT
========================================================= */

function showPrivateResult(
  icon,
  title,
  text
) {
  $("privateResultIcon").textContent = icon;
  $("privateResultTitle").textContent = title;
  $("privateResultText").textContent = text;

  $("privateResultButton").onclick = () => {
    finishCurrentPlayerTurn();
  };

  showScreen("privateResultScreen");
}


/* =========================================================
   FINISH PLAYER TURN
========================================================= */

function finishCurrentPlayerTurn() {
  game.currentPlayerIndex++;

  if (game.currentPlayerIndex >= game.players.length) {
    resolveActions();
    return;
  }

  startPlayerTurn();
}


/* =========================================================
   ACTION RESOLUTION
========================================================= */

function resolveActions() {
  game.lastRoundResults = [];

  /*
    -----------------------------------------
    1. GUARD
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      action &&
      action.type === "block"
    ) {
      game.blockedPlayers.add(action.target);
    }
  }


  /*
    -----------------------------------------
    2. MEDIC
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      action &&
      action.type === "protect" &&
      !game.blockedPlayers.has(player.id)
    ) {
      game.protectedPlayers.add(action.target);
    }
  }


  /*
    -----------------------------------------
    3. SABOTAGE
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      action &&
      action.type === "sabotage" &&
      !game.blockedPlayers.has(player.id)
    ) {
      if (game.systems[action.system]) {
        game.systems[action.system] = false;

        game.lastRoundResults.push(
          `${SYSTEMS[action.system].name} went OFFLINE.`
        );
      }
    }
  }


  /*
    -----------------------------------------
    4. ENGINEER REPAIRS
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      player.role === "engineer" &&
      action &&
      action.type === "repair"
    ) {
      /*
        Engineer can work even when Power is offline.

        Guard can still block Engineer when Power is online.
      */
      if (
        game.systems.power ||
        !game.blockedPlayers.has(player.id)
      ) {
        game.systems[action.system] = true;

        game.lastRoundResults.push(
          `${SYSTEMS[action.system].name} was repaired.`
        );
      }
    }
  }


  /*
    -----------------------------------------
    5. SILENCER
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      player.role === "silencer" &&
      action &&
      action.type === "silence" &&
      !game.blockedPlayers.has(player.id)
    ) {
      /*
        Current round + next round.
      */
      game.silencedUntil[action.target] =
        game.round + 1;
    }
  }


  /*
    -----------------------------------------
    6. KILLS
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      player.role === "alien" &&
      action &&
      action.type === "kill" &&
      !game.blockedPlayers.has(player.id)
    ) {
      const target = getPlayerById(action.target);

      if (!target || !target.alive) continue;

      if (game.protectedPlayers.has(target.id)) {
        game.lastRoundResults.push(
          "A kill was prevented."
        );
      } else {
        target.alive = false;

        game.lastRoundResults.push(
          `${target.name} is no longer alive.`
        );
      }
    }
  }


  /*
    -----------------------------------------
    7. DETECTIVE
    -----------------------------------------
  */

  for (const player of getLivingPlayers()) {
    const action = game.actions[player.id];

    if (
      player.role === "detective" &&
      action &&
      action.type === "investigate" &&
      !game.blockedPlayers.has(player.id)
    ) {
      const target = getPlayerById(action.target);

      const previousAction =
        game.previousActions[target.id];

      let information = "did nothing";

      if (previousAction) {
        if (previousAction.target !== undefined) {
          const targetPlayer =
            getPlayerById(previousAction.target);

          if (targetPlayer) {
            information =
              `interacted with ${targetPlayer.name}`;
          }
        } else if (previousAction.system) {
          information =
            `interacted with ${SYSTEMS[previousAction.system].name}`;
        } else if (previousAction.type === "none") {
          information = "did nothing";
        } else {
          information =
            `used their ${ROLE_DATA[target.role].name} ability`;
        }
      }

      /*
        Store the private result for the Detective.
      */
      game.actions[player.id].investigationResult =
        `${target.name} ${information}.`;
    }
  }


  /*
    Save current actions so that they become
    "previousActions" next round.
  */
  game.previousActions =
    JSON.parse(JSON.stringify(game.actions));

  /*
    Show Detective result privately before discussion.
  */
  const detective = getLivingPlayers()
    .find(player =>
      player.role === "detective" &&
      game.actions[player.id] &&
      game.actions[player.id].investigationResult
    );

  if (detective) {
    showDetectiveResult(detective);
    return;
  }

  continueAfterActions();
}


/* =========================================================
   DETECTIVE RESULT
========================================================= */

function showDetectiveResult(player) {
  const result =
    game.actions[player.id].investigationResult;

  $("privateResultIcon").textContent = "🕵️";
  $("privateResultTitle").textContent =
    "INVESTIGATION RESULT";

  $("privateResultText").textContent = result;

  $("privateResultButton").onclick = () => {
    continueAfterActions();
  };

  showScreen("privateResultScreen");
}


/* =========================================================
   AFTER ACTIONS
========================================================= */

function continueAfterActions() {
  checkImmediateVictory();

  if (game.gameOver) return;

  showDiscussion();
}


/* =========================================================
   DISCUSSION
========================================================= */

function showDiscussion() {
  updateGameInfo();

  $("discussionRound").textContent =
    `ROUND ${game.round}`;

  $("discussionStage").textContent =
    `STAGE ${game.stage} / ${MAX_STAGES}`;

  if (game.lastRoundResults.length === 0) {
    $("roundResults").textContent =
      "No major events were detected.";
  } else {
    $("roundResults").innerHTML =
      game.lastRoundResults
        .map(result => `<div>• ${result}</div>`)
        .join("");
  }

  $("discussionButton").onclick = () => {
    startVoting();
  };

  showScreen("discussionScreen");
}


/* =========================================================
   VOTING
========================================================= */

function startVoting() {
  game.votes = {};
  game.currentVoteIndex = 0;

  startNextVote();
}


function startNextVote() {
  while (
    game.currentVoteIndex < game.players.length &&
    !game.players[game.currentVoteIndex].alive
  ) {
    game.currentVoteIndex++;
  }

  if (
    game.currentVoteIndex >= game.players.length
  ) {
    resolveVoting();
    return;
  }

  const player =
    game.players[game.currentVoteIndex];

  /*
    Silenced player cannot vote.
  */
  if (isSilenced(player.id)) {
    game.votes[player.id] = null;

    $("votingPlayerTitle").textContent =
      `${player.name}'S TURN`;

    $("votingInstructions").textContent =
      "You are silenced and cannot vote this round.";

    $("voteOptions").innerHTML = "";

    const skipButton =
      document.createElement("button");

    skipButton.className = "secondary-button";
    skipButton.textContent = "CONTINUE";

    skipButton.onclick = () => {
      game.currentVoteIndex++;
      startNextVote();
    };

    $("voteOptions").appendChild(skipButton);

    updateVotingInfo();

    showScreen("votingScreen");
    return;
  }

  game.selectedVote = null;

  $("votingPlayerTitle").textContent =
    `${player.name}'S TURN`;

  $("votingInstructions").textContent =
    "Choose a player to eject or skip.";

  renderVoteOptions(player);

  updateVotingInfo();

  showScreen("votingScreen");
}


function renderVoteOptions(voter) {
  const container = $("voteOptions");

  container.innerHTML = "";

  const targets = getLivingPlayers()
    .filter(player => player.id !== voter.id);

  targets.forEach(target => {
    const button =
      document.createElement("button");

    button.className = "vote-option";
    button.textContent = `🗳️ ${target.name}`;

    button.onclick = () => {
      document
        .querySelectorAll(".vote-option")
        .forEach(btn =>
          btn.classList.remove("selected")
        );

      button.classList.add("selected");

      game.selectedVote = target.id;

      $("submitVoteButton")
        .classList.remove("hidden");
    };

    container.appendChild(button);
  });

  const skip =
    document.createElement("button");

  skip.className =
    "vote-option skip";

  skip.textContent =
    "⏭️ SKIP VOTE";

  skip.onclick = () => {
    document
      .querySelectorAll(".vote-option")
      .forEach(btn =>
        btn.classList.remove("selected")
      );

    skip.classList.add("selected");

    game.selectedVote = null;

    $("submitVoteButton")
      .classList.remove("hidden");
  };

  container.appendChild(skip);

  $("submitVoteButton").classList.remove("hidden");

  $("submitVoteButton").onclick = () => {
    game.votes[voter.id] =
      game.selectedVote;

    $("submitVoteButton")
      .classList.add("hidden");

    game.currentVoteIndex++;

    startNextVote();
  };
}


/* =========================================================
   VOTING INFO
========================================================= */

function updateVotingInfo() {
  $("votingRound").textContent =
    `ROUND ${game.round}`;

  $("votingStage").textContent =
    `STAGE ${game.stage} / ${MAX_STAGES}`;
}


/* =========================================================
   RESOLVE VOTING
========================================================= */

function resolveVoting() {
  const counts = {};

  for (const playerId in game.votes) {
    const targetId = game.votes[playerId];

    if (targetId === null) continue;

    counts[targetId] =
      (counts[targetId] || 0) + 1;
  }

  let highest = 0;
  let tied = [];

  for (const targetId in counts) {
    const count = counts[targetId];

    if (count > highest) {
      highest = count;
      tied = [Number(targetId)];
    } else if (count === highest) {
      tied.push(Number(targetId));
    }
  }

  let ejected = null;

  if (tied.length === 1) {
    ejected = getPlayerById(tied[0]);
  } else if (tied.length > 1) {
    /*
      Captain secretly chooses.
    */
    const captain = getLivingPlayers()
      .find(player => player.role === "captain");

    if (captain) {
      showCaptainTieDecision(
        captain,
        tied
      );

      return;
    }
  }

  finishVoting(ejected);
}


/* =========================================================
   CAPTAIN TIE
========================================================= */

function showCaptainTieDecision(
  captain,
  tiedIds
) {
  $("votingPlayerTitle").textContent =
    "CAPTAIN — TIE DECISION";

  $("votingInstructions").textContent =
    "Choose which tied player will be ejected.";

  const container = $("voteOptions");

  container.innerHTML = "";

  $("submitVoteButton")
    .classList.add("hidden");

  tiedIds.forEach(id => {
    const player = getPlayerById(id);

    const button =
      document.createElement("button");

    button.className = "vote-option";
    button.textContent = `⚖️ ${player.name}`;

    button.onclick = () => {
      finishVoting(player);
    };

    container.appendChild(button);
  });

  showScreen("votingScreen");
}


/* =========================================================
   FINISH VOTING
========================================================= */

function finishVoting(ejected) {
  if (ejected) {
    ejected.alive = false;
  }

  if (ejected) {
    $("voteResultText").textContent =
      `${ejected.name} was ejected.`;
  } else {
    $("voteResultText").textContent =
      "No player was ejected.";
  }

  $("voteResultButton").onclick = () => {
    afterVoting();
  };

  showScreen("voteResultScreen");
}


/* =========================================================
   AFTER VOTING
========================================================= */

function afterVoting() {
  checkImmediateVictory();

  if (game.gameOver) return;

  /*
    Earth sends a lifeline exactly every 3 rounds.
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

  $("lifelineMessage").textContent =
    generateLifeline();

  $("lifelineButton").onclick = () => {
    continueRoundProgression();
  };

  showScreen("lifelineScreen");
}


function generateLifeline() {
  const aliveHostiles =
    getLivingHostiles().length;

  const messages = [
    "⚠️ ONE OF THESE PLAYERS IS HOSTILE: " +
      randomHostileCluePlayers(),

    "🌎 EARTH SAYS: There is an Alien aboard.",

    "🌎 EARTH SAYS: There is more than 1 Alien.",

    "🌎 EARTH SAYS: There is a Saboteur.",

    "🌎 EARTH SAYS: There is a Silencer.",

    `🌎 EARTH SAYS: Exactly ${Math.min(
      2,
      aliveHostiles
    )} hostile roles are still alive.`,

    "🌎 EARTH SAYS: Engineer is still aboard.",

    "🌎 EARTH SAYS: A ship system was sabotaged.",

    "🌎 EARTH SAYS: A ship system was repaired."
  ];

  /*
    Filter impossible role clues.
  */
  const valid = messages.filter(message => {
    if (
      message.includes("more than 1 Alien")
    ) {
      return game.players.filter(
        p => p.role === "alien"
      ).length > 1;
    }

    if (
      message.includes("There is a Saboteur")
    ) {
      return game.players.some(
        p => p.role === "saboteur"
      );
    }

    if (
      message.includes("There is a Silencer")
    ) {
      return game.players.some(
        p => p.role === "silencer"
      );
    }

    return true;
  });

  return valid[
    Math.floor(Math.random() * valid.length)
  ];
}


function randomHostileCluePlayers() {
  const livingPlayers =
    getLivingPlayers();

  const shuffled =
    [...livingPlayers];

  shuffleArray(shuffled);

  const number =
    Math.min(
      3,
      Math.max(
        2,
        getLivingHostiles().length + 1
      )
    );

  const selected =
    shuffled.slice(0, number);

  /*
    Ensure exactly one hostile is included
    whenever possible.
  */
  const hostiles =
    selected.filter(player =>
      HOSTILE_ROLES.includes(player.role)
    );

  if (hostiles.length === 0) {
    const hostile =
      getLivingHostiles()[0];

    if (hostile) {
      selected[0] = hostile;
    }
  }

  return selected
    .map(player => player.name)
    .join(", ");
}


/* =========================================================
   ROUND / STAGE PROGRESSION
========================================================= */

function continueRoundProgression() {
  /*
    Engines being offline means the stage does not progress.
  */
  if (game.systems.engines) {
    game.stage++;

    if (game.stage > MAX_STAGES) {
      humanWin(
        "The crew completed all 10 stages."
      );

      return;
    }
  }

  /*
    The round always progresses.
  */
  game.round++;

  /*
    Remove expired silences.
  */
  cleanupSilences();

  /*
    Reset temporary state.
  */
  game.blockedPlayers = new Set();
  game.protectedPlayers = new Set();

  updateGameInfo();

  showSystemsStatus();
}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function showSystemsStatus() {
  const container = $("systemsList");

  container.innerHTML = "";

  Object.keys(SYSTEMS).forEach(key => {
    const system = document.createElement("div");

    system.className = "system";

    const online =
      game.systems[key];

    system.innerHTML = `
      <span class="system-name">
        ${SYSTEMS[key].name}
      </span>

      <span class="system-status ${
        online ? "online" : "offline"
      }">
        ${online ? "ONLINE" : "OFFLINE"}
      </span>
    `;

    container.appendChild(system);
  });

  $("systemsButton").onclick = () => {
    beginRound();
  };

  showScreen("systemsScreen");
}


/* =========================================================
   SILENCE
========================================================= */

function isSilenced(playerId) {
  return (
    game.silencedUntil[playerId] !== undefined &&
    game.silencedUntil[playerId] >= game.round
  );
}


function cleanupSilences() {
  for (const playerId in game.silencedUntil) {
    if (
      game.silencedUntil[playerId] < game.round
    ) {
      delete game.silencedUntil[playerId];
    }
  }
}


/* =========================================================
   VICTORY CONDITIONS
========================================================= */

function checkImmediateVictory() {
  const hostiles =
    getLivingHostiles();

  const humans =
    getLivingPlayers()
      .filter(player =>
        !HOSTILE_ROLES.includes(player.role)
      );

  /*
    Humans win if every hostile is eliminated.
  */
  if (hostiles.length === 0) {
    humanWin(
      "All hostile players have been eliminated."
    );

    return;
  }

  /*
    Hostiles win when hostile count >= human count.
  */
  if (hostiles.length >= humans.length) {
    hostileWin(
      "The hostile side has reached the required numbers."
    );
  }
}


function humanWin(reason) {
  game.gameOver = true;

  $("gameOverIcon").textContent = "🏆";
  $("gameOverTitle").textContent =
    "HUMANS WIN";

  $("gameOverText").textContent =
    reason;

  showScreen("gameOverScreen");
}


function hostileWin(reason) {
  game.gameOver = true;

  $("gameOverIcon").textContent = "👽";
  $("gameOverTitle").textContent =
    "HOSTILES WIN";

  $("gameOverText").textContent =
    reason;

  showScreen("gameOverScreen");
}


/* =========================================================
   PLAYER HELPERS
========================================================= */

function getLivingPlayers() {
  return game.players.filter(
    player => player.alive
  );
}


function getLivingHostiles() {
  return getLivingPlayers().filter(
    player =>
      HOSTILE_ROLES.includes(player.role)
  );
}


function getPlayerById(id) {
  return game.players.find(
    player => player.id === Number(id)
  );
}


/* =========================================================
   SYSTEM HELPERS
========================================================= */

function getOfflineSystems() {
  return Object.keys(SYSTEMS)
    .filter(key => !game.systems[key]);
}


function getOnlineSystems() {
  return Object.keys(SYSTEMS)
    .filter(key => game.systems[key]);
}


/* =========================================================
   GAME INFO
========================================================= */

function updateGameInfo() {
  $("roundDisplay").textContent =
    `ROUND ${game.round}`;

  $("stageDisplay").textContent =
    `STAGE ${game.stage} / ${MAX_STAGES}`;
}


/* =========================================================
   SHUFFLE
========================================================= */

function shuffleArray(array) {
  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(Math.random() * (i + 1));

    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];
  }

  return array;
}


/* =========================================================
   RESTART
========================================================= */

function restartGame() {
  location.reload();
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

$("playerCount").addEventListener(
  "change",
  createPlayerSetup
);

$("randomRolesButton").addEventListener(
  "click",
  randomiseRoles
);

$("startGameButton").addEventListener(
  "click",
  startGame
);

$("restartButton").addEventListener(
  "click",
  restartGame
);


/* =========================================================
   INITIAL SETUP
========================================================= */

createPlayerSetup();
