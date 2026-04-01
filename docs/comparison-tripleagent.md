# Comparison with TripleAgent

This document compares the animation handling of **MSAgentJS** with **TripleAgent** (calavera42/TripleAgent), specifically focusing on `TransitionType` and 0-duration (null) frames.

## TransitionType Handling

### MSAgentJS
- **Implemented:** Yes.
- **Logic:** Specifically handles `TransitionType = 1`.
- **Behavior:**
  - If `TransitionType` is 1 and the animation reaches a 0-duration frame with an `exitBranch`, it pauses on that frame to wait for an interruption/exit signal.
  - While pausing, it continues to display the `lastRenderedFrame`.
  - When an exit is triggered, it follows the `exitBranch` to the neutral state.
- **References:** `src/core/behavior/AnimationManager.ts`

### TripleAgent
- **Implemented:** Partially (Parsing only).
- **Logic:** The `DataProvider` parses the `Transition` property from the `.acs`/`.acd` file into the `AnimationInfo` struct.
- **Behavior:** The `Animation::Update` loop does not explicitly check or use the `TransitionType` value to alter its playback flow. It treats all animations with the same sequential/branching logic.
- **References:** `DataProvider/src/AgentFile.cpp`, `Core/src/request/animation.cpp`

## 0-Duration (Null) Frame Handling

### MSAgentJS
- **Logic:** Uses a `while` loop inside `update()` to instantly fast-forward through consecutive 0-duration frames in a single tick.
- **Rendering:** Skips `draw()` calls for 0-duration frames, maintaining the visual state of the last valid frame.
- **Branching:** Executes branching logic even for 0-duration frames.
- **Safety:** Includes a `MAX_NULL_FRAMES` (100) safety break to prevent infinite loops in malformed animation definitions.

### TripleAgent
- **Logic:** The `Update()` method returns the frame duration. If the duration is 0, it proceeds to the next frame immediately in its internal logic, but relying on the caller's loop to re-invoke `Update` for timing.
- **Rendering:** Explicitly checks `fp->FrameDuration != 0` before notifying the window to change the frame. If duration is 0, it only updates the logical state (`DoFrameProceed`).
- **Branching:** Executes `DoFrameProceed` regardless of duration.

## ReturnAnimation Property

### MSAgentJS
- **Implemented:** No.
- **Status:** Currently ignored. Note that text-based `.acd` files (which this project uses) do not explicitly contain this property. Instead, characters like Genie use a naming convention where companion animations have a "Return" suffix (e.g., `GetAttention` and `GetAttentionReturn`).

### TripleAgent
- **Implemented:** Partially (Parsing only).
- **Logic:** Parses `ReturnAnimation` string from the binary `.acs` animation header (this field is defined in the MS Agent binary spec).
- **Inference:** Does NOT appear to infer return animations from names (e.g., it doesn't automatically look for "NameReturn" if the property is missing).
- **Status:** No explicit automation of the return animation playback was found in the core logic.

## Summary of Findings

| Feature | MSAgentJS | TripleAgent |
| --- | --- | --- |
| `TransitionType 1` | Full Support | Parsed only |
| `TransitionType 2` | Ignored | Parsed only |
| Null Frame Fast-forward | Internal `while` loop | Main loop recursion |
| Null Frame Rendering | Last valid frame | Last valid frame |
| `ReturnAnimation` | Not implemented | Parsed only |
| Exit Branch Logic | Robust | Basic |

## Recommendations for MSAgentJS
1. **Support `ReturnAnimation`**: Implement parsing and automatic playback of the designated return animation when an animation completes, matching the behavior described in MS Agent documentation.
2. **Investigate `TransitionType 2`**: Research if type 2 (often seen in Genie's "return" animations) implies specific behavior such as automatic looping or specific branching priorities.
