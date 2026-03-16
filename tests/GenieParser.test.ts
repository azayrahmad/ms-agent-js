import { describe, it, expect } from 'vitest';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { CharacterStyle } from '../src/core/base/types';

describe('CharacterParser - Genie Extensions', () => {
  it('should parse new character metadata fields', () => {
    const content = `
DefineCharacter
  Name = "Genie"
  GUID = {C3B28D02-B254-11D0-B464-0080C7F5EE85}
  Icon = "Images\\SystemTray.ico"
  Width = 128
  Height = 128
  Style = AXS_VOICE_TTS | AXS_BALLOON_ROUNDRECT | AXS_BALLOON_SIZETOTEXT | AXS_SYSTEM_CHAR
  TTSEngineID = {CA141FD0-AC7F-11D1-97A3-0060082730FF}
  TTSModeID = {CA141FD0-AC7F-11D1-97A3-006008273000}
  TTSLangID = 0x0409
  TTSGender = 2
  TTSAge = 30
  TTSStyle = "Business"
EndCharacter
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.character.icon).toBe('Images/SystemTray.ico');
    expect(result.character.ttsEngineID).toBe('CA141FD0-AC7F-11D1-97A3-0060082730FF');
    expect(result.character.ttsModeID).toBe('CA141FD0-AC7F-11D1-97A3-006008273000');
    expect(result.character.ttsLangID).toBe('0x0409');
    expect(result.character.ttsGender).toBe(2);
    expect(result.character.ttsAge).toBe(30);
    expect(result.character.ttsStyle).toBe('Business');

    expect(result.character.style & CharacterStyle.VoiceTTS).toBeTruthy();
    expect(result.character.style & CharacterStyle.SystemChar).toBeTruthy();
    expect(result.character.style & CharacterStyle.BalloonSizeToText).toBeTruthy();
  });

  it('should parse character and animation set versions', () => {
    const content = `
DefineCharacter
  MajorVersion = 2
  MinorVersion = 1
  AnimationSetMajorVersion = 2
  AnimationSetMinorVersion = 0
EndCharacter
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.character.majorVersion).toBe(2);
    expect(result.character.minorVersion).toBe(1);
    expect(result.character.animationSetMajorVersion).toBe(2);
    expect(result.character.animationSetMinorVersion).toBe(0);
  });

  it('should parse balloon typography', () => {
    const content = `
DefineBalloon
  FontWeight = 700
  Italicized = 1
EndBalloon
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.balloon.fontWeight).toBe(700);
    expect(result.balloon.italicized).toBe(true);
  });

  it('should parse DefineMouth shapes with extended metadata', () => {
    const content = `
DefineAnimation "RestPose"
  DefineFrame
    Duration = 10
    DefineMouth
      Type = Closed
      Filename = "Images\\0001.bmp"
      ReplaceTopImage = 1
    EndMouth
    DefineMouth
      Type = OpenWide1
      Filename = "Images\\0002.bmp"
      OffsetY = -3
      Width = 64
      Height = 32
    EndMouth
    DefineImage
      Filename = "Images\\0000.bmp"
    EndImage
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    const frame = result.animations['RestPose'].frames[0];

    expect(frame.mouths).toBeDefined();
    expect(frame.mouths?.['closed']).toBeDefined();
    expect(frame.mouths?.['closed'].filename).toBe('Images/0001.bmp');
    expect(frame.mouths?.['closed'].replaceTopImage).toBe(true);
    expect(frame.mouths?.['openwide1']).toBeDefined();
    expect(frame.mouths?.['openwide1'].filename).toBe('Images/0002.bmp');
    expect(frame.mouths?.['openwide1'].offsetY).toBe(-3);
    expect(frame.mouths?.['openwide1'].width).toBe(64);
    expect(frame.mouths?.['openwide1'].height).toBe(32);
  });

  it('should parse TransitionType and ReturnAnimation', () => {
    const content = `
DefineAnimation "GetAttention"
  TransitionType = 2
  ReturnAnimation = "GetAttentionReturn"
  DefineFrame
    Duration = 10
    DefineImage
      Filename = "Images\\0298.bmp"
    EndImage
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    const anim = result.animations['GetAttention'];

    expect(anim.transitionType).toBe(2);
    expect(anim.returnAnimation).toBe('GetAttentionReturn');
  });

  it('should use default frame duration if not specified in frame', () => {
    const content = `
DefineCharacter
  DefaultFrameDuration = 15
EndCharacter
DefineAnimation "Test"
  DefineFrame
    DefineImage
      Filename = "test.bmp"
    EndImage
  EndFrame
EndAnimation
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.animations['Test'].frames[0].duration).toBe(15);
  });
});
