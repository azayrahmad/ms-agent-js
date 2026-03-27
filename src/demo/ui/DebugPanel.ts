import { DemoState } from "../state";

/**
 * Handles real-time updates for the debug information panel.
 * Displays internal agent state, current animation frame, and position.
 */
export class DebugPanel {
  private state: DemoState;
  private dashState: HTMLElement;
  private dashAnim: HTMLElement;
  private dashFrame: HTMLElement;
  private dashMouth: HTMLElement;
  private dashLevel: HTMLElement;
  private dashNextTick: HTMLElement;
  private dashQueue: HTMLElement;
  private dashPos: HTMLElement;

  /**
   * Initializes the Debug panel and queries its dashboard elements.
   *
   * @param state - Global application state.
   */
  constructor(state: DemoState) {
    this.state = state;
    this.dashState = document.getElementById("dash-state")!;
    this.dashAnim = document.getElementById("dash-anim")!;
    this.dashFrame = document.getElementById("dash-frame")!;
    this.dashMouth = document.getElementById("dash-mouth")!;
    this.dashLevel = document.getElementById("dash-level")!;
    this.dashNextTick = document.getElementById("dash-next-tick")!;
    this.dashQueue = document.getElementById("dash-queue")!;
    this.dashPos = document.getElementById("dash-pos")!;
  }

  /**
   * Sets the status text in the debug panel (e.g., "Loading...", "Stopped").
   *
   * @param text - The text to display in the 'State' field.
   */
  public setStatus(text: string) {
    this.dashState.textContent = text;
  }

  /**
   * Resets all debug value labels to a default '-' state.
   */
  public reset() {
    this.dashState.textContent = "-";
    this.dashAnim.textContent = "-";
    this.dashFrame.textContent = "-";
    this.dashMouth.textContent = "-";
    this.dashLevel.textContent = "-";
    this.dashNextTick.textContent = "-";
    this.dashQueue.textContent = "-";
    this.dashPos.textContent = "-";
  }

  /**
   * Synchronizes the dashboard UI with the current properties of the active agent.
   * This is typically called within a `requestAnimationFrame` loop.
   */
  public update() {
    const agent = this.state.currentAgent;
    if (agent && agent.stateManager && agent.animationManager) {
      this.dashState.textContent = agent.stateManager.currentStateName;
      this.dashAnim.textContent = agent.animationManager.currentAnimationName || "-";
      this.dashFrame.textContent = agent.animationManager.currentFrameIndexValue.toString();
      this.dashMouth.textContent = agent.animationManager.currentViseme || "-";
      this.dashLevel.textContent = agent.stateManager.idleLevel.toString();
      this.dashNextTick.textContent = (agent.stateManager.timeUntilNextTick / 1000).toFixed(1);

      const activeId = agent.requestQueue.activeRequestId;
      const length = agent.requestQueue.length;
      this.dashQueue.textContent = activeId ? `ID:${activeId} (+${length})` : "Empty";

      this.dashPos.textContent = `X:${Math.round(agent.options.x)}, Y:${Math.round(agent.options.y)}`;
    }
  }
}
