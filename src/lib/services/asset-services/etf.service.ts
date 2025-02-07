import { Asset, AssetWithPrice, Transaction } from '@/lib/types';
import { BaseAssetService, PriceData } from './base-asset.service';

const RAPIDAPI_YAHOO_FINANCE = 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes';
const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';

if (!RAPIDAPI_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is not set');
}

export class ETFService extends BaseAssetService {
  private priceCache = new Map<string, { 
    price: number; 
    timestamp: number;
    change24h?: number;
    dayHigh?: number;
    dayLow?: number;
    previousClose?: number;
    volume?: number;
  }>();
  private readonly CACHE_DURATION = 20 * 1000; // 20 seconds

  async enrichAssetWithPriceAndTransactions(
    asset: Asset,
    transactions: Transaction[]
  ): Promise<AssetWithPrice> {
    const priceData = await this.getPrice(asset.symbol);
    const filteredTransactions = transactions.filter(t => t.asset_id === asset.id);
    
    const totalQuantity = this.calculateTotalQuantity(filteredTransactions);
    const totalCost = this.calculateTotalCost(filteredTransactions);
    const totalValue = totalQuantity * priceData.price;

    return {
      ...asset,
      currentPrice: priceData.price,
      totalValue,
      totalQuantity,
      averagePrice: totalQuantity > 0 ? totalCost / totalQuantity : 0,
      profitLoss: totalValue - totalCost,
      profitLossPercentage: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      dayHigh: priceData.dayHigh,
      dayLow: priceData.dayLow,
      previousClose: priceData.previousClose,
      volume: priceData.volume,
      change24h: priceData.change24h,
    };
  }

  private async getPrice(symbol: string): Promise<PriceData> {
    const now = Date.now();
    const cached = this.priceCache.get(symbol);

    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Handle different stock exchange suffixes
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.PA`;
      
      const response = await fetch(
        `${RAPIDAPI_YAHOO_FINANCE}?region=FR&symbols=${yahooSymbol}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
          },
        }
      );

      if (response.status === 429) {
        throw new Error('RapidAPI rate limit exceeded. Please try again later.');
      }

      if (!response.ok) {
        throw new Error(`RapidAPI Yahoo Finance error: ${response.status}`);
      }

      const data = await response.json();
      const result = data?.quoteResponse?.result?.[0];
      
      if (!result?.regularMarketPrice) {
        console.error('Unexpected RapidAPI Yahoo Finance response for symbol', symbol, ':', JSON.stringify(data, null, 2));
        return { price: 0 };
      }

      const priceData = {
        price: result.regularMarketPrice,
        change24h: result.regularMarketChangePercent,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        previousClose: result.regularMarketPreviousClose,
        volume: result.regularMarketVolume,
        timestamp: now,
      };

      this.priceCache.set(symbol, priceData);
      return priceData;
    } catch (error) {
      console.error(`Error fetching ETF price for ${symbol}:`, error);
      return cached || { price: 0 };
    }
  }
} 