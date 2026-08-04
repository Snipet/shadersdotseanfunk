# shaders.seanfunk

A one-page GLSL live-coding environment in the spirit of
[The Book of Shaders editor](https://thebookofshaders.com/edit.php) and
ShaderToy, built for designing **SDF-based synthesizer UI components** —
knobs, faders, toggles, meters.

Built with Svelte 5 (runes), Vite, CodeMirror 6, and raw WebGL. Fully static:
`npm run build` produces a `dist/` folder you can host anywhere.

## Features

- **Live compile** as you type (debounced), Book of Shaders style — the canvas
  keeps showing the last good shader while you have errors.
- **Inline error reporting** — compile errors are parsed, highlighted on the
  offending lines, and listed under the editor; click one to jump to it.
- **SDF presets** for synth components: rotary knob, fader, toggle switch,
  VU meter, and a documented starter template.
- **`u_param0..3` sliders** — sweep a knob's value or a fader's position while
  you design, without touching the code.
- **Book of Shaders uniforms**: `u_resolution`, `u_time`, `u_mouse` — most BoS
  examples paste straight in. GLSL ES 1.00 by default; `#version 300 es`
  fragments also work on WebGL2.
- **Share links** (code encoded in the URL hash), **PNG export**,
  play/pause/restart, FPS/resolution readout, autosave to localStorage.

## Uniforms

| Uniform        | Type    | Meaning                                    |
| -------------- | ------- | ------------------------------------------ |
| `u_resolution` | `vec2`  | Canvas size in physical pixels             |
| `u_time`       | `float` | Seconds since load (pausable)              |
| `u_mouse`      | `vec2`  | Mouse position in pixels, origin bottom-left |
| `u_param0..3`  | `float` | The P0–P3 panel sliders, 0.0–1.0           |

Declare only the ones you use — nothing is injected into your source, so line
numbers in error messages match the editor exactly.

## Shortcuts

- `Ctrl/⌘ + Enter` — compile immediately (skips the debounce)
- `Ctrl/⌘ + S` — save to localStorage (also happens automatically)
- `Tab` — indent (press `Esc` then `Tab` to move focus out)

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # static site in dist/
npm run preview   # serve the built site
```
