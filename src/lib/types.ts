export type AssetType = 'etf' | 'crypto';

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'etf' | 'crypto';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  asset_id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_amount: number;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssetWithPrice extends Asset {
  currentPrice: number;
  totalValue: number;
  totalQuantity: number;
  averagePrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
  change24h?: number;
} 