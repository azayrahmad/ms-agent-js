/**
 * Type definition for a generic event listener callback.
 */
export type Listener = (...args: any[]) => void;

/**
 * A generic base class for handling event registration and dispatching.
 * It provides a decoupled way for different components to communicate.
 *
 * @template Events - A union of string literals representing the valid event names.
 */
export class EventEmitter<Events extends string> {
  private listeners: Map<Events, Set<Listener>> = new Map();

  /**
   * Registers a listener callback for a specific event.
   *
   * @param event - The name of the event to listen for.
   * @param listener - The callback function to execute when the event is emitted.
   */
  public on(event: Events, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Unregisters a previously registered listener for a specific event.
   *
   * @param event - The name of the event.
   * @param listener - The callback function to remove.
   */
  public off(event: Events, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Triggers an event, calling all registered listeners with the provided arguments.
   *
   * @param event - The name of the event to emit.
   * @param args - Arguments to pass to the listener callbacks.
   */
  public emit(event: Events, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  /**
   * Removes all registered listeners for all events.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
