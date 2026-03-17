/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';

vi.mock('../src/core/resources/CharacterParser', () => ({
    CharacterParser: { load: vi.fn(), parse: vi.fn() }
}));

vi.mock('../src/core/resources/SpriteManager', () => ({
    SpriteManager: class {
        init = vi.fn().mockResolvedValue(undefined);
        getSpriteWidth = vi.fn().mockReturnValue(100);
        getSpriteHeight = vi.fn().mockReturnValue(100);
        loadSprite = vi.fn().mockResolvedValue(undefined);
        drawFrame = vi.fn();
    }
}));

describe('Agent Speak and Ask with Title/Text', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] },
            'Explain': { name: 'Explain', frames: [{ duration: 10, images: [] }] },
            'Showing': { name: 'Showing', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] },
            'Speaking': { name: 'Speaking', animations: ['Explain'] },
            'Showing': { name: 'Showing', animations: ['Showing'] }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);

        class MockSpeechSynthesisUtterance {
            text: string;
            onboundary: any;
            onend: any;
            onerror: any;
            constructor(text: string) { this.text = text; }
        }

        vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
        vi.stubGlobal('window', {
            ...window,
            innerWidth: 1024,
            innerHeight: 768,
            speechSynthesis: {
                speak: vi.fn(),
                cancel: vi.fn(),
                getVoices: vi.fn().mockReturnValue([]),
                speaking: false
            }
        });
    });

    it('should pass title to speak method', async () => {
        const agent = await Agent.load('Clippit', { initialAnimation: "" });

        const balloon = (agent as any).renderer.balloon;
        const speakSpy = vi.spyOn(balloon, 'speak');

        // Pass useTTS: false to avoid SpeechSynthesis errors in this test
        const req = agent.speak('Hello', { title: 'My Title', useTTS: false });

        await req.promise;

        expect(speakSpy).toHaveBeenCalledWith(
            expect.any(Function),
            'Hello',
            false, // hold
            false, // useTTS
            false, // skipTyping
            false, // skipContentUpdate
            'My Title'
        );
    });

    it('should show title and text in ask method', async () => {
        const agent = await Agent.load('Clippit', { initialAnimation: "" });

        const balloon = (agent as any).renderer.balloon;
        const showHtmlSpy = vi.spyOn(balloon, 'showHtml');
        const speakSpy = vi.spyOn(balloon, 'speak');

        // Case 1: Without text
        agent.ask({ title: 'Question' });

        // Wait for request queue
        let iterations = 0;
        while (showHtmlSpy.mock.calls.length === 0 && iterations < 50) {
            await new Promise(resolve => setTimeout(resolve, 20));
            iterations++;
        }

        expect(showHtmlSpy).toHaveBeenCalled();
        let html1 = showHtmlSpy.mock.calls[0][0];
        expect(html1).toContain('clippy-balloon-title');
        expect(html1).toContain('Question');
        expect(speakSpy).not.toHaveBeenCalled();

        // Case 2: With text
        agent.stop();
        showHtmlSpy.mockClear();
        speakSpy.mockClear();

        agent.ask({ title: 'Title', text: 'Spoken Text' });

        iterations = 0;
        while (showHtmlSpy.mock.calls.length === 0 && iterations < 50) {
            await new Promise(resolve => setTimeout(resolve, 20));
            iterations++;
        }

        expect(showHtmlSpy).toHaveBeenCalled();
        let html2 = showHtmlSpy.mock.calls[0][0];
        expect(html2).toContain('Title');
        expect(html2).toContain('Spoken Text');

        // Wait a bit more for speak to be called (it's called after showHtml)
        iterations = 0;
        while (speakSpy.mock.calls.length === 0 && iterations < 50) {
            await new Promise(resolve => setTimeout(resolve, 20));
            iterations++;
        }

        expect(speakSpy).toHaveBeenCalledWith(
            expect.any(Function),
            'Spoken Text',
            true, // hold
            true, // useTTS
            false, // skipTyping
            true // skipContentUpdate
        );

        agent.stop();
    });
});
