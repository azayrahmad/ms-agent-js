import { CharacterParser } from "./CharacterParser";
import { AssetCache } from "./Cache";
import type {
  AgentCharacterDefinition,
  AgentOptions,
} from "../base/types";
import { fetchWithProgress } from "../../utils";

/**
 * Utility class responsible for loading and normalizing agent character definitions.
 */
export class AgentLoader {
  /**
   * Loads an agent definition from cache or remote source.
   *
   * @param name - The name of the agent to load.
   * @param baseUrl - The base URL where agent assets are located.
   * @param options - Configuration options, including signal for cancellation.
   * @returns A promise resolving to the fully parsed and normalized definition.
   * @throws Error if the definition cannot be loaded from any source.
   */
  public static async getDefinition(
    name: string,
    baseUrl: string,
    options: AgentOptions,
  ): Promise<AgentCharacterDefinition> {
    const useCache = options.useCache !== false;

    if (useCache) {
      const cached = AssetCache.getDefinition(baseUrl);
      if (cached) return cached;
    }

    let definition: AgentCharacterDefinition | undefined;

    try {
      // Prioritize optimized agent.json (atlas-based)
      const agentJsonUrl = `${baseUrl}/agent.json`;
      const response = await fetchWithProgress(agentJsonUrl, {
        signal: options.signal,
        onProgress: options.onProgress,
      });

      if (!response.ok) throw new Error("No agent.json");
      definition = (await response.json()) as AgentCharacterDefinition;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;

      // Fallback to legacy .acd format
      const acdPath = `${baseUrl}/${name.toUpperCase()}.acd`;
      try {
        definition = await CharacterParser.load(acdPath, options.signal);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        // Fallback to lowercase acd filename
        try {
          definition = await CharacterParser.load(
            `${baseUrl}/${name.toLowerCase()}.acd`,
            options.signal,
          );
        } catch (innerErr) {
          if (innerErr instanceof Error && innerErr.name === "AbortError")
            throw innerErr;
          console.error(
            `MSAgentJS: Failed to load agent assets for '${name}' at ${baseUrl}. ` +
              `Please ensure the 'agents/' directory is correctly served and 'baseUrl' is correct.`,
          );
          throw err;
        }
      }
    }

    if (!definition) {
      throw new Error(
        `MSAgentJS: Failed to load agent assets for '${name}' at ${baseUrl}.`,
      );
    }

    this.normalizeDefinition(definition);
    if (useCache) {
      AssetCache.setDefinition(baseUrl, definition);
    }

    return definition;
  }

  /**
   * Internal normalization logic for character definitions.
   */
  private static normalizeDefinition(definition: AgentCharacterDefinition) {
    if (!definition.character) return;

    if (
      definition.character.colorTable &&
      !definition.character.colorTable.startsWith("http")
    ) {
      definition.character.colorTable = definition.character.colorTable.replace(
        /\\/g,
        "/",
      );
    }
    Object.values(definition.animations).forEach((animation) => {
      animation.frames.forEach((frame) => {
        frame.images.forEach((image) => {
          image.filename = image.filename.replace(/\\/g, "/").toLowerCase();
        });
        if (frame.mouths) {
          frame.mouths.forEach((mouth) => {
            mouth.filename = mouth.filename.replace(/\\/g, "/").toLowerCase();
          });
        }
        if (frame.soundEffect) {
          frame.soundEffect = frame.soundEffect.toLowerCase();
        }
      });
    });
  }
}
