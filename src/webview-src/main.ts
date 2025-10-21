import EasyMDE from 'easymde';
import 'codemirror/mode/gfm/gfm';

// languages
import 'codemirror/mode/python/python';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/meta'; // auto detecting languages
import 'codemirror/mode/python/python';
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
import 'codemirror/mode/clike/clike'; // covers C, C++, Java, etc.
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
} as any);

// --- Code block highlighting function ---
function highlightCodeBlocks(cm: CodeMirror.Editor) {
    const doc = cm.getDoc();
    const totalLines = doc.lineCount();

    // 1️⃣ Remove previous marks
    for (let i = 0; i < totalLines; i++) {
        const handle = doc.getLineHandle(i);
        if (handle) cm.removeLineClass(handle, 'wrap', 'cm-code-block');
    }

    // 2️⃣ Loop through lines to detect fenced code blocks
    let i = 0;
    while (i < totalLines) {
        const lineText = doc.getLine(i).trim();

        if (lineText.startsWith('```')) {
            const language = lineText.slice(3).trim(); // e.g., python, js
            let j = i + 1;

            // Find closing fence
            while (j < totalLines && !doc.getLine(j).trim().startsWith('```')) {
                j++;
            }

            // Mark all lines inside the block (excluding fences)
            for (let k = i + 1; k < j; k++) {
                const handle = doc.getLineHandle(k);
                if (handle) cm.addLineClass(handle, 'wrap', 'cm-code-block');
                // optional: store language if needed
                // (handle as any).lineLanguage = language;
            }

            // Skip past the closing fence
            i = j + 1;
        } else {
            i++;
        }
    }
}

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
            easyMDE.codemirror.setCursor(cursor);
            isUpdatingFromExtension = false;

            // Re-highlight after external update
            highlightCodeBlocks(easyMDE.codemirror);
        }
    }
});
