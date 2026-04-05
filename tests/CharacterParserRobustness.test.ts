import { describe, it, expect } from 'vitest';
import { CharacterParser } from '../src/core/resources/CharacterParser';

describe('CharacterParser Robustness', () => {
  it('should handle different line endings (\\r, \\r\\n, \\n)', () => {
    const content = 'DefineCharacter\rWidth = 100\rEndCharacter\r\nDefineBalloon\r\nNumLines = 2\r\nEndBalloon\nDefineAnimation "Test"\nDefineFrame\nDuration = 10\nEndFrame\nEndAnimation';
    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.character.width).toBe(100);
    expect(result.balloon.numLines).toBe(2);
    expect(result.animations['Test']).toBeDefined();
  });

  it('should be case-insensitive for keywords and properties', () => {
    const content = `
DEFINECHARACTER
  width = 120
  HEIGHT = 150
  colortable = test.bmp
ENDCHARACTER

defineballoon
  numlines = 3
  fontname = "Comic Sans"
endballoon

DEFINEANIMATION "Wave"
  DEFINEFRAME
    duration = 5
  ENDFRAME
ENDANIMATION
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);

    expect(result.character.width).toBe(120);
    expect(result.character.height).toBe(150);
    expect(result.character.colorTable).toBe('test.bmp');
    expect(result.balloon.numLines).toBe(3);
    expect(result.balloon.fontName).toBe('Comic Sans');
    expect(result.animations['Wave']).toBeDefined();
  });

  it('should strip UTF-8 BOM', () => {
    const content = '\uFEFFDefineCharacter\nWidth = 80\nEndCharacter';
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character.width).toBe(80);
  });

  it('should initialize character and balloon objects even if sections are missing', () => {
    const content = '// Empty file with comments';
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.character).toBeDefined();
    expect(result.balloon).toBeDefined();
    expect(result.animations).toEqual({});
  });

  it('should handle unusual casing in DefineState and Animation list', () => {
    const content = `
DefineState "Waiting"
  animation = Wave
  ANIMATION = Blink
EndState
`;
    const parser = new CharacterParser();
    const result = parser.parse(content);
    expect(result.states['Waiting']).toBeDefined();
    expect(result.states['Waiting'].animations).toContain('Wave');
    expect(result.states['Waiting'].animations).toContain('Blink');
  });
});
