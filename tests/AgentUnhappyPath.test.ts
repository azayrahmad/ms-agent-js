import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { AssetCache } from '../src/core/resources/Cache';
import { setupGlobals } from './setup';

describe('Agent Unhappy Paths', () => {
    beforeEach(() => {
        AssetCache.clearMemory();
        vi.clearAllMocks();
        setupGlobals();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        (globalThis as any).__mockFetchFailAgentJson = false;
    });

    it('should throw error when both agent.json and .acd files fail to load', async () => {
        // Mock fetch to fail for everything
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        }));

        await expect(Agent.load('MissingAgent')).rejects.toThrow();
    });

    it('should throw error when agent.json is malformed', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.endsWith('agent.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.reject(new Error('SyntaxError: Unexpected token')),
                    text: () => Promise.resolve('not json')
                });
            }
            // Fail .acd fallback too
            return Promise.resolve({ ok: false });
        }));

        await expect(Agent.load('MalformedAgent')).rejects.toThrow();
    });

    it('should handle AudioContext being unavailable', async () => {
        // Remove AudioContext from global
        const originalAudioContext = (globalThis as any).AudioContext;
        (globalThis as any).AudioContext = undefined;
        (globalThis as any).webkitAudioContext = undefined;

        const agent = await Agent.load('Clippit');
        expect(agent.audioManager).toBeDefined();

        (globalThis as any).AudioContext = originalAudioContext;
        agent.destroy();
    });

    it('should handle SpeechSynthesis being unavailable', async () => {
        const originalSpeechSynthesis = (globalThis as any).speechSynthesis;
        (globalThis as any).speechSynthesis = undefined;

        const agent = await Agent.load('Clippit');
        expect(agent.balloon.isTTSEnabled()).toBe(false);

        // speak should still work (typing animation only)
        agent.speak('Hello', { useTTS: true });

        (globalThis as any).speechSynthesis = originalSpeechSynthesis;
        agent.destroy();
    });

    it('should handle AbortSignal during load', async () => {
        const controller = new AbortController();
        const loadPromise = Agent.load('Clippit', { signal: controller.signal });

        controller.abort();

        try {
            await loadPromise;
        } catch (e: any) {
            // It might throw AbortError or some other error if caught later
            expect(e).toBeDefined();
        }
    });

    it('should handle network timeout or slow connection gracefully in getDefinition', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
            return new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network timeout')), 10);
            });
        }));

        await expect(Agent.load('SlowAgent')).rejects.toThrow('Network timeout');
    });
});
