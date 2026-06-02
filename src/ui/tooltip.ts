import type { RegistryNode } from "../svg/registry";

export class Tooltip {
  private el: HTMLElement;

  constructor(element: HTMLElement) {
    this.el = element;
  }

  show(node: RegistryNode, clientX: number, clientY: number): void {
    let bbox = "";
    try {
      const g = node.element as SVGGraphicsElement;
      if ("getBBox" in g) {
        const b = g.getBBox();
        bbox = `${Math.round(b.width)}×${Math.round(b.height)}`;
      }
    } catch {
      bbox = "—";
    }

    const idPart = node.element.getAttribute("id")
      ? `<span class="tooltip-meta">#${node.element.getAttribute("id")}</span>`
      : "";
    const cls = node.element.getAttribute("class");
    const clsPart = cls
      ? `<span class="tooltip-meta"> .${cls.trim().split(/\s+/).join(".")}</span>`
      : "";

    this.el.innerHTML = `
      <span class="tooltip-tag">${node.tag}</span>${idPart}${clsPart}
      <br><span class="tooltip-meta">${bbox}</span>
    `;
    this.el.hidden = false;
    this.position(clientX, clientY);
  }

  move(clientX: number, clientY: number): void {
    if (this.el.hidden) return;
    this.position(clientX, clientY);
  }

  hide(): void {
    this.el.hidden = true;
  }

  private position(clientX: number, clientY: number): void {
    const pad = 12;
    const rect = this.el.getBoundingClientRect();
    let x = clientX + pad;
    let y = clientY + pad;
    if (x + rect.width > window.innerWidth - 8) {
      x = clientX - rect.width - pad;
    }
    if (y + rect.height > window.innerHeight - 8) {
      y = clientY - rect.height - pad;
    }
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
}
