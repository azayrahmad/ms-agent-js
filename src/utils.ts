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

  if (!response.ok || !onProgress) {
    return response;
  }

  if (!response.body) {
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
 * Formats a Win32 BGR color string or hex string into a standard CSS hex color.
 */
export function formatColor(color: string): string {
  if (color.startsWith("#")) return color;
  // MSAgent uses hex colors, usually BGR.
  // Handle 0x prefix if present
  let raw = color.replace(/^0x/, "");

  // If it's a number, convert to hex
  if (/^\d+$/.test(raw)) {
    raw = parseInt(raw, 10).toString(16).padStart(6, "0");
  }

  if (raw.length === 8) {
    // Assuming AABBGGRR (Alpha is usually ignored or 0x00 for opaque in this context)
    const b = raw.substring(2, 4);
    const g = raw.substring(4, 6);
    const r = raw.substring(6, 8);
    return `#${r}${g}${b}`;
  }
  if (raw.length === 6) {
    // Assuming BBGGRR
    const b = raw.substring(0, 2);
    const g = raw.substring(2, 4);
    const r = raw.substring(4, 6);
    return `#${r}${g}${b}`;
  }
  return `#${raw}`;
}
