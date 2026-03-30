import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from '../src/core/resources/AudioManager';
import { setupGlobals } from './setup';

describe('AudioManager', () => {
  beforeEach(() => {
    setupGlobals();
  });

  it('should detect MS ADPCM correctly', () => {
    const manager = new AudioManager('http://example.com/agent');

    // Create a mock WAV buffer with MS ADPCM format (audioFormat = 2)
    const buffer = new ArrayBuffer(100);
    const view = new DataView(buffer);
    view.setUint32(0, 0x46464952, true); // 'RIFF'
    view.setUint32(8, 0x45564157, true); // 'WAVE'
    view.setUint32(12, 0x20746d66, true); // 'fmt '
    view.setUint32(16, 16, true); // chunkSize
    view.setUint16(20, 2, true); // audioFormat = 2 (WAVE_FORMAT_ADPCM)

    // Use private method access for testing
    expect((manager as any).isMSADPCM(buffer)).toBe(true);

    // Non-ADPCM (audioFormat = 1)
    view.setUint16(20, 1, true);
    expect((manager as any).isMSADPCM(buffer)).toBe(false);
  });

  it('should load spritesheet when audio atlas is provided', async () => {
    const manager = new AudioManager('http://example.com/agent');
    manager.setAudioAtlas({
      'test.wav': { start: 0, end: 1 }
    });

    const mockBuffer = {};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ArrayBuffer(10))));
    // Mock decodeAudioData to return our mockBuffer
    const ctx = (manager as any).getContext();
    ctx.decodeAudioData = vi.fn().mockResolvedValue(mockBuffer);

    await manager.loadSounds(['test.wav']);

    expect((manager as any).spritesheetBuffer).toBe(mockBuffer);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('agent.webm'), expect.anything());
  });

  it('should play sound from spritesheet if atlas exists', async () => {
    const manager = new AudioManager('http://example.com/agent');
    manager.setAudioAtlas({
      'test.wav': { start: 0, end: 1 }
    });

    const mockBuffer = { duration: 10 };
    const mockSource = {
        connect: vi.fn(),
        start: vi.fn(),
        buffer: null
    };

    const ctx = (manager as any).getContext();
    ctx.createBufferSource = vi.fn().mockReturnValue(mockSource);
    (manager as any).spritesheetBuffer = mockBuffer;

    manager.playFrameSound('test.wav');

    expect(mockSource.start).toHaveBeenCalledWith(0, 0, 1);
    expect(mockSource.buffer).toBe(mockBuffer);
  });

  it('should stop all active sources', () => {
    const manager = new AudioManager('http://example.com/agent');
    const mockSource1 = { stop: vi.fn(), connect: vi.fn(), start: vi.fn() };
    const mockSource2 = { stop: vi.fn(), connect: vi.fn(), start: vi.fn() };

    const ctx = (manager as any).getContext();
    ctx.createBufferSource = vi.fn()
      .mockReturnValueOnce(mockSource1)
      .mockReturnValueOnce(mockSource2);

    (manager as any).soundBuffers.set('sound1.wav', { duration: 1 });
    (manager as any).soundBuffers.set('sound2.wav', { duration: 1 });

    manager.playFrameSound('sound1.wav');
    manager.playFrameSound('sound2.wav');

    manager.stop();

    expect(mockSource1.stop).toHaveBeenCalled();
    expect(mockSource2.stop).toHaveBeenCalled();
    expect((manager as any).activeSources.size).toBe(0);
  });
});
