import { createMachine } from 'xstate';

export const agentMachine = createMachine({
  id: 'agent',
  initial: 'hidden',
  context: ({ input }) => ({
    idleLevel: 1,
    maxIdleLevel: input.maxIdleLevel || 3,
    idleIntervalMs: input.idleIntervalMs || 5000,
    ticksPerLevel: input.ticksPerLevel || 3,
  }),
  states: {
    hidden: {
      on: {
        SHOW: { target: 'showing' }
      }
    },
    showing: {
      invoke: {
        src: 'playShowingAnimation',
        onDone: { target: 'idling' }
      }
    },
    idling: {
      initial: 'checkLevel',
      states: {
        checkLevel: {
          always: [
            { target: 'level3', guard: ({ context }) => context.idleLevel >= 3 },
            { target: 'level2', guard: ({ context }) => context.idleLevel === 2 },
            { target: 'level1' }
          ]
        },
        level1: {
          after: {
            IDLE_TICK: { actions: 'playRandomIdle', target: 'level1', reenter: false },
            LEVEL_UP_TIME: { target: 'level2', actions: 'incrementLevel' }
          }
        },
        level2: {
          after: {
            IDLE_TICK: { actions: 'playRandomIdle', target: 'level2', reenter: false },
            LEVEL_UP_TIME: { target: 'level3', actions: 'incrementLevel' }
          }
        },
        level3: {
          after: {
            IDLE_TICK: { actions: 'playRandomIdle', target: 'level3', reenter: true }
          }
        }
      },
      on: {
        PLAY: { target: 'busy.playing' },
        MOVE: { target: 'busy.moving' },
        SPEAK: { target: 'busy.speaking' },
        HIDE: { target: 'hiding' }
      }
    },
    busy: {
      states: {
        playing: {
          invoke: {
            src: 'playAnimation',
            onDone: { target: '#agent.idling' }
          }
        },
        moving: {
          invoke: {
            src: 'moveAgent',
            onDone: { target: '#agent.idling' }
          }
        },
        speaking: {
          invoke: {
            src: 'speakAnimation',
            onDone: { target: '#agent.idling' }
          }
        }
      },
      on: {
        // Allow interrupting current busy task with a new one
        PLAY: { target: '.playing' },
        MOVE: { target: '.moving' },
        SPEAK: { target: '.speaking' },
        HIDE: { target: 'hiding' }
      }
    },
    hiding: {
      invoke: {
        src: 'playHidingAnimation',
        onDone: { target: 'hidden' }
      }
    }
  }
}, {
  delays: {
    IDLE_TICK: ({ context }) => context.idleIntervalMs,
    LEVEL_UP_TIME: ({ context }) => context.idleIntervalMs * context.ticksPerLevel,
  }
});
