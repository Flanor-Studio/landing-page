import * as THREE from 'three';
import { box, clay, cylinder } from './models';

export function createPeykan() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const ivory = clay('#fff0ca');
  const orange = clay('#e85949');
  const orangeDark = clay('#9b3448');
  const cabin = clay('#383754');
  const glass = clay('#575681');
  const rubber = clay('#3f2d3f');
  const tread = clay('#584052');
  const chrome = clay('#bbafbe');
  const lamps = new THREE.MeshStandardMaterial({ color: '#fff5bf', emissive: '#ffcb6e', emissiveIntensity: .26 });
  const tail = new THREE.MeshStandardMaterial({ color: '#a72824', emissive: '#f04027', emissiveIntensity: .18 });

  box(body, rubber, 1.83, .32, 4.36, 0, .47, 0, .09);
  box(body, orange, 1.98, .59, 4.44, 0, .76, 0, .13);
  box(body, ivory, 1.91, .16, 4.28, 0, 1.075, 0, .09);
  box(body, cabin, 1.69, .58, 1.97, 0, 1.3, -.15, .15);
  box(body, glass, 1.45, .21, .05, 0, 1.37, -1.135, .022);
  box(body, glass, 1.45, .22, .05, 0, 1.37, .835, .022);
  box(body, ivory, 1.72, .17, 1.87, 0, 1.61, -.21, .08);
  box(body, orange, .24, .025, 1.72, -.12, 1.71, -.21, .01);
  box(body, orange, .075, .025, 1.72, .061, 1.71, -.21, .01);

  for (const side of [-1, 1]) {
    box(body, ivory, .045, .43, .08, side * .845, 1.32, -.25, .02);
    box(body, ivory, .06, .43, .12, side * .833, 1.32, -.93, .025);
    box(body, chrome, .029, .04, 1.34, side * .998, .557, -.03, .014);
    box(body, chrome, .032, .045, .24, side * .994, .946, -.34, .01);
    box(body, orangeDark, .03, .095, 1.12, side * 1.001, .744, -.01, .008);
    box(body, cabin, .22, .12, .24, side * .989, 1.23, .69, .045);
    box(body, lamps, .42, .21, .095, side * .653, .867, 2.217, .044);
    box(body, tail, .46, .18, .075, side * .638, .841, -2.221, .031);
    box(body, rubber, .14, .12, .055, side * .76, .557, -2.321, .022);
  }

  box(body, cabin, .81, .15, .07, 0, .861, 2.232, .017);
  box(body, chrome, 1.99, .15, .21, 0, .55, 2.23, .055);
  box(body, chrome, 1.99, .15, .21, 0, .55, -2.23, .055);
  box(body, ivory, .54, .16, .046, 0, .708, -2.25, .02);
  box(body, cabin, .08, .113, .024, -.19, .712, -2.276, .006);

  const pivots: THREE.Group[] = [];
  const wheels: THREE.Group[] = [];
  const radius = .414;
  for (const axle of [-1.34, 1.32]) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * .87, radius, axle);
      const wheel = new THREE.Group();
      root.add(pivot);
      pivot.add(wheel);

      const tire = cylinder(wheel, rubber, radius, .27, 0, 0, 0, radius, 20);
      tire.rotation.z = Math.PI / 2;
      for (let index = 0; index < 14; index += 1) {
        const angle = index / 14 * Math.PI * 2;
        const block = box(wheel, tread, .285, .036, .087, 0, Math.cos(angle) * .403, Math.sin(angle) * .403, .013);
        block.rotation.x = angle;
      }
      const rim = cylinder(wheel, chrome, .28, .06, side * .137, 0, 0, .28, 18);
      rim.rotation.z = Math.PI / 2;
      const cap = cylinder(wheel, orangeDark, .2, .055, side * .17, 0, 0, .2, 14);
      cap.rotation.z = Math.PI / 2;
      cylinder(wheel, ivory, .09, .047, side * .197, 0, 0, .09, 10).rotation.z = Math.PI / 2;
      if (axle > 0) pivots.push(pivot);
      wheels.push(wheel);
    }
  }

  return {
    root,
    update(dt: number, speed: number, steer: number, braking: boolean, lift: number) {
      for (const wheel of wheels) wheel.rotation.x += speed * dt / radius;
      for (const pivot of pivots) pivot.rotation.y = steer * .54;
      const response = 1 - Math.exp(-dt * 11);
      const lean = steer * Math.min(Math.abs(speed) / 11, 1) * .13;
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, lean, response);
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, (braking ? .07 : 0) - lift * .025, response);
      tail.emissiveIntensity = braking ? 1.15 : .18;
    },
  };
}
