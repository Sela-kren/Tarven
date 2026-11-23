/** A save's picture (save.ts writeThumb): the size it's kept at, and how it's taken from the game's canvas. */
export const THUMB_WIDTH = 256;
export const THUMB_HEIGHT = 144;
const THUMB_QUALITY = 0.72;

/**
 * A small JPEG of what the game's canvas shows, cropped from its middle to 16:9. Call straight after the frame is
 * drawn, in the same task: a WebGL canvas is only readable until the browser shows it.
 */
export function snapshotCanvas(source: HTMLCanvasElement): string | null {
  const { width, height } = source;
  if (width === 0 || height === 0) return null;
  const aspect = THUMB_WIDTH / THUMB_HEIGHT;
  const cropW = Math.min(width, height * aspect);
  const cropH = cropW / aspect;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, (width - cropW) / 2, (height - cropH) / 2, cropW, cropH, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  try {
    return canvas.toDataURL("image/jpeg", THUMB_QUALITY);
  } catch {
    return null;
  }
}
