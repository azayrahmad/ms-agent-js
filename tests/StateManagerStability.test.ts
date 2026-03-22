import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../src/core/behavior/StateManager';

describe('StateManager Stability', () => {
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
        'A': {},
        'B': {},
        'show': {},
        'hide': {}
      }
    };

    mockStates = {
      'IdlingLevel1': { name: 'IdlingLevel1', animations: ['idle1'] },
      'StateA': { name: 'StateA', animations: ['A'] },
      'StateB': { name: 'StateB', animations: ['B'] },
      'Showing': { name: 'Showing', animations: ['show'] },
      'Hiding': { name: 'Hiding', animations: ['hide'] }
    };

    stateManager = new StateManager(mockStates, mockAnimationManager as any, {
      idleIntervalMs: 1000,
      ticksPerLevel: 3
    });
  });

  it('should handle rapid visibility toggles', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(stateManager.handleVisibilityChange(i % 2 === 0));
    }

    await Promise.all(promises);

    // Final state should be based on the last call (i=9 is false -> Hidden)
    expect(stateManager.currentStateName).toBe('Hidden');
  });

  it('should handle rapid state changes during animations', async () => {
    await stateManager.handleVisibilityChange(true); // Unpause

    const promises = [];
    promises.push(stateManager.setState('StateA'));
    promises.push(stateManager.setState('StateB'));
    promises.push(stateManager.setState('IdlingLevel1'));

    await Promise.all(promises);
    expect(stateManager.currentStateName).toBe('IdlingLevel1');
  });

  it('should not break if animations are interrupted by state changes', async () => {
    await stateManager.handleVisibilityChange(true);

    // Start an animation
    const animPromise = stateManager.playAnimation('A', 'StateA');

    // Immediately change state
    await stateManager.setState('StateB');

    await animPromise;
    expect(stateManager.currentStateName).toBe('StateB');
  });
});
