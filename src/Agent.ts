import { CharacterParser } from "./core/resources/CharacterParser";
import { AssetCache } from "./core/resources/Cache";
import { AgentCore } from "./core/Core";
import { AgentRenderer } from "./ui/Renderer";
import type { TTSOptions } from "./ui/Balloon";
import type {
  AgentCharacterDefinition,
  AgentRequest,
  AgentOptions,
} from "./core/base/types";
import { fetchWithProgress } from "./utils";

/** Generic listener type for agent events. */
type AgentEventListener = (...args: any[]) => void;

/**
 * Represents an item in the content array of an 'ask' dialog.
 */
export type AskContentItem =
  | string
  | { type: "choices"; items: string[]; style?: "bullet" | "bulb" }
  | { type: "input"; placeholder?: string; rows?: number }
  | { type: "checkbox"; label: string; checked?: boolean };

/**
 * Configuration for the interactive 'ask' dialog.
 */
export interface AskOptions {
  /** Header text for the dialog. */
  title?: string;
  /** Array of content items (text, choices, or input) in order of appearance. */
  content?: AskContentItem[];
  /** Array of button definitions to appear at the bottom. */
  buttons?: (
    | string
    | { label: string; value: any; bullet?: "bullet" | "bulb" }
  )[];
  /** Auto-cancel timeout in milliseconds (default: 60000). */
  timeout?: number;
  /** Optional animation to play while the dialog is active. */
  animation?: string;
}

/**
 * The primary Agent class, serving as the library's main entry point.
 * It acts as a facade, coordinating the headless logic (AgentCore) and
 * the UI/rendering layer (AgentRenderer) while maintaining the public API.
 *
 * @example
 * ```typescript
 * const agent = await Agent.load('Clippit');
 * await agent.show();
 * await agent.speak('Hello! I am your web assistant.');
 * ```
 */
export class Agent {
  private core: AgentCore;
  private renderer: AgentRenderer;
  private container: HTMLElement;

  private isDestroyed: boolean = false;
  private lastTime: number = 0;
  private rafId: number = 0;

  private isDragging: boolean = false;
  private wasDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialAgentX: number = 0;
  private initialAgentY: number = 0;

  /** The full parsed character definition for this agent. */
  public get definition(): AgentCharacterDefinition {
    return this.core.definition;
  }
  /** Manager responsible for loading and rendering sprites. */
  public get spriteManager() {
    return this.core.spriteManager;
  }
  /** Manager responsible for playing sound effects. */
  public get audioManager() {
    return this.core.audioManager;
  }
  /** Manager responsible for low-level animation sequences. */
  public get animationManager() {
    return this.core.animationManager;
  }
  /** Manager responsible for high-level behavioral states and idles. */
  public get stateManager() {
    return this.core.stateManager;
  }
  /** Manager responsible for the speech balloon UI. */
  public get balloon() {
    return this.renderer.balloon;
  }
  /** Manager responsible for queuing character actions. */
  public get requestQueue() {
    return this.core.requestQueue;
  }
  /** Resolved options used to initialize the agent. */
  public get options() {
    return this.core.options;
  }

  private constructor(
    core: AgentCore,
    renderer: AgentRenderer,
    container: HTMLElement,
  ) {
    this.core = core;
    this.renderer = renderer;
    this.container = container;

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

  private handleResize = () => {
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
   * Internal helper to load the agent definition from cache or remote source.
   * It attempts to load an optimized JSON version first, then falls back to
   * legacy .acd files with various naming conventions (uppercase/lowercase).
   *
   * @param name - The name of the agent to load.
   * @param baseUrl - The base URL where agent assets are located.
   * @param options - Configuration options, including signal for cancellation.
   * @returns A promise resolving to the fully parsed and normalized definition.
   * @throws Error if the definition cannot be loaded from any source.
   */
  private static async getDefinition(
    name: string,
    baseUrl: string,
    options: AgentOptions,
  ): Promise<AgentCharacterDefinition> {
    const useCache = options.useCache !== false;

    if (useCache) {
      const cached = AssetCache.getDefinition(baseUrl);
      if (cached) return cached;
    }

    let definition: AgentCharacterDefinition | undefined;

    try {
      // Prioritize optimized agent.json (atlas-based)
      const agentJsonUrl = `${baseUrl}/agent.json`;
      const response = await fetchWithProgress(agentJsonUrl, {
        signal: options.signal,
        onProgress: options.onProgress,
      });

      if (!response.ok) throw new Error("No agent.json");
      definition = (await response.json()) as AgentCharacterDefinition;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;

      // Fallback to legacy .acd format
      const acdPath = `${baseUrl}/${name.toUpperCase()}.acd`;
      try {
        definition = await CharacterParser.load(acdPath, options.signal);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        // Fallback to lowercase acd filename
        try {
          definition = await CharacterParser.load(
            `${baseUrl}/${name.toLowerCase()}.acd`,
            options.signal,
          );
        } catch (innerErr) {
          if (innerErr instanceof Error && innerErr.name === "AbortError")
            throw innerErr;
          console.error(
            `MSAgentJS: Failed to load agent assets for '${name}' at ${baseUrl}. ` +
              `Please ensure the 'agents/' directory is correctly served and 'baseUrl' is correct.`,
          );
          throw err;
        }
      }
    }

    if (!definition) {
      throw new Error(
        `MSAgentJS: Failed to load agent assets for '${name}' at ${baseUrl}.`,
      );
    }

    this.normalizeDefinition(definition);
    if (useCache) {
      AssetCache.setDefinition(baseUrl, definition);
    }

    return definition;
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

    const definition = await this.getDefinition(name, baseUrl, options);

    // Resolve final options with defaults
    const fullOptions: Required<AgentOptions> = {
      container: options.container || (null as any),
      baseUrl: baseUrl,
      scale: options.scale ?? 1,
      speed: options.speed ?? 1,
      idleIntervalMs: options.idleIntervalMs ?? 5000,
      useAudio: options.useAudio ?? true,
      fixed: options.fixed ?? true,
      keepInViewport: options.keepInViewport ?? true,
      initialAnimation: options.initialAnimation || "",
      onProgress: options.onProgress || (() => {}),
      signal: options.signal || new AbortController().signal,
      useCache: options.useCache !== false,
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

    const container = fullOptions.container || document.createElement("div");
    if (!fullOptions.container) {
      document.body.appendChild(container);
    }

    const core = new AgentCore(definition, fullOptions);
    await core.init();

    const renderer = new AgentRenderer(core, container);
    renderer.balloon.onSpeak = (text: string, charIndex: number) => {
      core.emit("speak", { text, charIndex });
    };

    const agent = new Agent(core, renderer, container);

    agent.startLoop();

    // Start showing the agent or transition to idling
    if (
      agent.options.initialAnimation &&
      agent.hasAnimation(agent.options.initialAnimation)
    ) {
      agent.show(agent.options.initialAnimation);
    } else if (agent.definition.states["Showing"]) {
      agent.show();
    } else {
      core.stateManager.setState("IdlingLevel1");
    }

    return agent;
  }

  /**
   * Internal normalization logic for character definitions.
   */
  private static normalizeDefinition(definition: AgentCharacterDefinition) {
    if (
      definition.character.colorTable &&
      !definition.character.colorTable.startsWith("http")
    ) {
      definition.character.colorTable = definition.character.colorTable.replace(
        /\\/g,
        "/",
      );
    }
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
  }

  /**
   * Starts the internal requestAnimationFrame loop.
   */
  private startLoop() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      if (this.isDestroyed) return;
      const deltaTime = (currentTime - this.lastTime) * this.core.options.speed;
      this.lastTime = currentTime;
      this.core.update(currentTime, deltaTime);
      this.renderer.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Internal method to set up drag-and-drop behavior for the agent.
   */
  private setupDragging() {
    let longPressTimer: number | null = null;
    const canvas = this.renderer.canvas;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left click/primary contact
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

      // Long press logic for context menu
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
        // Cancel long press if moved significantly
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      let nx = this.initialAgentX + dx;
      let ny = this.initialAgentY + dy;

      // Constrain agent within the viewport boundaries
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

  /**
   * Internal method for instant position updates without queuing.
   */
  private setInstantPosition(x: number, y: number) {
    this.core.options.x = x;
    this.core.options.y = y;
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.renderer.balloon.reposition();
  }

  /**
   * Changes the scale of the agent while keeping it centered at its current position.
   *
   * @param scale - The new scaling factor.
   */
  public setScale(scale: number) {
    const oldScale = this.core.options.scale;
    if (oldScale === scale) return;

    const width = this.core.spriteManager.getSpriteWidth();
    const height = this.core.spriteManager.getSpriteHeight();
    const oldWidth = width * oldScale;
    const oldHeight = height * oldScale;
    const newWidth = width * scale;
    const newHeight = height * scale;

    // Calculate center point to maintain anchor
    const cx = this.core.options.x + oldWidth / 2;
    const cy = this.core.options.y + oldHeight / 2;

    // Recalculate top-left to keep center
    let nx = cx - newWidth / 2;
    let ny = cy - newHeight / 2;

    // Constrain to viewport
    nx = Math.max(0, Math.min(nx, window.innerWidth - newWidth));
    ny = Math.max(0, Math.min(ny, window.innerHeight - newHeight));

    this.core.options.scale = scale;
    this.renderer.updateCanvasSize();
    this.setInstantPosition(nx, ny);
  }

  /**
   * Plays a specific animation.
   *
   * @param animationName - The name of the animation to play.
   * @param timeoutMs - Optional time limit for the animation playback.
   * @param useExitBranch - Whether to take the exit branch immediately.
   * @param loop - Whether to loop the animation indefinitely.
   * @returns A request object to track the operation's progress.
   */
  public play(
    animationName: string,
    timeoutMs?: number,
    useExitBranch?: boolean,
    loop: boolean = false,
  ): AgentRequest {
    return this.enqueueRequest(async (request) => {
      if (!this.hasAnimation(animationName)) {
        console.warn(`MSAgentJS: Animation '${animationName}' not found.`);
        return;
      }
      this.emit("animationStart", animationName);
      // Default useExitBranch to true if no timeout or loop is provided (play once to completion)
      const shouldExit = useExitBranch ?? (!timeoutMs && !loop);
      await this.core.stateManager.playAnimation(
        animationName,
        "Playing",
        shouldExit,
        timeoutMs,
        loop,
      );
      if (!request.isCancelled) {
        this.emit("animationEnd", animationName);
      }
    });
  }

  /**
   * Plays a random animation that is not an idle animation.
   *
   * @returns A request object for the random animation.
   */
  public animate(): AgentRequest {
    const anims = this.animations().filter((name) => !name.startsWith("Idle"));
    const randomAnim = anims[Math.floor(Math.random() * anims.length)];
    return this.play(randomAnim);
  }

  /**
   * Returns a list of all available animation names.
   *
   * @returns An array of animation name strings.
   */
  public animations(): string[] {
    return Object.keys(this.core.definition.animations);
  }

  /**
   * Checks if a specific animation exists.
   *
   * @param name - The name of the animation to check.
   * @returns True if the animation exists, false otherwise.
   */
  public hasAnimation(name: string): boolean {
    return !!this.core.definition.animations[name];
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
      if (this.core.definition.states[stateName]) {
        await this.core.stateManager.setState(stateName);
      } else {
        // Fallback to direct animation if the high-level state is missing
        const animName = `Gesture${direction}`;
        if (this.core.definition.animations[animName]) {
          await this.core.stateManager.playAnimation(animName, "Gesturing");
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
        this.core.animationManager.currentAnimationName === animName &&
        this.core.animationManager.isAnimating
      ) {
        return;
      }
      if (this.core.definition.animations[animName]) {
        this.emit("animationStart", animName);
        await this.core.stateManager.playAnimation(animName, "Looking");
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
    const oldState = this.core.stateManager.currentStateName;
    await this.core.stateManager.setState(stateName);
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
      const startX = this.core.options.x;
      const startY = this.core.options.y;
      const dx = x - startX;
      const dy = y - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) {
        this.setInstantPosition(x, y);
        return;
      }

      const duration = (distance / speed) * 1000;
      const startTime = performance.now();
      const direction4 = this.getDirection(x, y, 4);
      const moveAnim = `Moving${direction4}`;
      let activeAnim = "";

      if (this.core.definition.animations[moveAnim]) {
        activeAnim = moveAnim;
      } else {
        const direction8 = this.toAgentPerspective(this.getDirection(x, y, 8));
        const lookAnim = `Look${direction8}`;
        if (this.core.definition.animations[lookAnim]) {
          activeAnim = lookAnim;
        }
      }

      if (activeAnim) {
        this.core.stateManager.playAnimation(activeAnim, "Moving");
      }

      return new Promise<void>((resolve) => {
        const moveStep = (currentTime: number) => {
          if (request.isCancelled) {
            if (activeAnim) this.core.stateManager.handleAnimationCompleted();
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
            if (activeAnim) this.core.stateManager.handleAnimationCompleted();
            resolve();
          }
        };
        requestAnimationFrame(moveStep);
      });
    });
  }

  private talkingAnimationName: string | null = null;

  /**
   * Internal helper to start a talking animation and set up its termination.
   */
  private startTalkingAnimation(animName: string = "Explain") {
    if (this.talkingAnimationName === animName) return;

    // Fallback to Explain if custom animation doesn't exist
    if (!this.core.definition.animations[animName]) {
      animName = "Explain";
    }

    if (this.core.definition.animations[animName]) {
      this.talkingAnimationName = animName;
      this.core.stateManager
        .playAnimation(animName, "Speaking", false, undefined, true)
        .catch(console.error);
    } else {
      this.talkingAnimationName = animName;
      this.core.stateManager.setState("Speaking").catch(console.error);
    }
    this.renderer.balloon.onHide = () => {
      this.renderer.balloon.onHide = null;
      this.talkingAnimationName = null;
      if (this.core.stateManager.currentStateName === "Speaking") {
        this.core.animationManager.isExitingFlag = true;
        this.core.stateManager.handleAnimationCompleted();
      }
    };
  }

  /**
   * Makes the agent speak the given text using the speech balloon.
   *
   * @param text - The message to display.
   * @param options - Speech options (hold balloon, use TTS, skip typing animation, animation name).
   * @returns A request object to track the operation's progress.
   */
  public speak(
    text: string,
    options: {
      hold?: boolean;
      useTTS?: boolean;
      skipTyping?: boolean;
      animation?: string;
    } = {},
  ): AgentRequest {
    const {
      hold = false,
      useTTS = true,
      skipTyping = false,
      animation,
    } = options;
    return this.enqueueRequest(async (request) => {
      if (request.isCancelled) return;
      this.startTalkingAnimation(animation);
      return new Promise((resolve) => {
        this.renderer.balloon.speak(resolve, text, hold, useTTS, skipTyping);
      });
    });
  }

  /**
   * Displays raw HTML inside the speech balloon.
   *
   * @param html - The HTML string to render.
   * @param hold - If true, the balloon won't auto-close.
   */
  public showHtml(html: string, hold: boolean = false) {
    this.renderer.balloon.showHtml(html, hold);
  }

  /**
   * Asks the user a question with an interactive dialog in the balloon.
   *
   * @param options - Configuration for the dialog (title, content array, buttons, timeout).
   * @returns A promise resolving to the user's selection and input, or null if cancelled.
   */
  public ask(
    options: AskOptions = {},
  ): Promise<{
    value: any;
    text: string | null;
    checked: boolean | null;
  } | null> {
    const title = options.title || "";
    const content = options.content || [];
    const buttons = options.buttons || [];
    const timeout = options.timeout !== undefined ? options.timeout : 60000;

    let resolveAsk: (
      value: {
        value: any;
        text: string | null;
        checked: boolean | null;
      } | null,
    ) => void;
    const askPromise = new Promise<{
      value: any;
      text: string | null;
      checked: boolean | null;
    } | null>((res) => {
      resolveAsk = res;
    });

    this.enqueueRequest(async (request) => {
      if (request.isCancelled) {
        resolveAsk(null);
        return;
      }

      let inputBalloonTimeout: number | null = null;
      let resolved = false;
      let choicePage = 0;
      const choicesPerPage = 3;

      const renderContent = () => {
        let balloonContent = `<div class="clippy-input">`;
        if (title) balloonContent += `<b>${title}</b>`;

        content.forEach((item) => {
          if (typeof item === "string") {
            balloonContent += `<div>${item}</div>`;
          } else if (item.type === "choices") {
            const style = item.style || "bullet";
            const totalPages = Math.ceil(item.items.length / choicesPerPage);

            let choicesHtml = "";
            if (choicePage > 0) {
              choicesHtml += `<li class="clippy-pagination-link prev" data-action="prev"><span>See previous...</span></li>`;
            }

            const start = choicePage * choicesPerPage;
            const end = Math.min(start + choicesPerPage, item.items.length);

            for (let i = start; i < end; i++) {
              choicesHtml += `<li data-index="${i}"><span>${item.items[i]}</span></li>`;
            }

            if (choicePage < totalPages - 1) {
              choicesHtml += `<li class="clippy-pagination-link next" data-action="next"><span>See more...</span></li>`;
            }

            balloonContent += `<ul class="clippy-choices style-${style}">${choicesHtml}</ul>`;
          } else if (item.type === "input") {
            const placeholder = item.placeholder || "";
            const rows = item.rows || 2;
            balloonContent += `<textarea rows="${rows}" placeholder="${placeholder}"></textarea>`;
          } else if (item.type === "checkbox") {
            const checked = item.checked ? "checked" : "";
            const id = `clippy-checkbox-${Math.random().toString(36).substring(2, 11)}`;
            balloonContent += `<div class="clippy-checkbox"><input type="checkbox" id="${id}" class="ask-checkbox" ${checked}><label for="${id}">${item.label}</label></div>`;
          }
        });

        if (buttons.length > 0) {
          const isSingleButton = buttons.length === 1;
          balloonContent += `<div class="clippy-input-buttons${isSingleButton ? " single-button" : ""}">`;
          buttons.forEach((btn, i) => {
            const label = typeof btn === "string" ? btn : btn.label;
            const bType = typeof btn === "string" ? null : btn.bullet;
            const btnClass = bType ? `style-${bType}` : "";
            const bulletSpan = bType ? '<span class="button-bullet"></span>' : "";
            balloonContent += `<button class="custom-button ${btnClass}" data-index="${i}">${bulletSpan}${label}</button>`;
          });
          balloonContent += `</div>`;
        }
        balloonContent += `</div>`;
        return balloonContent;
      };

      let ttsText = title;
      content.forEach((item) => {
        if (typeof item === "string") {
          ttsText += (ttsText ? " " : "") + item;
        }
      });

      this.startTalkingAnimation(options.animation);

      return new Promise<void>((resolveQueue) => {
        const attachEvents = () => {
          const balloonEl = this.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector(
            "textarea",
          ) as HTMLTextAreaElement;
          const choicesLists = Array.from(
            balloonEl.querySelectorAll(".clippy-choices"),
          ) as HTMLUListElement[];
          const customButtons = Array.from(
            balloonEl.querySelectorAll(".custom-button"),
          ) as HTMLButtonElement[];

          input?.addEventListener("keypress", handleKeypress);
          input?.addEventListener("focus", handleFocus);
          input?.addEventListener("blur", handleBlur);
          choicesLists.forEach((list) =>
            list.addEventListener("click", handleChoiceClick),
          );
          customButtons.forEach((btn) =>
            btn.addEventListener("click", handleCustomButtonClick),
          );

          if (input) input.focus();
        };

        const detachEvents = () => {
          const balloonEl = this.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector(
            "textarea",
          ) as HTMLTextAreaElement;
          const choicesLists = Array.from(
            balloonEl.querySelectorAll(".clippy-choices"),
          ) as HTMLUListElement[];
          const customButtons = Array.from(
            balloonEl.querySelectorAll(".custom-button"),
          ) as HTMLButtonElement[];

          input?.removeEventListener("keypress", handleKeypress);
          input?.removeEventListener("focus", handleFocus);
          input?.removeEventListener("blur", handleBlur);
          choicesLists.forEach((list) =>
            list.removeEventListener("click", handleChoiceClick),
          );
          customButtons.forEach((btn) =>
            btn.removeEventListener("click", handleCustomButtonClick),
          );
        };

        const finish = (
          value: {
            value: any;
            text: string | null;
            checked: boolean | null;
          } | null,
        ) => {
          if (resolved) return;
          resolved = true;
          this.renderer.balloon.onHide = null;
          this.talkingAnimationName = null;
          if (this.core.stateManager.currentStateName === "Speaking") {
            this.core.animationManager.isExitingFlag = true;
            this.core.stateManager.handleAnimationCompleted();
          }
          detachEvents();
          clearBalloonTimeout();
          resolveAsk(value);
          resolveQueue();
        };

        this.renderer.balloon.onHide = () => {
          if (this.core.stateManager.currentStateName === "Speaking") {
            this.core.animationManager.isExitingFlag = true;
            this.core.stateManager.handleAnimationCompleted();
          }
          finish(null);
        };

        const handleKeypress = (e: KeyboardEvent) => {
          resetBalloonTimeout();
          if (e.key === "Enter") {
            e.preventDefault();
            const balloonEl = this.renderer.balloon.balloonEl;
            const customButtons = Array.from(
              balloonEl.querySelectorAll(".custom-button"),
            ) as HTMLButtonElement[];
            if (customButtons.length > 0) {
              customButtons[0].click();
            }
          }
        };

        const handleCancel = () => {
          finish(null);
          this.renderer.balloon.close();
        };

        const handleChoiceClick = (e: MouseEvent) => {
          resetBalloonTimeout();
          const target = e.target as HTMLElement;
          const li = target.closest("li");
          if (!li) return;

          const action = li.getAttribute("data-action");
          if (action === "next") {
            choicePage++;
            refreshContent();
            return;
          }
          if (action === "prev") {
            choicePage--;
            refreshContent();
            return;
          }

          if (li.hasAttribute("data-index")) {
            const index = parseInt(li.getAttribute("data-index") || "0");
            const balloonEl = this.renderer.balloon.balloonEl;
            const input = balloonEl.querySelector(
              "textarea",
            ) as HTMLTextAreaElement;
            const checkbox = balloonEl.querySelector(
              ".ask-checkbox",
            ) as HTMLInputElement | null;
            const text = input ? input.value || null : null;
            const checked = checkbox ? !!checkbox.checked : null;
            finish({ value: index, text, checked });
            this.renderer.balloon.close();
          }
        };

        const handleCustomButtonClick = (e: MouseEvent) => {
          const btn = e.currentTarget as HTMLButtonElement;
          const index = parseInt(btn.getAttribute("data-index") || "0");
          const buttonDef = buttons[index];
          const value =
            typeof buttonDef === "string" ? buttonDef : buttonDef.value;

          const balloonEl = this.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector(
            "textarea",
          ) as HTMLTextAreaElement;
          const checkbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          const text = input ? input.value || null : null;
          const checked = checkbox ? !!checkbox.checked : null;

          if (value === null) {
            finish(null);
          } else {
            finish({ value, text, checked });
          }
          this.renderer.balloon.close();
        };

        const handleFocus = () => {
          this.startTalkingAnimation("Writing");
        };
        const handleBlur = () => {
          this.startTalkingAnimation(options.animation);
          this.renderer.balloon.reposition();
        };

        const resetBalloonTimeout = () => {
          clearBalloonTimeout();
          if (timeout > 0) {
            inputBalloonTimeout = window.setTimeout(() => {
              handleCancel();
            }, timeout);
          }
        };

        const clearBalloonTimeout = () => {
          if (inputBalloonTimeout) {
            clearTimeout(inputBalloonTimeout);
            inputBalloonTimeout = null;
          }
        };

        const refreshContent = () => {
          detachEvents();
          const balloonEl = this.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector(
            "textarea",
          ) as HTMLTextAreaElement;
          const checkbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          const prevText = input ? input.value : "";
          const prevChecked = checkbox ? checkbox.checked : false;

          this.renderer.balloon.showHtml(renderContent(), true);

          // Restore state
          const newInput = balloonEl.querySelector(
            "textarea",
          ) as HTMLTextAreaElement;
          const newCheckbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          if (newInput) newInput.value = prevText;
          if (newCheckbox) newCheckbox.checked = prevChecked;

          attachEvents();
        };

        this.showHtml(renderContent(), true);
        if (ttsText) {
          this.renderer.balloon.speak(
            () => {
              this.talkingAnimationName = null;
              if (this.core.stateManager.currentStateName === "Speaking") {
                this.core.animationManager.isExitingFlag = true;
                this.core.stateManager.handleAnimationCompleted();
              }
            },
            ttsText,
            true,
            true,
            false,
            true,
          );
        }

        attachEvents();
        resetBalloonTimeout();
        setTimeout(() => this.renderer.balloon.reposition(), 0);
      });
    });

    return askPromise;
  }

  /** Configures global system Text-to-Speech options. */
  public setTTSOptions(options: TTSOptions) {
    this.renderer.balloon.setTTSOptions(options);
  }
  /** Returns a list of available system TTS voices. */
  public getTTSVoices(): SpeechSynthesisVoice[] {
    return this.renderer.balloon.getTTSVoices();
  }
  /** Instantly stops any ongoing system speech. */
  public stopTTS() {
    this.renderer.balloon.stopTTS();
  }

  /**
   * Shows the agent by playing its 'Showing' animation sequence.
   *
   * @param animationName - Optional custom animation to play while showing.
   * @returns A request object to track the operation's progress.
   */
  public show(animationName?: string): AgentRequest {
    return this.enqueueRequest(async (request) => {
      this.container.style.display = "block";
      await this.core.stateManager.handleVisibilityChange(true, animationName);
      if (!request.isCancelled) this.emit("show");
    });
  }

  /**
   * Hides the agent by playing its 'Hiding' animation sequence.
   *
   * @param animationName - Optional custom animation to play while hiding.
   * @returns A request object to track the operation's progress.
   */
  public hide(animationName?: string): AgentRequest {
    return this.enqueueRequest(async (request) => {
      await this.core.stateManager.handleVisibilityChange(false, animationName);
      if (!request.isCancelled) {
        this.container.style.display = "none";
        this.emit("hide");
      }
    });
  }

  /** Subscribes to an agent event. */
  public on(event: string, listener: AgentEventListener) {
    this.core.on(event as any, listener);
  }
  /** Unsubscribes from an agent event. */
  public off(event: string, listener: AgentEventListener) {
    this.core.off(event as any, listener);
  }

  /**
   * Internal method to enqueue a task and emit events.
   * @internal
   */
  public enqueueRequest(
    task: (request: AgentRequest) => Promise<void>,
  ): AgentRequest {
    return this.core.requestQueue.add(async (request) => {
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
   * Queues a delay in the agent's action queue.
   *
   * @param ms - The number of milliseconds to wait.
   * @returns A request object for the delay.
   */
  public delay(ms: number): AgentRequest {
    return this.enqueueRequest(
      () => new Promise((resolve) => setTimeout(resolve, ms)),
    );
  }

  /**
   * Stops the specified request or all requests in the queue.
   *
   * @param request - Optional request object to stop.
   */
  public stop(request?: AgentRequest) {
    const activeId = this.core.requestQueue.activeRequestId;
    this.core.requestQueue.stop(request?.id);
    if (!request || (activeId !== null && request.id === activeId)) {
      if (this.core.animationManager.isAnimating) {
        this.core.animationManager.isExitingFlag = true;
      }
      this.renderer.balloon.close();
    }
  }

  /**
   * Stops the current action and moves to the next one in the queue.
   */
  public stopCurrent() {
    const activeId = this.core.requestQueue.activeRequestId;
    if (activeId !== null) this.stop({ id: activeId } as AgentRequest);
  }

  /**
   * Interrupts the current animation and plays the specified animation.
   *
   * @param animationName - The animation to play after interruption.
   * @returns A request object for the new animation.
   */
  public interrupt(animationName: string): AgentRequest {
    this.stop();
    return this.play(animationName);
  }

  /** Internal event emitter. */
  private emit(event: string, ...args: any[]) {
    this.core.emit(event as any, ...args);
  }

  /** Translates a world direction to the agent's POV (swaps Left/Right). */
  private toAgentPerspective(direction: string): string {
    return direction
      .replace("Left", "TEMP")
      .replace("Right", "Left")
      .replace("TEMP", "Right");
  }

  /** Calculates the direction from the agent to a target point. */
  private getDirection(
    targetX: number,
    targetY: number,
    numDirections: 4 | 8,
  ): string {
    const centerX =
      this.core.options.x +
      (this.core.definition.character.width * this.core.options.scale) / 2;
    const centerY =
      this.core.options.y +
      (this.core.definition.character.height * this.core.options.scale) / 2;
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
    window.removeEventListener("resize", this.handleResize);
    if (this.container.parentNode)
      this.container.parentNode.removeChild(this.container);
    this.core.clear();
  }
}
