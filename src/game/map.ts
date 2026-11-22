import { coast, loop, mainStreet, paths, stations, type Point } from './layout';

export function drawMap(context: CanvasRenderingContext2D, pose: Point & { heading: number }, visited: ReadonlySet<string>) {
  const { width, height } = context.canvas;
  const scale = Math.min(width, height) / 80;
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(scale, scale);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  function path(points: readonly Point[], close = false) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].z);
    for (const point of points.slice(1)) context.lineTo(point.x, point.z);
    if (close) context.closePath();
  }

  path(coast, true);
  context.fillStyle = '#bc8548';
  context.fill();
  context.strokeStyle = '#f1ad94';
  context.lineWidth = 1.2;
  context.stroke();

  context.strokeStyle = '#f9c18c';
  for (const route of [loop, mainStreet, ...paths]) {
    context.lineWidth = route === loop || route === mainStreet ? 3.25 : 1.2;
    path(route);
    context.stroke();
  }

  for (const station of stations) {
    const { project, x, z } = station;
    context.beginPath();
    context.arc(x, z, 2.25, 0, Math.PI * 2);
    context.fillStyle = visited.has(project.id) ? project.color : '#523360';
    context.fill();
    context.strokeStyle = project.color;
    context.lineWidth = 1.05;
    context.stroke();
  }

  context.translate(pose.x, pose.z);
  context.rotate(-pose.heading);
  context.beginPath();
  context.moveTo(0, 3.65);
  context.lineTo(-2.27, -2.45);
  context.lineTo(0, -1.28);
  context.lineTo(2.27, -2.45);
  context.closePath();
  context.strokeStyle = '#432849';
  context.lineWidth = 1.15;
  context.stroke();
  context.fillStyle = '#fff2bf';
  context.fill();
  context.restore();
}
