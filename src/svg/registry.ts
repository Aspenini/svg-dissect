export const INSPECTABLE_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "use",
  "image",
  "defs",
]);

export const DRAGGABLE_TAGS = new Set([
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "use",
  "image",
]);

const DEFS_CHILD_TAGS = new Set([
  "lineargradient",
  "radialgradient",
  "pattern",
  "clippath",
  "mask",
  "filter",
  "marker",
  "symbol",
  "style",
]);

export interface RegistryNode {
  id: string;
  element: SVGElement;
  tag: string;
  label: string;
  children: RegistryNode[];
  draggable: boolean;
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `d${idCounter}`;
}

export function formatLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  let label = tag;
  const id = el.getAttribute("id");
  if (id) label += `#${id}`;
  const cls = el.getAttribute("class");
  if (cls) {
    const first = cls.trim().split(/\s+/)[0];
    if (first) label += `.${first}`;
  }
  return label;
}

function isInsideDefs(el: Element): boolean {
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === "defs") return true;
    parent = parent.parentElement;
  }
  return false;
}

function isDraggable(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (!DRAGGABLE_TAGS.has(tag)) return false;
  if (isInsideDefs(el)) return false;
  if (DEFS_CHILD_TAGS.has(tag)) return false;
  return true;
}

function walkElement(el: Element, nodes: RegistryNode[]): RegistryNode | null {
  const tag = el.tagName.toLowerCase();
  if (!INSPECTABLE_TAGS.has(tag) && tag !== "svg") {
    for (const child of [...el.children]) {
      walkElement(child, nodes);
    }
    return null;
  }

  const id = nextId();
  el.setAttribute("data-disect-id", id);

  const node: RegistryNode = {
    id,
    element: el as SVGElement,
    tag,
    label: formatLabel(el),
    children: [],
    draggable: isDraggable(el),
  };

  for (const child of [...el.children]) {
    walkElement(child, node.children);
  }

  nodes.push(node);
  return node;
}

export class ElementRegistry {
  readonly root: RegistryNode | null;
  private byId = new Map<string, RegistryNode>();

  constructor(svg: SVGSVGElement) {
    idCounter = 0;
    const nodes: RegistryNode[] = [];
    walkElement(svg, nodes);
    this.root = nodes[0] ?? null;
    this.indexNodes();
  }

  private indexNodes(): void {
    this.byId.clear();
    const visit = (node: RegistryNode) => {
      this.byId.set(node.id, node);
      for (const child of node.children) visit(child);
    };
    if (this.root) visit(this.root);
  }

  get(id: string): RegistryNode | undefined {
    return this.byId.get(id);
  }

  findByElement(el: Element | null): RegistryNode | undefined {
    if (!el) return undefined;
    const id = el.getAttribute("data-disect-id");
    if (id) return this.byId.get(id);
    let current: Element | null = el;
    while (current) {
      const cid = current.getAttribute("data-disect-id");
      if (cid) return this.byId.get(cid);
      current = current.parentElement;
    }
    return undefined;
  }

  findInspectableAtPoint(svg: SVGSVGElement, clientX: number, clientY: number): RegistryNode | undefined {
    const hit = document.elementFromPoint(clientX, clientY);
    if (!hit || !svg.contains(hit)) return undefined;
    return this.findByElement(hit);
  }
}
