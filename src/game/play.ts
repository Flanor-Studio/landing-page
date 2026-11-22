import { createControls } from './controls';
import { createDriving } from './driving';
import { createInterface } from './interface';
import { stations, type Station } from './layout';
import { createScene } from './scene';

export function mountIsland(stage: HTMLElement, showFallback: () => void) {
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-world-canvas]');
  if (!canvas) throw new Error('Missing island canvas');

  let game: ReturnType<typeof createScene> | undefined;
  let driving: ReturnType<typeof createDriving> | undefined;
  let controls: ReturnType<typeof createControls> | undefined;
  let exploring = false;
  let station: Station | undefined;
  let frame = 0;
  let last = 0;
  let time = 0;
  let mapTime = 0;
  let redraw = true;

  function explore() {
    if (!game || exploring) return;
    exploring = true;
    view.setExploring(true);
  }

  function reset(home = false) {
    if (!driving || !game) return;
    controls?.clear();
    driving.place();
    game.resetEffects();
    game.restoreScenery();
    if (home) {
      exploring = false;
      view.setExploring(false);
    }
    updateStation();
    redraw = true;
    view.updateMap(driving.state);
    stage.focus({ preventScroll: true });
  }

  function updateStation() {
    if (!driving) return;
    const { x, z } = driving.state;
    station = stations.find(item => Math.hypot(item.x - x, item.z - z) < 4);
    view.setStation(station);
  }

  const view = createInterface(stage, {
    start() {
      if (!game) return;
      explore();
      stage.focus({ preventScroll: true });
    },
    home: () => reset(true),
    reset: () => reset(),
    travel(destination) {
      if (!driving || !game) return false;
      controls?.clear();
      driving.place({ x: destination.x, z: destination.z, heading: destination.heading });
      game.resetEffects();
      explore();
      updateStation();
      redraw = true;
      view.updateMap(driving.state);
      return true;
    },
    visit() {
      if (station) view.openStation(station);
    },
    pauseInput() {
      controls?.clear();
      if (driving) {
        driving.state.speed = 0;
        view.setSpeed(0);
      }
    },
  });

  game = createScene(canvas);
  driving = createDriving(game.buildings, game.props);
  const events = new AbortController();
  const { signal } = events;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  controls = createControls(stage, () => Boolean(game) && !view.panel && !document.hidden, signal);

  function render(timestamp: number) {
    frame = 0;
    if (document.hidden || !game || !driving || !controls) return;
    const dt = last ? Math.min(.055, (timestamp - last) / 1000) : 0;
    last = timestamp;
    if (!view.panel) {
      const input = controls.read();
      if (input.throttle || input.jump) explore();
      if (dt > 0) driving.step(dt, input);
      updateStation();
      time += dt;
      view.setSpeed(driving.state.speed);
      mapTime += dt;
      if (redraw || mapTime > .085) {
        view.updateMap(driving.state);
        mapTime = 0;
      }
      game.draw(dt, time, driving.state, exploring, station ? stations.indexOf(station) : -1, reduced.matches, redraw);
      view.updateLabels(game.project);
      redraw = false;
    }
    frame = requestAnimationFrame(render);
  }

  function resize() {
    game?.resize(stage.clientWidth, stage.clientHeight);
    redraw = true;
  }

  function handleVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      controls?.clear();
    } else if (!frame && game) {
      frame = requestAnimationFrame(render);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyM' && (!view.panel || view.panel === 'map')) {
      event.preventDefault();
      if (view.panel) view.closePanel();
      else view.open('map');
    }
    if (view.panel) return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      reset();
    }
    if (event.code === 'KeyE' && station) {
      event.preventDefault();
      view.openStation(station);
    }
    if (event.code === 'Escape' && exploring) view.open('guide');
  }, { signal });
  stage.addEventListener('wheel', event => {
    if (view.panel || event.ctrlKey) return;
    event.preventDefault();
    game?.zoomBy(Math.sign(event.deltaY) * .075);
    redraw = true;
  }, { passive: false, signal });
  document.addEventListener('visibilitychange', handleVisibility, { signal });

  canvas.addEventListener('webglcontextlost', () => {
    events.abort();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    controls?.clear();
    game?.dispose();
    game = undefined;
    driving = undefined;
    view.setExploring(false);
    showFallback();
  }, { once: true });

  view.ready();
  resize();
  render(performance.now());
}
