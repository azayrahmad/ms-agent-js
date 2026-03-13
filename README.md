# 📎 MSAgentJS

A modern, TypeScript-based implementation of Microsoft Agent, bringing the charm of Clippy and friends back to the web.

This project is inspired by the original [clippy.js](https://github.com/clippyjs/clippy.js) and aims to provide a high-fidelity, extensible engine for digital assistants. It currently focuses on the Office Assistants featured in Microsoft Office 2000, with planned support for newer agent generations and formats.

## Features

- **Shadow DOM Encapsulation:** Zero CSS leakage to your page. The agent and its balloon are isolated.
- **Modern API:** Simple, promise-based API for animations, state transitions, and speech.
- **Internal Loop:** Manages its own `requestAnimationFrame` loop.
- **Asset Normalization:** Robustly handles case-sensitivity and path inconsistencies commonly found in legacy `.acd` files.
- **Procedural Balloons:** Speech balloons are rendered using SVGs for pixel-perfect fidelity with the original Windows look.
- **Optimized Assets:** Supports texture atlases (WebP/PNG) and audio spritesheets (WebM) for fast loading.
- **Draggable:** Built-in support for repositioning agents via mouse or touch.

## Installation

```bash
npm install ms-agent-js
```

## Usage

### Simple Example

```javascript
import { Agent } from 'ms-agent-js';

async function init() {
  // Load the agent 'Clippit' (searches in current directory /agents/Clippit by default)
  const agent = await Agent.load('Clippit');

  // Show the agent (plays the entry 'Showing' animation)
  await agent.show();

  // Make the agent speak
  await agent.speak('Hello! I am your web assistant.');

  // Play a specific animation by name
  await agent.play('Greeting');

  // Move the agent to a specific position
  agent.moveTo(100, 100);
}

init();
```

### Advanced Interactions

```javascript
// Ask the user a question with an input field
const answer = await agent.ask({
  title: 'Search',
  placeholder: 'What are you looking for?'
});

if (answer) {
  await agent.speak(`Searching for "${answer}"...`);
}

// Make the agent look or gesture at a specific point on the screen
window.addEventListener('mousemove', (e) => {
  agent.lookAt(e.clientX, e.clientY);
});

// Configure Text-to-Speech (TTS)
agent.setTTSOptions({
  rate: 1.2,
  pitch: 0.9,
  volume: 0.8
});
```

## Including Agent Assets

MSAgentJS requires agent definition files (.acd or agent.json), images, and sounds.

### Default Asset Structure
By default, the library expects assets at `/agents/<AgentName>/`.

```text
public/
  agents/
    Clippit/
      agent.json      (Optimized definition)
      agent.webp      (Texture atlas)
      agent.webm      (Audio spritesheet)
```

### Adding New Agents
Microsoft Agent characters are traditionally distributed in `.acs` files.

#### Where to get characters?
- **Legacy Installations**: You can find original `.acs` files in your Windows installation if you have old versions of Microsoft Office installed (usually in `C:\Windows\Msagent\Chars`).
- **Community Repositories**: You can download a wide variety of classic and custom characters from:
    - [The Microsoft Agent Fan Expansion (TMAFE) - Classic Agents](https://tmafe.com/classic-ms-agents/)
    - [TMAFE Download Center](https://tmafe.com/download-center)

#### How to use them?
To use these characters with MSAgentJS, you must first decompile them.

1.  **Decompile:** Use a tool like [MS Agent Decompiler](http://www.lebeausoftware.org/software/decompile.aspx) to extract the contents of an `.acs` file.
2.  **Organization:** Create a new folder in your project's `public/agents/` directory (e.g., `public/agents/Merlin`).
3.  **Deployment:** Place the extracted `.acd` file, `Images/` folder, and `Audio/` folder directly into that directory. MSAgentJS can load these legacy files directly.
4.  **Optimization (Optional but Recommended):** To improve performance and reduce network requests, you can combine the hundreds of small BMP and WAV files into a single texture atlas and audio spritesheet.
    - Run the optimization script provided in the repository:
      ```bash
      npx tsx scripts/optimize-agent.ts public/agents/Merlin
      ```
    - Once `agent.json`, `agent.webp`, and `agent.webm` are generated, you can safely delete the original `.bmp`, `.wav`, and `.acd` files to save space.

### Custom Base URL
You can specify exactly where to load assets from:

```javascript
const agent = await Agent.load('Clippit', {
  baseUrl: 'https://cdn.example.com/assets/agents/clippy'
});
```

## Configuration Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `container` | `HTMLElement` | `document.body` | The element where the agent's container div will be appended. |
| `baseUrl` | `string` | `/agents/{name}` | The base path to the agent's folder. |
| `scale` | `number` | `1` | Scaling factor for the agent (e.g., 2 for double size). |
| `speed` | `number` | `1` | Multiplier for animation playback speed. |
| `idleIntervalMs` | `number` | `5000` | Delay between checks for idle animations. |
| `useAudio` | `boolean` | `true` | Whether to enable sound effects playback. |
| `fixed` | `boolean` | `true` | Use `fixed` instead of `absolute` positioning. |
| `x`, `y` | `number` | bottom-right | Initial coordinates of the agent. |

## API Summary

- **`Agent.load(name, options)`**: Static factory to initialize an agent.
- **`agent.show()` / `agent.hide()`**: Visibility transitions with animations.
- **`agent.speak(text, options)`**: Display speech with optional TTS.
- **`agent.play(animation, options)`**: Play a specific animation.
- **`agent.animate()`**: Play a random non-idle animation.
- **`agent.animations()`**: Get a list of all animation names.
- **`agent.moveTo(x, y, speed)`**: Move agent across the screen.
- **`agent.ask(options)`**: Interactive prompt with text input.

For full API documentation, see **[DOCS.md](./DOCS.md)**.

## Events

Subscribe to events using `agent.on(eventName, callback)`:

- `click`: Fired when the agent canvas is clicked (but not dragged).
- `animationStart` / `animationEnd`: Fired when a play request starts/finishes.
- `stateChange`: Fired when the high-level behavior state changes.
- `dragstart` / `drag` / `dragend`: Fired during movement interactions.

## 🗺 Roadmap

Current goals for full parity with the original Microsoft Agent implementation and modern enhancements:

- [ ] **Mirroring**: Support for flipping character sprites horizontally.
- [ ] **Advanced TTS & Lip-Sync**: Support for SAPI-style tags (e.g., `\Pau=500\`) and improved mouth movement animations (visemes) for newer agents like **Genie**.

## 🤝 Credits

- Inspired by the original **Microsoft Agent** technology and [clippy.js](https://github.com/clippyjs/clippy.js).
- Architectural concepts and logic based on **TripleAgent** by [Calavera42](https://github.com/calavera42/TripleAgent).
- Character assets are property of Microsoft Corporation (used here for nostalgia and educational purposes).

## ⚖️ License

[MIT License](./LICENSE). Agent characters belong to Microsoft Corporation.
