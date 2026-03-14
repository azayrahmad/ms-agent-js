# API Reference

This document provides a detailed reference for the `Agent` class and its associated methods.

## Configuration Options

When calling `Agent.load(name, options)`, you can pass a configuration object:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | `document.body` | The element where the agent will be appended. |
| `baseUrl` | `string` | `/agents/{name}` | The base path to the agent's folder. |
| `scale` | `number` | `1` | Scaling factor (e.g., 2 for double size). |
| `speed` | `number` | `1` | Multiplier for animation playback speed. |
| `idleIntervalMs` | `number` | `5000` | Delay between checks for idle animations. |
| `useAudio` | `boolean` | `true` | Whether to enable sound effects. |
| `fixed` | `boolean` | `true` | Use `fixed` instead of `absolute` positioning. |
| `x`, `y` | `number` | Bottom Right | Initial coordinates of the agent. |

---

## Positioning & Visibility

### `agent.show()`
Plays the "Showing" animation and makes the agent visible. Returns a promise that resolves when the animation finishes.

### `agent.hide()`
Plays the "Hiding" animation and hides the agent. Returns a promise that resolves when the animation finishes.

### `agent.moveTo(x, y, speed?)`
Smoothly moves the agent to the specified coordinates.
- **`x`, `y`**: Target pixel coordinates.
- **`speed`**: Pixels per second (default: 400).

### `agent.setScale(scale)`
Dynamically changes the agent's size.
- **`scale`**: Numeric factor (1.0 = 100%).

---

## Animations & Behavior

### `agent.play(animationName, options?)`
Plays a specific animation by name.
- **`timeoutMs`**: Max duration for the animation.
- **`useExitBranch`**: If true, plays the "return to neutral" sequence at the end (default: true).
- **`loop`**: If true, loops the animation until stopped.

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

### `agent.ask(options?)`
Opens an interactive dialog with a text input.
- **`title`**: Header text for the dialog.
- **`placeholder`**: Hint text for the input area.
- **`askButtonText` / `cancelButtonText`**: Custom button labels.
- **`timeout`**: Auto-cancel after milliseconds.

### `agent.stop(request?)`
Stops the current action or a specific request.

### `agent.stopCurrent()`
Stops the currently active request and proceeds to the next in the queue.

### `agent.interrupt(animationName)`
Stops all current actions and immediately plays the new animation.

---

## Events

Subscribe to events using `agent.on(eventName, callback)`:

- `click`: User clicked the agent canvas.
- `animationStart` / `animationEnd`: Triggered when an animation begins/finishes.
- `stateChange`: Triggered when the high-level behavior state changes.
- `show` / `hide`: Triggered for visibility transitions.
- `dragstart` / `drag` / `dragend`: Triggered during movement interactions.

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
