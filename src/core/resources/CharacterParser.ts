import {
  type Character,
  type Balloon,
  type Animation,
  type FrameDefinition,
  type ImageDefinition,
  type BranchingDefinition,
  type State,
  type Info,
  CharacterStyle,
  type AgentCharacterDefinition,
} from "../base/types";

/**
 * Mapping from Windows LCID (Language Code Identifier) to BCP 47 language tags.
 * Used to translate legacy agent language codes to modern locale strings.
 */
const LCID_MAP: Record<string, string> = {
  "0x0409": "en-US", // English - United States
  "0x0809": "en-GB", // English - United Kingdom
  "0x040c": "fr-FR", // French - France
  "0x0407": "de-DE", // German - Germany
  "0x0410": "it-IT", // Italian - Italy
  "0x040a": "es-ES", // Spanish - Spain
  "0x0411": "ja-JP", // Japanese - Japan
  "0x0412": "ko-KR", // Korean - Korea
  "0x0404": "zh-TW", // Chinese - Taiwan
  "0x0804": "zh-CN", // Chinese - China
  "0x0416": "pt-BR", // Portuguese - Brazil
  "0x0419": "ru-RU", // Russian - Russia
  "0x0401": "ar-SA", // Arabic - Saudi Arabia
  "0x0403": "ca-ES", // Catalan - Spain
  "0x0405": "cs-CZ", // Czech - Czech Republic
  "0x0406": "da-DK", // Danish - Denmark
  "0x0413": "nl-NL", // Dutch - Netherlands
  "0x040b": "fi-FI", // Finnish - Finland
  "0x0408": "el-GR", // Greek - Greece
  "0x040d": "he-IL", // Hebrew - Israel
  "0x040e": "hu-HU", // Hungarian - Hungary
  "0x0414": "nb-NO", // Norwegian - Norway
  "0x0415": "pl-PL", // Polish - Poland
  "0x041d": "sv-SE", // Swedish - Sweden
  "0x041e": "th-TH", // Thai - Thailand
  "0x041f": "tr-TR", // Turkish - Turkey
  "0x0402": "bg-BG", // Bulgarian - Bulgaria
  "0x041b": "sk-SK", // Slovak - Slovakia
  "0x0424": "sl-SI", // Slovenian - Slovenia
  "0x041a": "hr-HR", // Croatian - Croatia
  "0x0418": "ro-RO", // Romanian - Romania
  "0x0421": "id-ID", // Indonesian - Indonesia
  "0x0816": "pt-PT", // Portuguese - Portugal
  "0x0c0a": "es-MX", // Spanish - Mexico
};

/**
 * CharacterParser class for parsing Microsoft Agent .acd files into AgentCharacterDefinition.
 * This class handles the complex nested structure of the legacy text-based definition format.
 */
export class CharacterParser {
  /** The current agent definition being built during the parsing process. */
  private currentAgent: Partial<AgentCharacterDefinition> = {
    animations: {},
    states: {},
    balloon: {
      numLines: 0,
      charsPerLine: 0,
      fontName: "Arial",
      fontHeight: 12,
      foreColor: "000000",
      backColor: "ffffff",
      borderColor: "000000",
    },
  };
  /** Temporary reference to the character section being parsed. */
  private currentCharacter: Character | null = null;
  /** Temporary reference to the language info section being parsed. */
  private currentLanguageInfo: Info | null = null;
  /** Temporary reference to the animation section being parsed. */
  private currentAnimation: Animation | null = null;
  /** Temporary reference to the frame section being parsed. */
  private currentFrame: FrameDefinition | null = null;
  /** Temporary reference to the state section being parsed. */
  private currentState: State | null = null;

  /**
   * Fetches an .acd file from a URL and parses it into a structured agent definition.
   *
   * @param url - The URL of the .acd file to load.
   * @param signal - Optional AbortSignal to cancel the request.
   * @returns A promise that resolves to the parsed AgentCharacterDefinition.
   * @throws Error if the fetch fails.
   */
  public static async load(
    url: string,
    signal?: AbortSignal,
  ): Promise<AgentCharacterDefinition> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load .acd file: ${response.statusText}`);
    }
    const content = await response.text();
    const parser = new CharacterParser();
    return parser.parse(content);
  }

  /**
   * Parses the string content of an .acd file.
   *
   * @param content - The raw text content of the .acd file.
   * @returns The parsed AgentCharacterDefinition.
   */
  public parse(content: string): AgentCharacterDefinition {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("//")) {
        continue;
      }

      if (line.startsWith("DefineCharacter")) {
        i = this.parseCharacterSection(lines, i);
        continue;
      }
      if (line.startsWith("DefineBalloon")) {
        i = this.parseBalloonSection(lines, i);
        continue;
      }
      if (line.startsWith("DefineAnimation")) {
        i = this.parseAnimationSection(lines, i);
        continue;
      }
      if (line.startsWith("DefineState")) {
        i = this.parseStateSection(lines, i);
        continue;
      }

      if (line === "EndCharacter") {
        break;
      }
    }

    return this.currentAgent as AgentCharacterDefinition;
  }

  /**
   * Parses the main character configuration section.
   */
  private parseCharacterSection(lines: string[], i: number): number {
    this.currentCharacter = {
      infos: [],
      guid: "",
      width: 0,
      height: 0,
      transparency: 0,
      defaultFrameDuration: 0,
      style: CharacterStyle.None,
      colorTable: "",
    };
    i++;

    while (i < lines.length && lines[i].trim() !== "EndCharacter") {
      const line = lines[i].trim();
      if (line.startsWith("DefineInfo")) {
        i = this.parseCharacterInfo(lines, i);
      }

      if (line === "EndInfo") {
        if (this.currentLanguageInfo) {
          this.currentCharacter.infos.push(this.currentLanguageInfo);
          this.currentLanguageInfo = null;
        }
      }

      // Parse key-value pairs
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/"/g, "");

        switch (key) {
          case "GUID": {
            this.currentCharacter.guid = value.replace(/{|}/g, "");
            break;
          }
          case "Width":
            this.currentCharacter.width = parseInt(value, 10);
            break;
          case "Height":
            this.currentCharacter.height = parseInt(value, 10);
            break;
          case "Transparency":
            this.currentCharacter.transparency = parseInt(value, 10);
            break;
          case "DefaultFrameDuration":
            this.currentCharacter.defaultFrameDuration = parseInt(value, 10);
            break;
          case "Style":
            this.currentCharacter.style = this.parseStyle(value);
            break;
          case "ColorTable":
            this.currentCharacter.colorTable = value.replace(/\\/g, "/");
            break;
        }
      }
      i++;
    }
    this.currentAgent.character = this.currentCharacter;
    return i;
  }

  /**
   * Parses localized character information sections.
   */
  private parseCharacterInfo(lines: string[], i: number): number {
    const line = lines[i].trim();
    const match = line.match(/0x([0-9A-Fa-f]{4})/);
    if (!match) return i;

    const lcid = `0x${match[1].toLowerCase()}`;
    const localeTag = LCID_MAP[lcid] || "en-US"; // Default to en-US if unknown

    this.currentLanguageInfo = {
      languageCode: lcid,
      locale: new Intl.Locale(localeTag),
      name: "",
      description: "",
      greetings: [],
      reminders: [],
    };

    i++;
    while (i < lines.length && lines[i].trim() !== "EndInfo") {
      const currentLine = lines[i].trim();
      const parts = currentLine.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/"/g, "");

        switch (key) {
          case "Name":
            this.currentLanguageInfo.name = value;
            break;
          case "Description":
            this.currentLanguageInfo.description = value;
            break;
          case "ExtraData":
            this.parseExtraData(value, this.currentLanguageInfo);
            break;
        }
      }
      i++;
    }

    if (this.currentLanguageInfo && this.currentCharacter) {
      this.currentCharacter.infos.push(this.currentLanguageInfo);
      this.currentLanguageInfo = null;
    }
    return i;
  }

  /**
   * Parses extra character data like greetings and reminders.
   * Uses legacy delimiters (^^ and ~~).
   */
  private parseExtraData(extraData: string, languageInfo: Info): void {
    const parts = extraData.split("^^");
    // Parse greetings (before ^^)
    languageInfo.greetings = parts[0]
      .split("~~")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    // Parse reminders (after ^^)
    if (parts.length > 1) {
      languageInfo.reminders = parts[1]
        .split("~~")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    } else {
      languageInfo.reminders = [];
    }
  }

  /**
   * Parses the character style bitmask from string labels.
   */
  private parseStyle(value: string): number {
    let style = CharacterStyle.None;
    const styleParts = value.split("|");

    for (const part of styleParts) {
      const trimmedPart = part.trim();
      if (trimmedPart === "AXS_VOICE_NONE") style |= CharacterStyle.VoiceNone;
      else if (trimmedPart === "AXS_BALLOON_ROUNDRECT")
        style |= CharacterStyle.BalloonRoundRect;
      else if (
        trimmedPart === "AXS_BALLOON_SIZE_TO_TEXT" ||
        trimmedPart === "AXS_BALLOON_SIZETOTEXT"
      )
        style |= CharacterStyle.BalloonSizeToText;
      else if (trimmedPart === "AXS_BALLOON_AUTO_HIDE")
        style |= CharacterStyle.BalloonAutoHide;
      else if (trimmedPart === "AXS_BALLOON_AUTO_PACE")
        style |= CharacterStyle.BalloonAutoPace;
      else if (trimmedPart === "AXS_VOICE_TTS") style |= CharacterStyle.VoiceTTS;
      else if (trimmedPart === "AXS_SYSTEM_CHAR")
        style |= CharacterStyle.SystemChar;
    }

    return style;
  }

  /**
   * Parses the speech balloon configuration section.
   */
  private parseBalloonSection(lines: string[], i: number): number {
    const balloon: Balloon = {
      numLines: 0,
      charsPerLine: 0,
      fontName: "",
      fontHeight: 0,
      foreColor: "00000000",
      backColor: "00000000",
      borderColor: "00000000",
    };
    i++;

    while (i < lines.length && lines[i].trim() !== "EndBalloon") {
      const line = lines[i].trim();
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();

        switch (key) {
          case "NumLines":
            balloon.numLines = parseInt(value, 10);
            break;
          case "CharsPerLine":
            balloon.charsPerLine = parseInt(value, 10);
            break;
          case "FontName":
            balloon.fontName = value.replace(/"/g, "");
            break;
          case "FontHeight":
            balloon.fontHeight = parseInt(value, 10);
            break;
          case "ForeColor":
            balloon.foreColor = value;
            break;
          case "BackColor":
            balloon.backColor = value;
            break;
          case "BorderColor":
            balloon.borderColor = value;
            break;
        }
      }
      i++;
    }

    this.currentAgent.balloon = balloon;
    return i;
  }

  /**
   * Parses an animation section, including its frames.
   */
  private parseAnimationSection(lines: string[], i: number): number {
    const line = lines[i].trim();
    const match = line.match(/DefineAnimation\s+"([^"]+)"/);
    if (!match) return i;

    this.currentAnimation = {
      name: match[1],
      transitionType: 0,
      frames: [],
    };

    i++;
    while (i < lines.length && lines[i].trim() !== "EndAnimation") {
      const currentLine = lines[i].trim();

      if (currentLine.startsWith("TransitionType")) {
        const value = currentLine.split("=")[1].trim();
        this.currentAnimation.transitionType = parseInt(value, 10);
      } else if (currentLine.startsWith("DefineFrame")) {
        i = this.parseFrameSection(lines, i);
      }

      i++;
    }

    if (this.currentAnimation && this.currentAgent.animations) {
      this.currentAgent.animations[this.currentAnimation.name] =
        this.currentAnimation;
    }
    return i;
  }

  /**
   * Parses a frame within an animation, including its images and branching logic.
   */
  private parseFrameSection(lines: string[], i: number): number {
    this.currentFrame = {
      duration: 0,
      images: [],
    };
    i++;

    while (i < lines.length && lines[i].trim() !== "EndFrame") {
      const line = lines[i].trim();

      if (line.startsWith("Duration")) {
        const value = line.split("=")[1].trim();
        this.currentFrame.duration = parseInt(value, 10);
      } else if (line.startsWith("ExitBranch")) {
        const value = line.split("=")[1].trim();
        this.currentFrame.exitBranch = parseInt(value, 10);
      } else if (line.startsWith("SoundEffect")) {
        const value = line.split("=")[1].trim().replace(/"/g, "");
        this.currentFrame.soundEffect = value;
      } else if (line.startsWith("DefineImage")) {
        i = this.parseImageSection(lines, i);
      } else if (line.startsWith("DefineBranching")) {
        i = this.parseBranchingSection(lines, i);
      }

      i++;
    }

    if (this.currentFrame && this.currentAnimation) {
      this.currentAnimation.frames.push(this.currentFrame);
    }
    return i;
  }

  /**
   * Parses an image definition (layer) within a frame.
   */
  private parseImageSection(lines: string[], i: number): number {
    const image: ImageDefinition = {
      filename: "",
      offsetX: 0,
      offsetY: 0,
    };
    i++;

    while (i < lines.length && lines[i].trim() !== "EndImage") {
      const line = lines[i].trim();
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/"/g, "");

        switch (key) {
          case "Filename":
            image.filename = value.replace(/\\/g, "/");
            break;
          case "OffsetX":
            image.offsetX = parseInt(value, 10);
            break;
          case "OffsetY":
            image.offsetY = parseInt(value, 10);
            break;
        }
      }
      i++;
    }

    if (this.currentFrame) {
      this.currentFrame.images.push(image);
    }
    return i;
  }

  /**
   * Parses branching logic within a frame, allowing for probabilistic transitions.
   */
  private parseBranchingSection(lines: string[], i: number): number {
    const branchingList: BranchingDefinition[] = [];
    let branching: Partial<BranchingDefinition> = {};
    i++;

    while (i < lines.length && lines[i].trim() !== "EndBranching") {
      const line = lines[i].trim();
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parseInt(parts.slice(1).join("=").trim(), 10);

        switch (key) {
          case "BranchTo":
            branching.branchTo = value;
            break;
          case "Probability":
            branching.probability = value;
            break;
        }
      }
      if (
        branching.branchTo !== undefined &&
        branching.probability !== undefined
      ) {
        branchingList.push(branching as BranchingDefinition);
        branching = {};
      }
      i++;
    }

    if (this.currentFrame) {
      this.currentFrame.branching = branchingList;
    }
    return i;
  }

  /**
   * Parses a state definition, which groups several animations.
   */
  private parseStateSection(lines: string[], i: number): number {
    const line = lines[i].trim();
    const match = line.match(/DefineState\s+"([^"]+)"/);
    if (!match) return i;

    this.currentState = {
      name: match[1],
      animations: [],
    };

    i++;
    while (i < lines.length && lines[i].trim() !== "EndState") {
      const currentLine = lines[i].trim();
      const parts = currentLine.split("=");
      if (parts.length >= 2 && parts[0].trim() === "Animation") {
        this.currentState.animations.push(
          parts.slice(1).join("=").trim().replace(/"/g, ""),
        );
      }
      i++;
    }

    if (this.currentState && this.currentAgent.states) {
      this.currentAgent.states[this.currentState.name] = this.currentState;
    }
    return i;
  }
}
