import * as THREE from 'three';

// Pickups: itens de objetivo (brilho verde) e Água de Amêndoas (garrafa âmbar).

function buildObjectiveMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.36, 0.36),
    new THREE.MeshBasicMaterial({ color: 0x50e090 })
  );
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.52, 0.52),
    new THREE.MeshBasicMaterial({ color: 0x208050, wireframe: true })
  );
  g.add(core, shell);
  return g;
}

function buildWaterMesh() {
  const g = new THREE.Group();
  const bottle = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.42, 0.22),
    new THREE.MeshLambertMaterial({ color: 0xd8b060, emissive: 0x604010, emissiveIntensity: 0.6 })
  );
  bottle.position.y = 0.21;
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.1, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xf0f0f0 })
  );
  cap.position.y = 0.47;
  g.add(bottle, cap);
  return g;
}

export class ItemManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.t = 0;
  }

  add(kind, x, y, z) {
    const mesh = kind === 'objective' ? buildObjectiveMesh() : buildWaterMesh();
    mesh.position.set(x, y + 0.5, z);
    this.scene.add(mesh);
    this.items.push({ kind, mesh, x, y, z, phase: Math.random() * 6 });
  }

  // retorna itens coletados neste quadro
  update(dt, playerPos) {
    this.t += dt;
    const got = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.mesh.position.y = it.y + 0.5 + Math.sin(this.t * 2 + it.phase) * 0.12;
      it.mesh.rotation.y += dt * 1.2;
      const dx = it.x - playerPos.x, dy = it.y - playerPos.y, dz = it.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz < 1.4) {
        got.push(it.kind);
        this.scene.remove(it.mesh);
        this.items.splice(i, 1);
      }
    }
    return got;
  }

  clear() {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
  }
}
