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

-   **Awaiting Requests**: API methods return `AgentRequest` objects which are "thenable". You can `await agent.play(...)` directly.
-   **JSDoc**: The codebase is heavily documented. Use the `read_file` tool on `src/types.ts` to understand the primary data structures.
-   **Architecture**: For a visual overview of how the managers interact, see **[docs/internals.md](./docs/internals.md)**.
-   **Testing**: We use Vitest. Run `npm test` after changes. For visual changes, manual verification via `npm run dev` is recommended.

---

## 🔍 Further Reading
- **[docs/api-reference.md](./docs/api-reference.md)**: User-facing API details.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines and environment setup.

---

## 🛡️ AI Agent Standards & Quality Control

As an AI agent (like Jules), you **MUST** adhere to the following standards to ensure high-quality contributions:

### 1. Commit & Process Standards
- **Conventional Commits**: Use the format `type(scope): description`.
    - **Allowed Scopes**: `core`, `ui`, `balloon`, `audio`, `sprite`, `anim`, `state`, `parser`, `demo`, `docs`, `scripts`, `deps`.
    - **Examples**: `feat(balloon): add support for RTL text`, `fix(demo): resolve layout shift on mobile`.
- **Pre-Commit Verification**: Always run `npm run test:coverage`, `npx playwright test`, and `npm run build` before submitting. Verify the build by running `npm run preview` and checking the output.
- **Documentation Index**: Before finishing any task, evaluate all relevant documentation files and update them to reflect your changes.

| File | Summary |
| --- | --- |
| `README.md` | Main project overview, features, and quick links. |
| `CONTRIBUTING.md` | Development setup, testing strategy, and coding standards. |
| `docs/api-reference.md` | Detailed reference for `Agent` methods, properties, and events. |
| `docs/assets.md` | Guide on character formats, optimization, and asset loading. |
| `docs/getting-started.md` | Installation (npm/CDN) and basic implementation examples. |
| `docs/internals.md` | Deep dive into managers, rendering loops, and logic flows. |
| `docs/request-system.md` | Technical details of the sequential `AgentRequest` queue. |

### 2. Code Quality Standards
- **Complete JSDoc**: Follow the standard in `src/Agent.ts`. Every public method and property MUST have JSDoc including `@param`, `@returns`, and a clear description.
- **Strict TypeScript**: Avoid `any`. Use interfaces and types defined in `src/core/base/types.ts`.
- **Shadow DOM Isolation**: All UI components (like `Balloon.ts`) must use Shadow DOM to prevent style leakage.
- **Resource Cleanup**: If you introduce timers, listeners, or DOM elements, ensure they are properly disposed of in the `Agent.destroy()` method.

### 3. Project-Specific Rules
- **Meta-Adherence**: Always read this `AGENTS.md` at the start of every task and consult your "Memory" context for historical patterns.
- **Test Coverage**: Maintain or improve the project's line coverage (~87.6%). New features MUST have corresponding tests in `tests/`.
- **Asset Integrity**: Ensure character loading logic remains compatible with both legacy `.acd` and optimized `.json` formats.
- **No Magic Strings**: Avoid hardcoding animation names or states; use constants or values from character definitions.
- **Mobile First**: Implement fallbacks for mobile-specific limitations (e.g., TTS word tracking in `Balloon.ts`).
