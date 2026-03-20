/**
 * Lightweight XState-inspired state machine implementation.
 * Designed for readability and ease of modification in the StateManager.
 */

export type Action<TContext, TEvent> = (context: TContext, event: TEvent) => void;
export type Guard<TContext, TEvent> = (context: TContext, event: TEvent) => boolean;

export interface Transition<TContext, TEvent> {
  target?: string;
  cond?: string | Guard<TContext, TEvent>;
  actions?: string[];
}

export interface StateConfig<TContext, TEvent> {
  on?: Record<string, string | Transition<TContext, TEvent> | Array<Transition<TContext, TEvent>>>;
  entry?: string[];
  exit?: string[];
}

export interface MachineConfig<TContext, TEvent> {
  id?: string;
  initial: string;
  context: TContext;
  states: Record<string, StateConfig<TContext, TEvent>>;
}

export interface MachineOptions<TContext, TEvent> {
  actions?: Record<string, Action<TContext, TEvent>>;
  guards?: Record<string, Guard<TContext, TEvent>>;
}

export class Machine<TContext, TEvent extends { type: string }> {
  private _currentState: string;
  private _context: TContext;
  private _config: MachineConfig<TContext, TEvent>;
  private _options: MachineOptions<TContext, TEvent>;

  constructor(
    config: MachineConfig<TContext, TEvent>,
    options: MachineOptions<TContext, TEvent> = {},
  ) {
    this._config = config;
    this._context = { ...config.context };
    this._currentState = config.initial;
    this._options = options;
  }

  public get state(): string {
    return this._currentState;
  }

  public get context(): TContext {
    return this._context;
  }

  /**
   * Sends an event to the state machine and triggers transitions/actions.
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
