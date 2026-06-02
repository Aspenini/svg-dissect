export type ContextMenuAction = "reset-position";

export interface ContextMenuCallbacks {
  onAction: (action: ContextMenuAction) => void;
}

export class ContextMenu {
  private el: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private callbacks: ContextMenuCallbacks;
  private targetId: string | null = null;

  constructor(element: HTMLElement, callbacks: ContextMenuCallbacks) {
    this.el = element;
    this.callbacks = callbacks;
    this.resetBtn = element.querySelector('[data-action="reset-position"]') as HTMLButtonElement;

    this.resetBtn.addEventListener("click", () => {
      if (this.targetId) {
        this.callbacks.onAction("reset-position");
      }
      this.hide();
    });

    document.addEventListener("click", (e) => {
      if (!this.el.hidden && !this.el.contains(e.target as Node)) {
        this.hide();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
  }

  show(clientX: number, clientY: number, targetId: string, canReset: boolean): void {
    this.targetId = targetId;
    this.resetBtn.disabled = !canReset;
    this.el.hidden = false;
    this.el.style.left = `${clientX}px`;
    this.el.style.top = `${clientY}px`;
  }

  hide(): void {
    this.el.hidden = true;
    this.targetId = null;
  }

  getTargetId(): string | null {
    return this.targetId;
  }
}
