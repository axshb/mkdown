import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// This is our custom HighlightStyle.
// We are defining a mapping from Markdown-related tags to our own CSS classes.
const markdownHighlightStyle = HighlightStyle.define([
    { tag: tags.heading1, class: "cm-h1" },
    { tag: tags.heading2, class: "cm-h2" },
    { tag: tags.heading3, class: "cm-h3" },
    { tag: tags.heading4, class: "cm-h4" },
    { tag: tags.heading5, class: "cm-h5" },
    { tag: tags.heading6, class: "cm-h6" },
    { tag: tags.strong, class: "cm-strong" },
    { tag: tags.emphasis, class: "cm-em" },
    { tag: tags.quote, class: "cm-quote" },
    { tag: tags.strikethrough, class: "cm-strikethrough" },
    { tag: tags.list, class: "cm-list" },
    { tag: tags.link, class: "cm-link" },
    // { tag: tags.hr, class: "cm-hr" },
    // { tag: tags.inlineCode, class: "cm-inline-code" },
    { tag: tags.keyword, class: "cm-meta" }, // For things like ```javascript
]);

// This is the actual extension you'll add to CodeMirror.
export const markdownHighlighting = syntaxHighlighting(markdownHighlightStyle);