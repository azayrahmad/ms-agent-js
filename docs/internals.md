# Internal Architecture

This document provides a technical deep-dive into the internal workings of **MSAgentJS**. It is intended for developers who want to understand the engine's core logic or extend its capabilities.

This project is a clean-room reimplementation based on [official Microsoft Agent documentation](https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent), practical observation from real usage, and references to existing open-source implementations like [ClippyJS](https://github.com/clippyjs/clippy.js) and [TripleAgent](https://github.com/calavera42/TripleAgent). Rather than reverse engineering the original binaries, it reconstructs the system’s behavior with a modern architecture for the web. Therefore, some deviations in design and behavior are expected.

---

## 🏗 System Architecture

The library follows a modular manager-based architecture, split between a headless logic core (`AgentCore`) and a browser-based rendering layer (`AgentRenderer`).

```mermaid
graph TD
    subgraph "Facade"
    A[Agent]
    end

    subgraph "Logic Core (AgentCore)"
    D[AnimationManager]
    F[StateManager]
    H[RequestQueue]
    E[AudioManager]
    B[CharacterParser]
    M[MSADPCMDecoder]
    S[SpriteManager]
    end

    subgraph "UI Layer (AgentRenderer)"
    G[Balloon]
    R[Canvas Renderer]
    end

    A --> AgentCore
    A --> AgentRenderer
    AgentCore --> B
    AgentCore --> D
    AgentCore --> E
    AgentCore --> F
    AgentCore --> H
    AgentCore --> S
    E --> M
```

| Component | Responsibility | Folder |
| --- | --- | --- |
| **`Agent`** | Public API facade. Coordinates `AgentCore` and `AgentRenderer`. | `src/` |
| **`AgentCore`** | Headless engine. Manages state, animations, and sound logic. | `src/core/` |
| **`AgentRenderer`** | UI layer. Manages Shadow DOM, Canvas, and CSS. | `src/ui/` |
| **`EventEmitter`** | Foundation for event-driven decoupled communication. | `src/core/base/` |
| **`CharacterParser`** | Translates assets into `AgentCharacterDefinition`. | `src/core/resources/` |
| **`SpriteManager`** | Handles bitmap loading and rendering logic. | `src/core/resources/` |
| **`AnimationManager`** | Low-level frame-by-frame timing and branching. | `src/core/behavior/` |
| **`StateManager`** | High-level behavioral state transitions. | `src/core/behavior/` |
| **`AudioManager`** | Audio spritesheet and decoding management. | `src/core/resources/` |
| **`MSADPCMDecoder`** | Decodes legacy Microsoft ADPCM WAV files into PCM. | `src/core/resources/` |
| **`Balloon`** | Procedural SVG speech bubble rendering. | `src/ui/` |
| **`RequestQueue`** | Asynchronous character action queuing. | `src/core/behavior/` |

---

## 🔄 Core Logic Flows

### 1. The Rendering Loop
The `Agent` maintains a `requestAnimationFrame` loop that drives the entire system.

1.  **`AnimationManager.update(currentTime)`**:
    - Calculates if the current frame duration has elapsed.
    - Processes "null frames" (duration 0) immediately in a loop.
2.  **`StateManager.update(deltaTime)`**:
    - Monitors the `RequestQueue`. If empty, it progresses "Idle" logic.
    - Increments "boredom" levels to trigger more complex idle animations.
    - Note: `StateManager.update` is asynchronous to allow for non-blocking idle transitions.
3.  **`AgentRenderer.draw()`**:
    - Clears the canvas.
    - Calls `AnimationManager.draw(ctx)`, which delegates to `SpriteManager.drawFrame()`.

### 2. Request Processing & Interruption
MSAgentJS uses a "Chore" system inspired by the original Microsoft Agent.

```mermaid
sequenceDiagram
    participant U as User/API
    participant Q as RequestQueue
    participant S as StateManager
    participant A as AnimationManager

    U->>Q: agent.play('Animation')
    Q->>Q: Add to Queue
    Q->>S: Process Task
    S->>A: playAnimation()
    A->>A: Set isAnimating = true
    Note over A: Loop frames...
    U->>Q: agent.stop()
    Q->>A: Set isExitingFlag = true
    A->>A: Jump to ExitBranch
    A->>S: Animation Finished
    S->>Q: Task Complete
    Q->>Q: Process Next
```
