/**
 * MSADPCMDecoder class for decoding Microsoft ADPCM wav files into raw PCM samples.
 * This decoder handles the adaptive differential pulse-code modulation used in legacy
 * Microsoft Agent sound effects.
 *
 * Based on the specification at https://wiki.multimedia.cx/index.php/Microsoft_ADPCM.
 */
export class MSADPCMDecoder {
  /** Table for delta adaptation based on 4-bit nibbles. */
  private static readonly adaptationTable = [
    230, 230, 230, 230, 307, 409, 512, 614,
    768, 614, 512, 409, 307, 230, 230, 230
  ];

  /** Coefficient table 1 for the linear prediction algorithm. */
  private static readonly coeff1Table = [256, 512, 0, 192, 240, 460, 392];
  /** Coefficient table 2 for the linear prediction algorithm. */
  private static readonly coeff2Table = [0, -256, 0, 64, 0, -208, -232];

  /**
   * Decodes a Microsoft ADPCM encoded ArrayBuffer into a Float32Array of PCM samples.
   *
   * @param buffer - The ArrayBuffer containing the raw WAV file data.
   * @returns An object containing the decoded samples, sample rate, and number of channels.
   * @throws Error if the file is not a valid RIFF/WAVE file or uses an unsupported format.
   */
  public static decode(buffer: ArrayBuffer): { samples: Float32Array; sampleRate: number; channels: number } {
    const view = new DataView(buffer);

    // RIFF Header check
    if (view.getUint32(0, true) !== 0x46464952) throw new Error('Not a RIFF file');
    if (view.getUint32(8, true) !== 0x45564157) throw new Error('Not a WAVE file');

    let pos = 12;
    let fmt: any = {};
    let dataOffset = 0;
    let dataLength = 0;

    // Parse WAV chunks
    while (pos < buffer.byteLength) {
      const chunkId = view.getUint32(pos, true);
      const chunkSize = view.getUint32(pos + 4, true);
      pos += 8;

      if (chunkId === 0x20746d66) { // 'fmt ' chunk
        fmt.audioFormat = view.getUint16(pos, true);
        fmt.numChannels = view.getUint16(pos + 2, true);
        fmt.sampleRate = view.getUint32(pos + 4, true);
        fmt.byteRate = view.getUint32(pos + 8, true);
        fmt.blockAlign = view.getUint16(pos + 12, true);
        fmt.bitsPerSample = view.getUint16(pos + 14, true);
        // Extra parameters specific to ADPCM
        if (chunkSize > 16) {
            fmt.cbSize = view.getUint16(pos + 16, true);
            fmt.samplesPerBlock = view.getUint16(pos + 18, true);
        }
      } else if (chunkId === 0x61746164) { // 'data' chunk
        dataOffset = pos;
        dataLength = chunkSize;
      }
      pos += chunkSize;
      if (chunkSize % 2 !== 0) pos++; // Chunk padding to 2 bytes
    }

    if (fmt.audioFormat !== 2) {
        throw new Error(`Unsupported audio format: ${fmt.audioFormat}. Only MS ADPCM (2) is supported.`);
    }

    // Initialize output buffer
    const numBlocks = Math.floor(dataLength / fmt.blockAlign);
    const samplesPerBlock = fmt.samplesPerBlock;
    const totalSamples = numBlocks * samplesPerBlock;
    const output = new Float32Array(totalSamples);

    let outIdx = 0;
    for (let b = 0; b < numBlocks; b++) {
      const blockPos = dataOffset + b * fmt.blockAlign;
      this.decodeBlock(view, blockPos, fmt, output, outIdx);
      outIdx += samplesPerBlock;
    }

    return {
      samples: output,
      sampleRate: fmt.sampleRate,
      channels: fmt.numChannels
    };
  }

  /**
   * Decodes a single block of ADPCM data.
   */
  private static decodeBlock(view: DataView, pos: number, fmt: any, output: Float32Array, outIdx: number): void {
    if (fmt.numChannels === 1) {
      this.decodeMonoBlock(view, pos, fmt, output, outIdx);
    } else {
      // MS Agent sounds are typically mono. Stereo is currently unsupported.
      throw new Error('Stereo MS ADPCM not implemented');
    }
  }

  /**
   * Decodes a single block of monaural ADPCM data.
   * Each block contains a preamble with initial state and then nibble-encoded samples.
   */
  private static decodeMonoBlock(view: DataView, pos: number, fmt: any, output: Float32Array, outIdx: number): void {
    // Block preamble
    const predictor = view.getUint8(pos);
    let delta = view.getInt16(pos + 1, true);
    let sample1 = view.getInt16(pos + 3, true);
    let sample2 = view.getInt16(pos + 5, true);

    const coeff1 = this.coeff1Table[predictor];
    const coeff2 = this.coeff2Table[predictor];

    // The first two samples of the block are stored directly in the preamble
    output[outIdx++] = sample2 / 32768.0;
    output[outIdx++] = sample1 / 32768.0;

    let bytePos = pos + 7;
    const samplesToDecode = fmt.samplesPerBlock - 2;

    for (let i = 0; i < samplesToDecode; i++) {
      let nibble: number;
      // Extract 4-bit nibble from the byte stream
      if (i % 2 === 0) {
        nibble = view.getUint8(bytePos) >> 4;
      } else {
        nibble = view.getUint8(bytePos++) & 0x0F;
      }

      // Convert to signed 4-bit integer
      if (nibble & 0x08) nibble -= 16;

      // Linear prediction algorithm
      let prediction = Math.floor((sample1 * coeff1 + sample2 * coeff2) / 256);
      prediction += nibble * delta;

      // Clamp prediction to 16-bit range
      const currentSample = Math.max(-32768, Math.min(32767, prediction));

      // Normalize to Float32 range [-1.0, 1.0]
      output[outIdx++] = currentSample / 32768.0;

      // Update state for next iteration
      sample2 = sample1;
      sample1 = currentSample;

      // Update adaptive delta
      delta = Math.floor((this.adaptationTable[nibble + (nibble < 0 ? 16 : 0)] * delta) / 256);
      if (delta < 16) delta = 16;
    }
  }
}
