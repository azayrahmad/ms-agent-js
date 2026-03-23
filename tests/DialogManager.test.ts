import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogManager } from '../src/ui/DialogManager';
import { AgentCore } from '../src/core/Core';
import { AgentRenderer } from '../src/ui/Renderer';
import { setupGlobals } from './setup';

describe('DialogManager', () => {
    let core: AgentCore;
    let renderer: AgentRenderer;
    let dialogManager: DialogManager;
    let startTalkingSpy: any;

    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: '', style: 0 },
        balloon: { backColor: 'ffffff', foreColor: '000000', borderColor: '000000', fontName: 'Arial', fontHeight: 12, charsPerLine: 20, numLines: 2 },
        animations: {
            'Explain': { frames: [] },
            'Writing': { frames: [] }
        },
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
        startTalkingSpy = vi.fn();
        dialogManager = new DialogManager(core, renderer, startTalkingSpy);
        vi.spyOn(core.stateManager, 'playAnimation').mockResolvedValue(true);
    });

    it('should open an interactive dialog and resolve on button click', async () => {
        const askPromise = dialogManager.ask({
            title: 'Test',
            content: ['Hello'],
            buttons: [{ label: 'OK', value: 'ok_val' }]
        });

        // Small delay for task to start and DOM to be populated
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(startTalkingSpy).toHaveBeenCalled();

        const balloonEl = renderer.balloon.balloonEl;
        const button = (balloonEl as any).lastQueriedCustomButtons[0];

        button.click();

        const result = await askPromise;
        expect(result).toEqual({ value: 'ok_val', text: null, checked: false });
    });

    it('should handle choices and input', async () => {
        const askPromise = dialogManager.ask({
            content: [
                { type: 'choices', items: ['Choice 1'] },
                { type: 'input', placeholder: 'Type...' }
            ]
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        const balloonEl = renderer.balloon.balloonEl;
        const textarea = (balloonEl as any).lastQueriedTextarea;
        const choicesList = (balloonEl as any).lastQueriedChoicesList;

        textarea.value = 'User text';

        // Mock choice click
        const li = document.createElement('li');
        li.setAttribute('data-index', '0');
        const clickEvent = { target: li, currentTarget: li, preventDefault: () => {} };
        const clickListener = (choicesList as any).listeners['click'][0];
        clickListener(clickEvent);

        const result = await askPromise;
        expect(result).toEqual({ value: 0, text: 'User text', checked: false });
    });
});
