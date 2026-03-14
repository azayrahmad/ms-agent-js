/**
 * MSAgentJS: A modern, TypeScript-based implementation of Microsoft Agent.
 * Bringing the charm of 90s digital assistants to the web with Shadow DOM,
 * Promise-based APIs, and procedural SVG balloons.
 *
 * @module
 */

export { CharacterParser } from './core/resources/CharacterParser';
export { SpriteManager } from './core/resources/SpriteManager';
export { AnimationManager } from './core/behavior/AnimationManager';
export { AudioManager } from './core/resources/AudioManager';
export { StateManager } from './core/behavior/StateManager';
export { RequestQueue } from './core/behavior/RequestQueue';
export { Agent } from './Agent';
export { AgentCore } from './core/Core';
export { AgentRenderer } from './ui/Renderer';
export { Balloon } from './ui/Balloon';
export * from './core/base/types';
export * from './core/base/events';
