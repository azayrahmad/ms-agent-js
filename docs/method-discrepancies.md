# Microsoft Agent API Discrepancies

This document lists the discrepancies between the current `Agent` class implementation and the official Microsoft Agent Character Object Methods.

## Character Object Methods

| Method | ms-agent-js Implementation | Official Microsoft Agent Specification | Discrepancy Details |
| --- | --- | --- | --- |
| `Activate` | Missing | `Activate([State])` | Not implemented. MS Agent uses this to manage input focus and z-order (State 0, 1, 2). |
| `GestureAt` | `gestureAt(x, y)` | `GestureAt(x, y)` | Signature matches. Returns `AgentRequest` (Promise-based) instead of legacy `Request` object. |
| `Get` | Ignored | `Get(Type, Name, [Queue])` | Ignored per requirements. Originally used for async asset loading. |
| `Hide` | `hide(animationName?)` | `Hide([Fast])` | `ms-agent-js` allows specifying an animation; MS Agent uses a `Fast` boolean to skip the "Hiding" animation. |
| `Interrupt` | `interrupt(animationName)` | `Interrupt(Request)` | **Major Discrepancy**: In `ms-agent-js`, it interrupts the character's *own* queue to play a new animation. In MS Agent, it is used to interrupt a *specific request* of *another* character. |
| `Listen` | Missing | `Listen(State)` | Not implemented. Used for speech recognition. |
| `MoveTo` | `moveTo(x, y, speed?)` | `MoveTo(x, y, [Speed])` | **Major Discrepancy**: MS Agent `Speed` is duration in ms (default 1000). `ms-agent-js` `speed` is pixels per second (default 400). |
| `Play` | `play(name, timeout?, exit?, loop?)` | `Play(AnimationName)` | `ms-agent-js` adds web-specific parameters (`timeout`, `loop`, `useExitBranch`). |
| `Show` | `show(animationName?)` | `Show([Fast])` | `ms-agent-js` allows specifying an animation; MS Agent uses a `Fast` boolean to skip the "Showing" animation. |
| `ShowPopupMenu` | Missing | `ShowPopupMenu(x, y)` | Not implemented. MS Agent provides a built-in menu; `ms-agent-js` relies on the `contextmenu` event. |
| `Speak` | `speak(text, options?)` | `Speak([Text], [Url])` | MS Agent supports external audio files (`Url`). `ms-agent-js` uses `options` for `hold`, `useTTS`, and `skipTyping`. |
| `Stop` | `stop(request?)` | `Stop([Request])` | Mostly aligned. In `ms-agent-js`, `stop()` (no args) stops current and clears queue, which matches MS Agent behavior. |
| `StopAll` | Missing | `StopAll([Type])` | Not implemented as a separate method. MS Agent allows stopping specific types (e.g., only "Move" requests). |
| `Think` | Missing | `Think([Text])` | Not implemented. Displays text in a "thought" balloon without changing animation state. |
| `Wait` | `wait(request)` | `Wait(Request)` | Aligned. Used to synchronize multiple characters. |

## Request Object Discrepancies

The official `Request` object (returned by most methods) has specific properties for status tracking and error handling.

| Property | ms-agent-js `AgentRequest` | Official `Request` Object |
| --- | --- | --- |
| Status | `status` (Matches) | `Status` (0=Complete, 1=Failed, 2=Pending, 3=Interrupted, 4=InProgress) |
| Description | Missing | `Description` (String description of error) |
| Number | Missing | `Number` (Long integer error code) |
| ID | `id` | Missing (Official uses object reference equality) |
| Async Support | `promise`, `then()` | Missing (Official uses `RequestComplete` event) |

## Event Discrepancies

MS Agent defines several events for synchronization that are partially or not implemented in the public API:

- `ActivateInput` / `DeactivateInput`: Missing.
- `ListenStart` / `ListenComplete`: Missing.
- `Bookmark`: Missing (used for `\mrk` speech tags).
- `RequestStart` / `RequestComplete`: Emitted by `ms-agent-js` but not documented as part of the public `on()` API.

## Behavioral Differences

1.  **Return Animations:** MS Agent automatically plays "Return" animations (e.g., `GreetReturn`) when an animation completes or is interrupted. `ms-agent-js` requires manual logic or the `useExitBranch` flag.
2.  **Speech Tags:** MS Agent supports a wide array of speech control tags (`\Chr`, `\Map`, `\Pau`, `\Pit`, `\Spd`, `\Vol`) which are not currently implemented in `ms-agent-js`.
3.  **Automatic Idle:** MS Agent has complex "Idle" states and levels. `ms-agent-js` implements a simplified version via `StateManager`.
