import {EditorView, Decoration, ViewPlugin, ViewUpdate, DecorationSet} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

export const dialogueHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc;
    const text = doc.toString();
    const regex = /"(?:[^"\\]|\\.)*"/g; // handles escaped quotes like \" 

    for (let { from, to } of view.visibleRanges) {
      let match;
      while ((match = regex.exec(text.slice(from, to))) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;

        // Find the syntax node that contains this range
        let inCode = false;
        syntaxTree(view.state).iterate({
          from: start,
          to: end,
          enter: (node) => {
            if (
              node.name === "FencedCode" ||
              node.name === "CodeText" ||
              node.name === "CodeBlock"
            ) {
              inCode = true;
              return false; // stop traversal
            }
          }
        });

        if (!inCode) {
          builder.add(start, end, Decoration.mark({ class: "cm-dialogue" }));
        }
      }
    }

    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});
