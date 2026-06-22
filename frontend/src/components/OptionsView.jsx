import { useRef, useState } from 'react';
import OptionChartRow from './OptionChartRow';
import { fetchExpirations } from '../services/optionsApi';

export default function OptionsView() {
  const [symbol, setSymbol] = useState('AAPL');
  const [underlying, setUnderlying] = useState(null); // set after successful load
  const [expirations, setExpirations] = useState([]);
  const [charts, setCharts] = useState([]); // [{ id, expiration }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nextIdRef = useRef(1);
  const nextId = () => nextIdRef.current++;

  const handleLoad = async (e) => {
    e?.preventDefault();
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const exps = await fetchExpirations(trimmed);
      if (exps.length === 0) {
        setError(`No option expirations found for ${trimmed}`);
        setExpirations([]);
        setCharts([]);
        setUnderlying(null);
        return;
      }
      setExpirations(exps);
      setUnderlying(trimmed);
      // Seed with one chart at the nearest expiry.
      setCharts([{ id: nextId(), expiration: exps[0] }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addChart = () => {
    if (!expirations.length) return;
    setCharts((prev) => [...prev, { id: nextId(), expiration: expirations[0] }]);
  };

  const removeChart = (id) => {
    setCharts((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
  };

  const updateExpiration = (id, expiration) => {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, expiration } : c)));
  };

  return (
    <div className="options-view">
      <form className="options-top-row" onSubmit={handleLoad}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Underlying (e.g. AAPL)"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button
          type="button"
          className="option-add-btn"
          onClick={addChart}
          disabled={!expirations.length}
        >
          + Add Chart
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {!underlying && !error && (
        <div className="placeholder">Enter an underlying symbol and click Load to start.</div>
      )}

      {charts.map((c) => (
        <OptionChartRow
          key={c.id}
          underlying={underlying}
          expirations={expirations}
          chart={c}
          onExpirationChange={updateExpiration}
          onRemove={removeChart}
          canDelete={charts.length > 1}
        />
      ))}
    </div>
  );
}
