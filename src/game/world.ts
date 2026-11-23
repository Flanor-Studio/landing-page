import * as THREE from 'three';
import { addCrates, createBreakables } from './breakables';
import {
  coast, isInPlaza, loop, mainStreet, nearRoad, onIsland, paths, plazaOutline, plazaPoint, plazaWalk,
  pond, randomGenerator, stations, type Footprint, type Point,
} from './layout';
import { createLandmarks } from './landmarks';
import { box, clay, cylinder, mesh } from './models';
import { addPlazaSign } from './plaza';
import { addGrass, terrain } from './terrain';

function planarUV(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position');
  const uv = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    uv[index * 2] = positions.getX(index) / 7;
    uv[index * 2 + 1] = positions.getZ(index) / 7;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function ground(parent: THREE.Group, points: readonly Point[], scale: number, y: number, material: THREE.Material) {
  const shape = new THREE.Shape(points.map(point => new THREE.Vector2(point.x * scale, -point.z * scale)));
  const geometry = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
  planarUV(geometry);
  mesh(parent, geometry, material, 0, y, 0).castShadow = false;
}

function band(
  parent: THREE.Group, points: readonly Point[], inside: number, outside: number,
  innerY: number, outerY: number, material: THREE.Material,
) {
  const xyz: number[] = [];
  const indices: number[] = [];
  const circle = [...points, points[0]];
  for (const [index, point] of circle.entries()) {
    xyz.push(point.x * inside, innerY, point.z * inside, point.x * outside, outerY, point.z * outside);
    const pair = index * 2;
    if (index < points.length) indices.push(pair, pair + 2, pair + 1, pair + 1, pair + 2, pair + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  planarUV(geometry);
  mesh(parent, geometry, material, 0, 0, 0).castShadow = false;
}

function stripe(parent: THREE.Group, points: readonly Point[], width: number, y: number, material: THREE.Material, offset = 0, closed = false) {
  const positions: number[] = [];
  const faces: number[] = [];
  for (const [index, point] of points.entries()) {
    const previous = points[index - 1] ?? (closed ? points.at(-2)! : point);
    const next = points[index + 1] ?? (closed ? points[1] : point);
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    const a = offset - width / 2;
    const b = offset + width / 2;
    positions.push(point.x - dz / length * a, y, point.z + dx / length * a);
    positions.push(point.x - dz / length * b, y, point.z + dx / length * b);
    const pair = index * 2;
    if (index + 1 < points.length) faces.push(pair, pair + 1, pair + 2, pair + 1, pair + 3, pair + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  planarUV(geometry);
  mesh(parent, geometry, material, 0, 0, 0).castShadow = false;
}

function ocean() {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 world;
      void main() {
        world = position.xy * vec2(1., -1.);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 world;

      void main() {
        vec2 radial = world / vec2(34., 33.);
        float angle = atan(radial.y, radial.x);
        float shore = length(radial) - 1. - .056 * sin(angle * 3. + .5) - .022 * cos(angle * 7.);
        float aqua = 1. - smoothstep(-.07, .59, shore);
        vec3 deep = vec3(.12, .25, .34);
        vec3 shallow = vec3(.29, .56, .56);
        float ripple = sin(world.x * .84 + world.y * .47 + sin(world.y * .34) * 1.1 + time * .63);
        float crossWave = sin(world.x * .52 - world.y * .86 - time * .37);
        float glints = smoothstep(.66, 1., ripple) * smoothstep(.46, 1., crossWave);
        float tide = sin(shore * 169. - time * 1.16 + sin(angle * 27.) * .65);
        float coastFoam = smoothstep(.72, 1., tide) * (1. - smoothstep(.008, .105, abs(shore + .007)));
        vec3 color = mix(deep, shallow, aqua) + ripple * .011 + glints * .046;
        color = mix(color, vec3(.77, .88, .79), coastFoam * .56);
        gl_FragColor = vec4(color, 1.);
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(450, 450), material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -.76;
  return { water, material };
}

function decorate(parent: THREE.Group, buildings: readonly Footprint[], breakables: ReturnType<typeof createBreakables>) {
  const random = randomGenerator(17);
  const flora = new THREE.Group();
  parent.add(flora);
  const pale = clay('#f8ccda');
  const wood = clay('#aa6b57');
  const rocks = clay('#c799b4');
  const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
  const crowns = ['#588f78', '#80a35e', '#4e8c85', '#bcad61', '#d99683'];
  const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
  const treePositions = [
    [-8, -11.9], [-12.9, -7.5], [-11.45, 8.9], [-9, 11.7], [-3.9, -10.2],
    [8.1, -12.2], [9.7, -8.9], [12.25, -9.9], [24.2, 4.4], [23.2, 8.2], [23.2, -13.1],
    [9.4, -22.2], [-10.5, -22.5], [-20.3, -14], [-22.7, -10.8], [-24.3, 12], [-21.8, 15.6],
    [-15, 20.3], [-12.1, 23.3], [-4.8, 23.25], [2.4, 23.8], [16, 20.3], [17.1, 16.4],
    [7.9, -.45], [12.7, 1.65], [11, 10], [-7.4, 15.1],
  ];
  const trees = [];
  for (const [index, [x, z]] of treePositions.entries()) {
    const height = 1.1 + random() * .96;
    const radius = 1.05 + random() * .47;
    const stump = cylinder(flora, wood, .153, height * .48, x, height * .24, z, .13, 7);
    const trunk = cylinder(flora, wood, .17, height * .52, x, height * .74, z, .153, 7);
    const tone = index % crowns.length;
    const main = mesh(flora, crownGeometry, clay(crowns[tone]), x, height + .7, z);
    main.scale.set(radius, radius * (1.08 + random() * .28), radius * .91);
    main.rotation.set(random(), random(), random() * .17);
    const branch = mesh(flora, crownGeometry, clay(crowns[(tone + 1) % crowns.length]), x + radius * .6, height + .17, z + radius * .28);
    branch.scale.setScalar(radius * .61);
    const prop = breakables.add({ x, z, halfX: .24, halfZ: .24 }, height + radius, [stump, trunk, main, branch]);
    trees.push({ x, z, main, branch, radius, prop });
  }

  for (let count = 0; count < 115; count += 1) {
    const randomX = (random() - .5) * 69;
    const randomZ = (random() - .5) * 68;
    if (!onIsland(randomX, randomZ) || onIsland(randomX, randomZ, 3.7)) continue;
    const scale = .19 + random() * 1.21;
    const material = count % 3 ? rocks : pale;
    const rock = mesh(flora, rockGeometry, material, randomX, scale * .27 - .25, randomZ);
    rock.scale.set(scale, scale * .58, scale * .87);
    rock.rotation.set(random(), random() * 6.3, random());
    const shards = [-1, 0, 1].map(side => {
      const shard = mesh(flora, rockGeometry, material, randomX + side * scale * .32, scale * .18, randomZ);
      shard.scale.setScalar(scale * .34);
      shard.rotation.copy(rock.rotation);
      shard.visible = false;
      return shard;
    });
    breakables.add({ x: randomX, z: randomZ, halfX: scale * .75, halfZ: scale * .71 }, scale * .8, shards, [rock]);
  }

  const patches = 100;
  const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.12, 0), clay('#ffffff'), patches * 5);
  petals.receiveShadow = true;
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const transform = new THREE.Object3D();
  const flat = new THREE.Matrix4().makeScale(1, .10, 1);
  const crushed = new THREE.Matrix4();
  const flowerColors = ['#ffe299', '#f5c388', '#f29284', '#ebdfb3', '#c1a3b4'].map(color => new THREE.Color(color));
  let flowerIndex = 0;

  const scenery = [...buildings, ...breakables.props];
  for (let index = 0; index < patches; index += 1) {
    const x = (random() - .5) * 62;
    const z = (random() - .5) * 62;
    if (!onIsland(x, z, 2) || nearRoad(x, z, 3.5) || isInPlaza(x, z) || scenery.some(item => Math.hypot(x - item.x, z - item.z) < 3.3)) continue;
    const color = flowerColors[index % flowerColors.length];
    const first = flowerIndex;
    const matrices: THREE.Matrix4[] = [];
    for (let petal = 0; petal < 5; petal += 1) {
      transform.position.set(x + (random() - .5) * 1.85, .33 + random() * .17, z + (random() - .5) * 1.85);
      transform.rotation.set(random() * .42, random() * 6.28, random() * .42);
      transform.scale.setScalar(.48 + random() * .55);
      transform.updateMatrix();
      matrices.push(transform.matrix.clone());
      petals.setMatrixAt(flowerIndex, transform.matrix);
      petals.setColorAt(flowerIndex++, color);
    }
    function setCrushed(damaged: boolean) {
      matrices.forEach((matrix, index) => {
        petals.setMatrixAt(first + index, damaged ? crushed.multiplyMatrices(flat, matrix) : matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
    }
    breakables.register({ x, z, halfX: .92, halfZ: .92 }, .55, () => setCrushed(true), () => setCrushed(false));
  }
  petals.count = flowerIndex;
  parent.add(petals);
  return trees;
}

function addPark(parent: THREE.Group, breakables: ReturnType<typeof createBreakables>) {
  const stone = clay('#dbc4a1');
  const clayRed = clay('#c76e50');
  const cream = clay('#fff2ce');
  const wood = clay('#966f57');
  const metal = clay('#3f5d57');

  const pondGroup = new THREE.Group();
  pondGroup.position.set(pond.x, .035, pond.z);
  parent.add(pondGroup);
  const basin = cylinder(pondGroup, stone, pond.radiusX, .18, 0, .025, 0, pond.radiusX, 40);
  basin.scale.z = pond.radiusZ / pond.radiusX;
  const pool = cylinder(pondGroup, clay('#65adab'), pond.radiusX - .27, .055, 0, .132, 0, pond.radiusX - .27, 40);
  pool.scale.z = (pond.radiusZ - .27) / (pond.radiusX - .27);
  const pondPieces: THREE.Mesh[] = [];
  for (const [x, z] of [[-.7, .9], [1, 1.1], [1.9, -.6], [-1.8, -.8]]) {
    const pad = cylinder(pondGroup, clay('#7a9f6d'), .45, .035, x, .17, z, .45, 10);
    pad.scale.z = .75;
    pondPieces.push(pad, mesh(pondGroup, new THREE.IcosahedronGeometry(.156, 0), clay('#e8a898'), x, .27, z));
  }
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2;
    const chunk = box(pondGroup, stone, .95, .21, .48,
      Math.cos(angle) * (pond.radiusX - .2), .11, Math.sin(angle) * (pond.radiusZ - .2), .065);
    chunk.rotation.y = -angle + Math.PI / 2;
    chunk.visible = false;
    pondPieces.push(chunk);
  }
  breakables.add({ x: pond.x, z: pond.z, halfX: pond.radiusX, halfZ: pond.radiusZ }, .35, pondPieces, [pondGroup]);

  for (const [x, z, angle] of [[8.35, 8.35, .1], [-12.9, 2.1, .9], [4.5, 24.5, -.37]]) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = angle;
    parent.add(bench);
    const legs = [-1, 1].flatMap(side => [
      box(bench, metal, .14, .62, .66, side * .83, .29, 0, .065),
      box(bench, metal, .11, .81, .1, side * .83, .74, -.28, .035),
    ]);
    breakables.add({ x, z, halfX: 1.05, halfZ: .35, angle }, 1.22, [
      ...legs,
      box(bench, wood, 2.1, .13, .65, 0, .64, 0),
      box(bench, wood, 2.1, .35, .12, 0, 1.05, -.29),
    ]);
  }

  for (const [x, z] of [[-13.4, 3.7], [7.15, -4.15], [14.4, -1.8], [12.9, 16.95], [-7.7, 22.7]]) {
    breakables.add({ x, z, halfX: .21, halfZ: .21 }, 2.57, [
      cylinder(parent, metal, .095, 2.3, x, 1.15, z, .075, 8),
      cylinder(parent, metal, .21, .15, x, .09, z, .19, 10),
      box(parent, metal, .43, .14, .43, x, 2.5, z, .06),
      box(parent, cream, .26, .26, .26, x, 2.31, z, .045),
    ]);
  }

  for (const { x, z } of [
    plazaPoint(-6.7, 1.48), plazaPoint(6.7, 1.48),
    { x: 10.7, z: 8.1 }, { x: -20.3, z: 7.9 }, { x: 21.6, z: -.65 }, { x: -3.34, z: -21.9 },
  ]) {
    const plant = mesh(parent, new THREE.IcosahedronGeometry(.42, 1), clay('#6c9f70'), x, .67, z);
    plant.scale.y = 1.3;
    breakables.add({ x, z, halfX: .5, halfZ: .5 }, 1.2, [
      cylinder(parent, clayRed, .4, .44, x, .24, z, .51, 10),
      cylinder(parent, stone, .5, .08, x, .46, z, .51, 10),
      plant,
    ]);
  }
}

export function createWorld(scene: THREE.Scene) {
  const island = new THREE.Group();
  const { water, material: waterMaterial } = ocean();
  scene.add(water, island);

  const meadow = terrain('#8d9b57', ['#a2ad6b82', '#657d564d', '#c0ae645c']);
  const beach = terrain('#dec194', ['#f4d3a189', '#b99c7b6b', '#fae4bc56']);
  const edge = terrain('#927c72', ['#bd937877', '#685d6757', '#d1a18055']);
  const street = terrain('#bf8e73', ['#c69478', '#c29075', '#c99b80', '#c38e74', '#c6957e'], true);
  const shoulder = terrain('#d5b08a', ['#f1ceaa80', '#ad87654a', '#e6bb9062']);
  const plazaTiles = terrain('#deccaa', ['#e1cfae', '#dccaab', '#e7d5b6', '#d7c4a4', '#e1cfb1'], true);
  const plazaTrim = clay('#75948a');

  band(island, coast, .91, .995, -.43, -.78, edge);
  band(island, coast, .955, 1.024, -.218, -.76, beach);
  band(island, coast, .898, .955, -.065, -.218, beach);
  band(island, coast, .872, .9, -.025, -.07, meadow);
  ground(island, coast, .875, -.025, meadow);

  paths.forEach((path, index) => stripe(island, path, 1.85, .006 + .0004 * index, shoulder));
  stripe(island, loop, 5.8, .004, shoulder, 0, true);
  stripe(island, mainStreet, 5.45, .005, shoulder);
  stripe(island, loop, 4.95, .013, street, 0, true);
  stripe(island, mainStreet, 4.64, .017, street);

  stripe(island, plazaWalk, 2.8, .016, plazaTiles);
  ground(island, plazaOutline(), 1, .023, plazaTiles);
  const border = plazaOutline(.26);
  stripe(island, [...border, border[0]], .16, .026, plazaTrim, 0, true);
  const mosaic = plazaPoint(-1.35, 3.65);
  const mosaicOutline = Array.from({ length: 9 }, (_, index) => {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    return { x: mosaic.x + Math.cos(angle) * 1.17, z: mosaic.z + Math.sin(angle) * 1.17 };
  });
  stripe(island, mosaicOutline, .075, .028, plazaTrim, 0, true);
  ground(island, Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    const radius = index % 2 ? .3 : .96;
    return { x: mosaic.x + Math.cos(angle) * radius, z: mosaic.z + Math.sin(angle) * radius };
  }), 1, .028, plazaTrim);

  const breakables = createBreakables(scene);
  const buildings = createLandmarks(island);
  addPlazaSign(island, breakables);
  addCrates(island, breakables);
  addPark(island, breakables);
  const trees = decorate(island, buildings, breakables);
  const grass = addGrass(island, [...buildings, ...breakables.props], isInPlaza);

  const rings = stations.map(({ x, z, project }) => {
    const material = new THREE.MeshBasicMaterial({ color: project.color, transparent: true, opacity: .68, side: THREE.DoubleSide, depthWrite: false });
    const marker = new THREE.Mesh(new THREE.RingGeometry(2.23, 2.34, 58), material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x, .037, z);
    island.add(marker);
    return marker;
  });

  return {
    buildings,
    breakables,
    reset() {
      breakables.reset();
      grass.reset();
    },
    update(time: number, nearest: number, car: Point & { height: number; heading: number }, cameraOffset: THREE.Vector3) {
      waterMaterial.uniforms.time.value = time;
      grass.update(time, car);
      const distance = Math.hypot(cameraOffset.x, cameraOffset.z);
      const slope = cameraOffset.y / distance;
      for (const { x, z, main, branch, radius, prop } of trees) {
        const dx = x - car.x;
        const dz = z - car.z;
        const forward = (dx * cameraOffset.x + dz * cameraOffset.z) / distance;
        const side = (dx * cameraOffset.z - dz * cameraOffset.x) / distance;
        const rayHeight = .86 + car.height + forward * slope;
        const obscuresCar = !prop.broken && forward > 0 && Math.abs(side) < radius + .34 && Math.abs(rayHeight - main.position.y) < radius * 1.14;
        for (const crown of [main, branch]) {
          if (crown.material.transparent === obscuresCar) continue;
          crown.material.transparent = obscuresCar;
          crown.material.opacity = obscuresCar ? .31 : 1;
          crown.material.depthWrite = !obscuresCar;
          crown.material.needsUpdate = true;
        }
      }
      rings.forEach((ring, index) => {
        const active = nearest === index;
        ring.material.opacity = active ? 1 : .68;
        ring.scale.setScalar(active ? 1 + Math.sin(time * 4) * .043 : 1);
      });
    },
  };
}
