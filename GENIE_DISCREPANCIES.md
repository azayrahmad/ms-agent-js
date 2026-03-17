# Discrepancies Evaluation: Genie Character vs. Microsoft Documentation

This report compares the `Genie.acd` character definition file and the `CharacterParser` implementation against the [official Microsoft Agent Genie animations documentation](https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent-animations-for-genie-character).

## 1. Missing `ReturnAnimation` Property
The most significant discrepancy is that the `ReturnAnimation` property is **completely absent** from the `Genie.acd` file.
- **Documentation:** Many animations (e.g., `GetAttention`, `LookDown`, `Read`, `Write`) are listed as having a specific Return Animation (e.g., `GetAttentionReturn`, `LookDownReturn`).
- **ACD File:** These animations lack the `ReturnAnimation` field entirely.
- **Impact:** The `CharacterParser` correctly attempts to parse this field, but since it's missing in the source file, the resulting agent definition will not have these transitions defined as named animations.

## 2. TransitionType Mismatches
There are several cases where the `TransitionType` in the `.acd` file contradicts the documentation's "Return Animation" column.

| Animation | Documentation (Return Animation) | ACD TransitionType | ACD Meaning |
|-----------|----------------------------------|---------------------|-------------|
| `Congratulate` | Yes, using Exit branches | 2 | None |
| `Sad` | Yes, using Exit branches | 2 | None |
| `GetAttention` | `GetAttentionReturn` | 2 | None |
| `LookDown` | `LookDownReturn` | 2 | None |
| `Read` | `ReadReturn` | 2 | None |
| `Write` | `WriteReturn` | 2 | None |
| `Hearing_1` | None | 1 | Exit branches |
| `Hearing_2` | None | 1 | Exit branches |
| `Hearing_3` | None | 1 | Exit branches |
| `ReadReturn` | None | 1 | Exit branches |
| `Thinking` | None | 1 | Exit branches |

**Summary:** The `.acd` file often uses `TransitionType = 2` (None) where the docs suggest a transition should occur, and `TransitionType = 1` (Exit) where the docs say "None".

## 3. Speaking Support (Lip-Syncing)
There is a direct contradiction regarding the `DoMagic2` animation.
- **Documentation:** States `DoMagic2` does **not** support speaking.
- **ACD File:** Contains `DefineMouth` blocks for frames in `DoMagic2`, indicating it **does** support lip-syncing.
- **Finding:** The `.acd` file is more capable than the documentation suggests for this specific animation.

## 4. Sound Effects
Most sound effects match the documentation. For example, `Congratulate`, `DoMagic2`, `Hide`, `MoveDown`, `Read`, and `Show` all correctly include `SoundEffect` definitions in the `.acd` file as expected.

## 5. Parser Implementation Issues
While evaluating the parser against the `.acd` file content:
- **Mouth Type Normalization:** The `.acd` file uses types like `OpenWide1`, `OpenMedium`, and `OpenNarrow`.
- **Parser Behavior:** The parser converts these to lowercase (e.g., `openwide1`).
- **Internal Constants:** The library's `MouthType` constants (in `types.ts`) define `WideOpen1` as `"wideopen1"`.
- **Discrepancy:** There is a mismatch between `openwide1` (from ACD) and `wideopen1` (expected by code). The parser lacks a normalization step to map `OpenWide` to `WideOpen`.

## 6. State Assignments
The documentation lists "Assigned to State" for several animations. Most match, but:
- `Acknowledge`, `Announce`, `Confused`, `Congratulate`, etc. are listed as "None" in docs and are indeed not assigned to any state in the `.acd` file.
- `RestPose` is correctly assigned to `Speaking` state in both.
- `Show`/`Hide` are correctly assigned to `Showing`/`Hiding` states.
