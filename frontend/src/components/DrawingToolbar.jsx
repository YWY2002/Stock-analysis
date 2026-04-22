const TOOLS = [
  { name: 'segment', label: 'Trend line', icon: '╱' },
  { name: 'rayLine', label: 'Ray', icon: '→' },
  { name: 'straightLine', label: 'Extended line', icon: '⟷' },
  { name: 'horizontalStraightLine', label: 'Horizontal line', icon: '─' },
  { name: 'verticalStraightLine', label: 'Vertical line', icon: '│' },
  { name: 'parallelStraightLine', label: 'Parallel channel', icon: '⫽' },
  { name: 'rect', label: 'Rectangle', icon: '▭' },
  { name: 'fibonacciLine', label: 'Fibonacci', icon: 'F' },
  { name: 'priceLine', label: 'Price line', icon: '⊢' },
  { name: 'priceRange', label: 'Ruler / measure', icon: '⇕' },
];

export default function DrawingToolbar({ onPickTool, onClearAll }) {
  return (
    <div className="drawing-toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.name}
          type="button"
          className="draw-btn"
          title={t.label}
          onClick={() => onPickTool(t.name)}
        >
          <span className="draw-icon">{t.icon}</span>
          <span className="draw-label">{t.label}</span>
        </button>
      ))}
      <span className="toolbar-sep" />
      <button
        type="button"
        className="draw-btn draw-btn-danger"
        title="Remove all drawings"
        onClick={onClearAll}
      >
        <span className="draw-icon">×</span>
        <span className="draw-label">Clear</span>
      </button>
      <span className="draw-hint">Right-click an item on the chart to delete it individually.</span>
    </div>
  );
}
