/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from '../src/Agent';
import { AgentCore } from '../src/core/Core';
import { AgentLoader } from '../src/core/resources/AgentLoader';

describe('Agent Custom Animation', () => {
  let agent: any;

  beforeEach(async () => {
    // Mock AgentLoader.getDefinition to provide a simple character definition
    vi.spyOn(AgentLoader as any, 'getDefinition').mockResolvedValue({
      atlas: {},
      character: { width: 100, height: 100, colorTable: '', style: 0 },
      animations: {
        Explain: { frames: [] },
        Writing: { frames: [] },
        CustomAnim: { frames: [] },
        Speaking: { frames: [] }
      },
      states: {
        Showing: { animations: ['Explain'] },
        IdlingLevel1: { animations: ['Explain'] }
      },
      balloon: {
        backColor: '#ffffff',
        foreColor: '#000000',
        borderColor: '#000000',
        fontName: 'Arial',
        fontHeight: 12,
        fontBold: false,
        fontItalic: false,
        fontUnderline: false,
        fontStrikeout: false,
        charsPerLine: 40,
        numLines: 4
      }
    });

    // Mock AgentCore.prototype.init to avoid asset loading
    vi.spyOn(AgentCore.prototype, 'init').mockResolvedValue(undefined);

    agent = await Agent.load('TestAgent');
    // Mock the state manager's playAnimation to track calls
    vi.spyOn(agent.stateManager, 'playAnimation').mockResolvedValue(true);
  });

  it('should use custom animation in speak', async () => {
    // Manually run the task because requestAnimationFrame might not be running in tests
    const taskSpy = vi.fn(async (request) => {
        agent.startTalkingAnimation('CustomAnim');
    });
    vi.spyOn(agent, 'enqueueRequest').mockImplementation((task) => {
        task({ isCancelled: false } as any);
        return {} as any;
    });

    agent.speak('Hello', { animation: 'CustomAnim' });

    expect(agent.stateManager.playAnimation).toHaveBeenCalledWith(
      'CustomAnim',
      'Speaking',
      false,
      undefined,
      true
    );
  });

  it('should fallback to Explain in speak if custom animation is missing', async () => {
    vi.spyOn(agent, 'enqueueRequest').mockImplementation((task) => {
        task({ isCancelled: false } as any);
        return {} as any;
    });

    agent.speak('Hello', { animation: 'MissingAnim' });

    expect(agent.stateManager.playAnimation).toHaveBeenCalledWith(
      'Explain',
      'Speaking',
      false,
      undefined,
      true
    );
  });

  it('should use custom animation in ask and restore after blur', async () => {
    vi.spyOn(agent.core.requestQueue, 'add').mockImplementation((task) => {
        task({ isCancelled: false } as any);
        return {} as any;
    });

    // We need to mock the balloon and its elements for the ask method
    const mockTextArea = document.createElement('textarea');
    vi.spyOn(agent.renderer.balloon.balloonEl, 'querySelector').mockImplementation((selector: string) => {
        if (selector === 'textarea') return mockTextArea;
        return null;
    });

    agent.ask({ content: [{ type: 'input' }], animation: 'CustomAnim' });

    expect(agent.stateManager.playAnimation).toHaveBeenCalledWith(
      'CustomAnim',
      'Speaking',
      false,
      undefined,
      true
    );

    // Simulate focus
    mockTextArea.dispatchEvent(new Event('focus'));
    expect(agent.stateManager.playAnimation).toHaveBeenCalledWith(
      'Writing',
      'Speaking',
      false,
      undefined,
      true
    );

    // Simulate blur
    mockTextArea.dispatchEvent(new Event('blur'));
    expect(agent.stateManager.playAnimation).toHaveBeenCalledWith(
      'CustomAnim',
      'Speaking',
      false,
      undefined,
      true
    );
  });
});
