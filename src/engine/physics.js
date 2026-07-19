// Física AABB compartilhada por jogador e monstros.
// pos = centro dos pés da entidade; size = { w: largura, h: altura }.

export const GRAVITY = 22;

function collides(world, px, py, pz, w, h) {
  const half = w / 2;
  const x0 = Math.floor(px - half), x1 = Math.floor(px + half);
  const y0 = Math.floor(py), y1 = Math.floor(py + h - 0.001);
  const z0 = Math.floor(pz - half), z1 = Math.floor(pz + half);
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++)
        if (world.isSolid(x, y, z)) return true;
  return false;
}

// Move a entidade eixo a eixo; muta pos e vel. Retorna flags de contato.
export function moveAABB(world, pos, vel, dt, size) {
  const res = { onGround: false, hitWall: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(vel.x), Math.abs(vel.y), Math.abs(vel.z)) * dt / 0.4));
  const sdt = dt / steps;

  for (let i = 0; i < steps; i++) {
    let nx = pos.x + vel.x * sdt;
    if (collides(world, nx, pos.y, pos.z, size.w, size.h)) { vel.x = 0; res.hitWall = true; }
    else pos.x = nx;

    let nz = pos.z + vel.z * sdt;
    if (collides(world, pos.x, pos.y, nz, size.w, size.h)) { vel.z = 0; res.hitWall = true; }
    else pos.z = nz;

    let ny = pos.y + vel.y * sdt;
    if (collides(world, pos.x, ny, pos.z, size.w, size.h)) {
      if (vel.y < 0) res.onGround = true;
      vel.y = 0;
    } else pos.y = ny;
  }
  return res;
}

export function standingBlock(world, pos) {
  return world.get(Math.floor(pos.x), Math.floor(pos.y - 0.1), Math.floor(pos.z));
}
