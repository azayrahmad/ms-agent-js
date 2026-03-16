# MSAgentJS AI Agent Onboarding

Welcome, AI Agent! This document contains "Recipes" and "Tips" specifically designed to help you navigate and modify this codebase efficiently.

---

## 👨‍💻 Operational Recipes

Follow these common patterns when tasked with extending the library:

### Recipe: Adding a New Manager
1.  Define the manager class in `src/`.
2.  Initialize it in the `Agent` constructor.
3.  If it needs to be updated every frame, call its `update(deltaTime)` method inside `Agent._loop`.

### Recipe: Debugging the Frame Loop
-   The `AnimationManager` handles frame durations in units of 10ms (matching the original MS Agent spec).
-   If animations are too fast/slow, check the `speed` multiplier in `Agent` or the `duration` values in the `AgentCharacterDefinition`.

### Recipe: Modifying Balloon Styles
-   The Balloon uses **Shadow DOM**. Styles are defined in `src/Balloon.ts` using a `<style>` tag.
-   Visual changes to the bubble shape should be made in the SVG path generation logic in `Balloon._updatePath`.

---

## 💡 Tips for AI Agents

-   **Path Normalization**: Files in `public/agents/` often have inconsistent casing. Always use `CharacterParser.normalizePath()` when resolving asset URLs.
-   **Awaiting Requests**: API methods return `AgentRequest` objects which are "thenable". You can `await agent.play(...)` directly.
-   **JSDoc**: The codebase is heavily documented. Use the `read_file` tool on `src/types.ts` to understand the primary data structures.
-   **Architecture**: For a visual overview of how the managers interact, see **[docs/Internal-Architecture.md](./docs/Internal-Architecture.md)**.
-   **Testing**: We use Vitest. Run `npm test` after changes. For visual changes, manual verification via `npm run dev` is recommended.

---

## 🔍 Further Reading
- **[docs/API-Reference.md](./docs/API-Reference.md)**: User-facing API details.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines and environment setup.
