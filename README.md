# 📎 MSAgentJS: The Modern Clippy for the Web

A high-performance, TypeScript-based implementation of Microsoft Agent. Bring back Clippy, Merlin, and the rest of the gang to your modern web applications with a simple, promise-based API.

[**Live Demo**](https://azayrahmad.github.io/ms-agent-js/) | [**Documentation**](./docs/getting-started.md) | [**Contributing**](./CONTRIBUTING.md)

---

## 🚀 Why MSAgentJS?

If you're looking for the nostalgic feel of **clippy.js** but need something built for the modern web, MSAgentJS is for you.

- **Zero Dependencies**: No jQuery or heavy external libraries required.
- **AI-Ready**: Perfect as a unique, interactive UI for LLM-powered assistants.
- **Shadow DOM Isolation**: Prevents CSS leaks, making it safe to drop into any project.
- **High Performance**: Uses HTML5 Canvas and optimized asset formats (WebP/WebM).
- **TypeScript First**: Full type safety for a better developer experience.

## ✨ Features

- **Modern API**: Simple, promise-based API for animations, state transitions, and speech.
- **Shadow DOM**: Zero CSS leakage. The agent and its balloon are fully isolated.
- **Procedural Balloons**: SVGs rendered with pixel-perfect fidelity to the original look.
- **Optimized Assets**: Support for WebP texture atlases and WebM audio spritesheets.
- **Draggable**: Built-in support for repositioning agents via mouse or touch.

## 📦 Installation

```bash
npm install ms-agent-js
```

## 🛠 Quick Start

```javascript
import { Agent } from 'ms-agent-js';

async function init() {
  const agent = await Agent.load('Clippit');
  await agent.show();
  await agent.speak('Hello! I am your web assistant.');
}

init();
```

---

## 📖 Documentation Map

- **[Getting Started](./docs/getting-started.md)**: Installation and basic usage.
- **[API Reference](./docs/api-reference.md)**: Full list of methods, options, and events.
- **[Request System](./docs/request-system.md)**: Understanding the asynchronous action queue.
- **[Asset Management](./docs/assets.md)**: How to add and optimize new agents.
- **[Contributing](./CONTRIBUTING.md)**: Guidelines for developers and repo setup.
- **[Internal Architecture](./docs/internals.md)**: Deep dive into the engine's core logic.
- **[AI Onboarding](./AGENTS.md)**: Specific recipes and tips for AI agents.

## 🤝 Credits

- Inspired by the original **Microsoft Agent** technology and [clippy.js](https://github.com/clippyjs/clippy.js).
- Character assets are property of Microsoft Corporation.

## ⚖️ License

[MIT License](./LICENSE).
