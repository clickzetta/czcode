# Mermaid Diagrams

Chat Markdown renders fenced `mermaid` code blocks as diagrams after a response finishes streaming.

## Behavior

- Valid `mermaid` fences render inline as SVG diagrams.
- The original Mermaid source remains available through the existing code-block copy button.
<<<<<<< HEAD
||||||| 12f7967ca4
## Location (kilocode-legacy)
=======
- Rendered diagrams include Copy and Download menus for Mermaid source, SVG, and PNG formats.
>>>>>>> yunqiqiliang/opencode-v7.3.0
- Invalid Mermaid syntax shows a contained error state and keeps the source visible.
- Diagrams are not rendered while a message is streaming, which avoids repeated parse/render work on every token.
- Diagram colors are derived from the active VS Code/Kilo CSS variables so light, dark, and high-contrast themes can render with matching backgrounds, text, borders, and link colors.

## Limitations

- Mermaid is bundled by the current webview build, so bundle splitting remains a future optimization.
<<<<<<< HEAD
- Advanced legacy actions are not restored yet: AI syntax fixing, PNG open/save, export, and zoom modal.
||||||| 12f7967ca4
- `webview-ui/src/components/common/MermaidBlock.tsx`
- `webview-ui/src/components/common/MermaidButton.tsx`

## Remaining Work

- Mermaid diagram rendering in chat messages (code blocks with `mermaid` language tag)
- "Fix with AI" button for mermaid syntax errors — route to CLI
- Copy button for diagram code
- Click to open rendered diagram as PNG in editor
- Error expansion with original code display
- Loading states during processing
=======
- Advanced legacy actions are not restored yet: AI syntax fixing and zoom modal.
>>>>>>> yunqiqiliang/opencode-v7.3.0
