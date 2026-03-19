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
  if (typeof window === 'undefined') {
    vi.stubGlobal('window', { _innerWidth: 1024, _innerHeight: 768 });
  } else {
    (window as any)._innerWidth = 1024;
    (window as any)._innerHeight = 768;
  }

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

  const mockWindow: any = {
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
    get innerWidth() { return (window as any)._innerWidth ?? 1024; },
    set innerWidth(v) { (window as any)._innerWidth = v; },
    get innerHeight() { return (window as any)._innerHeight ?? 768; },
    set innerHeight(v) { (window as any)._innerHeight = v; },
    performance: {
      now: vi.fn().mockImplementation(() => Date.now())
    },
    addEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
      if (!this.listeners) this.listeners = {};
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(listener);
    }),
    removeEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
      if (!this.listeners || !this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter((l: any) => l !== listener);
    }),
    dispatchEvent: vi.fn().mockImplementation(function(this: any, event) {
      const type = event.type;
      const listeners = this.listeners?.[type] || [];
      listeners.forEach((l: any) => l(event));
    }),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
  };

  vi.stubGlobal('window', mockWindow);
  vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation(function (this: any, text) {
    this.text = text;
    this.onend = null;
    this.onboundary = null;
  }));

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
        attributes: {},
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
        addEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
          if (!this.listeners) this.listeners = {};
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type].push(listener);
        }),
        removeEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
          if (!this.listeners || !this.listeners[type]) return;
          this.listeners[type] = this.listeners[type].filter((l: any) => l !== listener);
        }),
        dispatchEvent: vi.fn().mockImplementation(function(this: any, event) {
          const type = event.type;
          const listeners = this.listeners?.[type] || [];
          listeners.forEach((l: any) => l(event));
        }),
        focus: vi.fn().mockImplementation(function(this: any) {
          const event = { type: 'focus' };
          const listeners = this.listeners?.[event.type] || [];
          listeners.forEach((l: any) => l(event));
        }),
        blur: vi.fn().mockImplementation(function(this: any) {
          const event = { type: 'blur' };
          const listeners = this.listeners?.[event.type] || [];
          listeners.forEach((l: any) => l(event));
        }),
        click: vi.fn().mockImplementation(function(this: any) {
          const listeners = this.listeners?.['click'] || [];
          listeners.forEach((l: any) => l({ target: this, currentTarget: this, preventDefault: () => {} }));
        }),
        setAttribute: vi.fn().mockImplementation(function(this: any, name, val) {
          this.attributes[name] = val;
        }),
        getAttribute: vi.fn().mockImplementation(function(this: any, name) {
          return this.attributes[name] || null;
        }),
        hasAttribute: vi.fn().mockImplementation(function(this: any, name) {
          return !!this.attributes[name];
        }),
        closest: vi.fn().mockImplementation(function(this: any, selector) {
          if (this.nodeName.toLowerCase() === selector) return this;
          return null;
        }),
        querySelector: vi.fn().mockImplementation(function(this: any, selector: string) {
          if (selector === '.ask-checkbox' && this.lastQueriedCheckbox) {
              if (this.lastQueriedCheckbox.checked === undefined) this.lastQueriedCheckbox.checked = false;
              return this.lastQueriedCheckbox;
          }
          // In the mock environment, we might be querying from the balloon container,
          // but our showHtml/speak logic puts content into _contentEl.
          // Since we don't have a real DOM/Shadow DOM, we'll check if the target has shadowNodes or childNodes
          // and also check any last queried elements we've stored.

          const findInNodes = (nodes: any[]): any => {
              for (const node of nodes) {
                  if (selector === 'textarea' && node.nodeName === 'TEXTAREA') return node;
                  if (selector === '.ask-checkbox' && node.className && typeof node.className === 'string' && node.className.includes('ask-checkbox')) return node;
                  if (node.nodeName === 'INPUT' && node.attributes?.type === 'checkbox') return node;
                  if (selector === 'input[type="checkbox"]' && node.nodeName === 'INPUT' && node.attributes?.type === 'checkbox') return node;
                  if (selector === '.clippy-choices' && node.className.includes('clippy-choices')) return node;
                  if (selector === '.clippy-input' && node.className.includes('clippy-input')) return node;
                  const found = findInNodes(node.childNodes || []);
                  if (found) return found;
                  const foundShadow = findInNodes(node.shadowNodes || []);
                  if (foundShadow) return foundShadow;
              }
              return null;
          };

          const fromNodes = findInNodes(this.childNodes || []) || findInNodes(this.shadowNodes || []);
          if (fromNodes) {
              if (selector === 'textarea') this.lastQueriedTextarea = fromNodes;
              if (selector === '.clippy-choices') this.lastQueriedChoicesList = fromNodes;
              return fromNodes;
          }

          // Fallback to legacy mock behavior if not found in nodes (for cases where nodes aren't properly linked)
          if (selector === 'textarea' || selector === '.clippy-choices' || selector === '.clippy-input' || selector === '.ask-checkbox') {
            const tag = selector === 'textarea' ? 'textarea' : (selector === '.clippy-choices' ? 'ul' : (selector === '.ask-checkbox' ? 'input' : 'div'));
            const el = document.createElement(tag);
            if (selector.startsWith('.')) el.className = selector.substring(1).split(' ')[0];
            if (selector === '.ask-checkbox') {
                el.setAttribute('type', 'checkbox');
                el.checked = false;
            }
            if (selector === 'textarea') this.lastQueriedTextarea = el;
            if (selector === '.clippy-choices') this.lastQueriedChoicesList = el;
            if (selector === '.ask-checkbox') this.lastQueriedCheckbox = el;
            if (!(el as any).listeners) (el as any).listeners = {};
            return el;
          }
          return null;
        }),
        querySelectorAll: vi.fn().mockImplementation(function(this: any, selector: string) {
          const findAllInNodes = (nodes: any[], results: any[]) => {
              for (const node of nodes) {
                  if (selector === '.custom-button' && node.className.includes('custom-button')) results.push(node);
                  if (selector === '.clippy-choices' && node.className.includes('clippy-choices')) results.push(node);
                  findAllInNodes(node.childNodes || [], results);
                  findAllInNodes(node.shadowNodes || [], results);
              }
          };

          const results: any[] = [];
          findAllInNodes(this.childNodes || [], results);
          findAllInNodes(this.shadowNodes || [], results);

          if (results.length > 0) {
              if (selector === '.custom-button') this.lastQueriedCustomButtons = results;
              if (selector === '.clippy-choices' && results.length > 0) this.lastQueriedChoicesList = results[0];
              return results;
          }

          // Fallback to legacy mock behavior
           if (selector === '.custom-button') {
            const el1 = document.createElement('button');
            el1.className = 'custom-button';
            el1.setAttribute('data-index', '0');
            const el2 = document.createElement('button');
            el2.className = 'custom-button';
            el2.setAttribute("data-index", "1");
            const res = [el1, el2];
            this.lastQueriedCustomButtons = res;
            return res;
          }
          if (selector === '.clippy-choices') {
            const el = document.createElement('ul');
            el.className = 'clippy-choices';
            if (!(el as any).listeners) (el as any).listeners = {};
            this.lastQueriedChoicesList = el;
            return [el];
          }
          return [];
        }),
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
        addEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
          if (!this.listeners) this.listeners = {};
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type].push(listener);
        }),
        removeEventListener: vi.fn().mockImplementation(function(this: any, type, listener) {
          if (!this.listeners || !this.listeners[type]) return;
          this.listeners[type] = this.listeners[type].filter((l: any) => l !== listener);
        }),
  });

  vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  vi.stubGlobal('performance', {
    now: () => Date.now()
  });
};
