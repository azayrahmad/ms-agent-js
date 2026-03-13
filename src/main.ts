import './style.css';
import { Agent } from './Agent';

async function initDemo() {
  const agentSelect = document.getElementById('agent-select') as HTMLSelectElement;
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLSpanElement;
  const animationSelect = document.getElementById('animation-select') as HTMLSelectElement;
  const stateSelect = document.getElementById('state-select') as HTMLSelectElement;
  const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
  const play5sBtn = document.getElementById('play-5s-btn') as HTMLButtonElement;
  const randomBtn = document.getElementById('random-btn') as HTMLButtonElement;
  const visibilityBtn = document.getElementById('visibility-btn') as HTMLButtonElement;
  const speakBtn = document.getElementById('speak-btn') as HTMLButtonElement;
  const askBtn = document.getElementById('ask-btn') as HTMLButtonElement;
  const speakTextInput = document.getElementById('speak-text') as HTMLInputElement;
  const skipTypingCheck = document.getElementById('skip-typing-check') as HTMLInputElement;
  const gestureLeftBtn = document.getElementById('gesture-left-btn') as HTMLButtonElement;
  const gestureRightBtn = document.getElementById('gesture-right-btn') as HTMLButtonElement;
  const gestureUpBtn = document.getElementById('gesture-up-btn') as HTMLButtonElement;
  const gestureDownBtn = document.getElementById('gesture-down-btn') as HTMLButtonElement;
  const gestureMouseBtn = document.getElementById('gesture-mouse-btn') as HTMLButtonElement;
  const lookMouseCheck = document.getElementById('look-mouse-check') as HTMLInputElement;

  const dashState = document.getElementById('dash-state')!;
  const dashAnim = document.getElementById('dash-anim')!;
  const dashFrame = document.getElementById('dash-frame')!;
  const dashLevel = document.getElementById('dash-level')!;
  const dashNextTick = document.getElementById('dash-next-tick')!;
  const dashQueue = document.getElementById('dash-queue')!;

  let currentAgent: Agent | null = null;
  let isVisible = true;

  async function loadAgent(name: string) {
    if (currentAgent) {
      await currentAgent.hide();
      currentAgent.destroy();
    }

    // Reset UI
    animationSelect.innerHTML = '';
    stateSelect.innerHTML = '';
    playBtn.disabled = true;
    play5sBtn.disabled = true;
    randomBtn.disabled = true;
    visibilityBtn.disabled = true;
    speakBtn.disabled = true;
    askBtn.disabled = true;
    gestureLeftBtn.disabled = true;
    gestureRightBtn.disabled = true;
    gestureUpBtn.disabled = true;
    gestureDownBtn.disabled = true;
    gestureMouseBtn.disabled = true;
    lookMouseCheck.disabled = true;

    dashState.textContent = 'Loading...';
    dashAnim.textContent = '-';
    dashFrame.textContent = '-';
    dashLevel.textContent = '-';
    dashNextTick.textContent = '-';
    dashQueue.textContent = '-';

    try {
      const scale = parseFloat(scaleRange.value);
      currentAgent = await Agent.load(name, {
        baseUrl: `/agents/${name}`,
        scale: scale,
        useAudio: true
      });

      // Populate animations
      const animNames = Object.keys(currentAgent.definition.animations).sort();
      animNames.forEach(animName => {
        const option = document.createElement('option');
        option.value = animName;
        option.textContent = animName;
        animationSelect.appendChild(option);
      });

      // Populate states
      const stateNames = Object.keys(currentAgent.definition.states).sort();
      stateNames.forEach(stateName => {
        const option = document.createElement('option');
        option.value = stateName;
        option.textContent = stateName;
        if (stateName === 'IdlingLevel1') option.selected = true;
        stateSelect.appendChild(option);
      });

      isVisible = true;
      visibilityBtn.textContent = 'Hide';

      playBtn.disabled = false;
      play5sBtn.disabled = false;
      randomBtn.disabled = false;
      visibilityBtn.disabled = false;
      speakBtn.disabled = false;
      askBtn.disabled = false;
      gestureLeftBtn.disabled = false;
      gestureRightBtn.disabled = false;
      gestureUpBtn.disabled = false;
      gestureDownBtn.disabled = false;
      gestureMouseBtn.disabled = false;
      lookMouseCheck.disabled = false;

      // Click to play random animation
      currentAgent.on('click', () => {
          currentAgent?.stateManager.playRandomAnimation();
      });

    } catch (error) {
      console.error('Failed to load agent:', error);
      dashState.textContent = 'Error';
      alert('Failed to load agent. See console for details.');
    }
  }

  agentSelect.addEventListener('change', () => {
    loadAgent(agentSelect.value);
  });

  scaleRange.addEventListener('input', () => {
    const scale = parseFloat(scaleRange.value);
    scaleValue.textContent = `${scale.toFixed(1)}x`;
    currentAgent?.setScale(scale);
  });

  playBtn.addEventListener('click', () => {
    currentAgent?.play(animationSelect.value);
  });

  play5sBtn.addEventListener('click', () => {
    currentAgent?.play(animationSelect.value, 5000);
  });

  randomBtn.addEventListener('click', () => {
    currentAgent?.stateManager.playRandomAnimation();
  });

  stateSelect.addEventListener('change', () => {
    currentAgent?.setState(stateSelect.value);
  });

  visibilityBtn.addEventListener('click', async () => {
    if (!currentAgent) return;

    visibilityBtn.disabled = true;
    isVisible = !isVisible;

    if (isVisible) {
        await currentAgent.show();
        visibilityBtn.textContent = 'Hide';
    } else {
        await currentAgent.hide();
        visibilityBtn.textContent = 'Show';
    }

    visibilityBtn.disabled = false;
  });

  speakBtn.addEventListener('click', () => {
    currentAgent?.speak(speakTextInput.value, {
        skipTyping: skipTypingCheck.checked
    });
  });

  askBtn.addEventListener('click', async () => {
    if (!currentAgent) return;
    const answer = await currentAgent.ask({
        title: "Question",
        placeholder: "Type your answer here..."
    });
    if (answer !== null) {
        currentAgent.speak(`You said: ${answer}`, {
            skipTyping: skipTypingCheck.checked
        });
    } else {
        currentAgent.speak("Cancelled.", {
            skipTyping: skipTypingCheck.checked
        });
    }
  });
  
  gestureLeftBtn.addEventListener('click', () => currentAgent?.gestureAt(currentAgent.options.x - 100, currentAgent.options.y + 50));
  gestureRightBtn.addEventListener('click', () => currentAgent?.gestureAt(currentAgent.options.x + currentAgent.spriteManager.getSpriteWidth() * currentAgent.options.scale + 100, currentAgent.options.y + 50));
  gestureUpBtn.addEventListener('click', () => currentAgent?.gestureAt(currentAgent.options.x + 50, currentAgent.options.y - 100));
  gestureDownBtn.addEventListener('click', () => currentAgent?.gestureAt(currentAgent.options.x + 50, currentAgent.options.y + currentAgent.spriteManager.getSpriteHeight() * currentAgent.options.scale + 100));

  gestureMouseBtn.addEventListener('click', () => {
    const onMouseDown = (e: MouseEvent) => {
        currentAgent?.gestureAt(e.clientX, e.clientY);
        window.removeEventListener('mousedown', onMouseDown);
        gestureMouseBtn.classList.remove('active'); // hypothetical CSS or just visual cue
    };
    window.addEventListener('mousedown', onMouseDown);
  });

  window.addEventListener('mousemove', (e) => {
    if (lookMouseCheck.checked && currentAgent) {
        currentAgent.lookAt(e.clientX, e.clientY);
    }
  });

  // Update Loop for Debug Info
  function updateDebug() {
    if (currentAgent && currentAgent.stateManager && currentAgent.animationManager) {
      dashState.textContent = currentAgent.stateManager.currentStateName;
      dashAnim.textContent = currentAgent.animationManager.currentAnimationName || '-';
      dashFrame.textContent = currentAgent.animationManager.currentFrameIndexValue.toString();
      dashLevel.textContent = currentAgent.stateManager.idleLevel.toString();
      dashNextTick.textContent = (currentAgent.stateManager.timeUntilNextTick / 1000).toFixed(1);

      const activeId = currentAgent.requestQueue.activeRequestId;
      const length = currentAgent.requestQueue.length;
      dashQueue.textContent = activeId ? `ID:${activeId} (+${length})` : 'Empty';
    }
    requestAnimationFrame(updateDebug);
  }

  // Start
  updateDebug();
  await loadAgent('Clippit');
  (window as any).agent = currentAgent;
}

initDemo();
