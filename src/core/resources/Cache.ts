import type { AgentCharacterDefinition } from "../base/types";

/**
 * Global cache for sharing agent assets across multiple instances.
 * Supports in-memory caching for processed assets (definitions, canvases, audio buffers).
 */
export class AssetCache {
  private static definitions = new Map<string, AgentCharacterDefinition>();
  private static sprites = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  private static audioBuffers = new Map<string, AudioBuffer>();

  /**
   * Retrieves a parsed agent definition from the in-memory cache.
   */
  public static getDefinition(url: string): AgentCharacterDefinition | undefined {
    return this.definitions.get(url);
  }

  /**
   * Stores a parsed agent definition in the in-memory cache.
   */
  public static setDefinition(url: string, definition: AgentCharacterDefinition): void {
    this.definitions.set(url, definition);
  }

  /**
   * Retrieves a processed sprite (canvas or image) from the in-memory cache.
   */
  public static getSprite(url: string): HTMLCanvasElement | HTMLImageElement | undefined {
    return this.sprites.get(url);
  }

  /**
   * Stores a processed sprite in the in-memory cache.
   */
  public static setSprite(url: string, sprite: HTMLCanvasElement | HTMLImageElement): void {
    this.sprites.set(url, sprite);
  }

  /**
   * Retrieves a decoded audio buffer from the in-memory cache.
   */
  public static getAudioBuffer(url: string): AudioBuffer | undefined {
    return this.audioBuffers.get(url);
  }

  /**
   * Stores a decoded audio buffer in the in-memory cache.
   */
  public static setAudioBuffer(url: string, buffer: AudioBuffer): void {
    this.audioBuffers.set(url, buffer);
  }

  /**
   * Clears all in-memory caches.
   */
  public static clearMemory(): void {
    this.definitions.clear();
    this.sprites.clear();
    this.audioBuffers.clear();
  }
}
