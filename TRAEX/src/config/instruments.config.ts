
export interface InstrumentConfig {
  symbol: string;
  pipSize: number;
  contractSize: number;
  marginCurrency: string;
}

export const INSTRUMENT_CONFIG: Record<string, InstrumentConfig> = {
  'EUR/USD': { 
    symbol: 'EUR/USD', 
    pipSize: 0.0001, 
    contractSize: 100000, 
    marginCurrency: 'USD' 
  },
  'GBP/USD': { 
    symbol: 'GBP/USD', 
    pipSize: 0.0001, 
    contractSize: 100000, 
    marginCurrency: 'USD' 
  },
  'USD/JPY': { 
    symbol: 'USD/JPY', 
    pipSize: 0.01, 
    contractSize: 100000, 
    marginCurrency: 'JPY' 
  },
  'GBP/JPY': { 
    symbol: 'GBP/JPY', 
    pipSize: 0.01, 
    contractSize: 100000, 
    marginCurrency: 'JPY' 
  },
  'EUR/JPY': { 
    symbol: 'EUR/JPY', 
    pipSize: 0.01, 
    contractSize: 100000, 
    marginCurrency: 'JPY' 
  },
  'AUD/USD': { 
    symbol: 'AUD/USD', 
    pipSize: 0.0001, 
    contractSize: 100000, 
    marginCurrency: 'USD' 
  },
  'USD/CHF': { 
    symbol: 'USD/CHF', 
    pipSize: 0.0001, 
    contractSize: 100000, 
    marginCurrency: 'CHF' 
  },
  'XAU/USD': { 
    symbol: 'XAU/USD', 
    pipSize: 0.01, 
    contractSize: 100, 
    marginCurrency: 'USD' 
  },
  'US30': { 
    symbol: 'US30', 
    pipSize: 1.0, 
    contractSize: 1, 
    marginCurrency: 'USD' 
  },
};
export function getInstrumentConfig(symbol: string): InstrumentConfig {
  const config = INSTRUMENT_CONFIG[symbol];
  if (!config) {
    throw new Error(`Unknown instrument: ${symbol}`);
  }
  return config;
}

export function getPipSize(symbol: string): number {
  return getInstrumentConfig(symbol).pipSize;
}

export function getContractSize(symbol: string): number {
  return getInstrumentConfig(symbol).contractSize;
}