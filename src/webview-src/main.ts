import { imagePlugin } from '../slate-plugins/imagePlugin';
import { EditorState } from "@codemirror/state"
import {
    EditorView, keymap, drawSelection,
    dropCursor, rectangularSelection, crosshairCursor
} from "@codemirror/view"
import {
    syntaxHighlighting, indentOnInput,
    bracketMatching, foldKeymap,
    defaultHighlightStyle
} from "@codemirror/language"
import {
    defaultKeymap, history, historyKeymap
} from "@codemirror/commands"
import {
    searchKeymap, highlightSelectionMatches
} from "@codemirror/search"
import {
    autocompletion, completionKeymap, closeBrackets,
    closeBracketsKeymap
} from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { indentWithTab } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { languages, } from "@codemirror/language-data"

import { centeredLayout } from '../slate-plugins/centeredLayout';
import { markdownStyling } from '../slate-plugins/markdownStyling';
import { fenceBlockBackground } from "../slate-plugins/codeBlockPlugin";
import { dialogueHighlighter } from "../slate-plugins/quotedTextHighlight";

// for some reason the bundle import doens't work
import {
    abcdef, abcdefMergeStyles, applyMergeRevertStyles,
    abyss, abyssMergeStyles,
    androidStudio, androidStudioMergeStyles,
    andromeda, andromedaMergeStyles,
    basicDark, basicDarkMergeStyles,
    basicLight, basicLightMergeStyles,
    catppuccinMocha, catppuccinMochaMergeStyles,
    cobalt2, cobalt2MergeStyles,
    forest, forestMergeStyles,
    githubDark, githubDarkMergeStyles,
    githubLight, githubLightMergeStyles,
    gruvboxDark, gruvboxDarkMergeStyles,
    gruvboxLight, gruvboxLightMergeStyles,
    highContrastDark, highContrastDarkMergeStyles,
    highContrastLight, highContrastLightMergeStyles,
    materialDark, materialDarkMergeStyles,
    materialLight, materialLightMergeStyles,
    monokai, monokaiMergeStyles,
    nord, nordMergeStyles,
    palenight, palenightMergeStyles,
    solarizedDark, solarizedDarkMergeStyles,
    solarizedLight, solarizedLightMergeStyles,
    synthwave84, synthwave84MergeStyles,
    tokyoNightDay, tokyoNightDayMergeStyles,
    tokyoNightStorm, tokyoNightStormMergeStyles,
    volcano, volcanoMergeStyles,
    vsCodeDark, vsCodeDarkMergeStyles,
    vsCodeLight, vsCodeLightMergeStyles,
} from '@fsegurai/codemirror-theme-bundle';


declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
};
const vscode = acquireVsCodeApi();
let isUpdatingFromExtension = false;

// initialize cm6
const editor = new EditorView({
    state: EditorState.create({
        doc: '',
        extensions: [

            // built in cm6 extensions
            history(), // undo/redo history
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(markdownStyling), // theme (default: defaultHighlightStyle)
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
                indentWithTab
            ]),
            markdown({
                pasteURLAsLink: true,
                codeLanguages: languages,
            }),

            // theme
            vsCodeDark,

            // custom plugins
            imagePlugin,
            centeredLayout,
            fenceBlockBackground,
            dialogueHighlighter,

            // listener to send document changes to the vscode extension
            EditorView.updateListener.of((update) => {
                if (update.docChanged && !isUpdatingFromExtension) {
                    const newText = update.state.doc.toString();
                    vscode.postMessage({ type: 'edit', text: newText });
                }
            }),
        ],
    }),
    parent: document.querySelector('#editor') as HTMLElement,
});

// listener to receive document updates from the vscode extension
window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'update') {
        const receivedText = message.text;
        const currentText = editor.state.doc.toString();

        if (receivedText !== currentText) {
            isUpdatingFromExtension = true;
            editor.dispatch({
                changes: { from: 0, to: currentText.length, insert: receivedText },
            });
            isUpdatingFromExtension = false;
        }
    }
});