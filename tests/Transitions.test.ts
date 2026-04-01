import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { type Animation } from '../src/core/base/types';

describe('Transitions and Return Animations', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  const mockAnimations: Record<string, Animation> = {
    'Action': {
      name: 'Action',
      transitionType: 0,
      returnAnimation: 'ActionReturn',
      frames: [{ duration: 10, images: [{ filename: 'action.bmp', offsetX: 0, offsetY: 0 }] }]
    },
    'ActionReturn': {
      name: 'ActionReturn',
      transitionType: 2,
      frames: [{ duration: 10, images: [{ filename: 'return.bmp', offsetX: 0, offsetY: 0 }] }]
    },
    'Type2': {
        name: 'Type2',
        transitionType: 2,
        returnAnimation: 'Type2Return',
        frames: [{ duration: 10, images: [{ filename: 'type2.bmp', offsetX: 0, offsetY: 0 }] }]
    },
    'Type2Return': {
        name: 'Type2Return',
        transitionType: 2,
        frames: [{ duration: 10, images: [{ filename: 'type2_ret.bmp', offsetX: 0, offsetY: 0 }] }]
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

  it('should infer ReturnAnimation in CharacterParser for TransitionType 0 and 2', () => {
    const parser = new CharacterParser();
    const acdContent = `
DefineAnimation "Greet"
    TransitionType = 0
    DefineFrame
        Duration = 10
    EndFrame
EndAnimation

DefineAnimation "Wave"
    TransitionType = 2
    DefineFrame
        Duration = 10
    EndFrame
EndAnimation
    `;
    const definition = parser.parse(acdContent);
    expect(definition.animations['Greet'].returnAnimation).toBe('GreetReturn');
    expect(definition.animations['Wave'].returnAnimation).toBe('WaveReturn');
  });

  it('should automatically play returnAnimation when a NEW animation is requested (TransitionType 0/2)', async () => {
    let now = 1000;
    // Start first animation
    const promise1 = animationManager.playAnimation('Action');
    now += 200;
    animationManager.update(now);
    await promise1;

    expect(animationManager.isAnimating).toBe(false);
    expect((animationManager as any).lastAnimationName).toBe('Action');

    // Now request a NEW animation
    const promise2 = animationManager.playAnimation('Type2');

    // Give microticks to trigger needsReturn
    await Promise.resolve();
    await Promise.resolve();

    // It should NOT be playing Type2 yet, but ActionReturn
    expect(animationManager.currentAnimationName).toBe('ActionReturn');

    // Finish ActionReturn
    now += 200;
    animationManager.update(now);

    // Now it should be playing Type2
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(animationManager.currentAnimationName).toBe('Type2');

    now += 200;
    animationManager.update(now);
    await promise2;
  });

  it('should play returnAnimation during interruption if no exit branches exist', async () => {
    let now = 2000;
    animationManager.playAnimation('Action');
    expect(animationManager.currentAnimationName).toBe('Action');

    // Interrupt with a new animation
    const interruptPromise = animationManager.interruptAndPlayAnimation('Type2');

    // Action is still at frame 0. Drive clock to finish it.
    now += 200;
    animationManager.update(now);

    // Give it microticks to allow promises to resolve
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(animationManager.currentAnimationName).toBe('ActionReturn');

    // Complete 'ActionReturn'
    now += 200;
    animationManager.update(now);

    // Now it should start 'Type2'
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(animationManager.currentAnimationName).toBe('Type2');

    // Complete 'Type2' so the promise resolves
    now += 200;
    animationManager.update(now);
    await interruptPromise;
  });

  it('should strictly NOT display frames with duration 0 and no images', () => {
    const anim: Animation = {
        name: 'null-test',
        transitionType: 2,
        frames: [
            { duration: 10, images: [{ filename: 'valid.bmp', offsetX: 0, offsetY: 0 }] },
            { duration: 0, images: [] }, // Pure null frame
            { duration: 10, images: [{ filename: 'next.bmp', offsetX: 0, offsetY: 0 }] }
        ]
    };
    (animationManager as any).animations['null-test'] = anim;

    animationManager.setAnimation('null-test');
    expect(animationManager.currentFrameIndexValue).toBe(0);
    expect(animationManager.currentFrame?.images[0].filename).toBe('valid.bmp');

    // Move to frame 1 (the null frame)
    // We need to bypass the automatic fast-forward in setAnimation by manually setting index
    (animationManager as any).currentFrameIndex = 1;
    (animationManager as any).lastRenderedFrame = anim.frames[0];

    // currentFrame should return the last rendered frame, not the null one
    expect(animationManager.currentFrame?.images[0].filename).toBe('valid.bmp');
  });

  it('should display frames with duration 0 if they HAVE images (e.g. mouth shapes)', () => {
    const anim: Animation = {
        name: 'mouth-test',
        transitionType: 1, // Use type 1 to allow pausing on 0-duration frames
        frames: [
            { duration: 10, images: [{ filename: 'base.bmp', offsetX: 0, offsetY: 0 }] },
            {
                duration: 0,
                images: [],
                mouths: [{ type: 'Closed', filename: 'mouth.bmp', offsetX: 0, offsetY: 0 }],
                exitBranch: 1
            }
        ]
    };
    (animationManager as any).animations['mouth-test'] = anim;

    animationManager.setAnimation('mouth-test');
    // Advance to frame 1
    animationManager.update(performance.now() + 200);

    expect(animationManager.currentFrameIndexValue).toBe(1);
    // Even though duration is 0, it has "mouths" (which are images), so it should be returned
    expect(animationManager.currentFrame).toBe(anim.frames[1]);
  });
});
