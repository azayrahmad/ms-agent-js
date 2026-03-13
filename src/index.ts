/**
 * MSAgentJS: A modern, TypeScript-based implementation of Microsoft Agent.
 * Bringing the charm of 90s digital assistants to the web with Shadow DOM,
 * Promise-based APIs, and procedural SVG balloons.
 *
 * @module
 */

import { Agent } from "./Agent";

export { CharacterParser } from "./CharacterParser";
export { SpriteManager } from "./SpriteManager";
export { AnimationManager } from "./AnimationManager";
export { AudioManager } from "./AudioManager";
export { StateManager } from "./StateManager";
export { RequestQueue } from "./RequestQueue";
export { Agent } from "./Agent";
export * from "./types";

declare global {
  interface Window {
    clippy: any;
  }
}

export const clippy = {
  Agent: Agent,
  BASE_PATH: "https://unpkg.com/ms-agent-js@latest/dist/agents/",
  /**
   * Legacy clippy.js load method.
   */
  load: (
    name: string,
    successCb: (agent: Agent) => void,
    failCbOrOptions?: ((err: any) => void) | any,
    baseUrl?: string,
  ) => {
    let options: any = {};
    let failCb: ((err: any) => void) | undefined;

    if (typeof failCbOrOptions === "function") {
      failCb = failCbOrOptions;
    } else if (typeof failCbOrOptions === "object") {
      options = failCbOrOptions;
    }

    const path = baseUrl || options.baseUrl || clippy.BASE_PATH + name;
    options.baseUrl = path;

    // Use name as the agent folder, but if baseUrl is already agent-specific,
    // Agent.load handles it.
    Agent.load(name, options)
      .then((agent) => {
        if (successCb) successCb(agent);
      })
      .catch((err) => {
        if (failCb) failCb(err);
        else console.error("MSAgentJS: Failed to load agent", err);
      });
  },
};

if (typeof window !== "undefined") {
  window.clippy = clippy;
}
