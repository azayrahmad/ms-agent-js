import { AgentCore } from "../core/Core";
import { AgentRenderer } from "./Renderer";

/**
 * Manager responsible for handling user input events and agent positioning.
 */
export class InputManager {
  private core: AgentCore;
  private renderer: AgentRenderer;
  private emit: (event: string, ...args: any[]) => void;
  private setInstantPosition: (x: number, y: number) => void;

  private isDragging: boolean = false;
  private wasDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialAgentX: number = 0;
  private initialAgentY: number = 0;

  constructor(
    core: AgentCore,
    renderer: AgentRenderer,
    emit: (event: string, ...args: any[]) => void,
    setInstantPosition: (x: number, y: number) => void,
  ) {
    this.core = core;
    this.renderer = renderer;
    this.emit = emit;
    this.setInstantPosition = setInstantPosition;

    this.setupDragging();
    this.renderer.canvas.addEventListener("click", () => {
      if (!this.wasDragging) {
        this.emit("click");
      }
    });

    if (this.core.options.keepInViewport) {
      window.addEventListener("resize", this.handleResize);
    }
  }

  /**
   * Cleans up event listeners.
   */
  public destroy() {
    window.removeEventListener("resize", this.handleResize);
  }

  /**
   * Handles window resize events to keep the agent in viewport.
   */
  public handleResize = () => {
    const canvas = this.renderer.canvas;
    const maxX = window.innerWidth - canvas.width;
    const maxY = window.innerHeight - canvas.height;

    let nx = this.core.options.x;
    let ny = this.core.options.y;

    let changed = false;
    if (nx > maxX) {
      nx = Math.max(0, maxX);
      changed = true;
    }
    if (ny > maxY) {
      ny = Math.max(0, maxY);
      changed = true;
    }

    if (changed) {
      this.setInstantPosition(nx, ny);
      this.emit("reposition", { x: nx, y: ny });
    }
  };

  /**
   * Sets up drag-and-drop behavior for the agent.
   */
  private setupDragging() {
    let longPressTimer: number | null = null;
    const canvas = this.renderer.canvas;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.wasDragging = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialAgentX = this.core.options.x;
      this.initialAgentY = this.core.options.y;

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      this.emit("dragstart");

      longPressTimer = window.setTimeout(() => {
        this.emit("contextmenu", {
          x: e.clientX,
          y: e.clientY,
          originalEvent: e,
        });
        this.isDragging = false;
        this.wasDragging = false;
        cleanup();
      }, 500);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.wasDragging = true;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      let nx = this.initialAgentX + dx;
      let ny = this.initialAgentY + dy;

      const maxX = window.innerWidth - canvas.width;
      const maxY = window.innerHeight - canvas.height;
      nx = Math.max(0, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));

      this.setInstantPosition(nx, ny);
      this.emit("drag", { x: nx, y: ny });
    };

    const cleanup = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    const onPointerUp = () => {
      if (!this.isDragging) {
        cleanup();
        return;
      }
      this.isDragging = false;
      cleanup();
      this.emit("dragend");
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      this.emit("contextmenu", {
        x: e.clientX,
        y: e.clientY,
        originalEvent: e,
      });
    });
  }
}
