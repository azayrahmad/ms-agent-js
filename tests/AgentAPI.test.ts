import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';
import { RequestStatus } from '../src/core/base/types';

// Mock everything needed for Agent environment
vi.mock('../src/core/resources/CharacterParser', () => ({
    CharacterParser: { load: vi.fn() }
}));

vi.mock('../src/core/resources/SpriteManager', () => ({
    SpriteManager: class {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
        loadSprite = vi.fn().mockResolvedValue(undefined);
        drawFrame = vi.fn();
    }
}));

describe('Agent Public API', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] },
            'B': { name: 'B', frames: [{ duration: 10, images: [] }] },
            'Writing': { name: 'Writing', frames: [{ duration: 10, images: [] }] },
            'Explain': { name: 'Explain', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] },
            'Speaking': { name: 'Speaking', animations: ['Explain'] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    it('should return all animation names with animations()', async () => {
        const agent = await Agent.load('Clippit');
        expect(agent.animations()).toEqual(['A', 'B', 'Writing', 'Explain']);
    });

    it('should check if animation exists with hasAnimation()', async () => {
        const agent = await Agent.load('Clippit');
        expect(agent.hasAnimation('A')).toBe(true);
        expect(agent.hasAnimation('NonExistent')).toBe(false);
    });

    it('should play a random animation with animate()', async () => {
        const agent = await Agent.load('Clippit');
        vi.spyOn(agent, 'play').mockReturnValue({} as any);
        agent.animate();
        expect(agent.play).toHaveBeenCalled();
    });

    it('should set scale and reposition with setScale()', async () => {
        const agent = await Agent.load('Clippit');
        const setInstantPositionSpy = vi.spyOn(agent as any, 'setInstantPosition');
        agent.setScale(2);
        expect(agent.options.scale).toBe(2);
        expect(setInstantPositionSpy).toHaveBeenCalled();
    });

    it('should show HTML in balloon with showHtml()', async () => {
        const agent = await Agent.load('Clippit');
        const showHtmlSpy = vi.spyOn(agent.balloon, 'showHtml');
        agent.showHtml('<b>Hello</b>', true);
        expect(showHtmlSpy).toHaveBeenCalledWith('<b>Hello</b>', true);
    });

    it('should support queuing a delay with delay()', async () => {
        const agent = await Agent.load('Clippit');
        const request = agent.delay(100);
        expect(request.status).toBe(RequestStatus.InProgress);
        await request;
        expect(request.status).toBe(RequestStatus.Complete);
    });

    it('should stop only the current request with stopCurrent()', async () => {
        const agent = await Agent.load('Clippit');

        const req1 = agent.enqueueRequest(async (request) => {
            while (!request.isCancelled) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        });

        const req2 = agent.delay(1000);

        // Wait a bit to ensure req1 is InProgress
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(req1.status).toBe(RequestStatus.InProgress);

        agent.stopCurrent();

        expect(req1.status).toBe(RequestStatus.Interrupted);

        // Use a loop to wait for status change to avoid flaky timeouts
        let iterations = 0;
        while (req2.status !== RequestStatus.InProgress && iterations < 20) {
            await new Promise(resolve => setTimeout(resolve, 20));
            iterations++;
        }

        expect(req2.status).toBe(RequestStatus.InProgress);
    });

    it('should interrupt current actions with interrupt()', async () => {
        const agent = await Agent.load('Clippit');
        const req1 = agent.delay(1000);
        vi.spyOn(agent, 'play').mockReturnValue({} as any);

        agent.interrupt('B');

        expect(req1.status).toBe(RequestStatus.Interrupted);
        expect(agent.play).toHaveBeenCalledWith('B');
    });

    describe('agent.ask()', () => {
        it('should resolve with custom button value when clicked', async () => {
            const agent = await Agent.load('Clippit');
            agent.stop(); // Ensure queue is clean
            const askPromise = agent.ask({
                title: 'Test Question',
                content: [{ type: 'input', placeholder: 'Type here...' }],
                buttons: [{ label: 'Submit', value: 'submit_val' }]
            });

            // Delay for task to start and multiple RAF cycles in balloon
            await new Promise(resolve => setTimeout(resolve, 150));

            const customButtons = (agent.balloon.balloonEl as any).lastQueriedCustomButtons as HTMLButtonElement[];
            const textarea = (agent.balloon.balloonEl as any).lastQueriedTextarea as HTMLTextAreaElement;

            textarea.value = 'User Answer';
            customButtons[0].click(); // Click "Submit"

            const result = await askPromise;
            expect(result).toEqual({ value: 'submit_val', text: 'User Answer', checked: false });
        });

        it('should resolve with null when cancel button (value: null) is clicked', async () => {
            const agent = await Agent.load('Clippit');
            agent.stop();
            const askPromise = agent.ask({
                buttons: [{ label: 'Cancel', value: null }]
            });

            await new Promise(resolve => setTimeout(resolve, 150));

            const customButtons = (agent.balloon.balloonEl as any).lastQueriedCustomButtons as HTMLButtonElement[];

            customButtons[0].click(); // Click "Cancel"

            const result = await askPromise;
            expect(result).toBe(null);
        });

        it('should switch animations on focus and blur of the textarea', async () => {
            const agent = await Agent.load('Clippit');
            agent.stop();
            const playAnimationSpy = vi.spyOn(agent.stateManager, 'playAnimation');

            agent.ask({
                content: [{ type: 'input' }]
            });

            await new Promise(resolve => setTimeout(resolve, 150));

            const textarea = (agent.balloon.balloonEl as any).lastQueriedTextarea as HTMLTextAreaElement;

            // Trigger focus
            textarea.focus();
            expect(playAnimationSpy).toHaveBeenCalledWith('Writing', 'Speaking', false, undefined, true);

            // Trigger blur
            textarea.blur();
            expect(playAnimationSpy).toHaveBeenCalledWith('Explain', 'Speaking', false, undefined, true);
        });

        it('should resolve with null if balloon is hidden', async () => {
            const agent = await Agent.load('Clippit');
            agent.stop();

            // Mocking the visibility check used by DialogManager
            vi.spyOn(agent.balloon, 'isVisible', 'get').mockReturnValue(false);

            const result = await agent.ask();
            expect(result).toBe(null);
        });

        it('should resolve with choice index and text input from content array', async () => {
          const agent = await Agent.load('Clippit');
          agent.stop();
          const askPromise = agent.ask({
            title: "Choice",
            content: [
                { type: "choices", items: ["Option 1", "Option 2"] },
                { type: "input" }
            ]
          });

          await new Promise((resolve) => setTimeout(resolve, 150));

          const balloonEl = agent.balloon.balloonEl;
          const choicesList = (balloonEl as any).lastQueriedChoicesList;
          const textarea = (balloonEl as any).lastQueriedTextarea;

          textarea.value = "Some input";

          // Mock clicking the second choice
          const li = document.createElement("li");
          li.setAttribute("data-index", "1");
          const event = { target: li, currentTarget: li, preventDefault: () => {} };
          const clickListener = (choicesList as any).listeners["click"][0];
          clickListener(event);

          const result = await askPromise;
          expect(result).toEqual({ value: 1, text: "Some input", checked: false });
      });

      it("should handle multiple content items in order", async () => {
          const agent = await Agent.load("Clippit");
          agent.stop();
          const askPromise = agent.ask({
            title: "Order Test",
            content: [
                "Text 1",
                { type: "input" },
                "Text 2",
                { type: "choices", items: ["Choice 1"] }
            ]
          });

          await new Promise((resolve) => setTimeout(resolve, 150));
          const contentEl = (agent.balloon as any)._contentEl;
          const content = contentEl.innerHTML;

          expect(content).toContain('Text 1');
          expect(content).toContain('Text 2');
          expect(content).toContain('<textarea');
          expect(content).toContain('clippy-choices');

          // Complete it
          const balloonEl = agent.balloon.balloonEl;
          const choicesList = (balloonEl as any).lastQueriedChoicesList;
          const li = document.createElement("li");
          li.setAttribute("data-index", "0");
          (choicesList as any).listeners["click"][0]({ target: li, currentTarget: li, preventDefault: () => {} });

          await askPromise;
      });

      it("should resolve with checkbox state", async () => {
          const agent = await Agent.load("Clippit");
          agent.stop();
          const askPromise = agent.ask({
            content: [
                { type: "checkbox", label: "Check me", checked: true }
            ],
            buttons: ["OK"]
          });

          await new Promise((resolve) => setTimeout(resolve, 150));
          const balloonEl = agent.balloon.balloonEl;

          const checkbox = balloonEl.querySelector('.ask-checkbox') as HTMLInputElement;
          const customButtons = (agent.balloon.balloonEl as any).lastQueriedCustomButtons as HTMLButtonElement[];

          expect(checkbox).toBeDefined();
          expect(checkbox).not.toBeNull();
          checkbox.checked = true; // Setup state manually for mock
          expect(checkbox.checked).toBe(true);
          checkbox.checked = false;
          customButtons[0].click();

          const result = await askPromise;
          expect(result).toEqual({ value: "OK", text: null, checked: false });
      });

      it('should auto-cancel after timeout', async () => {
        vi.useFakeTimers();
        const agent = await Agent.load('TestAgent');
        const askPromise = agent.ask({ timeout: 100 });

        vi.advanceTimersByTime(150);

        const result = await askPromise;
        expect(result).toBeNull();
        agent.destroy();
        vi.useRealTimers();
      });
    });

    it('should have working TTS facade methods', async () => {
        const agent = await Agent.load('TestAgent');

        const setSpy = vi.spyOn(agent.balloon, 'setTTSOptions');
        agent.setTTSOptions({ rate: 2.0 });
        expect(setSpy).toHaveBeenCalledWith({ rate: 2.0 });

        const getSpy = vi.spyOn(agent.balloon, 'getTTSVoices').mockReturnValue([]);
        agent.getTTSVoices();
        expect(getSpy).toHaveBeenCalled();

        const stopSpy = vi.spyOn(agent.balloon, 'stopTTS');
        agent.stopTTS();
        expect(stopSpy).toHaveBeenCalled();

        agent.destroy();
    });
});
