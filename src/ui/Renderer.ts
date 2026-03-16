import { AgentCore } from "../core/Core";
import { Balloon } from "./Balloon";

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
        min-width: 100px;
        user-select: none;
      }
      .clippy-input {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 5px;
      }
      .clippy-input b {
        align-self: flex-start;
        margin-bottom: 5px;
      }
      .clippy-input textarea {
        width: 100%;
        margin-bottom: 10px;
        background-color: white;
        border: 1px solid grey;
        box-shadow: none;
        resize: none;
        font-family: inherit;
        font-size: inherit;
        box-sizing: border-box;
      }
      .clippy-input-buttons {
        display: flex;
        justify-content: space-between;
        width: 100%;
      }
      .clippy-input-buttons button {
        background-color: transparent;
        border: 1px solid grey;
        border-radius: 4px;
        width: 70px;
        padding: 2px;
        cursor: pointer;
      }
      .clippy-input-buttons button:hover {
        background-color: #eee;
      }
      .clippy-input-buttons .ask-button {
        margin-right: 5px;
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
        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAKCAYAAACjd+4vAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABJ0lEQVR4nI2T0ZHDMAhE6YmeaMEduAfacB0Uk/98kAEtFnKUm2NGk9ja7NOCQoS6rsuP4/DzPHPFM20q3pfmL52Z5V5f9MuMRZ3ZnFicWL/EXRf7hM+nrqBq7urubO6kvurKLExYDWYD3E1vqAIY+tLK1BVUzF0alNWdrMETykhaSViW5FF1OMrDWZqM7+M3cYioMA4YF9THYsMaMqeY60wow2xJLhOc++pkNloYBk17gxVQHMAanAqc0QHIlGpo0UxThneLw8nH/PKZH7pqLaBRCUfqBxizU6QxQ7ubIVoaOon9SNDG0xP3tHVI7uC6OB0+5z3M+kVcDomLtdUBIoAKWt91WfkCLa8b/SVadPMvtdPF7c6W16x30G7aaysq3fv1P90Pvw9ngYe+Mzz0LwAAAABJRU5ErkJggg==');
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
        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAPCAYAAABqQqYpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABF0lEQVR4nM2TwQ3DIAxF2SmzZAVWyCzccugEmYM7A2SCTED1oQbHGJpGOdTSV6T0YV4xMYaVjybK8N/vssdxRJlu0yiCd05pnlkv4lQWG2rsvu+xI2BZdBFdIDfGOs7qApUtIq2AU0VCCOlZG/GqjRGwZwHJVh6skHCiYU9CK6yZUs4SWtEemb15ElrlpsT+LOEv3IkqQaclBWxHYjQOJuFOIu3XYT2XIBGeLJ7/EB+HHVxMCH8kUCGEIsJDAtu2lRsPlmbPQ3zL0oh5poZNhRck4piAdVPz7YNVhTusFFYFpEjavCMg2SL8hcXRX2HNur7SjPCc5zkuy9KFwWDuT7OGLhSegJERiwL/JGv+4iRoAaCh7cPsG2DiVwOHvNTDAAAAAElFTkSuQmCC');
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
