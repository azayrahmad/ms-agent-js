# MSAgentJS Developer Documentation

This document provides a detailed overview of the internal architecture, logic flow, and data structures used in the `ms-agent-js` library.

## Architecture Overview

The library is organized into specialized managers, coordinated by a central `Agent` class. This structure is a TypeScript/JavaScript port of the original `ClippitWinforms` C# logic, but optimized for the web environment.

### Core Components

1.  **Agent (`src/Agent.ts`):** The primary entry point. It manages the rendering loop, holds the managers, and exposes the public API.
2.  **CharacterParser (`src/CharacterParser.ts`):** Parses the legacy `.acd` (Agent Character Definition) format. It handles nested sections, localized info, and bitmask style flags.
3.  **SpriteManager (`src/SpriteManager.ts`):** Handles image loading and rendering. It supports both legacy 8-bit/24-bit/32-bit BMP files and modern texture atlases.
4.  **AnimationManager (`src/AnimationManager.ts`):** Controls frame-by-frame timing, probabilistic branching, and sound triggers.
5.  **StateManager (`src/StateManager.ts`):** Manages high-level behavioral states (Showing, Hiding, Idling, Playing). It includes an idle progression system to vary animations based on "boredom" levels.
6.  **AudioManager (`src/AudioManager.ts`):** Manages sound effect loading and playback, including a custom decoder for Microsoft ADPCM WAV files.
7.  **Balloon (`src/Balloon.ts`):** A procedural SVG-based speech bubble system with built-in typing logic and TTS synchronization.

---

## Data Model

The data structures are defined in `src/types.ts`.

- **AgentCharacterDefinition:** The root object containing all character metadata, balloon settings, animations, states, and optional atlases.
- **Animation:** A sequence of frames.
- **FrameDefinition:** Contains display duration (in units of 10ms), a list of image layers, sound effects, and branching logic.
- **State:** A logical grouping of animations (e.g., "Searching" might contain several different search-related animations).

---

## Logic Flow

### 1. Initialization and Asset Loading
When `Agent.load(name, options)` is called:
1.  It attempts to fetch `agent.json` (optimized format) or `<NAME>.acd` (legacy format).
2.  The `CharacterParser` (if needed) translates the text definition into a structured JS object.
3.  The `SpriteManager` loads the texture atlas (WebP/PNG) or the `ColorTable.bmp` to determine transparency.
4.  The `AudioManager` pre-loads the audio spritesheet if available.
5.  The `Agent` starts the internal `requestAnimationFrame` loop.

### 2. The Rendering Loop
The main loop runs every frame (~16ms):
1.  **Animation Update:** `AnimationManager.update(currentTime)` is called.
    - If the current frame's duration has elapsed, it moves to the next frame.
    - If the frame has `branching` logic, it picks the next frame based on probability.
    - If the frame is a "null frame" (duration 0), it instantly moves to the next frame (up to 100 times to avoid infinite loops).
    - If a sound effect is specified, it triggers the `AudioManager`.
2.  **State Update:** `StateManager.update(deltaTime)` is called.
    - If no animation is currently playing, it checks if it should pick a new animation from the current state pool.
    - Manages transitions like `Showing` -> `IdlingLevel1`.
    - Increments the idle tick counter. Every `ticksPerLevel` intervals, the agent's idle level increases (up to level 3), which typically has more elaborate "bored" animations.
3.  **Draw:** `Agent.draw()` clears the canvas and calls `AnimationManager.draw()`.
    - `SpriteManager.drawFrame()` iterates through the current frame's image layers (back-to-front) and renders them to the context, applying the scaling factor.

### 3. State Transitions and Interruptions
The agent uses a "priority" system for animations:
- **Persistent States:** (Idling, Gesturing, Looking) These states loop their animations or pick new ones automatically when the current one finishes.
- **Transient States:** (Showing, Hiding, Playing) These states play an animation sequence once and then transition back to a neutral state (usually Idling).

**Interruptions:** When `agent.play('NewAnim')` is called while another animation is active:
1.  The `StateManager` signals the current animation to interrupt.
2.  The `AnimationManager` sets `isExiting = true`.
3.  On the next update, the `AnimationManager` looks for an `exitBranch` on the current frame.
4.  If an `exitBranch` exists, it jumps directly to that frame (which is usually part of a sequence that returns the agent to a neutral "neutral" frame 0).
5.  Once the exit sequence completes, the new animation starts.

---

## Balloon Logic

The speech balloon uses a procedurally generated SVG path.
1.  **Measurement:** The balloon measures the text content within its hidden container.
2.  **Placement:** It selects one of 4 quadrants (Top, Bottom, Left, Right) based on available screen space relative to the agent.
3.  **Tip Calculation:** The "sliding tip" logic ensures the balloon's pointer always aims at the agent's center, even if the balloon body is offset to stay on-screen.
4.  **Rendering:** The SVG path is constructed with rounded corners and the calculated tip peak.
5.  **Typing:** Text is added character-by-character. If TTS is enabled, it uses the `onboundary` event of the `SpeechSynthesisUtterance` to sync the visual text with the spoken words.

---

## Handling Legacy Assets

- **BMP Transparency:** Browsers do not natively support indexed BMP transparency. The `SpriteManager` reads the raw binary BMP, finds the palette, identifies the color at the specified `transparency` index, and manually sets the alpha channel to 0 for matching pixels as it draws to an internal canvas.
- **MS ADPCM Audio:** Microsoft Agent uses a proprietary 4-bit adaptive PCM compression. The `MSADPCMDecoder` implements this algorithm to convert the binary buffer into standard Float32 PCM samples that the Web Audio API can play.

---

## Performance Considerations

- **Texture Atlases:** Loading hundreds of small BMP files is slow due to HTTP overhead. The `scripts/generate-atlas.mjs` script (not part of the library itself but used for preparation) combines these into a single WebP/PNG and generates an `agent.json` definition with atlas coordinates.
- **Shadow DOM:** Using a Shadow Root ensures that the library's styles (for the balloon and container) never interfere with the host page's CSS.
- **RequestAnimationFrame:** Using the browser's native loop ensures animations are smooth and throttle automatically when the tab is inactive.
