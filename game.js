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
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
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
    desc:"Receive a private message from Earth while Communications is online."
  },

  judge:{
    icon:"⚖️",
    name:"Judge",
    team:"Human",
    desc:"Once per game, cancel ANY vote that would eject a player."
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
    desc:"You are now Diseased and on the Hostile Team. You cannot use an ability."
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
   ROLE COUNTS
   ========================================================= */

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


/* =========================================================
   HUMAN RANDOM WEIGHTS
   ========================================================= */

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

  enabled:Object.fromEntries(
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

  counts:Object.fromEntries(
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

  players:[],

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

  pendingEjection:null,

  systems:{

    engines:true,

    o2:true,

    communications:true,

    power:true

  }

};


/* =========================================================
   TEAM HELPERS
   ========================================================= */

function teamClass(team){

  if(team === "Human") return "human";

  if(team === "Hostile") return "hostile";

  if(team === "Neutral") return "neutral";

  return "infection";

}


/*
   IMPORTANT:

   Infected is still secretly Human until they
   actually become Diseased.
*/

function roleTeam(roleOrPlayer){

  const role =
    typeof roleOrPlayer === "string"
      ? roleOrPlayer
      : roleOrPlayer?.role;

  if(role === "infected")
    return "Human";

  if(role === "diseased")
    return "Hostile";

  return ROLE_DATA[role]?.team || "Human";

}

function isHostile(p){

  return alive(p) &&
    roleTeam(p) === "Hostile";

}

function isNeutral(p){

  return alive(p) &&
    roleTeam(p) === "Neutral";

}

function isHuman(p){

  return alive(p) &&
    roleTeam(p) === "Human";

}


/* =========================================================
   PLAYER HELPERS
   ========================================================= */

function getPlayer(id){

  return game.players.find(
    p => p.id === id
  );

}

function living(){

  return game.players.filter(alive);

}

function activeRole(p){

  return ROLE_DATA[p.role];

}


/* =========================================================
   ABILITY AVAILABILITY
   ========================================================= */

function canAct(p){

  if(!alive(p))
    return false;

  /*
     Engineer always works, even with
     Power offline.
  */
  if(p.role === "engineer")
    return true;

  /*
     These roles have no usable ability.
  */
  if(
    p.role === "diseased" ||
    p.role === "infected" ||
    p.role === "survivor" ||
    p.role === "jester" ||
    p.role === "king"
  ){

    return false;

  }

  /*
     Power disables abilities.
  */
  if(!game.systems.power)
    return false;

  /*
     Guarded players cannot use abilities.
  */
  if(game.blockedPlayers.has(p.id))
    return false;

  /*
     Judge can only be used once.
  */
  if(
    p.role === "judge" &&
    game.judgeUsed
  ){

    return false;

  }

  return true;

}


/* =========================================================
   DISPLAY / TRICKSTER HELPERS
   ========================================================= */

function realName(id){

  return getPlayer(id)?.name || "";

}

function displayMap(){

  const map = Object.fromEntries(
    living().map(p => [
      p.id,
      p.id
    ])
  );

  if(game.displaySwap){

    const [a,b] =
      game.displaySwap;

    if(
      map[a] &&
      map[b]
    ){

      map[a] = b;
      map[b] = a;

    }

  }

  return map;

}

function displayName(id){

  return realName(
    displayMap()[id]
  );

}


/*
   Converts a displayed player name back
   to the real underlying player ID.
*/

function displayIdFromName(name){

  const map = displayMap();

  const hit =
    Object.entries(map).find(
      ([,realId]) =>
        realName(realId) === name
    );

  return hit
    ? hit[0]
    : null;

}


/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(
  actor = null,
  excludeId = null
){

  return living()

    .filter(p => {

      if(
        p.id === excludeId
      ){

        return false;

      }

      /*
         Hostiles normally cannot target
         other Hostiles.

         Trickster can cause a displayed identity
         to make this look different.
      */

      if(
        actor &&
        roleTeam(actor) === "Hostile" &&
        isHostile(p) &&
        !(
          game.displaySwap &&
          game.displaySwap.includes(p.id)
        )
      ){

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
   RESET ROUND-ONLY STATE
   ========================================================= */

function resetTransient(){

  game.actions = {};

  game.blockedPlayers =
    new Set();

  game.protectedPlayers =
    new Set();

  game.selectedAction =
    null;

  game.reactionInfo =
    {};

}


/* =========================================================
   SCREEN CONTROL
   ========================================================= */

function setScreen(id){

  document
    .querySelectorAll(".screen")
    .forEach(s =>
      s.classList.remove("active")
    );

  $(id)?.classList.add("active");

  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   BUTTON HTML
   ========================================================= */

function button(
  text,
  value,
  cls = "choice-button"
){

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

function showSetup(){

  setScreen(
    "setupScreen"
  );

  renderSetup();

}


function renderSetup(){

  $("playersSetup").innerHTML =
    game.players.length

      ? game.players.map((p,i) => `

        <div class="setup-player">

          <label>
            Player ${i + 1}

            <input
              class="player-name-input"
              type="text"
              maxlength="20"
              value="${esc(p.name)}"
              data-name-index="${i}"
              autocomplete="off"
              placeholder="Player ${i + 1}"
            >

          </label>

          <label>

            Role

            <select
              class="role-select ${
                game.randomisedRoles &&
                game.randomRoles[i]
                  ? "random-hidden"
                  : ""
              }"
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

                .filter(
                  r =>
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

  bindSetupNames();

  bindSetupSelects();

}


/* =========================================================
   PLAYER NAME INPUTS
   ========================================================= */

function bindSetupNames(){

  document
    .querySelectorAll(
      ".player-name-input"
    )
    .forEach(input => {

      input.oninput = () => {

        const i =
          Number(
            input.dataset.nameIndex
          );

        if(!game.players[i])
          return;

        game.players[i].name =
          input.value
            .slice(0,20);

      };


      input.onblur = () => {

        const i =
          Number(
            input.dataset.nameIndex
          );

        if(!game.players[i])
          return;

        const trimmed =
          input.value.trim();

        game.players[i].name =
          trimmed ||
          `Player ${i + 1}`;

        input.value =
          game.players[i].name;

      };

    });

}


/* =========================================================
   ROLE SELECTS
   ========================================================= */

function bindSetupSelects(){

  document
    .querySelectorAll(
      ".role-select"
    )
    .forEach(select => {

      select.onchange = () => {

        const i =
          Number(
            select.dataset.index
          );

        const value =
          select.value;

        if(value === "random")
          return;

        /*
           Prevent duplicate starting roles.
        */

        const alreadyUsed =
          Object.entries(
            game.randomRoles
          ).some(
            ([index,role]) =>
              Number(index) !== i &&
              role === value
          );

        if(alreadyUsed){

          alert(
            `${ROLE_DATA[value].name} is already assigned to another player.`
          );

          select.value =
            "random";

          return;

        }

        game.randomisedRoles =
          true;

        game.randomRoles[i] =
          value;

        select.value =
          "random";

        select.classList.add(
          "random-hidden"
        );

      };

    });

}


/* =========================================================
   RESET PLAYERS WHEN PLAYER COUNT CHANGES
   ========================================================= */

function resetSetupPlayers(){

  const n =
    Number(
      $("playerCount").value
    );

  game.players =
    Array.from(
      {length:n},
      (_,i) => ({

        id:`p${i + 1}`,

        name:`Player ${i + 1}`,

        role:"survivor",

        alive:true,

        originalRole:"survivor",

        infectionRound:null,

        hasInfected:false

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

function updatePlayerValidity(){

  const n =
    game.players.length;

  const total =
    Object.values(
      settings.counts
    ).reduce(
      (a,b) => a + b,
      0
    );

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

function weightedPick(
  items,
  weights
){

  const total =
    items.reduce(
      (s,k) =>
        s + (weights[k] || 0),
      0
    );

  let r =
    Math.random() *
    total;

  for(
    const k of items
  ){

    r -=
      weights[k] || 0;

    if(r < 0)
      return k;

  }

  return items[
    items.length - 1
  ];

}


/* =========================================================
   RANDOM ROLE GENERATION
   ========================================================= */

function randomiseRoles(){

  const n =
    game.players.length;

  const h =
    HOSTILE_COUNTS[n];

  if(!h)
    return;

  const enabledHostiles =
    HOSTILES.filter(
      r => settings.enabled[r]
    );

  if(
    enabledHostiles.length < h
  ){

    alert(
      "Enable enough Hostile roles to fill the random setup."
    );

    return;

  }


  const enabledHumans =
    HUMANS.filter(
      r =>
        settings.enabled[r] ||
        r === "engineer"
    );

  if(
    enabledHumans.length <
    n - h
  ){

    alert(
      "Enable enough Human roles to fill the random setup."
    );

    return;

  }


  let roles = [];


  /*
     HOSTILES
  */

  const hostile =
    shuffle(
      enabledHostiles
    ).slice(0,h);

  roles.push(
    ...hostile
  );


  /*
     ENGINEER ALWAYS PRESENT
  */

  roles.push(
    "engineer"
  );


  /*
     HUMAN ROLES
  */

  const humanNeeded =
    n - h - 1;

  let pool =
    enabledHumans.filter(
      r => r !== "engineer"
    );

  if(
    pool.length <
    humanNeeded
  ){

    alert(
      "Not enough enabled Human roles for this player count."
    );

    return;

  }


  for(
    let i = 0;
    i < humanNeeded;
    i++
  ){

    const pick =
      weightedPick(
        pool,
        HUMAN_WEIGHTS
      );

    roles.push(
      pick
    );

    pool =
      pool.filter(
        r => r !== pick
      );

  }


  /*
     NEUTRAL SLOTS
  */

  const neutralSlots =
    n - roles.length;

  if(neutralSlots > 0){

    const enabledNeutral =
      [
        ...NEUTRALS,
        ...CONCEPTS
      ].filter(
        r => settings.enabled[r]
      );

    if(
      enabledNeutral.length <
      neutralSlots
    ){

      alert(
        "Enable enough Neutral roles, or use manual role counts."
      );

      return;

    }

    roles.push(
      ...shuffle(
        enabledNeutral
      ).slice(
        0,
        neutralSlots
      )
    );

  }


  /*
     SHUFFLE PLAYER ASSIGNMENTS
  */

  roles =
    shuffle(roles);


  game.randomRoles =
    Object.fromEntries(
      roles.map(
        (r,i) => [i,r]
      )
    );

  game.randomisedRoles =
    true;

  renderSetup();

}


/* =========================================================
   START GAME
   ========================================================= */

function startGame(){

  const n =
    game.players.length;

  const h =
    HOSTILE_COUNTS[n];


  let roles;


  if(game.randomisedRoles){

    roles =
      Array.from(
        {length:n},
        (_,i) =>
          game.randomRoles[i]
      );

  } else {

    roles =
      Array.from(
        {length:n},
        (_,i) =>
          game.players[i].role
      );

  }


  if(
    roles.includes("random") ||
    roles.some(r => !r)
  ){

    alert(
      "Choose roles or press RANDOMISE ROLES first."
    );

    return;

  }


  /*
     No duplicate starting roles.
  */

  const duplicates =
    roles.filter(
      (r,i) =>
        roles.indexOf(r) !== i
    );

  if(duplicates.length){

    alert(
      "Starting roles cannot be duplicated."
    );

    return;

  }


  /*
     Engineer is mandatory.
  */

  if(
    roles.filter(
      r => r === "engineer"
    ).length !== 1
  ){

    alert(
      "There must be exactly 1 Engineer."
    );

    return;

  }


  /*
     Exact hostile count.
  */

  const hostileCount =
    roles.filter(
      r => HOSTILES.includes(r)
    ).length;

  if(
    hostileCount !== h
  ){

    alert(
      `This setup needs exactly ${h} Hostile role(s).`
    );

    return;

  }


  /*
     Validate all roles.
  */

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

  if(!valid){

    alert(
      "A disabled role is selected."
    );

    return;

  }


  /*
     Apply roles.
  */

  game.players.forEach(
    (p,i) => {

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
     Reset game.
  */

  game.round = 1;

  game.stage = 1;

  game.gameOver = false;

  game.lifelineNumber = 0;

  game.judgeUsed = false;

  game.tricksterUsed = false;

  game.displaySwap = null;

  game.pendingEjection = null;

  game.lastRoundResults = [];


  game.systems = {

    engines:true,

    o2:true,

    communications:true,

    power:true

  };


  resetTransient();

  startRound();

}


/* =========================================================
   START ROUND
   ========================================================= */

function startRound(){

  if(
    checkVictory()
  ){

    return;

  }


  /*
     IMPORTANT:
     Save previous round actions BEFORE
     resetting the current round.
  */

  game.previousActions =
    {
      ...game.actions
    };


  resetTransient();


  /*
     Snapshot everyone alive at the START
     of the round.

     This means someone killed during the
     round still gets their Reaction result.
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
   ABILITY PASS SCREEN
   ========================================================= */

function passToAbility(){

  if(
    game.abilityIndex >=
    game.abilityQueue.length
  ){

    return resolveAbilities();

  }


  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if(!p)
    return advanceAbility();


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

function showRole(){

  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if(!p)
    return;


  $("rolePlayerName").textContent =
    p.name;


  /*
     SECRET INFECTION:

     An Infected player sees their
     ORIGINAL role, not "Infected".
  */

  const visibleRole =
    p.role === "infected"
      ? p.originalRole
      : p.role;


  const roleData =
    ROLE_DATA[
      visibleRole
    ];


  const team =
    roleTeam(p);


  $("roleIcon").textContent =
    roleData?.icon ||
    "❓";


  $("roleName").textContent =
    roleData?.name ||
    visibleRole;


  $("roleName").className =
    `role-title ${teamClass(team)}`;


  $("roleTeam").textContent =
    `${team.toUpperCase()} TEAM`;


  $("roleTeam").className =
    `team-badge ${teamClass(team)}`;


  /*
     FORCE the requested colours.
  */

  if(team === "Human"){

    $("roleName").style.color =
      "#00ff66";

    $("roleTeam").style.color =
      "#00ff66";

  }

  else if(team === "Neutral"){

    $("roleName").style.color =
      "#ffffff";

    $("roleTeam").style.color =
      "#ffffff";

  }

  else if(team === "Hostile"){

    $("roleName").style.color =
      "#ff3b30";

    $("roleTeam").style.color =
      "#ff3b30";

  }


  $("roleDescription").textContent =
    roleData?.desc ||
    "";


  $("hostileList").innerHTML =
    "";


  /*
     Hostiles see their Hostile allies.
  */

  if(team === "Hostile"){

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

            ${allies
              .map(
                x =>
                  `${
                    ROLE_DATA[x.role]?.icon ||
                    "❓"
                  } ${esc(x.name)}`
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
   SHOW ACTION
   ========================================================= */

function showAction(){

  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if(!p)
    return;


  $("actionTitle").textContent =
    `${
      ROLE_DATA[p.role]?.icon ||
      ""
    } ${
      ROLE_DATA[p.role]?.name ||
      ""
    }`;


  $("actionDescription").textContent =
    "";


  $("actionOptions").innerHTML =
    "";


  game.selectedAction =
    null;


  /*
     No ability available.
  */

  if(!canAct(p)){

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


    setScreen(
      "actionScreen"
    );

    return;

  }


  /*
     ALIEN
  */

  if(p.role === "alien"){

    const saboteurAlive =
      living().some(
        x => x.role === "saboteur"
      );


    $("actionDescription").textContent =
      saboteurAlive
        ? "A living Saboteur exists, so you can only kill."
        : "Choose Kill or Sabotage.";


    $("actionOptions").innerHTML = `

      <button
        type="button"
        class="choice-button"
        data-value="kill"
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
              data-value="sabotage"
            >
              💥 SABOTAGE
            </button>
          `
      }

    `;


    $("actionOptions")
      .querySelectorAll("button")
      .forEach(b => {

        b.onclick = () => {

          const mode =
            b.dataset.value;


          game.selectedAction =
            mode;


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


          if(mode === "kill"){

            renderTargetChoices(
              p,
              null,
              "kill"
            );

          }

          else if(
            mode === "sabotage"
          ){

            renderSystemChoices();

          }

        };

      });


    /*
       Saboteur alive means kill only.
    */

    if(saboteurAlive){

      renderTargetChoices(
        p,
        null,
        "kill"
      );

    }

  }


  /*
     SABOTEUR
  */

  else if(
    p.role === "saboteur"
  ){

    renderSystemChoices();

  }


  /*
     SILENCER
  */

  else if(
    p.role === "silencer"
  ){

    renderTargetChoices(
      p,
      null,
      "silence"
    );

  }


  /*
     PARASITE
  */

  else if(
    p.role === "parasite"
  ){

    if(p.hasInfected){

      $("actionDescription").textContent =
        "You already used your infection.";

      $("confirmActionButton").textContent =
        "CONTINUE";

      $("confirmActionButton").onclick =
        completeAbility;

      setScreen(
        "actionScreen"
      );

      return;

    }


    renderTargetChoices(
      p,
      null,
      "infect"
    );

  }


  /*
     ENGINEER
  */

  else if(
    p.role === "engineer"
  ){

    renderSystemChoices(
      true
    );

  }


  /*
     SCIENTIST
  */

  else if(
    p.role === "scientist"
  ){

    renderScientistChoices(p);

  }


  /*
     DETECTIVE
  */

  else if(
    p.role === "detective"
  ){

    renderTargetChoices(
      p,
      null,
      "detect"
    );

  }


  /*
     MEDIC
  */

  else if(
    p.role === "medic"
  ){

    renderTargetChoices(
      p,
      null,
      "protect"
    );

  }


  /*
     GUARD
  */

  else if(
    p.role === "guard"
  ){

    renderTargetChoices(
      p,
      null,
      "block"
    );

  }


  /*
     RADIO
  */

  else if(
    p.role === "radio"
  ){

    if(
      !game.systems.communications
    ){

      $("actionDescription").textContent =
        "Communications is OFFLINE.";

      game.selectedAction =
        "none";

    }

    else {

      $("actionDescription").textContent =
        "Press CONFIRM to receive a private message from Earth.";

      game.selectedAction =
        "radio";

    }

  }


  /*
     CAPTAIN
  */

  else if(
    p.role === "captain"
  ){

    $("actionDescription").textContent =
      "Your ability is automatic if a vote ties.";

    game.selectedAction =
      "none";

  }


  /*
     JUDGE
  */

  else if(
    p.role === "judge"
  ){

    $("actionDescription").textContent =
      "Your ability activates privately if a vote would eject someone.";

    game.selectedAction =
      "none";

  }


  /*
     TRICKSTER
  */

  else if(
    p.role === "trickster"
  ){

    if(game.tricksterUsed){

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction =
        "none";

    }

    else {

      renderSwapChoices(p);

    }

  }


  else {

    $("actionDescription").textContent =
      "No ability.";

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
   SCIENTIST CHOICES
   ========================================================= */

function renderScientistChoices(p){

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
    .forEach(b => {

      b.onclick = () => {

        const t =
          getPlayer(
            b.dataset.value
          );

        if(!t)
          return;


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
          .forEach(x => {

            x.onclick = () => {

              const mode =
                x.dataset.value;


              game.selectedAction =
                JSON.stringify({

                  type:"science",

                  target:t.id,

                  mode

                });


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
){

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

  }[action] ||
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
    .forEach(b => {

      b.onclick = () => {

        game.selectedAction =
          JSON.stringify({

            type:action,

            target:b.dataset.value

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

      };

    });

}


/* =========================================================
   SYSTEM CHOICES
   ========================================================= */

function renderSystemChoices(
  engineer = false
){

  const systems =
    engineer

      ? Object.keys(
          game.systems
        ).filter(
          k =>
            !game.systems[k]
        )

      : Object.keys(
          game.systems
        );


  if(!systems.length){

    $("actionDescription").textContent =
      engineer
        ? "There are no offline systems to repair."
        : "No systems are available.";

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
            `${
              game.systems[k]
                ? "🟢"
                : "🔴"
            } ${k.toUpperCase()}`,
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

      };

    });

}


/* =========================================================
   TRICKSTER
   ========================================================= */

function renderSwapChoices(p){

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


        if(
          chosen.includes(id)
        ){

          chosen =
            chosen.filter(
              x => x !== id
            );

          b.classList.remove(
            "selected"
          );

        }

        else if(
          chosen.length < 2
        ){

          chosen.push(id);

          b.classList.add(
            "selected"
          );

        }


        if(
          chosen.length === 2
        ){

          game.selectedAction =
            JSON.stringify({

              type:"swap",

              a:chosen[0],

              b:chosen[1]

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

function completeAbility(){

  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  if(!p)
    return advanceAbility();


  if(!alive(p))
    return advanceAbility();


  let action =
    game.selectedAction;


  /*
     Parse JSON actions.
  */

  if(
    action &&
    typeof action === "string" &&
    action.startsWith("{")
  ){

    try {

      action =
        JSON.parse(action);

    }

    catch{

      action = null;

    }

  }


  if(
    action &&
    typeof action === "object"
  ){

    game.actions[p.id] =
      action;

  }

  else if(
    action === "radio" &&
    game.systems.communications
  ){

    game.actions[p.id] = {

      type:"radio",

      message:
        randomRadioMessage()

    };

  }

  else {

    game.actions[p.id] = {

      type:"none"

    };

  }


  advanceAbility();

}


/* =========================================================
   ADVANCE ABILITY
   ========================================================= */

function advanceAbility(){

  game.abilityIndex++;

  if(
    game.abilityIndex <
    game.abilityQueue.length
  ){

    passToAbility();

  }

  else {

    resolveAbilities();

  }

}


/* =========================================================
   RESOLVE ALL ABILITIES
   ========================================================= */

function resolveAbilities(){

  /*
     STEP 1:
     Resolve Guard blocks FIRST.

     This guarantees Guard can block a player
     regardless of ability order.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "block"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      actor &&
      target &&
      alive(actor) &&
      alive(target) &&
      canGuardAct(actor)
    ){

      game.blockedPlayers.add(
        target.id
      );

    }

  }


  /*
     STEP 2:
     Resolve protection.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "protect"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      actor &&
      target &&
      alive(actor) &&
      alive(target) &&
      !game.blockedPlayers.has(
        actor.id
      )
    ){

      game.protectedPlayers.add(
        target.id
      );

    }

  }


  /*
     STEP 3:
     Resolve repairs and sabotage.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    const actor =
      getPlayer(actorId);


    if(
      !actor ||
      !alive(actor) ||
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    if(
      action.type === "repair"
    ){

      if(
        actor.role === "engineer"
      ){

        game.systems[
          action.system
        ] = true;

      }

    }


    if(
      action.type === "sabotage"
    ){

      if(
        [
          "alien",
          "saboteur"
        ].includes(
          actor.role
        )
      ){

        game.systems[
          action.system
        ] = false;

      }

    }

  }


  /*
     STEP 4:
     Resolve silence.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "silence"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      actor &&
      target &&
      alive(actor) &&
      alive(target) &&
      !game.blockedPlayers.has(
        actor.id
      )
    ){

      game.silencedUntil[
        target.id
      ] =
        Math.max(
          game.silencedUntil[
            target.id
          ] || 0,

          game.round + 2
        );

    }

  }


  /*
     STEP 5:
     Resolve Trickster.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "swap"
    )
      continue;


    const actor =
      getPlayer(actorId);


    if(
      !actor ||
      !alive(actor) ||
      actor.role !== "trickster" ||
      game.blockedPlayers.has(
        actor.id
      ) ||
      game.tricksterUsed
    )
      continue;


    const a =
      getPlayer(action.a);

    const b =
      getPlayer(action.b);


    if(
      a &&
      b &&
      alive(a) &&
      alive(b) &&
      a.id !== b.id
    ){

      game.displaySwap =
        [
          a.id,
          b.id
        ];

      game.tricksterUsed =
        true;

    }

  }


  /*
     STEP 6:
     Resolve infection.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "infect"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      !actor ||
      !target ||
      !alive(actor) ||
      !alive(target)
    )
      continue;


    if(
      actor.role !== "parasite"
    )
      continue;


    if(
      actor.hasInfected
    )
      continue;


    if(
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    /*
       Cannot infect an already infected/
       diseased/parasite player.
    */

    if(
      target.infectionRound !== null ||
      [
        "infected",
        "diseased",
        "parasite"
      ].includes(
        target.role
      )
    )
      continue;


    actor.hasInfected =
      true;

    target.infectionRound =
      game.round;

    target.originalRole =
      target.role;

    /*
       IMPORTANT:
       Target's role is secretly changed.
       Their role screen still shows their
       original role.
    */

    target.role =
      "infected";

  }


  /*
     STEP 7:
     Resolve Scientist.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "science"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      !actor ||
      !target ||
      !alive(actor) ||
      !alive(target)
    )
      continue;


    if(
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    let status;


    if(
      target.role === "infected"
    ){

      status =
        "Infected";

    }

    else if(
      target.role === "diseased"
    ){

      status =
        "Diseased";

    }

    else if(
      target.role === "parasite"
    ){

      status =
        "Parasite";

    }

    else {

      status =
        "Healthy";

    }


    game.reactionInfo[
      actor.id
    ] =
      `SCIENCE: ${target.name} is ${status}.`;


    /*
       Cure.
    */

    if(
      action.mode === "cure" &&
      [
        "infected",
        "diseased"
      ].includes(
        target.role
      )
    ){

      target.role =
        "survivor";

      target.infectionRound =
        null;

      target.hasInfected =
        false;


      game.reactionInfo[
        actor.id
      ] =
        `SCIENCE: ${target.name} was cured and is now a Survivor.`;

    }

  }


  /*
     STEP 8:
     Resolve Detective.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "detect"
    )
      continue;


    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      !actor ||
      !target ||
      !alive(actor) ||
      !alive(target)
    )
      continue;


    if(
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    const previous =
      game.previousActions[
        target.id
      ];


    game.reactionInfo[
      actor.id
    ] =
      detectiveMessage(
        target,
        previous
      );

  }


  /*
     STEP 9:
     Resolve Radio.
  */

  for(
    const [actorId,action]
    of Object.entries(
      game.actions
    )
  ){

    if(
      action.type !== "radio"
    )
      continue;


    const actor =
      getPlayer(actorId);


    if(
      !actor ||
      !alive(actor) ||
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    if(
      game.systems.communications
    ){

      game.reactionInfo[
        actor.id
      ] =
        action.message;

    }

  }


  /*
     STEP 10:
     Resolve kills LAST.

     This lets Medic protection work correctly.
  */

  const killActions =
    Object.entries(
      game.actions
    ).filter(
      ([,a]) =>
        a.type === "kill"
    );


  for(
    const [actorId,action]
    of killActions
  ){

    const actor =
      getPlayer(actorId);

    const target =
      getPlayer(action.target);


    if(
      !actor ||
      !target ||
      !alive(actor) ||
      !alive(target)
    )
      continue;


    if(
      game.blockedPlayers.has(
        actor.id
      )
    )
      continue;


    /*
       Kills can only be performed by Alien.
    */

    if(
      actor.role !== "alien"
    )
      continue;


    if(
      game.protectedPlayers.has(
        target.id
      )
    ){

      game.reactionInfo[
        target.id
      ] =
        "You were attacked, but you were protected.";

      continue;

    }


    target.alive =
      false;


    game.lastRoundResults.push(
      `${target.name} was killed.`
    );


    game.reactionInfo[
      target.id
    ] =
      "You were killed this round.";

  }


  /*
     STEP 11:
     Infection progression.

     Round infected = hidden
     Next round = Diseased
     Following round = Parasite
  */

  for(
    const p of game.players
  ){

    if(
      !p.alive ||
      !p.infectionRound
    )
      continue;


    const age =
      game.round -
      p.infectionRound +
      1;


    if(
      age === 2 &&
      p.role === "infected"
    ){

      p.role =
        "diseased";


      game.reactionInfo[
        p.id
      ] =
        "You became DISEASED. You are on the HOSTILE TEAM.";

    }

    else if(
      age >= 3 &&
      p.role === "diseased"
    ){

      p.role =
        "parasite";

      p.hasInfected =
        false;


      game.reactionInfo[
        p.id
      ] =
        "You became a PARASITE. You are on the HOSTILE TEAM.";

    }

  }


  showReactions();

}


/* =========================================================
   GUARD CHECK
   ========================================================= */

function canGuardAct(p){

  if(!p || !alive(p))
    return false;

  if(
    p.role !== "guard"
  )
    return false;

  if(
    game.systems.power === false
  )
    return false;

  return true;

}


/* =========================================================
   DETECTIVE MESSAGE
   ========================================================= */

function detectiveMessage(
  target,
  action
){

  if(
    !action ||
    action.type === "none"
  ){

    return `${target.name} had no interaction last round.`;

  }


  if(
    action.type === "radio"
  ){

    return `${target.name} interacted with Communications.`;

  }


  if(
    action.target
  ){

    return `${target.name} interacted with ${displayName(action.target)}.`;

  }


  if(
    action.system
  ){

    return `${target.name} interacted with ${action.system.toUpperCase()}.`;

  }


  if(
    action.type === "swap"
  ){

    return `${target.name} interacted with ${displayName(action.a)} and ${displayName(action.b)}.`;

  }


  return `${target.name} had an interaction last round.`;

}


/* =========================================================
   RADIO MESSAGES
   ========================================================= */

function randomRadioMessage(){

  const hostiles =
    living().filter(
      isHostile
    );


  const systemsOffline =
    Object.entries(
      game.systems
    )
    .filter(
      ([,online]) =>
        !online
    )
    .map(
      ([name]) =>
        name.toUpperCase()
    );


  const messages = [];


  /*
     Exact hostile count.
  */

  messages.push(
    `EARTH: There are exactly ${hostiles.length} hostiles remaining.`
  );


  /*
     If something is offline, identify
     players who interacted with that system
     last round.
  */

  if(
    systemsOffline.length
  ){

    const system =
      rand(
        systemsOffline
      );


    const systemKey =
      system.toLowerCase();


    const actors =
      game.previousActions
        ? Object.entries(
            game.previousActions
          )
          .filter(
            ([,a]) =>
              a?.system === systemKey
          )
          .map(
            ([id]) =>
              getPlayer(id)
          )
          .filter(Boolean)
        : [];


    if(actors.length >= 2){

      messages.push(
        `EARTH: ${actors.slice(0,3).map(p => p.name).join(", ")} — one of them made ${system} OFFLINE.`
      );

    }

  }


  /*
     Give a concrete hostile clue.
  */

  if(hostiles.length){

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


    if(
      sample.length >= 2
    ){

      /*
         Ensure exactly one listed player
         is hostile where possible.
      */

      const hostile =
        rand(hostiles);


      const humans =
        living().filter(
          p =>
            p.id !== hostile.id &&
            !isHostile(p)
        );


      const others =
        shuffle(humans).slice(
          0,
          2
        );


      const clue =
        shuffle([
          hostile,
          ...others
        ]);


      messages.push(
        `EARTH: ${clue.map(p => p.name).join(", ")} — one of them is hostile.`
      );

    }

  }


  messages.push(
    "EARTH: Communications is stable. Stay alert."
  );


  return rand(
    messages
  );

}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function showReactions(){

  /*
     Everyone alive at START of the round
     gets a reaction result, even if they
     died during the round.
  */

  game.reactionQueue =
    [
      ...game.roundStartAliveIds
    ].filter(
      id =>
        getPlayer(id)
    );


  game.reactionIndex =
    0;


  nextReaction();

}


function nextReaction(){

  if(
    game.reactionIndex >=
    game.reactionQueue.length
  ){

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


/* =========================================================
   REACTION RESULT
   ========================================================= */

function showReactionResult(){

  const p =
    getPlayer(
      game.reactionQueue[
        game.reactionIndex
      ]
    );


  if(!p)
    return advanceReaction();


  $("reactionResultTitle").textContent =
    p.alive
      ? "ROUND RESULT"
      : "YOU DIED THIS ROUND";


  let msg =
    game.reactionInfo[
      p.id
    ];


  if(!msg){

    if(
      game.silencedUntil[p.id] &&
      game.silencedUntil[p.id] >
        game.round
    ){

      msg =
        `You have been silenced for ${
          game.silencedUntil[p.id] -
          game.round
        } more round(s). You cannot vote.`;

    }

    else {

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

function advanceReaction(){

  game.reactionIndex++;

  nextReaction();

}


/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion(){

  const systems =
    Object.entries(
      game.systems
    )
    .map(
      ([k,v]) =>
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

function startVoting(){

  game.votes =
    {};

  game.currentVoteIndex =
    0;

  game.voteResolutionDone =
    false;

  showVote();

}


/* =========================================================
   SHOW VOTE
   ========================================================= */

function showVote(){

  const alivePlayers =
    living();


  if(
    game.currentVoteIndex >=
    alivePlayers.length
  ){

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


  if(silenced){

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
    .forEach(b => {

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

function confirmVote(){

  const p =
    living()[
      game.currentVoteIndex
    ];


  if(!p)
    return;


  if(
    !game.selectedVote
  )
    return;


  game.votes[p.id] =
    game.selectedVote;


  game.currentVoteIndex++;


  showVote();

}


/* =========================================================
   RESOLVE VOTING
   ========================================================= */

function resolveVoting(){

  const tally =
    {};


  Object.values(
    game.votes
  ).forEach(v => {

    if(v !== "skip"){

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


  /*
     One clear winner.
  */

  if(
    tied.length === 1
  ){

    return requestJudgeForEjection(
      tied[0],
      false
    );

  }


  /*
     Tie.
  */

  if(
    tied.length > 1
  ){

    const captain =
      living().find(
        p =>
          p.role === "captain" &&
          game.systems.power &&
          !game.blockedPlayers.has(
            p.id
          )
      );


    if(captain){

      showCaptainTie(
        tied,
        captain
      );

      return;

    }

  }


  /*
     No ejection.
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
){

  $("captainTieOptions").innerHTML = `

    <p>
      ${
        esc(captain.name)
      },
      choose one tied player to eject.
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

        requestJudgeForEjection(
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
   JUDGE CHECK
   ========================================================= */

/*
   Judge now works for:

   - Normal majority ejection
   - Captain tie-breaker ejection

   Judge can cancel ANY ejection.
*/

function requestJudgeForEjection(
  id,
  byCaptain
){

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


  if(!judge){

    return finishEjection(
      id,
      byCaptain
    );

  }


  game.pendingEjection = {

    id,

    byCaptain

  };


  $("judgeDescription").textContent =

    byCaptain

      ? `The Captain chose ${displayName(id)} for ejection. Do you want to cancel the ejection?`

      : `${displayName(id)} received enough votes for ejection. Do you want to cancel the ejection?`;


  $("judgeAllowButton").onclick =
    () => {

      game.judgeUsed =
        true;

      const pending =
        game.pendingEjection;

      game.pendingEjection =
        null;

      finishEjection(
        pending.id,
        pending.byCaptain,
        false
      );

    };


  $("judgeCancelButton").onclick =
    () => {

      game.judgeUsed =
        true;

      game.pendingEjection =
        null;


      $("voteResultTitle").textContent =
        "EJECTION CANCELLED";


      $("voteResultMessage").textContent =
        "The Judge cancelled the ejection. Nobody was voted out.";


      $("afterVoteButton").onclick =
        () =>
          afterVoting();


      setScreen(
        "voteResultScreen"
      );

    };


  setScreen(
    "judgeScreen"
  );

}


/* =========================================================
   FINISH EJECTION
   ========================================================= */

function finishEjection(
  id,
  byCaptain,
  unusedJudgeCheck = true
){

  if(id){

    const p =
      getPlayer(id);


    if(p){

      p.alive =
        false;


      /*
         Jester only wins if they are
         normally voted out.
      */

      if(
        p.role === "jester"
      ){

        $("voteResultTitle").textContent =
          "JESTER WINS";


        $("voteResultMessage").textContent =
          `${p.name} was voted out and wins as the Jester!`;


        game.gameOver =
          true;

      }

      else {

        $("voteResultTitle").textContent =
          "PLAYER VOTED OUT";


        $("voteResultMessage").textContent =
          `${p.name} was voted out.`;

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
    () =>
      afterVoting();


  setScreen(
    "voteResultScreen"
  );

}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting(){

  /*
     Trickster ends ONLY after the entire
     vote/ejection/Judge sequence is finished.
  */

  game.displaySwap =
    null;


  if(game.gameOver){

    return showGameOver();

  }


  /*
     Check victory immediately after
     someone has been ejected.
  */

  if(
    checkVictory()
  ){

    return;

  }


  /*
     Earth lifeline every 3 rounds.
  */

  if(
    game.round % 3 === 0
  ){

    if(
      game.systems.communications
    ){

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

function showLifeline(){

  const livingHostile =
    living().filter(
      isHostile
    );


  const others =
    living().filter(
      p =>
        !isHostile(p)
    );


  /*
     Exactly ONE listed player is hostile.
  */

  let clue = [];


  if(
    livingHostile.length
  ){

    const hostile =
      rand(
        livingHostile
      );


    const safe =
      shuffle(
        others
      ).slice(
        0,
        2
      );


    clue =
      shuffle([
        hostile,
        ...safe
      ]);

  }

  else {

    clue =
      shuffle(
        living()
      ).slice(
        0,
        Math.min(
          3,
          living().length
        )
      );

  }


  const msg =
    clue.length

      ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${clue.map(p => p.name).join(", ")}`

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
   SYSTEMS / NEXT ROUND
   ========================================================= */

function proceedToSystems(){

  /*
     Engines advance only if they are online.
  */

  if(
    game.systems.engines
  ){

    game.stage++;

  }


  /*
     Stage 10 means Earth is reached.
  */

  if(
    game.stage > 10
  ){

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
      ([k,v]) => `

        <div>

          ${
            v
              ? "🟢"
              : "🔴"
          }

          <strong>
            ${k.toUpperCase()}
          </strong>

          —

          ${
            v
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

function earthCheck(){

  const neutrals =
    living().filter(
      isNeutral
    );


  if(neutrals.length){

    endGame(
      "NEUTRAL VICTORY",
      "The ship reached Earth with a Neutral player still alive."
    );

  }

  else {

    endGame(
      "HUMAN VICTORY",
      "The crew completed all 10 stages and reached Earth."
    );

  }

}


/* =========================================================
   VICTORY CHECK
   ========================================================= */

function checkVictory(){

  if(game.gameOver)
    return true;


  const host =
    living().filter(
      isHostile
    ).length;


  const nonHost =
    living().filter(
      p =>
        !isHostile(p)
    ).length;


  /*
     Hostiles win when they equal or
     outnumber everyone else.
  */

  if(
    host >= nonHost &&
    host > 0
  ){

    endGame(
      "HOSTILE VICTORY",
      "The Hostile team now equals or outnumbers everyone else alive."
    );

    return true;

  }


  /*
     Survivor King wins independently
     as one of the final two.
  */

  if(
    living().length === 2
  ){

    const kings =
      living().filter(
        p =>
          p.role === "king"
      );


    if(kings.length){

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
){

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
            class="${
              p.alive
                ? ""
                : "dead"
            }"
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
              class="team-${
                teamClass(
                  roleTeam(p)
                )
              }"
            >
              [
              ${
                roleTeam(p)
              }
              ]
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

}


function showGameOver(){

  endGame(

    $("voteResultTitle").textContent,

    $("voteResultMessage").textContent

  );

}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id){

  $(id)?.classList.add(
    "open"
  );

}


function closeModal(id){

  $(id)?.classList.remove(
    "open"
  );

}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide(){

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
        ([title,roles]) => `

          <section>

            <h3>
              ${title}
            </h3>

            ${
              roles
                .map(
                  r => `

                    <article
                      class="guide-card ${
                        teamClass(
                          ROLE_DATA[r].team
                        )
                      }"
                    >

                      <div
                        class="guide-icon"
                      >
                        ${
                          ROLE_DATA[r].icon
                        }
                      </div>

                      <div>

                        <strong>
                          ${
                            ROLE_DATA[r].name
                          }
                        </strong>

                        <div
                          class="guide-team"
                        >
                          ${
                            ROLE_DATA[r].team
                          }
                        </div>

                        <p>
                          ${
                            ROLE_DATA[r].desc
                          }
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

function renderCustomRoles(){

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
        ([title,roles]) => `

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
                        class="custom-row ${
                          locked
                            ? "locked"
                            : ""
                        }"
                      >

                        <span>

                          ${
                            ROLE_DATA[r].icon
                          }

                          ${
                            ROLE_DATA[r].name
                          }

                        </span>


                        <label>

                          Count

                          <input
                            type="number"
                            min="0"
                            max="1"
                            value="${
                              settings.counts[r] ||
                              0
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
     Enabled switches.
  */

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-enabled]"
    )
    .forEach(el => {

      el.onchange = () => {

        const role =
          el.dataset.roleEnabled;


        settings.enabled[role] =
          el.checked;


        if(!el.checked){

          settings.counts[role] =
            0;

        }


        renderCustomRoles();

        renderSetup();

      };

    });


  /*
     Role counts.
  */

  $("customRoleContent")
    .querySelectorAll(
      "[data-role-count]"
    )
    .forEach(el => {

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


        if(
          settings.counts[role] > 0
        ){

          settings.enabled[role] =
            true;

        }


        updatePlayerValidity();

      };

    });

}


/* =========================================================
   APPLY CUSTOM ROLES
   ========================================================= */

function applyCustomRoles(){

  const n =
    game.players.length;


  const selected = [];


  Object.entries(
    settings.counts
  ).forEach(
    ([r,c]) => {

      for(
        let i = 0;
        i < c;
        i++
      ){

        selected.push(r);

      }

    }
  );


  if(
    selected.length !== n
  ){

    alert(
      `Custom roles must total exactly ${n} players. Current total: ${selected.length}.`
    );

    return;

  }


  if(
    !selected.includes(
      "engineer"
    )
  ){

    alert(
      "Engineer is required."
    );

    return;

  }


  const hostileCount =
    selected.filter(
      r =>
        HOSTILES.includes(r)
    ).length;


  if(
    hostileCount !==
    HOSTILE_COUNTS[n]
  ){

    alert(
      `You need exactly ${HOSTILE_COUNTS[n]} Hostile role(s).`
    );

    return;

  }


  /*
     No duplicate starting roles.
  */

  if(
    new Set(selected).size !==
    selected.length
  ){

    alert(
      "Starting roles cannot be duplicated."
    );

    return;

  }


  game.randomRoles =
    Object.fromEntries(
      shuffle(selected).map(
        (r,i) =>
          [i,r]
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

function bindRandomButton(){

  const btn =
    $("randomRolesButton");


  if(!btn)
    return;


  btn.type =
    "button";


  /*
     Remove old handlers by replacing
     the node with a clone.
  */

  const fresh =
    btn.cloneNode(true);


  btn.replaceWith(
    fresh
  );


  fresh.type =
    "button";


  const randomHandler =
    e => {

      e.preventDefault();

      e.stopPropagation();

      randomiseRoles();

    };


  fresh.addEventListener(
    "click",
    randomHandler
  );


  /*
     Mobile browsers sometimes behave
     differently with touch events.
  */

  fresh.addEventListener(
    "touchend",
    e => {

      e.preventDefault();

      randomiseRoles();

    },
    {
      passive:false
    }
  );

}


/* =========================================================
   INITIALISE UI
   ========================================================= */

function initGameUI(){

  const playerCount =
    $("playerCount");


  if(!playerCount)
    return;


  playerCount.onchange =
    resetSetupPlayers;


  if(
    !game.players.length
  ){

    resetSetupPlayers();

  }

  else {

    renderSetup();

  }


  /*
     RANDOM
  */

  bindRandomButton();


  /*
     START
  */

  $("startGameButton").onclick =
    e => {

      e.preventDefault();

      startGame();

    };


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
     CLOSE MODALS
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
     PASS SCREEN
  */

  $("readyButton").onclick =
    showRole;


  /*
     ROLE SCREEN
  */

  $("showActionButton").onclick =
    showAction;


  /*
     REACTION
  */

  $("reactionReadyButton").onclick =
    showReactionResult;


  $("reactionContinueButton").onclick =
    advanceReaction;


  /*
     DISCUSSION
  */

  $("startVotingButton").onclick =
    startVoting;


  /*
     RESTART
  */

  $("restartButton").onclick =
    () =>
      location.reload();


  /*
     CUSTOM ROLES
  */

  $("applyCustomRolesButton").onclick =
    applyCustomRoles;

}


/* =========================================================
   START UI
   ========================================================= */

if(
  document.readyState === "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initGameUI,
    {
      once:true
    }
  );

}

else {

  initGameUI();

}
