/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/Agent';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import { setupGlobals } from './setup';

// Mock everything needed for Agent environment
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

describe('Agent Pagination', () => {
    const mockDefinition = {
        character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
        animations: {
            'A': { name: 'A', frames: [{ duration: 10, images: [] }] }
        },
        states: {
            'IdlingLevel1': { name: 'IdlingLevel1', animations: ['A'] }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        setupGlobals(mockDefinition);
        (CharacterParser.load as any).mockResolvedValue(mockDefinition);
    });

    it('should paginate choices correctly', async () => {
        const agent = await Agent.load('Clippit');
        const askPromise = agent.ask({
            content: [
                {
                    type: 'choices',
                    items: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5']
                }
            ]
        });

        const balloonEl = agent.balloon.balloonEl;

        // Initial page (0): Choice 1, 2, 3 and "See next"
        let choices = balloonEl.querySelectorAll('.clippy-choices li');
        expect(choices.length).toBe(4);
        expect(choices[0].textContent).toBe('Choice 1');
        expect(choices[1].textContent).toBe('Choice 2');
        expect(choices[2].textContent).toBe('Choice 3');
        expect(choices[3].textContent).toBe('See more...');
        expect(choices[3].classList.contains('clippy-pagination-link')).toBe(true);

        // Click "See more..."
        const nextLink = choices[3] as HTMLElement;
        nextLink.click();

        // Second page (1): "See previous...", Choice 4, 5
        choices = balloonEl.querySelectorAll('.clippy-choices li');
        expect(choices.length).toBe(3);
        expect(choices[0].textContent).toBe('See previous...');
        expect(choices[0].classList.contains('clippy-pagination-link')).toBe(true);
        expect(choices[1].textContent).toBe('Choice 4');
        expect(choices[2].textContent).toBe('Choice 5');

        // Click "See previous"
        const prevLink = choices[0] as HTMLElement;
        prevLink.click();

        // Back to first page
        choices = balloonEl.querySelectorAll('.clippy-choices li');
        expect(choices.length).toBe(4);
        expect(choices[0].textContent).toBe('Choice 1');

        // Select a choice
        const firstChoice = choices[0] as HTMLElement;
        firstChoice.click();

        const result = await askPromise;
        expect(result?.value).toBe(0);
    });

    it('should restore input and checkbox state after pagination', async () => {
        const agent = await Agent.load('Clippit');
        const askPromise = agent.ask({
            content: [
                { type: 'input', placeholder: 'Test input' },
                { type: 'checkbox', label: 'Test checkbox' },
                {
                    type: 'choices',
                    items: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4']
                }
            ]
        });

        const balloonEl = agent.balloon.balloonEl;
        const textarea = balloonEl.querySelector('textarea') as HTMLTextAreaElement;
        const checkbox = balloonEl.querySelector('.ask-checkbox') as HTMLInputElement;

        // Set state
        textarea.value = 'Hello';
        checkbox.checked = true;

        // Click "See next"
        const nextLink = balloonEl.querySelector('.clippy-pagination-link[data-action="next"]') as HTMLElement;
        nextLink.click();

        // Check if state is restored
        const newTextarea = balloonEl.querySelector('textarea') as HTMLTextAreaElement;
        const newCheckbox = balloonEl.querySelector('.ask-checkbox') as HTMLInputElement;
        expect(newTextarea.value).toBe('Hello');
        expect(newCheckbox.checked).toBe(true);

        // Complete the ask
        const choices = balloonEl.querySelectorAll('.clippy-choices li');
        (choices[1] as HTMLElement).click(); // Choice 4 (index 3 on second page? wait, index is absolute)
        // Wait, Choice 4 is index 3.

        const result = await askPromise;
        expect(result?.text).toBe('Hello');
        expect(result?.checked).toBe(true);
    });
});
