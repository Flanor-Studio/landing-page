import { CatmullRomCurve3, Vector3 } from 'three';
export { spawn, stations, type Station } from './stations';

export interface Point {
  x: number;
  z: number;
}

export interface Footprint extends Point {
  halfX: number;
  halfZ: number;
  angle?: number;
}

export interface Impact {
  directionX: number;
  directionZ: number;
  speed: number;
}

export interface Breakable extends Footprint {
  height: number;
  broken: boolean;
  smash(impact: Impact): void;
}

export const coast = Array.from({ length: 96 }, (_, index) => {
  const angle = index / 96 * Math.PI * 2;
  const shape = 1 + .056 * Math.sin(angle * 3 + .5) + .022 * Math.cos(angle * 7);
  return { x: Math.cos(angle) * 34 * shape, z: Math.sin(angle) * 33 * shape };
});

export function ribbon(points: readonly (readonly [number, number])[], closed = false, segments = 70) {
  return new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), closed).getSpacedPoints(segments);
}

export const loop = ribbon([
  [-16.6, 5], [-17.7, -4.9], [-13.5, -12.5], [-7.1, -16.7], [-.5, -17.8],
  [8.6, -16.4], [14.4, -12.9], [17, -3.5], [18, 4.7], [14.2, 12.1],
  [6.9, 16.9], [-3.1, 18.7], [-11, 16], [-15.3, 11.3],
], true, 135);

export const mainStreet = ribbon([[-3.1, 18.7], [0, 12.8], [1, 6.9], [3.85, -.5], [4.35, -7], [2.5, -12.5], [-.5, -17.8]], false, 64);

export const paths = [
  ribbon([[-16.5, 4.7], [-21, 4.7], [-23, 4.7]], false, 14),
  ribbon([[-.5, -17.6], [-.5, -21], [-.5, -24]], false, 14),
  ribbon([[16.9, -3.5], [21, -3.5], [23.5, -3.5]], false, 14),
  ribbon([[6.8, 16.8], [9.2, 20.8], [8.5, 24], [4.3, 26.2], [-2.3, 26.7], [-7.2, 24.4], [-11, 16]], false, 48),
];

export const monument = { x: -6.4, z: -4.9, angle: Math.atan(.5) };
export const pond = { x: 9.1, z: 4.7, radiusX: 3.65, radiusZ: 2.85 };

const plazaHalfWidth = 7.45;
const plazaHalfDepth = 4.45;
const plazaCornerRadius = 1.75;
const plazaCenterZ = 1.75;
const plazaCos = Math.cos(monument.angle);
const plazaSin = Math.sin(monument.angle);

export function plazaPoint(x: number, z: number): Point {
  return {
    x: monument.x + x * plazaCos + z * plazaSin,
    z: monument.z - x * plazaSin + z * plazaCos,
  };
}

export function plazaOutline(inset = 0) {
  return [0, 1, 2, 3].flatMap(corner => {
    const x = (corner === 0 || corner === 3 ? 1 : -1) * (plazaHalfWidth - plazaCornerRadius);
    const z = plazaCenterZ + (corner < 2 ? 1 : -1) * (plazaHalfDepth - plazaCornerRadius);
    return Array.from({ length: 11 }, (_, step) => {
      const angle = (corner + step / 10) * Math.PI / 2;
      return plazaPoint(x + Math.cos(angle) * (plazaCornerRadius - inset), z + Math.sin(angle) * (plazaCornerRadius - inset));
    });
  });
}

const forecourtEnd = plazaPoint(1.9, 5.45);
export const plazaWalk = ribbon([
  [forecourtEnd.x, forecourtEnd.z], [-.05, 2.9], [2.55, 3.2],
], false, 18);

export function isInPlaza(x: number, z: number) {
  const dx = x - monument.x;
  const dz = z - monument.z;
  const side = Math.abs(dx * plazaCos - dz * plazaSin) - (plazaHalfWidth - plazaCornerRadius);
  const front = Math.abs(dx * plazaSin + dz * plazaCos - plazaCenterZ) - (plazaHalfDepth - plazaCornerRadius);
  return Math.hypot(Math.max(0, side), Math.max(0, front)) < plazaCornerRadius + .12;
}

export function onIsland(x: number, z: number, margin = 0): boolean {
  const angle = Math.atan2(z / 33, x / 34);
  const shape = 1 + .056 * Math.sin(angle * 3 + .5) + .022 * Math.cos(angle * 7);
  return Math.hypot(x / 34, z / 33) < shape - .04 - margin / 33;
}

export function nearRoad(x: number, z: number, distance: number) {
  const squared = distance * distance;
  return [loop, mainStreet, plazaWalk, ...paths].some(road => road.some(point => (point.x - x) ** 2 + (point.z - z) ** 2 < squared));
}

export function randomGenerator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
