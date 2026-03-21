import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../src/core/behavior/StateManager';
import { AnimationManager } from '../src/core/behavior/AnimationManager';

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

  it('should progress idle tick even if update is called while an animation is starting (but not awaited)', async () => {
    // Show the agent to unpause it
    await stateManager.handleVisibilityChange(true);
    await stateManager.setState('IdlingLevel1');

    // Initial state
    expect(stateManager.timeUntilNextTick).toBe(1000);

    // Call update with 500ms
    await stateManager.update(500);
    expect(stateManager.timeUntilNextTick).toBe(500);

    // Call update with another 500ms
    await stateManager.update(500);
    expect(stateManager.timeUntilNextTick).toBe(1000); // Should have ticked and reset
  });

  it('should not be blocked by slow animation start', async () => {
    // Show the agent to unpause it
    await stateManager.handleVisibilityChange(true);

    // We want to see if multiple calls to update work as expected when animations are playing.
    await stateManager.setState('IdlingLevel1');

    // Mock playAnimation to be a never-resolving promise (simulating being stuck/slow)
    mockAnimationManager.playAnimation = () => new Promise(() => {});
    mockAnimationManager.isAnimating = false; // So it tries to start a new one

    // This update should call updateStateAnimation -> playAnimation (which is slow)
    // If it's awaited, this update will never resolve (or will take too long)
    const updatePromise = stateManager.update(500);

    // We check if it resolves quickly
    const result = await Promise.race([
        updatePromise.then(() => 'resolved'),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 100))
    ]);

    expect(result).toBe('resolved');
    expect(stateManager.timeUntilNextTick).toBe(500);
  });

  it('should start ticking immediately after initialization and setState', async () => {
    // Initial state is Hidden and Paused
    expect(stateManager.currentStateName).toBe('Hidden');

    await stateManager.setState('IdlingLevel1');
    expect(stateManager.currentStateName).toBe('IdlingLevel1');

    // Should not be paused anymore
    await stateManager.update(100);
    expect(stateManager.timeUntilNextTick).toBe(900);
  });

  it('should handle visibility change with custom animation', async () => {
    mockStates['Showing'] = { name: 'Showing', animations: ['CustomShow'] };

    await stateManager.handleVisibilityChange(true, 'CustomShow');

    expect(mockAnimationManager.playAnimation).toHaveBeenCalledWith('CustomShow', true);
    expect(stateManager.currentStateName).toBe('IdlingLevel1');
  });

  it('should handle visibility change to Hidden with custom animation', async () => {
    mockStates['Hiding'] = { name: 'Hiding', animations: ['CustomHide'] };

    await stateManager.handleVisibilityChange(false, 'CustomHide');

    expect(mockAnimationManager.playAnimation).toHaveBeenCalledWith('CustomHide', true);
    expect(stateManager.currentStateName).toBe('Hidden');
  });

  it('should throw error if requested state is missing and not special', async () => {
    await expect(stateManager.setState('NonExistentState')).rejects.toThrow('Invalid state name: NonExistentState');
  });

  it('should return correct idle level info', () => {
    expect(stateManager.idleLevel).toBe(1);
    expect(stateManager.ticksToNextLevel).toBe(3);
  });

  it('should play random animation', async () => {
    mockAnimationManager.animations = {
        'random1': {}
    };

    await stateManager.playRandomAnimation();

    // StateManager.playAnimation calls animationManager.interruptAndPlayAnimation
    expect(mockAnimationManager.interruptAndPlayAnimation).toHaveBeenCalledWith(
        'random1', false, true
    );
  });

  it('should progress boredom levels correctly', async () => {
    // Show the agent to unpause it
    await stateManager.handleVisibilityChange(true);
    await stateManager.setState('IdlingLevel1');

    // ticksPerLevel is 3. We are currently at level 1.
    // 3 ticks at level 1 should move us to level 2.
    for (let i = 0; i < 3; i++) {
        await stateManager.update(1000);
    }

    expect(stateManager.idleLevel).toBe(2);
    expect(stateManager.currentStateName).toBe('IdlingLevel2');

    // 3 more ticks should move us to level 3 (or max level)
    for (let i = 0; i < 3; i++) {
        await stateManager.update(1000);
    }
    expect(stateManager.idleLevel).toBe(3);
  });

  it('should reset boredom when a custom state is set', async () => {
    // Show the agent to unpause it
    await stateManager.handleVisibilityChange(true);
    await stateManager.setState('IdlingLevel1');

    // Progress to level 2
    for (let i = 0; i < 3; i++) {
        await stateManager.update(1000);
    }
    expect(stateManager.idleLevel).toBe(2);

    // Set a custom state
    mockStates['Custom'] = { name: 'Custom', animations: ['idle1'] };
    await stateManager.setState('Custom');

    expect(stateManager.idleLevel).toBe(1);
    expect(stateManager.currentStateName).toBe('Custom');
  });
});
