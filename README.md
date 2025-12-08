<div><h1 align="center">mkdown</h1><p align="center">A lightweight WYSIWYG Markdown editor for VS Code, built on CodeMirror 6.</p></div>

### Features
* Syntax highlighted code blocks.
* Styled WYSIWYG markdown, including headings, bold, italics, lists, etc.
* In-line image embeddings.
* Preset and custom theme configuration via VS Code's settings
* HTML live preview.

### Showcase
* Due to significant updates, a new showcase is still pending. 

### Usage
* Right click a .md file > Open with... > mkdown Markdown Editor
* Optionally, if you want to use mkdown as your default markdown editor, you can add this config into your VS Code's settings.json:

```
"workbench.editorAssociations": {
    "*.md": "mkdown.editor"
}
```

### Developers
1. `git clone https://github.com/axshb/mkdown.git`
2. `cd mkdown`
3. `npm install`
4. `npm run compile`
5. Run with your method of choice. On VS Code, Press `F5` and run the extension for testing.
6. Compile the .vsix with `npm run vscode-package.`

