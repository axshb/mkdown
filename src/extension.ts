import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // register provider
  const provider = new SlateEditorProvider(context);
  context.subscriptions.push(SlateEditorProvider.register(context, provider));

  // watch config
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("mkdown")) {
        const config = vscode.workspace.getConfiguration("mkdown");
        provider.postMessageToActiveWebview({
          type: "update-config",
          config: {
            theme: config.get("theme"),
            fontSize: config.get("font.size"),
            fontFamily: config.get("font.family"),
            colorItalics: config.get("colors.italics"),
            colorQuote: config.get("colors.quote"),
          },
        });
      }
    })
  );
}

// boilerplate, mostly
// major reference: https://vogella.com/blog/multiple-webviews-single-extension/
class SlateEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "mkdown.editor";
  private isUpdatingFromWebview = false;
  private webviews = new Set<vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext, provider: SlateEditorProvider): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(SlateEditorProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    });
  }

  public postMessageToActiveWebview(message: any) {
    // Broadly sending to all might be simpler for now, or track active.
    // Custom Editors don't easily expose "active" state to the provider unless tracked.
    // We will send to all for simplicity, or just the one that is visible.
    for (const panel of this.webviews) {
      if (panel.visible) {
        panel.webview.postMessage(message);
      }
    }
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.webviews.add(webviewPanel);

    // set webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    };

    // load html content
    webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

    // initial config
    const config = vscode.workspace.getConfiguration("mkdown");

    // sync initial content & config
    setTimeout(() => {
      webviewPanel.webview.postMessage({
        type: "update",
        text: document.getText(),
      });
      webviewPanel.webview.postMessage({
        type: "update-config",
        config: {
          theme: config.get("theme"),
          fontSize: config.get("font.size"),
          fontFamily: config.get("font.family"),
          colorItalics: config.get("colors.italics"),
          colorQuote: config.get("colors.quote"),
        },
      });
    }, 500);

    // sync host changes to webview
    const subscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString() && !this.isUpdatingFromWebview) {
        webviewPanel.webview.postMessage({
          type: "update",
          text: document.getText(),
        });
      }
    });

    // cleanup on close
    webviewPanel.onDidDispose(() => {
      subscription.dispose();
      this.webviews.delete(webviewPanel);
    });

    // handle webview messages
    webviewPanel.webview.onDidReceiveMessage((e) => {
      switch (e.type) {
        case "edit":
          this.updateTextDocument(document, e.text);
          return;
        case "info":
          vscode.window.showInformationMessage(e.text);
          return;
      }
    });
  }

  private async updateTextDocument(document: vscode.TextDocument, text: string) {
    // prevent infinite loop
    this.isUpdatingFromWebview = true;
    try {
      const edit = new vscode.WorkspaceEdit();

      // replace entire document
      edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);

      await vscode.workspace.applyEdit(edit);
    } finally {
      // release lock
      this.isUpdatingFromWebview = false;
    }
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "webview.dist.js"));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "style.css"));
    const nonce = getNonce();

    // generate secure html
    return `
            <!DOCTYPE html>
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
                <link href="${cssUri}" rel="stylesheet">
                <title>Slate Editor</title>
            </head>
            <body>
                <div id="editor"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
