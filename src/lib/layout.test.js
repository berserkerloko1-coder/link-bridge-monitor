import assert from "node:assert/strict";
import test from "node:test";
import { defaultLayout, gridClass, paneRects } from "./layout.js";

test("layout picks split at two cameras and grid after that", () => {
  assert.equal(defaultLayout(1), "single");
  assert.equal(defaultLayout(2), "split");
  assert.equal(defaultLayout(4), "grid");
});

test("two-pane portrait stacks, landscape sits side by side", () => {
  const portrait = paneRects(2, 400, 800, "portrait");
  assert.equal(portrait[0].h + portrait[1].h, 800);
  assert.equal(portrait[0].w, 400);
  const landscape = paneRects(2, 800, 400, "landscape");
  assert.equal(landscape[0].w + landscape[1].w, 800);
  assert.equal(landscape[0].h, 400);
});

test("grid covers the canvas with four cells", () => {
  const rects = paneRects(4, 1280, 720, "landscape");
  assert.equal(rects.length, 4);
  const area = rects.reduce((sum, r) => sum + r.w * r.h, 0);
  assert.equal(area, 1280 * 720);
});

test("single and auto grid classes stay one cell", () => {
  assert.match(gridClass(1, "auto"), /grid-cols-1/);
  assert.match(gridClass(2, "split"), /landscape:grid-cols-2/);
});
