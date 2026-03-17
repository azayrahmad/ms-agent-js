import { MSADPCMDecoder } from "./MSADPCMDecoder";
import type { AudioAtlasEntry } from "../base/types";
import { fetchWithProgress } from "../../utils";

/**
 * AudioManager class for loading and playing agent sound effects.
 * Supports legacy Microsoft ADPCM (.wav) and standard PCM via the Web Audio API.
 * Also supports optimized audio spritesheets (webm) for modern agents.
 */
export class AudioManager {
  /** The shared Web Audio context for this agent. */
  private audioContext: AudioContext | null = null;
  /** Cache of individual decoded audio buffers. */
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  /** Map of sounds currently being loaded to avoid duplicate requests. */
  private loadingPromises: Map<string, Promise<void>> = new Map();
  /** Computed path to the individual audio files. */
  private audioPath: string;
  /** Base URL of the agent assets. */
  private baseUrl: string;
  /** Whether audio playback is enabled. */
  private enabled: boolean = true;
  /** Metadata mapping sound names to time ranges within the spritesheet. */
  private audioAtlas: Record<string, AudioAtlasEntry> | null = null;
  /** The decoded audio buffer of the spritesheet, if used. */
  private spritesheetBuffer: AudioBuffer | null = null;
  /** Promise tracking the spritesheet loading process. */
  private spritesheetLoadingPromise: Promise<void> | null = null;
  /** Optional loading options. */
  private options: {
    signal?: AbortSignal;
    onProgress?: (progress: {
      loaded: number;
      total: number;
      filename: string;
    }) => void;
  };

  /**
   * @param baseUrl - The base URL where agent assets are located.
   * @param options - Optional loading options.
   */
  constructor(
    baseUrl: string,
    options: {
      signal?: AbortSignal;
      onProgress?: (progress: {
        loaded: number;
        total: number;
        filename: string;
      }) => void;
    } = {},
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.audioPath = `${this.baseUrl}/Audio`;
    this.options = options;
  }

  /**
   * Enables or disables audio playback.
   */
  public setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Sets the audio atlas for spritesheet-based sound playback.
   *
   * @param atlas - Mapping of sound names to start/end timestamps.
   */
  public setAudioAtlas(atlas: Record<string, AudioAtlasEntry>): void {
    this.audioAtlas = atlas;
  }

  /**
   * Returns the lazy-initialized AudioContext.
   */
  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return this.audioContext;
  }

  /**
   * Preloads a list of sound files.
   * If an audio atlas is present, this will load the spritesheet instead.
   *
   * @param filenames - List of sound names (e.g., "GREETING.WAV").
   */
  public async loadSounds(filenames: string[]): Promise<void> {
    if (this.audioAtlas) {
      await this.loadSpritesheet();
      return;
    }

    const promises = filenames.map(async (filename) => {
      // Normalize filename to just the name, removing potential "Audio\" prefix from ACD
      const soundName = filename.split(/[\\/]/).pop() || filename;

      if (this.soundBuffers.has(soundName)) return;

      // Avoid duplicate loading if already in progress
      if (this.loadingPromises.has(soundName)) {
        return this.loadingPromises.get(soundName);
      }

      const loadPromise = this.loadInternal(soundName);
      this.loadingPromises.set(soundName, loadPromise);
      try {
        await loadPromise;
      } finally {
        this.loadingPromises.delete(soundName);
      }
    });
    await Promise.all(promises);
  }

  /**
   * Loads a single sound file and decodes it.
   * Automatically handles MS ADPCM decoding if necessary.
   */
  private async loadInternal(soundName: string): Promise<void> {
    const ctx = this.getContext();
    const normalizedFilename = soundName.toLowerCase().endsWith(".wav")
      ? soundName
      : `${soundName}.wav`;
    const url = `${this.audioPath}/${normalizedFilename}`;

    try {
      const response = await fetch(url, { signal: this.options.signal });
      if (!response.ok) {
        console.warn(
          `Failed to load sound ${soundName}: ${response.statusText}`,
        );
        return;
      }
      const arrayBuffer = await response.arrayBuffer();

      let audioBuffer: AudioBuffer;

      // Check if it's a Microsoft ADPCM WAV file
      if (this.isMSADPCM(arrayBuffer)) {
        try {
          const decoded = MSADPCMDecoder.decode(arrayBuffer);
          audioBuffer = ctx.createBuffer(
            decoded.channels,
            decoded.samples.length,
            decoded.sampleRate,
          );
          audioBuffer.getChannelData(0).set(decoded.samples);
        } catch (decodeError) {
          console.error(
            `Failed to decode MS ADPCM for ${soundName}:`,
            decodeError,
          );
          // Fallback to native decoder as last resort, though it likely fails
          audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        }
      } else {
        // Standard decoding for PCM WAV, MP3, etc.
        audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      }

      this.soundBuffers.set(soundName, audioBuffer);
    } catch (error) {
      console.error(`Error loading sound ${soundName}:`, error);
    }
  }

  /**
   * Loads the optimized audio spritesheet (agent.webm).
   */
  private async loadSpritesheet(): Promise<void> {
    if (this.spritesheetBuffer) return;
    if (this.spritesheetLoadingPromise) return this.spritesheetLoadingPromise;

    this.spritesheetLoadingPromise = (async () => {
      const ctx = this.getContext();
      const url = `${this.baseUrl}/agent.webm`;

      try {
        const response = await fetchWithProgress(url, {
          signal: this.options.signal,
          onProgress: this.options.onProgress,
        });
        if (!response.ok) {
          console.warn(
            `Failed to load audio spritesheet: ${response.statusText}`,
          );
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        this.spritesheetBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw error;
        console.error("Error loading audio spritesheet:", error);
      }
    })();

    return this.spritesheetLoadingPromise;
  }

  /**
   * Detects if a WAV file uses the Microsoft ADPCM compression format.
   */
  private isMSADPCM(buffer: ArrayBuffer): boolean {
    const view = new DataView(buffer);
    if (buffer.byteLength < 20) return false;

    // RIFF header
    if (view.getUint32(0, true) !== 0x46464952) return false; // 'RIFF'
    if (view.getUint32(8, true) !== 0x45564157) return false; // 'WAVE'

    // Look for 'fmt ' chunk
    let pos = 12;
    while (pos + 8 < buffer.byteLength) {
      const chunkId = view.getUint32(pos, true);
      const chunkSize = view.getUint32(pos + 4, true);
      if (chunkId === 0x20746d66) {
        // 'fmt '
        const audioFormat = view.getUint16(pos + 8, true);
        return audioFormat === 2; // WAVE_FORMAT_ADPCM
      }
      pos += 8 + chunkSize;
      if (chunkSize % 2 !== 0) pos++;
    }
    return false;
  }

  /**
   * Plays a sound effect associated with a specific frame.
   * Automatically attempts to load the sound if it's not already in the cache.
   *
   * @param soundPath - Filename or relative path to the sound.
   * @returns A promise that resolves when the sound starts playing or fails to play.
   *          Note: The original implementation waited for sound completion for animation events.
   */
  public async playFrameSound(soundPath: string): Promise<void> {
    if (!this.enabled) return;

    const soundNameRaw = soundPath.split(/[\\/]/).pop() || "";
    const soundName = soundNameRaw.toLowerCase().endsWith(".wav")
      ? soundNameRaw.toLowerCase()
      : `${soundNameRaw.toLowerCase()}.wav`;

    if (this.audioAtlas && this.spritesheetBuffer) {
      const entry = this.audioAtlas[soundName];
      if (entry) {
        return this.playFromSpritesheet(entry.start, entry.end);
      } else {
        console.warn(`Sound ${soundName} not found in audio atlas`);
      }
      return;
    }

    const buffer =
      this.soundBuffers.get(soundNameRaw) ||
      this.soundBuffers.get(`${soundNameRaw}.wav`);

    if (buffer) {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      return new Promise((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start(0);
      });
    } else {
      // Avoid duplicate playback for sounds already being loaded
      if (
        this.loadingPromises.has(soundNameRaw) ||
        this.loadingPromises.has(`${soundNameRaw}.wav`)
      ) {
        return;
      }

      // Load on demand if not cached
      await this.loadSounds([soundNameRaw]);

      if (this.audioAtlas && this.spritesheetBuffer) {
        return this.playFrameSound(soundNameRaw);
      } else {
        const reloadedBuffer =
          this.soundBuffers.get(soundNameRaw) ||
          this.soundBuffers.get(`${soundNameRaw}.wav`);
        if (reloadedBuffer) {
          return this.playFrameSound(soundNameRaw);
        }
      }
    }
  }

  /**
   * Plays a slice of the audio spritesheet.
   *
   * @param start - Start time in seconds.
   * @param end - End time in seconds.
   */
  private async playFromSpritesheet(start: number, end: number): Promise<void> {
    if (!this.spritesheetBuffer) return;

    const ctx = this.getContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = this.spritesheetBuffer;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      // source.start(when, offset, duration)
      source.start(0, start, end - start);
    });
  }
}
