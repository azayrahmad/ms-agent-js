import { setup, assign } from 'xstate';

export interface AgentContext {
  idleLevel: number;
  idleTickCount: number;
  ticksPerLevel: number;
  idleIntervalMs: number;
  maxIdleLevel: number;
  elapsedSinceLastTick: number;
  animationName: string;
  stateName: string;
}

export type AgentEvent =
  | { type: 'SHOW'; animation?: string }
  | { type: 'HIDE'; animation?: string }
  | { type: 'PLAY'; animation: string; state?: string }
  | { type: 'SET_STATE'; state: string }
  | { type: 'ANIMATION_END' }
  | { type: 'INTERRUPT' }
  | { type: 'TICK'; deltaTime: number };

export const agentMachine = setup({
  types: {
    context: {} as AgentContext,
    events: {} as AgentEvent,
    input: {} as Partial<AgentContext>,
  },
  actions: {
    resetIdle: assign({
      idleLevel: 1,
      idleTickCount: 0,
      elapsedSinceLastTick: 0,
    }),
    incrementTick: assign({
      idleTickCount: ({ context }) => context.idleTickCount + 1,
      elapsedSinceLastTick: 0,
    }),
    incrementIdleLevel: assign({
      idleLevel: ({ context }) => Math.min(context.idleLevel + 1, context.maxIdleLevel),
      idleTickCount: 0,
      elapsedSinceLastTick: 0,
    }),
    updateTimer: assign({
      elapsedSinceLastTick: ({ context, event }) => {
        if (event.type === 'TICK') {
           return context.elapsedSinceLastTick + event.deltaTime;
        }
        return context.elapsedSinceLastTick;
      }
    }),
    updateStateName: assign({
      stateName: ({ context }) => `IdlingLevel${context.idleLevel}`
    })
  },
  guards: {
    isTimeForTick: ({ context }) => context.elapsedSinceLastTick >= context.idleIntervalMs,
    shouldProgressLevel: ({ context }) =>
      context.idleTickCount >= context.ticksPerLevel &&
      context.idleLevel < context.maxIdleLevel,
  }
}).createMachine({
  id: 'agent',
  context: ({ input }) => ({
    idleLevel: 1,
    idleTickCount: 0,
    ticksPerLevel: input?.ticksPerLevel ?? 3,
    idleIntervalMs: input?.idleIntervalMs ?? 5000,
    maxIdleLevel: input?.maxIdleLevel ?? 3,
    elapsedSinceLastTick: 0,
    animationName: '',
    stateName: input?.stateName ?? 'Hidden',
  }),
  initial: 'hidden',
  on: {
    SET_STATE: [
        {
          guard: ({ event }) => event.state === 'Hidden',
          target: '.hidden',
          actions: assign({ stateName: 'Hidden' })
        },
        {
          guard: ({ event }) => event.state.startsWith('IdlingLevel'),
          target: '.idling',
          actions: [
            'resetIdle',
            assign({
              idleLevel: ({ event }) => parseInt(event.state.replace('IdlingLevel', '')) || 1,
              stateName: ({ event }) => event.state
            })
          ]
        },
        {
          target: '.busy',
          actions: assign({
            stateName: ({ event }) => event.state,
            animationName: '',
            idleLevel: 1,
            idleTickCount: 0,
            elapsedSinceLastTick: 0
          })
        }
    ],
    INTERRUPT: {
      actions: 'resetIdle'
    }
  },
  states: {
    hidden: {
      entry: assign({ stateName: 'Hidden' }),
      on: {
        SHOW: {
          target: 'showing',
          actions: assign({
            animationName: ({ event }) => event.animation || 'Showing',
          }),
        },
      },
    },
    showing: {
      entry: assign({ stateName: 'Showing' }),
      on: {
        ANIMATION_END: 'idling',
        HIDE: 'hiding',
        PLAY: 'busy',
        TICK: {
            actions: 'updateTimer'
        }
      },
    },
    idling: {
      entry: [
        'updateStateName'
      ],
      initial: 'active',
      states: {
        active: {
            on: {
                TICK: {
                    actions: ['updateTimer'],
                    target: 'evaluating'
                }
            }
        },
        evaluating: {
            always: [
                { guard: 'isTimeForTick', target: 'ticking' },
                { target: 'active' }
            ]
        },
        ticking: {
          entry: 'incrementTick',
          always: [
            { guard: 'shouldProgressLevel', target: 'progressing' },
            { target: 'triggerAnimation' }
          ],
        },
        progressing: {
            entry: ['incrementIdleLevel', 'updateStateName'],
            always: 'active'
        },
        triggerAnimation: {
          always: 'active'
        }
      },
      on: {
        HIDE: 'hiding',
        PLAY: [
            { guard: ({ event }) => !!event.state, target: 'busy' },
            { actions: assign({ animationName: ({ event }) => event.animation }) }
        ]
      },
    },
    busy: {
      entry: assign({
        stateName: ({ event, context }) => {
            if (event.type === 'PLAY') return event.state || 'Playing';
            if (event.type === 'SET_STATE') return event.state;
            return context.stateName;
        },
        animationName: ({ event, context }) => (event.type === 'PLAY' ? event.animation : context.animationName),
      }),
      on: {
        ANIMATION_END: 'idling',
        HIDE: 'hiding',
        PLAY: 'busy',
        TICK: {
            actions: 'updateTimer'
        }
      },
    },
    hiding: {
      entry: assign({
        stateName: 'Hiding',
        animationName: ({ event }) => (event.type === 'HIDE' ? event.animation || 'Hiding' : 'Hiding'),
      }),
      on: {
        ANIMATION_END: 'hidden',
        SHOW: 'showing',
        TICK: {
            actions: 'updateTimer'
        }
      },
    },
  },
});
