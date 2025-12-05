import { HighlightStyle } from "@codemirror/language"
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

export const markdownStyling = HighlightStyle.define([

    { tag: t.heading1, fontSize: "1.8em" },
    { tag: t.heading2, fontSize: "1.6em" },
    { tag: t.heading3, fontSize: "1.4em" },
    { tag: [t.strong], fontWeight: "bold" },
    { tag: [t.emphasis], fontStyle: "italic" },
    { tag: [t.link], textDecoration: "underline" },
    { tag: [t.quote], fontStyle: "italic" },
    { tag: [t.strikethrough], textDecoration: "line-through" },
    { tag: [t.list] },
]);