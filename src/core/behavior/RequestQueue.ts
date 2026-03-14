import { type AgentRequest, RequestStatus } from "../base/types";

type RequestTask = (request: AgentRequest) => Promise<void>;

interface QueueEntry {
  request: InternalAgentRequest;
  task: RequestTask;
}

class InternalAgentRequest implements AgentRequest {
  public readonly id: number;
  public status: RequestStatus;
  public readonly promise: Promise<void>;
  private resolveFn: () => void = () => {};
  private rejectFn: (reason?: any) => void = () => {};

  constructor(id: number) {
    this.id = id;
    this.status = RequestStatus.Pending;
    let res: (() => void) | undefined;
    let rej: ((err: any) => void) | undefined;
    this.promise = new Promise<void>((resolve, reject) => {
      res = resolve;
      rej = reject;
    });
    if (!res || !rej) {
      throw new Error("Promise executor did not run synchronously");
    }
    this.resolveFn = res;
    this.rejectFn = rej;
  }

  /**
   * Implementation of PromiseLike, allowing the request to be awaited directly.
   */
  public then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  public resolve() {
    this.status = RequestStatus.Complete;
    this.resolveFn();
  }

  public reject(err: any) {
    this.status = RequestStatus.Failed;
    this.rejectFn(err);
  }

  public get isCancelled(): boolean {
    return (
      this.status === RequestStatus.Interrupted ||
      this.status === RequestStatus.Failed
    );
  }

  public interrupt() {
    this.status = RequestStatus.Interrupted;
    this.resolveFn();
  }
}

export class RequestQueue {
  private queue: QueueEntry[] = [];
  private currentEntry: QueueEntry | null = null;
  private nextId: number = 1;

  /**
   * Adds a new task to the queue and returns a request object to track it.
   */
  public add(task: RequestTask): AgentRequest {
    const request = new InternalAgentRequest(this.nextId++);
    const entry: QueueEntry = { request, task };

    this.queue.push(entry);
    this.processNext();

    return request;
  }

  private async processNext() {
    if (this.currentEntry || this.queue.length === 0) return;

    this.currentEntry = this.queue.shift()!;
    const request = this.currentEntry.request;
    request.status = RequestStatus.InProgress;

    try {
      await this.currentEntry.task(request);
      if (request.status === RequestStatus.InProgress) {
        request.resolve();
      }
    } catch (err) {
      this.currentEntry.request.reject(err);
    } finally {
      this.currentEntry = null;
      this.processNext();
    }
  }

  /**
   * Stops the specified request or all requests if no ID is provided.
   */
  public stop(requestId?: number) {
    if (requestId === undefined) {
      // Stop everything
      if (this.currentEntry) {
        this.currentEntry.request.interrupt();
      }
      this.queue.forEach((entry) => entry.request.interrupt());
      this.queue = [];
    } else {
      // Stop specific request
      if (this.currentEntry?.request.id === requestId) {
        this.currentEntry.request.interrupt();
      } else {
        const index = this.queue.findIndex((e) => e.request.id === requestId);
        if (index !== -1) {
          const [entry] = this.queue.splice(index, 1);
          entry.request.interrupt();
        }
      }
    }
  }

  /**
   * Returns whether the queue is currently empty and no task is running.
   */
  public get isEmpty(): boolean {
    return this.queue.length === 0 && this.currentEntry === null;
  }

  /**
   * Returns the number of requests currently in the queue (excluding the active one).
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * Returns the ID of the currently active request, or null if none.
   */
  public get activeRequestId(): number | null {
    return this.currentEntry?.request.id ?? null;
  }
}
