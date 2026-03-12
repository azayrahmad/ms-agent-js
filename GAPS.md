# Microsoft Agent vs. MSAgentJS: Implementation Gaps

This document provides a comprehensive analysis of the gaps between the original Microsoft Agent (ActiveX/COM) implementation and the `ms-agent-js` library. It is intended for contributors and developers aiming for full parity with the legacy technology.

## 1. High-Level Feature Gaps

The following core components of the Microsoft Agent ecosystem are currently missing from `ms-agent-js`:

### Input & Interaction
- **Speech Recognition:** The original Agent supported "Listen" mode and voice commands via SAPI. `ms-agent-js` currently has no speech-to-text integration.
- **Commands Window:** A dedicated UI for selecting voice/manual commands.
- **Context Menus:** Right-clicking an agent should trigger a customizable pop-up menu.
- **Keyboard Interactivity:** Tab focus and keyboard-driven interaction are not implemented.

### Output & Speech
- **Advanced TTS Control:** The original supported tags like `\Chr="monotone"`, `\Emp\`, `\Pau=500\`, and `\Spd=100\`. `ms-agent-js` uses the basic `SpeechSynthesis` API with limited control.
- **Lipa-Sync Accuracy:** While `ms-agent-js` uses `onboundary` for sync, the original had a more sophisticated mouth-shape mapping (visemes) derived directly from the speech engine.

### System & Lifecycle
- **Multi-agent Coordination:** The `Wait` method allowed one agent to wait for another to finish an action. `ms-agent-js` is currently "single-agent centric" in its internal state management.
- **Request Queueing:** The original used a sequential request queue (Chore system). `ms-agent-js` uses an interruption-based promise model which can lead to "race to the bottom" behavior if multiple `play` calls are issued rapidly without awaiting.

---

## 2. In-Depth: Animation & Branching Logic

### Branching Complexity
*   **Current State:** `AnimationManager` supports probabilistic branching (picking a `BranchTo` based on `Probability`).
*   **The Gap:**
    - **Logic Frames (Duration 0):** The original used duration 0 frames for complex state transitions. While `ms-agent-js` fast-forwards through these, it doesn't support "Conditional Branching" (branching based on variables or external state).
    - **Looping Constraints:** Some animations in ACD files are designed to loop indefinitely until a specific "Exit" signal is received. `ms-agent-js` tends to loop or complete based on simple frame sequence end.

### Interruption Model (The "Exit" Sequence)
*   **Current State:** When interrupted, `ms-agent-js` sets `isExiting = true` and jumps to the next frame's `exitBranch`.
*   **The Gap:**
    - **Exit Branch Chains:** In the original, `ExitBranch` could point to a sequence that *itself* has branching.
    - **Return to Neutral:** parity requires ensuring that *every* interruption follows the path back to "Frame 0" (the neutral pose) before starting the next animation, to prevent visual "snapping."

---

## 3. In-Depth: State Management

### Idle Progression
*   **Current State:** 3 levels of boredom (`IdlingLevel1` through `IdlingLevel3`).
*   **The Gap:**
    - **State Weights:** States in MS Agent have weights and "Boredom" thresholds that are more granular than the current 12-tick progression.
    - **User-Defined States:** The library supports `DefineState` from ACD, but lacks the logic to trigger them automatically based on environmental factors (e.g., "Hearing" state when the mic is active, or "Searching" when a long task is running).

### Request Priorities
*   **Gap:** The original Agent had "High", "Normal", and "Low" priority requests. For example, a "Show" request would interrupt a "Move" request, but a "Move" wouldn't necessarily interrupt a "Speak" unless specified. `ms-agent-js` treats all API calls as high-priority interruptions.

#### Implementing a Parity-Compliant Queue
To achieve full parity, the library needs to move from an "Interruption-by-default" model to a "Queued" model:
1.  **Chore Management:** Implement a `RequestQueue` that stores pending actions (animations, speech, movements).
2.  **Sequential Execution:** API calls should return a `RequestID` and a promise that resolves only when the action has finished playing, after waiting its turn in the queue.
3.  **Idle Suppression:** The `StateManager`'s idle loop must only activate when the `RequestQueue` is empty and no action is currently in progress.
4.  **Explicit Stop:** A `.stop(RequestID?)` method is needed to clear the queue or cancel specific pending actions.

### Background vs. Chore States
In Microsoft Agent terminology, a **Chore** (or Request) is any action triggered by a method call that returns a `Request` object. These are processed sequentially. **Background States** are managed automatically by the animation services based on timers or environment events.

| State Category | Standard States | Trigger / Method | Queueing Behavior |
| --- | --- | --- | --- |
| **Chore (Queued)** | `Showing`, `Hiding`, `Speaking`, `Moving`, `Gesturing` | `Show`, `Hide`, `Speak`, `MoveTo`, `GestureAt` | Sequential: Must wait for the previous chore to finish. |
| **Background** | `Idling (Level 1-3)` | Idle Timeout (No user activity) | Automatic: Played only when the queue is empty. |
| **Reactive** | `Hearing`, `Listening` | Speech Input / Hotkey | Immediate: Interrupts background states; overlays or interrupts chores depending on character flags. |

- **The Interruption Rule:** Any new Chore entering the queue immediately signals a **Background State** (like Idling) to interrupt. For example, if an agent is at Frame 1 of a 50-frame Idle animation, the arrival of a `Speak` request triggers the Idle's `ExitBranch` instantly to return the agent to a neutral pose before speech begins.

---

## 4. Rendering & Visuals

### Dynamic Positioning
- **Move-Animations:** The original character definition often includes "MovingUp", "MovingLeft", etc. The `MoveTo` method should automatically play these animations while the agent container is interpolating across the screen.
- **Mirroring:** The `Agent` control supported a `Connected` property and the ability to "Mirror" (flip horizontally) the character. `ms-agent-js` only supports the default orientation.

### Transparency & Palettes
- **Palette Shifting:** Some .acs files utilized palette cycling for effects (like glowing eyes). `ms-agent-js` renders to a static canvas and does not support runtime palette manipulation.
- **Frame Trimming:** The optimization script handles trimming, but the engine lacks a robust "Center of Gravity" calculation, which can cause jitter if frames are not perfectly aligned in the original BMPs.

---

## 5. Summary Table

| Feature | Original MS Agent | MSAgentJS | Parity Status |
| --- | --- | --- | --- |
| **Animation Branching** | Probabilistic + Conditional | Probabilistic Only | 🟡 Partial |
| **Exit Branches** | Multi-step sequences | Single-jump | 🟡 Partial |
| **Speech (TTS)** | SAPI (High control) | Web Speech API | 🟡 Partial |
| **Speech (Recognize)** | Supported | Not Implemented | 🔴 Missing |
| **Commands Window** | System UI | Not Implemented | 🔴 Missing |
| **Multi-agent Wait** | Supported | Not Implemented | 🔴 Missing |
| **Mirroring/Flipping** | Supported | Not Implemented | 🔴 Missing |
| **Move-Animations** | Automatic | Manual `play` only | 🔴 Missing |
| **Balloon Tip** | Procedural Sliding | Procedural Sliding | 🟢 Complete |
| **BMP Transparency** | Indexed Palette | Manual Alpha Injection | 🟢 Complete |

## 6. Priority Gaps for Contributors

1.  **Request Queue:** Implement a formal `Request` queue to handle sequential actions without manual `await`.
2.  **Move-Animations:** Integration of movement logic with the "Moving" state animations.
3.  **Advanced TTS:** Parsing SAPI-style tags in the `speak()` text and translating them to `SpeechSynthesis` parameters (or pausing).
4.  **Mirroring:** Add a `flipped` property to the `Agent` and update `SpriteManager` to handle horizontal scaling/flipping.
