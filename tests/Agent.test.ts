import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/CharacterParser';
import { AnimationManager } from '../src/AnimationManager';

// Mock CharacterParser.load to avoid actual network requests
vi.mock('../src/CharacterParser', () => {
    return {
        CharacterParser: {
            load: vi.fn()
        }
    };
});

// Mock SpriteManager to avoid canvas/BMP logic in Node environment
vi.mock('../src/SpriteManager', () => {
    class SpriteManager {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
    }
    return { SpriteManager };
});

describe('Agent.load', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock window.innerWidth and window.innerHeight
        vi.stubGlobal('window', {
            innerWidth: 1024,
            innerHeight: 768,
            AudioContext: vi.fn().mockImplementation(() => ({
                createBuffer: vi.fn(),
                decodeAudioData: vi.fn(),
            })),
            requestAnimationFrame: vi.fn().mockReturnValue(1),
            cancelAnimationFrame: vi.fn(),
            navigator: { userAgent: 'test' },
            speechSynthesis: {
                getVoices: vi.fn().mockReturnValue([]),
                speak: vi.fn(),
                cancel: vi.fn(),
                speaking: false
            }
        });
        vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        // Mock document.createElement for canvas and style
        vi.stubGlobal('document', {
            createElementNS: vi.fn().mockImplementation((ns, tag) => {
                const el: any = {
                    style: {},
                    appendChild: vi.fn(),
                    setAttribute: vi.fn(),
                    className: '',
                    querySelector: vi.fn(),
                };
                return el;
            }),
            createElement: vi.fn().mockImplementation((tag) => {
                const el: any = {
                    style: {},
                    appendChild: vi.fn(),
                    className: '',
                    classList: {
                        add: vi.fn(),
                        remove: vi.fn()
                    },
                    addEventListener: vi.fn(),
                    querySelector: vi.fn(),
                    getBoundingClientRect: vi.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }),
                    offsetWidth: 0,
                    offsetHeight: 0
                };

                if (tag === 'canvas') {
                    el.getContext = vi.fn().mockReturnValue({});
                    el.width = 0;
                    el.height = 0;
                    el.getBoundingClientRect = vi.fn().mockReturnValue({ width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100 });
                } else if (tag === 'style') {
                    el.textContent = '';
                } else if (tag === 'div') {
                    el.attachShadow = vi.fn().mockReturnValue({
                        appendChild: vi.fn(),
                        host: el
                    });
                }
                return el;
            }),
            body: {
                appendChild: vi.fn()
            }
        });
    });

    it('should use unpkg CDN as default baseUrl when none is provided', async () => {
        const mockDefinition = {
            character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
            balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
            animations: {},
            states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
        };
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        const agentName = 'Clippit';
        await Agent.load(agentName);

        const expectedBaseUrl = `https://unpkg.com/ms-agent-js@latest/dist/agents/${agentName}`;
        const expectedAcdPath = `${expectedBaseUrl}/${agentName.toUpperCase()}.acd`;

        expect(CharacterParser.load).toHaveBeenCalledWith(expectedAcdPath);
    });

    it('should use provided baseUrl when one is given', async () => {
        const mockDefinition = {
            character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
            balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
            animations: {},
            states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
        };
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        const agentName = 'Clippit';
        const customBaseUrl = '/custom/path/to/agent';
        await Agent.load(agentName, { baseUrl: customBaseUrl });

        const expectedAcdPath = `${customBaseUrl}/${agentName.toUpperCase()}.acd`;

        expect(CharacterParser.load).toHaveBeenCalledWith(expectedAcdPath);
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
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
        agent = await Agent.load('Clippit', { x: 500, y: 500, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(agent.stateManager, 'setState').mockResolvedValue(undefined);
    });

    it('should use gesturingright when gesturing at a point to the screen-left', async () => {
        // Agent is at (500, 500) with size 100x100 -> Center is (550, 550)
        // Target (100, 550) is to the screen-left
        await agent.gestureAt(100, 550);

        // Screen-left should trigger Agent-Right
        expect(agent.stateManager.setState).toHaveBeenCalledWith('gesturingright');
    });

    it('should use gesturingleft when gesturing at a point to the screen-right', async () => {
        // Target (900, 550) is to the screen-right
        await agent.gestureAt(900, 550);

        // Screen-right should trigger Agent-Left
        expect(agent.stateManager.setState).toHaveBeenCalledWith('gesturingleft');
    });

    it('should use lookright when looking at a point to the screen-left', async () => {
        await agent.lookAt(100, 550);

        // Screen-left should trigger Agent-Right
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('lookright', 'looking');
    });

    it('should use lookdownright when looking at a point to the screen-down-left', async () => {
        // Target (100, 900) is screen-down and screen-left from (550, 550)
        await agent.lookAt(100, 900);

        // Screen-DownLeft should trigger Agent-DownRight
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('lookdownright', 'looking');
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
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Prevent requestAnimationFrame loops
        vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));

        agent = await Agent.load('Clippit', { x: 500, y: 500, scale: 1 });
        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        // Mock draw to avoid clearRect errors
        vi.spyOn(agent as any, 'draw').mockImplementation(() => {});
    });

    it('should use look animation if moving animation is missing (with perspective swap)', async () => {
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
        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('lookupright', 'moving');

        // Finish movement
        moveStep(performance.now() + 10000);
        await req;
    });

    it('should use moving animation if it exists', async () => {
        // Capture the moveStep function
        let moveStep: any;
        vi.stubGlobal('requestAnimationFrame', (fn: any) => {
            moveStep = fn;
            return 1;
        });

        (agent.definition.animations as any)['movingleft'] = { frames: [] };

        // Move to screen-left
        const req = agent.moveTo(100, 500);

        expect(agent.stateManager.playAnimation).toHaveBeenCalledWith('movingleft', 'moving');

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
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Mock playAnimation on the prototype to avoid deadlocks during Agent.load()
        vi.spyOn(AnimationManager.prototype, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(AnimationManager.prototype, 'preloadAnimation').mockResolvedValue(undefined);

        agent = await Agent.load('Clippit');
    });

    it('should await the full showing animation', async () => {
        const playSpy = agent.animationManager.playAnimation;

        await agent.show();

        // Showing animation should be called with useExitBranch=true to play once to completion
        expect(playSpy).toHaveBeenCalledWith('showing', true);
        // Note: With the non-blocking returnToIdle, the state name might still be 'showing'
        // immediately after show() resolves if we don't wait for the idle transition.
    });

    it('should await the full hiding animation and then set display none', async () => {
        const playSpy = agent.animationManager.playAnimation;

        await agent.hide();

        // Hiding animation should be called with useExitBranch=true to play once to completion
        expect(playSpy).toHaveBeenCalledWith('hiding', true);
        expect(agent.stateManager.currentStateName).toBe('hidden');
        // Container should be hidden after await
        expect((agent as any).container.style.display).toBe('none');
    });
});
