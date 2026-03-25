import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentCore } from '../src/core/Core';
import { VisemeManager } from '../src/core/behavior/VisemeManager';

describe('Lip-sync Core Logic', () => {
    let core: AgentCore;
    const mockDefinition: any = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] }
        }
    };

    beforeEach(() => {
        vi.useFakeTimers();
        const options: any = {
            baseUrl: 'http://test.com',
            scale: 1,
            speed: 1,
            idleIntervalMs: 5000,
            useAudio: true,
            fixed: true,
            keepInViewport: true,
            initialAnimation: '',
            onProgress: () => {},
            signal: new AbortController().signal,
            useCache: true,
            x: 0,
            y: 0
        };
        core = new AgentCore(mockDefinition, options);
    });

    it('should schedule visemes when handleSpeakEvent is called', () => {
        const setVisemeSpy = vi.spyOn(core.animationManager, 'setViseme');

        // "Hi" -> H (Closed), i (OpenWide3)
        core.handleSpeakEvent('Hi', 0);

        // First viseme should be scheduled immediately (0ms)
        vi.advanceTimersByTime(1);
        expect(setVisemeSpy).toHaveBeenCalledWith('Closed');

        // Second viseme should be scheduled after 78ms
        vi.advanceTimersByTime(100);
        expect(setVisemeSpy).toHaveBeenCalledWith('OpenWide3');

        // Reset to Closed after word (78*2 = 156ms)
        vi.advanceTimersByTime(100);
        expect(setVisemeSpy).toHaveBeenLastCalledWith('Closed');
    });

    it('should stop visemes when stopVisemes is called', () => {
        const setVisemeSpy = vi.spyOn(core.animationManager, 'setViseme');

        core.handleSpeakEvent('Hello', 0);
        vi.advanceTimersByTime(1);
        expect(setVisemeSpy).toHaveBeenCalled();

        core.stopVisemes();
        setVisemeSpy.mockClear();

        vi.advanceTimersByTime(1000);
        // No more calls should happen
        expect(setVisemeSpy).not.toHaveBeenCalledWith(expect.any(String));
    });
});
