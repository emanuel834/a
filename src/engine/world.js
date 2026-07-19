import * as THREE from 'three';

// ids de blocos
export const BLOCK = {
  AIR: 0,
  FLOOR: 1,     // chão
  WALL: 2,      // parede comum (quebrável)
  ACCENT: 3,    // parede de destaque (quebrável)
  CEIL: 4,      // teto
  BEDROCK: 5,   // borda do mapa (indestrutível)
  LIGHT: 6,     // luminária (emissiva, indestrutível)
  PLACED: 7,    // bloco colocado pelo jogador
  PORTAL: 8,    // saída noclip (emissiva, atravessável)
  HAZARD: 9,    // piso eletrificado (nível 3)
  CRATE: 10,    // caixa de madeira (quebrável)
  PIPE: 11,     // tubulação (quebrável, dura)
};

// vida dos blocos (golpes de arma nível 1 p/ quebrar); Infinity = indestrutível
export const BLOCK_HP = {
  [BLOCK.FLOOR]: Infinity,
  [BLOCK.WALL]: 3,
  [BLOCK.ACCENT]: 3,
  [BLOCK.CEIL]: Infinity,
  [BLOCK.BEDROCK]: Infinity,
  [BLOCK.LIGHT]: Infinity,
  [BLOCK.PLACED]: 2,
  [BLOCK.PORTAL]: Infinity,
  [BLOCK.HAZARD]: Infinity,
  [BLOCK.CRATE]: 2,
  [BLOCK.PIPE]: 4,
};

const CHUNK = 16;
// sombreamento por face: topo claro, fundo escuro, laterais intermediárias
const FACE_SHADE = [0.62, 0.5, 1.0, 0.42, 0.78, 0.7]; // +x,-x,+y,-y,+z,-z

// as 6 faces: [dx,dy,dz, 4 cantos]
const FACES = [
  { dir: [1, 0, 0], corners: [[1,1,0],[1,0,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], corners: [[0,1,1],[0,0,1],[0,1,0],[0,0,0]] },
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]] },
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { dir: [0, 0, 1], corners: [[0,1,1],[1,1,1],[0,0,1],[1,0,1]].map(c=>[c[0],c[1],c[2]]) , flip:true },
  { dir: [0, 0, -1], corners: [[1,1,0],[0,1,0],[1,0,0],[0,0,0]] },
];
// corrige a ordem de +z para manter winding correto
FACES[4] = { dir: [0,0,1], corners: [[1,1,1],[0,1,1],[1,0,1],[0,0,1]] };

// hash determinístico p/ "textura" (variação de cor por bloco)
function jitter(x, y, z, f) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + f * 97) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = (h ^ (h >> 16)) >>> 0;
  return 0.88 + (h % 1000) / 1000 * 0.18;
}

export class World {
  constructor(scene, sx, sy, sz, palette) {
    this.scene = scene;
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
    this.damage = new Map(); // "x,y,z" -> dano acumulado
    this.palette = palette;  // id -> { c:[r,g,b], emissive?:true }
    this.cx = Math.ceil(sx / CHUNK);
    this.cz = Math.ceil(sz / CHUNK);
    this.chunkMeshes = new Map(); // "cx,cz" -> [mesh, meshEmissive]
    this.dirty = new Set();
    this.matLit = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  idx(x, y, z) { return (y * this.sz + z) * this.sx + x; }

  inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return BLOCK.BEDROCK;
    return this.data[this.idx(x, y, z)];
  }

  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.idx(x, y, z)] = id;
    this.damage.delete(`${x},${y},${z}`);
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    this.dirty.add(`${cx},${cz}`);
    // bordas: vizinhos também precisam re-gerar faces
    if (x % CHUNK === 0 && cx > 0) this.dirty.add(`${cx - 1},${cz}`);
    if (x % CHUNK === CHUNK - 1 && cx < this.cx - 1) this.dirty.add(`${cx + 1},${cz}`);
    if (z % CHUNK === 0 && cz > 0) this.dirty.add(`${cx},${cz - 1}`);
    if (z % CHUNK === CHUNK - 1 && cz < this.cz - 1) this.dirty.add(`${cx},${cz + 1}`);
  }

  // sólido para colisão (portal e ar são atravessáveis)
  isSolid(x, y, z) {
    const id = this.get(x, y, z);
    return id !== BLOCK.AIR && id !== BLOCK.PORTAL;
  }

  // dano de mineração; retorna o id se o bloco quebrou, senão 0
  hitBlock(x, y, z, dmg) {
    const id = this.get(x, y, z);
    const hp = BLOCK_HP[id];
    if (!hp || hp === Infinity) return 0;
    const key = `${x},${y},${z}`;
    const acc = (this.damage.get(key) || 0) + dmg;
    if (acc >= hp) {
      this.set(x, y, z, BLOCK.AIR);
      return id;
    }
    this.damage.set(key, acc);
    return 0;
  }

  buildAll() {
    for (let cx = 0; cx < this.cx; cx++)
      for (let cz = 0; cz < this.cz; cz++)
        this.buildChunk(cx, cz);
    this.dirty.clear();
  }

  rebuildDirty() {
    for (const key of this.dirty) {
      const [cx, cz] = key.split(',').map(Number);
      this.buildChunk(cx, cz);
    }
    this.dirty.clear();
  }

  buildChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const old = this.chunkMeshes.get(key);
    if (old) {
      for (const m of old) { this.group.remove(m); m.geometry.dispose(); }
      this.chunkMeshes.delete(key);
    }
    const lit = { pos: [], col: [], idxs: [] };
    const glow = { pos: [], col: [], idxs: [] };
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const x1 = Math.min(x0 + CHUNK, this.sx), z1 = Math.min(z0 + CHUNK, this.sz);

    for (let y = 0; y < this.sy; y++) {
      for (let z = z0; z < z1; z++) {
        for (let x = x0; x < x1; x++) {
          const id = this.data[this.idx(x, y, z)];
          if (id === BLOCK.AIR) continue;
          const info = this.palette[id];
          if (!info) continue;
          const target = info.emissive ? glow : lit;
          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
            const nid = this.get(nx, ny, nz);
            if (id === BLOCK.PORTAL) {
              // portal desenha as próprias faces contra tudo que não é portal
              if (nid === BLOCK.PORTAL) continue;
            } else {
              // blocos comuns só desenham faces contra o ar (portal cobre a divisa)
              if (nid !== BLOCK.AIR) continue;
            }
            const shade = info.emissive ? 1.0 : FACE_SHADE[f];
            const j = jitter(x, y, z, f);
            const r = info.c[0] * shade * j, g = info.c[1] * shade * j, b = info.c[2] * shade * j;
            const base = target.pos.length / 3;
            for (const c of face.corners) {
              target.pos.push(x + c[0], y + c[1], z + c[2]);
              target.col.push(r, g, b);
            }
            target.idxs.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
          }
        }
      }
    }

    const meshes = [];
    for (const [buf, mat] of [[lit, this.matLit], [glow, this.matGlow]]) {
      if (buf.pos.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
      geo.setIndex(buf.idxs);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      meshes.push(mesh);
    }
    if (meshes.length) this.chunkMeshes.set(key, meshes);
  }

  dispose() {
    for (const meshes of this.chunkMeshes.values())
      for (const m of meshes) { this.group.remove(m); m.geometry.dispose(); }
    this.chunkMeshes.clear();
    this.scene.remove(this.group);
    this.matLit.dispose();
    this.matGlow.dispose();
  }
}
