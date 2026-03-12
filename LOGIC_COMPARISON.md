# ms-agent-js vs TripleAgent: Logic Comparison

This document compares the architectural and logical implementations of `ms-agent-js` (this library) and [TripleAgent](https://github.com/calavera42/TripleAgent) (C++ implementation).

## 1. Request Handling & Concurrency

### ms-agent-js
- **Architecture**: Promise-based with explicit interruption.
- **Concurrency**: High-priority requests (user actions like `play`, `speak`) signal the current animation to interrupt by setting an `isExiting` flag. The system waits for the current animation to finish its `exitBranch` before starting the next one.
- **Queueing**: Does not maintain a formal sequential queue of requests for the user; instead, it relies on `async/await` and interruption logic.

### TripleAgent (Intended Design)
- **Architecture**: Sequential Request Queue (`std::queue<Chore>`).
- **Concurrency**: Implements a "Chore" system where requests are processed one after another. It uses a state machine (`Running`, `Stopping`, `Waiting`) to manage transitions between chores.
- **Stack-based logic**: Uses a stack of running requests to handle nested or interrupted logic.

## 2. Animation System

### Null Frames (Duration 0)
- **TripleAgent**: Explicitly fast-forwards through frames with a duration of zero. These are treated as "logic frames" that can trigger branching or state changes without being rendered.
- **ms-agent-js**: Currently handles frame durations in the `update` tick. If a frame has duration 0, it might still take at least one tick (16ms @ 60fps) unless explicitly fast-forwarded in a loop.

### Exit Branches
- **TripleAgent**: Uses an `ExitFrameIndex` to jump to a specific frame when an animation is interrupted or completing. It supports special values like `-1` (next frame) and `-2` (completion).
- **ms-agent-js**: Uses an `exitBranch` property on frames. When `isExiting` is true, the `AnimationManager` jumps to the frame index specified in `exitBranch`.

### Speaking Frames
- **TripleAgent**: Recognizes a quirk where the "speaking" frame (mouth movement) is often the last frame. It handles "jumps" to null frames to terminate animations correctly while maintaining the speaking state.
- **ms-agent-js**: Synchronizes balloon typing with `SpeechSynthesis`. Animation mouth movement is handled by specific "Speaking" states or animations, but the logic is less "frame-FSM" centric than TripleAgent's theory.

### Frame Buffering (Visibility)
- **TripleAgent**: Maintains a `_lastValidFrame` property. If an update results in no active frame (e.g., between chores or at animation end), it continues to render the `_lastValidFrame` to prevent visual flickering or the agent disappearing. It also ensures logic frames (duration 0) are never displayed.
- **ms-agent-js**: Implements a `lastRenderedFrame` buffer in `AnimationManager`. This ensures that even when an animation concludes, the agent remains visible at its final frame until the next animation begins. The `currentFrame` getter explicitly skips frames with duration 0.

## 3. State Management & Idles

### ms-agent-js
- **Idle Progression**: Manages 3 levels of idles (`IdlingLevel1` through `IdlingLevel3`).
- **Transitions**: Distinguishes between **Transient** (one-shot) and **Persistent** (looping) states.
    - `Showing`/`Hiding`/`Playing` are transient; they play once and automatically transition (e.g., `Showing` -> `Idling`).
    - API calls like `agent.show()` and `agent.hide()` are **Promise-based** and await the full completion of these transient animations, ensuring entry/exit sequences are seen in full.
    - `Idling`/`Gesturing`/`Looking` are persistent; they immediately refresh their animation upon completion to avoid visual gaps.

### TripleAgent
- **FSM Theory**: Aims for a "frame-level FSM" where every frame change can trigger a state transition, moving away from tying the animation system too closely to the request system.

## 4. Platform & Rendering

| Feature | ms-agent-js | TripleAgent |
|---------|-------------|-------------|
| **Language** | TypeScript / JavaScript | C++ / C |
| **Rendering** | HTML5 Canvas | GDI+ / Platform-specific windows |
| **Asset Format** | BMP/PNG Sprite Sheets + JSON/ACD | .ACS (Binary Agent Character Specification) |
| **Audio** | Web Audio API / .wav / .mp3 | .wav (Windows API) |
| **Speech** | SpeechSynthesis API (TTS) | Planned TTS integration |

## 5. Summary of Alignment Goals

To align `ms-agent-js` closer to the intended design and quality of TripleAgent, the following logic updates are planned:
1. **Instant Null-Frame Processing**: Modify `AnimationManager.update` to loop through frames with duration 0 instantly within a single tick.
2. **Priority-based Queuing**: While staying Promise-based, ensure that "interruption" strictly follows the "exit branch to neutral" pattern before starting new high-priority chores.
