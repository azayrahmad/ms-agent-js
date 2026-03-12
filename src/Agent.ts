import { CharacterParser } from "./CharacterParser";
import { SpriteManager } from "./SpriteManager";
import { AnimationManager } from "./AnimationManager";
import { AudioManager } from "./AudioManager";
import { StateManager } from "./StateManager";
import { Balloon } from "./Balloon";
import { RequestQueue } from "./RequestQueue";
import type { TTSOptions } from "./Balloon";
import type { AgentCharacterDefinition, AgentRequest } from "./types";

/**
 * Configuration options for creating an Agent.
 */
export interface AgentOptions {
  /** The parent element for the agent. If not provided, a div will be appended to document.body. */
  container?: HTMLElement;
  /** The base URL for the agent assets (.acd, images, audio). */
  baseUrl?: string;
  /** The scaling factor for the agent (default: 1). */
  scale?: number;
  /** Multiplier for animation speed (default: 1). */
  speed?: number;
  /** Milliseconds between idle behavior checks (default: 5000). */
  idleIntervalMs?: number;
  /** Whether to enable sound effects (default: true). */
  useAudio?: boolean;
  /** Whether to use CSS 'fixed' (true) or 'absolute' (false) positioning (default: true). */
  fixed?: boolean;
  /** Initial horizontal position in pixels. */
  x?: number;
  /** Initial vertical position in pixels. */
  y?: number;
}

/** Valid event types emitted by the Agent. */
type AgentEvent =
  | "click"
  | "animationStart"
  | "animationEnd"
  | "stateChange"
  | "show"
  | "hide"
  | "dragstart"
  | "drag"
  | "dragend"
  | "requestStart"
  | "requestComplete";
type AgentEventListener = (...args: any[]) => void;

/**
 * The primary Agent class, serving as the library's main entry point.
 * It coordinates the rendering loop, state management, animations, audio, and speech balloon.
 *
 * @example
 * ```typescript
 * const agent = await Agent.load('Clippit');
 * await agent.show();
 * await agent.speak('Hello, how can I help you?');
 * ```
 */
export class Agent {
  /** The full parsed character definition for this agent. */
  public readonly definition: AgentCharacterDefinition;
  /** Manager responsible for loading and rendering sprites. */
  public readonly spriteManager: SpriteManager;
  /** Manager responsible for playing sound effects. */
  public readonly audioManager: AudioManager;
  /** Manager responsible for low-level animation sequences. */
  public readonly animationManager: AnimationManager;
  /** Manager responsible for high-level behavioral states and idles. */
  public readonly stateManager: StateManager;
  /** Manager responsible for the speech balloon UI. */
  public readonly balloon: Balloon;
  /** Manager responsible for queuing character actions. */
  public readonly requestQueue: RequestQueue;
  /** Resolved options used to initialize the agent. */
  public readonly options: Required<AgentOptions>;

  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private isDestroyed: boolean = false;
  private lastTime: number = 0;
  private rafId: number = 0;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialAgentX: number = 0;
  private initialAgentY: number = 0;

  private listeners: Map<AgentEvent, Set<AgentEventListener>> = new Map();

  private constructor(
    definition: AgentCharacterDefinition,
    options: Required<AgentOptions>,
  ) {
    this.definition = definition;
    this.options = options;

    // Create container if not provided
    this.container = options.container || document.createElement("div");
    if (!options.container) {
      document.body.appendChild(this.container);
    }

    // Encapsulate UI in Shadow DOM to prevent CSS leakage
    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    // Component Styles
    const style = document.createElement("style");
    style.textContent = `
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
    `;
    this.shadowRoot.appendChild(style);

    // Main rendering canvas
    this.canvas = document.createElement("canvas");
    this.shadowRoot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    // Initialize Managers
    this.spriteManager = new SpriteManager(options.baseUrl, definition);
    this.audioManager = new AudioManager(options.baseUrl);
    this.audioManager.setEnabled(options.useAudio);
    if (definition.audioAtlas) {
      this.audioManager.setAudioAtlas(definition.audioAtlas);
    }
    this.animationManager = new AnimationManager(
      this.spriteManager,
      this.audioManager,
      definition.animations,
    );
    this.stateManager = new StateManager(
      definition.states,
      this.animationManager,
      {
        idleIntervalMs: options.idleIntervalMs,
        ticksPerLevel: 3,
      },
    );

    // Initialize Balloon
    this.balloon = new Balloon(this.canvas, this.shadowRoot, definition);

    // Initialize Request Queue
    this.requestQueue = new RequestQueue();
    this.stateManager.setRequestQueue(this.requestQueue);

    // Click event handling (differentiated from drag)
    this.canvas.addEventListener("click", () => {
      if (!this.wasDragging) {
        this.emit("click");
      }
    });

    this.setupDragging();
    this.setupCanvas();
  }

  private wasDragging = false;

  /**
   * Internal method to set up drag-and-drop behavior for the agent.
   */
  private setupDragging() {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left click/primary contact
      this.isDragging = true;
      this.wasDragging = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialAgentX = this.options.x;
      this.initialAgentY = this.options.y;

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      this.emit("dragstart");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.wasDragging = true;
      }

      let nx = this.initialAgentX + dx;
      let ny = this.initialAgentY + dy;

      // Constrain agent within the viewport boundaries
      const minX = 0;
      const minY = 0;
      const maxX = window.innerWidth - this.canvas.width;
      const maxY = window.innerHeight - this.canvas.height;

      nx = Math.max(minX, Math.min(nx, maxX));
      ny = Math.max(minY, Math.min(ny, maxY));

      this.setInstantPosition(nx, ny);
      this.emit("drag", { x: nx, y: ny });
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      this.emit("dragend");
    };

    this.canvas.addEventListener("pointerdown", onPointerDown);
  }

  /**
   * Sets canvas dimensions based on character definition and scaling factor.
   */
  private setupCanvas() {
    const width = this.spriteManager.getSpriteWidth();
    const height = this.spriteManager.getSpriteHeight();
    this.canvas.width = width * this.options.scale;
    this.canvas.height = height * this.options.scale;
  }

  /**
   * Changes the scale of the agent while keeping it centered at its current position.
   *
   * @param scale - The new scaling factor.
   */
  public setScale(scale: number) {
    const oldScale = this.options.scale;
    if (oldScale === scale) return;

    const width = this.spriteManager.getSpriteWidth();
    const height = this.spriteManager.getSpriteHeight();

    const oldWidth = width * oldScale;
    const oldHeight = height * oldScale;

    const newWidth = width * scale;
    const newHeight = height * scale;

    // Calculate center point to maintain anchor
    const cx = this.options.x + oldWidth / 2;
    const cy = this.options.y + oldHeight / 2;

    // Recalculate top-left to keep center
    let nx = cx - newWidth / 2;
    let ny = cy - newHeight / 2;

    // Constrain to viewport
    nx = Math.max(0, Math.min(nx, window.innerWidth - newWidth));
    ny = Math.max(0, Math.min(ny, window.innerHeight - newHeight));

    this.options.scale = scale;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.setInstantPosition(nx, ny);
  }

  /**
   * Static factory method to asynchronously load and initialize an agent.
   * Searches for assets in the specified baseUrl, with fallbacks for naming conventions.
   *
   * @param name - The name of the agent to load (e.g., 'Clippit').
   * @param options - Custom configuration for the agent.
   * @returns A promise resolving to the initialized Agent instance.
   */
  public static async load(
    name: string,
    options: AgentOptions = {},
  ): Promise<Agent> {
    const defaultBaseUrl = `https://unpkg.com/ms-agent-js@latest/dist/agents/${name}`;
    const baseUrl = (options.baseUrl || defaultBaseUrl).replace(/\/$/, "");

    let definition: AgentCharacterDefinition;

    try {
      // Prioritize optimized agent.json (atlas-based)
      const response = await fetch(`${baseUrl}/agent.json`);
      if (!response.ok) throw new Error("No agent.json");
      definition = await response.json();
    } catch (e) {
      // Fallback to legacy .acd format
      const acdPath = `${baseUrl}/${name.toUpperCase()}.acd`;

      definition = await CharacterParser.load(acdPath).catch(async (err) => {
        // Fallback to lowercase acd filename
        try {
          return await CharacterParser.load(
            `${baseUrl}/${name.toLowerCase()}.acd`,
          );
        } catch (innerErr) {
          console.error(
            `MSAgentJS: Failed to load agent assets for '${name}' at ${baseUrl}. ` +
              `Please ensure the 'agents/' directory is correctly served and 'baseUrl' is correct.`,
          );
          throw err;
        }
      });
    }

    // Asset path normalization
    if (
      definition.character.colorTable &&
      !definition.character.colorTable.startsWith("http")
    ) {
      definition.character.colorTable = definition.character.colorTable.replace(
        /\\/g,
        "/",
      );
    }

    // Ensure all image and sound references are lowercased for cross-environment compatibility
    Object.values(definition.animations).forEach((animation) => {
      animation.frames.forEach((frame) => {
        frame.images.forEach((image) => {
          image.filename = image.filename.replace(/\\/g, "/").toLowerCase();
        });
        if (frame.soundEffect) {
          frame.soundEffect = frame.soundEffect.toLowerCase();
        }
      });
    });

    // Resolve final options with defaults
    const fullOptions: Required<AgentOptions> = {
      container: options.container || (null as any),
      baseUrl: baseUrl,
      scale: options.scale ?? 1,
      speed: options.speed ?? 1,
      idleIntervalMs: options.idleIntervalMs ?? 5000,
      useAudio: options.useAudio ?? true,
      fixed: options.fixed ?? true,
      x:
        options.x ??
        window.innerWidth -
          definition.character.width * (options.scale ?? 1) -
          50,
      y:
        options.y ??
        window.innerHeight -
          definition.character.height * (options.scale ?? 1) -
          50,
    };

    const agent = new Agent(definition, fullOptions);
    await agent.init();
    return agent;
  }

  /**
   * Internal initialization method. Starts the rendering loop and intro animation.
   */
  public async init() {
    const initPromises: Promise<any>[] = [this.spriteManager.init()];

    if (this.options.useAudio && this.definition.audioAtlas) {
      // Eagerly load audio spritesheet if an atlas exists
      initPromises.push(this.audioManager.loadSounds([]));
    }

    await Promise.all(initPromises);
    this.startLoop();
    // Start showing the agent but don't await it, so the agent instance
    // is returned to the caller as soon as assets are ready.
    if (this.definition.states['Showing']) {
      this.show();
    } else {
      void this.stateManager.setState('IdlingLevel1');
    }
  }

  /**
   * Starts the internal requestAnimationFrame loop.
   */
  private startLoop() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      if (this.isDestroyed) return;

      const deltaTime = (currentTime - this.lastTime) * this.options.speed;
      this.lastTime = currentTime;

      this.animationManager.update(currentTime);
      this.stateManager.update(deltaTime);

      this.draw();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Triggers a redraw of the current animation frame onto the canvas.
   */
  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.animationManager.draw(this.ctx, 0, 0, this.options.scale);
  }

  /**
   * Plays a specific animation.
   *
   * @param animationName - The name of the animation to play.
   * @param timeoutMs - Optional time limit for the animation playback.
   * @returns A request object to track the operation's progress.
   */
  public play(animationName: string, timeoutMs?: number): AgentRequest {
    return this.enqueueRequest(async (request) => {
      this.emit("animationStart", animationName);
      await this.stateManager.playAnimation(
        animationName,
        "Playing",
        false,
        timeoutMs,
      );
      if (!request.isCancelled) {
        this.emit("animationEnd", animationName);
      }
    });
  }

  /**
   * Makes the agent gesture at a specific screen position.
   * Automatically calculates the 4-way direction and triggers the corresponding state.
   *
   * @param x - Horizontal screen coordinate.
   * @param y - Vertical screen coordinate.
   * @returns A request object to track the operation's progress.
   */
  public gestureAt(x: number, y: number): AgentRequest {
    return this.enqueueRequest(async (_request) => {
      const direction = this.toAgentPerspective(this.getDirection(x, y, 4));
      const stateName = `Gesturing${direction}`;
      if (this.definition.states[stateName]) {
        await this.stateManager.setState(stateName);
      } else {
        // Fallback to direct animation if the high-level state is missing
        const animName = `Gesture${direction}`;
        if (this.definition.animations[animName]) {
          await this.stateManager.playAnimation(animName, "Gesturing");
        }
      }
    });
  }

  /**
   * Makes the agent look at a specific screen position.
   * Automatically calculates the 8-way direction and plays the corresponding animation.
   *
   * @param x - Horizontal screen coordinate.
   * @param y - Vertical screen coordinate.
   * @returns A request object to track the operation's progress.
   */
  public lookAt(x: number, y: number): AgentRequest {
    return this.enqueueRequest(async (request) => {
      const direction = this.toAgentPerspective(this.getDirection(x, y, 8));
      const animName = `Look${direction}`;

      if (
        this.animationManager.currentAnimationName === animName &&
        this.animationManager.isAnimating
      ) {
        return;
      }

      if (this.definition.animations[animName]) {
        this.emit("animationStart", animName);
        await this.stateManager.playAnimation(animName, "Looking");
        if (!request.isCancelled) {
          this.emit("animationEnd", animName);
        }
      }
    });
  }

  /**
   * Sets the agent's high-level behavioral state.
   *
   * @param stateName - The name of the state (e.g., 'IdlingLevel2', 'Searching').
   */
  public async setState(stateName: string): Promise<void> {
    const oldState = this.stateManager.currentStateName;
    await this.stateManager.setState(stateName);
    this.emit("stateChange", stateName, oldState);
  }

  /**
   * Moves the agent to a new screen position, playing a movement animation if available.
   *
   * @param x - New horizontal position.
   * @param y - New vertical position.
   * @param speed - Pixels per second (default: 400).
   * @returns A request object to track the movement.
   */
  public moveTo(x: number, y: number, speed: number = 400): AgentRequest {
    return this.enqueueRequest(async (request) => {
      const startX = this.options.x;
      const startY = this.options.y;
      const dx = x - startX;
      const dy = y - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) {
        this.setInstantPosition(x, y);
        return;
      }

      const duration = (distance / speed) * 1000;
      const startTime = performance.now();

      const direction = this.getDirection(x, y, 4);
      const moveAnim = `Moving${direction}`;
      const hasMoveAnim = !!this.definition.animations[moveAnim];

      if (hasMoveAnim) {
        this.stateManager.playAnimation(moveAnim, "Moving");
      }

      return new Promise<void>((resolve) => {
        const moveStep = (currentTime: number) => {
          if (request.isCancelled) {
            if (hasMoveAnim) {
              this.stateManager.handleAnimationCompleted();
            }
            resolve();
            return;
          }
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const curX = startX + dx * progress;
          const curY = startY + dy * progress;

          this.setInstantPosition(curX, curY);

          if (progress < 1) {
            requestAnimationFrame(moveStep);
          } else {
            if (hasMoveAnim) {
              this.stateManager.handleAnimationCompleted();
            }
            resolve();
          }
        };
        requestAnimationFrame(moveStep);
      });
    });
  }

  /**
   * Internal method for instant position updates without queuing.
   */
  private setInstantPosition(x: number, y: number) {
    this.options.x = x;
    this.options.y = y;
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.balloon.reposition();
  }

  /**
   * Makes the agent speak the given text using the speech balloon.
   *
   * @param text - The message to display.
   * @param options - Speech options (hold balloon, use TTS, skip typing animation).
   * @returns A request object to track the operation's progress.
   */
  public speak(
    text: string,
    options: { hold?: boolean; useTTS?: boolean; skipTyping?: boolean } = {},
  ): AgentRequest {
    const { hold = false, useTTS = true, skipTyping = false } = options;
    return this.enqueueRequest(
      (request) =>
        new Promise((resolve) => {
          if (request.isCancelled) {
            resolve();
            return;
          }
          this.balloon.speak(resolve, text, hold, useTTS, skipTyping);
        }),
    );
  }

  /**
   * Displays raw HTML inside the speech balloon.
   *
   * @param html - The HTML string to render.
   * @param hold - If true, the balloon won't auto-close.
   */
  public showHtml(html: string, hold: boolean = false) {
    this.balloon.showHtml(html, hold);
  }

  /**
   * Asks the user a question with a text input field in the balloon.
   *
   * @param options - Configuration for the input dialog (labels, placeholder, timeout).
   * @returns A promise resolving to the user's input string, or null if cancelled.
   */
  public ask(
    options: {
      title?: string;
      placeholder?: string;
      askButtonText?: string;
      cancelButtonText?: string;
      timeout?: number;
    } = {},
  ): Promise<string | null> {
    const title = options.title || "What would you like to do?";
    const placeholder = options.placeholder || "Ask me anything...";
    const askButtonText = options.askButtonText || "Ask";
    const cancelButtonText = options.cancelButtonText || "Cancel";
    const timeout = options.timeout || 60000;

    return new Promise((resolve) => {
      let inputBalloonTimeout: number | null = null;

      const balloonContent = `
        <div class="clippy-input">
          <b>${title}</b>
          <textarea rows="2" placeholder="${placeholder}"></textarea>
          <div class="clippy-input-buttons">
            <button class="ask-button default">${askButtonText}</button>
            <button class="cancel-button">${cancelButtonText}</button>
          </div>
        </div>
      `;

      this.showHtml(balloonContent, true);

      const balloonEl = this.balloon.balloonEl;
      const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
      const askButton = balloonEl.querySelector(
        ".ask-button",
      ) as HTMLButtonElement;
      const cancelButton = balloonEl.querySelector(
        ".cancel-button",
      ) as HTMLButtonElement;

      const handleKeypress = (e: KeyboardEvent) => {
        resetBalloonTimeout();
        if (e.key === "Enter") {
          e.preventDefault();
          handleAsk();
        }
      };

      const handleAsk = () => {
        cleanup();
        const value = input.value;
        this.balloon.close();
        resolve(value);
      };

      const handleCancel = () => {
        cleanup();
        this.balloon.close();
        resolve(null);
      };

      const resetBalloonTimeout = () => {
        clearBalloonTimeout();
        inputBalloonTimeout = window.setTimeout(() => {
          handleCancel();
        }, timeout);
      };

      const clearBalloonTimeout = () => {
        if (inputBalloonTimeout) {
          clearTimeout(inputBalloonTimeout);
          inputBalloonTimeout = null;
        }
      };

      const cleanup = () => {
        clearBalloonTimeout();
        input?.removeEventListener("keypress", handleKeypress);
        askButton.removeEventListener("click", handleAsk);
        cancelButton.removeEventListener("click", handleCancel);
      };

      if (input) {
        input.focus();
        input.addEventListener("keypress", handleKeypress);
      }

      askButton.addEventListener("click", handleAsk);
      cancelButton.addEventListener("click", handleCancel);

      resetBalloonTimeout();

      // Force reposition after a short delay to account for layout rendering
      setTimeout(() => this.balloon.reposition(), 0);
    });
  }

  /**
   * Configures global system Text-to-Speech options.
   */
  public setTTSOptions(options: TTSOptions) {
    this.balloon.setTTSOptions(options);
  }

  /**
   * Returns a list of available system TTS voices.
   */
  public getTTSVoices(): SpeechSynthesisVoice[] {
    return this.balloon.getTTSVoices();
  }

  /**
   * Instantly stops any ongoing system speech.
   */
  public stopTTS() {
    this.balloon.stopTTS();
  }

  /**
   * Shows the agent by playing its 'Showing' animation sequence.
   *
   * @param useExitBranch - (Optional) Whether to use the exit branch for the 'Showing' animation.
   * @returns A request object to track the operation's progress.
   */
  public show(useExitBranch: boolean = false): AgentRequest {
    return this.enqueueRequest(async (request) => {
      this.container.style.display = "block";
      await this.stateManager.handleVisibilityChange(true, useExitBranch);
      if (!request.isCancelled) {
        this.emit("show");
      }
    });
  }

  /**
   * Hides the agent by playing its 'Hiding' animation sequence.
   *
   * @param useExitBranch - (Optional) Whether to use the exit branch for the 'Hiding' animation.
   * @returns A request object to track the operation's progress.
   */
  public hide(useExitBranch: boolean = false): AgentRequest {
    return this.enqueueRequest(async (request) => {
      await this.stateManager.handleVisibilityChange(false, useExitBranch);
      if (!request.isCancelled) {
        this.container.style.display = "none";
        this.emit("hide");
      }
    });
  }

  /**
   * Subscribes to an agent event.
   *
   * @param event - The event name.
   * @param listener - Callback function.
   */
  public on(event: AgentEvent, listener: AgentEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribes from an agent event.
   */
  public off(event: AgentEvent, listener: AgentEventListener) {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Internal method to enqueue a task and emit events.
   */
  private enqueueRequest(
    task: (request: AgentRequest) => Promise<void>,
  ): AgentRequest {
    return this.requestQueue.add(async (request) => {
      this.emit("requestStart", request);
      await task(request);
      this.emit("requestComplete", request);
    });
  }

  /**
   * Causes the animation queue for the character to wait until the specified animation request completes.
   *
   * @param request - The request to wait for.
   * @returns A request object to track the wait operation.
   */
  public wait(request: AgentRequest): AgentRequest {
    return this.enqueueRequest(() => request.promise);
  }

  /**
   * Stops the specified request or all requests in the queue.
   *
   * @param request - Optional request object to stop.
   */
  public stop(request?: AgentRequest) {
    const activeId = this.requestQueue.activeRequestId;
    this.requestQueue.stop(request?.id);

    // Only interrupt the current animation/speech if we are stopping everything,
    // or if the request being stopped is the currently active one.
    if (!request || (activeId !== null && request.id === activeId)) {
      if (this.animationManager.isAnimating) {
        this.animationManager.isExitingFlag = true;
      }
      this.balloon.close();
    }
  }

  /**
   * Interrupts the current animation and plays the specified animation.
   *
   * @param animationName - The animation to play after interruption.
   * @returns A request object for the new animation.
   */
  public interrupt(animationName: string): AgentRequest {
    // Original Agent.Interrupt(Request) was slightly different,
    // but in many implementations it's used to break current and start new.
    // Here we'll just clear the queue and play the new one.
    this.stop();
    return this.play(animationName);
  }

  /**
   * Internal event emitter.
   */
  private emit(event: AgentEvent, ...args: any[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  /**
   * Translates a world direction to the agent's POV (swaps Left/Right).
   */
  private toAgentPerspective(direction: string): string {
    return direction
      .replace("Left", "TEMP")
      .replace("Right", "Left")
      .replace("TEMP", "Right");
  }

  /**
   * Calculates the direction from the agent to a target point.
   */
  private getDirection(
    targetX: number,
    targetY: number,
    numDirections: 4 | 8,
  ): string {
    const centerX =
      this.options.x +
      (this.definition.character.width * this.options.scale) / 2;
    const centerY =
      this.options.y +
      (this.definition.character.height * this.options.scale) / 2;

    const dx = targetX - centerX;
    const dy = targetY - centerY;

    const angle = Math.atan2(dy, dx);
    let degrees = angle * (180 / Math.PI);
    if (degrees < 0) degrees += 360;

    if (numDirections === 4) {
      if (degrees >= 315 || degrees < 45) return "Right";
      if (degrees >= 45 && degrees < 135) return "Down";
      if (degrees >= 135 && degrees < 225) return "Left";
      return "Up";
    } else {
      if (degrees >= 337.5 || degrees < 22.5) return "Right";
      if (degrees >= 22.5 && degrees < 67.5) return "DownRight";
      if (degrees >= 67.5 && degrees < 112.5) return "Down";
      if (degrees >= 112.5 && degrees < 157.5) return "DownLeft";
      if (degrees >= 157.5 && degrees < 202.5) return "Left";
      if (degrees >= 202.5 && degrees < 247.5) return "UpLeft";
      if (degrees >= 247.5 && degrees < 292.5) return "Up";
      return "UpRight";
    }
  }

  /**
   * Performs full cleanup: cancels animations, stops speech, and removes the agent from the DOM.
   */
  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.listeners.clear();
  }
}
