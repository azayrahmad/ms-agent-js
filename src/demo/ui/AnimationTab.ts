import { BaseTab } from "./BaseTab";
import { DemoState } from "../state";

/**
 * The 'Animation' tab panel.
 * Provides controls for scaling the agent, playing specific animations,
 * switching behavioral states, and performing gestures.
 */
export class AnimationTab extends BaseTab {
  private scaleRange: HTMLInputElement;
  private scaleValue: HTMLSpanElement;
  private animationSelect: HTMLSelectElement;
  private stateSelect: HTMLSelectElement;
  private playBtn: HTMLButtonElement;
  private play5sBtn: HTMLButtonElement;
  private playLoopedBtn: HTMLButtonElement;
  private randomBtn: HTMLButtonElement;

  private gestureLeftBtn: HTMLButtonElement;
  private gestureRightBtn: HTMLButtonElement;
  private gestureUpBtn: HTMLButtonElement;
  private gestureDownBtn: HTMLButtonElement;
  private moveToMouseBtn: HTMLButtonElement;

  /**
   * Initializes the Animation tab.
   *
   * @param state - Global application state.
   */
  constructor(state: DemoState) {
    super("panel-animation", state);
    this.scaleRange = document.getElementById("scale-range") as HTMLInputElement;
    this.scaleValue = document.getElementById("scale-value") as HTMLSpanElement;
    this.animationSelect = document.getElementById("animation-select") as HTMLSelectElement;
    this.stateSelect = document.getElementById("state-select") as HTMLSelectElement;
    this.playBtn = document.getElementById("play-btn") as HTMLButtonElement;
    this.play5sBtn = document.getElementById("play-5s-btn") as HTMLButtonElement;
    this.playLoopedBtn = document.getElementById("play-looped-btn") as HTMLButtonElement;
    this.randomBtn = document.getElementById("random-btn") as HTMLButtonElement;

    this.gestureLeftBtn = document.getElementById("gesture-left-btn") as HTMLButtonElement;
    this.gestureRightBtn = document.getElementById("gesture-right-btn") as HTMLButtonElement;
    this.gestureUpBtn = document.getElementById("gesture-up-btn") as HTMLButtonElement;
    this.gestureDownBtn = document.getElementById("gesture-down-btn") as HTMLButtonElement;
    this.moveToMouseBtn = document.getElementById("move-to-mouse-btn") as HTMLButtonElement;
  }

  /**
   * Binds UI event listeners to agent methods.
   */
  public init() {
    this.scaleRange.addEventListener("input", () => {
      const scale = parseFloat(this.scaleRange.value);
      this.scaleValue.textContent = `${scale.toFixed(1)}x`;
      this.state.currentAgent?.setScale(scale);
    });

    this.playBtn.addEventListener("click", () => {
      this.state.currentAgent?.play(this.animationSelect.value);
    });

    this.play5sBtn.addEventListener("click", () => {
      this.state.currentAgent?.play(this.animationSelect.value, 5000);
    });

    this.playLoopedBtn.addEventListener("click", async () => {
      if (!this.state.currentAgent) return;

      if (this.playLoopedBtn.textContent === "Stop") {
        this.state.currentAgent.stop();
        this.playLoopedBtn.textContent = "Play looped";
        return;
      }

      this.playLoopedBtn.textContent = "Stop";
      const req = this.state.currentAgent.play(this.animationSelect.value, undefined, false, true);

      // Reset button text when animation ends
      try {
        await req;
      } finally {
        if (this.playLoopedBtn.textContent === "Stop") {
          this.playLoopedBtn.textContent = "Play looped";
        }
      }
    });

    this.randomBtn.addEventListener("click", () => {
      this.state.currentAgent?.animate();
    });

    this.stateSelect.addEventListener("change", () => {
      this.state.currentAgent?.setState(this.stateSelect.value);
    });

    this.gestureLeftBtn.addEventListener("click", () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      agent.gestureAt(agent.options.x - 100, agent.options.y + 50);
    });
    this.gestureRightBtn.addEventListener("click", () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      agent.gestureAt(
        agent.options.x + agent.spriteManager.getSpriteWidth() * agent.options.scale + 100,
        agent.options.y + 50,
      );
    });
    this.gestureUpBtn.addEventListener("click", () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      agent.gestureAt(agent.options.x + 50, agent.options.y - 100);
    });
    this.gestureDownBtn.addEventListener("click", () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      agent.gestureAt(
        agent.options.x + 50,
        agent.options.y + agent.spriteManager.getSpriteHeight() * agent.options.scale + 100,
      );
    });

    this.moveToMouseBtn.addEventListener("click", () => {
      if (!this.state.currentAgent) {
        this.moveToMouseBtn.disabled = true;
        return;
      }

      this.moveToMouseBtn.disabled = true;
      const originalText = this.moveToMouseBtn.textContent;
      this.moveToMouseBtn.textContent = "Click on page to move";

      const onMouseDown = (e: MouseEvent) => {
        const agent = this.state.currentAgent;
        if (!agent) return;
        const targetX = e.clientX - (agent.definition.character.width * agent.options.scale) / 2;
        const targetY = e.clientY - (agent.definition.character.height * agent.options.scale) / 2;

        agent.moveTo(targetX, targetY);

        window.removeEventListener("mousedown", onMouseDown);
        this.moveToMouseBtn.disabled = false;
        this.moveToMouseBtn.textContent = originalText;
      };
      // Use setTimeout to avoid capturing the current click that triggered this button
      setTimeout(() => {
        window.addEventListener("mousedown", onMouseDown);
      }, 0);
    });
  }

  /**
   * Resets the scale slider UI to 1.0x.
   */
  public resetScale() {
    this.scaleRange.value = "1";
    this.scaleValue.textContent = "1.0x";
  }

  /**
   * Populates the animation and state dropdown lists based on the current agent's definition.
   */
  public populateLists() {
    const agent = this.state.currentAgent;
    if (!agent) return;

    // Populate animations
    this.animationSelect.innerHTML = "";
    const animNames = agent.animations().sort();
    animNames.forEach((animName) => {
      const option = document.createElement("option");
      option.value = animName;
      option.textContent = animName;
      this.animationSelect.appendChild(option);
    });

    // Populate states
    this.stateSelect.innerHTML = "";
    const stateNames = Object.keys(agent.definition.states).sort();
    stateNames.forEach((stateName) => {
      const option = document.createElement("option");
      option.value = stateName;
      option.textContent = stateName;
      if (stateName === "IdlingLevel1") option.selected = true;
      this.stateSelect.appendChild(option);
    });
  }

  /**
   * Disables or enables all controls in the tab.
   *
   * @param enabled - Whether the controls should be interactive.
   */
  public setEnabled(enabled: boolean) {
    this.playBtn.disabled = !enabled;
    this.play5sBtn.disabled = !enabled;
    this.playLoopedBtn.disabled = !enabled;
    this.randomBtn.disabled = !enabled;
    this.gestureLeftBtn.disabled = !enabled;
    this.gestureRightBtn.disabled = !enabled;
    this.gestureUpBtn.disabled = !enabled;
    this.gestureDownBtn.disabled = !enabled;
    this.moveToMouseBtn.disabled = !enabled;

    if (!enabled) {
      this.playLoopedBtn.textContent = "Play looped";
    }
  }

  /**
   * Returns the current value of the scale slider.
   *
   * @returns The selected scale factor.
   */
  public getScale(): number {
    return parseFloat(this.scaleRange.value);
  }
}
