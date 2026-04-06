import { AgentCore } from "./core/Core";
import { AgentLoader } from "./core/resources/AgentLoader";
import { ActionManager } from "./core/behavior/ActionManager";
import { AgentRenderer } from "./ui/Renderer";
import { InputManager } from "./ui/InputManager";
import {
  DialogManager,
  type AskOptions,
  type AskContentItem,
} from "./ui/DialogManager";
import type { TTSOptions } from "./ui/Balloon";
import type {
  AgentCharacterDefinition,
  AgentRequest,
  AgentOptions,
} from "./core/base/types";

/** Generic listener type for agent events. */
type AgentEventListener = (...args: any[]) => void;

export type { AskOptions, AskContentItem };

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
  private actionManager: ActionManager;
  private inputManager: InputManager;
  private dialogManager: DialogManager;

  private isDestroyed: boolean = false;
  private lastTime: number = 0;
  private rafId: number = 0;

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
    this.actionManager = new ActionManager(
      core,
      this.setInstantPosition.bind(this),
    );
    this.inputManager = new InputManager(
      core,
      renderer,
      this.emit.bind(this),
      this.setInstantPosition.bind(this),
    );
    this.dialogManager = new DialogManager(
      core,
      renderer,
      this.startTalkingAnimation.bind(this),
    );
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

    const definition = await AgentLoader.getDefinition(name, baseUrl, options);

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
    renderer.balloon.onSpeak = (payload) => {
      core.emit("speak", payload);
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
    return this.actionManager.gestureAt(x, y);
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
    return this.actionManager.lookAt(x, y);
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
    return this.actionManager.moveTo(x, y, speed);
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

      await this.core.waitForMouthFrames(
        () => request.isCancelled,
        animation || this.talkingAnimationName || undefined,
      );

      if (request.isCancelled) return;

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
    return this.dialogManager.ask(options);
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


  /**
   * Performs full cleanup: cancels animations, stops speech, and removes the agent from the DOM.
   */
  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.rafId);
    this.inputManager.destroy();
    if (this.container.parentNode)
      this.container.parentNode.removeChild(this.container);
    this.core.clear();
  }
}
