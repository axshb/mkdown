import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

export const markdownStyling = HighlightStyle.define([
  // Use theme's foreground color for "structural" text to keep it looking clean/uniform
  { tag: t.heading1, fontSize: "1.5em", color: "inherit" },
  { tag: t.heading2, fontSize: "1.3em", color: "inherit" },
  { tag: t.heading3, fontSize: "1.2em", color: "inherit" },
  { tag: [t.strong], fontWeight: "bold", color: "inherit" },

  // Use CSS variables for configurable colors
  { tag: [t.emphasis], fontStyle: "italic", color: "var(--mkdown-color-italics)" },
  { tag: [t.quote], fontStyle: "italic", color: "var(--mkdown-color-quote)" },

  { tag: [t.link], textDecoration: "underline" },
  { tag: [t.strikethrough], textDecoration: "line-through" },
  { tag: [t.list] },
]);
