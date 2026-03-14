# Contributing to MSAgentJS

Thank you for your interest in contributing to MSAgentJS! This document will help you get started with the development environment and understand our standards.

## 🛠 Development Environment

### Setup
Ensure you have [Node.js](https://nodejs.org/) installed, then clone the repository and install dependencies:

```bash
git clone https://github.com/azayrahmad/ms-agent-js.git
cd ms-agent-js
npm install
```

### Local Development
To start the Vite development server and preview the demo application:

```bash
npm run dev
```

### Building
To build both the library and the demo application:

```bash
npm run build
```

---

## 🧪 Testing Strategy

We use **Vitest** for unit and integration testing, and **Playwright** for end-to-end/visual verification.

### Running Tests
```bash
# Run all unit tests
npm test

# Run Vitest in UI mode
npx vitest --ui
```

Before submitting a PR, ensure all tests pass and consider adding new tests for any features or bug fixes.

---

## 📜 Coding Standards

- **TypeScript**: We use strict typing. Avoid `any` whenever possible.
- **Managers**: Encapsulate new features in dedicated managers (e.g., `AudioManager`, `SpriteManager`) to keep the `Agent` coordinator clean.
- **Modern Patterns**: Use `async/await` for asynchronous operations and Shadow DOM for component isolation.

### Commit Conventions
This project uses **Conventional Commits** for automated releases and changelog generation. Please follow this format:

- `feat:` for new user-facing features.
- `fix:` for bug fixes.
- `docs:` for documentation changes.
- `refactor:` for code changes that neither fix a bug nor add a feature.
- `chore:` for updating build tasks, package manager configs, etc.

---

## 🎨 Asset Optimization Tooling

If you are working with agent assets, you will likely use the `optimize-agent.ts` script. This script is crucial for maintaining performance.

```bash
npx tsx scripts/optimize-agent.ts path/to/agent/folder
```

See **[docs/assets.md](./docs/assets.md)** for more details on how this works.

---

## 🔍 Internal Architecture

For a deep dive into how the engine works (rendering loops, request queues, etc.), please see **[docs/internals.md](./docs/internals.md)**.
