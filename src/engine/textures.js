import * as THREE from 'three';
import { BLOCK } from './world.js';

// Atlas de texturas pixel-art gerado em canvas (nenhum arquivo de imagem).
// Os tiles são desenhados em tons de cinza claros e recebem a cor da paleta
// do nível via vertex color (multiplicação), então o mesmo atlas serve
// para todos os níveis.

const TILE = 32;
const COLS = 4;
const ROWS = 4;

// bloco -> índice do tile no atlas
export const TILE_OF = {
  [BLOCK.FLOOR]: 0,
  [BLOCK.WALL]: 1,
  [BLOCK.ACCENT]: 2,
  [BLOCK.CEIL]: 3,
  [BLOCK.BEDROCK]: 4,
  [BLOCK.LIGHT]: 5,
  [BLOCK.PLACED]: 6,
  [BLOCK.PORTAL]: 7,
  [BLOCK.HAZARD]: 8,
  [BLOCK.CRATE]: 9,
  [BLOCK.PIPE]: 10,
};

// rng determinístico para o ruído dos tiles
function rngFactory(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const g = canvas.getContext('2d');

  const px = (tx, ty, x, y, v) => {
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(tx * TILE + x, ty * TILE + y, 1, 1);
  };
  const fill = (tx, ty, v) => {
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
  };

  const tilePos = (i) => [i % COLS, Math.floor(i / COLS)];
  const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

  /* 0 — carpete: pontilhado denso */
  {
    const [tx, ty] = tilePos(0);
    const r = rngFactory(101);
    fill(tx, ty, 208);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++)
        if (r() < 0.55) px(tx, ty, x, y, clamp8(208 + (r() - 0.5) * 46));
  }

  /* 1 — papel de parede: listras verticais suaves + ruído fino */
  {
    const [tx, ty] = tilePos(1);
    const r = rngFactory(202);
    fill(tx, ty, 224);
    for (let x = 0; x < TILE; x++) {
      const stripe = (x % 8 < 4) ? 0 : -14;
      for (let y = 0; y < TILE; y++) {
        const n = (r() - 0.5) * 10;
        px(tx, ty, x, y, clamp8(224 + stripe + n));
      }
    }
    // rodapé sutil
    for (let x = 0; x < TILE; x++) { px(tx, ty, x, 30, 190); px(tx, ty, x, 31, 176); }
  }

  /* 2 — parede de destaque: painel com moldura */
  {
    const [tx, ty] = tilePos(2);
    const r = rngFactory(303);
    fill(tx, ty, 212);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const border = x < 2 || y < 2 || x > 29 || y > 29;
        const inner = x >= 5 && x <= 26 && y >= 5 && y <= 26;
        let v = border ? 184 : inner ? 222 : 200;
        v += (r() - 0.5) * 8;
        px(tx, ty, x, y, clamp8(v));
      }
  }

  /* 3 — teto: placas com frisos */
  {
    const [tx, ty] = tilePos(3);
    const r = rngFactory(404);
    fill(tx, ty, 226);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let v = 226 + (r() - 0.5) * 8;
        if (x === 0 || y === 0) v = 196;
        if (x === 16 || y === 16) v = 208;
        px(tx, ty, x, y, clamp8(v));
      }
  }

  /* 4 — rocha de borda: ruído grosso escuro */
  {
    const [tx, ty] = tilePos(4);
    const r = rngFactory(505);
    fill(tx, ty, 180);
    for (let y = 0; y < TILE; y += 2)
      for (let x = 0; x < TILE; x += 2) {
        const v = clamp8(180 + (r() - 0.5) * 70);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(tx * TILE + x, ty * TILE + y, 2, 2);
      }
  }

  /* 5 — luminária: painel brilhante com grade */
  {
    const [tx, ty] = tilePos(5);
    fill(tx, ty, 150);
    g.fillStyle = 'rgb(255,255,255)';
    g.fillRect(tx * TILE + 2, ty * TILE + 2, 28, 28);
    g.fillStyle = 'rgb(214,214,214)';
    for (let i = 8; i < 30; i += 8) {
      g.fillRect(tx * TILE + 2, ty * TILE + i, 28, 1);
      g.fillRect(tx * TILE + i, ty * TILE + 2, 1, 28);
    }
  }

  /* 6 — bloco colocado: tábuas horizontais */
  {
    const [tx, ty] = tilePos(6);
    const r = rngFactory(606);
    fill(tx, ty, 210);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let v = 210 + (r() - 0.5) * 14;
        if (y % 8 === 7) v = 168;                       // fenda entre tábuas
        else if (r() < 0.12) v -= 18;                    // veios
        px(tx, ty, x, y, clamp8(v));
      }
  }

  /* 7 — portal: vazio com "estrelas" */
  {
    const [tx, ty] = tilePos(7);
    const r = rngFactory(707);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const dx = x - 16, dy = y - 16;
        const d = Math.sqrt(dx * dx + dy * dy) / 22;
        let v = 26 + d * 34 + (r() - 0.5) * 12;          // centro mais escuro
        px(tx, ty, x, y, clamp8(v));
      }
    for (let i = 0; i < 14; i++) px(tx, ty, Math.floor(r() * 32), Math.floor(r() * 32), 120 + r() * 80);
  }

  /* 8 — perigo: listras diagonais */
  {
    const [tx, ty] = tilePos(8);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const s = ((x + y) % 16) < 8;
        px(tx, ty, x, y, s ? 255 : 120);
      }
  }

  /* 9 — caixa: moldura + X de ripas */
  {
    const [tx, ty] = tilePos(9);
    const r = rngFactory(909);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let v = 206 + (r() - 0.5) * 16;
        const border = x < 3 || y < 3 || x > 28 || y > 28;
        const diag = Math.abs(x - y) < 2 || Math.abs(x + y - 31) < 2;
        if (border) v = 170 + (r() - 0.5) * 10;
        else if (diag) v = 182 + (r() - 0.5) * 10;
        if (y % 8 === 0 && !border) v -= 14;
        px(tx, ty, x, y, clamp8(v));
      }
  }

  /* 10 — cano/metal: faixas horizontais com rebites */
  {
    const [tx, ty] = tilePos(10);
    const r = rngFactory(111);
    fill(tx, ty, 198);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let v = 198 + (r() - 0.5) * 10;
        if (y % 11 === 0) v = 156;                       // emenda
        if (y % 11 === 1) v = 232;                       // brilho da emenda
        px(tx, ty, x, y, clamp8(v));
      }
    for (let i = 0; i < 6; i++) {
      const bx = 3 + Math.floor(r() * 26), by = 3 + Math.floor(r() * 26);
      px(tx, ty, bx, by, 140); px(tx, ty, bx + 1, by, 236);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  // retângulo UV do tile com meia margem de texel contra vazamento
  const uvCache = new Map();
  const uvRect = (blockId) => {
    const idx = TILE_OF[blockId] ?? 0;
    let r = uvCache.get(idx);
    if (!r) {
      const tx = idx % COLS, ty = Math.floor(idx / COLS);
      const W = COLS * TILE, H = ROWS * TILE;
      r = {
        u0: (tx * TILE + 0.5) / W,
        u1: ((tx + 1) * TILE - 0.5) / W,
        // canvas cresce para baixo; UV cresce para cima (flipY padrão)
        v0: 1 - ((ty + 1) * TILE - 0.5) / H,
        v1: 1 - (ty * TILE + 0.5) / H,
      };
      uvCache.set(idx, r);
    }
    return r;
  };

  return { texture, uvRect };
}
