# 📎 MSAgentJS

A modern, TypeScript-based implementation of Microsoft Agent, bringing the charm of Clippy and friends back to the web.

[**Live Demo**](https://azayrahmad.github.io/ms-agent-js/) | [**Documentation**](./docs/getting-started.md) | [**Contributing**](./CONTRIBUTING.md)

---

## 🚀 Features

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
- **[Internal Architecture](./AGENTS.md)**: Deep dive for developers and AI agents.

## 🤝 Credits

- Inspired by the original **Microsoft Agent** technology and [clippy.js](https://github.com/clippyjs/clippy.js).
- Character assets are property of Microsoft Corporation.

## ⚖️ License

[MIT License](./LICENSE).
