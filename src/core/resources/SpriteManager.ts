import {
  type FrameDefinition,
  type AgentCharacterDefinition,
  type MouthDefinition,
} from "../base/types";
import { fetchWithProgress } from "../../utils";
import { AssetCache } from "./Cache";

/**
 * SpriteManager class for loading, caching, and rendering agent sprites.
 * It handles both individual BMP files (legacy) and optimized texture atlases.
 */
export class SpriteManager {
  /** Cache for individual loaded sprites (canvases or images). */
  private sprites: Map<string, HTMLCanvasElement | HTMLImageElement> =
    new Map();
  /** The RGB color to be treated as transparent during BMP processing. */
  private transparencyColor: { r: number; g: number; b: number } | null = null;
  /** Base URL for agent assets. */
  private agentRoot: string;
  /** The full character definition. */
  private definition: AgentCharacterDefinition;
  /** The loaded texture atlas image, if used. */
  private spriteSheet: HTMLImageElement | null = null;
  /** Optional loading options. */
  private options: {
    signal?: AbortSignal;
    onProgress?: (progress: {
      loaded: number;
      total: number;
      filename: string;
    }) => void;
    useCache?: boolean;
  };

  /**
   * @param agentRoot - The base URL where agent assets are located.
   * @param definition - The character definition containing frame and metadata info.
   * @param options - Optional loading options.
   */
  constructor(
    agentRoot: string,
    definition: AgentCharacterDefinition,
    options: {
      signal?: AbortSignal;
      onProgress?: (progress: {
        loaded: number;
        total: number;
        filename: string;
      }) => void;
      useCache?: boolean;
    } = {},
  ) {
    this.agentRoot = agentRoot;
    this.definition = definition;
    this.options = {
      useCache: true,
      ...options,
    };
  }

  /**
   * Initializes the SpriteManager.
   * Loads the texture atlas if specified in the definition,
   * otherwise loads the transparency color from the color table.
   */
  public async init(): Promise<void> {
    if (this.definition.atlas) {
      await this.loadSpriteSheet();
    } else {
      await this.loadTransparencyColor();
    }
  }

  /**
   * Attempts to load the texture atlas image in WebP or PNG format.
   */
  private async loadSpriteSheet(): Promise<void> {
    const extensions = ["webp", "png"];
    for (const ext of extensions) {
      try {
        const url = `${this.agentRoot}/agent.${ext}`;

        if (this.options.useCache) {
          const cached = AssetCache.getSprite(url);
          if (cached) {
            this.spriteSheet = cached as HTMLImageElement;
            return;
          }
        }

        let response: Response;
        try {
          response = await fetchWithProgress(url, {
            signal: this.options.signal,
            onProgress: this.options.onProgress,
          });
        } catch (e) {
          response = { ok: false } as any as Response;
        }

        if (!response.ok) continue;

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            this.spriteSheet = img;
            if (this.options.useCache) {
              AssetCache.setSprite(url, img);
            }
            URL.revokeObjectURL(objectUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject();
          };
          img.src = objectUrl;
        });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw e;
        // Try next extension
      }
    }
    throw new Error("Failed to load sprite sheet (tried webp, png)");
  }

  /**
   * Loads the color table (BMP) to determine the transparency color.
   * Searches multiple potential paths for robustness.
   */
  private async loadTransparencyColor(): Promise<void> {
    const colorTablePath = this.definition.character.colorTable;
    const pathsToTry: string[] = [];

    if (colorTablePath.startsWith("http")) {
      pathsToTry.push(colorTablePath);
    } else {
      const normalizedPath = colorTablePath.replace(/\\/g, "/");
      pathsToTry.push(`${this.agentRoot}/${normalizedPath}`);
      pathsToTry.push(`${this.agentRoot}/${normalizedPath.toLowerCase()}`);

      const fileName = normalizedPath.split("/").pop() || "ColorTable.bmp";
      pathsToTry.push(`${this.agentRoot}/${fileName}`);
      pathsToTry.push(`${this.agentRoot}/${fileName.toLowerCase()}`);
      pathsToTry.push(`${this.agentRoot}/Images/${fileName}`);
      pathsToTry.push(`${this.agentRoot}/images/${fileName.toLowerCase()}`);
    }

    let response: Response | null = null;

    for (const url of pathsToTry) {
      try {
        const res = await fetch(url, { signal: this.options.signal });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            // Likely a 404 redirected to index.html
            continue;
          }
          response = res;
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!response || !response.ok) {
      throw new Error(
        `Failed to load color table. Tried: ${pathsToTry.join(", ")}`,
      );
    }
    const buffer = await response.arrayBuffer();
    this.transparencyColor = this.getPaletteColor(
      buffer,
      this.definition.character.transparency,
    );
  }

  /**
   * Extracts an RGB color from a BMP's palette at a specific index.
   */
  private getPaletteColor(
    buffer: ArrayBuffer,
    index: number,
  ): { r: number; g: number; b: number } {
    const view = new DataView(buffer);
    // BMP Header check: 'BM'
    const magic = view.getUint16(0, true);
    if (magic !== 0x4d42) {
      throw new Error(`Not a BMP file, magic: 0x${magic.toString(16)}`);
    }

    const infoHeaderSize = view.getUint32(14, true);
    const offsetToPalette = 14 + infoHeaderSize;

    // Each palette entry is 4 bytes (B, G, R, reserved)
    const paletteIndex = offsetToPalette + index * 4;

    if (paletteIndex + 3 > buffer.byteLength) {
      throw new Error("Palette index out of range");
    }

    return {
      b: view.getUint8(paletteIndex),
      g: view.getUint8(paletteIndex + 1),
      r: view.getUint8(paletteIndex + 2),
    };
  }

  /**
   * Pre-loads all sprites for a frame, including mouth shapes.
   *
   * @param frame - The frame definition to load sprites for.
   */
  public async loadFrameSprites(frame: FrameDefinition): Promise<void> {
    const promises: Promise<void>[] = [];
    frame.images.forEach((img) => promises.push(this.loadSprite(img.filename)));
    if (frame.mouths) {
      frame.mouths.forEach((mouth) =>
        promises.push(this.loadSprite(mouth.filename)),
      );
    }
    await Promise.all(promises);
  }

  /**
   * Loads a sprite BMP file, processes transparency, and caches it as a canvas.
   * If a texture atlas is already loaded, this method does nothing.
   *
   * @param filename - The relative filename of the sprite to load.
   */
  public async loadSprite(filename: string): Promise<void> {
    if (this.sprites.has(filename) || this.spriteSheet) return;

    const pathsToTry: string[] = [];
    if (filename.startsWith("http")) {
      pathsToTry.push(filename);
    } else {
      const normalizedPath = filename.replace(/\\/g, "/");
      const baseName = normalizedPath.split("/").pop() || "";

      pathsToTry.push(`${this.agentRoot}/${normalizedPath}`);
      pathsToTry.push(`${this.agentRoot}/${normalizedPath.toLowerCase()}`);
      pathsToTry.push(`${this.agentRoot}/Images/${baseName}`);
      pathsToTry.push(`${this.agentRoot}/images/${baseName.toLowerCase()}`);
      pathsToTry.push(`${this.agentRoot}/${baseName}`);
      pathsToTry.push(`${this.agentRoot}/${baseName.toLowerCase()}`);
    }

    let response: Response | null = null;
    for (const url of pathsToTry) {
      try {
        if (this.options.useCache) {
          const cached = AssetCache.getSprite(url);
          if (cached) {
            this.sprites.set(filename, cached);
            return;
          }
        }

        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            continue;
          }
          response = res;
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!response || !response.ok) {
      throw new Error(
        `Failed to load sprite ${filename}. Tried: ${pathsToTry.join(", ")}`,
      );
    }
    const buffer = await response.arrayBuffer();
    const canvas = this.bmpToCanvas(buffer);
    this.sprites.set(filename, canvas);

    if (this.options.useCache) {
      // Use the last successful URL as cache key for the processed canvas
      const successUrl = response.url;
      AssetCache.setSprite(successUrl, canvas);
    }
  }

  /**
   * Converts a BMP ArrayBuffer to a transparent HTMLCanvasElement.
   * Processes 8-bit, 24-bit, and 32-bit BMPs.
   */
  private bmpToCanvas(buffer: ArrayBuffer): HTMLCanvasElement {
    const view = new DataView(buffer);
    const magic = view.getUint16(0, true);
    if (magic !== 0x4d42) {
      throw new Error(`Not a BMP file, magic: 0x${magic.toString(16)}`);
    }

    const width = view.getInt32(18, true);
    const height = Math.abs(view.getInt32(22, true));
    const isBottomUp = view.getInt32(22, true) > 0;
    const bitCount = view.getUint16(28, true);

    if (bitCount !== 8 && bitCount !== 24 && bitCount !== 32) {
      throw new Error(
        `Unsupported BMP bit count: ${bitCount}-bit. Supported: 8, 24, 32.`,
      );
    }

    const offsetToPixels = view.getUint32(10, true);
    const infoHeaderSize = view.getUint32(14, true);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(width, height);

    if (bitCount === 8) {
      const offsetToPalette = 14 + infoHeaderSize;
      const palette: { r: number; g: number; b: number }[] = [];
      const numColors = 256;
      for (let i = 0; i < numColors; i++) {
        const pIdx = offsetToPalette + i * 4;
        palette.push({
          b: view.getUint8(pIdx),
          g: view.getUint8(pIdx + 1),
          r: view.getUint8(pIdx + 2),
        });
      }

      const rowSize = Math.floor((8 * width + 31) / 32) * 4;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const bmpY = isBottomUp ? height - 1 - y : y;
          const pixelOffset = offsetToPixels + bmpY * rowSize + x;
          const paletteIndex = view.getUint8(pixelOffset);
          const color = palette[paletteIndex];
          const targetIndex = (y * width + x) * 4;
          this.setPixel(imageData, targetIndex, color.r, color.g, color.b);
        }
      }
    } else if (bitCount === 24) {
      const rowSize = Math.floor((24 * width + 31) / 32) * 4;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const bmpY = isBottomUp ? height - 1 - y : y;
          const pixelOffset = offsetToPixels + bmpY * rowSize + x * 3;
          const b = view.getUint8(pixelOffset);
          const g = view.getUint8(pixelOffset + 1);
          const r = view.getUint8(pixelOffset + 2);
          const targetIndex = (y * width + x) * 4;
          this.setPixel(imageData, targetIndex, r, g, b);
        }
      }
    } else if (bitCount === 32) {
      // 32-bit BMPs usually don't have row padding as they are already 4-byte aligned
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const bmpY = isBottomUp ? height - 1 - y : y;
          const pixelOffset = offsetToPixels + (bmpY * width + x) * 4;
          const b = view.getUint8(pixelOffset);
          const g = view.getUint8(pixelOffset + 1);
          const r = view.getUint8(pixelOffset + 2);
          const targetIndex = (y * width + x) * 4;
          this.setPixel(imageData, targetIndex, r, g, b);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Sets a pixel's color in ImageData, applying transparency if it matches the transparency color.
   */
  private setPixel(
    imageData: ImageData,
    index: number,
    r: number,
    g: number,
    b: number,
  ): void {
    imageData.data[index] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;

    if (
      this.transparencyColor &&
      r === this.transparencyColor.r &&
      g === this.transparencyColor.g &&
      b === this.transparencyColor.b
    ) {
      imageData.data[index + 3] = 0;
    } else {
      imageData.data[index + 3] = 255;
    }
  }

  /**
   * Draws a specific frame onto the provided 2D rendering context.
   * Handles layering and scaling.
   *
   * @param ctx - The destination canvas context.
   * @param frame - The definition of the frame to draw.
   * @param x - Horizontal position to draw at.
   * @param y - Vertical position to draw at.
   * @param scale - Scaling factor (default 1).
   */
  public drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: FrameDefinition,
    x: number,
    y: number,
    scale: number = 1,
  ): void {
    if (!frame.images) return;

    // Draw images in reverse order as per the original implementation (back-to-front layering)
    for (let i = frame.images.length - 1; i >= 0; i--) {
      const imgDef = frame.images[i];

      if (this.spriteSheet && this.definition.atlas) {
        const atlasEntry = this.definition.atlas[imgDef.filename];
        if (atlasEntry) {
          const trimX = atlasEntry.trimX || 0;
          const trimY = atlasEntry.trimY || 0;
          ctx.drawImage(
            this.spriteSheet,
            atlasEntry.x,
            atlasEntry.y,
            atlasEntry.w,
            atlasEntry.h,
            x + (imgDef.offsetX + trimX) * scale,
            y + (imgDef.offsetY + trimY) * scale,
            atlasEntry.w * scale,
            atlasEntry.h * scale,
          );
          continue;
        }
      }

      const sprite = this.sprites.get(imgDef.filename);
      if (sprite) {
        ctx.drawImage(
          sprite,
          x + imgDef.offsetX * scale,
          y + imgDef.offsetY * scale,
          sprite.width * scale,
          sprite.height * scale,
        );
      }
    }
  }

  /**
   * Draws a specific mouth overlay onto the provided 2D rendering context.
   *
   * @param ctx - The destination canvas context.
   * @param mouth - The definition of the mouth shape to draw.
   * @param x - Horizontal position.
   * @param y - Vertical position.
   * @param scale - Scaling factor.
   */
  public drawMouth(
    ctx: CanvasRenderingContext2D,
    mouth: MouthDefinition,
    x: number,
    y: number,
    scale: number = 1,
  ): void {
    if (this.spriteSheet && this.definition.atlas) {
      const atlasEntry = this.definition.atlas[mouth.filename];
      if (atlasEntry) {
        const trimX = atlasEntry.trimX || 0;
        const trimY = atlasEntry.trimY || 0;
        ctx.drawImage(
          this.spriteSheet,
          atlasEntry.x,
          atlasEntry.y,
          atlasEntry.w,
          atlasEntry.h,
          x + (mouth.offsetX + trimX) * scale,
          y + (mouth.offsetY + trimY) * scale,
          atlasEntry.w * scale,
          atlasEntry.h * scale,
        );
        return;
      }
    }

    const sprite = this.sprites.get(mouth.filename);
    if (sprite) {
      ctx.drawImage(
        sprite,
        x + mouth.offsetX * scale,
        y + mouth.offsetY * scale,
        sprite.width * scale,
        sprite.height * scale,
      );
    }
  }

  /**
   * Gets the base width of the character sprite.
   */
  public getSpriteWidth(): number {
    return this.definition.character.width;
  }

  /**
   * Gets the base height of the character sprite.
   */
  public getSpriteHeight(): number {
    return this.definition.character.height;
  }
}
