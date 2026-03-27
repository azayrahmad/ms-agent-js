/**
 * Digraph mapping for English phoneme to viseme conversion.
 */
const DIGRAPH: Record<string, string> = {
  th: "OH",
  ch: "OO",
  sh: "OO",
  ph: "FF",
  wh: "OO",
  ck: "DD",
  ng: "DD",
  ll: "DD",
  ss: "EE",
  ee: "EE",
  oo: "OO",
  ou: "OH",
  ow: "OH",
  oi: "OH",
  oy: "OH",
  au: "AA",
  aw: "AA",
  ai: "EE",
  ay: "EE",
  ea: "EE",
  oa: "OH",
  ie: "EE",
  ue: "OO",
  ui: "OO",
  ey: "EE",
};

/**
 * Single character mapping for English phoneme to viseme conversion.
 */
const SINGLE: Record<string, string> = {
  a: "AA",
  e: "EE",
  i: "EE",
  o: "OH",
  u: "OO",
  y: "EE",
  b: "PP",
  p: "PP",
  m: "PP",
  f: "FF",
  v: "FF",
  d: "DD",
  t: "DD",
  n: "DD",
  l: "DD",
  r: "OH",
  w: "OO",
  s: "EE",
  z: "EE",
  k: "DD",
  g: "DD",
  c: "DD",
  q: "DD",
  x: "DD",
  h: "REST",
  j: "OO",
};

/**
 * Mapping from viseme codes to standard Microsoft Agent mouth shapes.
 */
const VISEME_TO_MOUTH: Record<string, string> = {
  REST: "Closed",
  PP: "Closed",
  FF: "OpenWide1",
  DD: "OpenWide2",
  EE: "OpenWide3",
  AA: "OpenWide4",
  OH: "OpenMedium",
  OO: "OpenNarrow",
};

/**
 * VisemeManager class for handling lip-sync logic.
 * It maps text and phonemes to standard MS Agent mouth positions.
 */
export class VisemeManager {
  private activeTimers: number[] = [];

  /**
   * Converts a single word into a sequence of viseme codes.
   *
   * @param word - The word to convert.
   * @returns An array of viseme code strings.
   */
  public getVisemesForWord(word: string): string[] {
    const s = word.toLowerCase().replace(/[^a-z]/g, "");
    const out: string[] = [];
    let i = 0;
    while (i < s.length) {
      const dg = s.slice(i, i + 2);
      if (dg.length === 2 && DIGRAPH[dg]) {
        out.push(DIGRAPH[dg]);
        i += 2;
      } else {
        out.push(SINGLE[s[i]] || "REST");
        i++;
      }
    }
    return out.length ? out : ["REST"];
  }

  /**
   * Maps a internal viseme code to a standard MS Agent mouth type name.
   *
   * @param viseme - The viseme code (e.g., 'AA', 'PP').
   * @returns The corresponding mouth type (e.g., 'OpenWide4', 'Closed').
   */
  public mapVisemeToMouthType(viseme: string): string {
    return VISEME_TO_MOUTH[viseme] || "Closed";
  }

  /**
   * Schedules a timeline of mouth shape changes for a sequence of visemes.
   *
   * @param visemes - Array of viseme codes.
   * @param rate - Speech rate multiplier.
   * @param onViseme - Callback triggered for each viseme change.
   */
  public scheduleTimeline(
    visemes: string[],
    rate: number,
    onViseme: (mouthType: string) => void,
  ): void {
    this.stop();

    const MS_PER_PHONEME = 78;
    const msPer = Math.max(50, MS_PER_PHONEME / rate);

    visemes.forEach((v, i) => {
      const timer = setTimeout(() => {
        onViseme(this.mapVisemeToMouthType(v));
      }, i * msPer) as any;
      this.activeTimers.push(timer);
    });
  }

  /**
   * Stops all active viseme timers.
   */
  public stop(): void {
    this.activeTimers.forEach((t) => clearTimeout(t));
    this.activeTimers = [];
  }
}
