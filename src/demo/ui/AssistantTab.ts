import { BaseTab } from "./BaseTab";
import { DemoState } from "../state";
import { Agent } from "../../Agent";
import { AGENTS } from "../constants";
import { getBestMatchingInfo } from "../utils";
import { LoadingWindow } from "./LoadingWindow";

/**
 * The 'Assistant' tab handles the character gallery and initial selection.
 * It manages a low-scale preview agent that plays a 'Wave' animation.
 */
export class AssistantTab extends BaseTab {
  private previewContainer: HTMLDivElement;
  private galleryAgentName: HTMLHeadingElement;
  private galleryAgentDescription: HTMLParagraphElement;
  private galleryAgentQuote: HTMLDivElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private selectBtn: HTMLButtonElement;

  private onAgentSelected: (name: string) => Promise<void>;

  /**
   * Initializes the Assistant tab.
   *
   * @param state - Global application state.
   * @param onAgentSelected - Callback triggered when the 'Select' button is clicked.
   */
  constructor(state: DemoState, onAgentSelected: (name: string) => Promise<void>) {
    super("panel-assistant", state);
    this.previewContainer = document.getElementById("gallery-preview-container") as HTMLDivElement;
    this.galleryAgentName = document.getElementById("gallery-agent-name") as HTMLHeadingElement;
    this.galleryAgentDescription = document.getElementById("gallery-agent-description") as HTMLParagraphElement;
    this.galleryAgentQuote = document.getElementById("gallery-agent-quote") as HTMLDivElement;
    this.prevBtn = document.getElementById("prev-agent-btn") as HTMLButtonElement;
    this.nextBtn = document.getElementById("next-agent-btn") as HTMLButtonElement;
    this.selectBtn = document.getElementById("select-btn") as HTMLButtonElement;
    this.onAgentSelected = onAgentSelected;
  }

  /**
   * Sets up event listeners for gallery navigation and agent selection.
   */
  public init() {
    this.prevBtn.addEventListener("click", () => {
      this.state.currentGalleryIndex = (this.state.currentGalleryIndex - 1 + AGENTS.length) % AGENTS.length;
      this.loadPreviewAgent(this.state.currentGalleryIndex);
    });

    this.nextBtn.addEventListener("click", () => {
      this.state.currentGalleryIndex = (this.state.currentGalleryIndex + 1) % AGENTS.length;
      this.loadPreviewAgent(this.state.currentGalleryIndex);
    });

    this.selectBtn.addEventListener("click", async () => {
      const agentName = AGENTS[this.state.currentGalleryIndex].name;
      await this.onAgentSelected(agentName);
    });

    // Load the first preview on startup
    this.loadPreviewAgent(this.state.currentGalleryIndex);
  }

  /**
   * Loads a preview version of the agent into the gallery.
   * Uses a separate AbortController to allow cancelling if the user navigates quickly.
   *
   * @param index - The index of the agent in the `AGENTS` constant array.
   */
  public async loadPreviewAgent(index: number) {
    if (this.state.previewAbortController) {
      this.state.previewAbortController.abort();
    }
    this.state.previewAbortController = new AbortController();

    if (this.state.previewAgent) {
      this.state.previewAgent.destroy();
      this.state.setPreviewAgent(null);
    }
    this.previewContainer.innerHTML = "";

    const agentMeta = AGENTS[index];
    this.galleryAgentName.textContent = "Loading...";
    this.galleryAgentDescription.textContent = "Please wait while the agent loads.";
    this.galleryAgentQuote.textContent = "...";

    const loadingUI = new LoadingWindow(agentMeta.name, this.state.previewAbortController);

    const wrapper = document.createElement("div");
    this.previewContainer.appendChild(wrapper);

    try {
      const baseUrl = import.meta.env.BASE_URL;
      const agentsPath = `${baseUrl}/agents/${agentMeta.name}`.replace(/\/+/g, "/");
      const previewAgent = await Agent.load(agentMeta.name, {
        baseUrl: agentsPath,
        scale: 1,
        container: wrapper,
        fixed: false,
        useAudio: false,
        x: 0,
        y: 0,
        signal: this.state.previewAbortController.signal,
        onProgress: (progress) => loadingUI.update(progress),
      });
      this.state.setPreviewAgent(previewAgent);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to load preview agent:", error);
        this.galleryAgentName.textContent = "Error";
        this.galleryAgentDescription.textContent = "Failed to load agent metadata.";
      }
    } finally {
      loadingUI.destroy();
    }

    if (!this.state.previewAgent) return;

    const info = getBestMatchingInfo(this.state.previewAgent.definition.character.infos);
    this.galleryAgentName.textContent = info.name;
    this.galleryAgentDescription.textContent = info.description;

    if (info.greetings && info.greetings.length > 0) {
      const randomGreeting = info.greetings[Math.floor(Math.random() * info.greetings.length)];
      this.galleryAgentQuote.textContent = randomGreeting;
    } else {
      this.galleryAgentQuote.textContent = "Hello!";
    }

    if (this.state.previewAgent.hasAnimation("Wave")) {
      this.state.previewAgent.play("Wave", undefined, false, true);
    }
  }

  /**
   * Externally updates the name and description labels if the active agent changes.
   *
   * @param name - The localized name of the agent.
   * @param description - The localized description of the agent.
   */
  public updateAgentLabels(name: string, description: string) {
    this.galleryAgentName.textContent = name;
    this.galleryAgentDescription.textContent = description;
  }
}
