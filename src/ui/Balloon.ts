import { type AgentCharacterDefinition, CharacterStyle } from "../core/base/types";
import { formatColor } from "../utils";

/**
 * Options for Text-to-Speech (TTS) output.
 */
export interface TTSOptions {
  /** The voice to use for speech synthesis. */
  voice?: SpeechSynthesisVoice | null;
  /** Speech rate multiplier (0.1 to 10). */
  rate?: number;
  /** Speech pitch (0 to 2). */
  pitch?: number;
  /** Speech volume (0 to 1). */
  volume?: number;
}

/**
 * Enum for the quadrant where the balloon tip is located.
 */
const TipQuadrant = {
  Top: 0,
  Right: 1,
  Bottom: 2,
  Left: 3,
} as const;

type TipQuadrant = (typeof TipQuadrant)[keyof typeof TipQuadrant];

// Constants for balloon rendering and spacing
const TIP_DEPTH = 17;
const TIP_SPACING = 10;
const TIP_MIDDLE = TIP_SPACING / 2;
const CORNER_RX = 7.5;
const CORNER_RY = 11.5;
const CORNER_SPACING_X = 9;
const CORNER_SPACING_Y = 12;
const BALLOON_MARGIN = 15;

/**
 * Balloon class for rendering speech bubbles using procedural SVG.
 * Supports character-by-character typing, TTS synchronization, and automatic repositioning.
 */
export class Balloon {
  /** The element the balloon is pointing to (the agent canvas). */
  private _targetEl: HTMLElement;
  /** The main balloon container element. */
  private _balloonEl: HTMLElement;
  /** The container for the text/HTML content. */
  private _contentEl: HTMLElement;
  /** The SVG element used for drawing the balloon shape. */
  private _svgEl: SVGSVGElement;
  /** The SVG path representing the balloon outline and tip. */
  private _pathEl: SVGPathElement;
  /** The character definition for balloon styling. */
  private _definition: AgentCharacterDefinition;

  private _hidden: boolean = true;
  private _active: boolean = false;
  private _hold: boolean = false;
  private _hidingTimeout: number | null = null;
  private _loopTimeout: number | null = null;
  private _completeCallback: (() => void) | null = null;
  private _addChar: (() => void) | null = null;

  private _ttsEnabled: boolean = !!window.speechSynthesis;
  private _ttsUserEnabled: boolean = this._ttsEnabled;
  private _currentUtterance: SpeechSynthesisUtterance | null = null;
  private _ttsOptions: Required<TTSOptions> = {
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  private _ttsFallbackTimer: number | null = null;
  private _mobileTTSTimer: number | null = null;

  /** Callback triggered when the balloon is hidden. */
  public onHide: (() => void) | null = null;
  /** Callback triggered when a word or character boundary is reached during speech. */
  public onSpeak: ((text: string, charIndex: number) => void) | null = null;

  /** Time in milliseconds to wait between typing each character. */
  public CHAR_SPEAK_TIME = 50;
  /** Delay in milliseconds before automatically closing the balloon after speech. */
  public CLOSE_BALLOON_DELAY = 2000;

  /** Relative position of the tip along the balloon edge. */
  private _tipPosition: number = 0;
  /** Which side of the balloon the tip is on. */
  private _tipType: TipQuadrant = TipQuadrant.Top as TipQuadrant;

  /**
   * @param targetEl - The element the balloon should point to.
   * @param container - The parent container (usually a ShadowRoot).
   * @param definition - The character definition.
   */
  constructor(
    targetEl: HTMLElement,
    container: HTMLElement | ShadowRoot,
    definition: AgentCharacterDefinition,
  ) {
    this._targetEl = targetEl;
    this._definition = definition;

    this._balloonEl = document.createElement("div");
    this._balloonEl.className = "clippy-balloon";
    this._balloonEl.style.display = "none";
    this._balloonEl.style.position = "absolute";
    this._balloonEl.style.background = "none";
    this._balloonEl.style.border = "none";
    this._balloonEl.style.padding = "0";
    this._balloonEl.style.boxShadow = "none";

    this._svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svgEl.style.position = "absolute";
    this._svgEl.style.top = "0";
    this._svgEl.style.left = "0";
    this._svgEl.style.width = "100%";
    this._svgEl.style.height = "100%";
    this._svgEl.style.overflow = "visible";
    this._svgEl.style.pointerEvents = "none";

    this._pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this._pathEl.setAttribute("stroke", formatColor(definition.balloon.borderColor));
    this._pathEl.setAttribute("fill", formatColor(definition.balloon.backColor));
    this._pathEl.setAttribute("stroke-width", "1");
    this._svgEl.appendChild(this._pathEl);

    this._balloonEl.appendChild(this._svgEl);

    this._contentEl = document.createElement("div");
    this._contentEl.className = "clippy-content";
    this._contentEl.style.position = "relative";
    this._contentEl.style.zIndex = "1";
    this._contentEl.style.color = formatColor(definition.balloon.foreColor);
    this._contentEl.style.fontFamily = definition.balloon.fontName || "Arial";
    this._contentEl.style.fontSize = `${definition.balloon.fontHeight}px`;
    this._contentEl.style.boxSizing = "border-box";
    this._contentEl.style.display = "flex";
    this._contentEl.style.flexDirection = "column";
    this._contentEl.style.justifyContent = "space-between";

    this._balloonEl.appendChild(this._contentEl);
    container.appendChild(this._balloonEl);
  }

  /**
   * Recalculates the balloon's size and position relative to the target element.
   * Chooses the best quadrant (Top, Bottom, Left, Right) to keep the balloon on-screen.
   */
  public reposition() {
    const rect = this._targetEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w === 0 || h === 0) return;

    // Show balloon briefly to measure
    const wasHidden = this._hidden;
    this._balloonEl.style.visibility = "hidden";
    this._balloonEl.style.display = "block";
    this._balloonEl.style.opacity = "0";

    const style = this._definition.character.style;
    const sizeToText = !!(style & CharacterStyle.BalloonSizeToText);

    // Set width based on charsPerLine if defined
    const charWidth = 8;
    const maxWidth =
      this._definition.balloon.charsPerLine > 0
        ? Math.max(100, this._definition.balloon.charsPerLine * charWidth)
        : 250;

    const fontSize = this._definition.balloon.fontHeight || 12;
    const lineHeight = fontSize * 1.4;

    // First measurement pass: find required size
    this._contentEl.style.display = "flex";
    this._contentEl.style.flexDirection = "column";
    this._contentEl.style.width = "max-content";
    this._contentEl.style.maxWidth = `${maxWidth}px`;
    this._contentEl.style.height = "auto";
    this._contentEl.style.maxHeight = "none";
    this._contentEl.style.overflow = "visible";
    this._contentEl.style.minHeight = "0";

    let bW = Math.ceil(this._contentEl.getBoundingClientRect().width) || 100;
    let bH = Math.ceil(this._contentEl.getBoundingClientRect().height) || 40;

    // Fixed size constraints
    if (!sizeToText) {
        const numLines = this._definition.balloon.numLines || 2;
        const minH = numLines * lineHeight + CORNER_SPACING_Y * 2;
        bH = Math.max(bH, minH);
    }

    // Lock dimensions for typing
    this._contentEl.style.width = "100%";
    this._contentEl.style.height = "100%";
    this._contentEl.style.maxWidth = "none";
    this._contentEl.style.maxHeight = "none";

    // Positioning algorithm: choose quadrant based on available space
    const topSpace = rect.top;
    const bottomSpace = window.innerHeight - rect.bottom;
    const leftSpace = rect.left;
    const rightSpace = window.innerWidth - rect.right;

    let tq: TipQuadrant = TipQuadrant.Bottom; // Default: balloon ABOVE agent
    if (topSpace < bH + TIP_DEPTH + BALLOON_MARGIN && bottomSpace > topSpace) {
      tq = TipQuadrant.Top; // Balloon BELOW agent
    }
    // Check if vertical space is tight
    if (topSpace < bH + TIP_DEPTH + BALLOON_MARGIN && bottomSpace < bH + TIP_DEPTH + BALLOON_MARGIN) {
      if (leftSpace > rightSpace) {
        tq = TipQuadrant.Right; // Balloon is LEFT of agent, tip is on RIGHT
      } else {
        tq = TipQuadrant.Left; // Balloon is RIGHT of agent, tip is on LEFT
      }
    }

    this._tipType = tq;

    // The container represents the body plus extra space for the tip/padding.
    let containerW = bW;
    let containerH = bH + TIP_DEPTH;

    this._balloonEl.style.width = `${containerW}px`;
    this._balloonEl.style.height = `${containerH}px`;

    const agentCenterX = w / 2;
    const agentCenterY = h / 2;

    let relLeft = 0;
    let relTop = 0;

    // Ideal positions relative to target (0,0 is agent top-left).
    if (tq === TipQuadrant.Bottom) {
        relLeft = agentCenterX - bW / 2;
        relTop = -bH - BALLOON_MARGIN;
    } else if (tq === TipQuadrant.Top) {
        relLeft = agentCenterX - bW / 2;
        relTop = h + BALLOON_MARGIN;
    } else if (tq === TipQuadrant.Left) {
        relLeft = w + BALLOON_MARGIN;
        relTop = agentCenterY - bH / 2;
    } else if (tq === TipQuadrant.Right) {
        relLeft = -bW - BALLOON_MARGIN;
        relTop = agentCenterY - bH / 2;
    }

    // Adjust relLeft/relTop to keep on screen
    let absLeft = rect.left + relLeft;
    let absTop = rect.top + relTop;

    if (absLeft < 10) {
      relLeft += 10 - absLeft;
      absLeft = 10;
    }
    if (absLeft + containerW > window.innerWidth - 10) {
      relLeft -= (absLeft + containerW) - (window.innerWidth - 10);
      absLeft = window.innerWidth - 10 - containerW;
    }

    if (absTop < 10) {
      relTop += 10 - absTop;
      absTop = 10;
    }
    if (absTop + containerH > window.innerHeight - 10) {
      relTop -= (absTop + containerH) - (window.innerHeight - 10);
      absTop = window.innerHeight - 10 - containerH;
    }

    this._balloonEl.style.left = `${relLeft}px`;
    this._balloonEl.style.top = `${relTop}px`;

    // Calculate tip position in balloon-body coordinates
    if (tq === TipQuadrant.Top || tq === TipQuadrant.Bottom) {
        this._tipPosition = agentCenterX - relLeft;
    } else {
        this._tipPosition = agentCenterY - relTop;
    }

    this._drawBalloon(bW, bH);

    this._balloonEl.style.display = wasHidden ? "none" : "block";
    this._balloonEl.style.visibility = "visible";
    this._balloonEl.style.opacity = "1";
  }

  /**
   * Draws the procedural SVG balloon shape based on calculated dimensions and tip position.
   */
  private _drawBalloon(w: number, h: number) {
    const tq = this._tipType;
    const tp = this._tipPosition;
    const rx = CORNER_RX;
    const ry = CORNER_RY;

    const tipEdgeSize =
      tq === TipQuadrant.Top || tq === TipQuadrant.Bottom ? w : h;
    const cornerSpacing =
      tq === TipQuadrant.Top || tq === TipQuadrant.Bottom
        ? CORNER_SPACING_X
        : CORNER_SPACING_Y;

    let tipOffset = tp - (TIP_MIDDLE + cornerSpacing);
    tipOffset = Math.max(tipOffset, 0);
    tipOffset = Math.min(
      tipOffset,
      tipEdgeSize - cornerSpacing * 2 - TIP_SPACING,
    );

    const tipStart = cornerSpacing + tipOffset;

    let path = "";

    // Offset for "raised" quadrants to move the body inside the SVG
    const offX = tq === TipQuadrant.Left ? TIP_DEPTH : 0;
    const offY = tq === TipQuadrant.Top ? TIP_DEPTH : 0;

    const getTipPath = (quadrant: TipQuadrant) => {
      if (tq !== quadrant) return "";
      if (quadrant === TipQuadrant.Top) {
        return `L ${tipStart + offX} ${offY} L ${tp + offX} 0 L ${
          tipStart + TIP_SPACING + offX
        } ${offY}`;
      }
      if (quadrant === TipQuadrant.Right) {
        return `L ${w + offX} ${tipStart + offY} L ${w + TIP_DEPTH + offX} ${tp + offY} L ${w + offX} ${
          tipStart + TIP_SPACING + offY
        }`;
      }
      if (quadrant === TipQuadrant.Bottom) {
        return `L ${tipStart + TIP_SPACING + offX} ${h + offY} L ${tp + offX} ${
          h + TIP_DEPTH + offY
        } L ${tipStart + offX} ${h + offY}`;
      }
      if (quadrant === TipQuadrant.Left) {
        return `L ${offX} ${tipStart + TIP_SPACING + offY} L 0 ${tp + offY} L ${offX} ${tipStart + offY}`;
      }
      return "";
    };

    // Construct SVG path string
    path = `M ${rx + offX} ${offY}`;
    path += getTipPath(TipQuadrant.Top);
    path += `H ${w - rx + offX} A ${rx} ${ry} 0 0 1 ${w + offX} ${ry + offY}`;
    path += getTipPath(TipQuadrant.Right);
    path += `V ${h - ry + offY} A ${rx} ${ry} 0 0 1 ${w - rx + offX} ${h + offY}`;
    path += getTipPath(TipQuadrant.Bottom);
    path += `H ${rx + offX} A ${rx} ${ry} 0 0 1 ${offX} ${h - ry + offY}`;
    path += getTipPath(TipQuadrant.Left);
    path += `V ${ry + offY} A ${rx} ${ry} 0 0 1 ${rx + offX} ${offY} Z`;

    this._contentEl.style.marginLeft = "0";
    this._contentEl.style.marginTop = "0";
    this._svgEl.style.top = "0";
    this._svgEl.style.left = "0";

    const pX = CORNER_SPACING_X;
    const pY = CORNER_SPACING_Y;
    this._contentEl.style.padding = `${pY}px ${pX}px ${pY + TIP_DEPTH}px ${pX}px`;

    if (tq === TipQuadrant.Top) {
      this._svgEl.style.top = `${-TIP_DEPTH}px`;
    } else if (tq === TipQuadrant.Left) {
      this._svgEl.style.left = `${-TIP_DEPTH}px`;
    }

    this._pathEl.setAttribute("d", path);
  }

  /**
   * Displays text in the balloon.
   *
   * @param complete - Callback fired when speech is finished.
   * @param text - The text to display.
   * @param hold - If true, the balloon won't auto-close.
   * @param useTTS - If true, will use system Text-to-Speech.
   * @param skipTyping - If true, displays text instantly without typing animation.
   * @param skipContentUpdate - If true, does not overwrite the current content of the balloon.
   */
  public speak(
    complete: () => void,
    text: string,
    hold: boolean,
    useTTS: boolean,
    skipTyping: boolean = false,
    skipContentUpdate: boolean = false,
  ) {
    this.stop();
    this._hidden = false;

    if (!skipContentUpdate) {
      // Reset styles for measurement
      this._contentEl.style.width = "";
      this._contentEl.style.height = "";
      this._contentEl.style.maxWidth = "";
      this._contentEl.style.maxHeight = "";
      this._contentEl.style.padding = `${CORNER_SPACING_Y}px ${CORNER_SPACING_X}px`;
      this._contentEl.textContent = text;
    }

    this.show();

    this._completeCallback = complete;
    this._hold = hold;

    const ttsSystemDisabled = !this._ttsEnabled || !this._ttsUserEnabled;
    const shouldSkipTyping = skipTyping || ttsSystemDisabled;

    if (shouldSkipTyping) {
      this.reposition();
      this._active = false;

      if (useTTS && !ttsSystemDisabled) {
        const onDone = () => {
          this._active = false;
          if (this._hold) {
            this._callComplete();
          } else {
            this.hide();
          }
        };
        this._speakTTS(text, null, onDone);
      } else {
        if (this._hold) {
          this._callComplete();
        } else {
          this.hide();
        }
      }
      return;
    }

    this.reposition();
    if (!skipContentUpdate) {
      this._contentEl.textContent = "";
    }

    if (useTTS) {
      this._sayCharsWithTTS(text, hold, skipContentUpdate);
    } else {
      this._sayChars(text, hold, skipContentUpdate);
    }
  }

  /**
   * Internal character-by-character typing logic (no TTS).
   */
  private _sayChars(text: string, hold: boolean, skipContentUpdate: boolean = false) {
    this._active = true;
    this._hold = hold;
    let idx = 0;

    this._addChar = () => {
      if (!this._active) return;
      if (idx >= text.length) {
        this._addChar = null;
        this._active = false;
        if (this._hold) {
          this._callComplete();
        } else {
          this.hide();
        }
      } else {
        idx++;
        if (!skipContentUpdate) {
          this._contentEl.textContent = text.slice(0, idx);
        }
        this._loopTimeout = setTimeout(
          () => this._addChar?.(),
          this.CHAR_SPEAK_TIME,
        ) as any;
      }
    };
    this._addChar();
  }

  /**
   * Internal character-by-character typing logic synchronized with TTS boundaries.
   */
  private _sayCharsWithTTS(text: string, hold: boolean, skipContentUpdate: boolean = false) {
    this._active = true;
    this._hold = hold;
    let idx = 0;

    const onTTSComplete = () => {
      this._active = false;
      if (!skipContentUpdate) {
        this._contentEl.textContent = text;
      }
      if (this._hold) {
        this._callComplete();
      } else {
        this.hide();
      }
    };

    this._speakTTS(
      text,
      (charIndex, charLength) => {
        let nextIdx = charLength ? charIndex + charLength : charIndex;
        // Include trailing punctuation/symbols (anything that's not a space)
        while (nextIdx < text.length && text[nextIdx] !== " ") {
          nextIdx++;
        }
        if (nextIdx > idx) {
          idx = nextIdx;
          if (!skipContentUpdate) {
            this._contentEl.textContent = text.slice(0, idx);
          }
        }
      },
      onTTSComplete,
    );
  }

  /**
   * Triggers the Web Speech API to speak the given text.
   */
  private _speakTTS(
    text: string,
    onBoundary: ((charIndex: number, charLength?: number) => void) | null,
    onEnd: () => void,
  ) {
    this.stopTTS();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this._ttsOptions.rate;
    utterance.pitch = this._ttsOptions.pitch;
    utterance.volume = this._ttsOptions.volume;
    if (this._ttsOptions.voice) {
      utterance.voice = this._ttsOptions.voice;
    }

    utterance.onboundary = (event) => {
      if (onBoundary) {
        onBoundary(event.charIndex, event.charLength);
      }
      this.onSpeak?.(text, event.charIndex);
    };
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Displays raw HTML in the balloon.
   *
   * @param html - The HTML string to render.
   * @param hold - If true, the balloon won't auto-close.
   */
  public showHtml(html: string, hold: boolean) {
    this.stop();
    this._hidden = false;
    this._balloonEl.style.visibility = "hidden";
    this._balloonEl.style.display = "block";

    this._contentEl.style.height = "auto";
    this._contentEl.style.width = "auto";
    this._contentEl.innerHTML = html;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.reposition();
        this._balloonEl.style.visibility = "visible";
        this._active = false;
        this._hold = hold;
      });
    });
  }

  /**
   * Makes the balloon visible.
   */
  public show() {
    if (this._hidden) return;
    this._balloonEl.style.display = "block";
    this._balloonEl.style.visibility = "visible";
    this._balloonEl.style.opacity = "1";
    this.reposition();
  }

  /**
   * Hides the balloon after a short delay.
   *
   * @param fast - If true, hides instantly without delay.
   */
  public hide(fast: boolean = false) {
    this.stop();
    if (fast) {
      this._balloonEl.style.display = "none";
      this._hidden = true;
      this.onHide?.();
      this._callComplete();
      return;
    }
    this._hidingTimeout = setTimeout(
      () => this._finishHideBalloon(),
      this.CLOSE_BALLOON_DELAY,
    ) as any;
  }

  private _finishHideBalloon() {
    if (this._active) return;
    this._balloonEl.style.display = "none";
    this._hidden = true;
    this._hidingTimeout = null;
    this.onHide?.();
    this._callComplete();
  }

  /**
   * Internal helper to trigger the completion callback safely.
   */
  private _callComplete() {
    if (this._completeCallback) {
      const cb = this._completeCallback;
      this._completeCallback = null;
      cb();
    }
  }

  /**
   * Stops any ongoing system speech.
   */
  public stopTTS() {
    if (this._currentUtterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this._currentUtterance = null;
    }
  }

  /**
   * Returns true if system TTS is enabled.
   */
  public isTTSEnabled(): boolean {
    return this._ttsUserEnabled;
  }

  /**
   * Manually enables or disables system TTS for the balloon.
   */
  public setTTSEnabled(enabled: boolean) {
    this._ttsUserEnabled = this._ttsEnabled && enabled;
  }

  /**
   * Sets the voice and style for system TTS.
   */
  public setTTSOptions(options: TTSOptions) {
    this._ttsOptions = { ...this._ttsOptions, ...options };
  }

  /**
   * Returns a list of available system TTS voices.
   */
  public getTTSVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices();
  }

  /**
   * Instantly stops all activity and closes the balloon.
   */
  public close() {
    this.stop();
    this.hide(true);
    this._callComplete();
  }

  /**
   * Stops all active typing animations and speech.
   */
  public stop() {
    this._active = false;
    this._addChar = null;
    if (this._loopTimeout) {
      clearTimeout(this._loopTimeout);
      this._loopTimeout = null;
    }
    if (this._hidingTimeout) {
      clearTimeout(this._hidingTimeout);
      this._hidingTimeout = null;
    }
    if (this._ttsFallbackTimer) {
      clearTimeout(this._ttsFallbackTimer);
      this._ttsFallbackTimer = null;
    }
    if (this._mobileTTSTimer) {
      clearTimeout(this._mobileTTSTimer);
      this._mobileTTSTimer = null;
    }
    this.stopTTS();
  }

  /**
   * Pauses all active timers (used during global agent pause).
   */
  public pause() {
    if (this._loopTimeout) clearTimeout(this._loopTimeout);
    if (this._hidingTimeout) clearTimeout(this._hidingTimeout);
    if (this._ttsFallbackTimer) clearTimeout(this._ttsFallbackTimer);
    if (this._mobileTTSTimer) clearTimeout(this._mobileTTSTimer);
  }

  /**
   * Resumes active timers.
   */
  public resume() {
    if (this._addChar) this._addChar();
    this._hidingTimeout = setTimeout(
      () => this._finishHideBalloon(),
      this.CLOSE_BALLOON_DELAY,
    ) as any;
  }

  /**
   * Returns the main balloon container element.
   */
  public get balloonEl() {
    return this._balloonEl;
  }
}
