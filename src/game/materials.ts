import { Color, MeshLambertMaterial, type MeshLambertMaterialParameters, type Texture, Vector3 } from 'three';

export const sunPosition = new Vector3(-30, 47, 27);
const sunDirection = sunPosition.clone().normalize();
const sunlight = new Color('#ffe1bf').multiplyScalar(1.16);
const shadowInk = new Color('#762d91');
interface GrassMotion {
  wind: { value: number };
  tracks: { value: Texture };
  span: { value: number };
}

// A matte palette ramp, with real cast shadows tinted into the local surface colour.
export class IslandMaterial extends MeshLambertMaterial {
  constructor(parameters: MeshLambertMaterialParameters = {}, private readonly grass?: GrassMotion) {
    super({ ...parameters, toneMapped: false });
  }

  override customProgramCacheKey() {
    return this.grass ? 'island-grass' : 'island-matte';
  }

  override onBeforeCompile(shader: Parameters<MeshLambertMaterial['onBeforeCompile']>[0]) {
    shader.uniforms.islandSun = { value: sunlight };
    shader.uniforms.islandShadow = { value: shadowInk };
    shader.uniforms.islandSunDirection = { value: sunDirection };
    shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmap_pars_fragment>', `
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      uniform vec3 islandSun;
      uniform vec3 islandShadow;
      uniform vec3 islandSunDirection;
      ${this.grass ? 'varying float bladeHeight;' : ''}
    `).replace('#include <opaque_fragment>', `
      vec3 worldNormal = transformDirectionByInverseViewMatrix(normal, viewMatrix);
      float facing = ${this.grass ? '0.91' : 'dot(worldNormal, islandSunDirection)'};
      float faceShade = 1.0 - smoothstep(-0.35, 0.76, facing);
      float shade = max(faceShade * 0.68, (1.0 - getShadowMask()) * 0.93);
      ${this.grass ? 'shade = max(shade, (1.0 - smoothstep(0.0, 0.92, bladeHeight)) * 0.85);' : ''}
      vec3 lit = diffuseColor.rgb * islandSun;
      vec3 tinted = mix(diffuseColor.rgb * vec3(0.54, 0.30, 0.64), islandShadow, 0.25);
      outgoingLight = mix(lit, tinted, shade) + totalEmissiveRadiance;
      #include <opaque_fragment>
    `);

    if (!this.grass) return;
    shader.uniforms.islandWind = this.grass.wind;
    shader.uniforms.islandTracks = this.grass.tracks;
    shader.uniforms.islandTrackSpan = this.grass.span;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      uniform float islandWind;
      uniform sampler2D islandTracks;
      uniform float islandTrackSpan;
      varying float bladeHeight;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      bladeHeight = position.y;
      vec2 bladeOrigin = instanceMatrix[3].xz;
      float crushed = texture2D(islandTracks, bladeOrigin / islandTrackSpan + 0.5).r;
      float gust = sin(dot(bladeOrigin, vec2(0.51, 0.36)) - islandWind * 2.45);
      transformed.xz += vec2(0.22, 0.10) * bladeHeight * bladeHeight * gust * (1.0 - crushed);
      transformed.y *= mix(1.0, 0.07, crushed);
    `);
  }
}
