interface TransformEntry {
  baseline: string;
  dragDx: number;
  dragDy: number;
}

export class TransformStore {
  private entries = new Map<string, TransformEntry>();

  ensureBaseline(id: string, element: SVGElement): void {
    if (this.entries.has(id)) return;
    this.entries.set(id, {
      baseline: element.getAttribute("transform") ?? "",
      dragDx: 0,
      dragDy: 0,
    });
  }

  getDragOffset(id: string): { dx: number; dy: number } {
    const entry = this.entries.get(id);
    return entry ? { dx: entry.dragDx, dy: entry.dragDy } : { dx: 0, dy: 0 };
  }

  hasMoved(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    return entry.dragDx !== 0 || entry.dragDy !== 0;
  }

  applyTransform(element: SVGElement, id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    const parts: string[] = [];
    if (entry.baseline) parts.push(entry.baseline);
    if (entry.dragDx !== 0 || entry.dragDy !== 0) {
      parts.push(`translate(${entry.dragDx}, ${entry.dragDy})`);
    }

    const value = parts.join(" ").trim();
    if (value) {
      element.setAttribute("transform", value);
    } else {
      element.removeAttribute("transform");
    }
  }

  setDragOffset(id: string, element: SVGElement, dx: number, dy: number): void {
    this.ensureBaseline(id, element);
    const entry = this.entries.get(id)!;
    entry.dragDx = dx;
    entry.dragDy = dy;
    this.applyTransform(element, id);
  }

  addDragDelta(id: string, element: SVGElement, deltaX: number, deltaY: number): void {
    this.ensureBaseline(id, element);
    const entry = this.entries.get(id)!;
    entry.dragDx += deltaX;
    entry.dragDy += deltaY;
    this.applyTransform(element, id);
  }

  resetElement(id: string, element: SVGElement): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.dragDx = 0;
    entry.dragDy = 0;
    if (entry.baseline) {
      element.setAttribute("transform", entry.baseline);
    } else {
      element.removeAttribute("transform");
    }
  }

  resetAll(registry: { get(id: string): { element: SVGElement } | undefined }): void {
    for (const [id, entry] of this.entries) {
      entry.dragDx = 0;
      entry.dragDy = 0;
      const node = registry.get(id);
      if (!node) continue;
      if (entry.baseline) {
        node.element.setAttribute("transform", entry.baseline);
      } else {
        node.element.removeAttribute("transform");
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
