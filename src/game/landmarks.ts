import * as THREE from 'three';
import { stations } from './layout';
import { box, clay, cylinder, mesh } from './models';

const cream = clay('#fff0cd');
const stone = clay('#b98c66');
const glass = clay('#325957');
const dark = clay('#273f40');
const peach = clay('#f2ad70');
const gold = clay('#f2b74d');
const coral = clay('#dc6655');
const rust = clay('#a64e40');
const green = clay('#528d74');
const teal = clay('#338982');
const blue = clay('#388991');
const cobalt = clay('#37628b');
const lilac = clay('#8b80ac');

function storefront(parent: THREE.Group, wall: THREE.Material, trim: THREE.Material) {
  box(parent, stone, 7.7, .25, 5.8, 0, .093, -.2, .13);
  box(parent, wall, 6.7, 3.7, 4.8, 0, 1.98, -.34, .15);
  box(parent, trim, 7.13, .37, 5.15, 0, 3.9, -.34, .12);
  box(parent, cream, 1.55, 2.48, .16, 0, 1.34, 2.07, .07);
  box(parent, glass, 1.27, 2.2, .13, 0, 1.25, 2.16, .04);
  box(parent, trim, .085, 2.18, .05, 0, 1.21, 2.24, .016);
  for (const x of [-2.13, 2.13]) {
    box(parent, cream, 1.67, 1.53, .15, x, 1.77, 2.069, .053);
    box(parent, glass, 1.44, 1.25, .09, x, 1.78, 2.158, .038);
    box(parent, trim, .075, 1.24, .041, x, 1.78, 2.22, .012);
    box(parent, trim, 1.73, .15, .3, x, .986, 2.19, .027);
    box(parent, glass, .125, 1.33, 1.72, Math.sign(x) * 3.342, 1.88, -.58, .056);
    box(parent, cream, .145, .13, 1.84, Math.sign(x) * 3.364, 1.14, -.58, .033);
  }
}

function puzzle(parent: THREE.Group) {
  storefront(parent, peach, teal);
  box(parent, green, 6.84, .35, 1.17, 0, 3.08, 2.31, .09);
  for (let index = -4; index <= 4; index += 1) {
    box(parent, index % 2 ? cream : teal, .73, .18, 1.12, index * .725, 3.26, 2.34, .016);
  }
  const blocks = new THREE.Group();
  blocks.position.set(-.25, 4.64, -.37);
  blocks.rotation.y = -.25;
  parent.add(blocks);
  for (const [x, y, z, color] of [
    [-1.07, 0, 0, coral], [0, 0, 0, gold], [1.07, 0, 0, teal],
    [-1.07, 1.07, 0, gold], [0, 1.07, 0, lilac], [0, 0, 1.07, cream],
  ] as const) {
    box(blocks, color, 1.02, 1.02, 1.02, x, y, z, .106);
    box(blocks, cream, .47, .47, .045, x, y, z + .5, .056).rotation.z = Math.PI / 4;
  }
}

function bag(parent: THREE.Group) {
  storefront(parent, coral, rust);
  box(parent, cream, 6.85, .205, 1.34, 0, 3.16, 2.64, .062).rotation.x = .19;
  for (let index = -5; index <= 5; index += 1) {
    box(parent, index % 2 ? cream : coral, .62, .21, 1.35, index * .617, 3.175, 2.645, .046).rotation.x = .19;
  }
  const display = new THREE.Group();
  display.position.set(.04, 0, -.26);
  display.rotation.y = -.18;
  parent.add(display);
  box(display, rust, .92, .73, .34, 0, 6.32, -.21, .16);
  box(display, coral, .53, .43, .35, 0, 6.39, -.18, .11);
  box(display, dark, 2.18, 2.17, .7, -.04, 5.06, -.48, .33);
  box(display, gold, 2.24, 2.34, 1.32, 0, 5.13, 0, .37);
  box(display, peach, 1.77, 1.18, .48, 0, 4.76, .66, .2);
  box(display, rust, 1.36, .085, .053, 0, 5.056, .898, .026);
  box(display, cream, .13, .15, .042, .47, 4.997, .929, .022);
  box(display, cream, .39, .42, .048, 0, 5.75, .667, .067).rotation.z = .24;
}

function tile(parent: THREE.Group) {
  const arch = new THREE.Shape();
  arch.moveTo(-3.38, 0);
  arch.lineTo(-3.38, 3.3);
  arch.lineTo(3.38, 3.3);
  arch.lineTo(3.38, 0);
  arch.lineTo(1.36, 0);
  arch.lineTo(1.36, 1.65);
  arch.absarc(0, 1.65, 1.36, 0, Math.PI, false);
  arch.lineTo(-1.36, 0);
  arch.closePath();
  const front = new THREE.ExtrudeGeometry(arch, { depth: .48, bevelThickness: .11, bevelSize: .1, bevelSegments: 2, curveSegments: 12 });
  mesh(parent, front, blue, 0, .26, 1.66);
  box(parent, stone, 7.35, .27, 6.04, 0, .09, -.12, .11);
  box(parent, cobalt, 6.61, 3.08, .35, 0, 1.78, -2.58);
  for (const side of [-1, 1]) {
    box(parent, blue, .31, 3.18, 4.55, side * 3.2, 1.83, -.27, .1);
    box(parent, cream, .22, .25, 4.65, side * 3.32, .34, -.28, .03);
  }
  box(parent, cobalt, 6.94, .36, 5.22, 0, 3.62, -.32, .12);
  const domeProfile = [[0, 0], [2.3, 0], [2.34, .37], [2.2, .82], [1.84, 1.27], [1.3, 1.75], [.63, 2.18], [0, 2.44]];
  mesh(parent, new THREE.LatheGeometry(domeProfile.map(([x, y]) => new THREE.Vector2(x, y)), 24), teal, 0, 3.79, -.35);
  cylinder(parent, cream, 2.28, .15, 0, 3.9, -.35, 2.3, 24);
  cylinder(parent, gold, .17, .59, 0, 6.35, -.35, .038, 10);
  const archTrim = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.51, .27, 2.26), new THREE.Vector3(-1.51, 1.63, 2.26),
      ...Array.from({ length: 11 }, (_, index) => {
        const angle = Math.PI - index * Math.PI / 10;
        return new THREE.Vector3(Math.cos(angle) * 1.51, 1.91 + Math.sin(angle) * 1.19, 2.26);
      }),
      new THREE.Vector3(1.51, 1.63, 2.26), new THREE.Vector3(1.51, .27, 2.26),
    ]), 30, .075, 6, false,
  );
  mesh(parent, archTrim, cream, 0, 0, 0);
  for (const row of [0, 1, 2, 3]) {
    for (const x of [-2.82, -2.15, 2.15, 2.82]) {
      const diamond = box(parent, row % 2 ? cobalt : cream, .32, .32, .075, x, .76 + row * .66, 2.22, .008);
      diamond.rotation.z = Math.PI / 4;
    }
  }
}

export function createLandmarks(parent: THREE.Group) {
  return stations.map((station, index) => {
    const group = new THREE.Group();
    const rotation = [Math.PI / 2, 0, -Math.PI / 5][index];
    group.rotation.y = rotation;
    group.position.set(station.buildingX, .016, station.buildingZ);
    parent.add(group);
    [puzzle, bag, tile][index](group);
    return {
      x: station.buildingX,
      z: station.buildingZ,
      halfX: [2.85, 3.5, 3.56][index],
      halfZ: [3.5, 2.85, 3.55][index],
    };
  });
}
