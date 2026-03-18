import { type State } from "../base/types";
import { AnimationManager } from "./AnimationManager";
import { RequestQueue } from "./RequestQueue";
import { createActor, type Actor } from "xstate";
import { agentMachine, type AgentContext } from "./agentMachine";

/**
 * Configuration for the StateManager, controlling idle level progression.
 */
export interface StateManagerConfig {
  /** Time between idle level progression checks (default: 5000ms). */
  idleIntervalMs?: number;
  /** Number of idle intervals before the idle level increases (default: 3). */
  ticksPerLevel?: number;
  /** Maximum idle level (usually 3). */
  maxIdleLevel?: number;
}

/**
 * StateManager class for managing the agent's high-level behavioral state using XState.
 */
export class StateManager {
  private states: Record<string, State>;
  private animationManager: AnimationManager;
  private requestQueue?: RequestQueue;
  public readonly actor: Actor<typeof agentMachine>;

  private lastAnimationId: number = 0;

  constructor(
    states: Record<string, State>,
    animationManager: AnimationManager,
    config?: StateManagerConfig,
  ) {
    this.states = states;
    this.animationManager = animationManager;

    const context: Partial<AgentContext> = {
      idleIntervalMs: config?.idleIntervalMs ?? 5000,
      ticksPerLevel: config?.ticksPerLevel ?? 3,
      maxIdleLevel: config?.maxIdleLevel ?? 3,
      stateName: 'Hidden'
    };

    this.actor = createActor(agentMachine, {
      input: context as AgentContext,
    });

    this.actor.subscribe((state) => {
      if (state.changed || state.status === 'active') {
        // Trigger animations when entering specific states
        if (state.matches({ idling: 'triggerAnimation' }) || state.matches({ idling: 'evaluatingIdle' })) {
          this.updateStateAnimation().catch(console.error);
        }
      }
    });

    this.actor.start();

    // Wire up animation completion to XState
    this.animationManager.on("animationCompleted", () => {
      this.actor.send({ type: "ANIMATION_END" });
    });
  }

  public get currentStateName(): string {
    return this.actor.getSnapshot().context.stateName;
  }

  public get idleLevel(): number {
    return this.actor.getSnapshot().context.idleLevel;
  }

  public get ticksToNextLevel(): number {
    const context = this.actor.getSnapshot().context;
    return context.ticksPerLevel - context.idleTickCount;
  }

  public get timeUntilNextTick(): number {
    const context = this.actor.getSnapshot().context;
    return Math.max(0, context.idleIntervalMs - context.elapsedSinceLastTick);
  }

  private get elapsedSinceLastTick(): number {
     return this.actor.getSnapshot().context.elapsedSinceLastTick;
  }

  public setRequestQueue(queue: RequestQueue) {
    this.requestQueue = queue;
  }

  /**
   * Advances the internal state of the core based on elapsed time.
   * Now pushes a TICK event to the XState actor.
   */
  public async update(deltaTime: number): Promise<void> {
    const hasRequests = this.requestQueue && !this.requestQueue.isEmpty;
    if (hasRequests) {
        this.actor.send({ type: "INTERRUPT" });
        return;
    }

    this.actor.send({ type: "TICK", deltaTime });
  }

  /**
   * Explicitly sets the agent's behavioral state via XState.
   */
  public async setState(stateName: string): Promise<void> {
    this.actor.send({ type: "SET_STATE", state: stateName });

    if (stateName !== "Hidden" && stateName !== "Playing" && stateName !== "Speaking" && stateName !== "Moving") {
        await this.updateStateAnimation();
    }
  }

  public async playAnimation(
    animationName: string,
    stateName: string = "",
    useExitBranch: boolean = false,
    timeoutMs?: number,
    loop: boolean = false,
  ): Promise<boolean> {
    const currentAnimationId = ++this.lastAnimationId;

    this.actor.send({ type: "PLAY", animation: animationName, state: stateName });

    await this.animationManager.preloadAnimation(animationName);

    if (this.lastAnimationId !== currentAnimationId) {
      return false;
    }

    let timeoutId: any;
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        this.animationManager.isExitingFlag = true;
      }, timeoutMs);
    }

    try {
      const result = await this.animationManager.interruptAndPlayAnimation(
        animationName,
        useExitBranch,
        loop || !!timeoutMs,
      );
      return result;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // ANIMATION_END will be sent by the event listener in constructor
    }
  }

  public async handleAnimationCompleted(): Promise<void> {
    this.actor.send({ type: "ANIMATION_END" });
  }

  public resetIdleProgression(): void {
    this.actor.send({ type: "INTERRUPT" });
  }

  private async updateStateAnimation(force: boolean = false): Promise<void> {
    const hasOtherRequests = this.requestQueue && this.requestQueue.length > 0;
    if (hasOtherRequests) return;

    if (!force && this.animationManager.isAnimating) return;

    const stateName = this.currentStateName;
    const state = this.states[stateName];
    if (state && state.animations.length > 0) {
      const randomAnimation =
        state.animations[Math.floor(Math.random() * state.animations.length)];
      this.playAnimation(randomAnimation).catch(console.error);
    }
  }

  public async handleVisibilityChange(
    showing: boolean,
    animationName?: string,
  ): Promise<void> {
    const visibilityState = showing ? "Showing" : "Hiding";
    let animToPlay = "";

    if (
      animationName &&
      (this.animationManager as any).animations[animationName]
    ) {
      animToPlay = animationName;
    } else if (
      this.states[visibilityState] &&
      this.states[visibilityState].animations.length > 0
    ) {
      animToPlay = this.states[visibilityState].animations[0];
    }

    if (showing) {
        this.actor.send({ type: "SHOW", animation: animToPlay });
    } else {
        this.actor.send({ type: "HIDE", animation: animToPlay });
    }

    if (animToPlay) {
      await this.animationManager.preloadAnimation(animToPlay);
      await this.animationManager.playAnimation(animToPlay, true);
      // ANIMATION_END will trigger idling/hidden transition
      return;
    }

    // Fallback
    this.actor.send({ type: "ANIMATION_END" });
  }
}
