import EasyMDE from 'easymde';
import 'codemirror/mode/gfm/gfm';
import { highlightCodeBlocks } from '../modules/highlightCodeBlocks';   

// languages
import 'codemirror/mode/python/python';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/meta'; // auto detecting languages
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/css/css';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/mode/properties/properties';
import 'codemirror/mode/toml/toml';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/go/go';
import 'codemirror/mode/php/php';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/lua/lua';
import 'codemirror/mode/r/r';

// VS Code webview setup
declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
    getState(): any;
    setState(newState: any): void;
};
const vscode = acquireVsCodeApi();
let isUpdatingFromExtension = false;

// Editor setup
const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
const easyMDE = new EasyMDE({
    element: textarea,
    mode: {
        name: 'gfm',
        fencedCodeBlockHighlighting: true
    },
    toolbar: false,
    status: false,
    spellChecker: false,
    maxHeight: "none",
    autoDownloadFontAwesome: false,
    previewImagesInEditor: true,
    renderingConfig: {
        codeSyntaxHighlighting: true,
    },
    placeholder: "Type here...",
} as any);

// Initial highlight
highlightCodeBlocks(easyMDE.codemirror);

// Update highlights on every change (debounced for performance)
let highlightTimeout: NodeJS.Timeout | undefined;
easyMDE.codemirror.on('change', () => {
    if (highlightTimeout) clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => highlightCodeBlocks(easyMDE.codemirror), 100);
});

// --- Post changes to VS Code ---
let debounceTimeout: NodeJS.Timeout | undefined;
easyMDE.codemirror.on("change", () => {
    if (isUpdatingFromExtension) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        vscode.postMessage({ type: 'edit', text: easyMDE.value() });
    }, 250);
});

// --- Receive updates from VS Code ---
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        const receivedText = message.text.replace(/\r\n/g, '\n');
        const currentText = easyMDE.value().replace(/\r\n/g, '\n');

        if (receivedText !== currentText) {
            isUpdatingFromExtension = true;
            const cursor = easyMDE.codemirror.getCursor();
            easyMDE.value(message.text);
            easyMDE.codemirror.setCursor(cursor, undefined, { scroll: false }); // suppress jumps
            isUpdatingFromExtension = false;
        }
    }
});
