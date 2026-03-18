# State Management (XState)

MSAgentJS uses [XState v5](https://stately.ai/docs/xstate) to manage the high-level behavioral states of the agent. This provides a formal, declarative, and deterministic "brain" for the character.

---

## 🧠 The State Machine

The logic is defined in `src/core/behavior/AgentMachine.ts`. The machine handles visibility transitions, idle progression (boredom levels), and action requests.

### 🗺 State Hierarchy

*   **`hidden`**: The agent is not visible and not processing idle logic.
*   **`showing`**: The agent is playing its entry animation.
*   **`idling`**: The base state when no actions are queued.
    *   **`active`**: Waiting for the next idle tick.
    *   **`evaluating`**: Checking if it's time to trigger an animation or increase boredom.
    *   **`ticking`**: Incrementing the internal idle counter.
    *   **`progressing`**: Moving to the next idle level (e.g., Level 1 -> Level 2).
*   **`busy`**: The agent is performing an explicit action (Playing, Speaking, Moving).
*   **`hiding`**: The agent is playing its exit animation.

### ⚡️ Events

| Event | Description |
| --- | --- |
| `SHOW` | Triggers transition from `hidden` to `showing`. |
| `HIDE` | Triggers transition to `hiding`. |
| `PLAY` | Transitions to `busy` to play a specific animation. |
| `SET_STATE` | Forcefully sets a specific high-level state. |
| `ANIMATION_END` | Signals that a long-running animation has completed. |
| `TICK` | Drives the internal clock with `deltaTime` from the main loop. |
| `INTERRUPT` | Resets idle timers, usually sent when a new request enters the queue. |

---

## ⏱ Deterministic Timing

Unlike typical XState implementations that might use system-time `after` delays, MSAgentJS uses a **deterministic clock**.

The `StateManager` sends a `TICK` event to the machine on every frame:
```typescript
public async update(deltaTime: number): Promise<void> {
  this.actor.send({ type: "TICK", deltaTime });
}
```

The machine tracks `elapsedSinceLastTick` in its context and triggers transitions only when the accumulated time exceeds the `idleIntervalMs`. This ensures that the agent's behavior remains consistent regardless of frame rate fluctuations or tab backgrounding.

---

## 📈 Idle Progression (Boredom)

The machine manages "boredom" levels. As the agent remains idle:
1.  `idleTickCount` increments on every interval.
2.  After `ticksPerLevel` intervals, the `idleLevel` increases (up to `maxIdleLevel`).
3.  Each level change updates the `stateName` (e.g., `IdlingLevel1` -> `IdlingLevel2`), which triggers different pools of animations.

---

## 🔍 Observability

Advanced users can subscribe to the state machine directly to react to internal transitions:

```typescript
agent.stateManager.actor.subscribe((snapshot) => {
  console.log("Current State:", snapshot.value);
  console.log("Current Context:", snapshot.context);
});
```

This allows for deep integration, such as syncing external UI elements with the agent's internal "mood" or boredom level.

---

## ⚖️ Comparison with Manual State Management

Before adopting XState, the agent's behavior was managed by manual conditional logic within a 60fps update loop.

### Why XState is better:
1.  **Atomicity**: Transitions are atomic. It is physically impossible for the agent to be in two high-level states at once or get "stuck" in a middle state.
2.  **Declarative Hierarchy**: Managing "sub-states" (like the different levels of boredom within the Idling state) is handled via a clean tree structure rather than nested `if/else` statements.
3.  **Determinism**: By feeding `TICK` events with `deltaTime`, the machine's internal clock is perfectly synced with the library's rendering engine, regardless of browser performance or frame-rate drops.
4.  **Extensibility**: Adding complex behaviors like "Parallel States" (e.g., the agent speaking while moving) is a configuration change in XState, whereas it would require a massive refactor of manual update logic.

### Manual Complexity
To achieve the same robustness manually, a developer would have to:
- Manually manage and clear multiple timers (`setTimeout`, `setInterval`) on every state change.
- Implement a custom "event listener" for every possible valid/invalid transition to prevent race conditions.
- Write deeply nested switch statements that become increasingly difficult to debug as more animations and states are added.
