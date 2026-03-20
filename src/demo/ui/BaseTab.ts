import { DemoState } from "../state";

/**
 * Abstract base class for UI tab panels in the MS Agent JS Demo.
 * Each tab handles its own DOM queries and UI event listeners.
 */
export abstract class BaseTab {
  /** Reference to the global application state. */
  protected state: DemoState;
  /** The root container element for this tab's content. */
  protected panel: HTMLElement;

  /**
   * Initializes a new tab instance.
   *
   * @param id - The HTML ID of the tab panel element.
   * @param state - The global application state.
   */
  constructor(id: string, state: DemoState) {
    this.state = state;
    const panel = document.getElementById(id);
    if (!panel) {
      throw new Error(`Panel with id '${id}' not found.`);
    }
    this.panel = panel;
  }

  /**
   * Initializes the tab: queries DOM elements and binds event listeners.
   * This should be called after all DOM elements are available in the page.
   */
  public abstract init(): void;

  /**
   * Optional lifecycle hook called when the tab becomes active.
   */
  public onShow(): void {}

  /**
   * Optional lifecycle hook called when the tab is switched away from.
   */
  public onHide(): void {}
}
