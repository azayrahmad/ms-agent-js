import { EventEmitter } from "./base/EventEmitter";
import { type AgentEvents } from "./base/events";
import { RequestQueue } from "./behavior/RequestQueue";
import { AnimationManager } from "./behavior/AnimationManager";
import { StateManager } from "./behavior/StateManager";
import { SpriteManager } from "./resources/SpriteManager";
import { AudioManager } from "./resources/AudioManager";
import { VisemeManager, MouthPosition } from "./behavior/VisemeManager";
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
  }

  private visemeTimers: any[] = [];

  /**
   * Handles the 'speak' event by scheduling viseme changes for the current word.
   */
  public handleSpeakEvent(text: string, charIndex: number) {
    this.stopVisemes();

    // Find the word that contains charIndex
    const wordRegex = /[a-zA-Z'-]+/g;
    let match;
    let currentWordVisemes: MouthPosition[] | null = null;

    while ((match = wordRegex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (charIndex >= start && charIndex < end) {
        currentWordVisemes = VisemeManager.wordToVisemes(match[0]);
        break;
      }
    }

    if (!currentWordVisemes) return;

    const MS_PER_PHONEME = 78;
    const rate = 1.0; // TODO: Get rate from TTS options

    currentWordVisemes.forEach((v, i) => {
      const timer = setTimeout(() => {
        this.animationManager.setViseme(v);
      }, i * (MS_PER_PHONEME / rate));
      this.visemeTimers.push(timer);
    });

    // Reset to Closed after word
    const endTimer = setTimeout(() => {
      this.animationManager.setViseme(MouthPosition.Closed);
    }, currentWordVisemes.length * (MS_PER_PHONEME / rate));
    this.visemeTimers.push(endTimer);
  }

  /**
   * Stops any ongoing viseme animations.
   */
  public stopVisemes() {
    this.visemeTimers.forEach(clearTimeout);
    this.visemeTimers = [];
    this.animationManager.setViseme(null);
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
  public update(currentTime: number, deltaTime: number) {
    this.animationManager.update(currentTime);

    if (!this.isUpdating) {
      this.isUpdating = true;
      this.stateManager.update(deltaTime).finally(() => {
        this.isUpdating = false;
      });
    }
  }

  /**
   * Removes all registered listeners and stops ongoing activities.
   */
  public override clear(): void {
    super.clear();
    this.audioManager.stop();
    this.stopVisemes();
  }
}
