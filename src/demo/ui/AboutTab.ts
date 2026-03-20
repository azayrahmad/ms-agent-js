import { BaseTab } from "./BaseTab";
import { DemoState } from "../state";

/**
 * The 'About' tab: provides information and the main Start/Stop button.
 */
export class AboutTab extends BaseTab {
  private startStopBtn: HTMLButtonElement;
  private onToggle: () => Promise<void>;

  constructor(state: DemoState, onToggle: () => Promise<void>) {
    super("panel-about", state);
    this.startStopBtn = document.getElementById("start-stop-btn") as HTMLButtonElement;
    this.onToggle = onToggle;
  }

  public init() {
    this.startStopBtn.addEventListener("click", async () => {
      await this.onToggle();
    });
  }

  /**
   * Updates the button text based on the current state.
   */
  public updateButtonState(isStarted: boolean) {
    this.startStopBtn.textContent = isStarted ? "Stop" : "Start";
  }
}
