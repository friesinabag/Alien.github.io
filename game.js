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
    desc:"Once per round, receive a private message from Earth while Communications is online."
  },
  judge:{
    icon:"⚖️",
    name:"Judge",
    team:"Human",
    desc:"Once per game, cancel any ejection that would remove a player. Power must be online."
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

let settings = {
  enabled:Object.fromEntries(
    [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
      .map(r => [r,r !== "trickster"])
  ),

  counts:Object.fromEntries(
    [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
      .map(r => [r,0])
  )
};

settings.counts.engineer = 1;

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
  lifelineLost:false,

  gameOver:false,
  voteResolutionDone:false,

  tricksterUsed:false,
  displaySwap:null,

  judgeUsed:false,
  pendingEjection:null,
  pendingCaptain:null,

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

function targetOptions(actor=null,excludeId=null) {
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

function resetTransient() {
  game.actions = {};
  game.blockedPlayers = new Set();
  game.protectedPlayers = new Set();
  game.selectedAction = null;
  game.reactionInfo = {};
}

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
            PLAYER ${i+1}

            <input
              class="player-name-input"
              type="text"
              maxlength="20"
              value="${esc(p.name || `Player ${i+1}`)}"
              data-name-index="${i}"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false"
              placeholder="Player ${i+1}"
            >

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
                  .map(r => `
                    <option value="${r}">
                      ${ROLE_DATA[r].icon} ${ROLE_DATA[r].name}
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

function bindSetupNames() {

  document
    .querySelectorAll("[data-name-index]")
    .forEach(input => {

      const save = () => {

        const i = Number(input.dataset.nameIndex);

        const value = input.value
          .trim()
          .slice(0,20);

        if(value) {
          game.players[i].name = value;
        } else {
          input.value = game.players[i].name;
        }

        if(
          window.ONLINE &&
          window.ONLINE.mode &&
          window.ONLINE.host
        ) {
          window.ONLINE.updateLobbyNames();
        }
      };

      input.addEventListener("input",() => {

        const i = Number(input.dataset.nameIndex);

        if(game.players[i]) {
          game.players[i].name =
            input.value.slice(0,20);
        }

        if(
          window.ONLINE &&
          window.ONLINE.mode &&
          window.ONLINE.host
        ) {
          window.ONLINE.updateLobbyNames();
        }

      });

      input.addEventListener("blur",save);
    });
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

  game.players = Array.from(
    {length:n},
    (_,i) => ({
      id:`p${i+1}`,
      name:`Player ${i+1}`,

      role:"survivor",
      originalRole:"survivor",

      alive:true,

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
   ROLE RANDOMISATION
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
    HOSTILES.filter(r => settings.enabled[r]);

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

  const humanNeeded =
    n-h-1;

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
      pool.filter(r => r !== pick);
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
   MIXED MANUAL + RANDOM ROLES
   ========================================================= */

function buildMixedRoles() {

  const n = game.players.length;
  const h = HOSTILE_COUNTS[n];

  const fixed =
    Array.from(
      {length:n},
      (_,i) => game.randomRoles[i] || null
    );

  const chosen =
    fixed.filter(Boolean);

  const seen = new Set();

  for(const r of chosen) {

    if(!ROLE_DATA[r] || ROLE_DATA[r].sub) {
      return null;
    }

    if(seen.has(r)) {
      return null;
    }

    seen.add(r);
  }

  const hostileFixed =
    chosen.filter(r => HOSTILES.includes(r)).length;

  const neutralFixed =
    chosen.filter(
      r => NEUTRALS.includes(r) || CONCEPTS.includes(r)
    ).length;

  const humanFixed =
    chosen.filter(r => HUMANS.includes(r)).length;

  const engineerFixed =
    chosen.filter(r => r === "engineer").length;

  if(
    hostileFixed > h ||
    engineerFixed > 1
  ) {
    return null;
  }

  let roles = [...chosen];

  const availableHostiles =
    shuffle(
      HOSTILES.filter(
        r =>
          settings.enabled[r] &&
          !seen.has(r)
      )
    );

  const needHostiles =
    h - hostileFixed;

  if(
    availableHostiles.length <
    needHostiles
  ) {
    return null;
  }

  roles.push(
    ...availableHostiles
      .slice(0,needHostiles)
  );

  for(
    const r of availableHostiles
      .slice(0,needHostiles)
  ) {
    seen.add(r);
  }

  if(!seen.has("engineer")) {

    roles.push("engineer");

    seen.add("engineer");
  }

  const desiredHumans =
    Math.max(
      0,
      n-h-1-neutralFixed
    );

  const needHumans =
    Math.max(
      0,
      desiredHumans-humanFixed
    );

  let pool =
    HUMANS.filter(
      r =>
        r !== "engineer" &&
        settings.enabled[r] &&
        !seen.has(r)
    );

  if(pool.length < needHumans) {
    return null;
  }

  for(let i=0;i<needHumans;i++) {

    const pick =
      weightedPick(
        pool,
        HUMAN_WEIGHTS
      );

    roles.push(pick);

    seen.add(pick);

    pool =
      pool.filter(
        r => r !== pick
      );
  }

  const remaining =
    n - roles.length;

  const neutralNeeded =
    Math.max(0,remaining);

  const neutralPool =
    [...NEUTRALS,...CONCEPTS]
      .filter(
        r =>
          settings.enabled[r] &&
          !seen.has(r)
      );

  if(neutralPool.length < neutralNeeded) {
    return null;
  }

  roles.push(
    ...shuffle(neutralPool)
      .slice(0,neutralNeeded)
  );

  if(roles.length !== n) {
    return null;
  }

  const out = Array(n);

  const fixedSet =
    new Set(
      fixed.filter(Boolean)
    );

  fixed.forEach((r,i) => {
    if(r) {
      out[i] = r;
    }
  });

  const unassigned =
    shuffle(
      roles.filter(
        r => !fixedSet.has(r)
      )
    );

  for(let i=0;i<n;i++) {

    if(!out[i]) {
      out[i] =
        unassigned.pop();
    }
  }

  return out;
}


/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

  const n = game.players.length;
  const h = HOSTILE_COUNTS[n];

  let roles;

  if(game.randomisedRoles) {

    roles =
      Array.from(
        {length:n},
        (_,i) =>
          game.randomRoles[i] || null
      );

    if(roles.some(r => !r)) {

      roles = buildMixedRoles();

      if(!roles) {

        return alert(
          "Your manual/random setup cannot be completed. Check for duplicate roles and make sure enough roles are enabled."
        );
      }

      game.randomRoles =
        Object.fromEntries(
          roles.map((r,i) => [i,r])
        );
    }

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

  roles.forEach(r => {
    counts[r] =
      (counts[r] || 0) + 1;
  });

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
        (
          settings.enabled[r] ||
          r === "engineer"
        )
    );

  if(!valid) {
    return alert("A disabled role is selected.");
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
  game.lifelineLost = false;

  game.judgeUsed = false;

  game.tricksterUsed = false;
  game.displaySwap = null;

  game.pendingEjection = null;
  game.pendingCaptain = null;

  resetTransient();

  if(
    window.ONLINE &&
    window.ONLINE.mode &&
    window.ONLINE.host
  ) {
    window.ONLINE.onHostGameStarted();
  }

  startRound();
}


/* =========================================================
   ROUND START
   ========================================================= */

function startRound() {

  if(checkVictory()) return;

  /*
     IMPORTANT:
     Save the previous round's actions BEFORE
     clearing the current round.
  */

  game.previousActions =
    {...game.actions};

  resetTransient();

  game.roundStartAliveIds =
    living().map(p => p.id);

  game.abilityQueue =
    [...game.roundStartAliveIds];

  game.abilityIndex = 0;

  game.actions = {};

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
      game.abilityQueue[
        game.abilityIndex
      ]
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
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  $("rolePlayerName").textContent =
    p.name;

  $("roleIcon").textContent =
    ROLE_DATA[p.role]?.icon || "❓";

  $("roleName").textContent =
    ROLE_DATA[p.role]?.name || p.role;

  const team =
    roleTeam(p.role);

  $("roleName").className =
    `role-title ${teamClass(team)}`;

  $("roleTeam").textContent =
    `${team.toUpperCase()} TEAM`;

  $("roleTeam").className =
    `team-badge ${teamClass(team)}`;

  $("roleDescription").textContent =
    ROLE_DATA[p.role]?.desc || "";

  $("hostileList").innerHTML = "";

  if(team === "Hostile") {

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
   ABILITY UI
   ========================================================= */

function showAction() {

  const p =
    getPlayer(
      game.abilityQueue[
        game.abilityIndex
      ]
    );

  $("actionTitle").textContent =
    `${ROLE_DATA[p.role]?.icon || ""} ${ROLE_DATA[p.role]?.name || ""}`;

  $("actionDescription").textContent = "";

  $("actionOptions").innerHTML = "";

  game.selectedAction = null;

  if(!canAct(p)) {

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

  const choose =
    (desc,items) => {

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
        .forEach(b => {

          b.onclick = () => {

            game.selectedAction =
              b.dataset.value;

            $("actionOptions")
              .querySelectorAll("button")
              .forEach(
                x =>
                  x.classList.remove("selected")
              );

            b.classList.add("selected");
          };

        });
    };


  /* ALIEN */

  if(p.role === "alien") {

    const saboteurAlive =
      living().some(
        x => x.role === "saboteur"
      );

    $("actionOptions").innerHTML = `
      ${button("☠️ KILL","kill")}
      ${
        saboteurAlive
          ? ""
          : button("💥 SABOTAGE","sabotage")
      }
    `;

    $("actionDescription").textContent =
      saboteurAlive
        ? "A living Saboteur exists, so you can only kill."
        : "Choose Kill or Sabotage.";

    $("actionOptions")
      .querySelectorAll("button")
      .forEach(b => {

        b.onclick = () => {

          const mode =
            b.dataset.value;

          if(mode === "kill") {

            renderTargetChoices(
              p,
              null,
              "kill"
            );

          } else {

            renderSystemChoices(false);
          }
        };
      });

  }


  /* SABOTEUR */

  else if(p.role === "saboteur") {

    renderSystemChoices(false);

  }


  /* SILENCER */

  else if(p.role === "silencer") {

    renderTargetChoices(
      p,
      null,
      "silence"
    );

  }


  /* PARASITE */

  else if(p.role === "parasite") {

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
  }


  /* ENGINEER */

  else if(p.role === "engineer") {

    renderSystemChoices(true);

  }


  /* SCIENTIST */

  else if(p.role === "scientist") {

    renderScientistChoices(p);

  }


  /* DETECTIVE */

  else if(p.role === "detective") {

    renderTargetChoices(
      p,
      null,
      "detect"
    );

  }


  /* MEDIC */

  else if(p.role === "medic") {

    renderTargetChoices(
      p,
      null,
      "protect"
    );

  }


  /* GUARD */

  else if(p.role === "guard") {

    renderTargetChoices(
      p,
      null,
      "block"
    );

  }


  /* RADIO */

  else if(p.role === "radio") {

    if(!game.systems.communications) {

      $("actionDescription").textContent =
        "Communications is OFFLINE.";

    } else {

      $("actionDescription").textContent =
        "Receive a private message from Earth.";

      game.selectedAction = "radio";
    }

  }


  /* CAPTAIN */

  else if(p.role === "captain") {

    $("actionDescription").textContent =
      "Your ability is automatic only if a vote ties.";

    game.selectedAction = "none";

  }


  /* JUDGE */

  else if(p.role === "judge") {

    $("actionDescription").textContent =
      "Your ability appears whenever an ejection would occur. You may cancel one ejection per game.";

    game.selectedAction = "none";

  }


  /* TRICKSTER */

  else if(p.role === "trickster") {

    if(game.tricksterUsed) {

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction = "none";

    } else {

      renderSwapChoices(p);
    }

  }


  /* NO ABILITY */

  else {

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

        game.selectedAction =
          JSON.stringify({
            type:"science",
            target:t.id
          });

        $("actionOptions").innerHTML = `
          ${button("🔬 CHECK","check")}
          ${
            ["infected","diseased"]
              .includes(t.role)
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
                    y.classList.remove("selected")
                );

              x.classList.add("selected");
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
              x.classList.remove("selected")
          );

        b.classList.add("selected");
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

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove("selected")
          );

        b.classList.add("selected");
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

          b.classList.remove("selected");

        } else if(chosen.length < 2) {

          chosen.push(id);

          b.classList.add("selected");
        }

        if(chosen.length === 2) {

          game.selectedAction =
            JSON.stringify({
              type:"swap",
              a:chosen[0],
              b:chosen[1]
            });

        } else {

          game.selectedAction = null;
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
    try {
      action = JSON.parse(action);
    } catch {
      action = null;
    }
  }

  if(action && typeof action === "object") {

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
   APPLY IMMEDIATE ACTION
   ========================================================= */

function applyImmediateAction(p,a) {

  if(a.type === "repair") {

    if(
      game.systems[a.system] === false &&
      p.role === "engineer"
    ) {
      game.systems[a.system] = true;
    }
  }

  if(a.type === "sabotage") {

    if(
      game.systems[a.system] !== undefined
    ) {
      game.systems[a.system] = false;
    }
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

    if(
      !game.tricksterUsed &&
      a.a !== a.b &&
      getPlayer(a.a)?.alive &&
      getPlayer(a.b)?.alive
    ) {

      game.displaySwap = [
        a.a,
        a.b
      ];

      game.tricksterUsed = true;
    }
  }

  if(a.type === "infect") {

    p.hasInfected = true;

    const target =
      getPlayer(a.target);

    if(
      target &&
      alive(target) &&
      target.infectionRound === null &&
      !game.blockedPlayers.has(target.id)
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
        IMPORTANT:
        The target is NOT told that they
        were infected.

        They keep seeing their original
        role until they become Diseased.
      */
    }
  }

  if(a.type === "science") {

    const t =
      getPlayer(a.target);

    if(t) {

      const status =
        ROLE_DATA[t.role]?.name ||
        t.role;

      game.reactionInfo[p.id] =
        `SCIENCE: ${t.name} is ${status}.`;

      if(
        a.mode === "cure" &&
        (
          t.role === "infected" ||
          t.role === "diseased"
        )
      ) {

        t.role = "survivor";

        t.infectionRound =
          null;

        t.hasInfected =
          false;

        game.reactionInfo[p.id] =
          `SCIENCE: ${t.name} was cured and is now a Survivor.`;

      }
    }
  }

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
    Kills happen after protection and blocking
    are known.
  */

  const killActions =
    Object.entries(game.actions)
      .filter(
        ([,a]) =>
          a.type === "kill"
      );

  for(
    const [id,a] of killActions
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

        target.alive = false;

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
    Infection progression:

    Round of infection = hidden
    Next full round = Diseased
    Following full round = Parasite
  */

  for(const p of game.players) {

    if(
      !p.alive ||
      p.infectionRound === null
    ) {
      continue;
    }

    const age =
      game.round -
      p.infectionRound +
      1;

    if(
      age === 2 &&
      p.role === "infected"
    ) {

      p.role =
        "diseased";

      game.reactionInfo[p.id] =
        "You became DISEASED. You are on the HOSTILE TEAM.";

    } else if(
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
   DETECTIVE
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
   RADIO
   ========================================================= */

function randomRadioMessage() {

  const messages = [

    "EARTH: There are exactly 2 hostiles remaining.",

    "EARTH: There are exactly 1 hostile remaining.",

    "EARTH: One of the living players is hostile.",

    "EARTH: A ship system was recently tampered with.",

    "EARTH: Player 2, Player 4, Player 5 — one of them is hostile.",

    "EARTH: Player 2, Player 4, Player 5 — one of them made POWER OFFLINE.",

    "EARTH: Communications is stable. Stay alert.",

    "EARTH: We cannot identify a hostile player from this transmission."
  ];

  return rand(messages);
}


/* =========================================================
   REACTION ROUND
   ========================================================= */

function showReactions() {

  game.reactionQueue =
    [...game.roundStartAliveIds]
      .filter(id => getPlayer(id));

  game.reactionIndex = 0;

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

  setScreen("reactionScreen");
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
        `You have been silenced for ${game.silencedUntil[p.id]-game.round} more round(s). You cannot vote.`;

    } else {

      msg =
        "Nothing happened to you this round.";
    }
  }

  $("reactionResultMessage").textContent =
    msg;

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

  setScreen("discussionScreen");
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

        $("voteOptions")
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove("selected")
          );

        b.classList.add("selected");
      };
    });

  $("confirmVoteButton").onclick =
    confirmVote;

  setScreen("votingScreen");
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

      game.pendingCaptain = {
        tied:[...tied],
        captainId:captain.id
      };

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

        game.pendingCaptain =
          null;

        finishEjection(
          b.dataset.value,
          true
        );
      };
    });

  setScreen("captainTieScreen");
}


/* =========================================================
   JUDGE
   ========================================================= */

function finishEjection(
  id,
  byCaptain
) {

  if(!id) {

    return resolveEjection(
      null,
      false
    );
  }

  const judge =
    living().find(
      p =>
        p.role === "judge" &&
        !game.judgeUsed &&
        game.systems.power &&
        !game.blockedPlayers.has(p.id)
    );

  if(judge) {

    game.pendingEjection = {
      id,
      byCaptain,
      judgeId:judge.id
    };

    if(
      window.ONLINE &&
      window.ONLINE.mode &&
      window.ONLINE.host &&
      judge.clientId &&
      judge.clientId !==
        window.ONLINE.clientId
    ) {

      window.ONLINE.sendPrivate(
        judge.clientId,
        {
          type:"judge_prompt",
          targetName:
            displayName(id),
          byCaptain
        }
      );

      return;
    }

    $("judgeDescription").textContent =
      `${displayName(id)} would be ejected${
        byCaptain
          ? " by the Captain"
          : " by the vote"
      }. Do you want to cancel this ejection?`;

    $("judgeCancelButton").onclick =
      () => resolveJudgeDecision(true);

    $("judgeAllowButton").onclick =
      () => resolveJudgeDecision(false);

    setScreen("judgeScreen");

    return;
  }

  resolveEjection(
    id,
    byCaptain
  );
}

function resolveJudgeDecision(
  cancel
) {

  const pending =
    game.pendingEjection;

  if(!pending) {
    return;
  }

  const judge =
    living().find(
      p =>
        p.role === "judge" &&
        !game.judgeUsed &&
        game.systems.power &&
        !game.blockedPlayers.has(p.id)
    );

  if(cancel && judge) {

    game.judgeUsed =
      true;

    game.pendingEjection =
      null;

    $("voteResultTitle").textContent =
      "EJECTION CANCELLED";

    $("voteResultMessage").textContent =
      "The Judge cancelled the ejection. Nobody was voted out.";

    $("afterVoteButton").onclick =
      () => afterVoting();

    setScreen("voteResultScreen");

    if(
      window.ONLINE &&
      window.ONLINE.mode &&
      window.ONLINE.host
    ) {

      window.ONLINE.broadcastPublic({
        kind:"vote_result",
        title:"EJECTION CANCELLED",
        message:
          "The Judge cancelled the ejection. Nobody was voted out."
      });
    }

  } else {

    game.pendingEjection =
      null;

    resolveEjection(
      pending.id,
      pending.byCaptain
    );
  }
}


/* =========================================================
   ACTUAL EJECTION
   ========================================================= */

function resolveEjection(
  id,
  byCaptain
) {

  if(id) {

    const p =
      getPlayer(id);

    if(p) {

      p.alive = false;

      if(p.role === "jester") {

        $("voteResultTitle").textContent =
          "JESTER WINS";

        $("voteResultMessage").textContent =
          `${p.name} was voted out and wins as the Jester!`;

        game.gameOver = true;

      } else {

        $("voteResultTitle").textContent =
          "PLAYER VOTED OUT";

        $("voteResultMessage").textContent =
          `${p.name} was voted out.`;
      }
    }

  } else {

    $("voteResultTitle").textContent =
      "NO EJECTION";

    $("voteResultMessage").textContent =
      "Nobody was voted out.";
  }

  $("afterVoteButton").onclick =
    () => afterVoting();

  if(
    window.ONLINE &&
    window.ONLINE.mode &&
    window.ONLINE.host
  ) {

    window.ONLINE.broadcastPublic({
      kind:"vote_result",

      title:
        $("voteResultTitle").textContent,

      message:
        $("voteResultMessage").textContent,

      alive:
        game.players.map(
          p => ({
            id:p.id,
            name:p.name,
            alive:p.alive
          })
        )
    });
  }

  setScreen("voteResultScreen");
}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

  /*
    Trickster swap lasts through the complete
    voting result, then disappears.
  */

  game.displaySwap = null;

  if(game.gameOver) {

    return showGameOver();
  }

  /*
    Exact lifeline checkpoints:
    Round 3
    Round 6
    Round 9
    etc.

    If Communications is offline at the checkpoint,
    the lifeline is permanently lost.
  */

  if(game.round % 3 === 0) {

    if(
      game.systems.communications &&
      !game.lifelineLost
    ) {

      game.lifelineNumber++;

      showLifeline();

    } else {

      game.lifelineLost =
        true;

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
    Exactly one actual Hostile is included.
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

  setScreen("lifelineScreen");
}


/* =========================================================
   SYSTEMS / STAGE
   ========================================================= */

function proceedToSystems() {

  /*
    Engines must be online for the stage to advance.
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

      game.lastRoundResults =
        [];

      startRound();
    };

  setScreen("systemsScreen");
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

    return endGame(
      "NEUTRAL VICTORY",
      "The ship reached Earth with a Neutral player still alive."
    );
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
        p =>
          p.role === "king"
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

  game.gameOver = true;

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

              <span class="team-${teamClass(roleTeam(p.role))}">
                [${roleTeam(p.role)}]
              </span>

              ${p.alive ? "ALIVE" : "DEAD"}

            </div>
          `
      )
      .join("");

  setScreen("gameOverScreen");

  if(
    window.ONLINE &&
    window.ONLINE.mode &&
    window.ONLINE.host
  ) {

    window.ONLINE.send({
      type:"game_over",

      title,

      message:msg,

      players:
        game.players.map(
          p => ({
            id:p.id,
            name:p.name,
            role:p.role,
            alive:p.alive
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
   MODALS
   ========================================================= */

function openModal(id) {
  $(id).classList.add("open");
}

function closeModal(id) {
  $(id).classList.remove("open");
}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

  const sections = [

    [
      "HOSTILE",
      HOSTILES.concat(["diseased"])
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
    ["HOSTILE",HOSTILES],
    ["HUMAN",HUMANS],
    ["NEUTRAL",NEUTRALS],
    ["ROLE CONCEPT",CONCEPTS]
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
                  .map(r => {

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
                  })
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
  ).forEach(
    ([r,c]) => {

      for(let i=0;i<c;i++) {
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
    ).length !==
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
   INIT
   ========================================================= */

function initGameUI() {

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


  /*
    MOBILE RANDOM BUTTON FIX

    Clone the button so any stale listener
    is completely removed.
  */

  const randomButton =
    $("randomRolesButton");

  randomButton.type =
    "button";

  const freshRandom =
    randomButton.cloneNode(true);

  randomButton.replaceWith(
    freshRandom
  );

  const triggerRandom =
    e => {

      e.preventDefault();
      e.stopPropagation();

      randomiseRoles();
    };

  freshRandom.addEventListener(
    "pointerup",
    triggerRandom,
    {
      passive:false
    }
  );

  freshRandom.addEventListener(
    "click",
    triggerRandom,
    {
      passive:false
    }
  );


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
}

if(
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initGameUI,
    {
      once:true
    }
  );

} else {

  initGameUI();
}


/* =========================================================
   ALIEN — ONLINE MODE
   SUPABASE REALTIME
   ========================================================= */

(function(){

  "use strict";

  const SUPABASE_URL =
    "https://sovwkrauwyoskxrnajjn.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_ck6DlHqxEFmoCex44rXbKw_HlAtPkaW";

  let supabaseClient =
    window.supabaseClient || null;

  if(
    !supabaseClient &&
    window.supabase?.createClient
  ) {

    try {

      supabaseClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

    } catch(err) {

      console.error(
        "Supabase error:",
        err
      );
    }
  }


  window.ONLINE = {

    mode:false,

    host:false,

    started:false,

    roomCode:"",

    channel:null,

    clientId:
      "client_" +
      Math.random()
        .toString(36)
        .slice(2,10),

    myPlayerId:null,

    lobbyPlayers:[],

    connected:false,

    joinName:"",

    remoteRole:null,

    remoteName:"",

    remoteRound:1,

    remoteStage:1,

    remoteSystems:{},

    lastAbilityTargets:[],

    pending:null,

    lastPublic:null,


    send(payload) {

      if(!this.channel) return;

      this.channel
        .send({
          type:"broadcast",
          event:"alien",

          payload:{
            ...payload,
            sender:this.clientId
          }
        })
        .catch(
          err =>
            console.error(
              "Broadcast error:",
              err
            )
        );
    },


    sendPrivate(
      clientId,
      payload
    ) {

      this.send({
        ...payload,
        to:clientId
      });
    },


    broadcastPublic(data) {

      this.send({
        type:"public",
        data
      });
    },


    async connect(code) {

      if(!supabaseClient) {

        throw new Error(
          "Supabase could not be loaded."
        );
      }

      if(this.channel) {

        try {

          await supabaseClient
            .removeChannel(
              this.channel
            );

        } catch(e){}
      }

      this.roomCode =
        code.toUpperCase();

      this.channel =
        supabaseClient.channel(
          "alien-room-" +
          this.roomCode,

          {
            config:{
              broadcast:{
                ack:true
              }
            }
          }
        );

      this.channel.on(
        "broadcast",
        {
          event:"alien"
        },

        ({payload}) => {

          this.receive(payload);
        }
      );

      await this.channel.subscribe(
        status => {

          this.connected =
            status === "SUBSCRIBED";

          if(
            status === "SUBSCRIBED"
          ) {

            this.onConnected();
          }

          if(
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {

            this.setStatus(
              "Connection failed. Check the room code and try again."
            );
          }
        }
      );
    },


    onConnected() {

      this.setStatus(
        this.host
          ? "Room connected. Waiting for players…"
          : "Connected. Joining room…"
      );

      if(this.host) {

        this.broadcastLobby();

      } else {

        this.send({
          type:"join",
          name:
            this.joinName ||
            "Player",

          clientId:
            this.clientId
        });
      }
    },


    receive(msg) {

      if(!msg) return;

      if(
        msg.sender ===
        this.clientId
      ) {
        return;
      }

      if(
        msg.to &&
        msg.to !==
          this.clientId
      ) {
        return;
      }


      if(
        msg.type === "join" &&
        this.host
      ) {

        return this.hostAddPlayer(
          msg
        );
      }


      if(
        msg.type === "lobby"
      ) {

        return this.receiveLobby(
          msg.players || []
        );
      }


      if(
        msg.type === "game_start" &&
        !this.host
      ) {

        return this.receiveGameStart(
          msg
        );
      }


      if(
        msg.type === "ability_prompt" &&
        !this.host
      ) {

        return this.receiveAbilityPrompt(
          msg
        );
      }


      if(
        msg.type === "reaction_prompt" &&
        !this.host
      ) {

        return this.receiveReactionPrompt(
          msg
        );
      }


      if(
        msg.type === "discussion" &&
        !this.host
      ) {

        return this.receiveDiscussion(
          msg
        );
      }


      if(
        msg.type === "vote_prompt" &&
        !this.host
      ) {

        return this.receiveVotePrompt(
          msg
        );
      }


      if(
        msg.type === "captain_prompt" &&
        !this.host
      ) {

        return this.receiveCaptainPrompt(
          msg
        );
      }


      if(
        msg.type === "judge_prompt" &&
        !this.host
      ) {

        return this.receiveJudgePrompt(
          msg
        );
      }


      if(
        msg.type === "public"
      ) {

        return this.receivePublic(
          msg.data
        );
      }


      if(
        msg.type === "game_over" &&
        !this.host
      ) {

        return this.receiveGameOver(
          msg
        );
      }


      if(this.host) {

        this.receiveHostCommand(
          msg
        );
      }
    },


    hostAddPlayer(msg) {

      if(this.started) {
        return;
      }

      if(
        this.lobbyPlayers.length >= 12
      ) {

        return this.sendPrivate(
          msg.clientId,
          {
            type:"error",
            message:"The room is full."
          }
        );
      }

      if(
        this.lobbyPlayers.some(
          p =>
            p.clientId ===
            msg.clientId
        )
      ) {

        return this.broadcastLobby();
      }

      const number =
        this.lobbyPlayers.length + 1;

      const id =
        "p" + number;

      const fallback =
        "Player " + number;

      const name =
        String(
          msg.name ||
          fallback
        )
        .trim()
        .slice(0,20) ||
        fallback;

      const player = {

        id,

        name,

        clientId:
          msg.clientId,

        host:false
      };

      this.lobbyPlayers.push(
        player
      );

      this.sendPrivate(
        msg.clientId,
        {
          type:"assigned",
          playerId:id
        }
      );

      this.broadcastLobby();

      renderOnlineLobby();
    },


    receiveLobby(players) {

      this.lobbyPlayers =
        players;

      if(!this.host) {

        const mine =
          players.find(
            p =>
              p.clientId ===
              this.clientId
          );

        if(mine) {

          this.myPlayerId =
            mine.id;
        }
      }

      renderOnlineLobby();
    },


    broadcastLobby() {

      this.send({

        type:"lobby",

        players:
          this.lobbyPlayers
            .map(
              p => ({
                id:p.id,
                name:p.name,
                clientId:p.clientId,
                host:!!p.host
              })
            )
      });
    },


    updateLobbyNames() {

      if(!this.host) return;

      this.lobbyPlayers =
        game.players.map(
          p => ({
            id:p.id,
            name:p.name,
            clientId:p.clientId,
            host:p.id === "p1"
          })
        );

      this.broadcastLobby();
    },


    startOnline() {

      if(!this.host) {
        return;
      }

      if(
        this.lobbyPlayers.length < 4
      ) {

        return alert(
          "Online Mode needs at least 4 players."
        );
      }

      this.started = true;

      game.players =
        this.lobbyPlayers.map(
          p => ({
            id:p.id,

            name:p.name,

            role:"survivor",

            originalRole:
              "survivor",

            alive:true,

            infectionRound:null,

            hasInfected:false,

            clientId:p.clientId
          })
        );

      const pc =
        $("playerCount");

      if(pc) {

        pc.value =
          String(
            game.players.length
          );
      }

      game.randomisedRoles =
        false;

      game.randomRoles = {};

      renderSetup();

      showSetup();

      this.setStatus(
        "Online setup: choose roles or RANDOMISE ROLES, then START GAME."
      );
    },


    onHostGameStarted() {

      this.broadcastPublic({

        kind:"start",

        round:game.round,

        stage:game.stage,

        systems:{
          ...game.systems
        },

        alive:
          game.players.map(
            p => ({
              id:p.id,
              name:p.name,
              alive:p.alive
            })
          )
      });

      for(
        const p of game.players
      ) {

        if(
          p.clientId &&
          p.clientId !==
            this.clientId
        ) {

          this.sendPrivate(
            p.clientId,
            {

              type:"game_start",

              playerId:p.id,

              name:p.name,

              role:p.role,

              desc:
                ROLE_DATA[p.role]?.desc ||
                "",

              round:
                game.round,

              stage:
                game.stage,

              systems:{
                ...game.systems
              }
            }
          );
        }
      }
    },


    receiveGameStart(msg) {

      this.started = true;

      this.mode = true;

      this.myPlayerId =
        msg.playerId;

      this.remoteRole =
        msg.role;

      this.remoteName =
        msg.name;

      this.remoteRound =
        msg.round;

      this.remoteStage =
        msg.stage;

      this.remoteSystems =
        msg.systems || {};

      this.showRemoteBase();

      renderRemoteRole(
        msg.role,
        msg.name,
        msg.desc
      );
    },


    promptRemoteAbility(p) {

      const prompt =
        makeRemoteAbilityPrompt(
          p
        );

      this.pending =
        "ability";

      this.lastAbilityTargets =
        prompt.targets || [];

      this.sendPrivate(
        p.clientId,
        {

          type:"ability_prompt",

          playerId:p.id,

          round:
            game.round,

          stage:
            game.stage,

          role:p.role,

          name:p.name,

          prompt
        }
      );

      this.setHostWaiting(
        `${p.name} is choosing their ability…`
      );
    },


    receiveAbilityPrompt(msg) {

      this.lastAbilityTargets =
        msg.prompt?.targets || [];

      this.remoteRole =
        msg.role;

      this.remoteName =
        msg.name;

      this.remoteRound =
        msg.round;

      this.remoteStage =
        msg.stage;

      this.pending =
        "ability";

      renderRemoteAbility(
        msg
      );
    },


    receiveHostCommand(msg) {

      if(
        msg.type !==
        "command"
      ) {
        return;
      }

      if(
        msg.command ===
        "ability"
      ) {

        return hostRemoteAbility(
          msg
        );
      }

      if(
        msg.command ===
        "reaction_ack"
      ) {

        return hostRemoteReactionAck(
          msg
        );
      }

      if(
        msg.command ===
        "vote"
      ) {

        return hostRemoteVote(
          msg
        );
      }

      if(
        msg.command ===
        "captain"
      ) {

        return hostRemoteCaptain(
          msg
        );
      }

      if(
        msg.command ===
        "judge"
      ) {

        return hostRemoteJudge(
          msg
        );
      }
    },


    receiveReactionPrompt(msg) {

      renderRemoteReaction(
        msg
      );
    },


    receiveDiscussion(msg) {

      renderRemoteDiscussion(
        msg.data || {}
      );
    },


    receiveVotePrompt(msg) {

      renderRemoteVote(
        msg
      );
    },


    receiveCaptainPrompt(msg) {

      renderRemoteCaptain(
        msg
      );
    },


    receiveJudgePrompt(msg) {

      renderRemoteJudge(
        msg
      );
    },


    receivePublic(data) {

      this.lastPublic =
        data;

      if(
        this.host
      ) {
        return;
      }

      if(
        data?.kind === "start"
      ) {

        this.remoteRound =
          data.round;

        this.remoteStage =
          data.stage;

        this.remoteSystems =
          data.systems || {};
      }

      if(
        data?.kind === "discussion"
      ) {

        renderRemoteDiscussion(
          data
        );
      }

      if(
        data?.kind === "lifeline"
      ) {

        renderRemoteLifeline(
          data
        );
      }

      if(
        data?.kind === "vote_result"
      ) {

        renderRemoteVoteResult(
          data
        );
      }

      if(
        data?.kind === "systems"
      ) {

        renderRemoteSystems(
          data
        );
      }

      if(
        data?.kind === "game_over"
      ) {

        renderRemoteGameOver(
          data.title,
          data.message,
          data.players
        );
      }
    },


    receiveGameOver(msg) {

      renderRemoteGameOver(
        msg.title,
        msg.message,
        msg.players
      );
    },


    showRemoteBase() {

      setScreen(
        "onlineRemoteScreen"
      );
    },


    setHostWaiting(message) {

      if(!this.host) {
        return;
      }

      const box =
        $("onlineHostStatus");

      if(box) {
        box.textContent =
          message;
      }
    },


    setStatus(message) {

      const el =
        $("onlineStatus");

      if(el) {
        el.textContent =
          message;
      }
    }
  };


  const ONLINE =
    window.ONLINE;


  /* =======================================================
     ONLINE UI
     ======================================================= */

  function injectOnlineUI() {

    if($("onlineScreen")) {
      return;
    }

    const css =
      document.createElement(
        "style"
      );

    css.textContent = `

      .player-name-input {
        display:block;
        width:100%;
        margin-top:7px;
        margin-bottom:7px;
      }

      .online-card {
        max-width:760px;
        margin:0 auto;
      }

      .online-code {
        font-size:42px;
        font-weight:950;
        letter-spacing:8px;
        padding:15px;
        border:1px dashed var(--accent);
        border-radius:14px;
        text-align:center;
        margin:12px 0;
      }

      .online-list {
        display:grid;
        gap:8px;
        margin:14px 0;
      }

      .online-player {
        padding:12px;
        background:#0b111a;
        border:1px solid var(--line);
        border-radius:12px;
      }

      .online-status {
        padding:12px;
        border-radius:12px;
        background:#0b111a;
        color:var(--muted);
        margin:12px 0;
        line-height:1.45;
      }

      .online-role {
        font-size:64px;
        text-align:center;
      }

      .online-small {
        font-size:12px;
        color:var(--muted);
      }

      .online-choice-title {
        margin-top:10px;
        font-weight:900;
      }
    `;

    document.head.appendChild(
      css
    );


    const setup =
      $("setupScreen");

    setup.insertAdjacentHTML(
      "beforebegin",

      `
        <section
          id="onlineScreen"
          class="screen"
        >

          <div
            class="panel online-card center"
          >

            <div class="eyebrow">
              ONLINE MODE
            </div>

            <h1>
              🌐 PLAY ONLINE
            </h1>

            <p class="muted">
              Create a room and invite friends,
              or join using a 5-character room code.
            </p>

            <div
              id="onlineHome"
              class="button-row"
            >

              <button
                id="createRoomButton"
                class="primary"
                type="button"
              >
                CREATE ROOM
              </button>

              <button
                id="joinRoomButton"
                type="button"
              >
                JOIN ROOM
              </button>

              <button
                id="onlineBackButton"
                class="secondary"
                type="button"
              >
                LOCAL MODE
              </button>

            </div>


            <div
              id="onlineJoinBox"
              style="display:none"
            >

              <input
                id="onlineJoinName"
                maxlength="20"
                placeholder="Your name"
                autocomplete="off"
                style="width:100%;margin-bottom:9px"
              >

              <input
                id="onlineJoinCode"
                maxlength="5"
                placeholder="ROOM CODE"
                autocomplete="off"
                autocapitalize="characters"
                style="width:100%;text-transform:uppercase"
              >

              <button
                id="connectRoomButton"
                class="primary full"
                type="button"
              >
                JOIN ROOM
              </button>

            </div>


            <div
              id="onlineLobby"
              style="display:none"
            >

              <div class="online-small">
                ROOM CODE
              </div>

              <div
                id="onlineRoomCode"
                class="online-code"
              ></div>

              <div
                id="onlineStatus"
                class="online-status"
              >
                Connecting…
              </div>

              <div
                id="onlineHostStatus"
                class="online-status"
              >
                Host status
              </div>

              <div
                id="onlineLobbyPlayers"
                class="online-list"
              ></div>

              <button
                id="onlineHostSetupButton"
                class="primary full"
                type="button"
                style="display:none"
              >
                OPEN GAME SETUP
              </button>

            </div>

          </div>

        </section>
      `
    );


    document
      .querySelector("main.app")
      .insertAdjacentHTML(
        "beforeend",

        `
          <section
            id="onlineRemoteScreen"
            class="screen"
          >

            <div
              class="panel online-card"
            >

              <div
                id="onlineRemoteContent"
              ></div>

            </div>

          </section>
        `
      );
  }


  function addOnlineButton() {

    if($("openOnlineButton")) {
      return;
    }

    const row =
      document.querySelector(
        "#setupScreen .button-row"
      );

    if(!row) {
      return;
    }

    const b =
      document.createElement(
        "button"
      );

    b.id =
      "openOnlineButton";

    b.type =
      "button";

    b.className =
      "secondary";

    b.textContent =
      "🌐 ONLINE MODE";

    b.onclick =
      () => openOnline();

    row.appendChild(b);
  }


  function openOnline() {

    injectOnlineUI();

    setScreen(
      "onlineScreen"
    );

    $("onlineHome").style.display =
      "grid";

    $("onlineJoinBox").style.display =
      "none";

    $("onlineLobby").style.display =
      "none";

    ONLINE.setStatus("");
  }


  function showJoinBox() {

    $("onlineHome").style.display =
      "none";

    $("onlineJoinBox").style.display =
      "block";

    $("onlineLobby").style.display =
      "none";

    $("onlineJoinName").focus();
  }


  function randomCode() {

    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let out = "";

    for(let i=0;i<5;i++) {

      out +=
        chars[
          Math.floor(
            Math.random() *
            chars.length
          )
        ];
    }

    return out;
  }


  async function createRoom() {

    if(!supabaseClient) {

      return alert(
        "Supabase is not available. Make sure the Supabase CDN script is loaded before game.js."
      );
    }

    ONLINE.mode = true;

    ONLINE.host = true;

    ONLINE.started = false;

    ONLINE.clientId =
      "host_" +
      Math.random()
        .toString(36)
        .slice(2,10);

    ONLINE.lobbyPlayers = [

      {
        id:"p1",

        name:"Player 1",

        clientId:
          ONLINE.clientId,

        host:true
      }

    ];

    ONLINE.myPlayerId =
      "p1";

    const code =
      randomCode();

    try {

      await ONLINE.connect(
        code
      );

    } catch(e) {

      console.error(e);

      return alert(
        "Could not create the online room."
      );
    }

    renderOnlineLobby();
  }


  async function joinRoom() {

    const name =
      $("onlineJoinName")
        .value
        .trim()
        .slice(0,20);

    const code =
      $("onlineJoinCode")
        .value
        .trim()
        .toUpperCase();

    if(!name) {

      return alert(
        "Enter your name."
      );
    }

    if(
      !/^[A-Z0-9]{5}$/.test(
        code
      )
    ) {

      return alert(
        "Enter the 5-character room code."
      );
    }

    ONLINE.mode = true;

    ONLINE.host = false;

    ONLINE.started = false;

    ONLINE.joinName =
      name;

    try {

      await ONLINE.connect(
        code
      );

    } catch(e) {

      console.error(e);

      return alert(
        "Could not join the room."
      );
    }

    $("onlineHome").style.display =
      "none";

    $("onlineJoinBox").style.display =
      "none";

    $("onlineLobby").style.display =
      "block";

    $("onlineRoomCode").textContent =
      code;

    ONLINE.setStatus(
      "Connected. Waiting for the host…"
    );

    renderOnlineLobby();
  }


  function renderOnlineLobby() {

    injectOnlineUI();

    $("onlineHome").style.display =
      "none";

    $("onlineJoinBox").style.display =
      "none";

    $("onlineLobby").style.display =
      "block";

    $("onlineRoomCode").textContent =
      ONLINE.roomCode ||
      "-----";

    const list =
      ONLINE.lobbyPlayers ||
      [];

    $("onlineLobbyPlayers").innerHTML =
      list
        .map(
          (p,i) =>
            `
              <div class="online-player">

                <strong>
                  ${i === 0 ? "👑 " : ""}
                  ${esc(p.name)}
                </strong>

                <span class="online-small">
                  ${
                    i === 0
                      ? "HOST"
                      : "PLAYER " + (i+1)
                  }
                </span>

              </div>
            `
        )
        .join("");

    const setupBtn =
      $("onlineHostSetupButton");

    setupBtn.style.display =
      ONLINE.host
        ? "block"
        : "none";

    setupBtn.disabled =
      list.length < 4;

    setupBtn.textContent =
      list.length < 4

        ? `NEED ${4-list.length} MORE PLAYER${
            4-list.length === 1
              ? ""
              : "S"
          }`

        : "OPEN GAME SETUP";

    ONLINE.setStatus(

      ONLINE.host

        ? `Share the code. ${list.length}/12 players connected.`

        : `You are connected as ${
            ONLINE.myPlayerId
              ? "Player " +
                ONLINE.myPlayerId.replace("p","")
              : "a player"
          }. Waiting for host.`
    );
  }


  function beginOnlineSetup() {

    ONLINE.startOnline();
  }


  /* =======================================================
     REMOTE ABILITY PROMPTS
     ======================================================= */

  function makeRemoteAbilityPrompt(p) {

    const target =
      () =>

        living()
          .filter(
            x => {

              if(x.id === p.id) {
                return false;
              }

              if(
                roleTeam(p.role) === "Hostile" &&
                isHostile(x) &&
                !(
                  game.displaySwap &&
                  game.displaySwap.includes(x.id)
                )
              ) {
                return false;
              }

              return true;
            }
          )
          .map(
            x => ({
              id:x.id,
              name:displayName(x.id)
            })
          );


    const systems =
      Object.keys(
        game.systems
      )
      .map(
        k => ({
          id:k,

          label:
            `${game.systems[k] ? "🟢" : "🔴"} ${k.toUpperCase()}`
        })
      );


    if(p.role === "alien") {

      return {

        kind:"alien",

        canSabotage:
          !living().some(
            x =>
              x.role ===
              "saboteur"
          ),

        targets:
          target(),

        systems
      };
    }


    if(p.role === "saboteur") {

      return {
        kind:"systems",
        action:"sabotage",
        systems
      };
    }


    if(p.role === "silencer") {

      return {
        kind:"targets",
        action:"silence",
        targets:target()
      };
    }


    if(p.role === "parasite") {

      return p.hasInfected

        ? {
            kind:"none",
            message:
              "You already used your infection.",
            continueOnly:true
          }

        : {
            kind:"targets",
            action:"infect",
            targets:target()
          };
    }


    if(p.role === "engineer") {

      return {
        kind:"systems",
        action:"repair",

        systems:
          systems.filter(
            x =>
              !game.systems[
                x.id
              ]
          )
      };
    }


    if(p.role === "scientist") {

      return {

        kind:"scientist",

        targets:
          living()
            .filter(
              x =>
                x.id !== p.id
            )
            .map(
              x => ({
                id:x.id,

                name:
                  displayName(x.id),

                status:
                  ROLE_DATA[
                    x.role
                  ]?.name ||
                  x.role,

                cure:
                  [
                    "infected",
                    "diseased"
                  ].includes(
                    x.role
                  )
              })
            )
      };
    }


    if(p.role === "detective") {

      return {
        kind:"targets",
        action:"detect",
        targets:target()
      };
    }


    if(p.role === "medic") {

      return {
        kind:"targets",
        action:"protect",
        targets:target()
      };
    }


    if(p.role === "guard") {

      return {
        kind:"targets",
        action:"block",
        targets:target()
      };
    }


    if(p.role === "radio") {

      return game.systems.communications

        ? {
            kind:"radio"
          }

        : {
            kind:"none",
            message:
              "Communications is OFFLINE.",
            continueOnly:true
          };
    }


    if(p.role === "captain") {

      return {
        kind:"none",
        message:
          "Your ability is automatic if the vote ties.",
        continueOnly:true
      };
    }


    if(p.role === "judge") {

      return {
        kind:"none",
        message:
          "Your Judge ability appears when an ejection would occur.",
        continueOnly:true
      };
    }


    if(p.role === "trickster") {

      return game.tricksterUsed

        ? {
            kind:"none",
            message:
              "You already used your Trickster swap.",
            continueOnly:true
          }

        : {
            kind:"swap",
            targets:
              living().map(
                x => ({
                  id:x.id,
                  name:displayName(x.id)
                })
              )
          };
    }


    return {

      kind:"none",

      message:
        "You have no ability.",

      continueOnly:true
    };
  }


  function remoteButton(
    text,
    value,
    cls="choice-button"
  ) {

    return `
      <button
        type="button"
        class="${cls}"
        data-online-value="${esc(value)}"
      >
        ${text}
      </button>
    `;
  }


  /* =======================================================
     REMOTE ROLE
     ======================================================= */

  function renderRemoteRole(
    role,
    name,
    desc
  ) {

    const d =
      ROLE_DATA[role] ||
      {};

    const team =
      roleTeam(role);

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          YOUR SECRET ROLE
        </div>

        <div class="big-name center">
          ${esc(name)}
        </div>

        <div class="online-role">
          ${d.icon || "❓"}
        </div>

        <h1 class="center">
          ${esc(d.name || role)}
        </h1>

        <div
          class="team-badge ${teamClass(team)}"
          style="display:block;width:max-content;margin:0 auto"
        >
          ${esc(team.toUpperCase())}
          TEAM
        </div>

        <p class="role-description">
          ${esc(desc || d.desc || "")}
        </p>

        <button
          id="remoteRoleContinue"
          class="primary full"
          type="button"
        >
          CONTINUE
        </button>
      `;

    setScreen(
      "onlineRemoteScreen"
    );

    /*
      The actual ability prompt will arrive
      from the host immediately after.
    */
  }


  /* =======================================================
     REMOTE ABILITY
     ======================================================= */

  function renderRemoteAbility(msg) {

    const p =
      msg.prompt || {};

    let html =
      `

        <div class="eyebrow">
          ABILITY ROUND • ROUND ${msg.round}
          • STAGE ${msg.stage}/10
        </div>

        <h1>
          ${ROLE_DATA[msg.role]?.icon || ""}
          ${esc(ROLE_DATA[msg.role]?.name || msg.role)}
        </h1>

        <p class="muted">
          ${esc(ROLE_DATA[msg.role]?.desc || "")}
        </p>

        <div
          id="remoteAbilityArea"
          class="choice-grid"
        ></div>

        <button
          id="remoteAbilityConfirm"
          class="primary full"
          type="button"
        >
          CONFIRM
        </button>
      `;

    $("onlineRemoteContent").innerHTML =
      html;

    setScreen(
      "onlineRemoteScreen"
    );

    const area =
      $("remoteAbilityArea");

    let selected =
      null;

    const select =
      (value,btn) => {

        selected =
          value;

        area
          .querySelectorAll("button")
          .forEach(
            x =>
              x.classList.remove("selected")
          );

        btn.classList.add(
          "selected"
        );
      };


    if(p.kind === "none") {

      area.innerHTML =
        `
          <p class="large-message">
            ${esc(p.message || "")}
          </p>
        `;

      $("remoteAbilityConfirm").textContent =
        "CONTINUE";

      $("remoteAbilityConfirm").onclick =
        () =>
          sendRemoteCommand(
            "ability",
            {
              type:"none"
            }
          );

      return;
    }


    if(p.kind === "radio") {

      area.innerHTML =
        remoteButton(
          "📻 RECEIVE EARTH MESSAGE",
          "radio"
        );

      area
        .querySelector("button")
        .onclick =
          e =>
            select(
              "radio",
              e.currentTarget
            );
    }


    else if(p.kind === "systems") {

      area.innerHTML =
        (p.systems || [])
          .map(
            x =>
              remoteButton(
                x.label,
                x.id
              )
          )
          .join("");

      area
        .querySelectorAll("button")
        .forEach(
          b =>
            b.onclick =
              () =>
                select(
                  JSON.stringify({
                    type:p.action,
                    system:
                      b.dataset.onlineValue
                  }),
                  b
                )
        );
    }


    else if(p.kind === "targets") {

      area.innerHTML =
        (p.targets || [])
          .map(
            x =>
              remoteButton(
                x.name,
                x.id
              )
          )
          .join("");

      area
        .querySelectorAll("button")
        .forEach(
          b =>
            b.onclick =
              () =>
                select(
                  JSON.stringify({
                    type:p.action,
                    target:
                      b.dataset.onlineValue
                  }),
                  b
                )
        );
    }


    else if(p.kind === "alien") {

      area.innerHTML =
        remoteButton(
          "☠️ KILL",
          "kill"
        ) +

        (
          p.canSabotage
            ? remoteButton(
                "💥 SABOTAGE",
                "sabotage"
              )
            : ""
        );

      area
        .querySelectorAll("button")
        .forEach(
          b =>
            b.onclick = () => {

              const mode =
                b.dataset.onlineValue;

              select(
                mode,
                b
              );

              if(mode === "kill") {

                showRemoteAlienTargets(
                  area,
                  select
                );
              }

              if(mode === "sabotage") {

                showRemoteSystemsAfterMode(
                  area,
                  select,
                  "sabotage",
                  p.systems
                );
              }
            }
        );
    }


    else if(p.kind === "scientist") {

      $("remoteAbilityConfirm").disabled =
        true;

      area.innerHTML =
        (p.targets || [])
          .map(
            x =>
              remoteButton(
                `${x.name} — ${x.status}`,
                x.id
              )
          )
          .join("");

      area
        .querySelectorAll("button")
        .forEach(
          b =>
            b.onclick = () => {

              const t =
                p.targets.find(
                  x =>
                    x.id ===
                    b.dataset.onlineValue
                );

              area.innerHTML =
                remoteButton(
                  "🔬 CHECK",
                  "check"
                ) +

                (
                  t.cure
                    ? remoteButton(
                        "💉 CURE",
                        "cure"
                      )
                    : ""
                );

              area
                .querySelectorAll("button")
                .forEach(
                  x =>
                    x.onclick = () => {

                      selected =
                        JSON.stringify({
                          type:"science",
                          target:t.id,
                          mode:
                            x.dataset.onlineValue
                        });

                      area
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

                      $("remoteAbilityConfirm")
                        .disabled =
                          false;
                    }
                );
            }
        );
    }


    else if(p.kind === "swap") {

      $("remoteAbilityConfirm").disabled =
        true;

      let chosen = [];

      area.innerHTML =
        (p.targets || [])
          .map(
            x =>
              remoteButton(
                x.name,
                x.id
              )
          )
          .join("");

      area
        .querySelectorAll("button")
        .forEach(
          b =>
            b.onclick = () => {

              const id =
                b.dataset.onlineValue;

              if(chosen.includes(id)) {

                chosen =
                  chosen.filter(
                    x =>
                      x !== id
                  );

                b.classList.remove(
                  "selected"
                );

              } else if(
                chosen.length < 2
              ) {

                chosen.push(id);

                b.classList.add(
                  "selected"
                );
              }

              if(chosen.length === 2) {

                selected =
                  JSON.stringify({
                    type:"swap",
                    a:chosen[0],
                    b:chosen[1]
                  });

                $("remoteAbilityConfirm")
                  .disabled =
                    false;

              } else {

                $("remoteAbilityConfirm")
                  .disabled =
                    true;
              }
            }
        );
    }


    $("remoteAbilityConfirm").onclick =
      () => {

        if(selected === "radio") {

          sendRemoteCommand(
            "ability",
            {
              type:"radio"
            }
          );

          return;
        }

        if(selected) {

          sendRemoteCommand(
            "ability",
            JSON.parse(selected)
          );
        }
      };
  }


  function showRemoteAlienTargets(
    area,
    select
  ) {

    area.innerHTML =
      (
        ONLINE.lastAbilityTargets ||
        []
      )
      .map(
        x =>
          remoteButton(
            x.name,
            x.id
          )
      )
      .join("");

    area
      .querySelectorAll("button")
      .forEach(
        b =>
          b.onclick =
            () =>
              select(
                JSON.stringify({
                  type:"kill",
                  target:
                    b.dataset.onlineValue
                }),
                b
              )
      );
  }


  function showRemoteSystemsAfterMode(
    area,
    select,
    action,
    systems
  ) {

    area.innerHTML =
      (systems || [])
        .map(
          x =>
            remoteButton(
              x.label,
              x.id
            )
        )
        .join("");

    area
      .querySelectorAll("button")
      .forEach(
        b =>
          b.onclick =
            () =>
              select(
                JSON.stringify({
                  type:action,
                  system:
                    b.dataset.onlineValue
                }),
                b
              )
      );
  }


  function sendRemoteCommand(
    command,
    data
  ) {

    ONLINE.send({

      type:"command",

      command,

      ...data
    });

    ONLINE.showRemoteBase();

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          WAITING
        </div>

        <h1>
          ✓ SENT
        </h1>

        <p class="large-message">
          Waiting for the host to process your choice…
        </p>
      `;
  }


  /* =======================================================
     HOST REMOTE ABILITY
     ======================================================= */

  function hostRemoteAbility(msg) {

    const p =
      getPlayer(
        msg.playerId
      );

    if(!p || !alive(p)) {
      return;
    }

    let action = {
      type:
        msg.type ||
        "none"
    };

    if(msg.target) {
      action.target =
        msg.target;
    }

    if(msg.system) {
      action.system =
        msg.system;
    }

    if(msg.a) {
      action.a =
        msg.a;
    }

    if(msg.b) {
      action.b =
        msg.b;
    }

    if(msg.mode) {
      action.mode =
        msg.mode;
    }

    if(
      msg.type === "radio"
    ) {

      action = {
        type:"radio",
        message:
          randomRadioMessage()
      };
    }

    if(
      !validateRemoteAction(
        p,
        action
      )
    ) {

      action = {
        type:"none"
      };
    }

    game.selectedAction =
      action;

    game.actions[p.id] =
      action;

    applyImmediateAction(
      p,
      action
    );

    advanceAbility();
  }


  function validateRemoteAction(
    p,
    a
  ) {

    if(!canAct(p)) {

      return a.type === "none";
    }

    const validTarget =
      id =>
        living().some(
          x =>
            x.id === id &&
            x.id !== p.id
        );


    if(a.type === "kill") {

      return (
        p.role === "alien" &&
        validTarget(a.target) &&
        !(
          isHostile(
            getPlayer(a.target)
          ) &&
          !(
            game.displaySwap &&
            game.displaySwap.includes(
              a.target
            )
          )
        )
      );
    }


    if(a.type === "sabotage") {

      return (
        (
          p.role === "saboteur" ||
          (
            p.role === "alien" &&
            !living().some(
              x =>
                x.role === "saboteur"
            )
          )
        ) &&
        game.systems[
          a.system
        ] !== undefined
      );
    }


    if(
      a.type === "silence" ||
      a.type === "infect" ||
      a.type === "detect" ||
      a.type === "protect" ||
      a.type === "block"
    ) {

      const required = {

        silence:"silencer",
        infect:"parasite",
        detect:"detective",
        protect:"medic",
        block:"guard"

      }[a.type];

      return (
        p.role === required &&
        validTarget(a.target)
      );
    }


    if(a.type === "repair") {

      return (
        p.role === "engineer" &&
        game.systems[
          a.system
        ] === false
      );
    }


    if(a.type === "science") {

      return (
        p.role === "scientist" &&
        validTarget(a.target) &&
        (
          a.mode === "check" ||
          a.mode === "cure"
        )
      );
    }


    if(a.type === "radio") {

      return (
        p.role === "radio" &&
        game.systems.communications
      );
    }


    if(a.type === "swap") {

      return (
        p.role === "trickster" &&
        !game.tricksterUsed &&
        a.a !== a.b &&
        validTarget(a.a) &&
        validTarget(a.b)
      );
    }


    return a.type === "none";
  }


  /* =======================================================
     REMOTE REACTION
     ======================================================= */

  function hostRemoteReactionAck(msg) {

    if(
      game.reactionQueue[
        game.reactionIndex
      ] !== msg.playerId
    ) {

      return;
    }

    game.reactionIndex++;

    nextReaction();
  }


  function renderRemoteReaction(msg) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          REACTION ROUND • ROUND ${msg.round}
        </div>

        <h1>
          ${esc(
            msg.title ||
            "ROUND RESULT"
          )}
        </h1>

        <p class="large-message">
          ${esc(
            msg.message ||
            "Nothing happened to you this round."
          )}
        </p>

        <button
          id="remoteReactionAck"
          class="primary full"
          type="button"
        >
          CONTINUE
        </button>
      `;

    setScreen(
      "onlineRemoteScreen"
    );

    $("remoteReactionAck").onclick =
      () => {

        ONLINE.send({

          type:"command",

          command:
            "reaction_ack",

          playerId:
            ONLINE.myPlayerId
        });

        $("remoteReactionAck")
          .disabled =
            true;
      };
  }


  /* =======================================================
     REMOTE DISCUSSION
     ======================================================= */

  function renderRemoteDiscussion(
    data
  ) {

    const systems =
      Object.entries(
        data.systems || {}
      )
      .map(
        ([k,v]) =>
          `${v ? "🟢" : "🔴"} ${k.toUpperCase()}`
      )
      .join("  ");

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          DISCUSSION • ROUND ${data.round || ""}
        </div>

        <h1>
          DISCUSS
        </h1>

        <div class="results-box">

          ${data.results || "No deaths this round."}

          <hr>

          ${systems}

        </div>

        <p class="muted">
          Wait for the host to start voting.
        </p>
      `;

    setScreen(
      "onlineRemoteScreen"
    );
  }


  /* =======================================================
     REMOTE VOTE
     ======================================================= */

  function renderRemoteVote(msg) {

    const opts =
      (msg.options || [])
        .map(
          x =>
            remoteButton(
              x.name,
              x.id
            )
        )
        .join("") +

      remoteButton(
        "⏭️ SKIP",
        "skip"
      );

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          VOTING • ROUND ${msg.round}
        </div>

        <h1>
          YOUR VOTE
        </h1>

        <p class="muted">
          ${
            msg.silenced
              ? "🔇 You are silenced and cannot vote."
              : "Choose a player or skip."
          }
        </p>

        <div class="choice-grid">

          ${
            msg.silenced
              ? remoteButton(
                  "SKIP (SILENCED)",
                  "skip"
                )
              : opts
          }

        </div>

        <button
          id="remoteVoteConfirm"
          class="primary full"
          type="button"
        >
          CONFIRM VOTE
        </button>
      `;

    setScreen(
      "onlineRemoteScreen"
    );

    let selected = null;

    $("onlineRemoteContent")
      .querySelectorAll(
        "[data-online-value]"
      )
      .forEach(
        b =>
          b.onclick =
            () => {

              selected =
                b.dataset.onlineValue;

              $("onlineRemoteContent")
                .querySelectorAll(
                  "[data-online-value]"
                )
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

    $("remoteVoteConfirm").onclick =
      () => {

        if(!selected) return;

        ONLINE.send({

          type:"command",

          command:"vote",

          playerId:
            ONLINE.myPlayerId,

          vote:selected
        });

        $("remoteVoteConfirm")
          .disabled =
            true;
      };
  }


  /* =======================================================
     HOST REMOTE VOTE
     ======================================================= */

  function hostRemoteVote(msg) {

    const alivePlayers =
      living();

    const p =
      alivePlayers[
        game.currentVoteIndex
      ];

    if(
      !p ||
      p.id !== msg.playerId
    ) {

      return;
    }

    const valid =
      msg.vote === "skip" ||
      alivePlayers.some(
        x =>
          x.id === msg.vote &&
          x.id !== p.id
      );

    if(!valid) {
      return;
    }

    game.votes[p.id] =
      msg.vote;

    game.currentVoteIndex++;

    showVote();
  }


  /* =======================================================
     REMOTE CAPTAIN
     ======================================================= */

  function renderRemoteCaptain(
    msg
  ) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          CAPTAIN TIE-BREAKER
        </div>

        <h1>
          👨‍✈️ TIE
        </h1>

        <p class="large-message">
          Choose one tied player to eject.
        </p>

        <div class="choice-grid">

          ${
            (msg.tied || [])
              .map(
                x =>
                  remoteButton(
                    x.name,
                    x.id
                  )
              )
              .join("")
          }

        </div>
      `;

    setScreen(
      "onlineRemoteScreen"
    );

    $("onlineRemoteContent")
      .querySelectorAll(
        "[data-online-value]"
      )
      .forEach(
        b =>
          b.onclick =
            () => {

              ONLINE.send({

                type:"command",

                command:"captain",

                playerId:
                  ONLINE.myPlayerId,

                target:
                  b.dataset.onlineValue
              });

              b.disabled =
                true;
            }
      );
  }


  function hostRemoteCaptain(
    msg
  ) {

    if(!game.pendingCaptain) {
      return;
    }

    if(
      game.pendingCaptain.captainId !==
      msg.playerId
    ) {
      return;
    }

    if(
      !game.pendingCaptain.tied.includes(
        msg.target
      )
    ) {
      return;
    }

    game.pendingCaptain =
      null;

    finishEjection(
      msg.target,
      true
    );
  }


  /* =======================================================
     REMOTE JUDGE
     ======================================================= */

  function renderRemoteJudge(
    msg
  ) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          ⚖️ JUDGE
        </div>

        <h1>
          Cancel ejection?
        </h1>

        <p class="large-message">
          ${esc(msg.targetName)}
          would be ejected.
          You can cancel this once per game.
        </p>

        <div class="choice-grid">

          <button
            id="remoteJudgeCancel"
            class="primary"
            type="button"
          >
            CANCEL
          </button>

          <button
            id="remoteJudgeAllow"
            type="button"
          >
            ALLOW
          </button>

        </div>
      `;

    setScreen(
      "onlineRemoteScreen"
    );

    $("remoteJudgeCancel").onclick =
      () => {

        sendRemoteCommand(
          "judge",
          {
            playerId:
              ONLINE.myPlayerId,

            cancel:true
          }
        );
      };

    $("remoteJudgeAllow").onclick =
      () => {

        sendRemoteCommand(
          "judge",
          {
            playerId:
              ONLINE.myPlayerId,

            cancel:false
          }
        );
      };
  }


  function hostRemoteJudge(msg) {

    if(!game.pendingEjection) {
      return;
    }

    if(
      msg.playerId !==
      game.pendingEjection.judgeId
    ) {
      return;
    }

    resolveJudgeDecision(
      !!msg.cancel
    );
  }


  /* =======================================================
     REMOTE PUBLIC SCREENS
     ======================================================= */

  function renderRemoteLifeline(
    data
  ) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          EARTH TRANSMISSION
        </div>

        <h1>
          ${esc(
            data.title ||
            "EARTH LIFELINE"
          )}
        </h1>

        <p class="large-message">
          ${esc(
            data.message ||
            ""
          )}
        </p>

        <p class="muted">
          The host will continue when ready.
        </p>
      `;

    setScreen(
      "onlineRemoteScreen"
    );
  }


  function renderRemoteVoteResult(
    data
  ) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          VOTE RESULT
        </div>

        <h1>
          ${esc(
            data.title ||
            ""
          )}
        </h1>

        <p class="large-message">
          ${esc(
            data.message ||
            ""
          )}
        </p>

        <p class="muted">
          Waiting for the host…
        </p>
      `;

    setScreen(
      "onlineRemoteScreen"
    );
  }


  function renderRemoteSystems(
    data
  ) {

    const systems =
      Object.entries(
        data.systems || {}
      )
      .map(
        ([k,v]) =>
          `
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

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          SHIP STATUS
        </div>

        <h1>
          ROUND ${data.round}
        </h1>

        <div class="round-label">
          STAGE ${data.stage} / 10
        </div>

        <div class="systems-list">
          ${systems}
        </div>

        <p class="muted">
          Waiting for the host to begin the next round.
        </p>
      `;

    setScreen(
      "onlineRemoteScreen"
    );
  }


  function renderRemoteGameOver(
    title,
    message,
    players
  ) {

    $("onlineRemoteContent").innerHTML =
      `

        <div class="eyebrow">
          GAME OVER
        </div>

        <h1>
          ${esc(title || "")}
        </h1>

        <p class="large-message">
          ${esc(message || "")}
        </p>

        <div class="final-players">

          ${
            (players || [])
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

                      [
                        ${roleTeam(p.role)}
                      ]

                      ${p.alive ? "ALIVE" : "DEAD"}

                    </div>
                  `
              )
              .join("")
          }

        </div>

        <button
          class="primary full"
          onclick="location.reload()"
        >
          PLAY AGAIN
        </button>
      `;

    setScreen(
      "onlineRemoteScreen"
    );
  }


  /* =======================================================
     HOOK ONLINE INTO NORMAL GAME FLOW
     ======================================================= */

  const originalPassToAbility =
    passToAbility;

  passToAbility =
    function() {

      if(
        ONLINE.mode &&
        ONLINE.host
      ) {

        if(
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

        if(
          p?.clientId &&
          p.clientId !==
            ONLINE.clientId
        ) {

          return ONLINE.promptRemoteAbility(
            p
          );
        }
      }

      return originalPassToAbility();
    };


  const originalNextReaction =
    nextReaction;

  nextReaction =
    function() {

      if(
        ONLINE.mode &&
        ONLINE.host &&
        game.reactionIndex <
          game.reactionQueue.length
      ) {

        const p =
          getPlayer(
            game.reactionQueue[
              game.reactionIndex
            ]
          );

        if(
          p?.clientId &&
          p.clientId !==
            ONLINE.clientId
        ) {

          const msg =
            game.reactionInfo[p.id] ||

            (
              game.silencedUntil[p.id] &&
              game.silencedUntil[p.id] >
                game.round

                ? `You are silenced for ${game.silencedUntil[p.id]-game.round} more round(s). You cannot vote.`

                : "Nothing happened to you this round."
            );

          ONLINE.sendPrivate(
            p.clientId,
            {
              type:"reaction_prompt",

              round:
                game.round,

              title:
                p.alive
                  ? "ROUND RESULT"
                  : "YOU DIED THIS ROUND",

              message:msg
            }
          );

          ONLINE.setHostWaiting(
            `${p.name} is viewing their private result…`
          );

          return;
        }
      }

      return originalNextReaction();
    };


  const originalShowDiscussion =
    showDiscussion;

  showDiscussion =
    function() {

      originalShowDiscussion();

      if(
        ONLINE.mode &&
        ONLINE.host
      ) {

        const data = {

          kind:"discussion",

          round:
            game.round,

          stage:
            game.stage,

          results:
            game.lastRoundResults
              .join("<br>") ||
            "No deaths this round.",

          systems:{
            ...game.systems
          }
        };

        ONLINE.broadcastPublic(
          data
        );

        for(
          const p of game.players
        ) {

          if(
            p.clientId &&
            p.clientId !==
              ONLINE.clientId
          ) {

            ONLINE.sendPrivate(
              p.clientId,
              {
                type:"discussion",
                data
              }
            );
          }
        }
      }
    };


  const originalShowVote =
    showVote;

  showVote =
    function() {

      if(
        ONLINE.mode &&
        ONLINE.host
      ) {

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

        if(
          p?.clientId &&
          p.clientId !==
            ONLINE.clientId
        ) {

          const silenced =
            (
              game.silencedUntil[p.id] ||
              0
            ) > game.round;

          ONLINE.sendPrivate(
            p.clientId,
            {

              type:"vote_prompt",

              round:
                game.round,

              playerId:
                p.id,

              silenced,

              options:
                silenced
                  ? []
                  : living()
                      .filter(
                        x =>
                          x.id !==
                          p.id
                      )
                      .map(
                        x => ({
                          id:x.id,
                          name:
                            displayName(x.id)
                        })
                      )
            }
          );

          ONLINE.setHostWaiting(
            `${p.name} is voting…`
          );

          return;
        }
      }

      return originalShowVote();
    };


  const originalShowCaptainTie =
    showCaptainTie;

  showCaptainTie =
    function(
      tied,
      captain
    ) {

      if(
        ONLINE.mode &&
        ONLINE.host &&
        captain.clientId &&
        captain.clientId !==
          ONLINE.clientId
      ) {

        game.pendingCaptain = {

          tied:[
            ...tied
          ],

          captainId:
            captain.id
        };

        ONLINE.sendPrivate(
          captain.clientId,
          {
            type:"captain_prompt",

            tied:
              tied.map(
                id => ({
                  id,
                  name:
                    displayName(id)
                })
              )
          }
        );

        ONLINE.setHostWaiting(
          `${captain.name} is choosing the tie-break…`
        );

        return;
      }

      return originalShowCaptainTie(
        tied,
        captain
      );
    };


  const originalShowLifeline =
    showLifeline;

  showLifeline =
    function() {

      originalShowLifeline();

      if(
        ONLINE.mode &&
        ONLINE.host
      ) {

        ONLINE.broadcastPublic({

          kind:"lifeline",

          title:
            $("lifelineTitle").textContent,

          message:
            $("lifelineMessage").textContent
        });
      }
    };


  const originalProceedSystems =
    proceedToSystems;

  proceedToSystems =
    function() {

      originalProceedSystems();

      if(
        ONLINE.mode &&
        ONLINE.host &&
        !game.gameOver
      ) {

        ONLINE.broadcastPublic({

          kind:"systems",

          round:
            game.round,

          stage:
            game.stage,

          systems:{
            ...game.systems
          }
        });
      }
    };


  /*
    Re-send the current discussion state to remote players
    without revealing roles.
  */

  const originalStartVoting =
    startVoting;

  startVoting =
    function() {

      if(
        ONLINE.mode &&
        ONLINE.host
      ) {

        ONLINE.broadcastPublic({

          kind:"voting",

          round:
            game.round
        });
      }

      return originalStartVoting();
    };


  /* =======================================================
     ONLINE BINDING
     ======================================================= */

  function bindOnline() {

    injectOnlineUI();

    addOnlineButton();

    $("createRoomButton").onclick =
      createRoom;

    $("joinRoomButton").onclick =
      showJoinBox;

    $("connectRoomButton").onclick =
      joinRoom;

    $("onlineHostSetupButton").onclick =
      beginOnlineSetup;

    $("onlineBackButton").onclick =
      () => {

        ONLINE.mode =
          false;

        ONLINE.host =
          false;

        if(ONLINE.channel) {

          try {

            supabaseClient
              ?.removeChannel(
                ONLINE.channel
              );

          } catch(e){}
        }

        setScreen(
          "setupScreen"
        );
      };
  }


  bindOnline();

})();
