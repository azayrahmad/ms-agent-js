import { AgentCore } from "../core/Core";
import { Balloon } from "./Balloon";
import bulletsUrl from "../assets/ui/ask-bullets.png";
import bulbsUrl from "../assets/ui/ask-bulbs.png";
import { formatColor } from "../utils";

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

  constructor(core: AgentCore, container: HTMLElement) {
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
    this.core.animationManager.draw(this.ctx, 0, 0, this.core.options.scale);
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
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        max-width: 250px;
        min-width: 100px;
        user-select: none;
      }
      .clippy-input {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        height: 100%;
        box-sizing: border-box;
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
        border-top: 1px solid grey;
        padding-top: 5px;
      }
      .clippy-input-buttons.single-button {
        justify-content: center;
      }
      .clippy-input-buttons button {
        display: flex;
        align-items: center;
        background-color: ${formatColor(this.core.definition.balloon.backColor)};
        border: 1px solid lightgrey;
        border-radius: 4px;
        padding: 2px 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
        color: inherit;

        position: relative;
        top: 1px;
        left: 1px;
      }

      /* Hover = raised */
      .clippy-input-buttons button:hover {
        top: 0;
        left: 0;
        border-bottom-color: darkgrey;
        border-right-color: darkgrey;
        box-shadow: inset 1px 1px white, 1px 1px lightgrey;
      }

      /* Pressed = pushed in */
      .clippy-input-buttons button:active {
        top: 1px;
        left: 1px;

        /* invert the bevel */
        border-top-color: grey;
        border-left-color: grey;
        border-bottom-color: lightgrey;
        border-right-color: lightgrey;

        box-shadow: inset 1px 1px darkgrey, inset -1px -1px white;
      }
      .clippy-input-buttons button .button-bullet {
        display: inline-block;
        margin-right: 5px;
        background-repeat: no-repeat;
      }
      .clippy-input-buttons button.style-bullet .button-bullet {
        width: 10px;
        height: 10px;
        background-image: url('${bulletsUrl}');
        background-position: 0 0;
      }
      .clippy-input-buttons button:hover.style-bullet .button-bullet {
        background-position: -10px 0;
      }
      .clippy-input-buttons button:active.style-bullet .button-bullet {
        background-position: -20px 0;
      }
      .clippy-input-buttons button.style-bulb .button-bullet {
        width: 11px;
        height: 15px;
        background-image: url('${bulbsUrl}');
        background-position: 0 0;
      }
      .clippy-input-buttons button:hover.style-bulb .button-bullet {
        background-position: -11px 0;
      }
      .clippy-input-buttons button:active.style-bulb .button-bullet {
        background-position: -22px 0;
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

      .clippy-choices li.clippy-pagination-link::before {
        display: none;
      }
      .clippy-choices li.clippy-pagination-link {
        justify-content: center;
        font-style: italic;
        opacity: 0.7;
      }
      .clippy-choices li.clippy-pagination-link:hover {
        opacity: 1;
      }

      .clippy-checkbox {
        align-self: flex-start;
        margin: 5px 0;
        display: flex;
        align-items: center;
      }
      .clippy-checkbox input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background: 0;
        border: none;
        margin: 0;
        opacity: 0;
        position: absolute;
      }
      .clippy-checkbox label {
        margin-left: 19px;
        position: relative;
        line-height: 13px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
      }
      .clippy-checkbox label:before {
        background: #fff;
        box-shadow: inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
        content: "";
        display: inline-block;
        height: 13px;
        left: -19px;
        margin-right: 6px;
        position: absolute;
        width: 13px;
      }
      .clippy-checkbox input[type="checkbox"]:active + label:before {
        background: silver;
      }
      .clippy-checkbox input[type="checkbox"]:checked + label:after {
        background: url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E");
        content: "";
        display: block;
        height: 7px;
        left: -16px;
        position: absolute;
        top: 3px;
        width: 7px;
      }
      .clippy-checkbox input[type="checkbox"][disabled] + label {
        color: grey;
        text-shadow: 1px 1px 0 #fff;
        cursor: default;
      }
      .clippy-checkbox input[type="checkbox"][disabled] + label:before {
        background: silver;
      }
      .clippy-checkbox input[type="checkbox"][disabled]:checked + label:after {
        background: url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='gray'/%3E%3C/svg%3E");
      }
    `;
  }
}
