import { BaseTab } from "./BaseTab";
import { DemoState } from "../state";

/**
 * The 'Speech' tab panel.
 * Handles Text-to-Speech (TTS) configuration and interactive 'Ask' dialogs.
 */
export class SpeechTab extends BaseTab {
  private voiceSelect: HTMLSelectElement;
  private volumeRange: HTMLInputElement;
  private volumeValue: HTMLSpanElement;
  private pitchRange: HTMLInputElement;
  private pitchValue: HTMLSpanElement;
  private rateRange: HTMLInputElement;
  private rateValue: HTMLSpanElement;

  private speakBtn: HTMLButtonElement;
  private askBtn: HTMLButtonElement;
  private askOptionsBtn: HTMLButtonElement;
  private askStyleSelect: HTMLSelectElement;
  private speakTextInput: HTMLTextAreaElement;
  private skipTypingCheck: HTMLInputElement;
  private speakAnimationSelect: HTMLSelectElement;

  /**
   * Initializes the Speech tab.
   *
   * @param state - Global application state.
   */
  constructor(state: DemoState) {
    super("panel-speech", state);
    this.voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
    this.volumeRange = document.getElementById("volume-range") as HTMLInputElement;
    this.volumeValue = document.getElementById("volume-value") as HTMLSpanElement;
    this.pitchRange = document.getElementById("pitch-range") as HTMLInputElement;
    this.pitchValue = document.getElementById("pitch-value") as HTMLSpanElement;
    this.rateRange = document.getElementById("rate-range") as HTMLInputElement;
    this.rateValue = document.getElementById("rate-value") as HTMLSpanElement;

    this.speakBtn = document.getElementById("speak-btn") as HTMLButtonElement;
    this.askBtn = document.getElementById("ask-btn") as HTMLButtonElement;
    this.askOptionsBtn = document.getElementById("ask-options-btn") as HTMLButtonElement;
    this.askStyleSelect = document.getElementById("ask-style-select") as HTMLSelectElement;
    this.speakTextInput = document.getElementById("speak-text") as HTMLTextAreaElement;
    this.skipTypingCheck = document.getElementById("skip-typing-check") as HTMLInputElement;
    this.speakAnimationSelect = document.getElementById("speak-animation-select") as HTMLSelectElement;
  }

  /**
   * Binds UI event listeners for TTS settings and speech buttons.
   */
  public init() {
    this.voiceSelect.addEventListener("change", () => this.updateTTSOptions());
    this.volumeRange.addEventListener("input", () => this.updateTTSOptions());
    this.pitchRange.addEventListener("input", () => this.updateTTSOptions());
    this.rateRange.addEventListener("input", () => this.updateTTSOptions());

    // Update voice list when voices are loaded
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.updateVoiceList();
      };
    }

    this.speakBtn.addEventListener("click", () => {
      this.state.currentAgent?.speak(this.speakTextInput.value, {
        skipTyping: this.skipTypingCheck.checked,
        animation: this.speakAnimationSelect.value || undefined,
      });
    });

    this.askBtn.addEventListener("click", async () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      const result = await agent.ask({
        title: "What is your next move?",
        content: [
          "Please provide a reason for your action:",
          { type: "input", placeholder: "Type a reason..." },
          { type: "checkbox", label: "Save to history", checked: true },
        ],
        buttons: [
          { label: "Ask", value: "Ask", bullet: "bullet" },
          { label: "Cancel", value: null },
        ],
      });

      if (result !== null) {
        let msg = `Button: ${result.value}`;
        if (result.text) msg += `, Input: ${result.text}`;
        if (result.checked !== null) msg += `, Checked: ${result.checked}`;
        agent.speak(msg, {
          skipTyping: this.skipTypingCheck.checked,
        });
      } else {
        agent.speak("Cancelled.", {
          skipTyping: this.skipTypingCheck.checked,
        });
      }
    });

    this.askOptionsBtn.addEventListener("click", async () => {
      const agent = this.state.currentAgent;
      if (!agent) return;
      const choices = [
        "I'm doing great!",
        "Not too bad.",
        "Could be better.",
        "A bit tired, honestly.",
        "Ready for some fun!",
      ];
      const result = await agent.ask({
        title: "How are you today?",
        content: [
          {
            type: "choices",
            items: choices,
            style: this.askStyleSelect.value as "bullet" | "bulb",
          },
        ],
        buttons: [{ label: "Cancel", value: null }],
      });

      if (result !== null) {
        if (typeof result.value === "number") {
          agent.speak(`You chose: ${choices[result.value]}`, {
            skipTyping: this.skipTypingCheck.checked,
          });
        } else {
          agent.speak(`You clicked: ${result.value}`, {
            skipTyping: this.skipTypingCheck.checked,
          });
        }
      } else {
        agent.speak("Cancelled.", {
          skipTyping: this.skipTypingCheck.checked,
        });
      }
    });
  }

  /**
   * Updates the voice dropdown list from the available system TTS voices.
   */
  public updateVoiceList() {
    const agent = this.state.currentAgent;
    if (!agent) return;

    const voices = agent.getTTSVoices();
    const currentVoice = this.voiceSelect.value;
    this.voiceSelect.innerHTML = "";

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === currentVoice) {
        option.selected = true;
      }
      this.voiceSelect.appendChild(option);
    });
  }

  /**
   * Reads settings from the UI and updates the current agent's TTS configuration.
   */
  public updateTTSOptions() {
    const agent = this.state.currentAgent;
    if (!agent) return;

    const voices = agent.getTTSVoices();
    const selectedVoice = voices.find((v) => v.name === this.voiceSelect.value);

    const volume = parseFloat(this.volumeRange.value);
    const pitch = parseFloat(this.pitchRange.value);
    const rate = parseFloat(this.rateRange.value);

    this.volumeValue.textContent = volume.toFixed(1);
    this.pitchValue.textContent = pitch.toFixed(1);
    this.rateValue.textContent = rate.toFixed(1);

    agent.setTTSOptions({
      voice: selectedVoice,
      volume,
      pitch,
      rate,
    });
  }

  /**
   * Disables or enables the speech interaction buttons.
   *
   * @param enabled - Whether the buttons should be active.
   */
  public setEnabled(enabled: boolean) {
    this.speakBtn.disabled = !enabled;
    this.askBtn.disabled = !enabled;
    this.askOptionsBtn.disabled = !enabled;

    if (enabled && this.state.currentAgent) {
      this.populateAnimationList();
    }
  }

  /**
   * Populates the animation dropdown with available animations.
   */
  private populateAnimationList() {
    const agent = this.state.currentAgent;
    if (!agent) return;

    const animations = agent.animations().sort();
    const currentValue = this.speakAnimationSelect.value;
    this.speakAnimationSelect.innerHTML = '<option value="">(Default)</option>';

    animations.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      if (name === currentValue) {
        option.selected = true;
      }
      this.speakAnimationSelect.appendChild(option);
    });
  }
}
