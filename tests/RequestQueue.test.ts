import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from '../src/core/behavior/RequestQueue';
import { RequestStatus } from '../src/core/base/types';

describe('RequestQueue', () => {
  it('should execute tasks sequentially', async () => {
    const queue = new RequestQueue();
    const results: number[] = [];

    const task1 = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push(1);
    };
    const task2 = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push(2);
    };

    const req1 = queue.add(task1);
    const req2 = queue.add(task2);

    // Give microtasks a chance to run so req1 starts
    await Promise.resolve();

    expect(req1.status).toBe(RequestStatus.InProgress);
    expect(req2.status).toBe(RequestStatus.Pending);

    await req1;
    expect(req1.status).toBe(RequestStatus.Complete);
    // Give a tiny bit of time for the next task to be picked up if needed,
    // though processNext is called synchronously in finally block.
    expect(req2.status).toBe(RequestStatus.InProgress);

    await req2;
    expect(req2.status).toBe(RequestStatus.Complete);
    expect(results).toEqual([1, 2]);
  });

  it('should handle task failures and continue', async () => {
    const queue = new RequestQueue();
    const results: string[] = [];

    const task1 = async () => {
      throw new Error('fail');
    };
    const task2 = async () => {
      results.push('success');
    };

    const req1 = queue.add(task1);
    const req2 = queue.add(task2);

    await expect(req1).rejects.toThrow('fail');
    expect(req1.status).toBe(RequestStatus.Failed);

    await req2;
    expect(req2.status).toBe(RequestStatus.Complete);
    expect(results).toEqual(['success']);
  });

  it('should support stopping specific requests', async () => {
    const queue = new RequestQueue();
    const results: number[] = [];

    const task1 = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push(1);
    };
    const task2 = async () => {
      results.push(2);
    };

    const req1 = queue.add(task1);
    const req2 = queue.add(task2);

    queue.stop(req2.id);
    expect(req2.status).toBe(RequestStatus.Interrupted);

    await req1;
    // req2 was removed from queue, so it shouldn't run
    expect(results).toEqual([1]);
    expect(queue.isEmpty).toBe(true);
  });

  it('should support stopping all requests', async () => {
    const queue = new RequestQueue();

    queue.add(() => new Promise(resolve => setTimeout(resolve, 50)));
    const req2 = queue.add(async () => {});

    queue.stop();
    expect(req2.status).toBe(RequestStatus.Interrupted);
    expect(queue.length).toBe(0);
  });
});
