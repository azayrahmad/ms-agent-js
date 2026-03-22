import { vi } from 'vitest';
import '@testing-library/jest-dom';

export class MockAudioContext {
  createBuffer = vi.fn();
  decodeAudioData = vi.fn().mockResolvedValue({});
  createBufferSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    start: vi.fn(),
    buffer: null,
    onended: null,
    stop: vi.fn()
  });
  destination = {};
  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
}

export const setupGlobals = (mockDefinition?: any) => {
  const root = globalThis as any;

  // Mock Web Audio API if not present in JSDOM
  if (typeof root.AudioContext === 'undefined') {
    root.AudioContext = MockAudioContext;
    root.webkitAudioContext = MockAudioContext;
  }

  // Mock Speech Synthesis
  if (typeof root.speechSynthesis === 'undefined') {
      root.speechSynthesis = {
        getVoices: vi.fn().mockReturnValue([]),
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
  }

  if (typeof root.SpeechSynthesisUtterance === 'undefined') {
      root.SpeechSynthesisUtterance = function (this: any, text: string) {
        this.text = text;
        this.onend = null;
        this.onboundary = null;
      };
  }

  // Mock Fetch
  root.fetch = vi.fn().mockImplementation((url: string) => {
    let result = mockDefinition || {
      character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
      balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
      animations: {},
      states: {
        'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
      }
    };
    if (url.endsWith('agent.json')) {
      if (root.__mockFetchFailAgentJson) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(result),
        text: () => Promise.resolve(JSON.stringify(result)),
        headers: new Map(),
        body: null,
        blob: () => Promise.resolve(new Blob([''], { type: 'image/png' })),
        url: url
      });
    } else if (url.endsWith('.webp') || url.endsWith('.png') || url.endsWith('.bmp')) {
      const buffer = new ArrayBuffer(54);
      const view = new DataView(buffer);
      view.setUint16(0, 0x4D42, true); // BM
      view.setUint32(14, 40, true); // infoHeaderSize
      view.setInt32(18, 1, true); // width
      view.setInt32(22, 1, true); // height
      view.setUint16(28, 24, true); // bitCount
      return Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([buffer], { type: 'image/bmp' })),
        arrayBuffer: () => Promise.resolve(buffer),
        headers: new Map([['content-type', 'image/bmp']]),
        url: url
      });
    } else if (url.endsWith('.acd')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(result),
        text: () => Promise.resolve('Mock ACD Content'),
        headers: new Map(),
        body: null
      });
    } else {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
    }
  });

  // Mock Image
  root.Image = function() {
    const img: any = {
      onload: null,
      onerror: null,
      src: '',
    };
    setTimeout(() => {
      if (img.onload) img.onload();
    }, 10);
    return img;
  };

  // Mock URL
  if (!root.URL.createObjectURL) {
      root.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
      root.URL.revokeObjectURL = vi.fn();
  }

  // Use the one from environment if possible, or stub it
  if (!root.requestAnimationFrame) {
      root.requestAnimationFrame = (cb: any) => setTimeout(() => cb(performance.now()), 16);
      root.cancelAnimationFrame = (id: any) => clearTimeout(id);
  }
};
