import { MouthType } from "./core/base/types";

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
 * Estimates a sequence of mouth shapes (visemes) for a given piece of text.
 * This is a lightweight, rule-based heuristic that maps character patterns to mouth types.
 *
 * @param text - The text to analyze.
 * @returns An array of mouth type strings.
 */
export function estimateVisemes(text: string): MouthType[] {
  const visemes: MouthType[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    if (!word) continue;

    // A simple heuristic: find groups of vowels and treat them as mouth-open events
    const syllables = word.toLowerCase().match(/[aeiouy]+|[^aeiouy]+/g) || [];

    for (const part of syllables) {
      const isVowel = /[aeiouy]/.test(part[0]);
      if (isVowel) {
        if (part.includes("o") || part.includes("u")) {
          visemes.push(MouthType.Narrow);
        } else if (part.includes("a") || part.includes("e")) {
          visemes.push(MouthType.WideOpen2);
        } else {
          visemes.push(MouthType.Medium);
        }
      } else {
        // Consonants
        if (/[mpb]/.test(part)) {
          visemes.push(MouthType.Closed);
        } else if (/[fvw]/.test(part)) {
          visemes.push(MouthType.Narrow);
        } else {
          // Keep it slightly open for other consonants to avoid too much flickering
          visemes.push(MouthType.Closed);
        }
      }
    }
    // Add a closed state between words
    visemes.push(MouthType.Closed);
  }

  return visemes;
}
