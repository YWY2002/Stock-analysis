import { useState } from 'react';
import ControlPanel from './components/ControlPanel';
import ChartContainer from './components/ChartContainer';
import { fetchIndicators } from './services/api';
import { pickMaColor } from './utils/chartConfig';
import './App.css';

let nextMaId = 1;
const makeMa = (period, usedColors, type = 'sma') => ({
  id: nextMaId++,
  type,
  period,
  color: pickMaColor(usedColors),
});

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [mas, setMas] = useState([]);

  const handleSubmit = async ({ symbol, interval }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIndicators(symbol, { interval });
      setData(result);
      setCurrentSymbol(result.symbol);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const addMa = () => {
    setMas((prev) => [...prev, makeMa(20, prev.map((m) => m.color))]);
  };

  const updateMa = (id, patch) => {
    setMas((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMa = (id) => {
    setMas((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="app">
      <header>
        <h1>Stock Analysis</h1>
      </header>

      <ControlPanel
        onSubmit={handleSubmit}
        loading={loading}
        mas={mas}
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
          />
        </>
      )}

      {!data && !loading && !error && (
        <div className="placeholder">Enter a ticker symbol and click Analyze to get started.</div>
      )}
    </div>
  );
}
