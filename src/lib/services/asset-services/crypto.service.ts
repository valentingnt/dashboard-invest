import { Asset, AssetWithPrice, Transaction } from '@/lib/types';
import { BaseAssetService, PriceData } from './base-asset.service';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export class CryptoService extends BaseAssetService {
  private priceCache = new Map<string, { price: number; timestamp: number; change24h?: number }>();
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
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a minute.');
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.bitcoin?.eur) {
        console.error('Unexpected CoinGecko API response:', data);
        return { price: 0 };
      }

      const result = {
        price: data.bitcoin.eur,
        change24h: data.bitcoin.eur_24h_change,
        timestamp: now,
      };

      this.priceCache.set(symbol, result);
      return result;
    } catch (error) {
      console.error(`Error fetching crypto price for ${symbol}:`, error);
      return cached || { price: 0 };
    }
  }
} 