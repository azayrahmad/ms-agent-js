/**
 * TTS voice gender (VOICEINFO).
 */
export const VoiceGender = {
  /** Unknown or unspecified gender. */
  Unknown: 0,
  /** Female voice. */
  Female: 1,
  /** Male voice. */
  Male: 2,
} as const;

export type VoiceGender = (typeof VoiceGender)[keyof typeof VoiceGender];

/**
 * Represents the general configuration and metadata of an agent character (ACSCHARACTERINFO).
 */
export interface Character {
  /** A list of localized information about the character (name, description, etc.). */
  infos: Info[];
  /** Unique identifier (GUID) for the character. */
  guid: string;
  /** Width of each animation frame in pixels. */
  width: number;
  /** Height of each animation frame in pixels. */
  height: number;
  /** The 0-based index in the color table used for transparency. */
  transparency: number;
  /** The default duration for frames in units of 10ms (1/100 seconds). */
  defaultFrameDuration: number;
  /** Bitmask of character styles (see CharacterStyle). Maps to ACS Flags. */
  style: number;
  /** Major version of the character. */
  majorVersion?: number;
  /** Minor version of the character. */
  minorVersion?: number;
  /** Major version of the animation set (Standard Animation Set). Usually 2. */
  animationSetMajorVersion?: number;
  /** Minor version of the animation set. Usually 0. */
  animationSetMinorVersion?: number;
  /** Path to the bitmap file containing the color palette (PALETTECOLOR). */
  colorTable: string;
  /** Path to the icon file (TRAYICON). */
  icon?: string;
  /** TTS engine identifier (GUID). */
  ttsEngineID?: string;
  /** TTS mode identifier (GUID). */
  ttsModeID?: string;
  /** TTS language identifier (LANGID). */
  ttsLangID?: string;
  /** TTS gender (1 = female, 2 = male, etc.). See VoiceGender. */
  ttsGender?: number;
  /** TTS age in years. */
  ttsAge?: number;
  /** TTS style (e.g., "Normal", "Whisper"). */
  ttsStyle?: string;
  /** TTS speed in words per minute. */
  ttsSpeed?: number;
  /** TTS pitch in Hertz. */
  ttsPitch?: number;
}

/**
 * Constants for the character style bitmask.
 * These constants are based on the .acd file format (AXS_* flags) and mapped from ACS Flags.
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
  /** Character supports Text-To-Speech. */
  VoiceTTS: 0x0020,
  /** Character is a system character. */
  SystemChar: 0x0040,
} as const;

/**
 * Balloon style bitmask (extracted from ACS Flags bits 16-18).
 */
export const BalloonStyle = {
  /** Size the balloon to the text (bit 16). */
  SizeToText: 0x01,
  /** Do not automatically hide the balloon (bit 17). */
  AutoHideDisabled: 0x02,
  /** Do not automatically pace the text display (bit 18). */
  AutoPaceDisabled: 0x04,
} as const;

export type BalloonStyle = (typeof BalloonStyle)[keyof typeof BalloonStyle];

/**
 * Configuration for the speech balloon (BALLOONINFO).
 */
export interface Balloon {
  /** Number of lines of text to display in the balloon. */
  numLines: number;
  /** Number of characters per line. */
  charsPerLine: number;
  /** Font family name used in the balloon. */
  fontName: string;
  /** Height of the font in points/pixels (Font Height in logical units). */
  fontHeight: number;
  /** Foreground (text) color as a hex string or Win32 BGR color (RGBQUAD). */
  foreColor: string;
  /** Background color as a hex string or Win32 BGR color (RGBQUAD). */
  backColor: string;
  /** Border color as a hex string or Win32 BGR color (RGBQUAD). */
  borderColor: string;
  /** Font weight (range 0 - 1000). 400 = normal, 700 = bold. */
  fontWeight?: number;
  /** Whether the font is italicized. */
  italicized?: boolean;
  /** Whether the font is underlined. */
  underline?: boolean;
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
 * Mouth overlay types for speech synchronization (ACSOVERLAYINFO).
 */
export const MouthType = {
  /** Mouth closed. */
  Closed: "closed",
  /** Mouth wide open 1. */
  WideOpen1: "wideopen1",
  /** Mouth wide open 2. */
  WideOpen2: "wideopen2",
  /** Mouth wide open 3. */
  WideOpen3: "wideopen3",
  /** Mouth wide open 4. */
  WideOpen4: "wideopen4",
  /** Mouth medium open. */
  Medium: "medium",
  /** Mouth narrow open. */
  Narrow: "narrow",
} as const;

export type MouthType = (typeof MouthType)[keyof typeof MouthType];

/**
 * Represents a specialized mouth shape overlay (ACSOVERLAYINFO).
 */
export interface MouthDefinition extends ImageDefinition {
  /** Whether to replace the top-most image of the frame instead of overlaying. */
  replaceTopImage?: boolean;
  /** Explicit width of the mouth shape in pixels. Note: ACS spec uses halved values. */
  width?: number;
  /** Explicit height of the mouth shape in pixels. Note: ACS spec uses halved values. */
  height?: number;
}

/**
 * Represents a probabilistic branch to another frame (BRANCHINFO).
 */
export interface BranchingDefinition {
  /** The 1-based index of the frame to jump to. */
  branchTo: number;
  /** The probability percentage (0-100) of taking this branch. */
  probability: number;
}

/**
 * Represents a single frame within an animation (ACSFRAMEINFO).
 */
export interface FrameDefinition {
  /** Duration of the frame in units of 1/100 seconds (10ms). A duration of 0 indicates a logic frame. */
  duration: number;
  /** Name of the sound effect file (RIFF AUDIO) to play when this frame starts. */
  soundEffect?: string;
  /**
   * The 1-based index of the frame to jump to if the animation is interrupted.
   * An index of -2 indicates special end-of-animation behavior.
   */
  exitBranch?: number;
  /** A list of layers (ACSFRAMEIMAGE) that compose this frame. */
  images: ImageDefinition[];
  /** Dictionary of mouth shapes (ACSOVERLAYINFO) indexed by type (MouthType). */
  mouths?: Record<string, MouthDefinition>;
  /** A list of potential branches (BRANCHINFO) from this frame. */
  branching?: BranchingDefinition[];
}

/**
 * Transition types between animations (ACSANIMATIONINFO).
 */
export const TransitionType = {
  /** Play the return animation specified in the animation definition. */
  Return: 0,
  /** Use the exit branches defined in the frames. */
  Exit: 1,
  /** No transition animation; just end or loop. */
  None: 2,
} as const;

export type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];

/**
 * Represents a collection of frames that form a specific animation (ACSANIMATIONINFO).
 */
export interface Animation {
  /** The unique name of the animation. */
  name: string;
  /** Type of transition between animations. See TransitionType. */
  transitionType: TransitionType | number;
  /** The name of the animation to return to (used when TransitionType is Return). */
  returnAnimation?: string;
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
