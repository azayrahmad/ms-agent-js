import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';

// Mock CharacterParser.load to avoid actual network requests
vi.mock('../src/core/resources/CharacterParser', () => {
    return {
        CharacterParser: {
            load: vi.fn()
        }
    };
});

// Mock SpriteManager to avoid canvas/BMP logic in Node environment
vi.mock('../src/core/resources/SpriteManager', () => {
    class SpriteManager {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
        loadSprite = vi.fn().mockResolvedValue(undefined);
    }
    return { SpriteManager };
});

describe('Agent Repositioning', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {},
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
        vi.stubGlobal('innerWidth', 1024);
        vi.stubGlobal('innerHeight', 768);
    });

    it('should reposition agent when viewport shrinks and agent is outside', async () => {
        // Load agent at the bottom right (1024-100, 768-100) -> (924, 668)
        const agent = await Agent.load('Clippit', { x: 924, y: 668 });

        const repositionSpy = vi.fn();
        agent.on('reposition', repositionSpy);

        // Shrink viewport to 800x600
        (window as any).innerWidth = 800;
        (window as any).innerHeight = 600;

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));

        // Agent should be at (800-100, 600-100) -> (700, 500)
        expect(agent.options.x).toBe(700);
        expect(agent.options.y).toBe(500);
        expect(repositionSpy).toHaveBeenCalledWith({ x: 700, y: 500 });
    });

    it('should stay at same position when viewport grows', async () => {
        const agent = await Agent.load('Clippit', { x: 100, y: 100 });

        const repositionSpy = vi.fn();
        agent.on('reposition', repositionSpy);

        // Grow viewport
        (window as any).innerWidth = 2000;
        (window as any).innerHeight = 2000;

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));

        // Agent should still be at (100, 100)
        expect(agent.options.x).toBe(100);
        expect(agent.options.y).toBe(100);
        expect(repositionSpy).not.toHaveBeenCalled();
    });

    it('should not reposition if keepInViewport is false', async () => {
        const agent = await Agent.load('Clippit', { x: 924, y: 668, keepInViewport: false });

        // Shrink viewport
        (window as any).innerWidth = 500;
        (window as any).innerHeight = 500;

        window.dispatchEvent(new Event('resize'));

        // Agent remains outside
        expect(agent.options.x).toBe(924);
        expect(agent.options.y).toBe(668);
    });

    it('should remove resize listener on destroy', async () => {
        const agent = await Agent.load('Clippit', { x: 100, y: 100 });
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        agent.destroy();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
});
