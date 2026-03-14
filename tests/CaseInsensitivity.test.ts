import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/CharacterParser';

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
        loadSprite = vi.fn().mockResolvedValue(undefined);
        drawFrame = vi.fn();
    }
    return { SpriteManager };
});

describe('Case Insensitivity', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'Greet': { name: 'Greet', frames: [{ duration: 10, images: [] }] },
            'LookLeft': { name: 'LookLeft', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['Greet'] },
            'Searching': { name: 'Searching', animations: ['LookLeft'] }
        }
    };

    beforeEach(async () => {
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

        (CharacterParser.load as any).mockResolvedValue(JSON.parse(JSON.stringify(mockDefinition)));
        agent = await Agent.load('Clippit');
    });

    it('should play animation with case-insensitive name and resolve to original casing', async () => {
        const spy = vi.spyOn(agent.stateManager, 'playAnimation');
        spy.mockResolvedValue(true);

        await agent.play('greet');
        expect(spy).toHaveBeenCalledWith('Greet', 'Playing', true, undefined, false);
    });

    it('should check hasAnimation with case-insensitive name', () => {
        expect(agent.hasAnimation('GREET')).toBe(true);
    });

    it('should set state with case-insensitive name and resolve to original casing', async () => {
        await agent.setState('searching');
        expect(agent.stateManager.currentStateName).toBe('Searching');
    });

    it('should preserve original casing in animations()', () => {
        const animations = agent.animations();
        expect(animations).toContain('Greet');
        expect(animations).toContain('LookLeft');
        expect(animations).not.toContain('greet');
    });

    it('should emit events with original casing', async () => {
        const startSpy = vi.fn();
        const endSpy = vi.fn();
        agent.on('animationStart', startSpy);
        agent.on('animationEnd', endSpy);

        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        await agent.play('GREET');

        expect(startSpy).toHaveBeenCalledWith('Greet');
        expect(endSpy).toHaveBeenCalledWith('Greet');
    });
});
