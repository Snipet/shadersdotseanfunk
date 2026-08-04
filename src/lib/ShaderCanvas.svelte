<script>
  import { onMount } from 'svelte';
  import { ShaderRenderer } from './renderer.js';

  let { fragSource, playing, params, onCompile, onStats } = $props();

  let canvas;
  let renderer = $state(null);
  let unsupported = $state(false);

  let time = 0;
  const mouse = { x: -1, y: -1 };

  export function restart() {
    time = 0;
  }

  export function exportPNG() {
    if (!renderer?.ok) return Promise.resolve(null);
    renderer.resize();
    renderer.draw(time, mouse, params);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  onMount(() => {
    const r = new ShaderRenderer(canvas);
    if (!r.ok) {
      unsupported = true;
      return;
    }
    renderer = r;

    const dprOf = () => Math.min(2, window.devicePixelRatio || 1);
    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = dprOf();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (rect.height - (e.clientY - rect.top)) * dpr;
    };
    window.addEventListener('pointermove', onPointer);

    let raf = 0;
    let last = performance.now();
    let fps = 60;
    let statClock = 0;

    const frame = (now) => {
      const dt = Math.min(0.1, Math.max(0.0001, (now - last) / 1000));
      last = now;
      if (playing) time += dt;
      r.resize();
      r.draw(time, mouse, params);

      fps = fps * 0.92 + (1 / dt) * 0.08;
      statClock += dt;
      if (statClock >= 0.25) {
        statClock = 0;
        onStats?.({
          time,
          fps: Math.min(999, Math.round(fps)),
          w: canvas.width,
          h: canvas.height,
          gl: r.glVersion,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      r.dispose();
    };
  });

  $effect(() => {
    if (!renderer?.ok) return;
    const result = renderer.setShader(fragSource);
    onCompile?.(result);
  });
</script>

<canvas bind:this={canvas} class="shader-canvas"></canvas>

{#if unsupported}
  <div class="nogl">
    <p>WebGL isn't available in this browser, so the shader can't render.</p>
  </div>
{/if}

<style>
  .shader-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    background: var(--bg);
  }

  .nogl {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-dim);
    font-family: var(--mono);
  }
</style>
