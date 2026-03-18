import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { agentMachine } from '../src/core/behavior/AgentMachine';

describe('AgentMachine', () => {
  it('should start in hidden state', () => {
    const actor = createActor(agentMachine).start();
    expect(actor.getSnapshot().value).toBe('hidden');
    expect(actor.getSnapshot().context.stateName).toBe('Hidden');
  });

  it('should transition to showing on SHOW event', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    expect(actor.getSnapshot().value).toBe('showing');
    expect(actor.getSnapshot().context.stateName).toBe('Showing');
  });

  it('should transition to idling after ANIMATION_END in showing', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });
    expect(actor.getSnapshot().matches('idling')).toBe(true);
    expect(actor.getSnapshot().context.stateName).toBe('IdlingLevel1');
  });

  it('should transition to busy on PLAY event', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });
    actor.send({ type: 'PLAY', animation: 'Wave', state: 'Playing' });
    expect(actor.getSnapshot().matches('busy')).toBe(true);
    expect(actor.getSnapshot().context.stateName).toBe('Playing');
  });

  it('should return to idling after ANIMATION_END in busy', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });
    actor.send({ type: 'PLAY', animation: 'Wave', state: 'Playing' });
    actor.send({ type: 'ANIMATION_END' });
    expect(actor.getSnapshot().matches('idling')).toBe(true);
  });

  it('should progress idle level after TICK events', () => {
    const actor = createActor(agentMachine, {
        input: {
            idleLevel: 1,
            idleTickCount: 0,
            ticksPerLevel: 2,
            idleIntervalMs: 1000,
            maxIdleLevel: 3,
            elapsedSinceLastTick: 0,
            animationName: '',
            stateName: 'IdlingLevel1',
            isPersistent: false
        }
    }).start();

    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });

    expect(actor.getSnapshot().context.idleLevel).toBe(1);

    // Send TICK with 1000ms
    actor.send({ type: 'TICK', deltaTime: 1000 });
    expect(actor.getSnapshot().context.idleTickCount).toBe(1);
    expect(actor.getSnapshot().context.idleLevel).toBe(1);

    // Send another TICK with 1000ms -> should progress to level 2
    actor.send({ type: 'TICK', deltaTime: 1000 });
    expect(actor.getSnapshot().context.idleLevel).toBe(2);
    expect(actor.getSnapshot().context.idleTickCount).toBe(0);
    expect(actor.getSnapshot().context.stateName).toBe('IdlingLevel2');
  });

  it('should stay in custom busy state when isPersistent is true', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });

    // Explicitly set a custom state (persistent)
    actor.send({ type: 'SET_STATE', state: 'GesturingLeft' });
    expect(actor.getSnapshot().matches('busy')).toBe(true);
    expect(actor.getSnapshot().context.stateName).toBe('GesturingLeft');
    expect(actor.getSnapshot().context.isPersistent).toBe(true);

    // End animation -> should re-enter busy.active via retriggering
    actor.send({ type: 'ANIMATION_END' });
    expect(actor.getSnapshot().matches('busy')).toBe(true);
    expect(actor.getSnapshot().context.stateName).toBe('GesturingLeft');
  });

  it('should return to idling from busy when isPersistent is false (via PLAY)', () => {
    const actor = createActor(agentMachine).start();
    actor.send({ type: 'SHOW' });
    actor.send({ type: 'ANIMATION_END' });

    // Play an animation (one-off)
    actor.send({ type: 'PLAY', animation: 'Wave', state: 'Playing' });
    expect(actor.getSnapshot().matches('busy')).toBe(true);
    expect(actor.getSnapshot().context.isPersistent).toBe(false);

    // End animation -> should return to idling
    actor.send({ type: 'ANIMATION_END' });
    expect(actor.getSnapshot().matches('idling')).toBe(true);
  });
});
