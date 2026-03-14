import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
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

describe('Agent.moveTo fallback', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'LookLeft': { frames: [] },
            'LookRight': { frames: [] },
            'LookUp': { frames: [] },
            'LookDown': { frames: [] },
            'LookUpLeft': { frames: [] },
            'LookUpRight': { frames: [] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Prevent requestAnimationFrame loops
        vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));

        agent = await Agent.load('Clippit', { x: 500, y: 500, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        // Mock draw to avoid clearRect errors
        vi.spyOn((agent as any).renderer, 'draw').mockImplementation(() => {});
    });

    it('should use Look animation if Moving animation is missing (with perspective swap)', async () => {
        // Capture the moveStep function
        let moveStep: any;
        vi.stubGlobal('requestAnimationFrame', (fn: any) => {
            moveStep = fn;
            return 1;
        });

        // Agent at (500, 500), center (550, 550)
        // Move to (100, 100) -> Screen direction is UpLeft
        const req = agent.moveTo(100, 100);

        // Screen UpLeft should trigger Agent UpRight (swapped)
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('LookUpRight', 'Moving');

        // Finish movement
        moveStep(performance.now() + 10000);
        await req;
    });

    it('should use Moving animation if it exists', async () => {
        // Capture the moveStep function
        let moveStep: any;
        vi.stubGlobal('requestAnimationFrame', (fn: any) => {
            moveStep = fn;
            return 1;
        });

        (agent.definition.animations as any)['MovingLeft'] = { frames: [] };

        // Move to screen-left
        const req = agent.moveTo(100, 500);

        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('MovingLeft', 'Moving');

        // Finish movement
        moveStep(performance.now() + 10000);
        await req;
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

    it('should await the full Showing animation', async () => {
        const playSpy = agent.animationManager.playAnimation;

        await agent.show();

        // Showing animation should be called with useExitBranch=true to play once to completion
        expect(playSpy).toHaveBeenCalledWith('Showing', true);
        // Note: With the non-blocking returnToIdle, the state name might still be 'Showing'
        // immediately after show() resolves if we don't wait for the idle transition.
    });

    it('should await the full Hiding animation and then set display none', async () => {
        const playSpy = agent.animationManager.playAnimation;

        await agent.hide();

        // Hiding animation should be called with useExitBranch=true to play once to completion
        expect(playSpy).toHaveBeenCalledWith('Hiding', true);
        expect(agent.stateManager.currentStateName).toBe('Hidden');
        // Container should be hidden after await
        expect((agent as any).container.style.display).toBe('none');
    });
});
