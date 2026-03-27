import { describe, it, expect, vi } from 'vitest';
import { CharacterParser } from '../src/core/resources/CharacterParser';

describe('CharacterParser', () => {
  it('should parse ACD content correctly', () => {
    const content = `
DefineCharacter
  GUID = {BFC9DE40-EBDE-11D1-BC17-00A076803C83}
  Width = 124
  Height = 93
  Transparency = 11
  DefaultFrameDuration = 10
  Style = AXS_VOICE_NONE | AXS_BALLOON_ROUNDRECT
  ColorTable = ColorTable.bmp
EndCharacter

DefineAnimation "GestureLeft"
  TransitionType = 0
  DefineFrame
    Duration = 10
    DefineImage
      Filename = 0000.bmp
      OffsetX = 0
      OffsetY = 0
    EndImage
  EndFrame
EndAnimation

DefineState "Idle"
  Animation = GestureLeft
EndState
`;

    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result).toBeDefined();
    expect(result.character).toBeDefined();
    expect(result.character.guid).toBe('BFC9DE40-EBDE-11D1-BC17-00A076803C83');
    expect(result.character.width).toBe(124);
    expect(result.character.height).toBe(93);

    // Check animations
    expect(Object.keys(result.animations).length).toBeGreaterThan(0);
    expect(result.animations['GestureLeft']).toBeDefined();
    expect(result.animations['GestureLeft'].frames.length).toBeGreaterThan(0);

    // Check states
    expect(Object.keys(result.states).length).toBeGreaterThan(0);
    expect(result.states['Idle']).toBeDefined();
  });

  it('should parse branching and extra data correctly', () => {
    const content = `
DefineCharacter
  GUID = {BFC9DE40-EBDE-11D1-BC17-00A076803C83}
  Width = 124
  Height = 93
  DefineInfo 0x0409
    Name = "Clippit"
    Description = "Clippit"
    ExtraData = "Greeting 1 ~~ Greeting 2 ^^ Reminder 1 ~~ Reminder 2"
  EndInfo
EndCharacter

DefineAnimation "Test"
  DefineFrame
    Duration = 10
    DefineImage
      Filename = 0000.bmp
    EndImage
    DefineBranching
      BranchTo = 2
      Probability = 50
    EndBranching
  EndFrame
EndAnimation
`;

    const parser = new CharacterParser();
    const result = parser.parse(content);

    // Check ExtraData (Greetings/Reminders)
    const info = result.character.infos[0];
    expect(info.greetings).toContain('Greeting 1');
    expect(info.greetings).toContain('Greeting 2');
    expect(info.reminders).toContain('Reminder 1');
    expect(info.reminders).toContain('Reminder 2');

    // Check Branching
    const animation = result.animations['Test'];
    const frame = animation.frames[0];
    expect(frame.branching).toBeDefined();
    expect(frame.branching![0].branchTo).toBe(2);
    expect(frame.branching![0].probability).toBe(50);
  });

  it('should parse non-English LCIDs in DefineInfo', () => {
    const content = `
DefineCharacter
  DefineInfo 0x040c
    Name = "Clippit_FR"
    Description = "French Clippit"
  EndInfo
EndCharacter
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    const info = result.character.infos[0];
    expect(info.languageCode).toBe('0x040c');
    expect(info.locale.language).toBe('fr');
    expect(info.name).toBe('Clippit_FR');
  });

  it('should handle edge cases in ExtraData parsing', () => {
    const parser = new CharacterParser();
    const info1 = { greetings: [], reminders: [] } as any;
    // Missing ^^
    (parser as any).parseExtraData("Greeting 1 ~~ Greeting 2", info1);
    expect(info1.greetings).toHaveLength(2);
    expect(info1.reminders).toHaveLength(0);

    const info2 = { greetings: [], reminders: [] } as any;
    // Empty parts
    (parser as any).parseExtraData(" ~~ ^^ ~~ ", info2);
    expect(info2.greetings).toHaveLength(0);
    expect(info2.reminders).toHaveLength(0);
  });

  it('should not throw error even if GUID is missing (defaults to empty)', () => {
    const content = ` DefineCharacter \n Width = 100 \n Height = 100 \n EndCharacter `;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.width).toBe(100);
  });

  it('should handle load error when all paths fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(CharacterParser.load('fail.acd')).rejects.toThrow();
  });

  it('should parse expanded LCIDs correctly', () => {
    const content = `
DefineCharacter
  DefineInfo 0x0401
    Name = "Arabic"
  EndInfo
  DefineInfo 0x040d
    Name = "Hebrew"
  EndInfo
  DefineInfo 0x041e
    Name = "Thai"
  EndInfo
EndCharacter
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.infos[0].locale.language).toBe('ar');
    expect(result.character.infos[1].locale.language).toBe('he');
    expect(result.character.infos[2].locale.language).toBe('th');
  });

  it('should parse new style flags and aliases', () => {
    const content = `
DefineCharacter
  Style = AXS_BALLOON_SIZETOTEXT | AXS_VOICE_TTS | AXS_SYSTEMCHAR
EndCharacter
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    const style = result.character.style;
    expect(style & 0x0004).toBeTruthy(); // BalloonSizeToText
    expect(style & 0x0020).toBeTruthy(); // VoiceTTS
    expect(style & 0x0040).toBeTruthy(); // SystemChar
  });

  it('should normalize backslashes in SoundEffect and Filename', () => {
    const content = `
DefineCharacter
  ColorTable = "images\\ColorTable.bmp"
EndCharacter

DefineAnimation "Test"
  DefineFrame
    SoundEffect = "audio\\effect.wav"
    DefineImage
      Filename = "images\\0000.bmp"
    EndImage
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.colorTable).toBe('images/ColorTable.bmp');
    expect(result.animations['Test'].frames[0].soundEffect).toBe('audio/effect.wav');
    expect(result.animations['Test'].frames[0].images[0].filename).toBe('images/0000.bmp');
  });

  it('should continue parsing after EndCharacter', () => {
    const content = `
DefineCharacter
  Width = 100
EndCharacter

DefineBalloon
  NumLines = 2
EndBalloon

DefineAnimation "Post"
  DefineFrame
    Duration = 10
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.width).toBe(100);
    expect(result.balloon.numLines).toBe(2);
    expect(result.animations['Post']).toBeDefined();
  });

  it('should handle multiple EndCharacter markers and content following them', () => {
    const content = `
DefineCharacter
  Width = 100
EndCharacter

// Extra EndCharacter that should be ignored
EndCharacter

DefineAnimation "Final"
  DefineFrame
    Duration = 10
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.width).toBe(100);
    expect(result.animations['Final']).toBeDefined();
  });
});
