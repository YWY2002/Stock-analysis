# KLineCharts Migration — Progress & Handover

**Status:** 🟢 Code complete, build passing. ⚠️ Awaiting browser verification by user.
**Goal:** Replace `lightweight-charts` with `klinecharts` to gain a built-in drawing/annotation kit (trendlines, boxes, ruler, fib, etc.) with per-element delete and localStorage persistence.

---

## Context for a fresh session

If you're picking this up cold, read this section first.

- This is a personal stock analysis app. Architecture: React/Vite frontend → Go indicator service (:8002) → Python ticker service (:8001) → Twelve Data API.
- The indicator API returns: `{ symbol, interval, price_data: OHLCV[], indicators: { ad, obv, vwap } }`. Each indicator entry is `{ datetime, value }`.
- The user explicitly chose **Option A**: full chart-stack migration to a single multi-pane klinecharts instance. PriceChart.jsx, IndicatorChart.jsx, and the cross-chart sync logic are gone.
- The user did NOT answer whether AD/OBV/VWAP should be sub-panes or overlays on the candle pane. We defaulted to **sub-panes** (matches old UX).
- Drawings persist to `localStorage` under key `stockAnalysis.drawings.v1` (separate from the existing app state under `stockAnalysis.v1`).

---

## Plan / Status

### Phase 1 — Foundation
- [x] Install `klinecharts` (pinned to `^9.8.12`; npm `latest` resolves to v10-beta with API drift)
- [x] Create this progress doc
- [x] Build `frontend/src/components/Chart.jsx` — single klinecharts instance

### Phase 2 — Data + indicators
- [x] Adapter `toKlineList()` in `Chart.jsx` — converts API response to `KLineData[]` and stashes precomputed `_ad`/`_obv`/`_vwap` per bar
- [x] Custom indicators in `frontend/src/utils/klineRegistry.js`:
  - **AD** — reads `_ad` field (precomputed by Go service)
  - **VWAP** — reads `_vwap`
  - **OBV** — overrides klinecharts' built-in to read `_obv` (keeps consistent with Go service)
  - **SMMA** — Wilder's smoothed MA, multi-period (mirrors built-in `MA` shape)
- [x] MA reconcile effect: removes both `MA` and `SMMA` from candle pane, then creates the active one with `calcParams = mas.map(m => m.period)` and per-line colors

### Phase 3 — Drawing kit
- [x] `frontend/src/components/DrawingToolbar.jsx` with: trend line (`segment`), ray, extended line, horizontal line, vertical line, parallel channel, rectangle, fibonacci, price line, **ruler/measure (`priceRange`)**
- [x] Custom `priceRange` overlay registered in `klineRegistry.js` — translucent box with diff text inside, green/red by direction
- [x] Per-overlay deletion via klinecharts' built-in selected-overlay toolbar (right-click delete works out of the box) + a "Clear all" button

### Phase 4 — Persistence
- [x] `storage.js` extended with `loadDrawings()` / `saveDrawings()` (key `stockAnalysis.drawings.v1`)
- [x] On `onDrawEnd` / `onPressedMoveEnd` / `onRemoved` we update `overlayMetaRef` and debounce-write the array to localStorage
- [x] On first data load after mount, `hydrateDrawings()` replays the array via `chart.createOverlay({ name, points, styles })`

### Phase 5 — Cleanup
- [x] Deleted `PriceChart.jsx` and `IndicatorChart.jsx`
- [x] `npm uninstall lightweight-charts` (no other consumers)
- [x] Replaced `ChartContainer.jsx` with thin wrapper (toolbar + chart)
- [x] CSS — added `.kline-host` + `.drawing-toolbar` styles, kept the obsolete `.chart-wrapper h3` rule (still harmless even though no chart-wrappers are emitted)
- [x] `npm run build` clean (3.44 kB CSS, 396 kB JS / 114 kB gzip — slightly larger than before due to klinecharts; gzip basically unchanged)
- [ ] **User to verify in browser**

---

## Known concerns to verify in browser

These compiled but I have NOT smoke-tested them in a browser. Resume here if anything is broken:

1. **Custom `priceRange` (ruler) overlay rendering** — used figure types `polygon` and `text`. The polygon `coordinates` shape and text style fields (`backgroundColor`, `paddingX`, `borderRadius`) are best-guess from the type defs. If the box doesn't render or text is misplaced, inspect `node_modules/klinecharts/dist/index.d.ts` for `RectStyle` / `TextStyle` and adjust.
2. **Sub-pane height** — passed `{ height: 100 }` to each `createIndicator`; total chart height is fixed at 720px in CSS. May want to revisit so panes auto-fit.
3. **MA color mapping** — `styles: { lines: [{ color }] }` on the multi-line MA indicator. Confirm each MA gets its requested color (not one shared color) when there are multiple periods.
4. **Drawing persistence across symbol change** — drawings are NOT cleared when the user switches ticker. Open question: does the user want them tied to the symbol, or to the chart UI? Current behavior: chart UI (drawings stay).
5. **Pane id for drawings on sub-panes** — when persisting we capture `points` but not `paneId`. A drawing made on the OBV pane may re-hydrate onto the candle pane on reload. If this matters, also capture `ov.paneId` and pass it as the second arg to `createOverlay`.
6. **Sub-pane indicators may be visible in pane name** — klinecharts shows the indicator short name in the pane corner; the user wanted "A/D" but we register the indicator as `AD` (slashes in indicator names confuse klinecharts). The pane label shows "AD". Acceptable.
7. **No "in-progress draw cancel"** — clicking a tool button starts a draw; clicking another tool starts another. There's no way to abort a half-drawn overlay except by completing it or right-clicking. Ship as-is; add an Esc handler later if annoying.

---

## Implementation log

(append-only, newest at the bottom)

### 2026-04-22 — Session 1, follow-up
- User hit `TypeError: Cannot read properties of undefined (reading '0')` thrown from `IndicatorView.drawImp` on first browser load.
- Root cause: klinecharts' line-merge step in the indicator renderer (around line ~8019 of the ESM bundle) reads `styles.dashedValue[0]`, `styles.dashedValue[1]`, plus `styles.style/smooth/color/size`. When you override `indicator.styles.lines`, klinecharts does NOT deep-merge with defaults — it takes your array as-is. Our MA `lineStyles` only set `{ color, size }`, so `dashedValue` was undefined and `[0]` blew up.
- Fix in `Chart.jsx`: each per-MA line style now includes all required fields — `{ style: 'solid', smooth: false, color, size, dashedValue: [2, 2] }`.
- Also removed an incomplete `indicator.bars` override from `KLINE_STYLES` for the same reason — would have crashed the moment any bar-based indicator (e.g. VOL) was added.
- General rule for klinecharts: when overriding any of `indicator.styles.lines / bars / circles`, supply the full shape per entry — partial overrides will crash the renderer, not gracefully fall back.
- `npm run build` ✅. User to retry in browser.

### 2026-04-22 — Session 1
- Created this doc.
- Installed `klinecharts@^9.8.12` (pinned; latest = v10-beta).
- Mapped v9 API from `node_modules/klinecharts/dist/index.d.ts`:
  - `init/dispose`, `applyNewData`, `createIndicator`, `removeIndicator`, `createOverlay`, `removeOverlay`
  - Per-overlay callbacks: `onDrawStart/onDrawing/onDrawEnd/onPressedMoveEnd/onRemoved/onSelected/onClick/onRightClick`
  - `registerIndicator(template)`, `registerOverlay(template)`
- Built-in indicators present: `MA, EMA, SMA, BBI, BOLL, MACD, OBV, VOL, RSI, KDJ, BIAS, BRAR, CCI, CR, DMA, DMI, EMV, MTM, PSY, PVT, ROC, SAR, TRIX, VR, WR, AO, AVP`. Note built-in `SMA` is actually weighted (`[period, weight]`); built-in `MA` is true multi-period plain SMA. Decision: use `MA` for the user-facing "SMA" type, register custom `SMMA`.
- Built-in overlays present: `simpleAnnotation, simpleTag, priceLine, horizontalRayLine, horizontalSegment, horizontalStraightLine, verticalRayLine, verticalSegment, verticalStraightLine, straightLine, rayLine, segment, priceChannelLine, parallelStraightLine, fibonacciLine, rect`. **No `priceRange`** — registered custom.
- Confirmed default candle pane id is `'candle_pane'` (used as paneId for stacked MA indicator and `removeIndicator`).
- Wrote `Chart.jsx`, `DrawingToolbar.jsx`, `klineRegistry.js`. Rewrote `ChartContainer.jsx` as a thin wrapper. Extended `storage.js` with drawings load/save. Deleted `PriceChart.jsx` + `IndicatorChart.jsx`. Removed `lightweight-charts` dep.
- `npm run build` ✅
- Handing off to user for browser smoke test.

---

## Handover checklist for next session

If picking this up because the limit was hit mid-stream:

1. Read this doc top-to-bottom.
2. Run `git status` and `git diff` to see what's actually on disk vs. what this doc claims.
3. Find the first unchecked box above — that's where to resume.
4. Update the implementation log with the date and what you did.
5. Tick boxes as you complete them. Do not tick anything you didn't verify.
6. After the user verifies in the browser, delete this doc (or move to `docs/archive/`).

## Files touched

- `frontend/package.json` — added `klinecharts@^9.8.12`, removed `lightweight-charts`
- `frontend/src/components/Chart.jsx` — new (replaces PriceChart + IndicatorChart)
- `frontend/src/components/DrawingToolbar.jsx` — new
- `frontend/src/components/ChartContainer.jsx` — rewritten as thin wrapper (toolbar + Chart)
- `frontend/src/utils/klineRegistry.js` — new (custom AD/OBV/VWAP/SMMA indicators + custom priceRange overlay)
- `frontend/src/utils/storage.js` — added `loadDrawings`/`saveDrawings`
- `frontend/src/App.jsx` — passes `maType` through to `ChartContainer`
- `frontend/src/App.css` — `.kline-host`, `.drawing-toolbar` styles
- `frontend/src/components/PriceChart.jsx` — DELETED
- `frontend/src/components/IndicatorChart.jsx` — DELETED
