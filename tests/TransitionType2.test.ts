import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation } from '../src/core/base/types';

describe('AnimationManager - TransitionType 2', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  const mockAnimations: Record<string, Animation> = {
    'GetAttention': {
      name: 'GetAttention',
      transitionType: 2,
      frames: [
        { duration: 10, images: [], exitBranch: 2 }, // Frame 1
        { duration: 10, images: [] }  // Frame 2
      ]
    },
    'GetAttentionContinued': {
      name: 'GetAttentionContinued',
      transitionType: 0,
      frames: [
        { duration: 10, images: [] }
      ]
    },
    'GetAttentionReturn': {
      name: 'GetAttentionReturn',
      transitionType: 0,
      frames: [
        { duration: 10, images: [] }
      ]
    }
  };

  beforeEach(() => {
    spriteManager = {
      drawFrame: vi.fn(),
      loadSprite: vi.fn().mockResolvedValue(undefined)
    };
    audioManager = {
      playFrameSound: vi.fn(),
      loadSounds: vi.fn().mockResolvedValue(undefined)
    };
    animationManager = new AnimationManager(spriteManager, audioManager, mockAnimations);
  });

  it('should transition to Continued animation and loop after initial animation completes', async () => {
    animationManager.playAnimation('GetAttention');
    expect(animationManager.currentAnimationName).toBe('GetAttention');

    const now = performance.now();
    // Advance through GetAttention frames (2 frames)
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    animationManager.update(now + 400);
    // Should now be playing GetAttentionContinued
    expect(animationManager.currentAnimationName).toBe('GetAttentionContinued');
    expect(animationManager.playbackState).toBe('Playing');

    // Should loop Continued
    animationManager.update(now + 300);
    expect(animationManager.currentAnimationName).toBe('GetAttentionContinued');
    expect(animationManager.currentFrameIndexValue).toBe(0);
  });

  it('should transition to Return animation when interrupted during initial animation', async () => {
    const promise = animationManager.playAnimation('GetAttention');
    expect(animationManager.currentAnimationName).toBe('GetAttention');

    // Signal exit
    animationManager.isExitingFlag = true;
    expect(animationManager.playbackState).toBe('Exiting');

    const now = performance.now();
    // Finish current frame and follow exit branch
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Finishing GetAttention while exiting should trigger Return
    animationManager.update(now + 400);
    expect(animationManager.currentAnimationName).toBe('GetAttentionReturn');
    expect(animationManager.playbackState).toBe('Exiting');

    // Finish Return
    animationManager.update(now + 600);
    await expect(promise).resolves.toBe(true);
    expect(animationManager.playbackState).toBe('Idle');
  });

  it('should transition to Return animation when interrupted during Continued loop', async () => {
    const promise = animationManager.playAnimation('GetAttention');

    const now = performance.now();
    // Advance to Continued
    animationManager.update(now + 200);
    animationManager.update(now + 400);
    expect(animationManager.currentAnimationName).toBe('GetAttentionContinued');

    // Interrupt during loop
    animationManager.isExitingFlag = true;

    // Finish current frame of Continued
    animationManager.update(now + 600);
    expect(animationManager.currentAnimationName).toBe('GetAttentionReturn');

    // Finish Return
    animationManager.update(now + 800);
    await expect(promise).resolves.toBe(true);
    expect(animationManager.playbackState).toBe('Idle');
  });

  it('should handle case-insensitive suffixes for Continued and Return', async () => {
    const caseAnims: Record<string, Animation> = {
      'greet': {
        name: 'greet',
        transitionType: 2,
        frames: [{ duration: 10, images: [] }]
      },
      'GREETcontinued': {
        name: 'GREETcontinued',
        transitionType: 0,
        frames: [{ duration: 10, images: [] }]
      },
      'greetRETURN': {
        name: 'greetRETURN',
        transitionType: 0,
        frames: [{ duration: 10, images: [] }]
      }
    };
    const am = new AnimationManager(spriteManager, audioManager, caseAnims);

    am.playAnimation('greet');
    const now = performance.now();
    am.update(now + 100);
    expect(am.currentAnimationName).toBe('GREETcontinued');

    am.isExitingFlag = true;
    am.update(now + 200);
    expect(am.currentAnimationName).toBe('greetRETURN');
  });

  it('should NOT use return mechanism if Continued or Return animation is missing', async () => {
    const missingAnims: Record<string, Animation> = {
      'onlyBase': {
        name: 'onlyBase',
        transitionType: 2,
        frames: [{ duration: 10, images: [] }]
      },
      'onlyBaseReturn': {
        name: 'onlyBaseReturn',
        transitionType: 0,
        frames: [{ duration: 10, images: [] }]
      }
    };
    const am = new AnimationManager(spriteManager, audioManager, missingAnims);

    const promise = am.playAnimation('onlyBase');
    const now = performance.now();
    am.update(now + 100);

    // Should complete normally since Continued is missing
    await expect(promise).resolves.toBe(true);
    expect(am.playbackState).toBe('Idle');
  });

  it('should correctly resolve promise ONLY after Return animation finishes', async () => {
    const promise = animationManager.playAnimation('GetAttention');
    let resolved = false;
    promise.then(() => resolved = true);

    const now = performance.now();
    animationManager.update(now + 200);
    animationManager.update(now + 400);
    expect(animationManager.currentAnimationName).toBe('GetAttentionContinued');
    expect(resolved).toBe(false);

    animationManager.isExitingFlag = true;
    animationManager.update(now + 600);
    expect(animationManager.currentAnimationName).toBe('GetAttentionReturn');
    expect(resolved).toBe(false);

    animationManager.update(now + 800);
    await promise;
    expect(resolved).toBe(true);
  });
});
