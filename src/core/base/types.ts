/**
 * Represents the general configuration and metadata of an agent character.
 */
export interface Character {
  /** A list of localized information about the character (name, description, etc.). */
  infos: Info[];
  /** Unique identifier for the character. */
  guid: string;
  /** Width of each animation frame in pixels. */
  width: number;
  /** Height of each animation frame in pixels. */
  height: number;
  /** The index in the color table used for transparency. */
  transparency: number;
  /** The default duration for frames in units of 10ms. */
  defaultFrameDuration: number;
  /** Bitmask of character styles (see CharacterStyle). */
  style: number;
  /** Path to the bitmap file containing the color palette. */
  colorTable: string;
}

/**
 * Constants for the character style bitmask.
 */
export const CharacterStyle = {
  /** No specific style applied. */
  None: 0,
  /** Character does not support voice output. */
  VoiceNone: 0x0001,
  /** Balloon should have rounded rectangles. */
  BalloonRoundRect: 0x0002,
  /** Balloon should automatically size itself to fit the text. */
  BalloonSizeToText: 0x0004,
  /** Balloon should automatically hide when speech is complete. */
  BalloonAutoHide: 0x0008,
  /** Balloon should automatically pace the text display. */
  BalloonAutoPace: 0x0010,
  /** Character supports Text-to-Speech (TTS). */
  VoiceTTS: 0x0020,
  /** Character is a system-level agent. */
  SystemChar: 0x0040,
} as const;

/**
 * Configuration for the speech balloon.
 */
export interface Balloon {
  /** Number of lines of text to display in the balloon. */
  numLines: number;
  /** Number of characters per line. */
  charsPerLine: number;
  /** Font family name used in the balloon. */
  fontName: string;
  /** Height of the font in points/pixels. */
  fontHeight: number;
  /** Foreground (text) color as a hex string or Win32 BGR color. */
  foreColor: string;
  /** Background color as a hex string or Win32 BGR color. */
  backColor: string;
  /** Border color as a hex string or Win32 BGR color. */
  borderColor: string;
}

/**
 * Represents a single layer (image) within an animation frame.
 */
export interface ImageDefinition {
  /** Filename of the .bmp image. */
  filename: string;
  /** Horizontal offset of the image layer. */
  offsetX: number;
  /** Vertical offset of the image layer. */
  offsetY: number;
}

/**
 * Represents a probabilistic branch to another frame.
 */
export interface BranchingDefinition {
  /** The 1-based index of the frame to branch to. */
  branchTo: number;
  /** The probability (0-100) of taking this branch. */
  probability: number;
}

/**
 * Represents a single frame within an animation.
 */
export interface FrameDefinition {
  /** Duration of the frame in units of 10ms. A duration of 0 indicates a logic frame. */
  duration: number;
  /** Name of the sound effect file to play when this frame starts. */
  soundEffect?: string;
  /** The 1-based index of the frame to jump to if the animation is interrupted. */
  exitBranch?: number;
  /** A list of layers that compose this frame. */
  images: ImageDefinition[];
  /** A list of potential branches from this frame. */
  branching?: BranchingDefinition[];
}

/**
 * Represents a collection of frames that form a specific animation.
 */
export interface Animation {
  /** The unique name of the animation. */
  name: string;
  /** Type of transition between animations (legacy property). */
  transitionType: number;
  /** Sequential list of frame definitions. */
  frames: FrameDefinition[];
}

/**
 * Represents a logical state that groups several animations (e.g., "IdlingLevel1").
 */
export interface State {
  /** The name of the state. */
  name: string;
  /** A list of animation names associated with this state. */
  animations: string[];
}

/**
 * Localized information about the agent character.
 */
export interface Info {
  /** ISO language code (e.g., "en-US"). */
  languageCode: string;
  /** Locale object for internationalization. */
  locale: Intl.Locale;
  /** Localized name of the character. */
  name: string;
  /** Localized description of the character. */
  description: string;
  /** Localized greeting phrases. */
  greetings: string[];
  /** Localized reminder phrases. */
  reminders: string[];
}

/**
 * Metadata for a single sprite within a texture atlas.
 */
export interface AtlasEntry {
  /** Horizontal position in the atlas. */
  x: number;
  /** Vertical position in the atlas. */
  y: number;
  /** Width in the atlas. */
  w: number;
  /** Height in the atlas. */
  h: number;
  /** Pre-trimmed horizontal offset. */
  trimX?: number;
  /** Pre-trimmed vertical offset. */
  trimY?: number;
}

/**
 * Metadata for a sound clip within an audio atlas/sprite.
 */
export interface AudioAtlasEntry {
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
}

/**
 * The complete, root definition of an agent character, usually parsed from an .acd file.
 */
/**
 * Configuration options for creating an Agent.
 */
export interface AgentOptions {
  /** The parent element for the agent. If not provided, a div will be appended to document.body. */
  container?: HTMLElement;
  /** The base URL for the agent assets (.acd, images, audio). */
  baseUrl?: string;
  /** The scaling factor for the agent (default: 1). */
  scale?: number;
  /** Multiplier for animation speed (default: 1). */
  speed?: number;
  /** Milliseconds between idle behavior checks (default: 5000). */
  idleIntervalMs?: number;
  /** Whether to enable sound effects (default: true). */
  useAudio?: boolean;
  /** Whether to use CSS 'fixed' (true) or 'absolute' (false) positioning (default: true). */
  fixed?: boolean;
  /** Whether the agent should automatically reposition itself to stay within the viewport on resize (default: true). */
  keepInViewport?: boolean;
  /** Initial horizontal position in pixels. */
  x?: number;
  /** Initial vertical position in pixels. */
  y?: number;
  /** Optional initial animation to play instead of 'Showing'. */
  initialAnimation?: string;
  /** Callback for loading progress. */
  onProgress?: (progress: {
    loaded: number;
    total: number;
    filename: string;
  }) => void;
  /** AbortSignal to cancel loading. */
  signal?: AbortSignal;
  /** Whether to use the in-memory cache (default: true). */
  useCache?: boolean;
}

export interface AgentCharacterDefinition {
  /** General character properties. */
  character: Character;
  /** Speech balloon settings. */
  balloon: Balloon;
  /** Dictionary of animations indexed by name. */
  animations: Record<string, Animation>;
  /** Dictionary of states indexed by name. */
  states: Record<string, State>;
  /** Optional texture atlas mapping for optimized image loading. */
  atlas?: Record<string, AtlasEntry>;
  /** Optional audio atlas mapping for optimized sound loading. */
  audioAtlas?: Record<string, AudioAtlasEntry>;
}

/**
 * Request status codes mirroring the original Microsoft Agent implementation.
 */
export const RequestStatus = {
  /** The request has completed successfully. */
  Complete: 0,
  /** The request failed to complete. */
  Failed: 1,
  /** The request is still in the queue waiting to be processed. */
  Pending: 2,
  /** The request was interrupted before it could complete. */
  Interrupted: 3,
  /** The request is currently being processed. */
  InProgress: 4,
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

/**
 * Represents an asynchronous character action request.
 */
export interface AgentRequest {
  /** Unique identifier for the request. */
  readonly id: number;
  /** The current status of the request. */
  readonly status: RequestStatus;
  /** A promise that resolves when the request completes, fails, or is interrupted. */
  readonly promise: Promise<void>;
  /** Whether the request has been cancelled (interrupted or failed). */
  readonly isCancelled: boolean;
  /** Allows the request to be awaited directly. */
  then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2>;
}
