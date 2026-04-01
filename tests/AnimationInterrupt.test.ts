import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation } from '../src/core/base/types';

describe('AnimationManager Interruption Regression', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  beforeEach(() => {
    spriteManager = {
      drawFrame: vi.fn(),
      loadSprite: vi.fn().mockResolvedValue(undefined)
    };
    audioManager = {
      playFrameSound: vi.fn(),
      loadSounds: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should not get stuck in an infinite loop when interrupting a transitionType 1 animation with a terminal 0-duration frame', async () => {
    const mockAnimations: Record<string, Animation> = {
      'DoMagic2': {
        name: 'DoMagic2',
        transitionType: 1,
        frames: []
      }
    };

    // Mocking Genie's DoMagic2 structure
    for (let i = 0; i < 21; i++) {
        mockAnimations['DoMagic2'].frames.push({ duration: 10, images: [] });
    }
    // index 20 (Frame 21) has exitBranch 14 (index 13)
    mockAnimations['DoMagic2'].frames[20].exitBranch = 14;
    // index 21 (Frame 22) is terminal 0-duration
    mockAnimations['DoMagic2'].frames.push({ duration: 0, images: [] });

    animationManager = new AnimationManager(spriteManager, audioManager, mockAnimations);

    const promise = animationManager.playAnimation('DoMagic2', false, true); // looped

    // Advance to the terminal frame
    let now = performance.now();
    for (let i = 0; i < 50; i++) { // Plenty of updates
        now += 200;
        animationManager.update(now);
    }

    // Now we should be at index 21 (terminal frame) because it's transitionType 1 and it pauses there
    expect(animationManager.currentFrameIndexValue).toBe(21);
    expect(animationManager.isAnimating).toBe(true);

    // Interrupt/Stop
    animationManager.isExitingFlag = true;

    // Update should move us...
    // In the buggy version, it sees duration 0, no exitBranch, falls back to lastRenderedFrame (index 20)
    // index 20 has exitBranch 14. So it jumps to index 13.
    now += 200;
    animationManager.update(now);

    console.log("Current frame index after interrupt update:", animationManager.currentFrameIndexValue);

    // Try to drive it to completion
    for (let i = 0; i < 200; i++) {
        now += 200;
        animationManager.update(now);
        if (!animationManager.isAnimating) break;
    }

    expect(animationManager.isAnimating).toBe(false);
    await expect(promise).resolves.toBe(true);
  });
});
