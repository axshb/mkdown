import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { markdownHighlighting } from '../slate-plugins/markdownHighlighting';
import { oneDark } from '@codemirror/theme-one-dark';
import { languages } from '@codemirror/language-data';
import { imagePlugin } from '../slate-plugins/imagePlugin';

// VS Code webview API
declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
};
const vscode = acquireVsCodeApi();

// A flag to prevent sending updates back to the extension while an update is coming from the extension
let isUpdatingFromExtension = false;

// Create the CodeMirror 6 editor
const editor = new EditorView({
    state: EditorState.create({
        doc: '', // Initial content is empty, will be populated by a message from the extension
        extensions: [
            // lineNumbers(),
            // highlightActiveLineGutter(),
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            markdown({
                base: markdownLanguage,
                codeLanguages: languages, // This enables syntax highlighting inside fenced code blocks
                addKeymap: true,
            }),
            oneDark, // Add a theme (you can create your own or use others)
            // This is the listener that sends changes back to the VS Code extension
            EditorView.updateListener.of((update) => {
                if (update.docChanged && !isUpdatingFromExtension) {
                    const newText = update.state.doc.toString();
                    vscode.postMessage({ type: 'edit', text: newText });
                }
            }),
            // Make the editor take up the full height
            EditorView.theme({
                "&": {height: "100vh"},
                ".cm-scroller": {overflow: "auto"}
            }),
            
            // Cusotm slate plugins
            imagePlugin,
            markdownHighlighting,
        ],
    }),
    parent: document.body, // Attach the editor directly to the body
});


// Listen for messages from the VS Code extension
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