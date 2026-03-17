/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Balloon } from '../src/ui/Balloon';
import { CharacterStyle } from '../src/core/base/types';

describe('Balloon', () => {
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

    it('should skip typing animation if TTS is disabled', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(false);

        const complete = vi.fn();
        balloon.speak(complete, 'Hello World', false, true, false);

        // Text should be set immediately
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello World');

        // When hold=false, complete is called after CLOSE_BALLOON_DELAY
        expect(complete).not.toHaveBeenCalled();

        vi.advanceTimersByTime(balloon.CLOSE_BALLOON_DELAY);
        expect(complete).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('should complete immediately if TTS is disabled AND hold is true', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(false);

        const complete = vi.fn();
        balloon.speak(complete, 'Hello World', true, true, false);

        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello World');
        expect(complete).toHaveBeenCalled();
    });

    it('should NOT skip typing animation if TTS is enabled', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        balloon.speak(complete, 'Hello World', false, true, false);

        // Text should NOT be set immediately (starts at empty or first boundary)
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('');
        expect(complete).not.toHaveBeenCalled();
    });

    it('should update text on boundary with charLength and delay completion until hidden', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        balloon.speak(complete, 'Hello World', false, true, false);

        const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];

        // Simulate boundary event for "Hello"
        utterance.onboundary({ charIndex: 0, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello');

        // Simulate boundary event for "World"
        utterance.onboundary({ charIndex: 6, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello World');

        // End of speech
        utterance.onend();
        expect(complete).not.toHaveBeenCalled();

        vi.advanceTimersByTime(balloon.CLOSE_BALLOON_DELAY);
        expect(complete).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('should include trailing punctuation during TTS synchronization', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        const text = 'Hello, world!';
        balloon.speak(complete, text, false, true, false);

        const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];

        // Simulate boundary event for "Hello" (indices 0-4), comma is at index 5
        utterance.onboundary({ charIndex: 0, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello,');

        // Simulate boundary event for "world" (indices 7-11), ! is at index 12
        utterance.onboundary({ charIndex: 7, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello, world!');
    });

    it('should NOT include punctuation if separated by space', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        const text = 'Hello , world';
        balloon.speak(complete, text, false, true, false);

        const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];

        // Simulate boundary event for "Hello"
        utterance.onboundary({ charIndex: 0, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello');
    });

    it('should use character typing when useTTS is false', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        const complete = vi.fn();

        balloon.speak(complete, 'ABC', false, false, false);

        // First character 'A' is shown immediately because _addChar() is called once synchronously
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('A');

        vi.runAllTimers();
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('ABC');
        expect(complete).toHaveBeenCalled();

        vi.useRealTimers();
    });
});
