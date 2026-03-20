import { type State } from "../base/types";
import { AnimationManager } from "./AnimationManager";
import { RequestQueue } from "./RequestQueue";
import { Machine, type MachineConfig } from "./StateMachine";

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
 * Context for the state machine.
 */
export interface StateContext {
  idleTickCount: number;
  currentIdleLevel: number;
  elapsedSinceLastTick: number;
  idleIntervalMs: number;
  ticksPerLevel: number;
  maxIdleLevel: number;
  currentState: string;
}

/**
 * Events for the state machine.
 */
export type StateEvent =
  | { type: "TICK"; deltaTime: number }
  | { type: "ANIMATION_END" }
  | { type: "SHOW"; animationName?: string }
  | { type: "HIDE"; animationName?: string }
  | { type: "PLAY"; animationName: string; stateName?: string; timeoutMs?: number; loop?: boolean }
  | { type: "STATE_SET"; stateName: string };

/**
 * StateManager class for managing the agent's high-level behavioral state.
 * It handles the progression from one state to another (e.g., Idling -> Playing -> Idling)
 * and manages "boredom" levels through the idle progression system.
 */
export class StateManager {
  private states: Record<string, State>;
  private animationManager: AnimationManager;
  private requestQueue?: RequestQueue;
  private machine: Machine<StateContext, StateEvent>;

  private idlePrefix: string = "IdlingLevel";
  private lastAnimationId: number = 0;
  private wasAnimating: boolean = false;

  constructor(
    states: Record<string, State>,
    animationManager: AnimationManager,
    config?: StateManagerConfig,
  ) {
    this.states = states;
    this.animationManager = animationManager;

    const idleIntervalMs = config?.idleIntervalMs ?? 10000;
    const ticksPerLevel = config?.ticksPerLevel ?? 12;
    const maxIdleLevel = config?.maxIdleLevel ?? 3;

    const machineConfig: MachineConfig<StateContext, StateEvent> = {
      initial: "Hidden",
      context: {
        idleTickCount: 0,
        currentIdleLevel: 1,
        elapsedSinceLastTick: 0,
        idleIntervalMs,
        ticksPerLevel,
        maxIdleLevel,
        currentState: "Hidden",
      },
      states: {
        Hidden: {
          entry: ["setHidden"],
          on: {
            SHOW: "Showing",
            STATE_SET: {
              target: "Persistent",
              actions: ["setStateName", "resetIdle"],
            },
          },
        },
        Showing: {
          entry: ["setShowing", "playShowAnimation"],
          on: {
            ANIMATION_END: [
              { target: "Playing", cond: "hasRequests" },
              { target: "Persistent", actions: ["resetToIdleState", "resetIdle"] },
            ],
            HIDE: "Hiding",
            STATE_SET: {
              target: "Persistent",
              actions: ["setStateName", "resetIdle"],
            },
          },
        },
        Hiding: {
          entry: ["setHiding", "playHideAnimation"],
          on: {
            ANIMATION_END: "Hidden",
            SHOW: "Showing",
          },
        },
        Persistent: {
          entry: ["updateStateAnimation"],
          on: {
            TICK: {
              actions: ["processTick"],
            },
            ANIMATION_END: [
              { target: "Playing", cond: "hasRequests" },
              { target: "Persistent", cond: "shouldLoopPersistent", actions: ["updateStateAnimation"] },
            ],
            PLAY: {
              target: "Playing",
              actions: ["setStateName", "resetIdle"],
            },
            HIDE: "Hiding",
            STATE_SET: {
              target: "Persistent",
              actions: ["setStateName", "resetIdle"],
            },
          },
        },
        Playing: {
          on: {
            ANIMATION_END: [
              { target: "Playing", cond: "hasRequests" },
              { target: "Persistent", actions: ["resetToIdleState", "resetIdle"] },
            ],
            PLAY: {
              target: "Playing",
              actions: ["setStateName", "resetIdle"],
            },
            HIDE: "Hiding",
            STATE_SET: {
              target: "Persistent",
              actions: ["setStateName", "resetIdle"],
            },
          },
        },
      },
    };

    this.machine = new Machine(machineConfig, {
      guards: {
        hasRequests: () => !!this.requestQueue && !this.requestQueue.isEmpty,
        isNotAnimating: () => !this.animationManager.isAnimating,
        shouldLoopPersistent: (ctx) => {
            if (this.animationManager.isAnimating) return false;
            // Loop if NOT an idle state (e.g., Gesturing)
            return !this.isIdleState(ctx.currentState);
        }
      },
      actions: {
        setHidden: (ctx) => { ctx.currentState = "Hidden"; },
        setShowing: (ctx) => { ctx.currentState = "Showing"; },
        setHiding: (ctx) => { ctx.currentState = "Hiding"; },
        setStateName: (ctx, event) => {
          if (event.type === "STATE_SET") {
            ctx.currentState = event.stateName;
          } else if (event.type === "PLAY") {
            ctx.currentState = event.stateName || "Playing";
          }
        },
        resetToIdleState: (ctx) => {
            ctx.currentState = `${this.idlePrefix}1`;
        },
        resetIdle: (ctx) => {
          ctx.currentIdleLevel = 1;
          ctx.idleTickCount = 0;
          ctx.elapsedSinceLastTick = 0;
        },
        processTick: (ctx, event) => {
          if (event.type !== "TICK") return;
          if (!!this.requestQueue && !this.requestQueue.isEmpty) {
            ctx.elapsedSinceLastTick = 0;
            return;
          }

          ctx.elapsedSinceLastTick += event.deltaTime;
          if (ctx.elapsedSinceLastTick >= ctx.idleIntervalMs) {
            ctx.elapsedSinceLastTick = 0;
            this.handleIdleTick(ctx);
          }
        },
        updateStateAnimation: () => {
          this.updateStateAnimation().catch(console.error);
        },
        playShowAnimation: (ctx, event) => {
          const animationName = event.type === "SHOW" ? event.animationName : undefined;
          this.handleVisibilityChangeInternal(true, animationName).catch(console.error);
        },
        playHideAnimation: (ctx, event) => {
          const animationName = event.type === "HIDE" ? event.animationName : undefined;
          this.handleVisibilityChangeInternal(false, animationName).catch(console.error);
        },
      },
    });
  }

  /**
   * Internal getter for testing compatibility.
   */
  private get elapsedSinceLastTick(): number {
    return this.machine.context.elapsedSinceLastTick;
  }

  /**
   * The name of the current behavioral state.
   */
  public get currentStateName(): string {
    return this.machine.context.currentState;
  }

  /**
   * The current "boredom" level of the agent.
   */
  public get idleLevel(): number {
    return this.machine.context.currentIdleLevel;
  }

  /**
   * Number of idle intervals remaining before the agent progresses to the next boredom level.
   */
  public get ticksToNextLevel(): number {
    return this.machine.context.ticksPerLevel - this.machine.context.idleTickCount;
  }

  /**
   * Time remaining until the next idle interval check, in milliseconds.
   */
  public get timeUntilNextTick(): number {
    return Math.max(0, this.machine.context.idleIntervalMs - this.machine.context.elapsedSinceLastTick);
  }

  /**
   * Sets the request queue reference.
   */
  public setRequestQueue(queue: RequestQueue) {
    this.requestQueue = queue;
  }

  /**
   * Updates the state machine. Called once per main loop iteration.
   */
  public async update(deltaTime: number): Promise<void> {
    this.machine.send({ type: "TICK", deltaTime });

    const isAnimating = this.animationManager.isAnimating;
    if (this.wasAnimating && !isAnimating) {
        this.machine.send({ type: "ANIMATION_END" });
    }
    this.wasAnimating = isAnimating;
  }

  /**
   * Handle an idle tick.
   */
  private handleIdleTick(ctx: StateContext) {
    if (this.isIdleState(ctx.currentState)) {
      ctx.idleTickCount++;

      if (ctx.idleTickCount >= ctx.ticksPerLevel && ctx.currentIdleLevel < ctx.maxIdleLevel) {
        ctx.currentIdleLevel++;
        ctx.idleTickCount = 0;
        ctx.currentState = `${this.idlePrefix}${ctx.currentIdleLevel}`;
        this.updateStateAnimation(true).catch(console.error);
      } else if (!this.animationManager.isAnimating) {
        this.updateStateAnimation().catch(console.error);
      }
    } else if (!this.animationManager.isAnimating) {
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
   * Explicitly sets the agent's behavioral state.
   */
  public async setState(stateName: string): Promise<void> {
    if (
      !this.states[stateName] &&
      stateName !== "Playing" &&
      stateName !== "Speaking" &&
      stateName !== "Moving"
    ) {
      throw new Error(`Invalid state name: ${stateName}`);
    }

    this.machine.send({ type: "STATE_SET", stateName });
  }

  /**
   * Plays a specific animation, optionally setting a temporary state.
   */
  public async playAnimation(
    animationName: string,
    stateName: string = "",
    useExitBranch: boolean = false,
    timeoutMs?: number,
    loop: boolean = false,
  ): Promise<boolean> {
    if (stateName) {
        this.machine.send({ type: "PLAY", animationName, stateName, timeoutMs, loop });
    }

    const currentAnimationId = ++this.lastAnimationId;

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
      this.wasAnimating = true;
      const result = await this.animationManager.interruptAndPlayAnimation(
        animationName,
        useExitBranch,
        loop || !!timeoutMs,
      );
      return result;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (this.lastAnimationId === currentAnimationId) {
        this.machine.send({ type: "ANIMATION_END" });
      }
    }
  }

  /**
   * Picks a random non-idle animation and plays it.
   */
  public async playRandomAnimation(timeoutMs: number = 5000): Promise<void> {
    const allAnimations = Object.keys((this.animationManager as any).animations);
    const selectableAnimations = allAnimations.filter((name) => !this.isIdleState(name));

    if (selectableAnimations.length > 0) {
      const randomAnimation = selectableAnimations[Math.floor(Math.random() * selectableAnimations.length)];
      await this.playAnimation(randomAnimation, "Playing", false, timeoutMs);
    }
  }

  /**
   * Legacy method kept for interface compatibility.
   */
  public async handleAnimationCompleted(): Promise<void> {
    this.machine.send({ type: "ANIMATION_END" });
  }

  /**
   * Resets boredom level and tick counters to their starting values.
   */
  public resetIdleProgression(): void {
    this.machine.send({ type: "STATE_SET", stateName: `${this.idlePrefix}1` });
  }

  /**
   * Picks a random animation from the current state's associated pool and plays it.
   */
  private async updateStateAnimation(force: boolean = false): Promise<void> {
    if (!force && this.animationManager.isAnimating) return;

    const state = this.states[this.machine.context.currentState];
    if (state && state.animations.length > 0) {
      const randomAnimation = state.animations[Math.floor(Math.random() * state.animations.length)];
      this.playAnimation(randomAnimation).catch(console.error);
    }
  }

  /**
   * Handles showing or hiding the agent.
   */
  public async handleVisibilityChange(showing: boolean, animationName?: string): Promise<void> {
    this.machine.send(showing ? { type: "SHOW", animationName } : { type: "HIDE", animationName });
  }

  private async handleVisibilityChangeInternal(showing: boolean, animationName?: string): Promise<void> {
    const visibilityState = showing ? "Showing" : "Hiding";
    let animToPlay = "";

    if (animationName && (this.animationManager as any).animations[animationName]) {
      animToPlay = animationName;
    } else if (this.states[visibilityState]?.animations.length > 0) {
      animToPlay = this.states[visibilityState].animations[0];
    }

    if (animToPlay) {
      await this.animationManager.preloadAnimation(animToPlay);
      this.wasAnimating = true;
      await this.animationManager.playAnimation(animToPlay, true);
      this.machine.send({ type: "ANIMATION_END" });
    } else {
      if (!showing) {
        this.animationManager.setAnimation("", false);
      }
      this.machine.send({ type: "ANIMATION_END" });
    }
  }
}
