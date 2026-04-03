/**
 * Standard MS Agent mouth position names.
 */
export const MouthPosition = {
  Closed: "Closed",
  OpenWide1: "OpenWide1",
  OpenWide2: "OpenWide2",
  OpenWide3: "OpenWide3",
  OpenWide4: "OpenWide4",
  OpenMedium: "OpenMedium",
  OpenNarrow: "OpenNarrow",
} as const;

export type MouthPosition = (typeof MouthPosition)[keyof typeof MouthPosition];

/**
 * Phoneme-to-Viseme mapping based on standard MS Agent specifications.
 */
const DIGRAPH: Record<string, MouthPosition> = {
  th: MouthPosition.OpenMedium,
  ch: MouthPosition.OpenNarrow,
  sh: MouthPosition.OpenNarrow,
  ph: MouthPosition.OpenWide1,
  wh: MouthPosition.OpenNarrow,
  ck: MouthPosition.OpenWide2,
  ng: MouthPosition.OpenWide2,
  ll: MouthPosition.OpenWide2,
  ss: MouthPosition.OpenWide3,
  ee: MouthPosition.OpenWide3,
  oo: MouthPosition.OpenNarrow,
  ou: MouthPosition.OpenMedium,
  ow: MouthPosition.OpenMedium,
  oi: MouthPosition.OpenMedium,
  oy: MouthPosition.OpenMedium,
  au: MouthPosition.OpenWide4,
  aw: MouthPosition.OpenWide4,
  ai: MouthPosition.OpenWide3,
  ay: MouthPosition.OpenWide3,
  ea: MouthPosition.OpenWide3,
  oa: MouthPosition.OpenMedium,
  ie: MouthPosition.OpenWide3,
  ue: MouthPosition.OpenNarrow,
  ui: MouthPosition.OpenNarrow,
  ey: MouthPosition.OpenWide3,
};

const SINGLE: Record<string, MouthPosition> = {
  a: MouthPosition.OpenWide4,
  e: MouthPosition.OpenWide3,
  i: MouthPosition.OpenWide3,
  o: MouthPosition.OpenMedium,
  u: MouthPosition.OpenNarrow,
  y: MouthPosition.OpenWide3,
  b: MouthPosition.Closed,
  p: MouthPosition.Closed,
  m: MouthPosition.Closed,
  f: MouthPosition.OpenWide1,
  v: MouthPosition.OpenWide1,
  d: MouthPosition.OpenWide2,
  t: MouthPosition.OpenWide2,
  n: MouthPosition.OpenWide2,
  l: MouthPosition.OpenWide2,
  r: MouthPosition.OpenMedium,
  w: MouthPosition.OpenNarrow,
  s: MouthPosition.OpenWide3,
  z: MouthPosition.OpenWide3,
  k: MouthPosition.OpenWide2,
  g: MouthPosition.OpenWide2,
  c: MouthPosition.OpenWide2,
  q: MouthPosition.OpenWide2,
  x: MouthPosition.OpenWide2,
  h: MouthPosition.Closed,
  j: MouthPosition.OpenNarrow,
};

/**
 * Manager responsible for mapping text/phonemes to visemes (mouth positions).
 */
export class VisemeManager {
  /**
   * Converts a single word into a sequence of mouth positions.
   *
   * @param word - The word to analyze.
   * @returns An array of MouthPosition names.
   */
  public static wordToVisemes(word: string): MouthPosition[] {
    const s = word.toLowerCase().replace(/[^a-z]/g, "");
    const out: MouthPosition[] = [];
    let i = 0;
    while (i < s.length) {
      const dg = s.slice(i, i + 2);
      if (dg.length === 2 && DIGRAPH[dg]) {
        out.push(DIGRAPH[dg]);
        i += 2;
      } else {
        out.push(SINGLE[s[i]] || MouthPosition.Closed);
        i++;
      }
    }
    return out.length ? out : [MouthPosition.Closed];
  }

  /**
   * Calculates the full schedule of visemes for a given text.
   *
   * @param text - The text to analyze.
   * @param rate - Speech rate multiplier.
   * @returns An array of events with timing and viseme names.
   */
  public static buildFullSchedule(
    text: string,
    rate: number = 1.0,
  ): { ms: number; viseme: MouthPosition }[] {
    const MS_PER_PHONEME = 78;
    const MS_WORD_GAP = 55;
    const words = Array.from(text.matchAll(/[a-zA-Z'-]+/g));
    const events: { ms: number; viseme: MouthPosition }[] = [];
    let cursor = 0;

    words.forEach((m) => {
      const vis = this.wordToVisemes(m[0]);
      vis.forEach((v) => {
        events.push({
          ms: cursor,
          viseme: v,
        });
        cursor += MS_PER_PHONEME / rate;
      });
      cursor += MS_WORD_GAP / rate;
    });

    return events;
  }
}
