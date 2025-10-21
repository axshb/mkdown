export function highlightCodeBlocks(cm: CodeMirror.Editor) {
    const doc = cm.getDoc();
    const totalLines = doc.lineCount();

    // 1. Remove previous marks
    for (let i = 0; i < totalLines; i++) {
        const handle = doc.getLineHandle(i);
        if (handle) cm.removeLineClass(handle, 'wrap', 'cm-code-block');
    }

    // 2. Loop through lines to detect fenced code blocks
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
                // potential future update: store language if needed
                // (handle as any).lineLanguage = language;
            }

            // Skip past the closing fence
            i = j + 1;
        } else {
            i++;
        }
    }
}