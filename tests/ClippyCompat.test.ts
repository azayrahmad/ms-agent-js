import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { clippy } from '../src/index';

vi.mock('../src/CharacterParser', () => {
    return {
        CharacterParser: {
            load: vi.fn()
        }
    };
});

vi.mock('../src/SpriteManager', () => {
    class SpriteManager {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
        loadSprite = vi.fn().mockResolvedValue(undefined);
    }
    return { SpriteManager };
});

describe('Clippy Compatibility API', () => {
    let agent: Agent;
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
        balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'Show': { frames: [{ duration: 10, images: [] }] },
            'Hide': { frames: [{ duration: 10, images: [] }] },
            'Greeting': { frames: [{ duration: 10, images: [] }] },
            'Idle1': { frames: [{ duration: 10, images: [] }] }
        },
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: ['Idle1'] } }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        // Setup global mocks
        vi.stubGlobal('performance', { now: () => Date.now() });
        vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        vi.stubGlobal('window', {
            innerWidth: 1024,
            innerHeight: 768,
            setTimeout: (fn: any, ms: any) => setTimeout(fn, ms),
            clearTimeout: (id: any) => clearTimeout(id),
            requestAnimationFrame: (fn: any) => setTimeout(() => fn(Date.now()), 1),
            cancelAnimationFrame: (id: any) => clearTimeout(id),
            speechSynthesis: {
                getVoices: vi.fn().mockReturnValue([]),
                speak: vi.fn(),
                cancel: vi.fn(),
                speaking: false
            },
            performance: { now: () => Date.now() }
        });
        vi.stubGlobal('document', {
            createElement: vi.fn().mockImplementation((tag) => ({
                style: {}, appendChild: vi.fn(), className: '', attachShadow: vi.fn().mockReturnValue({ appendChild: vi.fn() }),
                getContext: vi.fn().mockReturnValue({}), addEventListener: vi.fn(), getBoundingClientRect: vi.fn().mockReturnValue({ width: 100, height: 100 }),
                styleSheets: []
            })),
            createElementNS: vi.fn().mockImplementation(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn() })),
            body: { appendChild: vi.fn() }
        });

        const { CharacterParser } = await import('../src/CharacterParser');
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        // Test clippy.load
        await new Promise<void>((resolve) => {
            clippy.load('Clippit', (a: Agent) => {
                agent = a;
                resolve();
            });
        });

        vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(agent.stateManager, 'setState').mockResolvedValue(undefined);
        vi.spyOn(agent.animationManager, 'pause');
        vi.spyOn(agent.animationManager, 'resume');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should have clippy global exported', () => {
        expect(clippy).toBeDefined();
        expect(clippy.load).toBeDefined();
    });

    it('should support agent.animations()', () => {
        const anims = agent.animations();
        expect(anims).toContain('Greeting');
        expect(anims).toContain('Show');
    });

    it('should support agent.hasAnimation()', () => {
        expect(agent.hasAnimation('Greeting')).toBe(true);
        expect(agent.hasAnimation('NonExistent')).toBe(false);
    });

    it('should support agent.play() with callback as 3rd arg', async () => {
        const cb = vi.fn();
        await agent.play('Greeting', 5000, cb);
        expect(cb).toHaveBeenCalledWith('Greeting', 'EXITED');
    });

    it('should support agent.play() with callback as 2nd arg', async () => {
        const cb = vi.fn();
        await agent.play('Greeting', cb);
        expect(cb).toHaveBeenCalledWith('Greeting', 'EXITED');
    });

    it('should support agent.speak() with callback', async () => {
        const cb = vi.fn();
        vi.spyOn(agent.balloon, 'speak').mockImplementation((c) => (c as any)());
        await agent.speak('Hello', cb);
        expect(cb).toHaveBeenCalled();
    });

    it('should support agent.speak() with hold boolean as 2nd arg', async () => {
        const speakSpy = vi.spyOn(agent.balloon, 'speak').mockImplementation((c) => (c as any)());
        await agent.speak('Hello', true);
        expect(speakSpy).toHaveBeenCalledWith(expect.any(Function), 'Hello', true, true, false);
    });

    it('should support agent.show(fast)', async () => {
        vi.spyOn(agent.stateManager, 'resume');
        await agent.show(true);
        expect(agent.stateManager.resume).toHaveBeenCalled();
        expect((agent as any).container.style.display).toBe('block');
    });

    it('should support agent.hide(fast, callback)', async () => {
        const cb = vi.fn();
        await agent.hide(true, cb);
        expect(cb).toHaveBeenCalled();
        expect(agent.animationManager.pause).toHaveBeenCalled();
        expect((agent as any).container.style.display).toBe('none');
    });

    it('should support agent.moveTo with duration', async () => {
        const setPosSpy = vi.spyOn(agent as any, 'setInstantPosition');

        // Mock performance.now to give predictable progress
        let now = 1000;
        vi.stubGlobal('performance', { now: () => now });

        // Capture moveStep
        let moveStep: any;
        vi.stubGlobal('requestAnimationFrame', (fn: any) => {
            moveStep = fn;
            return 1;
        });

        const req = agent.moveTo(100, 100, 500); // 500ms duration

        // Wait for task to start
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(moveStep).toBeDefined();
        // Advance now to be exactly duration
        now += 500;
        moveStep(now);

        await req;
        expect(setPosSpy).toHaveBeenCalled();
        expect(agent.options.x).toBe(100);
        expect(agent.options.y).toBe(100);
    });

    it('should support agent.animate()', async () => {
        const spy = vi.spyOn(agent, 'play');
        agent.animate();
        expect(spy).toHaveBeenCalled();
    });

    it('should support agent.stopCurrent()', () => {
        vi.spyOn(agent.requestQueue, 'stop');
        // Force an active request ID
        (agent.requestQueue as any).currentEntry = { request: { id: 1, interrupt: vi.fn() } };

        agent.stopCurrent();
        expect(agent.requestQueue.stop).toHaveBeenCalledWith(1);
    });

    it('should clear queue on agent.stop()', () => {
        vi.spyOn(agent.requestQueue, 'stop');
        agent.stop();
        expect(agent.requestQueue.stop).toHaveBeenCalledWith(undefined);
    });

    it('should support agent.pause() and agent.resume()', () => {
        agent.pause();
        expect(agent.animationManager.pause).toHaveBeenCalled();
        agent.resume();
        expect(agent.animationManager.resume).toHaveBeenCalled();
    });
});
