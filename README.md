# SVG Disect

A lightweight web tool for visually inspecting and experimenting with SVG files. Upload an SVG, hover elements to highlight and identify them, drag parts independently, and reset positions per-element or globally.

## Development

```bash
bun dev
```

Opens the app with Bun's built-in HTML/TypeScript dev server (HMR included).

## Production build

```bash
bun run build
bun run preview
```

Output is written to `dist/` and can be served by any static host.

## Usage

1. Click **Upload SVG** or drag a `.svg` file onto the canvas area.
2. Hover elements on the canvas to see highlights and a tooltip with tag, id, and classes.
3. Use the **Layers** panel to browse the element tree; click or hover rows to sync with the canvas.
4. Click and drag any part to move it independently.
5. Right-click an element and choose **Reset position** to restore that element.
6. Click **Reset all** to restore the entire layout.

A sample file is included at `public/sample.svg` for testing.
