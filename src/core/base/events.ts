import type { AgentRequest } from "./types";

/**
 * Valid event types emitted by the Agent and AgentCore.
 */
export type AgentEvents =
  | "click"
  | "animationStart"
  | "animationEnd"
  | "stateChange"
  | "show"
  | "hide"
  | "dragstart"
  | "drag"
  | "dragend"
  | "contextmenu"
  | "requestStart"
  | "requestComplete"
  | "frameChanged"
  | "speak"
  | "reposition";

/**
 * Map of event names to their expected payload types.
 */
export interface AgentEventPayloads {
  /** Emitted when the agent canvas is clicked (and was not dragged). */
  click: undefined;
  /** Emitted when an animation sequence starts playing. */
  animationStart: string;
  /** Emitted when an animation sequence completes. */
  animationEnd: string;
  /** Emitted when the high-level behavioral state changes. [newState, oldState] */
  stateChange: [string, string];
  /** Emitted when the agent becomes visible. */
  show: undefined;
  /** Emitted when the agent becomes hidden. */
  hide: undefined;
  /** Emitted when a drag operation begins. */
  dragstart: undefined;
  /** Emitted during a drag operation with the new screen coordinates. */
  drag: { x: number; y: number };
  /** Emitted when a drag operation ends. */
  dragend: undefined;
  /** Emitted when a right-click or long-press occurs on the agent. */
  contextmenu: { x: number; y: number; originalEvent: MouseEvent | PointerEvent };
  /** Emitted when a new request begins processing in the queue. */
  requestStart: AgentRequest;
  /** Emitted when a request in the queue completes. */
  requestComplete: AgentRequest;
  /** Emitted every time an animation frame changes on the canvas. */
  frameChanged: undefined;
  /** Emitted during speech when a word or character boundary is reached. */
  speak: { word: string; charIndex: number; rate: number };
  /** Emitted when the agent is automatically repositioned to stay within the viewport. */
  reposition: { x: number; y: number };
}
