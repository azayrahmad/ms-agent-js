/**
 * Action type for state machine transitions.
 * @template TContext - The type of the machine context.
 * @template TEvent - The type of the events processed by the machine.
 */
export type Action<TContext, TEvent> = (context: TContext, event: TEvent) => void;

/**
 * Guard type for determining if a transition should be executed.
 * @template TContext - The type of the machine context.
 * @template TEvent - The type of the events processed by the machine.
 */
export type Guard<TContext, TEvent> = (context: TContext, event: TEvent) => boolean;

/**
 * Represents a transition between states in the machine.
 */
export interface Transition<TContext, TEvent> {
  /** The name of the target state to transition to. */
  target?: string;
  /** An optional guard function or name that must return true for the transition to occur. */
  cond?: string | Guard<TContext, TEvent>;
  /** A list of action names or functions to execute during the transition. */
  actions?: string[];
}

/**
 * Configuration for an individual state within the machine.
 */
export interface StateConfig<TContext, TEvent> {
  /** Map of event types to transitions or target state names. */
  on?: Record<string, string | Transition<TContext, TEvent> | Array<Transition<TContext, TEvent>>>;
  /** Actions to execute when entering this state. */
  entry?: string[];
  /** Actions to execute when exiting this state. */
  exit?: string[];
}

/**
 * The complete configuration object for a State Machine.
 */
export interface MachineConfig<TContext, TEvent> {
  /** Optional identifier for the machine. */
  id?: string;
  /** The name of the initial state. */
  initial: string;
  /** The initial context (extended state) of the machine. */
  context: TContext;
  /** Map of state names to their configurations. */
  states: Record<string, StateConfig<TContext, TEvent>>;
}

/**
 * Options for a machine instance, including action and guard implementations.
 */
export interface MachineOptions<TContext, TEvent> {
  /** Map of action names to their implementations. */
  actions?: Record<string, Action<TContext, TEvent>>;
  /** Map of guard names to their implementations. */
  guards?: Record<string, Guard<TContext, TEvent>>;
}

/**
 * Lightweight XState-inspired state machine implementation.
 * Designed for readability and ease of modification in the StateManager.
 *
 * Supports hierarchical-ready (flat for now) states, context, events,
 * guards, and entry/exit actions.
 *
 * @template TContext - The type of the machine's extended state.
 * @template TEvent - The union type of events the machine can handle.
 */
export class Machine<TContext, TEvent extends { type: string }> {
  private _currentState: string;
  private _context: TContext;
  private _config: MachineConfig<TContext, TEvent>;
  private _options: MachineOptions<TContext, TEvent>;

  /**
   * @param config - The machine configuration (states, initial state, context).
   * @param options - Implementations for actions and guards referenced in the config.
   */
  constructor(
    config: MachineConfig<TContext, TEvent>,
    options: MachineOptions<TContext, TEvent> = {},
  ) {
    this._config = config;
    this._context = { ...config.context };
    this._currentState = config.initial;
    this._options = options;
  }

  /**
   * The name of the current state.
   */
  public get state(): string {
    return this._currentState;
  }

  /**
   * The current extended state (context) of the machine.
   */
  public get context(): TContext {
    return this._context;
  }

  /**
   * Sends an event to the state machine and triggers transitions and actions.
   *
   * @param event - The event object containing a 'type' property.
   * @returns Whether a transition was successfully executed.
   */
  public send(event: TEvent): boolean {
    const stateConfig = this._config.states[this._currentState];
    if (!stateConfig || !stateConfig.on) return false;

    const transition = stateConfig.on[event.type];
    if (!transition) return false;

    if (typeof transition === "string") {
      this.transitionTo(transition, event);
      return true;
    }

    if (Array.isArray(transition)) {
      for (const t of transition) {
        if (this.executeTransition(t, event)) return true;
      }
      return false;
    }

    return this.executeTransition(transition, event);
  }

  /**
   * Internal helper to process a transition object.
   */
  private executeTransition(
    transition: Transition<TContext, TEvent>,
    event: TEvent,
  ): boolean {
    if (transition.cond) {
      const guard = typeof transition.cond === "string"
        ? this._options.guards?.[transition.cond]
        : transition.cond;

      if (!guard || !guard(this._context, event)) {
        return false;
      }
    }

    if (transition.actions) {
      transition.actions.forEach((actionKey) => {
        const action = this._options.actions?.[actionKey];
        if (typeof action === "function") {
          action(this._context, event);
        }
      });
    }

    if (transition.target) {
      this.transitionTo(transition.target, event);
    }

    return true;
  }

  /**
   * Executes a state change, triggering exit and entry actions.
   */
  private transitionTo(target: string, event: TEvent) {
    const exitActions = this._config.states[this._currentState]?.exit;
    exitActions?.forEach((actionKey) => {
      const action = this._options.actions?.[actionKey];
      if (typeof action === "function") {
        action(this._context, event);
      }
    });

    this._currentState = target;

    const entryActions = this._config.states[this._currentState]?.entry;
    entryActions?.forEach((actionKey) => {
      const action = this._options.actions?.[actionKey];
      if (typeof action === "function") {
        action(this._context, event);
      }
    });
  }
}
