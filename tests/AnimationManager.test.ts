import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation, type FrameDefinition } from '../src/core/base/types';

describe('AnimationManager', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  const mockAnimations: Record<string, Animation> = {
    'test': {
      name: 'test',
      transitionType: 0,
      frames: [
        { duration: 10, images: [] }, // Frame 0
        { duration: 0, images: [], exitBranch: 1 },  // Frame 1 (Null frame)
        { duration: 10, images: [] }  // Frame 2
      ]
    },
    'loop': {
        name: 'loop',
        transitionType: 0,
        frames: [
            { duration: 10, images: [] },
            { duration: 0, images: [], branching: [{ branchTo: 1, probability: 100 }] } // Loops to itself
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

  it('should fast-forward through null frames (duration 0)', () => {
    const animationWithNullFrames: Animation = {
        name: 'nulls',
        transitionType: 0,
        frames: [
            { duration: 0, images: [] }, // Jump immediately to 1
            { duration: 0, images: [] }, // Jump immediately to 2
            { duration: 10, images: [] } // Stay here
        ]
    };
    (animationManager as any).animations['nulls'] = animationWithNullFrames;

    animationManager.setAnimation('nulls');
    // After setAnimation, it should have already processed the first two null frames
    expect(animationManager.currentFrameIndexValue).toBe(2);
  });

  it('should complete animation when jumping to index 0 from a null frame', async () => {
    const animationEndingInNull: Animation = {
        name: 'end-null',
        transitionType: 0,
        frames: [
            { duration: 10, images: [] },
            { duration: 0, images: [] } // Duration 0, next is 0 (completion)
        ]
    };
    (animationManager as any).animations['end-null'] = animationEndingInNull;

    const promise = animationManager.playAnimation('end-null');

    // Initial state: frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Update to trigger next frame
    animationManager.update(performance.now() + 200);

    // Should have skipped frame 1 and completed
    await expect(promise).resolves.toBe(true);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should handle exit branches correctly when exiting AFTER the current frame finishes', async () => {
    const anim: Animation = {
      name: 'exit-test',
      transitionType: 0,
      frames: [
        { duration: 10, images: [], exitBranch: 2 }, // If exiting, go to 2
        { duration: 10, images: [] },
        { duration: 10, images: [] },
      ],
    };
    (animationManager as any).animations['exit-test'] = anim;

    animationManager.playAnimation('exit-test');
    animationManager.isExitingFlag = true;

    // Should NOT have jumped immediately anymore
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // After update, it should jump
    animationManager.update(performance.now() + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);
  });

  it('should break a branching loop and proceed to end when exiting AFTER current frame finishes', async () => {
    const loopAnim: Animation = {
      name: 'branch-loop',
      transitionType: 0,
      frames: [
        {
          duration: 10,
          images: [],
          branching: [{ branchTo: 1, probability: 100 }],
        }, // Loops to self
        { duration: 10, images: [] }, // End frame
      ],
    };
    (animationManager as any).animations['branch-loop'] = loopAnim;

    const promise = animationManager.playAnimation('branch-loop');

    // Should be looping on frame 0
    const now = performance.now();
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Now set exiting
    animationManager.isExitingFlag = true;

    // Should still be on frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Next update should move to frame 1
    animationManager.update(now + 400);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Next update should complete
    animationManager.update(now + 600);
    await expect(promise).resolves.toBe(true);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should advance to exit sequence AFTER current frame finishes when interrupted via interruptAndPlayAnimation', async () => {
    const anim: Animation = {
      name: 'long-frame',
      transitionType: 0,
      frames: [
        { duration: 1000, images: [], exitBranch: 2 }, // Long frame
        { duration: 10, images: [] },
      ],
    };
    (animationManager as any).animations['long-frame'] = anim;
    (animationManager as any).animations['target'] = {
      name: 'target',
      frames: [{ duration: 10, images: [] }],
    };

    animationManager.playAnimation('long-frame');
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Interruption
    const playPromise = animationManager.interruptAndPlayAnimation('target');

    // Should STILL be on frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Drive clock to finish frame 0
    const now = performance.now();
    animationManager.update(now + 11000); // 1000 * 10 ms = 10s

    // Should have jumped to frame 2 (index 1)
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Drive clock to finish 'long-frame' exit sequence
    animationManager.update(now + 12000);

    // Allow async interruptAndPlayAnimation to continue
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now 'target' should have started
    expect(animationManager.currentAnimationName).toBe('target');

    // Drive clock to finish 'target'
    animationManager.update(now + 13000);
    await playPromise;
  });

  it('should break out of infinite null loops', () => {
    const loopAnim: Animation = {
        name: 'infinite-null',
        transitionType: 0,
        frames: [
            { duration: 0, images: [], branching: [{ branchTo: 1, probability: 100 }] }
        ]
    };
    (animationManager as any).animations['infinite-null'] = loopAnim;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    animationManager.setAnimation('infinite-null');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Infinite loop detected'));
    warnSpy.mockRestore();
  });

  it('should persist the last rendered frame after animation ends', async () => {
    const singleFrameAnim: Animation = {
        name: 'single',
        transitionType: 0,
        frames: [{ duration: 10, images: [{ filename: 'test.bmp', offsetX: 0, offsetY: 0 }] }]
    };
    (animationManager as any).animations['single'] = singleFrameAnim;

    const promise = animationManager.playAnimation('single');

    // Initial state
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Advance time
    animationManager.update(performance.now() + 200);

    await promise;

    // Animation is finished
    expect(animationManager.isAnimating).toBe(false);

    // But currentFrame should still return the last rendered one
    expect(animationManager.currentFrame).not.toBeNull();
    expect(animationManager.currentFrame?.images[0].filename).toBe('test.bmp');
  });

  it('should follow multi-step exit sequences AFTER each frame finishes', async () => {
    const anim: Animation = {
      name: 'multi-exit',
      transitionType: 0,
      frames: [
        { duration: 10, images: [], exitBranch: 3 }, // Frame 1 (idx 0) -> Exit to 3
        { duration: 10, images: [] }, // Frame 2 (idx 1)
        { duration: 10, images: [], exitBranch: 5 }, // Frame 3 (idx 2) -> Exit to 5
        { duration: 10, images: [] }, // Frame 4 (idx 3)
        { duration: 10, images: [] }, // Frame 5 (idx 4)
      ],
    };
    (animationManager as any).animations['multi-exit'] = anim;

    animationManager.playAnimation('multi-exit');
    expect(animationManager.currentFrameIndexValue).toBe(0);

    const now = performance.now();
    animationManager.isExitingFlag = true;
    // Should still be on frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Step 1: Progress Frame 1 to its exitBranch (Frame 3, index 2)
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(2);

    // Step 2: Progress Frame 3 to its exitBranch (Frame 5, index 4)
    animationManager.update(now + 400);
    expect(animationManager.currentFrameIndexValue).toBe(4);

    // Step 3: Complete
    animationManager.update(now + 600);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should loop back to frame 0 if isLooping is true and no branching exists', async () => {
    const anim: Animation = {
      name: 'no-loop-branch',
      transitionType: 0,
      frames: [
        { duration: 10, images: [] },
        { duration: 10, images: [] },
      ],
    };
    (animationManager as any).animations['no-loop-branch'] = anim;

    const promise = animationManager.playAnimation('no-loop-branch', false, true);

    // Advance through all frames
    animationManager.update(performance.now() + 100);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // This update would normally complete the animation, but isLooping is true
    animationManager.update(performance.now() + 200);

    // Should have looped back to frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);
    expect(animationManager.isAnimating).toBe(true);

    // Now set exiting
    animationManager.isExitingFlag = true;

    // Advance to end
    animationManager.update(performance.now() + 300);
    animationManager.update(performance.now() + 400);

    await expect(promise).resolves.toBe(true);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should freeze on the last null frame of a Transition Type 1 animation', () => {
    const anim: Animation = {
      name: 'type1-freeze',
      transitionType: 1,
      frames: [
        { duration: 10, images: [] },
        { duration: 10, images: [] },
        { duration: 0, images: [] }, // Last frame is null
      ],
    };
    (animationManager as any).animations['type1-freeze'] = anim;

    const now = 1000;
    animationManager.setAnimation('type1-freeze');
    (animationManager as any).lastFrameTime = now;

    // Advance to frame 0
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Move to frame 1
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Update to move towards frame 2
    animationManager.update(now + 400);

    // Should stay at frame 1 and NOT complete (because frame 2 is null)
    expect(animationManager.currentFrameIndexValue).toBe(1);
    expect(animationManager.isAnimating).toBe(true);
  });

  it('should reverse a Transition Type 1 animation upon exit if no exit branch is defined', async () => {
    const anim: Animation = {
      name: 'type1-reverse',
      transitionType: 1,
      frames: [
        { duration: 10, images: [] },
        { duration: 10, images: [] },
        { duration: 10, images: [] },
      ],
    };
    (animationManager as any).animations['type1-reverse'] = anim;

    const promise = animationManager.playAnimation('type1-reverse');
    const now = 1000;
    (animationManager as any).lastFrameTime = now;

    // Get to frame 2
    animationManager.update(now + 200);
    animationManager.update(now + 400);
    expect(animationManager.currentFrameIndexValue).toBe(2);

    // Set exiting
    animationManager.isExitingFlag = true;

    // First update should move to frame 1
    animationManager.update(now + 600);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Second update should move to frame 0
    animationManager.update(now + 800);
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Third update should complete
    animationManager.update(now + 1000);
    await expect(promise).resolves.toBe(true);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should prioritize exit branch over reversal in Transition Type 1 animations', async () => {
    const anim: Animation = {
      name: 'type1-exit-branch',
      transitionType: 1,
      frames: [
        { duration: 10, images: [] },
        { duration: 10, images: [], exitBranch: 1 }, // Exit to frame 1 (index 0)
        { duration: 10, images: [] },
      ],
    };
    (animationManager as any).animations['type1-exit-branch'] = anim;

    animationManager.playAnimation('type1-exit-branch');
    const now = 1000;
    (animationManager as any).lastFrameTime = now;

    // Get to frame 1
    animationManager.update(now + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);

    // Set exiting
    animationManager.isExitingFlag = true;

    // Update should take exit branch to frame 0
    animationManager.update(now + 400);
    expect(animationManager.currentFrameIndexValue).toBe(0);

    // Next update should complete
    animationManager.update(now + 600);
    expect(animationManager.isAnimating).toBe(false);
  });

  it('should skip sound effects during Transition Type 1 reversal', async () => {
    const anim: Animation = {
      name: 'type1-sound-skip',
      transitionType: 1,
      frames: [
        { duration: 10, images: [], soundEffect: 's1' },
        { duration: 10, images: [], soundEffect: 's2' },
        { duration: 10, images: [], soundEffect: 's3' },
      ],
    };
    (animationManager as any).animations['type1-sound-skip'] = anim;

    const promise = animationManager.playAnimation('type1-sound-skip');
    const now = 1000;
    (animationManager as any).lastFrameTime = now;

    // Get to frame 2
    animationManager.update(now + 200);
    animationManager.update(now + 400);
    expect(animationManager.currentFrameIndexValue).toBe(2);
    expect(audioManager.playFrameSound).toHaveBeenCalledWith('s3');
    audioManager.playFrameSound.mockClear();

    // Start exit (reversal)
    animationManager.isExitingFlag = true;

    // Moving back to frame 1
    animationManager.update(now + 600);
    expect(animationManager.currentFrameIndexValue).toBe(1);
    expect(audioManager.playFrameSound).not.toHaveBeenCalled();

    // Moving back to frame 0
    animationManager.update(now + 800);
    expect(animationManager.currentFrameIndexValue).toBe(0);
    expect(audioManager.playFrameSound).not.toHaveBeenCalled();

    // Completion
    animationManager.update(now + 1000);
    await expect(promise).resolves.toBe(true);
    expect(animationManager.isAnimating).toBe(false);
  });
});
