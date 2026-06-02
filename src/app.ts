import { loadSvgFile, mountSvg, SvgLoadError } from "./svg/loader";
import { ElementRegistry } from "./svg/registry";
import { TransformStore } from "./svg/transform-store";
import { InteractionController } from "./svg/interaction";
import { LayerPanel } from "./ui/layer-panel";
import { Tooltip } from "./ui/tooltip";
import { ContextMenu } from "./ui/context-menu";

const PANEL_COLLAPSED_KEY = "svg-disect-panel-collapsed";

export class App {
  private fileInput: HTMLInputElement;
  private resetAllBtn: HTMLButtonElement;
  private toggleLayersBtn: HTMLButtonElement;
  private layerPanelEl: HTMLElement;
  private dropZone: HTMLElement;
  private canvasArea: HTMLElement;
  private canvas: HTMLElement;
  private errorToast: HTMLElement;

  private layerPanel: LayerPanel;
  private tooltip: Tooltip;
  private contextMenu: ContextMenu;

  private registry: ElementRegistry | null = null;
  private transforms = new TransformStore();
  private interaction: InteractionController | null = null;
  private currentSvg: SVGSVGElement | null = null;

  constructor() {
    this.fileInput = document.getElementById("file-input") as HTMLInputElement;
    this.resetAllBtn = document.getElementById("reset-all") as HTMLButtonElement;
    this.toggleLayersBtn = document.getElementById("toggle-layers") as HTMLButtonElement;
    this.layerPanelEl = document.getElementById("layer-panel") as HTMLElement;
    this.dropZone = document.getElementById("drop-zone") as HTMLElement;
    this.canvasArea = document.querySelector(".canvas-area") as HTMLElement;
    this.canvas = document.getElementById("canvas") as HTMLElement;
    this.errorToast = document.getElementById("error-toast") as HTMLElement;

    const treeEl = document.getElementById("layer-tree") as HTMLElement;
    this.layerPanel = new LayerPanel(this.layerPanelEl, treeEl, {
      onSelect: (id) => this.interaction?.select(id),
      onHover: (id) => this.interaction?.hover(id),
    });

    this.tooltip = new Tooltip(document.getElementById("tooltip") as HTMLElement);
    this.contextMenu = new ContextMenu(document.getElementById("context-menu") as HTMLElement, {
      onAction: () => this.handleContextMenuAction(),
    });

    this.restorePanelState();
    this.bindEvents();
  }

  private restorePanelState(): void {
    const collapsed = sessionStorage.getItem(PANEL_COLLAPSED_KEY) === "true";
    this.layerPanel.setCollapsed(collapsed);
    this.syncLayersButton();
  }

  private syncLayersButton(): void {
    this.toggleLayersBtn.classList.toggle("active", !this.layerPanel.isCollapsed());
  }

  private bindEvents(): void {
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      if (file) void this.handleFile(file);
      this.fileInput.value = "";
    });

    this.resetAllBtn.addEventListener("click", () => this.resetAll());

    this.toggleLayersBtn.addEventListener("click", () => {
      const collapsed = !this.layerPanel.isCollapsed();
      this.layerPanel.setCollapsed(collapsed);
      sessionStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed));
      this.syncLayersButton();
    });

    this.canvasArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.canvasArea.classList.add("drag-over");
    });

    this.canvasArea.addEventListener("dragleave", () => {
      this.canvasArea.classList.remove("drag-over");
    });

    this.canvasArea.addEventListener("drop", (e) => {
      e.preventDefault();
      this.canvasArea.classList.remove("drag-over");
      const file = e.dataTransfer?.files[0];
      if (file?.type.includes("svg") || file?.name.endsWith(".svg")) {
        void this.handleFile(file);
      }
    });
  }

  private async handleFile(file: File): Promise<void> {
    this.hideError();
    try {
      const svg = await loadSvgFile(file);
      this.loadSvg(svg);
    } catch (err) {
      const message = err instanceof SvgLoadError ? err.message : "Failed to load SVG.";
      this.showError(message);
    }
  }

  private loadSvg(svg: SVGSVGElement): void {
    this.teardownInteraction();

    this.transforms.clear();
    mountSvg(this.canvas, svg);
    this.currentSvg = svg;

    this.registry = new ElementRegistry(svg);
    this.layerPanel.render(this.registry.root);
    this.resetAllBtn.disabled = false;

    this.dropZone.hidden = true;
    this.canvas.hidden = false;

    this.interaction = new InteractionController(svg, this.registry, this.transforms, {
      onSelect: (id) => {
        this.layerPanel.setSelected(id);
      },
      onHover: (id) => {
        this.layerPanel.setHovered(id);
      },
    });

    this.interaction.onTooltipMove = (node, x, y) => {
      if (node) {
        this.tooltip.show(node, x, y);
      } else {
        this.tooltip.hide();
      }
    };

    this.interaction.onContextMenuRequest = (x, y, node) => {
      this.contextMenu.show(x, y, node.id, this.transforms.hasMoved(node.id));
    };
  }

  private teardownInteraction(): void {
    this.interaction?.destroy();
    this.interaction = null;
    this.registry = null;
    this.currentSvg = null;
    this.tooltip.hide();
    this.contextMenu.hide();
    this.layerPanel.render(null);
    this.layerPanel.setSelected(null);
    this.layerPanel.setHovered(null);
  }

  private handleContextMenuAction(): void {
    const id = this.contextMenu.getTargetId();
    if (!id || !this.registry) return;
    const node = this.registry.get(id);
    if (!node) return;
    this.transforms.resetElement(id, node.element);
  }

  private resetAll(): void {
    if (!this.registry) return;
    this.transforms.resetAll(this.registry);
  }

  private showError(message: string): void {
    this.errorToast.textContent = message;
    this.errorToast.hidden = false;
    setTimeout(() => this.hideError(), 5000);
  }

  private hideError(): void {
    this.errorToast.hidden = true;
  }
}
