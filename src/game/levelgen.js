import { BLOCK } from '../engine/world.js';

// RNG determinístico (mulberry32) — mesmos mapas p/ mesma seed
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// ponto aberto sobre o chão (2 blocos de ar acima de um chão sólido)
export function randomOpenSpot(world, rng, tries = 400, minDist = 0, fromX = 0, fromZ = 0) {
  for (let i = 0; i < tries; i++) {
    const x = ri(rng, 2, world.sx - 3);
    const z = ri(rng, 2, world.sz - 3);
    if (world.get(x, 0, z) !== BLOCK.FLOOR) continue;
    if (world.get(x, 1, z) !== BLOCK.AIR) continue;
    if (world.get(x, 2, z) !== BLOCK.AIR) continue;
    if (minDist > 0 && Math.hypot(x - fromX, z - fromZ) < minDist) continue;
    return { x: x + 0.5, y: 1, z: z + 0.5 };
  }
  return null;
}

export function placePortal(world, p) {
  for (let dy = 1; dy <= 2; dy++)
    for (let dx = 0; dx <= 1; dx++)
      world.set(p.x + dx, dy, p.z, BLOCK.PORTAL);
}

function base(world, ceilY, withCeil = true) {
  const { sx, sy, sz } = world;
  for (let z = 0; z < sz; z++)
    for (let x = 0; x < sx; x++) {
      world.set(x, 0, z, BLOCK.FLOOR);
      if (withCeil) world.set(x, ceilY, z, BLOCK.CEIL);
    }
  // borda indestrutível
  for (let y = 0; y <= (withCeil ? ceilY : sy - 1); y++)
    for (let z = 0; z < sz; z++)
      for (let x = 0; x < sx; x++)
        if (x === 0 || z === 0 || x === sx - 1 || z === sz - 1)
          world.set(x, y, z, BLOCK.BEDROCK);
}

function ceilLights(world, ceilY, rng, chance, darkZones = []) {
  for (let z = 4; z < world.sz - 4; z += 4)
    for (let x = 4; x < world.sx - 4; x += 4) {
      let dark = false;
      for (const dz of darkZones)
        if (Math.hypot(x - dz.x, z - dz.z) < dz.r) { dark = true; break; }
      if (!dark && rng() < chance && world.get(x, ceilY, z) === BLOCK.CEIL)
        world.set(x, ceilY, z, BLOCK.LIGHT);
    }
}

function pickSpots(world, rng, count, spawn, minFromSpawn, minBetween) {
  const spots = [];
  let guard = 0;
  while (spots.length < count && guard++ < 4000) {
    const s = randomOpenSpot(world, rng, 60, minFromSpawn, spawn.x, spawn.z);
    if (!s) { guard += 100; continue; }
    let ok = true;
    for (const o of spots)
      if (Math.hypot(s.x - o.x, s.z - o.z) < minBetween) { ok = false; break; }
    if (ok) spots.push(s);
  }
  // fallback: relaxa restrições se o mapa for apertado
  while (spots.length < count) {
    const s = randomOpenSpot(world, rng, 200, 0, 0, 0);
    if (!s) break;
    spots.push(s);
  }
  return spots;
}

/* ---------------- NÍVEL 0: labirinto amarelo ---------------- */
function genMaze(world, rng) {
  const wallTop = 3, ceilY = 4;
  base(world, ceilY);
  const cell = 4; // 3 abertos + 1 parede
  const cw = Math.floor((world.sx - 1) / cell);
  const ch = Math.floor((world.sz - 1) / cell);

  // tudo vira parede, depois o backtracker escava
  for (let y = 1; y <= wallTop; y++)
    for (let z = 1; z < world.sz - 1; z++)
      for (let x = 1; x < world.sx - 1; x++)
        world.set(x, y, z, rng() < 0.06 ? BLOCK.ACCENT : BLOCK.WALL);

  const carve = (cx, cz) => {
    const x0 = 1 + cx * cell, z0 = 1 + cz * cell;
    for (let y = 1; y <= wallTop; y++)
      for (let dz = 0; dz < cell - 1; dz++)
        for (let dx = 0; dx < cell - 1; dx++)
          world.set(x0 + dx, y, z0 + dz, BLOCK.AIR);
  };
  const carveLink = (cx, cz, dx, dz) => {
    const x0 = 1 + cx * cell, z0 = 1 + cz * cell;
    for (let y = 1; y <= wallTop; y++)
      for (let i = 0; i < cell - 1; i++) {
        if (dx === 1) world.set(x0 + cell - 1, y, z0 + i, BLOCK.AIR);
        if (dx === -1) world.set(x0 - 1, y, z0 + i, BLOCK.AIR);
        if (dz === 1) world.set(x0 + i, y, z0 + cell - 1, BLOCK.AIR);
        if (dz === -1) world.set(x0 + i, y, z0 - 1, BLOCK.AIR);
      }
  };

  const visited = new Set();
  const stack = [[0, 0]];
  visited.add('0,0');
  carve(0, 0);
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => {
      const nx = cx + dx, nz = cz + dz;
      return nx >= 0 && nz >= 0 && nx < cw && nz < ch && !visited.has(`${nx},${nz}`);
    });
    if (!dirs.length) { stack.pop(); continue; }
    const [dx, dz] = dirs[Math.floor(rng() * dirs.length)];
    const nx = cx + dx, nz = cz + dz;
    visited.add(`${nx},${nz}`);
    carve(nx, nz);
    carveLink(cx, cz, dx, dz);
    stack.push([nx, nz]);
  }

  // salas abertas + atalhos para dar variedade
  for (let i = 0; i < 7; i++) {
    const rx = ri(rng, 4, world.sx - 14), rz = ri(rng, 4, world.sz - 14);
    const rw = ri(rng, 6, 11), rh = ri(rng, 6, 11);
    for (let y = 1; y <= wallTop; y++)
      for (let z = rz; z < rz + rh; z++)
        for (let x = rx; x < rx + rw; x++)
          world.set(x, y, z, BLOCK.AIR);
  }

  // zonas escuras onde os Sorridentes vivem
  const darkZones = [];
  for (let i = 0; i < 5; i++)
    darkZones.push({ x: ri(rng, 12, world.sx - 12), z: ri(rng, 12, world.sz - 12), r: ri(rng, 8, 13) });
  ceilLights(world, ceilY, rng, 0.75, darkZones);
  return { darkZones };
}

/* ---------------- NÍVEL 1: armazém ---------------- */
function genWarehouse(world, rng) {
  const ceilY = 7;
  base(world, ceilY);
  // pilares
  for (let z = 10; z < world.sz - 10; z += 13)
    for (let x = 10; x < world.sx - 10; x += 13)
      for (let y = 1; y < ceilY; y++)
        for (let dz = 0; dz < 2; dz++)
          for (let dx = 0; dx < 2; dx++)
            world.set(x + dx, y, z + dz, BLOCK.ACCENT);
  // meias-paredes para quebrar linha de visão
  for (let i = 0; i < 10; i++) {
    const horiz = rng() < 0.5;
    const len = ri(rng, 8, 18);
    const x0 = ri(rng, 6, world.sx - 6 - (horiz ? len : 1));
    const z0 = ri(rng, 6, world.sz - 6 - (horiz ? 1 : len));
    for (let j = 0; j < len; j++)
      for (let y = 1; y <= 3; y++)
        world.set(x0 + (horiz ? j : 0), y, z0 + (horiz ? 0 : j), BLOCK.WALL);
  }
  // pilhas de caixas
  for (let i = 0; i < 26; i++) {
    const cx = ri(rng, 5, world.sx - 8), cz = ri(rng, 5, world.sz - 8);
    const n = ri(rng, 2, 5);
    for (let j = 0; j < n; j++) {
      const bx = cx + ri(rng, 0, 2), bz = cz + ri(rng, 0, 2);
      const h = ri(rng, 1, 3);
      for (let y = 1; y <= h; y++)
        if (world.get(bx, y, bz) === BLOCK.AIR) world.set(bx, y, bz, BLOCK.CRATE);
    }
  }
  ceilLights(world, ceilY, rng, 0.4);
  return {};
}

/* ---------------- NÍVEL 2: tubulações ---------------- */
function genPipes(world, rng) {
  const ceilY = 4;
  base(world, ceilY);
  // maciço sólido; túneis serão escavados
  for (let y = 1; y < ceilY; y++)
    for (let z = 1; z < world.sz - 1; z++)
      for (let x = 1; x < world.sx - 1; x++)
        world.set(x, y, z, rng() < 0.05 ? BLOCK.ACCENT : BLOCK.WALL);

  const carveAt = (x, z, w) => {
    for (let y = 1; y < ceilY; y++)
      for (let dz = 0; dz < w; dz++)
        for (let dx = 0; dx < w; dx++) {
          const bx = x + dx, bz = z + dz;
          if (bx > 0 && bz > 0 && bx < world.sx - 1 && bz < world.sz - 1)
            world.set(bx, y, bz, BLOCK.AIR);
        }
  };

  const cx0 = Math.floor(world.sx / 2), cz0 = Math.floor(world.sz / 2);
  carveAt(cx0 - 3, cz0 - 3, 7); // câmara central (spawn)
  const walkers = 7;
  for (let wi = 0; wi < walkers; wi++) {
    let x = cx0, z = cz0;
    let dir = ri(rng, 0, 3);
    const steps = 220;
    for (let s = 0; s < steps; s++) {
      carveAt(x, z, 2);
      if (rng() < 0.18) dir = ri(rng, 0, 3);
      if (rng() < 0.02) carveAt(x - 2, z - 2, 6); // sala ocasional
      const [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][dir];
      x = Math.max(2, Math.min(world.sx - 4, x + dx));
      z = Math.max(2, Math.min(world.sz - 4, z + dz));
    }
  }
  // canos decorativos no teto dos túneis
  for (let z = 1; z < world.sz - 1; z++)
    for (let x = 1; x < world.sx - 1; x++)
      if (world.get(x, 1, z) === BLOCK.AIR && world.get(x, ceilY - 1, z) === BLOCK.AIR && rng() < 0.05)
        world.set(x, ceilY - 1, z, BLOCK.PIPE);
  ceilLights(world, ceilY, rng, 0.22);
  return {};
}

/* ---------------- NÍVEL 3: central elétrica ---------------- */
function genPlant(world, rng) {
  const ceilY = 5;
  base(world, ceilY);
  const room = 15;
  // grade de salas com portas
  for (let z = room; z < world.sz - 2; z += room)
    for (let x = 1; x < world.sx - 1; x++)
      for (let y = 1; y < ceilY; y++)
        world.set(x, y, z, BLOCK.WALL);
  for (let x = room; x < world.sx - 2; x += room)
    for (let z = 1; z < world.sz - 1; z++)
      for (let y = 1; y < ceilY; y++)
        world.set(x, y, z, BLOCK.WALL);
  // portas (2 de largura, 2 de altura) em cada trecho de parede
  for (let z = room; z < world.sz - 2; z += room)
    for (let x = 2; x < world.sx - 6; x += room) {
      const dx = ri(rng, 1, room - 5);
      for (let y = 1; y <= 2; y++) { world.set(x + dx, y, z, BLOCK.AIR); world.set(x + dx + 1, y, z, BLOCK.AIR); }
    }
  for (let x = room; x < world.sx - 2; x += room)
    for (let z = 2; z < world.sz - 6; z += room) {
      const dz = ri(rng, 1, room - 5);
      for (let y = 1; y <= 2; y++) { world.set(x, y, z + dz, BLOCK.AIR); world.set(x, y, z + dz + 1, BLOCK.AIR); }
    }
  // geradores (cubos de destaque) e pisos eletrificados
  for (let i = 0; i < 18; i++) {
    const gx = ri(rng, 4, world.sx - 8), gz = ri(rng, 4, world.sz - 8);
    for (let y = 1; y <= 2; y++)
      for (let dz = 0; dz < 2; dz++)
        for (let dx = 0; dx < 2; dx++)
          if (world.get(gx + dx, y, gz + dz) === BLOCK.AIR)
            world.set(gx + dx, y, gz + dz, BLOCK.PIPE);
  }
  for (let i = 0; i < 22; i++) {
    const hx = ri(rng, 4, world.sx - 10), hz = ri(rng, 4, world.sz - 10);
    const w = ri(rng, 2, 5), h = ri(rng, 2, 5);
    for (let z = hz; z < hz + h; z++)
      for (let x = hx; x < hx + w; x++)
        if (world.get(x, 0, z) === BLOCK.FLOOR && world.get(x, 1, z) === BLOCK.AIR)
          world.set(x, 0, z, BLOCK.HAZARD);
  }
  ceilLights(world, ceilY, rng, 0.5);
  return {};
}

/* ---------------- NÍVEL !: arena do chefe ---------------- */
function genArena(world, rng) {
  const cx = world.sx / 2, cz = world.sz / 2;
  const R = Math.min(cx, cz) - 3;
  for (let z = 0; z < world.sz; z++)
    for (let x = 0; x < world.sx; x++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d <= R) {
        world.set(x, 0, z, BLOCK.FLOOR);
      } else if (d <= R + 3) {
        for (let y = 0; y <= 7; y++) world.set(x, y, z, BLOCK.BEDROCK);
      }
    }
  // anel de pilares com tochas no topo
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const px = Math.floor(cx + Math.cos(a) * (R - 7));
    const pz = Math.floor(cz + Math.sin(a) * (R - 7));
    for (let y = 1; y <= 4; y++)
      for (let dz = 0; dz < 2; dz++)
        for (let dx = 0; dx < 2; dx++)
          world.set(px + dx, y, pz + dz, BLOCK.ACCENT);
    world.set(px, 5, pz, BLOCK.LIGHT);
    world.set(px + 1, 5, pz + 1, BLOCK.LIGHT);
  }
  // detritos
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = rng() * (R - 10);
    const bx = Math.floor(cx + Math.cos(a) * r), bz = Math.floor(cz + Math.sin(a) * r);
    if (world.get(bx, 1, bz) === BLOCK.AIR) world.set(bx, 1, bz, BLOCK.WALL);
  }
  return { arena: { cx, cz, R } };
}

const GENERATORS = { maze: genMaze, warehouse: genWarehouse, pipes: genPipes, plant: genPlant, arena: genArena };

// Gera o nível completo; retorna spawn, portal, itens e águas.
export function generateLevel(world, level) {
  const rng = makeRng(level.seed * 7919 + 13);
  const extra = GENERATORS[level.gen](world, rng) || {};

  let spawn;
  if (level.gen === 'pipes' || level.gen === 'arena') {
    const cx = Math.floor(world.sx / 2), cz = Math.floor(world.sz / 2);
    spawn = level.gen === 'arena'
      ? { x: cx + 0.5, y: 1, z: world.sz - 12 + 0.5 }
      : { x: cx + 0.5, y: 1, z: cz + 0.5 };
  } else {
    spawn = randomOpenSpot(world, rng) || { x: 2.5, y: 1, z: 2.5 };
  }

  // portal longe do spawn
  let portalSpot = null;
  for (let i = 0; i < 300 && !portalSpot; i++) {
    const s = randomOpenSpot(world, rng, 40, Math.min(world.sx, world.sz) * 0.45, spawn.x, spawn.z);
    if (s && world.get(Math.floor(s.x) + 1, 1, Math.floor(s.z)) === BLOCK.AIR) portalSpot = s;
  }
  if (!portalSpot) portalSpot = randomOpenSpot(world, rng, 400, 20, spawn.x, spawn.z) ||
    { x: world.sx - 6.5, y: 1, z: world.sz - 6.5 };
  const portal = { x: Math.floor(portalSpot.x), y: 1, z: Math.floor(portalSpot.z) };
  if (!level.boss) placePortal(world, portal);

  const items = level.boss ? [] : pickSpots(world, rng, level.objectiveCount, spawn, 18, 14);
  const waters = pickSpots(world, rng, level.waterPickups, spawn, 8, 6);

  return { spawn, portal, items, waters, rng, ...extra };
}
