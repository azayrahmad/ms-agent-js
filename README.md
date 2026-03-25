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

A web reimplementation of Microsoft Agent. Bring back Clippy and other classic Office assistants with authentic animations and speech support. Perfect for retro UIs and nostalgic web projects.

![MS Agent JS in action as Clippy](public/clippy-welcome-ss.png)

Inspired by [clippy.js](https://github.com/clippyjs/clippy.js), this is a fully rewritten project focuses on a more faithful and modern recreation of Microsoft Agent with improved animation handling, richer features, extensibility, and a design that works seamlessly on any web page.

<p align="center">
  <a href="https://azayrahmad.github.io/ms-agent-js/"><strong>Live Demo</strong></a> |
  <a href="./docs/getting-started.md"><strong>Documentation</strong></a> |
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

## ✨ Features

- **Zero Dependencies**: No jQuery or any other external libraries required to run.
- **Modern API**: Simple, promise-based API for animations, state transitions, and speech.
- **Zero CSS leakage**: Shadow DOM isolates the Agent, making it safe to drop into any project.
- **High Performance**: Uses HTML5 Canvas and optimized asset formats (WebP/WebM).
- **Speech Support**: Support text input, selection list, and action buttons. TTS support with browser's native Web Speech API.
- **Draggable**: Built-in support for repositioning agents via mouse/touch or programmatically. 
- **Legacy Support**: Works with decompiled MS Agent's ACF files directly. Add your own Agents!

## 🎭 Available Agents

Current iteration of MSAgentJS focuses on recreating early Microsoft Agent 2.0 featured in Office 2000. Support for later versions such as Genie and Merlin is in the works.
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
- **[Demo Implementation](./docs/demo-guide.md)**: A guide to how the demo is built.
- **[Contributing](./CONTRIBUTING.md)**: Guidelines for developers and repo setup.
- **[Internal Architecture](./docs/internals.md)**: Deep dive into the engine's core logic.
- **[AI Onboarding](./AGENTS.md)**: Specific recipes and tips for AI agents.

## 🤝 Credits

- The original [Microsoft Agent](https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent) for Microsoft Office 2000 by Microsoft Corporation.
- Reimplementations and decompilers, including [Double Agent](https://doubleagent.sourceforge.net/), [MSAgent Decompiler by Remy Lebeau](http://www.lebeausoftware.org/software/decompile.aspx), and more recently [TripleAgent](https://github.com/calavera42/TripleAgent) by [calavera](https://github.com/calavera42).
- The first JavaScript implementation who started it all, [clippy.js](https://github.com/clippyjs/clippy.js) by [smore](https://github.com/smore-inc), and some great forks like [ClippyJS_EasyAccess](https://github.com/djbritt/ClippyJS_EasyAccess) by [Daniel Britt](https://github.com/djbritt) and [Clippy](https://github.com/pi0/clippy) by [Pooya Parsa](https://github.com/pi0).
- The demo page is styled using [98.css](https://jdan.github.io/98.css/) by [Jordan Scales](https://jordanscales.com/).
- [TMAFE](https://tmafe.com/), the Microsoft Agent community that provides many Agent files and information.

## ⚖️ License

[MIT License](./LICENSE).
