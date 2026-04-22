import { useRef, useCallback } from 'react';
import PriceChart from './PriceChart';
import IndicatorChart from './IndicatorChart';
import { CHART_COLORS } from '../utils/chartConfig';

const INDICATOR_CONFIG = [
  { key: 'ad', title: 'Accumulation/Distribution', color: CHART_COLORS.ad, scaleInMillions: true },
  { key: 'obv', title: 'On Balance Volume', color: CHART_COLORS.obv, scaleInMillions: true },
  { key: 'vwap', title: 'VWAP', color: CHART_COLORS.vwap },
];

export default function ChartContainer({ priceData, indicators, mas }) {
  const indicatorRefs = useRef({});
  const priceChartRef = useRef(null);
  const isSyncing = useRef(false);

  // Collect all chart refs keyed by id for crosshair sync
  const getAllCharts = useCallback(() => {
    const charts = {};
    if (priceChartRef.current) {
      charts['price'] = priceChartRef.current;
    }
    for (const [key, ref] of Object.entries(indicatorRefs.current)) {
      if (ref) charts[key] = ref;
    }
    return charts;
  }, []);

  const syncAll = useCallback((range, sourceKey) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const charts = getAllCharts();
    for (const [key, ref] of Object.entries(charts)) {
      if (key !== sourceKey && ref?.syncRange) {
        ref.syncRange(range);
      }
    }

    isSyncing.current = false;
  }, [getAllCharts]);

  const handleCrosshairMove = useCallback((sourceKey, param) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const charts = getAllCharts();
    for (const [key, ref] of Object.entries(charts)) {
      if (key === sourceKey) continue;
      const chart = ref?.getChart?.();
      const series = ref?.getMainSeries?.();
      if (!chart || !series) continue;

      if (!param.time) {
        chart.clearCrosshairPosition();
      } else {
        chart.setCrosshairPosition(undefined, param.time, series);
      }
    }

    isSyncing.current = false;
  }, [getAllCharts]);

  const availableIndicators = INDICATOR_CONFIG.filter(
    (cfg) => indicators?.[cfg.key]?.length > 0
  );

  return (
    <div className="chart-container">
      <PriceChart
        ref={priceChartRef}
        data={priceData}
        mas={mas}
        hideTimeAxis={availableIndicators.length > 0}
        onTimeRangeChange={(range) => syncAll(range, 'price')}
        onCrosshairMove={(param) => handleCrosshairMove('price', param)}
      />

      {availableIndicators.map((cfg, idx) => (
        <IndicatorChart
          key={cfg.key}
          ref={(el) => { indicatorRefs.current[cfg.key] = el; }}
          title={cfg.title}
          data={indicators[cfg.key]}
          color={cfg.color}
          scaleInMillions={cfg.scaleInMillions}
          hideTimeAxis={idx < availableIndicators.length - 1}
          onTimeRangeChange={(range) => syncAll(range, cfg.key)}
          onCrosshairMove={(param) => handleCrosshairMove(cfg.key, param)}
        />
      ))}
    </div>
  );
}
