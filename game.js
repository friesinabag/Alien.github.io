"use strict";

const $ = id => document.getElementById(id);
const alive = p => p && p.alive;
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[c]));

/* =========================================================
   ROLE DATA
   ========================================================= */

const ROLE_DATA = {
  alien:{
    icon:"👽",
    name:"Alien",
    team:"Hostile",
    desc:"Kill 1 player each round. If no living Saboteur exists, you may choose Kill or Sabotage. You can see the other Hostile players."
  },

  saboteur:{
    icon:"😈",
    name:"Saboteur",
    team:"Hostile",
    desc:"Sabotage 1 ship system each round. You can see the other Hostile players."
  },

  silencer:{
    icon:"🔇",
    name:"Silencer",
    team:"Hostile",
    desc:"Silence 1 living player for 2 rounds. They may still discuss and use their ability. You can see the other Hostile players."
  },

  parasite:{
    icon:"🦠",
    name:"Parasite",
    team:"Hostile",
    desc:"Infect 1 player once. An infection progresses to Diseased, then Parasite. You can see the other Hostile players."
  },

  engineer:{
    icon:"🔧",
    name:"Engineer",
    team:"Human",
    desc:"Repair 1 offline system each round. You can act even when Power is offline."
  },

  scientist:{
    icon:"🧪",
    name:"Scientist",
    team:"Human",
    desc:"Check 1 living player to see Healthy, Infected, Diseased or Parasite. Cure Infected or Diseased."
  },

  detective:{
    icon:"🕵️",
    name:"Detective",
    team:"Human",
    desc:"Investigate 1 player. You learn what they interacted with last round."
  },

  medic:{
    icon:"🩺",
    name:"Medic",
    team:"Human",
    desc:"Protect 1 living player from a kill this round."
  },

  captain:{
    icon:"👨‍✈️",
    name:"Captain",
    team:"Human",
    desc:"If a vote ties, secretly choose which tied player is ejected. Power must be online."
  },

  guard:{
    icon:"🛡️",
    name:"Guard",
    team:"Human",
    desc:"Block 1 living player's role ability for this round."
  },

  survivor:{
    icon:"👤",
    name:"Survivor",
    team:"Human",
    desc:"No special ability. Help the Human team survive and reach Earth."
  },

  radio:{
    icon:"📻",
    name:"Radio Operator",
    team:"Human",
    desc:"Once per round, choose to receive a private message from Earth while Communications is online."
  },

  judge:{
    icon:"⚖️",
    name:"Judge",
    team:"Human",
    desc:"Once per game, cancel ANY vote that would eject a player, including normal votes and Captain tie-breakers."
  },

  jester:{
    icon:"🃏",
    name:"Jester",
    team:"Neutral",
    desc:"Try to get yourself voted out. If normally ejected, you win immediately."
  },

  king:{
    icon:"👑",
    name:"Survivor King",
    team:"Neutral",
    desc:"Win independently by being one of the final 2 living players."
  },

  trickster:{
    icon:"🎭",
    name:"Trickster",
    team:"Neutral",
    concept:true,
    desc:"Once per game, swap the displayed identities of two living players. The swap lasts through voting, then ends."
  },

  infected:{
    icon:"🦠",
    name:"Infected",
    team:"Infection",
    sub:true,
    desc:"A hidden infection stage. Only the Scientist can see this status. The infected player does not know."
  },

  diseased:{
    icon:"☣️",
    name:"Diseased",
    team:"Hostile",
    sub:true,
    desc:"The second infection stage. You know you are Diseased and on the Hostile Team. You cannot use an ability."
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
  4:1,
  5:1,
  6:2,
  7:2,
  8:3,
  9:3,
  10:3,
  11:4,
  12:4
};

const HUMAN_WEIGHTS = {
  survivor:25,
  medic:15,
  detective:12.5,
  guard:12.5,
  scientist:10,
  radio:10,
  captain:7.5,
  judge:7.5
};


/* =========================================================
   SETTINGS
   ========================================================= */

let settings = {
  enabled: Object.fromEntries(
    [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
      .map(r => [r, r !== "trickster"])
  ),

  counts: Object.fromEntries(
    [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
      .map(r => [r, 0])
  )
};

settings.counts.engineer = 1;


/* =========================================================
   GAME STATE
   ========================================================= */

let game = {
  players: [],

  round:1,
  stage:1,

  abilityQueue:[],
  abilityIndex:0,

  reactionQueue:[],
  reactionIndex:0,

  roundStartAliveIds:[],

  actions:{},
  previousActions:{},

  blockedPlayers:new Set(),
  protectedPlayers:new Set(),

  silencedUntil:{},

  votes:{},

  selectedAction:null,
  selectedVote:null,

  randomisedRoles:false,
  randomRoles:{},

  reactionInfo:{},

  lastRoundResults:[],

  lifelineNumber:0,

  gameOver:false,

  voteResolutionDone:false,

  tricksterUsed:false,
  displaySwap:null,

  judgeUsed:false,

  systems:{
    engines:true,
    o2:true,
    communications:true,
    power:true
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
  if(role === "infected") return "Human";
  if(role === "diseased") return "Hostile";

  return ROLE_DATA[role]?.team || "Human";
}

function isHostile(p) {
  return alive(p) && roleTeam(p.role) === "Hostile";
}

function isNeutral(p) {
  return alive(p) && roleTeam(p.role) === "Neutral";
}

function isHuman(p) {
  return alive(p) && roleTeam(p.role) === "Human";
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
   ABILITY CHECK
   ========================================================= */

function canAct(p) {
  if(!alive(p)) return false;

  if(p.role === "engineer") return true;

  if(
    p.role === "diseased" ||
    p.role === "infected" ||
    p.role === "survivor" ||
    p.role === "jester" ||
    p.role === "king"
  ) {
    return false;
  }

  if(!game.systems.power) return false;

  if(game.blockedPlayers.has(p.id)) return false;

  if(p.role === "judge" && game.judgeUsed) return false;

  return true;
}


/* =========================================================
   DISPLAY IDENTITY / TRICKSTER
   ========================================================= */

function realName(id) {
  return getPlayer(id)?.name || "";
}

function displayMap() {
  const map = Object.fromEntries(
    living().map(p => [p.id,p.id])
  );

  if(game.displaySwap) {
    const [a,b] = game.displaySwap;

    if(map[a] && map[b]) {
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
    .find(([,realId]) => realName(realId) === name);

  return hit ? hit[0] : null;
}


/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(actor=null, excludeId=null) {
  return living()
    .filter(p => {

      if(p.id === excludeId) return false;

      if(
        actor &&
        roleTeam(actor) === "Hostile" &&
        isHostile(p) &&
        !(game.displaySwap && game.displaySwap.includes(p.id))
      ) {
        return false;
      }

      return true;
    })
    .map(p => ({
      id:p.id,
      label:displayName(p.id)
    }));
}


/* =========================================================
   TRANSIENT ROUND STATE
   ========================================================= */

function resetTransient() {
  game.actions = {};

  game.blockedPlayers = new Set();

  game.protectedPlayers = new Set();

  game.selectedAction = null;

  game.reactionInfo = {};
}


/* =========================================================
   SCREEN / BUTTON HELPERS
   ========================================================= */

function setScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));

  $(id)?.classList.add("active");

  window.scrollTo(0,0);
}

function button(text,value,cls="choice-button") {
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


/*
 * Makes the currently selected button very obvious.
 * This works even if the CSS doesn't have a selected style.
 */

function markSelected(container,selectedButton) {

  container
    .querySelectorAll("button")
    .forEach(b => {

      b.classList.remove("selected");

      b.removeAttribute("aria-pressed");

      b.style.borderColor = "";

      b.style.boxShadow = "";
    });

  selectedButton.classList.add("selected");

  selectedButton.setAttribute(
    "aria-pressed",
    "true"
  );

  selectedButton.style.borderColor = "#ff3b30";

  selectedButton.style.boxShadow =
    "0 0 0 2px rgba(255,59,48,.25)";
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

      ? game.players.map((p,i) => `
        <div class="setup-player">

          <label>
            Player ${i+1}

            <select
              class="role-select ${game.randomisedRoles && game.randomRoles[i] ? "random-hidden":""}"
              data-index="${i}"
            >

              <option value="random">
                🎲 RANDOM
              </option>

              ${
                [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
                  .filter(r => settings.enabled[r] || r === "engineer")
                  .map(r =>
                    `<option value="${r}">
                      ${ROLE_DATA[r].icon} ${ROLE_DATA[r].name}
                    </option>`
                  )
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


function bindSetupSelects() {

  document
    .querySelectorAll(".role-select")
    .forEach(select => {

      select.onchange = () => {

        const i = Number(select.dataset.index);

        const value = select.value;

        if(value !== "random") {

          game.randomisedRoles = true;

          game.randomRoles[i] = value;

          select.value = "random";

          select.classList.add("random-hidden");
        }
      };
    });
}


function resetSetupPlayers() {

  const n = Number($("playerCount").value);

  game.players =
    Array.from(
      {length:n},
      (_,i) => ({
        id:`p${i+1}`,

        name:`Player ${i+1}`,

        role:"survivor",

        alive:true,

        originalRole:"survivor",

        infectionRound:null,

        hasInfected:false
      })
    );

  game.randomisedRoles = false;

  game.randomRoles = {};

  renderSetup();
}


function updatePlayerValidity() {

  const n = game.players.length;

  const total =
    Object.values(settings.counts)
      .reduce((a,b) => a+b,0);

  $("playerValidity").textContent =
    `PLAYERS: ${n} / ${n}  •  ${
      total
        ? `CUSTOM ROLES: ${total} / ${n}`
        : "RANDOM ROLES"
    }`;
}


/* =========================================================
   RANDOM ROLE SYSTEM
   ========================================================= */

function weightedPick(items,weights) {

  const total =
    items.reduce(
      (s,k) => s + (weights[k] || 0),
      0
    );

  let r = Math.random() * total;

  for(const k of items) {

    r -= weights[k] || 0;

    if(r < 0) return k;
  }

  return items[items.length-1];
}


function randomiseRoles() {

  const n = game.players.length;

  const h = HOSTILE_COUNTS[n];

  if(!h) return;

  const enabledHostiles =
    HOSTILES.filter(
      r => settings.enabled[r]
    );

  if(enabledHostiles.length < h) {

    return alert(
      "Enable enough Hostile roles to fill the random setup."
    );
  }

  const enabledHumans =
    HUMANS.filter(
      r => settings.enabled[r] || r === "engineer"
    );

  if(enabledHumans.length < n-h) {

    return alert(
      "Enable enough Human roles to fill the random setup."
    );
  }

  let roles = [];

  const hostile =
    shuffle(enabledHostiles).slice(0,h);

  roles.push(...hostile);

  roles.push("engineer");

  const humanNeeded = n-h-1;

  let pool =
    enabledHumans.filter(
      r => r !== "engineer"
    );

  if(pool.length < humanNeeded) {

    return alert(
      "Not enough enabled Human roles for this player count."
    );
  }

  for(let i=0;i<humanNeeded;i++) {

    const pick =
      weightedPick(pool,HUMAN_WEIGHTS);

    roles.push(pick);

    pool =
      pool.filter(
        r => r !== pick
      );
  }

  const neutralSlots =
    n - roles.length;

  if(neutralSlots > 0) {

    const enabledNeutral =
      [...NEUTRALS,...CONCEPTS]
        .filter(r => settings.enabled[r]);

    if(enabledNeutral.length < neutralSlots) {

      return alert(
        "Enable enough Neutral roles, or use manual role counts."
      );
    }

    roles.push(
      ...shuffle(enabledNeutral)
        .slice(0,neutralSlots)
    );
  }

  roles = shuffle(roles);

  game.randomRoles =
    Object.fromEntries(
      roles.map((r,i) => [i,r])
    );

  game.randomisedRoles = true;

  renderSetup();
}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

  const n = game.players.length;

  const h = HOSTILE_COUNTS[n];

  let roles =
    game.randomisedRoles

      ? Array.from(
          {length:n},
          (_,i) => game.randomRoles[i]
        )

      : Array.from(
          {length:n},
          (_,i) => game.players[i].role
        );

  if(
    roles.includes("random") ||
    roles.some(r => !r)
  ) {
    return alert(
      "Choose roles or press RANDOMISE ROLES first."
    );
  }

  if(!roles.includes("engineer")) {
    roles[n-1] = "engineer";
  }

  const counts =
    Object.fromEntries(
      ROLE_KEYS.map(r => [r,0])
    );

  roles.forEach(
    r => counts[r] = (counts[r] || 0) + 1
  );

  if(counts.engineer !== 1) {

    return alert(
      "There must be exactly 1 Engineer."
    );
  }

  if(
    counts.alien +
    counts.saboteur +
    counts.silencer +
    counts.parasite !== h
  ) {

    return alert(
      `This setup needs exactly ${h} Hostile role(s).`
    );
  }

  const valid =
    roles.every(
      r =>
        ROLE_DATA[r] &&
        !ROLE_DATA[r].sub &&
        (settings.enabled[r] || r === "engineer")
    );

  if(!valid) {
    return alert(
      "A disabled role is selected."
    );
  }

  game.players.forEach((p,i) => {

    p.role = roles[i];

    p.originalRole = roles[i];

    p.alive = true;

    p.infectionRound = null;

    p.hasInfected = false;
  });

  game.round = 1;

  game.stage = 1;

  game.gameOver = false;

  game.lifelineNumber = 0;

  game.judgeUsed = false;

  game.tricksterUsed = false;

  game.displaySwap = null;

  game.systems = {
    engines:true,
    o2:true,
    communications:true,
    power:true
  };

  game.previousActions = {};

  game.lastRoundResults = [];

  resetTransient();

  startRound();
}


/* =========================================================
   ROUND START
   ========================================================= */

function startRound() {

  if(checkVictory()) return;

  /*
   * IMPORTANT:
   * Save the previous round's actions BEFORE resetTransient()
   * clears game.actions.
   */

  game.previousActions =
    game.actions
      ? JSON.parse(
          JSON.stringify(game.actions)
        )
      : {};

  resetTransient();

  game.roundStartAliveIds =
    living().map(p => p.id);

  game.abilityQueue =
    [...game.roundStartAliveIds];

  game.abilityIndex = 0;

  passToAbility();
}


/* =========================================================
   ABILITY PASS
   ========================================================= */

function passToAbility() {

  if(
    game.abilityIndex >=
    game.abilityQueue.length
  ) {
    return resolveAbilities();
  }

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

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
   ROLE SCREEN
   ========================================================= */

function showRole() {

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  /*
   * SECRET INFECTION:
   *
   * If the player is Infected, show their original role.
   * They do NOT see the word "Infected".
   *
   * Their actual internal role is still "infected",
   * so they cannot use their original ability.
   */

  const displayedRole =
    p.role === "infected"
      ? p.originalRole
      : p.role;

  const data =
    ROLE_DATA[displayedRole] ||
    ROLE_DATA[p.role];

  const team =
    roleTeam(p);

  $("rolePlayerName").textContent =
    p.name;

  $("roleIcon").textContent =
    data?.icon || "❓";

  $("roleName").textContent =
    data?.name || displayedRole;

  $("roleName").className =
    `role-title ${teamClass(team)}`;

  $("roleTeam").textContent =
    `${team.toUpperCase()} TEAM`;

  $("roleTeam").className =
    `team-badge ${teamClass(team)}`;

  $("roleDescription").textContent =
    data?.desc || "";

  $("hostileList").innerHTML = "";

  /*
   * An infected player is temporarily treated as Human,
   * so don't show Hostile allies during their secret infection.
   */

  if(
    p.role !== "infected" &&
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
   ACTION SCREEN
   ========================================================= */

function showAction() {

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  $("actionTitle").textContent =
    `${ROLE_DATA[p.role]?.icon || ""} ${ROLE_DATA[p.role]?.name || ""}`;

  $("actionDescription").textContent = "";

  $("actionOptions").innerHTML = "";

  game.selectedAction = null;


  /* -------------------------------------------------------
     PLAYER CANNOT ACT
     ------------------------------------------------------- */

  if(!canAct(p)) {

    $("actionDescription").textContent =

      p.role === "diseased"

        ? "You are Diseased. You cannot use an ability."

        /*
         * DO NOT SAY "YOU ARE INFECTED".
         * The player must not learn their infection status.
         */

        : p.role === "infected"

          ? "Your ability is unavailable this round."

          : "Your ability cannot be used this round.";

    $("confirmActionButton").textContent =
      "CONTINUE";

    $("confirmActionButton").onclick =
      () => completeAbility();

    setScreen("actionScreen");

    return;
  }


  /* -------------------------------------------------------
     GENERIC CHOICE FUNCTION
     ------------------------------------------------------- */

  const choose =
    (title,desc,items) => {

      $("actionDescription").textContent =
        desc;

      $("actionOptions").innerHTML =
        items
          .map(
            o => button(o.label,o.id)
          )
          .join("");

      $("actionOptions")
        .querySelectorAll("button")
        .forEach(b => {

          b.onclick = () => {

            game.selectedAction =
              b.dataset.value;

            markSelected(
              $("actionOptions"),
              b
            );
          };
        });
    };


  /* -------------------------------------------------------
     ALIEN
     ------------------------------------------------------- */

  if(p.role === "alien") {

    /*
     * If a living Saboteur exists, Alien MUST kill.
     * Otherwise Alien can choose Kill or Sabotage.
     */

    if(
      !living().some(
        x => x.role === "saboteur"
      )
    ) {

      choose(
        "",
        "Choose Kill or Sabotage.",
        [
          {
            id:"kill",
            label:"☠️ KILL"
          },

          {
            id:"sabotage",
            label:"💥 SABOTAGE"
          }
        ]
      );

    } else {

      game.selectedAction = "kill";

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
      .forEach(b => {

        b.onclick = () => {

          if(
            b.dataset.value === "sabotage" &&
            living().some(
              x => x.role === "saboteur"
            )
          ) {
            return;
          }

          game.selectedAction =
            b.dataset.value;

          if(b.dataset.value === "kill") {

            renderTargetChoices(
              p,
              null,
              "kill"
            );

          } else {

            renderSystemChoices();
          }
        };
      });


    if(
      living().some(
        x => x.role === "saboteur"
      )
    ) {

      const sabotageButton =
        $("actionOptions")
          .querySelector(
            '[data-value="sabotage"]'
          );

      if(sabotageButton) {
        sabotageButton.style.display =
          "none";
      }

      renderTargetChoices(
        p,
        null,
        "kill"
      );
    }


  /* -------------------------------------------------------
     SABOTEUR
     ------------------------------------------------------- */

  } else if(p.role === "saboteur") {

    renderSystemChoices();


  /* -------------------------------------------------------
     SILENCER
     ------------------------------------------------------- */

  } else if(p.role === "silencer") {

    renderTargetChoices(
      p,
      null,
      "silence"
    );


  /* -------------------------------------------------------
     PARASITE
     ------------------------------------------------------- */

  } else if(p.role === "parasite") {

    if(p.hasInfected) {

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


  /* -------------------------------------------------------
     ENGINEER
     ------------------------------------------------------- */

  } else if(p.role === "engineer") {

    renderSystemChoices(true);


  /* -------------------------------------------------------
     SCIENTIST
     ------------------------------------------------------- */

  } else if(p.role === "scientist") {

    renderScientistChoices(p);


  /* -------------------------------------------------------
     DETECTIVE
     ------------------------------------------------------- */

  } else if(p.role === "detective") {

    renderTargetChoices(
      p,
      null,
      "detect"
    );


  /* -------------------------------------------------------
     MEDIC
     ------------------------------------------------------- */

  } else if(p.role === "medic") {

    renderTargetChoices(
      p,
      null,
      "protect"
    );


  /* -------------------------------------------------------
     GUARD
     ------------------------------------------------------- */

  } else if(p.role === "guard") {

    renderTargetChoices(
      p,
      null,
      "block"
    );


  /* -------------------------------------------------------
     RADIO OPERATOR
     ------------------------------------------------------- */

  } else if(p.role === "radio") {

    if(!game.systems.communications) {

      $("actionDescription").textContent =
        "Communications is OFFLINE.";

      game.selectedAction = "none";

    } else {

      /*
       * Radio Operator now has an actual choice.
       * They must press this button before confirming.
       */

      $("actionDescription").textContent =
        "Choose to receive your private transmission from Earth.";

      $("actionOptions").innerHTML =
        button(
          "📻 RECEIVE MESSAGE FROM EARTH",
          "radio"
        );

      const radioButton =
        $("actionOptions")
          .querySelector("button");

      radioButton.onclick = () => {

        game.selectedAction =
          "radio";

        markSelected(
          $("actionOptions"),
          radioButton
        );
      };
    }


  /* -------------------------------------------------------
     CAPTAIN
     ------------------------------------------------------- */

  } else if(p.role === "captain") {

    $("actionDescription").textContent =
      "Your ability is automatic only if a vote ties.";

    game.selectedAction = "none";


  /* -------------------------------------------------------
     JUDGE
     ------------------------------------------------------- */

  } else if(p.role === "judge") {

    $("actionDescription").textContent =
      "Your ability only appears after a Captain chooses a tied ejection.";

    game.selectedAction = "none";


  /* -------------------------------------------------------
     TRICKSTER
     ------------------------------------------------------- */

  } else if(p.role === "trickster") {

    if(game.tricksterUsed) {

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction = "none";

    } else {

      renderSwapChoices(p);
    }


  /* -------------------------------------------------------
     NO ABILITY
     ------------------------------------------------------- */

  } else {

    $("actionDescription").textContent =
      "No ability.";

    game.selectedAction = "none";
  }


  $("confirmActionButton").textContent =
    "CONFIRM";

  $("confirmActionButton").onclick =
    completeAbility;

  setScreen("actionScreen");
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
        o => button(o.label,o.id)
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b => {

      b.onclick = () => {

        const t =
          getPlayer(
            b.dataset.value
          );

        game.selectedAction =
          JSON.stringify({
            type:"science",
            target:t.id
          });

        $("actionOptions").innerHTML = `
          ${button("🔬 CHECK","check")}

          ${
            ["infected","diseased"].includes(t.role)
              ? button("💉 CURE","cure")
              : ""
          }
        `;

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x => {

            x.onclick = () => {

              const mode =
                x.dataset.value;

              if(mode === "check") {

                game.selectedAction =
                  JSON.stringify({
                    type:"science",
                    target:t.id,
                    mode:"check"
                  });
              }

              if(mode === "cure") {

                game.selectedAction =
                  JSON.stringify({
                    type:"science",
                    target:t.id,
                    mode:"cure"
                  });
              }

              markSelected(
                $("actionOptions"),
                x
              );
            };
          });
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
        o => button(o.label,o.id)
      )
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b => {

      b.onclick = () => {

        game.selectedAction =
          JSON.stringify({
            type:action,
            target:b.dataset.value
          });

        markSelected(
          $("actionOptions"),
          b
        );
      };
    });
}


/* =========================================================
   SYSTEM CHOICES
   ========================================================= */

function renderSystemChoices(engineer=false) {

  const systems =
    engineer

      ? Object.keys(game.systems)
          .filter(
            k => !game.systems[k]
          )

      : Object.keys(game.systems);

  if(!systems.length) {

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
    .forEach(b => {

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

        markSelected(
          $("actionOptions"),
          b
        );
      };
    });
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
    .forEach(b => {

      b.onclick = () => {

        const id =
          b.dataset.value;

        if(chosen.includes(id)) {

          chosen =
            chosen.filter(
              x => x !== id
            );

          b.classList.remove(
            "selected"
          );

          b.removeAttribute(
            "aria-pressed"
          );

          b.style.borderColor = "";

          b.style.boxShadow = "";

        } else if(chosen.length < 2) {

          chosen.push(id);

          b.classList.add(
            "selected"
          );

          b.setAttribute(
            "aria-pressed",
            "true"
          );

          b.style.borderColor =
            "#ff3b30";

          b.style.boxShadow =
            "0 0 0 2px rgba(255,59,48,.25)";
        }

        if(chosen.length === 2) {

          game.selectedAction =
            JSON.stringify({
              type:"swap",
              a:chosen[0],
              b:chosen[1]
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

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  if(!alive(p)) {

    return advanceAbility();
  }

  let action =
    game.selectedAction;

  if(
    action &&
    typeof action === "string" &&
    action.startsWith("{")
  ) {
    action =
      JSON.parse(action);
  }

  if(
    action &&
    typeof action === "object"
  ) {

    game.actions[p.id] =
      action;

    applyImmediateAction(
      p,
      action
    );

  } else if(
    action === "radio" &&
    game.systems.communications
  ) {

    game.actions[p.id] = {
      type:"radio",
      message:randomRadioMessage()
    };

  } else {

    game.actions[p.id] = {
      type:"none"
    };
  }

  advanceAbility();
}


function advanceAbility() {

  game.abilityIndex++;

  if(
    game.abilityIndex <
    game.abilityQueue.length
  ) {

    passToAbility();

  } else {

    resolveAbilities();
  }
}


/* =========================================================
   IMMEDIATE ACTIONS
   ========================================================= */

function applyImmediateAction(p,a) {

  if(a.type === "repair") {

    game.systems[a.system] =
      true;
  }

  if(a.type === "sabotage") {

    game.systems[a.system] =
      false;
  }

  if(a.type === "protect") {

    game.protectedPlayers.add(
      a.target
    );
  }

  if(a.type === "block") {

    game.blockedPlayers.add(
      a.target
    );
  }

  if(a.type === "silence") {

    game.silencedUntil[a.target] =
      Math.max(
        game.silencedUntil[a.target] || 0,
        game.round + 2
      );
  }

  if(a.type === "swap") {

    game.displaySwap = [
      a.a,
      a.b
    ];

    game.tricksterUsed = true;
  }


  /* -------------------------------------------------------
     PARASITE INFECTION
     ------------------------------------------------------- */

  if(a.type === "infect") {

    p.hasInfected = true;

    const target =
      getPlayer(a.target);

    if(
      target &&
      alive(target) &&
      !target.infectionRound &&
      !game.blockedPlayers.has(target.id)
    ) {

      target.infectionRound =
        game.round;

      /*
       * Remember their original role.
       * They will continue seeing this role privately.
       */

      target.originalRole =
        target.role;

      /*
       * Internally become Infected.
       */

      target.role =
        "infected";

      target.hasInfected =
        false;

      /*
       * IMPORTANT:
       * Do NOT give the target a reaction message.
       *
       * They must NOT know they were infected.
       */
    }
  }


  /* -------------------------------------------------------
     SCIENTIST
     ------------------------------------------------------- */

  if(a.type === "science") {

    const t =
      getPlayer(a.target);

    if(t) {

      const status =
        ROLE_DATA[t.role]?.name ||
        t.role;

      /*
       * ONLY the Scientist receives this information.
       */

      game.reactionInfo[p.id] =
        `SCIENCE: ${t.name} is ${status}.`;

      if(
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

        /*
         * Don't tell the infected player that they were infected.
         */

        if(t.id !== p.id) {

          game.reactionInfo[t.id] =
            "Your role has changed. You are now a Survivor.";
        }
      }
    }
  }


  /* -------------------------------------------------------
     DETECTIVE
     ------------------------------------------------------- */

  if(a.type === "detect") {

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


  /* -------------------------------------------------------
     RADIO
     ------------------------------------------------------- */

  if(a.type === "radio") {

    game.reactionInfo[p.id] =
      a.message;
  }
}


/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

  /*
   * Kills happen after protection/blocking is known.
   */

  const killActions =
    Object.entries(game.actions)
      .filter(
        ([,a]) =>
          a.type === "kill"
      );

  for(
    const [id,a]
    of killActions
  ) {

    const actor =
      getPlayer(id);

    const target =
      getPlayer(a.target);

    if(
      actor &&
      target &&
      alive(actor) &&
      alive(target) &&
      !game.blockedPlayers.has(actor.id)
    ) {

      if(
        !game.protectedPlayers.has(
          target.id
        )
      ) {

        target.alive =
          false;

        game.lastRoundResults.push(
          `${target.name} was killed.`
        );

        game.reactionInfo[target.id] =
          "You were killed this round.";

      } else {

        game.reactionInfo[target.id] =
          "You were attacked, but you were protected.";
      }
    }
  }


  /*
   * Infection progression:
   *
   * Round of infection = hidden Infected.
   *
   * Next full round = Diseased.
   *
   * Following full round = Parasite.
   */

  for(const p of game.players) {

    if(
      !p.alive ||
      !p.infectionRound
    ) {
      continue;
    }

    const age =
      game.round -
      p.infectionRound +
      1;


    /* -----------------------------------------------------
       INFECTION -> DISEASED
       ----------------------------------------------------- */

    if(
      age === 2 &&
      p.role === "infected"
    ) {

      p.role =
        "diseased";

      game.reactionInfo[p.id] =
        "You became DISEASED. You are on the HOSTILE TEAM.";
    }


    /* -----------------------------------------------------
       DISEASED -> PARASITE
       ----------------------------------------------------- */

    else if(
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

  if(
    !action ||
    action.type === "none"
  ) {

    return `${target.name} had no interaction last round.`;
  }

  if(action.type === "radio") {

    return `${target.name} interacted with Communications.`;
  }

  if(action.target) {

    return `${target.name} interacted with ${displayName(action.target)}.`;
  }

  if(action.system) {

    return `${target.name} interacted with ${action.system.toUpperCase()}.`;
  }

  if(action.type === "swap") {

    return `${target.name} interacted with ${displayName(action.a)} and ${displayName(action.b)}.`;
  }

  return `${target.name} had an interaction last round.`;
}


/* =========================================================
   RADIO OPERATOR MESSAGES
   ========================================================= */

function randomRadioMessage() {

  const livingPlayers =
    living();

  const hostileCount =
    livingPlayers.filter(
      isHostile
    ).length;

  const messages = [];


  /* -------------------------------------------------------
     HOSTILE COUNT CLUES
     ------------------------------------------------------- */

  if(hostileCount > 0) {

    messages.push(
      `EARTH: There are ${hostileCount} hostile${hostileCount === 1 ? "" : "s"} left.`
    );

    messages.push(
      `EARTH: There are exactly ${hostileCount} hostile${hostileCount === 1 ? "" : "s"} remaining.`
    );
  }


  /* -------------------------------------------------------
     SABOTAGE CLUES
     ------------------------------------------------------- */

  const sabotageEntries =
    Object.entries(game.actions)
      .filter(
        ([,a]) =>
          a.type === "sabotage"
      );

  if(sabotageEntries.length) {

    const entry =
      sabotageEntries[
        Math.floor(
          Math.random() *
          sabotageEntries.length
        )
      ];

    const actor =
      getPlayer(entry[0]);

    const system =
      entry[1].system.toUpperCase();

    /*
     * Create a clue containing the real saboteur
     * plus innocent players.
     *
     * Example:
     * Player 2, Player 4, Player 5 —
     * one of them made POWER OFFLINE.
     */

    const candidates =
      shuffle(
        livingPlayers.map(
          p => p.name
        )
      ).slice(
        0,
        Math.min(
          3,
          livingPlayers.length
        )
      );

    if(
      actor &&
      candidates.length &&
      !candidates.includes(actor.name)
    ) {

      candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ] = actor.name;
    }

    messages.push(
      `EARTH: ${candidates.join(", ")} — one of them made ${system} OFFLINE.`
    );

  } else if(
    livingPlayers.length >= 3
  ) {

    /*
     * If no sabotage has happened yet,
     * give a useful player-based hostile clue.
     */

    const candidates =
      shuffle(
        livingPlayers.map(
          p => p.name
        )
      ).slice(0,3);

    messages.push(
      `EARTH: ${candidates.join(", ")} — one of them is hostile.`
    );
  }


  /* -------------------------------------------------------
     FALLBACK
     ------------------------------------------------------- */

  return messages.length

    ? rand(messages)

    : "EARTH: We are monitoring the ship. Stay alert.";
}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function showReactions() {

  /*
   * IMPORTANT:
   * Use roundStartAliveIds.
   *
   * This means someone who died during this round
   * still gets their reaction result.
   */

  game.reactionQueue =
    [...game.roundStartAliveIds]
      .filter(
        id => getPlayer(id)
      );

  game.reactionIndex =
    0;

  nextReaction();
}


function nextReaction() {

  if(
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


function showReactionResult() {

  const p =
    getPlayer(
      game.reactionQueue[
        game.reactionIndex
      ]
    );

  $("reactionResultTitle").textContent =
    p.alive
      ? "ROUND RESULT"
      : "YOU DIED THIS ROUND";

  let msg =
    game.reactionInfo[p.id];

  if(!msg) {

    if(
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


function advanceReaction() {

  game.reactionIndex++;

  nextReaction();
}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {

  const systems =
    Object.entries(game.systems)
      .map(
        ([k,v]) =>
          `${v ? "🟢" : "🔴"} ${k.toUpperCase()}`
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
   VOTING
   ========================================================= */

function startVoting() {

  game.votes = {};

  game.currentVoteIndex = 0;

  game.voteResolutionDone = false;

  showVote();
}


function showVote() {

  const alivePlayers =
    living();

  if(
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
    (game.silencedUntil[p.id] || 0) >
    game.round;

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
              x => x.id !== p.id
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
    .forEach(b => {

      b.onclick = () => {

        game.selectedVote =
          b.dataset.value;

        markSelected(
          $("voteOptions"),
          b
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

  const p =
    living()[
      game.currentVoteIndex
    ];

  if(!game.selectedVote) {
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

  Object.values(game.votes)
    .forEach(v => {

      if(v !== "skip") {

        tally[v] =
          (tally[v] || 0) + 1;
      }
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

  if(tied.length === 1) {

    return finishEjection(
      tied[0],
      false
    );
  }

  if(tied.length > 1) {

    const captain =
      living().find(
        p =>
          p.role === "captain" &&
          game.systems.power &&
          !game.blockedPlayers.has(p.id)
      );

    if(captain) {

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
    .forEach(b => {

      b.onclick = () => {

        markSelected(
          $("captainTieOptions"),
          b
        );

        finishEjection(
          b.dataset.value,
          true
        );
      };
    });

  setScreen(
    "captainTieScreen"
  );
}


/* =========================================================
   EJECTION / JUDGE
   ========================================================= */

function finishEjection(
  id,
  byCaptain
) {

  if(id) {

    /*
     * Judge can cancel ANY ejection.
     * This includes Captain tie-breakers
     * and normal majority votes.
     */

    const judge =
      living().find(
        p =>
          p.role === "judge" &&
          !game.judgeUsed &&
          game.systems.power &&
          !game.blockedPlayers.has(p.id)
      );

    if(judge) {

      $("voteResultTitle").textContent =
        "VOTE PENDING";

      $("voteResultMessage").textContent =
        byCaptain
          ? "The Captain selected a player to eject. The Judge may cancel this vote."
          : "A player was selected for ejection. The Judge may cancel this vote.";

      game.pendingEjection = {
        id,
        byCaptain
      };

      $("afterVoteButton").onclick =
        () => {
          showJudgeDecision(
            id,
            byCaptain,
            judge
          );
        };

      setScreen(
        "voteResultScreen"
      );

      return;
    }

    applyEjection(
      id,
      byCaptain
    );

  } else {

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
}


/* =========================================================
   JUDGE DECISION
   ========================================================= */

function showJudgeDecision(
  id,
  byCaptain,
  judge
) {

  $("judgeDescription").textContent =
    byCaptain

      ? `The Captain selected ${displayName(id)} for ejection. Cancel the ejection or allow it.`

      : `${displayName(id)} is about to be ejected. Cancel the ejection or allow it.`;

  $("judgeCancelButton").onclick =
    judgeCancelEjection;

  $("judgeAllowButton").onclick =
    judgeAllowEjection;

  setScreen(
    "judgeScreen"
  );
}


function judgeCancelEjection() {

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


function judgeAllowEjection() {

  const pending =
    game.pendingEjection;

  game.pendingEjection =
    null;

  if(!pending) {

    return afterVoting();
  }

  applyEjection(
    pending.id,
    pending.byCaptain
  );
}


/* =========================================================
   APPLY EJECTION
   ========================================================= */

function applyEjection(
  id,
  byCaptain
) {

  const p =
    getPlayer(id);

  if(!p) {

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
   * JESTER WIN
   */

  if(p.role === "jester") {

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
   AFTER VOTING
   ========================================================= */

function afterVoting() {

  /*
   * Trickster ends ONLY after the entire voting
   * resolution has finished.
   */

  game.displaySwap =
    null;

  if(game.gameOver) {

    return showGameOver();
  }


  /*
   * Earth lifeline checkpoint every 3 rounds.
   */

  if(game.round % 3 === 0) {

    if(game.systems.communications) {

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

  let msg;

  const pool = [];

  /*
   * Exactly one Hostile is included.
   * Everyone else in the clue is non-hostile.
   */

  if(livingHostile.length) {

    pool.push(
      ...shuffle(
        livingHostile
      ).slice(0,1)
    );
  }

  pool.push(
    ...shuffle(
      others
    ).slice(0,2)
  );

  msg =
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
   SYSTEMS / STAGES
   ========================================================= */

function proceedToSystems() {

  /*
   * Engines online = progress 1 stage.
   * Engines offline = stage does not advance.
   */

  if(game.systems.engines) {

    game.stage++;
  }

  if(game.stage > 10) {

    return earthCheck();
  }

  $("systemsRound").textContent =
    `ROUND ${game.round}`;

  $("systemsStage").textContent =
    `STAGE ${game.stage} / 10`;

  $("systemsList").innerHTML =
    Object.entries(game.systems)
      .map(
        ([k,v]) =>
          `
            <div>
              ${v ? "🟢" : "🔴"}
              <strong>${k.toUpperCase()}</strong>
              —
              ${v ? "ONLINE" : "OFFLINE"}
            </div>
          `
      )
      .join("");

  $("nextRoundButton").onclick =
    () => {

      game.round++;

      game.lastRoundResults = [];

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

  if(neutrals.length) {

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

  if(game.gameOver) {

    return true;
  }

  const host =
    living().filter(
      isHostile
    ).length;

  const nonHost =
    living().filter(
      p => !isHostile(p)
    ).length;


  /*
   * Hostiles win when they equal or outnumber
   * everyone else alive.
   */

  if(
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
   * Survivor King wins if one of the final
   * two living players.
   */

  const neutrals =
    living().filter(
      isNeutral
    );

  if(
    living().length === 2 &&
    neutrals.length
  ) {

    const kings =
      neutrals.filter(
        p => p.role === "king"
      );

    if(kings.length) {

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
   GAME OVER
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
        p =>
          `
            <div class="${p.alive ? "" : "dead"}">

              <strong>
                ${esc(p.name)}
              </strong>

              —
              ${ROLE_DATA[p.role]?.icon || ""}
              ${ROLE_DATA[p.role]?.name || p.role}

              <span class="team-${teamClass(roleTeam(p))}">
                [${roleTeam(p)}]
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
      HOSTILES
    ],

    [
      "HUMAN",
      HUMANS
    ],

    [
      "NEUTRAL",
      ["jester","king"]
    ],

    [
      "INFECTION / SUB-ROLES",
      ["infected","diseased","parasite"]
    ],

    [
      "ROLE CONCEPT",
      ["trickster"]
    ]
  ];

  $("roleGuideContent").innerHTML =
    sections
      .map(
        ([title,roles]) =>
          `
            <section>

              <h3>
                ${title}
              </h3>

              ${
                roles
                  .map(
                    r =>
                      `
                        <article
                          class="guide-card ${teamClass(ROLE_DATA[r].team)}"
                        >

                          <div class="guide-icon">
                            ${ROLE_DATA[r].icon}
                          </div>

                          <div>

                            <strong>
                              ${ROLE_DATA[r].name}
                            </strong>

                            <div class="guide-team">
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
        ([title,roles]) =>
          `
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
                              value="${settings.counts[r] || 0}"
                              data-role-count="${r}"
                              ${locked ? "readonly" : ""}
                            >
                          </label>

                          <label class="switch">

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
                              ${locked ? "disabled" : ""}
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


  $("customRoleContent")
    .querySelectorAll(
      "[data-role-enabled]"
    )
    .forEach(el => {

      el.onchange = () => {

        settings.enabled[
          el.dataset.roleEnabled
        ] = el.checked;

        if(!el.checked) {

          settings.counts[
            el.dataset.roleEnabled
          ] = 0;
        }

        renderCustomRoles();

        renderSetup();
      };
    });


  $("customRoleContent")
    .querySelectorAll(
      "[data-role-count]"
    )
    .forEach(el => {

      el.onchange = () => {

        settings.counts[
          el.dataset.roleCount
        ] =
          Math.max(
            0,
            Math.min(
              1,
              Number(el.value) || 0
            )
          );

        if(
          settings.counts[
            el.dataset.roleCount
          ] > 0
        ) {

          settings.enabled[
            el.dataset.roleCount
          ] = true;
        }

        updatePlayerValidity();
      };
    });
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
    ([r,c]) => {

      for(
        let i=0;
        i<c;
        i++
      ) {

        selected.push(r);
      }
    }
  );


  if(selected.length !== n) {

    return alert(
      `Custom roles must total exactly ${n} players. Current total: ${selected.length}.`
    );
  }

  if(!selected.includes("engineer")) {

    return alert(
      "Engineer is required."
    );
  }

  if(
    selected.filter(
      r => HOSTILES.includes(r)
    ).length !== HOSTILE_COUNTS[n]
  ) {

    return alert(
      `You need exactly ${HOSTILE_COUNTS[n]} Hostile role(s).`
    );
  }

  game.randomRoles =
    Object.fromEntries(
      shuffle(selected)
        .map(
          (r,i) => [i,r]
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
   */

  const playerCount =
    $("playerCount");

  if(!playerCount) return;

  playerCount.onchange =
    resetSetupPlayers;

  if(!game.players.length) {

    resetSetupPlayers();

  } else {

    renderSetup();
  }


  $("randomRolesButton").type =
    "button";

  $("randomRolesButton").onclick =
    e => {

      e.preventDefault();

      randomiseRoles();
    };


  $("startGameButton").onclick =
    e => {

      e.preventDefault();

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


  document
    .querySelectorAll("[data-close]")
    .forEach(
      b =>
        b.onclick =
          () =>
            closeModal(
              b.dataset.close
            )
    );


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


  /*
   * Judge buttons are also bound here so
   * mobile works reliably.
   */

  $("judgeCancelButton").onclick =
    judgeCancelEjection;

  $("judgeAllowButton").onclick =
    judgeAllowEjection;
}


/* =========================================================
   START
   ========================================================= */

if(
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initGameUI,
    {once:true}
  );

} else {

  initGameUI();
}
