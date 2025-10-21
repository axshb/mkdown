import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register our custom editor provider
    context.subscriptions.push(
        SlateEditorProvider.register(context)
    );
}

class SlateEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new SlateEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            'slate-markdown.editor', // This must match the viewType in package.json
            provider
        );
        return providerRegistration;
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * This is the core method, called by VS Code when a user opens a file with our editor.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        // Setup the webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            // Restrict the webview to only loading resources from our extension's 'media' and 'node_modules' directories
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules'),
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };

        // Set the initial HTML content
        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview, document.getText());

        // --- Two-way communication setup ---
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                });
            }
        });

        // When the webview panel is disposed, we must clean up the subscription
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive messages from the webview
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'edit':
                    this.updateTextDocument(document, e.text);
                    return;
                case 'info':
                    vscode.window.showInformationMessage(e.text);
                    return;
            }
        });
    }

    /**
     * A helper function to apply changes from the webview to the VS Code document.
     */
    private updateTextDocument(document: vscode.TextDocument, text: string) {
        const edit = new vscode.WorkspaceEdit();
        // Replace the entire content of the document with the new text from the webview
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            text
        );
        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Generates the HTML content for our webview.
     */
    private getWebviewContent(webview: vscode.Webview, initialContent: string): string {
        // Get safe URIs for our scripts and styles
        const easyMDECssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'easymde', 'dist', 'easymde.min.css'));
        const easyMDEJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'easymde', 'dist', 'easymde.min.js'));
        const customCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css'));
        const nonce = getNonce();

        const safeInitialContent = JSON.stringify(initialContent);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src ${webview.cspSource};
                script-src 'nonce-${nonce}';
                img-src ${webview.cspSource} https:;
                font-src ${webview.cspSource};
            ">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <link href="${easyMDECssUri}" rel="stylesheet">
            <link href="${customCssUri}" rel="stylesheet">

            <title>Slate Editor</title>
        </head>
        <body>
            <textarea id="markdown-editor"></textarea>

            <script nonce="${nonce}" src="${easyMDEJsUri}"></script>

            <script nonce="${nonce}">
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // This flag prevents the editor from sending an update message
                    // while an update from the extension is being applied.
                    let isUpdatingFromExtension = false;

                    const easyMDE = new EasyMDE({
                        element: document.getElementById('markdown-editor'),
                        initialValue: ${safeInitialContent},
                        
                        // --- UI Customization ---
                        toolbar: false,      // Hide the toolbar
                        status: false,       // Hide the status bar
                        spellChecker: false, // Disable spell checker for performance
                        
                        // Let the editor grow vertically as you type
                        maxHeight: "none", 
                    });

                    // --- Send changes from EasyMDE to the extension ---
                    easyMDE.codemirror.on("change", () => {
                        if (isUpdatingFromExtension) {
                            return; // Don't send an update back if the change came from the extension
                        }
                        vscode.postMessage({
                            type: 'edit',
                            text: easyMDE.value()
                        });
                    });

                    // --- Receive updates from the extension ---
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                // **THE CRITICAL FIX IS HERE**
                                // Normalize line endings to prevent unnecessary updates.
                                // VS Code's document might use \\r\\n, while the browser uses \\n.
                                const receivedText = message.text.replace(/\\r\\n/g, '\\n');
                                const currentText = easyMDE.value().replace(/\\r\\n/g, '\\n');

                                if (receivedText !== currentText) {
                                    isUpdatingFromExtension = true;
                                    // Preserve cursor position when updating content
                                    const cursor = easyMDE.codemirror.getCursor();
                                    easyMDE.value(message.text);
                                    easyMDE.codemirror.setCursor(cursor);
                                    isUpdatingFromExtension = false;
                                }
                                return;
                        }
                    });
                }());
            </script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}