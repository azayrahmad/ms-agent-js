import type { AgentCharacterDefinition } from "../base/types";

/**
 * Global cache for sharing agent assets across multiple instances.
 * Supports in-memory caching for processed assets (definitions, canvases, audio buffers)
 * and optional persistent caching for raw network responses using the Cache API.
 */
export class AssetCache {
  private static definitions = new Map<string, AgentCharacterDefinition>();
  private static sprites = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  private static audioBuffers = new Map<string, AudioBuffer>();
  private static CACHE_NAME = "ms-agent-js-v1";

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
   * Checks if the browser's Cache API is supported.
   */
  public static isPersistentSupported(): boolean {
    return typeof caches !== "undefined";
  }

  /**
   * Attempts to retrieve a raw response from the persistent cache.
   */
  public static async getPersistent(url: string): Promise<Response | undefined> {
    if (!this.isPersistentSupported()) return undefined;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      return await cache.match(url);
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Stores a raw response in the persistent cache.
   */
  public static async setPersistent(url: string, response: Response): Promise<void> {
    if (!this.isPersistentSupported()) return;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      await cache.put(url, response.clone());
    } catch (e) {
      // Ignore cache errors
    }
  }

  /**
   * Clears all in-memory caches.
   */
  public static clearMemory(): void {
    this.definitions.clear();
    this.sprites.clear();
    this.audioBuffers.clear();
  }

  /**
   * Deletes the persistent cache.
   */
  public static async clearPersistent(): Promise<void> {
    if (!this.isPersistentSupported()) return;
    await caches.delete(this.CACHE_NAME);
  }
}
