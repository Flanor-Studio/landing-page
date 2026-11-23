# Flanor Studio

A Persian-language portfolio you explore by driving a Peykan around a 3D island. Visit the Pazelit, Kif Koochooloo, and Kashi Kari exhibits by road or use the map to travel directly. The game catalog also works without WebGL.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

| Control | Action |
| --- | --- |
| WASD or arrow keys | Drive |
| Space | Jump |
| Shift | Boost |
| X | Brake |
| E | Visit a nearby exhibit |
| M | Open or close the map |
| R | Return to the starting point and restore the scenery |
| Escape | Open the driving guide or close a dialog |
| Mouse wheel | Zoom |

Trees, crates, lamps, and other scenery break on impact without slowing the car. The exhibit buildings are solid. On touch screens, use the on-screen steering, acceleration, brake, boost, and jump buttons.

```sh
npm run check
npm run build
```

Astro generates a static site in `dist/`. The interface uses [Vazirmatn](https://github.com/rastikerdar/vazirmatn) for Persian and Space Grotesk for Latin. The two lines of the plaza sign use right-to-left outlines from Vazirmatn at weights 650 and 900.

The material and grass techniques draw on [Bruno Simon’s 2025 portfolio](https://github.com/brunosimon/folio-2025). The bench, lantern, streetlight, and cherry tree models in `src/assets/island-props.glb` were adapted from the [portfolio source at 70764a9](https://github.com/brunosimon/folio-2025/tree/70764a94756cc4de564e493c8ba46c4b5fe03ed1/static) and are distributed with [its MIT license](public/licenses/bruno-simon.txt).

## GitHub Pages

Set **Settings → Pages → Source** to **GitHub Actions**. The included workflow builds and publishes pushes to `main`. Astro derives the default host and subpath from `GITHUB_REPOSITORY`. Optional repository variables `PAGES_ORIGIN` and `PAGES_BASE` support a custom Pages URL.
