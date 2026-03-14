import { MSADPCMDecoder } from '../src/core/resources/MSADPCMDecoder';
import { describe, it, expect } from 'vitest';

describe('MSADPCMDecoder', () => {
  it('should decode a minimal MS ADPCM WAV sample', async () => {
    // Construct a valid MS ADPCM WAV header manually.
    // Let's create a reliable tiny buffer.
    const buffer = new ArrayBuffer(96);
    const view = new DataView(buffer);

    // RIFF Header
    view.setUint32(0, 0x46464952, true); // 'RIFF'
    view.setUint32(4, 88, true);         // Size
    view.setUint32(8, 0x45564157, true); // 'WAVE'

    // fmt chunk
    view.setUint32(12, 0x20746d66, true); // 'fmt '
    view.setUint32(16, 20, true);         // Size (16 + 4 for ADPCM)
    view.setUint16(20, 2, true);          // Format: MS ADPCM
    view.setUint16(22, 1, true);          // Mono
    view.setUint32(24, 11025, true);      // Sample Rate
    view.setUint32(28, 5512, true);       // Byte Rate
    view.setUint16(32, 48, true);         // Block Align (48 bytes total for this test)
    view.setUint16(34, 4, true);          // Bits per sample (ignored for ADPCM header)
    view.setUint16(36, 2, true);          // cbSize
    view.setUint16(38, 32, true);         // samplesPerBlock (32 for a small block)

    // data chunk
    view.setUint32(40, 0x61746164, true); // 'data'
    view.setUint32(44, 48, true);         // Size (1 block, but let's match buffer)

    // Block preamble (7 bytes for mono)
    view.setUint8(48, 0);                 // Predictor
    view.setInt16(49, 16, true);          // Delta
    view.setInt16(51, 1000, true);        // Sample 1
    view.setInt16(53, 500, true);         // Sample 2

    // Fill the rest of the block with 0s to avoid DataView bounds error
    for (let i = 55; i < 96; i++) {
        view.setUint8(i, 0);
    }

    const result = MSADPCMDecoder.decode(buffer);

    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.sampleRate).toBe(11025);
    expect(result.channels).toBe(1);

    // Check for non-silent samples (preamble samples should be there)
    const hasSound = Array.from(result.samples).some(s => s !== 0);
    expect(hasSound).toBe(true);
  });
});
