import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';
import { RequestStatus } from '../src/core/base/types';

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

describe('Agent Public API', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] },
            'B': { name: 'B', frames: [{ duration: 10, images: [] }] },
            'Writing': { name: 'Writing', frames: [{ duration: 10, images: [] }] },
            'Explain': { name: 'Explain', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] },
            'Speaking': { name: 'Speaking', animations: ['Explain'] }
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    it('should return all animation names with animations()', async () => {
        const agent = await Agent.load('Clippit');
        expect(agent.animations()).toEqual(['A', 'B', 'Writing', 'Explain']);
    });

    it('should check if animation exists with hasAnimation()', async () => {
        const agent = await Agent.load('Clippit');
        expect(agent.hasAnimation('A')).toBe(true);
        expect(agent.hasAnimation('NonExistent')).toBe(false);
    });

    it('should play a random animation with animate()', async () => {
        const agent = await Agent.load('Clippit');
        vi.spyOn(agent, 'play').mockReturnValue({} as any);
        agent.animate();
        expect(agent.play).toHaveBeenCalled();
    });

    it('should set scale and reposition with setScale()', async () => {
        const agent = await Agent.load('Clippit');
        const setInstantPositionSpy = vi.spyOn(agent as any, 'setInstantPosition');
        agent.setScale(2);
        expect(agent.options.scale).toBe(2);
        expect(setInstantPositionSpy).toHaveBeenCalled();
    });

    it('should show HTML in balloon with showHtml()', async () => {
        const agent = await Agent.load('Clippit');
        const showHtmlSpy = vi.spyOn(agent.balloon, 'showHtml');
        agent.showHtml('<b>Hello</b>', true);
        expect(showHtmlSpy).toHaveBeenCalledWith('<b>Hello</b>', true);
    });

    it('should support queuing a delay with delay()', async () => {
        const agent = await Agent.load('Clippit');
        const request = agent.delay(100);
        expect(request.status).toBe(RequestStatus.InProgress);
        await request;
        expect(request.status).toBe(RequestStatus.Complete);
    });

    it('should stop only the current request with stopCurrent()', async () => {
        const agent = await Agent.load('Clippit');

        const req1 = agent.enqueueRequest(async (request) => {
            while (!request.isCancelled) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            return undefined;
        });

        const req2 = agent.delay(1000);

        // Wait a bit to ensure req1 is InProgress
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(req1.status).toBe(RequestStatus.InProgress);

        agent.stopCurrent();

        expect(req1.status).toBe(RequestStatus.Interrupted);

        // Use a loop to wait for status change to avoid flaky timeouts
        let iterations = 0;
        while (req2.status !== RequestStatus.InProgress && iterations < 20) {
            await new Promise(resolve => setTimeout(resolve, 20));
            iterations++;
        }

        expect(req2.status).toBe(RequestStatus.InProgress);
    });

    it('should interrupt current actions with interrupt()', async () => {
        const agent = await Agent.load('Clippit');
        const req1 = agent.delay(1000);
        vi.spyOn(agent, 'play').mockReturnValue({} as any);

        agent.interrupt('B');

        expect(req1.status).toBe(RequestStatus.Interrupted);
        expect(agent.play).toHaveBeenCalledWith('B');
    });

    describe('agent.ask()', () => {
        it('should return a request that resolves to an InteractionResult', async () => {
            const agent = await Agent.load('Clippit');
            const askRequest = agent.ask('Test Question');
            expect(askRequest.promise).toBeInstanceOf(Promise);

            agent.balloon.close();
            const result = await askRequest;
            expect(result).toHaveProperty('choiceIndex');
            expect(result).toHaveProperty('buttonIndex');
            expect(result).toHaveProperty('checkboxChecked');
        });
    });
});
