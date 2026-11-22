import * as THREE from 'three';

export function createDust(scene: THREE.Scene) {
  const count = 80;
  const positions = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  const xyz = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const ages = new THREE.BufferAttribute(life, 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', xyz);
  geometry.setAttribute('aLife', ages);
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: { dustColor: { value: new THREE.Color('#e8c18d') } },
    vertexShader: `
      attribute float aLife;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 projected = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * projected;
        gl_PointSize = clamp((17.0 + (1.0 - aLife) * 39.0) / max(1.0, -projected.z), 2.0, 24.0);
      }
    `,
    fragmentShader: `
      uniform vec3 dustColor;
      varying float vLife;
      void main() {
        float radius = length(gl_PointCoord - 0.5);
        float opacity = (1.0 - smoothstep(0.06, 0.5, radius)) * vLife * 0.34;
        gl_FragColor = vec4(dustColor, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  scene.add(dust);

  let cursor = 0;
  let accumulator = 0;

  return {
    reset() {
      life.fill(0);
      ages.needsUpdate = true;
      accumulator = 0;
    },
    update(dt: number, state: { x: number; z: number; heading: number; speed: number; braking: boolean; height: number }, active: boolean) {
      for (let index = 0; index < count; index += 1) {
        if (life[index] <= 0) continue;
        life[index] = Math.max(0, life[index] - dt * .91);
        positions[index * 3 + 1] += dt * .53;
        positions[index * 3] -= dt * .19;
      }
      if (active && Math.abs(state.speed) > 2 && state.height < .12) {
        accumulator += dt * (11 + Math.abs(state.speed) * 1.8 + (state.braking ? 19 : 0));
        while (accumulator >= 1) {
          const offset = cursor * 3;
          const side = (cursor % 2 ? .76 : -.76) + (Math.random() - .5) * .36;
          const sine = Math.sin(state.heading);
          const cosine = Math.cos(state.heading);
          const behind = Math.sign(state.speed) * 2.05;
          positions[offset] = state.x - behind * sine + cosine * side;
          positions[offset + 1] = .15 + Math.random() * .13;
          positions[offset + 2] = state.z - behind * cosine - sine * side;
          life[cursor] = .6 + Math.random() * .4;
          cursor = (cursor + 1) % count;
          accumulator -= 1;
        }
      }
      xyz.needsUpdate = true;
      ages.needsUpdate = true;
    },
  };
}
