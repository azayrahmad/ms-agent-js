import { Agent } from "../Agent";

/**
 * Global application state for the demo.
 * Manages active agent instances, gallery selection, and visibility.
 */
export class DemoState {
  /** The currently active and interactive agent. */
  public currentAgent: Agent | null = null;
  /** The low-scale preview agent shown in the gallery. */
  public previewAgent: Agent | null = null;
  /** Whether the current agent is visible on the screen. */
  public isVisible = true;
  /** Controller used to cancel ongoing agent load requests. */
  public loadAbortController: AbortController | null = null;
  /** Controller used to cancel ongoing preview agent load requests. */
  public previewAbortController: AbortController | null = null;
  /** The index of the currently selected agent in the gallery. */
  public currentGalleryIndex = 0;
  /** Whether the guided tour welcome dialog has been shown in this session. */
  public tourWelcomeShown = false;

  /**
   * Sets the current active agent and cleans up the previous one.
   * Also exposes the agent to the global `window` object for debugging.
   *
   * @param agent - The new agent instance to activate, or null to clear.
   */
  public setCurrentAgent(agent: Agent | null) {
    if (this.currentAgent && this.currentAgent !== agent) {
      this.currentAgent.destroy();
    }
    this.currentAgent = agent;
    (window as any).agent = agent;
  }

  /**
   * Sets the current preview agent and cleans up the previous one.
   *
   * @param agent - The new preview agent instance, or null to clear.
   */
  public setPreviewAgent(agent: Agent | null) {
    if (this.previewAgent && this.previewAgent !== agent) {
      this.previewAgent.destroy();
    }
    this.previewAgent = agent;
  }
}
