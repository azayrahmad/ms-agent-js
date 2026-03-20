# Demo Implementation Guide

This guide explains how the MSAgentJS demo is implemented and how it can serve as a reference for integrating digital assistants into your own web applications.

## Architecture Overview

The demo follows a modular, class-based architecture to separate concerns. This structure makes it easier to manage complex UI interactions and agent states.

### Key Components

- **`DemoState` (`src/demo/state.ts`)**: Centralized state management. It tracks the active `Agent` instance, handles resource cleanup (calling `.destroy()`), and maintains global flags like visibility and guided tour status.
- **`BaseTab` & UI Tabs (`src/demo/ui/`)**: Each section of the control panel (Assistant, Animation, Speech) is encapsulated in its own class. This isolates DOM queries and event listeners to relevant sections.
- **`TourManager` (`src/demo/TourManager.ts`)**: Demonstrates how to sequence complex agent actions (`moveTo`, `ask`, `delay`) to create an interactive experience.
- **`LoadingWindow` (`src/demo/ui/LoadingWindow.ts`)**: A custom UI component that uses the `onProgress` callback from `Agent.load` to show a real-time progress bar.

## Integrating the Agent

Below are common implementation patterns used in the demo that you can adapt for your project.

### 1. Loading with Progress Tracking

The `Agent.load` method supports an `onProgress` callback, which is useful for large assets.

```typescript
const agent = await Agent.load('Clippit', {
  baseUrl: '/agents/Clippit',
  onProgress: (progress) => {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`Loading ${progress.filename}: ${percent}%`);
  }
});
```

### 2. Handling Interactive Dialogs

The `agent.ask` method is used for both simple confirmations and complex forms.

```typescript
const result = await agent.ask({
  title: "User Feedback",
  content: [
    "How are you enjoying the experience?",
    { type: "choices", items: ["Great!", "Okay", "Could be better"], style: "bullet" },
    { type: "checkbox", label: "Don't ask me again", checked: false }
  ],
  buttons: [
    { label: "Submit", value: "submit", bullet: "bullet" },
    { label: "Cancel", value: null }
  ]
});

if (result) {
  console.log("Choice index:", result.value);
  console.log("Checkbox state:", result.checked);
}
```

### 3. Synchronizing Actions

The agent uses an internal request queue. You can `await` any action to ensure they happen in sequence.

```typescript
// These will execute one after another
await agent.moveTo(500, 300);
await agent.play('Greeting');
await agent.speak('Welcome to the dashboard!');
```

### 4. Customizing TTS and Animations

The demo shows how to allow users to control voice settings and play specific animations from a list.

```typescript
// Get available voices
const voices = agent.getTTSVoices();

// Update TTS options
agent.setTTSOptions({
  voice: voices[0],
  volume: 1.0,
  pitch: 1.0,
  rate: 1.0
});

// List all available animations
const animations = agent.animations();
agent.play(animations[0]);
```

### 5. Cleaning Up

Always destroy the agent instance when it is no longer needed to free up memory and remove DOM elements.

```typescript
agent.destroy();
```

## Reference

- [API Reference](./api-reference.md)
- [Source Code (src/demo/main.ts)](../src/demo/main.ts)
