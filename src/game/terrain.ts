import * as THREE from 'three';
import { nearRoad, onIsland, randomGenerator, type Footprint, type Point } from './layout';
import { IslandMaterial } from './materials';

export function terrain(base: string, flecks: string[], paved = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const random = randomGenerator(921);
  context.fillStyle = base;
  context.fillRect(0, 0, 256, 256);

  if (paved) {
    const grout = '#9a412931';
    for (let row = 0; row < 5; row += 1) {
      for (let column = -1; column < 5; column += 1) {
        const size = 256 / 5;
        const x = column * size + (row % 2) * size * .5;
        const y = row * size;
        context.beginPath();
        context.roundRect(x + 1, y + 1, size - 2, size - 2, 4);
        context.fillStyle = flecks[Math.floor(random() * flecks.length)];
        context.fill();
        context.strokeStyle = grout;
        context.stroke();
      }
    }
  }

  const details = paved ? 95 : 2800;
  for (let index = 0; index < details; index += 1) {
    const size = paved ? 1 + random() * 6 : .45 + random() * 2.1;
    context.fillStyle = paved ? (index % 4 ? '#a6462942' : '#ffd69977') : flecks[index % flecks.length];
    context.save();
    context.translate(random() * 256, random() * 256);
    context.rotate(paved ? random() * Math.PI : 0);
    context.fillRect(0, 0, size, size * .64);
    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return new IslandMaterial({ map: texture, side: THREE.DoubleSide });
}

export function addGrass(parent: THREE.Group, obstacles: readonly Footprint[], openingClear: (x: number, z: number) => boolean) {
  const random = randomGenerator(127);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.11, 0, 0, .085, 0, 0, -.04, .54, .026,
    .085, 0, 0, .078, .56, .018, -.04, .54, .026,
    -.04, .54, .026, .078, .56, .018, .12, 1, .082,
  ], 3));
  geometry.computeVertexNormals();
  const attempts = 26500;
  const banks = [[-5.8, 7.4], [-5.2, 14.1], [5.75, 18.25], [10.9, 15.7], [8.5, 6.7], [3.8, 4.25]];
  const trackSize = 128;
  const trackSpan = 64;
  const cellSize = trackSpan / trackSize;
  const wear = new Uint8Array(trackSize * trackSize);
  const tracks = new THREE.DataTexture(wear, trackSize, trackSize, THREE.RedFormat);
  tracks.needsUpdate = true;
  const wind = { value: 0 };
  const material = new IslandMaterial({ side: THREE.DoubleSide }, { wind, tracks: { value: tracks }, span: { value: trackSpan } });
  const blades = new THREE.InstancedMesh(geometry, material, attempts);
  blades.receiveShadow = true;
  const colors = ['#edb727', '#db9e2b', '#f6cc58', '#bbaa43', '#ca902b'].map(value => new THREE.Color(value));
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  let count = 0;

  for (let sample = 0; sample < attempts; sample += 1) {
    const bank = sample % 5 === 0 ? banks[Math.floor(sample / 5) % banks.length] : null;
    const x = bank ? bank[0] + (random() - .5) * 5.6 : (random() - .5) * 62;
    const z = bank ? bank[1] + (random() - .5) * 4.7 : (random() - .5) * 61;
    const field = .5 + .25 * Math.sin(x * .65 + z * .31) + .25 * Math.sin(z * .62 - x * .14);
    const roadEdge = 2.66 + field * .65;
    if (field < .16 || !onIsland(x, z, 4.4) || nearRoad(x, z, roadEdge) || openingClear(x, z)) continue;
    if (obstacles.some(item => Math.abs(x - item.x) < item.halfX + .28 && Math.abs(z - item.z) < item.halfZ + .28)) continue;
    const height = (.35 + random() * .56) * (.76 + field * .46);
    transform.position.set(x, -.024, z);
    transform.rotation.set(0, random() * Math.PI * 2, (random() - .5) * .25);
    transform.scale.set(.87 + random() * .78, height, 1);
    transform.updateMatrix();
    tint.copy(colors[Math.floor(random() * colors.length)]).multiplyScalar(.88 + field * .18);
    blades.setMatrixAt(count, transform.matrix);
    blades.setColorAt(count++, tint);
  }

  blades.count = count;
  parent.add(blades);

  return {
    update(time: number, car: Point & { heading: number; height: number }) {
      wind.value = time;
      if (car.height > .35) return;
      const centerX = (car.x + trackSpan / 2) / cellSize;
      const centerZ = (car.z + trackSpan / 2) / cellSize;
      const sine = Math.sin(car.heading);
      const cosine = Math.cos(car.heading);
      let changed = false;
      for (let row = Math.max(0, Math.floor(centerZ - 5)); row < Math.min(trackSize, Math.ceil(centerZ + 5)); row += 1) {
        const dz = (row + .5 - centerZ) * cellSize;
        for (let column = Math.max(0, Math.floor(centerX - 5)); column < Math.min(trackSize, Math.ceil(centerX + 5)); column += 1) {
          const index = row * trackSize + column;
          if (wear[index]) continue;
          const dx = (column + .5 - centerX) * cellSize;
          if (Math.abs(dx * cosine - dz * sine) > 1 || Math.abs(dx * sine + dz * cosine) > 2.15) continue;
          wear[index] = 255;
          changed = true;
        }
      }
      if (changed) tracks.needsUpdate = true;
    },
    reset() {
      wear.fill(0);
      tracks.needsUpdate = true;
    },
  };
}
