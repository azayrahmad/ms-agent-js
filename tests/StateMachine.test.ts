import { describe, it, expect, vi } from "vitest";
import { Machine } from "../src/core/behavior/StateMachine";

describe("StateMachine", () => {
  it("should initialize with the initial state and context", () => {
    const config = {
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {},
      },
    };
    const machine = new Machine(config);
    expect(machine.state).toBe("idle");
    expect(machine.context).toEqual({ count: 0 });
  });

  it("should transition between states on event", () => {
    const config = {
      initial: "idle",
      context: {},
      states: {
        idle: {
          on: { START: "running" },
        },
        running: {},
      },
    };
    const machine = new Machine(config);
    machine.send({ type: "START" });
    expect(machine.state).toBe("running");
  });

  it("should execute entry and exit actions", () => {
    const exitAction = vi.fn();
    const entryAction = vi.fn();
    const config = {
      initial: "idle",
      context: {},
      states: {
        idle: {
          on: { START: "running" },
          exit: ["onExit"],
        },
        running: {
          entry: ["onEntry"],
        },
      },
    };
    const options = {
      actions: {
        onExit: exitAction,
        onEntry: entryAction,
      },
    };
    const machine = new Machine(config, options);
    machine.send({ type: "START" });
    expect(exitAction).toHaveBeenCalled();
    expect(entryAction).toHaveBeenCalled();
  });

  it("should handle array of transitions with guards", () => {
    const config = {
      initial: "idle",
      context: { authenticated: false },
      states: {
        idle: {
          on: {
            START: [
              { target: "admin", cond: "isAdmin" },
              { target: "user", cond: "isUser" },
              { target: "guest" },
            ],
          },
        },
        admin: {},
        user: {},
        guest: {},
      },
    };
    const options = {
      guards: {
        isAdmin: (ctx: any) => ctx.authenticated && ctx.role === "admin",
        isUser: (ctx: any) => ctx.authenticated,
      },
    };

    const machine1 = new Machine(config, options);
    machine1.send({ type: "START" });
    expect(machine1.state).toBe("guest");

    const machine2 = new Machine(
      { ...config, context: { authenticated: true, role: "user" } },
      options,
    );
    machine2.send({ type: "START" });
    expect(machine2.state).toBe("user");

    const machine3 = new Machine(
      { ...config, context: { authenticated: true, role: "admin" } },
      options,
    );
    machine3.send({ type: "START" });
    expect(machine3.state).toBe("admin");
  });

  it("should execute actions on transitions", () => {
    const action = vi.fn();
    const config = {
      initial: "idle",
      context: {},
      states: {
        idle: {
          on: {
            DO_SOMETHING: { actions: ["myAction"] },
          },
        },
      },
    };
    const options = {
      actions: {
        myAction: action,
      },
    };
    const machine = new Machine(config, options);
    machine.send({ type: "DO_SOMETHING" });
    expect(action).toHaveBeenCalled();
  });

  it("should return false if no transition is found", () => {
    const config = {
      initial: "idle",
      context: {},
      states: {
        idle: {
          on: { KNOWN: "somewhere" },
        },
        somewhere: {},
      },
    };
    const machine = new Machine(config);
    expect(machine.send({ type: "UNKNOWN" })).toBe(false);
  });

  it("should return false if state config is missing", () => {
    const config = {
      initial: "idle",
      context: {},
      states: {} as any,
    };
    const machine = new Machine(config);
    expect(machine.send({ type: "ANY" })).toBe(false);
  });

  it("should handle function guards", () => {
    const config = {
      initial: "idle",
      context: { count: 5 },
      states: {
        idle: {
          on: {
            GO: { target: "next", cond: (ctx: any) => ctx.count > 0 },
          },
        },
        next: {},
      },
    };
    const machine = new Machine(config);
    machine.send({ type: "GO" });
    expect(machine.state).toBe("next");
  });
});
