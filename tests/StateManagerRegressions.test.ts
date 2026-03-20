import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../src/core/behavior/StateManager';

describe('StateManager Regression Tests', () => {
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
        'show': {},
        'gesture': {}
      }
    };

    mockStates = {
      'IdlingLevel1': { name: 'IdlingLevel1', animations: ['idle1'] },
      'Showing': { name: 'Showing', animations: ['show'] },
      'Gesturing': { name: 'Gesturing', animations: ['gesture'] }
    };

    stateManager = new StateManager(mockStates, mockAnimationManager as any, {
      idleIntervalMs: 1000,
      ticksPerLevel: 3
    });
  });

  it('should transition from Showing to IdlingLevel1 after animation ends', async () => {
    // 1. Trigger SHOW
    await stateManager.handleVisibilityChange(true);
    expect(stateManager.currentStateName).toBe('Showing');

    // 2. Simulate animation finish
    mockAnimationManager.isAnimating = true; // Was animating
    await stateManager.update(100);
    mockAnimationManager.isAnimating = false; // Finished
    await stateManager.update(100); // Should send ANIMATION_END

    expect(stateManager.currentStateName).toBe('IdlingLevel1');
  });

  it('should loop non-idle persistent states', async () => {
    await stateManager.handleVisibilityChange(true);
    // Finish show
    mockAnimationManager.isAnimating = true;
    await stateManager.update(100);
    mockAnimationManager.isAnimating = false;
    await stateManager.update(100);

    // Set to Gesturing
    await stateManager.setState('Gesturing');
    expect(stateManager.currentStateName).toBe('Gesturing');
    expect(mockAnimationManager.interruptAndPlayAnimation).toHaveBeenCalledWith('gesture', false, false);
    mockAnimationManager.interruptAndPlayAnimation.mockClear();

    // Finish gesture animation
    mockAnimationManager.isAnimating = true;
    await stateManager.update(100);
    mockAnimationManager.isAnimating = false;
    await stateManager.update(100); // Should send ANIMATION_END and re-trigger gesture

    expect(stateManager.currentStateName).toBe('Gesturing');
    expect(mockAnimationManager.interruptAndPlayAnimation).toHaveBeenCalledWith('gesture', false, false);
  });

  it('should NOT loop idle states immediately', async () => {
    await stateManager.handleVisibilityChange(true);
    // Finish show
    mockAnimationManager.isAnimating = true;
    await stateManager.update(100);
    mockAnimationManager.isAnimating = false;
    await stateManager.update(100);

    expect(stateManager.currentStateName).toBe('IdlingLevel1');
    mockAnimationManager.interruptAndPlayAnimation.mockClear();

    // Simulate idle animation finish
    mockAnimationManager.isAnimating = true;
    await stateManager.update(100);
    mockAnimationManager.isAnimating = false;
    await stateManager.update(100);

    // Should NOT have triggered a new animation yet (wait for tick)
    expect(mockAnimationManager.interruptAndPlayAnimation).not.toHaveBeenCalled();

    // Advance time for tick
    await stateManager.update(1000);
    expect(mockAnimationManager.interruptAndPlayAnimation).toHaveBeenCalledWith('idle1', false, false);
  });
});
