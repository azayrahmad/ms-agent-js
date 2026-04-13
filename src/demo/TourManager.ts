import { Agent } from "../Agent";

/**
 * Manages the interactive tour of the MS Agent JS features.
 * Demonstrates advanced agent orchestration like programmatic movement,
 * tab switching, and interactive dialogs.
 */
export class TourManager {
  /**
   * Runs a guided tour using the provided agent.
   * Moves the agent across different UI elements and explains their purpose.
   *
   * @param agent - The active agent instance to perform the tour.
   * @returns A promise that resolves when the tour is completed or cancelled.
   */
  public static async run(agent: Agent): Promise<void> {
    const tabs = [
      { id: "tab-assistant", text: "In the Assistant tab, you can browse and select different characters from the gallery. Each agent has its own unique personality and animations!" },
      { id: "tab-animation", text: "The Animation tab allows you to control the agent's actions. You can change its scale, play specific animations, or switch between different behavioral states." },
      { id: "tab-speech", text: "The Speech tab is where you can make the agent talk! You can use Text-to-Speech with various voice settings, or use interactive 'Ask' dialogs." },
    ];

    const controlPanel = document.querySelector(".control-panel") as HTMLElement;
    const debugWindow = document.querySelector(".debug-window") as HTMLElement;

    const agentW = agent.definition.character.width * agent.options.scale;
    const agentH = agent.definition.character.height * agent.options.scale;

    /** Helper to move the agent to the bottom-right corner of an element. */
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
          buttons: [
            { label: "Continue", value: "continue", bullet: "bullet" },
            { label: "Stop", value: "stop", bullet: "bullet" },
          ],
          timeout: 0,
          animation: "Explain",
        });
        if (!result || result.value === "stop") {
          agent.speak("That's the end of the tour! Have fun exploring!");
          return;
        }
      }
    }

    // Debug window
    const dwRect = debugWindow.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    // On the right of the window, not obscuring it
    await agent.moveTo(dwRect.right + scrollX + 20, dwRect.top + scrollY + dwRect.height / 2 - agentH / 2);

    const finalResult = await agent.ask({
      content: ["Finally, the Debug Info window shows real-time data about the agent's internal state, current animation, and position."],
      buttons: [
        { label: "Finish", value: "finish", bullet: "bullet" },
        { label: "Stop", value: "stop", bullet: "bullet" },
      ],
      timeout: 0,
      animation: "Thinking",
    });

    if (finalResult && finalResult.value === "stop") {
      // Already at the end, but honor the stop button
    }

    agent.speak("That's the end of the tour! Have fun exploring!");
  }
}
