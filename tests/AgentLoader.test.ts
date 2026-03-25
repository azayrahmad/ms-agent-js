import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentLoader } from '../src/core/resources/AgentLoader';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AssetCache } from '../src/core/resources/Cache';
import { setupGlobals } from './setup';

vi.mock('../src/core/resources/CharacterParser', () => ({
    CharacterParser: { load: vi.fn() }
}));

describe('AgentLoader', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'Test': {
                frames: [{
                    images: [{ filename: 'IMAGE.BMP' }],
                    soundEffect: 'SOUND.WAV'
                }]
            }
        },
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
    };

    beforeEach(() => {
        AssetCache.clearMemory();
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should load and normalize a character definition', async () => {
        (window as any).__mockFetchFailAgentJson = true;
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        const baseUrl = 'http://test.com/agent';
        const def = await AgentLoader.getDefinition('TestAgent', baseUrl, {});

        expect(CharacterParser.load).toHaveBeenCalled();
        // Check normalization
        const anim = def.animations['Test'];
        expect(anim.frames[0].images[0].filename).toBe('image.bmp');
        expect(anim.frames[0].soundEffect).toBe('sound.wav');
    });

    it('should use cache if enabled', async () => {
        const baseUrl = 'http://test.com/cached';
        AssetCache.setDefinition(baseUrl, mockDefinition as any);

        const def = await AgentLoader.getDefinition('TestAgent', baseUrl, { useCache: true });

        expect(def).toBe(mockDefinition);
        expect(CharacterParser.load).not.toHaveBeenCalled();
    });

    it('should prioritize agent.json', async () => {
        const jsonDef = { ...mockDefinition, fromJson: true };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(jsonDef)
        }));

        const def = await AgentLoader.getDefinition('TestAgent', 'http://test.com', {});
        expect((def as any).fromJson).toBe(true);
    });

    it('should fallback to lowercase .acd if uppercase fails', async () => {
        (window as any).__mockFetchFailAgentJson = true;
        (CharacterParser.load as any)
            .mockRejectedValueOnce(new Error('UPPERCASE FAIL'))
            .mockResolvedValueOnce(mockDefinition);

        const baseUrl = 'http://test.com/agent';
        await AgentLoader.getDefinition('TestAgent', baseUrl, {});

        expect(CharacterParser.load).toHaveBeenCalledTimes(2);
        expect(CharacterParser.load).toHaveBeenNthCalledWith(1, 'http://test.com/agent/TESTAGENT.acd', undefined);
        expect(CharacterParser.load).toHaveBeenNthCalledWith(2, 'http://test.com/agent/testagent.acd', undefined);
    });

    it('should throw error if all fallback loading fails', async () => {
        (window as any).__mockFetchFailAgentJson = true;
        (CharacterParser.load as any).mockRejectedValue(new Error('TOTAL FAIL'));

        const baseUrl = 'http://test.com/agent';
        await expect(AgentLoader.getDefinition('TestAgent', baseUrl, {}))
            .rejects.toThrow('TOTAL FAIL');
    });
});
