/**
 * VisemeManager handles the decomposition of text into phonemes and maps them
 * to the 7 standard Microsoft Agent mouth shapes (visemes).
 *
 * It maintains a timeline of visemes for synchronized lip-syncing during speech.
 */
export class VisemeManager {
  /** Map of phonemes/digraphs to MS Agent mouth positions. */
  private static PHONEME_MAP: Record<string, string> = {
    // Digraphs (checked first)
    ear: "OpenWide1",
    ee: "OpenWide1",
    ea: "OpenWide3",
    ur: "OpenWide3",
    ow: "OpenWide4",
    oy: "OpenMedium",
    oo: "OpenNarrow",
    ch: "OpenWide2",
    sh: "OpenWide2",
    th: "OpenWide2",

    // Single characters
    m: "Closed",
    b: "Closed",
    f: "Closed",
    p: "Closed",
    v: "Closed",
    g: "OpenWide1",
    l: "OpenWide1",
    k: "OpenWide1",
    y: "OpenWide1",
    n: "OpenWide2",
    d: "OpenWide2",
    t: "OpenWide2",
    s: "OpenWide2",
    z: "OpenWide2",
    u: "OpenWide3",
    e: "OpenWide3",
    i: "OpenWide3",
    h: "OpenWide3",
    r: "OpenWide3",
    a: "OpenWide4",
    o: "OpenMedium", // Default for 'o', narrow handled by digraphs or heuristics
    w: "OpenNarrow",
  };

  /** Internal timeline of upcoming visemes. */
  private timeline: { type: string; start: number; end: number }[] = [];
  /** Base duration for each phoneme in milliseconds. */
  private readonly BASE_PHONEME_DURATION = 78;

  /**
   * Generates a viseme timeline for a given word.
   *
   * @param word - The word to decompose.
   * @param startTime - The absolute time when the word starts.
   * @param rate - The speech rate multiplier (from TTS or balloon).
   */
  public scheduleWord(word: string, startTime: number, rate: number = 1.0) {
    const phonemes = this.decomposeToPhonemes(word.toLowerCase());
    const duration = this.BASE_PHONEME_DURATION / rate;

    let current = startTime;
    for (const type of phonemes) {
      this.timeline.push({
        type,
        start: current,
        end: current + duration,
      });
      current += duration;
    }

    // Ensure we return to closed after the word
    this.timeline.push({
      type: "Closed",
      start: current,
      end: current + duration,
    });
  }

  /**
   * Returns the mouth shape for the given point in time.
   *
   * @param time - The current absolute time.
   * @returns The name of the mouth shape, or 'Closed' if none is scheduled.
   */
  public getVisemeAt(time: number): string {
    // Clean up old entries
    while (this.timeline.length > 0 && this.timeline[0].end < time) {
      this.timeline.shift();
    }

    const active = this.timeline.find((v) => time >= v.start && time <= v.end);
    return active ? active.type : "Closed";
  }

  /**
   * Clears all scheduled visemes.
   */
  public clear() {
    this.timeline = [];
  }

  /**
   * Heuristic decomposition of an English word into phoneme categories.
   */
  private decomposeToPhonemes(word: string): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < word.length) {
      let matched = false;

      // Check 3-char digraphs
      if (i + 3 <= word.length) {
        const tri = word.substring(i, i + 3);
        if (VisemeManager.PHONEME_MAP[tri]) {
          result.push(VisemeManager.PHONEME_MAP[tri]);
          i += 3;
          matched = true;
        }
      }

      // Check 2-char digraphs
      if (!matched && i + 2 <= word.length) {
        const di = word.substring(i, i + 2);
        if (VisemeManager.PHONEME_MAP[di]) {
          result.push(VisemeManager.PHONEME_MAP[di]);
          i += 2;
          matched = true;
        }
      }

      // Check single chars
      if (!matched) {
        const char = word[i];
        if (VisemeManager.PHONEME_MAP[char]) {
          result.push(VisemeManager.PHONEME_MAP[char]);
        } else if (/[a-z]/.test(char)) {
          // Default for vowels/consonants not in map
          result.push("OpenWide2");
        }
        i++;
      }
    }

    return result;
  }
}
