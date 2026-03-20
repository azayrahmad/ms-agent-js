import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../src/core/behavior/StateManager';

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockAnimationManager: any;
  let mockStates: any;

  beforeEach(() => {
    mockAnimationManager = {
      isAnimating: false,
      preloadAnimation: vi.fn().mockResolvedValue(undefined),
      interruptAndPlayAnimation: vi.fn().mockResolvedValue(true),
      playAnimation: vi.fn().mockResolvedValue(true),
      setAnimation: vi.fn(),
      handleAnimationCompleted: vi.fn(),
      animations: {
        'idle1': {},
        'idle2': {},
        'show': {},
        'hide': {},
        'CustomShow': {},
        'CustomHide': {}
      }
    };

    mockStates = {
      'IdlingLevel1': { name: 'IdlingLevel1', animations: ['idle1'] },
      'IdlingLevel2': { name: 'IdlingLevel2', animations: ['idle2'] },
      'Showing': { name: 'Showing', animations: ['show'] },
      'Hiding': { name: 'Hiding', animations: ['hide'] }
    };

    stateManager = new StateManager(mockStates, mockAnimationManager as any, {
      idleIntervalMs: 1000,
      ticksPerLevel: 3
    });
  });

  it('should progress idle tick', async () => {
    await stateManager.handleVisibilityChange(true);
    await stateManager.setState('IdlingLevel1');

    expect(stateManager.timeUntilNextTick).toBe(1000);

    await stateManager.update(500);
    expect(stateManager.timeUntilNextTick).toBe(500);

    await stateManager.update(500);
    expect(stateManager.timeUntilNextTick).toBe(1000);
  });

  it('should start ticking immediately after initialization and setState', async () => {
    expect(stateManager.currentStateName).toBe('Hidden');

    await stateManager.setState('IdlingLevel1');
    expect(stateManager.currentStateName).toBe('IdlingLevel1');

    await stateManager.update(100);
    expect(stateManager.timeUntilNextTick).toBe(900);
  });
});
