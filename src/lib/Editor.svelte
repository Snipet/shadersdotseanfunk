<script>
  import { onMount } from 'svelte';
  import {
    EditorView,
    keymap,
    lineNumbers,
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    Decoration,
  } from '@codemirror/view';
  import { EditorState, StateEffect, StateField, Prec } from '@codemirror/state';
  import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
  } from '@codemirror/commands';
  import {
    bracketMatching,
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
    HighlightStyle,
  } from '@codemirror/language';
  import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
  import { tags as t } from '@lezer/highlight';
  import { glsl } from './glslLanguage.js';

  let { code, errors = [], onChange, onForceCompile } = $props();

  let host;
  let view = $state(null);

  const setErrorsEffect = StateEffect.define();
  const errorLineDeco = Decoration.line({ class: 'cm-errorLine' });

  const errorField = StateField.define({
    create: () => Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const e of tr.effects) {
        if (e.is(setErrorsEffect)) {
          const lines = [...new Set(
            e.value
              .map((err) => err.line)
              .filter((n) => n >= 1 && n <= tr.state.doc.lines)
          )].sort((a, b) => a - b);
          deco = Decoration.set(
            lines.map((n) => errorLineDeco.range(tr.state.doc.line(n).from))
          );
        }
      }
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  const theme = EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'transparent',
        fontSize: '13px',
      },
      '.cm-scroller': {
        fontFamily: 'var(--mono)',
        lineHeight: '1.6',
        overflow: 'auto',
      },
      '.cm-content': { padding: '12px 0', caretColor: 'var(--accent)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        background: 'rgba(94, 234, 212, 0.14) !important',
      },
      '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.035)' },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--text-faint)',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: 'var(--text-dim)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 10px 0 16px',
        minWidth: '42px',
      },
      '.cm-errorLine': {
        backgroundColor: 'rgba(255, 90, 100, 0.13)',
        boxShadow: 'inset 3px 0 0 var(--error)',
      },
      '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
        backgroundColor: 'rgba(94, 234, 212, 0.20)',
      },
    },
    { dark: true }
  );

  const highlight = HighlightStyle.define([
    { tag: t.comment, color: '#5c6773', fontStyle: 'italic' },
    { tag: t.keyword, color: '#f472b6' },
    { tag: t.typeName, color: '#5eead4' },
    { tag: [t.number, t.bool], color: '#f7b96e' },
    { tag: t.standard(t.variableName), color: '#7cb3ff' },
    { tag: t.special(t.variableName), color: '#c4b5fd' },
    { tag: t.meta, color: '#a78bfa' },
    { tag: t.operator, color: '#94a3b8' },
    { tag: t.punctuation, color: '#6b7684' },
    { tag: t.bracket, color: '#8b95a5' },
    { tag: t.variableName, color: '#dfe6ee' },
  ]);

  export function goToLine(n) {
    if (!view || n < 1) return;
    const line = view.state.doc.line(Math.min(n, view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  }

  onMount(() => {
    const v = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: code,
        extensions: [
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  onForceCompile?.();
                  return true;
                },
              },
            ])
          ),
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          dropCursor(),
          indentUnit.of('    '),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          glsl,
          syntaxHighlighting(highlight),
          errorField,
          theme,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view = v;
    return () => v.destroy();
  });

  // Push external code changes (preset loads) into the editor.
  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (code !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: code },
      });
    }
  });

  // Mirror compile errors into line decorations.
  $effect(() => {
    if (!view) return;
    view.dispatch({ effects: setErrorsEffect.of(errors) });
  });
</script>

<div class="editor-host" bind:this={host}></div>

<style>
  .editor-host {
    flex: 1;
    min-height: 0;
  }

  .editor-host :global(.cm-editor) {
    height: 100%;
  }
</style>
