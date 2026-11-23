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
  [-16.6, 5], [-16.4, -6], [-10.5, -15.4], [-.5, -17.8], [10.2, -15],
  [17, -8], [17, 3.9], [13.8, 12], [6.9, 16.9], [-5.4, 17.8], [-13.9, 13],
], true, 135);

export const mainStreet = ribbon([[0, 17.9], [0, 8], [0, -4], [-.5, -17.8]], false, 52);

export const paths = [
  ribbon([[-16.5, 4.7], [-21, 4.7], [-23, 4.7]], false, 14),
  ribbon([[-.5, -17.6], [-.5, -21], [-.5, -24]], false, 14),
  ribbon([[16.9, -3.5], [21, -3.5], [23.5, -3.5]], false, 14),
  ribbon([[6.8, 16.8], [9, 21], [10.8, 23.6]], false, 14),
];

export function onIsland(x: number, z: number, margin = 0): boolean {
  const angle = Math.atan2(z / 33, x / 34);
  const shape = 1 + .056 * Math.sin(angle * 3 + .5) + .022 * Math.cos(angle * 7);
  return Math.hypot(x / 34, z / 33) < shape - .04 - margin / 33;
}

export function nearRoad(x: number, z: number, distance: number) {
  const squared = distance * distance;
  return [loop, mainStreet, ...paths].some(road => road.some(point => (point.x - x) ** 2 + (point.z - z) ** 2 < squared));
}

export function randomGenerator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
