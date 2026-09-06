"use strict";

/* =========================================================
   ALIEN — GAME.JS
   ========================================================= */

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
    desc:"Once per round, receive a private message from Earth while Communications is online."
  },

  judge:{
    icon:"⚖️",
    name:"Judge",
    team:"Human",
    desc:"Once per game, cancel a Captain's tie-breaker ejection."
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
      .map(r => [r,0])
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

function getPlayer(id){
  return game.players.find(p => p.id === id);
}

function living(){
  return game.players.filter(alive);
}

function isHostile(p){
  return p && ROLE_DATA[p.role]?.team === "Hostile";
}

function roleTeam(p){
  return p ? ROLE_DATA[p.role]?.team : null;
}

function teamClass(team){
  if(team === "Human") return "human";
  if(team === "Hostile") return "hostile";
  if(team === "Neutral") return "neutral";
  return "";
}

function displayName(id){
  const p = getPlayer(id);

  if(!p) return "";

  if(
    game.displaySwap &&
    game.displaySwap.length === 2
  ){
    const a = game.displaySwap[0];
    const b = game.displaySwap[1];

    if(id === a) return getPlayer(b)?.name || p.name;
    if(id === b) return getPlayer(a)?.name || p.name;
  }

  return p.name;
}

function realName(id){
  return getPlayer(id)?.name || "";
}

function button(label,value,cls=""){
  return `
    <button
      type="button"
      class="${cls}"
      data-value="${esc(value)}"
    >
      ${label}
    </button>
  `;
}

function setScreen(id){
  document.querySelectorAll(".screen").forEach(s=>{
    s.classList.remove("active");
  });

  const target=$(id);

  if(target){
    target.classList.add("active");
  }

  window.scrollTo(0,0);
}

function openModal(id){
  const m=$(id);
  if(m) m.classList.add("open");
}

function closeModal(id){
  const m=$(id);
  if(m) m.classList.remove("open");
}

/* =========================================================
   SETUP
   ========================================================= */

function resetSetupPlayers(){

  const select=$("playerCount");

  if(!select) return;

  const n=Number(select.value);

  game.players=Array.from(
    {length:n},
    (_,i)=>({
      id:`p${i+1}`,
      name:`Player ${i+1}`,
      role:"survivor",
      alive:true,
      originalRole:"survivor",
      infectionRound:null,
      hasInfected:false
    })
  );

  game.randomisedRoles=false;
  game.randomRoles={};

  renderSetup();
}

function renderSetup(){

  const box=$("playersSetup");

  if(!box) return;

  box.innerHTML=game.players.length
    ? game.players.map((p,i)=>`

      <div class="setup-player">

        <label>
          Player ${i+1}

          <select
            class="role-select ${
              game.randomisedRoles &&
              game.randomRoles[i]
                ? "random-hidden"
                : ""
            }"
            data-index="${i}"
          >

            <option value="random">🎲 RANDOM</option>

            ${
              [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]
                .filter(r=>settings.enabled[r] || r==="engineer")
                .map(r=>`
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

function bindSetupSelects(){

  document
    .querySelectorAll(".role-select")
    .forEach(select=>{

      select.onchange=()=>{

        const index=Number(select.dataset.index);
        const value=select.value;

        if(value==="random"){
          delete game.randomRoles[index];
        }else{
          game.randomRoles[index]=value;
        }

        game.randomisedRoles=false;

        updatePlayerValidity();
      };

    });
}

function updatePlayerValidity(){

  const start=$("startGameButton");

  if(!start) return;

  const n=game.players.length;

  start.disabled=!(n>=4 && n<=12);
}

/* =========================================================
   RANDOM ROLES
   ========================================================= */

function weightedPick(roles){

  const available=roles.filter(
    r=>settings.enabled[r]
  );

  if(!available.length) return null;

  let total=available.reduce(
    (sum,r)=>sum+(HUMAN_WEIGHTS[r]||0),
    0
  );

  let roll=Math.random()*total;

  for(const r of available){

    roll-=HUMAN_WEIGHTS[r]||0;

    if(roll<=0){
      return r;
    }

  }

  return available[available.length-1];
}

function randomiseRoles(){

  const n=game.players.length;

  if(!n){
    resetSetupPlayers();
  }

  const count=game.players.length;

  if(count<4 || count>12) return;

  const hostileCount=HOSTILE_COUNTS[count];

  let roles=[];

  const hostilePool=shuffle(
    HOSTILES.filter(r=>settings.enabled[r])
  );

  if(hostilePool.length<hostileCount){
    alert("Not enough enabled Hostile roles for this player count.");
    return;
  }

  roles.push(...hostilePool.slice(0,hostileCount));

  roles.push("engineer");

  const humanSlots=count-hostileCount-1;

  let availableHumans=HUMANS
    .filter(r=>r!=="engineer")
    .filter(r=>settings.enabled[r]);

  for(let i=0;i<humanSlots;i++){

    if(!availableHumans.length){
      alert("Not enough enabled Human roles.");
      return;
    }

    const chosen=weightedPick(availableHumans);

    roles.push(chosen);

    availableHumans=availableHumans.filter(
      r=>r!==chosen
    );
  }

  roles=shuffle(roles);

  game.randomRoles={};

  roles.forEach((role,i)=>{
    game.randomRoles[i]=role;
  });

  game.randomisedRoles=true;

  renderSetup();
}

/* =========================================================
   CUSTOM ROLES
   ========================================================= */

function renderCustomRoles(){

  const groups=[
    ["HOSTILE",HOSTILES],
    ["HUMAN",HUMANS],
    ["NEUTRAL",NEUTRALS],
    ["ROLE CONCEPT",CONCEPTS]
  ];

  const box=$("customRoleContent");

  if(!box) return;

  box.innerHTML=groups.map(
    ([title,roles])=>`

      <section>

        <h3>${title}</h3>

        ${
          roles.map(r=>{

            const locked=r==="engineer";

            return `
              <div class="custom-row ${locked?"locked":""}">

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
                    value="${settings.counts[r]||0}"
                    data-role-count="${r}"
                    ${locked?"readonly":""}
                  >
                </label>

                <label class="switch">

                  <input
                    type="checkbox"
                    data-role-enabled="${r}"
                    ${
                      (settings.enabled[r]||locked)
                        ? "checked"
                        : ""
                    }
                    ${locked?"disabled":""}
                  >

                  <span>Enabled</span>

                </label>

              </div>
            `;

          }).join("")
        }

      </section>

    `
  ).join("");

  box
    .querySelectorAll("[data-role-enabled]")
    .forEach(el=>{

      el.onchange=()=>{

        const role=el.dataset.roleEnabled;

        settings.enabled[role]=el.checked;

        if(!el.checked){
          settings.counts[role]=0;
        }

        renderCustomRoles();
        renderSetup();
      };

    });

  box
    .querySelectorAll("[data-role-count]")
    .forEach(el=>{

      el.onchange=()=>{

        const role=el.dataset.roleCount;

        settings.counts[role]=Math.max(
          0,
          Math.min(1,Number(el.value)||0)
        );

        if(settings.counts[role]>0){
          settings.enabled[role]=true;
        }

        updatePlayerValidity();
      };

    });
}

function applyCustomRoles(){

  const count=game.players.length;

  const selected=[];

  for(const role of [...HOSTILES,...HUMANS,...NEUTRALS,...CONCEPTS]){

    const amount=settings.counts[role]||0;

    for(let i=0;i<amount;i++){
      selected.push(role);
    }

  }

  if(selected.length!==count){

    alert(
      `Custom roles must total exactly ${count} players. Current total: ${selected.length}.`
    );

    return;
  }

  const hostileCount=selected.filter(
    r=>HOSTILES.includes(r)
  ).length;

  if(hostileCount!==HOSTILE_COUNTS[count]){

    alert(
      `You need exactly ${HOSTILE_COUNTS[count]} Hostile role(s) for ${count} players.`
    );

    return;
  }

  if(!selected.includes("engineer")){

    alert("Engineer is required.");

    return;
  }

  game.randomRoles={};

  shuffle(selected).forEach((role,i)=>{
    game.randomRoles[i]=role;
  });

  game.randomisedRoles=true;

  closeModal("customRoleModal");
  renderSetup();
}

/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide(){

  const box=$("roleGuideContent");

  if(!box) return;

  box.innerHTML=ROLE_KEYS.map(r=>{

    const data=ROLE_DATA[r];

    return `
      <article class="role-card">

        <div class="role-title ${teamClass(data.team)}">
          ${data.icon} ${data.name}
        </div>

        <div class="role-team">
          ${data.team}
        </div>

        <p>${data.desc}</p>

      </article>
    `;

  }).join("");
}

/* =========================================================
   START GAME
   ========================================================= */

function startGame(){

  const count=game.players.length;

  if(count<4 || count>12){
    alert("Choose between 4 and 12 players.");
    return;
  }

  const roles=[];

  for(let i=0;i<count;i++){

    let role=game.randomRoles[i];

    if(!role){
      role=null;
    }

    roles.push(role);
  }

  /*
    IMPORTANT MOBILE/SETUP FIX:
    If some players are manually assigned and others are RANDOM,
    fill the remaining slots automatically.
  */

  const hostileCount=HOSTILE_COUNTS[count];

  const usedHostiles=roles.filter(
    r=>HOSTILES.includes(r)
  ).length;

  const usedHumans=roles.filter(
    r=>HUMANS.includes(r)
  ).length;

  const usedNeutrals=roles.filter(
    r=>NEUTRALS.includes(r)
  ).length;

  const remaining=count-
    usedHostiles-
    usedHumans-
    usedNeutrals;

  if(
    usedHostiles>hostileCount ||
    remaining<0
  ){

    alert("Invalid role setup.");
    return;
  }

  const availableHostiles=shuffle(
    HOSTILES.filter(r=>settings.enabled[r])
  ).filter(r=>!roles.includes(r));

  while(
    roles.filter(r=>HOSTILES.includes(r)).length
    < hostileCount
  ){

    const r=availableHostiles.shift();

    if(!r){
      alert("Not enough enabled Hostile roles.");
      return;
    }

    const index=roles.findIndex(r=>!r);

    if(index<0) break;

    roles[index]=r;
  }

  if(!roles.includes("engineer")){

    const engineerIndex=roles.findIndex(r=>!r);

    if(engineerIndex>=0){
      roles[engineerIndex]="engineer";
    }else if(usedHumans===0){
      alert("Engineer is required.");
      return;
    }

  }

  const humanPool=shuffle(
    HUMANS.filter(r=>
      r!=="engineer" &&
      settings.enabled[r] &&
      !roles.includes(r)
    )
  );

  for(let i=0;i<roles.length;i++){

    if(!roles[i]){

      const r=weightedPick(
        humanPool.length
          ? humanPool
          : HUMANS.filter(r=>
              r!=="engineer" &&
              settings.enabled[r]
            )
      );

      if(!r){
        alert("Not enough enabled Human roles.");
        return;
      }

      roles[i]=r;

      const idx=humanPool.indexOf(r);

      if(idx>=0){
        humanPool.splice(idx,1);
      }

    }

  }

  /*
    Apply roles.
  */

  game.players.forEach((p,i)=>{

    const role=roles[i];

    p.role=role;
    p.originalRole=role;
    p.alive=true;
    p.infectionRound=null;
    p.hasInfected=false;

  });

  game.round=1;
  game.stage=1;

  game.gameOver=false;
  game.voteResolutionDone=false;

  game.tricksterUsed=false;
  game.displaySwap=null;

  game.judgeUsed=false;

  game.systems={
    engines:true,
    o2:true,
    communications:true,
    power:true
  };

  setScreen("passScreen");

  preparePass();
}

/* =========================================================
   PASS SCREEN
   ========================================================= */

function preparePass(){

  const alivePlayers=living();

  if(!alivePlayers.length){
    checkVictory();
    return;
  }

  const p=alivePlayers[0];

  $("passTitle").textContent="PASS THE PHONE";
  $("passName").textContent=p.name;

  setScreen("passScreen");

  game.passIndex=0;
  showPassPlayer();
}

function showPassPlayer(){

  const alivePlayers=living();

  if(game.passIndex>=alivePlayers.length){

    game.passIndex=0;

    setScreen("roleScreen");

    showRole();

    return;
  }

  const p=alivePlayers[game.passIndex];

  $("passName").textContent=p.name;

  $("readyButton").textContent=
    `I'M ${p.name} — SHOW MY ROLE`;

  setScreen("passScreen");
}

/* =========================================================
   ROLE SCREEN
   ========================================================= */

function showRole(){

  const alivePlayers=living();

  if(game.passIndex>=alivePlayers.length){

    startAbilityRound();

    return;
  }

  const p=alivePlayers[game.passIndex];

  $("rolePlayerName").textContent=p.name;

  $("roleIcon").textContent=
    ROLE_DATA[p.role]?.icon || "❓";

  $("roleName").textContent=
    ROLE_DATA[p.role]?.name || p.role;

  $("roleTeam").textContent=
    ROLE_DATA[p.role]?.team || "";

  $("roleDescription").textContent=
    ROLE_DATA[p.role]?.desc || "";

  $("roleTeam").className=
    `team-badge ${teamClass(roleTeam(p))}`;

  $("showActionButton").textContent=
    "CONTINUE";

  $("showActionButton").onclick=()=>{

    game.passIndex++;

    if(game.passIndex>=alivePlayers.length){
      startAbilityRound();
    }else{
      showPassPlayer();
    }

  };

  setScreen("roleScreen");
}

/* =========================================================
   ABILITY ROUND
   ========================================================= */

function startAbilityRound(){

  game.roundStartAliveIds=
    living().map(p=>p.id);

  game.actions={};
  game.reactionInfo={};
  game.blockedPlayers=new Set();
  game.protectedPlayers=new Set();

  game.abilityQueue=[
    ...game.roundStartAliveIds
  ];

  game.abilityIndex=0;

  game.previousActions=
    {...game.actions};

  showNextAbility();
}

function showNextAbility(){

  if(game.abilityIndex>=game.abilityQueue.length){

    resolveAbilities();

    return;
  }

  const id=game.abilityQueue[game.abilityIndex];

  const p=getPlayer(id);

  if(!p || !alive(p)){

    game.abilityIndex++;

    showNextAbility();

    return;
  }

  game.currentActor=id;

  $("actionPlayerName").textContent=p.name;

  showAction();

  setScreen("actionScreen");
}

function showAction(){

  const p=getPlayer(game.currentActor);

  if(!p){
    return;
  }

  $("actionPlayerName").textContent=p.name;

  $("actionOptions").innerHTML="";

  game.selectedAction=null;

  const powerOnline=game.systems.power;

  /*
    Engineer can always act.
  */

  if(!powerOnline && p.role!=="engineer"){

    $("actionDescription").textContent=
      "⚡ POWER IS OFFLINE — YOUR ABILITY CANNOT BE USED.";

    $("actionOptions").innerHTML=
      button("CONTINUE","none");

    bindActionButtons();

    return;
  }

  if(game.blockedPlayers.has(p.id)){

    $("actionDescription").textContent=
      "🛡️ YOUR ABILITY WAS BLOCKED THIS ROUND.";

    $("actionOptions").innerHTML=
      button("CONTINUE","none");

    bindActionButtons();

    return;
  }

  switch(p.role){

    case "alien":
      renderAlienChoices(p);
      break;

    case "saboteur":
      renderSystemChoices(false);
      break;

    case "silencer":
      renderSilencerChoices(p);
      break;

    case "parasite":
      renderParasiteChoices(p);
      break;

    case "engineer":
      renderSystemChoices(true);
      break;

    case "scientist":
      renderScientistChoices(p);
      break;

    case "detective":
      renderDetectiveChoices(p);
      break;

    case "medic":
      renderMedicChoices(p);
      break;

    case "captain":
      $("actionDescription").textContent=
        "Your Captain ability is used automatically if a vote ties.";

      $("actionOptions").innerHTML=
        button("CONTINUE","none");

      break;

    case "guard":
      renderGuardChoices(p);
      break;

    case "radio":
      renderRadio(p);
      break;

    case "judge":
      $("actionDescription").textContent=
        game.judgeUsed
          ? "You have already used your Judge ability."
          : "Your Judge ability activates automatically when needed.";

      $("actionOptions").innerHTML=
        button("CONTINUE","none");

      break;

    case "trickster":
      renderTricksterChoices(p);
      break;

    default:
      $("actionDescription").textContent=
        "You have no active ability this round.";

      $("actionOptions").innerHTML=
        button("CONTINUE","none");

      break;
  }

  bindActionButtons();
}

/* =========================================================
   ACTION CHOICES
   ========================================================= */

function bindActionButtons(){

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        const value=b.dataset.value;

        if(value==="none"){
          game.selectedAction=null;
        }else{
          game.selectedAction=value;
        }

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x=>x.classList.remove("selected"));

        b.classList.add("selected");

      };

    });

  $("showActionButton").onclick=confirmAction;
}

function confirmAction(){

  const p=getPlayer(game.currentActor);

  if(!p) return;

  game.actions[p.id]=game.selectedAction;

  game.abilityIndex++;

  showNextAbility();
}

/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(actor=null,excludeId=null){

  return living()
    .filter(p=>{

      if(p.id===excludeId) return false;

      if(
        actor &&
        roleTeam(actor)==="Hostile" &&
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
    .map(p=>({
      id:p.id,
      label:displayName(p.id)
    }));
}

/* =========================================================
   ALIEN
   ========================================================= */

function renderAlienChoices(p){

  const hasSaboteur=living()
    .some(x=>x.role==="saboteur");

  $("actionDescription").textContent=
    hasSaboteur
      ? "Choose a player to kill."
      : "Choose Kill or Sabotage.";

  let html="";

  if(!hasSaboteur){
    html+=button("☠️ KILL","kill");
    html+=button("⚠️ SABOTAGE","sabotage");
  }else{
    html+=button("☠️ KILL","kill");
  }

  $("actionOptions").innerHTML=html;

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        if(b.dataset.value==="kill"){

          $("actionDescription").textContent=
            "Choose a player to kill.";

          $("actionOptions").innerHTML=
            targetOptions(p,p.id)
              .map(o=>button(o.label,o.id))
              .join("");

          $("actionOptions")
            .querySelectorAll("button")
            .forEach(x=>x.onclick=()=>{

              game.selectedAction=JSON.stringify({
                type:"kill",
                target:x.dataset.value
              });

              x.classList.add("selected");

            });

        }

        if(b.dataset.value==="sabotage"){

          renderSystemChoices(false);

        }

      };

    });
}

/* =========================================================
   SYSTEMS
   ========================================================= */

function renderSystemChoices(engineer=false){

  const systems=engineer
    ? Object.keys(game.systems)
        .filter(k=>!game.systems[k])
    : Object.keys(game.systems);

  const names={
    engines:"🚀 Engines",
    o2:"🫁 O2",
    communications:"📡 Communications",
    power:"⚡ Power"
  };

  if(!systems.length){

    $("actionDescription").textContent=
      engineer
        ? "All systems are online."
        : "Choose a system.";

    $("actionOptions").innerHTML=
      button("CONTINUE","none");

    bindActionButtons();

    return;
  }

  $("actionDescription").textContent=
    engineer
      ? "Choose one offline system to repair."
      : "Choose a system to sabotage.";

  $("actionOptions").innerHTML=
    systems.map(s=>button(names[s],s)).join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        const type=engineer
          ? "repair"
          : "sabotage";

        game.selectedAction=JSON.stringify({
          type,
          system:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   SILENCER
   ========================================================= */

function renderSilencerChoices(p){

  $("actionDescription").textContent=
    "Choose a living player to silence for 2 rounds.";

  $("actionOptions").innerHTML=
    targetOptions(p,p.id)
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedAction=JSON.stringify({
          type:"silence",
          target:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   PARASITE
   ========================================================= */

function renderParasiteChoices(p){

  if(p.hasInfected){

    $("actionDescription").textContent=
      "You have already used your infection ability.";

    $("actionOptions").innerHTML=
      button("CONTINUE","none");

    return;
  }

  $("actionDescription").textContent=
    "Choose a living player to infect.";

  $("actionOptions").innerHTML=
    targetOptions(p,p.id)
      .filter(o=>{
        const t=getPlayer(o.id);
        return t && !t.infectionRound;
      })
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedAction=JSON.stringify({
          type:"infect",
          target:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   SCIENTIST
   ========================================================= */

function renderScientistChoices(p){

  $("actionDescription").textContent=
    "Choose a living player to check.";

  $("actionOptions").innerHTML=
    targetOptions(p)
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        const t=getPlayer(b.dataset.value);

        game.selectedAction=JSON.stringify({
          type:"science",
          target:t.id,
          mode:"check"
        });

        $("actionOptions").innerHTML=`
          ${button("🔬 CHECK","check")}
          ${
            ["infected","diseased"].includes(t.role)
              ? button("💉 CURE","cure")
              : ""
          }
        `;

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x=>{

            x.onclick=()=>{

              const mode=x.dataset.value;

              game.selectedAction=JSON.stringify({
                type:"science",
                target:t.id,
                mode
              });

              x.classList.add("selected");

            };

          });

      };

    });
}

/* =========================================================
   DETECTIVE
   ========================================================= */

function renderDetectiveChoices(p){

  $("actionDescription").textContent=
    "Choose a living player to investigate.";

  $("actionOptions").innerHTML=
    targetOptions(p)
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedAction=JSON.stringify({
          type:"detective",
          target:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   MEDIC
   ========================================================= */

function renderMedicChoices(p){

  $("actionDescription").textContent=
    "Choose a living player to protect from a kill.";

  $("actionOptions").innerHTML=
    targetOptions(p)
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedAction=JSON.stringify({
          type:"protect",
          target:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   GUARD
   ========================================================= */

function renderGuardChoices(p){

  $("actionDescription").textContent=
    "Choose a living player whose ability you want to block.";

  $("actionOptions").innerHTML=
    targetOptions(p,p.id)
      .map(o=>button(o.label,o.id))
      .join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedAction=JSON.stringify({
          type:"block",
          target:b.dataset.value
        });

        b.classList.add("selected");

      };

    });
}

/* =========================================================
   RADIO
   ========================================================= */

function renderRadio(){

  $("actionDescription").textContent=
    game.systems.communications
      ? "Communications is online. Earth can contact you."
      : "Communications is offline.";

  $("actionOptions").innerHTML=
    button("CONTINUE","none");
}

/* =========================================================
   TRICKSTER
   ========================================================= */

function renderTricksterChoices(p){

  if(game.tricksterUsed){

    $("actionDescription").textContent=
      "You have already used your Trickster ability.";

    $("actionOptions").innerHTML=
      button("CONTINUE","none");

    return;
  }

  const options=targetOptions(p);

  $("actionDescription").textContent=
    "Choose two living players to swap displayed identities.";

  $("actionOptions").innerHTML=
    options.map(o=>button(o.label,o.id)).join("");

  $("actionOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        const first=b.dataset.value;

        $("actionDescription").textContent=
          "Choose the second player.";

        $("actionOptions").innerHTML=
          options
            .filter(o=>o.id!==first)
            .map(o=>button(o.label,o.id))
            .join("");

        $("actionOptions")
          .querySelectorAll("button")
          .forEach(x=>{

            x.onclick=()=>{

              game.selectedAction=JSON.stringify({
                type:"trickster",
                first,
                second:x.dataset.value
              });

              x.classList.add("selected");

            };

          });

      };

    });
}

/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities(){

  game.protectedPlayers=new Set();
  game.blockedPlayers=new Set();

  /*
    First determine Guard targets.
  */

  for(const p of game.players){

    if(!alive(p)) continue;

    const raw=game.actions[p.id];

    if(!raw) continue;

    let a;

    try{
      a=JSON.parse(raw);
    }catch{
      continue;
    }

    if(a.type==="block"){
      game.blockedPlayers.add(a.target);
    }

  }

  /*
    Then resolve all actions.
  */

  for(const p of game.players){

    if(!alive(p)) continue;

    const raw=game.actions[p.id];

    if(!raw) continue;

    let a;

    try{
      a=JSON.parse(raw);
    }catch{
      continue;
    }

    if(
      game.blockedPlayers.has(p.id) &&
      p.role!=="engineer"
    ){
      continue;
    }

    if(a.type==="protect"){

      game.protectedPlayers.add(a.target);

      game.reactionInfo[p.id]=
        "MEDIC: You protected a player.";

    }

    if(a.type==="block"){

      game.reactionInfo[p.id]=
        "GUARD: Your target's ability was blocked.";

    }

    if(a.type==="silence"){

      const t=getPlayer(a.target);

      if(
        t &&
        alive(t) &&
        t.id!==p.id
      ){

        game.silencedUntil[t.id]=
          Math.max(
            game.silencedUntil[t.id]||0,
            game.round+2
          );

        game.reactionInfo[p.id]=
          `SILENCER: ${t.name} was silenced.`;
      }

    }

    if(a.type==="kill"){

      const t=getPlayer(a.target);

      if(
        t &&
        alive(t) &&
        !game.protectedPlayers.has(t.id)
      ){

        t.alive=false;

        game.reactionInfo[t.id]=
          "You were eliminated this round.";

        game.lastRoundResults.push(
          `${t.name} was eliminated.`
        );

      }

    }

    if(a.type==="sabotage"){

      if(game.systems[a.system]!==undefined){

        game.systems[a.system]=false;

        game.reactionInfo[p.id]=
          `SYSTEM: ${a.system.toUpperCase()} was sabotaged.`;

      }

    }

    if(a.type==="repair"){

      if(game.systems[a.system]!==undefined){

        game.systems[a.system]=true;

        game.reactionInfo[p.id]=
          `ENGINEER: ${a.system.toUpperCase()} repaired.`;

      }

    }

    if(a.type==="infect"){

      p.hasInfected=true;

      const target=getPlayer(a.target);

      if(
        target &&
        alive(target) &&
        !target.infectionRound
      ){

        target.infectionRound=game.round;
        target.originalRole=target.role;
        target.role="infected";
        target.hasInfected=false;

        game.reactionInfo[target.id]=
          "You were infected this round.";

      }

    }

    if(a.type==="science"){

      const t=getPlayer(a.target);

      if(t){

        const status=
          ROLE_DATA[t.role]?.name || t.role;

        game.reactionInfo[p.id]=
          `SCIENCE: ${t.name} is ${status}.`;

        if(
          a.mode==="cure" &&
          (
            t.role==="infected" ||
            t.role==="diseased"
          )
        ){

          t.role="survivor";
          t.infectionRound=null;
          t.hasInfected=false;

          game.reactionInfo[p.id]=
            `SCIENCE: ${t.name} was cured and is now a Survivor.`;

          if(
            game.reactionInfo[t.id] &&
            t.id!==p.id
          ){

            game.reactionInfo[t.id]=
              "You were cured by the Scientist and are now a Survivor.";

          }

        }

      }

    }

    if(a.type==="detective"){

      const t=getPlayer(a.target);

      if(t){

        const previous=
          game.previousActions[t.id];

        game.reactionInfo[p.id]=
          previous
            ? `DETECTIVE: ${t.name} interacted with something last round.`
            : `DETECTIVE: ${t.name} did not use an ability last round.`;

      }

    }

    if(a.type==="trickster"){

      if(!game.tricksterUsed){

        game.displaySwap=[
          a.first,
          a.second
        ];

        game.tricksterUsed=true;

      }

    }

  }

  /*
    Infection progression.
  */

  for(const p of game.players){

    if(
      !alive(p) ||
      !p.infectionRound
    ) continue;

    const age=
      game.round-p.infectionRound+1;

    if(
      age===2 &&
      p.role==="infected"
    ){

      p.role="diseased";

      game.reactionInfo[p.id]=
        "You have become DISEASED and are on the Hostile Team.";

    }

    if(
      age>=3 &&
      p.role==="diseased"
    ){

      p.role="parasite";
      p.hasInfected=false;

      game.reactionInfo[p.id]=
        "You have become a PARASITE and are on the Hostile Team.";

    }

  }

  /*
    Save actions for Detective.
  */

  game.previousActions={
    ...game.actions
  };

  /*
    Reaction round includes everyone alive
    at the START of this round.
  */

  game.reactionQueue=[
    ...game.roundStartAliveIds
  ];

  game.reactionIndex=0;

  showNextReaction();
}

/* =========================================================
   REACTION ROUND
   ========================================================= */

function showNextReaction(){

  if(
    game.reactionIndex>=game.reactionQueue.length
  ){

    startDiscussion();

    return;
  }

  const id=
    game.reactionQueue[game.reactionIndex];

  const p=getPlayer(id);

  if(!p){

    game.reactionIndex++;
    showNextReaction();
    return;

  }

  $("reactionPlayerName").textContent=p.name;

  $("reactionReadyButton").textContent=
    `I'M ${p.name} — SHOW RESULT`;

  $("reactionResult").textContent="";

  $("reactionContinueButton").style.display="none";

  $("reactionReadyButton").onclick=()=>{

    const info=
      game.reactionInfo[p.id] ||
      "Nothing happened to you this round.";

    $("reactionResult").textContent=info;

    $("reactionReadyButton").style.display="none";
    $("reactionContinueButton").style.display="block";

  };

  $("reactionContinueButton").onclick=()=>{

    game.reactionIndex++;

    $("reactionReadyButton").style.display="block";
    $("reactionContinueButton").style.display="none";

    showNextReaction();

  };

  setScreen("reactionScreen");
}

/* =========================================================
   DISCUSSION
   ========================================================= */

function startDiscussion(){

  $("discussionText").textContent=
    `Discuss what happened during Round ${game.round}.`;

  $("startVotingButton").textContent=
    "START VOTING";

  setScreen("discussionScreen");
}

/* =========================================================
   VOTING
   ========================================================= */

function startVoting(){

  game.votes={};
  game.currentVoteIndex=0;

  showVote();
}

function showVote(){

  const alivePlayers=living();

  if(
    game.currentVoteIndex>=alivePlayers.length
  ){

    resolveVoting();

    return;
  }

  const p=
    alivePlayers[game.currentVoteIndex];

  $("votingRound").textContent=
    `ROUND ${game.round}`;

  $("votingStage").textContent=
    `STAGE ${game.stage} / 10`;

  $("voterName").textContent=p.name;

  const silenced=
    (game.silencedUntil[p.id]||0)>game.round;

  $("votingSilenced").textContent=
    silenced
      ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
      : "";

  $("voteOptions").innerHTML=
    silenced
      ? button("SKIP (SILENCED)","skip")
      : [
          ...living()
            .filter(x=>x.id!==p.id)
            .map(x=>button(displayName(x.id),x.id)),
          button("⏭️ SKIP","skip")
        ].join("");

  game.selectedVote=null;

  $("voteOptions")
    .querySelectorAll("button")
    .forEach(b=>{

      b.onclick=()=>{

        game.selectedVote=
          b.dataset.value;

        $("voteOptions")
          .querySelectorAll("button")
          .forEach(x=>
            x.classList.remove("selected")
          );

        b.classList.add("selected");

      };

    });

  $("confirmVoteButton").onclick=confirmVote;

  setScreen("votingScreen");
}

function confirmVote(){

  if(!game.selectedVote) return;

  const alivePlayers=living();

  const p=
    alivePlayers[game.currentVoteIndex];

  if(!p) return;

  game.votes[p.id]=game.selectedVote;

  game.currentVoteIndex++;

  showVote();
}

/* =========================================================
   VOTING RESOLUTION
   ========================================================= */

function resolveVoting(){

  const counts={};

  Object.values(game.votes).forEach(v=>{

    if(v==="skip") return;

    counts[v]=(counts[v]||0)+1;

  });

  const max=
    Math.max(0,...Object.values(counts));

  const tied=
    Object.keys(counts)
      .filter(id=>counts[id]===max);

  if(!tied.length || max===0){

    finishRound(null);

    return;
  }

  if(tied.length===1){

    ejectPlayer(tied[0]);

    return;
  }

  /*
    Captain tie-break.
  */

  const captain=living().find(
    p=>p.role==="captain"
  );

  if(
    captain &&
    game.systems.power
  ){

    $("captainTieOptions").innerHTML=
      tied
        .map(id=>button(displayName(id),id))
        .join("");

    $("captainTieDescription").textContent=
      "The vote is tied. Choose who is ejected.";

    $("captainTieOptions")
      .querySelectorAll("button")
      .forEach(b=>{

        b.onclick=()=>{

          ejectPlayer(b.dataset.value);

        };

      });

    setScreen("captainTieScreen");

    return;
  }

  finishRound(null);
}

function ejectPlayer(id){

  const p=getPlayer(id);

  if(!p || !alive(p)){

    finishRound(null);
    return;
  }

  /*
    Jester wins immediately if normally voted out.
  */

  if(p.role==="jester"){

    p.alive=false;

    showGameOver(
      "🃏 JESTER WINS!",
      `${p.name} was voted out and achieved the Jester's goal.`
    );

    return;
  }

  p.alive=false;

  game.lastRoundResults=[
    `${p.name} was voted out.`
  ];

  finishRound(p);
}

/* =========================================================
   FINISH ROUND
   ========================================================= */

function finishRound(ejected){

  /*
    Trickster lasts through voting resolution,
    then ends.
  */

  game.displaySwap=null;

  /*
    Engines stage progression.
  */

  if(game.systems.engines){

    game.stage++;

  }

  /*
    Earth lifeline every 3 rounds.
  */

  if(game.round%3===0){

    game.lifelineNumber++;

    if(game.systems.communications){

      showLifeline();

      return;

    }

  }

  if(checkVictory()) return;

  game.round++;

  startNextRound();
}

function startNextRound(){

  if(checkVictory()) return;

  game.lastRoundResults=[];

  game.passIndex=0;

  preparePass();
}

/* =========================================================
   LIFELINE
   ========================================================= */

function showLifeline(){

  const clues=[
    "There is an Alien aboard.",
    "There is more than 1 Alien.",
    "There is a Saboteur.",
    "There is a Silencer.",
    "Exactly 2 hostile roles exist.",
    "Exactly 3 hostile roles exist.",
    "Engineer is still alive.",
    "Captain is aboard.",
    "Detective is aboard.",
    "Medic is aboard.",
    "Guard is aboard.",
    "A system was sabotaged.",
    "A system was repaired.",
    "A player was prevented from voting.",
    "A player's ability was blocked."
  ];

  let clue;

  const actualHostiles=
    living().filter(isHostile);

  if(
    actualHostiles.length>=1 &&
    Math.random()<0.25
  ){

    const candidates=
      shuffle(
        living().filter(p=>!isHostile(p))
      ).slice(0,2);

    const hostile=rand(actualHostiles);

    if(candidates.length>=2){

      const listed=
        shuffle([
          hostile,
          ...candidates
        ]);

      clue=
        `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${listed.map(p=>p.name).join(", ")}`;

    }else{

      clue=rand(clues);

    }

  }else{

    clue=rand(clues);

  }

  $("lifelineNumber").textContent=
    `EARTH LIFELINE #${game.lifelineNumber}`;

  $("lifelineText").textContent=clue;

  $("lifelineContinueButton").onclick=()=>{

    if(checkVictory()) return;

    game.round++;

    startNextRound();

  };

  setScreen("lifelineScreen");
}

/* =========================================================
   VICTORY
   ========================================================= */

function checkVictory(){

  if(game.gameOver) return true;

  const alivePlayers=living();

  const hostiles=
    alivePlayers.filter(isHostile);

  const neutrals=
    alivePlayers.filter(
      p=>roleTeam(p)==="Neutral"
    );

  /*
    Hostiles win when they equal or outnumber
    everyone else.
  */

  if(
    hostiles.length>0 &&
    hostiles.length>=
      alivePlayers.length-hostiles.length
  ){

    showGameOver(
      "👽 HOSTILES WIN!",
      "The Hostile Team has taken control of the ship."
    );

    return true;
  }

  /*
    Neutral at Earth wins.
  */

  if(game.stage>10){

    if(neutrals.length){

      showGameOver(
        "👑 NEUTRAL WINS!",
        "A Neutral player survived until the ship reached Earth."
      );

      return true;
    }

    showGameOver(
      "🚀 HUMANS WIN!",
      "The ship reached Earth and the Human team survived."
    );

    return true;
  }

  /*
    Survivor King final-two victory.
  */

  if(
    alivePlayers.length===2 &&
    alivePlayers.some(p=>p.role==="king")
  ){

    const king=alivePlayers.find(
      p=>p.role==="king"
    );

    showGameOver(
      "👑 SURVIVOR KING WINS!",
      `${king.name} was one of the final 2 living players.`
    );

    return true;
  }

  return false;
}

function showGameOver(title,text){

  game.gameOver=true;

  $("gameOverTitle").textContent=title;
  $("gameOverText").textContent=text;

  const list=$("finalPlayers");

  if(list){

    list.innerHTML=game.players.map(p=>{

      const role=ROLE_DATA[p.role] || {
        icon:"❓",
        name:p.role,
        team:""
      };

      return `
        <div class="final-player">

          <strong>
            ${p.name}
          </strong>

          <span>
            ${role.icon} ${role.name}
          </span>

          <span>
            ${p.alive ? "🟢 ALIVE" : "🔴 OUT"}
          </span>

        </div>
      `;

    }).join("");

  }

  setScreen("gameOverScreen");
}

/* =========================================================
   UI INITIALISATION
   ========================================================= */

function initGameUI(){

  /*
    Safe to call more than once.
    Works whether script loads before or after DOMContentLoaded.
  */

  const playerCount=$("playerCount");

  if(!playerCount) return;

  playerCount.onchange=resetSetupPlayers;

  if(!game.players.length){
    resetSetupPlayers();
  }else{
    renderSetup();
  }

  $("randomRolesButton").type="button";

  $("randomRolesButton").onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    randomiseRoles();
  };

  $("startGameButton").onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    startGame();
  };

  $("roleGuideButton").onclick=()=>{
    renderRoleGuide();
    openModal("roleGuideModal");
  };

  $("customRolesButton").onclick=()=>{
    renderCustomRoles();
    openModal("customRoleModal");
  };

  document
    .querySelectorAll("[data-close]")
    .forEach(b=>{
      b.onclick=()=>{
        closeModal(b.dataset.close);
      };
    });

  $("readyButton").onclick=showRole;

  $("showActionButton").onclick=confirmAction;

  $("reactionReadyButton").onclick=showNextReaction;

  $("reactionContinueButton").onclick=showNextReaction;

  $("startVotingButton").onclick=startVoting;

  $("restartButton").onclick=()=>{
    location.reload();
  };

  $("applyCustomRolesButton").onclick=
    applyCustomRoles;
}

/*
  MOBILE / DESKTOP SAFE INITIALISATION
*/

if(document.readyState==="loading"){

  document.addEventListener(
    "DOMContentLoaded",
    initGameUI,
    {once:true}
  );

}else{

  initGameUI();

}
