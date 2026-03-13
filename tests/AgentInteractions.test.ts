import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/CharacterParser';

vi.mock('../src/CharacterParser', () => ({
    CharacterParser: {
        load: vi.fn()
    }
}));

vi.mock('../src/SpriteManager', () => {
    class SpriteManager {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
    }
    return { SpriteManager };
});

describe('Agent Interactions', () => {
    let agent: Agent;
    let canvas: any;
    let styleElement: any;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.clearAllMocks();

        vi.stubGlobal('window', {
            innerWidth: 1024,
            innerHeight: 768,
            AudioContext: vi.fn().mockImplementation(() => ({
                createBuffer: vi.fn(),
                decodeAudioData: vi.fn(),
            })),
            requestAnimationFrame: vi.fn().mockReturnValue(1),
            cancelAnimationFrame: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        vi.stubGlobal('document', {
            createElementNS: vi.fn().mockImplementation((ns, tag) => {
                return {
                    style: {},
                    appendChild: vi.fn(),
                    setAttribute: vi.fn(),
                };
            }),
            createElement: vi.fn().mockImplementation((tag) => {
                const el: any = {
                    style: {},
                    appendChild: vi.fn(),
                    className: '',
                    classList: { add: vi.fn(), remove: vi.fn() },
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    querySelector: vi.fn(),
                    getBoundingClientRect: vi.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }),
                };
                el.attachShadow = vi.fn().mockReturnValue({
                    appendChild: vi.fn().mockImplementation((child) => {
                        if (tag === 'div' && child.tagName === 'STYLE') styleElement = child;
                    }),
                    host: el
                });

                if (tag === 'canvas') {
                    el.tagName = 'CANVAS';
                    el.getContext = vi.fn().mockReturnValue({});
                    canvas = el;
                } else if (tag === 'style') {
                    el.tagName = 'STYLE';
                    styleElement = el;
                }
                return el;
            }),
            body: {
                appendChild: vi.fn()
            }
        });

        const mockDefinition = {
            character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
            balloon: { borderColor: '000000', backColor: 'ffffff', foreColor: '000000', fontName: 'Arial', fontHeight: 12 },
            animations: {},
            states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
        };
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        agent = await Agent.load('Clippit');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should have touch-action: none on the canvas in styles', () => {
        expect(styleElement.textContent).toContain('touch-action: none');
    });

    it('should emit contextmenu event when canvas receives contextmenu event', () => {
        const listener = vi.fn();
        agent.on('contextmenu', listener);

        // Find the contextmenu listener on canvas
        const contextMenuListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'contextmenu')[1];

        const mockEvent = {
            preventDefault: vi.fn(),
            clientX: 100,
            clientY: 200
        };

        contextMenuListener(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(listener).toHaveBeenCalledWith({
            x: 100,
            y: 200,
            originalEvent: mockEvent
        });
    });

    it('should emit contextmenu event on long press (500ms)', () => {
        const listener = vi.fn();
        agent.on('contextmenu', listener);

        const pointerDownListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        const mockEvent = {
            button: 0,
            clientX: 100,
            clientY: 200
        };

        pointerDownListener(mockEvent);

        vi.advanceTimersByTime(499);
        expect(listener).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(listener).toHaveBeenCalledWith({
            x: 100,
            y: 200,
            originalEvent: mockEvent
        });
    });

    it('should cancel long press if pointerup occurs before 500ms', () => {
        const listener = vi.fn();
        agent.on('contextmenu', listener);

        const pointerDownListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        pointerDownListener({ button: 0, clientX: 100, clientY: 200 });

        const pointerUpListener = (window.addEventListener as any).mock.calls.find((call: any) => call[0] === 'pointerup')[1];

        vi.advanceTimersByTime(250);
        pointerUpListener();

        vi.advanceTimersByTime(250);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should cancel long press if moved significantly', () => {
        const listener = vi.fn();
        agent.on('contextmenu', listener);

        const pointerDownListener = canvas.addEventListener.mock.calls.find((call: any) => call[0] === 'pointerdown')[1];

        pointerDownListener({ button: 0, clientX: 100, clientY: 200 });

        const pointerMoveListener = (window.addEventListener as any).mock.calls.find((call: any) => call[0] === 'pointermove')[1];

        vi.advanceTimersByTime(250);
        // Move significantly (> 3px)
        pointerMoveListener({ clientX: 110, clientY: 210 });

        vi.advanceTimersByTime(250);
        expect(listener).not.toHaveBeenCalled();
    });
});
