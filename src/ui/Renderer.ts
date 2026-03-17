import { AgentCore } from "../core/Core";
import { Balloon } from "./Balloon";
import bulletsUrl from "../assets/ui/ask-bullets.png";
import bulbsUrl from "../assets/ui/ask-bulbs.png";

/**
 * The rendering layer of the Agent system.
 * It manages the Shadow DOM container, the rendering canvas,
 * component styles, and the speech balloon UI.
 */
export class AgentRenderer {
  /** The main rendering canvas element. */
  public readonly canvas: HTMLCanvasElement;
  /** The 2D rendering context for the canvas. */
  public readonly ctx: CanvasRenderingContext2D;
  /** The ShadowRoot used for component isolation. */
  public readonly shadowRoot: ShadowRoot;
  /** The manager for the speech balloon UI. */
  public readonly balloon: Balloon;

  /**
   * @param core - The headless core instance to render.
   * @param container - The parent HTMLElement to host the agent.
   */
  private readonly core: AgentCore;

  constructor(
    core: AgentCore,
    container: HTMLElement,
  ) {
    this.core = core;
    this.shadowRoot = container.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);

    this.canvas = document.createElement("canvas");
    this.shadowRoot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    this.balloon = new Balloon(this.canvas, this.shadowRoot, core.definition);

    this.setupCanvas();
  }

  /**
   * Sets initial canvas dimensions based on character definition and scaling.
   */
  private setupCanvas() {
    const width = this.core.spriteManager.getSpriteWidth();
    const height = this.core.spriteManager.getSpriteHeight();
    this.canvas.width = width * this.core.options.scale;
    this.canvas.height = height * this.core.options.scale;
  }

  /**
   * Updates the canvas dimensions, usually called after a scale change.
   */
  public updateCanvasSize() {
    this.setupCanvas();
  }

  /**
   * Clears the canvas and draws the current animation frame from the core.
   */
  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.core.animationManager.draw(
      this.ctx,
      0,
      0,
      this.core.options.scale,
    );
  }

  /**
   * Generates the CSS styles for the agent component.
   */
  private getStyles(): string {
    const { options } = this.core;
    return `
      :host {
        display: block;
        position: ${options.fixed ? "fixed" : "absolute"};
        left: ${options.x}px;
        top: ${options.y}px;
        z-index: 9999;
        pointer-events: none;
      }
      canvas {
        display: block;
        image-rendering: pixelated;
        pointer-events: auto;
        cursor: pointer;
        touch-action: none;
      }
      .clippy-balloon {
        position: absolute;
        z-index: 1000;
        pointer-events: auto;
      }
      .clippy-content {
        max-width: 250px;
        min-width: 120px;
        user-select: none;
      }
      .clippy-ask {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
      .clippy-title {
        font-weight: bold;
        white-space: pre-wrap;
      }
      .clippy-content-area {
        font-size: 0.9em;
      }
      .clippy-content-area img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 4px 0;
      }
      .clippy-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.9em;
        cursor: pointer;
      }
      .clippy-checkbox input {
        margin: 0;
        cursor: pointer;
      }
      .clippy-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
        margin-top: 4px;
      }
      .clippy-btn {
        padding: 2px 10px;
        font-family: inherit;
        font-size: 11px;
        background: #efefef;
        border: 1px solid #7f7f7f;
        box-shadow: inset 1px 1px #fff, 1px 1px #000;
        cursor: pointer;
      }
      .clippy-btn:active {
        box-shadow: inset 1px 1px #000, 1px 1px #fff;
        padding: 3px 9px 1px 11px;
      }
      .clippy-choices {
        width: 100%;
        margin: 5px 0 0 0;
        padding: 0;
        list-style: none;
      }
      .clippy-choices li {
        display: flex;
        align-items: center;
        padding: 2px 4px;
        cursor: pointer;
      }
      .clippy-choices li span {
        border: 1px dashed transparent;
        padding: 1px 2px;
      }
      .clippy-choices li:hover span {
        border: 1px dashed grey;
      }
      .clippy-choices li::before {
        content: "";
        display: inline-block;
        margin-right: 8px;
        background-repeat: no-repeat;
      }
      .clippy-choices.style-bullet li::before {
        width: 10px;
        height: 10px;
        background-image: url('${bulletsUrl}');
        background-position: 0 0;
      }
      .clippy-choices.style-bullet li:hover::before {
        background-position: -10px 0;
      }
      .clippy-choices.style-bullet li:active::before {
        background-position: -20px 0;
      }
      .clippy-choices.style-bulb li::before {
        width: 11px;
        height: 15px;
        background-image: url('${bulbsUrl}');
        background-position: 0 0;
      }
      .clippy-choices.style-bulb li:hover::before {
        background-position: -11px 0;
      }
      .clippy-choices.style-bulb li:active::before {
        background-position: -22px 0;
      }
    `;
  }
}
