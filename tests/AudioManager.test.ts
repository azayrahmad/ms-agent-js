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

  it('playFrameSound should warn if sound is not in atlas', () => {
    const manager = new AudioManager('http://example.com/agent');
    manager.setAudioAtlas({});
    (manager as any).spritesheetBuffer = {};
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager.playFrameSound('missing.wav');
    expect(warnSpy).toHaveBeenCalledWith('Sound missing.wav not found in audio atlas');
  });

  it('playFromSpritesheet should resume context if suspended', () => {
    const manager = new AudioManager('http://example.com/agent');
    const mockBuffer = { duration: 10 };
    (manager as any).spritesheetBuffer = mockBuffer;

    const resumeSpy = vi.fn();
    const mockSource = { connect: vi.fn(), start: vi.fn() };
    const ctx = (manager as any).getContext();
    Object.defineProperty(ctx, 'state', { value: 'suspended' });
    ctx.resume = resumeSpy;
    ctx.createBufferSource = vi.fn().mockReturnValue(mockSource);

    (manager as any).playFromSpritesheet(0, 1);
    expect(resumeSpy).toHaveBeenCalled();
  });

  it('playFrameSound should attempt to load sound if not cached', async () => {
    const manager = new AudioManager('http://example.com/agent');
    const loadSpy = vi.spyOn(manager, 'loadSounds').mockResolvedValue(undefined);

    manager.playFrameSound('new_sound.wav');

    expect(loadSpy).toHaveBeenCalledWith(['new_sound.wav']);
  });

  it('isMSADPCM should return false if fmt chunk is not found', () => {
    const manager = new AudioManager('http://example.com/agent');
    const buffer = new ArrayBuffer(100);
    const view = new DataView(buffer);
    view.setUint32(0, 0x46464952, true); // 'RIFF'
    view.setUint32(8, 0x45564157, true); // 'WAVE'
    // No 'fmt ' chunk

    expect((manager as any).isMSADPCM(buffer)).toBe(false);
  });
});
