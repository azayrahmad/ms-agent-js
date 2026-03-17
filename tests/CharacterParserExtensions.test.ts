import { describe, it, expect } from 'vitest';
import { CharacterParser } from '../src/core/resources/CharacterParser';

describe('CharacterParser Extensions', () => {
  it('should parse new fields from ACD content correctly', () => {
    const content = `
DefineCharacter
  GUID = {BFC9DE40-EBDE-11D1-BC17-00A076803C83}
  Width = 124
  Height = 93
  Transparency = 11
  DefaultFrameDuration = 10
  Style = AXS_VOICE_NONE | AXS_BALLOON_ROUNDRECT
  ColorTable = ColorTable.bmp
  TTSSpeed = 150
  TTSPitch = 100
EndCharacter

DefineBalloon
  NumLines = 2
  CharsPerLine = 32
  FontName = "Arial"
  FontHeight = 12
  ForeColor = 000000
  BackColor = ffffff
  BorderColor = 000000
  FontWeight = 400
  Italicized = 0
  Underline = 1
EndBalloon

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

    expect(result.character.ttsSpeed).toBe(150);
    expect(result.character.ttsPitch).toBe(100);
    expect(result.balloon.underline).toBe(true);
  });
});
