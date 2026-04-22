import { useRef } from 'react';
import Chart from './Chart';
import DrawingToolbar from './DrawingToolbar';

export default function ChartContainer({ priceData, indicators, mas, maType }) {
  const chartRef = useRef(null);

  return (
    <div className="chart-container">
      <DrawingToolbar
        onPickTool={(name) => chartRef.current?.startDrawing(name)}
        onClearAll={() => chartRef.current?.clearAllDrawings()}
      />
      <Chart
        ref={chartRef}
        priceData={priceData}
        indicators={indicators}
        mas={mas}
        maType={maType}
      />
    </div>
  );
}
