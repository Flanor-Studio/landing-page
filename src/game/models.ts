import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { IslandMaterial } from './materials';

export const clay = (color: THREE.ColorRepresentation) => new IslandMaterial({ color });

const boxes = new Map<string, THREE.BufferGeometry>();

export function box(
  parent: THREE.Object3D, material: THREE.Material, width: number, height: number, depth: number,
  x: number, y: number, z: number, radius = .07,
) {
  const key = [width, height, depth, radius].join(':');
  let geometry = boxes.get(key);
  if (!geometry) {
    geometry = radius ? new RoundedBoxGeometry(width, height, depth, 2, radius) : new THREE.BoxGeometry(width, height, depth);
    boxes.set(key, geometry);
  }
  return mesh(parent, geometry, material, x, y, z);
}

export function mesh<T extends THREE.BufferGeometry, M extends THREE.Material | THREE.Material[]>(
  parent: THREE.Object3D, geometry: T, material: M, x: number, y: number, z: number,
) {
  const model = new THREE.Mesh(geometry, material);
  model.position.set(x, y, z);
  model.castShadow = true;
  model.receiveShadow = true;
  parent.add(model);
  return model;
}

export function cylinder(
  parent: THREE.Object3D, material: THREE.Material, radius: number, height: number,
  x: number, y: number, z: number, top = radius, sides = 16,
) {
  return mesh(parent, new THREE.CylinderGeometry(top, radius, height, sides), material, x, y, z);
}
