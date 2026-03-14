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
