import { useEffect, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import ChartContainer from './components/ChartContainer';
import { fetchIndicators } from './services/api';
import { pickMaColor } from './utils/chartConfig';
import { loadState, saveState } from './utils/storage';
import './App.css';

const cached = loadState() ?? {};

let nextMaId =
  (Array.isArray(cached.mas) ? cached.mas.reduce((m, x) => Math.max(m, x.id || 0), 0) : 0) + 1;

const makeMa = (period, usedColors, type = 'sma') => ({
  id: nextMaId++,
  type,
  period,
  color: pickMaColor(usedColors),
});

export default function App() {
  const [data, setData] = useState(cached.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState(cached.currentSymbol ?? '');
  const [mas, setMas] = useState(Array.isArray(cached.mas) ? cached.mas : []);
  const [maType, setMaType] = useState(cached.maType ?? 'sma');
  const [lastSymbol, setLastSymbol] = useState(cached.lastSymbol ?? 'AAPL');
  const [lastInterval, setLastInterval] = useState(cached.lastInterval ?? '1day');

  // Persist whenever anything that survives a refresh changes.
  useEffect(() => {
    saveState({ data, currentSymbol, mas, maType, lastSymbol, lastInterval });
  }, [data, currentSymbol, mas, maType, lastSymbol, lastInterval]);

  const handleSubmit = async ({ symbol, interval }) => {
    setLoading(true);
    setError(null);
    setLastSymbol(symbol);
    setLastInterval(interval);
    try {
      const result = await fetchIndicators(symbol, { interval });
      setData(result);
      setCurrentSymbol(result.symbol);
    } catch (err) {
      setError(err.message);
      // Keep cached data on screen so the chart doesn't disappear on a transient failure.
    } finally {
      setLoading(false);
    }
  };

  // On mount: if we restored a previous session, refresh it in the background
  // so the cached chart isn't stale.
  useEffect(() => {
    if (cached.lastSymbol) {
      handleSubmit({ symbol: cached.lastSymbol, interval: cached.lastInterval ?? '1day' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMa = () => {
    setMas((prev) => [...prev, makeMa(20, prev.map((m) => m.color), maType)]);
  };

  const updateMa = (id, patch) => {
    setMas((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMa = (id) => {
    setMas((prev) => prev.filter((m) => m.id !== id));
  };

  const changeMaType = (type) => {
    setMaType(type);
    // Retype existing MAs so the whole group stays consistent.
    setMas((prev) => prev.map((m) => ({ ...m, type })));
  };

  return (
    <div className="app">
      <header>
        <h1>Stock Analysis</h1>
      </header>

      <ControlPanel
        onSubmit={handleSubmit}
        loading={loading}
        initialSymbol={lastSymbol}
        initialInterval={lastInterval}
        mas={mas}
        maType={maType}
        onChangeMaType={changeMaType}
        onAddMa={addMa}
        onUpdateMa={updateMa}
        onRemoveMa={removeMa}
      />

      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <h2>{currentSymbol} &mdash; {data.interval}</h2>
          <ChartContainer
            priceData={data.price_data}
            indicators={data.indicators}
            mas={mas}
            maType={maType}
          />
        </>
      )}

      {!data && !loading && !error && (
        <div className="placeholder">Enter a ticker symbol and click Analyze to get started.</div>
      )}
    </div>
  );
}
