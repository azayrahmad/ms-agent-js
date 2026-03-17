import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation } from '../src/core/base/types';

describe('Audio Doubling Reproduction', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  const mockAnimations: Record<string, Animation> = {
    'sound-test': {
      name: 'sound-test',
      transitionType: 0,
      frames: [
        { duration: 10, images: [], soundEffect: 'test.wav' }, // Frame 0
        { duration: 10, images: [] },                         // Frame 1
        { duration: 10, images: [] }                          // Frame 2
      ]
    }
  };

  beforeEach(() => {
    spriteManager = {
      drawFrame: vi.fn(),
      loadSprite: vi.fn().mockResolvedValue(undefined)
    };
    audioManager = {
      playFrameSound: vi.fn().mockResolvedValue(undefined),
      loadSounds: vi.fn().mockResolvedValue(undefined)
    };
    animationManager = new AnimationManager(spriteManager, audioManager, mockAnimations);
  });

  it('should play sound exactly once for a frame', () => {
    const anim: Animation = {
      name: 'doubling-test',
      transitionType: 0,
      frames: [
        { duration: 10, images: [] },                         // Frame 0
        { duration: 10, images: [], soundEffect: 'frame1.wav' }, // Frame 1
        { duration: 10, images: [] }                          // Frame 2
      ]
    };
    (animationManager as any).animations['doubling-test'] = anim;

    // Start animation
    const now = performance.now();
    animationManager.setAnimation('doubling-test');

    // Frame 0 has no sound, so nothing should have played yet
    expect(audioManager.playFrameSound).not.toHaveBeenCalled();

    // Advance to frame 1
    animationManager.update(now + 150);

    // Now we are on Frame 1. It should have played frame1.wav ONCE (on enter)
    expect(audioManager.playFrameSound).toHaveBeenCalledTimes(1);
    expect(audioManager.playFrameSound).toHaveBeenCalledWith('frame1.wav');

    // Advance to frame 2
    animationManager.update(now + 300);

    // Now we are on Frame 2. frame1.wav should NOT have been played again
    // But according to my analysis of the code, it will be played again when leaving Frame 1
    expect(audioManager.playFrameSound).toHaveBeenCalledTimes(1);
  });

  it('should play the first frame sound immediately if it has one', () => {
    const anim: Animation = {
        name: 'first-frame-sound',
        transitionType: 0,
        frames: [
          { duration: 10, images: [], soundEffect: 'frame0.wav' },
          { duration: 10, images: [] }
        ]
      };
      (animationManager as any).animations['first-frame-sound'] = anim;

      animationManager.setAnimation('first-frame-sound');

      // It should play frame0.wav immediately
      expect(audioManager.playFrameSound).toHaveBeenCalledWith('frame0.wav');
  });

  it('should not play the same sound multiple times if requested while loading', async () => {
    const { AudioManager } = await import('../src/core/resources/AudioManager');
    const audioManager = new AudioManager('base');

    // Mock fetch to delay
    let resolveFetch: (v: any) => void;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    // Mock window and AudioContext
    const mockBuffer = { duration: 10 };
    const mockCtx = {
        createBufferSource: vi.fn().mockReturnValue({
            connect: vi.fn(),
            start: vi.fn(),
            buffer: null
        }),
        createBuffer: vi.fn().mockReturnValue({
            getChannelData: vi.fn().mockReturnValue(new Float32Array(100))
        }),
        decodeAudioData: vi.fn().mockResolvedValue(mockBuffer),
        destination: {},
        state: 'running',
        resume: vi.fn()
    };
    global.window = {
        AudioContext: function() { return mockCtx; }
    } as any;

    // Request same sound twice
    audioManager.playFrameSound('test.wav');
    audioManager.playFrameSound('test.wav');

    // Resolve fetch
    resolveFetch({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
    });

    // Wait for promises
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    // After loading, it should only have played ONCE.
    // Currently, it will play TWICE because playFrameSound(soundNameRaw) is called in the .then()
    // for every original call to playFrameSound.
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
  });
});
