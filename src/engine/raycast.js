// Raycast em voxels por passos curtos: bom o suficiente para mirar e linha de visão.

export function raycastVoxel(world, origin, dir, maxDist) {
  const step = 0.05;
  let px = Math.floor(origin.x), py = Math.floor(origin.y), pz = Math.floor(origin.z);
  for (let d = step; d <= maxDist; d += step) {
    const x = Math.floor(origin.x + dir.x * d);
    const y = Math.floor(origin.y + dir.y * d);
    const z = Math.floor(origin.z + dir.z * d);
    if (x === px && y === py && z === pz) continue;
    if (world.isSolid(x, y, z)) {
      return { x, y, z, prev: { x: px, y: py, z: pz }, dist: d };
    }
    px = x; py = y; pz = z;
  }
  return null;
}

// linha de visão entre dois pontos (olhos), passos maiores por desempenho
export function hasLOS(world, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.001) return true;
  const n = Math.ceil(dist / 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (world.isSolid(Math.floor(ax + dx * t), Math.floor(ay + dy * t), Math.floor(az + dz * t)))
      return false;
  }
  return true;
}
