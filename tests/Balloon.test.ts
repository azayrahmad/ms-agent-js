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

    it('should support skipContentUpdate in speak method', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        const content = balloon.balloonEl.querySelector('.clippy-content') as HTMLElement;

        content.textContent = 'Existing Content';

        // speak with skipContentUpdate=true
        balloon.speak(() => {}, 'New Content', true, false, true, true);

        expect(content.textContent).toBe('Existing Content');
    });

    it('should handle pause and resume correctly', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        const complete = vi.fn();

        balloon.speak(complete, 'ABC', false, false, false);
        // 'A' is shown immediately because _addChar is called once synchronously

        balloon.pause();
        // Clear all timers including the one scheduled by the synchronous _addChar
        vi.runOnlyPendingTimers();

        balloon.resume();
        // Resume calls _addChar() which adds 'B' and schedules 'C'
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('AB');

        vi.advanceTimersByTime(balloon.CHAR_SPEAK_TIME);
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('ABC');

        vi.useRealTimers();
    });

    it('should position balloon in TipQuadrant.Right when space is tight on right', () => {
        const tightTarget = document.createElement('div');
        // Place agent on the right side of screen
        vi.spyOn(tightTarget, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 200, left: 900, bottom: 300, right: 1000
        } as DOMRect);

        // Mock viewport to be tight on top and bottom
        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 500,
            speechSynthesis: window.speechSynthesis
        });

        const balloon = new Balloon(tightTarget, container, mockDefinition);
        // Force a large height to make it tight
        const content = balloon.balloonEl.querySelector('.clippy-content') as HTMLElement;
        vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({
            width: 200, height: 300, top: 0, left: 0, bottom: 300, right: 200
        } as DOMRect);

        balloon.reposition();

        // When top and bottom space are tight, and left space > right space
        expect((balloon as any)._tipType).toBe(1); // TipQuadrant.Right (balloon is on the left)
    });

    it('should position balloon in TipQuadrant.Left when space is tight on left', () => {
        const tightTarget = document.createElement('div');
        // Place agent on the left side of screen
        vi.spyOn(tightTarget, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 200, left: 50, bottom: 300, right: 150
        } as DOMRect);

        // Mock viewport to be tight on top and bottom
        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 500,
            speechSynthesis: window.speechSynthesis
        });

        const balloon = new Balloon(tightTarget, container, mockDefinition);
        // Force a large height to make it tight
        const content = balloon.balloonEl.querySelector('.clippy-content') as HTMLElement;
        vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({
            width: 200, height: 300, top: 0, left: 0, bottom: 300, right: 200
        } as DOMRect);

        balloon.reposition();

        // When top and bottom space are tight, and right space > left space
        expect((balloon as any)._tipType).toBe(3); // TipQuadrant.Left (balloon is on the right)
    });

    it('should position balloon in TipQuadrant.Top when space is tight on top', () => {
        const tightTarget = document.createElement('div');
        // Place agent near top of screen
        vi.spyOn(tightTarget, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 20, left: 500, bottom: 120, right: 600
        } as DOMRect);

        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 768,
            speechSynthesis: window.speechSynthesis
        });

        const balloon = new Balloon(tightTarget, container, mockDefinition);
        balloon.reposition();

        // When top space < balloon height + tip depth
        expect((balloon as any)._tipType).toBe(0); // TipQuadrant.Top (balloon is below)
    });

    it('should use TTS fallback timer if onboundary does not fire', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        const text = 'Hello world';
        balloon.speak(complete, text, false, true, false);

        const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];

        // Initially empty
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('');

        // Simulate onstart
        utterance.onstart();

        // Advance past the 200ms fallback threshold
        vi.advanceTimersByTime(250);

        // Fallback should have started and processed the first word "Hello"
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello');

        // Advance to next word "world" (default 400ms per word)
        vi.advanceTimersByTime(400);
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello world');

        vi.useRealTimers();
    });

    it('should NOT use TTS fallback if onboundary fires', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);
        balloon.setTTSEnabled(true);

        const complete = vi.fn();
        const text = 'Hello world';
        balloon.speak(complete, text, false, true, false);

        const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];

        // Simulate onboundary firing immediately
        utterance.onboundary({ charIndex: 0, charLength: 5 });
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello');

        // Advance past the 200ms threshold
        vi.advanceTimersByTime(250);

        // content should still only have "Hello" (assuming next boundary hasn't arrived)
        // and importantly, the fallback timer shouldn't have overridden it.
        // Actually, since we simulate it after 200ms, if it was running, it would have moved to word 0 ("Hello") then word 1 ("world") by now.
        // But wordIdx 0 was already reached.
        expect(balloon.balloonEl.querySelector('.clippy-content')?.textContent).toBe('Hello');

        vi.useRealTimers();
    });

    it('should handle resume correctly by restarting timers', () => {
        vi.useFakeTimers();
        const balloon = new Balloon(targetEl, container, mockDefinition);

        // Mock _addChar to see if it gets called
        (balloon as any)._addChar = vi.fn();

        balloon.resume();
        expect((balloon as any)._addChar).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should draw SVG paths for all quadrants', () => {
        const balloon = new Balloon(targetEl, container, mockDefinition);
        const pathEl = (balloon as any)._pathEl as SVGPathElement;

        // Bottom (Default)
        balloon.reposition();
        expect(pathEl.getAttribute('d')).toContain('L');
        expect((balloon as any)._tipType).toBe(2);

        // Top
        vi.spyOn(targetEl, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 20, left: 500, bottom: 120, right: 600
        } as DOMRect);
        balloon.reposition();
        expect(pathEl.getAttribute('d')).toBeDefined();
        expect((balloon as any)._tipType).toBe(0);

        // Right (Balloon on Left)
        vi.spyOn(targetEl, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 50, left: 900, bottom: 150, right: 1000
        } as DOMRect);
        vi.stubGlobal('window', { ...window, innerHeight: 200 }); // tight V space
        balloon.reposition();
        expect((balloon as any)._tipType).toBe(1);
        expect(pathEl.getAttribute('d')).toBeDefined();

        // Left (Balloon on Right)
        vi.spyOn(targetEl, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 50, left: 50, bottom: 150, right: 150
        } as DOMRect);
        balloon.reposition();
        expect((balloon as any)._tipType).toBe(3);
        expect(pathEl.getAttribute('d')).toBeDefined();
    });

    it('should handle window bounds during repositioning', () => {
        const tightTarget = document.createElement('div');
        // Place agent far right
        vi.spyOn(tightTarget, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, top: 400, left: 1000, bottom: 500, right: 1100
        } as DOMRect);

        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 768,
        });

        const balloon = new Balloon(tightTarget, container, mockDefinition);
        balloon.reposition();

        const relLeft = parseInt(balloon.balloonEl.style.left);
        const absLeft = 1000 + relLeft;
        // Should be constrained to window.innerWidth - 10
        expect(absLeft + balloon.balloonEl.offsetWidth).toBeLessThanOrEqual(1024 - 10);
    });
});
