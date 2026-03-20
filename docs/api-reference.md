# API Reference

This document provides a detailed reference for the `Agent` class and its associated methods.

## Configuration Options

### `Agent.load(name, options)` (Static)
Asynchronously loads and initializes an agent.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | `document.body` | The element where the agent will be appended. |
| `baseUrl` | `string` | `unpkg.com` CDN | The base path to the agent's folder. |
| `scale` | `number` | `1` | Scaling factor (e.g., 2 for double size). |
| `speed` | `number` | `1` | Multiplier for animation playback speed. |
| `idleIntervalMs` | `number` | `5000` | Delay between checks for idle animations. |
| `useAudio` | `boolean` | `true` | Whether to enable sound effects. |
| `fixed` | `boolean` | `true` | Use `fixed` instead of `absolute` positioning. |
| `keepInViewport` | `boolean` | `true` | Automatically reposition to stay in view on resize. |
| `x`, `y` | `number` | Bottom Right | Initial coordinates of the agent. |
| `initialAnimation`| `string` | `""` | Animation to play on load instead of 'Showing'. |
| `onProgress` | `function` | `undefined` | Callback for loading progress: `(p: {loaded, total, filename}) => void`. |
| `signal` | `AbortSignal` | `undefined` | Allows cancelling the loading process. |
| `useCache` | `boolean` | `true` | Whether to use internal character and asset caching. |

## Properties

The `Agent` instance provides several read-only properties to access internal managers and state:

| Property | Type | Description |
| --- | --- | --- |
| `definition` | `AgentCharacterDefinition` | The full parsed character definition for this agent. |
| `spriteManager` | `SpriteManager` | Manager responsible for loading and rendering sprites. |
| `audioManager` | `AudioManager` | Manager responsible for playing sound effects. |
| `animationManager` | `AnimationManager` | Manager responsible for low-level animation sequences. |
| `stateManager` | `StateManager` | Manager responsible for high-level behavioral states and idles. |
| `balloon` | `Balloon` | Manager responsible for the speech balloon UI. |
| `requestQueue` | `RequestQueue` | Manager responsible for queuing character actions. |
| `options` | `AgentOptions` | The resolved options used to initialize the agent. |

---

## Positioning & Visibility

### `agent.show(animationName?)`
Plays the "Showing" animation (or custom) and makes the agent visible. Returns a promise that resolves when the animation finishes.

### `agent.hide(animationName?)`
Plays the "Hiding" animation (or custom) and hides the agent. Returns a promise that resolves when the animation finishes.

### `agent.moveTo(x, y, speed?)`
Smoothly moves the agent to the specified coordinates.
- **`x`, `y`**: Target pixel coordinates.
- **`speed`**: Pixels per second (default: 400).

### `agent.setScale(scale)`
Dynamically changes the agent's size.
- **`scale`**: Numeric factor (1.0 = 100%).

---

## Animations & Behavior

### `agent.play(animationName, timeoutMs?, useExitBranch?, loop?)`
Plays a specific animation by name.
- **`timeoutMs`**: Optional time limit for the animation playback.
- **`useExitBranch`**: Whether to take the exit branch immediately (default: `true` if no timeout/loop).
- **`loop`**: Whether to loop the animation indefinitely (default: `false`).

### `agent.animate()`
Plays a random non-idle animation.

### `agent.animations()`
Returns an array of all available animation names.

### `agent.hasAnimation(name)`
Returns `true` if the animation exists for the current agent.

### `agent.gestureAt(x, y)`
Points at a specific screen coordinate.

### `agent.lookAt(x, y)`
Turns to look at a specific screen coordinate.

### `agent.setState(stateName)`
Manually sets the high-level state (e.g., "IdlingLevel3").

---

## Interaction & Speech

### `agent.speak(text, options?)`
Displays text in a speech balloon.
- **`hold`**: If true, the balloon stays open after speech finishes (default: false).
- **`useTTS`**: Enable/disable system speech for this request (default: true).
- **`skipTyping`**: Show all text instantly (default: false).
- **`skipContentUpdate`**: (Internal/Expert) If true, does not overwrite the current content of the balloon. Useful for persistent interactive elements.

### `agent.showHtml(html, hold?)`
Displays raw HTML inside the speech balloon.
- **`hold`**: If true, the balloon stays open until manually closed.

### `agent.ask(options?)`
Opens an interactive dialog with a title, a content array (text, choices, and inputs), and custom buttons. Returns a `Promise<{ value: any, text: string | null, checked: boolean | null } | null>`.
- **`title`**: Header text for the dialog.
- **`content`**: An array of `AskContentItem`.
  - `string`: Renders a block of text.
  - `{ type: 'choices', items: string[], style?: 'bullet' | 'bulb' }`: Renders a list of clickable choices.
  - `{ type: 'input', placeholder?: string, rows?: number }`: Renders a text area input.
  - `{ type: 'checkbox', label: string, checked?: boolean }`: Renders a labeled checkbox.
- **`buttons`**: An array of button definitions. Each can be a string or an object `{ label: string, value: any, bullet?: 'bullet' | 'bulb' }`.
- **`timeout`**: Auto-cancel after milliseconds (default: 60000).

### `agent.stop(request?)`
Stops the specified request or all requests in the queue. If the active request is stopped, the agent moves to the next one.

### `agent.stopCurrent()`
Stops the currently active request and proceeds to the next in the queue.

### `agent.interrupt(animationName)`
Stops all current actions and immediately plays the new animation. Returns an `AgentRequest` for the new animation.

### `agent.wait(request)`
Causes the character's request queue to wait until the specified `AgentRequest` completes.

### `agent.delay(ms)`
Queues a silent delay for the specified number of milliseconds.

---

## Events

MSAgentJS uses an internal event emitter to notify you of various agent activities.

### `agent.on(eventName, callback)`
Subscribes to an agent event.

### `agent.off(eventName, callback)`
Unsubscribes from an agent event.

### Available Events

- `click`: User clicked the agent canvas.
- `contextmenu`: User right-clicked or long-pressed the agent. Payload: `{ x, y, originalEvent }`.
- `animationStart` / `animationEnd`: Triggered when an animation begins/finishes. Payload: `animationName`.
- `stateChange`: Triggered when the high-level behavior state changes. Payload: `(newState, oldState)`.
- `show` / `hide`: Triggered for visibility transitions.
- `dragstart` / `drag` / `dragend`: Triggered during movement interactions. Payload: `{ x, y }` for `drag`.
- `reposition`: Triggered when automatically moved to stay in viewport during window resize. Payload: `{ x, y }`.

### `agent.destroy()`
Performs full cleanup: cancels animations, stops speech, and removes the agent from the DOM.

---

## Text-to-Speech (TTS)

MSAgentJS uses the Web Speech API. You can configure it globally:

```javascript
agent.setTTSOptions({
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voice: agent.getTTSVoices().find(v => v.name === 'Alex')
});
```

### `agent.setTTSOptions(options)`
Configures global Text-to-Speech settings (rate, pitch, volume, voice).

### `agent.getTTSVoices()`
Returns an array of available system voices.

### `agent.stopTTS()`
Instantly stops any ongoing system speech.

---

## 📥 Loading & Progress

The `Agent.load()` method and its managers (`SpriteManager`, `AudioManager`) support an `onProgress` callback and an `AbortSignal`.

### Progress Tracking
A `fetchWithProgress` utility (in `src/utils.ts`) uses `ReadableStream` to track the number of bytes downloaded.
- **`onProgress`**: Receives an object `{ loaded: number, total: number, filename: string }`.
- **`total`**: Can be `0` if the server doesn't provide a `Content-Length` header.

### Cancellation
Passing an `AbortSignal` to `Agent.load()` ensures that all pending network requests (for JSON, texture atlases, and audio spritesheets) are immediately terminated if the signal is aborted.

---
