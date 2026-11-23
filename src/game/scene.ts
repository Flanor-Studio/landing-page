import * as THREE from 'three';
import type { Point } from './layout';
import { createPeykan } from './peykan';
import { createWorld } from './world';
import { createDust } from './scenery';
import { sunPosition } from './materials';

interface VehiclePose extends Point {
  heading: number;
  speed: number;
  steer: number;
  braking: boolean;
  height: number;
}

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#524984');
  scene.add(new THREE.HemisphereLight('#ffd7ca', '#9973bc', 1.85));
  const sun = new THREE.DirectionalLight('#ffcea1', 2.6);
  sun.position.copy(sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -43;
  sun.shadow.camera.right = sun.shadow.camera.top = 43;
  sun.shadow.camera.far = 130;
  sun.shadow.normalBias = .045;
  sun.shadow.bias = -.00016;
  sun.shadow.radius = 2;
  scene.add(sun);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 230);
  const look = new THREE.Vector3();
  const target = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3(26, 37, 52);
  const label = new THREE.Vector3();
  const world = createWorld(scene);
  const car = createPeykan();
  scene.add(car.root);
  const dust = createDust(scene);

  let aspect = 1;
  let viewHeight = 52;
  let width = 0;
  let height = 0;
  let zoom = 1;

  function setProjection() {
    const half = viewHeight / 2;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  function resize(nextWidth: number, nextHeight: number) {
    nextWidth = Math.max(1, nextWidth);
    nextHeight = Math.max(1, nextHeight);
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    if (width === nextWidth && height === nextHeight && renderer.getPixelRatio() === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    aspect = width / height;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    setProjection();
  }

  function draw(dt: number, time: number, pose: VehiclePose, nearest: number, reduceMotion: boolean, snap = false) {
    const lead = pose.speed * .13;
    target.set(pose.x + Math.sin(pose.heading) * lead, 0, pose.z + Math.cos(pose.heading) * lead);

    const response = snap || reduceMotion ? 1 : 1 - Math.exp(-dt * 4.4);
    look.lerp(target, response);
    const desiredHeight = (aspect < .84 ? 29 : 35) * zoom;
    if (Math.abs(viewHeight - desiredHeight) > .01) {
      viewHeight = THREE.MathUtils.lerp(viewHeight, desiredHeight, response);
      setProjection();
    }
    camera.position.copy(look).add(cameraOffset);
    camera.lookAt(look);

    car.root.position.set(pose.x, .025 + pose.height, pose.z);
    car.root.rotation.y = pose.heading;
    car.update(dt, pose.speed, pose.steer, pose.braking, pose.height);
    world.breakables.update(dt, reduceMotion);
    world.update(reduceMotion ? 0 : time, nearest, pose, cameraOffset);
    dust.update(dt, pose, !reduceMotion);
    renderer.render(scene, camera);
  }

  function project(x: number, y: number, z: number) {
    label.set(x, y, z).project(camera);
    return { x: (label.x + 1) * width / 2, y: (1 - label.y) * height / 2 };
  }

  function zoomBy(amount: number) {
    zoom = THREE.MathUtils.clamp(zoom + amount, .79, 1.28);
  }

  return {
    resize, draw, project, zoomBy,
    prepare: () => renderer.compileAsync(scene, camera),
    buildings: world.buildings,
    props: world.breakables.props,
    resetEffects: dust.reset,
    restoreScenery: world.reset,
    dispose: () => renderer.dispose(),
  };
}
