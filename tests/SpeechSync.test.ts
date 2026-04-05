/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from '../src/Agent';
import { AgentLoader } from '../src/core/resources/AgentLoader';
import { SpriteManager } from '../src/core/resources/SpriteManager';

vi.mock('../src/core/resources/AgentLoader', () => ({
    AgentLoader: {
        getDefinition: vi.fn()
    }
}));

// Mock SpriteManager to avoid actual BMP loading
vi.mock('../src/core/resources/SpriteManager', () => {
    return {
        SpriteManager: class {
            init = vi.fn().mockResolvedValue(undefined);
            getSpriteWidth = vi.fn().mockReturnValue(100);
            getSpriteHeight = vi.fn().mockReturnValue(100);
            drawFrame = vi.fn();
            loadSprite = vi.fn().mockResolvedValue(undefined);
        }
    };
});

describe('Speech Synchronization', () => {
    let mockDefinition: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDefinition = {
            character: {
                width: 100, height: 100, style: 0x0020 /* VoiceTTS */,
                defaultFrameDuration: 10, colorTable: 'ct.bmp', transparency: 0
            },
            balloon: {
                fontName: 'Arial', fontHeight: 12,
                borderColor: '000000', backColor: 'FFFFFF', foreColor: '000000',
                numLines: 2, charsPerLine: 20
            },
            animations: {
                Explain: {
                    name: 'Explain',
                    frames: [
                        { duration: 10, images: [] }, // No mouth
                        { duration: 10, images: [], mouths: [{ type: 'OpenWide1', filename: 'm.bmp', offsetX: 0, offsetY: 0 }] }, // Mouth!
                    ]
                },
                NoMouth: {
                    name: 'NoMouth',
                    frames: [
                        { duration: 10, images: [] },
                        { duration: 10, images: [] },
                    ]
                }
            },
            states: {
                IdlingLevel1: { name: 'IdlingLevel1', animations: ['NoMouth'] },
                Speaking: { name: 'Speaking', animations: ['Explain'] }
            }
        };

        (AgentLoader.getDefinition as any).mockResolvedValue(mockDefinition);

        // Mock requestAnimationFrame
        vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));

        // Mock SpeechSynthesis
        vi.stubGlobal('speechSynthesis', {
            speak: vi.fn(),
            cancel: vi.fn(),
            getVoices: () => [],
            speaking: false,
            onvoiceschanged: null
        });

        // Mock SpeechSynthesisUtterance
        vi.stubGlobal('SpeechSynthesisUtterance', class {
            constructor(public text: string) {}
            rate = 1;
            pitch = 1;
            volume = 1;
            voice = null;
            onend = null;
            onstart = null;
            onboundary = null;
        });
    });

    it('should pause speech until a mouth frame is reached', async () => {
        const agent = await Agent.load('TestAgent');
        const balloon = agent.balloon;

        // Spy on resumePausedSpeech
        const resumeSpy = vi.spyOn(balloon, 'resumePausedSpeech');

        agent.speak('Hello world', { animation: 'Explain', useTTS: true });

        // Wait for next tick where startTalkingAnimation/speak is called
        await new Promise(r => setTimeout(r, 20));

        expect(resumeSpy).not.toHaveBeenCalled();

        // Force the animation to Explain if it didn't transition
        if (agent.animationManager.currentAnimationName !== 'Explain') {
            agent.animationManager.setAnimation('Explain');
        }

        console.log('Current Anim:', agent.animationManager.currentAnimationName);
        console.log('Current Frame Index:', agent.animationManager.currentFrameIndexValue);

        // Advance animation to frame 1
        const now = performance.now();
        agent.animationManager.update(now + 200);

        console.log('After update - Current Frame Index:', agent.animationManager.currentFrameIndexValue);

        expect(resumeSpy).toHaveBeenCalled();
    });

    it('should NOT pause speech if animation has no mouths', async () => {
        const agent = await Agent.load('TestAgent');
        const balloon = agent.balloon;
        const speakSpy = vi.spyOn(balloon, 'speak');

        agent.speak('Hello world', { animation: 'NoMouth', useTTS: true });

        await new Promise(r => setTimeout(r, 20));

        const calls = speakSpy.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[6]).toBeFalsy();
    });
});
