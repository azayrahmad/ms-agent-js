import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputManager } from '../src/ui/InputManager';
import { AgentCore } from '../src/core/Core';
import { AgentRenderer } from '../src/ui/Renderer';
import { setupGlobals } from './setup';

describe('InputManager', () => {
    let core: AgentCore;
    let renderer: AgentRenderer;
    let inputManager: InputManager;
    let emitSpy: any;
    let setPosSpy: any;

    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: '' },
        balloon: { backColor: 'ffffff', foreColor: '000000', borderColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {},
        states: { 'IdlingLevel1': { name: 'IdlingLevel1', animations: [] } }
    };

    beforeEach(async () => {
        setupGlobals(mockDefinition);
        const options = {
            baseUrl: '', scale: 1, speed: 1, idleIntervalMs: 5000,
            useAudio: false, fixed: true, keepInViewport: true,
            initialAnimation: '', onProgress: () => {}, signal: new AbortController().signal,
            useCache: false, x: 100, y: 100, container: document.createElement('div')
        };
        core = new AgentCore(mockDefinition as any, options as any);
        renderer = new AgentRenderer(core, options.container);
        emitSpy = vi.fn();
        setPosSpy = vi.fn();
        inputManager = new InputManager(core, renderer, emitSpy, setPosSpy);
    });

    it('should handle dragging', () => {
        const canvas = renderer.canvas;

        // Simulate start drag
        const downEvent = { type: 'pointerdown', button: 0, clientX: 100, clientY: 100 } as any;
        const downListener = (canvas as any).listeners['pointerdown'][0];
        downListener(downEvent);
        expect(emitSpy).toHaveBeenCalledWith('dragstart');

        // Simulate move
        const moveEvent = { type: 'pointermove', clientX: 150, clientY: 150 } as any;
        const moveListener = (window as any).listeners['pointermove'][0];
        moveListener(moveEvent);
        expect(setPosSpy).toHaveBeenCalledWith(150, 150);
        expect(emitSpy).toHaveBeenCalledWith('drag', { x: 150, y: 150 });

        // Simulate end
        const upEvent = { type: 'pointerup' } as any;
        const upListener = (window as any).listeners['pointerup'][0];
        upListener(upEvent);
        expect(emitSpy).toHaveBeenCalledWith('dragend');
    });

    it('should handle window resize', () => {
        (window as any).innerWidth = 500;
        (window as any).innerHeight = 500;

        // Move agent near edge
        core.options.x = 450;
        core.options.y = 450;

        inputManager.handleResize();

        // Max X = 500 - 100 = 400
        expect(setPosSpy).toHaveBeenCalledWith(400, 400);
        expect(emitSpy).toHaveBeenCalledWith('reposition', { x: 400, y: 400 });
    });
});
