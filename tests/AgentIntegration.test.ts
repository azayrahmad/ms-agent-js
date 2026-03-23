import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { RequestStatus } from '../src/core/base/types';
import { setupGlobals } from './setup';

// Mock everything needed for Agent environment
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

describe('Agent Integration', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] },
            'B': { name: 'B', frames: [{ duration: 10, images: [] }] },
            'MovingRight': { name: 'MovingRight', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    it('should suppress idles when actions are queued', async () => {
        const agent = await Agent.load('Clippit');
        // Initial idle state set in init (non-queued)
        expect(agent.requestQueue.isEmpty).toBe(true);

        agent.play('A');
        expect(agent.requestQueue.isEmpty).toBe(false);

        // Drive state machine
        await agent.stateManager.update(100);

        // StateManager should have seen the queue is not empty and reset idle timer
        expect((agent.stateManager as any).machine.context.elapsedSinceLastTick).toBe(0);
    });

    it('should allow waiting for a previous request', async () => {
        // Mock playAnimation BEFORE loading the agent to catch any initial show/idle animations
        let resolveAnim: any;
        const animPromise = new Promise<boolean>(resolve => { resolveAnim = resolve; });
        const playSpy = vi.spyOn(AnimationManager.prototype, 'playAnimation').mockReturnValue(animPromise as any);

        const agent = await Agent.load('Clippit');

        // Clear any initial requests if they happened
        agent.stop();
        playSpy.mockClear();

        const req1 = agent.play('A');
        // Ensure req1 task has started and is blocked on our animPromise
        await new Promise(resolve => setTimeout(resolve, 50));

        const req2 = agent.wait(req1);
        const req3 = agent.play('B');

        expect(req1.status).toBe(RequestStatus.InProgress);
        expect(req2.status).toBe(RequestStatus.Pending);
        expect(req3.status).toBe(RequestStatus.Pending);

        // Complete req1
        resolveAnim(true);
        await req1;
        // Wait for queue to process next
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(req1.status).toBe(RequestStatus.Complete);
        expect(req2.status).toBe(RequestStatus.Complete);
        // req3 status might still be pending if the queue hasn't fully ticked the task
        expect(req3.status).not.toBe(RequestStatus.Pending);
    });

    it('should perform animated moveTo', async () => {
        const agent = await Agent.load('Clippit');
        const setPosSpy = vi.spyOn(agent as any, 'setInstantPosition');
        vi.spyOn(agent.actionManager as any, 'setInstantPosition');

        // We need to capture the moveStep function passed to requestAnimationFrame
        let moveStep: any;
        vi.stubGlobal('requestAnimationFrame', (fn: any) => {
            moveStep = fn;
            return 1;
        });
        // Mock current time
        let now = 1000;
        vi.stubGlobal('performance', { now: () => now });

        // Set initial pos
        (agent as any).options.x = 0;
        (agent as any).options.y = 0;

        const req = agent.moveTo(500, 500, 1000); // 1000 px/s

        // Drive the microtasks
        await Promise.resolve();
        await Promise.resolve();

        expect(moveStep).toBeDefined();

        // Advance halfway (Distance is sqrt(500^2 + 500^2) ≈ 707)
        // Duration = 707 / 1000 = 0.707s = 707ms
        now += 350;
        if (moveStep) moveStep(now);

        expect(agent.actionManager['setInstantPosition']).toHaveBeenCalled();
        const lastPos = (agent.actionManager['setInstantPosition'] as any).mock.calls[(agent.actionManager['setInstantPosition'] as any).mock.calls.length - 1];
        // progress = 350 / 707.1 ≈ 0.495
        // expected x ≈ 0 + 500 * 0.495 ≈ 247.5
        expect(lastPos[0]).toBeGreaterThan(200);
        expect(lastPos[0]).toBeLessThan(300);

        // Finish
        now += 1000;
        if (moveStep) moveStep(now);
        await req;
        expect(agent.options.x).toBe(500);
        expect(agent.options.y).toBe(500);
    });
});
