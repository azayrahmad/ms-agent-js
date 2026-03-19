import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../src/core/behavior/StateManager';
import { StateType } from '../src/core/base/types';

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockAnimationManager: any;
  let mockStates: any;
  let mockEventEmitter: any;

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
        'think': {},
        'wave': {}
      }
    };

    mockStates = {
      'IdlingLevel1': { name: 'IdlingLevel1', animations: ['idle1'] },
      'IdlingLevel2': { name: 'IdlingLevel2', animations: ['idle2'] },
      'Showing': { name: 'Showing', animations: ['show'] },
      'Hiding': { name: 'Hiding', animations: ['hide'] }
    };

    mockEventEmitter = {
      emit: vi.fn()
    };

    stateManager = new StateManager(mockStates, mockAnimationManager as any, mockEventEmitter, {
      idleIntervalMs: 1000,
      ticksPerLevel: 3
    });
  });

  it('should initialize states with proper types', () => {
    expect((stateManager as any).states['IdlingLevel1'].type).toBe(StateType.Idle);
    expect((stateManager as any).states['Showing'].type).toBe(StateType.Persistent); // Default for non-prefixed
  });

  it('should allow registering custom states', () => {
    stateManager.registerState({
      name: 'Processing',
      animations: ['think'],
      type: StateType.Persistent
    });
    expect((stateManager as any).states['Processing'].type).toBe(StateType.Persistent);
  });

  it('should emit stateEnter and stateExit events', async () => {
    await stateManager.setState('IdlingLevel1');
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('stateEnter', { state: 'IdlingLevel1', type: StateType.Idle });

    await stateManager.setState('Showing');
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('stateExit', { state: 'IdlingLevel1', type: StateType.Idle });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('stateEnter', { state: 'Showing', type: StateType.Persistent });
  });

  it('should handle Transient states and transition to nextState', async () => {
    stateManager.registerState({
      name: 'Greeting',
      animations: ['wave'],
      type: StateType.Transient,
      nextState: 'IdlingLevel1'
    });

    await stateManager.setState('Greeting');
    expect(stateManager.currentStateName).toBe('Greeting');

    // Simulate animation finished
    mockAnimationManager.isAnimating = false;
    await stateManager.update(100);

    expect(stateManager.currentStateName).toBe('IdlingLevel1');
  });

  it('should progress idle levels correctly', async () => {
    await stateManager.setState('IdlingLevel1');

    // 3 ticks to next level
    await stateManager.update(1000); // tick 1
    await stateManager.update(1000); // tick 2
    await stateManager.update(1000); // tick 3 -> level 2

    expect(stateManager.idleLevel).toBe(2);
    expect(stateManager.currentStateName).toBe('IdlingLevel2');
  });

  it('should not progress idle levels if in Persistent state', async () => {
    stateManager.registerState({
      name: 'Processing',
      animations: ['think'],
      type: StateType.Persistent
    });

    await stateManager.setState('Processing');

    await stateManager.update(1000);
    await stateManager.update(1000);
    await stateManager.update(1000);

    expect(stateManager.idleLevel).toBe(1);
    expect(stateManager.currentStateName).toBe('Processing');
  });

  it('should return correct debug info', () => {
    expect(stateManager.timeUntilNextTick).toBe(1000);
    expect(stateManager.ticksToNextLevel).toBe(3);
  });
});
