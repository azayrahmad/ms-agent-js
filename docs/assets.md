# Asset Management

MSAgentJS requires character definition files, images, and sounds to bring an agent to life. It supports both legacy Microsoft Agent files and a modern, optimized format.

---

## Asset Formats

### 1. Legacy Format (.acd, .bmp, .wav)
This format uses the original files extracted from Microsoft Agent `.acs` characters.
- **Pros**: Easy to use immediately after decompiling.
- **Cons**: Slower to load (hundreds of small files), requires more bandwidth.

### 2. Optimized Format (agent.json, .webp, .webm)
This is the recommended format for web production.
- **Pros**: High performance. All images are combined into a single texture atlas (WebP), and all sounds are merged into an audio spritesheet (WebM).
- **Cons**: Requires a one-time optimization step.

---

## How to Add New Agents

### Where to find characters?
- **Legacy MS Office**: If you have an old Office 2000/XP installation, look in `C:\Windows\Msagent\Chars`.
- **TMAFE**: [The Microsoft Agent Fan Expansion](https://tmafe.com/classic-ms-agents/) hosts a huge library of classic and custom agents.

### Step-by-Step Guide
1.  **Decompile**: Use a tool like [MS Agent Decompiler](http://www.lebeausoftware.org/software/decompile.aspx) to extract the `.acs` file into a folder.
2.  **Organize**: Create a folder in your project (e.g., `public/agents/Merlin`).
3.  **Place Files**: Copy the `.acd` file, the `Images/` folder, and the `Audio/` folder into that directory.
4.  **Load**: You can now load it via `Agent.load('Merlin')`.

---

## Optimizing Assets (Recommended)

To convert legacy files into the optimized format, use the included CLI tool:

```bash
# Point the script to your agent's folder
npx tsx scripts/optimize-agent.ts public/agents/Merlin
```

### What the script does:
1.  **Texture Atlas**: Stitches all BMP frames into a single, compact WebP image.
2.  **Audio Spritesheet**: Combines all WAV files into a single WebM file and generates timing metadata.
3.  **JSON Definition**: Converts the text-based `.acd` file into a compact JSON format.

Once `agent.json`, `agent.webp`, and `agent.webm` are generated, you can delete the original legacy files to save space.

---

## Custom Loading

If your assets are hosted on a CDN or a different path, use the `baseUrl` option:

```javascript
const agent = await Agent.load('Clippit', {
  baseUrl: 'https://cdn.example.com/assets/agents/clippit'
});
```
