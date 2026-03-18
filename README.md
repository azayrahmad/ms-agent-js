<p align="center">
  <img src="public/clippy-title.png" width="200" alt="MSAgentJS Clippy Icon">
</p>

<h1 align="center">MSAgentJS: The Modern Clippy for the Web</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/ms-agent-js">
    <img src="https://img.shields.io/npm/v/ms-agent-js?style=plastic&color=blue" alt="npm version">
  </a>
  <a href="https://github.com/azayrahmad/ms-agent-js/actions/workflows/deploy-pages.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/azayrahmad/ms-agent-js/deploy-pages.yml?branch=main&label=deploy&style=plastic" alt="GitHub Deploy Status">
  </a>
  <a href="https://www.npmjs.com/package/ms-agent-js">
    <img src="https://img.shields.io/npm/dm/ms-agent-js?style=plastic&color=brightgreen" alt="npm downloads">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/azayrahmad/ms-agent-js?style=plastic&color=orange" alt="License">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=plastic" alt="TypeScript Ready">
  </a>
</p>

A high-performance, TypeScript-based implementation of Microsoft Agent. Bring back Clippy and the rest of the gang to your modern web applications with a simple, promise-based API. While this is inspired by [clippy.js](https://github.com/clippyjs/clippy.js) and borrows some logic, this is a reimplementation from scratch meant to be a modern, more faithful recreation of Microsoft Agent designed to work on any web page.

<p align="center">
  <a href="https://azayrahmad.github.io/ms-agent-js/"><strong>Live Demo</strong></a> |
  <a href="./docs/getting-started.md"><strong>Documentation</strong></a> |
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

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
- **Speech Balloons**: Procedurally generated SVGs with support for text input and action buttons.
- **Optimized Assets**: Support for both original decompiled MS Agent assets and optimized WebP/WebM formats.
- **Draggable**: Built-in support for repositioning agents via mouse or touch.
- **TTS Support**: Built-in text-to-speech support using the browser's native Web Speech API.

## 🎭 Available Agents

| Clippit | The Dot | F1 | The Genius | Office Logo | Mother Nature | Monkey King | Links | Rocky |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ![Clippit](public/agent_thumbs/Clippit_thumb.png) | ![The Dot](public/agent_thumbs/DOT_thumb.png) | ![F1](public/agent_thumbs/F1_thumb.png) | ![The Genius](public/agent_thumbs/GENIUS_thumb.png) | ![Office Logo](public/agent_thumbs/LOGO_thumb.png) | ![Mother Nature](public/agent_thumbs/MNATURE_thumb.png) | ![Monkey King](public/agent_thumbs/Monkey_King_thumb.png) | ![Links](public/agent_thumbs/OFFCAT_thumb.png) | ![Rocky](public/agent_thumbs/ROCKY_thumb.png) |

## 📦 Installation

```bash
npm install ms-agent-js
```

You can also download the pre-built library and assets directly from [GitHub Releases](https://github.com/azayrahmad/ms-agent-js/releases).

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
