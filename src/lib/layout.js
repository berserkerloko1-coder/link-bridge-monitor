export const MAX_CAMERAS = 4;

export function defaultLayout(count) {
  if (count <= 1) return "single";
  if (count === 2) return "split";
  return "grid";
}

export function gridClass(count, layoutMode) {
  const mode = layoutMode === "auto" ? defaultLayout(count) : layoutMode;
  if (mode === "single" || count <= 1) return "grid-cols-1 grid-rows-1";
  if (mode === "split" || count === 2) {
    return "grid-cols-1 grid-rows-2 landscape:grid-cols-2 landscape:grid-rows-1";
  }
  return "grid-cols-2 grid-rows-2";
}

export function paneRects(count, width, height, orientation) {
  const n = Math.max(1, Math.min(MAX_CAMERAS, count | 0));
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  if (n === 1) return [{ x: 0, y: 0, w, h }];
  if (n === 2) {
    if (orientation === "landscape") {
      const half = Math.floor(w / 2);
      return [
        { x: 0, y: 0, w: half, h },
        { x: half, y: 0, w: w - half, h },
      ];
    }
    const half = Math.floor(h / 2);
    return [
      { x: 0, y: 0, w, h: half },
      { x: 0, y: half, w, h: h - half },
    ];
  }
  const col = Math.floor(w / 2);
  const row = Math.floor(h / 2);
  const cells = [
    { x: 0, y: 0, w: col, h: row },
    { x: col, y: 0, w: w - col, h: row },
    { x: 0, y: row, w: col, h: h - row },
    { x: col, y: row, w: w - col, h: h - row },
  ];
  return cells.slice(0, n);
}

export function orientationOf(width, height) {
  return width >= height ? "landscape" : "portrait";
}
