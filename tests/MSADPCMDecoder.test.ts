import { MSADPCMDecoder } from '../src/MSADPCMDecoder';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MSADPCMDecoder', () => {
  it('should decode Clippit audio file', async () => {
    const audioPath = path.resolve(__dirname, '../public/agents/Clippit/Audio/0000.wav');
    const buffer = fs.readFileSync(audioPath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const result = MSADPCMDecoder.decode(arrayBuffer);

    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.sampleRate).toBe(11025);
    expect(result.channels).toBe(1);

    // Check for non-silent samples
    const hasSound = Array.from(result.samples).some(s => s !== 0);
    expect(hasSound).toBe(true);
  });
});
