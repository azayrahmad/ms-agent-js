import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { AssetCache } from '../src/core/resources/Cache';
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

describe('Agent.load', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {},
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
    };

    beforeEach(() => {
        AssetCache.clearMemory();
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
    });

    it('should use unpkg CDN as default baseUrl when none is provided', async () => {
        (window as any).__mockFetchFailAgentJson = true;
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        const agentName = 'Clippit';
        await Agent.load(agentName);

        const expectedBaseUrl = `https://unpkg.com/ms-agent-js@latest/dist/agents/${agentName}`;
        const expectedAcdPath = `${expectedBaseUrl}/${agentName.toUpperCase()}.acd`;

        expect(CharacterParser.load).toHaveBeenCalledWith(expectedAcdPath, undefined);
    });

    it('should use provided baseUrl when one is given', async () => {
        (window as any).__mockFetchFailAgentJson = true;
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        const agentName = 'Clippit';
        const customBaseUrl = '/custom/path/to/agent';
        await Agent.load(agentName, { baseUrl: customBaseUrl });

        const expectedAcdPath = `${customBaseUrl}/${agentName.toUpperCase()}.acd`;

        expect(CharacterParser.load).toHaveBeenCalledWith(expectedAcdPath, undefined);
    });
});

describe('Agent Directional Animations', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'GestureLeft': { frames: [] },
            'GestureRight': { frames: [] },
            'LookLeft': { frames: [] },
            'LookRight': { frames: [] },
            'LookDownLeft': { frames: [] },
            'LookDownRight': { frames: [] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] },
            'GesturingLeft': { name: 'GesturingLeft', animations: ['GestureLeft'] },
            'GesturingRight': { name: 'GesturingRight', animations: ['GestureRight'] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
        agent = await Agent.load('Clippit', { x: 500, y: 500, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(agent.stateManager, 'setState').mockResolvedValue(undefined);
    });

    it('should use GesturingRight when gesturing at a point to the screen-left', async () => {
        // Agent is at (500, 500) with size 100x100 -> Center is (550, 550)
        // Target (100, 550) is to the screen-left
        await agent.gestureAt(100, 550);

        // Screen-left should trigger Agent-Right
        expect(agent.stateManager.setState).toHaveBeenCalledWith('GesturingRight');
    });

    it('should use GesturingLeft when gesturing at a point to the screen-right', async () => {
        // Target (900, 550) is to the screen-right
        await agent.gestureAt(900, 550);

        // Screen-right should trigger Agent-Left
        expect(agent.stateManager.setState).toHaveBeenCalledWith('GesturingLeft');
    });

    it('should use LookRight when looking at a point to the screen-left', async () => {
        await agent.lookAt(100, 550);

        // Screen-left should trigger Agent-Right
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('LookRight', 'Looking');
    });

    it('should use LookDownRight when looking at a point to the screen-down-left', async () => {
        // Target (100, 900) is screen-down and screen-left from (550, 550)
        await agent.lookAt(100, 900);

        // Screen-DownLeft should trigger Agent-DownRight
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('LookDownRight', 'Looking');
    });
});

describe('Agent.moveTo', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'LookLeft': { frames: [] },
            'LookRight': { frames: [] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Standard RAF mock in setup.ts handles the movement steps
        agent = await Agent.load('Clippit', { x: 500, y: 500, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        // Mock draw to avoid clearRect errors
        vi.spyOn((agent as any).renderer, 'draw').mockImplementation(() => {});
    });

    it('should update coordinates after movement completes', async () => {
        // Move from (500, 500) to (100, 100)
        await agent.moveTo(100, 100, 10000); // Very high speed for the mock RAF

        expect(agent.options.x).toBe(100);
        expect(agent.options.y).toBe(100);
    });

    it('should use Moving animation if it exists', async () => {
        (agent.definition.animations as any)['MovingLeft'] = { frames: [] };

        const playSpy = vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);

        // Move to screen-left
        await agent.moveTo(100, 500, 10000);

        expect(playSpy).toHaveBeenCalledWith('MovingLeft', 'Moving');
    });
});

describe('Agent Visibility', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'Showing': { frames: [{ duration: 100, images: [] }] },
            'Hiding': { frames: [{ duration: 100, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] },
            'Showing': { name: 'Showing', animations: ['Showing'] },
            'Hiding': { name: 'Hiding', animations: ['Hiding'] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Mock playAnimation on the prototype to avoid deadlocks during Agent.load()
        vi.spyOn(AnimationManager.prototype, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(AnimationManager.prototype, 'preloadAnimation').mockResolvedValue(undefined);

        agent = await Agent.load('Clippit');
    });

    it('should set display block when showing', async () => {
        await agent.hide();
        expect((agent as any).container.style.display).toBe('none');

        await agent.show();
        expect((agent as any).container.style.display).toBe('block');
    });

    it('should set display none when hidden', async () => {
        await agent.show();
        expect((agent as any).container.style.display).toBe('block');

        await agent.hide();
        expect((agent as any).container.style.display).toBe('none');
        expect(agent.stateManager.currentStateName).toBe('Hidden');
    });
});

describe('Agent Core Methods', () => {
    let agent: Agent;
    const coreMockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'A1': { frames: [] },
            'A2': { frames: [] },
            'Idle1': { frames: [] }
        },
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: ['Idle1'] } }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(coreMockDefinition);
        (CharacterParser.load as any).mockResolvedValue(coreMockDefinition);
        agent = await Agent.load('Clippit', { x: 100, y: 100, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
    });

    it('setScale should update scale and reposition agent centered', () => {
        // Mock sprite size
        vi.spyOn(agent.spriteManager, 'getSpriteWidth').mockReturnValue(100);
        vi.spyOn(agent.spriteManager, 'getSpriteHeight').mockReturnValue(100);

        // Initial: x=100, y=100, w=100, h=100 -> center=(150, 150)
        agent.setScale(2);

        // New size: 200x200. Center (150, 150) -> TopLeft (150-100, 150-100) = (50, 50)
        expect(agent.options.scale).toBe(2);
        expect(agent.options.x).toBe(50);
        expect(agent.options.y).toBe(50);
    });

    it('animate should play a random non-idle animation', async () => {
        const playSpy = vi.spyOn(agent, 'play');
        agent.animate();

        expect(playSpy).toHaveBeenCalled();
        const animName = (playSpy.mock.calls[0] as any)[0];
        expect(agent.animations()).toContain(animName);
        expect(animName).not.toBe('Idle1');
    });

    it('stopCurrent should stop only the active request', async () => {
        const stopSpy = vi.spyOn(agent.requestQueue, 'stop');
        agent.requestQueue.add(async () => {}); // add a dummy request
        const activeId = agent.requestQueue.activeRequestId;

        agent.stopCurrent();
        expect(stopSpy).toHaveBeenCalledWith(activeId);
    });

    it('stop should set exiting flag on animation manager if animating', () => {
        vi.spyOn(agent.animationManager, 'isAnimating', 'get').mockReturnValue(true);
        agent.stop();
        expect(agent.animationManager.isExitingFlag).toBe(true);
    });
});
