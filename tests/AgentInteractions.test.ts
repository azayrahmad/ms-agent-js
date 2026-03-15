import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';

// Mock everything needed for Agent environment
vi.mock('../src/core/resources/CharacterParser', () => ({
    CharacterParser: { load: vi.fn(), parse: vi.fn() }
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

describe('Agent Interactions', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] }
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

    it('should have touch-action: none on the canvas in styles', async () => {
        const agent = await Agent.load('Clippit');
        const shadowRoot = (agent as any).renderer.shadowRoot;
        const style = Array.from(shadowRoot.childNodes).find((c: any) => c.nodeName === 'STYLE') as any;
        expect(style.textContent).toContain('touch-action: none');
    });

    it('should emit contextmenu event when canvas receives contextmenu event', async () => {
        const agent = await Agent.load('Clippit');
        const onContextMenu = vi.fn();
        agent.on('contextmenu', onContextMenu);

        const canvas = (agent as any).renderer.canvas;
        const event = {
            preventDefault: vi.fn(),
            clientX: 100,
            clientY: 200
        };

        const listener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'contextmenu')[1];
        listener(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(onContextMenu).toHaveBeenCalledWith(expect.objectContaining({
            x: 100,
            y: 200,
            originalEvent: event
        }));
    });

    it('should emit contextmenu event on long press (500ms)', async () => {
        vi.useFakeTimers();
        // Update window stub to use fake timers
        (window as any).setTimeout = global.setTimeout;
        (window as any).clearTimeout = global.clearTimeout;

        const agent = await Agent.load('Clippit');
        const onContextMenu = vi.fn();
        agent.on('contextmenu', onContextMenu);

        const canvas = (agent as any).renderer.canvas;
        const downListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        downListener({ button: 0, clientX: 100, clientY: 200 });

        vi.advanceTimersByTime(500);

        expect(onContextMenu).toHaveBeenCalledWith(expect.objectContaining({
            x: 100,
            y: 200
        }));
        vi.useRealTimers();
    });

    it('should cancel long press if pointerup occurs before 500ms', async () => {
        vi.useFakeTimers();
        (window as any).setTimeout = global.setTimeout;
        (window as any).clearTimeout = global.clearTimeout;

        const agent = await Agent.load('Clippit');
        const onContextMenu = vi.fn();
        agent.on('contextmenu', onContextMenu);

        const canvas = (agent as any).renderer.canvas;
        const downListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        downListener({ button: 0, clientX: 100, clientY: 200 });

        vi.advanceTimersByTime(250);

        const upListener = window.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerup')[1];
        upListener();

        vi.advanceTimersByTime(250);

        expect(onContextMenu).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('should cancel long press if moved significantly', async () => {
        vi.useFakeTimers();
        (window as any).setTimeout = global.setTimeout;
        (window as any).clearTimeout = global.clearTimeout;

        const agent = await Agent.load('Clippit');
        const onContextMenu = vi.fn();
        agent.on('contextmenu', onContextMenu);

        const canvas = (agent as any).renderer.canvas;
        const downListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        downListener({ button: 0, clientX: 100, clientY: 200 });

        vi.advanceTimersByTime(100);

        const moveListener = window.addEventListener.mock.calls.find((call: any) => call[0] === 'pointermove')[1];
        moveListener({ clientX: 110, clientY: 210 });

        vi.advanceTimersByTime(400);

        expect(onContextMenu).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
