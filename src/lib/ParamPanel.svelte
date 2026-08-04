<script>
  let { params, solid = false, onParam } = $props();
</script>

<aside class="params" class:solid>
  <div class="params-title">uniforms</div>
  {#each params as value, i}
    <label class="row">
      <span class="name">u_param{i}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        {value}
        oninput={(e) => onParam(i, +e.currentTarget.value)}
      />
      <span class="val">{value.toFixed(2)}</span>
    </label>
  {/each}
</aside>

<style>
  .params {
    position: fixed;
    right: 12px;
    bottom: 12px;
    width: 250px;
    padding: 10px 14px 12px;
    background: var(--panel);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    z-index: 20;
  }

  .params.solid {
    background: var(--panel-solid);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .params-title {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 8px;
  }

  .row {
    display: grid;
    grid-template-columns: 70px 1fr 36px;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
  }

  .name {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
  }

  .val {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 22px;
    background: transparent;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 13px;
    height: 13px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
    box-shadow: 0 0 8px rgba(94, 234, 212, 0.35);
  }

  input[type='range']::-moz-range-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
  }

  input[type='range']::-moz-range-thumb {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
    box-shadow: 0 0 8px rgba(94, 234, 212, 0.35);
  }

  @media (max-width: 860px) {
    .params {
      right: 8px;
      bottom: auto;
      top: 96px;
      width: 210px;
    }
  }
</style>
