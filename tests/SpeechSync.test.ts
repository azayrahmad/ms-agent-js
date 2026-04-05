/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';

vi.mock('../src/core/resources/CharacterParser', () => {
  return {
    CharacterParser: {
      load: vi.fn(),
    },
  };
});

vi.mock('../src/core/resources/SpriteManager', () => {
  class SpriteManager {
    init = vi.fn().mockResolvedValue(undefined);
    getSpriteWidth = vi.fn().mockReturnValue(100);
    getSpriteHeight = vi.fn().mockReturnValue(100);
    loadSprite = vi.fn().mockResolvedValue(undefined);
  }
  return { SpriteManager };
});

describe('Speech Synchronization', () => {
  const mockDefinition = {
    character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
    balloon: {
      borderColor: '000000',
      backColor: 'ffffff',
      foreColor: '000000',
      fontName: 'Arial',
      fontHeight: 12,
    },
    animations: {
      Explain: {
        name: 'Explain',
        frames: [
          { duration: 10, images: [] }, // Frame 0: No mouths
          {
            duration: 10,
            images: [],
            mouths: [{ type: 'Closed', filename: 'mouth.bmp', offsetX: 0, offsetY: 0 }],
          }, // Frame 1: Has mouth
        ],
      },
      NoMouths: {
        name: 'NoMouths',
        frames: [{ duration: 10, images: [] }],
      },
    },
    states: { IdlingLevel1: { name: 'IdlingLevel1', animations: [] } },
  };

  let agent: Agent;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupGlobals(mockDefinition);
    (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    agent = await Agent.load('Clippit');
    vi.spyOn(agent.balloon, 'isTTSEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    agent.destroy();
  });

  it('should wait for a mouth frame when animation has mouths and TTS is enabled', async () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(agent.balloon, 'speak');
    const resumeSpy = vi.spyOn(agent.balloon, 'resumePausedSpeech');

    // Start speaking with 'Explain' animation which has mouths
    agent.speak('Hello', { animation: 'Explain', useTTS: true });

    // Wait for the request to be processed
    await vi.advanceTimersByTimeAsync(0);

    // Should have called speak with paused=true
    expect(speakSpy).toHaveBeenCalledWith(
      expect.any(Function),
      'Hello',
      false,
      true,
      false,
      false,
      true,
    );
    expect(resumeSpy).not.toHaveBeenCalled();

    // Advance to frame 0 (no mouth)
    vi.spyOn(agent.animationManager, 'currentFrame', 'get').mockReturnValue(
      mockDefinition.animations.Explain.frames[0],
    );
    agent.animationManager.emit('frameChanged');
    expect(resumeSpy).not.toHaveBeenCalled();

    // Advance to frame 1 (has mouth)
    vi.spyOn(agent.animationManager, 'currentFrame', 'get').mockReturnValue(
      mockDefinition.animations.Explain.frames[1],
    );
    agent.animationManager.emit('frameChanged');

    expect(resumeSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should start immediately if animation has no mouth frames', async () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(agent.balloon, 'speak');

    agent.speak('Hello', { animation: 'NoMouths', useTTS: true });
    await vi.advanceTimersByTimeAsync(0);

    // Should have called speak with default paused (false)
    expect(speakSpy).toHaveBeenCalledWith(expect.any(Function), 'Hello', false, true, false);
    vi.useRealTimers();
  });

  it('should start immediately if TTS is disabled', async () => {
    vi.useFakeTimers();
    vi.spyOn(agent.balloon, 'isTTSEnabled').mockReturnValue(false);
    const speakSpy = vi.spyOn(agent.balloon, 'speak');

    agent.speak('Hello', { animation: 'Explain', useTTS: true });
    await vi.advanceTimersByTimeAsync(0);

    expect(speakSpy).toHaveBeenCalledWith(expect.any(Function), 'Hello', false, true, false);
    vi.useRealTimers();
  });

  it('should fallback and resume if a different animation starts', async () => {
    vi.useFakeTimers();
    const resumeSpy = vi.spyOn(agent.balloon, 'resumePausedSpeech');

    agent.speak('Hello', { animation: 'Explain', useTTS: true });
    await vi.advanceTimersByTimeAsync(0);

    // Start another animation
    agent.animationManager.emit('animationStarted', 'OtherAnimation');

    expect(resumeSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
