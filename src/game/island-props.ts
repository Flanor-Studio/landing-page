import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import propsUrl from '../assets/island-props.glb?url';
import type { createBreakables } from './breakables';
import type { Point } from './layout';
import { IslandMaterial } from './materials';

type PropName = 'bench' | 'lantern' | 'streetlight' | 'cherry';

export async function loadIslandProps() {
  try {
    const { scene } = await new GLTFLoader().loadAsync(propsUrl);
    const glass = new THREE.MeshBasicMaterial({ color: '#ffe1a3', toneMapped: false });
    const blossoms = ['#e59aa1', '#cf8496', '#edaca6'].map(color => new IslandMaterial({ color }));
    const palette = new Map<THREE.Material, THREE.Material>();
    let blossom = 0;
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.name.startsWith('treeLeaves')) {
        object.material = blossoms[blossom++ % blossoms.length];
        return;
      }
      const source = object.material as THREE.MeshStandardMaterial;
      let material = palette.get(source);
      if (!material) {
        material = source.map
          ? new IslandMaterial({ map: source.map, color: source.color, side: source.side })
          : glass;
        palette.set(source, material);
      }
      object.material = material;
      if (material === glass) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
    return scene;
  } catch (error) {
    console.warn('The island could not load the imported scenery.', error);
    return undefined;
  }
}

export function placeIslandProp(
  templates: THREE.Group | undefined, name: PropName, parent: THREE.Group,
  breakables: ReturnType<typeof createBreakables>, point: Point, angle = 0, scale = 1,
) {
  const template = templates?.getObjectByName(name);
  if (!template) return undefined;

  const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3()).multiplyScalar(scale);
  const tree = name === 'cherry';
  const instance = template.clone();
  instance.position.set(point.x, .027, point.z);
  instance.rotation.y = angle;
  instance.scale.setScalar(scale);

  const pieces: THREE.Mesh[] = [];
  const crowns: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] = [];
  instance.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    pieces.push(object);
    if (tree && object.name.startsWith('treeLeaves')) {
      object.material = object.material.clone();
      crowns.push(object);
    }
  });
  parent.add(instance);
  const prop = breakables.add({
    ...point, angle, halfX: tree ? .37 : size.x / 2, halfZ: tree ? .37 : size.z / 2,
  }, size.y, pieces);
  return { prop, crowns, crownY: size.y * .68, radius: Math.max(size.x, size.z) * .54 };
}
