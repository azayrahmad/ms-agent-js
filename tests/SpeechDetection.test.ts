import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { type Animation } from '../src/core/base/types';

describe('AnimationManager Speech Detection', () => {
  let spriteManager: any;
  let audioManager: any;
  let animationManager: AnimationManager;

  const mockAnimations: Record<string, Animation> = {
    'no-mouths': {
      name: 'no-mouths',
      transitionType: 0,
      frames: [
        { duration: 10, images: [{ filename: 'a.bmp', offsetX: 0, offsetY: 0 }] },
        { duration: 10, images: [{ filename: 'b.bmp', offsetX: 0, offsetY: 0 }] }
      ]
    },
    'with-mouths': {
      name: 'with-mouths',
      transitionType: 0,
      frames: [
        { duration: 10, images: [{ filename: 'c.bmp', offsetX: 0, offsetY: 0 }] },
        {
          duration: 10,
          images: [{ filename: 'd.bmp', offsetX: 0, offsetY: 0 }],
          mouths: [{ type: 'Closed', filename: 'm.bmp', offsetX: 0, offsetY: 0 }]
        }
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

  it('should correctly detect if an animation supports speech', () => {
    expect(animationManager.supportsSpeech('no-mouths')).toBe(false);
    expect(animationManager.supportsSpeech('with-mouths')).toBe(true);
  });

  it('should correctly detect if current frame has mouths', () => {
    animationManager.setAnimation('with-mouths');

    // Frame 0: no mouths
    expect(animationManager.currentFrameHasMouths()).toBe(false);

    // Advance to Frame 1
    animationManager.update(performance.now() + 200);
    expect(animationManager.currentFrameIndexValue).toBe(1);
    expect(animationManager.currentFrameHasMouths()).toBe(true);
  });

  it('should emit animationStarted event', () => {
    const spy = vi.fn();
    animationManager.on('animationStarted', spy);

    animationManager.setAnimation('no-mouths');
    expect(spy).toHaveBeenCalledWith('no-mouths');
  });
});
