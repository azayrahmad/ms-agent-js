# Comparison of MSAgent Libraries

This document compares **MSAgentJS** with other major reimplementations: **TripleAgent** (C++) and **clippy.js** (jQuery), specifically focusing on animation handling.

## TransitionType Handling

### MSAgentJS
- **Implemented:** Full support for Type 0 (Return) and Type 1 (Exit Branching).
- **Behavior:**
  - **Type 1:** Reaching a 0-duration frame with an `exitBranch` causes the animation to pause and wait for an interruption, maintaining visual state.
  - **Type 0/2:** Inferred Return animations are automatically played when a new request is received.
- **References:** `src/core/behavior/AnimationManager.ts`

### TripleAgent
- **Implemented:** Partially (Parsing only).
- **Behavior:** The `Animation::Update` loop treats all animations with standard sequential/branching logic, regardless of the `TransitionType` parsed from binary files.
- **References:** `Core/src/request/animation.cpp`

### clippy.js
- **Implemented:** Support for `useExitBranching` (corresponds to Type 1).
- **Behavior:** If `useExitBranching` is set, it pauses on the last frame and notifies the agent. The agent then waits for a position move or stop command before calling `exitAnimation()`.
- **References:** `src/animator.js`, `src/agent.js`

## 0-Duration (Null) Frame Handling

### MSAgentJS
- **Logic:** Uses an optimized `while` loop to fast-forward through consecutive null frames in a single tick.
- **Rendering:** Strictly hides frames with 0 duration and no visual content (images/mouths), adhering to the MS spec.
- **Safety:** Includes a `MAX_NULL_FRAMES` safety break.

### TripleAgent
- **Logic:** Relies on the main thread loop to process 0-duration frames.
- **Rendering:** Skips window updates for frames with duration 0, keeping the previous frame visible.

### clippy.js
- **Logic:** Uses `setTimeout` with `frame.duration`. A duration of 0 triggers a nearly-immediate timeout (minimum delay determined by the browser).
- **Rendering:** Always attempts to draw the frame's images. If no images exist, it effectively shows nothing or maintains the previous state depending on DOM CSS.

## Return Animation Property

### MSAgentJS
- **Support:** Inferred and Auto-played.
- **Mechanism:** Infers names via "Return" suffix (e.g., `ReadReturn`) for `.acd` files. Automatically chains these when transitioning between actions.

### TripleAgent
- **Support:** Parsed only.
- **Mechanism:** Read from binary `.acs` headers. No automation found in the core logic.

### clippy.js
- **Support:** Not implemented.
- **Mechanism:** Relies entirely on manual control or `Idle` animation cycling.

## Official MS Agent Documentation Intent

According to [Microsoft Agent Documentation](https://learn.microsoft.com/en-us/windows/win32/lwef/creating-animations):

### Null Frames (0-duration)
- **Rendering:** Frames with no image and zero duration **must not be displayed**.
- **Logic:** They are intended for "branching without first displaying a particular image."
- **Terminal Exit:** A zero-duration frame can be placed at the end of an animation to provide a "final exit point" for exit branching.

### Return Animations
- **Purpose:** To return the character to a neutral position after an animation.
- **Trigger:** When the engine gets a request to play a *new* animation, it automatically attempts to play the **Return animation** of the *current* animation first.

## Summary of Findings

| Feature | MSAgentJS | TripleAgent | clippy.js | MS Agent Spec |
| --- | --- | --- | --- | --- |
| `TransitionType 0` | Full Support | Parsed only | No | Use Return Animation |
| `TransitionType 1` | Full Support | Parsed only | Yes | Use Exit Branching |
| `TransitionType 2` | Full Support | Parsed only | No | No Transition |
| Null Frame Logic | Optimized `while` | Thread Loop | `setTimeout(0)` | Logic only, no display |
| Null Frame Display | Hidden (Correct) | Hidden (Correct) | Varies | Not displayed |
| `ReturnAnimation` | Inferred & Auto | Parsed only | No | Auto-play on next |
| Branching Logic | Robust | Basic | Basic | Path to neutral frame |
