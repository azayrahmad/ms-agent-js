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

### Direct Download (GitHub Release)

If you prefer not to use a package manager, you can download the built library directly from the [GitHub Releases](https://github.com/azayrahmad/ms-agent-js/releases).

1. Download the `ms-agent-js.zip` from the latest release.
2. Extract the files into your project directory (e.g., into a `lib/ms-agent-js` folder).
3. Include the library in your HTML:

```html
<!-- For modern browsers (ES Modules) -->
<script type="module">
  import { Agent } from './lib/ms-agent-js/ms-agent-js.es.js';
  // ...
</script>

<!-- OR for older browsers or simple scripts (UMD) -->
<script src="./lib/ms-agent-js/ms-agent-js.umd.js"></script>
<script>
  // Access via the MSAgentJS global
  const { Agent } = MSAgentJS;
  // ...
</script>
```

> **Note:** Ensure the `agents/` folder is located in the same directory as the script, or specify the `baseUrl` when loading an agent.

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
const result = await agent.ask({
  title: 'Welcome',
  placeholder: 'What is your name?'
});

if (result && result.text) {
  await agent.speak(`Nice to meet you, ${result.text}!`);
}
```

### 3. Using as an Avatar (API Reflection)

You can define custom states to make the agent act as an avatar for your API or application logic. For example, a `Processing` state that loops thinking animations:

```javascript
const agent = await Agent.load('Clippit', {
  customStates: {
    Processing: {
      name: 'Processing',
      animations: ['Thinking', 'Searching'],
      type: 'persistent'
    }
  }
});

// When your API starts working:
agent.setState('Processing');

const data = await myApi.fetch();

// Return to idle when done:
agent.setState('IdlingLevel1');
```

## Next Steps

- **[API Reference](./api-reference.md)**: Explore all available commands and configuration options.
- **[Asset Management](./assets.md)**: Learn how to add new agents and optimize them for the web.
- **[The Request System](./request-system.md)**: Understand how the asynchronous action queue works.
