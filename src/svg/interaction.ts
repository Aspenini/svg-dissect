import type { ElementRegistry, RegistryNode } from "./registry";
import type { TransformStore } from "./transform-store";

export interface InteractionCallbacks {
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export class InteractionController {
  private svg: SVGSVGElement;
  private registry: ElementRegistry;
  private transforms: TransformStore;
  private callbacks: InteractionCallbacks;

  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private dragging = false;
  private dragNode: RegistryNode | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragInitialDx = 0;
  private dragInitialDy = 0;

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;

  constructor(
    svg: SVGSVGElement,
    registry: ElementRegistry,
    transforms: TransformStore,
    callbacks: InteractionCallbacks,
  ) {
    this.svg = svg;
    this.registry = registry;
    this.transforms = transforms;
    this.callbacks = callbacks;

    this.boundPointerDown = (e) => this.onPointerDown(e);
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerUp = (e) => this.onPointerUp(e);
    this.boundContextMenu = (e) => this.onContextMenu(e);
    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseLeave = () => this.onMouseLeave();
    this.boundClick = (e) => this.onClick(e);

    this.attach();
  }

  destroy(): void {
    this.svg.removeEventListener("pointerdown", this.boundPointerDown);
    this.svg.removeEventListener("pointermove", this.boundPointerMove);
    this.svg.removeEventListener("pointerup", this.boundPointerUp);
    this.svg.removeEventListener("contextmenu", this.boundContextMenu);
    this.svg.removeEventListener("mousemove", this.boundMouseMove);
    this.svg.removeEventListener("mouseleave", this.boundMouseLeave);
    this.svg.removeEventListener("click", this.boundClick);
  }

  private attach(): void {
    this.svg.addEventListener("pointerdown", this.boundPointerDown);
    this.svg.addEventListener("pointermove", this.boundPointerMove);
    this.svg.addEventListener("pointerup", this.boundPointerUp);
    this.svg.addEventListener("contextmenu", this.boundContextMenu);
    this.svg.addEventListener("mousemove", this.boundMouseMove);
    this.svg.addEventListener("mouseleave", this.boundMouseLeave);
    this.svg.addEventListener("click", this.boundClick);
  }

  select(id: string | null): void {
    if (this.selectedId) {
      this.registry.get(this.selectedId)?.element.classList.remove("disect-selected");
    }
    this.selectedId = id;
    if (id) {
      this.registry.get(id)?.element.classList.add("disect-selected");
    }
    this.callbacks.onSelect(id);
  }

  hover(id: string | null): void {
    if (this.hoveredId) {
      this.registry.get(this.hoveredId)?.element.classList.remove("disect-hover");
    }
    this.hoveredId = id;
    if (id && id !== this.selectedId) {
      this.registry.get(id)?.element.classList.add("disect-hover");
    }
    this.callbacks.onHover(id);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getHoveredId(): string | null {
    return this.hoveredId;
  }

  getNodeAt(clientX: number, clientY: number): RegistryNode | undefined {
    return this.registry.findInspectableAtPoint(this.svg, clientX, clientY);
  }

  private screenToSvgDelta(dx: number, dy: number): { x: number; y: number } {
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: dx, y: dy };
    const scaleX = Math.hypot(ctm.a, ctm.b) || 1;
    const scaleY = Math.hypot(ctm.c, ctm.d) || 1;
    return { x: dx / scaleX, y: dy / scaleY };
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const node = this.registry.findInspectableAtPoint(this.svg, e.clientX, e.clientY);
    if (!node || !node.draggable) return;

    e.preventDefault();
    this.select(node.id);
    this.dragging = true;
    this.dragNode = node;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const offset = this.transforms.getDragOffset(node.id);
    this.dragInitialDx = offset.dx;
    this.dragInitialDy = offset.dy;
    node.element.classList.add("disect-dragging");
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging || !this.dragNode) return;
    const screenDx = e.clientX - this.dragStartX;
    const screenDy = e.clientY - this.dragStartY;
    const { x, y } = this.screenToSvgDelta(screenDx, screenDy);
    this.transforms.setDragOffset(
      this.dragNode.id,
      this.dragNode.element,
      this.dragInitialDx + x,
      this.dragInitialDy + y,
    );
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragNode) {
      this.dragNode.element.classList.remove("disect-dragging");
      this.dragNode = null;
    }
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  private onContextMenu(e: MouseEvent): void {
    const node = this.registry.findInspectableAtPoint(this.svg, e.clientX, e.clientY);
    if (!node) return;
    e.preventDefault();
    this.select(node.id);
    this.contextMenuTarget = node;
    this.onContextMenuRequest?.(e.clientX, e.clientY, node);
  }

  contextMenuTarget: RegistryNode | null = null;
  onContextMenuRequest?: (x: number, y: number, node: RegistryNode) => void;

  private onMouseMove(e: MouseEvent): void {
    if (this.dragging) return;
    const node = this.registry.findInspectableAtPoint(this.svg, e.clientX, e.clientY);
    this.hover(node?.id ?? null);
    this.onTooltipMove?.(node ?? null, e.clientX, e.clientY);
  }

  onTooltipMove?: (node: RegistryNode | null, x: number, y: number) => void;

  private onMouseLeave(): void {
    if (!this.dragging) {
      this.hover(null);
      this.onTooltipMove?.(null, 0, 0);
    }
  }

  private onClick(e: MouseEvent): void {
    const node = this.registry.findInspectableAtPoint(this.svg, e.clientX, e.clientY);
    this.select(node?.id ?? null);
  }
}
