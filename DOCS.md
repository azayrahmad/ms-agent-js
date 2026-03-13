# MSAgentJS User Documentation

Welcome to the comprehensive guide for **MSAgentJS**, the modern TypeScript implementation of Microsoft Agent for the web. This document is intended for developers who want to integrate digital assistants into their web applications.

---

## 🚀 Getting Started

### Installation

```bash
npm install ms-agent-js
```

### Basic Usage

```javascript
import { Agent } from 'ms-agent-js';

async function init() {
  // 1. Load the agent
  const agent = await Agent.load('Clippit');

  // 2. Interact
  await agent.speak('Hello! How can I help you today?');
  await agent.play('Searching');
  agent.moveTo(500, 300);
}
```

---

## 🛠 Configuration

When calling `Agent.load(name, options)`, you can customize the agent's behavior:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | `document.body` | Where to attach the agent. |
| `baseUrl` | `string` | `unpkg.com/...` | Base path for assets. |
| `scale` | `number` | `1` | Scaling factor (e.g., 2 for double size). |
| `speed` | `number` | `1` | Animation playback speed multiplier. |
| `useAudio` | `boolean` | `true` | Enable/disable sound effects. |
| `fixed` | `boolean` | `true` | Use `fixed` instead of `absolute` positioning. |
| `x`, `y` | `number` | Bottom Right | Initial coordinates. |
| `idleIntervalMs` | `number` | `5000` | Delay between idle animation checks. |

---

## 📖 API Reference

### Positioning & Visibility

- **`agent.show()`**: Plays the "Showing" animation and makes the agent visible.
- **`agent.hide()`**: Plays the "Hiding" animation and hides the agent.
- **`agent.moveTo(x, y, speed?)`**: Smoothly moves the agent to coordinates.
    - `x`, `y`: Target pixel coordinates.
    - `speed`: Pixels per second (default: 400).
- **`agent.setScale(scale)`**: Dynamically changes the agent's size.
    - `scale`: Numeric factor (1.0 = 100%).

### Animations & Behavior

- **`agent.play(animationName, options?)`**: Plays a specific animation by name.
    - `timeoutMs`: Max duration for the animation.
    - `useExitBranch`: If true, plays the "return to neutral" sequence at the end (default: true).
    - `loop`: If true, loops the animation until stopped.
- **`agent.animate()`**: Plays a random animation (excluding idles).
- **`agent.animations()`**: Returns an array of all available animation names.
- **`agent.hasAnimation(name)`**: Returns true if the animation exists.
- **`agent.gestureAt(x, y)`**: Points at a specific screen coordinate.
- **`agent.lookAt(x, y)`**: Turns to look at a specific screen coordinate.
- **`agent.setState(stateName)`**: Manually sets the high-level state (e.g., "IdlingLevel3").

### Interaction & Speech

- **`agent.speak(text, options?)`**: Displays text in a balloon.
    - `hold`: If true, balloon stays open after speech (default: false).
    - `useTTS`: Enable/disable system speech for this request (default: true).
    - `skipTyping`: Show all text instantly (default: false).
- **`agent.ask(options?)`**: Opens an interactive dialog with a text input.
    - `title`: Header text for the dialog.
    - `placeholder`: Hint text for the textarea.
    - `askButtonText` / `cancelButtonText`: Button labels.
    - `timeout`: Auto-cancel after milliseconds.
- **`agent.stop(request?)`**: Stops the current action or a specific request.
- **`agent.stopCurrent()`**: Stops the currently active request and proceeds to the next in queue.
- **`agent.wait(request)`**: Queues a wait command until the specified request completes.
- **`agent.delay(ms)`**: Queues a pause in the request queue.
- **`agent.interrupt(animationName)`**: Stops all current actions and immediately plays the new animation.

---

## 🚦 The Request System

Most API methods return an `AgentRequest` object. Because MSAgentJS uses an internal queue, actions are processed sequentially.

### `AgentRequest` Properties
- `id`: Unique request ID.
- `status`: Current status (`Pending`, `InProgress`, `Complete`, `Interrupted`, `Failed`).
- `promise`: A promise that resolves when the request is no longer active.

### Handling Statuses
You can import `RequestStatus` to check the state of a request:
```javascript
import { RequestStatus } from 'ms-agent-js';

const request = agent.speak('Wait for me!');
await request; // Requests are "thenable"

if (request.status === RequestStatus.Complete) {
  console.log('Finished speaking!');
}
```

---

## 🔔 Events

Subscribe to events using `agent.on(eventName, callback)`:

- `click`: User clicked the agent.
- `animationStart` / `animationEnd`: Triggered for specific animation playbacks.
- `stateChange`: When the agent transitions (e.g., from Idle to Playing).
- `show` / `hide`: Visibility transitions.
- `dragstart` / `drag` / `dragend`: Movement via mouse/touch.

---

## 🎙 Balloon & TTS

### Text-to-Speech (TTS)
MSAgentJS uses the Web Speech API. You can configure it globally:
```javascript
agent.setTTSOptions({
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voice: agent.getTTSVoices().find(v => v.name === 'Alex')
});
```

### Custom HTML
You can display raw HTML in the balloon:
```javascript
agent.showHtml('<b>Warning:</b> System update required.', true);
```

---

## 📦 Asset Management

MSAgentJS supports two asset formats:

1.  **Legacy (.acd + .bmp + .wav)**: Traditional Microsoft Agent files. Slower to load due to multiple requests.
2.  **Optimized (agent.json + .webp + .webm)**: Recommended for web. Uses texture atlases and audio spritesheets.

### Optimization Script
To convert legacy assets, use the included CLI tool:
```bash
npx tsx scripts/optimize-agent.ts path/to/agent/folder
```

---

## 🔍 Further Reading

- For detailed technical documentation of internal classes, refer to the **JSDoc** comments in the source code.
- To learn about contributing or the internal architecture, see **[AGENTS.md](./AGENTS.md)**.
