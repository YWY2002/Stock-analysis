import OptionVolumeChart from './OptionVolumeChart';

export default function OptionChartRow({
  underlying,
  expirations,
  chart,
  onExpirationChange,
  onRemove,
  canDelete,
}) {
  return (
    <div className="option-chart-row">
      <div className="option-chart-header">
        <select
          className="option-expiry-select"
          value={chart.expiration ?? ''}
          onChange={(e) => onExpirationChange(chart.id, e.target.value)}
        >
          {expirations.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <h3 className="option-chart-title">
          {underlying} &mdash; {chart.expiration} &mdash; Volume by Strike
        </h3>
        <button
          type="button"
          className="option-delete-btn"
          onClick={() => onRemove(chart.id)}
          disabled={!canDelete}
          title={canDelete ? 'Remove chart' : 'At least one chart required'}
        >
          &times;
        </button>
      </div>
      <OptionVolumeChart underlying={underlying} expiration={chart.expiration} />
    </div>
  );
}
