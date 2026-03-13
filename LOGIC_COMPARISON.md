# ms-agent-js vs TripleAgent: Logic & Behavior Comparison

This document compares the internal behavioral logic of `ms-agent-js` and [TripleAgent](https://github.com/calavera42/TripleAgent) (C++ implementation), with a focus on their parity with the original Microsoft Agent (ActiveX) specification.

## 1. Request Handling & Queuing

### ms-agent-js (Current Implementation)
- **Architecture**: Sequential `RequestQueue` with Promise-based orchestration.
- **Behavior**: API calls like `play`, `moveTo`, and `gestureAt` return a `AgentRequest` and are processed one after another.
- **Interruption**: High-priority user actions (like calling `agent.stop()` or `agent.interrupt()`) signal the `AnimationManager` to enter an `isExiting` state. This causes the current animation to jump to its `exitBranch` to return to a neutral pose before the next request in the queue begins.
- **Parity**: Highly compliant. The use of a formal queue ensures that "Chores" (requested actions) don't overlap, matching the original Agent's serial execution model.

### TripleAgent
- **Architecture**: Chore-based state machine using a `std::queue<Chore>`.
- **Behavior**: Processes chores sequentially. It uses a state machine (`Running`, `Stopping`, `Waiting`) to manage the transition between animations.
- **Stack-based logic**: TripleAgent's design includes a stack for running requests, which theoretically allows for more complex "nested" interruptions than a flat queue.

## 2. Animation System & Branching

### Logic Frames (Duration 0)
- **Original Agent Standard**: Frames with duration 0 are "logic frames" used for branching or triggering sounds. They must be processed instantly without being displayed.
- **TripleAgent**: Explicitly fast-forwards through duration 0 frames.
- **ms-agent-js**: Implements an instant `while` loop in the `AnimationManager.update` tick. It can process up to 100 sequential logic frames in a single 16ms tick, ensuring the agent jumps to the correct branch without visual "hiccups."

### Exit Branching & Interruption
- **Original Agent Standard**: When an animation is interrupted, it shouldn't just "snap" to the next one. It should follow an "exit path" (a series of frames) that leads back to the neutral position (Frame 0).
- **TripleAgent**: Supports complex exit paths and uses special indices (like `-1` or `-2`) to signify specific completion behaviors.
- **ms-agent-js**: Uses the `exitBranch` property defined in the character data. When `isExiting` is active, it prioritizes these branches. It also intelligently follows "forward" probabilistic branches that lead toward the end of the sequence to ensure a smooth return to neutral.

### Frame Buffering
- **Behavior**: If an animation ends or is between frames, the agent should not disappear or flicker.
- **TripleAgent**: Maintains a `_lastValidFrame` and ensures logic frames are never rendered.
- **ms-agent-js**: Uses a `lastRenderedFrame` buffer. If the current frame is a logic frame (duration 0), it continues to display the last valid visual frame, maintaining visual continuity during complex branching.

## 3. State Management & Idles

### Idle Progression (Boredom)
- **Original Agent Standard**: Agents have multiple levels of idle behavior. The longer they are ignored, the more "bored" (active/distracted) their animations become.
- **TripleAgent**: Aims for a "frame-level FSM" where state transitions can be triggered by any frame change.
- **ms-agent-js**: Uses a `StateManager` with 3 distinct "Boredom" levels. It tracks "idle ticks" and automatically progresses from `IdlingLevel1` through `IdlingLevel3`.
- **Interruption Priority**: In `ms-agent-js`, background idle states are immediately interrupted by any new incoming request in the queue, ensuring the agent feels responsive to user input.

## 4. Comparison Summary

| Feature | ms-agent-js | TripleAgent | Original Agent Parity |
|---------|-------------|-------------|-----------------------|
| **Queuing** | Promise-based Queue | std::queue / Stack | 🟢 High |
| **Logic Frames** | Instant (Tick-loop) | Instant (Fast-forward) | 🟢 High |
| **Branching** | Probabilistic | Probabilistic | 🟢 High |
| **Exit Paths** | Exit Branches | Exit Indices / Special | 🟡 Medium/High |
| **Idles** | 3-Level Progression | Frame-FSM (Planned) | 🟢 High |

## 5. Summary of Recent Improvements in ms-agent-js

Since the initial architectural design, `ms-agent-js` has been updated to close the gap with TripleAgent and the original specification:
1.  **RequestQueue**: Transitioned from a simple interruption model to a formal sequential queue, allowing for stable `await` patterns and predictable behavior.
2.  **Instant Update Loop**: Refined the `AnimationManager` to process multiple frames per tick if their duration is 0, eliminating the "laggy" branching seen in earlier web-based implementations.
3.  **Visual Stability**: Enhanced the frame buffering logic to prevent the agent from disappearing during logic-heavy animation sequences.
