import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { Balloon } from '../src/ui/Balloon';
import { setupGlobals } from './setup';

vi.mock('../src/core/resources/CharacterParser', () => ({
    CharacterParser: { load: vi.fn() }
}));

describe('Speech Synchronization', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp', style: 0 },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'SpeakSync': {
                name: 'SpeakSync',
                frames: [
                    { duration: 100, images: [] }, // Frame 0: no mouth, LONG duration
                    {
                        duration: 100,
                        images: [],
                        mouths: [{ type: 'Closed', filename: 'm.bmp', offsetX: 0, offsetY: 0 }]
                    } // Frame 1: has mouth
                ]
            },
            'NoSpeech': {
                name: 'NoSpeech',
                frames: [{ duration: 10, images: [] }]
            }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['NoSpeech'] },
            'Speaking': { name: 'Speaking', animations: ['SpeakSync'] }
        }
    };

    const flushPromises = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

    beforeEach(() => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    it('should delay Balloon.speak until animation reaches mouth frame', async () => {
        const agent = await Agent.load('Clippit', { initialAnimation: 'NoSpeech' });
        const speakSpy = vi.spyOn(Balloon.prototype, 'speak');

        // Stop any initial animations
        agent.stop();
        await flushPromises();

        // Call speak with an animation that has mouth frames
        agent.speak('Hello', { animation: 'SpeakSync' });

        // Wait for request to start and waitForMouthFrames to be called
        await flushPromises(200);

        // Animation should have started, but it's on frame 0 (no mouth)
        expect(agent.animationManager.currentAnimationName).toBe('SpeakSync');

        // Balloon.speak should NOT have been called yet
        expect(speakSpy).not.toHaveBeenCalled();

        // Advance animation to frame 1 (has mouth)
        // We need to use the performance.now() from setup.ts which is mocked
        const now = performance.now();
        agent.animationManager.update(now + 2000);

        expect(agent.animationManager.currentFrameIndexValue).toBe(1);

        // Wait for microtasks
        await flushPromises();

        // Now Balloon.speak SHOULD have been called
        expect(speakSpy).toHaveBeenCalled();
    });

    it('should NOT delay Balloon.speak if animation has no mouth frames at all', async () => {
        const agent = await Agent.load('Clippit', { initialAnimation: 'NoSpeech' });
        const speakSpy = vi.spyOn(Balloon.prototype, 'speak');

        agent.speak('Hello', { animation: 'NoSpeech' });

        // Wait for microtasks
        await flushPromises(200);

        // Should be called immediately since NoSpeech doesn't support speech
        expect(speakSpy).toHaveBeenCalled();
    });
});
