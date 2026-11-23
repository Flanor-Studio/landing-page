import { createInterface, element } from './interface';
import type { mountIsland } from './play';

const driveKeys = new Set(['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space']);
const loadingLabel = 'در حال بارگذاری…';

export function initializeLanding(stage: HTMLElement) {
  const start = element<HTMLButtonElement>(stage, '[data-start]');
  const error = element<HTMLElement>(stage, '[data-world-error]');
  const map = element<HTMLDialogElement>(document, '[data-panel="map"]');
  const mapLoading = element<HTMLElement>(map, '[data-map-loading]');

  let island: ReturnType<typeof mountIsland> | undefined;
  let loading: Promise<typeof island> | undefined;
  let travelRequest = 0;

  function showFallback() {
    island = undefined;
    stage.dataset.world = 'unavailable';
    error.hidden = false;
  }

  function loadIsland() {
    if (island || stage.dataset.world === 'unavailable') return Promise.resolve(island);
    if (loading) return loading;

    stage.dataset.world = 'loading';
    start.disabled = true;
    start.textContent = loadingLabel;
    loading = import('./play').then(({ mountIsland }) => {
      island = mountIsland(stage, view, showFallback);
      return island;
    }).catch(cause => {
      showFallback();
      console.error('The island could not be loaded.', cause);
      return undefined;
    }).finally(() => {
      loading = undefined;
      start.disabled = false;
      start.textContent = 'شروع رانندگی';
    });
    return loading;
  }

  async function startDriving() {
    const game = await loadIsland();
    game?.start();
  }

  const view = createInterface(stage, {
    start: startDriving,
    home: () => island?.home(),
    reset: () => island?.reset(),
    async travel(station) {
      const request = ++travelRequest;
      if (!island && stage.dataset.world !== 'unavailable') mapLoading.textContent = loadingLabel;
      const game = await loadIsland();
      if (request !== travelRequest || view.panel !== 'map') return;
      mapLoading.textContent = '';
      if (!game) {
        view.openStation(station);
        return;
      }
      game.travel(station);
      view.closePanel();
      stage.focus({ preventScroll: true });
    },
    visit: () => island?.visit(),
    pauseInput: () => island?.pauseInput(),
  });

  map.addEventListener('close', () => {
    if (map.open) return;
    travelRequest += 1;
    mapLoading.textContent = '';
  });

  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyM' && !event.repeat && (!view.panel || view.panel === 'map')) {
      event.preventDefault();
      if (view.panel) view.closePanel();
      else view.open('map');
      return;
    }
    if (view.panel) return;
    if (event.code === 'Escape' && !event.repeat && stage.hasAttribute('data-exploring')) {
      view.open('guide');
      return;
    }
    if (stage.dataset.world !== 'idle' || !driveKeys.has(event.code)) return;
    if (!(event.target instanceof HTMLElement) || (!stage.contains(event.target) && event.target !== document.body)) return;
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.code === 'Space' && event.target.closest('button, a, summary')) return;
    event.preventDefault();
    void startDriving();
  });
}
