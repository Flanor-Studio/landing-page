import { createInterface, element } from './interface';
import type { mountIsland } from './play';

export async function initializeLanding(stage: HTMLElement) {
  const error = element<HTMLElement>(stage, '[data-world-error]');
  let island: Awaited<ReturnType<typeof mountIsland>> | undefined;

  function showFallback() {
    island = undefined;
    stage.dataset.world = 'unavailable';
    error.hidden = false;
  }

  try {
    const view = createInterface(stage, {
      reset: () => island?.reset(),
      travel(station) {
        if (!island) return;
        island.travel(station);
        view.closePanel();
        stage.focus({ preventScroll: true });
      },
      visit: () => island?.visit(),
      pauseInput: () => island?.pauseInput(),
    });

    const { mountIsland } = await import('./play');
    island = await mountIsland(stage, view, showFallback);
    view.ready();

    window.addEventListener('keydown', event => {
      if (!island || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === 'KeyM' && (!view.panel || view.panel === 'map')) {
        event.preventDefault();
        if (view.panel) view.closePanel();
        else view.open('map');
      }
      if (event.code === 'Escape' && !view.panel) view.open('guide');
    });
  } catch (cause) {
    showFallback();
    console.error('The island could not be loaded.', cause);
  }
}
