import { BaseTab } from "./BaseTab";
import { DemoState } from "../state";

/**
 * The 'About' tab: provides information and the main Start/Stop button.
 */
export class AboutTab extends BaseTab {
  private startStopBtn: HTMLButtonElement;
  private visibilityBtn: HTMLButtonElement;
  private helpBtn: HTMLButtonElement;
  private onToggle: () => Promise<void>;
  private onHelp: () => Promise<void>;

  constructor(state: DemoState, onToggle: () => Promise<void>, onHelp: () => Promise<void>) {
    super("panel-about", state);
    this.startStopBtn = document.getElementById("start-stop-btn") as HTMLButtonElement;
    this.visibilityBtn = document.getElementById("visibility-btn") as HTMLButtonElement;
    this.helpBtn = document.getElementById("help-btn") as HTMLButtonElement;
    this.onToggle = onToggle;
    this.onHelp = onHelp;
  }

  public init() {
    this.startStopBtn.addEventListener("click", async () => {
      await this.onToggle();
    });

    this.helpBtn.addEventListener("click", async () => {
      await this.onHelp();
    });

    this.visibilityBtn.addEventListener("click", async () => {
      if (!this.state.currentAgent) return;

      this.visibilityBtn.disabled = true;
      this.state.isVisible = !this.state.isVisible;

      if (this.state.isVisible) {
        await this.state.currentAgent.show();
        this.visibilityBtn.textContent = "Hide";
      } else {
        await this.state.currentAgent.hide();
        this.visibilityBtn.textContent = "Show";
      }

      this.visibilityBtn.disabled = false;
    });
  }

  /**
   * Updates the button text based on the current state.
   */
  public updateButtonState(isStarted: boolean) {
    this.startStopBtn.textContent = isStarted ? "Stop" : "Start";
    if (!isStarted) {
      this.visibilityBtn.disabled = true;
      this.helpBtn.disabled = true;
      this.visibilityBtn.textContent = "Hide";
    } else {
      this.visibilityBtn.disabled = false;
      this.helpBtn.disabled = false;
    }
  }

  /**
   * Updates the visibility button state based on current agent visibility.
   */
  public updateVisibilityState(isVisible: boolean) {
    this.state.isVisible = isVisible;
    this.visibilityBtn.textContent = isVisible ? "Hide" : "Show";
  }
}
