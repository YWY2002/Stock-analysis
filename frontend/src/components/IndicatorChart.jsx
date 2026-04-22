import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';
import { BASE_CHART_OPTIONS } from '../utils/chartConfig';

const IndicatorChart = forwardRef(function IndicatorChart({ title, data, color, hideTimeAxis, scaleInMillions, onTimeRangeChange, onCrosshairMove }, ref) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);

  useImperativeHandle(ref, () => ({
    syncRange(range) {
      chartRef.current?.timeScale().setVisibleLogicalRange(range);
    },
    getChart() {
      return chartRef.current;
    },
    getMainSeries() {
      return mainSeriesRef.current;
    },
  }));

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      ...BASE_CHART_OPTIONS,
      height: 180,
      timeScale: {
        ...BASE_CHART_OPTIONS.timeScale,
        visible: !hideTimeAxis,
      },
    });
    chartRef.current = chart;

    const seriesOpts = { color, lineWidth: 2 };
    if (scaleInMillions) {
      seriesOpts.priceFormat = {
        type: 'custom',
        minMove: 0.01,
        formatter: (price) => {
          const abs = Math.abs(price);
          const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
          return price.toFixed(digits) + 'M';
        },
      };
    }
    const series = chart.addSeries(LineSeries, seriesOpts);
    mainSeriesRef.current = series;

    series.setData(
      data.map((d) => ({
        time: d.datetime.length > 10 ? Math.floor(new Date(d.datetime).getTime() / 1000) : d.datetime,
        value: scaleInMillions ? d.value / 1e6 : d.value,
      }))
    );

    chart.timeScale().fitContent();

    if (onTimeRangeChange) {
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) onTimeRangeChange(range);
      });
    }

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    };
  }, [data, color]);

  return (
    <div className="chart-wrapper">
      <h3>{title}</h3>
      <div ref={containerRef} />
    </div>
  );
});

export default IndicatorChart;
