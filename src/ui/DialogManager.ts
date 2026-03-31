import { AgentCore } from "../core/Core";
import { AgentRenderer } from "./Renderer";
import { ensureSentenceEnd } from "../utils";

/**
 * Represents an item in the content array of an 'ask' dialog.
 */
export type AskContentItem =
  | string
  | { type: "choices"; items: string[]; style?: "bullet" | "bulb" }
  | { type: "input"; placeholder?: string; rows?: number }
  | { type: "checkbox"; label: string; checked?: boolean };

/**
 * Configuration for the interactive 'ask' dialog.
 */
export interface AskOptions {
  /** Header text for the dialog. */
  title?: string;
  /** Array of content items (text, choices, or input) in order of appearance. */
  content?: AskContentItem[];
  /** Array of button definitions to appear at the bottom. */
  buttons?: (
    | string
    | { label: string; value: any; bullet?: "bullet" | "bulb" }
  )[];
  /** Auto-cancel timeout in milliseconds (default: 60000). */
  timeout?: number;
  /** Optional animation to play while the dialog is active. */
  animation?: string;
}

/**
 * Manager responsible for handling interactive speech balloon dialogs.
 */
export class DialogManager {
  private core: AgentCore;
  private renderer: AgentRenderer;
  private startTalkingAnimation: (animName?: string) => void;

  constructor(
    core: AgentCore,
    renderer: AgentRenderer,
    startTalkingAnimation: (animName?: string) => void,
  ) {
    this.core = core;
    this.renderer = renderer;
    this.startTalkingAnimation = startTalkingAnimation;
  }

  /**
   * Asks the user a question with an interactive dialog in the balloon.
   */
  public ask(
    options: AskOptions = {},
  ): Promise<{
    value: any;
    text: string | null;
    checked: boolean | null;
  } | null> {
    const title = options.title || "";
    const content = options.content || [];
    const buttons = options.buttons || [];
    const timeout = options.timeout !== undefined ? options.timeout : 60000;

    let resolveAsk: (
      value: {
        value: any;
        text: string | null;
        checked: boolean | null;
      } | null,
    ) => void;
    const askPromise = new Promise<{
      value: any;
      text: string | null;
      checked: boolean | null;
    } | null>((res) => {
      resolveAsk = res;
    });

    const self = this;

    this.core.requestQueue.add(async (request) => {
      if (request.isCancelled) {
        resolveAsk(null);
        return;
      }

      this.core.emit("requestStart" as any, request);

      let inputBalloonTimeout: number | null = null;
      let resolved = false;
      let choicePage = 0;
      const choicesPerPage = 3;

      return new Promise<void>((resolveQueue) => {
        // --- Inner helper functions (hoisted by function keyword) ---

        function finish(
          value: {
            value: any;
            text: string | null;
            checked: boolean | null;
          } | null,
        ) {
          if (resolved) return;
          resolved = true;
          self.renderer.balloon.onHide = null;
          if (self.core.stateManager.currentStateName === "Speaking") {
            self.core.animationManager.isExitingFlag = true;
            self.core.stateManager.handleAnimationCompleted();
          }
          detachEvents();
          if (inputBalloonTimeout) {
            clearTimeout(inputBalloonTimeout);
            inputBalloonTimeout = null;
          }
          resolveAsk(value);
          self.core.emit("requestComplete" as any, request);
          resolveQueue();
        }

        function detachEvents() {
          const balloonEl = self.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
          const choicesLists = Array.from(
            balloonEl.querySelectorAll(".clippy-choices"),
          ) as HTMLUListElement[];
          const customButtons = Array.from(
            balloonEl.querySelectorAll(".custom-button"),
          ) as HTMLButtonElement[];

          input?.removeEventListener("keypress", handleKeypress);
          input?.removeEventListener("focus", handleFocus);
          input?.removeEventListener("blur", handleBlur);
          choicesLists.forEach((list) =>
            list.removeEventListener("click", handleChoiceClick),
          );
          customButtons.forEach((btn) =>
            btn.removeEventListener("click", handleCustomButtonClick),
          );
        }

        function handleKeypress(e: KeyboardEvent) {
          resetBalloonTimeout();
          if (e.key === "Enter") {
            e.preventDefault();
            const balloonEl = self.renderer.balloon.balloonEl;
            const customButtons = Array.from(
              balloonEl.querySelectorAll(".custom-button"),
            ) as HTMLButtonElement[];
            if (customButtons.length > 0) {
              customButtons[0].click();
            }
          }
        }

        function handleChoiceClick(e: MouseEvent) {
          resetBalloonTimeout();
          const target = e.target as HTMLElement;
          const li = target.closest("li");
          if (!li) return;

          const action = li.getAttribute("data-action");
          if (action === "next") {
            choicePage++;
            refreshContent();
            return;
          }
          if (action === "prev") {
            choicePage--;
            refreshContent();
            return;
          }

          if (li.hasAttribute("data-index")) {
            const index = parseInt(li.getAttribute("data-index") || "0");
            const balloonEl = self.renderer.balloon.balloonEl;
            const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
            const checkbox = balloonEl.querySelector(
              ".ask-checkbox",
            ) as HTMLInputElement | null;
            const text = input ? input.value || null : null;
            const checked = checkbox ? !!checkbox.checked : null;
            finish({ value: index, text, checked });
            self.renderer.balloon.close();
          }
        }

        function handleCustomButtonClick(e: MouseEvent) {
          const btn = e.currentTarget as HTMLButtonElement;
          const index = parseInt(btn.getAttribute("data-index") || "0");
          const buttonDef = buttons[index];
          const value = typeof buttonDef === "string" ? buttonDef : buttonDef.value;

          const balloonEl = self.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
          const checkbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          const text = input ? input.value || null : null;
          const checked = checkbox ? !!checkbox.checked : null;

          if (value === null) {
            finish(null);
          } else {
            finish({ value, text, checked });
          }
          self.renderer.balloon.close();
        }

        function handleFocus() {
          self.startTalkingAnimation("Writing");
        }

        function handleBlur() {
          self.startTalkingAnimation(options.animation);
          self.renderer.balloon.reposition();
        }

        function resetBalloonTimeout() {
          if (inputBalloonTimeout) {
            clearTimeout(inputBalloonTimeout);
            inputBalloonTimeout = null;
          }
          if (timeout > 0) {
            inputBalloonTimeout = window.setTimeout(() => {
              finish(null);
              self.renderer.balloon.close();
            }, timeout);
          }
        }

        function attachEvents() {
          const balloonEl = self.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
          const choicesLists = Array.from(
            balloonEl.querySelectorAll(".clippy-choices"),
          ) as HTMLUListElement[];
          const customButtons = Array.from(
            balloonEl.querySelectorAll(".custom-button"),
          ) as HTMLButtonElement[];

          input?.addEventListener("keypress", handleKeypress);
          input?.addEventListener("focus", handleFocus);
          input?.addEventListener("blur", handleBlur);
          choicesLists.forEach((list) =>
            list.addEventListener("click", handleChoiceClick),
          );
          customButtons.forEach((btn) =>
            btn.addEventListener("click", handleCustomButtonClick),
          );

          if (input) {
            input.focus();
          } else if (customButtons.length > 0) {
            customButtons[0].focus();
          }
        }

        function refreshContent() {
          detachEvents();
          const balloonEl = self.renderer.balloon.balloonEl;
          const input = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
          const checkbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          const prevText = input ? input.value : "";
          const prevChecked = checkbox ? checkbox.checked : false;

          self.renderer.balloon.showHtml(renderContent(), true);

          // Restore state
          const newInput = balloonEl.querySelector("textarea") as HTMLTextAreaElement;
          const newCheckbox = balloonEl.querySelector(
            ".ask-checkbox",
          ) as HTMLInputElement | null;
          if (newInput) newInput.value = prevText;
          if (newCheckbox) newCheckbox.checked = prevChecked;

          attachEvents();
        }

        function renderContent() {
          let balloonContent = `<div class="clippy-input">`;
          if (title) balloonContent += `<b>${title}</b>`;

          content.forEach((item) => {
            if (typeof item === "string") {
              balloonContent += `<div>${item}</div>`;
            } else if (item.type === "choices") {
              const style = item.style || "bullet";
              const totalPages = Math.ceil(item.items.length / choicesPerPage);

              let choicesHtml = "";
              if (choicePage > 0) {
                choicesHtml += `<li class="clippy-pagination-link prev" data-action="prev"><span>See previous...</span></li>`;
              }

              const start = choicePage * choicesPerPage;
              const end = Math.min(start + choicesPerPage, item.items.length);

              for (let i = start; i < end; i++) {
                choicesHtml += `<li data-index="${i}"><span>${item.items[i]}</span></li>`;
              }

              if (choicePage < totalPages - 1) {
                choicesHtml += `<li class="clippy-pagination-link next" data-action="next"><span>See more...</span></li>`;
              }

              balloonContent += `<ul class="clippy-choices style-${style}">${choicesHtml}</ul>`;
            } else if (item.type === "input") {
              const placeholder = item.placeholder || "";
              const rows = item.rows || 2;
              balloonContent += `<textarea rows="${rows}" placeholder="${placeholder}"></textarea>`;
            } else if (item.type === "checkbox") {
              const checked = item.checked ? "checked" : "";
              const id = `clippy-checkbox-${Math.random().toString(36).substring(2, 11)}`;
              balloonContent += `<div class="clippy-checkbox"><input type="checkbox" id="${id}" class="ask-checkbox" ${checked}><label for="${id}">${item.label}</label></div>`;
            }
          });

          if (buttons.length > 0) {
            const isSingleButton = buttons.length === 1;
            balloonContent += `<div class="clippy-input-buttons${isSingleButton ? " single-button" : ""}">`;
            buttons.forEach((btn, i) => {
              const label = typeof btn === "string" ? btn : btn.label;
              const bType = typeof btn === "string" ? null : btn.bullet;
              const btnClass = bType ? `style-${bType}` : "";
              const bulletSpan = bType ? '<span class="button-bullet"></span>' : "";
              balloonContent += `<button class="custom-button ${btnClass}" data-index="${i}">${bulletSpan}<span class="button-label">${label}</span></button>`;
            });
            balloonContent += `</div>`;
          }
          balloonContent += `</div>`;
          return balloonContent;
        }

        // --- Execution Logic ---

        self.renderer.balloon.onHide = () => {
          finish(null);
        };

        self.startTalkingAnimation(options.animation);

        self.renderer.balloon.showHtml(renderContent(), true);

        // Check visibility AFTER showing HTML to support cases where showHtml should open the balloon.
        // If it's still hidden, it's likely due to a mock or an immediate closure.
        if (!self.renderer.balloon.isVisible) {
          finish(null);
          return;
        }

        let ttsText = title ? ensureSentenceEnd(title) : "";
        content.forEach((item) => {
          if (typeof item === "string") {
            ttsText += (ttsText ? " " : "") + ensureSentenceEnd(item);
          }
        });

        if (ttsText) {
          self.renderer.balloon.speak(
            () => {
              if (self.core.stateManager.currentStateName === "Speaking") {
                self.core.animationManager.isExitingFlag = true;
                self.core.stateManager.handleAnimationCompleted();
              }
            },
            ttsText,
            true,
            true,
            false,
            true,
          );
        }

        attachEvents();
        resetBalloonTimeout();
        setTimeout(() => self.renderer.balloon.reposition(), 0);
      });
    });

    return askPromise;
  }
}
