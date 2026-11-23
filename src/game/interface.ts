import type { drawMap } from './map';
import type { Point } from './layout';
import { spawn, stations, type Station } from './stations';

interface Actions {
  reset(): void;
  travel(station: Station): void;
  visit(): void;
  pauseInput(): void;
}

const digits = new Intl.NumberFormat('fa-IR', { useGrouping: false });
type Panel = 'map' | 'guide' | 'catalog' | 'project';

export function element<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error('Missing island element ' + selector);
  return node;
}

export function createInterface(stage: HTMLElement, actions: Actions) {
  const speed = element<HTMLOutputElement>(stage, '[data-speed]');
  const count = element<HTMLOutputElement>(stage, '[data-count]');
  const driveHud = element<HTMLElement>(stage, '.drive-hud');
  const nearby = element<HTMLElement>(stage, '[data-nearby]');
  const nearbyLabel = element<HTMLElement>(nearby, '[data-nearby-label]');
  const announcement = element<HTMLElement>(stage, '[data-announcement]');
  const mapCanvas = element<HTMLCanvasElement>(stage, '[data-mini-map]');
  const atlasCanvas = element<HTMLCanvasElement>(document, '[data-atlas]');
  const atlas = element<HTMLElement>(document, '.atlas');
  const panels = {
    map: element<HTMLDialogElement>(document, '[data-panel="map"]'),
    guide: element<HTMLDialogElement>(document, '[data-panel="guide"]'),
    catalog: element<HTMLDialogElement>(document, '[data-panel="catalog"]'),
    project: element<HTMLDialogElement>(document, '[data-panel="project"]'),
  };
  const labels = Array.from(stage.querySelectorAll<HTMLButtonElement>('[data-station]'));
  const status = new Set<string>();
  let active: HTMLDialogElement | undefined;
  let position: Point & { heading: number } = spawn;
  let mapRenderer: typeof drawMap | undefined;
  let mapContext: CanvasRenderingContext2D | null = null;
  let atlasContext: CanvasRenderingContext2D | null = null;
  let lastStation: Station | undefined;

  function open(which: Panel) {
    if (active === panels[which] && active.open) return;
    active?.close();
    active = panels[which];
    active.showModal();
    actions.pauseInput();
    if (which === 'map') renderMap(atlasContext);
  }

  function openStation(station: Station) {
    const { project } = station;
    const panel = panels.project;
    const comingSoon = project.status === 'coming-soon';
    const stop = element<HTMLElement>(panel, '[data-project-stop]');
    panel.style.setProperty('--station-color', project.color);
    element<HTMLElement>(panel, '[data-project-name]').textContent = project.name;
    stop.hidden = comingSoon;
    stop.textContent = project.stop;
    element<HTMLElement>(panel, '[data-project-details]').hidden = comingSoon;
    element<HTMLElement>(panel, '[data-project-coming-soon]').hidden = !comingSoon;
    if (!comingSoon) {
      element<HTMLImageElement>(panel, '[data-project-art]').src = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}icons/${project.id}.png`;
      element<HTMLElement>(panel, '[data-project-english]').textContent = project.english;
      element<HTMLElement>(panel, '[data-project-description]').textContent = project.description;
      for (const links of panel.querySelectorAll<HTMLElement>('[data-project-links]')) {
        links.hidden = links.dataset.projectLinks !== project.id;
      }
    }
    open('project');
  }

  for (const dialog of Object.values(panels)) {
    dialog.addEventListener('close', () => {
      if (active === dialog && !dialog.open) active = undefined;
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const { left, top, right, bottom } = dialog.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
    });
  }

  for (const trigger of document.querySelectorAll<HTMLElement>('[data-open]')) {
    trigger.addEventListener('click', event => {
      if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)) return;
      event.preventDefault();
      open(trigger.dataset.open as Panel);
    });
  }

  for (const trigger of document.querySelectorAll<HTMLElement>('[data-station]')) {
    trigger.addEventListener('click', () => openStation(stations[Number(trigger.dataset.station)]));
  }

  for (const trigger of panels.map.querySelectorAll<HTMLButtonElement>('[data-travel]')) {
    trigger.addEventListener('click', () => actions.travel(stations[Number(trigger.dataset.travel)]));
  }

  element(stage, '[data-home]').addEventListener('click', event => {
    event.preventDefault();
    actions.reset();
  });
  element(stage, '[data-reset]').addEventListener('click', actions.reset);
  element(stage, '[data-visit]').addEventListener('click', actions.visit);

  const fullscreen = element<HTMLButtonElement>(panels.guide, '[data-fullscreen]');
  if (document.fullscreenEnabled) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        fullscreen.textContent = 'تمام‌صفحه در دسترس نیست';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه';
    });
  }

  function ready() {
    for (const selector of ['[data-game-header]', '[data-stations]', '[data-game-ui]', '[data-touch]']) {
      element<HTMLElement>(stage, selector).hidden = false;
    }
    stage.dataset.world = 'ready';
  }

  function setStation(station: Station | undefined) {
    if (lastStation === station) return;
    lastStation = station;
    nearby.hidden = !station;
    labels.forEach((label, index) => label.toggleAttribute('data-near', stations[index] === station));
    if (!station) return;
    nearbyLabel.textContent = 'بازدید از ' + station.project.name;
    if (!status.has(station.project.id)) {
      status.add(station.project.id);
      count.value = digits.format(status.size) + ' / ' + digits.format(stations.length);
      announcement.textContent = 'به ایستگاه ' + station.project.name + ' رسیدی.';
    }
  }

  function setSpeed(value: number) {
    const kilometers = Math.min(99, Math.round(Math.abs(value) * 3.6));
    const formatted = String(kilometers).padStart(2, '0');
    if (speed.value === formatted) return;
    speed.value = formatted;
    driveHud.style.setProperty('--speed', (kilometers / 90).toFixed(3));
  }

  function renderMap(context: CanvasRenderingContext2D | null) {
    if (context) mapRenderer?.(context, position, status);
  }

  function setMapRenderer(renderer: typeof drawMap) {
    if (mapRenderer) return;
    mapRenderer = renderer;
    mapContext = mapCanvas.getContext('2d');
    atlasContext = atlasCanvas.getContext('2d');
    atlas.hidden = !atlasContext;
    if (active === panels.map) renderMap(atlasContext);
  }

  function updateMap(pose: Point & { heading: number }) {
    position = pose;
    renderMap(mapContext);
  }

  function updateLabels(project: (x: number, y: number, z: number) => Point2) {
    const { clientWidth, clientHeight } = stage;
    labels.forEach((label, index) => {
      const station = stations[index];
      const { x, y } = project(station.buildingX, station.labelY, station.buildingZ);
      const visible = x > 45 && x < clientWidth - 45 && y > 100 && y < clientHeight - 135;
      label.hidden = !visible;
      if (visible) label.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px,0) translate(-50%,-100%)`;
    });
  }

  return {
    open,
    openStation,
    ready,
    setStation,
    setSpeed,
    setMapRenderer,
    updateMap,
    updateLabels,
    get panel() { return active?.open ? active.dataset.panel as Panel : undefined; },
    closePanel() { active?.close(); },
  };
}

interface Point2 { x: number; y: number }
