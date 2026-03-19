import "./style.css";
import { Agent } from "../Agent";
import type { Info } from "../core/base/types";

const AGENTS = [
  { name: "Clippit" },
  { name: "DOT" },
  { name: "F1" },
  { name: "GENIUS" },
  { name: "LOGO" },
  { name: "MNATURE" },
  { name: "Monkey King" },
  { name: "OFFCAT" },
  { name: "ROCKY" },
];

function getBestMatchingInfo(infos: Info[]): Info {
  const userLocales = navigator.languages || [navigator.language];

  for (const userLocale of userLocales) {
    const normalizedUserLocale = userLocale.toLowerCase();

    // Exact match (e.g. en-US === en-us)
    const exactMatch = infos.find((info) => info.locale?.baseName?.toLowerCase() === normalizedUserLocale);
    if (exactMatch) return exactMatch;

    // Language-only match (e.g. "en" matches "en-US")
    const userLang = normalizedUserLocale.split("-")[0];
    const langMatch = infos.find((info) => info.locale?.language?.toLowerCase() === userLang);
    if (langMatch) return langMatch;
  }

  // Fallback to English (0x0409 or 0x0009)
  const englishMatch = infos.find((info) => info.languageCode === "0x0409" || info.languageCode === "0x0009");
  if (englishMatch) return englishMatch;

  // Last resort: first available
  return infos[0];
}

async function initDemo() {
  // DOM Elements
  const previewContainer = document.getElementById("gallery-preview-container") as HTMLDivElement;
  const galleryAgentName = document.getElementById("gallery-agent-name") as HTMLHeadingElement;
  const galleryAgentDescription = document.getElementById("gallery-agent-description") as HTMLParagraphElement;
  const galleryAgentQuote = document.getElementById("gallery-agent-quote") as HTMLDivElement;
  const prevBtn = document.getElementById("prev-agent-btn") as HTMLButtonElement;
  const nextBtn = document.getElementById("next-agent-btn") as HTMLButtonElement;

  const scaleRange = document.getElementById("scale-range") as HTMLInputElement;
  const scaleValue = document.getElementById("scale-value") as HTMLSpanElement;
  const animationSelect = document.getElementById("animation-select") as HTMLSelectElement;
  const stateSelect = document.getElementById("state-select") as HTMLSelectElement;
  const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
  const play5sBtn = document.getElementById("play-5s-btn") as HTMLButtonElement;
  const playLoopedBtn = document.getElementById("play-looped-btn") as HTMLButtonElement;
  const randomBtn = document.getElementById("random-btn") as HTMLButtonElement;
  const visibilityBtn = document.getElementById("visibility-btn") as HTMLButtonElement;
  const startStopBtn = document.getElementById("start-stop-btn") as HTMLButtonElement;
  const selectBtn = document.getElementById("select-btn") as HTMLButtonElement;
  const speakBtn = document.getElementById("speak-btn") as HTMLButtonElement;
  const askBtn = document.getElementById("ask-btn") as HTMLButtonElement;
  const askOptionsBtn = document.getElementById("ask-options-btn") as HTMLButtonElement;
  const askStyleSelect = document.getElementById("ask-style-select") as HTMLSelectElement;
  const speakTextInput = document.getElementById("speak-text") as HTMLTextAreaElement;
  const skipTypingCheck = document.getElementById("skip-typing-check") as HTMLInputElement;

  const voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
  const volumeRange = document.getElementById("volume-range") as HTMLInputElement;
  const volumeValue = document.getElementById("volume-value") as HTMLSpanElement;
  const pitchRange = document.getElementById("pitch-range") as HTMLInputElement;
  const pitchValue = document.getElementById("pitch-value") as HTMLSpanElement;
  const rateRange = document.getElementById("rate-range") as HTMLInputElement;
  const rateValue = document.getElementById("rate-value") as HTMLSpanElement;

  const gestureLeftBtn = document.getElementById("gesture-left-btn") as HTMLButtonElement;
  const gestureRightBtn = document.getElementById("gesture-right-btn") as HTMLButtonElement;
  const gestureUpBtn = document.getElementById("gesture-up-btn") as HTMLButtonElement;
  const gestureDownBtn = document.getElementById("gesture-down-btn") as HTMLButtonElement;
  const moveToMouseBtn = document.getElementById("move-to-mouse-btn") as HTMLButtonElement;

  const dashState = document.getElementById("dash-state")!;
  const dashAnim = document.getElementById("dash-anim")!;
  const dashFrame = document.getElementById("dash-frame")!;
  const dashLevel = document.getElementById("dash-level")!;
  const dashNextTick = document.getElementById("dash-next-tick")!;
  const dashQueue = document.getElementById("dash-queue")!;
  const dashPos = document.getElementById("dash-pos")!;

  let currentAgent: Agent | null = null;
  let previewAgent: Agent | null = null;
  let isVisible = true;
  let loadAbortController: AbortController | null = null;
  let previewAbortController: AbortController | null = null;
  let currentGalleryIndex = 0;
  let tourWelcomeShown = false;

  function createLoadingWindow(name: string, abortController: AbortController) {
    const progressWindow = document.createElement("div");
    progressWindow.className = "window loading-window";
    progressWindow.style.position = "fixed";
    progressWindow.style.left = "50%";
    progressWindow.style.top = "50%";
    progressWindow.style.transform = "translate(-50%, -50%)";
    progressWindow.style.width = "300px";
    progressWindow.style.zIndex = "10000";
    progressWindow.innerHTML = `
          <div class="title-bar">
            <div class="title-bar-text">Loading ${name}...</div>
          </div>
          <div class="window-body">
            <p id="loading-status">Starting download...</p>
            <div id="loading-progress-container" class="progress-indicator">
              <span id="loading-progress-bar" class="progress-indicator-bar" style="width: 0%"></span>
            </div>
            <div class="field-row" style="justify-content: flex-end; margin-top: 10px;">
              <button id="cancel-load-btn">Cancel</button>
            </div>
          </div>
        `;
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.1)";
    overlay.style.zIndex = "9999";

    document.body.appendChild(overlay);
    document.body.appendChild(progressWindow);

    const loadingStatus = progressWindow.querySelector("#loading-status") as HTMLParagraphElement;
    const loadingProgressContainer = progressWindow.querySelector("#loading-progress-container") as HTMLDivElement;
    const loadingProgressBar = progressWindow.querySelector("#loading-progress-bar") as HTMLSpanElement;
    const cancelBtn = progressWindow.querySelector("#cancel-load-btn") as HTMLButtonElement;

    cancelBtn.onclick = () => {
      abortController.abort();
    };

    return {
      update: (progress: { loaded: number; total: number; filename: string }) => {
        loadingStatus.textContent = `Downloading ${progress.filename}...`;
        if (progress.total > 0) {
          loadingProgressContainer.classList.remove("segmented");
          const percent = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
          loadingProgressBar.style.width = `${percent}%`;
        } else {
          loadingProgressContainer.classList.add("segmented");
          loadingProgressBar.style.width = "100%";
        }
      },
      destroy: () => {
        document.body.removeChild(progressWindow);
        document.body.removeChild(overlay);
      },
    };
  }

  async function loadPreviewAgent(index: number) {
    if (previewAbortController) {
      previewAbortController.abort();
    }
    previewAbortController = new AbortController();

    if (previewAgent) {
      previewAgent.destroy();
      previewAgent = null;
    }
    previewContainer.innerHTML = "";

    const agentMeta = AGENTS[index];
    galleryAgentName.textContent = "Loading...";
    galleryAgentDescription.textContent = "Please wait while the agent loads.";
    galleryAgentQuote.textContent = "...";

    const loadingUI = createLoadingWindow(agentMeta.name, previewAbortController);

    const wrapper = document.createElement("div");
    previewContainer.appendChild(wrapper);

    try {
      const baseUrl = import.meta.env.BASE_URL;
      const agentsPath = `${baseUrl}/agents/${agentMeta.name}`.replace(/\/+/g, "/");
      previewAgent = await Agent.load(agentMeta.name, {
        baseUrl: agentsPath,
        scale: 1,
        container: wrapper,
        fixed: false,
        useAudio: false,
        x: 0,
        y: 0,
        signal: previewAbortController.signal,
        onProgress: (progress) => loadingUI.update(progress),
      });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to load preview agent:", error);
        galleryAgentName.textContent = "Error";
        galleryAgentDescription.textContent = "Failed to load agent metadata.";
      }
    } finally {
      loadingUI.destroy();
    }

    if (!previewAgent) return;

    const info = getBestMatchingInfo(previewAgent.definition.character.infos);
    galleryAgentName.textContent = info.name;
    galleryAgentDescription.textContent = info.description;

    if (info.greetings && info.greetings.length > 0) {
      const randomGreeting = info.greetings[Math.floor(Math.random() * info.greetings.length)];
      galleryAgentQuote.textContent = randomGreeting;
    } else {
      galleryAgentQuote.textContent = "Hello!";
    }

    if (previewAgent.hasAnimation("Wave")) {
      previewAgent.play("Wave", undefined, false, true);
    }
  }

  async function loadAgent(name: string) {
    if (loadAbortController) {
      loadAbortController.abort();
    }
    loadAbortController = new AbortController();

    if (currentAgent) {
      currentAgent.destroy();
      currentAgent = null;
    }

    // Reset UI
    animationSelect.innerHTML = "";
    stateSelect.innerHTML = "";
    playBtn.disabled = true;
    play5sBtn.disabled = true;
    playLoopedBtn.disabled = true;
    playLoopedBtn.textContent = "Play looped";
    randomBtn.disabled = true;
    visibilityBtn.disabled = true;
    speakBtn.disabled = true;
    askBtn.disabled = true;
    askOptionsBtn.disabled = true;
    gestureLeftBtn.disabled = true;
    gestureRightBtn.disabled = true;
    gestureUpBtn.disabled = true;
    gestureDownBtn.disabled = true;
    moveToMouseBtn.disabled = true;

    dashState.textContent = "Loading...";
    dashAnim.textContent = "-";
    dashFrame.textContent = "-";
    dashLevel.textContent = "-";
    dashNextTick.textContent = "-";
    dashQueue.textContent = "-";
    dashPos.textContent = "-";

    const loadingUI = createLoadingWindow(name, loadAbortController);

    try {
      const scale = parseFloat(scaleRange.value);
      const baseUrl = import.meta.env.BASE_URL;
      const agentsPath = `${baseUrl}/agents/${name}`.replace(/\/+/g, "/");
      currentAgent = await Agent.load(name, {
        baseUrl: agentsPath,
        scale: scale,
        useAudio: true,
        signal: loadAbortController.signal,
        onProgress: (progress) => loadingUI.update(progress),
        initialAnimation: "Greeting",
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Agent loading cancelled");
        dashState.textContent = "Cancelled";
      } else {
        console.error("Failed to load agent:", error);
        dashState.textContent = "Error";
        alert("Failed to load agent. See console for details.");
      }
    } finally {
      loadingUI.destroy();
      loadAbortController = null;
    }

    if (!currentAgent) return;

    // Populate animations
    const animNames = currentAgent.animations().sort();
    animNames.forEach((animName) => {
      const option = document.createElement("option");
      option.value = animName;
      option.textContent = animName;
      animationSelect.appendChild(option);
    });

    // Populate states
    const stateNames = Object.keys(currentAgent.definition.states).sort();
    stateNames.forEach((stateName) => {
      const option = document.createElement("option");
      option.value = stateName;
      option.textContent = stateName;
      if (stateName === "IdlingLevel1") option.selected = true;
      stateSelect.appendChild(option);
    });

    updateVoiceList();
    updateTTSOptions();

    const info = getBestMatchingInfo(currentAgent.definition.character.infos);
    galleryAgentName.textContent = info.name;
    galleryAgentDescription.textContent = info.description;

    isVisible = true;
    visibilityBtn.textContent = "Hide";
    startStopBtn.textContent = "Stop";
    (window as any).agent = currentAgent;

    playBtn.disabled = false;
    play5sBtn.disabled = false;
    playLoopedBtn.disabled = false;
    randomBtn.disabled = false;
    visibilityBtn.disabled = false;
    speakBtn.disabled = false;
    askBtn.disabled = false;
    askOptionsBtn.disabled = false;
    gestureLeftBtn.disabled = false;
    gestureRightBtn.disabled = false;
    gestureUpBtn.disabled = false;
    gestureDownBtn.disabled = false;
    moveToMouseBtn.disabled = false;

    // Click to play random animation
    currentAgent.on("click", () => {
      currentAgent?.animate();
    });

    // Context menu event
    currentAgent.on("contextmenu", (data) => {
      console.log("Context menu triggered at", data.x, data.y);
      currentAgent?.speak(`Right-click or long-press at ${data.x}, ${data.y}`);
    });

    // Show tour welcome message
    const skipTourWelcome = localStorage.getItem("msagentjs_skip_tour_welcome") === "true";
    if (!skipTourWelcome && !tourWelcomeShown && currentAgent) {
      tourWelcomeShown = true;
      const result = await currentAgent.ask({
        title: "Welcome to MS Agent JS!",
        content: [
          "Would you like a quick tour of the features?",
          { type: "choices", items: ["I want the tour", "I don't want the tour"] },
          { type: "checkbox", label: "Show this every start", checked: true },
        ],
        timeout: 0, // No timeout for welcome
      });

      if (result) {
        // "Show this every start" means skipTourWelcome should be false if checked.
        // If checked is false, it means user UNCHECKED "Show this every start", so we skip next time.
        localStorage.setItem("msagentjs_skip_tour_welcome", (!result.checked).toString());

        if (result.value === 0) {
          const introResult = await currentAgent.ask({
            content: ["Alright! MS Agent JS is a modern, TypeScript-based implementation of Microsoft Agent, bringing the charm of Clippy and friends back to the web. Let me show you around!"],
            buttons: ["OK"],
            timeout: 0,
          });
          if (introResult) {
            await runTour(currentAgent);
          }
        }
      }
    }
  }

  // Gallery Navigation
  prevBtn.addEventListener("click", () => {
    currentGalleryIndex = (currentGalleryIndex - 1 + AGENTS.length) % AGENTS.length;
    loadPreviewAgent(currentGalleryIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentGalleryIndex = (currentGalleryIndex + 1) % AGENTS.length;
    loadPreviewAgent(currentGalleryIndex);
  });

  scaleRange.addEventListener("input", () => {
    const scale = parseFloat(scaleRange.value);
    scaleValue.textContent = `${scale.toFixed(1)}x`;
    currentAgent?.setScale(scale);
  });

  playBtn.addEventListener("click", () => {
    currentAgent?.play(animationSelect.value);
  });

  play5sBtn.addEventListener("click", () => {
    currentAgent?.play(animationSelect.value, 5000);
  });

  playLoopedBtn.addEventListener("click", async () => {
    if (!currentAgent) return;

    if (playLoopedBtn.textContent === "Stop") {
      currentAgent.stop();
      playLoopedBtn.textContent = "Play looped";
      return;
    }

    playLoopedBtn.textContent = "Stop";
    const req = currentAgent.play(animationSelect.value, undefined, false, true);

    // Reset button text when animation ends
    try {
      await req;
    } finally {
      if (playLoopedBtn.textContent === "Stop") {
        playLoopedBtn.textContent = "Play looped";
      }
    }
  });

  randomBtn.addEventListener("click", () => {
    currentAgent?.animate();
  });

  stateSelect.addEventListener("change", () => {
    currentAgent?.setState(stateSelect.value);
  });

  visibilityBtn.addEventListener("click", async () => {
    if (!currentAgent) return;

    visibilityBtn.disabled = true;
    isVisible = !isVisible;

    if (isVisible) {
      await currentAgent.show();
      visibilityBtn.textContent = "Hide";
    } else {
      await currentAgent.hide();
      visibilityBtn.textContent = "Show";
    }

    visibilityBtn.disabled = false;
  });

  async function stopAgent() {
    if (!currentAgent) return;

    startStopBtn.disabled = true;
    playBtn.disabled = true;
    play5sBtn.disabled = true;
    playLoopedBtn.disabled = true;
    randomBtn.disabled = true;
    visibilityBtn.disabled = true;
    speakBtn.disabled = true;
    askBtn.disabled = true;
    askOptionsBtn.disabled = true;
    gestureLeftBtn.disabled = true;
    gestureRightBtn.disabled = true;
    gestureUpBtn.disabled = true;
    gestureDownBtn.disabled = true;
    moveToMouseBtn.disabled = true;

    if (currentAgent.hasAnimation("GoodBye")) {
      await currentAgent.hide("GoodBye");
    } else if (currentAgent.hasAnimation("Goodbye")) {
      await currentAgent.hide("Goodbye");
    } else {
      await currentAgent.hide();
    }

    currentAgent.destroy();
    currentAgent = null;
    (window as any).agent = null;

    startStopBtn.textContent = "Start";
    startStopBtn.disabled = false;
    dashState.textContent = "Stopped";
  }

  startStopBtn.addEventListener("click", async () => {
    if (startStopBtn.textContent?.trim() === "Start") {
      await loadAgent(AGENTS[currentGalleryIndex].name);
    } else {
      await stopAgent();
    }
  });

  selectBtn.addEventListener("click", async () => {
    await loadAgent(AGENTS[currentGalleryIndex].name);
  });

  function updateVoiceList() {
    if (!currentAgent) return;
    const voices = currentAgent.getTTSVoices();
    const currentVoice = voiceSelect.value;
    voiceSelect.innerHTML = "";

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === currentVoice) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  }

  function updateTTSOptions() {
    if (!currentAgent) return;

    const voices = currentAgent.getTTSVoices();
    const selectedVoice = voices.find((v) => v.name === voiceSelect.value);

    const volume = parseFloat(volumeRange.value);
    const pitch = parseFloat(pitchRange.value);
    const rate = parseFloat(rateRange.value);

    volumeValue.textContent = volume.toFixed(1);
    pitchValue.textContent = pitch.toFixed(1);
    rateValue.textContent = rate.toFixed(1);

    currentAgent.setTTSOptions({
      voice: selectedVoice,
      volume,
      pitch,
      rate,
    });
  }

  // Update voice list when voices are loaded
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      updateVoiceList();
    };
  }

  voiceSelect.addEventListener("change", updateTTSOptions);
  volumeRange.addEventListener("input", updateTTSOptions);
  pitchRange.addEventListener("input", updateTTSOptions);
  rateRange.addEventListener("input", updateTTSOptions);

  speakBtn.addEventListener("click", () => {
    currentAgent?.speak(speakTextInput.value, {
      skipTyping: skipTypingCheck.checked,
    });
  });

  askBtn.addEventListener("click", async () => {
    if (!currentAgent) return;
    const result = await currentAgent.ask({
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
      currentAgent.speak(msg, {
        skipTyping: skipTypingCheck.checked,
      });
    } else {
      currentAgent.speak("Cancelled.", {
        skipTyping: skipTypingCheck.checked,
      });
    }
  });

  askOptionsBtn.addEventListener("click", async () => {
    if (!currentAgent) return;
    const choices = ["I'm doing great!", "Not too bad.", "Could be better."];
    const result = await currentAgent.ask({
      title: "How are you today?",
      content: [
        {
          type: "choices",
          items: choices,
          style: askStyleSelect.value as "bullet" | "bulb",
        },
      ],
      buttons: [{ label: "Cancel", value: null }],
    });

    if (result !== null) {
      if (typeof result.value === "number") {
        currentAgent.speak(`You chose: ${choices[result.value]}`, {
          skipTyping: skipTypingCheck.checked,
        });
      } else {
        currentAgent.speak(`You clicked: ${result.value}`, {
          skipTyping: skipTypingCheck.checked,
        });
      }
    } else {
      currentAgent.speak("Cancelled.", {
        skipTyping: skipTypingCheck.checked,
      });
    }
  });

  gestureLeftBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(currentAgent.options.x - 100, currentAgent.options.y + 50);
  });
  gestureRightBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x + currentAgent.spriteManager.getSpriteWidth() * currentAgent.options.scale + 100,
      currentAgent.options.y + 50,
    );
  });
  gestureUpBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(currentAgent.options.x + 50, currentAgent.options.y - 100);
  });
  gestureDownBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x + 50,
      currentAgent.options.y + currentAgent.spriteManager.getSpriteHeight() * currentAgent.options.scale + 100,
    );
  });

  moveToMouseBtn.addEventListener("click", () => {
    if (!currentAgent) {
      moveToMouseBtn.disabled = true;
      return;
    }

    moveToMouseBtn.disabled = true;
    const originalText = moveToMouseBtn.textContent;
    moveToMouseBtn.textContent = "Click on page to move";

    const onMouseDown = (e: MouseEvent) => {
      if (!currentAgent) return;
      const targetX = e.clientX - (currentAgent.definition.character.width * currentAgent.options.scale) / 2;
      const targetY = e.clientY - (currentAgent.definition.character.height * currentAgent.options.scale) / 2;

      currentAgent.moveTo(targetX, targetY);

      window.removeEventListener("mousedown", onMouseDown);
      moveToMouseBtn.disabled = false;
      moveToMouseBtn.textContent = originalText;
    };
    // Use setTimeout to avoid capturing the current click that triggered this button
    setTimeout(() => {
      window.addEventListener("mousedown", onMouseDown);
    }, 0);
  });

  // Update Loop for Debug Info
  function updateDebug() {
    if (currentAgent && currentAgent.stateManager && currentAgent.animationManager) {
      dashState.textContent = currentAgent.stateManager.currentStateName;
      dashAnim.textContent = currentAgent.animationManager.currentAnimationName || "-";
      dashFrame.textContent = currentAgent.animationManager.currentFrameIndexValue.toString();
      dashLevel.textContent = currentAgent.stateManager.idleLevel.toString();
      dashNextTick.textContent = (currentAgent.stateManager.timeUntilNextTick / 1000).toFixed(1);

      const activeId = currentAgent.requestQueue.activeRequestId;
      const length = currentAgent.requestQueue.length;
      dashQueue.textContent = activeId ? `ID:${activeId} (+${length})` : "Empty";

      dashPos.textContent = `X:${Math.round(currentAgent.options.x)}, Y:${Math.round(currentAgent.options.y)}`;
    }
    requestAnimationFrame(updateDebug);
  }

  // Tab Switching Logic
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

  async function runTour(agent: Agent) {
    const tabs = [
      { id: "tab-assistant", text: "In the Assistant tab, you can browse and select different characters from the gallery. Each agent has its own unique personality and animations!" },
      { id: "tab-animation", text: "The Animation tab allows you to control the agent's actions. You can change its scale, play specific animations, or switch between different behavioral states." },
      { id: "tab-speech", text: "The Speech tab is where you can make the agent talk! You can use Text-to-Speech with various voice settings, or use interactive 'Ask' dialogs." },
    ];

    const controlPanel = document.querySelector(".control-panel") as HTMLElement;
    const debugWindow = document.querySelector(".debug-window") as HTMLElement;

    const agentW = agent.definition.character.width * agent.options.scale;
    const agentH = agent.definition.character.height * agent.options.scale;

    const moveToBottomRight = async (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      // Center of agent at bottom right corner
      await agent.moveTo(rect.right + scrollX - agentW / 2, rect.bottom + scrollY - agentH / 2);
    };

    for (const tabInfo of tabs) {
      const tabEl = document.getElementById(tabInfo.id);
      if (tabEl) {
        const rect = tabEl.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        // On the right side of the tab (agent's center aligned to tab's right edge)
        const targetX = rect.right + scrollX - agentW / 2;
        const targetY = rect.top + scrollY + rect.height / 2 - agentH / 2;

        await agent.moveTo(targetX, targetY);
        tabEl.click();
        await agent.delay(500);

        await moveToBottomRight(controlPanel);
        const result = await agent.ask({
          content: [tabInfo.text],
          buttons: ["OK"],
          timeout: 0,
        });
        if (!result) return;
      }
    }

    // Debug window
    const dwRect = debugWindow.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    // On the right of the window, not obscuring it
    await agent.moveTo(dwRect.right + scrollX + 20, dwRect.top + scrollY + dwRect.height / 2 - agentH / 2);

    await agent.ask({
      content: ["Finally, the Debug Info window shows real-time data about the agent's internal state, current animation, and position."],
      buttons: ["OK"],
      timeout: 0,
    });

    agent.speak("That's the end of the tour! Have fun exploring!");
  }

  // Start
  updateDebug();
  loadPreviewAgent(currentGalleryIndex);
}

initDemo();
