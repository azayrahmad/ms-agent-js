import "./style.css";
import { Agent } from "../Agent";

async function initDemo() {
  const agentSelect = document.getElementById(
    "agent-select",
  ) as HTMLSelectElement;
  const scaleRange = document.getElementById("scale-range") as HTMLInputElement;
  const scaleValue = document.getElementById("scale-value") as HTMLSpanElement;
  const animationSelect = document.getElementById(
    "animation-select",
  ) as HTMLSelectElement;
  const stateSelect = document.getElementById(
    "state-select",
  ) as HTMLSelectElement;
  const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
  const play5sBtn = document.getElementById("play-5s-btn") as HTMLButtonElement;
  const playLoopedBtn = document.getElementById(
    "play-looped-btn",
  ) as HTMLButtonElement;
  const randomBtn = document.getElementById("random-btn") as HTMLButtonElement;
  const visibilityBtn = document.getElementById(
    "visibility-btn",
  ) as HTMLButtonElement;
  const exitBtn = document.getElementById("exit-btn") as HTMLButtonElement;
  const speakBtn = document.getElementById("speak-btn") as HTMLButtonElement;
  const askBtn = document.getElementById("ask-btn") as HTMLButtonElement;
  const speakTextInput = document.getElementById(
    "speak-text",
  ) as HTMLInputElement;
  const skipTypingCheck = document.getElementById(
    "skip-typing-check",
  ) as HTMLInputElement;
  const gestureLeftBtn = document.getElementById(
    "gesture-left-btn",
  ) as HTMLButtonElement;
  const gestureRightBtn = document.getElementById(
    "gesture-right-btn",
  ) as HTMLButtonElement;
  const gestureUpBtn = document.getElementById(
    "gesture-up-btn",
  ) as HTMLButtonElement;
  const gestureDownBtn = document.getElementById(
    "gesture-down-btn",
  ) as HTMLButtonElement;
  const moveToMouseBtn = document.getElementById(
    "move-to-mouse-btn",
  ) as HTMLButtonElement;

  const dashState = document.getElementById("dash-state")!;
  const dashAnim = document.getElementById("dash-anim")!;
  const dashFrame = document.getElementById("dash-frame")!;
  const dashLevel = document.getElementById("dash-level")!;
  const dashNextTick = document.getElementById("dash-next-tick")!;
  const dashQueue = document.getElementById("dash-queue")!;

  let currentAgent: Agent | null = null;
  let isVisible = true;
  let loadAbortController: AbortController | null = null;

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
    exitBtn.disabled = true;
    speakBtn.disabled = true;
    askBtn.disabled = true;
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

    // Show Progress Window
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
            <div class="progress-indicator">
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

    const loadingStatus = progressWindow.querySelector(
      "#loading-status",
    ) as HTMLParagraphElement;
    const loadingProgressBar = progressWindow.querySelector(
      "#loading-progress-bar",
    ) as HTMLSpanElement;
    const cancelBtn = progressWindow.querySelector(
      "#cancel-load-btn",
    ) as HTMLButtonElement;

    cancelBtn.onclick = () => {
      loadAbortController?.abort();
    };

    try {
      const scale = parseFloat(scaleRange.value);
      const baseUrl = import.meta.env.BASE_URL;
      currentAgent = await Agent.load(name, {
        baseUrl: `${baseUrl}agents/${name}`,
        scale: scale,
        useAudio: true,
        signal: loadAbortController.signal,
        onProgress: (progress) => {
          loadingStatus.textContent = `Downloading ${progress.filename}...`;
          if (progress.total > 0) {
            const percent = Math.round(
              (progress.loaded / progress.total) * 100,
            );
            loadingProgressBar.style.width = `${percent}%`;
          } else {
            // Indeterminate if total is unknown
            loadingProgressBar.classList.add("segmented");
            loadingProgressBar.style.width = "100%";
          }
        },
        initialAnimation: "Greeting",
      });

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

      isVisible = true;
      visibilityBtn.textContent = "Hide";
      exitBtn.textContent = "Exit";

      playBtn.disabled = false;
      play5sBtn.disabled = false;
      playLoopedBtn.disabled = false;
      randomBtn.disabled = false;
      visibilityBtn.disabled = false;
      exitBtn.disabled = false;
      speakBtn.disabled = false;
      askBtn.disabled = false;
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
        currentAgent?.speak(
          `Right-click or long-press at ${data.x}, ${data.y}`,
        );
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
      document.body.removeChild(progressWindow);
      document.body.removeChild(overlay);
      loadAbortController = null;
    }
  }

  agentSelect.addEventListener("change", () => {
    loadAgent(agentSelect.value);
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
    const req = currentAgent.play(
      animationSelect.value,
      undefined,
      false,
      true,
    );

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

  exitBtn.addEventListener("click", async () => {
    if (exitBtn.textContent === "Initialize") {
      loadAgent(agentSelect.value);
      return;
    }

    if (!currentAgent) return;

    exitBtn.disabled = true;
    playBtn.disabled = true;
    play5sBtn.disabled = true;
    playLoopedBtn.disabled = true;
    randomBtn.disabled = true;
    visibilityBtn.disabled = true;
    speakBtn.disabled = true;
    askBtn.disabled = true;
    gestureLeftBtn.disabled = true;
    gestureRightBtn.disabled = true;
    gestureUpBtn.disabled = true;
    gestureDownBtn.disabled = true;
    moveToMouseBtn.disabled = true;

    if (currentAgent.hasAnimation("GoodBye")) {
      await currentAgent.hide("GoodBye");
    } else {
      await currentAgent.hide();
    }

    currentAgent.destroy();
    currentAgent = null;

    exitBtn.textContent = "Initialize";
    exitBtn.disabled = false;
  });

  speakBtn.addEventListener("click", () => {
    currentAgent?.speak(speakTextInput.value, {
      skipTyping: skipTypingCheck.checked,
    });
  });

  askBtn.addEventListener("click", async () => {
    if (!currentAgent) return;
    const answer = await currentAgent.ask({
      title: "Question",
      placeholder: "Type your answer here...",
    });
    if (answer !== null) {
      currentAgent.speak(`You said: ${answer}`, {
        skipTyping: skipTypingCheck.checked,
      });
    } else {
      currentAgent.speak("Cancelled.", {
        skipTyping: skipTypingCheck.checked,
      });
    }
  });

  gestureLeftBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x - 100,
      currentAgent.options.y + 50,
    );
  });
  gestureRightBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x +
        currentAgent.spriteManager.getSpriteWidth() *
          currentAgent.options.scale +
        100,
      currentAgent.options.y + 50,
    );
  });
  gestureUpBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x + 50,
      currentAgent.options.y - 100,
    );
  });
  gestureDownBtn.addEventListener("click", () => {
    if (!currentAgent) return;
    currentAgent.gestureAt(
      currentAgent.options.x + 50,
      currentAgent.options.y +
        currentAgent.spriteManager.getSpriteHeight() *
          currentAgent.options.scale +
        100,
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
      const targetX =
        e.clientX -
        (currentAgent.definition.character.width * currentAgent.options.scale) /
          2;
      const targetY =
        e.clientY -
        (currentAgent.definition.character.height *
          currentAgent.options.scale) /
          2;

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
    if (
      currentAgent &&
      currentAgent.stateManager &&
      currentAgent.animationManager
    ) {
      dashState.textContent = currentAgent.stateManager.currentStateName;
      dashAnim.textContent =
        currentAgent.animationManager.currentAnimationName || "-";
      dashFrame.textContent =
        currentAgent.animationManager.currentFrameIndexValue.toString();
      dashLevel.textContent = currentAgent.stateManager.idleLevel.toString();
      dashNextTick.textContent = (
        currentAgent.stateManager.timeUntilNextTick / 1000
      ).toFixed(1);

      const activeId = currentAgent.requestQueue.activeRequestId;
      const length = currentAgent.requestQueue.length;
      dashQueue.textContent = activeId
        ? `ID:${activeId} (+${length})`
        : "Empty";
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

  // Start
  updateDebug();
  await loadAgent("Clippit");
  (window as any).agent = currentAgent;
}

initDemo();
