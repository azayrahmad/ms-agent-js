import { vi } from 'vitest';

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
}

export const setupGlobals = (mockDefinition?: any) => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    let result = mockDefinition || {
      character: { width: 100, height: 100, colorTable: 'colortable.bmp' },
      balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
      animations: {},
      states: {
        'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
      }
    };
    if (url.endsWith('agent.json')) {
      if ((window as any).__mockFetchFailAgentJson) {
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
        body: null
      });
    } else if (url.endsWith('.acd')) {
      // Return 404 for agent.json to trigger fallback to ACD in Agent.load tests that check this
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(result),
        text: () => Promise.resolve('Mock ACD Content'),
        headers: new Map(),
        body: null
      });
    } else {
      // For other files, we might want to return 404 to trigger fallbacks in Agent.load
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
    }
  }));

  vi.stubGlobal('window', {
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    requestAnimationFrame: vi.fn().mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16)),
    cancelAnimationFrame: vi.fn().mockImplementation((id) => clearTimeout(id)),
    navigator: { userAgent: 'test' },
    speechSynthesis: {
      getVoices: vi.fn().mockReturnValue([]),
      speak: vi.fn(),
      cancel: vi.fn(),
      speaking: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    performance: {
      now: vi.fn().mockImplementation(() => Date.now())
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
  });

  vi.stubGlobal('document', {
    createElementNS: vi.fn().mockImplementation((ns, tag) => {
      return {
        style: {},
        appendChild: vi.fn(),
        setAttribute: vi.fn(),
        className: '',
        querySelector: vi.fn(),
        childNodes: [],
      };
    }),
    createElement: vi.fn().mockImplementation((tag) => {
      const el: any = {
        style: {},
        nodeName: tag.toUpperCase(),
        appendChild: vi.fn().mockImplementation((child) => {
          if (el.shadowNodes) el.shadowNodes.push(child);
          if (el.childNodes) el.childNodes.push(child);
        }),
        className: '',
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn().mockReturnValue(false),
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelector: vi.fn(),
        getBoundingClientRect: vi.fn().mockReturnValue({
          width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100
        }),
        offsetWidth: 100,
        offsetHeight: 100,
        childNodes: [],
      };

      if (tag === 'canvas') {
        el.getContext = vi.fn().mockReturnValue({
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
          putImageData: vi.fn(),
          createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
        });
        el.width = 100;
        el.height = 100;
      } else if (tag === 'style') {
        el.textContent = '';
      } else if (tag === 'div') {
        el.attachShadow = vi.fn().mockReturnValue({
          appendChild: vi.fn().mockImplementation((child) => {
            if (el.shadowNodes) el.shadowNodes.push(child);
          }),
          host: el,
          get childNodes() { return el.shadowNodes || []; }
        });
        el.shadowNodes = [];
      }
      return el;
    }),
    body: {
      appendChild: vi.fn()
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  vi.stubGlobal('performance', {
    now: () => Date.now()
  });
};
