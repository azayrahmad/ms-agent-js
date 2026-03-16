# The Request System

Most API methods in MSAgentJS do not execute immediately. Instead, they are added to an internal **Request Queue** to ensure that the agent performs actions sequentially (e.g., it finishes speaking before it starts moving).

## `AgentRequest` Object

Every action method (like `speak`, `play`, `moveTo`) returns an `AgentRequest` object.

### Properties
- **`id`**: A unique identifier for the request.
- **`status`**: The current lifecycle state of the request.
- **`promise`**: A promise that resolves when the request is no longer active (either completed, interrupted, or failed).

### Request Statuses
You can import `RequestStatus` to check the state of a request:

| Status | Description |
| --- | --- |
| `Pending` | The request is waiting in the queue. |
| `InProgress` | The agent is currently performing this action. |
| `Complete` | The action finished successfully. |
| `Interrupted` | The action was stopped (e.g., via `agent.stop()`). |
| `Failed` | An error occurred during execution. |

## Working with Promises

Requests are "thenable," meaning you can `await` them directly:

```javascript
import { Agent, RequestStatus } from 'ms-agent-js';

const agent = await Agent.load('Clippit');

// Wait for speech to finish
const request = agent.speak('I will wait for this to finish.');
await request;

if (request.status === RequestStatus.Complete) {
  console.log('Finished speaking!');
}
```

## Queue Control

### `agent.wait(request)`
Queues a wait command until a specific request (potentially from earlier in the queue) completes.

### `agent.delay(ms)`
Queues a pause (in milliseconds) in the request queue.

### `agent.stop(request?)`
- If a `request` is provided, it attempts to cancel that specific request.
- If no argument is provided, it stops the current action and clears the entire queue.

### `agent.stopCurrent()`
Stops only the currently active request and immediately proceeds to the next item in the queue.

### `agent.interrupt(animationName)`
This is a "high-priority" command. It clears the queue, stops the current action, and plays the specified animation immediately.
