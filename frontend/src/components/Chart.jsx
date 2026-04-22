import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { init, dispose } from 'klinecharts';
import { CHART_COLORS } from '../utils/chartConfig';
import { registerKlineExtensions } from '../utils/klineRegistry';
import { loadDrawings, saveDrawings } from '../utils/storage';

registerKlineExtensions();

const KLINE_STYLES = {
  grid: {
    horizontal: { color: CHART_COLORS.grid },
    vertical: { color: CHART_COLORS.grid },
  },
  candle: {
    bar: {
      upColor: CHART_COLORS.candleUp,
      downColor: CHART_COLORS.candleDown,
      upBorderColor: CHART_COLORS.candleUp,
      downBorderColor: CHART_COLORS.candleDown,
      upWickColor: CHART_COLORS.candleUp,
      downWickColor: CHART_COLORS.candleDown,
    },
    priceMark: {
      high: { color: CHART_COLORS.text },
      low: { color: CHART_COLORS.text },
      last: {
        upColor: CHART_COLORS.candleUp,
        downColor: CHART_COLORS.candleDown,
        noChangeColor: CHART_COLORS.text,
        line: { dashedValue: [4, 4] },
        text: { borderColor: 'transparent' },
      },
    },
    tooltip: { showRule: 'follow_cross' },
  },
  indicator: {
    tooltip: { showRule: 'follow_cross' },
  },
  xAxis: {
    axisLine: { color: CHART_COLORS.grid },
    tickLine: { color: CHART_COLORS.grid },
    tickText: { color: CHART_COLORS.text },
  },
  yAxis: {
    axisLine: { color: CHART_COLORS.grid },
    tickLine: { color: CHART_COLORS.grid },
    tickText: { color: CHART_COLORS.text },
  },
  crosshair: {
    horizontal: { line: { color: CHART_COLORS.crosshair }, text: { backgroundColor: CHART_COLORS.crosshair } },
    vertical: { line: { color: CHART_COLORS.crosshair }, text: { backgroundColor: CHART_COLORS.crosshair } },
  },
  separator: { color: CHART_COLORS.grid, size: 1, fill: true },
};

const SUB_PANES = [
  { indicator: 'AD', label: 'A/D' },
  { indicator: 'OBV', label: 'OBV' },
  { indicator: 'VWAP', label: 'VWAP' },
];

function toKlineList(priceData, indicators) {
  const adByTime = indexByDatetime(indicators?.ad);
  const obvByTime = indexByDatetime(indicators?.obv);
  const vwapByTime = indexByDatetime(indicators?.vwap);

  return priceData.map((d) => {
    const ts = new Date(d.datetime).getTime();
    return {
      timestamp: ts,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      _ad: adByTime[d.datetime],
      _obv: obvByTime[d.datetime],
      _vwap: vwapByTime[d.datetime],
    };
  });
}

function indexByDatetime(arr) {
  const out = {};
  if (!Array.isArray(arr)) return out;
  for (const e of arr) out[e.datetime] = e.value;
  return out;
}

const Chart = forwardRef(function Chart({ priceData, indicators, mas, maType }, ref) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const subPaneIdsRef = useRef({}); // { AD: paneId, OBV: paneId, VWAP: paneId }
  const overlayMetaRef = useRef({}); // { [overlayId]: { name, points, styles? } }
  const persistTimerRef = useRef(null);
  const drawingsHydratedRef = useRef(false);

  // Mount chart once.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = init(containerRef.current, { styles: KLINE_STYLES, locale: 'en-US' });
    if (!chart) return;
    chartRef.current = chart;

    // Create the three indicator sub-panes (data populated when priceData lands).
    for (const sp of SUB_PANES) {
      const id = chart.createIndicator(sp.indicator, false, { height: 100 });
      if (id) subPaneIdsRef.current[sp.indicator] = id;
    }

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      dispose(chart);
      chartRef.current = null;
      subPaneIdsRef.current = {};
      overlayMetaRef.current = {};
      drawingsHydratedRef.current = false;
    };
  }, []);

  // Push data when it changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !priceData?.length) return;
    chart.applyNewData(toKlineList(priceData, indicators));

    // Drawings hydration runs once after first data load (overlays need data to position).
    if (!drawingsHydratedRef.current) {
      drawingsHydratedRef.current = true;
      hydrateDrawings();
    }
  }, [priceData, indicators]);

  // Reconcile MA overlay indicator on the candle pane when mas/maType changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Always remove both possible overlays first to avoid stale lines.
    chart.removeIndicator('candle_pane', 'MA');
    chart.removeIndicator('candle_pane', 'SMMA');

    if (!mas?.length) return;

    const indicatorName = maType === 'smma' ? 'SMMA' : 'MA';
    const calcParams = mas.map((m) => m.period);
    // klinecharts merges adjacent line segments and reads style.dashedValue[0/1],
    // style.style, style.smooth, style.color, style.size — every field must exist
    // or the merge crashes during render.
    const lineStyles = mas.map((m) => ({
      style: 'solid',
      smooth: false,
      color: m.color,
      size: 2,
      dashedValue: [2, 2],
    }));

    chart.createIndicator(
      {
        name: indicatorName,
        calcParams,
        styles: { lines: lineStyles },
      },
      true, // stack on candle pane
      { id: 'candle_pane' }
    );
  }, [mas, maType]);

  // ---- Drawing API exposed to parent ---------------------------------------

  useImperativeHandle(ref, () => ({
    startDrawing(overlayName) {
      const chart = chartRef.current;
      if (!chart) return;
      chart.createOverlay({
        name: overlayName,
        onDrawEnd: (event) => {
          const ov = event.overlay;
          overlayMetaRef.current[ov.id] = {
            name: ov.name,
            points: ov.points,
            styles: ov.styles ?? null,
          };
          schedulePersist();
          return false;
        },
        onPressedMoveEnd: (event) => {
          const ov = event.overlay;
          if (overlayMetaRef.current[ov.id]) {
            overlayMetaRef.current[ov.id].points = ov.points;
            schedulePersist();
          }
          return false;
        },
        onRemoved: (event) => {
          delete overlayMetaRef.current[event.overlay.id];
          schedulePersist();
          return false;
        },
      });
    },
    clearAllDrawings() {
      const chart = chartRef.current;
      if (!chart) return;
      const ids = Object.keys(overlayMetaRef.current);
      for (const id of ids) chart.removeOverlay(id);
      overlayMetaRef.current = {};
      schedulePersist();
    },
  }));

  function schedulePersist() {
    if (persistTimerRef.current) return;
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      saveDrawings(Object.values(overlayMetaRef.current));
    }, 200);
  }

  function hydrateDrawings() {
    const chart = chartRef.current;
    if (!chart) return;
    const saved = loadDrawings();
    if (!Array.isArray(saved) || !saved.length) return;

    for (const d of saved) {
      if (!d?.name || !Array.isArray(d.points) || !d.points.length) continue;
      const id = chart.createOverlay({
        name: d.name,
        points: d.points,
        styles: d.styles ?? undefined,
        onPressedMoveEnd: (event) => {
          const ov = event.overlay;
          if (overlayMetaRef.current[ov.id]) {
            overlayMetaRef.current[ov.id].points = ov.points;
            schedulePersist();
          }
          return false;
        },
        onRemoved: (event) => {
          delete overlayMetaRef.current[event.overlay.id];
          schedulePersist();
          return false;
        },
      });
      const newId = Array.isArray(id) ? id[0] : id;
      if (newId) {
        overlayMetaRef.current[newId] = {
          name: d.name,
          points: d.points,
          styles: d.styles ?? null,
        };
      }
    }
  }

  return <div className="kline-host" ref={containerRef} />;
});

export default Chart;
