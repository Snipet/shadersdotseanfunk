<script>
  import ShaderCanvas from './lib/ShaderCanvas.svelte';
  import Editor from './lib/Editor.svelte';
  import ParamPanel from './lib/ParamPanel.svelte';
  import { presets, DEFAULT_PRESET_ID } from './lib/presets.js';
  import { encodeShare, decodeShare } from './lib/share.js';

  const STORAGE_KEY = 'shadersdotseanfunk.code.v1';
  const DEBOUNCE_MS = 250;

  function initialCode() {
    const hash = window.location.hash;
    if (hash.startsWith('#g=')) {
      const decoded = decodeShare(hash.slice(3));
      if (decoded) return decoded;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // storage unavailable (private mode etc.) — fall through
    }
    return presets.find((p) => p.id === DEFAULT_PRESET_ID).code;
  }

  const startingCode = initialCode();
  let code = $state(startingCode);
  let liveCode = $state(startingCode);
  let playing = $state(true);
  let params = $state([0.65, 0.5, 0.5, 0.5]);
  let errors = $state([]);
  let stats = $state({ time: 0, fps: 0, w: 0, h: 0, gl: '' });
  let showEditor = $state(true);
  let toast = $state('');

  let canvasComp = $state();
  let editorComp = $state();
  let debounceTimer;
  let toastTimer;

  const currentPresetId = $derived(
    presets.find((p) => p.code === code)?.id ?? 'custom'
  );

  function showToast(message) {
    toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 1800);
  }

  function saveNow() {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage unavailable — nothing to do
    }
  }

  function onCodeChange(next) {
    code = next;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      liveCode = next;
      saveNow();
    }, DEBOUNCE_MS);
  }

  function forceCompile() {
    clearTimeout(debounceTimer);
    liveCode = code;
    saveNow();
  }

  function loadPreset(id) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    clearTimeout(debounceTimer);
    code = preset.code;
    liveCode = preset.code;
    params = [...preset.params];
    saveNow();
  }

  function onCompile(result) {
    errors = result.errors;
  }

  async function exportPNG() {
    const blob = await canvasComp?.exportPNG();
    if (!blob) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const name = currentPresetId === 'custom' ? 'shader' : currentPresetId;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${stamp}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('PNG saved');
  }

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}#g=${encodeShare(code)}`;
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      showToast('Link is in the address bar');
    }
  }

  function onKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === 'Enter') {
      if (!e.defaultPrevented) forceCompile();
      e.preventDefault();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveNow();
      showToast('Saved');
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<ShaderCanvas
  bind:this={canvasComp}
  fragSource={liveCode}
  {playing}
  {params}
  {onCompile}
  onStats={(s) => (stats = s)}
/>

<header class="topbar">
  <div class="brand">
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#131722" stroke="var(--accent)" stroke-width="2.5" />
      <line x1="16" y1="16" x2="9.5" y2="9.5" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" />
    </svg>
    <span class="name">shaders<span class="dot">.</span>seanfunk</span>
    <span class="tag">SDF component lab</span>
  </div>

  <div class="controls">
    <select
      class="btn select"
      id="preset-select"
      aria-label="Load preset"
      onchange={(e) => loadPreset(e.currentTarget.value)}
    >
      {#if currentPresetId === 'custom'}
        <option value="custom" selected disabled>custom</option>
      {/if}
      {#each presets as preset (preset.id)}
        <option value={preset.id} selected={preset.id === currentPresetId}>
          {preset.name}
        </option>
      {/each}
    </select>

    <button
      class="btn"
      title={playing ? 'Pause' : 'Play'}
      aria-label={playing ? 'Pause' : 'Play'}
      onclick={() => (playing = !playing)}
    >
      {#if playing}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="5" height="16" rx="1" />
          <rect x="14" y="4" width="5" height="16" rx="1" />
        </svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,4 20,12 6,20" />
        </svg>
      {/if}
    </button>

    <button
      class="btn"
      title="Restart time"
      aria-label="Restart time"
      onclick={() => canvasComp?.restart()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    </button>

    <button class="btn" title="Export PNG" aria-label="Export PNG" onclick={exportPNG}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>

    <button class="btn" title="Copy share link" aria-label="Copy share link" onclick={share}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </button>

    <button
      class="btn"
      class:on={showEditor}
      title="Toggle code panel"
      aria-label="Toggle code panel"
      onclick={() => (showEditor = !showEditor)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    </button>
  </div>
</header>

{#if showEditor}
  <section class="editor-panel">
    <Editor
      bind:this={editorComp}
      {code}
      {errors}
      onChange={onCodeChange}
      onForceCompile={forceCompile}
    />
    <footer class="status" data-ok={errors.length === 0}>
      {#if errors.length === 0}
        <span class="ok-dot" aria-hidden="true"></span>
        <span>compiled</span>
        <span class="dim">{stats.time.toFixed(1)}s</span>
        <span class="dim">{stats.fps} fps</span>
        <span class="dim">{stats.w}&times;{stats.h}</span>
        <span class="dim">{stats.gl}</span>
        <span class="spacer"></span>
        <span class="hint">Ctrl/&#8984;+Enter compiles now</span>
      {:else}
        <div class="err-head">
          {errors.length} error{errors.length === 1 ? '' : 's'} — showing last
          good compile
        </div>
        <div class="err-list">
          {#each errors as err, i (i)}
            <button class="err" onclick={() => editorComp?.goToLine(err.line)}>
              <span class="lnum">{err.line > 0 ? `L${err.line}` : '—'}</span>
              <span class="msg">{err.message}</span>
            </button>
          {/each}
        </div>
      {/if}
    </footer>
  </section>
{:else}
  <button
    class="chip"
    data-ok={errors.length === 0}
    title="Show code panel"
    onclick={() => (showEditor = true)}
  >
    {#if errors.length === 0}
      <span class="ok-dot" aria-hidden="true"></span>
      {stats.fps} fps · {stats.time.toFixed(1)}s · {stats.w}&times;{stats.h}
    {:else}
      <span class="err-dot" aria-hidden="true"></span>
      {errors.length} error{errors.length === 1 ? '' : 's'}
    {/if}
  </button>
{/if}

<ParamPanel {params} onParam={(i, v) => (params[i] = v)} />

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    z-index: 30;
    pointer-events: none;
    background: linear-gradient(rgba(5, 6, 9, 0.55), rgba(5, 6, 9, 0));
  }

  .topbar > * {
    pointer-events: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    user-select: none;
    -webkit-user-select: none;
  }

  .brand .name {
    font-family: var(--mono);
    font-size: 14px;
    letter-spacing: 0.01em;
    color: var(--text);
  }

  .brand .dot {
    color: var(--accent);
  }

  .brand .tag {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-faint);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    padding: 3px 8px;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 24px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%238b95a5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    font-family: var(--mono);
    font-size: 12px;
  }

  .select option {
    background: var(--panel-solid);
    color: var(--text);
  }

  .editor-panel {
    position: fixed;
    left: 12px;
    top: 54px;
    bottom: 12px;
    width: min(46vw, 700px);
    min-width: 340px;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    z-index: 20;
  }

  .status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 7px 12px;
    border-top: 1px solid var(--panel-border);
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
  }

  .status[data-ok='false'] {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .dim {
    color: var(--text-dim);
  }

  .spacer {
    flex: 1;
  }

  .hint {
    color: var(--text-faint);
  }

  .ok-dot,
  .err-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex: none;
  }

  .ok-dot {
    background: var(--ok);
    box-shadow: 0 0 6px rgba(52, 211, 153, 0.7);
  }

  .err-dot {
    background: var(--error);
    box-shadow: 0 0 6px rgba(255, 107, 122, 0.7);
  }

  .err-head {
    color: var(--error);
  }

  .err-list {
    max-height: 110px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .err {
    display: flex;
    gap: 8px;
    align-items: baseline;
    text-align: left;
    background: none;
    border: none;
    padding: 2px 4px;
    border-radius: 6px;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
  }

  .err:hover {
    background: rgba(255, 107, 122, 0.1);
    color: var(--text);
  }

  .err .lnum {
    color: var(--error);
    flex: none;
    min-width: 32px;
  }

  .err .msg {
    word-break: break-word;
  }

  .chip {
    position: fixed;
    left: 12px;
    bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: var(--panel);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    cursor: pointer;
    z-index: 20;
  }

  .chip[data-ok='false'] {
    color: var(--error);
    border-color: rgba(255, 107, 122, 0.4);
  }

  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: var(--panel-solid);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--accent);
    box-shadow: var(--shadow);
    z-index: 40;
    animation: toast-in 160ms ease;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (max-width: 860px) {
    .editor-panel {
      left: 8px;
      right: 8px;
      width: auto;
      min-width: 0;
      top: auto;
      bottom: 8px;
      height: 52vh;
    }

    .brand .tag {
      display: none;
    }
  }
</style>
