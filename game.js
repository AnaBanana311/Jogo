const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const $ = selector => document.querySelector(selector);
const WORLD = { width: 2400, height: 1800, centerX: 1200, centerY: 900, radiusX: 960, radiusY: 680 };
const SAVE_KEY = 'selkirk-sandbox-save-v1';
const DAY_LENGTH = 360;
const RESOURCES = ['wood', 'stone', 'fiber', 'berries', 'fish', 'crystal', 'relics'];
const RESOURCE_NAMES = { wood: 'Madeira', stone: 'Pedra', fiber: 'Fibra', berries: 'Frutas', fish: 'Peixes', crystal: 'Cristais', relics: 'Relíquias' };
const QUESTS = [
  { title: 'UM LUGAR PARA CHAMAR DE CASA', text: 'Junte madeira suficiente para se estabelecer.', key: 'wood', goal: 8 },
  { title: 'FERRAMENTAS DE SOBREVIVÊNCIA', text: 'Reúna pedras para começar a fabricar ferramentas.', key: 'stone', goal: 6 },
  { title: 'CORTE MAIS EFICIENTE', text: 'Fabrique um machado no menu de criação.', key: 'axe', goal: 1 },
  { title: 'FIOS DA ILHA', text: 'Colha fibras nas moitas e perto da costa.', key: 'fiber', goal: 10 },
  { title: 'DESPENSA DE INVERNO', text: 'Colete frutas para guardar provisões.', key: 'berries', goal: 6 },
  { title: 'PEDRA SOBRE PEDRA', text: 'Fabrique uma picareta para explorar as cavernas.', key: 'pickaxe', goal: 1 },
  { title: 'ÁGUA QUE NASCE DA TERRA', text: 'Encontre a nascente escondida na ilha.', key: 'spring', goal: 1 },
  { title: 'UM TETO SEGURO', text: 'Construa uma cabana para atravessar as noites.', key: 'hut', goal: 1 },
  { title: 'O MAR TAMBÉM ALIMENTA', text: 'Fabrique uma vara e pesque na costa.', key: 'fish', goal: 4 },
  { title: 'MEMÓRIAS DO NAUFRÁGIO', text: 'Investigue os restos do navio.', key: 'wreck', goal: 1 },
  { title: 'CONSTRUA UMA JANGADA', text: 'Volte ao acampamento com materiais para navegar.', key: 'raft', goal: 1 },
  { title: 'SEGREDOS SOB A ROCHA', text: 'Explore cavernas e reúna cristais raros.', key: 'crystal', goal: 4 },
  { title: 'A CIDADE ESQUECIDA', text: 'Recupere relíquias nas ruínas do leste.', key: 'relics', goal: 3 },
  { title: 'UM SINAL NO HORIZONTE', text: 'Construa um farol para decidir o destino da ilha.', key: 'beacon', goal: 1 }
];
const RECIPES = [
  { id: 'axe', name: 'Machado de pedra', group: 'Ferramentas', cost: { wood: 5, stone: 3, fiber: 2 }, detail: 'Duplica a madeira ao derrubar árvores.' },
  { id: 'pickaxe', name: 'Picareta de pedra', group: 'Ferramentas', cost: { wood: 4, stone: 5, fiber: 2 }, detail: 'Encontra mais pedra e cristais.' },
  { id: 'rod', name: 'Vara de pesca', group: 'Ferramentas', cost: { wood: 3, fiber: 6 }, detail: 'Necessária para pescar na costa.' },
  { id: 'hut', name: 'Cabana', group: 'Construções', cost: { wood: 18, stone: 5, fiber: 8 }, detail: 'Permite dormir e recuperar as forças.' },
  { id: 'raft', name: 'Jangada', group: 'Construções', cost: { wood: 20, fiber: 12 }, detail: 'Libera a travessia para além da costa.' },
  { id: 'beacon', name: 'Farol de sinalização', group: 'Construções', cost: { wood: 24, stone: 18, crystal: 4 }, detail: 'Abre os três destinos finais.' },
  { id: 'meal', name: 'Refeição de frutas', group: 'Suprimentos', cost: { berries: 3 }, detail: 'Recupera 35 de fome.' },
  { id: 'tonic', name: 'Tônico da nascente', group: 'Suprimentos', cost: { berries: 2, fiber: 2 }, detail: 'Recupera 30 de vida e 30 de água.' }
];
const state = {
  mode: 'menu', running: false, paused: false, last: 0, time: 0, dayTime: 0, day: 1,
  weather: 'Brisa quente', weatherTimer: 0, seaTime: 0, deathReason: null, currentEnding: null,
  quest: 0, questProgress: 0, menuReturn: 'main-menu', difficulty: 'normal',
  player: { name: 'Alexander', x: 1200, y: 930, dir: 'down', walking: false, hp: 100, water: 78, food: 72, stamina: 100, inventory: { wood: 0, stone: 0, fiber: 0, berries: 0, fish: 0, crystal: 0, relics: 0 }, tools: {}, structures: [] },
  camera: { x: 0, y: 0 }, keys: {}, nearby: null, objects: [], discoveries: [], endings: [], daily: null
};

function islandContains(x, y, margin = 0) {
  const rx = WORLD.radiusX - margin;
  const ry = WORLD.radiusY - margin;
  return ((x - WORLD.centerX) / rx) ** 2 + ((y - WORLD.centerY) / ry) ** 2 <= 1;
}

function randomLandPoint(margin = 70) {
  for (let tries = 0; tries < 1200; tries++) {
    const x = 100 + Math.random() * (WORLD.width - 200);
    const y = 100 + Math.random() * (WORLD.height - 200);
    if (islandContains(x, y, margin) && Math.hypot(x - WORLD.centerX, y - WORLD.centerY) > 180) return { x, y };
  }
  return { x: WORLD.centerX, y: WORLD.centerY };
}

function generateWorld() {
  const objects = [];
  for (let i = 0; i < 110; i++) objects.push({ ...randomLandPoint(75), type: 'tree', r: 22, solid: true, id: `tree-${i}` });
  for (let i = 0; i < 46; i++) objects.push({ ...randomLandPoint(70), type: 'rock', r: 16, solid: true, id: `rock-${i}` });
  for (let i = 0; i < 42; i++) objects.push({ ...randomLandPoint(60), type: 'fiber', r: 14, id: `fiber-${i}`, ready: true });
  for (let i = 0; i < 32; i++) objects.push({ ...randomLandPoint(55), type: 'berry', r: 16, id: `berry-${i}`, ready: true, poisonous: Math.random() < 0.2 });
  for (let i = 0; i < 20; i++) objects.push({ ...randomLandPoint(70), type: 'crystal', r: 14, id: `crystal-${i}`, ready: true, hidden: true });
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 48 + Math.random() * 85;
    objects.push({ x: WORLD.centerX + Math.cos(angle) * (WORLD.radiusX + distance), y: WORLD.centerY + Math.sin(angle) * (WORLD.radiusY + distance), type: 'fish', r: 15, id: `fish-${i}`, ready: true });
  }
  objects.push(
    { x: 1200, y: 930, type: 'camp', r: 32, id: 'camp' },
    { x: 1610, y: 460, type: 'spring', r: 30, id: 'spring' },
    { x: 500, y: 1280, type: 'wreck', r: 35, id: 'wreck' },
    { x: 1910, y: 520, type: 'cave', r: 36, id: 'cave' },
    { x: 1860, y: 1230, type: 'ruins', r: 38, id: 'ruins' },
    { x: 840, y: 420, type: 'beaconSite', r: 30, id: 'beacon-site' }
  );
  return objects;
}
state.objects = generateWorld();

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 1, player: state.player, objects: state.objects, quest: state.quest,
      questProgress: state.questProgress, day: state.day, dayTime: state.dayTime,
      weather: state.weather, discoveries: state.discoveries, endings: state.endings,
      daily: state.daily, difficulty: state.difficulty
    }));
    $('#save-status').textContent = 'DIÁRIO SALVO';
  } catch (error) {
    $('#save-status').textContent = 'SALVAMENTO INDISPONÍVEL';
  }
}

function hasSave() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

function loadGame() {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (!saved || saved.version !== 1) return false;
  Object.assign(state, saved);
  state.mode = 'playing';
  state.running = true;
  state.paused = false;
  state.deathReason = null;
  state.player.hp = Math.max(1, state.player.hp);
  state.player.inventory = { ...state.player.inventory };
  openGame();
  return true;
}

function newGame() {
  const name = $('#player-name').value.trim() || 'Alexander';
  const difficulty = $('#difficulty').value;
  const resources = { wood: 0, stone: 0, fiber: 0, berries: 0, fish: 0, crystal: 0, relics: 0 };
  Object.assign(state, {
    mode: 'playing', running: true, paused: false, last: performance.now(), time: 0,
    dayTime: 0, day: 1, weather: 'Brisa quente', weatherTimer: 0, seaTime: 0,
    deathReason: null, currentEnding: null, quest: 0, questProgress: 0,
    difficulty, discoveries: [], endings: [], daily: null, camera: { x: 0, y: 0 },
    player: { name, x: 1200, y: 930, dir: 'down', walking: false, hp: 100, water: 78, food: 72, stamina: 100, inventory: resources, tools: {}, structures: [] },
    objects: generateWorld()
  });
  state.player.maxHp = 100;
  state.player.maxNeeds = 100;
  openGame();
  updateDailyTask();
  saveGame();
  toast(`Dia 1. A ilha espera por você, ${name}.`);
  requestAnimationFrame(loop);
}

function openGame() {
  state.mode = 'playing';
  $('#main-menu').classList.add('hidden');
  $('#new-game-screen').classList.add('hidden');
  $('#collection-screen').classList.add('hidden');
  $('#options-screen').classList.add('hidden');
  $('#game-ui').classList.remove('hidden');
  $('#player-name-hud').textContent = state.player.name.toUpperCase();
  $('#avatar').textContent = state.player.name[0].toUpperCase();
  state.last = performance.now();
  updateHud();
  draw();
}

function openMenuScreen(id, returnTo = 'main-menu') {
  state.menuReturn = returnTo;
  for (const screen of document.querySelectorAll('.menu-screen')) screen.classList.add('hidden');
  $(id).classList.remove('hidden');
}

function backToMenu() {
  state.mode = 'menu';
  state.running = false;
  state.paused = false;
  for (const id of ['pause-screen', 'death-screen', 'ending-screen', 'ending-result']) $(`#${id}`).classList.add('hidden');
  $('#game-ui').classList.add('hidden');
  $('#main-menu').classList.remove('hidden');
  for (const screen of document.querySelectorAll('.menu-screen')) if (screen.id !== 'main-menu') screen.classList.add('hidden');
  updateMenu();
  draw();
}

function updateMenu() {
  const savedData = hasSave() ? JSON.parse(localStorage.getItem(SAVE_KEY)) : null;
  const saved = Boolean(savedData);
  $('#continue-button').disabled = !saved || savedData.player.hp <= 0;
  $('#menu-save-summary').textContent = saved ? `DIÁRIO DISPONÍVEL · DIA ${savedData.day}` : 'NENHUMA JORNADA SALVA';
  const endings = JSON.parse(localStorage.getItem(`${SAVE_KEY}-endings`) || '[]');
  $('#collection-summary').textContent = `${endings.length} de 3 finais descobertos`;
  $('#collection-endings').textContent = endings.length ? endings.join(' · ') : 'Os finais aparecerão aqui quando forem descobertos.';
}

function updateDailyTask() {
  const tasks = [
    { title: 'Trabalho de lenhador', key: 'wood', target: 10, reward: 'fiber', amount: 4 },
    { title: 'Provisões para a trilha', key: 'berries', target: 5, reward: 'fish', amount: 2 },
    { title: 'Pedras para o caminho', key: 'stone', target: 8, reward: 'crystal', amount: 1 }
  ];
  const task = tasks[(state.day - 1) % tasks.length];
  state.daily = { ...task, progress: 0, claimed: false };
  renderJournal();
}

function toast(text) {
  const element = $('#toast');
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
}

function endGame(cause, message) {
  if (state.deathReason || state.currentEnding) return;
  state.deathReason = cause;
  state.running = false;
  state.paused = false;
  $('#game-ui').classList.add('hidden');
  $('#death-cause').textContent = cause;
  $('#death-message').textContent = message;
  $('#death-screen').classList.remove('hidden');
  saveGame();
}

function damagePlayer(amount, cause, message) {
  const player = state.player;
  player.hp = Math.max(0, player.hp - amount);
  if (player.hp === 0) endGame(cause, message);
  updateHud();
}

function questEvent(key, amount = 1) {
  const quest = QUESTS[state.quest];
  if (!quest || quest.key !== key || state.currentEnding) return;
  state.questProgress = Math.min(quest.goal, state.questProgress + amount);
  if (state.questProgress >= quest.goal) {
    toast(`Missão concluída: ${quest.title}`);
    state.quest = Math.min(QUESTS.length - 1, state.quest + 1);
    state.questProgress = 0;
    renderJournal();
  }
  updateHud();
  saveGame();
}

function dailyEvent(key, amount = 1) {
  const task = state.daily;
  if (!task || task.claimed || task.key !== key) return;
  task.progress = Math.min(task.target, task.progress + amount);
  if (task.progress >= task.target) toast('Tarefa diária pronta para resgate no diário.');
  renderJournal();
}

function resourceCount(key) {
  return state.player.inventory[key] || 0;
}

function hasMaterials(cost) {
  return Object.entries(cost).every(([key, count]) => resourceCount(key) >= count);
}

function spendMaterials(cost) {
  for (const [key, count] of Object.entries(cost)) state.player.inventory[key] -= count;
}

function isNearCamp() {
  const camp = state.objects.find(object => object.type === 'camp');
  return camp && Math.hypot(camp.x - state.player.x, camp.y - state.player.y) < 100;
}

function craft(itemId) {
  const recipe = RECIPES.find(item => item.id === itemId);
  if (!recipe) return;
  const player = state.player;
  if (['hut', 'raft', 'beacon'].includes(itemId) && !isNearCamp()) {
    toast('Construções maiores precisam ser feitas no acampamento.');
    return;
  }
  if (itemId !== 'meal' && itemId !== 'tonic' && player.tools[itemId]) {
    toast('Você já fabricou esse item.');
    return;
  }
  if (!hasMaterials(recipe.cost)) {
    toast('Ainda faltam materiais para essa receita.');
    return;
  }
  spendMaterials(recipe.cost);
  if (itemId === 'meal') player.food = Math.min(100, player.food + 35);
  else if (itemId === 'tonic') {
    player.hp = Math.min(100, player.hp + 30);
    player.water = Math.min(100, player.water + 30);
  } else if (itemId === 'hut') player.structures.push({ type: 'hut', x: player.x + 48, y: player.y, id: `hut-${Date.now()}` });
  else if (itemId === 'beacon') {
    const site = state.objects.find(object => object.type === 'beaconSite');
    if (site) site.type = 'beaconBuilt';
    else player.structures.push({ type: 'beaconBuilt', x: player.x + 54, y: player.y, id: 'beacon-built' });
  }
  else player.tools[itemId] = true;
  if (['axe', 'pickaxe', 'rod', 'hut', 'raft', 'beacon'].includes(itemId)) questEvent(itemId);
  toast(`${recipe.name} ${['hut', 'raft', 'beacon'].includes(itemId) ? 'construída' : 'fabricado'}.`);
  renderCrafting();
  updateHud();
  saveGame();
}

function interact() {
  if (state.deathReason || state.currentEnding || state.mode !== 'playing') return;
  const object = state.nearby;
  const player = state.player;
  if (!object) {
    toast('Nada por aqui. Explore um pouco mais.');
    return;
  }
  if (object.type === 'tree') {
    object.type = 'stump';
    object.solid = false;
    const amount = player.tools.axe ? 3 : 1;
    player.inventory.wood += amount;
    questEvent('wood', amount);
    dailyEvent('wood', amount);
    if (Math.random() < 0.055) {
      damagePlayer(48, 'Queda de árvore', 'Uma árvore caiu sobre você durante a coleta.');
      if (state.deathReason) return;
    }
    toast(`Madeira +${amount}`);
  } else if (object.type === 'rock') {
    object.type = 'rubble';
    object.solid = false;
    const amount = player.tools.pickaxe ? 3 : 1;
    player.inventory.stone += amount;
    questEvent('stone', amount);
    dailyEvent('stone', amount);
    toast(`Pedra +${amount}`);
  } else if (object.type === 'fiber' && object.ready) {
    object.ready = false;
    player.inventory.fiber++;
    questEvent('fiber');
    dailyEvent('fiber');
    toast('Fibra vegetal +1');
  } else if (object.type === 'berry' && object.ready) {
    object.ready = false;
    if (object.poisonous) {
      damagePlayer(58, 'Envenenamento', 'A fruta silvestre estava contaminada.');
      if (state.deathReason) return;
      toast('A fruta era venenosa. Você perdeu vida.');
    } else {
      player.inventory.berries++;
      player.food = Math.min(100, player.food + 8);
      questEvent('berries');
      dailyEvent('berries');
      toast('Frutas silvestres +1');
    }
    if (Math.random() < 0.09) {
      damagePlayer(42, 'Picada de cobra', 'Uma cobra escondida entre as folhas picou você.');
      if (state.deathReason) return;
      toast('Uma cobra se escondeu entre as folhas.');
    }
  } else if (object.type === 'fish' && object.ready) {
    if (!player.tools.rod) {
      toast('Você precisa fabricar uma vara de pesca.');
      return;
    }
    object.ready = false;
    player.inventory.fish++;
    player.food = Math.min(100, player.food + 12);
    questEvent('fish');
    dailyEvent('fish');
    toast('Peixe fresco +1');
  } else if (object.type === 'crystal' && object.ready) {
    if (!player.tools.pickaxe) {
      toast('Uma picareta pode extrair esse cristal.');
      return;
    }
    object.ready = false;
    player.inventory.crystal++;
    questEvent('crystal');
    dailyEvent('crystal');
    toast('Cristal da caverna +1');
  } else if (object.type === 'spring') {
    player.water = 100;
    recordDiscovery('nascente');
    questEvent('spring');
    toast('Água fresca. Sede restaurada.');
  } else if (object.type === 'wreck') {
    recordDiscovery('naufrágio');
    questEvent('wreck');
    player.inventory.fiber += 3;
    dailyEvent('fiber', 3);
    toast('Você encontrou cordas e fibras entre os destroços. Fibra +3');
  } else if (object.type === 'cave') {
    recordDiscovery('caverna');
    toast('A caverna guarda cristais. Leve uma picareta.');
  } else if (object.type === 'ruins') {
    recordDiscovery('ruínas');
    const amount = Math.min(3 - player.inventory.relics, 1);
    if (amount > 0) {
      player.inventory.relics += amount;
      questEvent('relics', amount);
      toast('Relíquia antiga recuperada.');
    } else toast('As ruínas já revelaram seus segredos.');
  } else if (object.type === 'camp') {
    openCrafting();
  } else if (object.type === 'hut') {
    state.day++;
    state.dayTime = 0;
    player.hp = 100;
    player.water = 100;
    player.food = 100;
    player.stamina = 100;
    player.inventory = { wood: 0, stone: 0, fiber: 0, berries: 0, fish: 0, crystal: 0, relics: player.inventory.relics };
    advanceResources();
    updateDailyTask();
    toast(`Você descansou. Dia ${state.day} começa com energia renovada.`);
  } else if (object.type === 'beaconBuilt') {
    showEndings();
  }
  updateHud();
  saveGame();
}

function recordDiscovery(name) {
  if (state.discoveries.includes(name)) return;
  state.discoveries.push(name);
  renderJournal();
  saveGame();
}

function advanceResources() {
  for (const object of state.objects) {
    if (['berry', 'fiber', 'fish'].includes(object.type)) object.ready = true;
  }
}

function completeDailyTask() {
  const task = state.daily;
  if (!task || task.claimed || task.progress < task.target) return;
  task.claimed = true;
  state.player.inventory[task.reward] += task.amount;
  toast(`Tarefa diária concluída: +${task.amount} ${RESOURCE_NAMES[task.reward].toLowerCase()}.`);
  renderJournal();
  saveGame();
}

function showEndings() {
  $('#game-ui').classList.add('hidden');
  $('#ending-screen').classList.remove('hidden');
  state.running = false;
  state.mode = 'ending';
}

function chooseEnding(ending) {
  const endings = {
    rescue: { title: 'O RESGATE', text: 'O sinal atravessa o nevoeiro. Um navio responde ao longe. A ilha fica para trás, mas suas histórias seguem com você.' },
    voyage: { title: 'ALÉM DO HORIZONTE', text: 'Você parte em sua jangada rumo ao desconhecido. O mar não promete nada, mas agora a escolha é sua.' },
    guardian: { title: 'GUARDIÃO DA ILHA', text: 'Você apaga o sinal e permanece. As trilhas, a nascente e as ruínas agora fazem parte da sua casa.' }
  };
  state.currentEnding = ending;
  state.running = false;
  state.mode = 'ending-complete';
  state.quest = QUESTS.length;
  state.questProgress = 0;
  if (!state.endings.includes(endings[ending].title)) state.endings.push(endings[ending].title);
  localStorage.setItem(`${SAVE_KEY}-endings`, JSON.stringify(state.endings));
  $('#ending-screen').classList.add('hidden');
  $('#ending-result-title').textContent = endings[ending].title;
  $('#ending-result-text').textContent = endings[ending].text;
  $('#ending-result').classList.remove('hidden');
  saveGame();
}

function updateHud() {
  const player = state.player;
  $('#hp-bar').style.width = `${player.hp}%`;
  $('#water-bar').style.width = `${player.water}%`;
  $('#food-bar').style.width = `${player.food}%`;
  $('#stamina-bar').style.width = `${player.stamina}%`;
  $('#hp-text').textContent = `${Math.ceil(player.hp)} / 100`;
  $('#water-text').textContent = `${Math.ceil(player.water)} / 100`;
  $('#food-text').textContent = `${Math.ceil(player.food)} / 100`;
  $('#stamina-text').textContent = `${Math.ceil(player.stamina)} / 100`;
  $('#wood-count').textContent = player.inventory.wood;
  $('#stone-count').textContent = player.inventory.stone;
  $('#day-label').textContent = `DIA ${String(state.day).padStart(2, '0')}`;
  const hour = Math.floor(6 + state.dayTime / DAY_LENGTH * 18) % 24;
  $('#clock-label').textContent = `${String(hour).padStart(2, '0')}:00`;
  $('#weather-label').textContent = state.weather.toUpperCase();
  $('#quest-count').textContent = `${String(Math.min(state.quest + 1, QUESTS.length)).padStart(2, '0')} / ${String(QUESTS.length).padStart(2, '0')}`;
  const quest = QUESTS[state.quest];
  $('#quest-title').textContent = quest ? quest.title : 'JORNADA CONCLUÍDA';
  $('#quest-description').textContent = quest ? quest.text : 'Escolha seu destino no farol.';
  $('#quest-objective-text').textContent = quest ? `${quest.key === 'wood' ? 'Madeira' : quest.key === 'stone' ? 'Pedra' : quest.key === 'fiber' ? 'Fibra' : quest.key === 'berries' ? 'Frutas' : quest.key === 'crystal' ? 'Cristais' : quest.key === 'relics' ? 'Relíquias' : quest.title}` : 'Finais disponíveis';
  $('#quest-progress-text').textContent = quest ? `${state.questProgress} / ${quest.goal}` : '3 destinos';
  $('#quest-progress-bar').style.width = quest ? `${state.questProgress / quest.goal * 100}%` : '100%';
  $('#coordinates').textContent = `X ${String(Math.round(player.x / 48)).padStart(3, '0')} · Y ${String(Math.round(player.y / 48)).padStart(3, '0')}`;
  $('#player-name-hud').textContent = player.name.toUpperCase();
  renderInventory();
}

function renderInventory() {
  $('#inventory-grid').innerHTML = RESOURCES.map(key => `<div class="inventory-item"><span>${RESOURCE_NAMES[key]}</span><b>${resourceCount(key)}</b></div>`).join('') +
    `<div class="inventory-item"><span>Machado</span><b>${state.player.tools.axe ? 'SIM' : 'NÃO'}</b></div>` +
    `<div class="inventory-item"><span>Picareta</span><b>${state.player.tools.pickaxe ? 'SIM' : 'NÃO'}</b></div>` +
    `<div class="inventory-item"><span>Vara de pesca</span><b>${state.player.tools.rod ? 'SIM' : 'NÃO'}</b></div>`;
}

function renderCrafting() {
  $('#recipe-list').innerHTML = RECIPES.map(recipe => {
    const owned = state.player.tools[recipe.id];
    const available = hasMaterials(recipe.cost) && (!['hut', 'raft', 'beacon'].includes(recipe.id) || isNearCamp()) && (!owned || ['meal', 'tonic'].includes(recipe.id));
    const cost = Object.entries(recipe.cost).map(([key, amount]) => `${RESOURCE_NAMES[key]} ${amount}`).join(' · ');
    return `<article class="recipe-row"><div><small>${recipe.group}</small><h3>${recipe.name}</h3><p>${recipe.detail}</p><span>${cost}</span></div><button class="craft-button" data-recipe="${recipe.id}" ${available ? '' : 'disabled'}>${owned ? 'FEITO' : 'CRIAR'}</button></article>`;
  }).join('');
  document.querySelectorAll('[data-recipe]').forEach(button => button.addEventListener('click', () => craft(button.dataset.recipe)));
}

function openCrafting() {
  renderCrafting();
  $('#crafting-panel').classList.remove('hidden');
  $('#inventory-panel').classList.add('hidden');
  $('#journal-panel').classList.add('hidden');
}

function closePanels() {
  for (const panel of document.querySelectorAll('.game-panel')) panel.classList.add('hidden');
}

function nearestObject() {
  let nearest = null;
  let distance = 78;
  for (const object of state.objects.concat(state.player.structures)) {
    const current = Math.hypot(object.x - state.player.x, object.y - state.player.y);
    if (current < distance) {
      nearest = object;
      distance = current;
    }
  }
  return nearest;
}

function interactionLabel(object) {
  if (!object) return '';
  const labels = { tree: 'CORTAR ÁRVORE', rock: 'QUEBRAR PEDRA', fiber: 'COLHER FIBRA', berry: object.poisonous ? 'EXAMINAR FRUTA SUSPEITA' : 'COLHER FRUTAS', fish: state.player.tools.rod ? 'PESCAR' : 'PRECISA DE VARA', crystal: state.player.tools.pickaxe ? 'MINERAR CRISTAL' : 'PRECISA DE PICARETA', spring: 'BEBER NA NASCENTE', wreck: 'INVESTIGAR NAUFRÁGIO', cave: 'EXPLORAR CAVERNA', ruins: 'EXPLORAR RUÍNAS', camp: 'ABRIR OFICINA', hut: 'DORMIR NA CABANA', beaconBuilt: 'ESCOLHER UM FINAL' };
  if (object.ready === false && ['fiber', 'berry', 'fish', 'crystal'].includes(object.type)) return 'JÁ COLETADO';
  return labels[object.type] || 'INTERAGIR';
}

function update(dt) {
  if (state.mode !== 'playing' || state.paused || state.deathReason || state.currentEnding) return;
  const player = state.player;
  const keys = state.keys;
  state.time += dt;
  state.dayTime += dt;
  state.weatherTimer += dt;
  if (state.dayTime >= DAY_LENGTH) {
    state.dayTime -= DAY_LENGTH;
    state.day++;
    advanceResources();
    updateDailyTask();
    toast(`Dia ${state.day}. Os recursos da ilha se renovaram.`);
    saveGame();
  }
  if (state.weatherTimer > 95) {
    state.weatherTimer = 0;
    state.weather = ['Brisa quente', 'Chuva passageira', 'Nevoeiro', 'Vento forte'][Math.floor(Math.random() * 4)];
  }
  let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  player.walking = false;
  const sprinting = (keys.shift || keys.shiftleft || keys.shiftright) && player.stamina > 0 && (dx || dy);
  const speed = sprinting ? 200 : 125;
  if (sprinting) player.stamina = Math.max(0, player.stamina - dt * 17);
  else player.stamina = Math.min(100, player.stamina + dt * 10);
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
    player.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
    const targetX = player.x + dx * speed * dt;
    const targetY = player.y + dy * speed * dt;
    const onIsland = islandContains(targetX, targetY, 28);
    if (!onIsland && !player.tools.raft) {
      player.walking = false;
    } else if (player.tools.raft && (targetX < 48 || targetX > WORLD.width - 48 || targetY < 48 || targetY > WORLD.height - 48)) {
      endGame('Afogamento', 'A jangada foi levada para além do limite seguro do mapa.');
      return;
    } else if (!state.objects.some(object => object.solid && Math.hypot(object.x - targetX, object.y - targetY) < object.r + 13)) {
      player.x = targetX;
      player.y = targetY;
      player.walking = true;
    }
  }
  player.water = Math.max(0, player.water - dt * (state.weather === 'Vento forte' ? 0.095 : 0.07));
  player.food = Math.max(0, player.food - dt * 0.055);
  if (player.water === 0) damagePlayer(dt * 1.15, 'Desidratação', 'Você ficou sem água e não encontrou a nascente a tempo.');
  else if (player.food === 0) damagePlayer(dt * 0.9, 'Inanição', 'As provisões acabaram antes que você encontrasse alimento.');
  if (state.deathReason) return;
  if (player.tools.raft && !islandContains(player.x, player.y)) {
    state.seaTime += dt;
    if (state.seaTime > 75) {
      endGame('Afogamento', 'Você passou tempo demais no mar aberto e a jangada não resistiu.');
      return;
    }
  } else state.seaTime = 0;
  state.nearby = nearestObject();
  const prompt = $('#interaction-prompt');
  if (state.nearby) {
    prompt.classList.remove('hidden');
    $('#prompt-text').textContent = interactionLabel(state.nearby);
  } else prompt.classList.add('hidden');
  state.camera.x += (player.x - 480 - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (player.y - 270 - state.camera.y) * Math.min(1, dt * 5);
  state.camera.x = Math.max(0, Math.min(WORLD.width - 960, state.camera.x));
  state.camera.y = Math.max(0, Math.min(WORLD.height - 540, state.camera.y));
  updateHud();
}

function drawMenuBackdrop() {
  ctx.fillStyle = '#7bb3a1';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#d6d59e';
  ctx.fillRect(0, 0, 960, 210);
  ctx.fillStyle = '#e7bd69';
  ctx.beginPath(); ctx.arc(765, 118, 54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a9a7e';
  ctx.beginPath(); ctx.moveTo(0, 278); ctx.lineTo(150, 190); ctx.lineTo(290, 262); ctx.lineTo(465, 176); ctx.lineTo(660, 276); ctx.lineTo(820, 205); ctx.lineTo(960, 266); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
  ctx.fillStyle = '#396c64';
  ctx.fillRect(0, 310, 960, 230);
  ctx.fillStyle = '#4a8d7d';
  for (let i = 0; i < 16; i++) ctx.fillRect((i * 83 + 27) % 960, 336 + (i % 4) * 38, 45, 3);
  for (let i = 0; i < 9; i++) {
    const x = i * 118 + 24;
    ctx.fillStyle = '#60462e'; ctx.fillRect(x + 24, 265, 12, 156);
    ctx.fillStyle = i % 2 ? '#32614b' : '#3d7654';
    ctx.fillRect(x, 232, 62, 62); ctx.fillRect(x - 10, 256, 82, 44);
    ctx.fillStyle = '#629458'; ctx.fillRect(x + 12, 238, 28, 13);
  }
  ctx.fillStyle = '#e8d391';
  for (let i = 0; i < 28; i++) ctx.fillRect((i * 137) % 950, 448 + (i % 3) * 21, 3, 3);
}

function drawIsland() {
  ctx.fillStyle = '#1b4b54';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = '#89ad75';
  ctx.beginPath(); ctx.ellipse(WORLD.centerX, WORLD.centerY, WORLD.radiusX, WORLD.radiusY, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d7bd79'; ctx.lineWidth = 18; ctx.stroke();
  ctx.fillStyle = '#7a9e69';
  ctx.beginPath(); ctx.ellipse(1430, 510, 280, 130, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#638c6d';
  ctx.beginPath(); ctx.ellipse(1120, 1390, 320, 120, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = ['#e8bf64', '#df775c', '#a5c36a'][i % 3];
    ctx.fillRect(240 + (i * 137) % 1830, 290 + (i * 71) % 1180, 3, 3);
  }
}

function drawTree(object) {
  const { x, y } = object;
  const sway = Math.round(Math.sin(state.time * 1.4 + x * 0.03) * 1.2);
  const leaf = (color, left, top, width, height = 4) => { ctx.fillStyle = color; ctx.fillRect(x + left + sway, y + top, width, height); };
  ctx.fillStyle = 'rgba(30,30,18,.2)'; ctx.fillRect(x - 18, y + 20, 36, 5);
  ctx.fillStyle = '#241910'; ctx.fillRect(x - 10, y - 6, 20, 30); ctx.fillRect(x - 18, y + 15, 14, 7); ctx.fillRect(x + 4, y + 15, 14, 7);
  ctx.fillStyle = '#80502f'; ctx.fillRect(x - 7, y - 4, 14, 25); ctx.fillRect(x - 14, y + 16, 12, 4); ctx.fillRect(x + 3, y + 16, 12, 4);
  ctx.fillStyle = '#bd7040'; ctx.fillRect(x - 4, y - 1, 4, 15); ctx.fillRect(x - 11, y + 16, 5, 3);
  ctx.fillStyle = '#573b27'; ctx.fillRect(x + 3, y + 5, 4, 10); ctx.fillRect(x - 1, y + 11, 3, 4);
  leaf('#11170f', -8, -58, 16); leaf('#11170f', -16, -54, 32); leaf('#11170f', -22, -50, 44); leaf('#11170f', -26, -46, 52, 8); leaf('#11170f', -30, -38, 60, 8); leaf('#11170f', -34, -30, 68, 12); leaf('#11170f', -32, -18, 64, 8); leaf('#11170f', -28, -10, 56, 8); leaf('#11170f', -20, -2, 40, 4);
  leaf('#76b552', -8, -54, 16); leaf('#86bf57', -16, -50, 32); leaf('#91c65b', -20, -46, 40, 8); leaf('#83bb55', -24, -38, 48, 8); leaf('#9bc85b', -28, -30, 56, 12); leaf('#7eb552', -28, -18, 56, 8); leaf('#5d9e4c', -24, -10, 48, 8); leaf('#397f45', -16, -2, 32, 4);
  leaf('#b8d650', -4, -50, 12); leaf('#b6d34e', -17, -41, 12); leaf('#b8d653', 8, -37, 12); leaf('#c4d950', -4, -29, 8); leaf('#b5d24e', -25, -25, 12); leaf('#b1d04b', 14, -21, 12); leaf('#a8cc4d', -9, -13, 10); leaf('#397f45', -23, -33, 6); leaf('#397f45', 13, -29, 6); leaf('#397f45', -3, -21, 5); leaf('#2e7542', 9, -9, 8);
}

function drawObject(object) {
  const { x, y, type } = object;
  ctx.save();
  if (type === 'tree') drawTree(object);
  else if (type === 'stump') { ctx.fillStyle = '#68442e'; ctx.fillRect(x - 10, y, 20, 18); ctx.fillStyle = '#d19c55'; ctx.fillRect(x - 9, y, 18, 5); }
  else if (type === 'rock' || type === 'rubble') { ctx.fillStyle = '#354344'; ctx.fillRect(x - 15, y - 8, 30, 24); ctx.fillStyle = '#788578'; ctx.fillRect(x - 10, y - 12, 20, 6); ctx.fillRect(x - 7, y - 4, 5, 4); }
  else if (type === 'fiber' && object.ready) { ctx.fillStyle = '#436d45'; ctx.fillRect(x - 12, y, 24, 14); ctx.fillStyle = '#9cae55'; ctx.fillRect(x - 8, y - 10, 4, 14); ctx.fillRect(x, y - 14, 4, 18); ctx.fillRect(x + 7, y - 8, 4, 12); }
  else if (type === 'berry' && object.ready) { ctx.fillStyle = '#356852'; ctx.fillRect(x - 15, y - 2, 30, 20); ctx.fillStyle = object.poisonous ? '#765583' : '#bd5c54'; ctx.fillRect(x - 10, y - 8, 8, 8); ctx.fillStyle = object.poisonous ? '#9b6eb1' : '#e27357'; ctx.fillRect(x + 3, y - 5, 8, 8); }
  else if (type === 'fish' && object.ready) { ctx.fillStyle = '#d3c16f'; ctx.fillRect(x - 8, y - 2, 14, 5); ctx.fillRect(x + 6, y - 5, 5, 3); }
  else if (type === 'crystal' && object.ready) { ctx.fillStyle = '#222c35'; ctx.fillRect(x - 9, y + 5, 18, 6); ctx.fillStyle = '#75c4c5'; ctx.fillRect(x - 6, y - 9, 6, 14); ctx.fillRect(x + 1, y - 5, 6, 10); }
  else if (type === 'spring') { ctx.fillStyle = '#73c4bd'; ctx.fillRect(x - 29, y - 12, 58, 24); ctx.fillStyle = '#c7e4c3'; ctx.fillRect(x - 17 + Math.sin(state.time * 3) * 2, y - 5, 20, 4); ctx.fillStyle = '#7a6041'; ctx.fillRect(x - 35, y + 11, 70, 8); }
  else if (type === 'camp') { ctx.strokeStyle = '#74442e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 29, y + 20); ctx.lineTo(x, y - 22); ctx.lineTo(x + 29, y + 20); ctx.stroke(); ctx.fillStyle = '#df7c49'; ctx.fillRect(x - 7, y + 6, 14, 12); ctx.fillStyle = '#f1c76b'; ctx.fillRect(x - 3, y + 4 - Math.sin(state.time * 12), 6, 11); }
  else if (type === 'wreck') { ctx.strokeStyle = '#673f32'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x - 30, y + 15); ctx.lineTo(x + 22, y - 22); ctx.moveTo(x - 13, y - 29); ctx.lineTo(x + 13, y + 20); ctx.stroke(); ctx.fillStyle = '#a76742'; ctx.fillRect(x - 28, y + 8, 56, 11); }
  else if (type === 'cave') { ctx.fillStyle = '#566651'; ctx.beginPath(); ctx.ellipse(x, y, 37, 38, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1e3031'; ctx.beginPath(); ctx.arc(x, y + 10, 18, Math.PI, 0); ctx.fill(); }
  else if (type === 'ruins') { ctx.fillStyle = '#75684c'; ctx.fillRect(x - 30, y - 20, 12, 42); ctx.fillRect(x + 17, y - 14, 12, 36); ctx.fillRect(x - 28, y - 20, 54, 7); ctx.fillStyle = '#d8bf70'; ctx.fillRect(x - 5, y - 3, 10, 10); }
  else if (type === 'hut') { ctx.fillStyle = '#6e482f'; ctx.fillRect(x - 25, y - 3, 50, 30); ctx.fillStyle = '#37372d'; ctx.beginPath(); ctx.moveTo(x - 34, y); ctx.lineTo(x, y - 33); ctx.lineTo(x + 34, y); ctx.fill(); ctx.fillStyle = '#c28a4c'; ctx.fillRect(x - 6, y + 9, 12, 18); }
  else if (type === 'beaconSite' || type === 'beaconBuilt') { ctx.fillStyle = '#c6b17a'; ctx.fillRect(x - 12, y - 23, 24, 44); ctx.fillStyle = type === 'beaconBuilt' ? '#eddb93' : '#8f7c56'; ctx.fillRect(x - 8, y - 32, 16, 12); if (type === 'beaconBuilt') { ctx.fillStyle = '#f1c76b'; ctx.fillRect(x - 3, y - 41, 6, 8); } }
  ctx.restore();
}

function makePlayerSprite(direction, frame) {
  const sprite = document.createElement('canvas');
  sprite.width = 16; sprite.height = 20;
  const paintContext = sprite.getContext('2d');
  const paint = (color, x, y, width, height) => { paintContext.fillStyle = color; paintContext.fillRect(x, y, width, height); };
  const dark = '#253c35', green = '#286447', light = '#478a55', hair = '#503536', skin = '#e9b99b', red = '#cb4c60', shade = '#963b53', pants = '#433b48', boot = '#382f3b';
  paint(dark, 2, 0, 12, 9); paint(green, 3, 1, 10, 7); paint(light, 5, 1, 6, 3);
  if (direction === 'up') { paint(hair, 4, 6, 8, 3); paint(green, 2, 6, 3, 3); paint(light, 5, 4, 6, 2); }
  else if (direction === 'right') { paint(hair, 4, 3, 6, 2); paint(skin, 8, 4, 4, 5); paint(hair, 7, 3, 3, 3); paint(dark, 10, 5, 1, 1); paint(hair, 3, 5, 3, 4); }
  else { paint(hair, 4, 3, 8, 2); paint(hair, 3, 5, 2, 4); paint(hair, 11, 5, 2, 4); paint(skin, 5, 5, 6, 4); paint(dark, 6, 6, 1, 1); paint(dark, 10, 6, 1, 1); paint(hair, 5, 3, 6, 1); }
  paint(dark, 4, 9, 8, 7); paint(red, 5, 9, 6, 6); paint(shade, 4, 13, 8, 2); paint('#e7807a', 6, 10, 1, 2);
  const offset = frame ? 1 : 0;
  paint(dark, 2, 10 + offset, 3, 4); paint(red, 2, 10 + offset, 2, 3); paint(skin, 2, 14 + offset, 2, 2);
  paint(dark, 11, 10 + (1 - offset), 3, 4); paint(red, 12, 10 + (1 - offset), 2, 3); paint(skin, 12, 14 + (1 - offset), 2, 2);
  const leftFoot = frame ? 5 : 2, rightFoot = frame ? 8 : 11;
  paint(dark, leftFoot, 15, 3, 4); paint(pants, leftFoot + 1, 15, 1, 3); paint(dark, rightFoot, 15, 3, 4); paint(pants, rightFoot + 1, 15, 1, 3);
  paint(boot, leftFoot - 1, 18, 4, 2); paint(red, leftFoot - 1, 18, 2, 1); paint(boot, rightFoot - 1, 18, 4, 2); paint(red, rightFoot + 1, 18, 2, 1);
  return sprite;
}
const sprites = { down: [makePlayerSprite('down', 0), makePlayerSprite('down', 1)], up: [makePlayerSprite('up', 0), makePlayerSprite('up', 1)], right: [makePlayerSprite('right', 0), makePlayerSprite('right', 1)] };

function drawPlayer() {
  const player = state.player;
  const frame = player.walking ? Math.floor(state.time * 8) % 2 : 0;
  const left = player.dir === 'left';
  const direction = left || player.dir === 'right' ? 'right' : player.dir;
  const sprite = sprites[direction][frame];
  ctx.fillStyle = 'rgba(25,45,35,.28)'; ctx.fillRect(player.x - 13, player.y + 17, 26, 6);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (player.dir === 'right') { ctx.translate(player.x * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(sprite, player.x - 16, player.y - 20, 32, 40);
  if (left) { ctx.restore(); ctx.save(); ctx.translate(player.x * 2, 0); ctx.scale(-1, 1); ctx.drawImage(sprite, player.x - 16, player.y - 20, 32, 40); }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, 960, 540);
  if (state.mode === 'menu' || state.mode === 'new-game' || state.mode === 'collection' || state.mode === 'options') { drawMenuBackdrop(); return; }
  ctx.save(); ctx.translate(-state.camera.x, -state.camera.y); drawIsland();
  const sorted = state.objects.concat(state.player.structures).slice().sort((a, b) => a.y - b.y);
  for (const object of sorted) drawObject(object);
  drawPlayer();
  ctx.restore();
  const daylight = Math.max(0, Math.sin((state.dayTime / DAY_LENGTH) * Math.PI * 2));
  if (daylight < 0.18) { ctx.fillStyle = `rgba(10,20,42,${0.23 - daylight * 0.8})`; ctx.fillRect(0, 0, 960, 540); }
  ctx.fillStyle = 'rgba(15,32,31,.72)'; ctx.fillRect(440, 87, 80, 23); ctx.fillStyle = '#e1c979'; ctx.font = '10px Barlow Condensed'; ctx.textAlign = 'center'; ctx.fillText('N  ·  SELVA  ·  S', 480, 102);
}

function loop(now) {
  if (!state.running || state.paused || state.deathReason || state.currentEnding) return;
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  update(dt);
  if (!state.deathReason) draw();
  if (state.running && !state.paused) requestAnimationFrame(loop);
}

function renderJournal() {
  const quest = QUESTS[state.quest];
  $('#journal-main').innerHTML = `<div class="journal-current"><small>CAPÍTULO ${String(state.quest + 1).padStart(2, '0')} / ${QUESTS.length}</small><h3>${quest ? quest.title : 'A ILHA É SUA'}</h3><p>${quest ? quest.text : 'Você concluiu a campanha principal. Continue explorando ou escolha um final no farol.'}</p><div class="journal-meter"><i style="width:${quest ? state.questProgress / quest.goal * 100 : 100}%"></i></div><strong>${quest ? `${state.questProgress} / ${quest.goal}` : 'CAMPANHA CONCLUÍDA'}</strong></div>`;
  $('#journal-optional').innerHTML = state.discoveries.map(item => `<span class="journal-tag">${item}</span>`).join('') || '<span class="journal-tag">Nenhuma descoberta</span>';
  const task = state.daily;
  $('#journal-daily').innerHTML = task ? `<small>TAREFA DO DIA ${state.day}</small><h3>${task.title}</h3><p>${task.progress} / ${task.target} · recompensa: ${task.amount} ${RESOURCE_NAMES[task.reward].toLowerCase()}</p><button id="claim-daily" class="secondary-button" ${task.progress < task.target || task.claimed ? 'disabled' : ''}>${task.claimed ? 'RESGATADA' : 'RESGATAR'}</button>` : '<p>As tarefas do dia aparecerão aqui.</p>';
  $('#claim-daily')?.addEventListener('click', completeDailyTask);
}

function togglePanel(selector) {
  const panel = $(selector);
  const shouldOpen = panel.classList.contains('hidden');
  closePanels();
  if (shouldOpen) panel.classList.remove('hidden');
  if (selector === '#crafting-panel' && shouldOpen) renderCrafting();
  if (selector === '#journal-panel' && shouldOpen) renderJournal();
  if (selector === '#inventory-panel' && shouldOpen) renderInventory();
}

function enterEndingScene() {
  $('#ending-screen').classList.add('hidden');
  $('#ending-result').classList.add('hidden');
  state.currentEnding = null;
  state.mode = 'menu';
  backToMenu();
}

$('#continue-button').addEventListener('click', () => { if (!loadGame()) toast('Nenhum diário salvo foi encontrado.'); });
$('#new-game-button').addEventListener('click', () => openMenuScreen('#new-game-screen', 'main-menu'));
$('#collection-button').addEventListener('click', () => { updateMenu(); openMenuScreen('#collection-screen'); });
$('#options-button').addEventListener('click', () => openMenuScreen('#options-screen'));
$('#begin-game-button').addEventListener('click', newGame);
$('#back-main-from-new').addEventListener('click', () => openMenuScreen('#main-menu'));
$('#back-main-from-collection').addEventListener('click', () => openMenuScreen('#main-menu'));
$('#back-main-from-options').addEventListener('click', () => openMenuScreen('#main-menu'));
$('#journal-button').addEventListener('click', () => togglePanel('#journal-panel'));
$('#inventory-button').addEventListener('click', () => togglePanel('#inventory-panel'));
$('#crafting-button').addEventListener('click', () => togglePanel('#crafting-panel'));
document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', closePanels));
$('#pause-button').addEventListener('click', () => { state.paused = true; $('#pause-screen').classList.remove('hidden'); });
$('#resume-button').addEventListener('click', () => { state.paused = false; $('#pause-screen').classList.add('hidden'); state.last = performance.now(); requestAnimationFrame(loop); });
$('#save-button').addEventListener('click', () => { saveGame(); toast('Diário salvo.'); });
$('#pause-save-button').addEventListener('click', () => { saveGame(); toast('Diário salvo.'); });
$('#main-menu-button').addEventListener('click', () => { saveGame(); backToMenu(); });
$('#death-menu-button').addEventListener('click', () => { state.deathReason = null; backToMenu(); });
$('#restart-button').addEventListener('click', () => location.reload());
$('#ending-rescue').addEventListener('click', () => chooseEnding('rescue'));
$('#ending-voyage').addEventListener('click', () => chooseEnding('voyage'));
$('#ending-guardian').addEventListener('click', () => chooseEnding('guardian'));
$('#final-menu-button').addEventListener('click', enterEndingScene);
$('#setting-volume').addEventListener('input', event => { $('#volume-value').textContent = `${event.target.value}%`; localStorage.setItem(`${SAVE_KEY}-volume`, event.target.value); });
$('#setting-motion').addEventListener('change', event => document.body.classList.toggle('reduced-motion', event.target.checked));

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  state.keys[key] = true;
  if (key === 'escape') {
    if (state.paused) { state.paused = false; $('#pause-screen').classList.add('hidden'); state.last = performance.now(); requestAnimationFrame(loop); }
    else if (state.mode === 'playing' && !state.deathReason) { state.paused = true; $('#pause-screen').classList.remove('hidden'); }
    else if (state.mode !== 'playing') backToMenu();
    return;
  }
  if (state.mode !== 'playing' || event.repeat) return;
  if (key === 'e') interact();
  if (key === 'i') togglePanel('#inventory-panel');
  if (key === 'c') togglePanel('#crafting-panel');
  if (key === 'j') togglePanel('#journal-panel');
  if (key === 'm') { state.paused = true; $('#pause-screen').classList.remove('hidden'); }
  if (/^[1-8]$/.test(key)) craft(RECIPES[Number(key) - 1].id);
});
window.addEventListener('keyup', event => { state.keys[event.key.toLowerCase()] = false; });
document.querySelectorAll('.touch-controls button').forEach(button => {
  button.addEventListener('pointerdown', () => { state.keys[button.dataset.key.toLowerCase()] = true; if (button.dataset.key === 'e') interact(); });
  button.addEventListener('pointerup', () => { state.keys[button.dataset.key.toLowerCase()] = false; });
  button.addEventListener('pointerleave', () => { state.keys[button.dataset.key.toLowerCase()] = false; });
});
window.addEventListener('resize', () => {
  const scale = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  canvas.style.width = `${960 * scale}px`;
  canvas.style.height = `${540 * scale}px`;
});

const savedVolume = localStorage.getItem(`${SAVE_KEY}-volume`) || '70';
$('#setting-volume').value = savedVolume;
$('#volume-value').textContent = `${savedVolume}%`;
updateMenu();
renderJournal();
updateHud();
window.dispatchEvent(new Event('resize'));
draw();
