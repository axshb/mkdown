import { EditorView, WidgetType, Decoration } from "@codemirror/view";
import { ViewPlugin, ViewUpdate, DecorationSet } from "@codemirror/view";

// A "widget" that will be our <img> tag.
class ImageWidget extends WidgetType {
    constructor(readonly url: string) {
        super();
    }

    toDOM() {
        const img = document.createElement("img");
        img.src = this.url;
        img.style.maxWidth = "100%";
        img.style.display = "block"; // Make it take its own line
        return img;
    }

    // Images don't have a text equivalent, so we ignore events.
    ignoreEvent() {
        return true;
    }
}

// The main plugin that finds image syntax and applies the widget decoration.
export const imagePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.findImages(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.findImages(update.view);
        }
    }

    findImages(view: EditorView) {
        const widgets: any[] = [];
        // A simple regex to find ![alt](url)
        const imageRegex = /!\[.*?\]\((.*?)\)/g;

        // Iterate over the visible part of the document
        for (const { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            let match;
            while ((match = imageRegex.exec(text))) {
                const url = match[1];
                const start = from + match.index;
                const end = start + match[0].length;
                
                // Insert image widget to the line below the matched text
                const line = view.state.doc.lineAt(start);
                const deco = Decoration.widget({
                    widget: new ImageWidget(url),
                    side: 1, // Insert after the position
                });
                widgets.push(deco.range(line.to));
                
            }
        }
        return Decoration.set(widgets);
    }
}, {
    decorations: v => v.decorations,
});