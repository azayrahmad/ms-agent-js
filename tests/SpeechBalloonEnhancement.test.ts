import { describe, it, expect, beforeEach, vi } from "vitest";
import { Agent } from "../src/Agent";
import { SpriteManager } from "../src/core/resources/SpriteManager";

describe("Speech Balloon Enhancements", () => {
  let agent: any;

  beforeEach(async () => {
    // Mock SpriteManager.init to avoid loading color table
    vi.spyOn(SpriteManager.prototype, "init").mockImplementation(() => Promise.resolve());

    // Mock Agent.load to return a minimal agent instance
    // Since we are in JSDOM, we can actually use Agent.load if we mock the fetch
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            character: { width: 100, height: 100, style: 0, colorTable: "" },
            balloon: { fontHeight: 12, fontName: "Arial", borderColor: "0", backColor: "0", foreColor: "0" },
            animations: {
              Greeting: { frames: [{ duration: 10, images: [] }] },
              Explain: { frames: [{ duration: 10, images: [] }] },
            },
            states: {
              IdlingLevel1: { name: "IdlingLevel1", animations: [] },
            },
          }),
      } as any),
    );

    agent = await Agent.load("Clippit");
  });

  it("should render content, choices, checkbox, and buttons in correct order", async () => {
    const askPromise = agent.ask("Main Title", {
      content: '<div id="test-content">Some content</div>',
      choices: ["Choice 1", "Choice 2"],
      checkbox: { label: "Check me", checked: true },
      buttons: ["Button 1", "Button 2"],
    });

    const balloonEl = agent.renderer.balloon.balloonEl;

    // Check presence and order
    const askContainer = balloonEl.querySelector(".clippy-ask");
    expect(askContainer).toBeTruthy();

    const children = Array.from(askContainer.children);
    const classNames = children.map((c: any) => c.className);

    // Expected order: title, content, choices, checkbox, buttons
    expect(classNames).toEqual([
      "clippy-title",
      "clippy-content-area",
      "clippy-choices style-bullet",
      "clippy-checkbox",
      "clippy-buttons",
    ]);

    expect(balloonEl.querySelector("#test-content").textContent).toBe("Some content");
    expect(balloonEl.querySelectorAll(".clippy-choices li").length).toBe(2);
    expect(balloonEl.querySelector(".clippy-checkbox label span").textContent).toBe("Check me");
    expect(balloonEl.querySelectorAll(".clippy-btn").length).toBe(2);

    // Clean up
    agent.stop();
  });

  it("should return correct result when a choice is clicked", async () => {
    const askPromise = agent.ask("Question", {
      choices: ["A", "B"],
      checkbox: { label: "Option" },
    });

    const balloonEl = agent.renderer.balloon.balloonEl;
    const secondChoice = balloonEl.querySelectorAll(".clippy-choices li")[1];
    const checkbox = balloonEl.querySelector(".clippy-checkbox input");

    // Check the checkbox
    checkbox.checked = true;

    // Click second choice
    secondChoice.click();

    const result = await askPromise.promise;
    expect(result).toEqual({
      choiceIndex: 1,
      buttonIndex: null,
      checkboxChecked: true,
    });
  });

  it("should return correct result when a button is clicked", async () => {
    const askPromise = agent.ask("Confirm?", {
      buttons: ["No", "Yes"],
    });

    const balloonEl = agent.renderer.balloon.balloonEl;
    const yesButton = balloonEl.querySelectorAll(".clippy-btn")[1];

    yesButton.click();

    const result = await askPromise.promise;
    expect(result).toEqual({
      choiceIndex: null,
      buttonIndex: 1,
      checkboxChecked: false,
    });
  });

  it("should handle timeout", async () => {
    vi.useFakeTimers();
    const askPromise = agent.ask("Wait...", {
      timeout: 1000,
    });

    vi.advanceTimersByTime(1001);

    const result = await askPromise.promise;
    expect(result).toEqual({
      choiceIndex: null,
      buttonIndex: null,
      checkboxChecked: false,
    });
    vi.useRealTimers();
  });
});
