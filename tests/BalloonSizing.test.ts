/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Balloon } from '../src/ui/Balloon';
import { type AgentCharacterDefinition } from '../src/core/base/types';

describe('Balloon Sizing', () => {
    let target: HTMLElement;
    let container: HTMLElement;
    let definition: AgentCharacterDefinition;

    beforeEach(() => {
        target = document.createElement('div');
        Object.defineProperty(target, 'getBoundingClientRect', {
            value: () => ({
                width: 100, height: 100, top: 100, left: 100, bottom: 200, right: 200
            })
        });
        document.body.appendChild(target);
        container = document.createElement('div');
        document.body.appendChild(container);

        definition = {
            character: { width: 100, height: 100, style: 0x0004 /* BalloonSizeToText */ } as any,
            balloon: {
                borderColor: "000000", backColor: "FFFFFF", foreColor: "000000",
                fontName: 'Arial', fontHeight: 12, fontWeight: 400, italic: false,
                charsPerLine: 20, numLines: 2
            }
        } as any;
    });

    it('should maintain size during typing even if repositioned', async () => {
        const balloon = new Balloon(target, container, definition);
        const longText = "This is a long text that should set the balloon size.";

        const contentEl = container.querySelector('.clippy-content') as HTMLElement;

        // Mock getBoundingClientRect for content element to simulate text measurement
        vi.spyOn(contentEl, 'getBoundingClientRect').mockImplementation(() => {
            const text = contentEl.textContent || "";
            // Simulate that the height depends on text length
            return {
                width: 200,
                height: Math.max(40, text.length * 2)
            } as DOMRect;
        });

        // Start speaking
        balloon.CHAR_SPEAK_TIME = 1000; // Slow down typing
        balloon.speak(() => {}, longText, false, false);

        const initialHeight = balloon.balloonEl.style.height;

        // Simulate typing progress - text is now shorter
        contentEl.textContent = "This";

        // Reposition
        balloon.reposition();

        // Height should remain the same as initial (measured with full text)
        expect(balloon.balloonEl.style.height).toBe(initialHeight);
    });
});
