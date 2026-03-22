import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from '../src/core/behavior/RequestQueue';
import { RequestStatus } from '../src/core/base/types';

describe('RequestQueue Stability', () => {
    it('should handle high-frequency additions and cancellations', async () => {
        const queue = new RequestQueue();
        const executionLog: number[] = [];

        const promises = [];
        for (let i = 0; i < 100; i++) {
            const id = i;
            const req = queue.add(async () => {
                executionLog.push(id);
                await new Promise(resolve => setTimeout(resolve, 2));
            });
            promises.push(req);

            // Cancel every 3rd request immediately
            if (i % 3 === 0) {
                queue.stop(req.id);
            }
        }

        await Promise.allSettled(promises);

        // Should have no active or pending requests
        expect(queue.isEmpty).toBe(true);
        expect(queue.activeRequestId).toBeNull();

        // Cancelled requests should not be in execution log
        executionLog.forEach(id => {
            expect(id % 3).not.toBe(0);
        });
    });

    it('should maintain order during concurrent stop and add operations', async () => {
        const queue = new RequestQueue();
        const results: string[] = [];

        const req1 = queue.add(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            results.push('1');
        });

        const req2 = queue.add(async () => {
            results.push('2');
        });

        // While req1 is in progress, stop it and add a new one
        queue.stop(req1.id);
        const req3 = queue.add(async () => {
            results.push('3');
        });

        await Promise.allSettled([req1, req2, req3]);

        // req1 was stopped, so it shouldn't have pushed '1'
        // req2 should run after req1 finishes/is stopped
        // req3 should run after req2
        expect(results).toEqual(['2', '3']);
    });
});
