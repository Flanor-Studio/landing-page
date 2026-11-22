import * as THREE from 'three';
import { onIsland, randomGenerator, type Breakable, type Footprint, type Impact } from './layout';
import { box, clay } from './models';

interface Fragment {
  body: THREE.Group;
  halfSize: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  age: number;
}

export function createBreakables(scene: THREE.Scene) {
  const debris = new THREE.Group();
  scene.add(debris);
  const props: Breakable[] = [];
  const moving: Fragment[] = [];
  const restore: (() => void)[] = [];
  const random = randomGenerator(125);
  const rotation = new THREE.Matrix4();

  function floorHeight(body: THREE.Group, halfSize: THREE.Vector3) {
    const axes = rotation.makeRotationFromQuaternion(body.quaternion).elements;
    return .035 + Math.abs(axes[1]) * halfSize.x + Math.abs(axes[5]) * halfSize.y + Math.abs(axes[9]) * halfSize.z;
  }

  function register(footprint: Footprint, height: number, onSmash: (impact: Impact) => void, onReset: () => void) {
    const prop: Breakable = {
      ...footprint,
      height,
      broken: false,
      smash(impact) {
        if (prop.broken) return;
        prop.broken = true;
        onSmash(impact);
      },
    };
    props.push(prop);
    restore.push(() => {
      if (!prop.broken) return;
      prop.broken = false;
      onReset();
    });
    return prop;
  }

  function add(footprint: Footprint, height: number, pieces: readonly THREE.Mesh[], intact: readonly THREE.Object3D[] = pieces) {
    const setVisible = (visible: boolean) => {
      for (const part of intact) part.visible = visible;
    };
    return register(footprint, height, ({ directionX, directionZ, speed }) => {
      setVisible(false);
      for (const piece of pieces) {
        if (!piece.geometry.boundingBox) piece.geometry.computeBoundingBox();
        const bounds = piece.geometry.boundingBox!;
        const center = bounds.getCenter(new THREE.Vector3());
        const halfSize = bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
        piece.updateWorldMatrix(true, false);
        const body = new THREE.Group();
        const scale = new THREE.Vector3();
        piece.matrixWorld.decompose(body.position, body.quaternion, scale);
        body.position.copy(center).applyMatrix4(piece.matrixWorld);
        const fragment = piece.clone();
        fragment.visible = true;
        fragment.position.copy(center).multiply(scale).negate();
        fragment.quaternion.identity();
        fragment.scale.copy(scale);
        body.add(fragment);
        debris.add(body);

        const sideOffset = (body.position.x - footprint.x) * directionZ - (body.position.z - footprint.z) * directionX;
        const spread = (random() - .5) * 4.2 + sideOffset * .55;
        const force = 1.7 + speed * .22 + random() * 1.8;
        moving.push({
          body,
          halfSize: halfSize.multiply(scale),
          velocity: new THREE.Vector3(
            directionX * force + directionZ * spread,
            2.3 + speed * .11 + random() * 2.1,
            directionZ * force - directionX * spread,
          ),
          spin: new THREE.Vector3(3 + random() * 4, spread, (random() - .5) * 8),
          age: 0,
        });
      }
    }, () => setVisible(true));
  }

  function update(dt: number, reduceMotion: boolean) {
    for (let index = moving.length - 1; index >= 0; index -= 1) {
      const fragment = moving[index];
      const { body, halfSize, velocity, spin } = fragment;
      if (reduceMotion) {
        body.position.x += velocity.x * .36;
        body.position.z += velocity.z * .36;
        body.rotateX(Math.PI / 2);
        body.position.y = floorHeight(body, halfSize);
        moving.splice(index, 1);
        continue;
      }

      fragment.age += dt;
      velocity.y -= 17 * dt;
      body.position.addScaledVector(velocity, dt);
      body.rotation.x += spin.x * dt;
      body.rotation.y += spin.y * dt;
      body.rotation.z += spin.z * dt;
      const floor = floorHeight(body, halfSize);

      if (!onIsland(body.position.x, body.position.z)) {
        body.removeFromParent();
        moving.splice(index, 1);
      } else if (fragment.age >= 2.2) {
        body.position.y = floor;
        moving.splice(index, 1);
      } else if (body.position.y <= floor) {
        body.position.y = floor;
        velocity.y = Math.max(0, -velocity.y * .28);
        const drag = Math.exp(-dt * 8);
        velocity.x *= drag;
        velocity.z *= drag;
        spin.multiplyScalar(drag);
      }
    }
  }

  function reset() {
    moving.length = 0;
    debris.clear();
    for (const rebuild of restore) rebuild();
  }

  return { props, add, register, update, reset };
}

export function addCrates(parent: THREE.Group, breakables: ReturnType<typeof createBreakables>) {
  const wood = clay('#c8784a');
  const slat = clay('#e89e59');
  const frame = clay('#975144');
  for (const [x, z, angle] of [[2.35, 6.3, .23], [8.55, 10.7, -.28], [-13.2, 6.9, -.38], [2.8, -16.2, .18], [19.5, -1.15, .42]]) {
    const crate = new THREE.Group();
    crate.position.set(x, .027, z);
    crate.rotation.y = angle;
    parent.add(crate);

    const pieces = [
      box(crate, frame, 1.12, .12, 1.12, 0, .06, 0, .022),
      box(crate, wood, 1.15, .11, 1.15, 0, .89, 0, .024),
    ];
    for (const side of [-1, 1]) {
      for (const y of [.24, .47, .7]) {
        pieces.push(
          box(crate, y === .47 ? slat : wood, 1.13, .222, .15, 0, y, side * .49, .024),
          box(crate, y === .47 ? slat : wood, .15, .222, .88, side * .49, y, 0, .024),
        );
      }
      for (const corner of [-1, 1]) {
        pieces.push(box(crate, frame, .15, .98, .15, corner * .53, .49, side * .53, .024));
      }
    }
    breakables.add({ x, z, halfX: .61, halfZ: .61, angle }, 1, pieces);
  }
}
