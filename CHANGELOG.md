# Changelog

## [0.5.0](https://github.com/azayrahmad/ms-agent-js/compare/v0.4.1...v0.5.0) (2026-03-21)


### Features

* add bulleted choice lists to Agent.ask and update demo layout ([2bcabe0](https://github.com/azayrahmad/ms-agent-js/commit/2bcabe04955a24226e8f5fe45f7e768164e5bfc8))
* add interactive guided tour to the demo dashboard ([70f1278](https://github.com/azayrahmad/ms-agent-js/commit/70f1278d27dab559015f72ad5b74a5cdf63f45a9))
* **balloon:** implement flex layout for balloon and enhance button UI with interactive bullets ([2365ef9](https://github.com/azayrahmad/ms-agent-js/commit/2365ef94b03fa2316c25185590c675a3188e61ea))
* **demo:** add interactive guided tour to the demo with refined positioning ([70f1278](https://github.com/azayrahmad/ms-agent-js/commit/70f1278d27dab559015f72ad5b74a5cdf63f45a9))
* **demo:** extract gallery metadata from agent definition ([64924d8](https://github.com/azayrahmad/ms-agent-js/commit/64924d8a1bd4032e269f6f113795a02c24e6f1b5))
* **demo:** implement guided tour and welcome dialog ([70f1278](https://github.com/azayrahmad/ms-agent-js/commit/70f1278d27dab559015f72ad5b74a5cdf63f45a9))
* final implementation of interactive choice lists in Agent.ask ([a740ac3](https://github.com/azayrahmad/ms-agent-js/commit/a740ac33edde3cab49171c48d00f52191f76565e))
* implement asset caching for agent definitions, sprites, and audio ([d887a71](https://github.com/azayrahmad/ms-agent-js/commit/d887a71587e89a906ac155cd0286eca3eeb56b79))
* implement in-memory asset caching for agent definitions, sprites, and audio ([af5cb68](https://github.com/azayrahmad/ms-agent-js/commit/af5cb68961741832c79c7c2b85ae2e2d738bfaf6))
* refactor Agent.ask with custom buttons and structured results ([a003911](https://github.com/azayrahmad/ms-agent-js/commit/a003911a7511bf4b07591de894b2bdadba908e5d))
* remove uuid dependency to make the library truly dependency-free ([b68099d](https://github.com/azayrahmad/ms-agent-js/commit/b68099d52e8d2448d148dd7e8a574242fee08f85))
* support custom looping animation in speak/ask and demo ([296dcb6](https://github.com/azayrahmad/ms-agent-js/commit/296dcb6f52babbd7c866904c9047e2b805d8e09f))


### Bug Fixes

* **Agent:** refactor definition loading and add JSDoc ([8f371a3](https://github.com/azayrahmad/ms-agent-js/commit/8f371a3dc15894d79203682e7e46484ab3819349))
* **balloon:** resolve checkbox interaction and positioning issues ([d805b33](https://github.com/azayrahmad/ms-agent-js/commit/d805b33aaab2f40a4504d3ba05c8a68857c06e49))
* dismiss loading progress bar before showing welcome balloon ([6d0accc](https://github.com/azayrahmad/ms-agent-js/commit/6d0accca49bf590cc23bb4e0343cca513d9f0eb4))
* implement TTS fallback timer for Chrome Mobile ([2ff49db](https://github.com/azayrahmad/ms-agent-js/commit/2ff49dbd6f3081b1b68a7fa7eec925c5761619c9))
* include trailing punctuation in speech balloon TTS sync ([4758f10](https://github.com/azayrahmad/ms-agent-js/commit/4758f104ca2b8d3eb8dda5a3c71a163879c4eeb0))

## [0.4.1](https://github.com/azayrahmad/ms-agent-js/compare/v0.4.0...v0.4.1) (2026-03-16)


### Bug Fixes

* **demo:** update about tab ([058f40f](https://github.com/azayrahmad/ms-agent-js/commit/058f40f04f67cea0d543d1bc104716bddb5a2697))

## [0.4.0](https://github.com/azayrahmad/ms-agent-js/compare/v0.3.0...v0.4.0) (2026-03-16)


### Features

* accurate balloon text synchronization with TTS ([8621dcd](https://github.com/azayrahmad/ms-agent-js/commit/8621dcd8d756abb66515d44fe58098ef4114df83))
* add automatic agent repositioning on viewport resize ([4865336](https://github.com/azayrahmad/ms-agent-js/commit/4865336411f035945ad717009042bddfb81b031c))
* add open graph and social preview images ([e3f73c7](https://github.com/azayrahmad/ms-agent-js/commit/e3f73c76b13cd419a8a7c5daa6447eb9ded1dd02))
* add speech customization controls to demo Speech tab ([7778a8d](https://github.com/azayrahmad/ms-agent-js/commit/7778a8dd30a5f5daf30c4288a4234a9455ed25af))
* add vitest coverage configuration and reporting ([9f9fba4](https://github.com/azayrahmad/ms-agent-js/commit/9f9fba4204bfee4a4ebad8e900c31195f22c34ef))
* **demo:** improve control panel UI and initialization flow ([0b19b54](https://github.com/azayrahmad/ms-agent-js/commit/0b19b54de809f82bfd8bad6012b25649652cb728))
* **demo:** rearrange into tabbed interface and add about tab ([474d801](https://github.com/azayrahmad/ms-agent-js/commit/474d8012f4ad010c26aad13e15b3d7b924ea08d4))
* improve discoverability and SEO ([e4ae02d](https://github.com/azayrahmad/ms-agent-js/commit/e4ae02d24c09e8be4c5ea946a0868ddf6f58fe44))
* include built library as ZIP asset in GitHub releases ([9aceac7](https://github.com/azayrahmad/ms-agent-js/commit/9aceac7555cb27b0ffeaf8b20a5ae2cab4247ab4))
* rearrange demo UI with behavior tab and agent gallery ([7c54a03](https://github.com/azayrahmad/ms-agent-js/commit/7c54a03315efd850d7f6a99e172c571645e1d977))
* update demo gallery with authentic agent descriptions and randomized quotes ([247823f](https://github.com/azayrahmad/ms-agent-js/commit/247823f6f0c67a21eb87360393039575bd56dae1))


### Bug Fixes

* align checkbox tick correctly ([d5ced98](https://github.com/azayrahmad/ms-agent-js/commit/d5ced98f1d60e1561399c15071e69a1a42a11be9))
* correct checkbox tick alignment in demo ([eb13184](https://github.com/azayrahmad/ms-agent-js/commit/eb13184af3d23e42f8ed349a557bae12220ae54d))
* **demo:** improve ui ([b94ad7d](https://github.com/azayrahmad/ms-agent-js/commit/b94ad7d3e0b69a0ce4f09d4a36e5eebc16b4d163))
* **npm:** update preview script to build and serve the app correctly ([d8664dd](https://github.com/azayrahmad/ms-agent-js/commit/d8664dd015fe2c01c7831b72977b3bdddcaa5595))
* prevent loading progress bar from overextending in production ([6d5ad83](https://github.com/azayrahmad/ms-agent-js/commit/6d5ad83c45b34e97af246b23ad6b041bdfc12d21))

## [0.3.0](https://github.com/azayrahmad/ms-agent-js/compare/v0.2.0...v0.3.0) (2026-03-14)


### Features

* add custom show/hide animations ([e110c1c](https://github.com/azayrahmad/ms-agent-js/commit/e110c1cc270fbfd8366ed0a77b95f7711f9b55c6))
* enable cancellable agent load progress bar ([df2f853](https://github.com/azayrahmad/ms-agent-js/commit/df2f853cdf97b588281b03ade0deb1ce86ea633a))

## [0.2.0](https://github.com/azayrahmad/ms-agent-js/compare/v0.1.0...v0.2.0) (2026-03-13)


### Features

* enable touch dragging and right-click context menu event ([bc2f698](https://github.com/azayrahmad/ms-agent-js/commit/bc2f69896644aaea961c83804b64af69257571df))

## 0.1.0 (2026-03-13)


### Features

* add animation fallback for moveTo with perspective swap ([ea6c93d](https://github.com/azayrahmad/ms-agent-js/commit/ea6c93d9b7a6a986e30d5b62cc3f35e8ebaa7566))
* add clippy.js convenience methods for easier migration ([443ad9f](https://github.com/azayrahmad/ms-agent-js/commit/443ad9f9b75c2d01ac7cb039a11e6cc47aa16487))
* add indefinite animation looping and "Play looped" control ([8b08f4e](https://github.com/azayrahmad/ms-agent-js/commit/8b08f4e297a2035681df932a64960440554d8be0))
* implement forced animation looping and exit branch avoidance ([b520552](https://github.com/azayrahmad/ms-agent-js/commit/b520552ae59e6809da0b91a98ec918ef99e0f752))
* initial commit ([669e0c4](https://github.com/azayrahmad/ms-agent-js/commit/669e0c4a80a6cf4596adfafd72214a5dd05b28d5))
* setup deployment to GitHub Pages and npm with Release Please ([796865c](https://github.com/azayrahmad/ms-agent-js/commit/796865c97da9ae48d4f1b57e56d088d282f0c045))
* setup deployment to GitHub Pages and npm with Release Please ([263fe80](https://github.com/azayrahmad/ms-agent-js/commit/263fe80a87af4b7d8531598b72240adb48782873))
* setup deployment to GitHub Pages and npm with Release Please ([336b0fa](https://github.com/azayrahmad/ms-agent-js/commit/336b0fa62314eabb8cc77b8c3d9d8aa4ab2d19aa))


### Bug Fixes

* animation cutoff before completed ([74bdca2](https://github.com/azayrahmad/ms-agent-js/commit/74bdca2856dbd57db4b5257cee7a89e0672695b4))
* prevent audio doubling in animations and loading ([690ee1a](https://github.com/azayrahmad/ms-agent-js/commit/690ee1ac7d5bc8d6185764cdf178d786d7199535))
* resolve TS18047 'currentAgent' possibly 'null' in main.ts ([029e073](https://github.com/azayrahmad/ms-agent-js/commit/029e0737c5e3bb06b9c4bf47771dc0a8cce78fcc))
* unblock idle tick progression and ensure unpausing on init ([d673d10](https://github.com/azayrahmad/ms-agent-js/commit/d673d100c298cc5200856e50ba72ba732c58a4e1))


### Miscellaneous Chores

* first release version bump ([75ecef4](https://github.com/azayrahmad/ms-agent-js/commit/75ecef4d349aa459815250f2613320d8b769464f))
