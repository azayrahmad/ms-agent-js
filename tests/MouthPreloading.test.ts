import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationManager } from '../src/core/behavior/AnimationManager';
import { SpriteManager } from '../src/core/resources/SpriteManager';
import { AudioManager } from '../src/core/resources/AudioManager';
import { AgentCharacterDefinition } from '../src/core/base/types';

describe('AnimationManager Mouth Preloading', () => {
  let spriteManager: SpriteManager;
  let audioManager: AudioManager;
  let animations: Record<string, any>;
  let definition: AgentCharacterDefinition;

  beforeEach(() => {
    definition = {
      character: { width: 100, height: 100 } as any,
      animations: {
        'Speak': {
          name: 'Speak',
          frames: [
            {
              duration: 10,
              images: [{ filename: '0001.bmp', offsetX: 0, offsetY: 0 }],
              mouths: [
                { type: 'OpenWide1', filename: 'mouth1.bmp', offsetX: 10, offsetY: 10 },
                { type: 'Closed', filename: 'mouth2.bmp', offsetX: 10, offsetY: 10 }
              ]
            }
          ]
        }
      }
    } as any;

    spriteManager = {
      loadSprite: vi.fn().mockResolvedValue(undefined),
      drawFrame: vi.fn()
    } as any;

    audioManager = {
      loadSounds: vi.fn().mockResolvedValue(undefined),
      playFrameSound: vi.fn()
    } as any;

    animations = definition.animations;
  });

  it('should preload mouth sprites along with normal images', async () => {
    const manager = new AnimationManager(spriteManager, audioManager, animations);
    await manager.preloadAnimation('Speak');

    // Should load the main image
    expect(spriteManager.loadSprite).toHaveBeenCalledWith('0001.bmp');

    // Should ALSO load the mouth images (this is what currently fails)
    expect(spriteManager.loadSprite).toHaveBeenCalledWith('mouth1.bmp');
    expect(spriteManager.loadSprite).toHaveBeenCalledWith('mouth2.bmp');
  });
});
