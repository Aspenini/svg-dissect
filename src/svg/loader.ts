const UNSAFE_TAGS = new Set(["script", "foreignobject"]);

export class SvgLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgLoadError";
  }
}

function sanitizeNode(node: Element): void {
  const tag = node.tagName.toLowerCase();
  if (UNSAFE_TAGS.has(tag)) {
    node.remove();
    return;
  }

  const attrs = [...node.attributes];
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || attr.value.trim().toLowerCase().startsWith("javascript:")) {
      node.removeAttribute(attr.name);
    }
  }

  for (const child of [...node.children]) {
    sanitizeNode(child);
  }
}

export async function loadSvgFile(file: File): Promise<SVGSVGElement> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new SvgLoadError("Invalid SVG: could not parse XML.");
  }

  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg") {
    throw new SvgLoadError("File does not contain a root <svg> element.");
  }

  sanitizeNode(svg);

  const imported = document.importNode(svg, true) as unknown as SVGSVGElement;
  if (!imported.getAttribute("viewBox")) {
    const w = imported.getAttribute("width");
    const h = imported.getAttribute("height");
    if (w && h) {
      const wn = parseFloat(w);
      const hn = parseFloat(h);
      if (!Number.isNaN(wn) && !Number.isNaN(hn)) {
        imported.setAttribute("viewBox", `0 0 ${wn} ${hn}`);
      }
    }
  }

  return imported;
}

export function mountSvg(container: HTMLElement, svg: SVGSVGElement): void {
  container.replaceChildren(svg);
}
