import * as THREE from 'three';
import { World, BLOCK } from './engine/world.js';
import { buildAtlas } from './engine/textures.js';
import { Player } from './engine/player.js';
import { Input } from './engine/input.js';
import { raycastVoxel } from './engine/raycast.js';
import { standingBlock } from './engine/physics.js';
import { LEVELS } from './game/levels.js';
import { generateLevel, randomOpenSpot, placePortal, makeRng } from './game/levelgen.js';
import { Enemy } from './game/enemies.js';
import { ItemManager } from './game/items.js';
import { Hud } from './ui/hud.js';
import { Sfx } from './audio/sounds.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'bkc.unlocked';

/* ---------- setup básico ---------- */

const canvas = $('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
const input = new Input(canvas);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, input.isTouch ? 1.25 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 200);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const hud = new Hud();
const sfx = new Sfx();
const atlas = buildAtlas();

const ambient = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambient);
const playerLight = new THREE.PointLight(0xffe9b0, 8, 9, 1.6);
scene.add(playerLight);

/* ---------- estado do jogo ---------- */

let state = 'menu'; // menu | intro | playing | dead | victory
let levelIndex = 0;
let level = null;
let world = null;
let levelData = null;
let player = null;
let items = null;
let enemies = [];
let collected = 0;
let portalOpen = false;
let spawnTimer = 0;
let attackCd = 0;
let hazardTick = 0;
let stepTimer = 0;
let flickerT = 0;
let bossRef = null;
let runStats = { kills: 0, deaths: 0, start: 0 };
let spotRng = makeRng(Date.now() % 100000);

const unlocked = () => Math.min(LEVELS.length - 1, parseInt(localStorage.getItem(SAVE_KEY) || '0', 10) || 0);
const saveUnlock = (i) => { if (i > unlocked()) localStorage.setItem(SAVE_KEY, String(i)); };

/* ---------- menu ---------- */

function buildMenu() {
  const holder = $('level-buttons');
  holder.innerHTML = '';
  const max = unlocked();
  for (const lv of LEVELS) {
    const b = document.createElement('button');
    b.className = 'btn';
    const locked = lv.id > max;
    b.disabled = locked;
    b.innerHTML = locked
      ? `🔒 ${lv.tag}<span class="lvl-sub">alcance o nível anterior para abrir</span>`
      : `${lv.tag} — ${lv.name}<span class="lvl-sub">${lv.objectiveCount} ${lv.objectiveCount > 1 ? lv.objectiveNamePlural : lv.objectiveName}${lv.boss ? ' · CHEFE' : ''}</span>`;
    if (!locked) b.addEventListener('click', () => { sfx.init(); showIntro(lv.id); });
    holder.appendChild(b);
  }
  $('menu-note').textContent = input.isTouch
    ? 'Celular: joystick à esquerda para andar (empurre até a borda para correr), arraste à direita para olhar, botões para pular, atacar, colocar bloco e beber.'
    : 'PC: WASD anda · Shift corre · Espaço pula · clique ataca/quebra · botão direito coloca bloco · F bebe Água de Amêndoas.';
}

function showOverlay(id) {
  for (const o of ['menu', 'intro', 'death', 'victory']) $(o).classList.toggle('hidden', o !== id);
  if (!id) for (const o of ['menu', 'intro', 'death', 'victory']) $(o).classList.add('hidden');
}

function showIntro(i) {
  levelIndex = i;
  const lv = LEVELS[i];
  state = 'intro';
  input.disable();
  $('intro-tag').textContent = lv.tag;
  $('intro-title').textContent = lv.name;
  $('intro-desc').textContent = lv.desc;
  $('intro-obj').textContent = lv.boss
    ? `${lv.objectiveIcon} Objetivo: derrote o Guardião do Vazio e entre no buraco.`
    : `${lv.objectiveIcon} Objetivo: colete ${lv.objectiveCount} ${lv.objectiveNamePlural} e entre no buraco escuro.`;
  $('intro-tip').textContent = `💡 ${lv.tip}`;
  showOverlay('intro');
  hud.hide();
}

/* ---------- carregar nível ---------- */

function clearLevel() {
  if (world) { world.dispose(); world = null; }
  if (items) { items.clear(); items = null; }
  for (const e of enemies) scene.remove(e.mesh);
  enemies = [];
  bossRef = null;
}

function loadLevel(i) {
  clearLevel();
  level = LEVELS[i];
  world = new World(scene, level.size.x, level.size.y, level.size.z, level.palette, atlas);
  levelData = generateLevel(world, level);
  world.buildAll();

  scene.fog = new THREE.Fog(level.fog.color, level.fog.near, level.fog.far);
  renderer.setClearColor(level.fog.color);
  ambient.color.setHex(level.ambient);
  ambient.intensity = level.ambientIntensity;
  playerLight.color.setHex(level.playerLight.color);
  playerLight.intensity = level.playerLight.intensity;
  playerLight.distance = level.playerLight.distance;

  player = new Player(camera, world);
  player.teleport(levelData.spawn.x, levelData.spawn.y + 0.1, levelData.spawn.z);
  player.blocks = 4;
  player.water = 1;

  items = new ItemManager(scene);
  for (const s of levelData.items) items.add('objective', s.x, s.y, s.z);
  for (const s of levelData.waters) items.add('water', s.x, s.y, s.z);

  collected = 0;
  portalOpen = false;
  spawnTimer = 3;
  attackCd = 0;
  runStats.start = performance.now();

  for (let k = 0; k < level.initialEnemies; k++) spawnEnemy(true);
  if (level.boss) spawnBoss();

  hud.setWeapon(level.weapon);
  updateObjectiveText();
  hud.show();
  sfx.startHum(100 + i * 14);
  state = 'playing';
  input.enable();
  input.requestPointerLock();
}

function updateObjectiveText() {
  if (level.boss) {
    hud.setObjective(bossRef && !bossRef.dead
      ? `💀 Guardião do Vazio — ${Math.max(0, Math.ceil(bossRef.hp))} HP`
      : '🕳️ O buraco se abriu. ENTRE.');
  } else if (portalOpen) {
    hud.setObjective('🕳️ Ache o buraco escuro e ENTRE nele!');
  } else {
    hud.setObjective(`${level.objectiveIcon} ${level.objectiveNamePlural}: ${collected}/${level.objectiveCount}`);
  }
}

/* ---------- inimigos ---------- */

function pickEnemyType() {
  const list = level.enemies;
  let total = 0;
  for (const e of list) total += e.weight;
  let r = Math.random() * total;
  for (const e of list) { r -= e.weight; if (r <= 0) return e.type; }
  return list[0].type;
}

function spawnEnemy(initial = false, nearPos = null, forceType = null) {
  let spot = null;
  for (let t = 0; t < 30 && !spot; t++) {
    const s = randomOpenSpot(world, spotRng, 40);
    if (!s) break;
    const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
    if (nearPos) {
      if (Math.hypot(s.x - nearPos.x, s.z - nearPos.z) < 14 && d > 5) spot = s;
    } else if (d > (initial ? 14 : 12) && d < 55) spot = s;
  }
  if (!spot) return;
  const e = new Enemy(forceType || pickEnemyType(), spot.x, spot.y + 0.1, spot.z);
  scene.add(e.mesh);
  enemies.push(e);
}

function spawnBoss() {
  const cx = world.sx / 2, cz = world.sz / 2;
  bossRef = new Enemy('boss', cx, 1.1, cz);
  scene.add(bossRef.mesh);
  enemies.push(bossRef);
}

const inDark = (x, z) => {
  if (!levelData.darkZones) return false;
  for (const d of levelData.darkZones)
    if (Math.hypot(x - d.x, z - d.z) < d.r) return true;
  return false;
};

/* ---------- combate e blocos ---------- */

function tryAttack() {
  if (attackCd > 0) return;
  attackCd = level.weapon.cooldown;
  sfx.swing();
  const eye = player.eyePos();
  const dir = player.lookDir();

  // primeiro tenta acertar um monstro no alcance e no cone de mira
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    const center = e.pos.clone();
    center.y += e.cfg.size.h * 0.55;
    const to = center.sub(eye);
    const d = to.length();
    if (d > level.weapon.range + (e.cfg.boss ? 1.2 : 0.4)) continue;
    to.normalize();
    if (to.dot(dir) < 0.62) continue;
    if (d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    const died = best.takeDamage(level.weapon.damage, player.pos);
    sfx.hitEnemy();
    if (died) onEnemyDeath(best);
    if (level.boss) updateObjectiveText();
    return;
  }

  // senão, minera o bloco mirado
  const hit = raycastVoxel(world, eye, dir, level.weapon.range + 0.6);
  if (hit) {
    const broke = world.hitBlock(hit.x, hit.y, hit.z, level.weapon.damage);
    if (broke) {
      sfx.breakBlock();
      if (player.blocks < 30) player.blocks++;
      if (broke === BLOCK.CRATE && Math.random() < 0.3)
        items.add('water', hit.x + 0.5, hit.y, hit.z + 0.5);
      world.rebuildDirty();
    } else {
      sfx.hitBlock();
    }
  }
}

function onEnemyDeath(e) {
  scene.remove(e.mesh);
  enemies = enemies.filter((x) => x !== e);
  runStats.kills++;
  sfx.enemyDie();
  if (Math.random() < 0.25 && !e.cfg.boss)
    items.add('water', e.pos.x, Math.floor(e.pos.y), e.pos.z);
  if (e.cfg.boss) {
    placePortal(world, levelData.portal);
    world.rebuildDirty();
    portalOpen = true;
    hud.showMessage('🕳️ O GUARDIÃO CAIU. O buraco da fuga se abriu!');
    sfx.portal();
    updateObjectiveText();
  }
}

function tryPlaceBlock() {
  if (player.blocks <= 0) { hud.showMessage('sem blocos — quebre paredes ou caixas 🧱'); return; }
  const eye = player.eyePos();
  const dir = player.lookDir();
  const hit = raycastVoxel(world, eye, dir, 4.2);
  if (!hit || !hit.prev) return;
  const { x, y, z } = hit.prev;
  if (!world.inBounds(x, y, z) || world.get(x, y, z) !== BLOCK.AIR) return;
  // não colocar dentro do próprio corpo
  const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
  if (Math.floor(px) === x && Math.floor(pz) === z && y >= Math.floor(py) && y <= Math.floor(py + 1.7)) return;
  world.set(x, y, z, BLOCK.PLACED);
  world.rebuildDirty();
  player.blocks--;
  sfx.place();
}

function drinkWater() {
  if (player.water <= 0) { hud.showMessage('sem Água de Amêndoas 🥤'); return; }
  player.water--;
  player.hp = Math.min(player.maxHp, player.hp + 35);
  player.sanity = Math.min(100, player.sanity + 40);
  sfx.drink();
  hud.showMessage('a Água de Amêndoas acalma a sua mente (+vida +sanidade)');
}

/* ---------- morte / vitória / progressão ---------- */

function onPlayerDeath(causeText) {
  state = 'dead';
  runStats.deaths++;
  input.disable();
  sfx.stopHum();
  sfx.death();
  $('death-cause').textContent = causeText;
  showOverlay('death');
  hud.hide();
}

function nextLevel() {
  sfx.portal();
  sfx.stopHum();
  if (levelIndex >= LEVELS.length - 1) {
    state = 'victory';
    input.disable();
    sfx.victory();
    const mins = Math.floor((performance.now() - runStats.start) / 60000);
    $('victory-stats').textContent =
      `monstros destruídos: ${runStats.kills} · mortes: ${runStats.deaths} · tempo no último nível: ${mins} min`;
    showOverlay('victory');
    hud.hide();
    saveUnlock(LEVELS.length - 1);
    return;
  }
  saveUnlock(levelIndex + 1);
  showIntro(levelIndex + 1);
}

/* ---------- botões ---------- */

$('intro-start').addEventListener('click', () => {
  sfx.init();
  showOverlay(null);
  loadLevel(levelIndex);
});
$('death-retry').addEventListener('click', () => { sfx.init(); showIntro(levelIndex); showOverlay(null); loadLevel(levelIndex); });
$('death-menu').addEventListener('click', () => { state = 'menu'; clearLevel(); buildMenu(); showOverlay('menu'); });
$('victory-menu').addEventListener('click', () => { state = 'menu'; clearLevel(); buildMenu(); showOverlay('menu'); });

/* ---------- loop principal ---------- */

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());

  if (state !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  /* jogador */
  player.update(dt, input);

  // passos
  const hspeed = Math.hypot(player.vel.x, player.vel.z);
  if (player.onGround && hspeed > 1) {
    stepTimer -= dt * hspeed;
    if (stepTimer <= 0) { stepTimer = 2.4; sfx.step(); }
  }

  /* ações */
  if (attackCd > 0) attackCd -= dt;
  if (input.attackHeld) tryAttack();
  if (input.placePressed) tryPlaceBlock();
  if (input.drinkPressed) drinkWater();

  /* itens */
  for (const kind of items.update(dt, player.pos)) {
    if (kind === 'objective') {
      collected++;
      sfx.pickup();
      if (collected >= level.objectiveCount) {
        portalOpen = true;
        hud.showMessage('🕳️ objetivo completo! Ache o buraco escuro e entre nele.');
        sfx.portal();
      } else {
        hud.showMessage(`${level.objectiveIcon} ${level.objectiveName} ${collected}/${level.objectiveCount}`);
      }
      updateObjectiveText();
    } else {
      player.water = Math.min(9, player.water + 1);
      sfx.pickup();
      hud.showMessage('🥤 Água de Amêndoas guardada (F ou botão beber)');
    }
  }

  /* inimigos */
  const ctx = {
    world, player, dt, sfx, inDark,
    onAttack: (dmg, e) => {
      if (player.applyDamage(dmg, e.pos.x, e.pos.z)) {
        hud.damageFlash();
        sfx.hurt();
        if (player.hp <= 0) onPlayerDeath(deathCause(e.type));
      }
    },
    summon: (n) => {
      for (let k = 0; k < n; k++) spawnEnemy(false, bossRef?.pos, 'smiler');
      hud.showMessage('💀 o Guardião invoca Sorridentes!');
    },
  };
  for (const e of enemies) e.update(ctx);
  for (const e of [...enemies]) if (e.dead) onEnemyDeath(e);
  if (state !== 'playing') return; // morreu dentro do update

  /* spawner */
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = level.spawnInterval;
    const cap = level.maxEnemies + (player.sanity < 25 ? 2 : 0);
    if (enemies.length < cap) spawnEnemy();
  }

  /* sanidade */
  let nearMonster = false;
  for (const e of enemies)
    if (e.distTo(player.pos) < 9 && e.state === 'chase') { nearMonster = true; break; }
  const dark = inDark(player.pos.x, player.pos.z);
  let drain = 0;
  if (nearMonster) drain += 3.2;
  if (dark) drain += 2.2;
  if (drain > 0) player.sanity = Math.max(0, player.sanity - drain * dt);
  else player.sanity = Math.min(100, player.sanity + 1.6 * dt);
  if (player.sanity <= 0) {
    player.hp = Math.max(0, player.hp - 2.5 * dt);
    if (player.hp <= 0) { onPlayerDeath('Sua mente se dissolveu no zumbido das lâmpadas.'); return; }
  }

  /* piso eletrificado */
  hazardTick -= dt;
  if (hazardTick <= 0) {
    hazardTick = 0.5;
    if (standingBlock(world, player.pos) === BLOCK.HAZARD) {
      if (player.applyDamage(8)) {
        hud.damageFlash();
        sfx.hurt();
        hud.showMessage('⚡ o piso está eletrificado!');
        if (player.hp <= 0) { onPlayerDeath('A corrente encontrou o caminho pelo seu corpo.'); return; }
      }
    }
  }

  /* portal */
  const feet = world.get(Math.floor(player.pos.x), Math.floor(player.pos.y + 0.2), Math.floor(player.pos.z));
  if (feet === BLOCK.PORTAL) {
    if (portalOpen) { nextLevel(); return; }
    hud.showMessage(level.boss
      ? 'o buraco rejeita você — o Guardião ainda vive 💀'
      : `o buraco rejeita você — faltam ${level.objectiveCount - collected} ${level.objectiveNamePlural} ${level.objectiveIcon}`);
  }

  /* luz e flicker */
  playerLight.position.set(player.pos.x, player.pos.y + 1.5, player.pos.z);
  flickerT -= dt;
  if (flickerT <= 0) {
    flickerT = 0.06 + Math.random() * 0.1;
    const f = Math.random() < 0.04 ? 0.35 + Math.random() * 0.3 : 0.92 + Math.random() * 0.12;
    ambient.intensity = level.ambientIntensity * f;
    world.matGlow.color.setScalar(Math.min(1, f + 0.15));
  }

  hud.update(player, dt);
  input.endFrame();
  renderer.render(scene, camera);
}

function deathCause(type) {
  switch (type) {
    case 'smiler': return 'A última coisa que você viu foi um sorriso no escuro.';
    case 'hound': return 'A matilha o encontrou antes que você encontrasse a saída.';
    case 'skinstealer': return 'Aquela silhueta parada nunca esteve realmente parada.';
    case 'faceling': return 'Eles não têm rosto — mas sabiam exatamente onde você estava.';
    case 'boss': return 'O Guardião do Vazio somou você à coleção de paredes.';
    default: return 'O Vazio reclamou mais um corpo.';
  }
}

/* ---------- start ---------- */

buildMenu();
showOverlay('menu');
tick();
