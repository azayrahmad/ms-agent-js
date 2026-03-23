import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionManager } from '../src/core/behavior/ActionManager';
import { AgentCore } from '../src/core/Core';
import { setupGlobals } from './setup';

describe('ActionManager', () => {
    let core: AgentCore;
    let actionManager: ActionManager;
    let setPosSpy: any;

    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: '' },
        balloon: { backColor: 'ffffff', foreColor: '000000', borderColor: '000000', fontName: 'Arial', fontHeight: 12 },
        animations: {
            'GestureLeft': { frames: [] },
            'LookLeft': { frames: [] },
            'MovingRight': { frames: [] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] },
            'GesturingLeft': { name: 'GesturingLeft', animations: ['GestureLeft'] }
        }
    };

    beforeEach(async () => {
        setupGlobals(mockDefinition);
        core = new AgentCore(mockDefinition as any, {
            baseUrl: '', scale: 1, speed: 1, idleIntervalMs: 5000,
            useAudio: false, fixed: true, keepInViewport: true,
            initialAnimation: '', onProgress: () => {}, signal: new AbortController().signal,
            useCache: false, x: 500, y: 500, container: document.createElement('div')
        });
        setPosSpy = vi.fn();
        actionManager = new ActionManager(core, setPosSpy);
        vi.spyOn(core.stateManager, 'playAnimation').mockResolvedValue(true);
        vi.spyOn(core.stateManager, 'setState').mockResolvedValue(undefined);

        // Add animations to definition
        core.definition.animations['LookRight'] = { frames: [] } as any;
        core.definition.animations['GestureLeft'] = { frames: [] } as any;
    });

    it('should calculate 4-way directions correctly', () => {
        // Center is (550, 550)
        expect(actionManager.getDirection(900, 550, 4)).toBe('Right');
        expect(actionManager.getDirection(100, 550, 4)).toBe('Left');
        expect(actionManager.getDirection(550, 900, 4)).toBe('Down');
        expect(actionManager.getDirection(550, 100, 4)).toBe('Up');
    });

    it('should calculate 8-way directions correctly', () => {
        expect(actionManager.getDirection(600, 600, 8)).toBe('DownRight');
        expect(actionManager.getDirection(500, 500, 8)).toBe('UpLeft');
    });

    it('should coordinate gestureAt', async () => {
        // Target screen-right (900, 550) -> Agent-perspective Left
        await actionManager.gestureAt(900, 550);
        expect(core.stateManager.setState).toHaveBeenCalledWith('GesturingLeft');
    });

    it('should coordinate lookAt', async () => {
        // Mock toAgentPerspective by hand: Screen-left (100, 550) from Center (550, 550) is "Left"
        // But ActionManager uses toAgentPerspective which swaps Left/Right
        await actionManager.lookAt(100, 550);
        expect(core.stateManager.playAnimation).toHaveBeenCalledWith('LookRight', 'Looking');
    });
});
