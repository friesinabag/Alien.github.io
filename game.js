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
    desc:"Repair 1 offline ship system each round. You can act even when Power is offline."
  },
  scientist:{
    icon:"🧪",
    name:"Scientist",
    team:"Human",
    desc:"Check 1 living player to see Healthy, Infected, Diseased or Parasite. You can cure Infected or Diseased."
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
    desc:"Once per round, explicitly receive a private message from Earth while Communications is online."
  },
  judge:{
    icon:"⚖️",
    name:"Judge",
    team:"Human",
    desc:"Once per game, cancel ANY vote ejection. Power must be online."
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
    desc:"Once per game, swap the displayed identities of two living players. The swap lasts through Reaction, Discussion and Voting, then ends."
  },

  infected:{
    icon:"🦠",
    name:"Infected",
    team:"Infection",
    sub:true,
    desc:"A completely hidden infection stage. The infected player does not know they are infected. Only the Scientist can detect it."
  },
  diseased:{
    icon:"☣️",
    name:"Diseased",
    team:"Hostile",
    sub:true,
    desc:"The second infection stage. You now know you are Diseased and on the Hostile Team. You cannot use an ability."
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
    [
      ...HOSTILES,
      ...HUMANS,
      ...NEUTRALS,
      ...CONCEPTS
    ].map(r => [r,r !== "trickster"])
  ),

  counts:Object.fromEntries(
    [
      ...HOSTILES,
      ...HUMANS,
      ...NEUTRALS,
      ...CONCEPTS
    ].map(r => [r,0])
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

  gameOver:false,
  voteResolutionDone:false,

  tricksterUsed:false,
  displaySwap:null,

  judgeUsed:false,
  pendingEjection:null,

  currentPlayerIndex:0,
  currentVoteIndex:0,

  systems:{
    engines:true,
    o2:true,
    communications:true,
    power:true
  }
};

function teamClass(team) {
  if(team === "Human") return "human";
  if(team === "Hostile") return "hostile";
  if(team === "Neutral") return "neutral";
  return "infection";
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

function canAct(p) {
  if(!alive(p)) return false;

  /*
    Engineer is the only role that can act while
    Power is offline.
  */
  if(p.role === "engineer") {
    if(game.blockedPlayers.has(p.id)) return false;
    return true;
  }

  /*
    Infected, Diseased and passive roles do not
    perform normal abilities.
  */
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

  if(p.role === "judge" && game.judgeUsed) {
    return false;
  }

  return true;
}

function realName(id) {
  return getPlayer(id)?.name || "";
}

/*
  The underlying player IDs never change.

  Trickster only changes which real player name is
  displayed in public-facing selection screens.
*/
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

  const hit = Object.entries(map).find(
    ([,realId]) => realName(realId) === name
  );

  return hit ? hit[0] : null;
}

function targetOptions(actor=null,excludeId=null) {
  return living()
    .filter(p => {

      if(p.id === excludeId) {
        return false;
      }

      /*
        Hostiles normally cannot target known living
        Hostiles.

        Trickster can cause displayed identities to
        be swapped, so the displayed identity can
        accidentally cause a hostile teammate to be
        selected.
      */
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
      data-value="${esc(value)}">
      ${text}
    </button>
  `;
}

function showSetup() {
  setScreen("setupScreen");
  renderSetup();
}

function renderSetup() {
  const container = $("playersSetup");

  if(!container) return;

  container.innerHTML = game.players.length
    ? game.players.map((p,i) => `
      <div class="setup-player">

        <label>
          PLAYER ${i+1} NAME

          <input
            class="player-name-input"
            type="text"
            maxlength="20"
            value="${esc(p.name || `Player ${i+1}`)}"
            data-name-index="${i}"
            autocomplete="off"
            autocapitalize="words"
            spellcheck="false"
            placeholder="Player ${i+1}">
        </label>

        <label>
          ROLE

          <select
            class="role-select ${game.randomisedRoles && game.randomRoles[i] ? "random-hidden" : ""}"
            data-index="${i}">

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
  bindSetupSelects();
}

function bindSetupSelects() {

  /*
    Player names are edited ONLY during setup.
  */
  document
    .querySelectorAll(".player-name-input")
    .forEach(input => {

      input.oninput = () => {
        const i = Number(input.dataset.nameIndex);

        if(game.players[i]) {
          game.players[i].name =
            input.value.slice(0,20) ||
            `Player ${i+1}`;
        }
      };

      input.onblur = () => {
        const i = Number(input.dataset.nameIndex);

        if(game.players[i]) {

          game.players[i].name =
            input.value.trim() ||
            `Player ${i+1}`;

          input.value = game.players[i].name;
        }
      };
    });

  /*
    Selecting a manual role replaces the hidden
    random role for that player.
  */
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
  const n = Number($("playerCount")?.value || 4);

  game.players = Array.from(
    {length:n},
    (_,i) => ({
      id:`p${i+1}`,
      name:`Player ${i+1}`,
      role:"survivor",
      alive:true,
      originalRole:"survivor",
      infectionRound:null,
      hasInfected:false,
      clientId:null
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

  const el = $("playerValidity");

  if(!el) return;

  el.textContent =
    `PLAYERS: ${n} / ${n}  •  ${
      total
        ? `CUSTOM ROLES: ${total} / ${n}`
        : "RANDOM ROLES"
    }`;
}

function weightedPick(items,weights) {

  const total =
    items.reduce(
      (s,k) => s + (weights[k] || 0),
      0
    );

  let r = Math.random() * total;

  for(const k of items) {

    r -= weights[k] || 0;

    if(r < 0) {
      return k;
    }
  }

  return items[items.length - 1];
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

  if(enabledHumans.length < n - h) {
    return alert(
      "Enable enough Human roles to fill the random setup."
    );
  }

  let roles = [];

  /*
    Hostile roles:
    no duplicates.
  */
  const hostile =
    shuffle(enabledHostiles).slice(0,h);

  roles.push(...hostile);

  /*
    Engineer is always guaranteed.
  */
  roles.push("engineer");

  const humanNeeded = n - h - 1;

  let pool =
    enabledHumans.filter(
      r => r !== "engineer"
    );

  if(pool.length < humanNeeded) {
    return alert(
      "Not enough enabled Human roles for this player count."
    );
  }

  /*
    Weighted human selection with no duplicates.
  */
  for(let i=0;i<humanNeeded;i++) {

    const pick =
      weightedPick(pool,HUMAN_WEIGHTS);

    roles.push(pick);

    pool =
      pool.filter(r => r !== pick);
  }

  /*
    Any remaining slots are Neutral roles.
  */
  const neutralSlots =
    n - roles.length;

  if(neutralSlots > 0) {

    const enabledNeutral =
      [
        ...NEUTRALS,
        ...CONCEPTS
      ]
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

  /*
    Engineer is always present.
  */
  if(!roles.includes("engineer")) {
    roles[n-1] = "engineer";
  }

  const counts =
    Object.fromEntries(
      ROLE_KEYS.map(r => [r,0])
    );

  roles.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });

  if(counts.engineer !== 1) {
    return alert(
      "There must be exactly 1 Engineer."
    );
  }

  const hostileCount =
    counts.alien +
    counts.saboteur +
    counts.silencer +
    counts.parasite;

  if(hostileCount !== h) {
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

function startRound() {

  if(checkVictory()) {
    return;
  }

  /*
    IMPORTANT:
    Save the previous round BEFORE clearing
    this round's actions.

    This fixes Detective information.
  */
  game.previousActions =
    game.actions
      ? {...game.actions}
      : {};

  resetTransient();

  /*
    Everyone alive at the START of the round
    participates in the Ability and Reaction
    rounds.

    If someone dies during the round, they still
    get their Reaction result.
  */
  game.roundStartAliveIds =
    living().map(p => p.id);

  game.abilityQueue =
    [...game.roundStartAliveIds];

  game.abilityIndex = 0;

  game.actions = {};

  passToAbility();
}

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

  if(!p) {
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

function showRole() {

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  if(!p) {
    return advanceAbility();
  }

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
            <strong>HOSTILE ALLIES</strong><br>
            ${allies
              .map(
                x =>
                  `${ROLE_DATA[x.role].icon} ${esc(x.name)}`
              )
              .join("<br>")}
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

function showAction() {

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  if(!p) {
    return advanceAbility();
  }

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
          ? "You are Infected. You do not have an ability."
          : p.role === "survivor"
            ? "You have no ability."
            : p.role === "jester"
              ? "You have no ability."
              : p.role === "king"
                ? "You have no ability."
                : game.blockedPlayers.has(p.id)
                  ? "Your ability was blocked this round."
                  : !game.systems.power && p.role !== "engineer"
                    ? "Power is OFFLINE. Your ability cannot be used."
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
            o => button(o.label,o.id)
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
              .forEach(x =>
                x.classList.remove("selected")
              );

            b.classList.add("selected");
          };
        });
    };

  if(p.role === "alien") {

    const saboteurAlive =
      living().some(
        x => x.role === "saboteur"
      );

    /*
      If a Saboteur is alive, Alien can ONLY kill.
    */
    if(saboteurAlive) {

      $("actionDescription").textContent =
        "A living Saboteur exists, so you can only kill.";

      renderTargetChoices(
        p,
        null,
        "kill"
      );

    } else {

      $("actionDescription").textContent =
        "Choose Kill or Sabotage.";

      $("actionOptions").innerHTML = `
        <button
          type="button"
          class="choice-button"
          data-value="kill">
          ☠️ KILL
        </button>

        <button
          type="button"
          class="choice-button"
          data-value="sabotage">
          💥 SABOTAGE
        </button>
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
              .forEach(x =>
                x.classList.remove("selected")
              );

            b.classList.add("selected");

            if(mode === "kill") {
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
    }

  } else if(p.role === "saboteur") {

    renderSystemChoices();

  } else if(p.role === "silencer") {

    renderTargetChoices(
      p,
      null,
      "silence"
    );

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

  } else if(p.role === "engineer") {

    renderSystemChoices(true);

  } else if(p.role === "scientist") {

    renderScientistChoices(p);

  } else if(p.role === "detective") {

    renderTargetChoices(
      p,
      null,
      "detect"
    );

  } else if(p.role === "medic") {

    renderTargetChoices(
      p,
      null,
      "protect"
    );

  } else if(p.role === "guard") {

    renderTargetChoices(
      p,
      null,
      "block"
    );

  } else if(p.role === "radio") {

    if(!game.systems.communications) {

      $("actionDescription").textContent =
        "Communications is OFFLINE.";

      game.selectedAction = "none";

    } else {

      $("actionDescription").textContent =
        "Choose RECEIVE to get a private message from Earth.";

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

          $("actionOptions")
            .querySelector("button")
            .classList.add("selected");
        };
    }

  } else if(p.role === "captain") {

    $("actionDescription").textContent =
      "Your ability is automatic if a vote ties. You do not need to choose anything.";

    game.selectedAction =
      "none";

  } else if(p.role === "judge") {

    $("actionDescription").textContent =
      "Your Judge ability appears privately if a vote would eject someone.";

    game.selectedAction =
      "none";

  } else if(p.role === "trickster") {

    if(game.tricksterUsed) {

      $("actionDescription").textContent =
        "You already used your Trickster swap.";

      game.selectedAction =
        "none";

    } else {

      renderSwapChoices(p);
    }

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

function renderScientistChoices(p) {

  $("actionDescription").textContent =
    "Choose a living player to check. You will see Healthy, Infected, Diseased or Parasite.";

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
          getPlayer(b.dataset.value);

        if(!t) return;

        game.selectedAction =
          JSON.stringify({
            type:"science",
            target:t.id,
            mode:"check"
          });

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x =>
            x.classList.remove("selected")
          );

        b.classList.add("selected");

        /*
          Only offer CURE when the target is
          actually Infected or Diseased.
        */
        const existing =
          $("scienceExtraButtons");

        if(existing) {
          existing.remove();
        }

        if(
          t.role === "infected" ||
          t.role === "diseased"
        ) {

          const extra =
            document.createElement("div");

          extra.id =
            "scienceExtraButtons";

          extra.style.marginTop =
            "10px";

          extra.innerHTML = `
            <button
              type="button"
              class="choice-button"
              data-science-cure="yes">
              💉 CURE ${esc(t.name)}
            </button>
          `;

          $("actionOptions")
            .parentElement
            ?.appendChild(extra);

          extra
            .querySelector("button")
            .onclick = () => {

              game.selectedAction =
                JSON.stringify({
                  type:"science",
                  target:t.id,
                  mode:"cure"
                });

              $("actionOptions")
                .querySelectorAll("button")
                .forEach(x =>
                  x.classList.remove("selected")
                );

              b.classList.add("selected");

              extra
                .querySelector("button")
                .classList.add("selected");
            };
        }
      };
    });
}

function renderTargetChoices(
  p,
  unused,
  action
) {

  $("actionDescription").textContent = {
    kill:
      "Choose a player to kill.",
    silence:
      "Choose a living player to silence for 2 rounds.",
    infect:
      "Choose a player to infect. They will NOT be told they were infected.",
    detect:
      "Choose a player to investigate.",
    protect:
      "Choose a living player to protect from a kill.",
    block:
      "Choose a living player whose ability to block."
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

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x =>
            x.classList.remove("selected")
          );

        b.classList.add("selected");
      };
    });
}

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
      engineer
        ? "No systems are currently offline."
        : "There are no systems available.";

    game.selectedAction =
      "none";

    return;
  }

  $("actionDescription").textContent =
    engineer
      ? "Choose ONE offline system to repair."
      : "Choose ONE ship system to sabotage.";

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
            type:engineer
              ? "repair"
              : "sabotage",
            system:b.dataset.value
          });

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x =>
            x.classList.remove("selected")
          );

        b.classList.add("selected");
      };
    });
}

function renderSwapChoices(p) {

  const ids =
    living().map(x => x.id);

  $("actionDescription").textContent =
    "Choose TWO living players. Their displayed identities will be swapped through Reaction, Discussion and Voting.";

  $("actionOptions").innerHTML =
    ids
      .map(
        id => button(
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

        } else if(chosen.length < 2) {

          chosen.push(id);

          b.classList.add(
            "selected"
          );
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

function completeAbility() {

  const p =
    getPlayer(
      game.abilityQueue[game.abilityIndex]
    );

  if(!p) {
    return advanceAbility();
  }

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
    } catch(e) {
      action = "none";
    }
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

    game.reactionInfo[p.id] =
      game.actions[p.id].message;

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

function applyImmediateAction(actor, action) {

  if(!action || typeof action !== "object") {
    return;
  }

  /*
    Guard is resolved first because it determines
    whether another player's ability is blocked.
  */
  if(action.type === "block") {

    const target =
      getPlayer(action.target);

    if(target && alive(target)) {
      game.blockedPlayers.add(target.id);
    }

    return;
  }

  /*
    Engineer repairs one offline system.
  */
  if(action.type === "repair") {

    if(actor.role !== "engineer") {
      return;
    }

    const system =
      action.system;

    if(
      Object.prototype.hasOwnProperty.call(
        game.systems,
        system
      ) &&
      !game.systems[system]
    ) {

      game.systems[system] = true;
    }

    return;
  }

  /*
    Medic protection is recorded for the
    end-of-ability resolution.
  */
  if(action.type === "protect") {

    const target =
      getPlayer(action.target);

    if(target && alive(target)) {
      game.protectedPlayers.add(target.id);
    }

    return;
  }

  /*
    Parasite infection.

    IMPORTANT:
    There is deliberately NO message sent to
    the infected player.

    Their role remains displayed as their original
    role until they become Diseased.
  */
  if(action.type === "infect") {

    if(actor.role !== "parasite") {
      return;
    }

    if(actor.hasInfected) {
      return;
    }

    const target =
      getPlayer(action.target);

    if(
      !target ||
      !alive(target) ||
      target.id === actor.id
    ) {
      return;
    }

    /*
      Do not infect existing Hostiles or Neutrals.
    */
    if(
      roleTeam(target.role) === "Hostile" ||
      roleTeam(target.role) === "Neutral"
    ) {
      return;
    }

    if(
      target.role === "infected" ||
      target.role === "diseased" ||
      target.role === "parasite"
    ) {
      return;
    }

    target.originalRole =
      target.originalRole || target.role;

    target.role = "infected";

    target.infectionRound =
      game.round;

    actor.hasInfected = true;

    /*
      NO reactionInfo is created here.
      The target must not know they were infected.
    */

    return;
  }

  /*
    Scientist check / cure.
  */
  if(action.type === "science") {

    const target =
      getPlayer(action.target);

    if(
      !target ||
      !alive(target)
    ) {
      return;
    }

    if(action.mode === "check") {

      let result = "Healthy";

      if(target.role === "infected") {
        result = "Infected";
      } else if(target.role === "diseased") {
        result = "Diseased";
      } else if(target.role === "parasite") {
        result = "Parasite";
      }

      game.reactionInfo[actor.id] =
        `SCIENCE RESULT: ${target.name} is ${result}.`;

    } else if(action.mode === "cure") {

      if(
        target.role === "infected" ||
        target.role === "diseased"
      ) {

        target.role =
          target.originalRole &&
          target.originalRole !== "infected" &&
          target.originalRole !== "diseased"
            ? target.originalRole
            : "survivor";

        target.infectionRound =
          null;

        game.reactionInfo[actor.id] =
          `SCIENCE RESULT: ${target.name} was cured.`;

      } else {

        game.reactionInfo[actor.id] =
          `SCIENCE RESULT: ${target.name} could not be cured.`;
      }
    }

    return;
  }

  /*
    Detective.
  */
  if(action.type === "detect") {

    const target =
      getPlayer(action.target);

    if(!target) {
      return;
    }

    const previous =
      game.previousActions[target.id];

    let result =
      "did not use an ability";

    if(previous) {

      if(previous.type === "none") {
        result =
          "did not use an ability";
      }

      else if(previous.type === "kill") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "sabotage") {
        result =
          `interacted with the ${String(previous.system).toUpperCase()} system`;
      }

      else if(previous.type === "repair") {
        result =
          `interacted with the ${String(previous.system).toUpperCase()} system`;
      }

      else if(previous.type === "infect") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "protect") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "block") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "silence") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "science") {
        result =
          "interacted with another player";
      }

      else if(previous.type === "radio") {
        result =
          "used the ship's radio";
      }

      else if(previous.type === "swap") {
        result =
          "interacted with another player";
      }
    }

    game.reactionInfo[actor.id] =
      `DETECTIVE REPORT: ${target.name} ${result} last round.`;

    return;
  }

  /*
    Silencer.
  */
  if(action.type === "silence") {

    const target =
      getPlayer(action.target);

    if(
      target &&
      alive(target) &&
      target.id !== actor.id
    ) {

      /*
        Silence lasts for two rounds.
      */
      target.silencedUntil =
        game.round + 2;

      game.silencedUntil[target.id] =
        game.round + 2;
    }

    return;
  }

  /*
    Alien kill.
    Actual death is resolved after every ability
    has been submitted so Medic can protect targets.
  */
  if(action.type === "kill") {

    return;
  }

  /*
    Sabotage.
  */
  if(action.type === "sabotage") {

    if(
      actor.role !== "alien" &&
      actor.role !== "saboteur"
    ) {
      return;
    }

    const system =
      action.system;

    if(
      Object.prototype.hasOwnProperty.call(
        game.systems,
        system
      )
    ) {

      game.systems[system] = false;
    }

    return;
  }

  /*
    Trickster.
  */
  if(action.type === "swap") {

    if(
      actor.role !== "trickster" ||
      game.tricksterUsed
    ) {
      return;
    }

    const a =
      getPlayer(action.a);

    const b =
      getPlayer(action.b);

    if(
      !a ||
      !b ||
      !alive(a) ||
      !alive(b) ||
      a.id === b.id
    ) {
      return;
    }

    game.displaySwap =
      [a.id,b.id];

    game.tricksterUsed = true;

    return;
  }
}

function resolveAbilities() {

  /*
    Resolve all kill actions after every player
    has submitted their ability.

    This is important for:
    - Medic protection
    - simultaneous round participation
    - players who die still receiving Reaction
  */

  const kills = [];

  for(const p of game.players) {

    if(!alive(p)) {
      continue;
    }

    const action =
      game.actions[p.id];

    if(
      action &&
      action.type === "kill" &&
      p.role === "alien"
    ) {

      const target =
        getPlayer(action.target);

      if(
        target &&
        alive(target) &&
        target.id !== p.id
      ) {

        kills.push({
          attacker:p,
          target
        });
      }
    }
  }

  /*
    Apply kills.

    A protected player survives.
  */
  for(const kill of kills) {

    if(
      game.protectedPlayers.has(
        kill.target.id
      )
    ) {

      game.reactionInfo[kill.target.id] =
        "You survived the round.";

      continue;
    }

    kill.target.alive = false;

    game.reactionInfo[kill.target.id] =
      "You were eliminated this round.";
  }

  /*
    Infection progression happens after actions
    resolve, so the player remains unaware until
    the correct progression stage.
  */
  progressInfections();

  /*
    Prepare Reaction Round using the snapshot
    from the START of this round.

    Therefore players killed during this round
    still receive a Reaction result.
  */
  game.reactionQueue =
    [...game.roundStartAliveIds]
      .filter(id => getPlayer(id));

  game.reactionIndex = 0;

  nextReaction();
}

function progressInfections() {

  for(const p of game.players) {

    if(
      !p.alive ||
      !p.infectionRound
    ) {
      continue;
    }

    if(p.role === "infected") {

      const age =
        game.round -
        p.infectionRound +
        1;

      /*
        Infection remains secret during this stage.
      */
      if(age === 2) {

        p.role = "diseased";

        /*
          NOW the player is told.
        */
        game.reactionInfo[p.id] =
          "You became DISEASED. You are on the HOSTILE TEAM.";
      }
    }

    else if(p.role === "diseased") {

      const age =
        game.round -
        p.infectionRound +
        1;

      if(age >= 3) {

        p.role = "parasite";

        p.hasInfected = false;

        game.reactionInfo[p.id] =
          "You became a PARASITE. You are on the HOSTILE TEAM.";
      }
    }
  }
}

function nextReaction() {

  if(
    game.reactionIndex >=
    game.reactionQueue.length
  ) {

    return finishReactions();
  }

  const p =
    getPlayer(
      game.reactionQueue[game.reactionIndex]
    );

  if(!p) {
    game.reactionIndex++;
    return nextReaction();
  }

  /*
    The player may have died during the Ability
    Round, but they STILL get their Reaction screen.
  */
  $("reactionPlayerName").textContent =
    p.name;

  $("reactionText").textContent =
    game.reactionInfo[p.id] ||
    getDefaultReaction(p);

  setScreen("reactionScreen");
}

function getDefaultReaction(p) {

  if(!p.alive) {
    return "You were eliminated this round.";
  }

  if(
    p.silencedUntil &&
    p.silencedUntil >= game.round
  ) {
    return "You are currently silenced.";
  }

  return "Nothing unusual happened to you this round.";
}

function completeReaction() {

  game.reactionIndex++;

  nextReaction();
}

function finishReactions() {

  /*
    The Trickster identity swap remains active through:
    Reaction → Discussion → Voting → full resolution.
  */

  showDiscussion();
}

function showDiscussion() {

  const alivePlayers =
    living();

  $("discussionPlayers").innerHTML =
    alivePlayers
      .map(
        p => `
          <div class="player-card">
            <strong>${esc(displayName(p.id))}</strong>
          </div>
        `
      )
      .join("");

  $("discussionRound").textContent =
    `ROUND ${game.round}`;

  setScreen("discussionScreen");
}

function finishDiscussion() {

  /*
    Discussion ends and voting begins.
  */
  setupVoting();
}

function setupVoting() {

  game.votes = {};

  game.currentVoteIndex = 0;

  const voters =
    living();

  if(!voters.length) {
    return checkVictory();
  }

  nextVote();
}

function nextVote() {

  const voters =
    living();

  if(
    game.currentVoteIndex >=
    voters.length
  ) {

    return resolveVotes();
  }

  const voter =
    voters[game.currentVoteIndex];

  /*
    Silenced players cannot vote.
  */
  const silenced =
    voter.silencedUntil &&
    voter.silencedUntil >= game.round;

  $("votingPlayerName").textContent =
    voter.name;

  $("votingStatus").textContent =
    silenced
      ? "You are silenced and cannot vote."
      : "Choose a living player to vote for.";

  const options =
    living().filter(
      p => p.id !== voter.id
    );

  $("voteOptions").innerHTML =
    options
      .map(
        p =>
          button(
            displayName(p.id),
            p.id,
            "vote-button"
          )
      )
      .join("");

  if(!silenced) {

    $("voteOptions")
      .querySelectorAll("button")
      .forEach(b => {

        b.onclick = () => {

          game.votes[voter.id] =
            b.dataset.value;

          $("voteOptions")
            .querySelectorAll("button")
            .forEach(x =>
              x.classList.remove("selected")
            );

          b.classList.add("selected");

          setTimeout(() => {

            game.currentVoteIndex++;

            nextVote();

          },100);
        };
      });

  } else {

    game.votes[voter.id] =
      null;

    setTimeout(() => {

      game.currentVoteIndex++;

      nextVote();

    },100);
  }

  setScreen("votingScreen");
}

function resolveVotes() {

  const tally = {};

  for(const targetId of Object.values(game.votes)) {

    if(!targetId) continue;

    tally[targetId] =
      (tally[targetId] || 0) + 1;
  }

  const entries =
    Object.entries(tally)
      .sort((a,b) => b[1] - a[1]);

  if(!entries.length) {

    return finishVoteResolution(null);
  }

  const highest =
    entries[0][1];

  const tied =
    entries
      .filter(([,count]) => count === highest)
      .map(([id]) => id);

  if(tied.length > 1) {

    /*
      Captain tie-breaker.
    */
    const captain =
      living().find(
        p => p.role === "captain"
      );

    if(
      captain &&
      game.systems.power &&
      !game.blockedPlayers.has(captain.id)
    ) {

      game.pendingEjection = {
        candidates:tied,
        reason:"captain-tie"
      };

      showCaptainTie(captain,tied);

      return;
    }

    /*
      No usable Captain means nobody is ejected
      on a tie.
    */
    return finishVoteResolution(null);
  }

  const target =
    getPlayer(tied[0]);

  if(!target) {
    return finishVoteResolution(null);
  }

  /*
    IMPORTANT:
    Judge gets a private opportunity to cancel
    ANY ejection — not just Captain tie-breaks.
  */
  game.pendingEjection = {
    targetId:target.id,
    reason:"majority"
  };

  promptJudgeForEjection(
    target,
    () => finishVoteResolution(target.id),
    () => finishVoteResolution(null)
  );
}

function showCaptainTie(captain,candidates) {

  $("captainTiePlayerName").textContent =
    captain.name;

  $("captainTieOptions").innerHTML =
    candidates
      .map(
        id =>
          button(
            displayName(id),
            id,
            "choice-button"
          )
      )
      .join("");

  $("captainTieOptions")
    .querySelectorAll("button")
    .forEach(b => {

      b.onclick = () => {

        const target =
          getPlayer(b.dataset.value);

        if(!target) return;

        game.pendingEjection = {
          targetId:target.id,
          reason:"captain-tie"
        };

        /*
          Captain's decision itself is then subject
          to the Judge's cancellation.
        */
        promptJudgeForEjection(
          target,
          () => finishVoteResolution(target.id),
          () => finishVoteResolution(null)
        );
      };
    });

  setScreen("captainTieScreen");
}

function promptJudgeForEjection(
  target,
  onAllow,
  onCancel
) {

  const judge =
    living().find(
      p => p.role === "judge"
    );

  /*
    Judge requirements:
    - alive
    - role is Judge
    - unused
    - Power online
    - not blocked
  */
  if(
    !judge ||
    game.judgeUsed ||
    !game.systems.power ||
    game.blockedPlayers.has(judge.id)
  ) {

    return onAllow();
  }

  $("judgePlayerName").textContent =
    judge.name;

  $("judgeTargetName").textContent =
    displayName(target.id);

  const yes =
    $("judgeCancelButton");

  const no =
    $("judgeAllowButton");

  if(!yes || !no) {
    return onAllow();
  }

  yes.onclick = () => {

    game.judgeUsed = true;

    game.pendingEjection = null;

    onCancel();
  };

  no.onclick = () => {

    game.pendingEjection = null;

    onAllow();
  };

  setScreen("judgeScreen");
}

function finishVoteResolution(targetId) {

  game.pendingEjection = null;

  if(!targetId) {

    game.voteResolutionDone = true;

    return showVoteResult(
      null,
      "NO PLAYER WAS EJECTED."
    );
  }

  const target =
    getPlayer(targetId);

  if(!target || !target.alive) {

    return showVoteResult(
      null,
      "NO PLAYER WAS EJECTED."
    );
  }

  target.alive = false;

  game.voteResolutionDone = true;

  /*
    Jester only wins when they are actually
    ejected by the normal vote resolution.

    Judge cancellation means no Jester win.
  */
  if(target.role === "jester") {

    return showGameOver(
      "🃏 JESTER WINS!",
      `${target.name} was voted out and the Jester achieved their goal.`
    );
  }

  return showVoteResult(
    target,
    `${target.name} was ejected.`
  );
}

function showVoteResult(target,message) {

  $("voteResultTitle").textContent =
    target
      ? "VOTE RESULT"
      : "NO EJECTION";

  $("voteResultText").textContent =
    message;

  setScreen("voteResultScreen");
}

function continueAfterVote() {

  /*
    Trickster's displayed identity swap ends ONLY
    after the full vote resolution.
  */
  game.displaySwap = null;

  if(checkVictory()) {
    return;
  }

  /*
    Public lifeline happens exactly every 3 rounds.
  */
  if(game.round % 3 === 0) {

    return showLifeline();
  }

  advanceRound();
}

function advanceRound() {

  game.round++;

  /*
    Stage advances only if Engines are online.
  */
  if(game.systems.engines) {

    game.stage++;

    if(game.stage > 10) {
      game.stage = 10;
    }
  }

  /*
    Clear expired silence states.
  */
  for(const p of game.players) {

    if(
      p.silencedUntil &&
      p.silencedUntil < game.round
    ) {
      delete p.silencedUntil;
    }
  }

  /*
    Communications / Power / O2 / Engines stay
    offline until repaired.
  */
  startRound();
}

function checkVictory() {

  if(game.gameOver) {
    return true;
  }

  const alivePlayers =
    living();

  /*
    Alien / hostile team wins if they reach
    parity with Humans while no neutral victory
    has already occurred.
  */
  const hostile =
    alivePlayers.filter(
      p => roleTeam(p.role) === "Hostile"
    );

  const humans =
    alivePlayers.filter(
      p => roleTeam(p.role) === "Human"
    );

  const jester =
    alivePlayers.find(
      p => p.role === "jester"
    );

  /*
    Survivor King independently wins if one of
    the final two living players.
  */
  if(
    alivePlayers.length <= 2
  ) {

    const king =
      alivePlayers.find(
        p => p.role === "king"
      );

    if(king) {

      return showGameOver(
        "👑 SURVIVOR KING WINS!",
        `${king.name} reached the final two living players.`
      );
    }
  }

  /*
    Hostiles win at parity.
  */
  if(
    hostile.length > 0 &&
    hostile.length >= humans.length
  ) {

    return showGameOver(
      "👽 HOSTILE TEAM WINS!",
      "The Hostile Team has taken control of the ship."
    );
  }

  /*
    No Hostiles remain.
  */
  if(hostile.length === 0) {

    /*
      Jester only wins if ejected, so being alive
      does not trigger a Jester win here.
    */
    return showGameOver(
      "👨‍🚀 HUMAN TEAM WINS!",
      "All Hostiles have been eliminated."
    );
  }

  return false;
}

function showGameOver(title,text) {

  game.gameOver = true;

  $("gameOverTitle").textContent =
    title;

  $("gameOverText").textContent =
    text;

  /*
    Show final role reveal.
  */
  const reveal =
    $("finalRoles");

  if(reveal) {

    reveal.innerHTML =
      game.players
        .map(
          p => `
            <div class="final-role">
              <strong>
                ${esc(p.name)}
              </strong>

              —
              ${ROLE_DATA[p.role]?.icon || "❓"}
              ${ROLE_DATA[p.role]?.name || p.role}

              ${
                p.alive
                  ? " • ALIVE"
                  : " • ELIMINATED"
              }
            </div>
          `
        )
        .join("");
  }

  setScreen("gameOverScreen");

  return true;
}

function showLifeline() {

  game.lifelineNumber++;

  /*
    Communications must be ONLINE for the lifeline.
    If Communications is offline, the lifeline is
    permanently lost for this cycle.
  */
  if(!game.systems.communications) {

    $("lifelineText").textContent =
      "📡 COMMUNICATIONS OFFLINE — EARTH COULD NOT BE REACHED.";

    $("lifelineClue").textContent =
      "The lifeline has been permanently lost.";

    setScreen("lifelineScreen");

    return;
  }

  const hostiles =
    living().filter(
      p => roleTeam(p.role) === "Hostile"
    );

  if(!hostiles.length) {

    $("lifelineText").textContent =
      "🌍 EARTH CONTACT ESTABLISHED.";

    $("lifelineClue").textContent =
      "There are no Hostiles remaining.";

    setScreen("lifelineScreen");

    return;
  }

  /*
    The public clue contains exactly three players
    where possible, with exactly ONE actually hostile.
  */
  const candidates = [];

  const realHostile =
    rand(hostiles);

  candidates.push(realHostile);

  const nonHostiles =
    living().filter(
      p =>
        p.id !== realHostile.id &&
        roleTeam(p.role) !== "Hostile"
    );

  candidates.push(
    ...shuffle(nonHostiles)
      .slice(
        0,
        Math.min(2,nonHostiles.length)
      )
  );

  const finalCandidates =
    shuffle(candidates);

  $("lifelineText").textContent =
    "⚠️ ONE OF THESE PLAYERS IS HOSTILE:";

  $("lifelineClue").textContent =
    finalCandidates
      .map(p => p.name)
      .join(", ");

  setScreen("lifelineScreen");
}

function finishLifeline() {

  /*
    If the Engines are offline, the ship does not
    progress to the next stage.
  */
  advanceRound();
}

function randomRadioMessage() {

  const aliveHostiles =
    living().filter(
      p => roleTeam(p.role) === "Hostile"
    );

  const messages = [];

  messages.push(
    `EARTH: There are exactly ${aliveHostiles.length} hostiles remaining.`
  );

  const systems =
    Object.keys(game.systems);

  const offline =
    systems.filter(
      s => !game.systems[s]
    );

  if(offline.length) {

    const system =
      rand(offline);

    const actors =
      living().filter(
        p =>
          game.actions[p.id]?.type === "sabotage" &&
          game.actions[p.id]?.system === system
      );

    if(actors.length) {

      const names =
        shuffle(
          living()
            .filter(
              p =>
                roleTeam(p.role) === "Hostile"
            )
        )
        .slice(
          0,
          Math.min(3,aliveHostiles.length)
        )
        .map(p => p.name);

      if(names.length) {

        messages.push(
          `EARTH: ${names.join(", ")} — one of them made ${system.toUpperCase()} OFFLINE.`
        );
      }
    }
  }

  if(aliveHostiles.length) {

    const oneHostile =
      rand(aliveHostiles);

    const others =
      shuffle(
        living().filter(
          p =>
            p.id !== oneHostile.id &&
            roleTeam(p.role) !== "Hostile"
        )
      )
      .slice(0,2);

    messages.push(
      `EARTH: ${shuffle([
        oneHostile,
        ...others
      ])
      .map(p => p.name)
      .join(", ")} — one of them is hostile.`
    );
  }

  return rand(messages);
}

/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function showSystems() {

  const container =
    $("systemsList");

  if(!container) {
    return;
  }

  const labels = {
    engines:"🚀 ENGINES",
    o2:"🫁 O2",
    communications:"📡 COMMUNICATIONS",
    power:"⚡ POWER"
  };

  container.innerHTML =
    Object.entries(game.systems)
      .map(
        ([key,online]) => `
          <div class="system-card">
            <strong>
              ${labels[key] || key.toUpperCase()}
            </strong>

            <span class="${online ? "online" : "offline"}">
              ${online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        `
      )
      .join("");

  const stage =
    $("systemsStage");

  if(stage) {
    stage.textContent =
      `STAGE ${game.stage} / 10`;
  }

  setScreen("systemsScreen");
}

function continueFromSystems() {

  if(game.gameOver) {
    return;
  }

  startRound();
}

/* =========================================================
   RANDOM BUTTON — MOBILE FIX
   ========================================================= */

function bindRandomButton() {

  const original =
    $("randomRolesButton");

  if(!original) {
    return;
  }

  /*
    Remove old event listeners by cloning the button.
    This prevents duplicate/stale handlers.
  */
  const clone =
    original.cloneNode(true);

  original.replaceWith(clone);

  const activate = ev => {

    if(ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    randomiseRoles();
  };

  /*
    pointerup works much more reliably on phones
    than relying only on click.
  */
  clone.addEventListener(
    "pointerup",
    activate,
    {
      passive:false
    }
  );

  clone.addEventListener(
    "click",
    activate
  );
}

/* =========================================================
   SETUP EVENTS
   ========================================================= */

function bindSetup() {

  const count =
    $("playerCount");

  if(count) {

    count.onchange = () => {

      let n =
        Number(count.value);

      if(
        !Number.isFinite(n) ||
        n < 4 ||
        n > 12
      ) {
        n = 4;
        count.value = "4";
      }

      resetSetupPlayers();
    };
  }

  const start =
    $("startGameButton");

  if(start) {

    start.onclick = ev => {

      ev.preventDefault();

      /*
        Save all current names before starting.
      */
      document
        .querySelectorAll(".player-name-input")
        .forEach(input => {

          const i =
            Number(input.dataset.nameIndex);

          if(game.players[i]) {

            game.players[i].name =
              input.value.trim() ||
              `Player ${i+1}`;
          }
        });

      startGame();
    };
  }

  const pass =
    $("readyButton");

  if(pass) {

    pass.onclick = ev => {

      ev.preventDefault();

      /*
        Local mode:
        Role → Action.
      */
      showRole();
    };
  }

  const roleContinue =
    $("roleContinueButton");

  if(roleContinue) {

    roleContinue.onclick = ev => {

      ev.preventDefault();

      showAction();
    };
  }

  const reactionContinue =
    $("reactionContinueButton");

  if(reactionContinue) {

    reactionContinue.onclick = ev => {

      ev.preventDefault();

      completeReaction();
    };
  }

  const discussionContinue =
    $("discussionContinueButton");

  if(discussionContinue) {

    discussionContinue.onclick = ev => {

      ev.preventDefault();

      finishDiscussion();
    };
  }

  const voteResultContinue =
    $("voteResultContinueButton");

  if(voteResultContinue) {

    voteResultContinue.onclick = ev => {

      ev.preventDefault();

      continueAfterVote();
    };
  }

  const lifelineContinue =
    $("lifelineContinueButton");

  if(lifelineContinue) {

    lifelineContinue.onclick = ev => {

      ev.preventDefault();

      finishLifeline();
    };
  }

  const systemsContinue =
    $("systemsContinueButton");

  if(systemsContinue) {

    systemsContinue.onclick = ev => {

      ev.preventDefault();

      continueFromSystems();
    };
  }

  const restart =
    $("restartButton");

  if(restart) {

    restart.onclick = ev => {

      ev.preventDefault();

      resetSetupPlayers();

      showSetup();
    };
  }

  bindRandomButton();
}

/* =========================================================
   ROLE GUIDE
   ========================================================= */

function openRoleGuide() {

  const modal =
    $("roleGuideModal");

  if(!modal) {
    return;
  }

  const content =
    $("roleGuideContent");

  if(content) {

    content.innerHTML =
      [
        ...HOSTILES,
        ...HUMANS,
        ...NEUTRALS,
        ...CONCEPTS,
        "infected",
        "diseased"
      ]
      .map(
        role => {

          const data =
            ROLE_DATA[role];

          return `
            <div class="guide-role">

              <div class="guide-role-title">
                ${data.icon}
                ${data.name}
              </div>

              <div class="guide-role-team">
                ${data.team}
              </div>

              <div class="guide-role-desc">
                ${esc(data.desc)}
              </div>

            </div>
          `;
        }
      )
      .join("");
  }

  modal.classList.add("active");
}

function closeRoleGuide() {

  $("roleGuideModal")
    ?.classList.remove("active");
}

/* =========================================================
   CUSTOM ROLES
   ========================================================= */

function openCustomRoles() {

  const modal =
    $("customRolesModal");

  if(!modal) {
    return;
  }

  renderCustomRoles();

  modal.classList.add("active");
}

function closeCustomRoles() {

  $("customRolesModal")
    ?.classList.remove("active");
}

function renderCustomRoles() {

  const container =
    $("customRolesContent");

  if(!container) {
    return;
  }

  const categories = [
    {
      title:"HOSTILE",
      roles:HOSTILES
    },
    {
      title:"HUMAN",
      roles:HUMANS.filter(
        r => r !== "engineer"
      )
    },
    {
      title:"NEUTRAL",
      roles:NEUTRALS
    },
    {
      title:"CONCEPT",
      roles:CONCEPTS
    }
  ];

  container.innerHTML =
    categories
      .map(
        category => `

          <div class="custom-category">

            <h3>
              ${category.title}
            </h3>

            ${category.roles
              .map(
                role => `

                  <label class="custom-role">

                    <input
                      type="checkbox"
                      data-role="${role}"
                      ${settings.enabled[role] ? "checked" : ""}>

                    <span>
                      ${ROLE_DATA[role].icon}
                      ${ROLE_DATA[role].name}
                    </span>

                  </label>

                `
              )
              .join("")}

          </div>

        `
      )
      .join("");

  container
    .querySelectorAll("input[data-role]")
    .forEach(input => {

      input.onchange = () => {

        const role =
          input.dataset.role;

        settings.enabled[role] =
          input.checked;

        /*
          Trickster is OFF by default but can
          manually be enabled.
        */
        if(role === "trickster") {
          settings.enabled.trickster =
            input.checked;
        }
      };
    });
}

function saveCustomRoles() {

  renderCustomRoles();

  closeCustomRoles();

  renderSetup();
}

/* =========================================================
   MODAL BACKDROP HANDLING
   ========================================================= */

function bindModals() {

  const roleGuideOpen =
    $("roleGuideButton");

  if(roleGuideOpen) {

    roleGuideOpen.onclick =
      openRoleGuide;
  }

  const roleGuideClose =
    $("closeRoleGuideButton");

  if(roleGuideClose) {

    roleGuideClose.onclick =
      closeRoleGuide;
  }

  const customOpen =
    $("customRolesButton");

  if(customOpen) {

    customOpen.onclick =
      openCustomRoles;
  }

  const customClose =
    $("closeCustomRolesButton");

  if(customClose) {

    customClose.onclick =
      closeCustomRoles;
  }

  const customSave =
    $("saveCustomRolesButton");

  if(customSave) {

    customSave.onclick =
      saveCustomRoles;
  }

  document
    .querySelectorAll(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        ev => {

          if(ev.target === modal) {
            modal.classList.remove("active");
          }
        }
      );
    });
}

/* =========================================================
   INITIAL GAME SETUP
   ========================================================= */

function initialisePlayers() {

  const count =
    Number($("playerCount")?.value || 4);

  game.players =
    Array.from(
      {length:count},
      (_,i) => ({
        id:`p${i+1}`,
        name:`Player ${i+1}`,
        role:"survivor",
        originalRole:"survivor",
        alive:true,
        infectionRound:null,
        hasInfected:false,
        silencedUntil:null,
        clientId:null
      })
    );
}

function initGameUI() {

  initialisePlayers();

  bindSetup();

  bindModals();

  showSetup();

  /*
    Online mode is bound separately as well.
    This makes initialization order safe.
  */
  if(typeof bindOnline === "function") {
    bindOnline();
  }
}

/* =========================================================
   SAFE INITIALISATION
   ========================================================= */

if(document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initGameUI,
    {once:true}
  );

} else {

  initGameUI();
}

/* =========================================================
   LOCAL BUTTON FALLBACKS
   ========================================================= */

window.showRole =
  showRole;

window.showAction =
  showAction;

window.completeAbility =
  completeAbility;

window.completeReaction =
  completeReaction;

window.finishDiscussion =
  finishDiscussion;

window.finishVoteResolution =
  finishVoteResolution;

window.continueAfterVote =
  continueAfterVote;

window.showLifeline =
  showLifeline;

window.finishLifeline =
  finishLifeline;

window.openRoleGuide =
  openRoleGuide;

window.closeRoleGuide =
  closeRoleGuide;

window.openCustomRoles =
  openCustomRoles;

window.closeCustomRoles =
  closeCustomRoles;

/* =========================================================
   ALIEN — RELIABLE ONLINE MODE
   Supabase Realtime Broadcast
   ========================================================= */
(function(){
  "use strict";

  const SUPABASE_URL="https://sovwkrauwyoskxrnajjn.supabase.co";
  const SUPABASE_KEY="sb_publishable_ck6DlHqxEFmoCex44rXbKw_HlAtPkaW";

  const ONLINE={
    mode:false,
    host:false,
    started:false,
    roomCode:"",
    channel:null,
    connected:false,
    clientId:"client_"+Math.random().toString(36).slice(2,10),
    myPlayerId:null,
    myRole:null,
    pendingRemote:null,
    lobby:[],
    hostClientId:null,
    reconnectTimer:null
  };

  window.ONLINE=ONLINE;

  let sb=null;

  if(
    window.supabase &&
    typeof window.supabase.createClient==="function"
  ){
    try{
      sb=window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }catch(err){
      console.error(
        "ALIEN Supabase init error",
        err
      );
    }
  }

  function onlineCss(){

    if($("alienOnlineStyles")) return;

    const st=document.createElement("style");

    st.id="alienOnlineStyles";

    st.textContent=`
      body.online-active #passScreen{
        display:none!important
      }

      body.online-active #readyButton{
        display:none!important
      }

      #onlineScreen .panel,
      #onlineRemoteScreen .panel{
        max-width:700px;
        margin:auto
      }

      .online-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px
      }

      .online-status{
        margin:12px 0;
        padding:12px;
        border-radius:12px;
        background:rgba(255,255,255,.06);
        text-align:center
      }

      .online-code{
        font-size:clamp(32px,10vw,58px);
        font-weight:900;
        letter-spacing:8px;
        text-align:center;
        margin:18px 0
      }

      .online-list{
        display:grid;
        gap:8px;
        margin:15px 0
      }

      .online-player{
        padding:12px 14px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
        display:flex;
        justify-content:space-between;
        gap:10px
      }

      .online-you{
        font-weight:800
      }

      .online-error{
        color:#ff7676;
        min-height:24px;
        text-align:center
      }

      .online-small{
        font-size:.9rem;
        opacity:.75;
        text-align:center
      }

      .online-wait{
        font-size:1.1rem;
        text-align:center;
        padding:24px 8px
      }

      .online-copy{
        width:100%;
        margin-bottom:10px
      }

      @media(max-width:600px){
        .online-grid{
          grid-template-columns:1fr
        }

        .online-code{
          letter-spacing:5px
        }
      }
    `;

    document.head.appendChild(st);
  }

  function makeOnlineUI(){

    onlineCss();

    if($("onlineScreen")) return;

    const setup=$("setupScreen");

    if(!setup) return;

    setup.insertAdjacentHTML(
      "beforebegin",
      `
      <section id="onlineScreen" class="screen">
        <div class="panel">

          <div class="eyebrow">
            🌐 ONLINE MODE
          </div>

          <h1>PLAY ONLINE</h1>

          <p class="muted">
            Play on separate phones using the same room.
          </p>

          <div class="online-grid">

            <button
              id="createRoomButton"
              type="button"
              class="primary">
              CREATE ROOM
            </button>

            <button
              id="joinRoomButton"
              type="button">
              JOIN ROOM
            </button>

          </div>

          <div
            id="onlineJoinBox"
            style="display:none;margin-top:15px">

            <input
              id="onlineRoomInput"
              class="player-name-input"
              maxlength="6"
              placeholder="ROOM CODE"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false">

            <input
              id="onlineNameInput"
              class="player-name-input"
              maxlength="20"
              placeholder="YOUR NAME"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false">

            <button
              id="connectRoomButton"
              type="button"
              class="primary full">
              JOIN ROOM
            </button>

          </div>

          <div
            id="onlineLobby"
            style="display:none;margin-top:18px">

            <div class="eyebrow">
              ROOM CODE
            </div>

            <div
              id="onlineRoomCode"
              class="online-code">
            </div>

            <div
              id="onlineHostStatus"
              class="online-status">
            </div>

            <div
              id="onlineLobbyList"
              class="online-list">
            </div>

            <button
              id="onlineHostSetupButton"
              type="button"
              class="primary full"
              style="display:none">
              HOST GAME SETUP
            </button>

            <button
              id="onlineBackButton"
              type="button"
              class="secondary full">
              LEAVE ROOM
            </button>

          </div>

          <div
            id="onlineError"
            class="online-error">
          </div>

          <p class="online-small">
            The host controls the game.
            Each player receives only their own private role.
          </p>

        </div>
      </section>

      <section
        id="onlineRemoteScreen"
        class="screen">

        <div class="panel">

          <div class="eyebrow">
            🌐 ONLINE GAME
          </div>

          <div id="onlineRemoteContent"></div>

        </div>

      </section>
      `
    );
  }

  function status(text){

    const el=$("onlineError");

    if(el){
      el.textContent=text||"";
    }
  }

  function send(payload){

    if(
      !ONLINE.channel ||
      !ONLINE.connected
    ){
      return;
    }

    ONLINE.channel
      .send({
        type:"broadcast",
        event:"alien",
        payload:{
          ...payload,
          sender:ONLINE.clientId
        }
      })
      .catch(
        err =>
          console.error(
            "ALIEN broadcast error",
            err
          )
      );
  }

  function generateRoomCode(){

    const chars=
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code="";

    for(let i=0;i<6;i++){

      code +=
        chars[
          Math.floor(
            Math.random()*chars.length
          )
        ];
    }

    return code;
  }

  function normaliseName(name,fallback){

    const value=
      String(name||"")
        .trim()
        .slice(0,20);

    return value ||
      fallback ||
      "Player";
  }

  function renderLobby(){

    const list=
      $("onlineLobbyList");

    if(!list) return;

    list.innerHTML=
      ONLINE.lobby
        .map(
          (p,i)=>`
            <div class="online-player">

              <span
                class="${p.clientId===ONLINE.clientId
                  ?"online-you"
                  :""
                }">

                ${esc(
                  p.name ||
                  `Player ${i+1}`
                )}

              </span>

              <span>
                ${
                  p.host
                    ? "👑 HOST"
                    : "READY"
                }
              </span>

            </div>
          `
        )
        .join("");

    const hostStatus=
      $("onlineHostStatus");

    if(hostStatus){

      hostStatus.textContent=
        ONLINE.host
          ? "You are the host."
          : "Waiting for the host to start.";
    }

    const hostButton=
      $("onlineHostSetupButton");

    if(hostButton){

      hostButton.style.display=
        ONLINE.host
          ? "block"
          : "none";
    }

    const code=
      $("onlineRoomCode");

    if(code){
      code.textContent=
        ONLINE.roomCode;
    }
  }

  function showOnlineScreen(){

    makeOnlineUI();

    document.body.classList.add(
      "online-active"
    );

    document
      .querySelectorAll(".screen")
      .forEach(s =>
        s.classList.remove("active")
      );

    $("onlineScreen")
      ?.classList.add("active");
  }

  function showOnlineRemote(content){

    makeOnlineUI();

    document.body.classList.add(
      "online-active"
    );

    const target=
      $("onlineRemoteContent");

    if(target){
      target.innerHTML=content;
    }

    document
      .querySelectorAll(".screen")
      .forEach(s =>
        s.classList.remove("active")
      );

    $("onlineRemoteScreen")
      ?.classList.add("active");
  }

  function hideOnlineMode(){

    document.body.classList.remove(
      "online-active"
    );

    $("onlineScreen")
      ?.classList.remove("active");

    $("onlineRemoteScreen")
      ?.classList.remove("active");
  }

  function leaveRoom(){

    if(ONLINE.channel){

      try{
        ONLINE.channel.unsubscribe();
      }catch(err){
        console.warn(err);
      }
    }

    ONLINE.mode=false;
    ONLINE.host=false;
    ONLINE.started=false;
    ONLINE.roomCode="";
    ONLINE.channel=null;
    ONLINE.connected=false;
    ONLINE.myPlayerId=null;
    ONLINE.myRole=null;
    ONLINE.pendingRemote=null;
    ONLINE.lobby=[];
    ONLINE.hostClientId=null;

    hideOnlineMode();

    status("");

    showSetup();
  }

  async function connectChannel(code){

    if(!sb){

      status(
        "Supabase could not be loaded. Check index.html."
      );

      return false;
    }

    if(ONLINE.channel){

      try{
        await ONLINE.channel.unsubscribe();
      }catch(err){}
    }

    ONLINE.roomCode=
      String(code||"")
        .trim()
        .toUpperCase();

    ONLINE.channel=
      sb.channel(
        `alien-room-${ONLINE.roomCode}`,
        {
          config:{
            broadcast:{
              self:false
            }
          }
        }
      );

    ONLINE.channel.on(
      "broadcast",
      {
        event:"alien"
      },
      ({payload}) => {

        if(!payload) return;

        if(
          payload.sender ===
          ONLINE.clientId
        ){
          return;
        }

        handleOnlineMessage(
          payload
        );
      }
    );

    return new Promise(resolve => {

      let finished=false;

      const finish=
        ok => {

          if(finished) return;

          finished=true;

          ONLINE.connected=ok;

          resolve(ok);
        };

      ONLINE.channel.subscribe(
        state => {

          if(state==="SUBSCRIBED"){

            finish(true);

          }else if(
            state==="CHANNEL_ERROR" ||
            state==="TIMED_OUT"
          ){

            finish(false);

          }
        }
      );

      setTimeout(
        () => finish(
          ONLINE.connected
        ),
        8000
      );
    });
  }

  async function createRoom(){

    if(!sb){

      status(
        "Supabase is unavailable. Make sure the Supabase script is above game.js."
      );

      return;
    }

    ONLINE.mode=true;
    ONLINE.host=true;
    ONLINE.started=false;

    ONLINE.roomCode=
      generateRoomCode();

    const ok=
      await connectChannel(
        ONLINE.roomCode
      );

    if(!ok){

      status(
        "Could not connect to the online server."
      );

      return;
    }

    const name=
      normaliseName(
        $("onlineNameInput")?.value,
        "Player 1"
      );

    ONLINE.myPlayerId="p1";
    ONLINE.hostClientId=
      ONLINE.clientId;

    ONLINE.lobby=[
      {
        id:"p1",
        name,
        clientId:ONLINE.clientId,
        host:true
      }
    ];

    showOnlineScreen();

    $("onlineJoinBox")
      ?.style.setProperty(
        "display",
        "none"
      );

    $("onlineLobby")
      ?.style.setProperty(
        "display",
        "block"
      );

    renderLobby();

    send({
      type:"host_announce",
      hostClientId:ONLINE.clientId,
      lobby:ONLINE.lobby
    });
  }

  async function joinRoom(){

    makeOnlineUI();

    $("onlineJoinBox")
      ?.style.setProperty(
        "display",
        "block"
      );

    status("");
  }

  async function connectToRoom(){

    const code=
      String(
        $("onlineRoomInput")?.value||""
      )
      .trim()
      .toUpperCase();

    const name=
      normaliseName(
        $("onlineNameInput")?.value,
        "Player"
      );

    if(code.length!==6){

      status(
        "Enter the 6-character room code."
      );

      return;
    }

    ONLINE.mode=true;
    ONLINE.host=false;
    ONLINE.started=false;

    const ok=
      await connectChannel(code);

    if(!ok){

      status(
        "Could not join that room."
      );

      ONLINE.mode=false;

      return;
    }

    showOnlineScreen();

    $("onlineJoinBox")
      ?.style.setProperty(
        "display",
        "none"
      );

    $("onlineLobby")
      ?.style.setProperty(
        "display",
        "block"
      );

    $("onlineHostStatus").textContent=
      "Connecting to host...";

    send({
      type:"hello",
      name,
      clientId:ONLINE.clientId
    });

    setTimeout(
      () => {

        if(
          ONLINE.lobby.length===0 &&
          ONLINE.connected
        ){

          status(
            "No host responded. Check the room code."
          );
        }

      },
      5000
    );
  }

  function hostAddPlayer(payload){

    if(!ONLINE.host){
      return;
    }

    if(
      ONLINE.lobby.some(
        p =>
          p.clientId===
          payload.clientId
      )
    ){
      return;
    }

    if(
      ONLINE.lobby.length>=12
    ){

      send({
        type:"room_full",
        target:payload.clientId
      });

      return;
    }

    const id=
      `p${ONLINE.lobby.length+1}`;

    ONLINE.lobby.push({
      id,
      name:normaliseName(
        payload.name,
        `Player ${ONLINE.lobby.length+1}`
      ),
      clientId:payload.clientId,
      host:false
    });

    send({
      type:"player_assigned",
      target:payload.clientId,
      playerId:id,
      hostClientId:ONLINE.clientId,
      lobby:ONLINE.lobby
    });

    broadcastLobby();
  }

  function broadcastLobby(){

    send({
      type:"lobby_update",
      lobby:ONLINE.lobby,
      hostClientId:ONLINE.clientId
    });
  }

  function handleOnlineMessage(payload){

    switch(payload.type){

      case "host_announce":

        ONLINE.hostClientId=
          payload.hostClientId;

        if(
          Array.isArray(payload.lobby)
        ){

          ONLINE.lobby=
            payload.lobby;
        }

        renderLobby();

        break;

      case "hello":

        hostAddPlayer(payload);

        break;

      case "player_assigned":

        if(
          payload.target &&
          payload.target !==
          ONLINE.clientId
        ){
          break;
        }

        ONLINE.myPlayerId=
          payload.playerId;

        ONLINE.hostClientId=
          payload.hostClientId;

        ONLINE.lobby=
          Array.isArray(payload.lobby)
            ? payload.lobby
            : [];

        renderLobby();

        break;

      case "lobby_update":

        if(
          Array.isArray(payload.lobby)
        ){

          ONLINE.lobby=
            payload.lobby;
        }

        ONLINE.hostClientId=
          payload.hostClientId ||
          ONLINE.hostClientId;

        renderLobby();

        break;

      case "room_full":

        status(
          "That room is full."
        );

        break;

      case "game_start":

        receiveGameStart(
          payload
        );

        break;

      case "private_role":

        if(
          payload.target ===
          ONLINE.clientId
        ){

          receivePrivateRole(
            payload
          );
        }

        break;

      case "ability":

        if(
          payload.target ===
          ONLINE.clientId
        ){

          receiveRemoteAbility(
            payload
          );
        }

        break;

      case "public":

        receivePublic(
          payload
        );

        break;

      case "vote_prompt":

        if(
          payload.target ===
          ONLINE.clientId
        ){

          receiveRemoteVotePrompt(
            payload
          );
        }

        break;

      case "judge_prompt":

        if(
          payload.target ===
          ONLINE.clientId
        ){

          receiveRemoteJudgePrompt(
            payload
          );
        }

        break;

      case "game_over":

        if(
          payload.target ===
          ONLINE.clientId ||
          !payload.target
        ){

          receiveOnlineGameOver(
            payload
          );
        }

        break;

      case "return_setup":

        if(
          payload.target ===
          ONLINE.clientId
        ){

          ONLINE.started=false;

          showOnlineScreen();
        }

        break;
    }
  }

  function hostStartGame(){

    if(!ONLINE.host){
      return;
    }

    if(
      ONLINE.lobby.length<4
    ){

      status(
        "You need at least 4 players."
      );

      return;
    }

    if(
      ONLINE.lobby.length>12
    ){

      status(
        "Maximum 12 players."
      );

      return;
    }

    ONLINE.started=true;

    game.players=
      ONLINE.lobby.map(
        (p,i)=>({
          id:p.id || `p${i+1}`,
          name:normaliseName(
            p.name,
            `Player ${i+1}`
          ),
          role:"survivor",
          originalRole:"survivor",
          alive:true,
          infectionRound:null,
          hasInfected:false,
          silencedUntil:null,
          clientId:p.clientId
        })
      );

    resetTransient();

    randomiseRoles();

    send({
      type:"game_start",
      players:
        game.players.map(
          p => ({
            id:p.id,
            name:p.name,
            alive:true
          })
        )
    });

    sendRoles();

    showSetup();

    startGame();
  }

  function receiveGameStart(payload){

    ONLINE.started=true;

    ONLINE.lobby=
      (payload.players||[])
        .map(
          p => ({
            ...p,
            clientId:
              p.clientId || null
          })
        );

    game.players=
      (payload.players||[])
        .map(
          p => ({
            id:p.id,
            name:p.name,
            role:"survivor",
            originalRole:"survivor",
            alive:true,
            infectionRound:null,
            hasInfected:false,
            silencedUntil:null,
            clientId:p.clientId||null
          })
        );

    showOnlineRemote(`
      <div class="online-wait">
        <h2>🎮 GAME STARTING</h2>
        <p>Waiting for your private role...</p>
      </div>
    `);
  }

  function sendToPlayer(
    player,
    payload
  ){

    if(!player) return;

    send({
      ...payload,
      target:player.clientId
    });
  }

  function sendRoles(){

    if(!ONLINE.host){
      return;
    }

    game.players.forEach(
      p => {

        if(!p.clientId){
          return;
        }

        const hostileAllies=
          game.players
            .filter(
              other =>
                other.id!==p.id &&
                roleTeam(other.role)==="Hostile"
            )
            .map(
              other => ({
                id:other.id,
                name:other.name,
                role:other.role
              })
            );

        sendToPlayer(
          p,
          {
            type:"private_role",
            role:p.role,
            allies:
              roleTeam(p.role)==="Hostile"
                ? hostileAllies
                : []
          }
        );
      }
    );
  }

   function receiveRemoteAction(msg){
    if(!ONLINE.host || !msg.playerId) return;

    game.actions=game.actions||{};
    game.actions[msg.playerId]=msg.action;

    if(ONLINE.pendingRemote){
      ONLINE.pendingRemote.delete(msg.playerId);
    }

    checkRemoteAbilitiesComplete();
  }

  function receiveRemoteVote(msg){
    if(!ONLINE.host || !msg.playerId) return;

    game.votes=game.votes||{};
    game.votes[msg.playerId]=msg.vote;

    if(ONLINE.pendingVotes){
      ONLINE.pendingVotes.delete(msg.playerId);
    }

    checkRemoteVotesComplete();
  }

  function receiveJudgeResponse(msg){
    if(!ONLINE.host || !msg.playerId) return;

    if(typeof ONLINE.judgeResolver==="function"){
      const fn=ONLINE.judgeResolver;
      ONLINE.judgeResolver=null;
      fn(!!msg.cancel);
    }
  }

  function checkRemoteAbilitiesComplete(){
    if(!ONLINE.host) return;

    if(
      ONLINE.pendingRemote &&
      ONLINE.pendingRemote.size===0
    ){
      ONLINE.pendingRemote=null;

      resolveAbilities();
    }
  }

  function checkRemoteVotesComplete(){
    if(!ONLINE.host) return;

    if(
      ONLINE.pendingVotes &&
      ONLINE.pendingVotes.size===0
    ){
      ONLINE.pendingVotes=null;

      resolveVotes();
    }
  }

  function sendAbilityToPlayer(player){

    if(!player || !player.clientId){
      return;
    }

    const role=player.role;
    const options=[];

    if(role==="alien"){

      living()
        .filter(
          p =>
            p.id!==player.id &&
            !isHostile(p)
        )
        .forEach(
          p =>
            options.push({
              label:`👽 Kill ${p.name}`,
              value:JSON.stringify({
                type:"kill",
                target:p.id
              })
            })
        );

      if(
        !game.systems.engines
      ){
        options.length=0;
      }
    }

    else if(role==="saboteur"){

      Object.entries(game.systems)
        .filter(
          ([key,value]) =>
            value &&
            key!=="engines"
        )
        .forEach(
          ([key]) =>
            options.push({
              label:`🔻 Sabotage ${key.toUpperCase()}`,
              value:JSON.stringify({
                type:"sabotage",
                system:key
              })
            })
        );
    }

    else if(role==="silencer"){

      living()
        .filter(
          p =>
            p.id!==player.id
        )
        .forEach(
          p =>
            options.push({
              label:`🔇 Silence ${p.name}`,
              value:JSON.stringify({
                type:"silence",
                target:p.id
              })
            })
        );
    }

    else if(role==="parasite"){

      if(!player.hasInfected){

        living()
          .filter(
            p =>
              p.id!==player.id &&
              roleTeam(p.role)!=="Hostile"
          )
          .forEach(
            p =>
              options.push({
                label:`🦠 Infect ${p.name}`,
                value:JSON.stringify({
                  type:"infect",
                  target:p.id
                })
              })
          );
      }
    }

    else if(role==="engineer"){

      Object.entries(game.systems)
        .filter(
          ([,online]) =>
            !online
        )
        .forEach(
          ([key]) =>
            options.push({
              label:`🔧 Repair ${key.toUpperCase()}`,
              value:JSON.stringify({
                type:"repair",
                system:key
              })
            })
        );
    }

    else if(role==="scientist"){

      living()
        .filter(
          p =>
            p.id!==player.id
        )
        .forEach(
          p =>
            options.push({
              label:`🧪 Scan ${p.name}`,
              value:JSON.stringify({
                type:"scientist",
                target:p.id
              })
            })
        );
    }

    else if(role==="detective"){

      living()
        .filter(
          p =>
            p.id!==player.id
        )
        .forEach(
          p =>
            options.push({
              label:`🕵️ Investigate ${p.name}`,
              value:JSON.stringify({
                type:"detective",
                target:p.id
              })
            })
        );
    }

    else if(role==="medic"){

      living().forEach(
        p =>
          options.push({
            label:`🩺 Protect ${p.name}`,
            value:JSON.stringify({
              type:"protect",
              target:p.id
            })
          })
      );
    }

    else if(role==="captain"){

      options.push({
        label:"👨‍✈️ Do nothing",
        value:JSON.stringify({
          type:"none"
        })
      });
    }

    else if(role==="guard"){

      living()
        .filter(
          p =>
            p.id!==player.id
        )
        .forEach(
          p =>
            options.push({
              label:`🛡️ Block ${p.name}`,
              value:JSON.stringify({
                type:"guard",
                target:p.id
              })
            })
        );
    }

    else if(role==="radio"){

      if(game.systems.communications){

        options.push({
          label:"📻 RECEIVE EARTH MESSAGE",
          value:JSON.stringify({
            type:"radio"
          })
        });
      }

      options.push({
        label:"Don't receive message",
        value:JSON.stringify({
          type:"none"
        })
      });
    }

    else if(role==="judge"){

      options.push({
        label:"⚖️ Save Judge ability for later",
        value:JSON.stringify({
          type:"none"
        })
      });
    }

    else if(role==="trickster"){

      if(!player.usedTrickster){

        const others=
          living().filter(
            p =>
              p.id!==player.id
          );

        others.forEach(
          a =>
            others
              .filter(
                b =>
                  b.id!==a.id
              )
              .forEach(
                b =>
                  options.push({
                    label:
                      `🎭 Swap ${a.name} ↔ ${b.name}`,
                    value:
                      JSON.stringify({
                        type:"swap",
                        a:a.id,
                        b:b.id
                      })
                  })
              )
        );
      }

      options.push({
        label:"Do nothing",
        value:JSON.stringify({
          type:"none"
        })
      });
    }

    else{

      options.push({
        label:"Continue",
        value:JSON.stringify({
          type:"none"
        })
      });
    }

    sendPrivate(
      player.clientId,
      {
        kind:"ability",
        round:game.round,
        title:
          ROLE_DATA[role]?.name ||
          "ABILITY",
        description:
          ROLE_DATA[role]?.desc ||
          "Choose your action.",
        options
      }
    );
  }

  function sendReactionToPlayer(
    player,
    message
  ){

    if(
      !player ||
      !player.clientId
    ){
      return;
    }

    sendPrivate(
      player.clientId,
      {
        kind:"reaction",
        round:game.round,
        message
      }
    );
  }

  function sendVotePrompt(
    player
  ){

    if(
      !player ||
      !player.clientId
    ){
      return;
    }

    const options=
      living()
        .filter(
          p =>
            p.id!==player.id &&
            !(p.silencedUntil &&
              p.silencedUntil>=game.round)
        )
        .map(
          p => ({
            label:`🗳️ ${p.name}`,
            value:p.id
          })
        );

    options.push({
      label:"Skip / Abstain",
      value:"skip"
    });

    sendPrivate(
      player.clientId,
      {
        kind:"vote",
        round:game.round,
        options
      }
    );
  }

  function sendJudgePrompt(
    player,
    ejected
  ){

    if(
      !player ||
      !player.clientId
    ){
      return;
    }

    sendPrivate(
      player.clientId,
      {
        kind:"judge",
        description:
          `${ejected.name} would be ejected. Do you want to cancel this ejection?`
      }
    );
  }

  function broadcastPublic(
    title,
    message,
    extra={}
  ){

    send({
      type:"public",
      title,
      message,
      ...extra
    });
  }

  function receivePublic(msg){

    if(
      msg.sender===
      ONLINE.clientId
    ){
      return;
    }

    const title=
      msg.title ||
      "ONLINE GAME";

    const message=
      msg.message ||
      "";

    showOnlineRemote(`
      <div class="eyebrow">
        ${esc(title)}
      </div>

      <h1>
        ${esc(title)}
      </h1>

      <p class="large-message">
        ${esc(message)}
      </p>

      <button
        id="onlinePublicContinue"
        type="button"
        class="primary full">
        CONTINUE
      </button>
    `);

    $("onlinePublicContinue")
      .onclick=()=>{

        send({
          type:"public_done",
          playerId:ONLINE.myPlayerId
        });

        renderRemoteWait(
          "Waiting for the host..."
        );
      };
  }

  function receiveOnlineGameOver(msg){

    const data=
      msg.data ||
      msg;

    renderRemoteGameOver(
      data
    );
  }

  function bindOnline(){

    makeOnlineUI();

    const open=
      $("openOnlineButton");

    if(open){

      /*
        Replacing the listener prevents
        multiple handlers after rerenders.
      */
      const replacement=
        open.cloneNode(true);

      open.replaceWith(
        replacement
      );

      replacement.type="button";

      replacement.addEventListener(
        "pointerup",
        ev=>{
          ev.preventDefault();
          ev.stopPropagation();
          showOnlineScreen();
        },
        {passive:false}
      );

      replacement.addEventListener(
        "click",
        ev=>{
          ev.preventDefault();
          ev.stopPropagation();
          showOnlineScreen();
        }
      );
    }

    $("createRoomButton")
      ?.addEventListener(
        "click",
        createRoom
      );

    $("joinRoomButton")
      ?.addEventListener(
        "click",
        showJoin
      );

    $("connectRoomButton")
      ?.addEventListener(
        "click",
        joinRoom
      );

    $("onlineBackButton")
      ?.addEventListener(
        "click",
        leaveRoom
      );

    $("onlineHostSetupButton")
      ?.addEventListener(
        "click",
        beginHostSetup
      );
  }

  /*
    Save the original local startGame function.
    Online host uses the same normal setup/random
    role system instead of having a second role engine.
  */
  ONLINE.originalStartGame=
    window.startGame ||
    startGame;

  /*
    Host starts the normal game while keeping
    Online Mode active.
  */
  window.openAlienOnline=
    function(){

      makeOnlineUI();

      showOnlineScreen();
    };

  /*
    Expose a few useful functions globally.
  */
  window.createAlienRoom=
    createRoom;

  window.joinAlienRoom=
    joinRoom;

  window.leaveAlienRoom=
    leaveRoom;

  /*
    Bind after the rest of the page exists.
  */
  if(
    document.readyState===
    "loading"
  ){

    document.addEventListener(
      "DOMContentLoaded",
      bindOnline,
      {once:true}
    );

  }else{

    bindOnline();
  }

})();
