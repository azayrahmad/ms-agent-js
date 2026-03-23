import { Agent } from "../Agent";

/**
 * Interface for a structured help entry.
 */
interface HelpEntry {
  title: string;
  content: string[];
  keywords: string[];
}

/**
 * Manages the interactive developer help system.
 * Provides a hybrid interface with predefined topics and keyword-based search.
 */
export class HelpManager {
  private static readonly DOCS_BASE = "https://github.com/azayrahmad/ms-agent-js/blob/main";

  /**
   * Structured help entries including title, content, and searchable keywords.
   */
  private static readonly HELP_ENTRIES: HelpEntry[] = [
    {
      title: "Getting Started",
      content: [
        "Install via npm: `npm install ms-agent-js` or use a CDN.",
        `See <a href="${this.DOCS_BASE}/docs/getting-started.md" target="_blank">getting-started.md</a> for a quick start guide.`,
        "Use `Agent.load('Name')` to begin."
      ],
      keywords: ["install", "setup", "npm", "start", "how", "begin"]
    },
    {
      title: "Animations & Movement",
      content: [
        "Use `play(name)`, `moveTo(x, y)`, `gestureAt(x, y)`, or `lookAt(x, y)`.",
        `See <a href="${this.DOCS_BASE}/docs/api-reference.md" target="_blank">api-reference.md</a> for the full list of methods.`,
        "Movement animations are automatically chosen based on direction."
      ],
      keywords: ["animation", "play", "move", "gesture", "look", "walk", "run"]
    },
    {
      title: "Speech & TTS",
      content: [
        "Use `speak(text)` or `ask(options)` for interactive dialogs.",
        `TTS settings are handled via <code>setTTSOptions()</code>. See <a href="${this.DOCS_BASE}/docs/api-reference.md" target="_blank">api-reference.md</a>.`,
        "The `ask()` method supports choices, inputs, and checkboxes."
      ],
      keywords: ["speak", "talk", "tts", "voice", "ask", "question", "input"]
    },
    {
      title: "Custom Agents",
      content: [
        "You can add your own agents by providing .acd or .json files.",
        `See <a href="${this.DOCS_BASE}/docs/assets.md" target="_blank">assets.md</a> for optimization tips (WebP/WebM/Atlas).`,
        "Optimized JSON formats are recommended for performance."
      ],
      keywords: ["custom", "acd", "asset", "own", "build", "character"]
    },
    {
      title: "Events",
      content: [
        "The agent emits events like 'click', 'show', 'hide', 'animationStart', and 'animationEnd'.",
        `Use <code>agent.on('event', callback)</code> to listen. See <a href="${this.DOCS_BASE}/docs/api-reference.md" target="_blank">api-reference.md</a>.`
      ],
      keywords: ["events", "on", "click", "listen", "callback", "handle"]
    },
    {
      title: "Audio & Sounds",
      content: [
        "Agents can play sound effects defined in their character files.",
        "Speech can use system TTS or balloon-only mode. Toggle with <code>useAudio</code> option.",
        "Audio doubling and playback issues are handled by internal managers."
      ],
      keywords: ["audio", "sound", "effect", "volume", "silent", "wav"]
    },
    {
      title: "Scaling",
      content: [
        "Use <code>agent.setScale(number)</code> to resize the agent dynamically.",
        "The agent stays centered and within viewport bounds.",
        "Scaling affects all sprites and UI components."
      ],
      keywords: ["scaling", "size", "resize", "big", "small", "zoom", "scale"]
    },
    {
      title: "Interruption & Stopping",
      content: [
        "Use <code>agent.stop()</code> to cancel the current and all queued actions.",
        "Use <code>agent.stopCurrent()</code> to skip just the current action.",
        "Interrupting triggers transition animations where defined."
      ],
      keywords: ["stop", "interrupt", "cancel", "skip", "pause", "resume"]
    },
    {
      title: "Coordinate System",
      content: [
        "Positioning uses screen coordinates (pixels).",
        "The agent's position is relative to the top-left of the viewport (fixed) or document (absolute).",
        "Use <code>window.scrollX/Y</code> for document-relative positioning."
      ],
      keywords: ["coordinates", "where", "location", "position", "x", "y", "top", "left"]
    },
    {
      title: "Documentation Map",
      content: [
        `- <a href="${this.DOCS_BASE}/docs/getting-started.md" target="_blank">getting-started.md</a>`,
        `- <a href="${this.DOCS_BASE}/docs/api-reference.md" target="_blank">api-reference.md</a>`,
        `- <a href="${this.DOCS_BASE}/docs/assets.md" target="_blank">assets.md</a>`,
        `- <a href="${this.DOCS_BASE}/docs/request-system.md" target="_blank">request-system.md</a>`,
        `- <a href="${this.DOCS_BASE}/docs/internals.md" target="_blank">internals.md</a>`
      ],
      keywords: ["docs", "help", "reference", "api", "map", "readme"]
    },
    {
      title: "Contributing",
      content: [
        `We welcome contributions! Check <a href="${this.DOCS_BASE}/CONTRIBUTING.md" target="_blank">CONTRIBUTING.md</a> for repo setup instructions.`,
        "Vite, Vitest, and TypeScript are the main tools used.",
        "Follow the established code standards and PR guidelines."
      ],
      keywords: ["contribute", "develop", "source", "github", "repo", "pr"]
    },
    {
      title: "General Information",
      content: [
        "MS Agent JS brings classic desktop assistants back to the web using modern TypeScript.",
        `See <a href="${this.DOCS_BASE}/README.md" target="_blank">README.md</a> for more project details.`
      ],
      keywords: ["clippy", "agent", "microsoft", "modern", "web", "typescript"]
    }
  ];

  /**
   * The main topics displayed as bullet choices.
   */
  private static readonly MAIN_TOPICS = [
    "How do I get started?",
    "How do I control animations/speech?",
    "How do I add custom agents?",
    "How do I handle events?",
    "How do I stop or interrupt actions?",
    "Documentation Map"
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
        // Map choice indices to help entries
        const entryMap: Record<number, string> = {
          0: "Getting Started",
          1: "Animations & Movement",
          2: "Custom Agents",
          3: "Events",
          4: "Interruption & Stopping",
          5: "Documentation Map"
        };
        const title = entryMap[result.value];
        const entry = this.HELP_ENTRIES.find(e => e.title === title);
        if (entry) {
          await this.showHelp(agent, entry);
        }
        continue;
      }

      // Handle Keyword Search
      if (result.value === "Ask" && result.text) {
        const text = result.text.toLowerCase().trim();
        const tokens = text.split(/\s+/).map(t => t.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ""));

        const scoredMatches: { score: number; entry: HelpEntry }[] = [];

        for (const entry of this.HELP_ENTRIES) {
          let score = 0;
          let entryMatched = false;
          for (const keyword of entry.keywords) {
            if (text.includes(keyword)) {
              score += 2; // Substring match
              entryMatched = true;
            }
            if (tokens.includes(keyword)) {
              score += 3; // Direct word match
              entryMatched = true;
            }
          }

          if (entryMatched) {
            scoredMatches.push({ score, entry });
          }
        }

        // Sort by score (descending)
        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches.length > 0) {
          const choiceResult = await agent.ask({
            title: "Search Results",
            content: [
              `I found ${scoredMatches.length} matching topic${scoredMatches.length > 1 ? "s" : ""}:`,
              { type: "choices", items: scoredMatches.map(m => m.entry.title) }
            ],
            buttons: ["Back"],
            timeout: 0
          });

          if (choiceResult && typeof choiceResult.value === "number") {
            await this.showHelp(agent, scoredMatches[choiceResult.value].entry);
          }
        } else {
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
   * @param entry - The help entry to display.
   */
  private static async showHelp(agent: Agent, entry: HelpEntry) {
    await agent.ask({
      title: entry.title,
      content: entry.content,
      buttons: ["Back"],
      timeout: 0
    });
  }
}
