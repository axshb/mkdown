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
     * Core method, called by VS Code when a user opens a file with the editor.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        // Webview options setup
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

        // Two-way communication setup
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
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
     * Generate the HTML content for the webview.
     */
    private getWebviewContent(webview: vscode.Webview, initialContent: string): string {
        // Only need URIs for the CSS and the single bundled script
        const easyMDECssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'easymde', 'dist', 'easymde.min.css'));
        const customCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.dist.js')); 
    
        const nonce = getNonce();
    
        const escapedInitialContent = initialContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src ${webview.cspSource} 'unsafe-inline';
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
            <textarea id="markdown-editor">${escapedInitialContent}</textarea>
    
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