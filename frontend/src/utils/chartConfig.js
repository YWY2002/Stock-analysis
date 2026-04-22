export const CHART_COLORS = {
  background: '#1a1a2e',
  text: '#e0e0e0',
  grid: '#2a2a3e',
  crosshair: '#555',
  candleUp: '#26a69a',
  candleDown: '#ef5350',
  volume: 'rgba(76, 175, 80, 0.3)',
  ad: '#2196f3',
  obv: '#ff9800',
  vwap: '#e040fb',
};

export const MA_COLOR_PALETTE = [
  '#ffd54f',
  '#4dd0e1',
  '#ba68c8',
  '#aed581',
  '#ff8a65',
  '#90caf9',
  '#f06292',
];

export function pickMaColor(usedColors) {
  for (const c of MA_COLOR_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return MA_COLOR_PALETTE[usedColors.length % MA_COLOR_PALETTE.length];
}

export const BASE_CHART_OPTIONS = {
  layout: {
    background: { color: CHART_COLORS.background },
    textColor: CHART_COLORS.text,
  },
  grid: {
    vertLines: { color: CHART_COLORS.grid },
    horzLines: { color: CHART_COLORS.grid },
  },
  crosshair: { mode: 0 },
  timeScale: {
    borderColor: CHART_COLORS.grid,
    timeVisible: true,
    secondsVisible: false,
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.grid,
    minimumWidth: 72,
  },
};
