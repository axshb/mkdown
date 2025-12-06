import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

import { centeredLayout } from "../slate-plugins/centeredLayout";
import { markdownStyling } from "../slate-plugins/markdownStyling";
import { fenceBlockBackground } from "../slate-plugins/codeBlockPlugin";
import { dialogueHighlighter } from "../slate-plugins/quotedTextHighlight";
import { livePreview } from "../slate-plugins/livePreview";

import {
  abcdef,
  abcdefMergeStyles,
  applyMergeRevertStyles,
  abyss,
  abyssMergeStyles,
  androidStudio,
  androidStudioMergeStyles,
  andromeda,
  andromedaMergeStyles,
  basicDark,
  basicDarkMergeStyles,
  basicLight,
  basicLightMergeStyles,
  catppuccinMocha,
  catppuccinMochaMergeStyles,
  cobalt2,
  cobalt2MergeStyles,
  forest,
  forestMergeStyles,
  githubDark,
  githubDarkMergeStyles,
  githubLight,
  githubLightMergeStyles,
  gruvboxDark,
  gruvboxDarkMergeStyles,
  gruvboxLight,
  gruvboxLightMergeStyles,
  highContrastDark,
  highContrastDarkMergeStyles,
  highContrastLight,
  highContrastLightMergeStyles,
  materialDark,
  materialDarkMergeStyles,
  materialLight,
  materialLightMergeStyles,
  monokai,
  monokaiMergeStyles,
  nord,
  nordMergeStyles,
  palenight,
  palenightMergeStyles,
  solarizedDark,
  solarizedDarkMergeStyles,
  solarizedLight,
  solarizedLightMergeStyles,
  synthwave84,
  synthwave84MergeStyles,
  tokyoNightDay,
  tokyoNightDayMergeStyles,
  tokyoNightStorm,
  tokyoNightStormMergeStyles,
  volcano,
  volcanoMergeStyles,
  vsCodeDark,
  vsCodeDarkMergeStyles,
  vsCodeLight,
  vsCodeLightMergeStyles,
} from "@fsegurai/codemirror-theme-bundle";

declare const acquireVsCodeApi: () => {
  postMessage(message: any): void;
};
const vscode = acquireVsCodeApi();
let isUpdatingFromExtension = false;

const themeCompartment = new Compartment();
const themeMap: { [key: string]: any } = {
  vsCodeDark,
  vsCodeLight,
  githubDark,
  githubLight,
  solarizedDark,
  solarizedLight,
};

// initialize cm6
const editor = new EditorView({
  state: EditorState.create({
    doc: "",
    extensions: [
      // built in cm6 extensions
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(markdownStyling),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches(),
      EditorView.lineWrapping,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      markdown({
        pasteURLAsLink: true,
        codeLanguages: languages,
      }),

      // theme (dymanic)
      themeCompartment.of(vsCodeDark),

      // custom plugins
      centeredLayout,
      fenceBlockBackground,
      dialogueHighlighter,
      livePreview,

      // listener to send document changes to the vscode extension
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromExtension) {
          const newText = update.state.doc.toString();
          vscode.postMessage({ type: "edit", text: newText });
        }
      }),
    ],
  }),
  parent: document.querySelector("#editor") as HTMLElement,
});

// listener to receive document updates from the vscode extension
window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.type) {
    case "update":
      const receivedText = message.text;
      const currentText = editor.state.doc.toString();
      if (receivedText !== currentText) {
        isUpdatingFromExtension = true;
        editor.dispatch({
          changes: { from: 0, to: currentText.length, insert: receivedText },
        });
        isUpdatingFromExtension = false;
      }
      break;

    case "update-config":
      const config = message.config;

      // Update Theme
      if (themeMap[config.theme]) {
        editor.dispatch({
          effects: themeCompartment.reconfigure(themeMap[config.theme]),
        });
      }

      // Update Fonts (applied to editor container)
      const editorElement = document.getElementById("editor");
      if (editorElement) {
        editorElement.style.fontSize = `${config.fontSize}px`;
        editorElement.style.fontFamily = config.fontFamily;
      }

      // Update Colors (CSS Variables)
      document.documentElement.style.setProperty("--mkdown-color-italics", config.colorItalics);
      document.documentElement.style.setProperty("--mkdown-color-quote", config.colorQuote);
      break;
  }
});
