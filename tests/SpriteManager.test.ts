import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpriteManager } from '../src/core/resources/SpriteManager';
import { AssetCache } from '../src/core/resources/Cache';
import { setupGlobals } from './setup';

describe('SpriteManager', () => {
    const mockDefinition: any = {
        character: {
            width: 100,
            height: 100,
            colorTable: 'ColorTable.bmp',
            transparency: 0
        },
        animations: {}
    };

    beforeEach(() => {
        AssetCache.clearMemory();
        setupGlobals();
        vi.clearAllMocks();
    });

    it('should initialize with transparency color if no atlas is provided', async () => {
        const buffer = new ArrayBuffer(1024);
        const view = new DataView(buffer);
        view.setUint16(0, 0x4d42, true); // 'BM'
        view.setUint32(14, 40, true); // InfoHeader size
        // Palette at 14+40 = 54. Index 0: B, G, R, Res
        view.setUint8(54, 255); // B
        view.setUint8(55, 0);   // G
        view.setUint8(56, 128); // R

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            headers: new Map([['content-type', 'image/bmp']]),
            arrayBuffer: () => Promise.resolve(buffer)
        }));

        const sm = new SpriteManager('/agent', mockDefinition);
        await sm.init();

        expect((sm as any).transparencyColor).toEqual({ r: 128, g: 0, b: 255 });
    });

    it('should load sprite sheet if atlas is provided', async () => {
        const atlasDefinition = {
            ...mockDefinition,
            atlas: { 'test.bmp': { x: 0, y: 0, w: 10, h: 10 } }
        };

        const mockBlob = new Blob([''], { type: 'image/webp' });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
        }));

        global.URL.createObjectURL = vi.fn(() => 'blob:abc');
        global.URL.revokeObjectURL = vi.fn();

        const mockImg = { onload: null as any };
        (global as any).Image = function() {
            setTimeout(() => mockImg.onload(), 0);
            return mockImg;
        };

        const sm = new SpriteManager('/agent', atlasDefinition);
        await sm.init();

        expect((sm as any).spriteSheet).toBeDefined();
    });

    it('should handle BMP to canvas conversion for 24-bit BMP', () => {
        const sm = new SpriteManager('/agent', mockDefinition);

        // Minimal 24-bit BMP: Header(14) + Info(40) + Pixels
        const width = 2;
        const height = 2;
        const rowSize = Math.floor((24 * width + 31) / 32) * 4;
        const buffer = new ArrayBuffer(14 + 40 + (rowSize * height));
        const view = new DataView(buffer);

        view.setUint16(0, 0x4d42, true); // BM
        view.setUint32(2, buffer.byteLength, true); // Size
        view.setUint32(10, 14 + 40, true); // Offset

        view.setUint32(14, 40, true); // Info size
        view.setInt32(18, width, true);
        view.setInt32(22, height, true);
        view.setUint16(26, 1, true); // Planes
        view.setUint16(28, 24, true); // BitCount

        const canvas = (sm as any).bmpToCanvas(buffer);
        expect(canvas.width).toBe(2);
        expect(canvas.height).toBe(2);
    });

    it('should handle BMP to canvas conversion for 8-bit BMP', () => {
        const sm = new SpriteManager('/agent', mockDefinition);

        const width = 2;
        const height = 2;
        const rowSize = Math.floor((8 * width + 31) / 32) * 4;
        const paletteSize = 256 * 4;
        const buffer = new ArrayBuffer(14 + 40 + paletteSize + (rowSize * height));
        const view = new DataView(buffer);

        view.setUint16(0, 0x4d42, true);
        view.setUint32(10, 14 + 40, true); // Offset to pixels should be 1078, but code uses view.getUint32(10)
        view.setUint32(10, 14 + 40 + paletteSize, true);
        view.setUint32(14, 40, true);
        view.setInt32(18, width, true);
        view.setInt32(22, height, true);
        view.setUint16(28, 8, true);

        const canvas = (sm as any).bmpToCanvas(buffer);
        expect(canvas.width).toBe(2);
        expect(canvas.height).toBe(2);
    });

    it('should draw frame from atlas correctly', () => {
        const atlasDefinition = {
            ...mockDefinition,
            atlas: { 'frame1.bmp': { x: 10, y: 10, w: 20, h: 20, trimX: 2, trimY: 2 } }
        };
        const sm = new SpriteManager('/agent', atlasDefinition);
        const mockSheet = { width: 100, height: 100 };
        (sm as any).spriteSheet = mockSheet;

        const mockCtx = {
            drawImage: vi.fn()
        };

        const frame = {
            images: [{ filename: 'frame1.bmp', offsetX: 5, offsetY: 5 }]
        };

        sm.drawFrame(mockCtx as any, frame as any, 100, 100, 1);

        expect(mockCtx.drawImage).toHaveBeenCalledWith(
            mockSheet,
            10, 10, 20, 20,
            100 + (5 + 2), 100 + (5 + 2),
            20, 20
        );
    });
});
