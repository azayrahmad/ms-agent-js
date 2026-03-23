import "./style.css";
import { Agent } from "../Agent";
import { DemoState } from "./state";
import { AGENTS } from "./constants";
import { getBestMatchingInfo } from "./utils";
import { LoadingWindow } from "./ui/LoadingWindow";
import { AboutTab } from "./ui/AboutTab";
import { AssistantTab } from "./ui/AssistantTab";
import { AnimationTab } from "./ui/AnimationTab";
import { SpeechTab } from "./ui/SpeechTab";
import { DebugPanel } from "./ui/DebugPanel";
import { TourManager } from "./TourManager";
import { HelpManager } from "./HelpManager";

/**
 * Main application class for the MS Agent JS Demo.
 */
class DemoApp {
  private state: DemoState;
  private aboutTab: AboutTab;
  private assistantTab: AssistantTab;
  private animationTab: AnimationTab;
  private speechTab: SpeechTab;
  private debugPanel: DebugPanel;

  constructor() {
    this.state = new DemoState();

    this.aboutTab = new AboutTab(
      this.state,
      () => this.toggleAgent(),
      () => this.checkTourWelcome(true)
    );
    this.assistantTab = new AssistantTab(this.state, (name) => this.loadAgent(name));
    this.animationTab = new AnimationTab(this.state);
    this.speechTab = new SpeechTab(this.state);
    this.debugPanel = new DebugPanel(this.state);
  }

  /**
   * Initializes the application.
   */
  public async init() {
    this.aboutTab.init();
    this.assistantTab.init();
    this.animationTab.init();
    this.speechTab.init();

    this.setupTabSwitching();
    this.startDebugLoop();
  }

  /**
   * Toggles the current agent between started and stopped.
   */
  private async toggleAgent() {
    if (this.state.currentAgent) {
      await this.stopAgent();
    } else {
      const agentName = AGENTS[this.state.currentGalleryIndex].name;
      await this.loadAgent(agentName);
    }
  }

  /**
   * Loads a specific agent into the demo.
   */
  private async loadAgent(name: string) {
    if (this.state.loadAbortController) {
      this.state.loadAbortController.abort();
    }
    this.state.loadAbortController = new AbortController();

    this.state.setCurrentAgent(null);

    // Reset UI state
    this.animationTab.setEnabled(false);
    this.speechTab.setEnabled(false);
    this.debugPanel.setStatus("Loading...");

    const loadingUI = new LoadingWindow(name, this.state.loadAbortController);

    try {
      const scale = this.animationTab.getScale();
      const baseUrl = import.meta.env.BASE_URL;
      const agentsPath = `${baseUrl}/agents/${name}`.replace(/\/+/g, "/");
      const agent = await Agent.load(name, {
        baseUrl: agentsPath,
        scale: scale,
        useAudio: true,
        signal: this.state.loadAbortController.signal,
        onProgress: (progress) => loadingUI.update(progress),
        initialAnimation: "Greeting",
      });
      this.state.setCurrentAgent(agent);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Agent loading cancelled");
        this.debugPanel.setStatus("Cancelled");
      } else {
        console.error("Failed to load agent:", error);
        this.debugPanel.setStatus("Error");
        alert("Failed to load agent. See console for details.");
      }
    } finally {
      loadingUI.destroy();
      this.state.loadAbortController = null;
    }

    const currentAgent = this.state.currentAgent;
    if (!currentAgent) return;

    // Update UI for the newly loaded agent
    this.animationTab.populateLists();
    this.speechTab.updateVoiceList();
    this.speechTab.updateTTSOptions();

    const info = getBestMatchingInfo(currentAgent.definition.character.infos);
    this.assistantTab.updateAgentLabels(info.name, info.description);

    this.state.isVisible = true;
    this.aboutTab.updateButtonState(true);
    this.aboutTab.updateVisibilityState(true);

    this.animationTab.setEnabled(true);
    this.speechTab.setEnabled(true);

    // Bind event listeners
    currentAgent.on("click", () => {
      currentAgent.animate();
    });

    currentAgent.on("contextmenu", (data) => {
      console.log("Context menu triggered at", data.x, data.y);
      currentAgent.speak(`Right-click or long-press at ${data.x}, ${data.y}`);
    });

    // Check for tour welcome
    await this.checkTourWelcome();
  }

  /**
   * Stops the current agent and cleans up.
   */
  private async stopAgent() {
    const agent = this.state.currentAgent;
    if (!agent) return;

    this.animationTab.setEnabled(false);
    this.speechTab.setEnabled(false);

    if (agent.hasAnimation("GoodBye")) {
      await agent.hide("GoodBye");
    } else if (agent.hasAnimation("Goodbye")) {
      await agent.hide("Goodbye");
    } else {
      await agent.hide();
    }

    this.state.setCurrentAgent(null);
    this.aboutTab.updateButtonState(false);
    this.debugPanel.setStatus("Stopped");
  }

  /**
   * Checks if the tour welcome message should be displayed.
   * @param force - If true, the welcome message is shown regardless of previous preference.
   */
  private async checkTourWelcome(force = false) {
    const agent = this.state.currentAgent;
    if (!agent) return;

    const skipTourWelcome = localStorage.getItem("msagentjs_skip_tour_welcome") === "true";
    if (force || (!skipTourWelcome && !this.state.tourWelcomeShown)) {
      if (!force) this.state.tourWelcomeShown = true;
      const result = await agent.ask({
        title: "Welcome to MS Agent JS!",
        content: [
          "Would you like a quick tour of the features, or do you have specific questions about using the library?",
          {
            type: "choices",
            items: ["I want the tour", "I have questions (Help)", "I'm fine, thanks"],
          },
          { type: "checkbox", label: "Show this every start", checked: true },
        ],
        timeout: 0,
      });

      if (result) {
        localStorage.setItem("msagentjs_skip_tour_welcome", (!result.checked).toString());

        if (result.value === 0) {
          const introResult = await agent.ask({
            content: [
              "Alright! MS Agent JS is a modern, TypeScript-based implementation of Microsoft Agent, bringing the charm of Clippy and friends back to the web. Let me show you around!",
            ],
            buttons: ["OK"],
            timeout: 0,
          });
          if (introResult) {
            await TourManager.run(agent);
          }
        } else if (result.value === 1) {
          await HelpManager.run(agent);
        }
      }
    }
  }

  /**
   * Sets up the tab switching behavior.
   */
  private setupTabSwitching() {
    const tabs = document.querySelectorAll('li[role="tab"]');
    const panels = document.querySelectorAll('div[role="tabpanel"]');

    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();

        // Deactivate all tabs and panels
        tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
        panels.forEach((p) => p.setAttribute("hidden", ""));

        // Activate selected tab and panel
        tab.setAttribute("aria-selected", "true");
        const panelId = `panel-${tab.id.replace("tab-", "")}`;
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.removeAttribute("hidden");
        }
      });
    });
  }

  /**
   * Starts the debug information update loop.
   */
  private startDebugLoop() {
    const loop = () => {
      this.debugPanel.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Start the demo application
const app = new DemoApp();
app.init();
