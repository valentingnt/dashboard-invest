import { Asset, AssetWithPrice, Transaction } from '@/lib/types';

export interface AssetService {
  enrichAssetWithPriceAndTransactions(
    asset: Asset,
    transactions: Transaction[]
  ): Promise<AssetWithPrice>;
}

export interface PriceData {
  price: number;
  change24h?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
}

export abstract class BaseAssetService implements AssetService {
  protected calculateTotalCost(transactions: Transaction[]): number {
    return transactions.reduce(
      (sum, t) => sum + (t.type === 'buy' ? t.total_amount : -t.total_amount),
      0
    );
  }

  protected calculateTotalQuantity(transactions: Transaction[]): number {
    return transactions.reduce(
      (sum, t) => sum + (t.type === 'buy' ? t.quantity : -t.quantity),
      0
    );
  }

  abstract enrichAssetWithPriceAndTransactions(
    asset: Asset,
    transactions: Transaction[]
  ): Promise<AssetWithPrice>;
} 