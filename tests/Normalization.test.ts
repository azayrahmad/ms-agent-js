import { describe, it, expect } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { MOUTH_TYPE_MAP } from '../src/core/base/types';

(global as any).MOUTH_TYPE_MAP = MOUTH_TYPE_MAP;

describe('Agent Normalization', () => {
    it('should normalize mouth keys to PascalCase', () => {
        const mockDefinition: any = {
            character: { colorTable: 'ColorTable.bmp' },
            animations: {
                'Speak': {
                    frames: [
                        {
                            images: [{ filename: 'img.bmp', offsetX: 0, offsetY: 0 }],
                            mouths: {
                                'closed': { filename: 'closed.bmp', offsetX: 0, offsetY: 0 },
                                'openwide1': { filename: 'open1.bmp', offsetX: 0, offsetY: 0 },
                                'OpenMedium': { filename: 'med.bmp', offsetX: 0, offsetY: 0 }
                            }
                        }
                    ]
                }
            }
        };

        // Access private static method for testing
        (Agent as any).normalizeDefinition(mockDefinition);

        const mouths = mockDefinition.animations['Speak'].frames[0].mouths;
        expect(mouths).toHaveProperty('Closed');
        expect(mouths).toHaveProperty('OpenWide1');
        expect(mouths).toHaveProperty('OpenMedium');

        expect(mouths).not.toHaveProperty('closed');
        expect(mouths).not.toHaveProperty('openwide1');

        expect(mouths['Closed'].filename).toBe('closed.bmp');
        expect(mouths['OpenWide1'].filename).toBe('open1.bmp');
    });

    it('should normalize mouth keys in CharacterParser', () => {
        const content = `
DefineCharacter
  DefaultFrameDuration = 10
  ColorTable = ColorTable.bmp
EndCharacter

DefineAnimation "Speak"
  DefineFrame
    DefineMouth
      Type = closed
      Filename = closed.bmp
    EndMouth
    DefineMouth
      Type = openwide1
      Filename = open1.bmp
    EndMouth
  EndFrame
EndAnimation
`;
        const parser = new CharacterParser();
        const result = parser.parse(content);

        const mouths = result.animations['Speak'].frames[0].mouths!;
        expect(mouths).toHaveProperty('Closed');
        expect(mouths).toHaveProperty('OpenWide1');
        expect(mouths).not.toHaveProperty('closed');
        expect(mouths).not.toHaveProperty('openwide1');
    });

    it('should handle backslashes and casing in filenames', () => {
        const mockDefinition: any = {
            character: { colorTable: 'PATH\\TO\\PALETTE.BMP' },
            animations: {
                'Anim': {
                    frames: [
                        {
                            images: [{ filename: 'IMAGES\\FRAME.BMP', offsetX: 0, offsetY: 0 }],
                            soundEffect: 'SOUNDS\\WAV.WAV'
                        }
                    ]
                }
            }
        };

        (Agent as any).normalizeDefinition(mockDefinition);

        expect(mockDefinition.character.colorTable).toBe('PATH/TO/PALETTE.BMP');
        expect(mockDefinition.animations['Anim'].frames[0].images[0].filename).toBe('images/frame.bmp');
        expect(mockDefinition.animations['Anim'].frames[0].soundEffect).toBe('sounds/wav.wav');
    });
});
