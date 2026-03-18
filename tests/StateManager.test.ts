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
      on: vi.fn(),
      emit: vi.fn()
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

  it('should progress idle tick when update is called', async () => {
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
    // Should have ticked and reset
    expect(stateManager.timeUntilNextTick).toBe(1000);
  });

  it('should progress to next idle level after ticksPerLevel', async () => {
    await stateManager.handleVisibilityChange(true);
    await stateManager.setState('IdlingLevel1');
    expect(stateManager.idleLevel).toBe(1);

    // Tick 1
    await stateManager.update(1000);
    expect(stateManager.idleLevel).toBe(1);

    // Tick 2
    await stateManager.update(1000);
    expect(stateManager.idleLevel).toBe(1);

    // Tick 3 -> Progresses level
    await stateManager.update(1000);
    expect(stateManager.idleLevel).toBe(2);
    expect(stateManager.currentStateName).toBe('IdlingLevel2');
  });

  it('should not be blocked by slow animation start', async () => {
    // Show the agent to unpause it
    await stateManager.handleVisibilityChange(true);

    // We want to see if multiple calls to update work as expected when animations are playing.
    await stateManager.setState('IdlingLevel1');

    // Mock playAnimation to be a never-resolving promise (simulating being stuck/slow)
    mockAnimationManager.playAnimation = () => new Promise(() => {});
    mockAnimationManager.isAnimating = false; // So it tries to start a new one

    // This update should send a TICK event and return immediately
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
    // Initial state is Hidden
    expect(stateManager.currentStateName).toBe('Hidden');

    await stateManager.setState('IdlingLevel1');
    expect(stateManager.currentStateName).toBe('IdlingLevel1');

    await stateManager.update(100);
    expect(stateManager.timeUntilNextTick).toBe(900);
  });
});
