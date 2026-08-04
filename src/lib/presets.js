// Built-in shader presets. All are GLSL ES 1.00 (Book of Shaders style) and
// self-contained — every helper is defined inline so any preset can be copied
// straight into a synth component.
//
// Shared conventions:
//   p  — coords normalized so y spans [-1, 1], (0,0) at canvas center
//   px — ~1 pixel in p units, used for resolution-independent antialiasing
//   u_param0..3 — the P0–P3 sliders in the panel (0.0–1.0)

const STARTER = `// ── starter ──────────────────────────────────────────────
// Uniforms available in every shader here:
//   u_resolution  vec2   canvas size in pixels
//   u_time        float  seconds since load
//   u_mouse       vec2   mouse in pixels, origin bottom-left
//   u_param0..3   float  the P0-P3 sliders (0.0 - 1.0)
//
// Dragging vertically on the canvas sweeps u_param0 (hold
// Shift for fine control). The canvas keeps showing the last
// good compile while you type, and errors appear under the
// editor. Cmd/Ctrl+Enter compiles immediately.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_param0;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  vec2 m = (2.0 * u_mouse - u_resolution) / u_resolution.y;
  float px = 2.0 / u_resolution.y;

  vec3 col = mix(vec3(0.045, 0.050, 0.065),
                 vec3(0.095, 0.105, 0.135),
                 0.5 + 0.5 * p.y);

  float r = mix(0.12, 0.45, u_param0) + 0.03 * sin(u_time * 3.0);
  float d = sdCircle(p - m, r);

  vec3 accent = vec3(0.37, 0.92, 0.83);
  col = mix(col, accent, smoothstep(px, -px, d));
  col += accent * 0.35 * exp(-abs(d) * 8.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

const KNOB = `// ── rotary knob ──────────────────────────────────────────
// A synth knob with a 270° sweep. Drag up/down anywhere on
// the canvas (or use the P0 slider) to turn it — the value
// arc, indicator and ticks all follow u_param0.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_param0;

const float PI = 3.141592653589793;
const float A0 = 3.926990817;  // 225° — value 0
const float A1 = -0.785398163; // -45° — value 1

vec2 rot(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Arc centred on +Y spanning ±ap, radius r, half-thickness t.
float sdArc(vec2 p, float ap, float r, float t) {
  vec2 sc = vec2(sin(ap), cos(ap));
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * r)
                                    : abs(length(p) - r)) - t;
}

// Arc spanning polar angles [a, b] (a > b), evaluated at p.
float valueArc(vec2 p, float a, float b, float r, float t) {
  float mid = (a + b) * 0.5;
  float half_ = (a - b) * 0.5;
  return sdArc(rot(p, PI * 0.5 - mid), half_, r, t);
}

float fillAA(float d, float px) {
  return smoothstep(px, -px, d);
}

float strokeAA(float d, float w, float px) {
  return smoothstep(px, -px, abs(d) - w);
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float px = 2.0 / u_resolution.y;
  float v = clamp(u_param0, 0.0, 1.0);
  float a = mix(A0, A1, v);

  vec3 accent = vec3(0.37, 0.92, 0.83);

  // backdrop
  vec3 col = mix(vec3(0.045, 0.050, 0.065),
                 vec3(0.095, 0.105, 0.135),
                 0.5 + 0.5 * p.y);
  col *= 1.0 - 0.35 * length(p * vec2(0.55, 0.8));

  // ticks around the sweep
  for (int i = 0; i <= 10; i++) {
    float t = float(i) / 10.0;
    float ta = mix(A0, A1, t);
    vec2 dir = vec2(cos(ta), sin(ta));
    float dTick = sdSegment(p, dir * 0.86, dir * 0.94);
    float lit = step(t, v + 0.001);
    vec3 tickCol = mix(vec3(0.28, 0.31, 0.38), accent * 0.85, lit);
    col = mix(col, tickCol, fillAA(dTick - 0.006, px));
  }

  // track arc + value arc
  float dTrack = valueArc(p, A0, A1, 0.74, 0.016);
  col = mix(col, vec3(0.16, 0.18, 0.23), fillAA(dTrack, px));
  float dVal = valueArc(p, A0, a, 0.74, 0.020);
  col = mix(col, accent, fillAA(dVal, px));
  col += accent * 0.30 * exp(-max(dVal, 0.0) * 24.0);

  // body: drop shadow, cap, rim
  float dBody = sdCircle(p, 0.56);
  col *= 1.0 - 0.45 * exp(-max(dBody, 0.0) * 9.0) * step(0.0, dBody);
  vec3 capCol = mix(vec3(0.185, 0.195, 0.235),
                    vec3(0.095, 0.100, 0.125),
                    clamp(length(p) / 0.56, 0.0, 1.0));
  capCol += 0.05 * p.y; // light from above
  col = mix(col, capCol, fillAA(dBody, px));
  col = mix(col, vec3(0.32, 0.35, 0.42), strokeAA(dBody, 0.006, px));

  // indicator
  vec2 dirA = vec2(cos(a), sin(a));
  float dInd = sdSegment(p, dirA * 0.16, dirA * 0.42) - 0.032;
  col = mix(col, accent, fillAA(dInd, px));
  col += accent * 0.20 * exp(-max(dInd, 0.0) * 30.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

const FADER = `// ── fader ────────────────────────────────────────────────
// A vertical slider / channel fader. P0 sets the position.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_param0;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float fillAA(float d, float px) {
  return smoothstep(px, -px, d);
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float px = 2.0 / u_resolution.y;
  float v = clamp(u_param0, 0.0, 1.0);
  float yThumb = mix(-0.52, 0.52, v);

  vec3 accent = vec3(0.37, 0.92, 0.83);

  // backdrop
  vec3 col = mix(vec3(0.045, 0.050, 0.065),
                 vec3(0.095, 0.105, 0.135),
                 0.5 + 0.5 * p.y);
  col *= 1.0 - 0.35 * length(p * vec2(0.55, 0.8));

  // scale ticks on both sides
  for (int i = 0; i <= 10; i++) {
    float t = float(i) / 10.0;
    float y = mix(-0.52, 0.52, t);
    float len = (i == 0 || i == 5 || i == 10) ? 0.10 : 0.055;
    float dR = sdSegment(p, vec2(0.16, y), vec2(0.16 + len, y));
    float dL = sdSegment(p, vec2(-0.16, y), vec2(-0.16 - len, y));
    float d = min(dR, dL) - 0.004;
    col = mix(col, vec3(0.30, 0.33, 0.40), fillAA(d, px) * 0.9);
  }

  // slot
  float dSlot = sdRoundBox(p, vec2(0.045, 0.60), 0.045);
  col = mix(col, vec3(0.040, 0.045, 0.058), fillAA(dSlot, px));
  float dGroove = sdRoundBox(p, vec2(0.012, 0.55), 0.012);
  col = mix(col, vec3(0.020, 0.022, 0.028), fillAA(dGroove, px));

  // value fill below the thumb
  float dFill = max(sdRoundBox(p, vec2(0.020, 0.55), 0.020), p.y - yThumb);
  col = mix(col, accent, fillAA(dFill, px));
  col += accent * 0.20 * exp(-max(dFill, 0.0) * 20.0);

  // thumb
  vec2 tp = p - vec2(0.0, yThumb);
  float dThumb = sdRoundBox(tp, vec2(0.17, 0.075), 0.038);
  col *= 1.0 - 0.45 * exp(-max(dThumb, 0.0) * 14.0) * step(0.0, dThumb);
  vec3 thumbCol = mix(vec3(0.235, 0.250, 0.300),
                      vec3(0.125, 0.135, 0.170),
                      clamp(0.5 - tp.y * 6.0, 0.0, 1.0));
  col = mix(col, thumbCol, fillAA(dThumb, px));

  // grip lines
  float dGrip = sdRoundBox(tp, vec2(0.150, 0.007), 0.007);
  col = mix(col, accent, fillAA(dGrip, px));
  float dG2 = sdRoundBox(tp - vec2(0.0, 0.040), vec2(0.120, 0.005), 0.005);
  float dG3 = sdRoundBox(tp + vec2(0.0, 0.040), vec2(0.120, 0.005), 0.005);
  col = mix(col, vec3(0.32, 0.34, 0.40), fillAA(min(dG2, dG3), px));

  gl_FragColor = vec4(col, 1.0);
}
`;

const TOGGLE = `// ── toggle switch ────────────────────────────────────────
// A pill toggle with an indicator LED. P0 crossing 0.5 flips
// it; the motion eases so you can preview the transition.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_param0;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float fillAA(float d, float px) {
  return smoothstep(px, -px, d);
}

float strokeAA(float d, float w, float px) {
  return smoothstep(px, -px, abs(d) - w);
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float px = 2.0 / u_resolution.y;
  float t = smoothstep(0.35, 0.65, u_param0);

  vec3 accent = vec3(0.37, 0.92, 0.83);

  // backdrop
  vec3 col = mix(vec3(0.045, 0.050, 0.065),
                 vec3(0.095, 0.105, 0.135),
                 0.5 + 0.5 * p.y);
  col *= 1.0 - 0.35 * length(p * vec2(0.55, 0.8));

  // pill track
  float dPill = sdRoundBox(p, vec2(0.44, 0.20), 0.20);
  col *= 1.0 - 0.40 * exp(-max(dPill, 0.0) * 10.0) * step(0.0, dPill);
  vec3 trackCol = mix(vec3(0.095, 0.105, 0.135), accent * 0.30, t);
  col = mix(col, trackCol, fillAA(dPill, px));
  col = mix(col, vec3(0.30, 0.33, 0.40), strokeAA(dPill, 0.006, px) * 0.8);

  // thumb
  vec2 tc = vec2(mix(-0.24, 0.24, t), 0.0);
  float dThumb = sdCircle(p - tc, 0.155);
  col *= 1.0 - 0.50 * exp(-max(dThumb, 0.0) * 16.0) * step(0.0, dThumb);
  vec3 thumbCol = mix(vec3(0.78, 0.81, 0.86),
                      vec3(0.92, 0.95, 0.99),
                      clamp(0.5 + p.y * 3.0, 0.0, 1.0));
  col = mix(col, thumbCol, fillAA(dThumb, px));

  // indicator LED above
  vec2 lp = p - vec2(0.0, 0.42);
  float dLed = sdCircle(lp, 0.035);
  vec3 ledCol = mix(vec3(0.055, 0.095, 0.095), accent, t);
  col = mix(col, ledCol, fillAA(dLed, px));
  col += accent * t * 0.45 * exp(-max(dLed, 0.0) * 14.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

const VU_METER = `// ── VU meter ─────────────────────────────────────────────
// A segmented LED meter. P0 is input gain; the level bounces
// on its own so you can watch the ballistics.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_param0;

const int SEGMENTS = 14;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float fillAA(float d, float px) {
  return smoothstep(px, -px, d);
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float px = 2.0 / u_resolution.y;

  // fake programme material: two detuned LFOs
  float env = 0.5 + 0.5 * sin(u_time * 2.4) * sin(u_time * 0.9 + 1.7);
  float level = clamp(u_param0 * (0.25 + 0.85 * env), 0.0, 1.0);

  // backdrop
  vec3 col = mix(vec3(0.045, 0.050, 0.065),
                 vec3(0.095, 0.105, 0.135),
                 0.5 + 0.5 * p.y);
  col *= 1.0 - 0.35 * length(p * vec2(0.55, 0.8));

  // housing
  float dCase = sdRoundBox(p, vec2(0.30, 0.72), 0.06);
  col *= 1.0 - 0.40 * exp(-max(dCase, 0.0) * 10.0) * step(0.0, dCase);
  col = mix(col, vec3(0.055, 0.060, 0.078), fillAA(dCase, px));

  for (int i = 0; i < SEGMENTS; i++) {
    float t = (float(i) + 0.5) / float(SEGMENTS);
    float yc = mix(-0.62, 0.62, t);
    float d = sdRoundBox(p - vec2(0.0, yc), vec2(0.20, 0.030), 0.018);

    // green -> amber -> red as the meter climbs
    vec3 segCol = mix(vec3(0.25, 0.90, 0.50), vec3(0.98, 0.75, 0.25),
                      smoothstep(0.55, 0.75, t));
    segCol = mix(segCol, vec3(1.00, 0.30, 0.32), smoothstep(0.80, 0.92, t));

    float on = step(t, level);
    float bright = mix(0.10, 1.0, on);
    col = mix(col, segCol * bright, fillAA(d, px));
    col += segCol * on * 0.25 * exp(-max(d, 0.0) * 18.0);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export const presets = [
  { id: 'starter', name: 'Starter', code: STARTER, params: [0.5, 0.5, 0.5, 0.5] },
  { id: 'knob', name: 'Rotary knob', code: KNOB, params: [0.65, 0.5, 0.5, 0.5] },
  { id: 'fader', name: 'Fader', code: FADER, params: [0.35, 0.5, 0.5, 0.5] },
  { id: 'toggle', name: 'Toggle switch', code: TOGGLE, params: [1.0, 0.5, 0.5, 0.5] },
  { id: 'vu', name: 'VU meter', code: VU_METER, params: [0.75, 0.5, 0.5, 0.5] },
];

export const DEFAULT_PRESET_ID = 'knob';
