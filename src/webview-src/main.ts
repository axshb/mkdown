import { imagePlugin } from '../slate-plugins/imagePlugin';
import {EditorState} from "@codemirror/state"
import {
  EditorView, keymap, drawSelection, 
  dropCursor, rectangularSelection, crosshairCursor
} from "@codemirror/view"
import {
  syntaxHighlighting, indentOnInput,
  bracketMatching, foldKeymap
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
import {languages,} from "@codemirror/language-data"

import { slateTheme, centeredLayout } from '../slate-plugins/slateTheme';
import { fenceBlockBackground } from "../slate-plugins/codeBlockPlugin";
import { dialogueHighlighter } from "../slate-plugins/quotedTextHighlight";

// Standard VS Code Webview API boilerplate
declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
};
const vscode = acquireVsCodeApi();
let isUpdatingFromExtension = false;

// Initialize the CodeMirror 6 editor
const editor = new EditorView({
    state: EditorState.create({
        doc: '',
        extensions: [

            /* === CODEMIRROR BUILT IN EXTENSIONS === */
            history(), // Undo/redo history
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true), // Allow multiple cursors/selections
            indentOnInput(),
            syntaxHighlighting(slateTheme), // Theme (default: defaultHighlightStyle)
            bracketMatching(), // Highlight matching brackets near cursor
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
           
            /* === CUSTOM SLATE PLUGINS === */ 
            imagePlugin,
            centeredLayout, 
            fenceBlockBackground,
            dialogueHighlighter,

            // Listener to send document changes to the VS Code extension
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

// Listener to receive document updates from the VS Code extension
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