import type { RegistryNode } from "../svg/registry";

export interface LayerPanelCallbacks {
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function parseLabel(node: RegistryNode): { id: string | null; classes: string[] } {
  const el = node.element;
  const id = el.getAttribute("id");
  const cls = el.getAttribute("class");
  const classes = cls ? cls.trim().split(/\s+/).filter(Boolean) : [];
  return { id, classes };
}

export class LayerPanel {
  private container: HTMLElement;
  private treeEl: HTMLElement;
  private callbacks: LayerPanelCallbacks;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  constructor(panelEl: HTMLElement, treeEl: HTMLElement, callbacks: LayerPanelCallbacks) {
    this.container = panelEl;
    this.treeEl = treeEl;
    this.callbacks = callbacks;
  }

  setCollapsed(collapsed: boolean): void {
    this.container.hidden = collapsed;
  }

  isCollapsed(): boolean {
    return this.container.hidden === true;
  }

  render(root: RegistryNode | null): void {
    this.treeEl.replaceChildren();
    if (!root) {
      const empty = document.createElement("p");
      empty.className = "layer-tree-empty";
      empty.textContent = "Upload an SVG to see layers";
      this.treeEl.appendChild(empty);
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "layer-tree-root";
    ul.appendChild(this.buildTree(root));
    this.treeEl.appendChild(ul);
  }

  setSelected(id: string | null): void {
    if (this.selectedId) {
      const prev = this.treeEl.querySelector(`[data-layer-id="${this.selectedId}"]`);
      prev?.classList.remove("selected");
    }
    this.selectedId = id;
    if (id) {
      const row = this.treeEl.querySelector(`[data-layer-id="${id}"]`);
      row?.classList.add("selected");
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  setHovered(id: string | null): void {
    if (this.hoveredId) {
      const prev = this.treeEl.querySelector(`[data-layer-id="${this.hoveredId}"]`);
      prev?.classList.remove("hovered");
    }
    this.hoveredId = id;
    if (id) {
      this.treeEl.querySelector(`[data-layer-id="${id}"]`)?.classList.add("hovered");
    }
  }

  private buildTree(node: RegistryNode): HTMLElement {
    const li = document.createElement("li");
    li.className = "layer-node";

    const hasChildren = node.children.length > 0;
    const row = document.createElement("div");
    row.className = "layer-item";
    row.dataset.layerId = node.id;
    row.title = node.label;

    if (hasChildren) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "layer-chevron";
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Toggle group");
      toggle.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l4 3-4 3" fill="currentColor"/></svg>`;
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.classList.toggle("collapsed", expanded);
        const childList = li.querySelector(":scope > .layer-children");
        childList?.classList.toggle("collapsed", expanded);
      });
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "layer-chevron-spacer";
      row.appendChild(spacer);
    }

    const body = document.createElement("div");
    body.className = "layer-item-body";

    const tagSpan = document.createElement("span");
    tagSpan.className = "layer-tag";
    tagSpan.textContent = node.tag;
    body.appendChild(tagSpan);

    const { id, classes } = parseLabel(node);
    if (id) {
      const idSpan = document.createElement("span");
      idSpan.className = "layer-id";
      idSpan.textContent = `#${id}`;
      body.appendChild(idSpan);
    }
    if (classes.length > 0) {
      const clsSpan = document.createElement("span");
      clsSpan.className = "layer-class";
      clsSpan.textContent = `.${classes.join(".")}`;
      body.appendChild(clsSpan);
    }

    row.appendChild(body);

    row.addEventListener("click", (e) => {
      e.stopPropagation();
      this.callbacks.onSelect(node.id);
    });

    row.addEventListener("mouseenter", () => {
      this.callbacks.onHover(node.id);
    });

    row.addEventListener("mouseleave", () => {
      this.callbacks.onHover(null);
    });

    li.appendChild(row);

    if (hasChildren) {
      const ul = document.createElement("ul");
      ul.className = "layer-children";
      for (const child of node.children) {
        ul.appendChild(this.buildTree(child));
      }
      li.appendChild(ul);
    }

    return li;
  }
}
