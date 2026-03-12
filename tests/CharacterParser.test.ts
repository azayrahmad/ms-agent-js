import { describe, it, expect } from 'vitest';
import { CharacterParser } from '../src/CharacterParser';

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
});
