// Minimal fullscreen-fragment-shader renderer, Book of Shaders style.
// The user's fragment shader declares whichever uniforms it needs; anything
// from UNIFORM_NAMES that exists in the program gets fed every frame.

const VERT_100 = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const VERT_300 = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const UNIFORM_NAMES = [
  'u_resolution',
  'u_time',
  'u_mouse',
  'u_param0',
  'u_param1',
  'u_param2',
  'u_param3',
];

const CONTEXT_OPTS = {
  alpha: false,
  antialias: true,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true, // needed for PNG export
};

function parseShaderLog(log) {
  const errors = [];
  for (const line of log.split('\n')) {
    const m = line.match(/ERROR:\s*\d+:(\d+)\s*:\s*(.*)/i);
    if (m) {
      errors.push({ line: parseInt(m[1], 10), message: m[2].trim() });
    }
  }
  if (errors.length === 0 && log.trim()) {
    errors.push({ line: 0, message: log.trim() });
  }
  return errors;
}

export class ShaderRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl =
      canvas.getContext('webgl2', CONTEXT_OPTS) ||
      canvas.getContext('webgl', CONTEXT_OPTS);
    this.ok = !!this.gl;
    if (!this.ok) return;

    this.isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' &&
      this.gl instanceof WebGL2RenderingContext;
    this.glVersion = this.isWebGL2 ? 'webgl2' : 'webgl1';
    this.program = null;
    this.uniforms = {};
    this.lastSource = null;
    this.lost = false;

    this._onLost = (e) => {
      e.preventDefault();
      this.lost = true;
    };
    this._onRestored = () => {
      this.lost = false;
      this._init();
      if (this.lastSource) this.setShader(this.lastSource);
    };
    canvas.addEventListener('webglcontextlost', this._onLost);
    canvas.addEventListener('webglcontextrestored', this._onRestored);

    this._init();
  }

  _init() {
    const gl = this.gl;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    // One triangle that covers the whole clip space.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    this.vert100 = this._compile(gl.VERTEX_SHADER, VERT_100);
    this.vert300 = this.isWebGL2 ? this._compile(gl.VERTEX_SHADER, VERT_300) : null;
    this.program = null;
    this.uniforms = {};
  }

  _compile(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  /**
   * Compile and link a fragment shader. On failure the previous program is
   * kept so the canvas keeps rendering the last good shader.
   * Returns { ok, errors: [{ line, message }] }.
   */
  setShader(fragSource) {
    if (!this.ok || this.lost) return { ok: false, errors: [] };
    this.lastSource = fragSource;
    const gl = this.gl;

    const is300 = /^\s*#version\s+300\s+es/.test(fragSource);
    if (is300 && !this.isWebGL2) {
      return {
        ok: false,
        errors: [
          {
            line: 1,
            message:
              '#version 300 es needs WebGL2, which this browser does not provide. Use GLSL ES 1.00 (gl_FragColor).',
          },
        ],
      };
    }

    const frag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag, fragSource);
    gl.compileShader(frag);
    if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(frag) || 'Unknown compile error';
      gl.deleteShader(frag);
      return { ok: false, errors: parseShaderLog(log) };
    }

    const program = gl.createProgram();
    gl.attachShader(program, is300 ? this.vert300 : this.vert100);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.linkProgram(program);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Link failed';
      gl.deleteProgram(program);
      return { ok: false, errors: [{ line: 0, message: 'Link error: ' + log }] };
    }

    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    this.uniforms = {};
    for (const name of UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { ok: true, errors: [] };
  }

  resize() {
    if (!this.ok) return;
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(c.clientWidth * dpr));
    const h = Math.max(1, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  draw(time, mouse, params) {
    if (!this.ok || this.lost) return;
    const gl = this.gl;
    const c = this.canvas;
    gl.viewport(0, 0, c.width, c.height);

    if (!this.program) {
      gl.clearColor(0.04, 0.047, 0.063, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const u = this.uniforms;
    if (u.u_resolution) gl.uniform2f(u.u_resolution, c.width, c.height);
    if (u.u_time) gl.uniform1f(u.u_time, time);
    if (u.u_mouse) {
      const mx = mouse.x < 0 ? c.width * 0.5 : mouse.x;
      const my = mouse.y < 0 ? c.height * 0.5 : mouse.y;
      gl.uniform2f(u.u_mouse, mx, my);
    }
    for (let i = 0; i < 4; i++) {
      const loc = u['u_param' + i];
      if (loc) gl.uniform1f(loc, params[i] ?? 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    if (!this.ok) return;
    const gl = this.gl;
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onRestored);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vert100) gl.deleteShader(this.vert100);
    if (this.vert300) gl.deleteShader(this.vert300);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.program = null;
  }
}
