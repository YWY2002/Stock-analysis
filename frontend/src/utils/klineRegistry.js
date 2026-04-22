// One-time registration of custom klinecharts indicators and overlays.
// Idempotent — calling register() more than once is a no-op.
import { registerIndicator, registerOverlay } from 'klinecharts';

let registered = false;

export function registerKlineExtensions() {
  if (registered) return;
  registered = true;

  // ---- Custom indicators ---------------------------------------------------

  // SMMA (Wilder's smoothed MA). Multi-period like the built-in MA.
  registerIndicator({
    name: 'SMMA',
    shortName: 'SMMA',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'smma1', title: 'SMMA20: ', type: 'line' }],
    regenerateFigures: (params) =>
      params.map((p, i) => ({ key: `smma${i + 1}`, title: `SMMA${p}: `, type: 'line' })),
    calc: (dataList, indicator) => {
      const params = indicator.calcParams;
      const figures = indicator.figures;
      const prevs = new Array(params.length).fill(NaN);
      const sums = new Array(params.length).fill(0);
      return dataList.map((k, i) => {
        const out = {};
        params.forEach((p, idx) => {
          if (i < p - 1) {
            sums[idx] += k.close;
          } else if (i === p - 1) {
            sums[idx] += k.close;
            prevs[idx] = sums[idx] / p;
            out[figures[idx].key] = prevs[idx];
          } else {
            prevs[idx] = (prevs[idx] * (p - 1) + k.close) / p;
            out[figures[idx].key] = prevs[idx];
          }
        });
        return out;
      });
    },
  });

  // AD (Accumulation/Distribution). Reads precomputed `_ad` from the kline
  // (injected by the data adapter — kept consistent with the Go service).
  registerIndicator({
    name: 'AD',
    shortName: 'AD',
    series: 'normal',
    calcParams: [],
    precision: 0,
    shouldOhlc: false,
    shouldFormatBigNumber: true,
    figures: [{ key: 'ad', title: 'AD: ', type: 'line' }],
    calc: (dataList) =>
      dataList.map((k) => (k._ad != null ? { ad: k._ad } : {})),
  });

  // VWAP (precomputed). Same pattern.
  registerIndicator({
    name: 'VWAP',
    shortName: 'VWAP',
    series: 'price',
    calcParams: [],
    precision: 2,
    shouldOhlc: false,
    figures: [{ key: 'vwap', title: 'VWAP: ', type: 'line' }],
    calc: (dataList) =>
      dataList.map((k) => (k._vwap != null ? { vwap: k._vwap } : {})),
  });

  // OBV (precomputed) — overrides the built-in to keep it consistent with the
  // Go service rather than klinecharts' own formula.
  registerIndicator({
    name: 'OBV',
    shortName: 'OBV',
    series: 'normal',
    calcParams: [],
    precision: 0,
    shouldOhlc: false,
    shouldFormatBigNumber: true,
    figures: [{ key: 'obv', title: 'OBV: ', type: 'line' }],
    calc: (dataList) =>
      dataList.map((k) => (k._obv != null ? { obv: k._obv } : {})),
  });

  // ---- Custom overlays -----------------------------------------------------

  // priceRange — measure tool. User clicks two points; shows bar count, price
  // diff, and % change inside a translucent box.
  registerOverlay({
    name: 'priceRange',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const [c1, c2] = coordinates;
      const p1 = overlay.points[0];
      const p2 = overlay.points[1];
      if (!p1 || !p2 || p1.value == null || p2.value == null) return [];

      const priceDiff = p2.value - p1.value;
      const pct = p1.value !== 0 ? (priceDiff / p1.value) * 100 : 0;
      const up = priceDiff >= 0;
      const fill = up ? 'rgba(38, 166, 154, 0.18)' : 'rgba(239, 83, 80, 0.18)';
      const stroke = up ? '#26a69a' : '#ef5350';

      const x = Math.min(c1.x, c2.x);
      const y = Math.min(c1.y, c2.y);
      const w = Math.abs(c2.x - c1.x);
      const h = Math.abs(c2.y - c1.y);

      const sign = priceDiff >= 0 ? '+' : '';
      const text = `${sign}${priceDiff.toFixed(2)}  (${sign}${pct.toFixed(2)}%)`;

      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + h },
              { x, y: y + h },
            ],
          },
          styles: { style: 'stroke_fill', color: fill, borderColor: stroke, borderSize: 1 },
        },
        {
          type: 'text',
          attrs: { x: x + w / 2, y: y + h / 2, text, align: 'center', baseline: 'middle' },
          styles: { color: '#fff', size: 12, family: 'sans-serif', backgroundColor: 'rgba(0,0,0,0.5)', paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3, borderRadius: 4 },
        },
      ];
    },
  });
}
