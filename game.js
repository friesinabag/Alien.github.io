"use strict";

/*
=========================================================
ALIEN
COMPLETE GAME.JS
LOCAL + ONLINE
=========================================================

IMPORTANT:
This file can load Supabase automatically.

Supabase project URL:
https://sovwkrauwyoskxrnajjn.supabase.co

Use ONLY the publishable key in browser code.
=========================================================
*/


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://sovwkrauwyoskxrnajjn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ck6DlHqxEFmoCex44rXbKw_HlAtPkaW";

let supabaseClient = null;
let supabaseReady = false;

function loadSupabase() {
  return new Promise((resolve) => {
    if (window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );
        supabaseReady = true;
        resolve(true);
        return;
      } catch (err) {
        console.error(err);
        resolve(false);
        return;
      }
    }

    const existing = document.querySelector(
      'script[src*="supabase-js"]'
    );

    if (existing) {
      existing.addEventListener("load", () => {
        try {
          supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );
          supabaseReady = true;
          resolve(true);
        } catch {
          resolve(false);
        }
      });

      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => {
      try {
        supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );
        supabaseReady = true;
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
}


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const alive = (p) => !!p && p.alive;

const rand = (arr) =>
  arr.length
    ? arr[Math.floor(Math.random() * arr.length)]
    : null;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

function safeId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 30);
}

function button(text, value, cls = "choice-button") {
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
   ROLES
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
      "Silence 1 living player for 2 rounds. They may still discuss and use their ability, but cannot vote."
  },

  parasite: {
    icon: "🦠",
    name: "Parasite",
    team: "Hostile",
    desc:
      "Infect 1 player once. The infection eventually becomes Diseased and then Parasite."
  },

  engineer: {
    icon: "🔧",
    name: "Engineer",
    team: "Human",
    desc:
      "Repair 1 offline ship system each round. You can act even while Power is offline."
  },

  scientist: {
    icon: "🧪",
    name: "Scientist",
    team: "Human",
    desc:
      "Check a player to see their infection status. You can cure an Infected or Diseased player."
  },

  detective: {
    icon: "🕵️",
    name: "Detective",
    team: "Human",
    desc:
      "Investigate a player and learn what they interacted with during the previous round."
  },

  medic: {
    icon: "🩺",
    name: "Medic",
    team: "Human",
    desc:
      "Protect 1 living player from being killed this round."
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
      "Choose to receive a private message from Earth each round while Communications is online."
  },

  judge: {
    icon: "⚖️",
    name: "Judge",
    team: "Human",
    desc:
      "Once per game, cancel any vote that would eject a player."
  },

  jester: {
    icon: "🃏",
    name: "Jester",
    team: "Neutral",
    desc:
      "If you are normally voted out, you immediately win."
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
      "Once per game, swap the displayed identities of two living players. The swap lasts through voting."
  },

  infected: {
    icon: "🦠",
    name: "Infected",
    team: "Human",
    sub: true,
    desc:
      "A hidden infection stage. The infected player does not know they are infected."
  },

  diseased: {
    icon: "☣️",
    name: "Diseased",
    team: "Hostile",
    sub: true,
    desc:
      "You know you are Diseased and on the Hostile Team. You cannot use an ability."
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

const ALL_STARTING_ROLES = [
  ...HOSTILES,
  ...HUMANS,
  ...NEUTRALS,
  ...CONCEPTS
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
    ALL_STARTING_ROLES.map((r) => [
      r,
      r !== "trickster"
    ])
  ),

  counts: Object.fromEntries(
    ALL_STARTING_ROLES.map((r) => [r, 0])
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

  roundStartAliveIds: [],

  abilityQueue: [],
  abilityIndex: 0,

  reactionQueue: [],
  reactionIndex: 0,

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

  judgeUsed: false,
  tricksterUsed: false,

  displaySwap: null,

  voteResolutionDone: false,

  systems: {
    engines: true,
    o2: true,
    communications: true,
    power: true
  }
};


/* =========================================================
   ONLINE STATE
   ========================================================= */

let online = {

  mode: "local",

  roomCode: null,

  host: false,

  myConnectionId: null,

  myPlayerId: null,

  channel: null,

  privateChannel: null,

  connections: {},

  connected: false,

  started: false,

  hostReady: false,

  pendingAction: null,

  pendingVote: null
};


/* =========================================================
   TEAM HELPERS
   ========================================================= */

function teamClass(team) {
  if (team === "Human") return "human";
  if (team === "Hostile") return "hostile";
  if (team === "Neutral") return "neutral";
  return "infection";
}

function roleTeam(roleOrPlayer) {
  const role =
    typeof roleOrPlayer === "string"
      ? roleOrPlayer
      : roleOrPlayer?.role;

  if (role === "infected") return "Human";
  if (role === "diseased") return "Hostile";

  return ROLE_DATA[role]?.team || "Human";
}

function isHostile(p) {
  return alive(p) && roleTeam(p) === "Hostile";
}

function isNeutral(p) {
  return alive(p) && roleTeam(p) === "Neutral";
}

function isHuman(p) {
  return alive(p) && roleTeam(p) === "Human";
}

function getPlayer(id) {
  return game.players.find((p) => p.id === id);
}

function living() {
  return game.players.filter(alive);
}

function activeRole(p) {
  return ROLE_DATA[p?.role];
}


/* =========================================================
   DISPLAY IDENTITY
   ========================================================= */

function realName(id) {
  return getPlayer(id)?.name || "";
}

function displayMap() {
  const map = Object.fromEntries(
    living().map((p) => [p.id, p.id])
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


/* =========================================================
   ACTION RULES
   ========================================================= */

function canAct(p) {

  if (!alive(p)) return false;

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

  if (p.role === "trickster" && game.tricksterUsed) {
    return false;
  }

  return true;
}

function targetOptions(actor = null, excludeId = null) {

  return living()
    .filter((p) => {

      if (p.id === excludeId) {
        return false;
      }

      /*
      Hostiles normally cannot target known Hostiles.

      Trickster swaps displayed identities, so the displayed
      identity can cause a hostile to accidentally target
      another hostile.
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
    .map((p) => ({
      id: p.id,
      label: displayName(p.id)
    }));
}


/* =========================================================
   TRANSIENT STATE
   ========================================================= */

function resetTransient() {

  game.actions = {};

  game.blockedPlayers = new Set();

  game.protectedPlayers = new Set();

  game.selectedAction = null;

  game.selectedVote = null;

  game.reactionInfo = {};

  game.lastRoundResults = [];
}


/* =========================================================
   SCREEN
   ========================================================= */

function setScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach((screen) =>
      screen.classList.remove("active")
    );

  const screen = $(id);

  if (screen) {
    screen.classList.add("active");
  }

  window.scrollTo(0, 0);
}


/* =========================================================
   SETUP
   ========================================================= */

function showSetup() {

  online.mode = "local";

  setScreen("setupScreen");

  renderSetup();
}

function createPlayers(count) {

  game.players = Array.from(
    { length: count },
    (_, i) => ({
      id: `p${i + 1}`,

      name: `Player ${i + 1}`,

      role: "survivor",

      originalRole: "survivor",

      alive: true,

      infectionRound: null,

      hasInfected: false
    })
  );

  game.randomisedRoles = false;

  game.randomRoles = {};
}

function renderSetup() {

  const container = $("playersSetup");

  if (!container) return;

  if (!game.players.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = game.players
    .map((p, i) => {

      const hidden =
        game.randomisedRoles &&
        game.randomRoles[i];

      return `
        <div class="setup-player">

          <label>
            PLAYER ${i + 1}

            <input
              class="player-name-input"
              type="text"
              maxlength="20"
              value="${esc(p.name || `Player ${i + 1}`)}"
              data-name-index="${i}"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false"
              placeholder="Player ${i + 1}"
            >
          </label>

          <label>
            ROLE

            <select
              class="role-select ${hidden ? "random-hidden" : ""}"
              data-index="${i}"
            >

              <option value="random">
                🎲 RANDOM
              </option>

              ${ALL_STARTING_ROLES
                .filter(
                  (r) =>
                    settings.enabled[r] ||
                    r === "engineer"
                )
                .map(
                  (r) => `
                    <option value="${r}">
                      ${ROLE_DATA[r].icon}
                      ${ROLE_DATA[r].name}
                    </option>
                  `
                )
                .join("")}

            </select>

          </label>

        </div>
      `;
    })
    .join("");

  /*
  Keep dropdowns visually RANDOM even when an actual
  hidden role has already been assigned.
  */
  document
    .querySelectorAll(".role-select")
    .forEach((select) => {

      const index = Number(select.dataset.index);

      if (
        game.randomisedRoles &&
        game.randomRoles[index]
      ) {
        select.value = "random";
        select.classList.add("random-hidden");
      }
    });

  bindSetupNames();

  bindSetupSelects();

  updatePlayerValidity();
}

function bindSetupNames() {

  document
    .querySelectorAll(".player-name-input")
    .forEach((input) => {

      const save = () => {

        const index = Number(
          input.dataset.nameIndex
        );

        if (!game.players[index]) {
          return;
        }

        const value =
          input.value.trim();

        game.players[index].name =
          value ||
          `Player ${index + 1}`;
      };

      input.addEventListener("input", save);

      input.addEventListener("blur", save);
    });
}

function bindSetupSelects() {

  document
    .querySelectorAll(".role-select")
    .forEach((select) => {

      select.addEventListener(
        "change",
        () => {

          const index =
            Number(select.dataset.index);

          const value = select.value;

          if (value === "random") {

            delete game.randomRoles[index];

            game.randomisedRoles =
              Object.keys(game.randomRoles).length > 0;

            select.classList.remove(
              "random-hidden"
            );

            return;
          }

          game.randomRoles[index] = value;

          game.randomisedRoles = true;

          /*
          Important:
          The visible dropdown returns to RANDOM,
          but the selected role is saved internally.
          */
          select.value = "random";

          select.classList.add(
            "random-hidden"
          );
        }
      );
    });
}

function resetSetupPlayers() {

  const count =
    Number($("playerCount")?.value || 8);

  createPlayers(count);

  renderSetup();
}

function updatePlayerValidity() {

  const validity =
    $("playerValidity");

  if (!validity) return;

  const count =
    game.players.length;

  const assigned =
    Object.keys(game.randomRoles).length;

  validity.textContent =
    `PLAYERS: ${count}  •  ${
      assigned === count
        ? "ROLES READY"
        : assigned
          ? `${assigned} / ${count} ROLES SELECTED`
          : "RANDOM ROLES"
    }`;
}


/* =========================================================
   RANDOM ROLES
   ========================================================= */

function weightedPick(items, weights) {

  const total =
    items.reduce(
      (sum, key) =>
        sum + (weights[key] || 0),
      0
    );

  if (!items.length || total <= 0) {
    return items[0] || null;
  }

  let random =
    Math.random() * total;

  for (const key of items) {

    random -=
      weights[key] || 0;

    if (random <= 0) {
      return key;
    }
  }

  return items[items.length - 1];
}

function randomiseRoles() {

  const count =
    game.players.length;

  const hostileCount =
    HOSTILE_COUNTS[count];

  if (!hostileCount) {
    alert(
      "Choose between 4 and 12 players."
    );
    return;
  }

  const enabledHostiles =
    HOSTILES.filter(
      (r) => settings.enabled[r]
    );

  if (
    enabledHostiles.length <
    hostileCount
  ) {
    alert(
      "Enable enough Hostile roles for this player count."
    );
    return;
  }

  const enabledHumans =
    HUMANS.filter(
      (r) =>
        settings.enabled[r] ||
        r === "engineer"
    );

  const requiredHumans =
    count - hostileCount;

  if (
    enabledHumans.length <
    requiredHumans
  ) {
    alert(
      "Enable enough Human roles for this player count."
    );
    return;
  }

  const roles = [];

  /*
  Hostiles:
  no duplicates.
  */
  const hostiles =
    shuffle(enabledHostiles)
      .slice(0, hostileCount);

  roles.push(...hostiles);

  /*
  Engineer:
  always exactly one.
  */
  roles.push("engineer");

  /*
  Remaining Human roles.
  */
  let humanPool =
    enabledHumans.filter(
      (r) => r !== "engineer"
    );

  const humansNeeded =
    count -
    hostileCount -
    1;

  if (
    humanPool.length <
    humansNeeded
  ) {
    alert(
      "Not enough enabled Human roles."
    );
    return;
  }

  for (
    let i = 0;
    i < humansNeeded;
    i++
  ) {

    const picked =
      weightedPick(
        humanPool,
        HUMAN_WEIGHTS
      );

    roles.push(picked);

    humanPool =
      humanPool.filter(
        (r) => r !== picked
      );
  }

  /*
  Neutrals fill remaining slots.

  By default both are enabled.
  Trickster is disabled by default.
  */
  const remaining =
    count - roles.length;

  if (remaining > 0) {

    const neutralPool =
      [...NEUTRALS, ...CONCEPTS]
        .filter(
          (r) => settings.enabled[r]
        );

    if (
      neutralPool.length <
      remaining
    ) {
      alert(
        "Enable enough Neutral roles, or use normal random roles."
      );
      return;
    }

    roles.push(
      ...shuffle(neutralPool)
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
   START GAME
   ========================================================= */

function getSelectedRoles() {

  const count =
    game.players.length;

  const roles =
    Array.from(
      { length: count },
      (_, i) =>
        game.randomRoles[i] ||
        null
    );

  return roles;
}

function validateRoles(roles) {

  const count =
    game.players.length;

  const hostileCount =
    HOSTILE_COUNTS[count];

  if (!hostileCount) {
    return "Player count must be between 4 and 12.";
  }

  if (
    roles.length !== count ||
    roles.some((r) => !r)
  ) {
    return "Choose a role for every player or press RANDOMISE ROLES.";
  }

  if (
    roles.some(
      (r) =>
        !ROLE_DATA[r] ||
        ROLE_DATA[r].sub
    )
  ) {
    return "Invalid starting role.";
  }

  const roleCounts = {};

  roles.forEach((role) => {
    roleCounts[role] =
      (roleCounts[role] || 0) + 1;
  });

  if (
    roleCounts.engineer !== 1
  ) {
    return "There must be exactly 1 Engineer.";
  }

  const actualHostiles =
    HOSTILES.reduce(
      (sum, role) =>
        sum + (roleCounts[role] || 0),
      0
    );

  if (
    actualHostiles !== hostileCount
  ) {
    return (
      `This setup needs exactly ` +
      `${hostileCount} Hostile role(s).`
    );
  }

  for (const role of roles) {

    if (
      !settings.enabled[role] &&
      role !== "engineer"
    ) {
      return `${ROLE_DATA[role].name} is disabled.`;
    }
  }

  for (const role of roles) {

    if (
      roleCounts[role] > 1
    ) {
      return (
        `${ROLE_DATA[role].name} ` +
        `cannot be used more than once.`
      );
    }
  }

  return null;
}

function startGame() {

  /*
  Make sure current name inputs are saved.
  */
  document
    .querySelectorAll(".player-name-input")
    .forEach((input) => {

      const index =
        Number(input.dataset.nameIndex);

      if (game.players[index]) {

        game.players[index].name =
          input.value.trim() ||
          `Player ${index + 1}`;
      }
    });

  /*
  If every player has a manual role saved,
  use them.

  Otherwise randomise the missing ones.
  */
  let roles =
    getSelectedRoles();

  if (
    roles.some((r) => !r)
  ) {

    randomiseRoles();

    roles =
      getSelectedRoles();
  }

  const error =
    validateRoles(roles);

  if (error) {
    alert(error);
    return;
  }

  game.players.forEach(
    (p, index) => {

      p.role = roles[index];

      p.originalRole =
        roles[index];

      p.alive = true;

      p.infectionRound = null;

      p.hasInfected = false;
    }
  );

  game.round = 1;

  game.stage = 1;

  game.gameOver = false;

  game.lifelineNumber = 0;

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

  online.started = true;

  startRound();
}


/* =========================================================
   ROUND
   ========================================================= */

function startRound() {

  if (checkVictory()) {
    return;
  }

  /*
  IMPORTANT:
  Save previous actions BEFORE clearing current actions.
  This fixes Detective.
  */
  game.previousActions =
    { ...game.actions };

  resetTransient();

  game.roundStartAliveIds =
    living().map(
      (p) => p.id
    );

  game.abilityQueue =
    [...game.roundStartAliveIds];

  game.abilityIndex = 0;

  game.reactionQueue = [];

  game.reactionIndex = 0;

  game.actions = {};

  passToAbility();
}


/* =========================================================
   ABILITY PASS
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
    `ROUND ${game.round} • STAGE ${game.stage} / 10`;

  $("passSubtext").textContent =
    "PASS THE PHONE TO THIS PLAYER";

  setScreen("passScreen");

  if (
    online.mode === "online" &&
    online.host
  ) {
    onlineBroadcastPublic({
      type: "private_turn",
      playerId: player.id
    });
  }
}


/* =========================================================
   ROLE SCREEN
   ========================================================= */

function showRole() {

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

  $("rolePlayerName").textContent =
    player.name;

  $("roleIcon").textContent =
    ROLE_DATA[player.role]?.icon ||
    "❓";

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

  $("hostileList").innerHTML =
    "";

  if (team === "Hostile") {

    const allies =
      living().filter(
        (p) =>
          p.id !== player.id &&
          isHostile(p)
      );

    $("hostileList").innerHTML =
      allies.length
        ? `
          <div class="ally-box">
            <strong>HOSTILE ALLIES</strong>
            <br>
            ${allies
              .map(
                (p) =>
                  `${ROLE_DATA[p.role].icon} ${esc(p.name)}`
              )
              .join("<br>")}
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
   ACTION SCREEN
   ========================================================= */

function showAction() {

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

  $("actionTitle").textContent =
    `${ROLE_DATA[player.role]?.icon || ""} ` +
    `${ROLE_DATA[player.role]?.name || ""}`;

  $("actionDescription").textContent =
    "";

  $("actionOptions").innerHTML =
    "";

  $("confirmActionButton").textContent =
    "CONFIRM";

  game.selectedAction = null;

  if (!canAct(player)) {

    if (
      player.role === "infected"
    ) {
      $("actionDescription").textContent =
        "You have no ability this round.";
    } else if (
      player.role === "diseased"
    ) {
      $("actionDescription").textContent =
        "You are Diseased. You cannot use an ability.";
    } else if (
      !game.systems.power &&
      player.role !== "engineer"
    ) {
      $("actionDescription").textContent =
        "⚡ POWER IS OFFLINE. Your ability is disabled.";
    } else if (
      game.blockedPlayers.has(player.id)
    ) {
      $("actionDescription").textContent =
        "🛡️ Your ability was blocked this round.";
    } else {
      $("actionDescription").textContent =
        "Your ability cannot be used this round.";
    }

    game.selectedAction = "none";

    $("confirmActionButton").onclick =
      completeAbility;

    setScreen("actionScreen");

    return;
  }


  /* =======================================================
     ALIEN
     ======================================================= */

  if (player.role === "alien") {

    const livingSaboteur =
      living().some(
        (p) =>
          p.role === "saboteur"
      );

    $("actionDescription").textContent =
      livingSaboteur
        ? "A living Saboteur exists, so you can only kill."
        : "Choose Kill or Sabotage.";

    $("actionOptions").innerHTML =
      `
        ${button(
          "☠️ KILL",
          "kill"
        )}

        ${
          livingSaboteur
            ? ""
            : button(
                "💥 SABOTAGE",
                "sabotage"
              )
        }
      `;

    $("actionOptions")
      .querySelectorAll("button")
      .forEach((btn) => {

        btn.onclick = () => {

          game.selectedAction =
            btn.dataset.value;

          if (
            btn.dataset.value ===
            "kill"
          ) {
            renderTargetChoices(
              player,
              null,
              "kill"
            );
          } else {
            renderSystemChoices();
          }
        };
      });

  }


  /* =======================================================
     SABOTEUR
     ======================================================= */

  else if (
    player.role === "saboteur"
  ) {

    renderSystemChoices();
  }


  /* =======================================================
     SILENCER
     ======================================================= */

  else if (
    player.role === "silencer"
  ) {

    renderTargetChoices(
      player,
      null,
      "silence"
    );
  }


  /* =======================================================
     PARASITE
     ======================================================= */

  else if (
    player.role === "parasite"
  ) {

    if (player.hasInfected) {

      $("actionDescription").textContent =
        "You already used your infection.";

      game.selectedAction =
        "none";

    } else {

      renderTargetChoices(
        player,
        null,
        "infect"
      );
    }
  }


  /* =======================================================
     ENGINEER
     ======================================================= */

  else if (
    player.role === "engineer"
  ) {

    renderSystemChoices(true);
  }


  /* =======================================================
     SCIENTIST
     ======================================================= */

  else if (
    player.role === "scientist"
  ) {

    renderScientistChoices(
      player
    );
  }


  /* =======================================================
     DETECTIVE
     ======================================================= */

  else if (
    player.role === "detective"
  ) {

    renderTargetChoices(
      player,
      null,
      "detect"
    );
  }


  /* =======================================================
     MEDIC
     ======================================================= */

  else if (
    player.role === "medic"
  ) {

    renderTargetChoices(
      player,
      null,
      "protect"
    );
  }


  /* =======================================================
     GUARD
     ======================================================= */

  else if (
    player.role === "guard"
  ) {

    renderTargetChoices(
      player,
      null,
      "block"
    );
  }


  /* =======================================================
     RADIO
     ======================================================= */

  else if (
    player.role === "radio"
  ) {

    if (!game.systems.communications) {

      $("actionDescription").textContent =
        "📡 COMMUNICATIONS IS OFFLINE.";

      game.selectedAction =
        "none";

    } else {

      $("actionDescription").textContent =
        "Receive a private message from Earth.";

      game.selectedAction =
        "radio";

      $("actionOptions").innerHTML =
        button(
          "📻 RECEIVE EARTH MESSAGE",
          "radio"
        );

      $("actionOptions")
        .querySelector("button")
        .onclick = () => {

          game.selectedAction =
            "radio";
        };
    }
  }


  /* =======================================================
     CAPTAIN
     ======================================================= */

  else if (
    player.role === "captain"
  ) {

    $("actionDescription").textContent =
      "Your ability is automatic if the vote ties.";

    game.selectedAction =
      "none";
  }


  /* =======================================================
     JUDGE
     ======================================================= */

  else if (
    player.role === "judge"
  ) {

    $("actionDescription").textContent =
      "Your Judge ability can cancel a vote ejection once per game.";

    game.selectedAction =
      "none";
  }


  /* =======================================================
     TRICKSTER
     ======================================================= */

  else if (
    player.role === "trickster"
  ) {

    if (game.tricksterUsed) {

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction =
        "none";

    } else {

      renderSwapChoices(
        player
      );
    }
  }


  /* =======================================================
     NO ABILITY
     ======================================================= */

  else {

    $("actionDescription").textContent =
      "No ability.";

    game.selectedAction =
      "none";
  }

  $("confirmActionButton").onclick =
    completeAbility;

  setScreen("actionScreen");
}


/* =========================================================
   TARGET CHOICES
   ========================================================= */

function renderTargetChoices(
  player,
  unused,
  action
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
    descriptions[action] ||
    "Choose a player.";

  const options =
    targetOptions(player);

  $("actionOptions").innerHTML =
    options
      .map(
        (o) =>
          button(
            esc(o.label),
            o.id
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach((btn) => {

      btn.onclick = () => {

        game.selectedAction =
          JSON.stringify({
            type: action,
            target:
              btn.dataset.value
          });

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(
            (b) =>
              b.classList.remove(
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
      ? Object.keys(game.systems)
          .filter(
            (key) =>
              !game.systems[key]
          )
      : Object.keys(
          game.systems
        );

  if (!systems.length) {

    $("actionDescription").textContent =
      engineer
        ? "All systems are already online."
        : "No systems are available.";

    game.selectedAction =
      "none";

    $("actionOptions").innerHTML =
      "";

    return;
  }

  $("actionDescription").textContent =
    engineer
      ? "Choose an offline system to repair."
      : "Choose a ship system to sabotage.";

  $("actionOptions").innerHTML =
    systems
      .map(
        (key) =>
          button(
            `${
              game.systems[key]
                ? "🟢"
                : "🔴"
            } ${key.toUpperCase()}`,
            key
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach((btn) => {

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
            (b) =>
              b.classList.remove(
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
   SCIENTIST
   ========================================================= */

function renderScientistChoices(
  player
) {

  $("actionDescription").textContent =
    "Choose a living player to check.";

  $("actionOptions").innerHTML =
    targetOptions(player)
      .map(
        (o) =>
          button(
            esc(o.label),
            o.id
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach((btn) => {

      btn.onclick = () => {

        const target =
          getPlayer(
            btn.dataset.value
          );

        if (!target) return;

        $("actionDescription").textContent =
          `Scientist target: ${target.name}`;

        $("actionOptions").innerHTML =
          `
            ${button(
              "🔬 CHECK",
              "check"
            )}

            ${
              target.role ===
                "infected" ||
              target.role ===
                "diseased"
                ? button(
                    "💉 CURE",
                    "cure"
                  )
                : ""
            }
          `;

        $("actionOptions")
          .querySelectorAll("button")
          .forEach((choice) => {

            choice.onclick = () => {

              game.selectedAction =
                JSON.stringify({
                  type: "science",
                  target:
                    target.id,
                  mode:
                    choice.dataset.value
                });

              $("actionOptions")
                .querySelectorAll(
                  "button"
                )
                .forEach(
                  (b) =>
                    b.classList.remove(
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
   TRICKSTER
   ========================================================= */

function renderSwapChoices() {

  $("actionDescription").textContent =
    "Choose TWO living players whose displayed identities will be swapped through voting.";

  const chosen = [];

  $("actionOptions").innerHTML =
    living()
      .map(
        (p) =>
          button(
            esc(displayName(p.id)),
            p.id
          )
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach((btn) => {

      btn.onclick = () => {

        const id =
          btn.dataset.value;

        if (
          chosen.includes(id)
        ) {

          chosen.splice(
            chosen.indexOf(id),
            1
          );

          btn.classList.remove(
            "selected"
          );

        } else if (
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
   COMPLETE ABILITY
   ========================================================= */

function completeAbility() {

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

  if (!alive(player)) {
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

  if (
    action &&
    typeof action === "object"
  ) {

    if (
      online.mode === "online" &&
      !online.host
    ) {

      onlineSendPrivate({
        type: "ability_action",
        playerId: player.id,
        action
      });

      $("actionDescription").textContent =
        "ACTION SENT TO HOST";

      $("confirmActionButton").disabled =
        true;

      return;
    }

    game.actions[player.id] =
      action;

    applyImmediateAction(
      player,
      action
    );

  } else if (
    action === "radio" &&
    game.systems.communications
  ) {

    const radioAction = {
      type: "radio",
      message:
        randomRadioMessage()
    };

    game.actions[player.id] =
      radioAction;

    game.reactionInfo[player.id] =
      radioAction.message;

  } else {

    game.actions[player.id] = {
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
   APPLY ACTION
   ========================================================= */

function applyImmediateAction(
  player,
  action
) {

  if (!action) return;

  /*
  REPAIR
  */
  if (
    action.type === "repair"
  ) {

    if (
      player.role === "engineer" &&
      !game.systems[action.system]
    ) {

      game.systems[action.system] =
        true;
    }
  }


  /*
  SABOTAGE
  */
  if (
    action.type === "sabotage"
  ) {

    const valid =
      player.role === "saboteur" ||
      (
        player.role === "alien" &&
        !living().some(
          (p) =>
            p.role === "saboteur"
        )
      );

    if (
      valid &&
      game.systems[action.system]
    ) {

      game.systems[action.system] =
        false;
    }
  }


  /*
  PROTECT
  */
  if (
    action.type === "protect"
  ) {

    const target =
      getPlayer(action.target);

    if (
      target &&
      alive(target)
    ) {

      game.protectedPlayers.add(
        target.id
      );
    }
  }


  /*
  BLOCK
  */
  if (
    action.type === "block"
  ) {

    const target =
      getPlayer(action.target);

    if (
      target &&
      alive(target)
    ) {

      game.blockedPlayers.add(
        target.id
      );
    }
  }


  /*
  SILENCE
  */
  if (
    action.type === "silence"
  ) {

    const target =
      getPlayer(action.target);

    if (
      target &&
      alive(target)
    ) {

      game.silencedUntil[target.id] =
        Math.max(
          game.silencedUntil[target.id] ||
            0,
          game.round + 2
        );
    }
  }


  /*
  TRICKSTER
  */
  if (
    action.type === "swap"
  ) {

    const a =
      getPlayer(action.a);

    const b =
      getPlayer(action.b);

    if (
      a &&
      b &&
      alive(a) &&
      alive(b) &&
      a.id !== b.id
    ) {

      game.displaySwap = [
        a.id,
        b.id
      ];

      game.tricksterUsed = true;
    }
  }


  /*
  INFECTION

  IMPORTANT:
  There is NO message telling the target
  they were infected.
  */
  if (
    action.type === "infect"
  ) {

    if (
      player.role !== "parasite" ||
      player.hasInfected
    ) {
      return;
    }

    const target =
      getPlayer(action.target);

    if (
      !target ||
      !alive(target)
    ) {
      return;
    }

    if (
      target.id === player.id
    ) {
      return;
    }

    if (
      game.blockedPlayers.has(
        player.id
      )
    ) {
      return;
    }

    if (
      target.infectionRound
    ) {
      return;
    }

    if (
      isHostile(target)
    ) {
      return;
    }

    player.hasInfected = true;

    target.infectionRound =
      game.round;

    target.originalRole =
      target.role;

    target.role =
      "infected";

    target.hasInfected =
      false;

    /*
    DO NOT reveal infection.
    */
  }


  /*
  SCIENTIST
  */
  if (
    action.type === "science"
  ) {

    const target =
      getPlayer(action.target);

    if (
      !target ||
      !alive(target)
    ) {
      return;
    }

    if (
      action.mode === "check"
    ) {

      let status =
        "Healthy";

      if (
        target.role ===
        "infected"
      ) {
        status = "Infected";
      }

      if (
        target.role ===
        "diseased"
      ) {
        status = "Diseased";
      }

      if (
        target.role ===
        "parasite"
      ) {
        status = "Parasite";
      }

      game.reactionInfo[player.id] =
        `SCIENCE: ${target.name} is ${status}.`;
    }

    if (
      action.mode === "cure"
    ) {

      if (
        target.role === "infected" ||
        target.role === "diseased"
      ) {

        target.role =
          "survivor";

        target.originalRole =
          "survivor";

        target.infectionRound =
          null;

        target.hasInfected =
          false;

        game.reactionInfo[player.id] =
          `SCIENCE: ${target.name} was cured and is now a Survivor.`;
      } else {

        game.reactionInfo[player.id] =
          `SCIENCE: ${target.name} cannot be cured.`;
      }
    }
  }


  /*
  DETECTIVE
  */
  if (
    action.type === "detect"
  ) {

    const target =
      getPlayer(action.target);

    if (target) {

      const previous =
        game.previousActions[
          target.id
        ];

      game.reactionInfo[player.id] =
        detectiveMessage(
          target,
          previous
        );
    }
  }


  /*
  RADIO
  */
  if (
    action.type === "radio"
  ) {

    game.reactionInfo[player.id] =
      action.message;
  }
}


/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

  /*
  KILLS happen after all protection/blocking
  has been determined.
  */

  const killActions =
    Object.entries(
      game.actions
    ).filter(
      ([, action]) =>
        action?.type === "kill"
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


  /*
  INFECTION PROGRESSION

  Infection round:
  Round X = hidden Infected

  Round X+1 = Diseased

  Round X+2 = Parasite
  */

  for (
    const player of game.players
  ) {

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

      player.role =
        "diseased";

      game.reactionInfo[player.id] =
        "You became DISEASED. You are on the HOSTILE TEAM.";
    }

    else if (
      age >= 3 &&
      player.role === "diseased"
    ) {

      player.role =
        "parasite";

      player.hasInfected =
        false;

      game.reactionInfo[player.id] =
        "You became a PARASITE. You are on the HOSTILE TEAM.";
    }
  }

  /*
  If there is no Saboteur and the Alien chose
  sabotage, it has already been applied.
  */

  showReactions();
}


/* =========================================================
   DETECTIVE
   ========================================================= */

function detectiveMessage(
  target,
  action
) {

  if (
    !action ||
    action.type === "none"
  ) {

    return (
      `${target.name} had no interaction last round.`
    );
  }

  if (
    action.type === "radio"
  ) {

    return (
      `${target.name} interacted with Communications.`
    );
  }

  if (
    action.target
  ) {

    return (
      `${target.name} interacted with ` +
      `${displayName(action.target)}.`
    );
  }

  if (
    action.system
  ) {

    return (
      `${target.name} interacted with ` +
      `${action.system.toUpperCase()}.`
    );
  }

  if (
    action.type === "swap"
  ) {

    return (
      `${target.name} interacted with ` +
      `${displayName(action.a)} and ` +
      `${displayName(action.b)}.`
    );
  }

  return (
    `${target.name} had an interaction last round.`
  );
}


/* =========================================================
   RADIO
   ========================================================= */

function randomRadioMessage() {

  const hostiles =
    living().filter(
      isHostile
    ).length;

  const messages = [

    `EARTH: There are exactly ${hostiles} hostiles remaining.`,

    "EARTH: A ship system was recently tampered with.",

    "EARTH: Communications is still operational.",

    "EARTH: Stay alert. Hostile activity has been detected.",

    "EARTH: We cannot identify a hostile player from this transmission."
  ];

  return rand(messages);
}


/* =========================================================
   REACTION
   ========================================================= */

function showReactions() {

  /*
  Everyone alive at START of the round gets
  a reaction, even if they died during the round.
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

  $("reactionReadyButton").textContent =
    "SHOW MY RESULT";

  setScreen(
    "reactionScreen"
  );
}

function showReactionResult() {

  const player =
    getPlayer(
      game.reactionQueue[
        game.reactionIndex
      ]
    );

  if (!player) {
    advanceReaction();
    return;
  }

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

      const remaining =
        game.silencedUntil[player.id] -
        game.round;

      message =
        `You have been silenced for ${remaining} more round(s). You cannot vote.`;

    } else {

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
        ([key, value]) =>
          `${value ? "🟢" : "🔴"} ${key.toUpperCase()}`
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
   VOTING
   ========================================================= */

function startVoting() {

  game.votes = {};

  game.currentVoteIndex = 0;

  game.voteResolutionDone =
    false;

  showVote();
}

function showVote() {

  const players =
    living();

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

  $("voteOptions").innerHTML =
    silenced
      ? button(
          "SKIP (SILENCED)",
          "skip"
        )
      : [
          ...living()
            .filter(
              (p) =>
                p.id !== voter.id
            )
            .map(
              (p) =>
                button(
                  esc(
                    displayName(
                      p.id
                    )
                  ),
                  p.id
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
    .forEach((btn) => {

      btn.onclick = () => {

        game.selectedVote =
          btn.dataset.value;

        $("voteOptions")
          .querySelectorAll("button")
          .forEach(
            (b) =>
              b.classList.remove(
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

function confirmVote() {

  const voter =
    living()[
      game.currentVoteIndex
    ];

  if (!voter) return;

  if (!game.selectedVote) {
    return;
  }

  if (
    online.mode === "online" &&
    !online.host
  ) {

    onlineSendPrivate({
      type: "vote",
      playerId: voter.id,
      target: game.selectedVote
    });

    $("confirmVoteButton").disabled =
      true;

    return;
  }

  game.votes[voter.id] =
    game.selectedVote;

  game.currentVoteIndex++;

  showVote();
}


/* =========================================================
   VOTE RESOLUTION
   ========================================================= */

function resolveVoting() {

  const tally = {};

  Object.values(
    game.votes
  ).forEach((vote) => {

    if (
      vote === "skip"
    ) {
      return;
    }

    tally[vote] =
      (tally[vote] || 0) +
      1;
  });

  const max =
    Math.max(
      0,
      ...Object.values(tally)
    );

  const tied =
    Object.keys(tally)
      .filter(
        (id) =>
          tally[id] === max &&
          max > 0
      );

  if (
    tied.length === 1
  ) {

    finishEjection(
      tied[0],
      false
    );

    return;
  }

  if (
    tied.length > 1
  ) {

    const captain =
      living().find(
        (p) =>
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
   CAPTAIN
   ========================================================= */

function showCaptainTie(
  tied,
  captain
) {

  $("captainTieOptions").innerHTML =
    `
      <p>
        ${esc(captain.name)},
        choose one tied player to eject.
      </p>

      ${tied
        .map(
          (id) =>
            button(
              esc(
                displayName(id)
              ),
              id
            )
        )
        .join("")}
    `;

  $("captainTieOptions")
    .querySelectorAll("button")
    .forEach((btn) => {

      btn.onclick = () => {

        if (
          online.mode === "online" &&
          !online.host
        ) {

          onlineSendPrivate({
            type: "captain",
            target:
              btn.dataset.value
          });

          return;
        }

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
   EJECTION
   ========================================================= */

function finishEjection(
  id,
  byCaptain
) {

  /*
  Judge can cancel ANY ejection.

  This is intentionally checked before
  Jester resolution.
  */
  if (id) {

    const judge =
      living().find(
        (p) =>
          p.role === "judge" &&
          !game.judgeUsed &&
          game.systems.power &&
          !game.blockedPlayers.has(
            p.id
          )
      );

    if (judge) {

      game.judgeUsed =
        true;

      $("voteResultTitle").textContent =
        "EJECTION CANCELLED";

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
      getPlayer(id);

    if (player) {

      player.alive = false;

      if (
        player.role === "jester"
      ) {

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

  setScreen(
    "voteResultScreen"
  );
}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

  /*
  Trickster identity swap ends AFTER
  the entire vote resolution.
  */
  game.displaySwap =
    null;

  if (game.gameOver) {

    showGameOver();

    return;
  }

  if (
    checkVictory()
  ) {
    return;
  }

  /*
  Earth lifeline exactly every 3 rounds.
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

  const hostiles =
    living().filter(
      isHostile
    );

  const nonHostiles =
    living().filter(
      (p) =>
        !isHostile(p)
    );

  const pool = [];

  /*
  Exactly ONE hostile in the clue.
  */
  if (
    hostiles.length
  ) {

    pool.push(
      ...shuffle(hostiles)
        .slice(0, 1)
    );
  }

  /*
  Two additional non-hostiles.
  */
  pool.push(
    ...shuffle(nonHostiles)
      .slice(0, 2)
  );

  const message =
    pool.length
      ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${pool
          .map(
            (p) => p.name
          )
          .join(", ")}`
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
   SYSTEMS / NEXT ROUND
   ========================================================= */

function proceedToSystems() {

  /*
  Engines only progress when online.
  */
  if (
    game.systems.engines
  ) {

    game.stage++;
  }

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
        ([key, value]) =>
          `
            <div>
              ${
                value
                  ? "🟢"
                  : "🔴"
              }
              <strong>
                ${key.toUpperCase()}
              </strong>
              —
              ${
                value
                  ? "ONLINE"
                  : "OFFLINE"
              }
            </div>
          `
      )
      .join("");

  $("nextRoundButton").onclick =
    () => {

      game.round++;

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
   VICTORY
   ========================================================= */

function checkVictory() {

  if (game.gameOver) {
    return true;
  }

  const hostiles =
    living().filter(
      isHostile
    ).length;

  const nonHostiles =
    living().filter(
      (p) =>
        !isHostile(p)
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

  /*
  Survivor King wins independently if one of final 2.
  */
  if (
    living().length === 2
  ) {

    const king =
      living().find(
        (p) =>
          p.role === "king"
      );

    if (king) {

      endGame(
        "SURVIVOR KING WINS",
        `${king.name} is one of the final 2 living players.`
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
        (p) =>
          `
            <div class="${
              p.alive
                ? ""
                : "dead"
            }">

              <strong>
                ${esc(p.name)}
              </strong>

              —
              ${ROLE_DATA[p.role]?.icon || ""}
              ${ROLE_DATA[p.role]?.name || p.role}

              <span
                class="team-${teamClass(
                  roleTeam(p)
                )}"
              >
                [${roleTeam(p)}]
              </span>

              ${
                p.alive
                  ? "ALIVE"
                  : "DEAD"
              }

            </div>
          `
      )
      .join("");

  setScreen(
    "gameOverScreen"
  );

  if (
    online.mode === "online" &&
    online.host
  ) {

    onlineBroadcastPublic({
      type: "game_over",
      title,
      message,
      players: game.players.map(
        (p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          alive: p.alive
        })
      )
    });
  }
}

function showGameOver() {

  endGame(
    $("voteResultTitle").textContent,
    $("voteResultMessage").textContent
  );
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
      NEUTRALS
    ],

    [
      "INFECTION",
      [
        "infected",
        "diseased",
        "parasite"
      ]
    ],

    [
      "ROLE CONCEPT",
      CONCEPTS
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

              ${roles
                .map(
                  (role) => {

                    const data =
                      ROLE_DATA[role];

                    return `
                      <article
                        class="
                          guide-card
                          ${teamClass(
                            data.team
                          )}
                        "
                      >

                        <div class="guide-icon">
                          ${data.icon}
                        </div>

                        <div>

                          <strong>
                            ${data.name}
                          </strong>

                          <div class="guide-team">
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
                .join("")}

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

              ${roles
                .map(
                  (role) => {

                    const locked =
                      role ===
                      "engineer";

                    return `
                      <div
                        class="
                          custom-row
                          ${
                            locked
                              ? "locked"
                              : ""
                          }
                        "
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
                              settings.counts[
                                role
                              ] || 0
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
                              settings.enabled[
                                role
                              ] || locked
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
                .join("")}

            </section>
          `
      )
      .join("");

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-enabled]"
    )
    .forEach((input) => {

      input.onchange = () => {

        const role =
          input.dataset.roleEnabled;

        settings.enabled[role] =
          input.checked;

        if (!input.checked) {

          settings.counts[role] =
            0;
        }

        renderCustomRoles();

        renderSetup();
      };
    });

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-count]"
    )
    .forEach((input) => {

      input.onchange = () => {

        const role =
          input.dataset.roleCount;

        settings.counts[role] =
          Math.max(
            0,
            Math.min(
              1,
              Number(input.value) ||
                0
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
    });
}

function applyCustomRoles() {

  const count =
    game.players.length;

  const selected = [];

  Object.entries(
    settings.counts
  ).forEach(
    ([role, amount]) => {

      for (
        let i = 0;
        i < amount;
        i++
      ) {
        selected.push(role);
      }
    }
  );

  if (
    selected.length !== count
  ) {

    alert(
      `Custom roles must total exactly ${count} players. Current total: ${selected.length}.`
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
      (role) =>
        HOSTILES.includes(role)
    ).length;

  if (
    hostileCount !==
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
   MODALS
   ========================================================= */

function openModal(id) {

  const modal = $(id);

  if (modal) {
    modal.classList.add("open");
  }
}

function closeModal(id) {

  const modal = $(id);

  if (modal) {
    modal.classList.remove("open");
  }
}


/* =========================================================
   ONLINE UI
   ========================================================= */

function addOnlineSetupUI() {

  const setup =
    $("setupScreen");

  if (!setup) return;

  if (
    $("onlineModePanel")
  ) {
    return;
  }

  const panel =
    document.createElement("div");

  panel.id =
    "onlineModePanel";

  panel.className =
    "panel";

  panel.innerHTML =
    `
      <h2>🌐 ONLINE MODE</h2>

      <p class="muted">
        Play with friends on different phones.
      </p>

      <div class="button-row">

        <button
          type="button"
          id="localModeButton"
          class="secondary"
        >
          📱 LOCAL MODE
        </button>

        <button
          type="button"
          id="onlineModeButton"
          class="secondary"
        >
          🌐 ONLINE MODE
        </button>

      </div>

      <div
        id="onlineControls"
        style="display:none"
      >

        <div class="button-row">

          <button
            type="button"
            id="createRoomButton"
            class="primary"
          >
            CREATE ROOM
          </button>

        </div>

        <label class="big-label">
          ROOM CODE

          <input
            id="joinRoomInput"
            type="text"
            maxlength="5"
            placeholder="ABCDE"
            autocomplete="off"
            autocapitalize="characters"
          >
        </label>

        <button
          type="button"
          id="joinRoomButton"
          class="primary full"
        >
          JOIN ROOM
        </button>

        <div
          id="onlineStatus"
          class="validity"
        >
          Offline
        </div>

        <div
          id="onlinePlayers"
          class="results-box"
        ></div>

      </div>
    `;

  setup.appendChild(panel);

  $("localModeButton").onclick =
    () => {

      online.mode = "local";

      $("onlineControls").style.display =
        "none";

      $("onlineStatus").textContent =
        "LOCAL MODE";

      $("startGameButton").style.display =
        "";

      renderSetup();
    };

  $("onlineModeButton").onclick =
    () => {

      online.mode = "online";

      $("onlineControls").style.display =
        "";

      $("startGameButton").style.display =
        online.host
          ? ""
          : "none";

      $("onlineStatus").textContent =
        "ONLINE MODE — CREATE OR JOIN A ROOM";
    };

  $("createRoomButton").onclick =
    createOnlineRoom;

  $("joinRoomButton").onclick =
    () => {

      const code =
        $("joinRoomInput")
          .value
          .trim()
          .toUpperCase();

      if (!code) {
        alert("Enter a room code.");
        return;
      }

      joinOnlineRoom(code);
    };
}

function updateOnlinePlayersUI() {

  const container =
    $("onlinePlayers");

  if (!container) return;

  const players =
    Object.values(
      online.connections
    );

  if (!players.length) {

    container.innerHTML =
      "Waiting for players...";

    return;
  }

  container.innerHTML =
    players
      .map(
        (p) =>
          `
            <div>
              ${
                p.connected
                  ? "🟢"
                  : "🔴"
              }

              ${esc(
                p.name ||
                  "Player"
              )}

              ${
                p.playerId ===
                "p1"
                  ? " 👑 HOST"
                  : ""
              }
            </div>
          `
      )
      .join("");
}


/* =========================================================
   ROOM CODE
   ========================================================= */

function generateRoomCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (
    let i = 0;
    i < 5;
    i++
  ) {

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


/* =========================================================
   CONNECTION ID
   ========================================================= */

function getConnectionId() {

  let id =
    localStorage.getItem(
      "alien_connection_id"
    );

  if (!id) {

    id =
      `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    localStorage.setItem(
      "alien_connection_id",
      id
    );
  }

  return safeId(id);
}


/* =========================================================
   CREATE ONLINE ROOM
   ========================================================= */

async function createOnlineRoom() {

  online.mode =
    "online";

  if (!supabaseReady) {

    const loaded =
      await loadSupabase();

    if (!loaded) {

      alert(
        "Could not connect to Supabase. Check your internet connection."
      );

      return;
    }
  }

  online.roomCode =
    generateRoomCode();

  online.host =
    true;

  online.connected =
    false;

  online.myConnectionId =
    getConnectionId();

  /*
  Host is always Player 1.
  */
  online.myPlayerId =
    "p1";

  if (
    !game.players.length
  ) {

    createPlayers(
      Number(
        $("playerCount")?.value ||
          8
      )
    );
  }

  const hostPlayer =
    game.players[0];

  hostPlayer.name =
    "Host";

  hostPlayer.role =
    "survivor";

  online.connections = {};

  online.connections[
    online.myConnectionId
  ] = {

    connectionId:
      online.myConnectionId,

    playerId:
      "p1",

    name:
      hostPlayer.name,

    connected:
      true
  };

  await setupOnlineChannel();

  $("onlineStatus").textContent =
    `ROOM CREATED: ${online.roomCode}`;

  $("startGameButton").style.display =
    "";

  updateOnlinePlayersUI();
}


/* =========================================================
   JOIN ONLINE ROOM
   ========================================================= */

async function joinOnlineRoom(
  roomCode
) {

  online.mode =
    "online";

  if (!supabaseReady) {

    const loaded =
      await loadSupabase();

    if (!loaded) {

      alert(
        "Could not connect to Supabase. Check your internet connection."
      );

      return;
    }
  }

  online.roomCode =
    roomCode;

  online.host =
    false;

  online.connected =
    false;

  online.myConnectionId =
    getConnectionId();

  online.myPlayerId =
    null;

  await setupOnlineChannel();

  onlineSendPublic({
    type: "join",
    connectionId:
      online.myConnectionId,

    name:
      `Player ${Math.floor(
        Math.random() * 99
      ) + 1}`
  });

  $("onlineStatus").textContent =
    `JOINING ROOM ${roomCode}...`;

  $("startGameButton").style.display =
    "none";
}


/* =========================================================
   ONLINE CHANNEL
   ========================================================= */

async function setupOnlineChannel() {

  if (!supabaseClient) {
    return;
  }

  if (online.channel) {

    try {
      await supabaseClient.removeChannel(
        online.channel
      );
    } catch {}
  }

  const channelName =
    `alien-room-${online.roomCode}`;

  online.channel =
    supabaseClient.channel(
      channelName,
      {
        config: {
          broadcast: {
            self: true
          }
        }
      }
    );

  online.channel
    .on(
      "broadcast",
      {
        event: "message"
      },
      ({ payload }) => {

        handleOnlinePublic(
          payload
        );
      }
    )
    .subscribe(
      (status) => {

        if (
          status ===
          "SUBSCRIBED"
        ) {

          online.connected =
            true;

          $("onlineStatus").textContent =
            online.host
              ? `ROOM ${online.roomCode} — WAITING FOR PLAYERS`
              : `CONNECTED TO ROOM ${online.roomCode}`;

          /*
          Host announces itself.
          */
          if (
            online.host
          ) {

            onlineSendPublic({
              type:
                "host_announce",

              hostConnectionId:
                online.myConnectionId,

              players:
                online.playersSnapshot()
            });
          }
        }

        if (
          status ===
          "CHANNEL_ERROR" ||
          status ===
          "TIMED_OUT"
        ) {

          online.connected =
            false;

          $("onlineStatus").textContent =
            "Could not connect to servers.";
        }
      }
    );
}


/* =========================================================
   ONLINE PLAYER SNAPSHOT
   ========================================================= */

online.playersSnapshot =
  function () {

    return Object.values(
      online.connections
    ).map(
      (p) => ({
        connectionId:
          p.connectionId,

        playerId:
          p.playerId,

        name:
          p.name,

        connected:
          p.connected
      })
    );
  };


/* =========================================================
   PUBLIC SEND
   ========================================================= */

function onlineSendPublic(
  payload
) {

  if (
    !online.channel
  ) {
    return;
  }

  online.channel.send({
    type:
      "broadcast",

    event:
      "message",

    payload
  });
}


/* =========================================================
   PUBLIC BROADCAST
   ========================================================= */

function onlineBroadcastPublic(
  payload
) {

  onlineSendPublic(
    payload
  );
}


/* =========================================================
   ONLINE PRIVATE CHANNEL
   ========================================================= */

async function setupPrivateChannel(
  connectionId
) {

  if (!supabaseClient) {
    return;
  }

  if (
    online.privateChannel
  ) {

    try {
      await supabaseClient.removeChannel(
        online.privateChannel
      );
    } catch {}
  }

  online.privateChannel =
    supabaseClient.channel(
      `alien-private-${online.roomCode}-${connectionId}`,
      {
        config: {
          broadcast: {
            self: true
          }
        }
      }
    );

  online.privateChannel
    .on(
      "broadcast",
      {
        event: "private"
      },
      ({ payload }) => {

        handleOnlinePrivate(
          payload
        );
      }
    )
    .subscribe();
}


/* =========================================================
   PRIVATE SEND
   ========================================================= */

function onlineSendPrivate(
  payload
) {

  if (
    !online.privateChannel
  ) {

    return;
  }

  online.privateChannel.send({
    type:
      "broadcast",

    event:
      "private",

    payload
  });
}


/* =========================================================
   PRIVATE MESSAGE
   ========================================================= */

function onlineSendToConnection(
  connectionId,
  payload
) {

  if (!supabaseClient) {
    return;
  }

  const channel =
    supabaseClient.channel(
      `alien-private-${online.roomCode}-${connectionId}`,
      {
        config: {
          broadcast: {
            self: false
          }
        }
      }
    );

  channel.subscribe(
    (status) => {

      if (
        status ===
        "SUBSCRIBED"
      ) {

        channel.send({
          type:
            "broadcast",

          event:
            "private",

          payload
        });

        setTimeout(
          () => {
            supabaseClient.removeChannel(
              channel
            );
          },
          1000
        );
      }
    }
  );
}


/* =========================================================
   HANDLE PUBLIC ONLINE MESSAGES
   ========================================================= */

function handleOnlinePublic(
  message
) {

  if (!message) {
    return;
  }

  /*
  JOIN
  */
  if (
    message.type ===
    "join" &&
    online.host
  ) {

    const existing =
      Object.values(
        online.connections
      ).find(
        (p) =>
          p.connectionId ===
          message.connectionId
      );

    if (existing) {
      return;
    }

    const usedIds =
      new Set(
        Object.values(
          online.connections
        ).map(
          (p) =>
            p.playerId
        )
      );

    let playerId =
      null;

    for (
      let i = 2;
      i <= 12;
      i++
    ) {

      const candidate =
        `p${i}`;

      if (
        !usedIds.has(
          candidate
        )
      ) {

        playerId =
          candidate;

        break;
      }
    }

    if (!playerId) {

      onlineSendToConnection(
        message.connectionId,
        {
          type:
            "room_full"
        }
      );

      return;
    }

    online.connections[
      message.connectionId
    ] = {

      connectionId:
        message.connectionId,

      playerId,

      name:
        message.name ||
        playerId,

      connected:
        true
    };

    const player =
      getPlayer(
        playerId
      );

    if (player) {

      player.name =
        message.name ||
        player.name;
    }

    setupPrivateChannel(
      message.connectionId
    );

    onlineSendToConnection(
      message.connectionId,
      {
        type:
          "assigned",

        playerId,

        roomCode:
          online.roomCode,

        players:
          online.playersSnapshot()
      }
    );

    onlineBroadcastPublic({
      type:
        "players",

      players:
        online.playersSnapshot()
    });

    updateOnlinePlayersUI();

    return;
  }


  /*
  HOST ANNOUNCEMENT
  */
  if (
    message.type ===
    "host_announce" &&
    !online.host
  ) {

    if (
      Array.isArray(
        message.players
      )
    ) {

      online.connections = {};

      message.players.forEach(
        (p) => {

          online.connections[
            p.connectionId
          ] = p;
        }
      );

      updateOnlinePlayersUI();
    }

    return;
  }


  /*
  PLAYER LIST
  */
  if (
    message.type ===
    "players"
  ) {

    if (
      Array.isArray(
        message.players
      )
    ) {

      online.connections = {};

      message.players.forEach(
        (p) => {

          online.connections[
            p.connectionId
          ] = p;

          if (
            p.connectionId ===
            online.myConnectionId
          ) {

            online.myPlayerId =
              p.playerId;
          }
        }
      );

      updateOnlinePlayersUI();
    }

    return;
  }


  /*
  ASSIGNED
  */
  if (
    message.type ===
    "assigned"
  ) {

    online.myPlayerId =
      message.playerId;

    online.roomCode =
      message.roomCode;

    if (
      Array.isArray(
        message.players
      )
    ) {

      online.connections = {};

      message.players.forEach(
        (p) => {

          online.connections[
            p.connectionId
          ] = p;
        }
      );
    }

    setupPrivateChannel(
      online.myConnectionId
    );

    updateOnlinePlayersUI();

    $("onlineStatus").textContent =
      `CONNECTED — YOU ARE ${message.playerId.toUpperCase()}`;

    return;
  }


  /*
  GAME START
  */
  if (
    message.type ===
    "game_start"
  ) {

    receiveOnlineGameStart(
      message
    );

    return;
  }


  /*
  PUBLIC PHASE
  */
  if (
    message.type ===
    "phase"
  ) {

    receiveOnlinePhase(
      message
    );

    return;
  }


  /*
  GAME OVER
  */
  if (
    message.type ===
    "game_over"
  ) {

    game.players =
      message.players.map(
        (p) => ({
          ...p
        })
      );

    endGame(
      message.title,
      message.message
    );

    return;
  }
}


/* =========================================================
   PRIVATE MESSAGE HANDLER
   ========================================================= */

function handleOnlinePrivate(
  message
) {

  if (!message) {
    return;
  }

  /*
  HOST RECEIVES ACTION.
  */
  if (
    online.host
  ) {

    if (
      message.type ===
      "ability_action"
    ) {

      const player =
        getPlayer(
          message.playerId
        );

      if (
        player &&
        onlineIsTheirTurn(
          player.id
        )
      ) {

        game.actions[
          player.id
        ] =
          message.action;

        applyImmediateAction(
          player,
          message.action
        );

        advanceAbility();
      }

      return;
    }


    if (
      message.type ===
      "vote"
    ) {

      if (
        !game.votes[
          message.playerId
        ]
      ) {

        game.votes[
          message.playerId
        ] =
          message.target;

        game.currentVoteIndex++;

        showVote();
      }

      return;
    }


    if (
      message.type ===
      "captain"
    ) {

      finishEjection(
        message.target,
        true
      );

      return;
    }
  }


  /*
  CLIENT RECEIVES PRIVATE ROLE.
  */
  if (
    message.type ===
    "private_role"
  ) {

    receivePrivateRole(
      message
    );

    return;
  }


  /*
  CLIENT RECEIVES PRIVATE ACTION.
  */
  if (
    message.type ===
    "private_action"
  ) {

    receivePrivateAction(
      message
    );

    return;
  }


  /*
  CLIENT RECEIVES REACTION.
  */
  if (
    message.type ===
    "private_reaction"
  ) {

    receivePrivateReaction(
      message
    );

    return;
  }


  /*
  CLIENT RECEIVES VOTE.
  */
  if (
    message.type ===
    "private_vote"
  ) {

    receivePrivateVote(
      message
    );

    return;
  }


  if (
    message.type ===
    "room_full"
  ) {

    alert(
      "That room is full."
    );

    return;
  }
}


/* =========================================================
   ONLINE TURN CHECK
   ========================================================= */

function onlineIsTheirTurn(
  playerId
) {

  const current =
    game.abilityQueue[
      game.abilityIndex
    ];

  return (
    current ===
    playerId
  );
}


/* =========================================================
   SEND GAME START
   ========================================================= */

function sendOnlineGameStart() {

  if (!online.host) {
    return;
  }

  const connections =
    Object.values(
      online.connections
    );

  const required =
    game.players.length;

  if (
    connections.length <
    required
  ) {

    alert(
      `Waiting for players. Need ${required} connected players.`
    );

    return;
  }

  /*
  Send each client only their own role.
  */
  connections.forEach(
    (connection) => {

      const player =
        getPlayer(
          connection.playerId
        );

      if (!player) {
        return;
      }

      onlineSendToConnection(
        connection.connectionId,
        {
          type:
            "private_role",

          player: {
            id:
              player.id,

            name:
              player.name,

            role:
              player.role,

            originalRole:
              player.originalRole
          }
        }
      );
    }
  );

  onlineBroadcastPublic({
    type:
      "game_start",

    round:
      game.round,

    stage:
      game.stage,

    players:
      game.players.map(
        (p) => ({
          id:
            p.id,

          name:
            p.name,

          alive:
            p.alive
        })
      )
  });

  startRound();
}


/* =========================================================
   RECEIVE GAME START
   ========================================================= */

function receiveOnlineGameStart(
  message
) {

  if (
    online.host
  ) {
    return;
  }

  game.round =
    message.round;

  game.stage =
    message.stage;

  game.players =
    message.players.map(
      (p) => ({
        ...p,
        role:
          "survivor",
        originalRole:
          "survivor",
        infectionRound:
          null,
        hasInfected:
          false
      })
    );

  online.started =
    true;

  $("onlineStatus").textContent =
    `ONLINE GAME — YOU ARE ${online.myPlayerId.toUpperCase()}`;

  setScreen(
    "passScreen"
  );
}


/* =========================================================
   RECEIVE PRIVATE ROLE
   ========================================================= */

function receivePrivateRole(
  message
) {

  const target =
    getPlayer(
      message.player.id
    );

  if (!target) {

    game.players.push({
      ...message.player,
      alive: true,
      infectionRound:
        null,
      hasInfected:
        false
    });

  } else {

    target.role =
      message.player.role;

    target.originalRole =
      message.player.originalRole;
  }
}


/* =========================================================
   RECEIVE ONLINE PHASE
   ========================================================= */

function receiveOnlinePhase(
  message
) {

  if (
    typeof message.round ===
    "number"
  ) {

    game.round =
      message.round;
  }

  if (
    typeof message.stage ===
    "number"
  ) {

    game.stage =
      message.stage;
  }

  if (
    message.phase ===
    "discussion"
  ) {

    showDiscussion();

  } else if (
    message.phase ===
    "reaction"
  ) {

    setScreen(
      "reactionScreen"
    );

  } else if (
    message.phase ===
    "voting"
  ) {

    setScreen(
      "votingScreen"
    );
  }
}


/* =========================================================
   CLIENT PRIVATE ROLE SCREEN
   ========================================================= */

function receivePrivateAction(
  message
) {

  if (
    message.playerId !==
    online.myPlayerId
  ) {
    return;
  }

  showRole();

  $("showActionButton").onclick =
    () => {

      showAction();
    };
}


/* =========================================================
   PRIVATE REACTION
   ========================================================= */

function receivePrivateReaction(
  message
) {

  if (
    message.playerId !==
    online.myPlayerId
  ) {
    return;
  }

  $("reactionResultTitle").textContent =
    message.title;

  $("reactionResultMessage").textContent =
    message.message;

  setScreen(
    "reactionResultScreen"
  );
}


/* =========================================================
   PRIVATE VOTE
   ========================================================= */

function receivePrivateVote(
  message
) {

  if (
    message.playerId !==
    online.myPlayerId
  ) {
    return;
  }

  /*
  Host has already processed the vote.
  */
}


/* =========================================================
   HOST PRIVATE ROLE TURN
   ========================================================= */

function hostSendCurrentTurn() {

  if (!online.host) {
    return;
  }

  const player =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if (!player) {
    return;
  }

  const connection =
    Object.values(
      online.connections
    ).find(
      (p) =>
        p.playerId ===
        player.id
    );

  if (!connection) {
    return;
  }

  onlineSendToConnection(
    connection.connectionId,
    {
      type:
        "private_action",

      playerId:
        player.id
    }
  );
}


/* =========================================================
   ONLINE LOCAL WRAPPERS
   ========================================================= */

const originalStartRound =
  startRound;

startRound = function () {

  if (
    online.mode ===
      "online" &&
    !online.host
  ) {

    return;
  }

  originalStartRound();

  if (
    online.mode ===
      "online" &&
    online.host
  ) {

    hostSendCurrentTurn();
  }
};


/* =========================================================
   ONLINE DISCUSSION SYNC
   ========================================================= */

const originalShowDiscussion =
  showDiscussion;

showDiscussion = function () {

  originalShowDiscussion();

  if (
    online.mode ===
      "online" &&
    online.host
  ) {

    onlineBroadcastPublic({
      type:
        "phase",

      phase:
        "discussion",

      round:
        game.round,

      stage:
        game.stage,

      systems:
        game.systems,

      players:
        game.players.map(
          (p) => ({
            id:
              p.id,

            name:
              p.name,

            alive:
              p.alive
          })
        )
    });
  }
};


/* =========================================================
   ONLINE REACTION SYNC
   ========================================================= */

const originalShowReactions =
  showReactions;

showReactions = function () {

  if (
    online.mode ===
      "online" &&
    !online.host
  ) {
    return;
  }

  originalShowReactions();

  if (
    online.mode ===
      "online" &&
    online.host
  ) {

    game.reactionQueue.forEach(
      (playerId) => {

        const player =
          getPlayer(playerId);

        if (!player) return;

        const connection =
          Object.values(
            online.connections
          ).find(
            (p) =>
              p.playerId ===
              player.id
          );

        if (!connection) {
          return;
        }

        let message =
          game.reactionInfo[
            player.id
          ];

        if (!message) {

          if (
            game.silencedUntil[
              player.id
            ] &&
            game.silencedUntil[
              player.id
            ] > game.round
          ) {

            message =
              "You have been silenced. You cannot vote.";

          } else {

            message =
              "Nothing happened to you this round.";
          }
        }

        onlineSendToConnection(
          connection.connectionId,
          {
            type:
              "private_reaction",

            playerId:
              player.id,

            title:
              player.alive
                ? "ROUND RESULT"
                : "YOU DIED THIS ROUND",

            message
          }
        );
      }
    );

    onlineBroadcastPublic({
      type:
        "phase",

      phase:
        "reaction",

      round:
        game.round,

      stage:
        game.stage
    });
  }
};


/* =========================================================
   ONLINE VOTING SYNC
   ========================================================= */

const originalStartVoting =
  startVoting;

startVoting = function () {

  if (
    online.mode ===
      "online" &&
    !online.host
  ) {
    return;
  }

  originalStartVoting();

  if (
    online.mode ===
      "online" &&
    online.host
  ) {

    Object.values(
      online.connections
    ).forEach(
      (connection) => {

        const player =
          getPlayer(
            connection.playerId
          );

        if (
          !player ||
          !player.alive
        ) {
          return;
        }

        onlineSendToConnection(
          connection.connectionId,
          {
            type:
              "private_vote",

            playerId:
              player.id,

            round:
              game.round,

            players:
              living().map(
                (p) => ({
                  id:
                    p.id,

                  name:
                    p.name,

                  alive:
                    p.alive
                })
              ),

            silenced:
              (
                game.silencedUntil[
                  player.id
                ] || 0
              ) > game.round
          }
        );
      }
    );

    onlineBroadcastPublic({
      type:
        "phase",

      phase:
        "voting",

      round:
        game.round,

      stage:
        game.stage
    });
  }
};


/* =========================================================
   ONLINE HOST START GAME BUTTON
   ========================================================= */

const originalStartGame =
  startGame;

startGame = function () {

  if (
    online.mode ===
      "online"
  ) {

    if (!online.host) {

      alert(
        "Only the host can start the online game."
      );

      return;
    }

    /*
    Save names before starting.
    */
    document
      .querySelectorAll(
        ".player-name-input"
      )
      .forEach((input) => {

        const index =
          Number(
            input.dataset.nameIndex
          );

        if (
          game.players[index]
        ) {

          game.players[index].name =
            input.value.trim() ||
            `Player ${index + 1}`;
        }
      });

    let roles =
      getSelectedRoles();

    if (
      roles.some(
        (r) => !r
      )
    ) {

      randomiseRoles();

      roles =
        getSelectedRoles();
    }

    const error =
      validateRoles(roles);

    if (error) {

      alert(error);

      return;
    }

    game.players.forEach(
      (p, index) => {

        p.role =
          roles[index];

        p.originalRole =
          roles[index];

        p.alive =
          true;

        p.infectionRound =
          null;

        p.hasInfected =
          false;
      }
    );

    game.round =
      1;

    game.stage =
      1;

    game.gameOver =
      false;

    game.lifelineNumber =
      0;

    game.judgeUsed =
      false;

    game.tricksterUsed =
      false;

    game.displaySwap =
      null;

    game.systems = {
      engines: true,
      o2: true,
      communications: true,
      power: true
    };

    resetTransient();

    sendOnlineGameStart();

    return;
  }

  originalStartGame();
};


/* =========================================================
   ONLINE SETUP PLAYER COUNT
   ========================================================= */

const originalResetSetupPlayers =
  resetSetupPlayers;

resetSetupPlayers = function () {

  if (
    online.mode ===
      "online" &&
    online.host &&
    online.connected
  ) {

    /*
    Don't allow changing the player count
    below the number already connected.
    */
  }

  originalResetSetupPlayers();

  if (
    online.mode ===
      "online" &&
    online.host
  ) {

    online.connections[
      online.myConnectionId
    ] = {

      connectionId:
        online.myConnectionId,

      playerId:
        "p1",

      name:
        game.players[0]?.name ||
        "Host",

      connected:
        true
    };

    updateOnlinePlayersUI();
  }
};


/* =========================================================
   ONLINE NEXT ROUND
   ========================================================= */

const originalProceedToSystems =
  proceedToSystems;

proceedToSystems = function () {

  originalProceedToSystems();
};


/* =========================================================
   INITIAL UI
   ========================================================= */

function initGameUI() {

  const playerCount =
    $("playerCount");

  if (!playerCount) {
    return;
  }

  addOnlineSetupUI();

  /*
  Player count.
  */
  playerCount.onchange =
    resetSetupPlayers;

  /*
  Initial players.
  */
  if (
    !game.players.length
  ) {

    createPlayers(
      Number(
        playerCount.value ||
          8
      )
    );
  }

  renderSetup();


  /*
  RANDOM BUTTON

  Use pointerup for better mobile support.
  */
  const randomButton =
    $("randomRolesButton");

  if (randomButton) {

    randomButton.type =
      "button";

    const randomHandler =
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        randomiseRoles();
      };

    if (
      window.PointerEvent
    ) {

      randomButton.addEventListener(
        "pointerup",
        randomHandler
      );

    } else {

      randomButton.addEventListener(
        "click",
        randomHandler
      );
    }
  }


  /*
  START GAME
  */
  const startButton =
    $("startGameButton");

  if (startButton) {

    startButton.type =
      "button";

    startButton.onclick =
      (event) => {

        event.preventDefault();

        startGame();
      };
  }


  /*
  ROLE GUIDE
  */
  $("roleGuideButton").onclick =
    () => {

      renderRoleGuide();

      openModal(
        "roleGuideModal"
      );
    };


  /*
  CUSTOM ROLES
  */
  $("customRolesButton").onclick =
    () => {

      renderCustomRoles();

      openModal(
        "customRoleModal"
      );
    };


  /*
  MODAL CLOSE BUTTONS
  */
  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach((btn) => {

      btn.onclick =
        () => {

          closeModal(
            btn.dataset.close
          );
        };
    });


  /*
  LOCAL GAME CONTROLS
  */
  $("readyButton").onclick =
    showRole;

  $("showActionButton").onclick =
    showAction;

  $("confirmActionButton").onclick =
    completeAbility;

  $("reactionReadyButton").onclick =
    showReactionResult;

  $("reactionContinueButton").onclick =
    advanceReaction;

  $("startVotingButton").onclick =
    startVoting;

  $("confirmVoteButton").onclick =
    confirmVote;

  $("afterVoteButton").onclick =
    afterVoting;

  $("lifelineContinue").onclick =
    proceedToSystems;

  $("restartButton").onclick =
    () => location.reload();

  $("applyCustomRolesButton").onclick =
    applyCustomRoles;
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    async () => {

      await loadSupabase();

      initGameUI();
    },
    {
      once: true
    }
  );

} else {

  loadSupabase()
    .finally(
      initGameUI
    );
}
