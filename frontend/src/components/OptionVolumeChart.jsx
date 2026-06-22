import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { CHART_COLORS } from '../utils/chartConfig';
import { fetchOptionChain } from '../services/optionsApi';

function buildOption(chain) {
  const strikes = chain.map((c) => c.strike);
  const callVols = chain.map((c) => c.call_volume);
  const putVols = chain.map((c) => c.put_volume);

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Calls', 'Puts'],
      textStyle: { color: CHART_COLORS.text },
      top: 8,
    },
    grid: { left: 70, right: 30, top: 50, bottom: 70 },
    toolbox: {
      right: 20,
      iconStyle: { borderColor: CHART_COLORS.text },
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: {},
      },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, bottom: 10, height: 18 },
    ],
    xAxis: {
      type: 'category',
      data: strikes,
      name: 'Strike',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: CHART_COLORS.text },
      axisLabel: { color: CHART_COLORS.text, rotate: 45 },
      axisLine: { lineStyle: { color: CHART_COLORS.grid } },
    },
    yAxis: {
      type: 'value',
      name: 'Volume',
      nameTextStyle: { color: CHART_COLORS.text },
      axisLabel: { color: CHART_COLORS.text },
      splitLine: { lineStyle: { color: CHART_COLORS.grid } },
    },
    series: [
      {
        name: 'Calls',
        type: 'bar',
        data: callVols,
        itemStyle: { color: 'rgba(38, 166, 154, 0.8)' },
      },
      {
        name: 'Puts',
        type: 'bar',
        data: putVols,
        itemStyle: { color: 'rgba(239, 83, 80, 0.8)' },
      },
    ],
  };
}

export default function OptionVolumeChart({ underlying, expiration }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Init + resize handling.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Fetch + render on change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !underlying || !expiration) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    chart.showLoading({ text: 'Loading…', color: '#2196f3', textColor: '#e0e0e0', maskColor: 'rgba(15,15,26,0.5)' });

    fetchOptionChain(underlying, expiration)
      .then((chain) => {
        if (cancelled) return;
        chart.hideLoading();
        chart.setOption(buildOption(chain), true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        chart.hideLoading();
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [underlying, expiration]);

  return (
    <div className="option-chart-wrap">
      {error && <div className="error-banner">{error}</div>}
      <div className="option-chart-host" ref={containerRef} />
    </div>
  );
}
