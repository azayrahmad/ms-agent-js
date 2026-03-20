import { Agent } from "../Agent";

/**
 * Manages the interactive developer help system.
 * Provides a hybrid interface with predefined topics and keyword-based search.
 */
export class HelpManager {
  /**
   * Keyword-to-response mapping for free-form input.
   */
  private static readonly KEYWORD_MAP: Record<string, { title: string; content: string[] }> = {
    "install": {
      title: "Getting Started",
      content: ["Install via npm: `npm install ms-agent-js`", "Or use a CDN. See docs/getting-started.md for details."]
    },
    "setup": {
      title: "Getting Started",
      content: ["Install via npm: `npm install ms-agent-js`", "Or use a CDN. See docs/getting-started.md for details."]
    },
    "npm": {
      title: "Getting Started",
      content: ["Install via npm: `npm install ms-agent-js`", "Or use a CDN. See docs/getting-started.md for details."]
    },
    "start": {
      title: "Getting Started",
      content: ["Use `Agent.load('Name')` to begin.", "See docs/getting-started.md for a quick start guide."]
    },
    "animation": {
      title: "Animations & Movement",
      content: ["Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.", "See docs/api-reference.md for the full list of methods."]
    },
    "play": {
      title: "Animations & Movement",
      content: ["Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.", "See docs/api-reference.md for the full list of methods."]
    },
    "move": {
      title: "Animations & Movement",
      content: ["Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.", "See docs/api-reference.md for the full list of methods."]
    },
    "gesture": {
      title: "Animations & Movement",
      content: ["Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.", "See docs/api-reference.md for the full list of methods."]
    },
    "look": {
      title: "Animations & Movement",
      content: ["Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.", "See docs/api-reference.md for the full list of methods."]
    },
    "speak": {
      title: "Speech & TTS",
      content: ["Use `speak(text)` or `ask(options)` for interactive dialogs.", "TTS settings are handled via `setTTSOptions()`. See docs/api-reference.md."]
    },
    "talk": {
      title: "Speech & TTS",
      content: ["Use `speak(text)` or `ask(options)` for interactive dialogs.", "TTS settings are handled via `setTTSOptions()`. See docs/api-reference.md."]
    },
    "tts": {
      title: "Speech & TTS",
      content: ["Use `speak(text)` or `ask(options)` for interactive dialogs.", "TTS settings are handled via `setTTSOptions()`. See docs/api-reference.md."]
    },
    "voice": {
      title: "Speech & TTS",
      content: ["Use `speak(text)` or `ask(options)` for interactive dialogs.", "TTS settings are handled via `setTTSOptions()`. See docs/api-reference.md."]
    },
    "ask": {
      title: "Speech & TTS",
      content: ["The `ask()` method supports choices, inputs, and checkboxes.", "It returns a promise with the results. See docs/api-reference.md."]
    },
    "custom": {
      title: "Custom Agents",
      content: ["You can add your own agents by providing .acd or .json files.", "See docs/assets.md for optimization tips (WebP/WebM/Atlas)."]
    },
    "acd": {
      title: "Custom Agents",
      content: ["You can add your own agents by providing .acd or .json files.", "See docs/assets.md for optimization tips (WebP/WebM/Atlas)."]
    },
    "asset": {
      title: "Custom Agents",
      content: ["You can add your own agents by providing .acd or .json files.", "See docs/assets.md for optimization tips (WebP/WebM/Atlas)."]
    },
    "own": {
      title: "Custom Agents",
      content: ["You can add your own agents by providing .acd or .json files.", "See docs/assets.md for optimization tips (WebP/WebM/Atlas)."]
    },
    "build": {
      title: "Custom Agents",
      content: ["You can add your own agents by providing .acd or .json files.", "See docs/assets.md for optimization tips (WebP/WebM/Atlas)."]
    },
    "contribute": {
      title: "Contributing",
      content: ["We welcome contributions! Check CONTRIBUTING.md for repo setup instructions.", "Vite, Vitest, and TypeScript are the main tools used."]
    },
    "develop": {
      title: "Contributing",
      content: ["We welcome contributions! Check CONTRIBUTING.md for repo setup instructions.", "Vite, Vitest, and TypeScript are the main tools used."]
    },
    "source": {
      title: "Contributing",
      content: ["We welcome contributions! Check CONTRIBUTING.md for repo setup instructions.", "Vite, Vitest, and TypeScript are the main tools used."]
    },
    "github": {
      title: "Contributing",
      content: ["We welcome contributions! Check CONTRIBUTING.md for repo setup instructions.", "Vite, Vitest, and TypeScript are the main tools used."]
    },
    "docs": {
      title: "Documentation Map",
      content: ["- docs/getting-started.md", "- docs/api-reference.md", "- docs/assets.md", "- docs/request-system.md", "- docs/internals.md"]
    },
    "help": {
      title: "Documentation Map",
      content: ["- docs/getting-started.md", "- docs/api-reference.md", "- docs/assets.md", "- docs/request-system.md", "- docs/internals.md"]
    },
    "reference": {
      title: "Documentation Map",
      content: ["- docs/getting-started.md", "- docs/api-reference.md", "- docs/assets.md", "- docs/request-system.md", "- docs/internals.md"]
    },
    "api": {
      title: "Documentation Map",
      content: ["- docs/getting-started.md", "- docs/api-reference.md", "- docs/assets.md", "- docs/request-system.md", "- docs/internals.md"]
    }
  };

  /**
   * The 3 main topics displayed as bullet choices.
   */
  private static readonly MAIN_TOPICS = [
    "How do I get started?",
    "How do I control animations/speech?",
    "How do I add custom agents?"
  ];

  /**
   * Runs the interactive help system.
   *
   * @param agent - The active agent instance to provide help.
   */
  public static async run(agent: Agent): Promise<void> {
    let done = false;

    while (!done) {
      const result = await agent.ask({
        title: "Developer Help",
        content: [
          "Choose a topic or type a question below:",
          { type: "choices", items: this.MAIN_TOPICS },
          { type: "input", placeholder: "Type a keyword (e.g., 'npm', 'tts', 'custom')..." }
        ],
        buttons: [
          { label: "Ask", value: "Ask", bullet: "bullet" },
          { label: "Back", value: "Back" }
        ],
        timeout: 0
      });

      if (!result || result.value === "Back") {
        done = true;
        continue;
      }

      // Handle Choice Selection
      if (typeof result.value === "number") {
        switch (result.value) {
          case 0:
            await this.showHelp(agent, this.KEYWORD_MAP["install"]);
            break;
          case 1:
            await this.showHelp(agent, this.KEYWORD_MAP["animation"]);
            break;
          case 2:
            await this.showHelp(agent, this.KEYWORD_MAP["custom"]);
            break;
        }
        continue;
      }

      // Handle Keyword Search
      if (result.value === "Ask" && result.text) {
        const text = result.text.toLowerCase().trim();
        let matched = false;

        // Try to match keywords as substrings
        for (const [key, response] of Object.entries(this.KEYWORD_MAP)) {
          if (text.includes(key)) {
            await this.showHelp(agent, response);
            matched = true;
            break;
          }
        }

        if (!matched) {
          await agent.ask({
            title: "Help",
            content: [
              `Sorry, I couldn't find information about "${result.text}".`,
              "Try keywords like: 'install', 'play', 'tts', 'custom', or 'contribute'."
            ],
            buttons: ["Back"],
            timeout: 0
          });
        }
      }
    }

    agent.speak("Let me know if you need more information about the library!");
  }

  /**
   * Displays a specific help topic response.
   *
   * @param agent - The agent to show the help in.
   * @param response - The title and content array to display.
   */
  private static async showHelp(agent: Agent, response: { title: string; content: string[] }) {
    await agent.ask({
      title: response.title,
      content: response.content,
      buttons: ["Back"],
      timeout: 0
    });
  }
}
