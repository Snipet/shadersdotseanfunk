// Hand-rolled GLSL stream tokenizer for CodeMirror 6 — small, dependency-free,
// and aware of GLSL builtins plus the gl_* / u_* naming conventions.

import { StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const KEYWORDS = new Set(
  `const uniform varying attribute in out inout centroid flat smooth noperspective
   layout precision highp mediump lowp invariant if else for while do return break
   continue discard struct void switch case default`
    .trim()
    .split(/\s+/)
);

const TYPES = new Set(
  `float double int uint bool
   vec2 vec3 vec4 dvec2 dvec3 dvec4 bvec2 bvec3 bvec4
   ivec2 ivec3 ivec4 uvec2 uvec3 uvec4
   mat2 mat3 mat4 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4
   sampler2D sampler3D samplerCube sampler2DShadow samplerCubeShadow
   sampler2DArray sampler2DArrayShadow
   isampler2D isampler3D isamplerCube usampler2D usampler3D usamplerCube`
    .trim()
    .split(/\s+/)
);

const BUILTINS = new Set(
  `radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh
   pow exp log exp2 log2 sqrt inversesqrt
   abs sign floor trunc round roundEven ceil fract mod modf min max clamp mix
   step smoothstep isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat
   uintBitsToFloat length distance dot cross normalize faceforward reflect
   refract matrixCompMult outerProduct transpose determinant inverse
   lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual
   any all not
   texture2D texture2DProj texture2DLod textureCube textureCubeLod
   texture textureProj textureLod textureGrad texelFetch textureSize
   dFdx dFdy fwidth`
    .trim()
    .split(/\s+/)
);

const NUMBER_RE =
  /^(?:0[xX][0-9a-fA-F]+[uU]?|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?[fFuU]?)/;

export const glsl = StreamLanguage.define({
  name: 'glsl',

  startState: () => ({ blockComment: false, depth: 0 }),

  token(stream, state) {
    if (state.blockComment) {
      if (stream.match(/^.*?\*\//)) state.blockComment = false;
      else stream.skipToEnd();
      return 'comment';
    }
    if (stream.sol() && stream.match(/^\s*#/)) {
      stream.skipToEnd();
      return 'preprocessor';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match('/*')) {
      if (stream.match(/^.*?\*\//)) {
        // closed on the same line
      } else {
        state.blockComment = true;
        stream.skipToEnd();
      }
      return 'comment';
    }
    if (stream.match(NUMBER_RE)) return 'number';
    if (stream.match(/^[A-Za-z_]\w*/)) {
      const word = stream.current();
      if (word === 'true' || word === 'false') return 'bool';
      if (KEYWORDS.has(word)) return 'keyword';
      if (TYPES.has(word)) return 'type';
      if (BUILTINS.has(word)) return 'builtin';
      if (/^(gl_|u_)/.test(word)) return 'special';
      return 'ident';
    }
    const ch = stream.next();
    if (ch === '{') {
      state.depth++;
      return 'bracket';
    }
    if (ch === '}') {
      state.depth = Math.max(0, state.depth - 1);
      return 'bracket';
    }
    if ('()[]'.includes(ch)) return 'bracket';
    if (';,.'.includes(ch)) return 'punctuation';
    if ('+-*/%=!<>&|^?:~'.includes(ch)) {
      stream.match(/^[-+*/%=!<>&|^?:~]*/);
      return 'operator';
    }
    return null;
  },

  indent(state, textAfter, cx) {
    let depth = state.depth;
    if (/^\s*\}/.test(textAfter)) depth--;
    return Math.max(0, depth) * cx.unit;
  },

  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{'] },
    indentOnInput: /^\s*\}$/,
  },

  tokenTable: {
    keyword: t.keyword,
    type: t.typeName,
    builtin: t.standard(t.variableName),
    special: t.special(t.variableName),
    preprocessor: t.meta,
    number: t.number,
    bool: t.bool,
    comment: t.comment,
    operator: t.operator,
    punctuation: t.punctuation,
    bracket: t.bracket,
    ident: t.variableName,
  },
});
