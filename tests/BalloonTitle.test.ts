/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Balloon } from '../src/ui/Balloon';
import { CharacterStyle } from '../src/core/base/types';

describe('Balloon Title and Text', () => {
    let targetEl: HTMLElement;
    let container: HTMLElement;
    const mockDefinition: any = {
        character: { width: 100, height: 100, style: CharacterStyle.BalloonSizeToText },
        balloon: {
            borderColor: '000000',
            backColor: 'ffffff',
            foreColor: '000000',
            fontName: 'Arial',
            fontHeight: 12,
            charsPerLine: 20,
            numLines: 2
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();

        targetEl = document.createElement('div');
        container = document.createElement('div');

        // Mock getBoundingClientRect for repositioning logic
        vi.spyOn(targetEl, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 100, left: 100, bottom: 200, right: 200
        } as DOMRect);

        class MockSpeechSynthesisUtterance {
            text: string;
            onboundary: any;
            onend: any;
            onerror: any;
            constructor(text: string) { this.text = text; }
        }

        vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 768,
            speechSynthesis: {
                speak: vi.fn(),
                cancel: vi.fn(),
                getVoices: vi.fn().mockReturnValue([]),
                speaking: false
            }
        });
    });

    it('should render title and text correctly when typing is skipped', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        const complete = vi.fn();
        // skipTyping = true
        balloon.speak(complete, 'Main Text', true, true, true, false, 'Title');

        const content = balloon.balloonEl.querySelector('.clippy-content');
        expect(content?.querySelector('.clippy-balloon-title')?.textContent).toBe('Title');
        expect(content?.querySelector('.clippy-balloon-text')?.textContent).toBe('Main Text');
    });

    it('should type into .clippy-balloon-text by default', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);

        const complete = vi.fn();
        // useTTS = false triggers _sayChars
        balloon.speak(complete, 'Hello', true, false, false, false, 'Title');

        const textEl = balloon.balloonEl.querySelector('.clippy-balloon-text');
        const titleEl = balloon.balloonEl.querySelector('.clippy-balloon-title');

        expect(titleEl?.textContent).toBe('Title');
        // First char is synchronous
        expect(textEl?.textContent).toBe('H');

        vi.advanceTimersByTime(balloon.CHAR_SPEAK_TIME);
        expect(textEl?.textContent).toBe('He');

        vi.runAllTimers();
        expect(textEl?.textContent).toBe('Hello');
        expect(titleEl?.textContent).toBe('Title');

        vi.useRealTimers();
    });

    it('should support typing into custom selector', () => {
        vi.useFakeTimers();
        const b = new Balloon(targetEl, container, mockDefinition);

        const html = `
            <div class="custom-container">
                <span class="title">My Title</span>
                <span class="target"></span>
            </div>
        `;
        b.showHtml(html, true);

        const complete = vi.fn();
        // Need to wait for showHtml's RAFs (simulated by timers in our setup)
        vi.runAllTimers();

        b.speak(complete, 'Typed Text', true, false, false, true, undefined, '.target');

        const target = b.balloonEl.querySelector('.target');
        expect(target?.textContent).toBe('T');

        vi.runAllTimers();
        expect(target?.textContent).toBe('Typed Text');

        vi.useRealTimers();
    });
});
