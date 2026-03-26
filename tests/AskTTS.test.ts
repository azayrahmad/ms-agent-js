import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AssetCache } from '../src/core/resources/Cache';
import { setupGlobals } from './setup';

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

describe('Ask TTS Construction', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] },
            'Explain': { name: 'Explain', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] },
            'Speaking': { name: 'Speaking', animations: ['Explain'] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        AssetCache.clearMemory();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should ensure title and content items are read as separate sentences', async () => {
        const agent = await Agent.load('Clippit');
        const speakSpy = vi.spyOn(agent.balloon, 'speak');

        agent.ask({
            title: 'Question',
            content: ['First line', 'Second line with period.', 'Third line!']
        });

        // Delay for task to start
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(speakSpy).toHaveBeenCalled();
        const call = speakSpy.mock.calls[0];
        const ttsText = call[1];

        // Expected: "Question. First line. Second line with period. Third line!"
        expect(ttsText).toBe('Question. First line. Second line with period. Third line!');
    });

    it('should handle missing title or empty content correctly', async () => {
        const agent = await Agent.load('Clippit');
        const speakSpy = vi.spyOn(agent.balloon, 'speak');

        agent.ask({
            content: ['Just text']
        });

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(speakSpy).toHaveBeenCalled();
        expect(speakSpy.mock.calls[0][1]).toBe('Just text.');
    });

    it('should respect existing pause-inducing punctuation', async () => {
        const agent = await Agent.load('Clippit');
        const speakSpy = vi.spyOn(agent.balloon, 'speak');

        agent.ask({
            title: 'Wait:',
            content: ['Next step; and more']
        });

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(speakSpy).toHaveBeenCalled();
        expect(speakSpy.mock.calls[0][1]).toBe('Wait: Next step; and more.');
    });
});
