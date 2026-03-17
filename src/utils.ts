/**
 * Fetches a resource and tracks its download progress.
 *
 * @param url - The URL to fetch.
 * @param options - Fetch options including an AbortSignal and an onProgress callback.
 * @returns A promise resolving to a Response object.
 */
export async function fetchWithProgress(
  url: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: {
      loaded: number;
      total: number;
      filename: string;
    }) => void;
  } = {},
): Promise<Response> {
  const { signal, onProgress } = options;
  const response = await fetch(url, { signal });

  if (!response.ok || !onProgress || !response.body) {
    return response;
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const filename = url.split("/").pop() || url;

  const reader = response.body.getReader();
  let loaded = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          loaded += value.byteLength;
          onProgress({ loaded, total, filename });
          controller.enqueue(value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      reader.cancel(reason);
    },
  });

  return new Response(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

/**
 * Estimates the mouth shape (viseme) for a given character or phoneme.
 * Based on Microsoft Agent standard mouth positions.
 *
 * @param char - The character or phoneme to estimate.
 * @returns The corresponding MouthType value.
 */
export function estimateViseme(char: string): string {
  const c = char.toLowerCase();

  // Closed: m, b, p, f, v
  if (/[mbpfv]/.test(c)) return "Closed";

  // OpenNarrow: w, u, o (as in hoop, hope, wet)
  if (/[wuo]/.test(c)) return "OpenNarrow";

  // OpenMedium: o (as in hot), oy (as in ahoy)
  if (/[oy]/.test(c)) return "OpenMedium";

  // OpenWide 4: a (as in hat), ow (as in how)
  if (/[a]/.test(c)) return "OpenWide4";

  // OpenWide 3: u (as in hut), e (as in head), ur (as in hurt)
  if (/[uer]/.test(c)) return "OpenWide3";

  // OpenWide 2: n, d, t, s, z, k, g
  if (/[ndtszkg]/.test(c)) return "OpenWide2";

  // OpenWide 1: g, l, i, e (as in hear)
  if (/[glihe]/.test(c)) return "OpenWide1";

  // Default to Closed for whitespace or punctuation
  if (/\s|[^a-z]/.test(c)) return "Closed";

  return "OpenWide1";
}
