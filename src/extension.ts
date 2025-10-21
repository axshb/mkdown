import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register our custom editor provider
    context.subscriptions.push(
        SlateEditorProvider.register(context)
    );
}

class SlateEditorProvider implements vscode.CustomTextEditorProvider {

    private isUpdatingFromWebview = false;

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
     * Core method, called by VS Code when a user opens a file with the editor.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                // Only media is needed now, since we bundle node_modules with esbuild
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };

        // Set the webview's initial html content
        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

        // -- THIS IS THE NEW PART --
        // Send the initial document content to the webview.
        // We do this now instead of embedding it in the HTML to avoid escaping issues.
        webviewPanel.webview.postMessage({
            type: 'update',
            text: document.getText(),
        });

        // Two-way communication setup
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString() && !this.isUpdatingFromWebview) {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                });
            }
        });

        // When the webview panel is disposed, clean up the subscription
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
     * Gelper function to apply changes from the webview to the VS Code document.
     */
    private async updateTextDocument(document: vscode.TextDocument, text: string) {
        // Set the flag to true before the edit
        this.isUpdatingFromWebview = true;
        try {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                text
            );
            await vscode.workspace.applyEdit(edit);
        } finally {
            // ALWAYS reset the flag to false, even if the edit fails
            this.isUpdatingFromWebview = false;
        }
    }

    /**
     * Generate the HTML content for the webview.
     */
    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.dist.js')); 
        const customCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css'));
        const nonce = getNonce();
    
        // UPDATED HTML:
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src ${webview.cspSource} 'unsafe-inline';
                script-src 'nonce-${nonce}';
                font-src ${webview.cspSource};
                img-src ${webview.cspSource} https: data:;
            ">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${customCssUri}" rel="stylesheet">
            <title>Slate Editor</title>
        </head>
        <body>
            <div id="editor"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
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