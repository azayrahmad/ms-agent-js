# MSAgent Speech Balloon Comparison: JS vs. C++ (TripleAgent)

This document compares the speech balloon implementation in `ms-agent-js` (TypeScript/HTML) and `TripleAgent` (C++/GDI+).

## 1. Rendering Engine

| Feature | ms-agent-js | TripleAgent (C++) |
| --- | --- | --- |
| **Technology** | HTML/CSS (Shadow DOM) | GDI+ (Layered Window) |
| **Shape** | CSS `border-radius` + PNG tip | Procedural `GraphicsPath` (Arcs + Lines) |
| **Fidelity** | "Web-style" approximation | High (Procedural drawing matches original GDI look) |
| **Transparency** | Standard DOM transparency | `UpdateLayeredWindow` with per-pixel alpha |

## 2. Positioning & Tip Logic

| Feature | ms-agent-js | TripleAgent (C++) |
| --- | --- | --- |
| **Placement** | 4 Fixed Quadrants | 4 Quadrants + Dynamic sliding |
| **Tip Position** | Fixed relative to balloon body | Slides along the edge to point at agent center |
| **Collision** | Simple viewport check | `Place` algorithm with "TryRange" loop |

## 3. Character Definition Integration

| Feature | ms-agent-js | TripleAgent (C++) |
| --- | --- | --- |
| **Colors** | Basic mapping to CSS | Strict use of `foreColor`, `backColor`, `borderColor` |
| **Font** | Browser default / Arial | Scaled font based on `FontHeight` from definition |
| **Sizing** | DOM-based auto-sizing | `MeasureString` + `CharsPerLine` / `NumLines` limits |

## 4. Speech & TTS Synchronization

| Feature | ms-agent-js | TripleAgent (C++) |
| --- | --- | --- |
| **Typing Unit** | Word-by-word | Character-by-character (`SpeechProgress`) |
| **TTS Engine** | Web Speech API (`speechSynthesis`) | SAPI (Planned) / GDI+ `SpeechProgress` tracking |
| **Timing** | `WORD_SPEAK_TIME` constant | Dynamic pace based on character definition |

## 5. Goals for JS Implementation Improvement

To reach the "utmost importance" fidelity requested:
1. **Switch to Procedural Drawing:** Use SVG paths or HTML5 Canvas to draw the balloon and tip as a single cohesive shape, allowing for accurate "rounded rectangle" math.
2. **Dynamic Tip:** Implement the sliding tip logic from `TripleAgent` to ensure the balloon always points exactly at the agent.
3. **Character-level Typing:** Move from word-by-word to character-by-character reveals for a smoother, more authentic experience.
4. **Strict Specification Adherence:** Use the `Balloon` settings from the `.acd` file for line counts, character widths, and precise colors.
