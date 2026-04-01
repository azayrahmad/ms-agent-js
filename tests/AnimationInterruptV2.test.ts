import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation } from '../src/core/base/types';

describe('AnimationManager Interruption Regression V2', () => {
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

  it('should play the full exit animation and not get stuck', async () => {
    const mockAnimations: Record<string, Animation> = {
      'DoMagic2': {
        name: 'DoMagic2',
        transitionType: 1,
        frames: []
      }
    };

    // Frames 1-13 (0-12)
    for (let i = 0; i < 13; i++) {
        mockAnimations['DoMagic2'].frames.push({ duration: 10, images: [] });
    }
    // Frame 14 (index 13) - start of exit sequence in Genie
    mockAnimations['DoMagic2'].frames.push({ duration: 10, images: [{ filename: 'exit-start.bmp' }] });
    // Frames 15-20 (14-19)
    for (let i = 0; i < 6; i++) {
        mockAnimations['DoMagic2'].frames.push({ duration: 10, images: [] });
    }
    // Frame 21 (index 20) - has exitBranch: 14 (index 13)
    mockAnimations['DoMagic2'].frames.push({ duration: 10, images: [], exitBranch: 14 });
    // Frame 22 (index 21) - terminal 0-duration
    mockAnimations['DoMagic2'].frames.push({ duration: 0, images: [] });

    animationManager = new AnimationManager(spriteManager, audioManager, mockAnimations);

    const promise = animationManager.playAnimation('DoMagic2', false, true); // looped

    let now = performance.now();
    // Advance to the terminal frame
    for (let i = 0; i < 50; i++) {
        now += 200;
        animationManager.update(now);
    }

    expect(animationManager.currentFrameIndexValue).toBe(21);

    // Interrupt/Stop
    animationManager.isExitingFlag = true;

    // Next update should move to index 13 (the exit animation)
    now += 200;
    animationManager.update(now);

    console.log("Current frame index after interrupt update:", animationManager.currentFrameIndexValue);
    // With current (buggy for different reason) fix, it jumps to 0.
    // We WANT it to go to 13.
    expect(animationManager.currentFrameIndexValue).toBe(13);

    // Now drive it through the exit animation (13 -> 14 -> ... -> 20)
    for (let i = 0; i < 7; i++) {
        now += 200;
        animationManager.update(now);
        console.log(`Update ${i}: index ${animationManager.currentFrameIndexValue}`);
    }

    // After index 20, if exiting, it should NOT go back to 13 (its exitBranch),
    // but should recognize it's repeating and complete.

    // Drive it more
    for (let i = 0; i < 10; i++) {
        now += 200;
        animationManager.update(now);
        if (!animationManager.isAnimating) break;
    }

    expect(animationManager.isAnimating).toBe(false);
    await expect(promise).resolves.toBe(true);
  });
});
