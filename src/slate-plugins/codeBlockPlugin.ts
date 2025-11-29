import {EditorView, Decoration, ViewPlugin, ViewUpdate, DecorationSet} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {RangeSetBuilder} from "@codemirror/state";

// ViewPlugin to add background to fenced code block lines
export const fenceBlockBackground = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        if (node.name === "FencedCode") {
          const fromLine = view.state.doc.lineAt(node.from);
          const toLine = view.state.doc.lineAt(node.to);

          for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber++) {
            const line = view.state.doc.line(lineNumber);

            // Apply a line decoration to every line inside the fenced code block
            builder.add(line.from, line.from, Decoration.line({
              attributes: { class: "cm-codeBlock" }
            }));
          }
        }
      }
    });

    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});



