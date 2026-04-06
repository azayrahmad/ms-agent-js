import { EventEmitter } from "./base/EventEmitter";
import { type AgentEvents } from "./base/events";
import { RequestQueue } from "./behavior/RequestQueue";
import { AnimationManager } from "./behavior/AnimationManager";
import { StateManager } from "./behavior/StateManager";
import { VisemeManager } from "./behavior/VisemeManager";
import { SpriteManager } from "./resources/SpriteManager";
import { AudioManager } from "./resources/AudioManager";
import type { AgentCharacterDefinition, AgentOptions } from "./base/types";

/**
 * The headless core of the Agent system.
 * It manages the high-level state machine, low-level animation timing,
 * sound playback, and the asynchronous request queue.
 *
 * It is decoupled from the DOM and rendering layer, allowing for
 * logic-only usage or headless testing.
 */
export class AgentCore extends EventEmitter<AgentEvents> {
  /** Manager responsible for queuing character actions. */
  public readonly requestQueue: RequestQueue;
  /** Manager responsible for low-level animation sequences. */
  public readonly animationManager: AnimationManager;
  /** Manager responsible for high-level behavioral states and idles. */
  public readonly stateManager: StateManager;
  /** Manager responsible for loading and coordinating sprites. */
  public readonly spriteManager: SpriteManager;
  /** Manager responsible for playing sound effects. */
  public readonly audioManager: AudioManager;
  /** Manager responsible for lip-syncing and mouth shapes. */
  public readonly visemeManager: VisemeManager;

  /**
   * @param definition - The parsed character definition.
   * @param options - Initialization options.
   */
  public readonly definition: AgentCharacterDefinition;
  public readonly options: Required<AgentOptions>;

  constructor(
    definition: AgentCharacterDefinition,
    options: Required<AgentOptions>,
  ) {
    super();
    this.definition = definition;
    this.options = options;

    this.spriteManager = new SpriteManager(options.baseUrl, definition, {
      signal: options.signal,
      onProgress: options.onProgress,
      useCache: options.useCache,
    });
    this.audioManager = new AudioManager(options.baseUrl, {
      signal: options.signal,
      onProgress: options.onProgress,
      useCache: options.useCache,
    });
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

    this.requestQueue = new RequestQueue();
    this.stateManager.setRequestQueue(this.requestQueue);

    this.visemeManager = new VisemeManager();

    this.setupEvents();
  }

  private isUpdating: boolean = false;

  /**
   * Forwards relevant internal events from managers to the core's listeners.
   */
  private setupEvents() {
    this.animationManager.on("frameChanged", () => {
      this.emit("frameChanged");
    });

    this.on("speak", (payload) => {
      // Balloon emits word-level events when possible
      this.visemeManager.scheduleWord(
        payload.word,
        performance.now(),
        payload.rate * this.options.speed,
      );
    });
  }

  /**
   * Initializes the core by preloading mandatory assets.
   */
  public async init() {
    const initPromises: Promise<any>[] = [this.spriteManager.init()];

    if (this.options.useAudio && this.definition.audioAtlas) {
      initPromises.push(this.audioManager.loadSounds([]));
    }

    await Promise.all(initPromises);
  }

  /**
   * Advances the internal state of the core based on elapsed time.
   *
   * @param currentTime - The current performance timestamp.
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  /**
   * Helper promise that waits until the character is in a state where it can start speaking.
   * If the current animation supports speech, it waits until a frame with mouth overlays is reached.
   * If it doesn't support speech, it resolves immediately.
   *
   * @param isCancelled - Function to check if the parent request has been cancelled.
   * @param targetAnimation - Optional name of the animation we are waiting for.
   * @internal
   */
  public async waitForMouthFrames(
    isCancelled: () => boolean,
    targetAnimation?: string,
  ): Promise<void> {
    const supports = targetAnimation
      ? this.animationManager.supportsSpeech(targetAnimation)
      : this.animationManager.supportsSpeech();

    if (!supports) {
      return;
    }

    return new Promise((resolve) => {
      const check = () => {
        if (isCancelled()) {
          cleanup();
          resolve();
          return;
        }

        // If we are waiting for a specific animation to start, ignore others
        if (
          targetAnimation &&
          this.animationManager.currentAnimationName !== targetAnimation
        ) {
          return;
        }

        if (this.animationManager.currentFrameHasMouths()) {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        this.animationManager.off("frameChanged", check);
        this.animationManager.off("animationStarted", check);
      };

      this.animationManager.on("frameChanged", check);
      this.animationManager.on("animationStarted", check);

      // Initial check
      check();
    });
  }

  public update(currentTime: number, deltaTime: number) {
    const viseme = this.visemeManager.getVisemeAt(currentTime);
    this.animationManager.setViseme(viseme);

    this.animationManager.update(currentTime);

    if (!this.isUpdating) {
      this.isUpdating = true;
      this.stateManager.update(deltaTime).finally(() => {
        this.isUpdating = false;
      });
    }
  }
}
