import { projects } from '../projects';

export const spawn = { x: 0, z: 10.6, heading: Math.PI };

export const stations = [
  { project: projects[0], x: -16.6, z: 5, buildingX: -23, buildingZ: 5, labelY: 6.8, heading: Math.PI },
  { project: projects[1], x: -0.5, z: -17.8, buildingX: -0.5, buildingZ: -24.3, labelY: 7.1, heading: Math.PI / 2 },
  { project: projects[2], x: 17, z: -3.5, buildingX: 24, buildingZ: -3.5, labelY: 7.5, heading: Math.PI },
] as const;

export type Station = (typeof stations)[number];
