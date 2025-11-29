import { HighlightStyle } from "@codemirror/language"
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";


export const slateTheme = HighlightStyle.define([

    // CODE SYNTAX HIGHLIGHTING
    { tag: t.keyword, color: "#c792ea" },           // Soft purple for keywords
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#82aaff" }, // Soft blue for names
    { tag: [t.function(t.variableName), t.labelName], color: "#ffcb6b" }, // Warm yellow for functions
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#f78c6c" }, // Orange for constants
    { tag: [t.definition(t.name), t.separator], color: "#89ddff" },       // Light blue for definitions
    { tag: [t.typeName, t.className], color: "#f07178" },                 // Pink/red for types/classes
    { tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#f78c6c" }, // Orange for numbers and modifiers
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link], color: "#89ddff" }, // Light blue for operators/links
    { tag: [t.meta, t.comment], color: "#546e7a", fontStyle: "italic" }, // Muted blue-gray for comments/meta
    { tag: [t.string, t.inserted], color: "#c3e88d" },                   // Soft green for strings
    { tag: t.special(t.string), color: "#f07178" },                      // Pink/red for special strings
    { tag: t.invalid, color: "#f07178", borderBottom: "1px dotted #f07178" }, // Error style

    // MARKDOWN STYLING
    { tag: t.heading1, fontSize: "1.8em" },
    { tag: t.heading2, fontSize: "1.6em" },
    { tag: t.heading3, fontSize: "1.4em" },
    { tag: [t.strong], fontWeight: "bold" },
    { tag: [t.emphasis], fontStyle: "italic" },
    { tag: [t.link], color: "#50fa7b", textDecoration: "underline" },
    { tag: [t.quote], fontStyle: "italic" },
    { tag: [t.strikethrough], textDecoration: "line-through" },
    { tag: [t.list] },
  ]);
  
  // CENTERED LAYOUT (READABLE LINE LENGTHS)
  export const centeredLayout = EditorView.theme({
    "&": {
      maxWidth: "1200px",   // Fixed max-width for larger screens
      minWidth: "400px",
      width: "100%",  
      margin: "0 auto",       
      padding: "1em 2em",   
      lineHeight: "1.6", 
    },
    ".cm-content": {
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      fontSize: "18px", 
      
    }
  });
  