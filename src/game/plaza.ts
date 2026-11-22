import * as THREE from 'three';
import outlines from './flanor-lettering.json';
import type { createBreakables } from './breakables';
import { box, clay, cylinder, mesh } from './models';

const plaqueX = 6.55;
const plaqueZ = 13.25;
const plaqueAngle = .34;

type OutlineCommand = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['Z'];

export const plaza = Array.from({ length: 64 }, (_, index) => {
  const angle = index / 64 * Math.PI * 2;
  return { x: 3.75 + Math.cos(angle) * 8.2, z: 11.45 + Math.sin(angle) * 6.05 };
});

export function isInPlaza(x: number, z: number) {
  return ((x - 3.75) / 8.32) ** 2 + ((z - 11.45) / 6.17) ** 2 < 1;
}

export function addPlazaSign(island: THREE.Group, breakables: ReturnType<typeof createBreakables>) {
  const sign = new THREE.Group();
  sign.position.set(plaqueX, 0, plaqueZ);
  sign.rotation.y = plaqueAngle;
  island.add(sign);

  // Mikhak Black, shaped right to left before extracting the glyph outlines.
  const path = new THREE.ShapePath();
  for (const contour of outlines as OutlineCommand[][]) {
    for (const [op, a, b, c, d] of contour) {
      switch (op) {
        case 'M': path.moveTo(a, b); break;
        case 'L': path.lineTo(a, b); break;
        case 'Q': path.quadraticCurveTo(a, b, c, d); break;
        case 'Z': path.currentPath?.closePath(); break;
      }
    }
  }

  const letters = path.toShapes().map(shape => new THREE.ExtrudeGeometry(shape, {
    depth: .19, bevelThickness: .014, bevelSize: .011, bevelSegments: 2, curveSegments: 7,
  }));
  const bounds = new THREE.Box3();
  for (const geometry of letters) {
    geometry.scale(3.36, 3.15, 2.75);
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox!);
  }
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const lift = .37 - bounds.min.y;
  const lettering = [clay('#ffd8ee'), clay('#b260b2')];
  const pieces: THREE.Mesh[] = letters.map(geometry => {
    geometry.translate(-centerX, lift, -.27);
    return mesh(sign, geometry, lettering, 0, 0, 0);
  });
  const base = clay('#b0586b');
  const tile = clay('#e28c98');
  const brass = clay('#ffcf83');
  for (let index = -2; index <= 2; index += 1) {
    pieces.push(
      box(sign, base, 1.62, .24, 1.18, index * 1.65, .12, 0, .055),
      box(sign, tile, 1.6, .14, 1.06, index * 1.63, .3, 0, .035),
    );
  }
  for (let index = -4; index <= 4; index += 1) {
    const x = index * .89;
    const diamond = box(sign, brass, .135, .135, .039, x, .18, .59, .009);
    diamond.rotation.z = Math.PI / 4;
    pieces.push(diamond);
  }
  breakables.add({ x: plaqueX, z: plaqueZ, halfX: 4.11, halfZ: .61, angle: plaqueAngle }, bounds.max.y + lift, pieces);

  const light = clay('#ffdda3');
  light.emissive.set('#e27936').multiplyScalar(.33);
  const violet = clay('#824b8f');
  const coral = clay('#de7767');
  for (const [x, z] of [[-3.7, 8.8], [10.55, 9.4]]) {
    const cap = cylinder(island, coral, .36, .3, x, 3.39, z, .055, 4);
    cap.rotation.y = Math.PI / 4;
    breakables.add({ x, z, halfX: .27, halfZ: .27 }, 3.54, [
      cylinder(island, violet, .27, .38, x, .19, z, .22, 8),
      cylinder(island, coral, .11, 2.85, x, 1.42, z, .09, 8),
      box(island, violet, .61, .09, .61, x, 2.7, z, .035),
      box(island, light, .49, .48, .49, x, 2.97, z, .065),
      box(island, violet, .63, .11, .63, x, 3.22, z, .04),
      cap,
    ]);
  }

  const masonry = clay('#c76880');
  const inlay = [clay('#ffd292'), clay('#74abb2'), clay('#f4a8b0')];
  for (const [x, z, angle] of [[10.72, 13.3, .22], [-4.58, 10.8, -.32]]) {
    const seat = new THREE.Group();
    seat.position.set(x, 0, z);
    seat.rotation.y = angle;
    island.add(seat);
    const pieces = [
      box(seat, masonry, 1.62, .42, .55, 0, .21, 0, .11),
      box(seat, inlay[2], 1.78, .17, .7, 0, .47, 0, .075),
    ];
    for (let index = 0; index < 5; index += 1) {
      const diamond = box(seat, inlay[index % inlay.length], .14, .14, .035, (index - 2) * .28, .28, .277, .005);
      diamond.rotation.z = Math.PI / 4;
      pieces.push(diamond);
    }
    breakables.add({ x, z, halfX: .89, halfZ: .35, angle }, .56, pieces);
  }
}
