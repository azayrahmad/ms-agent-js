import { type State } from './types';
import { AnimationManager } from './AnimationManager';
import { RequestQueue } from './RequestQueue';

/**
 * Configuration for the StateManager, controlling idle level progression.
 */
export interface StateManagerConfig {
  /** Time between idle level progression checks (default: 10000ms). */
  idleIntervalMs?: number;
  /** Number of idle intervals before the idle level increases (default: 12). */
  ticksPerLevel?: number;
  /** Maximum idle level (usually 3). */
  maxIdleLevel?: number;
}

/**
 * StateManager class for managing the agent's high-level behavioral state.
 * It handles the progression from one state to another (e.g., Idling -> Playing -> Idling)
 * and manages "boredom" levels through the idle progression system.
 */
export class StateManager {
  /** Record of state definitions (each containing a set of animations). */
  private states: Record<string, State>;
  /** Reference to the animation manager for frame playback. */
  private animationManager: AnimationManager;
  /** Reference to the request queue to suppress idles when busy. */
  private requestQueue?: RequestQueue;

  /** The current behavioral state (e.g., "IdlingLevel1", "Showing", "Playing"). */
  private currentState: string = 'Hidden';
  /** The current level of idle boredom (typically 1-3). */
  private currentIdleLevel: number = 1;
  /** Counter of idle intervals elapsed in the current level. */
  private idleTickCount: number = 0;
  /** Accumulated time towards the next idle check. */
  private elapsedSinceLastTick: number = 0;

  /** Configuration values for idle behavior. */
  private idleIntervalMs: number = 10000;
  private ticksPerLevel: number = 12;
  private maxIdleLevel: number = 3;
  private idlePrefix: string = 'IdlingLevel';

  /** Whether the state machine updates are currently paused. */
  private isPaused: boolean = true;

  /**
   * @param states - Record of states indexed by name.
   * @param animationManager - Animation manager for sprite/frame control.
   * @param config - Optional configuration for idle behaviors.
   */
  constructor(
    states: Record<string, State>,
    animationManager: AnimationManager,
    config?: StateManagerConfig
  ) {
    this.states = states;
    this.animationManager = animationManager;

    if (config) {
      if (config.idleIntervalMs !== undefined) this.idleIntervalMs = config.idleIntervalMs;
      if (config.ticksPerLevel !== undefined) this.ticksPerLevel = config.ticksPerLevel;
      if (config.maxIdleLevel !== undefined) this.maxIdleLevel = config.maxIdleLevel;
    }
  }

  /**
   * The name of the current behavioral state.
   */
  public get currentStateName(): string {
    return this.currentState;
  }

  /**
   * The current "boredom" level of the agent.
   */
  public get idleLevel(): number {
    return this.currentIdleLevel;
  }

  /**
   * Number of idle intervals remaining before the agent progresses to the next boredom level.
   */
  public get ticksToNextLevel(): number {
    return this.ticksPerLevel - this.idleTickCount;
  }

  /**
   * Time remaining until the next idle interval check, in milliseconds.
   */
  public get timeUntilNextTick(): number {
    return Math.max(0, this.idleIntervalMs - this.elapsedSinceLastTick);
  }

  /**
   * Sets the request queue reference.
   */
  public setRequestQueue(queue: RequestQueue) {
    this.requestQueue = queue;
  }

  /**
   * Updates the state machine. Called once per main loop iteration.
   * Manages transitions between persistent states and handles idle progression.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  public async update(deltaTime: number): Promise<void> {
    if (this.isPaused) return;

    const hasRequests = this.requestQueue && !this.requestQueue.isEmpty;

    // Check if the current animation sequence has finished
    if (!this.animationManager.isAnimating) {
      if (this.currentState === 'Playing' || this.currentState === 'Moving') {
        // After an explicit action finishes, we return to the base idling state.
        if (!hasRequests) {
          this.handleAnimationCompleted().catch(console.error);
        }
      } else if (this.currentState === 'Showing') {
        // After the intro animation completes, we transition to idling.
        if (!hasRequests) {
          this.returnToIdle().catch(console.error);
        }
      } else if (this.currentState === 'Hiding') {
        // After the outro animation completes, the agent is hidden and paused.
        this.currentState = 'Hidden';
        this.isPaused = true;
        return;
      } else if (this.currentState !== 'Hidden') {
        // For other persistent states (e.g. "GesturingLeft"),
        // we loop or pick a new random animation immediately to ensure no visual gaps.
        // For Idling states, we let the onTick handler manage the frequency of animations.
        if (!hasRequests && !this.isIdleState(this.currentState)) {
          this.updateStateAnimation().catch(console.error);
        }
      }
    }

    // Skip idle progression for transient/busy states or if requests are pending
    if (
      this.currentState === 'Playing' ||
      this.currentState === 'Showing' ||
      this.currentState === 'Hiding' ||
      this.currentState === 'Moving' ||
      hasRequests
    ) {
      this.elapsedSinceLastTick = 0;
      return;
    }

    this.elapsedSinceLastTick += deltaTime;

    // Check if it's time for the next idle behavioral check
    if (this.elapsedSinceLastTick >= this.idleIntervalMs) {
      this.elapsedSinceLastTick = 0;
      this.onTick().catch(console.error);
    }
  }

  /**
   * Handle an idle tick. If currently idling, increment the "boredom" level periodically.
   * Otherwise, pick a new animation for the current persistent state.
   */
  private async onTick(): Promise<void> {
    if (this.isIdleState(this.currentState)) {
      this.idleTickCount++;

      if (this.idleTickCount >= this.ticksPerLevel && this.currentIdleLevel < this.maxIdleLevel) {
        this.currentIdleLevel++;
        this.idleTickCount = 0;
        // When increasing boredom level, we interrupt the current idle to show the more bored state
        this.setIdleState(this.currentIdleLevel).catch(console.error);
      } else if (!this.animationManager.isAnimating) {
        // Only start a new idle animation if the previous one has finished
        this.updateStateAnimation().catch(console.error);
      }
    } else if (!this.animationManager.isAnimating) {
      // Pick a new animation for other persistent states if they finished
      this.updateStateAnimation().catch(console.error);
    }
  }

  /**
   * Whether a specific state name represents an idle behavioral state.
   */
  private isIdleState(state: string): boolean {
    return state.toLowerCase().startsWith(this.idlePrefix.toLowerCase());
  }

  /**
   * Sets the current state to a specific idle level.
   */
  private async setIdleState(level: number): Promise<void> {
    const newState = `${this.idlePrefix}${level}`;
    if (this.states[newState]) {
      this.currentState = newState;
      this.isPaused = false;
      // When explicitly setting idle level, we force a new animation
      // to immediately reflect the level change (e.g., more bored).
      await this.updateStateAnimation(true);
    }
  }

  /**
   * Explicitly sets the agent's behavioral state.
   * Resets idle boredom progression if the new state is not an idling state.
   *
   * @param stateName - The name of the state to transition to.
   * @throws Error if the state name is invalid.
   */
  public async setState(stateName: string): Promise<void> {
    if (!this.states[stateName] && stateName !== 'Playing') {
      throw new Error(`Invalid state name: ${stateName}`);
    }

    if (!this.isIdleState(stateName)) {
      this.resetIdleProgression();
    }

    this.currentState = stateName;

    if (stateName !== 'Hidden') {
      this.isPaused = false;
    }

    if (stateName !== 'Playing') {
      await this.updateStateAnimation();
    }
  }

  /**
   * Plays a specific animation, optionally setting a temporary state.
   * Interrupts any currently playing animation.
   *
   * @param animationName - The animation to play.
   * @param stateName - (Optional) Temporary state name while playing.
   * @param useExitBranch - Whether to start in an exiting state.
   * @param timeoutMs - (Optional) Time limit for the animation.
   * @param loop - (Optional) Whether the animation should loop indefinitely.
   * @returns A promise that resolves when the animation finishes.
   */
  public async playAnimation(
    animationName: string,
    stateName: string = '',
    useExitBranch: boolean = false,
    timeoutMs?: number,
    loop: boolean = false
  ): Promise<boolean> {
    const hasRequests = this.requestQueue && !this.requestQueue.isEmpty;
    // If this is an idle animation (no stateName) and we have requests, skip it.
    if (!stateName && hasRequests) {
      return false;
    }

    if (stateName) {
      this.currentState = stateName;
    }

    // Reset idle timers if we are no longer idling
    if (this.currentState !== 'Playing' && !this.isIdleState(this.currentState)) {
      this.resetIdleProgression();
    }

    // Ensure all assets are loaded before starting
    await this.animationManager.preloadAnimation(animationName);

    let timeoutId: any;
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        // Force the animation to navigate towards its exit branch when timeout hits
        this.animationManager.isExitingFlag = true;
      }, timeoutMs);
    }

    try {
      const result = await this.animationManager.interruptAndPlayAnimation(
        animationName,
        useExitBranch,
        loop || !!timeoutMs
      );
      return result;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // If the action finishes and we haven't changed state, return to base idling
      if (this.currentState === 'Playing' || !this.animationManager.isAnimating) {
        await this.handleAnimationCompleted();
      }
    }
  }

  /**
   * Picks a random non-idle animation and plays it.
   */
  public async playRandomAnimation(timeoutMs: number = 5000): Promise<void> {
    const allAnimations = Object.keys((this.animationManager as any).animations);
    const selectableAnimations = allAnimations.filter(name => !this.isIdleState(name));

    if (selectableAnimations.length > 0) {
      const randomAnimation = selectableAnimations[Math.floor(Math.random() * selectableAnimations.length)];
      await this.playAnimation(randomAnimation, 'Playing', false, timeoutMs);
    }
  }

  /**
   * Fired when an explicit "Playing" or "Moving" animation completes.
   */
  public async handleAnimationCompleted(): Promise<void> {
    if (this.currentState === 'Playing' || this.currentState === 'Moving') {
      await this.returnToIdle();
    }
  }

  /**
   * Returns the agent to the base IdlingLevel1 state and resets all timers.
   */
  private async returnToIdle(): Promise<void> {
    // We only return to idle if there are no other pending requests in the queue.
    // We check length > 0 instead of isEmpty because this might be called from within the last active request.
    const hasOtherRequests = this.requestQueue && this.requestQueue.length > 0;
    if (hasOtherRequests) return;

    await this.setIdleState(1);
    this.resetIdleProgression();
  }

  /**
   * Resets boredom level and tick counters to their starting values.
   */
  public resetIdleProgression(): void {
    this.currentIdleLevel = 1;
    this.idleTickCount = 0;
    this.elapsedSinceLastTick = 0;
    this.isPaused = false;
  }

  /**
   * Picks a random animation from the current state's associated pool and plays it.
   *
   * @param force - If true, interrupts any current animation.
   */
  private async updateStateAnimation(force: boolean = false): Promise<void> {
    const hasOtherRequests = this.requestQueue && this.requestQueue.length > 0;
    if (hasOtherRequests) return;

    if (!force && this.animationManager.isAnimating) return;

    const state = this.states[this.currentState];
    if (state && state.animations.length > 0) {
      const randomAnimation = state.animations[Math.floor(Math.random() * state.animations.length)];
      // We play the animation but don't AWAIT it here for persistent states,
      // as they should be interrupted easily and managed by the main loop.
      this.playAnimation(randomAnimation).catch(console.error);
    }
  }

  /**
   * Handles showing or hiding the agent.
   * Plays the intro/outro animation sequence and waits for it to complete.
   *
   * @param showing - True for intro/showing, False for outro/hiding.
   */
  public async handleVisibilityChange(showing: boolean): Promise<void> {
    const visibilityState = showing ? 'Showing' : 'Hiding';

    if (this.states[visibilityState]) {
      const state = this.states[visibilityState];
      if (state.animations.length > 0) {
        const animName = state.animations[0];

        // Ensure we are not paused while playing the intro/outro transition
        this.isPaused = false;

        // Start the animation and wait for its full completion
        await this.animationManager.preloadAnimation(animName);
        this.currentState = visibilityState;
        // For intro/outro animations, we want them to play once to completion.
        await this.animationManager.playAnimation(animName, true);

        // Transition to Hidden or Idling after animation finishes
        if (showing) {
            // Start idle progression but don't await the non-blocking return call
            // to ensure the visibility request resolves promptly.
            this.returnToIdle().catch(console.error);
        } else {
            this.currentState = 'Hidden';
            this.isPaused = true;
        }
        return;
      }
    }

    // Fallback if no specific visibility state/animation exists
    if (showing) {
      this.isPaused = false;
      await this.returnToIdle();
    } else {
      this.isPaused = true;
      this.animationManager.setAnimation('', false);
      this.currentState = 'Hidden';
    }
  }
}
