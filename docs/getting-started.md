# Getting Started with MSAgentJS

Welcome to MSAgentJS! This guide will help you get a digital assistant up and running on your website in minutes.

## Installation

You can install MSAgentJS via npm:

```bash
npm install ms-agent-js
```

Or use it via a CDN like unpkg:

```html
<script type="module">
  import { Agent } from 'https://unpkg.com/ms-agent-js@latest/dist/ms-agent-js.es.js';
  // ...
</script>
```

## Basic Usage

To bring an agent to life, you need two things: the library and the agent assets.

### 1. Load an Agent

By default, the library looks for assets in `/agents/<AgentName>/`.

```javascript
import { Agent } from 'ms-agent-js';

async function init() {
  // Load 'Clippit' from /agents/Clippit/
  const agent = await Agent.load('Clippit');

  // Show the agent (plays the entry 'Showing' animation)
  await agent.show();

  // Make the agent speak
  await agent.speak('Hello! I am your web assistant.');
}

init();
```

### 2. Basic Interactions

Once loaded, you can command the agent to move, play animations, or ask questions:

```javascript
// Play a specific animation
await agent.play('Greeting');

// Move to specific coordinates (x, y)
agent.moveTo(100, 100);

// Ask for user input
const name = await agent.ask({
  title: 'Welcome',
  placeholder: 'What is your name?'
});

if (name) {
  await agent.speak(`Nice to meet you, ${name}!`);
}
```

## Next Steps

- **[API Reference](./api-reference.md)**: Explore all available commands and configuration options.
- **[Asset Management](./assets.md)**: Learn how to add new agents and optimize them for the web.
- **[The Request System](./request-system.md)**: Understand how the asynchronous action queue works.
