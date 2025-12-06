import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import DOMPurify from "isomorphic-dompurify";

const minifyHTML = (html: string): string => {
  return (
    html
      // Remove comments (including conditional comments)
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove all newlines and carriage returns
      .replace(/[\r\n]+/g, "")
      // Remove all tabs
      .replace(/\t/g, "")
      // Remove extra whitespace between tags (but preserve single spaces in content)
      .replace(/>\s+</g, "><")
      // Remove leading/trailing whitespace from the entire string
      .replace(/^\s+|\s+$/g, "")
      // Collapse multiple spaces into single space (but only outside of quoted strings)
      .replace(/\s{2,}/g, " ")
      // Remove spaces around = in attributes
      .replace(/\s*=\s*/g, "=")
      // Remove spaces before and after tag brackets
      .replace(/\s*<\s*/g, "<")
      .replace(/\s*>\s*/g, ">")
      // Minify CSS within style tags
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
        const minifiedCSS = css
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove CSS comments
          .replace(/\s*{\s*/g, "{")
          .replace(/\s*}\s*/g, "}")
          .replace(/\s*;\s*/g, ";")
          .replace(/\s*:\s*/g, ":")
          .replace(/\s*,\s*/g, ",")
          .replace(/;\s*}/g, "}") // Remove last semicolon before }
          .replace(/[\r\n\t]/g, "") // Remove all newlines and tabs
          .replace(/\s{2,}/g, " ") // Collapse multiple spaces
          .trim();
        return `<style>${minifiedCSS}</style>`;
      })
      // Minify inline style attributes
      .replace(/style\s*=\s*["']([^"']*?)["']/gi, (match, style) => {
        const minifiedStyle = style
          .replace(/\s*;\s*/g, ";")
          .replace(/\s*:\s*/g, ":")
          .replace(/;\s*$/, "") // Remove trailing semicolon
          .replace(/\s{2,}/g, " ")
          .trim();
        return `style="${minifiedStyle}"`;
      })
      // Remove optional quotes around simple attribute values (be careful with this)
      .replace(/=["']([a-zA-Z0-9\-_]+)["']/g, "=$1")
      // Remove spaces in self-closing tags
      .replace(/\s*\/\s*>/g, "/>")
      // Final cleanup
      .trim()
  );
};

class HTMLWidget extends WidgetType {
  constructor(readonly html: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-html-widget";
    span.innerHTML = DOMPurify.sanitize(this.html);
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class ImageWidget extends WidgetType {
  constructor(readonly url: string) {
    super();
  }

  toDOM() {
    const img = document.createElement("img");
    img.src = this.url;
    img.className = "cm-image-widget";
    img.style.maxWidth = "100%";
    return img;
  }

  ignoreEvent() {
    return false;
  }
}

class TextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.className = "cm-link-text";
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "• ";
    span.className = "cm-list-bullet";
    span.style.fontWeight = "bold";
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const { state } = view;
      const selection = state.selection.main;

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
          from,
          to,
          enter: (node) => {
            const nodeLine = state.doc.lineAt(node.from);
            const isHTML = node.name === "HTMLTag" || node.name === "HTMLBlock";

            // Reveal Logic
            // If it's HTML, reveal if selection intersects the BLOCK [node.from, node.to]
            // If it's anything else (Line-based), reveal if selection intersects the LINE.
            if (isHTML) {
              if (selection.from <= node.to && selection.to >= node.from) {
                return;
              }
            } else {
              if (selection.from <= nodeLine.to && selection.to >= nodeLine.from) {
                return;
              }
            }

            if (node.name === "HeaderMark") {

              const afterMark = state.sliceDoc(node.to, node.to + 1);
              let replacementEnd = node.to;
              if (afterMark === " ") {
                replacementEnd = node.to + 1;
              }
              builder.add(node.from, replacementEnd, Decoration.replace({}));

            } else if (node.name === "EmphasisMark") {
              builder.add(node.from, node.to, Decoration.replace({}));
            } else if (node.name === "CodeMark") {
              builder.add(node.from, node.to, Decoration.replace({}));
            } else if (node.name === "ListMark") {
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  widget: new BulletWidget(),
                })
              );
            } else if (node.name === "Image") {
              const text = state.sliceDoc(node.from, node.to);
              const match = text.match(/^!\[(.*?)\]\((.*?)\)$/);
              if (match) {
                const alt = match[1];
                const url = match[2];
                if (!alt) {
                  builder.add(
                    node.from,
                    node.to,
                    Decoration.replace({
                      widget: new ImageWidget(url),
                    })
                  );
                } else {
                  builder.add(
                    node.from,
                    node.to,
                    Decoration.replace({
                      widget: new TextWidget(alt),
                    })
                  );
                }
              }
            } else if (isHTML) {
              const text = state.sliceDoc(node.from, node.to);
              // Minify the HTML before rendering
              const minified = minifyHTML(text);
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  widget: new HTMLWidget(minified),
                })
              );
            }
          },
        });
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
