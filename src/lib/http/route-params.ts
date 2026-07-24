/** Extracts the path segment immediately following `marker` from a request URL. */
export function segmentAfter(request: Request, marker: string): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf(marker);
  if (index === -1 || index + 1 >= segments.length) {
    throw new Error(`URL path is missing a segment after "${marker}": ${request.url}`);
  }
  return segments[index + 1];
}
