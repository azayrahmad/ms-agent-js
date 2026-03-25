import { describe, it, expect } from 'vitest';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { CharacterStyle } from '../src/core/base/types';

describe('CharacterParser V2.1 features', () => {
  it('should parse extended character properties correctly', () => {
    const content = `
DefineCharacter
  Name = "Genie"
  GUID = {C3B28D02-B254-11D0-B464-0080C7F5EE85}
  Icon = "Images\\SystemTray.ico"
  Width = 128
  Height = 128
  Transparency = 10
  DefaultFrameDuration = 10
  Style = AXS_VOICE_TTS | AXS_BALLOON_ROUNDRECT | AXS_BALLOON_SIZETOTEXT | AXS_SYSTEM_CHAR
  TTSEngineID = {CA141FD0-AC7F-11D1-97A3-0060082730FF}
  TTSModeID = {CA141FD0-AC7F-11D1-97A3-006008273000}
  TTSLangID = 0x0409
  TTSGender = 2
  TTSAge = 30
  TTSStyle = "Business"
  ColorTable = "Images\\ColorTable.bmp"
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

  it('should parse extended balloon properties correctly', () => {
    const content = `
DefineBalloon
  NumLines = 2
  CharsPerLine = 28
  FontName = "MS Sans Serif"
  FontHeight = 13
  FontWeight = 700
  Italic = 1
  ForeColor = 00000000
  BackColor = 00e1ffff
  BorderColor = 00000000
EndBalloon
`;

    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.balloon.fontWeight).toBe(700);
    expect(result.balloon.italic).toBe(true);
  });

  it('should parse mouth definitions and frame extras correctly', () => {
    const content = `
DefineAnimation "RestPose"
  DefineFrame
    Duration = 10
    ExitBranch = 5
    SoundEffect = "Audio\\0001.wav"
    DefineMouth
      Type = Closed
      Filename = "Images\\0001.bmp"
    EndMouth
    DefineMouth
      Type = OpenWide1
      Filename = "Images\\0002.bmp"
    EndMouth
    DefineImage
      Filename = "Images\\0000.bmp"
    EndImage
  EndFrame
EndAnimation
`;

    const parser = new CharacterParser();
    const result = parser.parse(content);

    const animation = result.animations['RestPose'];
    const frame = animation.frames[0];
    expect(frame.exitBranch).toBe(5);
    expect(frame.soundEffect).toBe('Audio/0001.wav');
    expect(frame.mouths).toBeDefined();
    expect(frame.mouths?.length).toBe(2);
    expect(frame.mouths?.[0].type).toBe('Closed');
    expect(frame.mouths?.[0].filename).toBe('Images/0001.bmp');
    expect(frame.mouths?.[1].type).toBe('OpenWide1');
    expect(frame.mouths?.[1].filename).toBe('Images/0002.bmp');
  });

  it('should parse localized info with new LCIDs', () => {
    const content = `
DefineCharacter
  DefineInfo 0x0401
    Name = "ÇáÌäí"
    Description = "ÃäÇ ÎÇÏãß ÇáãÊæÇÖÚ æáßä ÇáÞæí"
    ExtraData = "ÎÇÏãß æãÓÇÚÏß ÇáãÎáÕ.^^ÇÚÐÑäí ÃáÝ ãÑÉ"
  EndInfo
  DefineInfo 0x040d
    Name = "â'éðé"
    Description = "àðé äîùøú ùì äîðåøä"
    ExtraData = "àðé äîùøú åäòåæø äðàîï ùìê.^^àìó ñìéçåú"
  EndInfo
EndCharacter
`;

    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.character.infos.length).toBe(2);
    expect(result.character.infos[0].languageCode).toBe('0x0401');
    expect(result.character.infos[0].locale.language).toBe('ar');
    expect(result.character.infos[1].languageCode).toBe('0x040d');
    expect(result.character.infos[1].locale.language).toBe('he');
  });
});
