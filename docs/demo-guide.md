# Demo Implementation Guide

This guide explains how the MSAgentJS demo is implemented and how it can serve as a reference for integrating digital assistants into your own web applications.

## Architecture Overview

The demo follows a modular, class-based architecture to separate concerns. This structure makes it easier to manage complex UI interactions and agent states.

### Key Components

- **`DemoState` (`src/demo/state.ts`)**: Centralized state management. It tracks the active `Agent` instance, handles resource cleanup (calling `.destroy()`), and maintains global flags like visibility and guided tour status.
- **`AboutTab` (`src/demo/ui/AboutTab.ts`)**: Manages the agent's lifecycle (Start/Stop), visibility toggling, and provides access to the help system.
- **`BaseTab` & UI Tabs (`src/demo/ui/`)**: Each section of the control panel (Assistant, Animation, Speech) is encapsulated in its own class. This isolates DOM queries and event listeners to relevant sections.
- **`TourManager` (`src/demo/TourManager.ts`)**: Demonstrates how to sequence complex agent actions (`moveTo`, `ask`, `delay`) to create an interactive guided tour.
- **`HelpManager` (`src/demo/HelpManager.ts`)**: Implements a hybrid help system using predefined topics and keyword-based search via interactive dialogs.
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

The `agent.ask` method is used for both simple confirmations and complex forms. It supports choices, checkboxes, and text input.

```typescript
const result = await agent.ask({
  title: "User Feedback",
  content: [
    "How are you enjoying the experience?",
    { type: "choices", items: ["Great!", "Okay", "Could be better"], style: "bullet" },
    { type: "input", placeholder: "Tell us more...", rows: 3 },
    { type: "checkbox", label: "Don't ask me again", checked: false }
  ],
  buttons: [
    { label: "Submit", value: "submit", bullet: "bullet" },
    { label: "Cancel", value: null }
  ]
});

if (result) {
  console.log("Choice index/value:", result.value);
  console.log("Text input:", result.text);
  console.log("Checkbox state:", result.checked);
}
```

> **Tip:** You can use HTML tags like `<a>` or `<b>` within speech and dialog content for rich formatting and links.

### 3. Synchronizing Actions

The agent uses an internal request queue. You can `await` any action to ensure they happen in sequence.

```typescript
// These will execute one after another
await agent.moveTo(500, 300);
await agent.play('Greeting');
await agent.speak('Welcome to the dashboard!');
```

### 4. Customizing TTS and Animations

The demo shows how to control voice settings, play specific animations, or switch between high-level behavioral states.

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

// Play a specific animation from the character definition
agent.play('Wave');

// Set a high-level behavioral state (e.g., 'Searching', 'IdlingLevel2')
// This will trigger associated animations and loop idles automatically.
await agent.setState('Searching');
```

### 5. Listening to Events

The agent emits various events that you can listen to for integrating with your application's logic.

```typescript
agent.on('click', () => {
  agent.animate(); // Play a random animation on click
});

agent.on('contextmenu', (data) => {
  console.log(`Right-click at ${data.x}, ${data.y}`);
  agent.speak(`You clicked at ${data.x}, ${data.y}`);
});

agent.on('animationStart', (name) => {
  console.log(`Starting animation: ${name}`);
});
```

### 6. Cleaning Up

Always destroy the agent instance when it is no longer needed to free up memory and remove DOM elements.

```typescript
agent.destroy();
```

## Reference

- [API Reference](./api-reference.md)
- [Source Code (src/demo/main.ts)](../src/demo/main.ts)
