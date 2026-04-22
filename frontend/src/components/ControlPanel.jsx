import { useState } from 'react';

const INTERVALS = [
  { value: '1min', label: '1m' },
  { value: '5min', label: '5m' },
  { value: '15min', label: '15m' },
  { value: '30min', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1day', label: '1D' },
  { value: '1week', label: '1W' },
  { value: '1month', label: '1M' },
];

const MA_TYPES = [
  { value: 'sma', label: 'SMA' },
  { value: 'smma', label: 'SMMA' },
];

export default function ControlPanel({
  onSubmit,
  loading,
  initialSymbol = 'AAPL',
  initialInterval = '1day',
  mas,
  maType,
  onChangeMaType,
  onAddMa,
  onUpdateMa,
  onRemoveMa,
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [interval, setInterval] = useState(initialInterval);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!symbol.trim()) return;
    onSubmit({ symbol: symbol.trim().toUpperCase(), interval });
  };

  const handlePeriodChange = (id, value) => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 500) {
      onUpdateMa(id, { period: n });
    }
  };

  const activeLabel = MA_TYPES.find((t) => t.value === maType)?.label ?? 'MA';

  return (
    <div className="control-panel-wrap">
      <form className="control-panel" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ticker (e.g. AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />

        <select value={interval} onChange={(e) => setInterval(e.target.value)}>
          {INTERVALS.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </form>

      <div className="ma-panel">
        <span className="ma-label">MA type:</span>
        <select
          className="ma-type-select"
          value={maType}
          onChange={(e) => onChangeMaType(e.target.value)}
        >
          {MA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {mas.map((ma) => (
          <div key={ma.id} className="ma-chip">
            <span className="ma-swatch" style={{ background: ma.color }} />
            <span className="ma-chip-label">{activeLabel}</span>
            <input
              type="number"
              min="1"
              max="500"
              value={ma.period}
              onChange={(e) => handlePeriodChange(ma.id, e.target.value)}
            />
            <button
              type="button"
              className="ma-remove"
              onClick={() => onRemoveMa(ma.id)}
              aria-label="Remove MA"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="ma-add" onClick={onAddMa}>+ Add {activeLabel}</button>
      </div>
    </div>
  );
}
