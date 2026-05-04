import { getInstrumentConfig } from '../config/instruments.config';
import { IMarketDataService } from '../services/IMarketDataService';

export class PipValueEngine {
  constructor(private marketData: IMarketDataService) {}

  async calculatePipValue(
    symbol: string,
    lotSize: number,
    accountCurrency: string
  ): Promise<number> {
    const config = getInstrumentConfig(symbol);
    
    // Valeur du pip en devise de cotation
    const pipValueQuote = config.pipSize * config.contractSize * lotSize;
    
    // Si compte dans même devise, retourner direct
    if (config.marginCurrency === accountCurrency) {
      return pipValueQuote;
    }
    
    // Sinon convertir
    const conversionRate = await this.marketData.getExchangeRate(
      `${config.marginCurrency}/${accountCurrency}`
    );
    
    return pipValueQuote * conversionRate;
  }
}