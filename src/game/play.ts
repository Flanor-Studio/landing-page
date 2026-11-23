import { createControls } from './controls';
import { createDriving } from './driving';
import type { createInterface } from './interface';
import { drawMap } from './map';
import { stations, type Station } from './layout';
import { createScene } from './scene';

export async function mountIsland(stage: HTMLElement, view: ReturnType<typeof createInterface>, showFallback: () => void) {
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-world-canvas]');
  if (!canvas) throw new Error('Missing island canvas');

  const game = createScene(canvas);
  const driving = createDriving(game.buildings, game.props);
  const events = new AbortController();
  const { signal } = events;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = createControls(stage, () => stage.dataset.world === 'ready' && !view.panel && !document.hidden, signal);
  let station: Station | undefined;
  let frame = 0;
  let last = 0;
  let time = 0;
  let mapTime = 0;
  let redraw = true;

  function reset() {
    controls.clear();
    driving.place();
    game.resetEffects();
    game.restoreScenery();
    updateStation();
    redraw = true;
    view.updateMap(driving.state);
    stage.focus({ preventScroll: true });
  }

  function updateStation() {
    const { x, z } = driving.state;
    station = stations.find(item => Math.hypot(item.x - x, item.z - z) < 4);
    view.setStation(station);
  }

  function drawFrame(dt: number) {
    if (dt > 0) driving.step(dt, controls.read());
    updateStation();
    time += dt;
    view.setSpeed(driving.state.speed);
    mapTime += dt;
    if (redraw || mapTime > .085) {
      view.updateMap(driving.state);
      mapTime = 0;
    }
    game.draw(dt, time, driving.state, station ? stations.indexOf(station) : -1, reduced.matches, redraw);
    view.updateLabels(game.project);
    redraw = false;
  }

  function render(timestamp: number) {
    frame = 0;
    if (document.hidden || signal.aborted) return;
    const dt = last ? Math.min(.055, (timestamp - last) / 1000) : 0;
    last = timestamp;
    if (!view.panel) drawFrame(dt);
    frame = requestAnimationFrame(render);
  }

  function resize() {
    game.resize(stage.clientWidth, stage.clientHeight);
    redraw = true;
  }

  function handleVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      controls.clear();
    } else if (!frame) {
      frame = requestAnimationFrame(render);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (view.panel) return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      reset();
    }
    if (event.code === 'KeyE' && station) {
      event.preventDefault();
      view.openStation(station);
    }
  }, { signal });
  stage.addEventListener('wheel', event => {
    if (view.panel || event.ctrlKey) return;
    event.preventDefault();
    game.zoomBy(Math.sign(event.deltaY) * .075);
    redraw = true;
  }, { passive: false, signal });
  document.addEventListener('visibilitychange', handleVisibility, { signal });

  function dispose() {
    events.abort();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    controls.clear();
    game.dispose();
  }

  canvas.addEventListener('webglcontextlost', () => {
    dispose();
    view.closePanel();
    showFallback();
  }, { once: true, signal });

  try {
    view.setMapRenderer(drawMap);
    resize();
    await game.prepare();
    signal.throwIfAborted();
    drawFrame(0);
    handleVisibility();
  } catch (cause) {
    if (!signal.aborted) dispose();
    throw cause;
  }

  return {
    reset,
    travel(destination: Station) {
      controls.clear();
      driving.place({ x: destination.x, z: destination.z, heading: destination.heading });
      game.resetEffects();
      updateStation();
      redraw = true;
      view.updateMap(driving.state);
    },
    visit() {
      if (station) view.openStation(station);
    },
    pauseInput() {
      controls.clear();
      driving.state.speed = 0;
      view.setSpeed(0);
    },
  };
}
