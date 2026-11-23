import { coast, loop, mainStreet, paths, plazaOutline, plazaPoint, plazaWalk, pond, stations, type Point } from './layout';

const mapSpan = 78;
export const atlasSize = { width: 768, height: 500 };

export function atlasPosition({ x, z }: Point) {
  const scale = atlasSize.height / mapSpan;
  return {
    left: 50 + x * scale / atlasSize.width * 100,
    top: 50 + z * scale / atlasSize.height * 100,
  };
}

export function drawMap(context: CanvasRenderingContext2D, pose: Point & { heading: number }, visited: ReadonlySet<string>, atlas = false) {
  const { width, height } = context.canvas;
  const scale = Math.min(width, height) / mapSpan;
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(scale, scale);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  function path(points: readonly Point[], close = false, size = 1) {
    context.beginPath();
    context.moveTo(points[0].x * size, points[0].z * size);
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      context.lineTo(point.x * size, point.z * size);
    }
    if (close) context.closePath();
  }

  function line(points: readonly Point[], width: number, color: string) {
    path(points);
    context.lineWidth = width;
    context.strokeStyle = color;
    context.stroke();
  }

  path(coast, true, 1.07);
  context.strokeStyle = '#b8e4d445';
  context.lineWidth = .65;
  context.stroke();

  path(coast, true);
  context.fillStyle = '#d4b789';
  context.fill();
  context.strokeStyle = '#ffe0a9';
  context.lineWidth = .64;
  context.stroke();

  path(coast, true, .879);
  context.fillStyle = '#7e955f';
  context.fill();

  for (const route of paths) line(route, 1.65, '#e1c78e');
  line(plazaWalk, 2.8, '#f3e3bf');
  for (const route of [loop, mainStreet]) line(route, 5.45, '#a17d63');
  for (const route of [loop, mainStreet]) line(route, 4.1, '#eed0a0');
  path(plazaOutline(), true);
  context.fillStyle = '#f3e3bf';
  context.fill();

  context.beginPath();
  context.ellipse(pond.x, pond.z, pond.radiusX, pond.radiusZ, 0, 0, Math.PI * 2);
  context.fillStyle = '#438e8a';
  context.fill();
  context.lineWidth = .65;
  context.strokeStyle = '#e9d6a8';
  context.stroke();

  const studio = plazaPoint(0, .95);
  context.save();
  context.translate(studio.x, studio.z);
  context.rotate(Math.PI / 4);
  context.fillStyle = '#204d51';
  context.fillRect(-1.46, -1.46, 2.92, 2.92);
  context.restore();

  if (!atlas) {
    for (const { project, x, z } of stations) {
      context.beginPath();
      context.arc(x, z, 2.25, 0, Math.PI * 2);
      context.fillStyle = visited.has(project.id) ? project.color : '#253b43';
      context.fill();
      context.strokeStyle = project.color;
      context.lineWidth = 1.02;
      context.stroke();
    }
  }

  context.translate(pose.x, pose.z);
  context.rotate(-pose.heading);
  context.beginPath();
  context.moveTo(0, 3.65);
  context.lineTo(-2.27, -2.45);
  context.lineTo(0, -1.28);
  context.lineTo(2.27, -2.45);
  context.closePath();
  context.strokeStyle = '#20333b';
  context.lineWidth = 1.05;
  context.stroke();
  context.fillStyle = '#fff7d8';
  context.fill();
  context.restore();
}
