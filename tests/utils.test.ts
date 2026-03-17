import { describe, it, expect, vi } from 'vitest';
import { fetchWithProgress } from '../src/utils';

describe('fetchWithProgress', () => {
  it('should fetch successfully without onProgress', async () => {
    const mockResponse = new Response('test content');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const response = await fetchWithProgress('http://example.com/test.txt');
    const text = await response.text();

    expect(text).toBe('test content');
    expect(fetch).toHaveBeenCalledWith('http://example.com/test.txt', { signal: undefined });
  });

  it('should report progress when onProgress is provided', async () => {
    const content = 'hello world';
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(content);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array);
        controller.close();
      }
    });

    const mockResponse = new Response(stream, {
      headers: { 'content-length': uint8Array.byteLength.toString() }
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const onProgress = vi.fn();
    const response = await fetchWithProgress('http://example.com/test.txt', { onProgress });

    const resultText = await response.text();
    expect(resultText).toBe(content);
    expect(onProgress).toHaveBeenCalledWith({
      loaded: uint8Array.byteLength,
      total: uint8Array.byteLength,
      filename: 'test.txt'
    });
  });

  it('should handle missing content-length', async () => {
    const content = 'hello world';
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(content);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array);
        controller.close();
      }
    });

    const mockResponse = new Response(stream); // No content-length

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const onProgress = vi.fn();
    const response = await fetchWithProgress('http://example.com/test.txt', { onProgress });

    await response.text();
    expect(onProgress).toHaveBeenCalledWith({
      loaded: uint8Array.byteLength,
      total: 0,
      filename: 'test.txt'
    });
  });

  it('should handle fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    await expect(fetchWithProgress('http://example.com/test.txt')).rejects.toThrow('Network error');
  });

  it('should handle stream read errors', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error('Stream error'));
      }
    });

    const mockResponse = new Response(stream, {
        headers: { 'content-length': '10' }
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const onProgress = vi.fn();
    const response = await fetchWithProgress('http://example.com/test.txt', { onProgress });

    await expect(response.text()).rejects.toThrow('Stream error');
  });

  it('should handle stream cancellation', async () => {
    const cancelSpy = vi.fn();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
        },
        cancel: cancelSpy
    });

    const mockResponse = new Response(stream, {
        headers: { 'content-length': '3' }
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const onProgress = vi.fn();
    const response = await fetchWithProgress('http://example.com/test.txt', { onProgress });

    await response.body?.cancel('reason');
    expect(cancelSpy).toHaveBeenCalledWith('reason');
  });

  it('should return original response if not ok', async () => {
    const mockResponse = new Response('Not Found', { status: 404 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const response = await fetchWithProgress('http://example.com/404');
    expect(response.status).toBe(404);
  });

  it('should respect AbortSignal', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, options) => {
        if (options.signal) {
            return new Promise((_, reject) => {
                options.signal.addEventListener('abort', () => {
                    reject(new Error('AbortError'));
                });
            });
        }
        return Promise.resolve(new Response('ok'));
    }));

    const promise = fetchWithProgress('http://example.com/test.txt', { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow('AbortError');
  });
});
