/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   ========================================================= */


/* =========================================================
   SETTINGS
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
      "You are the Alien. Kill one player per round. If there is no living Saboteur, you can choose to kill OR sabotage."
  },

  saboteur: {
    name: "Saboteur",
    icon: "😈",
    hostile: true,

    description:
      "You are the Saboteur. Sabotage one ship system every round. You cannot kill."
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
      "You are the Engineer. Repair one offline system every round. You are the only role that can act while Power is offline."
  },

  detective: {
    name: "Detective",
    icon: "🕵️",
    hostile: false,

    description:
      "You are the Detective. Choose one player and learn what they interacted with during the previous round."
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
      "You are the Guard. Choose one living player and block their role ability for this round."
  },

  survivor: {
    name: "Survivor",
    icon: "👤",
    hostile: false,

    description:
      "You are a Survivor. You have no special ability. Work with the crew to identify the hostile players."
  }
};


const HOSTILE_ROLES = [
  "alien",
  "saboteur",
  "silencer"
];


/* =========================================================
   DOM
========================================================= */

function $(id) {
  return document.getElementById(id);
}


const SCREENS = [
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


function showScreen(screenId) {

  SCREENS.forEach(id => {

    const screen = $(id);

    if (screen) {
      screen.classList.toggle(
        "hidden",
        id !== screenId
      );
    }

  });

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

  randomRoles: {},

  lastRoundResults: [],

  lifelineNumber: 0,

  gameOver: false

};


/* =========================================================
   PLAYER SETUP
========================================================= */

function createPlayerSetup() {

  const count =
    Number($("playerCount").value);

  const container =
    $("playersSetup");

  container.innerHTML = "";

  game.randomisedRoles = false;
  game.randomRoles = {};

  $("randomStatus")
    .classList.add("hidden");


  for (let i = 0; i < count; i++) {

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "player-setup";


    wrapper.innerHTML = `

      <div class="player-header">

        <span class="player-number">
          Player ${i + 1}
        </span>

        <span
          class="player-role-status"
          id="roleStatus${i}"
        >
          MANUAL
        </span>

      </div>


      <input
        id="playerName${i}"
        type="text"
        maxlength="20"
        placeholder="Player ${i + 1} name"
      >


      <select
        id="playerRole${i}"
        class="role-select"
      >

        <option value="survivor">
          Survivor
        </option>

        <option value="engineer">
          Engineer
        </option>

        <option value="detective">
          Detective
        </option>

        <option value="medic">
          Medic
        </option>

        <option value="captain">
          Captain
        </option>

        <option value="guard">
          Guard
        </option>

        <option value="alien">
          Alien
        </option>

        <option value="saboteur">
          Saboteur
        </option>

        <option value="silencer">
          Silencer
        </option>

      </select>

    `;


    container.appendChild(wrapper);

  }

}


/* =========================================================
   RANDOM HOSTILE COUNT
========================================================= */

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


/* =========================================================
   RANDOMISE ROLES
========================================================= */

function randomiseRoles() {

  const count =
    Number($("playerCount").value);


  const roles = [];

  const hostileCount =
    Math.min(
      getHostileCount(count),
      Math.floor((count - 1) / 2)
    );


  /*
    Alien is always included.
  */

  roles.push("alien");


  /*
    Saboteur.
  */

  if (hostileCount >= 2) {
    roles.push("saboteur");
  }


  /*
    Silencer.
  */

  if (hostileCount >= 3) {
    roles.push("silencer");
  }


  /*
    Extra hostile if needed.
  */

  while (roles.length < hostileCount) {
    roles.push("alien");
  }


  /*
    Engineer is ALWAYS present.
  */

  roles.push("engineer");


  const humanRoles = [
    "survivor",
    "detective",
    "medic",
    "captain",
    "guard"
  ];


  /*
    Fill remaining players.
  */

  while (roles.length < count) {

    const role =
      humanRoles[
        Math.floor(
          Math.random() *
          humanRoles.length
        )
      ];

    roles.push(role);

  }


  shuffle(roles);


  /*
    ========================================================
    IMPORTANT SECRET ROLE SYSTEM
    ========================================================

    The actual role is stored in:

        game.randomRoles[playerIndex]

    The visible select DOES NOT contain the real role.

    Therefore the host cannot open the dropdown
    and discover that someone is Alien.
  */

  for (let i = 0; i < count; i++) {

    const realRole = roles[i];

    game.randomRoles[i] =
      realRole;


    const roleSelect =
      $(`playerRole${i}`);


    /*
      Completely replace the dropdown with
      a single RANDOM option.

      The real role is NOT inside it.
    */

    roleSelect.innerHTML = `
      <option value="random">
        RANDOM
      </option>
    `;


    roleSelect.value =
      "random";


    roleSelect.disabled = true;


    roleSelect.classList.add(
      "random-hidden"
    );


    $(`roleStatus${i}`)
      .textContent = "🔒 RANDOM";

  }


  game.randomisedRoles = true;


  $("randomStatus")
    .classList.remove("hidden");

}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

  const count =
    Number($("playerCount").value);


  const players = [];


  for (let i = 0; i < count; i++) {

    let name =
      $(`playerName${i}`)
        .value
        .trim();


    /*
      Only blank names receive a fallback.

      RANDOMISE ROLES never changes names.
    */

    if (!name) {
      name = `Player ${i + 1}`;
    }


    let role;


    if (game.randomisedRoles) {

      /*
        Get the REAL hidden role.
      */

      role =
        game.randomRoles[i];

    } else {

      /*
        Manual role selection.
      */

      role =
        $(`playerRole${i}`).value;

    }


    players.push({

      id: i,

      name: name,

      role: role,

      alive: true

    });

  }


  /*
    Engineer must always exist.
  */

  if (
    !players.some(
      player =>
        player.role === "engineer"
    )
  ) {

    alert(
      "There must always be an Engineer."
    );

    /*
      Give Engineer to the final player.
      Their name is NOT changed.
    */

    players[
      players.length - 1
    ].role = "engineer";

  }


  game.players =
    players;


  /*
    Reset game.
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

  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();

  game.silencedUntil = {};

  game.votes = {};

  game.selectedAction = null;

  game.selectedVote = null;

  game.lastRoundResults = [];

  game.lifelineNumber = 0;

  game.gameOver = false;


  $("gameInfo")
    .classList.remove("hidden");


  updateGameInfo();


  beginRound();

}


/* =========================================================
   ROUND START
========================================================= */

function beginRound() {

  if (game.gameOver) {
    return;
  }


  game.currentPlayerIndex = 0;

  game.actions = {};

  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();


  startPlayerTurn();

}


/* =========================================================
   PLAYER TURN
========================================================= */

function startPlayerTurn() {

  while (
    game.currentPlayerIndex <
    game.players.length &&
    !game.players[
      game.currentPlayerIndex
    ].alive
  ) {

    game.currentPlayerIndex++;

  }


  if (
    game.currentPlayerIndex >=
    game.players.length
  ) {

    resolveActions();

    return;

  }


  const player =
    game.players[
      game.currentPlayerIndex
    ];


  $("passText").textContent =
    `Pass the phone to ${player.name}.`;


  /*
    FIXED I'M READY BUTTON
  */

  $("readyButton").onclick = () => {

    showRoleForCurrentPlayer();

  };


  showScreen("passScreen");

}


/* =========================================================
   ROLE SCREEN
========================================================= */

function showRoleForCurrentPlayer() {

  const player =
    game.players[
      game.currentPlayerIndex
    ];


  if (!player) {
    resolveActions();
    return;
  }


  const role =
    ROLE_DATA[player.role];


  $("roleIcon").textContent =
    role.icon;


  $("roleName").textContent =
    role.name;


  $("roleDescription").textContent =
    role.description;


  /*
    Hostiles can see all other hostiles.
  */

  if (role.hostile) {

    const otherHostiles =
      getLivingHostiles()
        .filter(
          other =>
            other.id !== player.id
        );


    if (otherHostiles.length > 0) {

      $("hostilesBox")
        .classList.remove("hidden");


      $("hostilesList").innerHTML =
        otherHostiles
          .map(
            other =>
              `${ROLE_DATA[other.role].icon} ${other.name}`
          )
          .join("<br>");

    } else {

      $("hostilesBox")
        .classList.add("hidden");

      $("hostilesList").innerHTML = "";

    }

  } else {

    $("hostilesBox")
      .classList.add("hidden");

    $("hostilesList").innerHTML = "";

  }


  $("continueRoleButton").onclick =
    () => {

      showActionForCurrentPlayer();

    };


  showScreen("roleScreen");

}


/* =========================================================
   ACTION SCREEN
========================================================= */

function showActionForCurrentPlayer() {

  const player =
    game.players[
      game.currentPlayerIndex
    ];


  /*
    Power offline disables every role ability
    EXCEPT Engineer.
  */

  if (
    !game.systems.power &&
    player.role !== "engineer"
  ) {

    game.actions[player.id] = {

      type: "none",

      actor: player.id

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

        actor: player.id

      };


      showPrivateResult(

        "✓",

        "NO ACTION",

        "Your role has no active ability this round."

      );

      break;

  }

}


/* =========================================================
   ACTION UI
========================================================= */

function setupActionScreen(
  title,
  description
) {

  $("actionTitle").textContent =
    title;

  $("actionDescription").textContent =
    description;

  $("actionOptions").innerHTML = "";

  $("submitActionButton")
    .classList.add("hidden");

  game.selectedAction = null;

}


function createPlayerActionButtons(
  players,
  callback
) {

  players.forEach(player => {

    const button =
      document.createElement("button");


    button.className =
      "action-option";


    button.textContent =
      player.name;


    button.onclick = () => {

      document
        .querySelectorAll(
          ".action-option"
        )
        .forEach(
          btn =>
            btn.classList.remove(
              "selected"
            )
        );


      button.classList.add(
        "selected"
      );


      game.selectedAction =
        player;


      $("submitActionButton")
        .classList.remove("hidden");

    };


    $("actionOptions")
      .appendChild(button);

  });


  $("submitActionButton").onclick =
    callback;

}


/* =========================================================
   SYSTEM ACTION BUTTONS
========================================================= */

function createSystemActionButtons(
  systems,
  callback
) {

  systems.forEach(system => {

    const button =
      document.createElement("button");


    button.className =
      "action-option";


    button.textContent =
      SYSTEMS[system].name;


    button.onclick = () => {

      document
        .querySelectorAll(
          ".action-option"
        )
        .forEach(
          btn =>
            btn.classList.remove(
              "selected"
            )
        );


      button.classList.add(
        "selected"
      );


      game.selectedAction =
        system;


      $("submitActionButton")
        .classList.remove("hidden");

    };


    $("actionOptions")
      .appendChild(button);

  });


  $("submitActionButton").onclick =
    callback;

}


/* =========================================================
   ALIEN
========================================================= */

function showAlienAction(player) {

  setupActionScreen(

    "ALIEN ACTION",

    "Choose a living player to kill."

  );


  const targets =
    getLivingPlayers()
      .filter(
        target =>
          target.id !== player.id
      );


  createPlayerActionButtons(
    targets,
    () => {

      const target =
        game.selectedAction;


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
    Alien may sabotage ONLY if there
    is no living Saboteur.
  */

  const saboteurAlive =
    getLivingHostiles()
      .some(
        player =>
          player.role === "saboteur"
      );


  if (!saboteurAlive) {

    const button =
      document.createElement("button");


    button.className =
      "secondary-button";


    button.textContent =
      "SABOTAGE INSTEAD";


    button.onclick = () => {

      showAlienSabotageAction(
        player
      );

    };


    $("actionOptions")
      .appendChild(button);

  }


  showScreen("actionScreen");

}


/* =========================================================
   ALIEN SABOTAGE
========================================================= */

function showAlienSabotageAction(
  player
) {

  setupActionScreen(

    "ALIEN SABOTAGE",

    "Choose one online ship system to sabotage."

  );


  createSystemActionButtons(

    getOnlineSystems(),

    () => {

      const system =
        game.selectedAction;


      game.actions[player.id] = {

        type: "sabotage",

        system: system,

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

      const system =
        game.selectedAction;


      game.actions[player.id] = {

        type: "sabotage",

        system: system,

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

    "Choose one living player. They cannot vote for two rounds."

  );


  const targets =
    getLivingPlayers()
      .filter(
        target =>
          target.id !== player.id
      );


  createPlayerActionButtons(

    targets,

    () => {

      const target =
        game.selectedAction;


      game.actions[player.id] = {

        type: "silence",

        target: target.id,

        actor: player.id

      };


      showPrivateResult(

        "🔇",

        "PLAYER SILENCED",

        `${target.name} cannot vote for two rounds.`

      );

    }

  );


  showScreen("actionScreen");

}


/* =========================================================
   ENGINEER
========================================================= */

function showEngineerAction(player) {

  const offline =
    getOfflineSystems();


  if (offline.length === 0) {

    game.actions[player.id] = {

      type: "none",

      actor: player.id

    };


    showPrivateResult(

      "🔧",

      "ALL SYSTEMS ONLINE",

      "There are no systems to repair."

    );

    return;

  }


  setupActionScreen(

    "REPAIR SYSTEM",

    "Choose one offline system to repair."

  );


  createSystemActionButtons(

    offline,

    () => {

      const system =
        game.selectedAction;


      game.actions[player.id] = {

        type: "repair",

        system: system,

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


  const targets =
    getLivingPlayers()
      .filter(
        target =>
          target.id !== player.id
      );


  createPlayerActionButtons(

    targets,

    () => {

      const target =
        game.selectedAction;


      game.actions[player.id] = {

        type: "investigate",

        target: target.id,

        actor: player.id

      };


      showPrivateResult(

        "🕵️",

        "INVESTIGATION READY",

        `You will receive information about ${target.name}.`

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

    "Choose one living player to protect from being killed."

  );


  createPlayerActionButtons(

    getLivingPlayers(),

    () => {

      const target =
        game.selectedAction;


      game.actions[player.id] = {

        type: "protect",

        target: target.id,

        actor: player.id

      };


      showPrivateResult(

        "🩺",

        "PROTECTION SELECTED",

        `${target.name} will be protected.`

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

    "Choose one living player whose ability will be blocked."

  );


  const targets =
    getLivingPlayers()
      .filter(
        target =>
          target.id !== player.id
      );


  createPlayerActionButtons(

    targets,

    () => {

      const target =
        game.selectedAction;


      game.actions[player.id] = {

        type: "block",

        target: target.id,

        actor: player.id

      };


      showPrivateResult(

        "🛡️",

        "PLAYER BLOCKED",

        `${target.name}'s ability will be blocked.`

      );

    }

  );


  showScreen("actionScreen");

}


/* =========================================================
   PRIVATE RESULT
========================================================= */

function showPrivateResult(
  icon,
  title,
  text
) {

  $("privateResultIcon")
    .textContent = icon;

  $("privateResultTitle")
    .textContent = title;

  $("privateResultText")
    .textContent = text;


  $("privateResultButton").onclick =
    () => {

      finishCurrentPlayerTurn();

    };


  showScreen(
    "privateResultScreen"
  );

}


/* =========================================================
   FINISH PLAYER TURN
========================================================= */

function finishCurrentPlayerTurn() {

  game.currentPlayerIndex++;


  if (
    game.currentPlayerIndex >=
    game.players.length
  ) {

    resolveActions();

    return;

  }


  startPlayerTurn();

}


/* =========================================================
   RESOLVE ACTIONS
========================================================= */

function resolveActions() {

  game.lastRoundResults = [];


  /*
    -------------------------
    GUARD
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      action &&
      action.type === "block"
    ) {

      game.blockedPlayers.add(
        action.target
      );

    }

  }


  /*
    -------------------------
    MEDIC
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      action &&
      action.type === "protect" &&
      !game.blockedPlayers.has(
        player.id
      )
    ) {

      game.protectedPlayers.add(
        action.target
      );

    }

  }


  /*
    -------------------------
    SABOTAGE
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      action &&
      action.type === "sabotage" &&
      !game.blockedPlayers.has(
        player.id
      )
    ) {

      if (
        game.systems[action.system]
      ) {

        game.systems[action.system] =
          false;


        game.lastRoundResults.push(

          `${SYSTEMS[action.system].name} went OFFLINE.`

        );

      }

    }

  }


  /*
    -------------------------
    ENGINEER
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      player.role === "engineer" &&
      action &&
      action.type === "repair"
    ) {

      /*
        Engineer can ALWAYS repair while
        Power is offline.

        If Power is online, Guard can block them.
      */

      const canRepair =
        !game.systems.power ||
        !game.blockedPlayers.has(
          player.id
        );


      if (canRepair) {

        game.systems[action.system] =
          true;


        game.lastRoundResults.push(

          `${SYSTEMS[action.system].name} was repaired.`

        );

      }

    }

  }


  /*
    -------------------------
    SILENCER
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      player.role === "silencer" &&
      action &&
      action.type === "silence" &&
      !game.blockedPlayers.has(
        player.id
      )
    ) {

      /*
        Current round + next round.
      */

      game.silencedUntil[
        action.target
      ] = game.round + 1;

    }

  }


  /*
    -------------------------
    ALIEN KILLS
    -------------------------
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      player.role === "alien" &&
      action &&
      action.type === "kill" &&
      !game.blockedPlayers.has(
        player.id
      )
    ) {

      const target =
        getPlayerById(
          action.target
        );


      if (
        !target ||
        !target.alive
      ) {
        continue;
      }


      if (
        game.protectedPlayers.has(
          target.id
        )
      ) {

        game.lastRoundResults.push(
          "A kill was prevented."
        );

      } else {

        target.alive = false;


        game.lastRoundResults.push(

          `${target.name} was eliminated.`

        );

      }

    }

  }


  /*
    -------------------------
    DETECTIVE
    -------------------------

    IMPORTANT:
    Detective checks PREVIOUS ROUND.
  */

  for (
    const player of getLivingPlayers()
  ) {

    const action =
      game.actions[player.id];


    if (
      player.role === "detective" &&
      action &&
      action.type === "investigate" &&
      !game.blockedPlayers.has(
        player.id
      )
    ) {

      const target =
        getPlayerById(
          action.target
        );


      if (!target) {
        continue;
      }


      const previous =
        game.previousActions[
          target.id
        ];


      let information =
        "did nothing";


      if (previous) {

        if (
          previous.type === "kill" ||
          previous.type === "protect" ||
          previous.type === "investigate" ||
          previous.type === "silence" ||
          previous.type === "block"
        ) {

          if (
            previous.target !== undefined
          ) {

            const targetPlayer =
              getPlayerById(
                previous.target
              );


            if (targetPlayer) {

              information =
                `interacted with ${targetPlayer.name}`;

            }

          }

        } else if (
          previous.type === "sabotage" ||
          previous.type === "repair"
        ) {

          information =
            `interacted with ${SYSTEMS[previous.system].name}`;

        } else if (
          previous.type === "none"
        ) {

          information =
            "did nothing";

        }

      }


      game.actions[
        player.id
      ].investigationResult =

        `${target.name} ${information}.`;

    }

  }


  /*
    Save current actions for the
    NEXT round's Detective.
  */

  game.previousActions =
    JSON.parse(
      JSON.stringify(
        game.actions
      )
    );


  /*
    Detective gets their private result.
  */

  const detective =
    getLivingPlayers().find(
      player =>
        player.role === "detective" &&
        game.actions[player.id] &&
        game.actions[player.id]
          .investigationResult
    );


  if (detective) {

    showDetectiveResult(
      detective
    );

    return;

  }


  continueAfterActions();

}


/* =========================================================
   DETECTIVE RESULT
========================================================= */

function showDetectiveResult(
  player
) {

  const result =
    game.actions[player.id]
      .investigationResult;


  $("privateResultIcon")
    .textContent = "🕵️";


  $("privateResultTitle")
    .textContent =
      "INVESTIGATION RESULT";


  $("privateResultText")
    .textContent =
      result;


  $("privateResultButton").onclick =
    () => {

      continueAfterActions();

    };


  showScreen(
    "privateResultScreen"
  );

}


/* =========================================================
   AFTER ACTIONS
========================================================= */

function continueAfterActions() {

  checkImmediateVictory();


  if (game.gameOver) {
    return;
  }


  showDiscussion();

}


/* =========================================================
   DISCUSSION
========================================================= */

function showDiscussion() {

  updateGameInfo();


  $("discussionRound")
    .textContent =
      `ROUND ${game.round}`;


  $("discussionStage")
    .textContent =
      `STAGE ${game.stage} / ${MAX_STAGES}`;


  if (
    game.lastRoundResults.length === 0
  ) {

    $("roundResults")
      .textContent =
        "No major events were detected.";

  } else {

    $("roundResults").innerHTML =

      game.lastRoundResults
        .map(
          result =>
            `<div>• ${result}</div>`
        )
        .join("");

  }


  $("discussionButton").onclick =
    () => {

      startVoting();

    };


  showScreen(
    "discussionScreen"
  );

}


/* =========================================================
   VOTING START
========================================================= */

function startVoting() {

  game.votes = {};

  game.currentVoteIndex = 0;

  startNextVote();

}


/* =========================================================
   NEXT VOTER
========================================================= */

function startNextVote() {

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


  const player =
    game.players[
      game.currentVoteIndex
    ];


  /*
    Silenced player cannot vote.
  */

  if (
    isSilenced(player.id)
  ) {

    $("votingPlayerTitle")
      .textContent =
        `${player.name}'S TURN`;


    $("votingInstructions")
      .textContent =
        "You are silenced and cannot vote this round.";


    $("voteOptions").innerHTML = "";


    const button =
      document.createElement("button");


    button.className =
      "secondary-button";


    button.textContent =
      "CONTINUE";


    button.onclick = () => {

      game.votes[player.id] =
        null;

      game.currentVoteIndex++;

      startNextVote();

    };


    $("voteOptions")
      .appendChild(button);


    updateVotingInfo();

    showScreen("votingScreen");

    return;

  }


  game.selectedVote = undefined;


  $("votingPlayerTitle")
    .textContent =
      `${player.name}'S TURN`;


  $("votingInstructions")
    .textContent =
      "Choose a player to eject or skip.";


  renderVoteOptions(player);


  updateVotingInfo();


  showScreen("votingScreen");

}


/* =========================================================
   VOTE OPTIONS
========================================================= */

function renderVoteOptions(
  voter
) {

  const container =
    $("voteOptions");


  container.innerHTML = "";


  const targets =
    getLivingPlayers()
      .filter(
        player =>
          player.id !== voter.id
      );


  targets.forEach(target => {

    const button =
      document.createElement("button");


    button.className =
      "vote-option";


    button.textContent =
      `🗳️ ${target.name}`;


    button.onclick = () => {

      document
        .querySelectorAll(
          ".vote-option"
        )
        .forEach(
          btn =>
            btn.classList.remove(
              "selected"
            )
        );


      button.classList.add(
        "selected"
      );


      game.selectedVote =
        target.id;


      $("submitVoteButton")
        .classList.remove("hidden");

    };


    container.appendChild(button);

  });


  /*
    Skip.
  */

  const skip =
    document.createElement("button");


  skip.className =
    "vote-option skip";


  skip.textContent =
    "⏭️ SKIP VOTE";


  skip.onclick = () => {

    document
      .querySelectorAll(
        ".vote-option"
      )
      .forEach(
        btn =>
          btn.classList.remove(
            "selected"
          )
      );


    skip.classList.add(
      "selected"
    );


    game.selectedVote = null;


    $("submitVoteButton")
      .classList.remove("hidden");

  };


  container.appendChild(skip);


  $("submitVoteButton").onclick =
    () => {

      /*
        Make sure they actually selected
        either a player or Skip.
      */

      if (
        game.selectedVote === undefined
      ) {
        return;
      }


      game.votes[voter.id] =
        game.selectedVote;


      $("submitVoteButton")
        .classList.add("hidden");


      game.currentVoteIndex++;


      startNextVote();

    };


  $("submitVoteButton")
    .classList.add("hidden");

}


/* =========================================================
   VOTING INFO
========================================================= */

function updateVotingInfo() {

  $("votingRound")
    .textContent =
      `ROUND ${game.round}`;


  $("votingStage")
    .textContent =
      `STAGE ${game.stage} / ${MAX_STAGES}`;

}


/* =========================================================
   RESOLVE VOTES
========================================================= */

function resolveVoting() {

  const counts = {};


  for (
    const voterId in game.votes
  ) {

    const targetId =
      game.votes[voterId];


    if (
      targetId === null ||
      targetId === undefined
    ) {
      continue;
    }


    counts[targetId] =
      (counts[targetId] || 0) + 1;

  }


  let highest = 0;

  let tied = [];


  for (
    const targetId in counts
  ) {

    const count =
      counts[targetId];


    if (count > highest) {

      highest = count;

      tied = [
        Number(targetId)
      ];

    } else if (
      count === highest
    ) {

      tied.push(
        Number(targetId)
      );

    }

  }


  /*
    Nobody received votes.
  */

  if (
    tied.length === 0
  ) {

    finishVoting(null);

    return;

  }


  /*
    One clear winner.
  */

  if (
    tied.length === 1
  ) {

    finishVoting(
      getPlayerById(tied[0])
    );

    return;

  }


  /*
    Tie.

    Captain decides if alive AND Power
    is online.
  */

  const captain =
    getLivingPlayers()
      .find(
        player =>
          player.role === "captain"
      );


  if (
    captain &&
    game.systems.power
  ) {

    showCaptainTieDecision(
      captain,
      tied
    );

    return;

  }


  /*
    No usable Captain.
    No ejection.
  */

  finishVoting(null);

}


/* =========================================================
   CAPTAIN TIE
========================================================= */

function showCaptainTieDecision(
  captain,
  tiedIds
) {

  $("votingPlayerTitle")
    .textContent =
      "CAPTAIN — TIE DECISION";


  $("votingInstructions")
    .textContent =
      "Choose which tied player will be ejected.";


  $("voteOptions").innerHTML = "";


  $("submitVoteButton")
    .classList.add("hidden");


  tiedIds.forEach(id => {

    const player =
      getPlayerById(id);


    const button =
      document.createElement("button");


    button.className =
      "vote-option";


    button.textContent =
      `⚖️ ${player.name}`;


    button.onclick = () => {

      finishVoting(player);

    };


    $("voteOptions")
      .appendChild(button);

  });


  showScreen("votingScreen");

}


/* =========================================================
   FINISH VOTING
========================================================= */

function finishVoting(
  ejected
) {

  if (ejected) {

    ejected.alive = false;


    $("voteResultText")
      .textContent =
        `${ejected.name} was ejected.`;

  } else {

    $("voteResultText")
      .textContent =
        "No player was ejected.";

  }


  $("voteResultButton").onclick =
    () => {

      afterVoting();

    };


  showScreen(
    "voteResultScreen"
  );

}


/* =========================================================
   AFTER VOTING
========================================================= */

function afterVoting() {

  checkImmediateVictory();


  if (game.gameOver) {
    return;
  }


  /*
    Earth lifeline every 3 rounds.
  */

  if (
    game.round % 3 === 0
  ) {

    if (
      game.systems.communications
    ) {

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


  $("lifelineMessage")
    .textContent =
      generateLifeline();


  $("lifelineButton").onclick =
    () => {

      continueRoundProgression();

    };


  showScreen(
    "lifelineScreen"
  );

}


/* =========================================================
   EARTH MESSAGES
========================================================= */

function generateLifeline() {

  const messages = [];


  /*
    One of these players is hostile.
  */

  if (
    getLivingHostiles().length > 0
  ) {

    messages.push(
      `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${getHostileClue()}`
    );

  }


  /*
    Alien.
  */

  if (
    game.players.some(
      player =>
        player.role === "alien"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: There is an Alien aboard."
    );

  }


  /*
    More than one Alien.
  */

  if (
    game.players.filter(
      player =>
        player.role === "alien"
    ).length > 1
  ) {

    messages.push(
      "🌎 EARTH SAYS: There is more than 1 Alien."
    );

  }


  /*
    Saboteur.
  */

  if (
    game.players.some(
      player =>
        player.role === "saboteur"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: There is a Saboteur."
    );

  }


  /*
    Silencer.
  */

  if (
    game.players.some(
      player =>
        player.role === "silencer"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: There is a Silencer."
    );

  }


  /*
    Engineer.
  */

  if (
    getLivingPlayers().some(
      player =>
        player.role === "engineer"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: The Engineer is still alive."
    );

  }


  /*
    Captain.
  */

  if (
    game.players.some(
      player =>
        player.role === "captain"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A Captain is aboard."
    );

  }


  /*
    Detective.
  */

  if (
    game.players.some(
      player =>
        player.role === "detective"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A Detective is aboard."
    );

  }


  /*
    Medic.
  */

  if (
    game.players.some(
      player =>
        player.role === "medic"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A Medic is aboard."
    );

  }


  /*
    Guard.
  */

  if (
    game.players.some(
      player =>
        player.role === "guard"
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A Guard is aboard."
    );

  }


  /*
    System messages.
  */

  if (
    game.lastRoundResults.some(
      result =>
        result.includes("OFFLINE")
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A system was sabotaged."
    );

  }


  if (
    game.lastRoundResults.some(
      result =>
        result.includes("repaired")
    )
  ) {

    messages.push(
      "🌎 EARTH SAYS: A system was repaired."
    );

  }


  if (
    messages.length === 0
  ) {

    return "🌎 EARTH SAYS: Stay alert. Something is wrong aboard the ship.";

  }


  return messages[
    Math.floor(
      Math.random() *
      messages.length
    )
  ];

}


/* =========================================================
   HOSTILE CLUE
========================================================= */

function getHostileClue() {

  const living =
    getLivingPlayers();


  const shuffled =
    [...living];


  shuffle(shuffled);


  const number =
    Math.min(
      3,
      Math.max(
        2,
        getLivingHostiles().length + 1
      )
    );


  let selected =
    shuffled.slice(
      0,
      number
    );


  /*
    Make sure at least one hostile is
    included.
  */

  if (
    !selected.some(
      player =>
        HOSTILE_ROLES.includes(
          player.role
        )
    )
  ) {

    const hostile =
      getLivingHostiles()[0];


    if (hostile) {
      selected[0] =
        hostile;
    }

  }


  return selected
    .map(
      player =>
        player.name
    )
    .join(", ");

}


/* =========================================================
   ROUND / STAGE PROGRESSION
========================================================= */

function continueRoundProgression() {

  /*
    Engines must be online to progress
    the stage.
  */

  if (
    game.systems.engines
  ) {

    game.stage++;


    if (
      game.stage > MAX_STAGES
    ) {

      humanWin(
        "The crew completed all 10 stages."
      );

      return;

    }

  }


  /*
    Round ALWAYS increases.
  */

  game.round++;


  cleanupSilences();


  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();


  updateGameInfo();


  showSystemsStatus();

}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function showSystemsStatus() {

  const container =
    $("systemsList");


  container.innerHTML = "";


  Object.keys(SYSTEMS)
    .forEach(key => {

      const system =
        document.createElement("div");


      system.className =
        "system";


      const online =
        game.systems[key];


      system.innerHTML = `

        <span class="system-name">
          ${SYSTEMS[key].name}
        </span>

        <span class="system-status ${
          online
            ? "online"
            : "offline"
        }">
          ${
            online
              ? "ONLINE"
              : "OFFLINE"
          }
        </span>

      `;


      container.appendChild(
        system
      );

    });


  $("systemsButton").onclick =
    () => {

      beginRound();

    };


  showScreen(
    "systemsScreen"
  );

}


/* =========================================================
   SILENCE
========================================================= */

function isSilenced(
  playerId
) {

  return (

    game.silencedUntil[playerId] !==
      undefined &&

    game.silencedUntil[playerId] >=
      game.round

  );

}


function cleanupSilences() {

  for (
    const playerId in
    game.silencedUntil
  ) {

    if (
      game.silencedUntil[playerId] <
      game.round
    ) {

      delete game.silencedUntil[
        playerId
      ];

    }

  }

}


/* =========================================================
   VICTORY
========================================================= */

function checkImmediateVictory() {

  const hostiles =
    getLivingHostiles();


  const humans =
    getLivingPlayers()
      .filter(
        player =>
          !HOSTILE_ROLES.includes(
            player.role
          )
      );


  /*
    All hostiles eliminated.
  */

  if (
    hostiles.length === 0
  ) {

    humanWin(
      "All hostile players have been eliminated."
    );

    return;

  }


  /*
    Hostiles >= humans.
  */

  if (
    hostiles.length >=
    humans.length
  ) {

    hostileWin(
      "The hostile players now equal or outnumber the humans."
    );

  }

}


/* =========================================================
   HUMAN WIN
========================================================= */

function humanWin(
  reason
) {

  game.gameOver = true;


  $("gameOverIcon")
    .textContent = "🏆";


  $("gameOverTitle")
    .textContent =
      "HUMANS WIN";


  $("gameOverText")
    .textContent =
      reason;


  showScreen(
    "gameOverScreen"
  );

}


/* =========================================================
   HOSTILE WIN
========================================================= */

function hostileWin(
  reason
) {

  game.gameOver = true;


  $("gameOverIcon")
    .textContent = "👽";


  $("gameOverTitle")
    .textContent =
      "HOSTILES WIN";


  $("gameOverText")
    .textContent =
      reason;


  showScreen(
    "gameOverScreen"
  );

}


/* =========================================================
   HELPERS
========================================================= */

function getLivingPlayers() {

  return game.players.filter(
    player =>
      player.alive
  );

}


function getLivingHostiles() {

  return getLivingPlayers()
    .filter(
      player =>
        HOSTILE_ROLES.includes(
          player.role
        )
    );

}


function getPlayerById(
  id
) {

  return game.players.find(
    player =>
      player.id === Number(id)
  );

}


function getOfflineSystems() {

  return Object.keys(SYSTEMS)
    .filter(
      key =>
        !game.systems[key]
    );

}


function getOnlineSystems() {

  return Object.keys(SYSTEMS)
    .filter(
      key =>
        game.systems[key]
    );

}


/* =========================================================
   GAME INFO
========================================================= */

function updateGameInfo() {

  $("roundDisplay")
    .textContent =
      `ROUND ${game.round}`;


  $("stageDisplay")
    .textContent =
      `STAGE ${game.stage} / ${MAX_STAGES}`;

}


/* =========================================================
   SHUFFLE
========================================================= */

function shuffle(
  array
) {

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


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
   EVENTS
========================================================= */

$("playerCount")
  .addEventListener(
    "change",
    createPlayerSetup
  );


$("randomRolesButton")
  .addEventListener(
    "click",
    randomiseRoles
  );


$("startGameButton")
  .addEventListener(
    "click",
    startGame
  );


$("restartButton")
  .addEventListener(
    "click",
    restartGame
  );


/* =========================================================
   INITIALISE
========================================================= */

createPlayerSetup();
