/**
 * Represents a Windows-style loading progress window.
 */
export class LoadingWindow {
  private progressWindow: HTMLDivElement;
  private overlay: HTMLDivElement;
  private loadingStatus: HTMLParagraphElement;
  private loadingProgressContainer: HTMLDivElement;
  private loadingProgressBar: HTMLSpanElement;
  private cancelBtn: HTMLButtonElement;

  /**
   * Creates a new loading window.
   *
   * @param name - The name of the item being loaded.
   * @param abortController - The AbortController to signal on cancellation.
   */
  constructor(name: string, abortController: AbortController) {
    this.progressWindow = document.createElement("div");
    this.progressWindow.className = "window loading-window";
    this.progressWindow.style.position = "fixed";
    this.progressWindow.style.left = "50%";
    this.progressWindow.style.top = "50%";
    this.progressWindow.style.transform = "translate(-50%, -50%)";
    this.progressWindow.style.width = "300px";
    this.progressWindow.style.zIndex = "10000";
    this.progressWindow.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text">Loading ${name}...</div>
      </div>
      <div class="window-body">
        <p id="loading-status">Starting download...</p>
        <div id="loading-progress-container" class="progress-indicator">
          <span id="loading-progress-bar" class="progress-indicator-bar" style="width: 0%"></span>
        </div>
        <div class="field-row" style="justify-content: flex-end; margin-top: 10px;">
          <button id="cancel-load-btn">Cancel</button>
        </div>
      </div>
    `;

    this.overlay = document.createElement("div");
    this.overlay.style.position = "fixed";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.width = "100%";
    this.overlay.style.height = "100%";
    this.overlay.style.backgroundColor = "rgba(0,0,0,0.1)";
    this.overlay.style.zIndex = "9999";

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.progressWindow);

    this.loadingStatus = this.progressWindow.querySelector("#loading-status") as HTMLParagraphElement;
    this.loadingProgressContainer = this.progressWindow.querySelector("#loading-progress-container") as HTMLDivElement;
    this.loadingProgressBar = this.progressWindow.querySelector("#loading-progress-bar") as HTMLSpanElement;
    this.cancelBtn = this.progressWindow.querySelector("#cancel-load-btn") as HTMLButtonElement;

    this.cancelBtn.onclick = () => {
      abortController.abort();
    };
  }

  /**
   * Updates the progress indicator.
   *
   * @param progress - The progress info from the fetch event.
   */
  public update(progress: { loaded: number; total: number; filename: string }) {
    this.loadingStatus.textContent = `Downloading ${progress.filename}...`;
    if (progress.total > 0) {
      this.loadingProgressContainer.classList.remove("segmented");
      const percent = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
      this.loadingProgressBar.style.width = `${percent}%`;
    } else {
      this.loadingProgressContainer.classList.add("segmented");
      this.loadingProgressBar.style.width = "100%";
    }
  }

  /**
   * Destroys the loading window and its overlay.
   */
  public destroy() {
    if (this.progressWindow.parentNode) {
      document.body.removeChild(this.progressWindow);
    }
    if (this.overlay.parentNode) {
      document.body.removeChild(this.overlay);
    }
  }
}
