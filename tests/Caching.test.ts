/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../src/Agent';
import { AssetCache } from '../src/core/resources/Cache';
import { setupGlobals } from './setup';

describe('Asset Caching', () => {
    const agentName = 'Clippit';

    beforeEach(() => {
        AssetCache.clearMemory();
        setupGlobals();

        // Custom fetch mock for this test
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.endsWith('agent.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
                        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
                        animations: {},
                        states: {
                            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
                        }
                    }),
                    url: url
                });
            }
            if (url.endsWith('ColorTable.bmp')) {
                // Mock a minimal 8-bit BMP header for the parser
                const buffer = new ArrayBuffer(1024);
                const view = new DataView(buffer);
                view.setUint16(0, 0x4d42, true); // 'BM'
                view.setUint32(14, 40, true); // InfoHeader size

                return Promise.resolve({
                    ok: true,
                    headers: new Map([['content-type', 'image/bmp']]),
                    arrayBuffer: () => Promise.resolve(buffer),
                    url: url
                });
            }
            return Promise.resolve({ ok: false, status: 404 });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should share agent definitions across instances by default', async () => {
        const agent1 = await Agent.load(agentName);
        const agent2 = await Agent.load(agentName);

        // Fetch should only be called once for agent.json
        const fetchCalls = (global.fetch as any).mock.calls.filter((call: any) => call[0].endsWith('agent.json'));
        expect(fetchCalls.length).toBe(1);

        expect(agent1.definition).toBe(agent2.definition);

        agent1.destroy();
        agent2.destroy();
    });

    it('should not share agent definitions if useCache is false', async () => {
        const agent1 = await Agent.load(agentName, { useCache: false });
        const agent2 = await Agent.load(agentName, { useCache: false });

        const fetchCalls = (global.fetch as any).mock.calls.filter((call: any) => call[0].endsWith('agent.json'));
        expect(fetchCalls.length).toBe(2);

        agent1.destroy();
        agent2.destroy();
    });

    it('should share sprites across instances', async () => {
        let fetchCount = 0;
        const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
            fetchCount++;
            if (url.endsWith('agent.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        character: { width: 100, height: 100, colorTable: 'ColorTable.bmp' },
                        balloon: { borderColor: '0', backColor: 'ffffff', foreColor: '0', fontName: 'Arial', fontHeight: 12, numLines: 2, charsPerLine: 20 },
                        animations: {},
                        states: {
                            'IdlingLevel1': { name: 'IdlingLevel1', animations: [] }
                        },
                        atlas: { 'test.bmp': { x: 0, y: 0, w: 10, h: 10 } }
                    }),
                    url: url
                });
            }
            if (url.endsWith('agent.webp') || url.endsWith('agent.png')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    blob: () => Promise.resolve(new Blob()),
                    url: url
                });
            }
            if (url.endsWith('ColorTable.bmp')) {
                 // Mock a minimal 8-bit BMP header for the parser
                 const buffer = new ArrayBuffer(1024);
                 const view = new DataView(buffer);
                 view.setUint16(0, 0x4d42, true); // 'BM'
                 view.setUint32(14, 40, true); // InfoHeader size

                return Promise.resolve({
                    ok: true,
                    headers: new Map([['content-type', 'image/bmp']]),
                    arrayBuffer: () => Promise.resolve(buffer),
                    url: url
                });
            }
            return Promise.resolve({ ok: false, status: 404 });
        });
        global.fetch = fetchSpy;

        // Mock URL.createObjectURL and URL.revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:abc');
        global.URL.revokeObjectURL = vi.fn();

        // Mock Image
        (global as any).Image = class {
            onload: any;
            _src: string = '';
            set src(v: string) {
                this._src = v;
                setTimeout(() => this.onload(), 0);
            }
            get src() { return this._src; }
        };

        const agent1 = await Agent.load(agentName);
        const agent2 = await Agent.load(agentName);

        // Both agents should have the same spriteSheet instance if cached
        const sheet1 = (agent1.spriteManager as any).spriteSheet;
        const sheet2 = (agent2.spriteManager as any).spriteSheet;

        expect(sheet1).toBeDefined();
        expect(sheet1).toBe(sheet2);

        const spriteSheetCalls = fetchSpy.mock.calls.filter((call: any) => call[0].endsWith('agent.webp') || call[0].endsWith('agent.png'));
        // It should only fetch once due to caching
        expect(spriteSheetCalls.length).toBe(1);

        agent1.destroy();
        agent2.destroy();
    });
});
