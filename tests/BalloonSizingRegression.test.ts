/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Balloon } from '../src/ui/Balloon';
import { type AgentCharacterDefinition } from '../src/core/base/types';

describe('Balloon Sizing Regression', () => {
    let target: HTMLElement;
    let container: HTMLElement;
    let definition: AgentCharacterDefinition;

    beforeEach(() => {
        target = document.createElement('div');
        Object.defineProperty(target, 'getBoundingClientRect', {
            value: () => ({
                width: 100, height: 100, top: 500, left: 500, bottom: 600, right: 600
            })
        });
        document.body.appendChild(target);
        container = document.createElement('div');
        document.body.appendChild(container);

        definition = {
            character: { width: 100, height: 100, style: 0x0001 /* BalloonSizeToText */ } as any,
            balloon: {
                borderColor: "000000", backColor: "FFFFFF", foreColor: "000000",
                fontName: 'Arial', fontHeight: 12, fontWeight: 400, italic: false,
                charsPerLine: 20, numLines: 2
            }
        } as any;
    });

    it('should NOT shrink if repositioned during typing', async () => {
        const balloon = new Balloon(target, container, definition);
        const longText = "This is a very long text that should be measured in full.";

        const contentEl = container.querySelector('.clippy-content') as HTMLElement;
        let measureCount = 0;
        vi.spyOn(contentEl, 'getBoundingClientRect').mockImplementation(() => {
            const text = contentEl.textContent || "";
            const display = contentEl.style.display;
            const width = contentEl.style.width;

            // When measuring, we set display to inline-block and width to auto
            if (display === 'inline-block' && width === 'auto') {
                measureCount++;
                const h = Math.max(20, Math.ceil(text.length / 20) * 20);
                return {
                    width: Math.min(160, text.length * 8),
                    height: h
                } as DOMRect;
            }
            return { width: 100, height: 100 } as DOMRect;
        });

        balloon.CHAR_SPEAK_TIME = 1000;
        balloon.speak(() => {}, longText, false, false);

        const initialHeightStr = balloon.balloonEl.style.height;
        const initialHeight = parseInt(initialHeightStr);
        expect(measureCount).toBe(1);

        // Simulate typing progress
        contentEl.textContent = "This";

        // Reposition during typing
        balloon.reposition();

        const afterRepositionHeightStr = balloon.balloonEl.style.height;
        const afterRepositionHeight = parseInt(afterRepositionHeightStr);

        // It should NOT have re-measured
        expect(measureCount).toBe(1);
        // It should NOT have shrunk.
        expect(afterRepositionHeight).toBe(initialHeight);
        // And content should still be "This"
        expect(contentEl.textContent).toBe("This");
    });
});
