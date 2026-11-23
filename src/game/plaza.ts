import * as THREE from 'three';
import outlines from './flanor-lettering.json';
import type { createBreakables } from './breakables';
import { monument } from './layout';
import { box, clay, mesh } from './models';

type OutlineCommand = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['Z'];

function extrudeLettering(contours: (string | number)[][][], width: number, height: number, depth: number) {
  const path = new THREE.ShapePath();
  for (const contour of contours as OutlineCommand[][]) {
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
    depth, bevelEnabled: false, curveSegments: 8,
  }));
  const bounds = new THREE.Box3();
  for (const geometry of letters) {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox!);
  }
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  for (const geometry of letters) {
    geometry.translate(-center.x, -bounds.min.y, 0);
    geometry.scale(width / size.x, height / size.y, 1);
  }
  return letters;
}

export function addPlazaSign(island: THREE.Group, breakables: ReturnType<typeof createBreakables>) {
  const sign = new THREE.Group();
  sign.position.set(monument.x, .033, monument.z);
  sign.rotation.y = monument.angle;
  island.add(sign);

  const stone = clay('#294952');
  const enamel = new THREE.MeshBasicMaterial({ color: '#163746', toneMapped: false });
  const brass = new THREE.MeshBasicMaterial({ color: '#e9ba7b', toneMapped: false });
  const letteringEdge = clay('#efab76');
  const cream = new THREE.MeshBasicMaterial({ color: '#fff3dc', toneMapped: false });
  const limestone = clay('#d0b291');

  function panel(width: number, bottom: number, top: number, corner: number, z: number, depth: number, material: THREE.Material) {
    const half = width / 2;
    const corners = [
      [-half + corner, bottom], [half - corner, bottom], [half, bottom + corner], [half, top - corner],
      [half - corner, top], [-half + corner, top], [-half, top - corner], [-half, bottom + corner],
    ];
    const shape = new THREE.Shape(corners.map(([x, y]) => new THREE.Vector2(x, y)));
    return mesh(sign, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material, 0, 0, z);
  }

  const pieces: THREE.Mesh[] = [
    box(sign, limestone, 12.1, .25, 2.05, 0, .125, 0, .095),
    box(sign, limestone, 11.6, .25, 1.67, 0, .37, -.04, .075),
    panel(11.3, .48, 4.59, .64, -.63, 1.22, stone),
    panel(10.94, .63, 4.42, .57, .595, .044, brass),
    panel(10.78, .71, 4.34, .53, .642, .026, enamel),
  ];

  // Each Vazirmatn line is shaped right to left before the outlines are extracted.
  for (const geometry of extrudeLettering(outlines.flanor, 8.1, 2.38, .18)) {
    pieces.push(mesh(sign, geometry, [cream, letteringEdge], 0, .92, .681));
  }
  for (const geometry of extrudeLettering(outlines.studio, 2.45, .68, .095)) {
    pieces.push(mesh(sign, geometry, [brass, letteringEdge], 0, 3.43, .681));
  }
  for (const side of [-1, 1]) {
    pieces.push(box(sign, brass, 2.03, .065, .034, side * 2.62, 3.72, .683, .012));
    const rosette = box(sign, brass, .19, .19, .046, side * 3.83, 3.72, .69, .012);
    rosette.rotation.z = Math.PI / 4;
    pieces.push(rosette);
  }
  breakables.add({ ...monument, halfX: 6.05, halfZ: 1.025 }, 4.63, pieces);
}
